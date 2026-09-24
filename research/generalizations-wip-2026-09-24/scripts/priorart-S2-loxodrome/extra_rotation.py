import sympy as sp
b, b0, P = sp.symbols('beta beta0 P0', positive=True)
psi = -2*P*sp.log(sp.tan(b/2))                 # sphere, claim (ii)
# planar spiral of the same chord shape: theta = -P ln(r^2) + c, r = planar circumcentre distance to z_c = planar circumradius
th_sameChords = -P*sp.log(sp.sin(b)**2)        # match: planar circumradius = Euclidean circumradius sin(beta) (same chord triangle)
th_sameChordToP = -P*sp.log(4*sp.sin(b/2)**2)  # match: planar r = chord |n_c - p| = 2 sin(beta/2) (same time law)
for name, th in [("same chord triangle", th_sameChords), ("same chord n_c-p", th_sameChordToP)]:
    d = sp.simplify(psi - th)
    extra = sp.simplify(sp.limit(d, b, 0) - d.subs(b, b0))
    print(name, ":", sp.simplify(sp.expand_log(extra, force=True)), " check vs 2P ln(2/(1+cos b0)):",
          sp.N((extra - 2*P*sp.log(2/(1+sp.cos(b0)))).subs({P: 1.3, b0: 0.9})),
          " vs P ln(2/(1+cos b0)):", sp.N((extra - P*sp.log(2/(1+sp.cos(b0)))).subs({P: 1.3, b0: 0.9})))
