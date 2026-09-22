"""Decimal finite-orbit references for the circle map's sensitive non-monotone rows."""
from decimal import Decimal, localcontext
import json
PI = '3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679'
def evaluate(x, y, precision):
    with localcontext() as context:
        context.prec = precision
        tau = 2 * Decimal(PI)
        # Match the binary64 inputs of the browser, then evaluate at higher precision.
        omega, coupling = Decimal.from_float(x / 127), Decimal.from_float(2.1 * y / 127)
        phase = Decimal.from_float(.17)
        def sine(argument):
            argument %= tau
            if argument > tau / 2: argument -= tau
            term = total = argument
            for n in range(1, 200):
                term *= -argument * argument / Decimal((2*n)*(2*n+1))
                previous = total
                total += term
                if total == previous: return total
            raise RuntimeError('Taylor series failed to converge')
        for _ in range(20): phase += omega - coupling / tau * sine(tau*phase)
        initial = phase
        for _ in range(30): phase += omega - coupling / tau * sine(tau*phase)
        return str((phase-initial)/30)
rows = []
for x, y in [(84,125),(43,125),(67,127),(60,127)]:
    values = [evaluate(x,y,p) for p in (40,60,80)]
    assert abs(Decimal(values[1])-Decimal(values[2])) < Decimal('1e-45')
    rows.append({'x':x,'y':y,'grid':128,'iterations':30,'burnIn':20,'precisions':[40,60,80],'rotation':values})
print(json.dumps({'reference':'Decimal Taylor sine and lifted phase, binary64 input values, 40/60/80 decimal digits','rows':rows}))
