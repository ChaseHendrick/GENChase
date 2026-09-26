# Does the MICrONS "cohort" wiring rule survive conditioning on what each axon can reach, and does it replicate on new axons?

Research record of 2026-09-26, drafted in this repository by the owner's standing decision of that day. **Exploratory,
one animal.** An independent in-project checker reviewed the point estimates. A second checked the calibration
and held-out work: it rebuilt both held-out tables and the primary statistic with its own code, and it found that the
first version of this report overstated the held-out result and the laminar control. Its findings and the
corrections are in "Corrections after the second check" below.

## Result

Ding et al. (Nature 640, 2025) report a higher-order ("cohort") like-to-like wiring rule in the MICrONS functional
connectome: the postsynaptic partners of an axon are functionally more similar to one another than chance. The
question here is whether that excess survives nulls that hold fixed what each axon can reach, and whether it
replicates on axons outside their set.

- **Reproduction.** Their excess reproduces: digital-twin (DT) signal-correlation excess +0.0148 under the stage-1
  null (an independent reimplementation by the first checker gave 0.014776, within 5e-5).
- **Main data, strictest null.** Holding every cell's synapse total, every axon's total and each axon's count in six
  equal-count depth bins fixed (N3), the DT excess is **+0.0067, conservative 95% interval [-0.0008, 0.0134], z 1.84,
  two-sided p 0.066 (normal) or 0.084 (percentile)**. The interval includes zero. The estimate changes little with
  finer depth bins: +0.0062 with 12 bins (bootstrap z 1.75) and +0.0061 with 24. The in vivo measure is not
  distinguishable from zero (+0.0041 [-0.0028, 0.0106]).
- **Held-out test: the pre-registered primary is not significant, and the test is weakly informative.** On 625 axons
  proofread in MICrONS but not among Ding et al.'s 148, the primary statistic fixed in a plan hash-recorded before any
  held-out statistic was computed (DT, null N1, all projections) is **+0.0014, z 1.23, one-sided p 0.11**, below the
  decision threshold z >= 1.645. That is the pre-registered decision, and a rebuild with independent code confirms it.
  It does not show that the excess is absent in new axons:
  - 562 of the 769 held-out groups are V1 to V1, where Ding et al.'s own axons show no excess (-0.0005 +/- 0.0026);
    their excess sits in the other projection types (+0.0071 to +0.0105 under N1).
  - Ding et al.'s axons, reweighted to the held-out projection mix, give **+0.0023 +/- 0.0026 (z 0.87)**, not
    significant either. The held-out value differs from that by **-0.0009 +/- 0.0028** (N3: -0.0011 +/- 0.0027). The
    pooled difference against the reference's own mix (-0.0053 +/- 0.0032; the reference gives +0.0067, z 2.26) is
    mostly a difference of composition.
  - Within V1 to V1 the held-out excess is positive, +0.0019 +/- 0.0009 (N1) and +0.0023 +/- 0.0009 (N3).
  - Secondary statistics (no decision weight, not adjusted): DT N3 +0.0017 (z 1.65, within Monte Carlo error of the
    threshold), in vivo N1 +0.0019 (z 1.81), in vivo N3 +0.0023 (z 2.15).

  The plan (section 7) calls a null result weakly informative; with this composition it is. The held-out set could not
  test the projection types that carry the reference excess.

What it cannot claim:

- **No size for a cohort rule.** The excess is a test statistic, not an effect size: on synthetic data with an
  injected rule, the degree-preserving nulls recover only 16 to 47% of the injected (oracle) excess, and the real
  pattern lies outside that rule family, so the curve cannot be inverted.
- **No "failed to replicate" reading.** The held-out set tests mostly V1 to V1 (above); it neither confirms nor
  contradicts the reference excess in the other projection types. Reweighting the held-out excesses to the
  reference's projection mix is uninformative (+0.0012 +/- 0.0039).
- **No "confounding removed" reading.** The drop from 0.0148 (N0) to 0.0085 (N1) mixes removed confounding with
  absorbed signal.
- **N3 removes laminar targeting only at its own resolution.** In the no-rule controls whose laminar preference sits
  on N3's own six bins, N3 is unbiased by construction. With the preference on 12 finer bins, or on six bins shifted by
  half a bin, N3 keeps about half of N1's bias (+0.0004 and +0.0005; see the calibration). That is about 30% of the
  held-out N3 value and 8% of the main-data value. With 12 bins the held-out N3 value falls from +0.0017 to +0.0014.
- **Per projection type.** Nothing survives the Holm adjustment under N1. `analyze_heldout.py` computes Holm under N1
  only; under N3 the held-out V1-to-V1 test would give 8 x 0.0063 = 0.050, on the boundary.
- **No exact p-values.** The two-way bootstrap is conservative (its SE is 1.7 to 3.6 times the true spread in
  synthetic worlds). The conditional swap test is anti-conservative on the real design even with no structure outside
  the null's model (G0: conditional SD 0.73 of the spread across datasets, 3 of 20 datasets rejected for N1 and for
  N3) and more so with it (0.63 to 0.79), while in the super-population world with no rule it is conservative (1.27 to
  1.55). The two calibrations disagree, so only the bootstrap is used for conclusions.
- **Scope.** The 625 axons are not among Ding et al.'s 148 presynaptic axons (checked against all 148), but they are
  cells in Ding et al.'s release and the postsynaptic cells are shared, so the held-out and reference estimates are
  not independent and a difference whose SEs are combined as if they were is approximate. The materialization Ding et
  al. used is not public, so the new axons are not provably proofread after it. One animal.

## The nulls

- **N0**: the stage-1 own-pool multinomial.
- **N0p**: N0 plus log soma distance and a linear gradient in postsynaptic position per projection type (28
  parameters, full rank).
- **N1**: every cell's total and every axon's total fixed; Metropolis swaps inside the proximity pools with weights
  from a two-way fixed-effect Poisson fit; the exact conditional null for any per-cell propensity.
- **N2**: N1 plus soma distance plus a depth-pair term.
- **N3**: N1 plus soma distance, with each axon's count in each of 6 depth bins also fixed.

The sampler matches exact enumeration on small tables (all |z| < 2.3 with Monte Carlo error as tolerance), relaxes
within about 10 sweeps, and scrambled starts agree; removing the penalty from the coefficient fit changes the excess
by at most 0.00015.

## Main data (Ding et al.'s release, 142 groups, B = 1,000)

Two-way bootstrap (postsynaptic cells resampled as copies, presynaptic cells as weights, eligible groups fixed).

| Null | DT excess [95% percentile] | DT z | In vivo excess [95% percentile] | In vivo z |
|---|---|---|---|---|
| N0 | 0.0148 [0.0065, 0.0235] | 3.44 | 0.0090 [0.0015, 0.0166] | 2.31 |
| N0p | 0.0100 [0.0024, 0.0174] | 2.57 | 0.0063 [-0.0009, 0.0134] | 1.73 |
| N1 | 0.0085 [0.0005, 0.0162] | 2.11 | 0.0050 [-0.0022, 0.0123] | 1.33 |
| N2 | 0.0085 [-0.0000, 0.0160] | 2.18 | 0.0052 [-0.0019, 0.0123] | 1.41 |
| N3 | 0.0067 [-0.0008, 0.0134] | 1.84 | 0.0041 [-0.0028, 0.0106] | 1.17 |

Paired changes (DT): N0 to N1 -0.0063 [-0.0106, -0.0025]; N1 to N2 0.0001 [-0.0029, 0.0024]; N2 to N3 -0.0018
[-0.0052, +0.0010]. Re-applying the eligibility rule inside each resample shifts the replicates by -0.0013 to -0.0016
(a sensitivity band of 0.3 to 0.8 SD); the fixed-eligibility result is for the conditional estimand "these 142 groups".

## Calibration (synthetic worlds on the real design)

- **Absorption.** For anchor-rule strength gamma = 0.5 to 3, the oracle excess runs from 0.0035 to 0.0273; N1
  recovers 0.16 +/- 0.11 of it at gamma = 0.5 and 0.23 to 0.47 (each about +/- 0.03 to 0.04) above, N3 0.16 to 0.45,
  and the null mean absorbs 55 to 86% of the rise in observed correlation. The plan's "12 to 26%" and "74 to 89%"
  came from an earlier calibration.
- **No-rule laminar controls.** Each axon draws its own random preference exp(0.7 z) per depth bin (100 datasets per
  row, `calib_x.py`; the first row is the original control L, rerun with 100 datasets instead of 20):

  | Preference on | N1 excess | N3 excess | N3 conditional rejections |
  |---|---|---|---|
  | N3's own six bins | +0.00108 +/- 0.00013 | +0.00008 +/- 0.00012 | 4/100 |
  | 12 finer bins | +0.00086 +/- 0.00014 | +0.00040 +/- 0.00012 | 7/100 |
  | six bins shifted by half a bin | +0.00110 +/- 0.00015 | +0.00053 +/- 0.00013 | 11/100 |

  N3 removes a laminar preference aligned with its bins and about half of one that is not, so a claim beyond laminar
  targeting rests on N3 and carries that residual. One amplitude (0.7), main design only.
- **Other biases with no rule.** In the super-population world N1 gives -0.00030 +/- 0.00019 and N3 -0.00043 +/-
  0.00014; in the out-of-family laminar world XL (10 datasets) N3 gives +0.00071 +/- 0.00035.
- **The O and OL "oracle" is not the truth.** It is a multinomial null under a generator that is not multinomial, and
  it reads -0.0011 and -0.0009 where the true excess is 0.
- **Size and power.** With no rule, the bootstrap rejected 0 of 30 in family and, out of family, 0% for N3 (N1, being
  biased there, 17%); the conditional test rejected 17% (N3) and 80% (N1) out of family. With a rule (gamma = 2) the
  bootstrap's power is 67% (N1) and 50% (N3). 20 to 60 datasets per scenario, so the SE ratios carry about +/-13%.
- `data/coverage.csv` uses the mean N2 estimate over the H1 datasets as the H1 truth (`coverage_summary.py`), so its
  H1 coverage is coverage of that mean, not of a known truth.

## Held-out run

- The plan, `plan/heldout_plan_2026-09-26.txt`, was hash-recorded at 16:27 UTC before any held-out statistic, and the
  code hashes at 16:36 UTC (`plan/heldout_plan.sha256`; both times are file times, see the integrity record below). Paths in the plan refer to the session's working folders.
- Seven deviations are logged in `plan/heldout_deviations.txt`, each before the result it affects:
  - three change run length or which configurations are bootstrapped (3, 5, 7: B = 200 with an extension rule, shorter
    chains, two measures);
  - one corrects the plan's stated time (1);
  - one drops connected rows with zero co-travel (skeleton gaps) from both tables (2): 329 held-out and 143 reference
    rows before the 29 excluded cells were removed, 327 and 142 after;
  - one adds the exploratory composition-matched comparison (4);
  - one notes that N1 must be read beside N3 (6).
- The held-out table has 625 axons, none of them among Ding et al.'s 148 presynaptic axons (checked; see Scope), 769
  eligible groups and 61,863
  synapses; the reference table 144 axons and 162 groups. At B = 200 the held-out z of 1.23 is outside the extension
  band (the second check puts its Monte Carlo range at 1.13 to 1.36), so the decision is final.

## Corrections after the second check

The second in-project check (2026-09-26) rebuilt both held-out tables from the raw CAVE exports with its own code
(rows, co-travel and eligible groups matched exactly), recomputed the held-out statistic with its own N1 (+0.00133
against +0.00136 here), recomputed every z from the saved replicates, reran one replicate bit for bit, and confirmed
that no held-out statistic existed before the code was frozen. It found the decision sound and the following wrong;
each is corrected above or recorded here.

- Corrected above: the held-out framing ("does not replicate"), the claim that N3 is unbiased (true only for a
  preference on its own bins), the main-data wording ("a small excess remains" on a post hoc one-sided p; "each
  axon's own laminar profile"), the conditional test's calibration, the missing biases, the recovered fractions'
  uncertainty, the O/OL oracle, the Holm statement, the overlap statement and the deviation counts.
- **Integrity record.** Three things are missing from `plan/heldout_plan.sha256`:
  - `analyze.py` changed at 16:55 UTC, after the 16:36 freeze; its current hash (0bccf063...) is not recorded. It
    makes the main-data tables only.
  - A second bootstrap launcher (18:06 UTC, after the held-out point estimates) added streams and a watcher without a
    deviation entry. The check found it harmless, because each replicate depends only on its index.
  - The plan's hash has no external timestamp before the git commit at 19:49 UTC; the project's commitment tool was
    not used, so the 16:27 time rests on file times and the session's own record.
- **Deviation 7's premise.** The held-out SE is 1.1e-3, not "of order 2e-3", so the shorter chains inflate SE_boot by
  up to about 4%, not under 1%; and each chain starts from its replicate's observed state, so an under-relaxed chain
  shrinks the excess rather than shifting every replicate alike. Neither changes the decision.
- **The 29 excluded cells.** The plan calls them excluded everywhere; according to the check, 18 of them remain in the
  main-data analysis (369 rows, 5 synapses), which is numerically negligible.
- **`build.py`** checks shared presynaptic cells against the main table's 143 axons rather than Ding et al.'s 148; the
  check found no overlap with any of the 148.
- **`RUN.md`** did not say that held-out replicates 0 and 100 ran with the earlier chain settings, or where its `held/`
  folder comes from; both are now stated there.

The new numbers are recomputed from `data/` by `code/check2_summary.py`; the programs that made them are
`code/calib_x.py` (the laminar controls), `code/n3bins.py` (N3 at other depth resolutions) and `code/boot_nbin.py`
(its bootstrap). Not checked by the second check: the R random effects, the figures, and the nulls N0p and N2; it did
not reimplement N3 or the bootstrap, and its own N1 agrees with this one to about 2e-4.

## Data sources

- **Ding et al.'s release** on BossDB (node and edge tables v1, `node_data_v1.pkl` and `edge_data_v1.pkl`). The
  article is CC BY 4.0; its data statement ("All MICrONS data are available on BossDB") states no data licence.
- **CAVE `minnie65_public`, materialization v1822** (2026-06-27T14:05:22Z), read with the owner's CAVE account for the
  625 new axons, their synapses, proofreading status and skeletons; co-travel computed with Ding et al.'s own proximity
  functions (MIT licence), for the new axons and, with the same pipeline, for their 148.
- **Licence.** No licence for the MICrONS data is stated on the pages read (the article's data statement, the MICrONS
  Explorer citation policy, the BossDB project record). The AWS Open Data Registry entry for the BossDB bucket lists
  CC BY 4.0, CC0 1.0 and CC BY-NC-SA 4.0 for the bucket as a whole without saying which applies to MICrONS, and the
  CAVE terms of service sit behind sign-in. So this folder holds only the programs and aggregate statistics; the
  per-cell and per-group tables (per-group excess values, per-cell random effects and feature tables) are withheld
  until the data licence is confirmed. Cite Ding et al. (2025) and the MICrONS Consortium when using these numbers.

## Files

| Path | What |
|---|---|
| `RUN.md` | How to rebuild the inputs and rerun every step |
| `code/` | The programs (`cx.py` core, `build.py` input checks with hard errors, `point.py`, `boot.py`, `condz.py`, `analyze.py`, `analyze_heldout.py`, the calibration and coverage programs, tests) and `requirements.txt` |
| `plan/` | The hash-recorded held-out plan, its hashes and the deviation log |
| `data/` | Aggregate outputs: point estimates, bootstrap replicates of the summary statistics, conditional tests, calibration and coverage summaries (synthetic counts on the real design), `heldout_result.json` and `heldout_table.csv`; from the second check, `calibx_*.csv`, `n3bins_*.json` and `boot_replicates_main_n3_nbin*.jsonl.gz` |
| `figures/` | Excess by null, absorption, negative controls, SE calibration, held-out |

## Still open

Several hundred datasets per calibration scenario; laminar controls at other amplitudes and on the held-out design;
rule families other than the anchor rule; the in vivo cell filter behind Ding et al.'s Supplementary Table 26;
NEURD-cleaned skeletons for the held-out co-travel; a held-out set with enough interareal axons to test the projection
types that carry the reference excess; an independent reimplementation of N3 and the bootstrap.

## License

The programs in `code/` are licensed under the Apache License 2.0 (see NOTICE). The aggregate statistics in `data/`
and the figures carry no licence of their own here, because no licence for the underlying MICrONS data could be
confirmed (above); cite Ding et al. (2025) and the MICrONS Consortium when you use them.
