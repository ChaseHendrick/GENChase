# Rec 2 (certified G_Ks branch, fourier/branch.py): independent adversarial review

Date: 2026-10-02. Reviewer: an independent in-project agent that did not write branch.py, the tests or the
validator. Scope: fourier/branch.py (docstring Theorems B1 to B3, Lemma B2, sections 6 to 8b and the code),
fourier/test_branch.py, the parts of existence.py and fourier_eval.py it calls, results/fourier-branch-gks.json,
the logs in fourier/data/branch/, README.md (rec 2 section) and the finalizer's validate.py. No repository file
was edited.

## Verdict

No UNSOUND finding. Every g-dependence of F and DF is covered for every g of a piece, Lemma B2's Z2 is a valid
bound over the piece's whole g range, the gluing and point-to-branch inclusions use the right norms in the right
direction, and the phase functional, realness and minimal-period arguments hold. Four pieces spread over three
groups (G0P0, G0P11, G8P9 and the last piece G16P15) were re-proved from the stored centres with the groups'
Hessian covers rebuilt from scratch: each cover's digest matched the logged one, and Y0, Z1, Z2, r_existence and
r_uniqueness matched the log bit for bit. Findings: 2 GAP (documentation), 3 WEAK TEST, 4 MINOR. Once they are
fixed (all are text or test changes; no bound changes), the record may be listed as having passed in-project
adversarial review. That is not an outside review.

## Findings

### GAP 1 (documentation): section 2 of the docstring contradicts the code and section 3

Location: branch.py docstring, section 2: "its J_n entries are enclosures over ALL g in G (section 3)" and "J0hat,
the exact midpoint of the enclosure [J_0] (which now also contains the g-width)".
Evidence: piece_blocks builds J, SJ, J_fin and J0hat from `JJ`/`J53`, which use `prmJ_c` / `prm53_c`, the point g_c.
The g-width enters Z1 only through B1g (the mean value theorem of section 3). Section 3 says this correctly.
Soundness is not affected: the MVT route is complete (see "Checked" 1). But a reader who checks section 2 against
the code will find a false statement in the proof text.
Fix: in section 2, say that J_n, J_fin and J0hat are enclosures at the point g_c, and that the g-width enters only
through delta * B1g and delta * Y0g (section 3).

### GAP 2 (documentation): the gluing argument proves agreement on consecutive overlaps only

Location: docstring section 5 ("Gluing ... single valued and continuous on the union").
Evidence: single-valuedness needs x*_i = x*_j on every overlap P_i ∩ P_j, not only for j = i + 1. This record has
none of the other kind: I counted 0 pieces with lo_{i+2} <= hi_i, and the validator checks that both endpoints
strictly increase. But neither collect() nor the docstring rules the case out, and bridges or splits could create it.
The claim is still true in general, by a short argument the text should state. If x*_i(g0) = x*_j(g0) at one
g0 in the interval P_i ∩ P_j, then the set where they agree is closed, by continuity. It is also open: x*_i(g0)
lies in B_{r_lo(j)}, which is inside the open ball of radius r_hi(j), because r_lo < r_hi. So for g near g0,
x*_i(g) lies in piece j's uniqueness ball and equals x*_j(g). Hence they agree on all of P_i ∩ P_j. The chain of
consecutive inclusions gives the agreement point g0.
Fix: add that paragraph, or make collect() refuse non-consecutive overlaps. A one-line check would do it:
`lo_{i+2} > hi_i`.

### WEAK TEST 1: nothing exercises the delta * B1g term of Z1

Location: test_branch.py, test_negative_drop_parameter_width_detected; assemble(_mutate="drop_g_width").
Evidence: on G16P15, Z1 without delta * B1g is 0.0865974 and with it 0.0865991, a relative change of 2.0e-5. The
mutation drops both delta * Y0g and delta * B1g, and the test detects it only through Y0. A B1g that is wrong
(zero, missing the tail rows, wrong row restriction) would pass every test and every logged piece. Numerically
this does no harm today, but the test cannot see that term at all.
Fix: add an independent float check that B1g is an upper bound. One way: estimate the finite-block weighted norm
||A_fin (J_fin(g_hi) - J_fin(g_lo))|| / (g_hi - g_lo) from float Galerkin matrices (galerkin_f at the endpoints,
8x nodes). Then assert that this estimate is at most max_c (1/eta_c) sum_c' eta_c' B1g_{cc'}, and that it is a
sizeable fraction of B1g's finite x finite block, so the test can fail if B1g is too small or identically zero.
Also add a mutation `drop_B1g` that is checked to change Z1.

### WEAK TEST 2: there is no negative control that widens the parameter interval

Location: test_branch.py (no such test). The brief proposed widening by 2x.
Evidence: I ran it on G16P15 with the centre, eta and r_star of the piece and a cover rebuilt over the widened
range. At 2x it PASSES (Y0 = 8.11e-4, r_lo = 1.42e-3, legitimately: the run targets Y0/cap of about 0.4). At 3x it
FAILS (Y0 = 1.216e-3, the radii polynomial is not negative). So a 2x control would be a test that cannot fail for
the right reason. A 3x control does what is wanted: it shows that the interval width really flows into Y0 and decides
the proof.
Fix: add `test_negative_widened_piece`. The same centre, weights and r_* on [g_c - 3 hw, g_c + 3 hw] must raise
ProofFailure. The [g_c - hw, g_c + hw] piece must pass, as the control.

### WEAK TEST 3: the acceptance test reproduces Z2 only to 1 per cent, though bit-for-bit reproduction costs 11 s

Location: test_acceptance_piece_containing_stage_E_point (`_cover_for` rebuilds the cover around one centre).
Evidence: rebuilding the group cover from the group's centres in g_lo order took 11 to 12 s. It reproduced the
logged phi_digest in all three groups I tried. Y0, Z1, Z2, r_existence and r_uniqueness then matched to the bit
for G0P0, G0P11, G8P9 and G16P15. The 1 per cent tolerance on Z2, and not comparing r_existence or r_uniqueness at
all, leave Z2 and the radii unchecked against the log.
Fix: rebuild the group cover with HessBound(group centres, group g_lo, group g_hi, R, "1"), assert that its digest
equals the group's `hess.phi_digest`, and compare all five hex values exactly.

### MINOR 1: latent bug in Hess.__pow__ for negative integer exponents

Location: branch.py, Hess.__pow__: `n * (n - 1) * (v ** (n - 2) if n >= 2 else acb(1))`.
Evidence: for n <= -1 the second derivative should be n (n - 1) v^(n-2), but the code gives n (n - 1). It cannot
be reached today: the generated model tp06_18d_arb.py uses only `** 2` and `** 3`, and test_hessian_matches_jacobian_
differences would catch it for this model. But Hess is listed as trusted code.
Fix: use `v ** (n - 2)` for every n other than 0 and 1, or raise for n < 0.

### MINOR 2: glue() does not check that the two pieces use the same nu

Location: branch.glue / centre_distance (uses ob["nu"] only). point_on_branch does check it.
Evidence: the norm conversion max(eta_a / eta_b) is valid only for the same nu. All 232 pieces have rho0 = "1/4"
(checked), so this record is fine.
Fix: compare the pieces' rho0 settings exactly in glue() (exact strings, not `!=` on arb balls, which only fails for
disjoint balls).

### MINOR 3: a test pins the status string that a review is meant to change

Location: test_gluing_rederived: `assert rec["status"] == "computed; awaiting adversarial review"`.
Evidence: when the record is promoted after this review, the test fails unless it is edited in the same change.
Fix: assert membership in the allowed set of statuses, or update the string in the same commit.

### MINOR 4: README wording on the finalization check

Location: README rec 2, "Checks made at finalization": "reproduced the logged Y0 and Z1 bit for bit".
Evidence: with the group cover rebuilt, Z2 and both radii also reproduce bit for bit (this review, four pieces).
validate.py is a re-derivation from the stored numbers that reuses branch.py's centre parser, _dstr and digest. It
is not fully independent code, and the README could say so.
Fix: optional wording change. When this review is cited, add Z2 and the radii.

## What I checked and found correct

1. **Mean value theorem in g (Theorem B1).** By the source model/tp06_18d.py, g_Ks appears only in
   i_Ks = g_Ks Xs^2 (V - E_Ks), and i_Ks only in dV/dt. K_i is a parameter, not a state. So f is affine in g and
   f1 is nonzero only in the V row (test_parameter_derivatives asserts the zero rows; piece_blocks re-checks that
   S_D vanishes off the nonzero rows).
   - Y0. Y0p is the Stage E Y0 at the exact point g_c (enc_g with prmG_c). Y0g has the same structure (finite
     part A_fin F, explicit A_m on K < |m| <= K', Abar0 S tailK beyond), applied to the enclosures of d_g f o phibar.
     Those come from dg_flat with g_Ks a Hess variable whose base point is the interval hull of [g_lo, g_hi]
     (params_for, then to_ball((lo, hi)), which is the arb union). Every node value, and the strip sup used for
     aliasing and for the tail, therefore holds for every xi in G. The integral of the coefficient over t lies in the
     convex ball. The phase row and i omega m a_m do not depend on g (with_phase_and_omega=False). delta is
     max(g_hi - g_c, g_c - g_lo), rounded up.
   - Z1. B1 is the Stage E structure at g_c. B1g covers A d_gDF for all xi in G with three parts: the finite
     block |A_fin D_fin|; finite rows x tail columns through finite_tail(D1, S_D); and the tail rows
     Abar0 sum_n |D1_n| nu^|n| + Abar0 S_D tailK, with Abar0 the entrywise sup of |A_m| over all |m| > K, as
     _tail_bounds states and computes. D1_0 is included, so the g-variation of J_0 in the tail resolvent rows is
     covered. A itself (A_fin from the midpoint of J_fin(g_c), A_m from J0hat at g_c) does not depend on g. The row
     restriction A_fin[:, R] D_fin[R, :] is exact: the dropped rows of D_fin are exact zero balls, and the phase row
     and the omega column of D_fin are zero.
   - Z2 uses a cover whose g range must contain the piece (assemble refuses otherwise; the validator repeats the
     check). The omega cross term does not depend on g.
   - A is injective, because Z1 < 1 bounds the finite block, so A_fin is invertible; A_m are explicit inverses or
     Neumann series (Stage E). Nothing in F, DF, A or the tail depends on g in a way the bounds miss.
2. **Lemma B2.** The constant coefficient of the hull is inflated by the complex box R_i (±1 ± i), which contains the
   disc |w_i| <= R_i. The hull is the arb union of all the group's centres; contains_centre is checked on the
   uninflated hull, which is the stricter test. The cover is strip_sup over the full rectangle at rho2 = 1, with
   the group's g hull, using second-order forward-mode duals. I checked the chain rule in Hess (__mul__, _unary,
   reciprocal, log, sqrt, exp) term by term. Ball base points make the value, gradient and Hessian enclosures hold
   at every point of the box. A finite result certifies holomorphy: divisions go through finite reciprocals, and
   log and sqrt need Re > 0. The Cauchy, Lemma 2 and Banach-algebra argument gives ||H o phi_a||_nu <= MH Q2 P(t)
   with Q2 = (1 + q2) / (1 - q2) and q2 = nu e^{-1}. W_k counts the ordered pairs (factor 2 off the diagonal) with
   P evaluated at eta r*. hess.W refuses eta_i r* >= R_i, so the segment abar + s delta a stays inside the
   polydisc for ||delta a_l|| <= eta_l r*, and _radii keeps r_hi <= r_*. The Hessian cover's g interval is the group
   hull, a superset of each piece's interval. The validator and assemble both check this, and the four re-proofs
   reproduced each cover digest.
3. **Continuity (Theorem B3).** The argument without a numeric L is correct. F is affine in g, so
   T_g(x) - T_g'(x) = -(g - g') A F1(x). The map f1 is holomorphic wherever f(.; g_lo) and f(.; g_hi) are, which
   includes the certified polydisc family. So f1 o phi_a lies in l^1_nu with a finite bound (Mf of the cover over the
   strip, times 2 / (g_hi - g_lo), times Q2 P), and A is bounded on X (|A_m| <= Abar0). The uniform contraction
   estimate gives Lipschitz continuity with constant L / (1 - kappa). Gluing: x*_i(g) is in B_{r_lo(i)}(xbar_i) in
   the eta(i) norm for every g of the piece. Then ||y||_{eta(i+1)} <= ||y||_{eta(i)} max_c eta_c(i) / eta_c(i+1),
   and the triangle inequality gives the tested lhs, compared with <= against r_hi(i+1). The uniqueness ball is
   closed, and r_hi is an exact dyadic from _radii, so its hex is exact. The overlap is checked
   (lo_{i+1} <= hi_i). The pasting lemma then gives continuity on the union, with GAP 2 for non-consecutive overlaps.
4. **Phase functional and period.** F_ph = a_{1,V} - a_{-1,V} is C-linear, and F_ph(kappa x) = -conj F_ph(x), so
   kappa maps zeros to zeros. kappa fixes the exact symmetric centre, which piece_blocks checks: a_0 real, exact
   conjugate symmetry, Im abar_{1,V} = 0, omega_bar exact and positive. Uniqueness then gives a real x* with
   Im a*_{1,V} = 0. The margin |abar_{1,V}| > eta_V r_lo / nu is exactly what |a_1 - abar_1| nu <= ||a - abar||_nu
   needs, and recorded margins are about 0.1. a*_{1,V} != 0 rules out every period 2 pi / k with k >= 2, so
   T = 2 pi / omega* is the minimal period, and the omega enclosure omega_bar ± eta_om r_lo gives the T enclosure.
   Non-degeneracy of the functional affects only whether the inequalities close, not validity.
5. **Logged values.** These were re-proved with the stored centre, the group's eta and r_*, and a group cover
   rebuilt from the group's centres. All five bounds matched the log bit for bit, and all three cover digests
   matched (11 to 12 s per cover, 20 to 22 s per piece):

   | piece | g range | Y0 | Z1 | Z2 | r_lo | r_hi |
   |---|---|---|---|---|---|---|
   | G0P0 (contains 0.0275) | [0.027499735464, 0.027500264536] | 3.0475e-4 | 0.10502 | 522.76 | 3.8345e-4 | 1.5226e-3 |
   | G0P11 | [0.027504944271, 0.027505466569] | 3.0221e-4 | 0.10425 | 525.87 | 3.7970e-4 | 1.5226e-3 |
   | G8P9 (contains 0.02755) | [0.027549655526, 0.027550184956] | 3.1978e-4 | 0.09832 | 500.14 | 3.9874e-4 | 1.6097e-3 |
   | G16P15 (last) | [0.027619247504, 0.027619866374] | 4.0538e-4 | 0.08660 | 502.59 | 5.1749e-4 | 1.6337e-3 |

   Y0 is about delta * Y0g on every piece; the point residual Y0p is about 7e-11.
   The finalizer's validate.py also ran clean: 232 pieces, 0 failures, max kappa 0.9134, max Z1 0.1050, Z2 from
   489.6 to 525.9, worst gluing ratio 0.78, widths from 5.17e-7 to 6.61e-7. That matches the README numbers.
   For the cover that stopped at its budget, I checked in sup_over_rectangles that the boxes left in the heap
   become leaves. They must be finite, or StripCoverError is raised. Every popped box is either accepted or split,
   with its children filed, so the leaves partition the full rectangle. S_i is the maximum of exact upper bounds
   over all leaves, whether resolved or not. So n_unresolved = n_leaves (768 for g, 800 for the Hessian) only
   loosens S. Exceptions raised by Hess (ArithmeticError) are caught as "not certified", never as a bound.
   A float probe of the finite block of I - A DF(xbar; g) at both endpoints of G16P15 gives 5.96e-5, against the
   certified Z1 of 0.0866. That is consistent, and Z1 is dominated by tail and strip terms.
6. **Point-to-branch identification.** The point proofs use eta = 1, so the conversion max_c 1 / eta_c(piece) is the
   right factor from the weight-1 norm to the piece norm. Centres of different K are compared in l^1_nu, with the
   K = 12 centre padded with exact zeros, which is the same element of X. nu is checked equal, and the point's g is
   checked to lie in the piece. The piece centre sits at a different g (for example, 9.6e-5 away at 0.02755), and
   that is valid, because the piece's uniqueness ball holds for every g of the piece. All three points (0.0275,
   0.02755, 0.0276) pass with lhs far below r_hi. Points from 0.02765 up are correctly labelled isolated.
7. **Tests.** The negative controls do what they claim:
   - wrong-g centre;
   - the mutation detected through an independent float estimate of ||A_fin F(xbar; g_end)||, which the test requires
     to exceed the mutated Y0 tenfold (the mutated Y0 is about 7e-11, the true Y0 about 3e-4);
   - a cover that misses part of the g range or the centre;
   - a shrunk radius and far-apart gluing;
   - point membership against a shrunk radius, the wrong g, a forced g and the wrong digest;
   - log tampering.
   test_hess_box_encloses_points samples g inside the interval, so it tests the parameter-interval enclosure
   property directly. The whole suite was rerun in this review (result below).

## Test run in this review

`PYTHONPATH=pylib timeout 1500 nice -n 10 python3 test_branch.py`: 16 of 16 passed (about 170 s). The
acceptance test took 35.7 s and the negative controls 33 to 66 s each.
