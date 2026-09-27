# Reruns of the proofs, 2026-09-27

What was rerun from a copy of this folder, with which programs, and what came out. Every run used Python 3.11.15,
python-flint 0.9.0, mpmath 1.3.0, numpy 2.4.6, SymPy 1.14.0 and SciPy 1.17.1, on a shared four-core machine, under
`nice -n 19` with at most two processes at a time; the steps that the scripts run in parallel were run one after
another (edited copies of the scripts that differ only in `&`/`wait` and in the worker counts of `simple_zero.py` and
`spectrum_num.py`). Times are wall-clock times on that busy machine. No run was made with `python -O`, and every
program now refuses it (Section 9 of the manuscript, Program hygiene).

## 1. The check scripts

Earlier on 2026-09-27, from a copy at commit 395bba3, with twelve `NF_*` variables planted in the environment
(`NF_PULSE=slow`, `NF_DU=0.15`, `NF_R_OVER_RHO=0.5`, `NF_PREC=64`, `NF_TOL=1e-5`, `NF_ORDER=4`, `NF_TAG=_planted`,
`NF_BETA=20`, `NF_EPS=1/10`, `NF_EVANS_PREC=64`, `NF_STAB_PREC=64`, `NF_STAB_OUT=planted`), which every script clears:

| script | checks | time | result |
|---|---|---|---|
| `sh code/run_all.sh` | 20 | 6 min 6 s | all passed; summary identical to `data/run_all.txt`, the 8 certificates identical apart from `time_s` |
| `sh ext/slow-pulse/code/run_all.sh` | 26 | 74 s | all passed; summary and 22 certificates identical apart from timing |
| `sh ext/gain-12/code/run_all.sh` | 23 | 3 min 9 s | all passed; summary and 9 certificates identical |
| `sh ext/eps-range/run_checks.sh` | 8 | 2 min 9 s | all passed; `table.py` reproduces `data/table_summary.txt` and `data/probe_summary.txt` byte for byte |
| `sh ext/stability/run_all.sh quick` | 15 | 26 min, then 20 min of numerical scripts | all passed; every certificate it rewrote, the recomputed pulse records (P3) and `spectrum_num.json` identical apart from timing |
| `python3 ext/stability/winding_controls.py run 1` | the pieces of W1, W2 | 17 min | each piece identical to the stored one apart from `time_s`; each segment file identical byte for byte |
| `sh ext/faye-model/code/run_all.sh` 1/20, 1/50, 1/100 | 14 each | 4 min 26 s, 11 min 34 s, 48 min 35 s | all passed; each summary identical to `data/run_all_eps1_*.txt`, the 7 certificates of each identical apart from timing |

Each of the eight scripts, started with `PYTHONOPTIMIZE=1`, printed "FAIL  PYTHONOPTIMIZE is set" and exited with
status 1 before running anything.

Since commit 395bba3 the programs have changed only by the refusal of `python -O` at import (`code/nfcore.py`, its
copy in `ext/gain-12/code/`, `ext/faye-model/code/fcore.py`, `ext/stability/_paths.py`, the two mpmath re-checks of the
blocks, `ext/eps-range/table.py`), which does nothing when Python runs without `-O`, by the prelude of
`ext/eps-range/run_range.py` (refuse `PYTHONOPTIMIZE`, clear `NF_*`), and by docstrings and comments. From a copy at
commit 3d1649e, which carries these changes, with the same twelve variables planted:

| script | checks | time | result |
|---|---|---|---|
| `sh code/run_all.sh` | 20 | 400 s | all passed; the summary is identical to `data/run_all.txt` byte for byte, and the 8 certificates it writes are identical apart from `time_s` |
| `sh ext/slow-pulse/code/run_all.sh` | 26 | 55 s | all passed; summary identical to `data/run_all.txt`, 22 certificates identical apart from timing |
| `sh ext/gain-12/code/run_all.sh` | 23 | 156 s | all passed; summary and 9 certificates identical apart from timing |
| `sh ext/eps-range/run_checks.sh` | 8 | 129 s | all passed; `table.py` with the committed arguments reproduces `data/table_summary.txt` and `data/probe_summary.txt` byte for byte |
| `sh ext/faye-model/code/run_all.sh 1/20` | 14 | 263 s | all passed; summary identical to `data/run_all_eps1_20.txt`, 7 certificates identical apart from timing |
| `sh ext/faye-model/code/run_all.sh 1/50` | 14 | 698 s | all passed; summary identical to `data/run_all_eps1_50.txt`, 7 certificates identical apart from timing |
| `sh ext/stability/run_all.sh quick` | 15 | 2364 s (the rigorous checks in 21 min, then the numerical scripts), one worker for `simple_zero.py` | all passed; the 15 check lines are identical to those of `data/run_all.txt`, and the 7 certificates it rewrote are identical apart from timing; the pulse records were reproduced exactly (check P3) |
| `sh ext/faye-model/code/run_all.sh 1/100` | 14 | 2106 s | all passed; summary identical to `data/run_all_eps1_100.txt`, 7 certificates identical apart from timing |

Two of the scripts were also run from the companion as staged by `node tools/paper-sync.js --stage nf-pulse`, which
holds this folder without the project's working notes, with five `NF_*` variables planted: `sh code/run_all.sh`, 20 checks passed in 351 s, and
`sh ext/slow-pulse/code/run_all.sh`, 26 checks passed in 58 s; both summaries and all 30 certificates they wrote are
identical to the committed ones apart from timing.

## 2. A winding piece of Theorem 6

The six pieces of the winding number were computed at commit 5af378b; each records the SHA-256 digests of
`ext/stability/evans_rig.py`, `winding.py` and `data/pulse_records.pkl`, which equal those of the present files, so
these three files are unchanged. Of the base modules that `evans_rig.py` imports and the digests do not cover,
`code/certify_rest.py` and `code/block.py` have since changed only in comments, and `code/nfcore.py` only by the
refusal of `python -O`.

The piece `left_down` (the left side of the box below the real axis, 380 segments, the side that passes closest to
the zero lambda = 0, where the lower bound of |D~| is smallest, 0.2756) was recomputed with
`python3 winding.py left_down 2` from a copy at commit bc90c99, whose programs differ from the present ones only by
that refusal of `-O` and by docstrings. It took 7163 s on two workers (969 s on four for the stored piece). The new
`winding_left_down.json` is identical to the stored one except for `time_s`, and `winding_left_down_segments.txt`
is identical byte for byte. The piece `top` (the top side of the box, 228 segments, where |lambda| is largest) was
recomputed with `python3 winding.py top 1` from a copy at commit 3d1649e, with the present programs; it took 7781 s on
one worker (1102 s on four for the stored piece), and `winding_top.json` is identical to the stored one except for
`time_s`, and `winding_top_segments.txt` identical byte for byte. The other four pieces were not recomputed.

## 3. Certificates of Theorem 2

The 386 certificates of Theorem 2 and the fourth accepted probe were made by `run_range.py` and `probe_limits.sh`;
each records the SHA-256 prefixes of the programs that made it. `chain.py` (for 286 of them), `lohner7.py`,
`manifold_ad.py`, `pulse_num.py`, `code/lohner.py` and `code/shoot_hp.py` are byte-identical to the present files. The
base modules `code/nfcore.py`, `certify_rest.py`, `manifold.py` and `block.py` differ from those recorded (commit
3e2000a) by: five assertions replaced by explicit checks with the same conditions (`gamma = 0` in two places, the U-range
below theta, `mu0 >= 2`, and a certified bracket in the `__main__` block of `manifold.py`), conditions that hold in
every run; new functions and constants that `chain.py` does not call; comments; a sign convention in `block.setup`, which
`chain.py` does not call; and the refusal of `python -O`. None of these changes alters a value that `chain.py`
computes or an inequality that it checks. The other 101 certificates were made with a version of `chain.py`
(`e0aa72d09e4519dc`) that differs from the present one only in an over-strict assertion on the subdivision of sets
(`ext/eps-range/REPORT.md`).

Nineteen accepted certificates were recomputed with the present programs (commit 3d1649e): thirteen in
[0.08, 0.13693], at least one in each of the twelve bins of Table 2 of the manuscript (three of them made with the
earlier `chain.py`, and the one that contains eps = 1/10), the two further certificates of `data/certs/` and the four
accepted probes, by running `chain.py` on the same interval with the kappa window of the stored certificate (its
`dk`; six of them were first run with `dk` recomputed from the rounded ends of the interval, which differs from the
stored one in its fourth digit, and then again with the stored `dk`; the table gives the second run). Every one of
the 19 passed, with the same number of stages, the same block entry time and the same tally of in-run negative
checks, all refused, as the stored certificate, and with the same rest state, manifold validation and block (the
`setup` of the certificate). Three of them are identical to the stored ones apart from times, program digests and the
bookkeeping of the numerical pulse data: the three whose stored numerical pulse data had been read from the table
`data/pulse_numerics.json`. The other sixteen differ only in the data of the stages of the covering chain, starting
with the direction `d5` of each set, which comes from the numerical derivative of kappa* in eps: the sweep computed
the numerical pulse data of each interval afresh, from a speed guess interpolated at the unrounded ends of the
interval, which were not recorded, while a rerun takes them from that table, where the derivative is stored to 60
digits. Such data are choices that the rigorous checks then take as given, so these sixteen are new certificates of
the same intervals, not bit-for-bit copies.

| stored certificate | chain.py of the stored one | result of the rerun |
|---|---|---|
| certs/eps_0.081560_0.081710 | e0aa72d | PASS, 73 stages; differs in stage data |
| certs/eps_0.086928_0.087014 | e0aa72d | PASS, 70 stages; differs in stage data |
| certs/eps_0.092897_0.092954 | 328042d | PASS, 67 stages; identical |
| certs/eps_0.096498_0.096648 | e0aa72d | PASS, 63 stages; differs in stage data |
| certs/eps_0.099948_0.100178 (eps = 1/10) | 328042d | PASS, 60 stages; differs in stage data |
| certs/eps_0.102948_0.103178 | 328042d | PASS, 58 stages; differs in stage data |
| certs/eps_0.107248_0.107448 | 328042d | PASS, 56 stages; differs in stage data |
| certs/eps_0.112443_0.112747 | 328042d | PASS, 53 stages; differs in stage data |
| certs/eps_0.117748_0.117948 | 328042d | PASS, 52 stages; differs in stage data |
| certs/eps_0.122968_0.123000 | 328042d | PASS, 54 stages; differs in stage data |
| certs/eps_0.127000_0.127100 | 328042d | PASS, 50 stages; differs in stage data |
| certs/eps_0.132430_0.132695 | 328042d | PASS, 46 stages; differs in stage data |
| certs/eps_0.135999_0.136348 | 328042d | PASS, 44 stages; differs in stage data |
| certs/eps_0.138000_0.138200 | 328042d | PASS, 44 stages; differs in stage data |
| certs/eps_0.139500_0.139700 | 328042d | PASS, 44 stages; differs in stage data |
| probes/eps_0.069975_0.070025 | 328042d | PASS, 89 stages; identical |
| probes/eps_0.129900_0.130100 | 328042d | PASS, 48 stages; differs in stage data |
| probes/eps_0.139900_0.140100 | 328042d | PASS, 44 stages; differs in stage data |
| probes/eps_0.149900_0.150100 (eps = 3/20) | 328042d | PASS, 42 stages; identical |

The full sweep (`run_range.py`, about four hours on four cores on an idle machine) and the failed attempts of
`probe_limits.sh`, which no theorem uses, were not rerun.
