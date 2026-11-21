#!/usr/bin/env python3
"""Decide whether a pull request touches the engine, for ci.yml.

ci.yml builds and tests the Rust workspace, the native Node package and the
WASM package on three systems. A pull request that only changes an
integration, an example, the documentation, a prepared submission, the README
counts and release pins that come with a new integration, or a workflow other
than ci.yml and the reusable workflows it calls, does not change any of that:
those trees consume the published artifacts and have their own workflows. For
such a pull request the heavy jobs are skipped; lint (publish guards, every
workflow file) and packaging (README, licence, recipe and pin checks) still
run.

Usage:
    ci-scope.py --files FILE      read changed paths, one per line, from FILE
    ci-scope.py --git BASE HEAD   list the paths with git diff --name-only
    ci-scope.py --self-test

It prints `engine=true` or `engine=false` and appends the same line to
$GITHUB_OUTPUT when that variable is set. Anything unexpected answers true:
an empty list, an unreadable diff, a path outside the allowlist. Exit 0 on a
decision, 1 on a failed self-test, 2 on usage.
"""

import argparse
import fnmatch
import os
import subprocess
import sys
from pathlib import Path

# Paths whose changes never reach what the gated ci.yml jobs build or read. Keep
# this list short and literal: a new entry must be a path that no gated job
# reads. The README, licence and release-pin checks below run in the packaging
# job, which is never gated; every workflow file is judged by lint, never gated.
OUTSIDE_ENGINE = (
    'integrations/*',
    'examples/*',
    'docs/*',
    'distribution/submissions/*',
    'distribution/releases/pins.toml',
    'scripts/build-readme-actions.py',
    'scripts/build-readme-licensing.py',
    'scripts/readme_prose.py',
    'scripts/test-licensing.py',
    'scripts/test-readme-actions.py',
    '.github/workflows/*',
)

# Workflow files the gated jobs run: ci.yml itself and the reusable workflows it
# calls. A change to one of them always runs everything.
ENGINE_WORKFLOWS = (
    '.github/workflows/ci.yml',
    '.github/workflows/wasm-browser.yml',
)


def outside_engine(path):
    if path in ENGINE_WORKFLOWS:
        return False
    if path.startswith('.github/workflows/') and path.count('/') != 2:
        return False
    return any(fnmatch.fnmatchcase(path, pat) for pat in OUTSIDE_ENGINE)


def touches_engine(paths):
    """True unless every path is outside the engine. An empty list is true."""
    cleaned = [p.strip() for p in paths if p.strip()]
    if not cleaned:
        return True
    return not all(outside_engine(p) for p in cleaned)


def git_paths(base, head):
    out = subprocess.run(['git', 'diff', '--name-only', '--no-renames', base, head],
                                              capture_output=True, text=True, check=False)
    if out.returncode != 0:
        print(f'git diff failed ({out.returncode}): {out.stderr.strip()}', file=sys.stderr)
        return None
    return out.stdout.splitlines()


def emit(engine):
    line = f'engine={"true" if engine else "false"}'
    print(line)
    target = os.environ.get('GITHUB_OUTPUT')
    if target:
        with open(target, 'a', encoding='utf-8') as handle:
            handle.write(line + '\n')


def self_test():
    cases = (
        ('empty list', [], True),
        ('blank lines only', ['', '  '], True),
        ('one integration', ['integrations/canva/src/app.tsx'], False),
        ('integration and its workflow', ['integrations/zapier/index.js',
                                                                            '.github/workflows/integration-zapier.yml'], False),
        ('example and docs', ['examples/codepen/index.html', 'docs/assets/banner.svg'], False),
        ('prepared submission', ['distribution/submissions/gemini.md'], False),
        ('core source', ['crates/qrcode-ai-scanner/src/lib.rs'], True),
        ('integration plus core', ['integrations/canva/a.ts', 'crates/x/src/lib.rs'], True),
        ('ci.yml itself', ['.github/workflows/ci.yml'], True),
        ('another workflow', ['.github/workflows/python.yml'], False),
        ('the reusable browser workflow', ['.github/workflows/wasm-browser.yml'], True),
        ('a nested workflow path', ['.github/workflows/sub/x.yml'], True),
        ('readme counts and pins', ['integrations/x/README.md', 'scripts/test-licensing.py',
                                    'scripts/test-readme-actions.py', 'scripts/readme_prose.py',
                                    'distribution/releases/pins.toml'], False),
        ('another script', ['integrations/x/a.js', 'scripts/package-inspect.py'], True),
        ('another distribution file', ['distribution/releases/other.toml'], True),
        ('the pins self-test script', ['scripts/release-fanout.py'], True),
        ('npm readme copied by node-smoke', ['distribution/npm/README.md'], True),
        ('root readme', ['README.md'], True),
        ('lockfile', ['Cargo.lock'], True),
        ('lookalike prefix', ['integrations-old/x'], True),
    )
    failed = 0
    for label, paths, want in cases:
        got = touches_engine(paths)
        if got is not want:
            failed += 1
            print(f'FAIL {label}: got {got}, want {want}')
    print(f'self-test: {len(cases) - failed}/{len(cases)} passed')
    return 1 if failed else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                                                      formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--files', type=Path)
    group.add_argument('--git', nargs=2, metavar=('BASE', 'HEAD'))
    group.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.files:
        paths = args.files.read_text(encoding='utf-8').splitlines()
    else:
        paths = git_paths(*args.git)
    emit(True if paths is None else touches_engine(paths))
    return 0


if __name__ == '__main__':
    sys.exit(main())
