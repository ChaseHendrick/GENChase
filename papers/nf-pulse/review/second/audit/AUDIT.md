# Adversarial code audit of the nf-pulse computer-assisted proof

Date: 2026-09-26. Scope: `papers/nf-pulse/code/` at commit 27aeb7b (lohner.py, prove_pulse.py, block.py,
block_check_iv.py, manifold.py, certify_rest.py, nfcore.py, run_all.sh and the tests). Environment:
python-flint 0.9.0, mpmath 1.3.0, 4 cores; `sh code/run_all.sh` on an unmodified copy passes all 15 checks in
7.3 s. The repository copy was never run or edited; every run below is on a copy under `/tmp/claude-0/nfmut/`.

Files in this folder:

- `mutations.py`: the mutation catalogue (44 mutations, each an exact text substitution that must match exactly
  once, so no mutation can be a silent no-op).
- `mutate.sh`: the driver. `sh mutate.sh [name ...]` copies `papers/nf-pulse` to `/tmp/claude-0/nfmut/<name>/`,
  applies the mutation, runs that copy's `run_all.sh` and prints which checks fail.
- `mutation_results.txt`: the raw output of the full sweep (5 min 44 s for 42 mutations, plus 2 added later).

## Verdict in one paragraph

I found no soundness error in the proof code as written. The integrator, the block conditions, the manifold
tail bound, the parameter handling and the speed-interval handling are each rigorous. The weaknesses are in the
harness. **Two of the 15 "OK" lines cannot fail** (the independent block re-check and the Jacobian test), and
no check in `run_all.sh` is sensitive to the integrator's rigor. That includes the Lagrange remainder, the a
priori enclosure, the mean-value Jacobian, the d/dkappa column, the accumulated error term and the inverse of
B, and it also includes the kappa width of the interval run and the U-range of the block. 28 of the 44
mutations pass every check. For each of them I checked why. One is a correct pass and one is the ungated
re-check. In the other 26 the conclusion still happens to be true because the dropped quantity is many orders
of magnitude below the decision margins. None of the 28 exposes a hole in the current code. Each is a place where a future edit could make the proof unsound without
any check turning red.

## 1. lohner.py, line by line

**A priori enclosure (lines 199-220).** The first guess is the order-p Taylor range over [0, h], inflated by
20 per cent plus 2^-128. The acceptance test (line 211) is
`hull_contains_interior(W, Xh + [0,h] F(W))` on the five state components and `W[5].contains(Xh[5])` on kappa.
This is the standard first-order Picard-Lindelof test. If `Xh + [0,h] F(W)` is contained in W, the Picard
operator maps C([0,h], W) into itself, so for every x0 in Xh the solution exists on [0, h] and stays in W. The
vector field is polynomial, so it is locally Lipschitz. Strict interiority is not needed for this, but it does no
harm. `hull_contains_interior` (line 115) compares `o.lower() < i.lower()` and `i.upper() < o.upper()`. I
checked in python-flint 0.9 that `lower()` and `upper()` return exact arb endpoints, rounded outward, and that
arb `<` is true only when it is certain. `ball(0, h)` (line 123) is a union of exact balls. Its magnitude radius
rounds outward, so it is a superset of [0, h], which is conservative. Kappa enters F through `W[5]`, which is a
ball containing the whole kappa interval. **Sound.**

**Lagrange remainder (lines 231-232).** `Rem_i = x_{p+1,i}(W) h^{p+1}` is computed from
`taylor_vals(W, order + 1)`, where W includes the kappa ball. The system is autonomous, so the (p+1)-th
derivative at an intermediate time xi_i is (p+1)! times the (p+1)-th Taylor coefficient at x(xi_i), which lies
in W. The order is correct (p = order, and coefficient p+1 is multiplied by h^{p+1}). It is evaluated on the a
priori enclosure and covers the whole step. It is set to 0 for kappa, which is exact because kappa' = 0.
**Sound.**

**Mean-value Taylor map and Jacobian (lines 50-106, 237-241).** J = sum_k h^k D x_k([X]) is evaluated on the
hull [X]. I verified that R always contains 0: R starts at 0, `err = y - mid(y)` contains 0, and R0 = [-1, 1],
so every new R is a sum of balls that contain 0. Therefore xbar is in [X], and the segment from xbar to any x0
lies in the convex hull. The forward-mode recursion is correct. That includes the symmetric product rule
`g_yy = 2 sum_j Y_j gY_{k-j}` (line 72), the product Z D (line 101) and both kappa terms: `gd[5] += w`
(line 79) for d(kappa w)/dkappa, and `gvv[5] += eps (U_k - gam V_k)` (line 87). Row 5 of J is e_5.
`test_jacobian.py` agrees with finite differences to 2.7e-48 in the baseline. **Sound.**

**Representation and QR (lines 242-262).** xbar' = mid(y), C' = mid(JC) and B' = `qr_orth(...)` are all exact
arb matrices of midpoints. B' is only approximately orthogonal (Gram-Schmidt on midpoints). The inverse
`B2inv = B2.inv()` (line 256) is python-flint's rigorous `arb_mat.inv`. I checked that it encloses the exact
inverse and that it raises `ZeroDivisionError` on a singular matrix, or on a ball matrix that contains one. The
transpose of a float Q is **not** used. So B' does not have to be orthogonal for rigor, and the method stays
valid even with B' = I (see the mutation `lo_B_identity`). The column pivoting uses floats only to choose the
column order, which is harmless. The new R' = B'^{-1}(y - xbar' + (JC - C')R0) + (B'^{-1} J B) R encloses every
point. It treats the r0 in the lin term as independent of the r0 in C' r0, which only enlarges the set.
**Sound.**

**Initial set (from_box, lines 159-171).** xbar = mid, C = diag(rad), R0 = [-1, 1]^6. The box is exactly
{mid + diag(rad) r0}. The manifold enclosure `x0` and the kappa ball are put in as a box, which drops the
correlation between kappa and x0. That drop is conservative. It is also the main reason the interval run's y1
enclosure (+/- 3.4e-4) is much wider than the true spread between c1 and c2 (y1 from 5.2e-5 to 1.04e-4).

**Kappa propagation.** Kappa is component 5 of the state everywhere: in the Taylor coefficients, W, the
remainder, J (its column 5) and the set representation. In the interval run, `kappa = 1/(C1 ∪ C2)` (prove_pulse
lines 107 and 116) is a rigorous ball containing [1/c2, 1/c1], and the same ball is used for lambda, the
manifold and the block (`block_data`, line 41). **Sound.**

**Between-steps path check (prove_pulse.py lines 78-96, 146-152).** In phase 2, for each step the enclosure
of y(t) for t in [0, h] is `sum_{k<=p} x_k(prevhull) [0,h]^k + [0, h^{p+1}] x_{p+1}(W)`, where W is the a priori
enclosure that `step()` returned for that same step and the same starting set. This is correct: `prevhull` is
the hull of the set that was passed to `step`, and the h recovered from `t - tp` is exact because every time is
a short dyadic. The path must be in int B (strictly) before the cone test is applied at the end point. Phase 1
(from 0 to 53) has no path check, and the argument does not need one. A wrong-cone entry that happens between
grid points cannot be missed: K+ is forward invariant in B and disjoint from K-, and the path is certified in
int B up to t_K. **Sound.**

**integrate (lines 274-308).** The step lengths are exact dyadics. The last step `float((Tend - t).mid())` is
exact for these sizes. Time is only a label because the system is autonomous.

## 2. Floats, rounding and parameters

- beta = 20, theta = 1/4, eps = 1/10 and gamma = 0 are stored as `fmpq` and converted at the current precision
  on every use (nfcore.py lines 43-54). I verified that `arb(fmpq(1,10))` is a ball of radius 1.1e-78 that
  contains 1/10.
- c1 and c2 are `arb(fmpq(11027477097341592491478677, 10**25))` and `...678` (certify_rest.py lines 46-47), so
  c2 - c1 = 10^-25 exactly and each ball contains its rational (radius 1.7e-77). kappa = 1/c is arb division.
- Decimal strings (`arb('0.05')`, `arb('0.2')`, `arb('0.95')`, `arb('4')`) enclose the decimal. I verified this
  at 2000 bits. In mpmath.iv, `iv.mpf('1.1027477097341592491478677')` is an interval of width 1.6e-61 that
  contains the decimal, and `iv.mpf(1)/10` is an interval.
- Floats that do enter: the block matrix T comes from `numpy.linalg.eig` (block.py lines 54-65). It is stored
  exactly as dyadics, and its inverse is enclosed with `arb_mat.inv`. Any T is valid, because only the checks on
  that T are claimed. `C_REF`, `s0`, the step-size control, the column-pivot keys and the 0.95 shrink factor for
  rho are heuristics that do not enter any inequality. `rho = arb(rho.mid())` is then an exact number.
- Sensitivity check: replacing `fmpq(1, 10)` with the float `0.1` (an error of 5.6e-18) is caught (mutation
  `par_eps_float`, 3 checks fail), and so is any parameter perturbation of 1e-20 (see the table).

No float value enters a rigorous inequality, and I found no missing outward rounding.

## 3. Findings

### F1 (must-fix): the independent block re-check can never fail in run_all.sh

`run_all.sh:28` greps `'^dU 0.05 cone PD'`. `block_check_iv.py:77` prints that prefix whether the result is
`CERTIFIED` or `FAILED`. Mutation `bl_iv_recheck_broken` (eps = 10 in block_check_iv.py) gives
`dU 0.05 cone PD ... [(False, '[38.158139 ...' -> FAILED` in the log, yet run_all prints
`OK    B: independent re-check of the block conditions in mpmath.iv` and "all checks passed". Fix: grep for
`'^dU 0.05 cone PD.*-> CERTIFIED'`, or make block_check_iv exit non-zero and test the exit status. The README
counts this line among the 15 checks and calls it an independent re-check.

### F2 (must-fix): the Jacobian test can never fail in run_all.sh

`run_all.sh:31` greps `'max |J_AD - J_FD|'`, which `test_jacobian.py:37` always prints. Mutation
`lo_jac_no_dkappa` (both d/dkappa terms removed) prints `max |J_AD - J_FD| over 36 entries: 4.69e-02` (baseline
2.67e-48) and `dPhi/dkappa (AD): ['0', '0', '0', '0', '0']`, and run_all still reports OK. **In this mutant the
proof itself also still passes all three P checks.** The interval run's y1 radius at xi = 53 is 3.12e-4 against
3.38e-4. So the d/dkappa column, which is the one thing that makes the interval run cover every c in [c1, c2]
rather than only the spread of the initial box, has no working guard. This mutant's conclusion is still true
here: the rigorous thin runs put y1 at 5.2e-5 (c1) and 1.04e-4 (c2), inside the mutant enclosure. The label says
"a test, not part of the proof". But F2 is the only check of code that the proof relies on, and it cannot fail.
Fix: make test_jacobian exit 1 if `worst > 1e-40`, and grep for a PASS token.

### F3 (should-fix): nothing in run_all.sh is sensitive to the rigor of the integrator

`test_lohner.py` and `test_lohner2.py` (containment of an independent mpmath solution, and a negative control
that drops the remainder) exist but are not called by `run_all.sh`. `test_lohner2.py neg` works as intended: it
took 94 s here, the enclosures with the remainder contain the mpmath solution at every checkpoint, and with the
remainder dropped they do not, with radius 4e-75 against a deviation of 1e-12. Without these tests, the
mutations that remove the remainder, the a priori test, the lin term, the accumulated-error term or the hull
Jacobian all pass every check (table below). I measured why they are harmless in this instance (radii at
xi = 53, from the mutants' certificates):

| run | baseline | no remainder | a priori W := [X] | drop (B'^{-1}JB)R | J at xbar |
|---|---|---|---|---|---|
| c1, max radius | 3.2e-12 | 7.7e-54 | 1.0e-53 | 1.7e-45 | 3.2e-12 |
| interval, y1 radius | 3.38e-4 | 3.38e-4 | 3.38e-4 | 3.38e-4 | 3.38e-4 |

The thin runs' width comes from the Lagrange remainder over W. Even so it is 1e7 below the smallest decision
margin (|y1| about 5e-5 at xi = 53, and 2e-9 radius against 3e-3 values at cone entry). The interval run's width
is the linearly propagated initial box `C r0`. The decision margins are rho - |y'| = 1.2e-3 against radii of
order 1e-7 in y', and in the cone tests a few e-3 against 1e-9. So dropping any one error term does not change a
verdict, and the true orbit is still inside the enclosure. These are **untested redundancies, not holes**. An independent confirmation: I ran `test_lohner2.py prod` on
an unmodified copy. At every checkpoint (xi = 20, 30, 40, 50, 53, 58) the production c1 enclosure contains the
independent mpmath solution of the original 4D system. At xi = 53 the enclosure radius is 3.22e-12 and
|mid - mpmath| is 4.5e-25, so the enclosure is conservative by about 13 orders of magnitude. Fix:
add `test_lohner2.py neg` (about 90 s) or a cheaper version to run_all as a gating check. One cheap and strong
option is a variant of `test_lohner2.py neg` at order 8 over a shorter span.

### F4 (should-fix): the interval run does not check that it covers [c1, c2]

With mutation `pp_interval_kappa_point` (`cc = cr.C1` in the interval branch), the "every orbit with c in
[c1, c2]" line passes, with a radius at 53 of 3.2e-12 against 2.3e-4. Nothing checks that the kappa used covers
both ends. Fix: in `prove_pulse.py` interval mode, assert `kappa.contains(1/cr.C1) and kappa.contains(1/cr.C2)`,
using arb division at higher precision on the fmpq values. Also record the kappa ball in the certificate, and
have run_all cross-check that the three certificates use the same T_enter, rho, r, sigma and t0. At present the
consistency of the three runs, which the Wazewski argument needs, holds only because they call the same code
with the same arguments.

### F5 (should-fix): the block's rho and r are certified only once, and only in flint

`block_check_iv.py` re-checks (C) and (E) for T and |U| <= 0.05, but not the U-range bound
`|Tinv00| r + ||Tinv[0,1:]|| rho < 0.05` that ties B to the s-interval. Mutation `bl_urange_drop_rho` (drop the
rho term) passes every check. In that mutant rho = 0.0395 and the true U-range bound is 0.264 > theta = 0.25, so
the s-range that (C) and (E) were checked on no longer covers B, and the block lemma is invalid. The conclusion
happens to survive, because the orbits (|y'| <= 0.0061) also lie in the correct block (rho = 0.00727). Fix: have
prove_pulse write T, rho and r to its certificate, and have block_check_iv read them and re-check the U-range in
mpmath.iv.

### F6 (should-fix): (C) and (E) have no individual negative control

Mutations `bl_C_always_true` and `bl_E_always_true` each pass everything. The block negative control
(U up to 0.15) is refused by whichever condition is still active. The (E) margins are -0.060 and -0.048, and the
iv re-check confirms both conditions (once F1 is fixed). So the current certificate is right, but neither
check is individually tested. Fix: add a negative control that fails only (C) (for example a T that swaps
the unstable row with a stable row) and one that fails only (E) (for example d = (1, 5, 0.25, 0.25) or a
larger kappa).

### F7 (nit): the block centre is not checked to be the equilibrium

The block lemma is derived by the mean value theorem about x*, but prove_pulse uses `xstar = nf.rest_state()`
(line 103) without checking F(xstar) = 0. Mutations `pp_xstar_shift_1e-4` and `pp_xstar_shift_1e-3` (the block
centred 1e-3 off in V) pass everything. The current code is right: with gamma = 0 the rest state is exact. Fix:
assert that `nf.vfield(xstar, kappa)` contains 0 componentwise.

### F8 (nit): the harness and its outputs

- The negative control `c = 1.1024` is refused because the orbit leaves |x| < 5 at xi = 14.6, not by the cone
  logic. The same-bracket control (c1 asked for K+) is the one that exercises the cone test, and it works.
- `run_all.sh` writes tracked files under `data/` (the `time_s` field changes on each run), so running it in
  place dirties the repository.
- T depends on the LAPACK eigenvector output. Any T is valid, but reproducing the exact certificate on
  another machine can give a slightly different block. That is harmless, but worth a sentence.
- block.py's own `__main__` prints rho and r for r = 1.25 rho, but the proof uses r = 4 rho
  (`NF_R_OVER_RHO`). The block lemma holds for any r > rho, but the logged numbers in block_certificate.json
  are not the ones used.
- The remainder over W (3e-12 at 53 on the thin runs) is about 1e11 times larger than tol would suggest. The
  step control uses point coefficients, while the remainder uses ball coefficients over an inflated W. This is
  conservative, not a bug. Order-30 recursions over a wide ball overestimate by this much.

## 4. Mutation table

"Caught" means that at least one run_all check turns FAIL. For the mutants that are not caught, the last column
gives my assessment: "harmless here" means the verdict would be the same with correct code and the true orbit is
still inside the reported enclosure, while "hole" means the code would then prove something false or unproved,
with only luck of margins keeping it true.

| mutation | what it does | caught? | failing checks | assessment |
|---|---|---|---|---|
| lo_no_remainder | Rem := 0 in step | no | - | unsound code; harmless here (F3) |
| lo_rem_at_xbar | remainder at xbar, not on W | no | - | unsound; harmless here (F3) |
| lo_rem_order_p2 | x_{p+2}(W) h^{p+2} instead of p+1 | no | - | unsound; harmless here (F3) |
| lo_apriori_no_test | accept W without the Picard test | no | - | unsound; harmless here (F3) |
| lo_apriori_W_is_X | W := [X] (no time range) | no | - | unsound; harmless here (F3) |
| lo_apriori_half_step | test only [0, h/2] | no | - | unsound; harmless here (F3) |
| lo_B_identity | B' = I | no | - | still rigorous (B'^{-1} exact); a correct pass |
| lo_B_parallelepiped | B' = mid(JB), rigorous inverse | yes | P interval, P c1, P c2, N same-bracket | rigorous but wrapping blows up |
| lo_Binv_transpose | B'^{-1} := B'^T | no | - | error about 1e-77; harmless here |
| lo_B_perturbed_transpose | B' non-orthogonal by 1e-3, inverse := transpose | no | - | unsound; harmless here: R is tiny compared with C r0 (F3) |
| lo_jac_no_dkappa | drop both d/dkappa terms | no | - (J test prints 4.7e-2 but reports OK) | **unguarded**; conclusion still true here (F2) |
| lo_jac_wrong_yy | 3 instead of 2 in d(Y^2) | yes | P interval (StepFailure crash) | caught only by accident; J test still reports OK (F2) |
| lo_jac_at_xbar | J at xbar instead of on the hull | no | - | unsound; harmless here (F3) |
| lo_drop_lin | drop (JC - C')R0 | no | - | unsound; harmless here (F3) |
| lo_drop_JB_R | drop the accumulated error (B'^{-1}JB)R | no | - | unsound; harmless here (F3) |
| pp_interval_kappa_point | interval run at c1 only | no | - | proves only c1; conclusion unproved (F4) |
| pp_block_kappa_point | block checked at 1/c1 only | no | - | unsound; harmless (the block margins dwarf a 1e-25 kappa spread) |
| pp_skip_between_steps | no path check in phase 2 | no | - | unsound; harmless here: the path stays about 1e-3 inside B |
| pp_steprange_no_rem | path check without remainder | no | - | unsound; harmless here |
| pp_inB_ignore_y1 | int B test ignores abs(y1) < r | no | - | unsound; harmless here: abs(y1) <= 3.5e-3 against r = 0.029 |
| pp_cone_flip | swap K+ and K- | yes | P c1, P c2, N same-bracket | caught |
| pp_cone_upper_bound | cone test on the upper, not the lower, end | no | - | unsound; harmless here: enclosure 1e-9 against a margin of 1e-4 |
| pp_cone_drop_norm | K+ := y1 > 0 | yes | P c1, N same-bracket | caught |
| cr_same_cone_minus | both ends expect K- | yes | P c2 | caught |
| cr_same_cone_plus | both ends expect K+ | yes | P c1 | caught |
| cr_c2_equals_c1 | c2 := c1 | yes | P c2 | caught |
| par_eps_plus_1e-20 | eps + 1e-20 | yes | P interval, P c1, P c2 | caught |
| par_eps_minus_1e-20 | eps - 1e-20 | yes | P interval, P c1, P c2 | caught |
| par_theta_plus_1e-20 | theta + 1e-20 | yes | P interval, P c1, P c2 | caught |
| par_beta_plus_1e-20 | beta + 1e-20 | yes | P interval, P c1, P c2 | caught |
| par_eps_float | eps := float 0.1 (error 5.6e-18) | yes | P interval, P c1, P c2 | caught |
| par_c_plus_1e-20 | c1, c2 + 1e-20 | yes | P interval, P c1, P c2 | caught |
| par_c_minus_1e-20 | c1, c2 - 1e-20 | yes | P interval, P c1, P c2 | caught |
| par_c1_widen_1e-20 | c1 - 1e-20 (the bracket widened) | yes | P interval, P c1 | the orbits leave before 53, so 53 is too late for a wider bracket |
| bl_C_always_true | (C) always true | no | - | untested (F6); the certificate is correct |
| bl_E_always_true | (E) always true | no | - | untested (F6); the certificate is correct |
| bl_one_s_endpoint | only s = smin checked | yes | B negative control | caught, but only through the negative control |
| bl_urange_drop_rho | U-range ignores the rho term | no | - | **hole in the harness**: B reaches U = 0.26 > theta; conclusion survives by luck (F5) |
| bl_iv_recheck_broken | block_check_iv with eps = 10 prints FAILED | no | - (reports OK) | **ungated check** (F1) |
| mf_no_tail | manifold tail dropped | no | - | harmless: tail r_i 4^-81 <= 2.5e-76 |
| mf_K_tiny | the K_i bound divided by 1e6 | no | - | unsound; harmless (same reason) |
| mf_G0_zero | G0 := 0 | no | - | unsound; harmless (G0 = 5.8e-26, multiplied by 4^-81) |
| pp_xstar_shift_1e-4 | block centred 1e-4 off in V | no | - | wrong block centre not detected (F7) |
| pp_xstar_shift_1e-3 | block centred 1e-3 off in V | no | - | wrong block centre not detected (F7) |

Totals (counted from `mutation_results.txt`): 44 mutations; 16 caught, 28 not caught. Of the 28, one is a correct
pass (`lo_B_identity`) and one is an ungated check (`bl_iv_recheck_broken`). The other 26 are unsound edits that
leave the conclusion true in this instance because of the size of the margins. Among those 26, `lo_jac_no_dkappa`, `pp_interval_kappa_point` and
`bl_urange_drop_rho` are the most serious, because they touch exactly what makes the interval and block
statements cover what they claim.

## 5. What was not checked here

The mathematics (the block lemma, the Wazewski argument, the reduction to the wave ODE, and whether the 5D
strong unstable manifold equals the lift of the 4D one) belongs to the math review. I checked the closed form
`zsolve` against (mu - A) z = e_Y by hand, the bound `zbound`, and the algebra behind Z(r); they are correct.
I did not check python-flint's own ball arithmetic.
