# Half-precision fallback

A WebGL2 device without `EXT_color_buffer_float` cannot render into float32 textures. The six tabs built on
`pdeCreate` (amb, cahn, ohta, swift, pfc, ks) and the five on `rdxCreate` (excitable, turing, cyclic,
chemotaxis, vegetation) then store their state in `rgba16f` targets through `EXT_color_buffer_half_float`
(`texType` in `src/modules/pde.js` and `src/modules/rdx.js`). The shaders still compute in `highp` float32,
but every step writes the state back rounded to float16: 11 significant bits, a unit roundoff of
2^-11 ≈ 4.9e-4, and a largest finite value of 65504. All recorded evidence for these tabs is float32; their
records say "No Float16". This page measures what the fallback does. It does not validate it.

```
node tools/half-float-check.js --write     # 22 tab and step-count pairs; 11 to 39 min here, on SwiftShader
node tools/half-float-check.js --only cahn,turing --steps 100
```

## Method

For each tab and for N = 100 and N = 1000 steps, `tools/half-float-check.js` opens the real
`dist/studio.html` on the tab's own default recipe (seed `half-float-check`, the default grid of 512 x 512,
`warmup: N`, `running: false`), waits until the status line reads step N and paused, and reads the state
back through `Studio.exportData()`: the order parameter (`field`) for the pde tabs, every species
(`species`) for the rdx tabs. It does this twice, once normally and once in a browser context whose init
script makes `getExtension('EXT_color_buffer_float')` return null and drops the extension from
`getSupportedExtensions()`. Nothing in the studio is modified; the tabs take their own fallback. It reports

- rel L2 = ‖f16 − f32‖₂ / ‖f32‖₂ over the exported array, and the largest pointwise difference, with the
  largest value of the float32 field for scale;
- the mean and standard deviation of each exported channel, which say whether a float16 plate that differs
  point by point is still the same kind of pattern;
- whether each precision's state at N = 1000 is bit for bit its state at N = 100, which catches a
  simulation that has stopped evolving;
- every number in the status line in both runs, side by side.

Controls, all asserted: the float32 run is repeated at N = 1000 and matches itself bit for bit, so every
difference below comes from the precision and none from run-to-run noise; the fallback run exports
`rgba16f`, its provenance says `float16 state (half-float fallback)` and its status line carries the
half-float span, and the float32 run has none of these; and the two precisions differ, since a zero
difference would mean the fallback never ran. One seed was measured. The differences are exact for that
seed, with no sampling error; how much they vary from seed to seed is not measured.

## Results

| Tab | Steps | rel L2 | max \|Δ\| | max \|f32\| | sd f32 | sd f16 | float16 frozen since step 100 | status values (float32 = float16 unless shown) |
|---|---:|---:|---:|---:|---:|---:|---|---|
| amb | 100 | 1.6e-3 | 2.8e-3 | 0.497 | 0.0231 | 0.0232 |  | ⟨φ⟩ -0.40 · active terms |
| amb | 1000 | 3.2e-2 | 8.0e-2 | 0.488 | 0.0272 | 0.0219 | no | ⟨φ⟩ -0.40 · active terms |
| cahn | 100 | 9.8e-4 | 2.2e-4 | 0.102 | 0.0242 | 0.0242 |  | ⟨c⟩ ≈ 0.00 |
| cahn | 1000 | 2.8e-3 | 5.9e-3 | 0.468 | 0.119 | 0.119 | no | ⟨c⟩ ≈ -0.00 |
| ohta | 100 | 1.0e-3 | 2.7e-4 | 0.125 | 0.0276 | 0.0276 |  | ⟨u⟩ ≈ 0.00; σ 0.060 |
| ohta | 1000 | 4.1e-3 | 5.8e-3 | 0.364 | 0.0979 | 0.0982 | no | ⟨u⟩ ≈ -0.00; σ 0.060 |
| swift | 100 | 9.8e-4 | 3.0e-4 | 0.191 | 0.0391 | 0.0391 |  | r 0.35 · above linear onset; \|u\|̄ 0.03 |
| swift | 1000 | 4.2e-3 | 9.0e-3 | 0.788 | 0.429 | 0.428 | no | r 0.35 · above linear onset; \|u\|̄ 0.38 |
| pfc | 100 | 3.6e-3 | 1.9e-2 | 1.43 | 0.234 | 0.235 |  | ⟨ψ⟩ ≈ 0.28; r -0.25 |
| pfc | 1000 | 4.5e-2 | 1.0e-1 | 0.922 | 0.159 | 0.166 | no | ⟨ψ⟩ ≈ 0.28; r -0.25 |
| ks | 100 | 9.6e-4 | 5.9e-4 | 0.246 | 0.0609 | 0.0609 |  | ν 1.00; α 1.00 |
| ks | 1000 | 1.6e-2 | 2.1e-1 | 10.3 | 2.28 | 2.30 | no | ν 1.00; α 1.00 |
| excitable | 100 | 7.3e-4 | 4.1e-3 | 1.00 | 0.157, 0.0939 | 0.157, 0.0939 |  | Barkley · ε 0.020 |
| excitable | 1000 | 1.3e-3 | 1.7e-2 | 1.00 | 0.398, 0.232 | 0.398, 0.232 | no | Barkley · ε 0.020 |
| turing | 100 | 1.1e-2 | 5.5e-2 | 1.38 | 0.120, 0.0133 | 0.122, 0.0133 |  | Schnakenberg · D 100.0; λ ≈ 12 cells |
| turing | 1000 | 3.0e-1 | 1.3e1 | 13.9 | 1.61, 0.141 | 1.61, 0.144 | no | Schnakenberg · D 100.0; λ ≈ 12 cells |
| cyclic | 100 | 4.3e-4 | 9.4e-4 | 0.825 | 0.330, 0.298, 0.346 | 0.330, 0.298, 0.346 |  | a 0.60 · b 1.60 · heteroclinic |
| cyclic | 1000 | 5.5e-3 | 1.7e-2 | 0.999 | 0.392, 0.341, 0.395 | 0.391, 0.341, 0.395 | no | a 0.60 · b 1.60 · heteroclinic |
| chemotaxis | 100 | 4.0e-3 | 6.9e-2 | 5.08 | 0.0167, 0.0172 | 0.00971, 0.00411 |  | c 3.50 · aggregating |
| chemotaxis | 1000 | 1.0e0 | 3.8e0 | 7.44 | 0.776, 1.09 | 0.00971, 0.00411 | **yes** | c 3.50 · aggregating |
| vegetation | 100 | 2.7e-3 | 1.7e-2 | 3.92 | 0.0586, 0.463 | 0.0583, 0.463 |  | a 0.44–1.76 · 2m = 0.90 · bare → bands → cover |
| vegetation | 1000 | 1.3e-1 | 9.7e0 | 10.6 | 0.197, 1.73 | 0.192, 1.71 | no | a 0.44–1.76 · 2m = 0.90 · bare → bands → cover |

Renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver); recipe version 2; 22 pairs in 638 s on a shared four-core machine.

The sd columns list one value per exported channel: the field for the pde tabs, each species in state order for the rdx tabs. The float32 repeat at 1000 steps matched bit for bit on all eleven tabs.

## What it means

**The rounding floor.** After 100 steps the tabs whose state is smooth (cahn, ohta, swift, ks, excitable,
cyclic, amb) differ by rel L2 4e-4 to 1.6e-3, one to three times the float16 unit roundoff: the fallback
state is the float32 state rounded to float16, with little accumulation yet. turing is already at 1.1e-2.

**Amplification.** The instabilities that make the patterns also amplify the rounding. By 1000 steps cahn,
ohta, swift, excitable and cyclic still differ by less than 6e-3 in rel L2, with every moment equal to two
or three figures. ks (chaotic) reaches 1.6e-2, with a largest difference of 0.21 on a field of 10.3; pfc
4.5e-2; vegetation 0.13 and turing 0.30, where the largest pointwise difference is as large as the field
itself: bands and spots sit in different places. Their standard deviations still agree to within 5 per
cent, so on these numbers the fallback prints a different realization of a statistically similar plate,
not the float32 plate. A seed made on a float32 device does not reprint on a float16 one.

**Three qualitative departures.**

- chemotaxis freezes. Its float16 state at step 1000 is bit for bit the state at step 100 (the check
  reports it; a separate run found it unchanged at step 300 as well), while the float32 state aggregates:
  the species standard deviations grow from 0.017 to 0.78 and 1.09 in float32 and stay at 0.0097 and
  0.0041 in float16. The field sits near u = 1 and v = 5, where the float16 spacing is 2^-10 and 2^-8. A
  state that stops changing is what an explicit scheme does when every increment, dt times the local rate,
  is under half that spacing and rounds back to the stored value; the increments were not measured
  directly. The aggregation instability never starts. The status line still reads "aggregating",
  because that label comes from a linear stability test on the parameters, not from the field.
- pfc does not conserve its mean. The equation conserves ⟨ψ⟩; between steps 100 and 1000 it moves from
  0.27976 to 0.28427 in float16 against 0.27999 to 0.27984 in float32, thirty times the float32 drift.
  The status line prints 0.28 for both.
- amb's fluctuations shrink instead of growing: their standard deviation goes from 0.0231 to 0.0272 in
  float32 and from 0.0232 to 0.0219 in float16. The field sits near -0.40, where float16 loses any
  increment below about 1.2e-4, which is consistent with, though not shown to be, the cause.

**The status line.** Every status value agrees at its printed precision in all 22 cases, and that is not
reassurance. The pde tabs print means from an 8-bit reduction and conserved quantities, which are much
coarser than float16 rounding; the rdx tabs print parameters and regime labels, not measurements of the
field. The span's statement that measurements carry half-float rounding is true, and for chemotaxis
understated: on the fallback the plate itself is not the model's. Making chemotaxis, and possibly amb and
pfc, work on float16 (storing the deviation from the homogeneous state, or refusing the fallback with a
message) is a module change this audit does not make.

## The status line says so

When a tab's provenance precision is `float16 state (half-float fallback)`, the engine adds one span to its
status line: **half-float state: measurements carry half-float rounding**, with a tooltip naming the
missing extension. The classification is the same function the provenance record uses (`statePrecision` in
`src/shared/engine.js`), so the two cannot disagree. The span is appended beside the module's own spans;
`compare()` output and every other span are unchanged. `tools/provenance-check.js` asserts, on cahn with
the extension hidden, that the provenance records the fallback, that the span appears exactly once, and
that every other status span keeps its form, with the float32 page as the control. The check fails on a
build with the span removed.

## Limits

- SwiftShader, one browser build. The rounding of SwiftShader's float32 to float16 conversion was not
  checked, and a hardware GPU converts and computes in its own way, so a real device that lacks the
  extension will differ from these numbers in detail.
  `tools/gpu-science.js` does not cover this path; a device that lacks the extension would have to run
  the studio itself.
- One seed, the default recipe of each tab, the default grid, and two step counts. The default warm-ups
  run from 350 steps (ks) to 2200, so N = 1000 is typical of a plate as first shown, not of a long run.
- rel L2 divides by ‖f32‖₂, which is small when a field sits near zero (cahn and ohta at 100 steps, before
  the domains reach ±1), and then overstates the difference relative to the pattern.
- The status line of these tabs reports conserved or quantized means (from an 8-bit reduction), not the
  full state. That the printed values agree does not mean the plates agree.
