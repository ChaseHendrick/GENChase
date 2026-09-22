"""Exact Fraction polynomial check of the declared finite KP-I lump family.

Independent of the JavaScript formula evaluator. No symbolic package required.
"""
from fractions import Fraction as F
import json


def add(*polys):
    out = {}
    for p in polys:
        for k, v in p.items():
            out[k] = out.get(k, F(0)) + v
    return {k: v for k, v in out.items() if v}


def scale(p, c):
    return {k: v*c for k, v in p.items() if v*c}


def mul(p, q):
    out = {}
    for (i, j), a in p.items():
        for (k, l), b in q.items():
            key = (i+k, j+l)
            out[key] = out.get(key, F(0)) + a*b
    return {k: v for k, v in out.items() if v}


def diff(p, dx, dy):
    out = {}
    for (i, j), v in p.items():
        if i:
            out[(i-1, j)] = out.get((i-1, j), F(0)) + i*v*dx
        if j:
            out[(i, j-1)] = out.get((i, j-1), F(0)) + j*v*dy
    return {k: v for k, v in out.items() if v}


def review(a, b, time_factor=F(1)):
    d = {(2, 0): F(1), (0, 2): b*b, (0, 0): 1/(b*b)}
    p = scale(add(d, {(2, 0): F(-2)}), F(4))

    def derivative(pair, dx, dy):
        p, n = pair
        return add(mul(d, diff(p, dx, dy)), scale(mul(p, diff(d, dx, dy)), -n)), n+1

    u = (p, 2)
    ux = derivative(u, 1, 0)
    uxx = derivative(ux, 1, 0)
    uxxxx = derivative(derivative(uxx, 1, 0), 1, 0)
    uxt = derivative(ux, 3*(a*a-b*b)*time_factor, 6*a*time_factor)
    uyy = derivative(derivative(u, a, 1), a, 1)
    # Every term expressed over the common, strictly positive denominator D^6.
    numerator = add(mul(uxt[0], mul(d, d)),
                    scale(add(mul(ux[0], ux[0]), mul(p, uxx[0])), 6),
                    uxxxx[0], scale(mul(uyy[0], mul(d, d)), -3))
    return numerator


families = [("0", "1"), ("0", "1.05"), ("0", ".85"),
            (".15", ".9"), ("-.1", "1.1"), (".35", "1"),
            ("-.35", "1"), (".55", ".95"), ("0", "1.65")]
rows = []
for a, b in families:
    actual = review(F(a), F(b))
    wrong = review(F(a), F(b), F("1.1"))
    assert not actual, (a, b, actual)
    assert wrong, (a, b, "wrong time coefficient was not rejected")
    rows.append({"a": a, "b": b, "residualNumeratorTerms": len(actual),
                 "wrongTimeNumeratorTerms": len(wrong)})
print(json.dumps({"arithmetic": "exact rational polynomial coefficients",
                  "denominator": "D^6 > 0 for real X,Y and nonzero real b",
                  "families": rows, "passed": True}, indent=2))
