# Local validation and contribution app

Use your own computer for recorded checks and bounded research experiments. The app runs locally, without a model, API key, account or AI tokens. It is separate from the browser studio and uses the repository's existing checks.

**A green job is machine evidence, not scientific certification. A candidate is not a discovery.** No job changes a technique's validation status or promotes a candidate to the research catalog automatically.

For a terminal-only workflow, use the [headless contribution guide](HEADLESS.md), including how to review and share results through GitHub.

## Start on your Mac

From a Git checkout of GENChase, with Node.js and Git available:

```sh
npm run validator
```

Open **http://127.0.0.1:8787**. Keep that terminal open. Closing or reopening the browser does not stop a job. Stopping the server stops its job; the worker also watches for a lost server. The Mac must stay awake to continue computing. To prevent idle sleep while the server runs:

```sh
caffeinate -i npm run validator
```

Only one validator server and one job may use this checkout's job folder at a time. The process-group runner supports macOS and Linux, not Windows. Native Apple GPU work and macOS heat/battery readings require Apple Silicon and Apple's command-line developer tools. Install those tools once with `xcode-select --install` if they are missing. Linux can run the compatible repository checks but does not provide the Apple controls.

Browser-based checks additionally need Playwright and its Chromium browser. Follow [the development setup](../../BUILDING.md#development-shortcuts-and-scientific-checks). Dependency and browser installation uses the network once; installed checks and local candidate searches run offline. Some checks need additional dependencies documented in [TESTING.md](../../TESTING.md). Missing tools cause a reported failure, not an automatic installation.

## Check simulations

The default is **All registered numerical and print checks**. This is the official evidence runner, not a promise that every setting in every module is covered.

| Job | Command |
| --- | --- |
| Fast development checks | `npm test` |
| Science inventory | `node tools/science.js` |
| All registered numerical checks | `node tools/verify.js --all` |
| All registered numerical and print checks | `node tools/verify.js --print --all` |
| One technique: numerical and print | `node tools/verify.js --print ID` |
| One technique: runtime and determinism | `node tools/check.js ID 12000` |
| One technique: 8-inch, 300 ppi export | `node tools/export.js ID 8 300` |
| Full development and registered science checks | `npm run test:all` |
| Hardware GPU: registered GPU science and print checks | `node tools/gpu-science.js` |

Choose `ID` from the catalog. There is no freeform command box. The [runner guide](../../tools/VERIFY.md) explains evidence gaps and exit codes. In particular, exit **2** means requested evidence is incomplete, even when all registered tests passed. The app retains that result instead of turning it green.

Progress counts completed registered checks or native simulation steps when those counts are available. It is not an estimate of time remaining or a percentage of scientific validation. Otherwise the app shows the active stage and elapsed time without inventing a percentage.

## Run experiments

**Run experiments** offers these bounded jobs:

| Job | What it produces |
| --- | --- |
| Two-polygon candidate | A numerical coefficient fit, seeded hold-out sweep, deliberately wrong controls, a real plate check and local literature comparison |
| Maxwell design search / robustness | Logs from the existing electromagnetic experiments |
| Molecular preparation / Cahn coarsening | Logs from the existing experiment runners |
| Apple GPU periodic wave | A native Metal verification report and a configurable three-dimensional workload with checkpoints |
| Art: seed hunt, deep render, evolve | Studio recipes rendered at print size, print-sharpness proxy scores, kept prints and a local gallery page. See [Art modes](#art-modes). |

The first candidate adapter uses the already documented two-polygon vortex family, with 2 to 5 vertices per polygon. It can recover a known result. It is not a general symbolic theorem prover or an automatic discovery engine. The coefficient fit is numerical, with a stated sample domain and tolerance. The plate check must accept the expected case and reject the deliberately broken case.

The adapter reads `RESEARCH.md` before doing the derivation, then scans available repository text and saves new `.json`, `.md` and `-research-draft.md` files under `identities/candidates/`. It never overwrites an existing candidate, edits `RESEARCH.md`, or promotes a statement into `IDENTITIES.md`. The report retains failures, its reproduction command, source hashes, sampled domain and miss conditions.

The offline comparison uses text matching and the existing polygon-family derivation. It does not follow external citations, extract binary PDFs or establish mathematical equivalence through a proof. Its classifications are only **matches known source**, **not found in sources checked**, or **search incomplete**. Priority remains **unconfirmed** in every case.

**Online prior-article search** is optional. Opening the panel only shows suggested queries; following a query link opens an external search page and uses the network. No automatic online search or model call occurs. A human must inspect sources and record what was actually checked before making any originality claim.

## Art modes

Three art jobs use this computer to render studio plates at print size. Each plate goes through the studio's own path: the recipe hash, the shell's sanitizer, regeneration and the shell's own export. They cover the `cahn` and `turing` tabs in this release.

| Job | What it does |
| --- | --- |
| Art: seed hunt | Renders a block of seeds of one tab (from a base recipe or the defaults) and orders the prints. Seeds are `h-` followed by the seed number in base 36. The first seed is drawn at random unless you choose it, so volunteers cover different seeds without a server. |
| Art: deep render | Renders one recipe for a chosen number of steps and exports it, 20 in at 300 ppi by default (hunts and evolve default to 8 in). The steps may not exceed the tab's own warm-up maximum (2000 on `cahn`, 6000 on `turing`). |
| Art: evolve | Renders 1 to 6 parent recipes and, for one generation, children made by a new seed, a new palette, or a small change drawn from the tab's own surprise settings for the same model. |

**The step count is part of the recipe.** Every job writes `running:false` and `warmup:N` into the recipe, and a plate counts only when its status reads step N and paused. Refresh rate, wall time and budgets cannot change a plate. The same recipe at the same step count gives the same plate on the same renderer and Chromium build, and a statistically similar plate elsewhere; identical pixels across GPUs are not claimed. Jobs refuse to run without WebGL2 and float32 color buffers. Plates are rendered with full motion: a viewer whose browser asks for reduced motion still sees only the first 80 steps of a `cahn` recipe, a known studio limitation.

**What the score means.** Candidates are ordered by print-sharpness class (sharp, ok, soft, using the thresholds of `tools/sharp.js`), then by the entropy of the luminance histogram. The metrics are measured on a central 1024 px crop of the real export at native pixels, at every pixel offset, so they are not comparable with the 2026-09-24 print audit; at 8 in and 300 ppi that crop is about 18% of the sheet, at 20 in about 3%. The flat gate looks at a 200 px reduction of the whole sheet. Entropy and edge are measured again on the four corner crops of the same size, and their standard deviation over the five crops is each candidate's sampling error, shown as ± in the gallery. It is a lower bound, since the crops overlap on a small sheet. The metrics are proxies for print sharpness and tonal range at that print size, grid, step count and renderer, comparable only within one job. They are not a measure of beauty or composition and not scientific evidence, and they favour high-contrast, fine-grained plates and early coarsening stages. Flat plates, grid-scale checkerboards, numerical-guard stops and failed witnesses are rejected with the reason recorded. At the end the best candidate and one other are rendered again in fresh pages, and their central crops are compared by metrics and by a hash of their luminance. On one renderer that difference is 0 by construction, so it only shows that the job is repeatable. The ranking is called informative only when the spread between candidates exceeds twice their pooled crop sampling error; otherwise the gallery says the order may be sampling noise. It also says so when a repeat did not reproduce its metrics.

**Refusals.** Every art job refuses a print size that would need more than half this computer's memory, before anything renders. A deep render calibrates at up to 240 steps, then refuses, rather than trims, a request whose estimate exceeds its budget (default 120 active minutes; it prints the largest step count that fits), a step count over the tab's maximum, or a grid the tab does not offer. A hunt's base recipe and an evolve parent that the engine would clamp, such as a warm-up over the tab's maximum, are refused too. A different grid is a larger domain with an unrelated initial field: the result is labelled a new plate, not an enlargement. Any recipe key outside the tab's own settings is refused. Refusals exit with code 3.

**Evolve.** Children keep the parent's run, grid, aspect, time-step, boundary and stencil settings, and keep its model; the engine may still lower the time step to its stability ceiling after a change, which the record lists as clamped. The engine's sanitizers still run. Joint physical constraints between settings are not checked, so every child is an unvalidated recipe, not scientific evidence. The gallery lets you tick parents and copy the command for the next generation.

**Budgets and time.** A budget counts active computing time: duty-cycle, battery and thermal pauses are not counted, with about 10% error at the light setting. A hunt that reaches its budget stops starting candidates and exits 0; Resume continues it. Timeouts use the same clock.

**Results** stay in the job folder: `art/gallery.html` (open it from disk), `art/candidates.json` with every candidate and its reason, `art/recipes.txt` in rank order, thumbnails for the best 60, prints and the studio's print-job JSON for the best *Prints kept* candidates, and `browser-report.json` with the browser and renderer. Nothing is written into repository paths. The app cannot show the images itself.

## Measurement corpus and misses

Check simulations offers **Harvest all module measurements** and **Harvest one module measurement**. These record default recipes after a bounded three-second observation interval. They retain structured witnesses and literal numbers from status text, with offsets into that text. Prose numbers have no inferred units or acceptance rules. Missing structured witnesses stay unassessed. A witnessed disagreement or runtime failure produces a visible miss and a nonzero job exit.

Use **Download measurements** for the corpus. The same file is saved under `validation/results/witnesses-<commit>-<machine-slug>.json`. Miss packets are saved under `run/validator/misses/` and remain listed until you review them. A successful later job does not silently remove them. Both result locations are ignored by Git by default; choose which reviewed files to publish. No result stamps a technique validated or a formula novel.

## Heat and power

Choose **Light**, **Balanced** or **Continuous compute**. Light and Balanced schedule roughly 25% and 50% running time in a repeating four-second duty cycle; Continuous requests uninterrupted work. These settings pause and resume the complete job process group. They are not exact CPU/GPU utilization percentages, watt limits, temperature limits or guaranteed cooling rates. Work already submitted to a GPU can finish while the submitting process is paused.

On Apple Silicon macOS, **Pause on battery** and **Pause at serious or critical thermal state** use Apple's system readings. With thermal protection enabled, an unavailable thermal reading also pauses work and is reported. These controls supplement the operating system's own thermal management. They do not report a temperature in degrees. Changing a duty preference does not change the solver's numerical timestep.

The native Metal job first verifies the actual Apple GPU against a CPU reference and failure controls. If that verification fails, the workload does not start. Other browser checks may deliberately use Chromium's software renderer, so a GPU-themed studio module does not imply that its validation job uses the physical GPU. See [the Apple GPU evidence and limits](APPLE-GPU.md). The **Hardware GPU** job is the exception: it runs the registered GPU science and print-state tools on this computer's own GPU through Chromium, refuses (exit 3, nothing written) when the browser only offers a software renderer such as SwiftShader or llvmpipe, and writes `validation/results/gpu/<platform>-<renderer>.json`, which sharing includes. See [the hardware GPU guide](../../docs/HARDWARE-GPU.md).

## Stop, restart and resume

**Stop** terminates the job's complete process group, including its browser children. **Restart** begins the last job again from the start. **Resume checkpoint** is available only when a supported checkpoint exists.

| Job type | Resume boundary | Limits |
| --- | --- | --- |
| Registered verification runner | Completed registered tests | Source and recorded execution context must match. The interrupted test runs again. Missing evidence remains missing. |
| Two-polygon sweep | Each 10,000 samples and the completed sweep | Matching adapter/module/settings resume the seeded sweep. The plate and literature stages run again. |
| Native Metal wave | Periodic saved field state, about every 10 seconds, plus completion | Compatible grid, source signature and verified checkpoint data are required. Work since the last checkpoint may repeat. GPU verification runs before every workload. |
| Art: seed hunt and evolve | Each rendered candidate, with the thumbnails and prints it kept | The art scripts, `dist/studio.html`, the settings, the Chromium version and the renderer must match. A candidate whose kept image is missing or changed renders again, and so does one that failed or was cut short by Stop. |
| Art: deep render | Completion only | No mid-plate checkpoint, so a stopped or failed deep render offers no Resume: Restart renders it again from step 0. |
| Other experiment or development jobs | No general internal checkpoint | Use Restart. A nested registered runner can retain its own completed-test checkpoint. |

Checkpoints are local computational state, not independently certified evidence. Keep their accompanying source and reports. The app does not resume arbitrary browser plates or recover every instruction of an interrupted job. A machine sleep or crash can lose work since the last successful checkpoint.

## Logs and portable results

Each job has a private, Git-ignored directory under `apps/validate/.runs/`. The app keeps a bounded live-log view while saving the redacted log to disk. Completed jobs offer:

- **Paste packet:** command, commit, environment, exit code, observed file changes and the last 80 log lines.
- **Full log:** captured command output with runtime host identifiers and absolute paths redacted.
- **Miss report:** a failed or incomplete command records `miss.json`, also saved under `run/validator/misses/`. This records an execution failure or evidence gap; it is distinct from a failed scientific comparison.
- **Result bundle:** a `.tar.gz` archive containing job metadata, source snapshot, hashes, logs, available checkpoints and copied outputs.

The source snapshot preserves tracked and unignored files present at job start verbatim. It can include public author credits, license notices and user-authored content, so the bundle is not anonymous. Changed-file reporting records observed changes, including concurrent edits; it cannot attribute every edit to the job. Avoid changing the checkout during a research run if you need an unambiguous input snapshot.

A bundle is useful for review and reproduction, but it does not include installed browsers, Node, Swift, external libraries or the operating system. It is not a one-click import format or a guarantee of identical floating-point results on another machine. Inspect its included files before sharing. Sharing is off by default. Explicitly enabling automatic sharing sends each opted-in run after it finishes, including failed runs. Job directories are retained until you remove them, and long runs or repeated source bundles can use substantial disk space.

## Pseudonymous hardware evidence

Use a short **machine label**, such as the default `m1pro` or `lab-mac-2`, when comparing runs. Choose a label that does not identify you. Each job's `hardware.json` card records only its label, broad chip class, architecture, RAM bucket, OS major/minor version, Node version, any supplied measured browser versions or WebGL renderer, repository commit, command, exit code and elapsed time. Missing browser/renderer measurements remain unknown. A browser renderer string is not proof that a specific scientific kernel executed on that hardware.

The hardware card does not collect a username, home folder, hostname, serial number, MAC address, IP address, email or Git author identity. Runtime logs and packets redact host identifiers and replace repository paths with `~/GENChase/...`; paths outside the repository become placeholders. Redaction preserves numbers and types in structured scientific data. It can remove details needed to debug a path-specific issue, so reproduce that issue locally when necessary.

This boundary applies to recorded runtime metadata and text, not the verbatim repository source snapshot. Candidate and failure artifacts stay local until you deliberately share or commit them. A failed check is useful evidence and must retain its miss condition and failure result, not be silently dropped from a research account.

## Local access and development

The app binds only to `127.0.0.1`, checks the loopback host and origin, and requires a per-server token for job control and downloads. Commands come from an allowlist and do not use a shell. This is a local interface to trusted repository code running as your OS user, not a sandbox for untrusted code. Do not expose it through a public tunnel.

Run `npm run test:validator` for the app's regression suite, and `npm run test:art` to run the art jobs end to end on small grids (Playwright and Chromium required). Browser and native GPU evidence have separate scopes and prerequisites. The studio's scientific CI remains required. No model helper is installed or invoked; a model added in the future would be a helper, not an authority on scientific validity or originality.

## Share results directly

Install [GitHub CLI](https://cli.github.com/) once and run `gh auth login --hostname github.com`. Computation itself needs no account. The app uses that login without storing credentials in its UI or result files.

After a run, choose **Review files to share**, inspect the list and select a file to read its exact redacted contents, then **Upload and open review**. The app creates an evidence branch in your GENChase fork (creating the fork if necessary) and a public pull request to ChaseHendrick/GENChase. The repository owner uses a new evidence branch directly. No download/reupload step is needed. The branch starts from the upstream default branch and never overwrites an existing branch.

To submit unattended, check **Automatically share this run when it finishes** before starting. This choice belongs to that run and is retained by restart/resume. The server submits even if the browser closes. Upload progress and a submission link appear under **Share results**. A failed upload stays local and offers retry; interrupted or ambiguous submissions are looked up before opening another review. There is no background retry loop or automatic merge.

A checksum manifest accompanies every submission. Shared files include job metadata, source fingerprints (without source contents), the hardware card, measurements, numerical JSON outputs, redacted logs and all available misses for the run's source commit. An art run adds `art/share.json` (its recipes, step counts, proxy scores and repeat controls, at most 200 records) and at most 12 thumbnails of at most 320 px and 64 KB. Thumbnails are shared byte for byte through a Git blob and hashed on their raw bytes; a thumbnail with any segment that can carry text (EXIF, XMP, comments) is refused, and so is a submission whose recipe text redaction would change. Prints, the gallery page, the full candidate list and the checkpoint are never shared: each recipe reprints its plate. The volunteer-results workflow checks art submissions structurally but does not compare pixels. A failure or missing benchmark is not removed to make a submission look successful. Source snapshots, full bundles, arbitrary changed files and credentials are excluded. JSON numeric values retain their types and precision. The file list is checked again before a manual upload. A run is limited to 500 files, 8 MB per file and 20 MB total; larger runs retain the downloadable workflow.

Submissions are public and linked to your GitHub account. Redaction removes common local identifiers; it is not a guarantee that user-written report text contains no personal information. Review files before sharing sensitive work. Formula source contributions still use the documented contributor workflow. Evidence submissions do not change scientific labels.

The uploader uses the [GitHub tree API](https://docs.github.com/en/rest/git/trees) through [gh api](https://cli.github.com/manual/gh_api). New forks can take time to become available; retry after GitHub finishes preparing them. Tests simulate successful and failed API responses without publishing test data.

## UI regression checks

`npm run test:validator` checks job lifecycle, upload boundaries, dependency checks and recovery. For the isolated browser/accessibility review, install the optional test tools with `npm install --no-save --package-lock=false playwright@1.58.2 axe-core@4.10.3`, then run `npm run test:validator:ui`. The test checks navigation, evidence previews, distinct current/historical failure states, incomplete coverage, keyboard focus, horizontal overflow and automated WCAG A/AA rules at 1280, 768, 390 and 320 pixels. It starts its own temporary server and never starts or uploads a user run. Automated checks are not a complete accessibility certification.

The app now checks browser installation before starting workflows that require it. Inventory and fast development checks remain available without a browser. A completed run with missing evidence has an **incomplete coverage** state; it is distinct from a command crash and does not imply that all modules are validated.
