# Internet search live — 2026-09-23

## Scope and result

Searched live web sources for the Koiller/Carvalho/da Silva/de Oliveira 1985 paper and for the requested numerical strings related to GENChase floors. The requested file is present at:

- `/workspace/GENChase/identities/sources/koiller1985.pdf`

It is a valid 35-page PDF (3,732,482 bytes). Because the publisher/API route was rate-limited/blocked and Academia's direct download opens a sign-up gate, this local PDF was reconstructed from the openly viewable 35 page-render images served by Academia's document viewer. It is a faithful page-image PDF of the public preview, not an untouched publisher-download PDF. The underlying page HTML/OCR and render assets are retained in:

- `/workspace/GENChase/identities/sources/koiller-pages/`
- `/workspace/GENChase/identities/sources/koiller-pages-text.txt`
- `/workspace/GENChase/identities/sources/koiller-images/`

`IDENTITIES.md` was not edited.

## Koiller 1985 source

- **Title:** *On Aref's vortex motions with a symmetry center*
- **Authors shown in the paper:** Jair Koiller, Sônia Pinto de Carvalho, Ronaldo Rodrigues da Silva, Luis Carlos Gonçalves de Oliveira.
- **Journal:** *Physica D* 16 (1985), 27–61.
- **DOI:** https://doi.org/10.1016/0167-2789(85)90084-3
- **Academia landing page:** https://www.academia.edu/3133073/On_Arefs_vortex_motions_with_a_symmetry_center
- **Public page-render endpoint:** `https://attachments.academia-assets.com/50443712/{page}.html`, pages 1–35. Example section-11 pages: [33](https://attachments.academia-assets.com/50443712/33.html) and [34](https://attachments.academia-assets.com/50443712/34.html).
- **Academia landing-page observations:** 1985, *Physica D-nonlinear Phenomena*, DOI displayed, 35 pages. “Download PDF” and “See full PDF” both opened an Academia sign-up/download modal in the owned browser session.
- **Crossref metadata:** https://api.crossref.org/works/10.1016%2F0167-2789%2885%2990084-3 — confirms title, volume 16, pages 27–61, authors, DOI, and Elsevier API text links.
- **Elsevier API test:** PDF request returned HTTP 429/404; browser text request was met by a Cloudflare 403. No publisher PDF was obtained through that route.
- **Semantic Scholar DOI record:** https://api.semanticscholar.org/graph/v1/paper/DOI:10.1016/0167-2789(85)90084-3?fields=title,authors,year,openAccessPdf,url,externalIds,citationCount — confirms the work and reports `openAccessPdf` as empty/null.
- **CiteSeer lead supplied in the task:** `623e1e94be8d0a3b647f8c68c907a0c077483f33`; no usable live result or downloadable OA PDF was located for that identifier.

## Section 11 extraction / requested constants

The public page text identifies section 11 as **“Collapse motions”** (printed pp. 59–60; viewer pages 33–34).

Key content transcribed from the page render:

1. The necessary collapse condition is
   `(nk + nλ)^2 = n(k^2 + λ^2)`, equivalently
   `n[(n−1)(k^2 + λ^2) + 2nkλ] = 0`, i.e. `d = 0` and the circulation ratio is the special `τ = τ_K,L` value.
2. The authors choose `τ = τ_L` without loss of generality and set `J = 0`.
3. Proposition 12: (a) symmetric and alternate steady-rotating solutions coexist at the ring ratio `x_-` from (3.6); (b) all other solutions either escape to infinity at rate `t^(1/2)` or collapse to the origin in finite time.
4. Collapse trajectories in physical space are logarithmic spirals. Equations (11.3)–(11.5) give constant phase difference, `r^2 = a(φ_0)t + r_0^2`, and the logarithmic-spiral relation between radius and phase.
5. The section/page text contains **no occurrences** of `sqrt(29)/3`, `sqrt(322)/9`, `P_*`, `2.203855`, `sqrt(31682)/80`, “minimum/minima”, or “optimize/optimization”. The same negative check was run over all 35 extracted page texts.
6. Numerical values for cross-checking only: `sqrt(29)/3 = 1.795054935712`, `sqrt(322)/9 = 1.993817604992`, `sqrt(31682)/80 = 2.224929774173`.

The paper does discuss extrema/minima in section 9 and numerical phase-portrait comparisons in Theorem C/Tables I–IV, but not the four requested GENChase constants or a `P_*` notation.

## Live searches for the requested strings

Search-engine/API URLs checked:

- Bing: https://www.bing.com/search?q=%22sqrt%2829%29%2F3%22+vortex — generic square-root/calculator results; no vortex prior-art hit.
- Bing: https://www.bing.com/search?q=%22sqrt%28322%29%2F9%22+vortex — generic square-root/calculator results; no vortex prior-art hit.
- Bing: https://www.bing.com/search?q=%222.203855%22+vortex — no domain-specific result; results were generic/unrelated.
- Bing: https://www.bing.com/search?q=%22sqrt%2831682%29%2F80%22 — generic square-root/calculator results; no relevant result.
- Bing: https://www.bing.com/search?q=GENChase+floors — no relevant result; results were unrelated SoCalGas pages.
- arXiv API exact-number query: https://export.arxiv.org/api/query?search_query=all:%222.203855%22&max_results=10 — `totalResults=0`.
- GitHub code search for `"2.203855"` requires sign-in, so it was not used as an authenticated workaround.
- Google Search was rate-limited with a CAPTCHA page in this session; no CAPTCHA interaction was attempted.

Conclusion: the requested constants and the name “GENChase floors” appear unpublished/unindexed on the live public web searched here, or use different notation.

## Closest prior art located

These are the directly relevant works cited by Koiller et al. or exposed by the live metadata pages:

1. **H. Aref, “Point vortex motions with a center of symmetry,” *Physics of Fluids* 25 (1982), 2183–2187.** DOI metadata/landing page: https://doi.org/10.1063/1.863170 ; AIP landing page: https://pubs.aip.org/aip/pfl/article-abstract/25/12/2183/812473/Point-vortex-motions-with-a-center-of-symmetry . This is the immediate precursor for symmetric/alternate vortex rings and ring-radius equilibria.
2. **E. A. Novikov and Yu. B. Sedov, “Vortex Collapse,” *Soviet Physics JETP* 50 (1979), 297–301.** Cited as reference [17] by Koiller et al.; this is the closest prior art for finite-time point-vortex collapse.
3. **T. H. Havelock, “The stability of motion of rectilinear vortices in ring formation,” *Philosophical Magazine* 11 (1931), 617.** Cited by Koiller et al. for stability of ring formations.
4. **H. Aref, “Motion of three vortices,” *Physics of Fluids* 22 (1979), 393–400.** Cited by Koiller et al. for the general three-vortex collapse context.
5. **J. Marsden and A. Weinstein, “Reduction of symplectic manifolds with symmetry,” *Reports on Mathematical Physics* 5 (1974), 121–130.** The reduction framework used by Koiller et al. to obtain the reduced phase portraits.
6. Academia’s related/citing material surfaced: S. P. Carvalho’s work and later overview-style items including M. Stremler, “Topological fluid mechanics of point vortex motions” (arXiv, 1999), and M. A. Sokolovskiy, *Dynamics of Discrete Vortices* (2014). These are context/prior-art leads, not evidence that the GENChase constants are present.

## Bottom line

Koiller 1985 is a strong prior-art match for discrete-symmetry vortex rings, relative equilibria, phase-portrait extrema, and collapse/escape trajectories. It does **not** contain the requested `sqrt(29)/3`, `sqrt(322)/9`, `P_* = 2.203855`, or `F_5 = sqrt(31682)/80` strings, and live searches did not find those exact GENChase-floor identifiers elsewhere. The requested local PDF path is populated with a 35-page image-faithful reconstruction from Academia’s public page renders, with the access limitation documented above.
