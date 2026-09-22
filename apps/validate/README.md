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

## Validate

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

Choose `ID` from the catalog. There is no freeform command box. The [runner guide](../../tools/VERIFY.md) explains evidence gaps and exit codes. In particular, exit **2** means requested evidence is incomplete, even when all registered tests passed. The app retains that result instead of turning it green.

Progress counts completed registered checks or native simulation steps when those counts are available. It is not an estimate of time remaining or a percentage of scientific validation. Otherwise the app shows the active stage and elapsed time without inventing a percentage.

## Contribute

**Contribute Mode** offers these bounded jobs:

| Job | What it produces |
| --- | --- |
| Two-polygon candidate | A numerical coefficient fit, seeded hold-out sweep, deliberately wrong controls, a real plate check and local literature comparison |
| Maxwell design search / robustness | Logs from the existing electromagnetic experiments |
| Molecular preparation / Cahn coarsening | Logs from the existing experiment runners |
| Apple GPU periodic wave | A native Metal verification report and a configurable three-dimensional workload with checkpoints |

The first candidate adapter uses the already documented two-polygon vortex family, with 2 to 5 vertices per polygon. It can recover a known result. It is not a general symbolic theorem prover or an automatic discovery engine. The coefficient fit is numerical, with a stated sample domain and tolerance. The plate check must accept the expected case and reject the deliberately broken case.

The adapter reads `RESEARCH.md` before doing the derivation, then scans available repository text and saves new `.json`, `.md` and `-research-draft.md` files under `identities/candidates/`. It never overwrites an existing candidate, edits `RESEARCH.md`, or promotes a statement into `IDENTITIES.md`. The report retains failures, its reproduction command, source hashes, sampled domain and miss conditions.

The offline comparison uses text matching and the existing polygon-family derivation. It does not follow external citations, extract binary PDFs or establish mathematical equivalence through a proof. Its classifications are only **matches known source**, **not found in sources checked**, or **search incomplete**. Priority remains **unconfirmed** in every case.

**Online prior-art** is optional. Opening the panel only shows suggested queries; following a query link opens an external search page and uses the network. No automatic online search or model call occurs. A human must inspect sources and record what was actually checked before making any originality claim.

## Measurement corpus and misses

Validate offers **Harvest all module measurements** and **Harvest one module measurement**. These record default recipes after a bounded three-second observation interval. They retain structured witnesses and literal numbers from status text, with offsets into that text. Prose numbers have no inferred units or acceptance rules. Missing structured witnesses stay unassessed. A witnessed disagreement or runtime failure produces a visible miss and a nonzero job exit.

Use **Download measurements** for the corpus. The same file is saved under `validation/results/witnesses-<commit>-<machine-slug>.json`. Miss packets are saved under `run/validator/misses/` and remain listed until you review them. A successful later job does not silently remove them. Both result locations are ignored by Git by default; choose which reviewed files to publish. No result stamps a technique validated or a formula novel.

## Heat and power

Choose **Light**, **Balanced** or **Continuous compute**. Light and Balanced schedule roughly 25% and 50% running time in a repeating four-second duty cycle; Continuous requests uninterrupted work. These settings pause and resume the complete job process group. They are not exact CPU/GPU utilization percentages, watt limits, temperature limits or guaranteed cooling rates. Work already submitted to a GPU can finish while the submitting process is paused.

On Apple Silicon macOS, **Pause on battery** and **Pause at serious or critical thermal state** use Apple's system readings. With thermal protection enabled, an unavailable thermal reading also pauses work and is reported. These controls supplement the operating system's own thermal management. They do not report a temperature in degrees. Changing a duty preference does not change the solver's numerical timestep.

The native Metal job first verifies the actual Apple GPU against a CPU reference and failure controls. If that verification fails, the workload does not start. Other browser checks may deliberately use Chromium's software renderer, so a GPU-themed studio module does not imply that its validation job uses the physical GPU. See [the Apple GPU evidence and limits](APPLE-GPU.md).

## Stop, restart and resume

**Stop** terminates the job's complete process group, including its browser children. **Restart** begins the last job again from the start. **Resume checkpoint** is available only when a supported checkpoint exists.

| Job type | Resume boundary | Limits |
| --- | --- | --- |
| Registered verification runner | Completed registered tests | Source and recorded execution context must match. The interrupted test runs again. Missing evidence remains missing. |
| Two-polygon sweep | Each 10,000 samples and the completed sweep | Matching adapter/module/settings resume the seeded sweep. The plate and literature stages run again. |
| Native Metal wave | Periodic saved field state, about every 10 seconds, plus completion | Compatible grid, source signature and verified checkpoint data are required. Work since the last checkpoint may repeat. GPU verification runs before every workload. |
| Other experiment or development jobs | No general internal checkpoint | Use Restart. A nested registered runner can retain its own completed-test checkpoint. |

Checkpoints are local computational state, not independently certified evidence. Keep their accompanying source and reports. The app does not resume arbitrary browser plates or recover every instruction of an interrupted job. A machine sleep or crash can lose work since the last successful checkpoint.

## Logs and portable results

Each job has a private, Git-ignored directory under `apps/validate/.runs/`. The app keeps a bounded live-log view while saving the redacted log to disk. Completed jobs offer:

- **Paste packet:** command, commit, environment, exit code, observed file changes and the last 80 log lines.
- **Full log:** captured command output with runtime host identifiers and absolute paths redacted.
- **Miss report:** a failed or incomplete command records `miss.json`, also saved under `run/validator/misses/`. This records an execution failure or evidence gap; it is distinct from a failed scientific comparison.
- **Result bundle:** a `.tar.gz` archive containing job metadata, source snapshot, hashes, logs, available checkpoints and copied outputs.

The source snapshot preserves tracked and unignored files present at job start verbatim. It can include public author credits, license notices and user-authored content, so the bundle is not anonymous. Changed-file reporting records observed changes, including concurrent edits; it cannot attribute every edit to the job. Avoid changing the checkout during a research run if you need an unambiguous input snapshot.

A bundle is useful for review and reproduction, but it does not include installed browsers, Node, Swift, external libraries or the operating system. It is not a one-click import format or a guarantee of identical floating-point results on another machine. Inspect its included files before sharing. Nothing is uploaded automatically. Job directories are retained until you remove them, and long runs or repeated source bundles can use substantial disk space.

## Pseudonymous hardware evidence

Use a short **machine label**, such as the default `m1pro` or `lab-mac-2`, when comparing runs. Choose a label that does not identify you. Each job's `hardware.json` card records only its label, broad chip class, architecture, RAM bucket, OS major/minor version, Node version, any supplied measured browser versions or WebGL renderer, repository commit, command, exit code and elapsed time. Missing browser/renderer measurements remain unknown. A browser renderer string is not proof that a specific scientific kernel executed on that hardware.

The hardware card does not collect a username, home folder, hostname, serial number, MAC address, IP address, email or Git author identity. Runtime logs and packets redact host identifiers and replace repository paths with `~/GENChase/...`; paths outside the repository become placeholders. Redaction preserves numbers and types in structured scientific data. It can remove details needed to debug a path-specific issue, so reproduce that issue locally when necessary.

This boundary applies to recorded runtime metadata and text, not the verbatim repository source snapshot. Candidate and failure artifacts stay local until you deliberately share or commit them. A failed check is useful evidence and must retain its miss condition and failure result, not be silently dropped from a research account.

## Local access and development

The app binds only to `127.0.0.1`, checks the loopback host and origin, and requires a per-server token for job control and downloads. Commands come from an allowlist and do not use a shell. This is a local interface to trusted repository code running as your OS user, not a sandbox for untrusted code. Do not expose it through a public tunnel.

Run `npm run test:validator` for the app's regression suite. Browser and native GPU evidence have separate scopes and prerequisites. The studio's scientific CI remains required. No model helper is installed or invoked; a model added in the future would be a helper, not an authority on scientific validity or originality.
