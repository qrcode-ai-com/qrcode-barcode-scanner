//! The public build descriptor (spec/01-report.md § Capabilities) in the
//! feature set that compiles this test: the default build, rqrr only or
//! rxing only. The library's unit tests do not build without rqrr, so the
//! per-engine lists are judged here, through the public API alone.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use qrcode_barcode_scanner::{Capabilities, EngineKind, Versions};

#[test]
fn engines_follow_the_compiled_features_in_order() {
    let mut expected = Vec::new();
    if cfg!(feature = "engine-rxing") {
        expected.push(EngineKind::Rxing);
    }
    // the rescue stage only reconstructs grids rqrr located
    if cfg!(feature = "engine-rqrr") {
        expected.extend([EngineKind::Rqrr, EngineKind::Rescue]);
    }
    let capabilities = Capabilities::current();
    assert_eq!(capabilities.engines, expected);
    assert_eq!(capabilities.versions, Versions::current());
}

/// With rxing every symbology of the schema, in its order; without it,
/// `qr_code` alone — whatever the `Symbology` enum names.
#[cfg(feature = "serde")]
#[test]
fn symbologies_are_what_the_compiled_readers_return() {
    let schema: serde_json::Value = serde_json::from_str(
        &std::fs::read_to_string(
            std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../../spec/scan-report.schema.json"),
        )
        .unwrap(),
    )
    .unwrap();
    let listed = serde_json::to_value(Capabilities::current().symbologies).unwrap();
    if cfg!(feature = "engine-rxing") {
        assert_eq!(listed, schema["$defs"]["Symbology"]["enum"]);
    } else {
        assert_eq!(listed, serde_json::json!(["qr_code"]));
    }
}
