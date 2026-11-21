# The Actor image, on Apify's official Python base image. Apify builds it from this file; the
# engine repository builds it too and runs it on the mixed fixture (integration-apify.yml). The
# published wheel ships manylinux builds for amd64 and arm64.
FROM apify/actor-python:3.12
LABEL org.opencontainers.image.title="QR Code & Barcode Scanner" \
      org.opencontainers.image.source="https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later"

# Dependencies first, so a source change rebuilds only the last layers.
COPY --chown=myuser:myuser requirements.txt ./
RUN python --version \
 && pip --version \
 && pip install --no-cache-dir -r requirements.txt \
 && pip check \
 && pip freeze

COPY --chown=myuser:myuser . ./
RUN python -m compileall -q qrscan_actor/

CMD ["python", "-m", "qrscan_actor"]
