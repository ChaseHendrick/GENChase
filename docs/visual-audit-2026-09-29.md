# GENChase visual and export audit

All 135 techniques produced a live preview and an actual 1200 × 1200 PNG through the studio's print UI. The audit also exercised 38 additional supported Grid 256 settings, for 173 cases total. Every PNG export completed, with no recorded page exceptions. This establishes bounded local rendering coverage, not scientific accuracy or all-device compatibility.

The local deliverable includes a searchable gallery and all 173 captures. The reproducible focused regression is `node tools/vector-preview-check.js`.

## Confirmed fixes

- **Hastings–Levitov:** outline preview used a contrasting light ink, while SVG export used the darkest palette entry. The studio rasterizes SVG for its PNG export, so the exported branches almost disappeared. SVG now uses the preview's ink, line weight, fill and age colors. The old default retained only 16.8% of the preview's integrated ink contrast; the corrected export retains 99.95%. Geometry and simulation settings are unchanged.
- **Smectic focal conics:** SVG export selected different colors from the preview and omitted the curved focal-defect mark. The module PNG also omitted that mark. Exports now use the same ramp samples, layer cutoff, line weight and defect geometry as the preview. The old SVG raster differed by 49.1% of preview ink; the corrected result differs by 0.61%, primarily from SVG coordinate rounding and rasterization. With grain disabled, the module PNG exactly matches the canvas reference in the three checked views.

Seven actual UI print cases cover HL outline on dark and light backgrounds, filled cluster and age views, plus Smectic layers, defects and both. Each checks 1200 × 1200 dimensions, SVG use, pixel agreement and unchanged recipe. Blank-image controls fail. Temporary pages assembled from the original source fail the same regression for both techniques. Raster film grain was disabled for this comparison because SVG intentionally omits it.

## What the full sweep shows

The shared print path does not have a confirmed general blur defect. Vector artwork is rasterized at the requested print size. Grid fields declare their finite resolution so the shell can avoid unnecessary double filtering. Smooth GPU fields generally use bicubic sampling. The optional finishing blur was off for every export.

For many PDE techniques the default grid is 512, so selecting 256 reduces detail rather than increasing it. It can also change the physical domain, pattern scale or trajectory. The default/Grid 256 pairs are different computed plates, not identical pictures resampled at two sizes. Some 256 controls produce rectangular grids, such as convection's 256 × 144 and film's 256 × 320. Volume-wave's 256 option means a 256³ volume, not a 256² field, so only its default 32³ case was included. No unsupported grid option was injected.

Smoothness in orbitals, solitons, BEC density, Meissner fields, CPPN, and volume-rendered Physarum is largely part of the represented field. A universal sharpening or nearest-neighbor filter would alter their appearance and could create false edges. The audit leaves those renderers unchanged.

Several defaults deserve a separate aesthetic pass:

- **Pearls, Lichtenberg and growth:** dark, thin marks have weak separation from the ground. Stronger ink or line-weight presets would make the geometry easier to read. Pearls is similarly faint in preview and export, so this is a palette/design issue rather than the HL export defect.
- **Phyllotaxis, growth, reuleaux, faraday, rogue and lump:** small central subjects leave large quiet regions. Optional framing presets could improve composition, but automatic recropping could hide the intended domain or alter reproducibility.
- **Nematic and active Model B:** default views have low tonal contrast. Alternative contrast/palette presets may clarify structure without changing the solver.
- **Convection at Grid 256:** the heat-transport status reports “out of range.” Source inspection shows the packed diagnostic clipped. This is not by itself evidence of an unstable field. It should receive a numerical/measurement follow-up rather than cosmetic sharpening.
- **Aubry and Anderson:** the app already reports relaxation not converged for these defaults. Their appearance is not evidence of a converged ground state. Scientific wording and convergence work are separate from this rendering pass.

## Capture limits

Tests used installed Chrome on Apple M1 Pro with ANGLE Metal and float32 support, a 1440 × 1040 viewport at device scale factor 1, and the normal maximum compute mode. Seeds were fixed to each module's declared seed, or `blur-audit` where none was declared. Remote requests were blocked. Exports used the real custom 4 × 4 inch, 300 ppi controls, with normal aspect-fit behavior.

Initial BEC, Potts and rotor snapshots were retaken after their finite warmups completed. BEC reached its 16,000-step warmup; Potts reached 700/700 sweeps; rotor completed its ladder. Dynamic simulations remain snapshots, not convergence certificates or exact equal-time comparisons. The seven focused parity cases are deterministic static fixtures. All 135 preview thumbnails, all 135 export thumbnails and all 38 grid pairs were inspected; representative defects were inspected at full size. Not every pixel of every plate, every preset, or every parameter boundary was reviewed.

The separate local visual-audit deliverable preserves baseline and corrected images; the repository records the method and regression here.

Build consistency, lint, the sharp-sampling regression, and diff whitespace checks pass. The scientific inventory source-file hashes were refreshed after reviewing the scoped changes. A component comparison confirms that only HL and Smectic registrations changed; the ten neighboring registrations, including their function source strings, are unchanged. No scientific status was promoted.
