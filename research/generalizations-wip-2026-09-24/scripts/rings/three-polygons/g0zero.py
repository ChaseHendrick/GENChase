# where does Gamma0 vanish in the DK family? (3n-vortex members without a central vortex)
import mpmath as mp, sys
sys.argv=['x']; exec(open('family.py').read().split("out = {}")[0])
for n in range(2,9):
    a=rmin(n)
    xs=[a+(1-a)*mp.mpf(i)/4000 for i in range(1,4000)]
    g=[config(n,x)[2]['G0'] for x in xs]
    ch=[i for i in range(len(g)-1) if mp.sign(g[i])!=mp.sign(g[i+1])]
    roots=[mp.findroot(lambda y: config(n,y)[2]['G0'],(xs[i],xs[i+1]),solver='anderson') for i in ch]
    print(n,'sign of G0 at ends:',mp.sign(g[0]),mp.sign(g[-1]),' zeros:',[(mp.nstr(z,20),mp.nstr(Pfam(n,z),20)) for z in roots])
