# The Actor image, on Apify's official Python base image. Apify builds it from this file; it is not
# built in the engine repository. The published wheel ships manylinux builds for amd64 and arm64.
FROM apify/actor-python:3.12

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
