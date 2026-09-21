# Hodgkin-Huxley membranes: bounded numerical and print evidence

This addition implements the established squid-membrane model in a set of independent, single-compartment recordings. It makes no novelty, brain-network or clinical claim. Its analytic limits, independent ODE comparison and print tests support partial validation for the stated fixtures. They do not validate every current, duration, temperature, biological preparation or human application.

## Source and voltage convention

The governing source is [Hodgkin and Huxley, *A quantitative description of membrane current and its application to conduction and excitation in nerve*, J. Physiol. 117, 500–544 (1952)](https://doi.org/10.1113/jphysiol.1952.sp004764). The [paper scan](https://isn.ucsd.edu/courses/beng207/reading/Hodgkin_Huxley_1952_jp.pdf), equations on pages 518–519 and Table 3 on page 520, were inspected. The implementation is original JavaScript, not copied reference code.

Voltage here is modern inside-minus-outside membrane voltage, with resting convention near `-65 mV`. Relative to the paper, `V_modern = -V_original - 65 mV`; applied-current sign reverses as well, so positive injected current depolarizes. The selected constants are:

| Constant | Value | Unit |
|---|---:|---|
| Membrane capacitance `C` | 1 | µF/cm² |
| Maximum sodium conductance | 120 | mS/cm² |
| Maximum potassium conductance | 36 | mS/cm² |
| Leak conductance | 0.3 | mS/cm² |
| Sodium reversal potential | 50 | mV |
| Potassium reversal potential | -77 | mV |
| Leak reversal potential | -54.387 | mV |
| Temperature | 6.3 | °C |

The modern rates are also consistent with the convention documented by the [NEURON maintainers](https://raw.githubusercontent.com/neuronsimulator/nrn/master/src/nrnoc/hh.mod). That implementation rounds its leak default to `-54.3 mV`; this module retains the transformed paper-table value. It does not claim identical NEURON default output. The commonly cited [EPFL Neuronal Dynamics section 2.2](https://neuronaldynamics.epfl.ch/online/Ch2.S2.html) explains gating and voltage clamp, but its Table 2.1 is a later cortical fit. Its numerical thresholds and parameters are not used as original-squid benchmarks here.

For `m` (sodium activation), `h` (sodium inactivation) and `n` (potassium activation):

```text
C dV/dt = I - 120 m³h (V - 50) - 36 n⁴ (V + 77) - 0.3 (V + 54.387)
dx/dt = alpha_x(V) (1 - x) - beta_x(V) x

alpha_m = 0.1 (V + 40) / [1 - exp(-(V + 40)/10)]
beta_m  = 4 exp(-(V + 65)/18)
alpha_h = 0.07 exp(-(V + 65)/20)
beta_h  = 1 / [1 + exp(-(V + 35)/10)]
alpha_n = 0.01 (V + 55) / [1 - exp(-(V + 55)/10)]
beta_n  = 0.125 exp(-(V + 65)/80)
```

Time is in ms, current density in µA/cm², and rates in inverse ms. The limits at `V=-40` and `V=-55` are finite: `alpha_m=1` and `alpha_n=0.1`. An analytic series near zero and `expm1` away from zero evaluate these removable singularities without shifting the voltage or clipping the result.

## Stimulus, integration and display

Each row gets one seeded current amplitude drawn uniformly from the requested center plus or minus the half-range. Rows are sorted by that numerical amplitude. The current is constant over the stated step interval and zero outside it. Initial voltage is `-65 mV` plus a seeded uniform perturbation; gates start at their corresponding equilibrium fractions. The stochasticity is only in these prescribed initial conditions and amplitudes, not in ion-channel dynamics.

Classical fourth-order Runge-Kutta integrates all four variables together in Float64 arrays. Allowed steps are `0.01`, `0.005` and `0.0025 ms`. All pulse endpoints are aligned to step boundaries; every RK stage for an interval uses that interval's constant current. The ODE does not contain a spike reset, refractory lockout, gate clamp or voltage clip. An upward crossing of `0 mV` is counted and linearly timed as an output measurement only.

With the gates frozen between zero and one, the voltage decay magnitude is bounded by `(120+36+0.3)/C = 156.3 per ms`. The RK4 stability interval on the negative real axis reaches approximately `-2.785`, giving `dt < 0.0178 ms` for that frozen voltage limit. All shipped steps lie below it. This is not a proof of stability for the full nonlinear coupled model; the independent trajectory refinement below supplies separate, bounded accuracy evidence.

A nonfinite trial, any gate outside `[0,1]`, or voltage outside the supported `[-120,80] mV` interval stops visibly before accepting that trial. The accepted voltages, gates, history, spike events and counters remain intact. The last condition is an implementation's supported-range guard, not a statement that every voltage outside it is physically impossible.

The recording stores four Float32 values every `0.1 ms`. The image uses voltage, sodium activation or potassium activation from that record; it does not invent a waveform from spike counts. Catmull-Rom interpolation enlarges the samples for print and extends the last recorded sample only for display near a partially computed edge. The voltage color scale is fixed at `-80` to `+40 mV`, gates at zero to one; color saturation never alters the ODE state. The aspect ratio is fixed at 3:2 and other sheet shapes add padding.

The maximum 256-row, 240-ms record has 2,401 time samples and a 9,834,496-byte history array, plus a GPU copy and small ODE buffers. Increasing rows from 64 to 256 quadruples integration work; halving the timestep doubles it. The calculation yields between chunks, so its physical step sequence does not depend on machine speed. A larger printed sheet does not refine this recorded time interval or the ODE step.

## Independent numerical evidence

Run `node tools/hodgkin-huxley-science.js > validation/results/hodgkin-huxley-science.json`. The dependency-free test loads the actual maintained solver through in-memory hooks. [The result JSON](results/hodgkin-huxley-science.json) includes source, RNG and harness hashes, commands, individual fixtures and measured outputs.

| Check | Reference / acceptance | Recorded result |
|---|---|---|
| Rate convention | Independently expressed rates in depolarization relative to rest, six voltages from `-100` to `40 mV` | Maximum error below `2e-13` |
| Removable singularities | Exact limits and two-sided offsets of `1e-12 mV` | Both finite and continuous within `1e-12` |
| Voltage-clamped gates | `x(t)=x_inf + (x0-x_inf) exp[-(alpha+beta)t]`; four clamped voltages, 2 ms, `dt=.005` | Maximum gate error `2.31e-9` |
| Passive leak limit | Sodium/potassium conductances zero, constant current `1.5`; exponential approach to `-49.387 mV`, 20 ms | Maximum voltage error `6.40e-12 mV` |
| Reference uncertainty | Separate Dormand-Prince 5(4) stages and independently expressed RHS, tolerances `1e-11` and `2e-12` | Maximum sampled reference difference `1.03e-9` across voltage/gates |
| Driven trajectory | One membrane, initial `-65 mV`, equilibrium gates, `I=10` from 5 to 25 ms, record to 30 ms; compare every 0.1 ms with the finer reference | Two genuine upward crossings; peak about `40.263 mV` |
| Fixed-time step refinement | Same driven fixture, RK4 steps `.02/.01/.005 ms` | Maximum voltage errors `.002124/.0001093/.000006194 mV`; normalized RMS reductions `18.53` and `17.16` |
| Zero-current control | No stimulus or initial jitter, 40 ms | Zero spikes; final voltage `-64.996377 mV` |
| Shipped recordings | Default plus all six complete recordings, one fixed seed, no gate clipping or halted trial | All pass; voltage extrema across cases within about `-76.24` and `44.74 mV` |
| Highest workload sanity | 256 membranes, 2,401 columns, `dt=.0025`, 100 steps | Finite state; only `0.25 ms` of dynamics is covered |
| Wrong channel exponent | Replace sodium `m³` with `m²` | Independent derivative disagreement `401.31 mV/ms` |
| Missing singular correction | Evaluate zero divided by zero directly | Nonfinite rate detected |
| Invalid trial | Deliberately excessive current and timestep outside UI limits | Rejected; accepted voltage/gates/history/events/counts unchanged |

The refinement norm divides voltage error by `100 mV` and leaves dimensionless gate errors unchanged before taking RMS over all four components and sample times. The `0.02-ms` coarse fixture is a test probe, not an exposed app option. The finer reference uses a different method and independently expressed equations; it is not the production solver rerun with a smaller step. The voltage-clamp fixture sets the voltage derivative to zero while testing the actual gate integrator, and the passive-leak fixture is a limiting parameter case used only in tests.

The prescribed ensemble is not an experimental population estimate, so its finite-record spike counts are not advertised as a measured biological firing-rate law. No statistical error bars are attached to deterministic ODE agreement; convergence and reference uncertainty are reported instead.

## Print and application evidence

Run `node tools/hodgkin-huxley-print.js > validation/results/hodgkin-huxley-print.json` with Playwright/Chromium from [BUILDING.md](../BUILDING.md). [The print record](results/hodgkin-huxley-print.json) covers 12 actual PNG exports: 2400×1600 at 16 membranes and 2400×2400 at 64, all three color views, 15-ms intermediate states and completed recordings. It compares exact bytes of Float64 voltages/gates/currents/work buffers, Float32 CPU/GPU histories, counters, spike-event times, settings and scheduling state before and after each paused export. All remain unchanged. Deliberate advancement during a comparison and incorrect output dimensions are rejected.

At both counts, an actual cooperative 100-ms recording is paused while incomplete, remains unchanged during the pause, and resumes to exactly the same numerical state and spike times as direct fixed-step evolution. These are state-preservation and scheduler checks, not a calibrated-color or experimental accuracy certificate.

The additional application commands are:

```sh
node tools/check.js hodgkin-huxley 12000
node tools/export.js hodgkin-huxley 8 300 7000
```

The [application record](results/hodgkin-huxley-app.json) retains every preset's luminance measurements, duplicate-recipe comparison, tab-switch result and the actual print-UI artifacts. These visual checks are distinct from the numerical evidence above.

## Remaining limits

No spatial axon conduction, synapses, interacting network, stochastic channel kinetics, temperature sweep, metabolic model or human-patient inference is implemented. There is no general firing threshold, precise refractory interval, biological population statistic or full all-parameter stability claim. Source-level agreement and numerical convergence do not repeat the original biological experiments. The short largest-count check is not a completed maximum-workload browser benchmark. Print evidence covers stated paused states and one renderer, not arbitrary simultaneous live exports or new scientific resolution created by enlargement.
