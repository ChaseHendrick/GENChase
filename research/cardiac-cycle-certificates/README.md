# Cardiac cycle certificates (independent pipeline)

Status: work in progress, drafted in this repository under the owner's standing decision of 2026-09-26 (AGENTS.md).
A claim counts as a theorem here only in one of two cases:
* a CAPD record in `results/*.json` says `"verified": true`;
* a Fourier-route record is listed in `results/fourier-review-status.json` as having passed this project's
  adversarial review.

In both cases the run must be reproducible from the commands below. What each review checked is in `reviews/`.

## Current continuation checkpoint, 2026-10-02

The versioned paper **cardiac-rings 1.0.0** has been published as a Zenodo preprint,
[doi:10.5281/zenodo.23101322](https://doi.org/10.5281/zenodo.23101322). Its manuscript and publication quality
record are in `papers/cardiac-rings/`; the older computation summaries below retain their historical ranges,
timings and evidence. They are not a current acceptance record for the proposed 1.1.0 extension.

The branch and uniform-stability fixes have passed separate source-admission checks, as recorded in
`reviews/theoremC-uniform-fixcheck-2026-10-02.md`. The fresh Hopf fixes are recorded in
`reviews/hopf-bridge-fixcheck-2026-10-02.md`. Complete numerical and manuscript acceptance remains pending.
The new conductance-branch target is 57 groups and 712 pieces on [0.027499735464, 0.02778996093]. Its new,
source-bound reproof log is `fourier/data/branch/run_K12_final.jsonl`; final uniform units belong in
`stability_uniform_K12_final.jsonl`. The Hopf target requires a current Theorem A cover, all 68 fresh amplitude
certificates, all 67 amplitude gluings, identification at zero amplitude and gluing to the complete final branch.

The fresh Theorem A calculation has now passed separate exact-record review: 286 left intervals, one central
interval and 229 right intervals cover the whole target window with the required signs and eigenvalue
separation. Its current-source record is `fourier/data/hopf/theoremA_final.json`, with SHA-256
`8101ac680cd3856653c00bd76a0d5230e29b6b732fc16c2cf4d07b6c55f4b797`; the scoped acceptance receipt is
`reviews/review-theoremA-final-receipt-2026-10-02.json`. This does not admit the complete amplitude branch,
conductance branch, bridge or uniform-stability theorem. The six-runner branch reproof and its strict merge
are described in `reviews/parallel-branch-reproof-2026-10-02.md`.

The fresh six-runner branch calculation completed on 2026-10-02: all 57 groups, 712 current-source pieces and
711 gluings passed its complete merge checks. The downloaded log has SHA-256
`cd3fb0811f7bc67aa20a0298088d58a9768b158b720a3cea0c8e35c6a87b20e8`. This completed computation is distinct
from the stopped 128-piece local batch and from the pending uniform-stability and full Hopf-bridge calculations.
See `docs/HANDOFF-2026-10-02-cardiac-rings-1.1.0-codex.md` for the resumed checkpoint and remaining work.

Separate exact-record review has admitted this final branch for existence, local uniqueness, continuity and
minimal period, as registered in `results/fourier-review-status.json`. Its admission explicitly excludes
inherited point stability, uniform stability, the full Hopf amplitude branch and bridge, and the 1.1.0 release.
The original Linux summary and local partial log are preserved; the new canonical summary has SHA-256
`0ac338b9b09ea91775c180d35b7c95e075dc1956aa28e4a311f2623f388e17e3`.

The pilot's historical Linux and fresh Mac proofs have different last-bit bounds. Platform differences in
proposed numerical inverses are a possible cause, not an established diagnosis. These inverses are untrusted
inputs. Fresh records must satisfy the exact current ball inequalities; historical numerical
equality is a diagnostic, not a substitute for those inequalities. Old logs remain unchanged. A partial final
log never establishes the complete theorem. Use the bounded rerun commands in the two fixes reports instead of
the older exploration/resume commands below. The manuscript must not claim uniform stability across the entire
Hopf bridge; isolated-point and qualitative small-amplitude stability have narrower scopes.

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
* **Trust boundary (Fourier route).** Arb and FLINT through python-flint 0.9.0 (the wheel's SHA-256 is pinned and
  checked by `fourier/test_arbmodel.py`), CPython, the programs in `fourier/` and `model/`, and the written lemmas
  (`fourier/LEMMAS-stability.md` and the docstrings of `fourier_eval.py` and `existence.py`). numpy and LAPACK only
  propose centres, eigenvectors and weights, and every bound that uses them is checked in Arb.

## Status (2026-10-01)

* Model translation: checked (see above).
* **Fixed cell at G_Ks = 0.0275: verified** on the patched CAPD build (`results/cell-gks0.0275.json`, 732 s). A
  unique fixed point of the first return map in the certified ball; period in [53.5855190480, 53.5855196307] ms
  (exact bounds in the record), inside the other pipeline's [53.58551856, 53.58552012]; all 17 nontrivial Floquet
  multipliers of modulus at most 0.998642; locally orbitally asymptotically stable. The unpatched run gave the same
  bounds.
  `fourier/link_cell.py` (exact rationals, 2026-10-01) checks that the section point of the Fourier N = 1 orbit lies in
  this certified ball, so the CAPD and Fourier cell certificates enclose the same orbit (assuming the two translations
  of the model define the same function).
* **Rings, Fourier route (Stage E plus Stage S): proved for N = 1, 8, 16, 32, 64, subject to the trust base below.** Each stage had an in-project
  adversarial review, and every finding was fixed (`reviews/fourier-stage1-review-2026-10-01.md`,
  `reviews/stability-lemmas-review-2026-10-01.md`, `reviews/stageE-existence-review-2026-10-01.md`,
  `reviews/stageS-stability-review-2026-10-01.md`). A second reading of the fixes
  (`reviews/fix-second-reading-2026-10-01.md`) found nothing unsound. The outcome, **passed in-project adversarial
  review**, is recorded in `results/fourier-review-status.json`, outside the hashed records: the records keep the
  status the programs wrote, and the Stage S records hash the Stage E records. `fourier/check_records.py` rechecks
  every stored hash. What was and was not checked is stated in the review files.
  - Existence (`results/fourier-existence-N*.json`):
    - each N has a unique rotating 1-wave within about 1.6e-28 (scaled l^1_nu) of the centre;
    - the period is enclosed in an interval narrower than 2e-25 ms: 53.585519339361169209918980 (N = 1), 53.587970976819449674150820 (8),
      53.588069103590169235937300 (16), 53.588094130318032506551540 (32) and 53.588100418317577541042130 (64), each
      the record's outward-rounded decimal lower end (23 decimals, a trailing zero added);
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
* **G_Ks interval (rec 2), Fourier route: computed; awaiting adversarial review** (`fourier/branch.py`, record
  `results/fourier-branch-gks.json`, logs in `fourier/data/branch/`). Nobody has yet given it the second reading that
  Stage E and Stage S had.
  - Theorem, as computed. Take the single cell (N = 1) and any G_Ks in [0.027499735464, 0.027619866374]. Then there is
    a real periodic orbit z(t) = phi*(omega* t), with phi* 2 pi periodic and analytic on |Im theta| < 1/4, the phase
    fixed by Im a_{1,V} = 0. It is the only zero of F(.; G_Ks) in the uniqueness ball of each piece containing G_Ks.
    The norm is that of C x (l^1_nu)^18 with nu = e^{1/4} and the piece's dyadic weights. The minimal period lies in
    the piece's T enclosure, from [53.58455, 53.58649] ms on the first piece to [53.30480, 53.30740] ms on the last.
    G_Ks -> (omega*, phi*) is continuous, Lipschitz on each piece. The interval is covered by 232 pieces, 5.2e-7 to
    6.6e-7 wide, in 17 groups. Consecutive pieces overlap by a tenth of a piece and are glued by ball inclusion
    (Theorem B3), so the orbits form one connected branch. The bounds hold for every G_Ks of a piece, not only for
    sampled values: Theorem B1 uses the mean value theorem in G_Ks, and Lemma B2 gives Z2 through Hessian enclosures.
    On every piece Z1 <= 0.106, Z2 is 490 to 526, the contraction factor at the uniqueness radius is at most 0.914,
    and the existence radius is 3.8e-4 to 5.3e-4 in the weighted norm. The piece containing 0.0275 encloses Stage E's
    N = 1 period.
  - Stability is pointwise only. Stage S certifies the orbit at G_Ks = 0.0275, 0.02755 and 0.0276, with
    delta = 4.0e-5 per ms, so every nontrivial multiplier has modulus at most 0.99786. At each of these three values
    a ball-inclusion check in Arb shows that the stable orbit is the branch orbit. Nothing is certified at the other
    G_Ks of the range. The uniform attempt (Stage S fed with a piece's existence radius) fails as documented in
    `branch.py` section 6 (theta_T about 1e13). The record also holds point proofs at 0.02765 to 0.0279, beyond the
    branch. These are existence and stability at those values only: the program does not prove that those orbits
    continue the branch.
  - Reach toward Erhardt's Hopf point 0.027907858929580: the branch covers 29 per cent of the way from 0.0275 and
    stops 2.88e-4 short. The run stopped because a container restart killed the builder during group 17, after that
    group's centres were written and before any of its pieces were. There are no failed, split or bridged pieces in
    the logs, so the method did not fail. The pieces must shrink toward the Hopf point (branch.py section 8b; the
    float-predicted admissible half-width is 5.3e-6 at 0.0275 and 3.2e-8 at 0.0279), and nothing is claimed at the
    Hopf point itself.
  - Cost: 144 to 238 s of wall time per group of 12 or 16 pieces on 3 worker processes, about 33 s per piece; 7,675 s
    of piece time in all.
  - Checks made at finalization (2026-10-01):
    - a separate script (validate.py, outside the repository) re-derived every piece's inequalities and all 231
      gluings from the stored exact numbers; it reuses branch.py's centre parser, `_dstr` and digest, so it is not
      fully independent code;
    - the last piece of every group was re-proved from its stored centre and reproduced the logged Y0 and Z1 bit for
      bit (with a cover rebuilt around that one centre). The rec 2 review (`reviews/rec2-branch-review-2026-10-02.md`)
      rebuilt the groups' Hessian covers from the groups' centres, reproduced each cover's digest, and then reproduced
      Y0, Z1, Z2, r_existence and r_uniqueness bit for bit on four pieces (G0P0, G0P11, G8P9, G16P15); the acceptance
      test now does the same for the piece containing 0.0275;
    - `fourier/test_branch.py` passes, including the overlap with Stage E N = 1 at 0.0275 and the negative controls.
  - Resume (appends to the logs; re-validates them and glues the first new piece to the last logged one in Arb):
    `cd fourier && PYTHONPATH=<python-flint 0.9.0> nohup nice -n 10 timeout 3600 python3 branch.py --run --K 12
    --g-stop 0.02790 --budget 3300 --workers 3`, then `python3 branch.py --collect` to rewrite the record.
* **Hopf bridge (rec 2, from the end of the G_Ks branch to the Hopf point), Fourier route: historical computation;
  source fixes reviewed, complete final numerical acceptance pending; no outside review** (the reading,
  `reviews/hopf-bridge-review-2026-10-02.md`, is an in-project reading by an AI agent session with no UNSOUND finding;
  the final fixes and separate source check are in `reviews/hopf-bridge-fixes-2026-10-02.md` and
  `reviews/hopf-bridge-fixcheck-2026-10-02.md`; `fourier/hopf.py`,
  proofs in `fourier/LEMMAS-hopf.md`, tests `fourier/test_hopf.py`, record `results/fourier-hopf.json`, logs in
  `fourier/data/hopf/`).
  - Theorem A, the Hopf point (computer-assisted). The window W = [0.02789, 0.02792] is covered by 516 adjacent
    intervals with exact end points. On each, a contraction on a polydisc gives the unique equilibrium for every G_Ks
    of the interval, and Gershgorin discs of the Jacobian (enclosed by the mean value form in G_Ks) separate one simple
    pair lambda, conj lambda from 16 eigenvalues with real part at most -4.6926852e-5. Re lambda > 0 on the 286
    intervals left of G_H = [0.0279078440027596034781, 0.0279078440029596034781] and < 0 on the 229 right of it; on
    G_H, d Re lambda / dG_Ks lies in [-5.5769472, -5.5769465], so there is exactly one Hopf point g_H, with
    omega_H in [0.119341401778, 0.119341401788] per ms. The first Lyapunov coefficient (Kuznetsov's formula, second
    and third derivatives by Taylor series in Arb, tested on systems with known values) lies in
    [-22.4878803, -22.4878761] (physical units, <q, q> = 1); omega_H l1 is in [-2.6837352, -2.6837346], against
    Erhardt's MATCONT value -2.6838. Erhardt's g_H = 0.027907858929580 lies 1.49e-8 above ours. With the cited
    Andronov-Hopf theorem (Kuznetsov) the bifurcation is supercritical: just below g_H there is a unique small cycle near
    the equilibrium, orbitally asymptotically stable, and just above none. That neighbourhood is not quantified.
  - Theorem B, the blown-up branch (computer-assisted). The orbit is written as c + eps w(omega t). Here eps is the
    amplitude of the first harmonic of V, fixed by w_{V,+-1} = 1/2: in the scaled variable V / 2^-2 mV the first
    Fourier coefficient is eps/2, so in V itself the harmonic has amplitude eps/4 mV. The unknowns are omega, G_Ks, c
    and w. For every eps in [0, 0.12854] (68 pieces, glued by ball inclusion) the blown-up equations have a zero that
    is unique in the piece's ball, real and continuous in eps. For eps > 0 it is a periodic orbit of the cell at
    G_Ks = g*(eps), with minimal period in [52.6486, 52.9414] ms. At eps = 0 it is the Hopf point of Theorem A, shown
    in Arb by one polydisc that contains the eps = 0 zero and every Theorem A polydisc near g_H. G_Ks is an unknown
    of the problem: each piece encloses g*(eps), and g*(0.12854) lies in [0.0277783015906886, 0.0277783239122673].
    Numerically, though not as a bound, g_H - g*(eps) is about 7.9e-3 eps^2 (7.84e-3 to 7.93e-3 over the 68 pieces),
    the square-root law. Monotonicity of g*
    in eps is not certified. On every piece Z1 <= 0.251 and the contraction factor is at most 0.974; the smallest
    gluing slack is 3.0e-10.
  - Theorem C, glued to the G_Ks branch (computer-assisted). A K = 32 point proof at G_Ks = 0.02778 (with Stage S)
    serves both sides. It is the bridge orbit at eps_s in [0.12769007505990053945, 0.12769007505990053946]: the ball
    inclusion holds with 7.3e-8 against a radius of 1.19e-5. It is also the G_Ks-branch orbit of piece G53P6: 7.0e-5
    against 1.22e-3. The branch side was checked on a validated snapshot of the branch logs (676 pieces reaching
    0.02778134123, every gluing re-derived). The intended final conclusion is an orbit for every G_Ks in
    [0.027499735464, g_H), forming a continuous curve from the Stage E orbit to the Hopf point. This conclusion
    requires the complete current-source reruns and rederived identifications listed in the checkpoint above;
    the historical snapshot alone does not establish final acceptance.
  - Stability is proved only in two forms. (a) For small amplitude, qualitatively, from the cited theorem; no explicit
    range. (b) At 12 isolated values of G_Ks on the curve: 0.0275, 0.02755, 0.0276, 0.02765, 0.0277, 0.02775, 0.02778,
    0.0278, 0.02785, 0.02787, 0.02788 and 0.0279. At each, Stage S bounds every nontrivial Floquet multiplier by
    0.9979 (delta about 4.0e-5 per ms). Each is identified with the curve by ball inclusion. Stability is NOT proved
    uniformly along the bridge: the multiplier near 1 tends to 1 as eps -> 0, and no uniform bound that resolves it is
    attempted (LEMMAS-hopf.md, Part S).
  - Cost: Theorem A 223 s (rerun of 2026-10-02 with the fixed program); the 68 pieces 6,597 s, 58 to 145 s each on
    one core; the point proof at 0.02778 203 s; the gluing checks 14 s.
  - Run (each step resumable, logs append-only): `cd fourier && nohup nice -n 10 timeout 3000 python3 hopf.py
    --theorem-a`; `nohup nice -n 10 timeout 3600 python3 hopf.py --run --K 12 --M 64 --g-stop <g> --budget 3300`;
    `python3 hopf.py --gks-points 0.02778`; `python3 hopf.py --bridge`; re-proof of every logged eps piece with the
    current program (resumable, appends to `data/hopf/reprove.jsonl`): `nohup nice -n 10 timeout 3600 python3 hopf.py
    --reprove-all --workers 3 --budget 3300`; `python3 hopf.py --collect` (reports under `pieces_reproved` which pieces
    have a matching re-proof by the current program text); tests: `nice -n 10 timeout 2400 python3 test_hopf.py`
    (modes in its header: `--fast`, full, `--rerun-theorem-a`).
* **Every N >= 8 and the cable, existence (Stage E for every N), Fourier route: computed; awaiting adversarial review**
  (`fourier/alln.py`, `fourier/test_alln.py`, record `results/fourier-existence-alln.json`, logs in
  `fourier/data/alln/`). Nobody has yet given it a second reading.
  - Theorem, as computed. Put eps = 1/N^2 and let the coupling act on Fourier mode m by
    d_m(eps) = 4 pi^2 D m^2 sinc(pi m sqrt(eps))^2 (entire in eps; the N-ring value at eps = 1/N^2, D (2 pi m)^2 at
    eps = 0). For every eps in [0, 1/64] there is a real analytic profile phi*(.; eps) with omega*(eps) > 0, phase
    phi*_V(0) = s, unique in each piece's ball (X = C x (l^1_nu)^18, nu = e^{1/4}), depending continuously on eps.
    Consequences: for every integer N >= 8 the N-cell ring has the rotating 1-wave z_j(t) = phi*(omega* t + 2 pi j/N),
    of minimal period T(1/N^2), not synchronous; at eps = 0, u(x, t) = phi*(omega* t + 2 pi x; 0) is a travelling
    wave of the cable u_t = D u_xx e_V + f(u) on the unit ring (one wave per ring, classical solution), and the ring
    waves converge to it in l^1_nu as N -> infinity. Stability is not claimed.
  - Cover: 73 pieces of width 1/4096 overlapping by 1/8, all glued by ball inclusion; Z1 0.152 to 0.199, Z2 1306 to
    1373, Y0 6.9e-7 to 7.3e-7, existence radius 8.1e-7 to 9.1e-7, uniqueness radius at least 4.66e-4, contraction at
    most 0.978. T enclosures are 1.1e-5 to 1.2e-5 ms wide: from [53.5879664001, 53.5879775655] ms on the piece
    containing 1/64 to [53.5880952982, 53.5881076369] ms on the cable piece [0, 1/4096].
  - The tail resolvents are bounded uniformly in d >= 0 (alln.py Lemma T), which covers d_m ~ m^2 at eps = 0; the
    eps dependence of the finite part goes through the mean value theorem with a rigorous series for d'_m.
  - Identification: for N = 8, 16, 32, 64 the per-N Stage E existence ball lies in the uniqueness ball of the piece
    containing 1/N^2, so the per-N waves are members of this family; each Stage E T record lies inside the piece's
    T enclosure.
  - Controls (`fourier/data/alln/controls.jsonl`, rerun in `test_alln.py`):
    - omitting the eps-derivative terms leaves Y0 = 3.4e-11 on [0, 1/4096], below the float residual 7.25e-7 at
      its endpoints (4.6e-13 at its centre);
    - the widened pieces [0, 1/16], [0, 1/8], [0, 1/4] and [0, 1] fail (Z1 = 1.27 to 16.1);
    - [0, 1/1024], [0, 1/256] and even [0, 1/64] as a single piece close (Z1 = 0.30 for [0, 1/64]); these
      single-piece proofs are not part of the record's cover.
  - Cost: 1,568 s of wall time on 2 worker processes (3,129 s of piece time, 28 to 63 s per piece).
  - Run: `cd fourier && PYTHONPATH=<python-flint 0.9.0> nohup nice -n 10 timeout 3600 python3 alln.py --run --width
    1/4096 --overlap 1/8 --workers 2`, then `python3 alln.py --controls` and `python3 alln.py --collect`. The run is
    resumable from `fourier/data/alln/pieces.jsonl` (one line per certified piece).
