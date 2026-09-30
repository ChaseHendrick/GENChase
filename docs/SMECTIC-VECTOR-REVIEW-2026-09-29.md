# Smectic vector preview and print review, 29 September 2026

PR #255's `shell chrome` job 109688032672 failed the real UI preview/print comparison for Smectic layers at 1200 by 1200 pixels. Relative error was 0.179687861 against the unchanged limit of 0.15. Ink ratio was 0.998999667, the blank negative control had error 1 and ink ratio 0, and the module's direct PNG matched its Canvas preview exactly. The discrepancy concerned vector rasterization, rather than a missing plate or a different packing state.

The maintained code used `CanvasRenderingContext2D.arc()` for each layer and an SVG `circle` for the same layer. It rounded SVG coordinates and stroke widths to two decimal places. These independent circle implementations can use different path tessellation and antialiasing. With thin strokes, a small shape displacement moves a substantial fraction of the ink even when total ink agrees.

A local Chromium 145.0.7632.6 headless-shell diagnostic isolated these effects. Existing Canvas arcs against SVG circles had relative error 0.008289 on macOS. Removing coordinate rounding reduced that to 0.0000249. Changing only the Canvas primitive to an ellipse raised error to 0.183207; changing only the SVG primitive to two arc segments raised it to 0.190401. The exact Linux CI discrepancy was not reproduced on macOS, so this experiment establishes the sensitivity to primitive choice, rather than identifying a particular Linux raster backend.

The correction defines each layer as one full-precision, closed path with two semicircular SVG arc segments. Canvas preview, direct PNG, and SVG export consume that same path. SVG defect geometry and stroke widths also retain their original numerical precision. Domain packing, seeded random draws, layer count and pitch, centers, radii, palettes, controls, and physical claims are unchanged. Rasterized edge pixels can change because the rendering representation is now consistent.

The focused before/after matrix used Playwright 1.58.2 and the cached Chromium 145 headless shell. It exercised layers, defects, and both views at 256 and 1200 pixels with normal Canvas rendering and `--disable-accelerated-2d-canvas`. All 12 corrected cases satisfied the original relative-error and ink-ratio predicates. Every blank negative control failed, and every direct module PNG matched its Canvas preview exactly.

| Corrected 1200-pixel view | Normal Canvas relative error | CPU Canvas relative error |
| --- | ---: | ---: |
| Layers | 0 | 0 |
| Defects | 0.0000833 | 0.0003517 |
| Both | 0.0000206 | 0.0000729 |

The largest corrected error across the matrix was 0.069742 at 256 pixels with CPU Canvas layers. These are browser rendering checks, not numerical or physical validation of the smectic model. The model remains unvalidated in the scientific inventory. Linux CI on the corrected source is still required.

Only the Smectic block in its shared module file changed. The prefixes and suffixes surrounding that block were checked byte for byte against the prior source, so the other techniques' existing evidence and limitations remain applicable.

The unchanged `node tools/vector-preview-check.js` passed all seven real UI exports at 1200 pixels using Playwright 1.58.2 and Chromium 145 headless shell. Smectic layers matched exactly, defects had relative error 0.0000582, and both had error 0.0000281. Blank negatives remained error 1 and ink ratio 0; direct module PNGs remained error 0 and ink ratio 1. The four Hastings-Levitov cases also passed. This run did not substitute the installed full Chrome browser for the headless shell.

`node tools/check.js smectic 12000` also passed: the default and all four presets were nonblank, two identical seeded loads had the same fingerprint, tab switching left one visible Canvas, and no console errors were reported. Both browser commands ran under explicit process deadlines.

`node tools/export.js smectic 8 300` passed for the default and all four presets. Each export was a nonblank 2400 by 2400 PNG rasterized from the vector SVG. Plate/print mean absolute differences ranged from 0.34 to 3.47 byte levels; the largest dark-pixel fraction difference was 0.0294. The run had a 240-second process deadline.

A supplemental 90-second-bounded run used the older Chromium 131 shell that had reproduced the historical layers discrepancy. The corrected actual UI layers export had relative error 0 and ink ratio 1, with the unchanged 0.15 error limit. Its blank control remained error 1 and ink ratio 0, and the direct PNG matched the Canvas exactly. This establishes recovery on that previously failing local browser as well as on Chromium 145; it does not substitute for the Linux CI gate.

All seven registered neighboring evidence harnesses were rerun on the current source: Phyllotaxis review, CGL field review (including its kernel check), Hofstadter science, spectrum and print-state checks, and Talbot science and print-state checks. Byte-identical harnesses ran against a frozen copy of the maintained source and engine using Playwright 1.58.2 and Chromium 145 SwiftShader. Their newly generated result objects replace the previous receipts, with current source hashes and runtime provenance. Numerical arrays, errors, scientific counts, controls and state-preservation outcomes are unchanged. Recipe version identifiers, dates, timing and viewport or PNG encoding metadata can differ. All fourteen records affected by the two shared source files retain their previous validation statuses, scopes and limitations.
