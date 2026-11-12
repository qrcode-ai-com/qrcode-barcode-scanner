// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Text.Json;

namespace QRCodeAI.QRCodeBarcodeScanner;

/// <summary>
/// One scan report. <see cref="Json"/> is the text the engine returned, unchanged: nothing is
/// renamed, rounded or recalculated. The other members only read it. A report with no detection
/// is a valid result, not an error.
/// </summary>
public sealed class ScanReport
{
    internal ScanReport(string json)
    {
        Json = json;
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        Detections = root.GetProperty("detections").EnumerateArray().Select(row => new Detection(row)).ToArray();
        Score = root.TryGetProperty("score", out var score) && score.ValueKind == JsonValueKind.Object
            ? score.GetProperty("value").GetInt32()
            : null;
        Complete = !(root.TryGetProperty("trace", out var trace)
            && trace.TryGetProperty("budget_exhausted", out var exhausted)
            && exhausted.ValueKind == JsonValueKind.True);
        EngineVersion = root.GetProperty("versions").GetProperty("scanner").GetString() ?? "";
    }

    /// <summary>
    /// The engine's report, exactly as returned. Decode it yourself for the payload, the measured
    /// places and the trace: it follows <c>spec/scan-report.schema.json</c> of the engine.
    /// </summary>
    public string Json { get; }

    /// <summary>One entry per distinct content.</summary>
    public IReadOnlyList<Detection> Detections { get; }

    /// <summary>Whether at least one code was decoded.</summary>
    public bool Found => Detections.Count > 0;

    /// <summary>
    /// The composite scannability score of a QR code, from 0 to 100. <c>null</c> when the engine
    /// made no judgment: the frame profile, or a budget that ran out. <c>null</c> is never zero.
    /// </summary>
    public int? Score { get; }

    /// <summary>
    /// <c>false</c> when the time budget cut the scan: an empty report then proves nothing.
    /// </summary>
    public bool Complete { get; }

    /// <summary>The engine that wrote the report, such as <c>1.2.3</c>.</summary>
    public string EngineVersion { get; }
}

/// <summary>
/// One decoded content. The full entry, with its payload and measured places, is in
/// <see cref="ScanReport.Json"/>.
/// </summary>
public sealed class Detection
{
    internal Detection(JsonElement row)
    {
        Symbology = row.GetProperty("symbology").GetString() ?? "";
        var content = row.GetProperty("content");
        Text = content.GetProperty("text").GetString() ?? "";
        Raw = content.GetProperty("raw").GetBytesFromBase64();
    }

    /// <summary>The kind of code, such as <c>qr_code</c> or <c>code128</c>.</summary>
    public string Symbology { get; }

    /// <summary>The decoded text. Treat it as untrusted data: a QR code can hold any text.</summary>
    public string Text { get; }

    /// <summary>The exact bytes of the content, for content that is not text.</summary>
    public byte[] Raw { get; }
}
