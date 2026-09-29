# Manuscript PDFs in the Zenodo source archives

Checked 2026-09-29 by downloading the ZIP from each of the eight version records, opening it,
and comparing its manuscript PDF with the registered repository PDF at main commit `1a0f5df`.
Seven contain the PDF and match byte for byte. The hh-pulse 1.0.1 ZIP contains no manuscript PDF. Its existing releases stay up.
GENChase itself is not archived on Zenodo.

This corrects the uncertainty in the session handoff: the other seven archives do not need replacement
just to add their PDFs. The corrective companion release is hh-pulse 1.0.2. The owner subsequently requested consistent
title capitalization; rank-window also gets a 1.0.2 release for that formatting correction.

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
