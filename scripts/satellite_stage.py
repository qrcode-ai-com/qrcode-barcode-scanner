"""Write and check the tree of a satellite repository from one commit of this repository.

A satellite is a small public repository whose content is never edited by hand: a host reads a
file at its root (an action's `action.yml`, a plugin's `manifest.json`), so the integration is
served from there, while its source stays under `integrations/<host>/` here. A program built on
this module stages it:

  - every file of the integration at REV, read from git and never from the working tree, except
    its `mirror/` folder, which becomes `.github/workflows/` (the satellite's own checks);
  - the README, whose relative links become links to this repository at REV, or to the staged
    file when the target is staged too;
  - the extra files the satellite names (fixtures, license texts), byte for byte;
  - `SOURCE.json`: the schema, this repository and REV, and the sha256 of every staged file.

`verify` stages the commit SOURCE.json names again and compares: same files, same bytes, nothing
else beside `.git`. Stdlib only.
"""
import argparse
import hashlib
import json
import pathlib
import posixpath
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust"
LINK = re.compile(r"\]\(([^)\s]+)\)")


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


class Satellite:
    """One satellite: its integration folder, its record schema and what it adds or requires.

    extras: {staged path: engine path}; required: staged paths that must exist; check: a function
    (files, commit, root) that raises Refused when the staged tree breaks a rule of this host.
    """

    def __init__(self, name, schema, package, extras=None, required=(), check=None):
        self.name, self.schema, self.package = name, schema, package
        self.extras = dict(extras or {})
        self.required = tuple(required)
        self.check = check

    def readme(self, text, commit, staged):
        """Relative links become the staged file, or this repository's file at COMMIT."""
        def rewrite(match):
            target = match[1]
            if re.match(r"[a-z][a-z0-9+.-]*:", target) or target.startswith(("#", "/")):
                return match[0]
            path, _, anchor = target.partition("#")
            engine = posixpath.normpath(posixpath.join(self.package, path))
            if engine.startswith("../") or engine == "..":
                raise Refused(f"README.md links outside this repository: {target}")
            inside = engine[len(self.package) + 1:] if engine.startswith(self.package + "/") else None
            local = inside if inside in staged else next((s for s, e in self.extras.items() if e == engine), None)
            suffix = f"#{anchor}" if anchor else ""
            if local is not None:
                return f"]({local}{suffix})"
            return f"]({REPOSITORY}/blob/{commit}/{engine}{suffix})"
        return LINK.sub(rewrite, text)

    def staged(self, revision, root=ROOT):
        """The whole tree of the satellite for REVISION, as {path: bytes}."""
        try:
            commit = git("rev-parse", "--verify", f"{revision}^{{commit}}", root=root).decode().strip()
        except subprocess.CalledProcessError as error:
            raise Refused(f"{revision} is not a commit of this repository") from error
        files = {}
        for path, data in tree(commit, self.package, root).items():
            if path.startswith("mirror/"):
                files[".github/workflows/" + path[len("mirror/"):]] = data
            else:
                files[path] = data
        for staged_path, engine_path in self.extras.items():
            try:
                files[staged_path] = git("show", f"{commit}:{engine_path}", root=root)
            except subprocess.CalledProcessError as error:
                raise Refused(f"{engine_path} is missing at {commit}") from error
        if "README.md" in files:
            files["README.md"] = self.readme(files["README.md"].decode(), commit, files).encode()
        for required in self.required:
            if required not in files:
                raise Refused(f"{required} is missing at {commit}")
        if self.check:
            self.check(files, commit, root)
        record = {"schema": self.schema, "engine": {"repository": REPOSITORY, "revision": commit},
                  "files": {path: hashlib.sha256(data).hexdigest() for path, data in sorted(files.items())}}
        files["SOURCE.json"] = (json.dumps(record, indent=2) + "\n").encode()
        return files

    def stage(self, revision, out, root=ROOT):
        out = pathlib.Path(out)
        if out.exists() and any(out.iterdir()):
            raise Refused(f"{out} is not empty")
        files = self.staged(revision, root)
        for path, data in files.items():
            target = out / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        return json.loads(files["SOURCE.json"])["engine"]["revision"], len(files)

    def verify(self, directory, root=ROOT):
        directory = pathlib.Path(directory)
        try:
            record = json.loads((directory / "SOURCE.json").read_text(encoding="utf-8"))
            revision = record["engine"]["revision"]
            if record["schema"] != self.schema or record["engine"]["repository"] != REPOSITORY:
                raise ValueError("another schema or repository")
        except (OSError, ValueError, KeyError, TypeError) as error:
            raise Refused(f"SOURCE.json is not a stage record: {error}") from error
        expected = self.staged(revision, root)
        present = {path.relative_to(directory).as_posix(): path for path in directory.rglob("*")
                   if path.is_file() and ".git" not in path.relative_to(directory).parts[:1]}
        problems = [f"missing {path}" for path in sorted(set(expected) - set(present))]
        problems += [f"not from the stage: {path}" for path in sorted(set(present) - set(expected))]
        problems += [f"differs from the stage: {path}" for path in sorted(set(expected) & set(present))
                     if present[path].read_bytes() != expected[path]]
        if problems:
            raise Refused("; ".join(problems))
        return revision, len(expected)

    def self_test(self, edit_path, extra_checks=()):
        """Stage HEAD, verify it, then refuse an edited, an added and a missing file, a record of
        another repository and a revision that does not exist. EXTRA_CHECKS are (name, function of
        the good stage directory) pairs that return a failure message or None."""
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
            revision = None
            try:
                revision, count = self.stage("HEAD", box / "good")
                if self.verify(box / "good") != (revision, count):
                    failures.append("a fresh stage does not verify as itself")
            except Refused as error:
                failures.append(f"the stage of HEAD was refused: {error}")
            if revision:
                good = box / "good"
                record = json.loads((good / "SOURCE.json").read_text())
                if any(path.startswith("mirror/") for path in record["files"]):
                    failures.append("the workflow sources were staged under mirror/")
                readme = (good / "README.md").read_text()
                if "](../" in readme:
                    failures.append("the staged README links outside the repository")
                for name, check in extra_checks:
                    message = check(good)
                    if message:
                        failures.append(f"{name}: {message}")
                refused("a second stage into the same directory", lambda: self.stage("HEAD", good), "is not empty")

                def copy(name):
                    target = box / name
                    for path in good.rglob("*"):
                        if path.is_file():
                            (target / path.relative_to(good)).parent.mkdir(parents=True, exist_ok=True)
                            (target / path.relative_to(good)).write_bytes(path.read_bytes())
                    return target

                edited = copy("edited")
                (edited / edit_path).write_bytes((edited / edit_path).read_bytes() + b"\n// edited by hand\n")
                refused("a file edited by hand", lambda: self.verify(edited), f"differs from the stage: {edit_path}")
                added = copy("added")
                (added / "extra.txt").write_text("added by hand\n")
                refused("a file added by hand", lambda: self.verify(added), "not from the stage: extra.txt")
                removed = copy("removed")
                (removed / "LICENSE").unlink()
                refused("a missing file", lambda: self.verify(removed), "missing LICENSE")
                other = copy("other")
                changed = dict(record, engine=dict(record["engine"], repository="https://example.test/fork"))
                (other / "SOURCE.json").write_text(json.dumps(changed))
                refused("a record that names another repository", lambda: self.verify(other), "not a stage record")
                with_git = copy("with-git")
                (with_git / ".git").mkdir()
                (with_git / ".git" / "HEAD").write_text("ref: refs/heads/main\n")
                try:
                    self.verify(with_git)
                except Refused as error:
                    failures.append(f"a repository's own .git directory was counted: {error}")
            refused("a revision that does not exist",
                    lambda: self.stage("0000000000000000000000000000000000000000", box / "none"), "is not a commit")
        for failure in failures:
            print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
        print(f"self-test: {'FAILED' if failures else 'ok'} (the stage of HEAD, {len(extra_checks)} host checks, "
              "5 refused trees, 1 refused revision)")
        return 1 if failures else 0

    def main(self, doc, edit_path, extra_checks=()):
        parser = argparse.ArgumentParser(description=doc.split("\n\n")[0])
        parser.add_argument("--self-test", action="store_true")
        commands = parser.add_subparsers(dest="command")
        one = commands.add_parser("stage", help="write the satellite repository's tree from one commit")
        one.add_argument("--revision", default="HEAD")
        one.add_argument("--out", required=True)
        two = commands.add_parser("verify", help="check that a tree is exactly the stage of the commit it names")
        two.add_argument("directory")
        args = parser.parse_args()
        if args.self_test:
            return self.self_test(edit_path, extra_checks)
        try:
            if args.command == "stage":
                revision, count = self.stage(args.revision, args.out)
                print(f"staged {count} files from {revision} into {args.out}")
            elif args.command == "verify":
                revision, count = self.verify(args.directory)
                print(f"ok    {count} files equal the stage of {revision}")
            else:
                parser.print_usage(sys.stderr)
                return 2
        except Refused as error:
            print(f"{self.name}: {error}", file=sys.stderr)
            return 1
        except subprocess.CalledProcessError as error:
            print(f"{self.name}: git failed: {error.stderr.decode(errors='replace').strip()}", file=sys.stderr)
            return 1
        return 0
