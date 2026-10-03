"""Bounded controls for preliminary reductions, not stability certificates."""
import math
from fractions import Fraction
import unittest
import numpy as np
import alln_stability as st
import importlib.util
from pathlib import Path


class ReductionControls(unittest.TestCase):
    def test_centered_sectors_include_every_direction(self):
        self.assertEqual(st.sectors(8), (-4, -3, -2, -1, 0, 1, 2, 3))
        self.assertEqual(st.sectors(9), (-4, -3, -2, -1, 0, 1, 2, 3, 4))
        for N in range(8, 40):
            self.assertEqual({q % N for q in st.sectors(N)}, set(range(N)))

    def test_exact_spatial_bound_at_alias_edge_and_both_signs(self):
        for N in (8, 9, 16, 32, 101):
            for q in st.sectors(N):
                for M in (0, 1, 3):
                    lower = float(st.spatial_lower(q, M, N))
                    for m in range(-M, M+1):
                        actual = 4*N*N*float(st.D)*math.sin(math.pi*(q+m)/N)**2
                        self.assertGreaterEqual(actual + 1e-14, lower)
        with self.assertRaises(ValueError):
            st.spatial_lower(4, 0, 8)

    def gate(self, **changes):
        values = dict(M=10, Q=200, omega_lo="1", strip_height="1/2",
                      delta="1/100", alpha_v="1", beta_vw="1/10",
                      beta_wv="1/10", rho_w="2")
        values.update(changes)
        return st.high_sector_gate(**values)

    def test_strict_schur_majorant_and_no_admission(self):
        r = self.gate()
        self.assertTrue(all(r["strict_gates"].values()))
        self.assertLess(Fraction(r["schur_loop"]), 1)
        self.assertIs(r["certified"], False)
        self.assertFalse(self.gate(alpha_v="21/2", beta_vw="0")["strict_gates"]["temporal_tail"])
        # Equality at spatial boundary is refused exactly, without float tolerance.
        L = st.spatial_lower(200, 10)
        r = self.gate(alpha_v=L-Fraction(1, 100), beta_vw="0")
        self.assertFalse(r["strict_gates"]["spatial_low_modes"])

    def test_float_bool_and_negative_majorants_refused(self):
        for value in (True, 0.1, float("inf"), float("nan")):
            with self.assertRaises(ValueError):
                self.gate(rho_w=value)
        with self.assertRaises(ValueError):
            self.gate(beta_vw="-1")
        with self.assertRaises(ValueError):
            st.sectors(True)

    def test_constant_field_hill_sign_and_sector_shift(self):
        a = -np.diag(np.arange(1, 19, dtype=float))
        matrix = st.hill_matrix({0: a}, 2.0, 1, q=3)
        for row, m in enumerate((-1, 0, 1)):
            expected = -1 - 4*math.pi**2*float(st.D)*(m+3)**2 - 2j*m
            self.assertAlmostEqual(matrix[18*row, 18*row], expected)
            self.assertEqual(matrix[18*row+1, 18*row+1], -2-2j*m)
        frozen = st.hill_matrix({0: a}, 2.0, 1, q=3, frozen_voltage=True)
        self.assertEqual(frozen.shape, (51, 51))
        self.assertEqual(frozen[0, 0], -2+2j)
        summary = st.spectral_summary(frozen, 2.0)
        self.assertEqual(summary["basic_strip_eigenvalues"], 17)
        self.assertEqual(summary["positive_real_count_untrusted"], 0)

    def test_invalid_matrix_refused(self):
        with self.assertRaises(ValueError):
            st.hill_matrix({0: np.full((18, 18), np.nan)}, 1.0, 0)
        with self.assertRaises(ValueError):
            st.hill_matrix({0: np.zeros((17, 17))}, 1.0, 0)

    def test_membrane_capacitance_does_not_scale_internal_calcium_flux(self):
        """Reject the former documentation claim that every flux scales by Cm."""
        path = Path(__file__).resolve().parents[1] / "model/tp06_18d.py"
        spec = importlib.util.spec_from_file_location("flux_reference", path)
        model = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(model)
        state = [-20.0] + [0.3]*13 + [0.0002, 2.0, 0.00036, 10.0]

        def control(rhs):
            f1 = rhs(state, dict(model.PARAMS, Cm=1.0))
            f185 = rhs(state, dict(model.PARAMS, Cm=0.185))
            # Ca_sr has only internal uptake/release/leak. Na_i has membrane terms.
            self.assertNotEqual(f1[15], 0.0)
            self.assertEqual(f1[15], f185[15])
            self.assertNotEqual(f1[17], 0.0)
            self.assertAlmostEqual(f1[17]/f185[17], 1/0.185, places=12)
            self.assertGreater(abs(f1[15]-f185[15]/0.185), abs(f1[15]))

        control(model.field)

        def wrong_all_flux_scaling(x, params):
            result = model.field(x, params)
            result[15] *= params["Cm"]
            return result

        with self.assertRaises(AssertionError):
            control(wrong_all_flux_scaling)

    def test_prescribed_voltage_count0_and_no_skip_controls(self):
        import alln_gate_core as core
        from flint import arb, acb, ctx
        old = ctx.prec
        ctx.prec = 128
        try:
            nA = 32
            J = {n: [[acb(-i-1 if n == 0 and i == j else 0)
                       for j in range(6)] for i in range(6)]
                 for n in range(-nA, nA+1)}
            inp = dict(K=0, Kp=nA, rho=arb(1), rho0=arb(1)/4,
                       rho2=arb(1)/8, R=arb(1), r=arb(0),
                       om_lo=arb(1), om_hi=arb(1), om_bar=arb(1),
                       J=J, SJ=[[arb(i+1 if i == j else 0) for j in range(6)]
                                for i in range(6)],
                       eps_direct=[[arb(0) for _ in range(6)] for _ in range(6)],
                       rec={"r_existence": {"hex": "0x0p0"}})
            settings = dict(core.native.DEFAULTS, Ke_offset=8, n_c=2, S_exps=[0]*6)
            call = lambda controls: core.certify_gate(
                1, inp, settings, controls, lambda _: None, lambda _: None, 128)
            result = call({})
            self.assertEqual(result["count_in_Omega"], 0)
            self.assertLess(result["SC_worst_ratio"], 1)
            self.assertIsNone(result["eigenvalue_in_Omega"])
            with self.assertRaises(ValueError):
                call({"skip_count": True})
            J[0][0][0] = acb("0.1")
            with self.assertRaises(core.ProofFailure):
                call({})
        finally:
            ctx.prec = old


if __name__ == "__main__":
    unittest.main()
