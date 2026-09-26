# Referee report 2 (in-project, independent reader, 2026-09-26)

Kept as the record of item 6 of `QUALITY.md`. Paths such as `methods-note/`, `lit/` and `indep/` refer to the working folders of the session, which are not in this repository.

## Second referee report: "A finite rank window cannot show that a neural population code satisfies the eigenspectrum smoothness bound" (revised)

I did not modify the original folder, and nothing was written to the git repository (`git status` is clean). All my work is in `scratchpad/neuro-data/methods-note-check2/`:
- `rerun/` holds logs of the note's scripts that I reran, the rendered figures, and the extracted Shawe-Taylor et al. text.
- `indep2/` holds my own code and logs: `my_white.py`, `my_finiteN.py`, `my_d1.py` and `kv_pairing.py`.

### Verdict

**Needs minor revision before it circulates.**
- **The first report's five must-fix items are resolved in substance.** The border-code crossing is now stated at finite N. The nu = 0.75 claim is an explicit existence statement, with the sub-window, metric and stimulus-count caveats. The Matern MEME input is now the right target. The "no function" overstatement is gone. The prior literature is cited and quoted accurately.
- **Mathematics and reproduction hold.** The mathematics is correct. Every number regenerates byte-identically, and my own code reproduces the new headline numbers to 1e-6 or within Monte Carlo error.
- **Two claims still need fixing before a methods note goes out:**
  - The headline border-code claim ("reach 1.49 in three of the six 8D sets") has the same metric dependence the note now attaches to nu = 0.75, and the note does not say so. In whitened coordinates no 8D set reaches 1.49.
  - The MEME conclusion that detection "depends on how well the moment covariance is known" is not supported as worded. The better-estimated covariance flags nothing. The pooled null it is compared against is inflated by one of its five folds.
- **The remaining items** are attribution, interpretation and wording fixes.
- **Novelty is now stated fairly and modestly.**

### 1. The first referee's items: old and new text

**Must-fix 1 (finite-N crossing and "reach" counts): resolved.**
- Old: results_v1.tex:38 put the border codes "above it in every set for ℓ ≥ 1 at d = 8" (\CrossAboveEight = 1), and results_v1.tex:44 read "Finite populations do not change this."
- New: results.tex:54 reads "…above it in every set for ℓ ≥ 2 at d = 8 … at ℓ = 1 they give 1.2424 to 1.4394 … with MP030 2017-06-07 (1.2502 …) and MP034 2017-09-15 (1.2424 …) at or below the bound. They reach the reported exponents … in three of the six 8D sets".
- discussion.tex:1 now says "three … with 8,704 neurons".
- The finite-N grid now includes ℓ = 2 and 8.

**Must-fix 2 (nu = 0.75 "exceeds the bound"): resolved.**
- Old: the abstract (note_v1.tex:40) said "non-differentiable codes with ν = 0.75 exceed the bound at long length scales", and results_v1.tex:40 said "Codes strictly below the border also exceed the bound."
- New: the abstract says "…also exceed the bound in the unwhitened coordinates at 2,800 stimuli, but not over ranks 101–500, not in whitened 8D coordinates and not always with fewer stimuli."
- results.tex:56 adds "This is an existence statement for that window, that metric and that number of stimuli, and each matters". It reports the sub-windows (29 of 29 cells fall below), the curvature, the whitened values, P = 1,400 and 2,000, and d_eff.
- The first report asked the note to separate finite-P effects from pre-asymptotic ones. That is now answered by "cannot be computed from these stimulus sets", which I accept.
- The same caveat was not carried over to the border codes (new must-fix M1 below).

**Must-fix 3 (Matern MEME target): resolved in its target, partly resolved overall.**
- Old: results_v1.tex:83 read "exact moments of all … Matérn spectra …, placed on 8,704 indices with zeros beyond rank 2,800."
- New: results.tex:96 reads "the set of eigenmoment estimates MEME would compute from their noise-free responses at the 2,800 stimuli … these estimate the population moments". The same is in note.tex:97 and matern_extra.py `kv`.
- The change matters. For 8D MP034 0915, the Kong-Valiant (KV) log moments are lower than the sample-spectrum moments by 0.03 to 0.06 at p = 2 and by 0.39 to 0.59 at p = 8. That is about one weight SD at p = 8.
- Remaining issues are listed under S4.

**Must-fix 4 ("no function of the spectrum"): resolved.**
- Old: note_v1.tex:49 read "Section 2 shows that no function of the noise-free spectrum of finitely many stimuli identifies the asymptotic decay."
- New: note.tex:79 reads "For codes on bounded eigenfunctions, then, no estimator that depends continuously on the finite-sample spectrum, and none that is robust to arbitrarily small changes of it, can decide the bound". The abstract adds "For codes built on bounded eigenfunctions, as on a torus".
- note.tex:69 adds the trivial exact-equality remark.
- The continuity argument is correct: as L grows, both codes' finite-sample spectra converge to the spectrum of the j^-b kernel.

**Must-fix 5 (prior work): resolved, with two attribution nits.**
- note.tex:47 now quotes and cites Stringer SI Example 3, Pospisil and Pillow ("remains unclear", "can infer eigenvalues beyond the rank of the data…", "We can also assess whether the parametric form…"), Davidovich and Roudi, Koltchinskii-Gine, Braun and Shawe-Taylor et al.
- note.tex:49 lists what the note adds, as four items.
- The two attribution nits are S1 (Braun) and S2 (Kong-Valiant) below.

**Should-fix items from the first report:**
- **alpha_inf on R^d: resolved.** note.tex:85 now reads "…gives the same exponent if ∫ p^{d/(2ν+d)} < ∞, which we assume and do not prove … fails the finite-gradient condition of Theorem 5 (whose compact-manifold hypothesis these stimulus sets do not meet in any case)". The integrability condition is the standard Widom-type one.
- **d = 1 example: resolved.** Old results_v1.tex:55 used "ν = 1, κ = 2 … 2.3000". New results.tex:66 uses ν = 1.5, κ = 1, gives 3.5012 for both tails, and says "a non-differentiable code gives a 32-direction exponent above the bound". I reproduced it (see below).
- **MEME framing: resolved.** "Around a true 1.25" and "without any loss of fit" are gone. results.tex:92 says "moves toward the true continuation, by at most 0.14, and stays far from it" and "so the variance in the tail is observed".
- **The 0.10 margin: resolved in the text, partly overall.** results.tex:94 now compares the shift with the SD (4.8 times) and with the 0.20 gap (0.62). However, Fig. 3 still shades "base mean ± 0.10" (make_figures.py:125), which is now unexplained (nit N9).
- **Misfit reference: mechanically resolved.** There is now a cross-fitted null over 100 base data sets, weights from 80 independent sets, full whitening, and the leave-one-out (19-set) check. The interpretation is new must-fix M2.
- **Fairness to Stringer: resolved.** note.tex:45 quotes the ordinal hypothesis, SI §2.3 and the Discussion. results.tex:38 shows that fixed-smoothness codes reproduce the ordinal pattern in 35 of 35 cells.
- **"More stimuli": resolved.** discussion.tex:3 adds "with the window moved to higher ranks as well" and labels the 10^d argument a heuristic.
- **Fig. 1 caption "at most 0.050": resolved.** The caption now points to Table 3. The text at results.tex:54 still has a related problem (S8).
- **cvPCA: resolved.** results.tex:100 prints all three ratio triples, with one unsupported phrase (N6).

**Nits from the first report:** all addressed.
- The Proposition 1 check in verify_independent.py still passes with about a 35x margin (0.17 against 5.89). It now has a working negative control (1.04 > 0.19), which is what matters.
- check_quotes.py now uses a ROOT-relative path and counts SPACE matches as failures.

### 2. New must-fix

**M1. discussion.tex:1 and results.tex:54: the reach claim is metric-dependent.**
- discussion.tex:1 reads "Border codes reach 1.49 in three of the six 8D sets and 1.65 in all four 4D sets with 8,704 neurons".
- This holds only in the unwhitened coordinates. In whitened coordinates the 8D border codes give at most 1.385, at ℓ = 8 (the longest ℓ computed; range 1.332-1.385), so no 8D set reaches 1.49. The 4D sets reach 1.65 either way (1.759-1.760).
- Over ranks 101-500 the 8D border codes give 1.31-1.44 at ℓ = 8, again short of 1.49. That window is less relevant here, because 1.49 is a ranks 11-500 number.
- For non-identifiability an existence statement in one metric suffices. The note already applies exactly this qualification to nu = 0.75, so it should say "in the unwhitened image-PC coordinates" here and report the whitened maximum.

**M2. results.tex:92 and discussion.tex:1: "Detection is therefore unreliable and depends on how well the moment covariance is known".**
- **The data run the other way.** With the better-estimated covariance (80 independent sets), no variant data set is flagged. With the worse one (19 sets, leave one out), 5-25% are flagged. A reader will take the sentence to mean that a better-known covariance helps detection.
- **The pooled null for full whitening is heterogeneous.** meme_analyze.py:88-98 gives fold medians of 3.30, 3.19, 3.76, 3.25 and 8.39. Fold 4 (data sets 80-99) contributes 4 of the 5 exceedances of the pooled 95th percentile, and data set 99 has a misfit of 136.
- **"None flagged" is fragile.**
  - With the 95th percentile of folds 0-3 (10.20), the exponent-0.8 variant is flagged in 10% of data sets.
  - With fold 0 alone (8.13), the variants are flagged in 10-20%, against 5% for the base.
- **"Behaves as expected" (null median 3.80, 95th percentile 16.51, "against about 4") is also too strong.** A chi-square with 4 degrees of freedom has median 3.36 and 95th percentile 9.49.
- **Supported statement:** the misfit has little power against these far-tail changes. Nominal flag rates run from 0 to 25%, depending on the reference distribution and the covariance estimate, and the null has a heavy upper tail.
- The abstract's "rarely or not at all" is fine.

### 3. Should-fix

- **S1. note.tex:69, Braun attribution.** "This is Lemmas 5 and 8 of Braun … applied to two kernels with a common head" overstates it slightly.
  - Lemma 5 (Weyl, truncated against full kernel matrix) plus Lemma 8 (||E|| ≤ M² Σ_{i>r} λ_i), combined by the triangle inequality, give C²(τ_M + τ'_M). The note's max(τ_M, τ'_M) uses positivity, which is the note's own step.
  - Braun's matrices are also uncentred.
  - Suggested wording: "follows from Lemmas 5 and 8 of Braun (with the sum of the tail masses; positivity gives the maximum)".
- **S2. Kong and Valiant are not cited.** note.tex:97 describes their estimator, and the code calls it Kong-Valiant (matern_extra.py:8, meme_analyze.py:12). Cite Kong and Valiant, Ann. Statist. 45 (2017).
- **S3. results.tex:56, d_eff.** "Behave like 1 + 2/d_eff" defines d_eff by inverting the formula at ℓ = 8 for nu = 1; it is not a finding.
  - The same inversion for nu = 0.75 gives 3.5-5.1 in the 8D sets and 2.8-2.9 in the 4D sets, against 3.2-4.4 and 2.6-2.7 for nu = 1. These are the macros DeffMid* at make_numbers.py:188, computed but not printed.
  - So d_eff is not a property of the stimulus set alone. Call it a descriptive rescaling and give both values.
- **S4. results.tex:96, Matern MEME.** State these limits:
  - **(a) Borrowed weights and threshold.** The diagonal weights and the "within null 95th percentile" filter come from the BPL(0.5, 1.25) simulation with neural noise. Applying them to noise-free Matern KV moments is a heuristic filter, not a calibrated test.
  - **(b) Break at the grid edge.** For ℓ ≥ 1 the profiled break sits at the lower edge of the grid (4) in 59 of 60 fits, for both diagonal and full weights. For 8D MP032 0810 at ℓ = 1/4 it sits at the upper edge (30). One fit ends at the α2 bound of 6.000 (4D MP033 0919, nu = 1.5, ℓ = 4). These α2 values are single-exponent fits from rank 4, not tail exponents in the usual sense.
  - **(c) Infinite versus finite population.** The moments are for infinitely many neurons, while the fit runs over 8,704 indices. For a population of 8,704 Gaussian-process neurons, E tr Σ² exceeds tr T² by a relative amount of about PR/N. The participation ratios from the KV moments reach 864 at ℓ = 1/4 in the 8D sets, so this is up to about +0.095 in log tr Σ², about 2.4 weight SDs. For ℓ ≥ 1 (PR ≤ 38) it is negligible. Five of the seven "differentiable codes below the bound" are ℓ = 1/4 8D fits. Those α2 values (0.74-1.06) are far enough below 1.25 that the counts probably survive, but say so.
  - **(d) Wording.** "Fits that no misfit check rejects" should say which check: the diagonal and full counts are separate sets, not an intersection. "Irrespective of the code's smoothness" is too strong under full whitening, where 6 of 17 nu = 0.75 fits lie above the bound against 18 of 24 for nu = 1.5. "On both sides of the bound for every smoothness" is accurate.
- **S5. results.tex:56 and the stand-in problem.** The curvature caveat ("a reader could reject such spectra as stand-ins for the near-straight reported ones") also applies to the border codes that reach 1.49. "Near-straight reported ones" is a claim about recorded spectra that the note did not compute. Either compute sub-window exponents of the published 8D and 4D spectra, or say plainly that the shape comparison is not made.
- **S6. results.tex:54, the finite-N shift.** "With 8,704 neurons the window exponents are lower, by up to 0.050 (… −0.050 to +0.007 …)". Eight of the 112 computed cells are higher: nu = 1.5 and 2.5 on 4D MP032 0922 and 8D MP032 0810, up to +0.007. The range covers only the computed cells. Say "mostly lower" and "over the computed cells".
- **S7. Fragile margins.**
  - At P = 2,000 the nu = 0.75, ℓ = 4 count "in six" includes 8D MP034 0915 at a mean of 1.2524, with one of its four subsets at 1.2498.
  - The finite-N reach count of "three" includes 8D MP031 0702 at 1.4935, from 5 populations.
  - Both counts rest on margins comparable to the subset SD (up to 0.006) or the population SD (0.0013-0.0021). Say so, or print the margins.

### 4. Nits

- **N1. Fig. 2 right panel:** the title is clipped at the right edge; the closing ")" after "(window 3.50" is outside the canvas.
- **N2. results.tex:44, Table 3 caption:** "--: not computed", but no cell is "--".
- **N3. results.tex:92, "no variant is flagged in more than 0.05".** The 0.05 is the base row (MemeFlagDiagMax includes the base, make_numbers.py:310). Every variant is 0 of 20. The variants' median diagonal misfits (0.004-0.007) are even below the base's (0.010), which makes the lack of power plainer and is worth saying.
- **N4. note.tex:79, "far smaller than the tail variance" for p ≥ 2.** This depends on scale. Write the bound Σ_{j>M} λ_j^p ≤ λ_{M+1}^{p−1} τ_M.
- **N5. note.tex:47, Shawe-Taylor et al.** Their proposition concerns partial sums: in expectation, leading sums overestimate and trailing sums underestimate. It does not concern individual eigenvalues.
- **N6. results.tex:100, "dividing the noise raises the tail signal-to-noise ratio without matching it".** No SNR was computed. The ratios printed compare cvPCA signal estimates.
- **N7. results.tex:54, finite-N crossings "ℓ ≤ 1/2".** These include ℓ = 1/8, which was not computed at finite N. The conclusion is safe, but say so.
- **N8. discussion.tex:1, "α ≈ 1 + 2/d".** Stringer's Discussion uses this to describe the fitted exponent. Say that the objection is to reading it as the asymptotic exponent.
- **N9. Fig. 3:** remove the ±0.10 band or explain it.
- **N10. note.tex:69, "fixes the finite-sample eigenvalues up to the tail variance τ_M".** This should read "up to C² τ_M".

### 5. Judgement of the MEME revision (item 5 of the brief)

- **Target.** KV eigenmoments of noise-free responses are the right target. They are exactly what MEME's estimator returns without noise, and they are unbiased for the population moments over the stimulus distribution. The sample-spectrum moments are V-statistics, biased upward for p ≥ 2.
- **Stimulus pairing.** The single pairing (file order) is not a practical problem. On 6 cells of 8D MP032 0810 with 4 pairings each:
  - The log moments vary with SD 0.03 at p = 2 up to 0.24 at p = 8.
  - α2 varies by at most 0.020 (for example nu = 1, ℓ = 4 gives 1.970-1.990; nu = 0.75, ℓ = 1 gives 1.298-1.303).
  - The pass/fail status did not change, although misfits moved by up to a factor of 2.7.
  - The limits that do matter are S4(a) to (c).
- **Cross-fitting.** The null is cross-fitted correctly.
  - Diagonal case: the paired variants use weights from data sets 20-99. Null fold 0 (data sets 0-19) uses the same weights, and every other null value uses weights estimated without that data set.
  - Full whitening is equally sound in construction, but the pooled null is fold-heterogeneous (M2).
- **Conclusion.** "Rarely or not at all" is supported. "Depends on how well the covariance is known" is not supported as worded (M2).

### 6. Novelty and framing (item 6)

- **Framing.** The framing is now accurate and modest: "elementary, and parts of it are anticipated"; "makes the elementary point quantitative".
- **Quotations and paraphrases, checked in context:**
  - Pospisil and Pillow's "remains unclear" comes after their MEME analysis and refers to tail variability across recordings. The note uses it fairly.
  - "Can infer eigenvalues beyond the rank of the data…" is quoted accurately. The note's discussion correctly limits the Supplementary Fig. S1 demonstration to a correct parametric form.
  - Davidovich and Roudi's "with a reasonable margin" and "does not affect the conclusions…" are accurate. So is the description that their fits depend on the noise model and the range of data.
  - Stringer's SI §2.3 and Discussion are quoted accurately.
- **Remaining over-identification:** Braun (S1) and the missing Kong-Valiant citation (S2).
- **What remains new:** the Matern computations on the real stimulus coordinates, with their dependence on window, metric, P and N; the d = 1 split into pre-asymptotic and aliasing parts; and the MEME far-tail insensitivity. The last is the most useful, because it qualifies Pospisil and Pillow's statements about inferring beyond the data rank and about the misfit check.
- **One possibly relevant uncited precedent:** Spigler, Geiger and Wyart (J. Stat. Mech. 2020) relate kernel Gram spectra on real data to an effective dimension, which resembles d_eff. I did not verify this against the paper, so treat it as a suggestion.

### 7. What I reproduced

**Reruns of the note's code from my copy:**
- **`make_numbers.py`:** 336 macros, all assertions pass. `numbers.tex`, all four `tab_*.tex`, `out/numbers.json` and `out/tab_grating.tex` are byte-identical to the originals.
- **`check_quotes.py`:** 18 of 18 quotations found verbatim (exit 0). I also checked contexts by hand in lit/ and spectrum-power/lit.
  - Pospisil and Pillow's N = 7.
  - "MEME average α2 = 1.20, cvPCA average α = 1.01".
  - Braun's Lemmas 5 and 8.
  - Stringer's Theorem 5 hypotheses.
- **`verify_independent.py`:** ALL PASS, and the log is identical to the saved `out/verify_independent.log`.
- **New computation run end to end:** `matern_extra.py white 8D_MP031_0702` (20 kernels) produced a JSON byte-identical to the original.
- **PDF:** rebuilds to 13 pages with no LaTeX warnings.

**My own code (no imports from the note):**

| Quantity | Mine | Note |
|---|---|---|
| Whitened 8D MP032 0915, nu = 0.75, ℓ = 4, ranks 11-500 | 1.214267 | 1.214267 |
| Same, nu = 1, ℓ = 1 | 1.185031 | 1.185031 |
| Same, nu = 1, ℓ = 8 | 1.384835 | 1.384835 |
| Same, nu = 0.75, ℓ = 8 | 1.226154 | 1.226154 |
| Finite N = 8,704, 8D MP034 0915, nu = 1, ℓ = 1 (10 populations) | 1.24217 ± 0.00036 SE (SD 0.00115, range 1.2402-1.2447) | 1.2424 (SD 0.0014, 2.5-97.5% 1.2400-1.2446, 20 populations) |
| Finite N = 8,704, 8D MP030 0607, nu = 1, ℓ = 1 (5 populations) | 1.25069 ± 0.00050 | 1.2502 (1.2479-1.2524) |
| d = 1 example, window 5-30, both tails | 3.501162 | 3.5012 |
| d = 1 example, tail masses | 1.999e-9 and 4.990e-10 | 2.0e-9 and 5.0e-10 |

- **Whitened coordinates:** computed with ARPACK coordinates, a log-space Matern via `kve`, explicit double centring, `eigh` and my own weighted least squares. The ranks 101-500 and 11-100 values also agree to 1e-6.
- **Finite N:** computed by drawing Gaussian-process tuning curves directly, not through the Wishart shortcut. My N = ∞ values match: 1.261393 (MP034 0915) and 1.269031 (MP030 0607). The finite-N results confirm "at or below the bound" for both sets.
- **d = 1 example:** computed from a directly assembled 32 x 32 kernel.

**Diagnostics computed from `out/meme.json`:**
- Full-whitening null by fold, the flag rates under the alternative references, and the break-grid counts (all in M2 and S4).
- The KV pairing check, which used the note's `est.meme_fit` on purpose.

### Limitations of this review

- I did not rerun `meme_sim.py`, the full `matern_window.py` (350 kernels), `matern_finiteN.py`, `circle_d1.py`, `snr_cv.py` or `make_figures.py`. The MEME judgements rest on the saved simulated moments.
- The pairing check covers one 8D set, six cells and four pairings, and uses the note's own fitting code.
- The PR/N estimate in S4(c) is analytic. I did not recompute the finite-N moments.
- I did not reread Pospisil and Pillow's code. Its three stated deviations are taken from the note and the first report.
- My novelty check used the saved literature and my own knowledge. I did no new web search.
- I computed no recorded spectra, so the curvature comparison in S5 remains open.