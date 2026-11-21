"""Run a notebook from top to bottom in a fresh folder, as a notebook host's Run All does, then
copy the three JSON reports it wrote, for `scripts/destination-acceptance.py reports` to judge.

    python run_notebook.py NOTEBOOK OUT_DIR [--reports DIR] [--executed FILE] [--timeout SECONDS]

The notebook is copied into a new empty folder and run there with nbclient, on the `python3`
kernel of this interpreter's environment: run it with the interpreter of the environment the host
prepared (nbclient and ipykernel installed, the scanner left to the notebook's own install cell
when that is how the host works). The notebook writes fast.json, frame.json and full.json into
DIR of its working folder (default `scan-reports`); they are copied to OUT_DIR. The executed
notebook is saved to FILE when given, outputs included, for `scripts/check-demo-notebook.py
executed`. A cell that raises stops the run: exit 1. It judges nothing else. demos.yml gives it
as the `--scan` command of scripts/python-host-consumer.py for examples/kaggle.
"""
import argparse
import pathlib
import shutil
import sys
import tempfile

import nbformat
from nbclient import NotebookClient
from nbclient.exceptions import CellExecutionError

PROFILES = ("fast", "frame", "full")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("notebook", type=pathlib.Path)
    parser.add_argument("out", type=pathlib.Path)
    parser.add_argument("--reports", default="scan-reports",
                        help="the folder, relative to the notebook's working folder, that holds the reports")
    parser.add_argument("--executed", type=pathlib.Path, help="where to save the executed notebook")
    parser.add_argument("--timeout", type=int, default=600, help="the longest one cell may run, in seconds")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="qrscan-notebook-") as box:
        folder = pathlib.Path(box)
        copy = folder / args.notebook.name
        shutil.copyfile(args.notebook, copy)
        notebook = nbformat.read(copy, as_version=4)
        client = NotebookClient(notebook, timeout=args.timeout, kernel_name="python3",
                                resources={"metadata": {"path": str(folder)}})
        failed = None
        try:
            client.execute()
        except CellExecutionError as error:
            failed = error
        if args.executed:
            args.executed.parent.mkdir(parents=True, exist_ok=True)
            nbformat.write(notebook, args.executed)
            print(f"executed notebook: {args.executed}")
        if failed is not None:
            print(f"notebook-run: a cell failed\n{failed}", file=sys.stderr)
            return 1
        args.out.mkdir(parents=True, exist_ok=True)
        for profile in PROFILES:
            source = folder / args.reports / f"{profile}.json"
            if not source.is_file():
                print(f"notebook-run: the notebook wrote no {source.relative_to(folder)}", file=sys.stderr)
                return 1
            shutil.copyfile(source, args.out / source.name)
            print(f"{profile}: {args.out / source.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
