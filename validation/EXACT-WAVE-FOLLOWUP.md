# Exact wave follow-up

This audit adds bounded numerical evidence for two established models. It does not
add novel findings or certify their rendered plates.

## Sine-Gordon breather

`node tools/breather-science.js --write` extracts the scalar expression from the
maintained module. Centered differences independently test `u_tt - u_xx + sin(u)`
at four points for beta 0.2, 0.45 and 0.75. Halving the difference step from 0.02
to 0.01 to 0.005 gives second-order convergence. Finest RMS residuals range from
1.12e-6 to 6.63e-6. A frequency perturbation fails the same residual comparison.

The period check agrees within 3e-15. Numerical integration of the actual energy
density, `(u_t² + u_x²)/2 + 1 - cos(u)`, over `[-20/beta, 20/beta]` at time 0.37
agrees with `16 beta` to relative error below 1.2e-10. The integration uses 16,000
trapezoids and derivative step 2e-5. These are sampled checks, not a global proof.
For the established solution, see [Dorey's breather demonstration](https://maths.dur.ac.uk/users/P.E.Dorey/SOLITONS_2025_26/SGpictures/SG_Breather.html).

Known limitation: the module's on-screen `E_out/E` sums `u²`, which is not energy.
That diagnostic and its theory-zero label are not validated by this audit. The
browser field is Float32 and its export enlarges the existing grid. Neither the
diagnostic nor print accuracy receives a passing label here.

## Camassa-Holm peakons

`node tools/peakon-science.js --write` loads the maintained `peakonsAt` and `uOf`
functions. It tests the BSS spectral construction against the independent particle
equations `x_i' = sum_j m_j exp(-|x_i-x_j|)` and
`m_i' = m_i sum_j m_j sign(x_i-x_j) exp(-|x_i-x_j|)`.
See [Lundmark and Szmigielski's peakon review](https://arxiv.org/abs/2203.12954).

All six kinds are checked at separations -1.2, 0 and 1.2 and times -3, -0.7, 0.4
and 2.8. Centered time steps 0.02, 0.01 and 0.005 show second-order convergence
for multi-peakon cases. The single-peakon limit is linear in time and reaches
roundoff instead. Finest residuals remain below 6.1e-6; mass and Hamiltonian
drift stay below 5e-14. Mutating the actual spectral weights to advance 17 percent
too fast produces an ODE residual above 0.27 and is rejected.

A PDE residual away from a peak cannot detect a wrong traveling speed because
`u-u_xx` vanishes there. This audit therefore uses the distributional particle
equations, which constrain crest motion. It does not establish a weak-solution
proof, mixed-sign collisions, all parameter values or print accuracy.

## Deferred modules

Airy remains unvalidated. Inspection found that the implementation evaluates a
real Airy argument, while the finite-energy expression requires complex propagation
terms. Its displayed peak-at-caustic comparison also needs review. No passing
Airy evidence is registered. These issues need a separate correction and benchmark.

Results are saved in [breather-science.json](results/breather-science.json) and
[peakon-science.json](results/peakon-science.json). Both checks run in CI. The ledger
now has 24 partially validated techniques and 104 unvalidated techniques, with zero
fully validated techniques. These counts describe implementation evidence, not discoveries.
