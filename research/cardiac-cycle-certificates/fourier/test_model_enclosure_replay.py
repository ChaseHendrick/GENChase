import unittest
import json
from pathlib import Path
from fractions import Fraction as Q
from flint import acb, arb
import model_enclosure_replay as mr


class IndependentModelTests(unittest.TestCase):
    def test_mixed_product_and_composition(self):
        x = mr.Mixed(2, {0: acb(1)}, 3)
        y = (x ** 3).log()
        self.assertTrue(y.d[0].contains(acb("1.5")))
        self.assertTrue(y.t.contains(acb("4.5")))
        self.assertTrue(y.dt[0].contains(acb("-2.25")))
        z = (x * x + 1).inverse()
        self.assertTrue(z.d[0].contains(acb(arb(-4) / 25)))
        self.assertTrue(z.dt[0].contains(acb(arb(66) / 125)))

    def test_domain_and_exactness(self):
        for v in (mr.Mixed(-1), mr.Mixed(acb(arb(0, 1)))):
            with self.assertRaises(mr.Refused):
                v.log()
            with self.assertRaises(mr.Refused):
                v.sqrt()
        with self.assertRaises(mr.Refused):
            mr.Mixed(0).inverse()
        with self.assertRaises(mr.Refused):
            mr.ball(0.1)

    def test_complete_partition(self):
        rows = mr.partition(4, 3)
        self.assertEqual(len(mr.check_partition(rows)), 12)
        with self.assertRaises(mr.Refused):
            mr.check_partition(rows[:-1])
        with self.assertRaises(mr.Refused):
            mr.check_partition(rows + [rows[0]])
        with self.assertRaises(mr.Refused):
            mr.check_partition([(Q(0), Q(1), Q(-1), Q(0))])

    def test_signed_modes_and_alias_direction(self):
        c = [[acb(2), acb(3), acb(5)]]
        f = lambda theta: mr.evaluate(c, theta)
        S = mr.strip_bounds(f, "1/4", mr.partition(16, 4))
        data = mr.coefficients(f, "1/4", 64, 1, S)
        for n, expected in ((-1, 2), (0, 3), (1, 5)):
            self.assertTrue(data[n][0].contains(acb(expected)))

    def test_invalid_alias_majorants_refused(self):
        f = lambda theta: [acb(1)]
        for majorant in ([], [arb(-1)], [arb("nan")], [arb("inf")], [1]):
            with self.subTest(majorant=majorant), self.assertRaises(mr.Refused):
                mr.coefficients(f, "1/4", 8, 1, majorant)
        for rho in ("0", "-1/4"):
            with self.assertRaises(mr.Refused):
                mr.coefficients(f, rho, 8, 1, [arb(1)])

    def test_saved_bound_direction_and_strict_identity(self):
        self.assertTrue(mr.contains_real(["-1", "1"], arb(0)))
        self.assertFalse(mr.contains_real(["1", "2"], arb(0)))
        mr.upper_claim(["2", "2"], arb(1), "valid bound")
        mr.upper_claim([["2", "2"], ["0", "0"]], arb(1), "serialized real matrix bound")
        with self.assertRaises(mr.Refused):
            mr.upper_claim([["2", "2"], ["0", "1"]], arb(1), "nonreal matrix bound")
        for saved in (["0", "2"], ["-1", "2"], ["1", "0"]):
            with self.assertRaises(mr.Refused):
                mr.upper_claim(saved, arb(1), "invalid bound")
        with self.assertRaises(mr.Refused):
            mr.verify_affine({}, {}, ["1", "2"], {}, expected_operator_sha256="stale",
                             expected_sources=mr.source_pins())
        with self.assertRaises(mr.Refused):
            mr.verify_affine({}, {}, ["1", "2"], {}, expected_operator_sha256=mr.canonical_hash({}),
                             expected_sources={})

    def test_nonzero_mixed_seed(self):
        x = mr.Mixed(2, {0: acb(1)}, 3, {0: acb(4)})
        self.assertTrue((x*x).dt[0].contains(acb(22)))
        self.assertTrue(x.log().dt[0].contains(acb(arb(5)/4)))
        self.assertTrue(x.inverse().dt[0].contains(acb(arb(-1)/4)))

    def test_sparse_full_hessian(self):
        x=mr.Hessian(2,{0:acb(1)})
        y=mr.Hessian(3,{1:acb(1)})
        f=(x*x*y).log()
        self.assertTrue(f.h[(0,0)].contains(acb(arb(-1)/2)))
        self.assertTrue(f.h[(1,1)].contains(acb(arb(-1)/9)))
        self.assertTrue(f.h.get((0,1),acb(0)).contains(acb(0)))
        polynomial=x*x*y
        self.assertTrue(polynomial.h[(0,0)].contains(acb(6)))
        self.assertTrue(polynomial.h[(0,1)].contains(acb(4)))
        self.assertTrue(polynomial.h[(1,0)].contains(acb(4)))
        for op in (lambda:mr.Hessian(0).inverse(),lambda:mr.Hessian(-1).sqrt(),lambda:mr.Hessian(-1).log()):
            with self.assertRaises(mr.Refused): op()

    def test_actual_model_gradient_and_direction(self):
        with mr.model.precision(256):
            self.actual_model_gradient_and_direction()

    def actual_model_gradient_and_direction(self):
        file = Path(__file__).parent.parent / "reviews/hopf-away-pilot-2026-10-03/result.json"
        rec = json.loads(file.read_text())["family"]["proposal"]["exact_centre"]
        C = mr.centre_data(rec)
        z, tangent, g = mr.path_values(C, "19/2000", mr.ball("19/2000"), acb(0))
        J, DJ = mr.jacobian_and_direction(z, tangent, g, C["tg"])
        native = mr.model.f_and_df(z, mr.model.params(256, g_Ks=g), prec=256)[1]
        self.assertTrue(all(J[18*k+j].overlaps(native[k, j]) for k in range(18) for j in range(18)))
        self.assertTrue(all(v.is_finite() for v in DJ))
        h = mr.ball("1e-20")
        plus = mr.model.f_and_df([x + h*y for x, y in zip(z, tangent)],
                                 mr.model.params(256, g_Ks=g+h*C["tg"]), prec=256)[1]
        minus = mr.model.f_and_df([x - h*y for x, y in zip(z, tangent)],
                                  mr.model.params(256, g_Ks=g-h*C["tg"]), prec=256)[1]
        # Finite differences are a numerical cross-check of this independent AD,
        # never a proof premise. The mathematical rules have exact controls above.
        for k in range(18):
            for j in range(18):
                self.assertLess(float(((plus[k,j]-minus[k,j])/(2*h)-DJ[18*k+j]).abs_upper()), 1e-12)


if __name__ == "__main__":
    unittest.main()
