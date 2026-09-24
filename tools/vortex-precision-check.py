#!/usr/bin/env python3
"""Independent high-precision check of vortex-collapse minima.

    python3 tools/vortex-precision-check.py experiments/results/vortex-collapse/*.json [--dps 60]

Reimplements the alpha-model Biot-Savart law in mpmath, separately from tools/vortex-collapse-search.js. For each
certified minimum in the files, it Newton-polishes the similarity equations v_j = kappa (z_j - z_c) at the requested
precision. Only positions and circulations are taken from the file; kappa is recomputed. A zero-winding collapse is
polished with kappa held real. The check reports:

- the final residual relative to the largest velocity;
- P recomputed at high precision;
- the angular impulse and the energy, which any self-similar collapse must make vanish.

Quadratic convergence from the binary64 point to a residual near 10^-dps is strong numerical evidence that a true
solution lies there. It is not an interval-arithmetic proof. Requires mpmath (pip install mpmath).
"""
import json, sys
from mpmath import mp, mpf, mpc, matrix, lu_solve, fabs, pi


def check(path, dps):
    data = json.load(open(path))
    alpha, N = mpf(str(data["alpha"])), int(data["N"])
    rows = []
    for m in data.get("minima", []):
        zero = m.get("status") == "zero-winding" or float(m["P"]) < 1e-12
        z = [mpc(mpf(repr(a)), mpf(repr(b))) for a, b in m["config"]["z"]]
        G = [mpf(repr(g)) for g in m["config"]["G"]]
        # Gauge: z_1 = 0, z_2 = 1, G_1 = 1.
        a, b = z[0], z[1] - z[0]
        z = [(p - a) / b for p in z]
        G = [g / G[0] for g in G]

        def vel(zz, GG):
            return [1j / (2 * pi) * sum(GG[k] * (zz[j] - zz[k]) * abs(zz[j] - zz[k]) ** (-alpha - 2) for k in range(N) if k != j) for j in range(N)]

        def unpack(u):
            zz = [mpc(0), mpc(1)] + [mpc(u[2 * i], u[2 * i + 1]) for i in range(N - 2)]
            GG = [mpf(1)] + list(u[2 * (N - 2):2 * (N - 2) + N - 1])
            k = mpc(u[-1], 0) if zero else mpc(u[-2], u[-1])
            return zz, GG, k

        def residual(u):
            zz, GG, k = unpack(u)
            v = vel(zz, GG)
            out = []
            for j in range(1, N):
                e = v[j] - v[0] - k * (zz[j] - zz[0])
                out += [e.real, e.imag]
            return out

        v = vel(z, G)
        num = sum((v[j] - v[0]) * (z[j] - z[0]).conjugate() for j in range(1, N))
        den = sum(abs(z[j] - z[0]) ** 2 for j in range(1, N))
        k0 = num / den
        u = []
        for p in z[2:]:
            u += [p.real, p.imag]
        u += G[1:] + ([k0.real] if zero else [k0.real, k0.imag])
        n, m_eq, h = len(u), 2 * (N - 1), mpf(10) ** (-(dps // 2))
        history = []
        for _ in range(12):
            F = residual(u)
            history.append(max(fabs(f) for f in F))
            if history[-1] < mpf(10) ** (-dps + 5):
                break
            J = matrix(m_eq, n)
            for i in range(n):
                up = list(u)
                up[i] += h
                Fp = residual(up)
                for r in range(m_eq):
                    J[r, i] = (Fp[r] - F[r]) / h
            step = J.T * lu_solve(J * J.T, matrix(F))
            u = [u[i] - step[i] for i in range(n)]
        zz, GG, k = unpack(u)
        v = vel(zz, GG)
        zc = zz[0] - v[0] / k
        scale = max(abs(x) for x in v)
        res = max(abs(v[j] - k * (zz[j] - zc)) for j in range(N)) / scale
        P = abs(k.imag) / (2 * abs(k.real))
        Iabs = sum(abs(g) * abs(p - zc) ** 2 for g, p in zip(GG, zz))
        I = sum(g * abs(p - zc) ** 2 for g, p in zip(GG, zz)) / Iabs
        pairs = [(i, j) for i in range(N) for j in range(i + 1, N)]
        term = lambda i, j: GG[i] * GG[j] * (1 if alpha == 0 else abs(zz[i] - zz[j]) ** (-alpha))
        H = sum(term(i, j) for i, j in pairs) / sum(abs(term(i, j)) for i, j in pairs)
        ok = res < mpf(10) ** (-dps + 10) and fabs(P - mpf(repr(m["P"]))) < mpf("1e-9") and fabs(I) < mpf(10) ** (-dps + 10) and fabs(H) < mpf(10) ** (-dps + 10)
        rows.append(ok)
        print(f"{path.split('/')[-1]} alpha={data['alpha']} N={N}: P = {mp.nstr(P, 25)} (file {m['P']}), "
              f"residual {mp.nstr(res, 3)}, angular impulse {mp.nstr(I, 3)}, energy {mp.nstr(H, 3)}, "
              f"Newton {' '.join(mp.nstr(x, 2) for x in history)}{', kappa held real' if zero else ''}: {'PASS' if ok else 'FAIL'}")
    return rows


if __name__ == "__main__":
    args = sys.argv[1:]
    dps = 60
    if "--dps" in args:
        i = args.index("--dps")
        dps = int(args[i + 1])
        del args[i:i + 2]
    mp.dps = dps
    results = [ok for f in args for ok in check(f, dps)]
    print(f"{sum(results)} of {len(results)} minima pass at {dps} digits.")
    sys.exit(0 if results and all(results) else 1)
