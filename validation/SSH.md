# Su–Schrieffer–Heeger edges: bounded independent numerical evidence

The `ssh` tab diagonalizes a finite dimerized tight-binding chain, draws every
eigenmode, and reports the end weight and energy of the mid-gap pair. This note
records an **independent Float64** numerical check of the single-particle SSH
Hamiltonian, and a comparison of the studio's own solver in `src/modules/ssh.js`
with it. It does **not** promote the technique status or exercise the print path.

Status in `validation/techniques.json` remains **unvalidated** until a print
harness and review exist.

## Model

For an even number of sites \(N=2M\), alternating sublattices \(A,B\),

\[
H = v\sum_{j=0}^{M-1}\big(|2j\rangle\langle 2j+1|+\mathrm{h.c.}\big)
  + w\sum_{j=0}^{M-2}\big(|2j+1\rangle\langle 2j+2|+\mathrm{h.c.}\big)
\]

with an optional periodic closing hop \(w\) between the last \(B\) and first \(A\).
The bulk Bloch spectrum is \(E(k)=\pm\sqrt{v^2+w^2+2vw\cos k}\), so the bulk gap is
\(2|w-v|\). Open boundaries with \(w>v\) host a mid-gap pair exponentially
localized on the ends; \(v>w\) does not.

## Independent benchmark

Run `node tools/ssh-science.js --write`. The artifact
[results/ssh-science.json](results/ssh-science.json) stores Float64 Jacobi
spectra, analytic comparisons, topology cases and deliberate failure controls.

1. **Periodic spectrum**: dense eigenvalues match the analytic Bloch set to
   maximum absolute error below \(10^{-10}\) on \(N\in\{24,32,48\}\).
2. **Open nontrivial** (\(w>v\)): mid-gap \(|E|<10^{-8}\), mean 10%-window end
   weight \(>0.55\), and the analytic left zero mode
   \(\psi_{2j}\propto(-v/w)^j\) (B sites zero) has subspace overlap \(>0.98\)
   with the mid-gap pair.
3. **Open trivial** (\(v>w\)): no near-zero pair (\(|E|>0.1\)), end weight
   \(<0.35\), gap remains finite.
4. **Open vs periodic** at fixed topo hoppings: edge weight collapses on the ring.

## Failure controls (must separate first)

- Equal hoppings \(v=w\): periodic gap closes; open near-zero states are extended
  (end weight \(\lt 0.35\)), not topological edge modes.
- Trivial dimerization treated as topological: end weight stays bulk-like.
- Scrambled bond pattern (each bond independently \(v\) or \(w\)) and globally
  reversed dimerization destroy the ordered edge-mode signature.

## The studio plate

`src/modules/ssh.js` builds the same Hamiltonian as the model above and
diagonalizes it with Householder reduction and the implicit QL iteration
(EISPACK `tred2`/`tql2`, as in the public-domain JAMA library). An open chain is
already tridiagonal and skips the reduction. The solver uses only `+ − × ÷` and
`Math.sqrt`, which IEEE double rounds identically on every engine.

- **Rows.** One row per eigenmode, highest energy at the top, each drawn as
  \(|\psi_n(x)|^2\) scaled to its own peak. By chiral symmetry the \(\pm E\) rows
  match, so the plate is symmetric top to bottom, and the mid-gap pair sits in
  the middle rows. When the sheet has more rows than modes, a mode takes two
  rows. When it has fewer, some modes are skipped, but every grid and sheet keeps
  at least one row of the mid-gap pair. Its two rows are chiral partners with
  identical \(|\psi|^2\), so a single row shows the pair completely.
- **Degenerate pairs.** Where two eigenvalues agree to \(10^{-9}(v+w)\), the
  solver's basis is arbitrary. This happens for the ring's \(\pm k\) pairs, and
  for an open chain's zero modes when their splitting is below rounding. Such a
  pair is rotated into eigenvectors of the mirror \(i\to n-1-i\), a symmetry of
  both chains. The mid-gap pair then shows both ends, as its resolved
  eigenvectors \((L\pm R)/\sqrt2\) do, and the picture does not depend on how the
  solver split the pair.
- **Measurement.** The status reports the mean end weight of the two states
  nearest zero energy, with 10% of the sites at each end: the definition used
  above. It also reports their energy against the bulk gap \(2|w-v|\).
  - The verdict reads **edge modes** when the end weight exceeds 0.5 and the pair
    sits within a quarter of the gap.
  - It reads **trivial** when \(w<v\) and the end weight is below 0.35.
  - Otherwise it prints the localization length \(1/\ln(w/v)\) against the
    chain's length.
- **Error bar.** Every number is deterministic, with no sampling error. The
  remaining error is rounding: eigenvalues agree with the Jacobi reference to
  about \(10^{-14}\) and end weights to \(10^{-9}\) or better. A mid-gap energy
  under \(10^{-13}\) is not resolved and is printed as a bound. The true
  splitting for the Topological preset is about \(10^{-23}\).

### Studio solver against the reference

`node tools/ssh-science.js` evaluates the module's own `spectrum`, `midGap` and
`verdict` from the maintained source. It checks them on every registered preset
at \(N=96\), and on Critical again at \(N=160\).
- Eigenvalues must agree within \(10^{-10}\).
- Residuals and orthonormality must be within \(10^{-12}\).
- \(|\psi|^2\), summed over degenerate groups (the part every basis agrees on),
  must agree within \(10^{-9}\).
- Every row must be mirror-symmetric within \(10^{-10}\).
- End weight and mid-gap \(|E|\) must match the reference.
- The verdict must be the expected one.

| Preset | \(v\) | \(w\) | Ends | End weight | Mid-gap \(\lvert E\rvert\) | Verdict |
|---|---|---|---|---|---|---|
| default | 0.45 | 1.15 | open | 0.9999 | below \(10^{-13}\) | edge modes |
| Topological | 0.40 | 1.20 | open | 1.0000 | below \(10^{-13}\) | edge modes |
| Trivial | 1.20 | 0.40 | open | 0.0161 | 0.801 | trivial |
| Periodic | 0.40 | 1.20 | ring | 0.1875 | 0.800 | ring |
| Deep edge | 0.20 | 1.40 | open | 1.0000 | below \(10^{-13}\) | edge modes |
| Critical | 0.90 | 0.95 | open | 0.4336 | \(7.4\times10^{-3}\) | crossover: ξ 18.5 of 48 cells |
| Log | 0.35 | 1.25 | open | 1.0000 | below \(10^{-13}\) | edge modes |
| Critical, \(N=160\) | 0.90 | 0.95 | open | 0.5803 | \(1.3\times10^{-3}\) | edge modes |

Critical is the finite-size case. Its localization length, 18.5 unit cells, is
comparable to the default chain of 48 cells. The two end modes overlap, split,
and keep only 0.43 of their weight on the ends. The winding \(\nu=1\) says they
should be there, and on a chain of 80 cells they are. The status prints the
disagreement and the reason rather than calling the default plate topological.

Failure controls for the comparison:
- The edge-mode presets with \(v\) and \(w\) swapped must read trivial. They
  measure end weights of 0.015 to 0.016.
- A reference chain terminated on the wrong bond must miss the studio
  eigenvalues. It misses by 0.80.
- The retired display heuristic must miss the reference densities. It misses
  by 0.89.

**Display solver (2026-09-24).** Before this date the plate was a heuristic
rather than an eigensolve. For an open chain with \(w>v+0.04\), every row was
the same analytic left zero mode. Otherwise every row was a sine profile that
depended on neither hopping. The status verdict followed from that branch by
construction. Pixels changed with the solver. Recipes are unchanged: no key,
default or preset moved.

**Recipe key (2026-09-24).** Until this date the intra hopping was keyed `v`. The
engine uses `v` for the recipe version and writes 2 over it after the schema
clamps. Every plate opened from a hash, a preset, Surprise or a reload therefore
ran at \(v=2\). Because \(w\le 1.6\), the old heuristic's edge branch never ran
there, and every preset drew the trivial picture whatever its controls said. Dragging the slider
did change the plate on screen, but its hash still recorded only `v: 2`. Reopened,
it drew the trivial picture. The key is now `vIntra`, and `node tools/lint.js` rejects a
control keyed `v`, `seed`, `palette`, `bg` or `id`.

A hash written before the rename never stored the intra hopping. The engine
skips `v` when it writes a recipe, and the hopping was never readable anyway.
Such a hash therefore reprints at the default \(v=0.45\) with its stored \(w\) and
boundary, and its pixels change. No `legacy` value is declared, for two reasons:
- The default did not move, and every SSH hash carries recipe version 2. SSH was
  added a day after version 2 existed, so no older SSH hash exists.
- Reproducing the old pixels would need a recipe version 3 and a legacy
  \(v\ge 1.56\). That would pin every old link to a picture its parameters never
  controlled.

## Limitations

Finite open/periodic chains only; no interactions, phonons, continuum limit,
thermodynamic-limit proof, or experimental polyacetylene claim. The studio
comparison covers the registered presets at \(N=96\) and Critical at \(N=160\).
Other grids, the plate's row mapping, per-row scaling and palette, and the print
path are not compared pixel by pixel. Print-state accuracy is not registered.
