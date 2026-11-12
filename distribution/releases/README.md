# Release manifests

One file per public engine release: `vX.Y.Z.json`. It holds the tag, its commit and the hash of
every public file of that release, read from the public addresses.

Recipes, demos, integrations and consumer checks pin some of these values: the checksum list of
the release, an archive, the executable inside it, a wheel, the browser module. The manifest is
where such a value comes from, so a new release is one file to read, not a search through the
repository.

## What a manifest holds

| Key | What it is | Read from |
| --- | --- | --- |
| `tag`, `version`, `tag_object`, `commit` | The release tag and the commit it points to. | The repository, with `git ls-remote`. |
| `source_date_epoch` | The commit time that every prebuilt archive records. | `build-info.json` in each archive. |
| `release.checksums` | The checksum list of the GitHub release. | The release download address. |
| `release.assets` | Each file the list names: hash and size. A prebuilt archive also gives its target and the hash of the executable it contains. | The same address; the archive is opened in memory. |
| `crates` | The two crates: hash and size of each `.crate` file. | `static.crates.io`, checked against the cksum of the crates.io index. |
| `npm` | The Node package, the platform packages it depends on and the browser package: integrity, shasum and size of each tarball. The browser package also gives the hash of its WebAssembly module. | `registry.npmjs.org`. |
| `pypi` | Every file of the Python package: hash, size and address. | `pypi.org`. |

Every hash is computed from the downloaded bytes, then compared with what the place declares. A
yanked crate or file, an archive built from another commit and a tarball on a foreign address
are refused.

A manifest has no date and no machine detail: the same release always gives the same bytes.

## Use it

```sh
# After a release is public: write its manifest, once.
python3 scripts/release-manifest.py build --tag vX.Y.Z --out distribution/releases/vX.Y.Z.json

# At any time: read the public release again and compare.
python3 scripts/release-manifest.py verify distribution/releases/vX.Y.Z.json
```

Both read the public addresses anonymously and download about 70 MB. Nothing is built, installed
or published. `verify` names each value that differs. A difference means a public file or a
registry answer changed after the manifest was written: find out why before changing the file.

A manifest is written once and never edited by hand. The workflow
[`release-manifest.yml`](../../.github/workflows/release-manifest.yml) runs the program's
self-test and `verify` on every pull request that touches this folder or the program.

The container image, the Linux packages, the AppImage and the hosted examples have their own
tags and are not in this file. The image keeps its own record,
[`docker/v0.11/release-0.11.0.json`](../docker/v0.11/release-0.11.0.json).
