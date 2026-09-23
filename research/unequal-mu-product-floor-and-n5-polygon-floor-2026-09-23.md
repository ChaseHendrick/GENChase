# Unequal-μ product floor and n=5 polygon floor

**Date.** 2026-09-23 (America/New_York).  
**Repo.** SharpMeow/GENChase.  
**Attribution for citers.** These closed forms and the accompanying literature checks were **found / derived in this campaign by Chase Hendrick**. Cite the person by that name. Do **not** attribute the results to the GitHub handle SharpMeow, and do **not** treat this note as a personal theorem stamp or named identity (no “Hendrick’s Identity / Law”).

**Status.** Proved candidates; **priority unconfirmed**. Same classical families as existing GENChase polygon / two-ring work — **not** a new dynamical family and **not** a sixth independent `IDENTITIES.md` row. This note does **not** edit `IDENTITIES.md`.

---

## What is recorded here

1. Exact closed form for the **μ = 1/2** Gotoda \(L=0\) spin–collapse **product floor** \(P_\star\).
2. Explicit radical for the **n = 5** polygon-collapse floor \(F_5=\sqrt{31682}/80\).
3. Verify / Float64 status.
4. Literature floor-kill results: **Koiller 1985**, **Aref 1982**, **O’Neil 2007** — all **DOES NOT KILL**.

Detail drafts (do not duplicate every algebra here):

- [`identities/sources/unequal-mu-half-Pstar-closed-2026-09-23.md`](../identities/sources/unequal-mu-half-Pstar-closed-2026-09-23.md)
- [`identities/sources/new-formula-candidate-2026-09-23.md`](../identities/sources/new-formula-candidate-2026-09-23.md)
- [`identities/sources/koiller1985-read-2026-09-23.md`](../identities/sources/koiller1985-read-2026-09-23.md)
- [`identities/sources/aref1982-read-2026-09-23.md`](../identities/sources/aref1982-read-2026-09-23.md)
- [`identities/sources/oneil2007-read-2026-09-23.md`](../identities/sources/oneil2007-read-2026-09-23.md)
- [`identities/sources/purchase-log-2026-09-23.md`](../identities/sources/purchase-log-2026-09-23.md)

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

**Float64.** \(P_\star\approx 2.203855016036133\) (matches `tools/verify-unequal-mu-half.js` / parent draft digits). Uses the **corrected** \(P\), not the buggy Gotoda (3.3)–\(B\) specialization that produced an earlier \(\approx 1.741\) witness.

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

---

## 3. Verify status

| Item | Status |
|------|--------|
| \(P_\star\) closed form / minimal polynomials | Algebraic derivation + Float64 cross-check (`tools/verify-unequal-mu-half.js`) |
| \(F_5=\sqrt{31682}/80\) | Specialization of general \(F_n\); Float64 equality cosine / floor check in candidate note |
| Priority / ledger stamp | **Unconfirmed** — no `IDENTITIES.md` promotion from this note |

---

## 4. Literature (floor-kill)

| Paper | Access | Verdict |
|-------|--------|---------|
| Koiller, Pinto-Schuhmacher, et al., *On Aref’s vortex motions with a symmetry center* (1985) | Full text read | **DOES NOT KILL** optimized product floors |
| H. Aref, *Point vortex motions with a center of symmetry*, Phys. Fluids **25**, 2183–2187 (1982), DOI [10.1063/1.863710](https://doi.org/10.1063/1.863710) | AIP PPV + OCR body read (2026-09-23) | **DOES NOT KILL** — center-of-symmetry integrability / Havelock double-ring dissolution; no floor literals |
| K. A. O’Neil, *Relative equilibrium and collapse configurations of heterogeneous vortex triple rings*, Physica D **236**, 123–130 (2007), DOI [10.1016/j.physd.2007.07.015](https://doi.org/10.1016/j.physd.2007.07.015) | ScienceDirect PPV body read (2026-09-23) | **DOES NOT KILL** — triple-ring finiteness / computation; cites Aref as background, Koiller for two-ring collapse existence; no optimized floors |

Copyrighted PDFs are **not** in the repository. Purchase / OA status: [`identities/sources/purchase-log-2026-09-23.md`](../identities/sources/purchase-log-2026-09-23.md).

---

## 5. How to cite (suggested)

> Closed forms for the μ = 1/2 Gotoda \(L=0\) product floor \(P_\star\) and the \(n=5\) polygon floor \(F_5=\sqrt{31682}/80\) were derived by Chase Hendrick (2026) in the SharpMeow/GENChase validation campaign; see `research/unequal-mu-product-floor-and-n5-polygon-floor-2026-09-23.md`. Status: proved candidates, priority unconfirmed. Classical families only.

---

## Anti-claims

- No novelty claim beyond “closed form / explicit radical written down and checked in this campaign.”
- No personal named theorem.
- No `IDENTITIES.md` edit from this file.
- Lit verdicts are floor-kill only, not paper-equivalence audits of the full classical literature.
