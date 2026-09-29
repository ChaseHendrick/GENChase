# Aubry-André: the self-dual point of the potential the plate uses

The `aubry` tab draws a golden-ratio chain. The hopping is 1 and the potential is
`2 * lambda * cos(2 * pi * beta * n)`, with `beta = (sqrt(5) - 1) / 2`. For that
normalization the almost Mathieu operator is self-dual at λ = 1: localized for λ > 1,
extended for λ < 1, critical at λ = 1. The inverse localization length on the
spectrum is `log(λ)` for λ > 1 and 0 for λ < 1.

The other convention, potential `λ cos` with unit hopping, is critical at 2. It is
the same model only if the number is doubled. The catalog, the hints and the
critical preset used to state that convention while the code used this one. They
now say λ = 1. The critical preset sets λ to 1. `DEFAULTS.lambda` stays 2.4, which
is still on the localized side of λ = 1, so an unnamed recipe reprints the same
field. A hash that already stores `lambda: 2` keeps that value because the hash
names it. The potential formula and the fixed-step relaxation were not changed.
The preset that was labelled "Near dual" at λ = 2.15 is now labelled "Above dual";
its value is still 2.15.

Run:

```sh
node tools/aubry-science.js --write
node tools/build.js
node tools/aubry-print-state.js --write
```

The numerical results are in [results/aubry-science.json](results/aubry-science.json).
The print results are in [results/aubry-print-state.json](results/aubry-print-state.json).
The record is the `aubry` entry of [techniques.json](techniques.json).
Status: **unvalidated**. The new finite-chain audit executes the actual module and
verifies its finite Euler iteration, but all 36 fixtures fail the declared
converged-ground-state criteria. The transfer-matrix evidence below remains a
separate infinite-line calculation. The λ = 1 label matches the potential
normalization; it does not establish convergence of the finite periodic plate.

## What is measured

The Lyapunov exponent is the growth rate of the transfer matrix

```
[psi(n+1)]   [E - V_n,  -1] [psi(n)  ]
[psi(n)  ] = [1,         0] [psi(n-1)]
```

with `V_n = 2 λ cos(2 π β n)`. There is no boundary condition: the product runs
along the infinite line at phase 0. Each step is QR-factorized and the exponent is
`(1/N) sum log(σ)`, where `σ` is the expanding singular value. Renormalizing every
step is what keeps the product from overflowing; the un-normalized sum of logs is a
failure control and does not pass.

Energies in the spectrum of this operator have exponent `max(log|λ|, 0)`. The runs
below use E = 0, which tracks that value to the tolerance, and a spread of
eigenvalues of an open chain.

Diagonalization is a separate Float64 Jacobi solve of the open chain (no corner
hopping) at N = 64. It is not the transfer matrix, so a wrong singular-value
normalization cannot satisfy both checks. The rational control uses a periodic
chain of length 96.

The transfer-matrix harness does not call the tab's relaxation. `tools/science-harness.js` is not called
either: its stand-in random source has no `.gauss`, and the module needs one.
The plate remains a fixed number of imaginary-time steps from one Gaussian start.
That picture's inverse participation ratio is not this exponent.

## Measured exponents

Transfer length N, E = 0, golden β, potential factor 2. Tolerance for λ > 1:
`|γ - log(λ)| < 0.012` at both lengths, and the N = 2048 absolute error is smaller
than the N = 256 error. Elapsed time on the run that wrote the results was 171 ms.

| λ | log(λ) | γ (N=256) | γ (N=2048) | abs error 256 | abs error 2048 |
| --- | --- | --- | --- | --- | --- |
| 0.3 | -1.2039728 | 0.00122956 | -0.00000023 | (must be near 0, not log) | < 1e-6 |
| 0.6 | -0.51082562 | 0.00314107 | -0.00000471 | (must be near 0, not log) | < 1e-5 |
| 1 | 0 | 0.01703858 | 0.00260608 | reported, not matched to 0 | falls with N |
| 1.5 | 0.40546511 | 0.4132725 | 0.4056209 | 0.00780739 | 0.0001558 |
| 2 | 0.69314718 | 0.70098338 | 0.69324251 | 0.0078362 | 0.00009533 |
| 3 | 1.09861229 | 1.10627133 | 1.09867465 | 0.00765904 | 0.00006236 |

Below the transition the exponent is consistent with 0 and falls as N grows. It is
much smaller than `|log(λ)|`. At λ = 1 the exponent stays near 0, falls from 0.017
at N = 256 to 0.0026 at N = 2048, and sits well below every λ > 1 measurement. It
is not asserted to equal 0 at these lengths: the approach is slow, and forcing a
match would be false.

## Eigenstates

Open chain, N = 64. Jacobi residual below 1e-10. For λ in {1.5, 2, 3}, the
transfer-matrix exponent at the sampled eigenvalues (indices 0, 16, 32, 48, 63 and
the eigenvalue nearest 0) is within 0.02 of `log(λ)`. The largest absolute error in
that set is 0.0147, at λ = 3 near zero energy.

The mid-spectrum state (eigenvalue nearest 0) has an envelope slope from the binned
maxima of `|ψ|`, independent of the transfer matrix:

| λ | energy | transfer γ | envelope | envelope - γ | IPR |
| --- | --- | --- | --- | --- | --- |
| 0.3 | -0.02985 | 0.00011 | 0.00025 | 0.00014 | 0.0226 |
| 0.6 | -0.01281 | 0.00035 | 0.00131 | 0.00096 | 0.0294 |
| 1 | -0.00006 | 0.00242 | 0.0573 | 0.0548 | 0.0651 |
| 1.5 | 0.00716 | 0.39627 | 0.43986 | 0.0436 | 0.507 |
| 2 | 0.01293 | 0.67942 | 0.72327 | 0.0438 | 0.658 |
| 3 | 0.02406 | 1.08394 | 1.10857 | 0.0246 | 0.808 |

For λ > 1 the envelope agrees with the transfer-matrix exponent within 0.06. For
λ < 1 both are flat and the IPR is O(1/N). At λ = 1 the IPR sits between the
extended and localized values; the envelope is not forced to 0.

## Failure controls

The same predicate `|γ - log(λ)| < 0.012` at transfer length 2048.

Rational β = 1/3. The transition is destroyed: a periodic chain of length 96 (a
multiple of the period) has its eigenvalue nearest zero inside a Bloch band, and
the exponent there is about 0.004, not `log(λ)`. E = 0 lies in a gap for this
commensurate potential; its exponent is positive and still does not match `log(λ)`.

| λ | band energy | γ band (2048) | |γ - log(λ)| band | γ at E=0 | |γ - log(λ)| at E=0 | passes 0.012? |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | -1 | 0.00423081 | 0.68891637 | 0.92310527 | 0.22995809 | no, both |
| 3 | -2 | 0.00442881 | 1.09418347 | 1.32970982 | 0.23109753 | no, both |

The in-band states are extended (IPR = 1/64 = 0.015625 on that chain). The
irrational cases pass the tolerance these rows fail.

Half amplitude. Potential `λ cos` instead of `2λ cos` is the convention whose
critical value is 2. At E = 0 and golden β, length 2048:

| λ | factor | γ | log(λ) | |γ - log(λ)| | passes 0.012? |
| --- | --- | --- | --- | --- | --- |
| 2 | 1 | 0.00260608 | 0.69314718 | 0.6905411 | no |
| 3 | 1 | 0.4056209 | 1.09861229 | 0.69299138 | no |

At λ = 2 the half-amplitude operator is critical, so the exponent is near 0. At
λ = 3 it tracks `log(λ/2) = log(1.5)`, not `log(3)`. Forgetting to divide the
sum of logs by N also fails the same predicate.

## Print

`tools/aubry-print-state.js` exports the default recipe (grid 128, aspect 4:5,
λ = 2.4, 140 relax steps) at longest edge 2400, which is 1920 by 2400. It checks
that the Float32 field words, the stored IPR, λ, the cell counts and the settings
are unchanged by `exportPNG`, that a second regenerate replays the field, and that
a wrong width and a deliberate post-export mutation are rejected. It does not check
the IPR against a formula.

## What this does not claim

The status line still prints λ as a setting and the plate IPR against a uniform
`1/N`, with the relaxation marked not converged. That comparison was not audited
here and is not evidence for the plate. No slider position outside the table, no
other phase, and no ground-state convergence of the relaxation is claimed.


## Actual plate relaxation audit, 2026-09-29

```sh
node tools/aubry-relaxation.js --write
node tools/aubry-print-state.js --write
```

The [relaxation artifact](results/aubry-relaxation.json) executes the maintained module's `compute` function, using the real engine RNG and Gaussian start. Instrumentation only exposes its final Float64 vector and Float32 field; it does not replace the numerical update. Source, harness, RNG and independent reference hashes are recorded.

The plate evolves A = 2I − adjacency + diag(2λ cos(2πβn)) on a periodic ring, β = (√5−1)/2. An independently assembled dense matrix is diagonalized by Jacobi rotations from `tools/lib/ssh-reference.js`. All permitted grids are even, so multiplying alternate sites by −1 changes the hopping sign to the catalog's positive convention without changing probability densities; the 2I term only shifts energy. The finite periodic seam is part of this oracle, unlike the open-line transfer calculation above.

The exact free-ring ground energy 0 and uniform density 1/N anchor the reference. The worst reference ground-vector residual is 2.70e-14. Separately, the spectral formula (I − dt A)^steps applied to the initial vector reproduces the module's final vector within L2 error 3.68e-14 on all fixtures, below a 1e-10 bound. This is independent verification of the fixed-step iteration, not evidence that the iteration has converged.

There are nine recipes: default, Localized, Extended, Critical, Deep, Above dual, Almost free, a λ = 0 ring at grid 96, and the default at the maximum 300 Relax steps. Each uses four explicit seeds: `aubry-relaxation/0`, `aubry-relaxation/1`, `aubry-relaxation/2`, and `aubry-print-state/default`. Exact parameters and measurements appear in the JSON. These are reproducible fixtures, not an estimated population confidence interval.

Ground-state acceptance was fixed before the run: eigenvector residual ≤ 1e-6, absolute ground-energy error ≤ 1e-6 and L1 probability-density error ≤ 1e-3. **Zero of 36 fixtures pass.** For the first three seeds at the default λ = 2.4, grid 128 and 140 steps, energy excess is 0.162 to 0.234 and residual is 0.238 to 0.285. Even 300 steps leave residual 0.112 to 0.143. The default densities have L1 error 1.90 to 1.98 against the true finite-ring ground density.

The exact reference ground vector passes the identical predicate, whereas shifting it one site fails. Flipping the actual module's hopping sign gives L2 error 0.474 against spectral propagation and fails its 1e-10 criterion. Normalization, IPR reconstruction and the display envelope are also checked, but those are regression diagnostics rather than independent ground-state tests. A successful command means the audit ran and its controls worked; `groundStatePassed: false` records the scientific miss.

The actual default browser export was rerun with seed `aubry-print-state/default` on the same source. Its IPR is 0.16929971736639468, agreeing with the Node subject at floating-point precision. It exports 1920×2400 pixels, preserves every field word and scalar, and rejects wrong dimensions and deliberate state mutation. That same seed's residual is 0.27173, energy excess 0.23586 and density L1 error 1.91755. The print faithfully preserves an unconverged state; it does not make that state a ground eigenvector.

The module credit and blurb now call the picture a fixed-step relaxation, matching the existing status-line warning. No solver, preset, seed or rendering behavior changed. A converged ground-state implementation, broader finite-size analysis and an independently verified print color mapping remain future work. No status promotion is made.
