#!/usr/bin/env python3
"""The platform gems of the Ruby binding, from their native libraries to the publisher's checks.

  ruby-gem.py native --target TRIPLE --library FILE --out DIR
  ruby-gem.py stage --version X.Y.Z --generated FILE (--library FILE | --natives DIR --target TRIPLE) --out DIR
  ruby-gem.py build DIR --target TRIPLE --out FEED
  ruby-gem.py inspect FEED --natives DIR --version X.Y.Z --commit SHA --out RECEIPT
  ruby-gem.py match FEED --version X.Y.Z
  ruby-gem.py candidate --folder DIR --natives DIR --receipt-sha256 HEX [--require-absent --pending FILE]
  ruby-gem.py preflight
  ruby-gem.py --self-test

The gem `qrcode-barcode-scanner` carries the engine's UniFFI library, one platform gem per system:
x86_64-linux-gnu, aarch64-linux-gnu, x86_64-darwin, arm64-darwin and x64-mingw-ucrt. There is no
generic gem: without its library it could not scan.

`native` judges one built library against the floor of the prebuilt qrscan, with the rules of
scripts/dotnet-package.py (the same five libraries): glibc 2.28 and nothing beyond glibc's own,
macOS 10.15 on x86_64 and 11.0 on arm64 with system libraries only, no C runtime library on
Windows. It writes the file and its record under DIR/<rid>/.

`stage` writes into an empty DIR the tree `gem build` reads: the tracked files of bindings/ruby
that ship (the gemspec, lib/, README.md, LICENSE, LICENSE-NOTES.md), the core's Apache-2.0
notices, `lib/qrcode_barcode_scanner/version.rb`, the Ruby that uniffi-bindgen generated, and one
library: the host's own (--library, for the tests of one system) or the floor-checked one of
TARGET (--natives).

`build` runs `gem build` on that tree for TARGET's platform, with SOURCE_DATE_EPOCH set to the
commit's time and TZ=UTC: the same commit gives the same gem bytes.

`inspect` opens the five gems of FEED and refuses anything that is not the package: the platform
and the file set of each, every file against its source, the one library against its record,
one generated Ruby for all five, and the fields rubygems.org shows. It writes the receipt.

`match` asks RubyGems, through bindings/ruby/acceptance/select.rb, which gem of FEED a Ruby of
each platform of MATCHES would install: its own gem for each of the five, and none for a musl
Linux or the old MSVCRT Windows Ruby.

`candidate` re-inspects a downloaded folder against the receipt whose sha256 the pack job
exported. With --require-absent, on the engine tag only, it also checks the canonical repository
and the protected `rubygems` environment, then writes to FILE the gems rubygems.org does not hold
yet. A gem it already holds must be the same file: a version is never replaced.

`preflight` answers whether this run may schedule the publishing job: an engine tag push of the
canonical repository whose version is the workspace's, with the protected environment in place.

The gem's metadata is YAML: it is read with the host's own RubyGems (`ruby` on PATH). Nothing is
installed or published by this program. Exit 0 when the step passes, 1 when it is refused, 2 for
usage.
"""
import argparse
import gzip
import hashlib
import importlib.util
import io
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import tomllib
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = "bindings/ruby"
GEM = "qrcode-barcode-scanner"
MODULE = "qrcode_barcode_scanner"
GENERATED = "qrcode_ai_scanner_uniffi.rb"
REPOSITORY = "qrcode-ai-com/qrcode-barcode-scanner-rust"
REPOSITORY_ID = "1126991539"
ENVIRONMENT = "rubygems"
OWNER = ("ThibautMelen", 20891897)
SCHEMA = "qrscan-ruby-gems/1"
LIMIT = 64 * 1024 * 1024
# The target triple of each library and the platform of its gem. RubyGems reads `-gnu` as glibc
# only: a musl Ruby matches none of these and gets no gem rather than a library it cannot load.
PLATFORMS = {
    "x86_64-unknown-linux-gnu": "x86_64-linux-gnu",
    "aarch64-unknown-linux-gnu": "aarch64-linux-gnu",
    "x86_64-apple-darwin": "x86_64-darwin",
    "aarch64-apple-darwin": "arm64-darwin",
    "x86_64-pc-windows-msvc": "x64-mingw-ucrt",
}
# Files of bindings/ruby that ship in each gem, as tracked, and the core's Apache-2.0 notices.
SHIPPED = ("qrcode-barcode-scanner.gemspec", "README.md", "LICENSE", "LICENSE-NOTES.md")
LIBRARY_SOURCES = re.compile(r"lib/[a-z_/]+\.rb")
NOTICES = {"LICENSE-APACHE-2.0": "crates/qrcode-ai-scanner/LICENSE-APACHE-2.0",
           "THIRD-PARTY.md": "crates/qrcode-ai-scanner/THIRD-PARTY.md"}
# What rubygems.org shows, and what the gemspec declares.
FIELDS = {
    "name": GEM,
    "authors": ["QR Code AI"],
    "licenses": ["MIT"],
    "homepage": "https://qrcode-ai.com/en-US/qr-code-scanner/sdk/ruby",
    "metadata": {"bug_tracker_uri": "https://github.com/qrcode-ai-com/qrcode-barcode-scanner/issues",
                 "homepage_uri": "https://qrcode-ai.com/en-US/qr-code-scanner/sdk/ruby",
                 "rubygems_mfa_required": "true",
                 "source_code_uri": "https://github.com/qrcode-ai-com/qrcode-barcode-scanner"},
    "required_ruby_version": ">= 3.3",
    "required_rubygems_version": ">= 3.3.22",
    "dependencies": [["ffi", "runtime", "~> 1.17"]],
    "extensions": [],
    "executables": [],
    "require_paths": ["lib"],
}
# The platform a Ruby reports (Gem::Platform.local) and the one gem RubyGems must give it.
MATCHES = {
    "x86_64-linux": "x86_64-linux-gnu",
    "aarch64-linux": "aarch64-linux-gnu",
    "x86_64-darwin-23": "x86_64-darwin",
    "arm64-darwin-24": "arm64-darwin",
    "x64-mingw-ucrt": "x64-mingw-ucrt",
    "x86_64-linux-musl": None,
    "aarch64-linux-musl": None,
    "x64-mingw32": None,
}
FFI_LIB = "ffi_lib QrcodeBarcodeScanner::Native::LIBRARY"
SPEC_JSON = r"""
require 'json'
require 'rubygems/package'
spec = Gem::Package.new(ARGV[0]).spec
print JSON.generate(
  'name' => spec.name, 'version' => spec.version.to_s, 'platform' => spec.platform.to_s,
  'authors' => spec.authors, 'licenses' => spec.licenses, 'homepage' => spec.homepage,
  'metadata' => spec.metadata.sort.to_h, 'summary' => spec.summary, 'description' => spec.description,
  'required_ruby_version' => spec.required_ruby_version.to_s,
  'required_rubygems_version' => spec.required_rubygems_version.to_s,
  'dependencies' => spec.dependencies.map { |d| [d.name, d.type.to_s, d.requirement.to_s] },
  'extensions' => spec.extensions, 'executables' => spec.executables,
  'require_paths' => spec.require_paths, 'files' => spec.files.sort, 'date' => spec.date.utc.strftime('%F'))
"""

spec = importlib.util.spec_from_file_location("dotnet_package", ROOT / "scripts/dotnet-package.py")
natives_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(natives_module)
Refused = natives_module.Refused
require = natives_module.require
TARGETS = natives_module.TARGETS


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def workspace_version(root=ROOT):
    return tomllib.loads((root / "Cargo.toml").read_text())["workspace"]["package"]["version"]


def gem_name(version, target):
    return f"{GEM}-{version}-{PLATFORMS[target]}.gem"


def library_path(target):
    return f"lib/{MODULE}/native/{TARGETS[target]['file']}"


def tracked(root=ROOT):
    """{path below bindings/ruby: bytes} of the tracked files that ship, read from the checkout."""
    listed = subprocess.run(["git", "-C", str(root), "ls-files", "-z", "--", SOURCE], capture_output=True,
                            check=True).stdout.decode().split("\0")
    files = {}
    for path in filter(None, listed):
        name = path[len(SOURCE) + 1:]
        if name in SHIPPED or LIBRARY_SOURCES.fullmatch(name):
            files[name] = (root / path).read_bytes()
    missing = [name for name in SHIPPED + (f"lib/{MODULE}.rb",) if name not in files]
    require(not missing, f"bindings/ruby lacks {missing}")
    require(f"lib/{MODULE}/version.rb" not in files, "version.rb is written by the stage, never tracked")
    return files


def check_generated(text):
    """The generated Ruby loads the gem's own library, and only it."""
    require(text.startswith("# This file was autogenerated by some hot garbage in the `uniffi` crate."),
            "the generated Ruby does not start with the uniffi-bindgen header")
    require("\nmodule QrcodeAiScannerUniffi\n" in text, "the generated Ruby defines no QrcodeAiScannerUniffi")
    loads = re.findall(r"^\s*ffi_lib\b.*$", text, re.M)
    require([line.strip() for line in loads] == [FFI_LIB],
            f"the generated Ruby must load the gem's library with `{FFI_LIB}`, found {loads}")


def stage_tree(version, generated, out, library=None, natives=None, target=None, root=ROOT):
    """Write the tree `gem build` reads; return {path: bytes} of what it holds."""
    require(re.fullmatch(r"\d+\.\d+\.\d+", version or "") is not None, f"not a version: {version!r}")
    require(not out.exists() or not any(out.iterdir()), f"{out} is not empty")
    files = {name: data for name, data in tracked(root).items()}
    for name, path in NOTICES.items():
        files[name] = (root / path).read_bytes()
    files[f"lib/{MODULE}/version.rb"] = (
        "# frozen_string_literal: true\n\n# Written by scripts/ruby-gem.py stage: the engine's version.\n"
        f"module QrcodeBarcodeScanner\n  VERSION = '{version}'\nend\n").encode()
    text = generated.read_bytes().decode("utf-8")
    check_generated(text)
    files[f"lib/{MODULE}/generated/{GENERATED}"] = text.encode("utf-8")
    if natives is not None:
        require(target in PLATFORMS, f"not a target of the gem: {target}")
        record, data = natives_module.natives(natives)[TARGETS[target]["rid"]]
        files[library_path(target)] = data
    else:
        require(library is not None and library.is_file(), "a host library or the natives folder is required")
        files[f"lib/{MODULE}/native/{library.name}"] = library.read_bytes()
    for name, data in files.items():
        path = out / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    return files


def build(tree, target, feed, root=ROOT, run=subprocess.run):
    require(target in PLATFORMS, f"not a target of the gem: {target}")
    version = re.search(r"VERSION = '([^']+)'", (tree / f"lib/{MODULE}/version.rb").read_text())[1]
    epoch = run(["git", "-C", str(root), "log", "-1", "--format=%ct"], capture_output=True, text=True,
                check=True).stdout.strip()
    feed.mkdir(parents=True, exist_ok=True)
    output = feed / gem_name(version, target)
    require(not output.exists(), f"{output} already exists")
    env = {**os.environ, "QRSCAN_GEM_PLATFORM": PLATFORMS[target], "SOURCE_DATE_EPOCH": epoch, "TZ": "UTC"}
    run(["gem", "build", f"{GEM}.gemspec", "--output", str(output.resolve())], cwd=tree, env=env, check=True,
        timeout=120)
    require(output.is_file(), f"gem build wrote no {output.name}")
    return output


# ------------------------------------------------------------------ reading a gem

def gem_parts(data):
    """{member: bytes} of the outer tar of a gem, and {path: bytes} of its data.tar.gz."""
    require(len(data) <= LIMIT, "the gem exceeds its size limit")
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:") as outer:
        members = outer.getmembers()
        names = sorted(member.name for member in members)
        require(names == ["checksums.yaml.gz", "data.tar.gz", "metadata.gz"],
                f"a gem holds checksums.yaml.gz, data.tar.gz and metadata.gz, not {names}")
        parts = {member.name: outer.extractfile(member).read() for member in members}
    files = {}
    with tarfile.open(fileobj=io.BytesIO(parts["data.tar.gz"]), mode="r:gz") as inner:
        total = 0
        for member in inner.getmembers():
            require(member.isfile(), f"{member.name} is not a regular file")
            require(not member.name.startswith(("/", "../")) and "/../" not in member.name,
                    f"{member.name} leaves the gem")
            total += member.size
            require(total <= LIMIT, "the expanded gem exceeds its size limit")
            files[member.name] = inner.extractfile(member).read()
    return parts, files


def checksums(parts):
    """The SHA256 lines of checksums.yaml.gz must name the two other members' digests."""
    text = gzip.decompress(parts["checksums.yaml.gz"]).decode("utf-8")
    block = re.search(r"^SHA256:\n((?:  \S+: [0-9a-f]{64}\n)+)", text, re.M)
    require(block is not None, "checksums.yaml.gz holds no SHA256 section")
    told = dict(re.findall(r"  (\S+): ([0-9a-f]{64})", block[1]))
    for name in ("metadata.gz", "data.tar.gz"):
        require(told.get(name) == sha256(parts[name]), f"checksums.yaml.gz does not hold the digest of {name}")


def read_spec(path, run=subprocess.run):
    done = run(["ruby", "-e", SPEC_JSON, str(path)], capture_output=True, text=True, timeout=60)
    require(done.returncode == 0, f"RubyGems cannot read {path.name}: {done.stderr.strip()}")
    return json.loads(done.stdout)


def inspect_gem(path, target, natives, version, expected, read=read_spec):
    """The record of one platform gem, or Refused."""
    data = path.read_bytes()
    require(path.name == gem_name(version, target), f"{path.name} is not named {gem_name(version, target)}")
    parts, files = gem_parts(data)
    checksums(parts)
    record, library = natives[TARGETS[target]["rid"]]
    wanted = dict(expected)
    wanted[library_path(target)] = library
    require(sorted(files) == sorted(wanted), f"{path.name} holds {sorted(set(files) ^ set(wanted))} "
                                            "beyond or short of the package")
    for name, content in wanted.items():
        require(files[name] == content, f"{path.name}: {name} differs from its source")
    found = read(path)
    for key, value in FIELDS.items():
        require(found.get(key) == value, f"{path.name}: {key} is {found.get(key)!r}, not {value!r}")
    require(found.get("version") == version, f"{path.name}: version {found.get('version')}, not {version}")
    require(found.get("platform") == PLATFORMS[target], f"{path.name}: platform {found.get('platform')}")
    require(found.get("files") == sorted(files), f"{path.name}: the gemspec's files are not the gem's")
    return {"file": path.name, "sha256": sha256(data), "size": len(data), "platform": PLATFORMS[target],
            "target": target, "library": {"file": TARGETS[target]["file"], "sha256": record["sha256"]},
            "files": {name: sha256(content) for name, content in sorted(files.items())},
            "date": found.get("date"), "summary": found.get("summary")}


def expected_files(feed_gem, natives_folder, version, root=ROOT):
    """{path: bytes} every gem shares: its sources, version file and the one generated Ruby."""
    with tempfile.TemporaryDirectory(prefix="ruby-gem-") as tmp:
        parts, files = gem_parts(feed_gem.read_bytes())
        generated = files.get(f"lib/{MODULE}/generated/{GENERATED}")
        require(generated is not None, f"{feed_gem.name} holds no generated Ruby")
        source = pathlib.Path(tmp) / GENERATED
        source.write_bytes(generated)
        staged = stage_tree(version, source, pathlib.Path(tmp) / "tree", natives=natives_folder,
                            target="x86_64-unknown-linux-gnu", root=root)
    staged.pop(library_path("x86_64-unknown-linux-gnu"))
    # The gemspec builds the gem; it is not one of its files.
    staged.pop(f"{GEM}.gemspec")
    return staged


def inspect_feed(feed, natives_folder, version, commit, read=read_spec, root=ROOT):
    require(re.fullmatch(r"[0-9a-f]{40}", commit or "") is not None, "the commit must be a full SHA")
    natives = natives_module.natives(natives_folder)
    gems = sorted(feed.glob("*.gem"))
    wanted = sorted(gem_name(version, target) for target in PLATFORMS)
    require([path.name for path in gems] == wanted, f"{feed} holds {[p.name for p in gems]}, not {wanted}")
    require(all(path.is_file() and not path.is_symlink() for path in gems), "a gem is not a regular file")
    expected = expected_files(gems[0], natives_folder, version, root)
    rows = [inspect_gem(feed / gem_name(version, target), target, natives, version, expected, read)
            for target in PLATFORMS]
    require(len({row["date"] for row in rows}) == 1, "the five gems carry different dates")
    return {"schema": SCHEMA, "gem": GEM, "version": version, "commit": commit,
            "generated_sha256": sha256(expected[f"lib/{MODULE}/generated/{GENERATED}"]),
            "gems": rows}


def match(feed, version, run=subprocess.run, root=ROOT):
    """{platform: gem name or None} as RubyGems chooses, or Refused when one differs from MATCHES."""
    found = {}
    for platform, expected in MATCHES.items():
        done = run(["ruby", str(root / SOURCE / "acceptance/select.rb"), str(feed), platform],
                   capture_output=True, text=True, timeout=60)
        require(done.returncode == 0, f"select.rb failed for {platform}: {done.stderr.strip()}")
        chosen = done.stdout.split()
        wanted = [f"{GEM}-{version}-{expected}.gem"] if expected else []
        require(chosen == wanted, f"RubyGems gives a Ruby of {platform} {chosen or 'no gem'}, not {wanted or 'no gem'}")
        found[platform] = chosen[0] if chosen else None
    return found


# ------------------------------------------------------------------ the publisher's checks

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise Refused("a release check must not follow a redirect")


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "qrscan-ruby-gem"})
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=30) as response:
        data = response.read(LIMIT + 1)
    require(len(data) <= LIMIT, "a release check response exceeds its size limit")
    return data


def identity(context):
    require(context.get("GITHUB_REPOSITORY") == REPOSITORY and context.get("GITHUB_REPOSITORY_ID") == REPOSITORY_ID,
            "publication requires the canonical repository name and immutable ID")


def environment(get=fetch):
    url = f"https://api.github.com/repos/{REPOSITORY}/environments/{ENVIRONMENT}"
    env, policies = (json.loads(get(path)) for path in (url, url + "/deployment-branch-policies"))
    require(env.get("name") == ENVIRONMENT, f"the protected {ENVIRONMENT} environment must already exist")
    require(env.get("deployment_branch_policy") == {"protected_branches": False, "custom_branch_policies": True},
            f"{ENVIRONMENT} must use custom deployment tag policies")
    reviews = [rule for rule in env.get("protection_rules", []) if rule.get("type") == "required_reviewers"]
    require(len(reviews) == 1 and len(reviews[0].get("reviewers", [])) == 1,
            f"{ENVIRONMENT} must require the owner's review")
    reviewer = reviews[0]["reviewers"][0]
    require(reviewer.get("type") == "User" and reviewer.get("reviewer", {}).get("id") == OWNER[1] and
            reviewer["reviewer"].get("login") == OWNER[0], f"{ENVIRONMENT} reviewer must be {OWNER[0]}")
    require(policies.get("total_count") == 1 and
            [(row.get("name"), row.get("type")) for row in policies.get("branch_policies", [])] == [("v*", "tag")],
            f"{ENVIRONMENT} must allow v* tags only")


def preflight(context, get=fetch, root=ROOT):
    ref = context.get("GITHUB_REF", "")
    if not ref.startswith("refs/tags/"):
        return False
    identity(context)
    require(ref == "refs/tags/v" + workspace_version(root), "tag differs from the workspace version")
    if context.get("GITHUB_EVENT_NAME") != "push":
        return False
    environment(get)
    return True


def pending(report, get=fetch):
    """The gems of REPORT that rubygems.org does not hold yet.

    A gem it holds must be the very file of the receipt: a version is never replaced. A push that
    stopped after some platforms can then be run again for the others, and only for them."""
    try:
        rows = json.loads(get(f"https://rubygems.org/api/v1/versions/{GEM}.json"))
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        rows = []
    held = {row.get("platform"): row.get("sha") for row in rows if row.get("number") == report["version"]}
    ours = {row["platform"]: row for row in report["gems"]}
    foreign = sorted(set(held) - set(ours))
    require(not foreign, f"rubygems.org holds {GEM} {report['version']} for {foreign}, not a platform of this build")
    for platform, sha in sorted(held.items()):
        require(sha == ours[platform]["sha256"],
                f"rubygems.org holds another {ours[platform]['file']}; a version is never replaced")
    left = [row["file"] for row in report["gems"] if row["platform"] not in held]
    require(left, f"rubygems.org already holds the five gems of {GEM} {report['version']}")
    return left


def candidate(folder, natives_folder, expected, read=read_spec, root=ROOT):
    require(re.fullmatch(r"[0-9a-f]{64}", expected or "") is not None, "missing producer receipt SHA-256")
    receipts = list(folder.rglob("gems.json"))
    require(len(receipts) == 1 and receipts[0].is_file() and not receipts[0].is_symlink(),
            f"expected one regular gems.json in {folder}")
    receipt = receipts[0].read_bytes()
    require(sha256(receipt) == expected, "the producer receipt differs from the pack job's digest")
    told = json.loads(receipt)
    require(told.get("schema") == SCHEMA and told.get("version") == workspace_version(root),
            "the receipt is not this workspace's gems")
    feed = receipts[0].parent / "feed"
    report = inspect_feed(feed, natives_folder, told["version"], told["commit"], read, root)
    require(report == told, "the gems differ from their inspected producer receipt")
    for target in PLATFORMS:
        row = TARGETS[target]
        found = natives_module.read_floor(natives_folder / row["rid"] / row["file"])
        require(not natives_module.floor_problems(target, found), f"native floor refused {target}")
    return report


# ------------------------------------------------------------------ self-test

def _canned_spec(version, target, **changes):
    found = dict(FIELDS, version=version, platform=PLATFORMS[target], summary="s", description="d",
                 date="2026-11-21")
    found.update(changes)
    return found


def self_test():
    failures = []

    def check(label, passed, detail=""):
        print(("ok    " if passed else "FAIL  ") + label + (f": {detail}" if detail and not passed else ""))
        if not passed:
            failures.append(label)

    def refused(label, action, words):
        try:
            action()
        except Refused as error:
            check(label, words in str(error), str(error))
        else:
            check(label, False, "accepted")

    check("five platforms, one per library", sorted(PLATFORMS) == sorted(TARGETS))
    check("the glibc gems name gnu", [PLATFORMS[t] for t in PLATFORMS if "linux" in t] ==
          ["x86_64-linux-gnu", "aarch64-linux-gnu"])
    check("gem file names", gem_name("1.2.3", "aarch64-apple-darwin") == "qrcode-barcode-scanner-1.2.3-arm64-darwin.gem")
    header = "# This file was autogenerated by some hot garbage in the `uniffi` crate.\n"
    good = header + "require 'ffi'\n\nmodule QrcodeAiScannerUniffi\nmodule UniFFILib\n  " + FFI_LIB + "\nend\nend\n"
    check("the generated Ruby is accepted", (check_generated(good) or True))
    refused("a library found by name is refused", lambda: check_generated(good.replace(FFI_LIB, "ffi_lib 'x'")),
            "must load the gem's library")
    refused("a second library is refused", lambda: check_generated(good + "ffi_lib 'y'\n"), "must load")
    refused("a hand-written file is refused", lambda: check_generated(good[len(header):]), "header")

    # A gem made the way RubyGems lays one out, with its spec read from canned fields.
    library = b"\x7fELF fake library"
    natives = {TARGETS[t]["rid"]: ({"sha256": sha256(library)}, library) for t in PLATFORMS}
    shared = {"README.md": b"# readme\n", f"lib/{MODULE}.rb": b"# lib\n"}

    def gem_bytes(files, tamper=None):
        inner = io.BytesIO()
        with tarfile.open(fileobj=inner, mode="w:gz") as tar:
            for name, content in sorted(files.items()):
                info = tarfile.TarInfo(name)
                info.size = len(content)
                tar.addfile(info, io.BytesIO(content))
        parts = {"metadata.gz": gzip.compress(b"--- spec\n"), "data.tar.gz": inner.getvalue()}
        digests = "".join(f"  {name}: {sha256(content)}\n" for name, content in sorted(parts.items()))
        parts["checksums.yaml.gz"] = gzip.compress(f"---\nSHA256:\n{digests}".encode())
        if tamper:
            tamper(parts)
        outer = io.BytesIO()
        with tarfile.open(fileobj=outer, mode="w:") as tar:
            for name in ("metadata.gz", "data.tar.gz", "checksums.yaml.gz"):
                info = tarfile.TarInfo(name)
                info.size = len(parts[name])
                tar.addfile(info, io.BytesIO(parts[name]))
        return outer.getvalue()

    target = "x86_64-unknown-linux-gnu"
    with tempfile.TemporaryDirectory(prefix="ruby-gem-self-test-") as tmp:
        tmp = pathlib.Path(tmp)

        def judged(files, name=None, tamper=None, **spec_changes):
            path = tmp / (name or gem_name("1.2.3", target))
            path.write_bytes(gem_bytes(files, tamper))
            files_sorted = sorted(files)
            return inspect_gem(path, target, natives, "1.2.3", shared,
                               read=lambda _: _canned_spec("1.2.3", target, files=files_sorted, **spec_changes))

        complete = dict(shared, **{library_path(target): library})
        row = judged(complete)
        check("a complete gem is accepted", row["platform"] == "x86_64-linux-gnu" and
              row["library"]["sha256"] == sha256(library))
        refused("an extra file is refused", lambda: judged(dict(complete, **{"lib/extra.rb": b""})), "beyond or short")
        refused("a missing library is refused", lambda: judged(shared), "beyond or short")
        refused("another library is refused", lambda: judged(dict(complete, **{library_path(target): b"other"})),
                "differs from its source")
        refused("a changed source is refused", lambda: judged(dict(complete, **{"README.md": b"# other\n"})),
                "differs from its source")
        refused("a wrong name is refused", lambda: judged(complete, name="qrcode-barcode-scanner-1.2.3.gem"),
                "is not named")
        refused("a wrong platform is refused", lambda: judged(complete, platform="ruby"), "platform")
        refused("a native extension is refused", lambda: judged(complete, extensions=["ext/extconf.rb"]),
                "extensions")
        refused("another licence is refused", lambda: judged(complete, licenses=["AGPL-3.0-or-later"]), "licenses")
        refused("a floating ffi is refused", lambda: judged(complete, dependencies=[["ffi", "runtime", ">= 0"]]),
                "dependencies")

        def stale_checksum(parts):
            parts["checksums.yaml.gz"] = gzip.compress(b"---\nSHA256:\n  metadata.gz: " + b"0" * 64 +
                                                       b"\n  data.tar.gz: " + b"0" * 64 + b"\n")
        refused("a stale checksum is refused", lambda: judged(complete, tamper=stale_checksum), "digest")

    def rubygems(chosen):
        def run(argv, **_):
            name = chosen(argv[-1])
            return subprocess.CompletedProcess(argv, 0, f"{GEM}-1.2.3-{name}.gem\n" if name else "", "")
        return run

    check("RubyGems gives each Ruby its gem and a musl Ruby none",
          match("feed", "1.2.3", rubygems(MATCHES.get)) == {
              platform: (f"{GEM}-1.2.3-{name}.gem" if name else None) for platform, name in MATCHES.items()})
    refused("a musl Ruby given the glibc gem is refused",
            lambda: match("feed", "1.2.3", rubygems(lambda p: "x86_64-linux-gnu" if p == "x86_64-linux-musl" else MATCHES[p])),
            "x86_64-linux-musl")
    refused("a Ruby given no gem is refused",
            lambda: match("feed", "1.2.3", rubygems(lambda p: None if "darwin" in p else MATCHES[p])), "no gem")

    context = {"GITHUB_REF": "refs/tags/v" + workspace_version(), "GITHUB_EVENT_NAME": "push",
               "GITHUB_REPOSITORY": REPOSITORY, "GITHUB_REPOSITORY_ID": REPOSITORY_ID}
    protected = {"name": ENVIRONMENT, "deployment_branch_policy": {"protected_branches": False,
                                                                  "custom_branch_policies": True},
                 "protection_rules": [{"type": "required_reviewers", "reviewers": [
                     {"type": "User", "reviewer": {"login": OWNER[0], "id": OWNER[1]}}]}]}
    tags = {"total_count": 1, "branch_policies": [{"name": "v*", "type": "tag"}]}

    def answers(env, policies):
        return lambda url: json.dumps(policies if url.endswith("policies") else env).encode()

    check("a branch run never publishes", preflight({"GITHUB_REF": "refs/heads/main"}) is False)
    check("a tag push with the environment may publish", preflight(context, answers(protected, tags)) is True)
    check("a manual run on a tag does not publish",
          preflight(dict(context, GITHUB_EVENT_NAME="workflow_dispatch"), answers(protected, tags)) is False)
    refused("a fork is refused", lambda: preflight(dict(context, GITHUB_REPOSITORY="someone/fork")), "canonical")
    refused("another tag is refused", lambda: preflight(dict(context, GITHUB_REF="refs/tags/v0.0.1")),
            "workspace version")
    refused("a missing reviewer is refused",
            lambda: preflight(context, answers(dict(protected, protection_rules=[]), tags)), "review")
    refused("a branch policy is refused", lambda: preflight(context, answers(
        protected, {"total_count": 1, "branch_policies": [{"name": "main", "type": "branch"}]})), "v* tags")
    built = {"version": "1.2.3", "gems": [{"file": gem_name("1.2.3", t), "platform": PLATFORMS[t], "sha256": t[:3] * 3}
                                         for t in PLATFORMS]}

    def held(*rows):
        return lambda _: json.dumps([{"number": number, "platform": platform, "sha": sha}
                                     for number, platform, sha in rows]).encode()

    def missing(_):
        raise urllib.error.HTTPError("https://rubygems.org", 404, "Not Found", {}, None)

    check("a new gem name leaves the five gems to push", len(pending(built, missing)) == 5)
    check("another version leaves the five gems to push", len(pending(built, held(("1.2.2", "x86_64-linux-gnu", "x")))) == 5)
    check("a stopped push resumes with the gems not held",
          pending(built, held(("1.2.3", "x86_64-linux-gnu", "x86" * 3), ("1.2.3", "aarch64-linux-gnu", "aar" * 3)))
          == [gem_name("1.2.3", t) for t in PLATFORMS if "linux" not in t])
    refused("another file under the same version is refused",
            lambda: pending(built, held(("1.2.3", "x86_64-linux-gnu", "other"))), "never replaced")
    refused("a platform this build does not make is refused",
            lambda: pending(built, held(("1.2.3", "ruby", "x"))), "not a platform of this build")
    refused("a complete version is refused",
            lambda: pending(built, held(*[("1.2.3", PLATFORMS[t], t[:3] * 3) for t in PLATFORMS])), "already holds the five")
    print(f"self-test: {'FAILED ' + str(len(failures)) if failures else 'all passed'}")
    return 1 if failures else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("command", nargs="?",
                        choices=["native", "stage", "build", "inspect", "match", "candidate", "preflight"])
    parser.add_argument("path", nargs="?", type=pathlib.Path)
    parser.add_argument("--target", choices=sorted(PLATFORMS))
    parser.add_argument("--library", type=pathlib.Path)
    parser.add_argument("--natives", type=pathlib.Path)
    parser.add_argument("--generated", type=pathlib.Path)
    parser.add_argument("--version")
    parser.add_argument("--commit", default=os.environ.get("GITHUB_SHA", ""))
    parser.add_argument("--folder", type=pathlib.Path)
    parser.add_argument("--receipt-sha256")
    parser.add_argument("--out", type=pathlib.Path)
    parser.add_argument("--require-absent", action="store_true")
    parser.add_argument("--pending", type=pathlib.Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    try:
        if args.command == "native":
            require(args.target and args.library and args.out, "native needs --target, --library and --out")
            print(json.dumps(natives_module.native(args.target, args.library, args.out), sort_keys=True))
        elif args.command == "stage":
            require(args.version and args.generated and args.out, "stage needs --version, --generated and --out")
            require((args.library is None) != (args.natives is None), "stage takes --library or --natives")
            files = stage_tree(args.version, args.generated, args.out, args.library, args.natives, args.target)
            print(f"staged {len(files)} files in {args.out}")
        elif args.command == "build":
            require(args.path and args.target and args.out, "build needs DIR, --target and --out")
            print(build(args.path, args.target, args.out))
        elif args.command == "inspect":
            require(args.path and args.natives and args.version and args.out, "inspect needs FEED and its inputs")
            report = inspect_feed(args.path, args.natives, args.version, args.commit)
            args.out.parent.mkdir(parents=True, exist_ok=True)
            args.out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            for row in report["gems"]:
                print(f"{row['sha256']}  {row['file']}")
        elif args.command == "match":
            require(args.path and args.version, "match needs FEED and --version")
            for platform, chosen in match(args.path, args.version).items():
                print(f"{platform:20} {chosen or 'no gem'}")
        elif args.command == "candidate":
            require(args.folder and args.natives and args.receipt_sha256, "candidate inputs are required")
            report = candidate(args.folder, args.natives, args.receipt_sha256)
            if args.require_absent:
                identity(os.environ)
                require(os.environ.get("GITHUB_REF") == "refs/tags/v" + report["version"], "not the engine tag")
                require(os.environ.get("GITHUB_EVENT_NAME") == "push", "not an engine tag push")
                environment()
                require(args.pending is not None, "--require-absent writes the gems to push with --pending FILE")
                left = pending(report)
                args.pending.write_text("".join(name + "\n" for name in left), encoding="utf-8")
                print(f"to push: {' '.join(left)}")
            print(json.dumps({"version": report["version"], "commit": report["commit"],
                              "gems": {row["file"]: row["sha256"] for row in report["gems"]}}, indent=2))
        elif args.command == "preflight":
            allowed = preflight(os.environ)
            with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
                output.write(f"publish_allowed={str(allowed).lower()}\n")
            print(json.dumps({"publish_allowed": allowed}))
        else:
            parser.print_usage(sys.stderr)
            return 2
    except (Refused, OSError, ValueError, KeyError, tarfile.TarError, subprocess.SubprocessError,
            urllib.error.URLError) as error:
        print(f"ruby-gem: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
