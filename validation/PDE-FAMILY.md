# PDE family: bounded numerical evidence

The five additional methods in `src/modules/pde.js` now have independent finite-grid numerical checks. This establishes a limited discretization claim. It does not establish continuum convergence, a phase diagram, experimentally accurate material parameters, or the accuracy of every image the controls can produce. Cahn–Hilliard retains its separate [earlier evidence](CAHN-HILLIARD.md).

## What changed

- Phase-field crystal (PFC) previously applied a five-point Laplacian first and nine-point Laplacians in its remaining passes. All three now use the same nine-point operator. Its timestep ceiling includes mobility and the monitored amplitude range.
- All six methods previously clipped evolving field values. Clipping could conceal a failed step and change conserved material. Values are no longer clipped. A sticky flag records any intermediate excursion outside the monitored amplitude range. A reduction visits every grid cell after each batch, then rejects the whole batch and restores its input field if a flag is set. The step count does not advance and a visible message explains the stop. This is a numerical safeguard, not proof that every excursion is physically impossible.
- KS height has no conservation law and can drift. A constant height of −9 is now preserved exactly instead of being clipped to −8. Its numerical-range guard is ±10,000; no mean subtraction or hidden gauge change is applied. The previous “rms” label actually used a clipped, sampled mean absolute height and has been removed.
- Ohta–Kawasaki's reaction uses the actual initialized Float32 field mean as its fixed reference. Previously it used the requested baseline composition even when a seed had a different mean. Noise-free evolution without a brush therefore retains the actual initialized mean, up to numerical error. A brush is an explicit external addition: the added zero mode subsequently relaxes toward the initial reference. The variable-mobility option is the implemented local face-flux variant; it is not the full nonlocal variable-mobility Ohta–Kawasaki dynamics.
- Chemical-potential display buffers are refreshed after initialization and after accepted or rejected batches. They previously described an earlier state.
- Unmeasured phase labels and unconditional claims about localized states, reverse Ostwald ripening and perpetual KS chaos have been removed. Noise controls identify additive site forcing where conservation matters. That forcing is not the conserved, fluctuation–dissipation-scaled thermal noise in the source papers.

These are scientific corrections to existing recipes. PFC fields change because the discrete operator is corrected; Swift timing can change because its ceiling now includes the nonlinear coefficients. Ohta's reference mean changes for seeds whose actual mean differs from the requested baseline. A recipe that previously relied on clipping can now stop with an explicit guard message. These changes do not reproduce the faulty historical trajectory.

## Operators and step bounds

Cells have unit spacing in both directions. Increasing the Grid control increases the domain and cell count; it is not a fixed-physical-domain continuum refinement. Periodic boundaries wrap, while no-flux uses clamped samples at each operator application.

For the five-point Laplacian, write its Fourier symbol as −q with 0 ≤ q ≤ 8. The nine-point operator is

$$L_9 u = \frac{4\sum_{\rm axial}u+\sum_{\rm diagonal}u-20u}{6}.$$

Its symbol has

$$q=\frac{20-8(\cos k_x+\cos k_y)-4\cos k_x\cos k_y}{6},\qquad 0\le q\le16/3.$$

PFC uses $\mu=[r+(k_0^2+L_9)^2]\psi+\psi^3$ and $\psi_t=M L_9\mu$. Linearizing about a uniform $\bar\psi$ gives the decay rate

$$d(q)=M q\,[r+(k_0^2-q)^2+3\bar\psi^2].$$

With $Q=16/3$ and monitored $A=2.8$, the implemented bound is

$$\Delta t\le\frac{1.6}{M Q\{\max(0,r)+\max[k_0^4,(Q-k_0^2)^2]+3A^2\}}.$$

The 1.6 numerator is 80% of the forward-Euler negative-real-axis limit. It bounds the homogeneous linearized decay rate over the monitored envelope. It does not prove global nonlinear stability. At $M=2,r=0.2,k_0=0.45$ the ceiling is approximately 0.0029973; the old upper limit was 0.08 regardless of mobility.

For Swift–Hohenberg, the local derivative is $r+2gu-3bu^2$. With $A=4$, the ceiling bounds negative frozen-state eigenvalues using

$$\Delta t\le\frac{1.6}{\max[k_0^4,(8-k_0^2)^2]-r+2|g|A+3bA^2}.$$

The existing Cahn/Ohta and KS linear estimates remain conditional. Active Model B+ additionally retains a heuristic restriction in the activity control; this is explicitly not a nonlinear stability theorem. The monitored amplitudes are 1.7 for Cahn/Ohta/AMB, 4 for Swift and 2.8 for PFC. A seed or brush outside the monitored range is reported. Initial seeds can fail without any prior valid state to restore; brushes retain the previous field.

The guard reduction reads small byte flags rather than the entire Float32 field. Flags persist at their grid sites through every intermediate step in a batch, so an overshoot followed by a return is still detected. A rejected batch restores the field and refreshes its chemical potential; scratch targets may contain rejected calculations. Export must preserve those targets too, and the state test checks this separately.

## Reproducing the checks

Use the Playwright setup in [BUILDING.md](../BUILDING.md), then:

```sh
node tools/build.js
node tools/pde-family-science.js --write
node tools/pde-family-state.js --write
node tools/pde-science.js
node tools/pde-convergence.js
node tools/pde-stability.js
node tools/pde-print-state.js
```

`pde-family-science.js` reads and executes the actual maintained shader strings. Its independent CPU reference builds Float64 field, Laplacian, chemical-potential and flux arrays. It does not obtain reference values by reusing GLSL. Results are saved in [pde-family-science.json](results/pde-family-science.json):

| Check | Domain | Acceptance |
|---|---|---|
| Nonlinear Euler update versus independent Float64 stencil | 16×12, 24 steps, dt=0.003, periodic and no-flux; both Ohta mobilities | Maximum field error <3×10⁻⁶ |
| Noise-free conserved mean | PFC, Ohta, AMB in those fixtures | Absolute mean drift <10⁻⁷ |
| Fixed-time temporal refinement | Same initial field/grid, t=0.24, dt=0.012/0.006/0.003 | Euler convergence order 0.85–1.2 |
| Independent RK4 reference sensitivity | dt=0.00025 versus 0.000125, same endpoint | Maximum change <10⁻¹⁰ |
| Analytic discrete Fourier mode | 32×24, small amplitude, 80 steps | Maximum field error <5×10⁻⁹ versus the exact Euler amplification |
| PFC high-amplitude checkerboard damping | 32×32, mean 2.7, amplitude 0.01, M=0.2/1/2 | Final amplitude <2×10⁻⁵ after 16 steps at the ceiling |

Failure controls reverse the update sign separately in all five methods, restore PFC's mixed stencil, restore KS clipping, use a wrong Ohta mean target and restore PFC's excessive historical timestep. A wrong result must fail the same reference criterion. The analytic Fourier comparison uses the exact **discrete Euler** solution, not an exact continuum solution; the separate fixed-time test measures temporal discretization error.

`pde-family-state.js` uses actual module instances. It completes each default and shipped preset's declared preparation at its 512-cell grid with its retained noise setting, then checks raster dimensions and exact preservation of read/write, chemical, intermediate, backup and guard textures, recipe and numerical counters. Every default is exported at 2400×2400 and 1200×900; each other preset at 800×800. Separate deliberately excessive-step fixtures test visible rejection and exact field/counter rollback for all six methods, with rejection disabled as the negative control. Results and any unsuccessful preparations remain in [pde-family-state.json](results/pde-family-state.json). This is export/state evidence, not validation of morphology or print-resolution scientific observables.

## Source checks and interpretation

On 2026-09-21, the parent audit ran these exact searches, recorded here without repeating them:

- `Elder Grant phase field crystal equation conserved dynamics 2004 2002 physical review E`
- `Swift Hohenberg equation nonlinear coefficient subcritical 27 38 k0 cubic`

The audit directly opened [Elder and Grant (2004), equations 22–28](https://www.physics.mcgill.ca/~grant/Papers/PhysRevE_70_051605.pdf), confirming the free-energy operator and conserved dynamics. The numerical paper model and the optional illustrative site forcing must be distinguished.

The [Swift–Hohenberg amplitude derivation, equations 1.1–1.4](https://academic.oup.com/imamat/article/86/5/944/6337890) has cubic amplitude coefficient $3n_3+38n_2^2/9$. Rescaling the displayed equation gives $g^2>27bk_0^4/38$ for subcritical **one-dimensional continuum stripes near onset**. The old fixed “g above about 0.85” statement omitted the dependence on $b$ and $k_0$. Neither threshold alone proves a stable two-dimensional localized state.

[Tjhung, Nardini and Cates (2018), equations 5–6 and the accompanying discussion](https://arxiv.org/pdf/1801.07687) explicitly distinguish the nonvariational λ term from an equilibrium free-energy derivative, even when ζ=0. Appendix A uses conserved stochastic forcing and a stated discretization. This implementation uses the same deterministic continuum terms with its documented finite-difference choices, and does not reproduce that paper's stochastic simulation protocol or establish reverse-ripening rates.

Still outstanding: fixed-physical-domain spatial convergence for these nonlinear methods, nonlinear stability over broader controls, independent phase-selection and coarsening measurements, and additional hardware/Float16 validation. The app's downsampled, quantized status means are marked approximate and are not used as scientific conservation evidence.
