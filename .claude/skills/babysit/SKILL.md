---
name: babysit
description: Drive a GENChase pull request to green and keep it there. Use when asked to babysit, watch, monitor, shepherd, drive to green, fix CI on, resolve conflicts or review threads on, or merge a GENChase (ChaseHendrick/GENChase) pull request, and on every check-in or PR event for one.
---

# Babysit a GENChase pull request

## 1. When this applies

Any open PR against `main` in this repository that you have been asked to watch. You own that PR until it is green, conflict-free and every review thread is resolved, or until the owner says stop. Every wake, check three things on the current head SHA: merge state, CI, review threads.

Hard rules, on top of the general babysitting rules:
- Never skip, disable or quarantine a test. Never relax a scientific tolerance or hide a warning to get green CI (TESTING.md:52).
- Never approve a pull request: no APPROVE review, whoever asks for it. Never merge unless the owner says so in this session (section 8).
- Never force-push `main` or another author's branch (docs/RELEASING.md:18, "Do not force-push published history"). Never push an empty commit or close and reopen a PR to restart CI.
- Re-run a failed job at most once, and only with the evidence in section 4. "Flake" is never a root cause.

GitHub tools use owner `sharpmeow`, repo `genchase`; both resolve to ChaseHendrick/GENChase. The container has no `gh`, so all GitHub work goes through the `mcp__github__*` tools.

`$SCRATCH` stands for this session's scratchpad directory plus `/babysit`. Shell variables do not persist between Bash calls, so begin every command that uses it with `SCRATCH=<scratchpad>/babysit; mkdir -p "$SCRATCH";`.

## 2. The loop, on every wake or check-in

1. **Merge state.** `mcp__github__pull_request_read` with `method: get`: read `head.sha`, `base.sha`, `mergeable`, `mergeable_state`, `draft` and `merged_at`. `list_pull_requests` reports `merged: false` for merged PRs, so trust `merged_at`. If it is set, go to section 8.
2. **CI on that head.** `method: get_check_runs` with `perPage: 50`; read pages until one comes back short. Expect 39 runs: 32 from check.yml, 2 from Pages (`deploy Pages` always skipped) and 5 from CodeQL. Add 2 `draft PDF` when `paper/**` changed (one push run, one PR run; 41 on PR #178), and `verify` plus a skipped `refresh` when `validation/submissions/**` or `experiments/results/vortex-collapse/**` changed. An oversized result is saved to a file; parse it with `python3`. Only the newest run of each workflow for the head counts.
3. **Logs of red jobs.** A check run's id is its Actions job id when its URL contains `/job/`: call `mcp__github__get_job_logs` with `job_id`, `return_content: true` and `tail_lines: 300`, or with `run_id` and `failed_only: true`. The `CodeQL` gate is not an Actions job (`/runs/<id>`); read it with `mcp__github__get_check_run`. `structure` runs `maintenance-check.js` first, so an `ERR_ASSERTION` at `maintenance-check.js:51` usually means `node tools/science.js` fails; run science.js to see why.
4. **Review threads.** `method: get_review_comments` (paginate with `after`), plus `get_reviews` and `get_comments`. CodeQL alerts arrive as threads from `github-advanced-security` and on the `CodeQL` check run. There is no local CodeQL.
5. **Act.** Use sections 3 to 6, push, and leave a one-line status.
6. **Schedule the next wake.** Call `mcp__Claude_Code_Remote__subscribe_pr_activity` once, but do not rely on it: events are not guaranteed to reach this session, and a PR Steward already watching the PR takes them instead (the tool result says so). Always schedule the next check-in with `mcp__Claude_Code_Remote__send_later` (`delay_minutes` 40 to 60; a full run takes about 13 to 20 minutes), and keep the returned `trigger_id`.

**A PR with no check runs.** A PR from `automation/timestamps` or `automation/refresh-volunteer-ledger` was opened with the workflow token and starts no workflows by itself (timestamps.yml:7). timestamps.yml dispatches check on its branch itself (line 84), so look for that run first; volunteer-results.yml dispatches nothing. If `get_check_runs` is empty, call `mcp__github__actions_run_trigger` with `method: run_workflow`, `workflow_id: check.yml`, `ref: <head branch>`, and `pages.yml` the same way. Those runs have event `workflow_dispatch`; CodeQL does not start for them.

Classify a failure before you touch it:

| Signature | Verdict |
|---|---|
| `cancelled` on an older SHA, or with a newer run for the same ref and event | Superseded (check.yml's concurrency group is per workflow, event and ref, with `cancel-in-progress`). Read the newest run. |
| `cancelled` on the newest run for the head | Read the log. A job that hit `timeout-minutes` ("exceeded the maximum execution time"; 30 for plates and prints, 40 for complete PDE, 12 for volunteer-ui) is a hang: diagnose it like any timeout (section 4). A manual cancel gets one re-run. |
| Every root job fails in about 3 s and its logs return 404 | No free runner or a GitHub outage (check.yml header comment). Re-run once when it clears. |
| `TimeoutError` or `waitForFunction ... exceeded` in a browser job, with no numeric mismatch | Cause unknown until shown. Most past timeouts here had real causes (a hash race, a focus race, a layout overlap, a fixed sleep). Follow the timeout procedure in section 4. |
| An assertion with numbers, `FAIL <id>: ...`, a `nyq` value, `... is stale`, or a lint `FAIL` list | Real. Reproduce and fix. |
| `::warning::COMPUTE.md is behind the recorded jobs` | Non-fatal by design; volunteer-results refreshes COMPUTE.md after merge. Do not chase it in the PR. |

To re-run, call `mcp__github__actions_run_trigger` with `method: rerun_failed_jobs` and the `run_id`, only after the evidence in section 4. A cancelled or failed `Analyze (...)` job is re-run through its own Actions run: take the run id from the check run's `details_url`, then `rerun_failed_jobs` or `rerun_workflow_run`. Never push a retrigger commit.

## 3. CI job to local reproduction

Run from the repository root. After any change under `src/` or to a build input (section 4), run `node tools/build.js` first. The browser tools load the committed `dist/studio.html` (`STUDIO=path` overrides it), so without a rebuild they test the old build.

| Check run (exact name) | Local command | CI time (here) |
|---|---|---|
| `structure` | Quick: `node tools/build.js --check && node tools/science.js && node tools/lint.js && npm test`. Exact: the first block below. | 40 s (here: quick 25 s, exact 70 s) |
| `build static Pages site` | The second block below. The `awk` must print nothing (no symlinks or submodules). | 15 s (here 3 s) |
| `offline distribution` | `python3 tools/release-assets.py --check`. In full: `python3 tools/package-release.py --version 0.0.0 --output $SCRATCH/rel && NODE_PATH=$SCRATCH/npm/node_modules node tools/distribution-check.js $SCRATCH/rel/GENChase-studio.zip` | 40 s (here 1 s / 1 min) |
| `complete PDE fields and prints` | `node tools/verify.js --print cahn ohta amb swift ks pfc` | 12 to 18 min |
| `shell chrome` | `node tools/<x>.js` for pde-science, pde-convergence, pde-stability, rdx-science, reuleaux-science, pde-print-state, ui, formula-chooser-check, folder-browser, engine-api-check, colophon-check, reports-check, art-only-check, direct-gravity-browser, bec-preview-check, provenance-check. Run only the one that failed. | 5 to 7 min |
| `volunteer and navigation (chromium)` | `BROWSER=chromium` with studio-navigation-check, print-smoothing-browser, validator-ui-check, then `NODE_PATH=$SCRATCH/npm/node_modules node tools/validator-ux-check.js`, harvest-browser-check, validator-process-check | 2 to 3 min |
| `volunteer and navigation (webkit)` | Cannot run locally (missing host libraries). As a proxy, run its first three tools with `BROWSER=chromium`, and read the CI log. | 2.5 min |
| `art modes (hunt, deep render, evolve)` | `node tools/art-check.js` | 2 to 3.5 min |
| `completed numerical and print reviews` | `node tools/verify.js --print <the ids in check.yml job complete-reviews>` | 4 to 5 min |
| `wave science` | `node tools/verify.js --print schrodinger convection` | 3 min |
| `particle and field science` | `node tools/verify.js --print maxwell molecular`, `node tools/volume-wave-science.js`, `node tools/cgl-kernel-check.js` | 2 to 2.5 min |
| `recipe compatibility` | `node tools/recipe.js` (`[extraSettleMs] [workers 1..4]`; `node tools/recipe.js 0 1` runs sequentially) | 2.5 to 3 min |
| `plates (<id>)` | `node tools/check.js <id> 25000`. The last line is `PASS <id>` or `FAIL <id>: ...` | 1 to 4.5 min, turing and life slowest (here: ising 1 min) |
| `print export (<id>)` | `node tools/export.js <id> 8 300 8000 240000` | 1.5 to 3.5 min (here: tilings 3.2 min) |
| `native CPU science` | `python3 tools/heavy-runner-check.py` | 10 s (here 2 s) |
| `print production` | `node tools/print-formats-check.js $SCRATCH/print && PYTHONPATH=$SCRATCH/py python3 tools/print-formats-check.py $SCRATCH/print /usr/share/color/icc/ghostscript/default_cmyk.icc` | 30 s (here 2 s) |
| `draft PDF` | No local equivalent (it needs Docker). Runs on `paper/**` changes, on PR and on push. | 1 min |
| `verify` (volunteer results) | The third block below, as one Bash call. It uses the base branch's verifier, as CI does. | seconds |
| `Analyze (...)`, `CodeQL` | None locally. Read the alert thread. | 1 to 2 min |

Local browser runs on this shared 4-CPU container can take up to about twice the CI time.

```
# structure, exactly as CI runs it
sed -n '/^  lint:/,/^  chrome:/p' .github/workflows/check.yml | sed -nE 's/^ +(run: )?((node|python3|npm) .*)$/\2/p' > $SCRATCH/structure.sh && bash -e $SCRATCH/structure.sh
# build static Pages site
node tools/build.js --check && node tools/science.js && node tools/lint.js && git ls-files -s | awk '$1==120000||$1==160000' && git ls-files --error-unmatch index.html start.html src/module-manifest.json gallery/tilings.jpg gallery/snowflake.jpg gallery/hyperbolic.jpg >/dev/null
# verify (volunteer results); BASE is base.sha from pull_request_read get. On this shallow clone, deepen the
# fetch if git finds no merge base for $BASE...HEAD.
BASE=<base.sha>; git fetch origin $BASE && git worktree add --detach $SCRATCH/base $BASE
files=$(git diff --name-only --diff-filter=AM $BASE...HEAD -- validation/submissions experiments/results/vortex-collapse | grep -E '/vortex-(collapse|grow|threshold)-[^/]*\.json$')
[ -z "$files" ] || node $SCRATCH/base/tools/vortex-collapse-search.js --verify $files --strict
node $SCRATCH/base/tools/art-submission-check.js --base $BASE; git worktree remove $SCRATCH/base
```

Local setup. `node_modules` has Playwright 1.56.1, which matches `/opt/pw-browsers`. CI pins 1.49.1 or 1.58.2. Do not `npm install` a Playwright into the checkout. Install extras outside it:

- axe-core: `npm install --no-save --package-lock=false --prefix $SCRATCH/npm axe-core@4.10.3`
- pypdf: `pip install --target $SCRATCH/py 'pypdf>=6,<7'`

WebGL runs on SwiftShader (`tools/lib/gl-args.js`). No job needs a real GPU.

## 4. Playbooks for the failures this repository has

**`structure` / `node tools/lint.js`.** Lint prints `N problems:`, one indented line per problem, then `FAIL` (exit 1); a clean run ends with `PASS`. Fix the cause, never the check.
- **Counts.** A prose count in README, CITATION.cff, RESEARCH.md, DESIGN-PLAN.md, AGENTS.md, CONTRIBUTING.md, .zenodo.json, paper/paper.md or src/studio.html is wrong, or is spelled in words. Run the regeneration in section 6. Never hand-edit a count.
- **`.github/description.txt`.** index.js rewrites it. Changing the GitHub About (`gh repo edit -d "$(cat .github/description.txt)"`, CONTRIBUTING.md:45) is an owner-only repository setting, so write in the PR body that it is still pending.
- **`og.jpg JPEG comment is "..." but the file registers N techniques`.** Redraw the digits in the caption strip at the bottom (for example "134 TECHNIQUES"), keeping the original glyphs. Then write the COM comment with Pillow: `im.save('og.jpg', quality=92, comment=b'GENChase: N techniques')`. Read it back with `python3 -c "from PIL import Image; print(Image.open('og.jpg').info.get('comment'))"`.
- **Scope.** `The catalog is paused at ...` fires unless `validation/scope.json` has `paused: false`; a missing key counts as paused (tools/lint.js:463). If a merge lost the key, restore main's `"paused": false`. Never flip it yourself: that value is the owner's decision.
- **Uncertainty gate.** A hand-typed comparison (theory, expected, vs, against, `· 0`, ±, σ), or a `compare()`/`setWitness()` without `basis:`. Rebuild the span with `Studio.util.stats.compare({ ..., basis })` (AGENTS.md, "A measured number carries an error bar"). Do not reword the text to slip past the regex.
- **`Math.random`** in a module: route it through `U.makeRng(seed)`. Lint also fails `eval(`, `new Function` and string timers anywhere under `src/`, including in comments.
- **FAMILIARITY** (`src/shared/engine.js`): each id goes in exactly one of `ubiquitous|common|occasional|rare|unseen`. Do not invent a bucket.
- **Versions.** `CITATION.cff` `version` must be a bare `X.Y.Z`. In CHANGELOG.md and `papers/*/RELEASES.md`, every `## ` heading except `## Unreleased` must start with a bare `X.Y.Z` (no v, no other words); use `###` for anything else.

**`<file> is stale. Run node tools/build.js`** or **`VALIDATION.md is stale`.** A generated file was not regenerated. Any edit to `validation/techniques.json`, `LICENSE`, `NOTICE`, `OUTPUT-RIGHTS.md` or `licenses/*.txt` also makes the build stale. Run section 6 and commit the outputs in the same commit.

**`Source changed; review validation record: <id>`** (tools/science.js:63). `sourceSha256` is the SHA-256 of the whole module file, so one edit invalidates every record on that file (`pde.js` carries 6, `rdx.js` 5). List every stale record:
```
node -e "const fs=require('fs'),c=require('crypto');for(const r of JSON.parse(fs.readFileSync('validation/techniques.json','utf8'))){const h=c.createHash('sha256').update(fs.readFileSync(r.source)).digest('hex');if(h!==r.sourceSha256)console.log(r.id,r.source,h)}"
```
For each record, confirm that the change leaves its evidence, limitations and claims true. Then set `sourceSha256` to the printed hash and run section 6. Next run `node tools/verify.js --print <those ids>`; it runs `build.js --check` and `science.js` first, so it refuses while a fingerprint is stale. Exit 0 is success. Exit 2 with `INCOMPLETE: ... evidence list(s) are missing` means a selected id has no registered numerical or print evidence and no test failed: fix the selection or the record. `FAILED: <tool> (exit N). Remaining tests were not run.` names the child that failed; rerun it alone.
If the numbers moved and the claims still hold, rerun each evidence entry's own `command` (its `results` field names the file). The tool's header comment says how it writes: with `--write` (most tools); by redirecting stdout, `node tools/<name>.js > validation/results/<name>.json` (hodgkin-huxley-science, hodgkin-huxley-print, plasma-science, plasma-landau-science, plasma-print, and wave-print-state, which ignores the `--write` in its record); or not at all (pde-science, pde-convergence, pde-stability): update that results file from the printed output and say so in the commit. If the evidence fails, fix the code, not the record. `Catalog reference drift: <id>` means the record's `reference`/`equation` must equal the `credit`/`equation` in `techniques.json`; run `node tools/index.js` first.

**`plates (<id>)` / `node tools/check.js`.** The failure text says which case you have:
- `grid-scale checkerboard (neighbour correlation -0.xx)`: `nyq` is below -0.35, so the explicit step bound is exceeded. Compute the bound: the 5-point Laplacian symbol lies in `[-8, 0]`, and forward Euler needs `dt < 2/|lambda|` at grid scale. Fix `dt` or the scheme.
- `default plate is flat` or `preset <k> is flat`: a blank plate. Look for a shader or init error, or a preset that asks for a state the physics does not allow (Swift-Hohenberg at `g = 0`).
- `same hash loaded twice gave different plates`: unseeded randomness, wall-clock dependence, or state that leaks between loads.
- `after tab switch, visible canvases = N`, or `console error(s)`: a lifecycle bug in `create`/destroy.

**`print export (<id>)` / `node tools/export.js`.** It checks that the blob decodes, that its size equals the print size, that the sheet is not blank, and the MAD between plate and print. A grid-limited plate must implement `fieldCells()` and must not be supersampled (AGENTS.md, "Print sharpness"). The PDE family's print state is covered by `node tools/pde-print-state.js`.

**`offline distribution`: `release-assets: A and B are different files with the same asset name X`.** Two papers ship files with the same basename, and release assets are flat. Rename the newer one with a paper prefix, as 3afee09 did (`papers/hh-dynamics/code/lohner.py` became `hh_lohner.py`), update every import or reference, and rerun `python3 tools/release-assets.py --check`. Real; do not re-run the job.

**`recipe compatibility`.** recipe.js builds its cases only from existing `legacy:` declarations, five trials each; the `why` column names the one that failed.
- **Value mismatch:** `FAIL <id>.<key> want X got Y` with a value for Y means an existing migration broke: legacyFill, the module's `sanitize`, its seg option ids, or a new current default for a key that already has a legacy entry. Reproduce with `node tools/recipe.js 0 1` and fix that code path. Never change what a case expects.
- **A moved default is invisible to recipe.js**, so on every PR read the `defaults` changes yourself: `git diff origin/main...HEAD -- src/modules src/shared/engine.js`. If the move was not meant, restore the default. If it was, it is a recipe migration: bump `RECIPE_V` in `src/shared/engine.js` with a dated comment, declare `legacy: { <newV>: { key: old } }`, update `docs/ENGINE-API.md` line 5 and `tools/engine-api-check.js` lines 12 and 16, and check the fixtures that pin `v:6` hashes (engine-api-check.js lines 126 and 133, tools/ui.js:373), which become older recipes and receive legacy fills. Run `node tools/engine-api-check.js`, `node tools/recipe.js`, `node tools/folder-browser.js` and `node tools/ui.js`, and add a CHANGELOG line (a new recipe version makes the next release a minor one).
- recipe.js reads a value only from a segmented control (the pressed `.seg` button's id). Add the control's aria-label to `LABEL` (tools/recipe.js:70) unless it equals the key. For another kind of control, extend recipe.js's reader. Never change the control to suit the test, and never leave the key out.
- **Timeout:** `want 512 got ERROR ... page.waitForFunction: Timeout 90000ms exceeded`, 1 of 100 (seen on `turing.grid`, and locally on `cortex.grid`). Use the timeout procedure.

**Timeout procedure** (a browser timeout with no numeric mismatch). Never raise a wait budget, add a retry or hide a warning to get green.
1. `git diff --stat <last green head> <failing head> -- dist src tools` shows nothing that reaches the failing case, and the job passed on the previous head and on `main`.
2. Post one PR comment with that evidence. Say it is not being waved through.
3. Re-run the failed jobs once.
4. If it fails again, it is real. Reproduce it alone (for recipes `node tools/recipe.js 0 1`, then `node tools/recipe.js 2000 1`), under CPU throttling if needed, and chase the cause.
5. If the re-run passes, the cause is still open. In the PR comment, record the job id, the failing case and both attempts, and queue a follow-up with `mcp__ccd_session__spawn_task` to find the cause. Do not call it fixed or a flake. If the same signature appears on a later head, reproduce it locally (step 4) before any re-run.

Known signatures, none of them load:
- WebKit `print-smoothing-browser.js:22` `install` timeout: the studio hash race fixed in d51d2c6 (#162). A recurrence is a regression in `src/shared/engine.js`; run `node tools/studio-navigation-check.js`, which reproduces that race.
- `actual '' expected 'browse-modules'` from `tools/studio-navigation-check.js` (about line 28): the Escape-refocus race that ddfc44b (#134) fixed with a 2 s wait. A recurrence is a regression in the dialog focus code.
- Chromium `print-smoothing-browser.js:29` `done()` assertion (`#export-img` not visible after a successful export note; run 790, attempt 1): an assertion, not a timeout, and no commit has fixed it. Reproduce it with `BROWSER=chromium node tools/print-smoothing-browser.js`, under CPU throttling if needed, before any re-run.
- A `periodic-field-review.js` timeout: the procedure above.

**`shell chrome` timing (`ui.js`, `art-only-check.js`, `colophon-check.js`).** Under load, a fixed sleep reads a CSS transition's first value. Wait for the real condition instead, for example the element's `getAnimations()` transitions finishing, as `tools/ui.js` does near line 29 (7ce08f6). To reproduce a timing failure deterministically, run a scratch copy of the tool with `const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })` (rates 4 to 6). `<button ...> intercepts pointer events` is a real layout overlap at phone widths (dfc63e5); fix the layout.

**CodeQL.** The analyses are c-cpp, python, javascript-typescript and actions. They also scan research and paper code, as in the `fprintf` missing-argument alert in `research/double-pendulum/code/horseshoe_design.cpp`. Confirm the alert, fix it in a commit, reply in the thread naming the fix commit (`mcp__github__add_reply_to_pull_request_comment` with `commentId` = the numeric comment id and `pullNumber`), then resolve it (`mcp__github__resolve_review_thread` with the `PRRT_` thread id). Never dismiss an alert yourself: if you believe it is a false positive, reply with the reasoning and leave the thread for the owner. If an alert is a real vulnerability in shipped code (not a diagnostic like the `fprintf` one), fix it without describing how to exploit it in the commit, the PR or the thread, and tell the owner so it can go through the private advisory in SECURITY.md.

**`node tools/paper-check.js`** (runs in `npm test`; one paper with `--paper <id>`). It refuses status `ready` or later until every item in `papers/<id>/notes/QUALITY.md` is checked with its evidence; never tick an item that is only planned. It also rejects an email outside a manuscript's `author.email`. Merging a status flip to `ready` publishes the paper through `papers.yml`, so it needs the owner's explicit go.

**Review conversations.** Resolve every thread before merge. Whether branch protection enforces this cannot be read from here (no `gh`, no MCP endpoint), so treat every unresolved thread as blocking. Fix, reply with the commit, resolve. If you disagree with a reviewer, reply with your reasons and leave the thread for the reviewer or the owner.

## 5. Merge conflicts

**Bringing a PR up to date.** Merge, never rebase, on any branch this session did not create: `git fetch origin main && git merge origin/main`, then section 6 and the JSON duplicate check below, then push. Do not use `mcp__github__update_pull_request_branch` or the "Update branch" button: they merge without regenerating, and a textual merge of generated files can leave them stale (`structure` then fails on `... is stale`).

**Wholly generated.** Take either side with `git checkout --ours <f>` or `--theirs <f>` (swapped during a rebase), then regenerate (section 6): `dist/studio.html`, `index.html`, `src/module-manifest.json`, `src/science-reports.json`, `TECHNIQUES.md`, `techniques.json`, `llms.txt`, `VALIDATION.md`, `.github/description.txt`, and `COMPUTE.md` (regenerate with `node tools/compute-ledger.js`; `--check` verifies it, and in CI it only warns). `og.jpg` is binary: take either side, then recaption it if the count moved.

**Maintained files that contain a stamped count.** Never check out a whole side of these. Hand-merge every hunk and keep both sides' content; a hunk that differs only in the live count can take either number, because `node tools/index.js` restamps it: `README.md`, `CITATION.cff` (keep main's `version`/`date-released` unless this PR is the release), `RESEARCH.md`, `DESIGN-PLAN.md`, `AGENTS.md` (keep every dated owner-decision paragraph from both sides), `CONTRIBUTING.md`, `.zenodo.json`, `paper/paper.md`, and `src/studio.html` (the build template: merge it like code, keeping both sides' includes).

| Hotspot | Resolution |
|---|---|
| `CHANGELOG.md` `## Unreleased` | Keep both sides. Drop the stale copy of an entry that the other side rewrote. |
| `RESEARCH.md` table rows and dated entries | Keep both, main's first. Never drop a dated search. |
| `README.md` formula-tab list | Hand-merge the list. index.js restamps the count. |
| `validation/FORMULA-SUBMISSIONS.md` | Hand-merge, then recount. |
| `validation/techniques.json` | Keep both sides' evidence, `limitations` and `remaining` entries; never drop one. Set `reference` and `equation` to the merged module's `credit` and `equation` (run `node tools/build.js && node tools/index.js`, then copy them from `techniques.json`). Then recheck `sourceSha256` (section 4). |
| `src/modules/<file>.js` | Merge as code. Keep main's behaviour and re-apply this branch's gates (for example, route a comparison through `compare()` with a `basis`). Refresh the fingerprint of every record on that file only after its evidence passes on the merged module, then run `node tools/check.js <id> 12000` for each (ae27ca5). |
| `validation/results/*.json` | Never hand-merge. Rerun the entry's evidence command on the merged source (section 4). |
| `IDENTITIES.md`, `research/<id>/REPORT.md` | Keep both sides' rows and dated entries, main's first. |
| `papers/papers.json` | Keep both entries, then run `node tools/paper-check.js`. |
| `paper/paper.md` | The dated sentence "On 24 September 2026, of the 130 tabs then in the catalog ..." keeps its dated count. index.js stamps only the live-count sentence. |
| Files outside the branch's own folder, when the branch was cut before a squash | Take main's version. |

**Recipe version collision.** If main's `RECIPE_V` in `src/shared/engine.js` already equals the number this branch bumped to (git merges two identical bumps cleanly), renumber the branch to the next version: move its `legacy: { <v>: ... }` keys, `docs/ENGINE-API.md` line 5 and its history entry, and `tools/engine-api-check.js` lines 12 and 16, then run `node tools/recipe.js` and `node tools/engine-api-check.js`. Never let two changes share one version number.

Auto-merges and cherry-picks can silently duplicate JSON keys. `"paused": false` appeared twice in `validation/scope.json`, and neither git nor `JSON.parse` complains. Check after every merge:
```
python3 -c "
import json,sys
def h(p):
    k=[a for a,_ in p]; d=sorted({x for x in k if k.count(x)>1})
    if d: raise SystemExit('duplicate keys %s in %s' % (d, f))
    return dict(p)
for f in sys.argv[1:]: json.load(open(f), object_pairs_hook=h)
print('no duplicate JSON keys')" $(git ls-files '*.json')
```

## 6. Regeneration, then the pre-push checklist

The order matters. index.js calls the build's verify, science.js checks records against `techniques.json`, and lint fails a stale `og.jpg` comment:
```
node tools/build.js            # index.html, dist/studio.html, src/module-manifest.json, src/science-reports.json
node tools/index.js            # TECHNIQUES.md, techniques.json, llms.txt, stamped counts, description.txt
node tools/science.js --write  # VALIDATION.md
# If the count moved, recaption og.jpg now (section 4).
node tools/build.js --check && node tools/science.js && node tools/lint.js
```

Before every push:
- [ ] Fast checks, always (about 1 min): the last line above, plus `npm test` (23 s; it includes stats-check, expr-check, commitments and paper-check), `npm run test:validator` (20 s) and the JSON duplicate check. Run the exact `structure` script from section 3 when `tools/` or `validation/` changed.
- [ ] Browser checks, only for what the diff touches, one at a time: `node tools/check.js <id> 25000` and `node tools/export.js <id> 8 300` for a touched tab; `node tools/recipe.js` for a moved default; `node tools/engine-api-check.js` when `src/shared/engine.js` or a recipe or legacy default changes; `node tools/provenance-check.js` when an export path, `exportData()` or `getProvenance()` changes; `node tools/ui.js` for shell chrome; `node tools/verify.js --print <ids>` for touched numerics.
- [ ] The full sweep (check.yml:8-9) takes hours on SwiftShader, so run it only when the change can reach every tab: `src/shared/`, a family factory module shared by several tabs (pde.js, rdx.js and the like), `tools/build.js` or the shell's HTML and CSS. A change confined to named module files is swept by `check.js` and `export.js` for exactly those tabs, plus the CI family representatives. When the sweep is needed, run it in the background under an overall cap and report the result: `timeout 10800 sh tools/checkall.sh dist/studio.html $SCRATCH/all.log $(node tools/lint.js | sed -n 's/^[0-9]* techniques: //p')` (each plate is already capped at 900 s). It waits only 9 s per plate against 25 s in CI, so re-check any flat or unsettled field-tab FAIL with `node tools/check.js <id> 25000` before calling it real.
- [ ] Reread the diff adversarially: `git diff origin/main...HEAD --stat`, then the diff itself. Look for generated files edited by hand, a tolerance or check weakened, a validation limitation or scientific credit removed, a status promoted without evidence, a measurement rounded toward theory, and anything private (section 9). Also check the owner's standing decisions: README and docs updated in this PR when the change calls for it (2026-09-25); an item this PR finishes moved to the Done list in `docs/RESEARCH-GRADE.md`; new text says "prior article review" or "prior-article search", never "prior art review", while dated records keep their words (2026-09-26; no tool enforces this); no "not reviewed outside the project" label added to a draft and no claim of an outside review (2026-09-26), even when a reviewer asks; leave that thread for the owner.
- [ ] `git status --short` shows only intended paths. Stage paths by name, never with `git add -A` or `-f`.

## 7. Commits and pushes

- **Identity.** Author and committer are both `Chase Hendrick <326338179+ChaseHendrick@users.noreply.github.com>`. Check with `git log -1 --format='%an <%ae> | %cn <%ce>'`. Never use `sharpie@users.noreply.github.com` or a guessed `login@users.noreply` address.
- **Stop hook.** `/root/.claude/stop-hook-git-check.sh` asks you to commit and push when the checkout has uncommitted, untracked or unpushed work: do that for work that is ready, on the designated branch; a draft that is mid-review can be committed locally on its own branch and pushed when it is ready. When commit signing is configured it also flags commits whose committer is not `noreply@anthropic.com` and asks you to reset the author. Ignore that one request only: do not change git config or rewrite commits for it (AGENTS.md "Git identity"; docs/HANDOFF.md:95, "The repository rule wins").
- **Trailers.** End the message with the `Claude-Session:` line only. Omit `Co-authored-by` and `Signed-off-by`: AGENTS.md overrides the session reminder that asks for a Claude co-author line.
- **Message.** One sentence-case subject that says what changed (CONTRIBUTING.md:30 asks for a closing period; the recent log and squash subjects omit it, so match the PR's existing title style). No `fix`, `WIP` or `feat:`/`chore:` prefixes. Add a body only when the subject cannot carry the why.
- **PR body.** Use the template sections: `## What this does`, `## How I checked` (tick a box only after that check has passed on this head; otherwise write "in progress"), and `## Notes for review` (a hash that reprints the plate helps). End with the attribution lines the session gives for PR descriptions. The PR title becomes the squash subject with ` (#N)` added, so keep it correct.
- **The designated branch after a squash merge.** GitHub may delete the head branch when the PR merges (it did after #177 and #178); the session itself cannot push deletions (docs/HANDOFF.md:48). Check with `git ls-remote --heads origin <branch>`. If it exists, confirm that its tip is the head of the PR that was squashed (`git rev-parse origin/<branch>` equals that PR's `head.sha`) and that no open PR uses it; cherry-pick any commits past that head onto the new branch first, or ask the owner. Then push with `git push --force-with-lease=<branch>:<old tip sha> origin <branch>`. If it is gone, use a plain `git push -u origin <branch>`.
- **Integrating another agent's branch.** Cherry-pick only that branch's own commits made after its base: list them with `git log --oneline <base>..<tip>`, then `git cherry-pick <base>..<tip>` or `git cherry-pick <sha1> <sha2>`. Never merge a whole branch that carries an older snapshot of main. Regenerate afterwards (section 6). Never pick from `research/generalizations-wip`.

## 8. Merging

- **Merge only when the owner says so in this session.** Green CI does not count as that instruction. Never approve.
- Before merging, the exact head SHA must have every check green (skipped `deploy Pages` and skipped `refresh` are expected), no conflicts and every thread resolved. When the PR changes a shared path (section 6), the `checkall.sh` sweep must also have passed locally on that head, and when it changes only named modules, `check.js` and `export.js` for those tabs; report its result to the owner with the merge request, because a green check is necessary, not sufficient (CONTRIBUTING.md:81). Do not merge a stale tested head (docs/RELEASING.md:13).
- Merge with `mcp__github__merge_pull_request`: `merge_method: squash`, `expectedHeadSha: <tested head>`, `commit_title: "<PR title> (#N)"`, and a `commit_message` that ends with the `Claude-Session:` line and has no `Co-authored-by`.
- Then:
  1. Call `mcp__Claude_Code_Remote__unsubscribe_pr_activity`.
  2. Cancel pending check-ins with `mcp__Claude_Code_Remote__delete_trigger` for each saved `trigger_id`.
  3. For follow-up work, restart the designated branch from main (`git fetch origin main && git checkout -B <branch> origin/main`) and push as in section 7.
- Check the push-event runs on the merged SHA: `check`, and by path `publish papers` (`papers/**`), `volunteer results` `refresh`, and `stamp and complete proofs` (timestamps). `refresh` and timestamps open PRs on `automation/*` branches that need a dispatched check (section 2). A dispatched `publish papers` run with a `release` input fails with `papers/<id>/RELEASES.md has no notes under '## X'` when the notes are missing: write them under `## X` (no leading v) in a follow-up PR, and after it merges dispatch again with the same inputs.
- A release needs a successful push-event `check` run on the merged SHA. If that run was cancelled, re-run it. Releases follow AGENTS.md ("Publish offline studio"); an agent never moves, deletes, renames or hand-pushes a tag.

## 9. Local pitfalls

- **SwiftShader contention.** The container has 4 CPUs and is often shared. Run browser checks one at a time; parallel runs hit the 30 s and 90 s waits and give false timeouts.
- **Keep every command bounded** (owner's instruction, 2026-09-27: no shell runs for hours when it does not need to).
  - Wrap each command in `timeout <seconds>` sized from the times in section 3, about twice the CI time. A foreground Bash call stops at 10 minutes anyway; anything longer goes to `run_in_background` with its own `timeout`.
  - A wait or watch loop exits on every end state, including "the process it watches is gone", and carries a deadline: `end=$(( $(date +%s) + 1800 )); until <done> || [ $(date +%s) -gt $end ]; do sleep 20; done`.
  - Stop a background task or monitor (TaskStop) as soon as its subject finishes, is cancelled or is superseded, and look for stale ones before ending a turn: `ps -eo pid,etimes,args --sort=-etimes | awk '$2>600'`.
  - Chasing an intermittent failure has a budget: at most three instrumented runs or 30 minutes, then write up what was learned (section 4, timeout procedure) instead of looping.
  - Run only the checks the diff reaches (section 6). Never rerun a whole suite "to be safe".
  - Heavy CPU work (CAPD proofs, interval arithmetic, large eigendecompositions) runs under `nice -n 19` with fewer threads while browser checks run.
  - Not in CI and long: `sh tools/sharpall.sh` about 1 hour; `checkall.sh` over every tab, hours. Run them only when section 6 says so.
- **`pkill -f` can kill your own shell.** A pattern that also appears in the running command line matches the shell itself (exit 144). Use anchored patterns, for example `pgrep -f "^node tools/recipe.js"`, and kill by PID.
- **The clone is shallow.** Use `origin/main`; local `main` can be stale. Fetch other branches by name.
- **Never commit private material.** Never commit `*.commitment.json` (it holds the salt), full texts or PDFs of papers that are not openly licensed, raw data whose terms forbid redistribution, or unpublished material beyond what AGENTS.md allows (a result produced in this project's sessions: a manuscript in `papers/<id>/` listed in `papers/papers.json` with status "draft" and with its own `notes/QUALITY.md`, or anything else in `research/<id>/`, with its programs and results). A push is publication (docs/COMMITMENTS.md). Keep personal email addresses out of commits, PR bodies and comments. No text may claim an outside review that has not happened.
