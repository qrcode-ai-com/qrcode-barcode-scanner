"""Fixtures for the model tests: the runner as Cog loads it, and the engine's Python host kit."""
import importlib.util
import pathlib
import sys

import pytest

MODEL_ROOT = pathlib.Path(__file__).resolve().parents[1]


def _engine_scripts():
    """The engine checkout's scripts/ folder, which holds python_host_kit.py."""
    for parent in MODEL_ROOT.parents:
        if (parent / "scripts" / "python_host_kit.py").is_file():
            return parent / "scripts"
    raise RuntimeError("run the tests from a checkout of the scanner repository")


sys.path.insert(0, str(_engine_scripts()))
import python_host_kit as kit  # noqa: E402


def load_run_module():
    """run.py, imported from its file the way Cog imports `run.py:Runner`."""
    spec = importlib.util.spec_from_file_location("replicate_run", MODEL_ROOT / "run.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="session")
def model():
    return load_run_module()


@pytest.fixture
def runner(model):
    instance = model.Runner()
    instance.setup()
    return instance


@pytest.fixture
def mixed_path():
    """The mixed fixture, or the staged copy of an acceptance run, checked by SHA-256."""
    return kit.mixed_path(MODEL_ROOT)
