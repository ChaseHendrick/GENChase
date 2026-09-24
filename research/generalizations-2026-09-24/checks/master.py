# G1: P = (2 - cos^2 l + eps cos psi cos l)/(sin psi sin 2l) on every zero-impulse triangle, checked against Biot-Savart.
import numpy as np
def kappas(G,Z):
    zc=(G@Z)/G.sum(); out=[]
    for j in range(3):
        v=np.conj(sum(G[m]/(Z[j]-Z[m]) for m in range(3) if m!=j)/(2j*np.pi)); out.append(v/(Z[j]-zc))
    return np.array(out)
for mu in [0.1,0.3,0.7,1.0,2.5]:
    G=np.array([1,mu,-mu/(1+mu)])
    c=mu/(1+mu); rad=np.sqrt(c*c+1/(1+mu))           # circle |z3|^2 + mu|z3-1|^2 = 1+mu
    tp=3*np.sqrt(3)*abs(G.prod())/abs((G[0]-G[1])*(G[1]-G[2])*(G[2]-G[0])) if mu!=1 else np.inf
    psi=np.arctan(tp) if np.isfinite(tp) else np.pi/2
    errs=[];ss=[];arcs={}
    for th in np.linspace(0.01,2*np.pi-0.01,2000):
        z3=c+rad*np.exp(1j*th)
        if abs(z3.imag)<1e-3: continue
        Z=np.array([0,1,z3]); k=kappas(G,Z)
        if np.ptp(abs(k))>1e-9*abs(k[0]): print('not self-similar!'); break
        k=k[0]; P=abs(k.imag)/(2*abs(k.real))
        s=abs(np.array([1,z3,z3-1]))**2; A=abs(z3.imag)/2
        l=np.arcsin(4*np.sqrt(3)*A/s.sum())
        f=lambda e:(2-np.cos(l)**2+e*np.cos(psi)*np.cos(l))/(np.sin(psi)*np.sin(2*l))
        e=-1 if abs(f(-1)-P)<abs(f(1)-P) else 1
        errs.append(min(abs(f(-1)-P),abs(f(1)-P))/P)
        key=(np.sign(z3.imag),np.sign(k.real)); arcs.setdefault(key,set()).add(e)
    print(f'mu={mu}: max rel err {max(errs):.1e} over {len(errs)} shapes; eps per (orientation, collapse/burst) arc:',{k:sorted(v) for k,v in arcs.items()})
