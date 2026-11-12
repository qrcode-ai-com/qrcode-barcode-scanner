// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Scan one image with the three profiles through the package's public API and write one JSON
// report per profile, each exactly as the engine returned it, for
// `scripts/destination-acceptance.py reports --kind package` to judge.
//
//   QrscanAcceptance IMAGE OUT_DIR
//
// This program judges nothing.
using QRCodeAI.QRCodeBarcodeScanner;

if (args.Length != 2)
{
    Console.Error.WriteLine("usage: QrscanAcceptance IMAGE OUT_DIR");
    return 2;
}
var image = File.ReadAllBytes(args[0]);
Directory.CreateDirectory(args[1]);
Console.WriteLine($"engine {Scanner.EngineVersion()} on {System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription}");
foreach (var (name, profile) in new[] { ("fast", ScanProfile.Fast), ("frame", ScanProfile.Frame), ("full", ScanProfile.Full) })
{
    // A budget of 0 is unbounded: the result does not depend on how busy the host is.
    var report = Scanner.Scan(image, new ScanOptions { Profile = profile, BudgetMs = 0 });
    File.WriteAllText(Path.Combine(args[1], name + ".json"), report.Json);
    Console.WriteLine($"{name}: {string.Join(" ", report.Detections.Select(found => found.Symbology + ":" + found.Text))}");
}
return 0;
