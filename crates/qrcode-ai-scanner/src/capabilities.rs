//! What this build can read: the decode engines compiled in and the
//! symbologies their readers return (spec/01-report.md § Capabilities).
//!
//! Derived from the compiled features, never from [`Symbology`]: that enum
//! names all 19 symbologies in every build, an rqrr-only build included.

use crate::report::{EngineKind, Symbology, Versions};

/// The readers compiled into this build. A listed symbology says a reader
/// for it is included; it does not say that a given image decodes, nor how
/// well that reader measures its geometry.
#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[non_exhaustive]
pub struct Capabilities {
    /// The markers every report of this build carries.
    pub versions: Versions,
    /// The decode engines compiled in, in [`EngineKind`] order: `rxing`
    /// with the `engine-rxing` feature; `rqrr` and the `rescue` stage, which
    /// only rescues grids rqrr located, with `engine-rqrr`.
    pub engines: Vec<EngineKind>,
    /// Every symbology a compiled reader can return, in [`Symbology`]
    /// order: all of them with rxing, QR Code alone with rqrr only.
    pub symbologies: Vec<Symbology>,
}

/// Every symbology, in declaration order (the wire order of the enum).
const ALL_SYMBOLOGIES: [Symbology; 19] = [
    Symbology::QrCode,
    Symbology::MicroQrCode,
    Symbology::RectangularMicroQrCode,
    Symbology::DataMatrix,
    Symbology::Aztec,
    Symbology::Pdf417,
    Symbology::MaxiCode,
    Symbology::Ean13,
    Symbology::Ean8,
    Symbology::UpcA,
    Symbology::UpcE,
    Symbology::Code128,
    Symbology::Code39,
    Symbology::Code93,
    Symbology::Codabar,
    Symbology::Itf,
    Symbology::DataBar,
    Symbology::DataBarExpanded,
    Symbology::Telepen,
];

impl Capabilities {
    /// This build's capabilities.
    #[must_use]
    pub fn current() -> Self {
        let engines = vec![
            #[cfg(feature = "engine-rxing")]
            EngineKind::Rxing,
            #[cfg(feature = "engine-rqrr")]
            EngineKind::Rqrr,
            #[cfg(feature = "engine-rqrr")]
            EngineKind::Rescue,
        ];
        // rxing's readers cover every symbology (`rxing_engine::map_symbology`);
        // rqrr and the rescue stage read QR Code only
        let symbologies = if cfg!(feature = "engine-rxing") {
            ALL_SYMBOLOGIES.to_vec()
        } else {
            vec![Symbology::QrCode]
        };
        Self {
            versions: Versions::current(),
            engines,
            symbologies,
        }
    }
}

// The per-engine lists are judged in tests/capabilities.rs: this crate's
// unit tests do not build without rqrr.
#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::*;

    /// The list names every variant once, in declaration order: a new
    /// symbology fails this match until it is listed.
    #[test]
    fn the_symbology_list_is_complete_and_ordered() {
        for (index, symbology) in ALL_SYMBOLOGIES.iter().enumerate() {
            let position = match symbology {
                Symbology::QrCode => 0,
                Symbology::MicroQrCode => 1,
                Symbology::RectangularMicroQrCode => 2,
                Symbology::DataMatrix => 3,
                Symbology::Aztec => 4,
                Symbology::Pdf417 => 5,
                Symbology::MaxiCode => 6,
                Symbology::Ean13 => 7,
                Symbology::Ean8 => 8,
                Symbology::UpcA => 9,
                Symbology::UpcE => 10,
                Symbology::Code128 => 11,
                Symbology::Code39 => 12,
                Symbology::Code93 => 13,
                Symbology::Codabar => 14,
                Symbology::Itf => 15,
                Symbology::DataBar => 16,
                Symbology::DataBarExpanded => 17,
                Symbology::Telepen => 18,
            };
            assert_eq!(position, index, "{symbology:?}");
        }
    }

    #[cfg(all(feature = "engine-rxing", feature = "engine-rqrr"))]
    #[test]
    fn the_default_build_lists_both_engines_and_every_symbology() {
        let capabilities = Capabilities::current();
        assert_eq!(
            capabilities.engines,
            [EngineKind::Rxing, EngineKind::Rqrr, EngineKind::Rescue]
        );
        assert_eq!(capabilities.symbologies, ALL_SYMBOLOGIES);
        assert_eq!(capabilities.versions, Versions::current());
    }

    #[cfg(all(feature = "engine-rqrr", not(feature = "engine-rxing")))]
    #[test]
    fn an_rqrr_only_build_reads_qr_code_only() {
        let capabilities = Capabilities::current();
        assert_eq!(capabilities.engines, [EngineKind::Rqrr, EngineKind::Rescue]);
        assert_eq!(capabilities.symbologies, [Symbology::QrCode]);
    }

    #[cfg(feature = "serde")]
    #[test]
    fn the_wire_shape_uses_the_report_names() {
        let value = serde_json::to_value(Capabilities::current()).expect("serialize");
        let mut keys: Vec<&str> = value
            .as_object()
            .expect("object")
            .keys()
            .map(String::as_str)
            .collect();
        keys.sort_unstable();
        assert_eq!(keys, ["engines", "symbologies", "versions"]);
        assert_eq!(
            value["versions"],
            serde_json::to_value(Versions::current()).expect("versions")
        );
        assert_eq!(value["symbologies"][0], "qr_code");
        let mut engines = Vec::new();
        if cfg!(feature = "engine-rxing") {
            engines.push("rxing");
        }
        if cfg!(feature = "engine-rqrr") {
            engines.extend(["rqrr", "rescue"]);
        }
        assert_eq!(value["engines"], serde_json::json!(engines));
    }
}
