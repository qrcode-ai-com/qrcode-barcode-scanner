# frozen_string_literal: true

# SPDX-License-Identifier: MIT
#
# Scan one image with the three profiles through the gem's public API and write one JSON report
# per profile, each exactly as the engine returned it, for
# `scripts/destination-acceptance.py reports --kind package` to judge.
#
#   ruby scan.rb IMAGE OUT_DIR
#
# It loads the gem the way an application does, `require 'qrcode_barcode_scanner'`, and writes
# `facts.json` beside the reports: the gem that answered, its platform, its ffi and the host. This
# program judges nothing.
require 'fileutils'
require 'json'
require 'rbconfig'
require 'qrcode_barcode_scanner'

abort 'usage: ruby scan.rb IMAGE OUT_DIR' unless ARGV.length == 2
image_path, out = ARGV
image = File.binread(image_path)
FileUtils.mkdir_p(out)

puts "engine #{QrcodeBarcodeScanner.engine_version} on #{RUBY_DESCRIPTION}"
%w[fast frame full].each do |profile|
  # A budget of 0 is unbounded: the result does not depend on how busy the host is.
  report = QrcodeBarcodeScanner.scan(image, profile: profile, budget_ms: 0)
  File.binwrite(File.join(out, "#{profile}.json"), report.json)
  found = report.detections.map { |row| "#{row['symbology']}:#{row.dig('content', 'text')}" }
  puts "#{profile}: #{found.join(' ')}"
end

# A file that is not an image must come back as the gem's one error type, with the engine's code.
refusal = begin
  QrcodeBarcodeScanner.scan('this is not an image'.b, profile: :frame)
  { 'class' => 'none' }
rescue QrcodeBarcodeScanner::ScanError => e
  { 'class' => e.class.name, 'kind' => e.kind, 'code' => e.code, 'message' => e.message }
end
puts "not an image -> #{refusal.to_json}"

gem = Gem.loaded_specs['qrcode-barcode-scanner']
ffi = Gem.loaded_specs['ffi']
facts = {
  'gem' => gem && { 'version' => gem.version.to_s, 'platform' => gem.platform.to_s, 'path' => gem.full_gem_path },
  'library' => QrcodeBarcodeScanner::Native::LIBRARY,
  'ffi' => ffi && { 'version' => ffi.version.to_s, 'platform' => ffi.platform.to_s },
  'ruby' => RUBY_DESCRIPTION,
  'rubygems' => Gem::VERSION,
  'local_platform' => Gem::Platform.local.to_s,
  'host_os' => RbConfig::CONFIG['host_os'],
  'not_an_image' => refusal
}
File.write(File.join(out, 'facts.json'), JSON.pretty_generate(facts))
expected = { 'class' => 'QrcodeBarcodeScanner::ScanError', 'kind' => 'ScanFailed', 'code' => 'QRS-001' }
exit(expected.all? { |key, value| refusal[key] == value } ? 0 : 1)
