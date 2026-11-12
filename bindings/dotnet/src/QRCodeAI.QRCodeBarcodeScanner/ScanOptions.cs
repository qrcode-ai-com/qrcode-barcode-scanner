// SPDX-License-Identifier: AGPL-3.0-or-later
namespace QRCodeAI.QRCodeBarcodeScanner;

/// <summary>How much work one scan does.</summary>
public enum ScanProfile
{
    /// <summary>Decodes first, with a reduced judgment.</summary>
    Fast,

    /// <summary>Decodes only. The report carries no score.</summary>
    Frame,

    /// <summary>Decodes and judges how well a QR code scans.</summary>
    Full,
}

/// <summary>
/// The profile and the limits of one scan. Every value left <c>null</c> keeps the engine's own
/// default. The engine checks each value and refuses one outside its domain with a
/// <see cref="ScanException"/>.
/// </summary>
public sealed record ScanOptions
{
    internal static readonly ScanOptions Default = new();

    /// <summary>
    /// The profile. <c>null</c> is <see cref="ScanProfile.Full"/> for an image and
    /// <see cref="ScanProfile.Frame"/> for a raw frame.
    /// </summary>
    public ScanProfile? Profile { get; init; }

    /// <summary>The largest width or height accepted, in pixels. A larger image is refused.</summary>
    public uint? MaxDimension { get; init; }

    /// <summary>The largest number of pixels accepted. A larger image is refused.</summary>
    public ulong? MaxPixels { get; init; }

    /// <summary>
    /// The time budget, in milliseconds. <c>null</c> keeps the profile's own budget, and a busy
    /// machine can then cut the scan short. <c>0</c> sets none: the result then does not depend
    /// on how busy the machine is.
    /// </summary>
    public ulong? BudgetMs { get; init; }

    /// <summary>
    /// Stress axes the score leaves out: <c>resolution</c>, <c>blur</c>, <c>contrast</c>,
    /// <c>perspective</c>, <c>rotation</c>, <c>lighting</c>. Not with <see cref="ScorePreset"/>.
    /// </summary>
    public IReadOnlyList<string>? ScoreSkipAxes { get; init; }

    /// <summary>Score checks left out: <c>uec</c>, <c>iso15415</c>, <c>alpha_envelope</c>.</summary>
    public IReadOnlyList<string>? ScoreSkipChecks { get; init; }

    /// <summary>
    /// What a transparent image is laid over before it is read: <c>auto</c>, <c>white</c>,
    /// <c>black</c>, <c>none</c> or <c>#rrggbb</c>.
    /// </summary>
    public string? AlphaBackground { get; init; }

    /// <summary>
    /// The backgrounds a transparent code must scan over: up to 32 colors, each <c>white</c>,
    /// <c>black</c> or <c>#rrggbb</c>.
    /// </summary>
    public IReadOnlyList<string>? AlphaPalette { get; init; }

    /// <summary>A named set of score axes: <c>design</c> or <c>capture</c>. Not with <see cref="ScoreSkipAxes"/>.</summary>
    public string? ScorePreset { get; init; }
}
