"""Fixed-circulation self-similar collapse search, for circulation sets published by
Kudela (Energies 14, 943, 2021): 49 x (+1) with one -24, and 48 x (+1) with two equal a,
a^2 + 96 a + 1128 = 0.  Unknowns: positions w (about z_c = 0).  kappa = -1 + i b fixed per solve.
Continuation lowers b until the family folds; reports the smallest P = b/2 reached.
Independent code (not the project solver).  float64 LM, analytic Jacobian."""
import numpy as np, sys, json, time
TWO_PI = 2*np.pi

def F(w, G, b):
    d = w[:, None]-w[None, :]; np.fill_diagonal(d, 1.0); inv = 1/d; np.fill_diagonal(inv, 0)
    ck = -1-1j*b  # conj(kappa)
    r = inv@G - 2j*np.pi*ck*np.conj(w)
    return np.concatenate([r.real, r.imag])

def J(w, G, b):
    N = len(w)
    d = w[:, None]-w[None, :]; np.fill_diagonal(d, 1.0); inv = 1/d; np.fill_diagonal(inv, 0)
    inv2 = inv**2
    A = inv2*G[None, :]; A[np.diag_indices(N)] = -(inv2@G)
    B = -2j*np.pi*(-1-1j*b)*np.eye(N)
    Ju = A+B; Jv = 1j*A-1j*B
    Jc = np.concatenate([Ju, Jv], axis=1)
    return np.concatenate([Jc.real, Jc.imag], axis=0)

def lm(w, G, b, iters=300, tol=1e-12):
    N = len(w); x = np.concatenate([w.real, w.imag])
    un = lambda x: x[:N]+1j*x[N:]
    r = F(un(x), G, b); f = r@r; lam = 1e-3
    for it in range(iters):
        Jm = J(un(x), G, b); g = Jm.T@r; H = Jm.T@Jm
        ok = False
        while lam < 1e12:
            try:
                dx = -np.linalg.solve(H+lam*np.diag(np.diag(H)+1e-12), g)
            except np.linalg.LinAlgError:
                lam *= 10; continue
            xn = x+dx; rn = F(un(xn), G, b); fn = rn@rn
            if np.isfinite(fn) and fn < f:
                x, r, f = xn, rn, fn; lam = max(lam/3, 1e-15); ok = True; break
            lam *= 4
        if not ok or f < tol**2: break
    return un(x), f

def P_check(w, G):
    # direct Biot-Savart: dz/dt = conj((1/(2 pi i)) sum G_k/(z_j - z_k)); kappa_j = v_j/(z_j - z_c)
    Gt = G.sum(); zc = (G*w).sum()/Gt
    d = w[:, None]-w[None, :]; np.fill_diagonal(d, 1.0); inv = 1/d; np.fill_diagonal(inv, 0)
    v = np.conj((inv@G)/(2j*np.pi)); k = v/(w-zc)
    return abs(k[0].imag)/(-2*k[0].real), float(np.max(np.abs(k-k[0]))/abs(k[0])), k[0].real < 0

def run(G, seed, b0=3.0, tstart=None, tlimit=60):
    rng = np.random.default_rng(seed); N = len(G)
    w0 = (rng.normal(size=N)+1j*rng.normal(size=N))*0.5
    w, f = lm(w0, G, b0, iters=800)
    if f > 1e-20: return None
    b = b0; h = 0.1
    t0 = time.time()
    while h > 1e-6 and time.time()-t0 < tlimit:
        wn, fn = lm(w.copy(), G, b-h, iters=60)
        dmin = np.min(np.abs(wn[:, None]-wn[None, :])+np.eye(N)*1e9)
        if fn < 1e-22 and np.linalg.norm(wn-w) < 0.3*np.max(np.abs(w)) and dmin > 1e-4*np.max(np.abs(wn)):
            w, b = wn, b-h; h = min(h*1.5, 0.2)
        else:
            h /= 2
    P, spread, col = P_check(w, G)
    return dict(seed=seed, P=float(P), b=b, spread=spread, collapse=bool(col))

if __name__ == '__main__':
    case = sys.argv[1]; nseeds = int(sys.argv[2])
    if case == 'one':
        G = np.array([1.0]*49+[-24.0])
    elif case == 'twoA':
        a = -48+np.sqrt(1176); G = np.array([1.0]*48+[a, a])
    else:
        a = -48-np.sqrt(1176); G = np.array([1.0]*48+[a, a])
    G = G/np.abs(G).max()*1.0
    V = sum(G[i]*G[j] for i in range(len(G)) for j in range(i+1, len(G)))
    print('case', case, 'N', len(G), 'V', V, flush=True)
    out = []
    for s in range(nseeds):
        r = run(G, s)
        print(json.dumps(r), flush=True)
        if r: out.append(r)
    out.sort(key=lambda r: r['P'])
    print('best', json.dumps(out[:3]))
