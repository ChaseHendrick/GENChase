# Figure label placement audit, 2026-09-29

The standalone four-panel vector pulse figure and its previous placement on manuscript page 5 were inspected. Both gating-variable keys occupied the right-hand data panels.

`code/make_figure.py` now uses one shared gating-variable key above all four panels, with reserved figure-level layout space and a slightly taller source canvas. The original m, n and h line styles and colors are preserved. Temperature titles, each row's independent coordinate scale, the resting voltage guide, phase alignment and the displayed finite profile ranges are unchanged.

Reproduce with `python3 code/make_figure.py`. The two printed-leak high-precision shooting-node source files and `data/figure-profile-checks.json` were SHA-256 identical before and after regeneration. The existing short-segment reconstruction, tighter-tolerance checks and wrong-leak negative control were rerun without changes. They remain display checks rather than new interval proof evidence.

The standalone vector PDF was visually checked at twice its native size. Renderer geometry checks found no legend or free-text label intersecting a data panel, and no such artist clipped by the canvas. No proof program or stored certificate was changed. Final manuscript placement is recorded below.

Two consecutive regenerations produced byte-identical vector figure PDFs in the tested environment. The audit preserves before/after previews, artist geometry results and input hashes outside the companion archive.

Final manuscript inspection: 15 pages, with figure placement on page(s) 5. These rebuilt pages were visually checked at normal page scale: keys, panel titles, axes, captions and surrounding prose have clear separation, with no label over plotted data or clipping. All 12 detected fonts, including figure fonts inside PDF forms, are embedded. Build logs contain no overfull box or undefined-reference warnings; extracted PDF text contains no replacement character. Remaining underfull prose warnings do not affect the figure layout.
