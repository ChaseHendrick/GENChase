import sympy as sp
x1,y1,x2,y2,x3,y3=sp.symbols('x1 y1 x2 y2 x3 y3',real=True)
P=[(x1,y1),(x2,y2),(x3,y3)]
s=[x**2+y**2 for x,y in P]
def d2(i,j): return (P[i][0]-P[j][0])**2+(P[i][1]-P[j][1])**2
dl=lambda i,j:(s[i]-s[j])/d2(i,j)
a,b,c=dl(0,1),dl(0,2),dl(1,2)
Y=a*(s[0]-s[1])+b*(s[0]-s[2])+c*(s[1]-s[2])+(a-b+c)*(s[2]*a-s[1]*b+s[0]*c)
num=sp.factor(sp.together(Y))
print(num)
