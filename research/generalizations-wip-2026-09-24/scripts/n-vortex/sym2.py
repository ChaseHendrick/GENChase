import numpy as np, json, sys
from sym import resid, lm, descend, kkt_refine, insert_arm, unpack
def continue_arms(x, m, k, b, mmax, tag):
    out=[]
    while True:
        x, b, fv = kkt_refine(x, m, k, b)
        g, p = unpack(x, m)
        out.append(dict(k=k, m=m, N=1+k*m, P=b/2, kkt=fv, g=g.tolist(), p=[[z.real, z.imag] for z in p], b=b))
        print(k, m, 1+k*m, repr(b/2), 'kkt', fv, 'g', np.round(g, 4).tolist(), flush=True)
        json.dump(out, open('sym2_%s.json' % tag, 'w'))
        if m >= mmax: break
        pts = insert_arm(x, m, k, b)
        cand = None
        for z in pts:
            for sg in (1, -1):
                g2 = np.concatenate([g, [sg*0.01]]); p2 = np.concatenate([p, [z]])
                x2 = np.concatenate([g2, p2.real, p2.imag])
                for db in (0.0, 0.02, 0.1):
                    xs, fv = lm(lambda y: resid(y, m+1, k, b+db), x2.copy())
                    if fv < 1e-24: break
                if fv > 1e-24: continue
                xe, be, why = descend(xs, m+1, k, b+db)
                if why == 'stalled' and (cand is None or be < cand[1]):
                    cand = (xe, be)
        if cand is None:
            print('no candidate', flush=True); break
        x, b = cand; m += 1
    return out
if __name__ == '__main__':
    k=int(sys.argv[1]); m0=int(sys.argv[2]); mmax=int(sys.argv[3]); seed=int(sys.argv[4]); ntr=int(sys.argv[5])
    rng=np.random.default_rng(seed)
    best=None
    if len(sys.argv)>6:
        d=json.load(open(sys.argv[6])); g=np.array(d['g']); p=np.array([complex(a,c) for a,c in d['p']]); b=d['b']
        best=(np.concatenate([g,p.real,p.imag]), b); m=len(g)
    else:
        m=m0
        for t in range(ntr):
            x0=np.concatenate([rng.normal(size=m)*0.6, rng.normal(size=2*m)*0.6])
            b0=3.0
            x,fv=lm(lambda y: resid(y,m,k,b0),x0)
            if fv>1e-22: continue
            xe,be,why=descend(x,m,k,b0)
            g,_=unpack(xe,m)
            if why=='stalled' and np.min(abs(g))>0.02 and (best is None or be<best[1]):
                best=(xe,be); print('seed',t,be/2,np.round(g,4).tolist(),flush=True)
    if best is None: print('no seed'); sys.exit()
    continue_arms(best[0], m, k, best[1], mmax, 'k%d_s%d'%(k,seed))
