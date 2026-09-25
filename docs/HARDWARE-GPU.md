# Hardware GPU runs

Every recorded browser benchmark in `validation/techniques.json` runs on SwiftShader, Chromium's CPU
implementation of Vulkan under ANGLE. That is deliberate: it is the same renderer on every machine, so a
result reproduces. It also means no recorded test has exercised a real GPU driver, and the studio's GPU tabs
are used on real GPUs. `tools/gpu-science.js` runs the recorded GPU science and print-state tools on the
machine's own GPU and writes one file that says what ran, where, and what happened.

## The owner's command

From a checkout with Node.js, once per machine:

```
npm install --no-save --package-lock=false playwright@1.56.1 && npx playwright install chromium
```

Then, every time:

```
npm run gpu:science
```

That builds `dist/studio.html`, probes the WebGL renderer, runs every tool in the plan below with
`GENCHASE_GL=hardware`, and writes `validation/results/gpu/<platform>-<renderer>.json`, for example
`validation/results/gpu/darwin-apple-m1-pro.json`. It prints each tool's output as it goes and a summary
at the end. Exit code 0 means every tool passed, 1 that at least one failed (the file is still written,
because a failure on real hardware is a finding), and 3 that it refused.

`node tools/gpu-science.js --list` prints the plan without running anything. `--only pde-science,turing`
runs a subset by tool name or tab id; a subset run says so in its `coverage.subset` field. `--label lab-2`
appends a pseudonymous label to the file name when two machines share a GPU model. `--timeout 120` changes
the per-tool limit from 90 minutes.

## What it refuses

It will not write a result labeled hardware when the renderer is software. The check happens twice.

1. Before anything runs, it launches the browser exactly as the tools will and reads
   `UNMASKED_RENDERER_WEBGL` through `WEBGL_debug_renderer_info`. A renderer naming SwiftShader, llvmpipe,
   lavapipe, softpipe, a software rasterizer, the Microsoft Basic Render Driver or WARP, or no WebGL2 at
   all, stops the run with exit 3 and writes nothing.
2. In hardware mode, `tools/lib/gl-args.js` wraps Playwright's `chromium.launch` for every launch that
   uses the renderer switch. Each browser a tool starts is probed the same way and refused at once if it
   is software, so a tool cannot quietly fall back to SwiftShader partway through a run. Each probe is
   logged, and the output file lists the renderer every tool's browsers reported. If any of them was
   software, the file is not written.

This was verified in a container without a GPU, where every configuration falls back to SwiftShader:
`node tools/gpu-science.js` printed the SwiftShader renderer, refused with exit 3 and created nothing, and
`GENCHASE_GL=hardware node tools/pde-print-state.js` failed at its first launch with the refusal message.
`node tools/gpu-science.js --self-test` (part of `npm test`) checks the refusal against the SwiftShader,
llvmpipe, lavapipe and Basic Render Driver strings and accepts Apple, NVIDIA, AMD and Intel ones.

`--software-control --out <file>` runs the same pipeline on SwiftShader so the machinery can be tested
without a GPU. It is labeled `software-control` and refuses to write under `validation/results/gpu/`.
On 2026-09-24 it ran `rdx-print-state` and `pde-print-state` here: both passed, in 76 s and 26 s.

## The renderer switch

Every browser tool now asks `tools/lib/gl-args.js` for its Chromium arguments instead of spelling out the
SwiftShader list. With `GENCHASE_GL` unset the list is exactly the old one, so nothing changes by default.
With `GENCHASE_GL=hardware`:

| Platform | ANGLE backend | Arguments |
| --- | --- | --- |
| macOS | Metal | `--ignore-gpu-blocklist --enable-gpu --use-gl=angle --use-angle=metal` |
| Windows | Direct3D 11 | `--ignore-gpu-blocklist --enable-gpu --use-gl=angle --use-angle=d3d11` |
| Linux | Vulkan | `--ignore-gpu-blocklist --enable-gpu --use-gl=angle --use-angle=vulkan --enable-features=Vulkan,CDPScreenshotNewSurface --disable-vulkan-surface` |

and the launch uses Playwright's `chromium` channel, the full Chromium build in new headless mode, rather
than the default headless shell, which is Chromium's old headless implementation. New headless is the
real browser with its GPU process. Two variables override the defaults:

- `GENCHASE_ANGLE` picks another ANGLE backend: `gl` or `gl-egl` (desktop OpenGL), `vulkan`, `metal`,
  `d3d11`, `d3d9`. `swiftshader` is refused; unset `GENCHASE_GL` instead.
- `GENCHASE_GL_CHANNEL` picks the browser: `chrome` or `msedge` for an installed Google Chrome or Edge,
  which on a desktop machine is the most likely to reach the GPU, or `shell` for the headless shell.

Scripts that launch Chromium with no arguments keep their behavior. `tools/phyllotaxis-review.js`, the
one recorded GPU-tab tool of that kind, is therefore listed as excluded rather than run.

### What was and was not verified

Nothing here has run on a real GPU; the container that wrote this has none. What is known:

- The flags above are the ones Chromium documents for its ANGLE backends. Metal is Chrome's default
  ANGLE backend on macOS and Direct3D 11 on Windows, so on those platforms the flags mostly confirm the
  default. The Linux set follows "Supercharge Web AI model testing: WebGPU, WebGL, and Headless Chrome"
  (Chrome for Developers blog, https://developer.chrome.com/blog/supercharge-web-ai-testing), which says
  headless Chrome disables the GPU by default and enables it on Linux in new headless mode with
  `--use-angle=vulkan --enable-features=Vulkan --disable-vulkan-surface` (plus `--no-sandbox`, which
  Playwright already passes). Checked through a search summary of the article on 2026-09-24; the page
  itself was not reachable from this container.
- Chromium's last `--enable-features` wins, so the Linux list repeats Playwright's own
  `CDPScreenshotNewSurface` feature rather than dropping it.
- Not verified: whether new headless reaches the GPU on every macOS version (Apple Silicon and Intel
  Macs differ), whether Linux needs `gl-egl` instead of Vulkan with Mesa drivers (RADV, ANV, radeonsi,
  iris), whether a Linux session without a display or the user's membership of the `video` and `render`
  groups matters, and whether Windows laptops with two GPUs pick the discrete one. If a run is refused on
  a machine that has a GPU, try in this order: `GENCHASE_GL_CHANNEL=chrome`, then `GENCHASE_ANGLE=gl-egl`
  (Linux) or `GENCHASE_ANGLE=gl` (macOS, Windows), and record what worked in the pull request.

## What it runs

The plan is derived, not listed: the GPU tabs are the records in `validation/techniques.json` whose module
source calls `createGL()`, and the tools are those records' `numerical` and `print` commands whose script
launches Chromium through `glArgs()`. At commit time that is 26 tools covering 21 tabs:

- pde family (`amb`, `cahn`, `ohta`, `swift`, `pfc`, `ks`): `pde-science`, `pde-convergence`,
  `pde-stability`, `pde-family-science`, `pde-field-review`, `pde-spatial-review`, `pde-print-state`
- rdx family (`excitable`, `turing`, `cyclic`, `chemotaxis`, `vegetation`): `rdx-science`, `rdx-print-state`
- `bec-print-state`, `cgl-field-review`, the three `schrodinger` tools, `wave-print-state`, the two
  `convection` tools, the three `maxwell` tools, `plasma-print`, `shallow-print`, the two `nonreciprocal`
  browser tools, `hodgkin-huxley-print`, `volume-wave-science`

Ten recorded commands for GPU tabs are excluded because they run without a browser (CPU references such as
`bec-science`, `plasma-science`, `shallow-science`) or launch Chromium without the switch
(`phyllotaxis-review`). Thirty tabs whose module source calls `createGL()` have no recorded browser tool
at all; some of them share a module file with a GPU tab and may not use the GPU themselves. Both lists are
in every output file under `coverage`, and `--list` prints them.

Tools run with the arguments their records give, including `--write`. Whatever a tool writes under
`validation/results/` is copied into the output file (parsed, up to 256 KB per file) and the repository's
own file is put back, so a hardware run never replaces the SwiftShader evidence. A tool that prints its
result as JSON instead has it kept under `stdoutJson`.

## The output file

`validation/results/gpu/<platform>-<renderer>.json` holds:

- `label`: `hardware`, and `note` saying this is additional platform evidence, not a replacement
- `commit` and `dirtyTrackedFiles` (tracked files that differed from the commit when it started)
- `platform`: OS, release, architecture, CPU model, cores, memory, Node version
- `browser`: channel, Chromium version, Playwright version, the exact arguments, any overrides
- `renderer`: the WebGL renderer, vendor, version, float32 color buffer support, and every renderer the
  tools' browsers reported
- `summary`: counts of pass, fail, timeout and tools that launched no browser, and the total time
- `coverage`: GPU tabs, excluded commands with reasons, uncovered tabs, and the subset if one was chosen
- `tools`: per tool, the command, tabs, outcome, exit code, seconds, number of browser launches, their
  renderers, the last 30 lines of output, and the results it produced

Host names, user names and absolute paths are redacted with the volunteer runner's own `redact`.

## How results come back

As a pull request that adds the one JSON file:

```
git checkout -b gpu-results-<platform>-<renderer>
git add validation/results/gpu/
git commit -m "Hardware GPU run: <renderer>"
git push -u origin HEAD
```

and open the pull request against `ChaseHendrick/GENChase`. Say in the description what, if anything, had to
be overridden. Volunteers can instead use the local runner: **Check simulations**, job **Hardware GPU:
registered GPU science and print checks** (`npm run validator:headless -- --mode gpu-science --machine
<label>`). It runs the same command, records the renderer on the job's hardware card, and **Review files to
share** includes the output file in the evidence pull request.

The machines worth one run each: an Apple Silicon Mac (Metal), a Windows or Linux machine with an NVIDIA
card, and one with AMD or Intel graphics.

## Reading a result

A pass says the recorded criteria hold on that driver. The criteria were set against SwiftShader, which
implements IEEE float32 carefully; GPU drivers may flush denormals, fuse multiply-adds or use faster
transcendental functions, so a tool can fail on hardware for a reason that says more about the tolerance
than about the physics. A failure is recorded as a failure and is worth reading, not rerunning until it
passes. Identical pixels across GPUs are not claimed anywhere in this project, and a hardware run does not
change a technique's validation status by itself.

A device without float32 color buffers runs the pde and rdx tabs on float16 state instead (chemotaxis and amb
store it as the deviation from their uniform state, and pfc refuses to run on it); see
`validation/HALF-FLOAT.md` for what that does to the plates and the status line.
