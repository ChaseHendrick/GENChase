# Positive-amplitude stability pilot

Fresh experimental single-cell result, 2026-10-03. The source-bound producer in
`result.json` passed a fresh orbit localization and all uniform Hill certificate
inequalities on epsilon in [0.009499, 0.009501]. Requested decay is 1e-6 per ms;
the outward full-period multiplier upper bound is 0.9999473509515758.
This is one subinterval of the admitted Hopf branch. It does not supply full
Hopf-bridge stability, a near-zero quantitative interval, or ring/cable stability.

The run took 161.48 seconds in the producer, 162.14 seconds in its supervisor,
with sampled aggregate peak RSS 832.89 MiB. The finite window has 450 rows,
the coefficient cutoff is 64, the DFT grid has 128 nodes, and the new proposed
orbit centre has 20 Fourier modes. The exact parent-ball inclusion, analytic
strip flags, source/input/settings bindings and complete native certificate
diagnostics are in `result.json`. `run.log` and `run.receipt.json` retain the
actual calculation and supervision details.

Reproduce with the pinned python-flint 0.9.0 environment, one BLAS thread, and
an external wall-clock and memory cap. From the `fourier` directory:

```sh
python hopf_stability.py --piece 4 --halfwidth 1/1000000 --centre-K 20 \
  --M 128 --Kp 64 --delta 1e-6 --output NEW-RESULT.json
```

Use the exact producer source digest recorded in `result.json`; subsequent
producer revisions require new evidence. Fresh rigorous bounds can differ
between platforms. Acceptance requires strict mathematical inequalities and
input/source bindings, rather than equality of diagnostic floating values.
Independent replay of the native spectral matrices is a separate contract;
the small summary retained here is not a full replay witness.

Three earlier private bounded attempts failed and supplied no theorem:

* The stored 8-mode centre left an orbit tube too broad for the small-gain test.
* A 20-mode proposal with the old 64-node existence DFT had excessive aliasing error.
* The refined orbit with only 24 Jacobian coefficients retained a generic Cauchy
  coupling tail too broad for the small-gain test.

The accepted run refines both the orbit and the coefficient/tail enclosure.
No failed inequality was weakened into a successful certificate.
