# Prior-art check: travelling pulse of the Pinto-Ermentrout field with a smooth firing rate at fixed eps

Date: 2026-09-26. Scope: the claim in `papers/nf-pulse/README.md` (computer-assisted proof of a fast pulse of
u_t = -u - v + w*S(u), v_t = eps(u - gamma v), w = e^{-|x|}/2, logistic S with beta = 20, theta = 1/4, at
eps = 1/10, gamma = 0). Starting point: RESEARCH.md entries of 2026-09-25 (neuroscience scout) and 2026-09-26
(neural-field travelling pulse), whose searches are not repeated here.

Quotes are short excerpts for citation. No PDF or full text is stored in the repository; downloads went to the
session scratchpad only. The query scripts are in `scripts/` (header comment in each). The Unpaywall script reads
the address Unpaywall requires from the environment variable `UNPAYWALL_EMAIL`.

## Summary

- **New closest prior work, not in the ledger: Burlakov, Oleynik and Ponosov, Mathematics 13 (2025) 701,
  doi:10.3390/math13050701 (CC BY, read in full).** It studies the same model (their eq. (3), with v's decay
  written sigma), allows a fixed eps (they state eps < (sigma + 4)^-1 suffices; eps = 1/10, sigma = 0 is inside),
  and its Theorem 3 states existence of travelling pulses for a family of continuous firing rates that tends to
  the Heaviside function, **conditional on** nondegeneracy conditions (17), (18), (19), (21) of a Heaviside pulse
  at the same parameters. It does not verify those conditions for any concrete kernel (its Figure 3 is numerical),
  it assumes a C^1 kernel (e^{-|x|}/2 is not C^1 at 0), its function-space setting appears to need f(U) to be
  integrable along a decaying profile (a logistic with S(0) > 0 is not), it gives no explicit steepness, and it is
  not computer-assisted. So it does not prove the nf-pulse theorem, but the README's literature statement (only
  Faye and Scheel, and Hastings's remark) is incomplete without it. **Severity: must-fix** for the framing (cite and
  distinguish it); the specific result still looks new.
- **Zhang, J. Dyn. Differ. Equ. 17 (2005) 489-522:** Heaviside firing rate, eps = 0 and 0 < eps << 1 (zbMATH
  review; full text not reached). Does not cover a smooth S or a fixed eps. **Unconfirmed** at full-text level.
- **Zhang, J. Differential Equations 197 (2004) 162-196** is titled "Existence, uniqueness and exponential stability
  of traveling wave solutions of some integral differential equations arising from neuronal networks"; the title
  "On stability of traveling wave solutions in synaptically coupled neuronal networks" belongs to Zhang,
  Differential Integral Equations 16 (2003) 513-536. Both: Heaviside (JDE 2004, zbMATH review) or stability only
  (DIE 2003, abstract). **Unconfirmed** at full-text level; neither bears on existence with a smooth S.
- **Pinto, Jackson and Wayne, SIAM J. Appl. Dyn. Syst. 4 (2005) 954-984:** Heaviside firing rate, recovery rate
  not restricted to a singular limit (published abstract, via zbMATH). This is the fixed-eps precedent, but for a
  Heaviside S. **Unconfirmed** at full-text level. **Should-fix:** cite it as such.
- **Sandstede, Int. J. Bifurcation Chaos 17 (2007) 2693-2704:** stability (spectral implies nonlinear), not
  existence (published summary). **Unconfirmed** at full-text level; no bearing on existence.
- New searches (arXiv, OpenAlex, Semantic Scholar, citation scans, web) found no computer-assisted or other proof of
  a pulse for a smooth S at a fixed eps beyond Burlakov et al.; two leads were not reached (Enculescu, Physica D 196
  (2004); Zhang, Math. Z. 255 (2006)). **Should-fix:** read both before any claim of priority.
- **Second pass (same day):** none of the six full texts could be reached legally from this session (details in
  "Second pass (full texts)"). New first-hand material: the full published abstract of Pinto, Jackson and Wayne
  (OpenAlex and Crossref), the abstract of Zhang, JDE 197 (2004) (CORE metadata), Zhang's own later open-access
  paper (J. Appl. Anal. Comput. 4 (2014) 1-68), which states the same singularly perturbed system with "the
  Heaviside step function" as gain function, and zbMATH classification records for Enculescu (2004) and Zhang,
  Math. Z. (2006), whose review texts zbMATH withholds. Nothing read in the second pass changes a verdict: every
  source reached treats a Heaviside firing rate or stability only. The six papers stay **unconfirmed at full-text
  level**; Enculescu (2004) and Zhang, Math. Z. (2006) are still known by title and classification only.

Conclusion (both passes): as far as reached, **no prior work proves a pulse for this model with a smooth firing
rate at an explicit fixed eps, and none does it by computer.** The honest novelty statement is narrower than "the
first existence proof of a pulse with a smooth firing rate at fixed eps", because Burlakov et al. state a
(conditional, non-quantitative) theorem of that kind for steep continuous firing rates near the Heaviside limit.
The priority claim still rests on abstracts and reviews for six papers, so QUALITY.md item 4 stays open until a
library copy of each is read.

## Access record

| Paper | DOI | Open copy found? | What was read |
|---|---|---|---|
| (a) Zhang, JDDE 17 (2005) | 10.1007/s10884-005-5404-3 | No (Unpaywall closed; S2 closed; OpenAlex closed; Springer page behind a client challenge; author page at lehigh.edu/~liz5 lists no PDFs) | zbMATH review, Zbl 1082.45009 (V. Lakshmikantham); how Dyson, arXiv:2511.17328v2, and Dyson, arXiv:1810.05142, cite Zhang |
| (b) Zhang, JDE 197 (2004) | 10.1016/S0022-0396(03)00170-0 | Unpaywall says bronze at ScienceDirect, but the PDF returned HTTP 403 and the Elsevier API gave metadata only | zbMATH review, Zbl 1054.45005 (Sen-Zhong Huang) |
| (b') Zhang, DIE 16 (2003) | 10.57262/die/1356060624 | Unpaywall says bronze at Project Euclid; the PDF link returned a bot wall; the landing page showed the abstract | Abstract (Project Euclid page); zbMATH review, Zbl 1034.45012 |
| (c) Pinto, Jackson, Wayne (2005) | 10.1137/040613020 | No (Unpaywall, OpenAlex closed; SIAM 403; C. E. Wayne's BU page failed TLS and 503) | Published abstract (zbMATH Zbl 1091.45004 summary); Dyson, arXiv:2511.17328v2, Sect. 2.2, pp. 7-8 |
| (d) Sandstede (2007) | 10.1142/S0218127407018695 | No (World Scientific 403; ResearchGate 403; Brown page behind a captcha) | Published summary (zbMATH Zbl 1144.35342); Dyson, arXiv:2511.17328v2, p. 26 |
| Burlakov, Oleynik, Ponosov (2025) | 10.3390/math13050701 | Yes, CC BY (mdpi.com returned 403; the mdpi-res.com CDN copy opened) | **Full text, all sections** |
| Faye and Scheel, arXiv:1311.6508 | | Yes | Abstract, Sect. 1, Theorem 1 (re-checked for the eps condition) |
| Ermentrout, Jalics, Rubin, SIAM J. Appl. Math. 70 (2010) | 10.1137/090775737 | Not sought | Abstract (Crossref and zbMATH) |
| Enculescu, Physica D 196 (2004) 362-386 | 10.1016/j.physd.2004.06.005 | No; no abstract in Crossref, S2, OpenAlex or zbMATH | Title and citing papers only |
| Zhang, Math. Z. 255 (2006) 283-321, "Dynamics of neuronal waves" | 10.1007/s00209-006-0024-0 | No; zbMATH text unavailable for licence reasons | Title only |
| Zhang, Acta Math. Appl. Sin. Engl. Ser. 20 (2004) | 10.1007/s10255-004-0168-9 | No | zbMATH review, Zbl 1072.35022 |

## Paper by paper

### (a) L. Zhang, Traveling waves of a singularly perturbed system of integral-differential equations arising from neuronal networks, J. Dyn. Differ. Equ. 17 (2005) 489-522

Read: zbMATH review Zbl 1082.45009 only (full text not reached).

- Model: the review writes u_t + u + w = alpha K*H(u - theta) + beta K*H(u - theta), w_t = eps(u - gamma w). This is
  the Pinto-Ermentrout system with linear recovery, but with the **Heaviside** H as firing rate.
- eps: "the case \(\varepsilon = 0\) and \(0 < \varepsilon \ll 1\)" (review). Small eps only.
- Goal per the review: "existence and exponential stability of traveling wave solutions".
- Secondary: Dyson, arXiv:1810.05142, cites Zhang for Heaviside results ("bridging together Zhang's Heaviside result
  with Ermentrout and McLeod's sigmoidal result", p. 4, which concerns fronts).
- Verdict: does not prove a pulse with a smooth S at a fixed eps. **Unconfirmed** (review only). Severity for the
  nf-pulse claim: none if the review is right; **should-fix** to read the full text before submission, since
  QUALITY.md item 4 names it.

### (b) L. Zhang, J. Differential Equations 197 (2004) 162-196 (title corrected)

Crossref gives the title "Existence, uniqueness and exponential stability of traveling wave solutions of some
integral differential equations arising from neuronal networks". Read: zbMATH review Zbl 1054.45005.

- Model: scalar, u_t = f(u, w) + alpha K*H(u - theta) with w a constant ("with ... constant \(w\)"), "\(H\) is the
  Heaviside step function" (review). Fronts of a scalar equation; no recovery dynamics, no eps.
- Verdict: not relevant to a pulse with smooth S. **Unconfirmed** (review only).

The title the task guessed, "On stability of traveling wave solutions in synaptically coupled neuronal networks", is
Zhang, Differential Integral Equations 16 (2003) 513-536 (Crossref; Zhang's home page lists it so). Read: abstract.
It proves "that there is no nonzero spectrum of some linear operator" in Re lambda >= 0 and asymptotic stability;
a stability paper, not existence. Dyson cites it for "deriving the Evans function" (arXiv:2511.17328v2, p. 26). **Unconfirmed** as to its firing rate; no bearing on existence.

Also found: Zhang, Acta Math. Appl. Sin. Engl. Ser. 20 (2004), "Exponential stability of traveling pulse solutions
of a singularly perturbed system ...": per Zbl 1072.35022 it "establishes the exponential stability of fast
traveling pulse solutions". Stability only.

### (c) D. J. Pinto, R. K. Jackson, C. E. Wayne, Existence and stability of traveling pulses in a continuous neuronal network, SIAM J. Appl. Dyn. Syst. 4 (2005) 954-984

Read: the published abstract (zbMATH Zbl 1091.45004 reproduces it) and Dyson's account (arXiv:2511.17328v2,
Sect. 2.2). Full text not reached.

- Firing rate: "A Heaviside step function governs the activation of each neuron." (abstract)
- eps: "We incorporate a relatively slow local recovery variable within each neuron but make no other assumptions
  about the recovery rate." and "our existence strategy is not constrained to singular limits" (abstract). So this
  is existence at a fixed, not necessarily small, recovery rate, but for a **Heaviside** S.
- Kernel: "positive, homogeneous, and symmetric and that it decays with distance" (abstract).
- Dyson's reading: the pair (a, c) "can be solved for when theta is small" and the authors "did not track sub and
  super threshold regions beyond computationally checking" (arXiv:2511.17328v2, pp. 7-8).
- Verdict: no smooth S. **Unconfirmed** (abstract and secondary account only). Severity: **should-fix**, cite as the
  fixed-eps Heaviside precedent, so the novelty is stated as "smooth S", not "fixed eps".

### (d) B. Sandstede, Evans functions and nonlinear stability of traveling waves in neuronal network models, Int. J. Bifurcation Chaos 17 (2007) 2693-2704

Read: the published summary (Zbl 1144.35342). "We prove here that spectral stability of traveling waves implies
their nonlinear stability in appropriate function spaces". An existence result is not described. **Unconfirmed**
(summary only); no bearing on the existence claim. Nit: relevant to the paper's "Nothing here concerns stability"
sentence, as the tool a stability follow-up would use.

### New: E. Burlakov, A. Oleynik, A. Ponosov, Travelling waves in neural fields with continuous and discontinuous neuronal activation, Mathematics 13 (2025) 701

Found through Dyson, arXiv:2511.17328v2, ref. [8] (p. 9: "if traveling pulses exist in neural fields systems with
smoothed Heaviside firing rates and nonnegative kernels, then ... the pulse solutions converge to the Heaviside
solution"; Dyson describes their Theorem 1, not Theorem 3). Read in full (17 pages).

- Model: their (3), u_t = -u + omega*f_beta(u) - v, (1/eps) v_t = u - sigma v (p. 5). Same as Pinto-Ermentrout with
  gamma = sigma. "the decay sigma of the negative feedback ... is often neglected ... Our approach allows us to omit
  this restriction" (p. 7), so sigma = 0 is included.
- eps: "the assumption 0 < eps << 1 can be specified as 0 < eps < (sigma + 4)^-1" (p. 2). With sigma = 0 that is
  eps < 1/4, which includes eps = 1/10. Their Figure 3 uses eps = 0.1.
- Firing rates: beta = 0 is the Heaviside with threshold h (A2); for beta > 0, f_beta is "non-decreasing and
  continuous" with values in [0, 1] and tends to the Heaviside away from h (A3). A logistic family in 1/beta fits (A3).
- Kernel: "(A1) The connectivity kernel omega in C^1(R, R) ∩ L(R, mu, R) is non-negative." (p. 5). The nf-pulse
  kernel e^{-|x|}/2 is not C^1 at 0, so it is outside (A1) as stated.
- Main result, Theorem 3 (p. 14): if the Heaviside pulse satisfies (17) (it exists with width a and speed c) and
  the inequalities (18), (19), (21) (regularity, a local uniqueness condition, a nonzero index), then "for each
  beta in [0, infinity), there exists a regular travelling wave solution", with convergence to the Heaviside wave as
  beta -> 0. Their practical summary (p. 14): "for any sufficiently steep firing rate function approximating the
  Heaviside firing rate function ... there exists the corresponding travelling wave".
- What it does not do:
  1. It verifies (17)-(21) for no concrete kernel and parameter set; Figure 3 solves (17) numerically for a Gaussian
     kernel and does not check (19) or (21).
  2. No explicit steepness: Theorem 2 (p. 10), from which Theorem 3 follows, gives "for any beta in (0, 1]" after a
     homotopy whose boundary condition is argued only through sequences beta_n -> 0; as we read it, the passage from
     Theorem 2's (0, 1] to Theorem 3's [0, infinity) is not argued. This is our reading of the proof, not a checked
     counterexample.
  3. The function space: the proof of Lemma 5 says "the operator N_beta maps any function from C^1_0(R, R) to
     L(R, mu, R)" (p. 7), i.e. f_beta(U) integrable for U decaying to 0. For a logistic with f(0) > 0, as in nf-pulse
     (S(0) = 0.0067...), f(U) tends to f(0) != 0 and is not integrable, and the rest state is not u = v = 0. As we
     read it, the framework therefore covers firing rates that vanish near rest, not the nf-pulse S. Again our
     reading; the paper does not discuss it.
  4. No speed enclosure, no computer-assisted step.
- Verdict: the closest prior work; it claims, under unverified conditions, pulses for steep continuous firing rates
  at a fixed eps below 1/(sigma + 4). It does not prove the nf-pulse theorem (kernel not C^1, S(0) > 0, no explicit
  steepness, conditions unverified). Severity: **must-fix** for the README abstract and any manuscript introduction:
  cite it and state precisely why it does not cover the result. Also **should-fix**: do not describe the smooth-S,
  fixed-eps question as untouched; the Hastings quote remains accurate ("all reasonable smooth functions S"), but the
  sentence "for a smooth one, Faye and Scheel prove pulses when the recovery is sufficiently slow" needs Burlakov et
  al. beside it.

### Faye and Scheel, arXiv:1311.6508 (re-checked for the eps condition only)

Theorem 1 (p. 6): "for every sufficiently small eps > 0, there exist functions u_eps, v_eps ... and a wave speed
c(eps) > 0". Their system (1.4) has the nonlinearity outside the convolution; they say the difference with the
neural field form (1.6) "does not affect the techniques we employ here" (p. 3), a remark, not a theorem. No fixed
eps. Consistent with the ledger; no change.

### Ermentrout, Jalics and Rubin, SIAM J. Appl. Math. 70 (2010), doi:10.1137/090775737 (abstract only)

"a scalar field model with a general smooth firing rate function and a spatiotemporally varying stimulus"; with
adaptation they "obtain a formula ... for the stimulus speeds that induce locked traveling pulse solutions". Pulses
locked to a moving stimulus, not autonomous pulses; the abstract does not claim a proof of pulse existence. Nit:
worth a sentence if the manuscript surveys smooth-S results.

### Ermentrout and McLeod (1993)

Not re-read. Faye and Scheel, p. 6, and Dyson, arXiv:2511.17328v2, p. 7, both describe it as existence (and local
uniqueness) of **fronts** for the scalar equation with a sigmoid and no adaptation. No pulse.

## New searches (not in the ledger)

arXiv, abstract field, through the arxiv.org/search interface (the export API returned HTTP 406 through the proxy);
`scripts/arxiv_q.py`:

| Query | Hits | Result |
|---|---|---|
| "neural field" pulse sigmoid | 0 | |
| "neural field" pulse smooth existence | 0 | |
| "neural field" "traveling pulse" sigmoidal | 0 | |
| "neural field" "travelling pulse" sigmoidal | 0 | |
| "neural field" Heaviside sigmoidal existence traveling | 1 | 1810.05142 (Dyson, fronts, lateral inhibition; already in the ledger) |
| computer-assisted "traveling pulse" | 0 | |
| computer-assisted "traveling wave" | 13 | none on neural fields (suspension bridge, Burgers-Hilbert, FPU, FitzHugh-Nagumo periodic orbits 1502.02451, ...); positive control for the phrase |
| computer-assisted FitzHugh-Nagumo | 6 | 1909.06207, 2202.13326, 1502.02451, ...; none neural-field |
| "neural field" "traveling wave" existence (control) | 10 | none proves a pulse for smooth S with adaptation |

Burlakov et al. is not on arXiv (it did not appear in any arXiv search), which is why the arXiv-only searches of the
ledger missed it.

OpenAlex, `title_and_abstract.search`, `scripts/openalex_q.py`:

| Query | Hits | Result |
|---|---|---|
| "neural field" "traveling pulse" sigmoidal existence | 0 | |
| "neural field" "rigorous numerics" | 0 | |
| "neural field" pulse "smooth firing rate" | 2 | Faye 2013 (already read), a conference abstract on horseshoes |
| "neural field" "traveling wave" (positive control) | 115 | first 50 titles scanned; includes Burlakov et al. 2025, the only existence result for smooth S near Heaviside with adaptation |
| "neural field" "travelling pulse" sigmoid; "neural field" "computer-assisted" | failed | HTTP 429 after retries; not re-run |

Semantic Scholar relevance search "traveling pulse neural field sigmoidal firing rate existence": 52 records, first
40 titles scanned. New leads: Ermentrout, Jalics and Rubin 2010 (read the abstract, above) and Enculescu 2004
(abstract not available anywhere tried; not read).

Citation scans (Semantic Scholar, `scripts/citers.py`; titles plus abstracts, which the API often elides, filtered
for sigmoid, smooth, steep, computer-assisted, rigorous numerics, interval, validated):

| Cited paper | Citing records | Flagged |
|---|---|---|
| Zhang 2005 (JDDE) | 15 (all titles read) | only Dyson 2018 (1810.05142, fronts) |
| Pinto, Jackson, Wayne 2005 | 60 | Dyson 2018; a 2007 bumps paper |
| Sandstede 2007 | 60 | same two |
| Zhang 2004 (JDE) | 96 | none |
| Zhang 2003 (DIE) | 77 | Dyson 2018, its SIADS 2020 version, a lattice paper (Sigmoidal approximations of Heaviside functions in neural lattice models, JDE 2020) |
| Burlakov et al. 2025 | 2 | Dyson 2511.17328 and a 2026 applied paper on wave epicentres; neither proves a smooth-S pulse |
| Enculescu 2004 | 13 (all titles read) | none by title |

Web searches (2): "existence proof traveling pulse neural field 'sigmoidal firing rate' linear adaptation Pinto
Ermentrout rigorous" and "'neural field' traveling pulse 'computer-assisted proof' OR 'rigorous numerics' OR
'interval arithmetic'": only papers already in the ledger (Hastings, Dyson, Faye and Scheel, Faye 2013) and generic
computer-assisted-proof pages.

Reviews: Bressloff, J. Phys. A 45 (2012) 033001 (the author PDF link returned 404) and Coombes, Biol. Cybern. 93
(2005) (Springer challenge page) were not reached.

## Second pass (full texts)

Date: 2026-09-26, later the same day. Goal: reach the full texts of (a) Zhang, JDDE 17 (2005); (b) Zhang, JDE 197
(2004); (c) Pinto, Jackson and Wayne, SIADS 4 (2005); (d) Sandstede, IJBC 17 (2007); (e) Enculescu, Physica D 196
(2004); (f) Zhang, Math. Z. 255 (2006), by legal routes only. Downloads went to the session scratchpad; nothing
behind a captcha, bot wall or client challenge was worked around. No script was added for this pass; the queries
are listed here.

### Result per paper

| Paper | Full text reached? | New first-hand material | Firing rate | eps | Pulse with smooth S at fixed, non-small eps? |
|---|---|---|---|---|---|
| (a) Zhang, JDDE 2005 | No | Zhang's own statement of the system in J. Appl. Anal. Comput. 4 (2014) (below) | Heaviside (zbMATH review; Zhang 2014, p. 4) | eps = 0 and 0 < eps << 1 (review) | No, as far as read |
| (b) Zhang, JDE 2004 | No | Abstract (CORE metadata record 82068390) | Heaviside (zbMATH review) | none (scalar) | No: scalar fronts |
| (c) Pinto, Jackson, Wayne 2005 | No | Full published abstract (OpenAlex, Crossref); Kilpatrick's thesis account | Heaviside (abstract) | not restricted to a singular limit (abstract) | No: Heaviside |
| (d) Sandstede 2007 | No | Abstract (OpenAlex, Crossref, zbMATH; identical to the first pass) | not stated in the abstract | not stated | No: stability, not existence |
| (e) Enculescu 2004 | No | zbMATH Zbl 1049.92008: record exists, text withheld; MSC 92C20, 45K05, 92B20, 65R99 | unknown | unknown | Unknown |
| (f) Zhang, Math. Z. 2006 | No | zbMATH Zbl 1186.92012: record exists, text withheld; MSC 92C20, 45K05; Crossref: online 2006-07-29, vol. 255, pp. 283-321 (Zhang's later papers cite it as 2007) | unknown | unknown | Unknown |

### What was read, with pages

- **(c) Pinto, Jackson and Wayne, full published abstract** (OpenAlex abstract index and Crossref `abstract`, which
  agree). Beyond the sentences quoted in the first pass: "When neurons have a single stable state, we demonstrate
  the existence of two traveling pulse solutions in a connected network." It also says the Evans-function
  expressions are explicit and allow "numerical investigations over a wide range of parameter values". Model: the
  Pinto-Ermentrout system with a slow local recovery variable; firing rate Heaviside; recovery rate not restricted
  to a singular limit. So (c) is a fixed-eps existence result for a **Heaviside** S only.
- **(c), secondary:** Z. P. Kilpatrick, PhD dissertation, University of Utah (open PDF at colorado.edu), printed
  p. 13: writes the Pinto-Ermentrout linear-recovery model with "Θ is a Heaviside firing rate function" and
  summarizes Pinto, Jackson and Wayne as extending pulse results "to a more general class of weight functions".
  Consistent with the abstract; adds nothing on smooth S.
- **(b) Zhang, JDE 197 (2004), abstract** (CORE metadata; the CORE PDF blob returned 404 and the Elsevier
  content-store copies returned 403): the author "applies fixed point theorems to prove the existence of the
  traveling waves" and uses "eigenvalue functions" for stability. The abstract does not name the firing rate; the
  zbMATH review read in the first pass says Heaviside and scalar.
- **(a) and Zhang's programme, secondary but by the same author:** L. Zhang and A. Hutt, "Traveling wave solutions
  of nonlinear scalar integral differential equations arising from synaptically coupled neuronal networks",
  J. Appl. Anal. Comput. 4 (2014) 1-68 (open PDF at jaac-online.com; read pp. 1-4, 11-13 and 49). It states the
  system (1.3)-(1.4), which has the recovery equation w_t = eps(u - gamma w), and says "The gain function is given
  by the Heaviside step function" (p. 4). It calls the scalar front results "the preparation for the study of the
  existence and stability of traveling pulse solutions" of that system (p. 11). It cites (a), (b), (c), (d) and (f)
  but, in the pages read, does not summarize them individually. This supports the reading of (a) as a Heaviside
  paper; it is not a reading of (a) itself.
- **(d) Sandstede:** abstract only, as in the first pass: "We prove here that spectral stability of traveling waves
  implies their nonlinear stability in appropriate function spaces". No existence claim in the abstract.
- **(e) Enculescu and (f) Zhang, Math. Z.:** no abstract was found anywhere tried (Crossref, OpenAlex, Semantic
  Scholar, zbMATH, CORE all empty or withheld). The MSC code 65R99 on (e) (numerical methods for integral
  equations) suggests a numerical component; that is an inference from a classification code, not a reading.
  A search-engine summary attributed front-related keywords to Zhang, Math. Z.; no page carrying them was opened,
  so no claim is based on them.

### Where each full text was sought (all failed)

- **Publisher pages:** ScienceDirect (b, e) HTTP 403 from curl and from WebFetch, including the `/pdf` and
  `/pdfft` routes; Springer (a, f) returned a "Client Challenge" page to curl with a cookie jar and redirected
  WebFetch to a login; SIAM (c) 403 to WebFetch; World Scientific (d) not re-tried after the first pass's 403.
- **Unpaywall** (address from the fallback, `UNPAYWALL_EMAIL` being unset): (a), (c), (d), (e), (f) closed; (b)
  bronze at ScienceDirect only, which returned 403.
- **Semantic Scholar `openAccessPdf`:** CLOSED for (a), (c), (d), (e), (f); BRONZE for (b), pointing at the same
  ScienceDirect PDF.
- **OpenAlex:** closed, no repository copy, for (a), (e), (f); (b) bronze at ScienceDirect only.
- **CORE API v3:** (b) found as record 82068390 with metadata and abstract; its download URL returned
  `BlobNotFound` (404), and the two Elsevier content-store links in the CORE reader page returned 403. Searches
  for (a), (c), (d), (e), (f) by DOI and for (c), (d), (e) by title: 0 hits.
- **Author pages:** C. E. Wayne (math.bu.edu/people/cew/): TLS failure from curl (certificate chain not
  verifiable) and 503 from WebFetch. B. Sandstede: sites.google.com/view/bjornsandstede redirects to a Google
  login; bjornsandstede.com (publications page and `/papers/`) and dam.brown.edu/people/sandsted/ (which now
  redirects there) answer with an SG captcha challenge (HTTP 202); not worked around. L. Zhang (lehigh.edu/~liz5/):
  reachable; lists publications without PDF links. D. Pinto: the URI Digital Commons faculty collection starts in
  2012 and holds no copy of (c).
- **Repositories and indexes:** ResearchGate (d) 403 from curl and WebFetch; CiteSeerX redirected to
  web.archive.org, and web.archive.org (including the Wayback CDX and availability APIs) returned 429, reset the
  connection, or is not fetchable by WebFetch; HAL copy of a citing paper behind a bot check.
- **arXiv** (arxiv.org/search, all fields): "Sandstede neuronal" 0, "Evans functions neuronal network" 0,
  "Linghai Zhang neuronal" 0; "Pinto Wayne" 9 and "Enculescu" 5, none on neural fields. None of the six is on arXiv.
- **Web searches** (exact title plus "pdf" for (a), (b), (c), (d); title for (e); title, journal and keywords for
  (f); author pages for Wayne, Pinto, Sandstede; Jackson's thesis): only the publisher pages, ResearchGate,
  Dyson's arXiv paper and the sources above. Russell K. Jackson's dissertation was not found.
- **Citing papers with open texts, scanned for accounts of (e) and (f):** Dyson, arXiv:2511.17328,
  arXiv:1810.05142 and arXiv:1803.01380 do not cite Enculescu or Zhang, Math. Z. (full-text search). Zhang's own
  J. Appl. Anal. Comput. papers of 2012, 2013 and 2014 list (f) among their references; the in-text citations were
  not traced beyond the 2014 pages named above. Coombes,
  Biol. Cybern. 93 (2005), which cites (e), was not reached (Nottingham repository 403, ResearchGate 403).

### Verdict of the second pass

No verdict of the first pass changes. For (a), (b), (c) and (d) the new first-hand evidence (a full abstract, an
abstract, and the author's own later statement of the model) is consistent with the first pass: Heaviside firing
rate, or stability only. For (e) and (f) nothing about the content was read. The residual risk sits in (e) and
(f): both are from 2004-2006, both are classified under 45K05 (integro-partial differential equations) and 92C20
(neural biology), and neither could be characterized. Neither appears anywhere in the full text of Dyson,
arXiv:2511.17328, which discusses earlier pulse-existence results for this model (for example Sect. 2.2); that is absence of citation, not
evidence of content.

## Severity list

- **must-fix** (framing): cite Burlakov, Oleynik and Ponosov (2025) in the README abstract and any manuscript, and
  state why it does not cover the result (C^1 kernel assumption, S(0) > 0 outside the setting as we read Lemma 5,
  conditions (17)-(21) unverified, no explicit steepness, not computer-assisted).
- **should-fix**: cite Pinto, Jackson and Wayne (2005) as the fixed-eps result for a Heaviside S; state the novelty
  as "a smooth S at an explicit fixed eps, by computer", not "fixed eps".
- **should-fix** (unchanged by the second pass, which reached none of them): read the full texts of Zhang (2005),
  Zhang (2004 JDE), Pinto, Jackson and Wayne (2005), Sandstede (2007), Enculescu (2004) and Zhang, Math. Z. (2006)
  through a library or interlibrary loan before submission; until then QUALITY.md item 4 stays open. Priority:
  Enculescu (2004) and Zhang, Math. Z. (2006) first, since their content is entirely unknown; the other four are
  characterized by abstracts or reviews that agree with each other.
- **should-fix**: until those are read, word any priority statement as "as far as we could determine", and name
  the two uncharacterized papers in the paper's prior-art log.
- **nit**: Sandstede (2007) and Ermentrout, Jalics and Rubin (2010) are worth a sentence where the manuscript
  discusses stability and smooth-S results.

## Draft RESEARCH.md entry (applied to RESEARCH.md on 2026-09-26)

Reflects both passes.

```
### 2026-09-26  neural-field pulse with a smooth sigmoid at fixed eps: the Zhang papers, Pinto-Jackson-Wayne, Sandstede, Enculescu, and a 2025 paper the ledger missed  (session agent, two passes; `papers/nf-pulse/review/lead/priorart/`)

- Why: the entry of the same day left Zhang (2005), Zhang (2004) and Pinto, Jackson and Wayne (2005) unread before any claim of priority.
- Read in full: Burlakov, Oleynik and Ponosov, Mathematics 13 (2025) 701, doi:10.3390/math13050701 (CC BY; found through Dyson, arXiv:2511.17328v2, ref. [8]). Same model with decay sigma, eps < (sigma + 4)^-1 allowed; Theorem 3: under conditions (17)-(21) on a Heaviside pulse, "for each beta in [0, infinity), there exists a regular travelling wave solution" for continuous firing rates tending to the Heaviside. Kernel assumed C^1 (A1), so e^{-|x|}/2 is outside; the proof of Lemma 5 needs f(U) integrable, which a logistic with S(0) > 0 is not (our reading); the conditions are verified for no example; not computer-assisted.
- Read, abstracts, zbMATH reviews or the author's own later statement only: Zhang, JDDE 17 (2005), Zbl 1082.45009: Heaviside, eps = 0 and 0 < eps << 1; Zhang and Hutt, J. Appl. Anal. Comput. 4 (2014) 1-68 (open), state the same system with "The gain function is given by the Heaviside step function" (p. 4). Zhang, JDE 197 (2004) 162-196, titled "Existence, uniqueness and exponential stability of traveling wave solutions of some integral differential equations arising from neuronal networks": abstract (CORE record 82068390) and Zbl 1054.45005: scalar, Heaviside, fixed-point existence. "On stability of traveling wave solutions in synaptically coupled neuronal networks" is Zhang, DIE 16 (2003) 513-536: stability. Pinto, Jackson and Wayne, SIADS 4 (2005), full published abstract (OpenAlex, Crossref): "A Heaviside step function governs the activation", recovery rate not restricted to a singular limit, two traveling pulses in the monostable case. Sandstede, IJBC 17 (2007): spectral implies nonlinear stability. Ermentrout, Jalics and Rubin, SIAM J. Appl. Math. 70 (2010): stimulus-locked waves with a smooth rate.
- Not reached, content unknown: Enculescu, Physica D 196 (2004) 362-386 (Zbl 1049.92008, review withheld; MSC 92C20, 45K05, 92B20, 65R99); Zhang, Math. Z. 255 (2006) 283-321 (Zbl 1186.92012, review withheld; MSC 92C20, 45K05).
- Full texts sought for all six and not reached: ScienceDirect, SIAM, World Scientific and ResearchGate 403; Springer client challenge; Unpaywall, Semantic Scholar and OpenAlex closed except JDE 2004 (bronze, but the ScienceDirect PDF 403 and the CORE copy missing); author pages: Wayne (math.bu.edu) TLS failure and 503, Sandstede (bjornsandstede.com, Google Sites) captcha or login, Zhang (lehigh.edu/~liz5) no PDFs, Pinto (URI Digital Commons) from 2012 only; CiteSeerX and web.archive.org unreachable; arXiv: none of the six.
- Searches: arXiv abstracts '"neural field"' with pulse sigmoid, pulse smooth existence, "traveling pulse" sigmoidal, "travelling pulse" sigmoidal: 0 each; computer-assisted "traveling pulse": 0 (controls: computer-assisted "traveling wave" 13, '"neural field" "traveling wave" existence' 10). OpenAlex title and abstract '"neural field" "traveling pulse" sigmoidal existence' 0, '"neural field" "rigorous numerics"' 0 (control '"neural field" "traveling wave"' 115, which lists Burlakov et al.). Citers (Semantic Scholar) of Zhang 2005 (15), Pinto-Jackson-Wayne (60), Sandstede (60), Zhang JDE 2004 (96), Zhang DIE 2003 (77), Burlakov et al. (2), Enculescu 2004 (13), Zhang Math. Z. (13): nothing further. CORE by DOI and title: only JDE 2004.
- Result: open as far as reached for the specific claim (a smooth S with S(0) > 0, kernel e^{-|x|}/2, explicit eps = 1/10, proved by computer); Burlakov et al. must be cited and distinguished, and Pinto, Jackson and Wayne cited as the fixed-eps Heaviside result. Six papers are known from abstracts, reviews or classification only; Enculescu (2004) and Zhang, Math. Z. (2006) not at all.
- Re-search: no, unless a week passes; read all six through a library before any claim of priority, Enculescu (2004) and Zhang, Math. Z. (2006) first.
```
