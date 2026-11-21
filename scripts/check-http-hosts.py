#!/usr/bin/env python3
"""Check the deploy-host files of the scanner HTTP service and say how each host runs it.

  check-http-hosts.py check [--tree DIR] [--schema HOST=FILE ...] [--doctl FILE]
  check-http-hosts.py profile HOST [--tree DIR] --out FILE
  check-http-hosts.py --self-test

A deploy host builds the service from the tree of its own repository, which
scripts/stage-http-satellite.py writes from distribution/http, and reads one file at its root.
`check` holds each file to the host's documented format and to the service: the Dockerfile at the
root, the health path the service answers, its own port variable, and limits that may only be
lowered. `--schema HOST=FILE` also validates that host's file against the JSON Schema the host
publishes, at the address HOSTS names. `--doctl FILE` also validates the DigitalOcean app spec with
`doctl apps spec validate --schema-only`, which reads it offline and refuses an unknown field.

`profile` writes, as JSON, what the host gives the container: the PORT it sets, the variables of
the file, and the memory and CPU of the plan the file selects. scripts/http-service-release.py
consume --host runs the judged image with exactly that, so the consumer judges the service as
that host would run it. The host values come from the pages named in HOSTS, read on 21 November
2026; change them here when the host changes them.

Exit 0 when the step passes, 1 when it fails, 2 for usage. Needs PyYAML, and jsonschema for
--schema.
"""
import argparse
import json
import math
import pathlib
import re
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SERVICE = ROOT / "distribution/http"
NAME = "qrcode-barcode-scanner-http"
HEALTH = "/healthz"
# The variables server.mjs reads and their ceilings: the HARD_LIMITS a host file may only lower,
# and MAX_BUDGET_SCALE.
BUDGET_SCALE = "QRSCAN_HTTP_BUDGET_SCALE"
LIMITS = {
    "QRSCAN_HTTP_MAX_INPUT_BYTES": 8 * 1024 * 1024,
    "QRSCAN_HTTP_MAX_DIMENSION": 4096,
    "QRSCAN_HTTP_MAX_PIXELS": 16_000_000,
    "QRSCAN_HTTP_MAX_CONCURRENT": 2,
    BUDGET_SCALE: 20,
}
HOSTS = {
    "render": {
        "file": "render.yaml",
        "schema": "https://render.com/schema/render.yaml.json",
        # https://render.com/docs/web-services: "The default value of PORT is 10000 for all Render
        # web services." https://render.com/pricing: `0.5c-512mb` is "Less than 1 CPU" and 512 MB,
        # $7/month; the Blueprint spec gives it half a CPU. Measured in a 0.1 CPU container, the
        # free plan's, a scan of the mixed sample took 12 to 17 seconds and every profile was cut
        # short at the engine's budgets: it is not a judged plan.
        "port": 10000,
        "plans": {"0.5c-512mb": {"cpus": "0.5", "memory": "512m"}},
    },
    "railway": {
        # Railway reads no file for this service: config as code is deprecated and no longer read
        # after 2026-12-01 (https://docs.railway.com/reference/config-as-code). The template's
        # settings live in Railway's composer (distribution/railway/LISTING.md), which sets the
        # variables below. Railway injects PORT (https://docs.railway.com/deployments/healthchecks)
        # without documenting its value: 3000 stands for it, a port that is not the service's
        # default. The Free plan gives a service 1 vCPU and 0.5 GB (https://docs.railway.com/pricing/plans).
        "file": None,
        "port": 3000,
        "plans": {"free": {"cpus": "1", "memory": "512m"}},
        "plan": "free",
        "env": {"QRSCAN_HTTP_MAX_CONCURRENT": "1", "QRSCAN_HTTP_BUDGET_SCALE": "2"},
    },
}
HOSTS["digitalocean"] = {
    # The Deploy to DigitalOcean button reads .do/deploy.template.yaml, an app spec under `spec:`
    # (https://docs.digitalocean.com/products/app-platform/how-to/add-deploy-do-button/). App
    # Platform sends traffic to http_port. apps-s-1vcpu-0.5gb is the smallest service, 1 shared
    # vCPU and 512 MiB (https://docs.digitalocean.com/products/app-platform/details/pricing/).
    "file": ".do/deploy.template.yaml",
    "port": 8080,
    "plans": {"apps-s-1vcpu-0.5gb": {"cpus": "1", "memory": "512m"}},
}
REPOSITORY = "https://github.com/qrcode-ai-com/qrcode-barcode-scanner-http"
# Files a host would read at the root in place of its composer: none may be staged.
FOREIGN = ("railway.json", "railway.toml")


class Refused(Exception):
    """A host file breaks a rule of its host or of the service."""


def load_yaml(text, name):
    import yaml
    try:
        return yaml.safe_load(text)
    except yaml.YAMLError as error:
        raise Refused(f"{name} is not YAML: {error}") from error


def limit_variables(pairs, name):
    """{key: value} of limit variables, refused unless each one lowers its ceiling."""
    seen = {}
    for key, value in pairs:
        if key == "PORT":
            raise Refused(f"{name} sets PORT: the host sets it, and the service reads it")
        if key not in LIMITS:
            raise Refused(f"{name} sets {key}, which the service does not read")
        if key in seen:
            raise Refused(f"{name} sets {key} twice")
        if not isinstance(value, str) or not re.fullmatch(r"[1-9][0-9]*", value):
            raise Refused(f"{name} sets {key} to {value!r}: write a positive integer as a quoted string")
        if int(value) > LIMITS[key]:
            raise Refused(f"{name} raises {key} above the service limit {LIMITS[key]}")
        seen[key] = value
    return seen


def budget_scale(cpus, env, name):
    """Refused when a plan keeps budgets the engine would cut short on its share of a CPU.

    On a whole CPU of the CI runners a scan of the mixed sample takes 490 to 650 ms in the engine,
    against fast's 800 ms, and half a CPU doubles it. A host's CPU is shared with other tenants:
    a host file sets the scale to at least twice one over its plan's share of a CPU.
    """
    need = math.ceil(round(2 / float(cpus), 6))
    scale = int(env.get(BUDGET_SCALE, "1"))
    if scale < need:
        raise Refused(f"{name} runs the service on {cpus} CPU: set {BUDGET_SCALE} to at least {need}, "
                      "or the engine may cut its scans short")


def validate(data, schema, name):
    """Refused unless DATA follows the JSON Schema in the file SCHEMA."""
    import jsonschema
    document = json.loads(pathlib.Path(schema).read_text(encoding="utf-8"))
    validator = jsonschema.validators.validator_for(document)(document)
    errors = sorted(validator.iter_errors(data), key=lambda error: list(error.absolute_path))
    if errors:
        raise Refused(f"{name} does not follow its host's schema: " + "; ".join(
            f"{'/'.join(map(str, error.absolute_path)) or '(root)'}: {error.message}" for error in errors[:5]))


def render(tree, schema=None):
    """The checked render.yaml as {plan, env}."""
    path = tree / "render.yaml"
    text = path.read_text(encoding="utf-8")
    data = load_yaml(text, "render.yaml")
    if schema is not None:
        validate(data, schema, "render.yaml")
    if not isinstance(data, dict) or set(data) != {"services"}:
        raise Refused("render.yaml must declare services only")
    services = data["services"]
    if not isinstance(services, list) or len(services) != 1 or not isinstance(services[0], dict):
        raise Refused("render.yaml must declare one service")
    service = services[0]
    allowed = {"type", "name", "runtime", "plan", "healthCheckPath", "autoDeployTrigger", "envVars"}
    if set(service) - allowed:
        raise Refused(f"render.yaml sets {sorted(set(service) - allowed)}: the service builds ./Dockerfile of this "
                      "repository, at its root, and needs nothing more")
    wanted = {"type": "web", "name": NAME, "runtime": "docker", "healthCheckPath": HEALTH, "autoDeployTrigger": "off"}
    for key, value in wanted.items():
        if service.get(key) != value:
            raise Refused(f"render.yaml {key} is {service.get(key)!r}, want {value!r}")
    # Render's own example quotes 'off': YAML 1.1 readers take a bare off for false.
    if not re.search(r"""(?m)^\s+autoDeployTrigger: (?:'off'|"off")\s*(#.*)?$""", text):
        raise Refused("render.yaml must write autoDeployTrigger: 'off' with quotes")
    plan = service.get("plan")
    if plan not in HOSTS["render"]["plans"]:
        raise Refused(f"render.yaml plan is {plan!r}: the judged plans are {sorted(HOSTS['render']['plans'])}")
    variables = service.get("envVars", [])
    if not isinstance(variables, list) or any(not isinstance(v, dict) or set(v) != {"key", "value"} for v in variables):
        raise Refused("render.yaml envVars must be entries with a key and a value only")
    env = limit_variables(((v["key"], v["value"]) for v in variables), "render.yaml")
    budget_scale(HOSTS["render"]["plans"][plan]["cpus"], env, "render.yaml")
    return {"plan": plan, "env": env}


def digitalocean(tree, schema=None, doctl=None):
    """The checked .do/deploy.template.yaml as {plan, env}."""
    name = HOSTS["digitalocean"]["file"]
    data = load_yaml((tree / name).read_text(encoding="utf-8"), name)
    if not isinstance(data, dict) or set(data) != {"spec"} or not isinstance(data["spec"], dict):
        raise Refused(f"{name} must hold the app spec under spec: and nothing else (the button needs spec:)")
    spec = data["spec"]
    if doctl is not None:
        import subprocess
        import yaml
        with tempfile.TemporaryDirectory() as scratch:
            inner = pathlib.Path(scratch) / "spec.yaml"
            inner.write_text(yaml.safe_dump(spec))
            result = subprocess.run([doctl, "apps", "spec", "validate", "--schema-only", str(inner)],
                                    capture_output=True, text=True, env={"HOME": scratch, "PATH": "/usr/bin:/bin"})
        if result.returncode != 0:
            raise Refused(f"doctl refuses {name}: {(result.stderr or result.stdout).strip()[:500]}")
    if set(spec) != {"name", "services"} or spec["name"] != "qrcode-barcode-scanner":
        raise Refused(f"{name} must name the app qrcode-barcode-scanner and declare services only")
    services = spec["services"]
    if not isinstance(services, list) or len(services) != 1 or not isinstance(services[0], dict):
        raise Refused(f"{name} must declare one service")
    service = services[0]
    allowed = {"name", "git", "dockerfile_path", "http_port", "instance_size_slug", "instance_count",
               "health_check", "envs"}
    if set(service) - allowed:
        raise Refused(f"{name} sets {sorted(set(service) - allowed)}: the service needs nothing more")
    wanted = {"name": NAME, "git": {"branch": "main", "repo_clone_url": REPOSITORY + ".git"},
              "dockerfile_path": "Dockerfile", "http_port": HOSTS["digitalocean"]["port"], "instance_count": 1,
              "health_check": {"http_path": HEALTH}}
    for key, value in wanted.items():
        if service.get(key) != value:
            raise Refused(f"{name} {key} is {service.get(key)!r}, want {value!r}")
    plan = service.get("instance_size_slug")
    if plan not in HOSTS["digitalocean"]["plans"]:
        raise Refused(f"{name} instance_size_slug is {plan!r}: the judged sizes are "
                      f"{sorted(HOSTS['digitalocean']['plans'])}")
    variables = service.get("envs", [])
    if not isinstance(variables, list) or any(
            not isinstance(v, dict) or set(v) != {"key", "value", "scope"} or v["scope"] != "RUN_TIME" for v in variables):
        raise Refused(f"{name} envs must be entries with a key, a value and the scope RUN_TIME only")
    env = limit_variables(((v["key"], v["value"]) for v in variables), name)
    budget_scale(HOSTS["digitalocean"]["plans"][plan]["cpus"], env, name)
    return {"plan": plan, "env": env}


CHECKS = {"render": render, "digitalocean": digitalocean}


def check(tree, schemas, doctl=None):
    tree = pathlib.Path(tree)
    if not (tree / "Dockerfile").is_file():
        raise Refused(f"{tree} has no Dockerfile at its root")
    server = (tree / "server.mjs").read_text(encoding="utf-8")
    if f'"{HEALTH}"' not in server or "process.env.PORT" not in server:
        raise Refused(f"server.mjs does not answer {HEALTH} or read PORT")
    staged = [name for name in FOREIGN if (tree / name).exists()]
    if staged:
        raise Refused(f"{staged} would configure a host from a deprecated file: settings belong to its composer")
    results = {}
    for host, function in CHECKS.items():
        results[host] = function(tree, schemas.get(host), doctl) if host == "digitalocean" else \
            function(tree, schemas.get(host))
        print(f"ok    {HOSTS[host]['file']}: {json.dumps(results[host], sort_keys=True)}")
    return results


def profile(host, tree):
    if HOSTS[host]["file"] is None:
        limit_variables(HOSTS[host]["env"].items(), host)
        budget_scale(HOSTS[host]["plans"][HOSTS[host]["plan"]]["cpus"], HOSTS[host]["env"], host)
        checked = {"plan": HOSTS[host]["plan"], "env": HOSTS[host]["env"]}
    else:
        checked = CHECKS[host](pathlib.Path(tree))
    plan = HOSTS[host]["plans"][checked["plan"]]
    port = HOSTS[host]["port"]
    return {"schema": "qrscan-http-host/1", "host": host, "file": HOSTS[host]["file"], "plan": checked["plan"],
            "port": port, "cpus": plan["cpus"], "memory": plan["memory"],
            "env": {"PORT": str(port), **checked["env"]}}


def self_test():
    good = (SERVICE / "render.yaml").read_text(encoding="utf-8")
    cases = {
        "an unquoted off": (good.replace("'off'", "off"), "autoDeployTrigger"),
        "the free plan": (good.replace("plan: 0.5c-512mb", "plan: free"), "judged plans"),
        "another health path": (good.replace(f"healthCheckPath: {HEALTH}", "healthCheckPath: /"), "healthCheckPath"),
        "a native runtime": (good.replace("runtime: docker", "runtime: node"), "runtime"),
        "another repository": (good.replace("    runtime: docker\n",
                                            "    runtime: docker\n    repo: https://example.com/other\n"), "needs nothing more"),
        "a raised limit": (re.sub(r'value: "\d+"', 'value: "3"', good, count=1), "above the service limit"),
        "a PORT of its own": (good.replace("    envVars:\n", '    envVars:\n      - key: PORT\n        value: "8080"\n'),
                              "the host sets it"),
        "an unknown variable": (good.replace("QRSCAN_HTTP_MAX_CONCURRENT", "QRSCAN_HTTP_MAX_THREADS"), "does not read"),
        "a number, not a string": (re.sub(r'value: "(\d+)"', r"value: \1", good, count=1), "quoted string"),
        "two services": (good + good.split("services:\n", 1)[1], "one service"),
        "the engine's budgets on half a CPU": (re.sub(r'(?m)^ *- key: QRSCAN_HTTP_BUDGET_SCALE\n *value: "\d+"\n', "", good),
                                               "at least 4"),
        "a budget scale above 20": (re.sub(r'(key: QRSCAN_HTTP_BUDGET_SCALE\n *value: )"\d+"', r'\1"21"', good),
                                    "above the service limit 20"),
    }
    ocean = (SERVICE / ".do/deploy.template.yaml").read_text(encoding="utf-8")
    ocean_cases = {
        "a spec without its spec: key": (re.sub(r"(?m)^  ", "", ocean.replace("spec:\n", "")), "under spec:"),
        "another repository": (ocean.replace("qrcode-barcode-scanner-http.git", "other.git"), "git is"),
        "an unknown size": (ocean.replace("apps-s-1vcpu-0.5gb", "apps-s-1vcpu-0.25gb"), "judged sizes"),
        "another port": (ocean.replace("http_port: 8080", "http_port: 80"), "http_port"),
        "a build-time variable": (ocean.replace("scope: RUN_TIME", "scope: BUILD_TIME"), "RUN_TIME"),
        "a raised limit": (ocean.replace('value: "1"', 'value: "8"'), "above the service limit"),
        "a route of its own": (ocean.replace("      dockerfile_path", "      routes: []\n      dockerfile_path"),
                               "needs nothing more"),
        "the engine's budgets on a shared vCPU": (
            re.sub(r'(?m)^ *- key: QRSCAN_HTTP_BUDGET_SCALE\n *value: "\d+"\n *scope: RUN_TIME\n', "", ocean), "at least 2"),
    }
    failures = []
    with tempfile.TemporaryDirectory() as scratch:
        tree = pathlib.Path(scratch)
        for name in ("server.mjs", "Dockerfile"):
            (tree / name).write_bytes((SERVICE / name).read_bytes())
        (tree / ".do").mkdir()
        (tree / ".do/deploy.template.yaml").write_text(ocean)
        (tree / "render.yaml").write_text(good)
        try:
            check(tree, {})
            got = profile("render", tree)
            if got["port"] != 10000 or got["env"].get("PORT") != "10000" or got["memory"] != "512m":
                failures.append(f"the Render profile is {got}")
            got = profile("digitalocean", tree)
            if got["port"] != 8080 or got["memory"] != "512m" or got["plan"] != "apps-s-1vcpu-0.5gb":
                failures.append(f"the DigitalOcean profile is {got}")
            got = profile("railway", tree)
            if got["port"] != 3000 or got["env"] != {"PORT": "3000", "QRSCAN_HTTP_MAX_CONCURRENT": "1", "QRSCAN_HTTP_BUDGET_SCALE": "2"} or \
                    got["file"] is not None:
                failures.append(f"the Railway profile is {got}")
        except Refused as error:
            failures.append(f"the real files were refused: {error}")
        (tree / "railway.json").write_text("{}")
        try:
            check(tree, {})
            failures.append("a railway.json was accepted")
        except Refused as error:
            if "deprecated" not in str(error):
                failures.append(f"a railway.json was refused for another reason: {error}")
        (tree / "railway.json").unlink()
        for name, (text, reason) in cases.items():
            if text == good:
                failures.append(f"{name}: the mutation changed nothing")
                continue
            (tree / "render.yaml").write_text(text)
            try:
                render(tree)
                failures.append(f"{name}: accepted")
            except Refused as error:
                if reason not in str(error):
                    failures.append(f"{name}: refused for another reason: {error}")
        for name, (text, reason) in ocean_cases.items():
            if text == ocean:
                failures.append(f"{name}: the mutation changed nothing")
                continue
            (tree / ".do/deploy.template.yaml").write_text(text)
            try:
                digitalocean(tree)
                failures.append(f"{name}: accepted")
            except Refused as error:
                if reason not in str(error):
                    failures.append(f"{name}: refused for another reason: {error}")
    for failure in failures:
        print(f"SELF-TEST FAILED · {failure}", file=sys.stderr)
    print(f"self-test: {'ok' if not failures else 'FAILED'} (the real files, a deprecated railway.json, "
          f"{len(cases)} refused render.yaml, {len(ocean_cases)} refused app specs)")
    return 1 if failures else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--self-test", action="store_true")
    commands = parser.add_subparsers(dest="command")
    one = commands.add_parser("check")
    one.add_argument("--tree", default=str(SERVICE))
    one.add_argument("--schema", action="append", default=[], metavar="HOST=FILE")
    one.add_argument("--doctl")
    two = commands.add_parser("profile")
    two.add_argument("host", choices=sorted(HOSTS))
    two.add_argument("--tree", default=str(SERVICE))
    two.add_argument("--out", required=True)
    arguments = parser.parse_args()
    if arguments.self_test:
        return self_test()
    try:
        if arguments.command == "check":
            schemas = dict(item.split("=", 1) for item in arguments.schema if "=" in item)
            if len(schemas) != len(arguments.schema) or set(schemas) - set(HOSTS):
                parser.error(f"--schema takes HOST=FILE with HOST one of {sorted(HOSTS)}")
            check(arguments.tree, schemas, arguments.doctl)
        elif arguments.command == "profile":
            result = profile(arguments.host, arguments.tree)
            out = pathlib.Path(arguments.out)
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(json.dumps(result, indent=2) + "\n")
            print(f"profile {arguments.host}: {json.dumps(result, sort_keys=True)}")
        else:
            parser.print_usage(sys.stderr)
            return 2
    except Refused as error:
        print(f"refused: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
