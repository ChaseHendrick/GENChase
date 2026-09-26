#!/bin/sh
# N = 6 search in slices: nworkers = NW slices of the 16384 initial pieces,
# P at a time, each capped at CAP seconds.  A slice that hits the cap is
# listed in ../data/run6sym/timeouts-NW.txt; re-run it as 4 finer slices
# (s, s+NW, s+2NW, s+3NW with 4*NW workers), e.g.
#   NW=1024 SLICES="5 261 517 773" sh run6.sh
# classify.py accepts the mixture and checks that the slices cover the chart.
# Usage: NW=256 P=4 CAP=3300 sh run6.sh
NW=${NW:-256}; P=${P:-4}; CAP=${CAP:-3300}
D=../data/run6sym
mkdir -p $D
SL=${SLICES:-$(seq 0 $((NW - 1)))}
export NW CAP D
echo $SL | tr ' ' '\n' | xargs -P $P -I{} sh -c '
  s={}; f=$D/n$NW-w$s.txt
  if [ -f $f ] && grep -q "^STAT" $f; then exit 0; fi
  timeout $CAP ./bnb 6 16384 $s $NW 1e-11 --sym > $f 2> $D/n$NW-w$s.err
  grep -q "^STAT" $f || echo $s >> $D/timeouts-$NW.txt'
echo "done NW=$NW: $(ls $D/n$NW-w*.txt | wc -l) files, $(cat $D/timeouts-$NW.txt 2>/dev/null | wc -l) timeouts"
