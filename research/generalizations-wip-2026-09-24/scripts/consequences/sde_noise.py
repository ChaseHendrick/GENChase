"""Additive-noise regularization of an exact three-vortex collapse (a model, not necessarily the
noise of Grotto-Romito-Viviani): dz_j = v_j dt + sigma dB_j, with dB_j complex, each real component
a standard Brownian motion. Integrated in the rescaled time d tau = dt/|u|^2 (dt = |u|^2 d tau,
dB_t = |u| dB_tau) with a stochastic Heun scheme, vectorized over samples.
For each sample: L at the encounter, the channel (sign L), and the rotation Phi of u = z2 - z1 between
t = 0 (|u| = l) and the first later instant when |u| returns to l after its minimum."""
import numpy as np, sys, time
from npshape import G
from direct_bs import paper_pos

def vel(Gm, z):
    # z: (n,3) complex
    v = np.zeros_like(z)
    for j in range(3):
        for k in range(3):
            if k != j:
                d = z[:, j]-z[:, k]
                v[:, j] += 1j*Gm[k]/(2*np.pi)*d/np.abs(d)**2
    return v

def simulate(mu, th, sigma, n, dtau=2e-3, seed=1, taumax=400.0):
    rng = np.random.default_rng(seed)
    Gm = G(mu)
    z0 = paper_pos(mu, th)
    z = np.tile(z0, (n, 1)).astype(complex)
    l2 = abs(z0[1]-z0[0])**2
    Phi = np.zeros(n); done = np.zeros(n, bool); passed_min = np.zeros(n, bool)
    Lrec = np.full(n, np.nan); Phi_out = np.full(n, np.nan)
    umin2 = np.full(n, l2)
    tau = 0.0
    while tau < taumax and not done.all():
        a = ~done
        za = z[a]
        u = za[:, 1]-za[:, 0]; u2 = np.abs(u)**2
        dB = (rng.standard_normal((a.sum(), 3)) + 1j*rng.standard_normal((a.sum(), 3)))*np.sqrt(dtau)
        noise = sigma*np.sqrt(u2)[:, None]*dB
        f1 = u2[:, None]*vel(Gm, za)
        zp = za + f1*dtau + noise
        up = zp[:, 1]-zp[:, 0]; up2 = np.abs(up)**2
        f2 = up2[:, None]*vel(Gm, zp)
        znew = za + 0.5*(f1+f2)*dtau + noise
        unew = znew[:, 1]-znew[:, 0]
        dphi = np.angle(unew/u)
        Phi[a] += dphi
        un2 = np.abs(unew)**2
        idx = np.where(a)[0]
        umin2[idx] = np.minimum(umin2[idx], un2)
        pm = passed_min[idx] | (un2 > 1.0001*umin2[idx]) & (umin2[idx] < 0.5*l2)
        passed_min[idx] = pm
        # record L when the pair is at its closest (update continuously; L drifts negligibly then)
        Gs = Gm.sum()
        zc = (znew*Gm).sum(1)/Gs
        Lnow = (Gm*np.abs(znew-zc[:, None])**2).sum(1)
        closest = un2 <= umin2[idx]
        Lrec[idx[closest]] = Lnow[closest]
        fin = pm & (un2 >= l2)
        # linear interpolation of Phi to the crossing |u|^2 = l2
        frac = (l2-np.abs(u[fin])**2)/(un2[fin]-np.abs(u[fin])**2)
        Phi_out[idx[fin]] = Phi[idx[fin]] - (1-frac)*dphi[fin]
        done[idx[fin]] = True
        z[a] = znew
        tau += dtau
    return Lrec, Phi_out, done, np.sqrt(l2)

if __name__ == '__main__':
    mu = float(sys.argv[1]); th = float(sys.argv[2]); sigma = float(sys.argv[3]); n = int(sys.argv[4])
    dtau = float(sys.argv[5]) if len(sys.argv) > 5 else 2e-3
    seed = int(sys.argv[6]) if len(sys.argv) > 6 else 1
    t0 = time.time()
    L, Phi, done, l = simulate(mu, th, sigma, n, dtau, seed)
    np.savez('sde_mu%g_sig%g_n%d_dt%g_s%d.npz' % (mu, sigma, n, dtau, seed), L=L, Phi=Phi, done=done, l=l, mu=mu, th=th, sigma=sigma)
    print('done', done.mean(), 'time %.1fs' % (time.time()-t0))
