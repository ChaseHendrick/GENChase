# Changelog

## v0.5.0

The publication date is recorded in the GitHub release notes.

- 48 techniques are validated within their stated limits, up from 28 in v0.4.1. Another 3 remain partially validated and 79 unvalidated.
- New numerical evidence for Schrödinger (absorbing boundary and long-time phase), convection (coupled spatial and time convergence), Maxwell dielectric reflection and transmission, molecular equilibration and transport, plasma Landau damping, nonreciprocal interactions (long runs, several parameters), shallow water (resolution, parameters, boundaries, long runs), volume waves (long-time dispersion), Hodgkin–Huxley (parameter domain, long runs), direct gravity (large-N forces, time step and softening), the Gross–Pitaevskii condensate, SSH edge states and KPZ growth scaling.
- Print-state evidence for the excitable, turing, cyclic, chemotaxis and vegetation tabs, and for chladni, gerstner, hasimoto, tennis, eight, photon and bec.
- Adds the paper *Minimal winding in the self-similar collapse of three point vortices and of two concentric vortex polygons* in `research/`, with its source, verification programs and their output; the release attaches the PDF and the verification files. It proves that every collapse of three point vortices has |ω₀|t_c > √3/2, with the constant sharp, and corrects an earlier note: for circulations (1, 1/2, −1/3) the least |ω₀|t_c is 1.0647…, while 2.2039… is the minimum for one orientation of the triangle only.
- Fixes the SVG escape helper, which escaped nothing, and clears four other code-scanning findings.
- SECURITY.md no longer rules out a bounty.

## v0.4.1

The publication date is recorded in the GitHub release notes.

- First public release in the numbered series.
- Includes the browser art start page, offline ZIP, local checker setup, and contribution guides.
- Includes 28 techniques validated within their stated limits. Another 21 remain partially validated and 81 unvalidated.
- Corrects FPUT mode energy, elapsed-time control and integration, with independent trajectory and complete PNG comparisons.
- Publishes the browser studio through an explicit GitHub Pages Actions workflow, with a traceable deployed commit.
- Future releases use major, minor and patch numbers; dates stay in these notes and GitHub metadata.

The earlier calendar-named release is withdrawn in favor of v0.4.1.
