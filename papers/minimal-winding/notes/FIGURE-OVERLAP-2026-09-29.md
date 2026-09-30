# Figure overlap audit, 2026-09-29

Moved the circulation, radius, angle and path-length labels below the spiral diagrams. Moved curve and reference-line legends above the minima graph and the Euler/SQG bound values below the alpha-model graph.

Inspected all 3 standalone figure PDFs and 3 SVG companions visually. SVGs were rendered directly in Chrome; PDFs were rendered with PDFium. The rebuilt 43-page manuscript was visually checked on its figure pages 9, 10, 16, including the surrounding captions and page margins.

The geometry audit found 17 free annotation/legend boxes inside the data panels before this change and none afterward. It checked 49 visible text boxes in the final figures: zero mutual text-box overlaps and zero clipped visible text. Hidden ticks on diagrams with their axes turned off are excluded. These are layout checks, not scientific validation.

Before/after SHA-256 digests of every plotted coordinate array, scatter offset and fill path match exactly. The following digests describe plotted arrays, not the PDF files:

| Figure | Plotted-array SHA-256 |
| --- | --- |
| `minimal-winding.pdf` | `d81d3d13364c134448388551750adc4bf8f938294746bce42019935e5462b106` |
| `minimal-winding-paths.pdf` | `568a9f2c3986fbc0def70ccc396282192bc72b2e64cef5336371235c45e2d309` |
| `alpha-winding.pdf` | `c2354d100fb969ba84bd8b51c00dc70be2073e3318fffbe2bc9754e4d8be8db4` |

Reproduce the figures from this companion directory with:

```sh
python3 code/plot_minimal_winding.py
python3 code/plot_alpha_winding.py
```

This display-only regeneration used NumPy 2.4.6 and Matplotlib 3.11.2; the alpha-model illustration also used SciPy 1.17.1. The numerical model, stored inputs, scientific captions, proof programs and certificates were preserved. No new proof or scientific rerun is claimed. Standard Matplotlib text bounds and visual inspection cannot guarantee every downstream reader or typesetter will preserve the same layout.
