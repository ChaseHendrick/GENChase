# In-project readings of release 2.2.0 (2026-09-27)

This file records two adversarial readings, made inside the project, of what release 2.2.0 adds to the paper: the
results moved in from the identities note, the Chen–Walsh–Wheeler credit and the records that go with them (branch
`mw-identities`, commits 38094fe and c362620). Neither reading is an outside review, and nobody outside the project
has read these passages. The quality record, `QUALITY.md` item 6, summarizes this file.

## The readings

- **Scope.** Remark 2, the statement and proof of Proposition 1, the expansion of F_n and the examples after
  Proposition 3 in Section 5, the new rows of Table 1, the Meaning and limits paragraph, the two programs that check
  them (`verify_general_mu.py`, `verify_central_vortex.py`), and the records of the move: `papers/papers.json`,
  `QUALITY.md`, `RELEASES.md`, the paper's README, `CITATION.cff`, `CHANGELOG.md`, `RESEARCH.md`, `IDENTITIES.md`,
  `identities/` and the publishing docs.
- **Referees.** Two in-project referees, one reading the mathematics and one the claims and attribution, each told to
  find errors. At least one of them, by its own account, was briefed with the branch as a diff against main, the
  AGENTS.md rules and the files of `identities/`, not only with the paper and its programs, which is wider than the
  brief item 6 of the quality bar describes. The other's brief is not recorded here beyond its subject.
- **Verification of the findings.** Each serious finding was handed to an in-project skeptic told to refute it. The
  skeptic re-read the files at c362620 and the sources (Chen, Walsh and Wheeler, arXiv:2506.04093v1; Gotoda,
  arXiv:2002.09624v1; `identities/HASHES.txt`; the workflows) and recomputed every number. Ten findings were
  confirmed and one refuted.
- **Fixes.** Applied on the same day in the branch, after the readings. The fixes were checked by rerunning the two
  programs and rebuilding the PDF (below); they were not given a further reading.

The findings are listed in the order the readings returned them. F1 and F5 are the same defect, found by both.

## Findings

### F1 (must-fix, confirmed). Item 6 was ticked while its reading was still under way

- **Where:** `notes/QUALITY.md` item 6; `papers/papers.json` (status "ready"); `.github/workflows/papers.yml`.
- **Problem:** item 6 was checked, but its text said the 2.2.0 additions "are being read by in-project referees" and
  that the findings would go there later. AGENTS.md says not to check an item that is only planned. `paper-check`
  still passed, and the publish-papers workflow syncs every "ready" paper to its public companion on a push to main
  that touches `papers/**`, so a merge would have published the unread additions, and a RELEASES.md headed
  "2.2.0 (unreleased)", before the readings were recorded.
- **Skeptic:** confirmed. `paper-check` printed "OK minimal-winding [ready]" and "the quality bar is met";
  `paper-sync.js` selects papers by status only; the sentence "release 2.2.0 is not made before they are recorded"
  covered only the Zenodo release, not the sync.
- **Fix:** item 6 now records these readings (this file), the papers.json note and the RELEASES.md sentence are
  rewritten, and the status stays "ready" only because the record is now complete.

### F2 (should-fix, confirmed). The configurations Chen, Walsh and Wheeler verify lie in the paper's families

- **Where:** the paper, Meaning and limits ("We have not checked whether the configurations of this paper are
  non-degenerate"); `IDENTITIES.md`, the Chen–Walsh–Wheeler paragraph; RESEARCH.md.
- **Problem:** their triple, Eq. (4.5), circulations (1, 2, −2/3) at −2, 1 and √7 i, is the μ = 1/2 configuration of
  Proposition 1 at θ = π/2 on A₊ after interchanging the first two vortices and halving the circulations
  (P = 5√7/2). Their quartet, Eq. (4.6), is the Novikov–Sedov parallelogram, Proposition 2 with n = 2 at θ = π/12
  (P = 2√3 − 3/4, matching their Ω = 2√3 − 3/4 − i/2). "Not checked" understated what is known. In arXiv v1 the
  quartet's third position is printed −√3/2 − 1 − i/2; with it the points are not a parallelogram and z_c ≠ 0.
- **Skeptic:** confirmed by Biot–Savart. The triple's shape ratio after the relabeling is 1/3 − 0.88192i, the
  paper's w at μ = 1/2, θ = π/2, with θ₀ = 1.7609 > π/2. The quartet's circulations are the positive multiple
  (4 − √3)π of (x₂, −1), so the referee's "negative circulation factor" was a slip for Proposition 2 (when the fix
  was made, a negative factor with a reflection turned out to be what relates the quartet to the parallelogram-lock
  parametrization of IDENTITIES.md), and a rotation by π/6 maps it to z = 1, ζ = √(2 + √3)e^{iπ/12}. With the printed sign, z_c = 0.183i and the quotients differ; with +i/2 they agree.
- **Fix:** the Meaning and limits paragraph now says that both configurations lie in the paper's families, with the
  relabeling, the shape ratio, the rotation and the values of P; notes the sign in v1; shows that their
  non-degeneracy (Definition 4.1, full rank of the derivative of their map V, Eq. (4.4)) is unchanged by rotations,
  dilations, a positive factor in the circulations and relabeling, so one member of each family is non-degenerate;
  and, since the parameters and so the maximal minors are real-analytic in θ, that the configurations of A₊ for
  μ = 1/2 and of 0 < θ < π/2 for n = 2 are non-degenerate except at isolated θ. It keeps "we have not checked the
  minimizers". `verify_general_mu.py` (10m, three checks) and `verify_central_vortex.py` (part 8, four checks, one a
  negative control with the printed sign) check both identifications; Table 1 has a row for them. IDENTITIES.md and
  RESEARCH.md say the same, and that the Math. Ann. version's sign could not be checked from this session.

### F3 (should-fix, confirmed). "n times the remainder at most 0.46" held only at the tested n

- **Where:** Table 1, row "F_n as n → ∞"; `verify_central_vortex.py` part 8.
- **Problem:** n times the remainder of F_n = (1/4)e^{√(n/2)}(1 + 29/(12√(2n)) + O(1/n)) tends to 265/576 = 0.460069…,
  which exceeds 0.46; it is 0.46004 at n = 10⁷. Only powers of ten were run, although the row said
  "n = 10, …, 10⁶", and the program asserted only "< 1".
- **Skeptic:** confirmed: 0.37398, 0.45268, 0.45721, 0.45911, 0.45976, 0.4599718 at n = 10 to 10⁶, 0.4600385 at 10⁷,
  0.4600693 at 10¹². E_n has no 1/n term, so the 1/n coefficient is c²/2 − 1 = 841/576 − 1 = 265/576 with
  c = 29/(12√2).
- **Fix:** the paper states and proves F_n = (1/4)e^{√(n/2)}(1 + 29/(12√(2n)) + 265/(576n) + O(n^{−3/2})). The program
  checks the series of ((n − 1)/n)e^{E_n − √(n/2)} exactly (coefficients 29/(12√2) and 265/576), runs n = 10^k,
  k = 1…6, and n = 10⁸, 10¹², and checks that n^{3/2} times the remainder of the full expansion stays in
  [−0.28, −0.07] (observed −0.272 to −0.0739) and that n times the old remainder increases toward 265/576. Table 1
  reports these numbers and names the tested n.

### F4 (should-fix, confirmed). The note's retirement was carried out before the owner decided

- **Where:** `papers/papers.json` (the `identities-note` entry removed), `identities/zenodo.json` and
  `identities/ARXIV.md` deleted; CHANGELOG, RESEARCH.md, the publishing docs, RESEARCH-GRADE.
- **Problem:** AGENTS.md says the owner decides what is published. The planned Zenodo record of the note was dropped
  "subject to the owner's confirmation", but the entry and its metadata were deleted outright, and the docs already
  described the retirement as done.
- **Skeptic:** confirmed; no owner decision about the note exists on the branch or on main.
- **Fix:** the `identities-note` entry is back in papers.json at "preparing", with the note "Retired pending owner
  confirmation"; `identities/zenodo.json` and `identities/ARXIV.md` are restored unchanged; the upload instructions are
  back in `identities/README.md`, marked on hold, with a warning that the note's errata have to be dealt with before
  any upload; the publishing docs and RESEARCH-GRADE 1c say the plan is on hold pending the owner's decision. The
  question for the owner goes in the pull request (below).

### F5 (must-fix, confirmed). Item 6 ticked, record said "complete", sync would publish

- The same defect as F1, found by the other reading, which added that the papers.json note still called the quality
  record "complete". Confirmed and fixed with F1 and F9.

### F6 (must-fix, confirmed). Yudovich's theorem was credited only to a 2026 secondary discussion

- **Where:** Meaning and limits, "Vortex patches exist for all time in the Euler equations (see the discussion in
  [cww2026, Sect. 1])".
- **Problem:** global existence for bounded vorticity is Yudovich 1963, which Chen, Walsh and Wheeler themselves cite
  (their ref. [53]); AGENTS.md asks for the classical source where its result is used.
- **Skeptic:** confirmed from the text of arXiv:2506.04093v1, Sect. 1. It added that Yudovich 1963 treats bounded
  domains (RESEARCH.md, stable-expansion entry of 2026-09-26), so a whole-plane source should be cited with it, as
  stable-expansion does. The sentence is a remark, not a step of a proof.
- **Fix:** the sentence now credits Yudovich (Zh. Vychisl. Mat. Mat. Fiz. 3 (1963) 1032–1066), "proved there for
  bounded domains", with Crippa and Stefani, Calc. Var. PDE 63 (2024) 168, Theorems 1.6 and 3.3, for the whole plane,
  and the Chen–Walsh–Wheeler discussion. The bibliography has 43 works (CHECKLIST.md). QUALITY item 4 and RESEARCH.md
  say that Yudovich 1963 was not opened and is cited as recalled, and that Crippa and Stefani were read on 2026-09-26.

### F7 (should-fix, confirmed). The records disagreed on whether the retirement was decided

- **Where:** `identities/README.md`, CHANGELOG, the commit message (pending) against papers.json, PUBLISHING.md §3,
  PUBLISHING-PAPERS.md, RESEARCH-GRADE 1c, papers/README.md, NOVELTY-AUDIT.md, RESEARCH.md (settled); RELEASES.md.
- **Problem:** no dated owner decision is cited. The 2.2.0 release notes, which are synced to the public companion and
  become the Zenodo release notes, said the note "is retired and will not get a record of its own".
- **Skeptic:** confirmed; no file contains an owner's decision of 2026-09-27 about the note.
- **Fix:** every file now words the retirement as proposed and pending the owner's decision. The sentence about the
  note is taken out of RELEASES.md, which now names only what the paper adds.

### F8 (should-fix, confirmed). The Parallelogram and Quincunx plates printed the signed product

- **Where:** `src/modules/parallelogram-lock.js` and `src/modules/quincunx-lock.js` (subtitle, equation, credit,
  blurb), and the generated TECHNIQUES.md.
- **Problem:** the branch lists the signed ω₀ t_c = −B/(2A) as an erratum of the note, but the plates still printed
  "ω₀ t_c = … ≥ 3√5/4" and "The product −B/(2A) simplifies to the formula above", although both use the orientation
  in which ω₀ < 0.
- **Skeptic:** confirmed with each module's own placement: ω₀ t_c = −1.67705 (−3√5/4) and −1.07711 (−3√33/16) at the
  minima. The numbers the plates show were already correct (the status lines use the absolute value).
- **Fix:** both modules now print |ω₀| t_c, say that ω₀ < 0 in the orientation used, and credit "|B|/(2|A|)
  (A < 0 on the collapsing branch, and B = ω₀ < 0 in the orientation used here)". TECHNIQUES.md and techniques.json
  are regenerated by `node tools/index.js`.

### F9 (should-fix, confirmed). The papers.json note of minimal-winding was false in places

- **Problem:** it said the quality record "is complete" while the 2.2.0 reading was open, and that release 2.0.0
  "is in the data availability paragraph" and is the version the paper cites; the paragraph cites release 2.1.0
  (doi:10.5281/zenodo.22966989), and now names release 2.2.0 as well.
- **Skeptic:** confirmed; the 2.0.0 wording was already stale on main.
- **Fix:** the note is rewritten: the paper cites the DOI of release 2.1.0 and will cite that of 2.2.0 once archived;
  the earlier DOIs are listed as earlier releases; the quality record is complete now that item 6 is recorded.

### F10 (should-fix, confirmed). identities/README.md misstated the note's fingerprints

- **Problem:** it said `note.pdf`, `note.typ`, `STATEMENTS.txt` and `refs.bib` "stay as the dated original of
  2026-09-21" with fingerprints "in HASHES.txt only". HASHES.txt has no fingerprint for refs.bib, and it records
  refingerprinting on 2026-09-24 (twice) and 2026-09-25; refs.bib was corrected on 2026-09-24. IDENTITIES.md had it
  right.
- **Skeptic:** confirmed; the current SHA-256 of the three fingerprinted files matches HASHES.txt.
- **Fix:** the README now says that `note.pdf`, `note.typ` and `STATEMENTS.txt` (fingerprinted in HASHES.txt, last
  on 2026-09-25 after changes that were not mathematical) and `refs.bib` (not fingerprinted) are kept unchanged, and
  calls the note "the note of 2026-09-21, as refingerprinted on 2026-09-25".

### F11 (refuted). "The note's Kimura erratum misstates the dated file"

- **Claim:** `note.typ` cites Kimura 1987 at line 45, so the erratum "Kimura 1987, Eq. (4.4) … is not credited"
  misstates it.
- **Skeptic:** refuted. The erratum is about Eq. (4.4), and the note cites Kimura 1987 only for the self-similar
  set-up and the scale invariance of −B/(2A); where it gives the rates of the family (line 65) it credits Aref alone.
- **Action:** none required; a parenthesis saying that the note cites Kimura 1987 only for the set-up was added to
  the erratum for clarity.

## Nits

Applied:

- The ratio of F_n to e^{√(n/2)}/4 at n = 10 is written 1.577… (it is 1.57778…; the paper's ellipsis means truncated
  digits), and the program compares truncated values.
- Remark 2 names Gröbli's coefficient ϰ ("which we denote k because κ is taken").
- The Gröbli bibitem names the translator: "English translation by R. Goodman, arXiv:2404.01305 (2024)" (also in
  `paper/paper.bib`).
- The equality of the two κ after Proposition 3 holds "at these normalizations; under others the two constants differ
  by a factor independent of θ".
- Yudovich cited directly (F6).
- IDENTITIES.md: Re κ = +0.352 "for d₂ = 1" (it scales like 1/d₂²; 0.088 at d₂ = 2, rechecked); CITATION.cff, not
  GitHub's "Cite this repository" box, lists the paper under references; Kimura's rates are "for Γ = (2, 2, −1)",
  rescaled to this family; "diagonal ratio" in the 2026-09-20 paragraph is defined as μ = d₁²/d₂² = −γ₂/γ₁ in
  Gotoda's (3.10).
- identities/README.md line 35 (F10).
- CITATION.cff: "Release 2.2.0 adds the explicit forms and examples of the identities note".
- The papers.json note names the DOI the data availability paragraph cites (F9).
- Item 6 describes the referees' actual brief (above).
- Proposition 1: "with C = √R cos θ = (√7/2)c, that is c = cos θ"; "respectively" dropped.
- The paper README's top line says release 2.1.0 is archived at the DOI and release 2.2.0 is not yet; RELEASES.md
  names the credits it adds.
- RESEARCH-GRADE 1c: the stale finding about `.zenodo.json` is marked resolved, and the changed criterion is put back
  as on hold, since there is no owner's decision to cite.

## Checks after the fixes (2026-09-27)

- `python3 code/verify_general_mu.py`: 140 checks, all pass (about a minute); output in
  `data/verify-general-mu-2026-09-27.txt`.
- `python3 code/verify_central_vortex.py`: 102 checks, all pass (about 13 s); output in
  `data/verify-central-vortex-2026-09-27.txt`.
- `pdflatex` three times: 40 pages, 43 references, no undefined references; the one overfull box (Section 8, the
  paragraph on `certify_sqg60.py`) was already there on main.
- `node tools/paper-check.js`: all papers OK, minimal-winding "the quality bar is met", LaTeX build 40 pages as the
  Comments line says; `node tools/paper-sync.js --check minimal-winding`: ready to publish.
- `node tools/build.js`, `node tools/index.js`, `node tools/build.js --check`, `node tools/lint.js` (PASS),
  `node tools/science.js` (the two changed records updated: source hash, reference and equation; 56 validated within
  stated limits), `node tools/verify-commitment.js --all` (0 committed), `npm test`: all pass.
- `node tools/check.js <id> 12000` and `node tools/export.js <id> 8 300` for `parallelogram-lock` and
  `quincunx-lock`: PASS (8 sheets each at 8 in, 300 ppi).

## Left for the owner

- **The note's retirement.** Confirm or decline: should the identities note be retired into the minimal-winding paper
  (release 2.2.0), with its planned Zenodo record dropped? Until the owner answers, the plan stays on hold and the
  papers.json entry, `identities/zenodo.json` and `identities/ARXIV.md` stay. If the owner keeps the separate record,
  the errata in `identities/README.md` have to be dealt with before any upload.
- **The brief of these readings** was wider than item 6's "briefed only with the paper and its programs", and the
  fixes (among them the new non-degeneracy argument in the Meaning and limits paragraph) had no further reading. The
  owner may want a fresh reading of the Meaning and limits paragraph before release 2.2.0 is made.

## The owner's answer (2026-09-27)

- **The note's retirement is decided.** The same day, offered to move anything the note has that minimal-winding
  lacks into minimal-winding, release that as 2.2.0 and retire the separate identities record, the owner answered
  "move anything from the note into minimal-winding". The retirement is therefore the owner's decision of
  2026-09-27, and the parts of the F4 and F7 fixes that put it on hold are undone in a later commit: the
  `identities-note` entry of `papers/papers.json`, `identities/zenodo.json` and `identities/ARXIV.md` are removed
  again, the upload instructions are gone from `identities/README.md`, RELEASES.md again says that the note is retired
  and gets no record of its own, and the records that describe the retirement cite the owner's decision. Every other
  fix above stands.
