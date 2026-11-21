//! Flutter bindings for `qrcode-ai-scanner` (flutter_rust_bridge v2).
//!
//! Thin wrapper over the Rust core: bytes → scan → the same versioned
//! `ScanReport`, returned to Dart as a JSON **string** (the serde contract, the
//! cross-surface SSOT in `spec/`). FRB runs these on its Rust worker pool, so
//! Dart `await`s them without blocking the UI isolate. The `QRS-xxx` wire code
//! rides in error messages (`[QRS-001]`) — parity with the node/wasm/py/uniffi
//! bindings (the core's `Display` omits it; `.code()` is the stable surface).

use scanner_core::{ImageInput, ScanProfile, Scanner};

fn parse_profile(profile: &str) -> Result<ScanProfile, String> {
    // Canonical parser — the ONE string→enum map every binding reuses.
    ScanProfile::from_name(profile)
        .ok_or_else(|| format!("unknown profile {profile:?} (expected 'full', 'fast', or 'frame')"))
}

/// The named profile with `budget_ms` over its default wall-clock budget, the
/// mapping of the uniffi and Python bindings (spec/02 § Budget semantics):
/// unset keeps the profile's budget (full 4000 · fast 800 · frame 80 ms), `0`
/// is unbounded (NOT a zero-millisecond budget), any other value is the budget.
/// The core's `ScanConfig::validate`, which every scan runs before reading its
/// input, refuses a budget above `ScanConfig::MAX_BUDGET_MS` with `QRS-006`.
fn profile_with_budget(profile: &str, budget_ms: Option<u64>) -> Result<ScanProfile, String> {
    let profile = parse_profile(profile)?;
    let Some(ms) = budget_ms else {
        return Ok(profile);
    };
    let mut config = profile.config();
    config.budget_ms = (ms > 0).then_some(ms);
    Ok(ScanProfile::Custom(config))
}

/// Decode + score an encoded image (PNG · JPEG · WebP · GIF).
///
/// Returns the `ScanReport` as a JSON string. "No QR found" is a normal result
/// (empty `detections`); `Err` only for invalid input, an option outside its
/// domain (`QRS-006`, a `budget_ms` above 4 294 967 295) or a bad profile name.
/// `budget_ms` overrides the profile's wall-clock budget: unset keeps the
/// profile default, `0` is unbounded (the reproducible mode).
pub fn scan(image: Vec<u8>, profile: String, budget_ms: Option<u64>) -> Result<String, String> {
    let profile = profile_with_budget(&profile, budget_ms)?;
    let report = Scanner::builder()
        .profile(profile)
        .build()
        .scan(ImageInput::encoded(&image))
        .map_err(|e| format!("{e} [{}]", e.code()))?;
    serde_json::to_string(&report).map_err(|e| format!("serialize: {e}"))
}

/// Decode + score a raw RGBA frame (e.g. a camera frame), no format roundtrip.
///
/// `rgba` must be `width * height * 4` bytes. `budget_ms` overrides the
/// profile's wall-clock budget as in [`scan`] (unset = the profile default,
/// `0` = unbounded): the camera loop's per-frame bound.
pub fn scan_frame(
    rgba: Vec<u8>,
    width: u32,
    height: u32,
    profile: String,
    budget_ms: Option<u64>,
) -> Result<String, String> {
    let profile = profile_with_budget(&profile, budget_ms)?;
    let report = Scanner::builder()
        .profile(profile)
        .build()
        .scan(ImageInput::rgba8(&rgba, width, height))
        .map_err(|e| format!("{e} [{}]", e.code()))?;
    serde_json::to_string(&report).map_err(|e| format!("serialize: {e}"))
}

/// Initialise the bridge (default panic handler + logging). The Dart facade
/// calls this once via `RustLib.init()` before the first scan.
#[flutter_rust_bridge::frb(init)]
pub fn init_app() {
    flutter_rust_bridge::setup_default_user_utils();
}
