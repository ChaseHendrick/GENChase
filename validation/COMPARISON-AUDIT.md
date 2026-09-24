# Printed comparisons: audit and conversion, 2026-09-24

Every status line that prints a measured number beside a theoretical or reference value now builds that
span with `Studio.util.stats.compare()`, which will not print it without a basis and, for a sampled number,
an error bar or the stated reason there is none yet. `tools/lint.js` keeps hand-written comparisons out
(AGENTS.md, "A measured number carries an error bar"). This file records how the existing comparisons were
found, what each was classified as, and what the audit found wrong that this change did not fix.

## Method

Four read-only audits read every file in `src/modules/` and listed each place a status line
(`host.setStatus`) or a structured witness (`host.setWitness`) showed a measured quantity against a
reference: explicit ones ("mean sides 6.48 (Euler: 6)", "surmise 0.523") and residual or drift
diagnostics against an ideal value ("LIA 0.004 · 0", "ΔE/E₀ 3e-7"). Parameter echoes against a threshold
("T 2.27 · 1.00 T_c · critical", "r above linear onset") are not measurements and were left alone. The
audits found 121 candidate comparisons on 65 tabs. Those that set a measurement against a reference value
were routed through `compare()` with one of four bases; the few that are verdict labels from thresholds or
parameters stayed labels (listed at the end of the next-but-one section).


| Basis | Meaning | What the status line says |
|---|---|---|
| sampled | The number estimates something from random draws | value ± error, the deviation in σ, and the method on hover; or "error bar pending: reason" with no verdict |
| exact | An exact count or integer invariant | "exact, no sampling error" |
| deterministic | No randomness enters; the error is numerical only | "deterministic, no sampling error" |
| construction | The agreement is forced by how the plate is built | "true by construction; a regression test, not a prediction" |

The distinction between the last two is the one AGENTS.md draws under "A check that cannot miss is not a
check". A comparison labeled construction still runs and still catches a regression; it is not evidence
about the physics.

## New error bars

These tabs gained a computed uncertainty where they printed none, all from the shared harness and all
resampled with the plate's seed so the error bar reprints with it.

| Tab | Printed number | Method |
|---|---|---|
| `ising` | \|m\| against Yang's exact spontaneous magnetization below 0.95 T_c at h = 0 | τ_int of the \|m\| series sampled every 24 sweeps, first half discarded as equilibration; pending until 20 samples and 50 τ_int. Near T_c the note reports τ_int in sweeps (critical slowing down). Every site is counted from the float spin field; a half-float device falls back to the 8-bit reduction and says so. |
| `potts` | von Neumann–Mullins slope k and intercept (the law predicts intercept 0) | bootstrap over surviving cells |
| `timecrystal` | period-doubled order m₂ | τ_int across periods |
| `rmt` | unfolded spacing coefficient of variation against the Wigner surmise | bootstrap over independent spectra (rows) |
| `kpz` | fitted growth exponent β against the class value | moving-block bootstrap over the log-spaced samples of one run |
| `causticsea`, `faraday` | measured wavelength | τ_int across rows |
| `darkroom` | dark-window hits | interleaved ray groups, where the tracer allows it |

Tabs that already printed an error bar (`lozenge`, `growdomain`, the `rotor` ladder) now print it through
`compare()` with their own methods and deviations.

Where no honest error bar is cheap in the browser, the comparison is sampled with a pending reason:
`anderson` and `aubry` (one disorder realization or start vector, relaxation not converged), `stealth` (one
configuration), `tonertu` (one snapshot, three to six box sizes), `spinice` (one snapshot), `lens` for its
seeded halo sources, the single IDLA draw in `rotor`, and the `causticsea` η = 0 control, which is asserted,
not computed.

## References corrected in this change

| Tab | What was printed | Now |
|---|---|---|
| `photon` | deflection at b = 50M against 4M/b | against the second-order weak-field value 4M/b + (15π/4)(M/b)², a ratio of about 1.059 |
| `meissner` | B(0)/B₀ against a three-term truncation of 1/I₀(R/λ) | against 1/I₀(R/λ) summed to convergence; the relaxation itself is still not converged and says so |
| `kakeya` | occupied fraction against π/4 | against the disk swept by one needle of the plate's actual length |
| `exceptional` | \|λ₊ − λ₋\| printed as 0 in the broken-PT phase | 2√\|κ² − γ²\| in both phases |
| `spinice` | monopole density in percent beside a Boltzmann factor as a fraction | same units, and the factor is labeled a vertex weight, not a density prediction |
| `aubry` | "dual 2" | removed: the implemented potential 2λ cos(2πβn) with unit hopping is self-dual at λ = 1 |
| `thouless` | "ΔP 1 or 0 · Chern" | the cycle is shown as a setting; pumping is not measured |
| `lens` | "Poisson solved", printed unconditionally | the number of relaxation sweeps, residual not computed |
| `life` | "mass conserved" when no measurement exists | "mass not measured on this device" |
| `klein`, `veselago`, `loschmidt`, `track`, `skin` | a reference printed outside the case where it holds | the reference only where it applies (normal incidence; n = −1; flip at T/2; η ≈ 0; the clean open chain) |
| `airy`, `knotlight`, `hasimoto` (speed), `gerstner`, `peakon` (single-peakon control), `crapper`, `cloak`, `ssh`, `kitaev`, `purcell`, `potts` (mean sides), the vortex-lock placements | agreement presented as a check | labeled true by construction |

## Found and not fixed here

These are recorded so they are not rediscovered. Each changes a plate, a verdict or a physics claim and
needs its own review against the primary source before it is touched.

- `stealth`: S(k) is normalized by N² instead of N, so an untouched Poisson gas already reads under the
  "stealthy" threshold and the verdict cannot tell the two apart.
- `aubry`: with the self-dual point at λ = 1, the λ > 2 localization verdict and the equation string are off
  by a factor of 2, and the periodic ring wraps a potential that is not periodic.
- `thouless`: the "trivial" loop still encircles the Rice–Mele degeneracy, so its Chern number is ±1, and the
  drawn density is a translated Gaussian, not a computed Wannier center.
- `faraday`: the printed linear estimate ignores g, the 0.35 κ factor and the subharmonic ω/2 of the
  integrated equation; the first tongue of the code's own equation is g k² + 0.35 κ k⁴ = (ω/2)².
- `ssh`, `kitaev`, `skin`: no Hamiltonian is diagonalized; the end modes are drawn from the parameter test or
  an assumed profile, and `skin`'s Gram–Schmidt basis is orthonormal where the skin effect needs the
  non-orthogonal right eigenvectors.
- `klein`: away from normal incidence the transmission is an ad hoc formula, not the Katsnelson–Novoselov–Geim
  result.
- `kp`: with Vandermonde-squared amplitudes every Plücker coordinate is positive (Kodama's T-type for
  Gr(2,4)), so the [1, M] reference and the O-type label are questionable.
- `arago`: the Fresnel quadrature is aliased at the default parameters and the aperture is cut off, so the
  on-axis ratio reflects discretization; the printed Fresnel number is about 200 where the hint says order 1.
- `meissner`, `anderson`, `aubry`: the relaxations stop far from convergence at the default step counts.
- `potts`: the side count uses 4-neighbour bonds while the energy uses 8, and cells that vanish in the fit
  window are dropped.
- `lens`: the ring source has a finite radius, the point mass has an enclosed mass that grows like ln r, and
  the deflection factor of 8 is arbitrary, so the measured radius is not an Einstein-radius test.
- `darkroom`: the "tokarsky" room is a hand-drawn 16-gon, not Tokarsky's construction.
- `ssh`: the intra-cell hopping is stored under the key `v`, which the engine's `sanitize` overwrites with the
  recipe version after the schema clamp, so every SSH plate has run with v = 2 whatever the slider said.
- `skyrmion`: two seeded-texture references are wrong. The Berg–Lüscher charge of the seeded crystal is −6, not
  about 7, and of the seeded bimeron −2, not about 0; a skyrmion seed with several cores still prints ±1.
- `timecrystal`: the period-doubled, prethermal and melted verdicts use thresholds on |m₂| alone and ignore the
  new error bar; the prethermal preset reads m₂ 0.49 ± 0.17 and is labeled period-doubled.
- `veselago`: the "many" preset renders nearly flat (ink 0.0039 against the 0.004 floor) before and after this change.

## Disagreements the error bars exposed

With honest uncertainties several tabs now print a clear miss. These are reported, not rounded away:

| Tab | What prints | Likely reason, where known |
|---|---|---|
| `causticsea` | measured wavelength 14 to 23σ above the preferred Swift–Hohenberg wavelength on every preset | not diagnosed |
| `darkroom` | the "tokarsky" room's dark window lit, 7 to 33σ above 0 | the room is not Tokarsky's construction (above) |
| `faraday` | wavelength 12 to 17σ from the printed linear estimate (Noise presets), 2 to 4 times off on the others | the estimate formula (above) |
| `kpz` | ballistic Rings and Wide presets 4.6 to 5.3σ below β = 1/3 | the slow crossover the tab's hint already documents |
| `rmt` | GOE spacing spread 7σ above the Wigner surmise; the low end of the β sweep 9σ below the Poisson value | the surmise is the 2×2 approximation, and unfolding over ±12 levels biases the spread; open |
| `potts` | mean side count 6.13 on the default plate and up to 6.86 mid-run, against Euler's 6, which should hold by construction | the side count uses 4-neighbour bonds while the energy uses 8, and lattice four-fold vertices and repeated contacts break the trivalent assumption |
| `meissner` | B(0)/B₀ between 0.41 and 0.97 on every preset against a steady state between 1.1e-4 and 0.63 | the relaxation stops far from convergence, so the "expelled" verdict never fires |
| `rotor` | random-to-rotor rim ratio 8σ above equal rims; the random rim's growth exponent 9σ below √n | expected: the rotor aggregate is far rounder than IDLA; the √n line is a foil, not a prediction |
| `photon` | deflection at b = 50M reads 1.0635 against the second-order 1.0589 | the third-order term (128/3)(M/b)³ ≈ +0.0043 and the fourth ≈ +0.0003 account for it |

- `tennis`, `swarm`, `devil`, `gyroid`, `hyperbolic`, `apollonian`: verdict labels from thresholds or parameters,
  not measured comparisons; left as labels.

## Limits of the gate

The lint rule reads module source line by line. It recognizes the phrasings this codebase has used and a
value followed by "· 0" or a hand-typed ± or σ; a new phrasing can pass it. `compare()` enforces the basis at
run time, and `node tools/check.js` renders every preset, so a malformed call fails there. Neither judges
whether an error bar is adequate: the method printed on hover is the claim, and it is for review.
