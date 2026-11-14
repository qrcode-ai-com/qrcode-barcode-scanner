// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";

/** Check the installed runtime's grant independently from this bundle's own MIT source. */
export function assertRuntimeLicense(metadata, installedText, bundledText) {
  assert.equal(metadata.name, "@qrcode-ai-com/qrcode-barcode-scanner", "Unexpected engine package");
  assert.ok(["MIT", "AGPL-3.0-or-later"].includes(metadata.license), "Unsupported engine license: inspect the exact package before updating this bundle");
  const agrees = (text) => {
    if (typeof text !== "string") return false;
    const mit = /^\s*MIT License\s*\n/.test(text) && text.includes("Permission is hereby granted, free of charge")
      && text.includes("The above copyright notice and this permission notice shall be included");
    const agpl = /^\s*GNU AFFERO GENERAL PUBLIC LICENSE\s*\n\s*Version 3, 19 November 2007/.test(text);
    return metadata.license === "MIT" ? mit && !text.includes("GNU AFFERO GENERAL PUBLIC LICENSE")
      : agpl && !text.includes("Permission is hereby granted, free of charge");
  };
  assert.ok(agrees(installedText), `The installed engine license does not match ${metadata.license}`);
  assert.ok(agrees(bundledText), `The bundled engine notice does not match ${metadata.license}; rebuild and qualify the bundle before use`);
}
