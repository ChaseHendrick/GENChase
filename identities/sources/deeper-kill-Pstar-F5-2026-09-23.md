# Deeper GENChase floor-kill pass — \(P_\star\) and \(F_5/F_n\)

**Date:** 2026-09-23 (America/New_York, EDT / UTC−4)  
**Work dir:** `/workspace/GENChase`  
**Rules:** Legal OA + already-purchased only. No Sci-Hub. **No** `IDENTITIES.md` edit. **No** PDF commit. **No** novelty claim.

Related prior notes (not superseded on body-reads of K–A–O):  
`prior-article-kill-2026-09-23.md`, `oa/deeper-kill-oa-2026-09-23.md`, `unequal-mu-half-Pstar-closed-2026-09-23.md`, `koiller1985-read-2026-09-23.md`, `aref1982-read-2026-09-23.md`, `oneil2007-read-2026-09-23.md`.

---

## Targets (ONLY)

| ID | Claim hunted |
|----|----------------|
| **P⋆** | Unequal three-vortex \(\mu=1/2\) product floor \(P_\star\approx 2.203855016036133\) on Gotoda \(L=0\) arc \(\Gamma=(1,\tfrac12,-\tfrac13)\); also the critical cubic in \(\cos\theta\) / Cardano closed form for \(P_\star\) |
| **F5 / Fn** | Two-ring spiral-pitch floors \(F_5=\sqrt{31682}/80\); general \(F_n=\sqrt{K_n^2-(2n-1)}/(2n)\) with hyperbolic \(K_n\); equality cosines \(\sqrt5/11\), \(9/55\), … (and radicals \(\sqrt{29}/3\), \(\sqrt{322}/9\)) |

Equivalent rate language also hunted: \(\omega_0 t_c\), \(-B/(2A)\), \(|\mathrm{Im}\,\lambda|/(2|\mathrm{Re}\,\lambda|)\), product floor, sinh-collapse formulas.

---

## VERDICTS

| Target | VERDICT | Confidence (this corpus) | One-line |
|--------|---------|--------------------------|----------|
| **P⋆** (\(\mu=1/2\)) | **STILL OPEN** | medium–high | Exact decimal / Cardano cubic / minpoly absent from all grepped literature extracts; Gotoda supplies \(A(\theta),B(\theta)\) but does **not** minimize \(-B/(2A)\) at \(\mu=1/2\); Leoncini \(k=1/2\) is near-collapse kinematics, not product floor |
| **F5** \(\sqrt{31682}/80\) | **STILL OPEN** | medium–high | No hit on `31682`, \(\sqrt{31682}\), or `2.224929…` in OA / purchased text |
| **Fn** general + equality cosines \(\sqrt5/11\), \(9/55\) (and \(\sqrt{29}/3\), \(\sqrt{322}/9\)) | **STILL OPEN** | medium–high | No hit on those radicals / cosines as collapse-pitch optimality; two-ring **family** classical (Koiller; Banica cites [41]); Aref nested `Fn(r)` is a **different** RE radius-ratio function — **DOES NOT KILL** |

**Kill hits this pass:** **none.**  
**None certified novel.** Negative search ≠ priority. Leave priority **unconfirmed**.

---

## 1. `pdftotext -layout` coverage

Ensured companion text for every real PDF under `identities/sources/`, `identities/sources/oa/`, and `/workspace/*purchased*.pdf`.

| Status | Paths |
|--------|-------|
| **OK extract** (txt ≫ 50 B) | Gotoda `2002.09624`, Koiller 1985, Aref nested / playground / triple2 / 2010-vt / 2010-dtu / 2010 (misfiled coding paper), Banica–Miot, golden, JTAM, KS2018, Kudela arxiv + energies2, Leoncini `9908055`, Lim–Montaldi–Roberts, purchased O’Neil 2007 (`oneil2007-purchased.txt` ≡ `oneil2007.txt`) |
| **Image PDF → OCR fallback** | Purchased Aref 1982: `pdftotext` yields only ~1110 B metadata; usable body is `aref1982-ocr-full.txt` (also copied under `identities/sources/`) |
| **HTML / captcha stubs misnamed `.pdf`** → `.stub.txt` dumped | `aref-triple`, `koiller-academia`, `koiller-ss`, `kudela2014`, `nested-re`, `oneil1987`, `oneil1987b`, `vortex-crystals` |
| **Broken PDF (xref fail)** | `oa/hal-point-vortex.pdf` — residual unread as text (`strings` only) |
| **Tiny reconstructed** | `lo-out/koiller-reconstructed.pdf` → 35 B (image OCR already covered by `koiller1985.txt` / pages extracts) |
| **Duplicate** | `kudela-energies.txt` ≡ `kudela-energies2.txt` (byte-identical) |

OA candidates named in the task brief were **already local** before this pass: Gotoda, Leoncini `physics/9908055`, Kudela arxiv + energies, Aref 2010 mirrors, Banica–Miot.

---

## 2. Ripgrep needles (documented)

Command family (case-insensitive) over **all** literature `.txt` / stub dumps / purchased OCR + OA PDF text:

```text
2.203855 | 2.20385 | 31682 | 29/3 | 322/9 | 5/11 | 9/55
sqrt(29) | sqrt(322) | sqrt(31682) | √29 | √322 | √31682
F_n | sinh.*collapse | product floor | ω0 tc | omega_0 t_c | -B/(2A)
mu.?1/2 | μ.?=.?1/2
(+ decimals 1.795054 | 1.993817 | 2.224929)
```

### Hard-needle results on literature extracts

| Needle class | Hits in OA/purchased literature text? |
|--------------|----------------------------------------|
| `2.203855` / `2.20385` | **0** |
| `31682` / `sqrt(31682)` / `√31682` | **0** |
| `29/3` / `322/9` / `sqrt(29)` / `sqrt(322)` / decimals above | **0** |
| `5/11` / `9/55` as equality-cosine literals | **0** |
| `product floor` / `-B/(2A)` literal | **0** |
| `F_n` token | Only **Aref nested RE** `Fn(r)` (relative-equilibrium radius-ratio plot) — **not** the spiral-pitch floor \(F_n\) |
| `ω0` | False positive: Kudela Energies flow map `Ω0 ↦ Ωt` (Omega), not \(\omega_0 t_c\) |

Hits on repo **notes** (`.md`) are self-references and were excluded from the kill score.

### Soft context (present, but not floors)

| File | Soft signal | Kill? |
|------|-------------|-------|
| `gotoda2002.09624.txt` | Self-similar \(A(\theta),B(\theta)\); equal-slice \(\Gamma_1=\Gamma_2=1,\Gamma_3=-1/2\); general \(L=0\) rates | **DOES NOT KILL** P⋆ (no \(\mu=1/2\) product minimization) |
| `oa/leoncini9908055.txt` | Near-collapse; special case \(k=1/2\) | **DOES NOT KILL** (periods / potentials, not \(P_\star\)) |
| `oa/kudela-arxiv.txt`, `oa/kudela-energies*.txt` | Multi-vortex self-similar collapse; Im/Re spiral language | **DOES NOT KILL** |
| `oa/banica-miot.txt` | “collapses of two-vortex rings were constructed in [41]” = Koiller 1985 | Family classical; **DOES NOT KILL** floors |
| `oa/aref2010-vt.txt` / `aref2010-dtu.txt` | Self-similar three-vortex rates / spiral pitch classical | **DOES NOT KILL** |
| `oa/aref-nested.txt` | Nested-polygon **relative equilibria**; function named `Fn(r)` | **DOES NOT KILL** (wrong problem) |
| `oa/ks2018.txt` | Path-length \(\tilde s(1)\); different observable | **DOES NOT KILL** |
| `koiller1985.txt`, `oneil2007.txt`, `aref1982-ocr-full.txt` | Two-ring / symmetry-center / triple-ring existence | Prior body-reads: **DOES NOT KILL** floors (see dated read notes) |

---

## 3. arXiv API (legal OA discovery)

Saved under `identities/sources/oa/arxiv-api/`.

| Query | `totalResults` | Floor-relevant? |
|-------|----------------|-----------------|
| `"two rings" AND collapse AND spiral` | empty / fail | — |
| `polygon AND collapse AND pitch AND vortex` | **0** | — |
| `"unequal strength" AND product AND vortex` | **0** | — |
| `spiral AND pitch AND vortex AND collapse` | **0** | — |
| `ti:"point vortex" AND two AND rings AND collapse` | **0** | — |
| `"two rings" AND vortex` | 17 | Unrelated (vortex rings / BEC / heavy-ion); **no** point-vortex pitch-floor paper |
| `"spiral pitch" AND vortex` | **0** | — |
| `unequal AND strength AND vortex AND collapse` | **0** | — |
| `product AND floor AND vortex` | **0** | — |
| numeric `31682` / `5/11` OR-style | 13 | Cosmology / prion / ANN / etc. — **no** fluid point-vortex floor |

No new OA PDF fetched that looks like a killer for P⋆ or \(F_5/F_n\). Named OA list already on disk.

---

## 4. Representative quotes (context only — not kills)

**Banica–Miot** (`oa/banica-miot.txt`):

> collapses of two-vortex rings were constructed in [41].  
> [41] J. Koiller, … *On Aref’s vortex motions with a symmetry center*, Physica D **16** (1985), 27–61.

**Gotoda** (`gotoda2002.09624.txt`): supplies closed \(A(\theta),B(\theta)\) on self-similar arcs (e.g. equal-slice (3.8); four/five-vortex (3.13)); figures of \((H(\theta),A(\theta))\). No printed minimization of the product \(-B/(2A)\) at circulation ratio \(\mu=1/2\) yielding \(P_\star\approx 2.203855\ldots\).

**Leoncini et al.** (`oa/leoncini9908055.txt`): treats singular near-collapse cases including \(k=1/2\); kinematic / potential analysis, not an optimized product floor.

**Aref nested** (`oa/aref-nested.txt`): `Fn(r)` is the nested-polygon **equilibrium** radius-ratio function — **not** GENChase \(F_n=\sqrt{K_n^2-(2n-1)}/(2n)\).

---

## 5. Honest residual unread list

| Residual | Why it remains |
|----------|----------------|
| `oa/hal-point-vortex.pdf` | Broken xref; no usable `pdftotext` |
| HTML stubs (`oneil1987*`, `nested-re`, `aref-triple` HTML shell, captcha pages) | Not full-text OA PDFs; Cloudflare / 403 / challenge pages |
| Older Russian-school surveys / Novikov–Sedov catalogs beyond what Kudela / Banica already cite | Optional specialist scan; not newly OA-fetched this pass |
| Any closed Physica D / AIP body **beyond** already-purchased Aref 1982, Koiller 1985, O’Neil 2007 | Those three already body-scored **DOES NOT KILL** in separate read notes; not re-opened here |

Nothing in the residual list is a strong “likely kill” pointer for the **exact** radicals / \(P_\star\) decimal; residuals are honesty gaps, not active kill candidates.

---

## 6. Bottom line

- **P⋆:** **STILL OPEN** — corpus does not kill.  
- **F5 / Fn (+ √5/11, 9/55, √29/3, √322/9):** **STILL OPEN** — corpus does not kill.  
- **Kill hits:** none.  
- **File:** `identities/sources/deeper-kill-Pstar-F5-2026-09-23.md`  
- Do **not** stamp IDENTITIES; priority remains **unconfirmed**.
