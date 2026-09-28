# The propagated action potential of Hodgkin and Huxley: prior art, numerics and a proof plan

Chase Hendrick, 2026-09-26. Work in progress in `work/traveling-wave/` of the paper's folder. Every statement below is
labelled **rigorous** (proved by a program in ball arithmetic, whose logic is stated), **numerical** (floating point,
not a proof) or **literature** (with the source and whether it was read first hand).

## 0. Summary

- **Question.** Is there a proof, with or without a computer, that the traveling-wave equation of Hodgkin and Huxley
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
  The closing step was missing on 2026-09-26; it is done at 18.5 C (next item but one).
- **Feasibility of the full proof (as estimated on 2026-09-26; superseded by 4.4 and 4.5).** The closing step needs the orbits of a whole K interval tracked until they are
  inside an isolating block at rest, about 17 ms after the upstroke at 18.5 C. The unstable eigenvalue is about
  10.9 /ms, so the K interval must be about 10^-85 wide and the integration run at roughly 350 to 400 bits. The pieces
  exist (Lemma B's block works up to radius 0.01; the integrator works); the cost is compute and care, not a new idea.
  Our honest estimate: 2 to 4 more working days, a 60 to 70 per cent chance of success along this direct route, with
  a covering-relation (multiple shooting) route as the fallback if the direct one wraps too much. A proof would, as far
  as we can tell, be the first for the unmodified Hodgkin-Huxley pulse.
- **The closing step at 18.5 C (2026-09-27): proved by computer** (Sections 4.4 and 4.5). A closing block at rest with
  a cone condition, of radius 0.8 in weighted eigen-coordinates (the pulse is inside it about 8 ms after the
  upstroke), Lemma B at r_B = 1e-25, and a six-variable Lohner integrator carrying the whole interval [K1, K2] of
  width 3e-45 through the spike into the block, with the two endpoint orbits then entering opposite cones: a
  Wazewski-type argument gives **a pulse of the unmodified 1952 equations at 18.5 C, with speed
  theta in (18.732160814388902113775385154028169368017733735, ...739) m/s** (the proof pins K* to 45 digits). About 70 minutes
  of CPU at 256 bits; negative controls (a K interval without the pulse; alpha_m perturbed by 1e-12 u^2) fail as
  they must. Checked inside the project only: tests, an independent program for the block conditions, and an
  adversarial rereading; no outside review. As far as the searches of Section 1 reached, this is the first proof
  for the unmodified equations; Hastings 1976 pp. 231-257 and Foote and Chen 1981 are still unread.
- **Independent check (2026-09-26, of the first stage).** An independent subagent re-read the sources, reproduced the
  speeds to every printed digit with its own code, and found the rigorous code sound for what it literally proves;
  its corrections are applied (Section 5).

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
MR442379. **Read in full on 2026-09-27** (a copy the owner obtained; details and quotations in
[`prior-art-log.md`](prior-art-log.md), Section (I)). Eq. (0.1), p. 336, slows n and h by epsilon and speeds m by
1/delta; Theorem 3.4, p. 353, gives a homoclinic travelling wave "for small epsilon > 0" with m = m_inf(V), under the
abstract Hypotheses (3.1, CUBIC, H) and (3.3, HOM, H); Theorem 4.2, p. 357, extends it to "all small delta > 0";
Theorem 5.1(B), pp. 357-358, shows that the pulse is lost if epsilon or delta is too large. The hypotheses are not
checked for the 1952 functions, and epsilon = delta = 1 is not treated. Before this reading, her own description, read
first hand in Carpenter, SIAM J. Appl. Math. 36 (1979) 334-372, p. 336 (self-report), was all we had:

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
  before any Hopf priority claim in the paper of this folder.

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

Hastings 1976 pp. 231-257 (his "remarks" on whether HH satisfies the hypotheses); Foote and Chen 1981 (Carpenter 1977
was read in full on 2026-09-27, see 1.2); Huxley, Ann. N.Y. Acad. Sci. 81 (1959) 221-246; the full texts of Cooley and Dodge (1966) and Miller and
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

With u = -V (depolarization, mV), the modern sign convention of the paper of this folder, eq. (31) is unchanged in form
because it is odd in V:

    u'' = K (u' + I(u, m, n, h)),     I = 120 m^3 h (u - 115) + 36 n^4 (u + 12) + 0.3 (u - E_l),
    x'  = phi (alpha_x(u)(1 - x) - beta_x(u) x),     x = m, n, h,    phi = 3^((T - 6.3)/10),

with t in ms, C_M = 1, the 1952 rate functions (as in `code/hh_ball.py` of the paper's folder) and
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

`lohner_hh.py` is a C^0 Lohner (QR) integrator adapted from `code/lohner.py` of the author's nf-pulse paper; `hhjet.py` computes the
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
of the author's nf-pulse paper (Wazewski-type shooting with an isolating block at rest):

1. **Block at rest** (extends Lemma B): a round block B0 of radius r0 about 0.01 in z, with the cone condition on all
   of B0 and strict entrance on the stable faces where L <= 0. Then K+ = {L > 0, z1 > 0} and K- = {L > 0, z1 < 0} are
   forward invariant in B0, and an orbit that stays in B0 forever tends to rest. The check with r = s = 0.01 already
   passes (3.2); the entrance statement restricted to L <= 0 is weaker than the inflow checked there.
2. **Local manifold:** Lemma B with r of order 1e-35 and s of order r^2 (the check scales), or a Taylor
   parametrization with a validated tail as in `code/manifold.py` of the nf-pulse paper.
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

### 4.4 The closing argument, as designed on 2026-09-27 (before the long computations)

This replaces the plan of 4.1 and 4.2 where they differ. Two measurements changed the costs. (i) A block with weights
fitted to the eigenvalues is far larger than the round one of 3.2: in the coordinates zeta = M (y - y*), M = S T with
T an inverse real eigenbasis of Df(y*) (unstable, fast real, Re and Im of the complex pair, slow real) and
S = diag(10, 7, 1, 1, 40), the cone and entrance conditions hold, in floating point, out to |zeta_s| about 0.8 to 1,
against 0.01 before; the pulse is inside such a block about 8 ms after the upstroke instead of 17. (ii) Only the growth
from the upstroke to that time matters for the widths, so the K interval and the stable box of the exit set have to be
about 1e-47 wide, not 1e-85, and 256 bits suffice.

**Theorem to be proved (computer-assisted).** Let T = 18.5 C, phi = 3^((T - 6.3)/10), the rate functions and
constants of Hodgkin and Huxley (1952) as in 2.1, and E_l the leak potential that makes the resting current zero. There
are explicit numbers K1 < K2 (printed with the result, K2 - K1 about 1e-46) such that for some K* in (K1, K2) the
travelling-wave system (2.1) has a solution y(t) = (u, u', m, n, h)(t), defined for all real t, not constant, with
y(t) -> y* = (0, 0, m_inf(0), n_inf(0), h_inf(0)) as t -> +infinity and as t -> -infinity. Hence eq. (31) of Hodgkin
and Huxley has a propagated action potential V(x, t) = -u(t - x/theta), theta = sqrt(K* a / (2 R_2 C_M)), with the
speed in (theta(K1), theta(K2)) for their a = 238 um, R_2 = 35.4 ohm cm, C_M = 1 uF/cm^2. The orbit leaves rest on the
branch of the unstable manifold along which u increases, and u exceeds a proved lower bound near 90 mV.

**Hypotheses, each checked by a program in ball arithmetic (python-flint, 256 bits), with K in [K1, K2] throughout:**

- (H1) Lemma A (3.1): Df(y*) has exactly one eigenvalue with positive real part, simple and real, and four with
  negative real part. So W^u(y*) is a curve and W^s(y*) is four-dimensional, for every K in the interval.
- (H2) Lemma B (3.2) at a tiny radius r_B = 1e-25, in coordinates z = T_B (y - y*) with T_B an exact dyadic matrix that
  diagonalizes Df(y*) to about 1e-70 (from a rigorous eigen-decomposition, acb_mat.eig): the branch of W^u with z1 > 0
  leaves the box through the face z1 = r_B inside the exit set E, whose stable widths are (2e-51, 1e-49, 6e-51). And
  (H2') the crossing is transversal, z1' > 0 on E, so the exit point p(K) depends continuously on K.
- (H3) The closing block B0 = {|zeta_1| <= r, |zeta_s|_2 <= rho} (rho = 0.8, r = 0.84; `block0.py`): for every x in
  B0, (C) D A + A^T D is positive definite, A = M Df(x) M^-1, D = diag(1, -1, -1, -1, -1); and for every x in B0 with
  |zeta_1| <= rho, (E) lambda_max(sym A_ss) + |A_s1|_2 < 0. Checked on a cover of B0 by cells in zeta, with interval
  Cholesky factorizations. Consequences (argument in the docstring of `block0.py`): L = zeta_1^2 - |zeta_s|^2
  increases strictly along orbits in B0; every boundary point with L <= 0 is a strict entrance point; the cones
  K+ = {L > 0, zeta_1 > 0} and K- = {L > 0, zeta_1 < 0} cannot be left while an orbit stays in B0; an orbit that stays
  in B0 for all later times tends to y*.
- (H4) The interval run: a C^0 Lohner integrator in the six variables (y, K), K' = 0 (`lohner6.py`, jets from
  `hhjet6.py`), carries a set containing E x [K1, K2] from t = 0 (the exit time) to t = T_enter and encloses it in the
  interior of B0.
- (H5) The endpoint runs: for K = K1 and K = K2, E is carried to T_enter, lies in int B0 there, and is carried further
  with an enclosure of the whole path over every step (`lohner6.step_range`) inside int B0, until the set lies in K-
  (for one endpoint) and in K+ (for the other).

**Argument.** *The exit point.* Fix K in [K1, K2]. In z = T_B (y - y*) the unstable eigenvector is e1 up to about
1e-70 (T_B inverts a rigorously enclosed eigenbasis to that accuracy, and the eigenvector moves by about 1e-45 over
the K interval), while the box B of Lemma B has aspect ratio s/r_B of at least 2e-26; so the branch of W^u(y*) tangent
to +e1 lies, near y*, in the interior of B, where L = z1^2 - |z'|^2 > 0. Lemma B's cone condition makes L strictly
increasing while the orbit is in B, and its inflow conditions forbid leaving through a stable face; the orbit cannot
stay in B (an omega-limit set in B would lie in a level set of L, which the cone condition allows only at y*, where
L = 0 < L(orbit)), so it leaves through the face z1 = r_B, which is the exit set E. On that whole face z1' > 0 (H2'),
so the first exit is transversal; call the exit point p(K). *Continuity.* By the local unstable manifold theorem with
parameters there is delta in (0, r_B) such that the point q(K) of the branch with z1 = delta depends continuously on K;
the time from q(K) to the transversal first exit through z1 = r_B then depends continuously on K (implicit function
theorem; before the exit the orbit is in the interior of B, since it cannot touch a stable face from inside), and so
does p(K). *The shooting.* For K in [K1, K2] let x_K(t) be the solution with x_K(0) = p(K); it lies on W^u(y*), so
x_K(t) -> y* as t -> -infinity, and K -> x_K(t) is continuous uniformly on compact time intervals.
Let S+ (S-) be the set of K for which there is t >= T_enter with x_K([T_enter, t]) in int B0 and x_K(t) in K+ (K-).
Both sets are open in [K1, K2] (conditions on a compact time interval, with open targets), disjoint (by H3 a cone
cannot be left while the orbit is in B0) and non-empty (H5). As [K1, K2] is connected, some K* is in neither. Its
orbit is in int B0 at T_enter (H4). If it ever left B0, at the first time t_e it reached the boundary either L <= 0,
and then the orbit would have entered B0 strictly at t_e, so it was outside just before, which it was not; or L > 0, and
then it was in K+ or K- just before t_e while still in int B0, so K* would be in S+ or S-. Hence x_{K*}(t) stays in
B0 for all t >= T_enter and tends to y* (H3). It is not constant (it passes through the exit set, at distance r_B from
rest, and through the spike). This is the pulse.

**What the argument does not use or claim.** No isolating property of the face |zeta_1| = r; no uniqueness of the
pulse or of K*; no stability; nothing for the printed E_l = 10.613 (whose K* differs by 3e-5 relative), nor for the
slow pulse. The standard facts used without a computer are the local unstable manifold theorem with parameters (for
the continuity of p(K)), continuous dependence on initial data and parameters, and the connectedness of an interval.

**Negative controls (each must fail):** Lemma A with a bracket above lambda_u; Lemma B with stable faces 100 times
thinner; the block with its radius multiplied by 1.5; the interval run for a K interval of the same width that does
not contain the pulse speed (shifted by 40 half-widths); the interval run at the true interval for the model with
alpha_m multiplied by 1 + 1e-12 u^2 (which leaves rest and its linearization unchanged, so Lemmas A and B still apply,
but moves the pulse speed by far more than the interval).

**Execution:** `hh_prove_pulse.py` (stages setup, interval, K1, K2, neg-shift, neg-model, summary), each stage under
`nice -n 19` and a timeout, checkpointing the Lohner set to `data/ckpt/` every two minutes; K* to about 55 digits from
`hp_pulse.py` (numerical: multiple shooting in high precision, Newton's method, to centre the interval).

### 4.5 Result at 18.5 C (2026-09-27): the closing step, computed

All stages of `hh_prove_pulse.py` at 18.5 C were run on 2026-09-27 at 256 bits (auxiliary precision 128 bits for the
Jacobian, the a priori box and the remainder), Taylor order 40, under `nice -n 19` with at most two processes; the
certificates are `data/pulse_proof_18.5_<stage>.json` and the summary `data/pulse_proof_18.5_summary.txt`.

- **Numerical centre (not rigorous).** `hp_pulse.py` (multiple shooting, 49 pieces, Newton and chord steps, 256 bits)
  gives K* = 10.43835482913857076889312845037160196105110729610623800432...; a rerun with a tolerance 10^6 times
  smaller agrees to 58 digits. Along that orbit, at T_enter the unstable coordinate of the pulse is
  zeta_1 = 0.0180 and d zeta_1 / dK = 2.15e44 (both numerical).
- **The interval.** K1 and K2 are exact binary fractions (their mantissas and exponents are in
  `data/pulse_proof_18.5_config.json`) at distance 1.5e-45 below and above K*:
  K1 = 10.43835482913857076889312845037160196105110729460623800432..., K2 = K1 + 3.000000000e-45 (to 10 digits).
  The corresponding speeds are 18.73216081438890211377538515402816936801773373587... and ...73385676 m/s
  (theta = sqrt(K a / (2 R_2 C_M)) in ball arithmetic).
- **(H1)-(H3), `setup`:** Lemma A for every K in [K1, K2]: lambda_u in [10.8923126906997954237335336624 +/- 3.3e-29],
  the other four eigenvalues in Re < 0 (Hurwitz determinants D2 = 415.82, D3 = 6494.2); Lemma B at r_B = 1e-25 with
  stable box (2e-51, 1e-49, 6e-51): inflow bounds -2.1e-50, -2.5e-51, -3.7e-99, cone bounds >= 0.9256; transversality
  z1' in [1.0892313e-24 +/- 3.1e-32] > 0 on the exit set; the block B0 (rho = 0.8, r = 0.84, weights (10, 7, 1, 1, 40)):
  cone condition on 1225 cells and entrance condition on 5875 cells. Negative controls rejected: a bracket above
  lambda_u, stable faces 100 times thinner, the block with radius x 1.5. Seconds of CPU.
- **(H4), `interval`:** 863 steps to T_enter = 13.625 ms after the exit from the Lemma B box (about 8 ms after the
  upstroke passes 50 mV); at T_enter the enclosure satisfies zeta_1 in [-0.343, 0.343] and |zeta_s| <= 0.63619 < 0.8:
  inside int B0. 1225 s. (The upstroke is carried with enclosure radii of 1e-42 at the peak.) Along the way
  u > 90.58 mV for the whole set at some step end, so the pulse's peak exceeds 90.58 mV.
- **(H5), `K1`:** at T_enter, zeta_1 = -0.30474 +/- 9e-6 and |zeta_s| <= 0.63516: in int B0; eight more steps of
  2^-7 ms, each with its whole path enclosed in int B0, bring the set into K- at t = 13.6875 ms
  (zeta_1 = -0.6201 +/- 3e-5 against |zeta_s| <= 0.6175). 1223 s.
- **(H5), `K2`:** at T_enter, zeta_1 = 0.34075 +/- 9e-6 and |zeta_s| <= 0.63552; the set enters K+ at t = 13.6875 ms
  (zeta_1 = 0.6518 +/- 5e-5 against |zeta_s| <= 0.6181), the path in int B0 throughout. 980 s.
- **Negative controls of the integration:** `neg-shift`, the interval K2 + [19, 20] (K2 - K1), of the same width and
  disjoint from [K1, K2], is at zeta_1 about 13 at T_enter, outside B0: the run fails, as it must (981 s).
  `neg-model`, alpha_m multiplied by 1 + 1e-12 u^2 (rest and its linearization unchanged, so (H1)-(H2) still hold),
  at the true [K1, K2]: the whole set escapes below u = -60 mV at t = 6.7252 ms, about one millisecond after the spike,
  so the run fails, as it must (628 s).
- **Consistency of the rigorous and numerical computations:** the numerical values predict zeta_1(K1) = 0.0180 -
  0.3226 = -0.3046 and zeta_1(K2) = 0.3406 at T_enter; the rigorous enclosures are -0.30474 and 0.34075.
- **Independent re-check of (H3):** `hh_block_check_iv.py`, written separately (mpmath interval arithmetic at 113 bits,
  the Jacobian from hand-derived formulas, M^-1 in exact rational arithmetic, its own cover and Cholesky test), confirms
  the cone condition (933 cells) and the entrance condition (4220 cells) on B0 for K in an interval containing
  [K1, K2], and rejects the block enlarged 1.5 times (`data/block_check_iv_18.5.txt`).
- **Tests** (`test_lohner6.py`, `data/test_lohner6.txt`): the six-variable jets agree with `hhjet.py` and with
  central differences in K; Lohner enclosures through the upstroke at orders 30 and 8 contain an independent
  high-precision solution (at order 30 the two agree to all 20 printed digits); at order 8 with the remainder term
  dropped the enclosure misses it by 1.5e-7, as it must.

**Theorem (computer-assisted; proved by the programs above, whose logic is stated in 4.4 and in their docstrings).**
Let T = 18.5 C, phi = 3^1.22, the 1952 rate functions and constants, and E_l the leak potential that makes the
resting current zero. For some K* in (K1, K2), with K1, K2 as above (K2 - K1 = 3e-45), the travelling-wave system
u'' = K* (u' + I(u, m, n, h)), x' = phi (alpha_x(u)(1 - x) - beta_x(u) x) has a non-constant solution defined for all
t that tends to rest as t -> +infinity and as t -> -infinity; it leaves rest on the branch of the unstable manifold
along which u increases, and max u > 90.58 mV. Equivalently, eq. (31) of Hodgkin and Huxley (1952) has a propagated
action potential, with speed theta = sqrt(K* a / (2 R_2 C_M)) in (18.732160814388902113775385154028169368017733735,
18.732160814388902113775385154028169368017733739) m/s for their a = 238 um, R_2 = 35.4 ohm cm, C_M = 1 uF/cm^2.

What the theorem rests on besides the computations: the local unstable manifold theorem with parameters, continuous
dependence on initial data and parameters, and the correctness of python-flint (Arb) 0.9.0 and of the programs as
written. What it does not say: nothing on uniqueness of the pulse or of K*, on stability, on the printed E_l = 10.613
(whose K* differs by 3e-5 relative), or on the slow pulse. The programs and this section have been checked only
inside this project (the tests, the independent block program and the adversarial rereading in Section 5); no one
outside the project has reviewed them.

**Rerun (2026-09-27, later the same day).** `hh-pulse/code/run.sh all`, started at 14:37 UTC from commit
391ae68, recomputed this proof from scratch as its last block (18.5 C, no `HH_EL`), after the two printed-leak proofs,
and ended at 18:41 UTC with every stage passed, both negative controls failed and `hh_block_check_iv.py` passed. The
certificates `hh-pulse/data/pulse_proof_18.5_*.json` are now its output. The numerical centre came out
byte for byte equal to the committed `hp_pulse_18.5.json`. K1 and K2 moved by 8.0e-62 (their last digits
...446221386 became ...454212849): the run above took K* from `hp_pulse.py` before its flow was made to keep time
exactly (commit 02e8ff5), and when the centre was recomputed with the exact-time flow (commit 735486e, the same 58
digits) the configuration and the stages were not rerun. Neither the stopping rule of `hp_pulse.py` nor its resume path
is involved (this centre converged in one pass). Apart from the run times, every value this section quotes (the digits
of K*, K1, K2 and the speeds, the zeta enclosures, the cell counts, the escape time of `neg-model`) is shared by both
runs; the interval [K1, K2] is recomputed from the centre on each run. Times of the rerun: `hp_pulse.py` 390 s,
interval 591 s, K1 593 s, K2 568 s, neg-shift 572 s, neg-model 595 s, `hh_block_check_iv.py` 17 s.

### 4.6 The same proof with the printed leak potential, E_l = 10.613 mV (2026-09-27)

Hodgkin and Huxley print V_l = -10.613 mV (Table 3; in their convention depolarization is negative, so in ours
E_l = +10.613). With that value the resting current is not zero at u = 0, and rest is the nearby equilibrium. With
the environment variable `HH_EL=10.613`, `certify_rest_wave.rest_state` takes E_l = 10.613 exactly and encloses the
equilibrium by an interval Newton step (existence and uniqueness within 1e-3 mV of the float value):
**u* = 0.0036206688079425688368876905420... mV**, enclosed to about 1e-73, with m, n, h at their steady-state
values there. Every program is otherwise unchanged; the data files carry the tag `18.5_El10.613`, and
`hh_block_check_iv.py` finds the same rest state by its own bisection. The chain ran one stage at a time:

- numerical centre K* = 10.43805106010112369227648623831857912185866977197832623... (Newton converged to 1e-66);
- `setup`: Lemmas A and B, transversality and the block (1232 and 5916 cells) pass, with their negative controls;
- `interval`: at T_enter = 13.625 ms, zeta_1 in [-0.341, 0.341], |zeta_s| <= 0.63603: in int B0 (597 s);
- `K1`, `K2`: into K- and K+ with the paths in int B0 (570 s, 561 s);
- `neg-shift` and `neg-model`: fail, as they must (566 s, 389 s); `hh_block_check_iv.py`: passes (935 and 4241 cells) and
  rejects the enlarged block.

**Theorem (computer-assisted), printed leak potential.** As the theorem of 4.5, with E_l = 10.613 mV and rest the
equilibrium u* above: for some K* in (K1, K2), K1 = 10.438051060101123692276486238318579121858669770478..., K2 = K1 +
3e-45, the travelling-wave system has a pulse, an orbit homoclinic to that rest state, with speed in
(18.731888247880483540468313433296243876955750772, 18.731888247880483540468313433296243876955750776) m/s. The
speed differs from the zero-current case (18.7321608...) by 2.7e-4 m/s, and Hodgkin and Huxley's hand value is
18.8 m/s. The same limits apply as in 4.5, and the same review status.

### 4.7 Result at 6.3 C with the printed leak potential (2026-09-27)

The same programs, with `HH_EL=10.613` and T = 6.3 C (phi = 1), one stage at a time:

- numerical centre K* = 4.51063243827085102104174385842888070411449431302344897921140... /ms. The first run
  (tolerance scale 1) converged to a K* that was wrong by about 5e-59: the local error budget of `hp_pulse.py` assumes
  the growth rate at 18.5 C, and at 6.3 C (lambda_u = 4.974 against 10.892, over a pulse more than twice as long) it
  is too loose. The first interval run with it missed the pulse (zeta_1 = -86 at T_enter). A second run at scale 1e-8,
  started from the converged state with new step sequences, moved K* by 4.8e-59; with it every stage passed. The
  scale-1 result is kept as `data/hp_pulse_6.3_El10.613_tol1.json`;
- `setup`: lambda_u in [4.97403036032071991327233381098 +/- 2.9e-30]; Lemma B at r_B = 1e-32; transversality; the
  block (rho = 0.6, r = 0.63) on 3590 + 1374 cells, and its negative controls;
- `interval` (K1 = K* - 1.4e-61 to K2 = K* + 1.4e-61, delta rounded to binary): at T_enter = 36.125 ms, zeta_1 in
  [-0.273, 0.273], |zeta_s| <= 0.4563 < 0.6, in int B0, max u > 102.98 mV (1237 s);
- `K1`, `K2`: in K- at 36.2578125 ms and in K+ at 36.234375 ms, the paths in int B0 (1279 s, 1293 s);
- `neg-shift` (the K interval moved by 40 half-widths): zeta_1 about 10 at T_enter, outside B0: fails (1276 s);
- `neg-model` (alpha_m times 1 + 1e-12 (u - u*)^2): the whole set escapes below u = -60 mV at 17.20 ms, after the
  spike: fails (1298 s);
- `hh_block_check_iv.py`: passes (1447 + 974 cells) and rejects the enlarged block.

The model control was first run with the factor 1 + 1e-12 u^2, as at 18.5 C with the zero-current E_l. With the
printed E_l rest is at u* = 0.0036 mV, not 0, so that factor changes alpha_m at rest by a factor 1 + 1.3e-17 and moves the equilibrium off the
enclosed y*, while Lemmas A and B are those of the unperturbed rest; the set then left along the unstable direction long before the upstroke (u <
-60 mV at 8.90 ms at 6.3 C, 4.10 ms at 18.5 C). That still failed, as it must, but for a different reason than
intended, so on 2026-09-27 the factor was centred at the enclosed rest value, which leaves rest and its linearization
unchanged; both controls were rerun from scratch (18.5 C: the set escapes below u = -60 mV at 6.72 ms, 602 s, like
the zero-current control at 6.73 ms; 6.3 C: at 17.20 ms, 1298 s). The summaries now print outward-rounded decimal
bounds of the speed with enough digits to separate the ends.

**Theorem (computer-assisted), 6.3 C.** With T = 6.3 C, the 1952 rates and constants and E_l = 10.613 mV, for some K*
in (K1, K2), K1 = 4.51063243827085102104174385842888070411449431302344897921140063822623..., K2 - K1 = 2.8e-61 (the
exact binary fractions of `data/pulse_proof_6.3_El10.613_config.json`), the travelling-wave system has a pulse,
homoclinic to rest, leaving it along the branch on which u increases, with max u > 102.98 mV and speed in
(12.313756720162298508179797283771499327244899734708115548799408270,
12.313756720162298508179797283771499327244899734708115548799408655) m/s for the fibre constants of p. 528. Same limits
and status as 4.5.

**Correction (2026-09-28).** The speed and the K1 prefix in the paragraph above are the run at the float 6.3 C, where the temperature factor was 1 - 1.95e-17 instead of the printed temperature. They are not the result. The printed 6.3 C pulse is release 1.0.0 of ChaseHendrick/hh-pulse: K1 begins 4.510632438270851083403265145734817151524748679704964534920325170959260, and the speed lies in (12.313756720162298593301408536747323623683947514532131559882457804, 12.313756720162298593301408536747323623683947514532131559882458189) m/s.

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

**Renamed on 2026-09-27.** `prove_pulse.py` and `block_check_iv.py` are now `hh_prove_pulse.py` and
`hh_block_check_iv.py`: a release attaches the papers' programs under their file names, and `nf-pulse/code`
has different files with the old names. This report uses the new names throughout, also where it records runs made
before the rename.

**Moved on 2026-09-27.** The programs of the closing step and the modules they share (`hhseries.py`, `hhjet.py`,
`hhjet6.py`, `hhwave.py`, `certify_rest_wave.py`, `lohner6.py`, `block0.py`, `hp_pulse.py`, `hh_prove_pulse.py`,
`hh_block_check_iv.py`, `test_lohner6.py`, `pulse_bvp.py`), with the certificates of the three proofs of 4.5-4.7 and their
inputs, are now in `hh-pulse/code/` and `hh-pulse/data/`, the folder of the paper and of its companion
repository; `hh-pulse/code/run.sh` reruns them. The commands below that use those programs run there; the
other programs stay here and import the moved modules from there. Files named below without a folder are in one of
the two places.

```
cd work/traveling-wave/code          # from the paper's folder
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

# the closing step (Section 4.4): about 1.5 hours of CPU in all at 18.5 C, two processes at a time
python3 test_lohner6.py              # tests of the six-variable jets and integrator, with a negative control
python3 hp_pulse.py 18.5 10.5        # numerical: K* to about 58 digits (about 15 minutes) -> data/hp_pulse_18.5.json
python3 hp_pulse.py 18.5 10.5 1e-6   # the same with a tolerance 1e6 times smaller (discretization check)
python3 block0.py 18.5               # the closing block: creates data/closing_block_18.5.json if absent, checks it
python3 hh_prove_pulse.py 18.5 config 1.5e-45 1e-25 13.625 1e-16 1e-70   # K1, K2, r_B, T_enter, tolerances
python3 hh_prove_pulse.py 18.5 setup    # rigorous: (H1), (H2), (H2'), (H3) and their negative controls
python3 hh_prove_pulse.py 18.5 interval # rigorous: (H4)
python3 hh_prove_pulse.py 18.5 K1       # rigorous: (H5) at K1
python3 hh_prove_pulse.py 18.5 K2       # rigorous: (H5) at K2
python3 hh_prove_pulse.py 18.5 neg-shift   # negative control: a K interval without the pulse must fail
python3 hh_prove_pulse.py 18.5 neg-model   # negative control: alpha_m (1 + 1e-12 u^2) must fail
python3 hh_prove_pulse.py 18.5 summary  # collects the verdicts -> data/pulse_proof_18.5_summary.txt
python3 hh_block_check_iv.py 18.5       # independent re-check of (H3) in mpmath interval arithmetic
```

The rigorous programs exit with status 0 only if every check, including the negative controls, passes.

## 7. Files

**Moved on 2026-09-27.** The programs of the closing step and the modules they share (`hhseries.py`, `hhjet.py`,
`hhjet6.py`, `hhwave.py`, `certify_rest_wave.py`, `lohner6.py`, `block0.py`, `hp_pulse.py`, `hh_prove_pulse.py`,
`hh_block_check_iv.py`, `test_lohner6.py`, `pulse_bvp.py`), with the certificates of the three proofs of 4.5-4.7 and their
inputs, are now in `hh-pulse/code/` and `hh-pulse/data/`, the folder of the paper and of its companion
repository; `hh-pulse/code/run.sh` reruns them. The commands below that use those programs run there; the
other programs stay here and import the moved modules from there. Files named below without a folder are in one of
the two places.

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
| `code/hhjet6.py` | rigorous | jets in the six variables (y, K), K' = 0, with growing Picard truncation |
| `code/lohner6.py` | rigorous | C^0 Lohner integrator in (y, K); refined a priori box, remainder over subintervals, path enclosures |
| `code/block0.py` | rigorous | the closing block B0 (cone and entrance conditions on a cover by cells, interval Cholesky) |
| `code/hh_block_check_iv.py` | rigorous | an independent re-check of B0 (mpmath.iv, hand-derived Jacobian, rational M^-1) |
| `code/hh_prove_pulse.py` | rigorous | the closing step: stages setup, interval, K1, K2, the negative controls and the summary |
| `code/hp_pulse.py` | numerical | K* in high precision by multiple shooting (to centre [K1, K2]) |
| `code/test_lohner6.py` | tests | jets against hhjet.py and finite differences; an enclosure against an independent solution |
| `data/closing_block_18.5.json` | data | the block: T (exact hex floats), weights, rho, r |
| `data/pulse_proof_18.5_*.json`, `*_summary.txt` | certificates | the configuration and the verdict of every stage |
| `prior-art-log.md` | literature | the full search log and quotations |

A line for RESEARCH.md (not added here, since this work is confined to this folder): "2026-09-26, Hodgkin-Huxley
propagated action potential at the 1952 parameters: open as far as reached (Hastings 1976 p. 230 and Carpenter 1979
p. 336 self-report: artificial small parameters); see this report. Re-search: no,
except to read Hastings pp. 231-257, Carpenter 1977 and Foote-Chen 1981."

## 8. Plans (2026-09-27): a temperature interval, and stability

These are plans with estimates; nothing in this section is proved.

### 8.1 A branch of pulses for every T in an interval (plan and cost; not run)

**What the present method needs.** The proof tunes K to about 45 digits (18.5 C) or 61 digits (6.3 C), because
d zeta_1/dK at T_enter is 2.2e44 (18.5 C) and 1.7e60 (6.3 C). Carrying T as an interval parameter in the same C^0
Lohner scheme would put the T-variation of the orbit (of order |T - T_c| mV per C) into a set that the scheme
represents only to first order, so the second-order error (|Delta T| |dy/dT|)^2 |D^2 f| is amplified like
d zeta_1 / dK: a T-piece would have to be about 1e-23 C wide at 18.5 C. Following the curve K*(T) with a polynomial
K_c(T) does not help at first order, for the same reason. **Estimate: infeasible** (about 1e24 pieces).

**Routes that could work, with costs.**
- (a) Taylor models in T (the state carried as a polynomial of degree d in T - T_c with a remainder), with
  K = K_c(T) + s. Covering [6.3, 18.5] with pieces of 0.1 to 1 C needs d of about 40 to 50 (error
  (w/R_T)^(d+1) <= 1e-46, R_T of order 10 C, the distance to the fold near 33 C). The jets and the Lohner linear algebra
  then work on polynomials of 50 terms instead of numbers: about 10^3 times the cost of one run, **about two weeks of
  CPU per piece in this Python code**, and 12 to 120 pieces. Not feasible here; conceivable in C++ (CAPD's Taylor
  models, or a C port of the jets).
- (b) Covering relations (Zgliczynski and Gidea) along the orbit with h-sets whose centres move linearly with T,
  and the block B0 at the end. The K precision is then needed only up to the first h-set after the spike, and the
  T-width of a piece is limited by the second-order T-variation of the orbit against the h-set size (about 1e-3):
  |Delta T| of about 0.01 to 0.03 C, so 400 to 1200 pieces for [6.3, 18.5]. Each piece is a chain of about 100
  covering checks at 128 bits, estimated at 2 to 10 CPU minutes, so **15 to 200 CPU hours**, after about a week of new
  code (h-sets from the numerical monodromy, cone conditions for the entry directions, the argument with the block).
  Chance of success in that time: about 50 per cent (the spike, where several directions expand at once, is the risk).
- (c) Cheap and already possible: the present proof at a grid of temperatures (each piece is one run, 1x to 2x the
  18.5 C cost). It gives pulses at each grid temperature, not a branch.

**Design of route (b), as built on 2026-09-27 (`code/tstrip.py`).** The temperature enters every rate only through
phi = 3^((T - 6.3)/10), which multiplies the three gating right-hand sides; rest does not depend on T. So a
T-interval is a phi-interval, and phi is carried as a seventh variable (phi' = 0) exactly as K is carried now
(`hhjet6.py` takes (u, w, m, n, h, K, phi); `lohner6.py` handles any number of constant parameters). The speed is
tied to the temperature by K = K_c + a (phi - phi_c) + s, with a a numerical slope of K*(phi) and s in [-sigma, sigma].

*Sets.* Along a numerical pulse at phi_c (the multiple-shooting nodes of `hp_pulse.py`) we fix stage times
0 = t_0 < t_1 < ... < t_m = T_enter and **windows** W_i = { c_i + F_i (e, v) + (phi - phi_c) g_i + s h_i :
|e| <= w_i, |v_j| <= s_ij, phi in [phi_lo, phi_hi], |s| <= sigma }, where c_i is the pulse point, F_i a frame whose first
column is the image of the unstable direction (QR of the numerical monodromy), e is the **exit** coordinate and v the
four **entry** coordinates, and g_i, h_i are shears with zero exit component. W_0 is the exit set of Lemma B (e fixed
at z1 = r_B) times the parameter box. The last target is the closing block B0.

*Checks* (ball arithmetic, one Lohner run of the whole window per stage, the parameters in the set):
 (S) the image of W_i at t_{i+1} has its entry coordinates strictly inside those of W_{i+1};
 (X) the image of the face e = +w_i has e > 0 and that of e = -w_i has e < 0 in W_{i+1}'s coordinates
     (the faces come from the same run, since the Lohner set holds for each value of its linear coordinate);
 (F) the image of W_{m-1} lies in the interior of B0;
 (P) for s = +sigma (resp. -sigma) and every phi, the orbit from the exit set leaves some window through its + (resp.
     -) exit face, and never through the other one before that;
 and Lemmas A and B, the transversality and the block conditions of B0, all for the whole phi and K ranges.
The widths s_{i+1}, the shears and w_{i+1} are set from the stage-i image itself (the windows are free choices, made
before the containments are checked), so (S) holds by construction and (X) is the real condition: expansion in the
exit direction must beat what the parameters and the nonlinearity add in one stage.

*Theorem it proves.* For every T in [T_lo, T_hi] there are K*(T) in K_c + a (phi(T) - phi_c) + (-sigma, sigma) and a
pulse at (T, K*(T)). *Argument.* Fix T. Let S+ (S-) be the set of s such that the orbit leaves the windows, at the
first stage where it is outside, through the + (-) exit face, or, having passed all windows, enters K+ (K-) in int
B0. By (X) an orbit on an exit face at stage i is strictly beyond the same side at stage i+1, so the first exit is
robust and S+ and S- are open; they are disjoint; (P) makes them non-empty; so some s is in neither. By (S) its orbit
is in every window, then in int B0 by (F), and the B0 argument of 4.4 shows that it tends to rest. The K precision
needed is now only sigma, not 1e-45, because the exit direction is re-cut at every window.

*Reused:* `hhjet6.py` (with phi as a variable), `lohner6.py` (any number of parameters), Lemmas A and B and the
transversality of `certify_rest_wave.py` / `hh_prove_pulse.py` with phi as a ball, `block0.py` (cone and entrance with
phi as a ball), `hp_pulse.py` for the reference pulse. *New:* the windows, the stage loop with checkpoints, the exit-face
and entry checks, the endpoint runs (P), the final containment (F), and the driver over subintervals of [T_lo, T_hi].

Per the owner's rule (run only if a piece costs at most about twice the 18.5 C run), none of (a) or (b) was run.
Recommendation: (c) now for a few temperatures if wanted; (b) as a separate project.

### 8.2 Spectral stability of the pulse (plan and cost; not run)

**Target (computer-assisted).** The linearization L of the cable equation about the pulse, in the moving frame, has
no spectrum in Re lambda >= 0 except the eigenvalue 0, which is algebraically simple, and the essential spectrum lies
in Re lambda <= -delta for an explicit delta > 0. Nonlinear (orbital, exponential) stability would then be a remark
citing Evans III for the criterion and resting on Evans I, unread, for the passage from the linear to the nonlinear
system.

**What Evans III says (read from the owner's scan, pp. 577-580).** Evans, "Nerve axon equations: III Stability of
the nerve impulse", Indiana Univ. Math. J. 22 (1972/73) 577-593. The system is (1): W^0_t = W^0_xx + f^0(W),
W^i_t = f^i(W), i = 1..n, "where f^0, ..., f^n are twice continuously differentiable functions", with rest at W = 0 and
a pulse phi(x - vt) (scaled to v = 1). "We make the critical assumption" (p. 579) that the linearization about rest,
W_t = diag(1, 0, ..., 0) W_yy + W_y + A W, is exponentially stable in the sup norm. Theorem 1 (p. 579): the
linearization (3) about phi is exponentially stable at d phi/dy if and only if every lambda != 0 for which the
eigenvalue equation (4) has a bounded solution has Re lambda < 0, and (6) (the generalized-eigenvector equation at
lambda = 0) has no bounded solution. Theorem 2 (p. 580): (6) has a bounded solution if and only if
int phi^0'(y) gamma^0(y) dy = 0, gamma the bounded solution of the adjoint equation (5) at lambda = 0. Paper I [3] is
cited (p. 577) for the passage from exponential stability of the linearization to stability of the impulse under small
perturbations (convergence to a translate). **Check against HH:** the cable equation with the gates is of the form
(1) after scaling x by sqrt(a / (2 R_2 C_M)) (n = 3, only V diffuses); the 1952 rate functions are real analytic
(Psi has a removable singularity), so f is C^infinity; rest is moved to W = 0 by a shift. The "critical assumption"
is the essential-spectrum condition: every eigenvalue of A - k^2 e_1 e_1^T (A the Jacobian of the space-clamped
equations at rest, J = 0) has Re <= -delta for all real k. This is a finite check (Routh-Hurwitz with coefficients
polynomial in k^2, plus the limit k -> infinity), which ball arithmetic can do in seconds.

**The method precedent (Arioli and Koch, Nonlinear Anal. 113 (2015) 51-70; the owner's copy of the preprint,
read in the parts cited).** Evans function Delta(z) = v_z(y)^T u_z(y), with u_z the solution on the one-dimensional
side and v_z the adjoint solution, analytic, with zeros exactly at the eigenvalues, counted with multiplicity (their
Theorem 4.6, from Evans IV); the essential spectrum excluded from a half-plane H_omega by the spectrum of the
linearization at rest; large eigenvalues excluded by estimates (their Propositions 4.1 and 4.2); the count in a
rectangle R minus a small disk D by the argument principle, with a computer-assisted check that Delta has a simple zero
at 0 in D and takes no values in [0, infinity) on the boundary of R \ D (their Lemma 4.7); and linear stability to
nonlinear stability by their Lemma 3.1, "proved in [4]" (Evans I) and re-proved by them. **What carries over:** the
whole structure (Evans function, argument principle, the essential spectrum from rest, linear to nonlinear through
Evans I or their Lemma 3.1). In HH the one-dimensional side is the unstable one (W^u of rest), the mirror image of
FitzHugh-Nagumo in their scaling, which is immaterial. **What does not:** their pulse is enclosed for all y by
analytic parametrizations of the manifolds at both ends, glued by a validated integration; our pulse is enclosed only
up to T_enter and is known afterwards only to stay in B0 and tend to rest. Their field is polynomial in two
components; ours has three gates and exponential rates, and the eigenvalue problem is five-dimensional.

**Plan.**
1. (E) Essential spectrum: Routh-Hurwitz in ball arithmetic for all k^2 in [0, infinity) (about a day with the
   written argument; seconds of CPU).
2. (L) No eigenvalues with Re lambda >= 0 and |lambda| > R: an energy estimate for the eigenvalue problem, as in
   `nf-pulse/ext/stability/large_lambda.py` (about a day).
3. (T) The tail: a rigorous enclosure of the pulse after T_enter. It lies in B0 intersected with {L <= 0}, and by the
   entrance condition its stable part decays at a certified exponential rate. That bounds Df(pulse) - Df(rest)
   by C e^{-c (y - T_enter)}, but only with a relative uncertainty of order one. The Evans function needs better. So
   either (T1) a validated parametrization of the four-dimensional local stable manifold of rest, over a ball large
   enough to contain the pulse at T_enter (order about 10 in four variables, about 10^4 coefficients per component);
   or (T2) a complexified cone condition on B0 for the lambda-dependent linear system. (T2) confines the stable
   subspace to a cone for every lambda in the region, which suffices to exclude eigenvalues wherever the
   unstable-side solution u^-(T_enter; lambda) lies strictly in the unstable cone, but not near lambda = 0.
   **This is the main risk.**
4. (W) The count: u^-(T_enter; lambda) from the stored enclosures of the interval run (the pulse for all K in
   [K1, K2]) with the variational equation integrated alongside, lambda carried as a small complex ball, on a contour
   of about 50 to 200 cells (Taylor in lambda to reduce the count); the adjoint from the tail by (T1) or (T2); the
   argument principle, or Arioli and Koch's device of showing that Delta avoids a ray.
5. (Z) Simplicity of 0: by Evans III Theorem 2, int phi^0' gamma^0 != 0, equivalently (a standard Melnikov
   computation, to be written) the derivative of the splitting with respect to the speed is non-zero. The interval
   run already carries d zeta_1/dK; its rigorous enclosure (about 2.2e44, bounded away from 0) would give it.

**Cost.** Development 6 to 10 working days (T1 or T2 is half of it); CPU 1 to 3 days in this Python code (step 4
dominates: each lambda cell is one or two integrations of the pulse with a 10-dimensional linear system alongside,
20 to 60 minutes each). Chance of success along T2 in that time: about 40 per cent; T1 is more certain but slower.
Sources the owner is asked to obtain: Evans I and IV (for the linear-to-nonlinear step and the Evans function
theorem); Evans III is in hand. No long run until the owner has seen this plan.

### 8.3 Stability of the pulse at 18.5 C: the design (2026-09-27, before the long computations)

This section replaces the plan of 8.2 where they differ. It was written after reading Evans III in full (the owner's
scan, pp. 577-593), Arioli and Koch (2015) Sections 3 and 4 (the owner's copy of the preprint), the neural-field
precedent `nf-pulse/ext/stability/`, and after a few floating-point experiments (labelled **numerical**
below; their script is `hh-pulse/code/stab_num.py`). Nothing in this section is proved yet.

**Setting.** The cable equation in u = -V, with x scaled so that the diffusion coefficient a/(2 R_2 C_M) becomes 1, is
u_t = u_xx - I(u, m, n, h), g_t = phi G(u, g) for the gates g = (m, n, h). In the moving coordinate
xi = t - x/theta (the time-like variable of the wave ODE, in ms) a perturbation e^{lambda t} (p, q)(xi) of the pulse
(U, g*)(xi) solves

    (1/K) p'' - p' - a(xi) p - b(xi) . q = lambda p,      -q' + c(xi) p - diag(kappa(xi)) q = lambda q,

with a = I_u, b = (I_m, I_n, I_h), c_i = phi dG_i/du and kappa_i = phi (alpha_i + beta_i), all evaluated along the
pulse. In first-order form, Y = (p, p', q) in C^5,

    Y' = A(xi, lambda) Y,     A(xi, lambda) = Df(x(xi), K) + lambda E,     E = K e_2 e_1^T - (e_3 e_3^T + e_4 e_4^T + e_5 e_5^T),

where f is the field of the wave ODE and x(xi) the pulse. At lambda = 0 this is the variational equation, and x' is a
solution. Evans III works in coordinates with speed 1: his y is -K xi (up to a shift) and his eigenvalue is lambda/K,
so the spectral statements below translate one to one. His linearization at rest is our A_inf(lambda) =
Df(y*, K) + lambda E.

**Theorem S (to be proved; computer-assisted).** T = 18.5 C, E_l = 10.613 mV, and any pulse of Theorem 1 of the
paper (K* in (K1, K2), leaving rest through the exit set E and staying in B0 from T_enter on). Let L be the
linearization about the pulse in the moving frame on the bounded uniformly continuous functions (Evans's X). Then
 (i) the essential spectrum (Evans's Sigma(T)) lies in Re lambda <= -delta, delta = 0.448;
 (ii) the only lambda with Re lambda >= -eta, eta = 1/10, for which the eigenvalue equation has a bounded solution is
      lambda = 0;
 (iii) lambda = 0 is geometrically and algebraically simple: its bounded solutions are the multiples of x', and the
      generalized eigenvector equation (Evans III, eq. (6)) has no bounded solution.
Hence (Evans III, Theorem 1) the linearization is exponentially stable at the pulse derivative: there are P, alpha > 0
such that every solution U of the linearized equation satisfies |U(t) - h x'|_sup <= P |U(0)|_sup e^{-alpha t} for
some h with |h| <= P |U(0)|_sup. Nonlinear stability is the subject of the last paragraph of this section.

**Computed hypotheses (ball arithmetic, python-flint 0.9.0; K in [K1, K2] and rest y* enclosed throughout).**
- (E) For every s >= 0 the space-clamped Jacobian at rest minus s e_1 e_1^T (4 x 4: u and the gates) has all
  eigenvalues in Re <= -delta: Routh-Hurwitz inequalities for the characteristic polynomial shifted by delta, on a
  subdivision of s in [0, S], and Gershgorin discs after a diagonal scaling for s >= S. (Numerical: the supremum of
  the real parts is -0.448606, the h gate rate phi (alpha_h + beta_h) at rest, approached as s -> infinity; at s = 0
  it is -0.46272.) Negative control: delta = 0.449 must fail.
- (R) A record of the pulse: the interval run of the existence proof (all K in [K1, K2], from the exit set to
  T_enter) is rerun with the same program and the per-step data kept: the hull of the Lohner set at each step start
  and the a priori enclosure W_j of the step. Together with the Lemma B box (xi <= 0) and B0 (xi >= T_enter), these
  boxes contain the whole orbit of every pulse of Theorem 1. Also checked here: the path enclosures from a time
  T_c (about T_enter - 0.3 ms, the first step start from which they all lie in int B0) to T_enter lie in int B0.
- (L1) No eigenvalue with Re lambda > Lambda: with a fixed diagonal scaling of the gates the energy identity gives
  Re lambda ||Y||^2 = -(1/K)||p'||^2 + <S Y, Y>, S the symmetric part of the zeroth-order matrix; so Re lambda <=
  sup lambda_max(S) over the boxes of (R). Interval Cholesky of Lambda I - S on every box. (Numerical, on the float
  profile: Lambda = 13.54 with scalings (84, 195, 193); the record's boxes will give a slightly larger number.)
  Negative control: Lambda = 12 must fail.
- (L2a) No eigenvalue with Omega <= |Im lambda| <= Omega_big, -eta <= Re lambda <= Lambda: a pointwise complex cone
  condition along the whole orbit. In coordinates Z = M Y (M the inverse eigenbasis of A_inf(lambda_c) with
  diagonal weights, fixed on a lambda-cell), D M A M^-1 + (D M A M^-1)^* is positive definite (D = diag(1, -1, -1,
  -1, -1)) for every lambda in the cell and every state in the boxes of (R). Then Q = |Z_1|^2 - |Z_s|^2 increases
  along every solution; the solution phi^- that decays at -infinity starts in Q > 0 (its limit direction, the
  unstable eigenvector of A_inf, has Q > 0 by the complex form of Lemma 0 of the paper), so |Z_1| stays bounded
  below and phi^- cannot decay at +infinity. (Numerical: with optimized weights the condition holds along the float
  profile for Im lambda = 100, 150, 200, ..., 1000 (smallest eigenvalue 0.89, the h rate) and at -0.1 + 200 i; it
  fails at 50 i.) Negative control: a cell at 40 i must fail.
- (L2b) The same for |Im lambda| >= Omega_big, written: in the coordinates z_+ = (w - nu_- p)/(2R),
  z_- = (nu_+ p - w)/(2R), q~_i = w_i q_i (nu_+- = K/2 +- R, R^2 = K^2/4 + K(lambda + a(y*)), w_i^2 = K B_i/(2|R| C_i)),
  the Schur complement of the cone matrix is positive if
  Re R > K/2 + (K/|R|) (sup |Delta a| + sum_i B_i C_i/(kappa_i^lo - eta)), with B_i = sup|b_i|, C_i = sup|c_i|,
  kappa_i^lo = inf kappa_i over (R); the left side grows and the right side falls with |Im lambda| (Re R >=
  (K |Im lambda|/2)^(1/2), |R| >= (K |Im lambda|)^(1/2)), so one interval check at Omega_big covers all larger values.
  (Numerical: Omega_big about 3000 with these crude sup bounds.)
- (C) For lambda-cells covering [-eta, Lambda] x [0, Omega]: the complex cone condition of (L2a) on B0 (a cover by
  cells, as in `block0.py`) and on the path enclosures over [T_c, T_enter], for every lambda in the cell; and the
  unstable eigenvector v_u(lambda) of A_inf (first component 1) lies in the open cone |Z_1| > |Z_s|. (Numerical: with
  optimized weights the smallest eigenvalue of the cone matrix on B0 is 0.49 to 0.70 along Re lambda = -0.1 for
  Im lambda from 0 to 100, and larger to the right.) Negative control: B0 enlarged 1.5 times must fail somewhere.
- (W) The winding number of the Evans function on the upper half of the boundary of the box
  [-eta, Lambda] x [-Omega, Omega] (the lower half by the symmetry below) is 1. Enclosures, per contour segment, of
    D^(lambda) = (Z_1 - g . Z_s) / ((M v_u)_1 - (M v_u)_s . g),   Z = M phi^-(T_c; lambda),   |g| <= 1,
  phi^- from the left-tail enclosure at xi = 0 (Gronwall: the pulse is within about 1e-25 of rest for xi <= 0)
  integrated along the record by a Lohner-type method for the linear system with a second-order Taylor model in
  lambda (the structure of `nf-pulse/ext/stability/evans_rig.py`, generalized to 5 x 5 with the Taylor series
  of Df along the pulse from `hhjet6.py`). Each segment's enclosure must lie in an open half-plane through 0; the
  argument changes are then read from thin enclosures at the segment ends. Negative controls: the same code on the
  circle |lambda| = 1/20 must give winding 1 (it sees the translation eigenvalue), and the cone exclusion
  "phi^-(T_c) in the open cone Q > 0" must fail on a cell containing 0.

**Written (not machine-checked) parts.** (a) Lemma R: from (E), the rest linearization is exponentially stable in the
sup norm, which is Evans's "critical assumption" (Evans III p. 579). Evans derives this from Evans II, which we do not
have, so it is proved here: the solution operator is e^{a t} (heat kernel) on u plus e^{tB} on the gates plus a
convolution whose symbol is a rank-one resolvent integral, which lies in H^1 in the Fourier variable with norm
<= C e^{-alpha t}, hence has an L^1 kernel. (b) The translation between Evans's equations (4)-(6) and the
first-order system above. (c) For Re lambda > -delta, A_inf(lambda) has one eigenvalue with positive real part and four
with negative real part (from (E) and lambda = 0), so bounded solutions of the eigenvalue equation decay at both
ends, the solutions decaying at -infinity form a line (spanned by phi^-), and those decaying at +infinity a
4-dimensional space S(xi). (d) The dual cone: if the cone condition holds on the region visited by the pulse after
T_c, then S(T_c) lies in the open cone Q < 0, so the adjoint solution psi^+ that annihilates S (the Evans adjoint) is,
in the dual coordinates, a multiple of (1, -g) with |g| < 1. (e) With the natural Evans function D(lambda) =
psi^+(xi)^T phi^-(xi) (psi^+ ~ e^{-nu xi} w at +infinity), D^ = D / c with c(lambda) = v_u(lambda)^T psi^+(T_c) analytic
and, by (C) and (d), zero-free in the box; D^ has exactly the zeros of D there, with multiplicities; it is the
quotient above, and D^(conj lambda) = conj D^(lambda). (f) Every eigenvalue in the box is a zero of D (the easy
direction; no Evans-function multiplicity theorem is used). D(0) = 0 because x' decays at both ends. (g) Winding 1
then says that 0 is the only zero of D in the box and that D'(0) is not 0; D'(0) = integral psi_0^T E x' (as in
`nf-pulse/ext/stability/REPORT.md`, Part 3), so a bounded solution Y_1 of Y_1' = A(xi, 0) Y_1 + E x' (the
first-order form of Evans's eq. (6)) would give (psi_0^T Y_1)' = psi_0^T E x' with vanishing boundary terms, a
contradiction: 0 is algebraically simple in Evans's sense. (h) Evans III, Theorem 1, whose hypotheses (f^i of class
C^2, rest at 0 after a shift, the pulse tends to rest, the critical assumption) are then all checked, gives the
exponential linear stability. Theorem 2 of Evans III is the same condition written as an integral of the voltage
components; we note it but do not need it.

**T1 or T2: T2, for a reason 8.2 missed.** Section 8.2 feared that a cone that only confines the stable subspace of the
tail (T2) cannot resolve lambda near 0, where phi^- is close to x', which lies in that subspace. That is right for
the cone exclusion (phi^- in the unstable cone), and wrong for the Evans function on a contour that stays away from 0.
The uncertainty that the cone leaves in psi^+ (the unknown g, |g| < 1) multiplies only the stable part Z_s of
phi^-(T_c), while the pairing is carried by the unstable part Z_1. At T_c, about 8 ms after the upstroke, the stable
part of phi^-(T_c; lambda) is smaller than its unstable part by a factor of order e^{-(10.9 + 0.46) x 8}, about
1e-38, except within about 1e-38 of an eigenvalue (numerical: with the float Evans function normalized at both ends,
|D| = 14620 |lambda| near 0, while the stable part of phi^- at T_c is about 1e-38 in the same normalization). So on a
contour at distance eta = 0.1 from 0, the relative error that the tail leaves in D^ is negligible, and what remains
is the width of the pulse enclosure near T_c (the orbits of the K interval spread by about 0.02 in zeta_1 at
T_enter - 0.3 ms), which enters as a relative error of order 1e-3. T1 (a 4-dimensional validated stable manifold,
about 1e4 coefficients per component) and a narrower K interval are therefore not needed.

**The contour.** The upper half of the boundary of [-eta, Lambda] x [-Omega, Omega] with eta = 0.1, Lambda from (L1)
(about 14), Omega from (L2a) (about 100), from Lambda up, across, and down to -eta: about 214 units, cut into
segments whose length adapts to the variation of D^ (numerical: the phase of phi^- e^{-nu_c xi} at T_c moves by
about 12 radians per unit of lambda near 0 and by about 2 near 100 i). **Numerical check of the target:** the float
Evans function (collocation profile, DOP853, matching point independence to 1e-7) has winding number 1 on this box
with 110 in place of Omega (adaptive steps, arg jumps below 0.3; min |D| on the contour 12.3), and winding 1 on
[-0.3, 5] x [-5, 5]: 0 is the only eigenvalue there, numerically. D(0) = 1e-5, D'(0) = 1.46e4 in that normalization.

**Cost and chance.** (E), (L1), (L2b): minutes. (R): one rerun of the interval stage (about 10 minutes) plus the
Taylor series of Df on each step (about 10 minutes). (C): about 1500 lambda-cells of 1 x 1 near the axis (fewer and
larger away from it), each a cover of B0 by about 1000 cells: 1 to 2 hours. (L2a): about 50 cells, minutes. (W):
about 300 to 400 segments at 10 to 30 s each (5 x 5 complex step matrices, order about 16, 128 bits, about 1000 steps
to T_c): 1 to 3 hours. At most two processes. Development: about a day of code, most of it in (W). Chance that
(i)-(iii) and the linear stability are proved at 18.5 C in this session: about 60 per cent. Risks: the width of the
record near T_c (the spread of the K interval) may inflate the enclosures of D^; (L1) and (L2a) on the record's a
priori boxes (fatter than the float profile at the upstroke) may give larger Lambda and Omega; the number of segments.
6.3 C afterwards, with the same programs, if 18.5 C succeeds.

**Nonlinear stability.** Arioli and Koch's Lemma 3.1 (their own proof of the step Evans I makes, pp. 10-12 of the
preprint) uses: the linearized semigroup on the bounded uniformly continuous functions, strongly continuous; its
exponential stability at phi' with a bounded linear functional; the Duhamel formula; a nonlinearity Q with Q(0) = 0
and DQ(0) = 0 that is locally Lipschitz with constant O(|v|) (theirs is "a polynomial with a zero of order 2"); and
translation invariance. For Hodgkin-Huxley the current I is a polynomial in (u, m, n, h) and the gate right-hand sides
are real analytic, so the Nemytskii map has those properties on bounded sets; the heat and translation semigroups are
strongly continuous on that space and the rest of L is bounded. Whether their proof then carries over verbatim, with
three non-diffusing gates in place of one, is to be checked line by line after (i)-(iii); if any step does not
carry over, the theorem will state linear exponential stability and leave nonlinear stability open.

**Prior articles (2026-09-27).** arXiv full-text search '"Hodgkin-Huxley" "Evans function"' (0 hits) and
'"Hodgkin-Huxley" stability "traveling wave"' (1 hit, not relevant); zbMATH Open API '"Hodgkin-Huxley" & stability &
(pulse | travelling | traveling | impulse)' (30 hits): the stability theory of Evans (1972-75), Evans and Feroe, Math.
Biosci. 37 (1977) 23-50 (title and venue only; from later citations a numerical stability computation, not read),
Ikeda, Mimura and Tsujikawa (1989, the epsilon-modified system), Rinzel (1975, neutrally stable waves), and
Rottmann-Matthes (2012, nonlinear stability for parabolic-hyperbolic systems in general; not read). Two web searches
found only this project's pull requests. No proof of the stability of the unmodified pulse was found, which is
expected since its existence was not proved before Theorem 1.
