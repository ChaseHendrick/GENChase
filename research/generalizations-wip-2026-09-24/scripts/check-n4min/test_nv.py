import numpy as np, json
from nv import Model, biot_savart_check
m = Model(4)
d = json.load(open('kkt_mp_120.json'))
u = np.array([float(s) for s in d['x']])
print('res at claimed point', np.abs(m.res(u)).max())
rng = np.random.default_rng(1)
v = rng.normal(size=12); v[3:11] *= 0.3
J = m.jac(v)
h = 1e-6
Jn = np.array([(m.res(v + h*e) - m.res(v - h*e))/(2*h) for e in np.eye(12)]).T
print('jac err', np.abs(J-Jn).max(), np.abs(J).max())
G,z,b,Gt,zc = m.summary(u)
print(biot_savart_check(G,z))
