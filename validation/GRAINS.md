# Force chains (grains): contact mechanics, statics and print

`src/modules/grains.js` is a Cundall–Strack distinct element packing of polydisperse
disks settling under gravity. Reading the source confirms what the equation and credit
say. Each pair of overlapping disks, and each disk against a wall, gets a linear normal
spring with a dashpot at a fraction ζ of critical damping. The normal force is clamped
at zero so a contact can only push. A tangential spring integrates the slip and is capped
at μF_n (Cundall and Strack 1979). The integrator is semi-implicit Euler with
Δt = T/35, where T = 2π√(m_eff/k_n) for the smallest pair, and a Verlet list with a skin.
The status line reports:
- the backbone coordination Z (grains with fewer than two contacts are stripped);
- the share of normal force carried by the strongest tenth of contacts;
- the kinetic energy per grain, flagged "still creeping" above 10⁻³ m0 g r0.

One term is missing from the displayed equation. The code adds a background drag
−c m v and −c I ω, with c = ζ√(g/r0)/2, to every grain. It does not enter the static
balance.

The first registered evidence is:
- `node tools/grains-science.js --write` → [grains-science.json](results/grains-science.json)
- `node tools/grains-print-state.js --write` → [grains-print-state.json](results/grains-print-state.json)

The print harness needs Playwright
(`npm install --no-save --package-lock=false playwright@1.56.1`).

The science harness runs the module source from disk headless in Node, with the engine's
own util and `makeRng`. Read-only hooks expose `derive`, `makeSim`, `network`, the force
arrays and the springs. Every failure control is a one-line mutation of the same source.
All acceptance criteria were fixed and committed before the first run. An exploratory
run beforehand printed the presets' status lines, final pile tops and speeds, and the
overlaps of the starting lattice with the speeds they launch. It computed no contact-law,
friction or balance quantity. It did display Z, so the Z bands are a consistency check
against isostatic bounds, not a blind prediction. Two criteria missed. Both misses are kept and reproduced exactly
by the harness. Follow-ups, with criteria committed before they ran, test the causes.

## Contact law: binary collisions

With the no-tension clamp, the contact ends when the force vanishes. That happens before
the overlap closes, at ω_d t_c = π − 2 asin ζ, which gives e = exp(−ζω0 t_c) (Schwager and
Pöschel, Granular Matter 9, 465 (2007)). The textbook e = exp(−πζ/√(1−ζ²)) applies only
if the dashpot may pull.

Four cases were run at damping 0.05 to 0.9: an r0–r0 pair, an rmin–rmin pair (the pair
Δt is derived for), an rmin–rmax pair, and a disk on the floor. Each was refined from the
production step h (1.67e-4) to h/64.

At h/64, every case matches the clamped result: e within 0.33% and contact duration
within 0.24%. The error falls at first order, with the observed order approaching 1.00.
The tensile formula is rejected wherever it can be told apart (ζ ≥ 0.2): it is off by at
least 8.5% there. At ζ = 0.35, for example, the module gives 0.4041 against 0.4039
clamped and 0.3092 tensile.

Restitution agrees to 3e-11 at hardness 800, 4000 and 12000, with 20 force steps each.
The step follows the stiffness.

Error in e at the production step, with contact starting from exact touching (the
pre-registered runs):

| ζ | 0.05 | 0.2 | 0.35 | 0.5 | 0.75 | 0.9 |
|---|---|---|---|---|---|---|
| r0–r0 (ω0h 0.122) | +0.67% | +2.11% | +3.02% | +3.53% | +4.34% | +4.69% |
| rmin–rmin (0.180) | +1.06% | +3.20% | +4.51% | +5.75% | +6.62% | +7.36% |
| rmin–rmax (0.143) | −0.58% | −3.39% | −6.73% | **−10.59%** | −17.34% | −21.58% |
| floor r0 (0.086) | +0.46% | +1.36% | +2.07% | +2.48% | +2.95% | +3.14% |

**Miss.** The production-step bound, 10% at ζ ≤ 0.5, fails for the rmin–rmax pair at
ζ = 0.5 (−10.6%).

The follow-up sweeps 16 contact phases within a step. The dashpot pushes with γv0 the
instant contact begins, so where in the step that happens moves the first impulse. The
swing in e matches 2ζω0h: for example 8.3% against 8.5% (r0–r0, ζ = 0.35) and 32.7% against
32.3% (rmin–rmin, ζ = 0.9). Over all phases, the production step gives:
- −12.1% to +5.7% of the analytic value at ζ ≤ 0.5;
- −25.3% to +7.4% up to ζ = 0.9.

At h/64, every phase is within 0.38% (e) and 0.24% (t_c). So the settle is not a
time-accurate collision integrator at its own step. It converges to the stated law.

## Friction

**Sliding into rolling.** A disk launched along the floor with no spin slides under
μmg until v + ωr = 0. The analytic solution includes the module's drag
(c = 1.43 at the default).

| μ | stick time, measured / analytic | displacement error at t*, 2t* | late slip / elastic range 2μF_n/k_t |
|---|---|---|---|
| 0.1 | 0.14958 / 0.14948 | −3.7e-4, −2.9e-4 | 8.8e-7 / 9.4e-7 |
| 0.4 | 0.04057 / 0.04047 | −9.7e-4, −7.3e-4 | 3.5e-6 / 3.7e-6 |
| 0.8 | 0.02053 / 0.02053 | −1.8e-3, −2.4e-3 | 4.6e-6 / 7.5e-6 |

**Incline.** A disk on a slope rolls without slipping for tan θ < 3μ and slips above it.
The slope is applied as a body force on the gravity line of `forces()`. The contact law
is unchanged. Friction 0.2, 0.4 and 0.8 give the same relative results:
- **tan θ/3μ = 0.8 and 0.95:** the disk rolls. Displacement is within 4.7e-4 of the
  analytic value. Slip in the late half stays inside the spring's elastic range: at most
  5.8e-7, against at least 1.6e-6.
- **tan θ/3μ = 1.25:** the disk slides. Displacement is within 1.8e-3. Total slip is
  +1.56%.
- **tan θ/3μ = 1.05: miss.** Total slip is **+8.67%** against the 3% bound, at every
  friction.

Follow-ups show the cause is the finite, undamped tangential spring, not the Coulomb cap.
The spring must stretch by μF_n/k_t before it can slide, and it reaches that limit with
the contact point already slipping:
- **Late half of the run.** It follows u′ = A − cu from the measured slip speed to
  1.3e-4. Sustained sliding is exactly at μF_n.
- **Hardness.** The excess scales as 1/√k_n. At hardness 800, 4000 and 12000 the slip
  error is 19.4%, 8.7% and 5.0%. The ratios are 3.867 against √15 = 3.873 and 2.234
  against √5 = 2.236.
- **Step size.** The excess changes by 0.13% from h to h/16.

**Oblique grain–grain collision in gross sliding.** At μ = 0.2, 0.4 and 0.8:
- |J_t/J_n| is within 0.43%, 0.47% and 0.66% of μ;
- the change in contact slip is within 0.28% of 3J_t/m_eff (translation plus the spin
  of both disks, I = m r²/2);
- the line of centres turns by at most 1.05e-2 rad during contact.

## Settled packings

The seven presets at seed `cundall-1979` were settled through the production path:
`regenerate()`, then the export path's `finishNow()`. The chunked settle a viewer sees
gives the same packing word for word, and repeated runs are identical. The criteria are:
- the wall forces (normal readout k_n δ plus the stored tangential springs) balance the
  total weight within 1% of the floor load, vertically and horizontally;
- the dashpot term the drawn readout omits is below 1% of the normal forces;
- kinetic energy is below the module's at-rest threshold;
- the status line matches a brute-force rebuild.

| preset | sides, top load | steps / budget | KE per grain | vertical | horizontal | dashpot share | Z | strongest 10% | side-wall friction / weight |
|---|---|---|---|---|---|---|---|---|---|
| pour | walls, 0 | 22262 / 36364 | 2.0e-7 | 2.5e-3 | 8.7e-4 | 4.4e-5 | 3.460 | 0.328 | +3.8% |
| photo | walls, 0.03 | 38672 / 40000 | 2.0e-7 | 3.8e-3 | 5.0e-4 | 6.9e-5 | 3.545 | 0.344 | +3.4% |
| strong | periodic, 0.04 | 25000 / 25000 | 1.9e-5 | 2.2e-3 | 8.9e-5 | 1.9e-4 | 3.513 | 0.350 | 0 |
| arch | walls, 0 | 26044 / 30769 | 2.0e-7 | 1.8e-3 | 4.2e-4 | 4.6e-5 | 3.361 | 0.345 | −6.2% |
| slip | periodic, 0.03 | 33333 / 33333 | 2.4e-5 | 1.7e-4 | 0 | 8.0e-4 | 4.133 | 0.314 | 0 |
| disks | walls, 0 | 26383 / 40000 | 2.0e-7 | 3.6e-3 | 7.9e-4 | 9.8e-5 | 3.504 | 0.379 | +2.7% |
| column | walls, 0 | 26551 / 26667 | 2.0e-7 | 3.5e-3 | 2.2e-3 | 2.6e-5 | 3.387 | 0.345 | +6.1% |

The pour geometry without friction also passes. The floor alone carries the weight
(vertical residual 1.6e-3, side-wall friction exactly 0), with Z = 4.136.

The module's contact set, Z and backbone equal the rebuild exactly. Mean force,
strongest-10% share and loads agree within 1.3e-15.

The per-grain net force is a diagnostic only, not a criterion. For the presets that reach
the settle target, its 95th percentile is 1.1% to 1.6% of a grain's weight. For slip, which
exhausts its budget, it is 7.9%.

These balances follow from Newton's third law once the pile is at rest. They certify that
the plate draws a static network, not the statistics of force chains.

**Coordination.** Over four seeds at the pour geometry, the backbone Z falls with
friction, inside the isostatic bands and separated by 36.7 and 10.1 standard errors:

| friction | mean Z | standard error (sd) |
|---|---|---|
| 0 | 4.120 | 0.006 (0.012) |
| 0.4 | 3.517 | 0.015 (0.031) |
| 0.8 | 3.339 | 0.009 (0.017) |

**Wall friction.** The side walls carry a share of the weight that depends on the
packing's history: −6.2% to +7.0% across the packings measured here. The pre-registered
check, walls carrying more than 5% in the column preset, passed at 6.1% in Node. The
printed Chromium packing of the same preset carries −0.1%. The "Tall column, Janssen"
label is therefore not supported, and no Janssen claim is made.

**Failure controls.** Each is detected:

| control | result |
|---|---|
| dashpot sign flipped | e = 2.475 against 0.404 |
| dashpot allowed to pull | e = 0.309, the tensile value |
| wall friction off | never rolls; displacement +19.5% |
| wall torque sign flipped | never rolls |
| incline friction off below the threshold | slides 0.050, against an elastic range of 2.7e-6 |
| torque on the second grain of a pair flipped | slip change −66.7% |
| settle cut to 5% of its budget | vertical residual 116%, dashpot share 17% |
| gravity on the mean mass | vertical residual 5.9% |
| Verlet list never rebuilt | 36165 contacts missing from the drawn network |

## Defects and findings

These were measured, not fixed. grains.js is unchanged by this review.

- **The top load does not load the packing (grains.js:623, 591; hint at 481).** With a
  top load, the gravity settle is cut at half the budget (line 623). The lid then travels
  a strain of `sim.top()` (line 591), the top of a pile that is still compacting:

  | preset | kinetic energy when the lid starts | lid travel | pile top at the end | largest lid load | lid load at the end |
  |---|---|---|---|---|---|
  | photo | 3.1e-4 | 1.0931 → 1.0603 | 1.0536 | 3.4% of the weight | 0 |
  | strong | 3.3e-2 | 1.0964 → 1.0525 | 0.8271 (never touches) | 0 | 0 |
  | slip | 1.3e-2 | 0.6824 → 0.6619 | 0.6597 | 2.5% of the weight | 0 |

  The hint's "compressive strain applied by a rigid lid once the pile has settled" does
  not happen. These three presets, and the periodic sides only they use, are outside the
  validated domain.
- **The starting lattice is not loose (grains.js:119–137).** The comment says the pile
  "collapses by about a third of its height and no further". In fact 255 to 562 pairs
  overlap at the start, by up to 1.29 r0. Within 400 steps these overlaps launch grains at
  29 to 59 times the seeded kick speed. Every packing is prepared by an explosive
  decompression and then settles. It is not a pour.
- **Same seed, different engine, different packing.** The engine's `rng.gauss` draws the
  initial kicks through `Math.cos`. Node 22.22.2 and Chromium 141 differ by one ulp for
  some arguments: 38 to 87 of 1400 to 3200 initial velocity words, at most 4.1e-16
  relative. The settle amplifies this. Pour, for example, takes 22262 steps in Node and
  27071 in Chromium, and every position differs. Replayed in Node from the browser's
  initial velocities, the settle reproduces the browser packing word for word. Each
  engine reprints its own packing exactly. The print harness first required the browser
  packing to equal the Node packing of the same seed. That failed for every preset. Once
  the cause was found, the requirement was replaced by this replay, and the static checks
  now run on the printed packing itself.

## Print evidence

`tools/grains-print-state.js` settles each preset in `dist/studio.html` (Chromium 141,
SwiftShader) with its own paint settings and palette, and checks the following:
- **Tie to Node.** The browser packing equals the Node replay described above, and it
  passes the same static checks. For pour, arch, disks and column: vertical residual
  2.2e-3 to 7.4e-3, dashpot share at most 8.5e-5, Z 3.488, 3.342, 3.478 and 3.394.
- **Mid-settle export.** An export pressed while the settle is still running finishes
  it and lands on the chunked packing word for word.
- **PNG.** exportPNG at 2400 px on the longest edge has exact dimensions (2400x2400
  for pour and disks, 1920x2400 for arch and column). It is not blank: luminance spread
  196 to 207 of 255, 15% to 58% of pixels off the background. No state, spring or
  drawn-network word changes across any export.
- **SVG.** exportSVG at the same size draws one circle per grain where grains are drawn,
  and the multiset of contact lines equals a brute-force contact rebuild from the
  settled positions: 1537 lines (pour), 1805 (arch), 700 circles (disks), and 1500 circles
  with 2134 lines (column). Every centre, radius and endpoint matches with zero error,
  and every stroke width matches.
- **Failure controls.** A PNG 1 px narrower, a post-export change to one position and
  one drawn force, and an expected plate with one drawn grain moved by 0.1 r0 are all
  rejected.

The top-load presets pass every print check too, but are outside the domain. Colours are
not compared with an independent ramp.

## Status

On 2026-09-23 grains was promoted to validated within stated limits for:
- rigid walls with no top load: the pour, arch, disks and column presets at seed
  `cundall-1979`, each engine's own packing;
- the pour geometry at friction 0 to 0.8;
- the contact-law fixtures above.

It remains outside the domain:
- **Top load and periodic sides.** Presets with a top load, and the periodic sides only
  they use.
- **Settle accuracy.** Time accuracy of the settle at the production step.
- **Physical claims.** The Radjai force-distribution law, Janssen wall loads, and
  comparison with photoelastic experiments.
- **Colour.** Colour of the print.
