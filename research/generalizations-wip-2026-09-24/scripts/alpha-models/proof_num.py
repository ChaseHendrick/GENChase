# High-precision numerical check of each link of the chain on a dense grid of the ordered domain.
import mpmath as mp
mp.mp.dps = 40
def links(rho, m, beta):
    X = rho**(2*beta); Y = (1+rho*m)**beta
    S = (1+rho*m)*(1+X)/(1-X) + rho**2*(Y+1)/(Y-1) - (Y+X)/(Y-X)
    b = beta/2*mp.log(1+rho*m)
    red = rho*m + rho**2*mp.coth(b)
    red2 = rho*m + rho**2/b
    Lam = beta*m + 2/m + rho - rho**2*m/6
    alg = rho/beta*Lam
    sinpsi = mp.sqrt(1 - (rho-m)**2/4)
    P = S/(4*rho*sinpsi)
    B = mp.sqrt(1+2*beta)/(2*beta)
    return S, red, red2, alg, Lam**2 - (1+2*beta)*(4-(m-rho)**2), P, B
worst = {}
for beta in [mp.mpf(1), mp.mpf('1.25'), mp.mpf('1.5'), mp.mpf('1.75'), mp.mpf(2), mp.mpf(3), mp.mpf(10), mp.mpf('0.6')]:
    mins = [mp.inf]*5
    for i in range(1, 121):
        rho = mp.mpf(i)/121 if i > 20 else mp.mpf(10)**(-(21-i)/3)
        for j in range(1, 241):
            m = (2 + rho)*mp.mpf(j)/241
            S, red, red2, alg, Phi, P, B = links(rho, m, beta)
            mins[0] = min(mins[0], (S - red)/rho**2)
            mins[1] = min(mins[1], (red - red2)/rho**2)
            mins[2] = min(mins[2], (red2 - alg)/rho**2)
            mins[3] = min(mins[3], Phi)
            mins[4] = min(mins[4], (P - B))
    print('beta', beta, ' min (S-red)/rho^2 =', mp.nstr(mins[0],5), ' min (red-red2)/rho^2 =', mp.nstr(mins[1],5), ' min (red2-alg)/rho^2 =', mp.nstr(mins[2],5), ' min Phi =', mp.nstr(mins[3],5), ' min P-B =', mp.nstr(mins[4],5))
