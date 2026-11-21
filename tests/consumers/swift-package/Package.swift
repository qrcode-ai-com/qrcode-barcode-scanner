// swift-tools-version:5.9
//
// A clean consumer of the Swift package as its satellite repository serves it. It depends on the
// staged satellite tree beside it (../satellite) and on nothing else: no engine source is
// compiled here. .github/workflows/swift-package.yml stages that tree and runs this package.
//
// SPDX-License-Identifier: MIT

import PackageDescription

let package = Package(
    name: "SwiftPackageConsumer",
    platforms: [.macOS(.v11)],
    dependencies: [
        .package(path: "../satellite"),
    ],
    targets: [
        .executableTarget(
            name: "Consumer",
            dependencies: [.product(name: "QRCodeBarcodeScanner", package: "satellite")],
            path: "Sources/Consumer"
        ),
    ]
)
