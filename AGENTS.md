# AGENTS

GENChase is a single-file generative art studio. The product is `studio.html`. There is no package to install and no app to wrap it in.

Each tab is a scientific simulation with a seeded RNG, a hash recipe, and print export. Generated images belong to the human. The source is Business Source License 1.1.

## Add a technique here when

- It is a real simulation (PDE, lattice, growth, tiling, dynamical system) that can reprint from a seed.
- It should share the existing seed / palette / print / witness shell.
- Someone needs to verify the plate is computed, not a still or a loop.

## Do not

- Turn this into a game, a SaaS, or a model-hosting app.
- Split `studio.html` into a bundler or a framework tree.
- Relicense as MIT.

## Working in the file

- Copy a neighbor `Studio.register({ id, name, schema, defaults, create })`. Do not start a parallel architecture.
- All randomness through `U.makeRng(seed)`. `Math.random` in a sim breaks reprinting.
- The share format is the URL hash (`#id/seed?...`). Settings JSON is the fallback. Keep schema `v: 1` until a default change would break old recipes, then bump it on purpose.
- Witness: still plates start Still and stay Still. Live means the pixels changed twice in a row. Never greet a still plate with Live.
- Timeline snapshots happen on pointer up, and only if the recipe hash changed.
- If the medium is lines, `exportSVG` should be real vectors. Rasterizing them for print is a bug.
- Credit the paper in `credit` / `blurb`. Do not present the simulation as original research.
- No analytics, no extra network calls, no service-worker platform.

## Serve

```
python3 -m http.server 8080
# http://127.0.0.1:8080/studio.html
```

Space generate · S surprise · E export · L copy link · B save · G gallery · Z undo · R reset · H timeline · F focus · P pause
