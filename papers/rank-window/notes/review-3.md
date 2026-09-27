# Referee report 3: "A finite rank window cannot show that a neural population code satisfies the eigenspectrum smoothness bound"

**Date:** 2026-09-27.
**Status of this report:** an in-project reading by an independent agent (a fresh session that had not seen the
earlier reports, the quality record or RESEARCH.md when it wrote its findings). It is **not an outside review**:
nobody outside the project has read the note.
**Version read:** `origin/main` at 3610d00 (the note's files last changed in 5313bbe). The branch requested,
`review/rank-window-3`, cannot be created in this repository because a branch named `review` exists (git refuses
`refs/heads/review/...`); this report is committed on `review-rank-window-3` instead.

## Summary

The note argues that power-law exponents fitted over fixed rank windows (Stringer et al. 2019: ranks 11-500, and a
short window for 32 grating directions) cannot show that a population code satisfies the smoothness bound
alpha > 1 + 2/d, or lies close to it. It has one proved result (Proposition 1, a perturbation bound for the centred
finite-stimulus kernel matrix of codes on bounded eigenfunctions, and Corollary 1 on the torus) and numerical
results: Matern codes placed on the image-PC coordinates of the ten 8D/4D stimulus sets, d = 1 codes at 32
directions, and a sensitivity study of the MEME broken-power-law tail exponent.

I checked the proposition and corollary line by line and found them correct. Every number and table regenerates byte
for byte from `out/`, the independent recomputation passes on figshare stimulus files whose MD5s I checked against
the figshare API, the figures and the PDF rebuild identically, and all 19 quotations are verbatim in my own copies of
the sources. The problems are in what the text says the results show, not in the arithmetic:

1. The note and its README both say that no spectrum of any recording is computed. One is: the cvPCA side result
   uses the recorded cvPCA spectrum of one natural-image recording.
2. The grating window. The note fits ranks 5-30 because Stringer's Methods say so. But the deposited code at the
   commit the note cites fits ranks 11-30 for the gratings. The qualitative d = 1 conclusions survive the change
   (I recomputed them), but the quoted numbers, including the abstract's 3.5012, belong to one window.
3. The misfit flag rates are proportions out of 20 data sets, printed with no interval. The abstract's "detects the
   difference rarely or not at all" is stronger than the data allow for the full-whitening check (5/20 has a 95%
   interval of [0.09, 0.49]).
4. The Discussion says that codes which violate the bound "or sit exactly at it" produce the same window exponents.
   In the Matern family only border codes (nu = 1) reach the reported values 1.49 and 1.65. Codes strictly below
   the border never do, and the text does not say so.
5. The abstract's gloss on Proposition 1 ("continuous in the variance of the tail and blind to its rate of decay",
   "no estimator continuous in that spectrum can tell ...") is looser than what is proved and has no quantifiers.

None of these needs new large computations.

## Verdict

**Minor revision.** The mathematics is correct, and the computations are reproducible and correctly reported. The
five must-fix items are corrections of wording, one false factual statement, one missing source discrepancy with a
small recomputation, and missing binomial intervals.

## Must-fix

**M1. "We computed no spectrum of any recording" is false.** `paper/note.tex:49` ("We computed no spectrum of any
recording"); `README.md:40` ("no spectrum of any recording is computed").
- *What is wrong.* `code/stage1/calib.py:22` computes the cvPCA spectrum of `natimg2800_M170714_MP032_2017-09-14`
  (`cv = spec.cvpca_gram(G)`). The same program also computes the SCC spectrum and the eigenmoments of that
  recording (`:24`, `:26`). `code/snr_cv.py:25-26` reads `c["cv"][[10, 99, 499]]` and writes it to
  `out/snr_cv_seed99.json` and `out/snr_cv_seed100.json` as `data_cv`. The values there are 97.286, 12.701 and
  2.377. `paper/results.tex:100` prints the ratio of "its cvPCA spectrum at ranks 11, 100 and 500" to the
  simulated one, and draws a conclusion about the recording from it ("None of the three conditions matches the
  recording").
- *Why it matters.* The sentence is one of the note's two stated scope limits, and it is false as written.
- *Fix.* Say exactly what neural data enter. For example: "We fit no exponent to any recording. The only neural
  data used are the per-neuron signal and noise variances of one natural-image recording, which calibrate the
  simulator (Section 3), and that recording's cvPCA spectrum at ranks 11, 100 and 500 (Section 4.5)." Make the same
  change in the README's "Not done" line. The sentence "We used these image files and no neural data"
  (`note.tex:89`) is true only of the stimulus coordinates. Scope it that way.

**M2. The grating window differs from the deposited code; the d = 1 numbers belong to one window.**
`paper/abstract.tex:1` ("ranks 5-30 for 32 grating directions", "reaches 3.5012"); `paper/note.tex:59` and `:91`
("fitted as in [stringer2019] ... function get_powerlaw of [stringercode]"); `note.tex:95` ("We fitted ranks
5-30"); `results.tex:63` and `:66`.
- *What is wrong.* Stringer's Methods say 5 to 30 for the 32-grating recordings. The note quotes this correctly.
  But the deposited code at the cited commit 58443d1 fits ranks 11-30:
  - `mainfigs/fig3.m:91` sets `trange0 = [11:30]` for the gratings. Line 94 sets 11:500 for the other sets.
  - `powerlaws/statsShuffledPCA.m:59` calls `get_powerlaw(specS{K}{k}, [11:min(500,numel(ss)-2)])`. For a
    32-stimulus spectrum that is 11:30.
  - `fig3.m:111` also fits the reported exponent to the mean normalized spectrum over recordings
    (`ss = nanmean(lam,2)`), not to each recording.

  So the published 3.43 was most probably fitted over ranks 11-30. The note's bibliography entry for the code
  (`note.tex:126`) lists only `python/utils.py` and `processResp/compileResps.m` as read. The MATLAB
  `powerlaws/get_powerlaw.m` (1-based ranks, weights `w = 1./trange0`, lines 11-15) matches the note's 11-500
  implementation exactly. The Python notebook passes `np.arange(11,5e2)` to a 0-based function, which fits ranks
  12-500 (see m2).
- *Recomputation.* I reran the note's own d = 1 construction over ranks 11-30 (script
  `rw3/d1_window.py`, output below):
  - Border codes (nu = 1) give 0.321-2.405 (5-30: 0.228-2.598), all below 3.
  - nu = 1.5 gives 0.558-3.468 and exceeds 3 for kappa <= 2, as with 5-30.
  - nu = 0.5 gives at most 1.278.
  - The Proposition 1 example (head nu = 1.5, kappa = 1; tails n^-2 and n^-5) gives 3.4306 for both codes, not
    3.5012.

  The qualitative d = 1 claims survive. The specific numbers do not transfer: the abstract's 3.5012, the
  pre-asymptotic/aliasing split, the 2.821 staircase value and the kappa thresholds all belong to the 5-30 window.
- *Fix.* State the discrepancy between the Methods text and the deposited code. Cite `powerlaws/get_powerlaw.m`,
  `mainfigs/fig3.m` and `powerlaws/statsShuffledPCA.m`. Report the d = 1 results for both windows, or use 11-30 as
  primary and 5-30 as the check. In the abstract, give the example's value for the window adopted (3.4306 over
  11-30).

**M3. Flag rates are printed without uncertainty, and "rarely or not at all" overstates them.**
`paper/abstract.tex:1` ("the eigenmoment misfit detects the difference rarely or not at all"); `results.tex:92`
("The misfit therefore has little power against these far-tail changes: nominal flag rates run from 0 to 0.25");
`discussion.tex:1`; Table 4 (`results.tex:78`, `tab_meme.tex`).
- *What is wrong.* Each flag rate is k/20 over 20 simulated data sets and is printed as a bare fraction. That breaks
  the note's own rule (`note.tex:101`: simulated results carry standard errors or intervals). Clopper-Pearson 95%
  intervals, from `out/meme.json`:

  | Weighting and reference | Variants flagged | 95% interval |
  |---|---|---|
  | Diagonal weights | 0/20 each | [0, 0.17] |
  | Base with diagonal weights | 1/20 | [0.001, 0.25] |
  | Full whitening, pooled null | 0/20 each | [0, 0.17] |
  | Full whitening, first-fold reference, exponent-0.8 variant | 4/20 | [0.06, 0.44] |
  | Full whitening, first-fold reference, other variants | 2-3/20 | up to [0.03, 0.38] |
  | Covariance from 19 data sets (leave one out), exponent 0.8 | 5/20 | [0.09, 0.49] |
  | Covariance from 19 data sets (leave one out), other variants | 1-3/20 | up to [0.03, 0.38] |

  Under the first-fold and leave-one-out references the base's own false-positive rate is about 1/20 by
  construction. So the data are compatible with a detection probability near one half for the full-whitening
  check. They show low power only for the diagonal-weight misfit and for the pooled reference, and the pooled
  95th percentile is set largely by one fold (see S6).
- *Fix.* Add the intervals to Table 4 and to the text. Say in the Table 4 caption which reference distribution the
  "flagged" columns use (the pooled 100-data-set null). Replace the abstract's phrase with a statement the
  intervals support. For example: "with diagonal weights no variant data set was flagged (0 of 20 each; 95% upper
  bound 0.17); with full whitening 0 to 5 of 20, depending on the reference distribution (upper bounds up to
  0.49)".

**M4. The Discussion overstates what the Matern codes show about codes that violate the bound.**
`paper/discussion.tex:1`: "because codes that violate the bound, or sit exactly at it, produce the same window
exponents".
- *What is wrong.* In the computed family, codes strictly below the border (nu = 0.75, alpha_inf < 1 + 2/d) never
  reach the reported exponents:
  - at most 1.431 at d = 8 (reported 1.49) and 1.538 at d = 4 (reported 1.65), with N = infinity;
  - none with N = 8,704 either;
  - `make_numbers.py` computes this (`ReachMidEight = ReachMidFour = 0`), but no sentence prints it.

  Only the border codes (nu = 1, gradient energy diverging logarithmically) reach the reported values:
  - 1.49 in 3 or 4 of 6 sets, in unwhitened coordinates only, at l >= 2 (at l = 2 in one set only), and in one
    set by 0.0035;
  - 1.65 in all 4 sets.

  The only strictly non-differentiable code shown to give a reported-size exponent is the constructed d = 1
  example, together with Corollary 1 in the abstract.
- *Why it matters.* This is the numerical support for the title at d = 8 and d = 4, and a reader will take the
  sentence to mean that clearly rough codes give 1.49.
- *Fix.* State the maximum of the nu = 0.75 codes in Section 4.2 and in the Discussion. Then either qualify the
  sentence ("codes at the border reach them; codes below it exceed the bound but, in this family and over the
  length scales computed, not the reported values") or compute nu strictly between 0.75 and 1 (for example 0.9) to
  settle whether strictly non-differentiable Matern codes reach 1.49 and 1.65.

**M5. The gloss on Proposition 1 in the abstract and Section 2 is looser than what is proved.**
`paper/abstract.tex:1` ("continuous in the variance of the tail and blind to its rate of decay, so no estimator
continuous in that spectrum can tell a differentiable code from a non-differentiable one"); `note.tex:49`;
`note.tex:79` ("For codes on bounded eigenfunctions, then, no estimator ... can decide the bound").
- (a) Proposition 1 is an absolute bound, C^2 max(tau_M, tau'_M).
  - It says nothing about ranks whose eigenvalues are below that bound. The finite-sample spectrum is therefore not
    "blind" to how the tail decays at ranks it resolves. The insensitivity holds only for a tail whose total mass is
    small compared with the eigenvalues of interest. In Corollary 1's construction that means L far beyond P as
    delta goes to 0.
  - Nor is the spectrum "continuous in the variance of the tail". Two tails of equal variance can give different
    spectra. The bound controls the difference by the larger tail mass.
- (b) The consequence for estimators needs its quantifiers.
  - "Differ by less than delta" plus continuity of f at each point is not enough by itself. It works here because
    both codes of each pair converge, as L grows, to the spectrum m* of the common head. The text does not say this.
  - The statement that follows is: for a fixed stimulus set, for every estimator f continuous at m*, and for every
    epsilon > 0, there is a C^1 code A and a code B with E||grad phi||^2 = infinity such that
    |f(m(A)) - f(m(B))| < epsilon.
  - A continuous real-valued f can still order such a pair correctly, with zero margin. What is excluded is
    separation by any positive margin, or by a decision rule that is robust to small perturbations. The body's
    phrase "none that is robust to arbitrarily small changes" is the right one; the abstract drops it.
- (c) "Codes on bounded eigenfunctions" in general is not what is proved. The proof covers the torus (Corollary 1).
  On other compact manifolds the Laplacian eigenfunctions need not be uniformly bounded (on spheres they are not).
- *Fix.* In the abstract, say something like: "on the torus, at any fixed stimulus set, two codes whose spectra
  share a head differ in their finite-sample spectra by at most a constant times the larger tail variance, so no
  estimator continuous in that spectrum can separate a continuously differentiable code from one with infinite
  gradient energy by any positive margin". Replace "blind to its rate of decay" with "insensitive, up to C^2 tau,
  to how a tail of total variance tau decays".

## Should-fix

- **S1. "Non-differentiable" versus infinite gradient energy.**
  - Corollary 1 (`note.tex:72`) proves E||grad phi||^2 = infinity. The abstract, `results.tex:63` and `:66` and
    `discussion.tex:1` say "non-differentiable". Infinite gradient energy does not by itself exclude pointwise
    differentiability (compare x^2 sin(1/x^2)). For these Fourier codes the gap closes in one line: Fatou applied
    to the difference quotients gives sum_j lambda_j (d_e psi_j(s))^2 <= liminf ||phi(s+he)-phi(s)||^2/h^2. Since
    sum_kappa min(lambda_cos, lambda_sin)|kappa|^2 = infinity, the heavy code is nowhere Lipschitz, hence nowhere
    differentiable. The same holds for the stationary d = 1 example. Add the line, or write "fails the
    finite-gradient condition".
  - Separately, Stringer's Theorem 5 (SI section 2.7) uses the uncentred kernel K(s,s') = <phi(s), phi(s')>. The
    note defines the spectrum with the centred kernel (`note.tex:53`). The two operators differ by rank one, their
    eigenvalues interlace, and the o(n^(-1-2/d)) conclusion transfers. Say so in one sentence.

- **S2. Attribution to Braun.** `note.tex:69` says the proposition "follows from Lemmas 5 and 8 of Braun, which
  compare an uncentred kernel matrix with that of its truncation".
  - Braun states the lemmas for K_n = k(X_i,X_j)/n of a Mercer kernel whose eigenfunctions are orthonormal in
    L^2(mu), with nonincreasing lambda. Lemma 5 is Weyl's inequality. Lemma 8 bounds ||E|| by M^2 times the tail sum,
    through n times the largest entry. Both are deterministic, so they hold at arbitrary points.
  - The note's Proposition is for the centred matrix P^-1 H K H, with arbitrary bounded psi_j and arbitrary
    summable lambda.
  - Braun's lemmas give the note's statement only in the orthonormal, nonincreasing case, which covers Corollary 1,
    and only after the extra step ||H E H|| <= ||E|| with Weyl applied to the centred matrices. The note's own proof
    is complete and correct. I checked each step: absolute convergence; B and B' positive semidefinite; for PSD
    matrices, ||B - B'|| <= max(||B||, ||B'||); ||B|| <= tr B <= P C^2 tau_M; the projection H does not increase
    the norm; Weyl.
  - Reword to "follows from the argument of Braun's Lemmas 5 and 8, applied to the centred matrix".

- **S3. An interpretation stated as a consequence.** `note.tex:79` says "A tail exponent fitted to moments is
  therefore the continuation of the assumed parametric form". The moment inequality shows that moments p >= 2 are
  insensitive to the tail. It does not show what the fitted alpha_2 equals. Mark the sentence as an interpretation
  and point to the numerical Section 4.4.

- **S4. Define "unresolved".** `abstract.tex:1` has "depends on the unresolved tail"; `discussion.tex:1` has
  "beyond the resolved ranks".
  - The variants differ from the base only beyond rank 500. That is inside the rank of the data (2,800 stimuli).
    Pospisil and Pillow's claim concerns eigenvalues beyond the rank of the data.
  - What the note shows is narrower. At this data size the eigenmoments p >= 2 change by at most 0.01 standard
    deviations. Only the trace registers the change, and the fit absorbs it into alpha_2.
  - Say "beyond rank 500, where at this data size only the trace carries information", or similar.

- **S5. Not everything is computed in double precision.** `note.tex:49` says every numerical result is "computed
  in double precision".
  - `sim.Sim.draw` generates float32 responses (`code/sim.py:36-48`).
  - The cross-repeat Gram matrices of the MEME and cvPCA simulations are formed in float32 before being cast
    (`code/meme_sim.py:58`, `code/snr_cv.py:32`).
  - cvPCA uses a float32 `eigh` (`code/est.py:35`).
  - The full-whitening covariance of the log moments has condition number 7.7e7. Its smallest variance is about
    6e-9, an SD of about 8e-5 in log-moment units. Check that single-precision rounding does not feed the whitened
    misfit, for example by recomputing a few data sets in float64, and state the precision used.

- **S6. The base data sets may not be exchangeable.** `results.tex:92` attributes the fifth fold's large
  full-whitening misfits (median 8.39 against 3.19-3.76) to a heavy upper tail.
  - In `out/meme_sim_*.npz`, base data sets 80-99 have systematically lower higher log moments than data sets 0-79:
    log m3 by 0.066, log m8 by 0.32.
  - Permutation tests give two-sided p = 0.0022 and 0.0016. Allowing for the choice of the worst of five folds, the
    level is about 0.01.
  - Data set 99 alone does not drive this. Without it, the mean log m8 of data sets 80-98 is 42.168, against 42.516
    for data sets 0-79. Data set 99 is nevertheless an extreme joint outlier: its leave-one-out Mahalanobis^2 is 177
    in 8 dimensions.
  - All base data sets use independent streams `[SEED, r]`, and data sets 20-99 come from one run. So this may be
    chance under heavy tails. But the pooled 95th percentile (16.51), which produces "none flagged", is set largely
    by this fold.
  - Regenerate data sets 80-99, or add another batch, and report the result.

- **S7. The evidence for "or lies close to it" is in the tables but not in the text.**
  - Differentiable codes whose alpha_inf is well above the bound also produce the reported values:
    - d = 8, nu = 1.5 at l = 1: 1.41-1.67;
    - d = 8, nu = 2.5 (alpha_inf = 1.625) at l = 1/2: 1.18-1.54;
    - d = 4, nu = 1.5 at l = 1/2: 1.63-1.72.
  - The second half of the conclusion rests on this. Say it in the Discussion.

- **S8. The simulation's bias is not mentioned.** In simulation the base's alpha_2 is 1.233 +/- 0.006 with diagonal
  weights, against 1.250 from exact moments. That is about 2.8 standard errors. With full whitening it is 1.254 +/-
  0.004. The difference is small next to the shifts, but it is this implementation's bias in this simulator.
  Mention it.

- **S9. Checksums and logs.**
  - `note.tex:112` says the source folder lists the image files "with their checksums". The README lists figshare
    file ids only.
  - The MD5s I obtained from the figshare API, and matched on download:

    | File | MD5 |
    |---|---|
    | 8D_MP030_0607 | ec3b8ea7fa267a92fbe55ccacd0c6399 |
    | 8D_MP031_0702 | ca38dc90580959488b2e873dad61683f |
    | 8D_MP032_0810 | 558ebb6d64cdfbde02e7ece71d5e0a97 |
    | 8D_MP032_0915 | 8647c41671a084a746e3d7b76a9658e6 |
    | 8D_MP033_0822 | 091aa99f53d5933b5e56cdd466a46502 |
    | 8D_MP034_0915 | 6a987d1701b31094842fdbc7f11e2a5e |
    | 4D_MP032_0922 | d8c37e4428a8b80287da1c363ef5e41c |
    | 4D_MP033_0919 | 305a6264eadc808c5361fd199bc8efde |
    | 4D_MP033_0922 | cc46d398c8edc5959cfbbb9ecbd75084 |
    | 4D_MP034_0920 | db5919a8db59a222057661a4d66a1c3e |

  - `README.md:49` and `out/LICENSE.md` say `out/` holds the run logs. No log is tracked.

- **S10. Unpublished work is cited as though a reader can see it.**
  - `note.tex:97` refers to "a preceding, unpublished feasibility analysis (est.py; see the README of the source
    folder)". The README does not describe it.
  - `note.tex:99` refers to "the independent check of that analysis".
  - `results.tex:100` reports what "the simulations of the preceding analysis found".
  - `code/snr_cv.py:2` refers to `snr_cv_orig.py`, which is not in the repository.
  - Either describe these in the folder or drop the references.

## Minor

- **m1.** `note.tex:122` lists the SI sections read as "(Thms. 1, 2, 4, 5; sections 2.1, 2.7, 3.5)". The
  quotation "We conclude that our experimental observations ..." (`note.tex:45`) and the Example 3 description
  (`note.tex:47`) are both from SI section 2.3, "Summary of results". Add section 2.3.
- **m2.** `note.tex:126` should cite the MATLAB code that produced the figure. The Python notebook
  (`python/powerlaws.ipynb`) calls `get_powerlaw(ss/ss.sum(), np.arange(11,5e2))` with 0-based indices. That fits
  ranks 12-500, not 11-500.
- **m3.** Stringer's reported exponents are fitted to the mean normalized spectrum over recordings (`fig3.m:111`).
  "Reach 1.49 in three of the six 8D sets" compares per-set model values with a pooled statistic. Say so.
- **m4.** The README abstract (`README.md:12-31`) differs from `abstract.tex`: it omits "with infinitely many or
  8,704 neurons and in whitened coordinates".
- **m5.** `README.md:38-39` says every worded claim is asserted in `make_numbers.py`. Several are not, for example
  "rarely or not at all", "hardly change", "the four 4D sets are alike", "helped only moderately", and the abstract's
  "below the bound for short ... in whitened coordinates" at d = 4 (true, but not asserted).
- **m6.** Some derived numbers are typed by hand although the README says every number is a macro: "4.8% or 13%"
  (`note.tex:97`), "1.1875 at d = 8, 1.375 at d = 4" (`results.tex:56`), and the gap of 0.20 (`results.tex:94`).
- **m7.** Three places report a sample statistic without an interval, or a revision history the reader does not
  need:
  - `results.tex:94` gives correlations of 0.66-0.76 from n = 20 without an interval.
  - `note.tex:93` says "cells added in revision", which is revision history, not method.
  - `out/tab_grating.tex` is written but not used.
- **m8.** `code/verify_independent.py:69-72` says the Proposition 1 test makes "the eigenvalue gap ... a sizeable
  fraction of the bound". The printed ratio is 0.03. The "negative control" (heads that differ) is not a test of
  the proposition. Reword the comment.
- **m9.** Several phrases rely on the assumed Weyl-type count that gives alpha_inf on R^d, for example "overshoot
  their own asymptotic exponent" (`results.tex:38`). Mark them as depending on that assumption. For d > 1 the
  standard reference for the phase-space count is Birman and Solomyak rather than Widom. The non-differentiability
  of nu <= 1 does not depend on the assumption, and the note says so correctly.
- **m10.** Fig. 1's panel titles say "(6 recordings)" and "(4 recordings)". These are stimulus sets; no recording
  enters Fig. 1.
- **m11.** `discussion.tex:1` says the spectra differ "by less than any given amount at every rank, for every
  stimulus set". That is a uniform statement. Corollary 1 fixes the stimuli before choosing the codes. The proof
  does give the uniform version, since L depends only on delta. State that version in the Corollary.

## What was checked and what was not

**Checked:**
- Proposition 1 and Corollary 1, line by line, against Braun 2006, Section 2.1 and Lemmas 5 and 8 (JMLR, open
  access), including:
  - the centred versus uncentred matrices;
  - the lattice count;
  - the C^1 claim;
  - the claim that E||grad phi||^2 is infinite.
- The Matern gradient criterion (nu > 1) and the phase-space exponent.
- The Wishart finite-population construction, including the Bartlett degrees of freedom.
- The circulant aliasing formula.
- The Kong-Valiant estimator in `est.py` against Algorithm 1 of arXiv:1602.00061v5.
- `make_numbers.py`: every assertion read.
- A sample of the numbers recomputed by my own script from `out/`:
  - all 350 x 3 window exponents from the stored spectra, maximum difference 6.8e-13;
  - the finite-N crossings and reach counts;
  - the Table 4 means;
  - the flag counts.
- The full MEME analysis rerun from `out/`; see the commands section for the comparison with the committed
  `out/meme.json`.
- The figures regenerated from `out/`: identical rasters.
- The PDF rebuilt: identical text, 14 pages.
- All quotations, in my own copies of each source:
  - Stringer et al., main text: PMC6642054 author manuscript;
  - Stringer et al., SI: the Nature ESM PDF;
  - Pospisil and Pillow: PMC12625980 full text;
  - Davidovich and Roudi: arXiv:2204.08525.
- The context of the quoted passages in Pospisil and Pillow and in Davidovich and Roudi.
- Stringer's deposited code at 58443d1:
  - `mainfigs/fig3.m`;
  - `powerlaws/get_powerlaw.m` and `powerlaws/statsShuffledPCA.m`;
  - `processResp/compileResps.m`;
  - `python/utils.py` and `python/powerlaws.ipynb`.
- Pospisil's `src/eig_mom.py` at afcd301.

**Not checked:**
- The stage-1 calibration: `calib.py`, `run_sim.py` and the 244 MB recording were not downloaded.
- The MEME simulations themselves: not regenerated, because they need that calibration. So S5 and S6 are open.
- The SI caption quoted from Pospisil and Pillow's Fig. S1: confirmed only through `check_quotes.py` against the
  project's saved text.
- Koltchinskii and Gine, and Shawe-Taylor et al.: not read.
- Spigler, Geiger and Wyart's definition of the nearest-neighbour dimension: not compared.
- The Matern window, finite-N, whitened, subset and nn-dimension runs: not rerun in full; they take hours. Five
  window cells are recomputed independently by `verify_independent.py`.

## Commands run with their exact outputs (tails)

- `git fetch origin main && git checkout -B review/rank-window-3 origin/main` failed:
  `fatal: cannot lock ref 'refs/heads/review/rank-window-3': 'refs/heads/review' exists; cannot create
  'refs/heads/review/rank-window-3'`. I used `git checkout -B review-rank-window-3 origin/main` instead (HEAD
  3610d00).
- `python3 code/make_numbers.py`, exit 0, prints `406 macros written`. `git status --porcelain` afterwards prints
  nothing. `paper/numbers.tex`, the four `tab_*.tex` and `out/numbers.json` are byte-identical.
- `python3 code/verify_independent.py`:
  - In the checkout: `FileNotFoundError: ... data/stim/images_8D_MP033_0822.mat` (the inputs are not in the
    repository).
  - In a scratch copy with the ten figshare stimulus files (MD5s as in S9, all "MD5 OK"): exit 0, 6 min 15 s:
    ```
    PASS window 11-500 8D_MP033_0822 nu=1.0 ell=1.0: 1.451004 vs 1.451004 (tol 0.0005)
    PASS window 11-500 4D_MP034_0920 nu=0.75 ell=4.0: 1.516544 vs 1.516544 (tol 0.0005)
    PASS window 11-500 8D_MP030_0607 nu=1.5 ell=0.25: 0.686082 vs 0.686082 (tol 0.0005)
    PASS window 11-500 4D_MP032_0922 nu=2.5 ell=8.0: 3.360560 vs 3.360560 (tol 0.0005)
    PASS window 11-500 8D_MP032_0810 nu=1.0 ell=8.0: 1.553735 vs 1.553735 (tol 0.0005)
    PASS d=1 window 5-30 nu=1.0 kappa=2.0: 2.300004 vs 2.300004 (tol 0.002)
    PASS d=1 window 5-30 nu=0.5 kappa=8.0: 0.447235 vs 0.447235 (tol 0.002)
    PASS d=1 window 5-30 nu=1.5 kappa=1.0: 3.501162 vs 3.501162 (tol 0.002)
    PASS Proposition 1, 200 random points of T^2, M = 3: max|m - m'| = 0.1701 <= 5.8944 (ratio 0.03)
    PASS Proposition 1, 200 random points of T^2, M = 3: max|m - m'| = 0.1734 <= 5.8944 (ratio 0.03)
    PASS Proposition 1, 200 random points of T^2, M = 3: max|m - m'| = 0.1585 <= 5.8944 (ratio 0.03)
    PASS Proposition 1, 200 random points of T^2, M = 3: max|m - m'| = 0.1728 <= 5.8944 (ratio 0.03)
    PASS Proposition 1, 200 random points of T^2, M = 3: max|m - m'| = 0.1625 <= 5.8944 (ratio 0.03)
    PASS negative control (heads differ): max|m - m'| = 1.0367 exceeds the tail-mass value 0.1911
    ALL PASS
    ```
- `python3 code/check_quotes.py`:
  - Without `NOTE_LIT`: `source text stringer2019.txt not found in [.../spectrum-power/lit', .../rank-window/lit']`.
  - With `NOTE_LIT` set to the project's saved source texts: exit 0. The 19 lines read `OK ...` and the last line is
    `19 quotations, 0 not found verbatim (sources: 7 files)`.
  - All 19 quotations were also found verbatim in my own downloads, listed above. The Pospisil-Pillow SI caption
    was found only through the saved text.
- `python3 code/make_figures.py`, in a scratch copy with `data/` removed: `figures written to .../paper/figures`.
  The PDFs differ from the committed ones only in `/CreationDate`. Rasterized at 60 dpi, all three are identical.
- `pdflatex note` three times, on a scratch copy: 14 pages, no warnings. `pdftotext` output identical to the
  committed `note.pdf` (0 diff lines).
- `python3 rw3/d1_window.py` (the referee's script; the note's d = 1 construction over ranks 11-30), tail:
  ```
  border (nu=1) 11-30 sampled: 0.321 to 2.405; any above 3: False
  nu=1.5 11-30 sampled: 0.558 to 3.468; above 3 for kappa in [0.5, 1.0, 2.0]
  any code with nu <= 1 above 3 over 11-30: []
  Prop.1 example head nu=1.5 kappa=1, tail exponent 2: window 5-30 3.5012, 11-30 3.4306
  Prop.1 example head nu=1.5 kappa=1, tail exponent 5: window 5-30 3.5012, 11-30 3.4306
  ```
- `python3 rw3/indep_numbers.py out` (the referee's script), selected lines:
  ```
  max |recomputed - stored| window exponent over 350 cells x 3 windows: 6.75e-13
  d=8 nu=0.75 max over all ell/sets 1.431 (reported value 1.49)
  d=4 nu=0.75 max over all ell/sets 1.538 (reported value 1.65)
  finite N d=8: border reaches 1.49 in ['8D_MP031_0702', '8D_MP032_0810', '8D_MP033_0822']
  finite N d=8: nu=0.75 reaches 1.49 in []
  finite N d=4: nu=0.75 reaches 1.65 in []
  loo19 tail500_0.8 flagged 5/20, 95% CP [0.09, 0.49]
  first-fold reference tail500_0.8 flagged 4/20, 95% CP [0.06, 0.44]
  snr_cv_seed99.json data_cv (recorded cvPCA at ranks 11/100/500): [97.286 12.701  2.377]
  ```
- `python3 rw3/meme_probe.py out` (the referee's script), selected lines:
  ```
  fold 4 full misfit median 8.39 max 136.1 | diag median 0.0130
  fold 4 LOO Mahalanobis^2 median 8.73 max 177.1
  largest LOO Mahalanobis^2 data sets: [99 45 92 70 74  1] [177.1  27.1  27.   25.9  25.9  21. ]
  ```
  Permutation test, fold 5 against the rest: `p=3: -0.0663, p=0.0022`; `p=8: -0.3198, p=0.0016`; mean log m8
  without #99 `42.168`, others `42.516`.
- `python3 code/meme_analyze.py`, rerun in a scratch copy from `out/`: exit 0, and `out/meme.json` is
  byte-identical to the committed file. Last lines:
  ```
  [full] sim rank2800     alpha2 1.297 +/- 0.005 (SD 0.020); paired diff +0.043 [+0.039, +0.048] (paired SD 0.010, corr with base 0.88); misfit median 3.430, flagged 0.00
  [full] Matern: 90 fits, 62 within the null 95th pct
  [full, covariance from 19 data sets] null 95th pct 15.10; flagged: tail500_0.8 0.25, tail500_1.0 0.05, tail500_2.0 0.10, tail500_3.0 0.15, rank2800 0.10
  ```

The referee's scripts (`d1_window.py`, `indep_numbers.py`, `meme_probe.py`, `get_stim.py`) and the downloaded
stimulus files stay in the session's scratch folder `rw3/` and are not committed. The stimulus files are CC BY-NC
and are not redistributed.

## Review-2 cross-check

I read `notes/review-2.md` only after the sections above were written. It has two must-fix items.

- **Review-2 M1: the 8D "reach 1.49" count is metric-dependent.** **Fixed.**
  - `results.tex:54` now limits the count to the unwhitened coordinates. It reports the whitened maximum (1.385, at
    l = 8, the longest length scale computed), and it adds "the 8D count holds only in the unwhitened metric".
  - `discussion.tex:1` adds "in the unwhitened coordinates (in whitened ones none does with infinitely many
    neurons)".
  - `make_numbers.py` asserts both that no whitened 8D border code reaches 1.49 and that the whitened 4D codes reach
    1.65.
  - A related, separate gap remains: the same Discussion sentence still implies that codes below the border produce
    the reported values. See my M4.
- **Review-2 M2: "detection ... depends on how well the moment covariance is known"; heterogeneous pooled null;
  "behaves as expected".** **Fixed as worded, but the underlying issue is only partly resolved.**
  - The phrase is gone. `results.tex:92` now reports:
    - the heavy upper tail against the chi-square(4) median and 95th percentile (3.36 and 9.49);
    - the five fold medians;
    - that the last fold contributes 4 of the 5 exceedances, and the maximum misfit of 136;
    - the flag rates under the pooled, first-four-folds, first-fold and leave-one-out references.
  - The Discussion's sentence now reads "nominal flag rates from 0 to 0.25 depending on the reference distribution
    and the covariance estimate". That is the wording review-2 proposed.
  - Two things remain open. First, the flag rates still have no intervals, and I do not share review-2's view that
    the abstract's "rarely or not at all" is fine (my M3). Second, the fifth fold is reported but not explained. I
    find a systematic shift in the mean log moments of data sets 80-99 that deserves a check (my S6).

Two of review-2's should-fix items overlap with mine:
- **S1 (Braun) is partly fixed.** The text now says the maximum uses positivity. It still does not say that Braun's
  matrices are uncentred and his eigenfunctions orthonormal (my S2).
- **S5 (stand-in spectra) is fixed** by the sentence "We did not compute sub-window exponents of the recorded
  spectra". But the global claim that no recorded spectrum was computed is now false (my M1).
