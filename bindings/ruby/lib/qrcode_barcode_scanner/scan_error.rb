# frozen_string_literal: true

# SPDX-License-Identifier: MIT
module QrcodeBarcodeScanner
  # The engine refused the image or an option. The message is the engine's own sentence. No code
  # is a result, not an error: a scan that finds nothing returns a report.
  class ScanError < StandardError
    # The kind of a fault inside the engine or its binding, not a refusal of the input.
    ENGINE_FAULT = 'EngineFault'

    # What was refused: "ScanFailed" for the image or a limit, or the name of the option with an
    # unknown value, such as "UnknownProfile" or "UnknownAlphaBackground". ENGINE_FAULT is a
    # fault of the engine itself.
    attr_reader :kind

    # The engine's code when it gives one, such as "QRS-001" for bytes that are not an image.
    # nil otherwise.
    attr_reader :code

    def initialize(kind, message)
      super(message)
      @kind = kind
      @code = message.to_s[/\[(QRS-\d{3})\]/, 1]
    end
  end
end
