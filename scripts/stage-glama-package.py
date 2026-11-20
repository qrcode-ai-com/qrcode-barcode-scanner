#!/usr/bin/env python3
"""Stage the Glama listing of the MCP server as the tree of its own repository.

  stage-glama-package.py stage [--revision REV] --out DIR
  stage-glama-package.py verify DIR
  stage-glama-package.py --self-test

Glama lists a GitHub repository: it reads glama.json at the repository root and builds the server
from the root Dockerfile. In this repository a root Dockerfile would be taken for the CLI image, so
the listing lives in a small repository of its own, qrcode-ai-com/qrcode-barcode-scanner-mcp,
whose content is never edited by hand: `stage` writes it from one commit of this repository.

`stage` reads distribution/glama at REV (HEAD by default) from git, never from the working tree,
and writes into an empty DIR: every file of that folder byte for byte (glama.json, Dockerfile,
package.json, package-lock.json, README.md), LICENSE (this repository's, which covers those
files) and SOURCE.json, the commit and the sha256 of every staged file. The Dockerfile installs
the published npm package @qrcode-ai-com/qrcode-barcode-scanner-mcp 0.3.1; nothing is built from
this source.

`verify` stages the commit that DIR's SOURCE.json names and compares: same files, same bytes,
nothing else beside `.git`. Stdlib only. Exit 0 when the step passes, 1 when it fails, 2 for usage.
"""
import argparse
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust"
PACKAGE = "distribution/glama"
SCHEMA = "qrscan-glama-stage/1"
REQUIRED = ("glama.json", "Dockerfile", "package.json", "package-lock.json", "README.md")
ADAPTER = "@qrcode-ai-com/qrcode-barcode-scanner-mcp"
ADAPTER_VERSION = "0.3.1"
ADAPTER_INTEGRITY = "sha512-JLPa1AqFpygcrt/zKMQwhIfD67U9j1DUPnKdBmYYwo8yQoZmwNtd4FH80yllFbONKwxcjpReqLiVrWilWgeEng=="


class Refused(Exception):
    """The stage cannot be written or does not match."""


def git(*arguments, root=ROOT):
    return subprocess.run(["git", "-C", str(root), *arguments], capture_output=True, check=True).stdout


def tree(revision, prefix, root=ROOT):
    """Every regular file under PREFIX at REVISION, as {path below PREFIX: bytes}."""
    files = {}
    listing = git("ls-tree", "-r", "-z", revision, "--", prefix, root=root).decode()
    for entry in filter(None, listing.split("\0")):
        meta, path = entry.split("\t", 1)
        mode, kind, _ = meta.split(" ")
        if kind != "blob" or mode not in ("100644", "100755"):
            raise Refused(f"{path} is not a regular file (mode {mode}): a link or a submodule is not staged")
        files[path[len(prefix) + 1:]] = git("show", f"{revision}:{path}", root=root)
    if not files:
        raise Refused(f"{prefix} holds no file at {revision}")
    return files


def check_contents(files):
    """The listing's own rules: glama.json as Glama's schema allows, the adapter pinned exactly."""
    try:
        glama = json.loads(files["glama.json"])
        package = json.loads(files["package.json"])
        lock = json.loads(files["package-lock.json"])
    except (KeyError, ValueError) as error:
        raise Refused(f"a listing file is missing or not JSON: {error}") from error
    if set(glama) - {"$schema", "maintainers"} or glama.get("$schema") != "https://glama.ai/mcp/schemas/server.json":
        raise Refused("glama.json may hold only $schema (Glama's) and maintainers")
    maintainers = glama.get("maintainers")
    if not isinstance(maintainers, list) or not maintainers or len(set(maintainers)) != len(maintainers) \
            or not all(isinstance(name, str) and name for name in maintainers):
        raise Refused("glama.json needs a list of distinct GitHub usernames in maintainers")
    if package.get("dependencies") != {ADAPTER: ADAPTER_VERSION}:
        raise Refused(f"package.json must depend on {ADAPTER} {ADAPTER_VERSION} exactly, and on nothing else")
    locked = lock.get("packages", {}).get(f"node_modules/{ADAPTER}", {})
    if (locked.get("version"), locked.get("integrity")) != (ADAPTER_VERSION, ADAPTER_INTEGRITY):
        raise Refused(f"package-lock.json does not pin the published {ADAPTER} {ADAPTER_VERSION}")
    lines = files["Dockerfile"].decode().splitlines()
    bases = [line for line in lines if line.startswith("FROM ")]
    if not bases or not all("@sha256:" in line for line in bases) or not any("npm ci" in line for line in lines):
        raise Refused("the Dockerfile must install with npm ci from a base pinned by digest")


def staged(revision, root=ROOT):
    """The whole tree of the listing repository for REVISION, as {path: bytes}."""
    try:
        commit = git("rev-parse", "--verify", f"{revision}^{{commit}}", root=root).decode().strip()
    except subprocess.CalledProcessError as error:
        raise Refused(f"{revision} is not a commit of this repository") from error
    files = tree(commit, PACKAGE, root)
    for required in REQUIRED:
        if required not in files:
            raise Refused(f"{PACKAGE}/{required} is missing at {commit}")
    check_contents(files)
    if "](../" in files["README.md"].decode() or "](./" in files["README.md"].decode():
        raise Refused("README.md links to a relative path, which the listing repository does not hold")
    files["LICENSE"] = git("show", f"{commit}:LICENSE", root=root)
    record = {"schema": SCHEMA, "engine": {"repository": REPOSITORY, "revision": commit},
              "files": {path: hashlib.sha256(data).hexdigest() for path, data in sorted(files.items())}}
    files["SOURCE.json"] = (json.dumps(record, indent=2) + "\n").encode()
    return files


def stage(revision, out, root=ROOT):
    out = pathlib.Path(out)
    if out.exists() and any(out.iterdir()):
        raise Refused(f"{out} is not empty")
    files = staged(revision, root)
    for path, data in files.items():
        target = out / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return json.loads(files["SOURCE.json"])["engine"]["revision"], len(files)


def verify(directory, root=ROOT):
    directory = pathlib.Path(directory)
    try:
        record = json.loads((directory / "SOURCE.json").read_text(encoding="utf-8"))
        revision = record["engine"]["revision"]
        if record["schema"] != SCHEMA or record["engine"]["repository"] != REPOSITORY:
            raise ValueError("another schema or repository")
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise Refused(f"SOURCE.json is not a stage record: {error}") from error
    expected = staged(revision, root)
    present = {path.relative_to(directory).as_posix(): path for path in directory.rglob("*")
               if path.is_file() and ".git" not in path.relative_to(directory).parts[:1]}
    problems = [f"missing {path}" for path in sorted(set(expected) - set(present))]
    problems += [f"not from the stage: {path}" for path in sorted(set(present) - set(expected))]
    problems += [f"differs from the stage: {path}" for path in sorted(set(expected) & set(present))
                 if present[path].read_bytes() != expected[path]]
    if problems:
        raise Refused("; ".join(problems))
    return revision, len(expected)


def self_test():
    failures = []

    def refused(name, action, needle):
        try:
            action()
        except Refused as error:
            if needle not in str(error):
                failures.append(f"{name}: refused with {error!s}, expected {needle!r}")
        else:
            failures.append(f"{name}: accepted")

    with tempfile.TemporaryDirectory() as temporary:
        box = pathlib.Path(temporary)
        try:
            revision, count = stage("HEAD", box / "good")
            if verify(box / "good") != (revision, count):
                failures.append("a fresh stage does not verify as itself")
        except Refused as error:
            failures.append(f"the stage of HEAD was refused: {error}")
            revision = None
        if revision:
            good = box / "good"
            if (good / "LICENSE").read_bytes() != git("show", f"{revision}:LICENSE"):
                failures.append("the staged LICENSE is not this repository's")
            if sorted(path.name for path in good.iterdir()) != sorted([*REQUIRED, "LICENSE", "SOURCE.json"]):
                failures.append("the stage holds other files than the listing's")
            refused("a second stage into the same directory", lambda: stage("HEAD", good), "is not empty")

            def copy(name):
                target = box / name
                for path in good.rglob("*"):
                    if path.is_file():
                        (target / path.relative_to(good)).parent.mkdir(parents=True, exist_ok=True)
                        (target / path.relative_to(good)).write_bytes(path.read_bytes())
                return target

            edited = copy("edited")
            (edited / "Dockerfile").write_text((edited / "Dockerfile").read_text() + "RUN true\n")
            refused("a file edited by hand", lambda: verify(edited), "differs from the stage: Dockerfile")
            added = copy("added")
            (added / "server.mjs").write_text("// added\n")
            refused("a file added by hand", lambda: verify(added), "not from the stage: server.mjs")
            removed = copy("removed")
            (removed / "glama.json").unlink()
            refused("a missing file", lambda: verify(removed), "missing glama.json")
            original = {path: (good / path).read_bytes() for path in REQUIRED}
            wider = dict(original, **{"glama.json": json.dumps({"$schema": "https://glama.ai/mcp/schemas/server.json",
                                                                 "maintainers": ["a"], "name": "x"}).encode()})
            refused("a glama.json with a field Glama's schema lacks", lambda: check_contents(wider), "may hold only")
            floating = dict(original, **{"package.json": json.dumps({"dependencies": {ADAPTER: "^0.3.1"}}).encode()})
            refused("an adapter range instead of the exact version", lambda: check_contents(floating), "exactly")
        refused("a revision that does not exist",
                lambda: stage("0000000000000000000000000000000000000000", box / "none"), "is not a commit")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (the stage of HEAD, 5 refused trees, 1 refused revision)")
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("stage", help="write the listing repository's tree from one commit")
    one.add_argument("--revision", default="HEAD")
    one.add_argument("--out", required=True)
    two = commands.add_parser("verify", help="check that a tree is exactly the stage of the commit it names")
    two.add_argument("directory")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    try:
        if args.command == "stage":
            revision, count = stage(args.revision, args.out)
            print(f"staged {count} files from {revision} into {args.out}")
        elif args.command == "verify":
            revision, count = verify(args.directory)
            print(f"ok    {count} files equal the stage of {revision}")
        else:
            parser.print_usage(sys.stderr)
            return 2
    except Refused as error:
        print(f"stage-glama-package: {error}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        print(f"stage-glama-package: git failed: {error.stderr.decode(errors='replace').strip()}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
