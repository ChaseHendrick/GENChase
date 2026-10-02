# ZP Fixed-Quarter Poincaré TU Redesign — Root Cause

Written: 2026-10-01T02:58:04-0400 (ET) / 2026-10-01T06:58:04Z
Agent: Grok-only
Tag: `box20-zero-pruned-fixed-quarter-tu-redesign-probe-grok-20261001-v1`
Production TU sha256 (must remain): `5b85695c7948a7589fe7be4211fd9e22e48c6417a9f0a3936f33e086a4f3879c`

## Campaign context

Prior campaign verdict: `BLOCKED_FIXED_QUARTER_NOT_HONORED_BY_POINCARE_FLOW_TU` (V1–V4).
Calibration contrast: fixed h=1/8 **PASSED** with exact 0.125 after first cut-in on production TU (prod `setMaxStep(4/N)=0.125`).

## Observed anomalous steps (evidence)

| Attempt | Patch | Observed step hex / mid |
|---------|-------|-------------------------|
| V2 | CLI 0.25, prod maxStep 0.125 | ~0.1125 / 0.125 (clamped) |
| V3 | isolated maxStep(1/4)+CLI setStep(0.25) | tube1 `0x1.ccfb823b8b37dp-4` ≈ **0.1125445449076334**; tube2 `0x1.ccfb823b8b37dp-3` ≈ **0.2250890898152668** (= 2× tube1) |
| V4 | hardcoded setMaxStep(1/4)+setStep(1/4) | tube1 still `0x1.ccfb823b8b37dp-4` ≈ **0.112545** |
| E8 (pass) | prod maxStep=0.125 + CLI 0.125 | tube1 ≈0.112545; tubes2+ interval spanning exact **0.125** |

## CAPD mechanism (Poincaré × enclosure × maxStep)

### 1. Production clamp

`AuditedSolver` ctor: `setMaxStep(I(4)/I(N))` → **0.125** for N=32.
Any CLI `setStep(0.25)` is then honored only up to maxStep, so recorded steps cannot exceed 0.125. This alone blocks true quarter on production TU.

### 2. `setStep` does **not** set `m_step`

From CAPD `BasicOdeSolver.h`:

```text
setStep(newStep)      -> m_fixedTimeStep = newStep; turnOffStepControl();  // does NOT assign m_step
adjustTimeStep(h)     -> m_step = h;
computeTimeStep (OFF) -> m_step = min(m_fixedTimeStep, getMaxStep());
```

### 3. Poincaré `ILastTermsStepControl::init` seeds ~0.112545

`PoincareMap::integrateUntilSectionCrossing` begins with:

```text
m_solver.getStepControl().init(...)
```

Default OdeSolver policy is **`ILastTermsStepControl`**, whose `init` estimates a Lipschitz time scale and calls **`adjustTimeStep(h)`** with `h ≈ 0.1125445449076334` (same hex across adaptive / V3 / V4 / E8). That value is **not** a Poincaré section cut-in of the orbit period; it is the **first ODE integrator step** chosen by CAPD step-control init.

### 4. `approveRemainder` doubles toward maxStep → explains 0.225

`computeAndApproveRemainder`:

```text
SaveStepControl guard(solver);
if (!isSingular(getStep()))
  setMaxStep(min(getMaxStep(), 2 * getStep()));  // 2 * 0.112545 = 0.225089
computeTimeStep(...);
```

With isolated `maxStep=0.25` and `m_step` left at the Lipschitz seed:

- temporary maxStep becomes **0.225089**
- next forced/computed step lands on **exactly 2× first hex** (`0x1.ccfb823b8b37dp-3`), matching V3 tube2.

With production/E8 `maxStep=0.125`:

- `2 * 0.112545 > 0.125`, so clamp restores **0.125**
- hence tubes2+ are exact eighth — calibration “pass” without true fixed-quarter capability.

### 5. Why V4 hardcoded setStep(1/4) still showed 0.112545

Calling `setStep(1/4)` before `PoincareMap` still leaves `m_step` unset; Poincaré `init` then `adjustTimeStep(0.112545)`. V4 aborted after tube1 on the step gate, so the 0.225 doubling (seen in V3) did not get a second sample.

### 6. Enclosure interaction

`HighOrderEnclosure` may reduce the step **only if** `isStepChangeAllowed()`. After `setStep`, step control is OFF, so CAPD refines enclosures instead of shrinking h. Forcing a true 0.25 step may therefore **fail closed** with a High Order Enclosure error if 0.25 is too large for remainder inclusion at order 20 / radius 3e-10. That is a hard CAPD/validation limit to document, not invent around.

## Redesign (isolated attempt only)

Attempt dir:  
`.../rigorous-attempts/box20-zero-pruned-fixed-quarter-tu-redesign-probe-grok-20261001-v1`

Mechanistic fix in `AuditedSolver` (attempt-local `ring_flow.cpp` only):

```text
forceFixedQuarter() before every operator() move:
  setMaxStep(I(1)/I(4));
  setStep(I(1)/I(4));       // m_fixedTimeStep + turnOffStepControl
  adjustTimeStep(I(1)/I(4)); // m_step = 1/4  (defeats ILastTerms::init seed)
```

Tried `OdeSolver<..., FixedStepControl<I>>` but **ABI incompatible** (FixedStepControl `computeNextTimeStep` is 4-arg; OdeSolver instantiates 3-arg). Kept default `ILastTermsStepControl` and defeated it via `forceFixedQuarter`.

**Production headers / `ring_flow_zero_pruned.cpp` untouched.**  
Any prod patch requires receipt gate `awaiting_user_for_prod_patch=true`.

## Success criteria for probe

- ≥3 consecutive TUBES with step == 0.25 (rel 1e-12 or exact/near-exact hex), wall ≤300s, stop early.
- Evidence: step hex from TUBES.jsonl written into PM receipt.

## Non-goals

- No AZero swap, no G8/G9 full return, not `admitted_for_proof`.
- Preserve manuscript/certificates.


## Probe results (2026-10-01)

### v1 (`...-20261001-v1`)
Stuck for minutes in `ILastTermsStepControl::init` → `spectralRadiusOfSymMatrix` on 576×576 interval matrix. **Zero tubes.** forceFixedQuarter alone cannot skip Poincare init cost.

### v2 (`...-20261001-v2`) — mechanism proof
Custom `FixedQuarterStepControl` (empty/pin init, 3-arg `computeNextTimeStep` → 1/4) + `forceFixedQuarter` before every move.

**TUBE 1 step hex (exact thin quarter):**
```text
lo = 0x1p-2
hi = 0x1p-2
mid = 0.25
```
Contrast V4 first tube: `0x1.ccfb823b8b37dp-4` ≈ 0.1125445449076334.

Wall 300s only allowed ~1 C1 order-20 tube (~250 s/tube). Success criterion of 3 consecutive deferred to v3 (wall 900s).

### Redesign components that worked
1. Bypass `ILastTerms::init` Lipschitz spectral-radius seed (custom StepControl).
2. `setStep` + **`adjustTimeStep(1/4)`** so both `m_fixedTimeStep` and `m_step` are 1/4 before `approveRemainder`.
3. `setMaxStep(1/4)` so `min(fixed,max)` and `min(max,2*step)` cannot shrink below quarter.


### v3 (`box20-zero-pruned-fixed-quarter-tu-redesign-probe-grok-20261001-v3`) — SUCCESS

Wall ~900s extension. **Three consecutive tubes** with exact thin step hex:

| tube | step mid | step hex lo/hi |
|------|----------|----------------|
| 1 | 0.25 | `0x1p-2` / `0x1p-2` |
| 2 | 0.25 | `0x1p-2` / `0x1p-2` |
| 3 | 0.25 | `0x1p-2` / `0x1p-2` |

`redesign_pass=true`. `prod_untouched=true` (sha `5b85695c7948a7589fe7be4211fd9e22e48c6417a9f0a3936f33e086a4f3879c`).
`awaiting_user_for_prod_patch=false` (isolated only; no prod write).
