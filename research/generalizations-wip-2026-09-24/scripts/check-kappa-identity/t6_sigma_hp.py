"""Test 6: sign of sigma in high precision near the degenerate limits where double-precision
descent pushed sigma/sum(s) to ~ -1e-16 (a coalescing pair and a point near the origin).
Also an mpmath-precision descent on sigma/sum(s) with a floor on the pair distance."""
import mpmath as mp, random, itertools
mp.mp.dps = 60

def sigma(w):
    N = len(w)
    s = [abs(x) ** 2 for x in w]
    A = mp.eye(N)
    for j in range(N):
        for k in range(N):
            if j != k:
                A[j, k] = mp.re((w[j] + w[k]) / (w[j] - w[k]))
    v = mp.lu_solve(A, mp.matrix(s))
    return mp.fsum([v[j] for j in range(N)]), mp.fsum(s)

random.seed(3)
worst = mp.inf; arg = None
for eps_e in [1, 2, 3, 4, 6, 8]:
    for del_e in [1, 2, 3, 4, 6, 8]:
        eps = mp.mpf(10) ** (-eps_e); dl = mp.mpf(10) ** (-del_e)
        for a, g in itertools.product(range(24), range(24)):
            al = mp.pi * a / 12; ga = mp.pi * g / 12
            w = [1 + eps / 2 * mp.expj(al), 1 - eps / 2 * mp.expj(al), dl * mp.expj(ga)]
            sg, ss = sigma(w)
            r = sg / ss
            if r < worst:
                worst = r; arg = (eps_e, del_e, a, g)
print('N=3 pair+near-origin grid: min sigma/sum s =', mp.nstr(worst, 8), 'at', arg)

# random high precision sampling for N=3..7 including tiny scales mixed
for N in [3, 4, 5, 7]:
    worst = mp.inf
    for t in range(3000):
        scales = [mp.mpf(10) ** (-random.randint(0, 6)) for _ in range(N)]
        base = [mp.mpc(random.gauss(0, 1), random.gauss(0, 1)) for _ in range(N)]
        w = []
        for j in range(N):
            # attach some points to previous points at tiny offsets
            if j > 0 and random.random() < 0.5:
                w.append(w[random.randrange(j)] + scales[j] * base[j])
            else:
                w.append(scales[j] * base[j])
        try:
            sg, ss = sigma(w)
        except ZeroDivisionError:
            continue
        worst = min(worst, sg / ss)
    print('N=%d multiscale random: min sigma/sum s = %s' % (N, mp.nstr(worst, 8)))
