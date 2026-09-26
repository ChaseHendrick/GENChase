# Running the MICrONS cohort-excess analysis

Everything random is seeded. Set `MICRONS_DATA` to the folder that holds Ding et al.'s release files
`node_data_v1.pkl` and `edge_data_v1.pkl`. Run from this folder; outputs go to `./work`, or to `MICRONS_WORK` if set.

Requirements are in `requirements.txt`. Python 3.11 is needed; R 4.3 with glmmTMB is optional.

Resources: about 4 GB of memory, and about 3 GB of disk per dataset for `G3.npy`.

## Inputs (not distributed)

**Release files.** Ding et al. 2025, loaded by github.com/cajal/microns-funconn-2025. The MICrONS data are on BossDB,
doi:10.60533/BOSS-2021-T0SY. The copies used had these md5 sums:
- `node_data_v1.pkl`: d1af9572d03edbde85a2ef6e48204cf8
- `edge_data_v1.pkl`: b69d2dd445f2b7f0e1ae19c125e4ab70

**Held-out tables.** CAVE datastack `minnie65_public`, materialization v1822, timestamp 2026-06-27T14:05:22Z. There are
two tables:
- the new axons;
- Ding et al.'s 148 axons, recomputed with the same co-travel pipeline.

`build.py` documents the schema.

## Main analysis

```
export MICRONS_DATA=/path/to/release OMP_NUM_THREADS=1
mkdir -p work
python3 prep.py && python3 export_pairs.py && python3 gram.py
python3 test_swap.py 400000              # swap sampler against exact enumeration (tolerance: 4 Monte Carlo SE)
python3 point.py                         # all nulls, both covariate families -> work/point_real.json
python3 condz.py --data main --configs N0,N1,N2,N3
python3 boot.py pw 0 500 & python3 boot.py pw 500 500 & wait     # B = 1000, resumable
python3 analyze.py pw                    # work/table_pw.csv, work/reductions_pw.csv
python3 sens_unpen.py; python3 chain_diag.py; python3 bias_diag.py
```

## Calibration, negative controls, coverage

```
Rscript glmm_crossed.R                   # writes work/post_blup_dt.csv (a copy of the values used is kept)
for s in G0 G05 G1 G15 G2 G3 O L OL; do python3 calib.py $s 0 20; done; python3 calib_summary.py
python3 cover.py H0 0 60 80; python3 cover.py H1 0 60 80; python3 coverage_summary.py
for k in 0 10 20; do for s in X H0 H1; do python3 cover2.py $s $k 10 40; done; done
for s in XL XLf XO; do python3 cover3.py $s 0 10; done
python3 figures2.py; python3 derive_compact.py
```

## Held-out run (plan: heldout_plan_2026-09-26.txt; deviations: heldout_deviations.txt)

```
python3 build.py --edges 'held/edges_ding_axons_connected_adp_v1822_part*.csv' --tag ding1822 --allow-shared-pre --approx-rfd --drop-zero-L
python3 build.py --edges 'held/edges_new_axons_connected_adp_v1822_part*.csv' --tag new1822 --approx-rfd --drop-zero-L
python3 test_build.py                    # every bad-input probe must stop the build
python3 point.py --data ding1822 --configs N0,N1,N3
python3 point.py --data new1822 --configs N0,N1,N3 --ndraw 200 --nmeas 2
python3 condz.py --data ding1822; python3 condz.py --data new1822 --ndraw 200
python3 boot.py ding1822 0 500 --data ding1822 --configs N1,N3 --fams dt,iv --nmeas 2
python3 boot.py new1822 0 200 --data new1822 --configs N1,N3 --fams dt,iv --nmeas 2 --tol 1e-5 --nburn 20 --ndraw 8
python3 analyze_heldout.py               # work/heldout_result.json, work/heldout_table.csv
```

### Edge columns

- Required:
  - `pre_nucleus_id`, `post_nucleus_id`
  - `population`: `C`/`Connected` or `A`/`ADP`; other rows are ignored.
  - `n_synapses`
  - `dend_len`: co-travel within 5 um, in mm, > 0 on every C and A row.
- Optional:
  - `post_excl29`: rows with 1 are dropped.
  - `proj_hva`: otherwise derived from the node hva labels.
  - `in_silico_sig_corr_cvt`, `in_vivo_sig_corr`, `readout_similarity_cvt`: always recomputed from the nodes; checked
    against the table when present.
  - `readout_location_distance_cvt`: approximated with `--approx-rfd`.

### Node fields

`node_data_v1` schema:
- `nucleus_id`, `nucleus_x/y/z` (nm), `cc_max_cvt`, `cc_abs_cvt`, `layer`, `hva`
- `in_silico_resp`, `in_vivo_mean_resp`, `readout_cvt`
- `position_stim_cvt`: needed with `--approx-rfd`.

### Hard errors in `build.py`

- duplicated (pre, post) rows;
- presynaptic cells shared with the main analysis (unless `--allow-shared-pre`);
- presynaptic cells with connected rows but no ADP rows, or an ADP:connected ratio below 5;
- rows without co-travel (unless `--drop-zero-L`);
- coordinates not in nm;
- hva labels other than V1 and HVA;
- signal correlations that disagree with the node responses;
- a missing RF-distance column (unless `--approx-rfd`).
