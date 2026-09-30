# Figure overlap audit, 2026-09-29

Moved the family legend above both panels and the threshold, reference-line and fitted-limit notes below them. Added outer panel titles and enough right margin for the final tick.

Inspected all 1 standalone figure PDFs and 1 SVG companions visually. SVGs were rendered directly in Chrome; PDFs were rendered with PDFium. The rebuilt 25-page manuscript was visually checked on its figure pages 15, including the surrounding captions and page margins.

The geometry audit found 6 free annotation/legend boxes inside the data panels before this change and none afterward. It checked 39 visible text boxes in the final figures: zero mutual text-box overlaps and zero clipped visible text. Hidden ticks on diagrams with their axes turned off are excluded. These are layout checks, not scientific validation.

Before/after SHA-256 digests of every plotted coordinate array, scatter offset and fill path match exactly. The following digests describe plotted arrays, not the PDF files:

| Figure | Plotted-array SHA-256 |
| --- | --- |
| `phase-diagram.pdf` | `6912d027b77a72a03db970f643e872f1f8166e64e31dd6743ad9e89a69cc7568` |

Reproduce the figures from this companion directory with:

```sh
python3 code/plot_phase_diagram.py
```

This display-only regeneration used NumPy 2.4.6 and Matplotlib 3.11.2; the alpha-model illustration also used SciPy 1.17.1. The numerical model, stored inputs, scientific captions, proof programs and certificates were preserved. No new proof or scientific rerun is claimed. Standard Matplotlib text bounds and visual inspection cannot guarantee every downstream reader or typesetter will preserve the same layout.
