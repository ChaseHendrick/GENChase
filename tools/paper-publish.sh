#!/bin/sh
# Publishes each paper that papers/papers.json marks "ready" or later to its companion repository, then
# locks that repository so only its owner can change it. .github/workflows/papers.yml runs this.
#
# GH_TOKEN   a fine-grained token with Contents and Administration read and write on the companion
#            repositories (docs/PUBLISHING-PAPERS.md, section 1). Without it nothing happens.
# PAPER      publish only this paper id (optional).
# RELEASE    also publish a release with this tag (v1.0.0 and so on) in PAPER's companion; Zenodo
#            archives it and gives it a DOI, if Zenodo is switched on for that repository.
#
# The lock, renewed on every run: issues, wiki, projects and discussions off; GitHub's interaction
# limit at collaborators only for six months; rulesets that forbid deleting or rewriting the default
# branch and deleting or moving tags. Every run overwrites the companion with this repository's copy.
set -eu
ROOT=$(cd "$(dirname "$0")/.." && pwd)
REMOTE=${PAPERS_REMOTE:-https://github.com}
if [ -z "${GH_TOKEN:-}" ]; then
  echo "::notice::The PAPERS_TOKEN secret is not set, so no paper is published (docs/PUBLISHING-PAPERS.md, section 1)."
  exit 0
fi
case "${RELEASE:-}" in
  '') ;;
  v[0-9]*.[0-9]*.[0-9]*) [ -n "${PAPER:-}" ] || { echo "::error::A release needs the paper id too."; exit 1; } ;;
  *) echo "::error::The release tag must look like v1.0.0."; exit 1 ;;
esac
list=$(node "$ROOT/tools/paper-sync.js" --list ${PAPER:+--paper "$PAPER"})
[ -n "$list" ] || { echo "No paper is marked ready in papers/papers.json, so there is nothing to publish."; exit 0; }
[ "$REMOTE" != https://github.com ] || gh auth setup-git

warn() { echo "::warning::$1"; }

lock() {
  repo=$1
  [ "$(gh api "repos/$repo" --jq .visibility)" = public ] || warn "$repo is not public, so readers and Zenodo cannot reach it."
  gh api -X PATCH "repos/$repo" -F has_issues=false -F has_wiki=false -F has_projects=false -F has_discussions=false >/dev/null ||
    warn "Could not switch off issues, wiki, projects and discussions on $repo; the token needs Administration: read and write."
  gh api -X PUT "repos/$repo/interaction-limits" -f limit=collaborators_only -f expiry=six_months >/dev/null ||
    warn "Could not limit interactions on $repo to collaborators."
  names=$(gh api "repos/$repo/rulesets" --jq '.[].name' 2>/dev/null || true)
  echo "$names" | grep -qx 'Protect the record' || gh api -X POST "repos/$repo/rulesets" --input - >/dev/null <<'JSON' || warn "Could not protect the default branch of $repo."
{"name": "Protect the record", "target": "branch", "enforcement": "active",
 "conditions": {"ref_name": {"include": ["~DEFAULT_BRANCH"], "exclude": []}},
 "rules": [{"type": "deletion"}, {"type": "non_fast_forward"}]}
JSON
  echo "$names" | grep -qx 'Protect the releases' || gh api -X POST "repos/$repo/rulesets" --input - >/dev/null <<'JSON' || warn "Could not protect the tags of $repo."
{"name": "Protect the releases", "target": "tag", "enforcement": "active",
 "conditions": {"ref_name": {"include": ["~ALL"], "exclude": []}},
 "rules": [{"type": "deletion"}, {"type": "update"}, {"type": "non_fast_forward"}]}
JSON
}

while read -r id repo; do
  work=$(mktemp -d)
  node "$ROOT/tools/paper-sync.js" --stage "$id" "$work/stage"
  git clone -q "$REMOTE/$repo.git" "$work/repo" 2>/dev/null ||
    { echo "::error::Cannot reach $repo. Create it on GitHub as an empty public repository, and give the token access to it."; exit 1; }
  cd "$work/repo"
  branch=$(git symbolic-ref --short -q HEAD || echo main)
  git rev-parse -q --verify HEAD >/dev/null || git checkout -q -b "$branch"
  find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  cp -R "$work/stage/." .
  git add -A
  if git diff --cached --quiet; then
    echo "$repo is already up to date."
  else
    git -c user.name=Chaos -c user.email=326338179+SharpMeow@users.noreply.github.com commit -q -m "Update the paper, its programs and their output"
    git push -q origin "HEAD:$branch"
    echo "Published $id to $repo."
  fi
  if [ "$REMOTE" = https://github.com ]; then
    lock "$repo"
    if [ -n "${RELEASE:-}" ] && [ "$id" = "${PAPER:-}" ]; then
      if gh release view "$RELEASE" -R "$repo" >/dev/null 2>&1; then
        echo "$repo already has the release $RELEASE; releases are never replaced."
      else
        gh release create "$RELEASE" -R "$repo" --target "$branch" --title "$RELEASE" \
          --notes "The paper, its verification programs and their output as of this release."
        echo "Released $RELEASE of $repo. If Zenodo is switched on for it, the DOI appears on Zenodo within minutes."
      fi
    fi
  fi
  cd "$ROOT"; rm -rf "$work"
done <<EOF
$list
EOF
