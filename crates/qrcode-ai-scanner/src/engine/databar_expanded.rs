//! Patched rxing 0.9.3 RSS Expanded reader (Apache-2.0, notice below).
//!
//! The upstream finder-spacing guard is applied here until rxing includes it.
//! See `THIRD-PARTY.md` for the source, patch and removal condition.
#![allow(non_snake_case, dead_code, clippy::all, clippy::pedantic)]

/*
 * Copyright (C) 2010 ZXing authors
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

/*
 * These authors would like to acknowledge the Spanish Ministry of Industry,
 * Tourism and Trade, for the support in the project TSI020301-2008-2
 * "PIRAmIDE: Personalizable Interactions with Resources on AmI-enabled
 * Mobile Dynamic Environments", led by Treelogic
 * ( http://www.treelogic.com/ ):
 *
 *   http://www.piramidepse.com/
 */

use rxing::{
    BarcodeFormat, Binarizer, DecodeHints, Exceptions, RXingResult, RXingResultMetadataType,
    RXingResultMetadataValue, Reader,
    common::{BitArray, Result},
    oned::{
        OneDReader, record_pattern, record_pattern_in_reverse,
        rss::{AbstractRSSReaderTrait, FinderPattern, rss_utils},
    },
};

use rxing::oned::rss::expanded::decoders::abstract_expanded_decoder;
#[path = "databar_expanded/data_character.rs"]
mod data_character;
use data_character::{DataCharacter, DataCharacterTrait};
#[path = "databar_expanded/expanded_pair.rs"]
mod expanded_pair;
use expanded_pair::ExpandedPair;
#[path = "databar_expanded/expanded_row.rs"]
mod expanded_row;
use expanded_row::ExpandedRow;
#[path = "databar_expanded/bit_array_builder.rs"]
mod bit_array_builder;

const FINDER_PAT_A: u32 = 0;
const FINDER_PAT_B: u32 = 1;
const FINDER_PAT_C: u32 = 2;
const FINDER_PAT_D: u32 = 3;
const FINDER_PAT_E: u32 = 4;
const FINDER_PAT_F: u32 = 5;

const FINDER_PATTERN_SEQUENCES: [&[u32]; 10] = [
    &[FINDER_PAT_A, FINDER_PAT_A],
    &[FINDER_PAT_A, FINDER_PAT_B, FINDER_PAT_B],
    &[FINDER_PAT_A, FINDER_PAT_C, FINDER_PAT_B, FINDER_PAT_D],
    &[
        FINDER_PAT_A,
        FINDER_PAT_E,
        FINDER_PAT_B,
        FINDER_PAT_D,
        FINDER_PAT_C,
    ],
    &[
        FINDER_PAT_A,
        FINDER_PAT_E,
        FINDER_PAT_B,
        FINDER_PAT_D,
        FINDER_PAT_D,
        FINDER_PAT_F,
    ],
    &[
        FINDER_PAT_A,
        FINDER_PAT_E,
        FINDER_PAT_B,
        FINDER_PAT_D,
        FINDER_PAT_E,
        FINDER_PAT_F,
        FINDER_PAT_F,
    ],
    &[
        FINDER_PAT_A,
        FINDER_PAT_A,
        FINDER_PAT_B,
        FINDER_PAT_B,
        FINDER_PAT_C,
        FINDER_PAT_C,
        FINDER_PAT_D,
        FINDER_PAT_D,
    ],
    &[
        FINDER_PAT_A,
        FINDER_PAT_A,
        FINDER_PAT_B,
        FINDER_PAT_B,
        FINDER_PAT_C,
        FINDER_PAT_C,
        FINDER_PAT_D,
        FINDER_PAT_E,
        FINDER_PAT_E,
    ],
    &[
        FINDER_PAT_A,
        FINDER_PAT_A,
        FINDER_PAT_B,
        FINDER_PAT_B,
        FINDER_PAT_C,
        FINDER_PAT_C,
        FINDER_PAT_D,
        FINDER_PAT_E,
        FINDER_PAT_F,
        FINDER_PAT_F,
    ],
    &[
        FINDER_PAT_A,
        FINDER_PAT_A,
        FINDER_PAT_B,
        FINDER_PAT_B,
        FINDER_PAT_C,
        FINDER_PAT_D,
        FINDER_PAT_D,
        FINDER_PAT_E,
        FINDER_PAT_E,
        FINDER_PAT_F,
        FINDER_PAT_F,
    ],
];

/**
 * @author Pablo Orduña, University of Deusto (pablo.orduna@deusto.es)
 * @author Eduardo Castillejo, University of Deusto (eduardo.castillejo@deusto.es)
 */
#[derive(Default)]
pub struct RSSExpandedReader {
    decodeFinderCounters: [u32; 4],
    dataCharacterCounters: [u32; 8],
    oddRoundingErrors: [f32; 4],
    evenRoundingErrors: [f32; 4],
    oddCounts: [u32; 4],
    evenCounts: [u32; 4],

    pub(super) pairs: Vec<ExpandedPair>,
    pub(super) rows: Vec<ExpandedRow>,
    startEnd: [u32; 2],
    startFromEven: bool,
}
impl AbstractRSSReaderTrait for RSSExpandedReader {}
impl OneDReader for RSSExpandedReader {
    fn decode_row(
        &mut self,
        rowNumber: u32,
        row: &rxing::common::BitArray,
        _hints: &DecodeHints,
    ) -> Result<rxing::RXingResult> {
        // Rows can start with even pattern in case in prev rows there where odd number of patters.
        // So lets try twice
        self.pairs.clear();
        self.startFromEven = false;
        if let Ok(decoded_two_pairs) = self.decodeRow2pairs(rowNumber, row) {
            if let Ok(possible_result) = Self::constructRXingResult(&decoded_two_pairs) {
                return Ok(possible_result);
            }
        }

        self.pairs.clear();
        self.startFromEven = true;
        Self::constructRXingResult(&self.decodeRow2pairs(rowNumber, row)?)
    }
}
impl Reader for RSSExpandedReader {
    fn decode<B: Binarizer>(&mut self, image: &mut rxing::BinaryBitmap<B>) -> Result<RXingResult> {
        self.decode_with_hints(image, &DecodeHints::default())
    }

    // Note that we don't try rotation without the try harder flag, even if rotation was supported.
    fn decode_with_hints<B: Binarizer>(
        &mut self,
        image: &mut rxing::BinaryBitmap<B>,
        hints: &DecodeHints,
    ) -> Result<rxing::RXingResult> {
        if let Ok(res) = self._do_decode(image, hints) {
            Ok(res)
        } else {
            let tryHarder = hints.TryHarder.unwrap_or(false);
            if tryHarder && image.is_rotate_supported() {
                let mut rotatedImage = image.rotate_counter_clockwise();
                // the rows stored by the upright pass lie in another frame:
                // never assembled with the rotated image's
                self.reset();
                let mut result = self._do_decode(&mut rotatedImage, hints)?;
                // Record that we found it rotated 90 degrees CCW / 270 degrees CW
                let metadata = result.getRXingResultMetadata();
                let mut orientation = 270;
                if metadata.contains_key(&RXingResultMetadataType::ORIENTATION) {
                    // But if we found it reversed in doDecode(), add in that result here:
                    orientation = (orientation
                        + if let Some(rxing::RXingResultMetadataValue::Orientation(or)) =
                            metadata.get(&RXingResultMetadataType::ORIENTATION)
                        {
                            *or
                        } else {
                            0
                        })
                        % 360;
                }
                result.putMetadata(
                    RXingResultMetadataType::ORIENTATION,
                    RXingResultMetadataValue::Orientation(orientation),
                );
                // Update result points
                let height = rotatedImage.get_height();

                let total_points = result.getPoints().len();
                let points = result.getPointsMut();
                for point in points.iter_mut().take(total_points) {
                    std::mem::swap(&mut point.x, &mut point.y);
                    point.x = height as f32 - point.x - 1.0;
                }

                Ok(result)
            } else {
                Err(Exceptions::NOT_FOUND)
            }
        }
    }

    fn reset(&mut self) {
        self.pairs.clear();
        self.rows.clear();
    }
}

impl RSSExpandedReader {
    pub fn new() -> Self {
        Self::default()
    }
    const SYMBOL_WIDEST: [u32; 5] = [7, 5, 4, 3, 1];
    const EVEN_TOTAL_SUBSET: [u32; 5] = [4, 20, 52, 104, 204];
    const GSUM: [u32; 5] = [0, 348, 1388, 2948, 3988];

    const FINDER_PATTERNS: [[u32; 4]; 6] = [
        [1, 8, 4, 1], // A
        [3, 6, 4, 1], // B
        [3, 4, 6, 1], // C
        [3, 2, 8, 1], // D
        [2, 6, 5, 1], // E
        [2, 2, 9, 1], // F
    ];

    const WEIGHTS: [[u32; 8]; 23] = [
        [1, 3, 9, 27, 81, 32, 96, 77],
        [20, 60, 180, 118, 143, 7, 21, 63],
        [189, 145, 13, 39, 117, 140, 209, 205],
        [193, 157, 49, 147, 19, 57, 171, 91],
        [62, 186, 136, 197, 169, 85, 44, 132],
        [185, 133, 188, 142, 4, 12, 36, 108],
        [113, 128, 173, 97, 80, 29, 87, 50],
        [150, 28, 84, 41, 123, 158, 52, 156],
        [46, 138, 203, 187, 139, 206, 196, 166],
        [76, 17, 51, 153, 37, 111, 122, 155],
        [43, 129, 176, 106, 107, 110, 119, 146],
        [16, 48, 144, 10, 30, 90, 59, 177],
        [109, 116, 137, 200, 178, 112, 125, 164],
        [70, 210, 208, 202, 184, 130, 179, 115],
        [134, 191, 151, 31, 93, 68, 204, 190],
        [148, 22, 66, 198, 172, 94, 71, 2],
        [6, 18, 54, 162, 64, 192, 154, 40],
        [120, 149, 25, 75, 14, 42, 126, 167],
        [79, 26, 78, 23, 69, 207, 199, 175],
        [103, 98, 83, 38, 114, 131, 182, 124],
        [161, 61, 183, 127, 170, 88, 53, 159],
        [55, 165, 73, 8, 24, 72, 5, 15],
        [45, 135, 194, 160, 58, 174, 100, 89],
    ];

    #[allow(dead_code)]
    const MAX_PAIRS: usize = 11;

    // Not private for testing
    pub(super) fn decodeRow2pairs(
        &mut self,
        rowNumber: u32,
        row: &BitArray,
    ) -> Result<Vec<ExpandedPair>> {
        let mut done = false;
        while !done {
            let previousPairs = self.pairs.clone();
            let to_add_res = self.retrieveNextPair(row, &previousPairs, rowNumber);
            if let Ok(to_add) = to_add_res {
                self.pairs.push(to_add);
            } else if self.pairs.is_empty() {
                return Err(to_add_res.err().unwrap_or(Exceptions::ILLEGAL_STATE));
            } else {
                // exit this loop when retrieveNextPair() fails and throws
                done = true;
            }
        }

        // TODO: verify sequence of finder patterns as in checkPairSequence()
        if self.checkChecksum() && Self::isValidSequence(&self.pairs, true) {
            return Ok(self.pairs.clone());
        }

        let tryStackedDecode = !self.rows.is_empty();
        self.storeRow(rowNumber); // TODO: deal with reversed rows
        if tryStackedDecode {
            // When the image is 180-rotated, then rows are sorted in wrong direction.
            // Try twice with both the directions.
            let ps = self.checkRows(false).or(self.checkRows(true));
            if let Some(ps) = ps {
                return Ok(ps);
            }

            // let ps = self.checkRows(false);
            // if let Some(ps) = ps {
            //     return Ok(ps);
            // }
            // let ps = self.checkRows(true);
            // if let Some(ps) = ps {
            //     return Ok(ps);
            // }
        }

        Err(Exceptions::NOT_FOUND)
    }

    fn checkRows(&mut self, reverse: bool) -> Option<Vec<ExpandedPair>> {
        // Limit number of rows we are checking
        // We use recursive algorithm with pure complexity and don't want it to take forever
        // Stacked barcode can have up to 11 rows, so 25 seems reasonable enough
        if self.rows.len() > 25 {
            self.rows.clear(); // We will never have a chance to get result, so clear it
            return None;
        }

        self.pairs.clear();
        if reverse {
            self.rows.reverse();
        }

        let mut c_rows = Vec::new();
        let ps = self.checkRowsDetails(&mut c_rows, 0).ok();
        // let ps = if let Ok(res) = self.checkRowsDetails(&mut c_rows, 0) {
        //     Some(res)
        // } else {
        //     None
        // };
        // } catch (NotFoundException e) {
        // OK
        // }

        if reverse {
            self.rows.reverse();
        }

        ps
    }

    // Try to construct a valid rows sequence
    // Recursion is used to implement backtracking
    fn checkRowsDetails(
        &mut self,
        collectedRows: &mut Vec<ExpandedRow>,
        currentRow: usize,
    ) -> Result<Vec<ExpandedPair>> {
        for i in currentRow..self.rows.len() {
            // for (int i = currentRow; i < rows.size(); i++) {
            let row = self.rows.get(i).ok_or(Exceptions::INDEX_OUT_OF_BOUNDS)?;

            self.pairs.extend_from_slice(row.getPairs());

            let addSize = row.getPairs().len();

            if Self::isValidSequence(&self.pairs, false) {
                if self.checkChecksum() && Self::isValidSequence(&self.pairs, true) {
                    return Ok(self.pairs.clone());
                }

                collectedRows.push(row.clone());

                // Recursion: try to add more rows
                if let Ok(cr) = self.checkRowsDetails(collectedRows, i + 1) {
                    return Ok(cr);
                } else {
                    // collectedRows.remove(collectedRows.len() - 1);
                    collectedRows.truncate(collectedRows.len() - 1);
                    self.pairs.truncate(self.pairs.len() - addSize);
                }
            } else {
                self.pairs.truncate(self.pairs.len() - addSize);
            }
        }

        Err(Exceptions::NOT_FOUND)
    }

    /// Whether the pairs form a valid find pattern sequence,
    /// either complete or a prefix
    ///
    fn isValidSequence(pairs: &[ExpandedPair], complete: bool) -> bool {
        for sequence in FINDER_PATTERN_SEQUENCES.iter() {
            // for i in 0..FINDER_PATTERN_SEQUENCES.len() {
            // for sequence in &FINDER_PATTERN_SEQUENCES.iter() {
            // let sequence = FINDER_PATTERN_SEQUENCES.get(i).unwrap();
            // for (int[] sequence : FINDER_PATTERN_SEQUENCES) {
            if if complete {
                pairs.len() == sequence.len()
            } else {
                pairs.len() <= sequence.len()
            } {
                let stop = sequence
                    .iter()
                    .enumerate()
                    .take(pairs.len())
                    .all(|(j, seq)| {
                        pairs
                            .get(j)
                            .and_then(|pair| pair.getFinderPattern().as_ref())
                            .is_some_and(|finder| finder.getValue() == *seq)
                    });

                // let mut stop = true;
                // for (j, seq) in sequence.iter().enumerate().take(pairs.len()) {
                //     // for (int j = 0; j < pairs.size(); j++) {
                //     if pairs
                //         .get(j)
                //         .unwrap()
                //         .getFinderPattern()
                //         .as_ref()
                //         .unwrap()
                //         .getValue()
                //         != *seq
                //     {
                //         stop = false;
                //         break;
                //         // return true;
                //     }
                // }
                if stop {
                    return true;
                }
            }
        }

        false
    }

    fn storeRow(&mut self, rowNumber: u32) {
        // Discard if duplicate above or below; otherwise insert in order by row number.
        let mut insertPos = 0;
        let mut prevIsSame = false;
        let mut nextIsSame = false;
        while insertPos < self.rows.len() {
            if let Some(erow) = self.rows.get(insertPos) {
                if erow.getRowNumber() > rowNumber {
                    nextIsSame = erow.isEquivalent(&self.pairs);
                    break;
                }
                prevIsSame = erow.isEquivalent(&self.pairs);
                insertPos += 1;
            }
        }
        if nextIsSame || prevIsSame {
            return;
        }

        // When the row was partially decoded (e.g. 2 pairs found instead of 3),
        // it will prevent us from detecting the barcode.
        // Try to merge partial rows

        // Check whether the row is part of an already detected row
        if Self::isPartialRow(&self.pairs, &self.rows) {
            return;
        }

        self.rows
            .insert(insertPos, ExpandedRow::new(self.pairs.clone(), rowNumber));

        Self::removePartialRows(&self.pairs, &mut self.rows);
    }

    // Remove all the rows that contains only specified pairs
    fn removePartialRows(pairs: &[ExpandedPair], rows: &mut Vec<ExpandedRow>) {
        rows.retain(|row| {
            // let mut allFound = true;
            if row.getPairs().len() != pairs.len() {
                !row.getPairs().iter().all(|p| pairs.contains(p))
                // for p in row.getPairs() {
                //     // for (ExpandedPair p : r.getPairs()) {
                //     if !pairs.contains(p) {
                //         allFound = false;
                //         break;
                //     }
                // }
            } else {
                true
            }
        });
    }

    // Returns true when one of the rows already contains all the pairs
    fn isPartialRow(pairs: &[ExpandedPair], rows: &[ExpandedRow]) -> bool {
        rows.iter()
            .any(|r| !pairs.iter().any(|p| !r.getPairs().contains(p)))
        // for r in rows {
        //     let allFound = !pairs.iter().any(|p| !r.getPairs().contains(p));
        //     // let mut allFound = true;
        //     // for p in pairs {
        //     //     // let mut found = false;
        //     //     let found = r.getPairs().contains(p);
        //     //     // for pp in r.getPairs() {
        //     //     //     if p == pp {
        //     //     //         found = true;
        //     //     //         break;
        //     //     //     }
        //     //     // }
        //     //     if !found {
        //     //         allFound = false;
        //     //         break;
        //     //     }
        //     // }
        //     if allFound {
        //         // the row 'r' contain all the pairs from 'pairs'
        //         return true;
        //     }
        // }
        // false
    }

    // Only used for unit testing
    #[cfg(test)]
    #[allow(dead_code)]
    pub(crate) fn getRowsMut(&mut self) -> &mut [ExpandedRow] {
        &mut self.rows
    }
    #[cfg(test)]
    pub(crate) fn getRows(&self) -> &[ExpandedRow] {
        &self.rows
    }

    // Not private for unit testing
    pub(crate) fn constructRXingResult(pairs: &[ExpandedPair]) -> Result<RXingResult> {
        let binary = bit_array_builder::buildBitArray(pairs).ok_or(Exceptions::ILLEGAL_STATE)?;

        let mut decoder = abstract_expanded_decoder::createDecoder(&binary)?;
        let resultingString = decoder.parseInformation()?;

        let firstPoints = pairs
            .first()
            .ok_or(Exceptions::INDEX_OUT_OF_BOUNDS)?
            .getFinderPattern()
            .as_ref()
            .ok_or(Exceptions::ILLEGAL_STATE)?
            .getPoints();
        let lastPoints = pairs
            .last()
            .ok_or(Exceptions::INDEX_OUT_OF_BOUNDS)?
            .getFinderPattern()
            .as_ref()
            .ok_or(Exceptions::ILLEGAL_STATE)?
            .getPoints();

        let mut result = RXingResult::new(
            &resultingString,
            Vec::new(),
            vec![firstPoints[0], firstPoints[1], lastPoints[0], lastPoints[1]],
            BarcodeFormat::RSS_EXPANDED,
        );

        result.putMetadata(
            RXingResultMetadataType::SYMBOLOGY_IDENTIFIER,
            RXingResultMetadataValue::SymbologyIdentifier("]e0".to_owned()),
        );

        Ok(result)
    }

    fn checkChecksum(&self) -> bool {
        let Some(firstPair) = self.pairs.first() else {
            return false;
        };
        let checkCharacter = firstPair.getLeftChar();
        let Some(firstCharacter) = firstPair.getRightChar() else {
            return false;
        };

        let mut checksum = firstCharacter.getChecksumPortion();
        let mut s = 2;

        for currentPair in self.pairs.iter().skip(1) {
            let Some(currentPairLeftChar) = currentPair.getLeftChar() else {
                return false;
            };
            checksum += currentPairLeftChar.getChecksumPortion();
            s += 1;
            if let Some(currentRightChar) = currentPair.getRightChar() {
                checksum += currentRightChar.getChecksumPortion();
                s += 1;
            }
        }

        checksum %= 211;

        let checkCharacterValue = (211 * (s as i64 - 4) + checksum as i64) as u32;

        if let Some(checkCharacter) = checkCharacter {
            checkCharacterValue == checkCharacter.getValue()
        } else {
            false
        }
    }

    fn getNextSecondBar(row: &BitArray, initialPos: usize) -> usize {
        let mut currentPos;
        if row.get(initialPos) {
            currentPos = row.getNextUnset(initialPos);
            currentPos = row.getNextSet(currentPos);
        } else {
            currentPos = row.getNextSet(initialPos);
            currentPos = row.getNextUnset(currentPos);
        }
        currentPos
    }

    // not private for testing
    pub(super) fn retrieveNextPair(
        &mut self,
        row: &BitArray,
        previousPairs: &[ExpandedPair],
        rowNumber: u32,
    ) -> Result<ExpandedPair> {
        let mut isOddPattern = previousPairs.len() % 2 == 0;
        if self.startFromEven {
            isOddPattern = !isOddPattern;
        }

        let mut pattern;

        let mut keepFinding = true;
        let mut forcedOffset = -1_i32;
        loop {
            self.findNextPair(row, previousPairs, forcedOffset)?;
            pattern = self.parseFoundFinderPattern(row, rowNumber, isOddPattern, previousPairs);
            if pattern.is_none() {
                forcedOffset = Self::getNextSecondBar(row, self.startEnd[0] as usize) as i32;
            } else {
                keepFinding = false;
            }
            if !keepFinding {
                break;
            }
        }

        // When stacked symbol is split over multiple rows, there's no way to guess if this pair can be last or not.
        // boolean mayBeLast = checkPairSequence(previousPairs, pattern);

        let leftChar = self.decodeDataCharacter(
            row,
            pattern.as_ref().ok_or(Exceptions::NOT_FOUND)?,
            isOddPattern,
            true,
        )?;

        if !previousPairs.is_empty()
            && previousPairs
                .last()
                .ok_or(Exceptions::NOT_FOUND)?
                .mustBeLast()
        {
            return Err(Exceptions::NOT_FOUND);
        }

        let rightChar = self
            .decodeDataCharacter(
                row,
                pattern.as_ref().ok_or(Exceptions::NOT_FOUND)?,
                isOddPattern,
                false,
            )
            .ok();

        Ok(ExpandedPair::new(Some(leftChar), rightChar, pattern))
    }

    fn findNextPair(
        &mut self,
        row: &BitArray,
        previousPairs: &[ExpandedPair],
        forcedOffset: i32,
    ) -> Result<()> {
        let counters = &mut self.decodeFinderCounters;
        counters.fill(0);
        // counters[0] = 0;
        // counters[1] = 0;
        // counters[2] = 0;
        // counters[3] = 0;

        let width = row.get_size();

        let mut rowOffset;
        if forcedOffset >= 0 {
            rowOffset = forcedOffset;
        } else if previousPairs.is_empty() {
            rowOffset = 0;
        } else {
            let lastPair = previousPairs
                .last()
                .ok_or(Exceptions::INDEX_OUT_OF_BOUNDS)?;
            rowOffset = lastPair
                .getFinderPattern()
                .as_ref()
                .ok_or(Exceptions::ILLEGAL_STATE)?
                .getStartEnd()[1] as i32;
        }
        let mut searchingEvenPair = previousPairs.len() % 2 != 0;
        if self.startFromEven {
            searchingEvenPair = !searchingEvenPair;
        }

        let mut isWhite = false;
        while rowOffset < width as i32 {
            isWhite = !row.get(rowOffset as usize);
            if !isWhite {
                break;
            }
            rowOffset += 1;
        }

        let mut counterPosition = 0;
        let mut patternStart = rowOffset;
        for x in rowOffset..width as i32 {
            // for (int x = rowOffset; x < width; x++) {
            if row.get(x as usize) != isWhite {
                counters[counterPosition] += 1;
            } else {
                if counterPosition == 3 {
                    if searchingEvenPair {
                        Self::reverseCounters(counters);
                    }

                    if Self::isFinderPattern(counters) {
                        self.startEnd[0] = patternStart as u32;
                        self.startEnd[1] = x as u32;
                        return Ok(());
                    }

                    if searchingEvenPair {
                        Self::reverseCounters(counters);
                    }

                    patternStart += (counters[0] + counters[1]) as i32;
                    counters[0] = counters[2];
                    counters[1] = counters[3];
                    counters[2] = 0;
                    counters[3] = 0;
                    counterPosition -= 1;
                } else {
                    counterPosition += 1;
                }
                counters[counterPosition] = 1;
                isWhite = !isWhite;
            }
        }
        Err(Exceptions::NOT_FOUND)
    }

    fn reverseCounters<const N: usize>(counters: &mut [u32; N]) {
        counters.reverse();
    }

    fn parseFoundFinderPattern(
        &self,
        row: &BitArray,
        rowNumber: u32,
        oddPattern: bool,
        previousPairs: &[ExpandedPair],
    ) -> Option<FinderPattern> {
        // Actually we found elements 2-5.
        let firstCounter;
        let start;
        let end;

        if oddPattern {
            // If pattern number is odd, we need to locate element 1 *before* the current block.

            let mut firstElementStart = self.startEnd[0] as i32 - 1;
            // Locate element 1
            while firstElementStart >= 0 && !row.get(firstElementStart as usize) {
                firstElementStart -= 1;
            }

            firstElementStart += 1;
            firstCounter = self.startEnd[0] as i32 - firstElementStart;
            start = firstElementStart;
            end = self.startEnd[1];
        } else {
            // If pattern number is even, the pattern is reversed, so we need to locate element 1 *after* the current block.

            start = self.startEnd[0] as i32;

            end = row.getNextUnset(self.startEnd[1] as usize + 1) as u32;
            firstCounter = end as i32 - self.startEnd[1] as i32;
        }

        // Make 'counters' hold 1-4
        let mut counters = self.decodeFinderCounters;
        let counters_len = counters.len();
        counters.copy_within(..counters_len - 1, 1);
        // System.arraycopy(counters, 0, counters, 1, counters.length - 1);

        counters[0] = firstCounter as u32;
        let value = Self::parseFinderValue(&counters, &Self::FINDER_PATTERNS).ok()?;

        // ZXing's missing distance guard: two 17-module data characters lie
        // between consecutive 15-module finders. Reject an internal bar that
        // otherwise looks like a finder (within the original 10% tolerance).
        if let Some(previous) = previousPairs.last() {
            let previous = previous.getFinderPattern().as_ref()?;
            let &[previous_start, previous_end] = previous.getStartEnd() else {
                return None;
            };
            let character_width = (previous_end - previous_start) as f32 / 15.0 * 17.0;
            let minimum = previous_end as f32 + 2.0 * character_width * 0.9;
            let maximum = previous_end as f32 + 2.0 * character_width * 1.1;
            if (start as f32) < minimum || (start as f32) > maximum {
                return None;
            }
        }

        Some(FinderPattern::new(
            value,
            [start as usize, end as usize],
            start as usize,
            end as usize,
            rowNumber,
        ))
    }

    pub(super) fn decodeDataCharacter(
        &mut self,
        row: &BitArray,
        pattern: &FinderPattern,
        isOddPattern: bool,
        leftChar: bool,
    ) -> Result<DataCharacter> {
        let counters = &mut self.dataCharacterCounters;
        counters.fill(0);

        if leftChar {
            record_pattern_in_reverse(row, pattern.getStartEnd()[0], counters)?;
        } else {
            record_pattern(row, pattern.getStartEnd()[1], counters)?;
            // reverse it
            counters.reverse();
        } //counters[] has the pixels of the module

        //left and right data characters have all the same length
        let numModules = 17;

        let elementWidth: f32 = (counters.iter().sum::<u32>() as f32) / numModules as f32;

        // Logic check: element width for pattern and the character should match
        let expectedElementWidth: f32 =
            (pattern.getStartEnd()[1] - pattern.getStartEnd()[0]) as f32 / 15.0;
        if (elementWidth - expectedElementWidth).abs() / expectedElementWidth > 0.3 {
            return Err(Exceptions::NOT_FOUND);
        }

        for (i, counter) in counters.iter().enumerate() {
            // for (int i = 0; i < counters.length; i++) {
            let value: f32 = 1.0 * (*counter as f32) / elementWidth;
            let mut count = (value + 0.5) as i32; // Round
            if count < 1 {
                if value < 0.3 {
                    return Err(Exceptions::NOT_FOUND);
                }
                count = 1;
            } else if count > 8 {
                if value > 8.7 {
                    return Err(Exceptions::NOT_FOUND);
                }
                count = 8;
            }
            let offset = i / 2;
            if (i & 0x01) == 0 {
                self.oddCounts[offset] = count as u32;
                self.oddRoundingErrors[offset] = value - count as f32;
            } else {
                self.evenCounts[offset] = count as u32;
                self.evenRoundingErrors[offset] = value - count as f32;
            }
        }

        self.adjustOddEvenCounts(numModules as u32)?;

        let weightRowNumber = (4 * pattern.getValue() as isize
            + (if isOddPattern { 0 } else { 2 })
            + isize::from(!leftChar)
            - 1) as usize;

        let mut oddSum = 0;
        let mut oddChecksumPortion = 0;
        for i in (0..self.oddCounts.len()).rev() {
            if Self::isNotA1left(pattern, isOddPattern, leftChar) {
                let weight = Self::WEIGHTS[weightRowNumber][2 * i];
                oddChecksumPortion += self.oddCounts[i] * weight;
            }
            oddSum += self.oddCounts[i];
        }
        let mut evenChecksumPortion = 0;
        for i in (0..self.evenCounts.len()).rev() {
            if Self::isNotA1left(pattern, isOddPattern, leftChar) {
                let weight = Self::WEIGHTS[weightRowNumber][2 * i + 1];
                evenChecksumPortion += self.evenCounts[i] * weight;
            }
        }
        let checksumPortion = oddChecksumPortion + evenChecksumPortion;

        if (oddSum & 0x01) != 0 || !(4..=13).contains(&oddSum) {
            return Err(Exceptions::NOT_FOUND);
        }

        let group = ((13 - oddSum) / 2) as usize;
        let oddWidest = Self::SYMBOL_WIDEST[group];
        let evenWidest = 9 - oddWidest;
        let vOdd = rss_utils::getRSSvalue(&self.oddCounts, oddWidest, true);
        let vEven = rss_utils::getRSSvalue(&self.evenCounts, evenWidest, false);
        let tEven = Self::EVEN_TOTAL_SUBSET[group];
        let gSum = Self::GSUM[group];
        let value = vOdd * tEven + vEven + gSum;

        Ok(DataCharacter::new(value, checksumPortion))
    }

    #[inline(always)]
    fn isNotA1left(pattern: &FinderPattern, isOddPattern: bool, leftChar: bool) -> bool {
        // A1: pattern.getValue is 0 (A), and it's an oddPattern, and it is a left char
        !(pattern.getValue() == 0 && isOddPattern && leftChar)
    }

    fn adjustOddEvenCounts(&mut self, numModules: u32) -> Result<()> {
        let oddSum = self.oddCounts.iter().sum::<u32>();
        let evenSum = self.evenCounts.iter().sum::<u32>();

        let mut incrementOdd = false;
        let mut decrementOdd = false;

        if oddSum > 13 {
            decrementOdd = true;
        } else if oddSum < 4 {
            incrementOdd = true;
        }
        let mut incrementEven = false;
        let mut decrementEven = false;
        if evenSum > 13 {
            decrementEven = true;
        } else if evenSum < 4 {
            incrementEven = true;
        }

        let mismatch = oddSum as isize + evenSum as isize - numModules as isize;
        let oddParityBad = (oddSum & 0x01) == 1;
        let evenParityBad = (evenSum & 0x01) == 0;
        match mismatch {
            1 => {
                if oddParityBad {
                    if evenParityBad {
                        return Err(Exceptions::NOT_FOUND);
                    }
                    decrementOdd = true;
                } else {
                    if !evenParityBad {
                        return Err(Exceptions::NOT_FOUND);
                    }
                    decrementEven = true;
                }
            }
            -1 => {
                if oddParityBad {
                    if evenParityBad {
                        return Err(Exceptions::NOT_FOUND);
                    }
                    incrementOdd = true;
                } else {
                    if !evenParityBad {
                        return Err(Exceptions::NOT_FOUND);
                    }
                    incrementEven = true;
                }
            }
            0 => {
                if oddParityBad {
                    if !evenParityBad {
                        return Err(Exceptions::NOT_FOUND);
                    }
                    // Both bad
                    if oddSum < evenSum {
                        incrementOdd = true;
                        decrementEven = true;
                    } else {
                        decrementOdd = true;
                        incrementEven = true;
                    }
                } else if evenParityBad {
                    return Err(Exceptions::NOT_FOUND);
                }
            }

            _ => return Err(Exceptions::NOT_FOUND),
        }

        if incrementOdd {
            if decrementOdd {
                return Err(Exceptions::NOT_FOUND);
            }
            Self::increment(&mut self.oddCounts, &self.oddRoundingErrors);
        }
        if decrementOdd {
            Self::decrement(&mut self.oddCounts, &self.oddRoundingErrors);
        }
        if incrementEven {
            if decrementEven {
                return Err(Exceptions::NOT_FOUND);
            }
            Self::increment(&mut self.evenCounts, &self.oddRoundingErrors);
        }
        if decrementEven {
            Self::decrement(&mut self.evenCounts, &self.evenRoundingErrors);
        }

        Ok(())
    }
}

/// Synthetic rows built by an independent encoder (ISO/IEC 24724 Annex B
/// widths, the reader's own element order), so each test places every
/// module and knows every value, checksum portion and finder edge.
#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::*;
    use rxing::common::HybridBinarizer;
    use rxing::{BinaryBitmap, Luma8LuminanceSource};

    /// `n` choose `r`, Annex B's `combins`.
    fn combins(n: i64, r: i64) -> i64 {
        let (min_denom, max_denom) = if n - r > r { (r, n - r) } else { (n - r, r) };
        let (mut val, mut j, mut i) = (1, 1, n);
        while i > max_denom {
            val *= i;
            if j <= min_denom {
                val /= j;
                j += 1;
            }
            i -= 1;
        }
        while j <= min_denom {
            val /= j;
            j += 1;
        }
        val
    }

    /// Annex B `getRSSwidths`: the four widths of RSS value `val` over `n`
    /// modules, none wider than `max_width` — what `getRSSvalue` inverts.
    fn rss_widths(mut val: i64, mut n: i64, max_width: i64, no_narrow: bool) -> [u32; 4] {
        const ELEMENTS: i64 = 4;
        let mut widths = [0; 4];
        let mut narrow_mask = 0;
        for bar in 0..ELEMENTS - 1 {
            narrow_mask |= 1 << bar;
            let mut width = 1;
            let mut sub_val;
            loop {
                sub_val = combins(n - width - 1, ELEMENTS - bar - 2);
                if no_narrow
                    && narrow_mask == 0
                    && n - width - (ELEMENTS - bar - 1) >= ELEMENTS - bar - 1
                {
                    sub_val -= combins(n - width - (ELEMENTS - bar), ELEMENTS - bar - 2);
                }
                if ELEMENTS - bar - 1 > 1 {
                    let mut less_val = 0;
                    let mut widest = n - width - (ELEMENTS - bar - 2);
                    while widest > max_width {
                        less_val += combins(n - width - widest - 1, ELEMENTS - bar - 3);
                        widest -= 1;
                    }
                    sub_val -= less_val * (ELEMENTS - 1 - bar);
                } else if n - width > max_width {
                    sub_val -= 1;
                }
                val -= sub_val;
                if val < 0 {
                    break;
                }
                width += 1;
                narrow_mask &= !(1 << bar);
            }
            val += sub_val;
            n -= width;
            widths[bar as usize] = width as u32;
        }
        widths[3] = n as u32;
        widths
    }

    /// The odd and even module counts of data character `value`: its group,
    /// then the odd and even RSS values its arithmetic combines.
    fn counts(value: u32) -> ([u32; 4], [u32; 4]) {
        let group = (0..5)
            .rev()
            .find(|&g| RSSExpandedReader::GSUM[g] <= value)
            .unwrap();
        let odd_widest = RSSExpandedReader::SYMBOL_WIDEST[group];
        let subset = RSSExpandedReader::EVEN_TOTAL_SUBSET[group];
        let rest = value - RSSExpandedReader::GSUM[group];
        let odd_sum = 12 - 2 * group as i64;
        let odd = rss_widths((rest / subset).into(), odd_sum, odd_widest.into(), true);
        let even = rss_widths(
            (rest % subset).into(),
            17 - odd_sum,
            (9 - odd_widest).into(),
            false,
        );
        // the encoder is the decoder's exact inverse, or nothing below holds
        assert_eq!(
            rss_utils::getRSSvalue(&odd, odd_widest, true),
            rest / subset
        );
        assert_eq!(
            rss_utils::getRSSvalue(&even, 9 - odd_widest, false),
            rest % subset
        );
        (odd, even)
    }

    /// The checksum portion decodeDataCharacter weighs out of `value` read
    /// beside finder `finder` (none for the check character, A1 left).
    fn portion(value: u32, finder: u32, odd_pattern: bool, left: bool) -> u32 {
        if finder == FINDER_PAT_A && odd_pattern && left {
            return 0;
        }
        let row = (4 * finder + if odd_pattern { 0 } else { 2 } + u32::from(!left) - 1) as usize;
        let (odd, even) = counts(value);
        (0..4)
            .map(|i| {
                odd[i] * RSSExpandedReader::WEIGHTS[row][2 * i]
                    + even[i] * RSSExpandedReader::WEIGHTS[row][2 * i + 1]
            })
            .sum()
    }

    /// A character's eight elements left to right, in modules: a left
    /// character is recorded forward, a right one backward.
    fn char_modules(value: u32, left: bool) -> [u32; 8] {
        let (o, e) = counts(value);
        let mut forward = [o[0], e[0], o[1], e[1], o[2], e[2], o[3], e[3]];
        if !left {
            forward.reverse();
        }
        forward
    }

    /// A finder's five elements left to right: an odd pair's reads forward
    /// (white first), an even pair's is mirrored (black first).
    fn finder_modules(value: u32, odd_pattern: bool) -> [u32; 5] {
        let [a, b, c, d] = RSSExpandedReader::FINDER_PATTERNS[value as usize];
        if odd_pattern {
            [a, b, c, d, 1]
        } else {
            [1, d, c, b, a]
        }
    }

    /// One pair of a symbol: left character, right character, finder value.
    #[derive(Clone, Copy)]
    struct Spec {
        left: u32,
        right: Option<u32>,
        finder: u32,
    }

    /// The four data characters of "(01)09506000134352", the BWIPP
    /// regression's GTIN alone: linkage 0, method 1 (AI 01 and other AIs),
    /// two variable-length bits, the first digit 0, then 950 600 013 435 in
    /// ten bits each — 48 bits, twelve per character.
    const GTIN_DATA: [u32; 4] = [1038, 3493, 2051, 1459];
    const GTIN_TEXT: &str = "(01)09506000134352";

    /// That symbol: three pairs on finders A1 B2 B1 (the second legal
    /// sequence), the last without a right character, and the check
    /// character, 211 * (5 - 4) plus the data's weighted sum mod 211.
    fn gtin_symbol() -> [Spec; 3] {
        let [d1, d2, d3, d4] = GTIN_DATA;
        let (a, b) = (FINDER_PAT_A, FINDER_PAT_B);
        let sum = portion(d1, a, true, false)
            + portion(d2, b, false, true)
            + portion(d3, b, false, false)
            + portion(d4, b, true, true);
        [
            Spec {
                left: 211 + sum % 211,
                right: Some(d1),
                finder: a,
            },
            Spec {
                left: d2,
                right: Some(d3),
                finder: b,
            },
            Spec {
                left: d4,
                right: None,
                finder: b,
            },
        ]
    }

    const QUIET: u32 = 12;

    /// The run widths in modules — a white quiet zone first, then
    /// alternating — of `pairs` placed from symbol pair index `first`, and
    /// the module where each finder begins.
    fn layout(pairs: &[Spec], first: usize) -> (Vec<u32>, Vec<u32>) {
        let mut runs = vec![QUIET];
        if first % 2 == 0 {
            runs.push(1); // the guard bar before an odd pair's leading space
        }
        let mut finders = Vec::new();
        for (i, pair) in pairs.iter().enumerate() {
            runs.extend(char_modules(pair.left, true));
            finders.push(runs.iter().sum());
            runs.extend(finder_modules(pair.finder, (first + i) % 2 == 0));
            if let Some(right) = pair.right {
                runs.extend(char_modules(right, false));
            }
        }
        if runs.len() % 2 == 1 {
            runs.push(1); // a guard bar after a trailing space
        }
        runs.push(QUIET);
        (runs, finders)
    }

    /// A row of `runs` pixels, white first.
    fn bits(runs: &[u32]) -> BitArray {
        let mut row = BitArray::with_size(runs.iter().sum::<u32>() as usize);
        let mut x = 0;
        for (i, &run) in runs.iter().enumerate() {
            for _ in 0..run {
                if i % 2 == 1 {
                    row.set(x);
                }
                x += 1;
            }
        }
        row
    }

    /// `pairs` drawn one pixel per module, and where each finder begins.
    fn symbol_row(pairs: &[Spec], first: usize) -> (BitArray, Vec<u32>) {
        let (runs, finders) = layout(pairs, first);
        (bits(&runs), finders)
    }

    /// The characters a decoded pair should hold, from the encoder.
    fn expected(spec: Spec, index: usize) -> (Option<DataCharacter>, Option<DataCharacter>) {
        let odd = index % 2 == 0;
        let character =
            |value, left| DataCharacter::new(value, portion(value, spec.finder, odd, left));
        (
            Some(character(spec.left, true)),
            spec.right.map(|right| character(right, false)),
        )
    }

    /// A pair's characters, finder value and finder edges.
    type Seen = (
        (Option<DataCharacter>, Option<DataCharacter>),
        u32,
        [usize; 2],
    );

    /// What a pair holds, as a comparable value.
    fn seen(pair: &ExpandedPair) -> Seen {
        let finder = pair.getFinderPattern().as_ref().unwrap();
        let &[start, end] = finder.getStartEnd() else {
            unreachable!()
        };
        (
            (*pair.getLeftChar(), *pair.getRightChar()),
            finder.getValue(),
            [start, end],
        )
    }

    /// A stored pair: characters without portions, finder `finder`.
    fn pair(left: u32, right: Option<u32>, finder: u32) -> ExpandedPair {
        ExpandedPair::new(
            Some(DataCharacter::new(left, 0)),
            right.map(|value| DataCharacter::new(value, 0)),
            Some(FinderPattern::new(finder, [0, 15], 0, 15, 0)),
        )
    }

    /// `row` drawn vertically, `width` pixels wide, read top to bottom or
    /// bottom to top.
    fn vertical(
        row: &BitArray,
        width: usize,
        bottom_up: bool,
    ) -> BinaryBitmap<HybridBinarizer<Luma8LuminanceSource>> {
        let length = row.get_size();
        let mut luma = Vec::with_capacity(length * width);
        for y in 0..length {
            let x = if bottom_up { length - 1 - y } else { y };
            luma.extend(std::iter::repeat_n(if row.get(x) { 0 } else { 255 }, width));
        }
        let source = Luma8LuminanceSource::new(luma, width as u32, length as u32).unwrap();
        BinaryBitmap::new(HybridBinarizer::new(source))
    }

    /// The four result points as (x, y).
    fn points(result: &RXingResult) -> Vec<(f32, f32)> {
        result.getPoints().iter().map(|p| (p.x, p.y)).collect()
    }

    fn orientation(result: &RXingResult) -> Option<i32> {
        match result
            .getRXingResultMetadata()
            .get(&RXingResultMetadataType::ORIENTATION)
        {
            Some(RXingResultMetadataValue::Orientation(degrees)) => Some(*degrees),
            _ => None,
        }
    }

    /// A clean one-row symbol: its three pairs read in order, the check
    /// character and the whole finder sequence accept them at once (nothing
    /// is stored for stacking), and the points span its outer finders.
    #[test]
    fn a_one_row_symbol_reads_its_element_string_between_its_outer_finders() {
        let symbol = gtin_symbol();
        let (row, finders) = symbol_row(&symbol, 0);
        assert_eq!((finders, row.get_size()), (vec![30, 79, 128], 156));
        let mut reader = RSSExpandedReader::new();
        let pairs = reader.decodeRow2pairs(7, &row).unwrap();
        let found: Vec<_> = pairs.iter().map(seen).collect();
        let edges = [[30, 45], [79, 94], [128, 143]];
        let want: Vec<_> = (0..3)
            .map(|i| (expected(symbol[i], i), symbol[i].finder, edges[i]))
            .collect();
        assert_eq!(found, want);
        let result = reader.decode_row(7, &row, &DecodeHints::default()).unwrap();
        assert_eq!(result.getText(), GTIN_TEXT);
        assert_eq!(result.getBarcodeFormat(), &BarcodeFormat::RSS_EXPANDED);
        assert_eq!(
            points(&result),
            [(30., 7.), (45., 7.), (128., 7.), (143., 7.)]
        );
        assert!(matches!(
            result
                .getRXingResultMetadata()
                .get(&RXingResultMetadataType::SYMBOLOGY_IDENTIFIER),
            Some(RXingResultMetadataValue::SymbologyIdentifier(id)) if id == "]e0"
        ));
        assert!(reader.rows.is_empty());
    }

    /// Stacked rows A1 B2 | B1: the first row alone fails its check and is
    /// stored; the second completes the symbol from the stored row, in
    /// order, each point keeping the row it was measured on.
    #[test]
    fn a_stacked_symbol_is_assembled_from_its_stored_rows() {
        let symbol = gtin_symbol();
        let (top, _) = symbol_row(&symbol[..2], 0);
        let (bottom, finders) = symbol_row(&symbol[2..], 2);
        assert_eq!(finders, [30]);
        let hints = DecodeHints::default();
        let mut reader = RSSExpandedReader::new();
        assert_eq!(
            reader.decode_row(10, &top, &hints).err(),
            Some(Exceptions::NOT_FOUND)
        );
        let stored: Vec<_> = reader
            .getRows()
            .iter()
            .map(|r| (r.getRowNumber(), r.getPairs().len()))
            .collect();
        assert_eq!(stored, [(10, 2)]);
        let result = reader.decode_row(11, &bottom, &hints).unwrap();
        assert_eq!(result.getText(), GTIN_TEXT);
        assert_eq!(
            points(&result),
            [(30., 10.), (45., 10.), (30., 11.), (45., 11.)]
        );
    }

    /// Stacked rows A1 | B2 B1: the second row starts on an even pair, which
    /// only the retry from an even finder reads (finder mirrored, its
    /// characters weighed as an even pair's).
    #[test]
    fn a_stacked_row_starting_on_an_even_pair_is_read_by_the_even_retry() {
        let symbol = gtin_symbol();
        let (top, _) = symbol_row(&symbol[..1], 0);
        let (bottom, finders) = symbol_row(&symbol[1..], 1);
        assert_eq!(finders, [29, 78]);
        let hints = DecodeHints::default();
        let mut reader = RSSExpandedReader::new();
        assert_eq!(
            reader.decode_row(20, &top, &hints).err(),
            Some(Exceptions::NOT_FOUND)
        );
        let result = reader.decode_row(21, &bottom, &hints).unwrap();
        assert_eq!(result.getText(), GTIN_TEXT);
        assert_eq!(
            points(&result),
            [(30., 20.), (45., 20.), (78., 21.), (93., 21.)]
        );
        // the row's own pairs, before any stacking
        let mut alone = RSSExpandedReader::new();
        alone.startFromEven = true;
        assert!(alone.decodeRow2pairs(21, &bottom).is_err());
        let got: Vec<_> = alone.pairs.iter().map(seen).collect();
        assert_eq!(
            got,
            [
                (expected(symbol[1], 1), FINDER_PAT_B, [29, 44]),
                (expected(symbol[2], 2), FINDER_PAT_B, [78, 93])
            ]
        );
    }

    /// The reader keeps rows across calls for stacking; reset forgets them,
    /// so a later image never completes a symbol with an earlier one's row.
    #[test]
    fn after_reset_a_stored_row_no_longer_completes_a_symbol() {
        let symbol = gtin_symbol();
        let (top, _) = symbol_row(&symbol[..2], 0);
        let (bottom, _) = symbol_row(&symbol[2..], 2);
        let hints = DecodeHints::default();
        let mut reader = RSSExpandedReader::new();
        assert!(reader.decode_row(10, &top, &hints).is_err());
        reader.reset();
        assert!(reader.rows.is_empty() && reader.pairs.is_empty());
        assert_eq!(
            reader.decode_row(11, &bottom, &hints).err(),
            Some(Exceptions::NOT_FOUND)
        );
    }

    fn try_harder() -> DecodeHints {
        DecodeHints {
            TryHarder: Some(true),
            ..Default::default()
        }
    }

    /// Printed reading top to bottom, the symbol leaves the upright pass
    /// uniform rows; the TryHarder pass reads it rotated a quarter turn
    /// counter-clockwise, reports 270° and maps every point back: the
    /// rotated middle row 5 is image column 10 - 5 - 1.
    #[test]
    fn a_vertical_symbol_is_read_rotated_with_its_points_in_the_image_frame() {
        let (row, _) = symbol_row(&gtin_symbol(), 0);
        let mut image = vertical(&row, 10, false);
        let result = RSSExpandedReader::new()
            .decode_with_hints(&mut image, &try_harder())
            .unwrap();
        assert_eq!(result.getText(), GTIN_TEXT);
        assert_eq!(orientation(&result), Some(270));
        assert_eq!(
            points(&result),
            [(4., 30.), (4., 45.), (4., 128.), (4., 143.)]
        );
    }

    /// Printed reading bottom to top, the rotated image holds the symbol
    /// upside down: the reversed row reads it at 180°, added to the
    /// rotation's 270° modulo a full turn; the first finder's edges come back
    /// flipped along the image column.
    #[test]
    fn an_upside_down_rotated_read_adds_its_half_turn_modulo_a_full_turn() {
        let (row, _) = symbol_row(&gtin_symbol(), 0);
        let mut image = vertical(&row, 10, true);
        let result = RSSExpandedReader::new()
            .decode_with_hints(&mut image, &try_harder())
            .unwrap();
        assert_eq!(result.getText(), GTIN_TEXT);
        assert_eq!(orientation(&result), Some(90));
        assert_eq!(points(&result)[..2], [(4., 125.), (4., 110.)]);
    }

    /// The rotated pass is TryHarder's alone.
    #[test]
    fn without_try_harder_a_vertical_symbol_is_not_found() {
        let (row, _) = symbol_row(&gtin_symbol(), 0);
        let mut image = vertical(&row, 10, false);
        let found = RSSExpandedReader::new().decode_with_hints(&mut image, &DecodeHints::default());
        assert_eq!(found.err(), Some(Exceptions::NOT_FOUND));
    }

    /// The left character's value of each stored row, with its number.
    fn stored(reader: &RSSExpandedReader) -> Vec<(u32, u32)> {
        let left = |row: &ExpandedRow| row.getPairs()[0].getLeftChar().unwrap().getValue();
        reader
            .rows
            .iter()
            .map(|row| (row.getRowNumber(), left(row)))
            .collect()
    }

    /// storeRow files each new row by row number, after the rows of the same
    /// number (decode_row stores one row twice, from odd then even finders).
    #[test]
    fn rows_are_stored_by_row_number_after_their_equals() {
        let mut reader = RSSExpandedReader::new();
        reader.rows = vec![ExpandedRow::new(vec![pair(1, Some(2), FINDER_PAT_A)], 5)];
        for (left, finder, number) in [
            (3, FINDER_PAT_B, 3),
            (5, FINDER_PAT_C, 9),
            (7, FINDER_PAT_D, 5),
        ] {
            reader.pairs = vec![pair(left, Some(left + 1), finder)];
            reader.storeRow(number);
        }
        assert_eq!(stored(&reader), [(3, 3), (5, 1), (5, 7), (9, 5)]);
    }

    /// A row equal to a stored one, or contained in one, adds nothing; a row
    /// containing stored shorter rows replaces them.
    #[test]
    fn repeated_or_partial_rows_are_not_stored_and_containing_rows_replace_them() {
        let (a, b, c) = (
            pair(1, Some(2), FINDER_PAT_A),
            pair(3, Some(4), FINDER_PAT_B),
            pair(5, None, FINDER_PAT_B),
        );
        let mut reader = RSSExpandedReader::new();
        reader.rows = vec![ExpandedRow::new(vec![a.clone(), b.clone()], 5)];
        for (pairs, number) in [(vec![a.clone(), b.clone()], 6), (vec![b.clone()], 7)] {
            reader.pairs = pairs;
            reader.storeRow(number);
        }
        assert_eq!(stored(&reader), [(5, 1)]);
        reader.pairs = vec![c.clone()];
        reader.storeRow(8);
        assert_eq!(stored(&reader), [(5, 1), (8, 5)]);
        reader.pairs = vec![a, b, c];
        reader.storeRow(9);
        assert_eq!(stored(&reader), [(9, 1)]);
        assert_eq!(reader.rows[0].getPairs().len(), 3);
    }

    /// Equivalence is pair-for-pair equality, in order.
    #[test]
    fn a_row_is_equivalent_to_its_own_pairs_only_and_keeps_its_number() {
        let (a, b) = (
            pair(1, Some(2), FINDER_PAT_A),
            pair(3, Some(4), FINDER_PAT_B),
        );
        let row = ExpandedRow::new(vec![a.clone(), b.clone()], 42);
        assert_eq!(row.getRowNumber(), 42);
        assert!(row.isEquivalent(&[a.clone(), b.clone()]));
        assert!(!row.isEquivalent(&[b.clone(), a.clone()]));
        assert!(!row.isEquivalent(&[a]));
    }

    /// Partial: one stored row holds every pair — not pairs spread across rows.
    #[test]
    fn a_row_is_partial_only_when_one_stored_row_holds_all_its_pairs() {
        let (a, b, c) = (
            pair(1, Some(2), FINDER_PAT_A),
            pair(3, Some(4), FINDER_PAT_B),
            pair(5, None, FINDER_PAT_B),
        );
        let rows = [
            ExpandedRow::new(vec![a.clone(), b.clone()], 1),
            ExpandedRow::new(vec![c.clone()], 2),
        ];
        let partial = RSSExpandedReader::isPartialRow;
        assert!(partial(&[b.clone()], &rows));
        assert!(partial(&[a.clone(), b.clone()], &rows));
        assert!(!partial(&[b, c], &rows));
        // a row holding none of the pairs holds no part of them
        assert!(!partial(&[a.clone()], &rows[1..]));
        assert!(!partial(&[a], &[]));
    }

    /// The check character is 211 * (characters - 4) plus the other
    /// characters' portions mod 211; any other value is refused. Four, five
    /// and six characters each carry their own multiple of 211.
    #[test]
    fn the_check_character_must_equal_the_weighted_sum_of_the_others() {
        let character = DataCharacter::new;
        let finder = || Some(FinderPattern::new(FINDER_PAT_A, [0, 15], 0, 15, 0));
        // after the check character, portions 100, 150, 7, 80, then 1
        let symbol = |check, characters| {
            let mut pairs = vec![
                ExpandedPair::new(Some(character(check, 0)), Some(character(9, 100)), finder()),
                ExpandedPair::new(Some(character(9, 150)), Some(character(9, 7)), finder()),
                ExpandedPair::new(Some(character(9, 80)), Some(character(9, 1)), finder()),
            ];
            match characters {
                4 => pairs.truncate(2),
                5 => pairs[2] = ExpandedPair::new(Some(character(9, 80)), None, finder()),
                _ => {}
            }
            pairs
        };
        let mut reader = RSSExpandedReader::new();
        // 257 ≡ 46, 337 ≡ 126 and 338 ≡ 127 (mod 211)
        for (characters, check, valid) in [
            (4, 46, true),
            (4, 47, false),
            (4, 211 + 46, false),
            (5, 211 + 126, true),
            (5, 211 + 125, false),
            (5, 126, false),
            (6, 422 + 127, true),
            (6, 422 + 128, false),
            (6, 211 + 127, false),
        ] {
            reader.pairs = symbol(check, characters);
            assert_eq!(reader.checkChecksum(), valid, "{characters}: {check}");
        }
        reader.pairs.clear();
        assert!(!reader.checkChecksum());
    }

    /// Finder values must follow one of the ten legal sequences: exactly,
    /// for a complete symbol, or as a prefix while rows are assembled.
    #[test]
    fn finder_sequences_match_a_legal_one_whole_or_as_a_prefix() {
        let (a, b, c, d) = (FINDER_PAT_A, FINDER_PAT_B, FINDER_PAT_C, FINDER_PAT_D);
        let (e, f) = (FINDER_PAT_E, FINDER_PAT_F);
        let valid = |finders: &[u32], complete| {
            let pairs: Vec<_> = finders.iter().map(|&v| pair(1, Some(1), v)).collect();
            RSSExpandedReader::isValidSequence(&pairs, complete)
        };
        assert!(valid(&[a], false));
        assert!(valid(&[a, b], false));
        assert!(!valid(&[a, b], true));
        assert!(valid(&[a, b, b], true));
        assert!(valid(&[a, a, b, b, c, d, d, e, e, f, f], true));
        assert!(!valid(&[a, a, b, b, c, d, d, e, e, f, f, f], false));
        // the regression fixture's order, legal in no sequence
        assert!(!valid(&[a, c, f, d], false));
        assert!(!valid(&[b], false));
    }

    /// The data bits are the characters after the check character, twelve
    /// bits each, most significant first; a last pair without a right
    /// character adds none.
    #[test]
    fn the_data_bits_are_twelve_per_character_after_the_check_character() {
        let symbol = gtin_symbol();
        let pairs: Vec<_> = symbol
            .iter()
            .map(|s| pair(s.left, s.right, s.finder))
            .collect();
        let text = |bits: BitArray| -> String {
            (0..bits.get_size())
                .map(|i| if bits.get(i) { '1' } else { '0' })
                .collect()
        };
        let data = bit_array_builder::buildBitArray(&pairs).unwrap();
        let gtin = format!(
            "0100{:04b}{:010b}{:010b}{:010b}{:010b}",
            0, 950, 600, 13, 435
        );
        assert_eq!(text(data), gtin);
        let two = bit_array_builder::buildBitArray(&pairs[..2]).unwrap();
        assert_eq!(text(two), &gtin[..36]);
    }

    /// Diagnostics print a character as value(portion), a row as its pairs.
    #[test]
    fn characters_and_rows_print_their_contents() {
        assert_eq!(DataCharacter::new(1038, 47).to_string(), "1038(47)");
        let row = ExpandedRow::new(vec![pair(1, None, FINDER_PAT_C)], 3);
        assert_eq!(
            row.to_string(),
            "{ [ Some(DataCharacter { value: 1, checksumPortion: 0 }) , None : 2 ] }"
        );
    }

    /// 1038 (odd 3 1 4 2, even 2 1 1 3) and 4000 (odd 1 1 1 1, even 1 2 8 2,
    /// an eight-module element): each module count, left to right.
    const D1: [u32; 8] = [3, 2, 1, 1, 4, 1, 2, 3];
    const WIDE: [u32; 8] = [1, 1, 1, 2, 1, 8, 1, 2];

    /// A left character of `elements` pixels (white first, after a guard
    /// bar) where a B finder of `finder_width` pixels begins.
    fn left_character(elements: [u32; 8], finder_width: usize) -> (BitArray, FinderPattern) {
        let mut runs = vec![10, 10];
        runs.extend(elements);
        let start = runs.iter().sum::<u32>() as usize;
        runs.push(20);
        let end = start + finder_width;
        (
            bits(&runs),
            FinderPattern::new(FINDER_PAT_B, [start, end], start, end, 0),
        )
    }

    /// That character read as an odd pair's left one.
    fn read_left(elements: [u32; 8], finder_width: usize) -> Result<DataCharacter> {
        let (row, finder) = left_character(elements, finder_width);
        RSSExpandedReader::new().decodeDataCharacter(&row, &finder, true, true)
    }

    /// The character's module must match the finder's within 30%, bound
    /// included: 7-pixel modules beside a 150-pixel finder are exactly 30%
    /// off, a 151-pixel finder puts them past it.
    #[test]
    fn a_character_module_within_thirty_percent_of_the_finders_is_read() {
        let at_seven = D1.map(|m| m * 7);
        assert_eq!(read_left(at_seven, 150), Ok(DataCharacter::new(1038, 1837)));
        assert_eq!(read_left(at_seven, 151), Err(Exceptions::NOT_FOUND));
        assert_eq!(
            read_left(D1.map(|m| m * 10), 150),
            Ok(DataCharacter::new(1038, 1837))
        );
    }

    /// Ten-pixel modules (170 pixels): a narrow element down to 0.3 module
    /// rounds up to one, below 0.3 it is refused. The pixels the narrow
    /// elements lose sit where rounding keeps every other count.
    #[test]
    fn a_narrow_element_down_to_three_tenths_of_a_module_counts_as_one() {
        let narrow = [34, 21, 3, 4, 44, 10, 20, 34];
        assert_eq!(read_left(narrow, 150), Ok(DataCharacter::new(1038, 1837)));
        let too_narrow = [34, 20, 2, 10, 44, 10, 20, 30];
        assert_eq!(read_left(too_narrow, 150), Err(Exceptions::NOT_FOUND));
    }

    /// A wide element up to 8.7 modules counts as eight, past it the
    /// character is refused.
    #[test]
    fn a_wide_element_up_to_eight_point_seven_modules_counts_as_eight() {
        let clean = WIDE.map(|m| m * 10);
        assert_eq!(read_left(clean, 150), Ok(DataCharacter::new(4000, 1521)));
        let wide = [10, 10, 10, 16, 10, 87, 10, 17];
        assert_eq!(read_left(wide, 150), Ok(DataCharacter::new(4000, 1521)));
        let too_wide = [10, 10, 10, 16, 10, 88, 10, 16];
        assert_eq!(read_left(too_wide, 150), Err(Exceptions::NOT_FOUND));
    }

    /// Odd 14 and even 4 (18 modules) each lose a module to the repair,
    /// which leaves an odd sum of 13: refused, never valued.
    #[test]
    fn a_character_left_with_an_odd_sum_by_its_repair_is_refused() {
        let elements = [5, 1, 5, 1, 2, 1, 2, 1].map(|m| m * 17);
        let (row, finder) = left_character(elements, 270);
        let mut reader = RSSExpandedReader::new();
        let read = reader.decodeDataCharacter(&row, &finder, true, true);
        assert_eq!(read, Err(Exceptions::NOT_FOUND));
        assert_eq!(
            (reader.oddCounts, reader.evenCounts),
            ([4, 5, 2, 2], [0, 1, 1, 1])
        );
    }

    /// adjustOddEvenCounts with rounding errors whose extremes sit at
    /// opposite ends — the odd ones peak at index 3 and bottom at 0, the even
    /// ones the other way round — so every repair shows which errors it
    /// weighed: an increment lands on the largest error, a decrement on the
    /// smallest. An odd increment lands on index 3, an odd decrement on 0, an
    /// even decrement on 3; an even increment weighs the ODD errors, as
    /// upstream ZXing does, and lands on 3 where the even ones would pick 0.
    fn adjusted(odd: [u32; 4], even: [u32; 4]) -> Option<([u32; 4], [u32; 4])> {
        let mut reader = RSSExpandedReader::new();
        (reader.oddCounts, reader.evenCounts) = (odd, even);
        reader.oddRoundingErrors = [-0.4, -0.1, 0.1, 0.4];
        reader.evenRoundingErrors = [0.3, -0.2, 0.2, -0.3];
        reader.adjustOddEvenCounts(17).ok()?;
        Some((reader.oddCounts, reader.evenCounts))
    }

    /// The parity repair moves one module toward an even odd sum, an odd
    /// even sum and 17 in all; two modules off is refused.
    #[test]
    fn the_parity_repair_moves_one_module_toward_legal_sums() {
        let unchanged = ([1, 1, 1, 1], [8, 2, 2, 1]);
        assert_eq!(adjusted(unchanged.0, unchanged.1), Some(unchanged));
        // one module short: the side with the wrong parity grows (the even
        // side by the odd errors: index 3, not the even errors' index 0)
        assert_eq!(
            adjusted([3, 3, 3, 3], [1, 1, 1, 1]),
            Some(([3, 3, 3, 3], [1, 1, 1, 2]))
        );
        assert_eq!(
            adjusted([3, 3, 3, 2], [2, 1, 1, 1]),
            Some(([3, 3, 3, 3], [2, 1, 1, 1]))
        );
        // both parities wrong at 17: the smaller side grows, the larger shrinks
        assert_eq!(
            adjusted([4, 3, 3, 3], [1, 1, 1, 1]),
            Some(([3, 3, 3, 3], [1, 1, 1, 2]))
        );
        assert_eq!(
            adjusted([1, 1, 1, 2], [4, 3, 3, 2]),
            Some(([1, 1, 1, 3], [4, 3, 3, 1]))
        );
        assert_eq!(adjusted([3, 3, 3, 3], [2, 2, 2, 1]), None);
    }

    /// The range repairs are strict: an odd sum of 13 and an even sum of 4
    /// are in range, only past them does a side shrink or grow (the zero
    /// count no row produces probes the function's own table).
    #[test]
    fn the_range_repairs_start_past_thirteen_and_below_four() {
        // odd 14 shrinks; the wrong even parity of 4 shrinks the even side
        assert_eq!(
            adjusted([5, 4, 3, 2], [1, 1, 1, 1]),
            Some(([4, 4, 3, 2], [1, 1, 1, 0]))
        );
        // odd 13, one short with its parity wrong, grows; even 3 grows
        assert_eq!(
            adjusted([4, 3, 3, 3], [1, 1, 1, 0]),
            Some(([4, 3, 3, 4], [1, 1, 1, 1]))
        );
    }

    /// One finder between quiet zones: an odd pair's after a guard bar and
    /// before a closing bar, or an even pair's, mirrored.
    fn lone_finder(value: u32, odd_pattern: bool) -> BitArray {
        let mut runs = vec![12];
        if odd_pattern {
            runs.push(1);
        }
        runs.extend(finder_modules(value, odd_pattern));
        if odd_pattern {
            runs.push(5);
        }
        runs.push(12);
        bits(&runs)
    }

    /// The search skips the quiet zone, then slides bar by bar until four
    /// elements (an odd finder's 2 to 5) have a finder's proportions.
    #[test]
    fn the_finder_search_skips_the_quiet_zone_and_records_elements_two_to_five() {
        let row = lone_finder(FINDER_PAT_A, true);
        let mut reader = RSSExpandedReader::new();
        assert_eq!(reader.findNextPair(&row, &[], -1), Ok(()));
        assert_eq!(
            (reader.startEnd, reader.decodeFinderCounters),
            ([14, 28], [8, 4, 1, 1])
        );
        // forced onto that bar, the search starts there
        reader.startEnd = [0, 0];
        assert_eq!(reader.findNextPair(&row, &[], 14), Ok(()));
        assert_eq!(reader.startEnd, [14, 28]);
    }

    /// An odd finder's first element is the space before the window.
    #[test]
    fn an_odd_finder_takes_its_first_element_from_the_space_before_the_window() {
        let row = lone_finder(FINDER_PAT_A, true);
        let mut reader = RSSExpandedReader::new();
        reader.findNextPair(&row, &[], -1).unwrap();
        let finder = reader.parseFoundFinderPattern(&row, 3, true, &[]).unwrap();
        assert_eq!(
            (finder.getValue(), finder.getStartEnd()),
            (FINDER_PAT_A, &[13, 28][..])
        );
        let at: Vec<_> = finder.getPoints().iter().map(|p| (p.x, p.y)).collect();
        assert_eq!(at, [(13., 3.), (28., 3.)]);
    }

    /// An even search matches the window mirrored, and its finder's first
    /// element is the bar after the window.
    #[test]
    fn an_even_finder_is_matched_mirrored_with_its_first_element_after_the_window() {
        let row = lone_finder(FINDER_PAT_B, false);
        let mut reader = RSSExpandedReader::new();
        reader.startFromEven = true;
        reader.findNextPair(&row, &[], -1).unwrap();
        assert_eq!(
            (reader.startEnd, reader.decodeFinderCounters),
            ([12, 24], [6, 4, 1, 1])
        );
        let finder = reader.parseFoundFinderPattern(&row, 3, false, &[]).unwrap();
        assert_eq!(
            (finder.getValue(), finder.getStartEnd()),
            (FINDER_PAT_B, &[12, 27][..])
        );
    }

    /// No finder past the last bar: a search forced to the row's end (the
    /// next bar after a rejected candidate there) or beyond finds nothing.
    /// The row fills two storage words, so its end is a word boundary.
    #[test]
    fn a_search_from_the_row_end_or_beyond_finds_nothing() {
        let row = bits(&[12, 1, 1, 8, 4, 1, 1, 5, 95]);
        assert_eq!(row.get_size(), 128);
        let mut reader = RSSExpandedReader::new();
        for offset in [128, 140] {
            let found = reader.findNextPair(&row, &[], offset);
            assert_eq!(found, Err(Exceptions::NOT_FOUND), "{offset}");
        }
        let blank = bits(&[128]);
        assert_eq!(
            reader.findNextPair(&blank, &[], -1),
            Err(Exceptions::NOT_FOUND)
        );
    }

    /// The previous pair as decoded from A1 at modules 30..45.
    fn after_a1(right: Option<DataCharacter>) -> [ExpandedPair; 1] {
        let a1 = FinderPattern::new(FINDER_PAT_A, [30, 45], 30, 45, 7);
        [ExpandedPair::new(
            Some(DataCharacter::new(223, 0)),
            right,
            Some(a1),
        )]
    }

    /// Two 17-module characters lie between consecutive finders: a
    /// finder-shaped run inside them (here a perfect A, mirrored, three
    /// modules past A1) is passed over and the search goes on to B2.
    #[test]
    fn an_internal_finder_too_close_to_the_previous_one_is_passed_over() {
        let symbol = gtin_symbol();
        let (mut runs, _) = layout(&symbol[..2], 0);
        // A1's right character becomes B2 S1 B1 S1 B4 S8: still 17 modules
        runs.splice(15..23, [2, 1, 1, 1, 4, 8]);
        let row = bits(&runs);
        let previous = after_a1(Some(DataCharacter::new(1038, 824)));
        let mut reader = RSSExpandedReader::new();
        reader.findNextPair(&row, &previous, -1).unwrap();
        assert_eq!(reader.startEnd, [48, 62]);
        let candidate = reader.parseFoundFinderPattern(&row, 7, false, &[]).unwrap();
        assert_eq!(
            (candidate.getValue(), candidate.getStartEnd()),
            (FINDER_PAT_A, &[48, 63][..])
        );
        assert!(
            reader
                .parseFoundFinderPattern(&row, 7, false, &previous)
                .is_none()
        );
        let next = reader.retrieveNextPair(&row, &previous, 7).unwrap();
        assert_eq!(
            seen(&next),
            (expected(symbol[1], 1), FINDER_PAT_B, [79, 94])
        );
    }

    /// A pair without a right character ends the symbol: the next finder is
    /// read, but no pair follows it.
    #[test]
    fn no_pair_follows_a_pair_without_a_right_character() {
        let symbol = gtin_symbol();
        let (row, _) = symbol_row(&symbol, 0);
        let mut reader = RSSExpandedReader::new();
        let next = reader.retrieveNextPair(&row, &after_a1(Some(DataCharacter::new(1038, 824))), 7);
        assert_eq!(
            seen(&next.unwrap()),
            (expected(symbol[1], 1), FINDER_PAT_B, [79, 94])
        );
        let last = reader.retrieveNextPair(&row, &after_a1(None), 7);
        assert_eq!(last.err(), Some(Exceptions::NOT_FOUND));
    }

    /// A row's first pair is searched from its first pixel: a mirrored A
    /// there is found though no character fits before it, and the pair is
    /// refused, where a search from the second pixel would reach B2.
    #[test]
    fn a_first_pair_is_searched_from_the_first_pixel_of_its_row() {
        let symbol = gtin_symbol();
        let (mut runs, _) = layout(&symbol[1..], 1);
        runs.splice(0..0, [0, 1, 1, 4, 8, 1]);
        let row = bits(&runs);
        let mut reader = RSSExpandedReader::new();
        reader.startFromEven = true;
        let first = reader.retrieveNextPair(&row, &[], 5);
        assert_eq!(
            (first.err(), reader.startEnd),
            (Some(Exceptions::NOT_FOUND), [0, 14])
        );
    }

    /// After a rejected candidate the search resumes at the second edge from
    /// the candidate's start: past its bar and the space after it, or past
    /// its space and the bar after it.
    #[test]
    fn the_search_resumes_two_edges_after_a_rejected_candidate() {
        // white 0..3, black 3..5, white 5..9, black 9, white 10..15
        let row = bits(&[3, 2, 4, 1, 5]);
        assert_eq!(RSSExpandedReader::getNextSecondBar(&row, 3), 9);
        assert_eq!(RSSExpandedReader::getNextSecondBar(&row, 6), 10);
    }

    /// The next finder starts two characters (34 modules) after the previous
    /// one ends, within 10% either way, both bounds included: after a
    /// 75-pixel finder (five pixels a module), 153 to 187 pixels after it.
    #[test]
    fn the_next_finder_starts_two_characters_after_the_previous_within_ten_percent() {
        let previous = [ExpandedPair::new(
            Some(DataCharacter::new(223, 0)),
            Some(DataCharacter::new(1038, 824)),
            Some(FinderPattern::new(FINDER_PAT_A, [10, 85], 10, 85, 7)),
        )];
        for (start, kept) in [(237, false), (238, true), (272, true), (273, false)] {
            // an even B finder, mirrored, one pixel a module, at `start`
            let row = bits(&[start, 1, 1, 4, 6, 3, 12]);
            let mut reader = RSSExpandedReader::new();
            reader.findNextPair(&row, &previous, -1).unwrap();
            assert_eq!(reader.startEnd, [start, start + 12], "{start}");
            let found = reader.parseFoundFinderPattern(&row, 7, false, &previous);
            let edges = found.map(|f| (f.getValue(), f.getStartEnd().to_vec()));
            let at = start as usize;
            assert_eq!(
                edges,
                kept.then(|| (FINDER_PAT_B, vec![at, at + 15])),
                "{start}"
            );
        }
    }

    /// A module count one off is repaired on the element whose pixels were
    /// rounded up the most (the largest negative rounding error): odd 11
    /// with even 7 loses it on the odd 4.6, odd 10 with even 8 on the even
    /// 3.5 — both reads come back to 1038, as from clean modules.
    #[test]
    fn a_surplus_module_comes_off_the_element_rounded_up_the_most() {
        // odd 2.8 1.0 4.6 1.8, even 1.8 1.0 1.0 3.0 (ten-pixel modules)
        let odd_surplus = [28, 18, 10, 10, 46, 10, 18, 30];
        // odd 2.9 1.0 3.9 1.9, even 2.0 0.8 1.0 3.5
        let even_surplus = [29, 20, 10, 8, 39, 10, 19, 35];
        for elements in [odd_surplus, even_surplus] {
            let read = read_left(elements, 150);
            assert_eq!(read, Ok(DataCharacter::new(1038, 1837)), "{elements:?}");
        }
    }

    /// Every character contributes its twelve bits, most significant first,
    /// bit 11 included: the first data character (4095), then a later
    /// pair's left (2048) and right (3071). All three set bit 11 on purpose:
    /// a loop stuck on that bit then indexes past the one storage word of
    /// this 36-bit array at once instead of spinning, which is why the
    /// nextest configuration runs this check before any symbol read.
    #[test]
    fn each_character_contributes_twelve_bits_from_bit_eleven() {
        let pairs = [
            pair(5, Some(4095), FINDER_PAT_A),
            pair(2048, Some(3071), FINDER_PAT_B),
        ];
        let data = bit_array_builder::buildBitArray(&pairs).unwrap();
        let text: String = (0..data.get_size())
            .map(|i| if data.get(i) { '1' } else { '0' })
            .collect();
        assert_eq!(text, format!("{:012b}{:012b}{:012b}", 4095, 2048, 3071));
    }

    /// Rows compare and hash by their pairs in order, whatever their numbers.
    #[test]
    fn rows_compare_and_hash_by_their_pairs_in_order() {
        use std::hash::{BuildHasher, BuildHasherDefault, DefaultHasher};
        let (a, b) = (
            pair(1, Some(2), FINDER_PAT_A),
            pair(3, Some(4), FINDER_PAT_B),
        );
        let row = ExpandedRow::new(vec![a.clone(), b.clone()], 1);
        let renumbered = ExpandedRow::new(vec![a.clone(), b.clone()], 2);
        let swapped = ExpandedRow::new(vec![b, a], 1);
        assert!(row == renumbered);
        assert!(row != swapped);
        let hash = |r: &ExpandedRow| BuildHasherDefault::<DefaultHasher>::default().hash_one(r);
        assert_eq!(hash(&row), hash(&renumbered));
        assert_ne!(hash(&row), hash(&swapped));
    }

    /// `decode` is `decode_with_hints` with default hints: a symbol printed
    /// across a ten-row image is read on row 5, the middle row scanned first.
    #[test]
    fn decode_reads_an_upright_symbol_with_default_hints() {
        let (row, _) = symbol_row(&gtin_symbol(), 0);
        let width = row.get_size();
        let line: Vec<u8> = (0..width)
            .map(|x| if row.get(x) { 0 } else { 255 })
            .collect();
        let source = Luma8LuminanceSource::new(line.repeat(10), width as u32, 10).unwrap();
        let mut image = BinaryBitmap::new(HybridBinarizer::new(source));
        let result = RSSExpandedReader::new().decode(&mut image).unwrap();
        assert_eq!(result.getText(), GTIN_TEXT);
        assert_eq!(orientation(&result), None);
        assert_eq!(
            points(&result),
            [(30., 5.), (45., 5.), (128., 5.), (143., 5.)]
        );
    }

    /// A complete finder sequence whose check character disagrees with the
    /// other characters is no symbol: the row is kept for stacking instead.
    #[test]
    fn a_complete_sequence_with_a_wrong_check_character_is_stored_not_read() {
        let mut symbol = gtin_symbol();
        symbol[0].left += 1;
        let (row, _) = symbol_row(&symbol, 0);
        let mut reader = RSSExpandedReader::new();
        let read = reader.decodeRow2pairs(4, &row);
        assert_eq!(read.err(), Some(Exceptions::NOT_FOUND));
        let finders: Vec<_> = reader.pairs.iter().map(|p| seen(p).1).collect();
        assert_eq!(finders, [FINDER_PAT_A, FINDER_PAT_B, FINDER_PAT_B]);
        assert_eq!(stored(&reader), [(4, symbol[0].left)]);
    }

    /// The pairs a stacked read assembles, as `seen` shows them.
    fn assembled(pairs: Option<Vec<ExpandedPair>>) -> Option<Vec<Seen>> {
        pairs.map(|pairs| pairs.iter().map(seen).collect())
    }

    /// Pair `index` of `spec` as decoded: its characters with their portions.
    fn decoded(spec: Spec, index: usize) -> ExpandedPair {
        let (left, right) = expected(spec, index);
        let finder = FinderPattern::new(spec.finder, [0, 15], 0, 15, 0);
        ExpandedPair::new(left, right, Some(finder))
    }

    /// Stacking walks the stored rows in order: a row that starts no legal
    /// sequence is passed over, one that completes the sequence with a
    /// misread character is backed out of, and the next row completes it.
    /// Twenty-five stored rows are walked; a twenty-sixth means the symbol
    /// will never come together, and every row is dropped.
    #[test]
    fn stacking_skips_foreign_rows_backs_out_of_a_misread_one_up_to_twenty_five() {
        let symbol = gtin_symbol();
        let pairs: Vec<_> = (0..3).map(|i| decoded(symbol[i], i)).collect();
        let mut misread = symbol[2];
        misread.left += 1;
        let foreign = ExpandedRow::new(vec![pair(1, Some(1), FINDER_PAT_C)], 0);
        let mut reader = RSSExpandedReader::new();
        reader.rows = vec![foreign.clone(); 22];
        reader.rows.extend([
            ExpandedRow::new(pairs[..2].to_vec(), 1),
            ExpandedRow::new(vec![decoded(misread, 2)], 2),
            ExpandedRow::new(pairs[2..].to_vec(), 3),
        ]);
        let want = assembled(Some(pairs));
        assert_eq!(assembled(reader.checkRows(false)), want);
        assert_eq!(reader.rows.len(), 25);
        reader.rows.push(foreign);
        assert_eq!(assembled(reader.checkRows(false)), None);
        assert_eq!(reader.rows.len(), 0);
    }

    /// The backtracking keeps the rows of its current path: a row it backs
    /// out of leaves the path, and the row that completes the symbol is
    /// returned through the pairs without joining it.
    #[test]
    fn a_row_backed_out_of_leaves_the_backtracking_path() {
        let symbol = gtin_symbol();
        let pairs: Vec<_> = (0..3).map(|i| decoded(symbol[i], i)).collect();
        let mut misread = symbol[2];
        misread.left += 1;
        let mut reader = RSSExpandedReader::new();
        reader.rows = vec![
            ExpandedRow::new(pairs[..2].to_vec(), 1),
            ExpandedRow::new(vec![decoded(misread, 2)], 2),
            ExpandedRow::new(pairs[2..].to_vec(), 3),
        ];
        let mut path = Vec::new();
        let found = reader.checkRowsDetails(&mut path, 0).ok();
        assert_eq!(assembled(found), assembled(Some(pairs)));
        let numbers: Vec<_> = path.iter().map(ExpandedRow::getRowNumber).collect();
        assert_eq!(numbers, [1]);
    }

    /// Each stored row joins a stacked symbol at most once: a lone row whose
    /// pair, doubled, would pass both the checksum and the A1 A2 sequence is
    /// still no symbol.
    #[test]
    fn a_stored_row_never_completes_a_symbol_with_itself() {
        let lone = ExpandedPair::new(
            Some(DataCharacter::new(5, 5)),
            Some(DataCharacter::new(9, 0)),
            Some(FinderPattern::new(FINDER_PAT_A, [0, 15], 0, 15, 0)),
        );
        let mut reader = RSSExpandedReader::new();
        reader.pairs = vec![lone.clone(), lone.clone()];
        let doubled = RSSExpandedReader::isValidSequence(&reader.pairs, true);
        assert_eq!((reader.checkChecksum(), doubled), (true, true));
        reader.rows = vec![ExpandedRow::new(vec![lone], 1)];
        assert_eq!(assembled(reader.checkRows(false)), None);
        assert_eq!(assembled(reader.checkRows(true)), None);
    }
}
