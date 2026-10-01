# Cardiac cycle certificates (independent pipeline)

Status: work in progress, drafted in this repository under the owner's standing decision of 2026-09-26 (AGENTS.md).
Nothing here is reviewed by anyone outside the project. No claim in this folder is a theorem until its
`results/*.json` record says `"verified": true` and the run is reproducible from the commands below.

## What this is

An independent re-implementation, in a separate code base, of the computer-assisted proofs recorded in
`docs/CARDIAC-HANDOFF-2026-09-30.md` (the other pipeline lives on the owner's machine), extended to:

1. the fixed 18-state cell at G_Ks = 0.0275 (re-certification);
2. a G_Ks interval toward the Hopf point (owner's request, "rec 2");
3. rotating waves in rings of N = 8, 16, 32, 64 cells (coupling c = N^2 D, D = 1/64000 per ms);

and, separately, scoping of a full action-potential reentry proof (`ap-reentry/`, rec 3).

## Model

`fun_eval` of `bifurcation analysis/TP06_18d_endo_bif.m` in A. H. Erhardt's MIT-licensed repository
`andreerhardt/cardiac-dynamics-of-a-human-ventricular-tissue-model-with-focus-on-early-afterdepolarizations`, commit
`dc78f86fd218418e029ec43d945bcd0fc54b9f1e`, file SHA-256
`a50f6c08b4360dd257cce389a39ae72fda51e3642641bf5b8e5fced6c2225670` (checked on 2026-10-01). It is the ten
Tusscher-Panfilov 2006 endocardial cell with K_i held at 138.3 mM, the Heaviside switch at V = -40 mV in the h and j
rates replaced by u = 1/(1+exp(-5(V+40))), and Erhardt's reduced-repolarization parameters (G_Kr = 0.0153,
G_CaL = 0.000199). Erhardt, Front. Phys. 13 (2025) 1569121, reports for this 18-dimensional model a supercritical
Hopf bifurcation at G_Ks = 0.027907858929580 with stable bifurcating cycles; the cycle certified here is consistent
with that branch (identification by numerics, not proved).

* `model/tp06_18d.py`: line-by-line reference translation (floats, numpy or mpmath).
* `model/tp06_capd.hpp`: the CAPD vector field. Two deliberate, exact rewrites, recorded so a reviewer can check them:
  1. every non-integer decimal enters as an interval enclosing that exact decimal (`model/setup.hpp`), so the proofs
     are about the model as written, not its double rounding;
  2. the source's `(1-u)` is computed as `1/(1+exp(5(V+40)))`, the same function: near V = 0, u is within 1e-80 of 1
     and `1-u` loses all precision (the interval version carries a spurious width of about 1e-16).
* Integration variables are z = x / sigma with sigma a power of two per variable (`model/scales.txt`); scaling by a
  power of two is exact in binary floating point and only changes conditioning.
* `numerics/compare_rhs.py` checks the CAPD field against the Python reference at 40 random states (agreement to
  6e-13 relative in double; every interval enclosure contains a 50-digit mpmath value).
* `numerics/hopf_and_orbit.py` reproduces Erhardt's Hopf point to 5e-7 relative (0.0279078439 against
  0.0279078589) and frequency to 3e-7 relative with an ordinary finite-difference Jacobian.

## Method (`proofs/verify.cpp`)

Section S0 = {V_0 = s}, s the double nearest 0.2 mV, crossed upward. For N = 1 the section map g is the first
return map; for a ring, P runs from S0 to the first upward crossing of {V_{N-1} = s} and g(x)_j = P(x)_{j-1}, so a
fixed point of g is a solution with x_j(t) = phi(t + j T/N), a rotating wave of period N times the section time.

In coordinates x = xhat + A(0, y) proposed by `proofs/frame.py` (eigenvectors for the slow multipliers, an orthonormal
Schur basis for the fast ones), with a block norm ||y|| = max_b ||y_b||_2 / rho_b, the program encloses G(0) (centre,
128-bit MPFR intervals) and DG over the whole box (C1 Lohner method, double intervals) and checks

* q = max_b sum_c ||M_bc|| rho_c / rho_b < 1 (M encloses DG over the box), and
* ||G(0)_b|| / rho_b + (row sum of block b) < 1 for every block b.

Then G maps the ball into itself and is a q-contraction there (mean value inequality on a convex set), so g has a
unique fixed point in the ball, every nontrivial Floquet multiplier has modulus at most q, and the orbit is locally
orbitally asymptotically stable. The period is enclosed by the section time over the box (times N for a ring).

Domain: every logarithm in the model has a quotient argument whose denominator would contain zero before the argument
could become nonpositive, and the V = 15 mV point is a division by exp(z) - 1. An enclosure leaving the domain
therefore produces an unbounded interval and the run fails; it cannot pass silently.

Trust boundary: CAPD 6.1.0 (commit `03dc5628203334b214bb7d9fd63788a175521005`, built here with filib and MPFR),
the compiler (g++ 13.3, `-frounding-math`), the processor's directed rounding, and the programs in this folder. The
untrusted helpers (`orbit_newton.cpp`, `frame.py`) only propose a centre, a frame and radii.

## Status (2026-10-01)

* Model translation: checked (see above).
* Fixed cell at G_Ks = 0.0275: candidate located (section time 53.585519339 ms, largest nontrivial multiplier
  0.997477, consistent with the other pipeline's certificate [53.58551856, 53.58552012] ms and bound 0.999);
  rigorous verification in progress.
* Everything else: not started.
