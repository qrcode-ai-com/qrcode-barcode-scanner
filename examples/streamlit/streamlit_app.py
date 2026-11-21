"""Upload an image, or take the sample, and read every QR code and barcode in it.

Run it with `streamlit run examples/streamlit/streamlit_app.py`. The engine runs in the process of
this app, on the machine that serves it. The image is read in memory and is not stored.
"""
import json

import qrcode_barcode_scanner as scanner
import streamlit as st

import scan_view

st.set_page_config(page_title="QR Code & Barcode Scanner", page_icon="🔎", layout="centered")

st.title("QR Code & Barcode Scanner")
st.write(
    "Read every QR code and barcode in an image with the open-source "
    "[QR Code & Barcode Scanner](https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust) engine, "
    f"version {scanner.__version__}. The scan runs on the machine that serves this page, "
    "and the image is read in memory: this app stores nothing.")
st.caption(
    "On Streamlit Community Cloud, that machine is a Streamlit server in the United States, and "
    "Streamlit records usage statistics of the page. Run the app on your own machine to keep your "
    "images there.")
st.markdown(
    "From [QR Code AI](https://qrcode-ai.com/): the "
    "[QR code scanner](https://qrcode-ai.com/en-US/qr-code-scanner) and the "
    "[barcode scanner](https://qrcode-ai.com/en-US/barcode-scanner) in the browser.")

source = st.radio("Image", ["Sample image", "Upload an image"], horizontal=True)
profile = st.selectbox("Scan profile", list(scan_view.PROFILES), format_func=scan_view.PROFILES.get)
budget = st.number_input(
    "Time budget in milliseconds", min_value=0, max_value=scan_view.MAX_BUDGET_MS, value=None, step=100,
    placeholder="The profile's own budget",
    help="Empty keeps the profile's budget: fast 800 ms, frame 80 ms, full 4000 ms. 0 removes the budget.")

if source == "Sample image":
    name, data = scan_view.SAMPLE_NAME, scan_view.sample()
    st.caption("The sample holds a QR code and a Code 128 barcode.")
else:
    upload = st.file_uploader("PNG, JPEG, WebP or GIF", type=["png", "jpg", "jpeg", "webp", "gif"],
                              max_upload_size=scan_view.MAX_BYTES // (1024 * 1024))
    if upload is None:
        st.info("Choose an image to scan.")
        st.stop()
    name, data = upload.name, upload.getvalue()

try:
    report = scan_view.scan(data, profile, None if budget is None else int(budget))
except ValueError as error:
    st.error(f"This image cannot be read: {error}")
    st.stop()

found = scan_view.rows(report)
if found:
    st.success(f"{len(found)} code(s) found in {name}.")
    st.dataframe(found, hide_index=True)
else:
    st.warning(f"No QR code or barcode found in {name}.")
if report["trace"]["budget_exhausted"]:
    st.warning("The time budget cut the scan, so this result is not final. Raise the budget or set it to 0.")
try:
    st.image(scan_view.outlined(data, report), caption="Each code is outlined where the engine measured it.")
except (OSError, ValueError):
    st.caption("This image has no preview here; the report below is complete.")

with st.expander("The engine's full report"):
    st.json(report, expanded=False)
st.download_button("Download the report (JSON)", json.dumps(report, ensure_ascii=False, indent=2),
                   file_name="scan-report.json", mime="application/json")
