# Runbook: the reentry proof program on a dedicated machine

Status: **pilot / dry run; no theorem.** The program in `proof/` has been run end to end only on a small dry-run
instance (N = 3, section 4 below). That instance is not a rotating wave, and its output is labelled dry run. No
statement about reentry in the TP06 ring has been proved. This file says how to run the full N = 16 computation,
what it costs, and how to check what it produces.

Read `SCOPING.md` first: sections 6 (design), 9 (stage 1 pilot) and 10 (stages 2 and 3, the program, the dry run).

## 1. What the program computes

The claim it is built to check:

> In the ring of N = 16 baseline TP06 endocardial cells (author convention, coupling c = 0.035 per ms), the shift
> map P = sigma^{-1} o phi_tau on the section {V_0 = -40 mV, rising}, restricted to the leaf Q = Q0 of total
> charge, has a unique fixed point in an explicit box. Every eigenvalue of its derivative there has modulus at
> most q < 1.

If the check passes, there is a discrete rotating wave (reentry) with rotation period 16 tau. It is orbitally
asymptotically stable within the leaf and neutral across leaves. The minimal period is 16 tau, and each cell has
exactly one upstroke per rotation.

The pieces (all in `proof/`):

| file | role | trusted? |
|---|---|---|
| `ring19.hpp` | CAPD field. The h/j branch and the GHK representation are exact 0/1 map parameters; it also holds the window polynomial (Bernoulli coefficients), the charge Q and the prefactor map | **yes** |
| `engine.hpp` | segment engine: certifies the mode choice on every step enclosure, the Gronwall C0/C1 inflation for window steps, the section split through CAPD's PoincareMap with a validation re-run, checkpoints | **yes** |
| `ap_proof.cpp` | `leafbox` (start sets on the leaf, rigorous K_0 remainder), `segment`, `chain` (containment, derivative product, times), `verify` (block-norm contraction, verify.cpp's design) | **yes** |
| `../../model/setup.hpp` | exact decimal enclosures | **yes** |
| CAPD 6.1.0 + `../../proofs/capd-6.1.0-genchase.patch` | interval Taylor integrator, Poincaré map | **yes** (external) |
| `frame_leaf.py`, `driver.py`, `common.py` | frame proposal, orchestration, floating-point comparisons | no: their outputs are checked by ap_proof |
| `check_field.py`, `check_ghk.py`, `stage2_ghk.py`, `stage3_switch.py` | tests (field against tp06_19d.py, window against mpmath, single-cell and ring pilots) | no (evidence) |

## 2. Hardware

| resource | needed | why (measured, section 5) |
|---|---|---|
| cores | 1 is enough. 8 to 16 shorten the C1 run through the time split (section 3.3) | CAPD's C1 step is single-threaded |
| RAM | 1.5 to 2 GiB per C1 segment process; the multiprecision centre at N = 16 needs RAM_MP_N16 (extrapolated) | stage 1: 1.44 GiB peak for one C1 process at N = 16 |
| disk | 2 GiB per run directory (each C1 checkpoint is about 20 MB) | |
| OS | Linux, g++ >= 9, CMake, libgmp-dev, libmpfr-dev, Python 3 with numpy and scipy (mpmath only for the tests) | |

## 3. Build and run

### 3.1 Build CAPD (once)

```
git clone https://github.com/CAPDGroup/CAPD.git capd && cd capd
git checkout 03dc5628203334b214bb7d9fd63788a175521005
git apply <repo>/research/cardiac-cycle-certificates/proofs/capd-6.1.0-genchase.patch   # header only
cmake -S . -B build -DCAPD_ENABLE_MULTIPRECISION=true -DCMAKE_INSTALL_PREFIX=$HOME/capd-install
cmake --build build -j && cmake --install build
grep -n "GENChase patch" $HOME/capd-install/include/capd/poincare/PoincareMap_templateMembers.h   # must print a line
```

### 3.2 Build ap_proof

```
cd <repo>/research/cardiac-cycle-certificates/ap-reentry/proof
g++ -O2 -std=c++17 ap_proof.cpp -o $HOME/ap_proof $($HOME/capd-install/bin/capd-config --cflags --libs)
export AP_PROOF=$HOME/ap_proof
```

Compile time is about 1 minute. Before a long run, check the build:

```
python3 check_field.py $AP_PROOF <shift_dense.npz> /tmp/cf     # field vs tp06_19d.py: both modes inside
python3 check_ghk.py   $AP_PROOF /tmp/cg                       # coefficients and tail bounds vs mpmath
```

`shift_dense.npz` is written by `pilot/window.py OUTDIR`.

### 3.3 Prepare the N = 16 run

You need the floating-point Jacobian of the shift map at the converged orbit. It is in `$AP_REENTRY_WORK`
(`Jstar_N16_c0.035_{0,152}.npy`); otherwise recompute it with `jac_fd.py` (2 x 303 map evaluations, about
12 core-hours). Then:

```
export AP_REENTRY_WORK=/path/to/work
python3 driver.py prepare --run-dir RUN --instance N16                     # sequential: 3 segments
python3 driver.py prepare --run-dir RUN --instance N16 \
        --split-times 4,8,12,16,20,24,28 --parallel-boxes 1e-7             # time split for 8 processes
```

`prepare` does the following:

* builds the frame on the 302-dimensional leaf (`frame.txt`, untrusted);
* writes the start sets with `ap_proof leafbox`;
* finds the events of the floating-point shift interval: cell 11 crosses -40 mV downward at 32.676 ms, then the
  terminal section (cell 1 rising) at 33.820 ms;
* writes `plan.txt`. Without splits it has 3 segments: S0 to the internal switch, a short segment, then the
  terminal section.

With `--parallel-boxes R`, every segment after a cut starts from a box of relative radius R around the
floating-point orbit. Those segments can run at the same time. `chain` then checks that each box contains the
previous segment's end set, and fails if one does not.

### 3.4 Run

```
nohup python3 driver.py run --run-dir RUN --jobs 8 --kinds c1,mp0 --call-timeout 21600 --nice 10 > RUN/driver.out 2>&1 &
python3 driver.py status --run-dir RUN
```

* Each `ap_proof segment` call runs at most `--call-timeout` seconds. When one is stopped, the driver relaunches
  it and it resumes from `RUN/seg<i>_<kind>.ckpt`. The checkpoint is written every `checkpoint_every` steps
  (default 200). It holds the exact binary state of the CAPD set, so a restart loses at most 200 steps.
* After a machine restart, run the same `driver.py run` command again. Completed segments (`seg<i>_<kind>.json`
  with `"ok": true`) are skipped, and the others resume.
* `--kinds c1,mp0` runs the C1 box enclosure first, then the multiprecision centre. The centre is sequential;
  it can run at the same time as the C1 segments in a second driver with `--kinds mp0`, if there is enough RAM.

### 3.5 Compose, verify, record

```
python3 driver.py chain  --run-dir RUN      # chain_c1.out (DP over the box), chain_mp0.out (centre image minus reference)
python3 driver.py verify --run-dir RUN      # verify.json (+ verify.json.diag.txt for radius tuning)
python3 driver.py record --run-dir RUN      # record.json: hashes of every trusted source, binary, inputs; all segment records
```

If `verify` reports q < 1 but the invariance test fails, the radii need tuning. Run
`python3 frame_leaf.py ... --diag RUN/verify.json.diag.txt --out RUN/frame2.txt`. That re-solves for the radii
from the measured block norms and residual. Then rerun `leafbox` and the C1 segments, since the box changed.
The centre does not depend on the radii.

## 4. The dry run (done here)

DRYRUN_SECTION

## 5. Cost (measured per-step costs, extrapolated totals)

COST_SECTION

## 6. How to check the outputs (reviewer)

1. `record.json`: the hashes of `ring19.hpp`, `engine.hpp`, `ap_proof.cpp`, `model/setup.hpp` and the CAPD patch
   match the reviewed commit. `sources_dirty` is false.
2. Every `seg<i>_c1.json` and `seg<i>_mp0.json` has `"ok": true` and no `INVALID` key: no negative-control flag
   was set. The plan has no `negative_control_*` line.
3. `chain` printed `ok` for both kinds. Every box start contains the previous end set; this is checked by
   `chain`, not assumed.
4. `verify.json`:
   * `verified` true, `all_segments_certified` true, `centre_times_inside_box_times` true, `finite` true;
   * `q_upper` < 1;
   * `max_block_residual_plus_row_sum_upper` < 1;
   * `floquet_bound_full_rotation_upper` = q^16;
   * the rotation period interval is 16 times the section-map time.
5. Read the trusted code paths that a reviewer must accept (section 7). The tests in section 3.2 are evidence,
   not proof.

## 7. What a reviewer must check in the code

* `ring19.hpp`: the cell equations equal `pilot/tp06_19d_capd.hpp`, which was checked against TP06_endo.m. The
  mixing `s * A + (1 - s) * B` with exact 0/1 parameters equals the selected formula, provided both branches are
  finite on the enclosure (they are at physiological V; a non-finite value would stop the run). The quotient branch
  in window mode is evaluated at zeta + 5.
* The window polynomial coefficients enclose B_n/n!, and the tail bounds T0, T1, T2 are proved
  (|B_2k|/(2k)! = 2 zeta(2k) (2 pi)^-2k <= (pi^2/3)(2 pi)^-2k; geometric sums). Both are checked by
  `check_ghk.py`.
* `engine.hpp`, `Gronwall::bound`: the perturbation inequalities in the file header (C0 and C1), the log-norm
  and Hessian row sums. CAPD's Hessian stores half the pure second derivatives, which the code accounts for.
  The bounds are evaluated on W' = W + dstar, and the code checks delta <= dstar.
* `engine.hpp`, `certify`: on every step the enclosure determines the branch side, and the designated crossings
  are monotone. This is also the period gate: no cell other than cell 1 crosses -40 mV upward during the shift
  interval, so the minimal period is 16 tau.
* The section ends: CAPD PoincareMap (patched). The validation re-run covers [t_pre, T_right] with all cells in
  quotient mode. The image lies on the section, and the crossing there is transversal.
* `ap_proof.cpp`:
  * `leafbox`: the K_0 remainder;
  * `verify`: the leaf chain rule DG = At^{-1} pi sigma^{-1} DP Diota At; the centre G(0) from the multiprecision
    difference; the block-norm contraction, as in verify.cpp.

## 8. Known limitations and risks

RISKS_SECTION
