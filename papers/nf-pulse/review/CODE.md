# Code review of the nf-pulse certificate chain (adversarial, 2026-09-26)

Scope: `papers/nf-pulse/code/` (nfcore.py, lohner.py, certify_rest.py, manifold.py, block.py, block_check_iv.py,
prove_pulse.py, run_all.sh) and how `run_all.sh` turns their output into its 15 OK/FAIL lines. Method: a line-by-line
reading, then 39 single-edit mutations each run through the whole `run_all.sh` in a scratch copy, then a separate,
more sensitive containment test of the integrator run on the integrator mutations. Nothing outside
`papers/nf-pulse/review/` was modified; every run was made in a copy under the session scratchpad.

Scripts and raw results (all in `review/code/`):

| File | What |
|---|---|
| `mutate.py` | The mutation driver: copy, one textual edit (asserted to match exactly once), run `run_all.sh`, record failing checks |
| `results.md`, `results.json` | The mutation table and the full stdout of every run |
| `lohner_sensitivity.py`, `run_sensitivity.sh`, `sensitivity_results.txt` | Coarse-setting containment test of `lohner.py` against mpmath, run on the integrator mutations |
| `env_mutation.sh` | The environment mutation of finding F4 (unmodified code, `NF_DU=0.15 PYTHONOPTIMIZE=1`) |

The only edit made to every copy, the baseline included, is in `run_all.sh`: the three proof runs are made sequential
(`& done; wait` becomes `; done`) to keep CPU use low. That changes scheduling only. The baseline copy passes all 15
checks in 12 s.

## Summary

The mathematics that the code implements is, as far as I can read it, implemented correctly: I found no soundness bug
in the integrator, the block, the manifold or the rest-state code at the settings used. The problems are in the
harness, which is weaker than the README says:

- **Must-fix:** one of the 15 checks, the independent mpmath re-check of the block, can never fail (F1).
- **Should-fix:** the Jacobian test has no pass threshold (F2). No check in `run_all.sh` can detect an unsound
  integrator (F3): 13 of the 16 integrator mutations pass all 15 checks, including dropping the Lagrange remainder,
  skipping the Picard test and using B^T for B^-1. Soundness-critical conditions are enforced with `assert` and the
  proof reads `NF_*` environment variables that `run_all.sh` does not clear; together they let all 15 checks pass
  with a block that fails both of its conditions (F4, reproduced).
- Several individual conditions can be deleted without any check noticing, because each negative control fails
  for more than one reason (F6).

Parameters are consistent across files: every proof file takes c1 and c2 from `certify_rest.py` as exact rationals
(`fmpq(...,10**25)`), beta, theta, eps and gamma are exact `fmpq` in `nfcore.py`, and `block_check_iv.py` hard-codes
the same decimal strings and exact 1/4, 1/10. The proof is sensitive enough to notice parameter drift: a change of
1e-20 in theta, eps or beta, or eps = double(0.1) (off by 5.55e-18), makes the P checks fail (M25 to M27, M29).

## A. lohner.py, line by line

Line numbers are those of `code/lohner.py`.

| Item asked | Verdict | Where and why |
|---|---|---|
| Picard a priori enclosure: field over the whole candidate box and over [0,h] | Correct | 209-211: `F = vf(W)` evaluates the field in ball arithmetic on the full candidate W, kappa component included (W[5]); `cand = Xh + ball(0,h) * F` is the enclosure of x0 + t F(W) for all x0 in the hull and all t in [0,h]; acceptance needs `cand` strictly inside W in the 5 state components (118, comparisons of exact arb bounds) and `W[5].contains(cand[5])` for kappa (F[5] = 0). That is the standard sufficient condition. |
| Inflation | Correct, and irrelevant to soundness | 205-207 and 216-219: inflation only chooses the candidate; the test decides. |
| Lagrange remainder over the a priori enclosure | Correct | 231-232: coefficient p+1 is `taylor_vals(W, order+1)[i][order+1]`, i.e. evaluated over W, times h^(p+1). Componentwise Lagrange form with x(xi_i) in W for each component is valid. |
| Mean-value map with d/dkappa, over the right set | Correct | 237: `taylor_jet(Xh, order)` evaluates the Jacobian of the Taylor polynomial over the hull of the whole set (which contains the segment from xbar to every x0, kappa included). The kappa column is carried by forward-mode AD (79: `gd[5] += w`; 87: `gvv[5] += eps (U_k - gam V_k)`), the kappa row is e_6 (kappa' = 0). Checked by `test_jacobian.py` (2.7e-48 against central differences) and by my sensitivity test case (b). |
| xbar + C r0 + B r with QR: B^-1 rigorous or B^T | Correct | 255-256: `B2 = qr_orth(P)` returns an exactly stored, approximately orthogonal matrix and `B2inv = B2.inv()` is an arb_mat enclosure of the exact inverse; B^T is not used. R2 at 258-261 is B2^-1 (y - xbar2 + (JC - C2) R0) + (B2^-1 J B) R, which contains every B2^-1(...) needed. The column sort (248-253) uses floats but only chooses an order. |
| Between-steps path check | Correct where needed | `prove_pulse.py:78-96` and 146-152: in phase 2 every step's range is enclosed for all t in [0,h] by the Taylor polynomial on the start hull evaluated on the interval [0,h] plus `x_{p+1}(W) [0, h^{p+1}]`, and must lie in int B before the end point is tested for the cone. Phase 1 needs no path check (only the end point at xi = 53 matters). Cone entry is tested at grid points, which suffices (one time in K is all the argument needs). |
| Time stepping | Correct | Step lengths are dyadic floats, so t is exact; `integrate` 287: the last step `float((Tend - t).mid())` could round, but `prove_pulse.py:174` asserts the end time (see F4 on asserts). |

A caveat on what this means: at the production settings (order 30, tol 1e-45, 256 bits) the remainder, the Picard
box and the wrapping terms are 20 or more orders of magnitude below the widths that decide the proof (interval run at
xi = 53: y1 radius 4.0e-4, driven by the 1e-25 speed interval through the initial box). So the verdicts do not depend
on those terms being right, which is reassuring for the theorem and bad for the test suite (F3).

## B. Findings

### F1 (must-fix) The independent block re-check can never fail. `run_all.sh:28`

The pattern `'^dU 0.05 cone PD'` matches the start of the line `block_check_iv.py:77` prints in both outcomes:
`dU 0.05 cone PD (interval Cholesky), entrance upper bounds: [...] -> CERTIFIED` or `... -> FAILED`.
Reproduced by M34 (`ok &= pd and ent < -1`): the log ends `-> FAILED` for both dU and run_all prints
`OK    B: independent re-check of the block conditions in mpmath.iv`. Fix: grep `'^dU 0.05 .*-> CERTIFIED$'`, or better,
have the script print a dedicated `VERIFIED`/`REFUSED` token and exit non-zero on failure.

### F2 (should-fix) The Jacobian test has no threshold. `run_all.sh:31`, `test_jacobian.py:37`

The pattern `'max |J_AD - J_FD|'` only checks that the line was printed. With the d/dkappa term of U' removed (M04) the
log reads `max |J_AD - J_FD| over 36 entries: 4.70e-02` and the check prints OK; with a wrong dQ row (M37) it reads
`5.01e-02`, OK again. The label says "a test, not part of the proof", but it is the only check on the kappa column,
and M04 shows the proof itself does not notice a missing kappa derivative (all 15 OK). Fix: print PASS/FAIL against a
bound (for example 1e-40) and grep for it.

### F3 (should-fix) No check in run_all.sh can detect an unsound integrator. `run_all.sh` as a whole

Of the integrator mutations, all of these pass the 15 checks unchanged (table below): M01 no Lagrange remainder,
M02a Picard test skipped, M02b Picard test with F on the initial box instead of W, M02c a priori enclosure replaced by
a point, M03a B^-1 replaced by B^T, M04/M05 d/dkappa terms dropped, M06 Jacobian at xbar instead of over the hull,
M07 remainder coefficient at xbar instead of over W, M08 the (JC - mid JC) R0 term dropped, M09 the interior test
always true. The reading above says the real code does none of these things, so this is not a soundness bug, but the
package has no automated evidence of it: `test_lohner2.py neg`, the one existing negative control for the integrator,
is not in `run_all.sh`.

I wrote `review/code/lohner_sensitivity.py`: order 8 and tol 1e-12 so that the remainder matters, plus a kappa ball of
radius 1e-7 and a box of radius 1e-7 in U and Q, all checked for containment of mpmath solutions of the original 4D
system (no Y, no shared code) at xi = 2, ..., 12. It passes on the real code (51 s) and catches M01, M02c, M04, M05 and
M07. It still misses M02a, M02b, M03a, M06, M08, M09, because a containment test cannot see an unsound step whose
result happens to be right: the 20 per cent inflation makes the unchecked candidate a true enclosure anyway, the Gram-
Schmidt Q is orthogonal to about 1e-77 so B^T is numerically B^-1, and so on. For those the only defence is reading or
an independent re-verification of each step's certificate (for example, recompute Xh + [0,h] F(W) inside W with separate
code, and store the certificates). Recommendation: add the sensitivity test (or `test_lohner2.py neg` with a verdict
line) to `run_all.sh`, and state in the README that the integrator's soundness rests on reading, not on the checks.

### F4 (should-fix, reproduced) Asserts and environment overrides can turn an uncertified block into 15 OKs

`prove_pulse.py:43` (`assert ok, info` on the block certificate) and `prove_pulse.py:121` (`assert ok, minfo` on the
manifold) are the only places where the proof run refuses a failed block or manifold; `manifold.py:91` and
`block.py:84` guard preconditions the same way. Python removes `assert` under `-O` or `PYTHONOPTIMIZE`. The proof
also reads `NF_DU`, `NF_R_OVER_RHO`, `NF_ORDER`, `NF_TOL`, `NF_PREC` (`prove_pulse.py:32-36, 129-130`) and
`certify_rest.py:44` reads `NF_PULSE`; `run_all.sh` clears none of them, while the B checks always certify
|U| <= 0.05 of the fast pulse.

`review/code/env_mutation.sh` runs the unmodified code with `NF_DU=0.15 PYTHONOPTIMIZE=1`: all 15 checks print OK,
and `final_interval.log` records `'cone_pd': False, 'entrance_ok': False` for the block the P checks used. Fix: replace
the load-bearing asserts by `if not ok: print('VERDICT FAIL ...'); sys.exit(1)`, make `run_all.sh` `unset` every
`NF_*` variable (or pass them explicitly), and have prove_pulse print the block parameters it used so run_all can
compare them. Related, not tested: `block_data` never checks r > rho, which the block lemma needs; `NF_R_OVER_RHO=0.5`
would build such a block (unconfirmed whether a run would then pass).

### F5 (should-fix) The U-range of the block actually used is not independently re-checked

`prove_pulse.py:45` chooses rho so that `bl.u_range(Tinv, r, rho) < DU`, which is what ties the block to the s-range on
which (C) and (E) were certified. Nothing re-checks it: M14 (loop condition `< 3 * DU`, U-range 0.143 against a
certificate for 0.05) passes all 15 checks, because the orbit happens to be well inside. The real line is correct.
Fix: have `block_check_iv.py` also bound |Tinv[0,0]| r + ||Tinv[0,1:]|| rho < 0.05 in mpmath.iv for the r and rho
written by prove_pulse into `proof_*_final.json`.

### F6 (nit) Negative controls do not isolate the conditions they protect

Each of these deletions or weakenings passes all 15 checks: (C) not enforced (M10), (E) not enforced (M12), (E)
without the ||A21|| term (M13), s < 1 not enforced (M36), cone test on the most favourable point of the enclosure
(M17), phase-2 path check removed (M18) or without its remainder (M19), interior test with rho doubled (M20). The
code is correct in each place; the harness simply cannot tell. The block negative control (U to 0.15) fails both (C)
and (E), so removing either one alone is invisible; the theta = 0 control fails at s < 1 and again at the root count.
Suggested controls: a block that fails (E) but not (C) and one that fails (C) but not (E); a run whose end state is in
B but whose path leaves it (small r); a cone test on an enclosure that straddles the cone boundary.

### F7 (nit) `block_check_iv.py:74` adds the two upper bounds in round-to-nearest

`g` and `fro` are upper endpoints (mpf), and `ent = g + fro` is computed in mpmath's default `mp` context (53 bits,
round to nearest), not in `iv`. With margins of -0.048 and -0.060 the error of about 1e-17 is harmless, but it is not
rigorous as written; use `iv.mpf(g) + iv.mpf(fro)` and take `.b`.

### F8 (nit) `block_check_iv.py:23` reads a committed file that may be stale

It loads `../data/block_certificate.json`, which block.py rewrites; if block.py crashes before `json.dump`, or runs
with `NF_PULSE=slow` (it then writes `block_certificate_slow.json`), the re-check silently uses the committed T. Its
c1, c2 are hard-coded to the fast pulse.

### F9 (nit) Stale summary and certificates

`README.md:91` says the summary is in `data/run_all.txt`, but `run_all.sh` only prints to stdout; `data/run_all.txt`
is a committed copy that no script regenerates. `prove_pulse.py` writes `proof_*.json` only when it reaches a
verdict, so after a crash the committed PASS certificate remains. Logs themselves are safe: each is truncated by `>`
before its check reads it, `wait` precedes the P checks, and a traceback contains none of the grep patterns (a
crashed negative control prints no `VERDICT FAIL` and is reported as FAIL, which is the conservative outcome). The
script does not look at exit codes; that is acceptable only while every pattern is a positive verdict token (F1, F2).

### F10 (nit) `certify_rest.py:172` negative control 2 does not test what it says

`lam_bad = 0.96876116440277013807 + 1e-15`, described as a perturbed eigenvalue, but the certified eigenvalue at c1 is
0.96876116057932178705...; the base value is already 3.8e-9 away, so the control tests a 3.8e-9 perturbation. It is
printed but not checked by run_all.

### F11 (nit) block.py's own r and rho are not the proof's

`block.py:122-131` sizes the block with r = 1.25 rho and writes that rho and r to `block_certificate.json`; the proof
uses r = 4 rho with its own rho (`prove_pulse.py:36-51`). (C) and (E) do not depend on r/rho, so the B check is still
the right one, but the certificate file describes a different block from the one used.

### F12 (nit, harmless by magnitude) Manifold tail

M30 (tail bound dropped in `manifold.py:158`) passes: r_i <= 1.5e-27 and (1/4)^81 is 2e-49, so the tail is below
3e-76, at the level of the thin runs' initial radii. The code includes it correctly; no check could see its absence.

### Checked and found correct (no finding)

- Parameters exact (`nfcore.py:46-49`), converted to balls at the current precision on each use; c1, c2 exact
  (`certify_rest.py:46-47`); `DU = arb('0.05')`, `arb('0.95')`, `arb('0.2')` are decimal strings, never floats; the
  only float-to-arb conversions (`block.py:46` for T, `lohner.py` step lengths) are of dyadic floats and exact.
- No float decides a rigorous inequality. Floats appear only in step-size choice, column ordering, the "escaped
  |x| > 5" early stop (which can only produce FAIL) and logging.
- Directions of the inequalities: interior tests strict (`lohner.py:118`, `prove_pulse.py:68-75`), cone test on the
  lower bound of +-y1 against the upper bound of |y'| (`prove_pulse.py:72-75`), (E) needs `e < 0`, (C) needs every
  leading minor > 0 (`block.py:70-76`; for an interval matrix this bounds the minors of every symmetric member),
  manifold `lhs < rho` (`manifold.py:138`), rest `s < 1` and the root signs.
- (C), (E) at s in {smin, smax} suffice: H is affine in s and positive definiteness is convex; lam_max(sym A22) and
  ||A21|| are convex in s. S' is increasing on (-inf, 1/4), asserted at `block.py:84`.
- Manifold tail: Z(r) matches the expansion of (1 - 2Y0) yY w - yY^2 w; the bound K_i for mu >= 2 follows from
  p(mu) >= (mu^2 - 1) mu^2 >= (3/4) mu^4; the induction on truncations needs no contraction and is stated correctly.
- `refine` returns an enclosure only if the end signs are certified opposite; Descartes for exactly one positive root
  holds for every kappa > 0 once s < 1.

## C. Mutation table

run_all exit 0 with "none" means all 15 checks printed OK. The last column says whether a passing mutation is a real
gap in the harness (the code is right, but a wrong version would not be caught) or harmless.

| # | Mutation | Checks that fail | Assessment |
|---|---|---|---|
| M01 | lohner: drop Lagrange remainder | none | Gap (F3); sensitivity test catches it |
| M02a | lohner: accept a priori box without Picard test | none | Gap (F3); sensitivity test misses it |
| M02b | lohner: Picard test with F on the initial box, not W | none | Gap (F3); sensitivity test misses it |
| M02c | lohner: a priori box replaced by a point, no test | none | Gap (F3); sensitivity test catches it |
| M03a | lohner: B^-1 replaced by B^T | none | Gap (F3); invisible because Q is orthogonal to 1e-77 |
| M03b | lohner: no QR (B = mid JB, rigorous inverse) | P x3, N same-bracket | Sound but too wide (wrapping); fails as expected |
| M03c | lohner: no QR and B^T | P x3, N x2 | Caught |
| M03d | lohner: B^-1 replaced by identity | P x3, N x2 | Caught |
| M04 | lohner: drop d/dkappa of U' | none (J prints 4.7e-2, still OK) | Gap (F2, F3); sensitivity test catches it |
| M05 | lohner: drop d/dkappa of V' | none | Gap (F3); sensitivity test catches it |
| M06 | lohner: Jacobian at xbar, not over the hull | none | Gap (F3); sensitivity test misses it |
| M07 | lohner: remainder coefficient at xbar, not over W | none | Gap (F3); sensitivity test catches it |
| M08 | lohner: drop (JC - mid JC) R0 | none | Gap (F3); sensitivity test misses it |
| M09 | lohner: interior test always true | none | Gap (F3); sensitivity test misses it |
| M10 | block: (C) not enforced | none | Gap (F6) |
| M11 | block: (C), (E) at s = smin only | B negative control | Caught |
| M12 | block: (E) not enforced | none | Gap (F6) |
| M13 | block: (E) without the ||A21|| term | none | Gap (F6) |
| M14 | prove_pulse: block U-range up to 3 x DU | none | Gap (F5) |
| M15 | prove_pulse: DU = 0.15 | P x3, N x2 (assert) | Caught, but see F4 under -O |
| M16 | cone sides swapped (K+ for c1, K- for c2) | P c1, P c2 | Caught |
| M17 | prove_pulse: cone test on the favourable end | none | Gap (F6) |
| M18 | prove_pulse: phase-2 path check removed | none | Gap (F6) |
| M19 | prove_pulse: path check without remainder | none | Gap (F6) |
| M20 | prove_pulse: interior test with 2 rho | none | Gap (F6) |
| M21 | prove_pulse: interior test with 0.8 rho | P x3 | Stricter test fails: |y'| = 0.00609 against rho = 0.00727 leaves a 16 per cent margin |
| M22 | c2 = c1 + 1e-26 (below c*) | P c2 | Caught |
| M23 | c2 = c1 + 3e-26 (just below numerical c*) | P c2 | Caught |
| M24 | c1 = c1 + 4e-26 (just above c*) | P c1 | Caught |
| M25 | theta + 1e-20 | P x3 | Caught |
| M26 | eps + 1e-20 | P x3 | Caught |
| M27 | beta + 1e-20 | P x3 | Caught |
| M28 | c1 + 1e-20 (c1 > c2) | P interval, P c1 | Caught |
| M29 | eps = double(0.1) | P x3 | Caught |
| M30 | manifold: tail dropped at evaluation | none | Harmless by magnitude (F12) |
| M31 | manifold: tail inequality not enforced | M negative control | Caught |
| M32 | eigenvector perturbed by 1e-3 | R, P x3 | Caught |
| M33 | manifold evaluated at t = 3/2 | P x3, N same-bracket | Caught |
| M34 | block_check_iv made to FAIL | none | **Harness bug (F1)** |
| M36 | rest: s < 1 not enforced | none | Gap (F6) |
| M37 | lohner: dQ row of the Jacobian doubled | P x3 (J still OK at 5.0e-2) | Caught by the proof, not by J (F2) |
| M38 | Taylor recursion inconsistent with vfield | P x3 | Caught |
| ENV | unmodified code, `NF_DU=0.15 PYTHONOPTIMIZE=1` | none | **Soundness gap in the harness (F4)** |

Sensitivity test (`review/code/sensitivity_results.txt`; cases (a) remainder, (b) kappa ball, (c) state box):

| Copy | Result |
|---|---|
| baseline | PASS [True, True, True] |
| M01 | FAIL [False, False, True] |
| M02a | PASS |
| M02b | PASS |
| M02c | FAIL [False, False, True] |
| M03a | PASS |
| M04 | FAIL [True, False, True] |
| M05 | FAIL [True, False, True] |
| M06 | PASS |
| M07 | FAIL [False, True, True] |
| M08 | PASS |
| M09 | PASS |

Reproduce: `python3 review/code/mutate.py [name ...]` (about 13 s per mutation), `sh review/code/run_sensitivity.sh`
(about 50 s per copy, after mutate.py has made the copies), `sh review/code/env_mutation.sh`.
