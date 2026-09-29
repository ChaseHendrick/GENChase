# Figure and layout review, 2026-09-29

The vector figure covers the fast-pulse activity, recovery and convolved firing-rate profiles, together with the phase-plane projection and space-clamped nullcline. It still reads all 523 displayed orbit samples from the committed `data/orbit_hp.json`; no trajectory was regenerated or substituted. The proof-block shading and caption's numerical/proof distinction are preserved.

The source figure is now sized for the manuscript width so labels remain readable after placement. Line styles distinguish the three fields in grayscale; axes state their model units; the phase-plane legend sits outside the data. `python3 code/figure.py` works from any directory and regenerates the vector PDF plus the existing raster preview. The vector PDF was byte-identical on a repeat run in the tested environment. The figure appears on page 30 of the 39-page rebuild.

Long paths and decimals were given legal line-break opportunities, preserving every digit and expression; all overfull-box warnings were removed.

The manuscript was rebuilt with the repository's `tools/paper-build.sh` and Tectonic. Figure pages were inspected visually at normal page scale. The final PDF contains the public research contact, ORCID and the separate end-matter rights notice, with no extracted replacement glyphs or undefined-reference markers. The paper checker passed. No proof programs or existing certificates were changed or recomputed. Existing scientific limitations remain in place.
