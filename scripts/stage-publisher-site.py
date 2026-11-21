#!/usr/bin/env python3
"""Stage the publisher site, qrcode-ai-com/qrcode-ai-com.github.io, from one commit of this repository.

  stage-publisher-site.py stage [--revision REV] --archive SKILL.tar.gz --out DIR
  stage-publisher-site.py verify DIR
  stage-publisher-site.py readback DIR ORIGIN [--receipt FILE]
  stage-publisher-site.py --self-test --archive SKILL.tar.gz

The site's repository is never edited by hand: `stage` writes all of it from distribution/publisher
at REV, read from git and never from the working tree:

  - each page of site.json, its body fragment from pages/ in the one layout below, as
    `<path>/index.html`, with site.css as `assets/site.css`;
  - REPOSITORY.md as README.md, mirror/ as .github/workflows/, the engine's LICENSE, `.nojekyll`;
  - the agent skill at `.well-known/agent-skills/` (Agent Skills discovery 0.2.0: index.json and
    the archive) and at `.well-known/skills/` (the older index, file by file). The archive is the
    published release file passed with --archive, never rebuilt: its sha256 must be the one
    site.json pins, and its files must equal the skill's source at the release commit;
  - SOURCE.json: the schema, this repository and REV, the skill archive, and the sha256 of every
    staged file.

Before writing, the stage checks every page: no script, frame, form, image or inline style, the
one stylesheet, the language, viewport and color-scheme declarations, each internal link and
anchor resolves in the staged tree, and each external link is a file of this repository at REV or
appears in a file of this repository outside distribution/publisher and this program (or in
site.json's short list of links read outside it). The stylesheet loads nothing.

`verify` stages the commit SOURCE.json names again, with the archive of the tree under test, and
compares: same files, same bytes, nothing else beside `.git`. `readback` reads each page, the
stylesheet and the skill files from the published ORIGIN and compares bytes and content types.
Exit 0 when the step passes, 1 when it fails, 2 for usage. Stdlib only.
"""
import argparse
import datetime
import hashlib
import html
import html.parser
import io
import json
import pathlib
import re
import subprocess
import sys
import tarfile
import tempfile
import urllib.error
import urllib.request

from satellite_stage import REPOSITORY, ROOT, Refused, git, tree

NAME = "stage-publisher-site"
SOURCE = "distribution/publisher"
PROGRAM = "scripts/stage-publisher-site.py"
SCHEMA = "qrscan-publisher-site/1"
SOURCE_SCHEMA = "qrscan-publisher-site-source/1"
DISCOVERY_SCHEMA = "https://schemas.agentskills.io/discovery/0.2.0/schema.json"
URL = re.compile(r"https?://[^\s<>\"'`()\[\]{}|\\^]+")
FORBIDDEN_TAGS = {"script", "noscript", "iframe", "frame", "frameset", "object", "embed", "applet", "form",
                  "input", "button", "img", "picture", "source", "video", "audio", "canvas", "svg", "math",
                  "style", "base", "template"}
SERVED_TYPES = {".html": ("text/html",), ".css": ("text/css",), ".json": ("application/json",),
                ".md": ("text/markdown", "text/plain"), ".mjs": ("text/javascript", "application/javascript"),
                ".gz": ("application/gzip", "application/x-gzip")}
NOT_SERVED = ("README.md", "LICENSE", "SOURCE.json", ".nojekyll")


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def commit_of(revision, root):
    try:
        return git("rev-parse", "--verify", f"{revision}^{{commit}}", root=root).decode().strip()
    except subprocess.CalledProcessError as error:
        raise Refused(f"{revision} is not a commit of this repository") from error


def source_of(commit, root):
    """The files of distribution/publisher at COMMIT and its site.json."""
    files = tree(commit, SOURCE, root)
    try:
        config = json.loads(files["site.json"])
    except (KeyError, ValueError) as error:
        raise Refused(f"{SOURCE}/site.json is missing or is not JSON at {commit}") from error
    if config.get("schema") != SOURCE_SCHEMA:
        raise Refused(f"{SOURCE}/site.json is not a {SOURCE_SCHEMA} record")
    named = {"site.json", "site.css", "REPOSITORY.md"} | {page["source"] for page in config["pages"]}
    for path in files:
        if path not in named and not path.startswith("mirror/"):
            raise Refused(f"{SOURCE}/{path} is neither a page of site.json nor a file the stage uses")
    for path in sorted(named - set(files)):
        raise Refused(f"{SOURCE}/{path} is missing at {commit}")
    return files, config


def archive_name(skill):
    return f"{skill['name']}-{skill['version']}.tar.gz"


def frontmatter(text):
    """name and description of a SKILL.md, from its leading --- block of `key: value` lines."""
    match = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if not match:
        raise Refused("SKILL.md has no frontmatter")
    fields = dict(re.findall(r"(?m)^([a-z]+): (.+)$", match[1]))
    return fields.get("name", ""), fields.get("description", "")


def skill_files(archive, skill, root):
    """The files of the published skill ARCHIVE, checked against the pin and the skill's source."""
    digest = sha256(archive)
    if digest != skill["sha256"]:
        raise Refused(f"the skill archive is not the published file: sha256 {digest}, site.json pins {skill['sha256']}")
    files = {}
    try:
        with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as bundle:
            for member in bundle.getmembers():
                name = member.name[2:] if member.name.startswith("./") else member.name
                parts = name.rstrip("/").split("/")
                if not name or name.startswith("/") or ".." in parts:
                    raise Refused(f"the skill archive holds an unsafe path: {member.name}")
                if member.isdir():
                    continue
                if not member.isfile():
                    raise Refused(f"the skill archive holds a link or a special file: {member.name}")
                files[name] = bundle.extractfile(member).read()
    except (tarfile.TarError, OSError, EOFError) as error:
        raise Refused(f"the skill archive is not a gzip tar archive: {error}") from error
    if "SKILL.md" not in files:
        raise Refused("the skill archive has no SKILL.md at its root")
    try:
        released = tree(skill["revision"], skill["path"], root)
    except subprocess.CalledProcessError as error:
        raise Refused(f"the skill's release commit {skill['revision']} is not in this clone: fetch it") from error
    if files != released:
        different = sorted(set(files) ^ set(released)) + sorted(p for p in set(files) & set(released) if files[p] != released[p])
        raise Refused(f"the skill archive differs from {skill['path']} at {skill['revision']}: {', '.join(different)}")
    name, description = frontmatter(files["SKILL.md"].decode())
    if name != skill["name"]:
        raise Refused(f"SKILL.md names {name!r}, site.json {skill['name']!r}")
    if not description or len(description) > 1024:
        raise Refused("the skill's description must hold 1 to 1024 characters")
    return files, description


def layout(config, page, body):
    """One page of the site: the shared head, header and footer around the body fragment."""
    def nav(other):
        current = ' aria-current="page"' if other is page else ""
        return f'<li><a href="{html.escape(other["url"])}"{current}>{html.escape(other["nav"])}</a></li>'
    title = page["title"] if page["url"] == "/" else f"{page['title']} · {config['product']}"
    return "\n".join([
        "<!doctype html>",
        '<html lang="en">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<meta name="color-scheme" content="light dark">',
        f"<title>{html.escape(title)} · {html.escape(config['brand'])}</title>",
        f'<meta name="description" content="{html.escape(page["description"])}">',
        '<link rel="stylesheet" href="/assets/site.css">',
        "</head>",
        "<body>",
        '<a class="skip" href="#main">Skip to the content</a>',
        "<header>",
        f'<p class="brand"><a href="/">{html.escape(config["brand"])}</a> <span>· {html.escape(config["product"])}</span></p>',
        '<nav aria-label="Site">',
        "<ul>",
        *[nav(other) for other in config["pages"]],
        "</ul>",
        "</nav>",
        "</header>",
        '<main id="main">',
        body.strip(),
        "</main>",
        "<footer>",
        f'<p>{html.escape(config["product"])} is open source. Its source code is in the '
        f'<a href="{REPOSITORY}">scanner\'s repository</a>, and this site is generated from its folder '
        f'<a href="{REPOSITORY}/tree/main/{SOURCE}">{SOURCE}</a>.</p>',
        f'<p>{html.escape(config["brand"])}: <a href="https://qrcode-ai.com/">qrcode-ai.com</a>. '
        "This site has no cookies, no analytics and no scripts.</p>",
        "</footer>",
        "</body>",
        "</html>",
        "",
    ])


class Page(html.parser.HTMLParser):
    """The tags, ids, links and stylesheets of one page, and what breaks the site's rules."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.problems, self.ids, self.links, self.counts = [], set(), [], {}
        self.lang = self.charset = self.viewport = self.scheme = None
        self.title, self.in_title, self.stylesheets = "", False, []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        self.counts[tag] = self.counts.get(tag, 0) + 1
        if tag in FORBIDDEN_TAGS:
            self.problems.append(f"a <{tag}> element")
        for name, _ in attrs:
            if name.startswith("on") or name in ("style", "srcset", "src", "formaction", "background"):
                self.problems.append(f"a {name} attribute on <{tag}>")
        if "id" in attributes:
            self.ids.add(attributes["id"])
        if tag == "html":
            self.lang = attributes.get("lang")
        elif tag == "meta":
            if "charset" in attributes:
                self.charset = (attributes["charset"] or "").lower()
            if "http-equiv" in attributes:
                self.problems.append("a <meta http-equiv>")
            if attributes.get("name") == "viewport":
                self.viewport = attributes.get("content")
            if attributes.get("name") == "color-scheme":
                self.scheme = attributes.get("content")
        elif tag == "link":
            if attributes.get("rel") != "stylesheet":
                self.problems.append(f"a <link rel={attributes.get('rel')!r}>")
            self.stylesheets.append(attributes.get("href"))
        elif tag == "a":
            if "href" not in attributes or not attributes["href"]:
                self.problems.append("a link without an address")
            else:
                self.links.append(attributes["href"])
        elif tag == "title":
            self.in_title = True

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def parse(text):
    page = Page()
    page.feed(text)
    page.close()
    return page


def served(path):
    """The URL path a staged file is served at."""
    if path == "index.html":
        return "/"
    if path.endswith("/index.html"):
        return "/" + path[: -len("index.html")]
    return "/" + path


def target_of(url, files):
    """The staged file an absolute path of this site names, or None."""
    path = url.lstrip("/")
    if path == "" or path.endswith("/"):
        path += "index.html"
    return path if path in files else None


def engine_urls(urls, commit, root):
    """The URLS that appear in a file of this repository at COMMIT, outside distribution/publisher
    and this program (whose self-test names addresses that must be refused)."""
    if not urls:
        return set()
    patterns = [argument for url in sorted(urls) for argument in ("-e", url)]
    try:
        lines = git("grep", "-I", "-h", "-F", *patterns, commit, "--", ".", f":(exclude){SOURCE}",
                    f":(exclude){PROGRAM}", root=root)
    except subprocess.CalledProcessError as error:
        if error.returncode == 1:
            return set()
        raise
    found = set()
    for line in html.unescape(lines.decode(errors="replace")).splitlines():
        found.update(match.rstrip(".,;:!?*") for match in URL.findall(line))
    return found & set(urls)


def exists(commit, path, root):
    try:
        git("cat-file", "-e", f"{commit}:{path}", root=root)
    except subprocess.CalledProcessError:
        return False
    return True


def check_pages(files, config, commit, root):
    """Every rule of the site's pages, over the staged FILES."""
    pages = {page["path"]: page for page in config["pages"]}
    parsed = {path: parse(files[path].decode()) for path in pages}
    external = set()
    for path, page in parsed.items():
        where = f"{path}"
        problems = list(page.problems)
        if page.lang != "en":
            problems.append("no lang=\"en\" on <html>")
        if page.charset != "utf-8":
            problems.append("no <meta charset=\"utf-8\">")
        if not page.viewport or "width=device-width" not in page.viewport:
            problems.append("no viewport declaration")
        if page.scheme != "light dark":
            problems.append("no color-scheme declaration for light and dark")
        if not page.title.strip():
            problems.append("an empty <title>")
        if page.counts.get("h1") != 1:
            problems.append(f"{page.counts.get('h1', 0)} <h1> elements instead of one")
        if page.counts.get("main") != 1 or "main" not in page.ids:
            problems.append("no single <main id=\"main\">")
        if page.stylesheets != ["/assets/site.css"]:
            problems.append(f"stylesheets {page.stylesheets} instead of the one /assets/site.css")
        for link in page.links:
            address, _, anchor = link.partition("#")
            if link.startswith("#"):
                if anchor not in page.ids:
                    problems.append(f"the anchor {link} names no id of the page")
            elif link.startswith("/") and not link.startswith("//"):
                target = target_of(address, files)
                if target is None:
                    problems.append(f"the link {link} names no file of the site")
                elif anchor and (target not in parsed or anchor not in parsed[target].ids):
                    problems.append(f"the link {link} names no id of {target}")
            elif link.startswith("https://"):
                external.add(address if not anchor else link)
            else:
                problems.append(f"the link {link} is neither a path of this site nor an https address")
        if problems:
            raise Refused(f"{where}: {'; '.join(problems)}")
    allowed = config.get("links_read_outside_the_engine", {})
    for url in sorted(set(allowed) - external):
        raise Refused(f"site.json lists {url} as read outside the engine, but no page links it")
    prefix = f"{REPOSITORY}/"
    found = engine_urls(external - set(allowed), commit, root)
    for url in sorted(external - set(allowed)):
        own = re.match(re.escape(prefix) + r"(?:blob|tree)/main/([^#?]+)$", url)
        if own:
            if not exists(commit, own[1], root):
                raise Refused(f"the link {url} names a path that is not in this repository at {commit}")
        elif url not in found:
            raise Refused(f"the link {url} appears in no file of this repository outside {SOURCE}")
    return sorted(external)


def check_css(text):
    for needle in ("@import", "url(", "@font-face", "expression("):
        if needle in text.lower():
            raise Refused(f"site.css uses {needle}: the stylesheet loads nothing")


def staged(revision, archive, root=ROOT):
    """The whole tree of the publisher site for REVISION and the skill ARCHIVE, as {path: bytes}."""
    commit = commit_of(revision, root)
    source, config = source_of(commit, root)
    skill = config["skill"]
    files = {}
    for page in config["pages"]:
        files[page["path"]] = layout(config, page, source[page["source"]].decode()).encode()
    files["assets/site.css"] = source["site.css"]
    files["README.md"] = source["REPOSITORY.md"]
    for path, data in source.items():
        if path.startswith("mirror/"):
            files[".github/workflows/" + path[len("mirror/"):]] = data
    try:
        files["LICENSE"] = git("show", f"{commit}:LICENSE", root=root)
    except subprocess.CalledProcessError as error:
        raise Refused(f"LICENSE is missing at {commit}") from error
    files[".nojekyll"] = b""
    members, description = skill_files(archive, skill, root)
    published = f".well-known/agent-skills/{archive_name(skill)}"
    files[published] = archive
    discovery = {"$schema": DISCOVERY_SCHEMA, "skills": [{
        "name": skill["name"], "type": "archive", "description": description,
        "url": "/" + published, "digest": f"sha256:{sha256(archive)}"}]}
    files[".well-known/agent-skills/index.json"] = (json.dumps(discovery, indent=2) + "\n").encode()
    order = ["SKILL.md"] + sorted(path for path in members if path != "SKILL.md")
    legacy = {"skills": [{"name": skill["name"], "description": description, "files": order}]}
    files[".well-known/skills/index.json"] = (json.dumps(legacy, indent=2) + "\n").encode()
    for path, data in members.items():
        files[f".well-known/skills/{skill['name']}/{path}"] = data
    check_css(files["assets/site.css"].decode())
    check_pages(files, config, commit, root)
    record = {"schema": SCHEMA, "engine": {"repository": REPOSITORY, "revision": commit},
              "skill": {"archive": skill["archive"], "sha256": skill["sha256"], "revision": skill["revision"]},
              "files": {path: sha256(data) for path, data in sorted(files.items())}}
    files["SOURCE.json"] = (json.dumps(record, indent=2) + "\n").encode()
    return files


def stage(revision, archive, out, root=ROOT):
    out = pathlib.Path(out)
    if out.exists() and any(out.iterdir()):
        raise Refused(f"{out} is not empty")
    files = staged(revision, archive, root)
    for path, data in files.items():
        target = out / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return json.loads(files["SOURCE.json"])["engine"]["revision"], len(files)


def record_of(directory):
    try:
        record = json.loads((directory / "SOURCE.json").read_text(encoding="utf-8"))
        if record["schema"] != SCHEMA or record["engine"]["repository"] != REPOSITORY:
            raise ValueError("another schema or repository")
        record["engine"]["revision"], record["files"].items()
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        raise Refused(f"SOURCE.json is not a stage record: {error}") from error
    return record


def verify(directory, root=ROOT):
    directory = pathlib.Path(directory)
    revision = record_of(directory)["engine"]["revision"]
    _, config = source_of(commit_of(revision, root), root)
    published = directory / ".well-known/agent-skills" / archive_name(config["skill"])
    if not published.is_file():
        raise Refused(f"missing {published.relative_to(directory).as_posix()}")
    expected = staged(revision, published.read_bytes(), root)
    present = {path.relative_to(directory).as_posix(): path for path in directory.rglob("*")
               if path.is_file() and ".git" not in path.relative_to(directory).parts[:1]}
    problems = [f"missing {path}" for path in sorted(set(expected) - set(present))]
    problems += [f"not from the stage: {path}" for path in sorted(set(present) - set(expected))]
    problems += [f"differs from the stage: {path}" for path in sorted(set(expected) & set(present))
                 if present[path].read_bytes() != expected[path]]
    if problems:
        raise Refused("; ".join(problems))
    return revision, len(expected)


def readback(directory, origin, receipt=None, opener=urllib.request.urlopen):
    """Read every served file of the tree in DIRECTORY from ORIGIN: same bytes, a fitting type."""
    directory = pathlib.Path(directory)
    record = record_of(directory)
    origin = origin.rstrip("/")
    results, problems = [], []
    for path in sorted(record["files"]):
        if path in NOT_SERVED or path.startswith(".github/"):
            continue
        url = origin + served(path)
        request = urllib.request.Request(url, headers={"Accept-Encoding": "identity", "User-Agent": NAME})
        try:
            with opener(request, timeout=30) as response:
                body, kind = response.read(), (response.headers.get("Content-Type") or "").split(";")[0].strip()
                status = response.status
        except urllib.error.HTTPError as error:
            body, kind, status = b"", "", error.code
        except (urllib.error.URLError, OSError) as error:
            problems.append(f"{url}: {error}")
            continue
        suffix = pathlib.PurePosixPath(path).suffix
        wanted = SERVED_TYPES.get(suffix)
        same = status == 200 and sha256(body) == record["files"][path]
        if not same:
            problems.append(f"{url}: HTTP {status}, {'other bytes' if status == 200 else 'no file'}")
        elif wanted and kind not in wanted:
            problems.append(f"{url}: served as {kind or 'no type'}, expected {' or '.join(wanted)}")
        results.append({"path": path, "url": url, "status": status, "content_type": kind, "same_bytes": same})
    document = {"schema": "qrscan-publisher-readback/1", "origin": origin,
                "engine": record["engine"], "checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "files": results, "problems": problems}
    if receipt:
        pathlib.Path(receipt).write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")
    if problems:
        raise Refused("; ".join(problems))
    return len(results)


def self_test(archive):
    """Stage HEAD and check it, then refuse each kind of tree and page the site must not hold."""
    failures = []

    def refused(name, action, needle):
        try:
            action()
        except Refused as error:
            if needle not in str(error):
                failures.append(f"{name}: refused with {error!s}, expected {needle!r}")
        else:
            failures.append(f"{name}: accepted")

    commit = commit_of("HEAD", ROOT)
    source, config = source_of(commit, ROOT)
    skill = config["skill"]
    with tempfile.TemporaryDirectory() as temporary:
        box = pathlib.Path(temporary)
        revision = None
        try:
            revision, count = stage("HEAD", archive, box / "good")
            if verify(box / "good") != (revision, count):
                failures.append("a fresh stage does not verify as itself")
        except Refused as error:
            failures.append(f"the stage of HEAD was refused: {error}")
        if revision:
            good = box / "good"
            discovery = json.loads((good / ".well-known/agent-skills/index.json").read_text())
            entry = discovery["skills"][0]
            if discovery["$schema"] != DISCOVERY_SCHEMA or entry["type"] != "archive":
                failures.append("the discovery index is not a 0.2.0 archive entry")
            if entry["digest"] != f"sha256:{sha256(archive)}" or not (good / entry["url"].lstrip("/")).is_file():
                failures.append("the discovery entry does not name the staged archive by its digest")
            legacy = json.loads((good / ".well-known/skills/index.json").read_text())["skills"][0]
            if legacy["files"][0] != "SKILL.md" or any(
                    not (good / ".well-known/skills" / legacy["name"] / path).is_file() for path in legacy["files"]):
                failures.append("the older index names a file that is not staged")
            if (good / "LICENSE").read_bytes() != (ROOT / "LICENSE").read_bytes():
                failures.append("the staged LICENSE is not the engine's")
            if not (good / ".github/workflows/check.yml").is_file() or (good / "mirror").exists():
                failures.append("the workflow sources were not staged as .github/workflows/")
            for page in config["pages"]:
                text = (good / page["path"]).read_text()
                if "<script" in text or "http://" in text:
                    failures.append(f"{page['path']} holds a script or a plain-http address")
            refused("a second stage into the same directory", lambda: stage("HEAD", archive, good), "is not empty")

            def copy(name):
                target = box / name
                for path in good.rglob("*"):
                    if path.is_file():
                        (target / path.relative_to(good)).parent.mkdir(parents=True, exist_ok=True)
                        (target / path.relative_to(good)).write_bytes(path.read_bytes())
                return target

            edited = copy("edited")
            (edited / "privacy/index.html").write_bytes((edited / "privacy/index.html").read_bytes() + b"<!-- edited -->\n")
            refused("a page edited by hand", lambda: verify(edited), "differs from the stage: privacy/index.html")
            added = copy("added")
            (added / "extra.txt").write_text("added by hand\n")
            refused("a file added by hand", lambda: verify(added), "not from the stage: extra.txt")
            removed = copy("removed")
            (removed / "LICENSE").unlink()
            refused("a missing file", lambda: verify(removed), "missing LICENSE")
            swapped = copy("swapped")
            published = swapped / ".well-known/agent-skills" / archive_name(skill)
            published.write_bytes(published.read_bytes() + b"\0")
            refused("another skill archive", lambda: verify(swapped), "is not the published file")
            unarchived = copy("unarchived")
            (unarchived / ".well-known/agent-skills" / archive_name(skill)).unlink()
            refused("no skill archive", lambda: verify(unarchived), f"missing .well-known/agent-skills/{archive_name(skill)}")
            other = copy("other")
            record = json.loads((good / "SOURCE.json").read_text())
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

            # Each page rule, on the good tree with one page changed.
            files = {path.relative_to(good).as_posix(): path.read_bytes() for path in good.rglob("*") if path.is_file()}
            index = files["index.html"].decode()

            def with_index(text):
                return lambda: check_pages(dict(files, **{"index.html": text.encode()}), config, commit, ROOT)

            refused("a script", with_index(index.replace("</main>", "<script>1</script></main>")), "a <script> element")
            refused("an image", with_index(index.replace("</main>", '<img alt="" src="/x.png"></main>')), "a <img> element")
            refused("an event handler", with_index(index.replace("<main ", '<main onclick="x()" ')), "a onclick attribute")
            refused("a second stylesheet",
                    with_index(index.replace("</head>", '<link rel="stylesheet" href="https://example.com/a.css"></head>')),
                    "instead of the one /assets/site.css")
            refused("an address read nowhere in the engine",
                    with_index(index.replace("</main>", '<a href="https://example.com/not-in-the-engine">x</a></main>')),
                    "appears in no file of this repository")
            refused("a repository file that does not exist",
                    with_index(index.replace("</main>", f'<a href="{REPOSITORY}/blob/main/no/such/file.md">x</a></main>')),
                    "names a path that is not in this repository")
            refused("a link to no page", with_index(index.replace("</main>", '<a href="/nowhere/">x</a></main>')),
                    "names no file of the site")
            refused("an anchor to no id", with_index(index.replace("</main>", '<a href="/privacy/#nowhere">x</a></main>')),
                    "names no id of privacy/index.html")
            refused("a plain-http address", with_index(index.replace("</main>", '<a href="http://example.com/">x</a></main>')),
                    "neither a path of this site nor an https address")
            refused("no color-scheme", with_index(index.replace('<meta name="color-scheme" content="light dark">', "")),
                    "no color-scheme declaration")
            refused("a stylesheet that loads a font", lambda: check_css("@font-face { font-family: x; }"), "@font-face")
            refused("a stylesheet that imports", lambda: check_css('@import "https://example.com/a.css";'), "@import")

            # The skill archive: one changed file, with a pin that matches it, still differs from
            # the skill's source at the release commit.
            buffer = io.BytesIO()
            members, _ = skill_files(archive, skill, ROOT)
            with tarfile.open(fileobj=buffer, mode="w:gz") as bundle:
                for path, data in sorted(members.items()):
                    if path == "SKILL.md":
                        data += b"\nChanged after the release.\n"
                    info = tarfile.TarInfo(path)
                    info.size = len(data)
                    bundle.addfile(info, io.BytesIO(data))
            forged = buffer.getvalue()
            refused("an archive whose files differ from the release commit",
                    lambda: skill_files(forged, dict(skill, sha256=sha256(forged)), ROOT), "differs from")
            buffer = io.BytesIO()
            with tarfile.open(fileobj=buffer, mode="w:gz") as bundle:
                info = tarfile.TarInfo("SKILL.md")
                info.type, info.linkname = tarfile.SYMTYPE, "/etc/passwd"
                bundle.addfile(info)
            linked = buffer.getvalue()
            refused("an archive with a link", lambda: skill_files(linked, dict(skill, sha256=sha256(linked)), ROOT),
                    "a link or a special file")
        refused("a revision that does not exist",
                lambda: stage("0000000000000000000000000000000000000000", archive, box / "none"), "is not a commit")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'FAILED' if failures else 'ok'} (the stage of HEAD, 7 refused trees, 12 refused pages "
          "or stylesheets, 2 refused archives, 1 refused revision)")
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--archive", help="the published skill archive that site.json pins")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("stage", help="write the site's tree from one commit")
    one.add_argument("--revision", default="HEAD")
    one.add_argument("--archive", dest="stage_archive", required=True)
    one.add_argument("--out", required=True)
    two = commands.add_parser("verify", help="check that a tree is exactly the stage of the commit it names")
    two.add_argument("directory")
    three = commands.add_parser("readback", help="check that a published origin serves the tree")
    three.add_argument("directory")
    three.add_argument("origin")
    three.add_argument("--receipt")
    args = parser.parse_args()
    try:
        if args.self_test:
            if not args.archive:
                parser.error("--self-test needs --archive")
            return self_test(pathlib.Path(args.archive).read_bytes())
        if args.command == "stage":
            revision, count = stage(args.revision, pathlib.Path(args.stage_archive).read_bytes(), args.out)
            print(f"staged {count} files from {revision} into {args.out}")
        elif args.command == "verify":
            revision, count = verify(args.directory)
            print(f"ok    {count} files equal the stage of {revision}")
        elif args.command == "readback":
            count = readback(args.directory, args.origin, args.receipt)
            print(f"ok    {args.origin} serves the {count} published files of this tree")
        else:
            parser.print_usage(sys.stderr)
            return 2
    except Refused as error:
        print(f"{NAME}: {error}", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"{NAME}: {error}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        print(f"{NAME}: git failed: {error.stderr.decode(errors='replace').strip()}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
