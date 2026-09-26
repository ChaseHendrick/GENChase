# Independent check of the chaos results (HH at J*)

Status: NUMERICAL, float64, not a proof. Written 2026-09-26 by an independent checker. Nothing in `../code/` was imported
or run; its files were read only to learn two conventions (the fate grid is `linspace(0, 1, N + 1)`; the zero `z1` is the
zero of c1' = first chart coordinate of P(c), see claim 8). Data were read from `../data/`.

## Method

- `hhk.py`: the model written from the equations in the task (modern sign convention, Psi by a series for |x| < 0.05),
  a hand-written Jacobian (checked against central differences, max difference 5.6e-9 at step 1e-6), and my own
  integrator: adaptive Gragg-Bulirsch-Stoer extrapolation (modified midpoint, 6 columns, order 12), compiled with numba.
  It is not DOP853. The section crossing is located by Newton iteration on the length of the last step (re-stepping
  from the last accepted state), so there is no interpolant. DP comes from the 4x4 variational equation and the
  projection (I - f e_u^T / f_u) Phi. Default rtol 1e-13, atol 1e-15, hmax 0.25 ms.
- Second integrator for spot checks: scipy `solve_ivp` Radau, rtol 1e-12, atol 1e-14, with my analytic Jacobian and
  event location (`hhk.P_scipy`). LSODA was tried but scipy's event root finder fails at t = 0 on the section.
- `E_l` in mpmath (40 digits): 10.59892096939167852219887852940657980278. Float: 10.598920969391678 (claimed
  10.5989209693917, agrees). J* = 7.8617827403 + 0.3 (10.599 - E_l) = 7.861806449482496 (agrees).
- Integrator noise floor (measured, not assumed): the flow from A has monodromy entries up to 3.8e5, so the state at a
  fixed time is reproducible only to about 1e-9 in u across tolerances (DOP853 at rtol 1e-13 vs 1e-14 differ by 5e-11,
  Radau by 3e-10, my GBS by up to 1e-8). This moves the return TIME by about 1e-9 ms but the section point (the gates)
  only by about 1e-12. All the differences below should be read against that floor.

## 1-4. Fixed points (`fixed_points.py`, `fixed_points.json`, `liouville.py`, `c_multipliers.py`)

| | claimed | this check | difference |
|---|---|---|---|
| A (Newton from the claimed point) | (0.08508337679997968, 0.37698374722391487, 0.43727280151327774) | (0.08508337679997977, 0.3769837472239077, 0.43727280151323267) | 4.5e-14 max |
| \|P(A_claimed) - A_claimed\| | 5.8e-14 | 1.2e-13 (GBS), 3.4e-13 (Radau) | noise level |
| T_A (ms) | 15.8503076545 | 15.8503076556 | 1.1e-9 (period noise floor) |
| mu_A | 33.07495115, 0.28382030, -5.1e-14 | 33.07495117, 0.28382030, 1.2e-12 | 6e-10 rel.; third: see below |
| B | from JSON | agrees | 2.1e-15 max |
| \|P(B_claimed) - B_claimed\| | 5.1e-12 | 1.9e-11 (GBS), 1.4e-12 (Radau) | noise level |
| T_B (ms) | 17.8021153596 | 17.8021153541 | 5.4e-9 |
| mu_B | -509.96924, -0.1901741 | -509.96923, -0.1901741 | 1.5e-8 rel. |
| C (Newton from rates.json C_point) | C_point | agrees | 5.5e-15 max |
| \|P(C) - C\| | 8.3e-8 | 3.6e-7 (GBS at my Newton point), 1.1e-7 (Radau at C_point) | noise, multiplier 2.8e7 |
| T_C (ms) | 22.6553 | 22.6555 | 1.9e-4 (noise times 2.8e7) |
| mu_C | 2.8145e7, 4.678e-4 | 2.8137e7 to 2.8192e7, 4.48e-4 to 5.09e-4 over six integrator settings | within the spread |

G&O's printed points at I = 7.8617827403, E_l = 10.599:

| | claimed | GBS | Radau |
|---|---|---|---|
| \|P(p1) - p1\|, u increasing | ~2e-9 | 1.975e-9 | 1.975e-9 |
| \|P(p2) - p2\|, u increasing | ~7.5e-8 | 9.2e-7 | 2.5e-7 |
| \|P(p1) - p1\|, u DECREASING | not a fixed point | 0.133 | |
| \|P(p2) - p2\|, u DECREASING | not a fixed point | 0.288 | |

du/dt at (4.5, p1) = +1.266 and at (4.5, p2) = +1.294, so the printed points lie on the u-increasing half of the section.
Confirmed: p1 and p2 are fixed points of the u-increasing map (to the float64 noise level for p2, whose multiplier is
2.8e7, so any residual below about 1e-6 is noise for either code) and are far from fixed for the u-decreasing map.

Two remarks against the claims as worded:

- **p1 is accurate to about 8 digits, not 14.** Newton from p1 (same parameters) converges to A; the printed p1 differs
  from that fixed point by 8.56e-9 (in h). The residual 2e-9 is consistent with that distance (the error lies mostly
  along a contracting direction), not with 14 correct decimals. p2 differs from its Newton fixed point by 2.1e-11, which
  is at the reproducibility floor for C.
- **The third multiplier of A and B ("~ -5e-14", "~5e-13") is roundoff, not a measurement.** By Liouville,
  mu1 mu2 mu3 = exp(integral of tr Df over the period). The integral is -81.784 for A and -94.533 for B, so
  mu3 = 3.2e-37 for A and 9.1e-44 for B. The float64 DP gives 1e-12 in my code and 5e-14 in the claims: both are noise.
  The same applies to the third Lyapunov exponents in `data/rates.json` (-1.931 /ms for A, -1.594 /ms for B): the
  Liouville values are ln(3.2e-37)/15.85 = -5.30 /ms and ln(9.1e-44)/17.80 = -5.57 /ms. I did not check C, but its
  value (-0.749 /ms) comes from the same float64 eigenvalue and is presumably also noise. This does not affect the
  covering relations (r3 = 1e-6 is only helped by stronger contraction), but these numbers should not be quoted.

## 5. Branch of periodic orbits (`continuation.py`, `cont_analyze.py`, `upper_fold.py`)

Pseudo-arclength continuation of fixed points of P in (gates, J) from A at J* toward lower J, then natural continuation
in J along the other side.

| event | claimed | this check |
|---|---|---|
| lower fold, A and B families meet | J = 7.846571 | J = 7.8465708 (quartic fit of J against h at the turning point, fits spread 7.84657072 to 7.84657084); multiplier through +1 is the weak one (0.28 on A, 1.10 just past the fold) |
| period doubling on the B family | near 7.8496 | J = 7.8495611 (multiplier -1.00032 at 7.8495604, -0.99809 at 7.8495655; linear interpolation) |
| upper fold | near 7.92200 | J between 7.9220084 (last solved point, multipliers 1103 and 2.82) and about 7.9220086 (sqrt extrapolation of mu2 - 1); T about 20.70 ms |

Additional observation: just below the upper fold (J from 7.9220062 to 7.9220076) the two large multipliers of the B
family collide on the negative axis, become a complex pair of modulus about 55, and separate again on the positive
axis. This is a genuine feature (arrival transversal, du/dt = 1.297, no interior extremum within 9.9 mV of the
section), not a crossing error. It does not contradict the claim.

## 6. H-sets and covering relations (`hsets.py`, `covering.py`, `faces_random.py`, `firing_margin.py`, `radau_spot.py`)

The chart was rebuilt from the task description; it reproduces the JSON values (A at xi = -3.94e-5, eta = 0.7143;
B at chart (-0.3195, -0.4866, 0.0260); `B_in_c` to all digits).

Samples per h-set: exit faces 2,027 eta values (including the endpoints and points 1e-8 to 1e-2 from them) times
zeta in {-1, -0.5, 0, 0.5, 1}, per face; 20,000 random face points per face; interior 148,003 points (81 x 321 x 3
grid, 30,000 random, 20,000 in the strips |xi| in [0.95, 1] with zeta = +-1, 20,000 in the strips |eta| in [0.98, 1]);
15 lines of 4,001 points in xi for continuity. Total about 400,000 returns.

| relation | exit face: required side, min \|xi'\| (claimed) | image eta' range (claimed) | max \|zeta'\| | verdict |
|---|---|---|---|---|
| N_A => N_A | left < -1: xi' <= -31.12 (-31.12); right > 1: xi' >= 31.48 (31.48) | [0.00745, 0.79526] ([0.0079, 0.7953]) | 0.0103 | holds |
| N_A => N_B | left: <= -1365.7 (-1365.7); right: >= 595.2 (595.2) | same | 0.0103 | holds |
| N_B => N_A | left > 1: xi' >= 13.919 (13.919); right < -1: <= -38.89 (-38.89) | [-0.83214, -0.30576] ([-0.8273, -0.3077]) | 0.0353 | holds |
| N_B => N_B | left: >= 151.1 (151.1); right: <= -639.3 (-639.3) | same | 0.0353 | holds |

The smallest exit margin is 12.9 (N_B left face to N_A, at the corner eta = -1, zeta = -1); the image stays at least
0.168 from eta' = -1 and 0.205 from eta' = +1 and at least 0.96 from |zeta'| = 1. My denser sampling (zeta = +-1
included) widens the eta' ranges slightly beyond the claimed ones (0.00745 against 0.0079; -0.8321 against -0.8273);
this changes no conclusion.

Attempts to refute, and their outcomes:

1. **Firing during the return (continuity of P).** Max u along every sampled flight: 13.70 mV on N_A, 15.73 mV on N_B
   (threshold used: 50). No return failed (status ok for all points), return times 15.73 to 16.79 ms (N_A) and 17.36
   to 18.65 ms (N_B). Not refuted.
2. **Distance to the firing boundary.** Marching xi outward from each set on a 21 x 3 grid of (eta, zeta) and bisecting:
   no firing on the left of either set up to |xi| = 60; on the right, the first firing is at xi = 3.30 to 3.34 in the
   N_B chart (so the right face of N_B is about 2.3 widths w_B, about 2.4e-7 in c1, inside the continuity domain; for
   comparison the integrator noise in c1 is about 1e-12), and at xi = 2.78 to 12.4 in the N_A chart (this is the same
   boundary seen past the B lap). Not refuted.
3. **Continuity along lines.** On 15 lines of 4,001 points per set, c1' is strictly monotone in xi on every line, the
   largest neighbour step is 1.07 (N_A) and 1.80 (N_B) times the median step, and the largest jump in return time is
   1.4e-4 ms. No discontinuity. Not refuted.
4. **Transversality at arrival.** min du/dt at the arrival crossing 1.2635 mV/ms (N_A), 1.2824 (N_B). Interior extrema
   of u during the flight stay at least 6.3 mV (N_A) and 7.6 mV (N_B) from the section value, so no near-tangency that
   could make the "next crossing" jump. Not refuted.
5. **Tolerance sensitivity.** Faces rerun at (rtol, hmax) = (1e-8, 0.5), (1e-10, 0.25), (1e-12, 0.05), (1e-13, 0.25):
   every verdict identical, margins change by at most 0.008 (at rtol 1e-8) and 3e-4 (at rtol 1e-12). Not refuted.
6. **Second integrator.** Radau at the 8 corners and 5 face and interior centres of each set: gate difference at most
   1.1e-10, chart difference at most 3.8e-4 (in the N_B chart, whose width is 1e-7). Not refuted.
7. **Geometry of the sets.** w_A = 2.5e-6 constant; w_B in [4.76e-8, 3.34e-7] on eta in [-1, 1], positive; N_A and N_B
   are disjoint (gap in c1 at least 3.0e-6); cond(E) = 30. Not refuted.

Caveat that sampling cannot remove: this is a finite sample of a continuous map, in floating point. The margins are
large relative to every observed error, but only an interval computation can make it a covering relation.

## 7. Periodic orbits (`periodic.py`, `periodic.json`)

All 71 primitive itineraries of length 1 to 8 in the JSON were recomputed by multiple-shooting Newton with my DP,
starting from the claimed (xi, eta) of each point with zeta = 0, not from the claimed x0.

- All 71 converge; my first point agrees with the claimed x0 to at most 2.2e-13 (AB 1.5e-14, AAB 5.1e-14, ABB 6.9e-14,
  AABB 2.4e-14, ABBB 1.6e-14).
- Multiple-shooting residual at most 3.0e-10 (claimed at most 1.7e-11 with DOP853; the difference is my integrator's
  noise times multipliers up to 510 per return).
- Every point lies in its named h-set: max \|xi\| 0.345, max \|eta\| 0.714, max \|zeta\| 0.033.
- Periods agree to at most 3.2e-7 ms (e.g. AB 34.523101762 vs 34.523101724; AABB 68.262542680 vs 68.262542688);
  leading multipliers agree to about 1e-6 relative (AB -5.733991e4, AAB -2.771735e6, ABB 2.569939e7,
  AABB 1.129945e9, ABBB -1.341049e10).
- Iterating the claimed x0 n times by single shooting gives residuals up to 0.045, as expected from multipliers up to
  9e20; that is not a defect of the claimed points.

## 8. Threshold segment (`threshold.py`, `threshold_refine.py`)

My z1 at c2 = -2e-3: the zero of c1' on the line (c1, c2, 0) is 5.835406888227534e-6 (claimed 5.8354068888413905e-6,
difference 6e-16). Note: the fixed point of c1 -> c1' on that line is a different number (5.9957e-6); the claim uses
the zero of c1'.

| N | claimed switches, AP, REST | this check (rtol 1e-13) |
|---|---|---|
| 100 | 1, 50, 51 | 1, 50, 51 |
| 1,000 | 3, 494, 507 | 3, 494, 507 |
| 10,000 | 5, 4941, 5060 | 5, 4941, 5060 |
| 100,000 | 9, 49407, 50594 | 9, 49407, 50594 (identical at rtol 1e-11 and with the claimed z1) |

No undecided points; the latest decision was at 124.9 ms. Switch locations (bisected to 6e-13 mV):
4.500000869720 (REST to AP), 4.500002116983, 4.500002127227, 4.500040292161, 4.500040687706, 4.501091221085,
4.501091260478, 4.501091912881, 4.501114299000. For 8 of the 9, the fates at u* -+ 1e-8 mV agree between GBS
(rtol 1e-13 and 1e-11) and Radau. At 4.500040292161 all three integrators give REST on both sides at -+1e-8: there is
further structure finer than 1e-8 there, consistent with the claim's report that finer grids find more switches.
The non-monotone fate at fixed gates is reproduced.

## Verdict

Every claim I was asked to check reproduces with an independent model implementation and a different integrator,
within the float64 reproducibility floor: E_l and J*; the fixed points A, B, C (to 5e-14); multipliers of A and B to
1e-8 relative; G&O's p1 and p2 are fixed points of the u-increasing map and not of the u-decreasing one; the lower
fold at J = 7.8465708, the period doubling at J = 7.8495611 and the upper fold at J = 7.9220085; all 71 periodic orbits
(first points to 2e-13, all inside their h-sets); and the threshold counts at N = 10^2 to 10^5, exactly. The covering
relations N_i => N_j for all four pairs held on about 400,000 sampled returns, including corners, eta endpoints,
zeta = +-1, the edge strips and the right edge of N_B, with no firing, no tangency, no discontinuity, the smallest exit
margin 12.9 and the image at least 0.168 inside the eta bounds, and the verdict did not change between rtol 1e-8 and
1e-13 or with Radau. I could not refute them. Two statements should be corrected: G&O's p1 is accurate to about 8
digits (8.6e-9 from the fixed point), not 14; and the third multipliers of A and B (and the third Lyapunov exponents in
`rates.json`) are float64 roundoff, the Liouville values being 3.2e-37 and 9.1e-44 (exponents -5.30 and -5.57 per ms).
The multipliers of C are determined only to about 0.2 per cent (unstable) and 10 per cent (weak) in float64. All of
this is numerical evidence, not a proof.

## Files

`hhk.py` (model, GBS integrator, return map, batch map, fates, Radau route), `hsets.py` (chart), `fixed_points.py`,
`liouville.py`, `c_multipliers.py`, `continuation.py` (+ `cont_analyze.py`), `upper_fold.py`, `covering.py`,
`faces_random.py`, `firing_margin.py`, `radau_spot.py`, `periodic.py`, `threshold.py`, `threshold_refine.py`, and the
JSON output of each. `continuation.json` is the run from A through the lower fold to J = 7.8518, `continuation2.json`
the restart to J = 7.8647, `upper_fold.json` the natural continuation to the upper fold.
