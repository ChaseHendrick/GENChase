# A Travelling Pulse in a Neural Field with a Smooth Firing Rate

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Work in progress** (drafted in this repository by the owner's decision of 2026-09-26). No manuscript yet; this folder
holds the verification programs and their output. **The computer-assisted proof below has not been independently
reviewed**, neither its mathematics nor its code, so it is a candidate result, not an established one.

## Abstract

Neural field equations describe the activity of a sheet of cortex as a continuum, and their travelling pulses model
waves of activity such as those seen in disinhibited cortical slices. Pinto and Ermentrout (2001) analysed their model
mainly with a Heaviside firing rate; for a smooth one, Faye and Scheel prove pulses when the recovery is sufficiently
slow, under hypotheses, and Hastings (2017) wrote that, apart from these "partial results", he was "not aware of any
existence proof for pulses which covers all reasonable smooth functions S". We give a computer-assisted proof, in ball arithmetic, of a fast travelling pulse for one smooth
(logistic) firing rate at one fixed, non-small recovery rate: gain 20, threshold 1/4, recovery rate 1/10, no recovery
decay, and the kernel e^(-|x|)/2. The speed is enclosed in an interval of width 10^-25 about 1.10274770973415924914786...
The proof leaves rest along its one-dimensional unstable manifold, follows the pulse with a validated Taylor
integrator, and closes it with an isolating block around rest and a shooting argument of Wazewski type in the speed.

## Status of the results

- **Proved by computer, not yet reviewed:** the theorem below (`code/run_all.sh`, 15 checks including 5 negative
  controls, under a minute).
- **Numerical, not proved:** the speed to 55 digits from high-precision shooting, the profile in the figure, and the
  observation that a second, slow pulse was not found (the second switch of the shooting, near c = 0.3775, looks like
  a wave train).
- **Before this draft becomes a preprint:** written proofs of the block lemma, the shooting argument, the tail bound of
  the unstable manifold and the reduction to the wave ODE; an adversarial second reading of the mathematics and an
  independent review or reimplementation of the code; and a reading of Zhang, J. Dyn. Differ. Equ. 17 (2005), and
  Zhang (2004), which could not be reached and must be read before any claim of priority. See `notes/QUALITY.md`.

## The model and the claim

Pinto and Ermentrout, SIAM J. Appl. Math. 62 (2001) 206-225, eq. (3), with their feedback decay (their beta) written
gamma:

    u_t = -u - v + (w * S(u)),     v_t = eps (u - gamma v),
    w(x) = e^(-|x|)/2,             S(u) = 1/(1 + e^(-beta (u - theta))).

**Claim (computer-assisted; not independently reviewed).** Let beta = 20, theta = 1/4, eps = 1/10, gamma = 0. There are
a speed c in (c1, c2), with c1 = 1.1027477097341592491478677 and c2 = c1 + 10^-25, and a smooth nonconstant profile
(U, V) with (U, V) -> (0, S(0)) as xi -> +-infinity, such that u = U(x + ct), v = V(x + ct) solves the equations above.
The orbit leaves rest on the branch of the unstable manifold where U increases, and U reaches about 0.76.

Scope: one smooth firing rate at one parameter point, with eps fixed and not small. Nothing here concerns stability,
uniqueness, the slow pulse, or the general smooth S of Hastings's remark. The threshold, the kernel scale and gamma = 0
follow Pinto and Ermentrout; the gain 20 is the lambda that Faye (2013) and Hastings (2017) use for a related model
(Pinto and Ermentrout's own gain 12 gives complex eigenvalues at rest, which the present block does not handle).

## Method

- **Wave ODE.** With xi = x + ct, Q = w * S(U), P = Q' and kappa = 1/c, the identity (1 - d^2/dxi^2) e^(-|xi|)/2 = delta
  gives U' = kappa (Q - U - V), V' = eps kappa (U - gamma V), Q' = P, P' = Q - S(U). A bounded Q is unique, so a
  homoclinic orbit of this system is exactly a pulse. The programs add Y = S(U) as a fifth variable, which makes the
  field polynomial; the surface Y = S(U) is invariant.
- **Rest.** S'(0) = 0.1329... < 1, so for every c > 0 the rest state has exactly one unstable and three stable
  eigenvalues (Descartes' rule and the imaginary axis), and the problem is to shoot in c alone.
- **Unstable manifold.** A Taylor series of order 80 in ball arithmetic, with a rigorous bound of the tail.
- **Integration.** A C^0-Lohner interval Taylor integrator of order 30 carries the orbits from the manifold to
  xi = 53, for the whole speed interval and for its two ends.
- **Block and shooting.** Around rest, a block B with a quadratic form that increases along orbits in B: the cones
  K+ and K- of the unstable direction are forward invariant in B, and an orbit that stays in B tends to rest. The
  orbit at c1 enters K-, the one at c2 enters K+, and every orbit with c in [c1, c2] is in the interior of B at
  xi = 53; the set of speeds whose orbit enters each cone is open, so some speed in between enters neither, stays in
  B, and is the pulse.

## Programs

| Program | What it does |
|---|---|
| [`run_all.sh`](code/run_all.sh) | Runs the whole chain and its negative controls; one line per check; exits with status 1 if any fails |
| [`nfcore.py`](code/nfcore.py) | The model, its parameters as exact rationals, and the Taylor recursion |
| [`certify_rest.py`](code/certify_rest.py) | The rest state, S'(0) < 1, and the eigenvalues for c in [c1, c2] |
| [`manifold.py`](code/manifold.py) | The unstable manifold to order 80 with a validated tail |
| [`block.py`](code/block.py), [`block_check_iv.py`](code/block_check_iv.py) | The isolating block, and an independent re-check of its conditions in mpmath interval arithmetic |
| [`lohner.py`](code/lohner.py) | The validated C^0-Lohner Taylor integrator |
| [`prove_pulse.py`](code/prove_pulse.py) | The three proof runs and the negative controls |
| [`test_jacobian.py`](code/test_jacobian.py), [`test_lohner.py`](code/test_lohner.py), [`test_lohner2.py`](code/test_lohner2.py) | Tests: the Jacobian against finite differences, and the integrator's enclosures against an independent mpmath solution |
| [`shoot_hp.py`](code/shoot_hp.py), [`orbit_hp.py`](code/orbit_hp.py), [`figure.py`](code/figure.py) | Numerical only: high-precision shooting for the speed, the orbit, and `data/pulse_profile.png` |

## Reproduce

From this folder:

```
python3 -m pip install -r code/requirements.txt
sh code/run_all.sh
```

The summary is in `data/run_all.txt` and the certificates in `data/`; the full output of each step goes to `data/logs/`,
which the repository does not track.

## License

The programs in `code/` and the data in `data/` are licensed under the Apache License 2.0; see NOTICE.
