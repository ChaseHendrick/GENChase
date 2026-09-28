#!/usr/bin/env bash
# Finish a merge whose hand conflicts are resolved and staged: run lines 18 onward of uptodate.sh.
set -u -o pipefail
BR=$1
S=/tmp/claude-0/-home-user-GENChase/ac7d9e0e-5b9b-52ee-8f9a-025178f1bd06/scratchpad
sed -n '1,4p;6,7p' $S/uptodate.sh > $S/.tail.sh
echo "BR=$BR" >> $S/.tail.sh
sed -n '18,$p' $S/uptodate.sh >> $S/.tail.sh
bash $S/.tail.sh
