# Classical vortex bounds

> [!IMPORTANT]
> **Zero confirmed novel findings.** The three-vortex formula specializes Gröbli’s 1877 spiral coefficient, and its closed form is the ratio of the rates Kimura gives in J. Phys. Soc. Jpn. 56 (1987), Eq. (4.4). The remaining entries are bounds on classical families; their historical originality is unconfirmed.

The note and statement files were corrected on 2026-09-21 to remove personal naming and unsupported priority claims. The mathematics remains under descriptive labels with classical attribution. Since 2026-09-27 the note's results are proved in the paper *Minimal Winding in the Self-Similar Collapse of Point Vortices* ([`papers/minimal-winding/`](../papers/minimal-winding/), release 2.2.0, prepared), and the note's retirement as a record of its own is proposed, pending the owner's decision (below).

| File | Status | Contents |
|---|---|---|
| [note.pdf](note.pdf) | ⚪ Dated note, unchanged | The note of 2026-09-21, as refingerprinted on 2026-09-25: three classical collapse-family formulas, elementary bounds and attribution limits. Read with the errata below |
| [note.typ](note.typ) | ⚪ Dated note, unchanged | Typst source of that note |
| [STATEMENTS.txt](STATEMENTS.txt) | ⚪ Dated statements, unchanged | Plain-text formulas of the same note; project dates are not first-discovery dates. Read with the errata below |
| [HASHES.txt](HASHES.txt) | 🔵 File fingerprints | SHA-256 of `note.pdf`, `note.typ`, `STATEMENTS.txt` and the statement blocks |
| [COMMITMENTS.txt](COMMITMENTS.txt) | 🔵 Hash commitments | Salted hashes of unpublished results, timestamped before they are revealed ([docs/COMMITMENTS.md](../docs/COMMITMENTS.md)) |
| [NOVELTY-AUDIT.md](NOVELTY-AUDIT.md) | 🟠 Originality unconfirmed | Evidence, overlaps and remaining literature gaps |
| [ORIGINALITY-FOLLOWUP.md](ORIGINALITY-FOLLOWUP.md) | 🔵 Source comparison | Explicit reduction to Gröbli’s original formula |
| [ARXIV.md](ARXIV.md) | 🔵 Publication guidance | Attribution requirements and limits on priority claims |
| [zenodo.json](zenodo.json) | 🟠 On hold | Metadata of the planned Zenodo record of the note, kept until the owner decides on its retirement |

The live derivations are in [IDENTITIES.md](../IDENTITIES.md). Anyone may use the mathematics. Cite the paper and the classical sources. File hashes and repository timestamps establish provenance, not novelty.

## Proposed retirement of the note (2026-09-27), pending the owner's decision

The note's results are proved in the minimal-winding paper, release 2.2.0 (prepared, not yet made), with fuller credits, and the same result should not appear in two records as if it were new in each ([docs/PUBLISHING-PAPERS.md](../docs/PUBLISHING-PAPERS.md), "Several papers at once"). The pull request of 2026-09-27 that moved them therefore proposes to retire the note and to drop its planned Zenodo record. The owner decides what is published, so nothing is dropped yet: `papers/papers.json` keeps the `identities-note` entry at "preparing", [zenodo.json](zenodo.json) and [ARXIV.md](ARXIV.md) stay, and the upload below is on hold until the owner confirms or declines.

Where each result now is, in the paper (release 2.2.0):

- **Three-vortex collapse bound** (√2 on Γ = (1, 1, −1/2)): Remark 2, with Theorem 1(b) and Corollary 1. Over every self-similar collapse of three vortices the paper's bound is √3/2; √2 is its end at equal circulations. Remark 2 also has the form P = u + 1/(2u), the minimizing triangle and the reduction to Gröbli's coefficient.
- **Parallelogram lock**: Proposition 2 with n = 2, and the table after it.
- **Quincunx lock**: the example after Proposition 3 (the configuration of Gotoda's Fig. 3(b)).
- **Double triangle and squares**: Proposition 2 with n = 3 and n = 4, and the table.
- **F₅ = √31682/80**: after Proposition 2.
- **μ = 1/2**: Proposition 1 and Remark 1, with the minimizing cosines in closed form.
- **The growth of F_n**: Section 5, after Proposition 2, with a full proof of F_n = (1/4) e^√(n/2) (1 + 29/(12√(2n)) + 265/(576n) + O(n^(−3/2))).
- **The five-vortex slice that gives the three-vortex product**: after Proposition 3 (central circulation 1/2).

`note.pdf`, `note.typ` and `STATEMENTS.txt` (fingerprinted in [HASHES.txt](HASHES.txt), last on 2026-09-25 after changes that were not mathematical) and `refs.bib` (not fingerprinted) are kept unchanged. They are the note of 2026-09-21, as refingerprinted on 2026-09-25; HASHES.txt records the refingerprinting of 2026-09-24 (twice) and 2026-09-25, and refs.bib was corrected on 2026-09-24.

**Errata of the note**, recorded here so that the fingerprinted files stay unchanged:

- The set-up formula A + iB = (i/(2π z_m)) Σ Γ_n/(z̄_m − z̄_n) divides by z_m, not by z_m − z_c. It is undefined where a vortex sits at the origin: z_1 = 0 in the three-vortex family, whose center of vorticity is not the origin, and z_5 = 0 in the quincunx. Section 2 of the paper has the correct form.
- The law is called a "2π-periodic Biot–Savart law". Nothing in it is periodic; the 2π is the normalization.
- The product ω_0 t_c = −B/(2A) is signed. For the parallelogram and the quincunx in their collapsing orientation ω_0 < 0, and the product is negative (−1.6771… and −1.0771… at the minima). The positive expressions the note prints are |ω_0| t_c, which the paper calls P.
- The title writes ω t_c for ω_0 t_c.
- Kimura 1987, Eq. (4.4), whose rate ratio is the three-vortex formula, is not credited (the note cites Kimura 1987 only for the self-similar set-up and the scale invariance of −B/(2A)).
- The spiral pitch is credited to Aref (2010) alone; Novikov and Sedov (1979, p. 298) and Conte and de Seze (1980) are earlier.
- The fastest collapse t_c = 4π/3 is credited to Leoncini, Kuznetsov and Zaslavsky (2000) alone; Kimura 1987, Eq. (4.6), is earlier.
- `STATEMENTS.txt` lines 12 to 16 are an orphaned fragment of a header, and their last sentence ("Restating a product or a floor after the dated first-public line, without citing this file, is claiming this project's work") is superseded priority wording. It conflicts with the zero-novelty record and is withdrawn.

The plates `#parallelogram-lock` and `#quincunx-lock` printed the signed wording of the third erratum until 2026-09-27; their equation and credit lines now say |ω₀| t_c.

**Dates and priority.** A commit, release, DOI, date or file hash dates this project's file. It does not establish first discovery. Do not describe the note, or the paper, as the first publication of these results without independent historical evidence.

## Uploading the note as its own Zenodo record (on hold)

**On hold since 2026-09-27, pending the owner's decision on the proposed retirement above. Do not upload the note until the owner has decided.** If the owner keeps the separate record, the errata above have to be dealt with first, by an erratum sheet uploaded with the note or by a corrected note refingerprinted in HASHES.txt, since an upload of the note as it stands would publish them. The description in [zenodo.json](zenodo.json) uses the same signed ω₀ t_c and would need the same correction.

The repository's `.zenodo.json` describes the software, so Zenodo's GitHub integration archives each release as software. The note is a separate, manual upload whose metadata is in [zenodo.json](zenodo.json). Only the owner can do this, because it needs the owner's Zenodo account.

1. Confirm the files are the fingerprinted ones: `cd identities && sha256sum note.pdf note.typ STATEMENTS.txt` must print the three file fingerprints in [HASHES.txt](HASHES.txt).
2. Sign in at zenodo.org and start a new upload. Do not use the GitHub integration for this record.
3. Attach `note.pdf`. Attaching `note.typ`, `STATEMENTS.txt` and `HASHES.txt` as well lets a reader rebuild and check it.
4. Fill the form from [zenodo.json](zenodo.json): resource type Publication, subtype Preprint (the note has not been peer reviewed); the title, which matches the PDF; creators; description; keywords; and the related identifier to the repository. Choose the license yourself: the JSON leaves it out because the repository does not state a license for the note.
5. Publish, then record the DOI in a pull request: in `IDENTITIES.md`, in `papers/papers.json` and as a reference in `CITATION.cff` (as `doi:`). If the software already has a DOI, add a related identifier from the note's record to it on Zenodo.

A DOI dates this project's file. It does not establish first discovery; [ARXIV.md](ARXIV.md) sets the limits on what the record may claim.
