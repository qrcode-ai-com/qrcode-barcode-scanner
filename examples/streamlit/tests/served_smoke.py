"""Serve the app the way Streamlit Community Cloud starts it, then scan through it.

    python examples/streamlit/tests/served_smoke.py [--port 8501] [--wait 90]

Run it from the root of the repository with the interpreter of the environment that installed
`examples/streamlit/requirements.txt` and `examples/streamlit/tests/requirements.txt`. It:

  1. lists every file of the repository (outside `.git`) with its size and modification time;
  2. starts `python -m streamlit run examples/streamlit/streamlit_app.py --server.headless true`
     from the repository root, as Community Cloud does, on 127.0.0.1:PORT;
  3. waits until `/_stcore/health` answers `ok`, then fetches `/` and checks that it is the
     Streamlit page, with the app's own static bundle;
  4. runs the app's tests with Streamlit's test runner. With QRSCAN_ACCEPTANCE_IMAGE and
     QRSCAN_ACCEPTANCE_DIR set (scripts/python-host-consumer.py sets both), the acceptance test
     uploads the fixture through the app's own file input in the fast, frame and full profiles
     and writes the three reports;
  5. lists the repository again: a scan must have left no file behind, and the server's log must
     hold no traceback;
  6. stops the server, whatever happened before.

Stdlib only. Exit 0 when every step passes, 1 when one fails, 2 for usage.
"""
import argparse
import os
import pathlib
import signal
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[3]
ENTRYPOINT = "examples/streamlit/streamlit_app.py"
TESTS = "examples/streamlit/tests"


class Failed(Exception):
    pass


def tree(root):
    """{relative path: (size, mtime_ns)} of every file of the checkout, .git left out."""
    out = {}
    for path in root.rglob("*"):
        relative = path.relative_to(root)
        if relative.parts[0] == ".git" or not path.is_file():
            continue
        stat = path.stat()
        out[relative.as_posix()] = (stat.st_size, stat.st_mtime_ns)
    return out


def get(url, timeout=5):
    with urllib.request.urlopen(url, timeout=timeout) as response:  # noqa: S310 - a local http address
        return response.status, response.read().decode("utf-8", "replace")


def wait_healthy(base, server, wait):
    deadline = time.monotonic() + wait
    while time.monotonic() < deadline:
        if server.poll() is not None:
            raise Failed(f"the server stopped with exit {server.returncode} before it was healthy")
        try:
            status, body = get(f"{base}/_stcore/health")
            if status == 200 and body.strip() == "ok":
                return
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(0.5)
    raise Failed(f"/_stcore/health did not answer ok within {wait} s")


def check_page(base):
    status, page = get(f"{base}/")
    if status != 200:
        raise Failed(f"/ answered HTTP {status}")
    for needle in ('<div id="root"', "<title>Streamlit</title>", "./static/js/"):
        if needle not in page:
            raise Failed(f"/ is not the Streamlit page: no {needle!r}")
    return len(page)


def stop(server):
    if server.poll() is not None:
        return
    server.send_signal(signal.SIGINT if os.name != "nt" else signal.CTRL_BREAK_EVENT)
    try:
        server.wait(timeout=15)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait(timeout=15)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--port", type=int, default=8501)
    parser.add_argument("--wait", type=float, default=90.0)
    args = parser.parse_args(argv)
    if pathlib.Path.cwd().resolve() != ROOT:
        print(f"served_smoke: run it from the repository root, {ROOT}", file=sys.stderr)
        return 2
    base = f"http://127.0.0.1:{args.port}"
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    before = tree(ROOT)
    log = tempfile.NamedTemporaryFile(prefix="streamlit-served-", suffix=".log", delete=False)
    command = [sys.executable, "-m", "streamlit", "run", ENTRYPOINT, "--server.headless", "true",
               "--server.address", "127.0.0.1", "--server.port", str(args.port)]
    print("$ " + " ".join(command), flush=True)
    server = subprocess.Popen(command, cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT,
                              **({"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == "nt" else {}))
    code = 1
    try:
        wait_healthy(base, server, args.wait)
        print(f"ok    {base}/_stcore/health answers ok")
        size = check_page(base)
        print(f"ok    {base}/ is the Streamlit page ({size} bytes)")
        tests = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", TESTS],
                               cwd=ROOT, env=env)
        if tests.returncode != 0:
            raise Failed(f"the app's tests failed (exit {tests.returncode})")
        print("ok    the app's tests pass")
        status, body = get(f"{base}/_stcore/health")
        if (status, body.strip()) != (200, "ok"):
            raise Failed("the server is no longer healthy after the scans")
        after = tree(ROOT)
        changed = sorted(path for path in set(before) | set(after) if before.get(path) != after.get(path))
        if changed:
            raise Failed(f"the scans left {len(changed)} file(s) in the repository: {changed[:10]}")
        print(f"ok    the repository holds the same {len(after)} files, unchanged")
        code = 0
    except Failed as error:
        print(f"FAIL  {error}", file=sys.stderr)
    finally:
        stop(server)
        log.close()
        text = pathlib.Path(log.name).read_text(encoding="utf-8", errors="replace")
        os.unlink(log.name)
    print("--- server log\n" + text, flush=True)
    if "Traceback (most recent call last)" in text:
        print("FAIL  the server log holds a traceback", file=sys.stderr)
        code = 1
    return code


if __name__ == "__main__":
    sys.exit(main())
