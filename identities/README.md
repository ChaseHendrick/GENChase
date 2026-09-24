# Classical vortex bounds

> [!IMPORTANT]
> **Zero confirmed novel findings.** The three-vortex formula specializes Gröbli’s 1877 spiral coefficient. The remaining entries are bounds on classical families; their historical originality is unconfirmed.

The note and statement files were corrected on 2026-09-21 to remove personal naming and unsupported priority claims. The mathematics remains under descriptive labels with classical attribution.

| File | Status | Contents |
|---|---|---|
| [note.pdf](note.pdf) | 🔵 Corrected note | Three classical collapse-family formulas, elementary bounds and attribution limits |
| [note.typ](note.typ) | 🔵 Maintained source | Rebuildable Typst source for the corrected PDF |
| [STATEMENTS.txt](STATEMENTS.txt) | 🔵 Corrected statements | Plain-text formulas; project dates are not first-discovery dates |
| [HASHES.txt](HASHES.txt) | 🔵 File fingerprints | SHA-256 of the corrected files and statement blocks |
| [NOVELTY-AUDIT.md](NOVELTY-AUDIT.md) | 🟠 Originality unconfirmed | Evidence, overlaps and remaining literature gaps |
| [ORIGINALITY-FOLLOWUP.md](ORIGINALITY-FOLLOWUP.md) | 🔵 Source comparison | Explicit reduction to Gröbli’s original formula |
| [ARXIV.md](ARXIV.md) | 🔵 Publication guidance | Attribution requirements and limits on priority claims |

The live derivations are in [IDENTITIES.md](../IDENTITIES.md). Anyone may use the mathematics. Cite the classical sources and this project when using its exposition or implementation. File hashes and repository timestamps establish provenance, not novelty.

## Uploading the note as its own Zenodo record

The repository's `.zenodo.json` describes the software, so Zenodo's GitHub integration archives each release as software. The note is a separate, manual upload whose metadata is in [zenodo.json](zenodo.json). Only the owner can do this, because it needs the owner's Zenodo account.

1. Confirm the files are the corrected ones: `cd identities && sha256sum note.pdf note.typ STATEMENTS.txt` must print the three file fingerprints in [HASHES.txt](HASHES.txt).
2. Sign in at zenodo.org and start a new upload. Do not use the GitHub integration for this record.
3. Attach `note.pdf`. Attaching `note.typ`, `STATEMENTS.txt` and `HASHES.txt` as well lets a reader rebuild and check it.
4. Fill the form from [zenodo.json](zenodo.json): resource type Publication, subtype Preprint (the note has not been peer reviewed); the title, which matches the PDF; creators; description; keywords; and the related identifier to the repository. Choose the license yourself: the JSON leaves it out because the repository does not state a license for the note.
5. Publish, then record the DOI in a pull request: in `IDENTITIES.md` and in the three note entries under `references` in `CITATION.cff` (as `doi:`). If the software already has a DOI, add a related identifier from the note's record to it on Zenodo.

A DOI dates this project's file. It does not establish first discovery; [ARXIV.md](ARXIV.md) sets the limits on what the record may claim.
