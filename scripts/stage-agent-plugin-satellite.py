#!/usr/bin/env python3
"""Stage the agent plugin bundle as the tree of its own repository.

  stage-agent-plugin-satellite.py stage [--revision REV] --out DIR
  stage-agent-plugin-satellite.py verify DIR
  stage-agent-plugin-satellite.py --self-test

Coding agents install a plugin from the root of a small repository: Claude Code, Codex, Cursor,
Copilot, Gemini CLI, Kiro, Antigravity, Kimi, Junie, Factory, Devin, goose, Pi and OpenCode clone
or download that root, and the engine repository is far too heavy to be it. The bundle therefore
lives in a repository of its own, qrcode-ai-com/qrcode-barcode-scanner-plugin, whose content is
never edited by hand: `stage` writes it from one commit of this repository.

`stage` reads REV (HEAD by default) from git, never from the working tree, and writes into an
empty DIR:

  - every file of `integrations/agent-plugin`, byte for byte, except its engine-side `test/`;
  - the skill `skills/qrcode-barcode-scanner`, byte for byte, at `skills/qrcode-barcode-scanner`
    (read by every client) and inside the Junie extension folder, which carries its own copy;
  - `assets/logo.svg`, the square mark of `docs/favicon.svg` with an explicit size and a
    transparent margin, which Antigravity and the OpenAI listing ask for;
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
REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust"
SATELLITE = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-plugin"
BUNDLE = "integrations/agent-plugin"
SKILL = "skills/qrcode-barcode-scanner"
SKILL_TARGETS = ("skills/qrcode-barcode-scanner", "junie/qrcode-barcode-scanner/skills/qrcode-barcode-scanner")
MARK = "docs/favicon.svg"
SCHEMA = "qrscan-agent-plugin-stage/1"
# The tests judge the staged tree from the engine; a client that installs the plugin never runs them.
ENGINE_ONLY = ("test/",)
# The favicon is a 48-unit square. The logo keeps it and adds a transparent margin of about a tenth.
MARK_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">'
LOGO_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="-2.4 -2.4 52.8 52.8">'
# One file per client format the bundle carries; a stage without one of them is not the bundle.
REQUIRED = ("plugin.json", "mcp.json", ".mcp.json", "mcp_config.json", ".claude-plugin/plugin.json",
            ".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json",
            ".antigravity-plugin/plugin.json", ".cursor-plugin/plugin.json", "gemini-extension.json",
            "kimi.plugin.json", ".junie-extension/marketplace.json",
            "junie/qrcode-barcode-scanner/extension.json", "junie/qrcode-barcode-scanner/mcp/.mcp.json",
            "goose/qrscan-extension.yaml", "rules/qrcode-barcode-scanner.mdc", "package.json",
            "opencode/plugin.mjs", "pi/extension.js", "README.md", "LICENSE",
            "skills/qrcode-barcode-scanner/SKILL.md", "assets/logo.svg")


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


def logo(mark):
    text = mark.decode()
    if not text.startswith(MARK_OPEN) or text.count("<svg") != 1:
        raise Refused(f"{MARK} no longer opens with {MARK_OPEN!r}: the logo cannot be derived from it")
    return (LOGO_OPEN + text[len(MARK_OPEN):]).encode()


def staged(revision, root=ROOT):
    """The whole tree of the plugin repository for REVISION, as {path: bytes}."""
    try:
        commit = git("rev-parse", "--verify", f"{revision}^{{commit}}", root=root).decode().strip()
    except subprocess.CalledProcessError as error:
        raise Refused(f"{revision} is not a commit of this repository") from error
    files = {path: data for path, data in tree(commit, BUNDLE, root).items() if not path.startswith(ENGINE_ONLY)}
    skill = tree(commit, SKILL, root)
    for target in SKILL_TARGETS:
        for path, data in skill.items():
            if f"{target}/{path}" in files:
                raise Refused(f"{BUNDLE}/{target}/{path} would hide the copied skill")
            files[f"{target}/{path}"] = data
    if "assets/logo.svg" in files:
        raise Refused(f"{BUNDLE}/assets/logo.svg would hide the logo derived from {MARK}")
    files["assets/logo.svg"] = logo(git("show", f"{commit}:{MARK}", root=root))
    readme = files.get("README.md", b"").decode()
    if "](../" in readme or 'href="../' in readme:
        raise Refused("README.md links outside the bundle: in its own repository that link is broken")
    if files.get("LICENSE") != git("show", f"{commit}:LICENSE", root=root):
        raise Refused(f"{BUNDLE}/LICENSE is not the engine's LICENSE")
    for required in REQUIRED:
        if required not in files:
            raise Refused(f"{required} is missing at {commit}")
    record = {"schema": SCHEMA, "engine": {"repository": REPOSITORY, "revision": commit}, "repository": SATELLITE,
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
            if any(path.startswith(ENGINE_ONLY) for path in record["files"]):
                failures.append("the engine-side tests were staged")
            for target in SKILL_TARGETS:
                for path in (ROOT / SKILL).rglob("*"):
                    if path.is_file():
                        copy = good / target / path.relative_to(ROOT / SKILL)
                        if not copy.is_file() or copy.read_bytes() != git("show", f"{revision}:{SKILL}/{path.relative_to(ROOT / SKILL).as_posix()}"):
                            failures.append(f"{target}/{path.relative_to(ROOT / SKILL)} is not the skill's file")
            if not (good / "assets/logo.svg").read_text().startswith(LOGO_OPEN):
                failures.append("the logo does not carry its size and margin")
            if (good / "LICENSE").read_bytes() != (ROOT / "LICENSE").read_bytes():
                failures.append("the staged LICENSE is not the engine's")
            refused("a second stage into the same directory", lambda: stage("HEAD", good), "is not empty")

            def copy(name):
                target = box / name
                for path in good.rglob("*"):
                    if path.is_file():
                        (target / path.relative_to(good)).parent.mkdir(parents=True, exist_ok=True)
                        (target / path.relative_to(good)).write_bytes(path.read_bytes())
                return target

            edited = copy("edited")
            (edited / "mcp.json").write_text((edited / "mcp.json").read_text().replace("@0.3.1", "@latest"))
            refused("a launcher edited by hand", lambda: verify(edited), "differs from the stage: mcp.json")
            skill = copy("skill")
            (skill / "skills/qrcode-barcode-scanner/SKILL.md").write_text("---\nname: other\n---\n")
            refused("a skill edited by hand", lambda: verify(skill),
                    "differs from the stage: skills/qrcode-barcode-scanner/SKILL.md")
            added = copy("added")
            (added / "hooks").mkdir()
            (added / "hooks/hooks.json").write_text("{}\n")
            refused("a file added by hand", lambda: verify(added), "not from the stage: hooks/hooks.json")
            removed = copy("removed")
            (removed / "gemini-extension.json").unlink()
            refused("a missing file", lambda: verify(removed), "missing gemini-extension.json")
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
        refused("a mark that changed its opening tag", lambda: logo(b'<svg viewBox="0 0 64 64"></svg>'),
                "cannot be derived")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (the stage of HEAD, 6 refused trees, "
          "1 refused revision, 1 refused mark)")
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("stage", help="write the plugin repository's tree from one commit")
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
        print(f"stage-agent-plugin-satellite: {error}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        print(f"stage-agent-plugin-satellite: git failed: {error.stderr.decode(errors='replace').strip()}",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
