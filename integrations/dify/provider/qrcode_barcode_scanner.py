from typing import Any

from dify_plugin import ToolProvider


class QrcodeBarcodeScannerProvider(ToolProvider):
    def _validate_credentials(self, credentials: dict[str, Any]) -> None:
        """The scanner needs no account, key or credential."""
        return None
