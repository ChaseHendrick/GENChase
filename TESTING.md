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
