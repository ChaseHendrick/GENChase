# Sign-off by the session's lead reader: "A finite rank window cannot show that a neural population code satisfies the eigenspectrum smoothness bound"

**Date:** 2026-09-27.
**Who:** the lead reader of the session that commissioned the third referee reading, an in-project agent. This is
not an outside review and not an independent one.
**Version read:** the note as it stood after the fixes of the second reading (files last changed in 5313bbe), before
`review-3.md` and the fixes made in answer to it.

## What this reading found

- **Section 2.** The proofs of Proposition 1 and Corollary 1 were checked line by line and are correct.
- **The fixes of the second reading** (`review-2.md`) are present in the text.
- **Whitened 8D codes below the border.** In whitened coordinates the nu = 0.75 codes stay below the bound 1.25 in
  the 8D sets at every length scale computed; the largest ranks 11-500 exponent over the six sets and seven length
  scales is 1.2262 (8D MP032 2017-09-15, l = 8, from `out/extra_parts/*_white.json`). This supports the abstract's
  "not in whitened 8D coordinates"; the revision after `review-3.md` adds the statement to the assertions of
  `code/make_numbers.py`.
- **Figures.** The three figures render.

## What this reading missed

`review-3.md` found three problems that this reading did not:

- **M1.** The note and README said that no spectrum of any recording is computed, but `code/stage1/calib.py` computes
  the cvPCA spectrum of the calibration recording, and the cvPCA side result compares simulated spectra with it.
- **M2.** The note fitted the gratings over ranks 5-30, as Stringer et al.'s Methods say, without noting that their
  deposited code at the cited commit fits ranks 11-30.
- **M4.** The Discussion says that codes which violate the bound "or sit exactly at it" produce the reported window
  exponents, while in the Matern family only the border codes reach 1.49 and 1.65. (Two further readers judged this
  point already handled by the evidence sentence that follows it, and it was not applied; see the Response section of
  `review-3.md`.)

## After the third reading (2026-09-27)

The fixes for `review-3.md` were read again by an independent agent; all ten confirmed findings landed. I fixed the
six residual points that reading found, added the sentence on M4 that its skeptics suggested and the wording of M5
part (a), reran `code/make_numbers.py` (which asserts the new worded claims), rebuilt the PDF and ran
`tools/paper-check.js` and `tools/lint.js`. With those, I sign off on the note as a draft: its proved results are
correct, its numbers are generated and asserted, and its claims now match what the programs compute. Items 4 and 7
of `QUALITY.md` stay open.
