//! `sync-version` — one source, every publish surface.
//!
//! The workspace `Cargo.toml` version is the SOURCE; the excluded
//! crates, the foreign-toolchain manifests, the cli's crates.io core
//! pin and the version-pinned doc coordinates cannot inherit it, so
//! releases hand-bumped eight files (RELEASING.md §1) and the gradle
//! comment promised this command for two releases. `--check` verifies
//! only (exit 1 on drift) — the local twin of mobile.yml's tag gate.
//! A required surface whose file spells no qualifying line fails both
//! modes before anything is written: skipped, a renamed or reworded line
//! would drop out of every release bump while `--check` still passed.
//! Cargo lockfiles stay YOURS: the command prints their regeneration list.
//! The Flutter example's local path dependency identity is mirrored here;
//! its hosted dependency resolution remains untouched. No cargo invocations.

use std::path::Path;

/// One managed surface: the file plus the line-level rewrite rule.
struct Surface {
    path: &'static str,
    /// Line qualifies when it starts with this (post-trim).
    starts: &'static str,
    /// Rewrite the qualifying line for `version` (only the FIRST
    /// qualifying line is touched — every surface spells one).
    render: fn(version: &str, line: &str) -> String,
    /// The file must spell a qualifying line: without one the command
    /// fails instead of skipping the surface.
    required: bool,
}

/// The Kotlin README's coordinate line up to its version. The version has
/// no `v` prefix: JitPack keeps `0.11.0` and `v0.11.0` as two separate
/// builds, and the string without the prefix is the one the consumer job
/// (`binding-consumers.yml`) installs and tests.
const JITPACK_LINE: &str = "JitPack coordinate: com.github.qrcode-ai-com:qrcode-barcode-scanner:";

const SURFACES: &[Surface] = &[
    Surface {
        path: "crates/qrcode-ai-scanner-cli/Cargo.toml",
        starts: "qrcode-barcode-scanner = { version =",
        render: |v, line| {
            // keep everything after the version string (path, features)
            match line.split_once("\", ") {
                Some((_, tail)) => {
                    format!("qrcode-barcode-scanner = {{ version = \"{v}\", {tail}")
                }
                None => format!("qrcode-barcode-scanner = {{ version = \"{v}\" }}"),
            }
        },
        required: true,
    },
    Surface {
        path: "crates/qrcode-ai-scanner-py/Cargo.toml",
        starts: "version = \"",
        render: |v, _| format!("version = \"{v}\""),
        required: true,
    },
    Surface {
        path: "crates/qrcode-ai-scanner-uniffi/Cargo.toml",
        starts: "version = \"",
        render: |v, _| format!("version = \"{v}\""),
        required: true,
    },
    Surface {
        path: "bindings/flutter/rust/Cargo.toml",
        starts: "version = \"",
        render: |v, _| format!("version = \"{v}\""),
        required: true,
    },
    Surface {
        path: "bindings/kotlin/qrcodeaiscanner/build.gradle.kts",
        starts: "version = \"",
        render: |v, _| format!("version = \"{v}\""),
        required: true,
    },
    Surface {
        path: "bindings/flutter/pubspec.yaml",
        starts: "version:",
        render: |v, _| format!("version: {v}"),
        required: true,
    },
    Surface {
        path: "crates/qrcode-ai-scanner-node/package.json",
        starts: "\"version\":",
        render: |v, _| format!("  \"version\": \"{v}\","),
        required: true,
    },
    // Version-pinned doc coordinates (the "left at v0.6.0 through two
    // releases" class — RELEASING.md §1 makes them ride the same commit).
    Surface {
        path: "bindings/kotlin/README.md",
        starts: JITPACK_LINE,
        render: |v, _| format!("{JITPACK_LINE}{v}"),
        required: true,
    },
];

/// Workspace version — the single source every surface mirrors.
fn workspace_version() -> String {
    let root = std::fs::read_to_string("Cargo.toml").expect("workspace Cargo.toml");
    let pkg = root
        .split("[workspace.package]")
        .nth(1)
        .expect("[workspace.package] section");
    pkg.lines()
        .find_map(|l| {
            l.trim()
                .strip_prefix("version = \"")
                .and_then(|r| r.split('"').next())
        })
        .expect("workspace version line")
        .to_string()
}

/// What a surface's file holds against the workspace version.
#[derive(Debug, PartialEq, Eq)]
enum Outcome {
    /// The qualifying line already spells the version.
    InSync,
    /// The qualifying line was (or would be) rewritten from `old` to `new`.
    Drift { old: String, new: String },
    /// No line qualifies: the file has nothing to sync.
    Missing,
}

/// Sync one file's text: the outcome, and the text with its first
/// qualifying line rendered for `version`.
fn sync_text(surface: &Surface, text: &str, version: &str) -> (Outcome, String) {
    let mut out = Vec::with_capacity(text.lines().count());
    let mut outcome = Outcome::Missing;
    for line in text.lines() {
        if outcome == Outcome::Missing && line.trim_start().starts_with(surface.starts) {
            let indent = &line[..line.len() - line.trim_start().len()];
            let rendered = (surface.render)(version, line.trim_start());
            // package.json carries its own indentation in the rendered
            // form; plain TOML/YAML/Markdown keep the line's.
            let new_line = if rendered.starts_with(' ') {
                rendered
            } else {
                format!("{indent}{rendered}")
            };
            outcome = if new_line == line {
                Outcome::InSync
            } else {
                Outcome::Drift {
                    old: line.to_string(),
                    new: new_line.clone(),
                }
            };
            out.push(new_line);
        } else {
            out.push(line.to_string());
        }
    }
    let trailing = if text.ends_with('\n') { "\n" } else { "" };
    (outcome, out.join("\n") + trailing)
}

/// Whether an outcome fails the command: a required surface whose file
/// spells no qualifying line, which a release bump would otherwise skip.
fn fails(surface: &Surface, outcome: &Outcome) -> bool {
    surface.required && *outcome == Outcome::Missing
}

/// The plugin's Dart package name: the top-level `name:` of its pubspec,
/// which the example's lockfile lists as its local path dependency.
fn pubspec_name(pubspec: &str) -> Option<&str> {
    pubspec
        .lines()
        .find_map(|line| line.strip_prefix("name:"))
        .map(|name| name.trim().trim_matches(['"', '\'']))
        .filter(|name| !name.is_empty())
}

/// Mirror only the local package identity, preserving every resolved dependency.
fn flutter_example_lock(text: &str, package: &str, version: &str) -> String {
    let mut inside = false;
    let mut found = 0;
    let mut out = Vec::new();
    for line in text.lines() {
        if line.starts_with("  ") && !line.starts_with("    ") && line.ends_with(':') {
            inside = line
                .strip_prefix("  ")
                .and_then(|entry| entry.strip_suffix(':'))
                == Some(package);
        }
        if inside && line.starts_with("    version:") {
            out.push(format!("    version: \"{version}\""));
            found += 1;
        } else {
            out.push(line.to_owned());
        }
    }
    assert_eq!(
        found, 1,
        "Flutter example local package {package}: its version must be unique"
    );
    out.join("\n") + if text.ends_with('\n') { "\n" } else { "" }
}

/// Entry point: `xtask sync-version [--check]`.
pub fn run(check_only: bool) {
    let version = workspace_version();
    println!(
        "sync-version · workspace {version} · {} surfaces{}",
        SURFACES.len() + 1,
        if check_only { " · --check" } else { "" }
    );
    let mut rewrites: Vec<(&str, String)> = Vec::new();
    let mut missing = 0usize;
    for surface in SURFACES {
        assert!(
            Path::new(surface.path).exists(),
            "{} moved — update SURFACES",
            surface.path
        );
        let text = std::fs::read_to_string(surface.path)
            .unwrap_or_else(|e| panic!("{}: {e}", surface.path));
        let (outcome, rewritten) = sync_text(surface, &text, &version);
        if fails(surface, &outcome) {
            missing += 1;
            eprintln!(
                "::error::{}: no line starts with `{}` — update SURFACES",
                surface.path, surface.starts
            );
        } else if let Outcome::Drift { old, new } = outcome {
            println!(
                "  {}\n    - {}\n    + {}",
                surface.path,
                old.trim(),
                new.trim()
            );
            rewrites.push((surface.path, rewritten));
        }
    }
    let pubspec =
        std::fs::read_to_string("bindings/flutter/pubspec.yaml").expect("Flutter package pubspec");
    let package = pubspec_name(&pubspec).expect("Flutter package pubspec `name:`");
    let path = "bindings/flutter/example/pubspec.lock";
    let original = std::fs::read_to_string(path).expect("Flutter example lockfile");
    let updated = flutter_example_lock(&original, package, &version);
    if updated != original {
        println!("  {path} · local package identity → {version}");
        rewrites.push((path, updated));
    }
    if missing > 0 {
        eprintln!("::error::{missing} required surface(s) spell no line to sync; nothing written");
        std::process::exit(1);
    }
    let drifted = rewrites.len();
    if drifted == 0 {
        println!("  every surface already at {version}");
    } else if check_only {
        eprintln!("::error::{drifted} surface(s) drift from workspace {version}");
        std::process::exit(1);
    } else {
        for (path, text) in &rewrites {
            std::fs::write(path, text).unwrap_or_else(|e| panic!("{path}: {e}"));
        }
        println!(
            "  rewrote {drifted} surface(s) · now regenerate the lockfiles:\n    \
             for m in Cargo.toml crates/qrcode-ai-scanner-py/Cargo.toml \
             crates/qrcode-ai-scanner-uniffi/Cargo.toml bindings/flutter/rust/Cargo.toml \
             fuzz/Cargo.toml; do cargo update -w --manifest-path $m --offline; done"
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// An example lockfile whose local path dependency is `package` at
    /// `version`, between two hosted packages.
    fn example_lock(package: &str, version: &str) -> String {
        format!(
            "packages:\n  before:\n    source: hosted\n    version: \"2.3.4\"\n  \
             {package}:\n    source: path\n    version: \"{version}\"\n  after:\n    \
             source: hosted\n    version: \"5.6.7\"\n"
        )
    }

    /// The local entry is found by the name the plugin's pubspec gives it,
    /// whatever that name is.
    #[test]
    fn flutter_local_identity_preserves_hosted_resolution_and_is_idempotent() {
        let pubspec =
            std::fs::read_to_string(crate::repo_root().join("bindings/flutter/pubspec.yaml"))
                .expect("Flutter package pubspec");
        let package = pubspec_name(&pubspec).expect("the pubspec names its package");
        let text = example_lock(package, "0.9.0");
        let expected = example_lock(package, "0.10.0");
        assert_eq!(flutter_example_lock(&text, package, "0.10.0"), expected);
        assert_eq!(flutter_example_lock(&expected, package, "0.10.0"), expected);
    }

    /// Only the pubspec's top-level `name:` names the package.
    #[test]
    fn the_flutter_package_name_is_the_top_level_pubspec_name() {
        let pubspec = "description: x\n  name: nested\nname: 'some_plugin'\nflutter:\n  plugin:\n    name: y\n";
        assert_eq!(pubspec_name(pubspec), Some("some_plugin"));
        assert_eq!(pubspec_name("description: x\n  name: nested\n"), None);
        assert_eq!(pubspec_name("name:\n"), None);
    }

    #[test]
    fn cli_pin_render_keeps_path_and_features() {
        let line = r#"qrcode-barcode-scanner = { version = "0.8.1", path = "../qrcode-ai-scanner", features = ["serde"] }"#;
        let s = &SURFACES[0];
        assert!(line.starts_with(s.starts));
        let out = (s.render)("0.9.0", line);
        assert_eq!(
            out,
            r#"qrcode-barcode-scanner = { version = "0.9.0", path = "../qrcode-ai-scanner", features = ["serde"] }"#
        );
    }

    #[test]
    fn every_render_is_idempotent_at_same_version() {
        let samples = [
            r#"qrcode-barcode-scanner = { version = "1.2.3", path = "../qrcode-ai-scanner", features = ["serde"] }"#,
            r#"version = "1.2.3""#,
            r#"version = "1.2.3""#,
            r#"version = "1.2.3""#,
            r#"version = "1.2.3""#,
            "version: 1.2.3",
            r#"  "version": "1.2.3","#,
            "JitPack coordinate: com.github.qrcode-ai-com:qrcode-barcode-scanner:1.2.3",
        ];
        assert_eq!(samples.len(), SURFACES.len(), "one sample per surface");
        for (surface, sample) in SURFACES.iter().zip(samples) {
            let rendered = (surface.render)("1.2.3", sample.trim_start());
            assert_eq!(
                rendered.trim_start(),
                sample.trim_start(),
                "{} render not idempotent",
                surface.path
            );
        }
    }

    /// A required surface whose file no longer spells its line fails the
    /// command instead of being skipped; an optional one may spell none.
    #[test]
    fn a_required_surface_without_its_line_fails() {
        let required = Surface {
            path: "crate/Cargo.toml",
            starts: "version = \"",
            render: |v, _| format!("version = \"{v}\""),
            required: true,
        };
        let optional = Surface {
            required: false,
            ..required
        };
        let reworded = "[package]\nname = \"crate\"\nversion.workspace = true\n";
        let (outcome, text) = sync_text(&required, reworded, "1.2.3");
        assert_eq!(outcome, Outcome::Missing);
        assert_eq!(text, reworded, "nothing to rewrite");
        assert!(
            fails(&required, &outcome),
            "a required surface is never skipped"
        );
        assert!(
            !fails(&optional, &outcome),
            "an optional surface may spell none"
        );

        let (outcome, text) = sync_text(&required, "[package]\nversion = \"1.2.2\"\n", "1.2.3");
        assert_eq!(
            outcome,
            Outcome::Drift {
                old: String::from("version = \"1.2.2\""),
                new: String::from("version = \"1.2.3\"")
            }
        );
        assert_eq!(text, "[package]\nversion = \"1.2.3\"\n");
        assert!(!fails(&required, &outcome));
        let (again, _) = sync_text(&required, &text, "1.2.3");
        assert_eq!(again, Outcome::InSync);
        assert!(!fails(&required, &again));
    }

    /// Every surface is required, and each file of this tree spells its
    /// line, so `--check` judges all of them.
    #[test]
    fn every_surface_is_required_and_spelled_in_this_tree() {
        let root = crate::repo_root();
        for surface in SURFACES {
            assert!(surface.required, "{} is optional", surface.path);
            let text = std::fs::read_to_string(root.join(surface.path)).expect(surface.path);
            let (outcome, _) = sync_text(surface, &text, "0.0.0");
            assert_ne!(
                outcome,
                Outcome::Missing,
                "{} spells no `{}` line",
                surface.path,
                surface.starts
            );
        }
    }
}
