# Open-internet prior-art search: GENChase sharp floors

Search date: **2026-09-23** (America/New_York).  
Scope: box only (`/workspace/GENChase`). WebSearch, arXiv HTML/search, Unpaywall, Semantic Scholar API, OA PDF fetch+grep. **No Mac.**  
Rule: any published statement of the **optimized minimum** (or an algebraically equivalent form) kills novelty of that floor. Classical presence of the dynamical **family** alone does not.

Do **not** treat this file as a novelty claim. Do **not** edit `IDENTITIES.md`.

---

## Executive verdicts

| # | Target | Verdict | Confidence | Killer status |
|---|---|---|---|---|
| 1 | \(\sqrt{29}/3\), \(\cos 3\theta=\sqrt5/11\) (double-triangle / two-ring \(n=3\)) | **STILL OPEN** | **medium–high** | No OA hit stating the optimized floor. Family classical (Koiller 1985 §11). |
| 2 | \(\sqrt{322}/9\), \(\cos 4\theta=9/55\) (square two-ring) | **STILL OPEN** | **medium–high** | Same as (1); no OA hit on radical or equality angle. |
| 3 | General \(F_n/K_n\) polygon two-ring spiral-pitch minima | **STILL OPEN** (family **classical**) | **medium** | Koiller family known; **optimized** \(F_n=\sqrt{K_n^2-(2n-1)}/(2n)\) with hyperbolic \(K_n\) **not** found in OA text. |
| 4 | Unequal three-vortex \(\mu=1/2\): \(P_\star\approx 2.203855016036133\) / cubic \(c^3+(8\sqrt7/7)c^2+c/14-32\sqrt7/49=0\) | **STILL OPEN** | **medium–high** | No hit on decimal, cubic, or \(\mu=1/2\) product min. Gotoda rates classical; (3.3)\(B\) buggy off equal slice (already noted in-repo). Ignore ~1.74. |
| 5 | Equivalent forms \(\omega_0 t_c\), \(-B/(2A)\), \(\lvert\mathrm{Im}\,\lambda\rvert/(2\lvert\mathrm{Re}\,\lambda\rvert)\), log-spiral pitch; KS path-length ties | **Partly classical / not killing** | **high** | Product-as-pitch classical (Aref 2010). KS \(\tilde s(1)>2\) numerical is a **different** observable; equal-slice \(\tilde s(1)\ge 3\) ≡ \(\sqrt2\) already audited. **No** collision with \(P_\star\approx2.203855\). |

**Residual unread (priority blockers):**

| Source | Access 2026-09-23 | Why it matters |
|---|---|---|
| **Koiller et al., Physica D 16 (1985)** “On Aref’s vortex motions…” §11 | **CLOSED** (Unpaywall `is_oa:false`; CiteSeer timeout; Academia/SS HTML bang pages only; local `oa/koiller-ss.pdf` is Semantic Scholar HTML, not PDF) | Arbitrary two-ring collapse + spiral; an optimized pitch there would kill (1)–(3). |
| **Aref, Phys. Fluids 25 (1982)** “Point vortex motions with a center of symmetry” | **CLOSED** (Unpaywall closed) | Foundational two-ring / symmetry-center source cited by Koiller. |
| **O’Neil, Physica D 236 (2007)** triple rings | **CLOSED** (Unpaywall closed) | Credits known two-ring collapse; unlikely to state \(F_n\) floors, but unread body remains a gap. |

---

## Method

1. **WebSearch** — exact radicals, decimals, trig equality angles, author+keyword combos, equivalent observables.
2. **arXiv** — HTML search pages + `ar5iv`/`arxiv.org/pdf` fetches (export API TLS from box returned empty bodies; search UI / ar5iv worked).
3. **Unpaywall + Semantic Scholar** — OA status for Koiller / Aref 1982 / O’Neil 2007 (all closed).
4. **OA PDF fetch + `pdftotext` + `rg`** under `identities/sources/` and `identities/sources/oa/`.
5. Cross-check against in-repo drafts (`unequal-mu-half-draft-…`, `new-formula-candidate-…`, `NOVELTY-AUDIT.md`, `double-triangle.md`, `polygon-collapse.md`).

### Queries run (representative)

```
√29/3 OR "sqrt(29)/3" vortex OR Koiller OR "two-ring" OR "double triangle"
"√5/11" OR "sqrt(5)/11" OR "cos 3θ" vortex polygon
"√322/9" OR "sqrt(322)/9" OR "9/55" OR "cos 4θ" vortex
"1.79505" OR "1.795054" vortex OR spiral OR collapse
"2.203855" OR "2.20385" vortex OR "mu = 1/2" OR μ
Koiller "On Aref's vortex motions" spiral pitch minimum OR floor OR optimize
"sinh" arcosh vortex two-ring collapse Kn spiral pitch
"|Im λ|" OR "-B/(2A)" OR "ω0 tc" logarithmic spiral pitch vortex collapse
Aref 1982 "center of symmetry" collapse two rings
O'Neil 2007 "heterogeneous vortex triple rings"
Krishnamurthy Stremler path length collapse ŝ(1)
Gotoda self-similar μ strength ratio minimize product
Leoncini Kuznetsov Zaslavsky 2000 three vortices collapse minimize
Kudela self-similar n vortices spiral pitch
Novikov Sedov parallelogram quincunx ω tc minimum
```

### arXiv search pages / HTML opened

| URL | Notes |
|---|---|
| https://arxiv.org/search/?query=point+vortex+self-similar+collapse | 9 hits; Gotoda 2002.09624, Leoncini physics/9908055, Chen–Walsh–Wheeler 2506.04093, etc. — **no** floor radicals |
| https://arxiv.org/search/?query=%22two+ring%22+OR+%22two-ring%22+vortex+collapse | Broad; noise; no \(F_n\) floors |
| https://ar5iv.labs.arxiv.org/html/2002.09624 | Gotoda full text (rates \(A,B\); no \(\mu=1/2\) product min) |
| https://ar5iv.labs.arxiv.org/html/physics/9908055 | Leoncini near-collapse (equal-slice focus) |
| https://ar5iv.labs.arxiv.org/html/0811.1785 | Celli et al. polygonal **relative equilibria** (not collapse pitch) |
| https://arxiv.org/pdf/2002.09624.pdf | Already on disk as `gotoda2002.09624.pdf` |

### PDFs grepped (box)

| File | Source | Grep result vs targets |
|---|---|---|
| `identities/sources/gotoda2002.09624.pdf/.txt` | arXiv:2002.09624 | Rates \(A,B\), \(t_c=-1/(2A)\); equal \(\Gamma_1=\Gamma_2=1,\Gamma_3=-1/2\); **no** \(2.203855\), **no** \(\sqrt{29}/3\), **no** \(\sqrt{322}/9\), **no** cubic in \(\cos\theta\) for \(\mu=1/2\) product floor |
| `oa/ks2018.pdf` / `.txt` | Krishnamurthy–Stremler RCD 2018 postprint (IITH) | \(\tilde s(1)=2\tilde\tau\lvert K_2\rvert\); geometry for general \(g\); **numerical** \(\tilde s(1)>2\); **not** \(P_\star\approx2.203855\); **not** the corrected cubic |
| `oa/leoncini9908055.pdf` | arXiv physics/9908055 | Near-collapse periods / effective potential; minimizes geometry near resonance, **not** \(\omega_0 t_c\) floor at \(\mu=1/2\) |
| `oa/aref2010-vt.pdf` / DTU mirror | Aref, Phys. Fluids 22, 057104 (2010) | Self-similar three-vortex; log spirals; product \(\Omega\)–scale invariant under similarity; **equal-strength / general rates**, **not** \(\mu=1/2\) optimized product; **not** two-ring \(F_n\) |
| `oa/koiller-ss.pdf`, `koiller-academia.pdf`, CiteSeer attempt | — | **Not PDFs** (HTML interstitial / empty). Full Koiller text **still unread** |
| Banica/Miot, Kudela mirrors in `oa/` | prior pulls | Collapse families; **no** target radicals |

### Unpaywall (2026-09-23)

| DOI | `oa_status` |
|---|---|
| 10.1016/0167-2789(85)90084-3 (Koiller) | **closed** |
| 10.1063/1.863710 (Aref 1982) | **closed** |
| 10.1016/j.physd.2007.07.015 (O’Neil 2007) | **closed** |

---

## Target-by-target evidence

### 1. \(\sqrt{29}/3\), \(\cos 3\theta=\sqrt5/11\)

- WebSearch on exact radical / \(\sqrt5/11\) / decimal \(1.79505\ldots\): **no** fluid-dynamics hit tying the number to a spiral-pitch floor.
- Optical “double-ring vortex beams” and flooring-product noise — irrelevant.
- In-repo: double-triangle is \(n=3\) of Koiller two-ring family; prospective contribution is the **optimized** product, not the family.
- **Verdict: STILL OPEN** (subject to unread Koiller §11 / Aref 1982). Confidence **medium–high** on OA web; residual closed PDFs keep this from “high.”

### 2. \(\sqrt{322}/9\), \(\cos 4\theta=9/55\)

- Same pattern: nested-polygon **relative equilibria** literature (Havelock, Aref, Celli et al. arXiv:0811.1785) discusses radius ratios / stagger, **not** this collapse-pitch floor.
- Decimal / radical searches empty for vortex collapse.
- **Verdict: STILL OPEN** (same unread residual). Confidence **medium–high**.

### 3. General \(F_n / K_n\)

- Koiller §11 (indexed excerpts historically; full PDF still closed) = classical arbitrary two-ring collapse + log spirals.
- Searches for \(\sinh\)/\(\mathrm{arcosh}\) pitch floor, \(K_n\), \(F_n=\sqrt{K_n^2-(2n-1)}/(2n)\): **no** OA match.
- O’Neil 2007 (abstract/intro via secondary sources): treats **triple** rings; cites two-ring collapse as known — does not replace reading Koiller for optimized \(F_n\).
- Kudela / Gotoda \(N\)-vortex self-similar work: collapse times & Hamiltonians as parameters; **relative equilibria at endpoints**; **not** the closed-form two-ring pitch minimum family.
- **Verdict: STILL OPEN** for the **optimized** formula; family **classical**. Confidence **medium** (Koiller unread is material).

### 4. \(\mu=1/2\) product \(P_\star\approx 2.203855\) / cubic

- Decimal search **empty**.
- Gotoda arXiv:2002.09624: closed \(A,B\) for general \(\Gamma_1,\Gamma_2\); equal-slice specialization; **no** minimization of \(-B/(2A)\) at \(\mu=1/2\). Confirms (in-repo) that Gotoda (3.3)\(B\) disagrees with Prop. 2.1 / 2π Biot–Savart off equal slice → discard ~1.74.
- Aref 2010: spiral pitch / rates for self-similar three-vortex; product scale-invariant; **no** named \(\mu=1/2\) floor.
- Krishnamurthy–Stremler 2018: general \(g=\Gamma_1/\Gamma_2\) geometry; \(\tilde s(1)=2\tilde\tau\lvert K_2\rvert\); **numerical** \(\tilde s(1)>2\). Different observable from \(P=-B/(2A)\). Equal-slice sharp \(\tilde s(1)\ge 3\) ≡ \(P\ge\sqrt2\) already in novelty audit — **not** this cubic.
- Leoncini–Kuznetsov–Zaslavsky (physics/9908055): near-collapse for \(k\) near \(1/2\); period asymptotics — **not** product floor.
- **Verdict: STILL OPEN**. Confidence **medium–high**.

### 5. Equivalent forms / KS ties

- \(\omega_0 t_c = -B/(2A) = \lvert\mathrm{Im}\,\lambda\rvert/(2\lvert\mathrm{Re}\,\lambda\rvert)\) as log-spiral pitch: **classical language** (Aref 2010; Gotoda; Koiller excerpts). Using these names does **not** kill an optimized constant unless the constant appears.
- KS path-length bound tied to **equal-slice** \(\sqrt2\) only (via \(\tilde s(1)=\sqrt{1+4P^2}\)). Unequal \(\mu=1/2\) KS sharp floor for \(\tilde s(1)\) **not** published in the postprint (only \(>2\) numerical).
- **Verdict: equivalents classical; do not kill (1)–(4). KS does not kill (4).**

---

## Best adjacent open gaps (internet-suggested)

These are **gaps suggested by what *is* published**, not novelty claims for GENChase.

### Gap A — Explicit \(\omega_0 t_c\) floors for three-vortex \(\mu\notin\{1,1/2\}\)

**What is known:** Gotoda (arXiv:2002.09624 §3.1) gives closed \(A(\theta),B(\theta)\) for general \(\Gamma_1,\Gamma_2\) on the \(L=0\) circle; Aref 2010 gives spiral rates; Krishnamurthy–Stremler give geometric ODEs for general \(g\). Equal-slice optimization → \(\sqrt2\) (Gröbli / audit). \(\mu=1/2\) candidate \(P_\star\approx2.203855\) **not** located online.

**Still open (suggested):** minimize \(P(\theta)=-B/(2A)\) for other rational \(\mu\) (e.g. \(1/3,1/4,2/3,\ldots\)), or map \(P_\star(\mu)\). Prefer 2π Biot–Savart / Gotoda Prop. 2.1 (avoid Gotoda (3.3)\(B\) off equal slice).

**Citations:** Gotoda 2002.09624; Aref Phys. Fluids 22, 057104 (2010); Krishnamurthy–Stremler RCD 2018 postprint.

### Gap B — Sharp Krishnamurthy–Stremler circumcenter path floors for unequal strengths

**What is known:** KS prove \(\tilde s(1)=2\tilde\tau\lvert K_2\rvert\) and observe \(\tilde s(1)>2\) numerically for the broader family; equal-slice \(\tilde s(1)\ge 3\) is equivalent to \(P\ge\sqrt2\).

**Still open (suggested):** prove sharp \(\inf \tilde s(1)\) as a function of \(g=\Gamma_1/\Gamma_2\), especially at \(g=1/2\). May or may not coincide with a simple transform of \(P_\star(\mu)\).

**Citation:** Krishnamurthy & Stremler, Reg. Chaotic Dyn. (2018), postprint §§3.4–3.5, eqs. (3.29).

### Gap C — Explicit radicals for two-ring \(F_n\) at \(n\ge 5\) (and verification vs Koiller)

**What is known:** Two-ring collapse for arbitrary \(n\) is classical (Koiller §11; O’Neil 2007 cites it). In-repo general \(F_n\) + specializations \(n=2,3,4\); draft \(F_5=\sqrt{31682}/80\) (priority unconfirmed).

**Still open (suggested):** cleared radicals for \(n=5,6,\ldots\); any comparison once Koiller full text is obtained. Counting each \(n\) as a separate “discovery” is discouraged by `NOVELTY-AUDIT.md`.

**Citations:** Koiller et al. Physica D 16 (1985) §11 [unread PDF]; O’Neil Physica D 236 (2007); in-repo `polygon-collapse.md`, `new-formula-candidate-2026-09-23.md`.

### Honorable mentions (weaker / noisier)

- **O’Neil triple-ring** collapse: existence/computation known; **optimized pitch** over relative rotation **not** seen in OA abstracts — possible adjacent, but PDF closed.
- **Novikov–Sedov / Gotoda parallelogram & quincunx:** rate formulas published; explicit floors already treated as candidates 2–3 in-repo (elementary corollaries) — **not** fresh gaps.
- **Hollow-vortex desingularizations** (Chen–Walsh–Wheeler arXiv:2506.04093): implosion examples; not sharp point-vortex pitch floors.

---

## Artifact index (this pass)

```
identities/sources/internet-search-2026-09-23.md   ← this report
identities/sources/gotoda2002.09624.pdf|.txt
identities/sources/oa/ks2018.pdf|.txt
identities/sources/oa/leoncini9908055.pdf
identities/sources/oa/aref2010-vt.pdf|.txt
identities/sources/oa/aref2010-dtu.pdf
identities/sources/oa/*-unpaywall.json
identities/sources/oa/koiller-ss.pdf          ← HTML, not PDF
identities/sources/search-logs/               ← reserved
```

---

## Bottom line for parent agent

- **Targets 1–4: STILL OPEN** on the open internet / OA corpus searched today.  
- **No LIKELY KILLED / KILLED** verdict for the optimized floors (family classical ≠ floor published).  
- **Blockers:** full text of **Koiller 1985**, **Aref 1982**, **O’Neil 2007** remain closed.  
- **Best adjacent gaps to chase next:** (A) other \(\mu\) product floors; (B) sharp KS \(\tilde s(1)(g)\); (C) \(F_n\) radicals for \(n\ge5\) after Koiller is read.  
- Path: `identities/sources/internet-search-2026-09-23.md`
