# frozen_string_literal: true

# SPDX-License-Identifier: MIT
require 'json'

module QrcodeBarcodeScanner
  # One scan report. #json is the exact text the engine returned: nothing is renamed, rounded or
  # recalculated. The other methods read its most used parts.
  class Report
    # The report as the engine wrote it.
    attr_reader :json

    def initialize(json)
      @json = json
      @data = JSON.parse(json)
    end

    # The whole report as a Hash with string keys, parsed from #json.
    def to_h
      @data
    end

    # One Hash per distinct content: its "symbology", its "content" ("text", "raw" in base64) and
    # where the engine measured it.
    def detections
      @data.fetch('detections')
    end

    # At least one code was decoded.
    def found?
      !detections.empty?
    end

    # The scannability judgment from 0 to 100, or nil: with the frame profile, or when the time
    # budget ran out before the judgment. A missing score is not zero.
    def score
      score = @data['score']
      score.is_a?(Hash) ? score['value'] : nil
    end

    # false when the time budget cut the scan: an empty report then proves nothing.
    def complete?
      @data.dig('trace', 'budget_exhausted') != true
    end

    # The engine that wrote the report.
    def engine_version
      @data.dig('versions', 'scanner')
    end
  end
end
