import numpy as np
from direct_bs import run
mu=0.5; th=3.5329573213217826977; R=1+mu+mu*mu
ch={+1:(1.0647059762712043374+3.1313766592261774639, -5.5154283997902928649), -1:(2*1.0647059762712043374, -0.29741263363270830571)}
prev={}
for d in [1e-4,1e-5,1e-6,1e-7,1e-8]:
    for sg in [1,-1]:
        r=run(mu,th,sg*d,0.7)
        s=int(r['Lsign']); c,C=ch[s]
        pred=c*np.log(1/r['eps'])+C
        inc = r['Phi']-prev[s] if s in prev else float('nan')
        prev[s]=r['Phi']
        print('delta=%.0e Lsign=%+d Phi=%.9f pred=%.9f diff=%.2e  dPhi/decade=%.6f (c ln10=%.6f)'%(d,s,r['Phi'],pred,r['Phi']-pred,inc,c*np.log(10)))
