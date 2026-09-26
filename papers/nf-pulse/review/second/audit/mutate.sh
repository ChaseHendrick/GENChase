#!/bin/sh
# Mutation driver: for each mutation, copy papers/nf-pulse to /tmp/claude-0/nfmut/<name>/, apply the
# edit, run the copy's run_all.sh and record which checks fail.  Never touches the repository copy.
# usage: sh mutate.sh [name ...]      (default: every mutation in mutations.py)
HERE=$(cd "$(dirname "$0")" && pwd)
SRC=$(cd "$HERE/../.." && pwd)
OUT=/tmp/claude-0/nfmut
mkdir -p $OUT
names="$*"
[ -z "$names" ] && names=$(python3 "$HERE/mutations.py" list)
for m in $names; do
  d=$OUT/$m
  rm -rf "$d"; cp -r "$SRC" "$d"; rm -rf "$d/data/logs" "$d/review"
  python3 "$HERE/mutations.py" apply "$m" "$d" || { echo "$m APPLY-ERROR"; continue; }
  sh "$d/code/run_all.sh" > "$d/run_all.out" 2>&1
  nf=$(grep -c '^FAIL' "$d/run_all.out")
  fl=$(grep '^FAIL' "$d/run_all.out" | cut -c7-60 | tr '\n' ';')
  echo "$m	fails=$nf	$fl"
done
