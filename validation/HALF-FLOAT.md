# Half-precision fallback

A WebGL2 device without `EXT_color_buffer_float` cannot render into float32 textures. The six tabs built on
`pdeCreate` (amb, cahn, ohta, swift, pfc, ks) and the five on `rdxCreate` (excitable, turing, cyclic,
chemotaxis, vegetation) then store their state in `rgba16f` targets through `EXT_color_buffer_half_float`
(`texType` in `src/modules/pde.js` and `src/modules/rdx.js`). The shaders still compute in `highp` float32,
but every step writes the state back rounded to float16: 11 significant bits, a unit roundoff of
2^-11 ≈ 4.9e-4, and a largest finite value of 65504. All recorded evidence for these tabs is float32. This page
measures what the fallback does. It does not validate it.

The first measurement found three tabs on which the fallback did not run the model, with nothing on the status
line to say so: chemotaxis froze, pfc lost the conservation of its mean, and amb's fluctuations shrank instead
of growing. The modules now handle those three:

- chemotaxis and amb store their float16 state as the deviation from the model's uniform state. That restores
  their dynamics at the default recipe, as the check below shows.
- pfc refuses the fallback. Neither way of storing its state keeps its mean.

The other eight tabs keep the plain fallback and the status-line span.

```
node tools/half-float-check.js --write                              # 22 tab and step-count pairs, 4 failure controls; 467 s here
node tools/half-float-check.js --only cahn,turing --steps 100 --no-controls
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
  point by point is still the same kind of pattern, and the drift of each mean between the two step counts;
- whether each precision's state at N = 1000 is bit for bit its state at N = 100, which catches a
  simulation that has stopped evolving;
- every number in the status line in both runs, side by side.

Controls, all asserted:

- The float32 run is repeated at N = 1000 and matches itself bit for bit, so every difference below comes from
  the precision and none from run-to-run noise.
- The fallback run exports `rgba16f`, its provenance says `float16 state (half-float fallback)` and its status
  line carries the half-float span. The float32 run has none of these.
- The two precisions differ, since a zero difference would mean the fallback never ran.
- The export names the base (`stateBase`) exactly where the module declares one, and never on float32.

One seed was measured. The differences are exact for that seed, with no sampling error. How much they vary from
seed to seed is not measured.

**Acceptance for the two tabs that store deviations.** The criteria were fixed before the runs. At N = 1000 the
float16 state

- is not bit for bit its state at N = 100;
- has every channel's standard deviation within 10% of float32's;
- has moved each standard deviation the same way as float32 since N = 100.

For pfc, a storage that fixed it would have had to keep the drift of its mean within three times float32's.

**Failure controls.** Each runs on a patched copy of the studio written to a temporary directory. They are part
of the recorded run, and `--no-controls` skips them.

- chemotaxis and amb with the base storage removed, which is the fallback as it was. Each must fail the
  acceptance criteria.
- pfc with the refusal removed, first storing its state as it is and then as the deviation from ψ₀. Each must
  fail the conservation criterion. These two runs are the evidence for refusing pfc rather than fixing it.

## Results

| Tab | Steps | rel L2 | max \|Δ\| | max \|f32\| | sd f32 | sd f16 | float16 frozen since step 100 | status values (float32 = float16 unless shown) |
|---|---:|---:|---:|---:|---:|---:|---|---|
| amb (base) | 100 | 5.7e-5 | 1.9e-4 | 0.497 | 0.0231 | 0.0231 |  | ⟨φ⟩ -0.40 · active terms |
| amb (base) | 1000 | 1.7e-4 | 1.5e-3 | 0.488 | 0.0272 | 0.0272 | no | ⟨φ⟩ -0.40 · active terms |
| cahn | 100 | 9.8e-4 | 2.2e-4 | 0.102 | 0.0242 | 0.0242 |  | ⟨c⟩ ≈ 0.00 |
| cahn | 1000 | 2.8e-3 | 5.9e-3 | 0.468 | 0.119 | 0.119 | no | ⟨c⟩ ≈ -0.00 |
| ohta | 100 | 1.0e-3 | 2.7e-4 | 0.125 | 0.0276 | 0.0276 |  | ⟨u⟩ ≈ 0.00; σ 0.060 |
| ohta | 1000 | 4.1e-3 | 5.8e-3 | 0.364 | 0.0979 | 0.0982 | no | ⟨u⟩ ≈ -0.00; σ 0.060 |
| swift | 100 | 9.8e-4 | 3.0e-4 | 0.191 | 0.0391 | 0.0391 |  | r 0.35 · above linear onset; \|u\|̄ 0.03 |
| swift | 1000 | 4.2e-3 | 9.0e-3 | 0.788 | 0.429 | 0.428 | no | r 0.35 · above linear onset; \|u\|̄ 0.38 |
| pfc | 100 | refused | | | 0.234 | refused | | the refusal replaces the plate |
| pfc | 1000 | refused | | | 0.159 | refused | | the refusal replaces the plate |
| ks | 100 | 9.6e-4 | 5.9e-4 | 0.246 | 0.0609 | 0.0609 |  | ν 1.00; α 1.00 |
| ks | 1000 | 1.6e-2 | 2.1e-1 | 10.3 | 2.28 | 2.30 | no | ν 1.00; α 1.00 |
| excitable | 100 | 7.3e-4 | 4.1e-3 | 1.00 | 0.157, 0.0939 | 0.157, 0.0939 |  | Barkley · ε 0.020 |
| excitable | 1000 | 1.3e-3 | 1.7e-2 | 1.00 | 0.398, 0.232 | 0.398, 0.232 | no | Barkley · ε 0.020 |
| turing | 100 | 1.1e-2 | 5.5e-2 | 1.38 | 0.120, 0.0133 | 0.122, 0.0133 |  | Schnakenberg · D 100.0; λ ≈ 12 cells |
| turing | 1000 | 3.0e-1 | 1.3e1 | 13.9 | 1.61, 0.141 | 1.61, 0.144 | no | Schnakenberg · D 100.0; λ ≈ 12 cells |
| cyclic | 100 | 4.3e-4 | 9.4e-4 | 0.825 | 0.330, 0.298, 0.346 | 0.330, 0.298, 0.346 |  | a 0.60 · b 1.60 · heteroclinic |
| cyclic | 1000 | 5.5e-3 | 1.7e-2 | 0.999 | 0.392, 0.341, 0.395 | 0.391, 0.341, 0.395 | no | a 0.60 · b 1.60 · heteroclinic |
| chemotaxis (base) | 100 | 1.2e-5 | 4.9e-4 | 5.08 | 0.0167, 0.0172 | 0.0167, 0.0172 |  | c 3.50 · aggregating |
| chemotaxis (base) | 1000 | 2.2e-2 | 2.0e0 | 7.44 | 0.776, 1.09 | 0.762, 1.06 | no | c 3.50 · aggregating |
| vegetation | 100 | 2.9e-3 | 1.7e-2 | 3.65 | 0.0665, 0.406 | 0.0662, 0.407 |  | a 0.44–1.76 · 2m = 0.90 · bare → bands → cover |
| vegetation | 1000 | 1.3e-1 | 9.7e0 | 10.6 | 0.199, 1.70 | 0.193, 1.68 | no | a 0.44–1.76 · 2m = 0.90 · bare → bands → cover |

Renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver); recipe version 5; 22 pairs and 4 failure controls in 467 s on a shared four-core machine.

The sd columns list one value per exported channel: the field for the pde tabs, each species in state order for the
rdx tabs. "(base)" marks a tab whose float16 state is stored as a deviation from a base state; the other float16
columns are the plain fallback. The float32 repeat at 1000 steps matched bit for bit on all eleven tabs. The
vegetation rows differ from the first measurement because its default recipe now takes the recipe v5 step,
0.01818 instead of 0.02 ([PDE-ORDER.md](PDE-ORDER.md), Findings).

## What it means

**The rounding floor.** After 100 steps the plain-fallback tabs whose state is smooth (cahn, ohta, swift, ks,
excitable, cyclic) differ by rel L2 4e-4 to 1e-3, one to two times the float16 unit roundoff. Their fallback
state is the float32 state rounded to float16, with little accumulation yet. turing is already at 1.1e-2. The two
tabs that store deviations sit far below that floor, at 1.2e-5 (chemotaxis) and 5.7e-5 (amb). What is rounded is
the deviation, which is small against the stored state.

**Amplification.** The instabilities that make the patterns also amplify the rounding.

- By 1000 steps cahn, ohta, swift, excitable and cyclic still differ by less than 6e-3 in rel L2, with every
  moment equal to two or three figures.
- ks (chaotic) reaches 1.6e-2, with a largest difference of 0.21 on a field of 10.3. vegetation reaches 0.13 and
  turing 0.30; for these two the largest pointwise difference is as large as the field itself, so bands and
  spots sit in different places.
- Their standard deviations still agree to within 5 per cent. On these numbers the fallback prints a different
  realization of a statistically similar plate, not the float32 plate.

A seed made on a float32 device does not reprint on a float16 one. The same holds for chemotaxis, at 2.2e-2.

## The three tabs that did not run the model

The first measurement ran every tab on the plain fallback. Three departed from the model qualitatively, and the
failure controls below rerun those same fallbacks on a patched copy of the studio and reproduce the numbers:

- **chemotaxis froze.** Its float16 state at step 1000 was bit for bit the state at step 100, while the float32
  state aggregated. The species standard deviations grew from 0.017 to 0.78 and 1.09 in float32 and stayed at
  0.0097 and 0.0041 in float16. The field sits near u = 1 and v = 5, where the float16 spacing is 2^-10 and 2^-8.
  An explicit step stops changing a value when every increment, dt times the local rate, is under half that
  spacing and rounds back to the stored value. The aggregation instability never started, and the status line
  still read "aggregating", because that label comes from a linear stability test on the parameters.
- **pfc lost its conserved mean.** Between steps 100 and 1000 ⟨ψ⟩ moved by +4.5e-3 in float16 against −1.5e-4 in
  float32, thirty times as far. The status line printed 0.28 for both.
- **amb's fluctuations shrank instead of growing.** Their standard deviation fell to 0.80 of float32's by step
  1000 while float32's grew. The field sits near −0.40, where float16 loses any increment below about 1.2e-4,
  including the added noise, dt times at most 0.004.

### Storing the deviation: chemotaxis and amb

Float16 spacing is relative to the stored value. In the plain fallback a slow mode around a uniform state u* is
stored as u* + δ, so its spacing is set by u*, and an increment dt σ δ smaller than half of it is lost. Stored as
δ alone, the spacing is set by δ, between 2^-11 and 2^-10 times |δ|, and the same increment registers.

The two tabs therefore declare a base, `halfBase(s)` in the module spec: chemotaxis its uniform state (1, 1/a) and
amb its mean composition c0. On float16 state, and only there, the passes are compiled with `STATE_BASE`.

- The upload subtracts the base.
- Every value the equations need is read with the base added back: the local nonlinearities, the rdx step's
  neighbors, the pde guard, the picture and the reduction. The rdx step writes its result with the base taken
  off; the pde step adds its increment to the stored deviation.
- A brush that mixes toward a value mixes toward that value minus the base.
- The data export adds the base back and names it in its meta data (`stateBase`), so the exported arrays are the
  concentrations themselves.
- Differences, Laplacians and fluxes do not see the base.

On a float32 device the macro is the identity and the passes compute what they computed before. The float32 exports
of all eleven tabs at the default recipe (recipe v4, grid 256, 150 steps) hash identical on main before this change
(a3b5e98) and after it; that comparison was a one-off, not a recorded tool.

Both tabs meet the acceptance criteria:

- chemotaxis is no longer frozen. Its standard deviations at step 1000 are 0.983 and 0.979 of float32's, and the
  species means drift as float32's do. Its rel L2 at step 1000 is 2.2e-2, against 1.0 for the plain fallback.
- amb's standard deviation at step 1000 equals float32's to three figures (ratio 0.9996), and its mean drifts by
  −2.35e-4 against float32's −2.33e-4 (the added noise changes the mean in both). Its rel L2 is 1.7e-4, against
  3.2e-2 for the plain fallback.

The failure controls remove the base from a copy of the studio, and both fail the same criteria. chemotaxis is
frozen again, with standard deviation ratios 0.013 and 0.004. amb's standard deviation falls while float32's rises
and ends at 0.805 of it.

### Refusing: pfc

A scalar base cannot fix pfc. The two controls run pfc with its refusal removed:

| float16 storage | drift of ⟨ψ⟩, step 100 to 1000 | against float32 (−1.50e-4) | rel L2 at step 1000 |
|---|---:|---:|---:|
| as it is | +4.51e-3 | 30.1 times | 4.5e-2 |
| as the deviation from ψ₀ | −1.41e-3 | 9.4 times | 2.9e-2 |

Storing the deviation from ψ₀ refines only values near ψ₀, which is the liquid. The crystal's peaks and troughs lie
0.6 to 1.2 away from ψ₀, where the spacing is 2^-11 to 2^-10, and the conserved increments rounded there no longer
sum to zero. That is consistent with the drift, though it was not isolated. Neither storage comes within three
times float32's drift.

pfc therefore refuses the fallback. `pdeCreate` returns the stub it uses when WebGL2 is missing, and the tab shows
this message on the stage and in the status line:

> Half-float state cannot run the phase-field crystal faithfully. This device lacks float32 color buffers
> (EXT_color_buffer_float), so the density would be stored as float16, and rounding it every step breaks the
> conservation of the mean density that the model is built on: in the recorded test it drifts about ten to thirty
> times as far as in float32. The tab stops here rather than show a plate that is not the simulation.

No step runs. Nothing exports: the data export holds only its meta data. The provenance records no state
precision, because no state texture exists. The check asserts the message, the absence of a step and of exported
state on every run, and `tools/provenance-check.js` also asserts the provenance. A float32 device runs pfc as
before.

## The status line says so

When a tab's provenance precision is `float16 state (half-float fallback)`, the engine adds one span to its
status line: **half-float state: measurements carry half-float rounding**, with a tooltip naming the
missing extension. The classification is the same function the provenance record uses (`statePrecision` in
`src/shared/engine.js`), so the two cannot disagree. The span is appended beside the module's own spans;
`compare()` output and every other span are unchanged.

- On the eight plain-fallback tabs, and on chemotaxis and amb, which still keep float16 state, the span is the
  whole of the notice.
- On pfc the refusal replaces the plate.

`tools/provenance-check.js` asserts, with the extension hidden:

- on cahn, that the provenance records the fallback, that the span appears exactly once, that every other status
  span keeps its form, with the float32 page as the control, and that its export names no base;
- on amb, that the span appears, and that the data export names the base and adds it back, so the field's mean is
  c0 rather than zero;
- on pfc, that the refusal is on the stage and in the status line, that no step runs, and that nothing exports.

The check fails on a build with the span removed.

## Limits

- **One renderer.** SwiftShader, one browser build. The rounding of SwiftShader's float32 to float16 conversion was
  not checked, and a hardware GPU converts and computes in its own way, so a real device that lacks the extension
  will differ from these numbers in detail. `tools/gpu-science.js` does not cover this path; a device that lacks
  the extension would have to run the studio itself.
- **One recipe.** One seed, the default recipe of each tab, the default grid, and two step counts. The default
  warm-ups run from 350 steps (ks) to 2200, so N = 1000 is typical of a plate as first shown, not of a long run.
- **The acceptance criteria are pattern-level.** They compare moments, not plates: the chemotaxis plate on float16
  is a different realization of the aggregation.
- **The deviation storage is shown only at the default recipes.** Its benefit shrinks where the field moves far
  from the base: an aggregated chemotaxis state, amb's separated phases near ±1, or a live change of a in
  chemotaxis, which moves the uniform state away from the base fixed when the plate was seeded. Correctness does
  not depend on the base, only precision does.
- **The pfc criterion is ours.** The factor of three is a threshold chosen before the runs, not a property of the
  model; the equation itself conserves the mean exactly.
- **rel L2 can overstate.** rel L2 divides by ‖f32‖₂, which is small when a field sits near zero (cahn and ohta at
  100 steps, before the domains reach ±1), and then overstates the difference relative to the pattern.
- **The status line reads the parameters, not the plate.** The status line of these tabs reports conserved or
  quantized means (from an 8-bit reduction), or parameters and regime labels, not the full state. That the printed
  values agree does not mean the plates agree.
