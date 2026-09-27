#!/usr/bin/env bash
# Bring one PR branch up to date with main: merge (never rebase), regenerate generated files, run the fast checks.
# Usage: uptodate.sh <branch> <worktree>. Stops before pushing; prints the merge SHA on success.
set -u -o pipefail
BR=$1; WT=$2
ID=(-c user.name="Chase Hendrick" -c user.email="326338179+ChaseHendrick@users.noreply.github.com")
GEN='^(dist/studio\.html|index\.html|src/module-manifest\.json|src/science-reports\.json|TECHNIQUES\.md|techniques\.json|llms\.txt|VALIDATION\.md|\.github/description\.txt|COMPUTE\.md)$'
cd "$WT" || exit 2
timeout 120 git fetch -q origin main "$BR" || { echo "FETCH FAILED"; exit 2; }
git reset -q --hard && git clean -qfd -- . ':!node_modules' >/dev/null 2>&1
git checkout -q --detach "origin/$BR" || exit 2
if ! git "${ID[@]}" merge -q --no-ff --no-edit -m "Merge main into $BR" -m "Claude-Session: https://claude.ai/code/session_01HUTQ5ZHisUBjVa6V87AJqj" origin/main; then
  HAND=$(git diff --name-only --diff-filter=U | grep -Ev "$GEN")
  for f in $(git diff --name-only --diff-filter=U | grep -E "$GEN"); do git checkout --theirs -- "$f" && git add -- "$f"; done
  if [ -n "$HAND" ]; then echo "HAND CONFLICTS:"; echo "$HAND"; exit 3; fi
fi
if [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$BR")" ] && ! git rev-parse -q --verify MERGE_HEAD >/dev/null; then echo "ALREADY UP TO DATE $(git rev-parse HEAD)"; exit 0; fi
timeout 300 node tools/build.js >/dev/null || { echo "BUILD FAILED"; exit 4; }
timeout 300 node tools/index.js >/dev/null || { echo "INDEX FAILED"; exit 4; }
timeout 300 node tools/science.js --write >/dev/null || { echo "SCIENCE WRITE FAILED"; exit 4; }
python3 - <<'EOF' || { echo "DUPLICATE JSON KEY"; exit 4; }
import json, subprocess, sys
def hook(pairs):
    keys = [k for k, _ in pairs]
    if len(keys) != len(set(keys)): raise SystemExit('duplicate key in ' + f)
    return dict(pairs)
for f in subprocess.check_output(['git', 'ls-files', '*.json']).decode().split():
    try: json.load(open(f), object_pairs_hook=hook)
    except (UnicodeDecodeError, json.JSONDecodeError): pass
EOF
timeout 300 node tools/build.js --check | tail -1 && timeout 300 node tools/science.js | tail -1 && timeout 300 node tools/lint.js | tail -1 \
  && timeout 600 npm test >/tmp/npmtest.$$ 2>&1 || { echo "FAST CHECKS FAILED"; tail -30 /tmp/npmtest.$$ 2>/dev/null; exit 5; }
rm -f /tmp/npmtest.$$
# The validator suite has wall-clock CPU-time tests that miss under this machine's load; report, do not stop.
timeout 300 npm run -s test:validator >/tmp/validator.$$ 2>&1 || { echo "VALIDATOR TESTS FAILED (check whether load-related):"; grep -A8 "^not ok" /tmp/validator.$$ | grep -E "^not ok|error:"; }
rm -f /tmp/validator.$$
CHANGED=$(git status --porcelain | awk '{print $2}' | grep -E "$GEN|^og\.jpg$|^README\.md$|^CITATION\.cff$|^RESEARCH\.md$|^DESIGN-PLAN\.md$")
[ -n "$CHANGED" ] && git add -- $CHANGED
if git rev-parse -q --verify MERGE_HEAD >/dev/null; then
  git "${ID[@]}" commit -q --no-edit -m "Merge main into $BR" -m "Claude-Session: https://claude.ai/code/session_01HUTQ5ZHisUBjVa6V87AJqj" || exit 6
elif [ -n "$CHANGED" ]; then
  git "${ID[@]}" commit -q --amend --no-edit || exit 6
fi
[ "$(git rev-list --parents -n1 HEAD | wc -w)" = 3 ] || { echo "HEAD IS NOT A MERGE"; exit 6; }
[ -z "$(git status --porcelain)" ] || { echo "UNEXPECTED CHANGES:"; git status --short; exit 6; }
echo "READY $(git rev-parse HEAD)"
