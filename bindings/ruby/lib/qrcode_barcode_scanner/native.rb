# frozen_string_literal: true

# SPDX-License-Identifier: MIT
require 'rbconfig'

module QrcodeBarcodeScanner
  # The engine's native library, the one file of this gem's platform. A platform gem carries it
  # under native/, beside this file: no search path decides which library answers.
  module Native
    FILE = case RbConfig::CONFIG['host_os']
           when /darwin/ then 'libqrcode_ai_scanner_uniffi.dylib'
           when /mswin|mingw|cygwin/ then 'qrcode_ai_scanner_uniffi.dll'
           else 'libqrcode_ai_scanner_uniffi.so'
           end
    LIBRARY = File.expand_path(File.join('native', FILE), __dir__)

    unless File.file?(LIBRARY)
      raise LoadError, "the QR Code & Barcode Scanner native library is missing (#{LIBRARY}): this " \
                       'system has no platform gem. The gem is built for Linux x64 and arm64 with ' \
                       'glibc, macOS on Intel and Apple silicon, and Windows x64.'
    end
  end
end
