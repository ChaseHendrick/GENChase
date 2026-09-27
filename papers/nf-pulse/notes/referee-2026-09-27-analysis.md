# Referee report: "Travelling Pulses in a Neural Field with a Smooth Firing Rate: Computer-Assisted Existence and Spectral Stability" (papers/nf-pulse/paper/nf-pulse.tex)

**This is an in-project reading by an independent agent (Claude), made on 2026-09-27. It is not an outside review.** I was asked to find errors and did not edit any files. I wrote these findings before opening `papers/nf-pulse/review/` or `papers/nf-pulse/notes/`, and I did not read either.

## Verdict: minor revision

## Summary

Within what I could check, the mathematics holds up. I read every written proof in Sections 2 to 4 line by line:
- the travelling-wave reduction and Green's function lemma;
- the rest state and root count;
- the polynomial embedding and invariance of Y = S(U);
- the parameterization with its tail lemma and resolvent bounds;
- the block lemma (C)/(E) and its convexity step;
- the Ważewski-type shooting proposition;
- the covering-chain argument of Theorem 2;
- the essential spectrum, via the analytic Fredholm theorem;
- the Birman–Schwinger exclusion of large eigenvalues;
- the eigenvalue ODE, Lemma lp, the Evans-function construction and its analyticity;
- the class P;
- the winding and Cauchy-integral steps;
- the algebraic-multiplicity argument.

I found no step that fails, except one misstatement of a published theorem (the unstable manifold theorem). The misstatement is false exactly in the situation of the paper, although the conclusion drawn from it is still true.

I compared the programs behind the stability proof with the text (`evans_rig.py`, `winding.py`, `simple_zero.py`, `pulse_enclosure.py`, `large_lambda.py`, `ess_spectrum.py`, `part3_symbolic.py`), as well as the base `manifold.py`, `block.py`, `prove_pulse.py` and `lohner.py`. They do what the paper says, including:
- the second-order Taylor model in λ;
- the Gronwall majorants for Φ, ∂λΦ and ∂λ²Φ;
- the componentwise complex Lagrange remainders;
- the left and right tail constants;
- the half-plane test on each segment.

Every number I traced from the manuscript into `data/` and `ext/*/data/` matches.

An independent floating-point Evans computation, written by me, reproduces the stored enclosures at contour points, gives D̃'(0) ≈ −15.216 and winding number 1. The remaining problems are:
- quantifier wording in three places;
- an incomplete written proof for Theorem 5 (Faye's model);
- reproducibility claims that go further than the code supports (SHA-256 ties, environment hygiene, the stored ε-range certificates, "one process").

## Must fix

1. **Lemma 3.3 (lem:branch), proof, tex line 362.** The text states the unstable manifold theorem as "the points whose backward orbit tends to the hyperbolic equilibrium x* form, near x*, a C¹ curve tangent to the eigenvector".
   - This is false whenever a homoclinic orbit exists, which is the case the paper constructs. Points of the pulse at large ξ lie near x* on the stable side, and their backward orbits tend to x*.
   - The theorem (Coddington–Levinson) describes the *local* unstable manifold: the points whose backward orbit stays in a small neighbourhood N and tends to x*.
   - The conclusion still holds. A solution with x(ξ) → x* as ξ → −∞ lies in N for all ξ ≤ ξ0, so x(ξ0) is on W^u_loc = {Φ_κ(t) : |t| small}.
   - Restate the theorem in its local form and add that sentence.

## Should fix

1. **Quantifiers about "the pulse" of Theorems 1 and 2** (tex lines 297, 763, 781, 194, 239).
   - Theorem 1 is existential. A pulse of P satisfies every conclusion of Theorem 1: its speed is in (c_lo, c_hi) ⊂ (c1, c2), it leaves on the branch where U increases, and sup U > 0.7596, because the interval run's bound holds for every κ in the bracket.
   - So the sentence "We do not know whether the pulse of Theorem 1 belongs to P" is, read literally, answered by Lemma 4.x(a). What is open is whether *every* pulse with speed in (c1, c2) on that branch lies in P, or equivalently whether the κ* produced in the proof of Theorem 1 does. Please rephrase in the Limitations and in Open problem 2 as well.
   - Likewise, Theorem 2(b), "At ε = 1/10 the speed lies in [1.1027337393, 1.1027617086]", and Corollary 1, "the fast pulse of Theorem 2, with speed in …", should read "a pulse of (a) can be chosen with speed in …". The ε = 1/10 statement must not read as if it applied to all pulses, since the slow pulse exists there too.
2. **Theorem 5 (Faye's model) is not proved in full** (lines 500–511), although Section 3 says the modifications are given.
   - The manifold step names only the Neumann-series resolvent bound. The analogue of Lemma 3.2 is not written: the three nonlinear terms, their Z(r) (`ext/faye-model/code/manifold.py` uses c1 = b² + εκβ, c2 and c3), and the tail induction.
   - The analogues of Lemma 2.3 (surface), Lemma 3.3 (branch) and Proposition 2.2 (reduction) appear only as "as in".
   - The code looks right: I checked the Neumann bound and the Z(r) terms. But the written proof falls short of the paper's own bar, "every theorem proved in full".
   - I verified symbolically that the characteristic polynomial stated for Faye's model is correct.
3. **Theorem 2 depends on 385 stored certificates that no check script re-executes** (lines 494–496, Section 7).
   - `run_checks.sh` recomputes one interval, [0.0998, 0.1002]. `table.py` only reads JSON records of runs that passed.
   - The 386 records were made with the base modules as of commit 3e2000a (I confirmed the prefixes 971321a3…, 3d4edb7e…, 01828a6e… and 0926620c…) and with two versions of `chain.py`: 286 PASS files record 328042d0… and 101 record e0aa72d0…, the 286 including the fourth probe.
   - The claim that later changes do not alter any checked inequality rests on reading the code. I checked the diff 3e2000a..HEAD: asserts became `require`, helpers were added, the `block.setup` orientation changed and the block was re-parameterized. So the claim is plausible.
   - The proof should say plainly that the certificates are logs, not witnesses a reader can check, and that confirming them requires the four-hour sweep. Alternatively, rerun the sweep with the present programs.
4. **The SHA-256 tie is overstated** (line 740).
   - `winding.py combine` and `simple_zero.py` fingerprint only `evans_rig.py`, `winding.py` or `simple_zero.py`, and `pulse_records.pkl`.
   - `evans_rig.py` also imports `code/nfcore.py` (the pulse Taylor recursion, S, S'), `code/certify_rest.py` (C1, C2) and `code/block.py` (the small-block check). None of these is fingerprinted.
   - `certify_rest.py` has been modified in this working tree since the winding pieces were computed. The change is to comments only, so nothing is invalidated, but the sentence "combine refuses them if any of these files has changed" is not accurate.
5. **The environment-variable hygiene paragraph is incomplete** (line 767).
   - Besides `NF_EVANS_*` and `NF_STAB_*`, the stability programs read `NF_PULSE` through `certify_rest.py`. It switches C1 and C2, which `large_lambda.py` uses as c_max and `evans_rig.py` uses for the small block.
   - They also read `NF_DU` and `NF_R_OVER_RHO` through `prove_pulse.py`. These change the block B in `thin_runs.sh` and in `pulse_enclosure.py`, and B is the block in the definition of P.
   - `ext/stability/run_all.sh` clears none of these.

## Minor

- **Line 619, rest eigenstructure.** The row formulas for the *stable* eigenvectors are singular at λ = c ∈ R, where ν_j = −1 = −κλ. The inverse V⁻¹ given by the normalized left eigenvectors also needs distinct eigenvalues. The program refuses such squares (finiteness and disjointness tests, with splitting), and the contour and the circle stay away from λ = c. State this condition in the text.
- **Section 7, lines 727 and 734.** "About 6 min in one process" and "about 20 min in one process" are wrong. `code/run_all.sh` runs the tests and three `prove_pulse` runs in parallel, `thin_runs.sh` runs two, and `simple_zero.py` is called with 4 processes.
- **Line 496.** "All three accepted probes" conflicts with "accepts four of them" at line 494. Three are counted among the 386, and [0.1299, 0.1301] is the fourth.
- **Line 485.** The δ in |ε0| ≤ 1 + δ is never defined.
- **The name "fast pulse" for Theorems 2 and 5** (abstract, line 88) is a numerical identification, not a proved property. At ε = 1/10 and 3/20 it just means the faster of two proved pulses. Qualify it once.
- **Unlabelled proof steps.** The extension of the root count to all (ε, κ) at line 151, which Theorem 2(R) uses, and the application paragraph at line 404 should be labelled ("proved") statements.
- **Slow-pulse proof, line 469.** "With its eigenvector residual" describes a residual ball that contains 0. That proves nothing and is not needed, because v is exact given μ. Say so, or drop it.
- **Block matrix T.** `block.setup()` recomputes T at every run with numpy `eig`. P is defined with the recorded T, and the thin runs rely on recomputing the same T. That is checked only indirectly, by P3 (the records, which include T, are reproduced). Consider loading the recorded T.
- **Line 313.** "t0 e^{μξ} < 1" should read |t0| e^{μξ} < 1.
- **Symbol reuse.** ω (Q − U − V and the Volterra remainder), σ (1/7, Re μ, covering coordinates), T (block matrix, T(λ), T0), r (block half-width, w*(S'(U)p), tail radii, circle radius), K (compact operator, K_ij, K^±) and c1 (Theorems 1 and 4) each carry more than one meaning.
- **Numerical Fourier-spectral check.** It was made by a program that is not in the folder, as the paper itself notes.
- **Page count.** The compiled PDF has 33 pages, not the 27 stated in the task.

## What was checked

- **Proofs.** Every proof in Sections 2–4 and Section 3.4–3.8 was read line by line, including the Ważewski argument and the one-dimensional nested-interval covering argument for Theorem 2.
- **Hand checks.** I rederived the constants of Proposition 4.2 (5M1 = 0.98624; the Md branch gives 0.9105) and of Proposition 4.1 ((1 − s0)² − 4ε = 0.35176, δ0 = 0.1127017).
- **Hypotheses of published results.** For Reed–Simon Theorem VI.14, Ω must be open and connected, T(λ) analytic and compact-valued, and I + T invertible at large real λ: all satisfied. Descartes' rule, Krawczyk uniqueness with rectangular enclosures, Sylvester's criterion, Gershgorin, the argument principle and Cauchy's formula are all used within their hypotheses.
- **Symbolic checks (SymPy).** det(z − A5) = z·p(z), which confirms that the eigenvalues of A5 are 0 and the roots of p. The characteristic polynomial for Faye's model is exact.
- **Code against text.**
  - `manifold.py`: Z(r), K_i, G0.
  - `block.py`: (C) by minors; (E) by Gershgorin plus the Euclidean/Frobenius norm of Ã21.
  - `prove_pulse.py`: path in int B over each step, strict cone test.
  - `lohner.py`: a-priori test, remainder, mean-value form; R stays centred at 0.
  - `evans_rig.py`: the Taylor model; the thin/ball step matrices; the majorant recursions m, q, u with m0 = e^{Nh}, q0 = hNl·e^{Nh}, u0 = h²Nl²·e^{Nh}; tails with K_ij = Σ|V||V⁻¹|; assembly with f(λ).
  - `winding.py`: segment squares, half-plane test, chaining, closure, fingerprint.
  - `simple_zero.py`: arc squares, the e^{−it} ball, convexity.
- **Numbers.** Theorem 1: roots, G0 and ρ, block margins, y at 53, t_K = 58.375/57.75, sup U. Theorems 3 and 4: t_K and sup U. Faye: u0, q0 and bracket digit counts. The ε-range table and the windows at 1/10 and 3/20. The winding pieces and the Cauchy-integral outputs. The SHA-256 prefixes in Section 7 match the files.
- **Literature.** Hastings arXiv:1503.04057v2: the p. 2 quotes, footnote 4 on p. 6, and the parameters λ = 20, κ = 0.22, β = 5, b = 4.5. Habib–Veltz arXiv:2412.03613v1: eqs. (1)–(2) on printed p. 3 with the rate outside the convolution, Theorem 1 on p. 7, "conjectured" on p. 2. Two web searches found no earlier computer-assisted proof of a travelling pulse in a neural field.

## What was not checked

- **Reruns not done.** I did not rerun the base chain, the slow, gain-12, Faye or ε-range chains, the thin runs, `pulse_enclosure.py`, the winding pieces or `simple_zero.py`. They are heavy, and the brief asked for one niced process at a time.
- **Code not read in detail.** `chain.py`, `lohner7.py`, `manifold_ad.py`, and the block and prove programs of gain-12 and faye-model.
- **Trust base.** The correctness of Arb, python-flint and mpmath.
- **Unread sources.** Pinto–Ermentrout, Faye 2013, Burlakov–Oleynik–Ponosov (MDPI refused access), Dyson, Zhang, Pinto–Jackson–Wayne and Sandstede. The quotations and page numbers attributed to them are unchecked.
- **Priority.** Not checked beyond the two searches.
- **Folders not opened.** `review/` and `notes/` were not read, as instructed.

## Commands run, with output tails

- `node tools/paper-check.js` → `OK nf-pulse [draft]`; "quality bar is not met (open: item 1, 2, 4, 5, 6, 7)"; "nf-pulse.pdf: 33 pages".
- pdflatex ×3 on a scratch copy → 33 pages, 0 overfull boxes, no undefined references.
- `nice python3 ess_spectrum.py` → `ESSENTIAL SPECTRUM: Re lam <= -delta0 = [-0.11270166537925831148 +/- 2.08e-21] ; CERTIFIED`; `NEGATIVE CONTROL eps = 3/10: discriminant positive = False`.
- `nice python3 large_lambda.py` → `LARGE |lam| EXCLUSION: CERTIFIED`; negative control `certified = False`.
  - These two scripts rewrite `data/*.json`. `git status` confirmed that the rewrites were byte-identical.
- Tail constants recomputed from `pulse_records.pkl` → K_U = 5.748738, m_E = 0.1246187 (small-block margins −0.124619 and −0.124638), G_R = 1.77605e-4, G_L = 1.84465e-8, sup|S''| on the small ranges 2.624.
- Winding pieces summed exactly → total/2π ∈ [0.8331081, 1.1668382]. Right side [1.78683, 1.98205], top [0.92574, 1.02667], left [−0.095282, 0.657012]. Lower half equal to the upper half to about 1e-10.
- My own floating-point Evans code (scratchpad `indep_evans.py`, DOP853, restarting at each recorded node midpoint):
  - D̃(0) = −9.6e-14
  - D̃(4.5) = −406.706 (stored thin value [−406.7 ± 0.048])
  - D̃(−0.05) = 0.6910
  - D̃(−0.05 + 0.02i) = 0.7025 − 0.2481i (stored [0.70 ± 0.0044] + [−0.25 ± 0.0033]i)
  - D̃(17/24 + 7.6i) = 766.08 − 386.37i (stored [766.1 ± 0.09] + [−386 ± 0.45]i)
  - central difference for D̃'(0) = −15.216 (the enclosure is [−16.38, −14.05])
  - winding on 267 samples of ∂R: 1.0000000, largest argument step 0.955 rad, smallest |D̃| 0.691.
- Certificate tally → 387 PASS (383 in `certs/` and 4 probes). Every in-run negative check was refused. The `chain.py` hashes are 286 × 328042d015af5043 and 101 × e0aa72d09e4519dc.

## Response (2026-09-27, the manuscript's writer)

Each finding of this report was examined by two further agent sessions; "confirmed" below means that both upheld
it, "not confirmed" that at least one refuted it. Section and lemma numbers are those of the revised manuscript
(`paper/nf-pulse.tex`, 37 pages): Lemma lem:branch is Lemma 4.3, the block lemma for the wave equation Lemma 4.5,
the manifold lemma of Faye's model Lemma 4.7, the multiplicity lemma Lemma 5.8.

**Must fix**

1. Lemma lem:branch, the unstable manifold theorem (confirmed). **Fixed.** The proof now uses the local unstable
   manifold: the points of a neighbourhood N whose backward orbit stays in N form a C^1 curve W; it says why that
   condition cannot be dropped (a homoclinic orbit returns into N along the stable directions), shows that the curve
   of the parametrization is W, and adds that a solution tending to x* as xi -> -infinity lies in N for xi <= xi0,
   so x(xi0) lies on W and on the orbit of x_kappa.

**Should fix**

1. Quantifiers (confirmed). **Fixed.** After Theorem 6 the text now says that every pulse of P satisfies the
   conclusions of Theorem 1, so the pulse of Theorem 1 can be chosen in P, and that what is open is whether every
   pulse with speed in (c1, c2) on that branch, or the pulse given by the proof, belongs to P; the Limitations
   paragraph and Open problem 2 say the same. Theorem 2(b) reads "a pulse of (a) can be chosen with speed in", and
   the Corollary and its proof "a pulse given by Theorem ...".
2. Theorem 5 not proved in full (confirmed). **Fixed.** Section 4.8 now writes the polynomial embedding (faye5) of
   Faye's model, its three nonlinear terms, the unstable eigenvector (A5 v = mu v, the third row being p(mu) = 0,
   checked symbolically by the writer), and Lemma 4.7 with its proof: the Neumann-series bound K_F for every entry of
   (n mu - A5)^(-1), the bound Z_F(R) with constants c^_1 = b^2 + eps kappa alpha, c^_2 = beta kappa |1 - 2 Y0| and
   c^_3 = beta kappa (those of `ext/faye-model/code/manifold.py`, which calls them c1, c2, c3; the hats keep them
   apart from the speeds c1, c2), and the induction. The writer checked in SymPy that A5 v - mu v vanishes except in
   its third row, which is a nonzero multiple of p(mu), and that the three nonlinear terms are exact. The analogues of
   Lemma 2.6 (with the linear growth that replaces the global Lipschitz bound), Lemma 4.3 and Proposition 2.3 are
   written out. The new lemma has not had a separate reading (Section 9 and `notes/QUALITY.md` say so).
3. Stored certificates of Theorem 2 (not confirmed: both checks found that the text already calls the certificates
   records of passed runs, names the program versions and gives the four-hour command). **Not changed**, apart from
   the probe count (minor item below).
4. SHA-256 tie overstated (confirmed). **Fixed in the text.** The proof of Proposition 5.6, the caption of Table 4
   and Section 8 now name the three fingerprinted files and the base modules that are not fingerprinted, and say
   that since the pieces were computed (commit 5af378b) `code/nfcore.py` has not changed and `code/certify_rest.py`
   and `code/block.py` have changed only in comments. The fingerprint was not widened: `winding.py` is itself one of
   the fingerprinted files, so any change to it would invalidate the six stored pieces, whose recomputation takes
   hours on the shared four-core machine.
5. Environment variables (confirmed). **Fixed in the programs and the text.** Every check script of the extensions
   (`ext/stability/run_all.sh` and `thin_runs.sh`, `ext/gain-12/code/run_all.sh`, `ext/slow-pulse/code/run_all.sh`,
   `ext/faye-model/code/run_all.sh`, `ext/eps-range/run_checks.sh` and `probe_limits.sh`) now refuses to run when
   PYTHONOPTIMIZE is set and clears every NF_* variable, as `code/run_all.sh` does. All eight scripts were started
   with PYTHONOPTIMIZE=1 and each stopped at once with a FAIL line and status 1. The check scripts (`code/run_all.sh`,
   `ext/slow-pulse`, `ext/gain-12`, `ext/eps-range/run_checks.sh`, `ext/stability/run_all.sh quick` and
   `ext/faye-model` at the three values of eps) were rerun from a copy of the folder at the checkpoint 395bba3 with
   twelve NF_* variables set in the environment (NF_PULSE=slow, NF_DU=0.15, NF_R_OVER_RHO=0.5, NF_PREC=64,
   NF_TOL=1e-5, NF_ORDER=4, NF_TAG, NF_BETA=20, NF_EPS=1/10, NF_EVANS_PREC=64, NF_STAB_PREC=64, NF_STAB_OUT); every
   check passed and every summary and certificate is identical to the committed one apart from timing fields
   (`notes/QUALITY.md`). `probe_limits.sh`, whose full run takes hours, was not rerun; its prelude was checked to
   clear planted variables. The Program hygiene paragraph
   (Section 9) lists NF_PULSE, NF_DU, NF_R_OVER_RHO, NF_PREC, NF_TOL, NF_ORDER, NF_TAG, NF_BETA and NF_EPS besides
   NF_EVANS_* and NF_STAB_*. The assertions in the programs remain (stated in Section 9).

**Minor**

- Rest eigenstructure singular at lambda = c: **fixed** (Section 5.5 states where the formulas are singular, that
  the squares used stay away from lambda = c, that the program requires finite enclosures of V and V^(-1), and why
  V^(-1) has the rows of the normalized left eigenvectors).
- "In one process": **changed** (the times are now given "with the parallel steps run one after another").
- "All three accepted probes": **fixed** ("285 of these certificates (among them the three probes used in E), and
  the fourth accepted probe").
- delta undefined: **fixed** (e and h are the rounded midpoint and half-width of E; delta, slightly above 2^-100,
  bounds the rounding).
- The name "fast pulse": **fixed** (a sentence after the list of results says it is a numerical identification,
  proved to be the faster of two pulses only at eps = 1/10 and 3/20).
- Unlabelled proof steps: **fixed** (Lemma 2.5, computer-assisted: the root count for every eps and kappa;
  Lemma 4.5, proved: the block lemma for the wave equation).
- "With its eigenvector residual": **fixed** (described as a consistency check only).
- Block matrix T: **partly fixed.** The text now says that the programs recompute T at each run and that check P3
  compares the recomputed pulse records, which contain T, exactly with the stored ones; the programs were not changed
  to load the recorded T (both checks of the corresponding computation finding judged it a portability nicety).
- |t0|: **fixed**.
- Symbol reuse: **fixed in part.** Renamed: the normalized left eigenvector (l~, l), the complex square (script Q),
  the centres and coordinates of the covering sets (x-bar_i, chi), the time rescalings (tau_i), T(lambda) (script
  T), lambda + ick (zeta), the manifold's tail bound and radii (G, R_i), the convolution component of the Evans
  vector (g), the Cauchy radius (written as 1/25), the speeds of Theorems 4 and 5 (c_g, c_f) and the scalar of
  Lemma 5.8 (a_*). Not renamed: omega (Section 4.1 and the Volterra remainder of Section 5 are far apart), the
  compact operator K beside K_ij and K^+-, and T_0.
- Fourier-spectral check: **fixed** (the sentence is dropped; the numerical Evans computation in the folder,
  `spectrum_num.py`, remains).
- Page count: noted; the revised PDF has 37 pages.
