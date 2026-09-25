# Submission checklist: the minimal-winding paper

The paper is *Minimal Winding in the Self-Similar Collapse of Point Vortices*, in [`../paper/minimal-winding.tex`](../paper/minimal-winding.tex)
(the manuscript and its only source, built as [`../paper/minimal-winding.pdf`](../paper/minimal-winding.pdf); the Typst copy was dropped on 2026-09-25).
The target is arXiv (physics.flu-dyn) and then *Regular and Chaotic Dynamics*. Checked 2026-09-24
from the repository alone; no journal or arXiv page was consulted.

By the owner's decision (2026-09-25) the second draft, on the α-models, is merged into this paper
(Section 4 and part of Section 7), together with the computer-assisted proofs for four or more vortices.
Its reading list in [../../READING-LIST.md](../../READING-LIST.md) now belongs to this paper.

## Ready

- The manuscript, with the figures `paper/figures/minimal-winding.pdf`,
  `paper/figures/minimal-winding-paths.pdf` and `paper/figures/alpha-winding.pdf`, and its LaTeX build
  `paper/minimal-winding.pdf` (36 pages since Proposition 4, the bound at a fixed circulation for weak pairs, was added on 2026-09-25), the same PDF arXiv will build. The author block
  carries the contact email (owner's decision, 2026-09-24).
- The bibliography has 36 works. Every work cited in the LaTeX source has an entry, and every entry is
  cited.
- A data availability paragraph naming the verification programs in `code/` and their output in
  `data/`, a funding statement (no external funding), and the statement
  "This work was prepared with AI assistance. The author takes full responsibility for its content."
- The arXiv metadata in [arxiv-metadata.md](arxiv-metadata.md): title, author, categories, MSC
  classes, comments, license, and an abstract that matches the manuscript's abstract (1,875
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
2. **Done 2026-09-25.** The code DOI of release v2.0.0, 10.5281/zenodo.22963796, is in the data
   availability paragraph and in `papers.json` (`codeDoi`), and the PDF is rebuilt.
3. Make the upload with `sh tools/arxiv-bundle.sh minimal-winding` and submit it to physics.flu-dyn
   with the fields in arxiv-metadata.md.
4. When arXiv announces it, record the identifier in `cover-letter-rcd.md` and in
   `papers/papers.json` (status `on-arxiv`) in a pull request.
5. Choose suggested reviewers if the journal asks for them, fill the three lines only in the copy
   you send, and submit the manuscript with the cover letter through the journal's own system.
6. Record the arXiv identifier and the submission date in `CHANGELOG.md`, and move item 1b of
   [RESEARCH-GRADE.md](../../../docs/RESEARCH-GRADE.md) to Done once the manuscript is submitted.
