#!/usr/bin/env python3
"""Render/check MIT source-license prose in maintained first-party READMEs."""
import argparse
import importlib.util
from pathlib import Path
from readme_licensing import with_license

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('readme_build', ROOT / 'scripts/build-readme-actions.py')
readmes = importlib.util.module_from_spec(spec)
spec.loader.exec_module(readmes)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    stale = []
    for path in readmes.maintained_readmes():
        file = ROOT / path
        expected = with_license(file.read_text())
        if expected != file.read_text():
            stale.append(path)
            if not args.check:
                file.write_text(expected)
    if args.check and stale:
        raise SystemExit('Stale source-license prose: ' + ', '.join(stale))
    print(f'MIT source-license prose: {len(readmes.maintained_readmes())} maintained READMEs')


if __name__ == '__main__':
    main()
