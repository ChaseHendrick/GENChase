# Generalizations of the minimal-winding bound (2026-09-24)

Working notes, not a paper. They record what two exploratory passes produced on
generalizations of the three-vortex winding bound P = |omega_0| t_c > sqrt(3)/2, which claims
were checked and how, and what is left. P = |Im kappa| / (-2 Re kappa) throughout, for a
self-similar motion dz_j/dt = kappa (z_j - z_c) with Re kappa < 0.

Status words: **proved** means a derivation was written and an independent check reproduced it;
**numerical evidence** means high-precision computation, not a proof; **unchecked** means nobody
has checked it yet. The raw results, search scripts and certificate JSONs are on the backup
branch `research/generalizations-wip` (draft PR #136). The scripts in `checks/` are the
independent local re-checks listed in the last column; each has its output next to it.

## Headline results

| Result | Status | Independent check | Local re-check (`checks/`) |
|---|---|---|---|
| **Four vortices go below sqrt(3)/2.** A four-vortex self-similar collapse with P_4 = 0.797896783879863480767605871821... < 0.866025. Strict local minimum (reduced Hessian eigenvalues 2.21, 12.58, 18.75); 220+ random descents and 40 KKT solves find no lower point. So the three-vortex bound does not extend to N = 4. Spiral angle arctan(2 P_4) = 57.93 degrees; path factor sqrt(1 + 4 P_4^2) = 1.8832 (the first draft said 1.886, which was wrong). | local minimum: numerical evidence at 130 digits. Global minimum: numerical evidence only. | Confirmed by a second agent at 80 digits (250-digit value). | `n4.py`: Biot-Savart from the stated 30-digit point; the four kappa_j agree to 2e-29, sum Gamma_i Gamma_j = 5e-31, L = 1e-31, P = 0.79789678387986348 |
| **The smallest known P keeps falling with N** (two-arm minimizers): N = 5: 0.744814, N = 6: 0.713680, N = 7: 0.693662, N = 8: 0.679770, ... | numerical evidence | Confirmed with four small corrections (the N = 31 value is 0.52001570337864422040) | `nvortex.py`: the 22 stored minimizers N = 4..25 (`nvortex_chain.json`) are genuine self-similar collapses by an independent Biot-Savart check (kappa spread <= 8e-15, L and sum Gamma_i Gamma_j ~ 1e-15, Re kappa < 0), every P matches, and P falls strictly from 0.7979 to 0.6246. Best found, not proven minima. |
| **alpha-models (kernel r^-alpha; SQG at alpha = 1).** Every self-similar three-vortex collapse has P > sqrt(3+alpha)/(2+alpha), sharp and not attained, for alpha > -0.896. The value is 2/3 at SQG. The infimum is approached by a weak dipole next to a strong vortex. | proved | Confirmed independently | `alpha.py`: about 600 solutions per alpha, none below the floor. `alpha2.py`: descent into the dipole limit reaches 0.8660371, 0.7483333, 0.6666679 at alpha = 0, 0.5, 1, from above. `sympy_checks.py`: the limit minimum is exactly sqrt(3+alpha)/(2+alpha). |
| **Two n-gons plus a central vortex** (Demina-Kudryashov 2014 Sect. 3 with Gamma_0 != 0). Closed form P = (K - B cos a)/(2n sin a); the minimum over a is F(n, gamma) = sqrt(K^2 - B^2)/(2n). The infimum over the family is sqrt(3)/2 for every n (not attained, approached as r -> 1). So a central vortex lowers the two-ring floor F_n (1.677 at n = 2, ...) arbitrarily close to the three-vortex bound but never below it. | proved | CV-a3 and CV-b confirmed independently | `rings.py`: solves the linear circulation conditions directly. Reproduces the example n = 2, r = 2 exactly (Gamma_2 = -1/4, gamma = -1/24, P = 5 sqrt(129)/32). The scan minimum for n = 2..8 is 0.86603 > sqrt(3)/2, at r close to 1. |
| **Shape-sphere formula and a short proof of the Euler bound.** P = (2 - cos^2 lambda + eps cos psi cos lambda)/(sin psi sin 2 lambda) on Kendall's shape sphere; P > sqrt(3)/2 then follows from (1 + sin^2 l)^2 - cos^2 l (1 + 3 sin^2 l) = 4 sin^4 l and Cauchy-Schwarz. | derived | none by an agent | `master.py`: matches Biot-Savart on 2000 zero-impulse triangles at each of mu = 0.1, 0.3, 0.7, 1, 2.5 (relative error at most 1.5e-8), with eps constant on each arc. `sympy_checks.py`: the identity is exact. |
| **Scattering rotation law.** Perturb a collapse off L = 0: the configuration passes the collapse point and rotates by (P_in + P_out) ln(1/|L|) + O(1). L < 0 always exits through the mirror image of the entry shape (P_out = P_in); for L > 0 above the Gallay-Sverak threshold it exits through the second collapsing shape with the same energy. Since P_in, P_out >= P_-(mu) > sqrt(3)/2, the rate is always above sqrt(3), and sqrt(3) is sharp as mu -> 0. | derived (proof sketch) | none by an agent | `scatter.py`: direct DOP853 integration at mu = 0.3 and 1, two entry shapes each, both signs of L, |L| from 1e-4 down to 4e-6. The fitted rotation rate matches P_in + P_out within 0.5% in all eight runs. At mu = 0.3, L < 0 took the mirror channel and L > 0 the cross channel, as claimed. At mu = 1 both exits have P_out = P_in, because swapping vortices 1 and 2 is a symmetry there. Every rate is above sqrt(3). The sharpness as mu -> 0 is not re-checked. |
| **Sphere.** On a sphere of radius R the circumcircle pole moves on a loxodrome about the collision point, with |d psi / d ln tan^2(beta/2)| = P_0. The winding per unit ln(chord^2) is P_0 sec(beta). Floors: (sqrt(3)/2)/sqrt(1 - K rho_c^2) per ln(chord^2), and sqrt(3)/2 on the loxodrome. | proved, with one sentence corrected (the equilateral shapes are relative equilibria on the sphere, so they are excluded) | Confirmed independently | `sphere.py`: direct integration on the unit sphere, two shapes at mu = 0.5, starting at beta = 0.5 and 1.2 rad. The collision point p stays fixed to 1e-15, cos(beta) is linear in time to 1e-13, and |d psi / d ln tan^2(beta/2)| equals P_0 to six digits over the whole approach. |

## Explored but not checked

The run was stopped before these reached a checker. Treat every item as a lead only.

- The link between the least-winding collapse and the Gallay-Sverak regularizability threshold (mu* = 0.394750503...).
- The rotation-conjecture sigma(w) = 1^T (I + D)^{-1} s > 0 for N points.
- The Kendall-sphere normal form, the crossing-angle characterization of self-similarity, and the mu -> 0 and mu = 1 limits (G3-G7).
- The noise orientation law and the tracer dynamics (C3, C4, C7).
- The alpha < -0.896 case (conjectured to have the same limiting floor).

The three-polygon ring family (DK 2014 with three concentric n-gons) was never explored.

## Prior art

All of this is from web search, reference lists and the papers already read. Nothing here is
a claim of originality.

- **N = 4 minimum:** no source found that minimizes the winding over four-vortex collapses. The
  risk is O'Neil 2007 (Regul. Chaotic Dyn. 12, 117-126), which computes four-vortex collapse
  configurations with a given kappa. It was not read in full. Read it before making any claim.
- **Gotoda 2020 (arXiv:2002.09624), read in full for N >= 4:** computes collapsing families at fixed circulations (uniform (1, ..., 1, -(N-2)/2) for N = 4..10, and one seven-vortex set) and plots only the expansion rate A against the energy H. It never forms the ratio B/A or minimizes it, so it does not anticipate the N = 4 minimum, but it should be credited for the families and the continuation method.
- **Decrease with N:** no source found. The N-vortex collapse papers (Kudela 2014 and 2021,
  Lewkowicz and others) find configurations; none minimizes this quantity.
- **alpha-models:** judged probably not stated. Self-similar collapse in the alpha-models is
  known; a bound on the winding was not found.
- **Central-vortex rings:** unclear. The two rates are published in closed form for n = 2
  (a parallelogram with a central vortex) and in DK 2014 generally. Whether their ratio or
  its minimum is printed anywhere was not settled.
- **Sphere:** the time law and the collapsing shapes are classical (Borisov and Lebedev 1998;
  Kidambi and Newton 1998 and 1999). The loxodrome reading and the winding floor were not
  found in print.

## Next steps

1. Read O'Neil 2007 before stating the N = 4 result anywhere.
2. Settle whether the central-vortex ratio is in the n = 2 literature.
