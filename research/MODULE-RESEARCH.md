# New module research

This review looked for established scientific models missing from GENChase and useful ways to
explore them. Repository availability, a permissive license, and an attractive demo do not establish
numerical correctness. New implementations need independent benchmarks and explicit limits.

## First additions

| Simulation | What it adds | Where the work goes | Reference implementation |
|---|---|---|---|
| Electromagnetic fields | Electric and magnetic waves evolving through dielectric material | GPU grid updates; larger fields resolve smaller structures | [RobinKa/maxwell-simulation](https://github.com/RobinKa/maxwell-simulation), MIT; [Meep FDTD introduction](https://meep.readthedocs.io/en/latest/Introduction/) |
| Molecular dynamics | Interacting particles with attraction, repulsion and conserved dynamics | CPU neighbor searches and force evaluation; larger systems reduce some finite-size effects | [Allen–Tildesley examples](https://github.com/Allen-Tildesley/examples), CC0 |

GENChase implements these established equations in its existing seed, palette and print shell.
Increasing workload is optional. A larger simulation is not automatically more accurate: timestep,
resolution, boundary assumptions and the measured quantity still matter. See the individual
validation reports for what has actually been tested.

## Further candidates

| Candidate | Why it is distinct | Reference and license inspected | Tests required before scientific claims |
|---|---|---|---|
| Kinetic plasma | Particle distributions, collective oscillations and phase-space mixing | [GEMPIC.jl](https://github.com/JuliaVlasov/GEMPIC.jl), MIT | Plasma frequency, Gauss law, energy, particle/grid refinement; bounded Landau-damping comparison |
| Nonlinear shallow water | Conservative shock and rarefaction dynamics | [Clawpack Riemann solvers](https://github.com/clawpack/riemann), BSD-3-Clause | Exact dam break, mass conservation, positive depth and grid refinement |

These are research candidates, not installed modules. A simple particle-in-cell implementation
would not inherit the name or structure-preserving guarantees of GEMPIC. Shallow-water dry states
and bathymetry require additional numerical work.

## The MathMod collection

[MathMod](https://github.com/parisolab/mathmod) is a plausible match for the recalled collection of
roughly 400 examples. At revision `dcf4eb81039602899c46a93c4ce1ef3bf7c8a756`, its main collection
contains 399 model entries and its advanced collection 186. Those are file-entry counts, without
deduplication. Many are implicit or parametric surface examples; the count is not a count of
independently validated time-dependent solvers.

The repository includes GPL license text, and its SourceForge license metadata differs. No MathMod
code or collection is bundled here. The new Parametric Surfaces module independently implements Enneper, Dini and the catenoid–helicoid associate family, with six presets, camera controls, and vector export. Its [geometry and print checks](../validation/SURFACES.md) test the published maps and finite mesh. These are established formulas, not discoveries. Bulk importing a gallery would not supply the
scientific checks each GENChase technique needs.

## Research record

Discovery and implementation queries, inspected sources, license files and access limitations are
recorded in [RESEARCH.md](../RESEARCH.md). No claim of new mathematics follows from adding these
modules. Originality must be established separately from correctness.
