# Figure and layout review, 2026-09-29

The three vector figures cover the equilibrium/Hopf branch, the stable and saddle-type periodic orbits, and the certified period enclosures with the numerical Hopf-normal-form check. All plotted reference values continue to come from the committed `certify_equilibria_hopf.txt` and `certify_bistability.txt` reports; orbit curves use the existing `hh_float.py` implementation.

The orbit section labels were outside the displayed range and are now anchored inside the axes. Its legend now sits above the panels rather than over a spike. The period figure now labels the equivalent-current and squared-amplitude-ratio units. The figure script's 60-piece parser was stale after the report gained `runs cover Z x piece True`; it now requires that affirmative field and successfully regenerates the complete figure. It also refuses a failed/nonfinite numerical orbit integration.

The figures are regenerated with `python3 code/hh_make_figures.py`. The final figure PDFs were byte-identical on a repeat run in the tested environment. Figures appear on pages 7, 10 and 21 of the 30-page rebuild. A small emergency stretch removed the remaining overfull prose box without changing mathematical expressions.

The manuscript was rebuilt with the repository's `tools/paper-build.sh` and Tectonic. Figure pages were inspected visually at normal page scale. The final PDF contains the public research contact, ORCID and the separate end-matter rights notice, with no extracted replacement glyphs or undefined-reference markers. The paper checker passed. No proof programs or existing certificates were changed or recomputed. Existing scientific limitations remain in place.
