#!/usr/bin/env python3
"""The Maven Central bundle of the Android binding: the upload zip, and its inspection.

  maven-central-bundle.py bundle --repo M2 --version X.Y.Z --commit SHA --out ZIP
  maven-central-bundle.py inspect ZIP --version X.Y.Z --commit SHA --out RECEIPT
  maven-central-bundle.py inspect ZIP --version X.Y.Z --commit SHA --out RECEIPT --signed --expect BUNDLE_RECEIPT
  maven-central-bundle.py --self-test

`bundle` takes the publication Gradle wrote into the Maven directory M2 under the group
io.github.qrcode-ai-com (`-PscannerGroup=io.github.qrcode-ai-com`): the AAR, the POM and the
sources jar. It adds the javadoc jar Central requires (the binding's API is generated Kotlin:
the jar holds a README that points to its documentation, which Central accepts), then the
md5, sha1, sha256 and sha512 of each file, and writes ZIP in the Maven repository layout that
the Central Portal's upload takes. Every entry has the commit's date and fixed permissions,
in one order: the same publication gives the same zip.

`inspect` refuses a zip that is not that bundle: its exact file set and layout, each checksum,
the POM fields Central requires (name, description, url, a license, a developer, the scm), the
one JNA dependency as an AAR at 5.17.0 or later, the four Android ABIs of the native library and
the license files inside the AAR, Kotlin sources in the sources jar, no Gradle module metadata,
and no signature: the bundle is unsigned. With --signed it judges the zip the owner uploads
instead: the same files plus one ASCII-armored detached signature (.asc) of each of the four
primary files (bindings/kotlin/LISTING.md). It reads their form, not their validity, which the
Central Portal checks against the owner's published key. --expect names the receipt of the
unsigned bundle: the four files and the four native libraries must be the very ones it records.

Nothing is signed, uploaded or published by this program. Stdlib only. Exit 0 when the step
passes, 1 when it is refused, 2 for usage.
"""
import argparse
import hashlib
import io
import json
import pathlib
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile

GROUP = "io.github.qrcode-ai-com"
ARTIFACT = "qrcode-barcode-scanner"
LIBRARY = "libqrcode_ai_scanner_uniffi.so"
# The license files at the AAR's root (bindings/kotlin/LICENSE-NOTES.md), each with words its
# text must hold.
NOTICES = {"LICENSE": b"MIT License", "LICENSE-NOTES.md": b"# License notes",
           "LICENSE-APACHE-2.0": b"Apache License", "THIRD-PARTY.md": b"rxing"}
ABIS = ("arm64-v8a", "armeabi-v7a", "x86", "x86_64")
DIGESTS = ("md5", "sha1", "sha256", "sha512")
POM_NS = {"m": "http://maven.apache.org/POM/4.0.0"}
HOMEPAGE = "https://qrcode-ai.com/en-US/qr-code-scanner/sdk/android"
REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust"
JAVADOC_README = """QR Code & Barcode Scanner for Android, version {version}

The public API of this AAR is Kotlin that UniFFI generates from the engine; its sources are in
the -sources.jar beside this one. The documentation of the binding and of the report it returns:

  https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/bindings/kotlin/README.md
  https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust/blob/main/spec/01-report.md
"""
LIMIT = 256 * 1024 * 1024


class Refused(Exception):
    """A publication or a bundle is not what Maven Central must receive."""


def require(condition, message):
    if not condition:
        raise Refused(message)


def folder(version):
    return f"{GROUP.replace('.', '/')}/{ARTIFACT}/{version}"


def stem(version):
    return f"{ARTIFACT}-{version}"


def primaries(version):
    """The four files of the publication, by name."""
    base = stem(version)
    return (f"{base}.aar", f"{base}.pom", f"{base}-sources.jar", f"{base}-javadoc.jar")


def expected_names(version, signed=False):
    names = []
    for name in primaries(version):
        names.append(f"{folder(version)}/{name}")
        names += [f"{folder(version)}/{name}.{kind}" for kind in DIGESTS]
        if signed:
            names.append(f"{folder(version)}/{name}.asc")
    return sorted(names)


def digest(kind, data):
    return hashlib.new(kind, data).hexdigest()


def commit_time(commit, run=subprocess.run):
    stamp = run(["git", "log", "-1", "--format=%ct", commit], capture_output=True, text=True, check=True).stdout
    return int(stamp.strip())


def zip_time(epoch):
    """A zip entry's date (DOS time, no zone): the commit's, in UTC, never before 1980."""
    import time
    parts = time.gmtime(max(epoch, 315532800))
    return (parts.tm_year, parts.tm_mon, parts.tm_mday, parts.tm_hour, parts.tm_min, parts.tm_sec - parts.tm_sec % 2)


def write_zip(entries, when):
    """Bytes of a zip of {name: data}, entries sorted, each with WHEN and mode 0644."""
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(entries):
            info = zipfile.ZipInfo(name, when)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            info.create_system = 3
            archive.writestr(info, entries[name])
    return out.getvalue()


def javadoc_jar(version, when):
    return write_zip({"META-INF/MANIFEST.MF": b"Manifest-Version: 1.0\r\n\r\n",
                      "README.txt": JAVADOC_README.format(version=version).encode()}, when)


def bundle(repo, version, when):
    """{path in the zip: bytes} of the bundle, from the Maven directory REPO."""
    source = repo / folder(version)
    require(source.is_dir(), f"{source} holds no publication of {GROUP}:{ARTIFACT}:{version}")
    base = stem(version)
    present = sorted(path.name for path in source.iterdir() if path.is_file())
    module = f"{base}.module"
    require(module not in present, "Gradle module metadata was published: it cannot name the JNA AAR")
    wanted = {f"{base}.aar", f"{base}.pom", f"{base}-sources.jar"}
    missing = sorted(wanted - set(present))
    require(not missing, f"the publication lacks {missing}")
    files = {name: (source / name).read_bytes() for name in sorted(wanted)}
    files[f"{base}-javadoc.jar"] = javadoc_jar(version, when)
    entries = {}
    for name, data in files.items():
        entries[f"{folder(version)}/{name}"] = data
        for kind in DIGESTS:
            entries[f"{folder(version)}/{name}.{kind}"] = digest(kind, data).encode()
    return entries


# ------------------------------------------------------------------ inspection

def read_zip(data, what="the bundle", directories=False):
    """{name: bytes} of the files of a zip. The bundle holds files only; an archive Gradle built
    inside it (DIRECTORIES) may list its directories, which carry no bytes and are left out."""
    require(len(data) <= LIMIT, f"{what} exceeds its size limit")
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            infos = archive.infolist()
            names = [info.filename for info in infos]
            require(len(names) == len(set(names)), f"{what} names a file twice")
            require(directories or all(not info.is_dir() for info in infos), f"{what} holds a directory entry")
            require(sum(info.file_size for info in infos) <= LIMIT, f"the expanded {what} exceeds its size limit")
            files = [info for info in infos if not info.is_dir()]
            return {info.filename: archive.read(info) for info in files}, files
    except zipfile.BadZipFile as error:
        raise Refused(f"{what} is not a zip: {error}") from error


def pom_problems(pom, version):
    # A POM Gradle writes declares no document type: one that does could carry entities, which
    # this parser is never asked to expand.
    if b"<!DOCTYPE" in pom or b"<!ENTITY" in pom:
        return ["the POM declares a document type or an entity"]
    try:
        root = ET.fromstring(pom)
    except ET.ParseError as error:
        return [f"the POM is not XML: {error}"]
    text = lambda path: (root.findtext(path, namespaces=POM_NS) or "").strip()
    problems = []
    for path, value in (("m:groupId", GROUP), ("m:artifactId", ARTIFACT), ("m:version", version),
                        ("m:packaging", "aar"), ("m:url", HOMEPAGE), ("m:scm/m:url", REPOSITORY),
                        ("m:licenses/m:license/m:name", "MIT")):
        if text(path) != value:
            problems.append(f"POM {path.replace('m:', '')} is {text(path)!r}, not {value!r}")
    for path in ("m:name", "m:description", "m:developers/m:developer/m:name", "m:scm/m:connection",
                 "m:licenses/m:license/m:url"):
        if not text(path):
            problems.append(f"POM {path.replace('m:', '')} is missing: Central requires it")
    jna = [row for row in root.findall("m:dependencies/m:dependency", POM_NS)
           if (row.findtext("m:artifactId", namespaces=POM_NS) or "") == "jna"]
    if len(jna) != 1:
        problems.append(f"the POM names {len(jna)} JNA dependencies, not one")
    else:
        kind = jna[0].findtext("m:type", namespaces=POM_NS)
        number = jna[0].findtext("m:version", namespaces=POM_NS) or ""
        if kind != "aar":
            problems.append(f"the POM names JNA as {kind!r}, not its Android aar")
        if not re.fullmatch(r"\d+\.\d+(\.\d+)?", number) or tuple(map(int, number.split(".")[:2])) < (5, 17):
            problems.append(f"JNA {number!r} predates 5.17.0, the first aligned for 16 KB pages")
    return problems


def inspect(data, version, commit, signed=False):
    require(re.fullmatch(r"\d+\.\d+\.\d+", version or "") is not None, f"not a version: {version!r}")
    require(re.fullmatch(r"[0-9a-f]{40}", commit or "") is not None, "the commit must be a full SHA")
    files, infos = read_zip(data)
    signatures = sorted(name for name in files if name.endswith(".asc"))
    require(signed or not signatures,
            f"the bundle is signed ({signatures[:2]}): judge the upload zip with --signed")
    wanted = expected_names(version, signed)
    require(sorted(files) == wanted, f"the bundle holds {sorted(set(files) ^ set(wanted))} beyond or short of its files")
    for name in signatures:
        text = files[name]
        require(text.startswith(b"-----BEGIN PGP SIGNATURE-----") and b"-----END PGP SIGNATURE-----" in text,
                f"{name.rsplit('/', 1)[-1]} is not an ASCII-armored detached signature")
    if not signed:
        require(len({info.date_time for info in infos}) == 1, "the entries carry different dates")
    for name in primaries(version):
        path = f"{folder(version)}/{name}"
        for kind in DIGESTS:
            told = files[f"{path}.{kind}"].decode("ascii", "replace").strip()
            require(told == digest(kind, files[path]), f"{name}.{kind} is not the {kind} of {name}")
    base = f"{folder(version)}/{stem(version)}"
    problems = pom_problems(files[f"{base}.pom"], version)
    require(not problems, "; ".join(problems))
    aar, _ = read_zip(files[f"{base}.aar"], "the AAR", directories=True)
    libraries = sorted(name for name in aar if name.startswith("jni/"))
    require(libraries == sorted(f"jni/{abi}/{LIBRARY}" for abi in ABIS),
            f"the AAR carries {libraries}, not the native library of the four ABIs {list(ABIS)}")
    require("classes.jar" in aar and "AndroidManifest.xml" in aar, "the AAR has no classes.jar or manifest")
    for name, words in NOTICES.items():
        require(words in aar.get(name, b""), f"the AAR carries no {name} at its root")
    sources, _ = read_zip(files[f"{base}-sources.jar"], "the sources jar", directories=True)
    kotlin = sorted(name for name in sources if name.endswith(".kt"))
    require(any(name.endswith("qrcode_ai_scanner_uniffi.kt") for name in kotlin),
            "the sources jar holds no generated Kotlin")
    javadoc, _ = read_zip(files[f"{base}-javadoc.jar"], "the javadoc jar")
    require(set(javadoc) == {"META-INF/MANIFEST.MF", "README.txt"}, "the javadoc jar is not the bundle's own")
    return {"schema": "qrscan-maven-central-bundle/1", "coordinate": f"{GROUP}:{ARTIFACT}:{version}",
            "commit": commit, "sha256": digest("sha256", data), "size": len(data), "signed": signed,
            "files": {name[len(folder(version)) + 1:]: digest("sha256", files[name]) for name in
                      (f"{folder(version)}/{primary}" for primary in primaries(version))},
            "abis": {abi: digest("sha256", aar[f"jni/{abi}/{LIBRARY}"]) for abi in ABIS},
            "kotlin_sources": kotlin}


# ------------------------------------------------------------------ self-test

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

    version, commit, when = "1.2.3", "a" * 40, zip_time(1795219200)
    pom = f"""<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>{GROUP}</groupId><artifactId>{ARTIFACT}</artifactId><version>{version}</version>
  <packaging>aar</packaging><name>QR Code &amp; Barcode Scanner for Android</name>
  <description>Read QR codes.</description><url>{HOMEPAGE}</url>
  <licenses><license><name>MIT</name><url>{REPOSITORY}/blob/main/LICENSE</url></license></licenses>
  <developers><developer><id>qrcode-ai-com</id><name>QR Code AI</name></developer></developers>
  <scm><connection>scm:git:{REPOSITORY}.git</connection><url>{REPOSITORY}</url></scm>
  <dependencies><dependency><groupId>net.java.dev.jna</groupId><artifactId>jna</artifactId>
    <version>5.17.0</version><type>aar</type><scope>runtime</scope></dependency></dependencies>
</project>
"""

    def gradle_zip(entries, when):
        """A zip as Gradle writes an AAR or a jar: each directory listed before its files."""
        out = io.BytesIO()
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
            listed = set()
            for name in sorted(entries):
                parts = name.split("/")[:-1]
                for depth in range(1, len(parts) + 1):
                    folder_name = "/".join(parts[:depth]) + "/"
                    if folder_name not in listed:
                        listed.add(folder_name)
                        archive.writestr(zipfile.ZipInfo(folder_name, when), b"")
                archive.writestr(zipfile.ZipInfo(name, when), entries[name])
        return out.getvalue()

    def publication(tmp, **change):
        source = tmp / folder(version)
        source.mkdir(parents=True)
        aar = change.get("aar", {f"jni/{abi}/{LIBRARY}": abi.encode() for abi in ABIS} |
                         {"classes.jar": b"jar", "AndroidManifest.xml": b"<manifest/>"} | NOTICES)
        archive = gradle_zip if change.get("directories") else write_zip
        (source / f"{stem(version)}.aar").write_bytes(archive(aar, when))
        (source / f"{stem(version)}.pom").write_text(change.get("pom", pom))
        (source / f"{stem(version)}-sources.jar").write_bytes(
            archive({"uniffi/qrcode_ai_scanner_uniffi/qrcode_ai_scanner_uniffi.kt": b"package x"}, when))
        if change.get("module"):
            (source / f"{stem(version)}.module").write_text("{}")
        return tmp

    with tempfile.TemporaryDirectory(prefix="maven-central-self-test-") as tmp:
        tmp = pathlib.Path(tmp)
        repo = publication(tmp / "good")
        data = write_zip(bundle(repo, version, when), when)
        report = inspect(data, version, commit)
        check("a complete bundle is accepted", report["coordinate"] == f"{GROUP}:{ARTIFACT}:{version}" and
              sorted(report["abis"]) == sorted(ABIS))
        check("the same publication gives the same zip", write_zip(bundle(repo, version, when), when) == data)
        check("the javadoc jar is written", f"{stem(version)}-javadoc.jar" in report["files"])
        listed = inspect(write_zip(bundle(publication(tmp / "listed", directories=True), version, when), when),
                         version, commit)
        check("an AAR and a sources jar that list their directories are accepted",
              listed["abis"] == report["abis"] and listed["kotlin_sources"] == report["kotlin_sources"])
        refused("a bundle that lists a directory is refused",
                lambda: inspect(gradle_zip(bundle(repo, version, when), when), version, commit),
                "the bundle holds a directory entry")
        entries = bundle(repo, version, when)
        refused("a missing checksum is refused",
                lambda: inspect(write_zip({k: v for k, v in entries.items() if not k.endswith(".sha512")}, when),
                                version, commit), "short of")
        bad = dict(entries)
        bad[f"{folder(version)}/{stem(version)}.pom.sha1"] = b"0" * 40
        refused("a wrong checksum is refused", lambda: inspect(write_zip(bad, when), version, commit), "is not the sha1")
        signed = dict(entries)
        signed[f"{folder(version)}/{stem(version)}.pom.asc"] = b"-----BEGIN PGP SIGNATURE-----"
        refused("a signed bundle is not this bundle", lambda: inspect(write_zip(signed, when), version, commit), "signed")
        extra = dict(entries)
        extra[f"{folder(version)}/maven-metadata.xml"] = b"<metadata/>"
        refused("an extra file is refused", lambda: inspect(write_zip(extra, when), version, commit), "beyond")
        refused("another version is refused", lambda: inspect(data, "1.2.4", commit), "beyond")
        refused("module metadata is refused", lambda: bundle(publication(tmp / "module", module=True), version, when),
                "module metadata")
        for label, old, new, words in (
                ("a plain JNA jar is refused", "<type>aar</type>", "<type>jar</type>", "Android aar"),
                ("an old JNA is refused", "5.17.0", "5.13.0", "predates"),
                ("a POM without scm is refused", f"<scm><connection>scm:git:{REPOSITORY}.git</connection>"
                 f"<url>{REPOSITORY}</url></scm>", "", "scm"),
                ("a POM without developers is refused", "<developers><developer><id>qrcode-ai-com</id><name>QR Code "
                 "AI</name></developer></developers>", "", "developer"),
                ("the JitPack group is refused", f"<groupId>{GROUP}</groupId>",
                 "<groupId>com.github.qrcode-ai-com</groupId>", "groupId"),
                ("another license is refused", "<name>MIT</name>", "<name>AGPL-3.0-or-later</name>", "license"),
                ("a POM with an entity is refused", '<?xml version="1.0" encoding="UTF-8"?>',
                 '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE p [<!ENTITY x "y">]>', "entity")):
            repo_bad = publication(tmp / label.replace(" ", "-"), pom=pom.replace(old, new))
            refused(label, lambda r=repo_bad: inspect(write_zip(bundle(r, version, when), when), version, commit), words)
        three = {f"jni/{abi}/{LIBRARY}": b"x" for abi in ABIS[:3]} | {"classes.jar": b"j", "AndroidManifest.xml": b"m"}
        three |= NOTICES
        refused("an AAR without an ABI is refused", lambda: inspect(write_zip(bundle(
            publication(tmp / "three", aar=three), version, when), when), version, commit), "four ABIs")
        bare = {f"jni/{abi}/{LIBRARY}": b"x" for abi in ABIS} | {"classes.jar": b"j", "AndroidManifest.xml": b"m"}
        bare |= {name: words for name, words in NOTICES.items() if name != "THIRD-PARTY.md"}
        refused("an AAR without its notices is refused", lambda: inspect(write_zip(bundle(
            publication(tmp / "bare", aar=bare), version, when), when), version, commit), "THIRD-PARTY.md")
        armored = b"-----BEGIN PGP SIGNATURE-----\n\niQ\n-----END PGP SIGNATURE-----\n"
        upload = dict(entries)
        for primary in primaries(version):
            upload[f"{folder(version)}/{primary}.asc"] = armored
        check("the signed upload zip is accepted with --signed",
              inspect(write_zip(upload, when), version, commit, signed=True)["signed"] is True)
        short = {k: v for k, v in upload.items() if not k.endswith("-javadoc.jar.asc")}
        refused("an upload zip missing a signature is refused",
                lambda: inspect(write_zip(short, when), version, commit, signed=True), "short of")
        forged = dict(upload)
        forged[f"{folder(version)}/{stem(version)}.pom.asc"] = b"not a signature"
        receipt = inspect(data, version, commit)
        signed_report = inspect(write_zip(upload, when), version, commit, signed=True)
        try:
            expect(signed_report, receipt)
            check("the signed zip holds the files of the unsigned bundle", True)
        except Refused as error:
            check("the signed zip holds the files of the unsigned bundle", False, str(error))
        other = dict(upload)
        other[f"{folder(version)}/{stem(version)}.pom"] = entries[f"{folder(version)}/{stem(version)}.pom"].replace(
            b"Read QR codes.", b"Read codes.")
        for kind in DIGESTS:
            other[f"{folder(version)}/{stem(version)}.pom.{kind}"] = digest(
                kind, other[f"{folder(version)}/{stem(version)}.pom"]).encode()
        refused("a signed zip with another POM is refused",
                lambda: expect(inspect(write_zip(other, when), version, commit, signed=True), receipt), "files differ")
        refused("a malformed signature is refused",
                lambda: inspect(write_zip(forged, when), version, commit, signed=True), "ASCII-armored")
    print(f"self-test: {'FAILED ' + str(len(failures)) if failures else 'all passed'}")
    return 1 if failures else 0


def expect(report, receipt):
    """Refuse a REPORT whose files are not the ones of the bundle RECEIPT."""
    for key in ("coordinate", "commit", "files", "abis"):
        require(report[key] == receipt.get(key), f"the {key} differ from the receipt of the unsigned bundle")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("command", nargs="?", choices=["bundle", "inspect"])
    parser.add_argument("path", nargs="?", type=pathlib.Path)
    parser.add_argument("--repo", type=pathlib.Path)
    parser.add_argument("--version")
    parser.add_argument("--commit")
    parser.add_argument("--out", type=pathlib.Path)
    parser.add_argument("--signed", action="store_true", help="judge the signed upload zip")
    parser.add_argument("--expect", type=pathlib.Path, help="the receipt of the unsigned bundle")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    try:
        if args.command == "bundle":
            require(args.repo and args.version and args.commit and args.out, "bundle needs --repo, --version, --commit, --out")
            when = zip_time(commit_time(args.commit))
            data = write_zip(bundle(args.repo, args.version, when), when)
            args.out.parent.mkdir(parents=True, exist_ok=True)
            args.out.write_bytes(data)
            print(f"{digest('sha256', data)}  {args.out.name}")
        elif args.command == "inspect":
            require(args.path and args.version and args.commit and args.out, "inspect needs ZIP, --version, --commit, --out")
            report = inspect(args.path.read_bytes(), args.version, args.commit, args.signed)
            if args.expect:
                expect(report, json.loads(args.expect.read_text(encoding="utf-8")))
            args.out.parent.mkdir(parents=True, exist_ok=True)
            args.out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            print(json.dumps({key: report[key] for key in ("coordinate", "sha256", "size", "signed")}, indent=2))
        else:
            parser.print_usage(sys.stderr)
            return 2
    except (Refused, OSError, ValueError, subprocess.SubprocessError) as error:
        print(f"maven-central-bundle: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
