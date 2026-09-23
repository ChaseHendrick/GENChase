# Closed form for the μ = 1/2 spin–collapse product floor P⋆

Scout / derivation date: 2026-09-23 (America/New_York).  
Parent draft: `identities/sources/unequal-mu-half-draft-2026-09-23.md`.  
Bite: adjacent-open Bite 1 — exact expression for the floor, not just Float64.  
**Do not** edit `IDENTITIES.md` from this note. **Do not** invent novelty.

**STATUS: proved candidate; priority unconfirmed**

---

## Exact claim

On Gotoda’s classical \(L=0\) collapsing arc for \(\Gamma=(1,\tfrac12,-\tfrac13)\), with the corrected product from the 2π Biot–Savart kernel / Gotoda Prop. 2.1
\[
P(\theta)=\frac{14\sin^2\theta+6\sqrt7\cos\theta+21}{2(14\cos\theta+\sqrt7)\sin\theta},
\]
the unique interior minimum \(P_\star=P(\theta_\star)\) admits the real trigonometric Cardano form
\[
\boxed{
P_\star=\sqrt{\dfrac{605}{324}+\dfrac{7\sqrt{5201}}{162}\cos\!\Bigl(\dfrac13\arccos\Bigl(\dfrac{245351\sqrt{5201}}{5201^{2}}\Bigr)\Bigr)}.
}
\]
(Equivalently \(5201^{2}=27050401\).) This is the unique positive real root greater than \(2\) of the irreducible sextic
\[
\boxed{8748\,x^{6}-49005\,x^{4}+27794\,x^{2}+18723=0},
\]
which is the minimal polynomial of \(P_\star\) over \(\mathbb Q\). Equivalently \(q=P_\star^{2}\) is the unique real root in \((4,5)\) of the irreducible cubic
\[
8748\,q^{3}-49005\,q^{2}+27794\,q+18723=0.
\]

Float64 cross-check: \(P_\star\approx 2.203855016036133\) (agrees with the parent draft / `tools/verify-unequal-mu-half.js` to all displayed digits).

This uses the **corrected** \(P\) (Prop. 2.1), not the buggy Gotoda (3.3)–\(B\) specialization that produced the earlier \(\approx 1.741\) witness in RESEARCH.md.

---

## Derivation sketch

1. **Critical cosine.** From the parent draft, \(\cos\theta_\star\) is the unique root in \((-\sqrt7/14,1)\) of
   \[
   c^{3}+\frac{8\sqrt7}{7}c^{2}+\frac1{14}c-\frac{32\sqrt7}{49}=0
   \]
   (equivalently \(196c^{3}+224\sqrt7\,c^{2}+14c-128\sqrt7=0\)), with triple-angle form
   \[
   \cos\theta_\star=-\frac{8\sqrt7}{21}+\frac{5\sqrt{70}}{21}\cos\!\Bigl(\tfrac13\arccos\bigl(-\tfrac{124\sqrt{10}}{3125}\bigr)\Bigr).
   \]

2. **Algebraic relation for \(P\).** Write \(s=\sin\theta=\sqrt{1-c^{2}}\) and
   \[
   P=\frac{N(c)}{D_{0}(c)\,s},\qquad N=35-14c^{2}+6\sqrt7\,c,\quad D_{0}=2(14c+\sqrt7).
   \]
   Squaring gives the bihomogeneous relation
   \[
   P^{2}\,D_{0}(c)^{2}\,(1-c^{2})-N(c)^{2}=0.
   \]

3. **Resultant elimination.** Treat \(s_{7}=\sqrt7\) as an indeterminate. The resultant in \(c\) of the critical cubic against the squared relation is a polynomial in \((P,s_{7})\). Eliminating \(s_{7}\) via \(s_{7}^{2}-7=0\) yields (up to a nonzero constant square factor)
   \[
   \bigl(8748\,P^{6}-49005\,P^{4}+27794\,P^{2}+18723\bigr)^{2}=0.
   \]
   Hence every critical value of \(P\) on either arc satisfies the sextic \(f_{6}(P)=0\). Direct substitution of the collapsing-arc critical point shows \(f_{6}(P_\star)=0\) and \(f_{3}(P_\star^{2})=0\) where \(f_{3}(q)=8748q^{3}-49005q^{2}+27794q+18723\).

4. **Irreducibility / minimality.** Sympy’s `Poly.is_irreducible` over \(\mathbb Q\) reports both \(f_{3}\) and \(f_{6}\) irreducible. PSLQ on high-precision \(P_\star^{2}\) recovers exactly the coefficient vector of \(f_{3}\) at degree 3 and finds no lower-degree relation; PSLQ on even powers of \(P_\star\) recovers \(f_{6}\). Therefore \(\minpoly_{\mathbb Q}(P_\star)=f_{6}\) (primitive) and \([\mathbb Q(P_\star):\mathbb Q]=6\). In particular \(P_\star\notin\mathbb Q(\sqrt7,\sqrt{10})\) (that field has degree \(4\)).

5. **Trigonometric Cardano form.** The cubic \(f_{3}\) has positive discriminant (three distinct real roots: casus irreducibilis). Depressing via \(q=z+605/324\) produces
   \[
   z^{3}-\frac{254849}{34992}z-\frac{84155393}{17006112}=0.
   \]
   The standard real solution is
   \[
   z=2\cdot\frac{7\sqrt{5201}}{324}\cos\!\Bigl(\tfrac13\arccos\Bigl(\frac{245351\sqrt{5201}}{5201^{2}}\Bigr)\Bigr),
   \]
   and the root in \((4,5)\) is \(q=P_\star^{2}\) (the other two real roots of \(f_{3}\) are \(\approx 1.134\) and \(\approx-0.389\), corresponding to the other critical values / sign siblings of \(f_{6}\)). Taking the positive square root yields the boxed formula. (The matching complex Cardano branch is
   \[
   P_\star^{2}=\frac{605}{324}+\frac{7}{324}\Bigl(\alpha+\frac{5201}{\alpha}\Bigr),
   \]
   with \(\alpha^{3}=245351+11720\sqrt{586}\,i\) and \(|\alpha|=\sqrt{5201}\); it is not simpler as a real expression.)

6. **No simpler pure radical over \(\mathbb Q\).** Because \(f_{3}\) is an irreducible cubic with three real roots, denesting to real radicals alone is impossible (casus irreducibilis). No degree-\(<6\) polynomial relation for \(P_\star\) over \(\mathbb Q\) exists. Nested radicals involving \(\sqrt7,\sqrt{10}\) from substituting \(\cos\theta_\star\) into \(P\) remain valid but do not simplify below the degree-6 trig/Cardano form above (field-degree obstruction).

---

## Numerical value

| Quantity | Value |
|---|---|
| \(P_\star\) (trig form, Float64) | \(2.2038550160361328\) |
| \(P_\star^{2}\) | \(4.856976931707623\) |
| Parent draft Float64 | \(2.2038550160361328\) |
| Target check \(2.203855016036133\) | agrees to \(\ge 12\) digits (\(|\Delta|\sim 2\cdot10^{-16}\)) |
| \(f_{6}(P_\star)\) residual | \(0\) at 80 decimal places (mpmath) |
| \(5201=7\cdot743\) (square-free) | — |

Verify: `tools/verify-unequal-mu-half.js` (includes closed-form checks).  
Results: `validation/results/unequal-mu-half-Pstar.json`.

---

## Non-claims

- Not a new dynamical family; same Gotoda \(L=0\) arc as the parent draft.
- Not a priority / novelty claim; literature status remains **unconfirmed** (see parent draft).
- Not a claim that Gotoda (3.3) \(B\) is globally wrong for \(A\); only that unequal-\(\Gamma\) products must use Prop. 2.1.
- `IDENTITIES.md` untouched.
- No personal name attached.

---

## Artifacts

- Parent: `identities/sources/unequal-mu-half-draft-2026-09-23.md`
- This note: `identities/sources/unequal-mu-half-Pstar-closed-2026-09-23.md`
- `tools/verify-unequal-mu-half.js`
- `validation/results/unequal-mu-half.json`
- `validation/results/unequal-mu-half-Pstar.json`
