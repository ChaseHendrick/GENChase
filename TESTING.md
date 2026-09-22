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
