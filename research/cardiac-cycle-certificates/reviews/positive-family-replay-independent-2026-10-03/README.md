# One positive-amplitude family: independent replay

This checkpoint independently reconstructs the saved model/Jacobian enclosures and all finite-window, tail, spectral-count and 450 Schur-complement inequalities for N=1 and epsilon in [9499/1000000,9501/1000000]. It retains the shared literal model translation, the admitted existence/identification tube, the nonconstant phase kernel and the reviewed spectral lemmas as explicit premises. It establishes neither the full Hopf bridge nor an all-N result.

The immutable original witness, bindings, model reconstruction receipt and family are in `../hopf-positive-witness-2026-10-03/`. Their exact hashes are in `independent-review.json`. `capture-snapshot/` preserves all 20 original source/input bindings. Its old verifier bytes are capture provenance. The successful later verifier source is separately pinned by the replay receipt and copied in `replay-sources/`.

From the fourier directory, with the pinned Python3.12/python-flint0.9.0 runtime, run the current verifier against the immutable capture:

```sh
python certificate_replay.py ../reviews/hopf-positive-witness-2026-10-03/witness.json.gz --bindings ../reviews/hopf-positive-witness-2026-10-03/bindings.json --source-root ../reviews/positive-family-replay-independent-2026-10-03/capture-snapshot --out NEW-RECEIPT.json
```

Use the project supervisor with a 300-second / 2500-MiB bound and single-threaded BLAS settings. The actual successful replay took 183.453 seconds and 1378.609 MiB aggregate RSS. Output is exclusive. The two earlier genuine refusals/errors and their supervisor logs are preserved. There was no numerical witness mutation, rebinding, tolerance change or producer rerun between them. The exact interval-A0c and large-rational serialization corrections have meaningful regression tests.
