import json
from mpmath import mp, mpf, findpoly
mp.dps = 250
P = mpf(json.load(open('kkt_mp_260.json'))['P'])
for name, val in [('P', P), ('P^2', P**2)]:
    for n in range(2, 17):
        r = findpoly(val, n, maxcoeff=10**7)
        if r:
            print(name, 'degree', n, 'relation', r); break
    else:
        print(name, ': no integer polynomial of degree <= 16 with |coeff| <= 1e7 (findpoly at', mp.dps, 'digits)')
