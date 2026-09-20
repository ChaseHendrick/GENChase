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
| Tacchi Appendix B / Kimura 1987–1990 | Named thesis "M. Tacchi, Dynamique des tourbillons dans les fluides bidimensionnels" is not in theses.fr, HAL, arXiv, or Google Scholar (checked 2026-09-20). The living M. Tacchi is Matteo Tacchi-Bénard (control theory / SOS, INSA Toulouse 2021); not vortex dynamics. Kimura JPSJ 56, 2024 (1987) is the general similarity solution (A, B; collinear 3-vortex is a cubic). Kimura Fluid Dyn. Res. 3, 98 (1988) is a two-page complex-time note, not a coefficient table. Kimura Physica D 46, 439 (1990) is complex-time singularities. Tavantzis–Ting 1988 is the 3-vortex revisit. Do not re-derive Kimura's cubic. Do not reopen Tacchi. |
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
| Euler elastica | Elliptic integrals (Euler 1744; nine shapes). Not an algebraic product min of two rates. |
| Delaunay unduloid / nodoid | H = 1/(a+c); neck and bulge explicit (Delaunay 1841). Elliptic generating roulette. |
| Catenoid–helicoid Bonnet family | Isometric 1-parameter associate family. Textbook. |
| Maclaurin spheroid | Ω²/(πGρ) has a numerical max 0.449331 at e ≈ 0.92996 (Maclaurin 1742). Jacobi bifurcation e = 0.812670. Not an algebraic floor. |
| Calogero–Moser equilibrium frequencies | ω_s² = 2s(n−s) (Calogero). Integer. Goldfish already logged. |
| KdV two-soliton phase shift | δ = (2/k) log\|(k₂+k₁)/(k₂−k₁)\|. Published. No interior algebraic min in μ = k₂/k₁. |
| Kerr ISCO | Closed cube-root formula (Bardeen–Press–Teukolsky). Photon-sphere λ/Ω_ph = 1 already logged. |
| ABC flow | Beltrami: H = k_u U²/2. Energy–enstrophy–helicity locked. |
| Stokes 120° / Michell highest wave | Crest angle 120° (Stokes 1880). H/λ ≈ 0.141 numerical. Speed–amplitude turning points numerical. |
| Wilton ripples | 1:2 gravity-capillary resonance. Existence published. |
| Toda 3-particle | Completely integrable; periods elliptic. Numerical orbit families. |
| Lagrange sleeping top | Stability λ² > 4 m g l I₁ / I₂³. Elliptic in the large. |
| Ginzburg–Landau κ = 1/√2 | Type I / II surface-energy zero. Abrikosov 1957. Isolated published lock. Do not claim. |
| 4-body kite / rhombus CC | Unique convex kite for given masses (Leandro; Roberts 2025). Rhombus φ(μ) is a degree-12 polynomial. Homographic motion is Keplerian. Roberts infimum m₁/(m₂+m₃+m₄) = (25+3√69)/2 is Routh's restricted 3-body mass in a limiting kite. Isolated, published. |
| Laplacian growth / Hele-Shaw | Polynomial maps form a cusp at closed t₀. Saffman–Taylor selects λ = 1/2 (Combescot; Mineev-Weinstein). Isolated. |
| Kapitza inverted pendulum | (a/l)(ω/ω₀) > √2 (Stephenson 1908; Kapitza). Published threshold, not a 1-param product min of two dynamical rates. Do not claim Hendrick's √2. |
| Jeffery orbits | T γ̇ = 2π(r + 1/r). Unique min 4π at r = 1 by AM-GM (Jeffery 1922). Published. |
| Rayleigh–Plateau slender | Most-unstable λ = 2π√2 R (inviscid slender). Exact max is a Bessel root kR ≈ 0.697. Published. |
| Cotes inverse-cube spirals | Finite-time fall when μ > h² (Cotes 1722). Trajectories closed. Not a product min. |
| Gold–Hoyle flux tube | Uniform twist. Energy vs twist: numerical. |
| Kirchhoff–Routh in a domain | Equilibria of N vortices in a bounded domain (Crowdy 2005; Kuhl). Existence, not a collapse product. |
| Von Kármán street | Isolated published lock: b/l = arcosh(√2)/π ≈ 0.2806; U = Γ/(l√8) at that ratio (von Kármán 1911). Crowdy–Green 2011 hollow streets: special aspect ~0.34–0.36 is numerical. Do not claim. |
| Saffman–Szeto / Pierrehumbert pairs | 1-parameter corotating and translating patches. Endpoint is touching (Sadovskii). Numerical. Ω ∈ (0, γ/2) (global bifurcation, Hassainia–Wheeler). Not algebraic. |
| Deem–Zabusky V-states | m-fold rotating patches. Bifurcation Ω_m = (m−1)/(2m) from Rankine (Kelvin). Limiting shapes numerical. Hassainia–Hmidi SQG V-states exist, explicit Ω at bifurcation. Relative equilibria. |
| Sadovskii vortex pair | Touching translating pair. Existence 2025 (Choi–Sim–Jeong, Annals of PDE; arXiv:2507.00910). Speed W_p variational, not a closed algebraic min of two rates. |
| Ptolemaic / Abrashkin–Yakubovich | Exact Euler: z = f(s)e^{iω₁t} + g(s̄)e^{iω₂t}. Contains Gerstner and Kirchhoff as cases (already logged). Two free frequencies, not a unique interior product min. |
| Guderley converging shock | Similarity exponent λ is an ODE eigenvalue (Guderley 1942). γ=1.4 sphere λ ≈ 1.3944 (numerical). Self-similarity of the second kind. Not algebraic. |
| Crow instability | Most-unstable λ/b ∈ [6,10] depending on a/b (Crow 1970; Leweke–Le Dizès–Williamson). Bessel cut-off. Numerical max. |
| Havelock n-gon | Point-vortex n-gon stable for N<7, N=7 marginal, N>7 unstable (Thomson; Havelock 1931). Finite-core: N≥7 unstable (Saffman). Ω = (n−1)κ/(4π a²) published. Relative equilibrium. |
| McGehee triple collision | Blow-up of n-body total collision. 10 fixed points on the collision manifold. Homothetic Lagrange/Euler arcs. Not a 1-param product min. |
| Chaplygin 1899/1903 dipoles | Elliptical patch in shear (Moore–Saffman/Kida, already); translating dipole; non-symmetric dipole on a circle (Meleshko–van Heijst 1994). Isolated exact Euler. |
| Two vortex pairs past a cylinder | Symmetric equilibria: degree-14 polynomial in the position (Lopes). Always unstable to antisymmetric modes. Relative equilibria. |
| Lane–Emden polytropes | Exact for n = 0, 1, 5: ξ₁ = √6, π, ∞ (Lane 1870; Emden 1907). Isolated published. Other n numerical. |
| Sedov–Taylor–von Neumann blast | R = β (E t²/ρ₀)^{1/5}. D t / R = 2/5. β(γ=1.4) ≈ 1.033 numerical. Isolated published. |
| BKT / Kosterlitz–Thouless | k_B T_c = π J / 2; universal jump ρ_s(T⁻)/T = 2/π (Kosterlitz–Thouless 1973). Isolated published lock. Do not claim. |
| Figure-eight three-body | Moore 1993; Chenciner–Montgomery Ann. Math. 2000. Variational existence. Period by Kepler scaling. Numerical, not algebraic. |
| Miche / Penney–Price standing wave | Limiting crest 90° (Penney–Price 1952; Taylor 1953). Steepness numerical (~0.627). Progressive 120° already logged. |
| Lundquist force-free | B_z = B₀ J₀(α r), B_θ = B₀ J₁(α r). Reversal at j_{0,1} ≈ 2.4048 (Lundquist 1950). Isolated Bessel. Gold–Hoyle already logged. |
| Ritter dam-break | u_front = 2√(g h₀), rarefaction −√(g h₀) (Ritter 1892). Isolated published. Not a 1-param product min. |
| Aref tripole | Γ = (1, 1, −2) collinear or equilateral relative equilibrium. Published Ω (Aref; van Heijst–Kloosterziel). Not collapse. |
| Novikov vortons | 3D discrete-filament analog. Homogeneous collapse under the same L = 0, I = 0 conditions (Novikov 1983 JETP). Same 2D skip. |
| Widnall vortex-ring instability | One unstable azimuthal mode; wave number set by core size (Widnall–Bliss–Tsai 1973/1974). Numerical / Bessel. Crow already logged. |
| Euler collinear three-body | Fifth-degree in z = R₂₃/R₁₂. Homographic Kepler. Not a product min. Roberts kite already logged. |
| Sitnikov problem | Restricted 3-body on the axis. Circular case elliptic; e > 0 chaotic (Sitnikov 1960; Alekseev). Not algebraic. |
| Roche lobe / Hill sphere | Shape vs q numerical. Eggleton r₁/A = 0.49 q^{2/3}/(0.6 q^{2/3}+ln(1+q^{1/3})) is a fit, not a product min. L1 is a published saddle. |
| Chandrasekhar mass | Ultra-relativistic n=3 Lane–Emden (already logged). M_Ch ≈ 1.4 M_⊙ numerical. Isolated published. |
| Jeans / Toomre Q | λ_J = c_s √(π/Gρ). Q = c_s κ /(π G Σ) ≥ 1 (Toomre 1964). Isolated published stability threshold, not a 1-param product min. Do not claim. |
| Noh implosion | Uniform inflow, accretion shock at constant D. Density jump ((γ+1)/(γ−1))^n. Isolated published. Guderley already logged. |
| Barenblatt dipole / PME | Self-similar first-kind (Barenblatt–Zel'dovich 1957). Second-kind anomalous exponent when capillary retention. Not a vortex-collapse product. |
| Carrier–Greenspan | Hodograph linearizes NSWE on a slope. Runup R = 2 η_max for one family; Bessel J₀ standing wave. Isolated published / elliptic. Ritter already logged. |
| Nekrasov wave | Nonlinear integral equation for Φ(θ). Highest progressive 120° already logged (Stokes). Steepness numerical. |
| Davey–Stewartson lumps / dromions | Exact 2+1 lumps (Davey–Stewartson 1974). KP lump already `#lump`. Phase shifts published. |
| Tkachenko waves | Vortex-lattice displacement waves. ω ∝ k (slow) or k² (quantum Hall). Baym 2003; Andereck–Glaberson 1982. Published dispersion. |
| Schubart orbit | Collinear 3-body, two binaries per period (Schubart 1956). Existence variational. Numerical period. Figure-eight already logged. |
| Batchelor q-vortex / Sullivan | Exact NS. Batchelor 1964 trailing vortex; Sullivan 1959 two-cell. Burgers already logged. Isolated exact. |
| Prandtl–Batchelor | Closed-streamline vorticity is constant as Re → ∞ (Prandtl 1904; Batchelor 1956). A theorem, not a product min. |
| Rayleigh–Bénard | Free-free Ra_c = 27π⁴/4 at k d = π/√2 (Rayleigh 1916). Isolated published. Rigid-rigid Ra_c ≈ 1707.76 numerical. Not a 1-param product min. Do not claim. |
| Taylor–Couette | Thin-gap Ta_c ≈ 1708 (Taylor 1923). Same number as rigid-rigid Ra. Isolated published threshold. |
| Landau damping / two-stream | Collisionless Vlasov. Two-stream growth from a cold-beam cubic. Landau γ from the Landau contour. Published kinetic theory, not an algebraic interior min of two rates. |
| Rossby / Eady | L_d = N H / f. Eady max growth k c_i / σ_E ≈ 0.31 at μ ≈ 1.61 (Eady 1949). Numerical max. Isolated published length. |
| Onsager negative T | Bounded phase space → T < 0 (Onsager 1949). Joyce–Montgomery mean-field. Critical β* < 0. Statistical, not a collapse product. |
| Hill lunar | Variational orbit is a Fourier/power series in m (Hill 1878). Not a finite formula. Sitnikov / Euler collinear already logged. |
| Feynman–Onsager | Superfluid circulation κ = h/m (Onsager 1949; Feynman 1955). Isolated published quantum. |
| Alfvén | v_A = B / √(μ₀ ρ). Isolated published speed. Magnetosonic √(v_A² + c_s²) at θ = π/2. Not a 1-param product min. |
| Gotoda unused NS | Closed A(θ), B(θ) exist only for 3-vortex, parallelogram 4, and five-vortex (arXiv:2002.09624 §§3.1–3.2). N≥6 and (1,1,1,−1) are numerical H-A curves. Novikov–Sedov 1979: exact 3, 4, 5 only. No unused closed family. |
| Rott 1994 doubly periodic four | Vanishing mass, moments, polar inertia. Integrable. Two periods (configuration plane and absolute). Winding number = their ratio. Abstract: "simple closed-form results"; path patterns still numerical. Not a unique unpublished algebraic interior min of a 1-param product. Leapfrog already logged. |
| Eckhardt 1989 integrable four | Vanishing total circulation and impulse. Reduced 1DOF. Periods elliptic (Love-class). Not a floor like √2. |
| Jeffery–Hamel | Exact NS in a wedge. Critical α_c = K(k²)/m², complete elliptic (Rosenhead; Fraenkel). tan 2β = 2β has β* ≈ 2.247. Not algebraic. |
| Rolling disk (Routh) | Steady lean α, precession Ω, spin ω. Routh 1905; O'Reilly. Critical lean arctan of a nested radical ≈ 71.4° (uniform disk). Isolated published stability threshold, not a 1-param product min. |
| Double pendulum | Small-oscillation ω±. Equal mass/length: √(2±√2) √(g/l), product √2 g/l. Textbook. Vs length ratio λ, product ω+ω− = √((1+M)/λ) monotonic. Isolated published. Do not claim. Do not put Hendrick's name on this √2. |
| Fadeev sheet | Exact MHD 1-param islands (Fadeev 1965). Harris f=0 end. Like Stuart for MHD. Isolated published family, no unpublished product min. |
| Larichev–Reznik modon | β-plane dipole. Interior Bessel, exterior K. Lamb–Chaplygin already logged. Isolated published. |
| Critical catenoid | w = coth w. Transcendental, Kapitza-class. Volume (π/2)R²h at threshold is a corollary of the same root. Isolated. |
| Chaplygin sleigh / Clebsch | Nonholonomic or rigid-body-in-fluid. Integrable cases (Kirchhoff, Clebsch, Kovalevskaya, Goryachev–Chaplygin). Periods elliptic/hyperelliptic. Lagrange top already logged. |
| gSQG / α-Euler | Badin–Barry 2018; Reinaud Physica D 2022. Three-vortex collapse exists; SQG can be non-self-similar. Tables of t_c numerical. 2D Euler slice is Hendrick. Not a new algebraic floor. |
| Massive point vortices | Zbarsky arXiv:2402.07316: collapse impossible under mass conditions. Opposite of a fourth row. |
| Hollow-vortex implosion | arXiv:2506.04093 desingularizes existing point-vortex collapses. No new closed A, B. |
| Vortices on surfaces | Sphere already Kidambi. Ellipsoid / bean (Proc. A 2015): Green's functions not closed. No unused collapse product. Cone NS (Phys. Fluids 25, 2147, 1982) is a 2-param exact family, existence numerical. Wedge already logged. |
| Zipoy–Voorhees | Photon r = (2+1/γ)M, ISCO (3+1/γ ± √(5−1/γ²))M. Isolated published radii vs deformation. Extreme Kerr already logged. Not a 1-param product of two rates. |
| Prandtl punch | q = 2k(1+π/2). Isolated published 1920. |
| Kasner | Lifshitz–Khalatnikov u. Two constraints, three exponents. Published parametrization. Product of three expansion rates is not a two-rate identity. Do not claim. |
| Camassa–Holm 2-peakon | Phase shift 2 ln\|1−λ1/λ2\| (Camassa–Holm 1993). KdV 2-soliton already logged. Peakon already in the studio. |
| Chen–Walsh–Wheeler 2025 hollow implosion | arXiv:2506.04093. First rigorous self-similar collapsing hollow vortices. Single circular: U_c(γ, Ω, κ) explicit; Ω and κ independent, no shape-parameter product min. Multiple: generic desingularization of existing point-vortex collapses (the three locks). Not a fourth row. Cite as the Euler realization of Hendrick / parallelogram / quincunx. |
| Grotto–Pappalettera 2025 gSQG | arXiv:2505.19782. Self-similar Z(t) = ((4−α)a(t−t0))^{1/(4−α)} exp(i(θ0+b/((4−α)a) log)). a, b not closed in shape. α=2 is 2D Euler (Hendrick). α=1 SQG: numerical example. Existence, not a floor. |
| White–McDonald 2025 sheets | Proc. R. Soc. A 481, 20250362. Exact vortex-sheet equilibria by conformal mapping. 1-param γ; properties from a numerical algebraic equation. Not a closed two-rate min. |
| PRFluids 2025 four-vortex RE | Phys. Rev. Fluids 10, 084708. Continua of relative equilibria, not collapse. |
| Nested two-triangle 6-vortex | Positions r e^{2πik/3} (+1) and ρ e^{i(2πik/3+θ)} (−μ), I=0 ⇒ r=√μ ρ. Biot–Savart: A+iB on the + triangle disagrees with A+iB on the − triangle for every θ scanned (μ=1, 1/2, 2). Not a self-similar family. Matches Chen–Walsh–Wheeler: collapsing configs do not display reflection symmetries. n-body analog is Bhusal 2020 CCs, not vortices. Do not re-derive. |
| BEC two-vortex trap | ω(b) of a rigidly rotating pair has a published global min (Navarro; Pelinovsky Proc. A). One rate vs separation, not a product of two. Tkachenko already logged. |
| Hicks doughnut | Hollow ring with swirl. Thin-core series (Hicks 1884; Saffman 1970). Norbury–Fraenkel already logged. |
| Fukumoto–Miyazaki | Filament + axial flow. Permanent form = elastica (already logged). Hasimoto already in the studio. |
| Coaxial leapfrog rings | Helmholtz 1858. 3D Euler existence: CPAM 2024; García–Hassainia–Hmidi arXiv:2603.21644 (Mar 2026). KAM/Nash–Moser, not an algebraic floor. Love leapfrog already logged. |
| 3-vortex μ≠1 cubic | Gotoda A,B closed for Γ_H=0. μ=1 recovers Hendrick √2. Reciprocal pairs share the product (μ ↔ 1/μ): μ=1/2 and 2 give min |B/2A|≈1.741 (cubic crit, not a floor like √2). Same 3-vortex family as Hendrick, not a new row. Do not claim. Computed 2026-09-20 from Gotoda (3.3) plus M=0. |
| Gallay–Sverak 2026 | arXiv:2609.10847 (9 Sep 2026). Hopf/ζ reduction, new energy inequalities H(ζ_A)>H(ζ_B), near-collision regularization. Not a two-rate product min. Cite; do not claim. |
| Rott 1994 body | Still AIP-blocked. Abstract: winding number = ratio of two periods; "beyond a certain level of the analysis, still the more practical method of solution" is step-by-step integration. No unpublished algebraic interior min extracted. Leapfrog already logged. |
| Möbius / Klein vortices | Balabanova–Montaldi Physica D 488, 135084 (Apr 2026); arXiv:2202.06160v3. One/two vortex motion, N-ring RE with coth/tanh angular velocities. Two-vortex fixed equilibria: nested-radical y. No collapse product. Catenoid coth already logged. |
| Four bugs / mice | Square: isolated T=L/v. Parallelograms stay parallelograms then converge to a square (Chapman–Trefethen Proc. A 2011; Golich et al.). Not a self-similar 1-param with two-rate floor. |
| C-metric | Photon surface algebraic in acceleration α. Isolated published radii. Extreme Kerr already logged. |
| Three-heton | Two-layer analog of 3-vortex. No closed unused A, B found. gSQG already logged. |

Do not re-derive these. Do not put Hendrick's name on a μ ≠ 1 three-vortex product. Do not put Hendrick's name on a distinguished-μ five-vortex slice, on O'Neil's quadruple, on a numerical family, on Love's elliptic period, on Kidambi–Newton's spherical t_c, on Peregrine's 3, on Moore–Saffman's 0.15, on Crowdy's H-state Ω, on Kaden's spiral, on Kimura's cubic, on Lamb–Chaplygin's j_{1,1}, on Hill's energy min, on Moffatt–Kimura's sκ = √2, on Burgers' Φ, on Föppl's locus, on Maclaurin's Ω max, on Ginzburg–Landau's 1/√2, on Kapitza's √2, on Jeffery's 4π, on Routh's (25+3√69)/2, on Saffman–Taylor's 1/2, on von Kármán's arcosh(√2)/π, on BKT's π/2, on Toomre's Q = 1, on Rayleigh's 27π⁴/4, or on the double-pendulum √2.

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
| Ginzburg–Landau type I / II | κ = λ/ξ = 1/√2 (Ginzburg–Landau 1950; Abrikosov 1957). Isolated. Not Hendrick. |
| Maclaurin spheroid Ω max | Ω²/(πGρ) ≈ 0.449331 at e ≈ 0.92996 (1742). Numerical, not algebraic. |
| Stokes 120° crest | Highest gravity wave. H/λ ≈ 0.141 numerical (Michell; Toland). |
| Kerr ISCO | Bardeen–Press–Teukolsky cube-root formula. Photon-sphere λ/Ω already logged. |
| Routh / kite CC mass | (25+3√69)/2 (Roberts 2025, from Routh 1875). Isolated. |
| Kapitza product | (a/l)(ω/ω₀) > √2. Threshold, not Hendrick. |
| Jeffery T γ̇ | min 4π at a sphere (1922). |
| Saffman–Taylor | λ = 1/2. Isolated. |
| Rayleigh–Plateau slender | λ = 2π√2 R. |

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

### 2026-09-20  hunt outside vortex dynamics  query: Euler elastica closed form product tension curvature; Delaunay unduloid nodoid 1-parameter mean curvature neck; catenoid helicoid Bonnet associate family pitch radius product; Calogero-Moser frequencies product; Maclaurin Jacobi ellipsoid angular velocity eccentricity maximum; KdV two-soliton phase shift 1-parameter; Kerr ISCO photon sphere Lyapunov; ABC flow helicity energy; Wilton ripples Stokes 120 highest wave; Toda lattice three particle period; Lagrange top sleeping; Ginzburg-Landau kappa 1/sqrt(2)

Opened: Euler 1744 elastica (elliptic; nine shapes). Delaunay 1841: H = 1/(a+c), neck/bulge explicit. Catenoid–helicoid isometric associate family (textbook). Maclaurin 1742: Ω²/(πGρ) max 0.449331 at e ≈ 0.92996, Jacobi bifurcation e = 0.812670 — numerical, not algebraic. Calogero: ω_s² = 2s(n−s) at equilibrium. KdV 2-soliton δ = (2/k) log|(k₂+k₁)/(k₂−k₁)|, no interior min in μ. Kerr ISCO: Bardeen–Press–Teukolsky cube roots; photon-sphere λ/Ω_ph = 1 already a published lock. ABC: Beltrami H = k_u U²/2. Stokes 120° (1880); H/λ ≈ 0.141 Michell/Toland numerical; speed–amplitude turning points numerical. Wilton 1:2 resonance existence published. Toda 3-particle integrable, elliptic. Lagrange sleeping-top stability λ² > 4mgl I₁/I₂³. Ginzburg–Landau κ = λ/ξ = 1/√2 is the type I/II criterion (Abrikosov 1957).

Blocked: Tacchi thesis PDF.

Conclusion: no fourth identity of Hendrick's bar. Other areas (elastica, CMC, gravity, integrable N-body, GR, superconductivity, water waves, rigid body) yield published numbers or elliptic/numerical extrema. Do not claim Ginzburg–Landau's 1/√2. Do not put Hendrick's name on any of this.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt n-body, Laplacian growth, Kapitza, Jeffery  query: rhombus kite four-body central configuration angular velocity closed form minimum; Laplacian growth Hele-Shaw cardioid cusp formation time; point vortices on a cone collapse; Kapitza pendulum inverted stability sqrt(2); homographic n-body collapse time angular velocity; Jeffery orbit period shear 2π(r+1/r); Rayleigh-Plateau 2π√2; Kirchhoff-Routh equilateral triangle; Cotes inverse cube; Saffman-Taylor finger 1/2; Gold-Hoyle energy twist

Opened: Roberts arXiv:2411.07867 / Nonlinearity 2025: unique convex kite CC; linear-stability infimum m₁/(Σothers) = (25+3√69)/2 ≈ 24.96, recovered from Routh's restricted 3-body ρ_r = (1−√69/9)/2 in a limiting kite. Waldvogel: rhombus φ(μ) is a degree-12 polynomial, unique in a π/4-neighbourhood. Homographic solutions reduce to Kepler in the scale (Scholarpedia; classical). Hele-Shaw polynomial maps: closed cusp time t₀ = A − 3/4 (2B)^{2/3}; Saffman–Taylor λ = 1/2 (Combescot 1986; Mineev-Weinstein 1998 exact without surface tension). Kapitza/Stephenson: (a/l)(ω/ω₀) > √2. Jeffery 1922: T γ̇ = 2π(r+1/r), min 4π at r=1 by AM-GM. Rayleigh–Plateau slender λ = 2π√2 R; exact inviscid max is a Bessel root kR ≈ 0.697. Cotes 1722 inverse-cube spirals, finite-time fall for μ > h². Crowdy 2005 Kirchhoff–Routh in multiply connected domains. Gold–Hoyle energy vs twist numerical. No cone-vortex A,B closed product.

Blocked: Kimura 1987 JPSJ body (403). Kimura 1988 FDR body (IOP 403).

Conclusion: no fourth identity of Hendrick's bar. Nearby named numbers — Kapitza √2, Jeffery 4π, Routh (25+3√69)/2, Saffman–Taylor 1/2, Rayleigh–Plateau 2π√2 — are published and are not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Do not claim these. Do not put Hendrick's name on them.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  Tacchi Appendix B catalogs  query: "M. Tacchi" "Dynamique des tourbillons dans les fluides bidimensionnels" Appendix B; Matteo Tacchi thèse tourbillons; theses.fr Tacchi; HAL Tacchi tourbillons; Kimura 1988 Fluid Dyn. Res. 3, 98; Kimura JPSJ 56, 2024 1987

Opened: theses.fr has no author Tacchi in fluids. HAL / theses.hal.science: no thesis of that title. Google Scholar / arXiv author Tacchi: Matteo Tacchi-Bénard only (moment-SOS, power-system stability, INSA Toulouse 2021; master's math Paris VI / Ponts / ENS Lyon). Kimura 1988 FDR 3, 98 abstract: two-page IUTAM note, collapse as singularities in the complex time plane; already logged as not a coefficient table. Kimura 1987 JPSJ 56, 2024 abstract: general similarity; rigid rotation vs collapse; regular triangle always exists; collinear from a cubic. Body paywalled (JPSJ 403). Gotoda JFM 2025 cites Kimura 1987 for z_m(t) = k_m √(2At+1) exp[i (B/2A) log(2At+1)] and t_c = −1/(2A); that product is Aref's pitch, not Hendrick's specialized min. RIMS kokyuroku 574 paper 06 (kurims 0574-06.pdf) is a Japanese soliton/Toda paper occupying pages 71–85, not Kimura's English title despite the CiNii page range.

Blocked: Kimura 1987 JPSJ body. Kimura 1988 FDR body.

Conclusion: there is no public Tacchi Appendix B to read. The citation named in IDENTITIES.md does not correspond to a deposited thesis. The document it was said to document (Kimura 1988) is the two-page complex-time note already skipped. Not a fourth row. Hendrick / parallelogram / quincunx stand. Do not cite the ghost thesis.

Re-search: do not reopen Tacchi. Reopen Kimura 1987 body only if a newly named source states Hendrick's closed form or min √2.

### 2026-09-20  hunt streets, V-states, Sadovskii, Ptolemaic, Guderley, Crow, Havelock, McGehee  query: von Karman vortex street spacing ratio arcosh sqrt(2); Saffman Szeto corotating vortex patches angular velocity minimum; Sadovskii vortex pair translation speed closed form; Ptolemaic vortices Abrashkin Yakubovich omega1 omega2; Guderley converging shock similarity exponent algebraic; Crow instability wavelength spacing; Havelock polygonal point vortices circle; McGehee isosceles triple collision blowup rate; Chaplygin oscillating vortex pair period; Deem Zabusky V-states limiting Omega; two vortex pairs circular cylinder collapse

Opened: von Kármán 1911 / encyclopediaofmath: b/l = arcosh(√2)/π ≈ 0.2806, U_vortex = Γ/(l√8) at that ratio. Isolated published lock. Crowdy–Green Phys. Fluids 23, 126602 (2011): hollow staggered streets, special aspect ~0.34–0.36 matching Saffman–Schatzman patch streets, numerical. Saffman–Szeto Phys. Fluids 23, 2339 (1980) and Pierrehumbert JFM 99, 129 (1980): 1-parameter pairs, patches deform until they touch. Hassainia–Wheeler PMC: global curve, Ω ∈ (0, γ/2), ends at vanishing angular velocity or self-intersection. Deem–Zabusky 1978 V-states: Kelvin Ω_m = (m−1)/(2m) at Rankine; limiting shapes numerical. Hassainia–Hmidi CMP 2015: SQG V-states exist, explicit Ω at bifurcation. Sadovskii 1971 / Saffman–Tanveer 1982: touching translating pair. Choi–Sim–Jeong arXiv:2507.00910 / Annals of PDE 2025: existence of Sadovskii patches, variational speed W_p, not a closed algebraic product min. Abrashkin–Yakubovich 1984 / Guimbard–Leblanc 2006: Ptolemaic z = f(s)e^{iω₁t}+g(s̄)e^{iω₂t}; contains Gerstner and Kirchhoff (already logged); two free frequencies. Guderley 1942: converging-shock exponent is an ODE eigenvalue (self-similarity of the second kind); Lazarus 1981 / Ramsey: γ=1.4 sphere λ ≈ 1.3944, not algebraic. Jang–Liu–Schrecker arXiv:2310.18483: existence of λ for γ∈(1,3]. Crow 1970 / Leweke–Le Dizès–Williamson ARFM: most-unstable λ/b ∈ [6,10] vs a/b, Bessel cut-off, numerical max. Havelock Phil. Mag. 1931: n-gon Ω = (n−1)κ/(4πa²), stable N<7. Saffman JFM 1992 finite-core: N≥7 unstable. Kurakin: n-gon in a disk, p = R₀²/R², critical p*_n. McGehee blow-up: 10 fixed points on the collision manifold; homothetic Lagrange/Euler arcs; isosceles subproblem. Not a product min. Meleshko–van Heijst JFM 272, 157 (1994): Chaplygin 1899/1903 elliptical patch in shear, translating dipole, non-symmetric dipole on a circle. Isolated exact Euler. Lopes: two pairs past a cylinder, degree-14 polynomial equilibria, unstable to antisymmetric modes. Kallyadan–Shukla 2022 (already logged): numerical self-similar families along closed curves.

Blocked: most journal HTML. Saffman–Szeto body. Chaplygin 1903 Russian original.

Conclusion: no fourth identity of Hendrick's bar. Von Kármán's arcosh(√2)/π is an isolated published lock, not a 1-parameter product of two dynamical rates. V-states, Sadovskii, Guderley, Crow, Havelock, McGehee, Ptolemaic, Chaplygin dipoles are published, numerical, or eigenvalue. Do not claim these. Do not put Hendrick's name on von Kármán's ratio.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt Lane-Emden, Sedov, BKT, figure-eight, Miche, Lundquist, Ritter, tripole, vortons, Widnall, Euler collinear, Sitnikov  query: Lane-Emden polytrope n=1 n=5 first zero; Sedov-Taylor blast R t^{2/5}; Kosterlitz-Thouless BKT T_c pi J / 2; figure-eight three-body Chenciner Montgomery period; Miche Penney-Price standing wave 90; Lundquist force-free Bessel; Ritter dam-break front 2 sqrt(gh); Aref vortex tripole angular velocity; Novikov vortons collapse; Widnall vortex ring instability wavelength; Euler collinear three-body fifth degree; Sitnikov period eccentricity

Opened: Lane–Emden n = 0, 1, 5 exact, ξ₁ = √6, π, ∞ (textbook; arXiv:1611.07202). Isolated published. Other n numerical. Sedov–Taylor–von Neumann: R = β (E t²/ρ₀)^{1/5}, D t / R = 2/5, β(γ=1.4) ≈ 1.033 (Wikipedia; Taylor 1950; Sedov). Isolated published. BKT: k_B T_c = π J / 2, universal jump ρ_s / T = 2/π (Kosterlitz–Thouless 1973; Nelson–Kosterlitz). Isolated published lock. Figure-eight: Moore 1993 numerical; Chenciner–Montgomery Ann. Math. 152, 881 (2000) variational existence; Kepler scaling of T; not algebraic. Miche / Penney–Price 1952: limiting standing crest 90° (Taylor 1953 experiment); steepness numerical ~0.627 (Okamura; Mercer–Roberts). Progressive 120° already logged. Lundquist 1950: B_z = B₀ J₀(α r), reversal at j_{0,1} ≈ 2.4048. Isolated Bessel. Gold–Hoyle already logged. Ritter 1892: u_front = 2 √(g h₀), rarefaction −√(g h₀). Isolated published. Aref tripole: Γ = (1,1,−2) relative equilibrium, published Ω (van Heijst–Kloosterziel; Aref Advances in Applied Mechanics). Not collapse. Novikov 1983 JETP 57, 566: vortons, homogeneous collapse under the same L = 0, I = 0 conditions as the 2D skip. Widnall–Bliss–Tsai Proc. R. Soc. A 1973/1974: one unstable azimuthal mode, wavenumber set by core size. Numerical / Bessel. Crow already logged. Euler collinear: fifth-degree in z = R₂₃/R₁₂ (Euler 1767). Homographic Kepler. Roberts kite already logged. Sitnikov 1960 / Alekseev: circular case elliptic integrals; e > 0 chaotic symbolic dynamics. Not algebraic.

Blocked: most journal HTML. Novikov 1983 JETP body beyond the collapse-condition snippet.

Conclusion: no fourth identity of Hendrick's bar. Lane–Emden π, Sedov 2/5, BKT π/2, Ritter 2, Lundquist j_{0,1} are isolated published locks, not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Figure-eight, Miche steepness, Widnall, Sitnikov are numerical or elliptic. Tripole and vortons are the 2D skip in another coat. Do not claim these. Do not put Hendrick's name on BKT's π/2.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt Roche, Chandrasekhar, Jeans, Toomre, Noh, Barenblatt, Carrier-Greenspan, Nekrasov, Davey-Stewartson, Tkachenko, Schubart, Batchelor, Sullivan, Prandtl-Batchelor  query: Roche lobe Eggleton formula Hill sphere; Chandrasekhar white dwarf limiting mass; Jeans length Toomre Q criterion; Noh problem implosion similarity; Barenblatt porous medium dipole; Carrier-Greenspan runup; Nekrasov integral equation highest wave; Davey-Stewartson lump dromion; Tkachenko waves vortex lattice; Schubart orbit collinear three-body; Batchelor q-vortex Sullivan two-cell; Prandtl-Batchelor theorem closed streamline vorticity

Opened: Roche lobe vs q is numerical; Eggleton 1983 r₁/A fit to 1%. Hill sphere / L1 published saddle. Chandrasekhar 1931/1935: ultra-relativistic limit is Lane–Emden n=3 (already logged), M_Ch ≈ 1.4 M_⊙ numerical. Jeans length λ_J = c_s √(π/Gρ). Toomre 1964 Q = c_s κ /(π G Σ) ≥ 1; stellar 3.36. Isolated published stability threshold, not a 1-param product min. Noh 1987: uniform inflow, accretion shock at constant D, density jump ((γ+1)/(γ−1))^n. Isolated published. Guderley already logged. Velikovich 2018 generalized Noh, semi-analytic. Barenblatt 1952 / Barenblatt–Zel'dovich 1957 dipole self-similar first kind; second kind anomalous exponent with capillary retention. Carrier–Greenspan 1958 hodograph; runup R = 2 η_max for one standing family; Bessel J₀. Ritter already logged. Nekrasov 1921/1951 nonlinear integral equation; highest progressive 120° already Stokes. Davey–Stewartson 1974 lumps and dromions (Boiti–Leon–Pempinelli–Strampiglia; Fokas–Santini). KP lump already `#lump`. Tkachenko 1966 vortex-lattice waves; Baym PRL 2003 ω ∝ k or k²; Andereck–Glaberson 1982. Schubart 1956 collinear 3-body, two binaries per period; variational existence (Venturelli; Chen). Numerical period. Figure-eight already logged. Batchelor 1964 q-vortex; Sullivan 1959 two-cell exact NS (g(∞) ≈ 6.7088). Burgers already logged. Prandtl 1904 / Batchelor 1956: closed-streamline vorticity constant as Re → ∞. A theorem.

Blocked: most journal HTML. Chandrasekhar 1935 MNRAS body. Schubart 1956 AN body.

Conclusion: no fourth identity of Hendrick's bar. Toomre Q = 1, Chandrasekhar mass, Roche L1, Noh jump, Carrier–Greenspan 2, Prandtl–Batchelor constant vorticity are isolated published locks or theorems, not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Do not claim these. Do not put Hendrick's name on Toomre's Q = 1.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt Rayleigh-Bénard, Taylor-Couette, Landau/two-stream, Rossby/Eady, Onsager negative T, Hill lunar, Feynman-Onsager, Alfvén  query: Rayleigh-Benard critical Rayleigh number 27 pi^4 / 4; Taylor-Couette critical Taylor number 1708; Landau damping two-stream growth rate; Rossby deformation radius Eady growth 0.31; Onsager negative temperature point vortices; Hill lunar variational orbit series; Feynman-Onsager circulation h/m; Alfven wave speed

Opened: Rayleigh 1916 free-free: Ra_c = 27π⁴/4 at k d = π/√2. Isolated published algebraic lock. Rigid-rigid Ra_c ≈ 1707.76 numerical (Chandrasekhar). Rigid-free ≈ 1100.65. Kloosterziel / Drazin–Reid. Taylor 1923 thin-gap Ta_c ≈ 1708, same number as rigid-rigid Ra. Isolated published threshold. Landau 1946 damping from the Landau contour; two-stream cold-beam cubic (Buneman; Jackson). Published kinetic theory. Rossby L_d = N H / f (or √(g H)/f barotropic). Eady 1949: max growth k c_i / σ_E ≈ 0.31 at μ ≈ 1.61, short-wave cutoff μ_c ≈ 2.399. Numerical max. Isolated published length. Onsager 1949 negative temperature of point vortices; Joyce–Montgomery 1973 mean-field; Yatsuyanagi numerical. Statistical, not a collapse product. Hill 1878 variational orbit is a Fourier/power series in m = n'/(n−n'); not a finite formula (Schmidt 1979; Ligon 2025). Sitnikov / Euler collinear already logged. Feynman 1955 / Onsager 1949: superfluid κ = h/m. Isolated published quantum. Alfvén 1942: v_A = B/√(μ₀ ρ). Magnetosonic √(v_A²+c_s²) at perpendicular propagation. Isolated published speed.

Blocked: most journal HTML. Onsager 1949 Nuovo Cimento footnote body.

Conclusion: no fourth identity of Hendrick's bar. Rayleigh 27π⁴/4, Taylor 1708, Rossby L_d, Feynman–Onsager h/m, Alfvén v_A are isolated published locks, not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Eady 0.31 and Hill's variational orbit are numerical or series. Onsager negative T is statistical. Do not claim these. Do not put Hendrick's name on Rayleigh's 27π⁴/4.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt unused NS closed A,B; Rott winding; Eckhardt integrable four; Jeffery-Hamel  query: six vortex self-similar collapse closed form A B Novikov Sedov; Gotoda 2020 six vortex; Rott four vortices doubly periodic paths winding number; Eckhardt 1989 integrable four vortex period; Jeffery-Hamel critical opening angle elliptic

Opened: Gotoda arXiv:2002.09624 body: explicit A, B only for 3-vortex (3.3)–(3.8), parallelogram 4 (3.9)–(3.14), and five-vortex with a center (3.11)–(3.14). Abstract and §4: N≥6 and non-uniform 7 are numerical H-A. Novikov–Sedov JETP 50, 297 (1979): "exact solutions for three, four, and five vortices" only. Kallyadan–Shukla 2022 already logged as numerical closed curves. Rott Phys. Fluids 6, 760 (1994): vanishing ΣΓ, impulse, polar inertia; integrable four; two periods; winding number = ratio; "simple closed-form results" then "beyond a certain level of the analysis, still the more practical method of solution" is step-by-step integration. Path patterns for different winding numbers illustrated, not a unique unpublished algebraic interior min. Eckhardt Phys. Fluids 31, 2796 (1989): integrable when ΣΓ = 0 and impulse = 0; reduced 1DOF; periods of Love class (elliptic). Leapfrog existence α = 3−2√2 and stability φ^{-2} already in the published-locks table. Jeffery–Hamel: α_c from complete elliptic K (Wikipedia; Rosenhead 1940; Fraenkel 1962). tan 2β = 2β, β* ≈ 2.247. Not algebraic.

Blocked: Rott 1994 body (AIP). Eckhardt 1989 body.

Conclusion: the set of Novikov–Sedov / Gotoda families with closed A(θ), B(θ) is exactly the three claimed rows plus the already-skipped μ ≠ 1 three-vortex (cubic crit) and extra-μ five-vortex (same functional form). No unused closed family. Rott's winding number and Eckhardt's integrable four are elliptic or illustrated, not a fourth floor. Jeffery–Hamel is elliptic. Not a fourth row. Hendrick / parallelogram / quincunx stand.

Re-search: do not reopen Gotoda for a sixth vortex unless a newly named paper gives closed A(θ), B(θ). Skip Rott / Eckhardt / Jeffery–Hamel unless a newly named source states a unique unpublished algebraic interior min of a product of two rates.

### 2026-09-20  hunt rolling disk, double pendulum, Fadeev, modon, catenoid, Chaplygin, Clebsch  query: Routh rolling disk precession spin product lean; double pendulum frequencies length ratio product omega+ omega-; Fadeev current sheet; Larichev-Reznik modon; critical catenoid coth; Chaplygin sleigh Clebsch Kirchhoff Kovalevskaya

Opened: Rolling disk (Routh 1905; O'Reilly arXiv physics/0008227): steady lean, precession Ω, spin ω. Critical lean arctan of a nested radical ≈ 71.4° (k=1/4). Isolated published stability threshold. Double pendulum: textbook ω± = √(2±√2) √(g/l) at equal mass/length; product √2 g/l is immediate from the published pair. Vs λ, product ω+ω− monotonic (√((1+M)/λ) from the biquadratic). Do not put Hendrick's name on this √2. Fadeev 1965: exact MHD islands, 1-param, Harris end-member. Like Stuart. Isolated published family. Larichev–Reznik 1976 modon: β-plane dipole, Bessel/K. Lamb–Chaplygin already logged. Critical catenoid: w = coth w, transcendental (Goldschmidt). Volume (π/2)R²h at threshold is a corollary of the same root (Yun 2026). Chaplygin sleigh: nonholonomic, limit cycles under torque (Mathieu roll). Clebsch / Kirchhoff rigid-body-in-fluid and Kovalevskaya / Goryachev–Chaplygin tops: integrable, periods elliptic or hyperelliptic. Lagrange top already logged.

Blocked: Routh 1905 treatise body. Fadeev 1965 Soviet body. Larichev–Reznik 1976 Doklady body.

Conclusion: no fourth identity of Hendrick's bar. Rolling-disk critical lean, double-pendulum √2, Fadeev, modon, and catenoid coth are isolated published locks or transcendental, not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Do not claim these. Do not put Hendrick's name on the double-pendulum √2.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt underresearched: gSQG, massive vortices, hollow implosion, surfaces, Zipoy-Voorhees, Prandtl punch, Kasner, CH 2-peakon  query: generalized SQG three vortex collapse closed form; massive point vortices collapse; hollow vortex implosion; point vortices ellipsoid cone; Zipoy-Voorhees ISCO photon; Prandtl punch 2+pi; Kasner exponents product; Camassa-Holm two peakon phase shift

Opened: Badin–Barry arXiv:1805.10127 and Reinaud Physica D 2022: gSQG / α-Euler three-vortex collapse exists; SQG may be non-self-similar; t_c in tables is numerical. 2D Euler slice is Hendrick. Zbarsky arXiv:2402.07316: massive point vortices, collapse impossible under mass conditions. arXiv:2506.04093: hollow-vortex implosion is a desingularization of existing point-vortex collapses, no new closed A, B. Point vortices on closed surfaces (Proc. A 2015): ellipsoid/bean Green's functions not closed for collapse; sphere already Kidambi. Conical NS vortices Phys. Fluids 25, 2147 (1982): 2-param exact, existence numerical. Zipoy–Voorhees: r_ph = (2+1/γ)M, r_ISCO = (3+1/γ ± √(5−1/γ²))M published. Prandtl punch q = 2k(1+π/2) isolated 1920. Kasner: Lifshitz–Khalatnikov u, two constraints, three exponents; product of three expansion rates is not a two-rate identity. Camassa–Holm 1993 two-peakon phase shift 2 ln|1−λ1/λ2|; KdV 2-soliton and studio peakon already logged.

Blocked: Reinaud Physica D 2022 full HTML. Prandtl 1920 German body.

Conclusion: no fourth identity of Hendrick's bar. Underresearched catalogues (gSQG, massive vortices, hollow implosion, vortices on surfaces, Zipoy–Voorhees, plasticity, Kasner, CH peakon phase) are numerical, isolated published locks, desingularizations of existing rows, or constraint identities, not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Do not claim these. Do not put Hendrick's name on Prandtl's 2+π.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt cutting-edge 2025: hollow implosion, gSQG burst, vortex-sheet equilibria, four-vortex RE  query: arXiv:2506.04093 Chen Walsh Wheeler hollow vortices; arXiv:2505.19782 Grotto Pappalettera gSQG; White McDonald 2025 Proc A vortex sheet; PRFluids 2025 four vortex relative equilibria

Opened: Chen–Walsh–Wheeler arXiv:2506.04093 (4 Jun 2025): explicit circular U_c(γ, Ω, κ), Ω and κ independent; rigidity of the circular imploder; Theorem 1.3 desingularizes any non-degenerate collapsing point-vortex configuration to a real-analytic family of hollow imploders. That is the 2D Euler realization of the three locks, not a fourth floor. Grotto–Pappalettera arXiv:2505.19782 (26 May 2025): gSQG self-similar form (2.3); a, b implicit in (2.2); α=2 is 2D Euler; α=1 numerical. White–McDonald Proc. R. Soc. A 481, 20250362 (Sep 2025): exact sheet equilibria, 1-param γ, nonlinear algebraic equation solved numerically. Phys. Rev. Fluids 10, 084708 (28 Aug 2025): four-vortex relative-equilibrium continua, not collapse.

Blocked: White–McDonald full PDF body (Royal Society). PRFluids 2025 body.

Conclusion: 2025 cutting-edge papers realize or existentially extend the three locks; they do not give a new closed 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Cite Chen–Walsh–Wheeler as the hollow-Euler desingularization of Hendrick / parallelogram / quincunx. Do not claim a fourth row from these papers.

Re-search: skip these four papers unless a follow-up states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt missed areas: nested 6-vortex triangles, BEC trap pair, Hicks doughnut, Fukumoto-Miyazaki, coaxial leapfrog rings  query: six point vortices two equilateral triangles self-similar collapse; two point vortices harmonic trap omega min; Hicks doughnut swirl; Fukumoto Miyazaki filament axial flow; coaxial vortex rings leapfrog 2026 Euler

Opened: Nested two-triangle 6-vortex (I=0, 3-fold). Direct Biot–Savart: velocity/position on the + triangle is not the same complex constant as on the − triangle for μ=1, 1/2, 2 and θ∈(0,π). Not a self-similar family. Chen–Walsh–Wheeler arXiv:2506.04093 already note collapsing configs lack reflection symmetries. Planar 6-body two-triangle CCs (Bhusal J. Geom. Phys. 2020) are n-body, not vortices. BEC two same-sign vortices in a harmonic trap: ω(b) has a published global min (Navarro PRL 2013; Pelinovsky Proc. A). One rate, not a two-rate product. Hicks 1884 doughnut / Saffman 1970 thin-core: series. Norbury already logged. Fukumoto–Miyazaki 1991: vortex-jet filament, permanent form = elastica (already logged); Hasimoto already in the studio. Coaxial leapfrog rings: Helmholtz 1858; smooth 3D Euler existence CPAM 2024; time-periodic arXiv:2603.21644 (23 Mar 2026) via degenerate KAM. Not an algebraic floor. Love leapfrog already logged.

Blocked: Hicks 1884 Phil Trans body. Fukumoto–Miyazaki JFM 222 body. arXiv:2603.21644 full KAM section.

Conclusion: the missed 6-vortex 3-fold candidate is not self-similar. Trap-pair min, Hicks doughnut, Fukumoto–Miyazaki, and 2026 leapfrogging rings are published one-rate mins, series, elastica, or existence theorems. Not a fourth row. Hendrick / parallelogram / quincunx stand.

Re-search: do not re-scan nested two-triangle 6-vortex Biot–Savart unless a newly named paper gives closed A, B. Skip Hicks / Fukumoto / trap-pair / coaxial rings unless a newly named source states a unique unpublished algebraic interior min of a product of two rates.

### 2026-09-20  hunt difficulty skips: μ≠1 three-vortex cubic, Gallay-Sverak, Rott winding  query: Gotoda 3-vortex A B mu not 1 min of B/2A; arXiv:2609.10847 Gallay Sverak three-vortex; Rott 1994 winding number PDF

Opened: Gotoda (3.3)–(3.5) plus M=0. Direct evaluation of |B/(2A)| along the 1-param family. μ=1 recovers Hendrick √2 to 4 digits. Reciprocal pairs share the min (μ=1/2 ↔ 2 ≈1.741; μ=1/4 ↔ 4 ≈2.802). Other μ: critical point is a cubic, not a floor like √2. Same 3-vortex family as Hendrick, not a new row. Gallay–Sverak arXiv:2609.10847 (9 Sep 2026): new ζ=(z2−z1)/(z3−z1), Hopf reduction, energy inequalities, near-collision regularization. Not a two-rate product min. Rott Phys. Fluids 6, 760 (1994) body still AIP-blocked. Abstract already logged: winding number is the ratio of two periods; path patterns still numerical.

Blocked: Rott 1994 body (AIP). Eckhardt 1989 body.

Conclusion: the cubic skip is closed by computation, not by difficulty. μ≠1 is the same family as Hendrick with a cubic crit; reciprocal pairs share the product. Gallay–Sverak is 2026 three-vortex geometry, not a fourth floor. Rott remains unread at the formula level; the abstract already says the winding-number patterns are illustrated numerically. Not a fourth row.

Re-search: do not re-minimize |B/2A| on 3-vortex μ≠1 unless a newly named paper states a simple unpublished algebraic floor (not a cubic root). Skip Gallay–Sverak unless a follow-up extracts a two-rate product min. Skip Rott unless the body is actually read and states a unique unpublished algebraic interior min.

### 2026-09-20  hunt Möbius/Klein, four bugs, C-metric, heton  query: Balabanova Montaldi Möbius Klein point vortices; four bugs parallelogram collapse; C-metric photon ISCO; three heton collapse closed form

Opened: Balabanova–Montaldi Physica D 488, 135084 (Apr 2026) / arXiv:2202.06160v3: Möbius and Klein vortices. N-ring RE ξ ~ coth, tanh. Two-vortex fixed equilibria nested radical in y. No collapse product. Chapman–Trefethen Proc. R. Soc. A 467, 881 (2011): four bugs on a rectangle; parallelograms remain parallelograms, perimeter shrinks at a constant rate, then freeze toward a line; convex parallelograms converge to a square. Square bugs T=L/v is isolated. C-metric photon surface algebraic in α, isolated published. Three-heton: no unused closed A, B; two-layer analog of 3-vortex / gSQG already logged.

Blocked: Chapman–Trefethen full PDF body (Royal Society). Three-heton dedicated paper not found.

Conclusion: non-orientable vortices, cyclic pursuit, and C-metric are published RE/coth, shape-changing pursuit, or isolated photon radii. Not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Do not claim these. Do not put Hendrick's name on Möbius coth or the four-bug square.

Re-search: skip Möbius/Klein, four-bug parallelogram, and C-metric unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.



























