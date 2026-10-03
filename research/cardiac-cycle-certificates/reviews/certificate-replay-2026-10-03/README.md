# Independent spectral replay checkpoint

`G6-witness.json.gz` is the complete fresh schema 2 witness, not a summary of
producer success flags. Its manifest binds the observed sources, model/scales,
input bytes, settings, parameter interval and centre. `manifest.json` lists the
actual artifact hashes and bounded-run measurements. The frozen producer was
not changed and no published result was rewritten.

The full 450-column replay passed. It reconstructs the operator and coupling
enclosures from common primitive data, every finite polynomial matrix product,
tail inverse defect and resolvent, all Schur-complement columns, spectral count,
and period/multiplier inequalities. Arithmetic uses independently written
python-flint matrix code plus exact rational scalar gates. It shares the Arb
arithmetic library with the producer.

The operator's model/strip/DFT/Hessian enclosure construction, orbit existence,
phase identity and Hill-sector lemmas remain explicit premises. This checkpoint
is not end-to-end independent model verification and admits no new full bridge,
all-N/cable stability, regenerative action potential or physiological reentry.

## Replaying the saved checkpoint

Use Python 3.12 and python-flint 0.9.0. From this folder:

```sh
python tested-sources/certificate_replay.py G6-witness.json.gz \
  --bindings G6-bindings.json --out /tmp/G6-replay-new.json
```

The output path must be new. The original invocation used a 300-second cap and
2500 MiB aggregate RSS cap. Capture took 200.54 seconds and 913.45 MiB; replay
took 133.95 seconds and 1407.48 MiB on the recorded Apple Silicon environment.
This command replays mathematical inequalities against the independently
preserved manifest. It does not itself verify current checkout bytes.

The actual original invocation additionally used `--source-root` and checked all
manifest bytes at its tested source checkpoint. The two matching observer and
verifier sources are preserved in `tested-sources/`. Current sources later added
generic DIM/IV capture, independent expected-count binding and before/after
current-file checks. These changes passed the small suite and are listed
explicitly in the manifest. The saved witness's source hashes must not be
silently rebound to these later bytes.

To produce a new current G6 witness from the scientific Fourier directory:

```sh
python stability_witness.py --group 6 --out /tmp/G6-new.json.gz \
  --bindings /tmp/G6-new-bindings.json
python certificate_replay.py /tmp/G6-new.json.gz \
  --bindings /tmp/G6-new-bindings.json --source-root .. \
  --out /tmp/G6-new-replay.json
python -m unittest test_certificate_replay
```

These commands perform a fresh bounded numerical proof when run by a user.
The current generic observer was checked with a small actual trace/replay
fixture; another full current capture after its generic additions is not claimed.

## Independent model-checker composition

The model checker should construct the exact serialized primitive operator and
prove its model enclosure premises. Bind its receipt to
`certificate_replay.canonical_hash(witness['operator'])`, the independently
supplied source/input/domain manifest, and its own implementation/runtime.
Comparing a receipt's hash alone does not prove its inequalities.

The operator has exactly these keys:

```text
kind, S_exponents, J, strip, radii, error, rho, rho0, rho2,
omega, omega_error, h, D
```

Every scalar interval is two canonical rational texts, and every complex entry
is `[real_interval, imag_interval]`. For an affine family, `J` contains J0/J1c,
`strip` contains SJ0/SJ1, `radii` contains rad1, and `omega` contains the exact
centre/tangent. Quadratic families additionally contain C2c/SC2/rad2/om2half.
`error` is the state/parameter tube majorant, not merely the DFT error. The
verifier constructs operator coefficient rectangles, similarity scaling,
frequency intervals, window remainder and damping from these premises. The
model checker must establish the primitive Fourier/strip/radius/tube bounds
before a composed result can discharge the model-enclosure premise.

Historical observer serialization and duplicate-residue failures are retained.
The private v1 migration removed only a proven identical duplicate snapshot;
its receipt is explicitly separate from the fresh schema 2 success.
