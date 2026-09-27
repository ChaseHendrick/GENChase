# Writes paper/numbers.tex (one macro per number quoted in the text) and the table fragments paper/tab_*.tex
# from the outputs in ../out/.  Also writes out/numbers.json with the same values for checking.
import sys, os, json, glob, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from common import OUT, ROOT, NUS, ELLS

P = os.path.join(ROOT, 'paper')
mac = {}


def f3(x):
    return f'{x:.3f}'


def f2(x):
    return f'{x:.2f}'


def sci(x, dig=1):
    m, e = f'{x:.{dig}e}'.split('e')
    return f'${m}\\times10^{{{int(e)}}}$'


def sg(x, dig=3):
    return f'${x:+.{dig}f}$'


def put(name, val):
    mac[name] = val


# ---------------------------------------------------------------- geometry
G = json.load(open(f'{OUT}/geometry.json'))
sets8 = sorted(k for k in G if G[k]['d'] == 8); sets4 = sorted(k for k in G if G[k]['d'] == 4)
put('GeoFracMin', f'{min(g["frac_top_d"] for g in G.values()):.4f}')
put('GeoNextMax', sci(max(g['next_rel'] for g in G.values())))
for tag, ss in (('Eight', sets8), ('Four', sets4)):
    put(f'PR{tag}Min', f'{min(G[s]["pr"] for s in ss):.1f}'); put(f'PR{tag}Max', f'{max(G[s]["pr"] for s in ss):.1f}')
    put(f'NN{tag}Min', f2(min(G[s]['nn_med'] for s in ss))); put(f'NN{tag}Max', f2(max(G[s]['nn_med'] for s in ss)))
    put(f'SDNN{tag}Min', f2(min(G[s]['sd_over_nn'][-1] for s in ss))); put(f'SDNN{tag}Max', f2(max(G[s]['sd_over_nn'][-1] for s in ss)))
lines = []
for s in sets8 + sets4:
    g = G[s]; d = g['d']
    name = s.replace('_', ' ').replace('MP', 'MP')
    rel = ', '.join(f'{v:.3f}' for v in g['rel'][1:])
    lines.append(f'{s.split("_")[0]} & {s.split("_")[1]} {s.split("_")[2][:2]}-{s.split("_")[2][2:]} & {rel} & '
                 f'{g["pr"]:.1f} & {g["nn_med"]:.3f} & {g["sd_over_nn"][-1]:.2f} \\\\')
open(f'{P}/tab_geometry.tex', 'w').write('\n'.join(lines) + '\n\\bottomrule\n')

# ---------------------------------------------------------------- window exponents
W = json.load(open(f'{OUT}/matern_window.json'))
put('RelFloorMin', sci(min(r['r500'] for r in W)))
assert all(r['reliable'] for r in W)


def sel(d, nu, ell=None, key='w11_500'):
    return [r[key] for r in W if r['d'] == d and r['nu'] == nu and (ell is None or r['ell'] == ell)]


for tag, d in (('Eight', 8), ('Four', 4)):
    b = sel(d, 1.0)
    put(f'WinBorder{tag}Min', f3(min(b))); put(f'WinBorder{tag}Max', f3(max(b)))
    for ell, et in ((0.125, 'Eighth'), (0.25, 'Quarter'), (1.0, 'One'), (4.0, 'Four'), (8.0, 'Eight')):
        v = sel(d, 1.0, ell)
        put(f'WinBorder{tag}L{et}Min', f3(min(v))); put(f'WinBorder{tag}L{et}Max', f3(max(v)))
    for nu, nt in ((0.5, 'Rough'), (0.75, 'Mid'), (1.5, 'Smooth'), (2.5, 'Smoother')):
        v = sel(d, nu)
        put(f'Win{nt}{tag}Min', f3(min(v))); put(f'Win{nt}{tag}Max', f3(max(v)))
        for ell, et in ((0.125, 'Eighth'), (0.25, 'Quarter')):
            v = sel(d, nu, ell)
            put(f'Win{nt}{tag}L{et}Max', f3(max(v)))
    for ell, et in ((4.0, 'Four'), (8.0, 'Eight')):
        v = sel(d, 0.75, ell)
        put(f'WinMid{tag}L{et}Min', f3(min(v))); put(f'WinMid{tag}L{et}Max', f3(max(v)))
    rep = {8: 1.49, 4: 1.65}[d]
    setsd = sorted({r['set'] for r in W if r['d'] == d})
    reach = [s_ for s_ in setsd if max(r['w11_500'] for r in W if r['set'] == s_ and r['nu'] == 1.0) >= rep]
    WORDS = {0: 'none', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six'}
    put(f'Reach{tag}', WORDS[len(reach)])
    put(f'ReachAll{tag}', 'all' if len(reach) == len(setsd) else WORDS[len(reach)] + ' of the')
    put(f'ReachMid{tag}', str(sum(max(r['w11_500'] for r in W if r['set'] == s_ and r['nu'] == 0.75) >= rep for s_ in setsd)))
    # worded (third report, M4): in the Matern family, codes strictly below the border (nu = 0.75) stay below the
    # reported exponent in every set and at every length scale computed (infinitely many neurons)
    mid_max = max(r['w11_500'] for r in W if r['d'] == d and r['nu'] == 0.75)
    assert mid_max < rep, 'nu = 0.75 reaches the reported exponent'
    put(f'MidMax{tag}', f3(mid_max))
    # crossing: largest ell with the border code below the bound in every set, smallest ell above in every set
    sets = sorted({r['set'] for r in W if r['d'] == d})
    below = [e for e in ELLS if all(x < 1 + 2 / d for x in sel(d, 1.0, e))]
    above = [e for e in ELLS if all(x > 1 + 2 / d for x in sel(d, 1.0, e))]
    fr = lambda e: {0.125: '1/8', 0.25: '1/4', 0.5: '1/2'}.get(e, f'{e:g}')
    put(f'CrossBelow{tag}', fr(max(below))); put(f'CrossAbove{tag}', fr(min(above)))
# window table: min-max over sets per (d, nu, ell)
lines = []
for d in (8, 4):
    for nu in NUS:
        cells = []
        for e in ELLS:
            v = sel(d, nu, e)
            cells.append(f'{min(v):.2f}--{max(v):.2f}' if len(v) > 1 else f'{v[0]:.2f}')
        lines.append(f'{d} & {nu:g} & {("%.4f" % (1 + 2 * nu / d)).rstrip("0").rstrip(".")} & ' + ' & '.join(cells) + ' \\\\')
    if d == 8:
        lines.append('\\addlinespace')
open(f'{P}/tab_window.tex', 'w').write('\n'.join(lines) + '\n\\bottomrule\n')
# sub-windows for the border code at ell = 1 in the reference set MP032 0810
r = next(r for r in W if r['set'] == '8D_MP032_0810' and r['nu'] == 1.0 and r['ell'] == 1.0)
put('SubAOneOneHundred', f3(r['w11_100'])); put('SubAHundredFiveHundred', f3(r['w101_500']))

# ---------------------------------------------------------------- finite populations
F = json.load(open(f'{OUT}/matern_finiteN.json'))
res = F['res']
Rs = sorted({v['R'] for v in res.values()})
put('FinRFirst', str(max(Rs))); put('FinRAdded', str(min(Rs)))
sds = [v['sd'] for v in res.values()]
shifts = [v['mean'] - v['w_inf'] for v in res.values()]
put('FinSDMin', f'{min(sds):.4f}'); put('FinSDMax', f'{max(sds):.4f}')
bsh = [v['mean'] - v['w_inf'] for k, v in res.items() if k.split('|')[1] == '1.0']
put('FinBorderShiftMin', sg(min(bsh))); put('FinBorderShiftMax', sg(max(bsh)))
put('FinShiftMin', sg(min(shifts))); put('FinShiftMax', sg(max(shifts)))
put('FinShiftAbsMax', f3(max(abs(x) for x in shifts)))
put('FinCells', str(len(res)))
hi = [k for k, v in res.items() if v['mean'] > v['w_inf']]
put('FinHigherN', str(len(hi)))
assert {float(k.split('|')[1]) for k in hi} <= {1.5, 2.5}, 'only nu = 1.5 and 2.5 cells rise at finite N'


def fin(label, nu, ell):
    return res.get(f'{label}|{nu}|{ell}')


def pretty(label):
    t = label.split('_')
    return f'{t[1]} 2017-{t[2][:2]}-{t[2][2:]}'


FELLS = (0.25, 0.5, 1.0, 2.0, 4.0, 8.0)
for tag, d in (('Eight', 8), ('Four', 4)):
    sets_d = sorted({r['set'] for r in W if r['d'] == d}); bnd = 1 + 2 / d
    below = [e for e in FELLS if all(fin(s_, 1.0, e)['mean'] < bnd for s_ in sets_d)]
    above = [e for e in FELLS if all(fin(s_, 1.0, e)['mean'] > bnd for s_ in sets_d)]
    fr = lambda e: {0.125: '1/8', 0.25: '1/4', 0.5: '1/2'}.get(e, f'{e:g}')
    put(f'FinCrossBelow{tag}', fr(max(below))); put(f'FinCrossAbove{tag}', fr(min(above)))
    v1 = [fin(s_, 1.0, 1.0) for s_ in sets_d]
    put(f'FinOne{tag}Min', f'{min(v["mean"] for v in v1):.4f}'); put(f'FinOne{tag}Max', f'{max(v["mean"] for v in v1):.4f}')
    lst = [f'{pretty(s_)} ({fin(s_, 1.0, 1.0)["mean"]:.4f}; 2.5--97.5\\% over populations {fin(s_, 1.0, 1.0)["q025"]:.4f}--{fin(s_, 1.0, 1.0)["q975"]:.4f})'
           for s_ in sets_d if fin(s_, 1.0, 1.0)['mean'] < bnd + 0.005]
    put(f'FinOneNear{tag}', ' and '.join(lst) if lst else 'none')
    rep = {8: 1.49, 4: 1.65}[d]
    reach = [s_ for s_ in sets_d if max(fin(s_, 1.0, e)['mean'] for e in FELLS) >= rep]
    WORDS = {0: 'none', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six'}
    put(f'FinReach{tag}', WORDS[len(reach)]); put(f'FinReachAll{tag}', 'all' if len(reach) == len(sets_d) else WORDS[len(reach)] + ' of the')
    marg = sorted((max(fin(s_, 1.0, e)['mean'] for e in FELLS) - rep, s_) for s_ in reach)
    mc = max((fin(marg[0][1], 1.0, e) for e in FELLS), key=lambda v: v['mean'])
    put(f'FinReachMargin{tag}', f'{marg[0][0]:.4f}'); put(f'FinReachMarginSet{tag}', pretty(marg[0][1]))
    put(f'FinReachMarginR{tag}', str(mc['R'])); put(f'FinReachMarginSD{tag}', f'{mc["sd"]:.4f}')
    v4 = [fin(s_, 0.75, 4.0)['mean'] for s_ in sets_d]
    put(f'FinMid{tag}LFourMin', f3(min(v4))); put(f'FinMid{tag}LFourMax', f3(max(v4)))
    put(f'FinMidAbove{tag}', WORDS[sum(x > bnd for x in v4)])
    nset = {8: 'six', 4: 'four'}[d]; k_ = sum(x > bnd for x in v4)
    put(f'FinMidAbovePhrase{tag}', f'all {nset} {d}D sets' if k_ == len(sets_d) else f'{WORDS[k_]} of the {nset} {d}D sets')

# ---------------------------------------------------------------- sensitivity: sub-window, metric, stimulus count
EXW, EXS = {}, {}
for label in sorted(G):                     # the stimulus sets, from geometry.json (the image files are not needed here)
    EXW[label] = json.load(open(f'{OUT}/extra_parts/{label}_white.json'))
    EXS[label] = json.load(open(f'{OUT}/extra_parts/{label}_sub.json'))


def row(label, nu, ell):
    return next(r for r in W if r['set'] == label and r['nu'] == nu and r['ell'] == ell)


mid_above = [r for r in W if r['nu'] == 0.75 and r['w11_500'] > r['bound']]
put('SubMidAboveCount', str(len(mid_above)))
curv8 = [r['w11_100'] - r['w101_500'] for r in W if r['d'] == 8 and r['ell'] >= 1]
curv = [r['w11_100'] - r['w101_500'] for r in W]
put('CurvMedEight', f2(float(np.median(curv8)))); put('CurvMin', sg(min(curv), 2)); put('CurvMax', sg(max(curv), 2))
for tag, d in (('Eight', 8), ('Four', 4)):
    sets_d = sorted({r['set'] for r in W if r['d'] == d}); bnd = 1 + 2 / d
    v = [row(s_, 0.75, 4.0)['w101_500'] for s_ in sets_d]
    put(f'SubMid{tag}LFourMin', f3(min(v))); put(f'SubMid{tag}LFourMax', f3(max(v)))
    v = [EXW[s_]['0.75|4.0']['w11_500'] for s_ in sets_d]
    put(f'WhiteMid{tag}LFourMin', f3(min(v))); put(f'WhiteMid{tag}LFourMax', f3(max(v)))
    put(f'WhiteMidAbove{tag}', str(sum(x > bnd for x in v)))
    WORDS = {0: 'none', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six'}
    put(f'WhiteMidAbove{tag}Word', WORDS[sum(x > bnd for x in v)])
    v = [EXW[s_]['1.0|8.0']['w11_500'] for s_ in sets_d]
    put(f'WhiteBorder{tag}LEightMin', f3(min(v))); put(f'WhiteBorder{tag}LEightMax', f3(max(v)))
    v = [EXW[s_]['1.0|1.0']['w11_500'] for s_ in sets_d]
    put(f'WhiteBorder{tag}LOneMin', f3(min(v))); put(f'WhiteBorder{tag}LOneMax', f3(max(v)))
    for Pn, Pw in (('1000', 'OneThousand'), ('1400', 'OneThousandFourHundred'), ('2000', 'TwoThousand')):
        v = [float(np.mean(EXS[s_]['0.75|4.0'][Pn])) for s_ in sets_d]
        put(f'SubP{Pw}Mid{tag}LFourMin', f3(min(v))); put(f'SubP{Pw}Mid{tag}LFourMax', f3(max(v)))
        put(f'SubP{Pw}MidAbove{tag}', WORDS[sum(x > bnd for x in v)])
    dP = [row(s_, 1.0, 4.0)['w11_500'] - float(np.mean(EXS[s_]['1.0|4.0']['1400'])) for s_ in sets_d]
    put(f'SubDeltaBorder{tag}Min', f3(min(dP))); put(f'SubDeltaBorder{tag}Max', f3(max(dP)))
    de = [2 * 1.0 / (row(s_, 1.0, 8.0)['w11_500'] - 1) for s_ in sets_d]
    put(f'Deff{tag}Min', f'{min(de):.1f}'); put(f'Deff{tag}Max', f'{max(de):.1f}')
    de75 = [2 * 0.75 / (row(s_, 0.75, 8.0)['w11_500'] - 1) for s_ in sets_d]
    put(f'DeffMid{tag}Min', f'{min(de75):.1f}'); put(f'DeffMid{tag}Max', f'{max(de75):.1f}')
# whitened border codes: largest value over every computed length scale (M1 of the second report)
for tag, d in (('Eight', 8), ('Four', 4)):
    sets_d = sorted({r['set'] for r in W if r['d'] == d})
    vb = [(EXW[s_][f'1.0|{e}']['w11_500'], e) for s_ in sets_d for e in ELLS]
    put(f'WhiteBorder{tag}MaxAll', f3(max(vb)[0])); put(f'WhiteBorder{tag}MaxAllEll', f'{max(vb)[1]:g}')
assert max(EXW[s_][f'1.0|{e}']['w11_500'] for s_ in sets8 for e in ELLS) < 1.49, 'whitened 8D border codes never reach 1.49'
assert min(EXW[s_]['1.0|8.0']['w11_500'] for s_ in sets4) > 1.65, 'whitened 4D border codes reach 1.65 at ell = 8'
assert max(ELLS) == 8.0
# P = 2,000, nu = 0.75, ell = 4: the smallest margin above the bound among the 8D sets counted above it
m20 = sorted((float(np.mean(EXS[s_]['0.75|4.0']['2000'])) - 1.25, s_) for s_ in sets8 if float(np.mean(EXS[s_]['0.75|4.0']['2000'])) > 1.25)
put('SubPTwoThousandMarginMin', f'{m20[0][0]:.4f}'); put('SubPTwoThousandMarginSet', pretty(m20[0][1]))
put('SubPTwoThousandMarginSubMin', f'{min(EXS[m20[0][1]]["0.75|4.0"]["2000"]):.4f}')
put('SubPTwoThousandMarginSD', f'{float(np.std(EXS[m20[0][1]]["0.75|4.0"]["2000"], ddof=1)):.4f}')
# curvature of the border codes that reach 1.49 at N = infinity (d = 8)
cb = [row(s_, 1.0, e)['w11_100'] - row(s_, 1.0, e)['w101_500'] for s_ in sets8 for e in ELLS if row(s_, 1.0, e)['w11_500'] >= 1.49]
put('CurvBorderReachMin', f2(min(cb))); put('CurvBorderReachMax', f2(max(cb))); put('CurvBorderReachN', str(len(cb)))
# nearest-neighbour dimension of the stimuli (nn_dim.py)
NND = json.load(open(f'{OUT}/nn_dim.json'))
for tag, d in (('Eight', 8), ('Four', 4)):
    sets_d = sorted(k for k in NND if NND[k]['d'] == d)
    for kind, kt in (('plain', ''), ('white', 'White'), ('gauss', 'Gauss'), ('gauss_iso', 'GaussIso')):
        v = [NND[s_][kind]['d_nn_all'] for s_ in sets_d]
        put(f'Dnn{kt}{tag}Min', f'{min(v):.1f}'); put(f'Dnn{kt}{tag}Max', f'{max(v):.1f}')
    assert all(NND[s_]['plain']['d_nn_all'] < NND[s_]['gauss']['d_nn_all'] for s_ in sets_d), 'stimuli below their Gaussian control'
    assert max(NND[s_]['plain']['d_nn_all'] for s_ in sets_d) < d
subsd = [float(np.std(v, ddof=1)) for s_ in EXS for key in EXS[s_] for v in EXS[s_][key].values()]
put('SubSDMax', f3(max(subsd)))
# ordinal pattern: at every (nu, ell) the smallest 4D value exceeds the largest 8D value
ordinal = all(min(sel(4, nu, e)) > max(sel(8, nu, e)) for nu in NUS for e in ELLS)
put('OrdinalCells', str(sum(min(sel(4, nu, e)) > max(sel(8, nu, e)) for nu in NUS for e in ELLS)))
put('OrdinalTotal', str(len(NUS) * len(ELLS)))
# sensitivity table
lines = []


def cell(vals, bnd):
    vals = [x for x in vals if x is not None]
    if not vals:
        return '--'
    return f'{min(vals):.2f}--{max(vals):.2f} ({sum(x > bnd for x in vals)})'


for d in (8, 4):
    sets_d = sorted({r['set'] for r in W if r['d'] == d}); bnd = 1 + 2 / d
    for nu, ell in ((1.0, 1.0), (1.0, 4.0), (1.0, 8.0), (0.75, 4.0), (0.75, 8.0)):
        c_inf = [row(s_, nu, ell)['w11_500'] for s_ in sets_d]
        c_fin = [fin(s_, nu, ell)['mean'] if fin(s_, nu, ell) else None for s_ in sets_d]
        c_101 = [row(s_, nu, ell)['w101_500'] for s_ in sets_d]
        c_wh = [EXW[s_][f'{nu}|{ell}']['w11_500'] for s_ in sets_d]
        c_p14 = [float(np.mean(EXS[s_][f'{nu}|{ell}']['1400'])) for s_ in sets_d]
        c_p20 = [float(np.mean(EXS[s_][f'{nu}|{ell}']['2000'])) for s_ in sets_d]
        lines.append(f'{d} & {nu:g} & {ell:g} & ' + ' & '.join(cell(c, bnd) for c in (c_inf, c_fin, c_101, c_wh, c_p14, c_p20)) + ' \\\\')
    if d == 8:
        lines.append('\\addlinespace')
open(f'{P}/tab_sens.tex', 'w').write('\n'.join(lines) + '\n\\bottomrule\n')

# ---------------------------------------------------------------- d = 1
C = json.load(open(f'{OUT}/circle_d1.json'))
put('GratR', f'{C["R"]:,}'.replace(',', '{,}'))
rows = C['rows']
b = [r for r in rows if r['nu'] == 1.0]
put('GratBorderMin', f3(min(r['w_sampled'] for r in b))); put('GratBorderMax', f3(max(r['w_sampled'] for r in b)))
put('GratShortMin', f3(min(r['alpha_inf'] - r['w_sampled'] for r in rows)))
put('GratShortMax', f3(max(r['alpha_inf'] - r['w_sampled'] for r in rows)))
put('GratAliasMin', f3(min(-r['aliasing'] for r in rows))); put('GratAliasMax', f3(max(-r['aliasing'] for r in rows)))
put('GratPreMin', f3(min(-r['finite_bw'] for r in rows))); put('GratPreMax', f3(max(-r['finite_bw'] for r in rows)))
put('GratFinSDMax', f3(max(r['finiteN_sd'] for r in rows)))
put('GratFinShiftMax', f3(max(abs(r['finiteN_mean'] - r['w_sampled']) for r in rows)))
sm = [r for r in rows if r['nu'] == 1.5 and r['w_sampled'] > 3]
put('GratSmoothAboveKappaMax', f'{max(r["kappa"] for r in sm):g}')
assert all(r['w_sampled'] < 3 for r in rows if r['nu'] == 1.5 and r['kappa'] > max(x['kappa'] for x in sm))
s15 = [r for r in rows if r['nu'] == 1.5]
put('GratNuOnePointFiveMin', f3(min(r['w_sampled'] for r in s15))); put('GratNuOnePointFiveMax', f3(max(r['w_sampled'] for r in s15)))
# staircase effect of the twofold degeneracy, pure power law k^-3
from common import window_slope
k = np.arange(1, 200.)
put('StairThree', f3(window_slope(np.repeat(k ** -3.0, 2), 5, 30)))
for (nu_h, kap), t in (((1.0, 2.0), 'Two'), ((1.0, 8.0), 'Eight'), ((1.5, 1.0), 'Smooth')):
    tg = f'nu{nu_h}_kappa{kap}'
    A = C['prop1'][f'{tg}_a2.0']; B = C['prop1'][f'{tg}_a5.0']; S_ = C['prop1'][f'{tg}_summary']
    put(f'PropW{t}A', f'{A["w"]:.4f}'); put(f'PropW{t}B', f'{B["w"]:.4f}')
    put(f'PropTail{t}A', sci(A['tail_mass'])); put(f'PropTail{t}B', sci(B['tail_mass']))
    put(f'PropRel{t}', sci(S_['max_dmu_over_mu30']))
fam = next(r for r in rows if r['nu'] == 1.5 and r['kappa'] == 1.0)
put('PropSmoothFamily', f'{fam["w_sampled"]:.4f}')
# third report M2: the same numbers over ranks 11-30, the grating window of Stringer's deposited code at 58443d1
# (mainfigs/fig3.m:91; powerlaws/statsShuffledPCA.m:59).  Macro names end in Eleven.
put('GratBorderMinEleven', f3(min(r['w_sampled_11_30'] for r in b))); put('GratBorderMaxEleven', f3(max(r['w_sampled_11_30'] for r in b)))
put('GratShortMinEleven', f3(min(r['alpha_inf'] - r['w_sampled_11_30'] for r in rows)))
put('GratShortMaxEleven', f3(max(r['alpha_inf'] - r['w_sampled_11_30'] for r in rows)))
put('GratAliasMinEleven', f3(min(-r['aliasing_11_30'] for r in rows))); put('GratAliasMaxEleven', f3(max(-r['aliasing_11_30'] for r in rows)))
put('GratPreMinEleven', f3(min(-r['finite_bw_11_30'] for r in rows))); put('GratPreMaxEleven', f3(max(-r['finite_bw_11_30'] for r in rows)))
put('GratFinSDMaxEleven', f3(max(r['finiteN_sd_11_30'] for r in rows)))
put('GratFinShiftMaxEleven', f3(max(abs(r['finiteN_mean_11_30'] - r['w_sampled_11_30']) for r in rows)))
sm11 = [r for r in rows if r['nu'] == 1.5 and r['w_sampled_11_30'] > 3]
assert max(r['kappa'] for r in sm11) == max(r['kappa'] for r in sm), 'nu = 1.5 exceeds 3 for the same bandwidths in both windows'
assert all(r['w_sampled_11_30'] < 3 for r in rows if r['nu'] == 1.5 and r['kappa'] > max(x['kappa'] for x in sm11))
put('GratNuOnePointFiveMinEleven', f3(min(r['w_sampled_11_30'] for r in s15)))
put('GratNuOnePointFiveMaxEleven', f3(max(r['w_sampled_11_30'] for r in s15)))
put('StairThreeEleven', f3(window_slope(np.repeat(k ** -3.0, 2), 11, 30)))
for (nu_h, kap), t in (((1.0, 2.0), 'Two'), ((1.0, 8.0), 'Eight'), ((1.5, 1.0), 'Smooth')):
    tg = f'nu{nu_h}_kappa{kap}'
    A = C['prop1'][f'{tg}_a2.0']; B = C['prop1'][f'{tg}_a5.0']
    put(f'PropW{t}AEleven', f'{A["w_11_30"]:.4f}'); put(f'PropW{t}BEleven', f'{B["w_11_30"]:.4f}')
# both windows: the two codes of the example have equal window exponents (to the printed precision), above 3
for key in ('w', 'w_11_30'):
    wa, wb = C['prop1'][f'nu1.5_kappa1.0_a2.0'][key], C['prop1'][f'nu1.5_kappa1.0_a5.0'][key]
    assert f'{wa:.4f}' == f'{wb:.4f}' and wa > 3, ('Prop. 1 example', key)
    assert f'{wa:.4f}' == f'{next(r for r in rows if r["nu"] == 1.5 and r["kappa"] == 1.0)["w_sampled" + key[1:]]:.4f}', 'the value of the family code'
for key in ('w_sampled', 'w_sampled_11_30'):
    assert all(r[key] < 3 for r in rows if r['nu'] <= 1.0), ('no code with nu <= 1 exceeds 3', key)
    assert all(r[key] < r['alpha_inf'] for r in rows), ('every code below its asymptote', key)
for key in ('aliasing', 'aliasing_11_30', 'finite_bw', 'finite_bw_11_30'):
    assert all(r[key] < 0 for r in rows), ('the pre-asymptotic and aliasing parts both lower the exponent', key)
# grating table
lines = []
for nu in (0.5, 1.0, 1.5, 2.0):
    rr = [r for r in rows if r['nu'] == nu]
    lines.append(f'{nu:g} & {1 + 2 * nu:g} & ' + ' & '.join(f'{r["w_sampled"]:.2f} ({r["w_operator"]:.2f})' for r in rr) + ' \\\\')
open(f'{OUT}/tab_grating.tex', 'w').write('\n'.join(lines) + '\n')   # not in the note; kept for reference

# ---------------------------------------------------------------- MEME
M = json.load(open(f'{OUT}/meme.json'))
put('MemeR', '20'); put('MemeNB', str(M['n_base'])); put('MemeNW', str(M['n_weights']))
EXD, EXF = M['exact']['diag'], M['exact']['full']
SD_, SF_ = M['sim']['diag'], M['sim']['full']
TAILS = ('tail500_0.8', 'tail500_1.0', 'tail500_2.0', 'tail500_3.0', 'rank2800')
for a2, t in ((1.25, 'A'), (1.5, 'B')):
    tv = [EXD[f'{a2}|{k}'] for k in TAILS]
    put(f'MemeTailMin{t}', f3(min(v['alpha2'] for v in tv))); put(f'MemeTailMax{t}', f3(max(v['alpha2'] for v in tv)))
    put(f'MemeTailZMax{t}', f2(max(max(abs(z) for z in v['z_ge2']) for v in tv)))
    put(f'MemeTailZOneMax{t}', f2(max(abs(v['z'][0]) for v in tv)))
    tf = [EXF[f'{a2}|{k}'] for k in TAILS]
    put(f'MemeFullTailMin{t}', f3(min(v['alpha2'] for v in tf))); put(f'MemeFullTailMax{t}', f3(max(v['alpha2'] for v in tf)))
    for nm, tt in (('floor15', 'Floor'), ('cutoff1000', 'Cut'), ('floor5', 'FloorFive')):
        put(f'Meme{tt}{t}', f3(EXD[f'{a2}|{nm}']['alpha2'])); put(f'Meme{tt}Win{t}', f3(EXD[f'{a2}|{nm}']['window']))
tv = [EXD[f'1.25|{k}'] for k in TAILS] + [EXD[f'1.5|{k}'] for k in TAILS]
put('MemeTraceMin', f2(min(v['trace_ratio'] for v in tv[:5]))); put('MemeTraceMax', f2(max(v['trace_ratio'] for v in tv[:5])))
put('MemeExactTailMisfitMax', f3(max(v['cost'] for v in tv)))
tf = [EXF[f'1.25|{k}'] for k in TAILS] + [EXF[f'1.5|{k}'] for k in TAILS]
put('MemeFullExactMisfitMin', f2(min(v['cost'] for v in tf))); put('MemeFullExactMisfitMax', f2(max(v['cost'] for v in tf)))
put('MemeSDTrace', f3(M['sd_logmom'][0]))
put('MemeFullCond', sci(M['full_condition']))
for how, t in (('diag', 'Diag'), ('full', 'Full')):
    put(f'MemeNullMed{t}', f3(M['null'][how]['median']) if M['null'][how]['median'] < 1 else f2(M['null'][how]['median']))
    put(f'MemeNullQ{t}', f3(M['null'][how]['q95']) if M['null'][how]['q95'] < 1 else f2(M['null'][how]['q95']))
lines = []
order = ['base', 'tail500_0.8', 'tail500_1.0', 'tail500_2.0', 'tail500_3.0', 'rank2800', 'floor5', 'floor15', 'cutoff1000']
lab = {'base': 'none', 'tail500_0.8': 'exponent 0.8 after 500',
       'tail500_1.0': 'exponent 1.0 after 500', 'tail500_2.0': 'exponent 2.0 after 500',
       'tail500_3.0': 'exponent 3.0 after 500', 'rank2800': 'zero after 2,800',
       'floor5': 'floor 5\\%', 'floor15': 'floor 15\\%',
       'cutoff1000': 'factor $e^{-n/1000}$'}
for nm in order:
    e1, e2, ef = EXD[f'1.25|{nm}'], EXD[f'1.5|{nm}'], EXF[f'1.25|{nm}']
    if nm in SD_:
        s_ = SD_[nm]
        simcol = f'{s_["mean"]:.3f} $\\pm$ {s_["se"]:.3f} & '
        simcol += (f'{sg(s_["diff_mean"])} [{sg(s_["diff_ci"][0])}, {sg(s_["diff_ci"][1])}]' if nm != 'base' else '')
    else:
        simcol = ' & '
    lines.append(f'{lab[nm]} & {e1["window"]:.3f} & {e1["trace_ratio"]:.3f} & {e1["alpha2"]:.3f} & {ef["alpha2"]:.3f} & {simcol} & {e2["alpha2"]:.3f} \\\\')
    if nm == 'rank2800':
        lines.append('\\addlinespace')
open(f'{P}/tab_meme.tex', 'w').write('\n'.join(lines) + '\n\\bottomrule\n')
S = SD_
tails = [k for k in S if k != 'base']
put('MemeSimBase', f3(S['base']['mean'])); put('MemeSimBaseSE', f3(S['base']['se'])); put('MemeSimBaseSD', f3(S['base']['sd']))
put('MemeSimDiffMin', sg(min(S[k]["diff_mean"] for k in tails))); put('MemeSimDiffMax', sg(max(S[k]["diff_mean"] for k in tails)))
put('MemeSimMisfitMedMax', f3(max(S[k]['cost_median'] for k in S)))
put('MemeCorrMin', f2(min(S[k]['corr_with_base'] for k in tails))); put('MemeCorrMax', f2(max(S[k]['corr_with_base'] for k in tails)))
put('MemePairedSDMin', f3(min(S[k]['diff_sd'] for k in tails))); put('MemePairedSDMax', f3(max(S[k]['diff_sd'] for k in tails)))
put('MemeSimSDMin', f3(min(S[k]['sd'] for k in S))); put('MemeSimSDMax', f3(max(S[k]['sd'] for k in S)))
put('MemeFlagDiagMax', f2(max(S[k]['frac_flag'] for k in S)))
# second report N3: every variant data set is unflagged with diagonal weights; the base has one flagged data set
assert all(S[k]['frac_flag'] == 0 for k in tails), 'no variant data set flagged (diagonal)'
put('MemeFlagDiagBaseN', str(int(round(S['base']['frac_flag'] * 20))))
put('MemeDiagVarMedMin', f3(min(S[k]['cost_median'] for k in tails))); put('MemeDiagVarMedMax', f3(max(S[k]['cost_median'] for k in tails)))
put('MemeDiagBaseMed', f3(S['base']['cost_median']))
assert max(S[k]['cost_median'] for k in tails) < S['base']['cost_median'], 'variant median misfits below the base (diagonal)'
# second report M2: full-whitening null by fold (the folds of meme_analyze.py: array_split of the base data sets
# into five), and the flag rates of the variants against other reference distributions
from scipy import stats as _st
nf = np.array(M['null']['full']['misfit']); folds = np.array_split(np.arange(len(nf)), 5)
fmed = [float(np.median(nf[f])) for f in folds]
put('MemeFullFoldMeds', ', '.join(f'{x:.2f}' for x in fmed))
put('MemeFullNullMax', f'{nf.max():.0f}')
put('MemeFullNullExceedLast', str(int(np.sum(nf[folds[-1]] > M['null']['full']['q95']))))
put('MemeFullNullExceedAll', str(int(np.sum(nf > M['null']['full']['q95']))))
put('ChiFourMed', f2(_st.chi2.median(4))); put('ChiFourQ', f2(_st.chi2.ppf(0.95, 4)))
q03 = float(np.percentile(nf[np.concatenate(folds[:4])], 95)); q0 = float(np.percentile(nf[folds[0]], 95))
put('MemeFullQFirstFour', f2(q03)); put('MemeFullQFirst', f2(q0))
fl03 = [float(np.mean(np.array(SF_[k]['cost']) > q03)) for k in tails]
fl0 = [float(np.mean(np.array(SF_[k]['cost']) > q0)) for k in tails]
put('MemeFlagFFMin', f2(min(fl03))); put('MemeFlagFFMax', f2(max(fl03)))
put('MemeFlagFOMin', f2(min(fl0))); put('MemeFlagFOMax', f2(max(fl0)))
assert all(SF_[k]['frac_flag'] == 0 for k in tails), 'no variant flagged against the pooled full-whitening null'
allflags = [SF_[k]['frac_flag'] for k in tails] + fl03 + fl0 + list(M['loo19']['frac_flag'].values())
put('MemeFlagAnyMax', f2(max(allflags)))
assert min(allflags) == 0
put('MemeFlagFullBase', f2(SF_['base']['frac_flag']))
# third report M3: flag counts out of 20 under every reference distribution, with exact (Clopper-Pearson) 95%
# intervals for the flag probability; Table tab:flag (tab_flag.tex) and the worded statements of the text
NSIM = 20
assert all(len(SD_[k_]['cost']) == NSIM and len(SF_[k_]['cost']) == NSIM for k_ in SD_)


def cp(kk, n=NSIM, conf=0.95):
    a_ = (1 - conf) / 2
    lo_ = 0.0 if kk == 0 else float(_st.beta.ppf(a_, kk, n - kk + 1))
    hi_ = 1.0 if kk == n else float(_st.beta.ppf(1 - a_, kk + 1, n - kk))
    return lo_, hi_


assert abs(cp(0)[1] - (1 - 0.025 ** (1 / NSIM))) < 1e-12, 'Clopper-Pearson upper bound for 0 of n'
REFS = (('diag', 'diagonal weights, pooled'), ('full', 'full whitening, pooled'), ('ff', 'first four folds'),
        ('fo', 'first fold'), ('loo', 'leave one out'))
flagn = {}
for k_ in SD_:
    loo_c = M['loo19']['null'] if k_ == 'base' else M['loo19']['var'][k_]
    flagn[k_] = dict(diag=int(np.sum(np.array(SD_[k_]['cost']) > M['null']['diag']['q95'])),
                     full=int(np.sum(np.array(SF_[k_]['cost']) > M['null']['full']['q95'])),
                     ff=int(np.sum(np.array(SF_[k_]['cost']) > q03)), fo=int(np.sum(np.array(SF_[k_]['cost']) > q0)),
                     loo=int(np.sum(np.array(loo_c) > M['loo19']['q95'])))
    # the counts agree with the fractions stored by meme_analyze.py
    assert flagn[k_]['diag'] == round(SD_[k_]['frac_flag'] * NSIM) and flagn[k_]['full'] == round(SF_[k_]['frac_flag'] * NSIM)
    if k_ != 'base':
        assert flagn[k_]['loo'] == round(M['loo19']['frac_flag'][k_] * NSIM)
lines = []
for nm in ('base',) + TAILS:
    cells = []
    for ref, _ in REFS:
        lo_, hi_ = cp(flagn[nm][ref])
        cells.append(f'{flagn[nm][ref]} [{lo_:.3f}, {hi_:.3f}]')
    lines.append(f'{lab[nm]} & ' + ' & '.join(cells) + ' \\\\')
    if nm == 'base':
        lines.append('\\addlinespace')
open(f'{P}/tab_flag.tex', 'w').write('\n'.join(lines) + '\n\\bottomrule\n')
var_counts = {ref: [flagn[k_][ref] for k_ in TAILS] for ref, _ in REFS}
# worded: with diagonal weights, and with full whitening against the pooled reference, no variant data set is flagged
assert max(var_counts['diag']) == 0 and max(var_counts['full']) == 0
put('MemeFlagZeroHi', f'{cp(0)[1]:.3f}')
for ref, t in (('ff', 'FF'), ('fo', 'FO'), ('loo', 'Loo')):
    put(f'MemeFlag{t}MinN', str(min(var_counts[ref]))); put(f'MemeFlag{t}MaxN', str(max(var_counts[ref])))
    put(f'MemeFlag{t}MaxHi', f'{cp(max(var_counts[ref]))[1]:.3f}')
    put(f'MemeFlag{t}BaseN', str(flagn['base'][ref]))
allc = [(flagn[k_][ref], k_, ref) for k_ in TAILS for ref, _ in REFS]
cmax = max(allc)
put('MemeFlagMaxN', str(cmax[0])); put('MemeFlagMaxLo', f'{cp(cmax[0])[0]:.3f}'); put('MemeFlagMaxHi', f'{cp(cmax[0])[1]:.3f}')
assert [c_ for c_ in allc if c_[0] == cmax[0]] == [(cmax[0], 'tail500_0.8', 'loo')], 'the largest count: exponent 0.8, leave one out'
assert max(var_counts['loo']) == flagn['tail500_0.8']['loo'] and max(var_counts['fo']) == flagn['tail500_0.8']['fo'], 'exponent 0.8 most often'
assert cmax[0] / NSIM == float(mac['MemeFlagAnyMax'])
# the base itself is flagged in one of 20 under every reference except the pooled full-whitening one, where it is
# flagged in none
assert flagn['base'] == dict(diag=1, full=0, ff=1, fo=1, loo=1)
put('MemeFlagBaseWord', 'one')
# third report S8: the simulated alpha2 of the correctly specified base against its exact-moment value
for how, t, S_h in (('diag', 'Diag', SD_), ('full', 'Full', SF_)):
    ex_ = M['exact'][how]['1.25|base']['alpha2']
    put(f'MemeExactBase{t}', f3(ex_))
    b_ = S_h['base']; tb = (b_['mean'] - ex_) / b_['se']
    put(f'MemeSimBase{t}Mean', f3(b_['mean'])); put(f'MemeSimBase{t}SE', f3(b_['se'])); put(f'MemeSimBase{t}T', f'{tb:.1f}')
    a100 = np.array(M['null'][how]['alpha2']); assert len(a100) == M['n_base']
    se100 = a100.std(ddof=1) / np.sqrt(len(a100)); t100 = (a100.mean() - ex_) / se100
    put(f'MemeNullAlpha{t}', f3(a100.mean())); put(f'MemeNullAlpha{t}SE', f3(se100)); put(f'MemeNullAlpha{t}T', f'{t100:.1f}')
    put(f'MemeNullAlpha{t}Bias', sg(a100.mean() - ex_))
    if how == 'diag':
        assert tb < -2 and t100 < -2, 'diagonal weights: biased low, more than two standard errors'
        put('MemeSimBaseBias', sg(b_['mean'] - ex_))
        assert abs(b_['mean'] - ex_) < min(abs(SD_[k_]['diff_mean']) for k_ in TAILS), 'the bias is smaller than every shift'
    else:
        assert abs(tb) < 2 and abs(t100) < 2, 'full whitening: no bias detected'
assert mac['MemeSimBaseDiagMean'] == mac['MemeSimBase'] and mac['MemeSimBaseDiagSE'] == mac['MemeSimBaseSE']
for nm, t in (('tail500_3.0', 'Three'), ('tail500_0.8', 'PointEight')):
    put(f'MemeSimDiff{t}', sg(S[nm]["diff_mean"]))
    put(f'MemeSimDiff{t}Lo', sg(S[nm]["diff_ci"][0])); put(f'MemeSimDiff{t}Hi', sg(S[nm]["diff_ci"][1]))
    put(f'MemeFrac{t}', f2(S[nm]['frac_beyond_010']))
    put(f'MemeExactShift{t}', sg(EXD[f'1.25|{nm}']['alpha2'] - 1.25))
    put(f'MemeFullShift{t}', sg(EXF[f'1.25|{nm}']['alpha2'] - 1.25))
    put(f'MemeFullSimDiff{t}', sg(SF_[nm]['diff_mean']))
    put(f'MemeFlagFull{t}', f2(SF_[nm]['frac_flag'])); put(f'MemeFlagDiag{t}', f2(S[nm]['frac_flag']))
put('MemeRatioThreeSD', f'{S["tail500_3.0"]["diff_mean"] / S["base"]["sd"]:.1f}')
put('MemeRatioThreeGap', f'{S["tail500_3.0"]["diff_mean"] / 0.20:.2f}')
put('MemeTailShiftMax', f2(max(abs(EXD[f"1.25|{k}"]["alpha2"] - 1.25) for k in TAILS)))
put('MemeLooFlagPointEight', f2(M['loo19']['frac_flag']['tail500_0.8']))
put('MemeLooFlagMax', f2(max(M['loo19']['frac_flag'].values()))); put('MemeLooFlagMin', f2(min(M['loo19']['frac_flag'].values())))
put('MemeLooNullQ', f2(M['loo19']['q95']))
put('MemeFullVarMedMin', f2(min(SF_[k]['cost_median'] for k in tails))); put('MemeFullVarMedMax', f2(max(SF_[k]['cost_median'] for k in tails)))
put('MemeFullBaseMed', f2(SF_['base']['cost_median']))
flagfull = {k: SF_[k]['frac_flag'] for k in tails}
put('MemeFlagFullMax', f2(max(flagfull.values())))
put('MemeFlagFullMaxName', {'tail500_0.8': 'exponent 0.8', 'tail500_1.0': 'exponent 1.0', 'tail500_2.0': 'exponent 2.0',
                            'tail500_3.0': 'exponent 3.0', 'rank2800': 'zero beyond rank 2,800'}[max(flagfull, key=flagfull.get)])
# Matern codes: Kong-Valiant moments of noise-free responses, diagonal fit
mt = [r for r in M['matern'] if r['how'] == 'diag' and r['alpha2'] is not None]
put('MemeMaternN', str(len(mt)))
put('MemeMaternBad', str(sum(1 for r in M['matern'] if r['how'] == 'diag' and r['alpha2'] is None)))
good = [r for r in mt if r['within_null']]
put('MemeGoodN', str(len(good)))
put('MemeMaternMisfitMedian', f2(float(np.median([r['cost'] for r in mt]))))
put('MemeMaternMisfitMax', f'{max(r["cost"] for r in mt):.0f}' if max(r['cost'] for r in mt) >= 10 else f2(max(r['cost'] for r in mt)))
sb = [r for r in good if r['nu'] > 1 and r['alpha2'] < r['bound']]
ra = [r for r in good if r['nu'] < 1 and r['alpha2'] > r['bound']]
put('MemeGoodSmoothBelow', str(len(sb))); put('MemeGoodRoughAbove', str(len(ra)))
put('MemeGoodSmoothN', str(sum(1 for r in good if r['nu'] > 1))); put('MemeGoodRoughN', str(sum(1 for r in good if r['nu'] < 1)))
if sb:
    put('MemeGoodSmoothBelowMin', f3(min(r['alpha2'] for r in sb)))
if ra:
    rmax = max(ra, key=lambda r: r['alpha2'])
    put('MemeGoodRoughAboveMax', f3(rmax['alpha2'])); put('MemeGoodRoughAboveMaxBound', f2(rmax['bound']))
mtf = [r for r in M['matern'] if r['how'] == 'full' and r['alpha2'] is not None]
goodf = [r for r in mtf if r['within_null']]
put('MemeFullGoodN', str(len(goodf)))
sbf = [r for r in goodf if r['nu'] > 1 and r['alpha2'] < r['bound']]
raf = [r for r in goodf if r['nu'] < 1 and r['alpha2'] > r['bound']]
put('MemeFullGoodSmoothBelow', str(len(sbf))); put('MemeFullGoodRoughAbove', str(len(raf)))
put('MemeFullGoodSmoothN', str(sum(1 for r in goodf if r['nu'] > 1))); put('MemeFullGoodRoughN', str(sum(1 for r in goodf if r['nu'] < 1)))
gbf = [r['alpha2'] for r in goodf if r['nu'] == 1.0]
put('MemeFullGoodBorderBelow', str(sum(1 for r in goodf if r['nu'] == 1.0 and r['alpha2'] < r['bound'])))
put('MemeFullGoodBorderAbove', str(sum(1 for r in goodf if r['nu'] == 1.0 and r['alpha2'] > r['bound'])))
put('MemeGoodBorderBelow', str(sum(1 for r in good if r['nu'] == 1.0 and r['alpha2'] < r['bound'])))
put('MemeGoodBorderAbove', str(sum(1 for r in good if r['nu'] == 1.0 and r['alpha2'] > r['bound'])))
put('MemeMaternHits', str(sum(1 for r in mt if r['alpha2'] >= 5.99)))
# second report S4(b): where the profiled break sits
for how, t in (('diag', 'Diag'), ('full', 'Full')):
    rr = [r for r in M['matern'] if r['how'] == how and r['alpha2'] is not None]
    lo = [r for r in rr if r['ell'] >= 1]
    put(f'MemeBrkLow{t}', str(sum(r['brk'] == 4 for r in lo))); put(f'MemeBrkLowTotal{t}', str(len(lo)))
    put(f'MemeBrkHigh{t}', str(sum(r['brk'] == 30 for r in rr)))
    assert all(r['ell'] < 1 for r in rr if r['brk'] == 30)
    # S4(d): passing fits lie on both sides of the bound for every smoothness
    g_ = [r for r in rr if r['within_null']]
    for nu in (0.75, 1.0, 1.5):
        a_ = [r for r in g_ if r['nu'] == nu]
        assert any(r['alpha2'] > r['bound'] for r in a_) and any(r['alpha2'] < r['bound'] for r in a_), (how, nu)
put('MemeMaternHitsFull', str(sum(1 for r in mtf if r['alpha2'] >= 5.99)))
assert mac['MemeBrkLowDiag'] == mac['MemeBrkLowFull'] and mac['MemeBrkLowTotalDiag'] == mac['MemeBrkLowTotalFull'], 'break counts equal'
assert mac['MemeBrkHighFull'] == '1' and mac['MemeMaternHits'] == '1' and mac['MemeMaternHitsFull'] == '0', 'singular wording'
# second report S4(c): infinitely many neurons against a population of 8,704 (ell = 1/4, matern_extra.py kvN)
KVI = {lab: json.load(open(f'{OUT}/extra_parts/{lab}_kv.json')) for lab in G}
pr = {(lab, k): v[0] ** 2 / v[1] for lab in KVI for k, v in KVI[lab].items()}
put('MemePRMaxQuarter', f'{max(v for (lab, k), v in pr.items() if k.endswith("|0.25")):.0f}')
put('MemePRMaxOne', f'{max(v for (lab, k), v in pr.items() if not k.endswith("|0.25")):.0f}')
put('MemePRRelMaxOne', f'{100 * max(v for (lab, k), v in pr.items() if not k.endswith("|0.25")) / 8704:.1f}')
MN = [r for r in M['maternN'] if r['alpha2'] is not None]
assert len(MN) == 2 * 30, len(MN)
MI = {(r['how'], r['set'], r['nu'], r['ell']): r for r in M['matern'] if r['alpha2'] is not None}
dl2 = [r['logmom'][1] - np.log(KVI[r['set']][f"{r['nu']}|{r['ell']}"][1]) for r in MN if r['how'] == 'diag']
put('MemeNLogTwoMax', f3(max(dl2))); put('MemeNLogTwoSD', f'{max(dl2) / M["sd_logmom"][1]:.1f}')
put('MemeNAlphaShiftMax', f3(max(abs(r['alpha2'] - MI[(r['how'], r['set'], r['nu'], r['ell'])]['alpha2']) for r in MN)))
assert all((r['alpha2'] > r['bound']) == (MI[(r['how'], r['set'], r['nu'], r['ell'])]['alpha2'] > r['bound']) for r in MN), 'same side at finite N'
assert all(r['alpha2'] < r['bound'] for r in MN), 'every ell = 1/4 fit below the bound at finite N'
for how, t in (('diag', 'Diag'), ('full', 'Full')):
    put(f'MemeNPassInf{t}', str(sum(MI[(how, r['set'], r['nu'], 0.25)]['within_null'] for r in MN if r['how'] == how)))
    put(f'MemeNPassFin{t}', str(sum(r['within_null'] for r in MN if r['how'] == how)))
    # with the finite-population moments substituted at ell = 1/4, passing fits still lie on both sides for every nu
    sub = [r for r in M['matern'] if r['how'] == how and r['alpha2'] is not None and r['ell'] != 0.25] + [r for r in MN if r['how'] == how]
    for nu in (0.75, 1.0, 1.5):
        a_ = [r for r in sub if r['within_null'] and r['nu'] == nu]
        assert any(r['alpha2'] > r['bound'] for r in a_) and any(r['alpha2'] < r['bound'] for r in a_), ('finite N', how, nu)
for tag, d in (('Eight', 8), ('Four', 4)):
    gb = [r['alpha2'] for r in good if r['d'] == d and r['nu'] == 1.0]
    put(f'MemeGoodBorder{tag}N', str(len(gb)))
    if gb:
        put(f'MemeGoodBorder{tag}Min', f3(min(gb))); put(f'MemeGoodBorder{tag}Max', f3(max(gb)))
    ab = [r['alpha2'] for r in mt if r['d'] == d and r['nu'] == 1.0]
    put(f'MemeBorder{tag}Min', f3(min(ab))); put(f'MemeBorder{tag}Max', f3(max(ab)))

# ---------------------------------------------------------------- cvPCA and tail SNR
runs = sorted(glob.glob(f'{OUT}/snr_cv_seed*.json'))
lv = {}
for fn in runs:
    J = json.load(open(fn))
    tw = J['truth_window']; dcv = J['data_cv']
    for k, v in J['levels'].items():
        lv.setdefault(k, {'w': [], 'cv': []})
        lv[k]['w'] += v['cv_window']; lv[k]['cv'].append(v['sim_cv_11_100_500'])
put('SnrTruth', f3(tw))
put('SnrR', str(len(lv['1']['w'])))
for k, t in (('1', 'One'), ('4', 'Four'), ('16', 'Sixteen')):
    w = np.array(lv[k]['w'])
    put(f'SnrBias{t}', sg(w.mean() - tw)); put(f'SnrSE{t}', f3(w.std(ddof=1) / np.sqrt(len(w))))
    cv = np.mean(lv[k]['cv'], 0)
    put(f'SnrRatio{t}', ', '.join(f'{dcv[i] / cv[i]:.1f}' for i in range(3)))

# ---------------------------------------------------------------- single precision (third report, S5)
PR_ = json.load(open(f'{OUT}/precision.json'))
put('PrecN', str(len(PR_['meme'])))
put('PrecLogMomMax', sci(max(v['dlog_all'] for v in PR_['meme'].values())))
put('PrecWhiteMax', sci(max(v['white_shift'] for v in PR_['meme'].values())))
dal = [abs(v[h]['alpha2_f64'] - v[h]['alpha2_f32']) for v in PR_['meme'].values() for h in ('diag', 'full')]
dmi = [abs(v[h]['misfit_f64'] - v[h]['misfit_f32']) for v in PR_['meme'].values() for h in ('diag', 'full')]
dcv = [abs(v['window_f64'] - v['window_f32']) for v in PR_['cvpca'].values()]
put('PrecAlphaMax', sci(max(dal))); put('PrecMisfitMax', sci(max(dmi))); put('PrecCvMax', sci(max(dcv)))
# worded: far below the printed precision (three decimals) of alpha2, the misfit and the cvPCA exponent
assert max(dal) < 5e-4 and max(dmi) < 5e-4 and max(dcv) < 5e-4, 'single-precision effects below the printed precision'

# ---------------------------------------------------------------- qualitative statements in the text
# whitened 8D coordinates: no nu = 0.75 code exceeds the bound at any length scale computed (abstract)
assert max(EXW[s_][f'0.75|{e}']['w11_500'] for s_ in sets8 for e in ELLS) < 1.25, 'whitened 8D nu = 0.75 below the bound'
# Each assertion guards a sentence of the note that is worded rather than printed as a number.
for d in (8, 4):
    sets_d = sorted({r['set'] for r in W if r['d'] == d}); bnd = 1 + 2 / d
    assert all(x > bnd for x in sel(d, 0.75, 4.0)), 'nu=0.75 above the bound in every set at ell=4 (N = inf)'
    assert all(x < bnd for x in sel(d, 0.5)), 'nu=0.5 below the bound throughout'
    assert all(x < bnd for x in sel(d, 1.5, 0.25) + sel(d, 2.5, 0.25)), 'smooth codes below the bound at ell=1/4'
    assert max(sel(d, 0.75)) < {8: 1.49, 4: 1.65}[d], 'nu=0.75 does not reach the reported values'
    assert all(row(s_, 0.75, 4.0)['w101_500'] < bnd for s_ in sets_d), 'ranks 101-500 below the bound at ell=4'
assert all(r['w101_500'] < r['bound'] for r in mid_above), 'every nu=0.75 cell above the bound is below it over 101-500'
assert ordinal, 'ordinal pattern: 4D above 8D in every cell'
assert max(r['w_sampled'] for r in rows if r['nu'] == 1.0) < 3, 'd=1 border codes all below 3'
assert all(r['w_sampled'] < r['alpha_inf'] for r in rows), 'd=1 every code below its asymptote'
assert C['prop1']['nu1.5_kappa1.0_a2.0']['w'] > 3, 'non-differentiable d=1 example above 3'
assert all(max(G[s_]['rel'][-2:]) < 0.02 for s_ in ('8D_MP032_0810', '8D_MP033_0822')), 'last coordinates < 2%'
assert max(G['8D_MP033_0822']['rel'][-3:]) < 0.02
assert sorted(sets8, key=lambda s_: G[s_]['pr']) == sorted(sets8, key=lambda s_: -next(r['w11_500'] for r in W if r['set'] == s_ and r['nu'] == 1.0 and r['ell'] == 1.0)), 'larger values in sets with smaller PR'
assert all(abs(z) < 0.1 for k in TAILS for z in EXD[f'1.25|{k}']['z_ge2'])
assert S['tail500_3.0']['diff_ci'][0] > 0.10, 'exponent-3.0 shift interval above 0.10'
assert all(EXW[s_]['1.0|1.0']['w11_500'] < 1.25 and EXW[s_]['1.0|8.0']['w11_500'] > 1.25 for s_ in sets8), 'whitened border codes on both sides at d = 8'
assert all(fin(s_, 1.0, 0.25)['mean'] < 1 + 2 / int(s_[0]) for s_ in sets8 + sets4), 'finite N: border below at ell = 1/4'
assert all(fin(s_, 1.0, 8.0)['mean'] > 1 + 2 / int(s_[0]) for s_ in sets8 + sets4), 'finite N: border above at ell = 8'

with open(f'{P}/numbers.tex', 'w') as fh:
    fh.write('% Generated by code/make_numbers.py from ../out/. Do not edit.\n')
    for k in sorted(mac):
        assert k.isalpha(), f'macro name {k} is not letters only'
        fh.write(f'\\newcommand{{\\{k}}}{{{mac[k]}}}\n')
json.dump(mac, open(f'{OUT}/numbers.json', 'w'), indent=1)
print(f'{len(mac)} macros written')
