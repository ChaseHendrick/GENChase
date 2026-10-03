# Independent replay of the spectral certificate

This extension preserves the published producers and their records. It introduces
an opt-in observer (`stability_witness.py`) and a separate verifier
(`certificate_replay.py`). The verifier imports no producer or model module.

The present acceptance scope is **the complete C0-C5 spectral certificate under
explicit operator-enclosure, orbit-existence, phase-kernel and Hill-sector
premises**. It is not an independent end-to-end verification of the ionic model,
the strip covers, the orbit contraction, or a physiological action potential.
In particular, source hashes bind which enclosure computation was observed;
they do not prove that computation correct. The receipt explicitly sets
`independent_model_enclosures` and `independent_orbit_existence` to false.

## Witness contract

Schema `cardiac-spectral-witness/2` stores finite rational endpoints for every
real and imaginary coordinate. Rational strings have the form `numerator/denominator`;
floats, nonfinite values, duplicate JSON keys, reversed intervals and unknown
top-level acceptance fields are refused. The caller supplies an independently
checked manifest binding source files, input bytes, exact parameter domain,
typed settings, and identity. A manifest taken uncritically from the witness
itself is not independent provenance verification.

The witness includes:

* dimensions, Fourier window, coefficient cutoff, coupling bound, frequency
  interval, spectral rectangle, requested and certified decay rate;
* primitive model Fourier enclosures, strip envelopes, derivative centres and
  radii, Hessian/path error envelopes, strip widths and frequency polynomial;
* exact power-of-two similarity exponents, diffusion constant, and constant
  comparison block;
* every damping residue's proposed basis, inverse proposal, diagonal and block;
* all window basis/inverse polynomial matrices and diagonal proposals;
* the outward period lower bound and multiplier upper bound.

The observer traces only the frozen `_certify` or `_certify_uniform` frame. It
retains matrices before deletion and each tail residue before the loop overwrites
it, without changing locals or producer results. Nonempty producer controls are
refused. Witnesses and manifests are written exclusively to new paths. Existing
published JSON/JSONL files are never rewritten.

The verifier reconstructs both the window operator and all coupling coefficient
rectangles from the same primitives. Separately supplied `H`, `AS` or remainder
matrices are refused in schema 2. It derives ring damping as
`4 D N^2 sin^2(pi m/N)`, including exact zeros for multiples of `N`, verifies
the coupling bound and independently bound dimensions/domain/settings, and
constructs the frequency and remainder terms. The observer and interface source
hashes are checked before and after capture along with the frozen producer and
all scientific sources, including the model expression and state scales.

Schema 1 is retained only for explicitly labeled private historical/migrated
witness review. Its separate operator/coupling enclosures are premises. A
successful schema 1 replay does not establish schema 2 operator assembly.

## Premises that remain explicit

There is a genuine nonconstant real periodic orbit with frequency in the saved
interval, and its linearization has Fourier coefficients simultaneously enclosed
by the saved coefficient rectangles and by the saved window polynomial/remainder.
For all omitted coefficients, the saved geometric envelope holds. The phase
derivative supplies the known zero eigenvalue. The reviewed Hill-sector and
compact-resolvent lemmas apply to this same operator. These premises include
uniformity on the saved parameter domain when the polynomial witness is used.

The complex rectangles can be larger than the corresponding disc majorant.
Consequently the verifier does not require a rectangular enclosure's matrix norm
to be below the analytic disc bound; both are premises about the true coefficient.
The tail sums use the analytic envelope while explicit coupling terms use the
larger rectangular enclosure, which is conservative.

## Replayed argument

For an interval matrix, sums of outward absolute-value bounds give a valid
induced column norm. All matrix products below are recomputed in a fresh Arb
context, using a backend that imports only python-flint. A separate standard-library
Fraction matrix oracle checks small exact-point products in the tests. This
independence is algorithmic, not independence from the Arb arithmetic library.

Let `delta>0`, `a<0<b`, `R0>alpha`, with
`b-a >= N omega_hi` and `max(-a,b)<N omega_lo`.
The verifier reconstructs `alpha`, the off-diagonal Fourier sum, and
`G(k)=2 sum_i s_i q_i^k/(1-q_i)`. It checks the decay direction
`q_i >= exp(-rho_i)` and `0<q_i<1`. Thus the right spectral exclusion and
Fourier-tail sums follow from the stated enclosure premises.

For each residue let `U` be a basis proposal and `W` an inverse proposal. Recompute
`C=W U-I`, `q=||C||<1`. Then `U` is invertible and
`U^{-1}=(I+C)^{-1}W`, with norm at most `||W||/(1-q)`.
For diagonal `Lambda`, independently compute `E=W X U-Lambda`. The exact defect is
`U^{-1} X U-Lambda=(I+C)^{-1}(E-C Lambda)`, so its norm is at most
`(||E||+q max_j|lambda_j|)/(1-q)`.
Compute the diagonal separation
`gamma=min_j max(-delta-eta-Re lambda_j, g0-eta-|Im lambda_j|)`.
Require `gamma>||F||`; then the tail resolvent is bounded by
`rho_T=max_r ||U_r|| ||W_r||/((1-q_r)(gamma_r-||F_r||))`.
This validates the inverse proposal rather than trusting a saved inverse flag.

In the window, multiply the saved polynomial matrices to reconstruct every
coefficient of `C(d)=Vi(d)V(d)-I` and
`W(d)=Vi(d)H(d)V(d)-Lambda(d)` through degree four.
For `|d|<=h`, sum each column bound with powers of `h`. Add the independently
multiplied `|Vi| R |V|` remainder. Let the resulting bounds be `c_j,w_j`.
Require `q_C=max c_j<1`, then reconstruct
`fm_j=(w_j+|lambda_j|c_j)/(1-q_C)` and
`beta_j=sum_i |Vi_ij|/(1-q_C)`.

For every proposed diagonal value, membership in the open spectral rectangle is
decided by exact rational comparisons. Distances to its boundary are reconstructed
independently, using exact rational square-root bounds where necessary; the
uniform case subtracts `h |lambda1_j|`. Every distance must be positive and exactly
one proposed eigenvalue must lie inside. The positive uniform separation prevents
the moving diagonal eigenvalues from changing this count.

Reconstruct every window-to-tail column `r_j`, every explicitly treated tail-to-window
column bound, and the far geometric bound. Let their maximum be `bhat`.
With `theta_T=(sigma_off+||A0-A0c||)rho_T`, require `theta_T<1` and, for
**every** window column, require

    fm_j + bhat rho_T r_j/(1-theta_T) < dist_j.

These are the Schur-complement inequalities of the reviewed spectral homotopy
lemma. The count is transported from the proposed diagonal to the true operator;
the known phase eigenvalue then has algebraic multiplicity one. The sector lemma
and rectangle geometry exclude every other exponent with real part greater than
`-delta`. The receipt saves every reconstructed column and positive margin, not
merely a worst ratio or producer success flag.

Finally independently verify `0<Tlo<=2*pi/omega_hi` and
`exp(-delta*Tlo)<=multiplier<1`. The multiplier follows only with the stated
periodic-orbit and sector premises. All strict inequalities are retained; no
tolerance is used to rescue a failed certificate.

## Separate model-enclosure replay needed for an end-to-end claim

The next contract should save the exact trigonometric centre/path, parameters,
strip rectangle partition, evaluation boxes, DFT node values, componentwise strip
suprema, alias bounds, Hessian/Cauchy majorants, weights and orbit tube. A model
checker can call the pinned translated ionic expression as its explicit trusted
formula while independently constructing each rectangle/path box and reevaluating
every derivative. It must prove full strip coverage, domain safety, the DFT/alias
enclosure, and the path/Hessian remainder before handing the operator premise to
this spectral verifier. The contraction and phase certificate needs its own
independent replay as well. Saved node values alone cannot replace evaluation
of the nonlinear model on the enclosing boxes.

No implementation or successful run of that separate model checker is claimed
by the present module. A future composition may call itself end-to-end replay
only after all these premises have separate accepted receipts.

## Bounded checks

`python -m unittest test_certificate_replay -v` exercises complete point and
quadratic uniform witnesses, an exact Fraction matrix oracle, strict parsing,
37 mathematical tampering cases, missing/duplicate residue and coefficient
coverage, inverse failures, count/boundary failures, SC failure and multiplier
bound directions. Actual producer capture and full-size replay have separate
bounded logs and must be reported separately from these synthetic controls.

Schema 2 also exercises point, quadratic and count-zero certificates and
primitive coefficient, scaling, frequency, diffusion, domain and typed-setting
mutations. A generic subsystem may request exact count zero with `IV=-1`,
`D=0`, and only operator-enclosure/Hill-sector premises. All finite/tail/SC
inequalities still pass. Applying this to a larger triangular system additionally
requires its block decomposition and coupling/semigroup argument; no such
implication is inferred solely from count zero.
