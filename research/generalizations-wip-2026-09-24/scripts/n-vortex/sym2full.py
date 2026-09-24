import json, numpy as np, sys
def conv(entry):
    k=entry['k']; g=np.array(entry['g']); p=np.array([complex(a,c) for a,c in entry['p']])
    G=[1.0]; w=[0j]
    for l in range(k):
        e=np.exp(2j*np.pi*l/k)
        G+=g.tolist(); w+=(p*e).tolist()
    return dict(G=G, w=[[z.real,z.imag] for z in w], b=entry['b'])
if __name__=='__main__':
    d=json.load(open(sys.argv[1])); i=int(sys.argv[2])
    json.dump(conv(d[i]), open(sys.argv[3],'w'))
