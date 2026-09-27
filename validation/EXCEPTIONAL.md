# Exceptional point: the 2x2 dimer and its Riemann sheet

The `exceptional` tab draws one eigenvalue branch of

\[
H=\begin{pmatrix} i\gamma & \kappa \\ \kappa & -i\gamma \end{pmatrix},
\qquad \lambda=\pm\sqrt{\kappa^2-\gamma^2},
\]

with an exceptional point at \(\gamma=\kappa\), where the eigenvalues meet and the eigenvectors become one line. The sheet paints \(\operatorname{Re}\lambda+0.6\operatorname{Im}\lambda\) over the \((\kappa,\gamma)\) plane. The status line reports the dimer splitting \(|\lambda_+-\lambda_-|=2\sqrt{|\kappa^2-\gamma^2|}\) and \(\gamma/\kappa\).

This note records an independent Float64 check of that 2x2, a comparison with every sheet pixel the module stores, and the real export path. It does not claim a laboratory exceptional point, a many-body PT system, or the Bender-Boettcher continuum Hamiltonian.

Status in `validation/techniques.json` is **validated within stated limits** for the domain below. Reviewed 2026-09-27.

## Model

The matrix is traceless. Its determinant is \(\gamma^2-\kappa^2\), so the characteristic equation is \(\lambda^2=\kappa^2-\gamma^2\). The plate branch is the principal square root: nonnegative and real when \(\kappa\ge\gamma\), nonnegative and imaginary when \(\gamma>\kappa\). The other eigenvalue is its negative.

On the sheet the coordinates are independent of the dimer sliders:

\[
\kappa=0.15+2.1\frac{x}{W-1},\qquad \gamma=2.2\frac{y}{H-1}.
\]

So \(\kappa\) runs through \([0.15, 2.25]\) and \(\gamma\) through \([0, 2.2]\). The stored word is \(\operatorname{Re}\lambda+0.6\operatorname{Im}\lambda\).

The modes view is not this calculation. It draws two fixed Gaussians and mixes them with the gap. Those pixels are not eigenvectors. The gap view plots the real splitting against \(\gamma\) and is outside the pixel comparison.

## Independent benchmark

Run `node tools/exceptional-science.js --write`. The artifact
[results/exceptional-science.json](results/exceptional-science.json) stores the sheet errors, the eigenpairs, and the failure controls.

The reference is a 2x2 complex eigensolver written for this check: eigenvalues from the quadratic formula on \(\operatorname{tr} H\) and \(\det H\), eigenvectors from one nonzero row of \(H-\lambda I\). It is not a copy of `ev()` in `src/modules/exceptional.js`. The same solver supplies the sheet value \(\operatorname{Re}\lambda+0.6\operatorname{Im}\lambda\).

1. **Sheet pixels.** Five runs, 104,000 pixels, kind `sheet`. Maximum absolute error \(1.192\times 10^{-7}\), which is Float32 rounding of a value near 2.22 (tolerance \(10^{-6}\)). No nonfinite word. Counts of exact-PT and broken-PT pixels are in the artifact. No sample lands on \(\gamma=\kappa\) exactly; the exact exceptional point is the dimer and the eigenpair checks below.
2. **Dimer splitting.** The module metric matches \(|\lambda_+-\lambda_-|\) from the solver with error 0 on every fixture.

| Fixture | \(\gamma\) | \(\kappa\) | Phase | \(\lvert\lambda_+-\lambda_-\rvert\) | \(\gamma/\kappa\) | Sheet max error |
|---|---|---|---|---|---|---|
| below | 0.4 | 1.2 | exact PT | 2.262741699796952 | 0.4/1.2 | \(1.192\times 10^{-7}\) |
| ep | 1 | 1 | exceptional | 0 | 1 | \(1.192\times 10^{-7}\) |
| above | 1.6 | 0.8 | broken PT | 2.771281292110204 | 2 | \(1.186\times 10^{-7}\) |
| axis | 0 | 0.2 | exact PT | 0.4 | 0 | \(1.191\times 10^{-7}\) |
| top | 2.2 | 2 | broken PT | 1.8330302779823369 | 1.1 | \(1.190\times 10^{-7}\) |

The 160x160 sheets for `below` and `ep` are the same 25,600 Float32 words. The metrics are not: 2.2627 against 0. The plane does not read the dimer sliders.

3. **Spectrum lattice.** 43 values of \(\kappa\) from 0.15 to 2.25 and 45 values of \(\gamma\) from 0 to 2.2 (1,935 matrices). Eigenvalues agree with the principal square root of \(-\det H\) to 0, which on this traceless matrix is bitwise agreement of the quadratic formula with that square root. The matrix-vector residual \(\lVert Hv-\lambda v\rVert\) is at most \(5.55\times 10^{-16}\) (tolerance \(10^{-12}\)).
4. **Eigenvectors.** Overlap is \(|v_1^\dagger v_2|/(|v_1||v_2|)\).

| Point | Overlap |
|---|---|
| \(\gamma=\kappa=1\), and the same at \(\kappa\in\{0.15,0.5,1.6,2.2\}\) | 0.9999999999999998 |
| \(\gamma=0\), \(\kappa=1.5\) | 0 |
| \(\gamma=0.2\), \(\kappa=1.5\) | 0.13333333333333333 |
| \(\gamma=0.999\), \(\kappa=1\) | 0.9989999999999999 |
| \(\gamma=1.001\), \(\kappa=1\) | 0.9990009990009989 |

At \(\gamma=\kappa\) the matrix \([[i\kappa,\kappa],[\kappa,-i\kappa]]\) is not zero, its determinant is 0, and its square is 0. Rank 1 means geometric multiplicity 1: one eigenvector, not a diagonalizable double zero. The two computed eigenvectors lie on that line (overlap greater than \(1-10^{-9}\)).

Off the exceptional point the overlap drops. It is already under 0.2 at \(\gamma=0.2\), \(\kappa=1.5\), and it is 0 at \(\gamma=0\). Just above the point the eigenvalues are a complex conjugate pair and the eigenvectors are close but not the same vector. Coalescence is the point, not the whole broken phase.

## Failure controls

Both controls use the predicate the real matrix passes, and the run exits non-zero if the bad case still passes.

- **Sign error in the sheet.** The source line `const d = k * k - g * g` is changed to `const d = k * k + g * g`, which removes the exceptional point. On the 160x160 sheet the real code passes with maximum error \(1.192\times 10^{-7}\). The mutated code fails the same comparison with maximum error 3.042 (worst pixel \(\kappa\approx 2.197\), \(\gamma=2.2\): stored 3.109 against the independent branch 0.0669). The acceptance line is \(10^{-6}\), and the control is required to miss by more than 0.1.
- **Flipped (2,2) entry.** \([[i\gamma,\kappa],[\kappa,+i\gamma]]\) has eigenvalues \(i\gamma\pm\kappa\), not \(\pm\sqrt{\kappa^2-\gamma^2}\). On the same 1,935-point lattice the eigenvalue error is at most \(5.55\times 10^{-16}\) and the eigenvector overlap is at most \(1.55\times 10^{-15}\). At \(\gamma=\kappa=1\) the eigenvalues are \(1+i\) and \(-1+i\), the separation is 2, and the overlap is 0. The coalescence predicate (overlap greater than \(1-10^{-9}\)) passes for the PT matrix and fails for the flipped matrix. At \(\kappa=0.15\) the flipped separation is 0.3, still bounded away from 0.

## Print path

Run `node tools/exceptional-print-state.js --write` after `node tools/build.js`. The artifact is
[results/exceptional-print-state.json](results/exceptional-print-state.json). Playwright loads `dist/studio.html`, injects `auditSnapshot` and `auditMutate` into the module, and calls `exportPNG` at a longest edge of 2400 pixels (8 in at 300 ppi).

| Fixture | Sheet | Field | PNG | Splitting | \(\gamma/\kappa\) | Changed words | Luminance spread |
|---|---|---|---|---|---|---|---|
| ep | 1:1, \(\gamma=\kappa=1\) | 160x160 | 2400x2400 (152,387 bytes) | 0 | 1 | 0 | 230.4/255 |
| broken | 4:5, \(\gamma=1.6\), \(\kappa=0.8\) | 160x200 | 1920x2400 (148,102 bytes) | 2.771281292110204 | 2 | 0 | 230.4/255 |

Regenerate replays the same words. A width one pixel too small is rejected. After a good export, adding 1 to `field[0]` and to the splitting changes one Float32 word and the metric, and that snapshot is rejected by the same acceptance predicate.

## Domain

- **Parameters.** Sheet \(\kappa\in[0.15,2.25]\), \(\gamma\in[0,2.2]\), grids 160x160, 96x120, 224x126, and 128x102. Dimer \((\gamma,\kappa)\) as in the table. Eigenvector lattice 43 by 45 on those ranges, plus exact \(\gamma=\kappa\) at the five couplings above. Print: the ep and broken sheet fixtures only.
- **Conditions.** Static dimer, no time step. Sheet coordinates come from the pixel, not from the sliders. Branch as above. Print is nearest-neighbor scaling of that sheet.
- **Resolution.** 104,000 Float32 words against the 2x2 branch, tolerance \(10^{-6}\), measured maximum \(1.192\times 10^{-7}\). Eigenvalue residual tolerance \(10^{-12}\), measured maximum \(5.55\times 10^{-16}\). Exports 2400x2400 and 1920x2400.
- **Precision.** Float64 eigenpairs, Float32 field, RGBA8 PNG. No sampling error.

## Limitations

Finite 2x2 only. The modes picture is a schematic of two Gaussians, and this review does not treat its pixels as eigenvectors. The gap plot is not compared pixel by pixel. There is no continuum PT Hamiltonian, no many-body spectrum, and no laboratory exceptional point. Print evidence is state preservation and declared dimensions, not calibrated color. Grids and aspects outside the table are outside the domain.
