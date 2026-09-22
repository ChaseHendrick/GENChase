# Maintained source and portable builds

Edit `src/studio.html` (markup and ordered includes), `src/styles/*.css`,
`src/shared/engine.js` (shared engine, utilities and GPU helpers), or one
`src/modules/*.js` family. Shared family helpers stay with their callers. For an ordinary
edit, use `techniques.json` to find a tab, then read its source and one relevant neighbor.
Do not inspect the generated HTML or load every module to change one technique.

```sh
node tools/build.js
node tools/index.js
npm test
node tools/build.js --check
node tools/lint.js
node tools/science.js
```

The build produces three committed artifacts from the maintained source:

| Output | Purpose |
|---|---|
| `index.html` | Thin folder entry, served over local HTTP |
| `src/module-manifest.json` | Maps each tab ID to its family and loading metadata |
| `dist/studio.html` | Self-contained portable copy with embedded license notices |

The folder loads local engine, styles and selected family files. A family may register
several tab IDs; the generated manifest resolves that mapping. No CDN, framework or
runtime package is required. Never edit these generated artifacts by hand.

Launch the folder with `python3 run/genchase.py`, or serve it yourself:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
# Open http://127.0.0.1:8080/index.html
```

The folder entry needs HTTP for module loading. `dist/studio.html` can be opened directly,
subject to browser restrictions on clipboard and local storage. End users do not need Node,
`npm install` or a build. The private `package.json` contains development shortcuts only.

## Development shortcuts and scientific checks

| Command | What it does |
|---|---|
| `npm run build` / `npm run build:check` | Generate artifacts / check freshness |
| `npm run index` | Regenerate catalogs and count stamps |
| `npm run lint` / `npm run science` | Structure / validation inventory consistency |
| `npm test` | Fast build, runner and folder checks, then list all evidence and gaps |
| `npm run test:solvers` | Run all registered numerical evidence |
| `npm run test:print` | Run all registered numerical and print evidence |
| `npm run test:all` | Fast checks, build, lint and inventory checks, then all registered evidence |
| `npm run validator:headless -- --mode inventory --machine m1pro` | Run a recorded inventory job without the app UI |
| `npm run validator` | Start the optional loopback validation/contribution app |
| `npm run test:validator` | Test local job control, checkpoints, command restrictions and candidate safeguards |

`npm test` needs only Node and does not execute scientific benchmarks or browser tests.
The full scientific CI remains in place. Tests using Chromium need the development harness:

```sh
npm install --no-save --package-lock=false playwright@1.49.1
npx playwright install chromium
```

Those optional contributor tools are not runtime dependencies and are not recorded in
`package.json`. The builder and catalog generator need only Node; `node tools/index.js`
reads the maintained registrations without starting a browser.

Catalog generation shares one source snapshot within a run instead of evaluating every
module three times. A frozen-output comparison preserved all generated files; three
alternating local runs reduced median catalog time from 739 ms to 293 ms. These timings
are machine-specific. The condensate vortex diagnostic also uses an exact spatial
neighbor search; `node tools/bec-neighbors-check.js` compares it with brute force,
including tied distances. Neither optimization changes a numerical validation label.

To target specific techniques or preview the full evidence plan:

```sh
node tools/verify.js --print schrodinger convection
node tools/verify.js --list --print --all
```

The runner checks build and inventory consistency, deduplicates shared tests and reports
missing evidence. Broad execution commands can finish with exit code **2** because evidence
is missing, even if registered tests passed. The list command only shows a plan; it does not
run benchmarks or check inventory freshness. A passing run supports only its recorded cases
and never promotes scientific status automatically. See [tools/VERIFY.md](tools/VERIFY.md).

Commit sources and generated artifacts together. CI rejects stale builds, omitted modules,
duplicate includes, missing validation records and stale reports. Catalog count stamping
updates the source template and rebuilds. Scientific changes require relevant numerical and
print checks, not only build parity or runtime success.

## Reproduction limits

Keep the studio revision, seed, settings, simulation resolution and environment with a research
result. A seeded generator preserves inputs; it does not guarantee identical pixels across
solver corrections, browser or GPU changes, or arbitrary output dimensions. Increasing print
resolution does not refine a grid simulation. Document intentional changes to numerical results.

## Migration evidence

The initial extraction at main `7fc3dd9` reconstructed the original 2,760,741-byte HTML exactly:
SHA-256 `da91673f4b6f663e72440973866d9a9576976d828f8fb35d6ee5cbd3d98cc6c4`.
The extraction created 97 included files without changing JavaScript, shader or CSS bytes.
Subsequent changes update license and validation explanations in the template, not simulation algorithms. The license bundle is also embedded so notices travel with standalone copies.
The check command compares the complete generated artifact, not a screenshot or file size.

## License provenance review, 2026-09-21

The repository owner authorized migration from PolyForm Small Business to Apache-2.0.
The reviewed Git history contains Chaos author records and historical Claude tool author records;
the source notice identifies Chaos as copyright holder. A scan of the current HTML and module
sources found no additional embedded copyright/license notices. This is a repository-level review,
not proof of the provenance of every algorithm. The separately embedded Geist, Geist Mono and Instrument Serif fonts remain under SIL OFL 1.1; upstream license texts are retained in licenses/ and embedded in the portable HTML alongside the software notices. Scientific citations remain intact; citations alone
do not license copied implementation code. Preserve any third-party notices when adding such code.

LICENSE contains the standard Apache-2.0 text from the Apache Software Foundation.
NOTICE records attribution; OUTPUT-RIGHTS.md preserves the separate output grant.
This changes the current release, not historical commits. Frozen research snapshot files remain
byte-for-byte unchanged. Old commercial restrictions no longer describe this release.

## Larger field and particle experiments

`node tools/verify.js --print maxwell molecular` runs the registered operator, trajectory and
print-state benchmarks for the new electromagnetic and molecular modules. Their largest optional
settings need more memory or CPU time; smoke tests at a large size are not scientific validation
of every long trajectory. Read [Maxwell's limits](validation/MAXWELL.md) and
[the molecular model](validation/MOLECULAR.md) before interpreting their diagnostics.

## Python research analysis

`python3 tools/cahn-scaling.py` reproduces the fit, whole-seed uncertainty and held-out checks from committed GPU measurements using only the standard library. `--controls` exercises known synthetic laws, held-out corruption and correlated-frame uncertainty. This complements the Python launcher in `run/`; it does not replace the browser solvers. See [experiment outcomes](experiments/README.md).


### Additional model checks

`node tools/verify.js --print surfaces plasma shallow nonreciprocal` runs independent
geometry, particle/field, exact shallow-water wave and nonlinear-mixture benchmarks,
then their actual export-state checks. These support the bounded claims recorded in
`validation/`; they do not establish every model or parameter choice as accurate.

## Optional native experiments

[Heavy computation](docs/HEAVY-COMPUTE.md) documents the separate NumPy/CuPy runner. These optional dependencies do not change the dependency-free browser studio or fast Node checks. `python tools/heavy-runner-check.py` runs CPU reference and CLI checks after installing NumPy. CUDA needs separate hardware verification.

The [engine API contract](docs/ENGINE-API.md) documents the stable extension boundary.
Run `node tools/engine-api-check.js` for witness, RNG, successive recipe migrations
and shared print preferences, alongside the existing recipe and folder browser tests.

`node tools/colophon-check.js` checks shared caption editing and PNG placement on desktop and narrow mobile screens.

Print-container checks: `node tools/print-formats-check.js /tmp/genchase-print-check`,
then `python tools/print-formats-check.py /tmp/genchase-print-check` with the optional
`tools/requirements-prepress.txt` dependencies installed. CI also tests Ghostscript
conversion with a test CMYK profile. See [the printing guide](docs/PRINTING.md).

## Optional local compute app

[`apps/validate/`](apps/validate/README.md) provides a separate local interface for official checks and bounded experiments. It uses Node and fixed commands, with no framework, model service or API token. Its default job is `node tools/verify.js --print --all`; existing scientific CI stays required. macOS and Linux support the process-group job runner. Apple Silicon macOS and Apple command-line developer tools are required for its native Metal backend and Apple power readings.

Run `npm run validator`, then open `http://127.0.0.1:8787`. Job artifacts stay under Git-ignored `apps/validate/.runs/`; source candidate files are written under `identities/candidates/`. The [local app guide](apps/validate/README.md) documents stop/resume boundaries, portable bundles and offline behavior. The [Apple GPU report](apps/validate/APPLE-GPU.md) records the tested native scope separately from browser software-renderer CI.

The shared module browser and sheet layout have a [navigation regression](docs/BROWSING-AND-LAYOUT.md#interface-motion-and-browser-scope). Run it in both Chromium and WebKit when changing catalog controls, top-bar layout or whole-sheet zoom.
