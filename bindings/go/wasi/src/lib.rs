//! WASI exports: the scanner for hosts that load WebAssembly without JavaScript, such as
//! wazero in Go.
//!
//! This is a spike. The module is a reactor: the host calls `_initialize` once, then the
//! exports below, any number of times. Bytes cross the boundary through the module's own
//! memory. The host asks for a buffer with [`qrs_alloc`], writes the image into it, calls
//! [`qrs_scan`] and reads the answer, then gives both buffers back with [`qrs_free`].
//!
//! An answer is one `u64`: the address of a JSON text in the high half, its length in the low
//! half. A scan answers with the unchanged report, or with
//! `{"error":{"code":"QRS-…","message":"…"}}`.

use qrcode_barcode_scanner::{Capabilities, ImageInput, ScanProfile, Scanner};

/// Reserve `len` bytes in the module's memory for the host to fill.
#[unsafe(no_mangle)]
pub extern "C" fn qrs_alloc(len: u32) -> *mut u8 {
    let buffer = vec![0u8; len as usize].into_boxed_slice();
    Box::into_raw(buffer).cast::<u8>()
}

/// Give back a buffer of `len` bytes that [`qrs_alloc`] or an answer handed out.
///
/// # Safety
///
/// `pointer` and `len` must be exactly what this module handed out, and not freed before.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn qrs_free(pointer: *mut u8, len: u32) {
    if pointer.is_null() {
        return;
    }
    let slice = core::ptr::slice_from_raw_parts_mut(pointer, len as usize);
    // SAFETY: the caller states that this is a boxed slice of `len` bytes from this module.
    drop(unsafe { Box::from_raw(slice) });
}

/// Scan `len` bytes of an encoded image (PNG, JPEG, WebP or GIF) at `image`.
///
/// `profile` is 0 for full, 1 for fast, 2 for frame. `budget_ms` is -1 to keep the profile's
/// own budget, 0 for no budget, or a number of milliseconds.
///
/// # Safety
///
/// `image` must point to `len` readable bytes of this module's memory.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn qrs_scan(image: *const u8, len: u32, profile: u32, budget_ms: i64) -> u64 {
    // SAFETY: the caller states that `image` points to `len` readable bytes.
    let bytes = unsafe { core::slice::from_raw_parts(image, len as usize) };
    hand_over(scan_json(bytes, profile, budget_ms))
}

/// What this build can read: its versions, decode engines and symbologies, as JSON.
#[unsafe(no_mangle)]
pub extern "C" fn qrs_capabilities() -> u64 {
    hand_over(
        serde_json::to_vec(&Capabilities::current())
            .unwrap_or_else(|error| failure("QRSWASI_JSON", &error.to_string())),
    )
}

fn scan_json(bytes: &[u8], profile: u32, budget_ms: i64) -> Vec<u8> {
    let profile = match profile {
        0 => ScanProfile::Full,
        1 => ScanProfile::Fast,
        2 => ScanProfile::Frame,
        other => return failure("QRSWASI_PROFILE", &format!("unknown profile {other}")),
    };
    let profile = match u64::try_from(budget_ms) {
        // -1 keeps the profile's own budget.
        Err(_) if budget_ms == -1 => profile,
        Err(_) => return failure("QRSWASI_BUDGET", "the budget is -1, 0 or a number of milliseconds"),
        Ok(milliseconds) => {
            let mut config = profile.config();
            config.budget_ms = (milliseconds != 0).then_some(milliseconds);
            ScanProfile::Custom(config)
        }
    };
    let scanner = Scanner::builder().profile(profile).build();
    match scanner.scan(ImageInput::encoded(bytes)) {
        Ok(report) => serde_json::to_vec(&report)
            .unwrap_or_else(|error| failure("QRSWASI_JSON", &error.to_string())),
        Err(error) => failure(error.code(), &error.to_string()),
    }
}

fn failure(code: &str, message: &str) -> Vec<u8> {
    serde_json::json!({ "error": { "code": code, "message": message } })
        .to_string()
        .into_bytes()
}

/// Leave `bytes` in memory for the host and say where: address high, length low.
fn hand_over(bytes: Vec<u8>) -> u64 {
    let buffer = bytes.into_boxed_slice();
    let len = buffer.len() as u64;
    let address = Box::into_raw(buffer).cast::<u8>() as usize as u64;
    (address << 32) | len
}
