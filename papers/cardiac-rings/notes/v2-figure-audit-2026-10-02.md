# Figure layout inspection for version 1.1.0

Rendered all four current figure PDFs with PyMuPDF 1.26.7 and visually inspected the axes, titles, legends and
colorbar. This is a layout inspection, not numerical validation. The branch figure still uses snapshot evidence
and must be rebuilt from admitted final records before publication.

| Figure | Layout findings |
|---|---|
| cell-orbit.pdf | Two clear panels; period and section-point descriptions are below the axes. No annotation over the voltage curve. Fourier-coefficient legend below the second axes. Extracted legend text remains within the page. |
| ring-wave.pdf | Voltage heatmaps have cell and time units. The shared voltage colorbar is beside the data panels. Titles and axes labels do not overlap the plots. The visible cell bands represent the discrete ring. |
| alln-pieces.pdf | Conductance-independent family, period enclosures and gluing radii are distinguished by colors and shapes. Ring-size secondary axes and panel titles have separate space. Legends are below all three panels. No label overlaps data. |
| branch-hopf.pdf | Four panels distinguish branch/bridge enclosures, uniform multiplier bounds and isolated points. Legends are below the data axes. The longest left legend ends at x=270.1 pt; the right text starts at x=307.2 pt, so the apparent crowding in a thumbnail is not an actual overlap. The final record-based caption remains to be written. |

The main plotting script places legends outside the axes. Do not move explanatory labels onto the data when
rebuilding these plots. Reinspect the rebuilt PDFs and the full manuscript at publication size after pagination
changes, and verify final sources.json digests. No pending figure or reading check is marked complete in QUALITY.md.
