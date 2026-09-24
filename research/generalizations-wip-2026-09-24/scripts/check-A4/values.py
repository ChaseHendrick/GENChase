import mpmath as mp
mp.mp.dps = 40
for a in ['0','0.25','0.5','0.75','1','1.25','1.5','1.75','2']:
    a = mp.mpf(a); P = mp.sqrt(3+a)/(2+a)
    print('alpha', mp.nstr(a,3), 'Pmin', mp.nstr(P, 10), 'path ratio', mp.nstr(mp.sqrt(1+4*P**2), 10), '(4+a)/(2+a)=', mp.nstr((4+a)/(2+a),10),
          'angle deg', mp.nstr(mp.degrees(mp.atan(2*P)), 8), 'arccos form', mp.nstr(mp.degrees(mp.acos((2+a)/(4+a))), 8), '|w0|tc', mp.nstr(2*mp.sqrt(3+a)/(2+a)**2, 8))
print('beta threshold (3+sqrt105)/24 =', mp.nstr((3+mp.sqrt(105))/24, 15), ' alpha threshold =', mp.nstr(2*(3+mp.sqrt(105))/24-2, 15))
