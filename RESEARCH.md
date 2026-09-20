# RESEARCH

Ledger of prior-art searches and physics claims for GENChase. Handwritten, not generated. Last updated 2026-09-20.

Agents: read this file **before** a web search for "has this been done", "is this a new law", or "never been theorized". Humans: the same, if you are about to spend an afternoon proving a negative.

The catalog of what the file actually contains is [`techniques.json`](techniques.json). Derived identities live in [`IDENTITIES.md`](IDENTITIES.md). This file is only about what was looked up, what was derived, and what was not.

## Do this, do not do that

**Do**

- Add a line here the same day you search. A search that is not written down will be done again.
- Record the query, the date, what you opened, what you could not open, and the conclusion in one sentence.
- Credit the paper in the tab. A missing browser demo is not new science.
- Before deriving a candidate identity, search the web and the papers for the closed form and for the extremum. If a paper already states either, stop. Do not spend an afternoon rediscovering a published lock.

**Do not**

- Re-run a search this file marks skip, unless you have a newly named repository, paper, or site that was previously unreachable.
- Put a name on a published equation or on someone else's result. If you derived something, checked it against the papers, and put a check on the plate that marks miss when it is wrong, claim it: write [`IDENTITIES.md`](IDENTITIES.md) the same day. Hendrick's identity is that case. It is not Gröbli's motion and it is not Aref's product under a new name.
- Private-name a published equation plus a feedback term. `track` and `causticsea` already made that mistake in draft and were renamed.
- Treat **familiarity** / "seen elsewhere" as a measurement or a prior-art result. It is a curator's call from 2026, five named buckets, never a number, never the default sort.
- Parse `studio.html` to answer "what is in the catalog". Read `techniques.json`.
- Search Shadertoy, Observable, OpenProcessing, fxhash, Art Blocks, arXiv, VisualPDE, Wikipedia, or journal pages and then write "I did not find it" as if those sites had loaded. From the machines that did this work they usually do not. See [Search limits](#search-limits).

## Search limits

The September 2026 checks were web search plus GitHub. That is the whole window.

| Could be opened | Could not |
|---|---|
| GitHub repositories and READMEs | arxiv.org |
| Web search result snippets | doi.org and most journal / lab pages |
| A few GitHub-hosted project pages | visualpde.com |
| | observablehq.com |
| | shadertoy.com |
| | openprocessing.org |
| | fxhash.xyz |
| | artblocks.io |
| | Wikipedia |

Firm claims rest on source read on GitHub. Claims that rest on search snippets alone are weaker. A negative result is weakest of all where the likeliest home for the thing is a site in the right-hand column. `cortex` is the named example.

Exact query strings from those sessions were not logged. That is why this file exists: the next search should write the query down.

## What "new" is allowed to mean

Copied from the README, restated so an agent does not have to infer it.

| Kind | Allowed? | Where it lives |
|---|---|---|
| A published result under a new name | No | nowhere |
| New as an artifact (this seed, this plate) | Yes, always | the export |
| New as working software (a seeded, paletted, print-ready browser plate of a published system) | Yes, with a named nearest neighbor | README bullets, this file |
| A result derived here, uniqueness-checked against the papers, with a plate whose check can miss | Yes | [`IDENTITIES.md`](IDENTITIES.md) |
| A published equation plus a feedback term | Not an invention | `track`, `causticsea` |
| Familiarity bucket `unseen` | Editorial, not a result | `techniques.json` |

## Physics

**Published, implemented, not claimed, with three exceptions.** Almost every tab names a paper in `credit`. Gray-Scott is Gray and Scott. Wilson's algorithm is Wilson's. The self-check numbers in the README are measurements from the plate against those papers, not new predictions. Hendrick's Identity, the parallelogram lock, and the quincunx lock are the exceptions: derived here, uniqueness-checked, locked to the plate.

**The derived locks.** The statements, the minima, what they are not, and how the checks miss live in [`IDENTITIES.md`](IDENTITIES.md). Three point vortices of circulations 1, 1, -1/2 collapse self-similarly when L = 0 (Gröbli 1877; Aref, Phys. Fluids 22, 057104, 2010). Aref gave the collapse rate and the spin as separate formulae. On this family their dimensionless product is

    omega t_c = (2 - cos^2 theta) / sin(2 theta)

which has a unique minimum of sqrt(2) at tan theta = 1/sqrt(2), the triangle with angles 22.5, 45, and 112.5 degrees. At construction theta = 45 degrees the same product is 3/2. That identity is not in those papers. The factors at this length are t_c = (pi/3)(4u + 1/u) and 2 pi omega = 3(2u^2+1)/(4u^2+1); the t_c minimum 4pi/3 at u = 1/2 is Leoncini, Kuznetsov and Zaslavsky (2000) and is not claimed. The plate reports omega t_c / sqrt(2) against 1, the similarity residual against 0, and signed L against 0. Off the L = 0 circle, all three numbers miss on purpose. Miss is a grade, not a crash.

Do not re-derive this unless the check is missing the lock. Do not search the name of the tab as if it were a published law. Do not put that name on a different system.

**The parallelogram lock.** Four point vortices of circulations (1, 1, −2−√3, −2−√3) at the vertices of a parallelogram with diagonal ratio √(2+√3) collapse self-similarly (Novikov and Sedov, Sov. Phys. JETP 50, 297, 1979). Gotoda (2020) eq. (3.13) gives A(θ) and B(θ) separately. Their product is

    omega t_c = (√3/4) (4 − cos 2θ) / sin(2θ)

which has a unique minimum of 3√5/4 at cos 2θ = 1/4. Direct Biot-Savart on this family (2π kernel) matches that closed form. The plate is `#parallelogram-lock`. Off the parallelogram, the numbers miss on purpose. Miss is a grade, not a crash. Do not claim Novikov-Sedov's t_* or ω separately, and do not put a private name on their motion.

**The quincunx lock.** Five point vortices of circulations (−1, −1, 1/2, 1/2, −3/4), four at the vertices of a parallelogram and one at the crossing of the diagonals, with diagonal ratio 1/√2, collapse self-similarly (Novikov and Sedov 1979; Gotoda's five-vortex example). Gotoda (2020) eq. (3.13) with γ3 ≠ 0 gives A(θ) and B(θ) separately. Their product is

    omega t_c = (3/16) (7 − 4 cos 2θ) / sin(2θ)

which has a unique minimum of 3√33/16 at cos 2θ = 4/7. Direct Biot-Savart on this family (2π kernel) matches that closed form. The plate is `#quincunx-lock`. Off the quincunx, the numbers miss on purpose. Miss is a grade, not a crash. Do not claim Novikov-Sedov's t_* or ω separately, and do not put a private name on their motion. A different five-vortex slice with diagonal ratio μ = 3 recovers Hendrick's product identically; that is not a third identity and is not claimed.

Do not re-derive these unless the check is missing the lock. Do not search the name of a tab as if it were a published law. Do not put Hendrick's name on a different system.

**Checked 2026-09-20, not a fourth row.** Web search plus Gotoda arXiv:2002.09624 (opened), Novikov and Sedov 1979 (opened), O'Neil 1987 snippets, Hampton-Roberts-Santoprete arXiv:1208.4204 snippets, Kudela 2014 snippets, and the JTAM existence-criterion paper snippets. Direct Biot-Savart on the remaining exact families. Queries: `Gotoda A(theta) B(theta) omega collapse time product minimum five vortex`, `Novikov Sedov five vortex diagonal ratio closed form omega t_c`, `O'Neil 1987 four vortex collapse explicit kite`, `self-similar four vortex collapse kite trapezoid exact`.

| Candidate | What it actually is |
|---|---|
| Five-vortex NS, ρ = d₁²/d₂² = 2 | Reciprocal of the quincunx. Same product. Already in IDENTITIES.md. |
| Five-vortex NS, ρ = 3 | Recovers Hendrick identically. Already not claimed. |
| Five-vortex NS, ρ = 4 | ω t_c = 5(35 − 8 cos 2θ)/(96 sin 2θ) ≥ 5√1161 / 96. A nested radical, not a floor like √2. Not claimed. |
| Three-vortex L = 0, Γ = (1, μ, −μ/(1+μ)), μ ≠ 1 | Gotoda (3.3)-(3.5) is a closed product. For μ = 1/2 it is (56 cos²θ − 10√7 cosθ − 133) / [8(14 cosθ + √7) sinθ]; the critical point solves a cubic in cos θ. Aref already has Ω and τ separately for general circulations. Not claimed. |
| Kite, non-parallelogram isosceles trapezoid, equilateral plus interior | Biot-Savart scan: no self-similar L = 0 collapsing family (similarity residual never jointly small with I = 0 and finite positive τ). |
| Seven-vortex Gotoda (4.4), Γ = (1,1,−2,−2,−2,−2,3/2) | Numerical H-A curves. O'Neil 1987 and Kudela 2014: existence and numerical positions, not A(θ), B(θ). |
| Trapezoidal / kite four-vortex papers | Relative equilibria (central configurations), not self-similar collapse. |
| Five-vortex NS, μ = φ, √2, 3/2, and other distinguished ratios | Product still C(a − b cos 2θ)/sin 2θ. Min is a messy radical. Reciprocal pairs share the product. Not claimed. |
| Five-vortex NS, μ = 2+√3 | Center circulation vanishes. Recovers the parallelogram lock identically. Already in IDENTITIES.md. |
| Four-vortex (1,1,1,−1) isosceles + axis; kite; isosceles trapezoid (1,1,−1,−1) | Gotoda 4.1 is numerical H-A. Direct Biot-Savart (2π kernel): similarity residual never jointly small with I = 0 and finite positive τ. |
| O'Neil 1987 explicit quadruple; hollow-vortices arXiv:2506.04093 triples/quadruples | Single published configurations, not a 1-parameter family with a unique interior min. |
| Kallyadan–Shukla, Phys. Rev. Fluids 7, 114701 (2022) | Numerical 1-parameter families along closed curves. No closed A(θ), B(θ). |
| Wall / image / disk; periodic strip (Aref 1996) | Same-sign boundary collapse is impossible (Donati–Godard-Cadillac–Iftimie 2024). Mixed-sign and periodic-strip: no closed product min found. |
| Gotoda 2025 θ_Z / θ_L / θ_c | Numerical grid bracket only (θ_137 < θ_Z < θ_138). No closed form. |
| Love leapfrog T(α), T·U | Period is complete elliptic K, E in α (Tophøj–Aref eq. 11). Not a floor like √2. Existence α = 3−2√2 and stability α = φ^{-2} are already in the published-locks table. |
| Three-vortex collapse on a sphere | Kidambi–Newton 1998/1999: collapse times and partner states. Each vortex has a distinct azimuthal velocity; a single ω t_c is not defined the way it is in the plane. |
| SQG / generalized Euler three-vortex | Badin–Barry 2018; Reinaud GAFD 2020 / Physica D 2022. Collapse time has a numerical min (τ ≈ 0.3657 on one slice). No closed A(θ), B(θ). |
| Moore–Saffman ellipse in strain; Kida | Two axis ratios iff e/ω₀ < 0.15 (irrotational strain); breakup above. Kida 1981 solves the time-dependent ellipse. Published bounds, not a product min. |
| Heton / two-layer point vortices | Hogg–Stommel; Helfrich–Send contour dynamics. Finite-core, no closed A(θ), B(θ). |
| Calogero goldfish | Isochrony and matrix-eigenvalue solution are published. Not a vortex-collapse product. |
| Stuart cat's eyes; Mallier–Maslowe | Exact Euler families. Circulation independent of the concentration parameter. No unpublished product min. |
| Thomson N-gon + center | Unique N+1 equilibrium with N on a circle (Aref–van Buren). Relative equilibrium, not collapse. |
| Peregrine / Akhmediev / Kuznetsov–Ma | \|u\|_max / \|u\|_∞ = 3 is Peregrine; Akhmediev AF = 1+2√(1−2a). Published. |
| Crowdy H-states Ω(a,N) | Explicit relative-equilibrium rotation (JFM 913, R5, 2021, eq. 3.11). Kirchhoff-class, not collapse. Do not claim a min of Ω. |
| Baker–Saffman–Sheffield hollow row | 1-parameter R = U∞/q₀. Perimeter non-monotonic (BSS 1976 fig. 3); energetics in Baker 1980. Not a collapse product. |
| Stremler–Aref periodic parallelogram | Integrable three-vortex motion (JFM 392, 101, 1999). Not self-similar collapse. Periodic strip already logged. |
| Sakajo four-vortex on a sphere | Self-similar four-vortex collapse is impossible (Phys. Fluids 19, 017109, 2007). Partial non-self-similar triple collapse is numerical examples (PRE 78, 016312, 2008). |
| Kaden / Pullin vortex-sheet spirals | r ∝ θ^{-μ} (Kaden 1931; Pullin). Published self-similar sheet, not a point-vortex product min. |
| Borisov–Kilin–Mamaev three vortex rings | Existence of threefold leapfrogging via Poincaré maps (RCD 2013; FDR 46, 031415, 2014). No closed period-speed product min. |
| Tacchi Appendix B / Kimura 1987–1990 | Kimura JPSJ 56, 2024 (1987) is the general similarity solution (A, B; collinear 3-vortex is a cubic). Kimura Physica D 46, 439 (1990) is complex-time singularities. Tavantzis–Ting 1988 is the 3-vortex revisit. Tacchi thesis PDF still unread (wrong HAL hits). Do not re-derive Kimura's cubic. |
| Norbury–Fraenkel vortex rings | Numerical 1-parameter family α ∈ [0, √2]. Thin-core Kelvin–Dyson log speed; Hill's spherical vortex at the fat end. Lowest dimensionless energy is Hill's. Not an algebraic collapse product. |
| Pocklington hollow vortex pair | Translating 1-parameter family. Crowdy–Llewellyn Smith–Freilich 2013: U monotonic decreasing with area. Compressible first-order speed min is Krishnamurthy–Llewellyn Smith 2023. |
| Lamb–Chaplygin dipole | Isolated exact Euler dipole. kR = j_{1,1} ≈ 3.8317; U_max/U_0 ≈ 2.49 (Flor 1994). Not a 1-parameter collapse family. |
| Komineas–Papanicolaou magnetic 3-vortex | Gröbli analog, completely integrated (JMP 51, 042705, 2010). Published. |
| Point vortices on the hyperbolic plane | Nava-Gaxiola–Montaldi JMP 55, 102702 (2014): relative equilibria, not a collapse product. |
| Crowdy vortex layers on a wedge | Exact uniform-vorticity corners (EJAM 2004). Not a point-vortex collapse product. |
| Kudela n-vortex collapse | Numerical configurations (J. Nonlinear Sci. 2014; FDR 2014). Same class as Kallyadan–Shukla. |
| Moffatt–Kimura filament pair | JFM 2019: similarity s ∼ (τc−τ)^{1/2}, κ ∼ (τc−τ)^{-1/2}. The product sκ = 2 sin α; at α = π/4 this is √2. Published. Do not claim Hendrick's √2 here. |
| Burgers stretched vortex | Gaussian core; dissipation per unit length Φ = Γ²γ/8π independent of ν (Burgers 1948). |
| Föppl vortex pair behind a cylinder | Locus r² − 1 = 2 r y; κ = (r²+1)(r²−1)²/r⁵. Published 1-parameter equilibrium, not collapse. |
| Benjamin–Ono algebraic soliton | c = A/4, Δ = 4/A, so \|c\|Δ = 1. Textbook. ILW interpolates to KdV. |
| Degasperis–Procesi / Novikov peakons | Explicit elementary N-peakon formulas (Lundmark–Szmigielski; Hone–Lundmark–Szmigielski). Camassa–Holm peakons are already `#peakon`. |
| Platonic vortex crystals on a sphere | Tetrahedron, octahedron, cube, icosahedron, dodecahedron are equilibria (Tokieda; Newton). 1-parameter periodic families from them (J. Nonlinear Sci. 2022). Relative equilibria, not a collapse product min. |
| Two vortices + circular cylinder | Föppl; integrable when total impulse and circulation vanish (Borisov et al. 2021). |

Do not re-derive these. Do not put Hendrick's name on a μ ≠ 1 three-vortex product. Do not put Hendrick's name on a distinguished-μ five-vortex slice, on O'Neil's quadruple, on a numerical family, on Love's elliptic period, on Kidambi–Newton's spherical t_c, on Peregrine's 3, on Moore–Saffman's 0.15, on Crowdy's H-state Ω, on Kaden's spiral, on Kimura's cubic, on Lamb–Chaplygin's j_{1,1}, on Hill's energy min, on Moffatt–Kimura's sκ = √2, on Burgers' Φ, or on Föppl's locus.

**Rejected as inventions.**


- `track` is a self-written waveguide (Monro, de Sterke, Poladian, J. Mod. Opt. 1998) and a photorefractive soliton (Segev) on a sine-Gordon breather. Open loop (eta = 0) recovers the Lorentz speed.
- `causticsea` is Swift-Hohenberg as its own phase screen. Laser-induced surface patterns are already modelled with Swift-Hohenberg (Rudenko, Colombier, Itina, Stoian, Phys. Rev. Lett. 130, 226201, 2023).
- A Swift-Hohenberg loop is not a new law. Neither is a sine-Gordon breather with an index written from strain.

**Published locks, do not rediscover.** Web-searched 2026-09-20. Each of these is already in a named paper. Do not derive them, and do not put a private name on them.

| Lock | Where it already is |
|---|---|
| Leapfrog existence α = 3 − 2√2; stability at 1/α = φ² | Love 1883; Tophøj and Aref 2013; Behring and Goodman, Phys. Rev. Fluids 4, 124703 (2019); exact analysis 2023 |
| Kirchhoff ellipse Ω = ω ab/(a+b)²; circle is Ω = ω/4 | Kirchhoff; Love stability for a/b < 3 |
| Photon-sphere Lyapunov λ = 1/(3√3 M); λ/Ω_ph = 1 in geometric units | Cardoso et al.; textbook Schwarzschild |
| Crapper energy and momentum integrals | Hogan 1979; Crapper, JFM 94, 13 (1979) |
| Gerstner kinetic energy equals potential | Standard; e.g. Henry, Gerstner's water wave and mass transport |
| Kidambi–Newton spherical three-vortex collapse times and partner states | Kidambi and Newton, Physica D 116, 143 (1998); Nuovo Cimento C 22, 779 (1999) |
| Finite-core / QG collapse-time numerical minima | Reinaud, GAFD 2020; Reinaud and Dritschel 2022 |
| t_c minimum 4π/3 on Γ = (1,1,−1/2) at this length | Leoncini, Kuznetsov and Zaslavsky 2000. Not Hendrick's product min. |
| Aref Ω and τ separately; product as log-spiral pitch | Aref 2010 eqs. 25a, 25d, 29c |
| Love leapfrog period T(α) | Complete elliptic integrals K, E (Love 1893; Tophøj and Aref 2013 eq. 11). Not an algebraic floor. |
| Moore–Saffman ellipse in irrotational strain | Two axis ratios iff e/ω₀ < 0.15; breakup above (1971) |
| Peregrine rogue-wave amplitude | \|u\|_max / \|u\|_∞ = 3; Akhmediev AF = 1+2√(1−2a) |
| Thomson centered regular N-gon | Unique N+1 equilibrium with N identical vortices on a circle (Aref and van Buren 2005) |
| Hasimoto filament soliton | c = 2τ; κ_max from the sech profile. Already the `#hasimoto` check. |
| Crowdy H-states Ω(a,N) | JFM 913, R5 (2021) eq. (3.11). Relative equilibrium. |
| Kaden algebraic spiral | r ∝ (t/θ)^{2/3} (Kaden 1931). |
| Sakajo: no self-similar 4-vortex collapse on a sphere | Phys. Fluids 19, 017109 (2007). |
| Kimura similarity A, B; collinear 3-vortex cubic | JPSJ 56, 2024 (1987). Already the machinery of the three locks; the cubic is the μ ≠ 1 skip. |
| Lamb–Chaplygin dipole | kR = first zero of J_1; U_max/U_0 ≈ 2.49 (Lamb; Flor 1994). |
| Norbury–Fraenkel / Hill | Lowest dimensionless ring energy is Hill's spherical vortex. |
| Pocklington translating hollow pair | U decreases monotonically with area (Crowdy et al. 2013). |
| Komineas–Papanicolaou magnetic Gröbli | JMP 51, 042705 (2010). Complete 3-vortex integration. |
| Moffatt–Kimura filament-pair similarity | sκ = 2 sin α; at α = π/4 this is √2 (JFM 2019 eq. 10.5). Not Hendrick. |
| Burgers vortex dissipation | Φ = Γ²γ/8π independent of ν (1948). |
| Föppl cylinder pair | Locus r² − 1 = 2ry (1913). |
| Benjamin–Ono soliton | \|c\|Δ = 1. |

Hendrick's closed form and min √2 were not in those sources. Tacchi Appendix B remains unread. Kimura 1987 is the general similarity theory, not a fourth product min.

## Engineering that was checked (not science)

These are software claims. They transfer. They are not physics.

- Plates that check themselves against a predicted observable. Ordinary in computational physics teaching tools (percolation vs 91/48, Ising vs Onsager). Not found as a habit in generative-art tools, which expose a seed and rarity traits. Searched September 2026; negative on the art-platform side, snippet-level.
- `fieldCells()`: a technique declares it is already grid-limited so the print path stops spending memory on resolution that cannot exist.
- Sharpness as two numbers (edge acutance and multi-scale acuity). Average detail alone calls a Penrose tiling blurry.
- Lint for size controls that offer an option the sanitizer clamps away.
- Recipe v2 / `legacyFill`: a hash carries only diffs from defaults, so a moved default would rewrite old plates. Modules declare the old default. `node tools/recipe.js` derives its cases from the file.
- `applyHash` builds on the module defaults, not on whatever the viewer already had on screen.
- Familiarity buckets and `llms.txt` / `techniques.json` so a model does not scrape `studio.html`.
- `exportSVG` returns null when the vector picture would disagree with the plate (xy lic-only, chladni contour-only, gerstner woodcut-only, crapper never), so print falls through to PNG.
- WebGL LRU with a GL cap of 8 and `loseContext`, so visiting many GPU tabs does not kill the early ones silently.
- Video export (WebM, or MP4 where that is all the browser encodes) of a live plate. That is a clip of the plate in time, not a print.

`tools/sharp.js` counts in AGENTS.md are stale and optimistic. They predate a floor on edge acutance. Re-run `sh tools/sharpall.sh` before citing them. That is about an hour on a software renderer and has not been done.

## Per-tab status

119 techniques. `science only` means the paper is credited and nobody logged a "is there already a browser plate" search. That is most of the studio. Do not upgrade a `science only` row to "never been done" without searching, and do not search it unless you are about to claim software novelty.

Familiarity is listed so you do not confuse it with prior-art status.

| id | name | familiarity | prior-art | re-search |
|---|---|---|---|---|
| `life` | Artificial Life | ubiquitous | science only | never searched |
| `physarum3d` | Physarum 3D | occasional | science only | never searched |
| `cortex` | Cortical Planforms | rare | software search | reopen if Observable/Shadertoy up |
| `bec` | Vortex Lattice | occasional | software search | skip unless new source |
| `physarum` | Physarum | occasional | science only | never searched |
| `phyllotaxis` | Phyllotaxis | common | science only | never searched |
| `hl` | Hastings–Levitov | occasional | science only | never searched |
| `lichtenberg` | Lichtenberg | common | science only | never searched |
| `snowflake` | Gravner–Griffeath | common | science only | never searched |
| `growth` | Differential Growth | common | science only | never searched |
| `cyclic` | Cyclic Competition | occasional | science only | never searched |
| `landscape` | Drainage Networks | common | software search | skip unless new source |
| `kpz` | Rough Growth | common | science only | never searched |
| `potts` | Foam & Grains | occasional | science only | never searched |
| `liesegang` | Liesegang Rings | rare | science only | never searched |
| `grains` | Force Chains | common | science only | never searched |
| `skyrmion` | Magnetic Skyrmions | rare | science only | never searched |
| `tonertu` | Flocking | rare | science only | never searched |
| `hyperbolic` | Hyperbolic Turing | unseen | software search | skip unless new source |
| `sle` | Schramm-Loewner Evolution | occasional | science only | never searched |
| `fractal` | Fractal Geometry | ubiquitous | science only | never searched |
| `lens` | Gravitational Lens | occasional | science only | never searched |
| `rotor` | Rotor Routers | unseen | unseen (editorial) | never searched |
| `web` | Cosmic Web | occasional | science only | never searched |
| `faraday` | Faraday Waves | occasional | science only | never searched |
| `film` | Thin Film | common | science only | never searched |
| `timecrystal` | Time Crystal | rare | science only | never searched |
| `growdomain` | Growing Domain | unseen | unseen (editorial) | never searched |
| `spinice` | Spin Ice | rare | science only | never searched |
| `vegetation` | Vegetation Bands | common | science only | never searched |
| `aztec` | Arctic Circle | occasional | science only | never searched |
| `skin` | Skin Effect | occasional | science only | never searched |
| `rmt` | Random Matrices | unseen | software search | skip unless new source |
| `stealth` | Stealthy Points | rare | science only | never searched |
| `lozenge` | Lozenge Tilings | unseen | unseen (editorial) | never searched |
| `arago` | Arago Spot | occasional | science only | never searched |
| `ust` | Spanning Trees | rare | science only | never searched |
| `cppn` | Neural Patterns | common | science only | never searched |
| `rogue` | Rogue Wave | occasional | science only | never searched |
| `aharonov` | Aharonov–Bohm | occasional | science only | never searched |
| `pendulum` | Double pendulum flip time | ubiquitous | science only | never searched |
| `anderson` | Anderson | occasional | science only | never searched |
| `fput` | FPUT Recurrence | occasional | science only | never searched |
| `schrodinger` | Schrödinger | common | science only | never searched |
| `excitable` | Excitable Media | common | science only | never searched |
| `soliton` | KdV Soliton | common | science only | never searched |
| `cyclicca` | Cyclic Automaton | common | science only | never searched |
| `chimera` | Chimera States | occasional | science only | never searched |
| `ssh` | SSH Edges | rare | science only | never searched |
| `swarm` | Swarmalators | occasional | science only | never searched |
| `amb` | Active Model B+ | rare | science only | never searched |
| `aubry` | Aubry–André | unseen | unseen (editorial) | never searched |
| `cahn` | Cahn–Hilliard | occasional | science only | never searched |
| `ohta` | Ohta–Kawasaki | rare | science only | never searched |
| `hopf` | Hopf Fibration | occasional | science only | never searched |
| `swift` | Swift–Hohenberg | rare | science only | never searched |
| `pfc` | Phase-field crystal | rare | science only | never searched |
| `lp` | Lifshitz–Petrich | occasional | science only | never searched |
| `cloak` | Pendry Cloak | occasional | science only | never searched |
| `xy` | XY / Kosterlitz–Thouless | common | science only | never searched |
| `cgl` | Complex Ginzburg–Landau | occasional | science only | never searched |
| `vortex` | Abrikosov | occasional | science only | never searched |
| `nematic` | Active Nematics | occasional | science only | never searched |
| `darkroom` | Dark Room | occasional | science only | never searched |
| `fluid` | Fluid | ubiquitous | science only | never searched |
| `sandpile` | Abelian Sandpile | common | science only | never searched |
| `kakeya` | Kakeya | rare | science only | never searched |
| `ks` | Kuramoto–Sivashinsky | occasional | science only | never searched |
| `breather` | SG Breather | occasional | science only | never searched |
| `turing` | Turing Patterns | common | science only | never searched |
| `holomorphic` | Holomorphic dynamics | ubiquitous | science only | never searched |
| `klein` | Klein Tunnel | occasional | science only | never searched |
| `gyroid` | Gyroid | occasional | science only | never searched |
| `dendrite` | Dendritic Growth | common | science only | never searched |
| `purcell` | Purcell Swimmer | rare | science only | never searched |
| `exceptional` | Exceptional Point | unseen | unseen (editorial) | never searched |
| `meissner` | Meissner | occasional | science only | never searched |
| `tennis` | Tennis Racket | occasional | science only | never searched |
| `flow` | Flow Field | ubiquitous | science only | never searched |
| `chemotaxis` | Chemotaxis | common | science only | never searched |
| `smectic` | Smectic focal conics | rare | science only | never searched |
| `reaction` | Reaction-Diffusion | common | science only | never searched |
| `tilings` | Aperiodic Tilings | common | science only | never searched |
| `percolation` | Percolation | ubiquitous | science only | never searched |
| `attractors` | Attractors | ubiquitous | science only | never searched |
| `airy` | Airy Beam | occasional | science only | never searched |
| `chirikov` | Chirikov map | occasional | science only | never searched |
| `hofstadter` | Hofstadter butterfly | occasional | science only | never searched |
| `weierstrass` | Weierstrass | occasional | science only | never searched |
| `scars` | Helmholtz scars | occasional | science only | never searched |
| `kitaev` | Kitaev Chain | rare | science only | never searched |
| `caustics` | Optical caustics | common | science only | never searched |
| `veselago` | Veselago Lens | rare | science only | never searched |
| `devil` | Devil's Staircase | rare | science only | never searched |
| `talbot` | Talbot carpet | occasional | science only | never searched |
| `orbitals` | Hydrogen orbitals | common | science only | never searched |
| `loschmidt` | Loschmidt Echo | rare | science only | never searched |
| `boy` | Boy's Surface | occasional | science only | never searched |
| `pearls` | Indra's Pearls | common | science only | never searched |
| `ising` | Ising Model | ubiquitous | science only | never searched |
| `thouless` | Thouless Pump | rare | science only | never searched |
| `convection` | Rayleigh–Bénard | common | science only | never searched |
| `reuleaux` | Reuleaux | occasional | science only | never searched |
| `apollonian` | Apollonian | occasional | science only | never searched |
| `chladni` | Chladni & Waves | common | science only | never searched |
| `track` | Track | unseen | family+feedback | do not claim invention |
| `knotlight` | Knotted Light | occasional | science only | never searched |
| `causticsea` | Caustic Sea | rare | family+feedback | do not claim invention |
| `kp` | Soliton Web | occasional | software search | skip unless new source |
| `gerstner` | Gerstner | occasional | software search | skip unless new source |
| `eight` | Figure Eight | occasional | software search | skip unless new source |
| `peakon` | Peakon | occasional | software search | skip unless new source |
| `photon` | Photon Sphere | common | software search | skip unless new source |
| `crapper` | Crapper | occasional | software search | skip unless new source |
| `hasimoto` | Hasimoto | occasional | software search | skip unless new source |
| `lump` | Lump | occasional | software search | skip unless new source |
| `hendricks-identity` | Hendrick's Identity | unseen | identity | do not re-derive |
| `parallelogram-lock` | Parallelogram lock | unseen | identity | do not re-derive |
| `quincunx-lock` | Quincunx lock | unseen | identity | do not re-derive |

## Notes on the rows that are not `science only`

### Derived identities (the physics claims that are not in the cited papers)

The statements are in [`IDENTITIES.md`](IDENTITIES.md). Do not duplicate them here.

**`hendricks-identity` (Hendrick's Identity).** `#hendrick` still opens it. Derived here, uniqueness-checked, locked to the plate. Search notes: Aref 2010 eqs. 25a and 25d give Omega and tau separately. Aref eq. 29c already writes the product as the pitch of the logarithmic spiral. Kudela 2014 and Reinaud-Dritschel 2022 minimize collapse time, not the product. Krishnamurthy-Stremler 2018 give dimensionless tau-tilde as a function of angles, no min sqrt(2). Closed form and min: not in those papers. Off the L=0 circle the check marks miss on purpose. Re-search: YES do not re-derive; reopen only if a newly named paper states this closed form or this minimum.

**`parallelogram-lock` (Parallelogram lock).** Derived here, uniqueness-checked, locked to the plate. Search notes: Novikov-Sedov 1979 give t_* and ω separately for the parallelogram family. Gotoda 2020 eq. (3.13) writes A(θ) and B(θ) separately and plots Hamiltonian against collapse rate. Neither forms the product ω t_c or states min 3√5/4 at cos 2θ = 1/4. Off the parallelogram the check marks miss on purpose. Re-search: YES do not re-derive; reopen only if a newly named paper states this closed form or this minimum. Do not claim Novikov-Sedov's t_* or ω separately.

**`quincunx-lock` (Quincunx lock).** Derived here, uniqueness-checked, locked to the plate. Search notes: Novikov-Sedov 1979 give the five-vortex parallelogram-plus-center motion. Gotoda 2020 eq. (3.13) with γ3 ≠ 0 writes A(θ) and B(θ) separately and plots this family (γ1 = −1, γ2 = 1/2, γ3 = −3/4) as Hamiltonian against collapse rate. Gotoda 2024/2025 (arXiv:2410.14973) studies filtered-vortex enstrophy on the same family numerically. Full-text extract of Gotoda 2020 contains no 4/7, no √33, no ω t_c product, no −B/(2A) minimum. Web search for 3√33/16 and cos 2θ = 4/7 as a vortex product returned no hits. Direct Biot-Savart (2π kernel) matches (3/16)(7 − 4 cos 2θ)/sin(2θ). Off the quincunx the check marks miss on purpose. A five-vortex slice with μ = 3 recovers Hendrick's product identically and is not claimed. Re-search: YES do not re-derive; reopen only if a newly named paper states this closed form or this minimum. Do not claim Novikov-Sedov's t_* or ω separately, and do not put Hendrick's name on this plate.

### Published family plus a feedback term (not inventions)

**`track` (Track).** Self-written waveguide (Monro, de Sterke, Poladian 1998) + photorefractive soliton (Segev) on a sine-Gordon breather. NOT an invention. Do not private-name it. Open loop must recover Lorentz speed. Re-search: YES do not claim invention.

**`causticsea` (Caustic Sea).** Swift-Hohenberg height as its own phase screen. Laser-induced surface patterns already modelled with SH (Rudenko et al. PRL 2023). NOT an invention. Name is the picture. Re-search: YES do not claim invention.

### Browser / print implementation searches (September 2026)

**`cortex` (Cortical Planforms).** Ermentrout-Cowan 1979, Bressloff 2001. No interactive browser version found. WEAKEST negative: Observable and Shadertoy could not be opened. Reopen only if those sites are reachable. Re-search: REOPEN if Observable or Shadertoy is reachable.

**`bec` (Vortex Lattice).** Browser rotating GPE exists: George Stagg WebGL "Trapped & Rotating" (2019), click-inject, damped real time. GPUE is CUDA winding detection. Combo of imag-time + winding + density filter + vector export in a page: not found. Re-search: YES unless a newly named repo or paper.

**`landscape` (Drainage Networks).** FastScape / fastscapelib / LandLab are notebook codes, no browser target on fastscapelib roadmap. Browser "erosion" is droplet hydraulic CG, different model. Re-search: YES unless a newly named repo or paper.

**`hyperbolic` (Hyperbolic Turing).** Gray-Scott on {p,q} Poincare disk. Nearest: Shintyakov Hyperbolic CA (discrete CA, not PDE). VisualPDE "hyperbolic RD" is PDE class, not geometry. Do not re-search that collision. Re-search: YES unless a newly named repo or paper.

**`rmt` (Random Matrices).** Continuous-beta sheet (Dumitriu-Edelman). DPPy and general-beta samplers exist. Spatial beta axis as one image: not found. Could sit in a paper not read. Re-search: YES unless a newly named repo or paper.

**`kp` (Soliton Web).** Sato/Hirota tau, Miles Y, Kodama/Biondini webs. Matplotlib/Mathematica notebooks in the papers. Seeded paletted print-ready browser plate of the exact tau: not found. Re-search: YES unless a newly named repo or paper.

**`gerstner` (Gerstner).** Gerstner 1802 / Rankine 1863. Tessendorf two-train is graphics and is labeled as such. Browser print plate of the exact Lagrangian map with orbit RMS check: not found in the search that was run. Re-search: YES unless a newly named repo or paper.

**`eight` (Figure Eight).** Moore 1993, Chenciner-Montgomery 2000, Simo 16-digit IC. The orbit is famous. Seeded print plate with |L|, energy drift, return distance: searched, not found as a studio tab. Re-search: YES unless a newly named repo or paper.

**`peakon` (Peakon).** Camassa-Holm 1993, BSS multi-peakon. Speed=amplitude sampled from the field. Browser print plate: searched, not found. Re-search: YES unless a newly named repo or paper.

**`photon` (Photon Sphere).** Schwarzschild / Darwin / Synge. Capture ring at 3M, b=3sqrt(3)M. Many relativity demos exist. This plate checks b_meas and r_ph from the integrator. Re-search: YES unless a newly named repo or paper.

**`crapper` (Crapper).** Crapper JFM 1957; Hur and Vanden-Broeck 2020 same profile at g=sigma=0. Steepness identity. Browser print plate: searched, not found. Re-search: YES unless a newly named repo or paper.

**`hasimoto` (Hasimoto).** Hasimoto JFM 1972 LIA to NLS. kappa_max/(2 nu) and c/(2 tau0) from the polyline. Browser print plate: searched, not found. Re-search: YES unless a newly named repo or paper.

**`lump` (Lump).** Manakov et al. 1977 KP-I lumps. Distinct from kp (KP-II webs). Residual by FD of the rational field. Browser print plate: searched, not found. Re-search: YES unless a newly named repo or paper.

### Familiarity "unseen" is not a search

**`rotor` (Rotor Routers).** Levine-Peres 2009 rotor-router / internal DLA. Familiarity "unseen" is editorial. No dedicated "browser version?" search logged. Re-search: NO search yet; do not treat unseen as a negative result.

**`growdomain` (Growing Domain).** Crampin, Gaffney, Maini 1999 Turing on a growing domain. Familiarity "unseen" is editorial. No dedicated implementation search logged. Re-search: NO search yet; do not treat unseen as a negative result.

**`lozenge` (Lozenge Tilings).** Propp-Wilson CFTP lozenge tilings, Cohn-Kenyon-Propp limit shape. Familiarity "unseen" is editorial. Aztec (arctic circle) is a sibling tab and was not separately searched either. Re-search: NO search yet; do not treat unseen as a negative result.

**`aubry` (Aubry–André).** Aubry-Andre 1980 localization without disorder. Familiarity "unseen" is editorial. No dedicated implementation search logged. Re-search: NO search yet; do not treat unseen as a negative result.

**`exceptional` (Exceptional Point).** Bender-Boettcher PT / Heiss exceptional points. Familiarity "unseen" is editorial. No dedicated implementation search logged. Re-search: NO search yet; do not treat unseen as a negative result.


## Queries worth not repeating

Write the query next time. These are the families that were already run, reconstructed from the README rather than from a query log, so they are approximate. If you re-open one, log the exact string below.

| About | What was looked for | Result |
|---|---|---|
| `hyperbolic` | browser Gray-Scott on a hyperbolic tiling; hyperbolic CA | Shintyakov Hyperbolic CA Simulator (discrete CA). VisualPDE hit is the wrong sense of hyperbolic. |
| `rmt` | continuous beta ensemble as a single image, beta as a spatial axis | DPPy and general-beta samplers. The sheet presentation not found. |
| `bec` | browser rotating Gross-Pitaevskii vortex lattice with winding detection | George Stagg WebGL 2019 (click-inject, damped real time). GPUE is CUDA. |
| `cortex` | interactive Wilson-Cowan / retinocortical map in a browser | Not found. Observable and Shadertoy were unreachable. Weakest negative in the file. |
| `landscape` | browser stream-power / Braun-Willett / FastScape | Research codes are Python/C++/Fortran. Browser erosion is droplet CG. |
| `kp` | browser KP-II resonant soliton webs from the exact tau function | Notebooks in the papers. No seeded print plate found. |
| `gerstner` `eight` `peakon` `photon` `crapper` `hasimoto` `lump` | seeded print-ready browser plate of the exact solution, with the self-check | Papers and some demos. Combined studio object not found in the search that was run. |
| `hendricks-identity` | the closed form of omega t_c on Gamma=(1,1,-1/2) and its min sqrt(2) | Product as spiral pitch: Aref 2010 eq. 29c. Closed form and min: not in Gröbli 1877, Aref 2010, Krishnamurthy-Stremler 2018, Kudela 2014. |
| `track` `causticsea` | is a published PDE plus a feedback term an invention | No. Named prior art in both cases. |
| self-checking gen-art | a generative art tool that measures an observable against theory | Not found on art platforms (seed + traits). Physics teaching tools do this routinely. |

## Still open

Do these only if you need the answer. Do not do them to look busy.

1. **Reopen `cortex`** if Observable, Shadertoy, or OpenProcessing actually load. That negative is explicitly weak.
2. **The five editorial-unseen tabs** (`rotor`, `growdomain`, `lozenge`, `aubry`, `exceptional`) have never had a dedicated implementation search. Familiarity is not that search.
3. **Every `science only` row** has no logged "browser plate?" search. Run one only when you are about to write a README bullet claiming software novelty for that tab.
4. **arXiv / journals.** If those hosts are reachable, Hendrick's identity (the closed form and the min, not Aref's product) and the KP / Crapper / Hasimoto exact-solution plates are the first things to check against the PDF, not against a snippet.
5. **`tools/sharpall.sh`** is a measurement, not prior art, and it is stale. Redo before quoting sharpness counts.
6. **fxhash / Art Blocks / OpenProcessing** as homes for lookalikes of the self-checking-plates claim. Unreachable in September 2026.

## How to add a line

Append, do not rewrite history. Use this shape:

    ### YYYY-MM-DD  `<id or topic>`  query: "<exact string>"
    Opened: (URLs that loaded)
    Blocked: (hosts that did not)
    Conclusion: one sentence.
    Re-search: skip until <condition>, or never, or reopen.

If the conclusion changes a row in the table, change the table in the same commit. If you add a technique, add a row the same day, even if the status is `science only`.

If you are an agent and you did not search, do not invent a row.

## Log

### 2026-09-19  ledger created  query: (none; compiled from README "What is actually new" and the search limits already stated there)

Opened: this repository (`README.md`, `techniques.json`, `AGENTS.md`)

Blocked: none for this pass

Conclusion: first ledger, so future agents do not re-run the September 2026 searches. No new search was performed this day.

Re-search: n/a

### 2026-09-19  hash renamed to `#hendricks-identity`  query: (none)

Opened: this repository

Blocked: none

Conclusion: the plate is Hendrick's Identity, so the hash is `#hendricks-identity`. `#hendrick` remains an alias. The identity stands: it was derived here, the check misses off the L=0 circle, and the closed form and min are not in the papers. A later agent may claim another result the same way (derive, check the papers, a plate whose check can miss, write IDENTITIES.md). It may not put a name on a published equation or on someone else's result.

Re-search: n/a

### 2026-09-19  `hendrick` renamed  query: (none)

Opened: this repository

Blocked: none

Conclusion: display name is Hendrick's Identity. Hash `#hendrick` is unchanged.

Re-search: n/a

### 2026-09-19  hendrick uniqueness  query: point vortex collapse dimensionless product omega t_c minimum sqrt(2) octant triangle; Aref 2010 three vortex collapse rate angular frequency product; Gröbli collapsing triangle tan theta 1/sqrt(2) 22.5 45 112.5; "self-similar collapse" vortices sqrt(2) omega t_c

Opened: Aref, Phys. Fluids 22, 057104 (2010), full PDF via VTechWorks bitstream 2b7fd3cf-09d3-4fe7-8558-a9948a899f1d. Krishnamurthy and Stremler 2018 postprint at people.iith.ac.in. Gröbli 1877 English translation arXiv:2404.01305 HTML. Search snippets for Kudela 2014, Reinaud and Dritschel 2022 Physica D 434 133226.

Blocked: AIP HTML paywall (PDF was used instead). Most journals.

Conclusion: the motion is Gröbli. Omega and tau separately are Aref 25a and 25d. The product as log-spiral pitch is Aref 29c. Collapse-time minima exist in Kudela 2014 and Reinaud 2022, of tau, not of omega tau. The closed form (2-cos^2 theta)/sin(2 theta) on Gamma=(1,1,-1/2) and unique min sqrt(2) at tan theta=1/sqrt(2) were not in those sources. That is Hendrick's identity: not Gröbli's motion under a new name, and not Aref's product under a new name.

Re-search: do not re-derive. Reopen only if a newly named paper states this closed form or this minimum.

### 2026-09-19  Tacchi / Kimura named in the identity writeup  query: Tacchi Dynamique des tourbillons dans les fluides bidimensionnels Appendix B Kimura 1988 vortex collapse coefficients

Opened: search snippets only. The identity writeup names M. Tacchi, Dynamique des tourbillons dans les fluides bidimensionnels, Appendix B, documenting related explicit coefficients in an example attributed to Kimura (1988).

Blocked: the thesis PDF itself.

Conclusion: named, not read. Reopen when the appendix can be opened. Do not treat a snippet as a reading of the coefficients. If that appendix already states omega_0 t_c = (2-cos^2 theta)/sin(2 theta) and the min sqrt(2) at tan theta = 1/sqrt(2), the uniqueness claim has to be revised the same day.

Re-search: reopen when Tacchi Appendix B or Kimura 1988 is in hand.

### 2026-09-20  second identity search  query: three vortex collapse omega t_c minimum circulation ratio (1, mu, -mu/(1+mu)); Leoncini Kuznetsov Zaslavsky fastest collapse 4pi/3; leapfrogging period translation speed product Love Tophøj Aref; Novikov-Sedov parallelogram four vortex collapse omega tau; Hasimoto kappa r_max torsion; Kida ellipse strain collapse; Kidambi Newton sphere collapse time angular velocity product; Crapper capillary steepness maximum energy; Kudela 2014 Reinaud Dritschel 2022 collapse time minimum

Opened: Aref 2010 PDF via VTechWorks (bitstream 2b7fd3cf-09d3-4fe7-8558-a9948a899f1d). Krishnamurthy and Stremler 2018 postprint at people.iith.ac.in (dimensionless tau-tilde = -sin B sin(A+B)/sin(A+2B), and hat-tau at fixed separation, plotted, not closed-form minimized in u = tan theta). Leoncini, Kuznetsov and Zaslavsky, arXiv physics/9908055 / Phys. Fluids 12, 1911 (2000): figure caption states a fastest collapse with tau = 4pi/3. Search snippets and HTML for Tophøj-Aref 2013, Behring-Goodman 2019/2022, Novikov-Sedov JETP 50, 297 (1979), Gotoda 2020, Hasimoto JFM 1972, Kida JPSJ 1981, Kidambi-Newton Physica D 1998, Crapper JFM 1957, Kudela Fluid Dyn. Res. 46, 031414 (2014), Reinaud-Dritschel-Scott Physica D 434, 133226 (2022). Direct Biot-Savart algebra on the L = 0 circle in this repo (2pi kernel).

Blocked: most journal HTML. Tacchi appendix still unread. Leoncini body text was font-encoded; the 4pi/3 statement is from the arXiv figure caption, not from a full re-typeset of every equation.

Conclusion: no second identity of Hendrick's bar shipped. On Gamma = (1,1,-1/2) the product splits as t_c = (pi/3)(4u + 1/u) and 2 pi omega = 3(2u^2+1)/(4u^2+1) with u = tan theta and |z1-z2| = 1. Those are Aref 25a/25d in this angle; they belong under Hendrick's Identity as factors, not as a new name.

Re-search: do not re-derive Hendrick. Do not claim the t_c minimum, the general-mu sextic, leapfrog silver/golden, Novikov-Sedov, Hasimoto 4, Kirchhoff 1/4, or Kidambi-Newton. Reopen only if a newly named paper states Hendrick's closed form or min, or if Tacchi Appendix B is in hand. A later algebraic, unpublished product with a unique interior extremum and a plate whose check can miss may still be claimed the same way Hendrick was.

### 2026-09-20  Leoncini 2000 fastest collapse  query: Leoncini Kuznetsov Zaslavsky "Motion of three vortices near collapse" tau 4pi/3 Lambda sqrt(3)/2 fastest

Opened: arXiv physics/9908055 PDF (saved). Search snippets of Phys. Fluids 12, 1911 (2000).

Blocked: AIP HTML. Body text of the PDF is font-encoded on this machine; caption text was readable via the arXiv HTML extract: "fastest collapse value Lambda = sqrt(3)/2" and "tau = 4pi/3".

Conclusion: the fastest collapse time in the standard normalization is already in that paper. IDENTITIES.md records the factor formulas under Hendrick's Identity and does not claim the t_c bound. Hendrick's product min sqrt(2) at tan theta = 1/sqrt(2) is a different extremum (scale-invariant) and was not found in this paper's extracted captions.

Re-search: skip unless a full text extract is needed to check whether they also minimize omega t_c. If they do, revise Hendrick uniqueness the same day.

### 2026-09-20  literature-first identity hunt  query: "omega t_c" OR "ω t_c" OR "Ω τ" three vortices collapse minimum sqrt(2); leapfrogging vortex pairs golden ratio Tophøj Aref Behring Goodman; photon sphere Lyapunov exponent orbital frequency ratio Schwarzschild; Kirchhoff elliptical vortex maximum angular velocity aspect ratio; Crapper capillary wave energy maximum Hogan; Gerstner wave kinetic potential energy ratio; three point vortices on a sphere collapse Kidambi Newton; Tacchi Dynamique des tourbillons Appendix B Kimura pdf

Opened: web search result snippets and reachable HTML. arXiv abs/pdf for physics/9908055, 1908.08618 (Behring-Goodman), 2410.14973 (Gotoda enstrophy). Krishnamurthy-Stremler 2018 postprint at people.iith.ac.in. St Andrews GAFD preprint 10023/24112 (Reinaud QG collapse, numerical τ min ≈ 0.3657). JETP Novikov-Sedov PDF at jetp.ras.ru. Kidambi-Newton 1998/1999 abstracts (collapse times and partner states on the sphere). Kirchhoff Ω = ω ab/(a+b)² in AMS glossary and Love. Photon-sphere λ = 1/(3√3 M) in Cardoso-lineage reviews and arXiv 2307.06415. Crapper/Hogan JFM 1979 energy integrals. Henry "Gerstner's water wave and mass transport" (T = V). IOP plasma-book extract with a different-family τ_c = (5−3 cos 2θ) ℓ²/(12 sin 2θ), min at θ = ±½ arccos(3/5).

Blocked: Tacchi thesis PDF still unread. Kimura 1988 Fluid Dyn. Res. 3, 98 is a two-page conference note on complex-time singularities, not a coefficient table. Most journal HTML.

Conclusion: no second identity of Hendrick's bar. The nearby beautiful locks are published (table above). Hendrick's closed form (2−cos²θ)/sin(2θ) and min √2 at tan θ = 1/√2 were not in those sources. Search first; do not rediscover.

Re-search: skip the rows in the published-locks table unless a newly named paper appears. Reopen Tacchi Appendix B / Kimura 1988 coefficients when the files can be opened. Reopen Hendrick uniqueness only if a newly named paper states that closed form or that minimum.

### 2026-09-20  five-vortex quincunx product  query: Gotoda 2002.09624 eq 3.13 five vortex A(theta) B(theta) gamma_3; Novikov-Sedov JETP 50 297 five vortex parallelogram plus center t_* omega; "3 sqrt(33)/16" OR 3√33/16 vortex collapse; "cos 2θ" "4/7" vortex collapse minimum; Gotoda 2410.14973 enstrophy five vortex Hamiltonian against collapse rate; mu=3 five vortex recovers (3-cos 2θ)/(2 sin 2θ)

Opened: Gotoda arXiv 2002.09624 HTML (ar5iv) section 3.2 / eq. (3.13) for A(θ), B(θ) on the parallelogram, including γ3; conditions (3.11)–(3.12) I = 0, Γ_H = 0. Gotoda arXiv 2410.14973 HTML: numerical enstrophy on the four- and five-vortex Novikov-Sedov families, plots of H vs A, no product min. Novikov-Sedov JETP PDF extract: t_* and ω separately. Full-text extract /tmp/gotoda.txt: no 4/7, no √33, no ω t_c, no −B/(2A) as a minimized product. Web search for 3√33/16 and cos 2θ = 4/7 as a vortex lock: no hits. Direct Biot-Savart algebra on Γ = (−1, −1, 1/2, 1/2, −3/4), d1/d2 = 1/√2 (2π kernel) matches ω t_c = (3/16)(7 − 4 cos 2θ)/sin(2θ). Critical point of (7 − 4 cos φ)/sin φ is cos φ = 4/7, min √33, hence 3√33/16. Plate `#quincunx-lock` lock 1.000, broken misses. The μ = 3 five-vortex slice recovers Hendrick's (3 − cos 2θ)/(2 sin 2θ) ≥ √2 identically; logged and not claimed.

Blocked: most journal HTML. Tacchi appendix still unread.

Conclusion: a third identity of Hendrick's bar. Gotoda states A(θ) and B(θ) separately and does not form the product or its unique interior min. Novikov-Sedov state the motion, t_*, and ω separately. Do not claim those. Do not put Hendrick's name on this plate.

Re-search: do not re-derive. Reopen only if a newly named paper states ω t_c = (3/16)(7 − 4 cos 2θ)/sin(2θ) or min 3√33/16 at cos 2θ = 4/7.

### 2026-09-20  hunt outside Novikov-Sedov  query: self-similar four vortex collapse isosceles (1,1,1,-1) closed form omega t_c; Novikov Sedov five vortex golden ratio diagonal mu phi product minimum; Kallyadan Shukla 2022 self-similar vortex configurations closed A(theta); O'Neil 1987 explicit four vortex collapse family; hollow vortices arXiv:2506.04093 collapsing quadruple omega kappa product; point vortices half-plane wall image self-similar collapse exact; three point vortices periodic strip collapse; Gotoda 2410.14973 theta_Z closed form; three vortex collapse product min circulation ratio mu sqrt(17/15)

Opened: Gotoda arXiv 2002.09624 HTML (ar5iv) eqs. (3.3)–(3.8), (3.13), §4.1 uniform-strength family. Gotoda arXiv 2410.14973 HTML: θ_Z is a 200-point grid bracket. Hollow-vortices arXiv:2506.04093 HTML examples 4.2 (triple) and 4.3 (O'Neil quadruple): single configs, published Ω and 1/κ. Kallyadan–Shukla Phys. Rev. Fluids 7, 114701 (2022) abstract: numerical families. Donati–Godard-Cadillac–Iftimie arXiv:2403.17900: same-sign boundary collapse impossible. Aref 1996 periodic-strip abstract: integrable motion, not a collapse product. Direct Biot-Savart (2π kernel, same as the identity plates) on the remaining exact families and on (1,1,1,−1) isosceles, kite, trapezoid, and equilateral-plus-interior.

Blocked: most journal HTML. Tacchi appendix still unread. Kallyadan–Shukla body behind APS lock.

Conclusion: no fourth identity of Hendrick's bar. Distinguished five-vortex μ other than 1/2, 2, 3, 2±√3 have messy minima; μ = 2+√3 recovers the parallelogram lock (γ3 = 0). Three-vortex μ ≠ 1 is a cubic critical point (already logged). (1,1,1,−1) and the other four-vortex symmetric scans had no self-similar L = 0 family. O'Neil / hollow-vortex examples are single published configs. Numerical families and grid-bracketed angles are not closed forms. Do not claim these. Do not put Hendrick's name on them.

Re-search: skip the rows in the table above unless a newly named paper states a closed ω t_c and its unique interior min on one of those families. Reopen Tacchi Appendix B / Kimura 1988 coefficients when the files can be opened.

### 2026-09-20  hunt outside planar point-vortex collapse  query: Kidambi Newton spherical three vortex collapse angular velocity product omega t_c; Love 1894 leapfrogging period elliptic integral translation speed product; Tophøj Aref leapfrogging period translation; SQG point vortex collapse self-similar closed form; Moore Saffman elliptical vortex strain aspect ratio e/omega; Hasimoto vortex filament kappa max torsion speed; Peregrine rogue wave max amplitude 3; Stuart vortices Mallier-Maslowe energy circulation; Calogero goldfish point vortices identity; heton collapse two-layer point vortices closed form; Thomson vortex N-gon plus center; Tacchi Dynamique des tourbillons Appendix B

Opened: Kidambi–Newton Nuovo Cimento C 22, 779 (1999) PDF (eprints.bice.rm.cnr.it/13666/1/ncc8137.pdf): partner-state collapse times; each vortex has a distinct azimuthal velocity. Tophøj–Aref Phys. Fluids 25, 014107 (2013) extract: Love period T_lf in complete elliptic K, E; existence α = 3−2√2; stability α = φ^{-2}. Behring–Goodman arXiv 1908.08618 / 2210.16464: same published locks. Badin–Barry PRE 2018 and Reinaud GAFD 2020 / Physica D 2022 snippets: SQG collapse, numerical τ min. Moore–Saffman 1971 snippets: e/ω₀ < 0.15. Hasimoto JFM 1972: c = 2τ. Peregrine / Akhmediev reviews: |u|_max = 3. Mallier–Maslowe / Stuart: Γ independent of concentration. Aref–van Buren 2005: unique centered N-gon. Calogero goldfish papers: isochrony. Hollow-vortices arXiv:2506.04093 already logged.

Blocked: Tacchi thesis PDF still unread. Most journal HTML. Kallyadan–Shukla body still behind APS lock.

Conclusion: no fourth identity of Hendrick's bar. The nearby 1-parameter exact families either have a published extremum, a numerical min, or a period in elliptic integrals rather than a simple radical. Do not claim Love's T(α), Kidambi–Newton's t_c, Peregrine's 3, Moore–Saffman's 0.15, or Thomson's uniqueness. Do not put Hendrick's name on them.

Re-search: skip the new rows in the candidate table and the published-locks table unless a newly named paper states a closed dimensionless product and its unique algebraic interior min on one of those families. Reopen Tacchi Appendix B / Kimura 1988 coefficients when the files can be opened. A later algebraic, unpublished product with a unique interior extremum and a plate whose check can miss may still be claimed the same way Hendrick was.

### 2026-09-20  hunt H-states, sphere four-vortex, Kaden, three rings  query: Crowdy H-states rotating hollow vortex angular velocity deformation closed form minimum; Baker Saffman Sheffield hollow vortex row perimeter length maximum; Aref Stremler point vortices periodic parallelogram self-similar collapse; Sakajo four point vortices on a sphere collapse; Kaden spiral vortex sheet self-similar; Borisov Mamaev Kilin three vortex rings leapfrogging period closed form; Tacchi Dynamique des tourbillons dans les fluides bidimensionnels Appendix B pdf

Opened: Crowdy–Nelson–Krishnamurthy JFM 913 R5 (2021) postprint at people.iith.ac.in: Ω(a,N) is eq. (3.11), relative equilibrium. BSS 1976 / Baker 1980 snippets: hollow-row energetics and non-monotonic perimeter. Stremler–Aref JFM 392, 101 (1999) abstract: integrable three-vortex motion in a parallelogram, not collapse. Sakajo Phys. Fluids 19, 017109 (2007) PDF (eprints.lib.hokudai.ac.jp): four-vortex self-similar collapse on a sphere is impossible; PRE 78, 016312 (2008): partial non-self-similar triple collapse, numerical. Kaden 1931 / Pullin algebraic spirals: r ∝ θ^{-μ}. Borisov–Kilin–Mamaev RCD 2013 / FDR 2014: threefold ring leapfrogging exists on Poincaré maps. Tacchi: still no thesis PDF; HAL/theses.fr hits were Rodrigues, Poupardin, Margerit, Soulière.

Blocked: Tacchi thesis PDF. Most journal HTML.

Conclusion: no fourth identity of Hendrick's bar. H-state Ω is Kirchhoff-class. Sphere four-vortex self-similar collapse is proved impossible. Kaden, three-ring leapfrog, and parallelogram three-vortex motion are published. Do not claim these. Do not put Hendrick's name on them.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min. Reopen Tacchi Appendix B when the file can be opened.

### 2026-09-20  hunt Kimura, Norbury, Pocklington, Lamb–Chaplygin, magnetic Gröbli  query: Kimura 1987 similarity solution two-dimensional point vortices coefficients A B; Kimura 1988 1990 complex-time collapse; point vortices in a wedge corner self-similar collapse Crowdy Tchieu; Norbury Fraenkel vortex ring speed core radius closed form minimum; Pocklington hollow vortex pair translation speed; Lamb Chaplygin dipole energy impulse; Komineas magnetic vortex three Gröbli collapse; Camassa-Holm periodic peakon train; point vortices hyperbolic plane collapse; Tacchi thèse tourbillons pdf

Opened: Kimura JPSJ 56, 2024 (1987) abstract: general similarity; regular triangle always exists; collinear is a cubic. Aref 2010 cites Kimura 1990 Physica D (complex-time) and Tavantzis–Ting 1988. Norbury 1973 / Fraenkel 1972 family is numerical; Hill has the lowest dimensionless energy. Crowdy–Llewellyn Smith–Freilich Eur. J. Mech. B 37 (2013): Pocklington U monotonic in area. Flor 1994 / Wikipedia: Lamb–Chaplygin kR = j_{1,1}, U_max/U_0 ≈ 2.49. Komineas–Papanicolaou JMP 51, 042705 (2010): magnetic three-vortex Gröbli analog, completely integrated. Nava-Gaxiola–Montaldi 2014: hyperbolic-plane relative equilibria. Crowdy EJAM 2004: vortex layers on wedges. Kudela 2014: numerical n-vortex. Camassa–Holm peakon c = amplitude is already `#peakon`. Tacchi: still no thesis PDF.

Blocked: Tacchi thesis PDF. Kimura 1987 body (JPSJ paywall). Most journal HTML.

Conclusion: no fourth identity of Hendrick's bar. Kimura 1987 is the similarity machinery already used for the three locks, not a new min. Norbury, Pocklington, Lamb–Chaplygin, magnetic Gröbli, and hyperbolic relative equilibria are published. Do not claim these. Do not put Hendrick's name on them.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min. Reopen Tacchi Appendix B and the Kimura 1987 body when the files can be opened.

### 2026-09-20  hunt BO, Platonic, Moffatt–Kimura, Burgers, Föppl  query: inverse-square algebraic 1/r kernel point vortices collapse; Degasperis-Procesi Novikov peakon speed amplitude; Benjamin-Ono algebraic soliton speed width; platonic vortex crystals sphere; two point vortices circular cylinder Föppl; Moffatt Kimura vortex filament collapse s kappa √2; Burgers vortex dissipation independent viscosity; Tacchi tourbillons thesis

Opened: Moffatt–Kimura arXiv:1811.03304 / JFM 2019: similarity of a filament pair, sκ = 2 sin α, equals √2 at α = π/4 (eq. 10.5); δ/s → 0.943. Burgers 1948: Φ = Γ²γ/8π independent of ν. Föppl 1913 locus r²−1 = 2ry. Benjamin–Ono: c = A/4, Δ = 4/A. DP/Novikov N-peakon formulas (Lundmark–Szmigielski). Platonic solids as spherical vortex equilibria (Tokieda; Jamalodeen–Newton 2006; J. Nonlinear Sci. 2022 periodic families). Two vortices + cylinder: Föppl / Borisov et al. 2021. Kudela n≥6 numerical already logged. Tacchi: still no thesis PDF.

Blocked: Tacchi thesis PDF. Most journal HTML.

Conclusion: no fourth identity of Hendrick's bar. Moffatt–Kimura's √2 is a published filament-pair relation at a chosen α, not Hendrick's planar three-vortex product. Burgers, Föppl, BO, DP/Novikov, and Platonic crystals are published. Do not claim these. Do not put Hendrick's name on them.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min. Reopen Tacchi Appendix B when the file can be opened.











