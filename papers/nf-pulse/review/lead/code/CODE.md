# Code review of the nf-pulse certificate chain

Date: 2026-09-26. Scope: `papers/nf-pulse/code/*.py`, `code/run_all.sh`, `data/*.json`, and the README claims
about the code. The mathematics (block lemma, Wazewski argument, manifold tail lemma) is reviewed elsewhere;
this file asks only whether the programs could print PASS for a false statement.

Everything below was run in a scratch copy, never in the repository tree. Environment: python-flint 0.9.0,
mpmath 1.3.0, numpy as installed, Python 3.11, 4 shared CPUs. Baseline `sh code/run_all.sh`: all 15 checks
OK in 8 s wall time.

Files in this folder:

- `mutate.py`: the mutation harness (header says how to run it). One patch per copy, then `run_all.sh`.
- `lohner_stress.py`: a low-order test of the integrator against independent mpmath solutions, used by
  `mutate.py --stress`. Not part of the chain under review.
- `mutation_results.txt`: the raw tables produced by both modes.

## Summary

No soundness hole was found in the code as committed and run as `sh code/run_all.sh`. The rigorous parts that
were audited line by line (a priori enclosure, Lagrange remainder, mean-value map with the kappa column, Lohner
update with QR, path check, block conditions, manifold tail, cone and interior tests) are correct as far as
this review could determine, and the few float values in the programs decide only heuristics (step size,
column order, early exit) and never a rigorous inequality.

The weaknesses are in what the test suite can detect and in two ways of getting a false PASS without editing
any code:

1. **must-fix (confirmed).** With `PYTHONOPTIMIZE=1` in the environment, the block certificate and the
   manifold validation inside `prove_pulse.py` are skipped, because they are `assert` statements. With
   `NF_DU=0.15` added, the block conditions fail (the log prints `'cone_pd': False, 'entrance_ok': False`)
   and all 15 checks still print OK, with `VERDICT PASS` on all three proof runs (mutation m18, no code
   change).
2. **should-fix (confirmed).** `NF_R_OVER_RHO` is read from the environment and `r > rho`, which `block.py`
   states as a hypothesis of the block, is never checked. `NF_R_OVER_RHO=0.5` gives a "block" with r < rho
   and all 15 checks OK (m19, no code change).
3. **should-fix (confirmed).** Two checks in `run_all.sh` grep for text that is printed in both the pass
   and the fail case (the mpmath.iv re-check and the Jacobian test), so they cannot fail except by a crash.
4. **should-fix (confirmed).** 21 of the 32 code mutations that break soundness or the claim pass all 15
   checks (and so do both environment-only mutations). At production settings (order 30, tol 1e-45) no
   output of the chain depends on the remainder, the a priori set, the inverse of the QR factor, the kappa
   column, the manifold tail, the path check, or the cone and entrance conditions. The existing integrator tests
   (`test_lohner.py`, `test_lohner2.py`) are not run by `run_all.sh`, take about 95 s each, and set no exit
   status (`test_lohner.py` ends with `ALL CONTAIN: True/False`; `test_lohner2.py` prints only per-time lines).

## Mutation results

`should` is the outcome a sound suite must give: `fail` (the mutation breaks soundness or the claim),
`either` (sound, only a weaker enclosure), `pass` (the proof must survive). NOT CAUGHT means should = fail and
all 15 checks printed OK. Check labels: R, R-neg (rest), M-c1, M-c2, M-int, M-neg (manifold), B, B-neg, B-iv
(block), J (Jacobian test), P-int, P-c1, P-c2 (proof), N-same, N-far (negative controls).

| id | mutation | should | run_all.sh result | failing checks |
|---|---|---|---|---|
| m00 | none (baseline) | pass | all 15 OK | - |
| m01 | `lohner.step`: Lagrange remainder set to 0 | fail | NOT CAUGHT | - |
| m01b | remainder coefficient on [X] instead of the a priori set W | fail | NOT CAUGHT | - |
| m01c | remainder of the between-steps path bound dropped (`prove_pulse.step_range_y`) | fail | NOT CAUGHT | - |
| m02 | a priori set accepted without the Picard test | fail | NOT CAUGHT | - |
| m02b | Picard containment compares lower ends only | fail | NOT CAUGHT | - |
| m03a | B' = identity, rigorous inverse kept | either | all 15 OK | - |
| m03b | B'^{-1} replaced by B'^T (float Q assumed orthogonal) | fail | NOT CAUGHT | - |
| m03c | B' = mid(J B), not orthogonalised, rigorous inverse | either | fails (StepFailure) | P-int P-c1 P-c2 N-same |
| m03d | B'^{-1} replaced by the midpoint of its enclosure | fail | NOT CAUGHT | - |
| m03e | B'^{-1} replaced by 1.001 B'^T (not the inverse) | fail | NOT CAUGHT | - |
| m04 | cone test (C): leading minors > -1 | fail | NOT CAUGHT | - |
| m04b | cone test (C) result ignored | fail | NOT CAUGHT | - |
| m05 | entrance test (E): margin < 1 instead of < 0 | fail | NOT CAUGHT | - |
| m05b | entrance test (E): norm of At_21 dropped | fail | NOT CAUGHT | - |
| m06 | `in_K`: K+ and K- swapped | fail | caught | P-c1 P-c2 N-same |
| m06b | expected sides of c1, c2 swapped | fail | caught | P-c1 P-c2 |
| m06c | `in_K`: \|y1\| > \|y'\| for either sign | fail | caught | N-same |
| m07 | c2 = c1 - 1e-25 (both ends below c*) | fail | caught | P-c2 |
| m07b | c1 = c2 (both ends above c*) | fail | caught | P-c1 |
| m08 | eps = 1/10 + 1e-20 | fail | caught | P-int P-c1 P-c2 |
| m08b | theta = 1/4 + 1e-20 | fail | caught | P-int P-c1 P-c2 |
| m08c | beta = 20 + 1e-20 | fail | caught | P-int P-c1 P-c2 |
| m08d | eps = 1/10 + 1e-30 | pass | all 15 OK | - |
| m09 | initial Lohner set carries only mid(kappa) | fail | NOT CAUGHT | - |
| m10 | d/dkappa terms of the Jacobian dropped | fail | NOT CAUGHT (J prints 4.7e-2, still OK) | - |
| m11 | manifold tail bound dropped in `evaluate` | fail | NOT CAUGHT | - |
| m11b | manifold tail inequality not checked | fail | caught | M-neg |
| m11c | manifold `zbound` divided by 10^6 | fail | NOT CAUGHT | - |
| m12 | integrate only to xi = 30 | either | fails (not in B) | P-int P-c1 P-c2 |
| m13 | phase-2 path check removed | fail | NOT CAUGHT | - |
| m14 | `in_int_B` accepts \|y'\| < 2 rho | fail | NOT CAUGHT | - |
| m14b | rho not shrunk to keep the U-range of B in \|U\| <= DU | fail | NOT CAUGHT | - |
| m15 | `block_check_iv` forced to print FAILED | fail | NOT CAUGHT | - |
| m16 | wrong Jacobian (factor 3 for 2 in d(Y^2)) | fail | caught by accident | P-int (StepFailure); J prints 1.5e-1, still OK |
| m17a | DU = 0.15 in `prove_pulse.py` | fail | caught (AssertionError) | P-int P-c1 P-c2 N-same N-far |
| m17b | as m17a, with PYTHONOPTIMIZE=1 | fail | NOT CAUGHT | - |
| m18 | no code change; env NF_DU=0.15 PYTHONOPTIMIZE=1 | fail | NOT CAUGHT | - |
| m19 | no code change; env NF_R_OVER_RHO=0.5 | fail | NOT CAUGHT | - |

Reading of the parameter mutations (task C8): a perturbation of 1e-20 in eps, theta or beta moves the pulse
speed by far more than the bracket width 1e-25, so the correct outcome is that the proof FAILS, and it does
(P-int, P-c1, P-c2 all fail; the orbits leave the neighbourhood of rest before xi = 53). A perturbation of
1e-30 in eps moves c* by much less than the distances of c1 and c2 from c* quoted in `certify_rest.py:46-47`
(3.6e-26 and 6.4e-26), and the proof passes, as it should. So the margins in the speed are real and the chain
does notice a parameter change that matters.

### Integrator mutations against a low-order stress test

`lohner_stress.py` runs the unchanged `lohner.integrate` at (A) order 8, tol 1e-10, from a point initial
condition at c1, and (B) order 12, tol 1e-16, from the same point with kappa a ball over
c in [c1 - 1e-6, c1 + 1e-6], and requires the enclosures at xi = 2, 4, 6, 8 to contain mpmath solutions of the
original 4D system (no Y embedding, no shared code), in (B) at both ends and the middle of the speed interval.
It passes on the unchanged code (20 s).

| id | mutation | should | stress result |
|---|---|---|---|
| m00 | none | pass | STRESS PASS |
| m01 | remainder set to 0 | fail | STRESS FAIL (A, xi = 2) |
| m01b | remainder on [X] instead of W | fail | STRESS FAIL (A, xi = 2) |
| m02 | a priori set accepted without the Picard test | fail | NOT CAUGHT |
| m02b | Picard containment compares lower ends only | fail | NOT CAUGHT |
| m03a | B' = identity | either | STRESS PASS |
| m03b | B'^{-1} replaced by B'^T | fail | NOT CAUGHT |
| m03c | B' = mid(J B), rigorous inverse | either | StepFailure (sound) |
| m03d | B'^{-1} replaced by its midpoint | fail | NOT CAUGHT |
| m03e | B'^{-1} replaced by 1.001 B'^T | fail | NOT CAUGHT |
| m10 | d/dkappa terms dropped | fail | STRESS FAIL (B, xi = 2, c = c1 - 1e-6) |
| m16 | wrong Jacobian | fail | STRESS FAIL (B, xi = 2, c = c1 - 1e-6) |

So a low-order test against an independent solver catches the remainder and Jacobian mutations, including the
kappa column, but not the a priori mutations or the QR inverse mutations. Those are unsound in principle and
harmless in these runs: the unvalidated candidate W is in fact an enclosure (it is the Taylor polynomial on
[0, h] inflated by 20 per cent), and the orthogonality error of the stored Q is at the level of the working
precision. No test that compares outputs can see them; only a unit test of the component can (F4).

## Findings

Severity: must-fix, should-fix, nit. Status: confirmed (reproduced or verified by reading and a test),
refuted (the suspected problem is not there), unconfirmed.

### F1. Asserts are the rigorous gates of the proof driver; `python -O` removes them. must-fix, confirmed.

`prove_pulse.py:43` (`assert ok, info` after `bl.check`, the block conditions C and E for the DU in use) and
`prove_pulse.py:121` (`assert ok, minfo` after `mf.validate`, the manifold tail) are the only places where the
proof runs check the block and the manifold they actually use. `manifold.py:91` (`assert mu0 >= 2`, a
hypothesis of the tail bound) and `block.py:84` (`assert arb(UI[1]) < th`, the monotonicity of S' used to
reduce s to its end values) are hypotheses of lemmas. Under `PYTHONOPTIMIZE=1` or `python3 -O` all four are
removed. Reproduced with no code change (m18): `PYTHONOPTIMIZE=1 NF_DU=0.15 sh code/run_all.sh` prints all
15 checks OK and `VERDICT PASS` three times, while `final_c1.log` itself records
`'cone_pd': False, ... 'entrance_ok': False`. The separate B check does not help, because `block.py` certifies
DU = 0.05 whatever `NF_DU` says. Fix: replace these asserts by explicit `if not ok: print(... 'VERDICT FAIL');
sys.exit(1)`, and have `prove_pulse.py` print the block and manifold verdicts it relies on.

### F2. Environment variables change the proof without any check tying them to the certificates. should-fix, confirmed.

`prove_pulse.py:32, 35, 36, 129, 130` read `NF_PREC`, `NF_DU`, `NF_R_OVER_RHO`, `NF_ORDER`, `NF_TOL`;
`certify_rest.py:44` reads `NF_PULSE`. `run_all.sh` does not clear them, and the logs do not record NF_ORDER,
NF_TOL or NF_R_OVER_RHO. The block docstring (`block.py:30`) requires r > rho, but no code checks it:
`NF_R_OVER_RHO=0.5` (m19) gives rho = 0.0089, r = 0.0045 and all 15 checks OK. Whether a block with r < rho
still supports the argument is for the mathematics review; the code should not let an environment variable
decide it silently. Fix: `run_all.sh` should `unset` these variables (or `env -i`), and `block_data` should
check `r > rho`.

### F3. Two checks in `run_all.sh` cannot fail except by a crash. should-fix, confirmed.

- `run_all.sh:28` greps `'^dU 0.05 cone PD'`, but `block_check_iv.py:77` prints that prefix followed by either
  `CERTIFIED` or `FAILED`. m15 forces `FAILED` and the check prints OK. The script also always exits 0.
- `run_all.sh:31` greps `'max |J_AD - J_FD|'`, the prefix of the line that prints the discrepancy whatever
  its value (`test_jacobian.py:37`). m10 (d/dkappa column dropped) prints 4.69e-02 and m16 prints 1.52e-01;
  both show OK. The check is labelled "a test, not part of the proof", but it is the only test in the chain of
  the kappa column (task A), and it does not test it.

Fix: grep `'^dU 0.05 cone PD.*-> CERTIFIED$'`; make `test_jacobian.py` print `JACOBIAN OK` or `JACOBIAN FAIL`
against a stated threshold (e.g. 1e-40) and grep that.

### F4. The suite cannot detect an unsound integrator, manifold tail, path check or block test. should-fix, confirmed.

21 code mutations that break soundness pass all 15 checks (table above). The reason is not a bug but the
design of the controls: at order 30 and tol 1e-45 the Taylor remainder, the a priori set and the error of the
QR inverse are far below the enclosure radius (dropping the remainder changes the y radii at xi = 53 by less
than 1 per cent), and the true orbit satisfies the block, path and interior conditions with room to spare
(at xi = 53, |y'| <= 0.00609 against rho = 0.00727 and |y1| <= 4e-4 against r = 0.029; the tightest margin
seen is the cone entry of c2, y1 = 0.003425 against |y'| <= 0.003396). Every negative control in the chain is refused by the correct physics, not by
the component being tested: `B-neg` fails on both C and E together, so neither alone is tested (m04, m04b,
m05, m05b); no control has an orbit that leaves B between grid points (m13); no control depends on the tail
of the manifold (m11, m11c) or on the width in kappa (m09, m10). The one existing integrator control
(`test_lohner2.py neg`, remainder dropped at order 8) catches m01, but it is not in `run_all.sh`, it
monkeypatches `taylor_vals` rather than testing a changed code path, and neither test sets an exit status.

Fix, in increasing cost: run `lohner_stress.py` (or an equivalent built on `test_lohner2.py`) with an exit
status from `run_all.sh`; it catches the remainder mutations and a wrong Jacobian, including the kappa column
(see the stress table). Add unit tests for what no output comparison can see: that `B2inv * B2` contains the
identity, and that `rough_enclosure` rejects a candidate that fails an independently recomputed Picard
inclusion. Add block negative controls that violate C alone and E alone. Add a control for the path
check (for example a step range that grazes the boundary of B while both grid points are inside, built from
a small synthetic block). Add a manifold control in which the tail matters (a larger t than 1/4, or a smaller
N, so that dropping the tail changes the verdict).

### F5. A priori enclosure (task A). Sound; one containment test checked for rounding direction. refuted.

`lohner.py:199-220`: W is accepted when `[X] + [0, h] F(W)` is strictly inside W in components 0 to 4 and
kappa's component contains itself (kappa' = 0). That is the Picard-Lindelof test for the 5D field, with
`[0, h]` an exact dyadic ball (`h` is a float, `arb(h)` is exact). The candidate W built from the Taylor
polynomial (`lohner.py:202-207`) is only a guess and is always validated. `hull_contains_interior`
(`lohner.py:115-120`) compares `o.lower() < i.lower()` and `i.upper() < o.upper()`. `arb.lower()` rounds
down and `arb.upper()` rounds up at the working precision; I checked whether rounding the outer lower end
down could accept an inner set that is not contained. It cannot: both lower ends are rounded down at the same
precision, rounding down is monotone, so `floor(a) < floor(b)` implies `a < b` (and likewise for the upper
ends with rounding up). Tested at 256 bits with an exact inner point 2^-280 outside the outer ball: rejected.

### F6. Lagrange remainder (task A). Correct. refuted.

`lohner.py:231-232`: `Rem_i = x_{p+1,i}(W) h^{p+1}` for i = 0..4 and 0 for kappa. That is the Lagrange form
of order p + 1 (the coefficient of the solution through x(xi) with xi in [0, h], and x(xi) in W because W
was validated), per component (each component has its own xi, and the interval evaluation over all of W
covers it), and W contains the whole kappa ball. The same form, with `[0, h^{p+1}]`, is used for the path
bound (`prove_pulse.py:84`), which is right for t in [0, h].

### F7. Mean-value map and the kappa column (task A). Correct; kappa's width is propagated. refuted.

`lohner.py:233-241`: `Phi(xbar)` is evaluated at the exact point `xbar` (with kappa at its midpoint), and the
Jacobian `[J] = sum_k h^k D x_k([X])` is evaluated over the hull, which contains the kappa ball. `taylor_jet`
carries the derivative with respect to kappa in both places where kappa enters (`lohner.py:79` for U' =
kappa w and `lohner.py:87` for V' = eps kappa U); P, Q and Y depend on kappa only through these, and the
chain rule is carried by the recursion. Row 5 of [J] is e_5. The initial set `from_box` (`lohner.py:160-171`)
puts rad(kappa) in C[5, 5], so the kappa width enters `C r0` and is propagated. In the interval run, removing
it (m09) or removing the kappa column (m10) shrinks the y1 radius at xi = 53 from 3.38e-4 to 3.12e-4, so the
kappa width is about 8 per cent of the final enclosure; the rest is the width of the manifold box over the
speed interval. The Taylor recursion in `nfcore.taylor` (Y' = beta Y (1 - Y) U' via Z = Y - Y^2) and the
closed form `manifold.zsolve` were checked: `(mu - A) z` encloses e_Y to 1e-77 at mu = 2.3, 7, 50, and
`zbound` dominates |z_i| there.

### F8. Lohner update with QR (task A). Sound: Q is only a change of coordinates with a rigorous inverse. refuted.

`lohner.py:138-152, 255-261`: `qr_orth` returns an exactly stored matrix (every entry is `arb(mid)`), whatever
its orthogonality error; `B2.inv()` is python-flint's ball-arithmetic inverse of that exact matrix, so it
encloses the true inverse; nothing assumes B2^T = B2^{-1}. The update R' = [B'^{-1}](y - xbar' + ([J] C - C')
R0) + ([B'^{-1}][J] B) R reproduces y + [J] C r0 + [J] B r exactly for every r0, r, so the new set contains
the image. Replacing Q by the identity (m03a) keeps the proof passing, as a sound but coarser variant should.
The float column pivoting (`lohner.py:249-253`) only orders columns.

### F9. Path between steps (task A). Checked where the proof needs it. refuted.

Phase 1 (to xi = 53) needs only the set at xi = 53, and that is what is checked (`prove_pulse.py:175-177`).
Phase 2 (c1 and c2 only) needs the orbit in B for all xi from 53 to the time it is found in the cone, and
`cb` checks, for every step, the enclosure over t in [0, h] of `T (x(t) - x*)` for all initial points in the
previous hull (`prove_pulse.py:78-96, 146-152`), before testing the cone at the grid point. The first phase-2
step starts from `prevhull = X.hull()` at xi = 53 (`prove_pulse.py:196`), so no interval is skipped.
Fragile: the step length is rebuilt as `float((t - tp).mid())` (`prove_pulse.py:148`) instead of being passed
from `integrate`; it is exact here because all step lengths are dyadic with 13 significant bits and t is
exact at 256 bits, but a change to the step-size rule could make it round down and leave the last part of a
step unchecked. nit.

### F10. Floats deciding rigorous inequalities (task B). None found. refuted.

Floats occur in: step size (`lohner.py:265-287`), column order (`lohner.py:249-253`), the escape heuristic
`|mid| > 5` (`prove_pulse.py:136`, which can only produce FAIL), `choose_sigma` (a float estimate turned into
the exact rational 1/7), the eigenvector matrix used to build T (`block.py:54-65`, stored exactly, then
inverted in ball arithmetic), and `assert float(t.mid()) == float(T_enter)` (`prove_pulse.py:174`, which
only fixes where the interval run is evaluated; the argument needs some common time, not exactly 53). The
model parameters are exact rationals (`nfcore.py:46-49`), c1 and c2 are exact rationals turned into balls at
256 bits (`certify_rest.py:46-47`), kappa = 1/c is a ball, and the decimal strings `arb('0.05')`, `arb('4')`,
`arb('0.5')`, `arb('1.2')` enter only as balls or grid points. In `block_check_iv.py` the strings for c1, c2
become outward-rounded intervals (checked: `iv.mpf('1.1027477097341592491478677')` has width 1.6e-61).

### F11. Inequality directions (task B). Correct. refuted.

`in_int_B` (`prove_pulse.py:68-69`): upper bounds of |y1| and of |y'|_2 strictly below r and rho (interior).
`in_K` (`prove_pulse.py:72-75`): lower bound of +-y1 strictly above an upper bound of |y'|_2. Block: all
leading minors strictly positive (`block.py:74`), entrance margin strictly negative (`block.py:104`), U-range
of B strictly inside DU (`prove_pulse.py:45`), S' increasing because the right end of the U-interval is below
theta (`block.py:84`). Rest: `s < 1` and four certified sign changes (`certify_rest.py:132, 146`). Manifold:
`G0 + Z(r) < rho` (`manifold.py:138`). Each is the direction the corresponding lemma needs.

### F12. Stale output and certificates read back (task B). Low risk. nit, confirmed.

Each log is truncated by the redirection in `run_all.sh`, so a crash leaves a traceback, not an old PASS;
`run_all.sh` does not `set -e` but counts failures and exits 1. The only certificate read back as an input
is `data/block_certificate.json`, by `block_check_iv.py:23` (the matrix T). If `block.py` crashed before
writing it, the re-check would run on the committed T; B would then fail anyway. The re-check also hardcodes
its own c1, c2, eps, theta and beta (`block_check_iv.py:44-47`) rather than importing them, and it does not
re-check rho, r or the U-range of B, which the proof uses. The P and N checks match `VERDICT PASS` and
`VERDICT FAIL` on the last line of their own log only; neither string occurs in the other case. The negative
controls pass on any FAIL (an escape counts), which makes them weaker than their labels.

### F13. The M checks do not check the manifold the proof uses. nit, confirmed.

`manifold.py:180` validates with `choose_sigma` (a float heuristic), while `prove_pulse.py:119` hardcodes
sigma = 1/7 and re-validates. They agree today (both 1/7, `data/manifold_validation.json`), so the M
checks are consistent with the proof, but they would silently diverge if either changed. The load-bearing
validation is the one inside `prove_pulse.py`, which is an assert (F1).

### F14. T is built from `numpy.linalg.eig`. nit, confirmed by reading.

`block.py:54-65`. Sound (T is stored exactly and its inverse is enclosed), but T and so rho, r and every y
printed may differ between numpy builds; `data/block_certificate.json` stores T, so a run can be compared.

### F15. README claims about the code. Accurate, with one omission.

- "C^0-Lohner interval Taylor integrator of order 30": accurate (`lohner.py`, default `NF_ORDER` 30; it
  encloses the solution only, not its derivatives).
- "Taylor series of order 80": accurate (`prove_pulse.py:120`, `manifold.py:182`).
- "15 checks including 5 negative controls": accurate (R-neg, M-neg, B-neg, N-same, N-far).
- "under a minute": accurate, 8 s measured.
- "carries the orbits ... to xi = 53": accurate; the c1 and c2 runs continue to 58.375 and 57.75.
- "Tests: ... the integrator's enclosures against an independent mpmath solution" (README table): the tests
  exist and pass on the unchanged code (`test_lohner.py`: all contain, 95 s), but they are not run by
  `run_all.sh`, print no verdict, and are not among the 15 checks. The README should say so (F4).
- "independent re-check of its conditions in mpmath interval arithmetic": the re-check is correct but its
  result is not tested by `run_all.sh` (F3).

## How the findings were verified

- Mutations: `python3 review/lead/code/mutate.py <scratch>` and `python3 review/lead/code/mutate.py --stress <scratch>`;
  raw output in `mutation_results.txt`.
- F5: containment test with an exact point 2^-280 outside a ball of radius 2^-300 at 256 bits.
- F7: kappa contribution from the `y_at_T_radii` of `proof_interval_final.json` in the m00, m09 and m10
  copies; zsolve residual at three values of mu.
- F10: `mpmath.iv` string conversion checked for outward rounding.
- Everything else by reading the code at the lines cited.
