# Near-extremal configurations: ordered sides r2 = rho < r3 = 1 < r1, r1^2 = 1 + rho m*, m* = sqrt(2/(1+beta)).
# Build positions z1 = 0, z2 = 1, z3 = rho e^{i psi}, cos psi = (rho - m*)/2; circulations from Gamma_i = lam u_i/(F_k - F_j).
# Validate by direct Biot-Savart: self-similarity residual, collapse sign, P, P - B, omega0*tc = 2P/(alpha+2).
from core import *
mp.mp.dps = 50
def config_rm(rho, m, alpha):
    psi = mp.acos((rho - m)/2)
    z = [mp.mpc(0), mp.mpc(1), rho*mp.expj(psi)]
    u = [abs(z[1]-z[2])**2, abs(z[0]-z[2])**2, abs(z[0]-z[1])**2]
    F = [x**(-1-mp.mpf(alpha)/2) for x in u]
    G = [u[0]/(F[2]-F[1]), u[1]/(F[0]-F[2]), u[2]/(F[1]-F[0])]
    return z, G
print('%5s %8s %22s %22s %10s %10s %12s %s' % ('alpha','rho','P','P - B','res','Re k','w0*tc/(2P/(a+2))','Gamma (normalized to strong = 1)'))
for alpha in [mp.mpf('0.5'), 1, mp.mpf('1.5'), 2]:
    beta = 1 + mp.mpf(alpha)/2
    B = mp.sqrt(3+alpha)/(2+alpha)
    ms = mp.sqrt(2/(1+beta))
    for rho in [mp.mpf('0.1'), mp.mpf('0.01'), mp.mpf('0.001'), mp.mpf('1e-6')]:
        z, G = config_rm(rho, ms, alpha)
        S = sum(G); zc = sum(g*zz for g, zz in zip(G, z))/S
        v = velocities(z, G, alpha)
        ks = [v[j]/(z[j]-zc) for j in range(3)]
        res = max(abs(ks[j]-ks[0]) for j in range(3))/abs(ks[0])
        k = ks[0]
        if k.real > 0:  # reverse all circulations: time reversal -> collapse
            G = [-g for g in G]; k = -k
        P = abs(k.imag)/(2*abs(k.real))
        tc = -1/((alpha+2)*k.real)
        ratio = abs(k.imag)*tc/(2*P/(alpha+2))
        Gn = [g/G[1] for g in G]
        print('%5s %8s %22s %22s %10s %10s %12s %s' % (mp.nstr(alpha,3), mp.nstr(rho,3), mp.nstr(P,18), mp.nstr(P-B,8), mp.nstr(res,2), mp.nstr(k.real,4), mp.nstr(ratio,15), [mp.nstr(g,6) for g in Gn]))
    print('   B = sqrt(3+alpha)/(2+alpha) =', mp.nstr(B, 20), '; predicted P - B ~ c2 rho^2 + c3 rho^(2+alpha), c2 =', mp.nstr((beta+1)*mp.sqrt(2*beta+1)/(24*beta),8), ' (valid at the optimal psi(rho); here psi uses m* so an O(rho^2) shift is expected)')
