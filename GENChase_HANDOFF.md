# GENChase handoff: close the gap with Simunauts and VisualPDE

Paste this file into the root of a local clone of `github.com/SharpMeow/GENChase` and tell Claude Code:

> Read GENChase_HANDOFF.md and AGENTS.md, then carry out the work plan. Commit per tab. Credits and copyright lines say "Chaos", never a personal name.

Nothing in this plan has been built yet. The repo is untouched as of commit `78004af`.

---

## 1. Where GENChase stands

`studio.html`, one file, about 16,000 lines, 35 registered techniques:

flow, physarum, physarum3d, reaction (Gray-Scott only), growth, fluid (stable fluids dye), attractors, tilings, life (Lenia, Flow Lenia, Life-likes, Larger than Life), cppn, fractal (3D SDF raymarch), chimera, dendrite, chladni (plate, interference, moire), xy, nematic, cahn, ohta, swift, ks, pfc, swarm, chirikov, cgl, hofstadter, scars, caustics, smectic, hl (Hastings-Levitov), phyllotaxis, pearls, lichtenberg, talbot, snowflake, lp (Lifshitz-Petrich).

Shell features already present: seeded RNG, URL-hash recipe, Settings JSON, presets, Surprise, shared palette editor, print sizing in in/cm/px, colophon, PNG export, SVG export for line media, witness (Live/Still badge), pointer disturb on living fields, timeline, gallery, undo.

Not present: video recording (no `MediaRecorder` anywhere), audio, custom equation entry, boundary-condition controls, image as initial condition, 3D surface view of a 2D field, ambient/screensaver mode.

## 2. What the other two have

### VisualPDE (visualpde.com), verified from its sitemap and example pages

A general browser PDE solver: up to 4 species, cross-diffusion, free-text equations, brush, per-side boundary conditions (periodic, Dirichlet, Neumann, Robin), custom domain shapes, growing domains, image and webcam initial conditions, 3D surface view, time-series probes, four timesteppers, checkpoints, short share links, 60 s clip recording, iframe embed.

Examples GENChase does not cover:

| System | Equations (ASCII) | Known-good values from the site |
|---|---|---|
| FitzHugh-Nagumo | u_t = lap u + u - u^3 - v; v_t = D lap v + e(u - a v - b) | spirals, Hopf, Turing-wave variants |
| Schnakenberg | u_t = lap u + a - u + u^2 v; v_t = D lap v + b - u^2 v | D = 100 spots, D = 30 stripes |
| Brusselator | u_t = lap u + a - (b+1)u + u^2 v; v_t = D lap v + b u - u^2 v | a = 2, b = 3, critical D about 7.46; D = 8 patterns |
| Gierer-Meinhardt | u_t = lap u + a + u^2/v - b u; v_t = D lap v + u^2 - c v (saturated: u^2/(v(1+K u^2))) | stripes need saturation |
| Keller-Segel | u_t = lap u - div(chi(u) grad v) + u(1-u); v_t = D lap v + u - a v; chi = c u/(1+u^2) | c about 3.3 to 3.6; unstable when 2 sqrt(aD) < c/2 - D - a |
| Cyclic competition | u_t = Du lap u + u(1 - u - a v - b w), cyclic in (u,v,w) | needs a < 1 < b |
| Klausmeier vegetation | w_t = a - w - w n^2 + v w_x + lap w; n_t = w n^2 - m n + lap n | a = 0.4, m = 0.4 harsh |
| Thermal convection | vorticity + buoyancy b_x; b_t = kappa lap b - J(psi,b); eps psi_t = lap psi + w | |
| Shallow water | h_t = -div((H+h)u) - eps h; u_t = nu lap u - g grad h - k u - u.grad u + f k x u | dam break, vortical solitons, shear instability |
| Schrodinger | psi_t = i D lap psi (+ small real diffusion for stability), potential V | tunneling, 2D eigenstates |
| Nonreciprocal Cahn-Hilliard | preset `CahnHilliardNonreciprocal` | |
| Superlattice | Brusselator coupled to Lengyel-Epstein via alpha u1 u2 (u2 - u1), 4 species | |
| Coupled Lorenz / Van der Pol / Duffing fields | X_t = D lap X + sigma(Y - X), etc. | D = 5 and 0.2 |
| Lambda-omega spirals | u_t = Du lap u + a u - (u + c v)(u^2+v^2); v_t = Dv lap v + a v + (c u - v)(u^2+v^2) | |
| Perona-Malik | u_t = div(exp(-D |grad u|^2) grad u) | needs an image input |
| KdV, Zakharov-Kuznetsov, Burgers, wave, plate, heat | 1D or teaching pieces | low print value |

GENChase already matches VisualPDE on Gray-Scott, Swift-Hohenberg, Cahn-Hilliard, Kuramoto-Sivashinsky and complex Ginzburg-Landau, and goes well past it everywhere outside grid PDEs.

### Simunauts (simunauts.vercel.app, by @Knightama), read from the page's own 84-entry tile array

84 small engines on one board. Features: focus mode with sliders, deterministic seeds, six palettes, seed chaining between panels, CRT glow, ambient screensaver that rotates engines every 30 s, seed-composed music and sonification, per-panel and whole-board PNG, WebM video with audio, share links, locally saved "Grimoire". No brush, no custom equations, no print pipeline.

Engines GENChase lacks that are real simulations and would make a plate:

Ising model, Abelian sandpile, cyclic cellular automaton, Belousov/Oregonator spirals, percolation, Newton basins, Mandelbrot, Julia, double pendulum, three-body, hydrogen orbitals, tunneling packet, double slit, quantum walk, Faraday waves, Karman wake, boids, Langton's ant and turmites, falling sand, Nagel-Schreckenberg traffic, DLA (GENChase has Hastings-Levitov and dielectric breakdown, which are the conformal and field-driven cousins), Hopf fibration, spherical harmonics.

Engines not worth copying (curves or teaching widgets, not simulations, and they fail the AGENTS.md test): Lissajous, Maurer rose, Taylor series, Fourier square wave, unit circle, matrix lattice, Platonic solids, glyph rain, plasma, metaballs, bokeh, Ulam spiral, Archimedean pinwheel.

## 3. Work plan

Fourteen new tabs in four script blocks, taking the studio from 35 to 49. Build in this order; each block is independent.

### Block A: `rdx` multi-species reaction-diffusion family (GPU)

The existing `pdeCreate` factory (modules/pde.js block, around line 12711) carries one scalar in `.r` plus a chemical-potential pass. Write a sibling factory for up to 4 species in the RGBA channels of one float PingPong: periodic wrap, 5 or 9 point Laplacian, forward Euler with sub-steps, seeded init, disturb brush, isotropic cells on non-square aspects. Views: each species, difference, interfaces (|grad|), relief, and for three species a dominance view.

1. `excitable`, Excitable Media. FitzHugh-Nagumo plus the Barkley model (u_t = lap u + (1/eps) u(1-u)(u - (v+b)/a); v_t = u - v; Barkley 1991) as a model switch. Spirals, breakup turbulence, targets, labyrinths. Seed spirals from broken wavefronts placed by the seeded RNG. This covers both VisualPDE FHN and Simunauts Belousov.
2. `turing`, Turing Patterns. Model switch: Schnakenberg 1979, Brusselator (Prigogine and Lefever 1968), Gierer-Meinhardt 1972 with saturation, Lengyel-Epstein CIMA 1991. Spots, stripes, labyrinths, hexagons and inverted hexagons.
3. `cyclic`, Cyclic Competition. May-Leonard three-species reaction-diffusion (May and Leonard 1975; spatial spirals: Reichenbach, Mobilia and Frey, Nature 2007).
4. `chemotaxis`, Keller-Segel (1970), saturating logistic form above. Discretize the chemotactic flux conservatively with face-centered fluxes or mass drifts.
5. `vegetation`, Klausmeier (Science 1999). Upwind differencing on the advection term. Add a rainfall gradient across the plate.

### Block B: `lattice` statistical physics

6. `ising`. Metropolis with checkerboard updates on the GPU. Per-site hash random numbers keyed on seed, step and site so it reprints. T in J/kB, T_c = 2/ln(1+sqrt 2), about 2.269, shown in status. Field h. Views: spins, blurred magnetization, domain walls. Presets: critical, quench coarsening, just below T_c, field stripes. Credit Ising 1925, Onsager 1944, Metropolis et al. 1953.
7. `sandpile`. Bak, Tang and Wiesenfeld 1987; Dhar 1990. Modes: single-source pile of N grains (up to about 2^20, use the 8-fold symmetry), the sandpile group identity on n by n, and random-drop SOC with avalanche coloring. Chunk the toppling so the UI never blocks more than about 50 ms. Still plate. Export crisp nearest-neighbor cells at any size.
8. `cyclicca`. Griffeath's cyclic cellular automaton (Fisch, Gravner and Griffeath 1991 for range and threshold), with Greenberg-Hastings 1978 as a rule option. GPU integer state.
9. `percolation`. Site and bond percolation (Broadbent and Hammersley 1957), p_c about 0.5927 for square-lattice sites and exactly 1/2 for bonds. Union-find labeling (Hoshen and Kopelman 1976). One seeded random field so sweeping p only adds sites. Color clusters by size rank, highlight the spanning cluster. Still plate.

### Block C: `dynamics` per-pixel, resolution independent

These recompute at export resolution in tiles. Never upscale.

10. `holomorphic`. Mandelbrot, Julia (presets: Douady rabbit c = -0.123+0.745i, dendrite c = i, San Marco c = -0.75, a Siegel disk), Newton basins for z^n - 1 and a seeded random polynomial with relaxation, Burning Ship. Smooth iteration count, distance estimator, orbit traps. Clamp zoom in `sanitize` where float precision runs out. Credit Julia 1918, Fatou 1919, Mandelbrot 1980, Douady and Hubbard 1982.
11. `pendulum`. Double pendulum flip-time fractal. Each pixel is an initial (theta1, theta2); RK4 on the GPU in a state texture, accumulator for first flip time. Sanity check: for equal masses and lengths no flip is possible where 3 cos(theta1) + cos(theta2) > 2, so the lens-shaped dark region must appear. Progressive, then Still. Credit Shinbrot, Grebogi, Wisdom and Yorke, Am. J. Phys. 1992, for the chaotic double pendulum; attribute the flip-time plot generically.
12. `orbitals`. Hydrogen |psi_nlm|^2 (Schrodinger 1926). Laguerre and Legendre coefficients computed on the CPU and passed as uniform arrays. Ray-integrated density with yaw and pitch, and a cross-section view with phase coloring. Sanity checks: n-l-1 radial nodes, l angular nodes, 2p_z dumbbell, 3d_z2 torus. Auto exposure from a measured high percentile.

### Block D: `wavesflow` (GPU)

13. `schrodinger`. i psi_t = -(1/2) lap psi + V psi with Visscher's staggered leapfrog (Computers in Physics 1991), dt bounded by dx^2 in `sanitize`, absorbing boundary layer. Potentials: double slit, single slit, barrier, harmonic well, stadium billiard, periodic lattice, seeded disorder (Anderson localization). Views: |psi|^2, domain coloring, and a time-integrated detector exposure, which is the print.
14. `convection`. Rayleigh-Benard in vorticity-streamfunction Boussinesq form, warm-started Jacobi or red-black SOR for lap psi = -w, hot floor, cold lid, periodic sides, semi-Lagrangian advection. Rolls at onset, plumes, mushroom turbulence. Views: temperature, vorticity, schlieren. Wide default aspect. Credit Benard 1900, Rayleigh 1916.

Optional fifteenth: `shallow`, rotating shallow water (Saint-Venant 1871): dam break, raindrops, vortex merger with Coriolis, jet shear instability, refraction over seeded topography. Ship it only if it reaches plate quality.

### Shell features worth adding after the tabs

Ranked by value to a print studio, and each must be wired into the UI, not left as an uncalled function:

1. Video capture: `canvas.captureStream()` plus `MediaRecorder`, WebM with mp4 fallback, a Record button on living plates only. Both competitors have it.
2. Image as initial condition for the grid PDE family (VisualPDE's "Turing on Turing").
3. Boundary toggle (periodic or no-flux) across the PDE family.
4. Ambient mode that walks the tabs on a timer.

Skip custom equation entry. It is VisualPDE's entire product and contradicts "every tab is a system from a paper". Skip audio unless wanted for its own sake.

## 4. Rules for every new tab

These restate AGENTS.md plus lessons already paid for.

- Copy a neighbor's `Studio.register({...})`. Read the shell (script block 1, lines about 773 to 2602) and the pde block (about 12487 to 13433) before writing.
- Registration fields: `id, name, subtitle: '<what> · <year>', order, equation, credit, blurb, schema, defaults, presets, hints, closedGroups, palette, defaultPalette, paletteLabel, headline, headlineLabel, surprise(rng), sanitize(s), create(host)`.
- Schema field `kind`: `geom` regenerates, `paint` repaints, `live` updates a running sim.
- Instance: `aspect, regenerate, repaint, live, resize, pause, resume, action, disturb` (living fields only), `exportPNG(w,h)`, `exportSVG` where the medium is lines.
- `order` is a recency rank, 10 newest to 100 oldest. Existing values cluster at 0 to 3, 8, 9, 20 to 30, 40, 50 to 61, 65 to 100. Place each new tab by publication year among its neighbors.
- All randomness through `U.makeRng(seed + '/tag')`. No `Math.random`.
- Witness: still plates start Still and stay Still.
- Default seed lands a finished image in about 3 s. Five to seven presets that differ visibly, each paired with a palette from `Studio.PALETTES`. `surprise` usually gives a keeper. `sanitize` clamps anything that can blow up the integrator.
- Exposure by measurement, not formula. A flat or black canvas means the sim died: sweep parameters headlessly until the default measures alive.
- GLSL ES 3.00 has no `step(genType, float)`. Use the same rgba32f to rgba16f fallback as `pdeCreate`.
- Credit the real paper. If a volume or page number is uncertain, give authors, journal and year only.
- No function that nothing calls. No libraries, no network.
- Copy: American spelling, no em dashes. Licensor and credits are "Chaos".
- After the tabs land, update every "Thirty-five" (studio.html lines 26, 30, 39, 617; README lines 7 and 46) to the true count, add gallery tiles for the strongest new plates, and keep the single-file rule: each block becomes one more `<script>` immediately before `<script>Studio.boot();</script>`.

## 5. Test harness

Create these under `tools/` and add `tools/dist/` and `tools/shots/` to `.gitignore`. `npm i -D playwright` in a scratch folder outside the repo, or a global install, keeps the repo free of a package.json.

`tools/shot.js`

```js
// node tools/shot.js <hash, e.g. ising or "ising/my-seed"> [waitMs=6000] [outName]
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const hash = process.argv[2], wait = +(process.argv[3] || 6000);
  const out = process.argv[4] || hash.replace(/[^a-z0-9]+/gi, '_');
  const dir = path.join(__dirname, 'shots'); fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'studio.html') + '#' + hash);
  await p.waitForTimeout(wait);
  await p.screenshot({ path: path.join(dir, out + '.png') });
  const info = await p.evaluate(() => {
    const cs = [...document.querySelectorAll('canvas')].filter(c => c.offsetParent !== null && c.width > 100);
    const c = cs[0]; if (!c) return { err: 'no visible canvas' };
    const t = document.createElement('canvas'); t.width = 200; t.height = Math.round(200 * c.height / c.width);
    const g = t.getContext('2d'); g.drawImage(c, 0, 0, t.width, t.height);
    const d = g.getImageData(0, 0, t.width, t.height).data, L = [];
    for (let i = 0; i < d.length; i += 4) L.push(Math.round(.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]));
    L.sort((a, b) => a - b); const q = f => L[Math.floor(f * (L.length - 1))];
    const st = document.querySelector('#status,.status,[id*=status]');
    return { canvas: c.width + 'x' + c.height, visibleCanvases: cs.length,
      lum: { p01: q(.01), p10: q(.1), p50: q(.5), p90: q(.9), p99: q(.99) },
      status: st ? st.innerText.replace(/\s+/g, ' ').slice(0, 300) : null, png: t.toDataURL() };
  });
  if (info.png) { fs.writeFileSync(path.join(dir, out + '-canvas.png'), Buffer.from(info.png.split(',')[1], 'base64')); delete info.png; }
  console.log(JSON.stringify(info));
  console.log(errs.length ? errs.join('\n') : 'no console errors');
  await b.close();
})();
```

This was run against the current `studio.html` and works: `cahn` reports luminance p01 90, p50 161, p99 238 with one visible canvas after 7 s. Two messages are baseline noise under `file://` and can be ignored: the `willReadFrequently` warning and the `ServiceWorkerRegistration` pageerror. Drop the swiftshader flags on a machine with a real GPU.

Per tab, before committing:

1. `node tools/shot.js <id> 9000`, then open both PNGs and look. A clean exit with a flat canvas is a failure. Equal luminance percentiles mean the sim died.
2. Every preset, by script or by hand.
3. The same hash loaded twice gives the same picture.
4. Export at 2x and at a non-screen aspect matches the screen.
5. Exactly one visible canvas after switching tabs back and forth.

If you fan out to parallel subagents, have each write its block to `tools/modules/<block>.js` and test against a temp copy of `studio.html` with that one block injected before the boot line, then inline the blocks serially. Parallel edits to one 877 KB file will collide.

## 6. Beyond parity: systems I have not seen as interactive, print-grade browser art

I cannot prove that any of these has never been done. They are recent or mathematically deep, visually strong, fit the "real system from a paper" rule, and are absent from both competitors.

1. Arctic circle: uniformly random domino tilings of the Aztec diamond by the shuffling algorithm (Elkies, Kuperberg, Larsen and Propp 1992; Jockusch, Propp and Shor 1998), plus lozenge tilings of a hexagon. Frozen corners, a disordered disk, a sharp circle between them. Exact vectors, so true SVG export.
2. Schramm-Loewner evolution: SLE_kappa curves by discretized Loewner flow driven by seeded Brownian motion (Schramm 2000). kappa slides from simple curves through 8/3, 4 and 6 to space filling at 8. Line medium, SVG export.
3. Micromagnetic skyrmions: Landau-Lifshitz-Gilbert dynamics with exchange, Dzyaloshinskii-Moriya interaction, anisotropy and field. Helical stripes, skyrmion lattices, bimerons, colored by in-plane spin angle. It slots next to `xy` and `nematic`.
4. Active Model B+ (Tjhung, Nardini and Cates, PRX 2018): Cahn-Hilliard plus two activity terms that break time-reversal symmetry. Reverse Ostwald ripening gives bubbly phase separation that never coarsens. It is a small extension of the existing `cahn` step shader.
5. Rotating Bose-Einstein condensate: damped Gross-Pitaevskii equation in a rotating frame. Vortices nucleate at the edge and settle into an Abrikosov triangular lattice (observed by Abo-Shaeer et al., Science 2001). Reuses the Schrodinger tab's machinery.
6. Min protein waves: the MinD/MinE membrane reaction-diffusion system (Loose et al., Science 2008, for the in vitro spirals; Huang, Meir and Wingreen 2003, for the model). Spirals and chemical turbulence from a bacterial cell-division system. Reuses the `rdx` factory.
7. Twisted bilayer moire: the local density of states of the Bistritzer-MacDonald continuum model (PNAS 2011) near the magic angle. Moire that is physics, not two overlaid grids. It sits next to `hofstadter`.
8. Gaussian free field and Liouville quantum gravity: a seeded GFF by FFT, its level lines, and the LQG measure exp(gamma h) with gamma as the headline control (Duplantier and Sheffield 2011).
9. Schrodinger-Poisson fuzzy dark matter: a self-gravitating wavefunction forming solitonic cores inside interference granules (Schive, Chiueh and Broadhurst, Nature Physics 2014). Reuses the Schrodinger tab plus an FFT or multigrid Poisson solve.
10. Föppl-von Karman wrinkling and crumpling of a thin sheet: ridge networks and d-cones on a compressed elastic film.

Items 1, 2 and 4 are the cheapest. Items 3 and 5 would be the strongest plates.

## 7. Shipping

Work on a branch, commit per tab with plain messages in the repo's existing voice, open one PR or fast-forward `main`. Commit identity and any credit line use "Chaos" or the SharpMeow account, never a personal name.
