# Local Hopf radial and spectral progress, 2026-10-03

This folder preserves a new, very small near-zero stability result at reviewed
native-producer scope. It does not certify the entire Hopf bridge. It contains
fresh proof outputs, complete native logs and supervisor receipts, the exact
three tested local source snapshots, the preserved count 2 adapter scripts, and
independent source/input/inequality audits. No released program or proof record
was changed to obtain this evidence. The production amplitude existence bridge
remains epsilon in [0,6427/50000].

The fresh augmented radial quotient and its exact zero identification passed.
For 0 < epsilon <= 1/51200000, its checked physical-time radial bound is

    Re(lambda_rad(epsilon)) <= -c epsilon^2,
    c = 17598251151852745997420323/260617961456609980053454848
      approximately 0.06752508942014214 per millisecond.

A separate fresh Taylor/Cauchy count 2 pilot passed on the larger signed interval
[-1/51200000,1/51200000]. It excludes the other 16 exponents to the left of exact
delta = 17293822569103/576460752303423488 > 3/100000 per millisecond. Its tail
bound is below 6.85e-8 and its reported maximum small-gain ratio is approximately
3.3196e-6. Acceptance used the original strict Arb inequalities, not those float
diagnostics. The rank 2 adapter changes exactly one expected-count guard from 1
to 2 and retains every small-gain inequality. The Ke 12 control changes only window
geometry; it skips no inequality. At epsilon zero this is an equilibrium rank 2
statement, not a simple phase or periodic-orbit attraction assertion.

Together, the exact phase exponent and the negative distinct radial exponent
exhaust the critical algebraic count 2. The pointwise nonlinear orbital
attraction implication, with uncomputed basin and prefactor, is proved in
[ORBITAL-IMPLICATION.md](ORBITAL-IMPLICATION.md). Its conservative physical-time
rate is one half of min(3/100000,c epsilon^2), which tends to zero with epsilon.
The raw producers' model_stability_certified flags remain false: their separate
scopes are retained and no new whole-model or whole-bridge collector is admitted.

## Actual native runs

| Gate | Outcome | Wall seconds | Peak aggregate RSS MiB |
| --- | --- | ---: | ---: |
| Final Taylor radial quotient, zero identity and Cauchy sign | Pass | 114.12903845915571 | 341.609375 |
| Final tiny signed-interval count 2 | Pass | 113.00481345783919 | 537.171875 |
| Nine final-source test methods | Pass | 1.581581958103925 | 70.390625 |
| Full first real piece [0,1/500], count 2 attempt | Strict small-gain failure | 246.32205495797098 | 774.84375 |

The last failure had a radius approximately 7.486e-5 and maximum small-gain
ratio approximately 19.761. It is preserved; its success flags were not promoted.
Earlier failed complex-radius and quotient attempts, plus implementation/control
failures, are retained with their original outputs and resource receipts.
The first tiny count 2 adapter failed at an exact-input type boundary before the
spectral core; the retry explicitly accepts its internal Fraction constant and
still rejects all other intervals. It did not relax a numerical inequality.
See attempt-summary.json for measured results and the historical source limit.

## Source binding and replay commands

The tested source bytes are the files in source/. Their SHA256 values are:

- hopf_stability_local.py: 486bada9b514e9ac91b1abfa33a61af1db60dd2be46b338c6f5c3dc5d6a5602b
- LEMMAS-hopf-stability-local.md: c3eb4277b09460ff474b4bd3566ab72e6272ac0429880007cddea24589ae3283
- test_hopf_stability_local.py: a5acb3d6b8d477b8a0f710b0d6bf75106d29e8d1bd6512cc00e7a9b41d7460ab

The archive snapshots are references, not a standalone repository. Replay needs
the complete unchanged scientific tree and all accepted data identified by the
source/input hashes in the raw receipts and manifest.json. Run from the original
fourier directory, using Python 3.12 and the admitted python-flint 0.9.0 runtime.
The actual supervisor commands are preserved verbatim in attempts/*.log.receipt.json.
Their paths refer to the execution workspace, not to a deployment requirement.
The equivalent bounded commands, with PY and SUPERVISOR set to that environment,
are:

```sh
$PY $SUPERVISOR --seconds 300 --rss-mib 2500 --log "$NEW_LOG" -- \
  $PY -u hopf_stability_local.py --radial-quotient 1/500 --shrink 1/100000 --out "$NEW_RESULT"
$PY $SUPERVISOR --seconds 60 --rss-mib 512 --log "$NEW_CONTROL_LOG" -- \
  $PY test_hopf_stability_local.py
$PY $SUPERVISOR --seconds 300 --rss-mib 2500 --log "$NEW_COUNT2_LOG" -- \
  $PY -u "$ORIGINAL_COUNT2_ADAPTER_PATH"
```

The last command uses the exact f1488857 adapter snapshot, whose original script
and output basenames are retained. It refuses an existing output; a fresh replay
workspace must provide its declared new output path. The supervisor pins native
thread counts. No default invokes a whole-bridge or all N proof.

## Taylor coefficient and divided-difference scope

The count 2 coefficients retain J_H in mode 0 and the exact first parameter
coefficient D²f_H[w(0),.] in modes +1,-1. A fresh analytic parent disk of radius
1/500 and its full model Hessian cover enclose the remaining terms. If G bounds
J(e)-J(0) on that parent circle, its order-at-least2 remainder R_J obeys, for
0 < |e| <= h,

    |R_J(e)/e| <= G h / (R_parent^2 (1-h/R_parent)).

The implemented F.eps/h is larger: F uses the square amplitude upper bound
sqrt(2) h and retains an additional sqrt(2) rectangle inflation. Thus rad1
includes a valid divided-difference enclosure plus first-coefficient uncertainty.
It is not justified by dividing an arbitrary uniform remainder by h, and it is
not advertised as an independent enclosure of J'(e) on the whole interval.
All original affine coefficient, finite window and tail inequalities remain.

## Remaining obligations

Independent reviews here verify the method, exact source/input hashes,
component/radii reconciliation and final gate arithmetic. They do not claim an
independent full augmented finite/tail witness replay or count 2 small-gain-vector
replay, and the reviewer did not rerun these numerical producers. Those remain
separate obligations. The current generic witness observer does not support the
new synthetic count 2 adapter capture and its geometry control.

The practical gap from e0 approximately 1.953125e-8 to the separate narrow
away-from-zero pilot near 0.0095 remains uncertified. No complete cover or quantitative
uniform stability on the entire bridge follows. Extending the radius likely
requires sharper parameter Taylor branch/eigenpair proposals or complex-circle
bounds. No nonlinear attraction basin, transient prefactor, all N or continuum
stability, clinical consequence or historical-priority claim is established.
