import sympy as sp
e1,e2,e3,X,Xb=sp.symbols('e1 e2 e3 X Xb')
E=[e1,e2,e3]
# points on unit circle: conj(e)=1/e ; origin at X
def conj_e(e): return 1/e
s=[sp.expand((e-X)*(conj_e(e)-Xb)) for e in E]
def D(j,k):
    a=E[j]-E[k]; ab=conj_e(E[j])-conj_e(E[k])
    return sp.together((s[j]-s[k])/(a*ab))
a,b,c=D(0,1),D(0,2),D(1,2)
Y=a*(s[0]-s[1])+b*(s[0]-s[2])+c*(s[1]-s[2])+(a-b+c)*(s[2]*a-s[1]*b+s[0]*c)
Y=sp.factor(sp.together(Y))
print('Y=',Y)
print('a=',sp.factor(a))
