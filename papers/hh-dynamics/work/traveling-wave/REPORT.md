# The propagated action potential of Hodgkin and Huxley: prior art, numerics and a proof plan

Chase Hendrick, 2026-09-26. Work in progress in `papers/hh-dynamics/work/traveling-wave/`. Every statement below is
labelled **rigorous** (proved by a program in ball arithmetic, whose logic is stated), **numerical** (floating point,
not a proof) or **literature** (with the source and whether it was read first hand).

## 0. Summary

- **Question.** Is there a proof, with or without a computer, that the travelling-wave equation of Hodgkin and Huxley
  (J. Physiol. 117 (1952), eq. (31)) has a pulse, a homoclinic orbit to rest, at their own 1952 rate functions and
  constants? **As far as we could reach, no.** Hastings (1976) and Carpenter (1977) proved existence for systems with
  artificial small parameters (n and h slowed by a factor epsilon, and for Carpenter m sped up by 1/delta), under
  abstract hypotheses, for those parameters near zero; Hastings writes on p. 230 that "it is not clear that our
  results apply to the original HODGKIN-HUXLEY system". Every computer-assisted pulse proof we found is for
  FitzHugh-Nagumo. Confidence that the question is open: about 85 per cent; the residual risk is in texts we could not
  open (Section 1.5).
- **Numerics.** At 18.5 C the pulse has K = 10.4383548291 /ms, a speed of **18.7322 m/s** (Hodgkin and Huxley computed
  18.8 m/s by hand from K = 10.47 /ms and measured 21.2 m/s). At 6.3 C: K = 4.5107697268 /ms, **12.3139 m/s**. Rest
  has one unstable and four stable eigenvalues (a real fast one, a complex pair, a real slow one), so a pulse is a
  codimension-one event in the speed, as for FitzHugh-Nagumo. The shooting switch disappears between 32 and 34 C. A
  second, slow pulse was **not found**: the only other switch of the shooting in K in [0.02, 80] is a connection to a
  small oscillation (a wave train), not an orbit back to rest.
- **Rigorous first stage (done).** (A) For every K in [10.4383548, 10.4383549], rest has exactly one eigenvalue with
  positive real part, simple and real, enclosed, and four with negative real part. (B) A block lemma encloses the
  point where the branch of the unstable manifold leaves a small neighbourhood of rest. (C) A validated Lohner
  integrator carries that branch through the upstroke, the spike and the repolarization: **at K1 = 10.4383548 it
  reaches u < -60 mV with u' < 0, at K2 = 10.4383549 it reaches u > +150 mV with u' > 0** (the same at 6.3 C with
  K1 = 4.5107697, K2 = 4.5107698). This is the rigorous version of the first half of Hodgkin and Huxley's 1952
  bracketing ("V goes off towards either +infinity or -infinity"): it proves that the shooting switches between
  18.7321608 and 18.7321609 m/s, not that anything goes to infinity and not that a pulse with that speed exists.
  The closing step is missing.
- **Feasibility of the full proof.** The closing step needs the orbits of a whole K interval tracked until they are
  inside an isolating block at rest, about 17 ms after the upstroke at 18.5 C. The unstable eigenvalue is about
  10.9 /ms, so the K interval must be about 10^-85 wide and the integration run at roughly 350 to 400 bits. The pieces
  exist (Lemma B's block works up to radius 0.01; the integrator works); the cost is compute and care, not a new idea.
  Our honest estimate: 2 to 4 more working days, a 60 to 70 per cent chance of success along this direct route, with
  a covering-relation (multiple shooting) route as the fallback if the direct one wraps too much. A proof would, as far
  as we can tell, be the first for the unmodified Hodgkin-Huxley pulse.
- **Independent check.** An independent subagent re-read the sources, reproduced the speeds to every printed digit
  with its own code, and found the rigorous code sound for what it literally proves; its corrections are applied
  (Section 5).

## 1. Prior art

The full log, with every query and hit count and the labels PRIMARY / SELF-REPORT / SECONDHAND / NOT READ, is in
[`prior-art-log.md`](prior-art-log.md). The essentials:

### 1.1 Hastings 1976

S. P. Hastings, "On travelling wave solutions of the Hodgkin-Huxley equations", Arch. Rational Mech. Anal. 60 (1976)
229-257, doi:10.1007/BF01789258, zbMATH 0374.35004, MR402302. **Read first hand: pp. 229-230 only** (Springer's free
preview); pp. 231-257, with the hypotheses and the theorem, were not reachable.

- p. 230: "Unfortunately, it is not clear that our results apply to the original HODGKIN-HUXLEY system. Our approach
  is to give a set of hypotheses on the various parameters which is as broad and unrestrictive as possible, consonant
  with obtaining the desired solution. The question of whether the HODGKIN-HUXLEY equations satisfy these hypotheses
  is left unanswered, though a number of remarks are made in this direction."
- Section II (p. 230): "Hence we multiply the expressions for n' and h' in (4) by epsilon > 0; our results will then be
  stated and proved for epsilon "sufficiently small", when tau_n and tau_h are given."

So Hastings proved existence for a class of HH-type systems with n and h slowed by a small epsilon, under hypotheses
that he did not verify for the HH functions. Secondary descriptions agree (Ikeda, Mimura and Tsujikawa 1989: Hastings
and Carpenter "introduce artificial small parameters"; Turner 2005: such a result "seems out of reach for the full
Hodgkin-Huxley model"; Ikeda et al. checked first hand in the publisher's preview by the independent checker,
Turner still secondhand: the checker could not find the sentence in the preview).

### 1.2 Carpenter 1977

G. A. Carpenter, "A geometric approach to singular perturbation problems with applications to nerve impulse
equations", J. Differential Equations 23 (1977) 335-367, doi:10.1016/0022-0396(77)90116-4, zbMATH 0341.35007,
MR442379. **Not read** (publisher 403 from this sandbox; the checker found that Crossref lists it under Elsevier's
open-archive licence, so it should be freely readable in a browser and must be read before any claim). Her own description, read first hand
in Carpenter, SIAM J. Appl. Math. 36 (1979) 334-372, p. 336 (self-report):

- "The model defined in Section 2 contains three positive parameters, epsilon, delta, and theta. epsilon is the order of
  magnitude of the rate at which Na+ inactivation and K+ activation occur; delta^-1 is the order of magnitude of the
  rate at which Na+ activation occurs; and theta is the speed of wave propagation. Throughout, the existence of
  solutions is proved for epsilon and delta near zero."
- "An open problem is to analyze the behavior, as epsilon and delta increase, of the families of solutions described
  in this paper for small epsilon and delta."

So Carpenter proved existence for a "generalized Hodgkin-Huxley system" defined by abstract hypotheses, in a singular
limit with two small parameters. The 1952 system is epsilon = delta = 1 with the actual rate functions.

The statement of Keener and Sneyd (Sect. 9.4.2, 1st ed.), "Shooting is also the method by which a rigorous proof of
the existence of traveling waves has been given (Hastings, 1975; Carpenter, 1977)", is therefore true of the modified
systems those papers treat, not of the 1952 equations. (The Keener-Sneyd sentence is quoted from the task statement and
from the ledger entry of 2026-09-25 in RESEARCH.md; the book was not re-read here.)

### 1.3 Other work

- Ikeda, Mimura and Tsujikawa: slow pulse (1987) and fast pulse (Japan J. Appl. Math. 6 (1989) 1-66), again with
  artificial small parameters (abstract and review only).
- Muratov, Biophys. J. 79 (2000) 2893, arXiv:nlin/0209053 (read): at the HH parameters V, not m, is the fastest
  variable, and the singular limits in which m is fastest give speeds "an order of magnitude greater than the actual
  value". This is a reason why a singular-perturbation proof does not settle the 1952 case.
- Arioli and Koch, "Existence and stability of traveling pulse solutions of the FitzHugh-Nagumo equation", Nonlinear
  Anal. 113 (2015) 51-70, doi:10.1016/j.na.2014.09.023 (preprint read): computer-assisted, FitzHugh-Nagumo only,
  epsilon = 1/100, gamma = 5, a = 1/10, "velocity c = 0.470336270 . . .". None of its 83 citing papers (Semantic
  Scholar) treats a Hodgkin-Huxley or conductance-based wave.
- Other computer-assisted work on excitable waves (Czechowski and Zgliczynski, SIADS 15 (2016); Czechowski,
  arXiv:1909.06207; Matsue 2016): FitzHugh-Nagumo.
- Not classified: Foote and Chen, "Traveling wave properties of the Hodgkin-Huxley equations", Chin. J. Math. 9 (1981)
  1-23 (no abstract or review seen). Worth a library request.
- A lead against an existing ledger line: Du and Hassard, Dyn. Contin. Discrete Impuls. Syst. Ser. A 8 (2001)
  495-518, locate Hopf points with interval arithmetic and apply it to the HH model (zbMATH review; not read). The
  RESEARCH.md entry of 2026-09-25 says no computer-assisted Hopf proofs for HH were found; this paper should be read
  before any Hopf priority claim in `papers/hh-dynamics/`.

### 1.4 Searches

Run on 2026-09-26 (full table in [`prior-art-log.md`](prior-art-log.md), Section D). Hit counts:

| engine | exact query | hits | relevant |
|---|---|---|---|
| arXiv search, abstracts | `"Hodgkin-Huxley" "traveling wave"` | 2 | none |
| arXiv, abstracts | `"Hodgkin-Huxley" "travelling wave"` | 2 | none |
| arXiv, abstracts | `"Hodgkin-Huxley" "propagating action potential"` | 1 | none |
| arXiv, abstracts | `"Hodgkin-Huxley" "traveling pulse"` / `"travelling pulse"` | 2 / 2 | Muratov (approximation, not a proof) |
| arXiv, abstracts | `"Hodgkin-Huxley"` with `"computer-assisted"`, `"computer assisted proof"`, `"rigorous numerics"`, `"validated numerics"`, `"interval arithmetic"`, `"existence proof"` | 0 each | |
| arXiv, abstracts | `"Hodgkin-Huxley" homoclinic` | 1 | none (Hindmarsh-Rose) |
| arXiv, abstracts | `"Morris-Lecar" "computer-assisted"`, `"conductance-based" "computer-assisted"`, `"traveling pulse" "computer-assisted"`, `"action potential" "computer-assisted proof"` | 0 each | |
| arXiv, abstracts (positive control) | `"FitzHugh-Nagumo" "computer-assisted"` | 4 | FHN results found, so the search works |
| PubMed | `"Hodgkin-Huxley"[tiab] AND ("traveling wave"[tiab] OR "travelling wave"[tiab])` | 11 | none |
| PubMed | `"Hodgkin-Huxley"[tiab] AND` each of `"computer-assisted proof"`, `"rigorous numerics"`, `"interval arithmetic"`, `"validated numerics"`, `"existence proof"` | 0 each | |
| PubMed | `"Hodgkin-Huxley"[tiab] AND homoclinic[tiab]` | 2 | none |
| zbMATH | `ti:Hodgkin-Huxley & ti:wave` | 10 | Hastings 1976; Ikeda et al. 1987, 1989; Foote-Chen 1981 |
| zbMATH | `Hodgkin-Huxley & (travelling \| traveling) & (wave \| pulse)` | 45 | nothing new (all titles scanned) |
| zbMATH | `Hodgkin-Huxley & "computer assisted"` / `"rigorous numerics"` / `"validated numerics"` | 0 each | |
| zbMATH | `Hodgkin-Huxley & "interval arithmetic"` | 1 | Du-Hassard 2001 (Hopf points, not waves) |
| zbMATH (positive control) | `FitzHugh-Nagumo & computer-assisted` | 10 | Arioli-Koch 2015 and others |
| Semantic Scholar | citers of Hastings 1976 / Carpenter 1977 / Arioli-Koch 2015 | 67 / 219 / 83 | no computer-assisted HH result |
| Semantic Scholar | `computer-assisted proof traveling pulse nerve` | 133 | Arioli-Koch only |

Limits: the arXiv API refused requests from this sandbox (the arxiv.org search page was used instead, and one query hit
its rate limit); most Semantic Scholar keyword searches were rate limited; OpenAlex's quota was spent; Google Scholar
was not reachable.

### 1.5 What was not reached, and what must be read before any claim of priority

Hastings 1976 pp. 231-257 (his "remarks" on whether HH satisfies the hypotheses); Carpenter 1977 itself; Foote and
Chen 1981; Huxley, Ann. N.Y. Acad. Sci. 81 (1959) 221-246; the full texts of Cooley and Dodge (1966) and Miller and
Rinzel (1981); Du and Hassard (2001).

### 1.6 The 1952 numbers (read first hand from a scan of the paper, pp. 522-528)

- Eq. (31): d^2V/dt^2 = K{dV/dt + (1/C_M)[g_K n^4 (V - V_K) + g_Na m^3 h (V - V_Na) + g_l (V - V_l)]}, with
  K = 2 R_2 theta^2 C_M / a (p. 524).
- p. 528: "The value of the constant K that was found to be needed in the equation for the propagated action potential
  (eqn. 31) was 10.47 msec^-1"; "The values of a and R_2 were 238 mu and 35.4 ohm cm respectively. Hence the calculated
  conduction velocity is (10470 x 0.0238/2 x 35.4 x 10^-6)^1/2 cm/sec = 18.8 m/sec. The velocity found experimentally
  in this fibre was 21.2 m/sec." Temperature 18.5 C, C_M = 1.0 uF/cm^2.
- p. 523: the rates scale by phi = 3^((T' - 6.3)/10); and the shooting criterion (p. 522): "V goes off towards either
  +infinity or -infinity, according as the guessed theta was too small or too large."
- Arithmetic (ours): K = 10.47 gives theta = 18.76 m/s, which Hodgkin and Huxley rounded to 18.8.

### 1.7 The slow pulse and the temperature limit (literature)

Huxley's Nobel lecture (1963, read first hand) says the equations give "a wave, or even a series of waves, of just
threshold amplitude, travelling along the fibre at much lower velocity than the normal spikes", situations "so
unstable that it may well be impossible to realise them in practice"; its Fig. 16 caption says computed "conduction
failed at a temperature slightly above the highest shown" (28.9 C). Cooley and Dodge (1966, abstract): "a highly
unstable subthreshold propagating wave". Miller and Rinzel (1981, abstract): fast and slow wave trains, the slow ones
"likely unstable". Reported maximum temperatures, all attributed to Huxley 1959 and not checked there: about 33.5 or
33.7 C (Phillipson and Schuster 2005, secondhand), "T ~ 30 C" (Muratov 2000 text; his Fig. 4 ends near 32.5 C), 38 C
(Miller and Rinzel, secondhand). They disagree and only Huxley 1959 can settle which quantity each is.

## 2. Numerics (numerical, not rigorous)

### 2.1 The equation

With u = -V (depolarization, mV), the modern sign convention of `papers/hh-dynamics/`, eq. (31) is unchanged in form
because it is odd in V:

    u'' = K (u' + I(u, m, n, h)),     I = 120 m^3 h (u - 115) + 36 n^4 (u + 12) + 0.3 (u - E_l),
    x'  = phi (alpha_x(u)(1 - x) - beta_x(u) x),     x = m, n, h,    phi = 3^((T - 6.3)/10),

with t in ms, C_M = 1, the 1952 rate functions (as in `papers/hh-dynamics/code/hh_ball.py`) and
theta = sqrt(K a / (2 R_2 C_M)), a = 0.0238 cm, R_2 = 35.4 ohm cm. The state is y = (u, u', m, n, h), five-dimensional.
E_l is 10.5989209694 mV, the value that makes the resting current exactly zero, as Table 3's footnote intends; the
printed 10.613 is also run for comparison. A pulse is an orbit homoclinic to rest y* = (0, 0, m_inf(0), n_inf(0),
h_inf(0)).

### 2.2 Rest: dimensions of the manifolds

At the pulse speed (18.5 C) the eigenvalues of rest are 10.8923 (unstable), -16.3042, -0.48515 +- 0.71755 i and
-0.46282 (at 6.3 C: 4.9741; -4.4461, -0.21035 +- 0.36724 i, -0.12066). So **dim W^u = 1, dim W^s = 4**, checked
numerically for K from 2 to 50 and proved for the K ball of Section 3. A homoclinic orbit needs the one-dimensional
W^u to lie in the four-dimensional W^s of a five-dimensional space: one condition, one parameter K.

### 2.3 The fast pulse

Shooting (`hhwave.py`, `numerics.py`): leave rest along the unstable eigenvector, integrate (DOP853), and bisect K on
the direction in which u runs away.

| T | K (1/ms) | speed (m/s) | spread over 4 tolerance settings | peak u | lowest u |
|---|---|---|---|---|---|
| 18.5 C | 10.4383548291 | **18.7321608** | 7e-11 in K | 90.585 mV | -9.672 mV |
| 6.3 C | 4.5107697268 | **12.3139441** | 5e-11 in K | 102.98 mV | -10.94 mV |
| 18.5 C, printed E_l = 10.613 | 10.4380511 | 18.731888 | | | |
| 6.3 C, printed E_l = 10.613 | 4.5106324 | 12.313757 | | | |

A collocation solution of the boundary-value problem on [-6, 40] ms with projection conditions at both ends
(`pulse_bvp.py`, scipy's solve_bvp) agrees: K = 10.43835482942 at 18.5 C and 4.51076972684 at 6.3 C (differences of
3e-10 and 5e-11 from shooting).

**Against Hodgkin and Huxley.** Their hand computation, K = 10.47 /ms, is 0.30 per cent above ours and gives
18.76 m/s, printed as 18.8; ours is 18.73 m/s. The measured 21.2 m/s is 13 per cent above both. The 0.3 per cent is
not explained by the leak potential (the printed E_l moves K by 3e-5 relative); it is within what a 1952 hand
integration with a desk calculator could be expected to carry, but we did not try to reproduce their procedure.

**Profile and tail.** At 18.5 C the upstroke passes 50 mV at t = 0, peaks at 90.6 mV at 0.16 ms, and undershoots to
-9.67 mV at 1.5 ms; the return to rest is a slow damped oscillation (the complex pair, decay 0.485 /ms, period about
8.8 ms). In the eigen-coordinates of Section 3 the orbit is within 0.01 of rest (the radius of the largest block we
have verified) only from about t = 17 ms (`data/pulse_bvp_18.5.txt`, and the table printed in Section 4.3). At 6.3 C
everything is about 2.3 times slower.

### 2.4 Temperature, and the slow pulse

`scan_T.py` scans K in [0.02, 80] (160 points) and brackets each switch of the escape direction
(`data/scan_T.txt`):

| T (C) | lower switch: K, speed | fast pulse: K, speed |
|---|---|---|
| 6.3 | 0.1368, 2.14 m/s | 4.5108, 12.31 m/s |
| 18.5 | 0.9131, 5.54 m/s | 10.4384, 18.73 m/s |
| 25 | 2.0589, 8.32 m/s | 14.4688, 22.05 m/s |
| 30 | 4.2353, 11.93 m/s | 16.3351, 23.43 m/s |
| 32 | 6.1608, 14.39 m/s | 15.7289, 22.99 m/s |
| 34, 36, 38 | none | none |

The two switches approach each other and disappear between 32 and 34 C. The literature on the failure temperature
is not consistent (Section 1.7): 33.5 to 33.7 C is secondhand, attributed to Huxley 1959, while Huxley's own Nobel
caption says the computed conduction failed slightly above 28.9 C; we have not read Huxley 1959. The fast speed rises to about 23.4 m/s near 30 C and
then falls, as in Muratov's Fig. 4.

**The lower switch is not a slow pulse.** At the lower switch (18.5, 25, 30 and 32 C) the orbit does not return to
rest: after one small excursion it settles on an oscillation with peaks of 26 to 32 mV and a period of 2.5 to 3.3 ms
and stays there for 6 to 25 ms before it runs away (closest approach to rest afterwards: 0.02 to 0.07 in scaled
units). That is the signature of a connection from rest to a periodic orbit (a wave train), which also costs one
condition. So **no slow pulse was found by this scan**. The literature says one exists numerically: Ikeda, Mimura and
Tsujikawa (Japan J. Appl. Math. 6 (1989), p. 2, read by the checker in the publisher's preview): "Huxley [16], [17],
Cooley and Dodge [5] and Miller and Rinzel [22] numerically show that (1.1) has two 1-pulse traveling wave solutions
with different velocities, and that the fast traveling wave solution is stable, while the slow one is unstable." Our
escape-sign scan is not designed to see a slow pulse whose two sides escape the same way, so this is a limit of the
scan, not evidence against the slow pulse. Finding it would need
continuation of the fast pulse around the fold near 33 C, which we have not done.

## 3. Rigorous first stage

All in python-flint (Arb ball arithmetic). The logic of each lemma is in the program's docstring.

### 3.1 Lemma A: rest and its eigenvalues (`certify_rest_wave.py`)

E_l is enclosed as [10.59892096939167852219888 +- 1.5e-24] from its definition (zero resting current), rest is exact,
and f(y*) encloses 0. For every K in [10.4383548, 10.4383549] (and separately in [4.5107697, 4.5107698] at 6.3 C) the
characteristic polynomial P of Df(y*) satisfies P(a) < 0 < P(b) and P' > 0 on [a, b] (256 subintervals), so it has
exactly one real root lambda_u in [a, b], enclosed as [10.89231 +- 3.3e-6] (6.3 C: [4.97407 +- 1.2e-6]); the quotient
P/(x - lambda_u), whose coefficients are enclosed by synthetic division with the ball lambda_u, satisfies the
Hurwitz conditions (all coefficients positive, D2 = 415.82, D3 = 6.49e3 > 0). Hence rest has exactly one eigenvalue
with positive real part, simple and real, and four with negative real part. Negative control: a bracket above
lambda_u is rejected.

### 3.2 Lemma B: where the unstable manifold leaves a neighbourhood of rest

In coordinates z = T(y - y*) with T a fixed dyadic approximation of the inverse real eigenbasis, the box
B = {|z1| <= r, |z2| <= s2, z3^2 + z4^2 <= s3^2, |z5| <= s5} satisfies, for every K in the ball: every stable face is
strictly inflowing, and D A + A^T D (D = diag(1, -1, -1, -1, -1)) is positive definite for every A in the interval
hull of T Df T^-1 over B. Then (argument in the docstring) the branch of W^u(y*) tangent to +T^-1 e1 leaves B through
the face z1 = +r at a point with |z2| <= s2, |(z3, z4)| <= s3, |z5| <= s5. Verified with r = 1e-4,
(s2, s3, s5) = (2e-9, 1e-7, 6e-9), and with r = 1e-5 and the s scaled by 1/100 (used in 3.3); negative control: faces
100 times thinner are rejected. The same check passes with r = s = 0.01 (a round block, the size a closing block
could have) and fails at 0.02 with these crude bounds (the checker's run; 0.03 fails too).

### 3.3 The bracketing orbits (`prove_bracket.py`, `lohner_hh.py`, `hhjet.py`)

`lohner_hh.py` is a C^0 Lohner (QR) integrator adapted from `papers/nf-pulse/code/lohner.py`; `hhjet.py` computes the
Taylor coefficients of the flow and their derivatives with respect to the initial point by Picard iteration on
truncated power series of dual numbers, with Psi(x) = x/(e^x - 1) near x = 0 evaluated as 1/G(x),
G(x) = (e^x - 1)/x = sum x^n/(n+1)!, whose Taylor coefficients carry a rigorous tail bound, so no ball containing 0 is
ever divided by. Tests: the jet's Jacobian matches finite differences, and the gradients of the fifth Taylor
coefficient match 200-bit central differences to 7e-37 relative; the series of 1/G near u = 25 is continuous; a
Lohner integration of the upstroke to t = 1 ms contains scipy's DOP853 solution (`test_jet.py`,
`data/test_jet.txt`).

Result (`data/prove_bracket.txt`, 128 bits, order 20; the success test is on the enclosure at the end of a step,
for both u and u'):

- K1 = 10.4383548: the whole exit set of Lemma B (r = 1e-5) is carried through the spike (u up to 90.58 mV) and
  **reaches u < -60 mV with u' < 0** (u' in [-900 +- 66] mV/ms) at t = 2.46501 ms after leaving the block (428 steps).
- K2 = 10.4383549: **reaches u > +150 mV with u' > 0** at t = 2.47637 ms (461 steps).
- Negative control: at K1, the upward target (u > 150, u' > 0) is not certified; the set is carried until it is too
  wide (983 steps) and the program reports that as expected.

At 6.3 C (`python3 prove_bracket.py 1e-5 6.3`, `data/prove_bracket_6.3.txt`): with K1 = 4.5107697 the exit set
reaches u < -60 mV at t = 4.61796 ms (442 steps), and with K2 = 4.5107698 it reaches u > +150 mV at t = 4.51464 ms
(335 steps), both with u' of the same sign, and the negative control again fails as it should. So the shooting
switches between 12.3139441 and 12.3139442 m/s.

So, rigorously, the firing branch of the unstable manifold crosses u = -60 mV going down at K1 and u = +150 mV going
up at K2, the two behaviours Hodgkin and Huxley observed at the two sides of their K. Whether it then goes to
infinity is not checked (and is not needed for the plan of Section 4). (The "max u upper bound so far" printed by the program is taken over the
sets at the ends of the steps, not over the steps themselves.) **This does not prove that a pulse exists** (Section 4).

## 4. Plan for the full proof

### 4.1 Formulation

Unknowns: the speed, through K, and nothing else; the phase is fixed by leaving rest on W^u. The argument is the one
of `papers/nf-pulse/` (Wazewski-type shooting with an isolating block at rest):

1. **Block at rest** (extends Lemma B): a round block B0 of radius r0 about 0.01 in z, with the cone condition on all
   of B0 and strict entrance on the stable faces where L <= 0. Then K+ = {L > 0, z1 > 0} and K- = {L > 0, z1 < 0} are
   forward invariant in B0, and an orbit that stays in B0 forever tends to rest. The check with r = s = 0.01 already
   passes (3.2); the entrance statement restricted to L <= 0 is weaker than the inflow checked there.
2. **Local manifold:** Lemma B with r of order 1e-35 and s of order r^2 (the check scales), or a Taylor
   parametrization with a validated tail as in `papers/nf-pulse/code/manifold.py`.
3. **Integration of a K interval** [K1, K2] of width about 1e-80 around the pulse speed, with K carried as a sixth
   state variable (K' = 0) so that the Lohner set tracks it linearly, from the exit set of step 2 to about t = 17 ms
   after the upstroke, where every orbit of the interval must be in the interior of B0; and the two endpoint orbits
   carried a little further, into K- and K+ respectively.
4. **Conclusion:** the sets of K whose orbit enters K+ or K- are open, disjoint and non-empty, so some K in between
   does neither; its orbit stays in B0 and tends to rest. That orbit is the pulse, with the speed in
   [theta(K1), theta(K2)].

### 4.2 Obstacles, measured

- **The long tail, and the precision it forces.** The pulse enters a block of radius 0.01 only about 17 ms after the
  upstroke, because the complex pair decays at only 0.485 /ms. Along the way any error in the unstable direction
  grows like e^(10.9 t). Double-precision shooting loses the pulse about 2 ms after the peak with a K error of 1e-14;
  carrying it another 15 ms costs a factor of about e^(10.9 x 15) = 10^71. `sensitivity.py` integrates dy/dK along the
  collocation profile from the exit face of Lemma B (u = 1e-5 mV): |dy/dK| is 1e16 at t = 2 ms, 2e82 at 16 ms and
  7e91 at 18 ms (`data/sensitivity_18.5.txt`), so for the orbits to stay within 0.01 of the pulse until they enter the
  block the K interval must be 10^-85 to 10^-90 wide, and the manifold's stable box comparably thin; the integration needs about 350 to 400 bits and a per-step tolerance near
  10^-90. A larger block (better weights; the crude bound fails at 0.02) or a smarter closing would cut this: each
  factor of 10 in r0 saves about 4.7 ms and 22 digits.
- **Wrapping in the upstroke.** At 128 bits the rigorous radius grows about 250 times more than e^(lambda t) across
  the steep upstroke (u' reaches 400 mV/ms), because the remainder is evaluated over the whole a priori box. Smaller
  steps there (or a time-subdivided remainder) fix it; it is a cost, not a barrier.
- **Stiffness and the fast m.** Not an obstacle at the 1952 rates: the fastest eigenvalue is -16.3 /ms at rest and
  no faster than -26.6 /ms anywhere along the numerical profile, against local rates of order 1 to 25 /ms, and explicit Taylor steps are limited by the radius of
  analyticity (about 0.1 ms) rather than by stability. This is the opposite of the singular limits of Hastings and
  Carpenter, where m is infinitely fast.
- **A high-precision numerical speed first.** The interval [K1, K2] of width 1e-85 must contain the true speed, so K*
  has to be computed first to about 90 digits (non-rigorous high-precision Taylor shooting with secant steps on the
  unstable coordinate at growing horizons). `hhseries.py` already evaluates the field in arbitrary precision.
- **Python speed.** At 128 bits and order 20 a step costs about 0.15 s. At 400 bits and order 40 to 50 with the
  6-variable jet we expect 0.5 to 1 s per step and 5000 to 10000 steps: one to three hours per run.

### 4.3 Effort, chance, and who would care

- **Effort:** K as a state variable in the jet (half a day); the closing block and its lemma (a day); the
  high-precision numerical speed (half a day plus compute); the long rigorous run and its tuning (a day plus compute);
  negative controls, an independent re-check of the block conditions, written proofs of the lemmas (a day). Two to four
  days in all.
- **Honest chance:** 60 to 70 per cent along the direct route in that time. The main risk is that wrapping over 17 ms at
  that precision costs far more steps than estimated. The fallback, a chain of covering relations along the orbit
  (the method of Zgliczynski and Wilczak, which avoids carrying a 10^-85 interval by working with small h-sets and
  their exit directions), is standard but would need a new layer of code.
- **Novelty:** on the searches of Section 1, a proof would be the first existence proof for the propagated action
  potential of the unmodified Hodgkin-Huxley equations, closing the question that Hastings (1976) and Carpenter (1977)
  left open for the original system. It would be modest mathematically (one parameter point; no stability, no
  uniqueness) and historically pointed. Who would notice: the rigorous-numerics community (Zgliczynski, Wilczak,
  Lessard, van den Berg, Mireles James, Arioli and Koch), the authors of the singular-perturbation theory of nerve
  pulses (Hastings, Carpenter, Jones, Sandstede) and textbook authors who repeat the Keener-Sneyd sentence. Before any
  claim: read Hastings pp. 231-257, Carpenter 1977 and Foote and Chen 1981 (Section 1.5).

## 5. Independent check

An independent subagent (2026-09-26), with no access to our reasoning beyond this report and the code, re-opened the
sources, recomputed the speed with code written from scratch, and reviewed the rigorous programs. Its verdict, in
summary:

- **Sources.** Verified word for word: Hastings p. 230 (both quotations); Carpenter 1979 p. 336 (both); Hodgkin and
  Huxley 1952 pp. 519-528 (the rate functions, eq. (31), the "+infinity or -infinity" sentence, phi, K = 10.47,
  a = 238 mu, R_2 = 35.4, 18.8 and 21.2 m/s, 18.5 C, C_M = 1.0, the Table 3 footnote); Huxley's Nobel lecture (the
  slow-wave passage, the Fig. 16 caption); Arioli and Koch (FitzHugh-Nagumo only, epsilon = 1/100, gamma = 5,
  a = 1/10, 0.470336270); Muratov (the "order of magnitude" sentence, "T ~ 30", Fig. 4); the Cooley-Dodge and
  Miller-Rinzel abstracts. Upgraded to first hand: the Ikeda-Mimura-Tsujikawa "artificial small parameters" sentence.
  Not verified: the Turner sentence (not in the preview). Still unreached: Hastings pp. 231-257, Carpenter 1977 (but
  open-archive), Foote and Chen 1981, Huxley 1959.
- **Speed, recomputed** with its own fixed-step RK4 at two step sizes and scipy's Radau, bisecting K on the escape
  direction: K = 10.4383548291 (18.7321608 m/s) at 18.5 C, 4.5107697268 (12.3139441 m/s) at 6.3 C, and 10.43805106
  (18.731888 m/s) with the printed E_l; the same eigenvalues of rest; K = 10.47 gives 18.7605 m/s. Its own scan at
  18.5 C finds the same two switches, and the same oscillation (about 31.6 mV, period 3.26 ms) at the lower one.
- **Rigorous code.** Both certification programs pass when rerun and reproduce the committed output. Lemma A, the
  block argument of Lemma B and the Lohner step are sound, including Psi near 0.
- **Corrections it asked for, all applied:** (1) "escapes" said more than was checked; the program now also certifies
  the sign of u', and the report no longer says "to infinity"; (2) "speed pinned to seven digits" pinned a switch of
  the shooting, not the speed of a proved pulse; reworded; (3) a claim that a scan without a sign switch at 36 C would
  prove non-existence was wrong (a pulse need not produce a sign switch, and a scan does not cover every K); removed;
  (4) the failure temperature was attributed too firmly; reworded; (5) the literature's numerical slow pulse was not
  cited; added (Section 2.4); (6) the jet tests cited here were not in the folder; added as `test_jet.py`, and a dead
  reference to a missing program was removed; (7) `prove_bracket.py` had no negative control; added; (8) the Lemma B
  docstring gave the wrong reason for L > 0 near rest (it is that L increases strictly in B and tends to 0 backward);
  fixed; (9) Lemma B fails at 0.02, not only 0.03; corrected.
- **Overall (its words, condensed):** the sources are accurate, the numbers are independently reproduced, and the
  rigorous first stage is sound for what it literally proves.

## 6. Rerun

```
cd papers/hh-dynamics/work/traveling-wave/code
python3 -m pip install python-flint==0.9.0 numpy scipy
python3 numerics.py                  # speeds, tolerance spread, eigenvalues (about 1 minute) -> data/numerics.txt
python3 scan_T.py                    # switches in K at 6.3 ... 38 C (several minutes) -> data/scan_T.txt
python3 pulse_bvp.py 18.5            # collocation profile (a few minutes) -> data/pulse_bvp_18.5.txt, data/pulse_18.5.npz
python3 pulse_bvp.py 6.3             # -> data/pulse_bvp_6.3.txt
python3 certify_rest_wave.py 18.5    # rigorous: Lemmas A and B (seconds) -> data/certify_rest_wave_18.5.txt
python3 certify_rest_wave.py 6.3
python3 prove_bracket.py 1e-5        # rigorous: the two bracketing orbits (about 2.5 minutes) -> data/prove_bracket.txt
python3 prove_bracket.py 1e-5 6.3    # the same at 6.3 C -> data/prove_bracket_6.3.txt
python3 test_jet.py                  # tests of the jet, Psi near 0 and the integrator -> data/test_jet.txt
python3 sensitivity.py 18.5          # numerical: growth of dy/dK along the profile -> data/sensitivity_18.5.txt
```

The rigorous programs exit with status 0 only if every check, including the negative controls, passes.

## 7. Files

| File | Kind | What it does |
|---|---|---|
| `code/hhwave.py` | numerical | the wave ODE in floating point, eigenvalues, shooting and bisection in K, unit conversion |
| `code/numerics.py` | numerical | the speeds at 18.5 and 6.3 C, tolerance spread, printed-E_l comparison |
| `code/pulse_bvp.py` | numerical | the pulse as a boundary-value problem (profile, tail) |
| `code/scan_T.py` | numerical | shooting switches as the temperature rises |
| `code/sensitivity.py` | numerical | dy/dK along the profile, to size the closing step |
| `code/hhseries.py` | rigorous | Taylor coefficients of the field on power series of balls; Psi near 0 with a tail bound |
| `code/hhjet.py` | rigorous | the same with derivatives in the initial point (dual numbers) |
| `code/lohner_hh.py` | rigorous | C^0 Lohner integrator |
| `code/certify_rest_wave.py` | rigorous | Lemma A (eigenvalues) and Lemma B (exit of the unstable manifold) |
| `code/prove_bracket.py` | rigorous | the two bracketing orbits, with a negative control |
| `code/test_jet.py` | tests | the jet against finite differences, Psi near 0, the integrator against scipy |
| `prior-art-log.md` | literature | the full search log and quotations |

A line for RESEARCH.md (not added here, since this work is confined to this folder): "2026-09-26, Hodgkin-Huxley
propagated action potential at the 1952 parameters: open as far as reached (Hastings 1976 p. 230 and Carpenter 1979
p. 336 self-report: artificial small parameters); see papers/hh-dynamics/work/traveling-wave/REPORT.md. Re-search: no,
except to read Hastings pp. 231-257, Carpenter 1977 and Foote-Chen 1981."
