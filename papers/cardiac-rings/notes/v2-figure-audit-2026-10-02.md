# Version 1.1 candidate figure audit, 2026-10-02

This is an in-project audit of the final root-owned plotting revision, the four standalone figure PDFs and the new
branch figure caption. It does not claim outside review, a fresh scientific proof, a complete manuscript reading,
full manuscript pagination inspection or release readiness. The reviewer contributed to earlier manuscript methods;
this check concerns the separately edited plot, provenance and caption.

## Inspected snapshot

- Plot: `code/plot_cardiac_rings.py`, SHA-256
  `97f55853c0d1e3160f3f8f5aee134c333fb15abf23f593e2d8dfaa8c901c123b`.
- Manuscript snapshot for caption inspection: `paper/cardiac-rings.tex`, SHA-256
  `7b54e88a172feb76adaa1cb0684f338b3924bb4d557c59110257e707814b9184`.
- Figure manifest: `paper/figures/sources.json`, SHA-256
  `72c82a3ee0c3bebf6a1a8178181d73073eacb9293c8594bd9ec96e28b469933b`.
- Branch record: `data/fourier-branch-gks.json`, SHA-256
  `0ac338b9b09ea91775c180d35b7c95e075dc1956aa28e4a311f2623f388e17e3`.
- Uniform record: `data/fourier-branch-stability-uniform.json`, SHA-256
  `d6c960c9cf61d5464e4519874cd5223c199c26e97adfc7120a67348cc8608ee5`.
- Hopf record: `data/fourier-hopf.json`, SHA-256
  `9b0bc96cc60336562b949bb54b33d3ecfbe462e31528bcd2153a5134857ceeff`.

All 38 input hashes in the manifest match the actual companion bytes. The source maps of B, uniform C and H have
9, 10 and 12 entries respectively and match their companion files. The branch final log and center hashes, uniform
log hash, uniform-to-B record hash, Hopf input hashes and fresh bridge-to-final-B record hash also match. These are
provenance checks, not a replacement for the separately reviewed numerical proofs.

The plot reads only the companion paths under `code/` and `data/`. Its `read_record` delegates directly to that
companion reader. There is no fallback to a development research directory, historical Hopf success log or printed
pilot. The final amplitude display uses `reprove_final.jsonl`; its 68 indices are consecutive and unique. The branch
has 712 pieces; the uniform record covers all 712 using 63 group or subgroup units and zero individual units. The
Hopf record has 67 amplitude inclusions, a successful zero identity and a closed fresh bridge. Its gluing file equals
the collected bridge object. The sole fresh common point is 0.02778, with no admitted Stage S point or stable bridge
point. No historical point-stability markers are plotted.

## Visual and physical checks

Color renderings supplied in `/private/tmp/cardiac-figures-final-2026-10-02` and independently rendered grayscale
versions were inspected at the intended 6.5-inch width. Figure heights are 2.85 inches (cell), 2.75 inches (rings),
5.70 inches (all-N) and 5.55 inches (branch/Hopf). Labels, mathematical symbols, legends, offsets and units are
readable; no visible clipping or legend/data-panel collision was found. The legend descriptions remain below the
axes. A direct PDF text-box check found no text outside any canvas. The zoom intentionally clips the portions of
enclosure rectangles outside its stated axis range; this is not a missing-data claim.

All font instances in all four PDFs are embedded TrueType fonts exposed as PDF Type0 fonts: DejaVu Serif and
Computer Modern families. No Type3 font was found. Grayscale preserves the cell dots versus the coefficient bound,
the ring voltage ramp, the all-N enclosure/diamond/cable-marker distinctions, and the branch guide line styles,
Hopf marker and shaded interval with no uniform bound. Color separates the two enclosure families most clearly;
in grayscale their conductance ranges, lightness and legends remain interpretable. At the full-branch scale the
thin certified boxes can resemble a curve; the caption explicitly describes enclosures, and the endpoint zoom
resolves their finite widths. This is a display of records, not numerical continuation used as proof.

- Cell: physical voltage is in mV, time in ms and Fourier modulus in mV. The coefficient error line includes the
  voltage scale factor 1/4, and its bound is distinct from the unresolved high-mode center coefficients.
- Rings: both panels share the physical-voltage color scale. Time is in ms, cell indices run through N-1, and the
  directions agree with the rotating-wave convention. Grayscale retains the voltage ordering.
- All-N: the period offset is 53.588 ms and the vertical differences are in ns. Epsilon is the separate parameter
  1/N squared; the cable is at zero. Radius values use the stated weighted norms. This remains the original
  73-piece fixed-conductance result and supplies no new cable or all-N stability claim.
- Branch/Hopf: period is in ms and conductance in nS/pF. The voltage harmonic is physical: the scaled coefficient
  epsilon/2 is multiplied by the fixed voltage scale 1/4, yielding epsilon/8 mV. Both branch radius bounds and
  amplitude-piece endpoints use that conversion. The endpoint zoom uses 1e-4 mV vertically and an explicit
  conductance offset with 1e-8 nS/pF units horizontally. The Hopf marker uses the certified interval midpoint and
  is unresolved at its 2e-13 interval width; Erhardt's numerical value is a separate dotted guide outside that
  interval. The fresh common-orbit guide is not a pointwise stability marker. The uniform bound is shown only
  on [0.027499735464, 0.02778996093]; the remainder toward the Hopf point is explicitly shaded as having no
  supplied quantitative uniform bound. Qualitative local Hopf attraction does not fill that interval.

The new figure caption matches these conventions and states that binary64 conversions are only for display. Its
claim is scoped to the stored enclosures and independently admitted records, with no monotonicity or global
uniqueness inference from the visual curve.

## Independent bounded regeneration

The unchanged plot bytes were copied to an isolated temporary companion layout. Inputs were read through
read-only-use symlinks to the synchronized companion; output PDFs and the manifest were written only in the
temporary layout. The existing pinned runtime supplied numpy 2.4.6 and matplotlib 3.11.2. The bounded supervisor
used a 60-second limit and 600 MiB RSS cap; the actual successful run took 23.37 seconds and peaked at 245.58 MiB aggregate RSS. No scientific proof was rerun. All four built-in legend-inside-canvas
and legend-outside-every-axis guards passed. All four regenerated PDFs and `sources.json` are byte-identical to the
inspected originals on this runtime. This does not assert byte identity on every platform or runtime.

| PDF | SHA-256 |
|---|---|
| `cell-orbit.pdf` | `1f3d8b190baf4d208f1c344b63067ef3a9505d70df9e39bf9f2149b020569b21` |
| `ring-wave.pdf` | `b0c9c14400c19ae302a923a6b63924927402c7ca25d068c166d73f69b1acdd69` |
| `alln-pieces.pdf` | `62f4813d72f1be4c2da34be5010df1937a83575b355d3d1f300ab472f5a4ccb9` |
| `branch-hopf.pdf` | `d807da1fd1b69ff6f21d6db4411b540ab008f7d933cc079a2581349dfa33ed72` |

Temporary evidence: `/private/tmp/cardiac-independent-figure-regeneration-2026-10-02.log` and its supervisor
receipt; `/private/tmp/cardiac-figures-final-2026-10-02/independent-fonts-layout.json`; grayscale renderings beside
the supplied PNGs. These temporary files are not publication artifacts. The complete manuscript PDF must still
be built and inspected for float placement, references, page breaks, captions and overall pagination.
