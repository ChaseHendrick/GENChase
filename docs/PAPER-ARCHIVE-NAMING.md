# Paper ZIP names

From the owner's 2026-10-03 decision, newly released paper archives use
`HendrickResearch_<paper-id>_<version>.zip`, for example `HendrickResearch_cardiac-rings_1.1.1.zip`.
The ZIP contains one root with the same stem, and the exact committed companion files beneath it. This changes
the package name and wrapper only. Authorship, paper text, account names, licensing, historical versions and DOIs
remain as recorded. The default publisher does not replace existing published archives or release assets.
The owner separately authorized a wrapper-only correction of current published downloads on 2026-10-03;
that bounded correction preserves all contained file bytes and records the old and new package hashes.

## Build and GitHub release

`tools/paper-archive-build.py` builds from a committed companion ref:

```sh
python3 tools/paper-archive-build.py <id> <version> <companion-checkout> <new-output-directory> <ref>
```

It preserves every regular tracked file byte-for-byte, checks the registered complete PDF, refuses omitted or
substituted Git archive members, unsafe paths, symlinks and existing output files, and writes a deterministic ZIP
and external `.manifest.json`. The manifest binds the exact commit, tree, PDF, full file hash map and ZIP hash.
Determinism is checked within the same Python/compression runtime. This is packaging, not a proof or a new release.

For a future release, `tools/paper-publish.sh` requires its existing quality gates plus
`PAPER_ARCHIVE_MODE=manual-zenodo` and `ZENODO_GITHUB_INTEGRATION_DISABLED=true`. The latter is an explicit owner's
confirmation, recorded in the asset manifest, not an API verification or an instruction that changes the integration.
In the publish-papers workflow, check the matching confirmation input only after disabling automatic import for
that prospective release. The script then attaches the branded ZIP and its external manifest to the new GitHub
release. Existing published versions keep their previous behavior and immutable assets.

GitHub's automatic source-code ZIP/tarball downloads retain GitHub's service-generated naming. The branded ZIP is
a curated release asset. [GitHub's source archive documentation](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives)
distinguishes these from uploaded release assets.

## Manual Zenodo deposit of the same ZIP

The current integration archives the GitHub source ZIP. A custom release asset does not itself establish that
Zenodo will deposit it with its custom filename; the [Zenodo project issue](https://github.com/zenodo/zenodo/issues/1728)
records that limitation. `.zenodo.json` describes metadata, not the service-generated source filename.

Before creating a future GitHub release, the owner must disable the companion's automatic GitHub import in Zenodo
for this route. Neither the builder nor publisher performs that remote setting change. If this prerequisite or the
manual route is absent, a new release is refused before companion content is pushed. Existing archives stay up.

After all applicable quality obligations are met and the new GitHub release is created:

1. Download the branded ZIP and manifest assets from that exact release. Check the ZIP SHA-256 against the manifest,
   the tag commit and the reviewed complete file map. Keep the manifest and release receipt for the subsequent audit.
2. In the owner's existing Zenodo record family, create a **new version** draft. This retains the concept DOI while
   giving the eventual new version its own version DOI. For a first paper archive, prepare a new record draft instead.
3. Inspect the unpublished draft carefully. Remove only copied old files from this new draft, and upload the exact
   branded ZIP without renaming or recompressing it. This prospective route does not edit published records.
4. Retain the paper's author, title, contact, component rights and Publication / Preprint metadata; set the actual new
   version and check the exact upload filename. Review the draft before any publication action. The repository tools
   do not create, upload or publish a Zenodo deposit automatically.
5. After the owner publishes that draft, download the actual new record's ZIP. Require its file key to equal
   `HendrickResearch_<id>_<version>.zip`, its ZIP hash to match the GitHub asset, and its complete members/PDF to match
   the reviewed manifest. Confirm the record belongs to the intended concept family and version and has the correct
   Publication / Preprint type. A success of the GitHub release workflow is not evidence this deposit is complete.
6. Only after this actual audit, advance the registry's `archiveVersion`, `codeDoi` and `archiveFilename` together.
   `archiveFilename` must equal the branded filename for that exact verified version. The read-only
   `paper-zenodo-check.py` then refuses a missing, wrong or additional ZIP for that registered branded archive.
   Entries without this new field retain legacy archive checks; their historical records are not relabelled.
   This scanner checks filename, the exact branded root and rooted PDF, and publication metadata. Complete member-map and ZIP-byte verification against
   the reviewed release manifest is a separate required archive audit; a scanner pass does not replace it.

Bind the reviewed released manuscript separately from a newer working draft with
`archiveManuscript`: exactly the string fields `version`, `doi`, `path`, `tagCommit` and `sha256`.
`version` and `doi` must equal `archiveVersion` and `codeDoi`; `path` is the safe companion-relative
registered PDF path, such as `paper/cardiac-rings.pdf`. `tagCommit` is the exact 40-character lowercase
commit of the independently verified immutable release tag, and `sha256` is the exact 64-character
lowercase digest of its released PDF, checked against the complete published payload map.

The scanner uses this reviewed published PDF digest as its reference and reports the working PDF digest
separately. A different working draft does not invalidate an unchanged published release. A missing binding
retains the legacy exact working-PDF comparison; a declared malformed or stale binding is refused before
network access, without fallback. `matchesExpectedPdf` controls acceptance; `matchesRepository` records
whether the released PDF also equals the current working PDF. Bound archives must also carry the exact
declared tag commit as their ZIP comment. That identifier is checked alongside the exact PDF digest;
it does not replace the separate complete-member and actual immutable-tag audit or constitute a fresh
remote tag lookup.

The publisher does not advance these archive registry fields when it creates a GitHub release. Until the new
deposit is actually verified they continue to name the previous verified archive. When that reference advances,
refresh all five `archiveManuscript` fields together with the verified version, DOI and filename. A retained
old version, DOI or path causes refusal; do not silently discard a binding to bypass the release reference.

The [Zenodo upload API documentation](https://developers.zenodo.org/#quickstart-upload) specifies the selected upload
filename in the bucket URL. It provides a future API route if separately requested and reviewed; no token, upload,
publication or integration-setting mutation was performed to implement this naming policy. Actual new Zenodo
publication remains a later authorized release action, with an unpublished draft and exact bytes available for review.

## Current published downloads: separately authorized minor correction

The owner requested that current ZIP downloads also use the brand on 2026-10-03. Build from the immutable
published tag or rewrap the checksum-verified published ZIP, never from a newer working manuscript. Compare the
complete old and new relative member hash maps and retain both archives plus the equivalence receipt. Only the
ZIP filename/root and container serialization may differ; file payloads, DOI, version and licensing stay unchanged.
A curated asset may be attached to an existing nondraft GitHub release using `gh release upload <tag> <zip> -R <repo>`
without `--clobber`, after confirming its tag and complete contents. This is separate from the default sync publisher.
GitHub's built-in Source code downloads remain service-controlled.

[Zenodo's current file-management guidance](https://help.zenodo.org/docs/deposit/manage-files/#modify)
permits minor file corrections within 30 days after publication, with the correction draft published within
45 days of the original publication. That route retains the DOI. Check the actual record date and available owner
controls first; these time limits do not establish permission or completion for a particular record. Outside that
supported route, use a reviewed new-version draft or the documented justified support process as applicable.
For this owner-authorized wrapper correction, retain the original ZIP locally, upload the exact verified branded
package in the supported correction draft, and check the actual published file key, whole ZIP hash, complete member
hash map, PDF and unchanged version/DOI afterward. No new scientific or quality-standard adoption claim follows.
The implementation does not perform that correction remotely or create credentials.

## Network-free controls

```sh
python3 tools/paper-archive-build-check.py
node tools/paper-publish-check.js
python3 tools/paper-zenodo-check.py --self-test
```

Controls include repeat byte-identical builds, exact member/PDF coverage, existing-output refusal, malformed names,
unsafe/symlink/duplicate/missing/changed members, excluded files, a truncated PDF, missing manual-route confirmation,
unchanged legacy release behavior and actual-file-key mutations on synthetic Zenodo responses. Fixtures are not
deposits or proof certificates. No test publishes a remote release or changes an existing archive.
