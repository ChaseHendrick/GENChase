"""Exact near-Hopf closure controls and an independently known planar coefficient."""
import copy
from fractions import Fraction
import unittest
from flint import arb, acb, acb_mat
import hopf_stability_local as local


class LocalControls(unittest.TestCase):
    def fixture(self):
        # Exact example s(e)=-4e^2+e^4, |e|<=1/4, hence |s|<=65/256.
        return dict(b_lo='-4', b_hi='-4', trace_sup='65/256', analytic_radius='1/4',
                    e0='1/100', stable_multiplier_upper='9/10', period_upper='7')

    def test_closure_and_actual_scalar_function(self):
        rec = local.close_local_bound(**self.fixture())
        self.assertFalse(rec['model_stability_certified'])
        c = Fraction(rec['radial_multiplier_drop_coefficient'])
        u = Fraction(rec['radial_multiplier_drop_upper'])
        for e in (Fraction(1, 100), Fraction(1, 1000), Fraction(1, 10**20)):
            m = 1-4*e*e+e**4
            self.assertLessEqual(1-u*e*e, m)
            self.assertLessEqual(m, 1-c*e*e)
            self.assertLess(m, 1)
        self.assertNotIn('certified', rec)

    def test_sign_remainder_and_boundary_rejections(self):
        for key,value in [('b_hi','0'), ('b_lo','-3'), ('trace_sup','-1'),
                          ('trace_sup','1/1000'), ('analytic_radius','1/100'),
                          ('e0','0'), ('e0','1/5'), ('stable_multiplier_upper','1'),
                          ('stable_multiplier_upper','0'), ('period_upper','0')]:
            bad=self.fixture();bad[key]=value
            with self.subTest(key=key,value=value), self.assertRaises(local.hp.ProofFailure):
                local.close_local_bound(**bad)

    def test_float_boolean_and_ambiguous_text_refused(self):
        for value in (True, False, 0.01, '0.01', '1e-2', '1/0', 'nan', 'Infinity', '+1', '01', '1/00'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                local.rational(value)
        with self.assertRaises(TypeError):
            local.close_local_bound(**self.fixture(), certified=True)

    def test_planar_hopf_normalization_factor(self):
        # xdot=mu*x-y-x*(x*x+y*y), ydot=x+mu*y-y*(x*x+y*y).
        # At the Hopf point omega=1, unit q=(1,-i)/sqrt(2), l1=-2.
        # The cycle x=e*cos(t), y=e*sin(t) at mu=e^2 has radial exponent -2e^2.
        with local.hp.am.precision(192):
            A=acb_mat([[0,-1],[1,0]])
            q=[acb(1)/arb(2).sqrt(),acb(0,-1)/arb(2).sqrt()]
            p=[x.conjugate() for x in q]
            def F(v):
                a,b=v
                return [[acb(0),-b,acb(0),-a*(a*a+b*b)],
                        [acb(0),a,acb(0),-b*(a*a+b*b)]]
            l1=local.hp.lyap1(A,F,arb(1),q,p)
            self.assertTrue(l1.contains(-2))
            b_lambda,b_mult=local.leading_from_normalization(arb(1),l1,arb(1)/2)
            self.assertTrue(b_lambda.contains(-2))
            self.assertTrue((b_mult+4*arb.pi()).contains(0))
            self.assertFalse(b_lambda.contains(-1))

    def test_normalization_and_sign_invalid(self):
        for omega,l1,q2 in ((0,-2,1), (1,0,1), (1,2,1), (1,-2,0)):
            with self.subTest(values=(omega,l1,q2)), self.assertRaises(local.hp.ProofFailure):
                local.leading_from_normalization(arb(omega),arb(l1),arb(q2))

    def test_complex_grid_covers_square(self):
        with local.hp.am.precision(192):
            grid=local.square_grid('1/100',2)
            self.assertEqual(len(grid),4)
            for x in (-1,0,1):
                for y in (-1,0,1):
                    point=acb(local.hp._arb_q(Fraction(x,100)),local.hp._arb_q(Fraction(y,100)))
                    self.assertTrue(any(box.contains(point) for box in grid))
            square=local.complex_square('1/100')
            self.assertTrue(all(square.contains(box) for box in grid))
            self.assertGreater(float(square.imag.rad()),0)
        for count in (0,False,1.5,17):
            with self.assertRaises(ValueError):local.square_grid('1/100',count)

    def test_private_json_duplicate_and_nonfinite(self):
        for text in ('{"x":1,"x":2}', '{"x":Infinity}', '{"x":NaN}'):
            import tempfile
            from pathlib import Path
            with tempfile.TemporaryDirectory() as d:
                path=Path(d)/'bad.json';path.write_text(text)
                with self.assertRaises(ValueError):local.read_json(path)

    def test_strict_receipt_indices_and_tail(self):
        import json
        rows=[dict(idx=i) for i in range(local.hp.EXPECTED_PIECES)]
        encode=lambda rr: ('\n'.join(json.dumps(r) for r in rr)+'\n').encode()
        good=encode(rows)
        self.assertEqual(len(local.strict_receipts(good)),68)
        for bad in (good[:-1],encode(rows+rows[:1]),encode(rows[:-1]),
                    encode([dict(idx=True)]+rows[1:])):
            with self.assertRaises(local.hp.ProofFailure):local.strict_receipts(bad)

    def test_quotient_full_tail_fixture(self):
        """Exact planar Hopf block plus16 stable modes, including infinite tail."""
        from flint import acb_mat
        D=local.hp.DIM;IV=local.hp.IV;other=(IV+1)%D
        with local.hp.am.precision(192):
            w=[[acb(0)]*3 for _ in range(D)]
            w[IV][0]=w[IV][2]=acb(local.hp._arb_q('1/2'))
            w[other][2]=acb(0,local.hp._arb_q('-1/2'))
            w[other][0]=w[other][2].conjugate()
            C=local.hp.Centre(1,0,[0]*D,w,0,0,[0]*D,[[acb(0)]*3 for _ in range(D)],1)
            J=acb_mat(D,D)
            for k in range(D):J[k,k]=acb(-2)
            J[IV,IV]=J[other,other]=acb(0)
            J[IV,other]=acb(-1);J[other,IV]=acb(1)
            phase={m:[acb(0,m)*w[k][m+1] for k in range(D)] for m in (-1,0,1)}
            F=dict(J={n:J if n==0 else acb_mat(D,D) for n in range(-16,17)},
                 C=C,Kp=16,omega=acb(1),omega_error=arb(0),ec=Fraction(0),
                 SJ=[[J[k,j].abs_upper() for j in range(D)] for k in range(D)],
                 eps=[[arb(0)]*D for _ in range(D)],rho=arb(1),rho0=arb(1),
                 rhoe=local.hp._arb_q('1/16'),phase=phase,phase_centre=w,
                 phase_radius=[arb(0)]*D,full_strip=True)
            result=local.quotient_eigenpair(F,K=1,eta=['1']*(D+2),r_star='1/1024',log=lambda s:None)
            self.assertFalse(result['model_stability_certified'])
            self.assertGreater(local.hp.hex_fraction(result['r_existence']),0)
            for change in (dict(full_strip=False),dict(omega_error=arb(-1)),
                           dict(SJ=[[arb(-1)]*D for _ in range(D)]),
                           dict(phase_radius=[arb(-1)]*D)):
                with self.assertRaises(local.hp.ProofFailure):
                    local.quotient_eigenpair(dict(F,**change),K=1,eta=['1']*(D+2),log=lambda s:None)
            # A known periodic Hopf cycle with squared radius a2 has physical
            # radial exponent -2*a2. Its Jacobian has modes0,+2,-2, and its
            # exact phase vector remains in the kernel. A lambda-column sign
            # reversal changes the Newton exponent and fails this regression.
            a2=local.hp._arb_q('1/1024')
            J0=acb_mat(J);J0[IV,IV]=J0[other,other]=acb(-a2)
            J2=acb_mat(D,D)
            J2[IV,IV]=acb(-a2/2);J2[other,other]=acb(a2/2)
            J2[IV,other]=J2[other,IV]=acb(0,a2/2)
            JJ=dict(F['J']);JJ[0]=J0;JJ[2]=J2;JJ[-2]=J2.conjugate()
            SS=[[arb(v) for v in row] for row in F['SJ']]
            SS[IV][IV]=SS[other][other]=10*a2
            SS[IV][other]=SS[other][IV]=1+10*a2
            cyc=dict(F,J=JJ,SJ=SS)
            radial=local.quotient_eigenpair(cyc,K=1,eta=['1']*(D+2),r_star='1/64',log=lambda s:None)
            proposal=radial['physical_exponent_newton_proposal']
            self.assertLess(float(proposal['upper']['dec']),0)
            self.assertLess(float(proposal['lower']['dec']),-1/1024)
            # K>C.K genuinely exercises the complex phase-coefficient
            # fallback. These are new derivative uncertainty boxes, not
            # claims about extra harmonic coefficients of the exact cycle.
            larger=dict(F,phase_radius=[local.hp._arb_q('1/1073741824')]*D)
            extra=local.quotient_eigenpair(larger,K=2,eta=['1']*(D+2),r_star='1/1024',log=lambda s:None)
            self.assertFalse(extra['model_stability_certified'])


if __name__ == '__main__':
    unittest.main()
