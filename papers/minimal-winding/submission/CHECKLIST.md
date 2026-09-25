# Submission checklist: the minimal-winding paper

The paper is *Minimal winding in the self-similar collapse of three point vortices and of two
concentric vortex polygons*, in [`../paper/minimal-winding.tex`](../paper/minimal-winding.tex)
(the manuscript, built as [`../paper/minimal-winding.pdf`](../paper/minimal-winding.pdf)) and its Typst copy
[`../paper/minimal-winding.typ`](../paper/minimal-winding.typ).
The target is arXiv (physics.flu-dyn) and then *Regular and Chaotic Dynamics*. Checked 2026-09-24
from the repository alone; no journal or arXiv page was consulted.

The second draft, [`../../alpha-winding/`](../../alpha-winding/), is not
covered here: the changelog records that it has not been peer reviewed and is not cleared for
submission.

## Ready

- The manuscript in both formats, with the figures `paper/figures/minimal-winding.pdf` and
  `paper/figures/minimal-winding-paths.pdf`, and its LaTeX build `paper/minimal-winding.pdf` (16 pages since
  Proposition 3, Remark 4 and Figure 2 were added on 2026-09-25), the same PDF arXiv will build. The author block
  carries the contact email (owner's decision, 2026-09-24).
- The LaTeX and Typst texts cite the same 26 works in the same places. Every work cited in the
  LaTeX source has an entry in its own bibliography, and every entry is cited.
- A data availability paragraph naming the verification programs in `code/` and their output in
  `data/`, a funding statement (no external funding), and the statement
  "This work was prepared with AI assistance. The author takes full responsibility for its content."
- The arXiv metadata in [arxiv-metadata.md](arxiv-metadata.md): title, author, categories, MSC
  classes, comments, license, and an abstract that matches the manuscript's abstract (1,816
  characters against the 1,920 limit it states).
- A draft of the [cover letter](cover-letter-rcd.md). No endorsement is needed: the author's arXiv
  account can submit to physics.flu-dyn.

## Missing, and only the owner can supply it

| Where | Placeholder | What goes there |
|---|---|---|
| cover-letter-rcd.md | `[arXiv identifier]` | The identifier arXiv assigns after the preprint is announced |
| cover-letter-rcd.md | three `[name, affiliation, email]` lines | Suggested reviewers you have chosen, if the journal asks for them; this file deliberately names none |

## Inconsistencies to resolve first

1. **Page count. Resolved 2026-09-24.** The LaTeX build has 13 pages, both the repository `.tex` and
   a copy with the email line, built with pdflatex (TeX Live 2023) three times and no warnings.
   The "Comments" line in `arxiv-metadata.md` said 12 and now says 13.
   `node tools/paper-check.js` repeats this check wherever pdflatex is installed.
2. **`identities/refs.bib`. Resolved 2026-09-24.** Checked against the publishers: the manuscript was right
   in all three places, and `refs.bib` now agrees. Gotoda: J. Dyn. Differ. Equ. 33 (2021) 1759-1777,
   doi 10.1007/s10884-020-09867-y. Kimura: "Similarity solution of two-dimensional point vortices",
   J. Phys. Soc. Jpn. 56 (1987) 2024-2030, doi 10.1143/JPSJ.56.2024. Groebli: "Specielle Probleme ...",
   Inaugural-Dissertation, Goettingen, printed by Zuercher und Furrer, Zuerich, 1877 (English
   translation arXiv:2404.01305). The entry key `Gotoda2020` is kept so that existing citations resolve.
3. **The cover letter's statement** that the manuscript "has not been published and is not under
   consideration elsewhere" is yours to confirm on the day you send it.

## Next steps, in order

0. Before the arXiv upload (license decided 2026-09-25: arXiv.org perpetual, non-exclusive):
   - Ask the *Regular and Chaotic Dynamics* editorial office in writing whether an arXiv posting counts
     as prior publication under its "not published previously" condition. Keep the reply.
   - Owner's decision (2026-09-25): the earlier drafts in the GENChase repository are not disclosed in the cover letter. The cover letter names the arXiv preprint. Answer any direct question on the submission form truthfully.
   - Finish the must-read items in [../../READING-LIST.md](../../READING-LIST.md).
1. Read the current author instructions of *Regular and Chaotic Dynamics*, including its policies on
   AI assistance, suggested reviewers, preprints and the preferred source format. Nothing in this
   repository records those policies.
2. Get the code DOI from a Zenodo release (docs/PUBLISHING-PAPERS.md, section 1) and put it in the
   data availability paragraph of both sources; rebuild with `sh tools/paper-build.sh minimal-winding`.
3. Make the upload with `sh tools/arxiv-bundle.sh minimal-winding` and submit it to physics.flu-dyn
   with the fields in arxiv-metadata.md.
4. When arXiv announces it, record the identifier in `cover-letter-rcd.md` and in
   `papers/papers.json` (status `on-arxiv`) in a pull request.
5. Choose suggested reviewers if the journal asks for them, fill the three lines only in the copy
   you send, and submit the manuscript with the cover letter through the journal's own system.
6. Record the arXiv identifier and the submission date in `CHANGELOG.md`, and move item 1b of
   [RESEARCH-GRADE.md](../../../docs/RESEARCH-GRADE.md) to Done once the manuscript is submitted.
