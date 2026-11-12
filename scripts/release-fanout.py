#!/usr/bin/env python3
"""Keep every pinned release value of this repository equal to its source.

  release-fanout.py check [--list KIND]
  release-fanout.py render [--engine vX.Y.Z.json]
  release-fanout.py --self-test

Many files name the engine version or a hash of the public release: install lines, links to a
tag, recipes, consumer checks. `distribution/releases/pins.toml` says, for each tracked file
that does, what its mentions follow:

  tree     the version of this source, the workspace version of Cargo.toml: what a package
           says of itself, written in the release commit, before the tag;
  engine   the public engine release, the manifest that pins.toml names: what is claimed or
           consumed once the release is public;
  held     a destination with its own publication (a package repository, the container image,
           the hosted examples, the agent integrations): it moves when that destination does;
  keep     a statement that never moves: history, or the version of another product;
  frozen   a whole file that is a dated record or is written by another tool.

pins.toml itself and the manifests are this program's inputs and are never judged.

`check` reads every tracked file and fails when a file that names a release version is not
classified, when a mention differs from what it follows, when a hash of a manifest appears
where no rule pins it, or when a rule of pins.toml matches nothing any more. `--list KIND`
prints the mentions of one kind (tree, engine, held, keep) for review. `--list lines` prints
what no program can rewrite: the lines that follow a source and name a release line without
its last number, such as "the 0.11 changelog". Read them by hand at each release.

`render` rewrites the tree and engine mentions and the pinned values to their sources and
changes nothing else. `--engine FILE` first makes FILE, a manifest of distribution/releases/,
the public release that pins.toml names. A release is then one command and one pull request
to read, not a search through the repository.

Stdlib and git only. Exit 0 when the step passes, 1 when it fails, 2 for usage.
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys
import tomllib

ROOT = pathlib.Path(__file__).resolve().parents[1]
RELEASES = "distribution/releases"
PINS = f"{RELEASES}/pins.toml"
SCHEMA = "qrscan-release-pins/1"
MANIFEST_SCHEMA = "qrscan-release-manifest/1"
MANIFEST_NAME = re.compile(r"v\d+\.\d+\.\d+\.json")
WORKSPACE_VERSION = re.compile(r'(?m)^\[workspace\.package\]\nversion = "(\d+\.\d+\.\d+)"$')
ENGINE_LINE = re.compile(r'(?m)^(\[engine\]\nmanifest = ")([^"\n]*)(")$')
DIGEST = re.compile(r"[0-9a-f]{64}|[0-9a-f]{40}|sha512-[A-Za-z0-9+/]{86}==")
KINDS = ("tree", "engine", "held", "keep")
LISTS = (*KINDS, "lines")


class Refused(Exception):
    """pins.toml or a manifest cannot be read."""


def require(condition, message):
    if not condition:
        raise Refused(message)


def glob(pattern):
    """`*` stays inside one path segment, `**` crosses segments."""
    parts = re.split(r"(\*\*|\*)", pattern)
    return re.compile("".join(".*" if part == "**" else "[^/]*" if part == "*" else re.escape(part)
                              for part in parts))


def mention(versions):
    """A release version as a whole token: not a part of a longer number."""
    numbers = "|".join(re.escape(version) for version in sorted(versions, reverse=True))
    return re.compile(rf"(?<![0-9.])(?:{numbers})(?![0-9]|\.[0-9])")


# ------------------------------------------------------------------ the rules

class Rules:
    """pins.toml, read strictly: an unknown key, kind or train is refused."""

    def __init__(self, text):
        try:
            data = tomllib.loads(text)
        except tomllib.TOMLDecodeError as error:
            raise Refused(f"{PINS} is not TOML: {error}") from error
        require(data.pop("schema", None) == SCHEMA, f"{PINS} must say schema = \"{SCHEMA}\"")
        engine = data.pop("engine", {})
        self.manifest = engine.get("manifest")
        require(set(engine) == {"manifest"} and MANIFEST_NAME.fullmatch(str(self.manifest)),
                f"{PINS}: [engine] names one manifest, as manifest = \"vX.Y.Z.json\"")
        self.files, self.lines, self.values = [], [], []
        for index, entry in enumerate(data.pop("frozen", []), 1):
            self.files.append(self.file_rule(f"frozen {index}", entry, "frozen", entry.pop("why", None)))
        for index, entry in enumerate(data.pop("file", []), 1):
            kind, label = self.outcome(f"file {index}", entry, ("train", "held"))
            self.files.append(self.file_rule(f"file {index}", entry, kind, label))
        for index, entry in enumerate(data.pop("line", []), 1):
            name = f"line {index}"
            kind, label = self.outcome(name, entry, ("train", "held", "keep"))
            paths = [glob(path) for path in entry.pop("paths", ["**"])]
            self.lines.append({"name": name, "kind": kind, "label": label, "paths": paths,
                               "match": self.pattern(name, entry.pop("match", None)), "used": 0})
            require(not entry, f"{PINS}: {name} has unknown keys {sorted(entry)}")
        for index, entry in enumerate(data.pop("value", []), 1):
            name = f"value {index}"
            require(("fact" in entry) != ("facts" in entry), f"{PINS}: {name} needs fact or facts, not both")
            each = "fact" in entry  # one fact: every match holds it; several: the matches hold them in order
            facts = [entry.pop("fact")] if each else entry.pop("facts")
            require(isinstance(facts, list) and facts and all(isinstance(fact, str) and fact for fact in facts),
                    f"{PINS}: {name} names no fact")
            pattern = self.pattern(name, entry.pop("match", None))
            require(pattern.groups == 1, f"{PINS}: {name} needs exactly one group, the pinned value")
            paths = entry.pop("paths", None)
            require(isinstance(paths, list) and paths, f"{PINS}: {name} names no path")
            self.values.append({"name": name, "facts": facts, "each": each, "paths": paths, "match": pattern})
            require(not entry, f"{PINS}: {name} has unknown keys {sorted(entry)}")
        require(not data, f"{PINS} has unknown tables {sorted(data)}")

    @staticmethod
    def pattern(name, text):
        require(isinstance(text, str) and text, f"{PINS}: {name} has no match")
        try:
            return re.compile(text)
        except re.error as error:
            raise Refused(f"{PINS}: {name} has an unreadable match: {error}") from error

    @staticmethod
    def outcome(name, entry, allowed):
        given = [key for key in allowed if key in entry]
        require(len(given) == 1, f"{PINS}: {name} needs exactly one of {', '.join(allowed)}")
        label = entry.pop(given[0])
        require(isinstance(label, str) and label, f"{PINS}: {name} has an empty {given[0]}")
        if given[0] == "train":
            require(label in ("tree", "engine"), f"{PINS}: {name} names an unknown train: {label}")
            return label, label
        return given[0], label

    @staticmethod
    def file_rule(name, entry, kind, label):
        paths = entry.pop("paths", None)
        require(isinstance(paths, list) and paths, f"{PINS}: {name} names no path")
        require(isinstance(label, str) and label, f"{PINS}: {name} does not say why")
        require(not entry, f"{PINS}: {name} has unknown keys {sorted(entry)}")
        return {"name": name, "kind": kind, "label": label,
                "paths": [{"text": path, "glob": glob(path), "used": 0} for path in paths]}

    def of_file(self, path):
        """Every file rule that claims PATH, as (rule, its pattern). A frozen file is not read further."""
        claims = [(rule, pattern) for rule in self.files for pattern in rule["paths"]
                  if pattern["glob"].fullmatch(path)]
        frozen = [claim for claim in claims if claim[0]["kind"] == "frozen"]
        return frozen[:1] or claims

    def of_line(self, path, line):
        return [rule for rule in self.lines
                if any(pattern.fullmatch(path) for pattern in rule["paths"]) and rule["match"].search(line)]


# ------------------------------------------------------------------ the sources

def lookup(manifest, fact):
    """A value of a manifest by its path, written `a > b > c`, with {version} in a file name."""
    value = manifest
    for key in fact.split(" > "):
        key = key.replace("{version}", manifest["version"])
        require(isinstance(value, dict) and key in value,
                f"manifest {manifest['tag']} has no {fact!r}")
        value = value[key]
    require(isinstance(value, (str, int)) and not isinstance(value, bool),
            f"manifest {manifest['tag']}: {fact!r} is not one value")
    return str(value)


def leaves(value):
    if isinstance(value, dict):
        for inner in value.values():
            yield from leaves(inner)
    else:
        yield value


class Sources:
    """What the mentions follow: the workspace version, and the manifests of distribution/releases."""

    def __init__(self, files, rules):
        workspace = WORKSPACE_VERSION.search(files.get("Cargo.toml", ""))
        require(workspace, "Cargo.toml has no [workspace.package] version")
        self.manifests = {}
        for path, text in files.items():
            if own_input(path) and path != PINS:
                try:
                    manifest = json.loads(text)
                    told = (manifest["schema"], f"{manifest['tag']}.json", f"v{manifest['version']}.json")
                except (ValueError, KeyError, TypeError) as error:
                    raise Refused(f"{path} is not a release manifest: {error!r}") from error
                name = path[len(RELEASES) + 1:]
                require(told == (MANIFEST_SCHEMA, name, name), f"{path} does not describe its own name")
                self.manifests[name] = manifest
        require(rules.manifest in self.manifests, f"{PINS} names {rules.manifest}, which {RELEASES}/ lacks")
        self.engine = self.manifests[rules.manifest]
        self.version = {"tree": workspace[1], "engine": self.engine["version"]}
        self.mention = mention({self.version["tree"], *(m["version"] for m in self.manifests.values())})
        # Every digest any manifest holds: an old one left in a recipe is as wrong as a new one unpinned.
        self.digests = {value for manifest in self.manifests.values() for value in leaves(manifest)
                        if isinstance(value, str) and DIGEST.fullmatch(value)}


def own_input(path):
    """pins.toml and the manifests: what this program reads is never one of the files it judges."""
    return path == PINS or (path.startswith(RELEASES + "/") and bool(MANIFEST_NAME.fullmatch(path[len(RELEASES) + 1:])))


# ------------------------------------------------------------------ the plan

def plan(files, rules, sources):
    """(the files that must change, as {path: new text}; the problems; every mention with its kind)."""
    changed, problems, mentions = {}, [], []
    pinned = {}
    for rule in rules.values:
        for path in rule["paths"]:
            pinned.setdefault(path, []).append(rule)
            if path not in files:
                problems.append(f"{PINS}: {rule['name']} names {path}, which is not a tracked text file")
    for path, text in sorted(files.items()):
        if own_input(path):
            continue
        claims = rules.of_file(path)
        for rule, pattern in claims:
            pattern["used"] += 1
        names = bool(sources.mention.search(text))
        if not claims:
            if names:
                line = next(n for n, row in enumerate(text.split("\n"), 1) if sources.mention.search(row))
                problems.append(f"{path}:{line} names a release version, and no rule of {PINS} classifies the file")
            if path in pinned:
                problems.append(f"{path} holds a pinned value, and no rule of {PINS} classifies the file")
            continue
        if len(claims) > 1:
            problems.append(f"{path} is classified twice: {', '.join(rule['name'] for rule, _ in claims)}")
            continue
        default = claims[0][0]
        if default["kind"] == "frozen":
            if path in pinned:
                problems.append(f"{path} is frozen and holds a pinned value: one of the two is wrong")
            continue
        if not names and path not in pinned and not any(
                match[0] in sources.digests for match in DIGEST.finditer(text)):
            continue
        rows = text.split("\n")
        counts = {rule["name"]: 0 for rule in pinned.get(path, [])}
        for number, row in enumerate(rows, 1):
            found = list(sources.mention.finditer(row))
            digests = [match for match in DIGEST.finditer(row) if match[0] in sources.digests]
            values = [(rule, match) for rule in pinned.get(path, []) for match in rule["match"].finditer(row)]
            if not (found or digests or values):
                continue
            matching = rules.of_line(path, row)
            for rule in matching:
                rule["used"] += 1
            # Two reasons to keep a line agree; two destinations that hold it do not.
            outcomes = {(rule["kind"], rule["label"] if rule["kind"] == "held" else None) for rule in matching}
            if len(outcomes) > 1:
                problems.append(f"{path}:{number} matches rules that disagree: "
                                f"{', '.join(rule['name'] for rule in matching)}")
                continue
            kind, label = (matching[0]["kind"], matching[0]["label"]) if matching else (default["kind"], default["label"])
            follows = kind in sources.version
            mentions.extend((kind, label, path, number, row.strip()) for _ in found)
            edits, claimed = [], []
            for rule, match in values:
                if not follows:
                    problems.append(f"{path}:{number} holds a value of {rule['name']} on a line that is {kind}")
                    continue
                index, counts[rule["name"]] = counts[rule["name"]], counts[rule["name"]] + 1
                claimed.append(match.span(1))
                if rule["each"] or index < len(rule["facts"]):
                    wanted = lookup(sources.engine, rule["facts"][0 if rule["each"] else index])
                    if match[1] != wanted:
                        edits.append((match.span(1), wanted, f"{rule['name']} pins {wanted}"))
            if follows:
                for match in found:
                    if match[0] != sources.version[kind] and not any(
                            start <= match.start() < end for start, end in claimed):
                        edits.append((match.span(), sources.version[kind],
                                      f"the {kind} version is {sources.version[kind]}"))
                for match in digests:
                    if not any(start <= match.start() and match.end() <= end for start, end in claimed):
                        problems.append(f"{path}:{number} holds {match[0][:16]}…, a hash of a release manifest, "
                                        f"and no value rule of {PINS} pins it")
            for (start, end), wanted, reason in sorted(edits, reverse=True):
                problems.append(f"{path}:{number} reads {row[start:end]}: {reason}")
                row = row[:start] + wanted + row[end:]
            rows[number - 1] = row
        for rule in pinned.get(path, []):
            wanted = None if rule["each"] else len(rule["facts"])
            if counts[rule["name"]] == 0 or wanted not in (None, counts[rule["name"]]):
                problems.append(f"{PINS}: {rule['name']} finds {counts[rule['name']]} value(s) in {path}"
                                + (f", not {wanted}" if wanted else ""))
        if "\n".join(rows) != text:
            changed[path] = "\n".join(rows)
    for rule in rules.files:
        for pattern in rule["paths"]:
            if not pattern["used"]:
                problems.append(f"{PINS}: {rule['name']} names {pattern['text']}, which matches no tracked file")
    for rule in rules.lines:
        if not rule["used"]:
            problems.append(f"{PINS}: {rule['name']} matches no mention of a release version")
    return changed, problems, mentions


def judge(files):
    rules = Rules(files.get(PINS) or "")
    sources = Sources(files, rules)
    return rules, sources, plan(files, rules, sources)


# ------------------------------------------------------------------ the tree

def tracked(root=ROOT):
    """{path: text} of every file that is text and that git tracks or would add."""
    listing = subprocess.run(["git", "-C", str(root), "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
                             capture_output=True, check=True).stdout
    files = {}
    for path in filter(None, listing.decode("utf-8").split("\0")):
        try:
            data = (root / path).read_bytes()
        except OSError:  # a path git tracks and the checkout lacks, such as a submodule
            continue
        if b"\0" in data:
            continue
        try:
            files[path] = data.decode("utf-8")
        except UnicodeDecodeError:
            continue
    return files


def release_lines(files, rules, sources):
    """(path, number, row) of each following line that names a release line without its last number."""
    lines = {".".join(version.split(".")[:2]) for version in
             (sources.version["tree"], *(manifest["version"] for manifest in sources.manifests.values()))}
    short = re.compile(r"(?<![0-9.])(?:" + "|".join(map(re.escape, sorted(lines))) + r")(?![0-9]|\.[0-9])")
    for path, text in sorted(files.items()):
        claims = rules.of_file(path)
        if len(claims) != 1 or claims[0][0]["kind"] not in sources.version or not short.search(text):
            continue
        for number, row in enumerate(text.split("\n"), 1):
            if short.search(row) and not any(rule["kind"] not in sources.version for rule in rules.of_line(path, row)):
                yield path, number, row.strip()


def command_check(root, kind):
    files = tracked(root)
    rules, sources, (_, problems, mentions) = judge(files)
    if kind == "lines":
        for path, number, row in release_lines(files, rules, sources):
            print(f"{path}:{number}\t{row[:150]}")
        return 0
    if kind:
        for found, label, path, number, row in mentions:
            if found == kind:
                print(f"{label}\t{path}:{number}\t{row[:150]}")
        return 0
    for problem in problems:
        print(problem)
    counts = {kind: sum(1 for found in mentions if found[0] == kind) for kind in KINDS}
    print(f"tree {sources.version['tree']} · engine {sources.engine['tag']} · "
          + " · ".join(f"{count} {kind}" for kind, count in counts.items())
          + f" · {len(problems)} problem(s)")
    return 1 if problems else 0


def command_render(root, engine):
    files = tracked(root)
    if engine:
        require(MANIFEST_NAME.fullmatch(engine), "name the manifest as vX.Y.Z.json")
        text, count = ENGINE_LINE.subn(lambda match: match[1] + engine + match[3], files.get(PINS, ""))
        require(count == 1, f"{PINS} has no [engine] manifest line to rewrite")
        files[PINS] = text
    _, _, (changed, problems, _) = judge(files)
    if engine:
        changed[PINS] = files[PINS]
    for path, text in changed.items():
        (root / path).write_text(text, encoding="utf-8")
    files.update(changed)
    _, _, (again, left, _) = judge(files)
    require(not again, f"render did not settle: {sorted(again)} would change again")
    print(f"{len(changed)} file(s) rewritten, {len(problems) - len(left)} value(s)")
    for problem in left:
        print(problem)
    return 1 if left else 0


# ------------------------------------------------------------------ self-test

def sample():
    """A small tree with one mention of each kind."""
    old, digest = "1.2.3", "a" * 64
    manifest = {"schema": MANIFEST_SCHEMA, "tag": f"v{old}", "version": old, "commit": "c" * 40,
                "source_date_epoch": 1_700_000_000,
                "release": {"checksums": {"sha256": digest},
                            "assets": {f"cli-{old}-linux.tar.gz": {"sha256": "b" * 64},
                                       f"cli-{old}-windows.zip": {"sha256": "d" * 64}}}}
    pins = f'''schema = "{SCHEMA}"

[engine]
manifest = "v{old}.json"

[[frozen]]
why = "history"
paths = ["CHANGELOG.md"]

[[file]]
train = "tree"
paths = ["Cargo.toml", "crates/*/README.md"]

[[file]]
train = "engine"
paths = ["README.md", "recipe/build.sh"]

[[file]]
held = "examples"
paths = ["examples/requirements.txt"]

[[line]]
keep = "history of the rename"
match = 'From 1\\.2\\.3'

[[line]]
held = "debian"
match = 'linux-packages-v'

[[value]]
fact = "release > checksums > sha256"
paths = ["recipe/build.sh"]
match = 'checksums=([0-9a-f]{{64}})'

[[value]]
facts = ["release > assets > cli-{{version}}-linux.tar.gz > sha256", "release > assets > cli-{{version}}-windows.zip > sha256"]
paths = ["recipe/build.sh"]
match = 'archive=([0-9a-f]{{64}})'

[[value]]
fact = "source_date_epoch"
paths = ["recipe/build.sh"]
match = 'epoch=([0-9]+)'
'''
    return {
        PINS: pins,
        f"{RELEASES}/v{old}.json": json.dumps(manifest),
        "Cargo.toml": f'[workspace.package]\nversion = "{old}"\n\n[dependencies]\nother = "=10.{old}"\n',
        "CHANGELOG.md": f"## {old}\n",
        "crates/core/README.md": f"[API](https://example.org/blob/v{old}/docs/api.md)\n",
        "crates/core/src/lib.rs": "fn main() {}\n",
        "README.md": (f"Install version {old}: `tool@{old}`.\nFrom {old} the packages carry new names.\n"
                      f"The [Debian package](https://example.org/releases/tag/linux-packages-v{old}) is {old}-1.\n"),
        "recipe/build.sh": (f"version={old}\nchecksums={digest}\narchive={'b' * 64}\narchive={'d' * 64}\n"
                            "epoch=1700000000\n"),
        "examples/requirements.txt": f"tool=={old} --hash=sha256:{'b' * 64}\n",
    }, manifest


def self_test():
    checks = []

    def check(label, passed, detail=""):
        checks.append((label, bool(passed), detail))

    def problems_of(files):
        try:
            return judge(files)[2][1]
        except Refused as error:
            return [f"refused: {error}"]

    def expect(label, files, words):
        found = problems_of(files)
        check(label, any(words in problem for problem in found), "; ".join(found) or "no problem reported")

    files, manifest = sample()
    _, _, (changed, problems, mentions) = judge(files)
    check("a tree that agrees with its sources has no problem", not problems and not changed, "; ".join(problems))
    check("each mention is counted under its kind",
          sorted((kind, path) for kind, _, path, _, _ in mentions)
          == [("engine", "README.md"), ("engine", "README.md"), ("engine", "recipe/build.sh"),
              ("held", "README.md"), ("held", "README.md"), ("held", "examples/requirements.txt"),
              ("keep", "README.md"), ("tree", "Cargo.toml"), ("tree", "crates/core/README.md")],
          str(sorted((kind, path) for kind, _, path, _, _ in mentions)))
    check("a longer number that contains the version is not a mention",
          not any("10.1.2.3" in row for _, _, _, _, row in mentions))

    def with_file(path, text):
        return {**files, path: text}

    expect("a file that names the version must be classified",
           with_file("docs/guide.md", "Use 1.2.3.\n"), "docs/guide.md:1 names a release version")
    expect("a file may be classified once only",
           with_file(PINS, files[PINS].replace('paths = ["README.md", "recipe/build.sh"]',
                                               'paths = ["README.md", "recipe/build.sh", "crates/**"]')),
           "crates/core/README.md is classified twice")
    expect("a rule whose file is gone is reported",
           {path: text for path, text in files.items() if path != "CHANGELOG.md"}, "matches no tracked file")
    expect("a line rule that matches nothing is reported",
           with_file("README.md", files["README.md"].replace("From 1.2.3 the packages carry new names.\n", "")),
           "line 1 matches no mention")
    expect("two line rules that disagree are reported",
           with_file("README.md", files["README.md"] + "From 1.2.3 see linux-packages-v1.2.3.\n"),
           "matches rules that disagree")
    expect("a hash of the manifest outside any value rule is reported",
           with_file("README.md", files["README.md"] + f"Checksum {'b' * 64}.\n"), "no value rule")
    expect("a pinned value that left the manifest is reported",
           with_file("recipe/build.sh", files["recipe/build.sh"].replace("a" * 64, "0" * 64)),
           f"recipe/build.sh:2 reads {'0' * 64}")
    expect("the values of an ordered rule are judged in order",
           with_file("recipe/build.sh", files["recipe/build.sh"].replace(f"archive={'b' * 64}\narchive={'d' * 64}",
                                                                         f"archive={'d' * 64}\narchive={'b' * 64}")),
           f"recipe/build.sh:3 reads {'d' * 64}")
    expect("an ordered rule that finds another number of values is reported",
           with_file("recipe/build.sh", files["recipe/build.sh"].replace(f"archive={'d' * 64}\n", "")),
           "finds 1 value(s) in recipe/build.sh, not 2")
    expect("a value rule that finds nothing is reported",
           with_file("recipe/build.sh", files["recipe/build.sh"].replace("epoch=", "date=")),
           "value 3 finds 0 value(s)")
    expect("a frozen file cannot hold a pinned value",
           with_file(PINS, files[PINS].replace('paths = ["CHANGELOG.md"]', 'paths = ["CHANGELOG.md", "recipe/build.sh"]')
                     .replace('paths = ["README.md", "recipe/build.sh"]', 'paths = ["README.md"]')),
           "is frozen and holds a pinned value")
    for label, old, new, words in (
            ("an unknown key", "[[frozen]]\nwhy", "[[frozen]]\nwhen = 1\nwhy", "unknown keys"),
            ("an unknown train", 'train = "tree"', 'train = "main"', "unknown train"),
            ("a frozen rule with no reason", 'why = "history"\n', "", "does not say why"),
            ("a value rule with two groups", "checksums=([0-9a-f]{64})", "(checksums)=([0-9a-f]{64})", "exactly one group"),
            ("a manifest that is not there", 'manifest = "v1.2.3.json"', 'manifest = "v9.9.9.json"', "lacks"),
            ("a fact the manifest lacks", "release > checksums > sha256", "release > checksums > sha1", "has no"),
            ("another schema", SCHEMA, "qrscan-release-pins/0", "must say schema")):
        expect(f"pins.toml with {label} is refused", with_file(PINS, files[PINS].replace(old, new, 1)), words)

    # A release, in its two steps.
    new = "1.3.0"
    bumped = with_file("Cargo.toml", files["Cargo.toml"].replace('version = "1.2.3"', f'version = "{new}"'))
    _, _, (changed, problems, _) = judge(bumped)
    check("the release commit moves what the source says of itself, and nothing else",
          set(changed) == {"crates/core/README.md"} and f"blob/v{new}/" in changed["crates/core/README.md"],
          str(sorted(changed)))
    check("until it is rendered, check names the stale mention",
          any("crates/core/README.md:1 reads 1.2.3: the tree version is 1.3.0" in problem for problem in problems))
    bumped.update(changed)
    check("a rendered tree has no problem left", not problems_of(bumped), "; ".join(problems_of(bumped)))

    public = json.loads(json.dumps(manifest).replace("1.2.3", new).replace("a" * 64, "e" * 64)
                        .replace("b" * 64, "f" * 64).replace("1700000000", "1800000000"))
    released = {**bumped, f"{RELEASES}/v{new}.json": json.dumps(public),
                PINS: bumped[PINS].replace('manifest = "v1.2.3.json"', f'manifest = "v{new}.json"')}
    _, _, (changed, problems, _) = judge(released)
    readme, recipe = changed.get("README.md", ""), changed.get("recipe/build.sh", "")
    check("the public release moves the claims and the recipes", set(changed) == {"README.md", "recipe/build.sh"},
          str(sorted(changed)))
    check("an install line follows, history and a held destination stay",
          f"Install version {new}: `tool@{new}`." in readme and "From 1.2.3 the packages" in readme
          and "linux-packages-v1.2.3) is 1.2.3-1." in readme, readme)
    check("a recipe takes its version, its hashes in order and its date from the new manifest",
          recipe == f"version={new}\nchecksums={'e' * 64}\narchive={'f' * 64}\narchive={'d' * 64}\nepoch=1800000000\n",
          recipe)
    released.update(changed)
    check("the released tree has no problem left", not problems_of(released), "; ".join(problems_of(released)))
    expect("a claim ahead of the public release is reported",
           {**files, "README.md": files["README.md"].replace("Install version 1.2.3", f"Install version {new}"),
            f"{RELEASES}/v{new}.json": json.dumps(public)},
           "README.md:1 reads 1.3.0: the engine version is 1.2.3")
    expect("a hash of an earlier release left in a recipe is reported",
           {**released, "recipe/build.sh": released["recipe/build.sh"] + f"old={'a' * 64}\n"}, "no value rule")

    # The real tree, and a rehearsal of its next release, in memory.
    real = tracked()
    rules, sources, (changed, problems, mentions) = judge(real)
    check("this repository agrees with its sources", not problems and not changed, "; ".join(problems[:5]))
    major, minor, _ = map(int, sources.version["engine"].split("."))
    nxt = f"{major}.{minor + 1}.0"
    stand_in = json.loads(json.dumps(sources.engine).replace(sources.version["engine"], nxt))
    renamed = {}

    def swap(value):
        if isinstance(value, dict):
            return {key: swap(inner) for key, inner in value.items()}
        if isinstance(value, str) and DIGEST.fullmatch(value):
            renamed[value] = value[:-8] + "00000000" if not value.startswith("sha512-") else value[:-10] + "AAAAAAAA=="
            return renamed[value]
        return value

    stand_in = swap(stand_in)
    rehearsal = {**real, f"{RELEASES}/v{nxt}.json": json.dumps(stand_in),
                 PINS: ENGINE_LINE.sub(lambda match: match[1] + f"v{nxt}.json" + match[3], real[PINS]),
                 "Cargo.toml": WORKSPACE_VERSION.sub(lambda match: match[0].replace(match[1], nxt), real["Cargo.toml"])}
    _, _, (changed, problems, _) = judge(rehearsal)
    rehearsal.update(changed)
    after_rules, after_sources, (again, left, after) = judge(rehearsal)
    check(f"a rehearsal of {nxt} settles in one render", not again and not left, "; ".join(left[:5]))
    check("the rehearsal moves every tree and engine mention",
          all(nxt in row for kind, _, _, _, row in after if kind in ("tree", "engine")))
    check("the rehearsal leaves every held and kept mention as it was",
          [found for found in after if found[0] in ("held", "keep")]
          == [found for found in mentions if found[0] in ("held", "keep")])
    frozen = [path for path in real if any(rule["kind"] == "frozen" for rule, _ in rules.of_file(path))]
    check("the rehearsal changes no frozen file", frozen and not any(path in changed for path in frozen))
    check("the rehearsal writes hashes of the new manifest",
          any(digest in text for text in changed.values() for digest in renamed.values()))

    failed = [(label, detail) for label, passed, detail in checks if not passed]
    for label, detail in failed:
        print(f"FAIL {label}" + (f": {detail}" if detail else ""))
    print(f"self-test: {len(checks) - len(failed)}/{len(checks)} checks passed")
    return 1 if failed else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    check_command = commands.add_parser("check")
    check_command.add_argument("--list", choices=LISTS)
    render_command = commands.add_parser("render")
    render_command.add_argument("--engine")
    args = parser.parse_args(argv)
    try:
        if args.self_test:
            return self_test()
        if args.command == "check":
            return command_check(ROOT, args.list)
        if args.command == "render":
            return command_render(ROOT, args.engine)
    except Refused as error:
        print(f"refused: {error}", file=sys.stderr)
        return 1
    parser.print_usage(sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
