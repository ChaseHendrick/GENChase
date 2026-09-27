# Prior-art check: the four sources README.md names as unread or unreached

Date: 2026-09-26. Checker: a session agent working as prior-art reviewer, with no part in the proof.

Claim being checked (from `README.md`): a computer-assisted proof of a fast travelling pulse of
u_t = -u - v + w * S(u), v_t = eps (u - gamma v), w = e^(-|x|)/2, logistic S with beta = 20, theta = 1/4,
eps = 1/10 (fixed, not small), gamma = 0.

No PDF or full text is saved in the repository. Downloads went to the session scratchpad only. Quotes below are
a sentence or less.

## Summary

| Source | What was reached | Model and firing rate | eps | Covers a smooth S at fixed eps (beta 20, theta 1/4, eps 0.1)? |
|---|---|---|---|---|
| (a) Zhang, J. Dyn. Differ. Equ. 17 (2005) 489-522, doi:10.1007/s10884-005-5404-3 | Pages 489-490 only (Springer first-page preview): abstract, keywords, start of Sect. 1. The model section and theorems were **not reached**. | A system "with two integral terms"; every model shown on p. 490 uses the Heaviside H(u - theta). Faye (2013) lists it among Heaviside papers. | Title says "singularly perturbed"; the eps regime of its theorems not reached. | Nothing seen suggests it; not settled from the primary source (Sects. 2 onward not reached). |
| (b1) Zhang, J. Differential Equations 197 (2004) 162-196, doi:10.1016/S0022-0396(03)00170-0 | Abstract only (CORE record from the Elsevier connector). Full text **not reached**: ScienceDirect refused (403, Cloudflare), the CORE blob is missing, the Elsevier API needs a key. | Per secondary sources: the scalar equation u_t = f(u, w) + alpha K * H(u - theta) with the Heaviside step; fronts. | Not reached. | No, as far as the abstract and two secondary readings show; the paper itself not read. |
| (b2) Zhang, Differential Integral Equations 16 (2003) 513-536, doi:10.57262/die/1356060624 | Abstract only (Project Euclid page through a fetch tool; the PDF was blocked by an Incapsula challenge). | Stability, not existence; Guo (2012) says its Evans function is for "zero gain (the Heaviside gain function)". | Not reached. | No (it is a stability paper). |
| (b3) Zhang, Acta Math. Appl. Sinica Engl. Ser. 20 (2004) 283-308, doi:10.1007/s10255-004-0168-9 | Pages 283-284 (Springer first-page preview). | Stability of the fast pulse; the displayed model class on p. 284 has H(u - theta). | Singularly perturbed. | No: its subject is stability, not existence. |
| (c) Pinto, Jackson and Wayne, SIAM J. Appl. Dyn. Syst. 4 (2005) 954-984, doi:10.1137/040613020 | Abstract (publisher abstract via OpenAlex). Full text **not reached** (closed; no repository copy found; the Boston University page returned 503). | Heaviside, stated in the abstract. | Not assumed small ("no other assumptions about the recovery rate"). | No: Heaviside firing rate. |
| (d) Sandstede, Int. J. Bifurc. Chaos 17 (2007) 2693-2704, doi:10.1142/S0218127407018695 | Abstract (publisher abstract via OpenAlex). Full text **not reached** (World Scientific and ResearchGate 403; the author's site sits behind a captcha). | Stability: spectral implies nonlinear stability. Faye (2013) lists it among Heaviside papers. | Not reached. | No: it is not an existence result. |

**Conclusion.** As far as reached, none of the four is an existence proof for a pulse with a smooth firing rate at a
fixed, non-small eps, and none mentions beta = 20, theta = 1/4, eps = 0.1. Two of them, (a) Zhang 2005 and (b1)
Zhang JDE 2004, were **not read beyond their abstracts and first pages**. What we know of their content otherwise
comes from secondary sources (Faye 2013, Hao and Vaillancourt 2015, Guo 2012, Dyson 2025). Every secondary reading
agrees that Zhang's existence work uses the Heaviside step. Still, before any priority claim, Sects. 2 onward of
Zhang 2005 and the theorems of Zhang JDE 2004 have to be read. The three new searches below found nothing that
competes with the claim.

## Details, with locations

### (a) Zhang, J. Dyn. Differ. Equ. 17 (2005)

Reached: Springer "page-one" preview, pp. 489-490.

- p. 489, abstract: "A nonlinear nonlocal model arising from synaptically coupled neuronal networks with two integral
  terms is considered." Existence and stability are "established by using ideas in differential equations and
  functional analysis". The kernels it lists include "K(x) = (rho/2) exp(-rho|x|)" (our kernel with rho = 1),
  compactly supported kernels and Mexican hats.
- p. 490, Sect. 1: the models displayed (Amari; Terman's; "an alternative model with a piecewise smooth function")
  all contain H(u - theta). The page ends before the paper states its own system.
- Secondary: Faye, SIAM J. Appl. Dyn. Syst. 12 (2013), author copy
  (math.univ-toulouse.fr/~gfaye/articles/SynDepTPulseRevisedBis.pdf), p. 2: studies of (1.1) "when the firing rate
  is assumed to be a Heaviside function [9, 25, 33, 35, 42-44]", and [43] is this paper.
- Citation contexts (Semantic Scholar) quoting its later sections mention only fronts and backs ("U large front",
  "U small back-1"), consistent with a Heaviside construction. That is an inference from snippets, not a reading.
- **Not reached:** the model, the hypotheses and the theorems (pp. 491-522).

### (b) Zhang's 2003-2004 papers on this model

There are three candidates for the "Zhang (2004)" in README.md: (b1) J. Differential Equations 197 (2004) 162-196,
(b2) Differential Integral Equations 16 (2003) 513-536, which some authors cite under the JDE title (Faye 2013,
ref. [42], pairs the JDE title with the DIE venue), and (b3) Acta Math. Appl. Sinica 20 (2004) 283-308. The
existence paper is (b1).

- (b1) Abstract (CORE / Elsevier): "He applies fixed point theorems to prove the existence of the traveling waves."
  The abstract names no firing rate. Secondary: Hao and Vaillancourt, Acta Math. Appl. Sinica 31 (2015) 767-782,
  doi:10.1007/s10255-015-0504-2, p. 767 (first-page preview). Their eq. (1.1) is u_t = f(u, w) + alpha
  integral H(u - theta) K, where "H(s) is the Heaviside step function". They say "The simplified System (1.1) was
  studied by Zhang[17]" and that "the conditions given in Theorem 1 of [17] cannot ensure the existence of the
  desired solutions". Semantic Scholar links this paper as a citer of (b1). That [17] is (b1) is inferred from
  that link, since their reference list was not reached. Guo, SIAM J. Appl. Dyn. Syst. 11 (2012), doi:10.1137/120876903,
  through Semantic Scholar citation contexts: "Zhang has shown a closed form expression of the traveling front
  solution with a unique velocity for zero gain (Heaviside gain function) [57, 58]", where [58] is (b1).
  So (b1) is about fronts, not pulses, per the secondary sources.
- (b2) Abstract (Project Euclid): "The author is concerned with the asymptotic stability of traveling wave solutions
  of integral differential equations arising from synaptically coupled neuronal networks." Guo (2012): "Zhang gave
  a detailed derivation of an integral form of the Evans function for zero gain (the Heaviside gain function)".
- (b3) p. 283, abstract: "We establish the exponential stability of fast traveling pulse solutions to nonlinear
  singularly perturbed systems". p. 284, Sect. 1.1 names the class "such as ut + f(u) = alpha K * H(u - theta)".
  Existence is not its subject.

### (c) Pinto, Jackson and Wayne (2005)

Publisher abstract: "A Heaviside step function governs the activation of each neuron." They also write "We
incorporate a relatively slow local recovery variable within each neuron but make no other assumptions about the
recovery rate." So eps is not required to be small, but the firing rate is Heaviside. This matters: at a fixed
eps they are prior art for the Heaviside case, not for a smooth S. Dyson, arXiv:2511.17328v2, Sect. 2.2, p. 7:
they "showed that for positive 'bell-shaped' kernels, the fast (and slow) parameter pair (a, c) can be solved for
when theta is small", and they "did not track sub and super threshold regions beyond computationally checking".
The full text was not reached.

### (d) Sandstede (2007)

Publisher abstract: "We prove here that spectral stability of traveling waves implies their nonlinear stability in
appropriate function spaces". It is a stability paper and assumes the wave is given. Faye (2013), p. 2, puts it
([35]) in the Heaviside group. The full text was not reached, so whether its stability theorem allows a smooth S
was not checked. That does not bear on existence.

## New searches (2026-09-26)

1. **Recent citers.** Semantic Scholar citation lists of Faye and Scheel, Adv. Math. 270 (2015) (44 citers), and
   of Pinto and Ermentrout 2001 (328 citers), with titles and abstracts scanned for computer-assisted, rigorous
   numerics, interval, validated, radii polynomial, Kantorovich, enclosure, sigmoid and smooth firing. Keyword hits:
   Dyson, arXiv:1810.05142 v1 (2018; pulses only for difference-of-exponential lateral-inhibition kernels, a
   firing rate that is exactly 0 below theta and 1 above theta + tau, and eps small); Ermentrout, Jalics and Rubin,
   SIAM J. Appl. Math. 70 (2010), doi:10.1137/090775737 (a general smooth firing rate, but only stimulus-locked
   fronts and pulses, per its abstract as quoted by a search engine); and modelling papers. None is a pulse
   existence proof for a smooth S at fixed eps. Citers dated 2023 to 2026 include Dyson 2025 (Heaviside) and
   nothing rigorous with a smooth S. OpenAlex citer lists could not be run (its daily free budget was used up).
2. **Computer-assisted work on nonlocal or neural models.** Web: '"computer-assisted proof" "neural field"
   traveling wave OR pulse' returned only neural-field papers already in the ledger and arXiv:2405.12446 (transverse
   heteroclinics by the parameterization method; examples are Lorenz and a four-body problem; the PDF text never
   mentions neural models). Web: rigorous or computer-assisted travelling waves for nonlocal integro-differential
   equations (Lessard, van den Berg, Arioli, Zgliczynski) returned parabolic integrators, Swift-Hohenberg, the
   suspension bridge, a nonlocal Turing instability (J. Dyn. Differ. Equ. 2026, doi:10.1007/s10884-026-10488-0,
   by title and snippet) and Arioli and Koch on FitzHugh-Nagumo. No neural-field pulse. arXiv abstract search
   (search page; the export API returned 406): "computer-assisted traveling pulse", "computer-assisted proof
   homoclinic traveling wave", "computer-assisted proof nonlocal traveling pulse", "traveling pulse sigmoidal firing
   rate": no results. "rigorous numerics neural field": 69 results, none relevant.
3. **Smooth firing rate pulse existence.** Web: existence of a travelling pulse in a neural field with a smooth sigmoid
   and linear adaptation, 2024 to 2026; and Lv and Wang with sigmoid. Only Dyson (2019-2025, Heaviside or
   compactly switched sigmoids with small eps) and modelling papers. PubMed '"neural field"[tiab] AND (pulse OR
   travelling/traveling wave) AND (existence OR proof OR rigorous)': 4 hits (Xin, Li and Wang, J. Math. Biol.
   2026, monostable fronts in periodic media; Dyson, Math. Biosci. Eng. 2019, Heaviside; two modelling papers).
   None relevant.

## Could not reach

- Zhang 2005, pp. 491-522 (Springer paywall; only the preview was open).
- Zhang, JDE 197 (2004), full text. It is bronze open access at the publisher (OpenAlex), but ScienceDirect refused
  this environment (403), and CORE's copy (core.ac.uk/download/82068390.pdf) is a dangling record.
- Zhang, DIE 16 (2003), full text (Project Euclid bot challenge).
- Pinto, Jackson and Wayne (2005) and Sandstede (2007), full texts.
- Unpaywall was not used: it rejects a placeholder email address, and the owner's address was not to be sent.
- M. Stoner, Lehigh PhD thesis 2011 (supervised by Zhang), which may summarise Zhang's results: located by title,
  not opened.

A reader with library access should read Zhang 2005, Sect. 2 onward, and Zhang JDE 2004, the statement of
Theorem 1 and its hypotheses on the nonlinearity. That is the one remaining check before a priority claim.

## Draft ledger entry for RESEARCH.md (not applied)

```
### 2026-09-26  the Zhang, Pinto-Jackson-Wayne and Sandstede papers for the nf-pulse priority check  (session agent; `review/PRIOR-ART.md`)

- Why: README.md of the paper's folder lists Zhang, J. Dyn. Differ. Equ. 17 (2005), and Zhang (2004) as unreached and Pinto, Jackson and Wayne (2005) as unread.
- Read: Zhang, JDDE 17 (2005) 489-522, pp. 489-490 only (Springer preview): "two integral terms", every displayed model has H(u - theta); Zhang, Acta Math. Appl. Sinica 20 (2004) 283-308, pp. 283-284: stability of the fast pulse, Heaviside class; abstracts of Zhang, JDE 197 (2004) 162-196 (existence "by fixed point theorems"), Zhang, DIE 16 (2003) 513-536 (stability), Pinto, Jackson and Wayne, SIADS 4 (2005) ("A Heaviside step function governs the activation of each neuron"; recovery rate not assumed small) and Sandstede, IJBC 17 (2007) (spectral implies nonlinear stability). Secondary: Faye 2013, author copy, p. 2, groups PJW, Sandstede and Zhang 2003/2005/2007 as Heaviside; Hao and Vaillancourt, AMAS 31 (2015), p. 767: Zhang's JDE model is u_t = f(u, w) + alpha K * H(u - theta), and his Theorem 1 conditions "cannot ensure the existence"; Guo, SIADS 11 (2012) (Semantic Scholar contexts): Zhang's fronts are for "zero gain (Heaviside gain function)".
- Not reached: Zhang 2005 beyond p. 490; Zhang JDE 2004, DIE 2003, PJW and Sandstede full texts (paywalls, bot challenges; the CORE copy of the JDE paper is a dead record).
- New searches: Semantic Scholar citers of Faye and Scheel (44) and Pinto and Ermentrout (328), keyword scan; web '"computer-assisted proof" "neural field"'; web and arXiv on computer-assisted travelling pulses in nonlocal equations; web on smooth-sigmoid pulse existence 2024-2026; PubMed "neural field" with pulse or travelling wave and existence, proof or rigorous (4 hits). Nothing relevant beyond Dyson (Heaviside, or a compactly switched sigmoid with small eps).
- Result: as far as reached, no existence proof of a pulse with a smooth firing rate at fixed, non-small eps; nothing at beta = 20, theta = 1/4, eps = 0.1. The Zhang 2005 theorems and Zhang JDE 2004 Theorem 1 remain unread in the original; every secondary source reached places them in the Heaviside case.
- Re-search: no, unless a week passes; read Zhang 2005 (Sect. 2 onward) and Zhang JDE 2004 (Theorem 1) with library access before any claim of priority.
```

## Third pass (2026-09-27)

Checker: a session agent checking the literature of the manuscript draft (`paper/nf-pulse.tex`), with no part in the
proof; the ledger entry is RESEARCH.md, 2026-09-27. Sources downloaded to the session scratchpad only: the author copies
of Pinto and Ermentrout (2001) and Faye (2013), Burlakov et al. (2025, CC BY), and arXiv 1311.6508v1, 1503.04057v2,
2511.17328v2, 1810.05142v1 and 2412.03613v1. Crossref confirmed the bibliographic data of every DOI in the draft.

- **Zhang's papers** (Springer first-page previews): J. Dyn. Differ. Equ. 17 (2005), pp. 489-490, Heaviside (zbMATH
  Zbl 1082.45009: eps = 0 and 0 < eps << 1); Math. Z. 255 (2007; online 29 July 2006), pp. 283-284, fronts of a scalar
  Heaviside equation and standing waves of the forced system; Acta Math. Appl. Sin. 20 (2004), pp. 283-284, exponential
  stability of fast pulses, class u_t + f(u) = alpha K * H(u - theta). J. Differential Equations 197 (2004): scalar
  fronts with the Heaviside H (Zbl 1054.45005; CORE abstract). None covers a smooth S.
- **Pinto, Jackson and Wayne (2005)**: Heaviside rate, fixed eps, a fast and a slow pulse (abstract, p. 954; Dyson,
  arXiv:2511.17328v2, pp. 7-8). The fixed-eps precedent for the Heaviside rate; cited beside the priority statement.
- **Habib and Veltz, arXiv:2412.03613v1 (4 Dec 2024), new, read in full:** Theorem 1 (printed p. 7), a principle of
  linearized stability (exponential orbital stability in L^2) for travelling waves of a two-population Wilson-Cowan
  field u_t = -L0 u + L0 S(W u - theta) (eqs. (1)-(2), printed p. 3), S of class C^{r+1}, r >= 2 (Hypothesis 1), W^{1,1}
  kernels (Hypothesis 3). Not the Pinto-Ermentrout form; cited where nonlinear stability is discussed. It calls the
  principle "conjectured in [Fay18]" (printed pp. 2 and 7) and cites Sandstede only for the 2002 handbook chapter.
- **Sandstede (2007), unread.** Faye lists it among Heaviside studies (author copy, p. 2) and invokes it for a smooth
  rate (p. 17); Dyson, arXiv:1810.05142v1, p. 29: "single Heaviside firing rates". Its scope for this model is unknown.
- **Enculescu (2004), unread.** Citing contexts (Coombes 2005; Yimprayoon 2008: "the high-gain limit for the firing
  rate function") and OpenAlex tags suggest a Heaviside or high-gain construction.
- **Dyson, arXiv:1810.05142v1 (2018)**: Theorem 1.4 (p. 9), a fast pulse for eps sufficiently small, with steep smooth
  rates (0 below theta, 1 above theta + tau) and a difference-of-exponentials kernel. Its published version (SIAM J.
  Appl. Dyn. Syst. 19 (2020) 2194-2231) is retitled for fronts. Cited among the small-eps results.
- **Hastings (2017)**: Theorem 2 (p. 5) reduces the existence of two pulses at a given eps in Faye's model to properties
  of two solutions at a speed c1, one of the fast system (2.2) and one of the full system (2.1) (Remark 2, p. 6; this
  entry said "one orbit" until the reading of 2026-09-27 corrected it); Remark 3 (p. 6): Faye's Hypothesis 3.1 "can
  only be checked by numerically solving the system (2.2)", as far as Hastings knows;
  Remark 2 and footnote 4 (p. 6): a standard solver "suggests" (eps, c1) = (.005, .34); Sect. 4.5 outlines an
  interval-arithmetic check that he did not carry out.
- **Burlakov, Oleynik and Ponosov (2025)**: p. 7, "Our approach allows us to omit this restriction" (sigma = 0 is
  allowed); Fig. 2 (p. 8) uses sigma = 0, 1, 2 at eps = 0.1, Fig. 3 (p. 12) sigma = 0, eps = 0.1. The manuscript's
  earlier argument that their model needs sigma > 0 was wrong and is removed; the distinction rests on the C^1 kernel
  (A1), the integrability in the proof of their Lemma 5 (our reading) and conditions (17)-(21) verified for no example.

Result: no earlier proof of a pulse of this model for a given smooth S at an explicit, non-small eps, no
computer-assisted neural-field pulse, and no proof of spectral stability of such a pulse, as far as reached.

### Quotations in the manuscript, with their places

Checked verbatim against the sources in this pass (the page numbers are those the manuscript cites):

- Pinto and Ermentrout (2001), author copy: p. 209, "the ability to construct solutions is, at present, restricted to
  asymptotic approximations"; Sect. 3.1, p. 215, "we need not assume eps is small"; Fig. 5 caption, p. 215, the
  sigmoid "(1/2)(1+tanh(6(u-theta)))" "with the same linear slope as L"; Fig. 7 caption, p. 217, "g(a, c) was
  described numerically by fixing c at different values and taking a as a shooting parameter".
- Faye (2013), author copy of 5 September 2013: p. 2, the studies of (1.1) "when the firing rate is assumed to be a
  Heaviside function [9, 25, 33, 35, 42-44]"; p. 17, "the results for neural field equations of Sandstede [35]";
  Sect. 5, p. 27, Pinto and Ermentrout "have constructed the singular traveling solution for eps = 0, but not proved
  that it persists for small positive value of eps".
- Faye and Scheel, arXiv:1311.6508v1: p. 3, "does not affect the techniques we employ here"; Theorem 1, p. 6, "for
  every sufficiently small eps > 0".
- Hastings, arXiv:1503.04057v2, p. 2: "While some partial results have been obtained recently by Scheel and Faye (see
  Section 4), we are not aware of any existence proof for pulses which covers all reasonable smooth functions S", and
  "it is feasible to check existence rigorously for particular positive values of eps > 0, using precise numerical
  analysis based on interval arithmetic, but we have not carried out such a check".
- Dyson, arXiv:2511.17328v2: abstract, p. 1, "a long-standing open problem"; Discussion, p. 26, "Consider the same
  problem, but with sigmoidal activation. Closed form is not available so we cannot track a formal solution near the
  singular homoclinic orbit".
- Dyson, arXiv:1810.05142v1, p. 29: Sandstede "proved that spectral stability implies nonlinear stability for neural
  field models with single Heaviside firing rates" (also checked in the arXiv PDF by the manuscript's writer).
- Burlakov, Oleynik and Ponosov (2025): p. 2, "can be specified as 0 < eps < (sigma + 4)^-1"; p. 14, Theorem 3.
- Pinto, Jackson and Wayne (2005), abstract, p. 954: "A Heaviside step function governs the activation of each
  neuron", "make no other assumptions about the recovery rate", "we demonstrate the existence of two traveling pulse
  solutions", "our results suggest that fast pulses are stable".
- Sandstede (2007), abstract, p. 2693: "We prove here that spectral stability of traveling waves implies their nonlinear
  stability in appropriate function spaces".
- Habib and Veltz, arXiv:2412.03613v1, Theorem 1, printed p. 7: "exponentially and asymptotically orbitally stable in
  L2" (also checked in the arXiv PDF by the manuscript's writer).

### Correction of 2026-09-27 (in-project reading of the manuscript)

- Faye (2013), author copy, p. 2, cites "[9, 25, 33, 35, 42-44]" for the Heaviside studies. Its reference [44] is
  L. Zhang, "How do synaptic coupling and spatial temporal delay influence traveling waves in nonlinear nonlocal
  neuronal networks?", SIAM J. Appl. Dyn. Syst. 6 (2007) 597-644, doi:10.1137/06066789X (Crossref: vol. 6, issue 3,
  published online 1 August 2007), not Zhang, Math. Z. 255 (2007), which Faye does not cite there. [42] pairs the title
  of Zhang, J. Differential Equations 197 (2004) with the venue Differential Integral Equations 16 (2003); [43] is Zhang,
  J. Dyn. Differ. Equ. 17 (2005). The earlier line above that says Faye groups "Zhang 2003/2005/2007" means these three
  entries. Read of the SIADS 2007 paper: its Crossref abstract only ("existence, uniqueness, and stability of the
  traveling wave of a nonlocal model equation which incorporates spatial temporal delay due to the finite propagation
  velocity of action potentials along axons"; pure excitation, lateral inhibition or lateral excitation; a speed index
  function and a stability index function). A scalar model with delay, listed by Faye among the Heaviside studies; it
  does not bear on the priority statements. The manuscript cites it and no longer attributes Math. Z. 255 to Faye's list.
