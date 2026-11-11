#!/usr/bin/env python3
"""Spike only: rewrite the binding error of the UniFFI crate in a throw-away checkout.

  error_variants.py flat  LIB_RS    the error crosses as its variant and its message
  error_variants.py named LIB_RS    each variant that holds one value names it `value`

The crate's error has variants with one unnamed value, such as `ScanFailed(String)`. UniFFI's
Ruby backend writes invalid Ruby for that shape. These two rewrites tell which shape it can
express. Nothing here is a change to the crate: the workflow applies it to its own checkout and
throws it away. Stdlib only.
"""
import re
import sys

variant, path = sys.argv[1:3]
text = open(path, encoding="utf-8").read()
DERIVE = "#[derive(Debug, thiserror::Error, uniffi::Error)]\npub enum ScanBindingError {"
if text.count(DERIVE) != 1:
    sys.exit("the error enum is not where this spike expects it")

if variant == "flat":
    text = text.replace(DERIVE, DERIVE.replace("\npub enum", "\n#[uniffi(flat_error)]\npub enum"))
elif variant == "named":
    start = text.index(DERIVE)
    end = text.index("\n}\n", start)
    body = text[start:end]
    body, fields = re.subn(r"^(\s+)([A-Z]\w+)\((String|u64)\),$", r"\1\2 { value: \3 },", body, flags=re.M)
    body = body.replace("{0}", "{value}")
    code_end = text.index("#[cfg(test)]", end)
    code = text[end:code_end]
    out, position, calls = [], 0, 0
    for match in re.finditer(r"ScanBindingError::([A-Z]\w+)\(", code):
        if match.start() < position:
            continue
        depth, index = 1, match.end()
        while depth:
            depth += {"(": 1, ")": -1}.get(code[index], 0)
            index += 1
        out.append(code[position:match.start()])
        out.append(f"ScanBindingError::{match.group(1)} {{ value: {code[match.end():index - 1]} }}")
        position, calls = index, calls + 1
    out.append(code[position:])
    if fields != 8 or calls < 8:
        sys.exit(f"expected 8 variants and their constructions, found {fields} and {calls}")
    text = text[:start] + body + "".join(out) + text[code_end:]
else:
    sys.exit("variant is flat or named")
open(path, "w", encoding="utf-8").write(text)
print(f"rewrote the binding error: {variant}")
