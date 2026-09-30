# Figure label placement audit, 2026-09-29

The standalone section-enclosure figure and its previous placement on manuscript page 7 were inspected. The selected h-set names and the arrow identifying the central cluster occupied the left data panel; the candidate-piece key occupied the right panel.

`code/make_figures.py` now identifies N and M7 through M11 with distinct point markers and an external key above both panels. The star still marks N, exactly as the caption states. No marker is connected to another marker, including in the key. The two enclosure entries share that external key and retain their original colors, fill, solid/dashed edges and exact rectangular endpoints. The source canvas has additional height for the key.

Reproduce with `python3 code/make_figures.py`. The 23 stored centres, all coordinate transforms, rectangle bounds, source checks and scientific caption are unchanged. `configs/horseshoe_E0.cfg` and `data/E0.txt` were SHA-256 identical before and after regeneration. The regenerated source manifest records the revised generator hash.

The standalone vector PDF was visually checked at twice its native size. Renderer geometry checks found no legend or free-text label intersecting a data panel, and no such artist clipped by the canvas. These checks concern presentation only, not a new trajectory, transversality computation or proof. Final manuscript placement is recorded below.

Two consecutive regenerations produced byte-identical vector figure PDFs in the tested environment. The audit preserves before/after previews, artist geometry results and input hashes outside the companion archive.

Final manuscript inspection: 24 pages, with figure placement on page(s) 7. These rebuilt pages were visually checked at normal page scale: keys, panel titles, axes, captions and surrounding prose have clear separation, with no label over plotted data or clipping. All 33 detected fonts, including figure fonts inside PDF forms, are embedded. Build logs contain no overfull box or undefined-reference warnings; extracted PDF text contains no replacement character. Remaining underfull prose warnings do not affect the figure layout.
