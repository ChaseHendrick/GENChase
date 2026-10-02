import sys, time, pickle
sys.path.insert(0, '/home/user/GENChase/research/cardiac-cycle-certificates/fourier')
import fourier_eval as fe, arbmodel as am
from tp06_18d import NAMES
from flint import acb, arb
co = pickle.load(open('/tmp/claude-0/-home-user-GENChase/8e652c2a-6f64-5009-9ee8-187ba6394e5c/scratchpad/fourier/phi_N64_K32.pkl','rb'))
phi = fe.TrigPoly([[acb(arb(a), arb(b)) for a, b in row] for row in co])
prm = am.params(53)
f = lambda z: am.f(z, prm, prec=53)
df = lambda z: am.f_and_df(z, prm, prec=53)
rho = float(sys.argv[1]); rtol = float(sys.argv[2]); budget = int(sys.argv[3])
st = fe.strip_sup(f, phi, rho, df=df, rtol=rtol, max_evals=budget)
print('rho', rho, 'rtol', rtol, 'evals', st.n_evals, 'leaves', st.n_leaves, 'unres', st.n_unresolved, 'bad', st.n_nonfinite_evals, 'minw', f'{st.min_leaf_width:.2e}', f'{st.seconds:.1f}s')
for i in range(18):
    print(f'  {NAMES[i]:6s} S {float(st.S[i].mid()):.3e} L {float(st.L[i].mid()):.3e}  ratio {float(st.S[i].mid())/max(float(st.L[i].mid()),1e-300):.2f}')
