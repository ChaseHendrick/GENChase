# Stable engine API, version 1

The maintained engine is [`src/shared/engine.js`](../src/shared/engine.js). The old
`src/shared/studio.js` name is retired. `Studio.apiVersion` is **1** and
`Studio.recipeVersion` is **5**. Both version properties are read-only. Version 3 (2026-09-24) keys the Ising
tab's Metropolis random numbers by the seed, so runs with different seeds are independent; recipes older than
v3 keep the shared stream through `legacy: { 3: { stream: 'shared' } }` and reprint as they were made.
Version 4 (2026-09-24) makes the lozenge tab's frozen test the rim-connected one (a rhombus is frozen when rhombi
of its own orientation join it to the rim); recipes older than v4 keep the local radius-3 test through
`legacy: { 4: { ring: 3 } }` and reprint as they were made.
Version 5 (2026-09-25) gives the vegetation tab a time-step ceiling that combines water diffusion and upwind
advection. Recipes older than v5 get `ceiling: 'v4'` through `legacy: { 5: { ceiling: 'v4' } }`: they keep
the step the separate limits gave them wherever that step was stable, and so reprint, and take the combined
ceiling where it was past the explicit bound, where the plate was a growing grid-scale checkerboard
([validation/PDE-ORDER.md](../validation/PDE-ORDER.md)).

## Compatibility boundary

| Stable surface | Contract |
| --- | --- |
| `Studio.register(definition)` | Register the existing module definition and lifecycle described in the module contract. |
| `Studio.util.makeRng(seed)` / `host.util.makeRng(seed)` | Preserve the current seed mapping and RNG sequence. Add an explicitly versioned alternative for incompatible changes. |
| Hash recipes and `Studio.getRecipe(id?)` | Versioned recipe data. The getter returns a detached JSON snapshot for an instantiated module, or `null`; omitted ID selects the active module. |
| `host.setWitness(record)` / `Studio.getWitness(id?)` | Structured scalar comparison with explicit missing data and tolerance semantics. |
| Print and colophon | The engine owns physical sizes, presets, custom dimensions, DPI, limits, download UI and captions. Modules implement `exportPNG(width, height)` and optional actual-geometry SVG. |
| Lazy lifecycle | The engine owns loading, failed-load UI, retry and tab switching. Implementations use the existing create/regenerate/repaint/pause/resume contract. |

Preserve version-1 behavior when improving these surfaces. A breaking change requires
an API version change, migration documentation and compatibility tests. Do not rename
module methods, change existing RNG streams or alter recipe interpretation silently.
This is a compatibility contract, not a claim that every module's mathematics is valid.

## Recipe default changes

Recipe `v` is separate from the API version. Before a default changes, advance the
engine recipe version and declare the old value at that transition:

```js
// Example for a future recipe version 6, not an instruction to change version now:
legacy: { 2: { grid: 192 }, 6: { grid: 256 } },
defaults: { grid: 512 }
```

Recipes older than version 2 get 192; versions 2 to 5 get 256; version 6 gets 512.
An explicitly saved `grid` always wins. Migrations apply newer transitions first,
so the earliest applicable historical default wins for old hashes. The API test
covers successive changes and explicit overrides; `tools/recipe.js` covers existing
module declarations. This does not guarantee identical pixels after a documented
solver correction or across GPU implementations.

The recipe owns the keys `v`, `seed`, `palette`, `bg` and `id`, and `sanitize` writes
`v` after the schema clamps. A module may not key a control with any of them, or set
`v` or `id` in its defaults or presets; `tools/lint.js` rejects both.

## Scientific witness data

Report status first, then its matching comparison:

```js
host.setStatus('<span>Model diagnostics</span>');
host.setWitness({
  label: 'Relative residual', measured: residual, expected: 0, tol: 1e-9,
  valid: assumptionsHold,
  missWhen: 'Outside the stated domain or residual exceeds the tolerance.',
  units: '', step: completedSteps
});
```

`measured`, `expected`, `tol` and optional `step` accept finite numbers or `null`.
Tolerance is **absolute**, nonnegative and in the measurement's units. Strings,
NaN, infinity and negative tolerances are rejected. Labels, units and `missWhen`
are text, rendered safely by the engine. `missWhen` documents the criterion; the
engine does not execute that text as a predicate.

The engine computes `abs(measured - expected) <= tol`. `valid: false` records a
failed precondition even if the numeric comparison agrees. `valid: true` cannot
override a failed tolerance comparison. Explicit `valid: null` preserves “not
evaluated”; missing numerical inputs also produce `null`. Omitting `valid` lets
the engine evaluate a complete numeric comparison. A tolerance pass is not proof
of scientific accuracy, independence, convergence or novelty.

The getter returns a detached JSON object containing those fields, `schemaVersion: 1`,
`moduleId` and the versioned recipe at reporting time. Mutation of the returned object
cannot change the live result. `setWitness(null)` clears it. New status, parameter
changes, regeneration, faults and context loss invalidate old data. Evolving modules
must publish again for every new reported state; the engine cannot infer solver steps
from pixels. Pause alone preserves the last measured state.

Display numbers are shortened for readability; JSON retains full numeric precision.
The stage renders “not evaluated,” “within tolerance,” or “check failed.” This
scientific comparison is separate from the existing pixel-motion Live/Still witness.
It is not automatically added to a print colophon, where a changing measurement could
misrepresent the exported state.

Polygon collapse bounds publishes its existing measured velocity-fit residual and
its existing off-family failure condition through this API. The deliberately broken
preset must report failure. Reuleaux publishes a boundary sampling regression witness,
which is not a pixel-width measurement. Other legacy modules return `null` until explicitly
migrated. No HTML diagnostic is automatically parsed or promoted into scientific data.

The witness also takes optional `basis` (`sampled`, `exact`, `deterministic` or `construction`),
`uncertainty` (one standard error, finite and nonnegative, or `null`) and `method` (text). They are
additive: a record without them is still valid, but `tools/lint.js` requires a `basis` in every
`setWitness()` call in `src/modules/`. A status-line comparison uses `Studio.util.stats.compare()` with the
same fields; see AGENTS.md, "A measured number carries an error bar".

## Provenance and research data

These are additive API version 1 surfaces.

| Surface | Contract |
| --- | --- |
| `Studio.build` | Frozen build facts from `tools/build.js`: `build` (12 hex characters), `fingerprint` (SHA-256 of the assembled source), `sources` (SHA-256 per script), `sourceOf` (tab id to source file) and `validation` (tab id to status). |
| `Studio.validationStatus(id?)` | The tab's status from `validation/techniques.json` at build time, or `null`. |
| `Studio.getProvenance(id?)` | A detached record of what made the current plate: software, API and recipe versions, build, source file and its SHA-256, validation status, recipe and link, the witness, and the device (WebGL2 renderer and vendor, or CPU; which render-target precisions the state used). Nothing time-dependent, so it is deterministic for a given recipe, build and device. |
| `Studio.exportData(id?)` | A `Promise<Blob>` of an uncompressed `.npz` that `numpy.load` reads: one `.npy` per array from the instance's `exportData()`, plus `meta.json` (provenance, arrays with shape, dtype and units, the module's grid metadata and the status text). A technique without `exportData()` yields `meta.json` only and says so. |
| `Studio.util.stats` | The uncertainty harness, `src/shared/stats.js`. |
| `Studio.gl.readTarget(target)` | A render target as a `Float32Array`, rows top to bottom. |

Every export embeds the provenance: PNG as a `Software` tEXt chunk and a `GENChase provenance` iTXt
chunk, PDF in its Info dictionary (`/Producer`, `/Title`, `/GENChaseProvenance`), TIFF in its
ImageDescription (270) and Software (305) tags, JPEG in a comment segment, SVG in a `<metadata>` element,
and the print-job JSON under `provenance`. WebP carries none. The renderer string can identify the
graphics hardware; it is recorded because precision and driver differences are part of what made the
file. `node tools/provenance-check.js` reads every one back through the real export buttons.
`node tools/run.js <hash> --out plate.npz --steps N` runs a recipe headlessly through `Studio.exportData()`.

## Contributor on-ramp and checks

Copy the single [`src/modules/_template.js`](../src/modules/_template.js). Its witness
starts with null measurements and no success claim. Keep print-size controls out of
the module schema; physical simulation dimensions and grid resolution remain model
parameters. Follow the [module contract](../tools/modules/CONTRACT.md).

`node tools/engine-api-check.js` tests the real engine, a controlled fixture, the real
polygon module and its broken control, successive recipe defaults, fixed RNG output,
invalid inputs, stale-data clearing, snapshot isolation, safe text rendering and
shared print/colophon preferences across tabs. CI also retains saved-recipe, lazy-load,
loading failure/retry, UI, print and all scientific checks.

## Caption editing on desktop and mobile

Use **Studio setup** beside the print controls, or in the export dialog. The shared
editor places the colophon above, underneath, left or right of the artwork. Each
part can be hidden and restored: title, equation, seed, parameters, palette,
print dimensions/resolution and date. **Restore all parts** restores their visibility.
The master switch controls whether the sheet includes a caption at all.

Preferences persist on the current device across techniques. They are presentation
settings, separate from the versioned scientific recipe. Hidden details are omitted
from the caption; retain the recipe link or settings JSON when reproducibility matters.
Parameter text preserves stored numeric precision. A caption is not a simulation-state
checkpoint or a scientific validation certificate.

The preview and PNG use the same measured paper coordinates. All four placements
remain available on mobile, with touch-sized controls and a scrolling editor.
Long tokens wrap and text shrinks to fit the reserved region on small sheets.
Inspect the exported file for comfortable physical text size. No text is silently
truncated to a fixed line count. Browser printing preserves the preview arrangement;
use PNG export for the requested pixel dimensions. Caption editing is disabled while
an export is running so one file cannot mix different caption choices.

`node tools/colophon-check.js` checks placements through the real PNG path, aspect
ratio, long text, visibility/restoration, saved preferences and mobile widths of
320 and 390 pixels. These are presentation regressions, not numerical validation.

## Workload preferences and science reports

**Device workload** is a persistent engine preference. Balanced retains the existing
preview and scheduling defaults. Lighter use caps previews at 2 million pixels and
pixel ratio 1. Maximum throughput retains the 8 million pixel / ratio 2 preview limits.
Direct gravity uses cooperative CPU slices of 2/8/12 ms with a 16 ms delay in lighter
mode. Volume wave uses one step per update in lighter/balanced mode and up to four
in maximum mode, with a 66 ms minimum work interval in lighter mode. Pending warm-up
steps and GPU fences remain bounded. Other techniques retain their own scheduling.

`Studio.getComputeBudget()` and `host.computeBudget()` return detached budget data.
They are additive API version 1 methods. These are work preferences, not measured CPU
or GPU utilization targets. They do not raise grids, alter numerical timesteps, remove
memory limits or start paused simulations. Wall-clock playback speed and preview
resolution can change; use finite-step tests to compare numerical results.

The **Science report** button on the stage shows the selected technique's inventory
status, source, numerical/print evidence, known limits, remaining work, current
structured witness and source fingerprint. A JSON download captures the report and
recipe. Folder builds load the inventory only when requested, with retry on failure;
the portable build embeds it. Missing evidence and missing structured measurements
are reported explicitly, without substituting Live/Still motion for validity.

## Catalog navigation and preview layout

The [module browser](BROWSING-AND-LAYOUT.md) uses catalog metadata for searching and sorting without instantiating every simulation. Reference-year ordering and editorial familiarity categories do not change module IDs or recipe interpretation. Favorites are a local presentation preference.

Zoom/pan transform the complete preview sheet so caption text scales with the artwork. Status and scientific witness text occupy their own panel below the art viewport. These are shared presentation changes; they do not alter numerical parameters, the recipe version or the physical print dimensions. Catalog/layout changes require `tools/studio-navigation-check.js` in Chromium and WebKit in addition to affected engine, recipe and print regressions.
