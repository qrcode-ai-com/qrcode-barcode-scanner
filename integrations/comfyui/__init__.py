"""QR Code & Barcode Scanner nodes for ComfyUI.

ComfyUI imports this folder from `custom_nodes/` as a package and registers the classes of
NODE_CLASS_MAPPINGS.

pytest imports this file too, before it runs tests/. When the folder's name is not a module name,
as in a clone of qrcode-barcode-scanner-comfyui, pytest imports it as a lone module with no
package: the relative import cannot resolve, and there is nothing to register, so it is skipped.
"""
if __package__:
    from .qrscan_node import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

    __all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
