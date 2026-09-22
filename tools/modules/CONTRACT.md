# Module contract for new GENChase blocks

Read this before writing a block. It restates what the engine in `src/shared/engine.js` actually does, so a block written against it drops into the file without surprises. When this file and the maintained `src/` implementation disagree, inspect the implementation and correct the contract. Search for the function or `id:`. Do not cite line numbers; they drift.

The [stable engine API](../../docs/ENGINE-API.md) defines versioning, recipe migrations,
structured scientific witnesses and shared print ownership. API version 1 is the
compatibility boundary for new modules.

## Files and workflow

- Canonical source is `src/modules/<block>.js`, with one family per file. Copy `_template.js` as an unregistered starting point. Edit source, not generated HTML.
- `index.html` loads the shared engine and selected family through the generated `src/module-manifest.json`. Tab IDs need not equal filenames; never invent a second loader in a module.
- Shared shell and GPU helpers live in `src/shared/engine.js`; styles in `src/styles/`.
- Add new module includes to `src/studio.html` before the boot include. Preserve script order.
- Run `node tools/build.js`, then `node tools/index.js`, `node tools/lint.js`, and `node tools/science.js`.
- Run the browser plate and print checks below on every changed technique. Record scientific evidence and limitations in `validation/techniques.json`; see `validation/README.md`.
- Use `tools/_*` for ignored scratch. `tools/inject.js` remains available for isolated test copies; it replaces matching blocks.
- Keep seed, recipe, palette and print behavior in the shared engine. Preserve recipe version information and describe solver changes that affect results. Exact pixels may depend on hardware, solver version and simulation resolution. See BUILDING.md.

## What to read in src/ before writing

For a routine edit, read the catalog, the relevant file and one suitable neighbor. Do not load all modules or generated HTML. Builds and verification may inspect all sources. Line numbers drift; search for the name.

- Shell (`src/shared/engine.js`): `Studio.register`, `sanitize`, instance and host creation, `fitCanvas`, `switchTo`, sidebar field rendering, witness, export.
- `src/modules/pde.js` in full. It is the template for every GPU grid technique: `pdeCreate`, `toHalf`, `seedNoise`, `GRID`, `simFields`, `pictureFields`, `RANGE`, `pre`, the reduce pass used to measure the field, `burst` chunking, `disturb` via the shared splat shader.
- Per-pixel resolution-independent template: the `fractal` module (`create`, `exportPNG`).
- GPU cellular automata with state textures: the `life` block.
- CPU lattice plates on a 2D canvas: the `snowflake` register and the other CPU modules in that block.
- Pressure or Poisson solves on the GPU: the `fluid` block.

## Studio.register fields

```
id, name, tab (optional short tab label), subtitle: '<what> · <year>', order,
equation, credit, blurb,
schema, defaults, presets, hints, closedGroups,
palette (true), defaultPalette ('kiln' etc. or {bg, colors}), paletteLabel,
headline (key of a range field), headlineLabel,
surprise(rng) -> partial state, sanitize(s) -> mutates s in place, create(host) -> instance
```

Schema entries:

```
{ group, key, label, type: 'range', kind, min, max, step, fmt, hint?, dimUnless?(s) }
{ group, key, label, type: 'seg', kind, options: [[value, 'Label'], ...], wrap?: true, hint? }
{ group, key, label, type: 'toggle', kind, hint? }
{ group, key, label, type: 'action' }     // instance.action(key) is called
```

`kind` is `'geom'` (regenerate), `'paint'` (repaint only) or `'live'` (instance.live(key) while running). Copy the `RANGE(group, key, label, kind, min, max, step, fmt, extra)` helper from the pde block. The shell's own `sanitize` clamps ranges, validates seg values and coerces toggles before calling yours. Every key in `defaults` must be either in the schema or a deliberate hidden key.

Presets: `{ key: { label: 'Label', p: { partial state }, palette: Studio.PALETTES.<name> } }`, five to seven per tab, each visibly different, each paired with a palette. `hints` is `{ GroupName: 'sentence' }`. `closedGroups` is a list of group names collapsed by default.

`surprise(rng)` returns a partial state covering the geometry and picture keys; it should usually give a keeper. `sanitize(s)` clamps anything that can blow up the integrator (dt against dx^2, zoom against float precision, grid to even numbers).

## State

`s.seed` (string), `s.palette` (array of `#RRGGBB`, up to 16), `s.bg` (`#RRGGBB`), plus your keys. Treat `s` as read-only inside `create`; the shell owns it.

## host

```
host.canvas          the <canvas>; the shell sizes it in device pixels (dpr <= 2) before regenerate() and on resize
host.util, host.gl   same objects as Studio.util / Studio.gl
host.getState()      current state object
host.setWitness(record) structured scientific comparison; call after its matching status
host.setStatus(html) status bar; use '<span>label <b>value</b></span>' chunks
host.reducedMotion() true when the viewer prefers reduced motion: finish quickly, do not animate
host.isActive()      true when this tab is showing and the document is visible
host.requestRepaint()
```

The shell hides your canvas and calls `pause()` when another tab is chosen, `resume()` when it comes back. Do not create a second canvas in the DOM. Offscreen canvases created with `document.createElement` and never appended are fine.

## Instance

```
aspect(s)          height / width ratio; use the ASPECTS map from the pde block
regenerate()       full rebuild from state; the canvas has already been sized
repaint()          paint-only change (view, exposure, palette)
live(key)          a live key changed while running
resize()           canvas size changed; re-render
pause() / resume()
action(key)        an action field was pressed
disturb(p)         only on living fields; p = { x, y, yGL, dx, dy } with x, y in 0..1 from the top left, yGL flipped for GL
exportPNG(w, h)    -> Promise<Blob> of exactly w x h pixels
exportSVG(w, h)    -> string or Blob; implement it when the picture is discrete marks, omit it when
                   the picture is accumulated density and there is no geometry to emit
```

## GL helpers (`G = Studio.gl`)

- `G.createGL(canvas)` returns a WebGL2 context with `gl.floatExt` set when `EXT_color_buffer_float` is available. Return the `dead(msg)` stub from the pde block when it is null or a shader fails to compile.
- `new G.Pass(gl, fragmentSource)`; `pass.draw(targetOrNull, uniforms)`. Uniform typing by value: number -> float, boolean -> int 0/1, array length 2/3/4 -> vec, length 9/16 -> mat, other arrays -> float[], `{ int: n }` -> int, `{ ivec: [..] }` -> ivec, a `Target` or `{ tex }` -> sampler2D.
- `new G.Target(gl, w, h, { type: 'rgba32f' | 'rgba16f' | 'rgba8', filter: 'nearest' | 'linear', wrap: 'repeat' | 'clamp', data })` with `.tex`, `.fbo`, `.w`, `.h`, `.upload(data)`, `.clear(r, g, b, a)`, `.dispose()`.
- `new G.PingPong(gl, w, h, opts)` with `.read`, `.write`, `.swap()`, `.dispose()`.
- `G.rampTexture(gl, s.palette, s.bg)` builds the 256x1 LUT that `G.GLSL.ramp` samples; rebuild only when palette or bg changes.
- `G.GLSL.hash` defines `hash21(vec2)` and `hash22(vec2)`. `G.GLSL.noise` defines `vnoise` and `fbm` and needs `hash` spliced in first. `G.GLSL.ramp` declares `uniform sampler2D u_ramp` and `vec3 ramp(float t)`. `G.GLSL.splatFS` is the shared brush used by `disturb`.
- The vertex stage is fixed; fragment shaders start with `#version 300 es`, `precision highp float;`, `in vec2 v_uv; out vec4 outColor;` and `v_uv` runs 0..1.
- `rgba32f` render targets need `gl.floatExt`. Otherwise use `rgba16f` after `gl.getExtension('EXT_color_buffer_half_float')` and upload with `toHalf` (copy the function from the pde block). Do the same `texType` selection the pde block does.
- GLSL ES 3.00 does not have `step(genType, float)`. Write `step(edgeFloat, x)`. Integer state lives in float channels; round on read.
- Nothing in the shell samples with mipmaps; use `nearest` for simulation state and `linear` only for display LUTs.
- `G.GLSL.bicubic` defines `crW`, `texCR(sampler2D, uv, res)` for the red channel and `texCR4` for all four. Splice it into any render shader that draws a simulation grid coarser than the canvas. A few hundred cells across a few thousand print pixels is a 10x magnification, where nearest gives a mosaic and bilinear leaves the lattice crease on every front. Catmull-Rom interpolates, so a tap at a texel centre is exact and the simulation passes are unaffected. Use it in the reduce pass too, or the black and white points will not match what is drawn.
- **Derive a timestep limit for the actual method and parameter range.** The unit-cell 5-point Laplacian has symbol on `[-8, 0]`. A negative real eigenvalue under forward Euler requires `dt < 2/|lambda|`; this rule does not apply unchanged to imaginary eigenvalues or other integrators. Linearized Cahn-Hilliard has grid-scale decay `M(64 eps^2 + 24 c_max^2 - 8)`. Its conservative margin is a linear estimate, not a nonlinear stability proof. Schrödinger leapfrog instead requires `dt |E| < 2`, including the actual potential envelope, and convection's diffusion ceiling scales with physical cell spacing squared. A UI minimum must never override a smaller stability ceiling. See the checked derivations in `validation/`. `tools/check.js` can detect some Nyquist checkerboards, but passing a visual check does not establish stability.

## Util (`U = Studio.util`)

`TAU, makeRng, makeNoise(rng), clamp, lerp, smoothstep, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, luminance, isLight, inkFor(bg), inkRgba(bg, a), mixHex, makeRamp(colors, bg), makeRampLUT(colors, bg, size), toBlob(canvas), upscale(srcCanvas, w, h, smooth), escapeHtml, svgEsc, svgDoc, svgBlob`.

`U.makeRng(seedString)` returns `rng()` in [0, 1) with `rng.range(lo, hi)`, `rng.int(lo, hi)` (inclusive), `rng.pick(array)`, `rng.gauss()`. Every random draw goes through `U.makeRng(s.seed + '/<tag>')`. `Math.random` is forbidden in a module. On the GPU, per-site randomness is `hash21(site + seedOffset + step)` with the offset drawn from the seeded RNG.

## Witness

The shell fingerprints the visible canvas every 400 ms and shows Live after two consecutive changes, Still after 800 ms without change. A still plate renders in `regenerate()` (progressively in chunks if it must) and then never touches the canvas until state changes. Living fields run a `requestAnimationFrame` loop while `s.running` and stop on `pause()`. Never animate when `host.reducedMotion()` is true; finish the warm-up in a burst and stop.

## Export

The shell asks for `exportPNG(pw, ph)` at the print size, sometimes with a supersample factor, and expects a blob of exactly that size. Grid simulations render the current field into a `pw x ph` target with the display pass, exactly as `pdeCreate.exportPNG` does. Per-pixel techniques recompute at `pw x ph`, tiling when the size exceeds `gl.MAX_TEXTURE_SIZE`; they never upscale a screen buffer. Lattice plates whose cells are the picture scale with `U.upscale(canvas, w, h, false)` so cells stay crisp. Check `gl.getParameter(gl.MAX_TEXTURE_SIZE)` and throw a readable `Error` when the request is larger.

## Aspect

Copy `const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };` and the `GRID` schema entries from the pde block. Cells must stay isotropic on non-square aspects: size the grid as `W = grid`, `H = round(grid * aspect)`.

## Palettes

`Studio.PALETTES`: kiln, harbor, meadow, graphite, verdigris, tram, risograph, nightshade, ember, glacier, bioluminescent, thermal, petri, xray. Each is `{ bg, colors }`.

## order

Recency rank, 10 newest to 100 oldest, by publication year of the system. Existing anchors: 2009 fractal 40, 1958 Cahn-Hilliard 56, 1986 Ohta-Kawasaki 56.5, 1977 Swift-Hohenberg 57, 1993 Talbot-era pieces around 27-29, 1925 to 1930 pieces around 95-100. Pick a value that sorts the tab among its year neighbors and does not collide with an existing one.

## Status line

`host.setStatus('<span>grid <b>256×256</b></span><span>T <b>2.27</b> · critical</span><span>step <b>1,204</b></span>')`. Keep it to three or four spans. The shell appends `dt` on its own when the state has a numeric `dt` and your status does not already mention it, and always appends the seed. Put a `step` (or `sweep`) count in the status of a living plate: the harness reads it to know when the warm-up is done and whether two loads are comparable.

## Pause

A tab with a `running` toggle is paused through it (P key, tab switch). A tab without one is paused by the shell calling `pause()` and later `resume()`, so both must be real: `pause()` stops every loop and timer, `resume()` restarts only what was running. A still plate's `pause()` and `resume()` can be no-ops.

## Palettes for several species

`Studio.PALETTES.triad` has three equally weighted colors for plates that color by species or by one of three states.

## Copy

American spelling. No em dashes anywhere in new text; use commas, periods, colons, or the middle dot `·` in subtitles as the existing modules do. Credit the real paper in `credit`; if a volume or page is uncertain, give authors, journal and year only. The blurb is written for a viewer, in the voice of the existing blurbs: what the system is, what the controls do to it, why the plate looks the way it does. No credit line names a person other than the authors of the cited papers.

## Performance

Default seed lands a finished image in about three seconds on a laptop. Chunk long CPU work with `setTimeout(chunk, 0)` so the UI never blocks more than about 50 ms. Grid defaults and limits vary by module. Read its current schema, sanitizer and compatibility declarations. Measure exposure from the field (reduce pass or a CPU percentile), never from a formula.

## Measured numbers

If your technique prints a measured quantity beside a theoretical one, an uncertainty beside it is worth
having, and a comparison in sigmas says more than two bare numbers. `AGENTS.md`, under "A measured number
carries an error bar", covers how to get one honestly for a mean, a fitted exponent, a ratio, a power-law
tail and an exact count. Worth reading before you write the status line rather than after. It is guidance,
not a gate: nothing checks it.

The two failure modes that matter most: an ordinary least squares error on a fit along one autocorrelated
trajectory is far too small, and a check whose answer is forced by construction is not a check at all.

## Before you report done

For every tab in the block: the default and every preset shoot non-flat with no new console errors, the same hash twice gives the same plate, export at 2x and at a non-screen aspect matches the screen, and exactly one canvas is visible after switching tabs away and back. `rg -n "Math.random" src/modules/<block>.js` returns nothing. Every function in the block is called. No network, no libraries.

Report per tab: id, order, default luminance percentiles, each preset's percentiles, and anything you could not verify.
