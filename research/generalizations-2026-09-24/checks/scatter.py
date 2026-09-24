# C1/C2 scattering law: perturb an exact collapse off L = 0, integrate Biot-Savart, and measure the rotation of arg(z2 - z1)
# between the two instants |z2 - z1| = 0.5. Reports the true sign of L, the exit channel, and slope vs P_in + P(conj w_out).
import numpy as np, sys
from scipy.integrate import solve_ivp
mu=float(sys.argv[1]); G=np.array([1,mu,-mu/(1+mu)])
def vel(t,y):
    Z=y[:3]+1j*y[3:]; V=np.zeros(3,complex)
    for j in range(3): V[j]=np.conj(sum(G[m]/(Z[j]-Z[m]) for m in range(3) if m!=j)/(2j*np.pi))
    return np.concatenate([V.real,V.imag])
def kap(Z):
    zc=(G@Z)/G.sum(); d=vel(0,np.concatenate([Z.real,Z.imag])); return (d[0]+1j*d[3])/(Z[0]-zc)
def Pshape(w):   # P of the zero-impulse shape nearest to w (radial projection onto the circle C)
    c=mu/(1+mu); rad=np.sqrt(c*c+1/(1+mu)); w=c+rad*(w-c)/abs(w-c); k=kap(np.array([0,1,w])); return abs(k.imag)/(2*abs(k.real)), w
c=mu/(1+mu); rad=np.sqrt(c*c+1/(1+mu))
for th in [2.0,2.6]:
    Z0=np.array([0,1,c+rad*np.exp(1j*th)])
    if kap(Z0).real>0: Z0=np.conj(Z0)
    Pin=Pshape(Z0[2])[0]
    for sgn in [-1,1]:
        rows=[]
        for d in [1e-4,3e-5,1e-5]:
            Z=Z0.copy(); Z[2]*=1+sgn*d; zc=(G@Z)/G.sum(); L=float(G@abs(Z-zc)**2)
            ev=lambda t,y: np.hypot(y[1]-y[0],y[4]-y[3])-0.5
            sol=solve_ivp(vel,[0,40],np.concatenate([Z.real,Z.imag]),method='DOP853',rtol=1e-12,atol=1e-14,events=ev,dense_output=True)
            te=sol.t_events[0]; ts=np.linspace(te[0],te[1],400001); Y=sol.sol(ts); u=(Y[1]-Y[0])+1j*(Y[4]-Y[3])
            Phi=abs(np.unwrap(np.angle(u))[-1]-np.angle(u[0])); y=sol.y_events[0][1]; Zf=y[:3]+1j*y[3:]
            wout=(Zf[2]-Zf[0])/(Zf[1]-Zf[0]); rows.append((L,Phi,wout))
        x=np.log(1/abs(np.array([r[0] for r in rows]))); slope=np.polyfit(x,[r[1] for r in rows],1)[0]
        Pout,wproj=Pshape(np.conj(rows[-1][2]))
        chan='mirror' if abs(np.conj(rows[-1][2])-Z0[2])<2e-2 else 'cross'
        print(f'mu={mu} th={th} L={rows[-1][0]:+.1e}: slope {slope:.5f} | P_in+P_out {Pin+Pout:.5f} (P_in {Pin:.5f}, P_out {Pout:.5f}) | channel {chan} | >= sqrt3: {slope>np.sqrt(3)}')
