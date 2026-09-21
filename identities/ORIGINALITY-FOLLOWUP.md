# Originality follow-up after the five-bound audit

2026-09-20 (local date). Follow-up to [the audit](NOVELTY-AUDIT.md), after PR #76 merged.

**Originality is still not established.** The strongest new evidence is an explicit reduction of candidate 1 to a formula printed in 1877. This identifies an older mathematical foundation more precisely; it does not establish who first stated the sharp minimum.

## Candidate 1: direct comparison with Gröbli

Gröbli's original dissertation, §10, pp. 56–58, gives both the similarity rate and spiral coefficient. The [Bayerische Staatsbibliothek scan, printed p. 57](https://www.digitale-sammlungen.de/en/view/bsb11358655?page=61), equations (9), (11) and (12), was inspected directly. Equation (8) is on printed p. 56. [Goodman's English translation](https://roygoodman.net/publication/grobli_translation/grobli_translation.pdf), §10, provides a readable cross-reference, numbered (10.8)–(10.15).

The original uses a spiral coefficient here denoted by $\kappa$, with $d\vartheta=\kappa\,dt/(2t)$. Shifting the time origin to collapse gives $P=|\omega_0|t_c=|\kappa|/2$. Substitute the circulation ratios $(m_1,m_2,m_3)=(1,1,-1/2)$ into Gröbli's equations. His shape parameters become

$$
\mu_1=a-\frac32,\qquad \mu_2=a+\frac32,\qquad \mu_3=a.
$$

On the branch $a>\sqrt3$, substitution in (9) and (12) gives

$$
P=\frac{2a^2-3}{2\sqrt{3a^2-9}}.
$$

Now set $a=\sqrt3/\cos\theta$, with $0<\theta<\pi/2$. This becomes exactly

$$
P=\frac{2-\cos^2\theta}{\sin2\theta},
$$

the formula called Three-vortex collapse bound in this project. This equivalence is our calculation from the published equations, not a claim that Gröbli used this name or parameterization.

The extra optimization is transparent. For $u=a^2>3$,

$$
P^2-2=\frac{(2u-9)^2}{12(u-3)}\ge0.
$$

Equality holds at $u=9/2$, equivalent to $\tan\theta=1/\sqrt2$. This establishes the bound mathematically, but supplies no historical evidence that its optimization was first performed here. The printed passage inspected does not state that minimum.

**Transcription check:** the translation's (10.9) prints $\mu_1\mu_3\mu_3$ in the denominator. The 1877 original (9) clearly has $\mu_1\mu_2\mu_3$. The calculation above uses the original. Both the change of variables and squared-excess formula were checked at 999 exact rational values of $\cos^2\theta$; all agreed.

## What changes for the five candidates

| Candidate | Supported classification after this follow-up |
|---|---|
| 1. Three-vortex collapse bound | Explicit specialization and reparameterization of Gröbli's published spiral coefficient. Priority of the optimized minimum remains unconfirmed. |
| 2. Parallelogram lock | An elementary optimized corollary of published four-vortex rates. No earlier exact minimum was located in the inspected material; this is not proof of originality. |
| 3. Quincunx lock | An elementary optimized corollary of published five-vortex rates. The same limitation applies. |
| 4. Double-triangle bound | A specialization of candidate 5 on a classical two-ring family. The important 1985 full-text gap remains. |
| 5. General polygon bound | A proved candidate general bound, including candidates 2 and 4. Historical priority remains unresolved; it cannot be counted as independent of those cases. |

## Additional sources and access checks

- [Synge, 1949](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/D5FF587F4F403DE1FF58F505F0E1D49F/S0008414X00035045a.pdf/div-class-title-on-the-motion-of-three-vortices-div.pdf), §4 and the singular-configuration discussion, includes the exceptional collapse family and illustrates the equal-positive-strength slice. The passages inspected do not establish priority of the spin–time minimum.
- [Lewkowicz, arXiv:1512.04668](https://arxiv.org/pdf/1512.04668), Lemma 3.1 and §§5, 7–10, gives similarity trajectories, scale invariance of their phase, the three-vortex circle, and the classical parallelogram family. Its optimization seeks zeros of a residual field to find configurations; it is not minimization of the spin–time product. No matching bound was located in those sections.
- [Ting, Knio and Blackmore, arXiv:0807.0454](https://arxiv.org/pdf/0807.0454) was opened and its trilinear-coordinate discussion inspected. It studies collapse families and nearby dynamics, rather than establishing any of the five specific minima in the passages inspected.
- [Koiller et al., 1985](https://doi.org/10.1016/0167-2789(85)90084-3): OpenAlex and Semantic Scholar returned closed-access records without an open full-text location. A fresh request to the indexed CiteSeer PDF timed out. **The full text remains unread.** Repeating unsuccessful searches does not turn this gap into evidence of novelty.

## Remaining priority question

The precise literature question is whether earlier work optimized $|\operatorname{Im}\lambda|/(2|\operatorname{Re}\lambda|)$, or an equivalent spiral-pitch or normalized-path-length quantity, over these fixed-circulation collapse families. The first candidate already has an explicit general predecessor; candidates 2 and 3 follow published rates; candidates 4 and 5 require comparison with the complete two-ring literature.

Full access to Koiller's §11 and a specialist's comparison of the exact statements are the next useful steps. No specialist was contacted and no endorsement was obtained. The evidence supports independently derived formulas and elementary sharp corollaries on classical families, **not five established original discoveries**.
