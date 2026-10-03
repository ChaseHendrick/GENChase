# Independent model-enclosure reconstruction

This experimental checker supplies a separate implementation of the model
derivatives, full-strip partition, Fourier sums, alias bounds and orbit-tube
Jacobian estimates. It is not an independent translation of the TP06 source
and does not reproduce the existence contraction. A success is conditional
on the pinned literal 18-state field, exact decimal/scaling loader, and a
correctly admitted state, conductance and frequency tube for the stated branch.

The actual private literal loader is executed from captured source bytes.
Current source hashes must equal the hashes captured at import and the caller's
independent expected manifest, before and after reconstruction. The checker
does not reuse a producer's previously cached literal field. The validated
runtime is python-flint 0.9.0; arithmetic precision is recorded.

For a fixed positive amplitude interval, the exact finite profile and tangent
define c(e), w(e), g(e) and omega(e), with phi(e)=c(e)+e*w(e).
The mixed forward derivative stores value, all state derivatives, one state/
parameter direction, and their mixed derivatives. Its product and elementary
chain rules differentiate the pinned scaled field. Logarithms and square
roots require a certainly positive real part throughout each complex box;
division rejects a zero-containing divisor.

Exact rational rectangles tile the entire normalized strip. A sweep checks
every horizontal slab and its full vertical interval, refusing gaps or
positive-area overlaps. Every model evaluation must be finite on these boxes.
The signed direct DFT is recomputed at all nodes; both infinite alias families
are bounded by the full-strip majorant. This encloses all retained positive
and negative Fourier coefficients.

J0 enclosures must lie inside the saved rectangles. The derivative family is
enclosed across exact amplitude subdivisions and its Fourier coefficients
must lie inside each saved disk, using its exact center and the lower endpoint
of its saved radius. The fundamental theorem of calculus then bounds every
parameter coefficient by the claimed affine family and derivative variation.
This requires containment, never equality of two numerical proposals.

For the actual orbit tube, let Delta and dg range over complex squares that
contain their admitted disks. Evaluate the derivative of J at
(phi+s*Delta,g+s*dg) in the direction (Delta,dg). The same squares contain
every point for 0<=s<=1. A full-strip bound for this derivative bounds the
integral difference between the approximate and true Jacobians.
The implemented tube majorant differentiates the full field a second time in
all eighteen scaled state coordinates and conductance, using a sparse ordered
Hessian and the same exact product/elementary chain rules. Square boxes enclose
the straight-segment evaluation points; the final triangle sum uses the actual
admitted disk radii, sum_l sup|dJ_kj/dz_l| t_l + sup|dJ_kj/dg| t_g. This avoids
enlarging the direction disks to squares in the final absolute-value bound.
Independently
computed bounds must be no larger than the lower endpoints of the saved
positive strip/error majorants. The frequency proposal and its supplied
existence error are checked separately.

The receipt binds the exact operator primitives, profile, amplitude domain,
tube, sources, arithmetic runtime and settings. A hash establishes the
identity of the checked object. It never supplies a missing inequality or
validates the premise that an orbit exists in the supplied tube.

The small tests include exact mixed-derivative controls, signed Fourier
controls, missing/duplicated partition refusal, negative/nonfinite majorant
refusal, wrong enclosure direction and stale identity/source refusal. The
actual TP06 point comparison uses its shared native AD as a numerical
cross-check, not a theorem premise. Actual full reconstruction results,
including honest failures, belong in a separately source-bound review record.
