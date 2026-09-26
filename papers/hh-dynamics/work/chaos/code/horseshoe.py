"""Candidate h-sets for a two-symbol horseshoe of the Hodgkin-Huxley return map, and a sampled (NUMERICAL,
NOT RIGOROUS) test of the Zgliczynski-Gidea covering relations between them.

Section: u = 4.5 crossed with u increasing (G&O's p1 and p2 lie there). Coordinates on the section: c = E^{-1}
(x - A), x = (m, n, h), where A is the fixed point of orbit A (Floquet multipliers ~ +33, 0.28, and a strong-stable one below float64 resolution) and E the
real eigenvectors of DP(A) sorted by modulus: c1 unstable, c2 weak stable, c3 strong stable.

The return map is a three-lap map along c1 (at fixed c2): lap 1 through A (increasing), lap 2 through B
(decreasing; B is the period-doubled saddle, multipliers ~ -510, -0.19), lap 3 through C (G&O's p2, multiplier
~2.8e7) within ~1e-10 of the one-return firing boundary. The zero curves z1(c2), z2(c2) of c1' = c1(P(x)) are
graphs over c2 and give the h-sets

    N_k = { c = (z_k(c2) + w_k(c2) xi, c2, r3 zeta) : xi, zeta in [-1, 1], c2 in [c2lo, c2hi] },  k = A, B,

with u-coordinate xi (exit set xi = +-1) and s-coordinates eta = (2 c2 - c2lo - c2hi)/(c2hi - c2lo), zeta. The
covering N_i => N_j (Zgliczynski and Gidea, J. Differential Equations 202 (2004) 32-58, the u = 1 case) holds if
the two exit faces map into opposite half-spaces {xi_j < -1} and {xi_j > 1} and P(N_i) meets no entry face of
N_j, which we test in the stronger form |eta_j| < 1 and |zeta_j| < 1 on all of P(N_i).
"""
import numpy as np
from numpy.polynomial import polynomial as Pl
from scipy.optimize import brentq
import hhc
import pmap
import orbits

SEC, DIR = orbits.SEC, orbits.DIR


class Setup:
    def __init__(self, J, branch='../data/branch.npz'):
        self.J = J
        self.A, rA, self.TA, DPA, _, _ = orbits.branch_orbit(J, 'A', branch)
        self.B, rB, self.TB, DPB, _, _ = orbits.branch_orbit(J, 'B', branch)
        self.resA, self.resB = np.abs(rA).max(), np.abs(rB).max()
        self.muA = orbits.eig_sorted(DPA)[0]
        self.muB = orbits.eig_sorted(DPB)[0]
        w, V = orbits.eig_sorted(DPA)
        self.E = np.real(V) / np.linalg.norm(np.real(V), axis=0)
        self.Ei = np.linalg.inv(self.E)
        # orientation: B at c1 > 0, c2 < 0 (the eigenvector signs are otherwise arbitrary)
        cB = self.Ei @ (self.B - self.A)
        self.E[:, 0] *= np.sign(cB[0])
        self.E[:, 1] *= -np.sign(cB[1])
        self.E[:, 2] *= np.sign(self.E[1, 2]) if self.E[1, 2] != 0 else 1.0
        self.Ei = np.linalg.inv(self.E)
        self.scale = abs(cB[0])             # c1 of B sets the width of the search window

    def x_of(self, c):
        return self.A + self.E @ c

    def c_of(self, x):
        return self.Ei @ (x - self.A)

    def image(self, c, var=False):
        """c -> (c', T, umax, u' at arrival, [D in c-coordinates])."""
        x = self.x_of(np.asarray(c, float))
        out = pmap.P(x, self.J, SEC, var=var, direction=DIR)
        x1, T, DP, _, umax, umin = out
        cp = self.c_of(x1)
        if var:
            return cp, T, umax, self.Ei @ DP @ self.E
        return cp, T, umax

    def firing_boundary(self, c2, lo=None, hi=None, umax_fire=40.0):
        """c1 where the first return starts to contain a spike (bisection on umax)."""
        lo = -0.4 * self.scale if lo is None else lo
        hi = 8.0 * self.scale if hi is None else hi
        if self.image([hi, c2, 0.0])[2] <= umax_fire:
            raise ValueError('no firing boundary in the window')
        for _ in range(70):
            m = 0.5 * (lo + hi)
            if self.image([m, c2, 0.0])[2] > umax_fire:
                hi = m
            else:
                lo = m
        return lo

    def zeros(self, c2):
        """The zeros z1 < z2 < z3 of c1' along the line c2 = const, left of the firing boundary."""
        cb = self.firing_boundary(c2)
        lo = -0.4 * self.scale
        cs = np.sort(np.r_[np.linspace(lo, cb, 300)[:-1], cb - np.geomspace(1e-7, 1e-14, 40) * (cb - lo)])
        f = lambda c: self.image([c, c2, 0.0])[0][0]
        v = np.array([f(c) for c in cs])
        k = np.where(np.sign(v[1:]) != np.sign(v[:-1]))[0]
        z = [brentq(f, cs[i], cs[i + 1], xtol=1e-18) for i in k]
        return z, cb, v, cs


class HSet:
    """N = {(z(c2) + w(c2) xi, c2, r3 zeta)} with polynomial z, w in s = (c2 - mid)/rad."""

    def __init__(self, name, zc, wc, c2lo, c2hi, r3):
        self.name, self.zc, self.wc = name, np.asarray(zc), np.asarray(wc)
        self.c2lo, self.c2hi, self.r3 = c2lo, c2hi, r3
        self.mid, self.rad = 0.5 * (c2lo + c2hi), 0.5 * (c2hi - c2lo)

    def z(self, c2):
        return Pl.polyval((c2 - self.mid) / self.rad, self.zc)

    def w(self, c2):
        return Pl.polyval((c2 - self.mid) / self.rad, self.wc)

    def chart(self, xi, eta, zeta):
        c2 = self.mid + self.rad * eta
        return np.array([self.z(c2) + self.w(c2) * xi, c2, self.r3 * zeta])

    def inv(self, c):
        eta = (c[1] - self.mid) / self.rad
        xi = (c[0] - self.z(c[1])) / self.w(c[1])
        return xi, eta, c[2] / self.r3

    def describe(self):
        return {'name': self.name, 'c2_range': [self.c2lo, self.c2hi], 'r3': self.r3,
                'z_coeffs_in_s': self.zc.tolist(), 'w_coeffs_in_s': self.wc.tolist(),
                's': '(c2 - %.10g)/%.10g' % (self.mid, self.rad)}


def fit_hsets(S, c2lo, c2hi, wA=2.5e-6, thetaB=0.4, r3=1e-6, n=41, deg=8, verbose=True):
    """Zero curves z1, z2 and the firing boundary on n points of [c2lo, c2hi]; polynomial fits."""
    c2s = np.linspace(c2lo, c2hi, n)
    Z = []
    for c2 in c2s:
        z, cb, _, _ = S.zeros(c2)
        Z.append([c2, z[0], z[1], z[2] if len(z) > 2 else np.nan, cb])
        if verbose:
            print('  c2=%+.5f z1=%.9e z2=%.9e gap=%.3e' % (c2, z[0], z[1], cb - z[1]), flush=True)
    Z = np.array(Z)
    s = (c2s - 0.5 * (c2lo + c2hi)) / (0.5 * (c2hi - c2lo))
    zA = Pl.polyfit(s, Z[:, 1], deg)
    zB = Pl.polyfit(s, Z[:, 2], deg)
    wB = Pl.polyfit(s, thetaB * (Z[:, 4] - Z[:, 2]), deg)
    fit_err = (np.abs(Pl.polyval(s, zA) - Z[:, 1]).max(), np.abs(Pl.polyval(s, zB) - Z[:, 2]).max())
    NA = HSet('N_A', zA, [wA], c2lo, c2hi, r3)
    NB = HSet('N_B', zB, wB, c2lo, c2hi, r3)
    return NA, NB, Z, fit_err


def check_cover(S, Ni, targets, nface=801, nxi=81, neta=161, zetas=(-1.0, 0.0, 1.0)):
    """Sampled covering test of Ni => Nj for each Nj in targets. Returns a dict of margins."""
    res = {}
    # exit faces
    faces = {}
    for side in (-1.0, 1.0):
        pts = []
        for eta in np.linspace(-1, 1, nface):
            for zeta in zetas:
                cp, T, um = S.image(Ni.chart(side, eta, zeta))
                pts.append(cp)
        faces[side] = np.array(pts)
    # interior grid
    grid = []
    for xi in np.linspace(-1, 1, nxi):
        for eta in np.linspace(-1, 1, neta):
            cp, T, um = S.image(Ni.chart(xi, eta, 0.0))
            grid.append(cp)
    grid = np.array(grid)
    for Nj in targets:
        xl = np.array([Nj.inv(c)[0] for c in faces[-1.0]])
        xr = np.array([Nj.inv(c)[0] for c in faces[1.0]])
        g = np.array([Nj.inv(c) for c in grid])
        inside = np.abs(g[:, 0]) <= 1
        r = {'left_face_xi_range': [xl.min(), xl.max()], 'right_face_xi_range': [xr.min(), xr.max()],
             'image_eta_range_all': [g[:, 1].min(), g[:, 1].max()],
             'image_eta_range_where_|xi|<=1': [g[inside, 1].min(), g[inside, 1].max()] if inside.any() else None,
             'image_zeta_absmax': np.abs(g[:, 2]).max(), 'n_grid_points_with_|xi|<=1': int(inside.sum())}
        opp = (xl.max() < -1 and xr.min() > 1) or (xl.min() > 1 and xr.max() < -1)
        ent = np.abs(g[:, 1]).max() < 1 and np.abs(g[:, 2]).max() < 1
        r['exit_faces_opposite'] = bool(opp)
        r['image_within_eta_zeta'] = bool(ent)
        r['covers'] = bool(opp and ent)
        res[Nj.name] = r
    return res
