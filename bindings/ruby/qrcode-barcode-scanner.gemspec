# frozen_string_literal: true

# SPDX-License-Identifier: MIT
#
# The gem of the QR Code & Barcode Scanner engine. It is built only from the tree that
# scripts/ruby-gem.py stage writes, never from this folder: that tree holds the version file, the
# Ruby that uniffi-bindgen generated and the one native library of its platform. Each gem is a
# platform gem; there is no generic gem, since none could load a library.
#
#   QRSCAN_GEM_PLATFORM=x86_64-linux-gnu gem build qrcode-barcode-scanner.gemspec
#
# scripts/ruby-gem.py inspect holds the same values as this file.
require_relative 'lib/qrcode_barcode_scanner/version'

platform = ENV.fetch('QRSCAN_GEM_PLATFORM', '')
raise 'QRSCAN_GEM_PLATFORM names the platform of the one native library this gem carries' if platform.empty?

Gem::Specification.new do |spec|
  spec.name = 'qrcode-barcode-scanner'
  spec.version = QrcodeBarcodeScanner::VERSION
  spec.platform = Gem::Platform.new(platform)
  spec.authors = ['QR Code AI']
  spec.summary = 'Read QR codes and barcodes from an image in Ruby, in process.'
  spec.description = 'QR Code & Barcode Scanner for Ruby reads QR Code, Micro QR, Data Matrix, Aztec, ' \
                     'PDF417, Code 128, EAN, UPC and more from an image, in process, with the open-source ' \
                     "engine's native library inside the gem. No command to install, no network call, " \
                     'and the JSON report is returned unchanged.'
  spec.license = 'MIT'
  spec.homepage = 'https://qrcode-ai.com/en-US/qr-code-scanner/sdk/ruby'
  spec.metadata = {
    'homepage_uri' => 'https://qrcode-ai.com/en-US/qr-code-scanner/sdk/ruby',
    'source_code_uri' => 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner',
    'bug_tracker_uri' => 'https://github.com/qrcode-ai-com/qrcode-barcode-scanner/issues',
    'rubygems_mfa_required' => 'true'
  }
  # The oldest Ruby line its maintainers still support, 3.3, up to the last line the ffi gem
  # ships native builds for.
  spec.required_ruby_version = '>= 3.3'
  # The first RubyGems that tells a glibc Linux (-gnu) from a musl one: an older one could pick
  # this gem's library on Alpine, where it cannot load.
  spec.required_rubygems_version = '>= 3.3.22'
  spec.add_dependency 'ffi', '~> 1.17'
  spec.files = Dir.glob('lib/**/*', File::FNM_DOTMATCH).select { |path| File.file?(path) }.sort +
               %w[README.md LICENSE LICENSE-NOTES.md LICENSE-APACHE-2.0 THIRD-PARTY.md]
  spec.require_paths = ['lib']
end
