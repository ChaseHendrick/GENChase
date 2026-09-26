# Prior-article notes, 2026-09-25 (second search): weak clusters, alpha-model zero winding, sheet continuum, N > 3 stability

Read-only; nothing written into /home/user/GENChase. PDFs in pdf/, text in txt/, raw arXiv search output s1-s5.txt.
Labels: [READ] full text or the named section read here; [API] Crossref/zbMATH record; [SNIP] search snippet
only; [LEDGER] known from RESEARCH.md / the first NOTES-2026-09-25.md; [2ND] described in a paper that was READ.
Not repeated: anything RESEARCH.md entries O, P, Q or the 2026-09-25 entries mark "Re-search: no".

## Queries run (exact)

arXiv (arxiv.org/search, abstract field unless noted): vortex collapse strong vortex weak (all); point vortex
dipole strong vortex (all); satellite vortices point vortex (all); point vortex cluster multipole expansion (all);
self-similar collapse point vortices (all); point vortices collapse asymptotic (all); vortex pair point vortex;
vortex dipole point vortex; dipole "point vortex" interaction; "point dipole" vortex; "vortex dipoles" "point
vortices"; "1+N" vortex; "restricted" "point vortex" problem; weak vortices strong vortex; small vortices large
vortex point; "vortex clusters" "point vortices"; multipole "point vortices"; tripole "point vortices"; collapse
"dominant vortex"; "dominant vortex"; collapse "point vortices" four; collapse "point vortices" "N vortices";
"vortex collapse"; collapse "point vortex" "strong"; "infinitesimal" vortices collapse; "vortex pair" "background"
point vortex asymptotic; "vortex dipole" scattering vortex; SQG point vortices; "generalized SQG" point vortices;
"generalised" "point vortices" collapse; quasi-geostrophic point vortices collapse; Reinaud self-similar;
alpha-model point vortex; "surface quasi-geostrophic" "point vortex"; point vortices self-similar; point vortex
"self-similar"; homothetic collapse vortices; point vortex relative equilibria SQG; self-similar spiral vortex
sheet; logarithmic spiral vortex sheets; "vortex sheet" "point vortex" self-similar; Kaden spiral; self-similar
vortex sheet collapse; algebraic spiral Euler self-similar; Birkhoff-Rott self-similar; vortex sheet spiral point
vortex center; stability self-similar point vortices; stability collapse point vortices; linear stability
collapsing vortices; stability "self-similar" vortex configurations; instability vortex collapse; (all fields)
point vortices collapse; point vortex collapse; vortices self-similar collapse; N-vortex problem; point vortices
spiral; author searches Kudela, "Yanovsky Tur", Kulik, "O'Neil point vortex", "singular continuation".
Crossref (query.bibliographic): the nine alpha-model / non-rotating / homothetic phrasings in the log; Kulik Tur
Yanovsky; O'Neil sheet papers; Kudela 2020 AIP. zbMATH: au:O'Neil, Kevin A. (full list) and six ti: lookups.
WebSearch (12): weak pair near strong vortex; "satellite" vortices; dipole in field of a point vortex; small
circulation perturbation collapse; tripole weak cluster; Tchieu-Kanso-Newton finite dipole; O'Neil sheet collapse
(x3); Kudela 2014 abstracts (x2); gSQG N-vortex collapse 2026; real collapse rate no rotation; N>3 linear
stability; Novikov-Sedov stability; Sakajo 2008; O'Neil clustered equilibria; Russian query (коллапс точечных
вихрей сильный вихрь слабые вихри диполь автомодельный).

## (1) Weak clusters around a strong vortex (dipole moment ~ pair tilt; lim >= sqrt(3)/2; (+,+,-) goes below)

Verdict: CLEAN in everything reached (beyond the one-pair picture already credited to Krishnamurthy-Stremler 2018).

- Kudela, Energies 14 (2021) 943, doi:10.3390/en14040943 [READ, mdpi-res.com CDN copy]: n = 50 self-similar
  collapses with 1, 2 or 4 strong vortices (Gamma = -24 or 2(-24 +- 7 sqrt 6), weak ones +1): the weak vortices
  line up on arcs ("vortex sheets"); Newton + Levenberg-Marquardt at 500 digits; continuation in H; passive tracers.
  Sect. 3 writes the spiral z_k = sqrt(1 - t/Tc) e^{-i lambda_i Tc ln(1 - t/Tc)} z_k(0) (Eq. 16) but never
  computes, bounds or discusses lambda_i Tc (our P). Weak vortices are O(1)-spaced like-signed sheets, not
  near-neutral clusters. Does not kill. Credit as the numerical picture "strong vortex + many weak ones collapse".
- Lydon, Nazarenko, Laurie, J. Phys. A 55 (2022) 385702, arXiv:2112.13365 [READ, local]: dipoles scattering on
  like-signed clusters; a C3 cluster breakup resembles a time-reversed (-2,-2,1) collapse; raises the stability of
  collapse as an open question (p. 39). No weak-cluster collapse asymptotics, no rotation.
- Drivas, Glukhovskiy, Khesin, IMRN 2024, arXiv:2401.08512 [READ intro + Thm 1.1]: a pair with separation eps,
  Gamma1 + Gamma2 = O(eps^2), (Gamma2 - Gamma1)/eps = O(1) moves as a charged particle (charge 1/(2 pi eps^2),
  field Gamma1 + Gamma2) on a surface. Same scaling as our weak pair (net circulation ~ eps^2), but no external
  point vortex and no collapse. Nearest-neighbour credit for the scaling, not a kill.
- Yanovsky, Tur, Kulik, Phys. Lett. A 373 (2009) 2484, arXiv:1112.2862 [READ grep]: point vortices + point
  dipoles; no self-interaction for a point dipole, so no self-propulsion (a different limit from ours); vortex +
  dipole integrable. Kulik-Tur-Yanovsky, Theor. Math. Phys. 162 (2010) 383-400, doi:10.1007/s11232-010-0030-6
  [API only] "Interaction of point and dipole vortices": unread; same model, so the same limit issue.
- Leoncini, El Kettani, Ugalde, arXiv:2609.25989 (22 Sep 2026) [READ grep of Sect. B]: split vortices by reverse
  collapse; perturbative expansion in the size eps of a small triple whose net circulation equals its parent
  (monopole clusters) -> "shadowing". Cluster expansion, but monopole clusters, no collapse winding. Credit only.
  Leoncini et al., "Offsprings of a point vortex", EPJB 82 (2011) 173, arXiv:1010.0594 [API abstract].
- Zbarsky, arXiv:2402.07316 [READ grep, Cor. 16]: each vortex of a self-similarly expanding triple replaced by a
  small cluster whose diameter stays <= t^a, a < 1/2. Clusters of O(1) mass; no winding.
- Dominant-vortex (1+N) relative equilibria: Barry and Hoyer-Leitzel, SIADS 15 (2016) 1783, arXiv:1508.07520
  [READ grep: no collapse]; Hoyer-Leitzel and Le, arXiv:2004.08437 [API abstract]; O'Neil, "Singular continuation
  of point vortex relative equilibria on the plane and sphere", Nonlinearity 26 (2013) 777-804 [API, zbMATH
  summary: clustered relative equilibria with several scaling regimes]; O'Neil, "Clustered equilibria of point
  vortices", RCD 16 (2011) 555-561 [API only]. All relative equilibria, none collapse.
- Also not relevant: Tchieu-Kanso-Newton finite dipoles (constant spacing) [SNIP]; Anurag-Goodman-O'Grady
  arXiv:2403.10383 and Anurag-Goodman arXiv:2504.16038 (three vortices) [API abstracts].
- Ledger: one line. "Weak clusters around a strong vortex: no source reached treats near-neutral clusters as
  dipoles in collapse or bounds the winding; Kudela 2021 (Energies) and DGK 2024 are the nearest, credit only."

## (2) Zero-winding (kappa real) phase diagram in the alpha-models, alpha*(N), N_min(alpha), alpha_inf ~ 0.7

Verdict: CLEAN in everything reached.

- All alpha-model collapse papers reached are N = 3: Badin-Barry 2018 [READ earlier], Reinaud 2021 and
  Reinaud-Dritschel-Scott 2022 [LEDGER], YOI 2021, Iwayama-Yajima 2023, IYW 2025, Chen-Liu 2024 [LEDGER, READ].
  Grotto-Pappalettera, Nonlinearity 38 (2025) 105020, arXiv:2505.19782 [READ grep]: N-vortex bursts/collapses
  built from a three-vortex self-similar one (not self-similar for N > 3); no rotation statements beyond Prop 2.1.
- Donati-Godard-Cadillac [READ earlier]: self-similar collapses for all alpha exist (App. A), three-vortex.
  Godard-Cadillac, arXiv:2101.11258 [READ grep]: improbability of collapse, trajectory bounds; nothing on rotation.
- Continuum gSQG: Garcia-Gomez-Serrano arXiv:2207.12363 (self-similar spirals, continuous vorticity) [API
  abstract]; Mancho arXiv:0902.0706 (alpha-patch filament collapse) [API abstract]. Different objects.
- Crossref and arXiv phrasings for non-rotating / homothetic / purely radial collapse return only N = 3 papers.
  WebSearch surfaced GENChase's own PR #143 (not prior art).
- Ledger: "alpha-model zero-winding phase diagram (alpha*(N), least N, alpha_inf): nothing N > 3 in the alpha
  models except Grotto-Pappalettera's non-self-similar constructions; clean in reach."

## (3) Continuum limit: a vortex sheet plus point vortices collapsing self-similarly

Verdict: PARTLY ANTICIPATED (existence, numerically).

- O'Neil, "Collapse and concentration of vortex sheets in two-dimensional flow", Theor. Comput. Fluid Dyn. 24
  (2010) 39-44, doi:10.1007/s00162-009-0106-9; also IUTAM Bookseries 20 (2009) 55-60, doi:10.1007/978-90-481-
  8584-9_6 [API + SNIP abstract: "numerical evidence for the existence of collapse configurations of vortex
  sheets ... using point vortices to approximate the vortex sheets"; 2ND via Kudela 2021 (READ), p. 2: "the
  numerical algorithm for the collapse of the vortex sheets accompanied by a strong vortex was given ... the shape
  of vortex sheet was initially presumed and then it was replaced by identical weak point vortices ... the
  algebraic system resulting from the point vortex approximation of the Rott-Birkhoff equation for vortex sheet,
  together with some invariant of motion was solved"]. Springer full text blocked (JS challenge); zbMATH review
  withheld. MUST READ before any claim: it is the direct precursor. Whether it states a continuum (integral-
  equation) formulation, the sheet density, or the rotation rate is unknown.
- Kudela 2021 Energies [READ]: numerical sheets form spontaneously with strong vortices (see (1)).
  Kudela, "Collapse of n-vortices, vortex sheets and coherent structures", AIP Conf. Proc. 2293 (2020) 420048,
  doi:10.1063/5.0027013 [API only].
- O'Neil, Physica D 238 (2009) 379 (relative equilibria of sheets) [2ND via Protas-Sakajo arXiv:1906.03803];
  O'Neil, Phys. Fluids 30 (2018) 107101 (point vortices + linear sheets, relative equilibria) and RCD 23 (2018)
  519-529 (dipole/multipole flows with point vortices and sheets) [API]: exact methods for sheet + point vortex
  equilibria (rotating/steady), not collapse.
- Expanding/infinite spiral sheets, all different from a finite (T - t)^{1/2} collapse: Kaden 1931, Pullin 1978,
  Alexander 1971 [2ND]; Elling arXiv:1308.0881 (Kaden approximates the inner turns by a point vortex) [READ intro];
  Cieslak-Kokocki-Ozanski arXiv:2110.07543 (log spirals; time reversal u(t,x) = v(t0 - t, -x) used for
  non-uniqueness) [READ grep]; Jeong-Said arXiv:2302.09447 [API abstract]; Cho 2312.02072; Shao-Wei-Zhang
  2305.05182, 2505.03309; Choi 2507.05059; Bieganowski-Cieslak-Siemianowski 2305.15356 (no "collapse" in text).
  Davila-del Pino-Musso-Parmeshwar arXiv:2410.18220: smooth desingularized expanding self-similar point-vortex
  spirals [API abstract]. Chen-Walsh-Wheeler arXiv:2506.04093: self-similar implosion of hollow vortices [API].
- Ledger: "Sheet + point vortex self-similar collapse: numerically anticipated by O'Neil TCFD 24 (2010) 39-44
  (unread, blocked) and Kudela, Energies 14 (2021) 943 (read); any exact continuum statement must be checked
  against O'Neil 2010 first."

## (4) Linear stability of self-similar collapse for N > 3

Verdict: CLEAN for any linear analysis; one numerical precursor to credit.

- N = 3 only: Tavantzis-Ting 1988, Leoncini et al. 2000, Iwayama-Yajima 2023 [LEDGER, READ]; Grotto-Pappalettera
  2020/2025 "Hypothesis A" linearizes around a three-vortex self-similar solution [READ grep]; Hirakui-Yajima
  (Adv. Math. Phys. 2021; Mathematics 13 (2025) 126) Jacobi-field classification, three vortices [SNIP/API].
- Explicitly open: Zbarsky arXiv:2402.07316, p. 20: "if one obtained stability for some self-similarly expanding
  system of more than three point vortices, one would then obtain a result corresponding to Corollary 16"
  [READ]. Lydon-Nazarenko-Laurie 2022, p. 39: "This poses questions of stability of the vortex collapse
  solution" [READ].
- Numerical precursor: Lewkowicz-Kudela arXiv:1512.05116 [READ, local], seven vortices: the collapse scale grows
  with the working precision (table, Fig. 6), "a feature of the dynamical system and not caused by the
  inaccuracy of numerical computations". No eigenvalues. Credit as qualitative evidence of instability.
- Sakajo, PRE 78 (2008) 016312 [SNIP abstract]: partial non-self-similar four-vortex collapse on the sphere,
  "robust" to perturbations within the integrable set. Different question.
- Gotoda 2021/2024, Lewkowicz 2011, HGL 2006, Yu 2023, Kudela 2014 abstracts: no stability analysis [READ grep /
  SNIP]. Kudela JNS 24 (2014) and FDR 46 (2014) full texts still unread.
- Ledger: "Linear stability of N > 3 self-similar collapse: open in everything reached (Zbarsky 2024 states it
  as missing); credit Lewkowicz-Kudela 2015 for the numerical sensitivity of a seven-vortex collapse."

## Hosts this run

Worked: arxiv.org (search, abs, pdf); api.crossref.org; api.zbmath.org; mdpi-res.com (MDPI CDN PDFs; www.mdpi.com
itself 403). Blocked: www.mdpi.com 403; link.springer.com JS challenge (also with cookie jar); paperity.org 403;
web.archive.org CDX connection reset; wayback availability API returned nothing for MDPI URLs.
