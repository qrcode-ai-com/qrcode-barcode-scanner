#!/usr/bin/env python3
"""Stage the Go package as the tree of its own repository.

  stage-go-package.py stage [--revision REV] --out DIR
  stage-go-package.py verify DIR
  stage-go-package.py --self-test

A Go module is fetched from the root of a repository at a tag. The package therefore lives in a
small repository of its own, qrcode-ai-com/qrcode-barcode-scanner-go, whose content is never
edited by hand: `stage` writes it from one commit of this repository.

`stage` reads `bindings/go` at REV (HEAD by default) from git, never from the working tree, and
writes into an empty DIR:

  - every file of the package, byte for byte, except README.md, whose links into this
    repository become absolute;
  - `bindings/go/mirror/` as `.github/workflows/`, the mirror's own checks;
  - the two fixtures the tests scan, under `testdata/fixtures/`, a directory the Go tools skip;
  - LICENSE, the engine's, which pkg.go.dev reads at the root;
  - `SOURCE.json`: the commit and the sha256 of every staged file.

`verify` stages the commit that DIR's `SOURCE.json` names and compares: same files, same bytes,
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
REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner"
PACKAGE = "bindings/go"
WORKFLOWS = "bindings/go/mirror"
SCHEMA = "qrscan-go-stage/1"
FIXTURES = ("fixtures/symbology/mixed-code128-qr.png", "fixtures/clean/gen_v5_q.png")
# The package README links into this repository; in its own repository those links are absolute.
README_LINKS = (("](../../distribution/README.md)", "]({repository}/blob/{revision}/distribution/README.md)"),
                ("](../../scripts/stage-go-package.py)",
                 "]({repository}/blob/{revision}/scripts/stage-go-package.py)"),
                ("](mirror/)", "](.github/workflows/)"),
                ("](../../LICENSE)", "](LICENSE)"))


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


def staged(revision, root=ROOT):
    """The whole tree of the mirror repository for REVISION, as {path: bytes}."""
    try:
        commit = git("rev-parse", "--verify", f"{revision}^{{commit}}", root=root).decode().strip()
    except subprocess.CalledProcessError as error:
        raise Refused(f"{revision} is not a commit of this repository") from error
    files = {}
    for path, data in tree(commit, PACKAGE, root).items():
        if path.startswith("mirror/"):
            continue
        files[path] = data
    for path, data in tree(commit, WORKFLOWS, root).items():
        files[f".github/workflows/{path}"] = data
    readme = files.get("README.md", b"").decode()
    for old, new in README_LINKS:
        if readme.count(old) != 1:
            raise Refused(f"README.md holds {readme.count(old)} times the link {old!r}, expected once")
        readme = readme.replace(old, new.format(repository=REPOSITORY, revision=commit))
    if "](../" in readme:
        raise Refused("README.md still links outside the package")
    files["README.md"] = readme.encode()
    for fixture in FIXTURES:
        files["testdata/" + fixture] = git("show", f"{commit}:{fixture}", root=root)
    files["LICENSE"] = git("show", f"{commit}:LICENSE", root=root)
    for required in ("go.mod", "qrscan.go", ".github/workflows/tests.yml"):
        if required not in files:
            raise Refused(f"{required} is missing at {commit}")
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
            record = json.loads((good / "SOURCE.json").read_text())
            if any(path.startswith("mirror/") for path in record["files"]):
                failures.append("the workflow sources were staged under mirror/")
            if (good / "README.md").read_text().count("](../"):
                failures.append("the staged README links outside the package")
            if (good / "LICENSE").read_bytes() != (ROOT / "LICENSE").read_bytes():
                failures.append("the staged LICENSE is not the engine's")
            for fixture in FIXTURES:
                if not (good / "testdata" / fixture).is_file():
                    failures.append(f"{fixture} is not staged")
            refused("a second stage into the same directory", lambda: stage("HEAD", good), "is not empty")

            def copy(name):
                target = box / name
                for path in good.rglob("*"):
                    if path.is_file():
                        (target / path.relative_to(good)).parent.mkdir(parents=True, exist_ok=True)
                        (target / path.relative_to(good)).write_bytes(path.read_bytes())
                return target

            edited = copy("edited")
            (edited / "qrscan.go").write_text((edited / "qrscan.go").read_text() + "\n// edited by hand\n")
            refused("a file edited by hand", lambda: verify(edited), "differs from the stage: qrscan.go")
            added = copy("added")
            (added / "extra.go").write_text("package qrscan\n")
            refused("a file added by hand", lambda: verify(added), "not from the stage: extra.go")
            removed = copy("removed")
            (removed / "LICENSE").unlink()
            refused("a missing file", lambda: verify(removed), "missing LICENSE")
            other = copy("other")
            changed = dict(record, engine=dict(record["engine"], repository="https://example.test/fork"))
            (other / "SOURCE.json").write_text(json.dumps(changed))
            refused("a record that names another repository", lambda: verify(other), "not a stage record")
            with_git = copy("with-git")
            (with_git / ".git").mkdir()
            (with_git / ".git" / "HEAD").write_text("ref: refs/heads/main\n")
            try:
                verify(with_git)
            except Refused as error:
                failures.append(f"a repository's own .git directory was counted: {error}")
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
    one = commands.add_parser("stage", help="write the mirror repository's tree from one commit")
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
        print(f"stage-go-package: {error}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        print(f"stage-go-package: git failed: {error.stderr.decode(errors='replace').strip()}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
