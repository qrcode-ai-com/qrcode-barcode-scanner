"""Write a run's input and uploaded files, or read its dataset, with the Apify SDK in its own process.

python apify_storage.py prepare SPEC.json OUT.json   SPEC: {"input": {...}, "stores": {name: {key: path}}}
python apify_storage.py items OUT.json

In the input, "{store:NAME}" becomes the id of the store NAME, as a file upload field would give it.
APIFY_LOCAL_STORAGE_DIR chooses the storage folder, as it does for `apify run`.
"""
import asyncio
import json
import pathlib
import sys

from apify import Actor


async def prepare(spec: dict) -> dict:
    async with Actor(exit_process=False):
        ids = {}
        for name, records in spec.get("stores", {}).items():
            store = await Actor.open_key_value_store(name=name)
            for key, path in records.items():
                await store.set_value(key, pathlib.Path(path).read_bytes(), content_type="image/png")
            ids[name] = store.id
        text = json.dumps(spec["input"])
        for name, store_id in ids.items():
            text = text.replace("{store:" + name + "}", store_id)
        await (await Actor.open_key_value_store()).set_value("INPUT", json.loads(text))
        return ids


async def items() -> list:
    async with Actor(exit_process=False):
        return (await (await Actor.open_dataset()).get_data(limit=1000)).items


if __name__ == "__main__":
    command, *paths = sys.argv[1:]
    if command == "prepare":
        result = asyncio.run(prepare(json.loads(pathlib.Path(paths[0]).read_text())))
    elif command == "items":
        result = asyncio.run(items())
    else:
        raise SystemExit(f"unknown command {command}")
    pathlib.Path(paths[-1]).write_text(json.dumps(result), encoding="utf-8")
