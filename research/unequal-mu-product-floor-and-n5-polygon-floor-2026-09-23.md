# Unequal-μ product floor and n=5 polygon floor

> **Version 2 correction (2026-09-23).** For Γ = (1, 1/2, −1/3) the L = 0 family has two collapsing branches, one per triangle orientation: Gotoda's arc 0 < θ < θ₀ and the opposite orientation π < θ < 2π − θ₀. P⋆ ≈ 2.203855016 is the minimum on Gotoda's arc only. The global μ = 1/2 floor is P_min ≈ 1.064705976271204, the other positive root of the same sextic, equal to √(605/324 + (7√5201/162)·cos(⅓·arccos(245351√5201/5201²) − 2π/3)). Every algebraic statement about P⋆ below remains correct. F₅ = √31682/80 is confirmed. Independent Biot–Savart validation: `research/verify_floors_independent.py`; results in `research/artifacts/verify-floors-independent-2026-09-23.json`; updated note: `research/artifacts/unequal-mu-n5-floors-2026-09-23.pdf` (version 2).

**Date.** 2026-09-23 (America/New_York).  
**Repo.** SharpMeow/GENChase.  
**Author / finder (for citation).** Chase Hendrick. These closed forms and the accompanying literature checks were **found / derived in this campaign by Chase Hendrick**. Cite the person by that name. Do **not** attribute the results to the GitHub handle SharpMeow, and do **not** treat this note as a personal theorem stamp or named identity (no “Hendrick’s Identity / Law”).

**Status.** Proved candidates; **priority unconfirmed**. Same classical families as existing GENChase polygon / two-ring work — **not** a new dynamical family and **not** a sixth independent `IDENTITIES.md` row. This note does **not** edit `IDENTITIES.md`.

**Companion PDF (our text only).** [`research/artifacts/unequal-mu-n5-floors-2026-09-23.pdf`](artifacts/unequal-mu-n5-floors-2026-09-23.pdf) (built from [`unequal-mu-n5-floors-2026-09-23.typ`](unequal-mu-n5-floors-2026-09-23.typ)).

---

## Abstract

We record exact closed forms for two classical point-vortex collapse floors derived in the SharpMeow/GENChase campaign: (i) the unique interior product minimum \(P_\star\) on Gotoda’s \(L=0\) arc for \(\Gamma=(1,1/2,-1/3)\) (corrected \(2\pi\) Biot–Savart product); (ii) the \(n=5\) specialization \(F_5=\sqrt{31682}/80\) of the already-proved two-ring / polygon floor \(F_n\). Both are **proved candidates**. **Priority is unconfirmed**: the expressions may already appear as classical specializations in unread literature. Floor-kill body reads of Koiller et al. (1985), Aref (1982), and O’Neil (2007) return **DOES NOT KILL** for the optimized floors and radicals named here; those verdicts are limited to the texts read and do not certify novelty.

---

## What is recorded here

1. Exact closed form for the **μ = 1/2** Gotoda \(L=0\) spin–collapse **product floor** \(P_\star\).
2. Explicit radical for the **n = 5** polygon-collapse floor \(F_5=\sqrt{31682}/80\).
3. Verify / Float64 status.
4. Literature floor-kill results: **Koiller 1985**, **Aref 1982**, **O’Neil 2007** — all **DOES NOT KILL**.
5. What would still kill priority.
6. References.

Detail drafts (do not duplicate every algebra here):

- [`identities/sources/unequal-mu-half-Pstar-closed-2026-09-23.md`](../identities/sources/unequal-mu-half-Pstar-closed-2026-09-23.md)
- [`identities/sources/new-formula-candidate-2026-09-23.md`](../identities/sources/new-formula-candidate-2026-09-23.md)
- [`identities/sources/koiller1985-read-2026-09-23.md`](../identities/sources/koiller1985-read-2026-09-23.md)
- [`identities/sources/aref1982-read-2026-09-23.md`](../identities/sources/aref1982-read-2026-09-23.md)
- [`identities/sources/oneil2007-read-2026-09-23.md`](../identities/sources/oneil2007-read-2026-09-23.md)
- [`identities/sources/purchase-log-2026-09-23.md`](../identities/sources/purchase-log-2026-09-23.md)
- [`identities/sources/deeper-kill-Pstar-F5-2026-09-23.md`](../identities/sources/deeper-kill-Pstar-F5-2026-09-23.md)
- [`identities/sources/oa/deeper-kill-oa-2026-09-23.md`](../identities/sources/oa/deeper-kill-oa-2026-09-23.md)

---

## 1. μ = 1/2 Gotoda \(L=0\) product floor

On Gotoda’s classical \(L=0\) collapsing arc for \(\Gamma=(1,\tfrac12,-\tfrac13)\), with the corrected product from the \(2\pi\) Biot–Savart kernel / Gotoda Prop. 2.1,

\[
P(\theta)=\frac{14\sin^2\theta+6\sqrt7\cos\theta+21}{2(14\cos\theta+\sqrt7)\sin\theta},
\]

the unique interior minimum \(P_\star=P(\theta_\star)\) admits the real trigonometric Cardano form

\[
P_\star=\sqrt{\dfrac{605}{324}+\dfrac{7\sqrt{5201}}{162}\cos\!\Bigl(\dfrac13\arccos\Bigl(\dfrac{245351\sqrt{5201}}{5201^{2}}\Bigr)\Bigr)}.
\]

Equivalently, \(P_\star\) is the unique positive real root greater than \(2\) of the irreducible sextic

\[
8748\,x^{6}-49005\,x^{4}+27794\,x^{2}+18723=0,
\]

and \(q=P_\star^{2}\) is the unique real root in \((4,5)\) of the irreducible cubic

\[
8748\,q^{3}-49005\,q^{2}+27794\,q+18723=0.
\]

### Proof sketch

1. Critical cosine \(\cos\theta_\star\) solves the cubic \(c^{3}+(8\sqrt7/7)c^{2}+(1/14)c-32\sqrt7/49=0\) on the collapsing arc.
2. Write \(P=N(c)/(D_0(c)\sqrt{1-c^{2}})\) and clear radicals to a bihomogeneous relation in \((P,c,\sqrt7)\).
3. Resultant elimination of \(c\) and \(\sqrt7\) yields the sextic above (minimal over \(\mathbb Q\)); \(q=P_\star^{2}\) satisfies the cubic.
4. Casus irreducibilis on the cubic gives the real trig Cardano form; Float64 agrees with direct minimization.

**Float64.** \(P_\star\approx 2.203855016036133\) (matches `tools/verify-unequal-mu-half.js`). Uses the **corrected** \(P\), not the buggy Gotoda (3.3)–\(B\) specialization that produced an earlier \(\approx 1.741\) witness.

**Disclaimer.** Classical Gotoda unequal-circulation family; closed form for the floor, not a claim of a new interaction law.

---

## 2. n = 5 polygon-collapse floor

Specialize the classical two-ring / general polygon collapse family (Koiller et al. 1985 §11; GENChase candidate 5) at order \(n=5\). With the standard planar \(2\pi\) Biot–Savart kernel,

\[
\omega_0 t_c=\frac{127\sqrt{2}-24\cos(5\theta)}{80\sin(5\theta)}\ge\frac{\sqrt{31682}}{80},\qquad 0<\theta<\frac\pi5,
\]

with equality uniquely at \(\cos(5\theta_*)=12\sqrt{2}/127\). The floor is

\[
F_5=\frac{\sqrt{31682}}{80}=2.224929774172659\ldots
\]

This is the \(n=5\) radical under the already-proved general formula

\[
F_n=\frac{\sqrt{K_n^2-(2n-1)}}{2n},\qquad
K_n=(n-1)\sinh\Bigl(\tfrac{n+2}{2}\operatorname{arcosh}\tfrac{n}{n-1}\Bigr),
\]

parallel to \(F_2=3\sqrt5/4\), \(F_3=\sqrt{29}/3\), \(F_4=\sqrt{322}/9\). **Not** a new dynamical family; **not** a new `IDENTITIES.md` row by itself.

### Proof sketch

1. For \(n=5\), \(K_5=127\sqrt2/8\).
2. Product form \(\omega_0 t_c=(K_5-3\cos(5\theta))/(10\sin(5\theta))\) clears to the boxed quotient.
3. Elementary bound \((a-b\cos\alpha)/\sin\alpha\ge\sqrt{a^{2}-b^{2}}\) with \(a=127\sqrt2\), \(b=24\) yields \(\sqrt{31682}/80\).
4. Consistency: \(F_5=\sqrt{K_5^{2}-9}/10\) recovers the same radical.

---

## 3. Verify status

| Item | Status |
|------|--------|
| \(P_\star\) closed form / minimal polynomials | Algebraic derivation + Float64 cross-check (`tools/verify-unequal-mu-half.js`) |
| \(F_5=\sqrt{31682}/80\) | Specialization of general \(F_n\); Float64 equality cosine / floor check (`tools/verify-new-formula-candidate.js`) |
| Priority / ledger stamp | **Unconfirmed** — no `IDENTITIES.md` promotion from this note |

---

## 4. Literature (floor-kill)

| Paper | Access | Verdict |
|-------|--------|---------|
| Koiller, Pinto-Schuhmacher, et al., *On Aref’s vortex motions with a symmetry center* (1985) | Full text read | **DOES NOT KILL** optimized product floors |
| H. Aref, *Point vortex motions with a center of symmetry*, Phys. Fluids **25**, 2183–2187 (1982), DOI [10.1063/1.863710](https://doi.org/10.1063/1.863710) | AIP PPV + OCR body read (2026-09-23) | **DOES NOT KILL** — center-of-symmetry integrability / Havelock double-ring dissolution; no floor literals |
| K. A. O’Neil, *Relative equilibrium and collapse configurations of heterogeneous vortex triple rings*, Physica D **236**, 123–130 (2007), DOI [10.1016/j.physd.2007.07.015](https://doi.org/10.1016/j.physd.2007.07.015) | ScienceDirect PPV body read (2026-09-23) | **DOES NOT KILL** — triple-ring finiteness / computation; cites Aref as background, Koiller for two-ring collapse existence; no optimized floors |

### Limits of those claims

- Verdicts are **floor-kill only**: absence of \(P_\star\), \(F_5=\sqrt{31682}/80\), equality cosines, and related rate numerals in the bodies read.
- They are **not** paper-equivalence audits of the full classical literature, and **not** a novelty certificate.
- Negative search \(\neq\) priority. Deeper OA greps (Gotoda, Leoncini, Kudela, Banica–Miot, Aref nested RE, …) likewise found no hard-needle hits; status remains **STILL OPEN / priority unconfirmed** ([`deeper-kill-Pstar-F5-2026-09-23.md`](../identities/sources/deeper-kill-Pstar-F5-2026-09-23.md)).

Copyrighted PDFs are **not** in the repository. Purchase / OA status: [`identities/sources/purchase-log-2026-09-23.md`](../identities/sources/purchase-log-2026-09-23.md).

---

## 5. What would still kill priority

Any of the following in a prior publication (or classical monograph specialization) would kill or demote priority of the closed forms as research contributions, while leaving the algebraic derivations intact as checks:

- Explicit appearance of \(P_\star\) as the Cardano / minpoly form above, or of the decimal \(2.203855\ldots\) as a named product floor on \(\Gamma=(1,1/2,-1/3)\).
- Explicit radical \(F_5=\sqrt{31682}/80\) (or equivalent \(\sqrt{15841}/(40\sqrt2)\)) as an optimized two-ring / pentagon collapse pitch.
- Prior minimization of Gotoda’s corrected \(P(\theta)\) (or equivalent \(-B/(2A)\)) at \(\mu=1/2\) yielding the same critical value.
- Clearance of \(K_5=127\sqrt2/8\) into the same elementary \(\sqrt{a^{2}-b^{2}}\) floor in a published note.

A later kill does **not** invalidate the verify scripts; it only removes priority.

---

## 6. How to cite (suggested)

> Closed forms for the μ = 1/2 Gotoda \(L=0\) product floor \(P_\star\) and the \(n=5\) polygon floor \(F_5=\sqrt{31682}/80\) were derived by Chase Hendrick (2026) in the SharpMeow/GENChase validation campaign; see `research/unequal-mu-product-floor-and-n5-polygon-floor-2026-09-23.md` and companion PDF. Status: proved candidates, priority unconfirmed. Classical families only.

---

## 7. References

1. H. Aref, Point vortex motions with a center of symmetry, *Phys. Fluids* **25**, 2183–2187 (1982). DOI 10.1063/1.863710.
2. J. Koiller, S. Pinto-Schuhmacher, et al., On Aref’s vortex motions with a symmetry center, *Physica D* (1985) / related center-symmetry two-ring collapse notes (GENChase body read 2026-09-23).
3. K. A. O’Neil, Relative equilibrium and collapse configurations of heterogeneous vortex triple rings, *Physica D* **236**, 123–130 (2007). DOI 10.1016/j.physd.2007.07.015.
4. Y. Gotoda, related \(L=0\) unequal-circulation collapse product (Prop. 2.1 / arc used in GENChase unequal-μ draft; arXiv source as filed in campaign OA mirror).
5. SharpMeow/GENChase campaign notes (2026-09-23): `identities/sources/unequal-mu-half-Pstar-closed-2026-09-23.md`, `new-formula-candidate-2026-09-23.md`, floor-kill reads for Koiller / Aref / O’Neil, `deeper-kill-Pstar-F5-2026-09-23.md`.

---

## Anti-claims

- No novelty claim beyond “closed form / explicit radical written down and checked in this campaign.”
- No personal named theorem.
- No `IDENTITIES.md` edit from this file.
- Lit verdicts are floor-kill only, not paper-equivalence audits of the full classical literature.
- PDF artifact contains only campaign-authored text (no copyrighted paper extracts).
