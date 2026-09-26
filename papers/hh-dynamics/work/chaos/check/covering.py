"""Claim 6: adversarial sampled test of the covering relations N_i => N_j, i, j in {A, B}. NUMERICAL, not a proof.
Usage: python3 covering.py [rtol] [hmax]  -> covering_<rtol>_<hmax>.json"""
import sys, json, time
import numpy as np
import hhk, hsets

rtol = float(sys.argv[1]) if len(sys.argv) > 1 else 1e-13
hmax = float(sys.argv[2]) if len(sys.argv) > 2 else 0.25
full = len(sys.argv) <= 3 or sys.argv[3] != 'faces'
J = hsets.J
rng = np.random.default_rng(20260926)
out = {'rtol': rtol, 'hmax': hmax, 'J': J}
# expected exit-face sides: (source) -> sign of xi' on the left face (xi=-1)
LEFT_SIGN = {'A': -1, 'B': +1}  # sign of xi' required on the image of the left face xi = -1


def run(G):
    X, info = hhk.Pbatch(G, J, rtol=rtol, atol=rtol * 1e-2, hmax=hmax)
    return X, info


def summarize(info):
    return dict(n=int(len(info)), status_bad=int((info[:, 4] != 0).sum()), umax_max=float(info[:, 1].max()),
                fu_min=float(info[:, 2].min()), gap_min=float(info[:, 3].min()),
                T_range=[float(info[:, 0].min()), float(info[:, 0].max())])


t0 = time.time()
for src in 'AB':
    res = {}
    # ---- exit faces: eta dense incl. endpoints, zeta in {-1,-.5,0,.5,1}, plus corner refinements
    eta = np.r_[np.linspace(-1, 1, 2001), -1 + np.logspace(-8, -2, 13), 1 - np.logspace(-8, -2, 13)]
    zeta = np.array([-1, -0.5, 0, 0.5, 1.0])
    for face in (-1.0, 1.0):
        E_, Z_ = np.meshgrid(eta, zeta, indexing='ij')
        G = hsets.to_x(src, face, E_.ravel(), Z_.ravel())
        X, info = run(G)
        d = {'flight': summarize(info)}
        for tgt in 'AB':
            ch = hsets.to_chart(tgt, X)
            want = -LEFT_SIGN[src] * face  # sign required for xi' (left face: LEFT_SIGN, right face: -LEFT_SIGN)
            d[tgt] = dict(xi_range=[float(ch[:, 0].min()), float(ch[:, 0].max())],
                          eta_range=[float(ch[:, 1].min()), float(ch[:, 1].max())],
                          zeta_absmax=float(np.abs(ch[:, 2]).max()),
                          min_signed_margin=float((want * ch[:, 0]).min() - 1),  # > 0 required
                          ok=bool((want * ch[:, 0] > 1).all() and (np.abs(ch[:, 1]) < 1).all() and (np.abs(ch[:, 2]) < 1).all()))
        res['face_%+d' % int(face)] = d
    if full:
        # ---- interior grid + random + adversarial strips
        xi = np.linspace(-1, 1, 81); et = np.linspace(-1, 1, 321); ze = np.array([-1.0, 0.0, 1.0])
        XI, ET, ZE = np.meshgrid(xi, et, ze, indexing='ij')
        pts = [np.c_[XI.ravel(), ET.ravel(), ZE.ravel()]]
        pts.append(np.c_[rng.uniform(-1, 1, 30000), rng.uniform(-1, 1, 30000), rng.uniform(-1, 1, 30000)])
        # strips near every edge: xi in [0.95,1] and [-1,-0.95], eta near +-1, zeta = +-1
        n = 20000
        s = rng.uniform(0.95, 1, n) * rng.choice([-1, 1], n)
        pts.append(np.c_[s, rng.uniform(-1, 1, n), rng.choice([-1.0, 1.0], n)])
        pts.append(np.c_[rng.uniform(-1, 1, n), rng.uniform(0.98, 1, n) * rng.choice([-1, 1], n), rng.uniform(-1, 1, n)])
        P = np.vstack(pts)
        G = hsets.to_x(src, P[:, 0], P[:, 1], P[:, 2])
        X, info = run(G)
        d = {'flight': summarize(info), 'npoints': int(len(P))}
        for tgt in 'AB':
            ch = hsets.to_chart(tgt, X)
            inside = np.abs(ch[:, 0]) <= 1
            d[tgt] = dict(eta_range=[float(ch[:, 1].min()), float(ch[:, 1].max())],
                          zeta_absmax=float(np.abs(ch[:, 2]).max()), n_image_in_N=int(inside.sum()),
                          ok=bool((np.abs(ch[:, 1]) < 1).all() and (np.abs(ch[:, 2]) < 1).all()))
        res['interior'] = d
        # ---- continuity along xi lines: fine lines, max jump of the image and of T between neighbours
        xi = np.linspace(-1, 1, 4001)
        jumps = []
        for e in (-1, -0.5, 0, 0.5, 1):
            for z in (-1, 0, 1):
                G = hsets.to_x(src, xi, e, z)
                X, info = run(G)
                c = (X - hsets.A) @ hsets.Einv.T
                dc = np.abs(np.diff(c[:, 0])); dT = np.abs(np.diff(info[:, 0]))
                # a discontinuity shows as a jump much larger than the typical neighbour step
                jumps.append(dict(eta=e, zeta=z, max_dc1_over_median=float(dc.max() / np.median(dc)),
                                  max_dT=float(dT.max()), T_range=[float(info[:, 0].min()), float(info[:, 0].max())],
                                  monotone_c1=bool((np.diff(c[:, 0]) > 0).all() or (np.diff(c[:, 0]) < 0).all()),
                                  umax=float(info[:, 1].max())))
        res['continuity_lines'] = jumps
    out[src] = res
    print(src, 'done', time.time() - t0, flush=True)
json.dump(out, open('covering_%g_%g%s.json' % (rtol, hmax, '' if full else '_faces'), 'w'), indent=1)
print(json.dumps(out, indent=1)[:6000])
