import numpy as np
from indep_check import planar_setup, planar_vel, circumcenter
# planar circumdisk area rate: d(pi rc^2)/dt = 2 pi Re(kappa) rc0^2 ; sphere cap rate claimed 2 pi |ahat| = 2 pi |d cos(beta)/dt|
for mu, phi, slope in [(0.5,1.0,0.011074718490),(1.0,2.2,0.028962052702),(0.2,-0.7,0.008350990773),(0.8,2.9,0.152998587735)]:
    G, Z = planar_setup(mu, phi); S=G.sum(); zc=(G*Z).sum()/S
    k = (planar_vel(Z,G)/(Z-zc))[0]; O = circumcenter(Z); rc = abs(Z[0]-O)
    print(mu, phi, abs(k.real)*rc**2, slope, abs(k.real)*rc**2/slope, "zc on circumcircle:", abs(abs(zc-O)-rc))
