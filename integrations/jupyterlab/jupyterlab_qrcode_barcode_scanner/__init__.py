"""JupyterLab extension: read QR codes and barcodes in the browser with the QR Code & Barcode Scanner engine.

This Python package only carries the prebuilt frontend extension; it runs no server code. The
scanner engine is the WebAssembly module bundled in the extension, and every image is read in the
browser tab that runs JupyterLab.
"""
try:
    from ._version import __version__
except ImportError:  # a checkout used without installing it
    __version__ = "dev"


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "@qrcode-ai-com/jupyterlab-qrcode-barcode-scanner"}]
