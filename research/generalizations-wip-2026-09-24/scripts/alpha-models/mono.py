# m(rho) = min over psi of P(rho e^{i psi}) on the ordered domain R (r2=rho < r3=1 < r1), psi in (acos(rho/2), pi).
# Double precision for rho in [1e-3, 0.999]; check strict increase and m > B.
import numpy as np
def P_R(rho, psi, beta):
    w = rho*np.exp(1j*psi)
    r1 = np.abs(w-1); r2 = rho; r3 = 1.0
    c = lambda x: 1/np.tanh(beta*x)
    S = r1**2*c(np.log(r3/r2)) + r2**2*c(np.log(r1/r3)) + r3**2*c(np.log(r2/r1))
    A = rho*np.sin(psi)/2
    return np.abs(S)/(8*A)
def m_of(rho, beta, n=4001):
    lo, hi = np.arccos(rho/2), np.pi
    ps = np.linspace(lo, hi, n)[1:-1]
    v = P_R(rho, ps, beta)
    i = np.argmin(v)
    # count local minima in psi (unimodality)
    nloc = np.sum((v[1:-1] < v[:-2]) & (v[1:-1] < v[2:]))
    # refine by golden section
    a, b = ps[max(i-1,0)], ps[min(i+1,len(ps)-1)]
    g = (np.sqrt(5)-1)/2
    c_, d_ = b-g*(b-a), a+g*(b-a)
    for _ in range(80):
        if P_R(rho,c_,beta) < P_R(rho,d_,beta): b = d_
        else: a = c_
        c_, d_ = b-g*(b-a), a+g*(b-a)
    x = (a+b)/2
    return P_R(rho, x, beta), x, nloc
rhos = np.concatenate([np.logspace(-3, -1, 81), np.linspace(0.1, 0.999, 400)[1:]])
allok = True
for alpha in list(np.round(np.arange(0.05, 2.0001, 0.05), 3)) + [2.5, 3.0, 4.0, 6.0, 10.0]:
    beta = 1 + alpha/2
    B = np.sqrt(3+alpha)/(2+alpha)
    ms = []; nl = []
    for r in rhos:
        m, x, k = m_of(r, beta)
        ms.append(m); nl.append(k)
    ms = np.array(ms)
    inc = np.all(np.diff(ms) > 0)
    ok = inc and np.all(ms > B)
    allok &= ok
    print(f"alpha={alpha:5}: B={B:.10f} m(1e-3)-B={ms[0]-B:.3e} m(0.5)={ms[np.argmin(abs(rhos-0.5))]:.6f} m(0.999)={ms[-1]:.4f} strictly increasing={inc} all>B={np.all(ms>B)} max #local minima in psi={max(nl)}")
print('ALL OK' if allok else 'FAIL')
