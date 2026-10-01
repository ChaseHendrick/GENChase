#!/usr/bin/env python3
"""Acceptance tests for fourier/arbmodel.py, the exact Arb model (component 1 of the Fourier/Hill route).

(a) Containment. At 40 random physiological states (the distribution and seed of numerics/compare_rhs.py), at the 64
    points of the N = 1 orbit (data/orbit_N1_M64.json) and at 8 complex points near the orbit, every component of
    the Arb field at 128 bits contains a 50-digit mpmath evaluation of the reference model/tp06_18d.py in which every
    numeric literal is replaced by the exact decimal of its source text. That mpmath version is built with `ast`, not
    with the generator's `tokenize` pass, so a generator bug cannot hide in both. Containment is decided in exact
    rational arithmetic from the balls' midpoints and radii.
(b) CAPD. At the 104 real points the Arb ball intersects the interval enclosure of the CAPD field printed by
    numerics/compare_rhs (two rigorous enclosures of the same decimal model at the same double point must
    intersect), and the CAPD double field agrees with the Arb midpoint to 1e-12 relative, or within the CAPD
    interval's own width where cancellation makes the double result coarser than that (such components are counted).
(c) Jacobian. The dual-number Jacobian, and df/dg_Ks, contain mpmath complex-step derivatives at 60 digits
    (h = 2^-140 sigma_k) at the 104 real points, and 100-digit central differences at the complex points.
(d) Negative controls, each of which must FAIL the check it targets: every numeric literal of field() perturbed in its
    last digit, one at a time; the exponent sign of 3.1e5, 2.5428e4 and 6.948e-6 flipped; each Jacobian column
    dropped; each dual-number rule falsified (one of them by a relative 2^-100 only); the CAPD overlap with one decimal
    perturbed; the reference evaluated with its binary float literals instead of the decimals; a ring with the
    coupling sign flipped; a rotating-wave mode fed through ring_field must give -d_m (not +d_m) on V.
Also: pinned versions and hashes, freshness and token-by-token form of the generated file, exact decimal and scale
balls, scales and parameters against the CAPD sources, the ring coupling, the Fourier damping symbol, domain guards and
a parameter interval.

Usage: PYTHONPATH=<dir holding python-flint 0.9.0> python3 test_arbmodel.py --capd <numerics/compare_rhs binary>
           [--wheel <python-flint wheel, to check its SHA-256>]
(or set COMPARE_RHS and FLINT_WHEEL). Exit status 0 only if every test passes. Takes about 15 s.
"""
import argparse
import ast
import hashlib
import io
import json
import os
import random
import re
import subprocess
import sys
import time
import tokenize
from fractions import Fraction

import mpmath as mp

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import arbmodel as am  # noqa: E402
from flint import acb, acb_mat, arb, fmpq  # noqa: E402

REFERENCE = am.REFERENCE
PREC = 128
MP_DPS = 50
E = am.SCALE_EXP
OPTS = {"capd": os.environ.get("COMPARE_RHS"), "wheel": os.environ.get("FLINT_WHEEL")}


# ------------------------------------------------------------------------------------------------------------------
# Exact rational views of balls and mpmath numbers
# ------------------------------------------------------------------------------------------------------------------
def q_mpf(x):
    if not mp.isfinite(x):
        raise ValueError("non-finite mpmath value")
    s, man, e, _ = x._mpf_
    v = Fraction(int(man)) * Fraction(2) ** int(e)
    return -v if s else v


def q_exact_arb(a):
    man, e = a.man_exp()
    return Fraction(int(man)) * Fraction(2) ** int(e)


def hull(a):
    """[lo, hi] of an arb ball as exact Fractions, or None if the ball is not finite."""
    if not a.is_finite():
        return None
    m, r = q_exact_arb(a.mid()), q_exact_arb(a.rad())
    return m - r, m + r


def parts(v):
    if isinstance(v, mp.mpc):
        return q_mpf(v.real), q_mpf(v.imag)
    if isinstance(v, mp.mpf):
        return q_mpf(v), Fraction(0)
    if isinstance(v, complex):
        return Fraction(v.real), Fraction(v.imag)
    return Fraction(v), Fraction(0)


def contains(b, v):
    """True iff the acb ball b contains the exact value v (mpf, mpc, Fraction, int, float or complex)."""
    for part, x in zip((b.real, b.imag), parts(v)):
        h = hull(part)
        if h is None or not (h[0] <= x <= h[1]):
            return False
    return True


def rel_rad(b):
    m = abs(float(b.real.mid())) + abs(float(b.imag.mid()))
    r = float(b.real.rad()) + float(b.imag.rad())
    return r / m if m else (0.0 if r == 0 else float("inf"))


# ------------------------------------------------------------------------------------------------------------------
# The mpmath reference, built independently of the generator (ast instead of tokenize)
# ------------------------------------------------------------------------------------------------------------------
class MPM:
    exp = staticmethod(mp.exp)
    log = staticmethod(mp.log)
    sqrt = staticmethod(mp.sqrt)


class _DecimalLiterals(ast.NodeTransformer):
    """Replace every int/float literal by _MPF('<its source text>'), except an int exponent of '**'."""

    def __init__(self, src):
        self.src = src

    def visit_BinOp(self, node):
        if isinstance(node.op, ast.Pow) and isinstance(node.right, ast.Constant) and type(node.right.value) is int:
            node.left = self.visit(node.left)
            return node
        return self.generic_visit(node)

    def visit_Constant(self, node):
        if type(node.value) not in (int, float):
            return node
        text = ast.get_source_segment(self.src, node)
        call = ast.Call(func=ast.Name(id="_MPF", ctx=ast.Load()), args=[ast.Constant(value=text)], keywords=[])
        return ast.copy_location(call, node)


_MP_NS = {}


def mp_model(dps, decimals=True):
    """Namespace of the reference executed under mpmath at dps digits. decimals=False keeps the float literals."""
    key = (dps, decimals)
    if key not in _MP_NS:
        with open(REFERENCE, encoding="utf-8") as fh:
            src = fh.read()
        tree = ast.parse(src)
        if decimals:
            tree = ast.fix_missing_locations(_DecimalLiterals(src).visit(tree))
        ns = {"__name__": "tp06_18d_mp", "_MPF": mp.mpf}
        with mp.workdps(dps):
            exec(compile(tree, REFERENCE, "exec"), ns)
            if not decimals:  # float literals: the parameters as the exact binary values of the floats
                ns["PARAMS"] = {k: mp.mpf(v) for k, v in ns["PARAMS"].items()}
        _MP_NS[key] = ns
    return _MP_NS[key]


def mp_field_scaled(x, dps=MP_DPS, decimals=True, i_stim=0, prm=None):
    ns = mp_model(dps, decimals)
    with mp.workdps(dps):
        xs = [mp.mpc(v) if isinstance(v, complex) else mp.mpf(v) for v in x]
        y = ns["field"](xs, prm or ns["PARAMS"], MPM, i_stim)
        return [yi * mp.mpf(2) ** (-E[i]) for i, yi in enumerate(y)]  # exact power-of-two scaling


# ------------------------------------------------------------------------------------------------------------------
# Test points (physical units, binary64 values; a complex point is a Python complex per component)
# ------------------------------------------------------------------------------------------------------------------
def random_points():
    rng = random.Random(20261001)  # same seed and draws as numerics/compare_rhs.py
    pts = []
    for _ in range(40):
        V = rng.uniform(-90, 40)
        gates = [rng.uniform(0.001, 0.999) for _ in range(13)]
        conc = [rng.uniform(5e-5, 1e-3), rng.uniform(0.5, 5), rng.uniform(5e-5, 5e-3), rng.uniform(5, 15)]
        pts.append([V] + gates + conc)
    return pts


def orbit_points():
    with open(os.path.join(HERE, "data", "orbit_N1_M64.json"), encoding="utf-8") as fh:
        rec = json.load(fh)
    assert rec["scale_exp"] == list(E)
    Z = rec["Z"]
    return [[Z[i][j] * 2.0 ** E[i] for i in range(18)] for j in range(len(Z[0]))]  # exact power-of-two scaling


def complex_points():
    pts = []
    for x in orbit_points()[::8]:
        y = []
        for k, v in enumerate(x):
            im = 0.05 if k == 0 else (-1) ** k * 1e-3 * abs(v)
            y.append(complex(v, im))
        pts.append(y)
    return pts


REAL = random_points() + orbit_points()
CPLX = complex_points()
ALL = REAL + CPLX


def z_of(x):
    """Exact scaled state z = x / 2^e as balls."""
    return [am.to_ball(v) * am.ISIG[k] for k, v in enumerate(x)]


_CACHE = {}


def mp_values():
    if "mp" not in _CACHE:
        _CACHE["mp"] = [mp_field_scaled(x) for x in ALL]
    return _CACHE["mp"]


def misses_against_mp(mdl=None, prm=None, stop_at_first=False, points=None):
    """(number of components checked, list of misses) of the Arb field against the 50-digit decimal reference."""
    ref = mp_values()
    idx = range(len(ALL)) if points is None else points
    checked, miss = 0, []
    for n in idx:
        try:
            F = am.f(z_of(ALL[n]), prm=prm, prec=PREC, mdl=mdl)
        except am.DomainError as exc:
            miss.append((n, -1, f"DomainError {exc}"))
            if stop_at_first:
                break
            continue
        for i in range(18):
            checked += 1
            if not contains(F[i], ref[n][i]):
                miss.append((n, i, None))
                if stop_at_first:
                    return checked, miss
    return checked, miss


# ------------------------------------------------------------------------------------------------------------------
# Tests
# ------------------------------------------------------------------------------------------------------------------
def test_flint_pinned():
    import base64
    import zipfile
    import flint
    v = am.flint_versions()
    assert v == {"python-flint": am.FLINT_PIN["python-flint"], "FLINT": am.FLINT_PIN["FLINT"]}, v
    msg = f"python-flint {v['python-flint']}, FLINT {v['FLINT']}"
    # the installed files against the distribution's RECORD (sha256 of every file, urlsafe base64)
    site = os.path.dirname(os.path.dirname(os.path.abspath(flint.__file__)))
    record_path = os.path.join(site, f"python_flint-{v['python-flint']}.dist-info", "RECORD")
    with open(record_path, "rb") as fh:
        record = fh.read()
    nfiles = 0
    for line in record.decode().splitlines():
        path, digest, _ = line.rsplit(",", 2)
        if not digest:
            continue
        algo, want = digest.split("=", 1)
        assert algo == "sha256"
        with open(os.path.join(site, path), "rb") as fh:
            got = base64.urlsafe_b64encode(hashlib.sha256(fh.read()).digest()).rstrip(b"=").decode()
        assert got == want, path
        nfiles += 1
    msg += f"; {nfiles} installed files match their RECORD hashes"
    if OPTS["wheel"]:
        with open(OPTS["wheel"], "rb") as fh:
            h = hashlib.sha256(fh.read()).hexdigest()
        assert os.path.basename(OPTS["wheel"]) == am.FLINT_PIN["wheel"], OPTS["wheel"]
        assert h == am.FLINT_PIN["wheel_sha256"], h
        with zipfile.ZipFile(OPTS["wheel"]) as zf:
            wheel_rec = set(zf.read(f"python_flint-{v['python-flint']}.dist-info/RECORD").decode().splitlines())
        installed = set(record.decode().splitlines())
        # pip adds hashless lines (byte-compiled caches) and its own metadata files; nothing else may differ
        pip_meta = {f"python_flint-{v['python-flint']}.dist-info/{n}" for n in ("INSTALLER", "REQUESTED", "direct_url.json")}
        extra = {l for l in installed - wheel_rec if l.rsplit(",", 2)[1] and l.rsplit(",", 2)[0] not in pip_meta}
        assert wheel_rec <= installed and not extra, f"installed RECORD is not the wheel's: {sorted(extra)[:3]}"
        msg += f"; wheel SHA-256 {h} matches the pin and every hashed installed file is the wheel's"
    else:
        msg += "; wheel hash not checked (no --wheel given)"
    return msg


def _significant(text):
    return [t for t in tokenize.generate_tokens(io.StringIO(text).readline)
            if t.type not in (tokenize.ENCODING, tokenize.ENDMARKER)]


def test_generated_file():
    with open(REFERENCE, encoding="utf-8") as fh:
        ref = fh.read()
    with open(am.GENERATED, encoding="utf-8") as fh:
        gen = fh.read()
    assert hashlib.sha256(ref.encode()).hexdigest() == am.REFERENCE_SHA256, "reference changed since the pin"
    assert gen == am.generate(), "generated file is stale or edited"
    assert am.REFERENCE_SHA256 in gen.splitlines()[0]
    # independent token walk: strip the comment header, then every reference token must reappear unchanged except
    # NUMBER tokens, which must appear as _D('<same text>'), _I(<same text>) or, after '**', the same int.
    lines = gen.splitlines(keepends=True)
    k = 0
    while lines[k].startswith("#"):
        k += 1
    assert lines[k].strip() == ""
    body = "".join(lines[k + 1:])
    rt, gt = _significant(ref), _significant(body)
    j, prev, counts = 0, None, {"_D": 0, "_I": 0, "kept": 0, "other": 0}
    for t in rt:
        if t.type == tokenize.NUMBER:
            if prev == "**" and re.fullmatch(r"\d+", t.string):
                assert (gt[j].type, gt[j].string) == (tokenize.NUMBER, t.string), (t, gt[j])
                j += 1
                counts["kept"] += 1
            else:
                name, op1, arg, op2 = gt[j:j + 4]
                assert name.type == tokenize.NAME and op1.string == "(" and op2.string == ")", (t, gt[j:j + 4])
                if name.string == "_I":
                    assert arg.type == tokenize.NUMBER and arg.string == t.string and re.fullmatch(r"\d+", t.string)
                elif name.string == "_D":
                    assert arg.type == tokenize.STRING and ast.literal_eval(arg.string) == t.string
                    assert not re.fullmatch(r"\d+", t.string)
                else:
                    raise AssertionError(f"unexpected wrapper {name.string}")
                counts[name.string] += 1
                j += 4
        else:
            assert (gt[j].type, gt[j].string) == (t.type, t.string), (t, gt[j])
            j += 1
            counts["other"] += 1
        if t.type == tokenize.OP:
            prev = t.string
        elif t.type not in (tokenize.NL, tokenize.NEWLINE, tokenize.COMMENT, tokenize.INDENT, tokenize.DEDENT):
            prev = None
    assert j == len(gt), "generated file has extra tokens"
    return (f"fresh; reference SHA-256 pinned; {counts['_D']} decimals -> _D, {counts['_I']} integers -> _I, "
            f"{counts['kept']} exponents kept, {counts['other']} other tokens identical")


def test_decimal_and_scale_balls():
    with open(REFERENCE, encoding="utf-8") as fh:
        src = fh.read()
    lits = sorted({ast.get_source_segment(src, n) for n in ast.walk(ast.parse(src))
                   if isinstance(n, ast.Constant) and type(n.value) is float})
    ints = sorted({n.value for n in ast.walk(ast.parse(src)) if isinstance(n, ast.Constant) and type(n.value) is int})
    for prec in (53, 128, 256):
        with am.precision(prec):
            for text in lits:
                b, q = am._D(text), Fraction(text)
                assert contains(b, q), (text, prec)
                assert b.imag.is_zero()
                assert q == 0 and b.real.is_zero() or hull(b.real)[1] - hull(b.real)[0] <= abs(q) * Fraction(2) ** (2 - prec)
            for n in ints:
                assert am._I(n).real.is_exact() and q_exact_arb(am._I(n).real) == n
            for k in range(18):
                assert am.SIG[k].real.is_exact() and q_exact_arb(am.SIG[k].real) == Fraction(2) ** E[k]
                assert (am.SIG[k] * am.ISIG[k]).real.is_exact() and q_exact_arb((am.SIG[k] * am.ISIG[k]).real) == 1
    return f"{len(lits)} decimal literals enclosed with radius <= 2^(2-prec)|q| at 53/128/256 bits; {len(ints)} integers and 36 scales exact"


def test_scales_and_params_match_capd():
    hpp = open(os.path.join(ROOT, "model", "tp06_capd.hpp"), encoding="utf-8").read()
    se = re.search(r"SCALE_EXP\[18\]\s*=\s*\{([^}]*)\}", hpp).group(1)
    assert tuple(int(t) for t in se.split(",")) == E
    setup = open(os.path.join(ROOT, "model", "setup.hpp"), encoding="utf-8").read()
    phys = re.search(r"struct Physical \{(.*?)\};", setup, re.S).group(1)
    capd = dict(re.findall(r"(\w+) = \"([^\"]+)\"", phys))
    names = {"gKr": "g_Kr", "gKs": "g_Ks", "gNa": "g_Na", "gK1": "g_K1", "gCaL": "g_CaL", "Cm": "Cm", "Ki": "K_i"}
    assert set(capd) == set(names), capd
    for c, p in names.items():
        assert Fraction(capd[c]) == Fraction(am.PARAM_DECIMALS[p]), (c, capd[c], am.PARAM_DECIMALS[p])
    return f"scale exponents and the 7 parameter decimals equal model/tp06_capd.hpp and model/setup.hpp"


def test_a_field_contains_mpmath():
    checked, miss = misses_against_mp()
    assert not miss, miss[:5]
    worst = 0.0
    for x in ALL:
        F = am.f(z_of(x), prec=PREC)
        worst = max(worst, max(rel_rad(v) for v in F))
    fp = am.field_phys(ALL[0], prec=PREC)
    ref = mp_model(MP_DPS)
    with mp.workdps(MP_DPS):
        y = ref["field"]([mp.mpf(v) for v in ALL[0]], ref["PARAMS"], MPM)
    assert all(contains(fp[i], y[i]) for i in range(18))
    return (f"{checked} components at {len(REAL)} real + {len(CPLX)} complex points contained; "
            f"largest relative radius {worst:.1e} at {PREC} bits")


def test_a_control_float_literals():
    """The check must see the difference between the decimals and the binary floats of the reference's literals."""
    nmiss = 0
    for x in REAL:
        F = am.f(z_of(x), prec=PREC)
        y = mp_field_scaled(x, decimals=False)
        nmiss += sum(not contains(F[i], y[i]) for i in range(18))
    assert nmiss > 0
    return f"control fails as required: {nmiss} of {18 * len(REAL)} components miss with float literals"


def _capd_rows(points):
    binary = OPTS["capd"]
    assert binary and os.path.exists(binary), "CAPD compare_rhs binary not given (--capd or COMPARE_RHS)"
    inp = "\n".join(" ".join(repr(float(v)) for v in p) for p in points) + "\n"
    out = subprocess.run([binary], input=inp, capture_output=True, text=True, check=True, timeout=300).stdout
    rows = [tuple(float(t) for t in line.split()) for line in out.splitlines() if line.strip()]
    assert len(rows) == 18 * len(points)
    return rows


def _capd_compare(rows, mdl=None):
    """Per point set (random, orbit): worst relative |double - Arb mid|; the number of components above 1e-12 relative
    and the worst such error in units of the CAPD interval width; and the components whose balls do not meet."""
    worst_rel, worst_norm, n_width, no_overlap = [0.0, 0.0], 0.0, 0, []
    for n, x in enumerate(REAL):
        F = am.field_phys(x, prec=PREC, mdl=mdl)
        s = 0 if n < 40 else 1
        for i in range(18):
            d, lo, hi = rows[18 * n + i]
            h = hull(F[i].real)
            if h is None or h[1] < Fraction(lo) or Fraction(hi) < h[0] or not F[i].imag.is_zero():
                no_overlap.append((n, i))
                continue
            mid = q_exact_arb(F[i].real.mid())
            err = abs(Fraction(d) - mid)
            rel = float(err / abs(mid)) if mid else float(err)
            worst_rel[s] = max(worst_rel[s], rel)
            if rel > 1e-12:
                n_width += 1
                width = Fraction(hi) - Fraction(lo)
                worst_norm = max(worst_norm, float(err / width) if width else float("inf"))
    return worst_rel, worst_norm, n_width, no_overlap


def test_b_capd():
    rows = _capd_rows(REAL)
    worst_rel, worst_norm, n_width, no_overlap = _capd_compare(rows)
    assert not no_overlap, no_overlap[:5]
    assert worst_norm <= 1.0, worst_norm
    # negative control: one decimal (Faraday's constant) perturbed in its last digit must break the overlap
    with open(REFERENCE, encoding="utf-8") as fh:
        src = fh.read()
    assert src.count("96485.3415") == 1
    mdl = am.load_generated(am.generate(src.replace("96485.3415", "96485.3416")))
    bad = _capd_compare(rows, mdl)[3]
    assert bad, "perturbed model still overlaps CAPD everywhere"
    with open(OPTS["capd"], "rb") as fh:
        hb = hashlib.sha256(fh.read()).hexdigest()[:16]
    return (f"{18 * len(REAL)} components: every Arb ball meets the CAPD interval; CAPD double vs Arb midpoint, worst "
            f"relative {worst_rel[0]:.1e} at the 40 random states and {worst_rel[1]:.1e} on the orbit, where gates sit "
            f"near their steady states and the double rates cancel; {n_width} components above 1e-12 relative, each "
            f"within the CAPD interval's own width (worst {worst_norm:.2f} widths); control with 96485.3416 misses "
            f"{len(bad)} components (compare_rhs SHA-256 {hb}...)")


def mp_jacobian(x, central=False):
    """Scaled Jacobian (18 x 18) and df/dg_Ks (scaled rows) of the decimal reference by mpmath complex step at 60
    digits, h = 2^-140 sigma_k (real x), or by central differences at 100 digits, h = 2^-100 sigma_k (complex x)."""
    dps = 100 if central else 60
    ns = mp_model(dps)
    with mp.workdps(dps):
        P = ns["PARAMS"]
        xs = [mp.mpc(v) if isinstance(v, complex) else mp.mpf(v) for v in x]
        cols = []
        for k in range(19):
            sk = -5 if k == 18 else E[k]  # g_Ks is about 2^-5
            h = mp.ldexp(mp.mpf(1), sk - (100 if central else 140))

            def ev(delta):
                xx, pp = list(xs), dict(P)
                if k < 18:
                    xx[k] = xx[k] + delta
                else:
                    pp["g_Ks"] = pp["g_Ks"] + delta
                return ns["field"](xx, pp, MPM)

            if central:
                yp, ym = ev(h), ev(-h)
                col = [(yp[i] - ym[i]) / (2 * h) for i in range(18)]
            else:
                y = ev(mp.mpc(0, h))
                col = [mp.im(y[i]) / h for i in range(18)]
            scale = mp.mpf(2) ** (E[k] if k < 18 else 0)
            cols.append([col[i] * scale * mp.mpf(2) ** (-E[i]) for i in range(18)])
        return [[cols[k][i] for k in range(18)] for i in range(18)], [cols[18][i] for i in range(18)]


def jacobian_data():
    if "jac" not in _CACHE:
        data = []
        for n, x in enumerate(ALL):
            central = n >= len(REAL)
            Jm, Pm = mp_jacobian(x, central=central)
            F, J, P = am.f_and_df(z_of(x), prec=PREC, wrt=("g_Ks",))
            data.append((Jm, Pm, F, J, P))
        _CACHE["jac"] = data
    return _CACHE["jac"]


def _jac_misses(J, Jm, P=None, Pm=None):
    m = [(i, k) for i in range(18) for k in range(18) if not contains(J[i, k], Jm[i][k])]
    if P is not None:
        m += [(i, 18) for i in range(18) if not contains(P[i, 0], Pm[i])]
    return m


def test_c_jacobian():
    data = jacobian_data()
    miss, worst, fmiss = [], 0.0, 0
    ref = mp_values()
    for n, (Jm, Pm, F, J, P) in enumerate(data):
        miss += [(n,) + t for t in _jac_misses(J, Jm, P, Pm)]
        fmiss += sum(not contains(F[i], ref[n][i]) for i in range(18))
        worst = max(worst, max(rel_rad(J[i, k]) for i in range(18) for k in range(18) if not J[i, k].is_zero()))
    assert not miss, miss[:5]
    assert fmiss == 0
    nz = sum(not data[0][3][i, k].is_zero() for i in range(18) for k in range(18))
    return (f"{len(data) * 18 * 19} derivative entries (Jacobian and df/dg_Ks) contained: complex step at "
            f"{len(REAL)} real points, central differences at {len(CPLX)} complex points; {nz} structurally nonzero "
            f"Jacobian entries; largest relative radius {worst:.1e}")


def _field_number_tokens(src):
    tree = ast.parse(src)
    fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "field")
    first, last = fn.body[0].lineno, fn.end_lineno
    return [t for t in tokenize.generate_tokens(io.StringIO(src).readline)
            if t.type == tokenize.NUMBER and first <= t.start[0] <= last]


def _mutate(src, tok, new):
    lines = src.splitlines(keepends=True)
    off = sum(len(l) for l in lines[:tok.start[0] - 1])
    a, b = off + tok.start[1], off + tok.end[1]
    assert src[a:b] == tok.string
    return src[:a] + new + src[b:]


def _last_digit(text):
    m = re.fullmatch(r"([0-9.]*[0-9])([eE][+-]?\d+)?", text)
    mant, ex = m.group(1), m.group(2) or ""
    return mant[:-1] + str((int(mant[-1]) + 1) % 10) + ex


def _detected(mut_src):
    mdl = am.load_generated(am.generate(mut_src))
    return bool(misses_against_mp(mdl=mdl, stop_at_first=True)[1])


def test_d_last_digit_mutations():
    with open(REFERENCE, encoding="utf-8") as fh:
        src = fh.read()
    toks = _field_number_tokens(src)
    undetected = [(t.start, t.string) for t in toks if not _detected(_mutate(src, t, _last_digit(t.string)))]
    assert not undetected, undetected
    return f"all {len(toks)} numeric literals of field() perturbed in the last digit, one at a time: every mutant fails (a)"


def test_d_exponent_sign_flips():
    with open(REFERENCE, encoding="utf-8") as fh:
        src = fh.read()
    toks = [t for t in _field_number_tokens(src) if re.search(r"[eE]", t.string)]
    assert sorted(t.string for t in toks) == ["2.5428e4", "3.1e5", "6.948e-6"], [t.string for t in toks]
    res = []
    for t in toks:
        new = t.string.replace("e-", "e") if "e-" in t.string else t.string.replace("e", "e-")
        res.append((t.string, new, _detected(_mutate(src, t, new))))
    assert all(r[2] for r in res), res
    return "exponent sign flips " + ", ".join(f"{a} -> {b}" for a, b, _ in res) + ": every mutant fails (a)"


def test_d_jacobian_column_dropped():
    data = jacobian_data()
    undetected = []
    for k in range(18):
        hit = False
        for Jm, Pm, F, J, P in data:
            Jd = acb_mat(J)
            for i in range(18):
                Jd[i, k] = acb(0)
            if _jac_misses(Jd, Jm):
                hit = True
                break
        if not hit:
            undetected.append(k)
    assert not undetected, undetected
    return "each of the 18 Jacobian columns set to zero: every mutant fails (c)"


def test_d_dual_rules_falsified():
    D = am.Dual
    with am.precision(256):
        tiny = acb(1) + acb(arb(fmpq(1, 2 ** 100)))  # exactly 1 + 2^-100
    assert tiny.real.is_exact()
    wrong = {
        "exp (derivative times 1 + 2^-100)": ("exp", lambda self: D(self.v.exp(), am._scale(self.d, self.v.exp() * tiny))),
        "log (x / 2v)": ("log", lambda self: D(self.v.log(), {k: x / (2 * self.v) for k, x in self.d.items()})),
        "sqrt (x / s)": ("sqrt", lambda self: D(self.v.sqrt(), {k: x / self.v.sqrt() for k, x in self.d.items()})),
        "Dual/Dual (quotient term dropped)": ("__truediv__", lambda self, o: D(self.v / o.v, {k: x / o.v for k, x in self.d.items()})
                                              if isinstance(o, D) else D(self.v / am._as_acb(o), {k: x / am._as_acb(o) for k, x in self.d.items()})),
        "scalar/Dual (sign)": ("__rtruediv__", lambda self, o: D(am._as_acb(o) / self.v, am._scale(self.d, am._as_acb(o) / self.v / self.v))),
        "Dual**n (n+1)": ("__pow__", lambda self, n: D(self.v ** n, am._scale(self.d, (n + 1) * self.v ** (n - 1)))),
        "Dual*Dual (one product term)": ("__mul__", lambda self, o: D(self.v * o.v, am._scale(self.d, o.v))
                                         if isinstance(o, D) else D(self.v * am._as_acb(o), am._scale(self.d, am._as_acb(o)))),
    }
    data = jacobian_data()
    sample = list(range(0, len(REAL), 13)) + list(range(len(REAL), len(ALL)))
    res = {}
    for name, (attr, fn) in wrong.items():
        saved = getattr(D, attr)
        try:
            setattr(D, attr, fn)
            if attr == "__mul__":
                D.__rmul__ = fn
            hit = False
            for n in sample:
                Jm, Pm = data[n][0], data[n][1]
                try:
                    _, J, P = am.f_and_df(z_of(ALL[n]), prec=PREC, wrt=("g_Ks",))
                except am.DomainError:
                    hit = True
                    break
                if _jac_misses(J, Jm, P, Pm):
                    hit = True
                    break
        finally:
            setattr(D, attr, saved)
            if attr == "__mul__":
                D.__rmul__ = saved
        res[name] = hit
    assert all(res.values()), res
    return "falsified dual rules, each must fail (c): " + "; ".join(res)


def test_ring_coupling():
    orb = orbit_points()
    xs = [orb[0], orb[21], orb[42]]
    N = 3
    c_q = Fraction(N * N) * am.D_RING
    out = am.ring_field([z_of(x) for x in xs], am.coupling(N=N, prec=PREC), prec=PREC)
    ns = mp_model(MP_DPS)
    miss = 0
    with mp.workdps(MP_DPS):
        Cm = ns["PARAMS"]["Cm"]
        c = mp.mpf(c_q.numerator) / c_q.denominator
        for k in range(N):
            istim = Cm * c * (mp.mpf(xs[k - 1][0]) - 2 * mp.mpf(xs[k][0]) + mp.mpf(xs[(k + 1) % N][0]))
            y = mp_field_scaled(xs[k], i_stim=istim)
            miss += sum(not contains(out[k][i], y[i]) for i in range(18))
    assert miss == 0
    # the coupling changes only dV/dt, by exactly c (V_{k-1} - 2 V_k + V_{k+1}) / 2^e_V
    for k in range(N):
        single = am.f(z_of(xs[k]), prec=PREC)
        for i in range(1, 18):
            assert out[k][i].overlaps(single[i])
    one = am.ring_field([z_of(xs[0])], am.coupling(N=1, prec=PREC), prec=PREC)[0]
    assert all(one[i].overlaps(am.f(z_of(xs[0]), prec=PREC)[i]) for i in range(18))
    flipped = am.ring_field([z_of(x) for x in xs], -am.coupling(N=N, prec=PREC), prec=PREC)
    with mp.workdps(MP_DPS):
        k = 0
        istim = Cm * c * (mp.mpf(xs[k - 1][0]) - 2 * mp.mpf(xs[k][0]) + mp.mpf(xs[(k + 1) % N][0]))
        y = mp_field_scaled(xs[k], i_stim=istim)
    assert not contains(flipped[0][0], y[0]), "sign-flipped coupling not detected"
    return "N = 3 ring field contains the mpmath reference with i_stim = Cm c (V_{k-1} - 2 V_k + V_{k+1}); N = 1 is the cell; the sign-flipped coupling fails"


def test_damping_symbol():
    checked = 0
    with am.precision(PREC):
        for N in (1, 2, 3, 8, 16, 32, 64):
            c = am.coupling(N=N)
            for m in range(-70, 71):
                d = am.damping(m, N=N)
                sym = c * (acb(arb(fmpq(-2 * m, N))).exp_pi_i() - 2 + acb(arb(fmpq(2 * m, N))).exp_pi_i())
                assert (-d).overlaps(sym) and d.imag.is_zero() and d.real >= 0, (N, m, d, sym)
                assert am.damping(m, eps=Fraction(1, N * N)).overlaps(d), (N, m)
                checked += 1
        for m in range(0, 71):
            d0 = am.damping(m, eps=0)
            assert d0.overlaps(acb(am.to_ball(am.D_RING).real * (2 * arb.pi() * m) ** 2))
        box = am.damping(5, eps=(0, Fraction(1, 64)))
        for N in range(8, 200):
            assert box.contains(am.damping(5, N=N)), N
        assert box.contains(am.damping(5, eps=0))
        # sanity only (these cannot catch a sign error; the sign is fixed by the exp_pi_i symbol above and by
        # test_ring_symbol_consistency): N enters the symbol, and d_1 != 0.
        differ = sum(not am.damping(m, N=63).overlaps(am.damping(m, N=64)) for m in range(1, 64))
        assert differ > 0
        assert not am.damping(1, N=64).overlaps(-am.damping(1, N=64))
    return (f"{checked} (N, m) pairs: -d_m equals c (e^(-2 pi i m/N) - 2 + e^(2 pi i m/N)) and the eps = 1/N^2 form; "
            f"eps = 0 gives D (2 pi m)^2; the eps interval [0, 1/64] encloses N = 8..199; N = 63 vs 64 differ at {differ} modes")


def test_ring_symbol_consistency():
    """End to end: a single Fourier mode on V, x_k(theta) = z0 + amp cos(m (theta + 2 pi k/N)) e_V, put through
    ring_field, changes cell 0's V rate (relative to the uncoupled cell) by exactly -d_m times the mode; +d_m must
    be disjoint. This ties damping() to the ring ODE that the rotating-wave theorem is about."""
    rec = json.load(open(os.path.join(HERE, "data", "orbit_N1_M64.json")))
    z0 = [rec["Z"][i][0] for i in range(18)]
    checked = 0
    with am.precision(256):
        for N, m in ((8, 3), (16, 1), (64, 5), (63, 7)):
            amp = acb(fmpq(1, 100))
            zs = []
            for k in range(N):
                z = [am.to_ball(v) for v in z0]
                z[0] = z[0] + amp * acb(arb.cos_pi_fmpq(fmpq(3, 10) + fmpq(2 * m * k, N)))
                zs.append(z)
            out = am.ring_field(zs, am.coupling(N=N, prec=256), prec=256)
            coup = out[0][0] - am.f(zs[0], prec=256)[0]
            pred = -am.damping(m, N=N, prec=256) * amp * acb(arb.cos_pi_fmpq(fmpq(3, 10)))
            assert coup.overlaps(pred), (N, m, coup, pred)
            assert not coup.overlaps(-pred), (N, m)
            checked += 1
    return f"{checked} (N, m) rotating modes: ring_field coupling on V equals -d_m times the mode; +d_m disjoint"


def test_domain_and_parameter_interval():
    x = list(orbit_points()[0])
    raised = []
    for k, v, why in ((17, -1.0, "Na_i < 0"), (14, 0.0, "Ca_i = 0"), (0, 15.0, "V = 15 (removable GHK singularity)")):
        y = list(x)
        y[k] = v
        try:
            am.f(z_of(y), prec=PREC)
        except am.DomainError:
            raised.append(why)
    assert len(raised) == 3, raised
    am.f_and_df(z_of([complex(v, 0) for v in x[:17]] + [complex(x[17], 20.0)]), prec=PREC)  # legitimate complex
    y = [complex(v) for v in x]
    y[14] = complex(-1e-4, 1e-6)
    try:
        am.f(z_of(y), prec=PREC)
        raise AssertionError("log of a value with negative real part was not refused")
    except am.DomainError as exc:
        assert "log" in str(exc), exc
    with am.precision(PREC):
        wide = am.params(g_Ks=("0.0275", "0.0280"))
        F_box = am.f(z_of(x), prm=wide)
        for g in ("0.0275", "0.0277", "0.0280"):
            F_pt = am.f(z_of(x), prm=am.params(g_Ks=g))
            assert all(F_box[i].contains(F_pt[i]) for i in range(18)), g
        F_out = am.f(z_of(x), prm=am.params(g_Ks="0.0281"))
        assert not all(F_box[i].contains(F_out[i]) for i in range(18))
    return "DomainError for Na_i < 0, Ca_i = 0, V = 15 and a log argument with Re < 0; the g_Ks interval [0.0275, 0.0280] encloses its points and not g_Ks = 0.0281"


TESTS = [test_flint_pinned, test_generated_file, test_decimal_and_scale_balls, test_scales_and_params_match_capd,
         test_a_field_contains_mpmath, test_a_control_float_literals, test_b_capd, test_c_jacobian,
         test_d_last_digit_mutations, test_d_exponent_sign_flips, test_d_jacobian_column_dropped,
         test_d_dual_rules_falsified, test_ring_coupling, test_damping_symbol, test_ring_symbol_consistency,
         test_domain_and_parameter_interval]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--capd", default=OPTS["capd"], help="numerics/compare_rhs binary (or COMPARE_RHS)")
    ap.add_argument("--wheel", default=OPTS["wheel"], help="python-flint wheel to hash (or FLINT_WHEEL)")
    ap.add_argument("-k", default=None, help="run only tests whose name contains this string")
    a = ap.parse_args()
    OPTS.update(capd=a.capd, wheel=a.wheel)
    failed = 0
    t00 = time.time()
    for t in TESTS:
        if a.k and a.k not in t.__name__:
            continue
        t0 = time.time()
        try:
            msg = t()
            print(f"PASS {t.__name__} ({time.time() - t0:.1f}s): {msg}", flush=True)
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"FAIL {t.__name__} ({time.time() - t0:.1f}s): {type(exc).__name__}: {str(exc)[:600]}", flush=True)
    print(f"{'ALL PASS' if not failed else f'{failed} FAILED'} in {time.time() - t00:.1f}s; "
          f"python-flint {am.flint_versions()['python-flint']}, precision {PREC} bits, mpmath {mp.__version__}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
