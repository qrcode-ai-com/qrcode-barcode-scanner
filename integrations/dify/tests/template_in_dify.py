#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Run the Dify template in open-source Dify, through the console API a signed-in user drives.

  template_in_dify.py run --base URL --package PKG.difypkg --mixed PNG --work DIR [--reports DIR]
  template_in_dify.py installed --base URL --work DIR

`run` expects a Dify stack started from the docker/ folder of a Dify release, with
FORCE_VERIFYING_SIGNATURE=false so the plugin daemon accepts a package that the Marketplace has not
signed. It sets up a throwaway owner, uploads and installs the plugin package, and imports
template/qr-and-barcode-reader.yml unchanged, plus two copies whose scan profile is frame and full.
It uploads the mixed fixture (a QR code and a Code 128), a blank image and a file that is not an
image, runs the draft workflow on each, and compares the End node each run reaches and its outputs
with exact values. It exports the imported template as YAML and as an .ifpkg app package, deletes
the apps, uninstalls the plugin and checks that both are gone. --reports writes the engine report
of the mixed image per profile, for scripts/destination-acceptance.py.

`installed` signs in again with the owner `run` saved in --work and exits 0 when the plugin is
installed, 1 when it is not: the uninstall check of the acceptance receipt.

Stdlib only.
"""
import argparse
import base64
import http.cookiejar
import json
import pathlib
import re
import secrets
import sys
import time
import urllib.error
import urllib.request
import zipfile

HERE = pathlib.Path(__file__).resolve().parent
TEMPLATE = HERE.parent / "template" / "qr-and-barcode-reader.yml"
PLUGIN_ID = "qrcode-ai-com/qrcode-barcode-scanner"
PLUGIN_VERSION = "0.1.0"
ENGINE_VERSION = "0.11.0"
EXPECTED = ["https://qrc-ai.com/76xMa", "STOCK-4827"]
SUMMARY = "Found 2 codes. qr_code: https://qrc-ai.com/76xMa; code128: STOCK-4827"
# The same 64 x 64 white PNG as the n8n node's tests: an image with no code.
BLANK = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAXklEQVR4nO3PMQ0AMAzAsPInvYLYYVWKESTzjhsd8KsBrQGtAa0B"
    "rQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BbQHKU9LC7/CP1AAAAABJRU5ErkJggg==")
OWNER_FILE = "owner.json"


class Console:
    """The Dify console API with the session cookies and the CSRF header the web app sends."""

    def __init__(self, base):
        self.base = base.rstrip("/") + "/console/api"
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def _csrf(self):
        for cookie in self.jar:
            if cookie.name in ("csrf_token", "__Host-csrf_token"):
                return cookie.value
        return None

    def request(self, method, path, body=None, files=None, stream=False, timeout=120):
        headers = {}
        data = None
        if files is not None:
            boundary = "----dify-template-" + secrets.token_hex(12)
            parts = []
            for field, (name, content, mime) in files.items():
                parts.append(
                    f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field}\"; filename=\"{name}\"\r\n"
                    f"Content-Type: {mime}\r\n\r\n".encode() + content + b"\r\n")
            for field, value in (body or {}).items():
                parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field}\"\r\n\r\n{value}\r\n".encode())
            data = b"".join(parts) + f"--{boundary}--\r\n".encode()
            headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        elif body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        csrf = self._csrf()
        if csrf:
            headers["X-CSRF-Token"] = csrf
        req = urllib.request.Request(self.base + path, data=data, method=method, headers=headers)
        try:
            response = self.opener.open(req, timeout=timeout)
        except urllib.error.HTTPError as error:
            raise SystemExit(f"{method} {path}: HTTP {error.code} {error.read()[:600]!r}") from None
        if stream:
            return response
        with response:
            raw = response.read()
            kind = response.headers.get("Content-Type", "")
        if not raw:
            return None
        return json.loads(raw) if "json" in kind else raw


def check(condition, message):
    if not condition:
        raise SystemExit(f"template_in_dify: {message}")


def wait_ready(base, seconds=900):
    deadline = time.monotonic() + seconds
    while True:
        try:
            with urllib.request.urlopen(base.rstrip("/") + "/console/api/setup", timeout=10) as response:
                if response.status == 200:
                    return json.loads(response.read())
        except (urllib.error.URLError, OSError, ValueError):
            pass
        check(time.monotonic() < deadline, f"Dify did not answer /console/api/setup within {seconds} s")
        time.sleep(5)


def sign_in(base, owner):
    console = Console(base)
    console.request("POST", "/login", {
        "email": owner["email"], "password": base64.b64encode(owner["password"].encode()).decode(),
        "remember_me": False})
    check(console._csrf(), "the login set the csrf_token cookie")
    return console


def plugins(console):
    listed = console.request("GET", "/workspaces/current/plugin/list?page=1&page_size=100")
    return [row for row in listed["plugins"] if row["plugin_id"] == PLUGIN_ID]


def install(console, package):
    uploaded = console.request("POST", "/workspaces/current/plugin/upload/pkg",
                               files={"pkg": (package.name, package.read_bytes(), "application/octet-stream")})
    identifier = uploaded["unique_identifier"]
    check(identifier.startswith(f"{PLUGIN_ID}:{PLUGIN_VERSION}@"), f"uploaded package {identifier}")
    started = console.request("POST", "/workspaces/current/plugin/install/pkg",
                              {"plugin_unique_identifiers": [identifier]})
    if not started.get("all_installed"):
        deadline = time.monotonic() + 900
        while True:
            task = console.request("GET", f"/workspaces/current/plugin/tasks/{started['task_id']}")["task"]
            if task["status"] == "success":
                break
            check(task["status"] != "failed", f"plugin installation failed: {json.dumps(task)[:2000]}")
            check(time.monotonic() < deadline, f"plugin installation still {task['status']} after 900 s")
            time.sleep(5)
    installed = plugins(console)
    check([row["version"] for row in installed] == [PLUGIN_VERSION], f"installed plugin versions {installed}")
    print(f"installed {identifier}")
    return installed[0]


def import_app(console, text, label):
    result = console.request("POST", "/apps/imports", {"mode": "yaml-content", "yaml_content": text})
    # The file keeps DSL 0.3.1: an older minor version imports with a warning, not a confirmation.
    check(result["status"] in ("completed", "completed-with-warnings"), f"{label}: import {result}")
    leaked = console.request("GET", f"/apps/imports/{result['app_id']}/check-dependencies")["leaked_dependencies"]
    check(leaked == [], f"{label}: missing dependencies {leaked}")
    print(f"{label}: imported as {result['app_id']} ({result['status']}, DSL {result['imported_dsl_version']}"
          f" into {result['current_dsl_version']})")
    return result


def upload(console, name, content):
    uploaded = console.request("POST", "/files/upload", files={"file": (name, content, "image/png")})
    return uploaded["id"]


def run(console, app_id, file_id):
    """The draft run the editor's Run button starts: its event stream, until the workflow finishes."""
    response = console.request("POST", f"/apps/{app_id}/workflows/draft/run", {
        "inputs": {"image": {"type": "image", "transfer_method": "local_file", "upload_file_id": file_id}}},
        stream=True, timeout=600)
    nodes, finished = {}, None
    with response:
        for line in response:
            line = line.decode().strip()
            if not line.startswith("data:"):
                continue
            event = json.loads(line[5:])
            if event.get("event") == "node_finished":
                nodes[event["data"]["node_id"]] = event["data"]
            elif event.get("event") == "workflow_finished":
                finished = event["data"]
            elif event.get("event") == "error":
                raise SystemExit(f"run error event: {event}")
    check(finished is not None, "the run stream ended without workflow_finished")
    return nodes, finished


def ends(nodes):
    return sorted(node_id for node_id, data in nodes.items() if data.get("node_type") == "end")


def judge_mixed(label, profile, nodes, finished):
    check(finished["status"] == "succeeded", f"{label}: workflow status {finished['status']} {finished.get('error')}")
    check(ends(nodes) == ["codes"], f"{label}: End nodes reached {ends(nodes)}")
    outputs = finished["outputs"]
    check(outputs["texts"] == EXPECTED, f"{label}: texts {outputs['texts']}")
    check(outputs["count"] == 2, f"{label}: count {outputs['count']}")
    check(outputs["summary"] == SUMMARY, f"{label}: summary {outputs['summary']!r}")
    check(len(outputs["report"]) == 1, f"{label}: one report")
    report = outputs["report"][0]
    check(report["versions"]["scanner"] == ENGINE_VERSION, f"{label}: engine {report['versions']}")
    check(report["trace"]["budget_exhausted"] is False, f"{label}: the budget cut the scan")
    check((report["score"] is None) == (profile == "frame"), f"{label}: score {report['score']!r}")
    print(f"{label}: Codes, {outputs['texts']}")
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    one = sub.add_parser("run")
    one.add_argument("--base", required=True)
    one.add_argument("--package", required=True, type=pathlib.Path)
    one.add_argument("--mixed", required=True, type=pathlib.Path)
    one.add_argument("--work", required=True, type=pathlib.Path)
    one.add_argument("--reports", type=pathlib.Path)
    two = sub.add_parser("installed")
    two.add_argument("--base", required=True)
    two.add_argument("--work", required=True, type=pathlib.Path)
    args = parser.parse_args(argv)

    if args.command == "installed":
        owner = json.loads((args.work / OWNER_FILE).read_text())
        found = plugins(sign_in(args.base, owner))
        print(f"{PLUGIN_ID}: {'installed' if found else 'not installed'}")
        return 0 if found else 1

    args.work.mkdir(parents=True, exist_ok=True)
    status = wait_ready(args.base)
    check(status["step"] == "not_started", f"a new Dify instance: setup {status}")
    owner = {"email": "owner@example.com", "name": "Template check",
             "password": "Check" + secrets.token_hex(8) + "1"}
    Console(args.base).request("POST", "/setup", {"email": owner["email"], "name": owner["name"],
                                                  "password": owner["password"]})
    (args.work / OWNER_FILE).write_text(json.dumps(owner))
    console = sign_in(args.base, owner)

    # 1. The plugin package, as Plugins, Install plugin, Local package file does.
    install(console, args.package)

    # 2. The template file unchanged (profile fast), and copies that scan with frame and full.
    shipped = TEMPLATE.read_text()
    apps = {"fast": import_app(console, shipped, "template (fast)")["app_id"]}
    for profile in ("frame", "full"):
        apps[profile] = import_app(console, variant(shipped, profile), f"copy ({profile})")["app_id"]

    # 3. The three files, uploaded as the Run panel uploads them.
    files = {"mixed.png": args.mixed.read_bytes(), "blank.png": BLANK, "corrupt.png": b"not an image"}
    ids = {name: upload(console, name, content) for name, content in files.items()}

    # 4. The runs, each judged by the End node it reaches and that node's outputs.
    reports = {}
    for profile, app_id in apps.items():
        label = f"{profile}, mixed.png"
        reports[profile] = judge_mixed(label, profile, *run(console, app_id, ids["mixed.png"]))
    nodes, finished = run(console, apps["fast"], ids["blank.png"])
    check(finished["status"] == "succeeded", f"blank.png: workflow status {finished['status']}")
    check(ends(nodes) == ["empty"], f"blank.png: End nodes reached {ends(nodes)}")
    check(finished["outputs"] == {"summary": "No QR code or barcode found.", "complete": True},
          f"blank.png: outputs {finished['outputs']}")
    print("fast, blank.png: No code found")
    nodes, finished = run(console, apps["fast"], ids["corrupt.png"])
    # A failure the fail branch handles: Dify reports the run as partly succeeded.
    check(finished["status"] == "partial-succeeded", f"corrupt.png: workflow status {finished['status']}")
    check(ends(nodes) == ["unreadable"], f"corrupt.png: End nodes reached {ends(nodes)}")
    check(nodes["scan"]["status"] == "exception", f"corrupt.png: scan node status {nodes['scan']['status']}")
    error = finished["outputs"].get("error", "")
    check(list(finished["outputs"]) == ["error"] and error.endswith("error type: ValueError, error details: "
          "unsupported or corrupt image: The image format could not be determined [QRS-001]"),
          f"corrupt.png: outputs {finished['outputs']}")
    print(f"fast, corrupt.png: File not readable ({finished['status']}): {error}")
    (args.work / "runs.json").write_text(json.dumps({"corrupt": {"status": finished["status"], "error": error}}))
    if args.reports:
        args.reports.mkdir(parents=True, exist_ok=True)
        for profile, report in reports.items():
            (args.reports / f"{profile}.json").write_text(json.dumps(report))

    # 5. The imported template exported back, as YAML and as the .ifpkg app package.
    exported = console.request("GET", f"/apps/{apps['fast']}/export?format=yaml&include_secret=false")["data"]
    (args.work / "exported.yml").write_text(exported)
    package = console.request("GET", f"/apps/{apps['fast']}/export?format=ifpkg&include_secret=false")
    (args.work / "exported.ifpkg").write_bytes(package)
    with zipfile.ZipFile(args.work / "exported.ifpkg") as archive:
        print(f"exported.ifpkg: {len(package)} bytes, {archive.namelist()}")
    version = re.search(r"^version: (.+)$", exported, re.M)
    print(f"exported DSL version {version.group(1) if version else '?'}")

    # 6. Delete the apps and uninstall the plugin; both must be gone.
    for app_id in apps.values():
        console.request("DELETE", f"/apps/{app_id}")
    left = console.request("GET", "/apps?page=1&limit=100")["data"]
    check(left == [], f"apps left after deletion: {[app['name'] for app in left]}")
    installed = plugins(console)
    check(main(["installed", "--base", args.base, "--work", str(args.work)]) == 0, "installed reports the plugin")
    result = console.request("POST", "/workspaces/current/plugin/uninstall",
                             {"plugin_installation_id": installed[0]["installation_id"]})
    check(result.get("success") is True, f"uninstall {result}")
    check(plugins(console) == [], "the plugin is uninstalled")
    print("apps deleted, plugin uninstalled")
    return 0


def variant(text, profile):
    """The template with another scan profile and its own name, by an exact text edit."""
    for old, new in (("            type: constant\n            value: fast\n",
                      f"            type: constant\n            value: {profile}\n"),
                     ("  name: Uploaded Image QR and Barcode Reader\n",
                      f"  name: Uploaded Image QR and Barcode Reader ({profile})\n")):
        check(text.count(old) == 1, f"one {old.strip()!r} in the template")
        text = text.replace(old, new)
    return text


if __name__ == "__main__":
    sys.exit(main())
