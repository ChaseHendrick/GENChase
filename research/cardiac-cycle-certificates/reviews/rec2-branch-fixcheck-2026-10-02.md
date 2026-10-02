# Rec 2 branch review: fixes made (fix-check), 2026-10-02

Fixes to the findings of `reviews/rec2-branch-review-2026-10-02.md`, made by the builder of Theorem C (not by the
reviewer). No bound was changed: every change is to text, tests, a refusal check or a latent code path that the
record never reached. The logged run data and results/fourier-branch-gks.json are unchanged. This file lists what was
done; it is not a second review of the fixes.

| finding | fix | where |
|---|---|---|
| GAP 1 (section 2 said J_n, J_fin, J0hat are enclosures over all g) | Section 2 now says that J_n, J_fin and J0hat are enclosures at the point g_c, and that the width of G enters Z1 only through delta * B1g and Y0 only through delta * Y0g (section 3). | branch.py docstring, section 2 |
| GAP 2 (gluing proved for consecutive overlaps only) | Both remedies. (a) Section 5 now contains the argument for non-consecutive overlaps: an agreement point g0 = lo_j lies in every consecutive overlap between i and j (this needs both endpoints strictly increasing), and the agreement set is closed and open in P_i n P_j (open because x*_i(g1) lies in the closed r_lo(j) ball, inside the open r_hi(j) ball, which needs r_lo < r_hi). (b) The two hypotheses are checked: new `check_piece_order` refuses a record whose pieces (sorted by g_lo) do not have strictly increasing g_lo and g_hi, or a piece with r_existence not < r_uniqueness (exact dyadics); it is called by `validate_logs` (so by `run` on resume and by `collect`), and `collect` records the number of non-consecutive overlaps (`nonconsecutive_overlaps`, 0 in this record). | branch.py section 5, `check_piece_order`, `validate_logs`, `collect` |
| WEAK TEST 1 (nothing exercises delta * B1g) | New `test_B1g_term_detected`: an independent float computation of the finite block of A d_gDF (float Galerkin matrices with 8 times the DFT nodes; d_g G = G(g = 1) - G(g = 0) exactly, f being affine in g; float A_fin) is dominated block by block by the rigorous finite block (now returned by piece_blocks as `B1g_ff`, a value it already computed), which is at most B1g; the float weighted norm is at least half the rigorous one, so a B1g that is too small or zero fails. New mutation `drop_B1g` in `assemble` (omits only delta * B1g); the test checks that it lowers Z1 and leaves Y0 unchanged. | test_branch.py; branch.py `assemble`, `piece_blocks` (one more returned key) |
| WEAK TEST 2 (no widening control; 2x passes legitimately) | New `test_negative_widened_piece` on the last piece (G16P15): the same centre, weights and r_* on [g_c - 3 hw, g_c + 3 hw] (cover rebuilt over the wider range) must raise ProofFailure; the 1x piece with the same inputs passes (control). | test_branch.py |
| WEAK TEST 3 (acceptance reproduced Z2 only to 1 per cent) | The acceptance test rebuilds the group's Hessian cover from the group's centres in g_lo order over the group's range (`_group_cover`), asserts that its digest equals the logged `hess.phi_digest`, and compares Y0, Z1, Z2, r_existence and r_uniqueness with the logged exact hex values. | test_branch.py `test_acceptance_piece_containing_stage_E_point` |
| MINOR 1 (Hess.__pow__ wrong for negative exponents) | The second derivative is now n (n - 1) v^(n - 2) for every integer n other than 0 and 1 (n = 0, 1 handled before). New `test_hess_pow_negative` checks value, first and second derivative for n = -1, -2, -3, 2, 3 and a chain (2x + 1)^-2 against the closed forms. | branch.py `Hess.__pow__`; test_branch.py |
| MINOR 2 (glue() does not check nu) | `glue` compares the two pieces' `settings.rho0` as exact strings and returns glued = False (with the reason) if they differ or are missing. `test_negative_gluing` adds the control (rho0 = 1/8 on one side). | branch.py `glue`; test_branch.py |
| MINOR 3 (status string pinned by a test) | Left for the coordinator, as instructed. | - |
| MINOR 4 (README wording) | The finalization check now says that validate.py lies outside the repository and reuses branch.py's centre parser, `_dstr` and digest (not fully independent code), and that the review rebuilt the group covers (digests reproduced) and reproduced Y0, Z1, Z2 and both radii bit for bit on four pieces; the acceptance test now does the same for the piece containing 0.0275. | README.md, rec 2 section |

A side effect in the tests: the log-tampering control of `test_log_validation_and_repair` shrank r_uniqueness to
2^-80, which the new order check now refuses before the gluing is re-derived. The test now makes two tampers: 2^-80
(refused by the order check, message "r_existence") and r_existence + 2^-400 (passes the order check, refused by the
re-derived gluing, message "glue").

## Test run

`PYTHONPATH=<python-flint 0.9.0> nice -n 10 timeout 2400 python3 test_branch.py`, run after all changes above:
see the result line appended below.
