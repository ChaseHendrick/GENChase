# Referee report 1: "Chaos and Analytic Non-Integrability of the Classical Double Pendulum: A Computer-Assisted Proof"

Material reviewed: `paper/double-pendulum.tex` (and the PDF built from it), `code/`, `configs/`, `data/`. The referee did
not read `notes/` (other than writing this file), `research/` or `README.md`.

Checks run (all cheap):

- `_bin/cones configs/E0.cfg 2 100`: 7.6 s, and its output matches `data/cones_E0.txt` exactly.
- `_bin/horseshoe_design` with the two command lines in `code/run_all.sh`: its output matches
  `configs/horseshoe_Ehalf.cfg` and `configs/horseshoe_Eminushalf.cfg` byte for byte.
- r_22, r_26, log r_m and log r_m / tau_E, computed in 30-digit arithmetic (mpmath).
- glibc `strtod` under `FE_UPWARD`, and the rounding mode in force when `prove.cpp` and `cones.cpp` parse their
  configurations, tested with a small program built against the same CAPD build (filib back end).
- The CAPD source at the pinned commit 03dc5628, read where the paper relies on it: `PoincareMap_templateMembers.h`
  and `PoincareMap_templateOperator.h`, for the departure phase and for the meaning of the returned return time.

`prove` and `horseshoe_check` were not rerun.

## Summary verdict

**Minor revision.**

The written mathematics is correct as far as I could check it, and the programs compute what the paper says, with one
exception (Must-fix 1). I checked the following in detail and found no gap beyond the items listed below:

- Lemma 1 (levels), Lemma 2 (reversibility, including the lifted identity G f G = f^{-1}), Lemma 3 (Krawczyk) and
  Lemma 4.
- Lemma 5: the secant estimate (eq. secant); the constants kappa = delta_M/(m11 - alpha m12) and
  theta = delta_M/(m11 - alpha m12)^2, re-derived; the C^1 convergence in (c); and the invariant graph in (d).
- Lemma 6: det[v, DG v] = 2 v1 v2.
- Lemma 7: steps (a) to (e), including both halves of the induction in (c).
- Lemma 8: steps 1 to 3, including the end-point argument mu(a - e) = a + e.
- Proposition 1.
- Kozlov's argument (Corollary 2), and the step from an open interval of levels to dF ^ dH = 0 (Corollary 3).

On the computational side:

- **Mean-value forms.** Every C^1 set contains its centre (`rig.h:56-57`).
- **Lift enclosure.** It uses a mean-value remainder.
- **(C4)-(C5) chain.** It uses one-return factors, exactly k of them (`prove.cpp:145-153`).
- **Line-field propagation.** Taking the hull is valid: for each real matrix, the slope map is monotone on every
  sub-interval where the denominator does not vanish.
- **Covering relations.** Conditions (i)-(iii) are checked as stated.
- **Disjointness** is checked.
- **Return-time bound.** It is taken over every piece of every set, and every set is the source of a verified
  relation, so it bounds max tau on Lambda_E, as Lemma 7 needs.
- **CAPD return time.** The returned `rt` is a genuine one-return time, because `derivC1` always builds a fresh set,
  whose time starts at 0.

Every number in Theorems 1-3, Table 1, Sect. 4.4, Sect. 6.3 and Sect. 7 agrees with `data/*.txt`, rounded outward in
the safe direction.

The entropy argument is right:

- The vector v with v_N = 1 and v_{M_i} = r^{-(m-i)} satisfies Av = rv exactly.
- r_22 = 1.1069502450168822..., log r_22 = 0.1016087069322...; r_26 = 1.0948327079053120..., log r_26 = 0.0906015734280....
- log r_m / tau_E = 0.01381419219, 0.01299752745 and 0.02131889097. These are above the stated 0.0138141, 0.0129975
  and 0.0213188.
- The printed tau_E are upper bounds rounded up.
- `lowerStr`/`upperStr` do round in the safe direction.

No error found invalidates a theorem. The paper has these weaknesses:

- One hypothesis that the paper says the program verifies is not checked by any program (Must-fix 1). It does hold,
  by six orders of magnitude at the three energies and four on the interval, from the printed enclosures.
- The argument in "What the proof trusts" does not prove what it concludes.
- The negative controls for the horseshoe cannot fail for the reasons they are meant to test.
- Remark 2 misrepresents the Smale-Birkhoff theorem.
- The novelty claim rests on a partial reading of Bolotin-Negrini, and possibly of Ivanov IV.

## Must-fix

1. **Hypothesis (C3) is only partly verified by the program, although the paper says it is verified**
   (Sect. 4.2, (C3): "|x_p| < a(mu - 1)/(mu + 1)"; Sect. 4, first paragraph; Sect. 4.4, "(C3) is checked with the
   enclosure of zeta_p from stage 1").
   - What `prove.cpp` checks:
     - `prove.cpp:68` checks zeta_p in int N_0.
     - `prove.cpp:69-70` checks |y_p| + alpha(a + |x_p|) < b, an inequality the paper never states.
     - `prove.cpp:108` checks |det Df| < mu on B.
   - What is missing: no program compares |x_p| with a(mu - 1)/(mu + 1) (and neither does `cones.cpp`).
   - Where it is used: the proof of Lemma 5(d) ("which exceeds a + |x_p| by the last condition in (C3)"), without
     which Gamma is not shown to map G_p into itself, and Lemma 8, step 3 (|x_p| < e).
   - It holds with a huge margin, from the enclosures printed in `data/*.txt`:

     | E | &#124;x_p&#124; | a(mu - 1)/(mu + 1) |
     |---|---|---|
     | -1/2 | <= 1.99e-12 | 8.73e-6 |
     | 0 | <= 1.69e-12 | 1.39e-5 |
     | 1/2 | <= 1.86e-12 | 6.50e-6 |
     | [-1e-10, 1e-10] | <= 5.35e-10 | 1.39e-5 |

   So the theorems are not in danger. But as submitted, the computer-assisted proof omits a hypothesis that the text
   says is checked.
   - Fix: add a `REQUIRE` after `muMin` is known, with the threshold evaluated in interval arithmetic from the
     enclosure `pl[0]`. Rerun the four configurations, and either state the |y_p| + alpha(a + |x_p|) < b check in the
     paper or drop it.

## Should-fix

1. **The departure argument in "What the proof trusts" does not prove its conclusion** (Sect. 8, last paragraph;
   CAPD `PoincareMap_templateMembers.h`, the first `while` loop of `integrateUntilSectionCrossing`).
   - What CAPD guarantees, from the premises the paper states:
     - `checkTransversability` makes theta1-dot single-signed on any step enclosure that meets the section. So a
       step contains at most one crossing, in one direction.
     - The departure loop stops only when the whole set has section sign < 0.
   - The gap: these premises do not rule out that part of a set completes a downward and then an upward crossing
     while another part has not yet crossed downward. The step in which the first part crosses upward only needs
     theta1-dot > 0 on its enclosure. Excluding this needs the set to be small compared with the time between a
     downward crossing and the next upward one. That is true of the sets used here, but it is a quantitative fact
     that is neither stated nor checked.
   - The "Hence ... no upward crossing can be skipped" therefore does not follow.
   - The Arb cross-check validates the first return only at the E = 0 fixed point. It does not cover the 9- and
     11-return chains of stage 3 or the horseshoe sets.
   - Fix: either close the argument with a programmatic guard, or state it as an assumption. Possible guards:
     - Use crossing direction `Both`, take alternate crossings, and check that their directions alternate.
     - Record the number of departure steps and bound the time spread of the set.
   - Also, CAPD checks transversality on the whole step enclosure when the section function on it contains 0, not
     "on the part of the step enclosure that meets it"; describe this accurately.
2. **The horseshoe negative controls fail trivially** (Sect. 7; `configs/control_horseshoe_wrong.cfg:3-5`).
   - All three relations (M0 => M2, M2 => M1 and M5 => M5) use shift 0. Each image lands about 2*pi, or at least
     3e-4, away from its target, while the sets are about 1e-7 in size.
   - So they would fail even if condition (ii) were never checked, if the orientation logic in (iii) were inverted,
     or if the disjointness test were broken. They test almost nothing in `horseshoe_check.cpp`.
   - Add near-miss controls, for example:
     - a true relation with the target's contracting column shrunk below the image thickness (must fail (ii));
     - the target's expanding column enlarged beyond the image's stretch (must fail (iii));
     - N => N with the columns of N exchanged;
     - two overlapping h-sets (must fail disjointness).
   - Similarly for `prove` and `cones`:
     - The segment and alpha mutations only show that an inequality is evaluated.
     - `control_cones_swap` fails through overestimation (0 in [M]_11 = [-0.609, 0.042]) rather than through the
       real obstruction, kappa of about 1/|lambda_s| > 1. A thinner box, or one that excludes 0, would show the
       genuine failure.
   - The uncoupled control is meaningful for (C5) and should stay.
3. **Remark 2 misstates what the literature provides** (Sect. 5.2, Remark "why the paper does not use Smale's
   theorem").
   - The remark is accurate about Smale's 1965 Theorem B: the statement is generic, and its proof assumes Sternberg
     linearisation.
   - But the Smale-Birkhoff homoclinic theorem in its modern form applies to every C^1 diffeomorphism with a
     transversal homoclinic point, with no non-resonance condition. Examples: Katok-Hasselblatt, Thm. 6.5.5;
     Palis-Takens, Ch. 2; Moser's *Stable and Random Motions* for planar maps.
   - It is local near the homoclinic orbit, so the return map being defined only on an open set is no obstacle.
   - Consequently Theorems 1 and 2 already give a (hyperbolic) horseshoe for some iterate, and positive topological
     entropy, at every E in [-1e-10, 1e-10]. So the sentence in Corollary 1, "On the interval ... we claim only
     ...", undersells the results, and the remark leaves a wrong impression.
   - Fix: rewrite the remark. What the covering relations add is explicit, quantitative entropy bounds, and that is
     the real reason to use them.
4. **The novelty claims rest on an incomplete reading of the prior literature** (Sect. 1; Sect. 8, "Relation to
   Bolotin and Negrini").
   - Bolotin-Negrini: the paper says it has "not seen the printed paper" and relies on search snippets. Its
     priority claim for Corollary 3, and for chaos at equal parameters, is explicitly conditional on that reading. It
     even notes a discrepancy ("9m2" against 9 pi^2) that only the printed page can resolve. Obtain and read the
     paper before the manuscript is submitted anywhere.
   - Ivanov II-IV: Sect. 1 describes all three as asymptotic results for a small mass ratio. The title of Ivanov IV
     ("Quantitative bounds on values of the system parameters when the homoclinic transversal intersections exist")
     suggests explicit, non-asymptotic parameter regions. State the region proved there and show that
     m1 = m2, l1 = l2 lies outside it.
   - Computer-assisted proofs: a competing result would most likely be in this literature (validated numerics for
     Hamiltonian systems and for the double pendulum in particular). The manuscript should say that it was searched,
     not only the perturbative and algebraic literature.
5. **"Horseshoe" says more than is proved** (abstract, Corollary 1, Theorem 3, Sect. 8).
   - What is proved is a compact invariant set that is semiconjugate to a subshift of finite type. There is no
     hyperbolicity, and no conjugacy.
   - Write "topological horseshoe", or define the word once where it is first used, so that readers do not infer a
     hyperbolic set conjugate to a full shift.
6. **The E = -1/2 homoclinic point is not the continuation of those at E = 0 and 1/2**, yet the text implies it is.
   - The crossing points differ: p2(q) is about -1.4657 at E = -1/2, against +0.8221 and +0.8245 at E = 0 and 1/2
     (Table 1).
   - The edge images come in the opposite order at E = -1/2.
   - Sect. 8 says "the orbit family and the crossing were followed numerically between -1/2 and 1/2".
   - Say which symmetric homoclinic point is used at each energy, and whether the one at E = -1/2 belongs to the same
     branch.
7. **`run_all.sh` overwrites the committed configurations before checking them** (`code/run_all.sh:22-23`; Sect. 6.3,
   "The design commands are in code/run_all.sh and reproduce the configurations exactly").
   - `run_all.sh` regenerates `horseshoe_Ehalf.cfg` and `horseshoe_Eminushalf.cfg` with the floating-point design
     program, then verifies whatever it produced. On another platform or libm, a rerun can verify different sets from
     the published ones.
   - On this machine the two commands do reproduce the committed files byte for byte.
   - The E = 0 design command is not in `run_all.sh` at all (line 21 points to the README), contrary to the text.
   - Fix: check the committed files, write any regenerated design elsewhere, and diff the two.

## Minor

1. **Lemma 1, proof.** It should read H >= -3 + (lambda/2)|p|^2 (kinetic energy = (1/2) p^T M^{-1} p), not
   -3 + lambda|p|^2.
2. **Stage 1 compares K with the wrong box** (`prove.cpp:41, 49`). K is compared with B = p0 + rB rounded outward,
   which is slightly larger than the box p0 + [-rho, rho]^2 of Lemma 3. Compare with inward-rounded bounds instead.
   This has no effect here: K lies within 2e-12, or 6e-10 on the interval, of p0, and rho = 1e-9.
3. **Remark 1 (Abramov).** A measure of maximal entropy for P|Lambda is not known to exist, because Lambda is not
   shown to be expansive. Use a lift of the Parry measure through the factor map iota, which has entropy at least
   log r, or say "if one exists".
4. **Corollary 1 is misplaced.** It is stated before Theorem 3, which it restates and from which it is "proved". The
   scope sentence "On the interval ... we claim only ..." is not a mathematical statement and belongs in the text.
5. **Section 6 title.** It is "The explicit horseshoe at E = 0", but the section treats all three energies.
6. **Conditions out of order.** They appear as (C1), (C2), (C3), (C6), (C4), (C5); renumber them in order.
7. **Heavily overloaded notation.** Examples:
   - Gamma: the graph transform, and an arc in Lemma 6 and Sect. 5.3.
   - c: cos(theta1 - theta2), the constant in Lemma 5(b), g(p) in Sect. 5.3, and an h-set centre.
   - K: the Krawczyk set, and the flow-invariant set of Lemma 7.
   - M: the mass matrix, [M], M_i, M_E and M_T.
   - E: the energy, and a separated set in Sect. 5.1.
   - m: a mass, the integer in (C4), the number of sets in Theorem 3, and m11.
   - mu: the cone rate, and Bolotin-Negrini's mu.
   - The script G: a function class, and a directed graph.
   - T: the shift map, and time.
8. **Printed bounds use round-to-nearest.** `prove.cpp:105` prints mu with `%.6g` (round to nearest). The printed
   "mu" is therefore not guaranteed to be a lower bound, and the Table 1 caption has to hedge. The theorems use
   truncated values, so they are safe. Print directed-rounded bounds, as `horseshoe_check.cpp` does. The same line
   prints "(< alpha = ...)" even when the inequality is false (`data/control_mut_alpha.txt`: "0.000291693 (< alpha =
   0.0001)"). The "largest |w|/|u|" of Table 1 is a floating-point figure ("reported only", `prove.cpp:94`); say so in
   the caption.
9. **The field check does not test CAPD's parser.** `check_field.py` checks SymPy's parse of the strings in `dp.h`,
   not CAPD's parse of them. A difference in operator precedence between the two parsers would go unnoticed. The Arb
   cross-check at the fixed point makes such a difference very unlikely, but evaluating the actual `IMap` at random
   points against SymPy would close the question.
10. **Configuration constants are parsed after interval operations.** `prove.cpp:35-37, 64, 113` call `atof` after
    CAPD interval operations, and `horseshoe_check.cpp:44` parses later h-sets after `inv2` of earlier ones. glibc
    `strtod` honours the x87 rounding mode. For example, 0.95568530469114732 parses to ...743 under `FE_UPWARD`, and
    1.3e-5, 3e-8 and several v_u/v_s entries also change.
    - Shipped build: with the filib/SSE back end the x87 mode stays at round-to-nearest (tested), so `prove.cpp` and
      `cones.cpp` parse identical constants.
    - Other back ends: with one that switches the fenv rounding mode, `prove.cpp` (which parses after `Ctx` and stage
      1) and `cones.cpp` (which parses first) would use N_0, A and alpha differing by one ulp. (C1)-(C3) and (C6)
      would then formally refer to different objects.
    - Fix: parse every constant at start-up under `FE_TONEAREST`.
11. **Statements without output in `data/`.**
    - The failure of stage 1 on [-1e-9, 1e-9] (Sect. 4.5).
    - The "5*10^4" width diagnostic (Sect. 4.4).
    - The island seen at E = -1/2 (Sect. 7).
    - The numerical continuation of the orbit and the crossing between -1/2 and 1/2 (Sect. 8).
    - "far below the entropy one would estimate numerically" (Sect. 8).

    Add the outputs, or label these as unrecorded observations. `crosscheck/kraw3.py:18` takes its Newton point from
    `krawczyk.out`, which is not included (harmless, because Krawczyk validates the point, but note it).
12. **Misquoted cone ratio** (Sect. 7). "narrowing the cone to alpha = 1e-4, below the measured ratio 3.6e-4" quotes
    the ratio measured at alpha = 1e-3. At alpha = 1e-4 the measured ratio is 2.92e-4
    (`data/control_mut_alpha.txt`).
13. **Stale lemma number.** `cones.cpp:2` calls the local lambda-lemma "Lemma 7"; in the built PDF it is Lemma 8
    (Lemma 7 is the flow-entropy lemma).
14. **Inconsistent running times.** The data-availability paragraph gives 54 minutes, while `run_all.sh:5-6` says
    "About 80 minutes" (54 before the E = +-1/2 horseshoes).
15. **Lemma 5 relies on the computation.** Its proof uses "The stage-2 computation encloses the first return of every
    point of N_0". State this as a hypothesis (f-hat is C^1 on a neighbourhood of N_0), so that the "proved" lemma
    is self-contained and the computation verifies its hypotheses.
16. **Citations.**
    - [sk2025] gives arXiv:2602.21123 (February 2026) for an article dated 2025 in J. Sound Vib.; check it.
    - Dullin is quoted by the page of the author's preprint; cite the published Z. Phys. B text, or say why the
      preprint is used.

## Response (2026-09-27)

Written by the author's side of the project after the review; section numbers refer to the revised manuscript
(23 pages). "Fixed" means changed in the paper, the code or the ledgers, and, where a computation is involved, run.

### Must-fix

1. **Fixed.** The inequality is no longer part of (C3). It is now the last inequality of the derivative-hull condition,
   renumbered (C4) (minor 6), with the secant rate mu_h = m11 - alpha m12 from the hull in place of mu. The hull gives
   |M11 + M12 t| >= mu_h for every secant in the cone, and the proofs of Lemma 5(d) and Lemma 8 (step 3) now use mu_h.
   - `cones.cpp` checks it in interval arithmetic, with the enclosure of zeta_p from a repetition of stage 1 that
     compares K and G(K) with inward-rounded bounds of B (minor 2).
   - Results: |x_p| <= 1.99e-12, 1.69e-12, 1.87e-12 and 5.36e-10, against thresholds >= 8.71e-6, 1.39e-5, 6.49e-6
     and 1.39e-5, at E = -1/2, 0, 1/2 and on the interval (`data/cones_*.txt`; about 10 s each).
   - Negative control: `control_cones_shift` centres N0 at p0 + 0.6 a v_u and fails only this inequality
     (|x_p| ~ 1.5e-5 against 1.394e-5).
   - `prove` was not rerun (coordinator's instruction).
   - The check |y_p| + alpha(a + |x_p|) < b is now stated in Sect. 4.4, as checked but not used.

### Should-fix

1. **Fixed by an argument, no guard needed.**
   - Sect. 8 ("What the proof trusts") now proves that no upward crossing is skipped, from three facts in the code at
     03dc5628:
     - (a) `checkTransversability` requires theta1-dot to be single-signed on every step enclosure on which theta1
       contains 0.
     - (b) The step enclosure contains the box hull of the set at the start of the step (`HighOrderEnclosure`: a
       Taylor polynomial in [0, h] with the hull as constant term, plus a remainder containing 0).
     - (c) The sign tested at step ends is theta1 on that hull (`CoordinateSection::evalAt`).
   - The proof: if a point crossed upward during the departure loop, then at every step end in between the hull's
     theta1-range contains 0 (by (c), and because the point is at or below 0). So each following step enclosure meets
     the section (by (b)), and theta1-dot keeps one sign from step to step (by (a)). That contradicts the change from
     the downward to the upward crossing.
   - Your scenario, where one part completes a return while another has not crossed downward, is excluded: at the
     step ends between them the hull straddles 0, which chains the sign condition.
   - The description of `checkTransversability` in Sect. 4.4 is corrected: it acts on the whole step enclosure when
     the section function on it contains 0.
   - This still rests on our reading of CAPD's code, as the paper says.
2. **Fixed (horseshoe and (C4)); answered (prove).**
   - Three near-miss horseshoe controls on the true relation M1 => M2 at E = 0, each about 20-45 s:
     - `control_hs_thin`: the target's contracting column shrunk tenfold. It fails only (ii): edges separated,
       midline inside, 24 unresolved pieces.
     - `control_hs_wide`: the expanding column enlarged tenfold. It fails only (iii): edges not separated,
       0 unresolved.
     - `control_hs_overlap`: an overlapping third h-set. The relation still covers; only disjointness fails.
   - `control_cones_swap` now uses a square box of half-side b. [M]_11 then excludes 0, and it fails for the real
     reason: mu_h >= 0.2831 (about |lambda_s|) and kappa <= 3.54.
   - `run_all.sh` now checks in each near-miss report that the failure is the intended one (and, where stated, the
     only one).
   - The segment and alpha mutations of `prove` are kept and described in Sect. 7 as coarse (they show that an
     inequality is evaluated). No new prove controls were run, because each costs minutes of `prove`. The uncoupled
     control stays and is described as meaningful for (C6).
3. **Fixed.** Remark 2 is rewritten ("Smale's theorem and its later forms").
   - Smale's 1965 proof assumes Sternberg linearization, which fails for area-preserving saddles.
   - Later forms of the Smale-Birkhoff theorem need no non-resonance condition and are local (Katok-Hasselblatt
     Thm. 6.5.5, Palis-Takens Ch. 2, Moser 1973). They are named as not read here and not used.
   - With Theorems 1 and 2 they would give hyperbolic horseshoes and positive entropy at the three energies and on the
     whole interval.
   - The paper keeps the covering-relation route, which gives explicit bounds.
   - Corollary 1 no longer contains the scope sentence. A paragraph after Corollary 3 says that no horseshoe is proved
     on the interval, what the later theorems would give, and that they are not used. The paper does not claim that
     the classical theorem fails.
4. **Fixed in the text; the reading of Bolotin-Negrini remains for the owner.**
   - Sects. 1 and 8 now say that Bolotin-Negrini is known only from search snippets, and that the printed paper has to
     be read before the novelty stated can be relied on. The pages to obtain are listed in
     `research/double-pendulum/BOLOTIN-NEGRINI.md`. Obtaining them is the owner's action, not done here.
   - Ivanov IV: Sect. 1 states its region. It concerns the reduced system (m2/m1 -> 0), within explicit distances
     between 4e-7 and 5e-3 of the four vertices of its compactified parameter square (Main Theorem, p. 54). The equal
     pendulum is not that system.
   - Sect. 1 now summarizes the search of the computer-assisted-proof literature (arXiv, zbMATH Open, the CAPD
     authors' publication lists and application pages), with Wilczak-Zgliczynski (2009) as an example of the
     forced-damped-pendulum results found. `PRIOR-ART.md` has a dated note.
5. **Fixed.** "Topological horseshoe" is now used, and defined (a compact invariant set semiconjugate to a subshift of
   finite type; hyperbolicity and a conjugacy are not claimed), in the abstract, keywords, introduction, Theorem 3,
   Corollary 1, the title of Sect. 5.2, the title of Sect. 6 ("Explicit topological horseshoes") and Sect. 8.
6. **Fixed.**
   - Sect. 4.4 and Sect. 8 now say which symmetric homoclinic point is used: p2 ~ 0.82 at E = 0 and 1/2, and
     p2 ~ -1.466 at E = -1/2, with the edge images in the opposite order. The latter is a different intersection of
     the same half of W^u(p) with Fix(G), not the continuation of the other two.
   - The numerical continuation of the periodic orbit is labelled as an unrecorded exploration.
7. **Fixed.**
   - `run_all.sh` now checks the committed configurations.
   - `code/designs.sh` regenerates all three designs, including E = 0, into a temporary folder and compares them with
     the committed files. On this machine all three are reproduced byte for byte.
   - Sect. 6.3, the data-availability paragraph and the README say so.

### Minor

1. **Fixed** (H >= -3 + (1/2) lambda |p|^2).
2. **Fixed for the proof, not in `prove.cpp`.** `cones.cpp` repeats stage 1 and compares K and G(K) with inward-rounded
   bounds of B, as Lemma 3 requires, and Sect. 4.4 says so. `prove.cpp` is unchanged, because it was not to be rerun.
3. **Fixed.** Remark 1 now refers to a lift of the Parry measure through the factor map, and says that a measure of
   maximal entropy is not known to exist.
4. **Fixed.**
   - Theorem 3 is stated before the corollaries; the numbering is unchanged.
   - The scope sentence is now text after Corollary 3.
5. **Fixed.** Sect. 6 is titled "Explicit topological horseshoes".
6. **Fixed.**
   - The conditions are numbered in order of appearance: (C1)-(C3), (C4) the derivative hull (formerly (C6)), and
     (C5)-(C6) for the crossing (formerly (C4)-(C5)).
   - `cones.cpp`, `run_all.sh`, the README and the reports use the new numbers. The `prove` reports never printed
     these labels.
7. **Partly fixed.**
   - The graph transform is now \mathcal H, its function class \mathcal L, and the constant of Lemma 5(b) is c_M.
   - The other overloads are kept: each is local to one section and defined there (K in Lemma 7, E as a separated set
     in Sect. 5.1, T as time, m as an integer, mu as Bolotin-Negrini's parameter in Sect. 8).
8. **Fixed in the paper; `prove.cpp` printing not changed.**
   - Table 1 now gives mu as the printed value lowered by one unit in the last digit (2.88344, 3.52384, 2.99874), a
     certified lower bound. Sect. 4.6 does the same (mu >= 3.52383).
   - The caption says that the largest |w|/|u| is a floating-point figure.
   - Directed printing in `prove.cpp`, including the misleading "(< alpha = ...)" label in `control_mut_alpha`, is left
     for its next full rerun, so that the committed reports stay the output of the committed program.
9. **Not fixed.**
   - The Arb cross-check derives Hamilton's equations independently. It reproduces the fixed point, trace and lambda_u
     at E = 0 inside the certified enclosures, and the point values at E = +-1/2; a parse difference would have to
     leave all of these unchanged.
   - A direct comparison of CAPD's `IMap` with SymPy at random points is a cheap follow-up, not done in this round.
10. **Fixed.**
    - `rig.h` parses every decimal constant in round-to-nearest (`atofN` in D() and Q()).
    - `horseshoe_check.cpp` parses its h-set lines in round-to-nearest.
    - `cones.cpp` parses all constants before any interval operation.
    - As you tested, this is a no-op on the shipped build, so the existing reports stand.
    - The research copies of `rig.h` and `horseshoe_check.cpp` are updated too.
11. **Fixed.**
    - The stage-1 failure on [-1e-9, 1e-9] is now recorded (`configs/stage1_interval_1e-9.cfg`,
      `data/stage1_interval_1e-9.txt`, from the stage-1 repetition in `cones.cpp`): the theta2-component of K is
      [-5.79, 5.79]e-9.
    - The 5e4 diagnostic, the island at E = -1/2 and the numerical continuation are labelled as unrecorded.
    - "Far below the entropy one would estimate numerically" is replaced by "presumably far below ..., which we have
      not estimated numerically".
    - `kraw3.py`'s starting point from `krawczyk.out` is left as is: harmless, as you note, since Krawczyk validates
      any starting point.
12. **Fixed.** The ratio quoted is 2.92e-4, the value measured with alpha = 1e-4.
13. **Fixed.** `cones.cpp` refers to Lemma 8.
14. **Fixed.** The running time is about 85 minutes everywhere (paper, `run_all.sh`, README).
15. **Fixed.**
    - Lemma 5 now assumes that f-hat is C^1 on a neighbourhood of N0, with a note that stage 2 verifies it.
    - Lemmas 6 and 8 assume the hypotheses of Lemma 5.
16. **Fixed.**
    - arXiv:2602.21123 was posted on 24 February 2026 with the journal reference J. Sound Vib. 611 (2025) 119099; the
      bibliography now says so.
    - Dullin is quoted from the author's preprint because the published text was not available to us, and the text
      now says so.
