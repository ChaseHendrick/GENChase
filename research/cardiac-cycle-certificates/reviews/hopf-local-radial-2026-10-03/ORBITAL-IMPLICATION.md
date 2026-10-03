# Pointwise nonlinear orbital stability implication

This is the written implication from the newly checked local spectral gates.
The actual native producers and their source/input/inequality audits are archived
here. Independent full finite/tail eigenpair and count 2 small-gain-vector replay
is still absent. This argument does not close the practical amplitude gap to
the separate away-from-zero pilot near epsilon 0.0095.

Fix any real epsilon with

    0 < epsilon <= e0 = 1/51200000.

All coordinates and time are those of the released scaled TP06 model, with time
in milliseconds. Let c be the exact positive rational number

    c = 17598251151852745997420323/260617961456609980053454848.

The checked radial bound is Re(lambda_rad) <= -c epsilon^2; c is approximately
0.06752508942014214. The other 16 gate uses exact delta
17293822569103/576460752303423488, which is greater than 3/100000. Define the
conservative physical-time spectral margin

    d(epsilon) = min(3/100000, c epsilon^2) > 0.

## Orbit and spectral premises

The fresh complex branch contraction, its strict model-domain guards, its
nonzero-frequency bound, and its identification with the accepted real branch
supply a compact real periodic orbit in an open analytic model domain. For
positive epsilon it is nonconstant: the exact normalized voltage coefficients
w[V,+1]=w[V,-1]=1/2 imply physical |Vhat_1|=epsilon/8 mV, which is nonzero.
The parameter and frequency belong to the same identified branch; no unrelated
historical stability point supplies a premise.

Differentiation of the orbit equation supplies the exact nonzero phase
variational solution. It gives physical Floquet exponent zero and multiplier
one. The augmented quotient supplies a nonzero Floquet eigenvector with radial
exponent lambda_rad. Its two fixed voltage gauges exclude a scalar multiple of
the phase column, whose voltage coefficients have opposite imaginary signs.
The Cauchy sign bound makes the radial exponent distinct from zero. Its whole
proved complex exponent disk has radius less than the count 2 contour margin,
so it belongs to the counted critical cluster. The two distinct exponents
exhaust its algebraic count 2. Each therefore has algebraic multiplicity one;
in particular, the phase multiplier is simple. The native count 2 spectral
exclusion places the other 16 exponent classes strictly to the left of -delta.
This uses the producer's fundamental Floquet representative/count argument,
not a comparison of sampled eigenvalues.

Thus all 17 nontrivial multipliers have modulus at most exp(-d(epsilon) T)<1,
where T is the positive period of this fixed orbit. Zero amplitude is excluded:
there the orbit collapses and neither a simple phase multiplier nor positive
decay is asserted.

## Poincare section and physical-time decay

Choose a transverse section through one point of the nonconstant orbit. The
analytic open model domain and the nonzero flow velocity give a C1 local first
return map P and C1 return time tau. The derivative DP at the fixed point has
the 17 nontrivial multipliers as its spectrum. Its spectral radius is at most
exp(-d T), strictly below one.

For this fixed epsilon, finite-dimensional linear algebra gives an adapted
norm with operator norm of DP below exp(-7 d T/8). Continuity permits a small
closed section ball on which P has Lipschitz constant at most exp(-3 d T/4).
After shrinking the ball, it is invariant under P and its return times lie
between 3T/4 and 5T/4. These choices are existence statements depending on the
fixed epsilon; no numerical radius or norm-equivalence constant is claimed.

Successive returns contract geometrically. C1 bounds for the flow on a compact
local time interval control the portions between returns. Since an elapsed
physical time t contains at least t/(5T/4) returns up to a bounded end interval,
the return contraction gives a rate at least 3d/5. In particular there are
finite constants C_epsilon and a positive local neighborhood, both uncomputed,
for which distance to the orbit is bounded by

    C_epsilon exp(-d(epsilon) t/2) times the initial transverse distance.

The C1 return-time deviations satisfy |tau(y_n)-T| <= L ||y_n||. Their sum
converges geometrically, defining an asymptotic phase shift; the tail sum has
the same exponential bound. Combining this shift with the bounded local flow
and its section coordinates gives convergence to the corresponding phase of
the cycle with any conservative physical-time rate chosen here as d/2.
This establishes pointwise local exponential orbital attraction and asymptotic
phase from the stated spectral premises.

## Quantitative scope and limitations

The explicit rate function is d(epsilon)/2. The constants C_epsilon, section
radius, nonlinear basin and adapted norm are not computed. They may deteriorate
as epsilon approaches zero; the rate itself tends to zero quadratically.
No uniform positive decay rate or nonlinear basin on (0,e0] is asserted.
The small e0 is approximately 1.953125e-8, and its physical voltage first
harmonic is at most 2.44140625e-9 mV. These mathematical bounds carry no clinical
or action-potential claim. They do not prove attraction on the remaining Hopf
bridge or on arbitrary larger rings or the continuum cable.
