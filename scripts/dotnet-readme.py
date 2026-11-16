#!/usr/bin/env python3
"""Run the installed NuGet README's exact example in an isolated .NET 10 project.

Consumes an already qualified archive; never builds Rust or publishes anything.
The existing five-host consumer still owns its three-profile/removal checks.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET
import zipfile

from consumer_truth import identity, judge, load, stage

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = "QRCodeAI.QRCodeBarcodeScanner"
MARKER = "<!-- executable-example:Program.cs -->"
CASES = ("qr-and-code128", "valid-empty", "malformed")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def example(readme):
    text = readme.decode("utf-8")
    require(text.count(MARKER) == 1, "README needs exactly one Program.cs example marker")
    match = re.match(r"\r?\n```csharp\r?\n(.*?)^```(?:\r?\n|$)", text.split(MARKER)[1], re.S | re.M)
    require(match is not None and match[1].strip(), "missing or incomplete C# example")
    return match[1].encode("utf-8")


def installed(archive, cache, version):
    """Bind extraction to the actual archive and README NuGet installed."""
    with zipfile.ZipFile(archive) as package:
        require(package.namelist().count("README.md") == 1, "archive needs exactly one README.md")
        readme = package.read("README.md")
    folder = cache / PACKAGE.lower() / version.lower()
    cached = list(folder.glob("*.nupkg"))
    require(len(cached) == 1 and cached[0].read_bytes() == archive.read_bytes(),
            "NuGet installed different archive bytes")
    require((folder / "README.md").read_bytes() == readme, "installed README differs from archive")
    return readme, example(readme)


def check_result(case, result, versions):
    if "error" in case:
        require(result.returncode == 1 and not result.stdout.strip()
                and result.stderr.startswith(f"ScanFailed: {case['error']}: "),
                f"{case['id']}: expected refusal {case['error']}, got {result}")
        return {"id": case["id"], "exit": 1, "error": case["error"]}
    require(result.returncode == 0 and not result.stderr.strip(), f"{case['id']}: scan failed: {result}")
    report = json.loads(result.stdout)
    problems = judge(case, report, versions)
    require(not problems, "; ".join(problems))
    return {"id": case["id"], "exit": 0, "identity": identity(report), "versions": report["versions"]}


def consume(archive, version, rid, out):
    archive, out = archive.resolve(), out.resolve()
    require(not out.is_relative_to(ROOT), "consumer must live outside the source checkout")
    # Refuse reuse: a previous restore, binary or package cache is not a clean consumer.
    out.mkdir(parents=True)
    work, cache = out / "project", out / "packages"
    work.mkdir()
    cache.mkdir()
    env = {**os.environ, "NUGET_PACKAGES": str(cache)}

    def run(argv, check=True):
        result = subprocess.run(argv, cwd=work, env=env, capture_output=True, text=True, timeout=240)
        if check:
            require(result.returncode == 0, f"{argv}: {result.stdout}\n{result.stderr}")
        return result

    # Source mapping prevents a public namesake from satisfying this candidate install.
    config = ET.Element("configuration")
    sources = ET.SubElement(config, "packageSources")
    ET.SubElement(sources, "clear")
    ET.SubElement(sources, "add", key="archive", value=str(archive.parent))
    ET.SubElement(sources, "add", key="nuget.org", value="https://api.nuget.org/v3/index.json")
    mapping = ET.SubElement(config, "packageSourceMapping")
    for key, pattern in (("archive", "QRCodeAI.*"), ("nuget.org", "*")):
        ET.SubElement(ET.SubElement(mapping, "packageSource", key=key), "package", pattern=pattern)
    ET.ElementTree(config).write(work / "nuget.config", encoding="utf-8", xml_declaration=True)
    sdk = run(["dotnet", "--version"]).stdout.strip()
    runtimes = run(["dotnet", "--list-runtimes"]).stdout.splitlines()
    run(["dotnet", "new", "console", "--name", "ReadmeConsumer", "--framework", "net10.0", "--no-restore"])
    run(["dotnet", "add", "package", PACKAGE, "--version", version])
    readme, program = installed(archive, cache, version)
    (work / "Program.cs").write_bytes(program)
    run(["dotnet", "build", "--configuration", "Release"])
    truth = load()
    truth["cases"] = [case for case in truth["cases"] if case["id"] in CASES]
    require({case["id"] for case in truth["cases"]} == set(CASES), "missing consumer truth case")
    versions = json.loads((ROOT / "spec/examples/clean-url.json").read_text())["versions"]
    require(versions["scanner"] == version, "golden report version differs from candidate")
    results = []
    for case, image in stage(truth, out / "input"):
        result = run(["dotnet", str(work / "bin/Release/net10.0/ReadmeConsumer.dll"), str(image)], check=False)
        (out / f"{case['id']}.stdout").write_text(result.stdout, encoding="utf-8")
        (out / f"{case['id']}.stderr").write_text(result.stderr, encoding="utf-8")
        results.append(check_result(case, result, versions))
    receipt = {"schema": "qrscan-dotnet-readme/1", "package": PACKAGE, "version": version,
               "commit": os.environ.get("GITHUB_SHA"), "rid": rid, "framework": "net10.0",
               "sdk": sdk, "runtimes": runtimes, "archiveSha256": digest(archive.read_bytes()),
               "installedArchiveSha256": digest(next((cache / PACKAGE.lower() / version.lower()).glob("*.nupkg")).read_bytes()),
               "readmeSha256": digest(readme), "programSha256": digest(program), "cases": results,
               "outcome": "INSTALLED_README_EXAMPLE_PASS"}
    (out / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--rid", required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(consume(args.archive, args.version, args.rid, args.out), indent=2))


if __name__ == "__main__":
    main()
