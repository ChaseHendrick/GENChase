# Figure label placement audit, 2026-09-29

The standalone vector pulse figure, raster preview and previous manuscript placement on page 30 were inspected. The profile-field and proof-block key occupied the left data panel. The phase-plane key was outside the data but used an axis-relative margin that was harder to maintain.

`code/figure.py` now places the profile-field/block key above both panels and the phase-plane key below both panels, using figure-level placement with reserved layout space. The source canvas has additional height for these keys. All three line styles, nullcline and rest marker remain unchanged, as does the shaded proof-block range.

Reproduce with `python3 code/figure.py`. All 523 displayed samples still come from the unchanged `data/orbit_hp.json`, whose SHA-256 hash was identical before and after regeneration. Both `paper/figures/pulse-profile.pdf` and `data/pulse_profile.png` were regenerated. No solver or certificate program was run.

The standalone vector PDF was visually checked at twice its native size. Renderer geometry checks for both PDF and raster outputs found no legend or free-text label intersecting a data panel, and no such artist clipped by the canvas. This is a layout correction only. Final manuscript placement is recorded below.

Two consecutive regenerations produced byte-identical vector figure PDFs in the tested environment. The audit preserves before/after previews, artist geometry results and input hashes outside the companion archive.

Final manuscript inspection: 39 pages, with figure placement on page(s) 30. These rebuilt pages were visually checked at normal page scale: keys, panel titles, axes, captions and surrounding prose have clear separation, with no label over plotted data or clipping. All 33 detected fonts, including figure fonts inside PDF forms, are embedded. Build logs contain no overfull box or undefined-reference warnings; extracted PDF text contains no replacement character. Remaining underfull prose warnings do not affect the figure layout.
