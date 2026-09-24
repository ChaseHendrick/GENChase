# Submission checklist: the minimal-winding paper

The paper is *Minimal winding in the self-similar collapse of three point vortices and of two
concentric vortex polygons*, in [`../unequal-mu-n5-floors-2026-09-23.typ`](../unequal-mu-n5-floors-2026-09-23.typ)
(the reference text) and [`../unequal-mu-n5-floors-2026-09-23.tex`](../unequal-mu-n5-floors-2026-09-23.tex).
The target is arXiv (physics.flu-dyn) and then *Regular and Chaotic Dynamics*. Checked 2026-09-24
from the repository alone; no journal or arXiv page was consulted.

The second draft, [`../alpha-winding-2026-09-24.typ`](../alpha-winding-2026-09-24.typ), is not
covered here: the changelog records that it has not been peer reviewed and is not cleared for
submission.

## Ready

- The manuscript in both formats, with the figure `research/figures/minimal-winding.pdf` and a
  repository build of the Typst PDF, `research/artifacts/unequal-mu-n5-floors-2026-09-23.pdf`
  (13 pages).
- The LaTeX and Typst texts cite the same 23 works in the same places. Every work cited in the
  LaTeX source has an entry in its own bibliography, and every entry is cited.
- A data availability paragraph naming the verification programs in `research/`, and the statement
  "This work was prepared with AI assistance. The author takes full responsibility for its content."
- The arXiv metadata in [arxiv-metadata.md](arxiv-metadata.md): title, author, categories, MSC
  classes, comments, license, and an abstract that matches the manuscript's abstract (1,636
  characters against the 1,920 limit it states).
- Drafts of the [endorsement request](endorsement-request.md) and the
  [cover letter](cover-letter-rcd.md), and the procedure for the
  [private copies with an email](PRIVATE-COPIES.md).

## Missing, and only the owner can supply it

| Where | Placeholder | What goes there |
|---|---|---|
| endorsement-request.md | `Dr. [Name]` | One endorser who has posted recent point-vortex papers to physics.flu-dyn or math.DS |
| endorsement-request.md | `[ENDORSEMENT CODE]` | The code arXiv shows when you start the submission |
| endorsement-request.md, cover-letter-rcd.md | `[your email]` | Your address, only in the copy you send |
| cover-letter-rcd.md | `[arXiv identifier]` | The identifier arXiv assigns after the preprint is announced |
| cover-letter-rcd.md | three `[name, affiliation, email]` lines | Suggested reviewers you have chosen, if the journal asks for them; this file deliberately names none |
| private copies | the email line | Built outside the repository as PRIVATE-COPIES.md describes |

## Inconsistencies to resolve first

1. **Page count. Resolved 2026-09-24.** The LaTeX build has 13 pages, both the repository `.tex` and
   a private copy with the email line, built with pdflatex (TeX Live 2023) three times and no warnings.
   The "Comments" line in `arxiv-metadata.md` and `PRIVATE-COPIES.md` said 12 and now say 13.
   `node tools/paper-check.js` repeats this check wherever pdflatex is installed.
2. **`identities/refs.bib` disagreed with the manuscript's bibliography** on three works cited in
   both. **Resolved 2026-09-24:** `refs.bib` now matches the manuscript, checked against the JPSJ
   page for Kimura (doi:10.1143/JPSJ.56.2024) and the English translation of Gröbli (arXiv:2404.01305).
   The entry key `Gotoda2020` is kept so that existing citations still resolve. The manuscript is not built from `refs.bib` (it serves the identities note), but the two
   should agree. Check each against the source and fix whichever is wrong:
   - Gotoda: `refs.bib` (`Gotoda2020`) gives the year 2020 and no volume or pages; the manuscript
     gives J. Dyn. Differ. Equ. 33 (2021) 1759-1777.
   - Kimura: `refs.bib` gives the title "Similarity solutions of two-dimensional point vortices";
     the manuscript gives "Similarity solution of two-dimensional point vortices".
   - Gröbli: `refs.bib` gives "Spezielle Probleme ..." with school Zürich; the manuscript gives
     "Specielle Probleme ...", Inaugural-Dissertation, Göttingen; Zürcher und Furrer, Zürich.
3. **The cover letter's statement** that the manuscript "has not been published and is not under
   consideration elsewhere" is yours to confirm on the day you send it.

## Next steps, in order

1. Resolve the three items above in a pull request.
2. Read the current author instructions of *Regular and Chaotic Dynamics*, including its policies on
   AI assistance, suggested reviewers, preprints and the preferred source format. Nothing in this
   repository records those policies.
3. Build the private copies (PRIVATE-COPIES.md) and run its checks before any commit, push or
   release.
4. Start the arXiv submission to physics.flu-dyn with the fields in arxiv-metadata.md. arXiv shows
   an endorsement code.
5. Send the endorsement request to one person, with the code and the private PDF. Wait for the
   endorsement before asking anyone else.
6. Complete the submission. When arXiv announces it, record the identifier in
   `cover-letter-rcd.md` in a pull request (the identifier is public; the email is not).
7. Choose suggested reviewers if the journal asks for them, fill the three lines only in the copy
   you send, and submit the manuscript with the cover letter through the journal's own system.
8. Record the arXiv identifier and the submission date in `CHANGELOG.md`, and move item 1b of
   [RESEARCH-GRADE.md](../../docs/RESEARCH-GRADE.md) to Done once the manuscript is submitted.
