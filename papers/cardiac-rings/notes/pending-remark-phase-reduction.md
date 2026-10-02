# Pending: the phase-reduction remark (numerical), for integration into the manuscript

Source: research/cardiac-cycle-certificates/numerics/phase_reduction.py and
results/numerics-phase-reduction.json (floating point; not a proof).

Remark (numerical, floating point; not part of the proofs).

- **Phase model.** We compared the certified rotating 1-waves with the classical phase reduction.
  - Z is the infinitesimal phase response curve of the single-cell orbit. It is normalised by Z·φ' = 1 in radian units
    and computed spectrally from the adjoint equation. A finite-difference monodromy check agrees with it to 3e-5 in the
    V component.
  - The interaction function is H(ψ) = (1/2π)∫Z_V(θ)(φ_V(θ+ψ) − φ_V(θ))dθ.
  - The phase model θ_j' = ω + c[H(θ_{j−1}−θ_j) + H(θ_{j+1}−θ_j)] has the splay state for every N.
  - The splay state is stable, because H'(2π/N) + H'(−2π/N) > 0. In fact H'(±2π/N) > 0, which is Ermentrout's sufficient
    condition.
- **Predictions against the certificates, for N = 8, 16, 32, 64:**
  - the period shifts T(N) − T(1) ≈ 2.45 to 2.58e-3 ms, to within 0.8%;
  - the leading nontrivial Floquet exponent (ring mode k = 1), to within 3.5% in its real part and 2.6% in its imaginary
    part.
- **Weak-coupling regime.** Scaling the coupling by s shows that both discrepancies vanish linearly as s → 0. So the
  waves lie in the weak-coupling regime for the long-wave modes. The relevant parameter, 4c sin²(π/N)/ω ≈ 5e-3, does not
  depend on N.
- **Where the phase model fails.** It is not uniformly valid. For N ≥ 16 its rates for short-wavelength ring modes exceed
  the slowest transverse rate of the cell, 4.7e-5 per ms, and the computed exponents of those modes depart from it.
- **Conclusion.** The phase reduction explains the leading exponents, and so the certificates' δ = 5e-6. It cannot
  replace the Hill-operator certificate for the whole spectrum.
