# Immutable positive-amplitude witness and model reconstruction

This capture concerns one N=1 family, epsilon in
`[9499/1000000,9501/1000000]`, centered at `19/2000`. It is not a full Hopf-bridge
or all-N certificate. [family.json](family.json) contains the admitted affine
existence/identification tube and the original proposal, including K 20, Kp 64 and
M 128. [bindings.json](bindings.json) declares Ke 12, 450 finite-window dimensions,
one residue, expected spectral count 1 and requested physical margin 1e-6/ms.

The original [witness.json.gz](witness.json.gz), bindings and
[capture receipt](capture-receipt.json) are immutable. Their preserved bytes are
listed in [preservation-manifest.json](preservation-manifest.json). Key SHA256:

- compressed witness: `1cb70094886465f1e95f6faff16cda497476768a8bda4d42b7ebd4cce660bedc`
- family: `a04cfbd7561235af5d7b8ae808b3e17c5dd76edefd4079c8d5ca89e20e3aad11`
- original bindings file: `0a77d78c03f6d205d73b45a878666f8c394bf63d3eabffe62038221392d89f64`

The different canonical bindings digest in the independent receipt hashes its
canonical JSON representation; it does not replace or rebind this original file.

## Checked composition

[Independent spectral replay](../positive-family-replay-independent-2026-10-03/spectral-replay-receipt.json)
passed all 450 Schur-complement column inequalities, the tail/resolvent checks,
comparison inverse bounds and spectral count 1. It independently assembles the
operator from saved coefficients. Its verifier is separately pinned as
`91db1539afdd246f1378421f61f9992adc229c2bae24372327665cbd424c5281`.
The actual successful run took 183.453 seconds and 1378.609 MiB.

The separately checked [model reconstruction v3](cardiac-model-reconstruction-positive-2026-10-03-v3.json)
reconstructs the Jacobian Fourier enclosures, Hessian variation bounds, signed
DFT/alias terms, derivative disks and partition coverage from the supplied
analytic tube. It checked 83592 complex coefficients using
`model_enclosure_replay.py` hash `fd579d160d230ff8f60c2a4cac494744866991ff81f14c67ff13ec4c8aa14f8d`.
The complete result composition and tests are in
[independent-review.json](../positive-family-replay-independent-2026-10-03/independent-review.json).

The spectral replay alone still lists operator enclosures as a premise; model
reconstruction supplies that premise in the composed result. Both retain the
shared pinned literal model and decimal/scaling loader, admitted orbit
existence/identification and its analytic tube, the known nonconstant phase
kernel, and reviewed spectral homotopy lemmas. Neither independently proves
orbit existence or a new literal model translation.

## Provenance and failure history

[Historical capture snapshot](../positive-family-replay-independent-2026-10-03/capture-snapshot/snapshot-manifest.json)
retains all 20 original source/input bindings. Its original verifier bytes are
capture provenance. [Successful replay sources](../positive-family-replay-independent-2026-10-03/replay-sources/)
retain the later checker separately. Do not overwrite historical capture files
or rewrite their bindings to current checker hashes.

Model v1 refused an exact-input boundary; the historical v2 checker returned
`Refused: Jacobian tube component 0 saved majorant too small`. This is a
preserved failed checker attempt, not an admission that the saved proof bound
is invalid. The successful v3 reconstruction and its independent review supply
the accepted enclosure result. The actual [v1](cardiac-model-reconstruction-positive-2026-10-03-v1.json)
and [v2](cardiac-model-reconstruction-positive-2026-10-03-v2.json) receipts,
logs and source snapshot remain. Independent spectral attempts first refused
a point-only comparison-block requirement and then hit exact-rational receipt
formatting limits. The successful corrections retained the interval comparison
block and exact arithmetic; they changed no witness, tolerance or producer.

Use the bounded command and explicit premises in the
[independent replay README](../positive-family-replay-independent-2026-10-03/README.md).
This new explanatory README is outside the original preservation manifest;
all previously bound capture bytes are unchanged.
