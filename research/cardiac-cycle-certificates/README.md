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
`a50f6c08b4360dd257cce389a39ae72fda51e3642641bf5b8e5fced6c2225670` (checked on 2026-10-01). It is Erhardt's
18-state modification of the ten Tusscher-Panfilov 2006 endocardial cell, and should be called that, not "the TP06
cell". It differs from the published TP06 cell in four ways:

1. K_i is a parameter held at 138.3 mM (19 states become 18);
2. the Heaviside switch at V = -40 mV in the h and j rates is replaced by u = 1/(1+exp(-5(V+40)));
3. Erhardt's reduced-repolarization parameters: G_Kr = 0.0153 (0.1 times the endocardial value), G_CaL = 0.000199
   (5 times), with G_Ks the continuation parameter (0.0275 here);
4. Erhardt's capacitance convention: par_Cm = 1 divides dV/dt and also multiplies the Ca_i, Ca_ss and Na_i fluxes
   (lines 145, 147, 148 of the source), so Cm/(V_c F) is 5.405 times its value in the original-author and CellML
   convention (Cm = 185 pF). Every concentration flux is therefore 5.405 times the published TP06 value.

Erhardt, Front. Phys. 13 (2025) 1569121, reports for this 18-dimensional model a supercritical Hopf bifurcation at
G_Ks = 0.027907858929580 with stable bifurcating cycles; the cycle certified here is consistent with that branch
(identification by numerics, not proved).

* `model/tp06_18d.py`: line-by-line reference translation (floats, numpy or mpmath).
* `model/tp06_capd.hpp`: the CAPD vector field. Three deliberate, exact rewrites, recorded so a reviewer can check them:
  1. every non-integer decimal enters as an interval enclosing that exact decimal (`model/setup.hpp`), so the proofs
     are about the model as written, not its double rounding;
  2. the source's `(1-u)` is computed as `1/(1+exp(5(V+40)))`, the same function: near V = 0, u is within 1e-80 of 1
     and `1-u` loses all precision (the interval version carries a spurious width of about 1e-16);
  3. each logarithm log(a) is computed as 2 log(sqrt(a)), the same function for a > 0, so that a nonpositive argument
     stops the run in both arithmetics (see Domain below).
* Integration variables are z = x / sigma with sigma a power of two per variable (`model/scales.txt`); scaling by a
  power of two is exact in binary floating point and only changes conditioning.
* `numerics/compare_rhs.py` compares the CAPD field with the Python reference at 40 random states: the double values
  agree to 6e-13 relative, and each interval enclosure contains an mpmath evaluation (50 digits) of the Python
  reference at the same point, within a relative tolerance of 1e-13 that absorbs the Python file's own float
  literals. It is a translation check, not a proof that the enclosures are tight.
* `numerics/hopf_and_orbit.py` reproduces Erhardt's Hopf point to 5e-7 relative (0.0279078439 against
  0.0279078589) and frequency to 3e-7 relative with an ordinary finite-difference Jacobian.

## Method (`proofs/verify.cpp`)

Section S0 = {V_0 = s}, s the double nearest 0.2 mV, crossed upward. For N = 1 the section map g is the first
return map; for a ring, P runs from S0 to the first upward crossing of {V_{N-1} = s} and g(x)_j = P(x)_{j-1}.

In coordinates x = xhat + A(0, y) proposed by `proofs/frame.py` (eigenvectors of the section-map derivative, and an
orthonormal Schur basis for eigenvalues below 1e-6), with a block norm ||y|| = max_b ||y_b||_2 / rho_b, the program
encloses G(0) (centre, 128-bit MPFR intervals) and DG over the whole box (C1 Lohner method, double intervals) and
checks

* q = max_b sum_c ||M_bc|| rho_c / rho_b < 1 (M encloses DG over the box; exact spectral bound on diagonal 2x2
  blocks, Frobenius bounds elsewhere), and
* ||G(0)_b|| / rho_b + (row sum of block b) < 1 for every block b,
* every bound entering the decision is finite, and the centre's section time lies inside the box's section time
  (both runs resolve the same crossing).

Then G maps the ball into itself and is a q-contraction there (mean value inequality on a convex set), so g has a
unique fixed point in the ball and every eigenvalue of Dg there has modulus at most q.

**Single cell.** g is the first return map, so its derivative's eigenvalues are the 17 nontrivial Floquet
multipliers; all have modulus at most q < 1 and the orbit is locally orbitally asymptotically stable. The period is
the section time (the first return time of a periodic orbit through the section is its minimal period).

**Rings.** The ring field is equivariant under the cyclic shift Q, (Qx)_k = x_{k+1}: f(Qx) = Q f(x). A fixed point
x* of g = Q^{-1} P gives phi(tau, x*) = Q x*, hence x_j(t) = x_0(t + j tau) and N tau is a period. Write h = Q^{-1}
phi_tau; then phi_{N tau} = h^N near the orbit (equivariance), the monodromy over N tau is Dh(x*)^N, and on the
section Dg is the quotient of Dh modulo the flow direction. So the nontrivial Floquet multipliers of the
period-N tau orbit are lambda^N for the eigenvalues lambda of Dg(x*), with modulus at most q^N < 1 (the record gives
q^N as `floquet_bound_full_period_upper`). Minimal period and wave number: on [0, tau] the cells' trajectories
cover phi on [0, N tau]; the period gate shows that no cell j <= N-2 crosses s upward on [0, T_hi], so phi has exactly
one upward crossing per N tau, the minimal period is N tau, and the solution is a single rotating wave (a k-wave would
have k crossings). Nonsynchrony: the box guard V_{N-1}(0) < s = V_0(0).

**Domain.** The model's logarithms, square roots and divisions are only defined on part of state space. In the
double runs, CAPD's filib wrapper throws when a divisor contains 0, a log argument is not positive or a sqrt
argument is negative; CAPD's step control retries with smaller steps and rethrows at its minimum step, so the run
fails. An exp overflow (exp(5(V+40)) above V of about 102 mV) terminates the process. CAPD's MpInterval log does not
check its argument (it returns NaN bounds, which later products turn into 0), so every log is computed as
2 log(sqrt(a)) and MpInterval sqrt refuses a negative argument. No run can pass silently outside the domain.

**Trust boundary.** CAPD 6.1.0 (commit `03dc5628203334b214bb7d9fd63788a175521005`, built here with filib and MPFR,
unmodified), the compiler (g++ 13.3, `-frounding-math`), the processor's directed rounding, and the programs in this
folder. The untrusted helpers (`orbit_newton.cpp`, `frame.py`) only propose a centre, a frame and radii; the
certificate driver (`proofs/certify.py`) checks that the frame's parameters are the intended ones and records the
hashes of the inputs and of the verifier binary.

Known CAPD issue, open: in `PoincareMap::crossSectionInOneStep` (PoincareMap_templateMembers.h, lines 260-273) the
crossing-point bound is trimmed with the endpoints of the previous Newton window while monotonicity was checked on
the current one. This is sound when the Newton loop exits by convergence and can drop true values only if it stops
at its 10-iteration cap without converging. A one-line local patch (use the current window's endpoints) is prepared
in `proofs/capd-6.1.0-genchase.patch` but NOT applied; applying it needs the owner's approval because it modifies
the shared CAPD build. Until then every certificate here is conditional on that loop converging, and says so.

## Status (2026-10-01)

* Model translation: checked (see above).
* **Fixed cell at G_Ks = 0.0275: verified** (`results/cell-gks0.0275.json`, 755 s). A unique fixed point of the first
  return map in the certified ball; period in [53.5855190480, 53.5855196307] ms (exact bounds in the record), inside
  the other pipeline's [53.58551856, 53.58552012]; all 17 nontrivial Floquet multipliers of modulus at most
  0.998642; locally orbitally asymptotically stable. Conditional on the open CAPD issue above.
* Rings N = 8 and N = 16: candidates located (periods 53.58797098 and 53.58806910 ms, inside the other pipeline's
  certified intervals); double-interval derivative enclosures measured with Perron roots 0.99996225 (N = 8) and
  0.99997284 (N = 16), below one; the minimal-period gate passes for N = 8; certification runs in progress. A
  128-bit centre uses about 4.7 GB at N = 8 and would need about 19 GB at N = 16 with CAPD's Lohner sets, so N >= 16
  needs a lighter high-precision centre.
* N = 32, 64: CAPD's generic C1 method needs memory proportional to N^2 (about 6 GB at N = 32, 22 GB at N = 64);
  approach under design.
* G_Ks interval (rec 2): not started.
