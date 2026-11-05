//! Physical occurrences: what each reader measured of the symbols it read
//! (spec/01 § Occurrences).
//!
//! A content detection says WHAT was read; its occurrences say WHERE each
//! physical copy of it was measured. A footprint is published only as the
//! reader measured it — never completed, extended or invented:
//!
//! - `quad`: four validated outer corners (finite, inside the image with a
//!   small tolerance, strictly convex, area ≥ [`MIN_QUAD_AREA`], clockwise in
//!   image space). The first corner is the reader's first corner; only the
//!   QR family gives it a meaning (the symbol's top-left finder);
//! - `segment`: the two points a linear reader reports along its scan line —
//!   neither the symbol's extent nor a height;
//! - `partial`: points that do not form a validated quad or segment (finder
//!   centres, finder spans, a corner set with a point missing);
//! - `unavailable`: the reader measured nothing.
//!
//! Reads of one content are grouped into occurrences at publication: two
//! matrix footprints are one symbol when the centre of either lies inside
//! the other — a quad's own outline, a partial's box — within one pixel of
//! the coarser plane that measured them plus one; two linear footprints are
//! one symbol when their scan lines cross, or run parallel over a shared
//! stretch with the source pixels between them keeping the bar pattern
//! ([`same_linear`]). A comparison that cannot decide keeps the footprint
//! with the earliest group it may belong to — a copy is never invented —
//! without joining groups, and flags the grouping (saturation).

use super::reconcile::Rank;
use crate::input::LumaImage;
use crate::report::{EngineKind, Point, Symbology};

/// Footprints one folded read keeps (the earliest by rank): room for every
/// attempt of a walk to re-measure a few copies before a late copy's first
/// footprint is crowded out.
pub(crate) const MAX_OBSERVATIONS: usize = 128;

/// Occurrences one detection publishes (the earliest observed).
pub(crate) const MAX_OCCURRENCES: usize = 16;

/// Footprints one detection groups into occurrences (the earliest by rank).
const MAX_GROUPED: usize = 256;

/// Smallest published quad, in square pixels.
const MIN_QUAD_AREA: f64 = 4.0;

/// Points a partial footprint keeps.
const MAX_PARTIAL_POINTS: usize = 8;

/// What a footprint's points are, least specific first: a validated shape
/// (quad, segment) before the points that form none.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub(crate) enum Kind {
    /// Nothing measured.
    Unavailable,
    /// Points that form no validated quad or segment.
    Partial,
    /// The reader's scan-line points.
    #[cfg_attr(
        not(feature = "engine-rxing"),
        allow(dead_code, reason = "only rxing's linear readers measure a scan line")
    )]
    Segment,
    /// Four validated outer corners.
    Quad,
}

/// One reader's measurement of one symbol.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Footprint {
    /// What the points are.
    pub(crate) kind: Kind,
    /// Quad 4 · segment 2 · partial 1-8 · unavailable none.
    pub(crate) points: Vec<Point>,
    /// The detector that measured them (`None` iff unavailable).
    pub(crate) detector: Option<EngineKind>,
}

impl Footprint {
    /// Nothing measured.
    pub(crate) fn unavailable() -> Self {
        Self {
            kind: Kind::Unavailable,
            points: Vec::new(),
            detector: None,
        }
    }

    /// A candidate shape before validation ([`Footprint::validated`]).
    pub(crate) fn candidate(kind: Kind, points: Vec<Point>, detector: EngineKind) -> Self {
        if points.is_empty() {
            return Self::unavailable();
        }
        Self {
            kind,
            points,
            detector: Some(detector),
        }
    }

    /// The footprint in another image's coordinates (per-axis factors, the
    /// ladder's only plane transform).
    #[expect(
        clippy::cast_precision_loss,
        reason = "dimensions bounded by Limits::max_dimension — exact in f32"
    )]
    pub(crate) fn rescaled(mut self, from: (u32, u32), to: (u32, u32)) -> Self {
        if from != to && from.0 > 0 && from.1 > 0 {
            let fx = to.0 as f32 / from.0 as f32;
            let fy = to.1 as f32 / from.1 as f32;
            for p in &mut self.points {
                p.x *= fx;
                p.y *= fy;
            }
        }
        self
    }

    /// The footprint as published inside a `width` × `height` image: a
    /// quad or segment that fails validation keeps its valid points as a
    /// partial footprint; no point outside the image (beyond a tolerance of
    /// max(2 px, 2% of the longer side)) or non-finite point survives.
    #[expect(
        clippy::cast_precision_loss,
        reason = "dimensions bounded by Limits::max_dimension — exact in f32"
    )]
    pub(crate) fn validated(self, (width, height): (u32, u32)) -> Self {
        let Some(detector) = self.detector else {
            return Self::unavailable();
        };
        let tolerance = 2.0_f32.max(0.02 * width.max(height) as f32);
        let within = |p: &Point| {
            p.x.is_finite()
                && p.y.is_finite()
                && (-tolerance..=width as f32 + tolerance).contains(&p.x)
                && (-tolerance..=height as f32 + tolerance).contains(&p.y)
        };
        match self.kind {
            Kind::Quad if self.points.len() == 4 && self.points.iter().all(within) => {
                match clockwise_quad(&self.points) {
                    Some(quad) => Self {
                        kind: Kind::Quad,
                        points: quad.to_vec(),
                        detector: Some(detector),
                    },
                    None => partial(self.points, detector),
                }
            }
            Kind::Segment if self.points.len() == 2 && self.points.iter().all(within) => {
                let (a, b) = (self.points[0], self.points[1]);
                if f64::from(a.x - b.x).hypot(f64::from(a.y - b.y)) < 1.0 {
                    return partial(vec![a], detector);
                }
                // no orientation is claimed: canonical order, x then y
                let ordered = if (a.x, a.y) <= (b.x, b.y) {
                    vec![a, b]
                } else {
                    vec![b, a]
                };
                Self {
                    kind: Kind::Segment,
                    points: ordered,
                    detector: Some(detector),
                }
            }
            Kind::Unavailable => Self::unavailable(),
            _ => partial(self.points.into_iter().filter(within).collect(), detector),
        }
    }

    /// The centre of its points.
    pub(crate) fn centre(&self) -> Option<(f64, f64)> {
        if self.points.is_empty() {
            return None;
        }
        #[expect(clippy::cast_precision_loss, reason = "at most eight points")]
        let n = self.points.len() as f64;
        let (x, y) = self.points.iter().fold((0.0, 0.0), |(x, y), p| {
            (x + f64::from(p.x), y + f64::from(p.y))
        });
        Some((x / n, y / n))
    }

    /// The axis-aligned box of its points.
    fn bounds(&self) -> Option<(f64, f64, f64, f64)> {
        let mut points = self.points.iter();
        let first = points.next()?;
        let init = (
            f64::from(first.x),
            f64::from(first.y),
            f64::from(first.x),
            f64::from(first.y),
        );
        Some(points.fold(init, |(x0, y0, x1, y1), p| {
            (
                x0.min(f64::from(p.x)),
                y0.min(f64::from(p.y)),
                x1.max(f64::from(p.x)),
                y1.max(f64::from(p.y)),
            )
        }))
    }

    /// The two points farthest apart: a linear footprint's scan axis.
    fn axis(&self) -> Option<[Point; 2]> {
        let mut best: Option<([Point; 2], f64)> = None;
        for (i, a) in self.points.iter().enumerate() {
            for b in &self.points[i + 1..] {
                let length = f64::from(a.x - b.x).hypot(f64::from(a.y - b.y));
                if best.is_none_or(|(_, own)| length > own) {
                    best = Some(([*a, *b], length));
                }
            }
        }
        best.filter(|(_, length)| *length >= 1.0)
            .map(|(axis, _)| axis)
    }
}

/// A partial footprint of the given points (duplicates removed, at most
/// [`MAX_PARTIAL_POINTS`]); none: unavailable.
fn partial(points: Vec<Point>, detector: EngineKind) -> Footprint {
    let mut kept: Vec<Point> = Vec::new();
    for p in points {
        if kept.len() < MAX_PARTIAL_POINTS
            && !kept
                .iter()
                .any(|own| own.x.to_bits() == p.x.to_bits() && own.y.to_bits() == p.y.to_bits())
        {
            kept.push(p);
        }
    }
    if kept.is_empty() {
        return Footprint::unavailable();
    }
    Footprint {
        kind: Kind::Partial,
        points: kept,
        detector: Some(detector),
    }
}

/// Four corners as a strictly convex quad of at least [`MIN_QUAD_AREA`],
/// clockwise in image space (y down): the given cyclic order, or the same
/// corners from the same first corner the other way round.
pub(crate) fn clockwise_quad(points: &[Point]) -> Option<[Point; 4]> {
    let quad: [Point; 4] = points.try_into().ok()?;
    let turns: [f64; 4] = std::array::from_fn(|i| {
        let (a, b, c) = (quad[i], quad[(i + 1) % 4], quad[(i + 2) % 4]);
        f64::from(b.x - a.x) * f64::from(c.y - b.y) - f64::from(b.y - a.y) * f64::from(c.x - b.x)
    });
    let area = (0..4)
        .map(|i| {
            let (a, b) = (quad[i], quad[(i + 1) % 4]);
            f64::from(a.x) * f64::from(b.y) - f64::from(b.x) * f64::from(a.y)
        })
        .sum::<f64>()
        / 2.0;
    if area.abs() < MIN_QUAD_AREA {
        return None;
    }
    if turns.iter().all(|turn| *turn > 0.0) {
        Some(quad)
    } else if turns.iter().all(|turn| *turn < 0.0) {
        Some([quad[0], quad[3], quad[2], quad[1]])
    } else {
        None
    }
}

/// One pixel of the plane a reader measured on, in that plane's space.
#[cfg_attr(
    not(feature = "engine-rqrr"),
    allow(dead_code, reason = "only rqrr's grids are measured on the unit pixel")
)]
pub(crate) const UNIT_PIXEL: Point = Point { x: 1.0, y: 1.0 };

/// The footprint of a grid rqrr detected, from its bounds: the symbol's
/// outer corners ([`rqrr_outer_corners`]), or the bounds as partial points
/// when no projective map runs through them, both moved off rqrr's anchor
/// ([`rqrr_anchor`]). `pixel`: one pixel of the plane rqrr measured on, in
/// the bounds' space. Before validation.
pub(crate) fn rqrr_footprint(bounds: [Point; 4], modules: usize, pixel: Point) -> Footprint {
    let bounds = match rqrr_anchor(bounds, pixel) {
        Some((dx, dy)) => bounds.map(|p| Point {
            x: p.x + dx,
            y: p.y + dy,
        }),
        None => bounds,
    };
    match rqrr_outer_corners(bounds, modules) {
        Some(outer) => Footprint::candidate(Kind::Quad, outer.to_vec(), EngineKind::Rqrr),
        None => Footprint::candidate(Kind::Partial, bounds.to_vec(), EngineKind::Rqrr),
    }
}

/// rqrr anchors its grid at the index of the pixel that holds the symbol's
/// origin corner (module (0,0)) — the corner of that pixel nearest the
/// image origin. That is the symbol's corner when the symbol extends right
/// and down from it, and one pixel short along each image axis it extends
/// back along: measured (−1, 0) a quarter turn clockwise, (−1, −1) a half,
/// (0, −1) three quarters, and mirrored alike, at every module size, while
/// rxing measures every orientation exactly. The translation back is
/// ½((1, 1) − û − v̂) pixels, û and v̂ the unit directions of the symbol's
/// first row and first column: exact at every quarter turn and continuous
/// between them (576 renders over 0–360° at 3–8 px modules: rqrr's mean
/// offset from the true corners 0.4–0.64 px corrected, 0.8–0.9 px as
/// reported; its own fit error remains). `None`: degenerate axes.
fn rqrr_anchor(bounds: [Point; 4], pixel: Point) -> Option<(f32, f32)> {
    let unit = |to: Point| {
        let (dx, dy) = (
            f64::from(to.x) - f64::from(bounds[0].x),
            f64::from(to.y) - f64::from(bounds[0].y),
        );
        let length = dx.hypot(dy);
        (length.is_finite() && length > 1e-9).then(|| (dx / length, dy / length))
    };
    let (row, column) = (unit(bounds[1])?, unit(bounds[3])?);
    #[expect(
        clippy::cast_possible_truncation,
        reason = "a translation of at most two plane pixels"
    )]
    let shift = |axis: f64, pixel: f32| (0.5 * (1.0 - axis) * f64::from(pixel)) as f32;
    Some((
        shift(row.0 + column.0, pixel.x),
        shift(row.1 + column.1, pixel.y),
    ))
}

/// rqrr's grid bounds map module coordinates (0,0), (N+1,0), (N+1,N+1) and
/// (0,N+1) — one module past the symbol's last column and last row, the
/// frame the score samples. The symbol's outer corners are (0,0), (N,0), (N,N) and (0,N) of
/// the same projective map, recovered from the four bounds. `None`: no
/// proper projective map through them.
pub(crate) fn rqrr_outer_corners(bounds: [Point; 4], modules: usize) -> Option<[Point; 4]> {
    if modules == 0 {
        return None;
    }
    #[expect(clippy::cast_precision_loss, reason = "a grid of at most 177 modules")]
    let t = modules as f64 / (modules as f64 + 1.0);
    let map = square_to_quad(bounds)?;
    Some([bounds[0], map(t, 0.0)?, map(t, t)?, map(0.0, t)?])
}

/// The projective map of the unit square onto `quad` (corners for (0,0),
/// (1,0), (1,1), (0,1)), Heckbert's closed form.
#[expect(
    clippy::many_single_char_names,
    reason = "Heckbert's closed form, in its published names"
)]
fn square_to_quad(quad: [Point; 4]) -> Option<impl Fn(f64, f64) -> Option<Point>> {
    let [(x0, y0), (x1, y1), (x2, y2), (x3, y3)] = quad.map(|p| (f64::from(p.x), f64::from(p.y)));
    let (dx1, dx2, dx3) = (x1 - x2, x3 - x2, x0 - x1 + x2 - x3);
    let (dy1, dy2, dy3) = (y1 - y2, y3 - y2, y0 - y1 + y2 - y3);
    let den = dx1 * dy2 - dx2 * dy1;
    if !den.is_finite() || den.abs() < 1e-9 {
        return None;
    }
    let g = (dx3 * dy2 - dx2 * dy3) / den;
    let h = (dx1 * dy3 - dx3 * dy1) / den;
    let (a, b, c) = (x1 - x0 + g * x1, x3 - x0 + h * x3, x0);
    let (d, e, f) = (y1 - y0 + g * y1, y3 - y0 + h * y3, y0);
    Some(move |u: f64, v: f64| {
        let w = g * u + h * v + 1.0;
        if !w.is_finite() || w <= 1e-9 {
            return None;
        }
        #[expect(
            clippy::cast_possible_truncation,
            reason = "image coordinates bounded by Limits::max_dimension"
        )]
        let point = Point {
            x: ((a * u + b * v + c) / w) as f32,
            y: ((d * u + e * v + f) / w) as f32,
        };
        (point.x.is_finite() && point.y.is_finite()).then_some(point)
    })
}

/// One reader observation kept by a read: the footprint, the rank of the
/// read that measured it and the longest side of its plane (the finer the
/// plane, the finer the measurement).
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Observation {
    pub(crate) footprint: Footprint,
    pub(crate) rank: Rank,
    pub(crate) side: u32,
}

/// Merge `other` into `own`: distinct footprints, the earliest
/// [`MAX_OBSERVATIONS`] by rank (a set: independent of arrival order).
/// Returns whether a footprint was dropped past capacity.
pub(crate) fn merge(own: &mut Vec<Observation>, other: Vec<Observation>) -> bool {
    merge_within(own, other, MAX_OBSERVATIONS)
}

/// The observations of a detection's reads: their distinct footprints, the
/// earliest [`MAX_GROUPED`] by rank, and whether one was left out (here or
/// already by a read).
pub(crate) fn union<'a>(
    reads: impl IntoIterator<Item = (&'a [Observation], bool)>,
) -> (Vec<Observation>, bool) {
    let mut own = Vec::new();
    let mut dropped = false;
    for (observations, read_dropped) in reads {
        dropped |= read_dropped | merge_within(&mut own, observations.to_vec(), MAX_GROUPED);
    }
    (own, dropped)
}

/// [`merge`] at a given capacity.
fn merge_within(own: &mut Vec<Observation>, other: Vec<Observation>, capacity: usize) -> bool {
    for observation in other {
        if !own
            .iter()
            .any(|kept| kept.footprint == observation.footprint)
        {
            own.push(observation);
        } else if let Some(kept) = own
            .iter_mut()
            .find(|kept| kept.footprint == observation.footprint)
            && (observation.rank, std::cmp::Reverse(observation.side))
                < (kept.rank, std::cmp::Reverse(kept.side))
        {
            *kept = observation;
        }
    }
    own.sort_by(|a, b| {
        a.rank
            .cmp(&b.rank)
            .then_with(|| b.side.cmp(&a.side))
            .then_with(|| a.footprint.kind.cmp(&b.footprint.kind))
            .then_with(|| order_points(&a.footprint.points, &b.footprint.points))
    });
    let dropped = own.len() > capacity;
    own.truncate(capacity);
    dropped
}

/// Symbologies read along scan lines: their footprints are compared by the
/// pixels between the lines ([`same_linear`]).
pub(crate) fn linear(symbology: Symbology) -> bool {
    !symbology.is_qr_family()
        && !matches!(
            symbology,
            Symbology::DataMatrix | Symbology::Aztec | Symbology::Pdf417 | Symbology::MaxiCode
        )
}

/// One published occurrence: the footprint chosen for it and the earliest
/// rank among the observations grouped into it.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Grouped {
    pub(crate) footprint: Footprint,
    pub(crate) rank: Rank,
}

/// The occurrences of one content: its reads' observations grouped by
/// physical symbol, at most [`MAX_OCCURRENCES`], earliest observed first,
/// and whether any was left out. A content no footprint locates has one
/// unavailable occurrence.
pub(crate) fn group(
    symbology: Symbology,
    mut observations: Vec<Observation>,
    luma: &LumaImage,
) -> (Vec<Grouped>, bool) {
    observations.sort_by(|a, b| {
        a.rank
            .cmp(&b.rank)
            .then_with(|| b.side.cmp(&a.side))
            .then_with(|| a.footprint.kind.cmp(&b.footprint.kind))
            .then_with(|| order_points(&a.footprint.points, &b.footprint.points))
    });
    let mut saturated = false;
    let located: Vec<Observation> = observations
        .into_iter()
        .filter(|observation| observation.footprint.kind != Kind::Unavailable)
        .collect();
    let located = if located.len() > MAX_GROUPED {
        saturated = true;
        located[..MAX_GROUPED].to_vec()
    } else {
        located
    };
    // single linkage over proven comparisons: an observation of the same
    // symbol as members of several groups joins them into one; one that
    // only may be (unproven) joins the earliest such group and joins no
    // groups, and the grouping is flagged
    let mut groups: Vec<Vec<Observation>> = Vec::new();
    let mut bridges = MAX_BRIDGES;
    for observation in located {
        let mut same = Vec::new();
        let mut unproven = None;
        for (i, group) in groups.iter().enumerate() {
            let mut verdict = Verdict::Different;
            for member in group {
                match same_symbol(symbology, member, &observation, luma, &mut bridges) {
                    Verdict::Same => {
                        verdict = Verdict::Same;
                        break;
                    }
                    Verdict::Unproven => verdict = Verdict::Unproven,
                    Verdict::Different => {}
                }
            }
            match verdict {
                Verdict::Same => same.push(i),
                Verdict::Unproven => {
                    unproven.get_or_insert(i);
                }
                Verdict::Different => {}
            }
        }
        match (same.split_first(), unproven) {
            (Some((&first, rest)), _) => {
                for &i in rest.iter().rev() {
                    let joined = groups.remove(i);
                    groups[first].extend(joined);
                }
                groups[first].push(observation);
            }
            (None, Some(earliest)) => {
                saturated = true;
                groups[earliest].push(observation);
            }
            (None, None) => groups.push(vec![observation]),
        }
    }
    if groups.is_empty() {
        return (
            vec![Grouped {
                footprint: Footprint::unavailable(),
                rank: Rank::default(),
            }],
            saturated,
        );
    }
    let mut occurrences: Vec<Grouped> = groups
        .into_iter()
        .map(|members| {
            let rank = members
                .iter()
                .map(|member| member.rank)
                .min()
                .unwrap_or_default();
            // the most specific kind (a quad or a segment before partial
            // points), then the finest plane, then the earliest read
            let footprint = members
                .iter()
                .min_by(|a, b| {
                    b.footprint
                        .kind
                        .cmp(&a.footprint.kind)
                        .then_with(|| b.side.cmp(&a.side))
                        .then_with(|| a.rank.cmp(&b.rank))
                })
                .map_or_else(Footprint::unavailable, |member| member.footprint.clone());
            Grouped { footprint, rank }
        })
        .collect();
    occurrences.sort_by_key(|occurrence| occurrence.rank);
    if occurrences.len() > MAX_OCCURRENCES {
        saturated = true;
        occurrences.truncate(MAX_OCCURRENCES);
    }
    (occurrences, saturated)
}

/// A total order on point lists (for footprints that tie on everything
/// else, as constructed test sets can).
fn order_points(a: &[Point], b: &[Point]) -> std::cmp::Ordering {
    let key = |points: &[Point]| -> Vec<(u32, u32)> {
        points
            .iter()
            .map(|p| (p.x.to_bits(), p.y.to_bits()))
            .collect()
    };
    key(a).cmp(&key(b))
}

/// What two footprints of one content are.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Verdict {
    /// One physical symbol.
    Same,
    /// Two physical symbols.
    Different,
    /// Not decided: pixels too faint, too sparse or outside the image to
    /// compare, or past the comparisons' bound.
    Unproven,
}

/// Pixel comparisons ([`same_linear`]) one content's grouping makes;
/// geometry alone decides the others for free. Past them a pair the
/// geometry leaves open is unproven.
const MAX_BRIDGES: u32 = 256;

/// Whether two observations of one content are the same physical symbol;
/// `bridges` counts down the pixel comparisons left.
fn same_symbol(
    symbology: Symbology,
    a: &Observation,
    b: &Observation,
    luma: &LumaImage,
    bridges: &mut u32,
) -> Verdict {
    if linear(symbology)
        && let (Some(x), Some(y)) = (a.footprint.axis(), b.footprint.axis())
    {
        return compare_linear(luma, x, y, bridges);
    }
    let tolerance = 1.0 + plane_pixel(a, luma).max(plane_pixel(b, luma));
    if centre_inside(&a.footprint, &b.footprint, tolerance)
        || centre_inside(&b.footprint, &a.footprint, tolerance)
    {
        Verdict::Same
    } else {
        Verdict::Different
    }
}

/// One pixel of the plane an observation was measured on, in original
/// pixels (one when the plane is unknown or finer).
fn plane_pixel(observation: &Observation, luma: &LumaImage) -> f64 {
    if observation.side == 0 {
        return 1.0;
    }
    (f64::from(luma.width().max(luma.height())) / f64::from(observation.side)).max(1.0)
}

/// Whether the centre of `a` lies inside `b` — a quad's own outline, the
/// box of other points — within `tolerance` pixels.
fn centre_inside(a: &Footprint, b: &Footprint, tolerance: f64) -> bool {
    let Some((x, y)) = a.centre() else {
        return false;
    };
    if b.kind == Kind::Quad && b.points.len() == 4 {
        // a validated quad is clockwise in image space (y down): inside
        // every edge's left-hand side
        return (0..4).all(|i| {
            let (from, to) = (b.points[i], b.points[(i + 1) % 4]);
            let (dx, dy) = (f64::from(to.x - from.x), f64::from(to.y - from.y));
            let length = dx.hypot(dy);
            length > 0.0
                && (dx * (y - f64::from(from.y)) - dy * (x - f64::from(from.x))) / length
                    >= -tolerance
        });
    }
    let Some((x0, y0, x1, y1)) = b.bounds() else {
        return false;
    };
    (x0 - tolerance..=x1 + tolerance).contains(&x) && (y0 - tolerance..=y1 + tolerance).contains(&y)
}

/// [`same_linear`] within a budget: the geometry decides for free; a pixel
/// comparison spends one of `bridges`, and none left leaves the pair
/// unproven.
pub(crate) fn compare_linear(
    luma: &LumaImage,
    a: [Point; 2],
    b: [Point; 2],
    bridges: &mut u32,
) -> Verdict {
    if let Some(verdict) = Lines::of(a, b).decided() {
        return verdict;
    }
    let Some(left) = bridges.checked_sub(1) else {
        return Verdict::Unproven;
    };
    *bridges = left;
    same_linear(luma, a, b)
}

/// Scan lines sampled between two linear footprints.
const MAX_BRIDGE_LINES: usize = 48;
/// Pixels either side of a footprint's line searched for its own pattern.
const REFERENCE_BAND: i32 = 4;
/// Samples taken along each of them.
const MAX_BRIDGE_SAMPLES: usize = 192;

/// Two scan lines of one linear content (each its two farthest points), in
/// the frame of the first: its direction, the stretch of it the second
/// projects onto and the second's offset across it.
struct Lines {
    origin: (f64, f64),
    unit: (f64, f64),
    /// The first line's and the second's lengths.
    lengths: (f64, f64),
    /// |cos| of the angle between them.
    cos: f64,
    /// The stretch of the first line the second projects onto.
    start: f64,
    overlap: f64,
    /// The second line's mean offset across the first.
    offset: f64,
    /// Each line has an endpoint strictly on either side of the other.
    crossing: bool,
}

impl Lines {
    fn of(a: [Point; 2], b: [Point; 2]) -> Self {
        let vector = |s: [Point; 2]| (f64::from(s[1].x - s[0].x), f64::from(s[1].y - s[0].y));
        let (ax, ay) = vector(a);
        let (bx, by) = vector(b);
        let (la, lb) = (ax.hypot(ay), bx.hypot(by));
        let unit = if la > 0.0 {
            (ax / la, ay / la)
        } else {
            (1.0, 0.0)
        };
        let origin = (f64::from(a[0].x), f64::from(a[0].y));
        let along =
            |p: Point| (f64::from(p.x) - origin.0) * unit.0 + (f64::from(p.y) - origin.1) * unit.1;
        let across =
            |p: Point| -(f64::from(p.x) - origin.0) * unit.1 + (f64::from(p.y) - origin.1) * unit.0;
        let (b0, b1) = (along(b[0]), along(b[1]));
        let (start, end) = (b0.min(b1).max(0.0), b0.max(b1).min(la));
        let side = |s: [Point; 2], p: Point| {
            f64::from(s[1].x - s[0].x) * f64::from(p.y - s[0].y)
                - f64::from(s[1].y - s[0].y) * f64::from(p.x - s[0].x)
        };
        let crossing = side(a, b[0]) * side(a, b[1]) < 0.0 && side(b, a[0]) * side(b, a[1]) < 0.0;
        Self {
            origin,
            unit,
            lengths: (la, lb),
            cos: if lb > 0.0 {
                (unit.0 * bx + unit.1 * by).abs() / lb
            } else {
                1.0
            },
            start,
            overlap: end - start,
            offset: f64::midpoint(across(b[0]), across(b[1])),
            crossing,
        }
    }

    /// What the geometry alone decides: lines that cross are one symbol
    /// (two printed copies cannot overlap); lines more than 20° apart, or
    /// sharing less than half the shorter one's stretch, are two; lines at
    /// most 1.5 px apart are one.
    fn decided(&self) -> Option<Verdict> {
        let (la, lb) = self.lengths;
        if la < 1.0 || lb < 1.0 {
            return Some(Verdict::Unproven);
        }
        if self.crossing {
            return Some(Verdict::Same);
        }
        if self.cos < 20.0_f64.to_radians().cos() || self.overlap < 0.5 * la.min(lb) {
            return Some(Verdict::Different);
        }
        (self.offset.abs() <= 1.5).then_some(Verdict::Same)
    }
}

/// Whether two scan-line footprints of one linear content (each its two
/// farthest points) are one physical symbol in `luma`.
///
/// Geometry first ([`Lines::decided`]); then the pixels between parallel
/// lines: two symbols when they lose the bar pattern over a run of at least
/// max(4 px, 8% of the shared stretch) — the quiet zone, text or background
/// between two copies — one when the pattern runs through. Each line's own
/// pattern is read on it or within [`REFERENCE_BAND`] pixels of it. A
/// pattern too faint (under 32 levels) or too sparse to compare, or pixels
/// outside the image, decide nothing: unproven. A band that washes the bars
/// out completely (glare across the symbol) reads as a gap.
pub(crate) fn same_linear(luma: &LumaImage, a: [Point; 2], b: [Point; 2]) -> Verdict {
    let lines = Lines::of(a, b);
    lines.decided().unwrap_or_else(|| lines.bridged(luma))
}

impl Lines {
    /// What the pixels between two parallel lines say ([`same_linear`]).
    fn bridged(self, luma: &LumaImage) -> Verdict {
        let Lines {
            origin,
            unit: (ux, uy),
            start,
            overlap,
            offset,
            ..
        } = self;
        #[expect(
            clippy::cast_possible_truncation,
            clippy::cast_sign_loss,
            reason = "positive lengths bounded by Limits::max_dimension"
        )]
        let samples = (overlap.floor() as usize).clamp(8, MAX_BRIDGE_SAMPLES);
        #[expect(
            clippy::cast_possible_truncation,
            clippy::cast_sign_loss,
            reason = "positive offset bounded by Limits::max_dimension"
        )]
        let lines = (offset.abs().floor() as usize).clamp(1, MAX_BRIDGE_LINES);
        // one line of samples at `across` from the first footprint's line
        let line = |at: f64| -> Option<Vec<u8>> {
            (0..samples)
                .map(|j| {
                    #[expect(clippy::cast_precision_loss, reason = "at most 192 samples")]
                    let s = start + overlap * (j as f64 + 0.5) / samples as f64;
                    let x = origin.0 + ux * s - uy * at;
                    let y = origin.1 + uy * s + ux * at;
                    pixel(luma, x, y)
                })
                .collect()
        };
        let range = |values: &[u8]| {
            values
                .iter()
                .fold((u8::MAX, u8::MIN), |(lo, hi), &v| (lo.min(v), hi.max(v)))
        };
        let crossings = |values: &[u8], threshold: u16| {
            values
                .windows(2)
                .filter(|w| (u16::from(w[0]) < threshold) != (u16::from(w[1]) < threshold))
                .count()
        };
        // each footprint's own pattern: its line, or the line within
        // REFERENCE_BAND pixels of it that crosses the most bars (its own
        // contrast) — a line read on a coarser plane, mapped to the source, can
        // sit on the edge row of its symbol, outside its bars
        let reference = |at: f64| -> Option<Vec<u8>> {
            let mut best: Option<(Vec<u8>, usize)> = None;
            for step in 0..=2 * REFERENCE_BAND {
                // 0, -1, +1, -2, +2, …: the line itself wins a tie
                let d = if step % 2 == 0 {
                    step / 2
                } else {
                    -(step / 2) - 1
                };
                let Some(values) = line(at + f64::from(d)) else {
                    continue;
                };
                let (lo, hi) = range(&values);
                let count = if hi.saturating_sub(lo) < 32 {
                    0
                } else {
                    crossings(&values, u16::midpoint(u16::from(lo), u16::from(hi)))
                };
                if best.as_ref().is_none_or(|(_, own)| count > *own) {
                    best = Some((values, count));
                }
            }
            best.map(|(values, _)| values)
        };
        let (Some(first), Some(second)) = (reference(0.0), reference(offset)) else {
            return Verdict::Unproven;
        };
        let (lo, hi) = range(&[first.as_slice(), second.as_slice()].concat());
        if hi.saturating_sub(lo) < 32 {
            return Verdict::Unproven;
        }
        let threshold = u16::midpoint(u16::from(lo), u16::from(hi));
        let transitions = |values: &[u8]| crossings(values, threshold);
        let reference = transitions(&first).min(transitions(&second));
        if reference < 4 {
            return Verdict::Unproven;
        }
        #[expect(clippy::cast_precision_loss, reason = "at most 48 lines")]
        let step = offset.abs() / (lines as f64 + 1.0);
        let gap = 4.0_f64.max(0.08 * overlap);
        let mut run = 0.0_f64;
        for k in 1..=lines {
            #[expect(clippy::cast_precision_loss, reason = "at most 48 lines")]
            let at = offset * k as f64 / (lines as f64 + 1.0);
            let Some(values) = line(at) else {
                return Verdict::Unproven;
            };
            if transitions(&values) * 2 < reference {
                run += step;
                if run >= gap {
                    return Verdict::Different;
                }
            } else {
                run = 0.0;
            }
        }
        Verdict::Same
    }
}

/// The pixel at continuous coordinates (pixel `(i, j)` spans `[i, i+1)`).
fn pixel(luma: &LumaImage, x: f64, y: f64) -> Option<u8> {
    if !x.is_finite() || !y.is_finite() || x < 0.0 || y < 0.0 {
        return None;
    }
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "non-negative, compared against the image size below"
    )]
    let (column, row) = (x.floor() as u64, y.floor() as u64);
    if column >= u64::from(luma.width()) || row >= u64::from(luma.height()) {
        return None;
    }
    let index = usize::try_from(row * u64::from(luma.width()) + column).ok()?;
    luma.data().get(index).copied()
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

    fn p(x: f32, y: f32) -> Point {
        Point { x, y }
    }

    fn quad(points: [(f32, f32); 4]) -> Footprint {
        Footprint::candidate(
            Kind::Quad,
            points.iter().map(|&(x, y)| p(x, y)).collect(),
            EngineKind::Rxing,
        )
    }

    #[test]
    fn a_clockwise_quad_is_kept_and_a_counter_clockwise_one_turned_from_its_first_corner() {
        let cw =
            quad([(10.0, 10.0), (50.0, 10.0), (50.0, 50.0), (10.0, 50.0)]).validated((100, 100));
        assert_eq!(cw.kind, Kind::Quad);
        assert_eq!(cw.points[0], p(10.0, 10.0));
        assert_eq!(cw.points[1], p(50.0, 10.0));
        let ccw =
            quad([(10.0, 10.0), (10.0, 50.0), (50.0, 50.0), (50.0, 10.0)]).validated((100, 100));
        assert_eq!(ccw, cw, "same corners, same first corner, clockwise");
    }

    #[test]
    fn an_invalid_quad_keeps_its_valid_points_as_partial() {
        // a bow tie (the port's unordered sampler corners)
        let bowtie =
            quad([(10.0, 10.0), (50.0, 10.0), (10.0, 50.0), (50.0, 50.0)]).validated((100, 100));
        assert_eq!(bowtie.kind, Kind::Partial);
        assert_eq!(bowtie.points.len(), 4);
        // a corner far outside the image is dropped
        let outside =
            quad([(10.0, 10.0), (500.0, 10.0), (50.0, 50.0), (10.0, 50.0)]).validated((100, 100));
        assert_eq!(outside.kind, Kind::Partial);
        assert_eq!(
            outside.points,
            vec![p(10.0, 10.0), p(50.0, 50.0), p(10.0, 50.0)]
        );
        // a degenerate area
        let flat =
            quad([(10.0, 10.0), (11.0, 10.0), (11.0, 11.0), (10.0, 11.0)]).validated((100, 100));
        assert_eq!(flat.kind, Kind::Partial);
        // non-finite points never survive
        let nan = quad([(f32::NAN, 10.0), (50.0, 10.0), (50.0, 50.0), (10.0, 50.0)])
            .validated((100, 100));
        assert_eq!(nan.kind, Kind::Partial);
        assert!(
            nan.points
                .iter()
                .all(|q| q.x.is_finite() && q.y.is_finite())
        );
        // nothing valid left: unavailable, no detector
        let gone = quad([
            (f32::NAN, 0.0),
            (900.0, 0.0),
            (0.0, 900.0),
            (f32::INFINITY, 1.0),
        ])
        .validated((100, 100));
        assert_eq!(gone, Footprint::unavailable());
    }

    #[test]
    fn a_segment_is_ordered_and_a_degenerate_one_demoted() {
        let reversed = Footprint::candidate(
            Kind::Segment,
            vec![p(80.0, 20.0), p(10.0, 20.0)],
            EngineKind::Rxing,
        )
        .validated((100, 100));
        assert_eq!(reversed.kind, Kind::Segment);
        assert_eq!(reversed.points, vec![p(10.0, 20.0), p(80.0, 20.0)]);
        let dot = Footprint::candidate(
            Kind::Segment,
            vec![p(10.0, 20.0), p(10.2, 20.0)],
            EngineKind::Rxing,
        )
        .validated((100, 100));
        assert_eq!(dot.kind, Kind::Partial);
        assert_eq!(dot.points.len(), 1);
    }

    #[test]
    fn rqrr_bounds_shrink_to_the_symbols_outer_corners() {
        // an axis-aligned grid of 21 modules at 10 px: bounds span 22 modules
        let bounds = [
            p(40.0, 40.0),
            p(260.0, 40.0),
            p(260.0, 260.0),
            p(40.0, 260.0),
        ];
        let outer = rqrr_outer_corners(bounds, 21).unwrap();
        let expected = [
            p(40.0, 40.0),
            p(250.0, 40.0),
            p(250.0, 250.0),
            p(40.0, 250.0),
        ];
        for (got, want) in outer.iter().zip(expected) {
            assert!(
                (got.x - want.x).abs() < 1e-3 && (got.y - want.y).abs() < 1e-3,
                "{outer:?}"
            );
        }
    }

    #[test]
    fn rqrr_correction_follows_the_projective_map() {
        // H maps (u, v) in [0, 1]² by a known homography; the corrected
        // corners must equal H at N/(N+1)
        let h = |u: f64, v: f64| {
            let w = 1.0 + 0.0008 * u * 100.0 + 0.0003 * v * 100.0;
            p(
                ((30.0 + 180.0 * u + 25.0 * v) / w) as f32,
                ((20.0 + 15.0 * u + 170.0 * v) / w) as f32,
            )
        };
        let bounds = [h(0.0, 0.0), h(1.0, 0.0), h(1.0, 1.0), h(0.0, 1.0)];
        let t = 25.0 / 26.0;
        let outer = rqrr_outer_corners(bounds, 25).unwrap();
        for (got, want) in outer
            .iter()
            .zip([h(0.0, 0.0), h(t, 0.0), h(t, t), h(0.0, t)])
        {
            assert!(
                (got.x - want.x).abs() < 0.01 && (got.y - want.y).abs() < 0.01,
                "{got:?} {want:?}"
            );
        }
        assert!(rqrr_outer_corners([p(0.0, 0.0); 4], 21).is_none());
    }

    fn rank(attempt: u32, index: u32) -> Rank {
        Rank {
            attempt,
            source: 0,
            index,
        }
    }

    fn observed(footprint: Footprint, rank: Rank) -> Observation {
        Observation {
            footprint,
            rank,
            side: 1000,
        }
    }

    #[test]
    fn merging_keeps_the_earliest_distinct_footprints_whatever_the_order() {
        let capacity = MAX_OBSERVATIONS as u32;
        let footprints: Vec<Observation> = (0..capacity + 8)
            .map(|i| {
                observed(
                    quad([
                        (i as f32, 0.0),
                        (i as f32 + 10.0, 0.0),
                        (i as f32 + 10.0, 10.0),
                        (i as f32, 10.0),
                    ]),
                    rank(i, 0),
                )
            })
            .collect();
        let mut forward = Vec::new();
        let dropped = footprints
            .iter()
            .map(|o| merge(&mut forward, vec![o.clone()]))
            .fold(false, |a, b| a | b);
        let mut backward = Vec::new();
        for o in footprints.iter().rev() {
            merge(&mut backward, vec![o.clone()]);
        }
        assert!(dropped, "eight distinct footprints past capacity");
        assert_eq!(forward, backward);
        assert_eq!(forward.len(), MAX_OBSERVATIONS);
        assert_eq!(forward.last().unwrap().rank, rank(capacity - 1, 0));
        // exactly the capacity is within it
        let mut exact = Vec::new();
        let over = footprints[..MAX_OBSERVATIONS]
            .iter()
            .map(|o| merge(&mut exact, vec![o.clone()]))
            .fold(false, |a, b| a | b);
        assert!(!over);
    }

    fn blank(width: u32, height: u32) -> LumaImage {
        LumaImage::new(vec![255; (width * height) as usize], width, height)
    }

    #[test]
    fn matrix_footprints_group_by_place_and_order_by_earliest_read() {
        let luma = blank(400, 200);
        let left = quad([(20.0, 20.0), (120.0, 20.0), (120.0, 120.0), (20.0, 120.0)])
            .validated((400, 200));
        let left_again = quad([(22.0, 21.0), (121.0, 20.0), (119.0, 121.0), (21.0, 119.0)])
            .validated((400, 200));
        let right = quad([(220.0, 20.0), (320.0, 20.0), (320.0, 120.0), (220.0, 120.0)])
            .validated((400, 200));
        let observations = vec![
            observed(right.clone(), rank(0, 0)),
            observed(left.clone(), rank(0, 1)),
            observed(left_again, rank(2, 0)),
        ];
        let (grouped, saturated) = group(Symbology::QrCode, observations.clone(), &luma);
        assert!(!saturated);
        assert_eq!(grouped.len(), 2);
        assert_eq!(grouped[0].footprint, right, "earliest observed first");
        assert_eq!(grouped[1].footprint, left);
        let mut reversed = observations;
        reversed.reverse();
        assert_eq!(group(Symbology::QrCode, reversed, &luma).0, grouped);
    }

    #[test]
    fn a_content_nothing_locates_has_one_unavailable_occurrence() {
        let luma = blank(10, 10);
        let (grouped, saturated) = group(
            Symbology::MaxiCode,
            vec![observed(Footprint::unavailable(), rank(0, 0))],
            &luma,
        );
        assert!(!saturated);
        assert_eq!(grouped.len(), 1);
        assert_eq!(grouped[0].footprint, Footprint::unavailable());
        assert_eq!(group(Symbology::MaxiCode, Vec::new(), &luma).0.len(), 1);
    }

    #[test]
    fn occurrences_past_capacity_are_flagged() {
        let luma = blank(2000, 40);
        let at = |i: u32| {
            let x = i as f32 * 100.0;
            observed(
                quad([(x, 0.0), (x + 20.0, 0.0), (x + 20.0, 20.0), (x, 20.0)])
                    .validated((2000, 40)),
                rank(0, i),
            )
        };
        let sixteen: Vec<_> = (0..16).map(at).collect();
        let (grouped, saturated) = group(Symbology::DataMatrix, sixteen, &luma);
        assert_eq!((grouped.len(), saturated), (16, false));
        let seventeen: Vec<_> = (0..17).map(at).collect();
        let (grouped, saturated) = group(Symbology::DataMatrix, seventeen, &luma);
        assert_eq!((grouped.len(), saturated), (16, true));
        assert_eq!(grouped[15].rank, rank(0, 15), "the earliest sixteen");
    }

    /// Vertical bars over rows `rows` (dark where `x / width` is odd).
    fn bars(luma: &mut [u8], image_width: u32, rows: std::ops::Range<u32>, width: u32) {
        for y in rows {
            for x in 40..360 {
                if (x / width) % 2 == 1 {
                    luma[(y * image_width + x) as usize] = 0;
                }
            }
        }
    }

    #[test]
    fn one_tall_symbol_read_on_two_lines_is_one_occurrence() {
        let mut data = vec![255u8; 400 * 300];
        bars(&mut data, 400, 20..280, 5);
        let luma = LumaImage::new(data, 400, 300);
        let one = same_linear(
            &luma,
            [p(40.0, 60.0), p(360.0, 60.0)],
            [p(40.0, 240.0), p(360.0, 240.0)],
        );
        assert_eq!(one, Verdict::Same);
    }

    #[test]
    fn two_stacked_copies_are_two_occurrences() {
        let mut data = vec![255u8; 400 * 300];
        bars(&mut data, 400, 20..120, 5);
        bars(&mut data, 400, 180..280, 5);
        let luma = LumaImage::new(data, 400, 300);
        let two = same_linear(
            &luma,
            [p(40.0, 60.0), p(360.0, 60.0)],
            [p(40.0, 240.0), p(360.0, 240.0)],
        );
        assert_eq!(two, Verdict::Different);
    }

    #[test]
    fn a_line_on_the_edge_row_of_its_copy_still_tells_two_copies_apart() {
        // a line read on a coarse plane lands one row below its copy's
        // bars: its pattern is the band's, and the gap still counts
        let mut data = vec![255u8; 400 * 300];
        bars(&mut data, 400, 20..120, 5);
        bars(&mut data, 400, 180..280, 5);
        let luma = LumaImage::new(data, 400, 300);
        let two = same_linear(
            &luma,
            [p(40.0, 120.5), p(360.0, 120.5)],
            [p(40.0, 240.5), p(360.0, 240.5)],
        );
        assert_eq!(two, Verdict::Different);
        // and on one tall symbol, the same edge line is the same symbol
        let mut tall = vec![255u8; 400 * 300];
        bars(&mut tall, 400, 20..280, 5);
        let luma = LumaImage::new(tall, 400, 300);
        let one = same_linear(
            &luma,
            [p(40.0, 280.5), p(360.0, 280.5)],
            [p(40.0, 60.5), p(360.0, 60.5)],
        );
        assert_eq!(one, Verdict::Same);
    }

    #[test]
    fn a_thin_interruption_does_not_split_one_symbol() {
        let mut data = vec![255u8; 400 * 300];
        bars(&mut data, 400, 20..148, 5);
        bars(&mut data, 400, 151..280, 5);
        let luma = LumaImage::new(data, 400, 300);
        let one = same_linear(
            &luma,
            [p(40.0, 60.0), p(360.0, 60.0)],
            [p(40.0, 240.0), p(360.0, 240.0)],
        );
        assert_eq!(one, Verdict::Same);
    }

    #[test]
    fn side_by_side_copies_are_two_symbols_and_crossing_lines_one() {
        let luma = blank(800, 100);
        let line = [p(40.0, 50.0), p(360.0, 50.0)];
        assert_eq!(
            same_linear(&luma, line, [p(440.0, 50.0), p(760.0, 50.0)]),
            Verdict::Different
        );
        // a tilted symbol read along a row and along a column: two printed
        // copies cannot overlap
        assert_eq!(
            same_linear(&luma, line, [p(200.0, 0.0), p(200.0, 99.0)]),
            Verdict::Same
        );
        // across, without crossing: another symbol
        assert_eq!(
            same_linear(&luma, line, [p(200.0, 60.0), p(200.0, 99.0)]),
            Verdict::Different
        );
        // the same line read twice
        assert_eq!(
            same_linear(&luma, line, [p(41.0, 51.0), p(359.0, 51.0)]),
            Verdict::Same
        );
    }

    #[test]
    fn geometry_decides_without_spending_a_pixel_comparison() {
        let luma = blank(800, 300);
        let line = [p(40.0, 50.0), p(360.0, 50.0)];
        let mut none = 0;
        let beside = compare_linear(&luma, line, [p(440.0, 50.0), p(760.0, 50.0)], &mut none);
        assert_eq!(beside, Verdict::Different);
        let crossing = compare_linear(&luma, line, [p(200.0, 0.0), p(200.0, 99.0)], &mut none);
        assert_eq!(crossing, Verdict::Same);
        // pixels needed, none left
        let below = compare_linear(&luma, line, [p(40.0, 250.0), p(360.0, 250.0)], &mut none);
        assert_eq!(below, Verdict::Unproven);
        // pixels that cannot decide (a blank plane) spend one and prove nothing
        let mut one = 1;
        let blank_pair = compare_linear(&luma, line, [p(40.0, 250.0), p(360.0, 250.0)], &mut one);
        assert_eq!((blank_pair, one), (Verdict::Unproven, 0));
    }

    fn observed_on(footprint: Footprint, rank: Rank, side: u32) -> Observation {
        Observation {
            footprint,
            rank,
            side,
        }
    }

    #[test]
    fn a_small_copy_beside_a_rotated_one_is_another_symbol() {
        // a 200 px QR turned 45° about (300, 300) and a 40 px upright copy
        // centred at (400, 200): the small copy's centre is in the large
        // one's box, not in its outline
        let luma = blank(600, 600);
        let turned = quad([
            (300.0, 158.6),
            (441.4, 300.0),
            (300.0, 441.4),
            (158.6, 300.0),
        ])
        .validated((600, 600));
        let small = quad([
            (380.0, 180.0),
            (420.0, 180.0),
            (420.0, 220.0),
            (380.0, 220.0),
        ])
        .validated((600, 600));
        assert_eq!((turned.kind, small.kind), (Kind::Quad, Kind::Quad));
        let observations = vec![
            observed(turned.clone(), rank(0, 0)),
            observed(small.clone(), rank(0, 1)),
            observed(small, rank(1, 0)),
        ];
        let (grouped, saturated) = group(Symbology::QrCode, observations, &luma);
        assert_eq!((grouped.len(), saturated), (2, false));
        assert_eq!(grouped[0].footprint, turned);
    }

    #[test]
    fn two_partial_edges_measured_on_different_planes_are_one_symbol() {
        // the top edge of a clipped symbol, measured on the full plane and
        // on a quarter-size one: a few original pixels apart
        let luma = blank(800, 800);
        let fine = partial(vec![p(100.0, 100.0), p(300.0, 100.0)], EngineKind::Rqrr);
        let coarse = partial(vec![p(101.0, 103.0), p(299.0, 103.0)], EngineKind::Rqrr);
        let observations = vec![
            observed_on(coarse, rank(0, 0), 200),
            observed_on(fine.clone(), rank(1, 0), 800),
        ];
        let (grouped, saturated) = group(Symbology::QrCode, observations, &luma);
        assert_eq!((grouped.len(), saturated), (1, false));
        assert_eq!(grouped[0].footprint, fine, "the finer plane's measurement");
        assert_eq!(
            grouped[0].rank,
            rank(0, 0),
            "the earliest observation's rank"
        );
    }

    fn segment(a: Point, b: Point) -> Footprint {
        Footprint {
            kind: Kind::Segment,
            points: vec![a, b],
            detector: Some(EngineKind::Rxing),
        }
    }

    #[test]
    fn an_unproven_pair_stays_with_the_earliest_group_flagged_and_joins_none() {
        // two stacked copies (proven apart), then a line in the white gap
        // between them: its pixels prove nothing either way
        let mut data = vec![255u8; 400 * 300];
        bars(&mut data, 400, 20..120, 5);
        bars(&mut data, 400, 180..280, 5);
        let luma = LumaImage::new(data, 400, 300);
        let at =
            |y: f32, attempt: u32| observed(segment(p(40.0, y), p(360.0, y)), rank(attempt, 0));
        let (grouped, saturated) =
            group(Symbology::Code128, vec![at(60.0, 0), at(240.0, 1)], &luma);
        assert_eq!((grouped.len(), saturated), (2, false));
        let (grouped, saturated) = group(
            Symbology::Code128,
            vec![at(60.0, 0), at(240.0, 1), at(150.0, 2)],
            &luma,
        );
        assert_eq!((grouped.len(), saturated), (2, true));
        // on a plane that cannot decide, two lines stay one flagged symbol
        let (grouped, saturated) = group(
            Symbology::Code128,
            vec![at(60.0, 0), at(240.0, 1)],
            &blank(400, 300),
        );
        assert_eq!((grouped.len(), saturated), (1, true));
    }

    #[test]
    fn a_copys_scan_line_is_published_before_a_lone_point_of_it() {
        // a degenerate read of the copy (one point, measured first and on the
        // finer plane) and a scan line of it: the validated shape is chosen
        let mut data = vec![255u8; 400 * 300];
        bars(&mut data, 400, 20..280, 5);
        let luma = LumaImage::new(data, 400, 300);
        let points = vec![p(200.0, 60.0), p(200.4, 60.0)];
        let point =
            Footprint::candidate(Kind::Segment, points, EngineKind::Rxing).validated((400, 300));
        assert_eq!(point.kind, Kind::Partial, "a sub-pixel segment is demoted");
        let line = segment(p(40.0, 61.0), p(360.0, 61.0));
        let observations = vec![
            observed_on(point, rank(0, 0), 400),
            observed_on(line.clone(), rank(1, 0), 200),
        ];
        let (grouped, saturated) = group(Symbology::Code128, observations, &luma);
        assert_eq!((grouped.len(), saturated), (1, false));
        assert_eq!(grouped[0].footprint, line);
        assert_eq!(grouped[0].rank, rank(0, 0));
    }

    #[test]
    fn validation_keeps_points_within_two_percent_of_the_longer_side_around_the_image() {
        // 300 × 100: 6 px (2% of 300, past the 2 px floor) beyond each side,
        // the width bounding x and the height bounding y
        let points = vec![
            p(-5.5, 50.0),
            p(-6.5, 50.0),
            p(305.5, 50.0),
            p(306.5, 50.0),
            p(150.0, -5.5),
            p(150.0, -6.5),
            p(150.0, 105.5),
            p(150.0, 106.5),
        ];
        let kept =
            Footprint::candidate(Kind::Partial, points, EngineKind::Rxing).validated((300, 100));
        let inside = vec![
            p(-5.5, 50.0),
            p(305.5, 50.0),
            p(150.0, -5.5),
            p(150.0, 105.5),
        ];
        assert_eq!(kept, partial(inside, EngineKind::Rxing));
        // a small image keeps the 2 px floor
        let small = Footprint::candidate(
            Kind::Partial,
            vec![p(-1.5, 25.0), p(-2.5, 25.0)],
            EngineKind::Rxing,
        )
        .validated((50, 50));
        assert_eq!(small.points, vec![p(-1.5, 25.0)]);
    }

    #[test]
    fn a_segment_off_the_image_or_of_another_size_keeps_its_points_as_partial() {
        let segment = |points: Vec<Point>| {
            Footprint::candidate(Kind::Segment, points, EngineKind::Rxing).validated((100, 100))
        };
        let off = segment(vec![p(10.0, 20.0), p(180.0, 20.0)]);
        assert_eq!(off, partial(vec![p(10.0, 20.0)], EngineKind::Rxing));
        let three = vec![p(10.0, 20.0), p(50.0, 20.0), p(80.0, 20.0)];
        assert_eq!(segment(three.clone()), partial(three, EngineKind::Rxing));
        // one pixel long is a segment, drawn either way
        for points in [
            vec![p(11.0, 20.0), p(10.0, 20.0)],
            vec![p(10.0, 20.0), p(11.0, 20.0)],
        ] {
            let pixel_long = segment(points);
            assert_eq!(pixel_long.kind, Kind::Segment);
            assert_eq!(pixel_long.points, vec![p(10.0, 20.0), p(11.0, 20.0)]);
        }
    }

    #[test]
    fn a_reader_that_measured_nothing_publishes_no_point_and_no_reader() {
        let claimed = Footprint::candidate(
            Kind::Unavailable,
            vec![p(10.0, 10.0), p(20.0, 10.0)],
            EngineKind::Rqrr,
        );
        assert_eq!(claimed.validated((100, 100)), Footprint::unavailable());
    }

    #[test]
    fn a_linear_footprints_axis_is_its_two_farthest_points() {
        let axis = |points: Vec<Point>| {
            Footprint::candidate(Kind::Partial, points, EngineKind::Rxing).axis()
        };
        // an EAN read with its add-on: the main symbol's two points, then
        // the add-on's two, on one row
        let ean = vec![
            p(10.0, 50.0),
            p(100.0, 50.0),
            p(110.0, 50.0),
            p(150.0, 50.0),
        ];
        assert_eq!(axis(ean), Some([p(10.0, 50.0), p(150.0, 50.0)]));
        // farthest by the full distance, neither coordinate alone
        let steep = vec![p(0.0, 10.0), p(3.0, 50.0), p(20.0, 10.0)];
        assert_eq!(axis(steep), Some([p(3.0, 50.0), p(20.0, 10.0)]));
        let flat = vec![p(0.0, 100.0), p(30.0, 100.0), p(15.0, 110.0)];
        assert_eq!(axis(flat), Some([p(0.0, 100.0), p(30.0, 100.0)]));
        // of two equally long pairs, the first
        let square = vec![p(0.0, 0.0), p(10.0, 0.0), p(10.0, 10.0), p(0.0, 10.0)];
        assert_eq!(axis(square), Some([p(0.0, 0.0), p(10.0, 10.0)]));
        // a pixel apart is an axis; less, or a single point, is none
        let pixel = vec![p(10.0, 10.0), p(11.0, 10.0)];
        assert_eq!(axis(pixel), Some([p(10.0, 10.0), p(11.0, 10.0)]));
        assert_eq!(axis(vec![p(10.0, 10.0), p(10.5, 10.5)]), None);
        assert_eq!(axis(vec![p(10.0, 10.0)]), None);
    }

    /// rqrr bounds of a 20-unit grid at (100, 50) whose first row runs
    /// along `row` and first column along `column`.
    fn grid_bounds(row: (f32, f32), column: (f32, f32)) -> [Point; 4] {
        let at = |u: f32, v: f32| {
            p(
                100.0 + 20.0 * (u * row.0 + v * column.0),
                50.0 + 20.0 * (u * row.1 + v * column.1),
            )
        };
        [at(0.0, 0.0), at(1.0, 0.0), at(1.0, 1.0), at(0.0, 1.0)]
    }

    #[test]
    fn rqrr_anchor_moves_one_plane_pixel_along_each_axis_the_symbol_extends_back_along() {
        // a plane pixel of 2 × 3 bounds pixels (a read on a downscaled plane)
        let pixel = p(2.0, 3.0);
        let anchor = |row, column| rqrr_anchor(grid_bounds(row, column), pixel);
        assert_eq!(anchor((1.0, 0.0), (0.0, 1.0)), Some((0.0, 0.0)), "upright");
        assert_eq!(
            anchor((0.0, 1.0), (-1.0, 0.0)),
            Some((2.0, 0.0)),
            "quarter turn"
        );
        assert_eq!(
            anchor((-1.0, 0.0), (0.0, -1.0)),
            Some((2.0, 3.0)),
            "half turn"
        );
        assert_eq!(
            anchor((0.0, -1.0), (1.0, 0.0)),
            Some((0.0, 3.0)),
            "three quarters"
        );
        assert_eq!(anchor((0.0, 1.0), (1.0, 0.0)), Some((0.0, 0.0)), "mirrored");
        assert_eq!(
            anchor((1.0, 0.0), (0.0, -1.0)),
            Some((0.0, 3.0)),
            "mirrored, flipped"
        );
        // continuous between quarter turns: an eighth, ½(1 − 0) and ½(1 − √2)
        let (s, c) = std::f32::consts::FRAC_PI_4.sin_cos();
        let (dx, dy) = anchor((c, s), (-s, c)).unwrap();
        assert!((dx - 1.0).abs() < 1e-5, "{dx}");
        assert!(
            (dy - 1.5 * (1.0 - std::f32::consts::SQRT_2)).abs() < 1e-5,
            "{dy}"
        );
    }

    #[test]
    fn rqrr_anchor_has_no_direction_along_a_first_row_or_column_of_no_length() {
        let pixel = UNIT_PIXEL;
        let mut bounds = grid_bounds((1.0, 0.0), (0.0, 1.0));
        bounds[1] = bounds[0];
        assert_eq!(rqrr_anchor(bounds, pixel), None, "a row of no length");
        let mut bounds = grid_bounds((1.0, 0.0), (0.0, 1.0));
        bounds[3] = bounds[0];
        assert_eq!(rqrr_anchor(bounds, pixel), None, "a column of no length");
        let mut bounds = grid_bounds((1.0, 0.0), (0.0, 1.0));
        bounds[1].x = f32::INFINITY;
        assert_eq!(rqrr_anchor(bounds, pixel), None, "a row without an end");
        // a guard pin, not a spec threshold: a first row whose length rounds
        // to the f64 1e-9 the guard compares with has no direction. No f32
        // corners span exactly that length; these lie about 1.1e-7 ulp below
        // it, so any hypot within 0.99 ulp returns it: macOS's does, and so
        // do glibc 2.39's two kernels, replayed exactly
        let origin = p(0.0, f32::from_bits(0x1e10_6e46));
        let end = p(f32::from_bits(0x3089_705f), f32::from_bits(0x2a85_e325));
        let edge = [origin, end, p(1.0, 1.0), p(0.0, origin.y + 1.0)];
        assert_eq!(rqrr_anchor(edge, pixel), None, "a row of 1e-9 px");
    }

    #[test]
    fn rqrr_footprint_shifts_the_bounds_off_the_anchor_and_shrinks_them_to_the_outer_corners() {
        // a half-turned 21-module grid at 10 bounds pixels a module, read on
        // a plane of 2 px: anchored two pixels short along x and y
        let bounds = [
            p(260.0, 260.0),
            p(40.0, 260.0),
            p(40.0, 40.0),
            p(260.0, 40.0),
        ];
        let footprint = rqrr_footprint(bounds, 21, p(2.0, 2.0));
        assert_eq!(footprint.kind, Kind::Quad);
        assert_eq!(footprint.detector, Some(EngineKind::Rqrr));
        let want = [
            p(262.0, 262.0),
            p(52.0, 262.0),
            p(52.0, 52.0),
            p(262.0, 52.0),
        ];
        for (got, want) in footprint.points.iter().zip(want) {
            assert!(
                (got.x - want.x).abs() < 1e-3 && (got.y - want.y).abs() < 1e-3,
                "{:?}",
                footprint.points
            );
        }
        // degenerate bounds keep their points, as partial
        let flat = rqrr_footprint([p(5.0, 5.0); 4], 21, UNIT_PIXEL);
        assert_eq!(flat.kind, Kind::Partial);
        assert_eq!(flat.points, vec![p(5.0, 5.0); 4]);
    }

    #[test]
    fn corners_spanning_next_to_no_area_have_no_projective_map() {
        // a square of 1e-5 px sides: the sides meeting at its (1,1) corner
        // span 1e-10 square pixels
        let tiny = [p(0.0, 0.0), p(1e-5, 0.0), p(1e-5, 1e-5), p(0.0, 1e-5)];
        assert!(square_to_quad(tiny).is_none());
        assert_eq!(rqrr_outer_corners(tiny, 21), None);
        // a guard pin, not a spec threshold: a sliver whose sides meeting at
        // its (1,1) corner span exactly the 1e-9 the guard compares with
        // (exact IEEE arithmetic, no libm call) still maps, corner to corner
        let x1 = f32::from_bits(0x3909_704d);
        let y3 = f32::from_bits(0x3700_0011);
        let q = f32::from_bits(0xa018_f550);
        let sliver = [p(x1, 1.0 + y3), p(x1, 1.0), p(0.0, 0.0), p(q, y3)];
        let map = square_to_quad(sliver).expect("1e-9 is not degenerate");
        let unit = [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)];
        for ((u, v), corner) in unit.into_iter().zip(sliver) {
            let got = map(u, v).unwrap();
            assert!(
                (got.x - corner.x).abs() < 1e-9 && (got.y - corner.y).abs() < 1e-6,
                "{got:?} {corner:?}"
            );
        }
    }

    #[test]
    fn a_centre_within_the_tolerance_of_a_quads_outline_or_a_boxes_edges_is_inside() {
        let at = |x: f32, y: f32| partial(vec![p(x, y)], EngineKind::Rqrr);
        let near = [(150.0, 98.5), (201.5, 150.0), (150.0, 201.5), (98.5, 150.0)];
        let beyond = [(150.0, 97.5), (202.5, 150.0), (150.0, 202.5), (97.5, 150.0)];
        // a clockwise 100 px square's outline, and the box of two corners:
        // 1.5 px past each edge is within 2 px, 2.5 px is not
        let square = quad([
            (100.0, 100.0),
            (200.0, 100.0),
            (200.0, 200.0),
            (100.0, 200.0),
        ])
        .validated((400, 400));
        let corners = partial(vec![p(100.0, 100.0), p(200.0, 200.0)], EngineKind::Rqrr);
        for b in [&square, &corners] {
            for (x, y) in near {
                assert!(centre_inside(&at(x, y), b, 2.0), "({x}, {y}) {b:?}");
            }
            for (x, y) in beyond {
                assert!(!centre_inside(&at(x, y), b, 2.0), "({x}, {y}) {b:?}");
            }
            // in the box's column or row, far past it
            assert!(!centre_inside(&at(150.0, 300.0), b, 2.0));
            assert!(!centre_inside(&at(300.0, 150.0), b, 2.0));
        }
        // a quad turned 45°: a corner of its box is outside its outline
        let diamond = quad([(150.0, 50.0), (250.0, 150.0), (150.0, 250.0), (50.0, 150.0)])
            .validated((400, 400));
        assert_eq!(diamond.kind, Kind::Quad);
        assert!(!centre_inside(&at(70.0, 70.0), &diamond, 2.0));
        assert!(centre_inside(&at(150.0, 150.0), &diamond, 2.0));
        // four points that are no quad compare by their box, in any order
        let unordered = partial(
            vec![
                p(100.0, 100.0),
                p(100.0, 200.0),
                p(200.0, 200.0),
                p(200.0, 100.0),
            ],
            EngineKind::Rxing,
        );
        assert!(centre_inside(&at(150.0, 150.0), &unordered, 2.0));
        assert!(centre_inside(&at(98.5, 150.0), &unordered, 2.0));
        // nothing measured is inside nothing
        let none = Footprint::unavailable();
        assert!(!centre_inside(&none, &square, 2.0));
        assert!(!centre_inside(&at(150.0, 150.0), &none, 2.0));
    }

    #[test]
    fn matrix_footprints_compare_within_one_coarse_plane_pixel_plus_one() {
        // on an 800 px image a 200 px plane measures in 4 px steps: points
        // 4.5 px apart are one symbol, 5.5 px apart two; on the full plane
        // the tolerance is 1 + 1 px
        let luma = blank(800, 800);
        let at = |x: f32, side: u32| {
            observed_on(
                partial(vec![p(x, 100.0)], EngineKind::Rqrr),
                rank(0, 0),
                side,
            )
        };
        let mut bridges = MAX_BRIDGES;
        for (x, side, want) in [
            (104.5, 200, Verdict::Same),
            (105.5, 200, Verdict::Different),
            (101.5, 800, Verdict::Same),
            (102.5, 800, Verdict::Different),
        ] {
            for (a, b) in [(at(100.0, 800), at(x, side)), (at(x, side), at(100.0, 800))] {
                let got = same_symbol(Symbology::QrCode, &a, &b, &luma, &mut bridges);
                assert_eq!(got, want, "{x} on {side}");
            }
        }
        assert_eq!(bridges, MAX_BRIDGES, "geometry spends no pixel comparison");
    }

    #[test]
    fn a_finder_centre_inside_a_quad_is_its_symbol_whichever_comes_first() {
        // the quad's centre is far from the lone point, the point is inside
        // the quad: either inside the other is one symbol
        let luma = blank(400, 400);
        let square = quad([(50.0, 50.0), (250.0, 50.0), (250.0, 250.0), (50.0, 250.0)])
            .validated((400, 400));
        let finder = partial(vec![p(80.0, 80.0)], EngineKind::Rxing);
        let mut bridges = MAX_BRIDGES;
        let (a, b) = (
            observed(square.clone(), rank(0, 0)),
            observed(finder.clone(), rank(1, 0)),
        );
        for (x, y) in [(&a, &b), (&b, &a)] {
            let got = same_symbol(Symbology::QrCode, x, y, &luma, &mut bridges);
            assert_eq!(got, Verdict::Same);
        }
        for observations in [vec![a.clone(), b.clone()], vec![b, a]] {
            let (grouped, saturated) = group(Symbology::QrCode, observations, &luma);
            assert_eq!((grouped.len(), saturated), (1, false));
            assert_eq!(grouped[0].footprint, square, "the quad before the point");
            assert_eq!(grouped[0].rank, rank(0, 0));
        }
    }

    #[test]
    fn a_detection_flags_a_footprint_left_out_by_a_read_or_by_its_own_capacity() {
        let footprints: Vec<Observation> = (0..=MAX_GROUPED as u32)
            .map(|i| {
                observed(
                    partial(vec![p(i as f32, 0.0)], EngineKind::Rxing),
                    rank(i, 0),
                )
            })
            .collect();
        // the read past capacity had itself left one out: both at once
        let (kept, dropped) = union([
            (&footprints[..MAX_GROUPED], false),
            (&footprints[MAX_GROUPED..], true),
        ]);
        assert!(dropped);
        assert_eq!(kept, footprints[..MAX_GROUPED]);
        assert!(union([(&footprints[..], false)]).1, "capacity alone");
        assert!(union([(&footprints[..1], true)]).1, "a read alone");
        assert!(!union([(&footprints[..MAX_GROUPED], false)]).1, "neither");
    }

    fn close(got: f64, want: f64) -> bool {
        (got - want).abs() < 1e-9
    }

    #[test]
    fn two_scan_lines_compare_in_the_frame_of_the_first() {
        // the first line 100 px along (0.6, 0.8) from (10, 20); the second
        // from 80 px along it and 10 px across back to 20 px along, 5 across
        let lines = Lines::of(
            [p(10.0, 20.0), p(70.0, 100.0)],
            [p(50.0, 90.0), p(18.0, 39.0)],
        );
        assert_eq!(lines.origin, (10.0, 20.0));
        assert!(
            close(lines.unit.0, 0.6) && close(lines.unit.1, 0.8),
            "{:?}",
            lines.unit
        );
        let second = 3625.0_f64.sqrt();
        assert!(close(lines.lengths.0, 100.0) && close(lines.lengths.1, second));
        assert!(close(lines.cos, 60.0 / second), "{}", lines.cos);
        assert!(close(lines.start, 20.0) && close(lines.overlap, 60.0));
        assert!(close(lines.offset, 7.5), "{}", lines.offset);
        assert!(!lines.crossing);
        // a second line past both ends of the first shares its whole stretch
        let past = Lines::of(
            [p(10.0, 20.0), p(70.0, 100.0)],
            [p(24.0, -3.0), p(96.0, 93.0)],
        );
        assert!(close(past.start, 0.0) && close(past.overlap, 100.0));
        assert!(close(past.cos, 1.0) && close(past.offset, -25.0));
        // a line of no length keeps a finite frame: the x axis, parallel
        let point = Lines::of([p(5.0, 5.0); 2], [p(5.0, 5.0); 2]);
        assert_eq!(
            (point.unit, point.lengths, point.cos),
            ((1.0, 0.0), (0.0, 0.0), 1.0)
        );
        assert_eq!((point.start, point.overlap, point.offset), (0.0, 0.0, 0.0));
    }

    #[test]
    fn geometry_decides_lines_too_short_too_far_apart_in_angle_or_stretch_or_on_each_other() {
        let row = [p(40.0, 50.0), p(360.0, 50.0)];
        let decided = |a, b| Lines::of(a, b).decided();
        // under one pixel long, either line: undecidable; one pixel decides
        let short = [p(100.0, 50.0), p(100.5, 50.0)];
        assert_eq!(decided(short, row), Some(Verdict::Unproven));
        assert_eq!(decided(row, short), Some(Verdict::Unproven));
        let pixel = [p(100.0, 50.0), p(101.0, 50.0)];
        assert_eq!(decided(pixel, row), Some(Verdict::Same));
        assert_eq!(decided(row, pixel), Some(Verdict::Same));
        // 30° apart, overlapping and not crossing: two symbols; 14° apart:
        // the pixels decide
        assert_eq!(
            decided(row, [p(100.0, 60.0), p(300.0, 175.0)]),
            Some(Verdict::Different)
        );
        assert_eq!(decided(row, [p(100.0, 60.0), p(300.0, 110.0)]), None);
        // sharing less than half the shorter stretch: two symbols; exactly
        // half: compared further (here at 1 px: one symbol)
        let first = [p(0.0, 50.0), p(200.0, 50.0)];
        assert_eq!(
            decided(first, [p(110.0, 51.0), p(310.0, 51.0)]),
            Some(Verdict::Different)
        );
        assert_eq!(
            decided(first, [p(100.0, 51.0), p(300.0, 51.0)]),
            Some(Verdict::Same)
        );
        // at most 1.5 px apart: one symbol; past it, the pixels decide
        assert_eq!(
            decided(row, [p(40.0, 51.5), p(360.0, 51.5)]),
            Some(Verdict::Same)
        );
        assert_eq!(decided(row, [p(40.0, 51.6), p(360.0, 51.6)]), None);
    }

    #[test]
    fn lines_cross_when_each_has_an_endpoint_strictly_on_either_side_of_the_other() {
        // geometry alone decides here: a blank plane
        let luma = blank(400, 300);
        let verdict = |a: [Point; 2], b: [Point; 2]| same_linear(&luma, a, b);
        // crossing at any tilt, either way along each line: one symbol
        for (a, b) in [
            (
                [p(10.0, 10.0), p(110.0, 110.0)],
                [p(30.0, 90.0), p(90.0, 30.0)],
            ),
            (
                [p(10.0, 20.0), p(110.0, 60.0)],
                [p(30.0, 70.0), p(90.0, 10.0)],
            ),
            (
                [p(110.0, 20.0), p(10.0, 60.0)],
                [p(30.0, 70.0), p(90.0, 10.0)],
            ),
        ] {
            assert_eq!(verdict(a, b), Verdict::Same, "{a:?} {b:?}");
            assert_eq!(verdict(b, a), Verdict::Same, "{b:?} {a:?}");
        }
        // stopping short of the other, or an endpoint only touching it: no
        // crossing, and lines this far apart in angle are two symbols
        let row = [p(40.0, 50.0), p(360.0, 50.0)];
        for (a, b) in [
            (
                [p(10.0, 20.0), p(110.0, 60.0)],
                [p(30.0, 70.0), p(55.0, 45.0)],
            ),
            (row, [p(200.0, 50.0), p(200.0, 99.0)]),
            (row, [p(200.0, 0.0), p(200.0, 50.0)]),
            (
                [p(200.0, 50.0), p(360.0, 50.0)],
                [p(200.0, 0.0), p(200.0, 99.0)],
            ),
            (
                [p(40.0, 50.0), p(200.0, 50.0)],
                [p(200.0, 99.0), p(200.0, 0.0)],
            ),
        ] {
            assert_eq!(verdict(a, b), Verdict::Different, "{a:?} {b:?}");
        }
    }

    /// Bars of `width` px over rows `rows` and columns 40..360 of a 400 px
    /// wide image: `dark` where `x / width` is odd, `light` elsewhere.
    fn shaded(data: &mut [u8], rows: std::ops::Range<u32>, width: u32, (dark, light): (u8, u8)) {
        for y in rows {
            for x in 40..360 {
                data[(y * 400 + x) as usize] = if (x / width) % 2 == 1 { dark } else { light };
            }
        }
    }

    /// Two copies of 5 px bars, rows 20..120 and 180..280 of a 400 × 300
    /// image, white elsewhere.
    fn two_copies() -> Vec<u8> {
        let mut data = vec![255u8; 400 * 300];
        bars(&mut data, 400, 20..120, 5);
        bars(&mut data, 400, 180..280, 5);
        data
    }

    fn row_at(y: f32) -> [Point; 2] {
        [p(40.0, y), p(360.0, y)]
    }

    #[test]
    fn a_uniform_band_between_two_copies_is_a_gap_at_any_grey_level() {
        // white, black, and the mid-grey that sits exactly on the bars'
        // threshold (127, between 0 and 255): no band carries bars
        for level in [255, 0, 127] {
            let mut data = two_copies();
            data[120 * 400..180 * 400].fill(level);
            let luma = LumaImage::new(data, 400, 300);
            let two = same_linear(&luma, row_at(60.0), row_at(240.0));
            assert_eq!(two, Verdict::Different, "a band at {level}");
        }
    }

    #[test]
    fn a_footprint_finds_its_bars_up_to_four_pixels_either_side_of_its_line() {
        let luma = LumaImage::new(two_copies(), 400, 300);
        let verdict = |a: f32, b: f32| same_linear(&luma, row_at(a), row_at(b));
        // a line 4 px below its copy's last bar row, or 4 px above the
        // other's first: still two copies
        assert_eq!(verdict(123.5, 240.5), Verdict::Different);
        assert_eq!(verdict(60.5, 176.5), Verdict::Different);
        // 5 px off, its bars are out of reach: nothing to compare
        assert_eq!(verdict(124.5, 240.5), Verdict::Unproven);
        assert_eq!(verdict(60.5, 175.5), Verdict::Unproven);
        // thin copies, two rows just above one line and three just below
        // the other: each line finds its own
        let mut data = vec![255u8; 400 * 300];
        bars(&mut data, 400, 121..123, 5);
        bars(&mut data, 400, 178..181, 5);
        let thin = LumaImage::new(data, 400, 300);
        let two = same_linear(&thin, row_at(123.5), row_at(177.5));
        assert_eq!(two, Verdict::Different);
    }

    #[test]
    fn of_rows_tied_either_side_of_a_line_its_pattern_is_the_nearest_above() {
        // a line on a white row between a crisp copy's last rows (above) and
        // four rows of the same bars faded to 150 (below): every one of them
        // crosses as many bars on its own, the nearest above is the line's
        // pattern (searched first), and the rows down to the other copy are
        // a gap
        let mut data = vec![255u8; 400 * 300];
        bars(&mut data, 400, 20..100, 5);
        shaded(&mut data, 101..105, 5, (150, 255));
        bars(&mut data, 400, 180..280, 5);
        let luma = LumaImage::new(data, 400, 300);
        let two = same_linear(&luma, row_at(100.5), row_at(240.5));
        assert_eq!(two, Verdict::Different);
    }

    #[test]
    fn bars_under_32_grey_levels_prove_nothing_and_32_levels_are_enough() {
        for (contrast, want) in [(20, Verdict::Unproven), (32, Verdict::Different)] {
            let light = 100 + contrast;
            let mut data = vec![light; 400 * 300];
            shaded(&mut data, 20..120, 5, (100, light));
            shaded(&mut data, 180..280, 5, (100, light));
            let luma = LumaImage::new(data, 400, 300);
            let got = same_linear(&luma, row_at(60.5), row_at(240.5));
            assert_eq!(got, want, "{contrast} levels");
        }
        // a copy at exactly 32 levels read on its top row keeps its own bars
        // over a stray dark mark on the row above it
        let mut data = vec![255u8; 400 * 300];
        shaded(&mut data, 81..120, 5, (100, 132));
        data[80 * 400 + 150..80 * 400 + 250].fill(0);
        bars(&mut data, 400, 180..280, 5);
        let luma = LumaImage::new(data, 400, 300);
        let two = same_linear(&luma, row_at(81.5), row_at(240.5));
        assert_eq!(two, Verdict::Different);
    }

    #[test]
    fn copies_ten_pixels_apart_split_at_a_four_pixel_gap() {
        // a 40 px stretch (8% of it, 3.2 px, is under the 4 px floor) read on
        // two lines 10 px apart, compared on ten lines between them 10/11 px
        // apart: four white rows lose five of them (4.5 px, a gap), three
        // lose four (3.6 px: past 8%, short of the floor, one symbol)
        for (white, want) in [
            (103..107_u32, Verdict::Different),
            (104..107, Verdict::Same),
        ] {
            let mut data = vec![255u8; 200 * 200];
            for y in 90..121_u32 {
                for x in 40..80_u32 {
                    if (x / 5) % 2 == 1 && !white.contains(&y) {
                        data[(y * 200 + x) as usize] = 0;
                    }
                }
            }
            let luma = LumaImage::new(data, 200, 200);
            let got = same_linear(
                &luma,
                [p(40.0, 100.5), p(80.0, 100.5)],
                [p(40.0, 110.5), p(80.0, 110.5)],
            );
            assert_eq!(got, want, "white rows {white:?}");
        }
    }

    #[test]
    fn a_gap_splits_a_wide_symbol_at_eight_percent_of_its_stretch() {
        // 8% of 320 px is 25.6 px: a 10 px interruption is one symbol, a
        // 30 px one two
        for (white, want) in [(145..155, Verdict::Same), (135..165, Verdict::Different)] {
            let mut data = vec![255u8; 400 * 300];
            bars(&mut data, 400, 20..white.start, 5);
            bars(&mut data, 400, white.end..280, 5);
            let luma = LumaImage::new(data, 400, 300);
            let got = same_linear(&luma, row_at(60.0), row_at(240.0));
            assert_eq!(got, want, "white rows {white:?}");
        }
    }

    #[test]
    fn a_pixel_spans_its_unit_square_and_no_coordinate_outside_the_image_reads_one() {
        // 4 × 3, row by row: 0, 10, …, 110
        let luma = LumaImage::new((0..12).map(|v| v * 10).collect(), 4, 3);
        assert_eq!(pixel(&luma, 0.0, 0.0), Some(0));
        assert_eq!(pixel(&luma, 2.7, 1.2), Some(60));
        assert_eq!(pixel(&luma, 3.999, 2.999), Some(110));
        for (x, y) in [
            (4.0, 0.0),
            (0.0, 3.0),
            (-0.5, 1.0),
            (1.0, -0.5),
            (f64::NAN, 1.0),
            (1.0, f64::NAN),
            (f64::INFINITY, 1.0),
            (1.0, f64::NEG_INFINITY),
        ] {
            assert_eq!(pixel(&luma, x, y), None, "({x}, {y})");
        }
    }

    #[test]
    fn the_bridge_reads_the_whole_shared_stretch_of_its_lines() {
        // the band between two copies keeps their bars over the first 128 px
        // (40%) of the 320 px stretch, or over its last 192 px (60%): each
        // line crosses 63 bar edges, the band 26 or 39, so only the first
        // band is a gap
        for ((from, to), want) in [((40, 168), Verdict::Different), ((168, 360), Verdict::Same)] {
            let mut data = two_copies();
            for y in 120..180_u32 {
                for x in (from..to).filter(|x| (x / 5) % 2 == 1) {
                    data[(y * 400 + x) as usize] = 0;
                }
            }
            let luma = LumaImage::new(data, 400, 300);
            let got = same_linear(&luma, row_at(60.0), row_at(240.0));
            assert_eq!(got, want, "bars kept over {from}..{to}");
        }
    }

    #[test]
    fn copies_side_by_side_read_down_vertical_lines_are_compared_across_them() {
        // two copies turned a quarter: 5 px stripes over rows 40..360 of a
        // 300 × 400 image, columns 20..120 and 180..280, read down x = 60
        // and x = 240; one wide copy over columns 20..280 is one symbol
        let luma = |columns: &[(u32, u32)]| {
            let mut data = vec![255u8; 300 * 400];
            for &(from, to) in columns {
                for x in from..to {
                    for y in (40..360_u32).filter(|y| (y / 5) % 2 == 1) {
                        data[(y * 300 + x) as usize] = 0;
                    }
                }
            }
            LumaImage::new(data, 300, 400)
        };
        let down = |x: f32| [p(x, 40.0), p(x, 360.0)];
        let two = luma(&[(20, 120), (180, 280)]);
        assert_eq!(
            same_linear(&two, down(60.0), down(240.0)),
            Verdict::Different
        );
        let one = luma(&[(20, 280)]);
        assert_eq!(same_linear(&one, down(60.0), down(240.0)), Verdict::Same);
    }

    #[test]
    fn four_bar_edges_are_enough_to_compare_and_two_are_not() {
        // copies of two 10 px bars (four edges) are two symbols; copies of a
        // single bar (two edges) prove nothing
        for (spans, want) in [
            (&[(150_u32, 160_u32), (200, 210)][..], Verdict::Different),
            (&[(150, 160)][..], Verdict::Unproven),
        ] {
            let mut data = vec![255u8; 400 * 300];
            for y in (20..120_u32).chain(180..280) {
                for &(from, to) in spans {
                    for x in from..to {
                        data[(y * 400 + x) as usize] = 0;
                    }
                }
            }
            let luma = LumaImage::new(data, 400, 300);
            let got = same_linear(&luma, row_at(60.5), row_at(240.5));
            assert_eq!(got, want, "bars {spans:?}");
        }
    }

    #[test]
    fn a_band_keeping_half_the_bar_edges_of_its_lines_joins_them() {
        // four 20 px bars (eight edges) on both lines; the band between them
        // keeps two (four edges, half: one symbol) or one (two: a gap)
        let four = [(80_u32, 100_u32), (140, 160), (200, 220), (260, 280)];
        for (kept, want) in [(&[0, 2][..], Verdict::Same), (&[0][..], Verdict::Different)] {
            let mut data = vec![255u8; 400 * 300];
            for y in 20..280_u32 {
                let band = (120..180).contains(&y);
                for (i, &(from, to)) in four.iter().enumerate() {
                    if !band || kept.contains(&i) {
                        for x in from..to {
                            data[(y * 400 + x) as usize] = 0;
                        }
                    }
                }
            }
            let luma = LumaImage::new(data, 400, 300);
            let got = same_linear(&luma, row_at(60.5), row_at(240.5));
            assert_eq!(got, want, "bars {kept:?} kept");
        }
    }

    #[test]
    fn lines_exactly_20_degrees_apart_are_compared_further() {
        let lines = Lines {
            origin: (0.0, 0.0),
            unit: (1.0, 0.0),
            lengths: (100.0, 100.0),
            cos: 20.0_f64.to_radians().cos(),
            start: 0.0,
            overlap: 100.0,
            offset: 1.0,
            crossing: false,
        };
        assert_eq!(lines.decided(), Some(Verdict::Same));
    }

    #[test]
    fn a_projective_map_sends_the_squares_centre_to_the_crossing_of_the_quads_diagonals() {
        // a convex quad in perspective: its diagonals y = x and x + y = 100
        // cross at (50, 50), where the square's diagonals cross
        let quad = [p(0.0, 0.0), p(100.0, 0.0), p(80.0, 80.0), p(0.0, 100.0)];
        let map = square_to_quad(quad).expect("a proper quad");
        assert_eq!(map(0.5, 0.5), Some(p(50.0, 50.0)));
        let unit = [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)];
        for ((u, v), corner) in unit.into_iter().zip(quad) {
            assert_eq!(map(u, v), Some(corner), "({u}, {v})");
        }
    }

    #[test]
    fn a_quad_with_a_corner_inside_the_others_triangle_maps_no_point_past_its_horizon() {
        // (2, 2) inside the triangle of the other corners: the map's horizon
        // (w = 0 on u + v = 3/4) crosses the square, so the three corners
        // beyond it map to no point, and the bounds give no outer corners
        let concave = [p(0.0, 0.0), p(10.0, 0.0), p(2.0, 2.0), p(0.0, 10.0)];
        let map = square_to_quad(concave).expect("its sides cross");
        assert_eq!(map(0.0, 0.0), Some(p(0.0, 0.0)));
        for (u, v) in [(1.0, 0.0), (1.0, 1.0), (0.0, 1.0)] {
            assert_eq!(map(u, v), None, "({u}, {v})");
        }
        assert_eq!(rqrr_outer_corners(concave, 21), None);
    }

    #[test]
    fn a_projective_map_publishes_no_point_beyond_the_f32_range() {
        // 1e37 squares of 220 px along either side is past f32::MAX
        let square = [
            p(40.0, 40.0),
            p(260.0, 40.0),
            p(260.0, 260.0),
            p(40.0, 260.0),
        ];
        let map = square_to_quad(square).expect("a proper quad");
        assert_eq!(map(0.5, 0.5), Some(p(150.0, 150.0)));
        assert_eq!(map(1e37, 0.0), None);
        assert_eq!(map(0.0, 1e37), None);
    }

    #[test]
    fn the_bridge_samples_inside_its_stretch_up_to_the_image_edges() {
        // a symbol across the whole width of a 100 px image, read on two
        // rows from its first column to its right edge: the bridge samples
        // the centre of each of 100 equal parts of the shared stretch,
        // columns 0 to 99, never past either end, so every line it reads is
        // inside the image — one tall symbol is one, and ten white rows
        // across it leave two copies
        for (white, want) in [(0..0_u32, Verdict::Same), (15..25, Verdict::Different)] {
            let mut data = vec![255u8; 100 * 40];
            for y in (0..40_u32).filter(|y| !white.contains(y)) {
                for x in (0..100_u32).filter(|x| (x / 5) % 2 == 1) {
                    data[(y * 100 + x) as usize] = 0;
                }
            }
            let luma = LumaImage::new(data, 100, 40);
            let got = same_linear(
                &luma,
                [p(0.0, 5.5), p(100.0, 5.5)],
                [p(0.0, 34.5), p(100.0, 34.5)],
            );
            assert_eq!(got, want, "white rows {white:?}");
        }
    }

    #[test]
    fn a_line_covering_part_of_the_other_is_compared_over_the_stretch_they_share() {
        // the first line crosses a blank margin from the left edge of a 200 px
        // image, the second covers only the symbol on the right half: the
        // bridge compares the stretch the second projects onto, columns 100
        // to 199, so it reads the symbol's bars (one tall symbol is one, ten
        // white rows across it leave two copies), not the margin from the
        // first line's origin, whose blank pixels prove nothing
        let first = [p(0.0, 5.5), p(200.0, 5.5)];
        let second = [p(100.0, 34.5), p(200.0, 34.5)];
        let lines = Lines::of(first, second);
        assert_eq!(
            (lines.start, lines.overlap, lines.offset),
            (100.0, 100.0, 29.0)
        );
        assert_eq!(lines.decided(), None);
        for (white, want) in [(0..0_u32, Verdict::Same), (15..25, Verdict::Different)] {
            let mut data = vec![255u8; 200 * 40];
            for y in (0..40_u32).filter(|y| !white.contains(y)) {
                for x in (100..200_u32).filter(|x| (x / 5) % 2 == 1) {
                    data[(y * 200 + x) as usize] = 0;
                }
            }
            let luma = LumaImage::new(data, 200, 40);
            let got = same_linear(&luma, first, second);
            assert_eq!(got, want, "white rows {white:?}");
        }
    }

    #[test]
    fn rescaling_scales_each_axis_by_its_own_factor_and_never_from_a_plane_without_area() {
        // read on a 100 × 50 plane, mapped onto 200 × 200: × 2 along x and
        // × 4 along y, the kind and the reader unchanged
        let measured = partial(vec![p(10.0, 20.0), p(30.0, 5.0)], EngineKind::Rxing);
        assert_eq!(
            measured.clone().rescaled((100, 50), (200, 200)),
            partial(vec![p(20.0, 80.0), p(60.0, 20.0)], EngineKind::Rxing)
        );
        // the same plane, or one without width or height (no factor to scale
        // by): the points as measured
        for from in [(200, 200), (0, 50), (100, 0), (0, 0)] {
            let mapped = measured.clone().rescaled(from, (200, 200));
            assert_eq!(mapped, measured, "from {from:?}");
        }
    }

    #[test]
    fn a_partial_footprint_keeps_the_first_eight_distinct_points_in_reading_order() {
        let points: Vec<Point> = (0..10).map(|i| p(10.0 * i as f32, 5.0)).collect();
        // a point read twice counts once, wherever the repeat falls
        let mut read = vec![points[0], points[1], points[0], points[1]];
        read.extend_from_slice(&points[2..]);
        let kept = partial(read, EngineKind::Rqrr);
        assert_eq!(
            (kept.kind, kept.detector),
            (Kind::Partial, Some(EngineKind::Rqrr))
        );
        // the report schema caps a partial footprint at eight points
        assert_eq!(kept.points, points[..8]);
        // points sharing one coordinate are distinct points
        let cross = vec![p(10.0, 5.0), p(10.0, 6.0), p(11.0, 5.0)];
        assert_eq!(partial(cross.clone(), EngineKind::Rqrr).points, cross);
        // no point: nothing measured
        assert_eq!(
            partial(Vec::new(), EngineKind::Rqrr),
            Footprint::unavailable()
        );
    }

    #[test]
    fn a_quad_is_strictly_convex_and_spans_at_least_four_square_pixels() {
        // a 2 px square spans exactly the minimum, drawn either way round
        let square = [p(0.0, 0.0), p(2.0, 0.0), p(2.0, 2.0), p(0.0, 2.0)];
        let back = [square[0], square[3], square[2], square[1]];
        assert_eq!(clockwise_quad(&square), Some(square));
        assert_eq!(clockwise_quad(&back), Some(square));
        // a little narrower, it spans less: no quad
        let narrow = [p(0.0, 0.0), p(1.9, 0.0), p(1.9, 2.0), p(0.0, 2.0)];
        assert_eq!(clockwise_quad(&narrow), None);
        // a corner on the line through its neighbours makes a triangle, not a
        // strictly convex quad, whichever way round it is drawn
        let flat = [p(0.0, 0.0), p(5.0, 0.0), p(10.0, 0.0), p(5.0, 10.0)];
        let flat_back = [flat[0], flat[3], flat[2], flat[1]];
        assert_eq!(clockwise_quad(&flat), None);
        assert_eq!(clockwise_quad(&flat_back), None);
        // three corners are no quad
        assert_eq!(clockwise_quad(&square[..3]), None);
    }

    #[test]
    fn a_footprint_measured_again_keeps_its_earliest_read_then_its_finest_plane() {
        let square = quad([(0.0, 10.0), (40.0, 10.0), (40.0, 50.0), (0.0, 50.0)]);
        let at = |attempt: u32, side: u32| observed_on(square.clone(), rank(attempt, 0), side);
        let beside = observed_on(
            quad([(60.0, 60.0), (90.0, 60.0), (90.0, 90.0), (60.0, 90.0)]),
            rank(3, 0),
            400,
        );
        let merged = |mut own: Vec<Observation>, again: Observation| {
            assert!(!merge(&mut own, vec![again]), "within capacity");
            own
        };
        // an earlier read of a kept footprint takes its place, a later one
        // does not
        assert_eq!(merged(vec![at(5, 400)], at(1, 400)), vec![at(1, 400)]);
        assert_eq!(merged(vec![at(1, 400)], at(5, 400)), vec![at(1, 400)]);
        // as early, the finer plane's measurement
        assert_eq!(merged(vec![at(1, 400)], at(1, 800)), vec![at(1, 800)]);
        assert_eq!(merged(vec![at(1, 800)], at(1, 400)), vec![at(1, 800)]);
        // the read decides before the plane: an earlier read takes the place
        // of a later one measured on a finer or a coarser plane, and a later
        // read never takes the place of an earlier one
        assert_eq!(merged(vec![at(1, 400)], at(5, 800)), vec![at(1, 400)]);
        assert_eq!(merged(vec![at(5, 800)], at(1, 400)), vec![at(1, 400)]);
        assert_eq!(merged(vec![at(5, 400)], at(1, 800)), vec![at(1, 800)]);
        assert_eq!(merged(vec![at(1, 800)], at(5, 400)), vec![at(1, 800)]);
        // only the kept measurement of that same footprint is replaced
        assert_eq!(
            merged(vec![beside.clone(), at(5, 400)], at(1, 400)),
            vec![at(1, 400), beside]
        );
        // as early and as fine, the kept measurement stays as it was: its
        // corners on the image edge at +0 are not rewritten as the -0 of an
        // equal re-measure
        let edge = quad([(-0.0, 10.0), (40.0, 10.0), (40.0, 50.0), (-0.0, 50.0)]);
        assert_eq!(edge, square, "+0 and -0 are one coordinate");
        let kept = merged(vec![at(1, 400)], observed_on(edge, rank(1, 0), 400));
        let x = |i: usize| kept[0].footprint.points[i].x.to_bits();
        assert_eq!((x(0), x(3)), (0.0_f32.to_bits(), 0.0_f32.to_bits()));
    }

    #[test]
    fn a_detection_groups_its_earliest_256_located_footprints_and_flags_any_past_them() {
        let luma = blank(400, 400);
        let square = quad([(50.0, 50.0), (150.0, 50.0), (150.0, 150.0), (50.0, 150.0)])
            .validated((400, 400));
        let other = quad([
            (250.0, 250.0),
            (350.0, 250.0),
            (350.0, 350.0),
            (250.0, 350.0),
        ])
        .validated((400, 400));
        let reads = MAX_GROUPED as u32;
        // 256 located reads of one symbol, and a read that located nothing
        // (it takes no place among them): one occurrence, none left out
        let mut observations: Vec<Observation> = (0..reads)
            .map(|i| observed(square.clone(), rank(i, 0)))
            .collect();
        observations.push(observed(Footprint::unavailable(), rank(0, 1)));
        let (grouped, saturated) = group(Symbology::QrCode, observations.clone(), &luma);
        assert_eq!((grouped.len(), saturated), (1, false));
        assert_eq!(grouped[0].footprint, square);
        // another symbol read after them is left out, and the grouping flagged
        let mut late = observations.clone();
        late.push(observed(other.clone(), rank(reads, 0)));
        let (grouped, saturated) = group(Symbology::QrCode, late, &luma);
        assert_eq!((grouped.len(), saturated), (1, true));
        assert_eq!(grouped[0].footprint, square);
        // read early, wherever it arrives, it is among the earliest 256
        let mut early = observations;
        early.push(observed(other.clone(), rank(0, 2)));
        let (grouped, saturated) = group(Symbology::QrCode, early, &luma);
        assert_eq!((grouped.len(), saturated), (2, true));
        assert_eq!(
            (&grouped[1].footprint, grouped[1].rank),
            (&other, rank(0, 2))
        );
    }
}
