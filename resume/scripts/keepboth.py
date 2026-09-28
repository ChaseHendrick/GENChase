# Resolve every conflict block by keeping main's side, then the branch's side.
import sys
for p in sys.argv[1:]:
    L=open(p).read().split('\n'); out=[]; i=0
    while i<len(L):
        if L[i].startswith('<<<<<<< '):
            m=L.index('=======',i); e=next(j for j in range(m,len(L)) if L[j].startswith('>>>>>>> '))
            theirs, ours = L[m+1:e], L[i+1:m]
            sep = [''] if p.endswith('.md') and theirs and ours and theirs[-1].strip() and ours[0].strip() else []
            out+=theirs+sep+ours; i=e+1
        else: out.append(L[i]); i+=1
    open(p,'w').write('\n'.join(out))
