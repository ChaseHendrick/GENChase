# Exact scalar ODE: no seam

The neural-field Lohner integrator is `papers/nf-pulse/code/lohner.py`.
A step is `step(X, h, order)`. The dimension is the constant `N = 6`
(state `(U, V, Q, P, Y, kappa)`, with `kappa' = 0`). `step` takes no field.

The field is fixed inside the step:

- `vf` calls `nfcore.vfield`
- `taylor_vals` calls `nfcore.taylor` on the first five components and `kappa = x[5]`
- `taylor_jet` inlines that same recursion, with gradients, and never calls `nfcore`

`rough_enclosure`, `choose_h`, and `integrate` call those three by name.
`LohnerSet.from_box` sizes itself from the box, but `step` always builds a `6 x 6`
Jacobian and a remainder on the first five components only.

`step` is the function that would have to take a field argument (Taylor values, jet,
and vector field) before `y' = -y` could be integrated here. Replacing `nfcore.vfield`
or `nfcore.taylor` is not a seam: `taylor_jet` would still be the neural-field jet.

The integrator was not edited and was not copied.
