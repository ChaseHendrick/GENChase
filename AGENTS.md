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

## Verify before you commit

There is a harness. Use it; this project has shipped bugs that a thumbnail hid.

```
node tools/lint.js                 # structure, ids, Math.random, doc drift. One second.
node tools/check.js <id> 12000     # the plate: non-blank, deterministic, survives a tab switch
node tools/export.js <id> 8 300    # the print path, at 8 inches and 300 ppi
```

`tools/modules/CONTRACT.md` is the real contract: the register keys, the instance methods, the GL
helpers, and the numerical rules. Read it before writing a technique, not after.

Two failures worth knowing about because they both looked fine in a preview:

- **An explicit integrator has a step bound, and you compute it rather than guess.** The 5-point
  discrete Laplacian has symbol on `[-8, 0]`, so the stiffest linear mode of any such scheme sits at
  the grid scale and forward Euler needs `dt < 2/|lambda|` there. Past the bound the field fills with
  the Nyquist checkerboard, which a 200 px preview averages into a plausible plate. Cahn-Hilliard
  shipped one. `check.js` reports the neighbour correlation as `nyq` and fails below -0.35.
- **A preset can ask for a state that does not exist.** Swift-Hohenberg offered a localized state at
  `g = 0`, where the bifurcation is supercritical and nothing below onset survives. The physics has
  to permit what the preset asks for.

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

Double-click `run/GENChase (macOS).command`, `run/GENChase (Windows).bat` or `run/genchase.sh`, or
do it by hand:

```
python3 -m http.server 8080
# http://127.0.0.1:8080/studio.html
```

Space generate · S surprise · E export · C copy image · L copy link · B save · G gallery · Z undo · R reset · H timeline · F focus · P pause · V record · A ambient · , . presets · 1-9 tabs · [ ] history
