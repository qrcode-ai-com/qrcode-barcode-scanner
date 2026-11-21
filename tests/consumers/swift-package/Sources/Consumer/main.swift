// The shared truth case `qr-and-code128` (fixtures/consumer-truth.json): one image that holds a
// QR code and a Code 128. The fast and full profiles scan the encoded image, the frame profile
// its RGBA pixels; each must return exactly both contents, in a final report.
//
//   Consumer IMAGE OUT     writes the facts of the three scans to OUT as JSON, exit 1 on a miss
//
// SPDX-License-Identifier: MIT

import CoreGraphics
import Foundation
import ImageIO
import QRCodeBarcodeScanner

let expected: Set<[String]> = [["qr_code", "https://qrc-ai.com/76xMa"], ["code128", "STOCK-4827"]]

struct Failure: Error, CustomStringConvertible {
    let description: String
}

func contents(of json: String, profile: String) throws -> Set<[String]> {
    guard let report = try JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any],
          let trace = report["trace"] as? [String: Any],
          let detections = report["detections"] as? [[String: Any]] else {
        throw Failure(description: "\(profile): the report is not a scan report")
    }
    if (trace["budget_exhausted"] as? Bool) != false {
        throw Failure(description: "\(profile): the report is not final")
    }
    return Set(try detections.map { detection in
        guard let symbology = detection["symbology"] as? String,
              let content = detection["content"] as? [String: Any],
              let text = content["text"] as? String else {
            throw Failure(description: "\(profile): a detection has no symbology or text")
        }
        return [symbology, text]
    })
}

/// The image's pixels as RGBA bytes, top row first, with its width and height.
func pixels(of image: Data) throws -> (Data, UInt32, UInt32) {
    guard let source = CGImageSourceCreateWithData(image as CFData, nil),
          let picture = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw Failure(description: "frame: the fixture does not decode")
    }
    let width = picture.width, height = picture.height
    var rgba = Data(count: width * height * 4)
    let drawn = rgba.withUnsafeMutableBytes { buffer -> Bool in
        guard let context = CGContext(
            data: buffer.baseAddress, width: width, height: height, bitsPerComponent: 8,
            bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
        context.draw(picture, in: CGRect(x: 0, y: 0, width: width, height: height))
        return true
    }
    if !drawn { throw Failure(description: "frame: no RGBA context") }
    return (rgba, UInt32(width), UInt32(height))
}

let arguments = CommandLine.arguments
guard arguments.count == 3 else {
    FileHandle.standardError.write(Data("usage: Consumer IMAGE OUT\n".utf8))
    exit(2)
}
var facts: [String: Any] = [:]
var misses: [String] = []
do {
    let image = try Data(contentsOf: URL(fileURLWithPath: arguments[1]))
    // A budget of 0 means no time budget, as the shared truth set asks: every report is final.
    let (rgba, width, height) = try pixels(of: image)
    let reports: [(String, String)] = [
        ("fast", try scan(image: image, profile: "fast", budgetMs: 0)),
        ("full", try scan(image: image, profile: "full", budgetMs: 0)),
        ("frame", try scanFrame(rgba: rgba, width: width, height: height, profile: "frame", budgetMs: 0)),
    ]
    for (profile, json) in reports {
        let found = try contents(of: json, profile: profile)
        facts[profile] = found.sorted { $0[0] < $1[0] }
        if found != expected { misses.append("\(profile) returned \(found.sorted { $0[0] < $1[0] })") }
    }
    // A malformed image is an error the caller can catch, not a crash.
    do {
        _ = try scan(image: Data([0x00, 0x01, 0x02]), profile: "full")
        misses.append("an image that is not one was accepted")
    } catch let error as ScanBindingError {
        facts["malformed_image_error"] = String(describing: error)
    }
    let document = try capabilities()
    guard let parsed = try JSONSerialization.jsonObject(with: Data(document.utf8)) as? [String: Any],
          parsed["symbologies"] != nil else {
        throw Failure(description: "capabilities() is not the capabilities document")
    }
    facts["capabilities_keys"] = parsed.keys.sorted()
} catch {
    misses.append(String(describing: error))
}
facts["misses"] = misses
facts["expected"] = expected.sorted { $0[0] < $1[0] }
let out = try JSONSerialization.data(withJSONObject: facts, options: [.prettyPrinted, .sortedKeys])
try out.write(to: URL(fileURLWithPath: arguments[2]))
print(String(decoding: out, as: UTF8.self))
exit(misses.isEmpty ? 0 : 1)
