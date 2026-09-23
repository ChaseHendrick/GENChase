# Su–Schrieffer–Heeger edges: bounded independent numerical evidence

The `ssh` tab diagonalizes a dimerized tight-binding chain and reports an end-weight
metric for its mid-gap modes. This note records an **independent Float64** numerical
check of the single-particle SSH Hamiltonian and, since 2026-09-23, a direct check of
the production solver and plate in `src/modules/ssh.js` against it.

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

## Limitations

Finite open/periodic chains only; no interactions, phonons, continuum limit,
thermodynamic-limit proof, or experimental polyacetylene claim.

## Production diagonalization (2026-09-23)

Before this date the production plate did not diagonalize anything. With open ends
and \(w > v + 0.04\) every row was the same analytic left zero mode on the even
sites, so the plate showed one mode repeated and no right edge, and the end weight,
averaged over the first six rows, was close to 1 by construction. Every other case
drew \(\sin(k(\lfloor i/2\rfloor+1))\) standing waves that ignored \(v\) and
\(w\), including on the ring. The credit text already described the plate as
\(|\psi_n(x)|\) of every eigenmode, which it was not.

`ssh.js` now builds \(H\) above (the closing \(w\) bond on a ring) and diagonalizes
it by Householder reduction and implicit-shift QL, a different algorithm from the
Jacobi rotations of the reference. Rows are eigenmodes in order of energy, stretched
over the plate or, when the plate has fewer rows than the chain has sites, the band
of modes centred on \(E=0\), so the mid-gap pair is always shown. Exactly
degenerate eigenvalues (every \(\pm k\) pair on a ring, the zero modes of a long
open chain; splitting below \(10^{-8}(|v|+|w|)\)) have no preferred eigenvector
basis. Inside such a cluster the rows are fixed by pivoted Gram–Schmidt on the sites:
each row is the normalized projection of the site with the most remaining weight, ties
going to the leftmost site. Any correct diagonalization gives the same rows. On a
topological chain this separates the zero-mode pair into a pure left-edge row and a
pure right-edge row; on a ring it gives standing waves anchored at site 0. The end weight is the mean share of the two modes
nearest zero on the outer tenth of the sites at each end, measured from those
eigenvectors, and the status line also prints that pair's \(|E|\). A low weight is
labelled bulk-like rather than trivial: the Critical preset (\(v=0.9\),
\(w=0.95\)) is topological but its localization length, about 37 sites, is too long
for a 96-site chain to concentrate the pair on the ends.

Run `node tools/ssh-production.js --write` for
[results/ssh-production.json](results/ssh-production.json). Twenty-one fixtures (the
six presets and the default at grid 96 on 4:5; topo, triv and ring at grids 64 and
160 on 1:1 and 16:9; balanced \(v=w\) open and periodic chains) compare the actual
module against the reference:

| quantity | acceptance | worst measured |
|---|---|---|
| eigenvalues | \(10^{-12}\) | \(9.5\times10^{-15}\) |
| residual \(\lVert H\psi-E\psi\rVert_\infty\) | \(10^{-12}\) | \(5.1\times10^{-15}\) |
| orthonormality | \(10^{-12}\) | \(6.9\times10^{-15}\) |
| every Float32 plate word | \(10^{-7}\) | \(3.6\times10^{-12}\) |
| end weight | \(10^{-9}\) | \(1.5\times10^{-13}\) |
| ring energies vs \(E(k)\) | \(10^{-12}\) | \(8.2\times10^{-15}\) |

Measured physics, read from the plates rather than imposed: Topological, Deep edge,
Log and the default have end weight above 0.999, mid-gap \(|E|\) below \(10^{-14}\) and more than 0.999
of the analytic left zero mode inside the mid-gap pair (Critical: end weight 0.43,
\(|E| = 7.4\times10^{-3}\), 0.996 of the zero mode); the trivial preset has end
weight 0.016 and \(|E| = 0.80\) \(= |w-v|\) up to finite size; both rings give exactly
the uniform share \(18/96 = 0.1875\), with mid-gap \(|E| = |w-v|\) (zero at \(v=w\)).
Swapping the two hoppings, giving the ring's closing bond the wrong hopping, and a 1%
change in \(v\) are each rejected (field errors 0.93 and \(2.7\times10^{-3}\); ring
energies off by 0.45).

Two further defects surfaced in the print review below and are fixed:

- **The intra-cell hopping never reached the module in the app.** The shell's
  `sanitize()` writes the recipe version into `state.v` after clamping the schema, and
  the ssh control for \(v\) was named `v`, so every preset, hash, reset and surprise ran
  at \(v = 2\). With \(w \le 1.6\) the studio could never show the topological phase,
  and recipes never carried the hopping. The control is now named `intra` (still labelled
  "Intra v"), and `node tools/lint.js` fails any module that names a control `v`,
  `seed`, `palette` or `bg`.
- **The Periodic preset printed a blank sheet.** On a ring every cluster-mean density
  is uniform, so the plate was a single value and painted as background. The pivoted
  basis above gives the ring its standing waves.

Every saved `ssh` recipe reprints differently after these changes, because the old
plates were not eigenmodes and ran at \(v = 2\). Defaults are unchanged.

## Print review (2026-09-23)

`node tools/ssh-print-state.js --write` drives the actual browser build
([results](results/ssh-print-state.json)) for the six presets at grid 96 on 4:5, Topological and
Periodic on 1:1 and 16:9, and Topological at grid 160. Each preset is chosen from the real
preset menu and must reach the module with its own hoppings, ends and view. The browser plate
must match the reference plate from `tools/lib/ssh-plate.js` word for word within \(10^{-7}\)
(measured at most \(3.6\times10^{-12}\)). exportPNG at 2400 px on the longest edge must have
exact dimensions and leave the field, end weight, mid-gap energy, buffer and settings
unchanged. Every print pixel must equal the buffer pixel of its cell (0 mismatches across all
fixtures, up to 5,760,000 pixels each), and the buffer must equal the palette ramp of the field.
The bundled module must print byte-identical PNGs. A PNG 1 px narrower, a post-export change to
the field and end weight, a reference with the hoppings swapped (open chains) and a reference
with the wrong closing bond (rings) are each rejected. On a ring, swapping \(v\) and \(w\) is a
one-site translation: energies and end weight are unchanged and the plate differs only in where
the standing waves are anchored (field error 0.14), so the closing-bond control (field error
0.55, energies off by 0.45) is the one that tests the ring's physics.
