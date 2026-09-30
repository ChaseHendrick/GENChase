# Figure label placement audit, 2026-09-29

All three standalone vector figures were inspected, along with the previous manuscript figure pages 7, 10 and 21. The branch legend and Hopf/current annotations occupied the data panel; the orbit section labels sat near the top of the phase portrait; the normal-form legend occupied the period figure's right panel.

`code/hh_make_figures.py` now places every key outside the data panels. The branch's open and filled circles distinguish H1 and H2 in an external key, while both remain circles as specified in the caption. The two section positions retain their exact dotted lines and are identified in the external orbit key. The period figure's normal-form key sits below both panels. Source canvases have additional height so the keys do not reduce data legibility or collide with panel titles.

Reproduce with `python3 code/hh_make_figures.py`. The ordinary numerical orbit integrations, all current/voltage values, certified period pieces and Hopf values are unchanged. The two stored report files were SHA-256 identical before and after regeneration. This is a presentation change, not a new proof or recomputation of certificates.

Rendered standalone PDFs were visually checked at twice their native size. Renderer geometry checks found no legend or free-text label intersecting a data panel, and no such artist clipped by the canvas. The earlier same-day note records the previous layout; this pass moves the section labels outside the axes at the owner's request. Final manuscript placement is recorded below.

Two consecutive regenerations produced byte-identical vector figure PDFs in the tested environment. The audit preserves before/after previews, artist geometry results and input hashes outside the companion archive.

Final manuscript inspection: 30 pages, with figure placement on page(s) 7, 10, 21. These rebuilt pages were visually checked at normal page scale: keys, panel titles, axes, captions and surrounding prose have clear separation, with no label over plotted data or clipping. All 42 detected fonts, including figure fonts inside PDF forms, are embedded. Build logs contain no overfull box or undefined-reference warnings; extracted PDF text contains no replacement character. Remaining underfull prose warnings do not affect the figure layout.
