# Browser versions used by the regression checks

The browser jobs and offline release use Playwright 1.58.2. Six older check jobs still installed 1.49.1, whose bundled Chromium was 131. They now use the same pinned runtime as the release and local setup tool. [BUILDING.md](../BUILDING.md) names that version too. No check, acceptance threshold or wait budget was removed or relaxed.

A controlled comparison on 2026-09-30 kept the studio, Smectic source, recipe, dimensions and `tools/vector-preview-check.js` unchanged. Chromium 131 reproduced the CI layers discrepancy: relative pixel error 0.179666 locally, compared with 0.179678 in CI. Chromium 145 passed all seven actual UI exports, including Smectic layers, defects and both views; the layers error was 0.007667. Direct module PNG pixels matched the same-size canvas exactly in both versions. The blank-export control was rejected.

This demonstrates a browser-version effect in the canvas/SVG comparison; it does not identify the browser implementation defect or promise pixel identity in older releases. The [fingerprinted record](../validation/results/browser-export-runtime-2026-09-30.json) retains the failed and passed measurements. Fresh GitHub checks remain the gate for the changed CI configuration.

Turing's earlier CI warmup incompleteness is a separate issue. Three isolated fixed-work runs completed all 2200 steps, and old/current PBO allocation on Chromium 131 produced identical fields and pixels. Those runs did not demonstrate a PBO slowdown or a speedup from Chromium 145. The earlier incomplete CI result remains part of the audit.
