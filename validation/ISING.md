# Ising model: exact benchmarks and print evidence

This review tests the `ising` tab's actual GPU sampler, the checkerboard Metropolis shader `ISING_STEP` in
[src/modules/lattice.js](../src/modules/lattice.js), against three exact results for the ferromagnetic
square lattice with J = k_B = 1, h = 0 and periodic boundaries, and checks that the print path draws exactly
the spin state it was given. The numbers below are from the quick mode of
[tools/ising-science.js](../tools/ising-science.js), run on 2026-09-24 with SwiftShader
(`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`, float32 spins) in
514 s on a shared 4-core machine (514 to 601 s over three runs); the saved results are in
[results/ising-science.json](results/ising-science.json), which records its mode.

```sh
node tools/ising-science.js --write          # quick mode, about ten minutes with SwiftShader
node tools/ising-science.js --full --write   # long chains, more seeds and sizes, for a local run (hours)
node tools/ising-science.js --full --plan    # print the runs, seeds and random windows and exit
```

## What runs

A temporary copy of `dist/studio.html` gains one read-only hook on the ising instance: its own `step()`,
`sample()`, spin texture and GL context. Each run loads a recipe through the URL hash (`grid`, `T`, `h = 0`,
`hMode: uniform`, `init`, `running: false`, `warmup: 0`), checks that the effective state survived `sanitize`,
and checks that the tab's `tick0` equals the one computed in Node from the engine's `makeRng`. It then calls
the tab's `step()` and `sample()` exactly as the tab's frame loop does. After every few sweeps the float spin
texture is read back and the magnetization per site m and the bond energy per site
u = −(1/N) Σ s_i (s_right + s_up) are computed in the page from the spins, independently of the tab's own
reductions. Nothing in the module's numerics, defaults, presets or random streams is changed.

Error bars are `stats.seriesMean` from [src/shared/stats.js](../src/shared/stats.js): the integrated
autocorrelation time with Sokal's window (c = 5) and n_eff = n / (2 tau_int). A comparison passes when the
series is at least 50 tau_int long and |z| ≤ 3.5, where z = (measured − exact) / se. Burn-in sweeps are
discarded. Three quick runs gave bitwise identical series for all 12 chains.

## The exact results, and a check of their implementation

- Yang's spontaneous magnetization (Phys. Rev. 85, 808, 1952): M(T) = (1 − sinh(2/T)^−4)^(1/8) for T < T_c.
- Onsager's internal energy per site (Phys. Rev. 65, 117, 1944):
  u(T) = −coth(2K)[1 + (2/π)(2 tanh²(2K) − 1) K(k)], K = 1/T, k = 2 sinh(2K)/cosh²(2K), with the complete
  elliptic integral K(k) = π / (2 AGM(1, k')), k' = √(1 − k²).
- Onsager's critical temperature T_c = 2/ln(1 + √2) = 2.269185...

The textbook form of u(T) cannot be evaluated at T_c: k rounds to 1, K(k) is infinite, and it multiplies a
factor that is exactly zero there. In floating point it returns NaN at T_c. The tool uses an equivalent form
without the cancellation. With s = sinh 2K and c = cosh 2K, 1 − k² = (s² − 1)²/c⁴ exactly, so
k' = |s² − 1|/c², and 2 tanh² 2K − 1 = (s² − 1)/c² = ±k'. The elliptic term becomes ±k'/AGM(1, k'), which
tends to 0 as k' → 0 because AGM(1, k') ~ π / (2 ln(4/k')). At T_c, sinh 2K_c = 1 and u = −coth 2K_c = −√2.
The implementation is checked before any sampling:

| Check | Result |
|---|---|
| u(T_c) against −√2 | −1.414213562373095, error 2.2e-16 |
| u at T_c (1 ± 1e-9) and T_c (1 ± 1e-6) | within 1e-4 of −√2 (continuous through T_c) |
| AGM K(k) against direct quadrature, k = 0.3, 0.8, 0.99, 0.9999 | relative error ≤ 2.3e-14 |
| stable form against the textbook form, 9 temperatures from 1.2 to 4.0 | ≤ 1e-12 |
| u against Onsager's double integral −(1/2π²) ∫∫ ∂_K ln[cosh² 2K − sinh 2K (cos a + cos b)], same 9 temperatures | ≤ 2.1e-13 |
| the double integral at T_c (4000 × 4000 midpoint rule) | within 4.7e-10 of −√2 |
| low-temperature series M = 1 − 2z⁴ − 8z⁶, u = −2 + 8z⁴, z = e^{−2K}, at T = 0.6 and 0.8 | agree to the order of the next term |

The double integral is Onsager's free energy differentiated under the integral sign, so it tests the
elliptic reduction independently.

## Finite size: which temperatures qualify

On an L × L torus the corrections to M and u away from T_c are exponentially small. With the dual coupling
K* = −½ ln tanh K, the correlation length is ξ = 1/(2(K* − K)) above T_c and 1/(4(K − K*)) below, and the
interface tension below T_c is σ = 2(K − K*). Below T_c a pair of domain walls wrapping the torus costs
about L² e^{−2σL}. The tool takes e^{−L/ξ} + L² e^{−2σL} (below) or e^{−L/ξ} (above) as an order-of-magnitude
bound on the relative correction and counts a temperature as a test only when the bound is below 1e-6, far
under every error bar here.

| T | ξ | σ | bound at L = 128 | bound at L = 256 |
|---|---|---|---|---|
| 1.5 | 0.63 | 0.793 | 1e-84 | 3e-172 |
| 1.8 | 1.17 | 0.427 | 5e-44 | 7e-91 |
| 2.0 | 2.19 | 0.228 | 7e-22 | 1e-46 |
| 2.1 | 3.61 | 0.139 | 6e-12 | 1e-26 |
| 2.2 | 9.11 | 0.055 | 1.3e-2, does not qualify | 4e-8 |
| 2.4 | 10.2 | | 3.7e-6, does not qualify | 1e-11 |
| 2.5 | 5.96 | | 5e-10 | 2e-19 |
| 3.0 | 2.14 | | 1e-26 | 9e-53 |

The smallest grid the tab offers is 128. The quick mode tests T = 1.5, 1.8, 2.0, 2.1 (below) and 2.5, 3.0
(above) at L = 128; the full mode adds 2.2 and 2.4 at both 128 (reported, not counted) and 256 (counted).

## Results

Quick mode, L = 128, one seed per temperature. Below T_c the chain starts from the tab's Cold start (all up),
above it from Hot; 1000 sweeps are discarded and 8000 (below) or 6000 (above) are measured, sampled every 4.

| T | Yang M | measured ⟨\|m\|⟩ | z | tau_int (sweeps) | n_eff |
|---|---|---|---|---|---|
| 1.5 | 0.98650 | 0.986460 ± 0.000036 | −1.01 | 2.0 | 1976 |
| 1.8 | 0.95686 | 0.956790 ± 0.000087 | −0.72 | 2.4 | 1683 |
| 2.0 | 0.91132 | 0.91126 ± 0.00019 | −0.31 | 3.2 | 1263 |
| 2.1 | 0.86875 | 0.86867 ± 0.00037 | −0.20 | 5.1 | 781 |

| T | Onsager u | measured u | z | tau_int (sweeps) | n_eff |
|---|---|---|---|---|---|
| 1.5 | −1.95112 | −1.95103 ± 0.00012 | 0.74 | 2.0 | 1975 |
| 1.8 | −1.85930 | −1.85922 ± 0.00022 | 0.40 | 2.2 | 1810 |
| 2.0 | −1.74556 | −1.74551 ± 0.00032 | 0.18 | 2.4 | 1684 |
| 2.1 | −1.66208 | −1.66179 ± 0.00044 | 0.68 | 3.0 | 1337 |
| 2.5 | −1.10608 | −1.10685 ± 0.00067 | −1.16 | 3.9 | 767 |
| 3.0 | −0.81731 | −0.81747 ± 0.00037 | −0.42 | 2.0 | 1467 |

All ten comparisons pass; the largest deviation is 1.2 σ. The measured ⟨|m|⟩ on a finite torus is not
exactly the infinite-lattice M, but at these temperatures the difference is far below the error bars (see
the bound above).

The tab's own |m| series, which it samples every 24 sweeps for the status line and exports as
`abs_m_series`, equals the read-back value at every one of its 375 (below) or 291 (above) samples. What the
status line would print from it (second half, tau_int error) is recorded too, for example
0.86741 ± 0.00077 against Yang's 0.86875 at T = 2.1.

## T_c from the Binder cumulant

U_L(T) = 1 − ⟨m⁴⟩/(3⟨m²⟩²) is measured from one long chain per size at the tab's default temperature
T0 = 2.27 (0.0008 above T_c) and reweighted to nearby T with weights exp(−(1/T − 1/T0) E_total)
(Ferrenberg and Swendsen, Phys. Rev. Lett. 61, 2635, 1988), trusted over one energy-histogram width of the
largest lattice, 2.2628 ≤ T ≤ 2.2772. Error bars come from a circular moving-block bootstrap of the (m, E)
pairs with blocks of max(2 tau_int, n^(1/3)) samples and a seeded generator (400 draws in quick mode). Two
estimators are reported:

- **Crossing (model-free):** where U_L1(T) = U_L2(T).
- **Fixed point:** where U_L(T) = U* = 0.61069, the universal value at T_c on the periodic square
  (Kamieniarz and Blöte, J. Phys. A 26, 201, 1993; Salas and Sokal, J. Stat. Phys. 98, 551, 2000). This
  assumes the Ising universality class on a torus, not the value of T_c.

An estimate is called conclusive only when its bootstrap standard error is below 0.005 (0.2% of T_c) and
every size in it has a reliable tau_int (run at least 50 tau_int long); a conclusive estimate that
disagreed with Onsager beyond 3.5 σ would fail the run.

| L | kept sweeps | tau_int(m²) (sweeps) | U(T0) | U = U* at T |
|---|---|---|---|---|
| 128 | 40,000 | 573 (reliable) | 0.611 ± 0.013 | 2.2700 ± 0.0030 (z = 0.27) |
| 192 | 28,000 | 711 (not reliable: 39 tau_int) | 0.635 ± 0.011 | 2.276 ± 0.014 (reported only) |

- **Fixed-point estimate:** T_c = 2.2700 ± 0.0030 from L = 128, against Onsager's 2.26919, z = 0.27.
  It is conclusive and consistent.
- **Model-free crossing:** inconclusive in quick mode. The two Binder curves are nearly parallel over the
  trusted range: dU/dT is about −4 at L = 128, and the 192 curve differs from it by less than its own
  error. Their difference has no root inside the range in 348 of 400 draws, and the chord estimate is
  2.25 ± 0.60 (68% half-width 0.014). This is a statistics limit, not a disagreement, and L = 192 is also
  too short for a reliable tau_int. The smallest grids the tab offers (128, 192, 256) are too large to do
  this affordably on a software renderer: tau_int(m²) grows roughly as L^2.17, from about 570 sweeps at 128.
- **Full mode:** designed for the crossing. It runs one chain each of 240,000 (L = 128), 360,000 (192) and
  600,000 (256) measured sweeps. The expected bootstrap error is about 0.002 on the combined crossing.
  That is an extrapolation from the quick-mode spreads, not a result.

The measured U_128(T0) = 0.611 ± 0.013 agrees with U* = 0.61069.

## Failure controls

Two mutations are injected into further copies of the same studio, in the same shader, and run through the
same tests at L = 128 (500 burn-in and 2000 measured sweeps each):

| Mutant | T | ⟨\|m\|⟩ vs Yang | u vs Onsager |
|---|---|---|---|
| acceptance `exp(-dE / (2.0 * u_T))`, so the chain samples 2T | 2.0 | 0.0126 ± 0.0004 vs 0.911, z = −2005 | −0.5570 ± 0.0006 vs −1.7456, z = +1866 |
| same | 2.5 | | −0.4283 ± 0.0006 vs −1.1061, z = +1212 |
| neighbor sum dropped, `dE = 2.0 * s * h` | 2.0 | exactly 1 vs 0.911 (every spin flips every sweep) | exactly −2 vs −1.7456 |
| same | 2.5 | | −0.0110 (frozen hot configuration) vs −1.1061 |

Every control fails every test it enters. The 2T mutant samples the true model at twice the temperature,
so its Binder crossing would sit at T_c/2 ≈ 1.13 by construction; that is argued, not run.

## Print

On the tab's default plate (grid 256, T = 2.27, Hot start, Spins view, Pixelate, the default graphite
palette) after 500 sweeps:

- The module's `exportPNG(2400, 2400)` (8 in at 300 ppi): all 5,607,424 pixels whose centers are not within
  1/1000 of a cell of a cell edge are checked against the spin of the cell under them. There are exactly two
  inks, (235, 56, 42) for up and (21, 21, 21) for down, and 0 pixels are wrong. Shifting the spin field by one
  cell makes 1,067,442 pixels wrong, so the check can fail.
- `Studio.exportData()` (the .npz): `spins.npy` is int8, shape [256, 256], and identical to the read-back
  spins with row 0 at the top. `abs_m_series.npy` is identical to the tab's series, and `meta.json` records
  the grid and the sweep count.
- The shell's own print export, set to 8 in and 300 ppi and pressed like a user: the sheet is 2400 × 2400,
  and the luminance at all 65,536 cell centers classifies every cell as its spin (0 wrong).
- The spins, the sweep count, the |m| series and the recipe are identical before and after all three
  exports.

The shell renders this tab at twice the print size and averages down, because `ising` does not declare
`fieldCells()`. Cell edges in the sheet are therefore blended over about one print pixel; only the module
PNG is pixel-exact.

## Random streams

The tab's random number for a site at tick t is an integer hash of (site, t), with
tick = tick0 + 2 × sweep + parity and tick0 = `makeRng(seed + '/ising/tick').int(0, 1e6)`. Different seeds
therefore read windows of one hash sequence. Two chains whose tick0 differ by an even offset smaller than
twice their length reuse the same random numbers at the same sites, a time lag apart, and coupled Metropolis
chains can coalesce. A site of one checkerboard color is only updated at ticks of one parity, so windows
whose tick0 have opposite parity never share a number. The tool gives every run a seed whose window is
disjoint, within its parity class, from every other run's. In quick mode all 12 windows are globally
disjoint. In full mode the three Binder chains are globally disjoint; the other runs are disjoint within
their group, meaning the seeds pooled at one (L, T). The scope reached is recorded per run.

For art this is harmless. For anyone using the tab for statistics it means that at most about a million
sweeps of independent randomness exist per site across all seeds, and that two arbitrary seeds are not
guaranteed independent for runs longer than their tick0 separation.

## Limits

- Only h = 0 with the uniform field shape, periodic square grids (L = 128 and, for the Binder cumulant,
  192), and equilibrium averages. Nonzero or patterned fields, non-square aspects, coarsening dynamics,
  critical exponents and the Magnetization, Domain walls and Bond energy views are not tested.
- float32 spin textures on SwiftShader. The rgba16f fallback stores ±1 exactly, but on such a device the
  tab's own |m| uses an 8-bit block reduction, which the tab states; that path is not tested here.
- T_c is established at 0.13% through the fixed-point estimator, which assumes the universal U*. The
  model-free crossing is inconclusive in quick mode and awaits a `--full` run.
- The error bars assume the tau_int estimate is adequate (runs of at least 50 tau_int). Independence of
  seeds relies on disjoint random windows, as described above.
- Temperatures outside the listed ones, and T = 2.2 and 2.4 at L = 128, are outside the tested domain.
