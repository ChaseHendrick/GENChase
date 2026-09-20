# RESEARCH

Ledger of prior-art searches and physics claims for GENChase. Handwritten, not generated. Last updated 2026-09-19.

Agents: read this file **before** a web search for "has this been done", "is this a new law", or "never been theorized". Humans: the same, if you are about to spend an afternoon proving a negative.

The catalog of what the file actually contains is [`techniques.json`](techniques.json). Derived identities live in [`IDENTITIES.md`](IDENTITIES.md). This file is only about what was looked up, what was derived, and what was not.

## Do this, do not do that

**Do**

- Add a line here the same day you search. A search that is not written down will be done again.
- Record the query, the date, what you opened, what you could not open, and the conclusion in one sentence.
- Credit the paper in the tab. A missing browser demo is not new science.

**Do not**

- Re-run a search this file marks skip, unless you have a newly named repository, paper, or site that was previously unreachable.
- Put a name on a published equation or on someone else's result. If you derived something, checked it against the papers, and put a check on the plate that fails when it is wrong, claim it: write [`IDENTITIES.md`](IDENTITIES.md) the same day. Hendrick's identity is that case. It is not Gröbli's motion and it is not Aref's product under a new name.
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
| A result derived here, uniqueness-checked against the papers, with a failing plate | Yes | [`IDENTITIES.md`](IDENTITIES.md) |
| A published equation plus a feedback term | Not an invention | `track`, `causticsea` |
| Familiarity bucket `unseen` | Editorial, not a result | `techniques.json` |

## Physics

**Published, implemented, not claimed, with one exception.** Almost every tab names a paper in `credit`. Gray-Scott is Gray and Scott. Wilson's algorithm is Wilson's. The self-check numbers in the README are measurements from the plate against those papers, not new predictions. Hendrick's Identity is the exception: derived here, uniqueness-checked, locked to the plate.

**The one derived lock.** The statement, the minimum, what it is not, and how the plate fails it live in [`IDENTITIES.md`](IDENTITIES.md). Three point vortices of circulations 1, 1, -1/2 collapse self-similarly when L = 0 (Gröbli 1877; Aref, Phys. Fluids 22, 057104, 2010). Aref gave the collapse rate and the spin as separate formulae. On this family their dimensionless product is

    omega t_c = (2 - cos^2 theta) / sin(2 theta)

which has a unique minimum of sqrt(2) at tan theta = 1/sqrt(2), the triangle with angles 22.5, 45, and 112.5 degrees. At construction theta = 45 degrees the same product is 3/2. That identity is not in those papers. The plate reports omega t_c / sqrt(2) against 1, the similarity residual against 0, and signed L against 0. Off the L = 0 circle, all three fail.

Do not re-derive this unless the plate is failing the lock. Do not search the name of the tab as if it were a published law. Do not put that name on a different system.

**Rejected as inventions.**

- `track` is a self-written waveguide (Monro, de Sterke, Poladian, J. Mod. Opt. 1998) and a photorefractive soliton (Segev) on a sine-Gordon breather. Open loop (eta = 0) recovers the Lorentz speed.
- `causticsea` is Swift-Hohenberg as its own phase screen. Laser-induced surface patterns are already modelled with Swift-Hohenberg (Rudenko, Colombier, Itina, Stoian, Phys. Rev. Lett. 130, 226201, 2023).
- A Swift-Hohenberg loop is not a new law. Neither is a sine-Gordon breather with an index written from strain.

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

117 techniques. `science only` means the paper is credited and nobody logged a "is there already a browser plate" search. That is most of the studio. Do not upgrade a `science only` row to "never been done" without searching, and do not search it unless you are about to claim software novelty.

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

## Notes on the rows that are not `science only`

### Derived identity (the only physics claim that is not in the cited papers)

The statement is in [`IDENTITIES.md`](IDENTITIES.md). Do not duplicate it here.

**`hendricks-identity` (Hendrick's Identity).** `#hendrick` still opens it. Derived here, uniqueness-checked, locked to the plate. Search notes: Aref 2010 eqs. 25a and 25d give Omega and tau separately. Aref eq. 29c already writes the product as the pitch of the logarithmic spiral. Kudela 2014 and Reinaud-Dritschel 2022 minimize collapse time, not the product. Krishnamurthy-Stremler 2018 give dimensionless tau-tilde as a function of angles, no min sqrt(2). Closed form and min: not in those papers. Off the L=0 circle the check fails on purpose. Re-search: YES do not re-derive; reopen only if a newly named paper states this closed form or this minimum.

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

Conclusion: the plate is Hendrick's Identity, so the hash is `#hendricks-identity`. `#hendrick` remains an alias. The identity stands: it was derived here, the plate fails off the L=0 circle, and the closed form and min are not in the papers. A later agent may claim another result the same way (derive, check the papers, failing plate, write IDENTITIES.md). It may not put a name on a published equation or on someone else's result.

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


