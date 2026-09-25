# Referee of the weak-cluster theorem (2026-09-25): SOUND WITH FIXES (statement fixes, not math)
1. D_C -> 0: handled implicitly; add: in the limit (B) gives D*T* = (G*^2 - S2*)/2; if D* = 0 then G*^2 = S2* >= c^2, so G* != 0, T* = 0, Lambda* = 1/|Z*|^2 and P -> infinity; hence with P bounded |D_C| >= S2/(2 sup|T~|) > 0 uniformly. Cite (B) where the outline says "Else every T*_C != 0".
2. Class: use |z_k - Z_C| <= gamma/c (or Z_C a member) instead of "diameter <= gamma/c". Theorem 3's class is contained in K(2m, c^2).
3. (a) covers all of K(n,c) (finite partitions, compact limit shapes, singletons included); same-sign clusters with >= 2 members admit no collapses; self-collapsing clusters fall in the stationary branch (P -> infinity); nested scales are EXCLUDED by hypothesis (say so); gamma_1 is not uniform as c -> 0 (say so).
4. (b) phrase like Thm 3(c): p_C -> 1/2, liminf y_C > 0, distance to the set of translating relative equilibria -> 0; net circulation as a ratio: Sum_C Gamma_k / ((1/(2 Gamma_0)) Sum_C Gamma_k^2) -> 1; cite nu^ - 1 = -gamma^2 S2/4 (numerics) as consistent with Sum_{i<j} Gamma_i Gamma_j = 0.
5. (d) constants valid for every n; actual |e1| ~ 1.2 n gamma/c^3, |e2| <= n gamma/c^3.
6. Numerics: 21 stored collapses re-checked independently (residual ~1e-22, 25-digit storage); P < sqrt(3)/2 really occurs, so NO analogue of Proposition 4 for clusters: state it; slope -0.848 is for g = (1, 0.6, -1.6) only, from 2 sqrt3 g1 g2 g3/S2; replace loose pass tolerances with convergence tests; P_min minimized over y only with cluster shapes and directions fixed.
Independent check script: ../review7/indep.py

## Disposition in the draft (2026-09-25)

1. D_C -> 0: the translating branch of Step 4 derives D* != 0 from (B), and says that D* = 0 forces G*^2 = S* >= c^2, hence T* = 0 and the stationary branch (P -> infinity).
2. Class: |z_k - Z_C| <= gamma/c (eq. (5)); the class of the companion's Theorem 3 lies in K(2m, c^2) (Section 3.1; checked in verify_cluster_identities.py).
3. Remark 1: all of K(n, c) covered; singletons (stationary branch, part (d)); same-sign clusters of two or more excluded for small gamma (Step 5); self-collapsing clusters in the stationary branch; nested scales excluded by hypothesis; gamma_1 not uniform as c -> 0 (the Demina-Kudryashov seven-vortex collapse lies in K(6, c) with gamma = c; checked in verify_cluster_collapses.py).
4. Part (b) is phrased like the companion's Theorem 3(c) (bounded P): both signs, p_C -> 1/2, nuhat_C -> 1 as a ratio, max|w_k - w_l| -> 0 (distance to translating relative equilibria), y_C > 0, P - (y^2+3/4)/(2y) -> 0; Remark 3 cites nuhat - 1 = -gamma^2 S/4 as the exact consequence of sum Gamma_i Gamma_j = 0 for one cluster (checked to 1e-36 on the stored collapses).
5. Part (d): P >= c^3/(40 n gamma) for gamma <= c^3/(20 n), valid for every n (|e1| < 1.2 n gamma/c^3, |e2| <= n gamma/c^3; both checked exactly and on random configurations with up to 40 weak vortices).
6. Remark 2 states that there is no analogue of the companion's Proposition 4; the slope -0.848 is attributed to g = (1, 0.6, -1.6) only; the loose tolerances are replaced by convergence tests (ratio per decade of gamma); P_min is described as minimized over y with shapes and directions fixed; the 21 stored collapses are rechecked by verify_cluster_stored.py (60 digits; the stored values now have 40 digits, residual below 3e-36).
Also: sharpness is proved for even n only (the companion's families); for odd n it is numerical (triple; pair and triple).
