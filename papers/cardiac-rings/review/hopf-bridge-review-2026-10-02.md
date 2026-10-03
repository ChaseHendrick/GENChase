# Rec 2, the Hopf bridge (fourier/hopf.py): independent adversarial review

Date: 2026-10-02. Reviewer: an independent in-project agent reading; it did not write hopf.py or its tests. No other
repository file was edited.

Scope: fourier/LEMMAS-hopf.md (Parts A, B, C, S), fourier/hopf.py, fourier/test_hopf.py, results/fourier-hopf.json, the
logs in fourier/data/hopf/ (pieces.jsonl, covers.jsonl, theoremA.json, gluing_gks.json, gks_points*.jsonl), the parts of
branch.py (Hess, point_on_branch, obj_from_record, validate_logs, stability_points), existence.py (_radii,
_tail_bounds), fourier_eval.py (strip_sup) and arbmodel.py that hopf.py calls, and the Hopf-bridge section of README.md.
branch.py's own theorems are used as stated.

## Verdict

No UNSOUND finding. I re-derived every xi-dependence of F and DF along the centre line (Y0 by Taylor in xi, Y1 at the
point with the exact division by e_c + t, Y2 and Zc with hulls over the Xi and s sub-intervals, strip sups over the whole
piece), the Z2 bound of Lemma B3 including the Cauchy-in-sigma third-derivative terms, the one-polydisc identification at
eps = 0, Lemma D and Theorem C, and found them consistent with the code and the logs. Nothing I ran contradicts a bound.
What must be fixed before the record may be listed as having passed in-project adversarial review: (1) the builder's own
acceptance run is RED: `test_hopf.py` ended "51 checks, 2 failed" (WEAK TEST 1), so those two negative controls must be
redesigned and the run repeated green; (2) GAP 1 to GAP 3 (a missing check or sentence in the proof text, a re-proof
coverage gap, and an unverified Theorem A cover in `collect`); (3) the status wording and the record hashes (MINOR 2),
which have to be regenerated after any edit of hopf.py, test_hopf.py or LEMMAS-hopf.md. This is an in-project reading,
not an outside review.

## Findings

### GAP 1: Theorem A(a) says "its conjugate is the one in D2" but nothing certifies it

Location: LEMMAS-hopf.md Theorem A proof (a); hopf.spectrum_on.
Evidence: spectrum_on certifies D1 and D2 disjoint from each other and from the 16 other discs, and that the right-hand
eigenpair ball lies in D1 with Im > 0. It never checks conj(lambda) in D2. For a real matrix, D2 contains exactly one
eigenvalue mu; mu = conj(lambda) is not implied. Without it, statement (a) "the spectrum is lambda, conj lambda and 16
eigenvalues with Re <= ..." and the use in (d) are not proved as written. The conclusions survive by a short argument that
the text lacks: on the left intervals Re lambda > 0 so conj lambda cannot lie among the 16 (Re < 0); on the right intervals
mu is non-real, or real and nonzero (A is invertible by Lemma K), or conj(mu) lies among the 16 (Re mu < 0), so mu is not on
the axis; at g_H the conjugate of i omega has Re = 0, so it is in D2, giving n_s = 16. I also ran
`hopf-review/disc_conj.py`: on G_H and 25 random intervals of the logged cover (13 left, 12 right), conj(lambda) is
certified inside D2 in all 26, D2 lies 0.119 below the real axis and conj(lambda) is 0.088 from the other 16 discs.
Fix: add the check `|conj(lc) - c_D2| + lr <= R_D2` to spectrum_on (cost nothing) and rerun theorem_A, or insert the
argument above in the proof of (a) and (d).

### GAP 2: only 6 of the 68 eps pieces were re-proved, and the program copies of earlier runs are not in the repository

Location: LEMMAS-hopf.md "Proposition B-piece", last paragraph; test_hopf.py test_piece_recompute_and_controls.
Evidence: pieces 0 to 30 carry no `code_sha256`; the claim that their piece-proof code equals the current one rests on
copies in the builder's scratch directory. I diffed those copies against hopf.py: the five copies (sha256 prefixes
49f956c0, 5b2214ae, bae43c6c3b, c656af84d2, e6754dbe4c; the last three equal the hashes logged in pieces 31 to 67 and in
theoremA.json) differ from the current file only outside lines 859 to 2160 (Theorem A driver, FloatEps, run(), collect),
so the claim is true. But a reader of the repository cannot check it, and the full-mode test re-proves pieces 0, 13, 30,
40, 62, 67 only (all passed, bit for bit, in the builder's run).
Fix: commit the three SHA-256 values for B1, B2 (or the copies themselves) with the record, or re-prove all 68 pieces once
with the final program (about 6,600 s on one core, bounded in the background) and compare the exact Y0, Z1, Z2, radii.

### GAP 3: `collect` and the tests do not re-verify the Theorem A cover over W

Location: hopf.collect; test_theorem_A_core.
Evidence: theoremA.json is taken as written by one run of theorem_A. collect re-derives the eps chain and the
identification (which checks contiguity only for the 208 intervals meeting J). Nothing re-checks that the 286 + 229
intervals are adjacent, cover W = [0.02789, 0.02792], and have the claimed signs and `others_max_re`. I did it with jq on
the log: both chains are adjacent (0 breaks), the left chain ends at 2789/100000 and the right one at 349/12500, all 286
lower bounds of re_lam are positive, all 229 upper bounds negative, 117 left intervals carry a polydisc, max others_max_re
is -4.69268524e-5 as recorded. The per-interval inequalities themselves were re-run only for G_H and my 26 samples.
Fix: add these cheap structural checks to collect (and to the test); optionally re-run theorem_A (234 s) in the test.

### WEAK TEST 1: two negative controls FAIL in the builder's full run

Location: test_hopf.py test_piece_recompute_and_controls ("widened threefold", "centre computed at a wrong eps").
Evidence: `/tmp/.../hopf3/test_full1.log`: `FAIL negative control: the piece widened threefold about its centre fails` and
`FAIL ... wrong eps (shifted by 1.5 piece widths) fails`; summary "51 checks, 2 failed, 1223 s". In both cases the proof
still goes through, because piece 0 has large slack (contraction 0.31, Z1 = 0.031). This is a defect of the control, not
of the proof: I re-proved piece 0 on [0, 3/250] (six times wider, centre unchanged, cover rebuilt in 20 s) and the radii
polynomial then fails properly (Y0 rises from 3.0e-5 to 1.98e-3, "radii polynomial not negative"), so the width terms bite
as the drop_curve mutation also shows. The other 49 checks passed, including all 6 bit-for-bit re-proofs.
Fix: use a much wider interval (about 6 times) or a late tight piece (e.g. piece 67), assert the message
"radii polynomial not negative" rather than any ProofFailure, and rerun the full test to green.

### WEAK TEST 2: no float cross-check of Y1 or Z2 (the only new third-derivative bound)

Location: test_hopf.py _float_crosscheck covers Y2 and Zc only.
Evidence: Z2 contains the Cauchy third-derivative terms and Y1 the exact division by e_c + t; the mutation tests show the
terms are live, not that they are large enough. I added `hopf-review/z2_float.py` (float Galerkin matrices, 192 nodes,
random sup-norm corner perturbations and hill climbing). Piece 0: float Z2 at most 15.6 against rigorous 282.2; float Y1
2.5e-5 against 9.4e-3; float Y0p 2.4e-11 against 9.9e-6. Piece 67: float Z2 at most 5.4 against 14,321; Y1 4.1e-6 against
4.9e-6. No float value exceeds a rigorous bound. These are lower estimates (finite modes, random directions), so they are
a sanity check, not a proof.
Fix: add a float Y1 and a Z2 sampling check to the test (the script is short).

### WEAK TEST 3: two controls pass trivially or for any reason

Location: test_hopf.py: "G_Ks pieces not containing the point's g are refused"; the `except H.ProofFailure` controls.
Evidence: the first only exercises the `g in piece` guard (point_on_gks_branch iterates pieces containing g, so none are
tried); it does not test the ball inclusion `lhs <= r_hi`. The widened/wrong-centre controls catch any ProofFailure, which
includes cover and domain errors, so a pass would not show the radii polynomial failing.
Fix: for the Part C control, call branch.point_on_branch on a neighbouring piece with the containment guard bypassed (the
inclusion must fail); match the failure text in the Part B controls.

### MINOR 1: "agrees with Erhardt's value to the printed digits" is too strong

Location: LEMMAS-hopf.md Theorem A (e); test name "omega l1 agrees with Erhardt's -2.6838 to the printed digits".
Evidence: our enclosure is [-2.6837352, -2.6837346]; Erhardt prints -2.6838. They differ by 6.5e-5 (relative 2.4e-5), one
unit in the last printed digit; the test tolerance is 1e-4. g_H differs by 1.49e-8.
Fix: say "agrees to about four significant digits (difference 6.5e-5)".

### MINOR 2: status text is inconsistent and the record will go stale

Location: LEMMAS-hopf.md line 3 ("an in-project adversarial reading is recorded in reviews/... with its fixes"), README
("REVIEW_PLACEHOLDER"), hopf.py docstring and the record ("awaiting adversarial review").
Evidence: the LEMMAS header already asserts a recorded reading; the others say it is pending. The record's
`sources_sha256` covers hopf.py, test_hopf.py and LEMMAS-hopf.md (all matched on disk at the time of my reading, as did the
six data hashes and the first 730 and 728 lines of the branch logs), so any fix invalidates it.
Fix: after the fixes, rerun `hopf.py --collect` and the test, then set one status in all places, and only then list the
record in results/fourier-review-status.json.

### MINOR 3: Lemma B3 does not say why eta_g r* <= G_R is needed

Location: LEMMAS-hopf.md Lemma B3 / assemble.
Evidence: f is affine in g, but the first Kc term uses the sup MH at g = gbar + Delta g, so the family's g-disc must
contain it; the check is therefore needed, not redundant. The text only lists it.
Fix: one sentence.

## Checked and found sound

1. Lemma B1 (zero of F is a real periodic orbit, minimal period 2 pi / omega, a_{1,V} = eps/2): re-derived from
   eps Q = f(c + eps u) - f(c) pointwise; E_0 and E_m reproduce the Fourier coefficients of f(phi).
2. DF formulas (E_0 and E_m rows, columns omega, g, c, w): derived; the w-derivative of Q equals J y_w (integration by
   parts in s); code in piece_blocks, Dp and assemble matches.
3. Y0 (Taylor in xi with Y1 at e_c and Y2 over the piece), including the second derivative of i m omega(xi) w_m(xi) =
   2 i m tom tw_m; b(s, t) = c(xi + t) + s (xi + t) w(xi + t) expanded correctly in _bt; Q'' hulled over s and Xi.
4. Y1: phi(t) = cbar + t tc + (e_c + t)(u + t v) and Q(t) = (f(phi) - f(cbar(t)))/(e_c + t) via Jet division; the first
   piece uses e_c > 0 only for the point, while Y2 and Zc use the s-integral, so eps = 0 is covered.
5. Z1 = Z1c + delta Zc with block norms: row sums are subadditive; Dp contains d/dxi of xi [J]_{-m'} as [J] + xi [J'];
   the tail rows include Abar1 |tom| as a full matrix.
6. Lemma P (Cauchy on polydisc, Banach-algebra series, Cauchy in sigma): proof checked; cover polynomial contains
   c(xi) + sigma w(xi) + zeta for |sigma| <= T (EpsCover.contains, T - e_hi > 0); tau, P, aJ, W0, WE, v1 and through_A
   match the written bound term by term, including the Delta g parts through MG.
7. Jet recurrences (exp, log, sqrt, reciprocal) and branch.Hess (product, unary rules) re-derived and correct; 
   g_Ks enters the model only in i_Ks = g_Ks Xs^2 (V - E_Ks), so f is affine in g.
8. existence._radii: p(r_lo) < 0, p(r_hi) < 0, Z1 + Z2 r < 1; the fallback r_hi = r_lo (21 of 68, confirmed with jq) is
   handled by the smaller root r_1 < r_lo in the continuity proof, which is correct; collect checks p < 0 and
   contraction < 1 for every piece.
9. Gluing (Lemma B4, centre_distance, glue): norms compared in the right direction; same nu for both pieces (all 68 pieces
   log rho0 = 1/8, rho2 = 3/4, R = 1/256, G_R = 1/4096); 67 gluings re-derived in the builder's run.
10. Piece-proof code is identical across the five run copies (diff, hunks only outside lines 859 to 2160); the logged hashes
    of pieces 31 to 67 and of theoremA.json equal the copies' SHA-256. Source hashes in the record all match the files; so
    do the six data hashes; the branch snapshot (730 and 728 lines) hashes match the first lines of the branch logs.
11. Theorem A: Lemma K for equilibria (X_c inside X_G, same centre), mean value form of A(g), Gershgorin identification of
    the critical eigenvalue for the right and the left eigenpair (dlambda_dg now requires the left ball to avoid all discs
    but D1), the formula pTA'q/(pTq), the scaled to physical conversion for l1, and Kuznetsov's formula (matches the known
    values on four test systems of both signs; omega l1 = -2.68373 against MATCONT -2.6838).
12. Corollary B(a): contiguity, polydisc inclusion by |xc - xP| + r <= rP, c*(0) in P, g*(0) in W; with Theorem A(d) it
    gives g*(0) = g_H and omega*(0) = omega_H (at g_H the other axis eigenvalue is -i omega, so it is the one in D2).
13. Lemma D: eps_s = 2 a_{1,V}; w = a / eps_s; the bound sums |abar/X - wbar(X)| nu^m (X a ball for every eps in it) plus
    eta r / min X; nu = e^{1/8} <= nu_P = e^{1/4}; modes beyond K handled by the radius; coverage of E. At g_s = 0.02778
    eps_s lies in one piece (66), 7.3e-8 against r_hi 1.19e-5.
14. Theorem C: complete lines of the append-only branch logs are copied, validated (676 pieces, 675 gluings) and hashed
    together; g_s = 0.02778 lies in piece G53P6; the intermediate value argument on [0, eps_s] covers [g_s, g_H), and the
    branch covers [0.027499735464, g_s] since the chain reaches 0.02778134123. The hopf point proof mirrors
    branch.stability_points call for call.
15. The cited Hopf theorem is used only in Corollary A, Corollary B(b) and Part S.1, with "not quantified" stated; Part S
    claims pointwise stability only at the 12 listed G_Ks values and I confirmed the six multiplier bounds against the
    record. Record numbers (Z1, Z2, Y0, r, T, g at eps end, gluing slack, times) equal the logs by jq.
16. The two README/record statements "gap closed" are labelled computer-assisted with "no outside review".

## Commands run

- Read AGENTS.md, LEMMAS-hopf.md, hopf.py (about 2,000 lines), test_hopf.py, the README section, parts of branch.py,
  existence.py, fourier_eval.py, arbmodel.py; jq, sha256sum, head, diff, wc on the logs and record (no writes).
- `nice -n 10 env OMP_NUM_THREADS=1 timeout 900 python3 hopf-review/widen.py 3/250` (one cover, 20 s, one piece proof;
  fails by the radii polynomial).
- `... z2_float.py 0 40` and `... z2_float.py 67 12` (float checks of Y0p, Y1, Z1c, Z2).
- `... disc_conj.py 25` (G_H and 25 cover intervals).
- I did not run test_hopf.py; I read the builder's log (51 checks, 2 failed).
All scripts and outputs are under the session scratchpad `hopf-review/`; nothing was written to fourier/data or results.
