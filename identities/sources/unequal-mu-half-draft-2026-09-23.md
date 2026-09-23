# Unequal three-vortex spin–collapse product floor at μ = 1/2

> **Correction (2026-09-23, later).** P⋆ ≈ 2.2039 below is the minimum on Gotoda’s arc 0 < θ < θ₀ only. The opposite triangle orientation, π < θ < 2π − θ₀ in the same parametrization, also collapses, and its minimum is lower: P_min ≈ 1.064705976271204 = √(605/324 + (7√5201)/162 · cos(⅓ arccos(245351√5201/5201²) − 2π/3)), the other positive root of the same sextic. That is the μ = 1/2 floor. The critical cosine ≈ −0.924 dismissed below as "expanding side" is expanding only for sin θ > 0; with sin θ < 0 it collapses. All algebra about P⋆ below stays correct. Validation: `research/verify_floors_independent.py`; note: `research/artifacts/unequal-mu-n5-floors-2026-09-23.pdf`.

Scout / derivation date: 2026-09-23 (America/New_York).  
Bite: adjacent-open Bite 1 (`identities/sources/adjacent-open-2026-09-23.md`).  
**Do not** edit `IDENTITIES.md` from this note. **Do not** invent novelty.

**STATUS: proved candidate; priority unconfirmed**

---

## Exact claim

Fix circulations
\[
\Gamma=(1,\mu,-\mu/(1+\mu))\qquad\text{with}\quad\mu=\tfrac12,
\]
so \(\Gamma=(1,\tfrac12,-\tfrac13)\) and \(\Gamma_H=\Gamma_1\Gamma_2+\Gamma_2\Gamma_3+\Gamma_3\Gamma_1=0\).  
Work on Gotoda’s classical \(L=0\) circle construction (arXiv:2002.09624, §3.1, eqs. (3.5)–(3.6)), parameter \(\theta\in(0,\theta_0)\), where
\[
\cos\theta_0=-\frac{\Gamma_1-\Gamma_2}{2\sqrt{\mathcal R}}=-\frac{\sqrt7}{14},\qquad
\mathcal R=\Gamma_1^2+\Gamma_1\Gamma_2+\Gamma_2^2=\tfrac74.
\]
On this arc the similarity rate \(C=A+iB\) from the **2π Biot–Savart kernel** (Gotoda (2.4) / Prop. 2.1) satisfies \(A<0\) (finite-time collapse), and
\[
P(\theta)=\omega_0 t_c=-\frac{B}{2A}
\]
is positive and continuous, with \(P\to+\infty\) as \(\theta\to 0^+\) or \(\theta\to\theta_0^-\).

**Theorem (candidate).** On the collapsing arc,
\[
P(\theta)=\frac{14\sin^2\theta+6\sqrt7\cos\theta+21}{2(14\cos\theta+\sqrt7)\sin\theta}
\ge P_\star,
\]
with equality at a unique interior critical point \(\theta_\star\in(0,\theta_0)\) whose cosine solves the cubic
\[
c^3+\frac{8\sqrt7}{7}\,c^2+\frac1{14}\,c-\frac{32\sqrt7}{49}=0
\]
and admits the real radical / triple-angle form
\[
\cos\theta_\star=-\frac{8\sqrt7}{21}+\frac{5\sqrt{70}}{21}\cos\!\Bigl(\frac13\arccos\Bigl(-\frac{124\sqrt{10}}{3125}\Bigr)\Bigr).
\]
The floor value is
\[
P_\star=P(\theta_\star)\approx 2.203855016036133
\]
(Float64; exact expression via substitution of \(\cos\theta_\star\) into \(P\) is algebraic over \(\mathbb Q(\sqrt7,\sqrt{10})\) but not simplified further here).

This is **not** the equal-strength Gröbli / Aref floor \(\sqrt2\) (\(\mu=1\)). Reciprocal \(\mu\leftrightarrow 1/\mu\) shares the same product, so \(\mu=2\) is the same candidate.

---

## Derivation sketch

1. **Positions.** Gotoda (3.6) with \(\Gamma_1=1\), \(\Gamma_2=1/2\), \(\mathcal R=7/4\), \(k_3=1\):
   \[
   k_1=\frac{\Gamma_1\Gamma_2}{(\Gamma_1+\Gamma_2)^2}\Bigl(1+\frac{\sqrt{\mathcal R}}{\Gamma_1}e^{-i\theta}\Bigr),\quad
   k_2=\frac{\Gamma_1\Gamma_2}{(\Gamma_1+\Gamma_2)^2}\Bigl(1-\frac{\sqrt{\mathcal R}}{\Gamma_2}e^{-i\theta}\Bigr).
   \]
   Orientation of this construction makes \(\sigma_{123}=-1\) relative to the unsigned area in (3.3); equivalently, compute \(C\) from (2.4) directly.

2. **Rates from the 2π kernel.** Evaluating Gotoda (2.4) at \(k_3=1\) (or Prop. 2.1 on any pair) and simplifying yields
   \[
   \begin{aligned}
   A(\theta)&=-\frac{27(14\cos\theta+\sqrt7)\sin\theta}{28\pi\,D(\theta)},\\
   B(\theta)&=\frac{27(14\sin^2\theta+6\sqrt7\cos\theta+21)}{28\pi\,D(\theta)},\\
   D(\theta)&=28\sin^2\theta+5\sqrt7\cos\theta+16.
   \end{aligned}
   \]
   Hence the scale factors cancel in the product:
   \[
   P(\theta)=-\frac{B}{2A}=\frac{14\sin^2\theta+6\sqrt7\cos\theta+21}{2(14\cos\theta+\sqrt7)\sin\theta}.
   \]
   Sign check: \(14\cos\theta+\sqrt7>0\) iff \(\theta<\theta_0\), and \(A<0\) on \((0,\theta_0)\).

3. **Critical points.** Write \(P=N(c)/(D_0(c)\,s)\) with \(c=\cos\theta\), \(s=\sin\theta>0\),
   \[
   N(c)=35-14c^2+6\sqrt7\,c,\qquad D_0(c)=2(14c+\sqrt7).
   \]
   Setting \(dP/d\theta=0\) and clearing \(s\) produces the cubic over \(\mathbb Q(\sqrt7)\)
   \[
   c^3+\frac{8\sqrt7}{7}c^2+\frac1{14}c-\frac{32\sqrt7}{49}=0
   \]
   (equivalently \(196c^3+224\sqrt7\,c^2+14c-128\sqrt7=0\)). Three real roots; the unique root in \((-\sqrt7/14,1)\) is \(\cos\theta_\star\) above. The root \(c\approx-0.924<- \sqrt7/14\) lies on the expanding side.

4. **Uniqueness of the interior minimum.** Dense sampling of \(P\) on \((0,\theta_0)\) plus ternary refinement recovers a single argmin agreeing with \(\theta_\star\) to Float64; \(P\to+\infty\) at both endpoints ⇒ that critical point is a global minimum on the collapsing arc.

### Correction to the adjacent-open witness formula

The note `adjacent-open-2026-09-23.md` and the RESEARCH.md skip line quoted
\[
P\stackrel{?}{=}\frac{56\cos^2\theta-10\sqrt7\cos\theta-133}{8(14\cos\theta+\sqrt7)\sin\theta}
\]
(\(\Rightarrow\) numerical “min” \(\approx 1.741\)). That expression follows from specializing **Gotoda (3.3) for \(B\)** together with (3.3) for \(A\). For \(\Gamma_1=\Gamma_2\) this matches Prop. 2.1, but for \(\Gamma_1\neq\Gamma_2\) Gotoda’s (3.3) \(B\) **disagrees** with Prop. 2.1 and with direct Biot–Savart (same 2π kernel): at the would-be critical point one gets \(B_{(3.3)}\approx0.242\) vs \(B_{\mathrm{BS}}\approx0.309\). The \(A\) formula from (3.3) (with construction orientation) is consistent; the product must use Prop. 2.1 / (2.4). The formula in the claim above is the corrected one (\(P_\star\approx 2.204\)).

---

## Numerical value and equality angle

| Quantity | Value (Float64) |
|---|---|
| \(\cos\theta_\star\) | \(0.6739838839479824\) |
| \(\theta_\star\) | \(0.83120796\) rad \(\approx 47.625^\circ\) |
| \(P_\star\) | \(2.2038550160361328\) |
| \(\theta_0\) | \(\arccos(-\sqrt7/14)\approx 100.893^\circ\) |

Verify script: `tools/verify-unequal-mu-half.js`  
Results: `validation/results/unequal-mu-half.json` (all checks PASS, including Biot–Savart residual \(\sim 10^{-16}\), sample min vs \(P_\star\), and that Gotoda (3.3)–\(B\) disagrees).

---

## Literature check (quick; not a priority claim)

| Source | What was checked | Match to this \(P_\star\) / cubic? |
|---|---|---|
| Gotoda, arXiv:2002.09624 §3.1 | Closed \(A,B\) for general \(\Gamma_1,\Gamma_2\); equal-slice (3.8); no optimization of \(-B/(2A)\) for \(\mu\neq1\) | **No** floor; (3.3) \(B\) buggy off equal slice |
| Aref, Phys. Fluids 22, 057104 (2010) | Separate \(\Omega\), \(\tau\); product as spiral pitch (eq. 29) | Rates classical; no \(\mu=1/2\) min |
| Krishnamurthy–Stremler, RCD 2018 (postprint) | $\tilde\tau$, circumcenter path $\tilde s(1)=2\tilde\tau|K_2|$ with numerical bound $\tilde s(1)>2$; geometry for general $g=\Gamma_1/\Gamma_2$ | Different observable from $P=-B/(2A)$. **No** collision with $P_\star\approx 2.203855$ or this cubic in $\cos\theta$ |
| Leoncini–Kuznetsov–Zaslavsky 2000 | Minimizes \(t_c\) on the **equal** slice (\(4\pi/3\)) | Not this product / not unequal |
| Web / arXiv queries (2026-09-23) for \(2.203\ldots\), \(2.204\), \(\mu=1/2\) product floor | No hit tying that constant to a three-vortex \(\omega_0 t_c\) minimum | None located |

Honest reading: the **family** and the **product-as-pitch** are classical. An explicit optimized radical / cubic for a named \(\mu\neq1\) was not located in this pass. Krishnamurthy–Stremler’s geometric quantities are close enough that an unnoticed equivalent minimum remains plausible. Treat priority as **unconfirmed**. This is still the same three-vortex \(L=0\) family as the equal-slice \(\sqrt2\) bound (RESEARCH skip table); it is a different algebraic quotient (cubic critical point, not \((a-b\cos)/\sin\)).

---

## Non-claims

- Not a new dynamical family.
- Not Gröbli’s equal-strength spiral coefficient under a new name.
- Not a claim that Gotoda (3.3) is globally wrong for \(A\); only that its \(B\) specialization fails the 2π kernel when \(\Gamma_1\neq\Gamma_2\).
- No personal name attached.
- `IDENTITIES.md` untouched.

---

## Artifacts

- `tools/verify-unequal-mu-half.js`
- `validation/results/unequal-mu-half.json`
- This draft: `identities/sources/unequal-mu-half-draft-2026-09-23.md`
