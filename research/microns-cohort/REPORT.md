# Does the MICrONS "cohort" wiring rule survive conditioning on what each axon can reach, and does it replicate on new axons?

Research record of 2026-09-26, drafted in this repository by the owner's standing decision of that day. **Exploratory,
one animal.** An independent in-project checker reviewed the point estimates; the
calibration and held-out work that followed its report has not been independently checked.

## Result

Ding et al. (Nature 640, 2025) report a higher-order ("cohort") like-to-like wiring rule in the MICrONS functional
connectome: the postsynaptic partners of an axon are functionally more similar to one another than chance. The
question here is whether that excess survives nulls that hold fixed what each axon can reach, and whether it
replicates on axons outside their set.

- **Reproduction.** Their excess reproduces: digital-twin (DT) signal-correlation excess +0.0148 under the stage-1
  null (an independent reimplementation by the checker gave 0.014776, within 5e-5).
- **Main data, strictest null.** Holding every cell's synapse total, every axon's total and each axon's own laminar
  (depth) profile fixed (N3), a small DT excess remains: **+0.0067, conservative 95% interval [-0.0008, 0.0134],
  z 1.84, one-sided p about 0.03.** The in vivo measure is not distinguishable from zero (+0.0041 [-0.0028, 0.0106]).
- **Held-out test: does not replicate.** On 625 axons proofread in MICrONS but not in Ding et al.'s set, the primary
  statistic fixed in a plan hash-recorded before any held-out statistic was computed (DT, null N1, all projections)
  is **+0.0014, z 1.23, one-sided p 0.11**, below the decision threshold z >= 1.645. The same pipeline on Ding et al.'s
  own 148 axons, with co-travel recomputed at the same materialization, gives +0.0067 (z 2.26); the held-out value is
  lower by -0.0053 +/- 0.0032. Secondary statistics (no decision weight, not adjusted): DT N3 +0.0017 (z 1.65), in vivo
  N1 +0.0019 (z 1.81), in vivo N3 +0.0023 (z 2.15).

What it cannot claim:

- **No size for a cohort rule.** The excess is a test statistic, not an effect size: on synthetic data with an
  injected rule, the degree-preserving nulls recover only 16 to 47% of the injected (oracle) excess, and the real
  pattern lies outside that rule family, so the curve cannot be inverted.
- **No "confounding removed" reading.** The drop from 0.0148 (N0) to 0.0085 (N1) mixes removed confounding with
  absorbed signal.
- **Nothing per projection type** survives the Holm adjustment under N1 or N3.
- **No exact p-values.** The two-way bootstrap is conservative (its SE is 1.7 to 3.6 times the true spread in
  synthetic worlds); the conditional swap test is anti-conservative when structure outside the null's model is present
  (0.63 to 0.79 of the true spread). Only the bootstrap is used for conclusions.
- **Composition of the held-out set.** 562 of its 769 eligible groups are V1 to V1, where no dataset shows much excess
  (reference -0.0005 +/- 0.0026, held-out +0.0019 +/- 0.0009). Reweighting to the reference's projection mix is
  uninformative (+0.0012 +/- 0.0039).
- **Scope.** The 625 axons are outside Ding et al.'s set; the materialization Ding et al. used is not public, so they
  are not provably proofread after it. One animal.

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
  recovers 0.16 to 0.47 of it and N3 0.16 to 0.45, and the null mean absorbs 55 to 86% of the rise in observed
  correlation.
- **No-rule controls.** N1 is biased by axon-specific laminar preference (+0.0012 +/- 0.0004) and N3 is not
  (+0.0002 +/- 0.0003), so any claim beyond laminar targeting rests on N3.
- **Size and power.** With no rule, the bootstrap rejected 0 of 30 in family and, out of family, 0% for N3 (N1, being
  biased there, 17%); the conditional test rejected 17% (N3) and 80% (N1) out of family. With a rule (gamma = 2) the
  bootstrap's power is 67% (N1) and 50% (N3). 20 to 60 datasets per scenario, so the SE ratios carry about +/-13%.

## Held-out run

- The plan, `plan/heldout_plan_2026-09-26.txt`, was hash-recorded at 16:27 UTC before any held-out statistic, and the
  code hashes at 16:36 UTC (`plan/heldout_plan.sha256`). Paths in the plan refer to the session's working folders.
- Seven deviations are logged in `plan/heldout_deviations.txt`, each before the result it affects: five change only
  run length (B = 200 with an extension rule, shorter chains, two measures), one drops 327 connected rows with zero
  co-travel (skeleton gaps) in both tables alike, and one notes that N1 must be read beside N3.
- The held-out table has 625 axons with no overlap with Ding et al.'s cells (checked), 769 eligible groups and 61,863
  synapses; the reference table 144 axons and 162 groups. At B = 200 the held-out z of 1.23 is outside the extension
  band, so the decision is final.

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
| `data/` | Aggregate outputs: point estimates, bootstrap replicates of the summary statistics, conditional tests, calibration and coverage summaries (synthetic counts on the real design), `heldout_result.json` and `heldout_table.csv` |
| `figures/` | Excess by null, absorption, negative controls, SE calibration, held-out |

## Still open

Several hundred datasets per calibration scenario; rule families other than the anchor rule; the in vivo cell filter
behind Ding et al.'s Supplementary Table 26; NEURD-cleaned skeletons for the held-out co-travel; a held-out set richer
in projection types other than V1 to V1; an independent check of the calibration and held-out code.

## License

The programs in `code/` are licensed under the Apache License 2.0 (see NOTICE). The aggregate statistics in `data/`
and the figures carry no licence of their own here, because no licence for the underlying MICrONS data could be
confirmed (above); cite Ding et al. (2025) and the MICrONS Consortium when you use them.
