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

**Trust boundary (CAPD route).** CAPD 6.1.0 (commit `03dc5628203334b214bb7d9fd63788a175521005`, built here with filib and MPFR,
unmodified), the compiler (g++ 13.3, `-frounding-math`), the processor's directed rounding, and the programs in this
folder. The untrusted helpers (`orbit_newton.cpp`, `frame.py`) only propose a centre, a frame and radii; the
certificate driver (`proofs/certify.py`) checks that the frame's parameters are the intended ones and records the
hashes of the inputs and of the verifier binary.

CAPD patch (applied 2026-10-01 with the owner's approval): in `PoincareMap::crossSectionInOneStep`
(PoincareMap_templateMembers.h, lines 260-266) upstream trims the crossing-point bound with the endpoints of the
previous Newton window while monotonicity was checked on the current one, which is unsound if the Newton loop stops
at its 10-iteration cap without converging. The local build uses the current window's endpoints
(`proofs/capd-6.1.0-genchase.patch`, a header-only change). Certificates record the hash of the patched header;
records made before the patch say "conditional on the CAPD crossing issue" and are superseded by reruns.

## Method 2: space-time Fourier and Hill operator (`fourier/`)

This second method shares no library with the CAPD route. Its trust base is Arb, through python-flint 0.9.0, a pinned
wheel. N enters only as a scalar damping on V in each Fourier mode, so the cost is minutes per N, not gigabytes.

* **Stage E, existence** (`fourier/existence.py`).
  - Write the rotating 1-wave as x_j(t) = phi(omega t + 2 pi j/N). Then
    F_m = i omega m a_m - [f o phi]_m + d_m E a_m = 0, with d_m = 4 c sin^2(pi m/N), plus a phase condition.
  - This is solved by a radii-polynomial (Newton-Kantorovich) argument in C x (l^1_nu)^18.
  - The bound on the nonlinear part comes from rigorous strip covers and DFTs with an aliasing bound, plus an
    analytic tail. The second-derivative bound Z2 is a polydisc Cauchy majorant.
  - Conjugation symmetry together with uniqueness makes the solution real.
* **Stage S, stability** (`fourier/stability.py`, lemmas in `fourier/LEMMAS-stability.md`).
  - The 18N Floquet multipliers are e^{mu T}, with mu in the spectrum of one Hill operator H_0 on a half-open strip
    of height omega N. Algebraic multiplicities match.
  - A Riesz-projection homotopy, with a Schur-complement small-gain test and a tail resolvent in power-of-two
    weighted cell coordinates, certifies two things: H_0 has exactly one eigenvalue (0, algebraically simple) in
    Re mu > -delta per period strip, and the multiplier 1 is simple.
  - Stage E's ball enters through Lemma 4.1.

## Status (2026-10-01)

* Model translation: checked (see above).
* **Fixed cell at G_Ks = 0.0275: verified** on the patched CAPD build (`results/cell-gks0.0275.json`, 732 s). A
  unique fixed point of the first return map in the certified ball; period in [53.5855190480, 53.5855196307] ms
  (exact bounds in the record), inside the other pipeline's [53.58551856, 53.58552012]; all 17 nontrivial Floquet
  multipliers of modulus at most 0.998642; locally orbitally asymptotically stable. The unpatched run gave the same
  bounds.
* **Rings, Fourier route (Stage E plus Stage S): computed for N = 1, 8, 16, 32, 64.** Each stage had an in-project
  adversarial review, and every finding was fixed (`reviews/fourier-stage1-review-2026-10-01.md`,
  `reviews/stability-lemmas-review-2026-10-01.md`, `reviews/stageE-existence-review-2026-10-01.md`,
  `reviews/stageS-stability-review-2026-10-01.md`). A second reading of the fixes is pending; the records say
  "computed; awaiting adversarial review" until it ends. No outside review has taken place.
  - Existence (`results/fourier-existence-N*.json`):
    - each N has a unique rotating 1-wave within about 1.6e-28 (scaled l^1_nu) of the centre;
    - the period is enclosed to about 1e-26 ms: 53.585519339361169209918980 (N = 1), 53.587970976819449674150820 (8),
      53.588069103590169235937300 (16), 53.588094130318032506551540 (32) and 53.588100418317577541042130 (64), each
      the lower end of a 1e-26 interval;
    - the N = 1 period lies inside the CAPD record (`results/cell-gks0.0275.json`), and the N = 1, 8 and 16 periods
      lie inside the other pipeline's certified intervals.
  - Stability (`results/fourier-stability-N*.json`):
    - every nontrivial Floquet multiplier has modulus at most e^{-delta T};
    - delta = 5e-6 per ms for N = 8 to 64, and 4e-5 for N = 1;
    - in moduli, 0.99973210 per period for N = 8 to 64, and 0.99785888 for N = 1, which is consistent with CAPD's
      0.998642;
    - so the orbit is locally exponentially orbitally stable with asymptotic phase.
  - Floating-point leading exponents are -6.32e-6, -8.57e-6, -9.19e-6 and -9.34e-6 per ms for N = 8, 16, 32, 64. At
    N = 8 the certificate closes at delta = 6.32095e-6 and fails at 6.321e-6.
  - Identifying these waves with the branch continued from Erhardt's Hopf point is numerical, not proved.
  - Prior-article search and readings: `notes/prior-article-rings-2026-10-01.md`, `notes/readings-rings-2026-10-01.md`
    and RESEARCH.md.
* Rings, CAPD route: the N = 8 and 16 candidates and Perron roots below 1 are as before. The 128-bit centre is too
  heavy at N >= 8 on this machine. This route would be a second, time-domain proof only.
* G_Ks interval (rec 2): in progress on the Fourier route (`fourier/branch.py`).
