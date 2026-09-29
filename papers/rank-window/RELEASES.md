# Releases

Each release of this repository is archived on Zenodo with its own DOI. The manuscript is a preprint and has not been
peer reviewed.

## 1.0.2 (2026-09-29)

Publication metadata and packaging update. The manuscript now identifies the public companion and its immutable checking-release archive. The source ZIP includes the rebuilt manuscript PDF. Citation metadata includes a usable publication locator and explains the component license terms. No theorem, proof program, certificate or scientific claim changes. Earlier archives remain available unchanged.

Capitalizes the manuscript title consistently in the PDF, LaTeX source, README, notice and citation metadata: *A Finite Rank Window Cannot Show That a Neural Population Code Satisfies the Eigenspectrum Smoothness Bound*. The rebuilt `paper/note.pdf` remains inside the source ZIP. No result, proof, program or derived dataset changes. Releases 1.0.0 and 1.0.1 stay available with their original DOIs.

## 1.0.1 (2026-09-28)

**DOI:** [10.5281/zenodo.23028535](https://doi.org/10.5281/zenodo.23028535) (2026-09-29). The previous archive is unchanged.

A checking release of the same note. The manuscript is unchanged. This archive adds `code/check_abstract.py` and `code/check_hypotheses.py`. The README prints the same generated numbers as the abstract. `code/hypotheses.json` names the proved window proposition and the numerical exponents, and keeps Koltchinskii-Gine and Widom unread. `code/check_quotes.py` is the older literature checker. It does not run from this archive: the saved source texts it reads are not here.

## 1.0.0 (2026-09-27)

**DOI:** [10.5281/zenodo.22994835](https://doi.org/10.5281/zenodo.22994835)

The first public release of the methods note *A finite rank window cannot show that a neural population code
satisfies the eigenspectrum smoothness bound* (16 pages), with the programs that compute its numbers and their output.

### What the note shows

Stringer, Pachitariu, Steinmetz, Carandini and Harris (Nature 571, 2019) proved that a differentiable, noise-free
population code over a d-dimensional stimulus space has an eigenspectrum that decays asymptotically faster than
n^-(1+2/d). They fitted exponents over a finite window of ranks and concluded that the visual cortex code is about as
high-dimensional as that bound allows. The note makes quantitative, for their stimulus sets, why a finite window of
ranks cannot settle this.

- **Proved** (Proposition 1, Corollary 1): for codes built on bounded eigenfunctions, the head of the spectrum fixes
  the finite-sample spectrum up to a constant times the variance of the tail, whatever the tail's rate of decay. So no
  estimator continuous in that spectrum can tell a continuously differentiable code from one with infinite expected
  squared gradient. The proof adapts Lemmas 5 and 8 of Braun (JMLR 2006) and is written out in full.
- **Numerical** (floating point, no enclosures): noise-free Matern codes placed on the stimulus coordinates of all ten
  8D and 4D stimulus sets.
  - Codes exactly at the differentiability border give ranks 11-500 exponents from 0.255 to 1.628 at d = 8 and from
    0.625 to 1.762 at d = 4, below the bound for short and above it for long tuning length scales.
  - Non-differentiable codes with Matern nu = 0.75 also exceed the bound in unwhitened coordinates at 2,800 stimuli,
    but not in every setting the note tests.
  - For 32 grating directions a non-differentiable code reaches 3.5012 over ranks 5-30.
  - The tail exponent of the eigenmoment method of Pospisil and Pillow depends on the unresolved tail.
- **Conclusion:** the reported exponents are consistent with the bound but cannot show that the code satisfies it or
  lies close to it.

### Reproducibility

The recorded data are not redistributed; the README says where they come from and how to fetch them. A full rerun
from the downloaded inputs on 2026-09-27 reproduced every stored value, including all 112 finite-population cells
and their 1,370 replicate values. `make_numbers.py` regenerated the note's numbers and tables byte for byte.
