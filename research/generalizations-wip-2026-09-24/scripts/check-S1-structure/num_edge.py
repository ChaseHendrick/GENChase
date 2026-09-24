"""Edge cases and a high-precision trajectory check.
  E1: chord plane through the origin (d = 0 exactly): x1, x2, x3 on a great circle with L = 0.
  E2: equilateral chord triangles (L = M l^2 = 0 automatically): relative equilibria, alpha = 0.
  E3: Gamma = (1,1,-1/2) and (1,-2,-2) specific cases.
  T : mpmath odefun (Taylor) at 30 digits over a short span: ahat, bhat, d(t) linear, p fixed.
"""
import mpmath as mp
import sys
sys.path.insert(0, '.')
from num_static import analyse, V3, dot, cross, nrm, unit, sph_vel

mp.mp.dps = 50

def great_circle_case(G, th1, th2):
    # x1, x2 on equator z=0; x3 on equator solving L = 0
    x1 = V3(mp.cos(th1), mp.sin(th1), 0); x2 = V3(mp.cos(th2), mp.sin(th2), 0)
    l12 = dot(x1-x2, x1-x2)
    q = G[0]*G[2]*x1 + G[1]*G[2]*x2
    h = (2*G[0]*G[2] + 2*G[1]*G[2] + G[0]*G[1]*l12)/2
    # x3 = (cos t, sin t, 0): q.x3 = h
    qn = mp.sqrt(q[0]**2 + q[1]**2); ph = mp.atan2(q[1], q[0])
    if abs(h/qn) >= 1: return None
    t = ph + mp.acos(h/qn)
    return [x1, x2, V3(mp.cos(t), mp.sin(t), 0)]

keys = ['absp', 'inplane', 'L', 'kspread', 'resB', 'chord', 'ndot', 'np', 'Omp', 'az', 'pdot']
print('E1: d = 0 (great-circle chord plane)')
for G in ([mp.mpf(1), mp.mpf(1), mp.mpf(-1)/2], [mp.mpf(1), mp.mpf(-2), mp.mpf(-2)], [mp.mpf(1), mp.mpf('0.3'), -mp.mpf('0.3')/mp.mpf('1.3')]):
    for (a1, a2) in [(0.1, 1.3), (0.4, 2.9), (-1.0, 0.7)]:
        X = great_circle_case(G, mp.mpf(a1), mp.mpf(a2))
        if X is None: print('  no solution', G, a1, a2); continue
        r = analyse(X, G)
        print(f"  G={[mp.nstr(g,4) for g in G]} d={mp.nstr(r['d'],3)} alpha={mp.nstr(r['al'],6)} beta={mp.nstr(r['be'],6)} "
              f"chord-rate err={mp.nstr(r['chord'],3)} resB={mp.nstr(r['resB'],3)} np={mp.nstr(r['np'],3)} az={mp.nstr(r['az'],3)}")

print('E2: equilateral chord triangles (relative equilibria)')
for G in ([mp.mpf(1), mp.mpf(1), mp.mpf(-1)/2], [mp.mpf(1), mp.mpf(-2), mp.mpf(-2)]):
    for z in [mp.mpf('0.9'), mp.mpf('0.1'), mp.mpf('-0.6')]:
        r0 = mp.sqrt(1 - z*z)
        X = [V3(r0*mp.cos(2*mp.pi*k/3), r0*mp.sin(2*mp.pi*k/3), z) for k in range(3)]
        r = analyse(X, G)
        print(f"  z={z} d={mp.nstr(r['d'],4)} alpha={mp.nstr(r['al'],3)} beta={mp.nstr(r['be'],8)} resB={mp.nstr(r['resB'],3)} "
              f"kspread={mp.nstr(r['kspread'],3)} L={mp.nstr(r['L'],3)}")

print('T: high-precision trajectory (mpmath odefun, dps 30)')
mp.mp.dps = 30
G = [mp.mpf(1), mp.mpf('0.5'), -mp.mpf('0.5')/mp.mpf('1.5')]
import random
rng = random.Random(5)
from num_static import x3_on_L0, rand_unit
x1 = rand_unit(rng); x2 = rand_unit(rng)
x3 = x3_on_L0(x1, x2, G, mp.mpf('1.1'))
X0 = [x1, x2, x3]
r0 = analyse(X0, G)
print('  start: d0 =', mp.nstr(r0['d'], 12), ' ahat =', mp.nstr(r0['ahat'], 20), ' bhat =', mp.nstr(r0['bhat'], 20))
def F(t, y):
    X = [mp.matrix(y[3*i:3*i+3]) for i in range(3)]
    V = sph_vel(X, G)
    return [V[i][k] for i in range(3) for k in range(3)]
y0 = [X0[i][k] for i in range(3) for k in range(3)]
sol = mp.odefun(F, 0, y0)
worst = dict(ahat=0, bhat=0, dlin=0, p=0)
T = mp.mpf('0.8')
for kk in range(1, 9):
    t = T*kk/8
    y = sol(t)
    X = [mp.matrix(y[3*i:3*i+3]) for i in range(3)]
    r = analyse(X, G)
    S = sum(G); p = sum((g*x for g, x in zip(G[1:], X[1:])), G[0]*X[0])/S
    p0 = sum((g*x for g, x in zip(G[1:], X0[1:])), G[0]*X0[0])/S
    worst['ahat'] = max(worst['ahat'], abs(r['ahat']-r0['ahat']))
    worst['bhat'] = max(worst['bhat'], abs(r['bhat']-r0['bhat']))
    worst['dlin'] = max(worst['dlin'], abs(r['d'] - (r0['d'] - r0['ahat']*t)))
    worst['p'] = max(worst['p'], nrm(p - p0))
    print(f"  t={mp.nstr(t,3)} d={mp.nstr(r['d'],15)} ahat={mp.nstr(r['ahat'],20)} bhat={mp.nstr(r['bhat'],20)}")
print('  worst deviations over t in [0, 0.8]:', {k: mp.nstr(v, 3) for k, v in worst.items()})
