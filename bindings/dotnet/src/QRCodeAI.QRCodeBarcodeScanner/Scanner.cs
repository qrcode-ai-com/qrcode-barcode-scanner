// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Text.Json;
using QRCodeAI.QRCodeBarcodeScanner.Generated;

namespace QRCodeAI.QRCodeBarcodeScanner;

/// <summary>
/// Reads QR codes and barcodes from an image, in process, with the QR Code &amp; Barcode Scanner
/// engine. Every method is safe to call from several threads. A scan runs on the calling thread
/// and returns when it is done: move it off a user interface thread yourself.
/// </summary>
public static class Scanner
{
    /// <summary>Reads the codes of one encoded image: PNG, JPEG, WebP or GIF.</summary>
    /// <param name="image">The bytes of the image file.</param>
    /// <param name="options">The profile and the limits. <c>null</c> scans with <see cref="ScanProfile.Full"/>.</param>
    /// <returns>The report. A report with no detection is a valid result, not an error.</returns>
    /// <exception cref="ScanException">The engine refused the image or an option.</exception>
    public static ScanReport Scan(byte[] image, ScanOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(image);
        options ??= ScanOptions.Default;
        return new ScanReport(Call(() => NativeScanner.Scan(
            image, Name(options.Profile ?? ScanProfile.Full), options.MaxDimension, options.MaxPixels,
            options.BudgetMs, Names(options.ScoreSkipAxes), Names(options.ScoreSkipChecks),
            options.AlphaBackground, Names(options.AlphaPalette), options.ScorePreset)));
    }

    /// <summary>Reads the codes of one raw frame: four bytes per pixel, red, green, blue, alpha, row by row.</summary>
    /// <param name="rgba">The pixels: <paramref name="width"/> × <paramref name="height"/> × 4 bytes.</param>
    /// <param name="width">The width of the frame, in pixels.</param>
    /// <param name="height">The height of the frame, in pixels.</param>
    /// <param name="options">The profile and the limits. <c>null</c> scans with <see cref="ScanProfile.Frame"/>.</param>
    /// <returns>The report. A report with no detection is a valid result, not an error.</returns>
    /// <exception cref="ScanException">The engine refused the frame or an option.</exception>
    public static ScanReport ScanFrame(byte[] rgba, uint width, uint height, ScanOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(rgba);
        options ??= ScanOptions.Default;
        return new ScanReport(Call(() => NativeScanner.ScanFrame(
            rgba, width, height, Name(options.Profile ?? ScanProfile.Frame), options.MaxDimension,
            options.MaxPixels, options.BudgetMs, Names(options.ScoreSkipAxes), Names(options.ScoreSkipChecks),
            options.AlphaBackground, Names(options.AlphaPalette), options.ScorePreset)));
    }

    /// <summary>
    /// What this build of the engine can read, as the JSON it gives: its versions, its readers and
    /// the symbologies they can return. It does not say that a given image will decode.
    /// </summary>
    public static string Capabilities() => Call(NativeScanner.Capabilities);

    /// <summary>The version of the engine inside this package, such as <c>1.2.3</c>.</summary>
    public static string EngineVersion()
    {
        using var capabilities = JsonDocument.Parse(Capabilities());
        return capabilities.RootElement.GetProperty("versions").GetProperty("scanner").GetString() ?? "";
    }

    private static string Name(ScanProfile profile) => profile switch
    {
        ScanProfile.Fast => "fast",
        ScanProfile.Frame => "frame",
        ScanProfile.Full => "full",
        _ => throw new ArgumentOutOfRangeException(nameof(profile), profile, "not a scan profile"),
    };

    private static string[]? Names(IReadOnlyList<string>? values) => values?.ToArray();

    // The generated code is internal. Its exceptions never leave this package: a caller catches
    // one public type, with the case and the engine's code.
    private static string Call(Func<string> engine)
    {
        try
        {
            return engine();
        }
        catch (ScanBindingException refusal)
        {
            throw new ScanException(refusal.GetType().Name, refusal.Message, refusal);
        }
        catch (UniffiException fault)
        {
            throw new ScanException(ScanException.EngineFault, fault.Message, fault);
        }
    }
}
