# Independent Biot-Savart check of the claimed N=4 minimizer (values copied from the statement).
from mpmath import mp, mpf, mpc, pi, sqrt, atan, degrees, fabs
mp.dps = 80
G = [mpf(1), mpf('0.167391431853814697651119608287'), mpf('0.104133188036199454472762981869'),
     mpf('-0.227251300382913963570471483562')]
Z = [mpc('0.0166495669172171320379784913405', 0),
     mpc('-0.219122640223164016964857201527', '-0.329067622006817416107926375746'),
     mpc('-0.157987430012178450886765481268', '-0.286475993427200078671522237774'),
     mpc('-0.160533384304821086375863705901', '-0.373660167280816436844027021713')]
b = mpf('1.59579356775972696153521174364')
kap = mpc(-1, b)
N = 4
def vel(G, Z):
    out = []
    for j in range(len(Z)):
        s = mpc(0)
        for k in range(len(Z)):
            if k != j:
                s += G[k] / (Z[j] - Z[k])
        out.append((s / (2j * pi)).conjugate())
    return out
Gt = sum(G)
zc = sum(g * z for g, z in zip(G, Z)) / Gt
U = vel(G, Z)
ks = [U[j] / (Z[j] - zc) for j in range(N)]
print('Gtot', Gt)
print('zc', zc)
for j in range(N):
    print('kappa_j', mp.nstr(ks[j], 35))
print('max |kappa_j - kappa_claim|', max(abs(k - kap) for k in ks))
s2 = sum(G[i] * G[j] for i in range(N) for j in range(i + 1, N))
L = sum(G[j] * abs(Z[j] - zc) ** 2 for j in range(N))
print('sum GiGj', s2, ' L', L)
P = b / 2
print('P = b/2 =', mp.nstr(P, 40))
print('P from mean kappa', mp.nstr(abs(sum(ks).imag / 4) / (-2 * sum(ks).real / 4), 30))
print('spiral angle deg', mp.nstr(degrees(atan(2 * P)), 20))
print('path factor sqrt(1+4P^2)', mp.nstr(sqrt(1 + 4 * P ** 2), 20))
print('sqrt3/2', mp.nstr(sqrt(3) / 2, 20))
# geometry of weak cluster
cw = sum(Z[1:]) / 3
print('weak centroid dist from strong', mp.nstr(abs(cw - Z[0]), 8))
print('weak pair distances', [mp.nstr(abs(Z[i] - Z[j]), 6) for i in range(1, 4) for j in range(i + 1, 4)])
