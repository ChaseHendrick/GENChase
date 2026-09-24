# Su–Schrieffer–Heeger edges: bounded independent numerical evidence

The `ssh` tab visualizes a dimerized tight-binding chain and reports an end-weight
metric for mid-gap modes. This note records an **independent Float64** numerical
check of the single-particle SSH Hamiltonian. It does **not** promote the
technique status, certify the production visualization heuristic in
`src/modules/ssh.js`, or exercise the print path.

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

The plate in `src/modules/ssh.js` is a display heuristic, not an eigensolve, and
nothing above measures it.

- **Open chain with \(w>v+0.04\):** every row is the same analytic left zero mode
  \(\psi_{2j}\propto(v/w)^j\), so the plate is nearly black apart from a line at
  the left edge. The right zero mode is never drawn.
- **Otherwise:** every row is an open-chain sine profile that depends on neither
  \(v\) nor \(w\).
- **Status line:** the end weight and its "edge modes" or "trivial" verdict follow
  from that branch by construction. They are a regression readout, not a
  measurement of localization.

**Recipe key (2026-09-24).** Until this date the intra hopping was keyed `v`. The
engine uses `v` for the recipe version and writes 2 over it after the schema
clamps. Every plate opened from a hash, a preset, Surprise or a reload therefore
ran at \(v=2\). Because \(w\le 1.6\), the edge branch never ran there, and every
preset drew the trivial picture whatever its controls said. Dragging the slider
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
thermodynamic-limit proof, or experimental polyacetylene claim. The production
plate stacks approximate modes for display and is not the oracle for these
numbers. Print-state accuracy is not registered.
