"""Independent check (written from scratch, not reusing research/sphere code) of the
S2 loxodrome law for three-vortex self-similar collapse on the unit sphere.
Planar convention: conj(dz_j/dt) = (1/(2 pi i)) sum Gamma_k/(z_j - z_k).
Sphere: dx_i/dt = (1/(2 pi)) sum_j Gamma_j (x_j x x_i)/|x_i - x_j|^2.
"""
import numpy as np
from scipy.integrate import solve_ivp

def planar_setup(mu, phi):
    G = np.array([1.0, mu, -mu/(1+mu)])
    # z1 = 0, z2 = 1, z3 on the circle L = G1G2 + G2G3|z3-1|^2 + G1G3|z3|^2 = 0
    # G2G3|z-1|^2 + G1G3|z|^2 = -G1G2  ->  (G2G3+G1G3)|z|^2 - 2 G2G3 Re z + G2G3 + G1G2 = 0
    a = G[1]*G[2] + G[0]*G[2]; b = G[1]*G[2]; c = G[1]*G[2] + G[0]*G[1]
    # |z|^2 - 2 (b/a) Re z + c/a = 0 -> center b/a, radius^2 = (b/a)^2 - c/a
    cen = b/a; r2 = cen**2 - c/a
    z3 = cen + np.sqrt(r2)*np.exp(1j*phi)
    Z = np.array([0, 1, z3], dtype=complex)
    return G, Z

def planar_vel(Z, G):
    V = []
    for j in range(3):
        s = sum(G[k]/(Z[j]-Z[k]) for k in range(3) if k != j)
        V.append(np.conj(s/(2j*np.pi)))
    return np.array(V)

def circumcenter(Z):
    a, b, c = Z
    d = 2*(a.real*(b.imag-c.imag) + b.real*(c.imag-a.imag) + c.real*(a.imag-b.imag))
    ux = (abs(a)**2*(b.imag-c.imag) + abs(b)**2*(c.imag-a.imag) + abs(c)**2*(a.imag-b.imag))/d
    uy = (abs(a)**2*(c.real-b.real) + abs(b)**2*(a.real-c.real) + abs(c)**2*(b.real-a.real))/d
    return ux + 1j*uy

def rhs(t, y, G):
    X = y.reshape(3, 3)
    out = np.zeros_like(X)
    for i in range(3):
        for j in range(3):
            if i == j: continue
            d = X[i]-X[j]
            out[i] += G[j]*np.cross(X[j], X[i])/d.dot(d)
    return (out/(2*np.pi)).ravel()

def run(mu, phi, beta0):
    G, Z = planar_setup(mu, phi)
    S = G.sum()
    zc = (G*Z).sum()/S
    V = planar_vel(Z, G)
    kap = V/(Z-zc)
    P0 = abs(kap[0].imag)/(-2*kap[0].real) if kap[0].real < 0 else abs(kap[0].imag)/(2*kap[0].real)
    O = circumcenter(Z); rc = abs(Z[0]-O)
    s = np.sin(beta0)/rc
    X = np.array([[s*(z-O).real, s*(z-O).imag, np.cos(beta0)] for z in Z])
    p = (G[:, None]*X).sum(0)/S
    print(f"mu={mu} phi={phi} kappa spread={np.ptp(kap.real):.1e},{np.ptp(kap.imag):.1e} Re kappa={kap[0].real:.6f} P0={P0:.12f} |p|={np.linalg.norm(p):.15f}")
    res = {}
    for direction, T in (("fwd", 1e3), ("bwd", -1e3)):
        # stop when minimum chord small
        def ev(t, y, G):
            Xs = y.reshape(3, 3)
            return min(np.linalg.norm(Xs[0]-Xs[1]), np.linalg.norm(Xs[1]-Xs[2]), np.linalg.norm(Xs[0]-Xs[2])) - 2e-3
        ev.terminal = True
        sol = solve_ivp(rhs, (0, T), X.ravel(), args=(G,), method='DOP853', rtol=1e-13, atol=1e-15,
                        events=ev, dense_output=False, max_step=0.05)
        res[direction] = sol
    # combine
    ts = np.concatenate([res['bwd'].t[::-1], res['fwd'].t[1:]])
    Ys = np.concatenate([res['bwd'].y[:, ::-1], res['fwd'].y[:, 1:]], axis=1)
    e1 = np.cross(p, [1.0, 0.3, 0.1]); e1 /= np.linalg.norm(e1); e2 = np.cross(p, e1)
    cosb, psi, Jerr = [], [], []
    nprev = None
    for k in range(len(ts)):
        Xs = Ys[:, k].reshape(3, 3)
        n = np.cross(Xs[1]-Xs[0], Xs[2]-Xs[0]); n /= np.linalg.norm(n)
        if nprev is not None and n.dot(nprev) < 0: n = -n
        nprev = n
        cosb.append(n.dot(p)); psi.append(np.arctan2(n.dot(e2), n.dot(e1)))
        Jerr.append(np.linalg.norm((G[:, None]*Xs).sum(0)/S - p))
    cosb = np.array(cosb); psi = np.unwrap(np.array(psi))
    # orient n_c so that it approaches p in the collapse direction: flip if needed so cos beta increases toward the end that collapses
    A = np.vstack([ts, np.ones_like(ts)]).T
    coef, *_ = np.linalg.lstsq(A, cosb, rcond=None)
    lin_err = np.max(np.abs(A@coef - cosb))
    if coef[0] < 0:
        cosb = -cosb; coef = -coef; psi = psi  # pole flip: azimuth of -n differs by pi, same slope
    beta = np.arccos(np.clip(cosb, -1, 1))
    L = np.log(np.tan(beta/2))
    mask = (beta > 1e-3) & (beta < np.pi-1e-3)
    B = np.vstack([L[mask], np.ones(mask.sum())]).T
    c2, *_ = np.linalg.lstsq(B, psi[mask], rcond=None)
    lox_err = np.max(np.abs(B@c2 - psi[mask]))
    # constant angle to meridian: tan(angle) = sin(beta) |dpsi/dbeta|
    print(f"  t range [{ts[0]:.4f},{ts[-1]:.4f}], cos beta range [{cosb.min():.6f},{cosb.max():.6f}], samples {len(ts)}")
    print(f"  max |J/S - p| = {max(Jerr):.2e}")
    print(f"  cos beta linear in t: slope {coef[0]:.12f}, max deviation {lin_err:.2e}")
    print(f"  psi vs ln tan(beta/2): slope {c2[0]:.12f}  vs 2*P0 = {2*P0:.12f}, ratio {abs(c2[0])/(2*P0):.12f}, max dev {lox_err:.2e}, psi span {np.ptp(psi):.3f}")
    # lifetime vs 2/|ahat| is not checked (ahat normalisation unknown); check that cos beta goes -1 -> +1 linearly
    print(f"  extrapolated cos beta at start/end times of full loxodrome: burst t={(-1-coef[1])/coef[0]:.6f}, collapse t={(1-coef[1])/coef[0]:.6f}")
    return P0, c2[0]

if __name__ == "__main__":
  for mu, phi, b0 in [(0.5, 1.0, 1.2), (1.0, 2.2, 0.4), (0.2, -0.7, 2.0), (0.8, 2.9, 1.5707)]:
    run(mu, phi, b0)
