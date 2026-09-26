"""Describe each certified class geometrically (numerical description of
the certified enclosures; the enclosures themselves are in the JSON file).
Rotates each configuration so that a mirror axis is the real axis, and
reports the convex hull and the vortices on the axis.
Usage: python3 describe.py ../data/n5_classes.json"""
import json, sys, cmath, math
import numpy as np
from mpmath import mp, mpf, mpc
mp.dps = 40
d = json.load(open(sys.argv[1]))
for r in d['classes']:
    z = [mpc(mpf(a), mpf(b)) for a, b in r['z_digits']]
    N = len(z)
    line = f"class {r['class']} [{r['name']}], Morse index {r['morse_index']}, {r['labelled']} labelled copies"
    print(line)
    if r['ref_sym_perms']:
        p = r['ref_sym_perms'][0]
        # the reflection: conj(z_{p[j]}) * c = z_j for a unit c; c = e^{2 i theta}
        j = max(range(N), key=lambda k: abs(z[k]))
        c = z[j] / mp.conj(z[p[j]])
        c = c / abs(c)
        th = mp.arg(c) / 2
        w = [x * mp.expj(-th) for x in z]
        err = max(abs(w[k] - mp.conj(w[p[k]])) for k in range(N))
        on_axis = [k for k in range(N) if p[k] == k]
        print(f"   mirror axis: vortices on it = {len(on_axis)}, pairs swapped = {(N - len(on_axis)) // 2} (residual {float(err):.1e})")
    else:
        w = z
    pts = np.array([[float(x.real), float(x.imag)] for x in w])
    # convex hull (monotone chain)
    P = sorted(range(N), key=lambda k: (pts[k][0], pts[k][1]))
    def cross(o, a, b):
        return (pts[a][0] - pts[o][0]) * (pts[b][1] - pts[o][1]) - (pts[a][1] - pts[o][1]) * (pts[b][0] - pts[o][0])
    lower, upper = [], []
    for k in P:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], k) <= 1e-12: lower.pop()
        lower.append(k)
    for k in reversed(P):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], k) <= 1e-12: upper.pop()
        upper.append(k)
    hull = lower[:-1] + upper[:-1]
    print(f"   convex hull: {len(hull)} vertices, {N - len(hull)} interior")
    order = sorted(range(N), key=lambda k: (-abs(w[k]), float(w[k].imag)))
    for k in order:
        print(f"     z = {mp.nstr(w[k].real, 15):>20} {mp.nstr(w[k].imag, 15):>20} i   |z| = {mp.nstr(abs(w[k]), 12)}{'  (hull)' if k in hull else '  (interior)'}")
    dist = sorted(float(abs(z[a] - z[b])) for a in range(N) for b in range(a + 1, N))
    print('   pair distances:', ' '.join(f'{x:.6f}' for x in dist))
