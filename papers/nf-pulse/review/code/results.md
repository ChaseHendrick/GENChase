| Mutation | File | What | run_all exit | Checks that fail |
|---|---|---|---|---|
| baseline |  | no change | 0 | **none (all 15 pass)** |
| M01_no_lagrange_remainder | lohner.py | drop the Lagrange remainder of the Lohner step | 0 | **none (all 15 pass)** |
| M02a_picard_accept_unchecked | lohner.py | a priori enclosure accepted without the Picard test | 0 | **none (all 15 pass)** |
| M02b_picard_F_at_X_not_W | lohner.py | Picard test with F evaluated on the initial box instead of the candidate W | 0 | **none (all 15 pass)** |
| M02c_picard_no_inflation_tiny_W | lohner.py | a priori enclosure replaced by the midpoint of the Taylor guess, no test | 0 | **none (all 15 pass)** |
| M03a_Binv_transpose | lohner.py | B^{-1} replaced by B^T (assumes exact orthogonality) | 0 | **none (all 15 pass)** |
| M03b_no_QR_parallelepiped | lohner.py | no QR: B = mid(J B) itself, inverse still rigorous (sound by design) | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block; N negative control, the orbit at c1 asked to reach K+, is refu |
| M03c_no_QR_and_transpose | lohner.py | non-orthogonal B with B^T as inverse | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block; N negative control, the orbit at c1 asked to reach K+, is refu; N negative control c = 1.1024, far from the pulse speed, is re |
| M03d_B_fixed_identity_inverse | lohner.py | B^{-1} replaced by the identity | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block; N negative control, the orbit at c1 asked to reach K+, is refu; N negative control c = 1.1024, far from the pulse speed, is re |
| M04_drop_dkappa_jacobian | lohner.py | drop the d/dkappa term of U' in the Jacobian (kappa column) | 0 | **none (all 15 pass)** |
| M05_drop_dkappa_V | lohner.py | drop the d/dkappa term of V' in the Jacobian | 0 | **none (all 15 pass)** |
| M06_jacobian_at_xbar_not_hull | lohner.py | mean-value Jacobian evaluated at the point xbar instead of over the hull | 0 | **none (all 15 pass)** |
| M07_remainder_at_point | lohner.py | Lagrange remainder coefficient evaluated at xbar instead of over W | 0 | **none (all 15 pass)** |
| M08_drop_C_residual | lohner.py | drop the (J C - mid(J C)) R0 term | 0 | **none (all 15 pass)** |
| M09_hull_interior_always | lohner.py | hull_contains_interior always True (Picard test vacuous) | 0 | **none (all 15 pass)** |
| M10_cone_C_always | block.py | condition (C) not enforced | 0 | **none (all 15 pass)** |
| M11_cone_C_only_one_s | block.py | (C) and (E) checked at s = smin only | 1 | B negative control U up to 0.15 is refused |
| M12_entrance_E_always | block.py | condition (E) not enforced | 0 | **none (all 15 pass)** |
| M13_entrance_E_weakened | block.py | (E) without the off-diagonal ||A21|| term | 0 | **none (all 15 pass)** |
| M14_block_urange_x3 | prove_pulse.py | block B allowed a U-range three times the one (C),(E) were certified on | 0 | **none (all 15 pass)** |
| M15_block_DU_check_wider_s | prove_pulse.py | block with |U| <= 0.15 (S' > 1 inside), should be refused | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block; N negative control, the orbit at c1 asked to reach K+, is refu; N negative control c = 1.1024, far from the pulse speed, is re |
| M16_flip_cone_sides | certify_rest.py | expected cones swapped (K+ for c1, K- for c2) | 1 | P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block |
| M17_in_K_nonstrict_upper | prove_pulse.py | cone test on the most favourable point of the enclosure | 0 | **none (all 15 pass)** |
| M18_skip_between_steps_check | prove_pulse.py | phase 2 path check (between grid points) removed | 0 | **none (all 15 pass)** |
| M19_between_steps_no_remainder | prove_pulse.py | phase 2 path enclosure without its remainder | 0 | **none (all 15 pass)** |
| M20_in_int_B_rho_x2 | prove_pulse.py | interior-of-B test with rho doubled | 0 | **none (all 15 pass)** |
| M21_in_int_B_rho_x0p8 | prove_pulse.py | interior-of-B test with rho x 0.8 (stricter; should fail if margin is thin) | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block |
| M22_c2_eq_c1_plus_1e-26 | certify_rest.py | c2 = c1 + 1e-26, below c* (both ends on the K- side) | 1 | P the orbit at c2 enters the cone K+ inside the block |
| M23_c2_eq_c1_plus_3e-26 | certify_rest.py | c2 = c1 + 3e-26, just below the numerical c* = c1 + 3.6e-26 | 1 | P the orbit at c2 enters the cone K+ inside the block |
| M24_c1_eq_c1_plus_4e-26 | certify_rest.py | c1 moved just above c* (both ends on the K+ side) | 1 | P the orbit at c1 enters the cone K- inside the block |
| M25_theta_plus_1e-20 | nfcore.py | theta perturbed by 1e-20 in nfcore only | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block |
| M26_eps_plus_1e-20 | nfcore.py | eps perturbed by 1e-20 in nfcore only | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block |
| M27_beta_plus_1e-20 | nfcore.py | beta perturbed by 1e-20 in nfcore only | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block |
| M28_both_c_plus_1e-20 | certify_rest.py | c1 moved up by 1e-20 (c1 > c2 then) | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block |
| M29_eps_float_0p1 | nfcore.py | eps from the double 0.1 (= 0.1 + 5.55e-18) | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block |
| M30_manifold_no_tail | manifold.py | unstable manifold tail bound dropped at evaluation | 0 | **none (all 15 pass)** |
| M31_manifold_validate_always | manifold.py | tail fixed-point inequality not enforced | 1 | M negative control sigma x 8 is refused |
| M32_manifold_wrong_eigvec | certify_rest.py | eigenvector perturbed by 1e-3 in one component | 1 | R rest state unique, s = S'(0) < 1, one unstable and three sta; P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block |
| M33_manifold_t_1 | prove_pulse.py | manifold evaluated at t = 3/2, outside the validated |t| <= 1 | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block; N negative control, the orbit at c1 asked to reach K+, is refu |
| M34_iv_check_fails | block_check_iv.py | independent block re-check made to FAIL (does run_all notice?) | 0 | **none (all 15 pass)** |
| M36_rest_s_ge_1_theta | certify_rest.py | R2 s < 1 not enforced | 0 | **none (all 15 pass)** |
| M37_jacobian_test_broken | lohner.py | wrong Jacobian (dQ row doubled): caught by test J? by the proof? | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block |
| M38_negctrl_wrong_field | nfcore.py | Taylor recursion inconsistent with vfield (P' = Q - 1.0000000001 Y) | 1 | P every orbit with c in [c1, c2] is in the interior of the blo; P the orbit at c1 enters the cone K- inside the block; P the orbit at c2 enters the cone K+ inside the block |
