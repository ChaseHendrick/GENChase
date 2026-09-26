# Core library for the fixes stage of the MICrONS cohort ("higher-order") reanalysis (Ding et al. 2025, Nature 640:459).
#
# Nulls (all draw each axon's synapses inside its own axon-dendrite proximity pool, i.e. pairs with co-travel L > 0):
#   N0   own pool: multinomial over the pool with p ~ L exp(x b)                        (stage 1)
#   N0p  N0 plus log soma distance and a linear gradient in absolute postsynaptic soma position, per projection type
#   N1   degree-preserving: every postsynaptic cell's total synapse count is held fixed as well as every axon's total;
#        synapses are reassigned among axons by Metropolis swaps with pair weights L exp(x b), b from the two-way
#        (axon and postsynaptic cell) fixed-effect Poisson fit. Exact conditional null of the model
#        N_ij ~ Poisson(lambda_i alpha_j L_ij exp(x_ij b)) for ANY postsynaptic propensities alpha_j.
#   N1s  N1 plus log soma distance
#   N2   N1s plus a depth-pair term: presynaptic layer x postsynaptic depth bin x projection (identifiable contrasts)
#   N3   N1s plus each axon's own laminar profile: the axon's synapse count in each postsynaptic depth bin is held fixed
#        (swaps only within a depth bin); exact conditional null of lambda_{i,bin(j)} alpha_j L_ij exp(x_ij b)
#
# The cohort statistic is Ding et al.'s rho_i = sum_{j!=k} N_ij N_ik S_jk / sum_{j!=k} N_ij N_ik (synapse weighted);
# the excess of an axon is rho_obs - E_null[rho]. Everything random is seeded.
import os, time, json
import numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault('NUMBA_CACHE_DIR', os.path.join(HERE, '.numba'))
import numba as nb

# Working folder and the folder holding Ding et al.'s release files (node_data_v1.pkl, edge_data_v1.pkl); both can be
# set by environment variables (added after all reported runs; the defaults are the paths those runs used).
W = os.environ.get('MICRONS_WORK', os.path.join(HERE, 'work'))
DATA = os.path.abspath(os.environ.get('MICRONS_DATA', os.path.join(HERE, '../../neuro-impact/data'))) + '/'
PROJ = ['V1_V1', 'HVA_HVA', 'V1_HVA', 'HVA_V1']
TAREA = np.array([0, 1, 1, 0])      # target area of each projection type: 0 = V1, 1 = HVA
LAYERS = ['L2/3', 'L4', 'L5']
FAMILY = {'dt': ['sil', 'fsim', 'rfd'], 'iv': ['viv', 'fsim', 'rfd']}
NBIN = 6                            # postsynaptic depth bins (equal-count over postsynaptic cells) for N2 and N3
KMIN = 10                           # Ding et al.: axon-projection groups with >= 10 connected partners
MEAS = ['sil', 'viv', 'Fsil', 'Fviv']   # measures: digital-twin and in vivo signal correlation, and their laminar parts

# ----------------------------------------------------------------------------------------------------------------------
# data
def wdir(tag='main'):
    return W if tag == 'main' else os.path.join(W, tag)

def load_real(tag='main'):
    """Analysis pairs of a dataset. tag 'main': Ding et al.'s release (work/); any other tag: a table built by build.py
    from a second edges table with the same schema (work/<tag>/), with the depth-bin edges frozen from main."""
    Wt = wdir(tag)
    d = pd.read_csv(os.path.join(Wt, 'pairs_syn.csv'))
    if tag == 'main':
        nodes = pd.read_pickle(DATA + 'node_data_v1.pkl').set_index('nucleus_id')
    else:
        nodes = pd.read_pickle(os.path.join(Wt, 'nodes_xyz.pkl'))
    xyz = nodes[['nucleus_x', 'nucleus_y', 'nucleus_z']].astype(float) / 1000.0     # um; y is cortical depth
    lay = nodes.layer.astype(str)
    gnodes = np.load(os.path.join(Wt, 'gram_nodes.npy')); gpos = pd.Series(np.arange(len(gnodes)), index=gnodes)
    gkey = d.proj + ':' + d.pre.astype(str)
    g, gu = pd.factorize(gkey)
    j, ju = pd.factorize(d.post)
    pre_codes, pre_u = pd.factorize(d.pre)
    G, J = len(gu), len(ju)
    gproj = np.array([PROJ.index(k.split(':')[0]) for k in gu])
    gpre_id = np.array([int(k.split(':')[1]) for k in gu])
    gpre = pd.Series(np.arange(len(pre_u)), index=pre_u)[gpre_id].values
    # 4 presynaptic V1 cells have no layer label; their somata sit at 855-905 um, below the deepest labelled L5 cell
    # (867 um), so they are grouped with L5 as 'L5 or deeper' (any unlabelled presynaptic cell is treated the same way)
    glayer = np.array([LAYERS.index(lay[p]) if lay[p] in LAYERS else 2 for p in gpre_id])
    jxyz = xyz.reindex(ju).values
    gxyz = xyz.reindex(gpre_id).values
    ds = dict(G=G, J=J, npre=len(pre_u), g=g.astype(np.int64), j=j.astype(np.int64), y=d.nsyn.values.astype(np.int64),
              L=d.L.values.astype(float), gproj=gproj, gpre=gpre.astype(np.int64), glayer=glayer, gxyz=gxyz,
              jnode=gpos[ju].values.astype(np.int64), jxyz=jxyz, jid=np.asarray(ju), gid=np.asarray(gu),
              cov={c: d[c].values.astype(float) for c in ['sil', 'fsim', 'rfd', 'viv', 'rfsta']}, tag=tag, wdir=Wt)
    ds['cov']['logsoma'] = np.log(d.soma.clip(lower=1.0).values)
    if tag == 'main':
        finish(ds)
        if not os.path.exists(os.path.join(W, 'bin_edges.npy')): np.save(os.path.join(W, 'bin_edges.npy'), ds['bin_edges'])
    else:
        finish(ds, edges=np.load(os.path.join(W, 'bin_edges.npy')))
    return ds

def finish(ds, edges=None):
    """Depth bins and derived per-row arrays."""
    dep = ds['jxyz'][:, 1]
    if edges is None:
        edges = np.quantile(dep, np.linspace(0, 1, NBIN + 1)[1:-1])
    ds['bin_edges'] = edges
    ds['jbin'] = np.searchsorted(edges, dep).astype(np.int64)
    ds['proj_r'] = ds['gproj'][ds['g']]
    ds['pre_r'] = ds['gpre'][ds['g']]
    return ds

NBL, BL = 21, 50.0

def _node_geom(ds, N):
    nxyz = np.zeros((N, 3)); narea = np.full(N, -1)
    nxyz[ds['jnode']] = ds['jxyz']
    narea[ds['jnode'][ds['j']]] = TAREA[ds['proj_r']]
    zb = np.clip(((nxyz[:, 1] - 340.0) / BL).astype(int), 0, 11)
    return nxyz, narea, zb

def f_table(ds, Gs):
    """Binned mean similarity F over all pool pairs of the eligible groups, per measure and target area:
    [measure (sil, viv), area, lateral-separation bin (50 um, 21) x lower depth bin (50 um, 12) x upper depth bin]."""
    N = Gs['sil'].shape[0]; nxyz, narea, zb = _node_geom(ds, N)
    acc = np.zeros((2, 2, NBL * 144)); cnt = np.zeros((2, NBL * 144))
    y = ds['y']; rows = pd.Series(np.arange(len(y))).groupby(ds['g']).apply(np.array)
    for g_ in range(ds['G']):
        r = rows[g_]
        if (y[r] > 0).sum() < KMIN: continue
        nd = ds['jnode'][ds['j'][r]]; a = TAREA[ds['gproj'][g_]]
        q = nxyz[nd]; dl = np.sqrt((q[:, None, 0] - q[None, :, 0]) ** 2 + (q[:, None, 2] - q[None, :, 2]) ** 2)
        z = zb[nd]; lo = np.minimum(z[:, None], z[None, :]); hi = np.maximum(z[:, None], z[None, :])
        B = np.minimum((dl / BL).astype(int), NBL - 1) * 144 + lo * 12 + hi
        iu = np.triu_indices(len(nd), 1)
        for mi, m in enumerate(['sil', 'viv']):
            S = np.asarray(Gs[m][np.ix_(nd, nd)], dtype=np.float64)
            acc[mi, a] += np.bincount(B[iu], S[iu], NBL * 144)
        cnt[a] += np.bincount(B[iu], None, NBL * 144)
    return np.where(cnt[None] > 0, acc / np.maximum(cnt[None], 1), 0.0)

def stack_measures(ds, path, ftab=None):
    """Stack S (sil, viv) and their laminar parts F into one float32 array [4, nodes, nodes] on disk (memory-mapped).
    F_jk = mean S over all pool pairs of the eligible groups in the same target area with the same (unordered) pair of
    50-um absolute-depth bins and the same 50-um lateral-separation bin (the check's decomposition, per target area).
    ftab: a frozen table from f_table (a held-out run uses main's); otherwise it is computed from ds and saved."""
    if os.path.exists(path):
        return np.load(path, mmap_mode='r')
    Wt = ds.get('wdir', W)
    Gs = {m: np.load(os.path.join(Wt, f'G_{m}.npy'), mmap_mode='r') for m in ['sil', 'viv']}
    N = Gs['sil'].shape[0]
    if ftab is None:
        ftab = f_table(ds, Gs)
    np.save(path.replace('.npy', '') + '_ftab.npy', ftab)
    out = np.lib.format.open_memmap(path + '.tmp.npy', mode='w+', dtype=np.float32, shape=(4, N, N))
    out[0] = Gs['sil']; out[1] = Gs['viv']
    nxyz, narea, zb = _node_geom(ds, N)
    for mi in range(2):
        for a in range(2):
            F = ftab[mi, a]
            idx = np.nonzero(narea == a)[0]
            for s0 in range(0, len(idx), 500):
                ii = idx[s0:s0 + 500]
                q = nxyz[ii]; dl = np.sqrt((q[:, None, 0] - nxyz[None, idx, 0]) ** 2 + (q[:, None, 2] - nxyz[None, idx, 2]) ** 2)
                z1 = zb[ii][:, None]; z2 = zb[idx][None, :]
                B = np.minimum((dl / BL).astype(int), NBL - 1) * 144 + np.minimum(z1, z2) * 12 + np.maximum(z1, z2)
                out[2 + mi][np.ix_(ii, idx)] = F[B].astype(np.float32)
    out.flush(); del out
    os.replace(path + '.tmp.npy', path)
    return np.load(path, mmap_mode='r')

# ----------------------------------------------------------------------------------------------------------------------
# design
def design(ds, fam, logsoma=False, pos=False, depthpair=None, names_frozen=None):
    """Pair covariates x projection type. depthpair: None, 'pool' (only the group fixed effect absorbs) or 'twoway'
    (group and postsynaptic-cell fixed effects absorb). Returns X, names, ridge (per-column penalty on the raw scale).
    names_frozen: build exactly these columns (a held-out run with main's design); columns absent in ds are zeros."""
    if names_frozen is not None:
        return _design_frozen(ds, names_frozen)
    cols, names, ridge = [], [], []
    P = ds['proj_r']
    covs = list(FAMILY[fam]) + (['logsoma'] if logsoma else [])
    for c in covs:
        x = ds['cov'][c]
        for p in range(4):
            cols.append(x * (P == p)); names.append(f'{c}:{PROJ[p]}'); ridge.append(0.0)
    if pos:   # linear gradient in absolute postsynaptic soma position (um), per projection type (replaces dx,dy,dz,posty)
        for k, c in enumerate(['px', 'py', 'pz']):
            x = ds['jxyz'][ds['j'], k]; x = (x - x.mean()) / 100.0
            for p in range(4):
                cols.append(x * (P == p)); names.append(f'{c}:{PROJ[p]}'); ridge.append(0.0)
    if depthpair:
        lay = ds['glayer'][ds['g']]; b = ds['jbin'][ds['j']]
        for a in range(2):
            pl = [(p, l) for p in range(4) if TAREA[p] == a for l in range(3) if np.any((ds['gproj'] == p) & (ds['glayer'] == l))]
            nrow = {k: np.sum((P == k[0]) & (lay == k[1])) for k in pl}
            ref = max(pl, key=lambda k: nrow[k])
            for (p, l) in pl:
                if depthpair == 'twoway' and (p, l) == ref: continue   # absorbed by the postsynaptic fixed effects
                for bb in range(1, NBIN):                               # bin 0 absorbed by the group fixed effect
                    col = ((P == p) & (lay == l) & (b == bb)).astype(float)
                    if col.sum() == 0: continue
                    cols.append(col); names.append(f'dp:{PROJ[p]}:{LAYERS[l]}:b{bb}'); ridge.append(0.25)
    return np.column_stack(cols), names, np.array(ridge)

def _design_frozen(ds, names):
    P = ds['proj_r']; lay = ds['glayer'][ds['g']]; b = ds['jbin'][ds['j']]
    cols = []
    for nm in names:
        parts = nm.split(':')
        if parts[0] == 'dp':
            p = PROJ.index(parts[1]); l = LAYERS.index(parts[2]); bb = int(parts[3][1:])
            cols.append(((P == p) & (lay == l) & (b == bb)).astype(float))
        elif parts[0] in ('px', 'py', 'pz'):
            x = ds['jxyz'][ds['j'], 'xyz'.index(parts[0][1])]; x = (x - x.mean()) / 100.0
            cols.append(x * (P == PROJ.index(parts[1])))
        else:
            cols.append(ds['cov'][parts[0]] * (P == PROJ.index(parts[1])))
    return np.column_stack(cols), list(names), np.array([0.25 if n.startswith('dp:') else 0.0 for n in names])

# ----------------------------------------------------------------------------------------------------------------------
# fits
def _state(Xs, o, yy, ww, g_, G, b, la=None, jj=None):
    eta = Xs @ b + o
    if la is not None: eta = eta + la[jj]
    mg = np.full(G, -np.inf); np.maximum.at(mg, g_, eta); eta = eta - mg[g_]      # per-group shift (stability)
    ex = ww * np.exp(eta); Sg = np.bincount(g_, ex, G); Yg = np.bincount(g_, ww * yy, G)
    pi = ex / np.where(Sg > 0, Sg, 1)[g_]; mu = Yg[g_] * pi
    ll = np.sum(ww * yy * np.log(np.where(pi > 0, pi, 1)))
    return pi, mu, Yg, ll

def _solve(A, B):
    try:
        return np.linalg.solve(A, B)
    except np.linalg.LinAlgError:     # (near-)singular in a rare resample: minimum-norm least squares
        return np.linalg.lstsq(A, B, rcond=1e-12)[0]

def fit(X, sd, ridge, ds, w, kind='pool', b0=None, la0=None, tol=1e-8, maxit=100, gcodes=None, Gn=None, eps=0.1):
    """Maximum likelihood by Newton's method with step halving.
    kind 'pool': group fixed effects only (conditional multinomial within each axon x projection group).
    kind 'twoway': group and postsynaptic-cell fixed effects; joint Newton on (b, log alpha) with the group effects
    profiled, the log-alpha block inverted by Woodbury (H_aa = diag(E) + eps - Pi' diag(Y) Pi). log alpha has a weak
    ridge eps = 0.1 (a N(0, 10) prior, SD 3.2 on the log scale): it fixes the free shift per connected component and keeps
    the cell effects finite in resamples where some are not identified (with eps = 0.01 one resample ran away).
    gcodes/Gn override the group codes (N3: group x depth bin). Returns b on the standardized scale, eta = x b + log L
    (without fixed effects) for every row, and fit info."""
    import scipy.sparse as sp
    y = ds['y'].astype(float); off = np.log(ds['L'])
    gc = ds['g'] if gcodes is None else gcodes; G = ds['G'] if Gn is None else Gn
    keep = w > 0
    Yg_all = np.bincount(gc, w * y, G); keep &= Yg_all[gc] > 0
    if kind == 'twoway':
        O = np.bincount(ds['j'], w * y, ds['J']); keep &= O[ds['j']] > 0
    idx = np.nonzero(keep)[0]; n = len(idx)
    Xs = X[idx] / sd; o = off[idx]; yy = y[idx]; ww = w[idx]; g_ = gc[idx]
    # penalty 0.5 * ridge * b_raw^2 with b_raw = b / sd, plus a weak N(0, 1) prior on every standardized coefficient
    # (negligible against the data, Hessian eigenvalues >= 3; it only matters in a resample where a coefficient is not
    # identified, e.g. N3's group x depth-bin effects saturate one projection type, where it keeps b finite)
    rid = ridge / sd ** 2 + 1.0
    p = X.shape[1]
    Xsp = sp.csr_matrix(Xs)
    Pg = lambda v: sp.csr_matrix((v, (g_, np.arange(n))), shape=(G, n))
    b = np.zeros(p) if b0 is None else b0.copy()
    if kind == 'twoway':
        ju, jj = np.unique(ds['j'][idx], return_inverse=True); Jp = len(ju)
        Oj = np.bincount(jj, ww * yy, Jp)
        la = np.zeros(Jp) if la0 is None else la0[ju].copy()
        la[~np.isfinite(la)] = 0.0
        # log alpha gets a weak ridge eps (a N(0, 1/eps) prior): it fixes the shift that is free per connected component
        # of the (group, cell) graph and keeps the estimates finite where a cell's fixed effect is not identified
        # (boundary / separation in sparse tables). The swap null conditions on the cell totals, so it uses only b.
        fidx = np.arange(Jp); Jf = Jp; fpos = np.arange(Jp); rf = np.ones(n, bool)
        Aj = sp.csr_matrix((np.ones(n), (jj, np.arange(n))), shape=(Jp, n))
    else:
        la = None; jj = None
    pi, mu, Yg, ll = _state(Xs, o, yy, ww, g_, G, b, la, jj)
    obj = ll - 0.5 * np.sum(rid * b * b) - (0.5 * eps * np.sum(la ** 2) if la is not None else 0.0)
    for it in range(maxit):
        P = Pg(pi); Xbar = np.asarray((P @ Xsp).todense()) if p > 0 else None
        gb = Xs.T @ (ww * yy - mu) - rid * b
        XM = Xsp.multiply(mu[:, None]).tocsr()
        Hbb = np.asarray((Xsp.T @ XM).todense()) - (Xbar * Yg[:, None]).T @ Xbar + np.diag(rid)
        if kind == 'twoway':
            E = np.bincount(jj, mu, Jp); ga = Oj - E - eps * la
            Pi = sp.csr_matrix((pi[rf], (g_[rf], fpos[jj[rf]])), shape=(G, Jf))       # G x (free cells)
            Hab = np.asarray((Aj @ XM).todense()) - (Pi.T @ (Xbar * Yg[:, None]))   # J+ x p
            Dinv = 1.0 / (E + eps)
            live = Yg > 0
            PiL = Pi[live]; YL = Yg[live]
            K = np.diag(1.0 / YL) - np.asarray((PiL.multiply(Dinv[None, :]) @ PiL.T).todense())
            def Hinv(V):   # H_aa^{-1} V by Woodbury
                DV = Dinv[:, None] * V
                return DV + Dinv[:, None] * (PiL.T @ _solve(K, PiL @ DV))
            HiHab = Hinv(np.column_stack([Hab, ga]))
            Sch = Hbb - Hab.T @ HiHab[:, :p]
            db = _solve(Sch, gb - Hab.T @ HiHab[:, p])
            da = np.zeros(Jp); da[fidx] = HiHab[:, p] - HiHab[:, :p] @ db
        else:
            db = np.linalg.lstsq(Hbb, gb, rcond=1e-12)[0]; da = None
        t = 1.0
        for _ in range(30):
            b1 = b + t * db; la1 = la + t * da if la is not None else None
            pi1, mu1, Yg1, ll1 = _state(Xs, o, yy, ww, g_, G, b1, la1, jj)
            obj1 = ll1 - 0.5 * np.sum(rid * b1 * b1) - (0.5 * eps * np.sum(la1 ** 2) if la1 is not None else 0.0)
            if obj1 >= obj - 1e-10 * abs(obj): break
            t *= 0.5
        b, la, pi, mu, Yg, obj = b1, la1, pi1, mu1, Yg1, obj1
        mstep = max(np.max(np.abs(t * db)), np.max(np.abs(t * da)) if da is not None else 0.0)
        if mstep < tol: break
    eta_all = (X / sd) @ b + off
    info = {'iters': it + 1, 'loglik': float(ll1), 'maxstep': float(mstep), 'H': Hbb if kind == 'pool' else Sch}
    if kind == 'twoway':
        lafull = np.full(ds['J'], -np.inf); lafull[ju] = la; info['la'] = lafull
    return b, eta_all, info

# ----------------------------------------------------------------------------------------------------------------------
# numba kernels
@nb.njit(cache=True)
def _rho_nodes(nodes, n, G3, res):
    """rho for the synapses whose (sorted in place) node ids are nodes[:n]; writes one value per measure into res."""
    s = np.sort(nodes[:n])
    u = np.empty(n, np.int64); c = np.empty(n, np.float64); nu = 0
    for t in range(n):
        if nu > 0 and u[nu - 1] == s[t]:
            c[nu - 1] += 1.0
        else:
            u[nu] = s[t]; c[nu] = 1.0; nu += 1
    tot = 0.0; sq = 0.0
    for t in range(nu):
        tot += c[t]; sq += c[t] * c[t]
    den = tot * tot - sq
    for m in range(G3.shape[0]):
        if den <= 0:
            res[m] = np.nan; continue
        num = 0.0
        for a in range(nu):
            ua = u[a]; ca = c[a]
            for b in range(a + 1, nu):
                num += ca * c[b] * G3[m, ua, u[b]]
        res[m] = 2.0 * num / den

@nb.njit(cache=True)
def rho_obs(elig, gsyn_ptr, gsyn, syn_p, pc_node, G3):
    nm = G3.shape[0]; out = np.empty((len(elig), nm)); res = np.empty(nm)
    for e in range(len(elig)):
        g = elig[e]; a = gsyn_ptr[g]; n = gsyn_ptr[g + 1] - a
        nodes = np.empty(n, np.int64)
        for t in range(n): nodes[t] = pc_node[syn_p[gsyn[a + t]]]
        _rho_nodes(nodes, n, G3, res)
        for m in range(nm): out[e, m] = res[m]
    return out

@nb.njit(cache=True)
def null_pool(seed, ndraw, elig, gc_orig, gsyn_ptr, pool_ptr, pool_pc, pool_cw, pc_node, G3):
    """N0: independent multinomial draws within each eligible group's own pool (post copies weighted by L exp(x b))."""
    np.random.seed(seed)
    nm = G3.shape[0]; acc = np.zeros((len(elig), nm)); cnt = np.zeros((len(elig), nm)); res = np.empty(nm)
    for e in range(len(elig)):
        g = elig[e]; go = gc_orig[g]; n = gsyn_ptr[g + 1] - gsyn_ptr[g]
        lo = pool_ptr[go]; hi = pool_ptr[go + 1]; base = pool_cw[lo - 1] if lo > 0 else 0.0; Z = pool_cw[hi - 1] - base
        nodes = np.empty(n, np.int64)
        for d in range(ndraw):
            for t in range(n):
                u = base + np.random.random() * Z
                L_ = lo; H_ = hi - 1
                while L_ < H_:
                    mid = (L_ + H_) // 2
                    if pool_cw[mid] > u: H_ = mid
                    else: L_ = mid + 1
                nodes[t] = pc_node[pool_pc[L_]]
            _rho_nodes(nodes, n, G3, res)
            for m in range(nm):
                if not np.isnan(res[m]):
                    acc[e, m] += res[m]; cnt[e, m] += 1.0
    return acc / cnt

@nb.njit(cache=True)
def null_swap(seed, nburn, ndraw, thin, syn_g, syn_p0, gc_orig, pc_orig, pc_bin, nbin, O_pc, pool_binptr, pool_pc,
              pool_cum, logw, elig, gsyn_ptr, gsyn, pc_node, G3, keep_trace):
    """N1-N3: Metropolis chain on synapse-to-cell assignments that keeps every postsynaptic cell's total and every
    group's total (per depth bin when nbin > 1) fixed. Proposal: pick a synapse s1 = (g, j) uniformly, a cell k in
    pool(g) (same depth bin as j when nbin > 1) with probability O_k / Z, and a synapse s2 = (g2, k) uniformly among
    the O_k synapses on k; swap to (g, k), (g2, j). The proposal is symmetric on labelled assignments (Z is invariant
    because the cell totals are), so the acceptance is min(1, w_gk w_g2j / (w_gj w_g2k))."""
    np.random.seed(seed)
    nS = len(syn_g); nP = len(O_pc); nm = G3.shape[0]
    syn_p = syn_p0.copy()
    post_ptr = np.zeros(nP + 1, np.int64)
    for p in range(nP): post_ptr[p + 1] = post_ptr[p] + O_pc[p]
    fill = post_ptr[:-1].copy(); post_syn = np.empty(nS, np.int64); syn_pos = np.empty(nS, np.int64)
    for s in range(nS):
        p = syn_p[s]; post_syn[fill[p]] = s; syn_pos[s] = fill[p]; fill[p] += 1
    acc = np.zeros((len(elig), nm)); cnt = np.zeros((len(elig), nm))
    ntr = ndraw if keep_trace else 1
    trace = np.full((ntr, len(elig), nm), np.nan)
    res = np.empty(nm); nacc = 0; nprop = 0; nvalid = 0
    maxn = 0
    for e in range(len(elig)):
        if gsyn_ptr[elig[e] + 1] - gsyn_ptr[elig[e]] > maxn: maxn = gsyn_ptr[elig[e] + 1] - gsyn_ptr[elig[e]]
    nodes = np.empty(maxn, np.int64)
    for it in range(nburn + ndraw * thin):
        for _ in range(nS):
            nprop += 1
            s1 = np.random.randint(nS); g = syn_g[s1]; j = syn_p[s1]; go = gc_orig[g]
            b = pc_bin[j] if nbin > 1 else 0
            lo = pool_binptr[go * nbin + b]; hi = pool_binptr[go * nbin + b + 1]
            base = pool_cum[lo - 1] if lo > 0 else 0.0
            Z = pool_cum[hi - 1] - base
            u = base + np.random.random() * Z
            L_ = lo; H_ = hi - 1
            while L_ < H_:
                mid = (L_ + H_) // 2
                if pool_cum[mid] > u: H_ = mid
                else: L_ = mid + 1
            k = pool_pc[L_]
            if k == j: continue
            s2 = post_syn[post_ptr[k] + np.random.randint(O_pc[k])]
            g2 = syn_g[s2]
            if g2 == g: continue
            g2o = gc_orig[g2]; jo = pc_orig[j]; ko = pc_orig[k]
            l2 = logw[g2o, jo]
            if l2 == -np.inf: continue
            nvalid += 1
            dl = logw[go, ko] + l2 - logw[go, jo] - logw[g2o, ko]
            if dl < 0.0:
                if np.random.random() >= np.exp(dl): continue
            nacc += 1
            p1 = syn_pos[s1]; p2 = syn_pos[s2]
            post_syn[p1] = s2; post_syn[p2] = s1; syn_pos[s1] = p2; syn_pos[s2] = p1
            syn_p[s1] = k; syn_p[s2] = j
        if it >= nburn and (it - nburn) % thin == 0:
            dI = (it - nburn) // thin
            for e in range(len(elig)):
                g = elig[e]; a = gsyn_ptr[g]; n = gsyn_ptr[g + 1] - a
                for t in range(n): nodes[t] = pc_node[syn_p[gsyn[a + t]]]
                _rho_nodes(nodes, n, G3, res)
                for m in range(nm):
                    if not np.isnan(res[m]):
                        acc[e, m] += res[m]; cnt[e, m] += 1.0
                    if keep_trace: trace[dI, e, m] = res[m]
    return acc / cnt, trace, np.array([nprop, nvalid, nacc])

# ----------------------------------------------------------------------------------------------------------------------
# resampled ("copy space") structures
class Copies:
    """Expanded dataset for multiplicities vp (per presynaptic cell) and wp (per postsynaptic cell). With vp = wp = 1 it
    is the data itself. Copies of a cell are distinct units; the cohort statistic merges copies of one cell (their
    mutual pair is a diagonal term and is excluded)."""
    def __init__(self, ds, vp, wp, y=None, kmin=KMIN, pre_mode='copies', elig_orig=None):
        """pre_mode 'copies': a presynaptic cell drawn m times becomes m distinct axons (all of them enter the swap
        null's cell totals); 'weights': every axon stays in the table exactly once (the null's supply is the data's)
        and m only weights the axon in the refit and in the mean excess."""
        y = ds['y'] if y is None else y
        G, J = ds['G'], ds['J']
        gm = vp[ds['gpre']].astype(np.int64) if pre_mode == 'copies' else np.ones(G, np.int64)
        wp = wp.astype(np.int64)
        self.gc_orig = np.repeat(np.arange(G), gm); self.pc_orig = np.repeat(np.arange(J), wp)
        gstart = np.concatenate([[0], np.cumsum(gm)[:-1]]); pstart = np.concatenate([[0], np.cumsum(wp)[:-1]])
        r = np.nonzero((y > 0) & (gm[ds['g']] > 0) & (wp[ds['j']] > 0))[0]
        mg = gm[ds['g'][r]]; mp = wp[ds['j'][r]]; tot = mg * mp
        R = np.repeat(r, tot); k = np.arange(tot.sum()) - np.repeat(np.cumsum(tot) - tot, tot)
        mpR = np.repeat(mp, tot)
        gcop = gstart[ds['g'][R]] + k // mpR; pcop = pstart[ds['j'][R]] + k % mpR
        cnt = y[R]
        self.syn_g = np.repeat(gcop, cnt).astype(np.int64); self.syn_p = np.repeat(pcop, cnt).astype(np.int64)
        nG, nP = len(self.gc_orig), len(self.pc_orig)
        self.O_pc = np.bincount(self.syn_p, minlength=nP).astype(np.int64)
        o = np.argsort(self.syn_g, kind='stable'); self.gsyn = o.astype(np.int64)
        self.gsyn_ptr = np.concatenate([[0], np.cumsum(np.bincount(self.syn_g, minlength=nG))]).astype(np.int64)
        # partners (distinct post copies) per group copy -> eligibility
        pair = np.unique(self.syn_g * nP + self.syn_p); npart = np.bincount(pair // nP, minlength=nG)
        self.elig = np.nonzero(npart >= kmin)[0].astype(np.int64)
        self.gw = np.ones(nG) if pre_mode == 'copies' else vp[ds['gpre']][self.gc_orig].astype(float)
        re_ = self.elig[self.gw[self.elig] > 0]
        # eligibility: 're' re-applies the >= kmin partner rule to the resample (copies of a cell count as partners);
        # 'fx' keeps the groups eligible in the original sample (elig_orig, original group ids), which is what the
        # bootstrap uses: re-applying the threshold to copies shifts the bootstrap distribution (see bias_diag.py)
        if elig_orig is None:
            self.elig = re_; self.mask = {'re': np.ones(len(re_), bool), 'fx': np.ones(len(re_), bool)}
        else:
            nsyn_g = np.diff(self.gsyn_ptr)
            fx = np.nonzero(np.isin(self.gc_orig, elig_orig) & (self.gw > 0) & (nsyn_g >= 2) & (npart >= 2))[0]
            self.elig = np.union1d(re_, fx).astype(np.int64)
            self.mask = {'re': np.isin(self.elig, re_), 'fx': np.isin(self.elig, fx)}
        self.elig_proj = ds['gproj'][self.gc_orig[self.elig]]
        self.pc_node = ds['jnode'][self.pc_orig].astype(np.int64)
        self.pc_bin = ds['jbin'][self.pc_orig].astype(np.int64)
        self.ds = ds; self.wp = wp; self.gm = gm; self.pstart = pstart
        self._pools = {}

    def pool(self, degree, nbin):
        """CSR of each ORIGINAL group's pool in copy space (copies of a group share it), sorted by depth bin when
        nbin > 1. degree: keep only copies with at least one synapse (their total is conditioned on)."""
        key = (degree, nbin)
        if key in self._pools: return self._pools[key]
        ds = self.ds; wp = self.wp
        rr = np.nonzero(wp[ds['j']] > 0)[0]
        if degree:
            rr = rr[self.O_pc[self.pstart[ds['j'][rr]]] > 0]
        m = wp[ds['j'][rr]]; R = np.repeat(rr, m); k = np.arange(m.sum()) - np.repeat(np.cumsum(m) - m, m)
        pc = self.pstart[ds['j'][R]] + k; go = ds['g'][R]; bn = self.pc_bin[pc] if nbin > 1 else np.zeros(len(pc), np.int64)
        o = np.lexsort((pc, bn, go)); pc = pc[o]; go = go[o]; bn = bn[o]
        key2 = go * nbin + bn
        ptr = np.searchsorted(key2, np.arange(ds['G'] * nbin + 1)).astype(np.int64)
        res = (ptr, pc.astype(np.int64), go)
        self._pools[key] = res
        return res

def logw_dense(ds, eta):
    Lw = np.full((ds['G'], ds['J']), -np.inf)
    Lw[ds['g'], ds['j']] = eta
    return Lw

def excess_summary(cp, obs, nul, which='fx'):
    """Per-group excess and its means: pooled and per projection type, for every measure. obs, nul: [elig, measure].
    which: the eligibility rule ('fx' original eligible groups, 're' threshold re-applied to the resample)."""
    ex = obs - nul; wt = cp.gw[cp.elig] * cp.mask[which]
    out = {}
    wm = lambda v, s: float(np.sum(wt[s] * v[s]) / np.sum(wt[s])) if np.sum(wt[s]) > 0 else np.nan
    for mi, m in enumerate(MEAS[:obs.shape[1]]):
        v = ex[:, mi]; ok = np.isfinite(v)
        out[f'{m}:all'] = wm(v, ok)
        out[f'{m}:all:obs'] = wm(obs[:, mi], ok)
        out[f'{m}:all:null'] = wm(nul[:, mi], ok)
        for p in range(4):
            s = ok & (cp.elig_proj == p)
            out[f'{m}:{PROJ[p]}'] = wm(v, s)
    out['n_elig'] = int(np.sum(wt))
    for p in range(4): out[f'n:{PROJ[p]}'] = int(np.sum(wt[cp.elig_proj == p]))
    return out

# ----------------------------------------------------------------------------------------------------------------------
# configurations
CONFIGS = {
    'N0':  dict(kind='pool', logsoma=False, pos=False, depthpair=None, bins=False),
    'N0p': dict(kind='pool', logsoma=True, pos=True, depthpair=None, bins=False),
    'N1':  dict(kind='twoway', logsoma=False, pos=False, depthpair=None, bins=False),
    'N1s': dict(kind='twoway', logsoma=True, pos=False, depthpair=None, bins=False),
    'N2':  dict(kind='twoway', logsoma=True, pos=False, depthpair='twoway', bins=False),
    'N3':  dict(kind='twoway', logsoma=True, pos=False, depthpair=None, bins=True),
}

class Model:
    def __init__(self, ds, fam, cfg, names_frozen=None):
        self.fam = fam; self.cfg = CONFIGS[cfg]; self.name = cfg
        c = self.cfg
        self.X, self.names, self.ridge = design(ds, fam, c['logsoma'], c['pos'], c['depthpair'], names_frozen)
        self.sd = self.X.std(0); self.sd[self.sd == 0] = 1.0
        self.gcodes = (ds['g'] * NBIN + ds['jbin'][ds['j']]).astype(np.int64) if c['bins'] else None
        self.Gn = ds['G'] * NBIN if c['bins'] else None
        self.b_hat = None

    def fit(self, ds, w, b0=None, la0=None):
        b, eta, info = fit(self.X, self.sd, self.ridge, ds, w, self.cfg['kind'], b0=b0, la0=la0, gcodes=self.gcodes, Gn=self.Gn)
        return b, eta, info

def run_null(model, cp, eta, G3, seed, ndraw, nburn=30, thin=2, keep_trace=False):
    """Null mean of rho for every eligible group copy under the model with linear predictor eta."""
    ds = cp.ds
    if model.cfg['kind'] == 'pool':
        ptr, pc, go = cp.pool(False, 1)
        wv = np.exp(eta[_row_index(ds, go, cp.pc_orig[pc])] - eta.max())
        cw = np.cumsum(wv)
        # cumulative weights must restart per group for the binary search to be exact: keep a global cumsum but the
        # search is within [lo, hi) with base = cw[lo-1]
        nul = null_pool(seed, ndraw, cp.elig, cp.gc_orig, cp.gsyn_ptr, ptr, pc, cw, cp.pc_node, G3)
        return nul, None, None
    nbin = NBIN if model.cfg['bins'] else 1
    ptr, pc, go = cp.pool(True, nbin)
    cum = np.cumsum(cp.O_pc[pc].astype(np.float64))
    Lw = logw_dense(ds, eta)
    nul, trace, st = null_swap(seed, nburn, ndraw, thin, cp.syn_g, cp.syn_p, cp.gc_orig, cp.pc_orig, cp.pc_bin, nbin,
                               cp.O_pc, ptr, pc, cum, Lw, cp.elig, cp.gsyn_ptr, cp.gsyn, cp.pc_node, G3, keep_trace)
    return nul, trace, st

_ROWIDX = {}
def _row_index(ds, go, jo):
    """Row of the pair (original group, original post)."""
    key = id(ds)
    if key not in _ROWIDX:
        _ROWIDX[key] = pd.Series(np.arange(len(ds['g'])), index=ds['g'] * ds['J'] + ds['j'])
    return _ROWIDX[key].reindex(go * ds['J'] + jo).values
