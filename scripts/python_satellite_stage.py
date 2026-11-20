"""Write, and check, the tree of a satellite repository from one commit of this repository.

A host that reads a plugin from the root of its own repository (the Comfy Registry, the Dify
Marketplace) gets a small repository whose content is never edited by hand. Its source lives in
this repository under `integrations/<host>/`; `stage` writes the satellite's whole tree from one
commit, and `verify` checks that a tree is exactly that. scripts/stage-comfyui-satellite.py and
scripts/stage-dify-satellite.py describe their satellite and call `main`. The pattern is
scripts/stage-php-package.py.

`stage` reads the package at REV (HEAD by default) from git, never from the working tree, and
writes into an empty DIR:

  - every file of the package, byte for byte, except README.md, whose links to `mirror/` become
    links to `.github/workflows/`;
  - the package's `mirror/` as `.github/workflows/`, the satellite's own workflows;
  - the two fixtures the tests scan, under `tests/fixtures/`;
  - LICENSE, which must be the engine's, byte for byte;
  - `.gitignore`, written here, so a local `.env` or a build is never committed there;
  - `SOURCE.json`: the commit and the sha256 of every staged file.

`verify` stages the commit that DIR's `SOURCE.json` names and compares: same files, same bytes,
nothing else beside `.git`. Stdlib only. Exit 0 when the step passes, 1 when it fails, 2 for usage.
"""
import argparse
import dataclasses
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust"
FIXTURES = ("fixtures/symbology/mixed-code128-qr.png", "fixtures/clean/gen_v5_q.png")
IGNORED = ("__pycache__/", "*.py[cod]", ".venv/", ".pytest_cache/")


@dataclasses.dataclass(frozen=True)
class Satellite:
    name: str  # the script's name, for messages
    slug: str  # the satellite repository, owner/name
    package: str  # the package folder in this repository
    schema: str
    required: tuple  # files the stage must hold
    edited: str  # a source file the self-test edits by hand
    ignored: tuple = ()  # more .gitignore lines

    @property
    def workflows(self):
        return f"{self.package}/mirror"


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


def staged(satellite, revision, root=ROOT):
    """The whole tree of the satellite repository for REVISION, as {path: bytes}."""
    try:
        commit = git("rev-parse", "--verify", f"{revision}^{{commit}}", root=root).decode().strip()
    except subprocess.CalledProcessError as error:
        raise Refused(f"{revision} is not a commit of this repository") from error
    files = {path: data for path, data in tree(commit, satellite.package, root).items()
             if not path.startswith("mirror/")}
    for path, data in tree(commit, satellite.workflows, root).items():
        files[f".github/workflows/{path}"] = data
    readme = files.get("README.md", b"").decode()
    if "](../" in readme:
        raise Refused("README.md links outside the package; write that link as an absolute address")
    files["README.md"] = readme.replace("](mirror/)", "](.github/workflows/)").encode()
    engine_license = git("show", f"{commit}:LICENSE", root=root)
    if files.get("LICENSE", engine_license) != engine_license:
        raise Refused("the package's LICENSE is not the engine's LICENSE")
    files["LICENSE"] = engine_license
    for fixture in FIXTURES:
        files["tests/" + fixture] = git("show", f"{commit}:{fixture}", root=root)
    files[".gitignore"] = ("# Written by the stage: never commit a local build, environment or secret.\n"
                           + "".join(f"{line}\n" for line in IGNORED + satellite.ignored)).encode()
    for required in satellite.required:
        if required not in files:
            raise Refused(f"{required} is missing at {commit}")
    record = {"schema": satellite.schema, "engine": {"repository": REPOSITORY, "revision": commit},
              "satellite": f"https://github.com/{satellite.slug}",
              "files": {path: hashlib.sha256(data).hexdigest() for path, data in sorted(files.items())}}
    files["SOURCE.json"] = (json.dumps(record, indent=2) + "\n").encode()
    return files


def stage(satellite, revision, out, root=ROOT):
    out = pathlib.Path(out)
    if out.exists() and any(out.iterdir()):
        raise Refused(f"{out} is not empty")
    files = staged(satellite, revision, root)
    for path, data in files.items():
        target = out / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return json.loads(files["SOURCE.json"])["engine"]["revision"], len(files)


def verify(satellite, directory, root=ROOT):
    directory = pathlib.Path(directory)
    try:
        record = json.loads((directory / "SOURCE.json").read_text(encoding="utf-8"))
        revision = record["engine"]["revision"]
        if record["schema"] != satellite.schema or record["engine"]["repository"] != REPOSITORY:
            raise ValueError("another schema or repository")
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise Refused(f"SOURCE.json is not a stage record: {error}") from error
    expected = staged(satellite, revision, root)
    present = {path.relative_to(directory).as_posix(): path for path in directory.rglob("*")
               if path.is_file() and ".git" not in path.relative_to(directory).parts[:1]}
    problems = [f"missing {path}" for path in sorted(set(expected) - set(present))]
    problems += [f"not from the stage: {path}" for path in sorted(set(present) - set(expected))]
    problems += [f"differs from the stage: {path}" for path in sorted(set(expected) & set(present))
                 if present[path].read_bytes() != expected[path]]
    if problems:
        raise Refused("; ".join(problems))
    return revision, len(expected)


def self_test(satellite):
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
            revision, count = stage(satellite, "HEAD", box / "good")
            if verify(satellite, box / "good") != (revision, count):
                failures.append("a fresh stage does not verify as itself")
        except Refused as error:
            failures.append(f"the stage of HEAD was refused: {error}")
            revision = None
        if revision:
            good = box / "good"
            record = json.loads((good / "SOURCE.json").read_text())
            if any(path.startswith("mirror/") for path in record["files"]):
                failures.append("the workflow sources were staged under mirror/")
            if not any(path.startswith(".github/workflows/") for path in record["files"]):
                failures.append("no workflow was staged under .github/workflows/")
            readme = (good / "README.md").read_text()
            if "](../" in readme or "](mirror/)" in readme:
                failures.append("the staged README links outside the satellite")
            if (good / "LICENSE").read_bytes() != (ROOT / "LICENSE").read_bytes():
                failures.append("the staged LICENSE is not the engine's")
            if ".env" in satellite.ignored and ".env\n" not in (good / ".gitignore").read_text():
                failures.append("the staged .gitignore does not keep .env out")
            for fixture in FIXTURES:
                if not (good / "tests" / fixture).is_file():
                    failures.append(f"{fixture} is not staged")
            refused("a second stage into the same directory", lambda: stage(satellite, "HEAD", good), "is not empty")

            def copy(name):
                target = box / name
                for path in good.rglob("*"):
                    if path.is_file():
                        (target / path.relative_to(good)).parent.mkdir(parents=True, exist_ok=True)
                        (target / path.relative_to(good)).write_bytes(path.read_bytes())
                return target

            edited = copy("edited")
            source = edited / satellite.edited
            source.write_text(source.read_text() + "\n# edited by hand\n")
            refused("a file edited by hand", lambda: verify(satellite, edited),
                    f"differs from the stage: {satellite.edited}")
            added = copy("added")
            (added / "extra.py").write_text("print('added by hand')\n")
            refused("a file added by hand", lambda: verify(satellite, added), "not from the stage: extra.py")
            removed = copy("removed")
            (removed / "LICENSE").unlink()
            refused("a missing file", lambda: verify(satellite, removed), "missing LICENSE")
            other = copy("other")
            changed = dict(record, engine=dict(record["engine"], repository="https://example.test/fork"))
            (other / "SOURCE.json").write_text(json.dumps(changed))
            refused("a record that names another repository", lambda: verify(satellite, other), "not a stage record")
            with_git = copy("with-git")
            (with_git / ".git").mkdir()
            (with_git / ".git" / "HEAD").write_text("ref: refs/heads/main\n")
            try:
                verify(satellite, with_git)
            except Refused as error:
                failures.append(f"a repository's own .git directory was counted: {error}")
        refused("a revision that does not exist",
                lambda: stage(satellite, "0000000000000000000000000000000000000000", box / "none"), "is not a commit")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (the stage of HEAD, 5 refused trees, 1 refused revision)")
    return 1 if failures else 0


def main(satellite, description):
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("stage", help="write the satellite repository's tree from one commit")
    one.add_argument("--revision", default="HEAD")
    one.add_argument("--out", required=True)
    two = commands.add_parser("verify", help="check that a tree is exactly the stage of the commit it names")
    two.add_argument("directory")
    args = parser.parse_args()
    if args.self_test:
        return self_test(satellite)
    try:
        if args.command == "stage":
            revision, count = stage(satellite, args.revision, args.out)
            print(f"staged {count} files from {revision} into {args.out}")
        elif args.command == "verify":
            revision, count = verify(satellite, args.directory)
            print(f"ok    {count} files equal the stage of {revision}")
        else:
            parser.print_usage(sys.stderr)
            return 2
    except Refused as error:
        print(f"{satellite.name}: {error}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        print(f"{satellite.name}: git failed: {error.stderr.decode(errors='replace').strip()}", file=sys.stderr)
        return 1
    return 0
