"""Second stage of the proof: re-verify every certified box in arb ball
arithmetic, refine each solution to a tight enclosure, merge duplicates,
sort the solutions into classes modulo rotation, relabelling (and
reflection), compute each class's symmetry group, certify each Morse index,
and certify the linear (in)stability.

Input: the CERT lines written by bnb (one or more files).
Usage: python3 classify.py N file [file ...] [--json out.json]

Everything printed as "proved" rests on arb ball arithmetic (python-flint);
floating point is used only to produce approximations that are then
verified.
"""
import sys, os, json, itertools, math
import flint
from flint import arb, acb, arb_mat, ctx

ctx.prec = 256

args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = [a for a in sys.argv[1:] if a.startswith('--')]
N = int(args[0])
files = args[1:]
D = 2 * N - 3
jsonout = None
for o in opts:
    if o.startswith('--json='):
        jsonout = o[7:]

# ---------------------------------------------------------------- equations
def zfrom(v):
    """v: list of arb (length D) -> list of acb z_1..z_N"""
    z = [acb(v[0], 0)]
    for j in range(1, N - 1):
        z.append(acb(v[2 * j - 1], v[2 * j]))
    s = acb(0)
    for w in z:
        s += w
    z.append(-s)
    return z

def G_all(z):
    out = []
    for j in range(N):
        h = acb(0)
        for k in range(N):
            if k != j:
                h += 1 / (z[j] - z[k])
        out.append(h - z[j].conjugate())
    return out

def E_of(v):
    z = zfrom(v)
    G = G_all(z)
    E = []
    for j in range(1, N - 1):
        E += [G[j].real, G[j].imag]
    E.append(G[0].real)
    return E

def J_of(v):
    """Jacobian of E (derived by hand; see bnb.c) in arb."""
    z = zfrom(v)
    A = [[None] * N for _ in range(N)]
    for j in range(N):
        s = acb(0)
        for m in range(N):
            if m != j:
                A[j][m] = 1 / (z[j] - z[m]) ** 2
                s += A[j][m]
        A[j][j] = -s
    rows = []
    for j in range(1, N - 1):
        rows += [(j, 0), (j, 1)]
    rows.append((0, 0))
    J = [[None] * D for _ in range(D)]
    for q, (j, im) in enumerate(rows):
        for c in range(D):
            m = 0 if c == 0 else (c + 1) // 2
            imag = c != 0 and c % 2 == 0
            dA = A[j][m] - A[j][N - 1]
            dl = (1 if j == m else 0) - (1 if j == N - 1 else 0)
            if not imag:
                dG = dA - dl
            else:
                dG = acb(0, 1) * dA + acb(0, dl)
            J[q][c] = dG.imag if im else dG.real
    return J

# -------------------------------------------------------------- utilities
def ball_from_interval(lo, hi):
    lo = arb(lo); hi = arb(hi)   # exact (doubles)
    return (lo + hi) / 2 + arb(0, ((hi - lo) / 2).upper())

def mid_f(x):
    return float(x.mid())

def float_inverse(M):
    import numpy as np
    return np.linalg.inv(np.array(M, dtype=float))

def J_hull(X, levels):
    """Jacobian enclosure over X as the union of the enclosures over the
    sub-boxes obtained by halving every coordinate `levels` times (a box
    whose enclosure is too loose in one piece can still verify)."""
    subs = [[]]
    for x in X:
        lo, hi = x.lower(), x.upper()
        k = 2 ** levels
        cuts = [lo + (hi - lo) * i / k for i in range(k + 1)]
        pieces = [cuts[i].union(cuts[i + 1]) for i in range(k)]
        subs = [s + [p] for s in subs for p in pieces]
    Jh = None
    for sb in subs:
        J = J_of(sb)
        Jh = J if Jh is None else [[p.union(q) for p, q in zip(r1, r2)] for r1, r2 in zip(Jh, J)]
    return Jh


def krawczyk(X, levels=0):
    """X: list of arb balls.  Returns K(X) as list of arb."""
    J = J_of(X) if levels == 0 else J_hull(X, levels)
    m = [arb(x.mid()) for x in X]
    Em = E_of(m)
    Jm = [[mid_f(J[i][j]) for j in range(D)] for i in range(D)]
    C = float_inverse(Jm)
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

def strictly_inside(K, lohi):
    for k, (lo, hi) in zip(K, lohi):
        if not (k - arb(lo) > 0 and arb(hi) - k > 0):
            return False
    return True

def ball_inside_ball(a, b):
    """a subset of interior of b (as intervals)"""
    return (a.lower() - b.lower() > 0) and (b.upper() - a.upper() > 0)

def newton_refine(v, iters=60):
    """high-precision Newton from float guess, midpoints only"""
    v = [arb(x) for x in v]
    for _ in range(iters):
        vm = [arb(x.mid()) for x in v]
        E = E_of(vm)
        J = J_of(vm)
        Jm = arb_mat([[J[i][j].mid() for j in range(D)] for i in range(D)])
        rhs = arb_mat([[E[i].mid()] for i in range(D)])
        dx = Jm.solve(rhs)
        v = [arb((vm[i] - dx[i, 0]).mid()) for i in range(D)]
    return v

# ------------------------------------------------------------ stage 1: boxes

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
        if line.startswith('CERT'):
            t = [float.fromhex(x) if 'x' in x else float(x) for x in line.split()[1:]]
            boxes.append([(t[2 * i], t[2 * i + 1]) for i in range(D)])
        if line.startswith('UNRES'):
            raise SystemExit('unresolved box in ' + fn + ': the search did not complete')
print(f'N = {N}: {len(boxes)} certified boxes read')

sols = []   # each: dict with 'box' (lohi), 'tight' (list arb), 'z' (acb list)
for bi, lohi in enumerate(boxes):
    X = [ball_from_interval(lo, hi) for lo, hi in lohi]
    K = krawczyk(X)
    if not strictly_inside(K, lohi):
        K = krawczyk(X, levels=1)   # Jacobian hull over 2^D sub-boxes
    assert strictly_inside(K, lohi), f'arb Krawczyk failed on box {bi}'
    z = zfrom(X)
    assert (X[0] - z[N - 1].real) > 0, 'reduction condition Re z_N < x_1 fails'
    # refine to a tight enclosure inside the box
    v = newton_refine([mid_f(x) for x in X])
    r = arb(2) ** -200
    T = [arb(x.mid(), r) for x in v]
    KT = krawczyk(T)
    Tlohi = [(t.lower(), t.upper()) for t in T]
    ok = all(ball_inside_ball(k, t) for k, t in zip(KT, T))
    assert ok, f'tight Krawczyk failed on box {bi}'
    # T inside the box X (so it is the same, unique, solution)
    assert all(ball_inside_ball(t, x) for t, x in zip(KT, X)), 'tight enclosure not inside box'
    sols.append({'box': lohi, 'X': X, 'tight': KT})
print('arb re-verification: every box contains exactly one solution of E, and E = 0 implies (1) there')

# merge boxes that contain the same solution
def same_solution(a, b):
    # a's tight enclosure inside b's uniqueness box -> identical
    if all(ball_inside_ball(t, x) for t, x in zip(a['tight'], b['X'])):
        return True
    # disjoint tight enclosures -> different
    if any(not t.overlaps(u) for t, u in zip(a['tight'], b['tight'])):
        return False
    raise RuntimeError('cannot decide whether two boxes hold the same solution')

uniq = []
for s in sols:
    for u in uniq:
        if same_solution(s, u):
            break
    else:
        uniq.append(s)
print(f'distinct solutions in the reduced chart: {len(uniq)}')

# ------------------------------------------------------- stage 2: classes
def full_z(s):
    return zfrom(s['tight'])

def chart_coords(w):
    """w: acb list with w_1 real > 0 -> chart vector (length D)"""
    v = [w[0].real]
    for j in range(1, N - 1):
        v += [w[j].real, w[j].imag]
    return v

def image(z, perm, refl):
    """relabel z by perm (w_j = z_perm[j]), optionally conjugate, then rotate
    so that w_1 is real positive.  Returns None if |w_1| is not certainly > 0."""
    w = [z[perm[j]] for j in range(N)]
    if refl:
        w = [x.conjugate() for x in w]
    a = abs(w[0])
    if not a > 0:
        return None
    rot = w[0].conjugate() / a
    w = [x * rot for x in w]
    w[0] = acb(w[0].real, 0)   # imaginary part is exactly 0 (enclosure contains 0)
    return w

def maps_to(z, perm, refl, target):
    """True if (perm, refl) maps solution z exactly onto solution target;
    False if certainly not; raises if undecided."""
    # quick rotation-invariant test: moduli
    for j in range(N):
        if not abs(z[perm[j]]).overlaps(abs(target['zfull'][j])):
            return False
    w = image(z, perm, refl)
    if w is None:
        raise RuntimeError('undecided: relabelled vortex 1 may be at the origin')
    v = chart_coords(w)
    if any(not a.overlaps(b) for a, b in zip(v, target['tight'])):
        return False
    if all(ball_inside_ball(a, b) for a, b in zip(v, target['X'])):
        return True   # a zero of E inside target's uniqueness box: identical
    raise RuntimeError('undecided symmetry test')

for u in uniq:
    u['zfull'] = full_z(u)

perms = list(itertools.permutations(range(N)))
classes = []   # list of lists of indices into uniq
cls_of = [None] * len(uniq)
for i, u in enumerate(uniq):
    if cls_of[i] is not None:
        continue
    c = len(classes); classes.append([i]); cls_of[i] = c
    for j in range(i + 1, len(uniq)):
        if cls_of[j] is not None:
            continue
        for p in perms:
            if any(maps_to(u['zfull'], p, refl, uniq[j]) for refl in (False, True)):
                cls_of[j] = c; classes[c].append(j); break

print(f'classes modulo rotation, scaling, relabelling and reflection: {len(classes)}')

# exact identification of the classical configurations: each exact solution
# of (1) is mapped into the chart and shown to lie in the uniqueness box of a
# certified solution, which is therefore that exact configuration.
def exact_known():
    from flint import fmpz_poly, arb as A_
    I = arb(N * (N - 1)) / 2
    out = {}
    pi = arb.pi()
    r = (I / N).sqrt()
    out['regular %d-gon' % N] = [acb(r * (2 * pi * k / N).cos(), r * (2 * pi * k / N).sin()) for k in range(N)]
    r = (I / (N - 1)).sqrt()
    out['centred regular %d-gon' % (N - 1)] = [acb(0)] + [acb(r * (2 * pi * k / (N - 1)).cos(), r * (2 * pi * k / (N - 1)).sin()) for k in range(N - 1)]
    # Hermite H_N (physicists'): H_{n+1} = 2x H_n - 2n H_{n-1}; its zeros x_j
    # satisfy sum_{k != j} 1/(x_j - x_k) = x_j (Stieltjes), i.e. (1) on the line.
    x = fmpz_poly([0, 1])
    h0, h1 = fmpz_poly([1]), fmpz_poly([0, 2])
    for n in range(1, N):
        h0, h1 = h1, 2 * x * h1 - 2 * n * h0
    roots = h1.complex_roots()
    zs = []
    for rt, mult in roots:
        assert mult == 1
        zs.append(acb(rt.real))   # the zeros of H_N are real
    out['collinear (zeros of H_%d)' % N] = zs
    return out

known = exact_known()
known_class = {}
for name, zex in known.items():
    # it must be an exact solution of (1): check the enclosure of G contains 0
    for g in G_all(zex):
        assert g.real.contains(0) and g.imag.contains(0)
    hit = None
    for c, members in enumerate(classes):
        for i in members:
            for p in perms:
                # max-modulus vortex first, as in the chart
                try:
                    if maps_to(zex, p, False, uniq[i]) or maps_to(zex, p, True, uniq[i]):
                        hit = c
                        break
                except RuntimeError:
                    continue
            if hit is not None:
                break
        if hit is not None:
            break
    known_class[hit] = name
    print(f'exact {name}: {"is class %d" % hit if hit is not None else "NOT FOUND"}')
    assert hit is not None

# symmetry groups: rotations (orientation preserving) and reflections
results = []
for c, members in enumerate(classes):
    u = uniq[members[0]]
    z = u['zfull']
    rot_sym = [p for p in perms if maps_to(z, p, False, u)]
    ref_sym = [p for p in perms if maps_to(z, p, True, u)]
    # a class is chiral if its mirror image is not a relabelled rotation of itself
    chiral = len(ref_sym) == 0
    labelled = math.factorial(N) // len(rot_sym)   # labelled classes mod rotation (and scaling)
    if chiral:
        labelled *= 2   # the mirror class is distinct and has the same count
    results.append({'ref_sym_perms': [list(p) for p in ref_sym], 'rot_sym_perms': [list(p) for p in rot_sym],
                    'class': c, 'name': known_class.get(c, 'not a classical configuration'), 'members': members, 'rot_sym_order': len(rot_sym),
                    'ref_sym_count': len(ref_sym), 'chiral': chiral, 'labelled': labelled})

# ------------------------------------------------------ stage 3: Morse index
def hessW(z):
    """Hessian of W = sum_{j<k} log|z_j - z_k| - (1/2) sum |z_j|^2 on R^{2N},
    ordering (x_1, y_1, ..., x_N, y_N)."""
    n = 2 * N
    H = [[arb(0)] * n for _ in range(n)]
    for i in range(n):
        H[i][i] = arb(-1)
    for j in range(N):
        for k in range(j + 1, N):
            w = z[j] - z[k]
            a, b = w.real, w.imag
            r2 = a * a + b * b
            r4 = r2 * r2
            hxx = (b * b - a * a) / r4
            hxy = -2 * a * b / r4
            hyy = (a * a - b * b) / r4
            blk = [[hxx, hxy], [hxy, hyy]]
            for p in range(2):
                for q in range(2):
                    H[2 * j + p][2 * j + q] += blk[p][q]
                    H[2 * k + p][2 * k + q] += blk[p][q]
                    H[2 * j + p][2 * k + q] -= blk[p][q]
                    H[2 * k + p][2 * j + q] -= blk[p][q]
    return H

def inertia(H):
    """Certified inertia (n_pos, n_neg) of every symmetric matrix in the ball
    matrix H, by a congruence with a floating eigenbasis and Gershgorin;
    raises if undecided (a possible zero eigenvalue)."""
    import numpy as np
    n = len(H)
    Hm = np.array([[mid_f(H[i][j]) for j in range(n)] for i in range(n)])
    Hm = (Hm + Hm.T) / 2
    _, Q = np.linalg.eigh(Hm)
    Qa = [[arb(float(Q[i][j])) for j in range(n)] for i in range(n)]
    B = [[arb(0)] * n for _ in range(n)]
    HQ = [[sum((H[i][k] * Qa[k][j] for k in range(n)), arb(0)) for j in range(n)] for i in range(n)]
    for i in range(n):
        for j in range(n):
            B[i][j] = sum((Qa[k][i] * HQ[k][j] for k in range(n)), arb(0))
    pos = neg = 0
    for i in range(n):
        off = sum((abs(B[i][j]) for j in range(n) if j != i), arb(0))
        if B[i][i] - off > 0:
            pos += 1
        elif B[i][i] + off < 0:
            neg += 1
        else:
            raise RuntimeError('inertia undecided (Gershgorin disc meets 0)')
    return pos, neg

def morse_index(z):
    """Morse index of f = -sum log r_jk on the shape space {I = const}/rotations,
    at the relative equilibrium z (lambda = 1).  Equals the number of positive
    eigenvalues of Hess W; Hess W has eigenvalue -1 on translations, -2 on the
    scaling direction z, and 0 on the rotation direction iz.  The rank-one
    term -uu^T with u = iz/|iz| moves that 0 to -1, so the shifted matrix is
    nonsingular iff the critical point is nondegenerate."""
    H = hessW(z)
    n = 2 * N
    u = []
    for j in range(N):
        u += [-z[j].imag, z[j].real]   # i z_j = -y + i x
    nrm2 = sum((x * x for x in u), arb(0))
    Hs = [[H[i][j] - u[i] * u[j] / nrm2 for j in range(n)] for i in range(n)]
    pos, neg = inertia(Hs)
    assert pos + neg == n
    return pos

# ----------------------------------------------- stage 4: linear stability
def stability(z, index):
    """Linearization in the rotating frame: L = Jsym * Hess W with
    Jsym = blockdiag([[0, 1], [-1, 0]]).  Its characteristic polynomial is
    (mu^2 + 1) mu^2 p(mu) with deg p = 2N - 4 (translations give +-i, the
    scaling/rotation pair a double 0).  We divide out the exact factor and
    certify real roots of p: a sign change of p on the positive axis proves
    an eigenvalue > 0 (instability)."""
    H = hessW(z)
    n = 2 * N
    L = [[arb(0)] * n for _ in range(n)]
    for j in range(N):
        for c in range(n):
            L[2 * j][c] = H[2 * j + 1][c]
            L[2 * j + 1][c] = -H[2 * j][c]
    cp = arb_mat(L).charpoly()   # arb_poly, degree n
    coeffs = [cp[i] for i in range(n + 1)]
    # divide by mu^2 (mu^2 + 1) = mu^4 + mu^2 exactly: first by mu^2 (the two
    # lowest coefficients must be enclosures of 0), then by (mu^2 + 1)
    assert coeffs[0].contains(0) and coeffs[1].contains(0)
    q = coeffs[2:]                     # q(mu) = cp / mu^2, degree n-2
    # synthetic division of q by mu^2 + 1
    deg = len(q) - 1
    out = [arb(0)] * (deg - 1)
    rem = list(q)
    for d in range(deg, 1, -1):
        c = rem[d]
        out[d - 2] = c
        rem[d] -= c
        rem[d - 2] -= c
    assert rem[0].contains(0) and rem[1].contains(0)
    p = out   # degree 2N-4, coefficients low to high
    def peval(x):
        s = arb(0)
        for c in reversed(p):
            s = s * x + c
        return s
    # p is even (eigenvalues come in +-pairs): p(mu) = P(mu^2).  Real
    # eigenvalue pairs = positive roots of P; purely imaginary pairs =
    # negative roots.  Count sign changes of P on a grid, certified.
    P = [p[2 * i] for i in range(len(p) // 2 + 1)]
    for i in range(len(p)):
        if i % 2 == 1:
            assert p[i].contains(0)
    def Peval(t):
        s = arb(0)
        for c in reversed(P):
            s = s * t + c
        return s
    # find approximate roots with numpy, then certify each by a sign change
    import numpy as np
    Pm = [mid_f(c) for c in P]
    rts = np.roots(Pm[::-1])
    real_rts = sorted(r.real for r in rts if abs(r.imag) < 1e-8 * max(1, abs(r)))
    certified_pos, certified_neg = 0, 0
    eps_of = lambda r: 1e-6 * max(1.0, abs(r))
    for r1, r2 in zip(real_rts, real_rts[1:]):
        # the isolating intervals must be disjoint, or two sign changes could
        # belong to the same root
        if not r1 + eps_of(r1) < r2 - eps_of(r2):
            return {'real_pairs_certified': 0, 'imag_pairs_certified': 0, 'deg': len(P) - 1, 'P_roots_float': real_rts}
    for r in real_rts:
        eps = eps_of(r)
        a, b = arb(r - eps), arb(r + eps)
        va, vb = Peval(a), Peval(b)
        if (va > 0 and vb < 0) or (va < 0 and vb > 0):
            if r - eps > 0:
                certified_pos += 1
            elif r + eps < 0:
                certified_neg += 1
    deg_P = len(P) - 1
    return {'real_pairs_certified': certified_pos, 'imag_pairs_certified': certified_neg,
            'deg': deg_P, 'P_roots_float': real_rts}

total_labelled = 0
euler = 0
for r in results:
    u = uniq[r['members'][0]]
    z = u['zfull']
    idx = morse_index(z)
    r['morse_index'] = idx
    st = stability(z, idx)
    r['stability'] = {k: st[k] for k in ('real_pairs_certified', 'imag_pairs_certified', 'deg')}
    # index 0: Hess W is negative definite on the reduced space T, and T is
    # invariant under L = Jsym Hess W (Jsym is orthogonal and preserves the
    # span of the translations, z and iz), so L|T = Jsym|T S|T with S|T
    # definite: purely imaginary, semisimple spectrum (linear stability).
    r['linearly_stable_certified'] = (idx == 0) or st['imag_pairs_certified'] == st['deg']
    r['unstable_certified'] = st['real_pairs_certified'] > 0
    assert r['linearly_stable_certified'] or r['unstable_certified'], 'stability undecided'
    total_labelled += r['labelled']
    euler += (-1) ** idx * r['labelled']
    # descriptive data
    d = sorted(float(abs(z[j] - z[k]).mid()) for j in range(N) for k in range(j + 1, N))
    r['pair_distances'] = d
    r['z_approx'] = [[float(x.real.mid()), float(x.imag.mid())] for x in z]
    r['z_digits'] = [[x.real.str(30, radius=False), x.imag.str(30, radius=False)] for x in z]
    r['max_radius_enclosure'] = max(float(max(x.real.rad(), x.imag.rad())) for x in z)

print()
for r in results:
    print(f"class {r['class']} [{r['name']}]: labelled copies mod rotation = {r['labelled']}, rotation-symmetry order = {r['rot_sym_order']}, "
          f"mirror-symmetric = {not r['chiral']}, Morse index = {r['morse_index']}, "
          f"real eigenvalue pairs certified = {r['stability']['real_pairs_certified']}, "
          f"imaginary pairs certified = {r['stability']['imag_pairs_certified']} of {r['stability']['deg']}, "
          f"{'LINEARLY STABLE' if r['linearly_stable_certified'] else ('UNSTABLE' if r['unstable_certified'] else 'stability undecided')}")
    print('   z ~', ' '.join(f"({a:+.6f},{b:+.6f})" for a, b in r['z_approx']))
print()
print(f'total labelled relative equilibria modulo rotation and scaling: {total_labelled}')
print(f'sum of (-1)^index over them: {euler}')
chi = 1
for k in range(2, N):
    chi *= (1 - k)
print(f'Euler characteristic of the shape space, prod_(k=2)^(N-1) (1-k): {chi}')
# Morse theory (H proper and bounded below on the shape space, every critical
# point nondegenerate) forces sum (-1)^index = chi.  Not needed by the proof;
# a safety net that catches an exclusion bug removing a whole class.
assert euler == chi, 'Euler characteristic check FAILED: some class is missing or wrong'
print('Euler characteristic check passed')
print('Morse polynomial:', ' + '.join(f"{sum(r['labelled'] for r in results if r['morse_index'] == i)} t^{i}" for i in range(2 * N - 3)))
if jsonout:
    json.dump({'N': N, 'boxes': len(boxes), 'distinct_chart_solutions': len(uniq), 'classes': results,
               'total_labelled': total_labelled, 'euler_sum': euler, 'euler_characteristic': chi},
              open(jsonout, 'w'), indent=1)
