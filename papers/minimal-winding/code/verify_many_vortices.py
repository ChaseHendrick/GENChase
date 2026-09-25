#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
"""The numerical many-vortex collapses of Section 7 of the manuscript (paper/minimal-winding.tex), checked from the
stored configurations with an independent Biot-Savart law in mpmath. Run from any folder:
python3 code/verify_many_vortices.py (about a minute). These are numerical checks, not proofs; the
computer-assisted proofs of Section 7 are in certify_collapses.py.

Law: dz_j/dt = (i/2pi) sum_k G_k (z_j - z_k)|z_j - z_k|^(-alpha-2); a self-similar motion has dz_j/dt = kappa (z_j - z_c)
for every j, and P = |Im kappa|/(2|Re kappa|). For alpha = 0 this is conj(dz_j/dt) = (1/(2 pi i)) sum_k G_k/(z_j - z_k).

  1. Euler, the least values found for N = 7 to 12 (data/collapse-euler-n7-12.json), N = 33 and N = 61, two-arm minimizers refined at 60 digits (data/collapse-euler-n33.json,
     data/collapse-euler-n61.json), and N = 603 in binary64 (data/collapse-euler-n603.json): the residual
     max_j |v_j - kappa (z_j - z_c)| relative to |kappa| max_j |z_j - z_c|, the harmonic sum sum_{j<k} G_j G_k and the
     angular impulse relative to their scales, Re kappa < 0, P, and the closest pair.
  2. The two-arm family, N = 9, 11, ..., 603 (data/twoarm-family.json): the least-squares fit P = a + b/N + c/N^2 over
     N >= 301, and cubic Richardson extrapolation in 1/N through N = 101, 203, 403, 603.
  3. SQG (alpha = 1), N = 60, without rotation (data/collapse-sqg-n60-no-rotation.json, binary64): Newton's method
     at 60 digits on the similarity equations with kappa held real, from the stored point (minimum-norm steps,
     since the solutions form a family); then the residual, kappa < 0 (a collapse), the angular impulse and
     sum_{j<k} G_j G_k r_jk^-alpha, which every self-similar collapse makes vanish, and the closest pair.
The program exits with an error if any check fails; its output is data/verify_many_vortices.txt."""
import json
import os
from mpmath import mp, mpf, mpc, matrix, lu_solve, fabs, pi, fsum, nstr

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT = os.path.join(DATA, "verify_many_vortices.txt")
out, fails = [], []
def say(s): print(s); out.append(s)


def velocities(z, G, alpha):
    N = len(z)
    return [1j / (2 * pi) * fsum(G[k] * (z[j] - z[k]) * abs(z[j] - z[k]) ** (-alpha - 2) for k in range(N) if k != j)
            for j in range(N)]


def invariants(z, G, alpha, zc):
    """Angular impulse and the energy-type sum, each relative to the sum of the absolute values of its terms."""
    N = len(z)
    L = fsum(g * abs(p - zc) ** 2 for g, p in zip(G, z)) / fsum(abs(g) * abs(p - zc) ** 2 for g, p in zip(G, z))
    terms = [G[i] * G[j] * (1 if alpha == 0 else abs(z[i] - z[j]) ** (-alpha)) for i in range(N) for j in range(i + 1, N)]
    return L, fsum(terms) / fsum(abs(t) for t in terms)


# 1. Euler, N = 33, 61 and 603.
cases = json.load(open(os.path.join(DATA, "collapse-euler-n7-12.json")))["minima"]
cases += [json.load(open(os.path.join(DATA, f"collapse-euler-n{n}.json"))) for n in (33, 61, 603)]
for d in cases:
    n = int(d["N"])
    d.setdefault("dps", 16)                                            # the N = 603 point is binary64
    mp.dps = max(int(d["dps"]) + 5, 30)
    G = [mpf(g) for g in d["G"]]; z = [mpc(mpf(a), mpf(b)) for a, b in d["z"]]; N = len(G)
    zc = fsum(g * p for g, p in zip(G, z)) / fsum(G)
    v = velocities(z, G, 0)
    jf = max(range(N), key=lambda j: abs(z[j] - zc)); k = v[jf] / (z[jf] - zc); scale = abs(k) * abs(z[jf] - zc)
    res = max(abs(v[j] - k * (z[j] - zc)) for j in range(N)) / scale
    L, H = invariants(z, G, 0, zc)
    P = abs(k.imag) / (2 * abs(k.real))
    size = max(abs(p - zc) for p in z); dmin = min(abs(z[i] - z[j]) for i in range(N) for j in range(i + 1, N)) / size
    tol = mpf(10) ** (-(3 * int(d["dps"])) // 4)                     # 1e-45 at 60 digits, 1e-12 for binary64
    ok = (N == n and res < tol and fabs(L) < tol and fabs(H) < tol and k.real < 0
          and fabs(P - mpf(d["P"])) < tol and dmin > 1e-4 and all(g != 0 for g in G))
    if not ok: fails.append(1)
    say(f"[1] Euler, N = {N} (stored to {d['dps']} digits): residual {nstr(res, 3)} relative, sum G_j G_k {nstr(H, 3)} and angular impulse "
        f"{nstr(L, 3)} relative, Re kappa < 0: {k.real < 0}, P = {nstr(P, 20)}, closest pair {nstr(dmin, 3)} of the size, "
        f"circulations {nstr(min(G), 6)} to {nstr(max(G), 6)}: {'PASS' if ok else 'FAIL'}")

# 2. The two-arm family and its limit (numerical extrapolation, not a proof).
fam = json.load(open(os.path.join(DATA, "twoarm-family.json")))
mp.dps = 30
NP = [(int(n), mpf(p)) for n, p in zip(fam["N"], fam["P"])]
tail = [(n, p) for n, p in NP if n >= 301]
A = matrix([[1, mpf(1) / n, mpf(1) / n ** 2] for n, _ in tail]); y = matrix([p for _, p in tail])
coef = lu_solve(A.T * A, A.T * y)
rms = (fsum((p - (coef[0] + coef[1] / n + coef[2] / n ** 2)) ** 2 for n, p in tail) / len(tail)) ** 0.5
pts = {n: p for n, p in NP}
xs = [mpf(1) / n for n in (101, 203, 403, 603)]; ys = [pts[n] for n in (101, 203, 403, 603)]
rich = mpf(0)                                                       # value at 1/N = 0 of the cubic through the four points
for i in range(4):
    li = mpf(1)
    for j in range(4):
        if j != i:
            li *= (0 - xs[j]) / (xs[i] - xs[j])
    rich += ys[i] * li
mono = all(NP[i + 1][1] < NP[i][1] for i in range(len(NP) - 1))
ok = mono and abs(coef[0] - mpf("0.47736")) < 2e-5 and rms < 1e-8 and abs(rich - mpf("0.47736")) < 2e-5
if not ok: fails.append(2)
say(f"[2] two-arm family, {len(NP)} members N = {NP[0][0]}..{NP[-1][0]}: P decreasing in N: {mono}; fit over N >= 301 "
    f"({len(tail)} members): P = {nstr(coef[0], 7)} + {nstr(coef[1], 5)}/N + {nstr(coef[2], 3)}/N^2, rms {nstr(rms, 2)}; cubic "
    f"Richardson in 1/N through N = 101, 203, 403, 603: {nstr(rich, 7)}: {'PASS' if ok else 'FAIL'}")

# 3. SQG, N = 60, kappa real.
d = json.load(open(os.path.join(DATA, "collapse-sqg-n60-no-rotation.json")))
dps = 60; mp.dps = dps
alpha, N = mpf(d["alpha"]), int(d["N"])
z = [mpc(mpf(a), mpf(b)) for a, b in d["z"]]; G = [mpf(g) for g in d["G"]]
a0, b0 = z[0], z[1] - z[0]                                          # gauge: z_1 = 0, z_2 = 1, G_1 = 1
z = [(p - a0) / b0 for p in z]; G = [g / G[0] for g in G]


def unpack(u):
    zz = [mpc(0), mpc(1)] + [mpc(u[2 * i], u[2 * i + 1]) for i in range(N - 2)]
    return zz, [mpf(1)] + list(u[2 * (N - 2):2 * (N - 2) + N - 1]), u[-1]


def residual(u):                                                    # v_j - v_1 = kappa (z_j - z_1), kappa real
    zz, GG, k = unpack(u)
    v = velocities(zz, GG, alpha)
    F = []
    for j in range(1, N):
        e = v[j] - v[0] - k * (zz[j] - zz[0])
        F += [e.real, e.imag]
    return F


v = velocities(z, G, alpha)
k0 = fsum((v[j] - v[0]) * (z[j] - z[0]).conjugate() for j in range(1, N)) / fsum(abs(z[j] - z[0]) ** 2 for j in range(1, N))
u = []
for p in z[2:]:
    u += [p.real, p.imag]
u += G[1:] + [k0.real]
h, history = mpf(10) ** (-(dps // 2)), []
for _ in range(8):
    F = residual(u)
    history.append(max(fabs(f) for f in F))
    if history[-1] < mpf(10) ** (-dps + 5):
        break
    J = matrix(len(F), len(u))
    for i in range(len(u)):
        up = list(u); up[i] += h
        Fp = residual(up)
        for r in range(len(F)):
            J[r, i] = (Fp[r] - F[r]) / h
    step = J.T * lu_solve(J * J.T, matrix(F))
    u = [u[i] - step[i] for i in range(len(u))]
zz, GG, k = unpack(u)
v = velocities(zz, GG, alpha)
zc = fsum(g * p for g, p in zip(GG, zz)) / fsum(GG)
res = max(abs(v[j] - k * (zz[j] - zc)) for j in range(N)) / max(abs(x) for x in v)
L, H = invariants(zz, GG, alpha, zc)
size = max(abs(p - zc) for p in zz); dmin = min(abs(zz[i] - zz[j]) for i in range(N) for j in range(i + 1, N)) / size
span = max(abs(g) for g in GG) / min(abs(g) for g in GG)
ok = (res < mpf(10) ** (-dps + 10) and k < 0 and fabs(L) < mpf(10) ** (-dps + 10) and fabs(H) < mpf(10) ** (-dps + 10)
      and dmin > 1e-4 and all(g != 0 for g in GG) and fabs(fsum(GG)) > 0.1)
if not ok: fails.append(3)
say(f"[3] SQG, N = {N}, kappa held real, {dps} digits: Newton residuals {' '.join(nstr(x, 2) for x in history)}; "
    f"similarity residual {nstr(res, 3)} relative, kappa = {nstr(k, 8)} < 0 (a collapse without rotation, P = 0), "
    f"angular impulse {nstr(L, 3)} and sum G_j G_k r_jk^-1 {nstr(H, 3)} relative, closest pair {nstr(dmin, 3)} of the size, "
    f"circulations spanning a factor {nstr(span, 3)}: {'PASS' if ok else 'FAIL'}")
open(OUT, "w").write("\n".join(out) + "\n")
if fails:
    raise SystemExit(f"FAILED: checks {sorted(set(fails))}")
