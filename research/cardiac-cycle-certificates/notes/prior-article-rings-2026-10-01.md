# Prior-article search: cardiac cell and ring certificates (Hill / Fourier route)

Date: 2026-10-01. Scope: complements the RESEARCH.md entries of 2026-09-30 and 2026-10-01 ("cardiac cell and ring
certificates"); the searches logged there were not repeated. Only references whose metadata I saw in a search result,
a Crossref record, an arXiv API record or a PubMed record are listed. "Abstract only" means the full text was not read.

## Q1. Computer-assisted proofs of periodic orbits in detailed ionic cardiac models

Verdict: nothing found, in addition to the 2026-10-01 ledger's 30-odd searches. No computer-assisted proof of a
periodic orbit or its stability in any ten Tusscher-Panfilov, Luo-Rudy, Beeler-Reuter, Fenton-Karma or
Mitchell-Schaeffer model was found.

Simple models (note separately): FitzHugh-Nagumo traveling-wave periodic orbits, Czechowski-Zgliczynski 2016
(arXiv:1502.02451, already in the ledger) and Arioli-Koch 2015 (ledger, not opened).

Numerical (non-rigorous) TP06 bifurcation work that the cell certificate must credit (found this session, metadata
verified on Crossref or PubMed):
- A. H. Erhardt, S. Solem, "Bifurcation Analysis of a Modified Cardiac Cell Model", SIAM J. Appl. Dyn. Syst. 21(1)
  (2022) 231-247, doi:10.1137/21M1425359. arXiv:2105.05544 has the same abstract under the title "Analysis and
  simulation of a modified cardiac cell model gives accurate predictions of the dynamics of the original one" (a
  17-dim TP06 reduction, bifurcations linked to EADs). That the arXiv paper and the SIADS paper are the same work is
  an inference from the authors and abstract; check before citing.
- A. H. Erhardt, S. Solem, "On complex dynamics in a Purkinje and a ventricular cardiac cell model", Commun.
  Nonlinear Sci. Numer. Simul. 93 (2021) 105511, doi:10.1016/j.cnsns.2020.105511 (arXiv:2005.07070). Abstract read:
  EADs and chaos in a modified ventricular model under reduced I_Kr and enhanced I_CaL; monodomain simulations.
- A. H. Erhardt, Front. Phys. 13 (2025) 1569121, doi:10.3389/fphy.2025.1569121 (already in the ledger, read in full).
- P. Kugler, A. H. Erhardt, M. A. K. Bulelzai, PLoS One 13(12) (2018) e0209498, doi:10.1371/journal.pone.0209498
  (EADs as mixed-mode oscillations, folded node; PubMed abstract).
- P. Kugler, M. A. K. Bulelzai, A. H. Erhardt, BMC Syst. Biol. 11 (2017) 42, doi:10.1186/s12918-017-0422-4 (period
  doubling cascades of limit cycles as precursors to chaotic EADs; PubMed abstract).

Searches (this session):
- arXiv API: 'abs:"ten Tusscher" AND (abs:ring OR abs:"Hopf" OR abs:"periodic orbit")' (0);
  'au:Erhardt AND (abs:cardiac OR abs:afterdepolarizations)' (2: 2105.05544, 2005.07070).
- PubMed: 'Erhardt AH[Author] AND (cardiac OR afterdepolarization OR ventricular)' (2: 30596698, 28376924).
- WebSearch: 'Erhardt Solem "Analysis and simulation of a modified cardiac cell model gives accurate predictions of
  the dynamics of the original one" journal'; 'André H. Erhardt early afterdepolarisations cable ring reentry
  bifurcation TP06 tissue' (found doi:10.1137/21M1425359).

Suggested credit: "Erhardt and Solem [SIADS 2022; CNSNS 2021] and Erhardt [Front. Phys. 2025] analysed reduced TP06
models by numerical continuation; the orbit certified here lies on the branch their computations predict. We know of
no earlier computer-assisted proof for a periodic orbit of a detailed ionic cardiac cell model (searches of 2026-09-30
and 2026-10-01, logged in RESEARCH.md)."

## Q2. Computer-assisted proofs of rotating waves / discrete traveling waves / periodic solutions in rings or lattices

Verdict: found nothing that proves a rotating wave (discrete traveling wave) in a ring of coupled ODE cells by a
computer-assisted method, with or without stability. Closest prior work (each verified on Crossref or arXiv):

- K. E. M. Church, J.-P. Lessard, "Rigorous verification of Hopf bifurcations in functional differential equations of
  mixed type", Physica D 429 (2022) 133072, doi:10.1016/j.physd.2021.133072. Computer-assisted Hopf bifurcation proofs
  in MFDEs (the equation class of a lattice traveling-wave profile). Abstract only (seen in search result). Closest
  methodological precedent for treating an MFDE with validated numerics; it is about Hopf points, not about rings of
  conductance-based cells.
- G. Arioli, H. Koch, "Traveling wave solutions for the FPU chain: a constructive approach", Nonlinearity (2020),
  doi:10.1088/1361-6544/ab6a78, arXiv:1903.01299. Computer-assisted traveling waves of a lattice (infinite chain)
  via the profile equation; no stability; Hamiltonian lattice, not a ring of oscillators. Abstract only.
- M. Gameiro, J.-P. Lessard, "A posteriori verification of invariant objects of evolution equations: periodic orbits
  in the Kuramoto-Sivashinsky PDE", SIAM J. Appl. Dyn. Syst. 16(1) (2017) 687-728, doi:10.1137/16M1073789. Space-time
  Fourier radii-polynomial existence of periodic orbits; then "an associated eigenvalue problem is solved and Floquet
  exponents are rigorously computed, yielding proofs that some periodic orbits are unstable" (abstract, Crossref).
  This is the closest precedent for the existence-plus-Floquet-exponent route of design D; it proves instability, not
  stability, and is a PDE, not a ring.
- K. E. M. Church, J.-Y. Dai, O. Henot, P. Lappicy, N. Vassena, "Global continuation of stable periodic orbits in
  systems of competing predators", SIAM J. Appl. Dyn. Syst. 25(3) (2026) 1697-1725 per the search result,
  doi:10.1137/25M1748275, arXiv:2504.03058. Computer-assisted families of stable periodic orbits; how stability is
  certified is not stated in the abstract (not verified). Not a ring.
- M. Beck, J. Jaquette, "Validated spectral stability via conjugate points", arXiv:2105.06895 (validated spectral
  stability of nonlinear waves; journal version not checked).
- B. Barker, K. Zumbrun, "Numerical proof of stability of viscous shock profiles", Math. Models Methods Appl. Sci.
  26 (2016) 2451-2469, doi:10.1142/S0218202516500585 (rigorous numerical stability of a single shock; not periodic).
- Analytical (not computer-assisted) lattice results: H. J. Hupkes, B. Sandstede, "Traveling pulse solutions for the
  discrete FitzHugh-Nagumo system", SIAM J. Appl. Dyn. Syst. 9 (2010) 827-882, doi:10.1137/090771740; "Stability of
  pulse solutions for the discrete FitzHugh-Nagumo system", Trans. AMS 365 (2013) 251-301,
  doi:10.1090/S0002-9947-2012-05567-x.
- Seen but scope not verified: Hua, Liu, "Existence of periodic traveling wave solutions in a coupled Chua's circuit",
  Z. Angew. Math. Phys. 77 (2026) 196, doi:10.1007/s00033-026-02848-z (no abstract retrieved; whether it is
  computer-assisted is unknown). Read before submission.
- Already in the ledger: Kapela-Zgliczynski choreographies (math/0304404, cyclic-shift symmetry in a CAP), Bramburger
  rotating waves on lattices (1603.02717, 1909.12427), Kuehn-Queirolo RNNs (2202.05073).

Searches (this session):
- WebSearch: 'computer-assisted proof traveling waves lattice differential equation mixed-type functional
  differential equation rigorous numerics'; 'rigorous computation rotating waves ring coupled oscillators Z_N
  symmetry periodic orbits computer-assisted proof Fourier'; 'computer-assisted proof stability periodic orbit Floquet
  multipliers Fourier series radii polynomial eigenvalue enclosure'; '"Rigorous verification of Hopf bifurcations in
  functional differential equations of mixed type" arXiv authors'; 'van den Berg Hupkes computer-assisted proof
  travelling waves lattice FitzHugh-Nagumo discrete'; 'Barker Zumbrun rigorous computer-assisted verification spectral
  stability periodic traveling waves Floquet-Bloch'; 'computer-assisted proof spatio-temporal periodic solution
  Fourier space-time rigorous numerics stability Floquet exponents parabolic PDE Kuramoto-Sivashinsky'; 'rigorous
  numerics discrete rotating waves network coupled cells equivariant periodic orbit validated computation Lessard
  Church'; 'Gameiro Lessard "periodic orbits in the Kuramoto-Sivashinsky PDE" a posteriori verification Floquet
  exponents SIAM'; 'Church "Global continuation of stable periodic orbits in systems of competing predators"
  Floquet'; '"computer-assisted" proof periodic traveling waves "lattice" OR "chain" coupled oscillators existence
  stability interval arithmetic discrete Nagumo'; 'rigorous computer-assisted proof periodic orbits network of coupled
  neurons ring Hodgkin-Huxley OR Morris-Lecar OR FitzHugh-Nagumo synchronization stability'; 'Hupkes Lessard OR "van
  den Berg" rigorous computation lattice travelling wave MFDE computer-assisted'; '"computer-assisted proof" "ring"
  "coupled" periodic orbit "rotating wave" OR "traveling wave" OR "phase-locked" 2023 OR 2024 OR 2025 OR 2026'.
- arXiv API: 'abs:"discrete traveling wave" OR abs:"discrete travelling wave" OR abs:"discrete traveling waves"' (9,
  none rigorous); '(abs:"computer-assisted" OR abs:"rigorous numerics") AND (abs:"coupled oscillators" OR abs:"coupled
  cells" OR abs:"ring of")' (24, none relevant); '(abs:"computer-assisted" OR abs:"rigorous numerics") AND
  abs:"lattice differential equation"' (0); '(abs:"computer-assisted" OR abs:"rigorous numerics") AND abs:"rotating
  wave"' (1, irrelevant); '(abs:"computer-assisted" OR abs:"interval arithmetic") AND (abs:"orbital stability" OR
  abs:"orbitally stable") AND abs:"periodic orbit"' (0). The arXiv API returns few hits for long OR queries; treat
  these zero counts as weak evidence.

Suggested credit: "Space-time Fourier existence proofs with a posteriori Floquet exponents follow Gameiro-Lessard
(2017) and the framework of Figueras-Gameiro-Lessard-de la Llave (2017); MFDEs have been treated with validated
numerics by Church-Lessard (2022), and lattice traveling waves by computer-assisted proof by Arioli-Koch (2020). We
found no computer-assisted proof of a rotating wave in a ring of coupled cells in the searches logged."

## Q3. Exact citations requested

All four confirmed (Crossref record or the publisher PDF seen):
- R. Castelli, J.-P. Lessard, "Rigorous numerics in Floquet theory: computing stable and unstable bundles of periodic
  orbits", SIAM J. Appl. Dyn. Syst. 12(1) (2013) 204-245, doi:10.1137/120873960, arXiv:1112.4874. Abstract read:
  solves for R and the Fourier coefficients of Q in Phi(t) = Q(t) e^{Rt} by contraction, without rigorous integration.
  Companion: Castelli, Lessard, Mireles James, "Parameterization of invariant manifolds for periodic orbits (I):
  efficient numerics via the Floquet normal form", SIAM J. Appl. Dyn. Syst. 14(1) (2015) 132-167 (from search result;
  DOI not checked).
- J.-L. Figueras, M. Gameiro, J.-P. Lessard, R. de la Llave, "A framework for the numerical computation and a
  posteriori verification of invariant objects of evolution equations", SIAM J. Appl. Dyn. Syst. 16(2) (2017)
  1070-1088, doi:10.1137/16M1073777, arXiv:1605.01086. Note: the framework is for semilinear PDEs with preconditioned
  zero-finding problems; "non-polynomial nonlinearities" is not its title or stated focus. Do not describe it that way
  without checking the text.
- M. A. Johnson, K. Zumbrun, "Convergence of Hill's method for nonselfadjoint operators", SIAM J. Numer. Anal. 50(1)
  (2012) 64-78, doi:10.1137/100809349 (first page read). Caveat: it proves convergence in location and multiplicity
  for spatially periodic ODE operators L = sum (d_x)^j a_j(x) with symmetric positive definite principal coefficient,
  via a 2-modified Fredholm determinant; it gives no explicit error bounds and does not cover the first-order
  operator d/dt - A(t) of a time-periodic Floquet problem. Cite it as background for Hill truncation, not as the
  justification for a rigorous enclosure.
- Newly found and directly relevant: F. Bayer, R. I. Leine, "Explicit error bounds and guaranteed convergence of the
  Koopman-Hill projection stability method for linear time-periodic dynamics", J. Nonlinear Sci. 36(3) (2026) 64,
  doi:10.1007/s00332-026-10287-3, arXiv:2503.21318. Abstract: "the first explicit error bound for the truncation error
  of the Koopman-Hill projection method" for linear time-periodic systems with exponentially decaying Fourier
  coefficients, enabling "conservative but reliable inference of Floquet multipliers". This is the closest precedent
  for a rigorous Hill-truncation bound for Floquet multipliers and must be cited and compared with the project's
  block-resolvent small-gain tail.
- Symmetry: M. Golubitsky, I. Stewart, "Hopf bifurcation in the presence of symmetry", Arch. Rational Mech. Anal. 87
  (1985) 107-165, doi:10.1007/BF00280698. M. Golubitsky, I. Stewart, D. G. Schaeffer, Singularities and Groups in
  Bifurcation Theory, Vol. II, Appl. Math. Sci. 69, Springer, 1988, doi:10.1007/978-1-4612-4574-2; per a search
  result, Chapter XVIII "Further examples of Hopf bifurcation with symmetry" contains the section "Oscillations of
  identical cells coupled in a ring" (chapter number from a search snippet, not verified in the book). M. Golubitsky,
  I. Stewart, The Symmetry Perspective, Progress in Math. 200, Birkhauser, 2002, ISBN 3-7643-6609-5; its chapter
  "Hopf bifurcation with symmetry" is pp. 87-122, doi:10.1007/978-3-0348-8167-8_4 (Crossref).
- Symmetry-adapted Floquet: A. M. Rucklidge, M. Silber, "Bifurcations of periodic orbits with spatio-temporal
  symmetries" (title corrected on 2026-10-01 against Crossref; an earlier version of this note had "Instabilities"), Nonlinearity 11 (1998) 1435-1455, doi:10.1088/0951-7715/11/5/015, arXiv:patt-sol/9704002. Abstract:
  Z_n spatio-temporal symmetry forces the return map to be M = G^n. B. de Wolff, "Equivariant Pyragas control of
  discrete waves", SIAM J. Math. Anal. 55 (2023) 6707-6739, doi:10.1137/22M1527143, arXiv:2210.02211 (abstract:
  "an adaptation of Floquet theory to systems with symmetries" for discrete waves).

Searches: 'Castelli Lessard rigorous numerics Floquet normal form periodic orbit Fourier'; 'Figueras Gameiro Lessard
de la Llave framework rigorous computation invariant objects non-polynomial nonlinearities'; 'Johnson Zumbrun
convergence of Hill's method nonselfadjoint operators SIAM'; '"A Framework for the Numerical Computation and A
Posteriori Verification of Invariant Objects of Evolution Equations" SIAM Journal on Applied Dynamical Systems 16
doi'; 'Golubitsky Stewart Schaeffer Singularities and Groups in Bifurcation Theory Volume II Hopf bifurcation Z_n
rotating waves ring of oscillators'; 'Golubitsky Stewart "The Symmetry Perspective" 2002 Birkhauser rings of cells
rotating waves H/K theorem Floquet'; '"Singularities and Groups in Bifurcation Theory" Volume II "Oscillations of
Identical Cells Coupled in a Ring" chapter XVIII section'; arXiv API 'abs:Hill AND abs:Floquet AND (abs:rigorous OR
abs:"computer-assisted" OR abs:"interval arithmetic")' (2: Bayer-Leine 2503.21318; Haacker et al. 2509.24639,
fractional-order, not relevant); Crossref bibliographic queries for each title.

## Q4. Numerical studies of rings of TP06 cells or 1-D cardiac rings

Verdict: no numerical study of a ring of self-oscillating (automatic) TP06 cells, or of rotating phase waves in rings
of Erhardt's reduced-repolarization cells, was found. Erhardt's papers found are single-cell bifurcation analyses
plus monodomain tissue simulations (Q1 list); none studies a ring. Ring studies found concern anatomical reentry in
excitable (non-oscillating) tissue, which is a different regime:
- M. Courtemanche, L. Glass, J. P. Keener, "Instabilities of a propagating pulse in a ring of excitable media", Phys.
  Rev. Lett. 70 (1993) 2182-2185, doi:10.1103/PhysRevLett.70.2182 (Crossref).
- P. Comtois, A. Vinet, "Stability and bifurcation in an integral-delay model of cardiac reentry including spatial
  coupling in repolarization", Phys. Rev. E 68 (2003) 051903, doi:10.1103/PhysRevE.68.051903 (PubMed abstract).
- S. Sinha, D. J. Christini, "Termination of reentry in an inhomogeneous ring of model cardiac cells", Phys. Rev. E
  66 (2002) 061903, doi:10.1103/PhysRevE.66.061903 (PubMed abstract).
- ten Tusscher-Panfilov 2006 ring and sheet reentry, and Vinet-Roberge 1994: already in the 2026-09-30 ledger entry.
- EAD wave studies (TP06-type, not rings): Prusty, Nayak, J. Comput. Nonlinear Dyn. 20 (2025) 111007,
  doi:10.1115/1.4069263; Prusty, Nayak, Nonlinear Dyn. 114 (2026) 617, doi:10.1007/s11071-026-12446-3 (titles only).
- Engineered oscillatory tissue (not TP06): McNamara, Zhang, Werley, Cohen, "Optically controlled oscillators in an
  engineered bioelectric tissue", Phys. Rev. X 6 (2016) 031001, doi:10.1103/PhysRevX.6.031001 (title only; whether
  it has ring geometry not checked).

Searches: WebSearch 'one-dimensional ring reentry "ten Tusscher" model circulating pulse ring length alternans
simulation'; 'Courtemanche Glass Keener instabilities of a propagating pulse in a ring of excitable media Physical
Review Letters 1993'; PubMed '(ring[Title/Abstract] OR "circular cable"[Title/Abstract] OR "closed
loop"[Title/Abstract]) AND reentry AND ("ten Tusscher"[Title/Abstract] OR TP06[Title/Abstract] OR
TNNP[Title/Abstract])' (0); PubMed '("ring of cells"[Title/Abstract] OR "ring of coupled"[Title/Abstract] OR
"one-dimensional ring"[Title/Abstract]) AND (cardiac OR myocytes) AND (afterdepolarization* OR "early
afterdepolarization" OR reentry OR "rotating wave" OR "traveling wave")' (2); the Erhardt searches under Q1.

Suggested credit: "Reentry on rings of excitable cardiac tissue has a long numerical and analytical history
(Courtemanche-Glass-Keener 1993; Vinet-Roberge 1994; Comtois-Vinet 2003; ten Tusscher-Panfilov 2006). The waves
certified here are different: phase waves on rings of weakly coupled self-oscillating cells at Erhardt's
reduced-repolarization parameters, whose existence is the generic expectation from Z_N-equivariant Hopf theory and
phase reduction."

## Q5. Ring Floquet multipliers via the Bloch (space-time Fourier) decomposition

Verdict: the specific identity (ring multipliers = e^{mu T}, mu in the spectrum of one Hill block per Bloch index m
with damping 4c sin^2(pi m/N)) was not found written in that form in 12 searches. Its ingredients are classical and
should be presented as a lemma with credit, not as a new identity:
- Z_N-isotypic (discrete Fourier) block diagonalization of a ring and the Laplacian eigenvalues 4 sin^2(pi m/N): the
  synchronous-state version is the master stability function, L. M. Pecora, T. L. Carroll, "Master stability
  functions for synchronized coupled systems", Phys. Rev. Lett. 80 (1998) 2109-2112, doi:10.1103/PhysRevLett.80.2109.
- Spatio-temporal symmetry makes the monodromy an N-th power of a twisted map (M = G^n): Rucklidge-Silber 1998; also
  Golubitsky-Stewart 1985 / GSS 1988 / Golubitsky-Stewart 2002 for rotating waves in Z_N rings; de Wolff 2023 for
  Floquet theory of discrete waves.
- Bloch decomposition of periodic-coefficient operators and Hill truncation: Johnson-Zumbrun 2012.
- Floquet multipliers of a rotating wave in a ring computed explicitly: M. Di Marco, M. Forti, B. M. Garay,
  M. Koller, L. Pancioni, "Floquet multipliers of a metastable rotating wave in a Chua-Yang ring network",
  J. Math. Anal. Appl. 434 (2016) 798-836, doi:10.1016/j.jmaa.2015.08.072 (metadata only; search snippet says the
  dominant multiplier tends to 1 and the others to 0 as N grows). Read before claiming anything about rotating-wave
  multipliers in rings.

Searches: 'discrete rotating wave Floquet multipliers reduced Poincare map "T/N" spatio-temporal symmetry monodromy
N-th power Lamb Melbourne'; 'stability of rotating waves ring of diffusively coupled identical oscillators Floquet
multipliers Fourier modes circulant decomposition "sin^2" eigenvalues'; '"rotating wave" ring oscillators
linearization Bloch wave decomposition "Hill" operator Floquet exponents each Fourier mode m stability phase-locked
traveling wave'; 'Pecora Carroll master stability functions synchronized coupled systems Physical Review Letters 1998
Laplacian eigenvalues'; arXiv API 'abs:"rotating wave" AND abs:ring AND abs:Floquet' (1, irrelevant).

Suggested credit: "The reduction of the ring's Floquet problem to N Hill blocks is the Z_N-isotypic decomposition
(Golubitsky-Stewart 1985; Golubitsky-Stewart-Schaeffer 1988, Ch. XVIII), combined with the spatio-temporal symmetry
of the rotating wave (Rucklidge-Silber 1998) and the discrete Laplacian eigenvalues 4 sin^2(pi m/N) familiar from
master-stability analysis (Pecora-Carroll 1998). We state it as a lemma and prove it for completeness."

## Open items before any priority wording
1. Read Bayer-Leine 2026 and compare its truncation bound with the block-resolvent tail.
2. Read Gameiro-Lessard 2017 Section on Floquet exponents (how the eigenvalue problem is enclosed; any exclusion
   argument for the remaining spectrum).
3. Read Di Marco et al. 2016 and Hua-Liu 2026.
4. Confirm GSS Vol. II chapter number and Erhardt-Solem arXiv/SIADS identity.
