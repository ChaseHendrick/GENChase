# Gross–Pitaevskii condensate: first numerical evidence

This tab integrates the two-dimensional Gross–Pitaevskii equation in oscillator units,

```text
i ∂ψ/∂t = [−½∇² + ½ trap r² + g|ψ|² − Ω L_z] ψ
```

with imaginary-time relaxation to a ground state and a real-time staggered (Visscher) scheme. The studio path is GPU shaders in `src/modules/bec.js`. The first numerical package is an independent Float64 twin of those discrete operators, not a bit-exact GPU float32 replay and not an experimental sodium-BEC claim.

## Numerical evidence

Run `node tools/bec-science.js --write`. Results are recorded in
[bec-science.json](results/bec-science.json). The harness asserts that the maintained shader
source still contains the Laplacian, trap, interaction, Visscher half-steps, imag-time RHS,
Thomas–Fermi seed formula and `NORM_EVERY = 32` renormalization stride.

| Check | Reference and acceptance | Role |
|---|---|---|
| Real-time norm | Unitary Visscher evolution at `g=0`, `Ω=0`, harmonic trap, Gaussian packet, physical time `T=2` | `|‖ψ‖₂ − 1| < 2e-3` |
| Thomas–Fermi seed | Continuum 2D harmonic TF: `μ = √(g·trap/π)`, `E = (2/3)μ`, radius `√(2μ/trap)` | Seed μ/energy relative errors `<0.04` / `<0.05` |
| Imag-time ground state | Same TF formulas after Euler imag-time + periodic L2 renormalization from a broad Gaussian | Energy relative error `<0.06`, μ `<0.12`, kinetic fraction `<0.05`; energy decreases from the Gaussian |
| Prepared vortex winding | TF amplitude × healing core × phase `e^{iθ}` | Central plaquette winding exactly `+1` |
| Wrong Laplacian sign | Imag-time kinetic Laplacian flipped (anti-diffusion) | Relative TF energy error `>1` (or nonfinite/vanished field) |
| Wrong interaction sign | Attractive `g` under imag-time | Collapse or relative TF energy error `>0.2` |
| Broken renormalization | Imag-time without L2 rescale | Final norm `<0.1` |

## Honest limits

- Print evidence is state-preservation only; see Print evidence below.
- Nonlinear real-time evolution with dens evaluated at mixed Visscher half-levels is not claimed to conserve naive `L2` exactly; the registered unitary check is the linear `g=0` limit.
- Rotating-frame `Ω L_z`, Abrikosov lattice counting, quantum turbulence and GPU float32/float16 agreement remain unvalidated.
- Prepared single-vortex winding is not a physical vortex count from noisy real-time encoded fields.

## Print evidence

Run `node tools/bec-print-state.js --write`. Results are recorded in
[bec-print-state.json](results/bec-print-state.json). The harness instruments the live
module only inside Playwright, reads the float32 PingPong plate before and after the real
`exportPNG` path (2400×2400, density/phase/both/vortices), and rejects a deliberate
post-export one-step advance.

- Preservation and declared plate dimensions only on paused initial Ω=0 SwiftShader float32 fields at grid 256; not lattice fidelity, calibrated color, evolved/rotating exports, or float16 fallback.
- Status stays **partially validated** (numerical + print recorded; not Ledger-promoted).

Neighbor-search and preview checks (`tools/bec-neighbors-check.js`, `tools/bec-preview-check.js`) remain non-science diagnostics.
