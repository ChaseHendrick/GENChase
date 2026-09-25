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
# Direct edits are kept. The branch genchase-sync holds exactly what this repository published, one
# commit per change, and each run merges it into the companion's default branch. Edits the owner makes
# there directly survive every run; if an edit and an update touch the same lines, the run stops,
# pushes nothing, and names the files. tools/paper-pull.sh brings direct edits back into papers/<id>/.
#
# The lock, renewed on every run, keeps everyone but the owner out: issues, wiki, projects and
# discussions off; GitHub's interaction limit at collaborators only for six months; rulesets that
# forbid deleting or force-pushing the default branch and deleting or moving tags. The owner can still
# commit to the default branch, on the web or with git.
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

SYNC=genchase-sync
# The project identity for every commit and merge here, whatever the environment or git config says.
GIT_AUTHOR_NAME=Chaos GIT_COMMITTER_NAME=Chaos
GIT_AUTHOR_EMAIL=326338179+SharpMeow@users.noreply.github.com GIT_COMMITTER_EMAIL=326338179+SharpMeow@users.noreply.github.com
export GIT_AUTHOR_NAME GIT_COMMITTER_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_EMAIL
while read -r id repo; do
  work=$(mktemp -d)
  node "$ROOT/tools/paper-sync.js" --stage "$id" "$work/stage"
  git clone -q --no-single-branch "$REMOTE/$repo.git" "$work/repo" 2>/dev/null ||
    { echo "::error::Cannot reach $repo. Create it on GitHub as an empty public repository, and give the token access to it."; exit 1; }
  cd "$work/repo"
  if git rev-parse -q --verify HEAD >/dev/null; then branch=$(git symbolic-ref --short HEAD); else branch=main; fi
  had_sync=$(git rev-parse -q --verify "refs/remotes/origin/$SYNC" || echo none)
  had_main=$(git rev-parse -q --verify "refs/remotes/origin/$branch" || echo none)

  # 1. genchase-sync: exactly what this repository publishes now.
  if [ "$had_sync" != none ]; then git checkout -q -B "$SYNC" "origin/$SYNC"; else git checkout -q --orphan "$SYNC"; fi
  find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  cp -R "$work/stage/." .
  git add -A
  if [ "$had_sync" = none ] || ! git diff --cached --quiet; then
    git commit -q -m "Update the paper, its programs and their output from GENChase"
  fi

  # 2. Merge it into the default branch, keeping any edits made there directly.
  if [ "$had_main" != none ]; then
    git checkout -q -B "$branch" "origin/$branch"
    if ! git merge -q --no-edit --allow-unrelated-histories -m "Merge the update from GENChase" "$SYNC" >"$work/merge.log" 2>&1; then
      conflicts=$(git diff --name-only --diff-filter=U | tr '\n' ' ')
      git merge --abort 2>/dev/null || true
      echo "::error::$repo was edited directly in the same place as this update (${conflicts:-see the log below}). Nothing was pushed. Run sh tools/paper-pull.sh $id, keep the version you want in papers/$id, merge that, and the next run publishes it."
      cat "$work/merge.log"
      exit 1
    fi
  else
    git checkout -q -B "$branch" "$SYNC"
  fi

  if [ "$(git rev-parse "$branch")" = "$had_main" ] && [ "$(git rev-parse "$SYNC")" = "$had_sync" ]; then
    echo "$repo is already up to date."
  else
    git push -q origin "$branch"
    git push -q origin "$SYNC"
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
