#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
"""Record the high-precision (non-rigorous) orbit at c* and at the bracket ends; save to data/."""
import json, sys
from flint import arb, ctx, fmpq
ctx.prec=224
import shoot_hp as sh, nfcore as nf, certify_rest as cr, manifold as mf
import numpy as np
from block import setup
T,Tinv=setup()
Tf=np.array([[float(T[i,j].mid()) for j in range(4)] for i in range(4)])
x0=np.array([float(v.mid()) for v in nf.rest_state()[:4]])
cstar=arb('1.102747709734159249147867735746621733255053383781820878935')
out={}
for name,c in (('cstar',cstar),('c1',cr.C1),('c2',cr.C2)):
    kappa=1/c
    s=nf.dS(arb(0)); co=cr.charpoly_coeffs(kappa,s,nf.EPS); lam=cr.refine(co,arb('0.5'),arb('1.2'))
    ok,a,r,info=mf.validate(kappa,lam,mf.choose_sigma(kappa,lam),80)
    x=[arb(v.mid()) for v in mf.evaluate(a,r,arb(fmpq(1,4)))]
    rec=[]
    res=sh.integrate(x,kappa,arb(150),tol_exp=-200,order=40,record=rec,stop=sh.classify,hmax=0.25)
    ys=[]
    for t,xx in rec:
        z=np.array(xx[:4])-x0; y=Tf@z
        ys.append((t,y[0],float(np.linalg.norm(y[1:]))))
    out[name]={'escape':res[0],'t_end':float(res[1].mid()),'traj':rec[::2],'y':ys}
    # first time |y'|<=0.9 rho(0.00786) with |y1|<r
    ent=[(t,y1,ny) for t,y1,ny in ys if ny<0.9*0.0078551672 and abs(y1)<0.0098]
    print(name,'escape',res[0],'t_end %.2f'%float(res[1].mid()),'first entry into 0.9B at t=%.2f y1=%.3e |y\'|=%.3e'%ent[0] if ent else 'never')
    for t,y1,ny in ys[::15]:
        if t>30: print('   t=%.2f y1=% .3e |y\'|=%.3e'%(t,y1,ny))
json.dump(out,open('../data/orbit_hp.json','w'))
