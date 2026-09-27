#!/bin/sh
# Regenerate the three h-set designs of Theorem 3 (numerical, floating point: horseshoe_design.cpp) into a temporary
# folder and compare them with the committed configurations, which are what run_all.sh checks. A difference (another
# platform or libm) is reported, never copied over: the committed files are the ones the proofs verify.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$HERE/..
BIN=${BIN:-$ROOT/_bin}; T=$(mktemp -d)
"$BIN/horseshoe_design" 0 0 -1.462373092479858 0.95568530469114732 -0.29439021450684943 0.95568530469114776 0.29439021450684805 -1.8870e-5 -1.8838e-5 9 3 1e-5 2.5e-7 3 1e-8 > "$T/horseshoe_E0.cfg" 2> /dev/null
"$BIN/horseshoe_design" 0.5 0 -1.627044959203058 0.97987939587321293 -0.19959050464174666 0.97987939587321216 0.19959050464175063 -1.0330e-5 -1.0312e-5 11 3 5.5e-6 2.6e-7 3 1e-8 > "$T/horseshoe_Ehalf.cfg" 2> /dev/null
"$BIN/horseshoe_design" -0.5 0 -1.244860970918396 0.81815364752606867 -0.57499966003449909 0.81815364752606801 0.57499966003449998 -1.4256e-5 -1.4240e-5 11 3 7.5e-6 4e-7 2.8 1e-8 2 > "$T/horseshoe_Eminushalf.cfg" 2> /dev/null
status=0
for c in E0 Ehalf Eminushalf; do
  if cmp -s "$T/horseshoe_$c.cfg" "$ROOT/configs/horseshoe_$c.cfg"; then echo "horseshoe_$c.cfg: reproduced byte for byte"
  else echo "horseshoe_$c.cfg: DIFFERS from the committed file (the new design is in $T)"; status=1; fi
done
exit $status
