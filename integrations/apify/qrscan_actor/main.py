"""The Actor: read the QR codes and barcodes of images given by URL or uploaded to a key-value store.

Each image becomes one dataset item. An image that cannot be fetched or decoded becomes an item with
its error, so one bad URL does not stop the run. The scan runs inside the Actor's container with the
published engine wheel; the image is sent to no other service.
"""
from __future__ import annotations

import asyncio
import re
import urllib.parse
from typing import Any

import httpx
import qrcode_barcode_scanner as scanner
from apify import Actor

PROFILES = ("fast", "frame", "full")
MAX_BYTES = 8 * 1024 * 1024
MAX_DIMENSION = 4096
MAX_PIXELS = 16_000_000
MAX_BUDGET_MS = 60_000
TIMEOUT_SECONDS = 30
MAX_REDIRECTS = 5
USER_AGENT = "qrcode-barcode-scanner-apify/0.1.0 (+https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust)"
# The address of a record in an Apify key-value store, as the file upload field writes it.
RECORD_URL = re.compile(
    r"^https://api\.apify\.com/v2/key-value-stores/(?P<store>[^/?#]+)/records/(?P<key>[^/?#]+)")


class InputError(ValueError):
    """The run input cannot be used: the run fails with this message."""


class SourceError(ValueError):
    """One image cannot be read: its dataset item carries this message."""


def read_input(actor_input: dict[str, Any] | None) -> tuple[list[tuple[str, str]], str, int]:
    """The images to read, as (input field, address) pairs, and the scan options."""
    actor_input = actor_input or {}
    sources = []
    for field in ("imageUrls", "imageFiles"):
        values = actor_input.get(field) or []
        if not isinstance(values, list):
            raise InputError(f"{field} must be a list of addresses.")
        for value in values:
            if not isinstance(value, str):
                raise InputError(f"Every entry of {field} must be a string.")
            if value.strip():
                sources.append((field, value.strip()))
    if not sources:
        raise InputError("Give at least one image URL or uploaded image file.")
    profile = actor_input.get("profile") or "fast"
    if profile not in PROFILES:
        raise InputError(f"Unknown profile {profile!r}: use fast, frame or full.")
    budget = actor_input.get("budgetMs", 0)
    budget = 0 if budget is None else budget
    if isinstance(budget, bool) or not isinstance(budget, int) or not 0 <= budget <= MAX_BUDGET_MS:
        raise InputError(f"budgetMs must be a whole number of milliseconds from 0 to {MAX_BUDGET_MS}.")
    return sources, profile, budget


async def fetch(client: httpx.AsyncClient, url: str) -> bytes:
    """The body of an http(s) URL, refused above MAX_BYTES before it is all downloaded."""
    parts = urllib.parse.urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.netloc:
        raise SourceError("Not an http or https URL.")
    try:
        async with client.stream("GET", url) as response:
            if response.status_code != 200:
                raise SourceError(f"The server answered HTTP {response.status_code}.")
            declared = response.headers.get("content-length", "")
            if declared.isdigit() and int(declared) > MAX_BYTES:
                raise SourceError(f"The image is {declared} bytes; the limit is {MAX_BYTES} bytes.")
            body = bytearray()
            async for chunk in response.aiter_bytes():
                body += chunk
                if len(body) > MAX_BYTES:
                    raise SourceError(f"The image is over {MAX_BYTES} bytes, the limit.")
            return bytes(body)
    except httpx.HTTPError as error:
        raise SourceError(f"The download failed: {error}") from error


async def read_record(url: str) -> bytes | None:
    """A file uploaded to a key-value store, read with the run's own access. None when not found."""
    match = RECORD_URL.match(url)
    if match is None:
        return None
    store = await Actor.open_key_value_store(id=urllib.parse.unquote(match["store"]))
    value = await store.get_value(urllib.parse.unquote(match["key"]))
    if value is None:
        return None
    if not isinstance(value, (bytes, bytearray)):
        raise SourceError("The key-value store record is not a file.")
    if len(value) > MAX_BYTES:
        raise SourceError(f"The image is {len(value)} bytes; the limit is {MAX_BYTES} bytes.")
    return bytes(value)


async def load(client: httpx.AsyncClient, url: str) -> bytes:
    """A record of a key-value store through the platform, any other address over HTTP."""
    try:
        data = await read_record(url)
    except SourceError:
        raise
    except Exception:  # noqa: BLE001 - a store the run cannot open: try the address itself
        data = None
    return data if data is not None else await fetch(client, url)


def item(field: str, url: str, report: dict | None = None, error: str | None = None) -> dict[str, Any]:
    """One dataset item: the decoded texts first, the engine's report in full."""
    detections = (report or {}).get("detections", [])
    codes = [{"symbology": row["symbology"], "text": row["content"]["text"]} for row in detections]
    return {
        "source": url,
        "input": field,
        "ok": error is None,
        "count": len(codes),
        "texts": [code["text"] for code in codes],
        "codes": codes,
        "complete": bool(report) and not report["trace"]["budget_exhausted"],
        "error": error,
        "report": report,
    }


async def scan_one(client: httpx.AsyncClient, field: str, url: str, profile: str, budget: int) -> dict:
    try:
        data = await load(client, url)
        report = await asyncio.to_thread(
            scanner.scan, data, profile, max_dimension=MAX_DIMENSION, max_pixels=MAX_PIXELS,
            budget_ms=budget)
    except (SourceError, ValueError) as error:
        return item(field, url, error=str(error))
    return item(field, url, report)


async def main() -> None:
    async with Actor:
        try:
            sources, profile, budget = read_input(await Actor.get_input())
        except InputError as error:
            await Actor.fail(status_message=str(error))
            return
        found = failed = 0
        async with httpx.AsyncClient(follow_redirects=True, max_redirects=MAX_REDIRECTS,
                                     timeout=TIMEOUT_SECONDS, headers={"User-Agent": USER_AGENT}) as client:
            for index, (field, url) in enumerate(sources, start=1):
                result = await scan_one(client, field, url, profile, budget)
                await Actor.push_data(result)
                found += result["count"]
                failed += not result["ok"]
                Actor.log.info(f"Image {index} of {len(sources)}: "
                               + (f"{result['count']} code(s)" if result["ok"] else result["error"]))
        await Actor.set_status_message(
            f"Read {len(sources)} image(s): {found} code(s) found, {failed} image(s) not readable.",
            is_terminal=True)
