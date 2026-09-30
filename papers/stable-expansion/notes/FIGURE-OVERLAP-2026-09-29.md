# Figure overlap audit, 2026-09-29

Replaced the two legends inside the graphs with one shared legend below both panels. Added enough right margin to keep the final growth-factor tick fully visible.

Inspected all 1 standalone figure PDFs and 1 SVG companions visually. SVGs were rendered directly in Chrome; PDFs were rendered with PDFium. The rebuilt 21-page manuscript was visually checked on its figure pages 12, including the surrounding captions and page margins.

The geometry audit found 2 free annotation/legend boxes inside the data panels before this change and none afterward. It checked 21 visible text boxes in the final figures: zero mutual text-box overlaps and zero clipped visible text. Hidden ticks on diagrams with their axes turned off are excluded. These are layout checks, not scientific validation.

Before/after SHA-256 digests of every plotted coordinate array, scatter offset and fill path match exactly. The following digests describe plotted arrays, not the PDF files:

| Figure | Plotted-array SHA-256 |
| --- | --- |
| `stable-expansion-convergence.pdf` | `5bf8655b09cbcfcf351ad34671575a4b4304d66048a755ef4998059d7867af39` |

Reproduce the figures from this companion directory with:

```sh
python3 code/plot_stable_expansion.py
```

This display-only regeneration used NumPy 2.4.6 and Matplotlib 3.11.2; the alpha-model illustration also used SciPy 1.17.1. The numerical model, stored inputs, scientific captions, proof programs and certificates were preserved. No new proof or scientific rerun is claimed. Standard Matplotlib text bounds and visual inspection cannot guarantee every downstream reader or typesetter will preserve the same layout.
