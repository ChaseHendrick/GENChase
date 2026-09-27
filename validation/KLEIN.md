# Klein tunneling: an independent transmission check

Status: **unvalidated**. The check below is a separate 1D Dirac calculation.
It is not a certification of the plate. The painted field is not the Dirac evolution,
and the number 1 at theta = 0 on the plate is assigned. The only module check
compares the metric and the field with their own formulas, which is a regression
test by construction. The honesty fixes to the credit, blurb, and comments stay.

Reviewed against `src/modules/klein.js` on 2026-09-27. The numbers are in
[klein-science.json](results/klein-science.json).

## What the plate does

`compute()` stores one Float32 channel. To the left of a marked interval the
amplitude is 1, inside it is a cosine, and to the right it is `sqrt(T)`. That
amplitude multiplies a Gaussian envelope that travels down the sheet. There is
no 2-component spinor and no time step.

`T` is not read off that field. When `theta` is 0, or `|sin theta| < 1e-3`,
the code assigns `T = 1`. Otherwise it evaluates a closed-form stand-in in
`V`, `theta`, `k` and the cell-count width. The status line prints the assigned
1 with basis `construction` ("true by construction; a regression test, not a
prediction"). It does not report a transmitted-over-incident ratio. The blurb
used to say that it did. It no longer does.

The headless module, loaded the way `tools/science-harness.js` loads a CPU
module, reproduces that rule. At theta = 0 the metric is exactly 1 for
`(V, width, k) = (1.8, 16, 0.9)`, `(4, 40, 0.3)` and `(0.4, 4, 2)`, and also
at theta = 0.05 degrees, which is still inside the assignment cutoff. The
painted right-hand sum divided by the left-hand sum on those four plates is
0.9907, 0.6100, 1.1813 and 0.9272. The field matches the cartoon on every
Float32 entry, including an oblique 16:9 plate whose metric is 0.9219 while
its right/left sum is 0.8538. The status number is an input to the picture.

## Reference

O. Klein, Z. Phys. 53, 157 (1929), found that a relativistic electron can
cross a tall barrier. Katsnelson, Novoselov and Geim, Nature Phys. 2, 620
(2006), showed the massless graphene case: at normal incidence chirality
forbids backscattering, so `T = 1` for any finite barrier. A mass term
`m σ_z` couples the two chiralities and `T` drops below 1.

This file does not re-derive their papers. It solves

    H = -i σ_x ∂_x + m σ_z + V(x)

with `ħ = v_F = 1`, which is that normal-incidence problem. The basis of
every number below is deterministic: one trajectory, no random draws, no
sampling error, and no call to `Studio.util.stats.compare`.

## How T is measured

Two independent calculations, neither copied from the plate.

**Wave packet.** A positive-energy Gaussian, position standard deviation 28,
starts at `x = 700` on a periodic interval of length 1600. It is peaked at
energy `E = 1.2` (`k0 = 1.2` when `m = 0`, `k0 = sqrt(E² - m²)` when
`m = 0.6`). A square barrier of height 2.5 occupies `x` in `[900, 912]`.
Inside, `ε = E - V = -1.3`, which is below `-m`, so the run is in the Klein
regime rather than above the barrier. The evolution is a Strang split-step:
the kinetic piece `e^{-i k dt σ_x}` is spectral, and `V` and `m` are local
multiplications. `dt = 0.05`, `t = 420`, grids `N = 4096` (`dx = 0.390625`)
and `N = 8192` (`dx = 0.1953125`).

Transmission is the probability on cells with `x > 912`, divided by the total
probability. Reflection is `x < 900`. The bin `[900, 912]` must hold under
`1e-8` before `T` is accepted, and the norm must stay within `1e-8` of 1.

**Mode match.** Both spinor components are matched at the two edges of the
same square barrier. On a symmetric line, `T = |t|²` and `R = |r|²`.

The predicate is `|T - 1| <= 1e-4`. It was fixed as the acceptance test for
normal-incidence massless transmission. A mass term has to fail it.

## Recorded result

| Check | Result |
|---|---|
| Massless packet, N = 4096 and N = 8192 | T = 0.999999999999942 at N = 8192. Passes. |
| Massless mode match, V in {0.5, 2.5, 4}, width in {2, 12, 20} | T = 1 within roundoff, R + T = 1. Passes. |
| Massive packet, m = 0.6, N = 8192 | T = 0.4129900930271546. The predicate fails. |
| Massive packet, N = 4096 | T = 0.4306626984391698. The predicate fails. Not required to match the mode match. |
| Massive mode match, E = 1.2, V = 2.5, width 12 | T = 0.41130251187190187, R + T = 1. The predicate fails. |
| Fine packet against that mode match | Difference 0.00169, inside 0.01. |
| Reflected side of the massless packet, used as if it were T | R is about 2e-15. The predicate fails. |
| Massive packet, V = 0, t = 520 | T = 0.999999948. Passes. Mass alone does not reject the predicate. |
| Free massless packet, no barrier, t = 80 | Center moves by 80.000. A sign error in `σ_x` would miss by about 160. |

## Limits

- The plate is outside this calculation. Its pixels were not changed. A plate
  that evolved the spinor and measured `T` would be a different recipe.
- One energy, one barrier, normal incidence, two grids. The massive packet is
  not claimed closer to the monochromatic value than 0.01. The coarser grid
  sits 0.019 away, which is why only N = 8192 is held to that match.
- The plate's oblique stand-in is not checked against a Dirac transmission.
  Its phase uses the cell count, not a length in units of `1/k`.
- No print comparison. Unvalidated status does not claim a reviewed print domain.

```sh
node tools/klein-science.js --write
```
