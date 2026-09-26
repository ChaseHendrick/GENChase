"""Second stage for bnbA (homogeneous potential of exponent A, chart z_1 = 1).

Independent of classify.py: the Jacobian comes from forward-mode automatic
differentiation in arb (class Dual below), not from a hand derivation, and
the equations are the multiplier-free H_j of bnbA.c.

Usage: python3 classifyA.py N A file [file ...] [--json=out.json]
"""
import sys, os, json, itertools, math
from flint import arb, acb, arb_mat, ctx
import numpy as np

ctx.prec = 256
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = [a for a in sys.argv[1:] if a.startswith('--')]
N = int(args[0]); A = arb(args[1]); Af = float(args[1])
files = args[2:]
D = 2 * N - 4
jsonout = next((o[7:] for o in opts if o.startswith('--json=')), None)


class Dual:
    """value (arb) and gradient (list of arb) for forward-mode AD"""
    __slots__ = ('v', 'g')

    def __init__(self, v, g=None):
        self.v = v if isinstance(v, arb) else arb(v)
        self.g = g if g is not None else [arb(0)] * D

    def __add__(s, o):
        o = o if isinstance(o, Dual) else Dual(o)
        return Dual(s.v + o.v, [a + b for a, b in zip(s.g, o.g)])
    __radd__ = __add__

    def __sub__(s, o):
        o = o if isinstance(o, Dual) else Dual(o)
        return Dual(s.v - o.v, [a - b for a, b in zip(s.g, o.g)])

    def __rsub__(s, o):
        return Dual(o) - s

    def __neg__(s):
        return Dual(-s.v, [-a for a in s.g])

    def __mul__(s, o):
        o = o if isinstance(o, Dual) else Dual(o)
        return Dual(s.v * o.v, [s.v * b + o.v * a for a, b in zip(s.g, o.g)])
    __rmul__ = __mul__

    def powr(s, e):
        """s^e for s > 0, real exponent e (arb)"""
        val = s.v ** e
        dv = e * s.v ** (e - 1)
        return Dual(val, [dv * a for a in s.g])


def variables(v):
    out = []
    for i in range(D):
        g = [arb(0)] * D
        g[i] = arb(1)
        out.append(Dual(v[i], g))
    return out


def zfrom(v):
    """v: list (arb or Dual) of length D -> list of (re, im) pairs"""
    z = [(v[0] * 0 + 1, v[0] * 0)]
    for j in range(1, N - 1):
        z.append((v[2 * j - 2], v[2 * j - 1]))
    sr = sum((p[0] for p in z[1:]), z[0][0])
    si = sum((p[1] for p in z[1:]), z[0][1])
    z.append((-sr, -si))
    return z


def H_all(v):
    z = zfrom(v)
    I = sum((x * x + y * y for x, y in z[1:]), z[0][0] * z[0][0] + z[0][1] * z[0][1])
    U = None
    S = [[None, None] for _ in range(N)]
    for j in range(N):
        sr = si = None
        for k in range(N):
            if k == j:
                continue
            a = z[j][0] - z[k][0]
            b = z[j][1] - z[k][1]
            d = a * a + b * b
            p = d.powr(-A / 2)
            sr = a * p if sr is None else sr + a * p
            si = b * p if si is None else si + b * p
            if k > j:
                u = d.powr(1 - A / 2)
                U = u if U is None else U + u
        S[j] = [sr, si]
    H = []
    for j in range(N):
        H.append((I * S[j][0] - U * z[j][0], I * S[j][1] - U * z[j][1]))
    return H


def E_and_J(X):
    Hs = H_all(variables(X))
    rows = []
    for j in range(1, N - 1):
        rows += [Hs[j][0], Hs[j][1]]
    return [r.v for r in rows], [r.g for r in rows]


def E_of(v):
    Hs = H_all([Dual(x) for x in v])
    rows = []
    for j in range(1, N - 1):
        rows += [Hs[j][0].v, Hs[j][1].v]
    return rows


def ball(lo, hi):
    lo = arb(lo); hi = arb(hi)
    return (lo + hi) / 2 + arb(0, ((hi - lo) / 2).upper())


def mid(x):
    return float(x.mid())


def J_hull(X, depth=1):
    """Jacobian enclosure over X as the union of the AD enclosures over the
    2^D sub-boxes obtained by halving every coordinate (less overestimation;
    still contains the Jacobian at every point of X)."""
    subs = [[]]
    for x in X:
        lo, hi, m = x.lower(), x.upper(), arb(x.mid())
        halves = [(lo, m), (m, hi)]
        subs = [s + [h] for s in subs for h in halves]
    Jh = None
    for s in subs:
        Xs = [a.union(b) for a, b in s]
        _, J = E_and_J(Xs)
        Jh = J if Jh is None else [[p.union(q) for p, q in zip(r1, r2)] for r1, r2 in zip(Jh, J)]
    return Jh


def krawczyk(X):
    J = J_hull(X)
    m = [arb(x.mid()) for x in X]
    Em = E_of(m)
    C = np.linalg.inv(np.array([[mid(J[i][j]) for j in range(D)] for i in range(D)]))
    K = []
    for i in range(D):
        s = m[i]
        for k in range(D):
            s -= arb(C[i][k]) * Em[k]
        for j in range(D):
            mij = arb(1 if i == j else 0)
            for k in range(D):
                mij -= arb(C[i][k]) * J[k][j]
            s += mij * (X[j] - m[j])
        K.append(s)
    return K


def inside(a, b):
    return (a.lower() - b.lower() > 0) and (b.upper() - a.upper() > 0)


def refine(v):
    v = [arb(x) for x in v]
    for _ in range(40):
        vm = [arb(x.mid()) for x in v]
        E, J = E_and_J(vm)
        Jm = arb_mat([[J[i][j].mid() for j in range(D)] for i in range(D)])
        dx = Jm.solve(arb_mat([[e.mid()] for e in E]))
        v = [arb((vm[i] - dx[i, 0]).mid()) for i in range(D)]
    return v



def check_complete(files):
    """The runs must together cover the whole chart.  A run with nworkers = n
    and worker = w searches the initial pieces i with i = w (mod n).  Files may
    mix granularities (a slow slice re-run as finer slices) provided every
    n divides the largest one, L, and the residues covered mod L are all of
    0..L-1.  Every file must be a finished run (STAT line) of the whole chart
    (not a control box, not a mutation) with the same N, nsplit, chart and
    exponent, and with no undecided box."""
    ref = None
    runs = []
    for fn in files:
        for line in open(fn):
            if line.startswith('STAT'):
                d = dict(t.split('=', 1) for t in line.split()[1:] if '=' in t)
                key = {k: d.get(k) for k in ('nsplit', 'N', 'sym', 'A', 'root', 'mutate')}
                if ref is None:
                    ref = key
                assert key == ref, f'files from different runs: {key} vs {ref}'
                assert int(d['unres']) == 0, 'undecided boxes'
                assert d.get('root') == 'chart', 'not a search of the whole chart'
                if os.environ.get('CONTROL_ALLOW_MUTATION') != '1':   # set only by controls.py
                    assert d.get('mutate') == '0', 'a mutated (control) run'
                assert int(d['N']) == N, 'wrong N'
                assert 0 <= int(d['worker']) < int(d['nworkers']), 'worker index out of range (searches nothing)'
                runs.append((int(d['nworkers']), int(d['worker'])))
    assert runs, 'no STAT line: the run did not finish'
    L = max(n for n, _ in runs)
    assert all(L % n == 0 for n, _ in runs), 'incompatible granularities'
    covered = set()
    for n, w in runs:
        covered.update(range(w % n, L, n))
    assert covered == set(range(L)), f'incomplete run: {L - len(covered)} residues mod {L} not searched'
    return L

if os.environ.get("EXPLORATORY_SKIP_COMPLETENESS") != "1":  # never set for the proof runs
    check_complete(files)
    print('completeness check passed: the runs cover the whole chart')
else:
    print('WARNING: completeness check SKIPPED (exploratory run, not a proof)')
if os.environ.get('CONTROL_ALLOW_MUTATION') == '1':
    print('WARNING: mutated runs allowed (negative control, not a proof)')
boxes = []
for fn in files:
    for line in open(fn):
        if line.startswith('UNRES'):
            raise SystemExit('unresolved box: search incomplete')
        if line.startswith('CERT'):
            t = [float.fromhex(x) if 'x' in x else float(x) for x in line.split()[1:]]
            boxes.append([(t[2 * i], t[2 * i + 1]) for i in range(D)])
print(f'N = {N}, A = {args[1]}: {len(boxes)} certified boxes')

sols = []
for lohi in boxes:
    X = [ball(lo, hi) for lo, hi in lohi]
    K = krawczyk(X)
    assert all(k - arb(lo) > 0 and arb(hi) - k > 0 for k, (lo, hi) in zip(K, lohi)), 'arb Krawczyk failed'
    z = zfrom(X)
    assert (1 - z[N - 1][0]) > 0
    v = refine([mid(x) for x in X])
    T = [arb(x.mid(), arb(2) ** -200) for x in v]
    KT = krawczyk(T)
    assert all(inside(k, t) for k, t in zip(KT, T)), 'tight Krawczyk failed'
    assert all(inside(k, x) for k, x in zip(KT, X))
    sols.append({'X': X, 'T': KT})

uniq = []
for s in sols:
    for u in uniq:
        if all(inside(t, x) for t, x in zip(s['T'], u['X'])):
            break
        if any(not t.overlaps(w) for t, w in zip(s['T'], u['T'])):
            continue
        raise RuntimeError('undecided duplicate')
    else:
        uniq.append(s)
print(f'distinct solutions in the reduced chart: {len(uniq)}')


def zc(v):
    return [acb(x, y) for x, y in zfrom(v)]


for u in uniq:
    u['z'] = zc(u['T'])


def image(z, perm, refl):
    w = [z[perm[j]] for j in range(N)]
    if refl:
        w = [x.conjugate() for x in w]
    a = abs(w[0])
    if not a > 0:
        return None
    f = w[0].conjugate() / (a * a)      # rotate and scale so that w_1 = 1
    return [x * f for x in w]


def maps_to(z, perm, refl, t):
    # vortex 1 of a chart solution has the largest modulus
    mx = max(float(abs(x).upper()) for x in z)
    if not abs(z[perm[0]]).overlaps(max((abs(x) for x in z), key=lambda b: float(b.mid()))):
        return False
    w = image(z, perm, refl)
    if w is None:
        raise RuntimeError('undecided')
    v = []
    for j in range(1, N - 1):
        v += [w[j].real, w[j].imag]
    if any(not a.overlaps(b) for a, b in zip(v, t['T'])):
        return False
    if all(inside(a, b) for a, b in zip(v, t['X'])):
        return True
    raise RuntimeError('undecided symmetry test')


perms = list(itertools.permutations(range(N)))
classes, cls_of = [], [None] * len(uniq)
for i, u in enumerate(uniq):
    if cls_of[i] is not None:
        continue
    classes.append([i]); cls_of[i] = len(classes) - 1
    for j in range(i + 1, len(uniq)):
        if cls_of[j] is None and any(maps_to(u['z'], p, r, uniq[j]) for p in perms for r in (False, True)):
            cls_of[j] = cls_of[i]; classes[-1].append(j)


def hessW(z):
    """Hessian of W = -V - (lambda/2) I, V = sum r^{2-A}/(A-2) (log for A=2),
    lambda = U'/I at the solution.  Pair block r^{-A}(Id - A w w^T / r^2)."""
    n = 2 * N
    I = sum((abs(x) ** 2 for x in z), arb(0))
    U = arb(0)
    H = [[arb(0)] * n for _ in range(n)]
    for j in range(N):
        for k in range(j + 1, N):
            w = z[j] - z[k]
            a, b = w.real, w.imag
            d = a * a + b * b
            p = d ** (-A / 2)
            U += d ** (1 - A / 2)
            q = A * p / d
            blk = [[p - q * a * a, -q * a * b], [-q * a * b, p - q * b * b]]
            for r in range(2):
                for c in range(2):
                    H[2 * j + r][2 * j + c] += blk[r][c]
                    H[2 * k + r][2 * k + c] += blk[r][c]
                    H[2 * j + r][2 * k + c] -= blk[r][c]
                    H[2 * k + r][2 * j + c] -= blk[r][c]
    lam = U / I
    for i in range(n):
        H[i][i] -= lam
    return H, lam


def morse_index(z):
    H, lam = hessW(z)
    n = 2 * N
    u = []
    for x in z:
        u += [-x.imag, x.real]
    nr = sum((x * x for x in u), arb(0))
    Hs = [[H[i][j] - lam * u[i] * u[j] / nr for j in range(n)] for i in range(n)]
    Hm = np.array([[mid(Hs[i][j]) for j in range(n)] for i in range(n)])
    _, Q = np.linalg.eigh((Hm + Hm.T) / 2)
    Qa = [[arb(float(Q[i][j])) for j in range(n)] for i in range(n)]
    HQ = [[sum((Hs[i][k] * Qa[k][j] for k in range(n)), arb(0)) for j in range(n)] for i in range(n)]
    B = [[sum((Qa[k][i] * HQ[k][j] for k in range(n)), arb(0)) for j in range(n)] for i in range(n)]
    pos = neg = 0
    for i in range(n):
        off = sum((abs(B[i][j]) for j in range(n) if j != i), arb(0))
        if B[i][i] - off > 0:
            pos += 1
        elif B[i][i] + off < 0:
            neg += 1
        else:
            raise RuntimeError('inertia undecided')
    return pos


res = []
tot = eul = 0
for c, mem in enumerate(classes):
    z = uniq[mem[0]]['z']
    rot = sum(1 for p in perms if maps_to(z, p, False, uniq[mem[0]]))
    ref = sum(1 for p in perms if maps_to(z, p, True, uniq[mem[0]]))
    lab = math.factorial(N) // rot * (2 if ref == 0 else 1)
    idx = morse_index(z)
    tot += lab; eul += (-1) ** idx * lab
    d = sorted(float(abs(z[j] - z[k]).mid()) for j in range(N) for k in range(j + 1, N))
    res.append({'class': c, 'labelled': lab, 'rot_sym_order': rot, 'mirror_symmetric': ref > 0,
                'morse_index': idx, 'pair_distances_over_max': [x / d[-1] for x in d],
                'z_approx': [[float(x.real.mid()), float(x.imag.mid())] for x in z]})
    print(f'class {c}: labelled {lab}, rotation symmetry order {rot}, mirror symmetric {ref > 0}, Morse index {idx}')
    print('   pair distances / max:', ' '.join(f'{x / d[-1]:.5f}' for x in d))
chi = 1
for k in range(2, N):
    chi *= 1 - k
print(f'classes: {len(classes)}; labelled total {tot}; sum (-1)^index = {eul}; Euler characteristic {chi}')
assert eul == chi, 'Euler characteristic check FAILED'
print('Euler characteristic check passed')
print('Morse polynomial:', ' + '.join(f"{sum(r['labelled'] for r in res if r['morse_index'] == i)} t^{i}" for i in range(2 * N - 3)))
if jsonout:
    json.dump({'N': N, 'A': args[1], 'boxes': len(boxes), 'distinct': len(uniq), 'classes': res,
               'total_labelled': tot, 'euler_sum': eul, 'euler_characteristic': chi}, open(jsonout, 'w'), indent=1)
