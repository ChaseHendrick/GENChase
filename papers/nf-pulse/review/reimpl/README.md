# Independent reimplementation: nf-pulse

Written from the equations only. Nothing in `papers/nf-pulse/code/` was read, imported or copied
(only `papers/nf-pulse/README.md` was read, for the claim). The report is `../REIMPL.md`.

Requirements: python-flint 0.9.0 (arb), mpmath 1.3.0. No other packages.

| File | Rigorous? | What it does |
|---|---|---|
| `nfmodel.py` | support | Parameters as exact rationals, rest state, Jacobian, characteristic polynomial, closed-form eigenvectors |
| `rest.py` | yes (ball arithmetic) | Rest state, S'(0) < 1, eigenvalues for c1, c2 and the whole interval [c1, c2]; argument for all c > 0 |
| `eigsys.py` | support | Eigen-coordinate form z' = Lambda z + w N(U), Taylor recursion with the O(U^2) nonlinearity kept free of dependency, and the variational (Jacobian) Taylor coefficients |
| `manifold_cone.py` | yes | Checks the four inequalities of the quadratic-cone lemma (unstable-manifold enclosure; proof in `../REIMPL.md`) |
| `hoe.py` | yes | Validated Taylor step: high-order a priori enclosure (Nedialkov-Jackson type) and mean-value form. No QR/Lohner frame, no low-order Picard enclosure |
| `prove_ends.py` | yes | Carries the manifold box at a POINT speed to the escape after the return and certifies the events and signs |
| `test_vs_mpmath.py` | test only | The rigorous boxes must contain an independent mpmath solution; with a shifted speed (negative control) they must not |
| `shoot_mp.py` | no (numerics) | 60+ digit shooting with mpmath (own adaptive Taylor integrator), bisection on the escape direction |
| `summarize.py` | support | Table of all `prove_*.json` runs into `summary.txt` |
| `proto_run.py` | development | Early prototype of the integration loop, kept for the record |
| `run_all.sh` | driver | Runs everything except the long shooting |

`common.py` and `rest_eigen.py` in this folder were NOT written by this reimplementation (they appeared in the
folder during the work, apparently from another agent); nothing here imports or relies on them.

Reproduce:

```
sh run_all.sh                                   # about 10 minutes, one core
python3 prove_ends.py c1c2                      # whole speed interval as one ball (optional)
python3 shoot_mp.py 90 shoot_mp_result.json 64  # 60+ digit shooting, about 30 minutes
```
