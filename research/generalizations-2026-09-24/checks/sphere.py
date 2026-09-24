# S2/S3 on the unit sphere: place a planar zero-impulse (collapsing) triangle on a circle of angular radius beta0,
# integrate dx_i/dt = (1/2pi) sum_j G_j (x_j x x_i)/|x_i - x_j|^2, and test the claimed loxodrome law:
# the circumcircle pole n makes angle beta with p = J/|J| (J = sum G_i x_i), cos(beta) is linear in time, and the
# azimuth psi of n about p obeys |d psi / d ln tan^2(beta/2)| = P0, the planar winding of the shape.
import numpy as np
from scipy.integrate import solve_ivp
mu=0.5; G=np.array([1,mu,-mu/(1+mu)]); c=mu/(1+mu); rad=np.sqrt(c*c+1/(1+mu))
def planar_k(Z):
    zc=(G@Z)/G.sum(); v=np.conj(sum(G[m]/(Z[0]-Z[m]) for m in (1,2))/(2j*np.pi)); return v/(Z[0]-zc)
def rhs(t,y):
    X=y.reshape(3,3); V=np.zeros((3,3))
    for i in range(3):
        for j in range(3):
            if i!=j: V[i]+=G[j]*np.cross(X[j],X[i])/np.sum((X[i]-X[j])**2)
    return (V/(2*np.pi)).ravel()
for th in [2.2,2.8]:
    Z=np.array([0,1,c+rad*np.exp(1j*th)]); k=planar_k(Z)
    if k.real>0: Z=np.conj(Z); k=planar_k(Z)
    P0=abs(k.imag)/(2*abs(k.real))
    # circumcenter and circumradius of the planar triangle
    a,b,cc=Z; d=2*(a.real*(b.imag-cc.imag)+b.real*(cc.imag-a.imag)+cc.real*(a.imag-b.imag))
    ux=((abs(a)**2)*(b.imag-cc.imag)+(abs(b)**2)*(cc.imag-a.imag)+(abs(cc)**2)*(a.imag-b.imag))/d
    uy=((abs(a)**2)*(cc.real-b.real)+(abs(b)**2)*(a.real-cc.real)+(abs(cc)**2)*(b.real-a.real))/d
    O=ux+1j*uy; rho=abs(a-O)
    for beta0 in [0.5,1.2]:
        W=(Z-O)/rho*np.sin(beta0); X0=np.stack([W.real,W.imag,np.full(3,np.cos(beta0))],1)
        out=[]
        for T in [+1,-1]:
            ev=lambda t,y: np.min([np.linalg.norm(y[3*i:3*i+3]-y[3*j:3*j+3]) for i,j in ((0,1),(1,2),(0,2))])-1e-3; ev.terminal=True
            sol=solve_ivp(rhs,[0,T*200],X0.ravel(),method='DOP853',rtol=1e-12,atol=1e-14,events=ev,dense_output=True,max_step=0.05)
            out.append(sol)
        fwd=out[0] if out[0].status==1 else out[1]      # the direction that shrinks
        ts=np.linspace(0,fwd.t[-1],4000)[:-5]; Y=fwd.sol(ts).T.reshape(-1,3,3)
        J=np.einsum('i,tij->tj',G,Y); p=J/np.linalg.norm(J,axis=1)[:,None]
        n=np.cross(Y[:,1]-Y[:,0],Y[:,2]-Y[:,0]); n/=np.linalg.norm(n,axis=1)[:,None]
        n*=np.sign(np.einsum('ti,ti->t',n,p))[:,None]        # pole on the side of p
        beta=np.arccos(np.clip(np.einsum('ti,ti->t',n,p),-1,1))
        p0=p[0]; e1=np.cross(p0,[0.3,0.5,0.8]); e1/=np.linalg.norm(e1); e2=np.cross(p0,e1)
        psi=np.unwrap(np.arctan2(n@e2,n@e1)); x=np.log(np.tan(beta/2)**2)
        slope=np.gradient(psi,x); lin=np.polyfit(ts,np.cos(beta),1,full=True)
        print(f'theta={th} beta0={beta0}: p drift {np.max(np.linalg.norm(p-p0,axis=1)):.1e}; beta {beta[0]:.3f}->{beta[-1]:.4f}; '
              f'|dpsi/dln tan^2(b/2)| median {np.median(abs(slope)):.6f} range [{np.percentile(abs(slope),2):.6f},{np.percentile(abs(slope),98):.6f}] vs P0 {P0:.6f}; '
              f'cos(beta) linear-fit rms {np.sqrt(lin[1][0]/len(ts)):.1e}')
