# Maintained source and portable builds

Edit `src/studio.html` (markup and ordered includes), `src/styles/*.css`,
`src/shared/studio.js` (shell, utilities and GPU helpers), or `src/modules/*.js`
(simulation families). Shared family helpers stay with their callers to preserve scope.
There is no runtime loader, network dependency, framework or package installation for users.

```sh
node tools/build.js
node tools/index.js
node tools/build.js --check
node tools/lint.js
node tools/science.js
```

The catalog generator needs Playwright as before. Install the development harness with
`npm install --no-save playwright@1.49.1` and `npx playwright install chromium`.
These dependencies are for contributors, not users of the portable download. The builder and coverage checker need only Node.
Commit both sources and generated artifacts. CI rejects a stale build, omitted module, duplicate
include, missing validation record or stale validation report. Catalog count stamping updates the
source template and rebuilds, so the next assembly cannot undo metadata updates.

`studio.html` is still the downloadable, offline-capable product. Launchers keep working.
GitHub collapses its generated diff by default; review the maintained files. Scientific changes
must include the relevant benchmark and print checks, not only build parity.

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
