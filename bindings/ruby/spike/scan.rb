# frozen_string_literal: true

# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Ruby spike: scan one image with the three profiles through the Ruby bindings UniFFI generates,
# in process, and write one JSON report per profile for
# `scripts/destination-acceptance.py reports` to judge.
#
#   ruby scan.rb GENERATED_DIR IMAGE OUT_DIR
#
# Each report file is the text the engine returned, unchanged. `facts.json` records what the
# spike measured: the time of each scan, what a file that is not an image raises, and the host.
# This program judges nothing.
require 'fileutils'
require 'json'
require 'rbconfig'

generated, image_path, out = ARGV
abort 'usage: ruby scan.rb GENERATED_DIR IMAGE OUT_DIR' unless ARGV.length == 3
$LOAD_PATH.unshift(File.expand_path(generated))
require 'qrcode_ai_scanner_uniffi'

scanner = QrcodeAiScannerUniffi
image = File.binread(image_path)
FileUtils.mkdir_p(out)

# The library answers before any scan: this is the call that fails when the generated Ruby and
# the native library do not come from the same UniFFI line.
capabilities = scanner.capabilities
puts "engine #{JSON.parse(capabilities).fetch('versions').to_json}"

milliseconds = {}
%w[fast frame full].each do |profile|
  # A budget of 0 is unbounded: the result does not depend on how busy the host is.
  started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  report = scanner.scan(image, profile, nil, nil, 0, nil, nil, nil, nil, nil)
  milliseconds[profile] = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - started) * 1000).round(1)
  File.binwrite(File.join(out, "#{profile}.json"), report)
  found = JSON.parse(report).fetch('detections').map { |row| "#{row['symbology']}:#{row.dig('content', 'text')}" }
  puts "#{profile} #{found.join(' ')} (#{milliseconds[profile]} ms)"
end

# A file that is not an image must come back as an exception that carries the engine's own code.
refusal = { 'exception' => 'none', 'message' => '' }
begin
  scanner.scan('this is not an image'.b, 'frame', nil, nil, 0, nil, nil, nil, nil, nil)
rescue StandardError => e
  refusal = { 'exception' => e.class.name, 'message' => e.message }
end
puts "not an image -> #{refusal['exception']}: #{refusal['message']}"

facts = {
  'capabilities' => JSON.parse(capabilities),
  'milliseconds' => milliseconds,
  'notAnImage' => refusal,
  'ruby' => RUBY_DESCRIPTION,
  'ffi' => Gem.loaded_specs['ffi']&.version.to_s,
  'os' => RbConfig::CONFIG['host_os'],
  'architecture' => RbConfig::CONFIG['host_cpu']
}
File.write(File.join(out, 'facts.json'), JSON.pretty_generate(facts))
exit(refusal['message'].include?('QRS-') ? 0 : 1)
