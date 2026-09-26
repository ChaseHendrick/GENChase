# The slow pulse of the Pinto-Ermentrout neural field

Extension of `papers/nf-pulse/` (work in progress, not independently reviewed). Everything here lives in this
folder; the programs of the fast-pulse proof in `../../code/` are imported and run unchanged.

## Outcome

**Proved by computer (ball arithmetic), not independently reviewed**, at two parameter points: the original point
of the fast-pulse proof (eps = 1/10) and the point of Pinto and Ermentrout's Figs. 7 and 8 (eps = 3/20). At
eps = 1/10 this gives a second travelling pulse besides the fast pulse already proved in `../../`.

The rigour is exactly that of the fast-pulse proof: every numerical decision is made in python-flint `arb` ball
arithmetic, and the mathematical lemmas it rests on (the isolating block lemma, the Wazewski-type shooting
argument, the tail bound of the unstable manifold and the reduction to the wave ODE) are the same ones, still
without written proofs (see `../../notes/QUALITY.md`). The adversarial check is summarised in the section
"Independent check" below.

## Statement

Model (Pinto and Ermentrout, SIAM J. Appl. Math. 62 (2001), eq. (3), their feedback decay written gamma):

    u_t = -u - v + (w * S(u)),     v_t = eps (u - gamma v),
    w(x) = e^(-|x|)/2,             S(u) = 1/(1 + e^(-beta (u - theta))).

**Claim (computer-assisted; not independently reviewed).** Let beta = 20, theta = 1/4, gamma = 0.

(a) eps = 1/10. There are a speed c in (c1, c2), with c1 = 0.3775319350688905765075606 and c2 = c1 + 10^-25,
and a nonconstant smooth profile (U, V) with (U, V) -> (0, S(0)) as xi -> +-infinity, such that
u = U(x + ct), v = V(x + ct) solves the equations. The orbit leaves rest on the branch of the one-dimensional
unstable manifold where U increases, and max U >= 0.35232 (rigorous lower bound; numerically max U = 0.3523).
Since (c1, c2) is disjoint from the speed interval of the fast pulse, (1.1027477097341592491478677, + 10^-25), this
parameter point has at least two travelling pulses.

(b) eps = 3/20. The same holds with c1 = 0.4932988879736285669800062, c2 = c1 + 10^-25, and max U >= 0.38983
(numerically 0.3899). Here the two stable eigenvalues of the rest state nearest the imaginary axis are complex
(about -0.592 +- 0.065 i), and the block is built in a real Jordan basis. The fast pulse at this point
(c about 1.0343608707) is numerical only; it was not proved here.

Scope: existence only. Nothing here concerns stability (Pinto and Ermentrout expect the slow pulse to be unstable),
uniqueness, or other parameter values.

## What Pinto and Ermentrout say

From the author copy of Pinto and Ermentrout (2001) on sites.pitt.edu (not committed). Their Sect. 3.1 uses the
Heaviside firing rate, the kernel e^(-|z|)/2 and no feedback decay ("With the assumption that the decay of negative
feedback is weak (i.e., beta = 0)"), and says "Note that, in the following calculations, we need not assume eps is
small." About Fig. 7 they write:

> "With slow negative feedback (eps small) there are, in fact, two pulse solutions, one narrow and slow and the
> other wide and fast. As eps increases and feedback becomes more rapid, the solutions converge and vanish. The same
> behavior is observed when varying the firing threshold theta (not shown). [...] it is likely that stability
> analysis will confirm our numerical results that reveal the larger, fast pulse to be stable, while the narrow,
> slow pulse is unstable. Figure 8 illustrates the two pulses satisfying the problem when negative feedback is slow."

(Greek letters transcribed.) Fig. 7 has two panels, theta = .25 with eps = .20 (the curves f(a, c) = theta and
g(a, c) = theta do not cross: no pulse) and theta = .25 with eps = .15 (two crossings). Fig. 8, "Examples of two
pulse solutions which satisfy (5)", at theta = .25, eps = .15, shows the slow pulse at c = -.45, a = 2.2 and the fast
one at c = -.80, a = 4.9 (their c < 0 is our -c; a is the width of the region U > theta). In Sect. 3.2, on the
singular-perturbation construction with a general firing rate:

> "Note also that, in contrast to the shooting argument presented above, only one pulse solution is obtained using
> singular perturbation techniques. This is to be expected, however, in that as eps is decreased, the narrow pulse
> in the previous section becomes more narrow and ultimately vanishes as eps -> 0 (see Figure 7)."

Their Sect. 4 (Discussion) does not return to the slow pulse. Everything they say about it is for the Heaviside
rate; for a smooth rate they construct only the fast pulse. For comparison (numerical, this work, beta = 20): at
theta = 1/4, eps = 3/20 the slow pulse has c = 0.4933 and width above theta 2.06, against their Heaviside c = .45,
a = 2.2. The smooth rate gives the faster pulse, in line with their remark on fronts (discussion of their Fig. 5)
that, compared with a piecewise linear rate, "sigmoidal firing rate functions generate waves of much higher speed
for a given threshold".

## Why the original shooting missed it at eps = 1/10 (numerical)

`../../code/shoot_hp.py` classifies an orbit by its eventual escape into {Q > 1, P > 0} or {Q < 0, P < 0}. Near the
slow pulse this sign does not change: below the slow speed the orbit fires a second time and then escapes into
Q < 0, above it escapes into Q < 0 at once. Its second switch, c = 0.37752881442319..., lies 3.1e-6 below the slow
pulse and is a different object: there the orbit settles onto a periodic wave train (re-firing every 14.32 units,
peaks U = 0.384) and never comes back to rest (least Euclidean distance of (U, V, Q, P) to rest 0.049; the reviewer's sup-norm
value is 0.031).

`code/shoot_slow.py` uses a first-return criterion instead: after the first excursion (U up through theta and back
down) an orbit is +1 if it fires again or escapes up, -1 if it escapes down without firing again, i.e. the side of
the unstable direction on which it leaves the neighbourhood of rest. It also prints d_min, the least distance to
rest (Euclidean norm of (U, V, Q, P) minus rest) between the first excursion and the decision. At a homoclinic switch d_min must go to 0 as the bracket
shrinks; at a wave-train switch it does not.

| eps | slow speed (first-return bisection, 320 or 256 bits) | final bracket width | d_min at the end |
|---|---|---|---|
| 1/10 | 0.3775319350688905765075606535344118302047574 | 7.7e-44 | 1.0e-12 |
| 3/20 | 0.4932988879736285669800062203417524 | 8.1e-38 | 1.9e-14 |

d_min falls steadily with the bracket (at eps = 1/10: 8.7e-2 at width 5e-4, 5.3e-6 at 1e-19, 1.0e-12 at 8e-44;
`data/shoot_eps1_10.txt`), which is the signature of an orbit returning to rest.

A floating-point survey of c in [0.02, 1.4] (4000 speeds, `code/scan_first_return.py`, `data/scan_eps1_10.txt`,
`data/scan_eps3_20.txt`) finds, on the U-increasing branch, exactly two first-return sign switches at each eps:
the slow pulse (0.377531935069 and 0.493298887974) and the fast pulse (1.102747709734 and 1.034360870686). The
other changes of the classification are between "fires again" and "never falls back below theta", which are
tangencies, not returns to rest. At eps = 3/20 the escape switch and the first-return switch coincide; the wave
train of eps = 1/10 is absent there. Numerical profiles at the slow speed: eps = 1/10, max U 0.352, width above
theta 1.70, trough U = -0.169 at 3.5 after the peak; eps = 3/20, max U 0.390, width 2.06, trough -0.219.

All of this section is numerical.

## The proof

Same chain as the fast pulse, through wrappers:

- `slowparams.py` sets eps, theta, beta (exact rationals, from `NF_EPS`, `NF_THETA`, `NF_BETA`; default eps = 1/10)
  in `nfcore`, whose routines read them at every call.
- `slowsetup.py` sets the bracket [c1, c2], the reference speed for the block coordinates, and the expected cones
  (K+ at c1: the orbit fires again; K- at c2: it escapes into Q < 0) in `certify_rest`; when the rest state has
  complex stable eigenvalues it replaces `block.setup` by `setup_jordan` (a real Jordan basis; weights
  d = (1, 0.5, 0.125, 0.5) chosen by a floating-point grid search, since the default weights fail the entrance
  condition at eps = 3/20). The block check itself is unchanged and certifies whatever coordinates it is given.
- `rest_slow.py`: rest state, s = S'(0) < 1, eigenvalues. At eps = 1/10 the four roots are real on the bracket and
  `certify_rest.certify` runs there. At eps = 3/20 there is a complex pair; since s < 1 gives, for every c > 0, one
  positive root and no root on the imaginary axis, the number of roots with Re > 0 is the same for all c, and it is
  certified to be 1 (with four real roots) at c = 1; on the bracket the unstable root is then enclosed and its
  eigenvector residual checked.
- `manifold_slow.py`: the unstable manifold to order 80 with the validated tail, sigma = 1/7, at c1, c2 and the
  interval; negative control sigma = 8/7.
- `block_slow.py`: block with |U| <= 0.05, cone and entrance conditions over the whole bracket; negative control
  U up to 0.15.
- `prove_slow.py` runs `prove_pulse.main` unchanged: the box of all c in [c1, c2] is in the interior of B at
  xi = 40; the orbit at c1 then enters K+ (eps = 1/10 at xi = 46.875; eps = 3/20 at 43.625) and the orbit at c2
  enters K- (at 47.0 and 42.75), each while its whole path stays in the interior of B. The wrapper records the
  cone margin lower(+-y1) - upper(|y'|) of the entering enclosure in `data/cone_*.json`: 1.25e-8 and 1.36e-8 at
  eps = 1/10, 1.31e-11 and 3.17e-10 at eps = 3/20 (positive, but thin at eps = 3/20, c1). It also re-asserts that
  the block's U-range stays below 0.05 after `prove_pulse.block_data` rounds rho (0.04914 and 0.04939).

Negative controls, all refused: c1 asked to reach the other cone; a speed 1e-4 away; manifold scaling too large;
block too wide; and, at eps = 1/10, the wave-train switch c = 0.3775288144231931360774251 with either cone.

What is rigorous: every statement printed as CERTIFIED, VALIDATED or PASS in `data/run_all.txt`. What is not:
the brackets (they come from the shooting, but the proof does not depend on how they were found), everything in
the section above, the profile numbers other than the lower bounds on max U, the choice of block weights (it only
selects coordinates), and the unwritten proofs of the lemmas.

## Independent check

An independent subagent reran everything from a copy, audited the parameter patching, ran mutation tests,
recomputed the speeds with its own code, and re-checked the cone entries and the block.

**Verdict: "Claims A and B hold as computer-assisted results, with the following caveats."** It found no defect
that invalidates either claim.

- **Rerun.** 26 of 26 checks passed, and every regenerated JSON file was byte-identical to the committed one.
- **Parameter patching.** Every routine reads eps, theta and beta when called. A print inside the eps = 3/20 run
  showed eps = 0.15. The remaining hard-coded values (eps = 0.1 and exp(5) in `block.setup` and
  `slowsetup.float_matrix`) only choose coordinates.
- **Mutation tests.** Every mutation was refused:
  - the bracket shifted by +-1e-20 (wrong cone);
  - the expected cones swapped;
  - the bracket of the other eps (escape before xi = 40);
  - bad block weights (cone condition fails);
  - theta = 26/100, theta + 1e-15, beta = 201/10 or eps + 1e-12;
  - the bracket widened to +-1e-15 (the integrator fails);
  - the other branch of the manifold;
  - gamma = 1e-6.
- **Independent speeds.** Its own mpmath code (70 digits, a Taylor method of order 32, 105 bisections) gave:
  - eps = 1/10: 0.37753193506889057650756065353441183 +- 2.5e-36, agreeing with the claim to 35 digits;
  - eps = 3/20: 0.49329888797362856698000622034175242 +- 5e-36, agreeing to all 34 digits the claim gives.

  Both speeds lie inside [c1, c2]. The distance to rest keeps shrinking along the bisection.
- **Wave train.** At c = 0.3775288144231931360774251 the orbit re-fires with period about 14.3 and peaks of 0.3842,
  and its distance to rest does not shrink. It is a different object from the slow pulse.
- **Survey.** Its own LSODA scan finds the same two first-return switches at each eps, plus tangencies.
- **Cone entries.** Recomputed from the full balls, all four are positive. These are the same margins that are
  now stored in `data/cone_*.json`.
- **Logic.** Nothing in the block lemma or the Wazewski argument uses real stable eigenvalues. `block_check_iv.py`
  (mpmath.iv) certifies both slow blocks independently. The rest count at eps = 3/20, the Y = S(U) embedding, the
  manifold tail and the phase-2 check were all checked and found sound.

Findings and what was done:

1. **(should-fix)** The block lemma, the openness step of the Wazewski argument, the manifold tail bound and the
   reduction from a homoclinic orbit to a pulse still have no written proofs. The reviewer checked them informally
   and found no gap. **Open:** they must be written out before either claim is called proved in a manuscript.
2. **(minor)** The JSON files round y too coarsely to verify the cone entry. **Fixed:** the margins are now stored
   in `data/cone_*.json`.
3. **(minor)** `maxU_upper_phase1` is misnamed: it is the maximum over step endpoints. **Unchanged** (it is in
   `../../code`). This report uses only its lower bound, which is rigorous.
4. **(minor)** `block_data` does not re-check the U-range after rounding rho. **Fixed** in the wrapper, which now
   asserts it.
5. **(minor)** The coordinate choice hard-codes beta = 20, theta = 1/4, and eps = 1/10 when the stable
   eigenvalues are real. **Documented:** only the two recorded parameter points are supported, and any other point
   stops with an error.
6. **(minor)** `../../code/certify_rest.py` has an unused `NF_PULSE=slow` branch that labels the wave-train switch
   0.37752881442... as "c*_slow". That label is now known to be wrong. **Not changed:** it is outside this folder,
   and the owner should correct or remove the branch.
7. **(note)** The report did not say which norm the distance uses. **Fixed:** it is now stated.
8. **(note)** The survey is numerical and limited by its grid: two switches closer together than the grid spacing
   could be missed. **Stated as numerical above.**

## Rerun

From this folder, with the requirements of `../../code/requirements.txt` (python-flint, mpmath, numpy; scipy for
the survey):

```
sh code/run_all.sh                                                  # the proof, both eps, 26 checks, under a minute
cd code
python3 shoot_slow.py 320 110 0.3775319350 0.3775319351 600         # numerical, eps = 1/10, about 4 minutes
NF_EPS=3/20 python3 shoot_slow.py 256 90 0.4932988879 0.4932988880 400   # numerical, eps = 3/20, about 1 minute
python3 scan_first_return.py 0.1 0.25 20 0.02 1.4 4000              # numerical survey, eps = 1/10
python3 scan_first_return.py 0.15 0.25 20 0.02 1.4 4000             # numerical survey, eps = 3/20
```

The summary of the proof run is `data/run_all.txt`; the certificates are the JSON files in `data/`; full logs go to
`data/logs/`, which the repository does not track.

## Consequence for `../../README.md` (not changed here)

The parent README lists as numerical "the observation that a second, slow pulse was not found (the second switch of
the shooting, near c = 0.3775, looks like a wave train)". The wave-train reading of that switch is confirmed
numerically, but a slow pulse does exist at the same parameters, 3.1e-6 faster, and is proved here subject to the
same caveats as the fast pulse. The owner may want to update that line.

## License

Apache License 2.0, as the rest of `papers/nf-pulse/`.
