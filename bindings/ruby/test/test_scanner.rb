# frozen_string_literal: true

# SPDX-License-Identifier: MIT
#
# The gem's public API against the engine's own fixtures and truth file. Run against the lib/ of a
# tree that scripts/ruby-gem.py stage wrote: it holds the version file, the generated Ruby and
# the native library.
#
#   QRSCAN_FIXTURES=fixtures QRSCAN_ENGINE_VERSION=X.Y.Z ruby -I STAGED/lib bindings/ruby/test/test_scanner.rb
require 'json'
require 'minitest/autorun'
require 'qrcode_barcode_scanner'

class ScannerTest < Minitest::Test
  FIXTURES = ENV.fetch('QRSCAN_FIXTURES')
  TRUTH = JSON.parse(File.read(File.join(FIXTURES, 'consumer-truth.json')))
  MIXED = TRUTH.fetch('cases').find { |row| row['id'] == 'qr-and-code128' }
  CLEAN = TRUTH.fetch('cases').find { |row| row['id'] == 'qr-v5q-control' }

  def fixture(row)
    File.binread(File.join(FIXTURES, row.fetch('file')))
  end

  def contents(report)
    report.detections.map { |row| [row['symbology'], row.dig('content', 'text')] }.sort
  end

  def test_the_mixed_fixture_gives_its_two_contents_in_every_profile
    expected = MIXED.fetch('contents').map { |row| [row['symbology'], row['text']] }.sort
    assert_equal [%w[code128 STOCK-4827], ['qr_code', 'https://qrc-ai.com/76xMa']], expected
    %i[fast frame full].each do |profile|
      report = QrcodeBarcodeScanner.scan(fixture(MIXED), profile: profile, budget_ms: 0)
      assert_equal expected, contents(report), "profile #{profile}"
      assert report.found?
      assert report.complete?, "an unbudgeted #{profile} scan is never cut"
      assert_equal 0, report.to_h.dig('trace', 'engine_panics')
    end
  end

  def test_the_raw_bytes_are_the_payload
    report = QrcodeBarcodeScanner.scan(fixture(MIXED), profile: :fast, budget_ms: 0)
    raw = MIXED.fetch('contents').to_h { |row| [row['symbology'], row['raw_hex']] }
    report.detections.each do |row|
      bytes = row.dig('content', 'raw').unpack1('m0')
      assert_equal raw.fetch(row['symbology']), bytes.unpack1('H*') if raw[row['symbology']]
    end
  end

  def test_the_json_is_the_engines_text_unchanged
    report = QrcodeBarcodeScanner.scan(fixture(CLEAN), profile: :full, budget_ms: 0)
    assert_kind_of String, report.json
    assert_equal JSON.parse(report.json), report.to_h
    assert_equal %w[detections hints score trace versions], (report.to_h.keys & %w[detections score hints trace versions]).sort
  end

  def test_full_scores_and_frame_does_not
    full = QrcodeBarcodeScanner.scan(fixture(CLEAN), profile: :full, budget_ms: 0)
    assert_kind_of Integer, full.score
    assert_includes 0..100, full.score
    frame = QrcodeBarcodeScanner.scan(fixture(CLEAN), profile: :frame, budget_ms: 0)
    assert_nil frame.score
    assert_equal [['qr_code', 'https://qrcode-ai.com/c/v5q']], contents(frame)
  end

  def test_the_profile_defaults_are_full_for_an_image_and_frame_for_pixels
    assert_kind_of Integer, QrcodeBarcodeScanner.scan(fixture(CLEAN), budget_ms: 0).score
    blank = QrcodeBarcodeScanner.scan_frame("\xFF".b * (16 * 16 * 4), 16, 16)
    refute blank.found?
    assert_nil blank.score
  end

  def test_no_code_is_a_report_not_an_error
    report = QrcodeBarcodeScanner.scan_frame("\xFF".b * (32 * 32 * 4), 32, 32, profile: :fast, budget_ms: 0)
    assert_equal [], report.detections
    refute report.found?
    assert report.complete?
  end

  def test_bytes_that_are_not_an_image_raise_the_engine_code
    error = assert_raises(QrcodeBarcodeScanner::ScanError) do
      QrcodeBarcodeScanner.scan('not an image'.b)
    end
    assert_equal 'ScanFailed', error.kind
    assert_equal 'QRS-001', error.code
    assert_match(/\Ascan failed: .*\[QRS-001\]\z/, error.message)
  end

  def test_a_frame_whose_size_does_not_match_its_pixels_is_refused
    error = assert_raises(QrcodeBarcodeScanner::ScanError) do
      QrcodeBarcodeScanner.scan_frame("\x00".b * 4, 2, 2)
    end
    assert_equal 'ScanFailed', error.kind
    refute_nil error.code
  end

  def test_a_limit_refuses_the_image_before_it_is_decoded
    error = assert_raises(QrcodeBarcodeScanner::ScanError) do
      QrcodeBarcodeScanner.scan(fixture(CLEAN), max_dimension: 16)
    end
    assert_equal ['ScanFailed', 'QRS-002'], [error.kind, error.code]
  end

  def test_an_unknown_option_value_names_the_option
    error = assert_raises(QrcodeBarcodeScanner::ScanError) do
      QrcodeBarcodeScanner.scan(fixture(CLEAN), alpha_background: 'transparent')
    end
    assert_equal 'UnknownAlphaBackground', error.kind
    assert_nil error.code
    conflict = assert_raises(QrcodeBarcodeScanner::ScanError) do
      QrcodeBarcodeScanner.scan(fixture(CLEAN), score_preset: :design, score_skip_axes: [:rotation])
    end
    assert_equal 'ScorePresetConflict', conflict.kind
  end

  def test_skipped_axes_leave_the_score
    report = QrcodeBarcodeScanner.scan(fixture(CLEAN), budget_ms: 0, score_skip_axes: %i[perspective rotation])
    axes = report.to_h.dig('score', 'axes').map { |row| row['axis'] }
    assert_equal 4, axes.length
    refute_includes axes, 'perspective'
    refute_includes axes, 'rotation'
  end

  def test_the_profile_and_the_arguments_are_checked_before_the_engine
    assert_raises(ArgumentError) { QrcodeBarcodeScanner.scan(fixture(CLEAN), profile: :turbo) }
    assert_raises(TypeError) { QrcodeBarcodeScanner.scan(nil) }
    assert_raises(TypeError) { QrcodeBarcodeScanner.scan_frame([255] * 4, 1, 1) }
  end

  def test_capabilities_and_the_engine_version
    capabilities = QrcodeBarcodeScanner.capabilities
    assert_equal %w[engines symbologies versions], capabilities.keys.sort
    assert_includes capabilities['symbologies'], 'qr_code'
    assert_includes capabilities['symbologies'], 'code128'
    assert_equal ENV.fetch('QRSCAN_ENGINE_VERSION'), QrcodeBarcodeScanner.engine_version
    assert_equal QrcodeBarcodeScanner::VERSION, QrcodeBarcodeScanner.engine_version
    report = QrcodeBarcodeScanner.scan(fixture(CLEAN), profile: :fast, budget_ms: 0)
    assert_equal QrcodeBarcodeScanner.engine_version, report.engine_version
  end

  def test_the_generated_module_stays_behind_the_public_api
    assert File.file?(QrcodeBarcodeScanner::Native::LIBRARY)
    assert_equal File.basename(QrcodeBarcodeScanner::Native::LIBRARY), QrcodeBarcodeScanner::Native::FILE
  end

  def test_scans_from_several_threads_agree
    image = fixture(MIXED)
    reports = Array.new(4) { Thread.new { QrcodeBarcodeScanner.scan(image, profile: :frame, budget_ms: 0) } }.map(&:value)
    assert_equal 1, reports.map { |report| contents(report) }.uniq.length
  end
end
