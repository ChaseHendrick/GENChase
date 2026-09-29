# Manuscript PDFs in the Zenodo source archives

Checked 2026-09-29 by downloading the ZIP from each of the eight version records, opening it,
and comparing its manuscript PDF with the registered repository PDF at main commit `1a0f5df`.
Seven contain the PDF and match byte for byte. The hh-pulse 1.0.1 ZIP contains no manuscript PDF. Its existing releases stay up.
GENChase itself is not archived on Zenodo.

The original missing-PDF defect affects hh-pulse only. The broader publication audit also found stale
archive references and incomplete citation metadata. All eight therefore receive a patch release with
a rebuilt PDF and corrected publication metadata: minimal-winding 2.2.2, hh-dynamics and nf-pulse 1.0.3,
and the other five companions 1.0.2. These changes do not alter the scientific claims.

| Paper | Existing version DOI | Manuscript in ZIP | Matches repository PDF |
|---|---|---|---|
| minimal-winding | [10.5281/zenodo.23028524](https://doi.org/10.5281/zenodo.23028524) | Yes | Yes |
| collapse-without-rotation | [10.5281/zenodo.23028527](https://doi.org/10.5281/zenodo.23028527) | Yes | Yes |
| stable-expansion | [10.5281/zenodo.23028532](https://doi.org/10.5281/zenodo.23028532) | Yes | Yes |
| rank-window | [10.5281/zenodo.23028535](https://doi.org/10.5281/zenodo.23028535) | Yes | Yes |
| hh-dynamics | [10.5281/zenodo.23028513](https://doi.org/10.5281/zenodo.23028513) | Yes | Yes |
| double-pendulum | [10.5281/zenodo.23028523](https://doi.org/10.5281/zenodo.23028523) | Yes | Yes |
| nf-pulse | [10.5281/zenodo.23028520](https://doi.org/10.5281/zenodo.23028520) | Yes | Yes |
| hh-pulse | [10.5281/zenodo.23028512](https://doi.org/10.5281/zenodo.23028512) | No | No PDF |

The [machine-readable audit](paper-archive-audit-2026-09-29.json) records the download URLs, ZIP
SHA-256 digests, manuscript members and manuscript SHA-256 digests. The download checksum was also
compared with the checksum supplied by Zenodo.

Reproduce against the version DOIs currently registered in `papers/papers.json`:

```sh
python3 tools/paper-zenodo-check.py --out /tmp/genchase-paper-archives.json
```

Exit status 1 means at least one archive could not be fetched, lacks its registered manuscript, or
contains a different PDF. A PDF mismatch can be an intentional later revision; the report is a byte
comparison, not a scientific judgment. No remote data is changed.

## Pulse PDF

`papers/hh-pulse/paper/hh-pulse.pdf` was built from the existing Markdown (title capitalization corrected) with Pandoc 3.6.1
and Tectonic 0.17.0. It has 14 pages. All 19 distinct decimal literals with at least 12 digits after
the decimal point are present in extracted PDF text; the counts of y*, u*, K* and v^* also match.
Every page was checked for characters outside the safe print margins, and representative pages were
visually inspected. The title was capitalized consistently; no theorem, proof program or certificate was changed or rerun for this packaging fix.

The publisher now checks the companion's actual Git source ZIP before pushing a new release's tree.
The local publisher tests include missing registration, missing PDF, truncated PDF and export-ignore
controls. This gate does not establish scientific validity or that a PDF was freshly rebuilt.

## Publication completeness audit

All eight PDFs open and contain selectable text. Their visible title, PDF title metadata, author name
and ORCID match the registry. All fonts used by the pages and figure resources are embedded. No PDF
contains an unresolved-reference marker (`??`), a replacement character, a text-empty page, or a text
glyph within 18 points of a left/right edge or 12 points of a top/bottom edge. These are mechanical
checks, not a proof that every equation or figure is correct. Seven existing manuscripts include the
contact email; the pulse Markdown author line has never included it. No email was removed.

| Manuscript | Pages |
|---|---:|
| minimal-winding | 42 |
| collapse-without-rotation | 25 |
| stable-expansion | 20 |
| rank-window | 16 |
| hh-dynamics | 30 |
| double-pendulum | 23 |
| nf-pulse | 39 |
| hh-pulse | 14 |

[PDF audit details](paper-pdf-audit-2026-09-29.json) record the font, title and checksum checks. All distinct
decimal values with at least three digits after the decimal point extracted from the seven previous PDFs
remain present in the rebuilt PDFs after normalizing extraction whitespace. Representative first, middle
and final pages from all eight PDFs were visually inspected. The collapse paper now occupies 25 pages
with the added archive locator.

Two publication safeguards needed correction:

1. The existing-DOI exception in `paper-check.js` kept an old archive available but also excused open
   quality items before a new release. `--release` now requires every item to be closed with evidence;
   ordinary historical checks still retain the archive. The publisher runs this stricter check before
   making a new release. None of the eight current quality records was edited or newly approved here.
2. Seven unfinished pulse stability/temperature-strip programs were included in earlier companion
   archives, despite `resume/RESUME.md` saying they were unverified and should stay out of the 1.0.0
   landing. `stab_record.py` imports `prove_pulse`, which is absent. These exploratory files remain
   in GENChase, explicitly excluded from new companion snapshots with `companionExclude`. The
   published existence-proof programs and certificates are not removed or altered.

A fresh review of the mathematics and fresh runs of the long proof integrations are outside this pass.
The quality records, prior readings and stored certificates are evidence to review, not substitutes for
those future checks. The old archives remain accessible and unchanged.

## Published GitHub release ZIPs

The eight publication patch releases listed above were published through the companion workflow.
Their public GitHub source ZIPs were downloaded independently after publication. Every ZIP contains
the registered PDF with an identical SHA-256 digest and `.zenodo.json` set to Publication / Preprint,
with the exact registered title. [Download evidence](paper-github-release-audit-2026-09-29.json)
records each release, ZIP hash and manuscript hash.

The pulse publisher initially stopped on a conflict with an older direct `CITATION.cff` edit. That
citation was reconciled with the registered title, companion URL and checking-release DOI; a local
trial merge and source-archive check passed, then the normal publisher was rerun successfully.
The public tags and previously published archives were not modified.

Zenodo verification is a separate step. A successful GitHub release or a received webhook does not
establish that the new Zenodo version has finished publishing.
