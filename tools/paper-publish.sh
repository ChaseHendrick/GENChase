#!/bin/sh
# Publishes each paper that papers/papers.json marks "ready" or later to its companion repository, then
# locks that repository so only its owner can change it. .github/workflows/papers.yml runs this.
#
# GH_TOKEN   a fine-grained token with Contents and Administration read and write on the companion
#            repositories (docs/PUBLISHING-PAPERS.md, section 1). Without it nothing happens.
# PAPER      publish only this paper id (optional).
# RELEASE    also publish a release with this tag in PAPER's companion, the version written without a
#            leading v (1.0.0 and so on; owner's decision, 2026-09-26); Zenodo archives it and gives it a
#            DOI, if Zenodo is switched on for that repository. Its notes are the section "## <version>"
#            of papers/<id>/RELEASES.md, and a tag without one is refused before anything is published.
#            For a release that already exists, the run brings its notes up to date; the tag and its
#            files are never replaced. A release made before 2026-09-26 keeps its tag with the v:
#            RELEASE=v2.1.0 updates its notes from "## 2.1.0". A new tag with a leading v is refused, and
#            so is a plain tag whose version the companion already has under its v tag.
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
if [ -n "${RELEASE:-}" ]; then
  echo "$RELEASE" | grep -Eqx 'v?[0-9]+\.[0-9]+\.[0-9]+' || { echo "::error::The release tag must look like 1.0.0."; exit 1; }
  [ -n "${PAPER:-}" ] || { echo "::error::A release needs the paper id too."; exit 1; }
fi

# The section of papers/<id>/RELEASES.md headed "## <version>", the version without a leading v (the
# heading may carry a date after it).
notes_for() {
  awk -v want="${2#v}" '/^## / { if (found) exit; if ($2 == want) { found = 1; next } } found' "$ROOT/papers/$1/RELEASES.md" 2>/dev/null || true
}
if [ -n "${RELEASE:-}" ] && [ -z "$(notes_for "$PAPER" "$RELEASE" | tr -d '[:space:]')" ]; then
  echo "::error::papers/$PAPER/RELEASES.md has no notes under '## ${RELEASE#v}'. Write what the release contains there, merge, and run again."
  exit 1
fi
list=$(node "$ROOT/tools/paper-sync.js" --list ${PAPER:+--paper "$PAPER"})
[ -n "$list" ] || { echo "No paper is marked ready in papers/papers.json, so there is nothing to publish."; exit 0; }
[ "$REMOTE" != https://github.com ] || gh auth setup-git

# Versions are written without a leading v since 2026-09-26 (owner's decision), and the releases made
# before then keep their v tags. A tag with the v is taken only when the companion has it, to update that
# release's notes; a plain tag is refused when the companion has the same version under its v tag, so
# no version is released twice. Tags are never renamed.
if [ -n "${RELEASE:-}" ]; then
  repo=$(echo "$list" | awk -v id="$PAPER" '$1 == id { print $2 }')
  tags=$(GIT_TERMINAL_PROMPT=0 git ls-remote --tags "$REMOTE/$repo.git" 2>/dev/null | sed 's|.*refs/tags/||' || true)
  case $RELEASE in
    v*) echo "$tags" | grep -qxF "$RELEASE" ||
          { echo "::error::Write a new release without a leading v: ${RELEASE#v}, not $RELEASE. Only a release made before 2026-09-26 keeps its v tag."; exit 1; } ;;
    *) if echo "$tags" | grep -qxF "v$RELEASE"; then
          echo "::error::$repo already has $RELEASE as v$RELEASE. Run with RELEASE=v$RELEASE to update its notes; a tag is never renamed."; exit 1
        fi ;;
  esac
fi

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
GIT_AUTHOR_NAME="Chase Hendrick" GIT_COMMITTER_NAME="Chase Hendrick"
GIT_AUTHOR_EMAIL=326338179+ChaseHendrick@users.noreply.github.com GIT_COMMITTER_EMAIL=326338179+ChaseHendrick@users.noreply.github.com
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
      notes_for "$id" "$RELEASE" > "$work/notes.md"
      if gh release view "$RELEASE" -R "$repo" >/dev/null 2>&1; then
        if [ "$(gh release view "$RELEASE" -R "$repo" --json body --jq .body)" = "$(cat "$work/notes.md")" ]; then
          echo "$repo already has the release $RELEASE with these notes; the tag and its files are never replaced."
        else
          gh release edit "$RELEASE" -R "$repo" --notes-file "$work/notes.md"
          echo "Updated the notes of $RELEASE in $repo from papers/$id/RELEASES.md; the tag and its files are unchanged. Zenodo keeps the description it archived."
        fi
      else
        gh release create "$RELEASE" -R "$repo" --target "$branch" --title "$RELEASE" --notes-file "$work/notes.md"
        echo "Released $RELEASE of $repo. If Zenodo is switched on for it, the DOI appears on Zenodo within minutes."
      fi
    fi
  fi
  cd "$ROOT"; rm -rf "$work"
done <<EOF
$list
EOF
