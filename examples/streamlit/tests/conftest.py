"""The app's folder and the engine repository's Python host kit (scripts/python_host_kit.py)."""
import pathlib
import sys

APP = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP))
for parent in APP.parents:
    if (parent / "scripts" / "python_host_kit.py").is_file():
        sys.path.insert(0, str(parent / "scripts"))
        break
