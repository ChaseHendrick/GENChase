# Fourth in-project reading of the manuscript (2026-09-27): the proofs written in response to the three readings

**This is an in-project reading by an independent agent session (a separate headless Claude Code session started for
it), made on 2026-09-27. It is not an outside review.** Its brief (reproduced at the end) named, as primary targets,
the passages that were written or changed on 2026-09-27 after the three readings of that day and had not been read
separately: Section 4.8 with Lemma 4.7 (Faye's model), the proof of Lemma 4.3, the proof of Lemma 5.8, the corrected
quantifiers, and, written today before the reading started, the Fredholm step of Proposition 5.1 (now cited from
Dyatlov and Zworski), the proof of the complex Krawczyk test in Section 6 and the citations of Teschl. The session was
given only a copy of `paper/`, `code/`, `data/` and `ext/` (without the `REPORT.md` files) and text excerpts of the
two cited books (Teschl 2012, Sections 2.4, 2.6, 6.1 and 9.2; Dyatlov and Zworski, Appendix C.1 to C.3); it did not
see `notes/` or `review/`. It read the manuscript at commit a48094e (with the Priority paragraph already rewritten as
"Earlier work"). Its lemma numbers in "What was checked" do not always match the manuscript's; the line numbers and
labels it gives are the reliable references. The report follows verbatim; the response is at the end.

---

# Referee report

## Verdict (accept / minor revision / major revision, one line)
Minor revision: after checking every identity and hypothesis in the five primary targets line by line (including independent symbolic recomputation of all polynomial/eigenvector algebra), I found no error that makes a proof wrong or a stated result false; a handful of proof steps are compressed to the point that a careful referee should ask for them to be spelled out.

## Must fix
None found in the primary targets (Section 4.8/Theorem 5, Lemma 4.3, Lemma 5.8, Proposition 5.1, the Krawczyk paragraph, the Teschl citations, and the quantifier passages listed in the brief). See "What was checked" for the computations that back this up.

## Should fix
1. **nf-pulse.tex:371, proof of Lemma 4.3 (lem:branch).** The sentence "shrinking $N$, it is all of $W$" asserts, without argument, that the parametrized arc $\{\pi\Phi_\kappa(t):|t|<t_N\}$ is not just contained in but equal to the local unstable manifold $W$ furnished by Teschl's Theorems 9.4–9.5. The inclusion $\subseteq$ is justified in the text (the backward orbit of $\pi\Phi_\kappa(t)$ is the sub-arc $\pi\Phi_\kappa(te^{\mu s})$, $s\le 0$, which lies in $N$ by construction). The reverse inclusion needs an extra sentence: the $E^-$-projection $a(t)$ of $\pi\Phi_\kappa(t)-x_*$ has $a(0)=0$, $a'(0)=\pi a_1\ne0$ (the unstable eigenvector), so by the 1-D inverse function theorem $a$ is a local diffeomorphism of $(-t_N,t_N)$ onto a neighbourhood of $0$ in $E^-$; since $W\cap N$ is exactly the graph of $h^-$ over that same neighbourhood (Theorem 9.4), the arc's image is all of $W\cap N$ once $t_N$ is small enough. I verified this argument is correct and closes the gap, but the manuscript does not give it. Fix: add the one or two sentences above.
2. **nf-pulse.tex:687, proof of Lemma 5.8 (lem:multiplicity).** $\varphi_1=(p_1,q_1,g_1,z_1)$ is asserted to be "bounded" on the strength of $(p_1,q_1)\in H^1\times H^1\Rightarrow$ bounded (Sobolev embedding) and $g_1=w*(S'(U)p_1)$ bounded (bounded kernel in $L^1$ times bounded function). Boundedness of $z_1=g_1'$ is used implicitly a few lines later (to get $\psi_0^T\varphi_1\to 0$, one needs $\varphi_1$, not just its first three components, bounded) but is not justified: $g_1'$ bounded does not follow from $g_1$ bounded alone. It does follow from $g_1-g_1''=S'(U)p_1\in L^2$ together with $g_1\in L^\infty$ via the explicit convolution formula of Lemma 2.2, but this should be stated. Fix: add a sentence noting $z_1=g_1'$ is bounded because $g_1$ is the Green's-function solution of $g_1-g_1''=S'(U)p_1$ with bounded right-hand side.
3. **nf-pulse.tex:651, proof of Lemma 5.5(b) (lem:class(b)).** The step "hence $|y'(\xi)|\le \eta_0 e^{-m_E(\xi-120)}$, which keeps $|U|\le K_U\eta_0<u_s$" is a bootstrap/continuation argument (the differential inequality $\dot{}|y'|\le -m_E|y'|$ only holds while $|U|<u_s$, and one needs to rule out $|U|$ reaching $u_s$ before the exponential bound is established) that is not spelled out. I checked that the standard "first exit time" argument closes it (using the strict factor-2 margin $K_U\eta_0<u_s/2$), but a referee should ask for it to be made explicit, since a bootstrap of this kind is exactly where an error could otherwise hide.
4. **nf-pulse.tex:371.** Citing Teschl's Theorems 9.4 and 9.5 "with time reversed" overstates what is needed: both theorems already state the unstable-manifold conclusion directly (the "$-$" sign case), with no separate time-reversal step required at the point of citation (time-reversal is used only inside Teschl's own proof of the *stable* half). Fix: drop "with time reversed" or replace it with a remark that the "$-$" branches of the cited theorems are used directly.

## Minor
5. **nf-pulse.tex:472.** The proof of Theorem 1 cites Lemma 2.6 (lem:surface) for the fact that the domain of the augmented flow (with $\kappa$ adjoined, $\kappa'=0$) is all of $\R\times\R^4\times(0,\infty)$. Lemma 2.6 as *stated* is about one solution that already tends to the rest state; the global-existence-for-every-initial-condition fact actually comes from an observation made only inside its *proof* ("the field of (wave) is globally Lipschitz, so its solution exists on $\R$"), which does apply to every solution for fixed $\kappa$, not just the one under discussion there. The citation is not wrong, but it points to the proof rather than the statement; a footnote or an explicit corollary would remove the ambiguity.
6. Table 4 (tab:range) and the surrounding text round several bounds "outward"; I did not re-derive every rounding claim in Section 4.7, only the mathematical content of the covering-relation argument (verified correct) and the algebra reused from Lemma 2.6-analogue/characteristic-polynomial computations (verified correct).

## What was checked (line by line, with computations run)
- **Definition 2.1, Lemma 2.2 (green), Proposition 2.3 (reduction), §2.2 rest state, Lemma 2.4 (rest), Lemma 2.5 (count), §2.3 embedding, Lemma 2.6 (surface):** read in full; Descartes'-rule / imaginary-axis argument for $p(\ell)$ re-derived and confirmed (exactly one sign change regardless of the middle coefficient; $\mathrm{Im}\,p(i\omega)=0$ only at $\omega=0$ given $s<1$). No error.
- **Lemma 4.1 (block, lem:block) and Lemma 4.2 (blockwave):** read line by line; the mean-value / convexity argument for $\tilde s(U)\in[S'(-\delta_U),S'(\delta_U)]$ verified using $S''=\beta^2S(1-S)(1-2S)>0$ for $u<\theta$. No error.
- **Lemma 4.2 (resolvent, lem:resolvent):** recomputed $(\zeta-A_5)^{-1}e_Y$ symbolically (SymPy) for the main model; every stated identity ($z_U=-\kappa/p(\zeta)$, $z_V=\varepsilon\kappa z_U/\zeta$, $z_Y=s_0z_U+1/\zeta$, $z_Q=-z_Y/(\zeta^2-1)$, $z_P=\zeta z_Q$) and the factorization $p(\zeta)=\zeta^2(\zeta^2-1)+(\kappa\zeta+\varepsilon\kappa^2)(\zeta^2-1)+s_0\kappa\zeta$ confirmed exactly; the bounds for $\zeta\ge2$ (using $\zeta^2-1\ge\frac34\zeta^2$ iff $\zeta\ge2$) confirmed. No error.
- **Lemma 4.3 (manifold, lem:manifold) and its proof:** read line by line; the induction $\|h^{(M+1)}_i\|\le K_i(G_0+Z(R))$ and the $Z(R)$ derivation checked by hand term by term. No error (see Should-fix #1 concerning the companion Lemma "branch").
- **Lemma 4.3 in the brief's numbering = lem:branch, its proof (target 2):** read line by line; checked against the supplied Teschl excerpt (Theorems 9.4, 9.5, and the definitions (9.7)–(9.10) of $W^\pm$, $M^{\pm,\alpha}$) — the hypotheses (hyperbolicity from Lemma 2.4/2.5, 1-D unstable eigenspace) and the conclusion asserted for the cited theorems match the source exactly. The final argument ("every solution tending to $x_*$ … is a translate of $x_\kappa$") is logically valid given the earlier identification of $W$ with the parametrized curve. See Should-fix #1, #4.
- **Proposition 4.4 (wazewski):** read line by line; the two-open-sets-covering-a-connected-interval argument and the contradiction at an exit point checked. No error.
- **§4.8 / Theorem 5 (Faye's model), all items listed in target 1:** (fayewave) and its Green's-function converse re-derived; (faye5) polynomial embedding and the analogue of Lemma 2.6 checked (linear-growth bound $|QS(U)|\le|Q|$ verified, Teschl Thm 2.17 hypothesis satisfied); **the full decomposition $F_5=A_5y+\mathcal N(y)$ was independently re-derived from (faye5) by hand and with SymPy's Jacobian**, and matches $\mathcal N_{Z_1}=-b^2y_Qy_Y$, $\mathcal N_Q=-\varepsilon\kappa\alpha y_Qy_Y$, $\mathcal N_Y=\beta\kappa[(1-2Y_0)y_Y-y_Y^2]m$ exactly; the eigenvector $v$ and the claim "$A_5v=\mu v$; third row is $p(\mu)=0$" were verified symbolically (the row-3 residual equals $-p(\mu)$ identically); the characteristic polynomial $p(\ell)$ quoted in the "Rest state" bullet was independently computed from the $4\times4$ linearization and matches exactly, including the coefficient-sign claims ($q_0s<1$, $0<q_0<1\Rightarrow$ signs $+,+,?,-,-$) and the imaginary-axis computation $\mathrm{Im}\,p(i\omega)=\kappa\omega(c_1'-c_3'\omega^2)$, $c_1'<0<c_3'$. Lemma 4.7 (lem:fayemanifold) and its proof were checked against the general Neumann-series argument (validity of $\|(n\mu-A_5)^{-1}\|_\infty\le K_F$ via submultiplicativity of the induced $\infty$-norm) and the $Z_F(R)$ bound was re-derived term by term from $\mathcal N$'s three nonlinear pieces, matching $\hat c_1=b^2+\varepsilon\kappa\alpha$, $\hat c_2=\beta\kappa|1-2Y_0|$, $\hat c_3=\beta\kappa$ and the "$2R$ for the $m$ component" bound exactly. `ext/faye-model/code/manifold.py` was read in full and compared line by line against the lemma: `Ainf` is the max-row-sum ($\|A_5\|_\infty$) exactly as required for the Neumann bound; `mu0 = (N+1)*mu.lower()`, the check `mu0 > 2*Ainf`, `K = 1/(mu0-Ainf)`, `G0` (finite sum over $n>N$ of the three nonlinear components' coefficients), and `Z(rh)` all match the lemma's hypotheses exactly, with no weaker check found; the "Rest state", "Manifold" and "Block" bullets (averaged Jacobian over the four corners of the $(QS'(U),S(U))$ rectangle — verified the Jacobian is jointly affine, not bilinear, in these two quantities, so the convex-hull-of-corners claim is exact) were verified. No mismatch between the lemma and the code was found.
- **Lemma 5.1 (lp):** read; standard Levinson-dichotomy contraction argument, correctly executed.
- **Lemma 5.2 (evans) (a)–(e):** read line by line; re-derived the eigenvector/left-eigenvector formulas for $A_\infty(\lambda)$ symbolically and confirmed the row-1 residual is exactly (a nonzero multiple of) the stated characteristic polynomial $(\nu^2-1)((\nu+\kappa(\lambda+1))(\nu+\kappa\lambda)+\varepsilon\kappa^2)+s_0\kappa(\nu+\kappa\lambda)$; the singular-point analysis in (b) and the Volterra-equation construction in (c) checked. No error.
- **Proposition 5.1 (ess) and its citation of Dyatlov–Zworski Theorem C.9 (target 4):** read against the supplied excerpt (Theorems C.5, C.8, C.9, and (C.2.1)–(C.2.2)). Checked explicitly: $X_1=H^1\times H^1\subset X_2=X$ is a continuous inclusion (Sobolev embedding); $\mathcal L-\lambda:X_1\to X_2$ is shown Fredholm of index $0$ for *every* $\lambda\in\Omega$ (via $I+\mathcal T(\lambda)$, $\mathcal T$ compact, using exactly (C.2.1)/(C.2.2)/Thm C.5 as cited); invertibility at one point of $\Omega$ is shown (large real $\lambda$). All of Theorem C.9's hypotheses are met, and the conclusion cited (meromorphic family + finite-rank Riesz projections at poles) matches the source's Theorem C.9 verbatim, including the second half of the theorem (about $\Pi_z$) which the paper also uses. The Hilbert–Schmidt bound for $K$ was recomputed ($\|K\|_{HS}^2=\|w\|_2^2\|S'(U)-s_0\|_2^2$). No error.
- **Proposition 5.2 (large):** the algebraic bound $\mathrm{Re}(\zeta+1+\varepsilon/\zeta)=1+\mathrm{Re}\,\zeta(1+\varepsilon/|\zeta|^2)$ was recomputed and matches; case (a)'s numeric bound $5F\le 10/11$ confirmed.
- **The Krawczyk-test paragraph, "Eigenvalues and blocks" (nf-pulse.tex:734, target 4):** the self-contained proof was checked in full: the identity $g(z)=z-Yf(z)=z_0-Yf(z_0)+(1-Ym(z))(z-z_0)$ was verified; the two impossibility arguments ("$Y=0$" and "translate of a compact set into its own interior") are both correct standard facts. No error.
- **Lemma 5.4 (multiplicity, target 3), all items:** read and re-derived line by line — the Jordan-chain reduction, the equation solved by $\varphi_1$ (matched against $\partial_\lambda A=\mathrm{diag}(-\kappa,-\kappa,0,0)$), the dimension-count for $\psi_0$'s decay at $-\infty$ (via Lemma 5.1 applied to the adjoint with $n_u=3$, combined with the codimension-1 linear-algebra fact that annihilating a nonzero vector cuts a 4-D space to 3-D), the vanishing of $I$ via the antiderivative/boundary argument, and the final formula $D'(0)=a_*I$ built from $\psi_0^T\partial_\lambda\varphi^-(\xi)=\int_{-\infty}^\xi$ and $\partial_\lambda\psi^{+T}\varphi^-(\xi)=\int_\xi^\infty$ of the same integrand. Every product-rule computation was redone by hand and is correct. No error (see Should-fix #2).
- **Theorem 2(b), Corollary (cor:two) and proof, Definition (def:class), paragraph after Theorem 6, Lemma 5.5(a)/(b), proof of Theorem 6, Limitations paragraph "The class $\Pcl$ and Theorem 1" (target 5):** all read for exact quantifier scope. In every case "a pulse"/"can be chosen"/"contains a pulse" is used only where existence (not uniqueness or universality) is proved, and the universally-quantified claims in Theorem 6(i)-(iii) are matched by enclosures explicitly computed "for all pulses of $\Pcl$ at once" in §5.4 (Enclosing the Evans function). No overreach found.
- **§4.7 (proof of Theorem 2/thm:range), covering-chain argument:** read in full; the inductive construction of $[a_i,b_i]\subset[a_{i-1},b_{i-1}]$ and the final application of Proposition 4.4 with $\varsigma$ in place of $\kappa$ checked logically. No error.
- **Computations run (all in `./scratch/`):** `faye_check.py`, `faye_check2.py`, `faye_check3.py` (characteristic polynomial and eigenvector identities for Faye's model — all confirmed, ratio $=-1$ resp. $0$), `check_resolvent.py` and the inline eigenvector/characteristic-polynomial checks for the main model's Lemma 4.2 and Lemma 5.4(b) (all confirmed).

## What was not checked
- Numerical/floating-point details reported only as program output (specific enclosure radii, bit precisions, SHA-256 digests, the exact contents of the certificate JSON files, and the `ext/eps-range` table of 386 intervals) were taken on trust from the manuscript's own description; I did not re-run any program.
- `code/manifold.py` (the non-Faye analogue of the file named in target 1) was read only in the algebra already reproduced in the main text and was not separately audited line by line against Lemma 4.3 the way `ext/faye-model/code/manifold.py` was audited against Lemma 4.7 (this was outside the primary targets).
- Lemma 5.3 (lp) was read for logical correctness but its constants were not independently recomputed.
- The parts of Section 6 other than "Eigenvalues and blocks" (Taylor coefficients, the integrator, tests/negative controls, trust base), Sections 7–11 (numerics, reproducibility, discussion, open problems), and the bibliography/citation accuracy for works other than Teschl and Dyatlov–Zworski (e.g., the characterizations of Pinto–Ermentrout, Faye, Hastings, Dyson, Habib–Veltz) were read but not checked against their primary sources, since those sources are not among the provided excerpts.
- The mutation-testing claims and the "review/", "notes/" files referenced throughout are outside this copy and were not examined, per the task instructions.

---

## Response (2026-09-27, the manuscript's writer)

No must-fix finding. Every should-fix and minor finding is addressed as follows; the changed passages had a further,
narrow reading (`notes/referee-2026-09-27-new-proofs-narrow.md`).

**Should fix**

1. Lemma 4.3 (lem:branch), "shrinking N, it is all of W". **Fixed.** The proof now takes W, from Teschl's Theorems
   9.4 and 9.5, as the graph of a C^1 map h over E cap N_0 (E the unstable space, P its spectral projection), shows
   that the points pi Phi_kappa(t), |t| < t_N, lie in W, uses the inverse function theorem for a(t) = P(pi Phi_kappa(t)
   - x*) (a'(0) = pi a_1 is an unstable eigenvector) to identify the curve with the part of W over an interval J, and
   then chooses a neighbourhood N' of x* with P(N' - x*) in J, so that the point x(xi_0) of a solution that tends to x*
   at -infinity lies on that curve; t_1 > 0 follows from the sign of the U component, sigma t + O(t^2). It also states
   why pi Phi_kappa(t e^(mu xi)) solves (2.1) for negative t (Lemma 2.6).
2. Lemma 5.8, boundedness of z_1 = g_1'. **Fixed.** The proof now says why each component of phi_1 is bounded:
   p_1, q_1 in H^1; |g_1| <= sup|f_1| with f_1 = S'(U) p_1; and z_1 written by differentiating the formula of the proof
   of Lemma 2.2, so |z_1| <= sup|f_1|.
3. Lemma 5.5(b), the continuation argument. **Fixed.** The argument is now written in two steps with no bootstrap:
   first with the block's own condition (E) (on B, |U| < delta_U), which makes |y'| nonincreasing on [120, infinity), so
   |U| <= K_U eta_0 there; then, since K_U eta_0 < u_s = 2 K_U eta_0 on all of [120, infinity), with the condition (E)
   that `evans_rig.py` certifies for the slopes in [S'(-u_s), S'(u_s)] and kappa in [1/c2, 1/c1], giving the rate m_E.
4. "with time reversed". **Fixed** (it had already been changed to "the unstable case" in the working copy after the
   copy for this reading was made; the cited theorems state the unstable case directly).

**Minor**

5. Proof of Theorem 1, the domain of the flow. **Fixed.** The sentence now gives the reason directly: for each kappa
   the field of (2.1) is globally Lipschitz in x, since |S'| <= beta/4, so every solution exists on R (Teschl,
   Theorem 2.17); it no longer points to Lemma 2.6.
6. Rounding claims of Table 2 not re-derived. **Not changed**: noted as outside this reading; the rounding was checked
   against the certificates on 2026-09-27 (item 3 of `notes/QUALITY.md`) and `ext/eps-range/table.py` prints the
   bounds rounded outward.

**Not checked by this reading** (its last section): the programs were not rerun and `code/manifold.py` was not
audited against Lemma 4.2 line by line; both were covered earlier (the computation reading of 2026-09-27 and the code
audit `review/lead/code/CODE.md`) and by today's reruns (`notes/QUALITY.md`, Reruns).

## The brief given to the session

    You are an independent referee for a mathematics manuscript. Your job is to find errors in its proofs. Be adversarial and precise; do not praise, do not soften, and do not report something as an error unless you can say exactly what fails.
    
    Material (read only files inside the current directory):
    - nf-pulse/paper/nf-pulse.tex, the manuscript (nf-pulse.pdf is the same file built with pdflatex).
    - nf-pulse/code/ and nf-pulse/ext/, the programs the manuscript cites, with their outputs in nf-pulse/data/ and nf-pulse/ext/*/data/.
    - sources/, text excerpts of two cited books (Teschl 2012: Sections 2.4, 2.6, 6.1 and 9.2; Dyatlov and Zworski, Appendix C.1 to C.3), extracted from the authors' posted versions, so that you can check the hypotheses of the results the proofs cite from them.
    The manuscript names some files (under review/ or notes/, and REPORT.md files) that are not in this copy; ignore them and do not look for them anywhere else. Do not open any path outside the current directory. Do not edit any file. If you want to check algebra or numbers, you may run python3 (SymPy, mpmath and python-flint are installed); put any scratch file in ./scratch/ only.
    
    Primary targets. These proofs were written or changed recently and nobody independent has read them yet. Read each one line by line, check every identity and every inequality, and check that each hypothesis of every cited result is verified in the text:
    1. Section 4.8 (Proof of Theorem 5, Faye's model with synaptic depression): the travelling-wave system (eq. fayewave) and the converse via the Green's function; the polynomial embedding (eq. faye5) and the analogue of Lemma 2.6 (the first integral, and existence on all of R from linear growth); the decomposition F_5 = A_5 y + N(y) with its three nonlinear components (derive them yourself from (faye5)); the eigenvector v with A_5 v = mu v; Lemma 4.7 and its proof (the Neumann-series bound K_F for every entry of (n mu - A_5)^(-1), the bound Z_F(R) with the constants c^_1, c^_2, c^_3, the norm 2R of the m component, the induction on truncations, continuity in kappa); the analogue of Lemma 4.3 with the start point Phi(theta_0); the four bullet items (rest state and its uniqueness, the characteristic polynomial and its coefficient signs, the block via the averaged Jacobian over the four corners, shooting). Also check that ext/faye-model/code/manifold.py checks exactly the hypotheses Lemma 4.7 states (the quantities K_F, G_0, Z_F, the condition (N+1) min mu > 2 ||A_5||_inf, the norm used for ||A_5||) and nothing weaker; name any mismatch between the lemma and the code.
    2. Lemma 4.3 (lem:branch) and its proof: the statement of the local unstable manifold theorem, the claim that the parametrized curve is the whole local unstable manifold W after shrinking N, and the argument that every solution tending to x* as xi -> -infinity with U > 0 near -infinity is a translate of x_kappa.
    3. Lemma 5.8 (lem:multiplicity) and its proof: the Jordan-chain reduction to a generalized eigenvector, the boundedness of phi_1, the argument that psi_0 decays at both ends (dimension count), the vanishing of the integral I, the formula D'(0) = a_* I with the limits of psi_0^T d_lambda phi^- at -infinity and of d_lambda psi^+ ^T phi^- at +infinity, and the facts it uses from Lemma 5.4 (analyticity and uniform bounds of omega, the normalization).
    4. Newly written passages: the proof of Proposition 5.1 (the Fredholm and meromorphy step, citing Dyatlov and Zworski, Theorem C.9: check that each hypothesis holds, including the continuous inclusion and invertibility at one point), the proof of the complex Krawczyk test in Section 6 (paragraph "Eigenvalues and blocks"), and the citations of Teschl in Lemma 2.6, Lemma 4.3, the proof of Theorem 1 and Section 4.8 (check each cited theorem against the excerpt, in particular that Theorems 9.4 and 9.5 give what the proof of Lemma 4.3 states).
    5. Quantifiers: Theorem 2(b) ("can be chosen"), the Corollary labelled cor:two and its proof, the Definition labelled def:class (the class P) and the paragraph after Theorem 6, Lemma 5.5(a), the proof of Theorem 6, and the Limitations paragraph "The class P and Theorem 1". Check that every statement about "a pulse" or "every pulse" is exactly what the proofs give, no more.
    
    Then, as time allows, read every other proof in Sections 2, 4 and 5 (in particular Lemmas 4.2, 4.4, Proposition 4.6, the covering-chain argument of Section 4.6, Lemma 5.3, Lemma 5.4 and Lemma 5.5(b)), and compare the programs of the stability proof with the text where a proof relies on them.
    
    Write your report in Markdown with these sections, and nothing else before or after it:
    # Referee report
    ## Verdict (accept / minor revision / major revision, one line)
    ## Must fix (an error that makes a proof wrong or incomplete, or a statement false)
    ## Should fix (a gap, an unverified hypothesis or an imprecision a careful referee would require fixing)
    ## Minor
    ## What was checked (list each proof you read line by line, and each computation you ran, with its result)
    ## What was not checked
    Number the findings. For each: the location (section, lemma or equation, and the line of nf-pulse.tex), what is wrong, why, and a concrete fix. If a primary target has no error, say so explicitly under What was checked.
