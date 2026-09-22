# Browsing modules and reading the sheet

**Browse all modules** opens a searchable catalog without starting every simulation. Search names, equations, references or keywords, then combine topic, familiarity, reference year, evidence status and favorites filters. Select a card to load that module. Favorites stay in the browser's local storage when it is available.

Sorting supports name, oldest or newest reference year, and common-to-rare or rare-to-common familiarity. **Reference year means the year listed in the module's reference subtitle, not the date it was added to GENChase or a claim about historical priority.** Undated entries sort last. Topics and familiarity are editorial categories, not measured usage statistics. The science filter uses the validation inventory and preserves each record's stated limits.

The quick tab list wraps within a vertically scrolling area. The full catalog provides the alternative to scanning a long horizontal strip. The top controls wrap to available width, and print/preset controls remain in document flow so they do not cover neighboring controls.

## Artwork, caption and measurements

Zoom and pan act on the complete preview sheet, including the colophon. Caption text therefore grows with the artwork. **Fit** returns the whole sheet to its fitted view. Small vector previews use extra raster sampling within the selected workload budget; Light mode keeps its lower preview limit. Zoom is a viewing preference; it does not change the recipe, numerical grid, solver timestep or requested print size.

Scientific status text and structured comparisons have their own panel below the artwork. They wrap within that panel instead of being overlaid on the image. Long diagnostics can scroll within the panel. The separate **Science report** still shows recorded evidence, limitations and downloadable report data. Neither a visible measurement nor an activity badge independently establishes validity.

**Art only** hides the controls and measurement panel when you want to view the image. The existing exit control restores them. Caption visibility and placement remain controlled through Studio setup; the zoom change does not change exported caption dimensions.

## Initial preferences

New users start with **Advanced print tools** enabled and **Maximum throughput** selected. Studio setup lets you choose Balanced or Lighter use, or hide advanced printing. Existing saved choices are preserved. These are interface/workload preferences outside the scientific recipe. The separate offline runner retains its own power controls.

## Interface motion and browser scope

Short transitions apply to interface controls and dialogs. The reduced-motion preference removes nonessential interface animation. These presentation changes do not modify the plates' numerical timesteps or their physical evolution.

The shared navigation regression was run in Chromium and **Playwright 1.58.2 WebKit 26** at widths **1512, 1280, 1024, 768 and 390 pixels**. It checks control visibility and overflow, catalog search/favorites/sorting, dialog focus restoration, caption and artwork zoom together, unchanged recipes, measurement-panel separation and reduced motion.

This is evidence for the tested browser engine and layouts. It is not a test of every Safari release, physical phone/tablet, foldable hinge arrangement or GPU module. Numerical and print checks remain separate. To reproduce the navigation check with installed browser dependencies:

```sh
node tools/studio-navigation-check.js
BROWSER=webkit node tools/studio-navigation-check.js
```

Install the tested Playwright and its WebKit browser with `npm install --no-save --package-lock=false playwright@1.58.2` and `npx playwright install webkit` before the second command, as CI does; the `playwright@1.49.1` in BUILDING.md installs an older WebKit. Use [BUILDING.md](../BUILDING.md) for the rest of the browser setup. Browser installation can require network access and additional OS dependencies.

## Design choices and sources

The catalog uses the browser's native modal dialog for focus containment and Escape handling, following the [W3C modal-dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and [native dialog technique](https://www.w3.org/WAI/WCAG22/Techniques/html/H102). It operates on catalog metadata and fetches evidence records when needed, preserving lazy simulation loading.

The layout responds to available space rather than identifying a phone by its model name. WebKit's [responsive design tooling](https://webkit.org/blog/14670/simplified-responsive-design-mode/) helps explain why viewport coverage and actual device checks are distinct. Browser feature availability, including [Safari's WebGPU support](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/), does not establish that GENChase's WebGL shaders or native Metal backend have been validated on every device.
