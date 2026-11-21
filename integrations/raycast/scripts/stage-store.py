#!/usr/bin/env python3
"""Stage the Raycast extension as the folder raycast/extensions receives, and copy it into a fork.

  integrations/raycast/scripts/stage-store.py stage --out DIR [--revision REV] [--author HANDLE] [--metadata DIR]
      [--archive FILE]
  integrations/raycast/scripts/stage-store.py fork --clone PATH --author HANDLE [--branch NAME] [--revision REV]
      [--metadata DIR] [--update]
  integrations/raycast/scripts/stage-store.py check DIR
  integrations/raycast/scripts/stage-store.py validate-log LOG
  integrations/raycast/scripts/stage-store.py --self-test

The Raycast Store publishes an extension once a pull request adds its folder under `extensions/`
of github.com/raycast/extensions and Raycast's reviewers merge it. The source stays in
`integrations/raycast/` here; `stage` writes the folder that pull request carries, from one commit
of this repository, read from git and never from the working tree:

  - the files the extension builds and runs from, by an explicit list; any other file of the
    folder must be listed as engine-only, so a new file is a decision and not a silent upload;
  - `STORE.md` as the folder's `README.md`: the setup page Raycast shows in the Store and under
    "About This Extension". The engine `README.md`, `LISTING.md` and the tests stay here;
  - `package.json` with the Raycast username of the account that submits it as `author` (the
    Store requires one; the default is the value committed here) and without the `test` script,
    whose files are not shipped;
  - `metadata/`, the Store screenshots, from the commit or from `--metadata DIR`.

Before writing, the stage checks the rules of Raycast's "Prepare an extension for the Store" page
that the files show: MIT, the platforms field, an exact pin of the latest-API dependency and no
other, no engine package (the extension runs the installed qrscan as a separate program), the
description length, title case, categories, a 512 x 512 PNG icon, the CHANGELOG heading format,
a package-lock.json that matches, at most six 2000 x 1250 PNG screenshots, and a README with no
link outside the folder. Raycast's own checks (`ray validate`, `ray build` and its screenshot
validator) run in the workflow integration-raycast on the staged folder.

`--archive FILE` also writes the folder as a tar.gz whose bytes depend only on the commit: sorted
entries, the commit time as every date, no owner names. Its sha256 identifies what was reviewed.

`validate-log` judges the output of `ray validate`, the first check Raycast's CI runs on a pull
request. It looks the `author` up in Raycast's user directory, so until the owner's account exists
and its username is the author, that one error is expected: the log passes when every stage is
ready, or when the only error is that unknown author, which it names.

`fork` writes the same folder into `extensions/<name>/` of a local clone of the owner's fork of
raycast/extensions, on a new branch from the clone's current commit, and commits it with the
clone's own identity and no trailer: Raycast's rules apply in their tree. It never pushes.

Exit 0 when the step passes, 1 when it fails, 2 for usage. Stdlib only.
"""
import argparse
import gzip
import hashlib
import io
import json
import pathlib
import re
import struct
import subprocess
import sys
import tarfile
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[3]
PACKAGE = "integrations/raycast"
SCHEMA_URL = "https://www.raycast.com/schemas/extension.json"
# Shipped as they are, plus everything under these folders.
SHIPPED_FILES = ("package.json", "package-lock.json", "tsconfig.json", "eslint.config.js", ".prettierrc",
                 ".gitignore", "CHANGELOG.md", "LICENSE")
SHIPPED_FOLDERS = ("src/", "assets/", "metadata/", "media/")
# Kept in this repository only.
ENGINE_ONLY_FILES = ("README.md", "LISTING.md", "STORE.md")
ENGINE_ONLY_FOLDERS = ("test/", "scripts/")
CATEGORIES = {"Applications", "Communication", "Data", "Documentation", "Design Tools", "Developer Tools",
              "Finance", "Fun", "Media", "News", "Productivity", "Security", "System", "Web", "Other"}
# Lower-case words Apple's style keeps in a title.
MINOR_WORDS = {"a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "to", "with"}
EXACT_VERSION = re.compile(r"^\d+\.\d+\.\d+$")
USERNAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,38}$")
CHANGELOG_ENTRY = re.compile(r"^## \[[^\]\n]+\] - (\{PR_MERGE_DATE\}|\d{4}-\d{2}-\d{2})$")
ENGINE_PACKAGES = re.compile(r"^@qrcode-ai-com/|^qrcode-barcode-scanner")
SCREENSHOT_SIZE = (2000, 1250)
MAX_SCREENSHOTS = 6


class Refused(Exception):
    """The stage cannot be written, or a staged folder breaks a Store rule."""


def git(*arguments, root=ROOT):
    return subprocess.run(["git", "-C", str(root), *arguments], capture_output=True, check=True).stdout


def png_size(data):
    """(width, height) of PNG bytes, or None when they are not a PNG."""
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", data[16:24])


def title_case(text):
    words = text.split()
    for index, word in enumerate(words):
        if not word[0].isalpha():
            continue
        if index and word.lower() in MINOR_WORDS:
            continue
        if word[0].islower() and word not in ("macOS", "iOS", "npm", "qrscan"):
            return False
    return True


def classify(path):
    if path in SHIPPED_FILES or path.startswith(SHIPPED_FOLDERS):
        return "shipped"
    if path in ENGINE_ONLY_FILES or path.startswith(ENGINE_ONLY_FOLDERS):
        return "engine"
    raise Refused(f"{PACKAGE}/{path} is neither shipped nor engine-only: list it in {pathlib.Path(__file__).name}")


def check(files):
    """Raise Refused with every Store rule the staged files break."""
    problems = []
    try:
        manifest = json.loads(files["package.json"])
    except (KeyError, ValueError) as error:
        raise Refused(f"package.json is missing or not JSON: {error}") from error
    if manifest.get("$schema") != SCHEMA_URL:
        problems.append(f"package.json $schema must be {SCHEMA_URL}")
    if manifest.get("license") != "MIT":
        problems.append("package.json license must be MIT")
    author = manifest.get("author")
    if not isinstance(author, str) or not USERNAME.match(author):
        problems.append(f"package.json author {author!r} is not a Raycast username")
    if "owner" in manifest:
        problems.append("package.json owner: Raycast restricts organisation extensions; publish under the author")
    if manifest.get("platforms") != ["macOS"]:
        problems.append("package.json platforms must be [\"macOS\"]: the extension reads the Finder selection")
    dependencies = manifest.get("dependencies", {})
    if set(dependencies) != {"@raycast/api"}:
        problems.append(f"dependencies must be @raycast/api alone, not {sorted(dependencies)}")
    for name, version in {**dependencies, **manifest.get("devDependencies", {})}.items():
        if not EXACT_VERSION.match(str(version)):
            problems.append(f"{name} is not pinned to an exact version: {version}")
        if ENGINE_PACKAGES.match(name):
            problems.append(f"{name}: the extension runs the installed qrscan and bundles no engine package")
    description = manifest.get("description", "")
    if not 50 <= len(description) <= 155 or not description.endswith("."):
        problems.append(f"description must be one sentence of 50 to 155 characters ending with a period ({len(description)})")
    if not title_case(manifest.get("title", "")):
        problems.append(f"title {manifest.get('title')!r} is not in title case")
    categories = manifest.get("categories", [])
    if not categories or not set(categories) <= CATEGORIES:
        problems.append(f"categories must be one or more of Raycast's list: {categories}")
    commands = manifest.get("commands", [])
    if not commands:
        problems.append("package.json has no command")
    for command in commands:
        if not title_case(command.get("title", "")):
            problems.append(f"command title {command.get('title')!r} is not in title case")
        if command.get("subtitle") and command["subtitle"] == manifest.get("title"):
            problems.append(f"command {command.get('name')}: a subtitle that repeats the extension title adds no context")
        if not command.get("description"):
            problems.append(f"command {command.get('name')} has no description")
    if "test" in manifest.get("scripts", {}):
        problems.append("the test script names files that are not shipped")
    icon = files.get(f"assets/{manifest.get('icon', '')}")
    if icon is None:
        problems.append(f"the icon assets/{manifest.get('icon')} is missing")
    elif png_size(icon) != (512, 512):
        problems.append(f"the icon must be a 512 x 512 PNG, not {png_size(icon)}")
    try:
        lock = json.loads(files["package-lock.json"])
        root = lock["packages"][""]
        if lock.get("lockfileVersion") != 3 or root.get("name") != manifest.get("name"):
            problems.append("package-lock.json is not the npm lockfile of this package")
        for field in ("dependencies", "devDependencies"):
            if root.get(field, {}) != manifest.get(field, {}):
                problems.append(f"package-lock.json {field} differ from package.json: run npm install")
    except (KeyError, ValueError, TypeError) as error:
        problems.append(f"package-lock.json is missing or unreadable: {error}")
    changelog = files.get("CHANGELOG.md", b"").decode()
    entries = [line for line in changelog.splitlines() if line.startswith("## ")]
    if not entries or not all(CHANGELOG_ENTRY.match(line) for line in entries):
        problems.append("CHANGELOG.md entries must read `## [Title] - {PR_MERGE_DATE}` or a YYYY-MM-DD date")
    screenshots = sorted(path for path in files if path.startswith("metadata/"))
    if len(screenshots) > MAX_SCREENSHOTS:
        problems.append(f"metadata/ holds {len(screenshots)} screenshots; the Store takes at most {MAX_SCREENSHOTS}")
    for path in screenshots:
        if png_size(files[path]) != SCREENSHOT_SIZE:
            problems.append(f"{path} must be a 2000 x 1250 PNG, not {png_size(files[path])}")
    readme = files.get("README.md", b"").decode()
    if not readme.startswith("# "):
        problems.append("README.md must start with the extension's title")
    if "qrcode-ai-readme-actions" in readme or "<picture" in readme:
        problems.append("README.md is the engine README; the Store README is STORE.md")
    for target in re.findall(r"\]\(([^)\s]+)\)", readme):
        if re.match(r"[a-z][a-z0-9+.-]*:", target) or target.startswith("#"):
            continue
        if target.split("#")[0] not in files or not target.startswith("media/"):
            problems.append(f"README.md links {target}: a local file must be in media/ and shipped")
    if any(path.startswith(("test/", "node_modules/")) for path in files):
        problems.append("tests and node_modules are not shipped")
    if problems:
        raise Refused("; ".join(problems))


def staged(revision="HEAD", author=None, metadata=None, root=ROOT):
    """(commit, commit time, {path: bytes}) of the store folder for REVISION."""
    try:
        commit = git("rev-parse", "--verify", f"{revision}^{{commit}}", root=root).decode().strip()
    except subprocess.CalledProcessError as error:
        raise Refused(f"{revision} is not a commit of this repository") from error
    when = int(git("show", "-s", "--format=%ct", commit, root=root).decode().strip())
    files = {}
    listing = git("ls-tree", "-r", "-z", commit, "--", PACKAGE, root=root).decode()
    for entry in filter(None, listing.split("\0")):
        meta, path = entry.split("\t", 1)
        mode, kind, _ = meta.split(" ")
        relative = path[len(PACKAGE) + 1:]
        if kind != "blob" or mode != "100644":
            raise Refused(f"{path} is not a plain file (mode {mode})")
        if classify(relative) == "shipped":
            files[relative] = git("show", f"{commit}:{path}", root=root)
    if not files:
        raise Refused(f"{PACKAGE} holds no file at {commit}")
    try:
        files["README.md"] = git("show", f"{commit}:{PACKAGE}/STORE.md", root=root)
    except subprocess.CalledProcessError as error:
        raise Refused(f"{PACKAGE}/STORE.md is missing at {commit}") from error
    manifest = json.loads(files["package.json"])
    if author is not None:
        manifest["author"] = author
    manifest.get("scripts", {}).pop("test", None)
    files["package.json"] = (json.dumps(manifest, indent=2, ensure_ascii=False) + "\n").encode()
    if metadata is not None:
        files = {path: data for path, data in files.items() if not path.startswith("metadata/")}
        for image in sorted(pathlib.Path(metadata).iterdir()):
            if image.is_file() and not image.name.startswith("."):
                files[f"metadata/{image.name}"] = image.read_bytes()
    check(files)
    return commit, when, files


def digest(files):
    """One sha256 for the whole folder: each path with the sha256 of its bytes, sorted."""
    lines = "".join(f"{path}\0{hashlib.sha256(data).hexdigest()}\n" for path, data in sorted(files.items()))
    return hashlib.sha256(lines.encode()).hexdigest()


def archive(files, name, when):
    """The folder as tar.gz bytes that depend only on FILES, NAME and WHEN."""
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w", format=tarfile.PAX_FORMAT) as tar:
        folders = sorted({str(pathlib.PurePosixPath(path).parent) for path in files} - {"."})
        for folder in [""] + folders:
            info = tarfile.TarInfo(f"{name}/{folder}".rstrip("/"))
            info.type, info.mode, info.mtime = tarfile.DIRTYPE, 0o755, when
            tar.addfile(info)
        for path, data in sorted(files.items()):
            info = tarfile.TarInfo(f"{name}/{path}")
            info.size, info.mode, info.mtime = len(data), 0o644, when
            tar.addfile(info, io.BytesIO(data))
    out = io.BytesIO()
    with gzip.GzipFile(fileobj=out, mode="wb", mtime=when, filename="") as compressed:
        compressed.write(buffer.getvalue())
    return out.getvalue()


def write(files, out):
    out = pathlib.Path(out)
    if out.exists() and any(out.iterdir()):
        raise Refused(f"{out} is not empty")
    for path, data in files.items():
        target = out / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)


def read_folder(directory):
    directory = pathlib.Path(directory)
    return {path.relative_to(directory).as_posix(): path.read_bytes() for path in sorted(directory.rglob("*"))
            if path.is_file() and not set(path.relative_to(directory).parts) & {"node_modules", ".git"}}


def is_raycast_clone(clone):
    """True when CLONE is a clone of raycast/extensions or of a fork of it."""
    clone = pathlib.Path(clone)
    if not (clone / ".github" / "extensionName2Folder.json").is_file() or not (clone / "extensions").is_dir():
        return False
    try:
        remotes = git("remote", "-v", root=clone).decode()
    except subprocess.CalledProcessError:
        return False
    return bool(re.search(r"github\.com[:/][^/\s]+/extensions(\.git)?\s", remotes))


def fork(clone, author, branch, revision="HEAD", metadata=None, update=False, root=ROOT):
    clone = pathlib.Path(clone).resolve()
    if not is_raycast_clone(clone):
        raise Refused(f"{clone} is not a clone of raycast/extensions or of a fork of it")
    if git("status", "--porcelain", root=clone).decode().strip():
        raise Refused(f"{clone} has uncommitted changes: commit or set them aside first")
    commit, _, files = staged(revision, author, metadata, root)
    name = json.loads(files["package.json"])["name"]
    target = clone / "extensions" / name
    if target.exists() and not update:
        raise Refused(f"extensions/{name} already exists in the clone: the name is taken, or pass --update")
    if subprocess.run(["git", "-C", str(clone), "rev-parse", "--verify", "--quiet", f"refs/heads/{branch}"],
                      capture_output=True).returncode == 0:
        raise Refused(f"the branch {branch} already exists in the clone")
    base = git("rev-parse", "HEAD", root=clone).decode().strip()
    git("switch", "-q", "-c", branch, root=clone)
    if target.exists():
        # Only the folder's tracked files go, through git, so the previous version stays in history.
        git("rm", "-r", "-q", "--", f"extensions/{name}", root=clone)
    for path, data in files.items():
        (target / path).parent.mkdir(parents=True, exist_ok=True)
        (target / path).write_bytes(data)
    git("add", "--", f"extensions/{name}", root=clone)
    verb = "Update" if update else "Add"
    git("commit", "-q", "-m", f"{verb} {name} extension", root=clone)
    head = git("rev-parse", "HEAD", root=clone).decode().strip()
    return name, commit, base, head, len(files)


ANSI = re.compile(r"\x1b\[[0-9;]*m")
STAGE = re.compile(r"^\S*?(ready|error|warn)\s+- (.+)$")
FINDING = re.compile(r"^\s+\d+:\d+\s+(error|warning)\s+(.+)$")
# The stages a Store validation must report, by the start of their name (Prettier's carries its
# version). A log that lacks one did not validate the extension.
REQUIRED_STAGES = ("validate package.json file", "validate package-lock.json", "validate other lock files",
                   "validate extension icons", "run ESLint", "run Prettier")


def judge_validate(text):
    """(passed, note) for the output of `ray validate`."""
    lines = [ANSI.sub("", line).strip("\r") for line in text.splitlines()]
    stages = {}
    for line in lines:
        match = STAGE.match(line.strip())
        if match:
            stages[match[2]] = match[1]
    findings = [FINDING.match(line) for line in lines]
    errors = [match[2] for match in findings if match and match[1] == "error"]
    if not stages:
        return False, "the log holds no validation stage: ray validate did not run"
    missing = [name for name in REQUIRED_STAGES if not any(stage.startswith(name) for stage in stages)]
    if missing:
        return False, f"the log lacks the stages {missing}"
    failed = sorted(name for name, state in stages.items() if state == "error")
    if not failed and not errors:
        return True, f"all {len(stages)} stages ready"
    unknown_author = [error for error in errors if re.match(r'Invalid author "[^"]+"\. error: 404 - Not found', error)]
    if failed == ["validate package.json file"] and errors and errors == unknown_author and len(errors) == 1:
        return True, (f"every stage is ready but the author: {errors[0]} This is the owner's step: the "
                      "Raycast username of the submitting account goes in package.json author.")
    return False, f"failed stages {failed}; errors {errors}"


def self_test():
    failures = []

    def refused(label, action, needle):
        try:
            action()
        except Refused as error:
            if needle not in str(error):
                failures.append(f"{label}: refused with {error!s}, expected {needle!r}")
        else:
            failures.append(f"{label}: accepted")

    commit, when, files = staged("HEAD")
    if "README.md" not in files or files["README.md"] != git("show", f"{commit}:{PACKAGE}/STORE.md"):
        failures.append("the Store README is not STORE.md")
    if any(path.startswith("test/") or path in ("LISTING.md", "STORE.md") for path in files):
        failures.append("an engine-only file was staged")
    if "test" in json.loads(files["package.json"]).get("scripts", {}):
        failures.append("the test script was kept")
    if archive(files, "x", when) != archive(dict(reversed(list(files.items()))), "x", when):
        failures.append("the archive depends on the order of the files")
    if json.loads(staged("HEAD", author="someone")[2]["package.json"])["author"] != "someone":
        failures.append("--author did not set the author")

    def broken(change):
        def run():
            copy = dict(files)
            change(copy)
            check(copy)
        return run

    def manifest_with(**fields):
        def change(copy):
            manifest = json.loads(copy["package.json"])
            for key, value in fields.items():
                if value is None:
                    manifest.pop(key, None)
                else:
                    manifest[key] = value
            copy["package.json"] = json.dumps(manifest).encode()
        return change

    refused("an organisation owner", broken(manifest_with(owner="qrcode-ai")), "owner")
    refused("an AGPL engine dependency",
            broken(manifest_with(dependencies={"@raycast/api": "2.13.1", "@qrcode-ai-com/qrcode-barcode-scanner-wasm": "0.11.0"})),
            "bundles no engine package")
    refused("a range instead of a pin", broken(manifest_with(dependencies={"@raycast/api": "^2.13.1"})), "exact version")
    refused("an e-mail as author", broken(manifest_with(author="someone@example.com")), "not a Raycast username")
    refused("a short description", broken(manifest_with(description="Scan codes.")), "50 to 155")
    refused("another license", broken(manifest_with(license="AGPL-3.0-or-later")), "license must be MIT")
    refused("a lower-case title", broken(manifest_with(title="qr code scanner")), "title case")
    refused("an unknown category", broken(manifest_with(categories=["Scanners"])), "categories")
    refused("an icon of the wrong size",
            broken(lambda copy: copy.__setitem__("assets/icon.png", b"\x89PNG\r\n\x1a\n" + b"\0\0\0\rIHDR" + struct.pack(">II", 256, 256))),
            "512 x 512")
    screenshot = b"\x89PNG\r\n\x1a\n" + b"\0\0\0\rIHDR" + struct.pack(">II", *SCREENSHOT_SIZE)
    refused("seven screenshots",
            broken(lambda copy: copy.update({f"metadata/shot-{n}.png": screenshot for n in range(7)})), "at most 6")
    refused("a screenshot of the wrong size",
            broken(lambda copy: copy.__setitem__("metadata/shot.png", screenshot[:16] + struct.pack(">II", 1920, 1080))),
            "2000 x 1250")
    refused("the engine README", broken(lambda copy: copy.__setitem__(
        "README.md", b"# T\n\n<!-- qrcode-ai-readme-actions:v2 -->\n")), "the Store README is STORE.md")
    refused("a README link outside the folder", broken(lambda copy: copy.__setitem__(
        "README.md", b"# T\n\nSee [the node](../n8n/README.md).\n")), "must be in media/")
    refused("a changelog without the merge date", broken(lambda copy: copy.__setitem__(
        "CHANGELOG.md", b"# C\n\n## Initial Version\n")), "CHANGELOG.md entries")
    refused("a lockfile that does not match", broken(lambda copy: copy.__setitem__(
        "package-lock.json", json.dumps({"lockfileVersion": 3, "packages": {"": {"name": "other"}}}).encode())),
            "package-lock.json")
    refused("an unclassified file", lambda: classify("notes.txt"), "neither shipped nor engine-only")
    ready = "".join(f"\U0001f550\x1b[34mwait\x1b[39m  - {name}\n\u2705\x1b[32mready\x1b[39m  - {name}\n"
                    for name in ("validate package-lock.json", "validate other lock files",
                                 "validate extension icons", "run ESLint", "run Prettier 3.10.1"))
    author_error = ("\U0001f4a5\x1b[31merror\x1b[39m  - validate package.json file\n/x/package.json\n"
                    '  7:12  error  Invalid author "qrcode-ai-com". error: 404 - Not found (https://www.raycast.com/api/v1/users/qrcode-ai-com)\n')
    for label, log, want in (
            ("a clean validation", "\u2705\x1b[32mready\x1b[39m  - validate package.json file\n" + ready, True),
            ("the unknown author alone", author_error + ready, True),
            ("the author and a schema error", author_error.replace("\n/x", "\n  3:1  error  must have required property 'title'\n/x") + ready, False),
            ("the author and a failed lint", author_error + ready.replace("ready\x1b[39m  - run ESLint", "error\x1b[39m  - run ESLint"), False),
            ("an author lookup that did not answer", author_error.replace("404 - Not found", "503 - Unavailable") + ready, False),
            ("a log without ESLint", author_error + ready.replace("run ESLint", "run nothing"), False),
            ("a log with no stage", "Error: npm ci failed\n", False)):
        if judge_validate(log)[0] is not want:
            failures.append(f"validate-log, {label}: judged {judge_validate(log)}")
    refused("a revision that does not exist", lambda: staged("0" * 40), "is not a commit")

    with tempfile.TemporaryDirectory() as temporary:
        box = pathlib.Path(temporary)
        write(files, box / "good")
        if read_folder(box / "good") != files:
            failures.append("the written folder differs from the stage")
        refused("a second stage into the same folder", lambda: write(files, box / "good"), "is not empty")
        shots = box / "shots"
        shots.mkdir()
        (shots / "scan.png").write_bytes(screenshot)
        if "metadata/scan.png" not in staged("HEAD", metadata=shots)[2]:
            failures.append("--metadata did not add the screenshots")
        # A stand-in for a clone of the owner's fork: the two markers fork() looks for, one remote.
        clone = box / "extensions-fork"
        (clone / ".github").mkdir(parents=True)
        (clone / "extensions").mkdir()
        (clone / ".github" / "extensionName2Folder.json").write_text("{}\n")
        (clone / "extensions" / ".keep").write_text("")
        identity = ["-c", "user.name=self-test", "-c", "user.email=self-test@example.com"]
        subprocess.run(["git", "init", "-q", "-b", "main", str(clone)], check=True)
        subprocess.run(["git", "-C", str(clone), "remote", "add", "origin", "https://github.com/example/extensions.git"],
                       check=True)
        subprocess.run(["git", "-C", str(clone), "add", "-A"], check=True)
        subprocess.run(["git", "-C", str(clone), *identity, "commit", "-q", "-m", "base"], check=True)
        environment_identity = {"GIT_AUTHOR_NAME": "self-test", "GIT_AUTHOR_EMAIL": "self-test@example.com",
                                "GIT_COMMITTER_NAME": "self-test", "GIT_COMMITTER_EMAIL": "self-test@example.com"}
        import os
        saved = {key: os.environ.get(key) for key in environment_identity}
        os.environ.update(environment_identity)
        try:
            name, _, base, head, count = fork(clone, "someone", "ext/test")
            staged_folder = read_folder(clone / "extensions" / name)
            if staged_folder != staged("HEAD", author="someone")[2] or count != len(staged_folder):
                failures.append("the fork folder differs from the stage")
            message = git("log", "-1", "--format=%B", root=clone).decode()
            if message.strip() != f"Add {name} extension" or "Co-Authored-By" in message:
                failures.append(f"the fork commit message is {message!r}")
            if git("rev-parse", "HEAD~1", root=clone).decode().strip() != base or base == head:
                failures.append("the fork commit is not one commit on the clone's HEAD")
            refused("a branch that exists", lambda: fork(clone, "someone", "ext/test", update=True), "already exists")
            refused("a name already taken", lambda: fork(clone, "someone", "ext/other"), "the name is taken")
            (clone / "stray.txt").write_text("not committed\n")
            refused("a dirty clone", lambda: fork(clone, "someone", "ext/dirty"), "uncommitted changes")
            (clone / "stray.txt").unlink()
            refused("a folder that is not a raycast clone", lambda: fork(box / "good", "someone", "ext/x"),
                    "is not a clone of raycast/extensions")
        finally:
            for key, value in saved.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (the stage of HEAD, 17 refused stages, 7 validation "
          "logs, the fork commit and 4 refused forks)")
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("stage", help="write the folder raycast/extensions receives")
    one.add_argument("--out", required=True)
    two = commands.add_parser("fork", help="commit the folder into a clone of the owner's fork, without pushing")
    two.add_argument("--clone", required=True)
    two.add_argument("--author", required=True, help="the Raycast username of the account that submits")
    two.add_argument("--branch", default="ext/qrcode-barcode-scanner")
    two.add_argument("--update", action="store_true", help="replace a folder that is already in the clone")
    for sub in (one, two):
        sub.add_argument("--revision", default="HEAD")
        sub.add_argument("--metadata", help="a folder of Store screenshots that replaces metadata/")
    one.add_argument("--author", help="the Raycast username of the account that submits")
    one.add_argument("--archive", help="also write the folder as a reproducible tar.gz")
    three = commands.add_parser("check", help="check a staged folder against the Store rules")
    three.add_argument("directory")
    four = commands.add_parser("validate-log", help="judge the output of ray validate")
    four.add_argument("log")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    try:
        if args.command == "stage":
            commit, when, files = staged(args.revision, args.author, args.metadata)
            write(files, args.out)
            print(f"staged {len(files)} files from {commit} into {args.out}")
            print(f"tree sha256 {digest(files)}")
            if args.archive:
                name = json.loads(files["package.json"])["name"]
                data = archive(files, name, when)
                pathlib.Path(args.archive).write_bytes(data)
                print(f"archive {args.archive} sha256 {hashlib.sha256(data).hexdigest()}")
        elif args.command == "fork":
            name, commit, base, head, count = fork(args.clone, args.author, args.branch, args.revision,
                                                   args.metadata, args.update)
            print(f"committed extensions/{name} ({count} files from {commit}) as {head} on {args.branch}, "
                  f"based on {base}. Nothing was pushed.")
        elif args.command == "check":
            check(read_folder(args.directory))
            print(f"ok    {args.directory} follows the Store rules this program checks")
        elif args.command == "validate-log":
            passed, note = judge_validate(pathlib.Path(args.log).read_text(encoding="utf-8", errors="replace"))
            print(("ok    " if passed else "FAIL  ") + note)
            return 0 if passed else 1
        else:
            parser.print_usage(sys.stderr)
            return 2
    except Refused as error:
        print(f"raycast store: {error}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        print(f"raycast store: git failed: {error.stderr.decode(errors='replace').strip()}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
