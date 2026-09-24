# Contribute computer time without the app window

You can run GENChase checks from a terminal, using your own computer and no AI tokens. No model or API service is called. **Headless means no app window; some checks still launch an automated browser in the background.**

A successful run is evidence for its recorded cases, not certification of every module or a claim of new mathematics. Failed comparisons are useful too. Keep their recipes and measured results.

## 1. Open your checkout

Open a terminal in your GENChase folder. You need Git and Node.js. For browser-based checks, install the development browser tools once if they are not already available:

```sh
npm install --no-save --package-lock=false playwright@1.49.1
npx playwright install chromium
```

This installation downloads tools and uses the internet. After setup, the local jobs run without model services or tokens. Native Metal jobs additionally require Apple Silicon macOS and Apple's command-line developer tools; install those once with `xcode-select --install` if needed.

## 2. Try one short job

```sh
npm run validator:headless -- --mode inventory --machine m1pro
```

This checks the science records. It does not run every numerical benchmark. `m1pro` is your pseudonymous machine label; you can use another short lowercase label such as `lab-mac-2`. Avoid your name or email.

Then choose work to contribute:

| Work | Command |
| --- | --- |
| Collect the available structured witnesses | `npm run validator:headless -- --mode witnesses --machine m1pro` |
| Run registered numerical and print checks | `npm run validator:headless -- --mode all --machine m1pro` |
| Verify and run a small Apple GPU wave workload | `npm run validator:headless -- --mode metal --grid 32 --steps 1000 --machine m1pro` |
| Explore the existing polygon candidate adapter | `npm run validator:headless -- --mode derive --machine m1pro` |
| Search an open problem: least-winding vortex collapse ([protocol](../../experiments/VORTEX-COLLAPSE.md)) | `npm run validator:headless -- --mode vortex-collapse --alpha 0 --n 7 --samples 200 --machine m1pro` |
| Grow the deepest vortex family toward many vortices | `npm run validator:headless -- --mode vortex-grow --alpha 0 --n 30 --samples 10 --machine m1pro` |
| Hunt a block of seeds for print-sharp plates | `npm run validator:headless -- --mode art-hunt --id turing --samples 24 --keep 6 --machine m1pro` |
| Render one recipe deeply at print size | `npm run validator:headless -- --mode art-deep --recipe '#cahn/cahn-1958' --steps 2000 --inches 20 --budget 60 --machine m1pro` |
| Evolve children from recipes you like | `npm run validator:headless -- --mode art-evolve --parent '#turing/h-1a/…' --parent '#turing/h-2b/…' --samples 12 --machine m1pro` |

Art jobs take recipe hashes as the studio copies them (from `#` onward, in single quotes), render the `cahn` and `turing` tabs, and write `art/gallery.html` in the job folder. Their scores are print-sharpness proxies, not a measure of beauty and not scientific evidence. Add `--budget` for a limit in active minutes, `--recipe` to hunt around a base recipe, `--start` to choose the seed block, and `--inches`/`--ppi` for the print size. [Art modes](README.md#art-modes) explains the step count, refusals and what is shared.

Witness collection records what the module actually exposes. A missing witness is missing evidence, not a passing result. An observed witness pass still needs its scientific assumptions, independence and convergence reviewed. The polygon adapter can recover a known formula and never establishes originality by itself.

Measurement collection probes WebGL2 and float32 color buffers before opening the modules.
On macOS it requests the Metal renderer. If native headless graphics are unavailable,
it retries with the software renderer and reports that fallback explicitly. The corpus
records the actual renderer and browser launch flags. Software rendering uses CPU time;
it is not evidence of Apple GPU execution. These observations still do not establish
scientific accuracy.

## 3. Choose how much power to use

The default is Balanced, with roughly half of scheduled running time reserved for work. Add `--power light` for roughly a quarter, or `--power maximum` for continuous work:

```sh
npm run validator:headless -- --mode witnesses --machine m1pro --power light
```

These are duty-cycle preferences, not exact CPU/GPU percentages or watt limits. Serious or critical macOS thermal state pauses the job. Battery use is paused by default; add `--allow-battery` only when you want the job to continue unplugged.

If thermal readings are unavailable, the job pauses and says so. Install the required Apple developer tools, or explicitly choose `--no-thermal-pause` to run without that pause control. This can be needed for CPU-only work on an Intel Mac.

Keep the terminal open and the machine awake. On macOS, you can prevent idle sleep for the duration of the command:

```sh
caffeinate -i npm run validator:headless -- --mode witnesses --machine m1pro
```

Press **Ctrl+C** to stop the complete job process group. Only one local job can own the checkout's validator job folder at a time. Do not start a second headless job while the local app is running a job.

To request the latest supported checkpoint:

```sh
npm run validator:headless -- --resume
```

Resume is available for completed registered-test boundaries, polygon sweep chunks, vortex-collapse seeds, art hunt and evolve candidates, and compatible native Metal field checkpoints. A deep render has no mid-plate checkpoint. It does not resume every kind of job. A changed source/context can require rerunning work, and an interrupted test runs again. [The local app guide](README.md#stop-restart-and-resume) explains the boundaries.

## 4. Inspect the results

The terminal reports the job result, its files and the computer time it used. Each job records its CPU time, including every process it started and waited for, and an energy figure: measured where Linux exposes a RAPL counter, otherwise an estimate of 1 to 20 W per busy core that the record labels as such. Shared records are totalled in [COMPUTE.md](../../COMPUTE.md). The job folder under `apps/validate/.runs/` holds a paste packet, pseudonymous `hardware.json`, redacted log and available reports/checkpoints. A result bundle keeps the source snapshot and artifacts together for local review. Job status preserves an incomplete-evidence exit even when registered checks passed.

Witness collection writes `validation/results/witnesses-<commit>-<machine-slug>.json`. Scientific misses write `run/validator/misses/<commit>-<id>.json`; execution failures use a separate job suffix. These paths are Git-ignored until you deliberately stage selected files. Repeating a corpus for the same commit and machine replaces that corpus file, while each job keeps its own copy and previous miss packets remain visible.

Inspect the packet, hardware card and the particular witness or miss JSON before sharing them. Check that the commit, module, recipe, measured and expected values, tolerance and failure reason describe the run you intended. A command failure and a scientific miss are different results. A missing measurement must not be rewritten as success.

The card and runtime text exclude host identifiers and redact absolute paths. The source bundle preserves repository content verbatim, including credits and user-written text. **The bundle is not anonymous.** You usually only need the specific evidence JSON and hardware card for a contribution, not the entire source archive.

## 5. Share through a reviewed GitHub pull request

Sharing is off by default. For direct upload, install GitHub CLI, run `gh auth login --hostname github.com`, then add `--share` to the job command. This publicly submits reports, data and failures as an evidence pull request when the run ends, even if scientific checks fail. Upload errors preserve the local evidence and produce a nonzero exit. Open the local app to review files and retry. See [Share results](README.md#share-results-directly) for included files, limits and privacy details.

For the manual download/upload alternative:

1. Fork GENChase on GitHub and create a branch for the result.
2. In your fork, use **Add file → Upload files** to upload the reviewed evidence JSON and hardware card into a clearly named results folder. Include failure or missing-evidence reports alongside passes.
3. Open a pull request against `SharpMeow/GENChase`. State the source commit, command, machine label, result, known limits and whether the checkout changed during the run.

If you already use Git locally, generated result directories are intentionally ignored. Stage only the specific reviewed files you want to publish, for example:

```sh
git add -f path/to/reviewed-result.json path/to/reviewed-hardware.json
```

Replace those example paths with your selected files. Do not force-add the entire `.runs` directory. Do not automatically commit a whole corpus or omit misses to make a result look stronger. A maintainer can review the evidence without promoting a technique's scientific status or asserting novelty.
