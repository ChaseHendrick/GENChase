# Candidate Hopf and bridge methods for Theorem D(c)

This is a manuscript candidate, dated 2026-10-02. It does not promote a numerical certificate or amend the released manuscript. The proposed conclusion below is conditional on a fresh accepted Theorem A record, all 68 amplitude-piece proofs, all 67 adjacent gluings, the zero-amplitude identification, and a fresh point proof and bridge at $g_s=0.02778$. Acceptance of the conductance branch alone does not discharge these gates. Theorem D(a) and D(b), discussed in the separate branch-methods draft, retain their own existence and uniform-stability hypotheses.

The mathematical source snapshot used here is research/cardiac-cycle-certificates/fourier/LEMMAS-hopf.md, SHA256 6ac96e4b9f8c0be8c42c912296ca3af3a96784995b9cdb171ead3327905a607c, and hopf.py, SHA256 8635b9337fe9f26b1e712700da583e3e409ef8d6b3fa889ae7fbab882ff2bd0c. These hashes describe the draft's reference snapshot, not acceptance of all associated numerical outputs.

The amplitude desingularization follows the established method of van den Berg, Lessard, and Queirolo, *Rigorous verification of Hopf bifurcations via desingularization and continuation*, SIAM Journal on Applied Dynamical Systems 20 (2021), 573–607, [DOI](https://doi.org/10.1137/20M1343464), [author preprint](https://arxiv.org/abs/2006.13373). Their introduction and Sections 1–2 motivate the equilibrium-plus-amplitude decomposition; Section 2.2 also describes the extension to locally analytic nonpolynomial fields through DFT and Banach-algebra derivative bounds. The estimates below give that established analytic extension explicitly for the present fixed TP06 logarithmic and square-root field. Nonpolynomiality itself is not claimed as a new method.

## 1. Conditional statement and scope

Write the single-cell system as
\[
 \dot x=f(x;g),\qquad x\in\mathbb R^{18},
 \qquad f(x;g)=f_0(x)+g f_1(x).
\]
The proposed Theorem D(c) concerns $N=1$ only. The existing manuscript's all-$N$ Theorem C and the research conductance-branch theorem are different statements.

**Proposed Theorem D(c), conditional target.** Suppose the numerical hypotheses in Section 12 are verified with complete matching fresh records. There is a Hopf point $(x_H,g_H,\omega_H)$ and a continuous family
\[
 x_\varepsilon(t)=c(\varepsilon)+\varepsilon
       w(\omega(\varepsilon)t;\varepsilon),
 \qquad 0\le\varepsilon\le\varepsilon_0,\qquad
 \varepsilon_0=\frac{6427}{50000},
\]
with $g(0)=g_H$, $c(0)=x_H$, and $\omega(0)=\omega_H>0$. For every positive $\varepsilon$ the solution is nonconstant, has least period $2\pi/\omega(\varepsilon)$, and satisfies the fixed amplitude and phase normalization
\[
 [w_V]_1=[w_V]_{-1}=\frac12.
\]
Each solution is unique in its certified normalized enclosure. The amplitude family and the conductance family from D(a) share a common periodic orbit at $g_s=0.02778$. Their connected union contains a periodic orbit for every conductance between the lower endpoint of the certified conductance family and $g_H$, excluding the equilibrium endpoint $g_H$ where appropriate.

The last existence statement uses continuity and the intermediate value theorem. It does not claim that $g(\varepsilon)$ is monotone or that every conductance selects only one orbit globally. The equilibrium Hopf theorem gives orbital asymptotic stability for sufficiently small positive amplitudes. It does not quantify an amplitude threshold and does not establish overlap of that neighborhood with the interval certified in D(b). Consequently D(c) alone does not establish uniform stability of the full connected family.

## 2. Complex domain and finite-dimensional contraction

All complex extensions use the actual analytic branches in the vector field. The principal logarithm and square root are holomorphic on the right half-plane used by the domain guards. Every divisor is separated from zero. It is necessary to check the entire complex box or strip image used in an estimate, rather than only its real center.

Let $F:\mathbb C^n\to\mathbb C^n$ be holomorphic on a neighborhood of the closed polydisc
\[
 P=\{z: |z_i-\bar z_i|\le r_i,\ 1\le i\le n\},\qquad r_i>0.
\]
Let $C$ be a proposed inverse and set $T(z)=z-CF(z)$. Suppose interval enclosures give
\[
 |(CF(\bar z))_i|\le b_i,\qquad
 |(I-CDF(z))_{ij}|\le M_{ij}\quad(z\in P).
\]
If
\[
 b_i+\sum_jM_{ij}r_j\le r_i,\qquad
 \kappa=\max_i\frac{\sum_jM_{ij}r_j}{r_i}<1,
\]
then $T$ maps $P$ into itself and is a contraction in the weighted maximum norm
$\|v\|_r=\max_i|v_i|/r_i$.

Indeed, integration of $DT$ along the segment from $\bar z$ to $z$ proves the first inequality, and integration along the segment between two points of the convex polydisc proves the Lipschitz bound $\kappa$. Banach's theorem gives a unique fixed point. At any point of $P$, the matrix $CDF=I-(I-CDF)$ is invertible by the Neumann series. Since both factors are square, $C$ and $DF$ are invertible. Thus a fixed point is a true zero of $F$, not merely a zero of $CF$. This also supplies the injectivity that cannot be inferred from a proposed numerical inverse alone.

For a real parameter family the same estimates may hold uniformly over a closed parameter interval. Conjugation preserves a real problem and its enclosure, so uniqueness implies a real zero. Invertibility of $DF$ and the implicit function theorem identify the zeros locally as an analytic parameter family. Where a common uniqueness enclosure contains the local solutions, local families agree on overlaps and form one equilibrium branch. For the Hopf argument this common-enclosure check is required only on the identity interval $J$; no global branch identity over the larger cover is inferred merely from individual contractions.

Apply this construction to $F(x;g)=f(x;g)$. Differentiating the equilibrium equation gives
\[
 x_e'(g)=-A(g)^{-1}f_1(x_e(g)),\qquad A(g)=D_xf(x_e(g);g),
\]
and hence
\[
 A'(g)=D_x^2f(x_e(g);g)[x_e'(g),\,\cdot]+D_xf_1(x_e(g)).
\]
A uniform interval enclosure of this derivative gives
$A(g)\in A(g_c)+(g-g_c)A'(G)$ by the fundamental theorem of calculus. The midpoint enclosure used for $A(g_c)$ must be proved to lie in the same larger equilibrium enclosure on which the derivative bound is valid.

## 3. Spectrum and identity of the critical eigenpair

Let $V$ be an invertible approximate eigenvector matrix. Interval evaluation of $V^{-1}A(g)V$ gives Gershgorin discs that contain its diagonal entries and row sums for every admitted equilibrium and parameter. A union of $k$ discs separated from the remaining discs contains exactly $k$ eigenvalues counted with algebraic multiplicity.

For completeness, deform the off-diagonal part continuously to zero while keeping the diagonal fixed. All spectra remain in the same enclosing Gershgorin sets. A contour separating the selected union from the other discs cannot be crossed during this deformation. The argument principle, or continuity of the Riesz projection, keeps its eigenvalue count constant. At the diagonal endpoint the selected discs contain exactly the corresponding $k$ diagonal entries. The count is therefore $k$ throughout. For interval matrices the same argument is applied to each actual matrix using the common enclosing discs and separating contour.

An augmented eigenpair problem
\[
 Aq-\lambda q=0,\qquad q_k=1
\]
is a square complex system. The polydisc contraction proves a true eigenpair. Its eigenvalue enclosure must meet only the designated simple critical Gershgorin component; its conjugate must meet only the conjugate component. Mere overlap with an approximate eigenvalue does not establish identity. The remaining 16 eigenvalues are enclosed strictly in the left half-plane.

A left eigenvector satisfies $p^TA=\lambda p^T$. The same component-identification condition is required for its augmented proof. For a simple eigenvalue, $p^Tq\ne0$: otherwise $q$ belongs to the range of $A-\lambda I$, yielding a generalized eigenvector and contradicting algebraic simplicity. Differentiating $Aq=\lambda q$ and multiplying by $p^T$ therefore gives
\[
 \lambda'(g)=\frac{p^TA'(g)q}{p^Tq}.
\]
All numerator and denominator operations must be outward enclosures, with the denominator separated from zero.

The accepted Theorem A gate must prove that the endpoint and central eigenpairs refer to this same critical component. One sufficient identification used in the source is a strict bound $B_{\rm im}$ on the imaginary parts of all noncritical eigenvalues, together with a critical imaginary-part lower bound exceeding $B_{\rm im}$. This identifies the eigenvalue of positive imaginary part throughout the common equilibrium cover.

Let $G_H$ be the central crossing interval. Suppose its left endpoint has $\Re\lambda>0$, its right endpoint has $\Re\lambda<0$, and its derivative enclosure gives $\Re\lambda'<0$. Require a common equilibrium uniqueness enclosure over an identity interval $J\supset G_H$, containing every equilibrium-cover polydisc meeting $J$, and consistent critical-component identification there. Continuity and the intermediate value theorem produce one crossing in $G_H$; the derivative bound makes it unique there. The strict real-part signs on every cover interval to its left and right exclude any other imaginary-axis crossing on $J$. These statements concern the certified equilibrium family. They do not imply global uniqueness of equilibria elsewhere. Every central enclosure, including the Hopf enclosure itself, must be included in the reported maxima used for eigenvalue identification.

## 4. Qualitative Hopf theorem and the cubic coefficient

The qualitative theorem used is the standard finite-dimensional Hopf theorem, with the hypotheses and sign convention described by Kuznetsov in [Andronov–Hopf bifurcation](https://www.scholarpedia.org/article/Andronov-Hopf_bifurcation). Here the equilibrium family is smooth, its linearization has exactly one simple pair $\mu(g)\pm i\omega(g)$ with $\mu(g_H)=0$ and $\omega(g_H)>0$, every other eigenvalue has negative real part, $\mu'(g_H)\ne0$, and the first Lyapunov coefficient is nonzero.

For the expansion at the equilibrium
\[
 f(x_H+y;g_H)=Ay+\frac12 B(y,y)+\frac16 C(y,y,y)+O(|y|^4),
\]
choose $Aq=i\omega_Hq$, $A^Tp=-i\omega_Hp$, and
$\langle p,q\rangle=\overline p^{\,T}q=1$. In the convention used here,
\[
 l_1=\frac{1}{2\omega_H}\Re\left[
 \langle p,C(q,q,\overline q)\rangle
 -2\langle p,B(q,A^{-1}B(q,\overline q))\rangle
 +\langle p,B(\overline q,(2i\omega_HI-A)^{-1}B(q,q))\rangle
 \right].
\]
Both inverses in this formula must be certified. The spectral separation proves their existence, but their numerical action still requires outward bounds. The derivative tensors may be evaluated through exact truncated Taylor arithmetic: the quadratic directional derivative is $2[t^2]f(x+tv)$ and the cubic directional derivative is $6[t^3]f(x+tv)$. Polarization gives the mixed derivatives. Square-root and logarithm recurrences are valid only within the checked holomorphic domain. A change of normalization that rescales the coefficient by a positive factor preserves its sign, but does not justify comparing unnormalized numerical values.

If $\mu'(g_H)<0$ and $l_1<0$, the theorem gives a supercritical stable family on the $g<g_H$ side, for sufficiently small distance from the Hopf point. Stability is orbital, with the neutral phase direction removed. This conclusion is local and existential. No lower bound on the size of the neighborhood is supplied by this invocation. The amplitude continuation below provides an explicit existence cover, not an automatic extension of this qualitative stability conclusion.

## 5. Desingularized equations and Banach spaces

Let $\nu=e^{1/8}$ and define
\[
 \ell^1_\nu=\left\{a=(a_m)_{m\in\mathbb Z}:
       \|a\|_\nu=\sum_{m\in\mathbb Z}|a_m|\nu^{|m|}<\infty\right\},
 \qquad
 \ell^1_{\nu,0}=\{a\in\ell^1_\nu:a_0=0\}.
\]
Convolution makes $\ell^1_\nu$ a Banach algebra, since
$\nu^{|m+n|}\le\nu^{|m|}\nu^{|n|}$ and Tonelli's theorem gives
$\|a*b\|_\nu\le\|a\|_\nu\|b\|_\nu$.

The unknown is $X=(\omega,g,c,w)$ in
\[
 \mathcal X=\mathbb C^2\times\mathbb C^{18}
                    \times(\ell^1_{\nu,0})^{18}.
\]
For positive component weights $\eta=(\eta_\omega,\eta_g,\eta_c,\eta_w)$,
\[
 \|X\|_\eta=
 \max\left\{\frac{|\omega|}{\eta_\omega},
 \frac{|g|}{\eta_g},
 \max_j\frac{|c_j|}{\eta_{c_j}},
 \max_j\frac{\|w_j\|_\nu}{\eta_{w_j}}\right\}.
\]
The residual sequence space is weaker:
\[
 \ell^{1\prime}_\nu=
 \left\{a:\sum_m\frac{|a_m|\nu^{|m|}}{1+|m|}<\infty\right\}.
\]
Thus Fourier differentiation maps $\ell^1_\nu$ boundedly into
$\ell^{1\prime}_\nu$. It must not be treated as a bounded operator on
$\ell^1_\nu$ itself.

Define the difference quotient without division by amplitude:
\[
 Q(c,u,\varepsilon;g)
 =\int_0^1 D_xf(c+s\varepsilon u;g)u\,ds.
\]
On a domain containing every segment in this integral,
\[
 \varepsilon Q(c,u,\varepsilon;g)
       =f(c+\varepsilon u;g)-f(c;g),
 \qquad Q(c,u,0;g)=D_xf(c;g)u.
\]
The fundamental theorem of calculus proves the identity. Uniform holomorphy and boundedness on the compact segment permit differentiation under the integral, so $Q$ is jointly holomorphic including at $\varepsilon=0$.

The desingularized residual is
\[
 N_+=w_{V,1}-\frac12,\qquad N_-=w_{V,-1}-\frac12,
\]
\[
 E_0=f(c;g)+\varepsilon[Q(c,w,\varepsilon;g)]_0,\qquad
 E_m=im\omega w_m-[Q(c,w,\varepsilon;g)]_m\quad(m\ne0).
\]
It maps $\mathcal X$ into
$\mathcal X'=\mathbb C^2\times\mathbb C^{18}\times(\ell^{1\prime}_{\nu,0})^{18}$.

For $\varepsilon>0$, $E_0=0$ is the mean equation for $f(c+\varepsilon w)$, and $\varepsilon E_m=0$ gives every nonzero Fourier equation for the ODE. Hence a zero is a genuine periodic orbit. Conjugate symmetry gives a real orbit. The voltage first harmonic equals $\varepsilon/2\ne0$. Any period of a Fourier series with a nonzero first harmonic is an integer multiple of $2\pi$ in the normalized angle, so its least positive period is exactly $2\pi/\omega$.

At $\varepsilon=0$, $E_0=0$ gives $f(c;g)=0$, and the first-mode equation gives $D_xf(c;g)w_1=i\omega w_1$ with $w_{V,1}=1/2$. Thus the zero-amplitude endpoint is an equilibrium with an imaginary eigenpair. Identity with the specific Hopf point still requires Section 10.

## 6. Holomorphic Fourier estimates for the nonpolynomial field

The following lemma supplies the missing analytic step when polynomial convolution formulas are unavailable.

**Holomorphic composition lemma.** Let $p_\sigma(\theta)$ be a finite Fourier polynomial holomorphic for $|\sigma|\le T$ and $|\Im\theta|\le\rho_2$. Suppose $H$ is holomorphic on a neighborhood of every point
$p_\sigma(\theta)+\zeta$ with $|\zeta_j|\le R_j$, and $|H|\le M$ there. Let $h$ have component Fourier norms $\|h_j\|_\nu\le t_j<R_j$, with $\rho_2>\log\nu$. Then
\[
 \|H(p_\sigma+h)\|_\nu\le
 M Q_2\prod_j(1-t_j/R_j)^{-1},
 \qquad
 Q_2=\frac{1+q_2}{1-q_2},\quad q_2=\nu e^{-\rho_2}.
\]
For $|\sigma|<T$, its parameter derivative satisfies the additional bound
\[
 \|\partial_\sigma H(p_\sigma+h)\|_\nu
 \le \frac{M Q_2\prod_j(1-t_j/R_j)^{-1}}{T-|\sigma|}.
\]

To prove this, expand in the state perturbation,
$H(p_\sigma+\zeta)=\sum_\alpha a_\alpha(\sigma,\theta)\zeta^\alpha$.
Multivariate Cauchy estimates give
$|a_\alpha|\le M R^{-\alpha}$ uniformly on the angle strip. Shifting the Fourier contour to its upper or lower edge gives
$|[a_\alpha]_m|\le M R^{-\alpha}e^{-\rho_2|m|}$.
Consequently
\[
 \|a_\alpha\|_\nu\le M R^{-\alpha}
                  \sum_m q_2^{|m|}
              =M R^{-\alpha}Q_2.
\]
The Banach algebra estimate bounds the substituted term by
$M Q_2\prod_j(t_j/R_j)^{\alpha_j}$.
Summing the product of geometric series proves uniform absolute convergence in $\ell^1_\nu$ and the stated norm bound. On the real angle circle the sum equals the pointwise holomorphic composition by the Taylor theorem, so it represents the correct Fourier series. Uniform convergence on smaller parameter discs also proves Banach-space holomorphy. Cauchy's integral formula on parameter circles of radius approaching $T-|\sigma|$ proves the derivative estimate.

For each amplitude piece, take
$p_\sigma=c(\xi)+\sigma w(\xi)$, where $c,w$ are the affine center polynomials for the real amplitude interval. Every state and parameter perturbation used in the Newton estimate must lie in the checked complex domain. In particular the domain includes $|\sigma|\le T$, the full angle strip, state margins $R_j$, and a conductance margin $G_R$. Bounds on the Jacobian, state Hessian, and derivatives of $f_1$ are established there. Checking only $c+\xi w$ at real angle samples would not establish this lemma.

For any strip-bounded scalar function $H$ with bound $S$, the Fourier coefficient and tail estimates are
\[
 |H_m|\le S e^{-\rho_2|m|},\qquad
 \sum_{|m|>K}|H_m|\nu^{|m|}
 \le 2S\,\frac{q_2^{K+1}}{1-q_2}.
\]
For an $M$-point discrete Fourier transform the alias error in coefficient $n$ is bounded by
\[
 S\sum_{\ell\ne0}e^{-\rho_2|n+\ell M|}.
\]
These sums are evaluated outward. Residual, Jacobian, and derivative coefficients each use their own valid strip bounds. Aliasing is not discarded merely because the approximate orbit has finitely many modes.

## 7. Finite and tail inverse, residual, and derivative bounds

For a piece $\xi\in[e_c-h,e_c+h]$, let
$\bar X(\xi)=\bar X_c+(\xi-e_c)t$.
The center has finite Fourier support, exact conjugate symmetry, and exact voltage normalization. In particular the tangent's two normalization entries vanish.

The proposed inverse $A:\mathcal X'\to\mathcal X$ consists of a finite square block for the normalization equations, the mean equation, and modes $0<|m|\le K$, and tail blocks
\[
 A_m=(im\omega_c-\widehat J_0)^{-1}\qquad(|m|>K).
\]
The finite matrix is a proposal whose entries are enclosed exactly. Every tail block must be invertible. A finite near-tail range is checked directly for both signs of $m$, and the remaining modes use a Neumann estimate with a proved threshold. Bounds on the component norms of $A_m$ and $mA_m$, denoted $\mathcal A_0$ and $\mathcal A_1$, prove boundedness from the weaker residual space to $\mathcal X$.

Here is an explicit bound for the infinite tail. Choose $m_{\max}$ so that, with
\[
 Y=\omega_c(m_{\max}+1),\qquad
 G=|\widehat J_0|/Y,\qquad\vartheta=\|G\|_\infty<1,
\]
the Neumann series applies for every $m>m_{\max}$. Entrywise define
\[
 S_G=I+G+G^2+\frac{\vartheta^3}{1-\vartheta}{\bf1},
\]
where the last matrix has every entry equal to one. Each entry of $G^k$ is at most its row sum, hence at most $\vartheta^k$ for $k\ge3$. Therefore
\[
 |A_m|\le S_G/Y,\qquad |m A_m|\le S_G/\omega_c.
\]
The explicitly inverted modes $K<m\le m_{\max}$ are included by entrywise maxima. For negative modes $A_{-m}=\overline{A_m}$, since $\widehat J_0$ and $\omega_c$ are real. Products with complex Fourier coefficients still require the corresponding conjugated enclosure.

Write $J'_0=J_0-\widehat J_0$ and $J'_n=J_n$ otherwise, and obtain
\[
 C_n\ge\sup_{|m|>K}|A_mJ'_n|
\]
entrywise from explicit products for both signs in the finite near-tail range and the far-tail bound $|A_m||J'_n|$. If $|J_n|\le S_Je^{-\rho_2|n|}$ beyond the coefficient cutoff $K'$, the tail convolution block is bounded by
\[
 B_{ww}^{\rm tail}\le
 \sum_{|n|\le K'}C_n\nu^{|n|}
 +\mathcal A_0 S_J\,\frac{2q_2^{K'+1}}{1-q_2}.
\]
Indeed $\nu^{|m|}\le\nu^{|m-n|}\nu^{|n|}$, so summing $|A_mJ'_ny_{m-n}|\nu^{|m|}$ first in $m$ bounds it by this matrix applied to the component norms of $y$. The scalar-state column obeys
\[
 B_{wc}^{\rm tail}\le
 \sum_{K<|m|\le K'}|A_m(K_c)_m|\nu^{|m|}
 +\mathcal A_0 S_{K_c}\,\frac{2q_2^{K'+1}}{1-q_2},
\]
and the conductance column has the same formula with $k_g$ and its strip bound. These sums include both signs. For the line derivative replace coefficients by their proved line derivatives and include $|t_\omega|\mathcal A_1$ on the diagonal.

For a finite output row at mode $m$, $|m|\le K$, and a far input mode $m'$,
\[
 |J_{m-m'}|\le S_J
  e^{-\rho_2(|m'|-\operatorname{sgn}(m')m)}.
\]
Multiplication by $|A_{\rm fin}|$, summing the finite output Fourier weights, and dividing by the input weight $\nu^{|m'|}$ produces a constant times $(e^{-\rho_2}/\nu)^{|m'|}$. This decreases in $|m'|$, so the boundary columns $m'=\pm(K+L+1)$ bound all remaining columns after the explicit range $K<|m'|\le K+L$. Normalization rows have no such tail input because they depend only on modes $\pm1$. The same argument applies to the line derivative.

For a block operator on the component maximum norm, component bounds $B_{ij}$ give
\[
 \|B\|_\eta\le\max_i\frac1{\eta_i}\sum_jB_{ij}\eta_j.
\]
For a sequence block, its operator bound is the Fourier-weighted column supremum
\[
 \sup_{m'}\frac{\sum_m|B(m,m')|\nu^{|m|}}{\nu^{|m'|}}.
\]
These inequalities justify the finite and tail assembly estimates.

The bound $Z_1<1$ for $I-ADF(\bar X)$ implies invertibility of the finite compressed product and hence of the proposed finite inverse block. Invertibility of all tail blocks then proves injectivity of $A$. This injectivity is what turns fixed points of $X-AF(X)$ into zeros of $F$.

For the residual, Taylor's theorem along the affine amplitude center gives
\[
 \sup_{\xi}\|AF(\bar X(\xi);\xi)\|_\eta
 \le \max_i\frac{Y_{0p,i}+hY_{1,i}
                       +\frac12h^2Y_{2,i}}{\eta_i}\le Y_0,
\]
where the three vectors bound $|AF(\bar X_c)|$,
$|A\,d_\xi F(\bar X_c)|$, and
$\sup_\xi|A\,d_\xi^2F(\bar X(\xi))|$.
The second derivative of the integral quotient uses the full integrand
\[
 \frac{d^2}{d\xi^2}Q
 =\int_0^1\frac{d^2}{d\xi^2}
   \{D_xf(c(\xi)+s\xi w(\xi);g(\xi))w(\xi)\}\,ds.
\]
It includes derivatives of $c$, $w$, $g$, and $\xi$. Interval partitions in $s$ and $\xi$ enclose the whole integral and interval; evaluations at endpoints alone do not bound a Taylor remainder.

At the center, the mean-row derivatives are the mean Jacobian acting on $\delta c$, the mean convolution of the full Jacobian with $\varepsilon\delta w$, and $[f_1(c+\varepsilon w)]_0\delta g$. For nonzero modes they are
\[
 imw_m\,\delta\omega+im\omega\,\delta w_m
       -[J\delta w]_m-[K_c\delta c]_m-[k_g\delta g]_m,
\]
where
\[
 J=D_xf(c+\varepsilon w;g),\quad
 K_c=\int_0^1D_x^2f(c+s\varepsilon w;g)[w,\,\cdot]\,ds,
 \quad k_g=\int_0^1D_xf_1(c+s\varepsilon w)w\,ds.
\]
These formulas follow by differentiating the quotient integral, or its nonsingular holomorphic extension.

The defect estimate is
\[
 \sup_{\xi}\|I-ADF(\bar X(\xi);\xi)\|_\eta
        \le Z_{1c}+hZ_c\le Z_1,
\]
where $Z_c$ bounds the derivative of $ADF$ along the complete center interval. The final $Y_0$ and $Z_1$ are the recorded outward majorants used in the radii polynomial; admission must prove that each displayed intermediate expression is bounded above by its recorded constant. Its finite-finite part is a matrix enclosure. Its finite-tail part includes all near-tail columns and an exponential far-tail bound. Its tail-finite and tail-tail parts include the full Jacobian convolution, the constant mismatch $J_0-\widehat J_0$, the $K_c$ and $k_g$ columns, and both mode directions. In particular the varying-frequency diagonal contributes the bound involving $|t_\omega|\mathcal A_1$; it does not disappear because the center polynomial is finite. The actual frequency-column tail of that finite center is zero, but the derivative with respect to varying frequency still acts on arbitrary tail perturbations.

The weighted far-tail estimates use the decreasing exponential ratio supplied by $\rho_2>\log\nu$. Their start index and the finite near-tail range must exhaust all omitted columns. The DFT alias bounds from Section 6 are propagated through the proposed finite matrix and every relevant tail bound.

## 8. Full-ball derivative variation

Write $e_{\rm hi}=\max|\xi|$ on the piece and let $r_*$ be the largest admissible proof radius. Define
\[
 \tau_j=\eta_{c_j}+e_{\rm hi}\eta_{w_j},\quad
 t_j=\tau_jr_*,\quad
 P=\prod_j(1-t_j/R_j)^{-1},\quad T_m=T-e_{\rm hi}.
\]
The prerequisites are $t_j<R_j$, $T_m>0$, and $\eta_g r_*\le G_R$. Let $M_{H,kjl}$ bound the state Hessian and $M_{G,kj}$ bound $\partial_j(f_1)_k$ on the full complex domain. Set
\[
 a_{J,kj}=Q_2P\left(\sum_lM_{H,kjl}\tau_l
                                  +M_{G,kj}\eta_g\right).
\]
If $\|\Delta X\|_\eta\le r\le r_*$, the composition lemma and the mean value integral bound the change in $J_{kj}$ by $r a_{J,kj}$.

For the mean and nonzero-mode rows one may use
\[
 W_{0,k}=\sum_j a_{J,kj}
       (\eta_{c_j}+e_{\rm hi}\eta_{w_j})
       +\eta_g Q_2P\sum_l M_{G,kl}\tau_l,
\]
\[
 \begin{split}
 W_{E,k}={}&\sum_j a_{J,kj}\eta_{w_j}\\
 &+\sum_j\left(Q_2P\sum_lM_{H,kjl}\eta_{w_l}
                              +a_{J,kj}/T_m\right)\eta_{c_j}\\
 &+\eta_g Q_2P\left(\sum_lM_{G,kl}\eta_{w_l}
                         +\sum_lM_{G,kl}\tau_l/T_m\right).
 \end{split}
\]
To see the quotient bounds in detail, write
$h_s=\Delta c+s\xi\Delta w$ and $p_s=c(\xi)+s\xi w(\xi)$. Then
\[
 \begin{split}
 K_c(X)-K_c(\bar X)
 ={}&\int_0^1D_x^2f(p_s+h_s;g)\,[\Delta w,\,\cdot]\,ds\\
 &+\int_0^1\{D_x^2f(p_s+h_s;g)-D_x^2f(p_s;\bar g)\}
                                   [w(\xi),\,\cdot]\,ds .
 \end{split}
\]
The first integral is bounded in entry $(k,j)$ by
$rQ_2P\sum_lM_{H,kjl}\eta_{w_l}$.
For the state part of the second, integrate the state Hessian derivative along $p_s+u h_s$, $0\le u\le1$. Its contraction with $w(\xi)$ is the derivative in a complex parameter $\sigma$ of
$D_x^2f(p_s+u h_s+\sigma w(\xi))[h_s,\,\cdot]$.
The base amplitude is $s\xi$, and the available parameter-disc radius is at least $T-e_{\rm hi}$. Section 6 bounds this derivative by the corresponding Hessian majorant divided by $T_m$. The conductance part is treated through $D_xf_1$ in the same way. Together they are bounded by $r a_{J,kj}/T_m$. Similarly,
\[
 \|(k_g(X)-k_g(\bar X))_k\|_\nu
 \le rQ_2P\left(\sum_lM_{G,kl}\eta_{w_l}
                         +\sum_lM_{G,kl}\tau_l/T_m\right),
\]
and
\[
 \|(f_1(c+\xi w)-f_1(\bar c+\xi\bar w))_k\|_\nu
 \le rQ_2P\sum_lM_{G,kl}\tau_l.
\]
Combining these with the $J$ difference in the derivative rows gives $W_0$ and $W_E$ above.

The terms involving $\eta_w$ arise from changes in the vector $w$ inside $K_c$ and $k_g$. The terms with $T_m^{-1}$ follow from the amplitude Cauchy estimate in Section 6, which bounds the next state derivative needed for variation of the integral quotient. They require the full complex amplitude margin. Dependence on $g$ is affine, so $f_1$ has no further conductance derivative.

For residual block $j$, define the finite inverse component norm by
\[
 N_{A;ij}=\sup_{\ell\ {\rm in\ block}\ j}
       \frac{\sum_{a\ {\rm in\ output}\ i}
                    |(A_{\rm fin})_{a\ell}|\nu^{|m_a|}}
            {\nu^{|m_\ell|}},
\]
with mode zero for scalar blocks. Define $N_{A1;ij}$ by inserting the factor $|m_\ell|$ in each column expression. Below, $0k$ denotes mean component $k$ and $Ek$ its nonzero-mode residual block. Set $\mathcal A_{0,ik}=\mathcal A_{1,ik}=0$ for scalar output components; the tail matrices act only on $w$ output components. With the corresponding tail component bounds, a valid derivative-variation constant is
\[
 Z_2=\max_i\frac1{\eta_i}\sum_k\left[
 N_{A;i,0k}W_{0,k}
 +(N_{A;i,Ek}+\mathcal A_{0,ik})W_{E,k}
 +(N_{A1;i,Ek}+\mathcal A_{1,ik})\,2\eta_\omega\eta_{w_k}
 \right].
\]
The displayed expression, evaluated outward and bounded above by the recorded $Z_2$, proves
\[
 \|A(DF(\bar X+\Delta X)-DF(\bar X))\|_\eta
      \le Z_2\|\Delta X\|_\eta.
\]
The final term comes from the bilinear product $\omega\,\partial_\theta w$ and includes both perturbation orders. The weak residual space is essential for bounding this derivative term. Every bound is on the full ball, including conductance perturbations, rather than just the real center curve.

## 9. Radii polynomial, continuity, and gluing

Define
\[
 p(r)=Y_0+(Z_1-1)r+\frac12Z_2r^2.
\]
Suppose
\[
 0<r_{\rm lo}\le r_{\rm hi}\le r_*,\qquad
 p(r_{\rm lo})<0,\quad p(r_{\rm hi})<0,\quad
 Z_1+Z_2r_{\rm hi}<1.
\]
Taylor's integral formula gives
\[
 \|AF(\bar X)+[ADF(\bar X)-I]v+
 A\{F(\bar X+v)-F(\bar X)-DF(\bar X)v\}\|_\eta
 \le Y_0+Z_1r+\frac12Z_2r^2
\]
for $\|v\|_\eta\le r$. Thus $T=X-AF(X)$ maps the radius-$r$ ball into itself whenever $p(r)<0$. Its derivative norm is at most $Z_1+Z_2r_{\rm hi}$ on the larger ball, so Banach's theorem gives one zero in the larger ball and locates it in the smaller ball. Section 7 proves that this is a true zero.

The real Fourier involution swaps the positive and negative normalization equations and conjugates all coefficients. It preserves the problem and enclosure. Uniqueness forces conjugate symmetry and real $\omega,g,c$.

Strict inequalities also prove continuity without requiring $r_{\rm lo}<r_{\rm hi}$. Since $p(r_{\rm lo})<0$, continuity of $p$ permits a radius $r'<r_{\rm lo}$ sufficiently close to $r_{\rm lo}$ with $p(r')<0$. The fixed point then has the positive margin $r_{\rm hi}-r'$ inside its larger ball. Nearby affine centers move by less than this margin. Both local zeros can therefore be compared in a common larger ball; the contraction inequality bounds their difference by the continuous change of the parameter-dependent map divided by $1-\kappa$. Hence the zeros depend continuously on amplitude. The local implicit function theorem supplies analyticity wherever the derivative is invertible.

At a shared endpoint of adjacent pieces, one sufficient gluing inequality is
\[
 \|\bar X_L-\bar X_R\|_{\eta_R}
       +r_{{\rm lo},L}\max_i\frac{\eta_{L,i}}{\eta_{R,i}}
       \le r_{{\rm hi},R}.
\]
The left zero is then inside the right uniqueness ball and solves the identical normalized equations. Uniqueness identifies the zeros. An accepted cover of all 68 pieces and all 67 adjacent gluings therefore produces a continuous amplitude family over $[0,6427/50000]$. Missing a gluing cannot be replaced by similar-looking endpoint approximations.

## 10. Identifying the zero-amplitude endpoint

The amplitude endpoint at $\varepsilon=0$ gives an equilibrium $c(0)$ and an eigenvalue $i\omega(0)$ with a nonzero first-mode eigenvector. To identify it with the certified Hopf point, require an outward inclusion $g(0)\in J$ and a common equilibrium contraction enclosure containing both $c(0)$ and the real equilibrium enclosures that meet $J$. The equilibrium uniqueness theorem in that common polydisc proves $c(0)=x_e(g(0))$.

The eigenpair separation and positive imaginary-frequency enclosure from Section 3 identify $i\omega(0)$ with the unique critical eigenvalue. The unique crossing in $J$ therefore implies
\[
 g(0)=g_H,\qquad c(0)=x_H,\qquad\omega(0)=\omega_H.
\]
No global equilibrium uniqueness over a larger interval is needed. A claim that every equilibrium in that larger interval is the same branch would require an additional argument.

Continuity now gives $c(\varepsilon)+\varepsilon w(\varepsilon)\to x_H$. The normalization and positive frequency keep the positive-amplitude solutions nonconstant. For sufficiently small amplitude these solutions lie in the neighborhood covered by the qualitative Hopf theorem, so they are its stable small cycles up to phase. This identifies their local stability but leaves the size of that neighborhood unquantified.

## 11. Fresh bridge at conductance 0.02778

A fresh ordinary periodic-orbit proof with Fourier phase equation $a_{V,1}-a_{V,-1}=0$ at $g_s=0.02778$ supplies a center $a_s$, frequency $\bar\omega_s$, weights $\eta_s$, and an error radius $r_s$ in Fourier weight $\nu_P=e^{1/4}$. Its voltage first harmonic has positive real amplitude after phase fixing. Define the true normalized amplitude by
\[
 \varepsilon_s=2(a_s^{\rm true})_{V,1}.
\]
Its outward enclosure is
\[
 E=2\left[\bar a_{s,V,1}
             -\eta_{s,V}r_s/\nu_P,\
          \bar a_{s,V,1}
             +\eta_{s,V}r_s/\nu_P\right],
 \qquad \inf E>0.
\]
The amplitude family uses $\nu=e^{1/8}\le\nu_P$, so the point proof's error controls its norm in the amplitude space.

The admitted amplitude pieces must cover all of $E$, and every amplitude piece $Q$ meeting $E$ must be checked. For $X=E\cap Q$, interval evaluation of its affine center yields the sufficient inclusion
\[
 \max\left\{
 \frac{|\bar\omega_s-\bar\omega_Q(X)|+\eta_{s,\omega}r_s}
      {\eta_{Q,\omega}},
 \frac{|g_s-\bar g_Q(X)|}{\eta_{Q,g}},
 \max_k\frac{|\bar a_{s,k,0}-\bar c_{Q,k}(X)|
                                     +\eta_{s,k}r_s}{\eta_{Q,c_k}},
 \max_k
 \frac{\sum_{m\ne0}|\bar a_{s,k,m}/X-\bar w_{Q,k,m}(X)|\nu^{|m|}
                          +\eta_{s,k}r_s/\inf X}{\eta_{Q,w_k}}
 \right\}\le r_{{\rm hi},Q}.
\]
The finite coefficient difference includes the union of both center supports. The remaining infinite coefficients are controlled by the point error and $\nu\le\nu_P$. All divisions by $X$ require its positive lower bound.

For the true point solution set
\[
 Y_s=\left(\omega_s,g_s,(a_s^{\rm true})_0,
            ((a_s^{\rm true})_m/\varepsilon_s)_{m\ne0}\right).
\]
The bound above places $Y_s$ inside an amplitude uniqueness ball. Its Fourier equations and amplitude definition give both normalization equations and every desingularized residual equation. The analytic quotient is valid on this ball by the domain proof. Thus $Y_s$ is the amplitude-family zero at $\varepsilon_s$.

A separate ordinary-branch inclusion places the same point solution in the relevant conductance-piece uniqueness ball:
\[
 \|\bar X_s-\bar X_P(g_s)\|_{\eta_P}
       +r_s\max_i\frac{\eta_{s,i}}{\eta_{P,i}}
       \le r_{{\rm hi},P}.
\]
The centers, phase conventions, Fourier weights, and component conversions in this inequality must match the actual two proofs. This proves that the point orbit lies on both certified families.

Their union is connected. The continuous amplitude conductance map has endpoint values $g_H$ and $g_s$, so its image contains every intermediate value. For values strictly below $g_H$, an intermediate preimage is positive and represents a nonconstant orbit. Combining this with the conductance-family interval proves the existence conclusion of D(c). No derivative sign for the entire amplitude curve is used.

## 12. Numerical prerequisites and limits of the conclusion

The manuscript cannot claim D(c) until the following independent gates are accepted:

1. A fresh full Theorem A record bound to the current equilibrium, derivative, spectral, and Lyapunov-coefficient source and inputs. Prior accepted records with different hashes do not establish the current gate.
2. Fresh proofs for exactly all 68 amplitude pieces, complete interval coverage, exact matching settings and center data, source hashes captured at import, and outward bounds establishing every domain, self-map, contraction, and inverse condition above.
3. Fresh proofs of all 67 adjacent gluings, with each radius and component weight taken from the actual admitted piece record.
4. A fresh zero-amplitude identity proof using the common equilibrium enclosure, crossing interval, and identified imaginary eigenpair.
5. A fresh $g_s=0.02778$ ordinary point proof and both bridge inclusions, including every amplitude piece intersecting its amplitude enclosure and the current accepted conductance branch.

The historical candidate settings used 41 pieces with $K=8$, $M=48$, followed by 27 pieces with $K=12$, $M=64$. This describes the intended computation, not fresh acceptance. Logged exact settings, centers, component weights, interval endpoints, and source/input hashes are authoritative. Flags, decimal agreement with an older table, or copied historical bounds are insufficient.

The compact-resolvent framework in existing manuscript Appendix A, papers/cardiac-rings/paper/cardiac-rings.tex (the appendix labelled app:resolvent), supports the separate Fourier stability arguments: an unweighted Fourier $\ell^1$ realization has differentiation domain $\sum_m|m||u_m|<\infty$, bounded convolution perturbations, and a diagonal resolvent whose tail tends to zero. Finite projections approximate that resolvent in operator norm, so it is compact; a Neumann argument at sufficiently large positive real spectral parameter handles the bounded perturbation. The current frequency and all signed tail directions must be retained. This supplies the spectral framework for the Hill certificates, not a quantitative replacement for the qualitative Hopf theorem.

D(b) requires its own fresh uniform conductance-stability cover. An isolated point stability certificate proves stability of that point only. The qualitative Hopf theorem proves stability in an unquantified neighborhood only. Neither fact, separately or together, proves stability of the interval between their certified scopes. A uniform stability argument across that remaining region is an additional numerical and mathematical prerequisite if the proposed final theorem is to include it.

Before integration, replace conditional status statements only with accepted fresh receipts, reconcile the exact D(a)/(b)/(c) endpoint conventions, and have the formulas and record identities reviewed together. No figure is required for this argument; any later figure labels should be placed outside the plots. No release or publication claim is made by this note.
