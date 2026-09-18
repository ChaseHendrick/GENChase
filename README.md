# GENChase

**Gen art, print ready.**

Generative art from real scientific simulations, built to leave the screen. Every plate is seeded, resolution-independent, and exports in inches at giclée resolution.

One HTML file. Sixty-two pattern-forming systems. A seed that reprints. A hash you can send. A plate you can hang.

<p align="center">
  <img src="gallery/drainage.jpg" width="32%" alt="Drainage network from stream-power incision" />
  <img src="gallery/vortex.jpg" width="32%" alt="Abrikosov vortex lattice in a rotating condensate" />
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

A seed plus its parameters is the piece. Same seed, same world, at any size, years later. The URL hash carries the recipe. Export is sized in inches at print resolution, with an optional colophon — technique, equation, seed, every parameter — printed under the image the way a scientific plate used to carry its method.

Images you generate are yours, whoever you are. Sell them. The source is [PolyForm Small Business 1.0.0](LICENSE): free for individuals and for companies under 100 people and 1,000,000 USD of revenue, paid above that.

---

## Why this exists

Most generative tools give you a look. GENChase gives you a computation you can keep.

The usual options fall down in different places:

- **One shader, one URL.** Beautiful kernels. No shared palette, no print pipeline, no second science. You screenshot it and move on.
- **A sketch per piece.** Processing and p5 are excellent notebooks. They are not a studio. `random()` is not a recipe, and the export is whatever the canvas was that afternoon.
- **An image model.** It will draw a snowflake that never froze and a quasicrystal that is a hexagon with extra steps. There is no seed that reprints, and no way to show that anything was solved.
- **A recorded loop.** It looks alive until you touch it.

GENChase is the other object: sixty-two sciences on one control surface, deterministic from a seed, shareable as a hash, exportable as a print, and honest about whether the field is still computing.

| | On disk | What you get | How you reprint |
|---|---|---|---|
| Shadertoy | a kernel | a frame | you don't |
| p5 / Processing | a project | a canvas | if you saved the sketch |
| Image model | a prompt | a still | you don't |
| Video | a file | a loop | you don't |
| **GENChase** | `studio.html` | a seeded simulation | the hash |

---

## What is actually different

**The assembly.** None of the algorithms are new. What is unusual is that chemistry, acoustics, liquid crystals, and aperiodic tiles share one seed field, one palette, and one export. Switching from Cahn–Hilliard to Chladni costs you nothing.

**Determinism as the product.** Every random draw comes from a seeded generator. Geometry is resolution-independent. Keep the seed, get the same plate at 36 inches. Change it, get another world.

**The hash is the recipe.** `#snowflake/gravner-2008` and `#lp/lifshitz-1997` are enough to reconstruct a plate. Settings JSON exists (`v: 1`) for the verbose case. It is the fallback, not the way you send someone work.

**Print first.** The size control speaks inches and centimetres as well as pixels. 300–360 ppi, because that is what giclée printers actually take. Colophon on: a mounted sheet. Colophon off: the image alone. Where the medium is lines, export can be SVG, not a photograph of pixels.

**A witness, not a trailer.** Click a living plate. Drag a stroke. The field has to answer. The LIVE badge is a fingerprint of the pixels on the canvas — a video would loop, a still never changes, a simulation has to keep moving. Still plates start Still and stay Still. They do not get to flash Live as a greeting.

**Nothing to phone home.** No build, no framework, no account, no analytics, no CDN. WebGL2 where the method needs a GPU, CPU where that is faster. It runs from a folder.

---

## The plates check themselves

This is the part that is hard to copy, and the reason to trust the pictures. Most tabs measure a quantity that theory predicts, **from the plate in front of you**, and print it in the status line and on the colophon. Not quoted from a paper: computed from the field that is currently on screen.

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

When a measurement disagrees with theory the tab says so rather than rounding toward it. Ballistic deposition fits **under** 1/3 because its crossover to KPZ is slow at plate size, and the hint says exactly that instead of quietly presenting 0.33. A neural field outside its patterning window prints "h is outside it, the sheet will go flat" rather than leaving a blank plate to be read as a subtle one.

---

## Where the numerics are the actual work

A generative art tool can get away with a plausible-looking integrator. A plate that claims to be a solved equation cannot, and most of the engineering here is in that gap.

**Step bounds are derived, not guessed.** The 5-point Laplacian has symbol on [−8, 0], so every explicit scheme in the file computes its own stability limit and clamps to it, and the status line prints which term is binding. Kuramoto–Sivashinsky gives 64ν − 8. Swift–Hohenberg gives (8 − k₀²)² − r. A rotating condensate has two bounds at once, one kinetic and one from the rotation term, which is first order in space with an imaginary coefficient and unstable on its own. A flock has three, and the tightest is the cubic saturation, which the linear estimates do not see. Past any of these bounds a field fills with the grid-scale checkerboard, which a thumbnail averages into a perfectly plausible plate; `tools/check.js` measures the neighbor correlation and fails it.

**Samplers are exact where an exact sampler exists.** Uniform spanning trees by Wilson's algorithm, not by a randomised Prim that only looks uniform. Random domino tilings by Elkies–Kuperberg–Larsen–Propp shuffling. β-ensembles by the Dumitriu–Edelman tridiagonal models, which give any β > 0 in O(n²) rather than the three classical cases. Dyson Brownian motion by diagonalising a genuine matrix Ornstein–Uhlenbeck process, so the eigenvalues never cross because the matrix process says so, not because a denominator was softened.

**Algorithms are the ones the field actually uses.** Landscapes are solved on the Braun–Willett donor stack, one linear pass up the drainage tree and one back down, with priority-flood depression filling. Vortices are found by walking the winding number around every plaquette, then filtered by whether the plate also has a density minimum there, because a winding alone counts grid-scale phase noise and a density minimum alone misses the cores. Hyperbolic tilings are built by reflection in the sides of a fundamental polygon and then verify themselves by counting the cells around each vertex.

**Print is not an afterthought.** Where the picture is discrete marks the export is real vectors, rasterised at the printer's resolution rather than at whatever the canvas happened to be. Where it is a field, the sheet now states the field's own resolution rather than pretending the paper is the limit. `tools/sharp.js` measures how much detail a sheet really carries, and `tools/lint.js` fails a size control that offers an option its own sanitizer clamps away.

---

## Rare in a browser

None of the science is new, and the credits say whose it is. What is unusual is that these particular systems are running in a tab, seeded, and printable, on one control surface:

- **Cortical planforms.** A Wilson–Cowan neural field taken through the retinocortical map, which turns cortical stripes into Klüver's form constants: fan, tunnel, spiral, cobweb.
- **Hyperbolic Turing.** Gray–Scott chemistry on a {p, q} tiling of the hyperbolic plane, where the area at distance r grows like e^r and a pattern with a preferred wavelength cannot simply repeat.
- **Vortex Lattice.** Gross–Pitaevskii in the rotating frame, relaxed in imaginary time into an Abrikosov lattice, with the vortices located from the phase rather than from the picture.
- **Random Matrices.** Level repulsion as one continuous slider from independence to a near-crystal, which the classical three ensembles cannot express.
- **Drainage Networks.** A landscape evolution model of the kind that normally lives in Fortran and Python research codes.
- **Rough Growth.** Three roughening universality classes side by side with the exponent fitted live.
- **Foam & Grains, Flocking, Spanning Trees**, and the rest.

---

## For people (and agents) adding to it

GENChase is a studio file, not a package. You do not install it into another app. You open `studio.html`, or you add a technique to it.

**Use it when** the work has to be a real simulation that reprints: a PDE, a lattice growth, a tiling, a living field someone can disturb. When the plate should state how it was made. When the next tab is a rare equation and the shell is already finished.

**Leave it when** you need a game, a network, a model weights file, or a folder of unrelated sketches. This file will not become those things by growing a `src/` directory.

### Why an agent should work here

The expensive part is already done. Seed, hash, palette, history, gallery, print, colophon, witness. A new technique is a `Studio.register` — schema, defaults, a `create` that paints. Copy a neighbor. Do not invent a second architecture.

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

---

## Run it

There is nothing to install on any platform.

**[Download GENChase](https://github.com/SharpMeow/GENChase/archive/refs/heads/main.zip)** (about 8 MB, most of it the gallery images). Unzip it, then double-click the launcher for your system:

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

The full list, with the hash that reconstructs each plate and the papers each one implements, is in **[TECHNIQUES.md](TECHNIQUES.md)**. The same data in machine-readable form is [`techniques.json`](techniques.json). Both are generated from `studio.html` by `node tools/index.js`, so neither can drift away from what the file actually contains.


Artificial Life (Lenia), Physarum, Physarum 3D, Phyllotaxis, Hastings–Levitov, Lichtenberg, Gravner–Griffeath snowflakes, differential growth, fractals, CPPNs, chimera states, swarmalators, Cahn–Hilliard, Ohta–Kawasaki, Swift–Hohenberg, phase-field crystal, XY / Kosterlitz–Thouless, complex Ginzburg–Landau, Lifshitz–Petrich 12-fold, active nematics, fluids, Kuramoto–Sivashinsky, dendritic growth, flow fields, smectic focal conics, Gray–Scott, Penrose / hat / spectre tilings, attractors, Chirikov, Hofstadter, Helmholtz scars, optical caustics, Talbot, Indra’s pearls, Chladni, cortical planforms, random matrices, drainage networks, rough growth, foam and grain coarsening, condensate vortex lattices, Toner-Tu flocking, hyperbolic Turing patterns, uniform spanning trees, granular force chains.

Each tab names the researchers. The implementations are original.

---

## License

[PolyForm Small Business 1.0.0](LICENSE).

**Free** for individuals, students, researchers, and for any company with fewer than 100 people and less than 1,000,000 USD of revenue in its prior tax year. Use it, change it, redistribute it, build on it.

**Paid** above that threshold. If your company is larger than that and GENChase is useful to you, buy a license: [open an issue](https://github.com/SharpMeow/GENChase/issues). That is the whole arrangement, and it exists so that the people who can afford to pay are the ones who do.

**The artwork is always yours.** The images, animations and vector files you produce by running GENChase are not the software and are not licensed by these terms. Sell them, exhibit them, license them, at any company size, whether or not you hold a license for the code. The LICENSE file grants this explicitly rather than leaving it to be argued about.

Built by Chaos.
