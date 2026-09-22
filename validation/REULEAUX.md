# Reuleaux: a bounded geometry and print review

This review concerns an established geometric construction, not a new formula or
physical rolling simulation. Its scope is the exact finite set of recipes stored in
[the results](results/reuleaux-science.json): the default, all six presets starting
from defaults, and six explicit boundary-setting fixtures. It does not certify every
combination of the sliders.

## Reference and mathematical construction

F. Reuleaux's *The Kinematics of Machinery*, translated by A. B. W. Kennedy,
was published in [1876](https://en.wikisource.org/wiki/The_Kinematics_of_Machinery).
The module's former English-title date of 1875 was incorrect. The construction
predates this project. Harrell's [primary research paper, introduction and equation (1)](https://harrell.math.gatech.edu/Pubs/reul.pdf)
describes its three circular arcs and the support-function definition of constant
width. We do not implement or test that paper's area-minimization theorem.

Let three points form an equilateral triangle of side R. Intersect the three
closed disks of radius R centered at these points. Each boundary arc subtends
60 degrees at the opposite vertex. A supporting line tangent to an arc has its
parallel opposite support at that vertex, at distance R. The three arc-normal
intervals and the three corner-normal intervals cover all directions, including
their shared endpoints. Consequently the continuous body has width R.

The area is the equilateral triangle plus three circular segments:

`A = sqrt(3) R²/4 + 3 [pi R²/6 - sqrt(3) R²/4] = (pi - sqrt(3)) R²/2`.

These are classical geometric deductions. Floating-point checks test their
implementation; finite directional samples alone are not the proof.

## Independent numerical checks

Run after building the studio:

```sh
node tools/geometry-science.js --write
node tools/reuleaux-science.js --write
```

The second command needs Playwright and Chromium, using the setup in
[BUILDING.md](../BUILDING.md). Omitting `--write` runs the assertions without
replacing reviewed evidence. CI runs both through the science checks.

The tests read the maintained implementation. A temporary browser copy adds
read-only access to its native field and engine instance; it does not replace
its computation, paint function, recipe loader or export function.

- **Continuous support reference:** maximize the linear support functional over
  feasible disk support points and corner points, independently of the module's
  angular boundary sampling. Compare 997 directions at each recorded radius.
- **Finite boundary:** 720 equal subdivisions on each 60-degree arc. The maximum
  support-width deficit is bounded by `2 R [1 - cos(pi/(6 N))]`, with N = 720.
  An additional `1e-12 R` allows floating-point roundoff. No overshoot beyond that
  roundoff is accepted. The earlier audit checks second-order width refinement
  at N = 24, 48, 96 and 192, followed by N = 720.
- **Area:** compare the boundary polygon's shoelace area to the analytic area.
  Its exact omitted circular-segment area is
  `3 N R² [delta - sin(delta)]/2`, where `delta = pi/(3 N)`.
  The residual after subtracting that deficit must be below `1e-11 R²`.
- **Shape and rotated overlays:** independently rotate every cell center back
  into the body's coordinates and compare squared distances to the three disks.
  Check every native Float32 field entry, including repeated 0.35 accumulation
  for overlays. Cells must be farther than `1e-9` in squared-distance units from
  a membership boundary in these fixtures, so rounding cannot decide membership.
- **Width rose:** independently maximize support over the nearest angular grid
  point and endpoints of each arc, instead of scanning the production point
  list. Compare every resulting field entry. Count marks close enough to a
  rounding threshold for the finite sampling error to matter, and report any
  pixel displacement from an exact circular rose. Such displacement is not a
  failure of the continuous constant-width formula.
- **Failure controls:** a straight triangle fails constant width, a one-cell
  field corruption fails field equality, removing the third disk changes the
  reviewed shape field, and a one-cell displaced image fails
  the print comparison. These are regressions that can fail, not independent
  experimental confirmation of constant-width physics.

## What reaches the print file

For every listed recipe, the test opens the studio's actual export dialog at
8 inches on the longest sheet edge and 300 ppi, with the caption disabled and
standard aspect-matched paper. It decodes the final PNG and compares the interior
of **every native field cell** to the module's painted cell. All four channels
must agree exactly. It also verifies the 2400-pixel longest edge and unchanged
recipe, numerical field and witness after export.

This establishes field-cell preservation at the recorded print sizes. It does
not measure every resampled edge pixel, CMYK color accuracy, a printer's physical
output or the exact geometric width of a pixelated silhouette. A 2400-pixel PNG
still contains only its stated native field resolution. Palette, log view and
exposure are presentation choices, not physical units or calibrated density.

## Recorded result

All 13 cases passed: 458,400 native field entries and the corresponding RGBA
cell centers in the final PNG files, with zero mismatches or changed scientific
state. The largest relative sampled-width deficit across the independent
997-angle checks was about `2.641e-7`, below the conservative bound.
Four marks in the large rose are close enough to a rounding cut that the error
bound alone cannot settle their destination. The independent discrete-support
calculation verifies all four; none shifts from the rounded exact circle in
this fixture. The cropped-wide fixture passes finite-window membership, not a
claim that its image contains the entire body.

## Limits of the reviewed domain

- Exact recipes and palettes are in the result artifact. Native grids span 128
  through 224 columns, using square, portrait and landscape examples. These are
  enumerated fixtures, not exhaustive coverage of intermediate combinations.
- Geometry uses JavaScript binary64 arithmetic; field accumulation uses Float32.
  The recorded Chromium environment is the tested renderer. CI checks another
  operating system, without establishing identical output on every browser.
- There is no physical time, force, contact law or no-slip constraint. “Rotations”
  means finite poses about the center, not rolling in a square.
- The field is a finite rectangular window. Large bodies on narrow windows can
  be cropped; the reviewed wide fixture deliberately exercises that case. Its
  check validates the intersection restricted to the window. The width witness
  always uses the complete sampled boundary, even when the picture is cropped.
- The scope excludes arbitrary recipes, captions/custom paper, vector geometry,
  PDF/TIFF color conversion and print-shop proofs. Shared engine tests cover
  some of these separately; they do not enlarge this scientific review's domain.

The scientific status is a repository review label, not external peer review or
certification. Broader parameter sweeps, vector body export and independent
physical print measurements remain possible follow-up work.
