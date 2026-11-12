// SPDX-License-Identifier: AGPL-3.0-or-later
using System.Text.RegularExpressions;

namespace QRCodeAI.QRCodeBarcodeScanner;

/// <summary>
/// The engine refused the image or an option. <see cref="Exception.Message"/> is the engine's
/// own sentence. No code is a result, not an error: a scan that finds nothing returns a report.
/// </summary>
public sealed partial class ScanException : Exception
{
    /// <summary>The <see cref="Case"/> of a fault inside the engine or its binding, not a refusal of the input.</summary>
    public const string EngineFault = "EngineFault";

    internal ScanException(string @case, string message, Exception inner)
        : base(message, inner)
    {
        Case = @case;
        var code = EngineCode().Match(message);
        Code = code.Success ? code.Groups[1].Value : null;
    }

    /// <summary>
    /// What was refused: <c>ScanFailed</c> for the image or a limit, or the name of the option
    /// with an unknown value, such as <c>UnknownProfile</c> or <c>UnknownAlphaBackground</c>.
    /// <see cref="EngineFault"/> is a fault of the engine itself.
    /// </summary>
    public string Case { get; }

    /// <summary>
    /// The engine's code when it gives one, such as <c>QRS-001</c> for bytes that are not an
    /// image. <c>null</c> otherwise.
    /// </summary>
    public string? Code { get; }

    [GeneratedRegex(@"\[(QRS-\d{3})\]")]
    private static partial Regex EngineCode();
}
