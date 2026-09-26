# A Travelling Pulse in a Neural Field with a Smooth Firing Rate

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Work in progress** (drafted in this repository by the owner's decision of 2026-09-26). No manuscript yet; this folder
holds the verification programs and their output. An adversarial
in-repository review (mathematics, code audit with mutation tests, a partial independent reimplementation, prior art)
is in [`review/lead/VERIFY.md`](review/lead/VERIFY.md); it found no gap in the proof, and its fixes are applied here.

## Abstract

Neural field equations describe the activity of a sheet of cortex as a continuum, and their travelling pulses model
waves of activity such as those seen in disinhibited cortical slices. Pinto and Ermentrout (2001) analysed their model
mainly with a Heaviside firing rate. For a Heaviside rate, Pinto, Jackson and Wayne (2005) prove pulses without
assuming slow recovery. For a smooth rate, Faye and Scheel prove pulses when the recovery is sufficiently slow, under
hypotheses, and Hastings (2017) wrote that, apart from these "partial results", he was "not aware of any existence
proof for pulses which covers all reasonable smooth functions S". Burlakov, Oleynik and Ponosov (2025) prove
travelling waves at a fixed recovery rate for continuous firing rates close to a Heaviside, provided a Heaviside pulse
at the same parameters satisfies further conditions, for a continuously differentiable kernel; they verify no
concrete case. We give a computer-assisted proof, in ball arithmetic, of a fast travelling pulse for one smooth
(logistic) firing rate at one fixed, non-small recovery rate: gain 20, threshold 1/4, recovery rate 1/10, no recovery
decay, and the kernel e^(-|x|)/2. The speed is enclosed in an interval of width 10^-25 about 1.10274770973415924914786...
The proof leaves rest along its one-dimensional unstable manifold, follows the pulse with a validated Taylor
integrator, and closes it with an isolating block around rest and a shooting argument of Wazewski type in the speed.

## Status of the results

- **Proved by computer:** the theorem below (`code/run_all.sh`, 20 checks:
  9 proof steps, 4 tests of the integrator and 7 negative controls, about two minutes on four cores).
- **Numerical, not proved:** the speed to 55 digits from high-precision shooting and the profile in the figure.
  An earlier version of this README said that a second, slow pulse was not found and that the second switch of the
  shooting, near c = 0.3775, looked like a wave train. That was wrong: `ext/slow-pulse/` proves by computer a slow
  pulse with speed in an interval of width 10^-25 at 0.3775319350688905765075606, at these same parameters.
- **Recomputed independently:** separate programs written from the equations alone (`review/lead/reimpl/`) confirm
  the rest state and its eigenvalues for all c in [c1, c2] and the speed to all quoted digits, and prove the
  existence step again with their own isolating block (exact rational arithmetic), their own validated integrator
  and their own shooting argument (`review/lead/reimpl/block/BLOCK.md`). Neither computation has been read by a
  person.
- **Before this draft becomes a preprint:** a manuscript with the written proofs (drafts of every argument are in
  `review/lead/math/MATH.md`); a review by someone outside this project; and a reading of the full texts of Zhang,
  J. Dyn. Differ. Equ. 17 (2005), Zhang, J. Differential Equations 197 (2004), Pinto, Jackson and Wayne (2005) and
  Sandstede (2007), so far read only through abstracts and reviews, and of Enculescu, Physica D 196 (2004), and
  Zhang, Math. Z. 255 (2006), whose content is unknown. Until then the result is new only as far as we could
  determine (RESEARCH.md, 2026-09-26). See `notes/QUALITY.md`.

## Extensions (`ext/`)

Each extension has its own folder, programs, certificates and report, and imports the programs in `code/` unchanged.
All of them are computer-assisted proofs in ball arithmetic, and they rest on the same lemmas as the base proof, whose written proofs are still to do.

| Folder | Claim | Status |
|---|---|---|
| [`ext/slow-pulse/`](ext/slow-pulse/REPORT.md) | A second, slow pulse at eps = 1/10 (speed about 0.37753) and at eps = 3/20 (about 0.49330), with the rest state a saddle-focus at 3/20 | proved by computer; an in-repository adversarial check |
| [`ext/gain-12/`](ext/gain-12/REPORT.md) | The fast pulse at Pinto and Ermentrout's own firing rate, (1 + tanh(6(u - 1/4)))/2, at eps = 3/20, speed about 1.04754, rest a saddle-focus | proved by computer; an in-repository adversarial check |
| [`ext/eps-range/`](ext/eps-range/REPORT.md) | The fast pulse for every eps in [0.08, 0.13693], in 383 certified subintervals with a speed window that moves with eps; [0.05, 0.2] not reached | proved by computer; an in-repository adversarial check |
| [`ext/faye-model/`](ext/faye-model/REPORT.md) | A fast pulse in Faye's (2013) neural field with synaptic depression at eps = 1/100 (Faye's own value), 1/50 and 1/20 | proved by computer; an in-repository adversarial check |
| [`ext/stability/`](ext/stability/REPORT.md) | Toward spectral stability of the fast pulse (a class of pulses with speed in a bracket of width 10^-58) | not proved: the essential spectrum, the exclusion of large eigenvalues and the pulse enclosure are certified, but the winding-number step was not completed; nonlinear stability would further rest on Sandstede (2007), not read |

## The model and the claim

Pinto and Ermentrout, SIAM J. Appl. Math. 62 (2001) 206-225, eq. (3), with their feedback decay (their beta) written
gamma:

    u_t = -u - v + (w * S(u)),     v_t = eps (u - gamma v),
    w(x) = e^(-|x|)/2,             S(u) = 1/(1 + e^(-beta (u - theta))).

**Claim (computer-assisted).** Let beta = 20, theta = 1/4, eps = 1/10, gamma = 0. There are
a speed c in (c1, c2), with c1 = 1.1027477097341592491478677 and c2 = c1 + 10^-25, and a smooth nonconstant profile
(U, V) with (U, V) -> (0, S(0)) as xi -> +-infinity, such that u = U(x + ct), v = V(x + ct) solves the equations above.
The orbit leaves rest on the branch of the unstable manifold where U increases, and U exceeds 0.7596 (a proved
lower bound; the numerical maximum is 0.7597).

Scope: one smooth firing rate at one parameter point, with eps fixed and not small. Nothing here concerns stability,
uniqueness, the slow pulse, or the general smooth S of Hastings's remark. The threshold, the kernel scale and gamma = 0
follow Pinto and Ermentrout; the gain 20 is the lambda that Faye (2013) and Hastings (2017) use for a related model
(Pinto and Ermentrout's own gain 12 gives complex eigenvalues at rest, which the present block does not handle).

## Method

- **Wave ODE.** With xi = x + ct, Q = w * S(U), P = Q' and kappa = 1/c, the identity (1 - d^2/dxi^2) e^(-|xi|)/2 = delta
  gives U' = kappa (Q - U - V), V' = eps kappa (U - gamma V), Q' = P, P' = Q - S(U). The only bounded solution of
  Q - Q'' = S(U) is Q = w * S(U), so a homoclinic orbit of this system gives a pulse, which travels towards negative
  x. The programs add Y = S(U) as a fifth variable, which makes the field polynomial. The 5D system has a line of
  equilibria (0, a, a, 0, a), so the invariance of the surface Y = S(U) is not used on its own: E = Y - S(U) solves a
  linear equation with an integrable coefficient along the orbit on the unstable manifold and tends to 0 as
  xi -> -infinity, so E = 0 for all xi.
- **Rest.** S'(0) = 0.1329... < 1, so for every c > 0 the rest state has exactly one unstable and three stable
  eigenvalues: Descartes' rule gives one positive root, no root lies on the imaginary axis for any c > 0, so the
  number of roots in each half plane does not change with c. The problem is to shoot in c alone.
- **Unstable manifold.** A Taylor series of order 80 in ball arithmetic, with a rigorous bound of the tail, validated
  for the whole speed interval at once, so the manifold point depends continuously on c.
- **Integration.** A C^0-Lohner interval Taylor integrator of order 30 carries the orbits from the manifold to
  xi = 53, for the whole speed interval and for its two ends.
- **Block and shooting.** Around rest, a block B with a quadratic form L that strictly increases along orbits while
  they are in B. A boundary point of B with L <= 0 is a strict entrance point, so an orbit can leave B only from one
  of the cones K+ and K- (L > 0, with the sign of the unstable coordinate), which it cannot leave while it stays in B;
  an orbit that stays in B for all later xi tends to rest. (B is not claimed isolating: the flow on the face of B in
  the unstable direction is not checked, and the proof does not need it.) Every orbit with c in [c1, c2] is in the
  interior of B at xi = 53, the orbit at c1 then enters K- and the one at c2 enters K+, with the whole path in the
  interior of B until then. The set of speeds whose orbit enters a given cone while its path since xi = 53 stays in
  the interior of B is open, the two sets are disjoint, so some speed in between is in neither: its orbit stays in B
  and is the pulse.

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
| [`test_jacobian.py`](code/test_jacobian.py), [`test_lohner.py`](code/test_lohner.py), [`test_lohner2.py`](code/test_lohner2.py), [`test_stress.py`](code/test_stress.py) | Tests, run by `run_all.sh`: the Jacobian against finite differences, the integrator's enclosures against an independent mpmath solution, a negative control with the Taylor remainder dropped, and a low-order stress test over a speed interval |
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
