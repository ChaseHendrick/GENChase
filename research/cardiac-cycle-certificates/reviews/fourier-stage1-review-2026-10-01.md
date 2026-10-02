# Fourier stage 1 review (2026-10-01)

An adversarial reading of `fourier/arbmodel.py`, `fourier/fourier_eval.py` and their tests, run by a review agent in
this session (not an outside review). The question asked was whether any output ball could fail to contain the true
value, and whether any test cannot fail. Probes were run in the session scratchpad.

## Result

The reviewer found no way for an output ball to miss its true value. The findings were about tests and API hardening.
All of them were fixed in the same commit as this file.

| id | severity | finding | fix |
| --- | --- | --- | --- |
| F1 | weak test, soundness-relevant | The centred (mean-value) strip bound was never tested. A wrong derivative black box made S fall below the exact strip sup with every test still passing (probe: exp(2 cos theta), rho = 1. Half the derivative gave S = 21.77 and a zero derivative gave S = 14.63, against the exact 21.89). | `test_centred_form` (exp(a cos theta) and 1/(b - cos theta) against closed-form sups). New negative controls `nc_half_derivative` and `nc_zero_derivative`. The cover now raises when the centred and naive balls of a box are disjoint, since both must contain g on the box. |
| F2 | missing | The Z2 two-variable form (plan step 1) is not in stage 1. | Built in stage 2 (`fourier/existence.py`) as a polydisc majorant. |
| F3 | weak test | In `test_damping_symbol`, "N = 63 against N = 64" and "d_1 is not -d_1" cannot catch a sign error. | Relabelled as sanity checks. Added `test_ring_symbol_consistency`: a rotating V mode put through `ring_field` gives exactly -d_m on V, and +d_m is disjoint. |
| F4 | weak test | `nc_understated_S_bessel` never fed the understated S to the DFT. | Renamed `nc_cover_not_loose_bessel`, with its real purpose stated. The soundness control is `nc_understated_S_tight`. |
| F5 | API hardening | Nothing tied a supplied S to the same phi and rho, or required a full-strip cover. | `fourier_coefficients` accepts a `StripSup`. It checks `full_strip`, exact rho and `TrigPoly.digest()`. A raw list is recorded as `S_source = "raw"`. `test_stripsup_identity` covers this. |
| F6 | cosmetic | `bench_strip.py` stored rounded float midpoints of S. | It now stores exact binary upper ends (`S_upper`) and labels the floats as diagnostics. |
| F7 | cosmetic | `arbmodel` `prec=None` means 128 bits, not the ambient precision. | Documented. |
| F8 | liveness only | Log/sqrt guards require Re > 0, and the GHK removable point can force refusals at a large rho. | No change. A refusal is not a wrong answer. |

## Checked and found sound by the reviewer

- Exact decimals, via the tokenize rewrite and the byte-for-byte freshness check.
- The (1 - u) term. It keeps the reference form; it is sound but wide near V = 0.
- Domain guards and Arb's NaN and zero-division behaviour.
- Ring coupling sign and the damping symbol in its N and eps forms.
- Every dual-number rule.
- The aliasing bound (Lemma 3, tight on 2 cos 8 theta) and the weighted tail.
- The strip cover. It tiles the rectangle exactly, the seam is covered by periodicity, and budget-capped and
  min-width leaves still enter S.
- Floats are used only for refinement order.
- Every other negative control tests what it claims.

## Not checked

- The CAPD overlap test was not rerun by the reviewer. It was rerun after the fixes, with the `compare_rhs` binary,
  and passed.
- `bench_strip.py` was not run on the N = 64 centre.
