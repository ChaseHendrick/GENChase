# Direct integration of the alpha-model Biot-Savart ODE from self-similar configurations; RK4 at 30 digits.
from core import *
mp.mp.dps = 30
def rhs(z, G, alpha):
    return velocities(z, G, alpha)
def rk4(z, G, alpha, h):
    k1 = rhs(z, G, alpha)
    k2 = rhs([z[i] + h/2*k1[i] for i in range(3)], G, alpha)
    k3 = rhs([z[i] + h/2*k2[i] for i in range(3)], G, alpha)
    k4 = rhs([z[i] + h*k3[i] for i in range(3)], G, alpha)
    return [z[i] + h/6*(k1[i] + 2*k2[i] + 2*k3[i] + k4[i]) for i in range(3)]
def run(w, alpha, nsteps=3000, frac=mp.mpf('0.9')):
    alpha = mp.mpf(alpha)
    k, res, G, zc = kappa_bs(w, alpha)
    G = list(G)
    if k.real > 0:          # flip circulations -> time reversal -> collapse
        G = [-g for g in G]; k = -k
    z0 = [mp.mpc(0), mp.mpc(1), mp.mpc(w)]
    zc = sum(g*zz for g, zz in zip(G, z0))/sum(G)
    tc = -1/((alpha+2)*k.real)
    P = abs(k.imag)/(2*abs(k.real))
    T = frac*tc; h = T/nsteps
    z = z0[:]; t = mp.mpf(0)
    r0 = [abs(z0[j]-zc) for j in range(3)]
    arg0 = [mp.arg(z0[j]-zc) for j in range(3)]
    path = [mp.mpf(0)]*3; phase = [mp.mpf(0)]*3; prev = z0[:]
    maxerr_r = 0; maxerr_phi = 0
    for n in range(nsteps):
        z = rk4(z, G, alpha, h); t += h
        for j in range(3):
            path[j] += abs(z[j]-prev[j])   # chord sum (lower bound of arc length; step small)
            d = mp.arg((z[j]-zc)/(prev[j]-zc)); phase[j] += d
        prev = z[:]
        if (n+1) % 300 == 0:
            lam = (1 - t/tc)**(1/(alpha+2))
            phi_pred = (k.imag/k.real)*mp.log(lam)
            for j in range(3):
                maxerr_r = max(maxerr_r, abs(abs(z[j]-zc)/r0[j] - lam))
                maxerr_phi = max(maxerr_phi, abs(phase[j] - phi_pred))
    lam = (1 - t/tc)**(1/(alpha+2))
    pl_pred = [r0[j]*mp.sqrt(1+4*P**2)*(1-lam) for j in range(3)]
    pl_err = max(abs(path[j]-pl_pred[j])/pl_pred[j] for j in range(3))
    # velocity angle vs direction to collision point at the end
    v = velocities(z, G, alpha)
    ang = [mp.acos(abs(((v[j])*mp.conj(zc - z[j])).real)/(abs(v[j])*abs(zc-z[j]))) for j in range(3)]
    ang_err = max(abs(a - mp.atan(2*P)) for a in ang)
    zcn = sum(g*zz for g, zz in zip(G, z))/sum(G)
    return dict(alpha=alpha, P=P, tc=tc, G=G, res=res, lam_end=lam, err_r=maxerr_r, err_phi=maxerr_phi, pathlen_rel_err=pl_err, angle_err=ang_err, zc_drift=abs(zcn-zc))
import sys
cases = [(mp.mpf('0.3')*mp.expj(mp.mpf('2.03')), '1'), (mp.mpf('0.3')*mp.expj(mp.mpf('2.06')), '0.5'),
         (mp.mpf('0.3')*mp.expj(mp.mpf('2.01')), '1.5'), (mp.mpc('-0.4','0.9'), '1'), (mp.mpc('0.2','1.3'), '1.8')]
for w, al in cases:
    r = run(w, al)
    print('alpha=%s w=%s P=%s tc=%s Gamma=%s selfsim-res=%s' % (al, mp.nstr(w,5), mp.nstr(r['P'],12), mp.nstr(r['tc'],8), [mp.nstr(g,6) for g in r['G']], mp.nstr(r['res'],3)))
    print('    to t=0.9tc (lambda=%s): max| |z-zc|/r0 - lambda | = %s ; max|phase - (Imk/Rek) ln lambda| = %s ; path length rel err (chord sum) = %s ; |angle - atan 2P| = %s ; zc drift = %s' % (
        mp.nstr(r['lam_end'],6), mp.nstr(r['err_r'],3), mp.nstr(r['err_phi'],3), mp.nstr(r['pathlen_rel_err'],3), mp.nstr(r['angle_err'],3), mp.nstr(r['zc_drift'],3)))
