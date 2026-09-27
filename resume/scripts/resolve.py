# Resolve conflict blocks: two single quoted-list lines -> union; otherwise main's side, then the branch's side.
import re, sys
for p in sys.argv[1:]:
    L=open(p).read().split('\n'); out=[]; i=0
    while i<len(L):
        if L[i].startswith('<<<<<<< '):
            m=L.index('=======',i); e=next(j for j in range(m,len(L)) if L[j].startswith('>>>>>>> '))
            ours, theirs = L[i+1:m], L[m+1:e]
            if len(ours)==1 and len(theirs)==1 and ours[0].lstrip().startswith("'") and theirs[0].lstrip().startswith("'"):
                qa=re.findall(r"'([^']+)'",theirs[0]); qb=re.findall(r"'([^']+)'",ours[0])
                ind=theirs[0][:len(theirs[0])-len(theirs[0].lstrip())]
                tail=',' if theirs[0].rstrip().endswith(',') else ''
                out.append(ind+", ".join("'"+x+"'" for x in qa+[x for x in qb if x not in qa])+tail)
            else:
                out+=theirs+([''] if p.endswith('.md') and theirs and ours and theirs[-1].strip() and ours[0].strip() else [])+ours
            i=e+1
        else: out.append(L[i]); i+=1
    open(p,'w').write('\n'.join(out))
