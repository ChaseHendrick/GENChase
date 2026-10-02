# Review of the continuum route to reentry (travelling wave of the TP06 cable on a ring)

**This is an in-project reading by a separate agent. It is not an outside review.** Nobody outside the project has
read these files, and nothing below should be quoted as external confirmation.

- Date: 2026-10-02
- Reviewer: separate agent (adversarial, in-project reading), working from the files only
- Scope: formulation and reasoning of `ap-reentry/continuum/PLAN.md` (sections 1 to 6, 8, 10; sections 7 and 9 only where
  they bear on the formulation; placeholders not reported), `LOG.md`, `tw_model.py`, `tw_bvp.py`, `tw_shooting.py`,
  `tw_branch.py`, `comoving19.hpp`, `comoving_field.cpp`, `wrap_pilot.cpp`, `wrap_run.py`, `check_comoving_field.py`,
  `results/check_comoving_field.json`, the cell model `tp06_19d.py` and `proof/ring19.hpp`, and the window bound in
  `proof/engine.hpp` (class `Gronwall`). Raw branch rows and pilot summaries in the session scratchpad were read only.
- Not done: no CAPD compile, no long run, nothing committed or pushed, no existing file edited. Four short scripts
  (kept in the session scratchpad, not in the repository) were run, each as `nice -n 10 timeout 120 python3 ...`; their
  output is quoted in the section "Checks I ran".
- Severity key: error = statement or code is wrong; gap = needed for the proof or the claim and missing; unclear =
  cannot be judged from the text, or two statements disagree; minor = wording or small fix.

Summary: I found no error in the comoving ODE, the first integral, the ring condition, or the spectral eigenvalue
problem (6). I found four gaps that matter for the proof design (findings 1 to 4), one incomplete case analysis in
section 6 (finding 5), and several smaller points.

---

## Findings

### 1. gap (high): the Krawczyk formula with an interval kappa and a kappa-independent box will not scale as written

Location: PLAN section 4 "Existence test"; section 5; section 8, finding on P4.

What: K(X) = ubar - C F(ubar,[kappa]) + (I - C DF(X,[kappa]))(X - ubar) uses F(ubar,[kappa]) as an interval vector and
one box X for the whole kappa piece.

Why: two separate costs.
(a) Wrapping in the product C F(ubar,[kappa]). Component i of F(ubar,[kappa]) has width about |d_kappa F_i| dkappa, and
the expanding rows of d_kappa F are large. The true Newton correction is C d_kappa F dkappa = (du/dkappa) dkappa, which is
moderate because the huge expanding component is absorbed by moving the nodes. The interval product C * (box) gives
|C| |d_kappa F| dkappa, which is larger by the cancellation factor. P4 shows the size of d_kappa F: a kappa radius of 1e-9
relative (2.2e-9 absolute) gives radius/(r0|D|) of 45 to 52 against 0.53 for point kappa, over a 4 ms upstroke segment.
My order-of-magnitude arithmetic from those numbers: image displacement about 50 x 1e-12 x 1.4e4 = 7e-7 for a kappa radius of
2.2e-9, i.e. about 3e2 (scaled units) per unit kappa. For a box radius rho and ||C|| of order 1, dkappa is then about
rho / 3e2, which is 3e-12 for rho = 1e-9. Over the range 0.2 to 2.19 that is of the order of 1e11 to 1e12 pieces if the
formula is used literally (an estimate with stated assumptions, not a measurement; even rho = 1e-6 gives about 1e9).
(b) The box X must contain the whole zero curve u(kappa) over the piece, so rho >= |du/dkappa| dkappa / 2. The profile
timing moves with kappa (T'(kappa) is about 87 to 90 ms per unit kappa at the fast end and about -143 at the slow end,
from the branch rows), so nodes in the upstroke move by many scaled units per unit kappa.

Fix: (i) evaluate the kappa dependence in centred (mean-value) form: F(ubar,kappa) = F(ubar,kbar) + d_kappa F([kappa]) (kappa - kbar),
and multiply C into the column d_kappa F as a matrix-vector product, not into a box; (ii) centre X on the tangent
predictor ubar(kbar) + u'(kbar)(kappa - kbar), so X only has to hold the second-order deviation; (iii) then re-state in
PLAN section 5/9 the piece count from |C d_kappa F| and the second-order term, and measure it on one piece with the C1
dimension-21 run. Until then the cost of the kappa family in section 9 cannot be extrapolated from P4.

### 2. gap: gluing kappa pieces needs a common node layout, and the argument should be stated

Location: PLAN section 5.

What: "consecutive pieces are glued by uniqueness (the zero of the overlap lies in both boxes)".

Why: the unknown vector of a piece consists of nodes at fixed durations Delta_i after the Sigma_up crossing, and the
durations come "from the numerical orbit" (section 4). If adjacent pieces use different Delta_i or node counts, their boxes
live in different spaces and "the zero lies in both boxes" has no meaning. Also, one overlap point is enough but must be
argued: if the zero z_j(k*) of piece j lies in int X_{j+1}, then it is a zero in X_{j+1}, equal to z_{j+1}(k*) by
uniqueness; the set of kappa in the overlap where z_j = z_{j+1} is closed, and open because both curves are continuous
and z_j(k*) is interior to X_j and X_{j+1}; hence the curves agree on the whole overlap.

Fix: use one layout (same Delta_i, same m_A, m_B) for neighbouring pieces, or compare at the Sigma_up node u_0 (18
coordinates) and push that box through the other layout. State the open-closed argument in one paragraph.

### 3. gap: the first step of a segment that starts on a section cannot pass the branch certification as coded

Location: PLAN section 4 "The h/j event"; `wrap_pilot.cpp`, the check
`low ? !(V.rightBound() < -40.0) : !(V.leftBound() > -40.0)` applied to the step enclosure widened by dstar = 1e-9.

What: the pilot throws "branch ... not certified" unless V is strictly on its side on the whole step enclosure. A segment
that starts on Sigma_up or Sigma_down has V = -40 at its first instant, and the enclosure is widened by 1e-9, so the
check fails by construction. The pilots avoided this (P1 starts at V about -38 mV, P2 and P3 inside the pieces), so the
section start has not been exercised. The same holds for the last step of a piece (it must end on V = -40).

Why it matters beyond code: the text of section 4 says "valid only if V > -40 on every step enclosure". Literally that
is unattainable at the section; what is true and sufficient is: W > 0 (resp. W < 0) is certified on the first step
enclosure, so V(s) > -40 (resp. < -40) for s > 0, and the F_hi (resp. F_lo) formula is the model's one on (0, h]. Similarly
the last step ends on the section via the patched PoincareMap with a validation re-run, as `engine.hpp` does for the
discrete ring ("designated crossing/exempt rules"), which the comoving pilot does not yet have.

Fix: write the exempt rule into PLAN section 4 (monotone-crossing argument at both ends of each piece, with the dstar
widening handled), implement it in the comoving engine, and pilot a segment that starts on Sigma_up and one that
starts on Sigma_down.

### 4. gap: the window rows (A_W, A_C) and their kappa factor are not tested by any check

Location: `comoving19.hpp` `windowRows`; `check_comoving_field.py`; `wrap_pilot.cpp` `CGronwall`.

What: I re-derived the rows and they are correct: true minus window in the W row is -kappa (f_V^true - f_V^win)/sigma_W
= +kappa Pref R(zeta)/sigma_W (since f_V contains -I_CaL = -Pref g(zeta)), and the Ca_ss row equals ring19's
`prefactorField` row 1. The index mapping in `bound` is right (row 0 of `amap` to IW, row 1 to index 16). The tails T0, T1,
T2 are for the right variable (zeta, with alpha = 2 sigma_V/RTF for the scaled V; zeta is affine in V so no zeta''
term). In dimension 21, DA, the Hessian row sums and the row sums of J all run over the kappa column, so the
dependence of the W row on kappa enters eps1, M2 and the C1 inflation. For dimension 20 the kappa derivative is not
tracked, which is fine as kappa is then a parameter.

But no test exercises A_W. `check_comoving_field.py` always uses degree K = 24 on |V - 15| < 8 mV, where |zeta| <= 0.6
and the tail is about (0.6/2 pi)^26 = 1e-26 of the field, far below its 1e-12 tolerance. So the factor kappa in A_W (and
A_C) could be wrong and the check would still pass; its negative control (kappa x (1 + 1e-6)) only tests the main field.

Fix: add a test with a low degree (K = 2 or 4, the input file already has a K column) and |zeta| up to about 3:
compare (quotient field minus window field) with (A_W, A_C) R(zeta), R computed from the exact quotient, at the three
kappa values, with a negative control on the kappa factor. Also note that the pilot's Gronwall inflations (2e-52, 2e-43)
are far below double precision of the quantities inflated; harmless, but they show the pilots do not exercise the bound
numerically.

### 5. gap: section 6 case analysis is incomplete; an exact identity decides part of it

Location: PLAN section 6, bullet "Not established numerically yet".

What: the text says that if T stays bounded as c -> 0 then L -> 0 along the branch, and that the continuation below
kappa = 0.199 decides between that and "T -> infinity at a positive c".

Why this is incomplete: from W' = kappa (W - f_V) the only periodic solution is
W(s) = kappa * integral_0^infinity e^{-kappa r} f_V(s + r) dr (periodically extended), so (a) |V'| = |W| <= max |f_V| =: M,
(b) integral over one period of f_V = 0 (since V(T) = V(0)), and (c) with a = (1 - e^{-kappa T})/(kappa T) the mean of
e^{-kappa r} one gets |W| <= (kappa/(1 - e^{-kappa T})) M integral |e^{-kappa r} - a| dr, which for kappa T << 1 is about
kappa T M / 4. The V excursion is then at most about kappa T^2 M / 8. For a branch whose excursion Delta stays bounded
below (here Vmax - Vmin is about 86 mV along the slow branch), T bounded and kappa -> 0 is impossible: one needs
kappa T^2 >= 8 Delta / M roughly. So "T bounded, L -> 0" cannot occur for non-vanishing amplitude. In the regime
kappa T << 1 one gets L = sqrt(D kappa) T >= about sqrt(8 D Delta / M), a positive bound; in the regime kappa T of order 1 or more,
L = sqrt(D/kappa) (kappa T) grows. So along such a branch L is bounded below, and an interior minimum exists if it is not
attained at a boundary of the branch; the dichotomy of the plan should be replaced by this. This is my derivation
and has not been checked in a paper; the identity (a)-(b) was verified numerically (below).

Also: in the last rows, T'(kappa) goes from -114.7 (kappa 0.2223) to -142.7 (kappa 0.1991), a local power law
|T'| ~ kappa^(-1.98) from two points. Extrapolating T = a + b/kappa would give L -> infinity as kappa -> 0 and an interior
minimum of L; a two-point exponent is not evidence, and I do not claim it. The formula dL/dkappa = L/(2 kappa) + L T'/T
gives 76.5 at the last row (finite differences 76.2), so L still decreases linearly as kappa decreases and the minimum, if any,
is well below 0.199.

Fix: replace the dichotomy by the identity above; keep the continuation as the numerical test; state in the plan that
"minimum along the branch" is meaningful only if L(kappa) turns up before the branch ends, which the identity makes plausible
but does not prove.

### 6. unclear: "no small singular value" in PLAN section 6 against the log

Location: PLAN section 6 ("the computed collocation Jacobian has no small singular value there"); LOG 06:50 to 06:58.

What: the log says the smallest scaled singular value stays at 3e-7 to 4e-7 at kappa = 2.17, 0.525 and 0.294. 3e-7 is small
in absolute value; what the log supports is that it does not decrease toward zero between three sampled points, and
nothing is reported near 0.199. The absolute level reflects the size and scaling of the system (the unknowns number in the tens of
thousands), not regularity.
Also: the Newton iteration count in `branch.jsonl` reaches the cap of 25 at kappa = 0.2313 and 18 at 0.2005, 16 at 0.2116, while
typical rows need 3 to 5; those rows may be near trouble or just a poor predictor.

Fix: reword to "sigma_min does not decrease along the sampled points" and, to say something about folds in kappa, track the
sign of the tangent component dT/dkappa and sigma_min on every row (a fold in kappa makes the tangent turn; here T' is
smooth: -142.7 at the end). The rigorous statement is the Krawczyk test.

### 7. gap: the pilots do not cover the crest or the slow branch

Location: PLAN section 8 table; section 9 (pending).

What: P1 stops at 6.26 ms and P3 starts at s = 50 ms, so the stretch s about 6.3 to 50 ms is unmeasured. On the fast wave that
stretch holds the crest (V within 1 mV of 15 mV for 44.3 ms, the downward crossing of 15 mV with W = -0.019 mV/ms, nearly
tangent) and it is where window steps dominate; P1 had only 20 window steps. All pilots are at kappa = 2.19, none on the
slow branch (kappa 0.5 or 0.2), which is where the minimum ring length target lives and where expansion is much milder
(frozen-coefficient log-expansion 683 against 128 and 59, from the profile summaries).

Fix: add one pilot that starts near s = 6 to 10 ms with a small box and runs through the window regime, and one C1 and one
C0 pilot at kappa = 0.525 and 0.2. Do not extrapolate the cost of the minimum-length target from kappa = 2.19.

### 8. minor: the insertion of K_i from H0 depends on kappa and correlates coordinates

Location: PLAN section 4 "Unknowns".

What: K_i = H0 - (q_rest + (k/kappa) W), so dK_i/dkappa = (k/kappa^2) W; the derivative column in kappa of each reduced map
must include it (the plan says "first insert K_i from H0" but does not list it). Evaluated as an interval function of an
independent box in the other coordinates, the inserted K_i loses the correlation with them (wrapping); the pilots used
boxes with an independent K_i, not the leaf.

Fix: carry the insertion as an affine map in the Lohner set (the leaf is graph-like, dH/dK_i = 1, so this is exact to first order)
and include its kappa column in DF. Pilots on the leaf should be re-measured once before section 9.

### 9. unclear (stability, PLAN section 10): wording about spectrum and the essential growth bound

What is correct: equations (5), (6) and B (B = -I on the 18 gate and concentration rows, B[W,V] = kappa) follow from the
moving-frame equation with c v_xi = -v' and D/c^2 = 1/kappa (checked line by line). The saltation matrix S for the
eigenproblem comes from the shift of the crossing curve and does not depend on lambda; I re-derived the jump
(g_+ - g_-) delta_xi / c in the gate rows and it agrees with S = I + (F_+ - F_-) e_V^T / W. Translation gives eigenvalue 0, and
the charge functional gives a second zero of the adjoint, so algebraic multiplicity at least 2 off the leaf and at least 1 on it.

What to sharpen:
(a) On a ring the operator (first order in 18 components, second order in V, finite jump domain) has compact resolvent, so
the spectrum is pure point and there is no essential spectrum in the usual sense; the "vertical lines" are asymptotic
locations of eigenvalues at infinity, and the real issue is that the semigroup is not analytic or eventually compact, so
the growth bound can exceed the spectral bound. Say this instead of "essential growth bound" without definition.
(b) If any frozen-V multiplier m_j has |m_j| >= 1 the wave is unstable at arbitrarily high wavenumber; |m_j| = 1 with
m_j = -1 (alternans-type onset of the driven cell) puts a whole line of eigenvalues on the axis at once. A numerical
"all eigenvalues in Re < 0" therefore needs a margin; the hand estimate of 1e-4 per ms for K_i is a margin of that size.
(c) The leaf removes the global charge, but local charge q(x) is not conserved (dq/dt = -k D V_xx), so the slow modes
(K_i, Na_i, Ca totals) give eigenvalues close to the axis for all wavenumbers; "spectral stability" with a gap of 1e-4 per
ms should be reported with that gap.
(d) The plan already says that spectral stability does not give orbital stability here; I agree, and the h/j switch is
a second reason (the time-T map is not C^1 where V = -40 is crossed non-transversally under perturbation).

### 10. minor: statements to tighten

- PLAN section 5: "every L between the enclosures at the ends of a monotone stretch" needs no monotonicity for existence
  (the intermediate value theorem on continuous L suffices); monotonicity or a derivative bound is needed only for
  uniqueness or counting. Say so, so that the claim is not weaker than the proof.
- PLAN section 8: "about 75 to 150 segments per period at kappa = 2.19" is 299 ms divided by 2 to 4 ms: an estimate from
  the average expansion rate (2.3 per ms), listed under measurements. The upstroke rate is higher: P1 measured 2.8e7 in 6.26 ms
  (about 2.7 per ms) and the frozen-coefficient maximum is 4.57 per ms, so 4 ms there is a factor above 1e4. Label it
  an estimate and make segment lengths adaptive.
- PLAN section 8: "|D| ... (the true expansion of the flow)" is the midpoint of an enclosure; say "enclosure midpoint".
- PLAN section 2: "a ring prepared at rest in that state". y01 is the standard initial state, not an equilibrium: my check gives
  f_V(y01) = 0.2617 mV/ms. The leaf is still right (q is conserved by the cell flow), only the word "rest" is loose.
- PLAN section 3: the nonlinear (V,W) block is right; at y01 I get a slope conductance g = 0.320 per ms and eigenvalues
  2.473 and -0.283 per ms at kappa = 2.19, matching the measured rest-phase growth in P2 (1.9e5 over 5 ms, 2.4 per ms).

---

## Per-question verdicts

1. Comoving ODE: **correct.** u_t = phi', u_x = -phi'/c, u_xx = phi''/c^2 give V' = W, W' = kappa (W - f_V), w' = f_w;
   kappa = c^2/D has units 1/ms; wave moves to +x (the foot e^{kappa s} decays ahead with length c/kappa = D/c); the
   mirror wave is the c < 0 solution.
2. Ring condition and minimal period: **correct.** L = cT; one wave per ring is minimal period T. The certified signs imply
   minimal period because the closed orbit crosses Sigma_up exactly once per chain period (if T' = T/n then it would cross n
   times). Caveat: finding 3 (section start).
3. First integral and counting: **correct.** H = q + (k/kappa) W; dH/ds = 0 for both branch fields because q does not depend on h
   or j; the total charge on the ring is L H; K_i is an explicit graph; the count 2 x 18 + (m - 2) x 19 is square. The zero is
   isolated for fixed kappa iff the Poincare map restricted to {H = H0} has no eigenvalue 1, equivalently eigenvalue 1 of the
   full monodromy has algebraic multiplicity exactly 2 (flow direction and the H direction); no condition on dT/dH is needed.
   Krawczyk verifies this automatically. Gaps: findings 1, 2, 8.
4. Events and rigor: **correct in principle.** F_hi and F_lo have identical V and W components (V' = W), so a crossing with W != 0
   is transversal from both sides and no sliding is possible. No saltation matrix is needed in section coordinates because
   S acts as the identity on tangent vectors of the section. f_V is continuous (it contains h and j, not their rates), so V is a
   classical C^2 solution and the gates are Caratheodory solutions; this is the right notion. Gap: finding 3.
5. Window and Gronwall: **correct as derived**, with the testing gap of finding 4; dimension 21 is covered; the right
   variable and set are used (zeta from the widened enclosure, |zeta| < pi checked on it, quotient steps redone with the window
   when the enclosure meets 15 mV).
6. Minimum ring length: dL/dkappa = L (1/(2 kappa) + T'/T) is **correct**; the minimum of L is not at the fold (nose) of T; it is a
   regular point in kappa. What a proof can give is the minimum over a proved kappa range, on the leaf H0 (and for the given D
   through L / sqrt(D)), not global nonexistence and not stability. The saddle-node statement is stated correctly (one real
   eigenvalue through 0 generically; which side is stable not claimed). Gap: finding 5, and 6 for the regularity wording.
7. Stability: eigenproblem **correct**; sharpen finding 9.
8. Interval parameter: continuity and the intermediate value step are **correct**; gluing needs findings 1 and 2.
9. Labelling: see below.

## Items checked and found correct

- Derivation of (2), signs, direction of travel, units, the reflection argument (items 1 and 2 above).
- `tw_model.field` against the cable equations; `H`, `H_grad`; the first-integral cancellation (my run: worst relative
  2.2e-16 at random states, dH/ds = -2.1e-19 against a sum of absolute terms 7.3e-3, both branches).
- K_CHARGE = 1.1689e-4 mM/mV and H0 = 150.44266158133294 as printed by `tw_model.py`; dH/dK_i = 1.
- The collocation formulation in `tw_bvp.py`: unknown count equals equation count (60 (MA + MB) + 43 on both sides); the unfolding
  parameter mu is needed because the first integral makes the closing conditions rank deficient; the two switch points are mesh nodes.
- The multiple-shooting leaf bookkeeping in `tw_shooting.py` (insertion matrix with dK_i/du_j = -g_j/g_K, Poincare-map
  derivative (I - F e_V^T / F_V) DPhi, 18/19 coordinate counts).
- Window rows against `ring19.hpp` (sign and factor), the Hessian row sum, tails, and the dimension-21 handling (finding 4 for the test).
- Branch numbers quoted in PLAN section 7 agree with the rows and profile summaries: T = 298.849 ms, L = 173.554 mm, Vmax 15.94 mV,
  W = +93.1 and -1.39 at the sections, 15 mV crossings at 4.56 and 24.82 ms with W = +0.91 and -0.019, 44.3 and 104.3 ms near 15 mV, nose
  T = 215.84 ms at kappa = 0.5251 (row), L = 40.395 mm at kappa = 0.19907, L increasing with kappa on all 57 rows, frozen log-expansions 683, 128, 59,
  mean largest real eigenvalues 2.30, 0.59, 0.26.
- The pilot findings in PLAN section 8 agree with the summaries: P1 stops at 6.26 ms with 312 steps and 20 window steps, reference inside; the 2.8e7
  derivative growth equals e^17; P2, P3, P4, P5 as tabulated.
- Labelling: PLAN states "No theorem" at the top; sections 7 and 8 are labelled numerical or measurement; the D source is marked as not
  re-read; there is no claim of outside review anywhere in the files I read; section 9 is pending and must label its costs extrapolated (the
  75 to 150 segment count already needs that label, finding 10).

## Checks I ran

All under `nice -n 10 timeout 120`, scripts in the session scratchpad.

1. Branch rows and the W identity (`rv.py`):
   `rows 57 kappa range 0.19906921955432724 2.1713635102161386 Tmin 215.8437711141094 at 0.5251135102161391 dL/dk>0 all: True`
   `max|W| 8.060733061886138 max|f_V| 20.350348816247624 int f_V ds 4.839915462184763e-06 kappa T 45.92733342365521`
   `s 5.0 W formula 0.6909575772280139 W profile 0.6884277608723277` (also s 75: -0.1624 against -0.1617; s 150: -1.0436 against -1.0391; the
   difference is the 0.05 ms interpolation grid).
2. First integral and rest-state numbers (`q.py`): `H0_REST 150.44266158133294`, `first integral worst 2.1972150470398054e-16`,
   `f_V at y01 0.26173049934821047`, `g slope (1/ms) 0.31984106803301104`, eigenvalues at kappa = 2.19: `2.4732`, `-0.2832`.
3. Local trend of the branch (`br.py`): at kappa = 0.19907 `Tprime -142.7 dL/dk(formula) 76.47 dL/dk(fd) 76.20`; at kappa = 0.22233
   `Tprime -114.7`; `max its 25 at kappa 0.23134390267219385`.
4. Pilot and profile summaries (`sm.py`): the values quoted in "Items checked".

---

## Response and fixes (written by the agent that owns the continuum work, 2026-10-02; not part of the review)

Every finding was checked against the files and accepted. Fixes:

1. **Accepted (gap, high).** `continuum/PLAN.md` section 4 now states the piece test on the tangent predictor
   u-bar(kappa) = u-bar(kbar) + u'(kbar)(kappa - kbar) with the kappa dependence in centred (mean-value) form and C
   applied to the kappa column as a matrix-vector product; the naive form is described as not scaling. Section 9 no
   longer extrapolates the family cost from P4; it gives the piece width as a formula in measured quantities and says
   that one piece must be run to measure it.
2. **Accepted (gap).** Section 5 now requires one node layout for neighbouring pieces (or comparison at the Sigma_up
   node) and writes out the open-closed gluing argument.
3. **Accepted (gap).** Section 4 now states the monotone rule at section starts (W of the right sign on every step
   enclosure that meets V = -40, start box on the closed side) and the PoincareMap end with validation. The rule is
   implemented in `continuum/wrap_pilot.cpp` (argument `monotone`, start-box check) and `wrap_run.py --section up|down`,
   and piloted from both sections (PLAN section 8, runs S1 and S2). The section END for the comoving field is still to be
   written (the ring engine has it); this is recorded as open.
4. **Accepted (gap).** `continuum/comoving_field.cpp` now also prints the window rows (A_W, A_C), and
   `check_comoving_field.py` has a window-row test at degree 2 with |V - 15| from 1 to 40 mV (|zeta| up to 3): quotient
   field minus window field against (A_W, A_C) R(zeta) with R from mpmath, the Python window field inside the C++
   enclosure, and negative controls (A_W without kappa, A_C doubled). Result in `continuum/results/check_comoving_field.json`.
5. **Accepted (gap).** Section 6: the dichotomy is replaced by the identity W = kappa integral e^{-kappa r} f_V(s + r) dr and
   the bound L >= sqrt(8 D Delta / M), credited to this review and marked as not checked against a paper; whether L has an
   interior minimum is left to the continuation (section 7).
6. **Accepted (unclear).** Section 6 now says that sigma_min does not decrease along the sampled points (its absolute size
   reflects the scaling) and reports the smooth tangent dT/dkappa; the Newton iteration counts are in the branch record.
7. **Accepted (gap).** The crest (s = 6 to 50 ms) is covered by the full-period sweep of 2 ms C1 windows at kappa = 2.19,
   and a sweep at kappa = 0.2 on the slow branch was added (PLAN section 8); section 9 does not extrapolate the slow-branch
   cost from kappa = 2.19.
8. **Accepted (minor).** Section 4 now lists the kappa column of the K_i insertion and carries the insertion as an affine
   map. The pilots' boxes are not on the leaf (independent K_i); this is stated in section 8.
9. **Accepted (unclear).** Section 10 now says the resolvent is compact (pure point spectrum), that the vertical lines are
   asymptotic locations of eigenvalues, that the semigroup is neither analytic nor eventually compact so the growth bound
   can exceed the spectral bound, and adds the remarks on |m_j| >= 1, m_j = -1 and the margin of the slow ionic modes.
10. **Accepted (minor).** Section 5: existence of a wave for every intermediate L needs only continuity. Section 8: the
    75 to 150 segment count is labelled an estimate and segment lengths adaptive; |D| is "the enclosure midpoint".
    Section 2: y01 is described as the standard initial state, not an equilibrium (f_V(y01) = 0.26 mV/ms).
