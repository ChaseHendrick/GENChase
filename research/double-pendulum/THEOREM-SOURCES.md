# Open statements of the dynamical-systems results (search of 2026-09-26)

Quotes are short and exact up to PDF text extraction (subscripts/superscripts flattened; where
OCR was poor this is said). Local text extractions of every PDF used are in this scratchpad
(`*.txt` next to the `*.pdf`).

---

## 1. Stable manifold theorem (C^r; analytic; global manifold immersed)

**(a) C^r local manifolds, hyperbolic sets incl. a hyperbolic fixed point.**
S. Dyatlov, "Notes on hyperbolic dynamics", arXiv:1805.11660, §4.1, Theorem 4 (p. 22).
Hypotheses: "Let ϕ : M → M be a C^{N+1} diffeomorphism (here N ≥ 1 is fixed) and assume that
ϕ is hyperbolic on some compact ϕ-invariant set K"; Remark 3 after Def. 4.1: "The basic example of
a hyperbolic set is K = {x0} where x0 ∈ M is a fixed point of ϕ which is hyperbolic".
Conclusion (1)-(2): "Wu(x), Ws(x) are C^N embedded disks of dimensions du, ds" and
"TxWu(x) = Eu(x), TxWs(x) = Es(x)". Note: this version loses one derivative (C^{N+1} map gives
C^N disks). Refers the reader to Katok-Hasselblatt [KaHa97, Theorem 6.2.8] for the full proof.

Same-regularity version (C^k map, C^k disks): H. Perez-Stark, "Hyperbolic dynamical systems and
the Birkhoff-Smale theorem", UChicago REU 2021 (not peer reviewed),
https://math.uchicago.edu/~may/REU2021/REUPapers/Perez-Stark.pdf, Theorem 3.6: "Let f : M → M be
a C^k diffeomorphism, Λ a hyperbolic set of f ... Then there is r > 0 such that there are two C^k
embedded disks W^s_r(p, f) and W^u_r(p, f) which are tangent at p to E^s_p and E^u_p". Cites
Wen (2016) and Katok-Hasselblatt (1995).

**(b) Analytic case.** M. J. Capiński and J. D. Mireles James, "Validated computation of
heteroclinic sets", arXiv:1602.02973, §2.2 (p. 5): for a hyperbolic fixed point, "W^u_loc(p, U)
is a k − m dimensional embedded disk, tangent at p to the unstable eigenspace of Df(p). If f is
analytic the embedding is analytic." (Same sentence for W^s_loc.) Stated as standard, citing
Katok-Hasselblatt [17] and Robinson, Dynamical Systems (1995) [18]. Flow version: Kalies,
Kepley, Mireles James, arXiv:1706.10107, §1 (p. 2): W^u_loc "is analytically diffeomorphic to a
d-dimensional disk which is tangent at p0 to the unstable eigenspace", and §3 (p. 17): "P is
(real) analytic if f is analytic [2, 3]" with [2,3] = Cabré, Fontich, de la Llave, Parameterization
method II (Indiana 2003) and III (JDE 218, 2005). The Cabré-Fontich-de la Llave papers
themselves: not reached.

**(c) Global unstable manifold.** Capiński-Mireles James §2.2: "If f is invertible then
W^s(p) = ∪_{n≥0} f^{-n}[W^s_loc(p, U)]" and the analogous union for W^u. Immersion: Dyatlov
§4.1 item 5 (p. 25): global manifolds W^(∞)_u(x) = ∪_k W^(k)_u(x) "are du and ds-dimensional
immersed submanifolds without boundary in M, however they are typically not embedded."
Also Devaney 1976 §9 (item 5): "both W^s(p) and W^u(p) are immersed invariant submanifolds".
An open source using the words "injectively immersed": not found.

## 2. Lambda lemma (inclination lemma), Palis 1969

Original: J. Palis, "On Morse-Smale dynamical systems", Topology 8 (1969) 385-404: **not reached**
(ScienceDirect returned 403).

Open statement for diffeomorphisms: Perez-Stark (above), Lemma 3.11 (Inclination Lemma):
"Let p ∈ M be a hyperbolic fixed point of f : M → M. If n = dim M, let k = dim W^u(p, f) ...
Then, for any k-disc B ⊂ W^u(p, f), any point x ∈ W^s(p), any k-disc D transverse to W^s(p, f)
at x, and any ε > 0, there is N > 0 such that if n > N, f^n(D) contains an (n − k)-disc that is
C^1 ε-close to B." (The "(n − k)-disc" is a typo in the source; it must be a k-disc.) Proof
referred to Katok-Hasselblatt Thm 6.2.23 and Palis-de Melo Thm 7.1 (Ch. 2).

Attribution to Palis, open: J. Weber, "Contraction method and Lambda-Lemma", arXiv:1507.01028,
§1: "The λ-Lemma was proved by Palis [Pal67, Pal69] in the late 60's. Its backward version
asserts that, given a hyperbolic singularity x of a C^1 vector field X ..., the corresponding
backward flow applied to any disk D transverse to the unstable manifold W^u(x) converges in C^1
and locally near x to the stable manifold of x; cf. [PdM82, Ch. 2 §7]." ([Pal69] = Topology 8.)
Devaney 1976 uses it in the proof of Thm 9.1 ("By the λ-lemma [22]", [22] = Palis, Topology 8).

## 3. Smale-Birkhoff homoclinic theorem

Open statements:
- Perez-Stark (above), Theorem 6.2 (Birkhoff-Smale): "Let f : M → M be a diffeomorphism, p be a
  hyperbolic periodic point, and q be a transverse homoclinic point for p. Then for any
  neighborhood U of {p, q}, there exists n ≥ 0 such that f^n has a hyperbolic invariant set
  Λ ⊂ U such that p, q ∈ Λ and on which f^n is topologically conjugate to the shift map
  σ : Σ2 → Σ2." Proof "modeled after Theorem 4.5" of Robinson (1995).
- R. Ramírez-Ros, "Homoclinic and heteroclinic connections", course slides, Barcelona 2008,
  https://web.mat.upc.edu/rafael.ramirez/res/pdf/connections.pdf, slide p. 14: "(Smale) Let
  f : R^2 → R^2 be a diffeomorphism with a saddle point whose invariant curves has a transverse
  intersection. Then some power f^N has an invariant Cantor set C, the Smale horseshoe. Besides,
  the restriction of that power to C is topologically conjugated to the Bernoulli shift"; and
  "Its topological entropy is positive; namely, it is equal to log 2." Reference given:
  S. Smale, "Diffeomorphisms with many periodic points", Differential and Combinatorial Topology,
  S. S. Cairns ed., Princeton Univ. Press, pp. 63-80 (the slide prints 1963; the volume is
  usually dated 1965).
- Consequence for entropy: h_top(f) ≥ h_top(f^N|Λ)/N = (log 2)/N > 0 (standard: h(f^N) = N h(f),
  monotone under restriction to closed invariant sets). Not quoted from a source; elementary.

Smale's 1965 paper itself: not reached. A. Katok-Hasselblatt Thm 6.5.5: book, not consulted.

## 4. Entropy of a flow versus its return map / suspension

K. Kucherenko and D. J. Thompson, "Measures of maximal entropy on subsystems of topological
suspension semi-flows", arXiv:1909.07317, §2, eqs. (2.9)-(2.13) (pp. 5-6). Setting: (X, f)
topological dynamical system (compact in the paper), roof "a continuous function
ρ : X → (0, ∞)", suspension (semi)flow on X_ρ. Lift of μ ∈ M(f) is a bijection M(f) → M(Φ).
"Abramov [1] established a relation between the entropies of the measure μ and the lifted
measure μ̃, namely h_μ̃(ϕ_t) = t · h_μ(f) / ∫_X ρ dμ", so the flow entropy (time-one map)
"satisfies h_μ̃(Φ) = h_μ(f) / ∫_X ρ dμ". "if f : X → X is a homeomorphism ... Abramov's formula
(2.12) is valid with t replaced by |t|." [1] = L. M. Abramov, "On the entropy of a flow", Dokl.
Akad. Nauk SSSR 128 (1959) 873-875. Also p. 6: "Since htop(Φ) > 0 for any continuous roof
function ρ" (context: base with htop(f) > 0).
Second open source: arXiv:1206.6597 (Poincaré section for horocycle flow), Lemma 3.1, eq. (3.2):
"Abramov's formula relating the entropy of the flow φ^{R,T} (that is, of its time 1-map) to the
entropy of the map T: h_{η^{R,T}}(φ^{R,T}_1) = h_η(T)/‖R‖_{1,η}".

Positivity for a flow containing a horseshoe suspension: take an ergodic μ on the shift with
h_μ > 0 (variational principle), lift it by Abramov (roof = return time, bounded, so ∫ρ dμ < ∞),
get h_top(φ_1) ≥ h_μ̃(φ_1) > 0. This chain is assembled here, not quoted as one statement.
Bowen-Walters, J. Differential Equations 12 (1972) 180-193: not reached.

## 5. Reversible systems, symmetric homoclinic orbits (Devaney 1976)

Open scan: https://people.math.harvard.edu/~knill/diplom/lit/DevaneyReversible.pdf (OCR is poor;
quotes below were checked against the scan's words and cleaned only of OCR noise). R. L. Devaney,
Trans. AMS 218 (1976) 89-113, §9 "Homoclinic orbit theorems", p. 111. Setting: X is R-reversible,
TR(X) = −X∘R, R an involution with dim Fix(R) = n = half the dimension; p a symmetric hyperbolic
critical point (a flow). "by R-reversibility we have R(W^s(p)) = W^u(p)". "We now assume that
W^s(p) has a point of transversal intersection q ≠ p with F(R) [= Fix(R)]. By symmetry,
q ∈ W^u(p), and by invariance ... the orbit of q ... lies in W^s(p) ∩ W^u(p). Such an orbit is
called a symmetric homoclinic orbit." Also: "since W^s(p) is transverse to F(R) at q, it follows
that the symmetric homoclinic orbit through q cannot be perturbed away."
Theorem 9.1: "Let p be a symmetric hyperbolic zero of X, and let q ≠ p be a point of transversal
intersection of W^s(p) and F(R). Then the homoclinic orbit through q is the limit of a
one-parameter family of symmetric closed orbits whose periods tend to ∞." Devaney's §9 is for
vector fields; a stated diffeomorphism version of the lemma was not found in this paper.

General form (open): A. J. Homburg and J. S. W. Lamb, "Symmetric homoclinic tangles in reversible
systems" (2006), https://staff.fnwi.uva.nl/a.j.homburg/Files/HomLamb.pdf, §1 p. 3: "In general,
if W^u(p) intersects Fix(R) in a point q then by reversibility so does W^s(R(p)), so that q lies
on a heteroclinic orbit from p to R(p), which is homoclinic when p is symmetric."
Map version, informal: Ramírez-Ros slides p. 7: "Symmetric homoclinic points associated to
transverse intersections of invariant curves and symmetry lines persist under reversible
perturbations" (cites Devaney 1976 and Zehnder 1973).
Transversality of W^u and W^s at q for a planar map is not stated in these sources. It follows
because W^s = R(W^u), so T_q W^s = DR(q) T_q W^u. DR(q) is an involution whose +1 eigenspace is
T_q Fix(R), so T_q W^s = T_q W^u exactly when T_q W^u is an eigenline of DR(q): T_q Fix(R)
itself (excluded when the crossing with Fix(R) is transversal) or the −1 eigenline. The
criterion is therefore: W^u crosses Fix(R) transversally and is not tangent to the −1
eigendirection of DR(q). This is derived here, not quoted.

## 6. Kozlov: transversal (or non-coinciding) separatrices and no analytic integral

Kozlov, "Integrability and non-integrability in Hamiltonian mechanics", Russian Math. Surveys
38:1 (1983) 1-76, open full text at mathnet.ru (paperid=2823). Chapter V, §2, Theorem 3
(pp. 48-49): "Let n = 1. If [∫ {H0, H1}(z0(t), t) dt ≠ 0], 2) for small ε the perturbed system
has a doubly-asymptotic solution t → zε(t) close to t → z0(t), then for small ε ≠ 0 the
Hamiltonian system ż = I H'_z does not have an additional analytic integral [65]." [65] =
R. Cushman, "Examples of nonintegrable analytic Hamiltonian vector fields with no small
divisors", Trans. AMS 238 (1978) 45-55. Setting (Ch. V §1): analytic H = H0 + εH1 + O(ε²),
2π-periodic in t, unperturbed hyperbolic equilibria z± joined by a doubly-asymptotic solution.
Proof idea (p. 49): for the period map g, "the separatrices W^u_1 and W^s_2 intersect and do not
coincide"; ∪_n g^n(Δ) "is a key set for the class of functions that are analytic"; an analytic
integral is "constant on W2" and hence constant everywhere. Hypothesis is intersection without
coincidence (not necessarily transversal). Applications on pp. 49-54 include restricted four
vortices (Ch. V §3 item 4).

Map form (open): Ramírez-Ros slides p. 8: "(R. Cushman) If f : R^2 → R^2 is an analytic planar
map with a saddle point whose invariant curves have a topological crossing (that is, a
finite-order contact), then f is nonintegrable (that is, it has no analytic first integral)."
J. Cresson, "About analytic non integrability", arXiv:math/0509547, Theorem 1.1 (citing Cresson,
JDE 196 (2004), Thm 2.2): analytic diffeomorphism of R^n, hyperbolic fixed point, W^- and W^+
"intersect transversally at a homoclinic point h", plus a multiplicative non-resonance condition and
admissibility, "Then f does not admit a non trivial analytic first integral." Theorem 2.4: "Let f
be an analytic diffeomorphism of R^2 with a strictly positive topological entropy, then f does not
possess a non trivial analytic first integrals" (via Katok's horseshoe theorem plus Moser).
Dovbysh, Collect. Math. 50 (1999) 119-197 (core.ac.uk returned error 522): not reached.
The autonomous 2-degree-of-freedom statement in Kozlov's 1996 book (compact energy level,
hyperbolic periodic orbit, transversal separatrices ⇒ no real-analytic integral independent of H):
**not reached** as an open text. The standard route is to reduce to the Poincaré map on the
energy level, an analytic area-preserving map of a 2D section, and then apply the map form above.

## 7. CAPD rigorous Poincaré map

Paper: Kapela, Mrozek, Wilczak, Zgliczyński, arXiv:2010.07097 (v1, 14 Oct 2020; published CNSNS
101 (2021) 105578). §2 (p. 7): "[Cn]PoincareMap. This class provides algorithms for computation
of Poincaré maps and their derivatives. In the CAPD::DynSys library a Poincaré section is always
defined as the set of zeroes of a smooth scalar-valued function S : R^m → R". p. 1-2: rigorous
methods "compute outer bounds of objects of interest like values and derivatives of maps". The
examples (pp. 16-21) pass `poincare::MinusPlus` and use `pm.computeDP(...)`. The examples
start from sets on the section (e.g. u0 = (0, y, 0) with section x = 0). The p. 9 example code
comment reads: "After computation P = pm(s1, DP) the set s1 is often far from section." The
paper does not discuss initial sets on the section.

Documentation (CAPD source, github.com/CAPDGroup/CAPD, commit 03dc562, version 6.1.0;
capdDynSys/examples/poincare/poincare.dox, the source of the online page "Poincare maps and
their derivatives"; the online page capd.ii.uj.edu.pl/html/poincare.html returned 503):
- "In the CAPD a Poincare map is seen as a function P: R^n → Π ⊂ R^n rather than a mapping from
  section to section. Initial point does not need to be on Poincare section Π."
- Crossing direction: "MinusPlus - the function α changes sign from minus to plus along
  trajectory", "PlusMinus" the reverse, "Both - both directions are acceptable"; the default is
  Both.
- poincare-rigorous.dox: after `IVector P = pm(set,monodromyMatrix,returnTime)`, "P bound for
  the Poincare map at the set of initial conditions set" and a bound for the monodromy matrix;
  "Given monodromy matrix we can recompute it to derivative of Poincare map by
  IMatrix DP = pm.computeDP(P,monodromyMatrix,returnTime)"; "The matrix DP returned by computeDP
  is in full dimension."
- PoincareMap.h (class comment): "rigorously computes first return map to section (Poincare Map)
  and its derivatives"; "for given point x ∈ S let T(x) be first return time (in given crossing
  direction)"; "dP = dF + ∂φ/∂t dT".
- Initial set on the section: PoincareMap_templateMembers.h, integrateUntilSectionCrossing,
  lines 99-110: "LEAVING SECTION AND GOING UP TO THE POINT WHERE SECTION HAS CORRECT SIGN ...
  We want to leave section and reach point where the sign of the section function, according to
  crossingDirection, indicate that next section crossing will be in a good direction", looping
  `while (m_signBeforeSection.contains(0.0)) || <sign not correct>` with "we make one step to
  leave the section and try again". Then crossSectionInOneStep throws "initial set is already on
  the section" if the sign still contains 0. Implication, from reading the code and not stated
  in the docs: a set that starts on Π, or on the wrong side for the chosen direction, is first
  integrated by whole solver steps until the section sign excludes 0 and has the required
  sign. Only after that is a crossing detected. So "first return" means the first crossing in
  the chosen direction after that departure phase. A return within the departure steps is not
  detected.
