# Candidate methods section: a conductance branch and uniform stability

Date: 2026-10-02. Status: manuscript draft, conditional mathematical statements, not a publication or a final numerical certificate. This section concerns only the single cell, $N=1$. The coupling term vanishes identically. The manuscript's existing Theorem C concerns every ring size and the cable at fixed conductance, with parameter $\varepsilon=1/N^2$. It is a different result. The research lemmas call conductance-uniform stability “Theorem C”; this manuscript draft proposes **Theorem D(a)** for conductance continuation and **Theorem D(b)** for stability along that branch. No change to the accepted Theorem C is proposed here.

The parent checkpoint reports completion of a fresh 712-piece branch computation and 711 adjacent gluing checks. The completed branch now has scoped in-project acceptance for existence, local uniqueness, continuity and minimal period, recorded in `results/fourier-review-status.json` and `reviews/review-cloud-branch-final-receipt-2026-10-02.json`. This manuscript text still requires final integration and review. The historical stability log has 127 successful units; a fresh complete stability coverage, its exact source and branch bindings, collection and independent review remain prerequisites. A new fallback decomposition need not have the same number of units. This draft makes no claim that those prerequisites have passed, and makes no Hopf or bridge assertion.

Drafting basis: the reviewed docstring of `research/cardiac-cycle-certificates/fourier/branch.py`, Sections 10 and 11 of `fourier/LEMMAS-stability.md`, and the underlying finite/tail arguments in `existence.py` and Sections 0 to 4 of those lemmas. Source snapshots read for this draft:

| Source | SHA-256 |
| --- | --- |
| `branch.py` | `e5739a1583b44b8c355e8f74e8d47360c0c9af12f62988f4c2649dd4e5b274bf` |
| `branch_stability.py` | `b04c1f827867cf5bbba31ed99f10e74cc6469b998ad43d3ad2372235cca59463` |
| `LEMMAS-stability.md` | `9dc27ff8d0e9d219435fd01141d3b7fa28e16358cab9d1897ed34327c033fcc8` |

## 1. Setting, domain and proposed statement

Write $z=\Sigma^{-1}x$ for the exact diagonal scaling of the 18-state cell, and $g=G_{Ks}$. The model has

\[
 f(z;g)=f(z;g_c)+(g-g_c)f_1(z).
\]

Only the voltage row of $f_1$ is nonzero. A proposed periodic orbit is

\[
 z(t)=\phi(\omega t),\qquad
 \phi(\theta)=\sum_{m\in\mathbb Z}a_m e^{im\theta},\qquad
 \omega\phi'=f(\phi;g).
\]

The complex domain $U_g$ is the open set where every intermediate reciprocal in the model expression has a nonzero divisor and every intermediate logarithm or square root has argument with positive real part. Exponentials and integer powers impose no further restriction, except reciprocals for negative powers. Logarithms and square roots use their principal branches. A finite ball evaluation, with these guards checked at every intermediate, certifies that the entire input set lies in this domain. Guarded evaluation of the field and its derivatives is essential; a finite unguarded logarithm is not a domain certificate.

Let $\rho_0>0$, $\nu=e^{\rho_0}>1$, and exact positive weights $\eta_\omega,\eta_1,\ldots,\eta_{18}$ be fixed on a piece. Define

\[
 \ell^1_\nu=\{b:\|b\|_\nu=\sum_m|b_m|\nu^{|m|}<\infty\},\qquad
 X=\mathbb C\times(\ell^1_\nu)^{18},
\]
\[
 \| (\omega,a)\|_\eta
 =\max\left\{|\omega|/\eta_\omega,
             \max_k\|a_k\|_\nu/\eta_k\right\}.
\]

The residual space is $X'=\mathbb C\times(\ell^{1\prime}_\nu)^{18}$, with

\[
 \|b\|_{\nu}'=\sum_m\frac{|b_m|\nu^{|m|}}{1+|m|},
\]

and the corresponding weighted maximum norm. The operator $b_m\mapsto im b_m$ is bounded from $\ell^1_\nu$ to $\ell^{1\prime}_\nu$. It is not asserted bounded on $\ell^1_\nu$. Define $F:X\to X'$ locally by

\[
 F_{\rm ph}(\omega,a)=a_{1,V}-a_{-1,V},\qquad
 F_m(\omega,a;g)=i\omega m a_m-[f\circ\phi_a]_m.
\]

On real conjugation-symmetric profiles this phase condition is $\operatorname{Im}a_{1,V}=0$. It fixes a local time origin when $a_{1,V}\ne0$. It does not select a voltage level crossing, which can cease to exist along a shrinking orbit.

**Proposed Theorem D, conditional on accepted records.** Let $J$ be the exact conductance interval stored in an admitted branch record, and suppose all hypotheses and checks below hold with admitted source-bound numerical records.

(a) For every $g\in J$, there is a phase-fixed real nonconstant profile $\phi_*(\cdot;g)$, analytic on $|\operatorname{Im}\theta|<\rho_0$, and $\omega_*(g)>0$, solving the cell profile equation. The pair $x_*(g)=(\omega_*(g),a_*(g))$ is continuous in $X$, locally Lipschitz on each certified piece, and lies in the piece's existence ball. It is the only phase-fixed zero in that piece's uniqueness ball. The first voltage harmonic is nonzero; hence $2\pi$ is the minimal profile period and $T(g)=2\pi/\omega_*(g)$ is the minimal physical period.

(b) Suppose finitely many admitted stability units cover all of $J$. On each unit $I_u$, let $\delta_u>0$ and $\omega_{{\rm hi},u}$ be its certified constants. For every $g\in I_u$, the multiplier 1 is algebraically simple, and the other 17 Floquet multipliers satisfy

\[
 |\lambda|<e^{-\delta_u T(g)}\le
 e^{-\delta_u T_{{\rm lo},u}},\qquad
 T_{{\rm lo},u}=2\pi/\omega_{{\rm hi},u}.
\]

The orbit is locally exponentially orbitally stable with asymptotic phase. For each fixed $g$ and $0<\delta'<\delta_u$, constants $C_g,\epsilon_g>0$ exist such that

\[
 |\Phi_t(z_0;g)-z_*(t+\sigma;g)|
 \le C_g e^{-\delta't}\operatorname{dist}(z_0,\mathcal O_g)
 \quad(t\ge0)
\]

for some phase $\sigma$, whenever the initial distance is below $\epsilon_g$. These local nonlinear constants are not numerically computed or claimed uniform in $g$. A uniform multiplier upper bound follows by taking the maximum of the finitely many accepted unit bounds. No stability for other $N$, for the cable, or at a Hopf endpoint is asserted.

## 2. Fourier enclosures and an injective proposed inverse

The convolution inequality

\[
 \|b*c\|_\nu\le\|b\|_\nu\|c\|_\nu
\]

follows by summing absolute values and using $\nu^{|m|}\le\nu^{|n|}\nu^{|m-n|}$. Thus $\ell^1_\nu$ is a Banach algebra. Its Fourier series converges absolutely and uniformly on the closed strip $|\operatorname{Im}\theta|\le\rho_0$, and is holomorphic on its interior.

**Lemma 2.1 (strip and Fourier bounds).** Suppose a finite cover of $[0,2\pi]\times[-\rho,\rho]$ by closed rectangles is evaluated by guarded inclusion arithmetic for a trigonometric polynomial $p$ and a holomorphic expression $H$. If all evaluations are finite, $H(p(\theta))$ is holomorphic on an open neighborhood of the closed strip, and its modulus is bounded by the maximum $S$ of the output modulus upper bounds. Its coefficients satisfy $|c_n|\le S e^{-\rho|n|}$. An $M$-node DFT encloses $\sum_{\ell\in\mathbb Z}c_{n+\ell M}$; therefore the exact coefficient is enclosed after adding the alias error

\[
 S\frac{e^{-\rho(M-n)}+e^{-\rho(M+n)}}{1-e^{-\rho M}}
 \quad (|n|<M).
\]

For $q=\nu e^{-\rho}<1$, the weighted omitted tail beyond (K') is at most $2S q^{K'+1}/(1-q)$.

*Proof.* Each rectangle's input ball contains every polynomial value on the rectangle; inclusion and the domain guards imply that these values lie in an open holomorphic domain. Periodicity extends the cover to the strip. Shifting the Fourier integration contour to imaginary part $-\rho\operatorname{sgn}(n)$ proves the coefficient bound. Absolute convergence permits interchanging the Fourier series with the finite DFT; the finite roots-of-unity sum is 1 precisely when the coefficient index equals (n) modulo $M$. Summing the positive and negative alias geometric series gives the displayed formula. Summing $S(\nu e^{-\rho})^{|n|}$ over both omitted signs gives the last claim. The same proof applies entrywise and to a family whose coefficient and parameter balls contain every member. □

Choose an exact real center $\bar x=(\bar\omega,\bar a)$, with $\bar\omega>0$, modes $|m|\le K$, conjugation symmetry, and zero phase. Let $J_n=[Df\circ\phi_{\bar a}]_n$, evaluated at $g_c$. Form the finite Jacobian $J_{\rm fin}$ with rows phase and modes $|m|\le K$, and columns frequency and those modes. Its phase row has precisely +1 at ((1,V)) and -1 at ((-1,V)). Let $A_{\rm fin}$ be any exact square matrix proposed as an inverse. Define the fixed operator $A:X'\to X$ by $A_{\rm fin}$ on the finite block and

\[
 A_m=(i\bar\omega mI-\widehat J_0)^{-1}\quad(|m|>K),
\]

on individual tail modes, where $\widehat J_0$ is an exact real matrix. There is no damping term for $N=1$.

**Lemma 2.2 (tail inverse and injectivity).** Compute the point matrix inverses for $K<|m|\le m_{\max}$. Put $Y=\bar\omega(m_{\max}+1)$, $G=|\widehat J_0|/Y$, and require $\theta=\|G\|_\infty<1$. Set

\[
 S_G=I+G+G^2+\frac{\theta^3}{1-\theta}\mathbf1.
\]

For every farther mode,

\[
 |A_m|\le S_G/Y,\qquad |mA_m|\le S_G/\bar\omega.
\]

Together with the explicit modes these give finite entrywise bounds $\overline A_0\ge\sup_{|m|>K}|A_m|$ and $\overline A_1\ge\sup_{|m|>K}|mA_m|$, and make $A:X'\to X$ bounded. If $\|I-A DF(\bar x;g_c)\|_{X\to X}<1$, then (A) is injective.

*Proof.* For $y=\bar\omega|m|\ge Y$, expand the inverse in the Neumann series of $\widehat J_0/(i\bar\omega m)$. Entrywise absolute values are bounded by $y^{-1}\sum_{k\ge0}G^k$. For $k\ge3$, each entry is at most the corresponding row sum, which is at most $\theta^k$; summing proves both estimates. The factor needed to map $X'$ into $X$ is $(1+|m|)|A_m|$, bounded by $\overline A_0+\overline A_1$. The finite compression of $I-A DF$ is $I-A_{\rm fin}J_{\rm fin}$, with norm below 1. A Neumann series makes $A_{\rm fin}J_{\rm fin}$ invertible, hence the square matrix $A_{\rm fin}$ invertible. Each tail matrix is invertible by its explicit or Neumann construction, so $Av=0$ implies every component of $v$ is zero. □

Negative tail modes are included: $A_{-m}=\overline{A_m}$, but products with a fixed $J_n$ require both signs. A bound for $|A_mJ_n|$ at positive $m$ cannot simply be reused for negative $m$ without conjugating $J_n$.

## 3. Finite/tail bounds and the branch contraction

Here and below absolute values of matrices are entrywise, and inequalities between nonnegative matrices are entrywise. For an operator $B:X\to X$ with component blocks, a sufficient bound is

\[
 \|B\|\le\max_c\frac1{\eta_c}\sum_{c'}\eta_{c'} B_{cc'},\qquad
 B_{cc'}\ge\sup_{m'}\sum_m|B_{cc'}(m,m')|
                         \nu^{|m|-|m'|}.
\]

Frequency has one mode with weight 1. This is proved by applying the triangle inequality in each output component and then the weighted maximum norm.

The following prescriptions specify the directions that must be bounded. A finite vector residual is multiplied by $A_{\rm fin}$ exactly in ball arithmetic. For a residual with nonlinear coefficient enclosure $[v_m]$, its remaining bound is

\[
 \sum_{K<|m|\le K'}|A_m[v_m]|\nu^{|m|}
 +\overline A_0 S_v\frac{2q^{K'+1}}{1-q}.
\]

Polynomial derivative terms vanish beyond $K$, including along the paths below. The three terms, finite rows, explicit tail rows and analytic omitted tail, give a component residual vector.

For $B=I-A DF(\bar x;g_c)$, finite rows and finite columns are $I-A_{\rm fin}J_{\rm fin}$. Finite rows and tail columns are $A_{\rm fin}$ applied to convolution columns with entries $-J_{m-m',kj}$, $|m|\le K<|m'|$. Their phase entry is zero, since this branch phase uses only modes $\pm1$. Evaluate $K<|m'|\le K+L$ explicitly. For each sign, farther columns satisfy

\[
 |J_{m-m',kj}|\le S_{J,kj}e^{-\rho(|m'|-\operatorname{sgn}(m')m)}.
\]

After division by $\nu^{|m'|}$, each term of the finite-row column sum is a nonnegative constant times $(e^{-\rho}/\nu)^{|m'|}$. It decreases, so the column at $|m'|=K+L+1$, for each sign, bounds all farther columns.

For tail rows put $J'_0=J_0-\widehat J_0$ and $J'_n=J_n$ otherwise. The identity $A_m(i\bar\omega mI-\widehat J_0)=I$ gives

\[
 (By)_m=\sum_n A_mJ'_n y_{m-n},\qquad |m|>K.
\]

There is no frequency column in these rows because $\bar a_m=0$ there. Let $C_n\ge\sup_{|m|>K}|A_mJ'_n|$, using explicit products for both signs and the far bound of Lemma 2.2. Then

\[
 T=\sum_{|n|\le K'}C_n\nu^{|n|}
   +\overline A_0 S_J\frac{2q^{K'+1}}{1-q}
\]

bounds the tail convolution blocks. A block bound is the maximum of its finite-row finite-column and finite-row tail-column suprema, plus the tail block $T$. This maximum is necessary: the two finite-row cases are alternatives for an input column, whereas the tail rows are additional outputs.

On $P=[g_c-h,g_c+h]$, affinity in $g$ gives

\[
 Y_0=\max_c(Y_{0p,c}+hY_{0g,c})/\eta_c,
\]
\[
 Z_1=\max_c\eta_c^{-1}\sum_{c'}\eta_{c'}(B_{1,cc'}+hB_{1g,cc'}).
\]

Here $Y_{0p}$ uses the point residual, $Y_{0g}$ uses $F_g=(0,-[f_1\circ\phi_{\bar a}]_m)$, and $B_{1g}$ bounds $A\partial_g DF$ by the same finite/tail split, with the convolution coefficients of $D f_1$ and no identity subtraction. This derivative has zero rows outside voltage. Exact zero rows may be omitted; nonzero directions may not. The displayed estimates follow from $F(\bar x;g)=F(\bar x;g_c)+(g-g_c)F_g(\bar x)$ and the identical derivative identity, or from the fundamental theorem of calculus if interval enclosures are used.

**Lemma 3.1 (Hessian bound in the Banach algebra).** Let $\rho_2>\rho_0$, exact radii $R_j>0$, and a guarded cover contain every center polynomial under consideration, its state polydisc $|w_j|\le R_j$, and every required $g$. Suppose

\[
 |\partial_j\partial_l f_k(\phi_{\bar a}(\theta)+w;g)|
 \le M_{H,kjl}\quad(|\operatorname{Im}\theta|\le\rho_2).
\]

For $t_j=\|a_j-\bar a_j\|_\nu<R_j$, define

\[
 q_2=\nu e^{-\rho_2}<1,\quad Q_2=(1+q_2)/(1-q_2),\quad
 \Pi(t)=\prod_j(1-t_j/R_j)^{-1}.
\]

Then the Hessian composition belongs to $\ell^1_\nu$ and has norm at most $M_{H,kjl}Q_2\Pi(t)$. The map $a\mapsto f\circ\phi_a$ is analytic locally into $(\ell^1_\nu)^{18}$, with derivative convolution by $Df\circ\phi_a$; its Jacobian derivative is convolution by the Hessian.

*Proof.* Expand the Hessian about the center polynomial in the state polydisc. Cauchy's formula gives Taylor coefficient bounds $|c_\alpha(\theta)|\le M_H R^{-\alpha}$. Each coefficient is periodic and holomorphic near the $\rho_2$ strip, so Lemma 2.1 gives $\|c_\alpha\|_\nu\le M_H R^{-\alpha}Q_2$. Substitution of $a-\bar a$ in this series converges absolutely in the Banach algebra, dominated by $M_HQ_2\prod_j\sum_{n\ge0}(t_j/R_j)^n$. On the real circle its value is the original composite, so its Fourier coefficients are those of the composite. The same argument for $f$ and $Df$ gives normally convergent power series on smaller polydiscs. Differentiating those series term by term gives the stated derivatives, and the series for the derivative of $Df$ is precisely the Hessian series already bounded. □

Let $N_0,N_1$ bound the finite blocks of $A_{\rm fin}$ and of $A_{\rm fin}$ followed by mode multiplication $im$, respectively, in the component sequence norms. Extend $\overline A_0,\overline A_1$ by zero in frequency output. For $\eta_jr_*<R_j$, put

\[
 W_k=Q_2\Pi(\eta r_*)\sum_{j,l}\eta_j\eta_l M_{H,kjl},
\]
\[
 Z_2=\max_c\eta_c^{-1}\sum_k
 \{2\eta_\omega\eta_k(N_1+\overline A_1)_{ck}
                  +(N_0+\overline A_0)_{ck}W_k\}.
\]

Indeed, for $x-\bar x=(\Delta\omega,\Delta a)$ and a unit test vector $y$, the derivative difference is

\[
 im(y_\omega\Delta a_m+\Delta\omega y_{a,m})
 -[(Df\circ\phi_a-Df\circ\phi_{\bar a})*y_a]_m.
\]

The first two terms give the factor $2\eta_\omega\eta_k$; the last is the integral of the Hessian along $\bar a+s\Delta a$, bounded by Lemma 3.1 and the convolution inequality. Thus

\[
 \|A(DF(x;g)-DF(\bar x;g))\|\le Z_2\|x-\bar x\|
 \quad(\|x-\bar x\|\le r_*).
\]

**Lemma 3.2 (piece existence and uniqueness).** Suppose the domain cover and inverse checks above hold uniformly on $P$, and choose $0<r_{\rm lo}<r_{\rm hi}\le r_*$. If, at both radii,

\[
 p(r)=Y_0+(Z_1-1)r+\tfrac12Z_2r^2<0,
 \qquad Z_1+Z_2r<1,
\]

then each $g\in P$ has a unique zero in $B_{r_{\rm hi}}(\bar x)$, and that zero lies in $B_{r_{\rm lo}}(\bar x)$.

*Proof.* The composition lemma and the bounded mode-multiplied inverse make $T_g=x-AF(x;g)$ continuously differentiable on the ball in $X$. Integration of its derivative along the center segment gives

\[
 \|T_g(x)-\bar x\|\le Y_0+Z_1r+\tfrac12Z_2r^2<r.
\]

Its derivative norm is at most $Z_1+Z_2r<1$, so it is a contraction. Apply Banach's theorem at both radii; the smaller fixed point lies in the larger ball and is its unique fixed point. Injectivity of $A$ equates fixed points with zeros of $F$. Reality follows because $(\omega,a_m)\mapsto(\overline\omega,\overline{a_{-m}})$ takes zeros to zeros and preserves the ball, so uniqueness fixes this involution. A certified lower bound $\bar\omega-\eta_\omega r_{\rm lo}>0$ gives positive frequency. The lower bound $|\bar a_{1,V}|-\eta_Vr_{\rm lo}/\nu>0$ gives a nonzero first harmonic. A nonconstant $2\pi$-periodic continuous function with a smaller minimal period has minimal period $2\pi/k$ for an integer $k\ge2$; its Fourier coefficients then vanish outside multiples of $k$. The first harmonic excludes this possibility. □

## 4. Continuity and gluing

On a piece, $F(x;g)-F(x;g')=(g-g')F_1(x)$. The composition series above gives a finite bound $L$ for $\|AF_1(x)\|$ on its uniqueness ball. With $\kappa=Z_1+Z_2r_{\rm hi}<1$, the fixed point identity gives

\[
 \|x_*(g)-x_*(g')\|
 \le L|g-g'|+\kappa\|x_*(g)-x_*(g')\|,
\]

and hence Lipschitz constant $L/(1-\kappa)$.

For adjacent pieces with overlap, require

\[
 \|\bar x_i-\bar x_{i+1}\|_{\eta(i+1)}
 +r_{{\rm lo},i}\max_c\frac{\eta_{c,i}}{\eta_{c,i+1}}
 \le r_{{\rm hi},i+1}.
\]

The existence zero of $i$ is then in the uniqueness ball of $i+1$, so the two maps agree throughout their overlap. Require that both lower and upper piece endpoints increase strictly. If nonadjacent pieces $i<j$ meet, the lower endpoint of $j$ belongs to every intermediate piece: its value is at least their lower endpoints and at most the upper endpoint of $i$, hence at most theirs. Adjacent identities give equality there. The equality set on $P_i\cap P_j$ is closed by continuity. It is relatively open: an agreement zero lies in the existence ball of $j$, which is strictly inside its uniqueness ball because $r_{{\rm lo},j}<r_{{\rm hi},j}$; nearby values from $i$ remain inside that uniqueness ball and are the same zero. The overlap is connected, so the equality set is the entire overlap. The piecewise map is therefore single valued and continuous on the full interval. This proves D(a) under the stated record hypotheses.

## 5. Affine piece tubes and quadratic group tubes

The smaller stability tube must follow the orbit. A broad existence ball about a constant center cannot be substituted for this tube without checking the resulting inequalities.

For an affine path $\widetilde x(g)=\bar x+d\bar x_1$, $d=g-g_c$, $|d|\le h$, let $e\ge h\|\bar x_1\|$. If

\[
 e+r\le r_{\rm hi},\quad
 \kappa=Z_1+Z_2(e+r)<1,\quad
 Y'\ge\sup_g\|AF(\widetilde x(g);g)\|,\quad
 Y'\le(1-\kappa)r,
\]

the same contraction argument on $B_r(\widetilde x(g))$ locates the branch there. The ball lies in the old uniqueness ball, which identifies the zero. Its residual decomposition is

\[
 R_0+dR_1+d^2R_2(d),
\]
\[
 (R_1)_m=im(\bar\omega\bar a_{1,m}+\omega_1\bar a_m)-[\partial_dG(\cdot;0)]_m,
\]
\[
 (R_2(d))_m=im\omega_1\bar a_{1,m}
 -\left[\int_0^1(1-s)\partial_d^2G(\cdot;sd)\,ds\right]_m,
\]

where $G(\theta;d)=f(\phi_{\bar a}+d\phi_1;g_c+d)$. All phase components are zero when the path has the exact branch phase. Taylor's formula proves the decomposition; continuous integrands on a compact circle times $[0,1]$ justify exchange of the Fourier and $s$ integrals. The second-derivative box enclosure is multiplied by $1/2$, the mass of $1-s$. Applying the residual prescription of Section 3 gives $Y'=\max_c(Y_{0p,c}+hY_{1,c}+h^2Y_{2,c})/\eta_c$.

For a unit consisting of consecutive overlapping branch pieces with the same weights and settings, use

\[
 \widetilde x(g)=\bar x+d\bar x_1+\tfrac12d^2\bar x_2.
\]

All sequence modes have $|m|\le K$, real symmetry and exact zero phase. A coefficientwise hull must contain every path coefficient for $|d|\le h$, using a real box containing $[-h,h]$ and a separate box containing $[0,h^2]$. No assertion about the square of an extra rounded rim of the first box is needed. Its guarded polydisc cover provides Lemma 3.1 about every polynomial center in the hull. The proof of the derivative-difference bound uses only a difference from that center, so the same $Z_2$ works at every moving path point. In particular it does not introduce $Z_2$ times the distance traveled from $\bar x$.

### 5.1 Taylor arithmetic and residual

A degree-$P$ jet stores Taylor coefficients $c_k=u^{(k)}/k!$. The exact recurrences are

\[
 (ab)_k=\sum_{j=0}^ka_jb_{k-j},\quad
 r_0=1/a_0,\quad r_k=-r_0\sum_{j=1}^ka_jr_{k-j},
\]
\[
 ke_k=\sum_{j=1}^kja_je_{k-j},\quad
 a_0\ell_k=a_k-\frac1k\sum_{j=1}^{k-1}j\ell_ja_{k-j},
\]
\[
 2s_0s_k=a_k-\sum_{j=1}^{k-1}s_js_{k-j}.
\]

These follow respectively by multiplying power series and by the identities $ar=1$, $e'=a'e$, $a'=a\ell'$, and $s^2=a$. Guarded $a_0$ excludes zero for reciprocals and has positive real part for log and square root. Thus each recurrence computes coefficients of a holomorphic germ. Induction over the expression, with inclusion arithmetic at each operation, proves enclosure of every coefficient. Integer powers use products and reciprocals. First state derivatives carried over jets satisfy the exact product and chain rules, so the same induction proves enclosures for $Df$.

At base point $\xi_0$, the path has coefficients

\[
 (\bar z+\xi_0z_1+\xi_0^2z_2/2,\ z_1+\xi_0z_2,\ z_2/2,\ 0,\ldots),
\]

and the conductance has $(g_c+\xi_0,1,0,\ldots)$. Domain checks over the strip and every real $\xi_0\in[-h,h]$ establish joint holomorphy of the expression in its complex state inputs. Its parameter Taylor coefficients are consequently holomorphic in those inputs and are admissible black boxes for Lemma 2.1.

Let $c_p=(1/p!)\partial_\xi^pG(\cdot;0)$ for $p\le3$, and $c_4(\cdot;\xi)=(1/4!)\partial_\xi^4G(\cdot;\xi)$. Taylor's formula gives

\[
 G(\cdot;d)=\sum_{p=0}^3d^pc_p
 +d^4\int_0^1 4(1-s)^3c_4(\cdot;sd)\,ds.
\]

The averaging weight has mass 1, so coefficient box enclosures and strip bounds of $c_4$ also enclose its integral. The exact derivative polynomial $\omega(d)a(d)=\sum_{p=0}^4d^pl_p$ has

\[
 l_0=\bar\omega\bar a,\quad l_1=\bar\omega\bar a_1+\omega_1\bar a,
\]
\[
 l_2=\bar\omega\bar a_2/2+\omega_1\bar a_1+\omega_2\bar a/2,
 \quad l_3=(\omega_1\bar a_2+\omega_2\bar a_1)/2,
 \quad l_4=\omega_2\bar a_2/4.
\]

Subtracting the nonlinear expansion gives $R_p=(0,(iml_{p,m}-[c_p]_m)_m)$ for $p=1,2,3$, and the same expression with the averaged $c_4$ for $R_4(d)$. Section 3 bounds each $AR_p$, including every omitted Fourier coefficient. Therefore

\[
 Y'=\max_c\frac{Y_{0p,c}+\sum_{p=1}^4h^pY_{p,c}}{\eta_c}
 \ge\sup_g\|AF(\widetilde x(g);g)\|.
\]

### 5.2 Derivative bound and identification

Set $D(d)=DF(\widetilde x(g_c+d);g_c+d)$ and $J(\theta;d)=Df(\widetilde\phi(\theta;d);g_c+d)$. Then

\[
 D(d)=D(0)+dD'(0)+d^2E(d),
\]
\[
 (D'(0)y)_m=im\omega_1y_{a,m}+im\bar a_{1,m}y_\omega-[J_1*y_a]_m,
\]
\[
 (E(d)y)_m=im(\omega_2/2)y_{a,m}+im(\bar a_{2,m}/2)y_\omega-[C(d)*y_a]_m,
\]

with zero phase rows, $J_1=\partial_dJ(\cdot;0)$, and

\[
 C(d)=\int_0^1 2(1-s)\tfrac12\partial_d^2J(\cdot;sd)\,ds.
\]

The coefficient enclosures $[C_{2,n}]$ of $\tfrac12\partial_d^2J$ over the whole parameter box enclose $C(d)_n$, because this averaging weight also has mass 1. Use the finite/tail prescription to bound $AD'(0)$ by $B'$ and $AE(d)$ by $B''$. Tail rows now include the additional diagonal term $|\omega_d|\overline A_1$; they have no frequency column because the polynomial frequency-column profile has no modes beyond $K$. Thus

\[
 Z_{1G}=\max_c\eta_c^{-1}\sum_{c'}\eta_{c'}
 (B_{1,cc'}+hB'_{cc'}+h^2B''_{cc'})
 \ge\sup_g\|I-AD(d)\|.
\]

The finite point compression is bounded by $Z_{1G}$, so $Z_{1G}<1$ proves injectivity as in Lemma 2.2. If

\[
 r\le r_*,\qquad \kappa=Z_{1G}+Z_2r<1,\qquad
 Y'\le(1-\kappa)r,
\]

then $T_g$ maps $B_r(\widetilde x(g))$ into itself and contracts there. Its unique zero is identified with the already glued branch by checking, for every constituent piece,

\[
 \sup_{g\in P_i}\|\widetilde x(g)-\bar x_i\|_{\eta(i)}
 +r\max_c\frac{\eta_c}{\eta_{c,i}}\le r_{{\rm hi},i}.
\]

The supremum uses the complete polynomial on a box containing $P_i-g_c$, not sampled parameter values. The triangle inequality puts the new zero in the old uniqueness ball, so it is $x_*(g)$.

## 6. Hill coefficients for every conductance in a unit

Let $t_j=\eta_jr<R_j$, $\rho_e=\min(\rho_0,\rho_2)$, and

\[
 \epsilon_{W,kl}=\sum_jM_{H,klj}t_j.
\]

Along the quadratic path let $[J_{0,n}]$, $[J_{1,n}]$, $[C_{2,n}]$ and their strip majorants be as above. Choose exact matrices $J_{1c,n},C_{2c,n}$, and entrywise radii $\operatorname{rad}_{1,n}$, $\operatorname{rad}_{2,n}$ bounding their differences from the respective coefficient balls. For the true orbit coefficients $A_n(g)=[Df\circ\phi_*]_n$,

\[
 A_n(g)\in[J_{0,n}]+dJ_{1c,n}+d^2C_{2c,n}
 +\operatorname{ball}(h\operatorname{rad}_{1,n}+h^2\operatorname{rad}_{2,n}
                         +\epsilon_W e^{-\rho_e|n|}),
\]
\[
 |A_n(g)|\le(S_{J0}+hS_{J1}+h^2S_{C2})e^{-\rho|n|}
                 +\epsilon_W e^{-\rho_e|n|}\quad(n\in\mathbb Z),
\]
\[
 |\omega_*(g)-\bar\omega-d\omega_1-d^2\omega_2/2|\le\eta_\omega r.
\]

*Proof.* Taylor expansion gives $J(d)=J_0+dJ_1+d^2C(d)$; subtracting exact centers of the two derivative enclosures gives the two radius terms. Put $w=\phi_* -\widetilde\phi$. Its components have modulus at most $t_j$ on the closed $\rho_0$ strip. The integral of the Hessian on $\widetilde\phi+sw$ gives

\[
 Df(\phi_*;g)-Df(\widetilde\phi;g)
 =\int_0^1D^2f(\widetilde\phi+sw;g)w\,ds,
\]

whose entrywise modulus is at most $\epsilon_W$ on the $\rho_e$ strip. The true profile is known holomorphic only inside its $\rho_0$ strip, so apply Lemma 2.1 first on each closed strip $\rho''<\rho_e$, then let $\rho''\uparrow\rho_e$. This proves the slow exponential bound without assuming extension past the boundary. Adding the path terms proves both coefficient bounds. The frequency estimate is the tube inequality. For an affine piece omit the $C_2$ terms and set $\omega_2=0$; its first derivative is boxed over the entire parameter interval, so $h\operatorname{rad}_1$ encloses the integral derivative variation. □

## 7. The Hill operator, domain and Floquet multiplicities

This part uses a different space:

\[
 X_H=\ell^1(\mathbb Z;\mathbb C^{18}),\quad
 \|P\|=\sum_m|P_m|_1,\quad
 \mathcal D=\{P:\sum_m|m||P_m|_1<\infty\}.
\]

For fixed $g$, define the closed operator

\[
 (H_gP)_m=-i\omega_*(g)mP_m+\sum_n A_n(g)P_{m-n},
 \qquad D(H_g)=\mathcal D.
\]

The convolution is bounded by $\alpha=\sum_n\|A_n\|_{1\to1}<\infty$. The diagonal operator has compact resolvent: its inverse entries $(\mu+i\omega m)^{-1}$ tend to zero and are norm limits of finite truncations. For $\operatorname{Re}\mu>\alpha$, a Neumann series in the bounded convolution gives a compact resolvent for $H_g$. The resolvent identity then gives compact resolvent at every resolvent point. Compact-resolvent spectral theory implies isolated eigenvalues of finite algebraic multiplicity, with Riesz projection rank equal to the sum of those multiplicities inside an isolating contour. This is the same general compact-resolvent theorem proved in the manuscript's Appendix A; the draft does not claim a new proof of that general functional-analysis theorem.

**Lemma 7.1 (multiplicity, $N=1$).** Let $Y'(t)=Df(\phi_*(\omega t);g)Y(t)$, $Y(0)=I$, and $T=2\pi/\omega$. Then

\[
 m(\mu;H_g)=m(e^{\mu T};Y(T)).
\]

*Proof.* On the finite-dimensional generalized eigenspace $G_\mu(H_g)$, the function operator $-\omega\partial_\theta+A(\theta)$ is $\mu+K$ with $K$ nilpotent. For $p$ in that space,

\[
 y(t)=(e^{t(\mu+K)}p)(\omega t)
\]

solves the variational equation by differentiation. Evaluation at zero intertwines $e^{T(\mu+K)}$ and $Y(T)$. It is injective: if $y(0)=0$, then $y(t)=0$. At $t+nT$, periodicity makes this equality a polynomial in $n$ times a nonzero exponential. If $K^{k_*}p$ is the highest nonzero power, the leading polynomial coefficient is $T^{k_*}(K^{k_*}p)(\omega t)/k_*!$, so it vanishes for every $t$, a contradiction. This gives the inequality from Hill multiplicity to monodromy multiplicity.

Conversely, on $W=G_\lambda(Y(T))$, $\lambda=e^{\mu T}$, write $Y(T)=\lambda(I+K)$ and

\[
 B=\mu I+T^{-1}\sum_{j\ge1}(-1)^{j+1}K^j/j,
\]

where the sum is finite by nilpotence. It has $e^{TB}=Y(T)|_W$. The matrix-valued map $\Pi(t)=Y(t)e^{-tB}:W\to\mathbb C^{18}$ is $T$-periodic. Its smooth periodic profiles $p_w(\theta)=\Pi(\theta/\omega)w$ have Fourier sequences in $\mathcal D$. Differentiation gives $H_gp_w=p_{Bw}$, and evaluation at zero is $w$, so this embeds all of $W$ injectively in $G_\mu(H_g)$. The reverse dimension inequality follows. □

Consequently the Hill spectrum is invariant, with multiplicity, under shifts by $i\omega\mathbb Z$; one half-open strip of height $\omega$ contains exactly 18 eigenvalues counted with multiplicity. Differentiating the profile equation gives $H_g(im a_{*,m})_m=0$. This vector is nonzero and belongs to $\mathcal D$, because the profile is nonconstant and analytic. Thus zero is an actual neutral eigenvalue, not an assumed numerical center.

## 8. A uniform finite-window comparison

Use a fixed exact real diagonal cell similarity $S$, with entries powers of two, and replace coefficients by $S^{-1}A_nS$. This preserves $\mathcal D$, spectrum and multiplicities. All matrix 1-norms in what follows use these cell coordinates. Let $W=\{|m|\le K_e\}$, and choose exact affine matrices

\[
 V(d)=V_0+dV_1,\quad V_i(d)=V_{i0}+dV_{i1},\quad
 \Lambda(d)=\Lambda_0+d\Lambda_1
\]

with diagonal $\Lambda$. They are proposals; their floating-point construction is not an assumption of correctness. Window weights are 1, with a constant tail weight $\zeta_T>0$. The norm in these coordinates is

\[
 \|v\|_\zeta=\sum_j|v_j|+\zeta_T\sum_{m\notin W}|v_m|_1.
\]

Let $H_0,H_1,H_2$ be the window matrices of $[J_{0,n}],J_{1c,n},C_{2c,n}$, including diagonals $-im\bar\omega,-im\omega_1,-im\omega_2/2$, respectively. Let $R_b$ contain the coefficient remainder from Section 6 in every block $(w,w')$, plus $|w|\eta_\omega r$ on its diagonal. Then the true window is

\[
 H_{WW}(g)=H'_0+dH_1+d^2H_2+E,\quad H'_0\in H_0,\quad |E|\le R_b.
\]

Define

\[
 c_j=\|(V_{i0}V_0-I)e_j\|_1
 +h\|(V_{i0}V_1+V_{i1}V_0)e_j\|_1
 +h^2\|V_{i1}V_1e_j\|_1,\quad q_C=\max_jc_j,
\]

and the coefficient matrices

\[
 W_0=V_{i0}H_0V_0-\Lambda_0,
\]
\[
 W_1=V_{i1}H_0V_0+V_{i0}(H_1V_0+H_0V_1)-\Lambda_1,
\]
\[
 W_2=V_{i1}(H_1V_0+H_0V_1)+V_{i0}(H_1V_1+H_2V_0),
\]
\[
 W_3=V_{i1}(H_1V_1+H_2V_0)+V_{i0}H_2V_1,
 \qquad W_4=V_{i1}H_2V_1.
\]

Put $V_b=|V_0|+h|V_1|$, $V_{ib}=|V_{i0}|+h|V_{i1}|$, and

\[
 w_j=\sum_{k=0}^4h^k\|W_ke_j\|_1+\|V_{ib}R_bV_be_j\|_1.
\]

If $q_C<1$, then $V(d)$ is invertible and the true finite defect $F_m=V(d)^{-1}H_{WW}(g)V(d)-\Lambda(d)$ satisfies

\[
 f_j:=\|F_me_j\|_1
 \le f_j^U=\frac{w_j+(|\lambda_{0j}|+h|\lambda_{1j}|)c_j}{1-q_C},
\]
\[
 \beta_{wl}:=\|V(d)^{-1}e_{wl}\|_1
 \le\beta^U_{wl}=\|V_{ib}e_{wl}\|_1/(1-q_C).
\]

*Proof.* Expanding the products gives the five $W_k$, and bounding the remaining product by absolute matrices gives $w_j$. For $C=I-V_iV$, its column norms are at most $c_j$; hence $I-C$ is invertible and so are the square matrices $V_i,V$. Since $V^{-1}=(I-C)^{-1}V_i$,

\[
 F_m=(I-C)^{-1}(V_iH_{WW}V-\Lambda+C\Lambda).
\]

The Neumann norm bound $\|(I-C)^{-1}\|\le(1-q_C)^{-1}$ proves the two inequalities. If $\Gamma$ is a fixed rectangle boundary, its distance function is 1-Lipschitz, so

\[
 \operatorname{dist}(\lambda_j(d),\Gamma)
 \ge d_j^U:=\operatorname{dist}(\lambda_{0j},\Gamma)-h|\lambda_{1j}|.
\]

When every $d_j^U>0$, no affine diagonal path crosses the boundary, and its inside count is constant. □

## 9. Infinite tail, coupling bounds and the Schur count

Let $B_0$ be a fixed exact real cell matrix and, for the actual frequency, put $B_m=-i\omega mI+B_0$ in the tail. The comparison operator is $D=\Lambda(d)\oplus(B_m)_{m\notin W}$. Its domain is precisely $\mathcal D$, because

\[
 (\omega|m|-\|B_0\|)|v_m|_1\le|B_mv_m|_1
 \le(\omega|m|+\|B_0\|)|v_m|_1.
\]

Let $\mathcal V$ equal $V(d)$ on the finite window and the identity on the tail. It and its inverse preserve this domain. The difference $E=\mathcal V^{-1}H_g\mathcal V-D$ is bounded, with blocks $F_m,V^{-1}H_{WT},H_{TW}V,H_{TT}-D_T$. Crucially the actual $-i\omega m$ cancels in the tail difference. An uncertain frequency times $m$ is never moved into a bounded tail perturbation.

From Section 6 obtain balls $[A_n]^U$ and an all-index majorant $|A_n|\le s_1q_1^{|n|}+s_2q_2^{|n|}$, $q_i<1$. Define

\[
 G(k)=2\sum_{i=1}^2s_iq_i^k/(1-q_i),\quad
 \theta_c=\sum_{0<|n|\le n_A}\|[A_n]^U\|+G(n_A+1)
             +\|[A_0]^U-B_0\|.
\]

The tail-to-tail operator norm is at most $\theta_c$ by convolution. For each window mode let

\[
 t_w=\sum_{\substack{|n|\le n_A\\|w+n|>K_e}}\|[A_n]^U\|+G(n_A+1),
 \qquad r_j^U=\zeta_T\sum_wt_w|(V_b)_{w,j}|_1.
\]

These bound each window-to-tail output column. For tail input mode $m$,

\[
 b_m^U=\max_k\zeta_T^{-1}\sum_{w,l}\beta_{wl}^U
                                      |[A_{w-m}]^U_{lk}|.
\]

Use the analytic entrywise majorant where an index is outside the coefficient enclosure range. Evaluate $K_e<|m|\le K_e+n_c$ in both signs. For farther inputs all $w-m$ have one sign and modulus at least $|m|-K_e$, so

\[
 b_m\le\frac{\beta_{\max}^U}{\zeta_T}\frac{G(|m|-K_e)}2
 \le\frac{\beta_{\max}^U}{\zeta_T}\frac{G(n_c+1)}2.
\]

Taking the maximum of the near values and this far bound gives $\widehat b\ge\|E_{WT}\|$. All these estimates follow by summing absolute column entries; the factor $1/2$ removes the unused sign of the geometric tail. They require the majorant at every index used in the far estimate.

Choose $Omega=(-\delta,R_0)\times(a,b)$, with positively oriented boundary $\Gamma$, satisfying

\[
 \delta>0,\quad R_0>\alpha^U,
 \quad a<0<b,\quad b-a\ge\omega_{\rm hi},
 \quad b<\omega_{\rm lo},\quad -a<\omega_{\rm lo}.
\]

Here $\alpha^U$ is the sum of all coefficient norm bounds, including their omitted tail. Put $h_\Gamma=\max(|a|,|b|)$, $g_0=\omega_{\rm lo}(K_e+1)-h_\Gamma$, and choose $\epsilon>0$. For each $\mu$ in the open neighborhood

\[
 -\delta-\epsilon<\operatorname{Re}\mu<R_0+\epsilon,
 \quad |\operatorname{Im}\mu|<h_\Gamma+\epsilon,
\]

and tail $m$, either $z=\mu+i\omega m$ or its conjugate has real part at least $-\delta-\epsilon$ and imaginary part at least $g_0-\epsilon$. Since $B_0$ is real, conjugation preserves its resolvent 1-norm. Choose an exact invertible $U$ and exact diagonal $\Lambda_T$; certify their inverses and put $F_T=U^{-1}B_0U-\Lambda_T$. If

\[
 \gamma=\min_l\max\{-\delta-\epsilon-\operatorname{Re}\lambda_{T,l},
                         g_0-\epsilon-|\operatorname{Im}\lambda_{T,l}|\}
 >\|F_T\|,
\]

then every tail block is invertible throughout that neighborhood, with

\[
 \|(\mu-B_m)^{-1}\|\le
 \rho_T:=\frac{\|U\|\|U^{-1}\|}{\gamma-\|F_T\|}.
\]

Indeed each diagonal distance is at least $\gamma$, and the Neumann series for $z-\Lambda_T-F_T$ gives the bound after conjugating by $U$. For fixed $\mu$, the simpler Neumann bound $1/(|\mu+i\omega m|-\|B_0\|)$ tends to zero. The direct-sum inverse therefore is compact. It maps into $\mathcal D$, since $B_m(\mu-B_m)^{-1}=\mu(\mu-B_m)^{-1}-I$ is bounded and the displayed domain estimate applies. The tail resolvent is holomorphic on an open neighborhood of $\overline\Omega$; its contour integral vanishes. Hence $D$'s Riesz rank in $\Omega$ is exactly the number of its finite diagonal entries there.

**Lemma 9.1 (Schur homotopy certificate).** Suppose $q_C<1$, all $d_j^U>0$, exactly one $\lambda_{0j}$ lies in $\Omega$, and

\[
 \theta_T=\theta_c\rho_T<1,\qquad
 f_j^U+\frac{\widehat b\rho_T r_j^U}{1-\theta_T}<d_j^U
 \quad\hbox{for every window column }j.
\]

Then $H_g$ has exactly one eigenvalue in $\Omega$, counted algebraically, and

\[
 \operatorname{spec}H_g\cap\{\operatorname{Re}\mu\ge-\delta\}
 =i\omega\mathbb Z,
\]

each such eigenvalue being algebraically simple.

*Proof.* For each $s\in[0,1]$, the tail block of $\mu-D-sE$ is invertible by a Neumann series, with inverse norm at most $\rho_T/(1-\theta_T)$. Its finite Schur complement is

\[
 \mu-\Lambda-sF_m-s^2E_{WT}(\mu-D_T-sE_{TT})^{-1}E_{TW}.
\]

Column $j$ of the subtracted perturbation has norm at most $f_j^U+\widehat b\rho_Tr_j^U/(1-\theta_T)$. Dividing by the diagonal $\mu-\Lambda$ gives norm below 1 on $\Gamma$. The Schur complement is invertible. The usual triangular factorization is valid on the domain: its lower factor maps the finite window into $\mathcal D$ through the tail inverse, and its upper factor is bounded on the tail into the finite window. Thus $\Gamma$ is in the resolvent of every $D+sE$. These operators have compact resolvent; their contour projections are norm continuous by the resolvent identity. Projections within norm distance less than 1 have equal finite rank: either projection restricts injectively from the other range, since a nonzero vector in its kernel would have norm strictly less than itself. Partitioning $[0,1]$ into such neighborhoods keeps the rank constant. Its initial rank is the finite inside count, one. Similarity transfers this count to $H_g$.

The actual neutral vector from Section 7 lies at zero inside $\Omega$, so it exhausts that count and is algebraically simple. Any eigenvalue with real part at least $-\delta$ has real part below $R_0$ by the half-plane Neumann estimate of Section 7. Shift it by an integer multiple of $i\omega$ into the closed interval $[a,b]$, possible because its length is at least $\omega$. No shifted eigenvalue can lie on $\Gamma$, which is resolvent. It is therefore inside $\Omega$, and must be zero. Conversely every shift of the actual neutral eigenvalue exists with the same multiplicity by Lemma 7.1. □

All quantities in this proof were bounded on the whole parameter interval. At each fixed $g$, the same inequalities apply with its own $V(d),\Lambda(d)$, true frequency, and true coefficients. No continuity assertion for parameter-dependent Riesz projections is needed: only the $s$-homotopy for that fixed $g$. Thus Lemma 9.1 holds for every conductance of the unit. This proves the spectral part of D(b) using Lemma 7.1 and $T(g)\ge2\pi/\omega_{\rm hi}$.

## 10. Local orbital stability and asymptotic phase

Fix a conductance with the preceding certificate, and a point $z_*$ on its orbit. The vector field there is nonzero: otherwise uniqueness for the ODE would make the entire orbit constant. On the transverse affine section $\Sigma=\{z:\langle f(z_*),z-z_*\rangle=0\}$, the implicit function theorem supplies a smooth return time $\tau(z)$ near $T$ and a return map $P$. Its derivative is the projection of $Y(T)$ onto the section along the flow direction. In the splitting into flow direction and section, $Y(T)$ has triangular diagonal blocks 1 and $DP(z_*)$. Hence the return derivative has all 17 stable multipliers and spectral radius below $e^{-\delta T}$.

For $0<\delta'<\delta$, choose a norm on the section and a contraction factor $q$ satisfying

\[
 r(DP(z_*))<q<e^{-\delta'T}.
\]

Such a norm is obtained by scaling each Jordan chain so its off-diagonal entries are arbitrarily small. Continuity of $DP$ then bounds its norm by $q$ on a sufficiently small convex section ball, and the mean value inequality gives $|P^kz-z_*|\le q^k|z-z_*|$. An initial point close to the orbit reaches that section within a bounded time, at a point whose distance to $z_*$ is bounded by a constant times its initial orbital distance; this follows from a finite flow interval and the smooth return-time function.

If $z_k$ are successive section intersections at times $t_k$, smoothness of $\tau$ gives $|\tau(z_k)-T|\le Cq^k\operatorname{dist}(z_0,\mathcal O)$. The sum converges, so $t_k-kT\to\sigma_\infty$, with error at most $C'q^k\operatorname{dist}(z_0,\mathcal O)$. Set phase $\sigma=-\sigma_\infty$. At each section return both the perturbed orbit and $z_*(t_k+\sigma)$ are within $C''q^k\operatorname{dist}(z_0,\mathcal O)$ of $z_*$. Gronwall's inequality on the bounded intervals between returns propagates this estimate to every later time. Since $t_k=kT+O(1)$, $q^k\le C'''e^{-\delta't}$ on each such interval. On the initial bounded interval, smooth dependence on initial data and the fact that the limiting phase differs from the nearby orbit's initial phase by $O(\operatorname{dist}(z_0,\mathcal O))$ give the same estimate after increasing the constant. This proves the local stability assertion of D(b). It does not compute the section size, Jordan norm or nonlinear constants.

## 11. Numerical inputs, admission gates and remaining integration work

Historical settings are context for reproduction, not a statement that a new numerical certificate passed. The branch used $K=12$, 57 center groups and 712 pieces on the exact interval $[0.027499735464,0.02778996093]$, with $\rho_0=1/4$, coefficient strip $\rho=3/2$, Hessian strip $\rho_2=1$, $L=16$, $K'=2K+L=40$, and 128 Fourier nodes. The exact per-piece weights, centers, polydisc radii, validity radii, precision and cover settings are inputs from the historical log and are not inferred from these defaults. Quadratic stability groups used historical $r_*=2^{-20}$ and polydisc factor 256; the admitted unit's logged settings must be used, including any changed window width or cover settings. There is no assertion here that every unit has one common spectral margin or that the number of fresh units equals 127.

Before a numerical Theorem D is written, require all of the following:

1. A complete immutable final branch log, containing actual fresh proofs of every required piece, bound to the import-time proof source snapshot and the exact historical centers, settings and weights. Parse and hash the same bytes. Refuse missing, duplicate, stale or incomplete records.
2. Collection must recompute every adjacent gluing inequality, require strictly increasing endpoints and the complete interval, and bind the final branch record to the exact final log and centers. A completed computation or a copied Boolean is not an admission proof.
3. Every stability unit must be a real proof with current source hashes, a digest of each exact branch piece it uses, exact interval and weights, and full polynomial identification on all its pieces. Piece reruns must use the admitted logged settings. Coverage must be checked as actual overlapping intervals; numerical proximity is not overlap.
4. A complete stability collection must cover the admitted branch interval with matching source and branch hashes. Historical logs and accepted 1.0.0 publication files remain immutable. Partial pilots and historical successful records cannot establish the final all-conductance assertion.
5. Independent review must check both the mathematical argument and the exact final record predicates. The final theorem constants, periods, margins, multiplier upper bounds, tables and figures must be read from accepted records with outward rounding.

Remaining manuscript work is explicit: insert final record names and exact numerical constants only after these gates; match this section's notation to the existing manuscript; add theorem and lemma cross-references; expand the invocation of Appendix A with its exact theorem label; and review this candidate against the admitted source line by line. The finite/tail prescription above is mathematically specified, but a typeset implementation-level account should also show the component-index conventions used by `operator_blocks` and `assemble` before integration. This draft does not modify any proof source, lemma source, released manuscript or accepted publication record.
