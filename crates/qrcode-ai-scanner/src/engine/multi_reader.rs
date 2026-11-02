//! Scanner copy of rxing 0.9.3's multiple-barcode reader
//! (`multi/generic_multiple_barcode_reader.rs`) and of its format dispatch
//! (`multi_use_multi_format_reader.rs`), Apache-2.0, notice below: the same
//! recursion around each symbol found, with these local changes (see
//! `THIRD-PARTY.md`):
//!
//! 1. **One dispatch order.** [`FormatReader`] tries the readers of a format
//!    set in the order rxing uses for an unrestricted pass — the QR family,
//!    Data Matrix, Aztec, PDF417, `MaxiCode`; linear readers first without
//!    `TryHarder`, last with it — never in a hash set's iteration order,
//!    which differs from one set to the next and made the first read (and so
//!    the crops) of a restricted pass vary from run to run.
//! 2. **Points in the image's frame.** Each read's points are normalized in
//!    its crop before anything uses them ([`normalized`]): a rotated PDF417
//!    reports them in its detector's rotated bit matrix; linear readers place
//!    them on pixel indices and map reversed or rotated rows back with a
//!    pixel-index formula, move only two points of an upside-down read, and
//!    Code 39 halves its stop character's end. Points no reader measured in
//!    this image are dropped, never guessed.
//! 3. **A read without points does not end its node.** The node is read
//!    again past that read's format ([`NodeReader::pass_over`]): upstream
//!    stopped there, and a `MaxiCode` (rxing reports none of its points) hid
//!    every other symbol of its region.
//! 4. **One node, one fresh reader.** The reader is reset before each read:
//!    a stateful reader (`DataBar` Expanded keeps the rows it saw) never
//!    assembles a symbol out of another crop's rows.
//! 5. **Duplicates by kind of symbol, not by number of points.** Two linear
//!    reads are one when they carry the same content and the attempt's pixels
//!    prove them the same physical symbol ([`occurrence::compare_linear`]),
//!    within a bound on those comparisons; a pair the pixels leave undecided
//!    stays two reads, which publication groups; a linear read lying inside a
//!    matrix symbol's quad is that symbol's texture; two matrix reads are one
//!    when they carry the same content and their boxes meet. Upstream decided
//!    by point count: a linear read with four points (an EAN add-on, a
//!    `DataBar`) was taken for a quad, and equal linear copies collapsed to
//!    one wherever they lay.

/*
 * Copyright 2009 ZXing authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

use rxing::BarcodeFormat as F;
use rxing::RXingResultMetadataType as MetaKey;
use rxing::RXingResultMetadataValue as MetaValue;
use rxing::aztec::AztecReader;
use rxing::common::Result;
use rxing::datamatrix::DataMatrixReader;
use rxing::maxicode::MaxiCodeReader;
use rxing::oned::MultiFormatOneDReader;
use rxing::pdf417::PDF417Reader;
use rxing::qrcode::QRCodeReader;
use rxing::qrcode::cpp_port::QrReader;
use rxing::{
    BarcodeFormat, Binarizer, BinaryBitmap, DecodeHints, Exceptions, RXingResult, Reader, point,
};

use super::occurrence;
use crate::input::LumaImage;
use crate::report::Point;

/// The recursion's limits, upstream's.
const MIN_DIMENSION_TO_RECUR: f32 = 100.0;
const MAX_DEPTH: u32 = 4;

/// Formats one node may pass over (change 3): more than a reader has.
const MAX_PASSED: usize = 8;

/// Pixel comparisons ([`occurrence::same_linear`]) one call's duplicate
/// filter makes; past them two equal linear reads are both kept, and the
/// occurrence grouping compares them under its own bound.
const MAX_FILTER_BRIDGES: u32 = 256;

/// The formats rxing reads along scan lines.
const LINEAR: [BarcodeFormat; 13] = [
    F::UPC_A,
    F::UPC_E,
    F::EAN_13,
    F::EAN_8,
    F::CODABAR,
    F::CODE_39,
    F::CODE_93,
    F::CODE_128,
    F::ITF,
    F::RSS_14,
    F::RSS_EXPANDED,
    F::TELEPEN,
    F::UPC_EAN_EXTENSION,
];

fn linear(format: BarcodeFormat) -> bool {
    LINEAR.contains(&format)
}

/// A reader the recursion can ask to read a node again past one format.
pub(super) trait NodeReader: Reader {
    /// Leave `format` out of the next reads until [`NodeReader::readmit`];
    /// `false`: this reader cannot, and the node ends (upstream's rule).
    fn pass_over(&mut self, _format: BarcodeFormat) -> bool {
        false
    }

    /// Read `format` again.
    fn readmit(&mut self, _format: BarcodeFormat) {}
}

impl NodeReader for rxing::MultiFormatReader {}

impl NodeReader for super::databar_expanded::RSSExpandedReader {}

/// rxing 0.9.3's `MultiUseMultiFormatReader` dispatch (`decode_formats`,
/// `decode_internal`) in one fixed order (change 1): linear readers first
/// when `TryHarder` is off; the zxing-cpp QR port then the `ZXing`-lineage
/// reader; Data Matrix; Aztec; PDF417; `MaxiCode`; linear readers last when
/// `TryHarder` is on; the whole again on the inverted image under
/// `AlsoInverted`. A format set restricts the readers exactly as upstream's
/// does: a QR-family set runs the QR readers, a set with any linear format
/// runs the linear readers (restricted to the set by their own hints), and
/// rMQR has no reader here (`decode_rmqr`).
#[derive(Default)]
pub(super) struct FormatReader {
    passed_over: Vec<BarcodeFormat>,
    qr_port: QrReader,
    qr_lineage: QRCodeReader,
    data_matrix: DataMatrixReader,
    aztec: AztecReader,
    pdf417: PDF417Reader,
    maxicode: MaxiCodeReader,
}

impl FormatReader {
    fn decode_formats<B: Binarizer>(
        &mut self,
        image: &mut BinaryBitmap<B>,
        hints: &DecodeHints,
    ) -> Result<RXingResult> {
        let allowed = |format: BarcodeFormat| {
            hints
                .PossibleFormats
                .as_ref()
                .is_none_or(|set| set.is_empty() || set.contains(&format))
        };
        let open = |format: BarcodeFormat| allowed(format) && !self.passed_over.contains(&format);
        let (qr, micro) = (open(F::QR_CODE), open(F::MICRO_QR_CODE));
        let (data_matrix, aztec, pdf417, maxicode) = (
            open(F::DATA_MATRIX),
            open(F::AZTEC),
            open(F::PDF_417),
            open(F::MAXICODE),
        );
        let one_d = LINEAR.iter().any(|format| allowed(*format));
        let try_harder = matches!(hints.TryHarder, Some(true));
        if one_d
            && !try_harder
            && let Ok(result) = MultiFormatOneDReader::new(hints).decode_with_hints(image, hints)
        {
            return Ok(result);
        }
        if qr || micro {
            if let Ok(result) = self.qr_port.decode_with_hints(image, hints) {
                return Ok(result);
            }
            if qr && let Ok(result) = self.qr_lineage.decode_with_hints(image, hints) {
                return Ok(result);
            }
        }
        if data_matrix && let Ok(result) = self.data_matrix.decode_with_hints(image, hints) {
            return Ok(result);
        }
        if aztec && let Ok(result) = self.aztec.decode_with_hints(image, hints) {
            return Ok(result);
        }
        if pdf417 && let Ok(result) = self.pdf417.decode_with_hints(image, hints) {
            return Ok(result);
        }
        if maxicode && let Ok(result) = self.maxicode.decode_with_hints(image, hints) {
            return Ok(result);
        }
        if one_d && try_harder {
            return MultiFormatOneDReader::new(hints).decode_with_hints(image, hints);
        }
        Err(Exceptions::NOT_FOUND)
    }
}

impl Reader for FormatReader {
    fn decode<B: Binarizer>(&mut self, image: &mut BinaryBitmap<B>) -> Result<RXingResult> {
        self.decode_with_hints(image, &DecodeHints::default())
    }

    fn decode_with_hints<B: Binarizer>(
        &mut self,
        image: &mut BinaryBitmap<B>,
        hints: &DecodeHints,
    ) -> Result<RXingResult> {
        if let Ok(result) = self.decode_formats(image, hints) {
            return Ok(result);
        }
        if matches!(hints.AlsoInverted, Some(true)) {
            // restored afterwards: the caller's bitmap is unchanged
            image.invert();
            let inverted = self.decode_formats(image, hints);
            image.invert();
            if let Ok(mut result) = inverted {
                result.putMetadata(MetaKey::IS_INVERTED, MetaValue::IsInverted(true));
                return Ok(result);
            }
        }
        Err(Exceptions::NOT_FOUND)
    }

    fn reset(&mut self) {
        self.qr_port.reset();
        self.qr_lineage.reset();
        self.data_matrix.reset();
        self.aztec.reset();
        self.pdf417.reset();
        self.maxicode.reset();
    }
}

impl NodeReader for FormatReader {
    fn pass_over(&mut self, format: BarcodeFormat) -> bool {
        // a linear read always has points: only the matrix readers are
        // passed over
        if linear(format) || self.passed_over.contains(&format) {
            return false;
        }
        self.passed_over.push(format);
        true
    }

    fn readmit(&mut self, format: BarcodeFormat) {
        self.passed_over.retain(|own| *own != format);
    }
}

/// Decode every symbol `reader` finds in `image` (the attempt's binarized
/// `luma`): the read, then the regions left of, above, right of and below
/// it, recursively; duplicates filtered (module doc).
pub(super) fn decode_multiple<R: NodeReader, B: Binarizer>(
    reader: &mut R,
    image: &mut BinaryBitmap<B>,
    hints: &DecodeHints,
    luma: &LumaImage,
) -> Result<Vec<RXingResult>> {
    let mut results = Vec::new();
    recurse(reader, image, hints, &mut results, (0, 0), 0);
    let mut bridges = MAX_FILTER_BRIDGES;
    let mut unique = Vec::new();
    for (i, own) in results.iter().enumerate() {
        let superseded = results
            .iter()
            .enumerate()
            .any(|(j, other)| j != i && supersedes(other, own, j > i, luma, &mut bridges));
        if !superseded {
            unique.push(own.clone());
        }
    }
    if unique.is_empty() {
        return Err(Exceptions::NOT_FOUND);
    }
    Ok(unique)
}

/// Whether `other` makes `own` a duplicate (module doc, change 5): of two
/// reads of one symbol the later one stays, and a linear read inside a
/// matrix symbol never does.
fn supersedes(
    other: &RXingResult,
    own: &RXingResult,
    later: bool,
    luma: &LumaImage,
    bridges: &mut u32,
) -> bool {
    let same_content =
        || own.getText() == other.getText() && own.getBarcodeFormat() == other.getBarcodeFormat();
    let (own_linear, other_linear) = (
        linear(*own.getBarcodeFormat()),
        linear(*other.getBarcodeFormat()),
    );
    let (mine, theirs) = (own.getPoints(), other.getPoints());
    if mine.is_empty() || theirs.is_empty() {
        // a read without points cannot be told apart: upstream
        return later && same_content();
    }
    match (own_linear, other_linear) {
        (true, true) => {
            later
                && same_content()
                && match (scan_line(mine), scan_line(theirs)) {
                    // only a proven duplicate goes: unproven ones stay for
                    // the grouping to keep together, flagged
                    (Some(a), Some(b)) => {
                        occurrence::compare_linear(luma, a, b, bridges) == occurrence::Verdict::Same
                    }
                    _ => true,
                }
        }
        (true, false) => matrix_quad(other)
            .is_some_and(|quad| mine.iter().all(|p| inside(&quad, Point { x: p.x, y: p.y }))),
        (false, true) => false,
        (false, false) => later && same_content() && boxes_meet(mine, theirs),
    }
}

/// The convex quad a matrix read's points describe, clockwise, in rxing
/// 0.9.3's orders: the QR port's [TL, TR, BL, BR] or the lineage reader's
/// [BL, TL, TR, alignment] (whichever closes a convex quad), Data Matrix and
/// Aztec as given, PDF417's eight vertices [TL, BL, TR, BR, …].
fn matrix_quad(result: &RXingResult) -> Option<[Point; 4]> {
    let p: Vec<Point> = result
        .getPoints()
        .iter()
        .map(|p| Point { x: p.x, y: p.y })
        .collect();
    let orders: &[[usize; 4]] = match (*result.getBarcodeFormat(), p.len()) {
        (F::PDF_417, 8) => &[[0, 2, 3, 1]],
        (_, 4) => &[[0, 1, 2, 3], [0, 1, 3, 2]],
        _ => &[],
    };
    orders
        .iter()
        .find_map(|order| occurrence::clockwise_quad(&order.map(|i| p[i])))
}

/// Whether `p` lies inside the clockwise convex `quad`, one pixel of
/// tolerance.
fn inside(quad: &[Point; 4], p: Point) -> bool {
    (0..4).all(|i| {
        let (a, b) = (quad[i], quad[(i + 1) % 4]);
        let (ex, ey) = (f64::from(b.x - a.x), f64::from(b.y - a.y));
        let length = ex.hypot(ey);
        let cross = ex * f64::from(p.y - a.y) - ey * f64::from(p.x - a.x);
        length > 0.0 && cross / length >= -1.0
    })
}

/// Whether the boxes of two point sets meet.
fn boxes_meet(a: &[rxing::Point], b: &[rxing::Point]) -> bool {
    let bounds = |points: &[rxing::Point]| {
        points.iter().fold(
            (
                f32::INFINITY,
                f32::INFINITY,
                f32::NEG_INFINITY,
                f32::NEG_INFINITY,
            ),
            |(x0, y0, x1, y1), p| (x0.min(p.x), y0.min(p.y), x1.max(p.x), y1.max(p.y)),
        )
    };
    let (ax0, ay0, ax1, ay1) = bounds(a);
    let (bx0, by0, bx1, by1) = bounds(b);
    ax0 <= bx1 && bx0 <= ax1 && ay0 <= by1 && by0 <= ay1
}

/// The two farthest points of a linear read.
fn scan_line(points: &[rxing::Point]) -> Option<[Point; 2]> {
    let mut best: Option<([Point; 2], f32)> = None;
    for (i, a) in points.iter().enumerate() {
        for b in &points[i + 1..] {
            let length = (a.x - b.x).hypot(a.y - b.y);
            if best.is_none_or(|(_, own)| length > own) {
                best = Some(([Point { x: a.x, y: a.y }, Point { x: b.x, y: b.y }], length));
            }
        }
    }
    best.filter(|(_, length)| *length >= 1.0)
        .map(|(line, _)| line)
}

/// Upstream's recursion (`GenericMultipleBarcodeReader::doDecodeMultiple`),
/// with changes 2 to 4 of the module doc.
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::cast_precision_loss,
    reason = "upstream's crop arithmetic on finite in-image point coordinates"
)]
fn recurse<R: NodeReader, B: Binarizer>(
    reader: &mut R,
    image: &mut BinaryBitmap<B>,
    hints: &DecodeHints,
    results: &mut Vec<RXingResult>,
    (x_offset, y_offset): (u32, u32),
    depth: u32,
) {
    if depth > MAX_DEPTH {
        return;
    }
    let width = image.get_width();
    let height = image.get_height();
    let mut passed = Vec::new();
    let extent = loop {
        reader.reset();
        let Ok(result) = reader.decode_with_hints(image, hints) else {
            break None;
        };
        let format = *result.getBarcodeFormat();
        let (result, extent) = normalized(result, width, height);
        results.push(translated(result, x_offset, y_offset));
        if !extent.is_empty() {
            break Some(extent);
        }
        // nothing to crop around: the node again, past this format
        if passed.len() >= MAX_PASSED || !reader.pass_over(format) {
            break None;
        }
        passed.push(format);
    };
    for format in passed {
        reader.readmit(format);
    }
    let Some(extent) = extent else {
        return;
    };
    let (mut min_x, mut min_y) = (width as f32, height as f32);
    let (mut max_x, mut max_y) = (0.0_f32, 0.0_f32);
    for p in extent {
        min_x = min_x.min(p.x);
        min_y = min_y.min(p.y);
        max_x = max_x.max(p.x);
        max_y = max_y.max(p.y);
    }
    // the normalized points can lie on the image's far edges
    let (max_x, max_y) = (max_x.min(width as f32), max_y.min(height as f32));
    if min_x > MIN_DIMENSION_TO_RECUR {
        recurse(
            reader,
            &mut image.crop(0, 0, min_x as usize, height),
            hints,
            results,
            (x_offset, y_offset),
            depth + 1,
        );
    }
    if min_y > MIN_DIMENSION_TO_RECUR {
        recurse(
            reader,
            &mut image.crop(0, 0, width, min_y as usize),
            hints,
            results,
            (x_offset, y_offset),
            depth + 1,
        );
    }
    if max_x < (width as f32) - MIN_DIMENSION_TO_RECUR {
        recurse(
            reader,
            &mut image.crop(max_x as usize, 0, width - max_x as usize, height),
            hints,
            results,
            (x_offset + max_x as u32, y_offset),
            depth + 1,
        );
    }
    if max_y < (height as f32) - MIN_DIMENSION_TO_RECUR {
        recurse(
            reader,
            &mut image.crop(0, max_y as usize, width, height - max_y as usize),
            hints,
            results,
            (x_offset, y_offset + max_y as u32),
            depth + 1,
        );
    }
}

/// A read's points in its `width` × `height` crop, in the edge convention
/// (pixel (i, j) spans [i, i+1) × [j, j+1)), and the points the recursion
/// crops around: the normalized ones, or rxing's own when none survive. The
/// QR family, Data Matrix and Aztec keep rxing's points (the QR readers'
/// conventions are the engine's: `rxing_engine::footprint`).
fn normalized(
    result: RXingResult,
    width: usize,
    height: usize,
) -> (RXingResult, Vec<rxing::Point>) {
    let raw = result.getPoints().to_vec();
    let orientation = match result.getRXingResultMetadata().get(&MetaKey::ORIENTATION) {
        Some(MetaValue::Orientation(degrees)) => *degrees,
        _ => 0,
    };
    #[expect(
        clippy::cast_precision_loss,
        reason = "crop dimensions bounded by the engine-capped image"
    )]
    let (w, h) = (width as f32, height as f32);
    let format = *result.getBarcodeFormat();
    let points = match format {
        F::PDF_417 => pdf417_points(&raw, orientation, (w, h)),
        // measured from the row's first light pixel, and past the stop
        // character on the right (rxing 0.9.3 `coda_bar_reader.rs`,
        // `telepen_reader.rs`): no point of the image
        F::CODABAR | F::TELEPEN => Vec::new(),
        _ if linear(format) => linear_points(format, orientation, &raw, (w, h)),
        _ => return (result, raw),
    };
    let extent = if points.is_empty() {
        raw
    } else {
        points.clone()
    };
    (with_points(&result, points), extent)
}

/// rxing's PDF417 detector reports its vertices in the bit matrix it rotated
/// (`pdf_417_detector.rs`, `applyRotation`, orientation 90, 180 or 270):
/// each goes back through the inverse of `BitMatrix::rotate`. Across the
/// rows its vertices are pattern edges; along them, row indices: a bottom
/// vertex (1, 3, 5 and 7, when all eight are present) is its last row's
/// index, one pixel above that row's lower edge.
fn pdf417_points(raw: &[rxing::Point], orientation: i32, (w, h): (f32, f32)) -> Vec<rxing::Point> {
    raw.iter()
        .enumerate()
        .map(|(i, p)| {
            let bottom = raw.len() == 8 && i % 2 == 1;
            let (x, y) = (p.x, if bottom { p.y + 1.0 } else { p.y });
            match orientation.rem_euclid(360) {
                90 => point(w - y, x),
                180 => point(w - x, h - y),
                270 => point(y, h - x),
                _ => point(x, y),
            }
        })
        .collect()
}

/// A linear read's points. rxing 0.9.3 places them on the index of the row
/// it read (across the line) and on pattern edges or their centres (along
/// it), and maps a read back with `n - x - 1`, a pixel-index formula: an
/// upside-down row (orientation 180, `one_d_reader.rs`) and a rotated image
/// (270, `multi_format_one_d_reader.rs`; 90 or 450 when both). Each point
/// goes to the centre of its row, and a coordinate mapped out of a reversed
/// row moves one pixel. An upside-down read moves only its first two
/// points: the others stay in the reversed row's frame and are dropped. A
/// `DataBar` (RSS-14) also mirrors its right finder (points 2 and 3) out of
/// a reversed row of its own (`rss_14_reader.rs`,
/// `parseFoundFinderPattern`). Code 39 reports half its stop character's
/// crop-local end (`code_39_reader.rs`: `(lastStart + lastPatternSize) / 2`):
/// that end is recovered exactly, in any orientation.
fn linear_points(
    format: BarcodeFormat,
    orientation: i32,
    raw: &[rxing::Point],
    (w, h): (f32, f32),
) -> Vec<rxing::Point> {
    let quarter = orientation.rem_euclid(360);
    let reversed = matches!(quarter, 90 | 180);
    let rotated = matches!(quarter, 90 | 270);
    let kept = if reversed {
        &raw[..raw.len().min(2)]
    } else {
        raw
    };
    kept.iter()
        .enumerate()
        .map(|(i, p)| {
            if format == F::CODE_39 && i == 1 {
                return match quarter {
                    180 => point(2.0 * p.x + 2.0 - w, p.y + 0.5),
                    270 => point(p.x + 0.5, 2.0 * p.y),
                    90 => point(p.x + 0.5, 2.0 * p.y + 2.0 - h),
                    _ => point(2.0 * p.x, p.y + 0.5),
                };
            }
            let mirrored = reversed || (format == F::RSS_14 && i >= 2);
            let along = if mirrored { 1.0 } else { 0.0 };
            if rotated {
                point(p.x + 0.5, p.y + along)
            } else {
                point(p.x + along, p.y + 0.5)
            }
        })
        .collect()
}

/// `result` with other points, everything else kept.
fn with_points(result: &RXingResult, points: Vec<rxing::Point>) -> RXingResult {
    let mut rebuilt = RXingResult::new_complex(
        result.getText(),
        result.getRawBytes().to_vec(),
        result.getNumBits(),
        points,
        *result.getBarcodeFormat(),
        result.getTimestamp(),
    );
    rebuilt.putAllMetadata(result.getRXingResultMetadata().clone());
    rebuilt
}

/// Upstream's `translatePoints`: the result in the uncropped image.
#[expect(
    clippy::cast_precision_loss,
    reason = "crop offsets bounded by the engine-capped image"
)]
fn translated(result: RXingResult, x_offset: u32, y_offset: u32) -> RXingResult {
    if result.getPoints().is_empty() || (x_offset, y_offset) == (0, 0) {
        return result;
    }
    let moved: Vec<rxing::Point> = result
        .getPoints()
        .iter()
        .map(|p| point(p.x + x_offset as f32, p.y + y_offset as f32))
        .collect();
    with_points(&result, moved)
}

#[cfg(test)]
mod tests {
    #![allow(
        clippy::unwrap_used,
        clippy::expect_used,
        clippy::cast_precision_loss,
        clippy::cast_possible_truncation
    )]

    use super::*;
    use rxing::Luma8LuminanceSource;
    use rxing::common::{BitArray, BitMatrix, HybridBinarizer, LineOrientation};
    use std::borrow::Cow;
    use std::cell::Cell;
    use std::rc::Rc;

    /// A read of `format` carrying `text`, measured at `points`.
    fn read(format: BarcodeFormat, text: &str, points: &[(f32, f32)]) -> RXingResult {
        let points = points.iter().map(|&(x, y)| point(x, y)).collect();
        RXingResult::new_timestamp(text, Vec::new(), points, format, 0)
    }

    /// A read's points as pairs.
    fn points(result: &RXingResult) -> Vec<(f32, f32)> {
        result.getPoints().iter().map(|p| (p.x, p.y)).collect()
    }

    /// The box [x0, x1] × [y0, y1], clockwise from its top-left corner.
    fn corners(x0: f32, y0: f32, x1: f32, y1: f32) -> [(f32, f32); 4] {
        [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    }

    /// A white plane: the scripted readers below never look at pixels.
    fn blank(width: usize, height: usize) -> BinaryBitmap<HybridBinarizer<Luma8LuminanceSource>> {
        let source =
            Luma8LuminanceSource::new(vec![255; width * height], width as u32, height as u32)
                .unwrap();
        BinaryBitmap::new(HybridBinarizer::new(source))
    }

    /// What the recursion asks of a reader, in order.
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    enum Call {
        Reset,
        /// A read of a crop this wide and this high.
        Read(usize, usize),
        PassOver(BarcodeFormat),
        Readmit(BarcodeFormat),
    }

    /// Reads after which a scripted reader finds nothing more: a walk whose
    /// bounds fail ends, as a wrong count of reads, instead of spinning.
    const RUNAWAY: usize = 4096;

    /// A reader answering its `n`th read of a `width` × `height` crop with
    /// `answer(n, width, height)` (up to [`RUNAWAY`] reads), logging every
    /// call. It keeps the trait's rule for a read without points: it cannot
    /// pass over a format.
    struct Scripted<F> {
        answer: F,
        calls: Vec<Call>,
        reads: usize,
    }

    fn scripted<F: FnMut(usize, usize, usize) -> Option<RXingResult>>(answer: F) -> Scripted<F> {
        Scripted {
            answer,
            calls: Vec::new(),
            reads: 0,
        }
    }

    impl<F: FnMut(usize, usize, usize) -> Option<RXingResult>> Reader for Scripted<F> {
        fn decode<B: Binarizer>(&mut self, image: &mut BinaryBitmap<B>) -> Result<RXingResult> {
            self.decode_with_hints(image, &DecodeHints::default())
        }

        fn decode_with_hints<B: Binarizer>(
            &mut self,
            image: &mut BinaryBitmap<B>,
            _: &DecodeHints,
        ) -> Result<RXingResult> {
            let (width, height) = (image.get_width(), image.get_height());
            self.calls.push(Call::Read(width, height));
            self.reads += 1;
            let answer =
                (self.reads <= RUNAWAY).then(|| (self.answer)(self.reads - 1, width, height));
            answer.flatten().ok_or(Exceptions::NOT_FOUND)
        }

        fn reset(&mut self) {
            self.calls.push(Call::Reset);
        }
    }

    impl<F: FnMut(usize, usize, usize) -> Option<RXingResult>> NodeReader for Scripted<F> {}

    /// [`Scripted`], passing over every format it is asked to.
    struct Passing<F>(Scripted<F>);

    impl<F: FnMut(usize, usize, usize) -> Option<RXingResult>> Reader for Passing<F> {
        fn decode<B: Binarizer>(&mut self, image: &mut BinaryBitmap<B>) -> Result<RXingResult> {
            self.0.decode(image)
        }

        fn decode_with_hints<B: Binarizer>(
            &mut self,
            image: &mut BinaryBitmap<B>,
            hints: &DecodeHints,
        ) -> Result<RXingResult> {
            self.0.decode_with_hints(image, hints)
        }

        fn reset(&mut self) {
            self.0.reset();
        }
    }

    impl<F: FnMut(usize, usize, usize) -> Option<RXingResult>> NodeReader for Passing<F> {
        fn pass_over(&mut self, format: BarcodeFormat) -> bool {
            self.0.calls.push(Call::PassOver(format));
            true
        }

        fn readmit(&mut self, format: BarcodeFormat) {
            self.0.calls.push(Call::Readmit(format));
        }
    }

    /// The calls of plain reads of crops of these sizes, each after its
    /// reset (change 4).
    fn reads(sizes: &[(usize, usize)]) -> Vec<Call> {
        sizes
            .iter()
            .flat_map(|&(width, height)| [Call::Reset, Call::Read(width, height)])
            .collect()
    }

    /// Every read of the recursion from the root of a `width` × `height`
    /// plane, before the duplicate filter.
    fn walk<R: NodeReader>(reader: &mut R, width: usize, height: usize) -> Vec<RXingResult> {
        let mut results = Vec::new();
        let hints = DecodeHints::default();
        recurse(
            reader,
            &mut blank(width, height),
            &hints,
            &mut results,
            (0, 0),
            0,
        );
        results
    }

    #[test]
    fn a_read_sends_the_regions_left_of_above_right_of_and_below_it_to_their_own_reads() {
        // upstream's four crops, in its order, each read in its own frame
        // and its points moved back by the crop's offset
        let mut reader = scripted(|n, width, height| {
            let whole = corners(0.0, 0.0, width as f32, height as f32);
            Some(match n {
                0 => read(F::QR_CODE, "root", &corners(150.0, 120.0, 230.0, 170.0)),
                // a symbol filling its crop leaves no region of its own
                _ => read(F::QR_CODE, &format!("crop {n}"), &whole),
            })
        });
        let found = walk(&mut reader, 400, 300);
        let regions = [(400, 300), (150, 300), (400, 120), (170, 300), (400, 130)];
        assert_eq!(reader.calls, reads(&regions));
        let found: Vec<_> = found.iter().map(|r| (r.getText(), points(r))).collect();
        assert_eq!(
            found,
            [
                ("root", corners(150.0, 120.0, 230.0, 170.0).to_vec()),
                ("crop 1", corners(0.0, 0.0, 150.0, 300.0).to_vec()),
                ("crop 2", corners(0.0, 0.0, 400.0, 120.0).to_vec()),
                ("crop 3", corners(230.0, 0.0, 400.0, 300.0).to_vec()),
                ("crop 4", corners(0.0, 170.0, 400.0, 300.0).to_vec()),
            ]
        );
    }

    #[test]
    fn a_region_of_at_most_a_hundred_pixels_is_not_read() {
        // upstream's MIN_DIMENSION_TO_RECUR is strict on every side: a read
        // leaving exactly 100 pixels around it ends the walk
        let mut reader = scripted(|n, _, _| {
            (n == 0).then(|| read(F::QR_CODE, "root", &corners(100.0, 100.0, 300.0, 200.0)))
        });
        let found = walk(&mut reader, 400, 300);
        assert_eq!(reader.calls, reads(&[(400, 300)]));
        assert_eq!(found.len(), 1);
    }

    /// The calls and each read's first point when every crop of a 300 × 300
    /// plane holds a symbol at `at(crop width, crop height)`.
    fn chain(at: fn(f32, f32) -> [(f32, f32); 4]) -> (Vec<Call>, Vec<(f32, f32)>) {
        let mut reader =
            scripted(|_, w, h| Some(read(F::QR_CODE, "edge", &at(w as f32, h as f32))));
        let found = walk(&mut reader, 300, 300);
        (reader.calls, found.iter().map(|r| points(r)[0]).collect())
    }

    #[test]
    fn the_walk_reads_four_nested_crops_on_every_side() {
        // a symbol on the far edge of every crop leaves a region on the
        // other side; upstream's MAX_DEPTH ends the walk after the root and
        // four nested crops, on whichever side they lie
        let shrinking_width = [(300, 300), (299, 300), (298, 300), (297, 300), (296, 300)];
        let shrinking_height = [(300, 300), (300, 299), (300, 298), (300, 297), (300, 296)];
        let (calls, first) = chain(|w, h| corners(w - 1.0, 0.0, w, h));
        assert_eq!(calls, reads(&shrinking_width));
        assert_eq!(
            first,
            [
                (299.0, 0.0),
                (298.0, 0.0),
                (297.0, 0.0),
                (296.0, 0.0),
                (295.0, 0.0)
            ]
        );
        let (calls, first) = chain(|w, h| corners(0.0, h - 1.0, w, h));
        assert_eq!(calls, reads(&shrinking_height));
        assert_eq!(
            first,
            [
                (0.0, 299.0),
                (0.0, 298.0),
                (0.0, 297.0),
                (0.0, 296.0),
                (0.0, 295.0)
            ]
        );
        // the regions right of and below a read start where it ends: each
        // nested read lies one pixel further into the plane
        let (calls, first) = chain(|_, h| corners(0.0, 0.0, 1.0, h));
        assert_eq!(calls, reads(&shrinking_width));
        assert_eq!(
            first,
            [(0.0, 0.0), (1.0, 0.0), (2.0, 0.0), (3.0, 0.0), (4.0, 0.0)]
        );
        let (calls, first) = chain(|w, _| corners(0.0, 0.0, w, 1.0));
        assert_eq!(calls, reads(&shrinking_height));
        assert_eq!(
            first,
            [(0.0, 0.0), (0.0, 1.0), (0.0, 2.0), (0.0, 3.0), (0.0, 4.0)]
        );
    }

    #[test]
    fn a_read_without_points_ends_the_node_of_a_reader_that_cannot_pass_over() {
        // upstream's rule, the trait's default: nothing to crop around and
        // no other read of the node
        let mut reader = scripted(|_, _, _| Some(read(F::MAXICODE, "maxi", &[])));
        let found = walk(&mut reader, 300, 300);
        assert_eq!(reader.calls, reads(&[(300, 300)]));
        assert_eq!(found, [read(F::MAXICODE, "maxi", &[])]);
    }

    #[test]
    fn a_read_without_points_is_passed_over_and_its_node_read_again() {
        // change 3: the formats read without points are passed over until
        // a read has points, then readmitted before the crops are read
        let mut reader = Passing(scripted(|n, _, _| match n {
            0 => Some(read(F::MAXICODE, "maxi", &[])),
            1 => Some(read(F::AZTEC, "aztec", &[])),
            2 => Some(read(F::QR_CODE, "qr", &corners(150.0, 0.0, 300.0, 300.0))),
            _ => None,
        }));
        let found = walk(&mut reader, 300, 300);
        let mut calls = reads(&[(300, 300)]);
        calls.push(Call::PassOver(F::MAXICODE));
        calls.extend(reads(&[(300, 300)]));
        calls.push(Call::PassOver(F::AZTEC));
        calls.extend(reads(&[(300, 300)]));
        calls.extend([Call::Readmit(F::MAXICODE), Call::Readmit(F::AZTEC)]);
        calls.extend(reads(&[(150, 300)]));
        assert_eq!(reader.0.calls, calls);
        let texts: Vec<_> = found.iter().map(RXingResult::getText).collect();
        assert_eq!(texts, ["maxi", "aztec", "qr"]);
    }

    #[test]
    fn a_node_passes_over_at_most_eight_formats() {
        // MAX_PASSED: a reader answering without points forever cannot hold
        // its node: nine reads, eight formats passed over and readmitted
        let mut reader = Passing(scripted(|_, _, _| Some(read(F::MAXICODE, "maxi", &[]))));
        let found = walk(&mut reader, 300, 300);
        assert_eq!(found.len(), 9);
        let count = |call: Call| reader.0.calls.iter().filter(|c| **c == call).count();
        assert_eq!(count(Call::Read(300, 300)), 9);
        assert_eq!(count(Call::PassOver(F::MAXICODE)), 8);
        assert_eq!(count(Call::Readmit(F::MAXICODE)), 8);
        assert_eq!(reader.0.calls.len(), 9 * 2 + 8 + 8);
    }

    /// [`decode_multiple`] over a white `width` × `height` plane.
    fn decode_white<R: NodeReader>(
        reader: &mut R,
        width: u32,
        height: u32,
    ) -> Result<Vec<RXingResult>> {
        let luma = LumaImage::new(vec![255; (width * height) as usize], width, height);
        let mut image = blank(width as usize, height as usize);
        decode_multiple(reader, &mut image, &DecodeHints::default(), &luma)
    }

    #[test]
    fn of_two_reads_of_one_matrix_symbol_the_later_one_stays() {
        // the root and its left crop both read the symbol lying on the
        // crop's edge: one symbol, published once, as the later read
        // measured it; nothing read is no symbol at all
        let twin = |n| match n {
            0 => Some(read(
                F::QR_CODE,
                "twin",
                &corners(150.0, 150.0, 250.0, 250.0),
            )),
            1 => Some(read(
                F::QR_CODE,
                "twin",
                &corners(140.0, 150.0, 150.0, 250.0),
            )),
            _ => None,
        };
        let found = decode_white(&mut scripted(|n, _, _| twin(n)), 300, 300).unwrap();
        assert_eq!(found, [twin(1).unwrap()]);
        let lone = decode_white(
            &mut scripted(|n, _, _| twin(n).filter(|_| n == 0)),
            300,
            300,
        );
        assert_eq!(lone.unwrap(), [twin(0).unwrap()]);
        let none = decode_white(&mut scripted(|_, _, _| None), 300, 300);
        assert!(
            matches!(none, Err(Exceptions::NotFoundException(_))),
            "{none:?}"
        );
    }

    /// A QR read of `text` over the 10-pixel square at `x0` on the top edge.
    fn qr_at(text: &str, x0: f32) -> RXingResult {
        read(F::QR_CODE, text, &corners(x0, 0.0, x0 + 10.0, 10.0))
    }

    /// An EAN-13 read of one content, measured at `points`.
    fn ean_at(points: &[(f32, f32)]) -> RXingResult {
        read(F::EAN_13, "4006381333931", points)
    }

    /// An EAN-13 read scanned along row `y`, from x = 0 to x = 100.
    fn ean_row(y: f32) -> RXingResult {
        ean_at(&[(0.0, y), (100.0, y)])
    }

    /// 400 × 40 blank pixels: they prove nothing either way.
    fn blank_luma() -> LumaImage {
        LumaImage::new(vec![255; 400 * 40], 400, 40)
    }

    /// Change 5, pair by pair over blank pixels with every bridge left:
    /// whether `other`, read later or earlier, makes `own` a duplicate.
    fn assert_supersedes(cases: &[(&str, RXingResult, RXingResult, bool, bool)]) {
        let luma = blank_luma();
        for (why, other, own, later, superseded) in cases {
            let mut bridges = MAX_FILTER_BRIDGES;
            assert_eq!(
                supersedes(other, own, *later, &luma, &mut bridges),
                *superseded,
                "{why}"
            );
        }
    }

    #[test]
    fn matrix_duplicates_go_by_content_and_meeting_boxes() {
        let pointless = |text: &str| read(F::QR_CODE, text, &[]);
        let data_matrix = read(F::DATA_MATRIX, "A", &corners(10.0, 0.0, 20.0, 10.0));
        assert_supersedes(&[
            // matrix reads: the later of one content whose boxes meet
            (
                "later, boxes touching",
                qr_at("A", 10.0),
                qr_at("A", 0.0),
                true,
                true,
            ),
            (
                "earlier, boxes touching",
                qr_at("A", 10.0),
                qr_at("A", 0.0),
                false,
                false,
            ),
            (
                "later, boxes apart",
                qr_at("A", 30.0),
                qr_at("A", 0.0),
                true,
                false,
            ),
            (
                "later, other text",
                qr_at("B", 10.0),
                qr_at("A", 0.0),
                true,
                false,
            ),
            (
                "later, other symbology",
                data_matrix,
                qr_at("A", 0.0),
                true,
                false,
            ),
            // a read without points cannot be told apart: upstream's rule
            (
                "later, without points",
                pointless("A"),
                qr_at("A", 0.0),
                true,
                true,
            ),
            (
                "own without points",
                qr_at("A", 30.0),
                pointless("A"),
                true,
                true,
            ),
            (
                "earlier, both without points",
                pointless("A"),
                pointless("A"),
                false,
                false,
            ),
            (
                "later, both without points, other text",
                pointless("B"),
                pointless("A"),
                true,
                false,
            ),
        ]);
    }

    #[test]
    fn linear_duplicates_go_by_content_and_their_scan_lines() {
        assert_supersedes(&[
            // linear reads: the later of one content its pixels prove one
            // symbol; one without a scan line cannot be told apart
            (
                "later, a row below",
                ean_row(11.0),
                ean_row(10.0),
                true,
                true,
            ),
            (
                "earlier, a row below",
                ean_row(11.0),
                ean_row(10.0),
                false,
                false,
            ),
            (
                "later, further along",
                ean_at(&[(200.0, 10.0), (300.0, 10.0)]),
                ean_row(10.0),
                true,
                false,
            ),
            (
                "later, parallel, blank pixels between",
                ean_row(30.0),
                ean_row(10.0),
                true,
                false,
            ),
            (
                "later, no scan line",
                ean_at(&[(50.0, 10.0)]),
                ean_row(10.0),
                true,
                true,
            ),
        ]);
    }

    #[test]
    fn a_linear_read_inside_a_matrix_symbol_is_its_texture() {
        let label = read(F::QR_CODE, "label", &corners(0.0, 0.0, 100.0, 40.0));
        assert_supersedes(&[
            // a linear read inside a matrix symbol is its texture, whatever
            // its content or order; never the other way round
            (
                "inside a matrix quad",
                label.clone(),
                ean_row(20.0),
                false,
                true,
            ),
            (
                "out of a matrix quad",
                label.clone(),
                ean_at(&[(10.0, 20.0), (120.0, 20.0)]),
                false,
                false,
            ),
            (
                "a matrix read around a linear one",
                ean_row(20.0),
                label,
                true,
                false,
            ),
        ]);
    }

    #[test]
    fn the_pixels_between_two_scan_lines_prove_one_symbol_or_nothing() {
        let luma = blank_luma();
        // the pixels decide what the geometry leaves open, one of the
        // filter's comparisons each: bars running from one scan line to the
        // other prove one symbol, blank pixels prove nothing
        let bars: Vec<u8> = (0..400 * 40)
            .map(|i| if i % 4 < 2 { 0 } else { 255 })
            .collect();
        let bars = LumaImage::new(bars, 400, 40);
        let mut bridges = MAX_FILTER_BRIDGES;
        assert!(supersedes(
            &ean_row(30.0),
            &ean_row(10.0),
            true,
            &bars,
            &mut bridges
        ));
        assert!(!supersedes(
            &ean_row(30.0),
            &ean_row(10.0),
            true,
            &luma,
            &mut bridges
        ));
        assert!(supersedes(
            &ean_row(11.0),
            &ean_row(10.0),
            true,
            &luma,
            &mut bridges
        ));
        assert_eq!(bridges, MAX_FILTER_BRIDGES - 2);
    }

    #[test]
    fn the_format_reader_passes_over_a_matrix_format_once_until_readmitted() {
        // a linear read always has points: only the matrix readers are
        // passed over, each once, and readmitting one keeps the others out
        let mut reader = FormatReader::default();
        assert!(!reader.pass_over(F::EAN_13));
        assert!(reader.pass_over(F::MAXICODE));
        assert!(!reader.pass_over(F::MAXICODE));
        assert!(reader.pass_over(F::AZTEC));
        assert_eq!(reader.passed_over, [F::MAXICODE, F::AZTEC]);
        reader.readmit(F::MAXICODE);
        assert_eq!(reader.passed_over, [F::AZTEC]);
        assert!(reader.pass_over(F::MAXICODE));
        reader.readmit(F::AZTEC);
        reader.readmit(F::MAXICODE);
        assert_eq!(reader.passed_over, Vec::<BarcodeFormat>::new());
    }

    #[test]
    fn a_matrix_read_closes_its_quad_in_its_readers_order() {
        let quad = |format, points: &[(f32, f32)]| {
            matrix_quad(&read(format, "m", points)).map(|q| q.map(|p| (p.x, p.y)))
        };
        let square = Some(corners(10.0, 10.0, 90.0, 90.0));
        // the QR port's [TL, TR, BL, BR], a bow tie as given
        let port = [(10.0, 10.0), (90.0, 10.0), (10.0, 90.0), (90.0, 90.0)];
        assert_eq!(quad(F::QR_CODE, &port), square);
        // the lineage reader's [BL, TL, TR, alignment]
        let lineage = [(10.0, 90.0), (10.0, 10.0), (90.0, 10.0), (80.0, 80.0)];
        assert_eq!(quad(F::QR_CODE, &lineage), Some(lineage));
        // four corners as given, counter-clockwise ones turned clockwise
        let counter = [(10.0, 10.0), (10.0, 90.0), (90.0, 90.0), (90.0, 10.0)];
        assert_eq!(quad(F::DATA_MATRIX, &counter), square);
        // PDF417's eight vertices [TL, BL, TR, BR, …]
        let pdf417 = [
            (10.0, 20.0),
            (10.0, 60.0),
            (90.0, 20.0),
            (90.0, 60.0),
            (30.0, 20.0),
            (30.0, 60.0),
            (70.0, 20.0),
            (70.0, 60.0),
        ];
        assert_eq!(
            quad(F::PDF_417, &pdf417),
            Some(corners(10.0, 20.0, 90.0, 60.0))
        );
        // no quad from another count of points
        assert_eq!(quad(F::QR_CODE, &port[..3]), None);
        assert_eq!(quad(F::QR_CODE, &pdf417), None);
        assert_eq!(quad(F::AZTEC, &[]), None);
    }

    #[test]
    fn a_point_lies_inside_a_quad_within_one_pixel() {
        let quad = corners(20.0, 10.0, 120.0, 90.0).map(|(x, y)| Point { x, y });
        let at = |x, y| inside(&quad, Point { x, y });
        assert!(at(70.0, 50.0));
        // half a pixel out of each edge: inside the tolerance
        for (x, y) in [(19.5, 50.0), (70.0, 9.5), (120.5, 50.0), (70.0, 90.5)] {
            assert!(at(x, y), "({x}, {y})");
        }
        // a pixel and a half out of each edge
        for (x, y) in [(18.5, 50.0), (70.0, 8.5), (121.5, 50.0), (70.0, 91.5)] {
            assert!(!at(x, y), "({x}, {y})");
        }
        // a tilted quad (edges along 3-4-5 triangles): its centre, and a
        // point a pixel and a half out of its first edge
        let tilted = [(40.0, 10.0), (80.0, 40.0), (50.0, 80.0), (10.0, 50.0)];
        let tilted = tilted.map(|(x, y)| Point { x, y });
        assert!(inside(&tilted, Point { x: 45.0, y: 45.0 }));
        assert!(!inside(&tilted, Point { x: 60.9, y: 23.8 }));
    }

    #[test]
    fn boxes_meet_when_they_overlap_or_touch() {
        let box_of = |x0, y0, x1, y1| corners(x0, y0, x1, y1).map(|(x, y)| point(x, y));
        let own = box_of(10.0, 10.0, 20.0, 20.0);
        let meeting = [
            box_of(15.0, 15.0, 30.0, 30.0),
            box_of(20.0, 10.0, 30.0, 20.0),
            box_of(0.0, 10.0, 10.0, 20.0),
            box_of(10.0, 20.0, 20.0, 30.0),
            box_of(10.0, 0.0, 20.0, 10.0),
        ];
        for other in &meeting {
            assert!(
                boxes_meet(&own, other) && boxes_meet(other, &own),
                "{other:?}"
            );
        }
        // apart along one axis only, on each side
        let apart = [
            box_of(21.0, 10.0, 30.0, 20.0),
            box_of(0.0, 10.0, 9.0, 20.0),
            box_of(10.0, 21.0, 20.0, 30.0),
            box_of(10.0, 0.0, 20.0, 9.0),
        ];
        for other in &apart {
            assert!(
                !boxes_meet(&own, other) && !boxes_meet(other, &own),
                "{other:?}"
            );
        }
        assert!(!boxes_meet(&own, &[]));
    }

    #[test]
    fn a_scan_line_joins_the_two_farthest_points_of_a_read() {
        let line = |points: &[(f32, f32)]| {
            let points: Vec<_> = points.iter().map(|&(x, y)| point(x, y)).collect();
            scan_line(&points).map(|ends| ends.map(|p| (p.x, p.y)))
        };
        let along_row = [(10.0, 10.0), (20.0, 10.0), (110.0, 10.0)];
        assert_eq!(line(&along_row), Some([(10.0, 10.0), (110.0, 10.0)]));
        let along_column = along_row.map(|(x, y)| (y, x));
        assert_eq!(line(&along_column), Some([(10.0, 10.0), (10.0, 110.0)]));
        // of equally far pairs the first, in the reader's order
        let back = [(0.0, 0.0), (100.0, 0.0), (0.0, 0.0)];
        assert_eq!(line(&back), Some([(0.0, 0.0), (100.0, 0.0)]));
        // at least a pixel long
        assert_eq!(
            line(&[(10.0, 10.0), (11.0, 10.0)]),
            Some([(10.0, 10.0), (11.0, 10.0)])
        );
        assert_eq!(line(&[(10.0, 10.0), (10.5, 10.5)]), None);
        assert_eq!(line(&[(10.0, 10.0)]), None);
    }

    /// PDF417's eight vertices [TL, BL, TR, BR, …] of rows 20 to 60.
    const PDF417_VERTICES: [(f32, f32); 8] = [
        (10.0, 20.0),
        (10.0, 60.0),
        (90.0, 20.0),
        (90.0, 60.0),
        (30.0, 20.0),
        (30.0, 60.0),
        (70.0, 20.0),
        (70.0, 60.0),
    ];

    #[test]
    fn pdf417_vertices_come_back_from_the_detectors_rotated_matrix() {
        let raw: Vec<_> = PDF417_VERTICES.iter().map(|&(x, y)| point(x, y)).collect();
        let at = |raw: &[rxing::Point], orientation| -> Vec<(f32, f32)> {
            let points = pdf417_points(raw, orientation, (200.0, 150.0));
            points.iter().map(|p| (p.x, p.y)).collect()
        };
        // a bottom vertex is its last row's index, a pixel above its edge
        let upright = [
            (10.0, 20.0),
            (10.0, 61.0),
            (90.0, 20.0),
            (90.0, 61.0),
            (30.0, 20.0),
            (30.0, 61.0),
            (70.0, 20.0),
            (70.0, 61.0),
        ];
        assert_eq!(at(&raw, 0), upright);
        // the inverse of `BitMatrix::rotate` in a 200 × 150 crop
        let turned = |f: fn((f32, f32)) -> (f32, f32)| upright.map(f).to_vec();
        assert_eq!(at(&raw, 90), turned(|(x, y)| (200.0 - y, x)));
        assert_eq!(at(&raw, 180), turned(|(x, y)| (200.0 - x, 150.0 - y)));
        assert_eq!(at(&raw, 270), turned(|(x, y)| (y, 150.0 - x)));
        assert_eq!(at(&raw, 90)[..2], [(180.0, 10.0), (139.0, 10.0)]);
        assert_eq!(at(&raw, 180)[..2], [(190.0, 130.0), (190.0, 89.0)]);
        assert_eq!(at(&raw, 270)[..2], [(20.0, 140.0), (61.0, 140.0)]);
        assert_eq!(at(&raw, -90), at(&raw, 270));
        assert_eq!(at(&raw, 450), at(&raw, 90));
        // fewer vertices: none is known to lie on the bottom row
        assert_eq!(at(&raw[..4], 0), PDF417_VERTICES[..4]);
    }

    /// [`linear_points`] of a read of `format` at `orientation` in a
    /// 200 × 150 crop.
    fn linear_at(format: BarcodeFormat, orientation: i32, raw: &[(f32, f32)]) -> Vec<(f32, f32)> {
        let raw: Vec<_> = raw.iter().map(|&(x, y)| point(x, y)).collect();
        let points = linear_points(format, orientation, &raw, (200.0, 150.0));
        points.iter().map(|p| (p.x, p.y)).collect()
    }

    #[test]
    fn linear_points_come_back_to_the_centre_of_the_row_read() {
        // an EAN-13 across x 37..161 on row 12, then on column 12
        let row = [(37.0, 12.0), (161.0, 12.0), (99.0, 12.0)];
        assert_eq!(
            linear_at(F::EAN_13, 0, &row),
            [(37.0, 12.5), (161.0, 12.5), (99.0, 12.5)]
        );
        let column = row.map(|(x, y)| (y, x));
        let rotated = [(12.5, 37.0), (12.5, 161.0), (12.5, 99.0)];
        assert_eq!(linear_at(F::EAN_13, 270, &column), rotated);
        assert_eq!(linear_at(F::EAN_13, -90, &column), rotated);
        // read reversed (n - x - 1): one pixel on; only the first two
        // points are mapped back, the others are dropped
        let reversed = [(160.0, 12.0), (36.0, 12.0), (99.0, 12.0)];
        assert_eq!(
            linear_at(F::EAN_13, 180, &reversed),
            [(161.0, 12.5), (37.0, 12.5)]
        );
        let reversed = reversed.map(|(x, y)| (y, x));
        let both = [(12.5, 161.0), (12.5, 37.0)];
        assert_eq!(linear_at(F::EAN_13, 90, &reversed), both);
        assert_eq!(linear_at(F::EAN_13, 450, &reversed), both);
        // a DataBar mirrors its right finder out of a reversed row
        let databar = [(20.0, 12.0), (50.0, 12.0), (139.0, 12.0), (169.0, 12.0)];
        let finders = [(20.0, 12.5), (50.0, 12.5), (140.0, 12.5), (170.0, 12.5)];
        assert_eq!(linear_at(F::RSS_14, 0, &databar), finders);
        let databar = databar.map(|(x, y)| (y, x));
        let finders = finders.map(|(x, y)| (y, x));
        assert_eq!(linear_at(F::RSS_14, 270, &databar), finders);
    }

    #[test]
    fn code_39_recovers_the_end_of_its_stop_character_in_any_orientation() {
        // a Code 39 across 40..160 of row 12, then of column 12; rxing
        // reports half its stop character's crop-local end
        let row = [(40.0, 12.5), (160.0, 12.5)];
        assert_eq!(linear_at(F::CODE_39, 0, &[(40.0, 12.0), (80.0, 12.0)]), row);
        let backwards = [(160.0, 12.5), (40.0, 12.5)];
        assert_eq!(
            linear_at(F::CODE_39, 180, &[(159.0, 12.0), (119.0, 12.0)]),
            backwards
        );
        // down column 12 across 30..120 of the 150-pixel height
        let column = [(12.5, 30.0), (12.5, 120.0)];
        assert_eq!(
            linear_at(F::CODE_39, 270, &[(12.0, 30.0), (12.0, 60.0)]),
            column
        );
        let upwards = [(12.5, 120.0), (12.5, 30.0)];
        assert_eq!(
            linear_at(F::CODE_39, 90, &[(12.0, 119.0), (12.0, 89.0)]),
            upwards
        );
    }

    /// `read` turned by `degrees`, with bytes, bit count and timestamp of
    /// its own.
    fn oriented(format: BarcodeFormat, points: &[(f32, f32)], degrees: i32) -> RXingResult {
        let points = points.iter().map(|&(x, y)| point(x, y)).collect();
        let mut result = RXingResult::new_complex("read", vec![0x5a], 7, points, format, 42);
        result.putMetadata(MetaKey::ORIENTATION, MetaValue::Orientation(degrees));
        result
    }

    #[test]
    fn each_read_is_normalized_in_its_own_symbologys_convention() {
        // the QR family, Data Matrix and Aztec keep rxing's points
        let square = corners(10.0, 10.0, 50.0, 50.0);
        for format in [F::QR_CODE, F::DATA_MATRIX, F::AZTEC] {
            let own = oriented(format, &square, 90);
            assert_eq!(
                normalized(own.clone(), 200, 150),
                (own.clone(), own.getPoints().to_vec())
            );
        }
        // a linear read publishes its points in the crop's frame, the rest
        // of it kept, and the walk crops around them
        let ean = oriented(F::EAN_13, &[(160.0, 12.0), (36.0, 12.0), (99.0, 12.0)], 180);
        let expected = oriented(F::EAN_13, &[(161.0, 12.5), (37.0, 12.5)], 180);
        assert_eq!(
            normalized(ean, 200, 150),
            (expected.clone(), expected.getPoints().to_vec())
        );
        let pdf417 = oriented(F::PDF_417, &PDF417_VERTICES[..4], 180);
        let turned = [(190.0, 130.0), (190.0, 90.0), (110.0, 130.0), (110.0, 90.0)];
        let expected = oriented(F::PDF_417, &turned, 180);
        assert_eq!(
            normalized(pdf417, 200, 150),
            (expected.clone(), expected.getPoints().to_vec())
        );
        // Codabar and Telepen measure no point of the image: none is
        // published, and the walk crops around rxing's own
        for format in [F::CODABAR, F::TELEPEN] {
            let own = oriented(format, &[(5.0, 12.0), (180.0, 12.0)], 0);
            let (published, extent) = normalized(own.clone(), 200, 150);
            assert_eq!(published, oriented(format, &[], 0));
            assert_eq!(extent, own.getPoints());
        }
    }

    #[test]
    fn a_read_moves_by_its_crops_offset_and_only_then() {
        // a moved read is the reader's result with its points moved
        // (upstream's `translatePoints`; its line count is the rebuild's
        // business, not compared); a read nothing moves — no offset, or no
        // point — is the reader's result as it made it
        let mut own = oriented(F::QR_CODE, &[(1.0, 2.0), (3.0, 5.0)], 0);
        own.set_line_count(3);
        let moved = oriented(F::QR_CODE, &[(101.0, 22.0), (103.0, 25.0)], 0);
        let got = translated(own.clone(), 100, 20);
        assert_eq!(got.getPoints(), moved.getPoints());
        assert_eq!(
            (got.getText(), got.getRawBytes(), got.getNumBits()),
            (moved.getText(), moved.getRawBytes(), moved.getNumBits())
        );
        assert_eq!(
            (got.getBarcodeFormat(), got.getTimestamp()),
            (moved.getBarcodeFormat(), moved.getTimestamp())
        );
        assert_eq!(got.getRXingResultMetadata(), moved.getRXingResultMetadata());
        assert_eq!(translated(own.clone(), 0, 0), own);
        let mut bare = oriented(F::MAXICODE, &[], 0);
        bare.set_line_count(3);
        assert_eq!(translated(bare.clone(), 100, 20), bare);
    }

    /// A committed symbology fixture as an attempt plane.
    fn fixture(name: &str) -> LumaImage {
        let path = format!(
            "{}/../../fixtures/symbology/{name}",
            env!("CARGO_MANIFEST_DIR")
        );
        let image = image::open(path).unwrap().to_luma8();
        let (width, height) = image.dimensions();
        LumaImage::new(image.into_raw(), width, height)
    }

    /// A QR Code of `text`, four pixels a module, as an attempt plane.
    fn qr_plane(text: &str) -> LumaImage {
        let code = qrcode::QrCode::new(text.as_bytes()).unwrap();
        let image = code
            .render::<image::Luma<u8>>()
            .module_dimensions(4, 4)
            .build();
        let (width, height) = image.dimensions();
        LumaImage::new(image.into_raw(), width, height)
    }

    /// The engine's binarized bitmap of a plane.
    fn bitmap(luma: &LumaImage) -> BinaryBitmap<HybridBinarizer<Luma8LuminanceSource>> {
        let source =
            Luma8LuminanceSource::new(luma.data().to_vec(), luma.width(), luma.height()).unwrap();
        BinaryBitmap::new(HybridBinarizer::new(source))
    }

    /// The format and text of `reader`'s read of `luma` under `hints`.
    fn read_with(
        reader: &mut FormatReader,
        luma: &LumaImage,
        hints: &DecodeHints,
    ) -> Option<(BarcodeFormat, String)> {
        let read = reader.decode_with_hints(&mut bitmap(luma), hints).ok()?;
        Some((*read.getBarcodeFormat(), read.getText().to_owned()))
    }

    #[test]
    fn the_format_reader_reads_linear_symbols_first_only_without_try_harder() {
        // change 1, one fixed order: under TryHarder (every engine pass)
        // the QR family before the linear readers, without it the linear
        // readers first — on a plane holding the EAN-13 fixture and a QR
        let (ean, qr) = (fixture("ean13.png"), qr_plane("beside"));
        let (width, height) = (ean.width() + qr.width(), ean.height().max(qr.height()));
        let mut data = vec![255; (width * height) as usize];
        for (y, row) in ean.data().chunks(ean.width() as usize).enumerate() {
            let at = y * width as usize;
            data[at..at + row.len()].copy_from_slice(row);
        }
        for (y, row) in qr.data().chunks(qr.width() as usize).enumerate() {
            let at = y * width as usize + ean.width() as usize;
            data[at..at + row.len()].copy_from_slice(row);
        }
        let both = LumaImage::new(data, width, height);
        let first = |try_harder| {
            let hints = DecodeHints {
                TryHarder: Some(try_harder),
                ..DecodeHints::default()
            };
            read_with(&mut FormatReader::default(), &both, &hints)
        };
        assert_eq!(first(true), Some((F::QR_CODE, "beside".to_owned())));
        assert_eq!(first(false), Some((F::EAN_13, "9506000134352".to_owned())));
    }

    #[test]
    fn the_format_reader_runs_the_readers_of_its_open_formats_only() {
        // a format set restricts the readers to its own, and a format
        // passed over stays out of the reads until readmitted
        let only = |format| DecodeHints {
            PossibleFormats: Some(std::collections::HashSet::from([format])),
            TryHarder: Some(true),
            ..DecodeHints::default()
        };
        let qr = qr_plane("only");
        let mut reader = FormatReader::default();
        let found = Some((F::QR_CODE, "only".to_owned()));
        assert_eq!(read_with(&mut reader, &qr, &only(F::QR_CODE)), found);
        assert_eq!(read_with(&mut reader, &qr, &only(F::AZTEC)), None);
        let aztec = fixture("aztec.png");
        let found = Some((F::AZTEC, "https://qrcode-ai.com/aztec".to_owned()));
        assert_eq!(read_with(&mut reader, &aztec, &only(F::AZTEC)), found);
        assert!(reader.pass_over(F::AZTEC));
        assert_eq!(read_with(&mut reader, &aztec, &only(F::AZTEC)), None);
        reader.readmit(F::AZTEC);
        assert_eq!(read_with(&mut reader, &aztec, &only(F::AZTEC)), found);
    }

    /// The engine's binarizer, counting the rows the linear readers ask of
    /// it (the matrix readers binarize the whole plane at once).
    struct RowCounting {
        inner: HybridBinarizer<Luma8LuminanceSource>,
        rows: Rc<Cell<usize>>,
    }

    impl Binarizer for RowCounting {
        type Source = Luma8LuminanceSource;

        fn get_luminance_source(&self) -> &Self::Source {
            self.inner.get_luminance_source()
        }

        fn get_black_row(&self, y: usize) -> Result<Cow<'_, BitArray>> {
            self.rows.set(self.rows.get() + 1);
            self.inner.get_black_row(y)
        }

        fn get_black_row_from_matrix(&self, y: usize) -> Result<Cow<'_, BitArray>> {
            self.inner.get_black_row_from_matrix(y)
        }

        fn get_black_matrix(&self) -> Result<&BitMatrix> {
            self.inner.get_black_matrix()
        }

        fn get_black_line(&self, l: usize, lt: LineOrientation) -> Result<Cow<'_, BitArray>> {
            self.inner.get_black_line(l, lt)
        }

        fn create_binarizer(&self, source: Self::Source) -> Self {
            let inner = self.inner.create_binarizer(source);
            Self {
                inner,
                rows: Rc::clone(&self.rows),
            }
        }

        fn get_width(&self) -> usize {
            self.inner.get_width()
        }

        fn get_height(&self) -> usize {
            self.inner.get_height()
        }
    }

    /// The rows the linear readers asked of a white 200 × 100 plane, and of
    /// its turns, while `read` read nothing in it.
    fn rows_read(
        read: impl FnOnce(&mut BinaryBitmap<RowCounting>) -> Result<RXingResult>,
    ) -> usize {
        let rows = Rc::new(Cell::new(0));
        let source = Luma8LuminanceSource::new(vec![255; 200 * 100], 200, 100).unwrap();
        let inner = HybridBinarizer::new(source);
        let mut image = BinaryBitmap::new(RowCounting {
            inner,
            rows: Rc::clone(&rows),
        });
        let found = read(&mut image);
        assert!(
            matches!(found, Err(Exceptions::NotFoundException(_))),
            "{found:?}"
        );
        rows.get()
    }

    #[test]
    fn a_set_without_a_linear_format_never_runs_the_linear_readers() {
        // the score probes decode their own symbology alone: a matrix-only
        // pass pays for no linear pass, and under TryHarder a pass with a
        // linear format pays for one — every row of the plane and of its
        // quarter turn, as a lone linear reader scans them
        let hints = |formats: &[BarcodeFormat]| DecodeHints {
            PossibleFormats: Some(formats.iter().copied().collect()),
            TryHarder: Some(true),
            ..DecodeHints::default()
        };
        let (matrix, mixed) = (hints(&[F::QR_CODE]), hints(&[F::QR_CODE, F::EAN_13]));
        let lone =
            rows_read(|image| MultiFormatOneDReader::new(&mixed).decode_with_hints(image, &mixed));
        assert_eq!(lone, 100 + 200);
        let format_reader = |hints: &DecodeHints| {
            rows_read(|image| FormatReader::default().decode_with_hints(image, hints))
        };
        assert_eq!(format_reader(&matrix), 0);
        assert_eq!(format_reader(&mixed), lone);
    }
}
