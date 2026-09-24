import numpy as np, sys, glob
from scipy.special import gamma as Gam
import mpmath as mp
from npshape import G
from direct_bs import paper_pos

# channel data: (mu, th) -> {sign: (c, C)} ; filled from high-precision runs (batch_C.log)
CH = {
 1.0: {+1: (2*np.sqrt(2), -0.9277786211007262), -1: (2*np.sqrt(2), 0.7399132240805569)},
}
def add_channel(mu, s, Pin, Pout, C):
    CH.setdefault(mu, {})[s] = (Pin+Pout, C)

def kappa(mu, th):
    Gm = G(mu); z = paper_pos(mu, th)
    v = []
    for j in range(3):
        s = 0j
        for k in range(3):
            if k != j: s += Gm[k]/(z[j]-z[k])
        v.append(np.conj(s/(2j*np.pi)))
    return v[2]/z[2], z

def EabsZ(y):
    # E |Z|^{i y}, Z ~ N(0,1)
    return complex(mp.power(2, 1j*y/2)*mp.gamma((1+1j*y)/2)/mp.sqrt(mp.pi))

def analyze(fn):
    d = np.load(fn)
    mu = float(d['mu']); th = float(d['th']); sigma = float(d['sigma']); L = d['L']; Phi = d['Phi']; l = float(d['l'])
    ok = d['done'] & np.isfinite(L) & np.isfinite(Phi)
    L = L[ok]; Phi = Phi[ok]
    k, z = kappa(mu, th)
    tc = -1/(2*k.real)
    Gm = G(mu)
    V = 2*tc*np.sum(Gm**2*np.abs(z)**2)
    R = 1+mu+mu*mu
    Zs = L/(sigma*np.sqrt(V))
    print(fn, 'N=%d' % len(L), 'P(L>0)=%.4f +/- %.4f' % ((L > 0).mean(), 0.5/np.sqrt(len(L))),
          'L/(sigma sqrt V): mean %.4f sd %.4f (N(0,1) predicts 0, 1; se of sd ~ %.4f)' % (Zs.mean(), Zs.std(), 1/np.sqrt(2*len(L))))
    for s in [+1, -1]:
        if s not in CH.get(mu, {}): continue
        c, C = CH[mu][s]
        m = (np.sign(L) == s)
        pred_each = c*np.log(mu*l**2/(R*np.abs(L[m]))) + C
        resid = Phi[m]-pred_each
        emp = np.mean(np.exp(1j*Phi[m])); se = 1/np.sqrt(m.sum())
        pred = np.exp(1j*(c*np.log(mu*l**2/(R*sigma*np.sqrt(V))) + C))*EabsZ(-c)
        print('  sign %+d  n=%d  per-sample residual Phi - [c ln(mu l^2/(R|L|)) + C]: mean %.4f, sd %.4f, max|.| %.4f' % (s, m.sum(), resid.mean(), resid.std(), np.abs(resid).max()))
        print('     first circular moment: empirical |m1|=%.4f arg=%.4f ; predicted |m1|=%.4f arg=%.4f ; |emp - pred| = %.4f (MC se ~ %.4f)' % (
            abs(emp), np.angle(emp), abs(pred), np.angle(pred), abs(emp-pred), se))

if __name__ == '__main__':
    for extra in sys.argv[2:]:
        pass
    for fn in sorted(glob.glob(sys.argv[1])):
        analyze(fn)
