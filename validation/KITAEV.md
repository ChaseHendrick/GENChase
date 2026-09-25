# Kitaev chain: exact Bogoliubov-de Gennes diagonalization and its benchmark

The `kitaev` tab now diagonalizes the Bogoliubov-de Gennes (BdG) matrix of the chain it draws. This
note records that computation, the exact results it is tested against, the failure controls that must
fail, and the print evidence. Run:

```sh
node tools/build.js
node tools/kitaev-science.js --write   # about 100 s on a 4-core machine with SwiftShader
```

The results are in [results/kitaev-science.json](results/kitaev-science.json). The record is the `kitaev`
entry of [techniques.json](techniques.json), with status **validated within stated limits**.

## What changed (2026-09-24)

Before this change the plate was not computed from the Hamiltonian at all. The rows in the top and
bottom 22% of the sheet were an assumed exponential whose decay was chosen from μ alone
(0.35 + 0.6 |μ|/2t, clamped), or sines on the trivial side, and the middle rows were sines. t and Δ did
not enter the picture except through the topological test |μ| < 2t, Δ > 0.02. The credit said the plate
was "obtained by imaginary-time relaxation of the Nambu Hamiltonian"; that was never true. The end
weight was a property of the assumed profile and was labeled "true by construction".

Now:

- The 2N × 2N BdG matrix of the open chain of N = grid sites is built from μ, t and Δ and diagonalized
  exactly in double precision: Householder reduction to tridiagonal form, then implicit QL with shifts
  (the EISPACK `tred2` and `tql2` of Wilkinson and Reinsch, 1971, written with only + − × ÷ and sqrt, so
  every JavaScript engine gives the same bits). The work is split into slices of the shell's CPU budget
  (70 to 310 ms from hash to finished plate in the studio run on the 4-core test machine, not
  counting the first page load); the result does not depend on where it pauses.
- Each row is |u(x)|² + |v(x)|² of one ± pair of quasiparticle modes (particle-hole symmetry makes the
  two equal), scaled to its own peak, on a linear |E| axis from zero at the top to the band top at the
  bottom; each row shows the pair whose |E| is nearest. A Majorana pair whose splitting double precision
  cannot resolve is drawn as its mean density, which does not depend on the basis the solver picked.
- The status keeps its structure: |μ|/2t, the end weight, the splitting, and the phase word, now with the
  localization length ξ. The end weight (the mid-gap pair's density on the outer tenth of the sites at
  each end) is measured from the computed modes and set beside the closed-form Majorana's value; the
  splitting 2|E₀| is measured. Both are `deterministic`. Below 4Nε‖H‖ (about 2e-13 at the default) the
  splitting is flagged as unresolved.

Every kitaev plate changes; this is a documented solver correction. No recipe key or default changed,
so recipes are read as before. The default plate goes from a nearly black sheet with thin assumed edge
bands to a dark gap band with bright Majorana edge lines above the bulk standing waves; the near-critical
and weak-pairing presets, whose gaps are small, are now mostly bulk interference patterns with a thin
gap band at the top.

## Model

In the Nambu basis (c₀ … c_{N−1}, c†₀ … c†_{N−1}), H = ½ Ψ† H_BdG Ψ + const with
H_BdG = [[h, D], [−D, −h]], h_jj = −μ, h_{j,j±1} = −t, D_{j,j+1} = −Δ, D_{j+1,j} = +Δ. This is the tab's
equation H = −μ Σ c†c − t Σ (c†_i c_{i+1} + h.c.) + Δ Σ (c_i c_{i+1} + h.c.) (A. Yu. Kitaev,
Phys.-Usp. 44, 131 (2001)). The references are:

- Rings: E(k) = ±sqrt((2t cos k + μ)² + 4Δ² sin² k), on k = 2πm/N for a periodic closing bond and on
  k = 2π(m + ½)/N for an antiperiodic one.
- Exact bulk gap: min over c = cos k in [−1, 1] of 4(t² − Δ²)c² + 4tμc + μ² + 4Δ², in closed form.
- Winding of (−μ − 2t cos k, 2Δ sin k) around the origin, computed numerically (4096 steps): 1 when
  |μ| < 2|t| and Δ ≠ 0, else 0.
- The semi-infinite chain's Majorana: φ_j = (x₊^{j+1} − x₋^{j+1}) / (x₊ − x₋) on one Majorana sublattice,
  x± the roots of (t + Δ)x² + μx + (t − Δ) = 0; |u_j| = |v_j| = |φ_j|/√2. ξ = −1/ln max|x±| sites.
- Splitting of a finite chain: C max|x±|^N for real roots, C |x|^N |sin((N+1)θ)| for complex roots
  x± = |x| e^{±iθ}. This asymptotic form is not assumed: the test shows the ratio becomes constant.
- At Δ = t the Majorana chain is an SSH chain with v = |μ| and w = 2t, so the splitting equals twice
  the exact SSH edge root e^{−Nκ}(w − v e^{−κ}), v sinh((N+1)κ) = w sinh(Nκ). This is an exact
  finite-N benchmark.

## Measured results

All numbers are deterministic; there is no sampling error.

| Test | Scope | Criterion | Measured |
| --- | --- | --- | --- |
| Ring spectra | 72 rings: N = 64, 96, 160 × 12 (μ, t, Δ) × periodic and antiperiodic | max \|E − E(k)\| < 1e-12; residual and orthonormality < 1e-12 (N ≤ 96) | 4.4e-14; residual 1.1e-14; orthonormality 9.5e-15 |
| Independent Jacobi on a BdG matrix built separately in the interleaved basis | 6 chains, N = 32 to 96 | eigenvalues within 1e-11, plate field within 1e-6 | 2.0e-14; field 1.4e-8 (Float32 storage) |
| Topological criterion | μ −2.40 to 2.40 (step 0.05) × t ∈ {0.4, 1, 1.6} × Δ ∈ {0.05, 0.2, 0.5, 0.8, 1.1, 1.4}, N = 64 | in-gap count = 2 × winding | 1492 tested points (1012 topological, 480 trivial), 0 disagreements |
| Δ = t identity | 5 (μ, t), N = 3 to 160, 773 chains | \|split − 2 E_SSH\| below 4Nε‖H‖ | at most 0.13 floors |
| Majorana profile | 6 chains | \|u\| = \|v\|, left mode = φ, pair density = ½(φ_L² + φ_R²), within 1e-9 + 4 max\|x±\|^N | ≤ 4.5e-12, ≤ 2.8e-12, ≤ 4.4e-15 |
| End weight | same chains | computed vs closed form | ≤ 3.3e-16 |

The criterion test excludes the 24 critical points |μ| = 2t and counts separately the 230 topological
points whose max|x±|^64 exceeds 1e-3, where a length-64 chain might not yet separate the pair; all 230 had
the pair in the gap anyway.

Splitting (ratio R(N) = split / shape over the upper half of the resolved window, where the splitting
still exceeds 1000 floors; points with |sin((N+1)θ)| < 0.05 skipped):

| μ | t | Δ | roots | ξ (sites) | N range | R constant to | rate from R | ln max\|x±\| |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.2 | 1 | 0.9 | real | 1.59 | 4 to 38 | 7.6e-11 | −0.629618 | −0.629618 |
| 1.8 | 1 | 0.5 | real | 3.70 | 4 to 82 | 1.0e-8 | −0.270105 | −0.270105 |
| −1.4 | 1 | 0.6 | complex, θ = 0.505 | 1.44 | 4 to 34 | 1.7e-9 | −0.693147 | −0.693147 |
| 1.5 | 1 | 0.2 | complex, θ = 2.443 | 4.93 | 4 to 97 | 2.8e-9 | −0.202733 | −0.202733 |
| 1.0 | 1 | 0.3 | complex, θ = 2.123 | 3.23 | 4 to 69 | 9.2e-10 | −0.309520 | −0.309520 |
| 0.4 | 1 | 0.8 | complex, θ = 1.911 | 0.91 | 4 to 21 | 1.5e-8 | −1.098612 | −1.098612 |

The rate differs from ln max|x±| by at most 2.0e-10 per site. The splitting therefore decays at exactly
the rate of the closed-form localization length, and in the complex case oscillates exactly as
|sin((N+1)θ)|.

## Failure controls (each must fail, and does)

Injected into copies of the module source, then run through the same checks:

1. **Pairing Δ dropped from the BdG matrix**: the ring spectra miss the band by up to 1.5, and 38 of 46
   criterion points disagree (the normal chain has states throughout the would-be gap).
2. **Ring closed with the opposite boundary sign**: the periodic spectrum misses k = 2πm/N by up to 0.087.
3. **Open chain given a closing bond** (the boundary hopping not removed): all 38 topological criterion
   points lose their Majorana pair.
4. **One QL rotation not applied to the eigenvectors**: residual 2.0 and the Majorana profile fails.

## Print evidence

Seven studio recipes (default; Majorana ends 1:1 at grid 128; trivial 5:4 at 112; deep 1:1 at 96; near
critical 4:5 at 144; Log view; weak pairing 16:9 at 160) run in the real studio, a temporary copy of
`dist/studio.html` with an audit hook. In each, the plate field is identical bit for bit to the field
the extracted module code computes in Node, and within 1.5e-8 of the field rebuilt from the independent
Jacobi eigenvectors; the status prints the measured end weight and splitting. The module's own
`exportPNG` at 300 ppi sheet sizes is compared pixel by pixel with colors rebuilt from the field through
the shared ramp: every pixel is within one channel level of its nearest-neighbor cell (a neighboring
cell on cell boundaries), none unmatched, and a one-cell displacement mismatches 49.6% to 99.3% of pixels.
The sheets are 1920 × 2400, 2400 × 2400, 2400 × 1920 and 2400 × 1350. `node tools/export.js kitaev 8 300`
also passes through the real export button for the default and all six presets. Recipe and plate state are unchanged by export. The plate is raster density; there is no vector
output.

## Domain

- Parameters: rings at N = 64, 96, 160; the open-chain lattice above at N = 64; splitting N = 4 to 97
  for six sets and the Δ = t identity for N = 3 to 160; seven studio recipes covering the presets, all
  four sheets and every grid the tab allows (96 to 160 in steps of 16; the schema minimum is 96, so
  the module's own floor of 64 is never reached). Chains of 64 sites and fewer appear only in the Node
  tests of the module's code.
- Conditions: spinless single-band chain in the mean-field BdG form of the tab equation, real μ, t, Δ;
  no self-consistency, disorder or interactions; open ends in the tab, rings only in the band check; no
  randomness anywhere.
- Resolution: exact diagonalization of the 2N × 2N matrix; splittings below 4Nε‖H‖ are unresolved and
  flagged.
- Precision: binary64 solver and references; Float32 field; RGBA8 raster.

## Limitations

- Finite chains of up to 160 sites in the studio. Thermodynamic-limit statements are closed forms.
- For most topological presets the splitting is far below double precision (ξ is about one site), so
  the tab can only say it is unresolved. Only at Δ = t is an exact finite-N splitting used here; for
  other Δ the test establishes the rate and the oscillation, not the prefactor C.
- The tab draws open chains only; the rings are exercised through the module's builder in Node.
- Mean-field BdG only: no self-consistent Δ, interactions, disorder, spin, or nanowire experiment.
