# Eight-Paper Figure Layout Audit

Checked September 29, 2026. All eight preprints were audited for figure labels, numerical annotations,
legends, axis ticks, titles and captions overlapping or clipping. The owner's convention is to keep
free text and legends outside the plotted data, with reserved space for their placement.

All **14 figure PDFs and 5 SVG companions** were regenerated from their plotting sources. Every
manuscript PDF was rebuilt using the registered source and `tools/paper-build.sh`, with Tectonic
0.17.0 and the existing Pandoc runtime for the Markdown manuscript. Each final figure page was
visually inspected at manuscript scale. No remaining annotation or legend overlays the data panels;
the inspected titles, ticks and captions remain clear and inside the page margins.

| Paper | Figure PDFs | SVGs | Manuscript pages | Inspected figure pages |
| :--- | ---: | ---: | ---: | :--- |
| [Minimal winding](../papers/minimal-winding/notes/FIGURE-OVERLAP-2026-09-29.md) | 3 | 3 | 43 | 9, 10, 16 |
| [Collapse without rotation](../papers/collapse-without-rotation/notes/FIGURE-OVERLAP-2026-09-29.md) | 1 | 1 | 25 | 15 |
| [Stable expansion](../papers/stable-expansion/notes/FIGURE-OVERLAP-2026-09-29.md) | 1 | 1 | 21 | 12 |
| [Rank window](../papers/rank-window/notes/FIGURE-OVERLAP-2026-09-29.md) | 3 | 0 | 17 | 9, 11, 12 |
| [HH dynamics](../papers/hh-dynamics/notes/FIGURE-OVERLAP-2026-09-29.md) | 3 | 0 | 30 | 7, 10, 21 |
| [Double pendulum](../papers/double-pendulum/notes/FIGURE-OVERLAP-2026-09-29.md) | 1 | 0 | 24 | 7 |
| [Neural-field pulse](../papers/nf-pulse/notes/FIGURE-OVERLAP-2026-09-29.md) | 1 | 0 | 39 | 30 |
| [HH pulse](../papers/hh-pulse/notes/FIGURE-OVERLAP-2026-09-29.md) | 1 | 0 | 15 | 5 |

The changes reserve outer legend rows and annotation space rather than positioning text on top of
curves. Selected point labels in the double-pendulum figure now use distinct markers with an outer
key. Reference lines, highlighted regions, numerical values and their meanings are retained. Extra
margins also address two edge-tick clipping risks and a rank-window footer touching a legend.

The four vortex/rank papers have matching before/after plotted-array hashes for all eight figures.
The other four papers retain matching numerical input hashes and unchanged display-check results.
Their six figure PDFs are byte-identical on consecutive regeneration. The changed figure manifests
record the updated plotting-source hashes; numerical evidence inputs are unchanged. Manuscript
source text, scientific captions, proof programs and certificates were not modified.

Validation completed:

- Each paper passed `node tools/paper-check.js --paper <id>`, including metadata consistency and
  clean companion staging.
- Every final figure PDF was visually inspected, and all five SVGs were also rendered directly.
  Artist-geometry checks found no remaining free annotation or legend intersecting a data panel.
- All manuscript fonts detected by the PDF audit are embedded. No replacement characters,
  undefined-reference warnings or overfull boxes were found. Existing underfull prose warnings
  and the HH-pulse build's encoding/temp-path warnings remain recorded in the paper-local notes;
  they produced no observed clipping or missing glyphs.
- `git diff --check` passed.

This is a layout and publication-file audit. It does not revalidate the mathematical results or
rerun their proof programs. Updated PDFs are present in this checkout. No companion release or
Zenodo archive was changed by this audit; a future new release must retain the manuscript PDF in
its ZIP and pass the existing archive checks. The figure convention is now part of
[the publishing quality bar](PUBLISHING-PAPERS.md).
