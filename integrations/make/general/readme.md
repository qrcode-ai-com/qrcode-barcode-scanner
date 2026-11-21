QR Code AI scan service
=======================

Reads the QR codes and barcodes in image files with the open-source QR Code AI scanner engine,
through a scan service that you run.

The connection asks for the base URL of that service, such as `https://scan.example.com`. The
service is `distribution/http` of https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust:
`POST /scan` reads an image, `GET /healthz` answers once the engine is loaded. It has no
authentication of its own, so put it on a network or behind a gateway you control.

Scan an Image sends a file from an earlier module and returns the scanner report: the number of
codes, each code's format, text and exact bytes, the scores, the hints and the trace. Make an API
Call sends any other request to the same service.
