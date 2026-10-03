"""Admission controls for the new amplitude-family producer."""
import unittest
from fractions import Fraction
from flint import acb, arb
import hopf_stability as hs


class AdmissionTests(unittest.TestCase):
    @staticmethod
    def identification_inputs(radius):
        w = [[acb(0)] * 3 for _ in range(18)]
        w[0] = [acb("0.5"), acb(0), acb("0.5")]
        C = hs.hp.Centre(1, 1, [0] * 18, w, 0, 0, [0] * 18,
                         [[acb(0)] * 3 for _ in range(18)], 1)
        E = [arb(1)] * hs.hp.NC
        parent = dict(eta=["1"] * hs.hp.NC, centre=C.to_record(), e_lo="1", e_hi="2",
                      result=dict(r_uniqueness=hs.ex.bound_rec(arb(1))))
        res = dict(_obj=dict(E=E, r_lo=arb(radius), C=C, nu=arb(1)))
        return parent, res

    def test_positive_closed_subinterval(self):
        parent = dict(e_lo="1/125", e_hi="11/1000")
        self.assertEqual(hs.symmetric_interval(parent, "1/100000"),
                         (Fraction(949, 100000), Fraction(951, 100000)))

    def test_nonexact_and_outside_rejected(self):
        parent = dict(e_lo="1/125", e_hi="11/1000")
        for width in (True, 1e-5, "0", "-1/1000", "1/100"):
            with self.subTest(width=width), self.assertRaises(ValueError):
                hs.symmetric_interval(parent, width)

    def test_zero_endpoint_rejected(self):
        with self.assertRaises(ValueError):
            hs.symmetric_interval(dict(e_lo="0", e_hi="1/500"), "1/1000")

    def test_parent_unique_ball_is_strict(self):
        class Cover:
            def contains(self, *args):
                return True
        parent, res = self.identification_inputs(1)
        with self.assertRaises(hs.hp.ProofFailure):
            hs._parent_identification(parent, res, Cover(), Fraction(1), Fraction(2))
        res["_obj"]["r_lo"] = arb("0.5")
        receipt = hs._parent_identification(parent, res, Cover(), Fraction(1), Fraction(2))
        self.assertTrue(receipt["strict"])

    def test_cover_escape_rejected(self):
        class Cover:
            def contains(self, *args):
                return False
        parent, res = self.identification_inputs("0.5")
        with self.assertRaises(hs.hp.ProofFailure):
            hs._parent_identification(parent, res, Cover(), Fraction(1), Fraction(2))


if __name__ == "__main__":
    unittest.main()
