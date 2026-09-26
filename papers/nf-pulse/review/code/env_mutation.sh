#!/bin/sh
# Environment mutation (code review, 2026-09-26): run the unmodified chain in a scratch copy with
# NF_DU=0.15 (prove_pulse.py builds its block with |U| <= 0.15, where conditions (C) and (E) fail) and
# PYTHONOPTIMIZE=1 (Python drops `assert` statements, so prove_pulse.py:43 no longer stops the run).
# Observed on 2026-09-26: all 15 checks print OK, and final_interval.log shows cone_pd False, entrance_ok False.
M=${MUT_DIR:-/tmp/claude-0/-home-user-GENChase/6b4e32ba-2c25-5f83-9afb-b1a263f75129/scratchpad/mut}
SRC=$(cd "$(dirname "$0")/../.." && pwd)
rm -rf $M/ENV_O_DU && mkdir -p $M/ENV_O_DU/nf-pulse
cp -r $SRC/code $SRC/data $M/ENV_O_DU/nf-pulse/ && rm -rf $M/ENV_O_DU/nf-pulse/data/logs $M/ENV_O_DU/nf-pulse/code/__pycache__
cd $M/ENV_O_DU/nf-pulse && NF_DU=0.15 PYTHONOPTIMIZE=1 sh code/run_all.sh
grep -h "interval block" data/logs/final_interval.log | cut -c1-300
