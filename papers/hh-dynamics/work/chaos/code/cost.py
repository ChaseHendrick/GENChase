"""Size and cost of a rigorous covering proof at J*: derivative and curvature bounds of the return map on the
h-sets (sampled), from which the number of boxes a first-order (mean-value, Lohner C^1) enclosure needs, and
the Taylor-integrator work per box. NUMERICAL estimates.   python3 cost.py -> ../data/cost.json"""
import json
import numpy as np
import orbits
import horseshoe as hs
from numpy.polynomial import polynomial as Pl

J = orbits.j_ours(7.8617827403)
S = hs.Setup(J)
d = json.load(open('../data/horseshoe_Jgo.json'))
H = {}
for h in d['hsets']:
    H[h['name']] = hs.HSet(h['name'], h['z_coeffs_in_s'], h['w_coeffs_in_s'], h['c2_range'][0], h['c2_range'][1], h['r3'])
NA, NB = H['N_A'], H['N_B']


def chart_jac(N, xi, eta):
    """Derivative of (xi', eta') of the image (in the target charts' linear parts) w.r.t. (xi, eta), and the
    change of that derivative across the box, from differences."""
    return None


def image_chart(N, M, xi, eta, zeta=0.0):
    c = S.image(N.chart(xi, eta, zeta))[0]
    return np.array(M.inv(c))


rep = {}
rng = np.random.default_rng(1)
for N in (NA, NB):
    for M in (NA, NB):
        # Jacobian of (xi', eta') w.r.t. (xi, eta) by central differences, at random points
        J1, J2 = [], []
        for _ in range(60):
            xi, eta = rng.uniform(-1, 1), rng.uniform(-0.98, 0.98)
            h = 1e-4
            gx = (image_chart(N, M, xi + h, eta) - image_chart(N, M, xi - h, eta)) / (2 * h)
            ge = (image_chart(N, M, xi, eta + h) - image_chart(N, M, xi, eta - h)) / (2 * h)
            gxx = (image_chart(N, M, xi + h, eta) - 2 * image_chart(N, M, xi, eta) + image_chart(N, M, xi - h, eta)) / h ** 2
            gee = (image_chart(N, M, xi, eta + h) - 2 * image_chart(N, M, xi, eta) + image_chart(N, M, xi, eta - h)) / h ** 2
            J1.append(np.abs(np.c_[gx, ge]))
            J2.append(np.abs(np.c_[gxx, gee]))
        D1, D2 = np.max(J1, axis=0), np.max(J2, axis=0)
        cov = d['covering_sampled']['%s => %s' % (N.name, M.name)]
        m_xi = min(-cov['left_face_xi_range'][1], cov['left_face_xi_range'][0], -cov['right_face_xi_range'][1],
                   cov['right_face_xi_range'][0], key=lambda v: v if v > 0 else np.inf)
        m_xi = min(abs(cov['left_face_xi_range'][0]), abs(cov['left_face_xi_range'][1]),
                   abs(cov['right_face_xi_range'][0]), abs(cov['right_face_xi_range'][1])) - 1
        m_eta = 1 - max(abs(cov['image_eta_range_all'][0]), abs(cov['image_eta_range_all'][1]))
        # boxes: a box of half-widths (rx, re) in (xi, eta); first-order enclosure excess ~ 0.5 D2 r^2 per
        # direction plus the linear part |D1| r. Faces: xi fixed, only eta subdivided, need excess < m_xi/2.
        # eta containment: need |D1_eta,xi| rx + |D1_eta,eta| re + 0.5 D2 r^2 < m_eta/2 on the whole set.
        # (mean-value form: the linear part is exact up to the enclosure of D over the box; its variation over
        # the box is D2 r, so the overestimate is D2 r^2.)
        re_face = np.sqrt(m_xi / (2 * max(D2[0, 1], 1e-30)))
        n_face = int(np.ceil(1 / min(re_face, 1.0)))
        rx = min(1.0, m_eta / (4 * max(D1[1, 0], 1e-30)), np.sqrt(m_eta / (4 * max(D2[1, 0], 1e-30))))
        rE = min(1.0, m_eta / (4 * max(D1[1, 1], 1e-30)), np.sqrt(m_eta / (4 * max(D2[1, 1], 1e-30))))
        n_int = int(np.ceil(1 / rx) * np.ceil(1 / rE))
        rep['%s => %s' % (N.name, M.name)] = {
            'max_|d(xi\',eta\')/d(xi,eta)|': D1.tolist(), 'max_|second_derivatives|': D2.tolist(),
            'margin_xi_faces': m_xi, 'margin_eta': m_eta,
            'face_boxes_per_face_first_order': n_face, 'interior_boxes_first_order': n_int}
        print(N.name, '=>', M.name, json.dumps(rep['%s => %s' % (N.name, M.name)]), flush=True)
json.dump(rep, open('../data/cost.json', 'w'), indent=1)
