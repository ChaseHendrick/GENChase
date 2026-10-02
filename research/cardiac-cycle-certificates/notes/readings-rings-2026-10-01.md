# Readings for the ring stability certificate (Hill operator H_0, block-resolvent tail, Riesz homotopy)

Date: 2026-10-01. Scope: open items of research/cardiac-cycle-certificates/notes/prior-article-rings-2026-10-01.md
and PLAN-large-rings.md step 3. Full texts read were kept only in the session scratchpad (not in the repository).
Quotations are short and carry section or equation numbers.

## 1. Bayer and Leine, Koopman-Hill error bound

Citation: F. Bayer, R. I. Leine, "Explicit error bounds and guaranteed convergence of the Koopman-Hill projection
stability method for linear time-periodic dynamics", J. Nonlinear Sci. 36(3) (2026) 64,
doi:10.1007/s00332-026-10287-3; arXiv:2503.21318 (v2, 22 Oct 2025, math.NA). Journal metadata from the earlier
Crossref check; the journal version itself was not opened.

Read: arXiv v2 in full for Sections 1-3, 4 (Theorem 7), 6 and 7; Section 5 proofs and appendices skimmed.

Setting (Sec. 2): y' = J(t) y, J T-periodic, n x n, Fourier coefficients J_k, omega = 2 pi / T. Truncated Hill
matrix H (n(2N+1) square, Eq. 15), diagonal blocks J_0 + i k omega I, k = N..-N, off-diagonal J_{k-l}. Koopman-Hill
projection (Eq. 21): Phi_T approx C e^{HT} W, with W a stack of 2N+1 identities and C picking the centre block row.

Assumption 1 (Eq. 27): there are a, b > 0 and a matrix p-norm with ||J_k|| <= a e^{-b|k|} for all k.

Theorem 4 (main result, Sec. 3): "Let Assumption 1 hold with b > ln 2. For a fixed truncation order N, ...
||Phi(t) - C e^{Ht} W|| <= (2 e^{-b})^N (e^{|4at|} - 1)" (Eq. 36), and accuracy E_des is guaranteed once
N >= N* = (|4at| + ln(1 - e^{-|4at|}) - ln E_des) / (b - ln 2) (Eq. 37).
Theorem 7 (Sec. 4, subharmonic formulation): same bound with N replaced by 2N, i.e. (2e^{-b})^{2N}(e^{|4at|}-1)
(Eq. 66), N* halved (Eq. 67).
Proof route: exact Taylor-Fourier series for Phi(t) and for C e^{Ht} W (Theorems 1, 2), the error is the sum over
index tuples outside a parallelotope (Eq. 35), every term bounded by |at|^m/m! e^{-b|p|} and tuples overcounted by a
binomial coefficient (Eqs. 38-43). The authors call the steps "majorly conservative" and note the e^{4at} factor is
not observed numerically (Sec. 3, Sec. 7).

Constants and scaling: the bound depends only on (a, b, t, N); n enters only through a (a matrix norm of J_k) and the
norm. Growth e^{4aT} in the period; truncation N* linear in aT / (b - ln 2). Requires b > ln 2 (coefficients decay at
least like 2^{-|k|} in the chosen norm), stricter than analyticity.

From the bound to Floquet multipliers (Sec. 6.2): the theorems bound the monodromy matrix only; multipliers are
placed in the E-pseudospectrum of the approximate monodromy, Lambda_E = {z : sigma_min(zI - Phi_approx) <= E}
(Eq. 117). A "guaranteed" stability assertion for the Mathieu equation uses the known structure (multipliers on the
unit circle or the real axis) and checks whether the pseudospectrum meets both sets, by sampling the unit circle and
real axis (Fig. 9-11). No component counting of eigenvalues is stated.

Rigour of the examples: floating point (Matlab ode45 references, numerical eigenvalues). Sec. 7: "The error due to
numerical procedures, in particular the error of evaluating the matrix exponential, is not considered in the error
bound ... expected to be negligible". For the Duffing example (Sec. 6.3) a and b "were fitted to the norm of the
Fourier coefficient matrices", i.e. not proved; the periodic solution comes from non-validated harmonic balance.
No interval arithmetic anywhere.

Verdict: a numerical method with an a priori, explicit truncation-error bound (a rigorous theorem about the
truncation), not a computer-assisted proof framework. It could in principle be implemented in interval arithmetic
(enclose e^{HT} and the pseudospectrum, prove the decay constants, validate the orbit), but the paper does not do so,
does not treat orbit-enclosure error, and gives no eigenvalue count.

Comparison with our route (block-resolvent small-gain tail on H_0 plus Riesz-projection homotopy):
- Object bounded: theirs is the monodromy matrix (time domain, through e^{HT}); ours is the resolvent of the infinite
  Hill operator on contours, giving exclusion regions and an eigenvalue count in the spectral (exponent) plane.
- Kind of bound: theirs is a priori and global in (a, b); ours is a posteriori, built from the computed truncation and
  an explicit tail resolvent bound.
- Scaling: their N* grows like 4aT/(b - ln 2) and the bound contains e^{4aT}. For the TP06 ring, a is at least the
  largest Jacobian rate (fast gates, order 10-100 per time unit; our estimate, not computed) and T is about 53.6, so
  e^{4aT} is astronomically large and N* would be in the thousands of harmonics per n = 18N state block; b > ln 2 is
  also doubtful for a sharp upstroke. Our estimate only; we did not compute their a, b for TP06.
- Counting: their pseudospectral inclusion does not separate the trivial multiplier 1 from nontrivial multipliers at
  distance about 5e-4 (|exponent| about 9e-6 times T) unless E is far below that over a 1152-dimensional matrix, and
  it gives no count. Our Riesz homotopy is designed exactly for the count (1166 truncated vs 1152 expected).
- Shared ingredient: the same Hill matrix (diagonal blocks J_0 + i k omega I, Toeplitz off-diagonals).

Recommended credit: "Bayer and Leine [J. Nonlinear Sci. 2026] proved an explicit a priori bound on the truncation
error of the Koopman-Hill approximation e^{HT} of the monodromy matrix, for coefficients with ||J_k|| <= a e^{-b|k|},
b > ln 2 (their Theorem 4), and used pseudospectra to infer multiplier locations in floating point. Our tail bound is
a posteriori and acts on the resolvent of the Hill operator, which lets us exclude spectrum and count eigenvalues by
a Riesz-projection homotopy in ball arithmetic."

## 2. Gameiro and Lessard, Kuramoto-Sivashinsky periodic orbits

Citation: M. Gameiro, J.-P. Lessard, "A posteriori verification of invariant objects of evolution equations:
periodic orbits in the Kuramoto-Sivashinsky PDE", SIAM J. Appl. Dyn. Syst. 16(1) (2017) 687-728,
doi:10.1137/16M1073789. No arXiv version found (arXiv API au:Gameiro AND au:Lessard lists only 1509.08648,
1605.01086, 2206.09205). Author PDF on Lessard's site (papers/KS_v10.pdf), read: abstract, Sec. 1, Sec. 7, Sec. 8
theorem statements. Page numbers below are of that author PDF and may differ from the journal.

How Floquet exponents are enclosed (Sec. 7): after the orbit u~ is proven, they solve the invariance equation
v_t + lambda v = DE(u~) v (Eq. 87) for an eigenvalue-eigenvector pair (lambda, v), with v p-periodic in time
(p = tau or 2 tau for non-orientable bundles, Remark 7.1), expanded in space-time Fourier series (Eq. 88), plus a
normalisation; the pair is proven by a separate radii-polynomial contraction around a numerical approximation with
lambda-bar real (Lemmas 7.4-7.9). Remark 7.3: if |e^{lambda p}| > 1 the orbit is unstable.

Exclusion: none. Sec. 1 (introduction, near its end): "The fact that we solve rigorously the eigenvalue problem to compute the Floquet
exponents implies that we can only prove that some solutions are unstable. Extending our approach to prove that some
solutions are stable is the subject of current research." Theorems 8.2 and 8.7 note the orbit "is apparently stable,
but we do not have a proof of this statement." Theorems 8.3-8.6 prove instability via one real positive exponent.

So: the method proves isolated eigenpairs one at a time; it cannot prove stability because it has no argument
excluding the rest of the spectrum, and the authors say so. They did not need one for instability.

Recommended credit: "Gameiro and Lessard [SIADS 2017] proved periodic orbits of the Kuramoto-Sivashinsky PDE by a
space-time Fourier radii-polynomial argument and enclosed individual Floquet exponents by a second contraction on the
invariance equation, which proves instability; they state that their method could not prove stability. The
exclusion and counting step used here supplies that missing part for our Hill operator."

## 3. Di Marco, Forti, Garay, Koller, Pancioni, Chua-Yang ring

Citation: M. Di Marco, M. Forti, B. M. Garay, M. Koller, L. Pancioni, "Floquet multipliers of a metastable rotating
wave in a Chua-Yang ring network", J. Math. Anal. Appl. 434(1) (2016) 798-836, doi:10.1016/j.jmaa.2015.08.072
(Crossref and OpenAlex; note the DOI ends in .072, not .071).

Read: NOT the full text and NOT the verbatim abstract. ScienceDirect, the open-archive PDF and ResearchGate all
returned 403 or a Cloudflare block; Crossref, OpenAlex and Semantic Scholar carry no abstract. What follows is from
search-engine abstract snippets (two independent searches agreeing). UNVERIFIED against the paper.

Content per snippets: a ring of N = 2M identical neuron cells (Chua-Yang cellular neural network) with piecewise
linear, saturated, bidirectional coupling nonlinearities; the rotating wave exists for "most" coupling parameters
alpha > 0, |beta| <= alpha (or <); the dominant nontrivial Floquet multiplier is unstable and converges exponentially
to 1 in the number of cells, the remaining 2M-2 nontrivial multipliers converge exponentially to 0; a heteroclinic
bifurcation curve and heteroclinic connections are given by explicit formulas; motivated by circuit experiments.

Nature: analytic (piecewise-linear model, explicit formulas), not computer-assisted as far as the snippets show; the
rotating wave is unstable (metastable: long transients because the unstable multiplier is exponentially close to 1).

Recommended credit: "For piecewise-linear Chua-Yang rings, Di Marco, Forti, Garay, Koller and Pancioni [JMAA 2016]
obtained the Floquet multipliers of a rotating wave analytically and showed it is unstable, with one multiplier
exponentially close to 1 in the ring size (metastability)." Check the full text before submission.

## 4. Hua and Liu, coupled Chua's circuit

Citation: D. Hua, X. Liu, "Existence of periodic traveling wave solutions in a coupled Chua's circuit",
Z. Angew. Math. Phys. 77(7) (2026), Article 196, doi:10.1007/s00033-026-02848-z (published 27 June 2026).

Read: abstract (East China Normal University Pure record, verbatim) and the Crossref reference list. Full text not
read (Springer challenge page; closed access).

Abstract (ECNU Pure): "This paper analytically investigates for the first time the existence of two types of
periodic traveling wave solutions in a coupled Chua's circuit model with diffusion, employing geometric singular
perturbation theory, fixed point theory, and invariant manifold theory. ... we demonstrate the existence of
infinitely many periodic traveling wave solutions for the hyperbolic regime and at least one such solution for the
nonhyperbolic regime. Moreover, the corresponding wave speeds are explicitly derived using the theory of generalized
rotated vector fields. Numerical simulations are provided to validate the theoretical analysis."

Nature: analytic, not computer-assisted; a continuum (diffusive PDE) model, traveling-wave ODE; existence only, no
stability; references are Fenichel, exchange lemmas, Carpenter, Brouwer, rotated vector fields; no rigorous-numerics
references except Yang's horseshoe paper (IJBC 2009).

Recommended credit: optional; if cited, "Hua and Liu [ZAMP 2026] proved existence of periodic traveling waves in a
diffusively coupled Chua's circuit model by geometric singular perturbation theory; this is a continuum model and
the result does not address stability." Not a precedent for a computer-assisted ring proof.

## 5. Two citation checks

(a) Erhardt-Solem. arXiv:2105.05544 (v1 only, 12 May 2021, no journal-ref on arXiv), "Analysis and simulation of a
modified cardiac cell model gives accurate predictions of the dynamics of the original one", and SIADS
21(1) (2022) 231-247, doi:10.1137/21M1425359, "Bifurcation Analysis of a Modified Cardiac Cell Model" (published
online 11 Jan 2022). Same two authors; the two abstracts are word-for-word identical except spelling
(behaviour/behavior, afterdepolarisations/afterdepolarizations) and the last sentence ("linked to cardiac death at
the tissue level by example" vs "linked to wave break-up leading to cardiac death at the tissue level"). The SIAM
manuscript number 21M... is a 2021 submission. Conclusion: the arXiv paper is the preprint of the SIADS paper
(strong inference; no explicit journal-ref link exists). Cite the SIADS version, optionally "(preprint
arXiv:2105.05544)".

(b) Golubitsky-Stewart-Schaeffer Vol. II (Appl. Math. Sci. 69, Springer, 1988, doi:10.1007/978-1-4612-4574-2):
Chapter XVIII "Further Examples of Hopf Bifurcation with Symmetry", pp. 363-411
(doi:10.1007/978-1-4612-4574-2_10, Crossref), section 4 "Oscillations of Identical Cells Coupled in a Ring"
(table of contents in Stanford SearchWorks record 10492959: 0 Introduction, 1 The action of D_n x S^1, 2 Invariant
theory for D_n x S^1, 3 Branching and stability for D_n, 4 Oscillations of identical cells coupled in a ring,
5+ Hopf bifurcation with O(3) symmetry, 6+ Hopf bifurcation on the hexagonal lattice). Page range of section 4 not
checked. Cite as "[GSS88, Ch. XVIII, Sec. 4]".

## Searches this session
- WebSearch: 'Gameiro Lessard "periodic orbits in the Kuramoto-Sivashinsky PDE" arXiv'; '"Floquet multipliers of a
  metastable rotating wave in a Chua-Yang ring network" Di Marco Forti Garay Koller Pancioni'; 'Di Marco Forti Garay
  Koller Pancioni Chua-Yang ring rotating wave Floquet multipliers piecewise linear "converge exponentially"
  abstract'; '"metastable rotating wave" "Chua-Yang ring" ... repository'; '"Chua-Yang ring" rotating wave "Floquet
  multipliers" piecewise linear explicit formulas heteroclinic "Garay"'; 'Hua Liu "Existence of periodic traveling
  wave solutions in a coupled Chua's circuit" ZAMP 2026'; 'Golubitsky Stewart Schaeffer Volume II "Chapter XVIII"
  ...'.
- arXiv API: au:Gameiro AND au:Lessard (3 hits, no KS paper); au:Garay AND (au:Forti OR au:Pancioni OR au:Koller) (0);
  id_list=2105.05544.
- Crossref: 10.1016/j.jmaa.2015.08.072, 10.1007/s00033-026-02848-z (reference list), 10.1137/21M1425359, chapters
  10.1007/978-1-4612-4574-2_1.._12. OpenAlex, Semantic Scholar, Unpaywall for the JMAA and ZAMP DOIs (no abstracts).
