"""
Independent validation of a self-similar configuration (does not import the solver code).
Input JSON with "G" (list of strings/numbers) and "w" (list of [re, im]).
1. Biot-Savart velocities at high precision; quotients zdot_j/(z_j - z_c) for all j (vortices at z_c: speed).
2. Necessary conditions sum_{i<j} G_i G_j = 0, angular impulse about z_c = 0, Gamma_tot != 0.
3. P = |Im kappa|/(-2 Re kappa), t_c = -1/(2 Re kappa).
4. Direct time integration (mpmath Taylor ODE solver) to t = 0.9 t_c; compare |z_j - z_c|^2 with
   (1 - t/t_c)|z_j(0) - z_c|^2 and the rotation angle with -(Im kappa) t_c ln(1 - t/t_c).
Usage: python3 validate.py in.json dps [integrate:0/1]
"""
import mpmath as mp, json, sys

inp = json.load(open(sys.argv[1])); mp.mp.dps = int(sys.argv[2])
integ = len(sys.argv) > 3 and sys.argv[3] == '1'
G = [mp.mpf(g) for g in inp['G']]
z0 = [mp.mpc(mp.mpf(a), mp.mpf(b)) for a, b in inp['w']]
N = len(G)

def vel(z):
    return [mp.conj(mp.fsum(G[k]/(z[j]-z[k]) for k in range(N) if k != j)/(2j*mp.pi)) for j in range(N)]

Gt = mp.fsum(G); zc = mp.fsum(G[j]*z0[j] for j in range(N))/Gt
v = vel(z0)
rmax = max(abs(z-zc) for z in z0)
far = [j for j in range(N) if abs(z0[j]-zc) > mp.mpf(10)**(-mp.mp.dps//2)*rmax]
jref = max(far, key=lambda j: abs(z0[j]-zc))
kap = v[jref]/(z0[jref]-zc)
spread = max(abs(v[j]/(z0[j]-zc) - kap) for j in far)/abs(kap)
cs = max([abs(v[j]) for j in range(N) if j not in far] or [mp.mpf(0)])
s2 = mp.fsum(G[i]*G[j] for i in range(N) for j in range(i+1, N))
L = mp.fsum(G[j]*abs(z0[j]-zc)**2 for j in range(N))
P = abs(kap.imag)/(-2*kap.real)
tc = -1/(2*kap.real)
scale = mp.fsum(abs(g) for g in G)
print('N', N, 'Gamma_tot', mp.nstr(Gt, 15), 'sum|G|', mp.nstr(scale, 10))
print('kappa', mp.nstr(kap, 30))
print('self-similarity spread (rel.)', mp.nstr(spread, 5), ' speed of vortices at z_c', mp.nstr(cs, 5))
print('sum_{i<j} GiGj / (sum|G|)^2', mp.nstr(s2/scale**2, 5), '  L/(sum|G| rmax^2)', mp.nstr(L/(scale*rmax**2), 5))
print('collapse (Re kappa < 0):', kap.real < 0, ' P =', mp.nstr(P, mp.mp.dps-8), ' t_c =', mp.nstr(tc, 20))
print('min pair distance / rmax', mp.nstr(min(abs(z0[i]-z0[j]) for i in range(N) for j in range(i+1, N))/rmax, 6),
      '  min|G|/max|G|', mp.nstr(min(abs(g) for g in G)/max(abs(g) for g in G), 6))
if integ:
    # integrate real system y = (x_1..x_N, y_1..y_N)
    def f(t, y):
        z = [mp.mpc(y[j], y[N+j]) for j in range(N)]
        vv = vel(z)
        return [q.real for q in vv] + [q.imag for q in vv]
    y0 = [z.real for z in z0] + [z.imag for z in z0]
    sol = mp.odefun(f, 0, y0)
    worst_r = 0; worst_a = 0
    for frac in [mp.mpf(1)/4, mp.mpf(1)/2, mp.mpf(3)/4, mp.mpf(9)/10]:
        t = frac*tc
        y = sol(t)
        z = [mp.mpc(y[j], y[N+j]) for j in range(N)]
        lam2 = 1 - t/tc
        for j in far:
            ratio = abs(z[j]-zc)**2/(lam2*abs(z0[j]-zc)**2)
            worst_r = max(worst_r, abs(ratio-1))
            ang = mp.arg((z[j]-zc)/(z0[j]-zc))
            pred = -kap.imag*tc*mp.log(lam2)
            d = ang - pred
            d = d - 2*mp.pi*mp.nint(d/(2*mp.pi))
            worst_a = max(worst_a, abs(d))
        print('  t/t_c =', mp.nstr(frac, 3), ' max| |z-zc|^2/((1-t/tc)|z0-zc|^2) - 1 | =', mp.nstr(worst_r, 5),
              ' max angle error =', mp.nstr(worst_a, 5))
