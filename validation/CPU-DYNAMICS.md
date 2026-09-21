# CPU dynamics follow-up

These are bounded checks of maintained calculations. Numerical convergence,
historical originality, physical experiments and print accuracy are separate
questions. None of these tests establishes novelty.

## Tennis-racket correction

The old forward Euler update added about 5.4% energy over the default 60-unit
run, and as much as 24.4% in the tested 120-unit runs. It has been replaced by
fourth-order Runge-Kutta. The starting state, inertias and sampling interval are
unchanged; corrected trajectories can therefore produce different saved-recipe
images. A preset previously called "Stable I1" has been renamed because it still
starts near the intermediate axis. Zero observed flips is now described as
"no flip in this time window", not stability.

Run `node tools/rigid-body-audit.js --write` for the
[results](results/rigid-body-audit.json). At I2 = 1.05, 1.4 and 1.7, durations 20,
60 and 120, seed tilt 0.02, and a 160 by 200 field, relative energy and squared
angular-momentum drift are below 2.3e-9. The acceptance limit is 1e-7.

A separate calculation evolves body angular momentum using `L' = L cross I^-1 L`.
It agrees with production angular velocities to below 4.3e-9 at time 20 on the
finest of 100, 200 and 400 steps. Errors decrease by factors 251 to 262 across
the fourfold refinement, consistent with fourth order. Reference refinement
from 4,000 to 8,000 steps changes the solution by less than 4e-13.
Reintroducing the old Euler update must reproduce more than 4% energy drift.
The conserved quantities follow the torque-free Euler equations described in
[Tong's rigid-body lectures](https://www.damtp.cam.ac.uk/user/tong/dynamics.htm).

These checks do not certify indefinite energy preservation, all controls, exact
flip times or printed numerical resolution. RK4 is not an exactly symplectic method.

## FPUT chain evolution

Run `node tools/chain-science.js --write` for the
[results](results/chain-science.json). The actual displacement and velocity arrays
are compared with the exact first mode of a fixed-end linear chain at alpha = 0,
and an independent bond-tension RK4 calculation at alpha = 0.22 and 0.42.
The fixed ends are included in the 48, 96 and 128 sites. For each chain, all
three step sizes reach the same physical time, respectively 16.8, 33.6 and 44.8.

Steps 0.07, 0.035 and 0.0175 show first-order convergence, as expected for the
production symplectic Euler scheme. Finest state errors are below 5.3e-4, against
a 1e-3 tolerance. The nonlinear reference changes by less than 7e-15 between
2,000 and 4,000 steps. Increasing the linear force by 10% produces an error
above 0.05 and fails the benchmark. The smallest test step is below the UI's
minimum of 0.02 and is supplied directly to the computation by the harness.

The chain model is classical, originating in the
[1955 Los Alamos report](https://cds.cern.ch/record/425600).
This audit supports finite-time state evolution only. Two defects remain:

- The quantity labelled E1 is absolute first-mode displacement amplitude.
  Energy also requires the mode velocity. The displayed energy and recurrence
  classifications are excluded from partial validation.
- Changing "Periods kept" from 40 to 220 produces identical numerical states.
  That control is unused in the evolution. Nonlinear recurrence, equipartition
  and a physical period calibration remain unvalidated.

## Single KP-I lumps

Run `node tools/lump-science.js --write` for the
[results](results/lump-science.json). Independent finite differences of the actual
`one`, `oblique` and `tight` fields test
`u_xt + 6(u_x^2 + u u_xx) + u_xxxx - 3u_yy = 0` at twelve spacetime points per
preset. No module-reported residual or peak value is used as the reference.

Steps 0.04, 0.02 and 0.01 give second-order residual convergence. Finest normalized
RMS residuals are 0.000878, 0.000389 and 0.00755, against a 0.01 tolerance.
Normalization divides each point's residual by the largest absolute PDE term
or 1, whichever is greater. This is a residual scale, not a relative solution
error. Increasing the longitudinal time coefficient by 10% gives a residual
above 0.037, beyond the failure-control threshold of 0.02.

The KP-I equation and classical localized solutions are described in
[Biondini and Pelinovsky's account](https://www.math.buffalo.edu/~biondini/papers/scholarpedia2008v3p6539.pdf).
Finite samples do not constitute a proof. The multi-lump modes multiply single
tau functions, which gives an approximate superposition and does not generally
solve the nonlinear equation. Those modes, interaction claims, displayed
diagnostics and print accuracy are excluded.

## Additional issue found during review

The Purcell module advances its position by a prescribed increment proportional
to amplitude squared. It does not solve a force and torque balance in Stokes flow;
the scallop's zero displacement is hard-coded. It remains unvalidated. Testing
that imposed displacement would only check the illustration, not the swimming
physics. A hydrodynamic implementation and an independent benchmark are still needed.
