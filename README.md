# GENChase

**Gen art, print ready.**

Generative art from real scientific simulations, built to leave the screen. Every plate is seeded, resolution-independent, and exports in inches at giclée resolution.

One HTML file. Fifty-two pattern-forming systems. A seed that reprints. A hash you can send. A plate you can hang.

<p align="center">
  <img src="gallery/snowflake.jpg" width="32%" alt="Gravner–Griffeath snow crystal" />
  <img src="gallery/hofstadter.jpg" width="32%" alt="Hofstadter butterfly" />
  <img src="gallery/hexagons.jpg" width="32%" alt="Swift–Hohenberg hexagons" />
</p>
<p align="center">
  <img src="gallery/caustics.jpg" width="32%" alt="Optical caustics" />
  <img src="gallery/physarum.jpg" width="32%" alt="Physarum network" />
  <img src="gallery/spinodal.jpg" width="32%" alt="Cahn–Hilliard spinodal" />
</p>
<p align="center">
  <img src="gallery/scars.png" width="32%" alt="Helmholtz scars" />
  <img src="gallery/twelve.png" width="32%" alt="Lifshitz–Petrich 12-fold quasicrystal" />
  <img src="gallery/tilings.jpg" width="32%" alt="Penrose tiling" />
</p>
<p align="center">
  <img src="gallery/sandpile.jpg" width="32%" alt="Abelian sandpile group identity" />
  <img src="gallery/pendulum.jpg" width="32%" alt="Double pendulum flip-time fractal" />
  <img src="gallery/excitable.jpg" width="32%" alt="Barkley excitable media spirals" />
</p>
<p align="center">
  <img src="gallery/schrodinger.jpg" width="32%" alt="Schrödinger double slit detector exposure" />
  <img src="gallery/holomorphic.jpg" width="32%" alt="Mandelbrot seahorse valley" />
  <img src="gallery/turing.jpg" width="32%" alt="Schnakenberg Turing spots" />
</p>
<p align="center"><sub>Gravner–Griffeath · Hofstadter · Swift–Hohenberg · Berry caustics · Physarum · Cahn–Hilliard · Helmholtz scars · Lifshitz–Petrich 12-fold · Penrose · Bak–Tang–Wiesenfeld sandpile · double pendulum · Barkley · Schrödinger · Mandelbrot · Turing. Frames from the live studio.</sub></p>


Every tab is a system that already exists in a paper: Gray–Scott chemistry, Physarum transport, Lenia, Navier–Stokes, Cahn–Hilliard spinodal, Swift–Hohenberg convection, Lifshitz–Petrich 12-fold quasicrystals, Gravner–Griffeath snow crystals, hat and spectre monotiles, Helmholtz scars, optical caustics, and the rest. The governing equations are the medium. Nothing here is a style filter sitting on noise.

A seed plus its parameters is the piece. Same seed, same world, at any size, years later. The URL hash carries the recipe. Export is sized in inches at print resolution, with an optional colophon — technique, equation, seed, every parameter — printed under the image the way a scientific plate used to carry its method.

Images you generate are yours. Sell them. The source is [Business Source License 1.1](LICENSE).

---

## Why this exists

Most generative tools give you a look. GENChase gives you a computation you can keep.

The usual options fall down in different places:

- **One shader, one URL.** Beautiful kernels. No shared palette, no print pipeline, no second science. You screenshot it and move on.
- **A sketch per piece.** Processing and p5 are excellent notebooks. They are not a studio. `random()` is not a recipe, and the export is whatever the canvas was that afternoon.
- **An image model.** It will draw a snowflake that never froze and a quasicrystal that is a hexagon with extra steps. There is no seed that reprints, and no way to show that anything was solved.
- **A recorded loop.** It looks alive until you touch it.

GENChase is the other object: fifty-two sciences on one control surface, deterministic from a seed, shareable as a hash, exportable as a print, and honest about whether the field is still computing.

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
6. Line work exports as vectors.
7. Credit the paper. Do not claim the science. Do not relicense the source as MIT.
8. The human’s images are theirs. The source is not.

---

## Run it

```bash
git clone https://github.com/SharpMeow/GENChase.git
cd GENChase
python3 -m http.server 8080
```

Then [http://127.0.0.1:8080/studio.html](http://127.0.0.1:8080/studio.html). Double-clicking the file also works; a few GPU modules are happier with a local server.

| Key | |
|---|---|
| Space | new seed |
| S | surprise (new parameters, new palette) |
| E | export |
| L | copy recipe link |
| B / G | save / gallery |
| H | timeline |
| F | focus |
| P | pause |
| R | reset this technique |

Click the seed label to copy it. Presets are starting points. The URL is the piece.

---

## Techniques

Artificial Life (Lenia), Physarum, Physarum 3D, Phyllotaxis, Hastings–Levitov, Lichtenberg, Gravner–Griffeath snowflakes, differential growth, fractals, CPPNs, chimera states, swarmalators, Cahn–Hilliard, Ohta–Kawasaki, Swift–Hohenberg, phase-field crystal, XY / Kosterlitz–Thouless, complex Ginzburg–Landau, Lifshitz–Petrich 12-fold, active nematics, fluids, Kuramoto–Sivashinsky, dendritic growth, flow fields, smectic focal conics, Gray–Scott, Penrose / hat / spectre tilings, attractors, Chirikov, Hofstadter, Helmholtz scars, optical caustics, Talbot, Indra’s pearls, Chladni.

Each tab names the researchers. The implementations are original.

---

## License

[Business Source License 1.1](LICENSE).

Use it. Study it. Make work. Sell the work.

Do not offer GENChase as a hosted studio, and do not sell the source. On 17 September 2030 this version becomes Apache 2.0.

Artwork generated by running it is not the Licensed Work. It belongs to you.

Built by Chaos.
