#!/bin/sh
# Independent N = 6 recount with bnbA (A = 2) in NW slices, P at a time,
# each capped at CAP seconds; slices that hit the cap are listed in
# ../data/run6A2/timeouts-NW.txt.  Usage: NW=256 P=4 CAP=3300 sh run6A.sh
NW=${NW:-256}; P=${P:-4}; CAP=${CAP:-3300}
D=../data/run6A2
mkdir -p $D
SL=${SLICES:-$(seq 0 $((NW - 1)))}
export NW CAP D
echo $SL | tr ' ' '\n' | xargs -P $P -I{} sh -c '
  s={}; f=$D/n$NW-w$s.txt
  if [ -f $f ] && grep -q "^STAT" $f; then exit 0; fi
  timeout $CAP ./bnbA 6 2 4096 $s $NW 1e-11 --sym > $f 2> $D/n$NW-w$s.err
  grep -q "^STAT" $f || echo $s >> $D/timeouts-$NW.txt'
echo "done NW=$NW: $(ls $D/n$NW-w*.txt | wc -l) files, $(cat $D/timeouts-$NW.txt 2>/dev/null | wc -l) timeouts"
