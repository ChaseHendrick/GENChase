import sympy as sp
s1,s2,s3=sp.symbols('s1 s2 s3',positive=True)
a,b,c=sp.symbols('a b c')   # a=D12, b=D13, c=D23
D=sp.Matrix([[0,a,b],[-a,0,c],[-b,-c,0]])
M=sp.eye(3)-D
num=sp.expand((sp.Matrix([[s1,s2,s3]])*M.adjugate()*sp.Matrix([1,1,1]))[0])
print('det',sp.expand(M.det()))
print('num',sp.collect(num,[s1,s2,s3]))
