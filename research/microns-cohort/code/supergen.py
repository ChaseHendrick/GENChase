# Synthetic super-population for testing the two-way interval (coverage), the null (calibration) and power.
#
# A fixed synthetic "brain" (drawn once): smooth random fields of cortical depth and of lateral position that every
# cell's tuning shares with its neighbours, a direction of tuning space that postsynaptic popularity follows (so popular
# cells are similar to each other: the confound), and the real N2 pairwise and laminar rule (coefficients fitted on the
# data). Each synthetic dataset then draws FRESH cells: the geometry (which axons with which proximity pools and co-travel
# lengths, which postsynaptic cells at which positions) is a two-way resample of the real design, every drawn cell is a
# new cell with its own tuning noise and popularity, anchors (H1) are fresh, and synapse counts are multinomial with the
# real axon totals. The estimand is conditional on the fixed brain, so the estimator's spread across datasets is the
# sampling variability the two-way interval is meant to cover.
import numpy as np, pandas as pd
import cx

class World:
    def __init__(self, ds, seed=4242, q=50, a=0.15, b=0.08, a2=0.08, b2=0.04, ld=80.0, ll=150.0, M=64,
                 sig_alpha=0.8, rho_alpha=0.8):
        rng = np.random.default_rng(seed)
        self.q, self.M = q, M
        def fields():
            return dict(wd=rng.normal(0, 1 / ld, M), pd=rng.uniform(0, 2 * np.pi, M), Ad=rng.normal(0, 1, (M, q)),
                        wl=rng.normal(0, 1 / ll, (M, 2)), pl=rng.uniform(0, 2 * np.pi, M), Al=rng.normal(0, 1, (M, q)))
        self.f1, self.f2 = fields(), fields()
        self.ab1, self.ab2 = (a, b), (a2, b2)
        v = rng.normal(size=q); self.v = v / np.linalg.norm(v)
        self.sig_alpha, self.rho_alpha = sig_alpha, rho_alpha
        m2 = cx.Model(ds, 'dt', 'N2'); b2_, _, _ = m2.fit(ds, np.ones(len(ds['y'])))
        self.names = m2.names; self.braw = b2_ / m2.sd
        self.ds = ds
        self.ntot = np.bincount(ds['g'], ds['y'], ds['G']).astype(int)

    def _smooth(self, f, xyz):
        c = np.sqrt(2.0 / self.M)
        D = c * np.cos(np.outer(xyz[:, 1], f['wd']) + f['pd']) @ f['Ad']
        F = c * np.cos(xyz[:, [0, 2]] @ f['wl'].T + f['pl']) @ f['Al']
        return D, F

    def tuning(self, xyz, rng, which=1, smooth=False):
        f = self.f1 if which == 1 else self.f2; a, b = self.ab1 if which == 1 else self.ab2
        D, F = self._smooth(f, xyz)
        sm = np.sqrt(a) * D + np.sqrt(b) * F
        t = sm + np.sqrt(1 - a - b) * rng.normal(size=(len(xyz), self.q))
        t = t - t.mean(1, keepdims=True)
        t = t / np.linalg.norm(t, axis=1, keepdims=True)
        return (t, sm) if smooth else t

    def dataset(self, seed, gamma=0.0, resample=True, overdisp=False, axlam=0.0):
        """overdisp: outside the Poisson family, the connected set is drawn without replacement and the remaining
        synapses pile onto already-connected cells (the data's multiplicity: 7,386 synapses on 6,608 pairs).
        axlam > 0: each axon gets its own random preference for each postsynaptic depth bin, exp(axlam * z)."""
        """One synthetic dataset: returns (ds_syn, G3_syn[1, J, J] float32)."""
        ds = self.ds; rng = np.random.default_rng([31415, seed])
        G, J = ds['G'], ds['J']
        vp = rng.multinomial(ds['npre'], np.full(ds['npre'], 1.0 / ds['npre'])) if resample else np.ones(ds['npre'], int)
        wp = rng.multinomial(J, np.full(J, 1.0 / J)) if resample else np.ones(J, int)
        gm = vp[ds['gpre']]
        # new presynaptic cells: one per (original presynaptic cell, copy)
        pre_copy_of = np.repeat(np.arange(ds['npre']), vp); npre2 = len(pre_copy_of)
        pre_start = np.concatenate([[0], np.cumsum(vp)[:-1]])
        gc_orig = np.repeat(np.arange(G), gm); gcopy_k = np.arange(len(gc_orig)) - np.repeat(np.cumsum(gm) - gm, gm)
        gc_pre = pre_start[ds['gpre'][gc_orig]] + gcopy_k                  # new presynaptic index of each group copy
        pc_orig = np.repeat(np.arange(J), wp)
        gstart = np.concatenate([[0], np.cumsum(gm)[:-1]]); pstart = np.concatenate([[0], np.cumsum(wp)[:-1]])
        r = np.nonzero((gm[ds['g']] > 0) & (wp[ds['j']] > 0))[0]
        mg = gm[ds['g'][r]]; mp = wp[ds['j'][r]]; tot = mg * mp
        R = np.repeat(r, tot); k = np.arange(tot.sum()) - np.repeat(np.cumsum(tot) - tot, tot); mpR = np.repeat(mp, tot)
        g_new = gstart[ds['g'][R]] + k // mpR; j_new = pstart[ds['j'][R]] + k % mpR
        G2, J2 = len(gc_orig), len(pc_orig)
        # fresh cells
        pre_xyz = ds['gxyz'][np.array([np.nonzero(ds['gpre'] == p)[0][0] for p in range(ds['npre'])])][pre_copy_of]
        post_xyz = ds['jxyz'][pc_orig]
        Tpre, Tpost = self.tuning(pre_xyz, rng, 1), self.tuning(post_xyz, rng, 1, smooth=True)
        Tpost, SMpost = Tpost
        Upre, Upost = self.tuning(pre_xyz, rng, 2), self.tuning(post_xyz, rng, 2)
        # popularity follows the smooth (depth and lateral) part of the tuning along direction v: popular cells sit in
        # the same laminar and lateral neighbourhoods and share tuning, so they are similar to each other
        z = SMpost @ self.v; z = (z - z.mean()) / z.std()
        la = self.sig_alpha * (np.sqrt(self.rho_alpha) * z + np.sqrt(1 - self.rho_alpha) * rng.normal(size=J2))
        ip = gc_pre[g_new]
        sil = np.einsum('ij,ij->i', Tpre[ip], Tpost[j_new]); fsim = np.einsum('ij,ij->i', Upre[ip], Upost[j_new])
        dss = dict(G=G2, J=J2, npre=npre2, g=g_new.astype(np.int64), j=j_new.astype(np.int64), y=np.zeros(len(R), np.int64),
                   L=ds['L'][R], gproj=ds['gproj'][gc_orig], gpre=gc_pre.astype(np.int64), glayer=ds['glayer'][gc_orig],
                   gxyz=ds['gxyz'][gc_orig], jnode=np.arange(J2, dtype=np.int64), jxyz=post_xyz, jid=np.arange(J2),
                   gid=np.array([f'{cx.PROJ[ds["gproj"][go]]}:s{i}' for i, go in enumerate(gc_orig)]),
                   cov={'sil': sil, 'fsim': fsim, 'rfd': ds['cov']['rfd'][R], 'viv': sil, 'rfsta': np.full(len(R), np.nan),
                        'logsoma': ds['cov']['logsoma'][R]}, tag='syn', wdir=None)
        cx.finish(dss, edges=ds['bin_edges'])
        X, _, _ = cx.design(dss, 'dt', names_frozen=self.names)
        lp = X @ self.braw + np.log(dss['L']) + la[j_new]
        S = (Tpost @ Tpost.T).astype(np.float32)
        order = np.argsort(g_new, kind='stable'); ptr = np.searchsorted(g_new[order], np.arange(G2 + 1))
        y = np.zeros(len(R), np.int64); gam = gamma * rng.gamma(2.0, 0.5, G2)
        if axlam > 0:
            lp = lp + axlam * rng.normal(size=(G2, cx.NBIN))[g_new, dss['jbin'][j_new]]
        nconn = np.bincount(ds['g'], (ds['y'] > 0).astype(float), ds['G']).astype(int)
        for gg in range(G2):
            rr = order[ptr[gg]:ptr[gg + 1]]
            if len(rr) == 0: continue
            pr = np.exp(lp[rr] - lp[rr].max()); pr /= pr.sum()
            if gamma > 0:
                anc = j_new[rr[rng.choice(len(rr), p=pr)]]
                pr = pr * np.exp(gam[gg] * S[j_new[rr], anc].astype(float)); pr /= pr.sum()
            if overdisp:
                k = min(nconn[gc_orig[gg]], len(rr)); sel = rng.choice(len(rr), size=k, replace=False, p=pr)
                c = np.zeros(len(rr), np.int64); c[sel] = 1; extra = self.ntot[gc_orig[gg]] - k
                if extra > 0: np.add.at(c, sel[rng.integers(0, k, extra)], 1)
                y[rr] = c
            else:
                y[rr] = rng.multinomial(self.ntot[gc_orig[gg]], pr)
        dss['y'] = y
        return dss, S[None]
