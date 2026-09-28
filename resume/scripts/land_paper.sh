#!/usr/bin/env bash
# land_paper.sh <paper-id> <source-commit> <fork-base>: apply a paper's final state onto a fresh branch from origin/main.
set -u -o pipefail
ID=$1; SRC=$2; FB=$3; S=/tmp/claude-0/-home-user-GENChase/ac7d9e0e-5b9b-52ee-8f9a-025178f1bd06/scratchpad
cd /home/user/GENChase || exit 2
[ -z "$(git status --porcelain)" ] || { echo "DIRTY CHECKOUT"; exit 2; }
git fetch -q origin main && git checkout -q -B claude/optimistic-feynman-agrpck origin/main || exit 2
git checkout $SRC -- papers/$ID
for f in $(git diff --name-status origin/main $SRC -- papers/$ID | awk '$1=="D"{print $2}'); do git rm -q "$f"; done
for f in $(git diff --name-only $FB $SRC | grep -v "^papers/$ID/\|^papers/papers.json$"); do
  git show $FB:$f > $S/.base 2>/dev/null || : > $S/.base; git show $SRC:$f > $S/.theirs
  git merge-file -L main -L base -L paper "$f" $S/.base $S/.theirs
  python3 - "$f" <<'PY'
import sys
p=sys.argv[1]; L=open(p).read().split('\n'); out=[]; i=0
while i<len(L):
    if L[i].startswith('<<<<<<< '):
        m=L.index('=======',i); e=next(j for j in range(m,len(L)) if L[j].startswith('>>>>>>> '))
        a,b=L[i+1:m],L[m+1:e]; out+=a+([''] if a and a[-1].strip() else [])+b; i=e+1
    else: out.append(L[i]); i+=1
open(p,'w').write('\n'.join(out))
PY
done
python3 - $ID $SRC <<'PY'
import json, subprocess, sys
pid, src = sys.argv[1], sys.argv[2]
main=open('papers/papers.json').read(); other=subprocess.check_output(['git','show',src+':papers/papers.json']).decode()
def entry(txt):
    i=txt.index('"id": "%s"'%pid); s=txt.rfind('    {',0,i); d=0; j=s
    while True:
        c=txt[j]; d+= (c=='{') - (c=='}')
        if c=='}' and d==0: return s,j+1
        j+=1
es,ee=entry(other); new=other[es:ee]
if '"id": "%s"'%pid in main:
    ms,me=entry(main); main=main[:ms]+new+main[me:]
else:
    k=main.rindex('    }\n  ]'); main=main[:k+5]+',\n'+new+main[k+5:]
json.loads(main); open('papers/papers.json','w').write(main)
PY
grep -l '^<<<<<<<' $(git diff --name-only) 2>/dev/null && { echo "MARKERS LEFT"; exit 3; }
timeout 300 node tools/build.js >/dev/null && timeout 300 node tools/index.js >/dev/null && timeout 300 node tools/science.js --write >/dev/null || { echo "REGEN FAILED"; exit 4; }
timeout 300 node tools/lint.js | tail -1; timeout 300 node tools/paper-check.js 2>&1 | grep -A1 "$ID" | head -2
timeout 300 node tools/paper-sync.js --check $ID | tail -1; timeout 300 python3 tools/release-assets.py --check | tail -1 | cut -c1-80
timeout 600 npm test > $S/npmtest.log 2>&1; echo "npm test exit $?"
git add -A && git status --short | wc -l
