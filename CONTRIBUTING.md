# Contributing

GENChase is one HTML file. A contribution is a change to that file, or to the harness that keeps it honest. There is no package to install into, and no second architecture to propose.

Read this, then `AGENTS.md` if you are writing a technique, then `tools/modules/CONTRACT.md` before you touch a simulation. `studio.html` wins when any of those disagree. If the work is a prior-art search or a claim that something has not been done, read `RESEARCH.md` first and write the query down there the same day.

## What belongs here

A real simulation that reprints from a seed: a PDE, a lattice, a growth, a tiling, a dynamical system. It shares the seed, the palette, the print pipeline and the witness. It credits the paper. It does not put a name on work that already exists. A result derived here, uniqueness-checked, with a check the plate can miss, is allowed; search the literature for the closed form and the extremum first, then write it in [`IDENTITIES.md`](IDENTITIES.md) and log the search in `RESEARCH.md` the same day.

Leave it when you need a game, a network, a model-weights file, a bundler, or a folder of unrelated sketches. Do not split `studio.html`. Do not relicense. The source is PolyForm Small Business 1.0.0; images a person generates are theirs.

A vulnerability is not a pull request. Use [SECURITY.md](SECURITY.md).

## How to work

1. Fork, or a branch off `main`. One change per branch.
2. For a new tab, write `tools/modules/<id>.js` and inject; do not edit `studio.html` until the plate checks. For a shell fix, edit `studio.html` directly.
3. Run the harness that matches the change (below).
4. Open a pull request against `main`. CI has to be green.
5. The maintainer squash-merges. The branch is deleted.

Do not push to `main`. Do not merge your own pull request unless you maintain the repository.

## Commits

One subject line, sentence case, a period, what changed. A body only when the subject cannot carry the why.

```
The plate checks. The catalog is generated.
```

Not `fix`, not `WIP`, not a dump of files. Not Conventional Commits prefixes (`feat:`, `chore:`); the log is read as English.

A commit that adds a tab also regenerates the catalog (`node tools/index.js`) in that same commit. That command writes `TECHNIQUES.md`, `techniques.json`, `llms.txt`, stamps the live count into README, CITATION.cff, RESEARCH.md, DESIGN-PLAN.md, the studio head, and `.github/description.txt`, and appends a `science only` row for any tab RESEARCH.md does not yet mention. Do not hand-edit those numbers. After a count change, update the GitHub About from `.github/description.txt`:

    gh repo edit -d "$(cat .github/description.txt)"

`og.jpg` is the social card. Its JPEG COM comment has to match the file; recaption the card when the count moves. `node tools/lint.js` fails a catalog, a spelled catalog count (digits after twelve, not words), a RESEARCH row, a description file, or a COM comment that is behind the file.

Author, committer, and any `Co-authored-by` trailer use only:

    Chaos <326338179+SharpMeow@users.noreply.github.com>

Never `sharpie@users.noreply.github.com`. That address is github.com/Sharpie, not this account. Leave `Co-authored-by` off unless a real second person wrote the change.

## Pull requests

Against `main`. Title matches the squash subject. Body says what a reviewer should look at, and which harness you ran.

Checklist, as it applies:

- [ ] `node tools/lint.js` is clean
- [ ] chrome: `node tools/ui.js` (More, Export, and Generate stay on screen at 390)
- [ ] a new or changed tab: `node tools/check.js <id> 12000`
- [ ] a tab that prints: `node tools/export.js <id> 8 300`
- [ ] a new tab: `node tools/index.js` (writes `TECHNIQUES.md`, `techniques.json`, `llms.txt`)
- [ ] a new tab: a `familiarity` bucket, a credit line, no `Math.random`, a row in `RESEARCH.md`
- [ ] a prior-art search or a "never been done" claim: the query and the conclusion in `RESEARCH.md`
- [ ] a moved default: a `legacy:` declaration, and `node tools/recipe.js`
- [ ] the print is the plate, or `exportSVG` returned nothing and the PNG is the sheet

CI runs lint, the chrome shell, recipe compatibility, and one plate from each architecture family. It does not replace a local check of the tab you touched.

## Merging

Squash only. The squash subject is the pull-request title, with `(#N)` added. Merge commits and rebase-merges are off so the log stays one line per change.

`main` is the product. A green check is necessary, not sufficient: a thumbnail has shipped a bug this project then had to take back.

## Naming

Do not put a person's name on a plate unless the thing is new, uses real physics, and a check in the file marks miss if the claim is wrong. Search the literature for the closed form and the extremum first. Existing equations keep their own names. A derived identity belongs in [`IDENTITIES.md`](IDENTITIES.md) and is named for the person who found it. Hendrick's Identity is Hendrick's: that is the finder's name. That name does not travel. If you meet the identity bar, the row is named for you, or for the geometry if you prefer a lock name. Do not put Hendrick's name on a second result, a published equation, or someone else's find. A missed lock is not renamed into a success.

