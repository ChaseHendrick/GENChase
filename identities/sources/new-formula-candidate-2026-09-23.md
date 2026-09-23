# Explicit pentagon (n=5) polygon-collapse floor

Scout / derivation date: 2026-09-23 (America/New_York).  
Bite: preferred A — exact radical simplification of polygon floor \(F_n\) for a new \(n\) beyond the already-written \(n=2,3,4\) specializations.  
**Do not** edit `IDENTITIES.md` from this note. **Do not** invent novelty.

**STATUS: proved candidate; priority unconfirmed**

---

## Exact claim

Specialize the classical two-ring / general polygon collapse family (Koiller et al. 1985, §11; GENChase candidate 5) at order \(n=5\). Circulations: five outer vortices of strength \(-1\) at the vertices of a regular pentagon of circumradius \(\sqrt{x_5}\), and five inner vortices of strength \(x_5=2\) at the unit regular pentagon, relative rotation \(\theta\in(0,\pi/5)\). With the standard planar \(2\pi\) Biot–Savart kernel the configuration collapses self-similarly, and

\[
\boxed{\omega_0 t_c=\frac{127\sqrt{2}-24\cos(5\theta)}{80\sin(5\theta)}\ge\frac{\sqrt{31682}}{80},\qquad 0<\theta<\frac\pi5.}
\]

Equality holds uniquely at

\[
\boxed{\cos(5\theta_*)=\frac{12\sqrt{2}}{127},\qquad
\theta_*=16.4641593424\ldots{}^\circ.}
\]

The floor value is \(F_5=\sqrt{31682}/80=2.224929774172659\ldots\). Equivalent forms: \(\sqrt{31682}= \sqrt{2\cdot7\cdot31\cdot73}=\sqrt{2}\,\sqrt{15841}\), so \(F_5=\sqrt{15841}/(40\sqrt{2})\).

This is **not** a new dynamical family and **not** a sixth independent identity row. It is the first explicit radical for \(n=5\) under the already-proved general formula

\[
F_n=\frac{\sqrt{K_n^2-(2n-1)}}{2n},\qquad
K_n=(n-1)\sinh\Bigl(\tfrac{n+2}{2}\operatorname{arcosh}\tfrac{n}{n-1}\Bigr),
\]

parallel to the already-written specializations \(F_2=3\sqrt5/4\), \(F_3=\sqrt{29}/3\), \(F_4=\sqrt{322}/9\). Those three and the general \(F_n\) expression are already in `IDENTITIES.md` / `identities/polygon-collapse.md`; the cleared radical for \(n=5\) is not.

---

## Derivation sketch

1. **Parameters.** For \(n=5\), \(d_5=\sqrt{2\cdot5-1}=3\), \(x_5=(5+3)/(5-1)=2\), \(\cosh\eta=5/4\), \(\sinh\eta=3/4\).

2. **Hyperbolic coefficient.** From the general identity
   \[
   K_n=\frac{n-1}{2}\Bigl(x_n^{(n+2)/2}-x_n^{-(n+2)/2}\Bigr)
   \]
   with \(x_5=2\),
   \[
   K_5=2\bigl(2^{7/2}-2^{-7/2}\bigr)=2\Bigl(8\sqrt2-\frac{\sqrt2}{16}\Bigr)=\frac{127\sqrt2}{8}.
   \]

3. **Product.** The general theorem gives
   \[
   \omega_0 t_c=\frac{K_5-3\cos(5\theta)}{10\sin(5\theta)}.
   \]
   Clearing the factor \(8\) in \(K_5\) produces the boxed quotient
   \((127\sqrt2-24\cos\alpha)/(80\sin\alpha)\) with \(\alpha=5\theta\).

4. **Sharp minimum.** For \(a>|b|>0\) and \(0<\alpha<\pi\),
   \[
   \frac{a-b\cos\alpha}{\sin\alpha}\ge\sqrt{a^2-b^2},\qquad\cos\alpha_*=\frac b a.
   \]
   Here \(a=127\sqrt2\), \(b=24\), so
   \[
   \sqrt{a^2-b^2}=\sqrt{2\cdot127^2-576}=\sqrt{31682},
   \]
   and \(\cos(5\theta_*)=24/(127\sqrt2)=12\sqrt2/127\). Dividing by \(80\) yields the floor. Uniqueness on \((0,\pi)\) is the same elementary identity used for candidates 1–5.

5. **Consistency with general \(F_n\).** Substituting \(K_5=127\sqrt2/8\) into \(F_5=\sqrt{K_5^2-9}/10\) recovers \(\sqrt{31682}/80\) exactly (algebraic identity over \(\mathbb Q(\sqrt2)\)).

---

## Numerical value and equality angle

| Quantity | Value (Float64) |
|---|---|
| \(K_5\) | \(22.45064030267288\) (\(127\sqrt2/8\)) |
| \(\cos(5\theta_*)\) | \(0.1336264783344657\) (\(12\sqrt2/127\)) |
| \(\theta_*\) | \(0.287356\ldots\) rad \(\approx 16.4641593425^\circ\) |
| \(F_5\) | \(2.224929774172659\) (\(\sqrt{31682}/80\)) |

Verify script: `tools/verify-new-formula-candidate.js`  
Results: `validation/results/new-formula-candidate-2026-09-23.json`

---

## Literature / novelty honesty

| Source | What was checked | Match to this radical? |
|---|---|---|
| GENChase `IDENTITIES.md` / `polygon-collapse.md` | General \(F_n\); explicit \(F_2,F_3,F_4=\sqrt{322}/9\) | **No** explicit \(F_5=\sqrt{31682}/80\) |
| `identities/NOVELTY-AUDIT.md` | Candidates 4–5; warns against counting each \(n\) as a separate discovery | Treat as specialization of candidate 5, not a new row |
| Koiller et al. 1985 §11 | Two-ring collapse for arbitrary \(n\) (family classical; full PDF historically unread here) | Family classical; optimized radical not located in excerpts |
| RESEARCH skip tables | \(\mu\neq1\) three-vortex; quincunx/parallelogram floors; \(\sqrt{29}/3\), \(\sqrt{322}/9\) | Different; do not reclaim those |

Honest reading: the **family**, the **product form**, and the **general floor \(F_n\)** are already in-repo proved candidates. The prospective contribution of *this* note is only the cleared algebraic specialization at \(n=5\). Priority of that explicit radical relative to unread full texts (especially Koiller et al.) remains **unconfirmed**. Counting pentagons as a sixth confirmed discovery would exaggerate the contribution (NOVELTY-AUDIT).

---

## Non-claims

- Not a new collapse family.
- Not a re-derivation of \(F_2,F_3,F_4\) or of the general \(F_n\) theorem.
- Not \(\mu\neq1\) three-vortex / \(P_\star\approx2.204\) (separate draft).
- Not Krishnamurthy–Stremler circumcenter path length \(\widetilde s(1)\ge3\) (equal-slice equivalent of \(\sqrt2\), already noted in the audit).
- No personal name attached.
- `IDENTITIES.md` untouched.

---

## Artifacts

- `tools/verify-new-formula-candidate.js`
- `validation/results/new-formula-candidate-2026-09-23.json`
- This draft: `identities/sources/new-formula-candidate-2026-09-23.md`
