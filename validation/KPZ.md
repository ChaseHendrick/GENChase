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
- No print-state preservation audit is registered yet; status stays **partially validated**.

## Relaxation top-of-lattice stop (2026-09-25)

Ported from the closed branch `claude/stoic-brahmagupta-xpt636` (PR #123). The relaxation
rule had no top-of-lattice stop, unlike the random, ballistic and RSOS rules: it placed a
particle at `h[best] + 1` even above row `H - 2`, and where that index fell past the lattice
the typed-array write was silently dropped, so the particle was missing from the plate but
still counted in the heights, the width and the particle total. Relaxation now stops at the
top like the other three rules.

A before-and-after run of the real module source with the engine RNG, on all six column
presets at the default seed, gave bit-identical cells, heights, width samples, particle
counts and fitted exponents, so no preset output changes. On a thin, nearly full relaxation
lattice (700 columns, 16:9, fill 0.95, three seeds) the old rule placed 28,550 particles
above the top row and drove the tallest column to 439 in a 394-row lattice; the fixed rule
stops at row 392. That check was a scratch comparison, not a registered tool.

The status stays **partially validated**. The same branch promoted kpz to validated, but its
own criterion, fixed before the first run, required ballistic over relaxation to separate by
at least 5 standard errors at 16 seeds per class, and it reached 3.2. It passed only in a
64-seed follow-up added after that miss (7.8 standard errors), which is not the
pre-registered test. A promotion needs a criterion that is set in advance and then met.
