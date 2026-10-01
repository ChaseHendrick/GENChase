"""Compare the CAPD 19-state field (pilot/tp06_19d_capd.hpp, via compare_rhs19.cpp) with ap-reentry/tp06_19d.py.

Points: (1) the 21 ring states of the pilot window (N = 16, c = 0.035, the window's branch mask; written by
window.py), (2) 40 random single-cell states on each side of -40 mV with the matching branch, (3) the window start
state with every cell's branch flipped (both branch functions exercised on ring states, outside their domain of use).

Checks, per component:
  * double: |CAPD double - tp06_19d.field| / |tp06_19d.field| (relative; reported as the worst value and as the
    worst value relative to the largest term magnitude, for components that cancel);
  * interval: the CAPD interval enclosure must contain a 50-digit mpmath evaluation of the same model with exact
    decimal constants. That evaluation runs tp06_19d.py itself: its source is parsed and every float literal
    (e.g. 0.016404, 3.1e5) is replaced by mpmath.mpf of its decimal text, numpy by mpmath scalar functions and
    exprel(z) by expm1(z)/z. So the reference is the decimal model the CAPD field encloses, evaluated at the same
    double input, with error about 1e-48 relative; containment is checked with no tolerance beyond 1e-40 relative.
This is a translation check, not a proof that the enclosures are tight.
Usage: python3 compare_rhs19.py <compare_rhs19 binary> <window_states.txt> <window_start.txt>
"""
import ast, json, os, random, subprocess, sys, types
import numpy as np
import mpmath as mp

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "tp06_19d.py")
sys.path.insert(0, os.path.join(HERE, ".."))
import tp06_19d as M  # noqa: E402

mp.mp.dps = 50
N, C = 16, 0.035


def exact_decimal_module():
    src = open(SRC).read()
    tree = ast.parse(src)

    class T(ast.NodeTransformer):
        def visit_Constant(self, node):
            if isinstance(node.value, float):
                seg = ast.get_source_segment(src, node)
                call = ast.Call(func=ast.Name("_D", ast.Load()), args=[ast.Constant(seg)], keywords=[])
                return ast.copy_location(call, node)
            return node
    tree = ast.fix_missing_locations(T().visit(tree))
    ns = {"_D": lambda s: mp.mpf(s), "__name__": "tp06_19d_mp"}
    exec(compile(tree, SRC, "exec"), ns)
    shim = types.SimpleNamespace(exp=mp.exp, log=mp.log, sqrt=mp.sqrt,
                                 where=lambda c, a, b: a if c else b,
                                 asarray=lambda Y, dtype=None: list(Y),
                                 empty_like=lambda Y: [None] * len(Y),
                                 array=np.array)
    ns["np"] = shim
    ns["exprel"] = lambda z: mp.expm1(z) / z if z != 0 else mp.mpf(1)
    return ns


MPM = exact_decimal_module()
p_f = M.params("author")
p_mp = MPM["params"]("author")
c_mp = mp.mpf("0.035")


def ref_double(Y, lo, n):
    """Y: (19, n) state-major; returns (19, n) and the magnitude of the largest term per component."""
    if n == 1:
        f = M.field(Y[:, 0], p_f, lo=lo[0])
        return f[:, None]
    V = Y[0]
    cpl = C * ((np.roll(V, -1) - V) + (np.roll(V, 1) - V))
    return M.field(Y, p_f, coupling=cpl, lo=lo)


def ref_mp(Y, lo, n):
    out = np.empty((19, n), dtype=object)
    for k in range(n):
        y = [mp.mpf(float(v)) for v in Y[:, k]]
        cpl = None
        if n > 1:
            Vl, V, Vr = mp.mpf(float(Y[0, (k - 1) % n])), y[0], mp.mpf(float(Y[0, (k + 1) % n]))
            cpl = c_mp * (Vr - 2 * V + Vl)
        f = MPM["field"](y, p_mp, coupling=cpl if cpl is not None else 0, lo=bool(lo[k]))
        out[:, k] = f
    return out


def term_scale(Y, lo, n):
    """Per component, the sum of the absolute values of the terms that make it up (shape (19, n)), so that a
    difference can be judged against the cancellation inside the component (e.g. m_inf - m for a resting cell)."""
    Yc = Y if n > 1 else Y[:, 0]
    loc = lo if n > 1 else lo[0]
    q = M.currents(Yc, p_f, lo=loc)
    V, Xr1, Xr2, Xs, m, h, j, d, f, f2, fCass, s, r, Rp, Ca_i, Ca_sr, Ca_ss, Na_i, K_i = Yc
    A, b = np.abs, p_f["Cm_flux"]
    cpl = 0.0
    if n > 1:
        cpl = A(C * ((np.roll(V, -1) - V) + (np.roll(V, 1) - V)))
    tot = sum(A(q[k]) for k in ("i_K1", "i_to", "i_Kr", "i_Ks", "i_CaL", "i_NaK", "i_Na", "i_b_Na", "i_NaCa",
                                "i_b_Ca", "i_p_K", "i_p_Ca")) + cpl
    out = [tot]
    for g, inf, tau in (("Xr1", "xr1_inf", "tau_xr1"), ("Xr2", "xr2_inf", "tau_xr2"), ("Xs", "xs_inf", "tau_xs"),
                        ("m", "m_inf", "tau_m"), ("h", "h_inf", "tau_h"), ("j", "j_inf", "tau_j"),
                        ("d", "d_inf", "tau_d"), ("f", "f_inf", "tau_f"), ("f2", "f2_inf", "tau_f2"),
                        ("fCass", "fCass_inf", "tau_fCass"), ("s", "s_inf", "tau_s"), ("r", "r_inf", "tau_r")):
        out.append((A(q[inf]) + A(Yc[M.IDX[g]])) / A(q[tau]))
    out.append(A(q["k2"] * Ca_ss * Rp) + A(0.005 * (1 - Rp)))
    out.append(q["bufc"] * ((A(q["i_leak"]) + A(q["i_up"])) * M.V_sr / M.V_c + A(q["i_xfer"])
                            + b * (A(q["i_b_Ca"]) + A(q["i_p_Ca"]) + 2 * A(q["i_NaCa"])) / (2 * M.V_c * M.FF)))
    out.append(q["bufsr"] * (A(q["i_up"]) + A(q["i_rel"]) + A(q["i_leak"])))
    out.append(q["bufss"] * (b * A(q["i_CaL"]) / (2 * M.V_ss * M.FF) + A(q["i_rel"]) * M.V_sr / M.V_ss
                             + A(q["i_xfer"]) * M.V_c / M.V_ss))
    out.append(b * (A(q["i_Na"]) + A(q["i_b_Na"]) + 3 * A(q["i_NaK"]) + 3 * A(q["i_NaCa"])) / (M.V_c * M.FF))
    out.append(b * (A(q["i_K1"]) + A(q["i_to"]) + A(q["i_Kr"]) + A(q["i_Ks"]) + 2 * A(q["i_NaK"]) + A(q["i_p_K"]))
               / (M.V_c * M.FF))
    return np.array([np.broadcast_to(np.asarray(v, float), (n,)) for v in out])


records, meta = [], []
W = np.loadtxt(sys.argv[2])
lines = open(sys.argv[3]).read().split("\n")
lo_win = np.array([int(v) for v in lines[1].split()], bool)
for s, x in enumerate(W):
    records.append((16, lo_win, x.reshape(19, N)))
    meta.append("window state %d" % s)
xs = np.array([float(v) for v in lines[2].split()])
records.append((16, ~lo_win, xs.reshape(19, N)))
meta.append("window start, branches flipped")
random.seed(20261001)
for side in ("low", "high"):
    for _ in range(40):
        V = random.uniform(-90, -40.001) if side == "low" else random.uniform(-40, 40)
        if abs(V - 15) < 0.5:
            V = 15.5
        gates = [random.uniform(0.001, 0.999) for _ in range(13)]
        conc = [random.uniform(5e-5, 1.2e-3), random.uniform(1, 4.5), random.uniform(2e-4, 2.0), random.uniform(5, 15),
                random.uniform(125, 145)]
        records.append((1, np.array([side == "low"]), np.array([V] + gates + conc)[:, None]))
        meta.append("random single cell, branch " + side)

inp = []
for n, lo, Y in records:
    xcm = Y.T.ravel()  # cell-major
    inp.append("%d %s %s" % (n, " ".join(str(int(b)) for b in lo), " ".join(repr(float(v)) for v in xcm)))
out = subprocess.run([sys.argv[1]], input="\n".join(inp) + "\n", capture_output=True, text=True, check=True).stdout
rows = [list(map(float, l.split())) for l in out.split("\n") if l.strip()]

worst_rel, worst_rel_scaled, misses, k0 = 0.0, 0.0, [], 0
worst_where = None


def group_of(what):
    return "window states" if what.startswith("window state ") else what


max_width_rel = 0.0
large = []
per_group = {}
for (n, lo, Y), what in zip(records, meta):
    fd = ref_double(Y, lo, n)
    fm = ref_mp(Y, lo, n)
    sc = term_scale(Y, lo, n)
    for k in range(n):
        for a in range(19):
            d, lo_b, hi_b = rows[k0 + 19 * k + a]
            ref = float(fd[a, k])
            rel = abs(d - ref) / max(abs(ref), 1e-300)
            if rel > worst_rel:
                worst_rel, worst_where = rel, (what, k, M.NAMES[a], d, ref)
            v = fm[a, k]
            worst_rel_scaled = max(worst_rel_scaled, abs(d - ref) / max(abs(ref), sc[a, k]))
            if rel > 1e-12:  # where the plain relative difference is large, compare both doubles with the 50-digit value
                large.append(dict(what=what, cell=k, state=M.NAMES[a], capd_double=d, python_double=ref,
                                  mp=float(v), capd_err_rel=float(abs(d - v) / abs(v)), python_err_rel=float(abs(ref - v) / abs(v)),
                                  term_scale_over_value=float(sc[a, k] / abs(v))))
            tol = mp.mpf("1e-40") * abs(v)
            if not (mp.mpf(lo_b) - tol <= v <= mp.mpf(hi_b) + tol):
                misses.append((what, k, M.NAMES[a], lo_b, hi_b, float(v)))
            if what.startswith("window state"):
                max_width_rel = max(max_width_rel, (hi_b - lo_b) / max(abs(float(v)), 1e-300))
            g = group_of(what)
            pg = per_group.setdefault(g, dict(points=0, components=0, worst_rel_double=0.0, enclosure_misses=0))
            pg["components"] += 1
            pg["worst_rel_double"] = max(pg["worst_rel_double"], rel)
            if misses and misses[-1][:3] == (what, k, M.NAMES[a]):
                pg["enclosure_misses"] += 1
    per_group[group_of(what)]["points"] += 1
    k0 += 19 * n
for m_ in misses:
    print("outside enclosure:", m_)
res = dict(note="Translation check of pilot/tp06_19d_capd.hpp against ap-reentry/tp06_19d.py; not a proof.",
           points=len(records), components=k0, worst_relative_double_difference=worst_rel,
           worst_where=[str(v) for v in worst_where],
           worst_double_difference_relative_to_term_scale=worst_rel_scaled,
           n_components_plain_relative_above_1em12=len(large),
           plain_relative_above_1em12_worst_cases=sorted(large, key=lambda r: -abs(r["capd_double"] - r["python_double"]) / abs(r["mp"]))[:6],
           max_capd_double_error_vs_mp_among_those=max([r["capd_err_rel"] for r in large], default=0.0),
           max_python_double_error_vs_mp_among_those=max([r["python_err_rel"] for r in large], default=0.0),
           enclosure_misses=len(misses), max_relative_interval_width_window_states=max_width_rel,
           groups=per_group, mp_dps=mp.mp.dps)
json.dump(res, open(os.path.join(HERE, "results", "compare_rhs19.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
sys.exit(0 if worst_rel_scaled < 1e-12 and not misses else 1)
