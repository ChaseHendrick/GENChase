# Neural populations: bounded scientific checks

`neural-mass` integrates the established Montbrió–Pazó–Roxin (MPR) equations and plots actual computed traces. It is an original implementation of known science, not a new formula. The current evidence supports selected analytic trajectories, a coupled driven trajectory, six presets, and the tested browser/print paths. It does not establish accuracy throughout every combination of controls or agreement with experimental brain recordings.

## Model and scope

The primary source is E. Montbrió, D. Pazó and A. Roxin, [Macroscopic Description for Networks of Spiking Neurons, Physical Review X 5, 021028 (2015)](https://journals.aps.org/prx/abstract/10.1103/PhysRevX.5.021028), Eq. (12); the [author manuscript](https://arxiv.org/abs/1506.06581) gives the same model. In dimensionless units:

$$
\frac{dr}{dt}=\frac{\Delta}{\pi}+2rv,
\qquad
\frac{dv}{dt}=v^2+\bar\eta+Jr+I(t)-\pi^2r^2.
$$

Here $r$ is a nonnegative population firing rate and $v$ is the **principal-value** population voltage, not an ordinary mean over recorded finite-neuron voltages. $\Delta>0$ is the half-width of a Lorentzian distribution of fixed neuron inputs. It is not time-dependent noise. The exact macroscopic reduction assumes an infinite, all-to-all coupled quadratic integrate-and-fire population, the Lorentzian density reduction and instantaneous synapses. The module does not simulate individual neurons, a spatial cortex, delayed synapses or finite-population fluctuations.

Each colored curve is an **independent preparation of the same population model**. $J$ couples neurons within that idealized population; there is no coupling between the displayed curves. The seeded initial rates and voltages change from curve to curve. Every curve receives the same external current. Increasing the preparations control increases the number of independent traces, not the neurons represented by one trace. The source's phase-space analysis supports fixed-point attractors for constant input; the module makes no claim of sustained autonomous oscillations. A pulse or sine current produces the displayed driven responses.

## Numerical method and guard

The source uses Float64 classical RK4, with up to the selected maximum step. Integration also stops exactly at each of 1,201 uniformly spaced recorded times and at pulse boundaries. The pulse turns on at one quarter of the duration and off at three fifths. Within a split pulse step, all RK4 stages use the current from that interval, including its one-sided endpoint. This prevents a discontinuous forcing value at an interval boundary from contaminating an otherwise constant-current step.

The Jacobian is

$$
A(r,v)=\begin{pmatrix}2v&2r\\J-2\pi^2r&2v\end{pmatrix}.
$$

At the initial state, intermediate stages and proposed final state, the local resolution guard requires

$$
\Delta t\max\{2|v|+2r,\ |J-2\pi^2r|+2|v|\}\le0.4.
$$

This checks a local infinity-norm scale. It is a conservative local resolution choice, **not a global nonlinear RK4 stability or error bound**. Rates must remain positive and state values finite. Since $dr/dt=\Delta/\pi>0$ at $r=0$, the exact equation preserves the nonnegative half-plane; an unresolved numerical crossing is rejected rather than clipped. If any preparation fails a check, the entire step rolls back and the UI shows the stop reason. The module refuses to export an incomplete or stopped trace. It does not silently alter the model to keep an attractive picture.

The generic shell validates finite numeric controls and clamps their declared ranges before the module receives them. The default step is 0.002, selectable from 0.0005 to 0.008. Stronger responses may require the smaller step. Finite tests do not prove every legal parameter combination passes the guard or is accurate. The sampled min/max rates in the status line describe the stored samples, not a continuous-time extremum.

## Independent references and results

Run `node tools/neural-mass-science.js --write`. It extracts the actual production functions; the analytic flow and Dormand–Prince reference never call the production RK4 or current evaluator. The [recorded results](results/neural-mass-science.json) include the production source fingerprint.

For $J=0$ and constant total input $a$, let $\rho=\sqrt{a^2+\Delta^2}$. The stationary solution is

$$
r_*={1\over\pi}\sqrt{\frac{\rho+a}{2}},\qquad
v_*=-\sqrt{\frac{\rho-a}{2}}.
$$

For a trajectory, $z=v+i\pi r$ obeys the standard complex Riccati equation $\dot z=z^2+a+i\Delta$. Choose $\kappa=-\sqrt{(\rho-a)/2}+i\sqrt{(\rho+a)/2}$ and set

$$
w_0=\frac{z_0-\kappa}{z_0+\kappa},\qquad
w(t)=w_0e^{2\kappa t},\qquad
z(t)=\kappa\frac{1+w(t)}{1-w(t)}.
$$

This supplies an independent closed-form reference. These are known elementary consequences of the uncoupled equation and are not originality claims. Piecewise composition of this flow supplies the exact pulse reference.

| Check | Declared acceptance | Measured result |
|---|---|---|
| Nine uncoupled equilibria: $a=-3,0,2$, $\Delta=0.1,0.5,2$, time 2 | State error below $10^{-12}$ | Maximum $3.68\times10^{-16}$ |
| Two nonstationary Riccati trajectories to time 2, steps 0.008/0.004/0.002 | Finest state error below $10^{-9}$; each halving ratio between 13 and 20 | Finest errors $9.91\times10^{-12}$ and $5.41\times10^{-13}$; ratios 16.02–16.13 |
| Coupled sinusoidal case $J=8$, $\bar\eta=-2$, $\Delta=0.5$, amplitude 2.5, frequency 0.4; time 2 | Finest error below $10^{-7}$; halving ratios 13–20; reference change below $2\times10^{-12}$ and 1% of finest error | RK4 finest error $2.68\times10^{-11}$; ratios 15.78/15.88; independent Dormand–Prince fifth-order reference half-step change $4.44\times10^{-15}$ |
| Actual `makeSim` pulse trajectory, 1,201 samples through time 12, max step 0.008 | Maximum state error below $2\times10^{-8}$; all rates positive | $9.90\times10^{-9}$ maximum |
| Six presets, 32 preparations each | Completed requested duration, finite positive rates, no guard stop | All pass; 6,000–30,000 steps; sampled rates 0.0215–2.802 across cases |
| Same-seed repeat / different seed | Exact same arrays / different arrays | Both pass |
| Rejected step and invalid negative rate | Explicit stop; no partially committed step | Both pass |

Errors are Euclidean norms in the dimensionless $(r,v)$ coordinates. This is numerical error against a deterministic reference, not a sampling confidence interval. The raw RK4 convergence tests keep final time fixed and use the requested timesteps directly, avoiding the production output cadence capping all refinements at the same step.

Two negative controls establish that the references can fail: reversing the quadratic rate term produces 0.152 state error in the short control trajectory; using the unsplit endpoint forcing values produces 0.00144 maximum pulse error. The stopped-step fixture uses an injected rate/voltage state to test rollback and diagnosis, not to claim that the six presets reach that extreme state.

## Browser and print evidence

Run `node tools/neural-mass-print.js --write` with Playwright and Chromium available. The [print result](results/neural-mass-print.json) covers phase, rate and voltage views; 32 and 128 preparations; direct PNG and real SVG at **2400×2400 and 2400×1800**; and the actual shell's 8-inch, 300-ppi vector print route. The source has no production audit API: the harness exposes state only in a temporary instrumented local test build.

Each SVG contains one path per preparation and exactly 1,201 vertices per path. Independent coordinate reconstruction from stored rates, voltages and times agrees at the checked points to less than $10^{-9}$ print pixels. PNG/SVG mean absolute RGB differences are below 1.5 on a 0–255 scale after both are rasterized at print dimensions and reduced consistently. The measured maximum is 0.456. Small differences include text rasterization and antialiasing. The complete scientific state, histories, current rates/voltages, time and step count remain **exactly unchanged** by every export. Pause stops the preparation, resume completes it, and completed traces remain still. A deliberately unresolved step shows its actual stop reason in the UI and refuses export.

The exported lines join stored samples. More print pixels make the strokes sharp; they do not add time samples, reduce integration error or guarantee that unrecorded sharp transients are resolved. Full parameter-domain sampling/refinement, finite-neuron comparisons, and other browsers/hardware remain unverified.

The required plate check `node tools/check.js neural-mass 12000` passed the default, all six presets, exact repeated-seed fingerprint and tab return with one visible canvas. Module order is 36.8. Screen luminance percentiles (p01/p50/p99, 0–255) for the checked seed are:

| Plate | p01 / p50 / p99 | Ink fraction |
|---|---|---|
| Default / driven | 10 / 10 / 123 | 0.1167 |
| Relaxation | 178 / 238 / 238 | 0.0502 |
| Pulse | 8 / 8 / 38 | 0.0215 |
| Inhibitory | 138 / 234 / 234 | 0.0533 |
| Slow drive | 17 / 17 / 104 | 0.0760 |
| Broad inputs | 26 / 26 / 117 | 0.0283 |

The standard all-preset print command `node tools/export.js neural-mass 8 300 8000` passed all seven 2400×2400 sheets. Browser/runtime checks are distinct from the numerical evidence above. This module remains a bounded partial validation, not a certification of every setting or a claim about real neural tissue.

## Complete recorded-trajectory and print review (2026-09-22)

`node tools/neural-mass-print.js --write` now independently recomputes every
recorded value using a separately coded fifth-order Dormand-Prince method at
steps .002 and .001. The reference splits pulse boundaries and begins with the
actual recorded initial preparations. It never calls the production stepper.
The three full 30-time-unit fixtures use seed `neural-print`: default phase
with 32 preparations; pulse/rate with 128; sine/voltage with 32 and J=-6.
Every other effective parameter is included in the result artifact.

All 461,184 voltage/rate values agree within 1e-6 (observed worst 2.20e-10), and
reference refinement must agree within 1e-8 (observed worst 2.53e-11).
A one-time-sample shifted trajectory must differ by more than .01. Every point
of every SVG trace is now checked at both 2400x2400 and 2400x1800: 922,368
coordinates, tolerance 1e-9 pixels. A 2-percent horizontal scale distortion is
rejected. Actual raster/vector comparisons, shell export, unchanged state,
pause/resume and refused incomplete recordings remain checked. The independent
analytic, convergence and guard suite is also required.

The full label covers these three complete finite recordings and exports plus
the analytic benchmark domain above. It does not certify arbitrary controls,
long-time behavior, unrecorded transients, finite-neuron or spatial networks,
experimental brain data, clinical predictions or other rendering hardware.
