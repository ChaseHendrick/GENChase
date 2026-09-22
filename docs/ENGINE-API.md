# Stable engine API, version 1

The maintained engine is [`src/shared/engine.js`](../src/shared/engine.js). The old
`src/shared/studio.js` name is retired. `Studio.apiVersion` is **1** and
`Studio.recipeVersion` is **2**. Both version properties are read-only.

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
// Example for a future recipe version 3, not an instruction to change version now:
legacy: { 2: { grid: 192 }, 3: { grid: 256 } },
defaults: { grid: 512 }
```

Recipes older than version 2 get 192; version 2 gets 256; version 3 gets 512.
An explicitly saved `grid` always wins. Migrations apply newer transitions first,
so the earliest applicable historical default wins for old hashes. The API test
covers successive changes and explicit overrides; `tools/recipe.js` covers existing
module declarations. This does not guarantee identical pixels after a documented
solver correction or across GPU implementations.

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
preset must report failure. Other legacy modules return `null` until explicitly
migrated. No HTML diagnostic is automatically parsed or promoted into scientific data.

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
