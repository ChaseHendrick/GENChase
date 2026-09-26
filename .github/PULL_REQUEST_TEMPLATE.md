<!-- Against main. Squash-merged. Title is the commit. -->

## What this does

<!-- One or two sentences. The plate, the shell, or the harness. -->

## How I checked

- [ ] `node tools/build.js --check` and `node tools/science.js`
- [ ] Numerical changes update validation evidence, limits and source fingerprints
- [ ] `node tools/lint.js`
- [ ] `node tools/check.js <id> 12000` (if a tab moved)
- [ ] `node tools/export.js <id> 8 300` (if it prints)
- [ ] `node tools/index.js` (if a tab was added or renamed; this stamps the live count)
- [ ] if the catalog count moved: `og.jpg` JPEG COM comment matches, and GitHub About matches `.github/description.txt`
- [ ] no `Math.random` in a sim; credit the paper; familiarity bucket if new
- [ ] a new tab: a row in `RESEARCH.md`, even if the status is `science only`
- [ ] a prior-article search or a "never been done" claim: the query and the conclusion in `RESEARCH.md`
- [ ] the print is the plate, or `exportSVG` returned nothing and the PNG is the sheet
- [ ] a derived identity: literature search first (closed form and extremum), a row in `IDENTITIES.md`, a plate whose check can miss, and the search in `RESEARCH.md`
- [ ] git author is Chase Hendrick `<326338179+ChaseHendrick@users.noreply.github.com>`; no `sharpie@` trailer

## Notes for review

<!-- What to look at. A hash that reprints the plate helps. Existing equations keep their own names. A derived identity belongs in IDENTITIES.md, uniqueness-checked, with a plate whose check can miss. The three-vortex formula specializes Gröbli (1877); its former personal name is retired. Miss on the status line is a grade, not a crash. -->
