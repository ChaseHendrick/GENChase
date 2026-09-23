# Rough growth (KPZ): first numerical evidence

This tab grows solid-on-solid interfaces with discrete deposition rules that fall into
three 1+1 universality classes:

| Rule | Class | Theory β in W(t) ~ t^β |
|---|---|---|
| Random deposition | uncorrelated (RD) | 1/2 |
| Surface relaxation | Edwards–Wilkinson (EW) | 1/4 |
| Ballistic / RSOS | Kardar–Parisi–Zhang (KPZ) | 1/3 |

Interface width `W` is the column-height standard deviation. The plate fits β from
logarithmically spaced samples with the filter `t ≥ 4`, `W > 0.4`, `W < 0.06 L`.
Eden growth is radial KPZ physics and is **not** part of this package.

The studio path is `src/modules/kpz.js`. The first numerical package is an independent
Float64 twin of those column kernels, not a browser UI replay, not Tracy–Widom edge
statistics, and not a liquid-crystal experiment claim.

## Numerical evidence

Run `node tools/kpz-science.js --write`. Results are recorded in
[kpz-science.json](results/kpz-science.json). The harness asserts that the maintained
source still contains ballistic sticking (`max(h+1, left, right)`), relaxation to the
lowest neighbor, the RSOS step restriction, the width formula and the status-line fit
window.

Protocol: `L = 512`, about 80 monolayers, five seeds per class, same log-spaced measure
schedule as production (`nextMeasure` starts at `4L`, multiplies by 1.25).

| Check | Reference and acceptance | Role |
|---|---|---|
| Random deposition β | Theory 1/2; mean over seeds in `[0.42, 0.58]` | Uncorrelated Poisson growth |
| Surface relaxation β | Theory 1/4; mean in `[0.12, 0.38]` | EW lateral smoothing |
| RSOS β (KPZ gate) | Theory 1/3; mean in `[0.22, 0.45]` (wide for crossover / noise) | KPZ class |
| Ballistic β (reported) | Theory 1/3; mean in `[0.18, 0.42]` | Same class; slower crossover |
| Class ordering | mean β(RD) > mean β(RSOS) > mean β(EW) | Separates the three classes |
| Family–Vicsek α (cheap) | Late `W(L)` on `L ∈ {24,48,96}`; EW/RSOS α in `[0.2, 0.95]`; RD α `< 0.25` | Coarse saturation vs non-saturating RD |
| Random claimed as KPZ | RD mean must **not** land in the RSOS KPZ band | Misclassified exponent fails |
| Broken ballistic sticking | Neighbor max removed → RD; must miss KPZ band and land in RD band | Lateral growth is the KPZ ingredient |
| Broken relaxation | Always deposit on the chosen column → RD; must miss EW band | Lateral hops are the EW ingredient |

## Honest limits

- Finite `L` and a single growth window; ballistic KPZ often fits a little under 1/3 on
  plate-sized runs (as the module hint already states). RSOS is the KPZ acceptance gate.
- Five seeds only; no block-bootstrap uncertainty certification.
- Eden radial geometry, Tracy–Widom distributions and experimental liquid-crystal claims
  are out of scope.
- Family–Vicsek α uses wide bands at small `L`; undersaturation and noise remain.
- Superseded for the status: see the production and print review below.

## Production replay and print review (2026-09-23)

The twin above measures the width after every particle; production measures after
blocks of at least 1000 deposits, and the status line fits what production measured.
`node tools/kpz-production.js --write` runs the actual module headless, through its own
time-sliced build loop and the engine `makeRng`, and compares it with an independent
replay of the kernels, the block schedule, the three stopping rules and the fit
([results](results/kpz-production.json)). The twin's own generator omits the twelve
draws the engine discards after seeding, so it is a different random stream; this
replay uses the engine function itself.

For the kpz, ew, rd, rsos, rings and wide presets at seed `kardar-1986`, every cell word
and column height is identical to the replay, the width samples and final width agree
exactly, and the fitted exponent agrees within 1.7e-15. Repeated runs are identical, so
the module's claim that a seed grows the same deposit particle for particle holds.

Fitted exponents over 16 seeds per class at the preset lattice (mean ± standard error;
per-plate standard deviation in brackets). The bands were fixed before the first run:

| Rule (preset) | Class β | Mean | Band |
|---|---|---|---|
| Random (rd, L = 700) | 1/2 | 0.5014 ± 0.0020 (0.008) | [0.47, 0.53] |
| RSOS (rsos, L = 900) | 1/3 | 0.3074 ± 0.0058 (0.023) | [0.293, 0.363] |
| Ballistic (kpz, L = 700) | 1/3 | 0.2804 ± 0.0103 (0.041) | [0.24, 0.353] |
| Relaxation (ew, L = 700) | 1/4 | 0.2415 ± 0.0062 (0.025) | [0.21, 0.31] |

Random over RSOS, RSOS over relaxation and random over ballistic are separated by 31.5,
7.8 and 21.1 standard errors. Ballistic over relaxation was also required to exceed 5
and did not: 3.2 at 16 seeds. A single ballistic plate therefore cannot be told from a
relaxation plate by its fitted exponent. A follow-up added after that miss, 64 seeds
each, gives 0.2800 ± 0.0044 against 0.2391 ± 0.0029, a separation of 7.8; the class
means differ, individual plates overlap. Ballistic deposition fits well under 1/3 at
this size, as the module hint already says.

Removing ballistic lateral sticking changes 453,923 cell words and moves the ballistic
seed mean to 0.50. A generator without the engine's discarded draws, and a 1.2 width
cadence, are both caught by the exact comparison.

The review found one defect. The relaxation rule had no top-of-lattice stop, unlike the
other three rules. On a thin, nearly full lattice (192 columns, 16:9, fill 0.98) 1,293 of
21,837 particles landed above the last row, where the typed-array write is silently
dropped: they were missing from the plate but still counted in the heights and the
width. Relaxation now stops at the top like the others. No preset changes (the preset
fixtures above are unchanged by the fix); that lattice now matches the replay exactly,
and the old rule is kept as a failure control.

`node tools/kpz-print-state.js --write` checks the actual browser build
([results](results/kpz-print-state.json)). In Chromium the six presets reproduce the
Node replay cell for cell. exportPNG at 2400 px on the longest edge has exact dimensions,
is not blank, and leaves the cells, heights, widths, fitted exponent and settings
unchanged. The Interfaces print of the rings preset is vector: all 16 polylines,
14,400 vertices, equal the independently deposited column heights at each interface
time to the 0.01 px rounding of the SVG, with zero error. The strata and both views
refuse SVG by design and are checked as rasters for dimensions and state only. A PNG
1 px narrower, a post-export change to the state and one interface shifted by one cell
are rejected.

On 2026-09-23 kpz was promoted to validated within stated limits for exactly these
presets, seed sets and prints. Eden radial growth, Tracy–Widom statistics, larger
lattices and per-pixel strata colour remain outside.
