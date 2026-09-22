# Sending a plate to a print shop

Choose the finished sheet dimensions and resolution, edit the caption if wanted,
and select **Export PNG** to render the sheet. The export dialog then offers:

| Format | What it contains | Typical use |
| --- | --- | --- |
| Print PDF | One page at the chosen physical size, losslessly stored RGB pixels and an embedded sRGB profile | A shop accepting color-managed RGB PDFs |
| Print TIFF | Lossless 8-bit RGB, embedded sRGB profile and separate horizontal/vertical resolution tags | Image-based fine-art/photo printing and prepress editing |
| PNG | The rendered pixels, including any caption | General image delivery; tell the shop the intended dimensions |
| SVG, when available | The technique's actual vector output | Vector printing; the shared caption is in the raster formats |

PDF wraps the rendered pixels. It does not turn a field simulation into vectors or
add detail beyond the simulation's grid. PDF/TIFF conversion currently supports
48 million pixels; larger PNG exports retain the existing device limits. TIFF is
uncompressed in the browser and can be large. Transparent source pixels are flattened
onto white when converting to PDF/TIFF.

## Bleed and cutting marks

**PDF finishing** offers bleed in millimeters and optional cutting marks. Bleed is
extra artwork outside the finished cut. Use the amount specified by your printer;
3 mm and 1/8 inch (3.175 mm) are examples, not a universal requirement. The PDF
records separate trim, bleed and full-page boxes. Marks sit outside the bleed.

Bleed slightly enlarges the rendered sheet to cover the extra area without stretching
it, so the trim view crops a little of the outer image. Review the PDF, especially
if captions sit near an edge. These options apply to PDF; TIFF retains the original
sheet size. The bleed setting does not change the scientific recipe.

## When the shop asks for CMYK or PDF/X

CMYK describes printing inks. PDF/X is a family of production PDF standards.
A source sRGB profile describes the artwork's colors; an output profile describes
how the printer, ink and paper reproduce them. Those are different jobs. The studio
does not guess an output profile or relabel RGB values as CMYK.

The optional Python prepress tool converts a studio TIFF to CMYK TIFF, or uses
Ghostscript to convert a studio PDF to **PDF/X-3:2002** with CMYK output. Ask the
shop for its **CMYK output ICC profile** and preferred PDF/X version. A shop requiring
PDF/X-1a or PDF/X-4 needs its own conversion/preflight workflow; this tool targets X-3.

Install the optional dependencies in an environment you control:

```sh
python3 -m venv .venv-prepress
. .venv-prepress/bin/activate
python -m pip install -r tools/requirements-prepress.txt
```

On Windows, activate `.venv-prepress\Scripts\activate` instead. Install Ghostscript
separately for PDF/X and ensure `gs` is on PATH, or pass `--ghostscript` with its
executable path (`gswin64c.exe` on Windows).

```sh
python tools/prepress.py plate.tif plate-cmyk.tif --mode cmyk-tiff --profile printer-paper.icc
python tools/prepress.py plate.pdf plate-press.pdf --mode pdfx --profile printer-paper.icc --condition "Printer and paper name"
```

The tool preserves the input, refuses to overwrite an existing output, rejects RGB
profiles as printing profiles, and reports input/profile hashes. PDF/X checks confirm
the requested identifier, embedded output profile and unchanged page/trim/bleed boxes.
PDF/X pages are limited to 200 inches including marks and bleed. Conversion does not
add resolution. These checks are not a full ISO conformance audit or a physical proof.
Have the shop preflight the final PDF and approve a proof before a production run.

## Verification and sources

`tools/print-formats-check.js` creates deterministic test files. Independent Pillow
and pypdf readers check their pixels, size tags, profile and page boxes. CI also runs
CMYK TIFF and Ghostscript PDF/X conversion using a test profile. That test profile
is not a recommended printing condition for your work.

- [ICC sRGB profiles](https://registry.color.org/rgb-registry/srgbprofiles) and [profile distribution terms](https://registry.color.org/profile-library/).
- [Library of Congress TIFF tag reference](https://www.loc.gov/preservation/digital/formats/content/tiff_tags.shtml).
- [Adobe color profiles and printing conditions](https://helpx.adobe.com/acrobat/using/color-profiles.html).
- [Ghostscript PDF/X production documentation](https://ghostscript.readthedocs.io/en/latest/VectorDevices.html#creating-a-pdf-x-document).

## Saved printer presets and print checks

Open **Edit caption** to save a named printer preset. It stores the current physical
sheet width/height, resolution, caption parts/position, bleed and cutting-mark choice.
Applying it uses a fixed sheet size across techniques. Presets stay on this device;
they do not store the artwork or a printer ICC profile. Names are unique, with up to
20 saved presets. Delete a preset to replace it with an updated one.

Before download links become available, the export dialog reports effective file
ppi, device clamping, declared simulation grid density and the smallest caption text.
It flags low resolution, coarse simulation detail and text below 6 pt. The 150/300 ppi
thresholds are close-viewing guidelines, not shop acceptance rules. The report does
not measure optical sharpness, color reproduction or scientific accuracy.

**Advanced print tools** stays selected across sessions on this device. It reveals
PDF finishing controls, prepress guidance and **Download print-job JSON**. This JSON
records the recipe, print specification, caption settings, quality report and any
structured measured check. It is an audit aid, not a checkpoint of an evolving field.
