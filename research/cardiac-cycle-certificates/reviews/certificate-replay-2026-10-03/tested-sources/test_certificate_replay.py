"""Small complete spectral certificates and adversarial mathematical controls."""
import copy
from fractions import Fraction as Q
import unittest

import certificate_replay as cr


def r(q):
    q = Q(q)
    s = f"{q.numerator}/{q.denominator}"
    return [s, s]


def z(x=0, y=0):
    return [r(x), r(y)]


def diagonal(values):
    return [[values[i] if i == j else z() for j in range(len(values))] for i in range(len(values))]


def fixture(uniform=False):
    cell = diagonal([z(-2), z(0)])
    zero = diagonal([z(), z()])
    window = diagonal([z(-2, 1), z(0, 1), z(-2), z(), z(-2, -1), z(0, -1)])
    ident = diagonal([z(1)] * 6)
    zz = diagonal([z()] * 6)
    lam = [window[j][j] for j in range(6)]
    w = dict(schema="cardiac-spectral-witness/1", bindings=dict(identity="synthetic", sources={"model": "a" * 64}, inputs={"centre": "b" * 64}, settings={"N": 1}, domain=["0/1", "1/1"]),
             premises=["operator-enclosures", "orbit-existence", "nonconstant-phase-kernel", "Hill-sector-lemmas"],
             geometry=dict(N=1, DIM=2, IV=0, Ke=1, nA=2, nc=1, a=r("-3/4"), b=r("3/4"), R0=r(4), delta=r("1/10"), delta_requested="1/10", eta=r("1/100"), omega_lo=r(1), omega_hi=r(1), c4=r(0), h=r("1/100") if uniform else r(0)),
             coefficients=dict(AS={str(k): copy.deepcopy(cell if k == 0 else zero) for k in range(-3, 4)}, A0c=cell, s1=r("1/1000"), s2=r("1/1000"), q1=r("1/2"), q2=r("1/2"), rho=r(1), rho_e=r(1), strip_matrices=[diagonal([z("1/1024")] * 2), diagonal([z("1/1024")] * 2)]),
             tail=[dict(residue=0, U=diagonal([z(1)] * 2), Ui=diagonal([z(1)] * 2), X=copy.deepcopy(cell), damping=r(0), **{"lambda": [z(-2), z()]})],
             window=dict(V=[ident, zz] if uniform else [ident], Vi=[ident, zz] if uniform else [ident], H=[window, zz, zz] if uniform else [window], remainder=zz if uniform else None, **{"lambda": [lam, [z()] * 6] if uniform else [lam]}),
             claimed=dict(Tlo=r(6), multiplier=r("3/5")))
    return w


def primitive_fixture(uniform=True, count=1):
    w = fixture(uniform)
    w["schema"] = "cardiac-spectral-witness/2"
    cell = diagonal([z(-2), z(0 if count else -3)])
    zero = diagonal([z(), z()])
    degree = 2 if uniform else 0
    coeff = {str(k): copy.deepcopy(cell if k == 0 else zero) for k in range(-2, 3)}
    w["operator"] = dict(kind="quadratic" if uniform else "point", S_exponents=[0, 0],
        J=[coeff] + [{str(k): copy.deepcopy(zero) for k in range(-2, 3)} for _ in range(degree)],
        strip=[diagonal([z(2), z(0 if count else 3)])] + [copy.deepcopy(zero) for _ in range(degree)],
        radii=[{str(k): copy.deepcopy(zero) for k in range(-2, 3)} for _ in range(degree)],
        error=zero, rho=r(10), rho0=r(10), rho2=r(10),
        omega=[r(1)] + [r(0) for _ in range(degree)], omega_error=r(0),
        h=w["geometry"]["h"], D=r(0))
    w["coefficients"] = dict(A0c=cell)
    del w["window"]["H"], w["window"]["remainder"]
    w["bindings"]["geometry"] = dict(N=1, DIM=2, IV=-1 if count == 0 else 0, Ke=1, nA=2, nc=1, D="0/1")
    w["bindings"]["settings"] = dict(N=1, Ke_offset=1, n_c=1, delta="1/10")
    w["bindings"]["domain"] = ["0/1", "1/100"] if uniform else ["0/1", "0/1"]
    w["bindings"]["parameter_center"] = "1/200" if uniform else "0/1"
    if count == 0:
        w["geometry"].update(expected_count=0, IV=-1)
        w["premises"] = ["operator-enclosures", "Hill-sector-lemmas"]
        w["tail"][0]["X"] = cell
        w["tail"][0]["lambda"] = [z(-2), z(-3)]
        w["window"]["lambda"][0] = [z(-2, 1), z(-3, 1), z(-2), z(-3), z(-2, -1), z(-3, -1)]
    return w


class ReplayTests(unittest.TestCase):
    def test_reconstructed_operator_and_count_zero(self):
        for uniform, count in ((False, 1), (True, 1), (True, 0)):
            w = primitive_fixture(uniform, count)
            got = cr.verify(w, w["bindings"])
            self.assertTrue(got["independent_operator_assembly"])
            self.assertEqual(got["spectral_count"], count)

    def test_primitive_binding_and_operator_mutations(self):
        base = primitive_fixture()
        cases = [
            lambda w: w["window"].update(H=[]),
            lambda w: w["coefficients"].update(AS={}),
            lambda w: w["operator"]["J"][0]["0"][1].__setitem__(1, z(1)),
            lambda w: w["operator"]["J"][0].pop("2"),
            lambda w: w["operator"]["J"][1]["0"][0].__setitem__(0, [r(0), ["0/1", "1/10"]]),
            lambda w: w["operator"].__setitem__("S_exponents", [True, 0]),
            lambda w: w["operator"].__setitem__("omega_error", r(1)),
            lambda w: w["operator"].__setitem__("D", r(1)),
            lambda w: w["operator"].__setitem__("h", r(0)),
            lambda w: w["geometry"].__setitem__("nA", 1),
            lambda w: w["geometry"].__setitem__("DIM", 3),
            lambda w: w["operator"]["error"][0].__setitem__(0, z(-1)),
        ]
        for k, mutate in enumerate(cases):
            with self.subTest(k=k):
                w = copy.deepcopy(base); mutate(w)
                with self.assertRaises((cr.Refused, KeyError, ValueError)):
                    cr.verify(w, base["bindings"])
        # Internally consistent manifests still cannot rebind unrelated geometry.
        for path, value in (("n_c", True), ("Ke_offset", 2), ("delta", "1/5")):
            w = copy.deepcopy(base); w["bindings"]["settings"][path] = value
            with self.assertRaises(cr.Refused):
                cr.verify(w, w["bindings"])
        w = copy.deepcopy(base); w["bindings"]["domain"] = ["0/1", "1/1"]
        with self.assertRaises(cr.Refused): cr.verify(w, w["bindings"])

    def test_ring_damping_and_similarity_are_reconstructed(self):
        w = primitive_fixture()
        w["geometry"].update(N=5, c4=r(1))
        w["operator"].update(D=r("1/100"), S_exponents=[-2, 3])
        # Nonzero off-diagonal raw coefficient tests the direction S^-1 J S.
        w["operator"]["J"][0]["0"][0][1] = z("1/32")
        backend = cr.ArbMatrices(256)
        try:
            out = cr.assemble_operator(w["operator"], w["geometry"], backend)
            self.assertTrue(out["AS"][0][0, 1].contains(1))
            self.assertTrue(out["damping"][0].is_zero())
            self.assertTrue(out["damping"][1] > 0)
            from flint import arb, fmpq
            actual = arb.sin_pi_fmpq(fmpq(1, 5)) ** 2
            self.assertTrue(out["damping"][1].contains(actual))
            # Covered residues must not depend on the finite window cutoff.
            w["geometry"]["N"] = 64
            w["geometry"]["c4"] = r(200)
            self.assertIn(32, cr.assemble_operator(w["operator"], w["geometry"], backend)["damping"])
        finally:
            backend.close()
    def test_complete_point(self):
        w = fixture()
        result = cr.verify(w, w["bindings"])
        self.assertEqual(result["columns"], 6)
        self.assertEqual(result["spectral_count"], 1)
        self.assertFalse(result["independent_model_enclosures"])

    def test_complete_quadratic_uniform(self):
        w = fixture(True)
        self.assertEqual(cr.verify(w, w["bindings"])["status"], "passed")

    def test_exact_oracle(self):
        a = [[z("1/3", "2/5"), z(-2)], [z(3), z(1, -1)]]
        b = [[z(1), z(2)], [z(3, 1), z("1/7")]]
        oracle = cr.rational_point_product(a, b)
        backend = cr.ArbMatrices(256)
        try:
            prod = backend.read(a, 2) * backend.read(b, 2)
            for i in range(2):
                for j in range(2):
                    x, y = oracle[i][j]
                    for exact_value, ball in ((x, prod[i, j].real), (y, prod[i, j].imag)):
                        self.assertLessEqual(cr.fraction_arb(ball.lower()), exact_value)
                        self.assertGreaterEqual(cr.fraction_arb(ball.upper()), exact_value)
        finally:
            backend.close()

    def test_mutations(self):
        def replace(path, value):
            def run(w):
                target = w
                for k in path[:-1]:
                    target = target[k]
                target[path[-1]] = value
            return run
        cases = [
            ("wrong source", replace(["bindings", "sources", "model"], "c" * 64)),
            ("wrong input", replace(["bindings", "inputs", "centre"], "c" * 64)),
            ("typed settings", replace(["bindings", "settings", "N"], True)),
            ("domain", replace(["bindings", "domain"], ["0/1", "2/1"])),
            ("phase premise", replace(["premises"], ["operator-enclosures"])),
            ("integer shape", replace(["geometry", "Ke"], True)),
            ("negative damping rate", replace(["geometry", "delta"], r(-1))),
            ("sector height", replace(["geometry", "b"], r("1/10"))),
            ("right enclosure", replace(["geometry", "R0"], r(2))),
            ("requested delta", replace(["geometry", "delta_requested"], "1/5")),
            ("decay underestimate", replace(["coefficients", "q1"], r("1/10"))),
            ("divergent tail", replace(["coefficients", "q1"], r(1))),
            ("tail too large", replace(["coefficients", "s1"], r(20))),
            ("strip norm underestimated", replace(["coefficients", "s1"], r("1/2048"))),
            ("negative strip entry", replace(["coefficients", "strip_matrices", 0, 0, 0], z(-1))),
            ("missing Fourier mode", lambda w: w["coefficients"]["AS"].pop("3")),
            ("missing residue", replace(["tail"], [])),
            ("duplicate residue", replace(["tail", 0, "residue"], 1)),
            ("anti damping", replace(["tail", 0, "damping"], r(-1))),
            ("tail block lie", replace(["tail", 0, "X", 0, 0], z(-3))),
            ("singular tail basis", replace(["tail", 0, "U", 0, 0], z())),
            ("bad tail inverse", replace(["tail", 0, "Ui", 0, 0], z())),
            ("tail fake lambda", replace(["tail", 0, "lambda", 0], z(0))),
            ("window inverse", replace(["window", "Vi", 0, 0, 0], z())),
            ("window residual", replace(["window", "H", 0, 2, 2], z(1))),
            ("boundary eigenvalue", replace(["window", "lambda", 0, 3], z("-1/10"))),
            ("multiple interior eigenvalues", replace(["window", "lambda", 0, 2], z())),
            ("coupling failure", replace(["coefficients", "AS", "1", 0, 0], z(10))),
            ("period wrong direction", replace(["claimed", "Tlo"], r(7))),
            ("multiplier wrong direction", replace(["claimed", "multiplier"], r("1/2"))),
            ("multiplier equals one", replace(["claimed", "multiplier"], r(1))),
            ("float endpoint", replace(["claimed", "Tlo"], [6.0, 6.0])),
            ("reversed bound", replace(["claimed", "Tlo"], ["6/1", "5/1"])),
            ("unknown flag", lambda w: w.update(ok=True)),
        ]
        base = fixture()
        for name, mutate in cases:
            with self.subTest(name=name):
                w = copy.deepcopy(base)
                mutate(w)
                with self.assertRaises((cr.Refused, KeyError, ValueError)):
                    cr.verify(w, base["bindings"])

    def test_uniform_remainder_and_variation(self):
        base = fixture(True)
        for kind in ("negative remainder", "large remainder", "variation"):
            with self.subTest(kind=kind):
                w = copy.deepcopy(base)
                if kind == "negative remainder":
                    w["window"]["remainder"][0][0] = z(-1)
                elif kind == "large remainder":
                    w["window"]["remainder"][3][3] = z(1)
                else:
                    w["window"]["lambda"][1][3] = z(20)
                with self.assertRaises(cr.Refused):
                    cr.verify(w, base["bindings"])

    def test_strict_json(self):
        with self.assertRaises(cr.Refused):
            cr.strict_pairs([("x", 1), ("x", 2)])


if __name__ == "__main__":
    unittest.main()
