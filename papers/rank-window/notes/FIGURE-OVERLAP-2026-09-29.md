# Figure overlap audit, 2026-09-29

Moved every legend below its panel. Moved the bound and shaded-rank descriptions into legends or outer note rows. Increased Figure 3 footer space to separate the last spectrum legend entry from the shaded-rank note.

Inspected all 3 standalone figure PDFs and 0 SVG companions visually. SVGs were rendered directly in Chrome; PDFs were rendered with PDFium. The rebuilt 17-page manuscript was visually checked on its figure pages 9, 11, 12, including the surrounding captions and page margins.

The geometry audit found 9 free annotation/legend boxes inside the data panels before this change and none afterward. It checked 126 visible text boxes in the final figures: zero mutual text-box overlaps and zero clipped visible text. Hidden ticks on diagrams with their axes turned off are excluded. These are layout checks, not scientific validation.

Before/after SHA-256 digests of every plotted coordinate array, scatter offset and fill path match exactly. The following digests describe plotted arrays, not the PDF files:

| Figure | Plotted-array SHA-256 |
| --- | --- |
| `fig1.pdf` | `4e82787506175997241a52e6d83196ded630fbbf1cb0b113defedf7575a0e233` |
| `fig2.pdf` | `ed0f01e9e84cc6dd3c0027d1615f6d8c0db9e48cafcafc06f6302d44f820b084` |
| `fig3.pdf` | `c95d57594d036907c860bf298074fad9f419cf7ae6fc984ec030c164fa2a2d23` |

Reproduce the figures from this companion directory with:

```sh
python3 code/make_figures.py
```

This display-only regeneration used NumPy 2.4.6 and Matplotlib 3.11.2; the alpha-model illustration also used SciPy 1.17.1. The numerical model, stored inputs, scientific captions, proof programs and certificates were preserved. No new proof or scientific rerun is claimed. Standard Matplotlib text bounds and visual inspection cannot guarantee every downstream reader or typesetter will preserve the same layout.
