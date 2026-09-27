# Notes: making the proof machinery harder to fool (2026-09-27, for later this week)

The source is a suggestion list from Grok, relayed by the owner. These are Claude's assessment and a plan, not
decisions. Nothing here is implemented yet.

## Verdict in one paragraph

The central point is right: our intervals are already far narrower than any claim needs (K widths of 1e-45 and
1e-61), and a narrower box cannot catch a mistake that the program makes the same way every time. What catches such
a mistake is a second, independent witness: a second integrator, or a small checker that re-verifies the claimed
inclusions. The HH pulse reading already found exactly this class of error: the 6.3 C temperature was entered as a
binary float, so the proof certified a system at 6.29999999999999982 C. More digits could never have caught that. An
independent transcription (test_field.py) plus a checker that reads the decimal input did. Two of Grok's items need
correcting before we act on them. The meromorphic item is harder than stated. And "one kernel" conflicts with "two
witnesses" unless it is read as one audited primary kernel plus an independent checker.

## Item by item

### 1. A second integrator for the long flights: agree, high value, highest cost

- **Current state:**
  - The double pendulum trusts CAPD for the homoclinic and horseshoe flights. `code/crosscheck/` (dparb.py,
    kraw3.py, mvint.py) re-checks the fixed point and the local pieces independently in Arb, but not the long
    flight.
  - HH pulse trusts `lohner6.py`. Review-1 noted that the "independent reference" in `test_lohner6.py` shares
    the jet code with the integrator, so it is not independent.
  - nf-pulse trusts its own Taylor/Lohner code.
- **Do:** write the second integrator from the equations, not from the first program, with a different enclosure
  method (a plain interval Taylor method with QR or parallelepiped wrapping; or Taylor models) and a different
  arithmetic library (mpmath.iv or Arb through another path). It must land inside the same boxes at the section.
- **Start with the shortest flight:** the HH pulse interval stage at 18.5 C (about 10 min in the current code). Then
  nf-pulse. The pendulum last: a CAPD-independent C++ or Arb integrator is the most work.
- **Cost:** 1 to 2 sessions per system for the integrator, plus runs that may be 5-20 times slower than the tuned
  code. Acceptable for a one-off confirmation.

### 2a. The HH fold: agree, but split it in two

- hh-dynamics proves bistability at J = 8 only. The fold of periodic orbits, where the stable spike train is born, is
  numerical.
- **Step 1 (moderate, most of the value):** bistable for every J in an interval. Cover [J1, J2] by parameter boxes,
  and in each one prove a stable equilibrium and a stable periodic orbit, with the same machinery as at J = 8.
  "Bistable on [J1, J2]" is a much stronger statement than one sample point.
- **Step 2 (harder):** enclose the fold itself. Do a validated Newton on the extended system (periodic orbit, period,
  J, and a Floquet multiplier equal to 1 with nondegeneracy), then prove it is a nondegenerate saddle-node of cycles.
  That gives "bistable exactly between the fold and the Hopf point", which is a real theorem.

### 2b. nf-pulse nonlinear stability: agree, and it is the same gap as the HH pulse

- Spectral stability is proved; convergence of nearby solutions to a shifted pulse is not.
- **Correction:** this is a statement about solutions of the model, not about "a real patch of cortex". Keep that
  distinction in any text.
- **To read before planning:**
  - Zhang (2007), cited in nf-pulse.tex as zhang2007siads: existence, uniqueness and exponential stability of
    traveling waves for neuronal-network integral equations. Check whether its hypotheses cover our kernel, our
    smooth firing rate and gamma = 0.
  - The 2024 principle of linearized stability for Wilson-Cowan fields that the stability REPORT names as the
    nearest result.
- Check every hypothesis. Assume none.
- **Shared piece with the HH pulse:** Evans I, which we cannot get, is the linear-to-nonlinear step for systems whose
  gating variables do not diffuse. Arioli and Koch prove their own version (Lemma 3.1) for FitzHugh-Nagumo. A
  self-contained proof of that lemma, for a system with one diffusing variable and n non-diffusing ones, would serve
  both papers. It is one lemma, written once.

### 2c. Meromorphic non-integrability of the pendulum: disagree with the recipe; search first

- The paper proves no real-analytic first integral, from the transversal homoclinic orbit. Meromorphic (complex)
  non-integrability is a different question.
- The standard tools (Ziglin; Morales-Ruiz and Ramis) use the monodromy or differential Galois group of the
  variational equations along a particular solution, continued into complex time. They need an explicitly known
  particular solution, or a validated computation of monodromy along loops in complex time.
- The real monodromy of our numerically enclosed hyperbolic orbit is one element of that group. By itself it does not
  decide the question, so "run the monodromy test on that orbit" is not enough.
- **First:** a prior-article search. There is published work on Morales-Ramis non-integrability of pendulum-type
  systems (Przybylska, Szumiński, Maciejewski and others), and the equal double pendulum may already be settled. We
  have not searched this yet; do not assume either way.
- **Lowest priority.**

### 3. Certificates plus a short checker: agree strongly; do this first

- The slow program writes a certificate file: the boxes, the step data and the inequalities it claims. A separate
  short checker, written independently and ideally in another library, verifies only those.
- **Honest caveat for flows:** a checker of an ODE enclosure still has to redo each validated Taylor step from the
  stored box, step size and remainder bound. It saves the search (step control, subdivision, Newton iterations), not
  the integration. Expect minutes rather than seconds for the long flights.
- The algebraic parts check in seconds: block and cone conditions on cells, interval Newton at a given box, Hurwitz,
  and the covering-relation inequalities.
- **Build on:** the HH pulse certificates already carry SHA-256 hashes of config, block and programs, and a summary
  that refuses stale or self-contradictory files (review-1 M4). Extend that format with the inclusion claims
  themselves.
- **Order:** HH pulse (Python, freshest), then nf-pulse, then the double pendulum (CAPD output to a neutral format).

### 4. One kernel and a fixed test set: agree with the test set, not with "one kernel"

- Replacing CAPD with our own kernel would lose an independent, widely used witness.
- **The better reading:** each kernel (CAPD, lohner6, the nf-pulse integrator, and the new second integrator) must
  pass one shared regression suite, run in CI whenever any kernel changes.
- **The suite, in this order of cost:**
  - linear systems with an exact flow (the matrix exponential);
  - an exactly solvable nonlinear ODE (the logistic equation, the pendulum at small amplitude via elliptic functions);
  - a known Hopf normal form with its exact cycle;
  - a closed-form front or pulse (the Nagumo front, already used in rdx-science);
  - the mutations already written (hh-dynamics/code/mutation_study.py). Each mutation must make the kernel fail,
    and a mutation that still prints PROVED is a broken kernel.
- The Lorenz attractor (Tucker) is too heavy for CI; keep it as an occasional long job, if at all.
- **CI time:** keep the suite under 5 minutes, so that it runs on every kernel change.

## Suggested order for the week

1. **Resume the HH pulse 1.0.0 as planned (RESUME.md).** Its certificate format gets the inclusion claims (item 3)
   while the rerun runs.
2. **Shared regression suite and mutation gate in CI (item 4):** small, and it protects everything after.
3. **Independent checker for the HH pulse certificates (item 3):** start with the algebraic parts, then the flight.
4. **The linear-to-nonlinear stability lemma (item 2b):** read Zhang (2007) first. It serves the HH pulse stability
   work and nf-pulse.
5. **HH bistability on a current interval (item 2a, step 1).**
6. **A second integrator for the HH pulse flight (item 1).**
7. **Later:** the fold enclosure (2a step 2), the pendulum second integrator, and the meromorphic question after a
   prior-article search.

# Part 2: the shape of the claim, the input data, and failures (Grok's second and third lists, 2026-09-27)

## Corrections to the lists before anything else

- **nf-pulse:** it is not "one point at recovery 0.1". Theorem `thm:range` already covers every eps in a union of
  intervals, including [0.08, 0.13693] and [0.1499, 0.1501]. What is missing is the edge: the eps where the fast and
  slow pulses meet and disappear.
- **The pendulum:** "three energies" is right for the horseshoe. `thm:interval` covers only E in [-1e-10, 1e-10]
  around E = 0, so an energy range is a real gap.
- **HH pulse:** existence along the axon is done at 18.5 C and 6.3 C (release 1.0.0 pending). Stability is what is
  unfinished.
- **Nonlinear stability needs a spectral gap, not the whole spectrum.** The requirement is: nothing in
  Re lambda >= -delta except a simple 0, and the essential spectrum left of -delta. Eigenvalues further left do not
  matter. The missing piece is the linear-to-nonlinear theorem (Part 1, item 2b), not more spectrum.
- **The leak potential:** "already did this for the leak potential" overstates it. We proved the theorem at two
  different leak values (printed and zero-current), not on an interval of rounding.
- **"Pin the pendulum to its energy":** the return map already lives on the energy level (the lift takes
  (theta2, p2) at fixed E to the full state). Drift inside a box during a flight only adds overestimation. It is
  worth doing only when extending the energy range.

## The items, ranked by value for cost (Claude's view)

1. **Numbers in the PDF come from the certificates (agree, cheap, first).**
   - Review-1's M2 and M3 were exactly typed numbers that did not match the certificates.
   - hh-dynamics already generates its number block (`code/hh_make_numbers.py`, BEGIN/END markers in the tex), and
     rank-window has `make_numbers.py`.
   - Do the same for hh-pulse (tables.py is the start), nf-pulse and the double pendulum. Have paper-check fail
     when a typed digit in the prose disagrees with the certificate.
2. **A hypothesis ledger that the checker cannot vouch for (agree, cheap).**
   - Each theorem gets a `hypotheses.json`. Every hypothesis is one named item: "boxed" (certificate id), "cited"
     (source, page, read), or "unread".
   - paper-check refuses priority sentences ("first", "no earlier proof", "has not been proved") while any item is
     unread.
   - This makes the QUALITY items machine-checked.
3. **Derivatives from one formula (agree, cheap to audit).**
   - List, per proof, every place a Jacobian, second derivative or Taylor jet is written by hand.
   - Replace each with automatic differentiation of the single field expression, or add a test against it,
     including the exponential rate functions.
   - hh-pulse's jets (hhjet6) are generated; the hh-dynamics and nf-pulse helpers need the audit.
4. **Uniqueness in a stated window, and publishing the misses (agree, moderate).**
   - For the HH pulse and nf-pulse, the unstable manifold is one-dimensional. So a pulse is fixed by its speed and
     branch, and uniqueness reduces to showing that the splitting function has one zero in a speed window.
   - Method: sign-definite cells, plus a derivative enclosure bounded away from 0.
   - The statement becomes "exactly one pulse with speed in [a, b]". The windows must be stated: HH has a slow pulse
     too, and the pendulum has infinitely many homoclinics, so there the right statement is isolation of a named
     orbit, not uniqueness.
   - An excluded window is a theorem; the perturbed-model controls stay as tests.
5. **Name the guilty box (agree, cheap).** Every failed verdict reports the segment, coordinate, cell and inequality
   that failed, with its margin. M4 made verdicts explicit, so extend them.
6. **Two compilers and pinned libraries (agree, cheap once item 3 of Part 1 exists).**
   - CAPD built with gcc and with clang.
   - python-flint pinned. The certificate checker also runs with a second arithmetic (mpmath.iv or Arb from C).
   - A CI matrix job.
7. **The printed constants as rounded numbers (agree, high value, medium-high cost).**
   - The claim: for every parameter within half a unit of the last printed digit (120, 36, 0.3, 115, 12, 10.613,
     1, and the constants in the rate functions), a pulse exists with speed in [a, b].
   - The speed interval will be much wider than 1e-45: a relative change of order 1e-3 is plausible, not measured.
   - This is the same parameter-strip machinery as the temperature strip (tstrip.py), in more dimensions. Build it
     after tstrip works.
   - Do hh-dynamics's bistability the same way.
8. **The edge of each claim (agree, staged).**
   - HH bistability on a current interval first (Part 1, 2a step 1).
   - Then the enclosed degenerate points by validated Newton on extended systems: the fold of cycles (HH), the
     fold where the nf-pulse fast and slow pulses meet, and where the pendulum's saddle or its transversality is
     lost.
   - Covering up to epsilon of an edge is interval work. The edge itself is a separate, harder theorem.
9. **Plates may name a theorem only inside its box (agree, cheap).**
   - A contract and lint rule: a status line may cite a proof only when the plate's parameters are in the
     certified set, and must otherwise say "not covered".
   - #207 (dptangle) already labels uncovered energies, but its credit is stale: the pendulum is now published,
     doi:10.5281/zenodo.22997540.
10. **Multiple shooting, time changes near the saddle, energy pinning (agree as techniques; use when needed).**
    - The pendulum already chains h-sets, and the HH pulse already handles the crawl near rest with an isolating
      block and a cone condition, not by integration.
    - Use multiple shooting for the temperature and rounding strips, where one long flight over a parameter box
      will fatten.
11. **Sensitivities (agree, moderate).** Publish derivative enclosures with respect to the parameters: dK/dT from
    the strip, and d(period)/dJ from the bistability interval. They come almost free once strips exist.
12. **Algebra before intervals (agree where it applies).** Use exact rationals and root counting for the polynomial
    facts: Routh-Hurwitz coefficients, the vortex identities, the nf-pulse polynomial embedding. Little applies to
    HH, whose rates are exponential.
13. **The profile as a shape (a function-space Newton-Kantorovich proof with tail bounds) (agree long-term).** It is
    the best second witness for the pulses (Part 1, item 1), and it gives existence and the linearization from one
    object. Weeks of work: after everything above.

## Combined order with Part 1

1. Finish HH pulse 1.0.0.
2. Numbers from certificates; the hypothesis ledger; the derivative audit.
3. The shared kernel suite and mutation gate; guilty-box logs.
4. The certificate checker, plus a second compiler and arithmetic.
5. Uniqueness windows for the HH pulse and nf-pulse.
6. The linear-to-nonlinear lemma (read Zhang 2007).
7. HH stability (in progress on hh-stability).
8. tstrip, then rounded constants, then the bistability interval.
9. Edges (fold enclosures); a second integrator; the profile-as-shape method; meromorphic search.

# Part 3: reductions, classical numbers, basins, reuse (Grok's fourth and fifth lists, 2026-09-27)

## Corrections first

- **"The spike is born at the Hopf."** At the 1952 parameters, the Hopf point hh-dynamics encloses (J_H1 in
  [9.7796379953931263, 9.7796379953931264]) is subcritical. Its small cycles are unstable, and that branch turns
  at a fold of cycles (numerically near J = 6.26 in hh-dynamics) into the stable large spike branch. So the
  continuation to prove runs from the Hopf point along the unstable branch, through the fold, to the stable spike
  at J = 8. Through the fold it must be parametrized by arclength, not by J. If the box breaks, the story changes,
  as Grok says.
- **"Area preservation turns three energies into an interval."** Area preservation is not what is missing. The
  modern Smale-Birkhoff theorem (for example Katok and Hasselblatt, Thm 6.5.5) needs no genericity or
  non-resonance, and it gives a horseshoe for an iterate from any transversal homoclinic point. So `thm:interval`
  already gives a horseshoe for every E in its interval, once that theorem is read in full: the owner has only a
  preview of the book.
  - What the modern theorem does not give is our explicit entropy bounds; those stay at the three energies.
  - The interval itself is only 2e-10 wide, and widening it is computation.
- **"The pulse integrator is only C^0."** Check this before relying on it. The interval run carries d(zeta_1)/dK,
  and the stability plan integrates the eigenvalue system alongside the pulse, which needs only a C^0 enclosure of
  the pulse. Taylor models (Berz and Makino) or a C^1 Lohner method (as in CAPD) are worth it only where wrapping
  limits a proof.
- **"Most measured kernels do not reduce to ODEs."** Kernels that are sums of exponentials, which have rational
  Fourier transforms, including differences of exponentials ("Mexican hats"), reduce to larger ODE systems. That is
  a cheap first generalization. Gaussian and other general kernels need the function-space ("profile as a shape")
  method.

## Items ranked by value for cost

1. **The reduction lemmas, checked line by line (agree strongly, cheap).**
   - HH: the code's field equals eq. (31) and Table 3 of the 1952 paper, under the stated change of signs and with
     the printed E_l. test_field.py and review-1's independent transcription (agreement to 4e-45) are the
     computational half. The written lemma with page references is the other half.
   - nf-pulse: Proposition `prop:reduction` (the ODE orbit is a pulse of the integral equation) against the model's
     source. One earlier reimplementation review marked that step "unconfirmed" (review/lead/reimpl/block/BLOCK.md);
     close it explicitly.
   - Put both in the hypothesis ledger (Part 2, item 2).
2. **Classical numbers by inclusion (agree, cheap).**
   - For each published value we lean on (Labouriau's Hopf points, Hassard's coefficients, Hodgkin and Huxley's
     computed speed), the certificate states "contains" or "excludes". Test against the value's own rounding
     interval: a printed 9.78 means [9.775, 9.785].
   - Replace every "consistent with" with the verdict.
3. **Certificates checked on every change; long flights only on release; the certificate hash printed in the PDF
   (agree, part of Part 1, item 3).**
4. **"Who falls into the spike": an inner basin and a threshold interval (agree, new, medium cost, high value).**
   - Clamp a current, then step the voltage from rest. Prove that every initial voltage below a in the step decays
     to rest, and every one above b fires into the proved stable spike. For the spike side, integrate the initial
     boxes into a contracting neighborhood of the stable cycle; for the rest side, into the rest state's block.
   - That encloses the voltage threshold in [a, b]. This is the part a physiologist can compare with a current
     clamp. Refine it later to the saddle-cycle stable manifold, which is the true threshold.
5. **One small public proof (agree).**
   - Candidate: the Hopf points of hh-dynamics as a short standalone note, with its certificate and a checker
     that runs in minutes.
   - The pendulum at one energy is second.
   - This is what a stranger will actually rerun.
6. **The pendulum horseshoe on the energy interval via Katok-Hasselblatt 6.5.5 (cheap once the theorem is read in
   full).** Needs the owner's copy of the pages.
7. **Shared lemmas written once (agree, medium).**
   - One methods note, cited by all the papers: Krawczyk and interval Newton, cone conditions and inertia, the
     Poincare map, return-map-to-flow entropy (the pendulum's Lemma 7), and the covering-relation lemmas.
8. **Hopf-to-spike continuation through the fold (agree, high cost).** Pseudo-arclength validated continuation of
   periodic orbits. It merges with the "edges" item (Part 2, item 8): the fold enclosure is on this same path.
9. **Kernel generality.** Sums of exponentials first (cheap); general kernels with the profile-as-shape method
   (long).
10. **Taylor models / C^1 tubes:** only where wrapping limits a proof.
11. **The gap between the grid and the continuum (disagree with a full bound for now).**
    - A rigorous a posteriori bound for a float32 GPU grid against the proved wave is a research project in its own
      right.
    - Honest and cheap instead: a plate that uses certified parameters prints its measured distance to the certified
      profile through `compare()` with basis "deterministic". It never claims the pixels are proved.

## Last point

Grok's closing sentence is right: more digits, more sample points and more models make the pile larger without
making any claim stronger. What makes the claims stronger:
- independent witnesses;
- checkable certificates;
- stated windows and edges;
- verified reductions;
- statements a physiologist or a stranger can use.
