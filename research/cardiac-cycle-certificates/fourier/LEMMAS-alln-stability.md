# Conditional finite reduction and nonlinear argument for all-ring/cable stability

Research preparation, 2026-10-03. This is a proposed extension, not an
accepted theorem or a modification of published1.1.0. The quantitative
Hopf bridge takes priority. The bounds below need new source-bound witnesses
for the existing all-$N$ existence family. No stability flag, float eigenvalue,
or conditional rational gate supplies those witnesses.

## 1. Fixed-circumference problem

In the same scaled TP06 coordinates as alln.py, fix $G_{Ks}=0.0275$ and
$D=1/64000$. For $\varepsilon\in[0,1/64]$ put
\[
d_k(\varepsilon)=4\pi^2Dk^2
\left(\frac{\sin(\pi k\sqrt{\varepsilon})}
{\pi k\sqrt{\varepsilon}}\right)^2,\qquad d_k(0)=4\pi^2Dk^2.
\]
The quotient uses its entire power series. At $\varepsilon=1/N^2$,
$d_k=4N^2D\sin^2(\pi k/N)$ and $c=N^2D$. Circumference stays one;
the first nonzero diffusion eigenvalue tends to $4\pi^2D$, so there is no
automatic vanishing physical diffusion gap.

Let $\phi_\varepsilon,\omega_\varepsilon$ be the existing analytic wave family
and $A_\varepsilon(\theta)=Df(\phi_\varepsilon(\theta))$. For the cable
$u_t=DEu_{xx}+f(u)$ on $\mathbb R/\mathbb Z$, the wave is
$u_*(x,t)=\phi_0(\omega_0t+2\pi x)$, with voltage projection
$E=\operatorname{diag}(1,0,\ldots,0)$.
In moving coordinates $\theta=\omega_0t+2\pi x$ the wave is an equilibrium,
and its linearized generator is
\[
L_0=-\omega_0\partial_\theta+4\pi^2DE\partial_\theta^2+A_0(\theta).
\]
The period $T_0=2\pi/\omega_0$ corresponds to one full rotation of the circle.

Conditional target: every $N\ge8$ has a simple neutral phase multiplier,
with all others bounded by $e^{-\delta T_{1/N^2}}$ for a common certified
$\delta>0$; the cable is locally exponentially orbitally stable in a
specified periodic Sobolev space. A common nonlinear attraction constant
and neighborhood over every $N$ require extra uniform operator bounds
specified below. A common spectral gap alone does not imply them.

## 2. Operators, domains and the singular parameter endpoint

For certificates use $X=\ell^1(\mathbb Z;\mathbb C^{18})$ with one fixed
weighted cell norm. For $A(\theta)=\sum_nA_ne^{in\theta}$ define
\[
(H_{\varepsilon,q}P)_m=-i\omega_\varepsilon mP_m
-d_{m+q}(\varepsilon)EP_m+\sum_nA_{\varepsilon,n}P_{m-n}.
\]
Use the maximal diagonal domain
\[
{\cal D}_{\varepsilon,q}=\left\{P\in X:
\sum_m\|(-i\omega_\varepsilon mI-d_{m+q}(\varepsilon)E)P_m\|<\infty\right\}.
\]
For each finite ring it is equivalent to summability of the first derivative.
For the cable, voltage needs a summable second derivative too. Thus the
generator difference across $\varepsilon=0$ is not a bounded perturbation.

**Lemma1, uniform diagonal tail.** The diagonal operator generates the
contraction semigroup
$P_m\mapsto e^{-i\omega_\varepsilon mt}e^{-td_{m+q}E}P_m$.
If $\omega_\varepsilon\ge\omega_->0$, $|\Im\lambda|\le b$, and
$|m|>M$ with $\omega_-(M+1)>b$, then
\[
\|(\lambda+i\omega_\varepsilon mI+d_{m+q}E)^{-1}\|
\le(\omega_-|m|-b)^{-1}.
\]

*Proof.* Strong continuity follows by finite-sequence approximation and the
contraction bound. Each diagonal scalar has modulus at least
$|\Im\lambda+\omega_\varepsilon m|\ge\omega_-|m|-b$, including voltage.
The tail of the diagonal inverse tends to zero, so its resolvent is compact.
Convolution by $A$ is bounded with norm at most $\alpha=\sum_n\|A_n\|$.
Bounded perturbation and variation of constants give generation and
$\|e^{tH}\|\le e^{\alpha t}$. For $\Re\lambda>\alpha$ the diagonal
resolvent/convolution Neumann series converges and gives compact resolvent
for $H$. No term $4N^2D$ is needed in this right spectral bound, since
diffusion remains in the dissipative diagonal. $\square$

Given uniform bounds and continuity for $\omega_\varepsilon,A_\varepsilon$,
diagonal resolvents are norm-continuous at a common point to the right:
finite modes are continuous in $\varepsilon$ and the tail is uniformly
$O(1/M)$. The bounded-convolution Neumann series then gives norm-resolvent
continuity of $H_{\varepsilon,q}$ for each fixed $q$, including zero.
This is not operator-norm continuity of the generators.

## 3. Folding, redundancy and phase counting

Use centered ring representatives
$Q_N=\{-\lfloor N/2\rfloor,\ldots,\lfloor(N-1)/2\rfloor\}$.
In particular, the even Nyquist representative is negative only.
For $(U_qR)_m=R_{m+q}$, direct calculation on the maximal domains gives
\[
H_{\varepsilon,q}U_q=U_qH_{\varepsilon,0}
+i\omega_\varepsilon q\,U_q.
\]
The shift is bounded and invertible on $X$, so algebraic multiplicity is
preserved. Ring damping also gives $H_{\varepsilon,q+N}=H_{\varepsilon,q}$.
The existing finite-ring monodromy correspondence in LEMMAS-stability.md
identifies one half-open basic strip
$-\omega_\varepsilon/2\le\Im\lambda<\omega_\varepsilon/2$ for each $q\in Q_N$
with the complete ring multiplier spectrum. Equivalently use one height
$N\omega_\varepsilon$ strip for $H_{\varepsilon,0}$. These are not independent
copies each assumed to contain18 eigenvalues.

For the cable, all $q\in\mathbb Z$ describe imaginary translates of the
same moving-frame generator, rather than physically distinct independent
generators. Every generator eigenvalue $\mu$ has some shift
$\mu+i\omega_0q$ in a basic strip of $H_{0,q}$. The full set of strips is
therefore necessary for a finite reduction of its unbounded imaginary axis.
The semigroup step below remains necessary to pass from point spectrum to
the complete period-map spectrum.

Differentiating the profile equation gives
$H_{\varepsilon,0}\phi_\varepsilon'=0$, with nonzero derivative by the
certified first voltage coefficient. The required count is one eigenvalue
with algebraic multiplicity in the right basic strip for $q=0$, and zero
for every other eligible sector. Contour edges, including folding boundaries,
must be invertible. Counting only strictly positive exponents would not
exclude an additional neutral direction or a Jordan chain.

## 4. High spatial sectors from the17-state block

In the same fixed cell weights split
\[
A_\varepsilon=
\begin{pmatrix}a_\varepsilon&b_\varepsilon\\c_\varepsilon&C_\varepsilon\end{pmatrix},
\quad W_\varepsilon=-\omega_\varepsilon\partial_\theta+C_\varepsilon.
\]
Obtain uniform convolution bounds
$\alpha_v=\sum_n|a_n|$,
$\beta_{vw}=\sum_n\|b_n\|$,
$\beta_{wv}=\sum_n\|c_n\|$.
The central new gate is a proved bound
\[
\|(\lambda-W_\varepsilon)^{-1}\|_X\le\rho_w
\quad(\Re\lambda\ge-\delta,\ |\Im\lambda|\le b).
\]
This is the periodic prescribed-voltage17-state operator, not a constant
Jacobian at one phase. A separate Fourier finite/tail proof or a quantitative
Floquet proof in the appropriate norm must establish it.

There is a practical structural reduction in the exact model. With voltage
prescribed, the11 gates $X_{r1},X_{r2},X_s,m,h,j,d,f,f_2,s,r$ each have an
independent scalar equation $\dot g=-g/\tau_g(V)+g_\infty(V)/\tau_g(V)$.
The remaining states are $(f_{Cass},R',Ca_i,Ca_{sr},Ca_{ss},Na_i)$.
In this reordered17-state Jacobian the upper-right block is exactly zero
and the11-state upper-left block is diagonal. If the actual wave enclosure
proves $1/\tau_g(V)\ge a_->0$, each scalar Floquet exponent is
$-T^{-1}\int_0^T1/\tau_g(V(t))\,dt\le-a_-$.
The nontrivial Floquet count can therefore be reduced to the6-state
diagonal block, while the lower-left coupling must still enter any
resolvent/semigroup norm. For block inverses it contributes
$R_6 B_{6,11}R_{11}$, not zero. A sufficient norm majorant is
$\max\{\rho_{11},\rho_6(1+\|B_{6,11}\|\rho_{11})\}$ in the maximum
product norm. The scalar Fourier-space inverse norms and Sobolev evolution
constants still need their own bounds; negative scalar averages alone
do not provide those quantitative constants. This could make a real
count0 computation smaller, without discarding any of the17 directions.

**Lemma2, centered damping.** For centered ring $q$ and $|m|\le M$,
\[
d_{m+q}(1/N^2)\ge16D\max(0,|q|-M)^2.
\]
The cable satisfies the same lower bound.

*Proof.* Distance to $N\mathbb Z$ is1-Lipschitz, equals $|q|$ at centered
$q$, and lies in $[0,N/2]$. Hence
$r=\operatorname{dist}(q+m,N\mathbb Z)\ge\max(0,|q|-M)$.
Concavity gives $\sin(\pi r/N)\ge2r/N$. Substitute into the damping formula.
For the cable use $|q+m|\ge|q|-M$ and $4\pi^2\ge16$. $\square$

**Lemma3, complete high-sector exclusion.** Choose $M\ge0$, $Q>M$, and set
\[
g=\omega_-(M+1)-b,\quad L_Q=16D(Q-M)^2,\quad
B=\alpha_v+\beta_{vw}\rho_w\beta_{wv}.
\]
If $g>B$ and $L_Q>\delta+B$, every eligible ring sector and cable sector
with $|q|\ge Q$ has an invertible operator $\lambda-H_{\varepsilon,q}$
throughout $\Re\lambda\ge-\delta$, $|\Im\lambda|\le b$.

*Proof.* For voltage low temporal modes, the real denominator is at least
$L_Q-\delta$; for high modes Lemma1 gives $g$. The diagonal voltage inverse
is therefore bounded by $r_0=\max\{(L_Q-\delta)^{-1},g^{-1}\}$ and $r_0B<1$.
Adding $a$ by a Neumann series gives
$r_v\le r_0/(1-\alpha_vr_0)$.
Eliminate $w=(\lambda-W)^{-1}(cv+f_w)$ from the block equations.
The voltage feedback norm is at most
$r_v\beta_{vw}\rho_w\beta_{wv}<1$, because $r_0B<1$.
A second Neumann series solves for $v$, then $w$.
The inverses map into the maximal domains, so this is a closed-operator
inverse, not a formal Fourier calculation. Both signs of $q$ are covered.
$\square$

A slow or badly conditioned prescribed-voltage block can force enormous
$M,Q$. If that block is unstable, this reduction fails and cable high-mode
stability may itself fail. Increasing voltage diffusion must not be assumed
to stabilize all other state directions.

## 5. Finite remaining counts and analytic bounds

For each $|q|<Q$, prove the count from Section3 over all eligible parameters.
For $q\ne0$, physical eligibility implies $N\ge2|q|$, so the safe continuous
enlargement is $\varepsilon\in[0,\min(1/64,1/(4q^2))]$.
It includes an unused positive Nyquist endpoint and may be overly strong.
If a continuous interval fails, split off finitely many small rings and
certify a shorter interval near zero for the rest. The cable endpoint must
remain covered. Noninteger lattice parameters are proof auxiliaries only.

Proposed exact certificate steps:

1. Bind current existence-piece centers, radii, weights, sources, settings
   and all inputs. Enclose the actual frequency and profile.
2. Enclose the holomorphic Jacobian on $|\Im\theta|\le s$ in the model's
   analytic domain. If its norm is at most $S_A$, Cauchy gives
   $\|A_n\|\le S_Ae^{-s|n|}$ and explicit geometric tail sums.
3. For $M_c$ trapezoid nodes and $|n|<M_c/2$, the full signed alias sum gives
   \[
   \|\widehat A_n-A_n\|\le
   S_A\frac{e^{-s(M_c-|n|)}+e^{-s(M_c+|n|)}}{1-e^{-sM_c}}.
   \]
   Indeed the aliases are $A_{n+\ell M_c}$ for nonzero signed $\ell$;
   sum the two geometric series. Add separate nodewise, profile and model
   interval errors.
4. Keep frequency and diffusion inside the diagonal inverse. Frequency
   error times $m$ is not a bounded-generator error. Finite modes use exact
   entire damping enclosures; tails use Lemma1, without a diffusion upper bound.
5. A right edge beyond $\alpha=\sum_n\|A_n\|$ is automatically resolvent.
   On the remaining bounded contour use complete signed tail couplings,
   Schur inverses, rigorous homotopy errors and argument-principle counts.
   Parameter cells cover the entire eligible interval. Choose actual contour
   height $\omega_\varepsilon/2$ with interval treatment of its motion;
   $b=\omega_+/2$ can majorize those contours in Lemma3.
6. Preserve exact Jacobian coefficient enclosures, finite inverses,
   coupling/contour majorants, partitions and winding witnesses. Successful
   flags without those quantities are not a reproof.

Existing finite-ring windows and contour height grow with $N$; simply
putting $N=\infty$ in that program does not perform this reduction.

## 6. Separate cable semigroup argument

Use $H^s(\mathbb T;\mathbb R^{18})$, $s>1/2$, in a local neighborhood inside
the model domain. It is a Banach algebra and analytic $f$ is a locally
$C^2$ Nemytskii map. The moving-frame linear generator domain is voltage
$H^{s+2}$ and the other coordinates $H^{s+1}$.
Point eigenfunctions satisfy a first-order periodic ODE in $(v,v',w)$:
solve voltage for $v''$ and the other equations for $w'$ using $\omega_0>0$.
Analytic coefficients imply analytic eigenfunctions. The Jordan-chain
inhomogeneous equations have analytic forcing inductively. Thus eigenvalues
and algebraic multiplicities agree with the Fourier certificate space.

Nonzero transport yields compact resolvent, but the17 transport coordinates
prevent automatic compactness or analyticity of the full semigroup.
Require an additional prescribed-voltage semigroup gate
\[
\|e^{tW_0}\|_{H^s}\le M_we^{-\gamma_wt},\qquad\gamma_w>\delta.
\]
A quantitative stable Floquet fundamental matrix for the periodic17-state
ODE, including phase derivatives needed for the chosen $H^s$ norm, can
supply it. The Fourier inverse majorant alone is not silently treated as
this semigroup bound.

**Lemma4, quasi-compact period map.** Under this gate, $S(T_0)=e^{T_0L_0}$
differs from $\operatorname{diag}(0,e^{T_0W_0})$ by a compact operator,
and its essential spectral radius is at most $e^{-\gamma_wT_0}$.

*Proof.* Split diagonal blocks into voltage heat-transport with bounded $a$
and transport with bounded $C$. Positive-time voltage heat is compact by
its Fourier factors, and bounded perturbations preserve this by Duhamel
iteration. Expand the full semigroup in the norm-convergent Dyson series
for the bounded off-diagonal multiplications $b,c$. Every positive-order
term visits voltage, with a positive heat interval except on simplex
boundary sets of measure zero. Restrict heat intervals to be at least $h>0$.
Then the integrands and their integrals are compact; strong continuity of
the semigroups and their adjoints on the Hilbert space yields norm continuity
on either side of a compact factor. The removed simplex region has measure
tending to zero and uniformly bounded integrand, so its integral tends to
zero in norm. Each positive-order term is compact, as is the zero-order
voltage block. Norm summation proves compactness of the difference.
Compact perturbations preserve essential radius, and the power bound
$\|e^{nT_0W_0}\|\le M_we^{-\gamma_wnT_0}$ gives the claimed radius by
the spectral-radius formula. $\square$

**Lemma5, complete period-map spectrum.** If the finite reduction proves
exactly one simple generator eigenvalue0 in $\Re\mu\ge-\delta$, every
non-phase multiplier has modulus below $e^{-\delta T_0}$.

*Proof.* Outside the essential disk, a period-map spectral point has a
finite Riesz space. Since all $S(t)$ commute with $S(T_0)$ and its resolvent,
this space is invariant under the entire semigroup. The restriction is
a finite-dimensional continuous semigroup $e^{tB}$. Its space is in the
generator domain: for small $h$, $\int_0^hS(t)\,dt$ is invertible there,
and on the full space its range lies in the generator domain. Thus $B$
is the restricted generator, and the multiplier is $e^{T_0\mu}$ for an
actual generator eigenvalue. Section3 folds each such $\mu$ into a
sector counted in Sections4-5. Only phase0 remains in the indicated
half-plane. Exponentiation preserves a nontrivial nilpotent Jordan block,
so generator simplicity gives multiplier simplicity too. The essential
disk is strictly smaller because $\gamma_w>\delta$. $\square$

## 7. Nonlinear decay and the uniform-$N$ distinction

Bounded-semigroup variation of constants and the local Banach-algebra
model-domain gate provide a local $C^2$ mild flow on $H^s$. Use its
**fixed-time** map $F$ at $T_0$, rather than a variable-return-time map,
which can require time differentiation of rough transport data.
The translate curve $U_\alpha=\phi_0(\cdot+\alpha)$ consists of equilibria.

Let $P_\alpha$ be the simple phase Riesz projection of $DF(U_\alpha)$.
Bounded smooth coefficient perturbations make $P_\alpha$ smooth on a local
phase arc and allow smooth trivialization of its stable complements.
At one phase choose $\kappa<1$ larger than the stable spectral radius and
give that complement the equivalent norm
$\|w\|_*=\sup_{n\ge0}\kappa^{-n}\|B^nw\|$.
This is finite by the spectral-radius formula and makes the stable
one-step operator contract by $\kappa$. Shrink the arc and tube so
continuity gives a common stable contraction $\kappa'<1$. In local
coordinates the fixed-time map has
\[
\alpha^+=\alpha+g_\alpha(w),\quad
w^+=B_\alpha w+h_\alpha(w),\quad
|g_\alpha(w)|+\|h_\alpha(w)\|\le C\|w\|^2.
\]
There is no linear phase term because the tangent is fixed and the chosen
complement is invariant under the derivative. Therefore
$\|w_n\|\le(\kappa')^n\|w_0\|$, phase increments are summable, and
$\alpha_n$ converges exponentially to $\alpha_\infty$.
Local uniform Lipschitz bounds of the flow on $[0,T_0]$ interpolate
these iterates, giving exponential convergence to the translated wave.
This proves local orbital stability conditionally on the instantiated
linear and nonlinear gates, not just on observed spectral negativity.

For each finite ring, a complete simple-phase Floquet proof gives ordinary
smooth-ODE local orbital stability. Uniform nonlinear constants over all
$N$ additionally require uniform stable period-map power bounds, phase
projections, coordinate changes and flow derivative bounds. Eigenvector
conditioning and transient growth are not bounded by a shared spectral gap.
The normalized discrete spatial DFT Wiener norm is one promising common
setting: cyclic convolution has algebra constant1 independently of $N$,
and diffusion is contractive. Those facts do not yet prove a common stable
power bound or attraction radius.

## 8. Admission prerequisites and pilot scope

Pending prerequisites: current existence-source/input binding; uniform
frequency and analytic Jacobian bounds; prescribed-voltage inverse and
cable semigroup gates; both-sign strict high-sector exclusion; complete
low-sector parameter coverage with actual winding witnesses; simple phase;
instantiated Sobolev/model-domain hypotheses; and additional uniform
projection/power/local-flow bounds if common nonlinear constants are sought.

The planning CLI checks only externally supplied rational majorants and
always returns certified:false. The pilot refines an existing dyadic
existence seed at $\varepsilon=0$ using the float reference model, FFT and
LAPACK. It records source/input hashes, settings, finite residual and
runtime and refuses output overwrite. It does not bound coefficient aliasing,
profile error or rounding and does not certify spectral counts.

Actual first pilot: two windows $K=12,24$, 8.89 seconds, sampled peak
aggregate RSS102.55MiB, finite residual approximately $7.2\cdot10^{-15}$.
The prescribed-voltage rightmost basic-strip eigenvalue was approximately
$-6.9618659\cdot10^{-5}\ {\rm ms}^{-1}$ at both windows. Cable $q=1$
gave approximately $-9.3946859\cdot10^{-6}-1.1516622\cdot10^{-5}i$;
$q=4,16$ remained negative, and $q=0$ displayed the expected numerical
phase value near zero. These are untrusted feasibility observations,
including possible finite-truncation spectral pollution, not certificates.
The recorded output and supervisor receipt are in the private scratch
directory; original existence and publication records were not modified.

Compact resolvent alone does not imply equality of spectral and growth
bounds. Whole-line fully parabolic periodic-wave results, such as
[Johnson and Zumbrun, arXiv:1004.0909](https://arxiv.org/abs/1004.0909),
address a different spatial domain and diffusion structure and cannot
replace the voltage-only fixed-circle gates above. No novelty or
first-proof claim is made.
