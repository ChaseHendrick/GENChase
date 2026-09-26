# Contributing

You can help without writing code: [make art and share a recipe](https://chasehendrick.github.io/GENChase/start.html), [report a problem](https://github.com/ChaseHendrick/GENChase/issues/new?template=bug.yml), or [run checks on your computer](apps/validate/README.md). For the local checker, run `npm run setup:checks` once, then `npm run validator`. Review result files before upload, or opt in to automatic sharing for a run.

Fork the repository, edit the engine or one module, run the build and catalog update, run `npm test`, then open a pull request. Start with `src/shared/engine.js` for shared behavior or a file in `src/modules/` for a technique. [Draft contributor tasks](docs/CONTRIBUTOR-TASKS.md) offer small starting points.

Read this, then `AGENTS.md` if you are writing a technique, then `tools/modules/CONTRACT.md` before you touch a simulation. The maintained `src/` implementation is authoritative; `index.html`, `src/module-manifest.json` and `dist/studio.html` are generated. If the work is a prior-article search or a claim that something has not been done, read `RESEARCH.md` first and write the query down there the same day.

## What belongs here

A real simulation that reprints from a seed: a PDE, a lattice, a growth, a tiling, a dynamical system. It shares the seed, the palette, the print pipeline and the witness. It credits the paper. It does not put a name on work that already exists. A result derived here, uniqueness-checked, with a check the plate can miss, is allowed; search the literature for the closed form and the extremum first, then write it in [`IDENTITIES.md`](IDENTITIES.md) and log the search in `RESEARCH.md` the same day.

Leave it when you need a game, a network, a model-weights file, a bundler, or a folder of unrelated sketches. Edit modular source in `src/`; the generated `dist/studio.html` remains portable. Source is Apache-2.0; images a person generates are theirs.

A vulnerability is not a pull request. Use [SECURITY.md](SECURITY.md).

## How to work

1. Fork, or a branch off `main`. One change per branch.
2. Read the catalog and one suitable neighbor, then edit a module or the engine. For a new family, copy `src/modules/_template.js` to a named file, implement and register it, and add its include to `src/studio.html` before boot. Multiple tab IDs may share one family file. Run `node tools/build.js` and `node tools/index.js`; never hand-edit generated files. See [BUILDING.md](BUILDING.md).
3. Add or update the validation record. New formulas begin as **unvalidated**; follow [Submitting a formula](validation/FORMULA-SUBMISSIONS.md) and the [scientific validation contract](validation/README.md).
4. Run `npm test` for fast, dependency-free checks, then the harness that matches the change (below). Scientific claims need independent benchmark evidence, a deliberate failure control and reproducible measured results.
5. Open a pull request against `main`. CI has to be green.
6. The maintainer squash-merges. The branch is deleted.

Do not push to `main`. Do not merge your own pull request unless you maintain the repository.

## Commits

One subject line, sentence case, a period, what changed. A body only when the subject cannot carry the why.

```
The plate checks. The catalog is generated.
```

For registered scientific evidence, `node tools/verify.js --print <id> ...` checks consistency and runs
the selected numerical and print tests, deduplicating shared tests. Use `--list <id>` or `--list --all` to preview the plan;
missing evidence remains visible. See [tools/VERIFY.md](tools/VERIFY.md). This complements the plate
and export checks below; it does not certify an entire technique.

Not `fix`, not `WIP`, not a dump of files. Not Conventional Commits prefixes (`feat:`, `chore:`); the log is read as English.

A commit that adds a tab also regenerates the catalog (`node tools/index.js`) in that same commit. That command writes `TECHNIQUES.md`, `techniques.json`, `llms.txt`, stamps the live count into README, CITATION.cff, RESEARCH.md, DESIGN-PLAN.md, the studio head, and `.github/description.txt`, and appends a `science only` row for any tab RESEARCH.md does not yet mention. Do not hand-edit those numbers. After a count change, update the GitHub About from `.github/description.txt`:

    gh repo edit -d "$(cat .github/description.txt)"

`og.jpg` is the social card. Its JPEG COM comment has to match the file; recaption the card when the count moves. `node tools/lint.js` fails a catalog, a spelled catalog count (digits after twelve, not words), a RESEARCH row, a description file, or a COM comment that is behind the file.

Author, committer, and any `Co-authored-by` trailer use only:

    Chase Hendrick <326338179+ChaseHendrick@users.noreply.github.com>

Never `sharpie@users.noreply.github.com`. That address is github.com/Sharpie, not this account. Leave `Co-authored-by` off unless a real second person wrote the change.

## Pull requests

Against `main`. Title matches the squash subject. Body says what a reviewer should look at, and which harness you ran.

Checklist, as it applies:

- [ ] `node tools/build.js --check` and `node tools/science.js` pass
- [ ] Numerical changes include benchmark evidence and updated validation limitations
- [ ] Each numerical claim records its independent reference, failure control, reproducible command and JSON results; syntax, runtime and export checks do not promote scientific status
- [ ] A reviewer has inspected and reproduced the evidence for any validation-status promotion, including its stated domain and remaining gaps
- [ ] `node tools/lint.js` is clean
- [ ] chrome: `node tools/ui.js` (More, Export, and Generate stay on screen at 390)
- [ ] a new or changed tab: `node tools/check.js <id> 12000`
- [ ] a tab that prints: `node tools/export.js <id> 8 300`
- [ ] a new tab: `node tools/index.js` (writes `TECHNIQUES.md`, `techniques.json`, `llms.txt`)
- [ ] a new tab: a `familiarity` bucket, a credit line, no `Math.random`, a row in `RESEARCH.md`
- [ ] a prior-article search or a "never been done" claim: the query and the conclusion in `RESEARCH.md`
- [ ] a moved default: a `legacy:` declaration, and `node tools/recipe.js`
- [ ] the print is the plate, or `exportSVG` returned nothing and the PNG is the sheet

CI runs on pull requests and main. It retains the numerical evidence, browser, recipe, plate and print checks alongside the fast development checks. `npm test` does not replace those scientific jobs or a local check of the tab you touched. Browser jobs use Chromium’s headless shell.

## Merging

Squash only. The squash subject is the pull-request title, with `(#N)` added. Merge commits and rebase-merges are off so the log stays one line per change.

`main` is the product. A green check is necessary, not sufficient: a thumbnail has shipped a bug this project then had to take back.

## Naming

Use descriptive names for derived bounds. Search the literature for the closed form, equivalent formulations, and extremum first, and credit published equations to their original sources. The three-vortex collapse bound specializes Gröbli’s 1877 formula; its former personal name is retired. A proof, numerical check, or unsuccessful search does not establish originality. Record derivations and their limitations in [`IDENTITIES.md`](IDENTITIES.md).

## Recipe-check runtime

`node tools/recipe.js` checks every declared legacy default with five assertions, using two isolated browser pages at a time. Each trial starts with fresh storage and waits for its own sidebar to be ready; it never waits for the expected value. Optional arguments are an extra settle delay in milliseconds and a worker count from 1 to 4, for example `node tools/recipe.js 0 1` for a sequential diagnostic run. Plate and export checks still exercise rendering separately.

[TESTING.md](TESTING.md) maps changes to relevant checks; [the release checklist](docs/RELEASING.md)
covers merging and the hosted build. Use the existing source formatting when editing;
`.editorconfig` sets basic defaults for new files without requiring a whole-repo reformat.
