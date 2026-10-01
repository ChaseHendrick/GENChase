# Plan for the large rings (N = 32, 64) and the all-N result

Status: plan, 2026-10-01. Produced by a design panel (four independent designs, three judges, one synthesis) run as a
workflow in this session; recorded here so the reasoning behind the route is reviewable. Nothing in this file is a
result. Costs quoted from the designs were measured on prototypes in the session scratchpad under load; estimates are
labelled as such.

Scores (1 to 10, three judges; rigor = low risk of an unsound proof):

| design | rigor | feasibility | strength | time |
| --- | --- | --- | --- | --- |
| A: SparseRingMap (Jacobian time-jets plus variational recursion) insid | 8 | 8 | 6 | 7 |
| B: Fourier radii-polynomial existence plus Hill window exclusion in Ar | 5 | 6 | 9 | 3 |
| C: Obtain and adversarially audit the Mac pipeline's ZeroPrunedSparseM | 5 | 3 | 4 | 3 |
| D: Space-time Fourier (Hill) reduction in Arb: per-N radii-polynomial  | 6 | 9 | 8 | 6 |
| Design 1: SparseRingMap, a drop-in CAPD map (Jacobian time-jets plus a | 7 | 7 | 7 | 7 |
| Design 2: Fourier radii-polynomial existence of the 18-dim MFDE profil | 5 | 7 | 10 | 3 |
| Design 3: obtain and adversarially audit the Mac pipeline's ZeroPruned | 5 | 3 | 5 | 2 |
| Design 4: space-time Fourier (Hill) reduction, per N: radii-polynomial | 6 | 9 | 8 | 7 |
| 1. SparseRingMap (Jacobian time-jets plus variational recursion inside | 7 | 7 | 5 | 7 |
| 2. Fourier radii-polynomial existence with eps = 1/N^2 as an analytic  | 5 | 6 | 9 | 3 |
| 3. Obtain and audit the Mac pipeline's ZeroPruned/Cellwise sparse CAPD | 4 | 3 | 4 | 3 |
| 4. Space-time Fourier (Hill) reduction for single N: radii-polynomial  | 6 | 8 | 6 | 7 |

## Synthesized plan

**Route.** For **N=64** the main proof is Design D, the space-time Fourier/Hill method in Arb. All three judges chose it. For **N=32**, two of three judges also make D the main proof. Design A (SparseRingMap inside CAPD) runs at N=32 as a second, time-domain proof, which all three judges endorse. The two share no library, so their agreement is the cross-check. A at N=64 is optional and gated (step 5). C is dropped, and we do not ask for the Mac sources. B's uniform-in-N stages come later.

**Ideas taken from the other designs**
- **From B, built into D:**
  - windowed bands (B=12) with an exact 18x18 block-resolvent small-gain tail, instead of Gershgorin tail discs in eigen-coordinates (the A_0 eigenvector condition number is 854);
  - eps=1/N^2 carried as a parameter in the code;
  - model decimals made exact with tokenize;
  - K=32 (at K=18, Y0 is limited near 1e-19 by the truncation tail);
  - a Bessel test for the aliasing code;
  - a polydisc majorant for Z2.
- **From C, built into A:**
  - an exact dyadic linear-cell fixture;
  - mutation controls and ASan/UBSan builds;
  - the period gate run inside the C1 pass;
  - the interval M saved to disk, so radii can be retuned without a new C1 run;
  - a Schur frame with the fast block first.

**Facts checked**
- README lines 117-120 give Perron roots 0.99996225 (N=8) and 0.99997284 (N=16). Against the Hill margins, the excess is 4.6e-6 (11% of the margin) and 1.6e-6 (5.4%), so it is shrinking. Judge 3's claim that the N=16 excess was never measured is wrong.
- The same README puts CAPD's 128-bit centre at about 19 GB at N=16. A's new centre can therefore be checked against CAPD only at N ≤ 8.
- No ring certificate exists yet. `results/` holds only the single-cell result, and `scratchpad/proto/sparse8.json` reads verified:false with q_upper 46.7.

**Steps**

1. **Arb foundation (1–1.5 days).**
   - Work:
     - Pin python-flint 0.9.0 by its wheel hash.
     - Translate `model/tp06_18d.py` to Arb with exact decimals.
     - Add forward-mode dual numbers for the Jacobian.
     - Build a rigorous DFT with an aliasing bound.
     - Bound the strip sup with a 2-D cover of the whole strip, not only its two boundary lines.
     - Fix Z2 in the two-variable form; the written version has a dimensional slip.
   - Acceptance:
     - The Arb field contains the mpmath 50-digit values at 40 random states and along the orbit, and overlaps the CAPD IMap.
     - The Jacobian agrees with complex-step derivatives.
     - The DFT encloses I_m(a) for exp(a cos).
     - Negative controls fail: an understated S, a widened nu2, the aliasing term removed, a wrong decimal.
   - Theorem: none. This is infrastructure.

2. **Stage E, existence one N at a time (2–3 days).**
   - Work: radii polynomial at K=32 with 128-bit residuals, an exact damped tail, and runs at N=1, 8, 16, 32, 64.
   - Acceptance:
     - N=1: T lies inside [53.58551856, 53.58552012].
     - N=8 and N=16: T intersects the existing certified intervals.
     - |a_1V| > r.
     - Negative controls fail: ω perturbed by 1e-8, the N=63 damping used with the N=64 centre, a Fourier mode dropped.
   - Theorem: for each N, a rotating 1-wave exists and is locally unique, with minimal period T (enclosed) and not synchronous.
   - Missing: stability.

3. **Lemmas written first, then Stage S (3–4 days).**
   - Write before computing:
     - The Hill-sector lemma in reduced-map form, spec(G) = e^{τ spec H_0}. It must state the multiplicity clause: 0 is algebraically simple, and no eigenvalue of H_0 sits at iωq for q=1..N-1.
     - Exclusion plus isolation of D_0 by a Riesz homotopy. Never count eigenvalues disc by disc: the truncation holds 1166 eigenvalues where 1152 are expected.
   - Compute in 128-bit balls on rows with Re > -1e-3, because 53-bit balls lose about 1e-7 to 1e-6 there. Use δ=5e-6.
   - Acceptance:
     - Certified exponents bracket the Hill predictions -6.32e-6 (N=8), -8.57e-6 (N=16), -9.19e-6 (N=32) and -9.34e-6 (N=64).
     - At N=8, they match the eigenvalues of an ordinary 144-dimensional monodromy.
     - Negative controls fail: δ=7e-6 at N=8, δ=1e-5 at N=64, anti-diffusion, too small a band or K_e.
   - Theorem: together with step 2, for N = 1, 8, 16, 32, 64:
     - every nontrivial Floquet multiplier is at most e^{-δT};
     - the orbit is locally orbitally asymptotically stable with asymptotic phase.
   - Missing:
     - An adversarial second reading before any JSON says verified.
     - A prior-article search crediting Castelli–Lessard, Figueras–Gameiro–Lessard–de la Llave, Johnson–Zumbrun and Golubitsky–Stewart.
     - Identifying the orbit as the one continued from the Hopf branch is still numerical.

4. **A end to end at N=8 and 16, then N=32 (about 4 days; runs in the background, capped and niced).**
   - Work:
     - Add a DMap twin to SparseRingMap.
     - Template run<N,MapT> and periodGate on the map type, in a copy until the session editing verify.cpp is done.
     - Use Perron-vector radii.
     - Build the mixed-precision centre, taking x̂ from the Stage E profile, with the 2·log(sqrt) workaround and domain guards in the MP jets.
   - Acceptance:
     - The centre overlaps CAPD's MpIPoincareMap at N=1, 2, 4, 8, and moves when a 1e-20 error is injected.
     - Map mutations give disjoint entries against stock CAPD at N=8: coupling dropped, one entry 1 ulp inward, band truncated, neighbour index c±2, the l=k term dropped.
     - The dyadic linear fixture is contained exactly at N=8 to 64.
     - N=8 and N=16 close with verified:true.
     - The N=32 period overlaps D's.
   - Theorem: N=8, 16 and 32 proved independently in the time domain, so N=32 is proved by two methods that share no library.
   - Missing: A still shares CAPD's Lohner sets and Poincaré map with the Mac pipeline.

5. **N=64 gate for A, and the stretch goal.**
   - Gate:
     - Measure the excess (Perron root minus max|λ|) at N=8, 16 and 32 while varying the box radius and the order p.
     - Run A at N=64 only if the extrapolated excess is below 3.9e-6, half the predicted 7.8e-6 margin. That means 2–3 passes of 1–1.5 h at about 4 GB, under caps.
   - Stretch: B's Stage 2, existence uniform over eps in [0, 1/64]. The eps-pieces must be narrow, because Z1 inherits ‖A‖ ≈ 5e5.
   - Acceptance: the gate numbers are recorded, and the eps-pieces each satisfy p(r) < 0 and together cover the interval.
   - Theorem: a second, time-domain proof at N=64, plus existence for every N ≥ 8 and for the cable.
   - Missing: stability uniform in N, and nonlinear stability of the continuum (only spectral stability can be claimed there).

**Effort and risk**
- D realistically takes 6–9 agent-days, not the 4–6 its design claims. A takes about 4 days plus compute. With overlap, the plan is 2–3 weeks.
- Main risks:
  - wrong constants in the aliasing, strip-sup or Z2 code that fail silently (mitigated by the closed-form tests and negative controls);
  - the written Hill multiplicity, infinite-Gershgorin and homotopy arguments;
  - the crossing logic in A's centre, because transversality is weak (V' is about 1e-2 mV/ms);
  - A's derivative-width budget at N=64;
  - a new trust base (Arb) and a third model translation. The README must name both and keep the unproved claims labelled.
