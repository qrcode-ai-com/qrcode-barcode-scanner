"""napari plugin: read QR codes and barcodes in an image layer with the QR Code & Barcode Scanner engine."""
from ._widget import scan_codes, scan_layer

__version__ = "0.1.0"
__all__ = ["scan_codes", "scan_layer"]
