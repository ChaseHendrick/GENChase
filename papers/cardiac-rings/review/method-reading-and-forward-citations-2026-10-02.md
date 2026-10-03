# Method reading and Erhardt forward-citation check

Checked during the October 2, 2026 continuation session. Bibliometric responses for the published Erhardt DOI were accessed at 2026-10-03 02:09:31 UTC. This is a dated reading and search record, not a priority determination or an independent verification of another author's proofs. Only original notes and small bibliographic response summaries belong in the repository. Downloaded reading PDFs remain in temporary storage.

## Full-text reading scope

| Reference | Actual version and coverage read | Access and byte provenance |
| --- | --- | --- |
| J. B. van den Berg, J.-P. Lessard, E. Queirolo, *Rigorous verification of Hopf bifurcations via desingularization and continuation*, SIAM Journal on Applied Dynamical Systems 20 (2021), 573–607, [DOI 10.1137/20M1343464](https://doi.org/10.1137/20M1343464) | Entire published article: journal pages 573–607, including arguments, examples, captions and references. Repository PDF has 36 pages including its cover. | [VU institutional full text](https://research.vu.nl/ws/portalfiles/portal/153185462/Rigorous_verification_of_Hopf_bifurcations_via_desingularization_and_continuation.pdf). PDF SHA-256 `98087010bab02c5e775a13ca1e0f030f4ceeccef9f912006a21e40e6857967cb`. Copyright/redistribution restrictions apply; no PDF copied into this repository. |
| J. B. van den Berg, E. Queirolo, *A general framework for validated continuation of periodic orbits in systems of polynomial ODEs*, Journal of Computational Dynamics 8 (2021), 59–97, [DOI 10.3934/jcd.2021004](https://doi.org/10.3934/jcd.2021004) | Entire author-hosted 46-page preprint dated March 22, 2019: sections 1–10, figures and references. Published metadata, abstract and figure captions were checked separately. This is a full preprint reading, not a full reading of the final typeset article. | [Author-hosted preprint](https://www.math.vu.nl/~janbouwe/code/continuation/continuation.pdf), SHA-256 `a6925c6f6607e3ce8f011251147ae8be4350c99ec9fbe533961a40fcb1f5654a`. [Publisher record](https://www.aimsciences.org/article/doi/10.3934/jcd.2021004) links restricted full HTML; final PDF not obtained. |
| Y. A. Kuznetsov, *Andronov-Hopf bifurcation*, Scholarpedia 1(10):1858 (2006), [DOI 10.4249/scholarpedia.1858](https://doi.org/10.4249/scholarpedia.1858), revision 90964 | Definition, nondegeneracy conditions, multidimensional case, first Lyapunov coefficient and its normalization were inspected in indexed primary-site content. | [Primary article](https://www.scholarpedia.org/article/Andronov-Hopf_bifurcation). Direct article/revision retrieval repeatedly failed, including the `oldid=90964` URL. The indexed primary page identifies revision 90964. Do not label this a successful direct full-page retrieval. |

Reading used extracted text from the primary PDFs, page by page, including mathematical statements. It did not run the authors' MATLAB programs, reproduce their interval computations, or establish identity between the 2019 preprint and the 2021 final continuation article. The publisher and preprint have at least a numerical-caption difference, so this version distinction matters.

## Original method notes for manuscript credit

The Hopf paper develops amplitude desingularization, Fourier-space validation, continuation through a fold, and switching back to ordinary periodic-orbit coordinates. Section 5 separates geometric branch validation from additional equilibrium eigenvalue calculations. Those additional calculations are relevant to simplicity, exclusion of other imaginary eigenvalues and transversality. Section 6 proves that the formulations connect by aligning phase/continuation constraints and enclosing the transformed desingularized solution ball inside the original formulation's uniqueness ball. This is established prior method and should be credited when explaining the present bridge. Section 2.2 already discusses locally analytic nonpolynomial fields using discrete Fourier evaluation, rigorous interpolation errors and derivative bounds. Nonpolynomiality alone is not a new method. The TP06 application must supply and validate its own complex domain and remainder bounds. These statements come from the [published full text](https://research.vu.nl/ws/portalfiles/portal/153185462/Rigorous_verification_of_Hopf_bifurcations_via_desingularization_and_continuation.pdf).

The continuation preprint uses exponentially weighted Fourier sequence spaces, a finite numerical inverse with an analytic diagonal tail, and a uniform contraction argument along each continuation segment. Theorem 3.1 requires rigorous residual/derivative bounds and injectivity of the inverse approximation. Section 8.5 explains how its particular block structure and contraction bounds supply injectivity. Conjugate symmetry is needed to recover real periodic solutions. Neighboring segments connect through compatible endpoint data and uniqueness; endpoint existence alone is insufficient. Sections 6 and 8 distinguish point proofs from uniform segment proofs. The introduction explicitly describes polynomialization and interpolation as possible nonpolynomial extensions. Adaptive steps, Fourier truncations and numerical inverses affect success and cost; their heuristics do not replace rigorous inequalities. Cite this [author preprint](https://www.math.vu.nl/~janbouwe/code/continuation/continuation.pdf) together with its [published bibliographic record](https://www.aimsciences.org/article/doi/10.3934/jcd.2021004), preserving the version distinction above.

Kuznetsov's classical local Hopf statement requires a smooth equilibrium family, a simple imaginary pair with positive frequency, the remaining eigenvalues off the imaginary axis, nonzero crossing derivative and nonzero first Lyapunov coefficient. Full-system attraction additionally requires the remaining eigenvalues to have negative real parts. A negative Lyapunov coefficient yields attracting small cycles on the side where the critical pair has positive real part. With a negative conductance crossing derivative, that side is lower conductance. The coefficient's magnitude depends on eigenvector scaling; its sign does not. The formula uses the adjoint pairing normalization and a `1/(2 omega)` factor. This local result supplies no explicit uniform finite-amplitude interval. [Scholarpedia, revision 90964](https://www.scholarpedia.org/article/Andronov-Hopf_bifurcation).

For the present manuscript, distinguish the current classical Hopf certificate, amplitude continuation, bridge identification and uniform GKs stability. Point stability and local Hopf attraction do not establish uniform attraction throughout an entire finite bridge. Uniform stability can only be stated on the actual certified GKs branch interval. These are proposed claim boundaries for the present project, not results newly inferred from citation counts. No first-ever, clinical validation or action-potential priority conclusion follows from this search.

## Dedicated forward-citation result

Target: M. Erhardt, *Cardiac dynamics of a human ventricular tissue model with a focus on early afterdepolarizations*, Frontiers in Physics (2025), [DOI 10.3389/fphy.2025.1569121](https://doi.org/10.3389/fphy.2025.1569121). This checks forward references to that article, rather than counting the article's own older references.

| Endpoint actually queried | Returned result |
| --- | --- |
| [OpenAlex published work W4413289044](https://api.openalex.org/works/W4413289044) | `cited_by_count = 1` |
| [OpenAlex forward-work query](https://api.openalex.org/works?filter=cites:W4413289044&per-page=200) | `meta.count = 1`, page 1, per-page 200; one returned work, W7204542239 |
| [Crossref work record](https://api.crossref.org/works/10.3389/fphy.2025.1569121) | `is-referenced-by-count = 1`; count corroboration, not a retrieved forward-reference list |
| [Semantic Scholar DOI query](https://api.semanticscholar.org/graph/v1/paper/DOI:10.3389/fphy.2025.1569121?fields=title,year,citationCount,citations.title,citations.year,citations.url) | `citationCount = 1`; same citing title |
| [OpenAlex earlier WIAS preprint record](https://api.openalex.org/works/https://doi.org/10.20347/WIAS.PREPRINT.3147) and [its forward query](https://api.openalex.org/works?filter=cites:W6963462527&per-page=200) | Separately queried after the published-DOI search: W6963462527, zero indexed forward works. This is a different version identifier, not evidence of zero references to the published work. |

The single returned forward work is Md. Asraful Islam, Razia Sultana and Payer Ahmed, *A Nonlinear Mathematical Framework for Cardiac Tissue Disease Progression With ECG Signal Dynamics, Bifurcation Theory, Sensitivity Analysis, and Optimal Control*, Journal of Mathematics (2026), article 1998626, [DOI 10.1155/jom/1998626](https://doi.org/10.1155/jom/1998626). The [primary publisher page](https://onlinelibrary.wiley.com/doi/10.1155/jom/1998626) gives first publication August 28, 2026. Its introduction, model, bifurcation section, limitations and references were inspected. Reference 46 explicitly cites the target Erhardt DOI. The paper uses healthy/at-risk/damaged/recovered tissue compartments and therapy with an ECG model. It is a different model/application; the inspected sections do not provide a TP06 radii-polynomial Hopf/periodic-continuation certificate. Mengxin Chen is the academic editor, not one of the three authors. This scoped inspection is not a complete 31-page reading.

The live API count differs from a cached search result displaying zero. Preserve the API access date and do not treat cached zero as current evidence. The one OpenAlex result exhausts this particular API result set, not the world's literature. Google Scholar, Scopus and Web of Science were not exhaustively accessed. Index omissions, delayed deposits, identifier/version splits and new publications remain possible. Refresh the dedicated search before submission. Citation counts neither establish nor exclude historical priority.

### Exact search strings used

```text
van den Berg Lessard Queirolo 2021 rigorous verification Hopf bifurcations periodic orbits paper pdf
van den Berg Queirolo 2021 validated continuation periodic orbits Hopf pdf
Erhardt 2025 1569121 cardiac bifurcation ten Tusscher citations
"10.3389/fphy.2025.1569121" -site:frontiersin.org -site:researchgate.net
"Cardiac dynamics of a human ventricular tissue model with a focus on early afterdepolarizations" "cited"
"Erhardt" "1569121" "references" 2026
"A general framework for validated continuation" arxiv
"Andronov-Hopf bifurcation" "90964"
"A Nonlinear Mathematical Framework for Cardiac Tissue Disease Progression"
site:scholarpedia.org/article/Andronov-Hopf_bifurcation "nondegeneracy conditions"
site:scholarpedia.org/article/Andronov-Hopf_bifurcation "Multidimensional case"
site:scholarpedia.org/article/Andronov-Hopf_bifurcation "First Lyapunov coefficient"
"10.20347/WIAS.PREPRINT.3147" -site:wias-berlin.de -site:researchgate.net
site:scholarpedia.org/article/Andronov-Hopf_bifurcation "90964" "First Lyapunov"
```

Temporary response hashes retained here for audit without storing full paper text: OpenAlex target `af0e7ae075ea3766c2737a8400e40aa0a98325bb14ae237d94ec4ed80ce7543d`; OpenAlex published forward query `388bea1f5c2494cf4bcc668544be0e041a4526b13ce278e690ebaba5d7aad228`; Crossref `bc6e26f90befa1b19e273b48b8aa41686527072ab5e821314c276e9baf8789b5`; Semantic Scholar `0ab9367753fea4790cfc806457130bb500a86e998f420d076d3659c9812a1119`.
