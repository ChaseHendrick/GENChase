"""Cross-check the studio's exported PDE fields against the independent spectral reference in spectral.py.

    python3 tools/xref/run.py                 # cahn, swift, ks at grid 256
    python3 tools/xref/run.py --tabs ks --grid 512 --keep /tmp/xref

For each tab: export the initial field and the field after N steps through `node tools/run.js` (the
studio's own exportData path, headless), evolve the same initial field with the reference to the same
time, and compare. Needs NumPy, Node and Playwright (as for tools/run.js) and a built dist/studio.html.
Exits non-zero when a tab fails. What each number means is in tools/xref/README.md.
"""
import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import spectral  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# Per tab: the seed, the recipe keys the harness names, the steps compared and the reference step. Every
# physical parameter is named explicitly (at the tab's current default), so the reference and the studio run
# the same values even if a default later moves, and the export's recipe is checked for clamping. Additive
# noise is off: the reference is the deterministic equation. Each tab passes on two tests.
#
# lattice   Relative L2 between the studio and the reference run with the lattice symbol. Both then solve
#           the same spatially discrete system, so what is left is the studio's time error (forward Euler,
#           first order, against ETDRK4, fourth order) and float32 roundoff. The bound is computed, not
#           tuned: forward Euler multiplies a mode growing at rate lambda by (1 + lambda dt)^n instead of
#           exp(lambda T), a relative error of about lambda^2 dt T / 2, so the tolerance is twice that for
#           the fastest-growing linear mode, plus 1e-4 for float32. The reference's own step error, from a
#           half-step rerun, must be under a tenth of the bound.
# stat      The tab's pattern statistic, studio against the continuum (true spectral) reference. This is the
#           spatial discretization gap at unit cell spacing: the 5-point Laplacian's symbol is
#           |k|^2 (1 - |k|^2/12 + ...), about 3 per cent low at the pattern wavenumbers 0.55 to 0.7, which
#           moves the selected scale by about that much. The tolerance is 5 per cent (cahn, swift); for the
#           KS spectrum shape see the comment on that entry.
TABS = {
    'cahn': dict(seed='cahn-1958', steps=2000, h=0.02,
                 set=dict(c0=0, eps=1.1, M=1, deg=False, amp=0.12, noise=0, init='quench'), tol_stat=0.05),
    'swift': dict(seed='swift-1977', steps=2000, h=0.02,
                  set=dict(r=0.35, k0=0.62, g=0, cub=1, noise=0, init='noise'), tol_stat=0.05),
    # KS is chaotic: the pointwise comparison is at a short time (150 steps, T = 2.7), before trajectories
    # separate. The long run (2000 steps, T = 36) compares the shape of the energy spectrum, as the RMS of
    # log10 of the ratio of normalized spectra in bins 0.1 wide, over the linearly unstable band
    # k <= 1/sqrt(nu) where energy is injected. Tolerance 0.15, a factor of 1.4: one snapshot of a chaotic
    # field, whose lowest bins hold about 50 modes each (about 0.06 in log10 of scatter), plus the stencil's
    # in-band symbol error of at most 8 per cent. The dissipative tail above that band is reported, not
    # gated: there the 5-point stencil damps too weakly (its symbol at k = 2 is 2.83 against 4), which is
    # the fixed-cell-spacing limitation the validation record already states.
    'ks': dict(seed='siva-1977', steps=150, long=2000, h=0.02,
               set=dict(nu=1, alpha=1, noise=0, init='noise'), tol_stat=0.15),
}


def fastest_growth(tab, p):
    """Largest linear growth rate over all wavenumbers; both symbols reach the same maximum."""
    if tab == 'cahn':
        a = 1 - 3 * float(p['c0']) ** 2          # -f''(c0) for f = c^4/4 - c^2/2
        return float(p['M']) * max(a, 0) ** 2 / (4 * float(p['eps']) ** 2)
    if tab == 'swift':
        return float(p['r'])
    if tab == 'ks':
        return 1 / (4 * float(p['nu']))
    raise ValueError(tab)


def time_bound(tab, p, dt, T):
    """Twice the forward-Euler relative error lambda^2 dt T / 2 of the fastest mode, plus float32 room."""
    lam = fastest_growth(tab, p)
    return lam * lam * dt * T + 1e-4


def recipe_hash(tab, seed, overrides):
    body = json.dumps(overrides, separators=(',', ':')).encode()
    b64 = base64.urlsafe_b64encode(body).decode().rstrip('=')
    return '#' + tab + '/' + seed + '/' + b64


def export(tab, cfg, grid, warmup, out):
    # warmup with running:false stops the studio at exactly that step (the art-mode contract).
    over = dict(cfg['set'], grid=grid, aspect='1:1', bc='periodic', running=False, warmup=warmup)
    args = ['node', os.path.join(ROOT, 'tools', 'run.js'), recipe_hash(tab, cfg['seed'], over), '--out', out]
    args += ['--steps', str(warmup)] if warmup > 0 else ['--wait', '1500']
    proc = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError('tools/run.js failed for ' + tab + ':\n' + proc.stdout + proc.stderr)
    z = zipfile.ZipFile(out)
    meta = json.loads(z.read('meta.json'))
    with z.open('field.npy') as f:
        field = np.load(f).astype(np.float64)
    g = meta['grid']
    if g['steps'] != warmup or g['guard'] or g['boundary'] != 'periodic' or list(g['grid']) != [grid, grid]:
        raise RuntimeError(tab + ': export is not the requested state: ' + json.dumps(g))
    # The recipe records only keys that differ from the defaults; a named key it records must be unchanged.
    rec = meta['provenance']['recipe']
    moved = {k: rec[k] for k, v in over.items() if k in rec and rec[k] != v}
    if moved:
        raise RuntimeError(tab + ': the studio changed recipe keys the harness named: ' + json.dumps(moved))
    return field, meta


def rel_l2(a, b):
    return float(np.linalg.norm(a - b) / np.linalg.norm(b))


def length_scale(u):
    """Characteristic length 2 pi / k1, k1 the first moment of the shell-averaged structure factor."""
    k, S = spectral.radial_spectrum(u)
    return float(2 * np.pi * np.sum(S) / np.sum(k * S))


def dominant_k(u):
    """Power-weighted mean wavenumber over the spectral peak (shells with S >= 10% of the maximum)."""
    k, S = spectral.radial_spectrum(u)
    w = np.where(S >= 0.1 * S.max(), S, 0)
    return float(np.sum(k * w) / np.sum(w))


def spectrum_shape(a, b, kmin, kmax, width=0.1):
    """RMS of log10 of the ratio of two normalized energy spectra, in bins of `width`, over kmin < k <= kmax."""
    k, Sa = spectral.radial_spectrum(a)
    _, Sb = spectral.radial_spectrum(b)
    m = (k > kmin) & (k <= kmax)
    bins = np.floor((k[m] - kmin) / width).astype(int)
    A, B = np.bincount(bins, Sa[m]), np.bincount(bins, Sb[m])
    keep = (A > 0) & (B > 0)
    A, B = A[keep] / A[keep].sum(), B[keep] / B[keep].sum()
    return float(np.sqrt(np.mean(np.log10(A / B) ** 2)))


def reference(u0, tab, params, T, h):
    """Both symbols, each with a half-step run for the reference's own time error."""
    out = {}
    for sym in spectral.SYMBOLS:
        r = spectral.evolve(u0, tab, params, T, h, sym)
        r2 = spectral.evolve(u0, tab, params, T, h / 2, sym)
        out[sym] = (r2, rel_l2(r, r2))
    return out


def check(tab, cfg, grid, work):
    t0 = time.time()
    lines, ok = [], True
    u0, _ = export(tab, cfg, grid, 0, os.path.join(work, tab + '-0.npz'))
    us, meta = export(tab, cfg, grid, cfg['steps'], os.path.join(work, tab + '-%d.npz' % cfg['steps']))
    params = cfg['set']
    g = meta['grid']
    T = g['steps'] * g['dt']
    lines.append('%s  grid %d  dt %.5g  steps %d  T %.4g  %s  %s' % (
        tab, grid, g['dt'], g['steps'], T, g['precision'], meta['provenance']['compute'].get('renderer', '')[:60]))
    ref = reference(u0, tab, params, T, cfg['h'])
    lat, lat_self = ref['lattice']
    con, con_self = ref['continuum']
    d_lat, d_con = rel_l2(us, lat), rel_l2(us, con)
    tol = time_bound(tab, params, g['dt'], T)
    # The continuum reference only feeds the statistic, whose tolerance is 5 per cent or more.
    ok &= d_lat <= tol and lat_self <= tol / 10 and con_self <= 1e-3
    lines.append('  relL2 vs lattice ref %.3e (tol %.2e, time-order bound)   vs continuum ref %.3e (reported)' % (d_lat, tol, d_con))
    lines.append('  reference half-step self-error: lattice %.1e (tol %.1e)  continuum %.1e (tol 1e-3)' % (lat_self, tol / 10, con_self))
    if tab == 'cahn':
        Ls, Lc, Ll = length_scale(us), length_scale(con), length_scale(lat)
        dL = abs(Ls - Lc) / Lc
        ok &= dL <= cfg['tol_stat']
        lines.append('  mean <c>: studio %+.3e  continuum ref %+.3e' % (us.mean(), con.mean()))
        lines.append('  length 2pi/k1: studio %.3f  lattice ref %.3f  continuum ref %.3f  (studio vs continuum %.3f, tol %.2g)' % (
            Ls, Ll, Lc, dL, cfg['tol_stat']))
    elif tab == 'swift':
        ks_, kc, kl = dominant_k(us), dominant_k(con), dominant_k(lat)
        dk = abs(ks_ - kc) / kc
        ok &= dk <= cfg['tol_stat']
        lines.append('  dominant k: studio %.4f  lattice ref %.4f  continuum ref %.4f  (studio vs continuum %.3f, tol %.2g; k0 = %.2f)' % (
            ks_, kl, kc, dk, cfg['tol_stat'], float(params['k0'])))
    elif tab == 'ks':
        N2 = cfg['long']
        ul, meta2 = export(tab, cfg, grid, N2, os.path.join(work, tab + '-%d.npz' % N2))
        T2 = meta2['grid']['steps'] * meta2['grid']['dt']
        con2 = spectral.evolve(u0, tab, params, T2, cfg['h'], 'continuum')
        lat2 = spectral.evolve(u0, tab, params, T2, cfg['h'], 'lattice')
        kc = 1 / np.sqrt(float(params['nu']))
        band_c, band_l = spectrum_shape(ul, con2, 0, kc), spectrum_shape(ul, lat2, 0, kc)
        tail_c, tail_l = spectrum_shape(ul, con2, kc, 2 * kc), spectrum_shape(ul, lat2, kc, 2 * kc)
        ok &= band_c <= cfg['tol_stat']
        lines.append('  long run T %.4g: relL2 vs lattice ref %.3e  vs continuum ref %.3e (reported; chaotic, not gated)' % (
            T2, rel_l2(ul, lat2), rel_l2(ul, con2)))
        lines.append('  spectrum shape, rms log10 ratio, k <= %.2f: vs continuum ref %.3f (tol %.2g)  vs lattice ref %.3f' % (
            kc, band_c, cfg['tol_stat'], band_l))
        lines.append('  spectrum shape, dissipative tail %.2f < k <= %.2f (reported): vs continuum ref %.3f  vs lattice ref %.3f' % (
            kc, 2 * kc, tail_c, tail_l))
        lines.append('  mean <u> at T %.4g: studio %+.3f  lattice ref %+.3f  continuum ref %+.3f' % (
            T2, ul.mean(), lat2.mean(), con2.mean()))
    lines.append('  %s  %s  (%.0f s)' % ('PASS' if ok else 'FAIL', tab, time.time() - t0))
    return ok, lines


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--tabs', default=','.join(TABS), help='comma-separated subset of ' + ', '.join(TABS))
    ap.add_argument('--grid', type=int, default=256, help='square grid (default 256)')
    ap.add_argument('--keep', default=None, help='directory to keep the exported .npz files in')
    a = ap.parse_args()
    work = a.keep or tempfile.mkdtemp(prefix='genchase-xref-')
    os.makedirs(work, exist_ok=True)
    all_ok = True
    try:
        for tab in a.tabs.split(','):
            ok, lines = check(tab, TABS[tab], a.grid, work)
            all_ok &= ok
            print('\n'.join(lines), flush=True)
    finally:
        if not a.keep:
            shutil.rmtree(work, ignore_errors=True)
    print('xref: ' + ('PASS' if all_ok else 'FAIL'))
    return 0 if all_ok else 1


if __name__ == '__main__':
    sys.exit(main())
