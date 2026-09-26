# Referee report: Lyapunov stability of four-vortex relative equilibria (1,1,1,m) via Arnold's theorem

Referee copy: `scratchpad/referee/four-vortex-stability` (first copy), `v2/` and `v3/` (re-copies after the
coordinator's update adding `certify_interval` and outward-rounded JSON output). Nothing under
/home/user/GENChase was modified. CPU use kept to at most 2 processes while the certification ran.

## A. Independent re-derivation of the normal form

Own code: `scratchpad/referee/indep/indep.py` (mpmath, 60 digits). It shares nothing with the project code:

- Relative equilibrium found from the Kirchhoff condition sum_k G_k/(z_j - z_k) = lambda conj(z_j)
  (collinear: 1-D equations with x2 - x1 = 1 and centre of vorticity 0; kite: unknowns y1, y3, y4, lambda
  with the symmetric ansatz). Only the project's float positions were used as a starting guess.
- Different Jacobi tree: a = z2 - z1, b = z4 - z3, c = c34 - c12 (reduced circulations 1/2, m/(1+m),
  2(1+m)/(3+m)); rotation gauge fixed on c (not on u1), c = rho > 0, rho^2 = (2 J0 - mu_a|va|^2 - mu_b|vb|^2)/mu_c.
  Physical Hamiltonian H = -(1/2pi) sum G_i G_j log r_ij.
- Taylor coefficients to order 4 by high-precision numerical differentiation (mpmath.diff), not by
  truncated power series.
- Normal form in real coordinates: symplectic diagonalisation from mpmath.eig (checked T^T J T = J and
  T^T S T = diag(s w) to 1e-59), homological equation {W, H2} = H3 solved as a 20x20 linear system on cubic
  monomials, K4 = H4 + (1/2){H3, W}, and the actions-only part obtained by exact torus averaging
  (8x8 quadrature on the angles), not by picking monomials xi^a eta^a.
- Scale fixed as in the project (|z2 - z1| = 1), values converted to the project's time unit (factor 2 pi),
  so A, B, C, D are directly comparable. Scale/time invariants D/w1^3 (time) and D J0/w1^3 (both) also reported.

Results (independent vs project float pipeline; all digits shown agree):

| case | w1 | w2 | w1/w2 | D | D/w1^3 | J0 | signs |
|---|---|---|---|---|---|---|---|
| collinear m=-0.9  | 1.659210568 | 0.3871887427 | 4.285275849 | 6.856631657 | 1.501088521 | 0.07634685771 | (+,-) |
| collinear m=-0.87 | 1.377899694 | 0.6564076183 | 2.099152501 | 17.13811048 | 6.551038131 | 0.1001405486 | (+,-) |
| collinear m=-0.93 | 1.830729747 | 0.2163878123 | 8.460410628 | 3.04134645  | 0.4956706226 | 0.05302495517 | (+,-) |
| kite m=-0.05      | 2.864018912 | 2.694286547 | 1.062997147 | 478.6294987 | 20.37378961 | 0.4966707469 | (+,-) |
| kite m=-0.1       | 2.715639145 | 2.593976132 | 1.046902133 | 470.0154966 | 23.46907626 | 0.4923827286 | (+,-) |

A, B, C also agree individually to 10 significant digits (e.g. m=-0.9: A 9.024674998, B -1.186360949,
C 2.276023851). Agreement is at the 1e-10 relative level, limited only by the project's float run.

Arnold's determinant convention. With K4 = A tau1^2 + B tau1 tau2 + C tau2^2 (B the full coefficient of
tau1 tau2) and H2 = w1 tau1 - w2 tau2, the zero set of H2 in the positive quadrant is (tau1, tau2) proportional
to (w2, w1), so the condition is K4(w2, w1) = A w2^2 + B w1 w2 + C w1^2 != 0, which is bnf.py line 330.
In Meyer-Hall-Offin notation H = w1 I1 - w2 I2 + (1/2)(A' I1^2 + 2 B' I1 I2 + C' I2^2) one has A' = 2A,
B' = B, C' = 2C, so D_MHO = A' w2^2 + 2B' w1 w2 + C' w1^2 = 2 D_code: same zero set and sign. If the Krein
signs are (-,+) instead of (+,-), multiplying H by -1 flips D, so D != 0 is unaffected. The formula is correct.
The Lie-transform step is also correct: with {H2, W3} = -H3 (bnf.py 312-314, checked against the bracket
convention at 316-322 and {xi, eta} = -i), K4 = H4 + (1/2){H3, W3} (line 324); the result is independent of
the bracket sign convention as long as it is used consistently, which it is.

## B. Rigor audit

What I checked and found valid:

- Rotation reduction (vortex.py docstring): with u_k = v_k e^{i phi}, (i/2) du^d(conj u) =
  (i/2) dv^d(conj v) + (1/2) d|v|^2 ^ dphi, and for u1 = r e^{i phi} it is r dr ^ dphi; summing with weights
  mu_k gives dJ ^ dphi + sum mu_k dx(v_k)^dy(v_k). Symplectic, and equilibria of Hred at fixed J are exactly
  relative equilibria mod rotation. F in vortex.F_and_DF (lines 102-114) is grad Hred up to a nonsingular
  diagonal factor (dr/dv = -mu_k v_k/mu1 at r = 1). Confirmed independently by A.
- Symmetry reduction: collinear (free = (0,2)) uses the reflection y -> -y; kite (free = (1,3)) uses
  x -> -x combined with the swap 1 <-> 2 (equal circulations), which maps u1 = 1 to 1 and (x2,y2,x3,y3) to
  (-x2,y2,-x3,y3). Both leave Ht invariant, so the other components of F vanish on the subspace. Numerically:
  max |F_y| on the collinear subspace = 0, max |F_x| on the kite subspace = 1.1e-16 over 200 random points.
  The Krawczyk proof on the subspace gives an equilibrium of the full system; the Hessian and higher terms
  are then computed in all 4 variables. Valid.
- Centred forms (cf.py): CF product, quotient, sqrt, log rules and CF2 product rule
  (f g)'' = f''g + 2f'g' + fg'' and composition rule phi''(f) f'^2 + phi'(f) f'' (lines 225-235), with the
  derivatives of 1/x, sqrt, log (lines 237-258), are correct enclosures. T2h = [0, h^2/2]: arb's radius is
  stored as a mag_t rounded up, so arb(h*h/4, h*h/4) did contain h^2/2 in 100000 random trials (no
  under-enclosure). Using best() (range enclosure intersected with Taylor enclosure) inside products is valid.
- Parametric Krawczyk (certify3.py 93-116): N = -Y(t)F(p(t),t), C = I - Y(t) DF(p(t)+w,t) with X carrying
  derivative v1 (w is a t-independent auxiliary), test N + C W inside int W. This is Krawczyk's theorem for each
  fixed t with an arbitrary t-dependent predictor and preconditioner. Valid.
- Derivative enclosures. P (lines 118-137): linear Krawczyk for DF(v*(t),t) v' = -F_m; Yb and Cb are
  enclosures over t of Y(t)F_m and I - Y(t)DF at the same t, so the test is valid pointwise in t. Q (138-152):
  R is obtained as the d2 field of F evaluated on (value v0, derivative P, second derivative 0). This is
  valid but the reason is not stated in the code: for fixed t the linear path s -> v*(0) + a_t s with a_t the
  mean slope on [0,t] (in P) satisfies all CF2 invariants on [0,t] (the segment lies in the convex box Xr), so all
  intermediate best() sets contain the true intermediates at v*(t); and because every d2 formula is bilinear in
  interval "slope" slots, it also encloses the mixed second derivatives with slope v*'(t) in P. Hence
  R(t) = D2F[v',v'] + 2F_vm v' + F_mm is enclosed. The docstring (lines 6-10) should carry this argument.
- The final CF2 equilibrium (c0 = thin v0, c1 = thin solve v1s, d2 = Q, v = Xr) is a consistent CF2 object.
  solve_thin (interval Gaussian elimination with midpoint pivoting) encloses the point solution.
- Preconditioner L: symplectic Gram-Schmidt of float columns in arb encloses the exact Gram-Schmidt output,
  which is exactly symplectic (checked algebraically: omega(a1,b1) = omega(a2,b2) = 1, all cross terms 0).
  The ball entries enclose that one exact symplectic matrix, so coordinates stay canonical.
- bnf.normal_form in ball mode certifies: e2 > 0, e4 > 0, disc > 0 (ellipticity with distinct frequencies,
  excludes 1:1), w2^2 > 0, kappa != 0 for each eigenvector (so the adjugate column is a nonzero eigenvector;
  the column is chosen on floating-point midpoints at line 254-261, which is harmless because only kappa's
  certified sign is used), Krein signs from certified signs of kappa, <s w, k> != 0 for all k = a - b from
  monomials of degree 3 and 4 (all 0 < |k| <= 4, so no resonance of order <= 4), and D != 0 via best().
  certify3.py 185-191 declares CERTIFIED only when the Krein signs differ and D is certified nonzero;
  equal signs give DEFINITE (Dirichlet), which is also correct. No sign decision is taken on a float midpoint.
  Every comparison on CF/CF2 is an arb comparison of best(), which is True only when certain.
- Passage to orbital stability: J0 != 0 is certified (J0 in [0.0377, 0.1111] collinear, [0.4889, 0.49999]
  kite). z -> lambda z maps level J to lambda^2 J and changes Ht by a constant (dynamics rescaled in time),
  so a perturbation at level J0 + delta is conjugate to one at level J0 near the equilibrium, with lambda -> 1.
  Arnold's theorem gives Lyapunov stability of the reduced equilibrium, hence stability modulo rotation and
  translation for all perturbations of positions (circulations fixed). Correct.

Flaws and gaps found (none invalidates the certified statements as they now stand):

1. Coverage gaps in the first version (fixed). The original `certify3.run` (my first copy, lines 209-220)
   certified [m0 - h, m0 + h] for float m0, h computed from float edges; I checked with exact rationals that
   5057 of 9349 consecutive boxes of the initial grid do not touch (gaps up to 1.1e-16), the first box misses
   5.6e-17 at the left end, and 9352 of 16032 simulated splits did not cover their parent exactly. The
   preliminary run (now data/prelim_collinear_run1.json) therefore did not cover its interval. The updated
   `certify_interval` (h rounded up with nextafter until [m0-h, m0+h] contains [lo, hi] exactly, children
   [a, c], [c, b] with the same float c) fixes this; I verified exact tiling and exact containment for every box
   of cert_kite.json and cert_collinear.json with Fractions.
2. Lossy certificate fields (partly fixed). Before the latest change D, ratio etc. were stored with arb's str(),
   which prints e.g. "[+/- 2.03e+6]" for a ball whose certified lower bound is 691841 > 0. summarize.py then
   reported D of both signs over the kite (a false alarm I traced by recomputing: D > 0 in memory on those
   boxes). cert_kite.json was produced before the fix and still has lossy D strings, so it cannot be
   re-verified from its own fields; regenerate it with the current certify3.py. cert_collinear.json uses the
   new outward-rounded [lo, hi] floats.
3. Missing consistency check (certify3.py around line 117): nothing checks that the thin ball v0 lies in
   p(0) + W, i.e. that the thin zero and the parametric branch are the same equilibrium. If they differed the
   CF2 object built at lines 154-160 would mix two branches. I instrumented it: v0 in p(0)+W held on all 20
   sample boxes and on the 54 smallest certified collinear boxes (W about 1.2e-11, |v0 - vm| about 1e-15).
   Recommend asserting it.
4. Undocumented argument for R (point in B above): correct but should be written out.
5. Minor: `rec['m']` still stores rounded endpoints; use lo/hi/m0/h (now present) in any paper text.

## C. Reruns

- `python3 controls.py` (my copy): all 11 lines "ok", "controls failing: 0" (unstable members refused;
  1:2, 1:3, D = 0, m*, kite end point refused with the right reasons; Rhombus A g = -0.1 DEFINITE, g = -0.3
  refused; m = -0.9 and kite m = -0.05 CERTIFIED).
- 20 sample boxes with certify_box (12 collinear, h = 5e-6; 8 kite, h = 2e-5): 16 CERTIFIED; refusals were
  collinear -0.949 (w2^2 > 0 not certified at that width), -0.9349, -0.9384, -0.9337 (D not certified at that
  width; true D/w1^3 about 0.3-0.4) and kite -0.001 (D not certified at that width). All refusals are
  overestimation at the given width and are resolved by bisection in the final runs.
- cert_kite.json ([-0.13378, -0.0001]): 983 boxes, all CERTIFIED, exact tiling, Krein signs (+,-) throughout,
  ratio in [1.000632, 1.074570], J0 in [0.48887, 0.49999]. 12 boxes rechecked (10 random plus both end
  boxes): all CERTIFIED again. D > 0 on the whole range (from recomputation; the stored strings are lossy).
- cert_collinear.json ([-0.95, -0.85642]): 12542 boxes, 12536 CERTIFIED, 6 REFUSED in three clusters
  [-0.883959270935, -0.883959270782] (1:3), [-0.868997008209, -0.868997008057] (D = 0),
  [-0.868387759552, -0.868387758942] (1:2 with D not certified around it). Exact tiling, every box contains
  its [lo, hi]. 20 boxes rechecked (12 random, the 6 certified neighbours of the refused clusters, both end
  boxes): 20/20 reproduce CERTIFIED. D > 0 on 12440 boxes, D < 0 on 96 boxes, the sign changing only across
  the D = 0 cluster and the 1:2 cluster (a pole of A, B, C), consistent with a float scan of D/w1^3 over
  [-0.99, -0.857] which shows exactly one zero of D (near -0.8690). No certified ratio enclosure contains 1, 2 or 3.
- cert_collinear_ext.json ([-0.96, -0.95]) was still running when I finished; not reviewed.

## D. Mutation tests

For each mutation: certify_box at collinear -0.9, -0.87 (h = 2e-6) and kite -0.05 (h = 1e-4), controls.py,
and check_bnf_numeric.py -0.9 / -0.05 three-kite (baseline: integration D 6.8556 vs 6.8566 collinear,
476.4 vs 478.6 kite; the check resolves D to about 1 per cent).

| mutation | CERTIFIED still produced? | controls.py | check_bnf_numeric | independent (A) |
|---|---|---|---|---|
| M1 drop 1/2 in K4 (bnf.py 324) | yes (D = -15.4 at -0.9) | fails "box on D = 0" (1 failing) | detects: D -15.37 vs 6.86; kite 684.7 vs 476.4 | detects |
| M2 flip sign of W3 (bnf.py 314) | yes (D = 51.3) | fails "box on D = 0" | detects: 51.3 vs 6.86; kite 66.4 vs 476.4 | detects |
| M3 D with 2B (bnf.py 330) | yes (D = 6.09) | fails "box on D = 0" | detects: 6.09 vs 6.86 (11 %); kite 570 vs 476 | detects |
| M4 G4 + 1e-6 in Ht only (vortex.py Ht_of_u) | yes | passes (0 failing) | does not detect (D 6.8568 vs 6.8557) | would detect (w1 1.6592079 vs 1.6592106, 6th digit) |
| M5 Krawczyk test forced true with W = 1e-14 | yes | not run | not affected (float path) | not applicable |
| M6 Krawczyk forced true with rho = 1e-30 | yes | not run | not affected | not applicable |

So errors in the normal-form algebra are caught by both the controls and the Biot-Savart integration; a
tiny inconsistency in the Hamiltonian is caught only by an independent high-precision recomputation such as A;
and a broken Krawczyk inclusion test is caught by nothing (the gradient-contains-0 sanity check at
certify3.py 176-178 did not fire), so that part rests on code review, which it passes (B).

## E. Prior art

Sources re-opened (arXiv PDFs via curl + pdf2txt.py):

- Ohsawa arXiv:2406.12144v2. The quote is verbatim (text lines 196-198): "Some of those four-vortex relative
  equilibria are known to be linearly stable, but their nonlinear stability is an open question [38]", where
  [38] is Roberts (2013) and "those" are the Hampton-Roberts-Santoprete two-pairs (1,1,m,m) equilibria.
  It does not refer to the (1,1,1,m) families. Proposition 6.2: Rhombus A is Lyapunov stable to
  F^{-1}(0)-preserving perturbations for -2 + sqrt 3 < gamma < 0 or 0 < gamma < 1, linearly unstable for
  -1 < gamma < -2 + sqrt 3 (matches controls 8 and 9: g = -0.1 definite, g = -0.3 unstable).
- Roberts arXiv:1301.6194: linear stability and Dirichlet-type nonlinear stability for same-sign circulations
  (Theorem 3.5); mixed-sign collinear case described as "far more subtle"; no nonlinear result for (1,1,1,m).
- Hampton-Roberts-Santoprete arXiv:1208.4204: existence/classification for (1,1,m,m); no stability proofs.
- Menezes-Roberts arXiv:1704.08647: Theorem 2.11 (counts: for -1 < m <= -1/2 exactly the 6 Group I solutions);
  Group I = vortex 4 exterior, ordering (4 3 1 2) is listed in Table 1 under Group I (the project's branch:
  positions -2.79 (4), -2.58 (3), -0.47 (1), 0.53 (2) at m = -0.9, confirmed by my own RE solve).
  Theorem 3.9: Group I linearly stable for -1 < m < m*, m* about -0.8564. Remark 3.10(3): all solutions are
  saddles of H on I = const (Morse index 2), "with mixed signs it is possible for a saddle to be linearly stable",
  so Dirichlet does not apply; this is consistent with the (+,-) Krein signs found. No nonlinear stability claim.
- Perez-Chavela-Santoprete-Tamayo arXiv:1407.7151: counts and bifurcations of symmetric (kite) relative
  equilibria for (1,1,1,Gamma4); no stability analysis.
- Kurakin-Ostrovskaya, Regul. Chaotic Dyn. 26 (2021) 526-542 (abstract from mathnet.ru rcd1130): (1,1,1,kappa)
  but for the centred triangle (three unit vortices on a circle around the fourth); proves stability of the
  degree-4-truncated reduced system for kappa in (-3, 0) with resonance analysis. Different configuration;
  not the collinear or kite families.
- New item found: Ibrahim-Shen, arXiv:2609.23719 (20 Sep 2026), long-time stability of hierarchical point
  vortex configurations via a modified Birkhoff normal form; general N, not these families, not Lyapunov stability.

Queries run (WebSearch): "four vortex collinear relative equilibria nonlinear stability Arnold theorem Birkhoff
normal form"; "\"three equal vorticities\" OR \"three equal circulations\" four vortex kite stability";
"Kurakin Ostrovskaya 2021 Regular and Chaotic Dynamics four vortex stability 526-542";
"\"Existence and stability of four-vortex collinear relative equilibria\" cited by nonlinear stability";
"Menezes Roberts collinear four vortex \"three equal vorticities\" Lyapunov stability KAM cited";
"four point vortices opposite signs relative equilibrium Lyapunov stability Arnold determinant computer-assisted";
"Lyapunov stability relative equilibria four vortices mixed sign circulations kite convex 2024 2025 arXiv";
"\"Resonances in the Stability Problem of a Point Vortex Quadrupole on a Plane\" abstract". Also Crossref and
Semantic Scholar API lookups for the Kurakin-Ostrovskaya abstract, and a WebFetch of the arXiv abstract page of 2609.23719. No paper found that proves Lyapunov (nonlinear) stability of the collinear (1,1,1,m) Group I
solutions or of a (1,1,1,m) convex kite with m < 0. Limitation: Google Scholar "cited by" lists were not
accessible, so the citation search is by keyword only.

## Overall verdict: confirmed with corrections

The normal form, frequencies, Krein signs and Arnold determinant are reproduced to 10 digits by an independent
derivation with a different reduction, a different Taylor method and a different normalisation algorithm; the
determinant formula and its sign/factor convention match Arnold's theorem as stated in Meyer-Hall-Offin; every
hypothesis of the theorem (ellipticity, distinct frequencies, no resonance of order <= 4, indefinite H2, D != 0,
J0 != 0 for the scaling step) is decided by certified ball comparisons, never on a float midpoint; the enclosures
(centred forms, parametric Krawczyk, P, Q, second-order chain rule) are valid; the final certificates tile
their intervals exactly and 32 of their boxes reproduce on recomputation. On this basis I accept: the collinear
Group I equilibrium is Lyapunov (orbitally) stable for every m in [-0.95, -0.85642] except three clusters of
width at most 6.1e-10 around the 1:3 resonance (-0.8839592708), the zero of D (-0.8689970081) and the 1:2
resonance (-0.8683877592); the convex kite is stable for every m in [-0.13378, -0.0001]. Corrections required:
(1) do not use the preliminary run (data/prelim_collinear_run1.json), whose boxes leave 1e-16 gaps; (2) regenerate
cert_kite.json with the current certify3.py so its D and ratio fields are outward-rounded and re-verifiable;
(3) add the missing check v0 in p(0)+W in certify3.py before building the CF2 equilibrium; (4) document the
argument that the d2 field computed with zero input second derivative encloses R(t); (5) state stability as
"modulo rotations and translations, circulations fixed", and note that the refused clusters and the endpoints
m*, the kite end point and m -> 0 remain open; (6) the prior-art statement should cite Ohsawa's quote as being
about the (1,1,m,m) family, and mention Kurakin-Ostrovskaya (2021) as the nearest nonlinear result for (1,1,1,kappa).
