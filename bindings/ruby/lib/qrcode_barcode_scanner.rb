# frozen_string_literal: true

# SPDX-License-Identifier: MIT
#
# QR Code & Barcode Scanner for Ruby: read QR codes and barcodes from an image, in process, with
# the engine's own native library. The engine returns one JSON report; this module hands it back
# unchanged inside a QrcodeBarcodeScanner::Report.
require 'json'
require_relative 'qrcode_barcode_scanner/version'
require_relative 'qrcode_barcode_scanner/native'
require_relative 'qrcode_barcode_scanner/scan_error'
require_relative 'qrcode_barcode_scanner/report'
# Written by uniffi-bindgen from the native library of the same build, never by hand. It loads
# the library that QrcodeBarcodeScanner::Native::LIBRARY names (bindings/ruby/uniffi.toml).
require_relative 'qrcode_barcode_scanner/generated/qrcode_ai_scanner_uniffi'

# Reads QR codes and barcodes from an image. Every method is safe to call from several threads.
# A scan runs on the calling thread and returns when it is done.
module QrcodeBarcodeScanner
  # The three scan profiles of the engine.
  PROFILES = %w[full fast frame].freeze

  class << self
    # Reads the codes of one encoded image: the bytes of a PNG, JPEG, WebP or GIF file.
    #
    #   report = QrcodeBarcodeScanner.scan(File.binread('label.png'))
    #   report.detections.each { |found| puts "#{found['symbology']} #{found.dig('content', 'text')}" }
    #
    # profile: is :full (the default), :fast or :frame. budget_ms: 0 sets no time budget. Every
    # option left out keeps the engine's own default. Raises ScanError when the engine refuses
    # the image or an option; an image with no code is a report with no detection.
    def scan(image, profile: :full, budget_ms: nil, max_dimension: nil, max_pixels: nil,
             score_skip_axes: nil, score_skip_checks: nil, score_preset: nil,
             alpha_background: nil, alpha_palette: nil)
      bytes = binary(image, 'image')
      Report.new(call do
        QrcodeAiScannerUniffi.scan(bytes, profile_name(profile), max_dimension, max_pixels, budget_ms,
                                   names(score_skip_axes), names(score_skip_checks),
                                   text(alpha_background), names(alpha_palette), text(score_preset))
      end)
    end

    # Reads the codes of one raw frame: four bytes per pixel, red, green, blue, alpha, row by row,
    # width * height * 4 bytes in all. profile: defaults to :frame, the camera loop's profile.
    def scan_frame(rgba, width, height, profile: :frame, budget_ms: nil, max_dimension: nil,
                   max_pixels: nil, score_skip_axes: nil, score_skip_checks: nil, score_preset: nil,
                   alpha_background: nil, alpha_palette: nil)
      bytes = binary(rgba, 'rgba')
      Report.new(call do
        QrcodeAiScannerUniffi.scan_frame(bytes, Integer(width), Integer(height), profile_name(profile),
                                         max_dimension, max_pixels, budget_ms, names(score_skip_axes),
                                         names(score_skip_checks), text(alpha_background),
                                         names(alpha_palette), text(score_preset))
      end)
    end

    # What this build of the engine can read, as a Hash: its versions, its readers and the
    # symbologies they can return. It does not say that a given image will decode.
    def capabilities
      JSON.parse(call { QrcodeAiScannerUniffi.capabilities })
    end

    # The version of the engine inside this gem, such as "1.2.3".
    def engine_version
      capabilities.fetch('versions').fetch('scanner')
    end

    private

    def binary(value, name)
      raise TypeError, "#{name} must be a String of bytes, not #{value.class}" unless value.is_a?(String)

      value.b
    end

    def profile_name(profile)
      name = profile.to_s
      raise ArgumentError, "profile must be one of #{PROFILES.join(', ')}, not #{profile.inspect}" unless PROFILES.include?(name)

      name
    end

    def names(values)
      values&.map(&:to_s)
    end

    def text(value)
      value&.to_s
    end

    # The generated module's exceptions never leave this gem: a caller rescues one public type,
    # with the case and the engine's code.
    def call
      yield
    rescue QrcodeAiScannerUniffi::InternalError => e
      raise ScanError.new(ScanError::ENGINE_FAULT, e.message)
    rescue StandardError => e
      raise unless e.class.name.to_s.start_with?('QrcodeAiScannerUniffi::ScanBindingError::')

      raise ScanError.new(e.class.name.split('::').last, e.message)
    end
  end
end
