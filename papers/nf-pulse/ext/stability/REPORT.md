# Stability of the fast pulse: report

Work in `ext/stability/`. Nothing else in the repository was changed. This extends the existence proof
in `code/`.

## 1. Outcome

**Spectral stability proved (computer-assisted) for the class of pulses P; nonlinear stability not proved.**

- **Spectral stability.** For every pulse of the class, the spectrum of the linearization in Re lambda >= -1/20 is
  exactly {0}, and 0 is algebraically simple. The essential spectrum lies in Re lambda <= -0.1127... This is
  spectral stability with a gap of at least 1/20 (Theorem S, Section 5). Certified by computer: E (the essential
  spectrum), L (no eigenvalue with Re lambda >= -1/20 outside a box R), P (the pulse class and its enclosure), W
  (the winding number of the Evans function on the boundary of R is 1) and Z (lambda = 0 is a simple zero, with
  D'(0) in [0.2308, 0.2693], by a Cauchy integral independent of W). The algebra of Part 3 is checked in SymPy.
  Written, standard and not machine checked: the analysis of Part 3 and the Evans-function facts listed in
  Section 6.
- **Nonlinear stability.** Not proved here. The step from spectral to nonlinear stability rests on a published
  theorem (Sandstede 2007), whose full text I could not obtain, so its hypotheses are unchecked. Section 7 lists
  what remains.

**History (2026-09-26).** When this folder was first merged, the winding run had not finished, and this section
said spectral stability was not proved. The session finished the six winding pieces and combined them later that day
(Section 4.W); a local rerun of four of the pieces, on pulse records that differ only in a timing field, gave the
same intervals. The adversarial check in Section 8 predates W and did not rerun it.

## 2. Setting and notation

Model, parameters and coordinates are those of `README.md`:

    u_t = -u - v + w*S(u),   v_t = eps u   (gamma = 0),   w(x) = e^{-|x|}/2,   S(u) = 1/(1 + e^{-beta(u - theta)}),

with beta = 20, theta = 1/4 and eps = 1/10. A pulse is written u = U(xi), v = V(xi) with xi = x + c t and kappa = 1/c.
The linearization in the co-moving frame acts on X = L^2(R) x L^2(R), with domain H^1 x H^1:

    L(p, q) = ( -c p' - p - q + w*(S'(U) p),  -c q' + eps p ).

With r = w*(S'(U) p) (the unique bounded solution of r - r'' = S'(U) p) and z = r', the eigenvalue problem
L(p, q) = lambda (p, q) is the linear ODE phi' = A(xi, lambda) phi for phi = (p, q, r, z):

    A = [[-kappa (lambda + 1), -kappa, kappa, 0], [eps kappa, -kappa lambda, 0, 0], [0, 0, 0, 1], [-S'(U(xi)), 0, 1, 0]].

Here S'(U) = beta Y (1 - Y) on the invariant surface Y = S(U) of the base programs. At lambda = 0 this is the
variational equation of the wave ODE, and (U', V', Q', P') is a solution.

**Class of pulses covered.** Let c_lo = 1.1027477097341592491478677357466217332550533837818208789272 and
c_hi = c_lo + 10^-58. The class P consists of the pulses with speed c in [c_lo, c_hi] whose profile leaves rest on the
branch of the one-dimensional unstable manifold where U increases, and whose orbit lies in the isolating block B of
`code/block.py` for all xi >= 110. Here xi = 0 is the manifold point P(1/4), as in `code/prove_pulse.py`.

P is nonempty. This is the Wazewski argument of the base proof, rerun on the narrow bracket (step P below): there is
c in (c_lo, c_hi) whose orbit stays in B from xi = 110 on. I did not prove that this pulse is the one of the base
theorem (speed in (c1, c1 + 10^-25), in B from xi = 53), because uniqueness is not known. The narrow bracket lies
inside the base bracket.

## 3. Literature: what reduces nonlinear to spectral stability

The quotes below are copied from the copies I read. Page numbers are those of the copies (preprint pages).

- **Sandstede, B., "Evans functions and nonlinear stability of traveling waves in neuronal network models",
  Int. J. Bifurcation Chaos 17(8) (2007) 2693-2704, doi:10.1142/S0218127407018695.**
  - **Not read.** The publisher, ResearchGate and the author's site all refused access (HTTP 403 or a bot
    challenge). Semantic Scholar and OpenAlex list no open copy.
  - The abstract, verbatim from the Crossref record: "Modeling networks of synaptically coupled neurons often leads
    to systems of integro-differential equations. Particularly interesting solutions in this context are traveling
    waves. We prove here that spectral stability of traveling waves implies their nonlinear stability in
    appropriate function spaces, and compare several recent Evans-function constructions that are useful tools when
    analyzing spectral stability."
  - I cannot quote its hypotheses, its function spaces or its theorem, so none of them is checked here.
  - Secondary sources disagree on its scope. Faye (2013) applies it to a smooth sigmoid with an exponential kernel
    (quoted next), but on p. 2 of the same author copy lists it ([35]) among the studies of the neural field "when the
    firing rate is assumed to be a Heaviside function". Dyson, arXiv:1810.05142v1, p. 29, says that Sandstede
    "proved that spectral stability implies nonlinear stability for neural field models with single Heaviside firing
    rates" (checked in the arXiv PDF on 2026-09-27).
- **Habib, S. and Veltz, R., "Theoretical / numerical study of modulated traveling waves in inhibition stabilized
  networks", arXiv:2412.03613v1 (4 Dec 2024).** Found in the third prior-article pass (2026-09-27). Theorem 1 (printed
  p. 7): if ker A = span{d v-bar} and the other eigenvalues lie in {Re < w}, w < 0, the traveling wave is
  "exponentially and asymptotically orbitally stable in L2". Its model (eqs. (1)-(2), printed p. 3) is a
  two-population Wilson-Cowan field du/dt = -L0 u + L0 S(W u - theta), with S of class C^{r+1}, r >= 2, increasing with
  bounded derivatives (Hypothesis 1), and kernels in W^{1,1} (Hypothesis 3). The firing rate acts on the convolution,
  not inside it, and there is no linear recovery variable, so the theorem does not apply to the Pinto-Ermentrout field
  as stated; it is the nearest proved principle of linearized stability for neural-field traveling waves we found. It
  calls the principle "conjectured in [Fay18]" and does not cite Sandstede (2007).
  - Reading it is the first item of Section 7.
- **Faye, G., "Existence and stability of traveling pulses in a neural field equation with synaptic depression",
  SIAM J. Appl. Dyn. Syst. 12 (2013) 2032-2067.** Read in the author's preprint (math.univ-toulouse.fr/~gfaye), p. 17:
  - "Theorem 4.1. Suppose that (λ, κ, b, β) ∈ Π. Then there exists ϵ2 > 0 such that for all 0 < ϵ < ϵ2, the
    traveling pulse solution from Theorem 3.1 is spectrally stable with a simple zero eigenvalue at λ = 0 due to
    translational invariance of the pulse."
  - It continues: "We note that the linear stability of the traveling pulse solution follows directly from a spectral
    mapping theorem [31] for the strongly continuous semigroup generated by the linear operator in (4.1). In
    addition, we can use standard center-manifold theory of Bates & Jones [1] and the results for neural field
    equations of Sandstede [35] to show that the traveling pulse is nonlinearly stable as well. Indeed, the zero
    eigenvalue found in Theorem 4.1 is isolated."
  - [35] is Sandstede 2007. Faye states no separate nonlinear stability theorem and restates none of its hypotheses.
  - On multiplicity (p. 2): "the only zero in the right-half plane of the Evans function associated to the
    linearization of the traveling pulse is zero, and its geometric and algebraic multiplicity is one."
- **Coombes, S. and Owen, M. R., "Evans functions for integral neural field equations with Heaviside firing rate
  function", SIAM J. Appl. Dyn. Syst. 3 (2004) 574-600.** Read in the author's preprint.
  - The stability notion is assumed, not proved: "We shall say that a traveling wave is linearly stable if
    max{Re(λ) : λ ∈σ(L), λ ≠ 0} ≤ −K, (2.6) for some K > 0, and λ = 0 is a simple eigenvalue of L. Furthermore, we
    shall take it that linear stability implies nonlinear stability."
  - For the Heaviside front: "λ is an eigenvalue of the operator L if and only if E(λ) = 0. Moreover, the algebraic
    multiplicity of an eigenvalue is exactly equal to the order of the zero of the Evans function."
- **Pinto, D. J., Jackson, R. K. and Wayne, C. E., "Existence and stability of traveling pulses in a continuous
  neuronal network", SIAM J. Appl. Dyn. Syst. 4 (2005) 954-984.** **Not read** (paywalled, no open copy found). It
  treats a Heaviside rate according to secondary sources. Nothing is quoted from it.
- **Rigorous Evans-function precedents.**
  - Barker and Zumbrun, "Numerical proof of stability of viscous shock profiles", Math. Models Methods Appl. Sci. 26
    (2016), arXiv:1601.00837, p. 2: "Provided the relative error in the Evans approximation is strictly less than one
    every- where along the contour, we may then conclude by Rouche’s Theorem that the winding number of the
    numerically computed Evans function has winding number equal to that of the exact Evans function".
  - Arioli and Koch, "Existence and stability of traveling pulse solutions of the FitzHugh-Nagumo equation",
    Nonlinear Analysis 113 (2015), author copy p. 3: "we determine the number of eigenvalues in R by estimating the
    Evans function along the boundary of R and then applying the argument principle."
  - The present computation follows the same plan. It encloses the Evans function itself, instead of an
    approximation plus Rouché. I found no computer-assisted Evans computation for a neural field pulse, but that
    search was not exhaustive.

Secondary sources are listed only where named. No PDF or copyrighted text is committed.

## 4. The results

### E. Essential spectrum (rigorous: closed form plus ball arithmetic, `ess_spectrum.py`)

At rest the symbol of L gives det = mu^2 + a(k) mu + eps, with mu = lambda + i c k and a(k) = 1 - s/(1 + k^2), where
s = S'(0) = 0.13296...

For every real k both roots are real and at most r(a) = (-a + sqrt(a^2 - 4 eps))/2:

- the discriminant is positive, because (1 - s)^2 - 4 eps = 0.3517... > 0;
- r(a) is increasing in a;
- a < 1.

So every root is < -delta0 with **delta0 = (1 - sqrt(3/5))/2 = 0.11270166...**, and delta0 is the supremum
(approached as |k| -> infinity).

For Re lambda > -delta0 the rest operator minus lambda is invertible, because |mu - root| >= Re lambda + delta0 for
all k. L minus the rest operator is (p, q) -> (w*((S'(U) - s) p), 0). This is Hilbert-Schmidt, because S'(U) - s
decays exponentially and 1/(1 + k^2) is square integrable. So L - lambda is Fredholm of index 0 for
Re lambda > -delta0, and the spectrum there consists of isolated eigenvalues of finite multiplicity (analytic
Fredholm theorem).

**Statement E.** The essential spectrum of L lies in Re lambda <= -delta0 = -0.1127...

### L. No large eigenvalues (rigorous: written argument plus ball arithmetic, `large_lambda.py`)

This is a Birman-Schwinger bound. If L(p, q) = lambda (p, q) with Re lambda >= -1/20, then g = S'(U) p satisfies
g = S'(U) F^-1[m w^ g^], where m(mu) = mu/(mu^2 + mu + eps) and w^(k) = 1/(1 + k^2). Since 0 < S' <= beta/4 = 5,
lambda is not an eigenvalue when sup_k |m(lambda + i c k)| w^(k) < 1/5. The program docstring gives three explicit
bounds on this supremum, and the program checks them in ball arithmetic. The worst product is 0.98624 < 1.

**Statement L.** Every eigenvalue with Re lambda >= -1/20 lies in the box
R = [-1/20, 9/2] x [-38/5, 38/5].

### P. The pulse on the whole line (rigorous: `thin_runs.sh`, `pulse_enclosure.py`)

- **Narrow bracket.** The base program `code/prove_pulse.py`, unchanged, in its custom mode at 384 bits (tolerance
  10^-95, T_enter = 110), proves two facts. The orbit at c_lo enters the cone K- inside B (at xi = 127.31). The orbit
  at c_hi enters K+ (at xi = 127.70). Both stay in B from xi = 110 on.
- **Interval run.** `pulse_enclosure.py` integrates the box of all orbits with c in [c_lo, c_hi] with the base
  integrator `code/lohner.py`. Every such orbit is in the interior of B at xi = 110 (y enclosure in
  `data/pulse_enclosure.json`). With the two runs above, the Wazewski argument of the base proof shows P is
  nonempty.
- **Recorded enclosures.** The same run records node boxes and a priori step enclosures from xi = -16 to xi = 120.
  For xi in [-16, 0] they come from the validated unstable manifold P(e^{lambda_u xi}/4) of `code/manifold.py`. At
  xi = 120 the enclosure has radius <= 2.2e-8 and |y'| <= eta0 = 1.4672e-6.
- **Tails.** For xi <= -16, |U| <= C_U e^{lambda_u xi}/4 with C_U = 0.14687 and e^{lambda_u (-16)}/4 <= 4.64e-8.
  For xi >= 120 a pulse of the class stays in B, and there L = y1^2 - |y'|^2 <= 0: L increases in B (the cone
  condition) and tends to 0. Then |y'| decreases at rate m >= 0.12458, which is the entrance margin of the smaller
  block |U| <= 2 K_U eta0, certified with `code/block.py`'s own check. Also |U| <= K_U |y'|.

### D. The Evans function (rigorous enclosures: `evans_rig.py`)

- **Definition.** D(lambda) = psi^+(xi)^T phi^-(xi) for Re lambda > -delta0.
  - phi^- ~ e^{nu xi} v as xi -> -infinity.
  - psi^+ ~ e^{-nu xi} w as xi -> +infinity, where psi' = -A^T psi.
  - nu is the unique eigenvalue of A_inf(lambda) with Re nu > 0. The others have Re < 0: the count is constant off
    the essential spectrum.
  - v and w are closed-form right and left eigenvectors with v_1 = 1 and w^T v = 1.
- **Properties.** D is analytic, and D(lambda) = 0 exactly when lambda is an eigenvalue. D(0) = 0 (translation).
- **Rescaling.** The program encloses Dt(lambda) = D(lambda) (wt^T v), where wt = (1, -k/(nu + k lambda),
  k nu/(nu^2 - 1), k/(nu^2 - 1)) is the unnormalized left eigenvector. The factor wt^T v is analytic and nonzero on
  the closed box R:
  - nu is the only root with Re nu > 0 for Re lambda > -delta0, because the number of such roots is constant off the
    essential-spectrum curves. So nu is simple, and left and right eigenvectors of a simple eigenvalue are not
    orthogonal.
  - The denominators vanish only when nu + k lambda = 0 or nu^2 = 1. At a root of the characteristic polynomial both
    force lambda = -c, far outside R.

  So Dt has exactly the zeros of D in R, with the same orders, and the same winding number on the boundary of R. The
  winding number below is that of Dt.
- **Enclosure.** For a complex square Lambda with centre lc, the program encloses Dt(lambda) in
  f(lambda)(Dc + D1 d + D2 d^2), d = lambda - lc, for every lambda in Lambda and every pulse of the class, using the
  following pieces.
  - **Eigenstructure at rest.** Four disjoint root enclosures by a complex Krawczyk test (the square is split when
    needed). This gives Re nu > 0 > Re nu_j, v, w, V and V^-1.
  - **Left tail (xi <= -16).** phi^- e^{-nu xi} = v + om with |om_i| <= K_i4 G_L (1 + K14 G_L e^{K14 G_L}). Here
    K_ij = sum_l |V_il||V^-1_lj| bounds the entries of e^{(A_inf - nu)t} for t >= 0, and
    G_L = int |S'(U) - s| <= 1.85e-8. The bound comes from Gronwall on the Volterra equation; only the (4,1) entry
    of A - A_inf is nonzero.
  - **Right tail (xi >= 120).** The same construction for psi^+ with G_R <= 1.777e-4. This uses K_U = 5.75 (so
    |U| <= 8.5e-6 there) and m = 0.124618.
  - **Middle ([-16, 120]).** An interval Taylor method of order 32 for phi' = (A - nu_c) phi with nu_c = nu(lc).
    - Each step's transition matrix Phi and its first two lambda-derivatives are enclosed. The enclosure is the Taylor
      polynomial on the recorded node box, plus a Lagrange remainder bounded by majorant recursions on the recorded a
      priori enclosure. The a priori bounds are |Phi| <= e^{Nt}, |Phi_lambda| <= t N_l e^{Nt} and
      |Phi_lambda,lambda| <= t^2 N_l^2 e^{Nt}.
    - Steps are subdivided where the remainder exceeds 10^-24.
    - The vector is carried as a second-order Taylor model in d = lambda - lc, pbar + C1 d + C2 d^2 + B r, with B
      unitary (Lohner). Only third-order terms are wrapped.
  - **Scalar factor.** f(lambda) = exp(-(nu(lambda) - nu_c)(136)) is enclosed from nu on the square.

### W. Winding number (rigorous: `winding.py`)

- **Contour.** The boundary of R is split into six pieces: right upper, top, left upper, left lower, bottom, right
  lower. Each piece is covered by segments of length at most 1/50, 1976 segments in all.
- **Per segment.** Dt is enclosed on the segment's square. With thin enclosures at its two ends, it must lie in an
  open half plane through 0; that then gives the argument change along the segment exactly (up to the enclosure
  width). No segment had to be split.
- **Argument changes** (radians), from `arg_change_exact` in `data/winding_*.json`, as intervals rounded outward
  (an earlier version of this table gave midpoint +/- radius rounded to nearest, which cut off the ends of two of the
  intervals in the last digit, and lower bounds of abs(Dt) rounded up):

| Piece | Segments | Argument change | Lower bound for abs(Dt) on the piece | Time (4 cores) |
|---|---|---|---|---|
| right upper, Re = 9/2, Im 0 to 38/5 | 380 | [1.7868, 1.9821] | 403.27 | 1835 s |
| top, Im = 38/5 | 228 | [0.9257, 1.0267] | 820.28 | 1102 s |
| left upper, Re = -1/20, Im 38/5 to 0 | 380 | [-0.0953, 0.6571] | 0.2756 | 1258 s |
| left lower | 380 | [-0.0953, 0.6571] | 0.2756 | 969 s |
| bottom | 228 | [0.9257, 1.0267] | 820.28 | 1057 s |
| right lower | 380 | [1.7868, 1.9821] | 403.27 | 1412 s |

- **Total.** The argument change divided by 2 pi lies in **[0.8331, 1.1669]**, so **the winding number is 1**
  (`data/winding.json`).
- **Symmetry as a check.** The lower pieces were computed independently of the upper ones. They agree with them to
  about 10^-10, as the symmetry Dt(conj lambda) = conj Dt(lambda) requires.
- **Provenance.** All six pieces carry the same sha256 of `evans_rig.py`, `winding.py` and `data/pulse_records.pkl`
  (recorded in `data/winding.json`), and `combine` verifies them against the present files. The base modules that
  `evans_rig.py` imports (`code/nfcore.py`, `code/certify_rest.py`, `code/block.py`) are not fingerprinted; since the
  pieces were computed (commit 5af378b), `nfcore.py` has not changed, and `certify_rest.py` and `block.py` have changed
  only in comments (2026-09-27).
- **Controls (added 2026-09-27, `winding_controls.py`).** The same code (`winding.main`, unchanged) on two small
  squares, each run as two open pieces with one worker: on [-1/25, 1/25]^2, around the zero lambda = 0, the total
  argument change divided by 2 pi lies in [0.98, 1.02], winding number 1 (8 + 8 segments, 258 s and 242 s); on
  [1/10, 3/10] x [-1/10, 1/10], which contains no zero, it lies in [-0.0204, 0.0204], winding number 0, so the false
  statement that Dt vanishes there is refused (20 + 20 segments, 513 s and 625 s). The pieces
  (`data/winding_ctrl*.json`, with the same sha256 records) are not in any cover of `COVERS`, so `combine` never uses
  them; `winding_controls.py check` decides the two winding numbers from the stored pieces and writes
  `data/winding_controls.json`. Recomputed from a copy of the folder the same day (one worker, 157, 151, 356 and
  349 s): every piece is identical to the stored one apart from its timing field, and every segment file byte for
  byte.
- **Statement W.** Dt has exactly one zero in R counted with order. Since Dt(0) = 0 (translation), that zero is
  lambda = 0, and Dt'(0) is nonzero.

### Numerical (not rigorous: `pulse_hp.py`, `evans_num.py`, `spectrum_num.py`)

The double-precision Evans function uses a high-precision pulse at the 60-digit speed.

The double-precision Evans function (`data/spectrum_num.json`) is normalized with w^T v = 1.

- **Winding number on the boundary of R: 1.** 629 points; min |D| = 0.01187, at lambda = -1/20.
- **Winding number on the wider box** [-0.11, 9/2] x [-38/5, 38/5]: also 1. So, numerically, 0 is the only
  eigenvalue with Re lambda > -0.11 in that box.
- **At lambda = 0:** D(0) = 1.8e-13 and D'(0) = 0.25005.
- **Matching point.** D does not depend on the matching point: at lambda = 0.5 + i, the values at xi = 18.5 and at
  xi = 40 agree to 10^-9.
- **Near the imaginary axis.** For Re lambda in {-0.1, -0.05, 0} and 0.05 < Im lambda <= 8, the smallest |D| is
  about 0.02, at Im lambda = 0.075, close to the zero at the origin. There is no sign of another eigenvalue.
- **Checker's discretization.** The independent Fourier-spectral discretization (Section 8) agrees: 0 is the only
  eigenvalue with Re lambda > -0.1127.

## 5. Exact statements

**Theorem S (computer-assisted; conditional on the base existence proof's programs and
the arb library).** Let (U, V) be any pulse of the class P of Section 2, and L its linearization on
L^2(R) x L^2(R). Then:

1. The essential spectrum of L lies in {Re lambda <= -delta0}, with delta0 = (1 - sqrt(3/5))/2 = 0.1127...
2. sigma(L) ∩ {Re lambda >= -1/20} = {0}.
3. lambda = 0 is an eigenvalue of L with geometric and algebraic multiplicity one.

P is nonempty: it contains a pulse with speed in (c_lo, c_lo + 10^-58).

**Proof outline and status of each step.**

- **Part 1** is Statement E.
- **Part 2.**
  - By Statement L, every eigenvalue with Re lambda >= -1/20 lies in the box R.
  - On R, eigenvalues are exactly the zeros of the Evans function D. This holds because R lies to the right of the
    essential spectrum: the ODE has exponential dichotomies on both half lines, and an L^2 eigenfunction corresponds
    to a solution that decays at both ends.
  - Dt = D (wt^T v) has the same zeros in R.
  - Statement W: the winding number of Dt on the boundary of R is 1, so D has exactly one zero in R counted with
    order.
  - D(0) = 0 by translation invariance: (U', V', Q', P') solves the ODE at lambda = 0 and decays at both ends.
  - Hence 0 is the only eigenvalue in R, and D'(0) is nonzero.
- **Part 3.** The independent check flagged it as needed (Section 8, finding 1). Its two computational inputs are
  certified (`simple_zero.py`), its algebra is checked exactly (`part3_symbolic.py`, SymPy), and the analysis that
  joins them is written, standard and not machine checked. Each step says which.
  - **Geometric multiplicity 1.** *Certified:* at lambda = 0 the rest matrix A_inf(0) has exactly one eigenvalue with
    positive real part, nu = 0.968761160579..., and three with negative real part, in four disjoint Krawczyk balls.
    *Written:* since A(xi, 0) tends to A_inf(0) exponentially as xi -> -infinity, the solutions that decay at
    -infinity form the one-dimensional space spanned by phi^-.
  - **No Jordan chain.** *Exact (SymPy):* a generalized eigenvector P1 with L P1 = P0 = (U', V') is, in ODE form, a
    solution of phi1' = A(xi, 0) phi1 + (dA/dlambda) phi0, where dA/dlambda = diag(-kappa, -kappa, 0, 0) and
    phi0 = (U', V', Q', P') solves the variational equation. *Written:* phi1 decays at both ends.
  - *Written:* since D(0) = 0, psi0 = psi^+(., 0) is bounded on all of R. It is orthogonal to phi^- and to the stable
    space at +infinity, and it decays at both ends.
  - *Exact (SymPy):* (psi0^T phi1)' = psi0^T (dA/dlambda) phi0. *Written:* the boundary terms vanish, so integrating
    over R gives the integral of psi0^T (dA/dlambda) phi0 = 0.
  - *Exact (SymPy):* the two halves of the lambda-derivative of D(lambda) = psi^+(xi, lambda)^T phi^-(xi, lambda) at 0
    have derivatives in xi equal to +psi0^T (dA/dlambda) phi0 and -psi0^T (dA/dlambda) phi0. *Written:* they vanish at
    -infinity and +infinity respectively, so D'(0) equals that same integral (for any normalisation of psi^+ and
    phi^-, in particular for Dt).
  - *Certified, independently of W:* Dt'(0) lies in [-16.3819, -14.0497] + [-1.16101, 1.16101]i (as `simple_zero.py` prints it, rounded outward), so it is nonzero, and
    D'(0) = Dt'(0) / (wt^T v)(0) lies in [0.230893, 0.269221] + [-0.0190800, 0.0190800]i (normalization w^T v = 1;
    (wt^T v)(0) = -60.8493463...). This is Cauchy's formula on the circle |lambda| = 1/25, split into 128 arcs, each
    covered by an `evans_rig.py` enclosure; the mean-value integral over the same arcs encloses Dt(0) in a ball about
    0 of radius 0.021, as it must. So no Jordan chain exists, and 0 is a simple zero of D without using W. Since
    2026-09-27 `run_all.sh` checks that mean-value enclosure as a negative control (Z3): the false statement Dt(0) != 0
    must be refused, that is, the enclosure must contain 0. It is computed from the same enclosures as Dt'(0), so it
    would expose a bias in them but does not test the Cauchy argument independently.
  - Numerically D'(0) = 0.25005, inside the certified interval; the independent check found the same.

## 6. What is rigorous and what is numerical

| Item | Status |
|---|---|
| Essential spectrum bound (Statement E) | Rigorous: ball arithmetic plus the written argument in `ess_spectrum.py` |
| No eigenvalues outside R (Statement L) | Rigorous: ball arithmetic plus the written argument in `large_lambda.py` |
| Narrow speed bracket, class P nonempty | Rigorous: base `prove_pulse.py` (unchanged) plus the interval run in `pulse_enclosure.py`, and the base proof's Wazewski argument |
| Pulse enclosures on [-16, 120] and the tail constants | Rigorous: `pulse_enclosure.py`, the base `manifold.py`, `lohner.py` and `block.py` |
| Enclosures of Dt on squares and points | Rigorous: `evans_rig.py` |
| Winding number of Dt on the boundary of R | Rigorous: `winding.py` |
| Rest eigenvalues at lambda = 0: one with Re > 0, three with Re < 0 | Rigorous: `simple_zero.py` (and inside every `evans_rig.py` enclosure) |
| D'(0) nonzero, in [0.2308, 0.2693]: 0 is a simple zero of D, independently of W | Rigorous: `simple_zero.py`, a Cauchy integral on 128 arcs of the circle \|lambda\| = 1/25 |
| The algebra of Part 3: the ODE forms of the eigenvalue and Jordan-chain equations, dA/dlambda, and the two integration identities | Exact: `part3_symbolic.py` (SymPy, with two negative controls) |
| The analysis of Part 3: decaying solutions and L^2 eigenfunctions, the limits at +-infinity, and the decay of psi0 when D(0) = 0 | Written argument (Section 5), standard, not machine checked |
| Relation between eigenvalues and zeros of D; analyticity of D | Standard Evans-function facts for the ODE form, used as known and not re-proved here |
| Controls of the winding step: winding number 1 around 0, and 0 on a square without zeros | Rigorous: `winding_controls.py` (the code of `winding.py`, unchanged) |
| High-precision pulse table, double-precision Evans function, numerical winding numbers, D'(0) = 0.25005, and the checker's Fourier discretization (its program is not in this folder) | Numerical only |

All rigorous computations rest on python-flint (Arb) ball arithmetic, and on the base programs of
`code`.

## 7. What remains for nonlinear stability

Nonlinear (orbital) stability with asymptotic phase is not proved. What remains:

1. **Obtain and read Sandstede (2007).** Check that its setting covers this problem:
   - the model u_t = -u - v + w*S(u), v_t = eps u (gamma = 0 in particular);
   - a smooth S and the exponential kernel;
   - its function space, and whether L^2 spectral information is what it assumes.

   If the hypotheses match, Theorem S would give nonlinear orbital stability for the pulses of the class P. Until
   then this step is only plausible. Faye (2013) uses the result for a smooth sigmoid but also lists it among
   Heaviside studies, and Dyson calls it a result for single Heaviside firing rates (Section 3); Habib and Veltz (2024)
   prove such a principle for a different form of neural field.
2. **Or write a self-contained proof.** The following plan was not carried out.
   - L = -c d/dxi + (bounded operator) generates a C0 group on X = L^2 x L^2.
   - L - L_inf = K is compact. K e^{sL} is norm continuous in s, because K is compact and the group is strongly
     continuous. So e^{tL} - e^{tL_inf} is compact, and the essential growth bound of e^{tL} equals that of the
     Fourier multiplier group e^{tL_inf}, which is -delta0.
   - With Theorem S, e^{tL} restricted to the spectral complement of the translation mode then decays like
     e^{-t/20} (up to a constant).
   - The nonlinearity N(u) = w*(S(U + u) - S(U) - S'(U) u) satisfies ||N(u)||_2 <= ||w||_2 (beta^2/12) ||u||_2^2 and
     is smooth from L^2 to L^2, because w maps L^1 to L^2.
   - A standard orbital-stability argument (modulation of the phase plus Gronwall) should then give nonlinear
     stability in L^2 x L^2.
   - Each of these steps needs a written, checked proof.
3. **Close the gap between the classes.** Relate the class P (speed in a bracket of width 10^-58, in the block from
   xi = 110) to the pulse of the base theorem (speed in (c1, c1 + 10^-25), in the block from xi = 53). This needs
   either uniqueness of the pulse in the base bracket, or a stability computation over the whole base bracket. The
   latter needs a sharper right-tail treatment, because the base enclosure is too wide beyond xi = 53.
4. **Review.** Get an independent review of the base existence proof and of these programs, as `notes/QUALITY.md`
   requires before any claim leaves draft status.

## 8. Independent check

An independent subagent reviewed the work adversarially. It worked in its own copy and wrote its own code, and did
not modify the repository.

**Verdict: "sound, with caveats"**, verbatim: "I found no error that breaks a claim. There are two gaps that each need
a written argument, and the winding number (W) is not established yet."

**What it verified by computation.**

- **Reruns.** It reran `ess_spectrum.py`, `large_lambda.py`, `thin_runs.sh` and `pulse_enclosure.py`. The JSON
  outputs are byte-identical, the logs match apart from timings, and the negative controls fail as intended.
- **Large-lambda bound.** A dense sampling of 5 sup_k |m| w^ outside R, up to Re 60 and |Im| 200, gives at most 0.905,
  below the certified 0.986. There is no violation, and the bound is somewhat loose.
- **Its own pulse.** 90 digits, order 36: U_max = 0.7597 and lambda_u = 0.968761160579.
- **Its own Evans function** (DOP853, normalization v_1 = wt_1 = 1) lies inside every rigorous thin enclosure it
  compared:
  - lambda = 0.5: -13.62853 in [-13.6 +/- 0.039];
  - lambda = -0.05: 0.69101 in [0.69 +/- 0.0027];
  - lambda = i, 2 + 7.6i, -0.05 + 7.6i, 4.5 and 4.5 + 7.6i: inside;
  - lambda = 0: 0 in [+/- 1.35e-3].
- **Its own numerical winding number** on the boundary of R is 1.0.
- **A Fourier-spectral discretization of L** (N = 2048 and 3072 on periodic domains of length 250 and 300) finds
  lambda = 0 as the only eigenvalue with Re lambda > -0.1127. The next values are the essential-spectrum edge at
  -0.11273. A pair at -0.1168 +/- 0.014i on the coarser grid disappears on refinement.
- **Repository.** Nothing outside `ext/stability` was modified.

**Findings and what was done.**

1. **Gap: multiplicity.** The winding number counts orders of zeros, not algebraic multiplicities. *Fixed:* the
   written argument that D'(0) nonzero excludes a Jordan chain is in Section 5.
2. **Gap: W incomplete, and pieces from two code versions.** When checked, only one of the six pieces had finished,
   and it ran an earlier (mathematically equivalent) version of `evans_rig.py`. *Fixed:*
   - every piece now records the sha256 of `evans_rig.py`, `winding.py` and the pulse records;
   - `combine` refuses pieces that disagree with each other or with the present files;
   - all six pieces were rerun with the final code.
3. **Minor: the invertibility argument in E** needed the growth of the inverse symbol. *Fixed:* one sentence added to
   `ess_spectrum.py`.
4. **Minor: block matrix T.** `evans_rig.py` rebuilt T with a fresh numpy eigendecomposition instead of using the
   stored one (they agreed on this machine). *Fixed:* the stored T and T^-1 are used.
5. **Cosmetic: stale text** (Dc + Dl, "second-order", G_R <= 1.5e-4, which D is enclosed). *Fixed* in this report and
   the docstrings. G_R <= 1.777e-4.
6. **Minor: state why the rescaling Dt = D (wt^T v) preserves the winding number.** *Fixed:* Section 4.D.
7. **Cosmetic: combine used float rounding** before deciding the integer. *Fixed:* the decision uses the arb interval
   directly.
8. **Checked on reading and correct:** the derivations in L, P, D and W, as listed in the check. This includes the
   majorant remainder recursions, the Taylor-model update, the Gronwall tails, the Krawczyk centred forms, the
   sub-node boxes and the half-plane argument bookkeeping.

The checker spot-checked the base modules (`nfcore.taylor`, `manifold.validate`) and did not rerun the winding
pieces. It did not review the base existence proof, which has its own in-project checks (`../../review/lead/VERIFY.md`).

## 9. Commands

From `ext/stability/`, with the base requirements installed
(`python3 -m pip install -r ../../code/requirements.txt`, plus scipy for the numerical scripts):

```
sh run_all.sh           # everything; the six winding pieces take most of the time (16 to 31 minutes each on 4 cores)
sh run_all.sh quick     # everything except the winding pieces and the pieces of the controls, then `winding.py combine`
                        # and `winding_controls.py check` on the stored pieces
```

The individual steps are:

```
python3 ess_spectrum.py                                   # E (rigorous)
python3 large_lambda.py                                   # L (rigorous)
sh thin_runs.sh                                           # P: base prove_pulse.py on c_lo and c_hi, T_B = 110 (1 minute)
python3 pulse_enclosure.py 1.1027477097341592491478677357466217332550533837818208789272 \
        1.1027477097341592491478677357466217332550533837818208789273 110 120      # P: records (15 s)
python3 simple_zero.py 128 4                              # Z: rest eigenvalues at 0 and D'(0) nonzero (rigorous, 4 minutes)
python3 part3_symbolic.py                                 # the algebra of Part 3 (exact, SymPy, seconds)
for p in left_up right_up top left_down bottom right_down; do python3 winding.py $p 4; done
python3 winding.py combine                                # W (rigorous)
python3 winding_controls.py run 4                         # W1, W2: controls of the winding step (a few minutes each piece)
python3 winding_controls.py check                         # W1, W2 from the stored pieces
python3 pulse_hp.py 120 && python3 evans_num.py && python3 spectrum_num.py 4       # numerical only
```

- `data/pulse_records.pkl` is tracked: it holds the records the winding pieces and the Cauchy integral were computed
  with, and `run_all.sh` recomputes it into `work/rerun/` and checks that it is reproduced exactly (apart from a timing
  field). `data/pulse_table.npz` is regenerated by the commands above and is not tracked.
- `data/run_all.txt` is the output of `sh run_all.sh quick` of 2026-09-27, rerun after the controls Z3, W1 and W2 were
  added (from a copy of the folder at commit 395bba3, one process at a time, with twelve `NF_*` variables set in the
  environment, which the script clears); every certificate it rewrote is identical to the stored one apart from its
  timing field. `notes/QUALITY.md` of the paper records the run.
- The base program's certificates for the narrow bracket are written to `data/proof_custom_*.json`.
- The speed c* to about 60 digits came from the base program, run as
  `python3 ../../code/shoot_hp.py 360 115 1.1027477097341592491478677 1.1027477097341592491478678` (18 minutes,
  numerical). It only chose c_lo and c_hi; the rigorous bracket rests on the thin runs.
