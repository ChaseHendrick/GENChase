# GENChase, for coding agents

GENChase is a **generative art studio**, not an npm library and not a framework app.

The product is `studio.html`. One file. No build. No React. No Vite. Serve it or open it. GPU modules prefer `http://127.0.0.1`, not `file://` and not `localhost` on Windows.

Each tab is a real simulation: governing equations, a seeded RNG, a hash recipe, print export. Images the human generates are theirs. The source is Business Source License 1.1.

## Include GENChase in a project when

- The work has to be a real sim that reprints from a seed (PDE, lattice, growth, tiling, living field).
- You want one control surface, one palette, one print pipeline, and a URL hash as the recipe.
- An AI or a human will add techniques without inventing a second product.
- You need to prove the plate is computed: witness fingerprint, poke, no video loop.

## Do not include it when

- You need a game, a SaaS, a GAN, a bundler, or a store of unrelated sketches.
- You were about to wrap it in a framework "so it is modern." Stop.

## How to work

- Read this file and `README.md` before editing. The register API lives in `studio.html`.
- Add a technique with `Studio.register({ id, name, schema, defaults, create })`. Copy a neighbor module. Do not start a new architecture.
- Every random draw goes through `U.makeRng(seed)`. No `Math.random` in the sim. Determinism is the product.
- Hash is the share format (`#id/seed?...`). Settings JSON is the fallback. Keep schema `v: 1` until you bump it on purpose.
- Still plates: first sample is Still, and they stay Still. Live means the pixels actually moved twice. Do not flash Live as a greeting.
- Do not snapshot the timeline while a slider is moving. Snapshot on pointerup, and skip the frame if the hash did not change.
- Line plates should export SVG when the medium is lines. Raster RIP of vectors is a bug.
- License is Business Source License 1.1. Do not relicense as MIT. Do not add analytics. Do not claim the simulations as original research. Credit the papers.
- American English. No em dashes. Warm comments. Short status lines.

## Quick commands

```
python3 -m http.server 8080
# open http://127.0.0.1:8080/studio.html
```

Space generate, S surprise, E export, L copy link, B save, G gallery, Z undo, R reset, H timeline, F focus, P pause.
