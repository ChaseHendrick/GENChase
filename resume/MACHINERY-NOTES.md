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
