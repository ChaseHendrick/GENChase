# Cardiac stability extension handoff, 2026-10-03

Checkpoint read on branch `codex/cardiac-stability-extension-2026-10-03`, HEAD
`d6c19d05ba041c25324186a4b8c9ce6d84c4d66b`. This work extends the released
cardiac-rings 1.1 results; it does not change the released scientific programs,
proof records or manuscript. Archive filename work is a separate publishing task.
No further numerical jobs were launched for this handoff.

## Current proof scopes

| Scope | Actual evidence | Remaining premises or limits |
| --- | --- | --- |
| Near-zero, N=1, `0 < epsilon <= 1/51200000` | Fresh analytic branch, augmented radial quotient, exact zero identity and count 2 native gates passed; independent method/source/scalar audits passed | No independent full augmented finite/tail or count 2 SC-vector witness replay; uncomputed nonlinear basin and prefactor |
| Positive family, N=1, `epsilon in [9499/1000000,9501/1000000]` | Independent operator assembly and all 450 Schur-complement inequalities passed; separate model/Jacobian enclosure reconstruction passed | Shared literal model/scaling loader, admitted existence/identification tube, nonconstant phase kernel and spectral lemmas remain premises |
| Entire Hopf bridge, all N stability and continuum cable | No completed new certificate | These targets remain uncertified; existing all-N existence is already proved and is not a new stability result |

### Near-zero result

[Local archive](../research/cardiac-cycle-certificates/reviews/hopf-local-radial-2026-10-03/README.md)
contains the exact tested source snapshots, actual receipts/logs, failed attempts
and scoped independent reviews. Its [manifest](../research/cardiac-cycle-certificates/reviews/hopf-local-radial-2026-10-03/manifest.json)
SHA256 is `d41ea1017e4457dcdfbe7bc5c640a160feec8e7f67e8e0acf63fdf54f740a16e`.
The native radial receipt hash is `8358e0ea087cb01e97fe2e8e48e46bf3f25600842bcf88eb16c54831b57e05c3`;
the native count 2 receipt hash is `a9f5878b35ba09efa4afc46f40fc270fa43915a74aefff4cfcc0a5c22de220a5`.

The radial physical-time bound is `Re(lambda_rad) <= -c epsilon^2`, where

    c = 17598251151852745997420323/260617961456609980053454848
      approximately 0.06752508942014214 per millisecond.

The other 16 exponents lie to the left of exact
`17293822569103/576460752303423488 > 3/100000` per millisecond. The reviewed
[pointwise nonlinear argument](../research/cardiac-cycle-certificates/reviews/hopf-local-radial-2026-10-03/ORBITAL-IMPLICATION.md)
uses distinct phase/radial exponents exhausting algebraic count 2, a C1 Poincare
section, an adapted contraction norm and summable return-time errors. Its
conservative orbital decay rate is `min(3/100000,c epsilon^2)/2` for each fixed
positive epsilon. Basin, prefactor and norm-equivalence constants are not computed;
no uniform positive rate or basin as epsilon tends to zero is claimed. The raw
producers' separate `model_stability_certified=false` flags are unchanged.

Frozen local producer/test/lemma hashes are respectively `486bada9b514e9ac91b1abfa33a61af1db60dd2be46b338c6f5c3dc5d6a5602b`,
`a5acb3d6b8d477b8a0f710b0d6bf75106d29e8d1bd6512cc00e7a9b41d7460ab`
and `c3eb4277b09460ff474b4bd3566ab72e6272ac0429880007cddea24589ae3283`.
Native radial/count 2 runs took 114.13/113.00 seconds and 341.61/537.17 MiB;
nine frozen-source test methods passed. The earlier full first-piece count 2
SC failure is preserved, not promoted.

### Positive-family full witness and model reconstruction

The [capture README](../research/cardiac-cycle-certificates/reviews/hopf-positive-witness-2026-10-03/README.md)
and [independent replay README](../research/cardiac-cycle-certificates/reviews/positive-family-replay-independent-2026-10-03/README.md)
explain composition and commands. [Independent review](../research/cardiac-cycle-certificates/reviews/positive-family-replay-independent-2026-10-03/independent-review.json)
SHA256 is `384df94a6a3af2535c7281d58a164bdf49893072bf6ac7f952e069fb565a9af5`.
The immutable compressed witness hash is `1cb70094886465f1e95f6faff16cda497476768a8bda4d42b7ebd4cce660bedc`.
[Spectral replay receipt](../research/cardiac-cycle-certificates/reviews/positive-family-replay-independent-2026-10-03/spectral-replay-receipt.json)
hash is `85b177391db15a3488023cfaa7d6fd0404ab16ba6ad650ec4bbfba2d47717138`;
it checks all 450 columns, one residue and spectral count 1. The successful
verifier source hash is `91db1539afdd246f1378421f61f9992adc229c2bae24372327665cbd424c5281`.
The actual replay took 183.453 seconds and 1378.609 MiB.

[Model reconstruction v3](../research/cardiac-cycle-certificates/reviews/hopf-positive-witness-2026-10-03/cardiac-model-reconstruction-positive-2026-10-03-v3.json)
hash is `b622a8dcebbf6424991badf2c898702f56f8f94032a788a65c5a7252097cf96d`;
it independently checked 83592 complex coefficients using checker
`fd579d160d230ff8f60c2a4cac494744866991ff81f14c67ff13ec4c8aa14f8d`.
This supplies the model-enclosure premise of the separate spectral replay;
it is not independent orbit existence or a new independent literal model.

The original capture/bindings and all 20 historical source/input bindings stay
immutable in the capture snapshot. Its old verifier is provenance; the later
successful verifier is separately preserved in replay-sources. Initial
spectral refusals/errors and model reconstruction v1/v2 refusals remain visible. Do not
rewrite old bindings to current checker bytes or discard those failures.

## Model meaning and next work

The [model translation audit](../research/cardiac-cycle-certificates/reviews/model-translation-2026-10-03/REPORT.md)
distinguishes Erhardt's smoothed, potassium-clamped 18-state target from full
19-state TP06. Only membrane-current concentration terms carry the capacitance
factor; internal calcium uptake/leak/release/transfer do not. Fixing Ki changes
the dynamics, not merely the conserved-charge leaf. Literal GHK divisors must
remain nonzero; no global extension at V=15 mV was supplied. The 170/240 f2
variants are not silently identified. The 49 numerical translation checks are
fidelity controls, not a global symbolic equivalence proof.

The accepted amplitude existence bridge is `[0,6427/50000]`, ending at 0.12854.
No complete new amplitude-stability cover or collector connects the tiny local
interval to the positive pilot near 0.0095 and through the whole bridge. Improve
parameter Taylor branch/eigenpair proposals or complex-circle bounds before
attempting expensive coverage. Near-zero decay vanishes quadratically.
All-N/cable stability still needs uniform spectral treatment, scaling and the
vanishing-gap limit. No clinical, action-potential or historical-priority claim
follows from these checkpoints. Existing released lower-branch uniform stability
and all-N existence retain their original scopes.
