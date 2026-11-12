#!/usr/bin/env python3
"""Qualify a NuGet upload and compare nuget.org's signed copy with its producer.

No account, environment, tag or publication is created here. Only the workflow's
explicit `dotnet nuget push` step uploads. Inspection runs without registry credentials.
"""
import argparse
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import tomllib
import urllib.error
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = "qrcode-ai-com/qrcode-barcode-scanner"
REPOSITORY_ID = "1126991539"
PACKAGE = "QRCodeAI.QRCodeBarcodeScanner"
FEED = "https://api.nuget.org/v3-flatcontainer/" + PACKAGE.lower()
LIMIT = 32 * 1024 * 1024
spec = importlib.util.spec_from_file_location("dotnet_package", ROOT / "scripts/dotnet-package.py")
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)
Refused = package.Refused
require = package.require


def digest(data):
    return hashlib.sha256(data).hexdigest()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise Refused("release verification must not follow a redirect")


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "qrscan-dotnet-release"})
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=30) as response:
        data = response.read(LIMIT + 1)
    require(len(data) <= LIMIT, "release response exceeds its size limit")
    return data


def identity(context):
    require(context.get("GITHUB_REPOSITORY") == REPOSITORY and
            context.get("GITHUB_REPOSITORY_ID") == REPOSITORY_ID,
            "publication requires the canonical repository name and immutable ID")


def version(root=ROOT):
    return tomllib.loads((root / "Cargo.toml").read_text())["workspace"]["package"]["version"]


def owner(user):
    require(bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,63}", user or "")),
            "NUGET_USER must be the actual individual NuGet username, not an email or organization")


def environment(get=fetch):
    url = f"https://api.github.com/repos/{REPOSITORY}/environments/nuget"
    env, policies = (json.loads(get(path)) for path in (url, url + "/deployment-branch-policies"))
    require(env.get("name") == "nuget", "the protected nuget environment must already exist")
    require(env.get("deployment_branch_policy") == {"protected_branches": False, "custom_branch_policies": True},
            "nuget must use custom deployment tag policies")
    reviews = [rule for rule in env.get("protection_rules", []) if rule.get("type") == "required_reviewers"]
    require(len(reviews) == 1 and len(reviews[0].get("reviewers", [])) == 1,
            "nuget must require the owner's review")
    reviewer = reviews[0]["reviewers"][0]
    require(reviewer.get("type") == "User" and reviewer.get("reviewer", {}).get("id") == 20891897 and
            reviewer["reviewer"].get("login") == "ThibautMelen", "nuget reviewer must be ThibautMelen")
    require(policies.get("total_count") == 1 and
            [(row.get("name"), row.get("type")) for row in policies.get("branch_policies", [])] == [("v*", "tag")],
            "nuget must allow v* tags only")


def preflight(context, user, get=fetch, root=ROOT):
    ref = context.get("GITHUB_REF", "")
    if not ref.startswith("refs/tags/"):
        return False
    identity(context)
    require(ref == "refs/tags/v" + version(root), "tag differs from the workspace version")
    if context.get("GITHUB_EVENT_NAME") != "push":
        return False
    owner(user)
    environment(get)
    return True


def one(folder, suffix):
    paths = list(folder.rglob("*" + suffix))
    require(len(paths) == 1 and paths[0].is_file() and not paths[0].is_symlink(),
            f"expected one regular {suffix} file in {folder}")
    return paths[0]


def candidate(folder, natives, expected, commit, root=ROOT):
    require(bool(re.fullmatch(r"[0-9a-f]{64}", expected)), "missing producer receipt SHA-256")
    receipt = one(folder, "package.json").read_bytes()
    require(digest(receipt) == expected, "producer receipt differs from the pack job's digest")
    archive = one(folder, ".nupkg")
    require(archive.name == f"{PACKAGE}.{version(root)}.nupkg", "archive name differs from the workspace version")
    report = package.inspect(archive.read_bytes(), natives, version(root), commit)
    require(report == json.loads(receipt), "archive differs from its inspected producer receipt")
    # Re-read the actual native files; their records alone are not a second inspection.
    for target, row in package.TARGETS.items():
        found = package.read_floor(natives / row["rid"] / row["file"])
        require(not package.floor_problems(target, found), f"native floor refused {target}")
    return archive, report


def absent(release_version, get=fetch):
    try:
        versions = json.loads(get(FEED + "/index.json"))["versions"]
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return
        raise
    require(release_version not in versions, "this NuGet version already exists; it must never be replaced")


def members(data):
    require(len(data) <= LIMIT, "package exceeds its size limit")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        infos = archive.infolist()
        require(len(infos) <= 64 and len({row.filename for row in infos}) == len(infos),
                "duplicate or excessive package members")
        require(sum(row.file_size for row in infos) <= LIMIT, "expanded package exceeds its size limit")
        return {row.filename: archive.read(row) for row in infos}


def compare_signed(original, public):
    """Nuget.org adds exactly its signature; every pre-existing member must be identical."""
    before, after = members(original), members(public)
    require(".signature.p7s" not in before, "producer archive must be unsigned")
    require(bool(after.pop(".signature.p7s", b"")), "public package lacks its repository signature")
    require(before == after, "public package content differs from the qualified archive")


def public_copy(archive, out, release_version, get=fetch, run=subprocess.run, pause=time.sleep):
    data = None
    for attempt in range(20):
        try:
            data = get(f"{FEED}/{release_version}/{PACKAGE.lower()}.{release_version}.nupkg")
            break
        except urllib.error.HTTPError as error:
            if error.code != 404 or attempt == 19:
                raise
            pause(15)
    compare_signed(archive.read_bytes(), data)
    out.mkdir(parents=True, exist_ok=False)
    signed = out / archive.name
    signed.write_bytes(data)
    # A signature member alone is not proof: NuGet must validate its certificate chain and timestamp.
    run(["dotnet", "nuget", "verify", str(signed), "--all"], check=True, timeout=120)
    return signed


def consume_public(args):
    archive, report = candidate(args.folder, args.natives, args.receipt_sha256, args.commit)
    signed = public_copy(archive, args.out / "signed", report["version"])
    work, cache = args.out / "consumer", args.out / "packages"
    work.mkdir()
    cache.mkdir()
    (work / "Consumer.csproj").write_text('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup>'
        '<OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><Nullable>enable</Nullable>'
        '<ImplicitUsings>enable</ImplicitUsings><UseAppHost>false</UseAppHost></PropertyGroup></Project>\n')
    (work / "nuget.config").write_text('<configuration><packageSources><clear />'
        '<add key="nuget.org" value="https://api.nuget.org/v3/index.json" />'
        '</packageSources></configuration>\n')
    shutil.copyfile(ROOT / "bindings/dotnet/acceptance/Program.cs", work / "Program.cs")
    env = {**os.environ, "NUGET_PACKAGES": str(cache.resolve())}
    def execute(argv, cwd=ROOT):
        subprocess.run(argv, cwd=cwd, env=env, check=True, timeout=240)
    execute(["dotnet", "add", "package", PACKAGE, "--version", report["version"]], work)
    cached = one(cache / PACKAGE.lower() / report["version"], ".nupkg")
    require(cached.read_bytes() == signed.read_bytes(), "NuGet restored different bytes from the public feed")
    execute(["dotnet", "build", "--configuration", "Release"], work)
    stage = subprocess.run([sys.executable, "scripts/destination-acceptance.py", "stage", str(args.out / "input")],
                           cwd=ROOT, check=True, capture_output=True, text=True, timeout=30).stdout.strip()
    reports = args.out / "reports"
    execute(["dotnet", str(work / "bin/Release/net8.0/Consumer.dll"), stage, str(reports)])
    receipt = args.out / "acceptance.json"
    execute([sys.executable, "scripts/destination-acceptance.py", "reports", "--kind", "package",
        "--produced-by", "dotnet Consumer.dll (public nuget.org package)",
        "--fast", str(reports / "fast.json"), "--frame", str(reports / "frame.json"),
        "--full", str(reports / "full.json"), "--destination", "NuGet public package",
        "--identifier", PACKAGE, "--version", report["version"],
        "--url", f"https://www.nuget.org/packages/{PACKAGE}/{report['version']}",
        "--install", f"dotnet add package {PACKAGE} --version {report['version']}",
        "--run-url", f"https://github.com/{REPOSITORY}/actions/runs/{os.environ['GITHUB_RUN_ID']}",
        "--receipt", str(receipt)])
    execute(["dotnet", "remove", "package", PACKAGE], work)
    # The removal judge executes in the project directory.
    execute([sys.executable, str(ROOT / "scripts/destination-acceptance.py"), "removed",
        "--gone", "dotnet build --configuration Release", "--uninstall", "dotnet remove package " + PACKAGE,
        "--receipt", str(receipt)], work)
    execute([sys.executable, "scripts/destination-acceptance.py", "check", str(receipt)])
    (args.out / "publication.json").write_text(json.dumps({"package": PACKAGE, "version": report["version"],
        "commit": args.commit, "producerSha256": report["sha256"], "publicSha256": digest(signed.read_bytes()),
        "signature": "dotnet nuget verify --all", "content": "identical except repository signature",
        "rid": args.rid, "outcome": "PUBLIC_INSTALL_SCAN_REMOVE_PASS"}, indent=2) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["preflight", "candidate", "consume-public"])
    parser.add_argument("--user", default=os.environ.get("NUGET_USER", ""))
    parser.add_argument("--folder", type=Path)
    parser.add_argument("--natives", type=Path)
    parser.add_argument("--receipt-sha256")
    parser.add_argument("--commit", default=os.environ.get("GITHUB_SHA", ""))
    parser.add_argument("--out", type=Path)
    parser.add_argument("--rid", choices=[row["rid"] for row in package.TARGETS.values()])
    parser.add_argument("--require-absent", action="store_true")
    args = parser.parse_args()
    try:
        if args.command == "preflight":
            allowed = preflight(os.environ, args.user)
            with open(os.environ["GITHUB_OUTPUT"], "a") as output:
                output.write(f"publish_allowed={str(allowed).lower()}\n")
            print(json.dumps({"publish_allowed": allowed}))
        else:
            require(args.folder and args.natives and args.receipt_sha256, "candidate inputs are required")
            if args.command == "consume-public":
                require(args.out and args.out.is_absolute() and args.rid, "absolute output path and RID are required")
                consume_public(args)
            else:
                _, report = candidate(args.folder, args.natives, args.receipt_sha256, args.commit)
                if args.require_absent:
                    identity(os.environ)
                    require(os.environ.get("GITHUB_REF") == "refs/tags/v" + report["version"], "not the engine tag")
                    require(os.environ.get("GITHUB_EVENT_NAME") == "push", "not an engine tag push")
                    owner(args.user)
                    environment()
                    absent(report["version"])
                print(json.dumps(report, sort_keys=True))
    except (Refused, OSError, ValueError, KeyError, zipfile.BadZipFile, subprocess.SubprocessError) as error:
        print(f"dotnet-release: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
