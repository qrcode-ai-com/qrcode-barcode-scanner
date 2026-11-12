// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The tests scan real fixtures of the engine through the public API. QRSCAN_FIXTURES names the
// engine's `fixtures` directory and QRSCAN_ENGINE_VERSION the version the native library was
// built from. Both are required: a test that cannot find its input fails, it is never skipped.
using System.Text;
using System.Text.Json;
using Xunit;

namespace QRCodeAI.QRCodeBarcodeScanner.Tests;

public class ScannerTests
{
    private const string Qr = "https://qrc-ai.com/76xMa";
    private const string Code128 = "STOCK-4827";

    private static string Need(string name) =>
        Environment.GetEnvironmentVariable(name) is { Length: > 0 } value
            ? value
            : throw new InvalidOperationException($"{name} is not set");

    private static byte[] Fixture(string relative) =>
        File.ReadAllBytes(Path.Combine(Need("QRSCAN_FIXTURES"), relative.Replace('/', Path.DirectorySeparatorChar)));

    private static byte[] Mixed() => Fixture("symbology/mixed-code128-qr.png");

    private static (string, string, string)[] Contents(ScanReport report) =>
        report.Detections
            .Select(found => (found.Symbology, found.Text, Encoding.UTF8.GetString(found.Raw)))
            .OrderBy(row => row.Symbology, StringComparer.Ordinal)
            .ToArray();

    private static readonly ScanOptions Unbounded = new() { BudgetMs = 0 };

    [Theory]
    [InlineData(ScanProfile.Fast)]
    [InlineData(ScanProfile.Frame)]
    [InlineData(ScanProfile.Full)]
    public void TheMixedImageReturnsBothCodesExactly(ScanProfile profile)
    {
        var report = Scanner.Scan(Mixed(), Unbounded with { Profile = profile });

        Assert.Equal(new[] { ("code128", Code128, Code128), ("qr_code", Qr, Qr) }, Contents(report));
        Assert.True(report.Found);
        Assert.True(report.Complete);
        Assert.Equal(Need("QRSCAN_ENGINE_VERSION"), report.EngineVersion);
    }

    [Fact]
    public void TheReportIsTheEnginesTextUnchanged()
    {
        var report = Scanner.Scan(Mixed(), Unbounded with { Profile = ScanProfile.Frame });

        using var parsed = JsonDocument.Parse(report.Json);
        var root = parsed.RootElement;
        Assert.Equal(2, root.GetProperty("detections").GetArrayLength());
        Assert.Equal(report.EngineVersion, root.GetProperty("versions").GetProperty("scanner").GetString());
        // Parts this package does not model are still there for the caller to read.
        Assert.True(root.GetProperty("detections")[0].TryGetProperty("occurrences", out _));
        Assert.True(root.TryGetProperty("trace", out _));
    }

    [Fact]
    public void TheFullProfileJudgesAQrCodeAndTheFrameProfileDoesNot()
    {
        var clean = Fixture("clean/gen_v5_q.png");

        var judged = Scanner.Scan(clean, Unbounded);
        var decoded = Scanner.Scan(clean, Unbounded with { Profile = ScanProfile.Frame });

        Assert.NotNull(judged.Score);
        Assert.InRange(judged.Score.Value, 0, 100);
        Assert.Null(decoded.Score);
        Assert.Equal(Contents(judged), Contents(decoded));
    }

    [Fact]
    public void AnImageWithNoCodeIsAResultNotAnError()
    {
        var report = Scanner.Scan(Fixture("degraded/FAIL_1491ms_0_584c998c.png"), Unbounded);

        Assert.False(report.Found);
        Assert.Empty(report.Detections);
        Assert.Null(report.Score);
        Assert.True(report.Complete);
    }

    [Fact]
    public void ContentThatIsNotTextKeepsItsExactBytes()
    {
        var report = Scanner.Scan(Fixture("eci/eci899-binary.png"), Unbounded);

        var found = Assert.Single(report.Detections);
        Assert.Equal("qr_code", found.Symbology);
        Assert.Equal(new byte[] { 0x00, 0xFF, 0x80, 0x7F }, found.Raw);
    }

    [Fact]
    public void BytesThatAreNotAnImageAreRefusedWithTheEnginesCode()
    {
        var refusal = Assert.Throws<ScanException>(() => Scanner.Scan("this is not an image"u8.ToArray()));

        Assert.Equal("ScanFailed", refusal.Case);
        Assert.Equal("QRS-001", refusal.Code);
        Assert.StartsWith("scan failed: ", refusal.Message);
        Assert.NotNull(refusal.InnerException);
    }

    [Fact]
    public void AZeroLimitIsRefusedAsAnOptionBeforeTheImageIsRead()
    {
        var refusal = Assert.Throws<ScanException>(
            () => Scanner.Scan("this is not an image"u8.ToArray(), new ScanOptions { MaxDimension = 0 }));

        Assert.Equal("ScanFailed", refusal.Case);
        Assert.Equal("QRS-006", refusal.Code);
    }

    [Theory]
    [InlineData("AlphaBackground", "UnknownAlphaBackground")]
    [InlineData("ScorePreset", "UnknownScorePreset")]
    [InlineData("ScoreSkipAxes", "UnknownStressAxis")]
    [InlineData("ScoreSkipChecks", "UnknownScoreCheck")]
    [InlineData("AlphaPalette", "UnknownPaletteColor")]
    public void AnUnknownOptionValueNamesItsCaseAndCarriesNoCode(string option, string expectedCase)
    {
        var options = option switch
        {
            "AlphaBackground" => new ScanOptions { AlphaBackground = "plaid" },
            "ScorePreset" => new ScanOptions { ScorePreset = "plaid" },
            "ScoreSkipAxes" => new ScanOptions { ScoreSkipAxes = new[] { "plaid" } },
            "ScoreSkipChecks" => new ScanOptions { ScoreSkipChecks = new[] { "plaid" } },
            _ => new ScanOptions { AlphaPalette = new[] { "plaid" } },
        };

        var refusal = Assert.Throws<ScanException>(() => Scanner.Scan(Mixed(), options));

        Assert.Equal(expectedCase, refusal.Case);
        Assert.Null(refusal.Code);
        Assert.Contains("plaid", refusal.Message);
    }

    [Fact]
    public void APresetAndSkippedAxesTogetherAreRefused()
    {
        var refusal = Assert.Throws<ScanException>(() => Scanner.Scan(
            Mixed(), new ScanOptions { ScorePreset = "design", ScoreSkipAxes = new[] { "blur" } }));

        Assert.Equal("ScorePresetConflict", refusal.Case);
    }

    [Fact]
    public void ARawFrameIsReadAndAFrameOfTheWrongSizeIsRefused()
    {
        var white = Enumerable.Repeat((byte)0xFF, 64 * 64 * 4).ToArray();

        var report = Scanner.ScanFrame(white, 64, 64);
        var refusal = Assert.Throws<ScanException>(() => Scanner.ScanFrame(white, 64, 63));

        Assert.False(report.Found);
        Assert.Null(report.Score);
        Assert.Equal("ScanFailed", refusal.Case);
        Assert.NotNull(refusal.Code);
        Assert.StartsWith("QRS-", refusal.Code);
    }

    [Fact]
    public void TheCapabilitiesNameTheEngineInsideThePackage()
    {
        using var capabilities = JsonDocument.Parse(Scanner.Capabilities());

        Assert.Equal(Need("QRSCAN_ENGINE_VERSION"), Scanner.EngineVersion());
        Assert.Equal(Scanner.EngineVersion(),
            capabilities.RootElement.GetProperty("versions").GetProperty("scanner").GetString());
        Assert.Contains("qr_code", capabilities.RootElement.GetProperty("symbologies")
            .EnumerateArray().Select(name => name.GetString()));
    }

    [Fact]
    public void ScansFromSeveralThreadsAgree()
    {
        var image = Mixed();
        var expected = Contents(Scanner.Scan(image, Unbounded with { Profile = ScanProfile.Frame }));

        var results = Enumerable.Range(0, 8).AsParallel().WithDegreeOfParallelism(8)
            .Select(_ => Contents(Scanner.Scan(image, Unbounded with { Profile = ScanProfile.Frame })))
            .ToArray();

        Assert.All(results, contents => Assert.Equal(expected, contents));
    }

    [Fact]
    public void AReportReadsAMissingScoreAndACutScan()
    {
        var cut = new ScanReport(
            """{"detections":[],"score":null,"trace":{"budget_exhausted":true},"versions":{"scanner":"9.8.7"}}""");
        var judged = new ScanReport(
            """{"detections":[],"score":{"value":0},"trace":{"budget_exhausted":false},"versions":{"scanner":"9.8.7"}}""");

        Assert.Null(cut.Score);
        Assert.False(cut.Complete);
        Assert.Equal(0, judged.Score);
        Assert.True(judged.Complete);
        Assert.Equal("9.8.7", judged.EngineVersion);
    }
}
