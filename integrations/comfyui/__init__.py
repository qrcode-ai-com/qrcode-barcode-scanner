"""QR Code & Barcode Scanner nodes for ComfyUI.

ComfyUI imports this folder from `custom_nodes/` and registers the classes of NODE_CLASS_MAPPINGS.
"""
from .qrscan_node import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
