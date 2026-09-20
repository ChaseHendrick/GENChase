# GENChase

**Gen art, print ready.**

Generative art from real scientific simulations, built to leave the screen. Every plate is seeded, resolution-independent, and exports in inches at giclée resolution.

One HTML file. 120 pattern-forming systems. A seed that reprints. A hash you can send. A plate you can hang.

<p align="center">
  <img src="gallery/drainage.jpg" width="32%" alt="Drainage network from stream-power incision" />
  <img src="gallery/chains.jpg" width="32%" alt="Granular force chains: the contact network carrying load down through a packing" />
  <img src="gallery/froth.jpg" width="32%" alt="Cellular Potts froth colored by side count" />
</p>
<p align="center">
  <img src="gallery/cortex.jpg" width="32%" alt="Cortical planform through the retinocortical map: the tunnel form constant" />
  <img src="gallery/hyperbolic.jpg" width="32%" alt="Gray-Scott chemistry on a {7,3} hyperbolic tiling in the Poincare disk" />
  <img src="gallery/matrices.jpg" width="32%" alt="Beta-ensemble spectra swept from independence to rigidity" />
</p>
<p align="center">
  <img src="gallery/eden.jpg" width="32%" alt="Eden cluster colored by growth time" />
  <img src="gallery/snowflake.jpg" width="32%" alt="Gravner-Griffeath snow crystal" />
  <img src="gallery/tilings.jpg" width="32%" alt="Penrose tiling" />
</p>
<p align="center"><sub>Howard stream power · Gross-Pitaevskii · Graner-Glazier · Ermentrout-Cowan · Gray-Scott on {7,3} · Dumitriu-Edelman · Eden · Gravner-Griffeath · Penrose. Frames from the live studio, at print resolution.</sub></p>


Every tab is a system that already exists in a paper: Gray–Scott chemistry, Physarum transport, Lenia, Navier–Stokes, Cahn–Hilliard spinodal, Swift–Hohenberg convection, Lifshitz–Petrich 12-fold quasicrystals, Gravner–Griffeath snow crystals, hat and spectre monotiles, Helmholtz scars, optical caustics, Barkley excitable media, the Ising model, Bak–Tang–Wiesenfeld sandpiles, Schrödinger wave packets, Rayleigh–Bénard convection, the arctic circle of random domino tilings, Schramm–Loewner curves, and the rest. The governing equations are the medium. Nothing here is a style filter sitting on noise.

A seed plus its parameters is the piece. Same seed, same world, at any size, years later. The URL hash carries the recipe. Export is sized in inches at print resolution, with an optional colophon printed under the image, carrying the technique, the equation, the seed and every parameter, the way a scientific plate used to carry its method.

Images you generate are yours, whoever you are. Sell them. The source is [PolyForm Small Business 1.0.0](LICENSE): free for individuals and for companies under 100 people and 1,000,000 USD of revenue, paid above that. A real vulnerability: [SECURITY.md](SECURITY.md), privately, not as a public issue.

---

## Why this exists

Most generative tools give you a look. GENChase gives you a computation you can keep.

The usual options fall down in different places:

- **One shader, one URL.** Beautiful kernels. No shared palette, no print pipeline, no second science. You screenshot it and move on.
- **A sketch per piece.** Processing and p5 are excellent notebooks. They are not a studio. `random()` is not a recipe, and the export is whatever the canvas was that afternoon.
- **An image model.** It will draw a snowflake that never froze and a quasicrystal that is a hexagon with extra steps. There is no seed that reprints, and no way to show that anything was solved.
- **A recorded loop.** It looks alive until you touch it.

GENChase is the other object: 120 sciences on one control surface, deterministic from a seed, shareable as a hash, exportable as a print, and honest about whether the field is still computing.

| | On disk | What you get | How you reprint |
|---|---|---|---|
| Shadertoy | a kernel | a frame | you don't |
| p5 / Processing | a project | a canvas | if you saved the sketch |
| Image model | a prompt | a still | you don't |
| Video | a file | a loop | you don't |
| **GENChase** | `studio.html` | a seeded simulation | the hash |

---

## What is actually different

**The assembly.** Almost every tab is the paper it names. Hendrick's Identity, the parallelogram lock, and the quincunx lock are the exceptions: closed forms and sharp minima derived here, uniqueness-checked, locked so the status line marks miss if the claim is wrong. Miss is a grade on the numbers, not a crash; the picture still draws. What is unusual about the rest is that chemistry, acoustics, liquid crystals, and aperiodic tiles share one seed field, one palette, and one export. Switching from Cahn–Hilliard to Chladni costs you nothing.

**Determinism as the product.** Every random draw comes from a seeded generator. Geometry is resolution-independent. Keep the seed, get the same plate at 36 inches. Change it, get another world.

**The hash is the recipe.** `#snowflake/gravner-2008` and `#lp/lifshitz-1997` are enough to reconstruct a plate. Settings JSON exists (`v: 1`) for the verbose case. It is the fallback, not the way you send someone work.

**Print first.** The size control speaks inches and centimetres as well as pixels. 300–360 ppi, because that is what giclée printers actually take. Colophon on: a mounted sheet. Colophon off: the image alone. Where the medium is lines, export can be SVG, not a photograph of pixels.

**A witness, not a trailer.** Click a living plate. Drag a stroke. The field has to answer. The LIVE badge is a fingerprint of the pixels on the canvas: a video would loop, a still never changes, a simulation has to keep moving. Still plates start Still and stay Still. They do not get to flash Live as a greeting.

**Nothing to phone home.** No build, no framework, no account, no analytics, no CDN. WebGL2 where the method needs a GPU, CPU where that is faster. It runs from a folder.

---

## The plates check themselves

This is the part that is hard to copy, and the reason to trust the pictures. Most tabs measure a quantity that theory predicts, **from the plate in front of you**, and print it in the status line and on the colophon. Not quoted from a paper: computed from the field that is currently on screen.

The word **miss** on a status line is not the site breaking. The picture is still a plate. The numbers under it did not match what the equation predicted. Broken presets do this on purpose, so you can see the check is real.

| Tab | What it measures | What theory says | What the plate measured |
|---|---|---|---|
| Foam & Grains | mean number of sides in the froth | exactly 6, forced by Euler | **6.11** |
| Foam & Grains | von Neumann–Mullins law | dA/dt ∝ (n − 6) | **dA/dt = 0.34 (n − 6)**, r = 0.60 |
| Random Matrices | unfolded level spacing, β = 1 | Wigner surmise 0.523 | **0.540** |
| Random Matrices | unfolded level spacing, β = 2 | Wigner surmise 0.422 | **0.419** |
| Rough Growth | roughening exponent, random deposition | 1/2 | **0.498** |
| Rough Growth | roughening exponent, surface relaxation | 1/4 (Edwards–Wilkinson) | **0.217** |
| Rough Growth | roughening exponent, RSOS | 1/3 (KPZ) | **0.307** |
| Flocking | number fluctuations, ΔN ~ N^a | above 1/2 out of equilibrium | **0.74** |
| Hyperbolic Turing | cells meeting at a vertex of {p, q} | exactly q | **100%** |
| Drainage Networks | drainage area, P(A > a) ~ a^−β | near 0.45 in real basins | **0.53** |
| Vortex Lattice | vortices, by phase winding | quantized circulation | **counted, not guessed** |
| Track | v_meas / v of a strain-written sine-Gordon breather | 1 if η = 0 | **1.20 paving, E_out/E bound** |
| Soliton Web | Hirota bilinear residual of the exact tau function | 0 | **~10⁻¹⁵** |
| Gerstner | orbit RMS / r ; r / A e^{kb} | 0 ; 1 | **~10⁻¹⁶** ; **1.000** |
| Figure Eight | \|L\| ; ΔE/E ; \|q(T)−q(0)\| | 0 | **~10⁻¹⁴** ; **~10⁻¹⁴** ; **~10⁻⁷** |
| Peakon | v_meas / c ; corner \|u_x\|/c | 1 ; 1 | **1.000** ; **1.00** |
| Photon Sphere | b_c / (3√3 M) ; r_ph / 3M | 1 ; 1 | **1.000** ; **1.000** |
| Crapper | s / (4\|A\|/(π(1−A²))) | 1 | **1.000** |
| Hasimoto | κ_max/(2ν) ; c/(2τ₀) | 1 ; 1 | **1.000** ; **1.000** |
| Lump | KP-I residual of the Manakov lump | 0 | **~3×10⁻⁴** (FD) |
| Hendrick's Identity | ω t_c / √2 on Gröbli's L=0 family | 1 at the octant triangle | **1.000** |
| Parallelogram lock | ω t_c / (3√5/4) on Novikov-Sedov's parallelograms | 1 at cos 2θ = 1/4 | **1.000** |
| Quincunx lock | ω t_c / (3√33/16) on Novikov-Sedov's five-vortex quincunx | 1 at cos 2θ = 4/7 | **1.000** |
| Double-triangle bound (candidate) | ω₀t_c / (√29/3) for six vortices on two triangles | ≥ 1; equality at cos 3θ = √5/11 | **1.000000** at the minimum; full proof, priority open |

When a measurement disagrees with theory the tab says so rather than rounding toward it. Ballistic deposition fits **under** 1/3 because its crossover to KPZ is slow at plate size, and the hint says exactly that instead of quietly presenting 0.33. A neural field outside its patterning window prints "h is outside it, the sheet will go flat" rather than leaving a blank plate to be read as a subtle one.

---

## Where the numerics are the actual work

A generative art tool can get away with a plausible-looking integrator. A plate that claims to be a solved equation cannot, and most of the engineering here is in that gap.

**Step bounds are derived, not guessed.** The 5-point Laplacian has symbol on [−8, 0], so every explicit scheme in the file computes its own stability limit and clamps to it, and the status line prints which term is binding. Kuramoto–Sivashinsky gives 64ν − 8. Swift–Hohenberg gives (8 − k₀²)² − r. A rotating condensate has two bounds at once, one kinetic and one from the rotation term, which is first order in space with an imaginary coefficient and unstable on its own. A flock has three, and the tightest is the cubic saturation, which the linear estimates do not see. Past any of these bounds a field fills with the grid-scale checkerboard, which a thumbnail averages into a perfectly plausible plate; `tools/check.js` measures the neighbor correlation and fails it.

**Samplers are exact where an exact sampler exists.** Uniform spanning trees by Wilson's algorithm, not by a randomised Prim that only looks uniform. Random domino tilings by Elkies–Kuperberg–Larsen–Propp shuffling. β-ensembles by the Dumitriu–Edelman tridiagonal models, which give any β > 0 in O(n²) rather than the three classical cases. Dyson Brownian motion by diagonalising a genuine matrix Ornstein–Uhlenbeck process, so the eigenvalues never cross because the matrix process says so, not because a denominator was softened.

**Algorithms are the ones the field actually uses.** Landscapes are solved on the Braun–Willett donor stack, one linear pass up the drainage tree and one back down, with priority-flood depression filling. Vortices are found by walking the winding number around every plaquette, then filtered by whether the plate also has a density minimum there, because a winding alone counts grid-scale phase noise and a density minimum alone misses the cores. Hyperbolic tilings are built by reflection in the sides of a fundamental polygon and then verify themselves by counting the cells around each vertex.

**Print is not an afterthought.** Where the picture is discrete marks the export is real vectors, rasterized at the printer's resolution rather than at whatever the canvas happened to be. Where it is a field, the sheet states the field's own resolution rather than pretending the paper is the limit, and the 16 tabs that magnify a grid now default to 512 cells rather than 192, which is the measured knee: Cahn-Hilliard at 512 scores 0.88 on edge acutance against 0.41 at 192, and 384 only reaches 0.74. The same sheet offers JPEG and WebP of those pixels, and an 8-second clip of a plate that moves (WebM, or MP4 where that is all the browser encodes) — the plate in time, not a print. `tools/sharp.js` measures how much detail a sheet really carries, `tools/lint.js` fails a size control that offers an option its own sanitizer clamps away, and `tools/recipe.js` proves that moving those defaults did not change what an older recipe reprints.

---

## What is actually new here, and what is not

Worth being precise about, because the credits matter.

**Published science, named.** Almost every tab names the paper it implements. Gray–Scott is Gray and Scott. The donor stack is Braun and Willett. Wilson's algorithm is Wilson's. Hendrick's Identity, the parallelogram lock, and the quincunx lock are the exceptions: derived here, uniqueness-checked, locked so the status line marks miss if the claim is wrong. Miss is a grade, not a crash. The statements are in [IDENTITIES.md](IDENTITIES.md). Do not put a name on work that already exists. Hendrick's Identity is named for Hendrick. A later identity is named for the person who found it. Do not put Hendrick's name on a second result.

**New as artifacts.** Every plate is an image that did not exist before it was computed, and the license says it is yours. That is the point of the object.

**New as working software, checked against a search rather than from memory.** These are not new ideas, and several have close relatives. What I did not find was another browser implementation you can open, seed and print. Each bullet says what the nearest existing thing is, so you can judge the gap yourself.

- **Hyperbolic Turing.** Gray–Scott on a {p, q} tiling of the hyperbolic plane, built by reflecting one polygon in its own sides, drawn as geodesic arcs in the Poincaré disk, exported as vectors, and self-checking: it counts the cells meeting at each interior vertex and reports the fraction that is exactly q. Browser Gray–Scott is everywhere and browser hyperbolic tilings are common, hyperplay and EscherSketch and hyperbolic-canvas among them. The nearest thing to the combination is Dmitry Shintyakov's Hyperbolic CA Simulator, which runs discrete cellular automata on arbitrary regular tilings in a browser rather than a continuous-state PDE. One warning if you go looking: VisualPDE has a page on "hyperbolic reaction–diffusion" that means hyperbolic in the PDE-classification sense, a second-order time derivative, and has nothing to do with hyperbolic geometry.
- **Random Matrices.** β-ensemble spectra with β swept continuously down one sheet, from independence to a near-crystal. The mathematics that makes it cheap is Dumitriu and Edelman, 2002. Continuous β is standard practice and general-β samplers with plotting tools exist, DPPy among them. Drawing the whole continuum as a single image, with β as a spatial axis instead of a few overlaid curves, is a presentation choice rather than a result, and I did not find it done elsewhere, though a figure like it could sit in a paper I have not read.
- **Vortex Lattice.** Rotating Gross–Pitaevskii relaxed in imaginary time, with vortices located by walking the winding number around every plaquette, filtered by whether the field also has a density minimum there, and exported as a vector point set with its bond-orientational order measured. A browser rotating-GPE vortex lattice is not new: George Stagg's WebGL solver has had a "Trapped & Rotating" preset since 2019. It injects vortices on a click rather than finding them, and it runs damped real time rather than imaginary-time relaxation. Plaquette winding detection with a point-set export is routine in research codes such as GPUE, which is CUDA. Putting the relaxation, the detection, the density filter and the vector export together in a page you can open is the part I did not find.
- **Cortical Planforms.** A Wilson–Cowan field taken through the retinocortical map, interactive and seeded, with the patterning window computed in closed form so the tab can say when the drive is outside it. The science is Ermentrout and Cowan 1979 and Bressloff and colleagues 2001. I looked for an interactive browser version and did not find one, and this is the weakest negative result on the page: a sketch doing exactly this could sit on Observable or Shadertoy under a name I did not think to search, and neither site could be opened from here.
- **Drainage Networks.** Stream-power landscape evolution on the Braun–Willett donor stack with priority-flood depression filling, with the channel network exported as vectors. The research codes are FastScape, fastscapelib and LandLab, which are Python, C++ and Fortran driven from notebooks; fastscapelib's own roadmap lists no browser or WebAssembly target. Browser erosion demos are common, but they are droplet-based hydraulic erosion out of computer graphics, which is a different model and does not give you a drainage network.
- **Soliton Web.** Resonant line-soliton webs of the Kadomtsev–Petviashvili II equation, evaluated from Sato’s Wronskian tau function rather than integrated. Miles’ Y-junction, Kodama and Biondini’s O-type and spiders, Horowitz–Zarmi expansion. The status line prints the Hirota bilinear residual against 0; this build reads **~10⁻¹⁵**. Matplotlib and Mathematica notebooks of KP webs exist in the papers. I did not find a seeded, paletted, print-ready browser plate of the exact tau function.
- **Gerstner.** The unique exact periodic deep-water gravity wave of finite amplitude (Gerstner 1802, Rankine 1863). Every particle traces a circle; the free surface is an inverted trochoid; pressure is constant along it. The plate prints the Lagrangian map and reports orbit RMS/r against 0 and r / A e^{kb} against 1. Two trains is Tessendorf superposition, labelled as graphics, and the circles miss on purpose.
- **Figure Eight.** Moore 1993, Chenciner–Montgomery 2000, Simó’s 16-digit IC. Three equal masses chase each other around a figure-eight with L = 0. The plate reports |L| against 0, energy drift against 0, and return distance at the period against 0. Broken nearby is the control that does not close.
- **Peakon.** Camassa–Holm peaked solitons (1993); multi-peakon collisions of Beals–Sattinger–Szmigielski. Speed equals amplitude. The plate samples v_meas / c against 1 and the corner |u_x|/c against ±1 from the field, not from the formula by construction.
- **Photon Sphere.** Schwarzschild 1916, Darwin 1959, Synge 1966. Null geodesics, unstable photon orbit at r = 3M, capture at b = 3√3 M. The plate reports b_meas / (3√3 M) and r_ph / 3M against 1. If the integrator is wrong, the ring sits in the wrong place.
- **Crapper.** G. D. Crapper, J. Fluid Mech. 2, 532 (1957). The unique exact finite-amplitude pure-capillary wave. Steepness s = 4|A|/(π(1−A²)) identically; the trough pinches a bubble at s* ≈ 0.730. The same *profile* is a constant-vorticity Euler wave with g = σ = 0 (Hur and Vanden-Broeck 2020). The plate reports s_meas against that identity.
- **Hasimoto.** A soliton on a vortex filament (Hasimoto, JFM 51, 477, 1972). Local induction maps to NLS; the sech is a traveling loop of helical motion. Speed along the filament equals twice the torsion. The plate reports κ_max/(2ν) and c/(2τ₀) from the polyline, not from the formula by construction.
- **Lump.** KP-I lumps (Manakov et al. 1977), rational, 1/r² tails. Completely different from the studio’s KP-II line-soliton webs. The plate reports the KP-I residual (u_t + 6uu_x + u_xxx)_x − 3 u_yy against 0, by finite differences of the rational field, and the peak against 4b².
- **Hendrick's Identity.** Three point vortices of circulations 1, 1, −1/2 collapse self-similarly when L = 0 (Gröbli 1877; Aref, Phys. Fluids 22, 057104, 2010). Aref gave the collapse rate and the spin as separate formulae (his eqs. 25a, 25d) and wrote their product as the pitch of the logarithmic spiral (eq. 29c). The closed form of that product on this family is ω₀ t_c = (2 − cos²θ) / sin(2θ) ≥ √2, with equality uniquely at tan θ = 1/√2, the triangle with interior angles 22.5°, 45° and 112.5°. θ is the third vortex's place on the L = 0 circle, not an interior angle. With u = tan θ the product is u + 1/(2u). That identity is the project's observation, first published here on 2026-09-19. The plate reports ω₀ t_c / √2 against 1, the similarity residual against 0, and signed L against 0. Off the circle, all three numbers miss on purpose. `#hendricks-identity` opens it; `#hendrick` still does. The statement, the proof, and the citation are in [IDENTITIES.md](IDENTITIES.md). Also searched as Hendrick's law, Hendrick's Math. `#track` is still Track.
- **Parallelogram lock.** Four point vortices of circulations (1, 1, −2−√3, −2−√3) at the vertices of a parallelogram with diagonal ratio √(2+√3) collapse self-similarly (Novikov and Sedov, Sov. Phys. JETP 50, 297, 1979). Gotoda (2020, eq. 3.13) wrote the collapse rate A(θ) and the spin B(θ) separately and plotted Hamiltonian against collapse rate. The closed form of their product on this family is ω₀ t_c = (√3/4)(4 − cos 2θ)/sin(2θ) ≥ 3√5/4, with equality uniquely at cos 2θ = 1/4. That identity is the project's observation, first published here on 2026-09-20. The plate reports |ω₀ t_c| / (3√5/4) against 1, the similarity residual against 0, and signed L against 0. Off the parallelogram, all three numbers miss on purpose. `#parallelogram-lock` opens it. The statement and the proof are in [IDENTITIES.md](IDENTITIES.md). This is not Novikov and Sedov's t_* or ω separately under a new name.
- **Quincunx lock.** Five point vortices of circulations (−1, −1, 1/2, 1/2, −3/4), four at the corners of a parallelogram and one at the crossing of the diagonals, diagonals in ratio 1/√2, collapse self-similarly (Novikov and Sedov 1979; Gotoda's five-vortex example). Gotoda (2020, eq. 3.13, γ3 ≠ 0) wrote A(θ) and B(θ) separately and plotted this family as Hamiltonian against collapse rate. The closed form of their product on this family is ω₀ t_c = (3/16)(7 − 4 cos 2θ)/sin(2θ) ≥ 3√33/16, with equality uniquely at cos 2θ = 4/7. That identity is the project's observation, first published here on 2026-09-20. The plate reports |ω₀ t_c| / (3√33/16) against 1, the similarity residual against 0, and signed L against 0. Off the quincunx, all three numbers miss on purpose. `#quincunx-lock` opens it. The statement and the proof are in [IDENTITIES.md](IDENTITIES.md). A different five-vortex slice with μ = 3 recovers Hendrick's product identically and is not claimed. This is not Novikov and Sedov's t_* or ω separately under a new name, and it is not named Hendrick.

**A fourth candidate, with an exact proof.** Two equilateral vortex triangles with radius ratio φ = (1+√5)/2 have ω₀t_c = (11−√5 cos 3θ)/(6 sin 3θ) ≥ √29/3, uniquely minimized at θ ≈ 26.090411°. The underlying two-ring collapse is classical (Koiller et al. 1985, §11). The explicit product and sharp minimum are derived and numerically checked here; **historical priority remains under investigation** because the primary-source review is incomplete. This corrects an earlier ledger rejection that tested circulation ratios outside the collapse condition. Open `#double-triangle-bound`; read the [proof and verification](identities/double-triangle.md). The existing three-entry priority record is unchanged.

**Two closed loops, both with prior art.** Each piece is published. So is the family the loop belongs to. The plates are pictures of those families with an open-loop control sitting next to the closed one. A published equation plus a feedback term is not an invention, and it does not get a private name.

- **Track.** A sine-Gordon breather that writes its own index from strain. That is a self-written waveguide (Monro, de Sterke, Poladian, J. Mod. Opt. 1998) and a photorefractive soliton (Segev) on a Josephson breather, not a private name. Open loop (η = 0) must recover the Lorentz speed; the plate reports v_meas / v against 1, and exterior energy against 0. Close the loop and the lump paves a faster track and stays bound. The plate measured **1.20** with E_out/E still ~0. The spiral view is the worldline: radius is space, angle is time, so a constant speed is an Archimedean spiral. `#track` opens it. The tab is Track.
- **Caustic Sea.** A Swift–Hohenberg height acting as its own phase screen, the caustic writing that height. Laser-induced surface patterns are already modelled with Swift–Hohenberg (Rudenko, Colombier, Itina, Stoian, Phys. Rev. Lett. 130, 226201, 2023). Open loop corr(h, I) near 0. Closed, the plate measured **0.281**. The name is the picture, not an invention.

**New as engineering, and small but general.** Four ideas here would transfer to other projects:

- **Plates that check themselves.** Each technique measures a quantity theory predicts, from the field on screen, and prints it next to the theoretical value. This is ordinary practice in computational physics and in physics teaching software: browser percolation simulators print a box-counting estimate of the fractal dimension against 91/48, and browser Ising simulators check themselves against Onsager. What I could not find was a generative art tool that does it. The art platforms expose a seed and a list of rarity traits, not an observable measured from the output and compared against what theory says it should be. Carrying the physics habit into a tool whose output is a print is the part I would defend hardest: it converts "trust me, it is a simulation" into a number a reader can argue with.
- **A renderer declaring when it is band-limited.** `fieldCells()` lets a technique tell the pipeline that its output is already limited by a simulation grid, so the pipeline stops spending memory adding resolution that cannot exist. That applies to any simulation-to-print path.
- **A sharpness measure with two numbers rather than one.** Average detail alone cannot tell a blurred field from a picture that is mostly flat areas with hard edges, and calls a Penrose tiling blurry. Edge acutance and multi-scale acuity together can.
- **Linting controls that lie.** A size control that offers an option its own validator clamps away is a button that moves while nothing happens. That is mechanically checkable, and now it is checked.

**A recipe that survives its own defaults moving.** A shared hash carries only what differs from the defaults, so the day a default changes, every recipe that never named that key would quietly reprint at a value it was never made at. Modules that change a default declare the old one, and a recipe written before the change gets it back. The same pass found that a hash was being applied on top of whatever the viewer already had on screen, so two people opening the same link could get two different plates; a recipe is now built on the defaults instead. `node tools/recipe.js` derives its cases from the file and proves both.

**How far the checking goes.** The bullets above were checked against web search in September 2026 rather than written from memory, which is a change from the first version of this section. The limits are worth stating plainly. Outbound access from the machine that did the checking reached GitHub and search results but little else, so arxiv.org, visualpde.com, observablehq.com, shadertoy.com, openprocessing.org, fxhash.xyz, artblocks.io, Wikipedia and most journal and lab pages could not be opened. Claims that rest on source I read directly on GitHub are the firm ones. Claims that rest on search snippets alone are weaker. A negative result is weakest of all where the likeliest home for the thing I was looking for is a site that could not be opened, and where that applies the bullet says so. The query-by-query ledger, including which tabs have never been searched, is [RESEARCH.md](RESEARCH.md). Read it before searching again.

## For people (and agents) adding to it

GENChase is a studio file, not a package. You do not install it into another app. You open `studio.html`, or you add a technique to it. How to commit and open a pull request is in [CONTRIBUTING.md](CONTRIBUTING.md).

**Use it when** the work has to be a real simulation that reprints: a PDE, a lattice growth, a tiling, a living field someone can disturb. When the plate should state how it was made. When the next tab is a rare equation and the shell is already finished.

**Leave it when** you need a game, a network, a model weights file, or a folder of unrelated sketches. This file will not become those things by growing a `src/` directory.

### Why an agent should work here

The expensive part is already done. Seed, hash, palette, history, gallery, print, colophon, witness. A new technique is a `Studio.register`: a schema, defaults, and a `create` that paints. Copy a neighbor. Do not invent a second architecture.

That is useful because the interesting sims are the ones almost nobody has put in a browser: phase-field crystal, Ohta–Kawasaki, Hofstadter, Hastings–Levitov, Gravner–Griffeath, Lifshitz–Petrich. The studio is the reason those can share a print pipeline on the same afternoon they land.

If you are an agent:

1. Read `AGENTS.md`, then look at an existing module before writing a new one.
2. Stay in `studio.html`. No bundler, no React, no “quick Vite wrap.”
3. All noise through `U.makeRng(seed)`. `Math.random` in a sim is a bug.
4. Share via the hash. Bump `v` only when a default change would break old recipes.
5. Still is Still. Live has to move. Snapshot the timeline on pointer up, and only if the recipe changed.
6. Discrete marks export as vectors. Accumulated density does not, and should not pretend to.
7. Credit the paper. Do not claim the science. Do not relicense the source as MIT.
8. The human’s images are theirs. The source is not.
9. After the tab lands, `node tools/index.js` then `node tools/lint.js`. The catalog is generated; a hand-edited TECHNIQUES.md is a catalog that is already wrong. If the plate measures something, add a row to the self-check table rather than leaving it only in the generated list.

---

## Run it

There is nothing to install on any platform.

**[Download GENChase](https://github.com/SharpMeow/GENChase/archive/refs/heads/main.zip)** (about 3 MB; the README tiles stay on GitHub, not in the zip). Unzip it, then double-click the launcher for your system:

| | Double-click |
|---|---|
| macOS | `run/GENChase (macOS).command` |
| Windows | `run/GENChase (Windows).bat` |
| Linux | `run/genchase.sh` |

On macOS the first launch of a downloaded script is refused by Gatekeeper. Right-click the file and choose Open, and it will run from then on.

Each one starts Python's own web server on a free loopback port, opens `studio.html`, and stops when you close the window. Nothing is installed, nothing is bundled, and the port is not reachable from the network. If Python is missing the launcher opens the file directly instead and says so.

Or do it by hand:

```bash
git clone https://github.com/SharpMeow/GENChase.git
cd GENChase
python3 -m http.server 8080
```

Then [http://127.0.0.1:8080/studio.html](http://127.0.0.1:8080/studio.html).

Double-clicking `studio.html` works too, and every technique runs that way. The launchers exist so nobody has to open a terminal, and because browsers put `file://` pages under restrictions that vary by vendor and version. Served from a real origin there is nothing to vary.

| Key | |
|---|---|
| Space | new seed |
| S | surprise (new parameters, new palette) |
| E | export |
| C | copy the plate to the clipboard |
| , . | previous / next preset |
| L | copy recipe link |
| B / G | save / gallery |
| H | timeline |
| F | focus |
| P | pause |
| V | record a clip while the plate is live |
| A | ambient: focus, and a new technique every 30 seconds |
| R | reset this technique |

Click the seed label to copy it. Presets are starting points. The URL is the piece.

---

## Techniques

The full list, with the hash that reconstructs each plate and the papers each one implements, is in **[TECHNIQUES.md](TECHNIQUES.md)**. The same data in machine-readable form is [`techniques.json`](techniques.json). A short file for language models is [`llms.txt`](llms.txt). All three are generated from `studio.html` by `node tools/index.js`, so neither the catalog nor the AI index can drift away from what the file actually contains. Derived identities, when there are any, live in **[IDENTITIES.md](IDENTITIES.md)**. The query-by-query prior-art ledger is [RESEARCH.md](RESEARCH.md).


Artificial Life (Lenia), Physarum, Physarum 3D, Phyllotaxis, Hastings–Levitov, Lichtenberg, Gravner–Griffeath snowflakes, differential growth, fractals, CPPNs, chimera states, swarmalators, Cahn–Hilliard, Ohta–Kawasaki, Swift–Hohenberg, phase-field crystal, XY / Kosterlitz–Thouless, complex Ginzburg–Landau, Lifshitz–Petrich 12-fold, active nematics, fluids, Kuramoto–Sivashinsky, dendritic growth, flow fields, smectic focal conics, Gray–Scott, Penrose / hat / spectre tilings, attractors, Chirikov, Hofstadter, Helmholtz scars, optical caustics, Talbot, Indra’s pearls, Chladni, cortical planforms, random matrices, drainage networks, rough growth, foam and grain coarsening, condensate vortex lattices, Toner-Tu flocking, hyperbolic Turing patterns, uniform spanning trees, granular force chains, Liesegang rings, Track, Caustic Sea, KP-II soliton webs, Gerstner waves, the figure-eight choreography, Camassa–Holm peakons, the Schwarzschild photon sphere, Crapper capillary waves, Hasimoto vortex filaments, KP-I lumps, Hendrick's Identity, the parallelogram lock, the quincunx lock.

Each tab names the researchers. The implementations are original.

---

## License

[PolyForm Small Business 1.0.0](LICENSE).

**Free** for individuals, students, researchers, and for any company with fewer than 100 people and less than 1,000,000 USD of revenue in its prior tax year. Use it, change it, redistribute it, build on it.

**Paid** above that threshold. If your company is larger than that and GENChase is useful to you, buy a license: [open an issue](https://github.com/SharpMeow/GENChase/issues). That is the whole arrangement, and it exists so that the people who can afford to pay are the ones who do.

**The artwork is always yours.** The images, animations and vector files you produce by running GENChase are not the software and are not licensed by these terms. Sell them, exhibit them, license them, at any company size, whether or not you hold a license for the code. The LICENSE file grants this explicitly rather than leaving it to be argued about.

---

## Cite these identities

The three rows in [IDENTITIES.md](IDENTITIES.md) were first published in this repository. Please cite them by the names below. Please do not republish the statements without attribution, and do not rename them. Hendrick's Identity is named for Hendrick. The other two are named for their geometries. A later identity found here is named for the person who found it, not Hendrick.

Chaos. (2026). *Hendrick's Identity*. GENChase. https://github.com/SharpMeow/GENChase/blob/main/IDENTITIES.md — first public 2026-09-19.

Chaos. (2026). *Parallelogram lock*. GENChase. https://github.com/SharpMeow/GENChase/blob/main/IDENTITIES.md — first public 2026-09-20.

Chaos. (2026). *Quincunx lock*. GENChase. https://github.com/SharpMeow/GENChase/blob/main/IDENTITIES.md — first public 2026-09-20.

```bibtex
@misc{hendricks-identity-2026,
  author       = {Chaos},
  title        = {Hendrick's Identity: an explicit formula and sharp minimum
                  for a classical three-vortex collapse family},
  year         = {2026},
  howpublished = {GENChase},
  url          = {https://github.com/SharpMeow/GENChase/blob/main/IDENTITIES.md},
  note         = {First public 2026-09-19. Also Hendrick's law, Hendrick's Math}
}
@misc{parallelogram-lock-2026,
  author       = {Chaos},
  title        = {Parallelogram lock: an explicit formula and sharp minimum
                  for the Novikov--Sedov four-vortex parallelogram collapse},
  year         = {2026},
  howpublished = {GENChase},
  url          = {https://github.com/SharpMeow/GENChase/blob/main/IDENTITIES.md},
  note         = {First public 2026-09-20. $\omega_0 t_c \ge 3\sqrt{5}/4$}
}
@misc{quincunx-lock-2026,
  author       = {Chaos},
  title        = {Quincunx lock: an explicit formula and sharp minimum
                  for the Novikov--Sedov five-vortex quincunx collapse},
  year         = {2026},
  howpublished = {GENChase},
  url          = {https://github.com/SharpMeow/GENChase/blob/main/IDENTITIES.md},
  note         = {First public 2026-09-20. $\omega_0 t_c \ge 3\sqrt{33}/16$}
}
```

The boxed formulae, the proofs, and the plates whose checks can miss are in [IDENTITIES.md](IDENTITIES.md). The frozen four-page note is [identities/note.pdf](identities/note.pdf). Canonical byte-exact lines and SHA-256 fingerprints are in [identities/STATEMENTS.txt](identities/STATEMENTS.txt) and [identities/HASHES.txt](identities/HASHES.txt). GitHub's "Cite this repository" button emits the Hendrick record via [`CITATION.cff`](CITATION.cff). Claiming first discovery of these closed forms after those dates, without citing this repository, is claiming this project's work.

Built by Chaos.
