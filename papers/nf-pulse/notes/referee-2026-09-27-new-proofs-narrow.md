# Fifth in-project reading (2026-09-27, narrow): the passages written in response to the fourth

**This is an in-project reading by an independent agent session (a separate headless Claude Code session started for
it), made on 2026-09-27. It is not an outside review.** It was briefed only with a copy of `paper/`, `code/`, `data/`
and `ext/` (without the `REPORT.md` files) and the excerpts of Teschl (2012) and Dyatlov and Zworski used for the
fourth reading, and asked to read line by line the passages written in response to that reading
(`notes/referee-2026-09-27-new-proofs.md`): the proof of Lemma 4.3 (lem:branch), the two-step argument of Lemma
5.5(b) with what `ext/stability/evans_rig.py` certifies, the boundedness of phi_1 in Lemma 5.8, the domain of the
flow in the proof of Theorem 1, and the proof of the complex Krawczyk test in Section 6 with `krawczyk()` in
`evans_rig.py`. The report follows verbatim; the response is at the end.

---

# Referee report (narrow reading)

## Verdict (one line)
The five passages read as complete: I found no error that makes a proof wrong, incomplete, or a statement false; a few presentational gaps remain that should be tightened, listed below.

## Must fix (an error that makes a proof wrong or incomplete, or a statement false)
None found. I checked each of the five items line by line against the cited results (Teschl 2012, Dyatlov–Zworski), re-derived the algebra independently in SymPy, and ran the relevant program (`ext/stability/evans_rig.py`) to compare its output against the numbers printed in the manuscript; nothing failed. See "What was checked" for what this covers and "What was not checked" for the boundary of this claim.

## Should fix
1. **`nf-pulse.tex:370–371` (proof of Lemma `lem:branch`).** The proof invokes "the local unstable manifold theorem [Teschl, Theorems 9.4 and 9.5, the unstable case]" and then speaks of a single neighbourhood $N$ having both properties at once: (i) $W\cap N$ is the graph $\{x_*+a+h(a)\}$ over $E\cap N_0$ (Theorem 9.4), and (ii) $x\in N$ with backward orbit staying in $N$ implies $x\in W$ (the "iff" of Theorem 9.5). Teschl's two theorems each only assert "there is a neighbourhood $U(x_0)$" for their own purpose; the text never states that a single $N$ can be chosen realizing both simultaneously. This is true and routine (Theorem 9.5's proof reuses the same contraction construction as 9.3/9.4, so the property is inherited by any sufficiently small neighbourhood, and the graph representation restricts to any smaller sub-neighbourhood), but as written a reader has to supply this step. Fix: add one clause, e.g. "shrinking $N$ if necessary so that both conclusions of Theorems 9.4 and 9.5 hold on it."

## Minor
2. **`nf-pulse.tex:371`.** The sentence "the curve $\{\pi\Phi_\kappa(t):|t|<t_N\}$ is the part of $W$ over $J$" implicitly needs $J\subset E\cap N_0$ (the domain of $h$), which is not stated but does follow automatically once the preceding sentence has placed $\pi\Phi_\kappa(t)$ inside $W\cap N$ for $|t|<t_N$ (the graph representation of Theorem 9.4 then forces the unstable projection into $E\cap N_0$). Spelling this out would save the reader a half-line of reconstruction.
3. **`nf-pulse.tex:651` vs. `nf-pulse.tex:644`.** The statement of Lemma `lem:class`(b) describes the interval `[-16,0]` as covered by "the parametrization," while the proof of (b) simply treats "$\xi\le 0$" via $\Phi_\kappa(e^{\mu\xi}/4)$ (a strictly larger range than $[-16,0]$) before switching, in the *earlier* clause of the statement, to an explicit tail bound only for $\xi\le -16$. The two descriptions are consistent (the proof's argument for $\xi\le 0$ subsumes the stated range $[-16,0]$), but the phrasing could note explicitly that the parametrization argument covers all $\xi \le 0$, of which $[-16,0]$ is the part for which the boxes are actually recorded/used elsewhere.

## What was checked (for each of the five items: what you read, what you computed, and whether it is complete)

1. **Lemma `lem:branch` (Sec. 4.1, lines 366–372).** Read the full statement and proof, and the definitions of $\Phi_\kappa$, $a_1=\sigma v$, $g$, and the polynomial embedding (lines 312–326, `lem:surface` at 170–176). Cross-checked the cited Teschl results directly against `sources/teschl-2012-excerpts.txt`: Theorem 9.4 (graph representation, tangency, exponential estimate, lines 481–489 of the excerpt) and Theorem 9.5 (the "iff" characterization $\gamma^\pm(x)\subset U(x_0) \Leftrightarrow x\in M^\pm(x_0)\cap U(x_0)$, and $W^\pm=M^\pm$, lines 495–503), together with the definitions of $M^{\pm,\alpha}$, $\gamma^\pm$ (lines 296–342) that make precise what "backward orbit stays in $N$" must mean. Verified independently in SymPy that $A_5v=\mu v$ reduces exactly to $p(\mu)=0$ (row by row, including the $Y$-row, which requires the factor $\kappa s_0$, not $s_0$, in $A_5$'s $Y$-row — the algebra checks out once this is done correctly). Traced the choice of $N'$, the diffeomorphism $a(t)$, and the final translation argument step by step (see "Should fix" #1 and "Minor" #2 for the only gaps found, both closable in one sentence). Complete as a proof, modulo those presentational points.

2. **Lemma `lem:class`(b) (lines 640–652) and `ext/stability/evans_rig.py`.** Read the statement and proof of part (b) (the two-step argument for $\xi\ge 120$) together with Lemma `lem:block` (proof of (c),(d), lines 397–411) and Lemma `lem:blockwave` (lines 413–419), confirming that the reuse of the inequality "$\tfrac12\tfrac{d}{d\xi}|y'|^2\le e|y'|^2$ whenever $|y_1|\le|y'|$" from the proof of `lem:block`(c) is a standalone algebraic fact (Cauchy–Schwarz on the off-diagonal block) valid wherever $|y_1|\le|y'|$ holds, not only at $\partial B$, so its reuse for all of $\xi\ge 110$/$\ge 120$ is legitimate. Read `evans_rig.py`'s `load()` (lines 61–111) and `block.py`'s `check()`/`interval_pd()` (lines 77–117) in full. Ran `evans_rig.load()` against the committed `ext/stability/data/pulse_records.pkl` and printed `C_U`, `eta0`, `mrate`, and recomputed `K_U`; got $C_U=[0.1468693995\pm4.2\text{e-}12]$, $\eta_0=[1.467199986\text{e-}6\pm2.1\text{e-}16]$, $m_E$-source $=[0.1246186868\pm3.0\text{e-}11]$, $K_U=[5.748738031\pm3.3\text{e-}10]$ — all consistent with the printed bounds $C_U\le0.14687$, $\eta_0\le1.4672\cdot10^{-6}$, $m_E\ge0.1245$, $K_U\le5.75$. Confirmed `kap_all = (1/cr.C1).union(1/cr.C2)` matches "$\kappa\in[1/c_2,1/c_1]$" (`c_1`,`c_2` from Theorem `thm:fast`, found in `certify_rest.py:46-47`), and that `bl.check` certifies both (C) (via `interval_pd`, leading principal minors of $H$ in ball arithmetic — Sylvester's criterion) and (E) (Gershgorin bound plus Frobenius/Euclidean norm of the column), matching the text's description exactly. Complete: the program certifies what the text says it certifies.

3. **Lemma `lem:multiplicity` (lines 682–696).** Read the whole proof. Independently re-derived the boundedness of $\varphi_1=(p_1,q_1,g_1,z_1)$: $p_1,q_1$ bounded by the 1-D Sobolev embedding $H^1(\mathbb R)\subset C_b(\mathbb R)$ (used elsewhere in the paper too, e.g. line 633); $g_1=w*f_1$ bounded by the convolution bound of Lemma `lem:green`; and differentiated the explicit formula for $w*f_1$ to re-derive $z_1$'s formula and its bound $|z_1|\le\sup|f_1|$ — matches the text exactly. Checked that $\varphi_1$ solving $\varphi_1'=A(\xi,0)\varphi_1+\partial_\lambda A\,\varphi_0$ is the correct row-by-row rewriting of $\mathcal L(p_1,q_1)=(U',V')$ (verified all four rows algebraically). Checked the rest of the proof: boundedness/decay of $\psi_0=\psi^+(\cdot,0)$ via `lem:lp` applied to the adjoint with $-A_\infty(0)^T$ having 3 eigenvalues of positive real part (consistent with $A_\infty(0)$ having 1 positive/3 negative per `lem:evans`(a)); the product-rule computation of $(\psi_0^T\varphi_1)'$ and $I=0$; and the final identity $D'(0)=a_*I$ closing the contradiction. Complete.

4. **Theorem `thm:fast`, "Unstable manifold" paragraph (Sec. 4.4, line 472).** Read the paragraph and cross-checked Teschl's Theorem 6.1 (flow openness/continuity, lines 224–255 of the excerpt) and Theorem 2.17 (global existence under a linear growth bound on $U=\mathbb R\times\mathbb R^n$, lines 172–186). Confirmed the logic is not circular: Theorem 2.17 is applied to the genuine 4-dimensional system \eqref{eq:wave} for each *fixed* $\kappa$ (matching $U=\mathbb R\times\mathbb R^4$ exactly, using $|S'|\le\beta/4$ for a bona fide global Lipschitz bound), giving $I_x=\mathbb R$ for every point of the 5-dimensional augmented space; Theorem 6.1 is then applied to the augmented system with $\kappa$ adjoined ($\kappa'=0$) only to get *joint continuity* in $(\kappa,\xi)$, with the domain identified as all of $\mathbb R\times\mathbb R^4\times(0,\infty)$ from the per-$\kappa$ existence fact rather than from 6.1 itself. No misapplication of either theorem found.

5. **Section 6, "Eigenvalues and blocks" (line 734) and `krawczyk()` in `evans_rig.py` (lines 148–168).** Read the stated Krawczyk theorem and its proof, and the implementation. Verified symbolically (SymPy) that `dcharpoly`, `dlam_charpoly`, `d2charpoly`, `dnulam_charpoly` are exactly the first/second partial derivatives of `charpoly` in $\nu$ and $\lambda$ (all four differences simplified to 0). Traced that `f0` encloses $f(z_0,\lambda')$ for every $\lambda'$ in the ball passed as `lam` (via the mean-value term `dlam_charpoly(z0,lam)*(lam-lc)`, with `lam` — not `lc` — used, so the enclosure is over the whole ball as claimed), and that `dpX` encloses $f'(z,\lambda')$ for every $z\in X,\lambda'\in$ ball via the two-step mean-value decomposition $f_\nu(z,\lambda')-f_\nu(z_0,\lambda_c) = f_{\nu\nu}(\xi,\lambda')(z-z_0)+f_{\nu\lambda}(z_0,\eta)(\lambda'-\lambda_c)$, both terms over-enclosed by evaluating on $X\times$ball (a valid, if not maximally tight, superset). Confirmed `K = z0 - f0 + (1 - Yinv*dpX)*(X - z0)` matches the stated Krawczyk operator exactly, that $Y$ (`Yinv`) is only a preconditioner (not required to be an enclosure), and that returning `K` (rather than `X`) on success is the standard tightened enclosure, valid because $K\supseteq\{g(z):z\in X\}\ni$ the fixed point. Ran `evans_rig.py` end to end (`python3 evans_rig.py`) at several $\lambda$ points, including $\lambda=0$: got $\tilde D(0)\in[\pm1.35\text{e-}3]+[\pm1.01\text{e-}6]i$ (containing $0$, consistent with $D(0)=0$) and $m=0.124619$ (consistent with the `mrate` value checked in item 2). Complete: `krawczyk()` meets the hypotheses the text claims for it.

## What was not checked
- The full `run_all.sh` pipelines for Theorems `thm:fast`, `thm:range`, `thm:slow`, `thm:gain12`, `thm:faye` (only `evans_rig.py`/`block.py` were executed, as directly relevant to items 2 and 5).
- `ext/stability/winding.py`, `simple_zero.py`, `ess_spectrum.py`, `large_lambda.py`, and `part3_symbolic.py` were read for context (Section 5) but not re-run or independently re-derived, since they are outside the five listed items.
- Numeric constants outside those directly cited in items 1–5 (e.g. the full Table 1/2/3 entries, the `ext/eps-range` covering-relation certificates, the mutation-study claims in Section 6).
- The correctness of Arb/python-flint's ball arithmetic itself, and of `mpmath`'s interval arithmetic (part of the paper's stated trust base, not re-verified here).
- `code/lohner.py`'s Lohner-scheme integrator and `evans_rig.py`'s `step_matrices` majorant recursion were read but their numerical outputs were not independently reproduced with a second integrator.
- Files under `review/` and `notes/` named in the manuscript were not opened, per the task's instructions.

---

## Response (2026-09-27, the manuscript's writer)

No must-fix finding.

1. One neighbourhood for Theorems 9.4 and 9.5 (should fix). **Fixed:** the proof now says that N is taken small
   enough that the conclusions of both theorems hold on it.
2. J inside the domain of h (minor). **Fixed:** the proof now says that J is contained in E cap N_0 because the points
   pi Phi_kappa(t), |t| < t_N, lie in W, and that W is a graph over E cap N_0.
3. The range of the parametrization bound in Lemma 5.5(b) (minor). **Fixed:** the proof says that the bound
   |U| <= C_U e^(mu xi)/4 holds for all xi <= 0 and is used for xi <= -16, and that on [-16, 0] the parametrization is
   evaluated on recorded boxes, as the statement says.

These three changes are one clause each and add no new step; they were not read again.

## The brief given to the session

    You are an independent referee for a mathematics manuscript. Your job is to find errors in specific proofs. Be adversarial and precise; do not praise, and do not report something as an error unless you can say exactly what fails.
    
    Material (read only files inside the current directory): nf-pulse/paper/nf-pulse.tex (the manuscript), the programs it cites in nf-pulse/code/ and nf-pulse/ext/ with their outputs, and sources/, text excerpts of two cited books (Teschl 2012: Sections 2.4, 2.6, 6.1 and 9.2; Dyatlov and Zworski, Appendix C.1 to C.3). The manuscript names files under review/ or notes/ that are not in this copy; ignore them and do not look for them anywhere else. Do not open any path outside the current directory. Do not edit any file. You may run python3 (SymPy, mpmath, python-flint are installed); put scratch files in ./scratch/ only.
    
    This is a narrow reading of passages written in the last hour, in response to an earlier reading. Read each line by line, check every step and every hypothesis of each cited result, and say whether the argument is now complete:
    1. The proof of Lemma lem:branch (Section 4.1, the paragraph that starts "$z(\xi) = \Phi_\kappa(e^{\mu\xi}/4)$ solves"): the use of Teschl's Theorems 9.4 and 9.5 (the local unstable manifold as a graph W over the unstable space in a neighbourhood N), the claim that the parametrized curve {pi Phi_kappa(t) : |t| < t_N} is the part of W over an interval J, the choice of N', and the conclusion that every solution tending to x_* as xi -> -infinity with U > 0 near -infinity is a translate of x_kappa.
    2. The proof of Lemma lem:class, part (b): the two-step argument for xi >= 120 (first with the block's own condition (E), then with the smaller slope range certified by ext/stability/evans_rig.py), and whether its use of Lemma lem:block (c)/(d) and of Lemma lem:blockwave is valid. Check also against evans_rig.py (function load and what it certifies) that the program certifies what the text says.
    3. The proof of Lemma lem:multiplicity: the new sentence on the boundedness of phi_1 = (p_1, q_1, g_1, z_1), and the rest of the proof as it now reads.
    4. The proof of Theorem thm:fast (Section 4.4, "Unstable manifold" paragraph): the sentence on the continuity of (kappa, xi) -> x_kappa(xi) and the domain of the flow, with Teschl's Theorems 6.1 and 2.17.
    5. Section 6, the paragraph "Eigenvalues and blocks": the proof of the complex Krawczyk test, and whether the implementation krawczyk() in ext/stability/evans_rig.py meets its hypotheses (in particular that the enclosure used for F contains f'(X) for every lambda' of the ball and that f(z_0) is enclosed for every such lambda').
    
    Write your report in Markdown with these sections and nothing else before or after it:
    # Referee report (narrow reading)
    ## Verdict (one line)
    ## Must fix (an error that makes a proof wrong or incomplete, or a statement false)
    ## Should fix
    ## Minor
    ## What was checked (for each of the five items: what you read, what you computed, and whether it is complete)
    ## What was not checked
    Number the findings; give for each the location (lemma or paragraph and the line of nf-pulse.tex), what is wrong, why, and a concrete fix.
