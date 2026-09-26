# Stability of the fast pulse: report

Work in `papers/nf-pulse/ext/stability/`. Nothing else in the repository was changed. This extends the existence proof
in `papers/nf-pulse/`.

## 1. Outcome

**Partly proved.**

- **Spectral stability.** Not proved yet (see the correction below). The steps of Theorem S that are certified by
  computer are E (the essential spectrum), L (no eigenvalue with Re lambda >= -1/20 outside a box R) and P (the
  pulse class and its enclosure); the winding-number step W, on which Part 2 of the proof rests, was not completed.
- **Nonlinear stability.** Not proved here. The step from spectral to nonlinear stability rests on a published
  theorem (Sandstede 2007), whose full text I could not obtain, so its hypotheses are unchecked. Section 7 lists
  what remains.

**Correction made when this folder was merged (2026-09-26).** The session that wrote this report ended before
`winding.py` finished. No winding certificate is in `data/`, the placeholders for the winding status, its section and
the numerical section were never filled, and the adversarial check below says "the winding number (W) is not
established yet". Theorem S needs W (Part 2 of the proof outline), so spectral stability is **not proved**; the
statements E, L and P are certified, and `run_all.sh` will report W only when a run of `winding.py` completes.

## 2. Setting and notation

Model, parameters and coordinates are those of `papers/nf-pulse/README.md`:

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
    (quoted next). An earlier version of Dyson, arXiv:1810.05142, as reported in a Semantic Scholar citation snippet
    that I did not verify, describes it as for "single Heaviside firing rates".
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

Not completed: see the correction in Section 1.

### Numerical (not rigorous: `pulse_hp.py`, `evans_num.py`, `spectrum_num.py`)

The double-precision Evans function uses a high-precision pulse at the 60-digit speed.

Not written: the session ended before this section was filled.

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
- **Part 3** is a written argument, standard and not machine checked. The independent check flagged it as
  needed (Section 8, finding 1).
  - **Geometric multiplicity 1.** The solutions decaying at -infinity form the one-dimensional space spanned by
    phi^-.
  - **No Jordan chain.** A generalized eigenvector P1 with L P1 = P0 = (U', V') is, in ODE form, a solution decaying
    at both ends of phi1' = A(xi, 0) phi1 + (d A/d lambda) phi0, where phi0 = phi^-(., 0).
  - Since D(0) = 0, psi0 = psi^+(., 0) is bounded on all of R. It is orthogonal to phi^- and to the stable space at
    +infinity, and it decays at both ends.
  - Integrating (psi0^T phi1)' = psi0^T (dA/dlambda) phi0 over R gives the integral of psi0^T (dA/dlambda) phi0 = 0.
  - Differentiating D(lambda) = psi^+(xi, lambda)^T phi^-(xi, lambda) in lambda (the standard computation) gives D'(0)
    equal to that same integral. D'(0) is nonzero, so no Jordan chain exists.
  - Numerically D'(0) = 0.2501 (normalization w^T v = 1); the independent check found the same.

## 6. What is rigorous and what is numerical

| Item | Status |
|---|---|
| Essential spectrum bound (Statement E) | Rigorous: ball arithmetic plus the written argument in `ess_spectrum.py` |
| No eigenvalues outside R (Statement L) | Rigorous: ball arithmetic plus the written argument in `large_lambda.py` |
| Narrow speed bracket, class P nonempty | Rigorous: base `prove_pulse.py` (unchanged) plus the interval run in `pulse_enclosure.py`, and the base proof's Wazewski argument |
| Pulse enclosures on [-16, 120] and the tail constants | Rigorous: `pulse_enclosure.py`, the base `manifold.py`, `lohner.py` and `block.py` |
| Enclosures of Dt on squares and points | Rigorous: `evans_rig.py` |
| Winding number of Dt on the boundary of R | Rigorous: `winding.py` |
| Algebraic simplicity of 0 given D'(0) nonzero | Written argument (Section 5), not machine checked |
| Relation between eigenvalues and zeros of D; analyticity of D | Standard Evans-function facts for the ODE form, used as known and not re-proved here |
| High-precision pulse table, double-precision Evans function, numerical winding numbers, D'(0) = 0.2501, and the checker's Fourier discretization | Numerical only |

All rigorous computations rest on python-flint (Arb) ball arithmetic, and on the base programs of
`papers/nf-pulse/code`.

## 7. What remains for nonlinear stability

Nonlinear (orbital) stability with asymptotic phase is not proved. What remains:

1. **Obtain and read Sandstede (2007).** Check that its setting covers this problem:
   - the model u_t = -u - v + w*S(u), v_t = eps u (gamma = 0 in particular);
   - a smooth S and the exponential kernel;
   - its function space, and whether L^2 spectral information is what it assumes.

   If the hypotheses match, Theorem S would give nonlinear orbital stability for the pulses of the class P. Until
   then this step is only plausible. Faye (2013) uses the result for a smooth sigmoid (quoted in Section 3), while one
   secondary source calls it a Heaviside result.
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
- **Repository.** Nothing outside `papers/nf-pulse/ext/stability` was modified.

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
pieces. It did not review the base existence proof, which remains unreviewed.

## 9. Commands

From `papers/nf-pulse/ext/stability/`, with the base requirements installed
(`python3 -m pip install -r ../../code/requirements.txt`, plus scipy for the numerical scripts):

```
sh run_all.sh           # everything; the six winding pieces take most of the time (about 20 to 50 minutes each on 4 cores)
sh run_all.sh quick     # everything except the winding pieces, then `winding.py combine` on the stored pieces
```

The individual steps are:

```
python3 ess_spectrum.py                                   # E (rigorous)
python3 large_lambda.py                                   # L (rigorous)
sh thin_runs.sh                                           # P: base prove_pulse.py on c_lo and c_hi, T_B = 110 (1 minute)
python3 pulse_enclosure.py 1.1027477097341592491478677357466217332550533837818208789272 \
        1.1027477097341592491478677357466217332550533837818208789273 110 120      # P: records (15 s)
for p in left_up right_up top left_down bottom right_down; do python3 winding.py $p 4; done
python3 winding.py combine                                # W (rigorous)
python3 pulse_hp.py 120 && python3 evans_num.py && python3 spectrum_num.py 4       # numerical only
```

- `data/pulse_records.pkl` and `data/pulse_table.npz` are regenerated by the commands above and are not tracked.
- The base program's certificates for the narrow bracket are written to `data/proof_custom_*.json`.
- The speed c* to about 60 digits came from the base program, run as
  `python3 ../../code/shoot_hp.py 360 115 1.1027477097341592491478677 1.1027477097341592491478678` (18 minutes,
  numerical). It only chose c_lo and c_hi; the rigorous bracket rests on the thin runs.
