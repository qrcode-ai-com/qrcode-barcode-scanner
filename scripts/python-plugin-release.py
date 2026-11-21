#!/usr/bin/env python3
"""Release gates of the Python plugin packages published from this repository to PyPI.

  python-plugin-release.py gate --ref REF --folder FOLDER [--dry-run]
  python-plugin-release.py build --folder FOLDER --out DIR
  python-plugin-release.py inspect DIR --folder FOLDER --sha256 HEX
  python-plugin-release.py pypi-live DIR --folder FOLDER
  python-plugin-release.py --self-test

A plugin package is a Python project under integrations/ that installs the published engine wheel
`qrcode-barcode-scanner` and is not the engine itself: the napari plugin today. PLUGINS names each
one: its folder, its PyPI project, its tag family and what its distributions must state. The
workflow python-plugins-publish.yml runs these steps, and scripts/check-publish-guards.py holds its
publishing jobs to them (PYPI_PLUGINS there).

`gate` reads the folder's pyproject.toml: the project name is the one PLUGINS states, the version
is X.Y.Z and equals the package's own `__version__`, the engine is pinned exactly once
(`qrcode-barcode-scanner==X.Y.Z`) and the listing classifier is present. A tag REF must be exactly
`refs/tags/<tag family><version>`. Any other REF fails, unless --dry-run (a dispatch that builds
and judges without publishing).

`build` builds the sdist and the wheel with `python -m build` (SOURCE_DATE_EPOCH from the commit,
TZ=UTC: each build of a commit puts the same entries with the same dates in its wheel, though the
compressed bytes follow the zlib that wrote them, and the sdist's archive dates change with each
build; so the publishing job uploads the files this build recorded, never a rebuild), then
inspects them and prints `sha256  name` for each. Under GitHub Actions it writes the outputs
`sha256` (the SHA-256 of that listing), `files` and `engine` (the engine version the plugin pins).

`inspect` holds a folder of distributions to the release set: exactly the sdist and the wheel of
this version, regular files, whose metadata names the project, the version, the engine pin and the
classifier, and whose listing has the SHA-256 the build job recorded. A swapped or added file fails.

`pypi-live` reads PyPI's public JSON for the project at this version, with no credential. A 404
means nothing is live. Otherwise every file PyPI serves there must be in DIR with the same SHA-256,
and PyPI may serve no other: the upload's skip-existing would otherwise skip a file by name alone.

Stdlib only, Python >= 3.11. Exit 0 pass, 1 fail, 2 usage or a missing input.
"""
import argparse
import email.parser
import hashlib
import io
import json
import os
import pathlib
import re
import subprocess
import sys
import tarfile
import tempfile
import tomllib
import urllib.error
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENGINE = "qrcode-barcode-scanner"
PYPI_JSON = "https://pypi.org/pypi/{project}/{version}/json"
VERSION = re.compile(r"\d+\.\d+\.\d+")
PIN = re.compile(rf"^{re.escape(ENGINE)}==(\d+\.\d+\.\d+)$")

# One row per plugin package. `version_file` holds the package's own `__version__`; `classifier`
# is the one its listing reads; `entry_point` is a group its wheel must declare.
PLUGINS = {
    "integrations/napari": {
        "project": "napari-qrcode-barcode-scanner",
        "tag": "napari-v",
        "version_file": "src/napari_qrcode_barcode_scanner/__init__.py",
        "classifier": "Framework :: napari",
        "entry_point": "napari.manifest",
    },
}


class Refused(Exception):
    """The input is not the release this step accepts; the message says why."""


def plugin(folder):
    key = pathlib.PurePosixPath(folder).as_posix().rstrip("/")
    if key not in PLUGINS:
        raise Refused(f"{folder} is not a plugin package of PLUGINS ({', '.join(PLUGINS)})")
    return key, PLUGINS[key]


def normalized(name):
    return re.sub(r"[-_.]+", "_", name).lower()


def project_of(folder, root=ROOT):
    """(name, version, engine version) the folder's pyproject.toml states, held to its PLUGINS row."""
    key, row = plugin(folder)
    base = pathlib.Path(root) / key
    project = tomllib.loads((base / "pyproject.toml").read_text(encoding="utf-8")).get("project", {})
    name, version = project.get("name"), str(project.get("version", ""))
    if name != row["project"]:
        raise Refused(f"{key}/pyproject.toml names {name!r}, PLUGINS says {row['project']!r}")
    if not VERSION.fullmatch(version):
        raise Refused(f"{key}/pyproject.toml version {version!r} is not X.Y.Z")
    pins = [match[1] for dep in project.get("dependencies", []) if (match := PIN.match(dep.replace(" ", "")))]
    others = [dep for dep in project.get("dependencies", [])
              if re.match(rf"^{re.escape(ENGINE)}\b(?!-)", dep) and not PIN.match(dep.replace(" ", ""))]
    if len(pins) != 1 or others:
        raise Refused(f"{key}/pyproject.toml must pin {ENGINE}==X.Y.Z exactly once, got {pins} {others}")
    if row["classifier"] not in project.get("classifiers", []):
        raise Refused(f"{key}/pyproject.toml lacks the classifier {row['classifier']!r}")
    own = (base / row["version_file"]).read_text(encoding="utf-8")
    stated = re.findall(r'^__version__\s*=\s*"([^"]+)"', own, re.M)
    if stated != [version]:
        raise Refused(f"{key}/{row['version_file']} states __version__ {stated}, the project is {version}")
    return name, version, pins[0]


def expected_files(name, version):
    stem = f"{normalized(name)}-{version}"
    return {f"{stem}-py3-none-any.whl": "wheel", f"{stem}.tar.gz": "sdist"}


def listing(paths):
    """`sha256  name` lines, sorted by name, and the SHA-256 of that text."""
    rows = sorted((path.name, hashlib.sha256(path.read_bytes()).hexdigest()) for path in paths)
    text = "".join(f"{digest}  {name}\n" for name, digest in rows)
    return text, hashlib.sha256(text.encode()).hexdigest()


def metadata_problems(fields, name, version, engine, row, where):
    out = []
    if fields.get("Name") != name or fields.get("Version") != version:
        out.append(f"{where}: Name/Version {fields.get('Name')!r} {fields.get('Version')!r}, want {name} {version}")
    requires = [value.replace(" ", "") for value in fields.get_all("Requires-Dist") or []]
    if f"{ENGINE}=={engine}" not in requires:
        out.append(f"{where}: no Requires-Dist {ENGINE}=={engine}")
    if row["classifier"] not in (fields.get_all("Classifier") or []):
        out.append(f"{where}: no Classifier {row['classifier']!r}")
    if not fields.get("License-Expression"):
        out.append(f"{where}: no License-Expression")
    return out


def judge(directory, folder, root=ROOT):
    """The release set in DIRECTORY, held to the folder's project: (paths, problems)."""
    key, row = plugin(folder)
    name, version, engine = project_of(key, root)
    want = expected_files(name, version)
    directory = pathlib.Path(directory)
    entries = sorted(directory.iterdir()) if directory.is_dir() else []
    problems = []
    if not directory.is_dir():
        return [], [f"{directory} is not a folder"]
    names = {entry.name for entry in entries}
    if names != set(want):
        problems.append(f"{directory} holds {sorted(names)}, the release set is {sorted(want)}")
    paths = [entry for entry in entries if entry.name in want]
    for path in paths:
        if path.is_symlink() or not path.is_file():
            problems.append(f"{path.name} is not a regular file")
            continue
        parser = email.parser.BytesParser()
        try:
            if want[path.name] == "wheel":
                with zipfile.ZipFile(path) as archive:
                    info = f"{normalized(name)}-{version}.dist-info"
                    fields = parser.parsebytes(archive.read(f"{info}/METADATA"))
                    entry_points = archive.read(f"{info}/entry_points.txt").decode()
                if f"[{row['entry_point']}]" not in entry_points:
                    problems.append(f"{path.name}: entry_points.txt declares no [{row['entry_point']}]")
            else:
                with tarfile.open(path, "r:gz") as archive:
                    member = archive.extractfile(f"{normalized(name)}-{version}/PKG-INFO")
                    fields = parser.parsebytes(member.read())
        except (KeyError, OSError, zipfile.BadZipFile, tarfile.TarError, AttributeError) as error:
            problems.append(f"{path.name}: not a readable {want[path.name]} ({type(error).__name__}: {error})")
            continue
        problems += metadata_problems(fields, name, version, engine, row, path.name)
    return paths, problems


def gate(args):
    key, row = plugin(args.folder)
    name, version, engine = project_of(key)
    tag = f"refs/tags/{row['tag']}{version}"
    if args.ref.startswith("refs/tags/"):
        if args.ref != tag:
            raise Refused(f"{args.ref} does not name {name} {version}: its tag is {tag}")
    elif not args.dry_run:
        raise Refused(f"{args.ref} is not a tag: {name} publishes only from {tag}")
    print(f"gate: {name} {version} on engine {engine}, {args.ref}" + ("" if args.ref == tag else " (dry run)"))
    return 0


def build(args):
    key, _ = plugin(args.folder)
    _, _, engine = project_of(key)
    out = pathlib.Path(args.out)
    if out.exists() and any(out.iterdir()):
        raise Refused(f"{out} is not empty: build into a new folder")
    # A wheel stores its entries' dates: from the commit, in UTC, whatever the machine's zone.
    env = dict(os.environ, TZ="UTC")
    commit_time = subprocess.run(["git", "log", "-1", "--format=%ct"], cwd=ROOT, capture_output=True, text=True)
    if commit_time.returncode == 0 and commit_time.stdout.strip():
        env["SOURCE_DATE_EPOCH"] = commit_time.stdout.strip()
    done = subprocess.run([sys.executable, "-m", "build", "--sdist", "--wheel", "--outdir", str(out), str(ROOT / key)],
                          env=env)
    if done.returncode != 0:
        raise Refused(f"python -m build exited {done.returncode}")
    paths, problems = judge(out, key)
    if problems:
        raise Refused("; ".join(problems))
    text, digest = listing(paths)
    print(text, end="")
    print(f"listing sha256 {digest}")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
            handle.write(f"sha256={digest}\nfiles={' '.join(path.name for path in sorted(paths))}\n"
                         f"engine={engine}\n")
    return 0


def inspect(args, root=ROOT):
    paths, problems = judge(args.directory, args.folder, root)
    if not re.fullmatch(r"[0-9a-f]{64}", args.sha256 or ""):
        problems.append(f"--sha256 {args.sha256!r} is not the 64-hex listing digest the build recorded")
    elif not problems:
        text, digest = listing(paths)
        if digest != args.sha256:
            problems.append(f"the listing digest is {digest}, the build recorded {args.sha256}:\n{text}")
    if problems:
        raise Refused("; ".join(problems))
    print(f"inspect: {len(paths)} files, the set the build recorded")
    return 0


def served(project, version, opener=urllib.request.urlopen):
    """{file name: sha256} PyPI serves at PROJECT VERSION, or None on a 404."""
    try:
        with opener(PYPI_JSON.format(project=project, version=version), timeout=30) as response:
            data = json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise
    return {row["filename"]: row["digests"]["sha256"] for row in data.get("urls", [])}


def pypi_live(args, opener=urllib.request.urlopen, root=ROOT):
    key, _ = plugin(args.folder)
    name, version, _ = project_of(key, root)
    paths, problems = judge(args.directory, key, root)
    if problems:
        raise Refused("; ".join(problems))
    local = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
    try:
        live = served(name, version, opener)
    except (OSError, ValueError, KeyError) as error:
        raise Refused(f"PyPI's answer for {name} {version} cannot be read: {type(error).__name__}: {error}")
    if live is None:
        print(f"pypi-live: PyPI serves no {name} {version}: nothing is live")
        return 0
    differs = [file for file, digest in live.items() if local.get(file) != digest]
    if differs:
        raise Refused(f"PyPI serves {name} {version} files this set does not hold as the same bytes: {differs}")
    print(f"pypi-live: PyPI already serves {sorted(live)}, each the very file of this set")
    return 0


# --------------------------------------------------------------------------------------- self-test

def _fake_release(root, folder, name, version, engine, row, *, wheel_name=None, broken=None):
    out = pathlib.Path(root) / "dist"
    out.mkdir()
    norm = normalized(name)
    meta = (f"Metadata-Version: 2.4\nName: {name}\nVersion: {version}\nLicense-Expression: MIT\n"
            f"Classifier: {row['classifier']}\nRequires-Dist: {ENGINE}=={engine}\n\n")
    if broken == "pin":
        meta = meta.replace(f"{ENGINE}=={engine}", f"{ENGINE}>=0")
    wheel = out / (wheel_name or f"{norm}-{version}-py3-none-any.whl")
    with zipfile.ZipFile(wheel, "w") as archive:
        archive.writestr(f"{norm}-{version}.dist-info/METADATA", meta)
        archive.writestr(f"{norm}-{version}.dist-info/entry_points.txt",
                         "" if broken == "entry" else f"[{row['entry_point']}]\nx = y:z\n")
    data = meta.encode()
    with tarfile.open(out / f"{norm}-{version}.tar.gz", "w:gz") as archive:
        info = tarfile.TarInfo(f"{norm}-{version}/PKG-INFO")
        info.size = len(data)
        archive.addfile(info, io.BytesIO(data))
    return out


def self_test():
    failures, ran = [], []
    real_key = "integrations/napari"
    name, version, engine = project_of(real_key)
    row = PLUGINS[real_key]

    def expect(label, call, should_pass):
        ran.append(label)
        try:
            with open(os.devnull, "w") as quiet:
                stdout, sys.stdout = sys.stdout, quiet
                try:
                    call()
                finally:
                    sys.stdout = stdout
            passed = True
        except Refused:
            passed = False
        if passed != should_pass:
            failures.append(f"{label}: {'passed' if passed else 'refused'}, want {'pass' if should_pass else 'refusal'}")

    tag = f"refs/tags/{row['tag']}{version}"
    ns = argparse.Namespace
    expect("gate on its tag", lambda: gate(ns(ref=tag, folder=real_key, dry_run=False)), True)
    expect("gate on another version", lambda: gate(ns(ref=f"refs/tags/{row['tag']}9.9.9", folder=real_key,
                                                       dry_run=False)), False)
    expect("gate on the engine tag", lambda: gate(ns(ref=f"refs/tags/v{version}", folder=real_key, dry_run=True)),
           False)
    expect("gate on a branch", lambda: gate(ns(ref="refs/heads/main", folder=real_key, dry_run=False)), False)
    expect("gate dry run on a branch", lambda: gate(ns(ref="refs/heads/main", folder=real_key, dry_run=True)), True)
    expect("gate of an unknown folder", lambda: gate(ns(ref=tag, folder="integrations/comfyui", dry_run=True)), False)

    with tempfile.TemporaryDirectory(prefix="qrscan-plugin-release-") as box:
        box = pathlib.Path(box)
        # A copy of the real folder with one defect at a time, for project_of.
        for defect, edit in (("name", ("name = \"napari-qrcode-barcode-scanner\"", "name = \"napari-other\"")),
                             ("range pin", (f"\"{ENGINE}=={engine}\"", f"\"{ENGINE}>={engine}\"")),
                             ("classifier", (f"\"{row['classifier']}\",", "")),
                             ("version", (f"version = \"{version}\"", "version = \"0.1\""))):
            copy = box / defect.replace(" ", "-") / real_key
            copy.mkdir(parents=True)
            text = (ROOT / real_key / "pyproject.toml").read_text()
            assert edit[0] in text, (defect, edit[0])
            (copy / "pyproject.toml").write_text(text.replace(edit[0], edit[1], 1))
            (copy / row["version_file"]).parent.mkdir(parents=True)
            (copy / row["version_file"]).write_text((ROOT / real_key / row["version_file"]).read_text())
            expect(f"project with a wrong {defect}", lambda c=copy.parents[1]: project_of(real_key, c), False)

        def release(case, **options):
            where = box / f"release-{case}"
            where.mkdir()
            return _fake_release(where, real_key, name, version, engine, row, **options)

        good = release("good")
        _, digest = listing(sorted(good.iterdir()))
        expect("inspect the recorded set", lambda: inspect(ns(directory=good, folder=real_key, sha256=digest)), True)
        expect("inspect against another digest",
               lambda: inspect(ns(directory=good, folder=real_key, sha256="0" * 64)), False)
        expect("inspect with no digest", lambda: inspect(ns(directory=good, folder=real_key, sha256="")), False)
        extra = release("extra")
        (extra / "other-0.0.0-py3-none-any.whl").write_bytes(b"x")
        _, extra_digest = listing(sorted(extra.iterdir()))
        expect("inspect an added file", lambda: inspect(ns(directory=extra, folder=real_key, sha256=extra_digest)),
               False)
        for broken in ("pin", "entry"):
            bad = release(broken, broken=broken)
            _, bad_digest = listing(sorted(bad.iterdir()))
            expect(f"inspect a wheel with a wrong {broken}",
                   lambda b=bad, d=bad_digest: inspect(ns(directory=b, folder=real_key, sha256=d)), False)
        platform_wheel = release("platform", wheel_name=f"{normalized(name)}-{version}-cp312-cp312-linux_x86_64.whl")
        _, platform_digest = listing(sorted(platform_wheel.iterdir()))
        expect("inspect a platform wheel",
               lambda: inspect(ns(directory=platform_wheel, folder=real_key, sha256=platform_digest)), False)

        local = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in good.iterdir()}

        def answer(status, files=None):
            def opener(url, timeout=None):
                assert url == PYPI_JSON.format(project=name, version=version), url
                if status != 200:
                    raise urllib.error.HTTPError(url, status, "status", {}, None)
                body = {"urls": [{"filename": file, "digests": {"sha256": digest}} for file, digest in files.items()]}
                return io.BytesIO(json.dumps(body).encode())
            return opener

        live_args = ns(directory=good, folder=real_key)
        expect("pypi-live with nothing live", lambda: pypi_live(live_args, answer(404)), True)
        expect("pypi-live with the same files", lambda: pypi_live(live_args, answer(200, local)), True)
        one = dict(list(local.items())[:1])
        expect("pypi-live with one of the files live", lambda: pypi_live(live_args, answer(200, one)), True)
        expect("pypi-live with other bytes", lambda: pypi_live(
            live_args, answer(200, {file: "0" * 64 for file in local})), False)
        expect("pypi-live with another file live", lambda: pypi_live(
            live_args, answer(200, dict(local, **{"extra-0.1.0.tar.gz": "1" * 64}))), False)
        expect("pypi-live when PyPI fails", lambda: pypi_live(live_args, answer(503)), False)

    for failure in failures:
        print(f"FAIL  {failure}")
    print(f"python-plugin-release self-test: {'FAIL' if failures else 'ok'} ({len(ran)} checks)")
    return 1 if failures else 0


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if argv == ["--self-test"]:
        return self_test()
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    commands = parser.add_subparsers(dest="command", required=True)
    one = commands.add_parser("gate", help="the tag names the version the plugin states")
    one.add_argument("--ref", required=True)
    one.add_argument("--folder", required=True)
    one.add_argument("--dry-run", action="store_true", help="accept a branch: build and judge, publish nothing")
    two = commands.add_parser("build", help="build the sdist and the wheel and record their listing")
    two.add_argument("--folder", required=True)
    two.add_argument("--out", required=True)
    three = commands.add_parser("inspect", help="the folder holds the release set the build recorded")
    three.add_argument("directory", type=pathlib.Path)
    three.add_argument("--folder", required=True)
    three.add_argument("--sha256", required=True)
    four = commands.add_parser("pypi-live", help="what PyPI already serves at this version is this set")
    four.add_argument("directory", type=pathlib.Path)
    four.add_argument("--folder", required=True)
    args = parser.parse_args(argv)
    try:
        return {"gate": gate, "build": build, "inspect": inspect, "pypi-live": pypi_live}[args.command](args)
    except Refused as error:
        print(f"python-plugin-release {args.command}: {error}", file=sys.stderr)
        return 1
    except (OSError, ValueError, tomllib.TOMLDecodeError) as error:
        print(f"python-plugin-release {args.command}: {type(error).__name__}: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
