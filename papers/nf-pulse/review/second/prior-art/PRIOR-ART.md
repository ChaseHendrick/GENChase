# Prior-art check: a travelling pulse of the Pinto-Ermentrout field with a smooth firing rate at fixed eps

Date: 2026-09-26. Scope: the claim in `papers/nf-pulse/README.md`, a computer-assisted proof of a fast travelling pulse of

    u_t = -u - v + w * S(u),   v_t = eps (u - gamma v),   w(x) = e^(-|x|)/2,
    S(u) = 1/(1 + e^(-beta (u - theta))),   beta = 20, theta = 1/4, eps = 1/10, gamma = 0,

with the speed enclosed in [1.1027477097341592491478677, + 1e-25]. This report adds to the ledger entry
"neural-field travelling pulse with a smooth sigmoid at fixed eps" of the same date, which did not reach the Zhang
papers or Pinto, Jackson and Wayne. No PDF or full text was saved in the repository; downloads went to
`/tmp/claude-0/` only.

## Summary

- The four named papers all use a **Heaviside** firing rate (or, for Sandstede, prove a stability implication and
  do not construct waves). None proves a pulse for a smooth sigmoid. Zhang (2005) works at eps = 0 and
  0 < eps << 1; Pinto, Jackson and Wayne make "no other assumptions about the recovery rate", but with a Heaviside.
  None of the four full texts could be reached; what was read is listed per paper.
- **A new find that must be cited and delimited:** Burlakov, Oleynik and Ponosov, *Mathematics* 13 (2025) 701
  (CC BY, read in full). For the same model with a nonnegative C^1 kernel and a fixed recovery rate
  0 < eps < 1/(sigma + 4) (with sigma = 0: eps < 1/4, which contains 1/10), they claim that a regular Heaviside
  pulse satisfying explicit non-degeneracy conditions persists for "any sufficiently steep firing rate function
  approximating the Heaviside". That is an existence theorem for smooth sigmoids at fixed, non-small eps. It does
  not cover the present claim as stated: their kernel must be C^1 (e^(-|x|)/2 is not), no steepness bound is given
  (so gain 20 is not shown to be "sufficiently steep"), their non-degeneracy conditions are not verified for any
  example in the paper, and the argument has points that need checking (below). The README's framing, which rests
  on Hastings's remark that he knew of no existence proof "which covers all reasonable smooth functions S", must
  cite this paper and say what it does and does not cover.
- No computer-assisted or rigorous-numerics proof of any travelling wave of a neural field was found. The
  computer-assisted proofs of pulses found are for FitzHugh-Nagumo (Arioli and Koch; Matsue; Czechowski and
  Zgliczynski), where eps is small or in (0, eps0].
- Verdict: **the computer-assisted proof at one explicit smooth sigmoid, one explicit (non-C^1) kernel and
  eps = 1/10, with an enclosed speed, is new as far as reached.** The general statement "no existence proof of
  pulses for a smooth firing rate at fixed eps" is **no longer accurate** without the Burlakov-Oleynik-Ponosov
  qualification. Priority over the Zhang papers is supported by two independent zbMATH reviews and by how later
  authors describe them, not by a reading of their full texts.

## The four named papers

### 1. L. Zhang, J. Differential Equations 197 (2004) 162-196

"Existence, uniqueness and exponential stability of traveling wave solutions of some integral differential equations
arising from neuronal networks", doi:10.1016/S0022-0396(03)00170-0, zbMATH 1054.45005.

- Reached: **not the full text.** Unpaywall and Semantic Scholar list the ScienceDirect PDF as bronze open access,
  but ScienceDirect returned HTTP 403 to curl and to WebFetch (the page carries a TDM reservation); CORE returned a
  bot challenge. Crossref and Semantic Scholar carry no abstract (elided by the publisher).
- Read: the zbMATH review (Sen-Zhong Huang). It gives the equation as a **scalar** equation with the recovery frozen:
  "u_t = f(u,w) + alpha \int K(x-y) H(u(y,t) - theta) dy", "H is the Heaviside step function", and "A typical
  example of the function f is f(u,w) = u(1-u)(u-a) - w with 0 < a < 1 and constant w." "Conditions for the
  existence, uniqueness and exponential stability of travelling wave solutions to the above equation are given".
- Model: scalar, fronts (w constant). Firing rate: Heaviside. eps: not present (w constant). Pulse at fixed
  non-small eps with smooth sigmoid: **no**, as far as the review shows.

### 2. L. Zhang, J. Dyn. Differ. Equ. 17 (2005) 489-522

Exact title: "Traveling Waves of a Singularly Perturbed System of Integral-Differential Equations Arising from
Neuronal Networks", doi:10.1007/s10884-005-5404-3, zbMATH 1082.45009.

- Reached: **not the full text.** Unpaywall: closed; Semantic Scholar: closed; Springer served a JavaScript client
  challenge to curl and a login redirect to WebFetch. Crossref and Semantic Scholar carry no abstract.
- Read: the zbMATH review (V. Lakshmikantham). Model as printed there: "du/dt + u + w = alpha \int K(x-y)
  H(u(y,t) - theta) dy + beta \int K(x-y) H(u(y,t) - theta) dy, dw/dt = eps(u - gamma w)." "The main goal is to
  establish the existence and exponential stability of traveling wave solutions of the case eps = 0 and
  0 < eps << 1." "Several types of kernel functions are discussed."
- Model: the Pinto-Ermentrout system with two synaptic terms. Firing rate: Heaviside. eps: 0 or small. Pulse at
  fixed non-small eps with smooth sigmoid: **no**, as far as the review shows.
- Consistent secondary evidence: Burlakov, Oleynik and Ponosov (2025), p. 3, list the Zhang works among results "in
  the Heaviside firing rate case" and state that "no connection between the results obtained for travelling waves
  in neural fields using the continuous and discontinuous formalization of neuronal activation has been presented
  yet". Dyson (arXiv:2511.17328v2, abstract) calls the Heaviside fast pulse for small eps "a long-standing open
  problem" whose proof had not "overcome" the matching difficulties before his paper, which he could hardly write if
  Zhang (2005) had settled even the Heaviside case in the form he treats. (Dyson's bibliography does not list
  Zhang 2004 or 2005, only Zhang 2003, 2007, 2013 and Zhang-Hutt 2014, so this is weak evidence.)
- Other Zhang neural-field papers, from zbMATH reviews (all read via the zbMATH API): DPDE 2 (2005), JPDE 17 (2004),
  Acta Math. Appl. Sin. 20 (2004), DIE 16 (2003), SIADS 6 (2007), JAAC 2 (2012), JAAC 4 (2014), AAA 2014: every
  review that names the firing rate says Heaviside, e.g. JAAC 4 (2014): "we consider a Heaviside transfer
  function". Reviews unavailable ("contents unavailable due to conflicting licenses"): Math. Z. 255 (2007), JJIAM 27
  (2010), Physica D 239 (2010), DCDS 34 (2014), DCDS-B 16 (2011), J. Math. Neurosci. 3 (2013). Not read.

### 3. D. J. Pinto, R. K. Jackson, C. E. Wayne, SIAM J. Appl. Dyn. Syst. 4 (2005) 954-984

doi:10.1137/040613020, zbMATH 1091.45004.

- Reached: **not the full text** (SIAM closed; no preprint found on arXiv or by web search).
- Read: the abstract (Crossref and zbMATH, identical): "A Heaviside step function governs the activation of each
  neuron. We incorporate a relatively slow local recovery variable within each neuron but make no other
  assumptions about the recovery rate." "When neurons have a single stable state, we demonstrate the existence of
  two traveling pulse solutions in a connected network." "Because our existence strategy is not constrained to
  singular limits, we obtain explicit expressions for the Evans function".
- Secondary description, Dyson arXiv:2511.17328v2, Sect. 2.2, p. 7: "They showed that for positive 'bell-shaped'
  kernels, the fast (and slow) parameter pair (a,c) can be solved for when theta is small", and p. 8: "The authors
  in [43] did not track sub and super threshold regions beyond computationally checking, and remarked that for
  some kernel choices, formal solutions fail the threshold requirements."
- Model: Pinto-Ermentrout with a general positive kernel. Firing rate: Heaviside. eps: not assumed small. Pulse at
  fixed non-small eps with smooth sigmoid: **no** (Heaviside).

### 4. B. Sandstede, Int. J. Bifurcation Chaos 17 (2007) 2693-2704

"Evans functions and nonlinear stability of traveling waves in neuronal network models",
doi:10.1142/S0218127407018695, zbMATH 1144.35342. (The DOI S0218127407017732 is a different paper.)

- Reached: **not the full text.** World Scientific closed; ResearchGate 403; the author's publications page
  (dam.brown.edu, now bjornsandstede.com) served a captcha; the Wayback Machine reset the connection.
- Read: the abstract: "We prove here that spectral stability of traveling waves implies their nonlinear stability
  in appropriate function spaces, and compare several recent Evans-function constructions that are useful tools
  when analyzing spectral stability." Secondary: Dyson (p. 26) cites it for "an equivalence between exponential and
  spectral stability"; Burlakov et al. (p. 3) describe it as a study "for the Heaviside neuronal activation case".
- Model: neuronal network integro-differential equations. It is a stability result, not an existence result.
  Pulse existence at fixed eps with smooth sigmoid: **no**, as far as the abstract shows.

## The new find: Burlakov, Oleynik and Ponosov (2025)

E. Burlakov, A. Oleynik, A. Ponosov, "Travelling Waves in Neural Fields with Continuous and Discontinuous Neuronal
Activation", Mathematics 13 (2025) 701, doi:10.3390/math13050701. Read in full (17 pp., CC BY). Found through the
bibliography of Dyson, arXiv:2511.17328v2 (ref. [8]).

- Model (p. 5, eq. (3)): "d_t u = -u + \int omega(x-y) f_beta(u(t,y)) dy - v, (1/eps) d_t v = u - sigma v", the same
  system as ours with sigma = gamma. p. 2: "the assumption 0 < eps << 1 can be specified as 0 < eps < (sigma + 4)^-1".
  p. 7: "the decay sigma of the negative feedback in the neural medium is often neglected ... Our approach allows us
  to omit this restriction."
- Hypotheses (p. 5): "(A1) The connectivity kernel omega in C^1(R,R) ∩ L(R,mu,R) is non-negative." (A2) f_0 is the
  Heaviside with threshold h; (A3) f_beta is continuous, non-decreasing, with values in [0,1], converging to the
  Heaviside off any neighbourhood of h as beta -> 0.
- Theorem 3 (p. 14): "Let the condition in (17) be fulfilled and the inequalities of (18), (19), and (21) hold true.
  Then, for each beta in [0, infinity), there exists a regular travelling wave solution u_beta ... of the speed c < 0
  to (3)." The practical summary (pp. 14-15): "If the inequalities occur, then, for any sufficiently steep firing
  rate function approximating the Heaviside firing rate function with the threshold h, there exists the
  corresponding travelling wave of the same speed that approaches ... the travelling wave corresponding to the
  Heaviside firing rate function."
- What it does not cover for our claim:
  1. The kernel e^(-|x|)/2 is not C^1 at 0, so (A1) fails as written.
  2. No bound on how steep is "sufficiently steep" is given; Theorem 2 (p. 10) gives existence for beta in (0, 1] of
     a family parameterised so that beta -> 0 is the Heaviside, with no link between that parameter and a logistic
     gain. So the logistic with gain 20 is not shown to be covered.
  3. Conditions (19) and (21) are not verified for any example in the paper; the only example (Fig. 3, p. 12, a
     Gaussian kernel, h = 0.6, eps = 0.1) solves (17) numerically.
  4. No speed or profile enclosure; the result is qualitative.
- Points of the argument that a careful reader should check (our reading, not established): the operator H_beta is
  built at a fixed speed c (eq. (5), (9)) and the conclusion is a wave "of the same speed" for every steep sigmoid,
  whereas the speed of a pulse normally changes with the firing rate; the uniqueness of a profile in a closed ball
  (Theorem 2, Lemma 7) sits uneasily with translation invariance, which Remark 1 handles only in words; and
  Theorem 3 states "each beta in [0, infinity)" while Theorem 2 gives beta in (0, 1]. If the fixed-speed
  formulation is a real gap, the theorem may not prove what its summary says; this should be settled before our
  paper describes it.
- Citations (Semantic Scholar, 2026-09-26): 2, Dyson arXiv:2511.17328 and "An approach to determining the
  epicenter of a traveling wave with an inhomogeneous distribution of braking effects" (2026, title only, not read).

## New targeted searches (2026-09-26)

arXiv full-text abstract search (arxiv.org/search, searchtype=abstract; the export API returned HTTP 406 here):

| Query | Hits | Relevant |
|---|---|---|
| `"neural field" pulse sigmoid existence` | 0 | - |
| `"neural field" pulse sigmoidal` | 0 | - |
| `"neural field" "traveling pulse" smooth` | 0 | - |
| `"neural field" traveling pulse` | 8 | Dyson 2511.17328 (Heaviside, small eps); the rest numerical or stochastic |
| `rigorous numerics "neural field"` | 5 | none (control of neural fields, well-posedness, canards, stochastic) |
| `computer-assisted proof traveling wave nonlocal` | 0 | - |
| `computer-assisted integro-differential traveling` | 0 | - |
| `computer-assisted proof traveling wave` | 10 | none on neural fields (FPU, Burgers-Hilbert, fractional KdV, suspension bridge, sharp fronts) |
| `computer-assisted nonlocal` | 29 | Cadiot 2505.03091 (spectra of localized solutions of nonlocal equations; examples Swift-Hohenberg, Gray-Scott, Whitham); Breden-Payan-Reisch-Tang 2504.05066 (Turing instability, nonlocal reaction-diffusion); no neural field |
| `"interval arithmetic" "traveling pulse"` | 0 | - |
| `rigorous numerics delay differential equation traveling` | 0 | - |

Web searches (WebSearch): `"neural field" traveling pulse existence "smooth firing rate" OR "sigmoidal firing rate" proof ...`;
`computer-assisted proof traveling pulse neural field OR "integro-differential" interval arithmetic homoclinic`;
`"rigorous numerics" OR "computer-assisted" "Amari" OR "Pinto-Ermentrout" OR "Wilson-Cowan" traveling wave proof`;
`"neural field" "computer-assisted proof" OR "validated numerics" pulse OR bump OR wave`;
`Lessard OR "van den Berg" OR Jaquette OR "Arioli Koch" rigorous computation traveling wave nonlocal ...`. Hits read
(abstracts unless stated):

- Matsue, arXiv:1507.01462 (rigorous numerics for fast-slow systems, isolating blocks and cones; full text
  grepped): Sect. 6, "Our sample system is the FitzHugh-Nagumo system"; valid "for all eps in a given half-open
  interval (0, eps0]", with the example eps in [0, 5 x 10^-6]. Method precedent, not a neural field.
- Czechowski, arXiv:1909.06207 (thesis): FitzHugh-Nagumo periodic and homoclinic orbits "for eps in (0, eps0]".
- Park and Ermentrout, arXiv:1801.06168: ring and torus domains, "weak and slow spike frequency adaptation",
  "smooth firing rate function"; existence of constant-velocity bumps via a reduction. Different domain and regime.
- Dyson, arXiv:1810.05142 (SIADS 19, 2020): fronts, not pulses, with sigmoidal rates, via the implicit function
  theorem from the Heaviside.
- Blanco and Lessard, arXiv:2608.15613; Beck, Jaquette and Pieper, arXiv:2510.24417: computer-assisted, on
  Swift-Hohenberg and Gray-Scott; not neural fields.
- Burlakov, Oleynik and Ponosov (2025): above.
- Faye, "Existence and stability of traveling pulses in a neural field equation with synaptic depression" (SIADS
  2013): already in the ledger (synaptic depression, singular perturbation).
- Coombes and Schmidt, DCDS-S 28 (2010), "Neural fields with sigmoidal firing rates: approximate solutions" (title
  and Dyson's description only: "iterative computational techniques for approximating solutions").

Semantic Scholar search was rate-limited (HTTP 429) and OpenAlex exhausted its free daily budget during this
session; neither search is counted.

## Conclusion

As far as reached, no earlier work proves, by computer or otherwise, a travelling pulse of the Pinto-Ermentrout
field for the logistic with gain 20 and threshold 1/4, the kernel e^(-|x|)/2 and eps = 1/10, and no earlier work
encloses such a pulse's speed. The four named papers are Heaviside results (Zhang 2004, Zhang 2005, Pinto-Jackson-
Wayne) or a stability implication (Sandstede), on the evidence of abstracts, two zbMATH reviews and later
descriptions; their full texts were not reached.

The closest prior work is Burlakov, Oleynik and Ponosov (2025), which claims existence of pulses at a fixed
eps < 1/(sigma + 4) for every sufficiently steep sigmoid near a non-degenerate Heaviside pulse, for C^1 kernels.
The paper and README should (a) cite it; (b) state that it gives no explicit steepness, requires a C^1 kernel,
verifies its conditions for no example and leaves points to check; and (c) stop presenting Hastings's 2017 remark
as the current state of the question without it. The novelty claim that survives is: a rigorous, computer-assisted
existence proof with a speed enclosure, at an explicit smooth firing rate and a non-C^1 kernel, at eps = 1/10.

Before any claim of priority: read the full texts of Zhang (2005) and Pinto-Jackson-Wayne (2005) (library access),
and settle whether the Burlakov-Oleynik-Ponosov argument is complete.

## Proposed RESEARCH.md entry

```
### 2026-09-26  neural-field pulse with a smooth sigmoid: the Zhang papers, Pinto-Jackson-Wayne, Sandstede, and a 2025 existence theorem  (session agent; `papers/nf-pulse/review/second/prior-art/PRIOR-ART.md`)

- Why: the entry of the same day could not reach Zhang (2004, 2005) or Pinto, Jackson and Wayne (2005), and priority for `papers/nf-pulse/` waited on them.
- Read, not the full texts (ScienceDirect 403, Springer client challenge, SIAM and World Scientific closed, ResearchGate 403, Sandstede's page captcha): zbMATH 1054.45005 review of Zhang, JDE 197 (2004) 162-196 (scalar, w constant, "H is the Heaviside step function"); zbMATH 1082.45009 review of Zhang, "Traveling waves of a singularly perturbed system of integral-differential equations arising from neuronal networks", JDDE 17 (2005) 489-522 (Heaviside, "the case eps = 0 and 0 < eps << 1"); abstract of Pinto-Jackson-Wayne, SIADS 4 (2005) 954-984 ("A Heaviside step function governs the activation", no assumption on the recovery rate); abstract of Sandstede, IJBC 17 (2007) 2693-2704 (spectral implies nonlinear stability). zbMATH reviews of eight further Zhang neural-field papers: all Heaviside where stated; six reviews unavailable (Math. Z. 255, JJIAM 27, Physica D 239, DCDS 34, DCDS-B 16, JMN 3), not read.
- Found and read in full: Burlakov, Oleynik and Ponosov, Mathematics 13 (2025) 701, doi:10.3390/math13050701 (CC BY). Same model; Theorem 3 (p. 14): pulses exist for "any sufficiently steep firing rate function approximating the Heaviside", at fixed 0 < eps < 1/(sigma + 4), for a nonnegative C^1 kernel, if a Heaviside pulse satisfies (17)-(19), (21). No steepness bound, no example checked, e^(-|x|)/2 is not C^1; its fixed-speed formulation and the uniqueness in a ball under translation need checking.
- Searched (arXiv abstract search): '"neural field" pulse sigmoid existence' 0; '"neural field" pulse sigmoidal' 0; '"neural field" traveling pulse' 8, none rigorous for smooth rates; 'rigorous numerics "neural field"' 5, none; 'computer-assisted proof traveling wave' 10 and 'computer-assisted nonlocal' 29, none on neural fields; '"interval arithmetic" "traveling pulse"' 0. Web searches for computer-assisted or validated-numerics neural-field waves: only FitzHugh-Nagumo (Matsue arXiv:1507.01462, Czechowski arXiv:1909.06207) and non-neural nonlocal problems (Cadiot 2505.03091, Breden et al. 2504.05066). Semantic Scholar search rate-limited; OpenAlex budget exhausted.
- Result: the computer-assisted proof at beta = 20, theta = 1/4, eps = 1/10, gamma = 0, kernel e^(-|x|)/2, with the speed enclosed, is new as far as reached. The statement that no pulse is proved for a smooth firing rate at fixed eps is not: Burlakov-Oleynik-Ponosov (2025) must be cited and delimited, alongside Hastings's remark.
- Re-search: no, unless a week passes; read the full texts of Zhang (2005) and Pinto-Jackson-Wayne (2005), and check the Burlakov-Oleynik-Ponosov argument, before any claim of priority.
```
