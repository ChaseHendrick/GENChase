# Independent reimplementation: nf-pulse (fast pulse, beta = 20, theta = 1/4, eps = 1/10, gamma = 0)

Date: 2026-09-26. Everything in this folder was written without importing or reading `papers/nf-pulse/code`
(only `README.md` was read for the statement) until Tasks 1 to 3 had produced their results; Task 4 was done
afterwards. Nothing in `code/` or `data/` was modified. Tools: Python 3.11, python-flint 0.9 (arb), mpmath 1.3.

Labels: **RIGOROUS** means ball arithmetic with an argument written out below; **NUMERICAL** means floating
point at high precision, with no proof.

## Files

| File | What it does | Label |
|---|---|---|
| `nfr.py` | model, parameters as exact rationals, Taylor recursion (4D, with S(U(xi)) expanded through Y' = beta Y(1-Y)U', Y_0 = S(U_0) re-evaluated each step, so Y is never a propagated state) | |
| `certify_rest_reimpl.py` -> `certify_rest_output.txt` | Task 1 | RIGOROUS |
| `manifold_reimpl.py` -> `manifold_output.txt`, `manifold_point_c{1,2}.json` | Task 2a, a point of W^u_+ in a ball | RIGOROUS |
| `integrate_reimpl.py` -> `integrate_output.txt`, `integration_result.json` | Task 2b, interval Taylor integration of the c1 and c2 orbits | RIGOROUS |
| `negative_controls_output.txt` | Task 2b at c1 - 1e-25 and c2 + 1e-25 | RIGOROUS |
| `shoot_mp.py`, `bracket_mp.py` -> `shoot_mp_dps{70,85}.{log,json}`, `bracket_mp_dps{70,85}.log` | Task 3 | NUMERICAL |
| `compare_base.py` -> `compare_base.json` | Task 4, my integrator against the base enclosures | NUMERICAL |

Run: `python3 certify_rest_reimpl.py; python3 manifold_reimpl.py; python3 integrate_reimpl.py` (about 40 s),
`python3 shoot_mp.py 70` (about 7 min) then `python3 bracket_mp.py 70`, and `python3 compare_base.py`.

## Task 1: rest state and eigenvalues (RIGOROUS)

**Equilibria.** V' = eps kappa U = 0 forces U = 0; Q' = P = 0; P' = 0 forces Q = S(0); U' = 0 forces
V = Q - U = S(0). So x* = (0, S(0), S(0), 0) is the only equilibrium for every c > 0. It is isolated and
agrees with the claimed limit (U, V) -> (0, S(0)). With gamma = 0 the rest value of V is S(0), not 0.

S(0) = 0.006692850924284855559361980381325180393744 (+/- 9e-45),
s = S'(0) = 0.1329611334158030982799706900828847351026 (+/- 7e-42) < 1.

**Characteristic polynomial** (derived by hand, matches `arb_mat.charpoly` of the Jacobian, balls overlap):
p(l) = l^4 + k l^3 + (eps k^2 - 1) l^2 + k (s - 1) l - eps k^2, k = 1/c.

**Root isolation.** kappa is one ball that contains 1/c for every c in [c1, c2]. p is evaluated on a
600-point rational grid on [-3, 3] (the Cauchy bound is 1.918 < 3). There are four strict certified sign
changes and no grid value that contains 0. So for every c in [c1, c2], p has four distinct real roots, which
are all of its roots. Bisection with certified signs gives:

| root | enclosure valid for all c in [c1, c2] |
|---|---|
| mu_1 | [-1.16782387164510010275175035559, -1.16782387164510010275174982619] |
| mu_2 | [-0.583109889199161753091305101070, -0.583109889199161753091304836372] |
| mu_3 | [-0.124653132559362267515549995059, -0.124653132559362267515549928884] |
| lambda | [0.968761160579321787055365162326, 0.968761160579321787055365228500] |

That is one positive and three negative real eigenvalues, all simple. At the points c1 and c2 the
enclosures have widths of about 1e-94 (see `certify_rest_output.txt`); at c1, lambda = 0.968761160579321787055365196443...

## Task 2a: a point on the unstable branch W^u_+ (RIGOROUS)

I did not use a parametrization with a tail bound. I used a **tapered isolating tube** in graph
coordinates. The full argument is in the docstring of `manifold_reimpl.py`; in short:

- E is an exact dyadic matrix whose columns approximate the eigenvectors (unstable first), each with U-component
  exactly 1. Then y = E^{-1}(x - x*) = (a, b) and U = a + b_1 + b_2 + b_3. The field is
  x' = A(x - x*) + e_P G(U) with G(U) = -(S(U) - S(0) - sU). All of L = E^{-1} A E is kept in the bounds,
  including its off-diagonal entries of about 1e-94.
- b = h(a) + z, where h is an exact polynomial of degree N = 45 that approximately solves the invariance
  equation. The residual R(a) is enclosed as a one-variable Taylor model on [0, delta] with delta = 1/1000.
  The tail of G(U0(a)) uses a Cauchy estimate: for complex |U| <= 0.2, w = 5 - 20U has Re w >= 1, so
  |S| <= 1/(e - 1). The code checks that |U0(a)| < 0.2 on |a| <= 0.1.
- The tube is T = {0 < a <= delta, |z_i| <= r(a)} with r(a) = sum_{k=1}^{46} rho_k a^k. The code checks
  (i) a' >= lambda_min a with lambda_min = 0.9651678 > 0, and (ii) for every coefficient,
  (k lambda_min + |mu_i| - E1_i) rho_k >= |R_ik|, strictly at k = 46. So the lateral faces are strict
  entrance faces in forward time.
- Conclusion (Wazewski, via no-retraction on the face disk D = {a = delta, |z|_inf <= r(delta)}, flowing
  backward): some point of D has its whole backward orbit in T. That orbit tends to x*, so the point lies on
  W^u(x*), on the branch a > 0. On that branch U = a(1 + O(delta)) > 0 and U increases, which is the branch
  the claim names.

Result: r(delta) = 3.35e-94. The point is enclosed in a ball of radius at most 1.0e-93 in every component.
At c1 it is U = 0.00100018160955623990410314073456, V = 0.00678648158249031211768077970691,
Q = 0.00885499824145780485454949210238, P = 0.00209414737278164481909823039051.

## Task 2b: interval Taylor integration of the c1 and c2 orbits (RIGOROUS)

The method differs from C^0-Lohner: it is a plain interval Taylor series in arb at 320 bits, with no QR and no
affine sets. The order is 36 with truncation target 1e-100. Each step:

1. Taylor coefficients are computed at the current ball vector.
2. An a priori box B is verified by x + [0, h] f(B) contained in B (Picard-Schauder).
3. The Lagrange remainder is enclosed by the order-37 coefficient computed on B, times h^37.

The initial data are the Task 2a balls, and the speeds c1 and c2 are the exact rationals. Width growth stays
small: radii go from 1e-93 to 1e-60 at the end. The unstable coordinate is a = (row 0 of E^{-1})(x - x*).
Its orientation is a > 0 on W^u_+, i.e. the side where U > 0.

xi is measured from the manifold point at a = 1e-3. **Add -3.6905 to convert to the base code's xi** (see
Task 4).

| | c1 = 1.1027477097341592491478677 | c2 = c1 + 1e-25 |
|---|---|---|
| steps / time | 15597 / 17 s | 15650 / 17 s |
| max U, rigorous lower bound (step endpoint) | 0.759716243282 at xi = 9.377 | same to 12 digits |
| a after the excursion | crosses 0 near xi = 57.80; certified a < 0 from xi = 57.8067 on | minimum a = +3.154e-5 at xi = 56.12, dist to rest 0.01013; a stays > 0 |
| first xi with abs(a) > 5e-3 | **xi = 63.6307, a = -0.005012971836, sign -1** | **xi = 63.0256, a = +0.005000253966, sign +1** |
| state there | U = -0.0091045478, V = 0.0092491710, Q = -0.0046643919, P = -0.0104651575 | U = +0.00056648363, V = 0.0104143958, Q = 0.0169116825, P = 0.0105379109 |
| max radius at the end | 1.05e-60 | 5.1e-61 |

Negative-control style check (same program, `negative_controls_output.txt`): c1 - 1e-25 gives sign -1 at
xi = 62.26, and c2 + 1e-25 gives sign +1 at xi = 62.06. So the classification is not always "opposite".

**What is proved.** At the exact speeds c1 and c2, the orbit of W^u_+ (the branch where U first increases)
makes the excursion (U reaches at least 0.759716243) and returns to within sup-distance about 0.01 of rest.
At c1 it then leaves with negative unstable coordinate, with U, Q and P negative. At c2 it leaves with
positive unstable coordinate, with Q and P positive and U just turning positive.

**What is NOT proved here.**

1. I did not reimplement an isolating block or cone argument near rest. So I have not proved that the sign
   classification is an open condition in c, or that an orbit which never leaves converges to rest.
2. I did not integrate the whole interval [c1, c2]; only its two endpoints.

Without these, my computation does not by itself prove that a homoclinic orbit exists for some c in (c1, c2).
It independently confirms the two endpoint facts that the base shooting argument needs.

## Task 3: high-precision shooting (NUMERICAL)

`shoot_mp.py` works in three stages.

- **Stage 0.** Double-precision RK4 with bisection on [1.0, 1.2] (no claimed digits used) gives
  [1.1027477097564347, 1.1027477097564375]. This is off by 2e-11 because of the RK4 truncation error.
- **Stage 1.** mpmath at mp.dps = 70, and separately at dps = 85. The integrator is my own order-60 Taylor
  scheme, started from a parametrization-method point K(1e-3) of order 45. The shooting function is the
  left-unstable-eigenvector projection at a fixed time T, and I solve it by secant for
  T = 30, 40, ..., 140. The root c(T) converges to c* at rate e^(-1.22 T), which matches
  lambda + 2|mu_3| = 1.218.
- **Stage 2.** Classification bracket: the sign of the unstable coordinate when abs(a) first exceeds 5e-3,
  after the return to within 0.05 of rest.

Results:

- c(140), dps 85: 1.1027477097341592491478677357466217332550533837818208789272600552987992...
- c(140), dps 70: 1.1027477097341592491478677357466217332550533837818208789272600553 (differs by 1.2e-66)
- c(130) - c(140) = -2.5e-64 (dps 85); the extrapolated error at T = 140 is about 1e-69.
- **Bracket (dps 85):** c(140) - 1e-62 gives sign -1 (leaves at xi = 150.56), and c(140) + 1e-62 gives
  sign +1 (xi = 150.54). The same holds at dps 70.
- **c\* = 1.102747709734159249147867735746621733255053383781820878927260055** (about 64 digits; the two
  precisions agree to 1.2e-66). This agrees with the claimed 1.10274770973415924914786773574662... in every
  digit given.
- Numerically, c* - c1 = 3.5747e-26 and c2 - c* = 6.4253e-26. So c* lies inside (c1, c2), and c1 < c* < c2
  matches the signs of Task 2 (below c*: -1, above c*: +1).
- Numerical max of U on the pulse: 0.75971624680 at xi = 9.3777 (my convention). This is consistent with the
  rigorous lower bound 0.759716243282.

## Task 4: comparison with the base code (after my results were in)

I read `certify_rest.py`, `nfcore.py`, `manifold.py`, `prove_pulse.py` and `block.py`, plus the data files
`proof_*_final.json`, `rest_certificate.json`, `manifold_validation.json` and `block_certificate.json`.
`compare_base.py` imports no base code. It reads only data files and runs my mpmath integrator from the base
starting point.

**Rest state and eigenvalues.** Same rest state, same polynomial (the base writes it as
(l^2 + k l + eps k^2)(l^2 - 1) + s k l, which expands to mine), and the same S'(0). The base root enclosures
(`rest_certificate.json`) agree with mine to all digits printed. The base also proves "one unstable, three
stable eigenvalues for every c > 0" by Descartes plus no roots on the imaginary axis. I checked that argument
and it is sound: the leading coefficient is 1, so no root escapes to infinity. No discrepancy.

**Unstable manifold.** The base uses a 5D polynomial embedding (Y = S(U) as a state), a parametrization of
order 80 with an l^1 tail bound, a_1 = sigma v with sigma = 1/7 and v normalized to U = 1, evaluated at
t = 1/4. In my parametrization (K_1 = v) that point is K(1/28). My mpmath K(1/28) at c1 gives
U = 0.035513769029008058648402111744383, V = 0.010026765832054676803262330512778,
Q = 0.083251343976127809381206919124237, P = 0.073477967806229156519166873651258. These are inside the base
enclosures `P(t0)` (agreement to about 32 digits). Both codes use the branch a_1 = +sigma v, where U
increases. No discrepancy.

**xi convention.** The base xi = 0 is at K(1/28); my xi = 0 is at a = 1e-3, which is theta = 0.0010003293582.
The offset is xi_mine = xi_base + ln((1/28)/theta)/lambda = xi_base + 3.6905086726.

**Base enclosures against my integrator** (NUMERICAL check, `compare_base.json`). Starting from K(1/28), my
mpmath orbit at xi_base = 53 lies inside all four base enclosures `x_at_T`, for both c1 and c2. For example,
at c1: U = -0.00947410275 (+/- 3e-12 in the base; mine is -0.009474102750...). At the base cone-entry times
t_K = 58.375 (c1) and 57.75 (c2), my y = T(x - x*), with the base's stored T, lies inside all four base
enclosures `y_at_tK`. It is in K- for c1 and in K+ for c2.

**What K+ and K- mean.** The base block coordinates are y = T(x - x*), T = diag(1, 0.5, 0.25, 0.25) V^{-1},
with V a numpy eigenvector matrix sorted by decreasing eigenvalue. So y1 is the unstable coordinate, and
K+ = {y1 > |y'|_2} and K- = {-y1 > |y'|_2}. With the stored T, row 0 of T applied to v (U = 1) gives
+3.1732 > 0, so y1 = 3.1732 a. **K+ is the side of W^u_+ (U > 0); K- is the opposite side.** The base
expects c1 -> K- ("escape into Q < 0") and c2 -> K+ ("escape into Q > 1"). My rigorous run agrees: c1 gives
sign -1, where Q = -0.00466 < 0 at exit, and c2 gives sign +1, where Q > 0. My ordering c1 < c* < c2
(c* - c1 = 3.57e-26) matches the base comments "below c* by 3.6e-26" and "above c* by 6.4e-26".

**Discrepancies and remarks** (none of them changes the claimed result):

1. **`maxU_upper_phase1` is mislabelled.** In `prove_pulse.py` it is the maximum over step-endpoint hulls
   (0.7596645078). That is a lower bound for max U, not an upper bound, and it misses the true peak. My
   rigorous step-endpoint lower bound is 0.759716243282, and the numerical peak is 0.7597162468. The README's
   "U reaches about 0.76" is correct.
2. **The K+/K- orientation comes from numpy.** It is fixed by the sign numpy gives the unstable eigenvector
   inside `block.setup()`, not by the code. The stored T gives y1 = +3.17 a, so it is correct as run. If
   numpy on another machine returned the opposite sign, K+ and K- would swap and the hard-coded
   `SIDE_C1 = -1, SIDE_C2 = +1` would make the proof FAIL (it would not pass falsely). Normalizing the sign,
   e.g. requiring T[0,:] v > 0, would make this robust.
3. **The interval run uses a wider c ball than needed.** It uses c = 1.102747709734159249147868 +/- 3.01e-25,
   which contains [c1, c2]. This is harmless.
4. The base README's "c2 = c1 + 1e-25" matches `C2 = ...8678e-25` in `certify_rest.py`.
5. Not checked by me: the block conditions (`block.py`), the Lohner integrator's internal correctness, and
   the "interval" run that keeps every c in [c1, c2] inside the block at xi_base = 53. These are the parts
   of the existence argument that my reimplementation does not cover (see Task 2b, "What is NOT proved
   here").
