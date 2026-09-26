# Nonlinear stability of mixed-sign four-vortex relative equilibria (Arnold's theorem, certified)

Date: 2026-09-26. Working notes, not a paper. Status words: **proved** means that a rigorous
computation (ball arithmetic, every inequality decided by the balls) together with the written
argument in Section 3 establishes it, and that an independent check (Section 7) has read and
rerun it; **numerical** means floating-point or high-precision computation without enclosures;
**from the literature** means stated in a cited paper and not re-proved here.

## 0. Result in one paragraph

Among the four-vortex relative equilibria with circulations of both signs that are linearly
stable, two families were not known to be nonlinearly stable, and are now proved Lyapunov
(orbitally) stable on explicit parameter sets. Both have circulations (1, 1, 1, m), m < 0.
1. **The collinear Group I family** of Menezes and Roberts (linearly stable for -1 < m < m* ~ -0.8564).
   It is proved stable for m in [-0.96, -0.85642], except three intervals of width at most 5e-9.
   Those intervals surround the 1:3 resonance, the 1:2 resonance and one zero of Arnold's
   determinant.
2. **A convex kite family.** This family was found in this work's survey; we found no stability
   result for it in the literature. It is linearly stable for about -0.133786 < m < 0 and is
   proved stable for every m in [-0.13378, -0.0001], with no exceptions.

In both families the reduced quadratic Hamiltonian is indefinite, so energy arguments do not
apply and Arnold's theorem is needed. Of the Hampton-Roberts-Santoprete two-pair families
(1, 1, m, m), the numerical survey finds only Rhombus A linearly stable with mixed signs. That
case was already proved by Ohsawa, and its reduced form is definite. The equilateral triangle
with a central vortex is in 1:1 resonance for every m, so Arnold's theorem does not apply to it.
Kurakin and Ostrovskaya treat it separately.

## 1. Prior art (sources opened, with quotes)

Every source below was opened and read, apart from those marked "abstract only". No PDF or
copyrighted text is committed. The quotes are verbatim, apart from mathematical symbols, which
were retyped from the PDF text layer.

* **Ohsawa, arXiv:2406.12144v2 (1 Sep 2026; Physica D, doi:10.1016/j.physd.2026.135387).**
  Section 1: "there are many relative equilibria in the four-vortex problem with two pairs of
  vortices of equal circulations in which one pair has varying circulations and with Γ ≠ 0; see
  Hampton et al. [16]. Some of those four-vortex relative equilibria are known to be linearly
  stable, but their nonlinear stability is an open question [38]."
  Proposition 6.2 (Stability of Rhombus-A): "The fixed point µ0 ∈ vK of the Lie–Poisson relative
  dynamics (14a) corresponding to the relative equilibrium of Rhombus-A (see Figure 4) is Lyapunov
  stable to F^{-1}(0)-preserving perturbations if −2 + √3 < γ < 0 or 0 < γ < 1, and linearly
  unstable if −1 < γ < −2 + √3." Proposition 6.1 does the same for the triangle with a centre, for
  γ < −3 or 0 < γ < 1. He notes that Cabral and Schmidt's claim for −1/2 < γ < 1 "is contested by
  Kurakin et al. [19]".
* **Roberts, SIAM J. Appl. Dyn. Syst. 12 (2013) 1114-1134, arXiv:1301.6194.** Theorem 3.5: with
  all Γi > 0, linear stability implies nonlinear stability. Theorem 4.1: "Rhombus A is linearly
  stable for −2 + √3 < m ≤ 1", and "Rhombus B is always unstable". Remark 3 after Theorem 4.1:
  "For −2 + √3 < m < 0, rhombus A is linearly stable, but numerical calculations using Matlab show
  that it is a saddle of H restricted to I = I0 > 0." Theorem 4.2: the isosceles trapezoid (which
  exists only for m > 0) is stable.
* **Hampton, Roberts and Santoprete, J. Nonlinear Sci. 24 (2014) 39-92, arXiv:1208.4204.** This
  paper classifies relative equilibria for (1, 1, m, m) (Table 1: rhombi, asymmetric convex,
  convex and concave kites, collinear) and contains no stability analysis.
* **Menezes and Roberts, SIAM J. Appl. Dyn. Syst. 17 (2018), doi:10.1137/17M1125406,
  arXiv:1704.08647.** Theorem 2.11(ii): "If −1 < m ≤ −1/2, there are 6 relative equilibria, one
  for each ordering in Group I". Theorem 3.9(i): "The solutions from Group I are linearly stable
  for −1 < m < m∗, spectrally stable at m = m∗, and unstable for m > m∗." Here m* ≈ −0.8564.
  Remark 3.10(3): "Numerical calculations in Matlab indicate that all of our solutions (both stable
  and unstable) are saddles (the Morse index is always 2, except for m = 0). Thus, in contrast to
  the case of same-signed circulations, with mixed signs it is possible for a saddle to be linearly
  stable." The paper does not treat nonlinear stability.
* **Pérez-Chavela, Santoprete and Tamayo, arXiv:1407.7151.** This paper counts the symmetric
  relative equilibria (concave and convex kites) for (1, 1, 1, Γ4) and contains no stability
  analysis. Its only mention of stability refers to the sphere.
* **Roberts, Arch. Ration. Mech. Anal. (2018), arXiv:1709.01242 (Morse theory).** This paper
  treats kites with two pairs of equal circulations, mostly for m > 0. It has nothing on
  (1, 1, 1, m) kites.
* **Kurakin and Ostrovskaya, Regul. Chaotic Dyn. 26 (2021) 526-542, doi:10.1134/S1560354721050051
  (abstract only; Springer is behind a bot check).** The paper treats the triangle with a centre,
  κ the central circulation: "It is known that for κ>1 the regime under study is unstable, and in
  the case of κ<−3 and 0<κ<1 the orbital stability takes place. New results are obtained for
  −3<κ<0. It is found that, for all values of κ in the stability problem, there is a resonance 1:1
  (diagonalizable case). [...] The stability of the equilibrium of the system reduced by one degree
  of freedom with the involvement of the terms in the Hamiltonian through degree four is proved for
  all κ∈(−3,0)." This is the 1:1 case, which Arnold's theorem excludes, so it is out of scope
  here. Its fourth-order ("formal") status is theirs to state; we did not check it.
* **Kurakin, Ostrovskaya and Sokolovskiy, Regul. Chaotic Dyn. 21 (2016) 291-334 (abstract only).**
  The triangle and square with a central vortex in one- and two-layer models.
* Not about this question (abstracts read): arXiv:2609.23719 (hierarchical configurations,
  long-time stability via a modified Birkhoff form); arXiv:2410.14221 (confinement near vortex
  crystals); Ferrer-Benedí and Palacián, Qual. Theory Dyn. Syst. (2026) (singular reduction of
  resonant Hamiltonians); Pérez-Chavela and Tamayo, AMNS (2016) (existence only); Oliveira and
  Vidal, J. Dyn. Differ. Equ. (2019) (five vortices).

**Queries run.**
* WebSearch: `Roberts "Stability of relative equilibria in the planar n-vortex problem" arXiv`;
  `Kurakin Ostrovskaya "Resonances in the stability problem of a point vortex quadrupole on a plane"`;
  `Kurakin Ostrovskaya Sokolovskiy stability discrete tripole quadrupole Thomson vortex triangle square two-layer homogeneous rotating fluid 2016`;
  `linear stability kite relative equilibria four-vortex problem opposite sign circulations`;
  `Birkhoff normal form Arnold theorem nonlinear stability four point vortices relative equilibrium computer-assisted`;
  `four vortices three equal circulations kite relative equilibria stability "three equal vorticities" non-collinear`.
* Crossref: `query.bibliographic=Resonances in the stability problem of a point vortex quadrupole on a plane`.
* OpenAlex: abstracts of doi:10.1134/s1560354721050051 and doi:10.1134/S1560354716030059. The
  `cites:` searches failed because the daily budget was exhausted.
* Semantic Scholar: citations of Roberts 2013 (36 citing records), Kurakin-Ostrovskaya 2021 (2),
  Ohsawa (4), Pérez-Chavela-Santoprete-Tamayo (12), Hampton-Roberts-Santoprete and
  Menezes-Roberts (0 returned). Also the abstracts of the relevant citing papers.
* arXiv API: `all:"four vortex" AND all:stability`, `all:vortex AND all:"Birkhoff normal form"`,
  `all:vortex AND all:"nonlinear stability" AND all:"relative equilibria"` and
  `all:"four-vortex" AND all:"Lyapunov"`. All returned nothing from this container, so they count
  as not run.

**What was known before this work (from the literature):**

| family (circulations) | linear stability, mixed signs | nonlinear stability |
|---|---|---|
| Rhombus A (1,1,m,m) | −2+√3 < m < 0 (Roberts 2013) | proved by Ohsawa (to F^{-1}(0)-preserving perturbations) |
| Rhombus B, trapezoid, other (1,1,m,m) | unstable, or m > 0 only | n/a |
| triangle + centre (1,1,1,κ) | κ < 1 (1:1 resonance for all κ) | κ < −3 and 0 < κ < 1 proved (Kurakin et al. 2016; Ohsawa); −3 < κ < 0: Kurakin-Ostrovskaya 2021, to fourth order |
| collinear Group I (1,1,1,m) | −1 < m < m* (Menezes-Roberts 2018) | **open** |
| convex kite (1,1,1,m), m < 0 | **not found in the literature** | **open** |

The RESEARCH.md entry named in the task brief ("open problems in point-vortex dynamics",
2026-09-26) is not in the ledger: `grep` finds neither "Ohsawa" nor "2406.12144" in RESEARCH.md.
The task rules confine this work to this folder, so the ledger was not edited. A ledger line is
proposed in Section 9.

## 2. Setup

**Hamiltonian.** Symplectic form Σ Γj dxj∧dyj and Ht = −½ Σ_{i<j} ΓiΓj log|zi − zj|². Ht is
2π times the usual Kirchhoff Hamiltonian, which only rescales time.

**Translations.** Use Jacobi coordinates u1 = z2 − z1, u2 = z3 − c12, u3 = z4 − c123 and C = the
centre of vorticity, with μ1 = Γ1Γ2/S2, μ2 = S2Γ3/S3, μ3 = S3Γ4/S4, where Sk are the partial
sums. For (1, 1, 1, m) these are μ = (1/2, 2/3, 3m/(3+m)). The linear map preserves
Σ Γ z̄ w = S4 C̄D + Σ μk ūk wk (checked numerically to 4e-15, `vortex.check_jacobi`), so it is
symplectic, and Ht does not depend on C.

**Rotations.** Set u1 = r e^{iφ} and vk = uk e^{−iφ} for k = 2, 3. Then
Σk μk (i/2) duk∧dūk = dJ∧dφ + Σ_{k=2,3} μk dx(vk)∧dy(vk), with J = ½ Σ μk |uk|² (derived in the
`vortex.py` docstring). Ht does not depend on φ, so J is conserved. On a level J the reduced
system has 2 degrees of freedom: canonical variables v2, v3 and Hamiltonian
H_J(v) = Ht(r_J(v), v2, v3), where r_J(v)² = (2J − μ2|v2|² − μ3|v3|²)/μ1. Its equilibria are the
relative equilibria. The canonical coordinates are q = √|μ| x and p = sgn(μ) √|μ| y. We fix the
scale by r = 1 at the equilibrium.

**Equilibrium equations.** F(v) = ∇_v Ht(1, v) − (∂_{Re u1} Ht / μ1)(μ2 x2, μ2 y2, μ3 x3, μ3 y3)
= 0, which is ∇H_J(v) = 0 with 2J = μ1 + Σ μk|vk|². By the reflection symmetries:
* in the collinear family the y-components of F vanish identically on y = 0;
* in the kite family (reflection combined with the exchange of vortices 1 and 2) the
  x-components vanish identically on x2 = x3 = 0.
So only 2 unknowns are solved for.

**The families** (floating-point locations; the certified enclosures are in the certificates):
* Collinear Group I. Ordering along the line: vortex 4 (circulation m), then vortices 3, 1, 2.
  At m = −0.9: z = (−0.465, 0.535, −2.583, −2.793), with the centre of vorticity at 0. The other
  five Group I orderings are relabellings or reflections. They have identical frequencies (checked
  in the survey), and by Theorem 2.11 of Menezes-Roberts there is exactly one solution per
  ordering.
* Convex kite. Vortices 3 (circulation 1) and 4 (circulation m) lie on the axis, on opposite sides
  of the segment joining vortices 1 and 2. At m = −0.05: z = (−0.5, −0.314), (0.5, −0.314),
  (0, 0.582), (0, −0.917).

**Frequencies, signatures and resonance curves (numerical, floating point, from `survey.py`
and a continuation scan):**

| | collinear Group I | convex kite |
|---|---|---|
| linearly stable for | −1 < m < m* = −0.8564135988 (Krein collision) | m_K = −0.1337861981 < m < 0 (Krein collision) |
| Krein signs | (+, −), indefinite | (+, −), indefinite |
| ω1/ω2 | from 1 at m* to ∞ as m → −1 | from 1 at m_K to 1.0664 as m → 0 |
| 1:2 resonance | m = −0.8683877592 | none |
| 1:3 resonance | m = −0.8839592708 | none |
| zero of D | m = −0.8689970082 (a sign change) | none (D/ω1³ ≥ 1.8) |

The Rhombus A frequencies are in Ohsawa's Proposition 6.2. The survey found no other linearly
stable (1, 1, m, m) equilibrium with m in (−1, 0), sampled at 17 values of m with 1500 random
Newton starts each (`data/survey.txt`). (1, 1, m, m) with m < −1 is (1, 1, 1/m, 1/m) after a rescaling of time.

## 3. The theorem and its proof

**Theorem (computer-assisted).** Consider the planar four-vortex problem with circulations
(1, 1, 1, m). For every m in the sets below, the relative equilibrium z0(m) is orbitally stable
(Lyapunov stable modulo rotations). That is: for every ε > 0 there is δ > 0 such that every
solution with |z(0) − z0| < δ exists for all t in R and satisfies
dist(z(t), {e^{iθ} z0 : θ ∈ R}) < ε for all t (z0 centred at its centre of vorticity). This is
stability modulo rotations; translations are handled because the centre of vorticity is
conserved and moves by at most O(δ). The circulations are fixed; perturbations of position are
arbitrary: they may change the angular impulse, the energy and the centre of vorticity.
* (a) z0(m) is the collinear Group I relative equilibrium, and m ∈ [−0.96, −0.85642] \ E, with
  E = [−0.883959270935, −0.883959270782] ∪ [−0.868997008209, −0.868997008057] ∪
      [−0.868387759552, −0.868387758942]
  (endpoints are the exact binary floats printed by `summarize.py`, total length 9.2e-10). The
  three intervals contain respectively the 1:3 resonance (m ≈ −0.8839592708), the zero of D
  (m ≈ −0.8689970082) and the 1:2 resonance (m ≈ −0.8683877592). That each contains exactly one
  such point is numerical and is not needed for the theorem.
* (b) z0(m) is the convex kite relative equilibrium, and m ∈ [−0.13378, −0.0001].

In both cases the reduced quadratic form is indefinite, so a Dirichlet (energy) argument on the
reduced space does not apply.

**Proof.**
1. *Translations.* C is conserved and Ht does not depend on it. We may therefore assume C = 0,
   up to an error |C(0)| ≤ δ·const in the final estimate.
2. *Reduction.* Near the orbit of z0 we have u1 ≠ 0, so (φ, J, v2, v3) are real-analytic
   canonical coordinates (Section 2). J is conserved and v(t) evolves under H_J.
3. *Scaling.* Ht(λz) = Ht(z) − ½ log λ² Σ ΓiΓj, and r_{λ²J}(λv) = λ r_J(v). So if v(t) solves
   the H_J system, λ v(t/λ²) solves the H_{λ²J} system, and λ v* is the equilibrium at level
   λ²J0. The certificate proves J0 ≠ 0 (`J0` field; J0 ∈ [0.49, 0.50] for the kite). A
   perturbation changes J to λ²J0 with λ → 1. Lyapunov stability of v* for H_{J0} then gives
   stability of λ v* for H_{λ²J0}, uniformly for λ near 1.
4. *Arnold's theorem* (V. I. Arnold, Soviet Math. Dokl. 2 (1961) 247-249; see Meyer, Hall and
   Offin, Introduction to Hamiltonian Dynamical Systems and the N-Body Problem, Ch. 13; neither
   was reread here). Take a real-analytic Hamiltonian with 2 degrees of freedom and an equilibrium
   whose quadratic part is H2 = ω1 I1 − ω2 I2, with ω1, ω2 > 0. Suppose k1 ω1 ≠ k2 ω2 for all
   positive integers with k1 + k2 ≤ 4, and bring H to Birkhoff normal form through order 4:
   H = ω1 I1 − ω2 I2 + ½(a I1² + 2b I1 I2 + c I2²) + O(|I|^{5/2}). If
   a ω2² + 2b ω1 ω2 + c ω1² ≠ 0, the equilibrium is Lyapunov stable.
   In our notation H = s1 ω1 τ1 + s2 ω2 τ2 + A τ1² + B τ1 τ2 + C τ2² with (s1, s2) = (+1, −1), so
   a = 2A, b = B, c = 2C, and Arnold's determinant is 2D with D = A ω2² + B ω1 ω2 + C ω1², which
   is H4 on the line H2 = 0. The certificate, for each parameter box, proves:
   * e2 > 0, e4 > 0 and e2² − 4e4 > 0, where x⁴ + e2 x² + e4 is the characteristic polynomial of
     the linearisation. So ω1 > ω2 > 0 are distinct and nonzero.
   * κ_k ≠ 0, with signs (s1, s2) = (+, −). So H2 is indefinite and the linear map to normal
     coordinates is exactly symplectic.
   * ⟨sω, k⟩ ≠ 0 for every monomial of degree 3 and 4 other than the resonant (τ1, τ2)-monomials.
     This is stronger than the non-resonance hypothesis: it excludes 1:1, 1:2 and 1:3.
   * D ≠ 0.
   Hence v* is Lyapunov stable for H_{J0}.
5. Steps 1 to 4 give orbital stability. Stability of the configuration also rules out collisions
   and escape, so the solution exists for all time.

**How the certificate is computed (`certify3.py`).** For each parameter box [m0 − h, m0 + h]:
* **Equilibrium.** A parametric Krawczyk operator encloses the equilibrium v*(m) for every m in the
  box. It uses a t-dependent predictor p(t) = v0 + v1 t and preconditioner Y(t) = Y0 + Y1 t
  (t = m − m0), evaluated with first-order centred forms (`cf.CF`). By Krawczyk's theorem at
  each fixed t, there is a unique zero in p(t) + W.
* **Derivatives of the equilibrium.** v*'(t) and v*''(t) are enclosed by Krawczyk inclusions for
  the differentiated equations, DF v' = −F_m and DF v'' = −(D²F[v', v'] + 2 ∂_m DF v' + F_mm).
* **Taylor coefficients.** The Taylor coefficients of H_{J0} at v*(m) up to order 4 are evaluated
  in second-order centred forms in t (`cf.CF2`): c0 and c1 are exact at t = 0, d2 encloses the
  second derivative over the box, and the range is c0 + c1 t + d2 t²/2 intersected with the naive
  range. The expansion is taken directly in exactly symplectic, preconditioned coordinates:
  floating-point eigenvectors followed by symplectic Gram-Schmidt carried out in Arb, so the
  large cancellations happen inside an exact linear map.
* **Normal form.** The fourth-order Birkhoff normal form runs in the same arithmetic (`bnf.py`).
  Frequencies come from the characteristic polynomial in closed form, eigenvectors from adjugate
  columns, and the Lie generator from W3 with {H2, W3} = −H3. Then
  K4 = H4 + ½{H3, W3} and its resonant part A τ1² + B τ1τ2 + C τ2². Every inequality is decided
  on enclosures. Floating-point numbers enter only as predictors, preconditioners and a choice of
  column, which do not affect validity.
* **Consistency.** The thin enclosure v0 at m0 lies inside p(0) + W, the box where the
  parametric step proved uniqueness. So the exact values at t = 0 and the ranges over the box
  describe one equilibrium branch. This assertion was added after the referee pointed out that it
  was missing. It is now in `certify3.py`, and `check_consistency.py` reran it on all 20,177
  certified boxes: 0 failures.
* **Why the enclosure of R is valid.** F is evaluated in CF2 with value box X, derivative box P
  and zero second derivative. The d2 field then encloses D²F(v,t)[p,p] + 2 ∂_m DF(v,t) p +
  F_mm(v,t) for all v ∈ X, p ∈ P and t ∈ T: it is the second-order chain rule along the straight
  line s ↦ (v + p s, t + s).
* Arb precision is 160 bits. A refused box is split until its width is 1e-10.

## 4. Controls (`controls.py`, output in `data/controls.log`)

All 11 expectations hold:
* collinear m = −0.85 (complex quartet) is refused;
* kite m = −0.2 (past its Krein collision) is refused;
* boxes containing the 1:2 resonance, the 1:3 resonance and the zero of D are each refused with
  the matching reason (resonance monomials ξ2^0 η1 ... (0,1,0,2) and (0,1,0,3); "Arnold
  determinant");
* the boxes at m* and at the kite end point are refused;
* Rhombus A at γ = −0.1 comes out DEFINITE: its reduced H2 is definite, so Ohsawa's case also
  follows from Dirichlet's argument on the reduced space. This is consistent with his
  energy-Casimir proof;
* Rhombus A at γ = −0.3 (unstable) is refused;
* interior boxes of both families are CERTIFIED.

The referee's mutation tests (Section 7) show which bugs the controls and the integration
check catch:
* dropping the 1/2 in K4, flipping the sign of W3, or using 2B in D: the D = 0 control fails and
  the Biot-Savart check disagrees;
* a 1e-6 perturbation of one circulation inside the Hamiltonian: only the independent
  re-derivation catches it;
* forcing the Krawczyk inclusion to pass: no numerical check can catch it; that part rests on
  code review.

## 5. Certificates (`data/cert_*.json`, `data/summary.txt`)

Each box records its exact float endpoints `lo` and `hi`, the certified interval
[m0 − h, m0 + h] ⊇ [lo, hi], and outward-rounded bounds for ω1, ω2, the ratio, A, B, C, D,
D/ω1³ and J0.

| file | interval | boxes | certified | refused | ratio ω1/ω2 | D | J0 |
|---|---|---|---|---|---|---|---|
| cert_collinear_ext.json | [−0.96, −0.95] | 6658 | 6658 | 0 | [14.748, 20.940] | > 0 in every box | [0.0301, 0.0377] |
| cert_collinear.json | [−0.95, −0.85642] | 12542 | 12536 | 6 (the set E) | [1.0157, 14.765] | > 0, except < 0 on the 96 boxes between the D = 0 cluster and the 1:2 cluster | [0.0377, 0.1111] |
| cert_kite.json | [−0.13378, −0.0001] | 983 | 983 | 0 | [1.00069, 1.06731] | > 0 in every box | [0.4889, 0.49999] |

* The tiling is exact in all three files: consecutive `hi` equals the next `lo`, and the ends
  match the interval. This was checked by `summarize.py` and independently by the referee in
  exact rationals.
* Wall time on 4 cores: 25 min for the main collinear file, 16 min for the extension, 2 min for
  the kite.
* A preliminary collinear run, made before the exact-tiling bookkeeping, left float gaps of
  about 1e-16 between boxes (found by the referee). It is superseded and is not used.
* The sign of D does not matter to Arnold's theorem; only D ≠ 0 does.

## 6. Rigorous versus numerical

| claim | status |
|---|---|
| Theorem (a), (b) on the stated sets | proved (ball-arithmetic certificate plus the argument in Section 3; independent check in Section 7) |
| Arnold's theorem, Krawczyk's theorem, symplecticity of Jacobi coordinates | from the literature / standard; the Jacobi identity was also checked numerically |
| rotation reduction formula dJ∧dφ + Σ μk dxk∧dyk | derived by hand (`vortex.py` docstring); rechecked by the referee |
| the certified collinear branch is the Menezes-Roberts Group I solution | from the literature (their Thm 2.11: one solution per ordering) plus our enclosure of a collinear solution with that ordering |
| each exceptional interval contains exactly one resonance or zero of D | numerical (floating-point bisection of sign changes) |
| linear stability ranges (−1, m*), (m_K, 0); values of m*, m_K | numerical here (floating point); (−1, m*) is Menezes-Roberts's theorem |
| stability on (−1, −0.96) and (−0.85642, m*) of the collinear family, (m_K, −0.13378) and (−0.0001, 0) of the kite, and at the three points in E | **not established**. On the end intervals the floating-point computation shows D ≠ 0 and no low-order resonance, but no certificate was run: near m → −1 the two close vortices force boxes below 1e-8. At the resonances and at D = 0, Arnold's theorem does not decide; higher-order theorems (Markeev-type, for the 1:2 and 1:3 cases) would be needed. |
| only Rhombus A is linearly stable among mixed-sign (1,1,m,m) | numerical (multistart survey), not a proof |
| Biot-Savart integration agrees with A, B, C, D | numerical check of the algebra (Section 7) |

## 7. Independent checks

**Floating-point integration (`check_bnf_numeric.py`, not part of the proof).** The full planar
four-vortex equations are integrated (DOP853, rtol 1e-13) from the relative equilibrium, displaced
along the linear normal modes with small actions (τ ≈ 1e-6 to 1e-5). The phase velocities of the
two normal-mode angles are measured, and the fit ∂H/∂τ1 = s1 ω1 + 2A τ1 + B τ2,
∂H/∂τ2 = s2 ω2 + B τ1 + 2C τ2 recovers the normal-form coefficients:

| m | D (normal form) | D (integration) | 2A nf / int | B nf / int | 2C nf / int |
|---|---|---|---|---|---|
| −0.90 collinear | 6.8566 | 6.8556 | 18.049 / 18.053 | −1.186 / −1.196 | 4.552 / 4.555 |
| −0.93 collinear | 3.0413 | 3.0445 | 31.500 / 31.512 | −2.829 / −2.823 | 2.043 / 2.043 |
| −0.95 collinear | 1.7774 | 1.7756 | 48.390 / 48.420 | −2.922 / −2.913 | 1.148 / 1.144 |
| −0.88 collinear (near 1:2) | 14.143 | 14.052 | 13.313 / 13.347 | 3.052 / 2.895 | 8.673 / 8.675 |
| −0.05 kite | 478.63 | 476.42 | 1.603 / 1.559 | 11.835 / 11.696 | 93.016 / 92.830 |

**Adversarial referee (independent subagent; full report `referee/VERDICT.md`, its code
`referee/indep.py`).** Verdict: **"confirmed with corrections"**.

What the referee did:
* **(A) Independent normal form.** It re-derived the normal form with code that shares nothing
  with this project:
  * the equilibria come from the Kirchhoff condition;
  * a different Jacobi tree and a different rotation gauge;
  * Taylor coefficients by mpmath differentiation at 60 digits;
  * a real-coordinate homological equation;
  * the actions-only part by exact torus averaging.

  ω1, ω2, the ratio, A, B, C, D, D/ω1³ and J0 agree to 10 significant digits at m = −0.9,
  −0.87, −0.93 (collinear) and −0.05, −0.1 (kite). It confirmed that D is exactly one half of
  Meyer-Hall-Offin's determinant, with the same sign and the same zero set.
* **(B) Audit.** It judged valid:
  * the rotation reduction and its symplecticity;
  * the symmetric-subspace reductions;
  * the centred-form rules, including the t²/2 interval;
  * the parametric Krawczyk operator and the enclosures P and Q;
  * the preconditioner;
  * that every Arnold hypothesis is decided on balls;
  * the scaling step.
* **(C) Reruns.** `controls.py` passed. It re-verified sampled boxes of both final certificates,
  including the neighbours of each refused cluster, and checked the exact tiling.
* **(D) Mutation tests.** Results are in Section 4.
* **(E) Prior art.** It re-read the sources and found no prior proof for either family.

Its corrections, and what was done:
1. Do not use the preliminary run, which had float gaps. Done: removed from the tree.
2. Regenerate the kite file in the loss-free format. Done: the committed `cert_kite.json` was
   produced by the final code.
3. Assert that v0 lies inside p(0) + W. Done: added to `certify3.py` and checked on all
   20,177 certified boxes (`data/consistency.log`).
4. Document the argument for the enclosure of R. Done: in the `certify3.py` docstring and
   Section 3.
5. State the stability notion precisely and list the open points. Done: Section 3 and
   Section 6.
6. Put the Ohsawa quote in context: it concerns the (1,1,m,m) families. Done: Section 1. Cite
   Kurakin-Ostrovskaya 2021. Done.

The extension file `cert_collinear_ext.json` was finished after the referee stopped. Its
tiling, D > 0 and consistency were checked here with the same scripts; the referee did not
review it.

## 8. Reproduce

```
pip install python-flint mpmath sympy numpy scipy
cd research/four-vortex-stability
python3 survey.py 1500                 # numerical survey, about 10 min
python3 check_bnf_numeric.py -0.9      # Biot-Savart check (also -0.93, -0.95, -0.88; "-0.05 three-kite")
python3 controls.py                    # negative and positive controls, about 10 s
./run_all.sh                           # the three final certificates, about 1 h on 4 cores
python3 summarize.py data/cert_kite.json data/cert_collinear.json data/cert_collinear_ext.json
```
The float continuation tables `data/*_table.json` are rebuilt on first use. They only supply
starting points.

## 9. Proposed RESEARCH.md line (not added: the task confined changes to this folder)

"2026-09-26 four-vortex mixed-sign nonlinear stability: Ohsawa arXiv:2406.12144 Prop. 6.2 settles
Rhombus A; (1,1,1,m) collinear Group I (Menezes-Roberts 2018) and a convex (1,1,1,m) kite were
open; both proved orbitally stable by a certified Arnold normal form on the sets in
research/four-vortex-stability/REPORT.md. Triangle+centre is 1:1 for all κ (Kurakin-Ostrovskaya
2021). Re-search: no, unless a citing paper of Menezes-Roberts appears."
