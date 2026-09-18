# GENChase

**Gen art, print ready.**

Generative art from real scientific simulations, built to leave the screen. Every plate is seeded, resolution-independent, and exports in inches at giclée resolution.

One HTML file. Sixty-one pattern-forming systems. A seed that reprints. A hash you can send. A plate you can hang.

<p align="center">
  <img src="gallery/drainage.jpg" width="32%" alt="Drainage network from stream-power incision" />
  <img src="gallery/vortex.jpg" width="32%" alt="Abrikosov vortex lattice in a rotating condensate" />
  <img src="gallery/froth.jpg" width="32%" alt="Cellular Potts froth coloured by side count" />
</p>
<p align="center">
  <img src="gallery/cortex.jpg" width="32%" alt="Cortical planform through the retinocortical map: the tunnel form constant" />
  <img src="gallery/hyperbolic.jpg" width="32%" alt="Gray-Scott chemistry on a {7,3} hyperbolic tiling in the Poincare disk" />
  <img src="gallery/matrices.jpg" width="32%" alt="Beta-ensemble spectra swept from independence to rigidity" />
</p>
<p align="center">
  <img src="gallery/eden.jpg" width="32%" alt="Eden cluster coloured by growth time" />
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

GENChase is the other object: sixty-one sciences on one control surface, deterministic from a seed, shareable as a hash, exportable as a print, and honest about whether the field is still computing.

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

Artificial Life (Lenia), Physarum, Physarum 3D, Phyllotaxis, Hastings–Levitov, Lichtenberg, Gravner–Griffeath snowflakes, differential growth, fractals, CPPNs, chimera states, swarmalators, Cahn–Hilliard, Ohta–Kawasaki, Swift–Hohenberg, phase-field crystal, XY / Kosterlitz–Thouless, complex Ginzburg–Landau, Lifshitz–Petrich 12-fold, active nematics, fluids, Kuramoto–Sivashinsky, dendritic growth, flow fields, smectic focal conics, Gray–Scott, Penrose / hat / spectre tilings, attractors, Chirikov, Hofstadter, Helmholtz scars, optical caustics, Talbot, Indra’s pearls, Chladni, cortical planforms, random matrices, drainage networks, rough growth, foam and grain coarsening, condensate vortex lattices, Toner-Tu flocking, hyperbolic Turing patterns, uniform spanning trees.

Each tab names the researchers. The implementations are original.

---

## License

[PolyForm Small Business 1.0.0](LICENSE).

**Free** for individuals, students, researchers, and for any company with fewer than 100 people and less than 1,000,000 USD of revenue in its prior tax year. Use it, change it, redistribute it, build on it.

**Paid** above that threshold. If your company is larger than that and GENChase is useful to you, buy a licence: [open an issue](https://github.com/SharpMeow/GENChase/issues). That is the whole arrangement, and it exists so that the people who can afford to pay are the ones who do.

**The artwork is always yours.** The images, animations and vector files you produce by running GENChase are not the software and are not licensed by these terms. Sell them, exhibit them, license them, at any company size, whether or not you hold a licence for the code. The LICENSE file grants this explicitly rather than leaving it to be argued about.

Built by Chaos.
