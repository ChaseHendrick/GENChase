# Chaos in the Hodgkin-Huxley equations: relocation, and a plan for a computer-assisted horseshoe proof

**Status: numerical evidence and a proof plan, not a proof.** Every number in this folder comes from float64
integration (an adaptive DOP853 at rtol 1e-14, atol 1e-16, compiled with numba), checked where stated by a
256-bit Taylor-series integrator (python-flint `arb_series`, order 36) whose truncation error is controlled but not
enclosed. Nothing here changes the status of `papers/hh-dynamics/`: the proved results there are the equilibria and the
Hopf points. Work of 2026-09-26.

## 0. Summary

- **Guckenheimer and Oliva's points are reproduced, and the discrepancy found earlier is resolved.** Their p1 and p2 are fixed points of
  the return map to u = 4.5 crossed with u **increasing** (v decreasing in their sign convention), at their current
  I = 7.8617827403 with E_l = 10.599: |P(p1) - p1| = 2.0e-9 and |P(p2) - p2| = 7.5e-8 (256-bit). p1 lies 8.6e-9 from the fixed point, so it is good to about 8
  digits, not the 14 printed; p2's residual is at the level its multiplier 2.8e7 allows. Their text says "with v increasing"; on that crossing direction the points miss by
  about 0.16, which is the miss the earlier probe found. With our E_l = 10.5989209693917 the same orbits sit at
  J = 7.861806449482 (J + 0.3 E_l is invariant).
- **p1 lies on the branch of periodic orbits born at the lower Hopf point** (orbit A, multipliers +33.07, +0.284, and a third of about 3e-37 by Liouville's formula).
  **p2 is a third orbit, C** (period 22.66 ms, multipliers +2.81e7, 4.7e-4), and it sits next to the one-return firing threshold of the section (within the resolution of our scans).
  The saddle with the negative multipliers that G&O describe is a different orbit, B (multipliers -510.0, -0.190), on the same
  branch past a period doubling.
- **Branch from the lower Hopf point** (E_l exact): fold F1 at J = 7.8465708, a complex pair of multipliers on
  [7.847018, 7.848048], period doubling PD1 at J = 7.8495611, then J increases to a second period doubling PD2 at 7.9220014 and a
  second fold F2 at 7.9220092. In G&O's convention PD2 and F2 are at I - 7.92197 = 0.77e-5 and 1.55e-5, the interval of their
  Figure 2.1(b).
- **A horseshoe candidate that avoids the 2.8e7 multiplier.** At J* = G&O's current, the return map is a three-lap map
  along its unstable direction, with laps through A (slope +31 to +41), B (slope -180 to -2800) and C (slope about 2.6e7). Two curved
  h-sets N_A and N_B around the A and B laps (dimensions u = 1, s = 2) satisfy the four covering relations
  N_A => N_A, N_A => N_B, N_B => N_A, N_B => N_B in dense sampling. The exit faces land at |xi'| >= 13.9 (the target has |xi| <= 1),
  and the whole image stays within |eta'| <= 0.83 and |zeta'| <= 0.035. Every one of the 71 primitive cycles of the full 2-shift up
  to period 8 was found by Newton, lies in the h-sets its itinerary names, and has a residual <= 1.8e-11.
- **Cost of a proof.** One return lasts 16 to 19 ms of model time, about 100 Taylor steps of order 20 in double
  precision. First-order (C^1, Lohner) enclosures need tens of boxes per covering relation by our derivative bounds; with a
  safety factor of 10 to 100, 10^3 to 10^4 box integrations in all. That is minutes in CAPD (C++), and hours with a
  python-flint implementation.
- **Threshold.** At fixed gates next to the horseshoe, the fate of a state (action potential or rest) is not monotone in u: switch
  counts 1, 3, 5, 9, 11 among 10^2 ... 10^6 equally spaced voltages in a 4 uV window. So, numerically, no threshold
  function exists at those gates. A depolarization from rest shows a single clean threshold down to about 1e-14 mV (the float64
  floor), as G&O's "hardly observable" remark anticipates.
- **Literature.** Oliva's Cornell thesis (1998, advised by John Smillie) is on the complex Henon map and does not mention
  Hodgkin-Huxley. The Guckenheimer and Meloon preprint (1999) has no Hodgkin-Huxley example and no proof of chaos.
- **Independent check:** an independent re-implementation with a different integrator reproduced every number within float64
  limits and could not break the covering relations (about 400,000 sampled returns); it corrected two statements (section 11).

## 1. Conventions

As in `papers/hh-dynamics/code/hh_ball.py`: u = depolarization from rest (mV), J = applied depolarizing current (uA/cm2), time
in ms, 6.3 C, Hodgkin and Huxley's constants. E_l = 10.5989209693917 (the value that makes the resting current zero; `hhc.el_zero_current`).
G&O write v = -u and print the current with the wrong sign (their Hopf point at I = 9.78 is our J = 9.78); their I equals our J
up to the leak offset 0.3 (10.599 - 10.5989209693917) = 2.37092e-5.

**Section.** u = 4.5 crossed with u increasing; coordinates x = (m, n, h). The return is transverse on everything used here:
du/dt = 1.28 to 1.42 at arrival, including points next to the firing threshold.

**Section coordinates.** c = E^{-1}(x - A), where A is the fixed point of orbit A and E the unit real eigenvectors of DP(A)
(columns: unstable, weak stable, strong stable, signs fixed so that B has c1 > 0, c2 < 0). At J*:

    A = (0.0850833767999797, 0.376983747223915, 0.437272801513278)
    E = [[-0.03471112,  0.01728867,  0.99723416],
         [-0.19172658,  0.12514163,  0.06653703],
         [-0.98083437,  0.99198824, -0.03311866]]      (full precision in data/horseshoe_Jgo.json)

## 2. What Guckenheimer and Oliva claimed

Guckenheimer and Oliva, SIAM J. Appl. Dyn. Syst. 1 (2002) 105-114 (author copy read in full; not committed). They continue the
periodic orbits from the subcritical Hopf point (I about 9.78) with AUTO and with a Taylor-series multiple-shooting code
(Guckenheimer and Meloon 2000); report three folds and a period doubling on a branch S near I = 7.92197 (their Figure 2.1).
They then look for horseshoes at I = 7.8617827403. They give two fixed points p1, p2 of the return map to v = -4.5, and two boxes
R1, R2 (their Table 2.1) built from pieces of the unstable manifolds of p1 and p2. Their Figure 2.2 shows the images of the boxes
crossing both boxes, "evidence" for a Smale horseshoe in Moser's sense (p. 110). They state on p. 106 that they do not give a
rigorous proof. On p. 111 they conjecture that no threshold function v_t(m, n, h) exists over a small range of currents, and that
the boundary between the basins of rest and of repetitive firing is fractal and contains the stable manifold of the chaotic set.
The caption of their Figure 3.1 gives I = 14.2211827403, which differs from the text by 0.3 x 2 x 10.599 = 6.3594, i.e. by a flip of
the sign of the leak potential.

## 3. What we reproduced, and what differs

| Item | G&O | Here (numerical) |
|---|---|---|
| Lower Hopf point | I about 9.78 | J_H = 9.7797 (proved in `code/certify_equilibria_hopf.py`); the branch amplitude^2 extrapolates to 0 at J = 9.782 and the period to 2 pi/omega_H = 10.718 ms |
| Section direction | "v increasing" (u decreasing) | their p1, p2 are fixed points only for u **increasing**; with u decreasing they miss by about 0.16 |
| p1 | (0.08508337639787, 0.37698374610906, 0.43727279295129) | orbit A: \|P(p1) - p1\| = 2.0e-9 at I, E_l as printed (float64, 256-bit Taylor and the independent check agree); p1 is 8.6e-9 (in h) from the fixed point, so good to about 8 digits; T = 15.8503 ms; multipliers +33.07, +0.284 |
| p2 | (0.08499590453730, 0.37635277095981, 0.43229451177364) | orbit C: \|P(p2) - p2\| = 7.5e-8 at 256 bits (float64 codes give 7.5e-8 to 9e-7, their noise level at multiplier 2.8e7); T = 22.655 ms; multipliers +2.81e7, +4.7e-4 |
| multipliers "negative unstable, negative stable, tiny positive" at 7.8618 | describes the orbit through p1 | true of orbit B (-510, -0.190, and a third of about 1e-43), not of A (p1) |
| folds / period doublings | 3 folds, PD on the red branch, dramatic change of lambda_2 for I - 7.92197 in [0.6, 1.6] x 1e-5 | F1 7.8465708, PD1 7.8495611, PD2 7.9220014, F2 7.9220092 (E_l exact); in G&O's convention PD2 and F2 at I - 7.92197 = 0.77e-5 and 1.55e-5. The third fold (onto the stable firing orbits) was not reached |
| boxes R1, R2 | f(R_i) crosses R1 and R2 | not refuted, but hard to verify: see 5.4; about half of R1 lies beyond the firing threshold, and the crossings of R2 happen in slivers about 1e-12 wide |

## 4. The branch of periodic orbits from the lower Hopf point

Pseudo-arclength continuation by single shooting on u = 5.2404 (u decreasing) in (m, n, h, J), 20,000 accepted points,
`code/continuation.py`; features by `code/branch_features.py` (`data/branch_features.json`). Along the branch (J from the Hopf point):

| Segment | J | Floquet multipliers outside the unit circle |
|---|---|---|
| Hopf point to F1 | 9.7797 down to 7.8465708 | one, positive, 1.15 (at J = 9.5, where the continuation starts; orbits seeded at 9.3 to 9.65 extrapolate to amplitude 0 at J = 9.782) to 25.8 (orbit A family) |
| F1 (fold), T = 16.71 ms | 7.8465708 | a second multiplier through +1 |
| F1 to PD1 | 7.8465708 up to 7.8495611 | two; they collide and form a complex pair (modulus 5.6 to 6.1) on [7.847018, 7.848048] and come out negative |
| PD1 (period doubling), T = 17.16 ms | 7.8495611 | the smaller one through -1; the other is -42.9 |
| PD1 to PD2 | up to 7.9220014 | one, negative: -43 at PD1, -510 at J* (orbit B), largest modulus 4.0e4 at J = 7.91970, -3.1e3 at PD2 |
| PD2, F2 | 7.9220014, 7.9220092 | two between them (a tiny complex segment at 7.9220073, modulus 55.7), fold F2 at T = 20.71 ms |
| after F2 | down to 7.9118 (end of the computation) | one, positive, 3.1e3 to 1.44e6; u_max rises from 18.7 to 20.2 |

Orbit C (u_max 22.47, multiplier 2.8e7 at J*) is probably on the continuation of this last segment, but the continuation became
too slow (arclength steps of 5e-6 on the near-vertical branch) and was stopped at J = 7.9118. That C lies on the Hopf branch is
therefore not established here.

## 5. The return map at J* and the horseshoe

**J* = 7.861806449482496** (E_l exact), i.e. G&O's I = 7.8617827403 at E_l = 10.599.

### 5.1 Geometry

On lines c2 = const the first coordinate of the image, c1', has three zeros z1 < z2 < z3 left of the one-return firing
boundary (the c1 beyond which the next return contains a spike; see `data/zero_curves_Jgo.npy`, `code/scanJ.py`):

- lap 1 through A, increasing, slope 31.5 to 40.6; its maximum c1' is 1.1e-4 (bottom) to 9.0e-4 (top);
- lap 2 through B, decreasing, slope -184 (bottom) to -2802 (top); its minimum is -5.9e-4 (bottom) to -5.5e-5 (top);
- lap 3 through C, increasing with slope 2.5e7 to 2.6e7, its zero 1.0e-10 to 1.2e-10 left of the firing boundary
(all over the window c2 in [-4.8e-3, 8e-4] of the h-sets).

The distance from z2 to the firing boundary is 1.6e-7 (top of the window) to 1.1e-6 (bottom). The map is continuous across the
boundary: the crossing stays transverse (du/dt about 1.3); only the label "spike during this return" changes, and points just
right of it are thrown far away (c1' about 3e-2, c2' about 5e-2).

### 5.2 Periodic orbits (256-bit polish; `data/hp_points.json`, `code/hp_newton.py`)

| Orbit | Point on the section (m, n, h) | Residual \|P^k(x) - x\| | Period (ms) | Multipliers | Lyapunov exponents (1/ms) |
|---|---|---|---|---|---|
| A | (0.0850833767999797180787, 0.3769837472239149341109, 0.4372728015132783948672) | 4.6e-47 (256-bit; float64 start 1.0e-14) | 15.85030765456 | +33.0750, +0.28382, 3.2e-37 (Liouville) | +0.221, -0.079, -5.30 |
| B | (0.0850242803889671853218, 0.3765574959290348228939, 0.4339092819779152506987) | 1.0e-44 (256-bit; float64 start 2.5e-12) | 17.80211535589 | -509.969, -0.19017, 9.1e-44 (Liouville) | +0.350, -0.093, -5.57 |
| C | (0.0849959045373393334217, 0.3763527709600990809554, 0.4322945117759200968591) | 1.6e-27 (256-bit; float64 start 5.2e-08) | 22.65523985385 | +2.814e7 to 2.819e7, 4.5e-4 to 5.1e-4 (spread over integrators), third not resolved | +0.757, -0.34, not resolved |
| AB (2 returns) | (0.0850187934177703033869, 0.3765172837185683008167, 0.4335863611388050708808) | 1.5e-42 (256-bit; float64 start 3.2e-10) | 34.52310172439 | -5.734e4, -0.0448, third not resolved (below roundoff) | +0.317, -0.090, not resolved |

Points and periods are the 256-bit values (points to 22 digits; the period balls have radius below 1e-23, which reflects only the
arithmetic, not the truncation). The float64 points differ from them by at most 4e-15 (A, B, C) and 7e-15 (AB). In float64 alone the
Newton residuals are 1.3e-14 (A), 8.9e-13 (B), 8.3e-8 (C), and <= 1.8e-11 for all 71 cycles up to period 8. For C the float64
integrator's local error (rtol 1e-14) is amplified by the multiplier 2.8e7, so its float64 residual and return time are only good to
about 1e-7 and 1e-4 ms (two float64 runs gave T = 22.65521 and 22.65530); the 256-bit values settle it.
Unstable dimension: one (every cycle has exactly one multiplier outside the unit circle). The third (strong-stable) multipliers are
float64 roundoff in our runs (earlier values of about 1e-13 and third Lyapunov exponents of -1.9 and -1.6 per ms were noise); the
independent check computed them from Liouville's formula (the integral of tr Df over the period is -81.784 for A and -94.533 for B).
For C even the weak multiplier is only resolved to about 10% in float64.

### 5.3 The h-sets (recommended; `data/horseshoe_Jgo.json`, key `hsets`)

In section coordinates c = (c1, c2, c3), with s = (c2 + 0.002)/0.0028 (so c2 in [-4.8e-3, 8e-4]):

    N_k = { c = ( z_k(s) + w_k(s) xi , c2 , 1e-6 zeta ) : xi, zeta in [-1, 1], s in [-1, 1] },   k = A, B

- u-direction xi (along c1, the unstable direction of A), s-directions eta = s (weak stable) and zeta (strong stable).
- z_A, z_B: degree-8 polynomials in s fitted to the zero curves z1, z2 (fit error 3e-10); coefficients in the JSON.
  z_A runs from 3.45e-5 (bottom, s = -1) through 0 (at A, s = 0.714) to 9.2e-7 (top); z_B from 4.04e-5 (bottom) down to 2.30e-5
  (c2 about -1.5e-3) and up to 3.17e-5 (top).
- widths: w_A = 2.5e-6 (constant), w_B(s) = 0.3 x (distance from z2 to the firing boundary), 3.3e-7 (bottom) to 4.8e-8 (top).
- centres: A lies in N_A at (xi, eta, zeta) = (-4e-5, 0.714, 0); B lies in N_B at (-0.32, -0.487, 0.026). In the original coordinates
  both sets are thin curved sheets 0.0056 long along E[:,1] (almost the h axis), 5e-6 (N_A) or 1e-7 to 7e-7 (N_B) wide along E[:,0]
  and 2e-6 thick along E[:,2]; N_B lies 6e-6 (bottom) to 3.1e-5 (top) from N_A along E[:,0].

**Covering relations (sampled; `code/horseshoe.py`, `code/run_horseshoe.py`, `code/gocheck2.py ours`).** Sampling was 801 points
on each exit face times 3 values of zeta, and an 81 x 321 interior grid, plus the arc test of `gocheck2.py`.

| Relation | left exit face -> xi' | right exit face -> xi' | eta' on the whole image | \|zeta'\| max | arcs through the target |
|---|---|---|---|---|---|
| N_A => N_A | [-42.1, -31.1] | [31.5, 39.4] | [0.008, 0.795] | 0.010 | 15 of 15 lines cross, none meets the entry set |
| N_A => N_B | [-1918, -1366] | [595, 1020] | [0.008, 0.795] | 0.010 | 15 of 15 |
| N_B => N_A | [13.9, 39.5] | [-77.5, -38.9] | [-0.827, -0.308] | 0.035 | 15 of 15 |
| N_B => N_B | [151, 471] | [-796, -639] | [-0.827, -0.308] | 0.035 | 15 of 15 |

Degree: N_A preserves the orientation of xi, N_B reverses it. If these relations hold rigorously, then by Zgliczynski and
Gidea (J. Differential Equations 202 (2004) 32-58; Theorem 16 is the u = 1 criterion used here, with its conditions (76) to (79), and
Theorem 4 gives a periodic orbit for every closed chain of covering relations) every periodic sequence in {A, B} is realized by a
periodic orbit of P in N_A u N_B, and by compactness every bi-infinite sequence by an orbit. That gives a semiconjugacy to the full
2-shift and topological entropy >= log 2 for the return map. Our sampled test checks the stronger condition that the whole image of
N_i has |eta'| < 1 and |zeta'| < 1, which implies (76) and (77).

**Periodic orbits (numerical).** 71 primitive cycles = the full 2-shift count 2, 1, 2, 3, 6, 9, 18, 30 for periods 1 to 8, each found
by multiple-shooting Newton, each point in the h-set of its symbol, max residual per period 8.9e-13, 5.0e-13, 7.7e-12, 3.2e-12,
9.1e-12, 1.1e-11, 1.5e-11, 1.7e-11. Their multipliers reach 9e20 at period 8.

**The J-window of this construction** (`data/horseshoe_J*.log`; the window c2 in [-4.8e-3, 8e-4] at 7.8605 and J*, and at the other
currents a c2 window chosen automatically where the three zeros exist):
all four relations pass at J = 7.8605 and 7.8618 (J*). At 7.863 the automatic window ends at A itself (c2 = 0), so A's image lies on
the top face (eta' = 1 - 1e-12): borderline, and a slightly taller window would be needed. At 7.854, 7.857 and 7.859 the image of N_B falls below the window
(eta' down to -1.03 to -1.44); at 7.865 and 7.867 the image of N_A rises above it (eta' up to 1.21 to 1.43). At 7.87 the three
zeros exist only on c2 in [-7.5e-3, -2.5e-3]; at 7.88 and 7.90 there is no second zero on c2 in [-9e-3, 3e-3]. These are
failures of this particular design (the window and widths), not evidence that the horseshoe disappears. J* sits in the middle of
the window, so we recommend it.

### 5.4 G&O's boxes

`code/gocheck.py` (the boxes, trilinear charts through their eight vertices, affine outside) and `code/gocheck2.py go` (the arc test
of 5.3; `data/gocheck2_go.json`), at their I and E_l, on the section u = 4.5 crossed with u increasing. The u-direction of each box
is the pair (v1, v2) of their table, as their construction describes. Results (15 lines per relation):

- **About half of R1 fires** (48% of the sampled points spike during the return). R1's upper edge reaches c1 = 2.1e-4, far beyond
  the one-return firing boundary (about 3e-5), and so contains all three laps. The same holds for about a third of R2.
- **R1 => R1**: every line has one arc crossing R1 between its exit faces with |eta'| < 1, plus two passages through R1's slab
  outside R1 (eta' about -2.5 and -3.5: the images of the B and C laps).
- **R2 => R1**: every line crosses R1 close to its bottom face (eta' from -0.93 to -0.91); there are three more passages outside R1
  (eta' about -1.5, -2.0, -3.5), and on 7 of the 15 lines isolated samples inside R1 at eta' about -0.7, where the image of R2 enters
  R1 and leaves through the same exit face (the fold of the unstable manifold of C).
- **R2 => R2**: every line crosses R2 (eta' about 0.45), plus one passage of R2's slab far outside (eta' about -145).
- **R1 => R2**: a crossing of R2 was found on the 8 lines with eta <= 0 and on none of the 7 lines above. The crossing of R2 comes from
  the lap through C, a sliver of R1 about 1e-12 wide in c1 (slope 2.6e7). Our adaptive sampling may miss it, so the missing
  crossings are unresolved rather than refuted.
- No arc met an entry face (0 of 60 lines). With the affine extension of the charts, however, conditions (76) and (78)/(79) of
  Theorem 16 fail: the passages outside the boxes lie in the slabs, and for R1 => R2 and R2 => R2 both exit faces land on the same
  side, at xi' of 131 to 1443 (`data/gocheck.log`). Charts bent away from the boxes could repair this.

So G&O's configuration is not refuted by our sampling, but a proof built on it must resolve slivers about 1e-12 wide and expansions
of 2.8e7, and its R2 => R1 crossing runs within 0.07 of R1's height of a stable face. The boxes N_A, N_B of 5.3 avoid the orbit C
altogether. Their expansion per return (33 to about 6e3) is 10^3 to 10^6 times smaller, and their images stay inside the target's s-range everywhere.

## 6. Rates, stiffness, and the rigorous integrator

`code/rates.py` (`data/rates.json`), `code/taylor_hp.py` (`data/taylor_hp.txt`), `code/cost.py` (`data/cost.json`).

- Return times: 15.850 (A), 17.802 (B), 22.655 (C) ms; u stays in [-6.9, 22.5] (no spike on the h-sets: sampled u_max 13.7 on N_A and 15.7 on N_B).
- Expansion per return: 33 (A), 510 (B), 5.7e4 per two returns (AB), 2.8e7 (C). The largest derivative on the h-sets in their own
  charts is |dxi'/dxi| <= 1.4e3. The weak-stable multipliers are +0.284 (A) and -0.190 (B), with |deta'/deta| <= 0.69 in chart units,
  and the strong contraction is about 1e-37 (A) to 1e-43 (B) per return by Liouville's formula (float64 reports only roundoff there).
- Stiffness: the Jacobian eigenvalues along the orbits have real parts in [-10.3, +2.8] per ms. The problem is mildly stiff at most,
  and explicit Taylor methods are appropriate.
- Taylor radius of convergence of the solutions along A and B: 0.8 to 8 ms (root-test estimate). The 256-bit run used steps
  0.03 to 0.5 ms at order 36 (172 to 193 steps per return) with a last-term size below 1e-45. For double precision (target 1e-18
  per step), order 20 with steps about 0.13 x radius, i.e. 0.1 to 1 ms, gives about 50 to 150 steps per return.
- Precision: double-precision interval arithmetic suffices. The smallest h-set half-width is 4.8e-8 against coordinates of size 0.4,
  and round-off amplified by the largest expansion (about 6e3) is below 1e-12 in c, while the margins are 3e-5 in c1 (13 times
  w_A) and 5e-4 in c2: 7 orders or more. The strong contraction
  (1e-37 and smaller) is handled by Lohner's QR representation and needs no extra precision.
- Box counts (first-order enclosure, `code/cost.py`): per covering relation 3 to 12 boxes per exit face and 22 to 54 interior boxes, from
  sampled bounds on the first and second derivatives in chart coordinates and the margins (13 to 594 in xi on the faces, 0.17 to 0.20 in eta).
  With a safety factor of 10 to 100 for enclosure overestimation, 10^3 to 10^4 C^1 integrations of one return in total.
- Cost (estimates, not measured): in CAPD (C++, C^1 Lohner Taylor integrator, interval PoincareMap), about 10 to 50 ms per box,
  so minutes on one core. With the repository's python-flint stack (`hh_ball.py`), about 1 minute per box if the series are computed
  by recursion (not Picard iteration), so hours on four cores. Measured here: one 256-bit Taylor step of order 36 by Picard iteration
  (no variational equations) takes 0.06 s in python-flint.

## 7. The threshold conjecture

`code/threshold.py`, `code/threshold2.py` (`data/threshold2_ugates.json`, `data/threshold_rest.json`, `data/threshold_section.json`).
Fate of a state: AP if u exceeds 50 mV (G&O's cutoff v = -50) before the state enters the ball |u - u_eq| < 0.5 mV,
|gates - gates_eq| < 0.005 around the stable rest state (the nearest invariant set, orbit A, stays more than 6 mV away); REST if it enters
the ball first; undecided otherwise within 1000 ms (none occurred).

**At fixed gates next to the horseshoe (G&O's setting: u varies, gates fixed).** Gates g0 = the section point (z1(c2), c2 = -2e-3) of
N_A; u in 4.5 +- 2e-3 mV. (Moving u by 1 mV at fixed gates moves the section point by 0.016 in c1, so the segment crosses the laps of
A, B and C.)

| points N | 10^2 | 10^3 | 10^4 | 10^5 | 10^6 |
|---|---|---|---|---|---|
| AP/REST switches | 1 | 3 | 5 | 9 | 11 |

The gates are g0 = (0.0850486, 0.3767323, 0.4352831). At 10^6 points the fates run, in order of increasing u (run lengths in
units of 4e-9 mV): REST (to u = 4.50000087 mV), AP 9, REST 1, AP 302, REST 2, AP 9542, REST 98, AP 262634, REST 10, AP 163, REST 5596, AP
(to 4.502). For example u = 4.500000880 fires, 4.500000908 returns to rest, and 4.500000912 fires again. That pattern rules out a
threshold function at g0, numerically. The runs shrink from 1e-3 mV to 4e-9 mV. The numbers of cells containing both fates, for 10,
10^2, ..., 10^6 cells, are 2, 3, 4, 7, 10, 11, a log-log slope of 0.15. That slope is descriptive only: one segment, no error bar
claimed, and it is compatible with a Cantor set of dimension log 2 / log(expansion) for expansions of 33 to 510 (0.11 to 0.20). All
fates were decided (no undecided states within 1000 ms). Recomputing the 21 states next to the 11 switches at rtol 1e-12 changed
none. The uncertainty-exponent estimates in `threshold_rest.json` and `threshold_section.json` rest on 2 or 3 values of eps with
enough uncertain pairs, and are not informative.

**From rest (a brief depolarization du, gates at rest).** Bisection gives du* = 3.846513609774 mV. On a window of 1e-2 mV around
it, uniform scans (10^2 to 10^4 points) and nested refinement of the switch interval (factor 10 per level) show a single switch down
to intervals of 1e-14 mV, which is about 5 ulp of u. At 1e-15 mV the count jumps to 5, which is rounding noise. Numerically, then, the threshold for a depolarization from rest looks sharp at
every resolvable scale. That does not contradict G&O: layers of the stable manifold of the chaotic set would sit at relative scales
of 1/33 to 1/2.8e7 per return near the threshold, and they said the structure is "hardly observable ... even in computer simulation".

**On the section line c2 = -2e-3** (`threshold.py section`): switches 3, 3, 7 for 10^2 to 10^4 points; nested refinement of the switch
intervals gives 7, 7, 7, 9, 9, 11, 11 down to c1-widths of 3.5e-15 (it misses pairs of switches inside one interval, so these are lower
bounds). Deeper levels (27, 73, 75) are at or below the float64 resolution of the gates and are not counted.

These scans are evidence, not proof. A proof of "no threshold function at the gates g0" is a finite computation: rigorous
enclosures of the fates of three states (AP, REST, AP) at fixed gates, well separated from the switches. It could be done with the
same integrator.

## 8. Literature reached

- **Oliva's thesis.** R. A. Oliva, *On the Combinatorics of External Rays in the Dynamics of the Complex Henon Map*, Ph.D. thesis,
  Cornell University, May 1998 (advisor John Smillie; the revised version posted at math.stonybrook.edu/theses/thesis98-3, 155 pages,
  read by text search). It is about complex Henon maps; the words Hodgkin, Huxley, neuron, axon and horseshoe do not occur. Its
  acknowledgements thank Guckenheimer for welcoming Oliva at Cornell's Center for Applied Mathematics. The Cornell thesis-abstracts
  page gives the same title, year and advisor. Nothing in it bears on a proof of chaos in Hodgkin-Huxley.
- **Guckenheimer and Meloon**, SIAM J. Sci. Comput. 22 (2000) 951-985: the author preprint dated September 29, 1999 (36 pages,
  pi.math.cornell.edu/~gucken/PDF/cpoad.pdf) was read by text search and in its examples. It develops Taylor-series multiple shooting
  and collocation with automatic differentiation (ADOL-C) in IEEE double precision, with convergence theorems for the discretizations.
  Its examples are a planar polynomial system with a known invariant curve, a codimension-three unfolding with nested limit cycles
  (after Malo), a canard family, and coupled Josephson junctions. It contains no Hodgkin-Huxley computation and no rigorous (interval)
  enclosure of a flow. The published version was not reached. It is the code G&O used for the continuation, not a proof tool.
- Guckenheimer's publication list (pi.math.cornell.edu/~gucken/publications_20.html) has no later paper proving chaos in
  Hodgkin-Huxley. His computer-proof papers concern planar vector fields (1995, 1996, with Malo) and slow manifolds (2012, with Johnson
  and Meerkamp).
- Suggested line for `RESEARCH.md` (not added here, since this task was limited to this folder): "2026-09-26, HH chaos relocation: Oliva's thesis
  (Cornell 1998, Smillie) is on complex Henon maps, no HH; Guckenheimer-Meloon preprint (1999) has no HH example and no rigorous
  enclosure; G&O's p1, p2 are fixed points of the u-increasing return map (not u-decreasing, as their text says); re-search: no."

## 9. Proof plan

1. **Rigorous Poincare map.** A C^1 interval Taylor integrator (Lohner, QR) for the 4-dimensional field, with Psi through its
   Bernoulli series near 0 as in `hh_ball.py`, and an interval Poincare map to u = 4.5 with u increasing. The check that the first
   crossing in the right direction is the one found: along each enclosure u stays away from 4.5 except at the single downward
   crossing and the final upward one, and du/dt at arrival is enclosed in [1.2, 1.5].
2. **Charts.** The h-sets as in 5.3 with the polynomial z_k, w_k taken as exact (rational) data, and the chart inverse evaluated in
   interval arithmetic (it is explicit: eta = s, xi = (c1 - z(c2))/w(c2)).
3. **Covering checks.**
   (a) Exit faces: subdivide each face xi = +-1 in eta (3 to 12 pieces by our estimate, more if needed) times the whole zeta range,
   and enclose xi' of the image for both targets.
   (b) Image containment: subdivide N_i (22 to 54 boxes) and enclose eta', zeta' of the whole image.
   The margins are about 13 or more in xi and 0.17 in eta. This proves N_A => N_A, N_A => N_B, N_B => N_A, N_B => N_B and so a semiconjugacy to the
   full 2-shift, hence topological entropy >= log 2 of the return map.
4. **Optional: cone conditions** (Zgliczynski, Covering relations, cone conditions and the stable manifold theorem, J. Differential Equations 246 (2009) 1774-1819) from the same C^1 enclosures, for a
   hyperbolic invariant set conjugate to the shift. The derivative ratios (|dxi'/dxi| >= 31 against |deta'/deta| <= 0.7) suggest a
   quadratic form xi^2 - gamma eta^2 with gamma of order 10^2 to 10^4. Not checked here.
5. **E_l.** The statements should be proved for the ball E_l in [10.59, 10.62] as elsewhere in `papers/hh-dynamics/`, or at the two values
   10.613 and 10.5989...; since only J + 0.3 E_l enters, the natural statement is for J + 0.3 E_l = 11.041482... (J* + 0.3 E_l), a
   single number, with a small interval around it.
6. **Threshold.** Enclose the fates of three states (u1 < u2 < u3 at gates g0) that go AP, REST, AP; this proves that no threshold
   function exists at g0 at J*.
7. **Tools and cost.** CAPD (C++) is the natural tool (covering relations, C^1 Poincare maps, h-sets): 10^3 to 10^4 one-return
   C^1 integrations, minutes to an hour. A python-flint implementation built on `hh_ball.py` would match the repository's other
   proofs but would need a recursive Taylor-coefficient scheme and a Lohner step, taking hours of compute and more code.

## 10. Risks

- **Thin N_B.** N_B is 1e-7 to 7e-7 wide and its right face lies 1.1e-7 from the one-return firing boundary at the top of the window.
  Enclosures of boxes near its right face pass close to lap 3 (slope 2.6e7). Keeping w_B at 0.3 of the gap leaves margin, and the
  image of the right face is at xi' < -38.9 against -1, but the boxes near the top will need subdivision.
- **The eta margin is 0.17.** Overestimation in the stable direction must stay below 0.17 x 2.8e-3 = 4.8e-4 in c2. That is generous for
  first-order enclosures, but the zeta direction's contraction (1e-37 and smaller) must be handled by the QR step and not by naive intervals.
- **The polynomial z_B** is only a fit (3e-10) to the zero curve; the proof does not need it to be exact, since the h-set is defined by
  the polynomial. But w_B is 4.8e-8 at the top, so the fit error is 0.6% of the width there.
- **Parameter window.** The construction works for J in about [7.8605, 7.862] (with this window design; 7.863 is borderline). A proof at a single J
  (or a tiny interval) is fine, but the result is not robust to large changes of the current.
- **Sampling is not proof.** A thin sub-feature of the map (for instance, a fold of the image between sample points near the firing
  boundary) could break a covering relation; the arc test refines to 0.02 chart units and found none, and the rigorous check will
  decide.
- **G&O's own boxes** do not transfer directly (section 5.4); the proof should use N_A, N_B, or boxes built the same way.
- **Semiconjugacy only.** Without cone conditions the result is topological (entropy >= log 2), not a hyperbolic horseshoe.

## 11. Independent check

The independent check (`check/`, its own model, hand-written Jacobian, a Gragg-Bulirsch-Stoer extrapolation integrator of order 12
compiled with numba, spot checks with scipy Radau at rtol 1e-12; nothing imported from `code/`; full report `check/CHECK.md`)
reproduced every claim within float64 limits, and could not refute the covering relations. Its noise floor: about 1e-9 in u at a
fixed time, 1e-9 ms in return times, 1e-12 in the gates on the section.

- E_l, J*: identical. A, B, C: agree to 4.5e-14, 2.1e-15, 5.5e-15; periods of A, B to 1.1e-9 and 5.4e-9 ms; multipliers of A, B to
  1e-8 relative. C's multipliers vary over six integrator settings (2.814e7 to 2.819e7; 4.5e-4 to 5.1e-4).
- p1, p2 with u increasing: |P(p1) - p1| = 1.975e-9 with both of its integrators; |P(p2) - p2| = 2.5e-7 to 9e-7 (noise). With u
  decreasing: residuals 0.13 and 0.29, confirming that the text's direction is wrong.
- Branch: F1 at 7.8465708, PD1 at 7.8495611 (both agree); the upper fold between 7.9220084 and 7.9220086 against our 7.9220092 (a
  difference of 7e-7, from locating a fold on a branch with multipliers of 3e3). It confirmed the short complex segment near it.
- Covering: all four relations hold on about 400,000 sampled returns (faces, corners, eta endpoints, zeta = +-1, random points, edge
  strips, continuity lines). The smallest exit-face margin is |xi'| - 1 = 12.9 (N_B left face into N_A); the images have eta' in
  [0.00745, 0.79526] (N_A) and [-0.83214, -0.30576] (N_B), |zeta'| <= 0.0353. No firing on the h-sets (max u 13.70 and 15.73 mV),
  min du/dt at arrival 1.26, no local extremum of u within 6.3 mV of the section, images strictly monotone along every tested line,
  N_B's right face about 2.3 widths inside the non-firing region, the same verdict from rtol 1e-8 to 1e-13, Radau agreeing to 1.1e-10.
- The 71 cycles: recomputed from the (xi, eta) locations; first points agree with ours to 2.2e-13, all inside their h-sets, periods to
  3.2e-7 ms.
- Threshold: the same switch counts 1, 3, 5, 9 for 10^2 to 10^5 points (also at rtol 1e-11); 8 of 9 switch locations confirmed with
  Radau on both sides; the ninth (u = 4.500040292) has structure below 1e-8 mV, consistent with more switches at finer grids.
- Two corrections, both applied above: p1 is good to about 8 digits, not 14; the third multipliers of A and B (and the third
  Lyapunov exponents) were float64 roundoff and are now given from Liouville's formula.

Verdict (the checker's): everything reproduces within float64 limits apart from those two corrections; the covering relations survive
every refutation attempt with large margins, but rest on finite floating-point sampling, and only an interval computation makes them a proof.

## 12. How to rerun

    cd papers/hh-dynamics/work/chaos/code
    python3 -m pip install numpy scipy numba mpmath python-flint==0.9.0   # also pymupdf only to read PDFs, not needed
    python3 continuation.py 3000 9.5                      # Hopf branch, J = 9.5 down past F1 (about 10 min)
    python3 continuation.py 6000 resume ../data/branch.npz ../data/branch2.npz
    python3 continuation.py 20000 resume ../data/branch2.npz ../data/branch3.npz   # past F2, slow
    python3 branch_features.py                            # folds, period doublings -> data/branch_features.json
    python3 run_horseshoe.py go 8 Jgo                     # h-sets, sampled covering, 71 cycles (about 3 min)
    python3 run_horseshoe.py 7.8605 3 J7.8605 quick       # J-window runs, fixed window
    python3 run_horseshoe.py 7.854 3 J7.854 quick auto    # automatic window (also 7.857, 7.859, 7.863, 7.865, 7.867)
    python3 scanJ.py 7.87                                 # zero curves at other currents
    python3 gocheck2.py ours ; python3 gocheck2.py go     # arc test of the covering relations
    python3 rates.py ; python3 cost.py                    # rates, stiffness, box estimates
    python3 taylor_hp.py ; python3 hp_newton.py           # 256-bit Taylor checks and polish (tens of minutes)
    python3 threshold2.py ugates 6                        # threshold scan at fixed gates (about 30 min on 3 cores)
    python3 threshold.py rest 11 ; python3 threshold.py section 10

`gocheck.py` holds G&O's boxes and the affine-chart version of the test (its first four lines of output are quoted in 5.4).
The independent check is in `check/` (its own code and `check/CHECK.md`).

## 13. Files

- `code/hhc.py`: the model, its Jacobian, the numba DOP853 integrator with variational equations and section events.
- `code/pmap.py`: return map, derivative, Newton for fixed points; `code/orbits.py`: orbits A, B at a current, E_l mapping.
- `code/continuation.py`, `code/branch_features.py`, `code/branch_to_C.py` (natural continuation; it fails on the vertical branch).
- `code/horseshoe.py`, `code/run_horseshoe.py`, `code/scanJ.py`, `code/periodic.py`: geometry, h-sets, covering tests, cycles.
- `code/gocheck.py`, `code/gocheck2.py`: G&O's boxes and the arc test.
- `code/rates.py`, `code/cost.py`, `code/taylor_hp.py`, `code/hp_newton.py`: rates, costs, high-precision checks.
- `code/threshold.py`, `code/threshold2.py`: threshold scans.
- `data/`: outputs named after the programs.
