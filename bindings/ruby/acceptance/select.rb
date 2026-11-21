# frozen_string_literal: true

# SPDX-License-Identifier: MIT
#
# Which of the built gems RubyGems itself would install, by its own platform rules: the ones
# `gem install qrcode-barcode-scanner` chooses from on rubygems.org.
#
#   ruby select.rb FEED            the path of the one gem for this Ruby, or exit 1
#   ruby select.rb FEED PLATFORM   the names of the gems a Ruby of PLATFORM accepts, maybe none
#
# PLATFORM is written as Gem::Platform.local writes it, such as x86_64-linux-musl.
require 'rubygems/package'

abort 'usage: ruby select.rb FEED [PLATFORM]' unless [1, 2].include?(ARGV.length)
feed, platform = ARGV
# expand_path writes a Windows path with forward slashes: a backslash in a glob is an escape.
feed = File.expand_path(feed)
gems = Dir.glob(File.join(feed, '*.gem')).sort
abort "no gem in #{feed}" if gems.empty?
Gem.platforms = [Gem::Platform::RUBY, Gem::Platform.new(platform)] if platform
chosen = gems.select { |path| Gem::Platform.match_spec?(Gem::Package.new(path).spec) }
if platform
  puts chosen.map { |path| File.basename(path) }
elsif chosen.length == 1
  puts chosen.first
else
  abort "#{chosen.length} gems are for #{Gem::Platform.local}: #{chosen.map { |path| File.basename(path) }}"
end
