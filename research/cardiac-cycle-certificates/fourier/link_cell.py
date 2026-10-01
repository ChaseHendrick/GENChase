"""Link the two cell certificates: is the Fourier orbit's section point inside the CAPD ball? (exact rationals)

Theorem A(i) (results/cell-gks0.0275.json, CAPD) proves: the first-return map g to the section {V = s}, crossed
upward, maps the ball B = {xhat + A(0, y) : ||y_b||_2 <= rho_b for every block b} into itself and is a contraction
there, so it has exactly one fixed point x_c in B. Here xhat, the frame A = [[1, 0], [0, At]] and the blocks and radii
are those of the frame file candidates/cell_frameF.txt, whose SHA-256 the CAPD record stores; everything is in the
scaled variables z = x / sigma (model/scales.txt), as in the Fourier programs.

Theorem A(ii) (results/fourier-existence-N1.json) proves: a periodic orbit O_F = {phi_*(theta)} with
phi_*(theta) = sum_m a*_m e^{i m theta}, ||a*_k - abar_k||_nu <= r_ex for every component k (weights 1, nu >= 1), and
phi_{*,V}(0) = s / sigma_V exactly (the phase condition), where abar is the exact centre
fourier/data/centre_N1_K32.json, whose SHA-256 the Fourier record stores.

Claim checked here. p := phi_*(0) lies in B. Proof of the consequence (written out in the paper, Theorem A): p is on
the section; since g maps B into B, g^k(p) is in B for all k, and g^k(p) -> x_c by the contraction. Each g^k(p) lies on
the closed set O_F (g follows the flow from p), so x_c lies on O_F, and the orbit of x_c, which is the CAPD orbit, is
O_F. So the two certificates enclose the same periodic orbit; its period lies in both period enclosures (checked
below as well: the Fourier interval lies inside the CAPD interval).

How. |p_k - pbar_k| <= sum_m |a*_{k,m} - abar_{k,m}| <= ||a*_k - abar_k||_nu <= r_ex for the free components k = 1..17,
where pbar = phibar(0) = abar_0 + 2 Re sum_{m=1}^{K} abar_m is an exact rational. With d = p_free - xhat_free and
y = At^{-1} d: At is read as the doubles the C++ verifier reads (Python's float() and C++ stream extraction both round
correctly to nearest), inverted EXACTLY in rational arithmetic; y = At^{-1}(pbar_free - xhat_free) + At^{-1} e with
|e_k| <= r_ex, so |y_k - yc_k| <= r_ex * sum_j |(At^{-1})_{kj}|. Then for each block b,
||y_b||_2 <= ||yc_b||_2 + ||delta_b||_2, and both square roots are bounded above exactly (integer square roots), and
the bound must be < rho_b. No floating-point number enters a decision. Exit status 0 only if every check passes.

Usage: python3 fourier/link_cell.py   (from the study root; standard library only, a few seconds)
"""
import hashlib
import json
import math
import os
import sys
from fractions import Fraction as Q

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CELL = os.path.join(ROOT, "results", "cell-gks0.0275.json")
FOUR = os.path.join(ROOT, "results", "fourier-existence-N1.json")
FRAME = os.path.join(ROOT, "candidates", "cell_frameF.txt")


def sha(p):
    with open(p, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def hexq(t):
    """Exact rational of '<sign>0x<hex>p<exp>' (dyadic text of the Fourier files)."""
    t = t.strip()
    neg = t.startswith("-")
    if neg:
        t = t[1:]
    h, e = t[2:].split("p")
    v = Q(int(h, 16)) * (Q(2) ** int(e))
    return -v if neg else v


def floathex(t):
    """Exact rational of a C99 hex float such as 0x1.acaf249c533cfp+5."""
    return Q(float.fromhex(t))


def sqrt_up(x, bits=200):
    """An upper bound of sqrt(x) for a rational x >= 0 (exact integer arithmetic)."""
    s = 2 ** bits
    n = x.numerator * s * s
    d = x.denominator
    r = math.isqrt(n // d + 1) + 1          # r^2 >= n/d + 1 > x * s^2
    return Q(r, s)


def inverse(M):
    n = len(M)
    A = [row[:] + [Q(int(i == j)) for j in range(n)] for i, row in enumerate(M)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(A[r][c]))
        if A[p][c] == 0:
            raise SystemExit("FAIL: frame matrix singular")
        A[c], A[p] = A[p], A[c]
        piv = A[c][c]
        A[c] = [v / piv for v in A[c]]
        for r in range(n):
            if r != c and A[r][c] != 0:
                f = A[r][c]
                A[r] = [a - f * b for a, b in zip(A[r], A[c])]
    return [row[n:] for row in A]


def main():
    ok = True

    def check(cond, msg):
        nonlocal ok
        print(("PASS " if cond else "FAIL ") + msg)
        ok = ok and cond

    cell, four = json.load(open(CELL)), json.load(open(FOUR))
    check(cell["verified"] is True, "CAPD cell record says verified")
    check(sha(FRAME) == cell["hashes"]["frame"], "frame file is the one the CAPD record hashes")
    cpath = os.path.join(ROOT, four["centre_file"])
    check(sha(cpath) == four["centre_sha256"], "centre file is the one the Fourier record hashes")
    check(four["N"] == 1, "Fourier record is the single cell")

    # period enclosures
    clo, chi = (floathex(t) for t in cell["verifier"]["period_exact"])
    flo, fhi = hexq(four["T_ms"]["lower"]["hex"]), hexq(four["T_ms"]["upper"]["hex"])
    check(clo <= flo and fhi <= chi, "Fourier period interval lies inside the CAPD period interval")

    # frame
    lines = open(FRAME).read().split("\n")
    head = lines[0].split()
    check(head == ["1", "0.0275", "0.0275", "0", "1"], "frame header: N = 1, G_Ks = 0.0275, no coupling")
    toks = " ".join(lines[1:]).split()
    xhat = [Q(float(t)) for t in toks[:18]]
    pos = 18
    n = 17
    At = [[Q(float(toks[pos + 17 * i + k])) for k in range(n)] for i in range(n)]
    pos += n * n
    nb = int(toks[pos]); pos += 1
    blocks = []
    for _ in range(nb):
        blocks.append((int(toks[pos]), Q(float(toks[pos + 1])))); pos += 2
    check(pos == len(toks), "frame file fully read")
    check(sum(b for b, _ in blocks) == n, "blocks cover the 17 free coordinates")
    rec_radii = cell["verifier"]["radii"]
    check([float(r) for _, r in blocks] == rec_radii and [b for b, _ in blocks] == cell["verifier"]["block_sizes"],
          "blocks and radii equal those in the CAPD record")

    # Fourier section point
    rec = json.load(open(cpath))
    K = int(rec["K"])
    a = rec["a"]
    pbar = []
    for i in range(18):
        v = hexq(a[i][0][0])
        for m in range(1, K + 1):
            v += 2 * hexq(a[i][m][0])
        pbar.append(v)
    rex = hexq(four["r_existence"]["hex"])
    level = xhat[0]
    check(level == 4 * Q(0.2), "xhat_V = s / sigma_V exactly (the section level)")
    # p_V = s / sigma_V holds exactly for the true zero (F_ph = 0), not for the centre; the V component of p is not a
    # free coordinate of the section, so only the free components enter below.
    print(f"  (centre only, not used: |phibar_V(0) - s/sigma_V| = {float(abs(pbar[0] - level)):.3e})")
    print(f"  r_ex = {float(rex):.6e}; |pbar - xhat|_inf over free components = "
          f"{float(max(abs(pbar[k] - xhat[k]) for k in range(1, 18))):.3e}")

    Ainv = inverse(At)
    d = [pbar[k + 1] - xhat[k + 1] for k in range(n)]
    yc = [sum(Ainv[i][j] * d[j] for j in range(n)) for i in range(n)]
    dev = [rex * sum(abs(Ainv[i][j]) for j in range(n)) for i in range(n)]
    start = 0
    worst = Q(0)
    for b, (bs, rho) in enumerate(blocks):
        idx = range(start, start + bs)
        start += bs
        nc = sqrt_up(sum(yc[k] ** 2 for k in idx))
        nd = sqrt_up(sum(dev[k] ** 2 for k in idx))
        ratio = (nc + nd) / rho
        worst = max(worst, ratio)
        check(nc + nd < rho, f"block {b:2d} (size {bs}): ||y_b||_2 <= {float(nc + nd):.3e} < rho_b = {float(rho):.3e}"
              f"  (ratio <= {float(ratio):.3e})")
    print(f"  worst ratio ||y_b|| / rho_b <= {float(worst):.3e}")
    # negative control: the same test against radii shrunk by 10 must fail (block 7's ratio is about 0.14)
    start, fails = 0, 0
    for bs, rho in blocks:
        idx = range(start, start + bs)
        start += bs
        if not (sqrt_up(sum(yc[k] ** 2 for k in idx)) + sqrt_up(sum(dev[k] ** 2 for k in idx)) < rho / 10):
            fails += 1
    check(fails > 0, f"negative control: with every radius divided by 10 the test fails ({fails} block(s))")
    print("LINKED: the Fourier orbit's section point lies in the CAPD ball; the two certificates enclose the same orbit"
          if ok else "NOT LINKED")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
