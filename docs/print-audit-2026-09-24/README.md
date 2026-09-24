# Print quality audit, 2026-09-24 (working notes)

These are working notes, not a changelog. The audit was stopped before its verification stage finished, at the owner's request, to put the agents on the minimal-winding research. Nothing here has been applied to `src/`. The prototype patches in `patches/` were written and measured in throwaway worktrees against `main` at 6e8ff9e; they are starting points, not reviewed changes, and any module edit also needs its validation record re-hashed (`node tools/science.js`).

## 1. Sharpness sweep: `tools/sharp.js` at 8 in and 300 ppi, all 130 tabs

Raw results: [`sharpness-sweep-8in-300ppi.jsonl`](sharpness-sweep-8in-300ppi.jsonl), one line per tab. Verdicts: 51 sharp, 17 ok, 59 SOFT, 3 timed out (physarum3d, fractal, pendulum). These replace the stale 62-tab counts in AGENTS.md ("34 sharp, 11 borderline and 15 soft") once the next point is fixed, because the tool itself has a blind spot.

**Blind spot in `sharp.js`.** It samples every second pixel starting from an even offset (`x += 2`, `y += 2`). A plate drawn by nearest-neighbour enlargement of a coarse buffer, with an even block size, never has a block edge between an even pixel and the next one, so its one-pixel difference is exactly 0 and the tool reports edge 0 and acuity 0 ("featureless"). Twelve tabs show that signature (d1 = 0, d2 > 0): timecrystal, skin, rogue, fput, soliton, ssh, breather, tennis, airy, kitaev, loschmidt, thouless. Fix: sample both parities, or every pixel. The banding and vector lanes found the same problem independently (findings `nearest-mosaic-continuous-fields` and `V12-sharp-js-blind-spots` below).

**Mosaic prints.** Those twelve tabs export by drawing a W × H field buffer (for example 160 × 200) to the print size with `imageSmoothingEnabled = false`, so the sheet is a grid of flat squares (12 px at 8 in, 300 ppi). For analytic fields (rogue, airy, soliton, breather, and others to classify) the honest fix is to evaluate the field at print resolution in `exportPNG`. For true lattices, where each cell is a physical site (kitaev, ssh, the time-crystal chain), the squares are honest; the better print is vector rectangles through `exportSVG`, per AGENTS.md.


<details><summary>Per-tab sweep results (edge, acuity, verdict, grid)</summary>

| tab | edge | acuity | verdict | field grid | size |
|---|---|---|---|---|---|
| aharonov | 0.23 | 0.062 | SOFT | 160x160 | 2400x2400 |
| airy | 0 | 0 | SOFT | 192x240 | 1920x2400 |
| anderson | 0.46 | 0.062 | SOFT | 96x96 | 2400x2400 |
| apollonian | 0 | 0.076 | SOFT | 192x192 | 2400x2400 |
| aubry | 0.42 | 0.066 | SOFT | 128x160 | 1920x2400 |
| breather | 0 | 0 | SOFT | 160x200 | 1920x2400 |
| causticsea | 0.22 | 0.074 | SOFT | 128x128 | 2400x2400 |
| cgl | 0.12 | 0.109 | SOFT | 192x192 | 2400x2400 |
| convection | 0.13 | 0.373 | SOFT | 192x108 | 2400x1350 |
| cppn | 0.05 | 0.064 | SOFT |  | 2400x2400 |
| dendrite | 0.14 | 0.14 | SOFT |  | 2400x2400 |
| devil | 0.07 | 0.064 | SOFT | 160x160 | 2400x2400 |
| exceptional | 0.08 | 0.061 | SOFT | 160x160 | 2400x2400 |
| faraday | 0.02 | 0.065 | SOFT | 160x160 | 2400x2400 |
| film | 0.06 | 0.065 | SOFT | 192x240 | 1920x2400 |
| fluid | 0.07 | 0.069 | SOFT |  | 2400x2400 |
| fput | 0 | 0 | SOFT | 96x120 | 1920x2400 |
| growdomain | 0.36 | 0.074 | SOFT | 192x600 | 1920x2400 |
| hasimoto | 0 | 0.062 | SOFT |  | 2400x2400 |
| hodgkin-huxley | 0.24 | 0.07 | SOFT | 1001x64 | 2400x1600 |
| kitaev | 0 | 0 | SOFT | 96x120 | 1920x2400 |
| klein | 0.15 | 0.067 | SOFT | 160x160 | 2400x2400 |
| kp | 0.07 | 0.066 | SOFT |  | 2400x2400 |
| lens | 0.47 | 0.081 | SOFT | 192x192 | 2400x2400 |
| life | 0.12 | 0.071 | SOFT |  | 2400x2400 |
| loschmidt | 0 | 0 | SOFT | 160x200 | 1920x2400 |
| lump | 0.07 | 0.068 | SOFT |  | 2400x2400 |
| maxwell | 0.17 | 0.063 | SOFT | 512x512 | 2400x2400 |
| meissner | 0.07 | 0.061 | SOFT | 160x160 | 2400x2400 |
| nonreciprocal | 0.1 | 0.063 | SOFT | 256x256 | 2400x2400 |
| orbitals | 0.02 | 0.071 | SOFT |  | 2400x2400 |
| parallelogram-lock | 0 | 0.062 | SOFT |  | 2400x2400 |
| peakon | 0.08 | 0.069 | SOFT |  | 2400x2400 |
| phyllotaxis | 0.06 | 0.073 | SOFT |  | 2400x2400 |
| physarum | 0.36 | 0.095 | SOFT |  | 2400x2400 |
| purcell | 0.14 | 0.063 | SOFT | 160x160 | 2400x2400 |
| quincunx-lock | 0 | 0.063 | SOFT |  | 2400x2400 |
| reaction | 0.19 | 0.067 | SOFT |  | 2400x2400 |
| reuleaux | 0 | 0.07 | SOFT | 192x192 | 2400x2400 |
| rogue | 0 | 0 | SOFT | 192x240 | 1920x2400 |
| scars | 0.5 | 0.057 | SOFT |  | 2400x2400 |
| schrodinger | 0.1 | 0.17 | SOFT | 192x192 | 2400x2400 |
| shallow | 0.05 | 0.066 | SOFT | 128x128 | 2400x2400 |
| skin | 0 | 0 | SOFT | 96x120 | 1920x2400 |
| skyrmion | 0.08 | 0.064 | SOFT | 192x192 | 2400x2400 |
| soliton | 0 | 0 | SOFT | 160x200 | 1920x2400 |
| ssh | 0 | 0 | SOFT | 96x120 | 1920x2400 |
| stealth | 0.2 | 0.064 | SOFT | 256x256 | 2400x2400 |
| swarm | 0.05 | 0.148 | SOFT |  | 2400x2400 |
| swift | 0.35 | 0.094 | SOFT | 512x512 | 2400x2400 |
| tennis | 0 | 0 | SOFT | 160x200 | 1920x2400 |
| thouless | 0 | 0 | SOFT | 160x200 | 1920x2400 |
| three-vortex-bound | 0 | 0.063 | SOFT |  | 2400x2400 |
| timecrystal | 0 | 0 | SOFT | 160x200 | 1920x2400 |
| tonertu | 0.17 | 0.092 | SOFT | 512x512 | 2400x2400 |
| track | 0.08 | 0.064 | SOFT |  | 2400x2400 |
| veselago | 0 | 0.072 | SOFT | 192x192 | 2400x2400 |
| volume-wave | 0.04 | 0.062 | SOFT | 32x32 | 2400x2400 |
| web | 0.18 | 0.075 | SOFT | 192x192 | 2400x2400 |
| cahn | 0.41 | 0.12 | ok | 512x512 | 2400x2400 |
| cortex | 0.54 | 0.091 | ok | 512x512 | 2400x2400 |
| crapper | 0.76 | 0.136 | ok |  | 2400x1350 |
| cyclic | 0.5 | 0.146 | ok | 512x512 | 2400x2400 |
| excitable | 0.27 | 0.104 | ok | 512x512 | 2400x2400 |
| gyroid | 0.51 | 0.068 | ok | 192x192 | 2400x2400 |
| kakeya | 0.77 | 0.074 | ok | 192x192 | 2400x2400 |
| knotlight | 0.51 | 0.074 | ok | 192x192 | 2400x2400 |
| lp | 0.5 | 0.063 | ok |  | 2400x2400 |
| ohta | 0.42 | 0.13 | ok | 512x512 | 2400x2400 |
| photon | 0.46 | 0.146 | ok |  | 2400x2400 |
| plasma | 0.39 | 0.102 | ok | 256x256 | 2400x2400 |
| potts | 0.74 | 0.11 | ok |  | 2400x2400 |
| snowflake | 0.47 | 0.146 | ok |  | 2400x2400 |
| talbot | 0.33 | 0.123 | ok |  | 2087x2400 |
| vegetation | 0.52 | 0.132 | ok | 512x512 | 2400x2400 |
| weierstrass | 0.65 | 0.077 | ok | 192x192 | 2400x2400 |
| amb | 1.41 | 0.508 | sharp | 512x512 | 2400x2400 |
| arago | 1.96 | 0.065 | sharp | 160x160 | 2400x2400 |
| attractors | 1.4 | 0.401 | sharp |  | 2400x2400 |
| aztec | 2.34 | 0.25 | sharp |  | 2400x2400 |
| bec | 0.26 | 0.607 | sharp | 512x512 | 2400x2400 |
| boy | 1.43 | 0.075 | sharp | 192x192 | 2400x2400 |
| caustics | 0.54 | 0.152 | sharp |  | 2400x2400 |
| chemotaxis | 0.91 | 0.118 | sharp | 512x512 | 2400x2400 |
| chimera | 1.81 | 0.199 | sharp |  | 1920x2400 |
| chirikov | 1.3 | 0.245 | sharp |  | 2400x2400 |
| chladni | 0.96 | 0.113 | sharp |  | 2400x2400 |
| cloak | 1.66 | 0.074 | sharp | 192x192 | 2400x2400 |
| cyclicca | 2.15 | 0.08 | sharp |  | 2400x2400 |
| darkroom | 1.27 | 0.075 | sharp | 192x192 | 2400x2400 |
| direct-gravity | 0.82 | 0.08 | sharp |  | 2400x2400 |
| double-triangle-bound | 1.2 | 0.086 | sharp |  | 2400x2400 |
| eight | 1.06 | 0.062 | sharp |  | 2400x2400 |
| flow | 1.42 | 0.112 | sharp |  | 1920x2400 |
| gerstner | 1.85 | 0.174 | sharp |  | 2400x1350 |
| grains | 1.39 | 0.089 | sharp |  | 2400x2400 |
| growth | 0.22 | 0.287 | sharp |  | 1920x2400 |
| hl | 2.46 | 0.269 | sharp |  | 2400x2400 |
| hofstadter | 1.61 | 0.175 | sharp |  | 2400x2400 |
| holomorphic | 2.48 | 0.439 | sharp |  | 2400x2400 |
| hopf | 0.84 | 0.069 | sharp | 192x192 | 2400x2400 |
| hyperbolic | 1.08 | 0.38 | sharp |  | 2400x2400 |
| ising | 1.02 | 0.082 | sharp |  | 2400x2400 |
| kpz | 2.49 | 0.245 | sharp |  | 2400x2400 |
| ks | 1.26 | 0.094 | sharp | 512x512 | 2400x2400 |
| landscape | 1.05 | 0.073 | sharp |  | 2400x2400 |
| lichtenberg | 1.54 | 0.31 | sharp |  | 2400x2400 |
| liesegang | 1.12 | 0.214 | sharp | 384x384 | 2400x2400 |
| lozenge | 2.08 | 0.179 | sharp |  | 2078x2400 |
| molecular | 0.93 | 0.065 | sharp |  | 2400x2400 |
| nematic | 2.34 | 0.402 | sharp |  | 2400x2400 |
| neural-mass | 3.1 | 0.264 | sharp |  | 2400x2400 |
| pearls | 4.11 | 0.474 | sharp |  | 2400x2400 |
| percolation | 2.09 | 0.103 | sharp |  | 2400x2400 |
| pfc | 1.34 | 0.186 | sharp | 512x512 | 2400x2400 |
| rmt | 2.87 | 0.275 | sharp |  | 2400x2400 |
| rotor | 1.9 | 0.087 | sharp | 346x173 | 2400x1200 |
| sandpile | 2.16 | 0.089 | sharp |  | 2400x2400 |
| sle | 2.08 | 0.19 | sharp |  | 2400x1920 |
| smectic | 3.05 | 0.251 | sharp |  | 2400x2400 |
| spinice | 1.94 | 0.063 | sharp | 96x96 | 2400x2400 |
| surfaces | 2.47 | 0.218 | sharp |  | 2400x2400 |
| tilings | 1.98 | 0.115 | sharp |  | 2400x2400 |
| turing | 0.93 | 0.134 | sharp | 512x512 | 2400x2400 |
| ust | 2.67 | 0.271 | sharp |  | 1920x2400 |
| vortex | 0.9 | 0.063 | sharp | 128x128 | 2400x2400 |
| xy | 0.55 | 0.153 | sharp |  | 2400x2400 |
| fractal |  |  | timeout |  |  |
| pendulum |  |  | timeout |  |  |
| physarum3d |  |  | timeout |  |  |

</details>

## 2. Audit findings by lane

Each lane drove the real export path, measured, and where possible prototyped a fix. Severity and effort are the auditors' own. Evidence paths that mention `scratchpad/` referred to temporary files that are gone; the measurements are summarized in the text.

### Color and file metadata

#### CM-1 (major, defect, effort small)

- **Claim.** The main Download PNG has no physical size and no color tag. It has no pHYs, sRGB, iCCP, gAMA, cHRM or text chunks, only IHDR, IDAT and IEND.
- **Evidence.** I drove the real export modal (scratchpad/print/color-metadata/grab.js) for cahn at 8 in and 300 ppi, then parsed the chunks with color-metadata/metainspect.py. The PNG is 2400x2400, colortype 6, and has no ancillary chunks. Pillow reports Image.info == {} (no dpi, no icc_profile). The PNGs from tilings (with caption), physarum and attractors are the same. Cause: engine.js:2699 stores the raw canvas.toBlob output as lastBlob, and Chromium's encoder writes none of these chunks. docs/PRINTING.md:10 works around this by telling users to 'tell the shop the intended dimensions'.
- **Impact.** Software that opens the PNG has no physical size to use, so it falls back to its own default. 72 ppi is the usual one; I did not measure that here. At 72 ppi a 2400 px, 8 in sheet opens as 33.3 in, and upload tools may flag it as 72 dpi, low resolution. With no color tag, an app whose RGB working space is not sRGB (for example a prepress preset using Adobe RGB) may reinterpret the values and print them more saturated. The TIFF and PDF already embed sRGB, so the PNG is the odd one out.
- **Fix.** Prototyped as GenChasePrintFormats.pngTag (print-formats.js), called once after composeSheet/fitPrintSheet in doExport. It inserts three things after IHDR: pHYs per axis (pw/wIn and ph/hIn, so a clamped ppi is still right), iCCP with the sRGB2014 profile the TIFF and PDF already embed, and tEXt (see CM-8). It reads only the first 64 KB and passes the pixels through with Blob.slice, so it adds no copy. Verified end to end on cahn, tilings, lichtenberg and fluid: pHYs 11811 px/m reads back as 300.00 ppi (Pillow 299.9994), and iCCP holds the 3024-byte sRGB2014 profile. Chromium decodes the tagged PNG to identical pixels (0 of 4,194,304 bytes differ, for both the iCCP and the sRGB-chunk variants), so the PDF/TIFF path that re-decodes the PNG stays lossless: TIFF == PNG and PDF image == PNG, checked with Pillow and pypdf. tools/export.js tilings passes 12 of 12 sheets on the prototype build. lint, build --check and engine-api-check also pass. Patch: scratchpad/print/color-metadata/prototype.patch.
- **Risk.** Pixels and recipes are unchanged. Each file gains about 2.5 KB. pHYs is stored per metre, so 300 ppi is written as 11811 px/m and reads back as 299.9994; that is a limit of the format. It is untested on clamped 40+ in sheets, though the formula uses the effective pw/wIn.
- **Tabs.** all

#### CM-2 (major, improvement, effort small)

- **Claim.** Most tabs default to a dark ground darker than a coated-offset press can print, and nothing in the UI warns about it or offers a preview. On real sheets this is the main print-color risk, larger than out-of-gamut hues.
- **Evidence.** 81 of 130 tabs default to one of six dark palettes: ember 25, thermal 17, nightshade 14, glacier 12, xray 9, bioluminescent 4. Their grounds measure L* 0 to 9.4. The FOGRA39L coated press black is L* 9.6. That profile came from texlive colorprofiles (prtr, CMYK), and I used it through liblcms2 (ctypes, double precision, relative colorimetric). The CMM was validated first: the Sharma dE2000 pairs come out exact, and the in-gamut control median is 0.21 with p95 1.04. It is only a proxy for one press condition. Share of sheet area darker than press black (color-metadata/plategamut.py, every 4th pixel of the 8 in, 300 ppi sheet): lichtenberg 98.5%, attractors 77.2%, fluid 70.0%, bec 66.7%, physarum 45.1%, tilings 0.7%, cahn 0%. Shadow detail: the faintest 1/8 of the xray density ramp spans 11.7 L* on screen, 2.9 L* on press without black-point compensation and 6.8 L* with it. The lichtenberg ember ground separates at TAC 307% over 98.5% of the sheet. The UI only says it is 'not a proof of ... color accuracy' (engine.js:2551). grep finds no gamut or soft-proof feature.
- **Impact.** On paper the faint trails of density plates (attractors, physarum, fluid) close up into a flat black, and the black itself is noticeably lighter than on screen. On matte or uncoated stock the black is lighter still. That is general prepress knowledge; I did not measure it. An offset print of lichtenberg is close to a full-sheet flood near 300% ink.
- **Fix.** Add one line to printQualityReport. Take the final sheet at a stride, which is already on a canvas; compute L* analytically, so no CMM is needed; and report the share of the sheet darker than L* 10, labelled as the coated-offset press black (FOGRA39), with a note that matte and uncoated papers print a lighter black. Optionally add a 'simulate paper black' preview toggle using Y' = Yk + Y(1 - Yk), which approximates black-point compensation. It would change the preview only, never the file.
- **Risk.** No recipe or pixel change, and it costs milliseconds. It is a proxy: glossy inkjet can print darker blacks, so the wording must name the reference condition and not claim a proof.
- **Tabs.** 81 dark-default tabs (ember, thermal, nightshade, glacier, xray, bioluminescent), plus any tab switched to those palettes

#### CM-3 (minor, defect, effort small)

- **Claim.** The downloaded SVG says it is 2400 x 2400 CSS pixels, not 8 x 8 inches.
- **Evidence.** I exported tilings at 8 in and 300 ppi from the clean build. The SVG root is <svg viewBox="0 0 2400 2400" width="2400" height="2400">. Cause: engine.js:166-168 (svgDoc) and 2523 (fitPrintSVG) write unitless px, and 2696 passes that through to the download.
- **Impact.** A vector editor opens the plate at the pixel count divided by its px-per-inch: 25 in at 96 px/in, or 33.3 in at 72. Vectors rescale without loss, but the sheet size the user chose is lost and has to be set again by hand.
- **Fix.** Prototyped svgPhysical(): it sets width="8in" and height="8in" on the downloaded root and keeps the pixel viewBox. Verified on tilings: the new root is width 8in, height 8in, viewBox 0 0 2400 2400, with the same element count and identical polygon points as main.
- **Risk.** None to the PNG, which is rasterized from the original SVG before this step. It is one DOMParser/XMLSerializer pass on the download only.
- **Tabs.** tabs with exportSVG (vector plates)

#### CM-4 (minor, improvement, effort small)

- **Claim.** PDF bleed enlarges the whole sheet and crops it, so the trim area is not at the stated scale or ppi.
- **Evidence.** print-formats.js:22-25 scales the image to cover the BleedBox. In the cahn 8 in, 3 mm bleed PDF the image is drawn at 593.0 pt against a 576 pt TrimBox. That is 2.95% larger; the trim shows 97.1% of the width, 34 of 2400 px are lost on each side, and the effective ppi is 291.4 while the print check says 300. On a 5x7 in sheet the enlargement is 4.72% (286.5 ppi). color-metadata/pdfraster.py rasterizes the PDF's own content stream at 300 ppi, and the trim does not equal the source. This is documented in PRINTING.md:48 and studio.html:549.
- **Impact.** Full-bleed art loses about 2.9 mm of its edge on every side, and the print's real scale differs from the print check. On a sheet with a caption, the crop can reach caption text near an edge.
- **Fix.** Prototyped a mirrored bleed. The same image XObject is placed 9 times (the centre plus 8 flipped copies), clipped to the BleedBox, so the file gains no bytes. Verified: the trim sampled on its own 300 ppi grid equals the PNG pixel for pixel (2400x2400); the 35 px bleed on each side is fully covered and is the mirrored edge. pypdf strict parse is clean, and the repo's print-formats-check.py passes. The old behavior is kept as bleedFill:'scale'. The docs and hint text need updating.
- **Risk.** No recipe impact, since bleed is not in the recipe. The RIP may process the image object up to 9 times (clipped), which is slower on very large sheets. A mirrored edge is generic; for periodic-boundary fields, wrapping would be the exact continuation.
- **Tabs.** all (PDF with bleed > 0)

#### CM-5 (minor, defect, effort small)

- **Claim.** The JPEG download has no ppi, and it uses 4:2:0 chroma subsampling that visibly shifts colors on mark-based plates. WebP is also lossy 4:2:0.
- **Evidence.** JFIF APP0 has units=0 and density 1x1 (aspect ratio only); an sRGB ICC is present (APP2, 472 bytes). SOF0 sampling is 0x22/0x11/0x11 (4:2:0) at quality 0.92 (engine.js:3171). At quality 1.0 Chromium switches to 4:4:4 (sampling 0x11). Error against the PNG on a central 1000x1000 crop of the tilings sheet: Chromium q0.92 gives dE00 > 3 on 22.5% of pixels and > 5 on 15.0%, p99 13.4. Pillow q92 4:2:0 matches that exactly. Pillow q92 4:4:4 gives 13.4% > 3. q100 4:4:4 gives 0.02% > 3 at 3.18 MB, against 1.91 MB for the PNG. On the cahn field every setting stays at 0% > 3. WebP (q0.88) is VP8 with ICCP and no resolution.
- **Impact.** Colored edges and caption text on vector or mark plates print with color fringing, and the JPEG also opens at the application's default ppi.
- **Fix.** Prototyped jpegDensity: it patches the 18-byte JFIF head (units=1, X/Y density = pw/wIn) and passes the rest through with Blob.slice. Pillow reads (300, 300). Then either use quality 1.0 for vector/mark plates, where the PNG is smaller anyway, or label JPEG and WebP in the modal and in the PRINTING.md table as sharing formats, not print files.
- **Risk.** None to pixels. The density is an integer, so a custom-size ppi is rounded.
- **Tabs.** all; the color shift matters on vector and mark plates

#### CM-6 (minor, improvement, effort small)

- **Claim.** Print TIFF is written uncompressed as a single strip. Compressing it losslessly would make it 2.7x to 12x smaller.
- **Evidence.** print-formats.js:57-69 writes Compression=1, RowsPerStrip=height. Every 8 in, 300 ppi TIFF is 17,283,228 bytes, and a 36 MP sheet is 108 MB. Deflate with horizontal predictor (Predictor 2) on real sheets: physarum 6.3 MB, cahn 3.7, attractors 4.1, bec 2.4, tilings 1.4. Prototype output end to end: cahn TIFF 3.21 MB, tilings with caption 1.44 MB. Pillow reads identical pixels (TIFF == PNG), dpi (300, 300), and the ICC is intact; a multi-strip 300x800 test is also exact. Encoding 36 MP in Chromium took 6.1 s, against 0.8 s uncompressed, with the machine at load ~20 on 4 CPUs.
- **Impact.** Print files are 3 to 12 times smaller to upload and send, with no quality change.
- **Fix.** Prototyped: tiff() is now async and writes Adobe Deflate (259=8) with Predictor 2 (317) in strips of about 256 KB using CompressionStream, the same API the PDF writer already uses. {compression:'none'} keeps the old output. tools/print-formats-check.js now awaits tiff() and adds multi-strip and uncompressed cases.
- **Risk.** Very old RIPs may not read Deflate TIFF; LZW (259=5) is the most conservative choice. Offering 'none' or LZW as an option covers that. Encoding is slower, and the main thread runs the predictor between strip awaits.
- **Tabs.** all

#### CM-7 (minor, improvement, effort medium)

- **Claim.** Many palette colors, especially from Surprise, fall outside a coated-offset gamut, and there is no gamut warning.
- **Evidence.** Measured by dE00 round trip through FOGRA39L (a proxy for offset print). Named palette stops: 12 of 72 exceed 3 and 5 of 72 exceed 6. The worst are nightshade #C084FC 11.8, bioluminescent #B8FFF9 11.5, thermal #2C0F4A 6.0, risograph #00CECB 5.6 and xray #E0F2FF 4.3. Palettes kiln, harbor, meadow, graphite, verdigris, tram, petri and triad have every stop within 2 and no ramp entry above 3. For 16,045 colors drawn from the generatePalette distribution (which Surprise uses half the time, engine.js:2834), 47% exceed 3, 30% exceed 6 and 10% exceed 10. Share of sheet area above 6: fluid 2.6%, bec 1.2%, physarum 0.3%. Offline check of a cheap warning: a 33^3 uint8 dE table (21.7 KB deflated, 28.9 KB base64) with trilinear lookup agrees with the direct CMM on the > 3 classification for 98.7 to 100% of pixels across 5 plates and random colors. A 17^3 table fails (77% on bec).
- **Impact.** Saturated violets, cyans and greens print duller. Without a warning, users find out on the proof.
- **Fix.** Optional gamut line in the print check, using the precomputed 33^3 table built from FOGRA39L and labelled 'coated offset (FOGRA39) reference; inkjet gamuts are wider'. It could also offer a highlight overlay. The profile header says it is free of known copyright restrictions.
- **Risk.** Adds about 29 KB to the studio. It is advisory only and covers one press condition, and the docs say the studio does not guess an output profile, so the wording must make clear this is a reference, not a conversion.
- **Tabs.** all with palettes; mostly the dark palettes and Surprise palettes

#### CM-8 (minor, improvement, effort small)

- **Claim.** No export file carries the recipe or basic document metadata. Only the file name identifies the plate.
- **Evidence.** The PNG has no tEXt or iTXt. The TIFF has no ImageDescription (270) or Software (305). The PDF has no /Info, and pypdf strict reports metadata None and trailer /ID None (print-formats.js:54). The file name holds only id, seed and size; the recipe hash (encodeRecipe) is not stored in the file.
- **Impact.** Reprinting a seed is the product, but if a print shop or user renames the file, the recipe and settings are lost. Some preflight tools also expect a title and producer.
- **Fix.** Prototyped for PNG: tEXt Title ('Aperiodic Tilings / meta-tilings'), Software ('GENChase recipe v2') and Comment ('Recipe #tilings/meta-tilings/eyJ2...; sheet 8.0 x 8.0 in at 300 ppi, sRGB'). Pillow reads all three. Same idea for TIFF (tags 270 and 305) and PDF (/Info with /Title, /Subject holding the recipe, /Creator, /Producer, /CreationDate, and a trailer /ID from a SHA-256 of the image).
- **Risk.** Only the settings hash is written, never the page URL or path. It adds a few hundred bytes.
- **Tabs.** all

#### CM-9 (minor, improvement, effort small)

- **Claim.** The caption-sheet margins that stand for paper are printed as ink: a cream tint on light sheets and a near-black flood on dark ones.
- **Evidence.** engine.js:2485 fills the margin #FAF7F1 on light sheets and #0A090B on dark ones. Through FOGRA39: #FAF7F1 becomes C3 M3 Y7 K0 (TAC 12%), and #0A090B becomes C84 M75 Y43 K100 (TAC 302%, and still off by dE00 4.2 because it is below press black).
- **Impact.** A light captioned sheet gets a faint cream wash over the whole margin that white paper would have supplied, with a hard edge wherever it is trimmed. A dark captioned sheet floods the margin at about 300% ink.
- **Fix.** Fill light-sheet margins with #FFFFFF in the print file and keep the cream only in the on-screen preview, or add a 'paper-white margins' option. For dark sheets, keep the dark margin as a design choice but mention the ink coverage in the print check.
- **Risk.** Changes how existing captioned exports look. Caption preferences are stored per device and are not part of the recipe, so recipes are unaffected.
- **Tabs.** all (only when the caption is on)

#### CM-10 (nit, improvement, effort small)

- **Claim.** PDF crop marks are black-only ('0 G', DeviceGray) rather than registration color. The PNG keeps a constant alpha channel.
- **Evidence.** print-formats.js:27 draws the marks with '0 G'. Every PNG tested is colortype 6 (RGBA) with alpha min = max = 255. Re-encoding as RGB changes size negligibly (Pillow: 3.56 MB RGB against 3.50 MB RGBA).
- **Impact.** After CMYK separation the marks appear on the K plate only; press operators usually expect registration marks on all plates. Some upload tools flag PNG alpha. Neither affects the image itself.
- **Fix.** Draw the marks in [/Separation /All /DeviceGray ...]. Leave the alpha channel alone unless a shop complains.
- **Risk.** None.
- **Tabs.** all

**Already good:** TIFF (print-formats.js:57): 8-bit chunky RGB with tags in ascending order. XResolution and YResolution are exact rationals from pixels over inches (24000000/80000 = 300.0), ResolutionUnit is inch, and ICC tag 34675 holds the 3024-byte sRGB2014 profile (ICC v2.0, header size matches). Pillow reads dpi (300, 300), the profile, and pixels identical to the PNG.; PDF geometry is correct without bleed: MediaBox = TrimBox = BleedBox = 576 pt for 8 in, and the image is drawn at exactly 576 x 576 pt. With bleed and marks the boxes are right: 3 mm = 8.504 pt, 18 pt mark pad, MediaBox 629.0. The image is ICCBased sRGB2014 with /Alternate DeviceRGB, /Interpolate false, lossless Flate, and pixels identical to the PNG. pypdf strict parse finds no xref warnings.; The PDF correctly declares no OutputIntent. sRGB is a display (mntr) profile, so it is not a valid press output intent, and tools/prepress.py already refuses non-prtr CMYK profiles and targets PDF/X-3 with the shop's own profile. PRINTING.md explains the RGB/CMYK split honestly.; Every canvas in src/ uses the default sRGB space (no display-p3 anywhere), and the PDF/TIFF conversion requests colorSpace 'srgb'. Tagged and untagged PNGs decode identically in Chromium, so the containers are lossless.; Palette ramps interpolate in linear light (engine.js:115-146). The eight light palettes (kiln, harbor, meadow, graphite, verdigris, tram, petri, triad) sit entirely inside the FOGRA39 proxy gamut: every stop within dE00 2 and no ramp entry above 3.; JPEG and WebP already embed an sRGB ICC (Skia, 472 bytes). The file name and effDpi report the real ppi when a sheet is clamped.; The print check is honest that it is not a color or sharpness proof. The docs do not overclaim.

### Banding and tonal quantization

#### banding-gl-8bit-no-dither (major, defect, effort medium)

- **Claim.** The GL field tabs write a smooth float colour straight into an 8-bit target with no dither. Slow gradients therefore export as staircases of 1-code contours: flat plates about 2-3 mm wide at 300 ppi.
- **Evidence.** Method: I exported through the real Export button at 8 in / 300 ppi with the colophon off, using the frozen origin/main build (scratchpad/print/banding/capture.js). band.py samples every 4th row and column and finds flat runs at least 20 px long on both sides of a 1-4 code step, per channel, then scores each step with CIEDE2000 via LittleCMS. Share of sampled pixels inside such bands, baseline: cppn 0.446, maxwell 0.438, fluid 0.234, volume-wave 0.217, shallow 0.179, reaction 0.082. Every step is exactly 1 code. Median band width is 24-34 px. Per-contour ΔE00 median/p90: cppn 0.45/0.66, maxwell 0.29/0.58, shallow 0.40/0.74, reaction 0.52/0.77, fluid 0.37/0.55. Between 6% (volume-wave) and 54% (reaction) of contours are at or above 0.5 ΔE00. Contrast-stretched crops (viz/cppn_pair.png, maxwell_pair.png, shallow_pair.png) show nested plateau islands. The final writes are shallow.js:109, maxwell.js:76, cppn.js:115 and reaction.js:99. 23 module files splice G.GLSL.ramp and contain no dither at all. The analyzer was validated on synthetic cases: a 1-code staircase gives 0.5 (the maximum for a one-direction gradient), the same ramp dithered before quantisation gives 0.000, and noise gives 0.000.
- **Impact.** Broad smooth areas print as faint concentric contour lines roughly 2-3 mm apart instead of continuous tone: cppn backgrounds, maxwell, shallow and volume-wave fields, fluid glows. Each step is near the visibility threshold on its own (median ΔE00 about 0.3-0.5), but the lines are regular and span the plate. They get worse after CMYK separation (see cmyk-separation-requantizes).
- **Fix.** Add one shared snippet, G.GLSL.dither. It is the R2 ordered dither of ±0.5 code keyed on gl_FragCoord, exactly the pattern fractal.js:280 and dynamics.js:120 already use. Each final write then becomes outColor = vec4(dither8(col), 1.0). Prototype: scratchpad/print/banding/dither-prototype.patch, applied in worktree print/banding-wt. Measured after, same plates: cppn 0.446→0.001, maxwell 0.438→0.021, shallow 0.179→0.009, reaction 0.082→0.000. The pattern depends only on pixel position, so reprints are bit-identical and deriving it from the recipe seed would add nothing. check.js still reports determinism same:true, and a still cppn plate stays Still. Skip the dither where a module posterises on purpose (reaction u_poster, cppn u_levels) and on discrete lattices (life, ising, sandpile, percolation). A 16-bit TIFF path is not the right lever here: modules hand the engine 8-bit PNG blobs (exportPNG contract), and print-formats.js writes 8-bit samples (:44, :73). A 16-bit path would need float readback in every module, while dither gets the perceptual result at the point where the float already exists. Optional follow-up: a lint rule that any module splicing GLSL.ramp also splices GLSL.dither.
- **Risk.** No recipe key or default changes, so no legacy declaration is needed. Solver state is untouched: shallow-print.js and maxwell-print-state.js pass on the prototype with exact float32 field preservation. Exported pixels change by at most 1-2 codes (cppn max 2, shallow max 1). Every module edit changes its sourceSha256, so science.js fails ('Source changed; review validation record: cppn') until each of the roughly 23 records is reviewed and re-hashed. PNG files grow 1.3-2.1x (cppn 2.94→6.18 MB, maxwell 3.45→5.97 MB); TIFF is uncompressed and unchanged. The dither also inflates sharp.js acuity (see sharp-acuity-counts-dither).
- **Tabs.** Measured: cppn, maxwell, shallow, reaction, fluid, volume-wave. Rollout set is the 23 GLSL.ramp module files without dither, about 45 tabs (pde and rdx families, bec, the cgl/hofstadter/scars multi-module, wavesflow, cortex, cppn, dendrite, fluid, hodgkin-huxley, liesegang, maxwell, nematic, nonreciprocal, physarum3d, plasma, reaction, shallow, tonertu, volume-wave, xy, lattice, life).

#### supersample-downscale-requantizes (major, defect, effort small)

- **Claim.** The engine's 2x supersample downscale (engine.js:2674-2683) redraws the 2x PNG through an 8-bit canvas. That rounds the 2x2 average back to 8 bits and removes any dither the module applied. The existing shader dither in holomorphic and orbitals therefore never reaches the print.
- **Evidence.** Baseline holomorphic banded fraction is 0.363 and orbitals 0.563, even though both shaders include DITHER (dynamics.js:120). A/B on cppn, which is deterministic, so this is a pixel-exact comparison: baseline 0.446; shader dither only 0.245; engine float halving only 0.420; both together 0.001. Engine-only prototype (halveDithered: premultiplied float 2x2 mean plus the same R2 dither, processed in strips of at most 128 rows): holomorphic 0.363→0.040, orbitals 0.563→0.130. The orbitals residual sits where the gradient meets a flat region (clipped white lobes near 247-255, halo edge against flat background; viz/orbitals_resid.png). A second metric checks the local mean after a 9 px box blur, so it is not fooled by grain. Its share of stepped slow-gradient windows went holomorphic 18.4%→4.2% and cppn 6.8%→0.7%. On a synthetic staircase with dither added after quantisation, that metric still reads 100% stepped, so it separates a real fix from masking.
- **Impact.** Every tab printed with 2x supersampling loses the benefit of dithering: per-pixel techniques below the engine's 132 MP limit, roughly up to 19 in at 300 ppi. Without this change, the per-module fix above only partly works on those tabs (cppn stays at 0.245).
- **Fix.** When the render is exactly 2x, replace the drawImage downscale with the float 2x2 mean plus ordered dither (halveDithered in dither-prototype.patch). Keep drawImage as the fallback for any other ratio.
- **Risk.** No sharpness cost. The output is within 1 code of Chrome's high-quality 0.5x downscale (cppn and holomorphic max|diff| = 1), and holomorphic measures edge 2.478→2.474 and acuity 0.439→0.443 by the sharp.js formula. Cost is about 110 ms of JS per 2400x2400 output and 0.7 s at 7200x7200 (node benchmark on a loaded machine). Temporaries stay at a few MB per strip. The engine change alone passes build --check, lint, science.js, recipe.js (80 assertions), engine-api-check, print-formats-check.js and print-smoothing-check. I could not run print-formats-check.py here: its pypdf import panics inside this sandbox's cryptography package. On its own the change does little for modules that don't dither (fluid 0.234→0.201), so ship it together with the per-module fix.
- **Tabs.** All tabs exported with 2x supersampling. Measured: holomorphic, orbitals, cppn, reaction, fluid.

#### nearest-mosaic-continuous-fields (major, defect, effort medium)

- **Claim.** Several continuous-field tabs export as nearest-neighbour mosaics: each simulation cell prints as a flat block 9-19 px wide at 300 ppi. This is outside banding and was found incidentally by the staircase detector.
- **Evidence.** landscape.js:367 uses gx = floor(pxi*W/PW), giving 9.4 px blocks at the default 256 grid. It declares no fieldCells(), so the engine also renders it at 2x. lp and scars (cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js:2007 and :613) pick the nearest cell of N=128, giving 18.75 px blocks, also without fieldCells and also at 2x. airy.js:169 and aharonov.js:129 (and knotlight, gyroid) set imageSmoothingEnabled=false in exportPNG despite declaring fieldCells: 10 px blocks for airy (192x240) and 15 px for aharonov (160). 1:1 crops: viz/landscape_1to1.png, airy_mix.png, aharonov_mix.png, lp_mix.png, scars_mix.png. Staircase metric: stair-steps per 1000 px of 39 (landscape), 26.7 (lp), 24.6 (aharonov) and 63 (airy), with median step 7-14 codes and median ΔE00 2.9-4.6. AGENTS.md says nearest sampling gives a mosaic and asks for fieldCells() plus bicubic. sharp.js's formula calls the landscape mosaic 'sharp' (edge 1.07) because block edges count as hard edges.
- **Impact.** Visible squares 0.8-1.6 mm across on an 8 in print, larger on a poster. On paper the plate reads as pixelated rather than as a continuous surface.
- **Fix.** Upsample continuous fields bicubically (Catmull-Rom, as G.GLSL.bicubic/texCR does), or at least bilinearly, in exportPNG. On the CPU path, interpolate the field, then colour and dither. Declare fieldCells() for landscape, lp and scars so the engine stops rendering a magnified grid at 2x. Keep nearest only for genuinely discrete lattices (ising, potts, sandpile, spin ice). Add a mosaic check to sharp.js, for example periodic zero-difference runs at the cell pitch.
- **Risk.** Reprints change in appearance (pixels only; recipes stay valid). Some tabs may show cells deliberately as honesty about resolution, so each needs an owner decision. Landscape's hillshade must be recomputed from interpolated heights. Each edit needs a validation re-hash. 40 modules set imageSmoothingEnabled=false and need triage; many of them are legitimate lattices.
- **Tabs.** landscape, lp, scars, airy, aharonov, knotlight, gyroid (checked). Triage the other modules that export with imageSmoothingEnabled=false.

#### cmyk-separation-requantizes (minor, improvement, effort medium)

- **Claim.** An 8-bit to 8-bit CMYK separation, which is what tools/prepress.py:53 does with Pillow and what many shop RIPs do, adds contouring. A 16-bit intermediate dithered to 8 bits avoids that, but it only helps once the RGB file itself is dithered.
- **Evidence.** Simulated with LittleCMS through ctypes: sRGB to FOGRA39L coated (the profile shipped in texlive), relative colorimetric, same flags as prepress.py (cmyk16.py). Share of stepped slow-gradient windows by the local-mean metric, RGB vs 8-bit CMYK, baseline: holomorphic 18%→41%, maxwell 12%→40%, cppn 6.8%→11%. With the prototype RGB, 8-bit CMYK vs 16-bit CMYK plus R2 dither: holomorphic 11.6%→4.9%, cppn 3.5%→2.5%, maxwell 21.6%→18.5%. Run-length banded fraction for prototype cppn: 8-bit CMYK 0.083, dithered 16-bit CMYK 0.001. Control: dither added after quantisation leaves a synthetic staircase at 100% stepped windows, so on a banded RGB file this only hides the bands under grain.
- **Impact.** Prints made through the prepress CMYK TIFF, or through a shop that converts at 8 bits, show more contouring than the RGB file does on screen. Without the RGB fixes, baseline CMYK banded fractions are cppn 0.430, maxwell 0.501, volume-wave 0.290.
- **Fix.** In prepress.py cmyk-tiff mode, convert to 16-bit CMYK with LittleCMS and apply the same R2 ordered dither down to 8 bits. Pillow cannot produce 16-bit CMYK; ctypes against liblcms2 worked here. The alternative is writing a 16-bit CMYK TIFF. Also tell users that an RGB TIFF or PDF with the embedded ICC profile is the best thing to send a shop that converts at high bit depth.
- **Risk.** prepress.py is an optional tool, and this adds a liblcms2 dependency path. Inks differ by at most 1 code. The PDF/X path goes through Ghostscript and is not covered. Only worth doing after the two RGB fixes.
- **Tabs.** All raster tabs sent through tools/prepress.py cmyk-tiff.

#### sharp-acuity-counts-dither (minor, improvement, effort small)

- **Claim.** sharp.js's acuity term, mad(1)/mad(16) at sharp.js:120, counts dither grain as fine detail. Once dither ships, it will report smooth plates as sharper than they are.
- **Evidence.** Same deterministic plate, baseline vs prototype, using the sharp.js formula (sharpm.py): cppn acuity 0.063→0.142, shallow 0.066→0.092, orbitals 0.071→0.103. Edge is unchanged (cppn 0.027→0.028). The verdicts stay SOFT only because of the edge floor at 0.15.
- **Impact.** The planned sharpness sweep would credit dithered smooth plates with texture they don't have. A plate with edge at or above 0.15 and acuity near the 0.10/0.15 thresholds could flip to ok or sharp with no new detail.
- **Fix.** Give the metric a 1-code allowance, for example average max(0, |d|-1) or measure on a 2x2 mean, and re-run the sweep after dither lands.
- **Risk.** Thresholds need recalibrating. Tool-only change.
- **Tabs.** All (measurement tool).

#### cpu-lut-256-coarse-steps (nit, improvement, effort small)

- **Claim.** makeRampLUT(...,256) interpolates in linear light, so adjacent entries near the dark end of a stop pair differ by up to 23 codes. CPU call sites index it by truncating t*255|0 with no interpolation. This is latent: I did not observe it in sampled plates.
- **Evidence.** lutstep.js across the 15 studio palettes: largest adjacent-entry step per palette has median 12 and max 23 (ember). For the median palette, 63% of adjacent entries step by 2 codes or more. At 1024 entries: median 4, max 12. Nearest truncating lookups include the multi-module at :1617, :2016 and :2071. Not seen on plates: talbot at grain 0 shows 0.015 stair-steps per 1000 px because its fringes are steep, and its default grain of 0.04 already jitters the index by about 1.3 entries. attractors uses 1024 entries and measured 0.000. chladni measured 0.
- **Impact.** A slowly varying CPU field lying in a dark palette segment would print visible bands of up to about 23 codes. None of the sampled default plates do this.
- **Fix.** Add a U helper that interpolates between LUT entries and applies the R2 dither, or raise the LUT default to 4096 entries.
- **Risk.** Pixel changes only; negligible performance cost.
- **Tabs.** CPU palette renderers using 256-entry LUTs (multi-module, lattice, swarm, physarum, landscape, chladni, growdomain and others).

#### sharp-colophon-selector-stale (nit, defect, effort small)

- **Claim.** sharp.js:49 tries to switch off the colophon through #export-colophon, which doesn't exist. The colophon is toggled by #btn-colophon.
- **Evidence.** tools/sharp.js:49 is the only reference, and dist/studio.html contains no such id. The colophon defaults to off (engine.js:2274) but is persisted in localStorage (engine.js:3126). My capture only produced a sheet with a caption after clicking #btn-colophon.
- **Impact.** No effect on a fresh Playwright profile. A sweep run with a persisted profile where the colophon is on would measure paper margins.
- **Fix.** Read the colophon state and click #btn-colophon if it is on.
- **Risk.** None.
- **Tabs.** All (measurement tool).

**Already good:** PDF and TIFF are lossless 8-bit containers with an embedded sRGB ICC profile. By code reading (not byte-compared), exportPrintFormat draws the exported PNG unscaled into an sRGB canvas and writes those bytes (engine.js ~2821, print-formats.js), so a dithered PNG's grain reaches the TIFF and PDF.; makeRamp interpolates palette stops in linear light (engine.js ~133-147), so ramp midpoints are physically correct colours.; GL ramp textures are sampled with LINEAR filtering (rampTexture, engine.js:387-395). GL plates therefore show only the unavoidable 1-code output steps, never LUT posterisation: every measured GL contour was exactly 1 code.; No measurable banding (banded fraction at most 0.006) on plasma, turing, cahn, bec, schrodinger, attractors (1024-entry LUT), chladni, caustics, fractal and talbot (its default grain works as a dither).; fractal.js:280 and dynamics.js:120 already use the right dither: R2 ordered, ±0.5 code, keyed on pixel position, deterministic. It only fails to reach the print because of the 2x downscale.; The prototype keeps the project's guarantees: build --check, lint, recipe.js (80 assertions), engine-api-check, print-formats-check.js, print-smoothing-check, shallow-print.js and maxwell-print-state.js (exact float32 field preservation) all pass. check.js shallow and cppn pass, with determinism same:true and the still plate staying Still. science.js passes with the engine-only change.; The engine's float 2x2 halving matches Chrome's high-quality 0.5x downscale to within 1 code, so there is no sharpness regression (holomorphic edge 2.478→2.474).; With the colophon on, composeSheet's 0.656x resample keeps most of the dither: shallow art region 0.081 on baseline vs 0.017 with the prototype.; Scratch artifacts under /tmp/claude-0/-home-user-GENChase/04604b4b-7efe-5ca6-9b53-4838030930e5/scratchpad/print/banding/: capture.js (real-export capture), band.py (run-length and CIEDE2000 banding, sRGB and FOGRA39 CMYK), stair.py (local-mean staircase), cmyk16.py, sharpm.py (sharp.js formula), lutstep.js, dither-prototype.patch, base/ and proto/ PNGs, viz/ crops. The prototype worktree is print/banding-wt (uncommitted).

### Vector coverage and SVG fidelity

#### V1-growth-svg-throws (major, defect, effort small)

- **Claim.** Growth's exportSVG always throws ReferenceError 'H is not defined'. The tab is flagged `vectors: true`, but it never delivers an SVG, and every print silently falls back to a supersampled raster.
- **Evidence.** src/modules/growth.js:614 reads `const sx = Wout / W, sy = Hout / H;`. `H` is not in scope inside exportSVG; the sim height lives in `sim.H` (see growth.js:207, 279). fidelity.js on the unmodified main build returned svgErr 'H is not defined' for all 9 presets. A real 8 in / 300 ppi export gives the note 'Rendered at print pixels with 2x supersampling', and the SVG button is hidden (out/growth.json). With the one-line fix `sy = Hout / sim.H` in my worktree, the SVG matches the module raster on all 9 presets: MAD 0.42-3.0, edge-F 0.79-1.0 (fidproto run).
- **Impact.** Growth draws closed buckling curves (coral, cortex, lettuce), the textbook case for vectors. Users get a raster capped at print pixels and no SVG file to send to a print shop or plotter.
- **Fix.** growth.js:614: `const sx = Wout / W, sy = Hout / sim.H;`. The patch is in scratchpad/print/vector/prototypes.patch.
- **Risk.** None to recipes: export-only code path, no state or RNG touched. The PNG becomes the SVG RIP (MAD <= 3 from the current raster). Ghost rings ('rings' preset, MAD 3.0, dark diff 4.8 pp) are not in the SVG, a small visible difference worth a follow-up.
- **Tabs.** growth

#### V2-chladni-contour-svg-wrong-picture (major, defect, effort small)

- **Claim.** In the 'contour' style (presets sevenfold and topo), Chladni's SVG contains only the zero-level nodal line on the background colour. The engine builds the PNG, PDF and TIFF from that SVG, so the printed sheet loses the whole coloured field and all the other contour levels.
- **Evidence.** src/modules/chladni.js:522-524 gates exportSVG on `s.style === 'contour'`, and :544 marches squares on the sign of the field only (one level). engine.js:2623-2640 uses the SVG RIP as the PNG whenever exportSVG returns non-null. fidelity.js (SVG RIP vs the module's own exportPNG at 1000 px): sevenfold MAD 147.15 with dark-coverage difference 95 pp and edge-F 0.005; topo MAD 103.5 with edge-F 0.25. A real 8 in / 300 ppi export of sevenfold (svgprobe) has mean luminance 11 and 98.9% of pixels below 40, while the on-screen plate (three/chladni-sevenfold.screen.png) is a bright cyan field with about 15 contour levels.
- **Impact.** A user who prints the 'Sevenfold interference' preset gets a nearly black sheet with a few hairlines instead of the luminous interference pattern on screen.
- **Fix.** Immediate: return null from exportSVG in contour style, so the print uses the correct raster. Later, if vectors are wanted: emit every contour level (k*s.contour) as paths over an embedded field raster (<image>). A contour-only SVG could be an explicit separate 'line art' option rather than the default print.
- **Risk.** None to recipes. Returning null restores the plate-faithful raster print. A hybrid SVG would embed a raster, which is honest for the field part.
- **Tabs.** chladni (sevenfold, topo)

#### V3-flow-svg-drops-paint-settings (major, defect, effort medium)

- **Claim.** Flow's exportSVG hard-codes round caps and constant width, and ignores the margin clip, taper and width noise, alpha, blend mode, outline, shadow, grain, vignette, background gradient and frame line. Every Flow print (PNG/PDF/TIFF all come from the SVG) therefore differs from the plate, and the project's own export check fails on three presets.
- **Evidence.** src/modules/flow.js:793-807: every stroke is `<polyline ... stroke-linecap="round" stroke-linejoin="round">` with width st.w. The raster (flow.js:412-600) clips to the frame (433), shapes taper/widthNoise (461-468), and applies P.caps (528, 538), outline (534), shadow (544-548), alpha/blend (556-557), grain (562), vignette (574) and frameLine (593). `node tools/export.js flow 8 300` on main: FAIL storm (ink coverage differs by 17.9 pp), spirals (16.9 pp), overprint (MAD 58.3). Plate-vs-print MAD on the passing presets: default 16.8, threads 28.9, boulders 27.3, tide 28.6, relief 37.2. SVG vs module raster at 1000 px: overprint MAD 62.4 (dark diff 18.6 pp, edge-F 0.43), boulders 19.6 (edge-F 0.53), storm 21.2, relief 27.1. Screenshots (fid/flow-overprint.png, three/flow-overprint.3way.png) show square-capped, multiplied strokes inside a margin on screen, and round-capped opaque strokes bleeding to the edge in the print.
- **Impact.** Flow is the studio's most 'print-like' tab. On paper, square-cap presets become rounded capsules, the outlined 'Boulders' and shadowed 'Relief' lose their outlines and shadows, 'Overprint' loses its multiply transparency and margin, and 'Storm' and 'Spirals' lose their taper.
- **Fix.** Map what SVG can express: stroke-linecap = P.caps; stroke-opacity = P.alpha; a clipPath on the frame when !P.bleed; an outline as a wider under-stroke; a shadow as a translated <g> at shadowAlpha; taper/widthNoise as the filled polygon buildPath already computes; frameLine as a rect; bgGradient as a linearGradient. For settings SVG cannot carry faithfully (blend != 'source-over', grain, vignette), either return null so the raster prints, or accept and document the loss. Add flow to the CI print matrix.
- **Risk.** No recipe impact (export only). A mix-blend-mode in SVG is honoured by Chromium but unevenly by print RIPs and Illustrator, so returning null for multiply is the safer interim.
- **Tabs.** flow (all 10 presets)

#### V4-hasimoto-xy-svg-different-picture (major, defect, effort small)

- **Claim.** Hasimoto's SVG is a bare filament curve. It drops the spacetime field on the 'space' preset and the glow and beads everywhere, and it places the kink differently from the plate. XY's LIC-view SVG draws ink streamlines where the plate is a grey LIC texture. Both print a different picture from the screen.
- **Evidence.** fidelity.js, SVG RIP vs module raster at 1000 px. hasimoto (src/modules/hasimoto.js:727): all 8 presets flagged, MAD 8.0-16.7 on the curve presets and 49.1 on 'space', edge-F 0.12-0.57. Screenshots (three/hasimoto-screens.png) confirm the plate matches the raster, with the kink at about 3/4 width and the coloured spacetime field; the SVG shows the kink near mid-width and no field. xy 'ice' (src/modules/xy.js:567, view 'lic'): MAD 58.6, edge-F 0.28. The screenshot (three/xy-ice.screen.png) is a grey LIC texture; the SVG is black streamlines and vortex dots on paper.
- **Impact.** The printed 'space' Hasimoto plate is a single black line on cream instead of a red, orange and blue spacetime band. The printed XY 'ice' plate is a pen drawing instead of the texture on screen.
- **Fix.** Hasimoto: return null for views with a field background, and use the same transform as paintTo (so the kink lands where the plate has it) for curve views, or return null until it does. XY: return null for 'lic' (LIC is a per-pixel convolution, which is a field), or offer the streamline drawing as an explicitly named alternative export.
- **Risk.** None to recipes. Returning null restores the faithful raster.
- **Tabs.** hasimoto (all 8 presets), xy (ice)

#### V5-eight-crapper-hl-svg-divergence (minor, defect, effort small)

- **Claim.** Three more vector tabs print something visibly different from the plate. Eight exports static full-orbit lanes with no bodies or glow. Crapper 'woodcut' exports different framing and fills. HL fills with palette[2] instead of the ramp colour the plate uses. HL's own exportPNG also ignores the 'age' view, a latent bug on the raster fallback.
- **Evidence.** fidelity.js. eight (src/modules/eight.js:574 builds the SVG from collect(traj) with no phase or bodies, while exportPNG calls paintTo(..., phase)): 8 presets MAD 2.7-13.6; 'shape' dark diff 10.2 pp. crapper woodcut (crapper.js:650): MAD 7.21, edge-F 0.57; the screenshot (three/screens2.png) shows the plate has a frame, margin and lower line field that the SVG lacks. hl: the SVG fill is `pal[Math.min(pal.length-1,2)]` (cgl-hofstadter-...-phyllotaxis.js:1095) while the raster uses `rgb(0.72)` from the ramp (:1054); 'fingers' MAD 8.0, visibly darker blue. On hl 'fine' (view 'age') the screen matches the SVG, but the module exportPNG draws a solid silhouette (MAD 19.3), so the raster fallback is wrong.
- **Impact.** Eight's print lacks the three bodies and the glow the viewer saw. HL prints in a noticeably different fill colour. The Crapper woodcut print lacks its frame and lower hatching.
- **Fix.** Eight: add body circles at the current phase, and optionally a glow via stroke-opacity layers, or state in the UI that the SVG is the full orbit. Crapper: reuse the woodcut layout, frame and margin from the raster. HL: compute the fill from the same ramp at t=0.72, and make exportPNG draw the age rings.
- **Risk.** None to recipes.
- **Tabs.** eight, crapper (woodcut), hl

#### V6-no-vector-fidelity-gate (major, improvement, effort medium)

- **Claim.** The engine always turns a non-null SVG into the PNG, PDF and TIFF, but nothing checks that the SVG is the same picture as the plate. CI exports only 3 of the 33 vector tabs, and export.js tolerates up to MAD 38 or 14 pp of ink difference. That is how V1-V5 shipped.
- **Evidence.** engine.js:2623-2640 prefers the SVG RIP. check.yml:292 print matrix: `id: [cahn, tilings, three-vortex-bound, maxwell, molecular, tennis]`. tools/export.js fails only when darkDiff > 0.14 or MAD > 38, at 300x300. My fidelity sweep (scratchpad/print/vector/fidelity.js: for each tab and preset, exportSVG(w,h) is rasterized as the engine does and compared with exportPNG(w,h) at 1000 px) covered 33 tabs, 241 cases and 181 vector cases in about 50 min on a loaded 4-CPU SwiftShader box. It separated the faithful tabs (MAD <= 5.5 apart from anti-aliasing) from the divergent ones (flow, chladni, hasimoto, xy, eight, crapper, hl) and the broken one (growth).
- **Impact.** Without a gate, any module edit can silently change what every future print of that tab looks like.
- **Fix.** Add a fidelity check (for example tools/vector-fidelity.js adapted from fidelity.js) over every exportSVG tab and preset in CI, sharded like the plates job. Fail on MAD > 6 or dark diff > 0.03, unless a module declares an intentional difference (e.g. `svgNote: 'full orbit, no bodies'`). Alternatively, the engine could build the PNG from exportPNG and offer the SVG only as a separate download. That removes the class of bug but loses nothing on faithful tabs, whose rasters already render at print resolution.
- **Risk.** CI time only. It does not touch recipes.
- **Tabs.** all 33 vector tabs

#### V7-apollonian-needs-vector (major, improvement, effort small)

- **Claim.** Apollonian computes an exact circle list, then rasterizes it into a 192-cell grid and prints it with nearest-neighbour magnification. Every circle in the print is a 12.5 px (about 1 mm) staircase. A 25-line exportSVG fixes it, and a prototype passes the project's own export check on every preset.
- **Evidence.** src/modules/apollonian.js:78-104 fills `field` per pixel from the circles; exportPNG (:150-156) uses imageSmoothingEnabled=false and drawImage(buf,0,0,w,h). The grid slider tops out at 224 (:17), so raising the grid still leaves 10.7 px per cell at 8 in. 8 in / 300 ppi export: 'one cell is about 12.5 px'. The sharp.js metric on the print gives edge 0.00, verdict SOFT. Prototype exportSVG (prototypes.patch: the same circles and the same lo/hi/exposure/log colour normalization, rims 1.1 cells wide): 23 KB SVG; print edge 0.77 ('ok'); MAD 3.27 against the main print; `node tools/export.js apollonian 8 300` PASS on 7/7 presets with plate-vs-print MAD 2.35-3.68. Crop: apollonian.main-vs-proto.crop.png.
- **Impact.** On an 8 in print, each tangent circle has visible 1 mm stair-steps and the smallest circles are single square blocks. With vectors they print as true circles at any size.
- **Fix.** Record {x,y,r,value} per circle in compute(). Emit <circle> fill plus a rim stroke using the same colour normalization as paint(). Keep fieldCells() so the raster fallback stays honest.
- **Risk.** No recipe impact: the same circle list (including the grid-dependent 0.6-cell cutoff) is emitted, and state and RNG are untouched. The on-screen plate stays a mosaic unless paint() also draws the circles, which is optional and would make screen equal print.
- **Tabs.** apollonian

#### V8-stealth-points-need-vector (major, improvement, effort small)

- **Claim.** Stealth's default 'points' view draws 280 discs into a 256-px buffer, and exportPNG bilinearly upscales that buffer 9.4x, so the print shows blurred blobs. The fieldCells note wrongly tells the user to 'raise the grid'. A 12-line exportSVG gives crisp discs.
- **Evidence.** src/modules/stealth.js:254-263 draws arcs into buf (W=256); exportPNG :296-306 does `g.drawImage(buf, 0, 0, w, h)` with smoothing; fieldCells :282 is declared for every view. 8 in export note: 'The field is 256 x 256 cells ... raise the grid'. The sharp.js metric gives edge 0.20, SOFT. Prototype (prototypes.patch: <ellipse> per point, null for the sk and density views, fieldCells null in points view): 16 KB SVG, edge 0.66; `node tools/export.js stealth 8 300` PASS on 8/8 presets (5 vector with MAD 0.35-2.7; fourier, density and tight correctly stay raster). Crop: stealth.main-vs-proto.crop.png.
- **Impact.** On paper the stealthy point pattern, whose whole point is exact point positions, prints as soft, fuzzy dots with about 9 px of blur on every edge.
- **Fix.** Apply the prototype: exportSVG for view 'points' only, and return fieldCells null in that view.
- **Risk.** None to recipes (the point positions are unchanged).
- **Tabs.** stealth

#### V9-ray-and-curve-tabs-need-vector (major, improvement, effort medium)

- **Claim.** Eight more tabs draw closed-form curves, rays or segments by splatting them into a 160-192-cell grid, then print it nearest-neighbour at 12-15 px per cell. Their geometry is already an explicit list, so exportSVG is small work, and they are the next candidates after Apollonian and Stealth.
- **Evidence.** All use the template compute(), then putImageData, then drawImage with imageSmoothingEnabled=false, plus fieldCells. At 8 in / 300 ppi the notes say 12.5 px per cell for cloak, hopf, kakeya, reuleaux, darkroom and veselago, 12.0 for loschmidt and 15.0 for purcell. Crops (candidates.crops.png, rays.crops.png) show block mosaics: cloak rays print as broken dotted staircases; loschmidt worldlines are 3-cell blocky diagonals. The sharp.js metric: loschmidt 0.00, reuleaux 0.00 and purcell 0.14 are SOFT. Geometry per default: cloak 36 ray polylines (cloak.js:85); veselago 28 refracted rays (veselago.js:87); hopf 36 fibres x 180 points (hopf.js); loschmidt 36 worldlines of at most 2 straight segments with periodic wraps; kakeya 36 needles; reuleaux 3 arcs x 24 rotations plus a support-width polar plot; purcell a 3-link body every 5 steps plus the trail; darkroom 800 rays x 28 bounces (22,400 segments) plus the room polygon.
- **Impact.** Each of these plates is a line diagram that currently prints as a 1 mm pixel mosaic on an 8 in sheet, and a coarser one at poster size. The grid slider caps at 224, so the note's 'raise the grid' cannot fix it.
- **Fix.** Ranked by visual gain and effort. (1) cloak, loschmidt, veselago, hopf: emit polylines with the plate's colour (stroke width = the splat footprint), about 20-30 lines each. (2) reuleaux 'shape' as exact SVG arcs (A commands); 'roll' as 24 paths with fill-opacity approximating the 0.35-per-frame overlap. (3) purcell: body segments plus trail. (4) kakeya and darkroom: needles or rays with stroke-opacity. Their plates are overlap-count densities mapped through the palette ramp, so fidelity is only approximate and should be checked against export.js; alternatively, re-evaluate the geometry at print resolution in exportPNG.
- **Risk.** No recipe risk (export only, same geometry). For the overlap-density ones (kakeya, darkroom, reuleaux roll), alpha compositing is not the plate's linear-count ramp, so the print will look somewhat different. Gate them with the fidelity check or keep them raster.
- **Tabs.** cloak, veselago, loschmidt, hopf, reuleaux, purcell, kakeya, darkroom

#### V10-hofstadter-point-set (minor, improvement, effort small)

- **Claim.** The Hofstadter butterfly is an exact point set (7,044 eigenvalues at the default q <= 32), splatted into a fixed 640x640 buffer and smooth-upscaled 3.75x. The tab also declares no fieldCells, so the engine renders it at 2x (4800 px) and averages down, which is slower and adds nothing.
- **Evidence.** cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js:399 `sizeOf(){ return [640, 640]; }`; exportPNG :470-486 uses drawImage(buf,0,0,w,h) with smoothing. 8 in export note: 'Rendered at print pixels with 2x supersampling'; export 5.85 s against 1.29 s for a direct 1x exportPNG. Crop: candidates.crops.png shows soft 4-px blobs. Point count computed from the loop bounds: q<=32 gives 7,044, q<=36 gives 9,520, q<=44 gives 17,942.
- **Impact.** Individual eigenvalues print as fuzzy smudges instead of the crisp dust that makes the butterfly legible up close.
- **Fix.** Immediate: add `fieldCells(){ return [640,640]; }` to drop the useless supersample. Better: keep the sorted eigenvalues (p/q, E, Chern) and either emit an SVG of small rects or circles (about 18k elements at most, well under 1 MB) or re-splat at print resolution in exportPNG so the density semantics are kept.
- **Risk.** No recipe risk. The SVG changes the look from a tone-mapped density to discrete points, so check it against the plate.
- **Tabs.** hofstadter

#### V11-svg-has-no-physical-size (minor, defect, effort small)

- **Claim.** Downloaded SVGs have unitless width/height equal to the pixel count at the chosen ppi, so their physical size is wrong. An 8 in / 300 ppi export imports as 25 in (96 px/in: Inkscape, browsers) or 33.3 in (72 px/in apps), and it changes when only the ppi changes.
- **Evidence.** engine.js:166-169 svgDoc writes `width="' + w + '" height="' + h + '"` in user units. fitPrintSVG (engine.js:2513-2524) returns early when art equals sheet, and otherwise also writes pixel widths. Every saved SVG root is unitless (e.g. tilings `width="2400" height="2400"`). The in-page test (unitstest.js) shows Chromium gives naturalWidth 768 for width="8in", confirming 96 px/in, so 2400 means 25 in. The RIP is unaffected: drawImage at 2400 px produced identical line and edge profiles for the px and in versions.
- **Impact.** Someone who sends the SVG to a print shop or places it in Illustrator or InDesign gets artwork 3-4x the ordered size, and must know to rescale.
- **Fix.** After the RIP, when preparing the download (fitPrintSVG or equivalent), always set the root to width=sp.wIn+'in' and height=sp.hIn+'in', and keep the pixel viewBox.
- **Risk.** None: the RIP uses the module's SVG before this step, and the test shows the Chromium RIP is identical either way.
- **Tabs.** all 33 vector tabs

#### V12-sharp-js-blind-spots (minor, defect, effort small)

- **Claim.** sharp.js, which the concurrent sweep uses, misjudges exactly the plates this dimension is about. Sparse vector drawings score edge 0 and are called SOFT, while nearest-neighbour mosaics of geometry score as sharp.
- **Evidence.** tools/sharp.js:105 takes the 99th percentile of 1-px differences, and :130 treats edge < 0.15 as noEdges and so SOFT. Reproducing the exact method (central 1100 crop, stride 2; sharpmetric.py) on real 8 in / 300 ppi exports: SLE (vector RIP) edge 0.00, SOFT (only 0.48% of pixel pairs differ by more than 10, so p99 = 0); phyllotaxis (vector) 0.06, SOFT. Meanwhile the 12.5-px mosaics score hopf 0.84 'sharp', darkroom 1.25 'sharp' and kakeya 0.77 'ok'.
- **Impact.** The re-run sharpness table will list crisp vector tabs among the soft ones and hide mosaic tabs among the sharp ones, which would misdirect the fix list.
- **Fix.** In sharp.js, report verdict 'vector' when the export note contains 'Rasterized from SVG'. Add a blockiness term for fieldCells tabs: the share of 1-px difference energy at column and row offsets that are multiples of the reported px/cell, where a mosaic scores near 1. Alternatively, compute the edge percentile over non-flat pairs only.
- **Risk.** Tooling only.
- **Tabs.** sle, phyllotaxis (false SOFT); hopf, darkroom, kakeya and other magnified geometry (false sharp)

#### V13-pdf-tiff-are-raster-for-vector-tabs (minor, improvement, effort large)

- **Claim.** PDF and TIFF are always built from the RIPped PNG, so a print shop that wants a PDF never receives the vectors, even on the 27 tabs whose SVG is faithful.
- **Evidence.** engine.js:2771-2787 decodes lastUrl (the PNG), flattens it to RGB and calls GenChasePrintFormats.pdf(rgb, ...). print-formats.js:13-40 writes one /Plate image XObject. Nothing reads the SVG.
- **Impact.** Print shops, and cutters or plotters that take PDF, get a 300 ppi raster instead of resolution-independent line art for tilings, lozenge, aztec, UST, SLE and the others.
- **Fix.** Add an SVG-to-PDF content-stream writer for the subset the modules emit: rect, circle, ellipse, line, polyline, polygon, path M/L/Z/A, fill and stroke opacity (ExtGState), clipPath, and the linear gradients in crapper, eight, gerstner and hasimoto. Use it when usedVector is true, keeping the existing bleed and crop-mark code. Otherwise, document that the SVG is the vector deliverable.
- **Risk.** None to recipes. Needs its own round-trip test (for example pdftoppm against the RIP).
- **Tabs.** all vector tabs

#### V14-svg-hygiene (nit, improvement, effort small)

- **Claim.** Minor SVG hygiene. Tilings emits many polygons wholly outside the sheet; molecular writes 17-digit coordinates; no SVG carries the recipe or credit; and the techniques.json `vectors` flag is per tab although most exporters are per view.
- **Evidence.** tilings 8 in SVG: 1,008 of 3,454 polygons (179 KB of 457 KB) lie wholly outside the viewBox (e.g. y 2595-2687 in a 2400 sheet). molecular: maximum 17 decimals (98 KB, harmless). grep for <title>, <metadata> and <desc> finds nothing in any saved SVG. techniques.json marks chladni, kpz, landscape, bec, xy, crapper, gerstner and phyllotaxis `vectors: true`, but only 1-2 of their 7-9 presets actually produce an SVG (fid-all.jsonl).
- **Impact.** The off-sheet polygons appear as objects hanging off the artboard in Illustrator and Inkscape. There is no way to recover the recipe from a vector file. The catalog overstates vector coverage.
- **Fix.** Cull polygons by bounding box in the tilings exporter. Round the molecular coordinates to 2 decimals. Add `<title>` with the tab name and seed, and `<metadata>` with the recipe hash and credit, in svgDoc. Make the catalog flag 'some views' where exportSVG is view-gated.
- **Risk.** None.
- **Tabs.** tilings, molecular, all vector tabs (metadata), catalog

**Already good:** Classification of all 130 tabs. 33 have exportSVG: aztec, bec (vortices view), chladni (contour style), crapper (woodcut), direct-gravity, double-triangle-bound, eight, flow, gerstner (woodcut), grains, growth (broken, V1), hasimoto, hyperbolic, kpz (rings), landscape (network), lozenge, molecular, neural-mass, parallelogram-lock, quincunx-lock, rmt, sle, surfaces, three-vortex-bound, tilings, ust, xy (lic), phyllotaxis, hl, lichtenberg, snowflake, pearls, smectic. 11 are mark-based without vectors (V7-V10): apollonian, stealth, cloak, veselago, loschmidt, hopf, reuleaux, purcell, kakeya, darkroom, hofstadter. 5 have marks only in non-default views: weierstrass graph/rough, devil stair, exceptional gap, photon equatorial/orbit, boy param. 8 are discrete lattice cells, for which a nearest-neighbour raster is honest: ising, percolation, sandpile, cyclicca, rotor, potts, spinice, timecrystal. 7 are accumulated density, where raster is correct per AGENTS.md: attractors, physarum, physarum3d, chirikov, web, plasma, and swarm's density view (its agents view already paints at print resolution via paint(g,w,h)). The remaining 66 are PDE, GL or per-pixel fields.; 26 of the 33 vector tabs produce SVGs faithful to their raster on every preset (SVG RIP vs exportPNG at 1000 px, maximum MAD in brackets): aztec 2.2, bec marks 0.0, direct-gravity 0.95, double-triangle-bound 0.38, gerstner woodcut 5.6, grains 1.5, hyperbolic 0.9, kpz rings 0.33, landscape network 0.21, lichtenberg 1.0, lozenge 5.2, molecular 1.7, neural-mass 1.8, parallelogram-lock 2.4, pearls 0.8, phyllotaxis 0.06, quincunx-lock 1.35, rmt 3.9, sle 0.49, smectic 3.5, snowflake 2.05, surfaces 2.15, three-vortex-bound 1.7, tilings 7.5 (anti-aliasing of hairlines only; visually identical on inflation, ammann and hatline), ust 5.5. Growth becomes faithful (<= 3.0) with the one-line fix. Edge alignment F >= 0.95 on nearly all of them, and the best integer shift is 0,0 on every 8 in comparison.; Every SVG saved at 8 in / 300 ppi (aztec, bec, chladni, flow, hl, lichtenberg, lozenge, molecular, phyllotaxis, sle, tilings, ust) passes xmllint and has a viewBox equal to the art pixel size. None embeds a raster <image>, filter or blend mode, so the files are true vectors that any RIP can read.; SVG size is nowhere near a problem. The largest seen is 5.3 MB (rmt semicircle) and 4.8 MB (aztec fine) at 24 in / 300 ppi, because element count does not scale with print size. The slowest exportSVG build is 2.7 s (grains slip), and most take under 100 ms.; The engine's vector path is well built. It accepts string or Blob and RIPs at print pixels; Chromium re-rasterizes an SVG at the destination size, verified pixel-identical for px and in units. fitPrintSVG nests the art centred on the sheet, and a failed SVG falls back to exportPNG. View-gated exporters that return null or throw (bec, chladni, kpz, landscape, xy, crapper, gerstner, phyllotaxis voronoi) correctly fall back to raster, and the print-check panel says 'Source artwork was rasterized from vectors'.; Adding exportSVG is recipe-safe by construction. It reads existing geometry and never touches state or RNG, as shown by the Apollonian and Stealth prototypes, which pass `node tools/export.js <id> 8 300` on all 15 presets with plate-vs-print MAD <= 3.7. Returning null from a divergent exporter restores the plate-faithful raster with no recipe impact either.; Prototypes and tools for follow-up are in /tmp/claude-0/-home-user-GENChase/04604b4b-7efe-5ca6-9b53-4838030930e5/scratchpad/print/vector/: prototypes.patch (apollonian and stealth exportSVG, the growth fix); fidelity.js (the per-preset SVG-vs-raster sweep, results in fid-all.jsonl, thumbnails in fid/); svgprobe.js and analyze.py (real export button plus XML and size checks); sharpmetric.py (exact sharp.js metric); screenshots in three/. The worktree with the prototypes built is scratchpad/print/vector-wt (not committed). wt-print was not touched.

### Large formats

#### LF1 (major, defect, effort medium)

- **Claim.** Print TIFF, Print PDF, JPEG, WebP and raster smoothing all stop working above 48 MP. A typical desktop exports a 24x36 in poster at 300 ppi as 77.8 MP, so the formats print shops ask for are unavailable at poster size. The user only finds this out from a toast after the render has finished.
- **Evidence.** Where the limit is set: engine.js:2777 (exportPrintFormat throws above 48e6), engine.js:2803 (transcodeExport, same limit), print-formats.js validate() (width*height > 48e6), print-smoothing.js smooth() (48e6), tools/prepress.py:48. Measured with the engine probe set to 16384: holomorphic at 24x36 in, 300 ppi exported a 7200x10800 PNG in 46.8 s. Pressing Print TIFF then showed the toast 'Could not make TIFF: PDF and TIFF currently support up to 48 million pixels; lower the print resolution or use PNG.' I mirrored the engine arithmetic in large-format/spec.js. On a 16384 GPU, every 300 ppi sheet above about 20x27 in is PNG-only: 20x30 is 54 MP, 24x36 is 77.8 MP, 24x36 at 360 ppi is 112 MP, and 40x60 is 132 MP. The dims line gives no warning before the render. Streaming prototype (large-format/tiffproto.js): a TIFF written in 64-row strips from 512-row canvas bands took 2.0 s at 7200x10800 with peak RSS +142 MB. The shipped approach (full canvas, getImageData and an RGB buffer) needed +873 MB at the same size. The prototype's pixels matched the PNG exactly (max abs diff 0), and Pillow reads it as (7200,10800) RGB at dpi (300,300) with 169 strips. Chromium's canvas.toBlob encoded 132 MP in 1.0 s as JPEG, 9.2 s as WebP and 2.1 s as PNG (large-format/enc.js), so the browser is not what imposes the 48 MP limit.
- **Impact.** Someone ordering a 24x36 in or larger poster cannot download the TIFF, or the PDF with bleed and crop marks. They are left with a PNG that has no physical-size metadata (see LF2) and have to add bleed in another program. They only learn this after waiting for the render.
- **Fix.** Write both containers in strips. Draw 512-row bands of the decoded sheet into a strip canvas, pack the RGB and push each band as a Blob part. For TIFF, write StripOffsets and StripByteCounts arrays for 64-row strips and keep the ICC tag. For PDF, deflate the bands through one CompressionStream and write /Length as an indirect object after the stream. Raise the JPEG, WebP and smoothing limits to MAX_AREA (132e6). Move the negative control in tools/print-formats-check.js, which currently expects 9000x9000 to be rejected, and the 48 MP limit in tools/prepress.py.
- **Risk.** No effect on recipes or pixels. Memory stays bounded at about 7 B/px (the decoded sheet plus the Blob parts), where the shipped path needs about 15 B/px or more. A 132 MP uncompressed TIFF is about 400 MB, which fits the classic TIFF 4 GB limit. Only Chromium was measured, not Safari or Firefox.
- **Tabs.** all

#### LF2 (major, defect, effort small)

- **Claim.** The exported PNG and SVG do not record their physical size. The PNG has no pHYs or sRGB chunk. The SVG gives its width and height as unitless pixels of the raster, which may have been clamped. At poster size, only the filename says how big the print is meant to be.
- **Evidence.** In every export I ran (cahn, holomorphic, tilings, attractors, chirikov) the PNG contained only the chunks [IHDR, IDAT]. engine.js:166-169 (svgDoc) writes width and height without units. For tilings at 24x36 in on the 8192 device the SVG header was viewBox="0 0 5461 8192" width="5461" height="8192". Unitless SVG lengths are CSS px (1/96 in), so that reads as 56.9x85.3 in. A PNG without pHYs falls back to the editor's default resolution, commonly 72 ppi: that is 75.8x113.8 in for the clamped file, or 100x150 in for a 7200x10800 file. Prototype (large-format/phys.js): inserting pHYs (the effective ppi as px/m) and sRGB after IHDR, with no re-encode, took 6 ms on a 3600x3600 export. Pillow then read dpi=(299.9994, 299.9994) and srgb=0; before the change both were None.
- **Impact.** A print shop or RIP opens the PNG at the wrong physical size. The clamped 228 ppi file is the worst case: if the operator assumes 300 ppi, the print comes out at 18.2x27.3 in instead of 24x36 unless they read the filename. The SVG opens at 57x85 in.
- **Fix.** After the final PNG is encoded in doExport (after composeSheet or fitPrintSheet), splice in a pHYs chunk carrying pw/wIn and ph/hIn converted to px/m, plus an sRGB chunk. In the downloadable SVG (fitPrintSVG and the export-svg blob), set width="<wIn>in" height="<hIn>in" and keep the viewBox. Leave the SVG that loadImage uses for the in-browser RIP unchanged.
- **Risk.** None. Pixels and recipes are unchanged, and the cost is a few milliseconds. JPEG and WebP density metadata was not checked.
- **Tabs.** all (the SVG part: all vector tabs)

#### LF3 (major, defect, effort small)

- **Claim.** Several density-image tabs render from a small fixed-size buffer and scale it up to the print size without declaring that resolution. At poster size their real detail falls to 27-167 ppi, but the file, the note and the print check all say 300 ppi and give no warning.
- **Evidence.** chirikov tone-maps a buffer with a 720 px long edge and smooth-scales it to the print size (swarm.js:323 'const long = 720', :471-476). caustics does the same at 720 px (cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js:743, :785-790). hofstadter uses 640x640 (same file :399, :469). attractors accumulates at no more than 4000 px and then upscales bilinearly (attractors.js:15, :620, :639). None of them implement fieldCells(), so the print check prints 'Intrinsic simulation resolution is not declared' (engine.js:2537) and 'no basic layout/resolution warnings'. Measured with large-format/spec.py (spectral power over a 2048 px Hann-windowed crop): chirikov at 24x24 in and 300 ppi (7200x7200) has 0.012% of its AC power above 0.3 of Nyquist, which is consistent with 720 px of real content; its note said 'Rendered at print pixels.' attractors at 24 in has 0.07% of its power above 0.75 of Nyquist, against 1.9% for the 12 in export, and 0.97% against 4.9% above 0.56 of Nyquist. That is consistent with a 4000 px source. Its note mentions only the point-budget cap. Because fieldCells is missing, the shell also supersamples these tabs 2x whenever the art is under 33 MP (engine.js:2661-2662), which costs time and memory and adds no detail. The same missing declaration applies to magnified grid tabs: nematic (grid 512, nematic.js:358), dendrite (384, :231), life (256, :324), xy (256, :305), physarum (res 384-2048) and potts (lattice 192-400).
- **Impact.** A 24 in chirikov or caustics print carries about 30 ppi of detail, hofstadter about 27 ppi and attractors about 167 ppi. On a poster this shows as soft, interpolated gradients, and nothing in the UI warns about it.
- **Fix.** (a) Immediately, implement fieldCells() returning [BW, BH]. For attractors, return the accumulation size exportPNG will actually use. The print check will then report cells per inch and warn, and the shell will stop supersampling these tabs. (b) Properly, re-accumulate the density at print resolution inside exportPNG, the way attractors already does up to 4000 px. Scale the orbit or point budget with area, use a separate export RNG stream (U.makeRng(seed + '/export')), and report progress and honour cancel through Studio.exportJob. Raise EXPORT_MAX_RES and EXPORT_CAP in attractors within a time budget.
- **Risk.** (a) Recipes are unaffected because fieldCells is not in the hash. Export pixels change because supersampling goes from 2x to 1x. (b) Exports take longer, since the number of points grows with area. The noise pattern will differ from the screen. On-screen state must not be mutated. Recipes stay safe if a separate RNG tag is used.
- **Tabs.** chirikov, caustics, hofstadter, attractors (declaration also missing on nematic, dendrite, life, xy, physarum, potts)

#### LF4 (minor, defect, effort small)

- **Claim.** The engine clamps every tab's print size to the GPU texture limit. That includes vector tabs, CPU canvas tabs and tabs that already render in tiles, none of which are bound by that limit, and the message blames the GPU for them. On a GPU that reports 8192, a 24x36 in poster drops from 300 to 228 ppi and a 40x60 in poster drops from 235 to 137 ppi for no reason.
- **Evidence.** engine.js:2196-2201 probes MAX_TEXTURE_SIZE once, and printSpec (engine.js:2226) applies it to every tab. SwiftShader limits measured with large-format/limits.js: MAX_TEXTURE_SIZE 8192, MAX_RENDERBUFFER_SIZE 8192, MAX_VIEWPORT_DIMS [8192,8192]. 2D canvases of 16384x16384 and 65535x100 allocate fine. What happens at each size (large-format/spec.js mirrors printSpec and the supersampling rule): (1) 24x36 in at 300 ppi is 7200x10800, 77.8 MP. On a GPU reporting 16384 (reasoning, not measured) nothing is clamped. Supersampling is off because 4x the area exceeds 132 MP. Canvas tabs draw one 7200x10800 canvas (attractors: 12 s, +1.47 GB). GL field tabs draw one full-size target. fractal draws one 9000x13500 target after its own 1.25x supersampling. Tiled tabs use 1024 px tiles (holomorphic: 46.8 s, +1.22 GB). Vector tabs rasterize the SVG at print size. Only PNG is available (LF1). On an 8192 GPU (measured, SwiftShader) every tab is clamped to 5461x8192 at 228 ppi with the message 'Requested 300 ppi was clamped to this device's GPU texture limit (8,192 px)'. I saw this on tilings (3.5 s), cahn (8.5 s) and holomorphic (90 s, +1.93 GB). holomorphic had actually rendered 10922x10922 internally through its tiles, far past the limit it was clamped for. (2) 40x60 in at 300 ppi (200 ppi is not offered) is 12000x18000. On a 16384 GPU it goes through the 16000 px edge limit and then the 132 MP limit, ending at 9380x14071 and 235 ppi. Measured: tilings 3.9 s, holomorphic 81 s. On an 8192 GPU it lands at 5461x8192 and 137 ppi. At 200 ppi, 40x60 would be 8000x12000 (96 MP): unclamped on a 16384 GPU, 5461x8192 on an 8192 GPU. With only the engine's probe raised to 16384 (every real GL call still limited to 8192), the same device exported tilings, attractors and holomorphic at a full 7200x10800 without errors. The holomorphic tiles have no visible seams: the pixel gradient at the 1024 px tile boundaries is 0.96-1.02 times the neighbouring columns and 0.95-1.12 times the neighbouring rows. On GPUs reporting 16384 this clamp never takes effect, because the 16000 px edge limit applies first.
- **Impact.** On devices reporting 8192, a 24x36 in poster from any vector, CPU or tiled tab comes out at 228 ppi instead of 300, and a 40x60 in poster at 137 ppi instead of 235. The reason given is wrong for those tabs. SwiftShader and software-GL fallback are measured; some integrated and mobile GPUs report 8192, which is reasoning rather than measurement.
- **Fix.** Make the device limit per tab. Add an optional instance method, for example exportMaxEdge(), defaulting to Infinity. Single-target GL exporters return min(MAX_TEXTURE_SIZE, MAX_RENDERBUFFER_SIZE, MAX_VIEWPORT_DIMS); dynamics.js tabs return Infinity. printSpec, the dims line and the clamp message then use the current tab's value. Retarget the 'one pixel over device cap' test in tools/ui.js:326-333 at a single-target GL tab. Document the method in CONTRACT.md and ENGINE-API.md as optional.
- **Risk.** Low. No recipe keys change, and the API addition is additive. Low-memory devices, which often report 8192, would then build bigger sheets, but MAX_AREA still caps them.
- **Tabs.** all vector tabs, all CPU canvas tabs, holomorphic/orbitals/pendulum (dynamics.js)

#### LF5 (minor, improvement, effort large)

- **Claim.** GL tabs that draw the whole print in one target use about twice the memory per pixel of the tiled path. They also run a single fragment pass of up to 132 MP, and that pass cannot be cancelled or show progress. The existing tiled exporter could be shared by all of them.
- **Evidence.** Single full-size target, full readback, ImageData and canvas: pde.js:515-530, rdx.js:509, nematic.js:614-630, cortex.js:543, cppn.js:372-388, lattice.js:111-126, the cgl render at cgl-...js:309, and fractal and physarum3d. Measured on SwiftShader, whose RSS includes GPU memory: cahn at 7200x7200 took +1.62 GB (about 31 B/px) in 8.6 s. The tiled holomorphic at 7200x10800 took +1.22 GB (about 16 B/px). RSS was sampled every 200 ms over the Chromium process tree, so the peaks are approximate. On a 16384 GPU the shell will ask these tabs for up to 9380x14071 in one target. Extrapolating the measured per-pixel cost gives about 4 GB of host memory; that figure is a projection, because SwiftShader stops at 8192. A single 100+ MP pass is also exposed to OS GPU watchdogs (Windows TDR), which is reasoning, not measured. The tiled path shows 'Tile k of N' and can be cancelled between tiles (dynamics.js:83-110). A single-target export shows only elapsed seconds and cannot be interrupted mid-draw. Blocker for tiling: grain and dither hash gl_FragCoord (pde.js:262, rdx.js:236, nematic.js:226, cortex.js:145; 18 files in all), so a naive tiling would repeat the grain every 1024 px.
- **Impact.** Poster-size exports of the pde, rdx, nematic, cortex, cppn and lattice families on 16384 GPUs risk running out of memory ('Export failed at this size') or losing the GPU context. There is no progress indicator and no way to cancel. With tiling, per-pixel tabs could also stay above the texture limit on 8192 devices.
- **Fix.** Move exportTiled from dynamics.js into the shared G helpers. Add 'uniform vec4 u_tile' to QUAD_VS (engine.js:193-195) so that v_uv = u_tile.xy + (a_pos*0.5+0.5)*u_tile.zw, with (0,0,1,1) as the default and applied only when drawing into the export tile target. Add a u_fragOff uniform to the grain and dither hashes. Test: at sizes at or below maxTex, the tiled export must be byte-identical to the single-target export. Per-tile supersampling then becomes possible without a 2x full-size canvas.
- **Risk.** Implementation risk is moderate because many shaders need editing, and a missed u_fragOff would show as repeating grain. The byte-identity test catches that. No recipe changes.
- **Tabs.** single-target GL tabs: amb, cahn, ohta, swift, pfc, ks, cyclic, vegetation, excitable, turing, chemotaxis, nematic, cortex, bec, tonertu, liesegang, cppn, fractal, physarum3d, cgl, lattice family, reaction, fluid, dendrite, life, xy and similar

#### LF6 (minor, defect, effort small)

- **Claim.** fractal and physarum3d apply their own supersampling on top of the shell's 2x. When the result exceeds the texture limit, they upscale it bilinearly, contrary to the contract. The result is a huge intermediate PNG and about 2.5 GB of memory for a 45 MP sheet.
- **Evidence.** The shell calls exportPNG(2*rw, 2*rh) when rw*rh*4 < 132 MP (engine.js:2662). fractal then multiplies by its own supersampling factor (1.25-2, fractal.js:557-561; ssaa defaults to true, :335). It fits the result to MAX_TEXTURE_SIZE and then calls U.upscale back up to the requested size (fractal.js:562-568). physarum3d.js:640-649 does the same. CONTRACT.md:119 says per-pixel techniques 'never upscale'. Measured: fractal at 24x36 in, 300 ppi on SwiftShader. The 5461x8192 file came from an 8192x8192 render, upscaled bilinearly to 10922x10922, encoded as a 119 MP PNG, decoded by the shell and downsampled to 5461x5461. It took 211 s with peak RSS +2.55 GB.
- **Impact.** The final print looks fine (about 1.5x effective supersampling). But a 45 MP poster needs about 2.5 GB and minutes of render time, and on a 4 GB machine it can fail with 'Export failed at this size' even though the sheet is well within the limits.
- **Fix.** Let a module declare that it does its own anti-aliasing (a register key, or a flag the shell reads) so the shell passes 1x. Alternatively, have fractal and physarum3d cap their internal supersampling at maxTex and never call U.upscale. Best: render through the shared tiled exporter (LF5) with per-tile supersampling.
- **Risk.** Export pixels change slightly; recipes do not.
- **Tabs.** fractal, physarum3d

#### LF7 (minor, improvement, effort small)

- **Claim.** The large-format messaging is incomplete in both directions. It does not warn about limits the user will hit: PNG-only above 48 MP, no 2x supersampling above 33 MP, and internal buffers (LF3). It does raise alarms that do not matter, such as the ppi clamp on grid-limited plates. There is also no way to choose a deliberate poster resolution below 300 ppi.
- **Evidence.** (a) The dims line (engine.js:2257) shows effective ppi only after a clamp. It says nothing about which download formats the sheet size allows or about supersampling being turned off. The format refusal comes only as a toast after rendering (engine.js:2777, 2790). (b) Measured cahn at 24x36 in: the 512 x 512 grid gives 21.3 cells/in, with one cell about 10.7 px at 228 ppi, so the texture clamp costs no visible detail. The report still lists 'Below the 300 ppi close-viewing guideline' and 'The device reduced the requested resolution.' (c) PRINT_DPI (engine.js:2193) offers only 300/360/450/600. 40x60 at 200 ppi cannot be requested. It reaches 235 ppi only through the 132 MP limit, which the report labels 'The device reduced the requested resolution' and 'Clamped to what a browser can encode.' (d) With fit-to-sheet, a square plate on a 40x60 in sheet spends a third of the 132 MP budget on background padding (tilings: 9380x9380 art on a 9380x14071 sheet). The SVG avoids this, but the UI never suggests it.
- **Impact.** Poster buyers cannot tell which export limits actually cost detail. They discover missing formats late, and they cannot deliberately choose the 150-240 ppi that large-format printing commonly uses.
- **Fix.** Before the export, list which formats the sheet size allows and whether supersampling applies. In the print check, put the file ppi next to the simulation's cells per inch, and say plainly when a clamp costs no detail (cells per inch at or below half the effective ppi). Add 150, 200 and 240 ppi to PRINT_DPI; saved printer presets validate against PRINT_DPI, so they pick these up automatically. Word a chosen ppi differently from a device clamp. For vector tabs above 132 MP, recommend the SVG.
- **Risk.** None to recipes; this is copy and UI only.
- **Tabs.** all

**Already good:** Device clamps are disclosed. Before export the dims line shows the effective size and ppi, for example '5,461 × 8,192 px · 228 ppi', and the tooltip gives the reason. The export dialog says 'Requested 300 ppi was clamped...', and the filename carries the effective ppi ('...-24_0x36_0in-228ppi.png'). Checked on cahn, tilings and holomorphic.; TIFF and PDF carry the correct physical size and an sRGB ICC profile. TIFF X/YResolution is pixels divided by sheet inches, and the PDF MediaBox is in points, with UserUnit for pages over 200 in (print-formats.js). A 45 MP TIFF of cahn at 24x36 in / 228 ppi saved in 3.6 s on software GL.; The tiled exporter in dynamics.js (exportTiled, 1024 px tiles) is correct and cheap. At 7200x7200 holomorphic shows no tile seams: the gradient at tile boundaries is 0.95-1.12 times its neighbours. It reports progress per tile and can be cancelled between tiles. Peak memory is about 16 B/px (+1.22 GB at 77.8 MP), and it already renders past the 8192 texture limit (10922x10922 internally).; The 132 MP limit works cleanly. 40x60 at 300 ppi produces a 9380x14071 PNG labelled 235 ppi (tilings 3.9 s, holomorphic 81 s on SwiftShader). Chromium allocates 16384x16384 canvases and encodes 132 MP as PNG in 2.1 s, so MAX_EDGE 16000 and MAX_AREA 132e6 are conservative, sound limits.; Grid-limited GL tabs skip pointless 2x supersampling and tell the user the magnification: 'The field is 512 × 512 cells, so one cell is about 10.7 px here and the detail is set by the simulation, not by the paper'. The print check reports cells per printed inch when fieldCells() is declared.; Vector tabs scale well. The tilings SVG is about 470 KB at any print size, and rasterizing it (the vector RIP) at 132 MP takes about 4 s.; Export failures give a readable message ('Export failed at this size (...)'). A module that throws at 2x supersampling falls back to 1x automatically. Print size never touches the recipe hash (tools/ui.js test 'print dimensions leave recipe alone').; Scripts, results and my own worktree: /tmp/claude-0/-home-user-GENChase/04604b4b-7efe-5ca6-9b53-4838030930e5/scratchpad/print/large-format/ (big.js drives the export UI with an optional GPU-probe override; tiffproto.js, phys.js, spec.js, spec.py, enc.js, limits.js; *.json run records) and the worktree at /tmp/claude-0/-home-user-GENChase/04604b4b-7efe-5ca6-9b53-4838030930e5/scratchpad/print/large-format-wt, with source unmodified and only built. The shared wt-print checkout was not touched.

### Sheet layout, captions, bleed

#### sheet-1-pdf-tiff-48mp-poster-refusal (major, defect, effort small)

- **Claim.** Print PDF and Print TIFF refuse any sheet over 48 MP. At the lowest ppi the studio offers (300), that is any sheet over about 533 sq in, so 24x24, 20x30, 24x36 and A1 posters cannot get the print-shop formats. The error says to lower the print resolution, but no option below 300 exists.
- **Evidence.** src/shared/engine.js:2777 and src/shared/print-formats.js:9 both reject w*h > 48e6. PRINT_DPI at src/shared/engine.js:2193 is [300,360,450,600]. I ran scratchpad/print/sheet/limit-probe.js on phyllotaxis, custom 24x24 in at 300 ppi (7200x7200 = 51.8 MP): the PNG exported, and Print PDF showed the toast 'Could not make PDF: PDF and TIFF currently support up to 48 million pixels; lower the print resolution or use PNG.' Arithmetic from printSpec (not device-tested beyond this run): on a GPU with a 16384 texture limit, 24x36 at 300 ppi = 77.8 MP, so it is refused. Square plates fail from the 24 in preset up on any device. On an 8192-texture device such as SwiftShader, 24x36 is clamped to 5461x8192 = 44.7 MP and goes through. So the weaker GPU can make the poster PDF and the stronger GPU cannot. The time limit is not what blocks this: the 44.7 MP PDF took 4.5 s, and its TIFF was 134 MB.
- **Impact.** Someone making a standard 24x36 or A1 poster gets only a PNG with no physical-size metadata (see sheet-4). They cannot hand the shop the ICC-tagged PDF or TIFF that docs/PRINTING.md recommends, and the fix the message suggests is not available in the UI.
- **Fix.** (a) Small: add 150, 200 and 240 ppi entries to PRINT_DPI so the message's advice can be followed (24x36 at 200 ppi = 34.6 MP; at 240 ppi it is 49.8 MP, still over). validPrinterPreset still accepts old presets because the list only grows. (b) Medium: convert in strips. Call getImageData on about 256 rows at a time, write RGB rows straight into a CompressionStream for PDF and into Blob parts for TIFF, and do any bleed mirroring per row. That removes the full-frame ImageData (4 B/px) and the RGB copy (3 B/px), so the ceiling can rise toward the PNG MAX_AREA of 132 MP at about the same peak memory. (c) Rewrite the error message to name the largest sheet that fits at the current ppi.
- **Risk.** No effect on recipes, because print settings are not in the hash. With (a), the print check already warns below 300 ppi. With (b), browser memory on 80-130 MP sheets needs a real-device test; the TIFF stays uncompressed unless Deflate or PackBits is added.
- **Tabs.** all (any sheet over 48 MP; square plates from 24 in, 2:3 plates from 30 in on 16k-texture GPUs)

#### sheet-2-bleed-by-enlargement-moves-caption-and-content (major, defect, effort small)

- **Claim.** PDF bleed is made by enlarging the whole rendered sheet about its centre. As a result: the trim no longer shows the exported pixels; effective ppi drops; and on small sheets the colophon text is pushed to 1.4-3.6 mm from the cut, inside a typical 3 mm safe zone.
- **Evidence.** src/shared/print-formats.js:22-25 uses scale = max((w+2b)/w,(h+2b)/h) and draws the plate at that scale. Measured on a real 4x6 in cahn colophon export with 3 mm bleed and marks (export-probe.js + analyze.py, PyMuPDF render of the trim): image scale 1.05906; effective ppi in the PDF 283.3 instead of 300; caption ink moved from 7.70 to 3.64 mm off the bottom trim and from 5.59 to 2.88 mm off the left trim. The analytic prediction was 3.65 and 2.92 mm, so it matches. The same model applied to layout-probe.json gives 1.42 mm from the left trim at 6x4 (bottom caption) and 1.42 mm from the top trim at 4x6 (right caption). For a full-bleed 8x8 plate: 291.4 ppi, and the trim render differs from the PNG with MAD 27.1 grey levels, with only 6.4% of pixels within 2 levels. docs/PRINTING.md:48-50 acknowledges the crop and tells users to review the caption themselves.
- **Impact.** On 4x6, 5x7 and 6x4 cards, caption text sits 1.4-3.6 mm from the cut, so a normal trimming tolerance can shave it and a shop preflight will flag text outside the safe area. On every PDF with bleed, the printed plate is a resampled 1.03-1.06x crop, not the pixels that went into the PNG and TIFF. That undercuts exact reprinting, which is the product's claim.
- **Fix.** Prototyped in scratchpad/print/sheet-wt (diff: scratchpad/print/sheet/prototype.diff). Extend the RGB buffer by ceil(bleed*ppi) pixels per side with mirrored edge content (mirrorExtend in print-formats.js), and place the image so the TrimBox falls exactly on the original pixel boundary. Measured on the prototype: the image XObject is 1272x1872 for 4x6 and 2472x2472 for 8x8; its inner region is byte-identical to the PNG; the mirrored edge rows check out; ppi in the PDF is 300.0; caption ink is 7.70 / 5.50 mm from the trim, the same as the PNG. On colophon sheets the bleed band is the sheet colour (measured (250,247,241), deviation 0). tools/colophon-check.js passes at 1280, 390 and 320 px; build --check and lint pass. Update the hint at studio.html:549 and docs/PRINTING.md:48-51.
- **Risk.** tools/print-formats-check.py:21-23 asserts the bleed.pdf image is 300x150 and indexes pixels from 0. It has to accept 324x174 with a 12 px offset; I did not run it because pypdf fails to import in this environment. The prototype adds 3 B/px peak memory for the mirrored copy (about 144 MB at 48 MP); strip streaming (sheet-1b) removes that. Content near the edge of a full-bleed plate now reflects instead of continuing: a mis-cut into the bleed shows a mirror of the last 3 mm, not an enlargement. Recipes are unaffected.
- **Tabs.** all (PDF with bleed > 0); worst with colophon on sheets of 6 in or less

#### sheet-3-landscape-bottom-caption-shrinks-below-6pt (minor, defect, effort small)

- **Claim.** The caption position is one global preference that defaults to 'bottom'. On landscape sheets, a bottom caption shrinks the text below the studio's own 6 pt floor and leaves the art at about a fifth of the sheet. A side caption on the same sheet keeps 8 pt and more than doubles the art.
- **Evidence.** src/shared/engine.js:2283 (default 'bottom'), :2448 (maxH = 36% of the height), :2463-2464 (scale *= .85). layout-probe.json, cahn at 300 ppi: 6x4 bottom gives body 5.78 pt, title 7.95 pt, art 55.7 mm square (20.1% of the sheet); 6x4 right gives 8 pt and 90.4 mm (52.8%). maxwell gives the same 5.78 pt. The reverse on portrait: 4x6 bottom gives 6.8 pt body and art at 52.8%; 4x6 right gives 8 pt but art at only 21.6%; 8x10 bottom is 63.4% against 25.9% for right. The print check flags text under 6 pt (engine.js:2541) but does not suggest the other side.
- **Impact.** A postcard-size landscape print gets a 56 mm image in a sea of margin, with fine print below the 6 pt legibility floor. 4x6 portrait body text (6.8 pt) is under the 7-8 pt body-text norm.
- **Fix.** Add an 'Auto' position, and make it the default for new users. It runs sheetLayout for bottom and right, and picks the one with the larger art area whose smallest text is at least 7 pt (otherwise the one with the larger text). Record the resolved position in the print-job JSON (lay.position already exists). Add 'auto' to the list at validPrinterPreset (engine.js:2304) and to the select at studio.html:502.
- **Risk.** Layout only, so recipes are unaffected. Users who saved 'bottom' keep it. Needs a colophon-check case for auto.
- **Tabs.** all (colophon on)

#### sheet-4-png-jpeg-no-physical-size (minor, defect, effort small)

- **Claim.** The main PNG download carries no pHYs, sRGB or iCCP chunk, and the JPEG has JFIF density units 0 (aspect only). Print and editing software therefore opens both at 72 or 96 ppi instead of the size that was chosen.
- **Evidence.** Chunks in the exported 4x6 PNG: IHDR, IDAT, IEND only; PIL reports dpi None. JPEG: jfif_unit 0, density 1:1, dpi None. It does carry an ICC profile. By contrast the TIFF reads 300.0 dpi and 4.0x6.0 in. The PNG and JPEG come straight from canvas.toBlob (engine.js:156-162, :2808). docs/PRINTING.md:10 tells users to 'tell the shop the intended dimensions'.
- **Impact.** An 8x10 in, 300 ppi PNG opens as 33.3x41.7 in at 72 ppi in Photoshop, macOS Preview and many print-lab uploaders. 'Print at actual size' comes out wrong unless the user re-enters the size.
- **Fix.** Prototyped: GenChasePrintFormats.tagPng inserts pHYs (round(ppi/0.0254) px/m) and an sRGB chunk after IHDR, with CRC32; it runs on the final sheet blob at engine.js:2698. tagJpeg sets JFIF units to 1 and the density to the ppi in transcodeExport. Measured on the prototype: pHYs 11811 px/m, PIL dpi 299.9994; JPEG dpi (300, 300); TIFF unchanged.
- **Risk.** None to recipes, and the pixels are untouched. About 45 bytes are added and there is one extra pass over the blob (arrayBuffer copy, trivial next to encoding). WebP has no standard resolution field and is left as is.
- **Tabs.** all

#### sheet-5-caption-wrap-splits-values (minor, defect, effort small)

- **Claim.** Caption wrapping breaks an oversized token at arbitrary characters, so recipe values are split across lines with no marker. It also re-joins words with double spaces, which changes the spacing inside the title and equation.
- **Evidence.** engine.js:2419-2432 (wrapText joins with '  ' at :2423 and splits by character at :2425-2428). The palette is joined with ',' and no spaces (engine.js:2288). Lines captured from the 4x6 right-hand caption (scratchpad/print/sheet/lines-probe.js): 'dt=0.011527377521' / '613832'; 'palette=#1A1A1A,#' / '4A4A4A,#8C8C8C,#C' / '8C4BB,#E63B2E'; 'GENChase  ·' / 'Cahn–Hilliard'; '∂c/∂t  =  ∇·[M'. That column holds 33 lines at 17 characters.
- **Impact.** The colophon exists so a print can be reproduced. A reader transcribing the caption would read dt=0.011527377521 and a stray '613832', or a truncated hex colour '#C'.
- **Fix.** Keep the original whitespace. Break long tokens first after ',' and then after '='. When a character break is unavoidable, mark it with a continuation glyph or a hanging indent. Consider auto position (sheet-3) so narrow side columns are chosen less often.
- **Risk.** Caption text layout only; no effect on recipes.
- **Tabs.** all (colophon on, side positions and small sheets especially)

#### sheet-6-crop-marks-short-close-dvicegray (nit, defect, effort small)

- **Claim.** Crop marks are 3.5 mm long and start only 1.4 mm outside the bleed. With 0 bleed that is 1.4 mm from the trim. They are drawn in DeviceGray, so they land on the K plate only, not in registration colour.
- **Evidence.** print-formats.js:17 (markPad 18 pt), :27-31 (from b+4 pt to b+14 pt, '0 G'). Measured on the 4x6 PDF: 8 marks on the trim lines, 0.25 pt, offset 4.411 mm from the trim at 3 mm bleed (1.411 mm clear of the bleed), length 3.528 mm, ending 1.4 mm from the media edge. The brief's reference is about 3 mm offset and 5-6 mm length.
- **Impact.** The marks are usable but short and sit tight against the bleed. After a CMYK or PDF/X conversion with the prepress tool they appear on the black separation only.
- **Fix.** Prototyped: marks start 2 mm outside the bleed and run 5 mm, with 2 mm of paper beyond them (measured: offset 5.0 mm, length 5.0 mm, 2.0 mm clear of the bleed at 3 mm bleed). For offset work, optionally stroke the marks in [/Separation /All /DeviceCMYK] with a Type 2 tint function.
- **Risk.** The MediaBox grows by about 2.6 mm per side when marks are on. print-formats-check.py only asserts MediaBox > BleedBox, so it still passes.
- **Tabs.** all (PDF with cutting marks)

#### sheet-7-caption-fixed-8pt-on-posters (minor, improvement, effort small)

- **Claim.** The caption has a fixed physical size: 11 pt title and 8 pt body at every sheet size from 5x7 to 24x36. It shrinks on small sheets but never grows, so on posters it is fine print that can only be read from very close.
- **Evidence.** engine.js:2455 sets size = (11 or 8) * dpi/72. layout-probe.json: at 24x36, title 11 pt and body 8 pt (at the clamped 227.5 ppi); the caption block is about 34 mm tall on a 914 mm sheet, with 33.5 mm margins. The same 8 pt appears at 8x10.
- **Impact.** On a 24x36 poster, 8 pt text (cap height about 2 mm) can only be read up close, while the art is meant to be seen from a metre or more. The colophon looks like a footnote rather than a label. Some will call that intended; it should be a choice.
- **Fix.** Scale caption sizes with the sheet, for example body = 8 pt * clamp(sqrt(short side / 8 in), 1, 1.75): 8 pt up to 8 in short side, about 11.3 pt at 16 in, 13.9 pt at 24 in. Or add a 'caption size: fine / label' toggle to coloPrefs. Keep the existing shrink loop for small sheets.
- **Risk.** Layout only; saved printer presets would re-layout larger on big sheets. Recipes are unaffected.
- **Tabs.** all (colophon on, sheets 16 in and larger)

#### sheet-8-paper-presets-inches-only (minor, improvement, effort small)

- **Claim.** There are no standard paper presets and no metric entry. Size presets are long-edge inches at the plate's aspect, and any real paper size such as 4x6, 8x10, A4 or 24x36 has to be typed in inches under Custom. A4 typed as 8.27x11.69 comes out as 210.06x296.93 mm, not 210x297.
- **Evidence.** engine.js:2192 PRINT_INCHES [8..60] with the sheet at the plate aspect (printSpec, :2218-2222). Custom inputs are inches only (studio.html:190-192). Every A-series and 4x6 sheet in this audit had to be driven through Custom.
- **Impact.** Metric users and anyone ordering a standard size must convert by hand, and the round-trip is slightly off the ISO size.
- **Fix.** Add a paper list (ISO A5-A1, US Letter and Tabloid, 4x6, 5x7, 8x10, 11x14, 16x20, 18x24, 24x36) that fills Custom W x H exactly (A4 = 8.2677 x 11.6929 in), plus a mm/in unit toggle for Custom. Store the sheet in inches internally, as now.
- **Risk.** UI only. Presets keep validating because the stored width and height stay in inches.
- **Tabs.** all

#### sheet-9-tiff-no-bleed (minor, improvement, effort small)

- **Claim.** TIFF never includes bleed, so a shop that wants a TIFF with bleed (final size plus 2x bleed) has to extend the file itself.
- **Evidence.** print-formats.js tiff() ignores the options; studio.html:549 says 'TIFF keeps the original sheet'.
- **Impact.** Photo labs that take TIFF or JPEG with a bleed allowance get a file that is 6 mm short, and edge content is lost to the trim.
- **Fix.** Reuse mirrorExtend from sheet-2 when bleed > 0, write the TIFF at (w+2bx)x(h+2by) with the same resolution tags, and name the file with the finished and bleed sizes.
- **Risk.** The physical size in the TIFF becomes trim plus bleed, which must be stated in the UI and the filename. Recipes are unaffected.
- **Tabs.** all

#### sheet-10-export-note-and-bleed-default (nit, improvement, effort small)

- **Claim.** With colophon and a custom sheet both on, the export note says 'unused space uses the background color', but the margin is actually the paper colour (#FAF7F1 or #0A090B). Also, bleed defaults to 0 and nothing warns when full-bleed art goes to a PDF with no bleed.
- **Evidence.** engine.js:2605 appends the fit-to-sheet sentence whenever customPrint is on. The 4x6 colophon export showed that sentence, while the measured margin was (250,247,241) and the plate bg is #E9E7E2. studio.html:547 has value="0".
- **Impact.** The note is slightly misleading. Some shops will bounce a full-bleed PDF that has no bleed.
- **Fix.** Show the fit sentence only when colophon is off. Under PDF finishing, add a hint when colophon is off and bleed is 0 that trimmed full-bleed prints usually need 3 mm or 1/8 in.
- **Risk.** None.
- **Tabs.** all

**Already good:** Physical size is exact in PDF and TIFF, including clamped exports. 4x6: TrimBox 4.0x6.0 in; TIFF 300.0 dpi = 4.0x6.0 in. 24x36 clamped by SwiftShader to 5461x8192: PDF trim 24.0x36.0 in; TIFF XRes/YRes 227.54/227.56 = 24.0x36.0 in. Rational tags avoid rounding drift.; PDF structure is right. MediaBox, BleedBox and TrimBox are nested correctly (4x6, 3 mm bleed, marks: Media 120.3x171.1 mm, Bleed 6.35-113.95 mm, Trim 9.35-110.95 mm). The image is lossless (the XObject is byte-identical to the PNG), ICC-based sRGB, /Interpolate false, and UserUnit is used above 200 in.; The bleed area is never left white. On colophon sheets it is filled with the sheet's paper colour: measured band mean (250,247,241), max deviation 0, white fraction 0. The caption never enters the bleed, and no mark enters the trim or the bleed.; Crop marks lie exactly on the trim lines, 8 of them at 0.25 pt, outside the bleed.; Caption size is set in physical points, not pixels. It stays 8/11 pt at 300 ppi and at the clamped 227.5 ppi, so changing ppi does not change the printed text size.; Caption text is rendered with greyscale anti-aliasing and no LCD colour fringing: the largest off-axis colour residual in the caption band is 0.61 levels.; The pre-download print check reports the smallest caption size (for example 'Smallest caption text: 6.8 pt' at 4x6) and flags text under 6 pt, low ppi and grid-limited detail.; The fonts (Geist Mono, Instrument Serif) are embedded as data URLs in the build, and export awaits document.fonts.ready, so the caption needs no network.; Large conversions are fast: a 44.7 MP PDF in 4.5 s. Size in the 48 MP range is limited by memory, not time.; tools/colophon-check.js (layout parity, caption on the chosen side, real PDF and TIFF downloads, recipe unchanged by caption) passes at 1280, 390 and 320 px on both main and the prototype. build --check and lint pass on the prototype.; Measurement scripts and outputs: scratchpad/print/sheet/{layout-probe.js, layout-probe.json, export-probe.js, analyze.py, trimcmp.py, corners.png, prototype.diff}. The prototype worktree is scratchpad/print/sheet-wt (not committed).

## 3. Adversarial verification (stopped partway)

Three independent skeptics each tried to refute CM-1 and CM-2; the run was stopped during CM-3. None refuted either finding, but for CM-2 they agreed the proposed report line overstates the issue and proposed better fixes, quoted below.

### verify:color-metadata:CM-1:1: not refuted

The finding reproduces. I re-ran it in my own scratch folder, print/skeptic-cm1/, and did not trust the quoted numbers.

1) Defect on main. I drove the real export modal on the untouched main build, wt-print/dist/studio.html, for tilings at 8 in and 300 ppi with the caption on. I parsed the PNG chunks with my own parser. The file has only IHDR, 466 IDAT chunks and IEND. Pillow's `Image.info` is {}, so it has no dpi and no ICC profile. The TIFF from the same export carries dpi (300.0, 300.0) and a 3024-byte ICC profile. The PDF uses `/ColorSpace [/ICCBased 5 0 R]`. Both come from src/shared/print-formats.js:44-45 and :59-76. So the PNG is the only raster print format with no size and no color tag.

2) Cause. A bare `canvas.toBlob` in Chromium 141 (Playwright 1.56.1) writes only IHDR and IDAT (allcolors.js, `chromeChunks`). engine.js:2699 stores that blob as `lastBlob`, and both the download link and the `downloads.save` path at :2746 use it. docs/PRINTING.md:10 does tell users to "tell the shop the intended dimensions".

3) Impact. The pixels on paper are unaffected. What is missing is workflow metadata. Photoshop and Preview conventionally assume 72 ppi when pHYs is absent, so a 2400 px sheet would open at 33.3 in. North America Prepress 2 uses Adobe RGB as its RGB working space, and an untagged sRGB file opened there can be misassigned and print oversaturated. The finding hedges these points correctly with "usual" and "may". I did not measure any third-party application. I would rate this moderate rather than major, because the printed pixels are right, but it is a real gap for a print-first product.

4) The fix is safe for pixels in Chromium, tested more strongly than the finding did. I used the prototype `pngTag` on an image containing all 16,777,216 RGB colors once (4096x4096). I decoded it through the exact paths the engine uses:
- PDF/TIFF: an Image into a canvas with `{alpha:false, colorSpace:'srgb'}`.
- JPG/WebP: an Image into a canvas with `{alpha:false}`.
- `createImageBitmap`.

The untagged PNG, the iCCP-tagged PNG and the PNG with an sRGB chunk all showed 0 differing bytes and a maximum error of 0 on every path.

Chunk check with Python:
- The chunks are IHDR, pHYs, iCCP, then IDAT, and every CRC is valid.
- pHYs is 11811/11811 with unit 1, which is 299.9994 ppi.
- iCCP is named sRGB2014, uses compression method 0, and inflates to the 3024-byte profile with 'mntr' and 'RGB '.

5) End to end on the prototype build (color-metadata-wt/dist), tilings 8 in at 300 ppi:
- The PNG pixels are identical to main (0 differing values, opaque alpha).
- The TIFF RGB made from the tagged PNG equals the PNG RGB, with 0 differing values.
- Pillow reads dpi 299.9994 and a 3024-byte ICC profile.

The pHYs values are right: printSpec (engine.js:2218-2237) sets `sheetW = sp.pw` (:2444), and when clamped it floors pw and ph while keeping wIn and hIn, so per-axis pw/wIn and ph/hIn is the true effective ppi, the same way the TIFF computes it. No tool hashes the exported PNG bytes: the sha256 calls in tools/*.js hash source files, and the review tools decode #export-img, which is pixel-identical. Recipes are untouched and each file grows by about 2.6 KB.

6) One risk the finding does not cover, and I could not measure it. Only Chromium is installed in /opt/pw-browsers. With the fix, the in-page PDF/TIFF/JPG/WebP transcoders (engine.js:2774-2779 and :2800-2808) re-decode a tagged PNG. Chromium skips the transform because the profile is approximately sRGB. Firefox color-manages only tagged images, converting them to the display profile at decode time, and canvas getImageData has historically returned those converted values. Safari converts through ColorSync. So in those browsers, on a wide-gamut display, tagging could change the PDF/TIFF pixels by a rounding step or more, while untagged pixels pass through unchanged today. That makes this a refinement to the fix, not a reason to refute it.

Part of the prototype patch is out of scope for CM-1 and should be reviewed separately: the tEXt/recipe comment (CM-8), jpegDensity, the SVG physical size, and the PDF bleed and TIFF deflate changes.

**Better fix proposed:** Keep the `pngTag` approach: pHYs per axis from sp.pw/sp.wIn and sp.ph/sp.hIn, plus iCCP with the embedded sRGB2014 profile, falling back to sRGB+gAMA+cHRM only when CompressionStream is missing. Prefer iCCP, because Photoshop reads iCCP and has historically ignored the sRGB chunk.

Change one thing: separate the internal re-decode from the tagged download.
- In doExport, keep the untagged blob, e.g. `lastRawBlob = blob`, taken before `pngTag`, and give it its own object URL. Use it as the source in exportPrintFormat (engine.js:2769 `source = lastUrl`) and in transcodeExport (:2800 `loadImage(lastUrl)`).
- Use the tagged blob only for `lastBlob`, the preview, the download link and `downloads.save`.
- This costs no memory: the tagged blob is built from `Blob.slice`s of the raw blob, so both share the same bytes.
- It removes any chance that a browser color-managing a tagged image (Firefox, Safari) alters PDF/TIFF/JPG pixels. Chromium's 0-difference result then holds by construction in every browser.
- An alternative is `createImageBitmap(blob, {colorSpaceConversion:'none'})` in those two decoders.

Ship CM-1 without the tEXt/recipe chunk, which belongs to CM-8, and without the unrelated PDF bleed and TIFF deflate changes in prototype.patch. That keeps this change small and easy to review.

Add a check to tools/print-formats-check.js. It should parse the chunk order (IHDR, pHYs, iCCP before IDAT), verify every CRC, verify that pHYs times 0.0254 is within 0.001 of pw/wIn, and verify that the iCCP data inflates to the same bytes as the profile embedded in the TIFF.

Update docs/PRINTING.md:10 to say the PNG now carries its print size and an sRGB profile.

Effort: small, roughly 60 lines plus the check.

### verify:color-metadata:CM-1:2: not refuted

The finding holds up. I re-ran every check myself.

1. The defect reproduces. I drove the real export modal with my own script (scratchpad/print/skeptic2-cm1/grab.js) against wt-print/dist/studio.html at 8 in and 300 ppi.
   - cahn: 2400x2400 PNG, colortype 6.
   - tilings (vector RIP): 2400x2400, colortype 2.
   - Both files contain only IHDR, IDAT and IEND. Pillow's Image.info is {} and libpng 1.6.43 reports no pHYs and no iCCP.
   - Cause, confirmed in source: engine.js:2699 sets lastBlob to the raw util.toBlob / fitPrintSheet / composeSheet output. Both the `<a download>` link (line 2710) and downloads.save (line 2746) hand out that blob unchanged.
   - print-formats.js tiff() and pdf() already embed the sRGB2014 profile. The TIFF also carries XResolution/YResolution and the PDF carries its physical size. docs/PRINTING.md:10 says the PNG row needs the user to "tell the shop the intended dimensions".
   - The finding's impact wording is hedged correctly. The 72 ppi fallback is flagged as unmeasured, and 2400/72 = 33.3 in is correct.

2. The fix is safe in Chromium. I tested it more strictly than the finding did.
   - I extracted pngTag from the prototype and tagged a 4096x4096 PNG that holds every one of the 16,777,216 RGB colors exactly once.
   - I decoded it through the same path exportPrintFormat uses (Image, then a canvas with alpha:false and colorSpace srgb, then getImageData), and also through createImageBitmap.
   - Result: 0 of 67,108,864 bytes differ for both the iCCP and the sRGB-chunk variants. Real cahn and tilings plates also show 0 of 23,040,000 bytes differing.
   - Every chunk's CRC checks out. The iCCP chunk inflates to exactly the 3024-byte sRGB2014 profile.
   - libpng 1.6.43, with benign errors promoted to errors, reads the tagged files with no warning: pHYs is 11811/11811 per metre, and iCCP is 'sRGB2014' at 3024 bytes. Pillow reads 299.9994 dpi and the sRGB2014 description.

3. The end-to-end run is clean. I built a separate worktree containing only the pngTag function plus a one-line call after fitPrintSheet/composeSheet: scratchpad/print/skeptic2-cm1-wt, at origin/main 6e8ff9e.
   - An 11x14 in custom sheet with caption on tilings downloads as 3300x4200 with pHYs and iCCP.
   - The TIFF built from it is pixel-identical to the PNG (numpy array_equal True) and carries 300 dpi and the ICC profile.
   - tools/export.js cahn 8 300 passes all 6 sheets. lint.js, build.js --check and print-formats-check.js all pass.
   - Pixels, recipes and hashes are untouched: IDAT is passed through unchanged via Blob.slice. The cost is 2,609 bytes per file.

4. The residual risk is outside Chromium, and I could not test it. Only Chromium is installed here (/opt/pw-browsers).
   - The PDF, TIFF, JPEG and WebP paths re-decode lastUrl in the user's own browser.
   - An untagged PNG is not color-managed by Firefox's default mode 2 ("tagged only"). A tagged one can be converted to the output display profile at decode time. Canvas getImageData could then return display-space values, which the TIFF or PDF would label as sRGB.
   - That is plausible on a Firefox install with a non-sRGB display profile. It is not verified here, so it is a caveat rather than a refutation. It is also avoidable at no cost (see better_fix).

5. Scope warning. scratchpad/print/color-metadata/prototype.patch is not just CM-1. It also bundles unrelated behavior changes: svgPhysical; TIFF Deflate strips; a PDF bleed default changed from scale-to-cover to mirrored edges; and jpegDensity. Those need their own review. The PDF bleed change alters default PDF output.

Severity: the defect is real. It is arguably "moderate" rather than "major" for three reasons: PDF and TIFF with correct tags are offered by default, the docs already route print shops to them, and the PNG filename carries the size and ppi (for example ...-8_0x8_0in-300ppi.png). Even so, the primary Download button is the PNG, and a 72 ppi reading in Photoshop, Preview or a shop's preflight is a real print-workflow problem. The fix is small and pixel-neutral.

**Better fix proposed:** Land pngTag alone, taken from prototype.patch without the svgPhysical, TIFF-Deflate, PDF-bleed and jpegDensity hunks. Keep its per-axis pHYs (sp.pw/sp.wIn and sp.ph/sp.hIn) and the iCCP chunk with the same sRGB2014 profile the TIFF and PDF embed.

Change one thing: tag only the file that is handed to the user, and keep the untagged blob as the decode source for the in-browser transcoders. In doExport, keep the untagged blob as `lastRawBlob` / `lastRawUrl` and set `lastBlob = await GenChasePrintFormats.pngTag(raw, sp.pw/sp.wIn, sp.ph/sp.hIn, {icc:true})`. Point `dl.href` and `downloads.save` at the tagged blob. Have exportPrintFormat (PDF/TIFF) and transcodeExport (JPEG/WebP) call `loadImage(lastRawUrl)`.

Blob.slice shares storage, so this costs no memory. The lossless PDF and TIFF then never depend on how a browser color-manages a tagged image. Firefox's tagged-only mode with a non-sRGB display profile is the case I could not test here. Revoke both object URLs together.

Add a check to tools/print-formats-check.js that tags a small PNG, re-parses the chunks, verifies CRCs, pHYs and the inflated profile, and confirms the IDAT bytes are unchanged. Update docs/PRINTING.md:10 so the PNG row states that the file carries its print size and an sRGB profile. Effort stays small.

### verify:color-metadata:CM-2:1: not refuted

The measurements reproduce, but the finding overstates the scope and the impact, and the proposed fix does not improve any print.

Reproduced:
- 81 tabs default to a dark palette: ember 25, thermal 17, nightshade 14, glacier 12, xray 9, bioluminescent 4 (`grep defaultPalette src/modules/*.js`; lookup at engine.js:785; palettes at engine.js:409-415).
- Ground L* computed analytically: xray 0, thermal 2.3, bioluminescent 2.6, ember 5.1, nightshade 7.1, glacier 9.4-9.6. So glacier sits at press black, not below it.
- The FOGRA39L relative-colorimetric black maps to L* 9.6 (their lcms.py). Sending sRGB black through the profile's own darkest ink gives 9.8.
- Share of the sheet below L* 9.6, recomputed without a CMM from their 8 in, 300 ppi exports: lichtenberg 98.5%, attractors 77.2%, fluid 69.9%, bec 66.7%, physarum 45.1%, tilings 0.7%, cahn 0%. This matches.
- The xray ramp, rerun through Pillow's ImageCms rather than their ctypes wrapper: the faintest 1/8 spans 11.8 L* on screen, 3.1 L* on press without BPC (5 levels) and 7.1 L* with BPC (8 levels). This matches their 11.7 / 2.9 / 6.8.
- No gamut or soft-proof feature exists. engine.js:2551 disclaims color accuracy.

Where the finding is wrong or overstated:
1. **Scope.** Being darker than press black is harmless for a flat ground. It prints as the press's deepest black, a shift of about dE00 3 (ember ground 5.1 to 9.5). The risk is detail just above the ground, which differs a lot by palette. The ember ramp keeps most of its shadows (14.5 L* on screen, 10.6 on press) and so does thermal (5.9 to 5.9). Only xray collapses badly. "81 tabs at risk" is not supported. Lichtenberg, the headline 98.5%, has only 1.1% of its pixels as faint detail. Its faint marks keep 8.2 of 12.1 L* of contrast, so it is a low-risk plate even though it has the biggest dark area.
2. **"Close up into a flat black".** This happens only partly, and only without BPC. Method: I ran the exported PNGs through the same Pillow call that tools/prepress.py makes (see `skeptic-cm2/shadows.py`), then back to Lab. Faint pixels are those between the ground and L* 20. Results:
   - physarum: median contrast of faint marks 5.8 L* on screen, 2.0 on press; 31.8% of faint pixels end within 1 L* of the ground.
   - attractors: 10.0 to 2.4; 32.7% within 1 L*.
   - With BPC, attractors improves to 5.9 L* and 12.4%.

   So roughly a third of faint pixels are lost, not all of them.
3. **"Main print-color risk, larger than out-of-gamut hues."** This is a judgment and I could not verify it.
4. **The finding points at a medium most prints won't use.** The FOGRA39 coated-offset black is not the usual poster medium. Glossy or luster photo and inkjet papers reach about L* 3-5, which would make the proposed flag a false alarm for most grounds. Matte fine-art papers only reach about L* 15-18, where the flag understates the problem. These paper figures are general knowledge; I did not measure them.
5. **The fix changes nothing on paper, and would fire on most tabs.** The one line would trip on about 62% of tabs at their defaults. If it goes into `issues` (engine.js ~2548), it switches the heading to "review before downloading" for most exports. That warns about a deliberate design choice the user cannot act on, and they will learn to ignore it.

What the finding missed, and the better lever: the project's own CMYK path clips the shadows. At tools/prepress.py:53-54, `ImageCms.profileToProfile(..., outputMode='CMYK', renderingIntent=1)` passes no `flags`. Pillow's default is Flags.NONE, so that call is relative colorimetric with no black-point compensation. Every image near black is clipped at press black, whatever profile the shop supplies. In this sample profile the perceptual tables behave the same as colorimetric.

Risk of changing it:
- **Recipes.** Neither the recipe nor any studio pixel changes; only the CMYK tool's output does.
- **Tests.** tools/print-formats-check.py checks only mode and size, so it still passes.
- **Ink.** Black with BPC separates at TAC 316%, inside the profile's own limit, against 300% without it.

Not checked: Ghostscript is not installed here, so I could not test the PDF/X path's default rendering intent or BPC.

**Better fix proposed:** 1. **Fix the shadow clipping in the project's own CMYK path.** In tools/prepress.py:53-54, add `flags=ImageCms.Flags.BLACKPOINTCOMPENSATION` and keep `renderingIntent=1`. Measured on the FOGRA39L profile:
   - xray faintest-1/8 ramp: 3.1 to 7.1 L* (screen 11.8).
   - attractors faint-mark contrast: 2.4 to 5.9 L*; faint pixels lost within 1 L* of the ground: 33% to 12%.
   - physarum: 2.0 to 3.5 L*.

   For the PDF/X route, add `-dRenderIntent=1 -dBlackPtComp=1` to the Ghostscript command (prepress.py:84). Confirm those flags on the CI Ghostscript first, because gs was not available here. Record in the returned JSON that the conversion used relative colorimetric with BPC. Effort is small. There is no recipe or studio-pixel change, and the tests only check mode and size.

2. **If a report line is added, measure what is at risk and keep it neutral about the medium.**
   - Measure the share of pixels that carry detail just above the ground, not the share of the sheet below L* 10. For example: ground L* < L* < about 15, excluding the modal ground color, sampled at a stride from the final sheet. The ground share alone says nothing the user can't see; it is 98.5% on lichtenberg, where the faint detail is 1.1%.
   - Put it in `lines`, not `issues`, so the report heading does not turn to "review" on about 60% of tabs at their defaults.
   - Wording, roughly: "N% of the artwork is fine detail just above black. Every printer prints black lighter than a screen and compresses detail near it, more on matte and uncoated paper. Ask the shop for black-point compensation and proof on the intended paper."
   - Do not name FOGRA39 as the reference, because most poster prints are inkjet or photo, where the black point differs by several L* in either direction.

3. **Document it.** Add a short dark-ground paragraph to docs/PRINTING.md under "When the shop asks for CMYK", covering BPC and the palette choice.

4. **Leave the pixels alone.** Do not change palettes or defaults, and do not lift the file's black level. That would alter every dark recipe and would lighten glossy photo prints that can reproduce the dark ground. A paper-black preview (Y' = Yk + Y(1-Yk)) is optional, and would need the viewer to pick the paper rather than a fixed FOGRA39 value.

### verify:color-metadata:CM-1:3: not refuted

The finding reproduces. I checked it three ways: by reading the code, by exporting through the real modal on the main build (read only, nothing in wt-print was modified), and by exporting from the prototype build. My files are in scratchpad/print/skeptic3-cm1/.

1. Defect confirmed. src/shared/engine.js:2699 sets `lastBlob = blob`. Every path that produces that blob ends in canvas.toBlob: util.toBlob at 156, the SVG rasterize at 2646, supersampling at 2683, fitPrintSheet at 2510, composeSheet at 2490, and print-smoothing's own toBlob. I drove #btn-export at 8 in and 300 ppi with my own grab.js and chunk parser, which checks CRCs.
   - main cahn: 2400x2400, colortype 6, chunks are IHDR, IDAT x1369, IEND. Pillow `info == {}`.
   - main tilings (vector RIP path): colortype 2, chunks are IHDR, IDAT x244, IEND.
   - There is no pHYs, sRGB, iCCP, gAMA, cHRM or text chunk.
   - The TIFF writes tag 34675 plus X/YResolution, and the PDF writes /ICCBased, so the PNG really is the only print file without a size or a colour tag.
   - docs/PRINTING.md:10 says "tell the shop the intended dimensions", as the finding quotes.

2. The impact is stated accurately and hedged where it should be. The 72 ppi default and the Adobe RGB reinterpretation are both marked "may" or "not measured". The pixels themselves print correctly, and the TIFF and PDF already carry size and profile. So I would grade this moderate rather than major: the default download is missing a label, which pushes the job of stating size and colour onto the user or the print shop.

3. The fix works in Chromium and does not touch recipes.
   - Decode identity: I built a 4096x4096 PNG containing all 16,777,216 RGB colours and made two copies, one with pHYs + iCCP(sRGB2014) and one with pHYs + sRGB/gAMA/cHRM. I decoded both through exportPrintFormat's exact draw path (alpha:false, colorSpace:'srgb', white fill, drawImage, getImageData). Result: 0 of 67,108,864 bytes differ for either variant. The same holds for cahn (0 of 23,040,000).
   - Prototype end to end on cahn: the PNG has pHYs 11811 px/m (Pillow reads 299.9994 dpi), iCCP holding the 3024-byte sRGB2014 profile, byte-identical to the repo's, and 3 tEXt chunks, all with valid CRCs. The TIFF is 300 dpi with the profile, and TIFF == PNG pixels (0 bytes differ).
   - Clamped sheets: printSpec (engine.js:2228) floors pw and ph but keeps wIn and hIn, so pw/wIn is the effective ppi and the formula is right.
   - The change is container-only: no defaults move, so no legacy declaration is needed. It reads a 64 KB head and uses Blob.slice, so there is no pixel copy. It adds about 2.5 KB per file.
   - No tool in tools/ parses PNG chunks or hashes the export bytes. The tEXt content contains no timestamp, so the PNG bytes stay deterministic.

4. Gaps in the proposed fix. None of these is a reason to reject it.
   - (a) The tagged blob also becomes lastUrl, and exportPrintFormat and transcodeExport re-decode that for the PDF, TIFF, JPEG and WebP. Identity is only shown for Chromium, the only browser installed here. I have not tested whether a browser that colour-manages tagged images into the display profile would alter the values that getImageData returns. Firefox colour-manages tagged images by default. If it does alter them, the TIFF or PDF would carry changed RGB values while still labelled sRGB. The untagged path has no such dependency.
   - (b) The patch adds no pngTag test. tools/print-formats-check.js only changes the TIFF cases.
   - (c) Non-square sheets write separate X and Y pHYs values, which can differ by a few px/m after rounding. On A4 at 300 ppi that is roughly 11810 against 11812, about 0.02% non-square pixel aspect. It has no physical effect, but it is a nit. The existing TIFF does the same thing.
   - (d) This belongs to CM-8, not here: a non-ASCII title is replaced with '?' (the tEXt Title reads "Cahn?Hilliard" in place of the en dash).

**Better fix proposed:** Keep the prototype's pngTag chunk writer: pHYs from sp.pw/sp.wIn and sp.ph/sp.hIn, iCCP carrying the sRGB2014 profile print-formats.js already embeds, inserted after IHDR through Blob.slice. Change where it is applied:

(1) Tag only the file the user receives. Keep the untagged encoder output as the internal source for img.src preview, exportPrintFormat (PDF/TIFF) and transcodeExport (JPEG/WebP). Set `lastBlob = await pngTag(blob, ...)`, give it its own object URL for dl.href, and use it in downloads.save. Leave `lastUrl` on the raw blob. The PDF and TIFF then stay byte-for-byte what they are today on every browser, instead of depending on each browser treating an sRGB2014 iCCP as an identity decode. That identity is verified only in Chromium here.

(2) Add a deterministic Node case for pngTag to tools/print-formats-check.js, with a Pillow read in print-formats-check.py. It should check chunk CRCs, pHYs, and that the iCCP inflates to the embedded profile, that the IDAT bytes are unchanged, and that the call is a no-op when pHYs or iCCP/sRGB are already present.

(3) Optional: when the two axes agree within rounding, write one pHYs value (Math.round(pw/wIn/0.0254)) for both, so non-square sheets do not declare a non-square pixel aspect.

(4) Update the PNG row of docs/PRINTING.md to say the PNG carries its print size and an sRGB profile. Lower the severity to moderate.

### verify:color-metadata:CM-2:3: not refuted

I re-ran the measurements myself, reading the checkout at wt-print without changing it. My scratch files are under scratchpad/print/skeptic3-cm2/.

The quoted numbers reproduce:
- **Palette count.** A grep of defaultPalette across src/modules gives ember 25, thermal 17, nightshade 14, glacier 12, xray 9 and bioluminescent 4, which is 81.
- **Ground lightness.** The palette grounds (engine.js:409-415) come out at analytic L* of xray 0, thermal 2.3, bioluminescent 2.7, ember 5.1, nightshade 7.1 and glacier 9.6.
- **Press black.** The FOGRA39L black in Pillow LittleCMS is about L* 9.4 to 9.6.
- **Share of sheet darker than press black.** Recomputed from the existing 8 in, 300 ppi exports: lichtenberg 98.5%, attractors 77.2%, fluid 69.9%, bec 66.7%, physarum 45.1%, tilings 0.7%, cahn 0%.
- **Xray shadow ramp.** The faintest eighth spans 11.7 L* on screen, 2.9 L* on press without black-point compensation (BPC) and 6.8 L* with it. The ramp starts at bg (engine.js:134).
- **Other claims.** Lichtenberg separates at a TAC of about 307%. engine.js:2551 is the only disclaimer. There is no soft proof, and docs/PRINTING.md says the report does not measure color reproduction.

So the gap is real: nothing tells anyone that faint near-black detail is compressed on paper. The impact is also real where it matters, and I measured it. For attractors, the median contrast of faint trails against the ground falls from 7.9 L* on screen to 1.5 L* on press without BPC and 4.3 L* with it. The share of trail pixels within 1 L* of the ground rises from 7% to 44% without BPC and 21% with it. For physarum, the same median falls from 2.29 to 0.73 without BPC and 1.49 with it.

There is also a trigger inside the repo that the finding missed. tools/prepress.py:53-54 calls ImageCms.profileToProfile(..., renderingIntent=1) with Pillow's default flags=Flags.NONE, which I confirmed from the signature. The repo's own CMYK path is therefore relative colorimetric without BPC, which is the worst case above.

However, the finding overstates the problem, and its fix measures the wrong thing:

1. **The proposed metric counts flat ground, which is harmless, and ranks the plates backwards.** All 98.5% of lichtenberg is a flat ember ground. It has 0% non-ground pixels below L* 16. Without BPC its dE2000 is under 3 over 99.9% of the sheet, because the ground only moves from 5.1 to about 9.5 L*. The proposed line would flag lichtenberg as the worst plate when it loses nothing. The plates that do lose detail are physarum, with 44% of the sheet as non-ground detail below L* 16, and attractors, with 17%.
2. **"Already on a canvas" is wrong.** printQualityReport runs at engine.js:2704, after the sheet is already a PNG blob. fitPrintSheet returns the blob untouched when there is no margin. The fix has to decode the image again, although #export-img already shows it.
3. **"Larger than out-of-gamut hues" is not established.** On bec, 30% of the sheet at L* 20 or above has dE2000 over 3, which is a hue-gamut error of the same order as the dark error.
4. **A single FOGRA39 threshold is one condition among many.** It is fine as a proxy, but it must not read as a verdict about any paper.

Severity should be moderate, not major.

**Better fix proposed:** 1. **tools/prepress.py:53-54.** Pass flags=ImageCms.Flags.BLACKPOINTCOMPENSATION to profileToProfile. Optionally add an --intent/--no-bpc switch and a note in docs/PRINTING.md.
   - This is where the studio itself makes the separation, and it is the path where faint trails collapse. Without BPC the xray shadow ramp keeps 2.9 of 11.7 L*; with BPC it keeps 6.8.
   - Risk: it changes the prepress tool's CMYK numbers only. It does not change recipes or studio pixels. tools/print-formats-check.py:32-34 only checks structure, so CI is unaffected.
   - Ghostscript is not installed here, so I did not check its PDF/X path. Someone should confirm whether its BlackPtComp default already applies BPC before changing it.
   - Effort: a few lines.

2. **A report line keyed to shadow detail, not dark area.** After export, draw the already decoded #export-img onto a canvas of about 600 px. Treat pixels equal to e.state.bg as ground and exclude them. Report the share of the sheet that is non-ground pixels with analytic L* below about 16.
   - Warn only above a small threshold, for example 5%. Suggested wording: "N% of the picture is faint detail in the darkest tones. Paper blacks are lighter than screen blacks (about L* 10 for coated offset, FOGRA39; lighter on matte and uncoated papers). Ask the printer to use black-point compensation or perceptual intent, and proof the shadows."
   - Do not warn about the ground itself. A black ground printing as the printer's black is expected.
   - No recipe or pixel change. Effort: small, about 25 lines.

3. **Optional preview-only paper-black toggle.** Apply an SVG feComponentTransfer table to #export-img as a CSS filter, per channel in linear light: Y' = Yk + Y(1-Yk). With Yk = 0.011 for the named coated-offset condition, this reproduces LittleCMS BPC on the xray ramp: 9.9 to 17.4 L* against lcms 10.3 to 17.1. It never touches the file.

4. **Drop the claim** that this is the main print-color risk ahead of out-of-gamut hues, and lower the severity to moderate.

### verify:color-metadata:CM-2:2: not refuted

I re-ran the numbers myself. I wrote my own ctypes wrapper over liblcms2 with the same FOGRA39L_coated.icc (scratch dir .../print/skeptic2-cm2/). My dE2000 gives 2.0425 on Sharma pair 1. The facts reproduce, but the headline metric and the impact wording are overstated, and the proposed report line points at the wrong thing.

REPRODUCED
- Tab counts: grep of defaultPalette in src/modules gives ember 25, thermal 17, nightshade 14, glacier 12, xray 9, bioluminescent 4. That is 81 tabs.
- Ground L* (engine.js:409-416): xray 0, thermal 2.3, bioluminescent 2.6, ember 5.1, nightshade 7.1, glacier 9.4 (via lcms; 9.6 by the plain D65 formula).
- FOGRA39 black: sRGB black at relative colorimetric lands at press L* 9.55.
- Lichtenberg ember ground separates at TAC 307.5%.
- xray faintest 1/8 of the ramp: 11.7 L* on screen, 2.9 relative, 6.8 relative+BPC.
- The UI caveat is at engine.js:2551, and there is no soft-proof or gamut code.
- I re-exported lichtenberg from the main dist (8 in, 300 ppi). Its decoded pixels are md5-identical to the earlier color-metadata export, so the pixel path is main's.

WHAT IS WRONG
1. The headline "share of sheet darker than press black" is mostly flat ground, not detail.
   - My split (skeptic2-cm2/split.py) takes the modal colour as the ground.
   - Lichtenberg's 98.5% is 100% one flat colour, with 0.0% of non-ground pixels below press black. Its ground moves only 2.9 dE00 on press (L* 5.1 to 9.5). Nothing is lost.
   - Ground share of the sheet: attractors 67.1% (of 77.2% below press black), fluid 58.4% (of 70.0%).
   - Screen-visible pixels that actually merge into the ground on press (under 1 dE00): attractors 5.9%, fluid 4.4%, physarum 7.0%, bec 0.4%, lichtenberg 0%.
2. "Faint trails close up into a flat black" holds only for relative colorimetric without BPC. That is not the usual prepress default: Adobe's Convert to Profile ships with BPC on, and most drivers use perceptual or BPC.
   - Shadow-edge contrast retained, measured over neighbouring pixel pairs with one side below L* 9.55 (skeptic2-cm2/contrast.py):

     | Plate | Without BPC | With BPC |
     |---|---|---|
     | attractors | 61% | 74% |
     | fluid | 77% | 75% |
     | physarum | 45% | 67% |
     | bec | 42% | 61% |

   - So the real effect is a 25-40% loss of shadow contrast under BPC. It is real and visible on the faint halos, but it is compression, not closure. The severity should be minor, not major.
   - The ground being lighter than on screen happens with every paper and cannot be fixed. Only this one coated condition was measured; matte, uncoated and glossy inkjet were not.
3. Why the proposed fix is wrong:
   - A "percent darker than L* 10" line would appear on all 81 dark-default tabs and say 98.5% for lichtenberg, a plate that loses no detail. That is an alarm the user cannot act on.
   - "Already on a canvas, milliseconds" is also inaccurate. At the call site (engine.js:2704) the finished sheet is a PNG Blob. The canvases in composeSheet and fitPrintSheet (engine.js:2479, 2501) are local and already encoded.

WHAT IS RIGHT
- The analytic model Y' = Yk + Y(1 - Yk), with Yk = 0.01069 (L* 9.55), tracks lcms relative+BPC closely. Shadow-edge contrast retained, model versus lcms: attractors 76 vs 74, fluid 68 vs 75, physarum 66 vs 67, bec 61 vs 61. So a preview built on it is honest.
- Risk: no pixel or recipe change, so nothing to reproduce differently.

**Better fix proposed:** Make the soft-proof preview the main change, and drop the "share of sheet darker than press black" line.

1. Add a "Preview paper black (coated offset, FOGRA39, approx.)" toggle to the export modal. It changes the preview only, never the file.
   - Put one hidden SVG filter in the page: `<filter id="gc-paperblack" color-interpolation-filters="linearRGB">`.
   - Inside it, use feComponentTransfer with feFuncR, feFuncG and feFuncB each set to `type="linear" slope="0.98931" intercept="0.01069"`. Yk = 0.01069 is L* 9.55, which I measured as sRGB black through FOGRA39L at relative colorimetric.
   - Apply it with `style.filter = "url(#gc-paperblack)"` on the #export-img preview and the on-screen plate.
   - Per-channel scaling in linear light is exactly Y' = Yk + Y(1 - Yk), because the luminance weights sum to 1. The GPU does the work, so it costs no decode and no memory.
   - Label it as one reference condition. Other papers print a different black (matte and uncoated lighter, glossy inkjet often darker); none was measured here. Say it is not a proof.
   - Effort: about 20-30 lines in engine.js. Adding a papers dropdown would need measured Yk values from profiles; only FOGRA39 exists on this machine.
2. A report line is optional. If added, it should measure detail, not ground.
   - Sample the sheet before it is encoded, for example in fitPrintSheet or composeSheet. Draw it with imageSmoothingEnabled=false into a canvas of about 512 px (a nearest-neighbour stride), not a full getImageData on a poster.
   - Exclude pixels equal to e.state.bg.
   - Report only when more than about 5% of the sheet is non-ground detail darker than L* 10. Measured shares: lichtenberg 0%, attractors 10.1%, fluid 11.6%, physarum 32.9%, bec 45.4%.
   - Suggested wording: "About X% of the sheet is faint detail darker than a coated-press black (FOGRA39, L* about 10). With black-point compensation it prints at roughly 60-75% of its on-screen shadow contrast; use Preview paper black to judge it." Those percentages are measured on these five plates, and the preview model predicts them within about 7 points.
3. Do not report TAC or a sheet-area percentage to users. The print shop's separation sets ink limits, and a flat dark ground printing at the paper's black is expected rather than a defect.

## 4. Not done

- Verification of CM-3 onward and of every finding in the banding, vector, large-format and sheet lanes.
- A ranked plan across lanes.
- Re-running the sharpness sweep after the `sharp.js` sampling fix, and replacing the counts in AGENTS.md.

