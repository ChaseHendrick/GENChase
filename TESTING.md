# Testing GENChase

Use this guide to choose checks. A green interface test does not validate a formula.
The authoritative numerical acceptance rules are in [validation/README.md](validation/README.md).

| Changed area | Checks | What a pass means |
| --- | --- | --- |
| Any source/build change | `npm test`, `npm run build:check`, `npm run lint`, `npm run science` | Packaging, catalog and evidence records are consistent |
| Engine/API/recipes/loading | `npm run test:engine`, `node tools/recipe.js` | Compatibility, detached reports, loading/recovery and saved defaults behave as specified |
| Controls, print setup, mobile layouts | `npm run test:ui` | Desktop, touch, folded/unfolded/tablet transitions and art-only recovery pass browser regressions |
| PDF/TIFF encoders | `npm run test:formats`, then the independent Python reader below | File structure, pixels, profiles, dimensions and bleed boxes match fixtures |
| Native prepress | Independent reader with a CMYK profile, below | Conversion preserves required output profile and page boxes; not a full ISO or physical-proof audit |
| Catalog, top bar, sheet zoom and measurement layout | `node tools/studio-navigation-check.js`; `BROWSER=webkit node tools/studio-navigation-check.js` | Tested viewport layout, keyboard focus, search/sort/favorites, whole-sheet zoom and reduced motion behave as specified |
| Local validation app | `npm run test:validator` | Local command restrictions, process control, hardware-card allowlists, privacy redaction and recorded job behavior match regression fixtures; not a science verdict |
| Native Apple GPU wave | `node apps/validate/native.js --verify-only` on Apple Silicon | Bounded Metal/CPU, failure-control, convergence and checkpoint fixtures pass on the identified GPU |
| Numerical module | Its recorded command in `validation/techniques.json`; `node tools/check.js ID 12000`; `node tools/export.js ID 8 300` | Only the numerical test establishes its documented science claim; the other two check runtime/export behavior |
| A status line that prints a measurement against theory | `npm run lint`, `node tools/stats-check.js`, `node tools/check.js ID 12000` | The comparison goes through `U.stats.compare()` with a basis, and the harness recovers known autocorrelation times, standard errors, slopes and tail exponents, with negative controls that must undercover; not proof that a given tab's error bar is adequate |
| Exports, provenance, research data | `npm run test:provenance` | PNG, PDF, TIFF, JPEG and the .npz carry the recipe, build, source hash, device and precision, read back from the real export buttons; the .npz loads and a tab without `exportData()` says so |
| Scope | `npm run lint` | The catalog does not grow past `validation/scope.json` while at least half the tabs are unvalidated |

## Setup

The build and fast checks require Node.js. Browser checks additionally require
Playwright and Chromium. Follow [BUILDING.md](BUILDING.md) for installation and
environment paths. The CI workflow records the maintained browser setup. GPU tests
use Chromium software rendering in CI; physical-device results are a separate scope.

For independent format readers:

```sh
python3 -m pip install -r tools/requirements-prepress.txt
node tools/print-formats-check.js /tmp/genchase-print-check
python3 tools/print-formats-check.py /tmp/genchase-print-check
```

On Windows, choose an equivalent writable directory. To also test native CMYK and
PDF/X conversion, install Ghostscript and append a **test** CMYK output ICC file:

```sh
python3 tools/print-formats-check.py /tmp/genchase-print-check /path/to/test-cmyk.icc
```

CI uses Ghostscript's test/default CMYK profile solely as a conversion fixture.
It is not a recommended profile for a customer's printer.

## Complete PDE CI

The required `complete PDE fields and prints` check waits for four independent GitHub
runners. `numerical` runs the six shorter registered tests, `fields` runs the complete
field and print review, and `half-1` and `half-2` divide the half-float cases. The plan
preserves all eight registered scripts, all 12 field trajectories and 31 print exports,
and all 11 half-float tabs at 100 and 1000 steps with their four failure controls.
Every worker checks build and validation-inventory consistency before running evidence.
The required check fails if planning or any worker fails, is cancelled, or is skipped.

The planning checks require no browser:

```sh
node tools/pde-ci-check.js
node tools/pde-ci.js --check
node tools/pde-ci.js --matrix
```

After installing the workflow's Playwright and Chromium versions, reproduce one worker
with `node tools/pde-ci.js numerical`, `fields`, `half-1`, or `half-2` as its argument.
Each worker bounds its child checks; CI also caps the worker command at 18 minutes and
the whole worker job at 20 minutes. The original sequential command remains available:

```sh
node tools/verify.js --print cahn ohta amb swift ks pfc
```

The [measured sequential run](https://github.com/ChaseHendrick/GENChase/actions/runs/36292512890/job/108545183952)
took 17 minutes 16 seconds overall: about 6 minutes 48 seconds for field and print review,
9 minutes 9 seconds for half-float coverage, and 54 seconds for the remaining checks.
Parallel workers are expected to reduce this check to roughly 7 to 8 minutes when runners
are available. This is an estimate from those timings, not an observed parallel result;
runner queues and machine speed can change the elapsed time.

## Diagnosing a failure

Keep the failing seed, recipe version, module, browser/device, output dimensions and
console error. Advanced print-job JSON and science-report JSON capture relevant
settings and evidence. They do not contain the full evolving simulation field.
Reproduce a failure with its smallest relevant check, fix it, and rerun the affected
checks. Do not relax scientific tolerances or hide warnings just to get green CI.

Generated files must come from `node tools/build.js`, `node tools/index.js` and,
when records change, `node tools/science.js --write`. A changed source fingerprint
requires reviewing its evidence; updating the fingerprint alone adds no validation.

The Chromium volunteer CI also runs `node tools/harvest-browser-check.js` against real plates and deliberate misses, and `node tools/validator-process-check.js` against real detached browser processes. `node tools/validator-ui-check.js` tests the local app in Chromium; prefix it with `BROWSER=webkit` for WebKit.

## Local jobs and browser scope

The [local app](apps/validate/README.md) records the command, source snapshot, environment and full log for each job. A result bundle helps another person inspect a result; external dependencies and hardware still need to be supplied. Review the reported scope, source changes and evidence gaps before treating a completed job as usable scientific evidence. Resumed verification preserves completed-test boundaries only under a matching source/context fingerprint. It does not infer that unregistered or missing checks passed.

WebKit navigation coverage uses the same checks as Chromium. Install the tested version with `npm install --no-save --package-lock=false playwright@1.58.2`, then `npx playwright install webkit`, as the CI navigation job does. Passing in Playwright WebKit is not a claim that every Safari release or physical device was tested. See [the recorded layout scope](docs/BROWSING-AND-LAYOUT.md#interface-motion-and-browser-scope) and [separate native Apple GPU evidence](apps/validate/APPLE-GPU.md).
