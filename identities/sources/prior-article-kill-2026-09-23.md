# Prior-article kill report — classical two-ring / polygon product floors

> **Update (same day, later):** Koiller 1985 full text was obtained and read. See [`koiller1985-read-2026-09-23.md`](koiller1985-read-2026-09-23.md). Verdict: does **not** kill optimized floors. Any “Koiller unread” claim below is stale.


**Date:** 2026-09-23 (America/New_York, EDT / UTC−4)  
**Scope:** Box-only FULL FORCE search for prior statements of the optimized spin–collapse product floors on the classical two-ring family (candidates 4–5 and the general \(F_n\)).  
**Do not edit** `IDENTITIES.md`. **Do not claim novelty.**  
**Skim only:** unequal-\(\mu\) floor \(P_\star\approx 2.203855016036133\) (\(\mu=1/2\)) — recorded below; not re-derived.

Related in-repo audits (superseded only where this report updates access status):  
[`identities/NOVELTY-AUDIT.md`](../NOVELTY-AUDIT.md), [`identities/ORIGINALITY-FOLLOWUP.md`](../ORIGINALITY-FOLLOWUP.md), [`identities/double-triangle.md`](../double-triangle.md), [`identities/polygon-collapse.md`](../polygon-collapse.md), [`RESEARCH.md`](../../RESEARCH.md) (2026-09-20 query logs).

---

## Targets

| ID | Floor | Equality | Family |
|---|---|---|---|
| T4 | \(\sqrt{29}/3 \approx 1.7950549357115013\) | \(\cos 3\theta=\sqrt5/11\) | Double-triangle / two 3-rings (\(n=3\)) |
| T5sq | \(\sqrt{322}/9 \approx 1.9938176049918\ldots\) | \(\cos 4\theta=9/55\) | Two squares (\(n=4\)) |
| T5gen | \(F_n=\sqrt{K_n^2-(2n-1)}/(2n)\), \(K_n=(n-1)\sinh[(n+2)\eta_n/2]\), \(\eta_n=\log\bigl((n+\sqrt{2n-1})/(n-1)\bigr)\) | \(\cos(n\theta_*)=\sqrt{2n-1}/K_n\) | Arbitrary two-ring \(n\ge2\) |

Equivalent quantities hunted: spiral pitch, \(|\mathrm{Im}\,\lambda|/(2|\mathrm{Re}\,\lambda|)\), \(-B/(2A)\), \(\omega_0 t_c\), normalized path length \(\widetilde s(1)=\sqrt{1+4P^2}\).

---

## Verdict summary

| Target | VERDICT | Confidence | One-line reason |
|---|---|---|---|
| T4 \(\sqrt{29}/3\) | **STILL OPEN** | medium (explicit print); low–medium that closed Koiller lacks an equivalent | Exact radical / equality angle absent from all reachable OA text; family classical; Koiller §11 / Aref 1982 / O’Neil 2007 full bodies still unread |
| T5sq \(\sqrt{322}/9\) | **STILL OPEN** | medium (explicit print); low–medium that closed sources lack an equivalent | Same as T4; no hit on \(\sqrt{322}\), \(9/55\), or \(1.993817\ldots\) in vortex literature |
| T5gen \(F_n/K_n\) | **STILL OPEN** | medium (explicit optimized formula); low–medium vs unread §11 | No earlier optimized hyperbolic-sine floor located; two-ring *existence* and log-spirals are classical |
| Unequal-\(\mu\) \(P_\star\) (\(\mu=1/2\)) | **SKIM ONLY — not a kill target** | — | Corrected numerical floor \(\approx 2.203855016036133\) noted; not re-derived here |

**None of T4 / T5sq / T5gen is KILLED or LIKELY KILLED by an OA PDF quote.**  
**None is certified novel.** Negative search ≠ priority. Unread Physica D / AIP bodies are a material gap.

---

## Access status of the three priority PDFs

| Paper | Unpaywall / OpenAlex | This session |
|---|---|---|
| **Aref 1982**, *Point vortex motions with a center of symmetry*, Phys. Fluids **25**, 2183–2187. DOI [10.1063/1.863710](https://doi.org/10.1063/1.863710) | **closed**; no repository copy | Abstract/metadata only. Abstract emphasizes center-of-symmetry reduction and double-alternate-ring *dissolution into pairs*, not an optimized collapse pitch. |
| **Koiller et al. 1985**, *On Aref’s vortex motions with a symmetry center*, Physica D **16**, 27–61. DOI [10.1016/0167-2789(85)90084-3](https://doi.org/10.1016/0167-2789(85)90084-3) | **closed**; `any_repository_has_fulltext: false` | CiteSeer now **301 → Wayback** (`…/web/20251230112235/…citeseerx…doi=623e1e94…`). Box TLS to `web.archive.org` failed (`SSL unexpected eof`); WebFetch timed out / 404. Academia listing HTML only (Cloudflare). **Full §11 still unread.** |
| **O’Neil 2007**, *Relative equilibrium and collapse configurations of heterogeneous vortex triple rings*, Physica D **236**, 123–130. DOI [10.1016/j.physd.2007.07.015](https://doi.org/10.1016/j.physd.2007.07.015) | **closed** | ScienceDirect blocked (Cloudflare). Prior audit / publisher abstract: credits **known two-ring collapses** and studies **three** rings — does not state T4/T5 floors. |

**Gotoda** arXiv:2002.09624 already on disk at [`gotoda2002.09624.pdf`](gotoda2002.09624.pdf) / `.txt`. Grep: no \(\sqrt{29}\), \(\sqrt{322}\), \(\sqrt5/11\), \(9/55\), \(F_n\), or \(-B/(2A)\) minimization over two-ring polygons. Focus is three-/four-/five-vortex families and \(H\)–collapse-rate plots (eq. 3.13).

---

## What *was* established as prior art (family, not floors)

These kill **novelty of the motion**, not the sharp product floors.

1. **Two-ring self-similar collapse exists and is classical.**  
   - Banica–Miot survey (author PDF opened): “collapses of two-vortex rings were constructed in [41]” with [41] = Koiller et al. 1985.  
     Source: [`oa/banica-miot.pdf`](oa/banica-miot.pdf) (also arXiv:1202.2580).  
   - O’Neil 2007 abstract (publisher / prior audit): “collapse configurations of two rings are known to exist.”  
   - In-repo indexed excerpts of Koiller §11 (Prop. 12, eqs. 11.1–11.5, pp. 59–60) already establish circulation conditions, square-root contraction, and logarithmic spirals for arbitrary \(n\) on each ring — see [`NOVELTY-AUDIT.md`](../NOVELTY-AUDIT.md) and [`RESEARCH.md`](../../RESEARCH.md) 2026-09-20 entries. **Those excerpts were not re-fetched as a full PDF this session.**

2. **Log-spiral product structure is classical.**  
   - Aref 2010 (OA manuscripts opened previously / this session under `oa/aref2010*.pdf`): trajectories \(r=r_0\exp(-\theta/(2P))\) with \(P\) built from the complex rate — product as spiral pitch is not new.  
   - Kudela / Lewkowicz arXiv:1512.05116 (OA): explicit formula with \(\mathrm{Im}(\omega)/(2\mathrm{Re}(\omega))\) in the self-similar law; **no** minimization giving \(\sqrt{29}/3\) or \(\sqrt{322}/9\).  
   - Kudela Energies 14:943 (OA PDF `oa/kudela-energies2.pdf`): log-spiral collapse time; numerical multi-vortex examples; **no** matching floors.

3. **Nested-polygon *relative equilibria*** use sinh/cosh radius-ratio equations (Aref / vortex-crystal literature, e.g. arXiv:0811.1785). Structurally reminiscent of \(K_n\), but those papers optimize **equilibria**, not collapse spiral pitch. **Not a kill** of \(F_n\).

---

## Negative evidence for the *floors* (not a certificate of originality)

Exact-string and float searches (WebSearch + local `rg` over downloaded OA text) returned **no** prior hit for:

- \(\sqrt{29}/3\), \(\sqrt{29}\), \(1.7950549357115013\), \(\cos 3\theta=\sqrt5/11\), \(\sqrt5/11\)
- \(\sqrt{322}/9\), \(\sqrt{322}\), \(1.9938176049918\), \(\cos 4\theta=9/55\), \(9/55\) as a vortex angle
- Project formula \(F_n\) / \(K_n\) with the stated sinh expression as a **minimum** of \(\omega_0 t_c\)
- Combined queries: `"vortex collapse" sinh minimum`, `"spiral pitch" polygon vortex`, `"two rings" pitch minimum`, `"omega t_c" rings`, `-B/(2A)` minimization on two-rings

Representative query log for this session (additive to 2026-09-20 RESEARCH.md):

- `Koiller Aref vortex motions symmetry center 1985 two-ring collapse spiral pitch`
- `"sqrt(29)/3" OR "√29/3" OR "√29" vortex collapse OR spiral pitch`
- `"√322" OR "sqrt(322)" OR "322/9" vortex OR polygon collapse spiral`
- `"cos" "√5/11" OR "sqrt(5)/11" OR "9/55" vortex OR collapse OR spiral`
- `"1.795" OR "1.9938" OR "1.993817" vortex collapse OR spiral OR pitch`
- `"ω₀t_c" OR "omega t_c" OR "-B/(2A)" vortex rings OR polygons collapse minimum`
- `"golden ratio" OR "(3+√5)/2" vortex triangle collapse OR nested triangles`
- `"Collapse motions of two rings" OR "two rings of vortices" Koiller "self-similar"`
- `"Proposition 12" Koiller vortex` (no useful §11 OCR hit this session)
- arXiv HTML search `two rings point vortex collapse` → unrelated protoplanetary-disk hit only; API often **429**
- Unpaywall/OpenAlex on the three priority DOIs → all closed

OA PDFs downloaded/grepped under `identities/sources/oa/` (among others): Banica–Miot, Kudela 1512.05116 + Energies, Aref playground / 2010 copies, Leoncini near-collapse, Lim–Montaldi–Roberts sphere rings, Aref nested RE 0811.1785, JTAM Koiller lake-equations paper (wrong Koiller), Gotoda text, HAL point-vortex notes. **None quotes T4/T5sq/T5gen.**

---

## Per-target writeups

### T4 — \(\sqrt{29}/3\) (double-triangle, \(n=3\))

- **VERDICT: STILL OPEN**
- **Confidence:** ~0.55 that no *explicit* prior printed floor matches; ~0.35 that an unread closed source states an equivalent optimized pitch (Koiller §11 is the main risk).
- **Citations that set the family (not the floor):** Koiller et al. 1985 §11 (indexed Prop. 12 / 11.1–11.5); Aref 1982 (symmetry center); O’Neil 2007 (two-ring collapse “known”); Banica–Miot citing Koiller as the two-ring construction.
- **Quote if a PDF killed it:** *none*. No OA PDF stated \(\sqrt{29}/3\) or \(\cos 3\theta=\sqrt5/11\).
- **Algebra note (not prior art):** once \(P=(11-\sqrt5\cos\alpha)/(6\sin\alpha)\) is known, the bound is the elementary identity \((11-\sqrt5 c)^2-116 s^2=(11c-\sqrt5)^2\). Absence from print can still fail a strong *novelty* claim; this report only scores **prior explicit statement**.

### T5sq — \(\sqrt{322}/9\) (square, \(n=4\))

- **VERDICT: STILL OPEN**
- **Confidence:** same profile as T4.
- **Citations:** same classical two-ring sources; \(n=4\) is the “peculiar” two-ring-of-four case in the Koiller abstract (equilibria / Aref conjectures), not evidence that \(\sqrt{322}/9\) was optimized there.
- **Quote if killed:** *none*.

### T5gen — \(F_n / K_n\)

- **VERDICT: STILL OPEN**
- **Confidence:** same; slightly higher risk that a general pitch formula sits in unread Koiller §11 than that the specific radicals do.
- **Citations:** Koiller §11 already treats arbitrary \(n\) per ring (existence). Nested-polygon RE sinh formulas (Aref et al.) are **not** the collapse minimum \(F_n\).
- **Quote if killed:** *none*.
- **Dependency:** T4 and parallelogram (\(n=2\), \(F_2=3\sqrt5/4\)) are special cases; do not count each \(n\) as a separate discovery.

### Unequal-\(\mu\) floor (skim)

From [`unequal-mu-half-draft-2026-09-23.md`](unequal-mu-half-draft-2026-09-23.md): for \(\Gamma=(1,1/2,-1/3)\) on Gotoda’s \(L=0\) circle, corrected  
\(P_\star\approx 2.203855016036133\) at a cubic critical \(\cos\theta_\star\).  
**Not** the equal-strength \(\sqrt2\) floor. **Not re-derived; not scored as KILLED/OPEN here.**

---

## Residual risks (why not “STILL OPEN → novel”)

1. **Koiller 1985 full text unread.** CiteSeer→Wayback path exists but was unreachable from this box (TLS/timeout). An optimized \(-B/(2A)\) or equivalent in §11 would move T4/T5sq/T5gen to **KILLED** or **LIKELY KILLED**.
2. **Aref 1982 / O’Neil 2007 bodies unread** (closed). Lower risk for the polygon floors (Aref 1982 abstract is not about collapse pitch; O’Neil 2007 is triple rings), but not zero.
3. **Elementary corollary problem.** Even without an explicit radical in print, published rates plus the perfect-square identity make historical priority of the *optimization* hard to claim.
4. **Search engines miss theses / books / OCR-poor scans.** Negative evidence is limited.

---

## Next useful step (if continuing)

1. Obtain Koiller 1985 PDF by a path that works (authenticated library, author mail to `jairkoiller@gmail.com` as printed on the JTAM paper, or a successful Wayback `if_` fetch) and read **§11 pp. 59–61** for any product / pitch / \(\mathrm{Im}/\mathrm{Re}\) extremum.  
2. If found, quote pages and flip the verdicts.  
3. Until then: keep T4/T5sq/T5gen as **proved candidates with priority unconfirmed**; do **not** advertise as verified first discoveries.

---

## File path

This report: **`/workspace/GENChase/identities/sources/prior-article-kill-2026-09-23.md`**
