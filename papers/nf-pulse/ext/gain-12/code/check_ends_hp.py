import sys
from flint import arb, ctx, fmpq
ctx.prec = int(sys.argv[1])
import shoot_first_return as sf, bracket as b
for n in (b.C1_NUM, b.C2_NUM):
    r, t, x = sf._shoot(arb(fmpq(n, b.C_DEN)), 300)
    print(n, 'first return', r, 'at xi', t.str(5), flush=True)
