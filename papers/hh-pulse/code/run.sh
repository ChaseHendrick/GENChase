#!/bin/sh
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Reruns every computation of the paper from scratch, one process at a time, each under nice -n 19 and a time limit.
# Usage (from any folder):  sh code/run.sh [tests | 18.5 | 6.3 | zero | all]     (default: all)
#   tests  test_temperature.py (phi from the decimal temperature) and test_lohner6.py (jets and integrator), each with
#          a negative control (3 min)
#   18.5   Theorem 1: 18.5 C, printed leak potential E_l = 10.613 mV (about 1 hour)
#   6.3    Theorem 2: 6.3 C, printed leak potential (about 3 hours)
#   zero   Remark 1: 18.5 C, the zero-current leak potential (about 1 hour)
# Each proof removes its old checkpoints, resumable states and closing block first, recomputes the numerical centre
# K*, the block, the configuration and every stage, and ends with the summary, whose exit status is 0 if and only if
# every check passed and every negative control failed. Logs go to data/logs/ (not part of the record).
# The starting profiles data/pulse_<T>.npz were made by pulse_bvp.py (numerical; only an initial guess for hp_pulse.py)
# and are inputs here.
set -u
cd "$(dirname "$0")"
LOG=../data/logs
mkdir -p "$LOG"
status=0

step() {   # step <log name> <seconds> <command...>: run bounded, report the exit status and the last line
    name=$1; lim=$2; shift 2
    t0=$(date +%s)
    nice -n 19 timeout "$lim" "$@" > "$LOG/$name.out" 2>&1
    st=$?
    printf '%-28s exit %s  %5ss  %s\n' "$name" "$st" "$(( $(date +%s) - t0 ))" "$(tail -n 1 "$LOG/$name.out" | cut -c1-90)"
    return $st
}

centre() {   # centre <tag> <T> <t_end>: hp_pulse.py resumes after 12 iterations (exit 3), at most 4 times
    for i in 1 2 3 4; do
        step "hp_pulse_$1_$i" 10800 python3 hp_pulse.py "$2" "$3"; st=$?
        [ $st -ne 3 ] && return $st
    done
    return 3
}

proof() {   # proof <T> <t_end> <config arguments...>, with HH_EL exported or unset by the caller (in a subshell)
    T=$1; tend=$2; shift 2
    tag=$(python3 -c "import certify_rest_wave as C; print(C.tag(C.temperature('$T')))") || return 1
    rm -f ../data/ckpt/pulse_"$tag"_*.json ../data/logs/hp_pulse_"$tag"_state_*.json ../data/closing_block_"$tag".json
    centre "$tag" "$T" "$tend" || return 1
    if [ "$T" = "6.3" ]; then
        # at 6.3 C the error budget written for 18.5 C is too loose; a second run with it 1e-8 times smaller starts
        # from the converged state (manuscript, Section 5)
        step "hp_pulse_${tag}_tight" 10800 python3 hp_pulse.py "$T" "$tend" 1e-8 || return 1
    fi
    step "block0_$tag" 3600 python3 block0.py "$T" || return 1
    step "config_$tag" 600 python3 prove_pulse.py "$T" config "$@" || return 1
    step "setup_$tag" 3600 python3 prove_pulse.py "$T" setup || return 1
    for s in interval K1 K2 neg-shift neg-model; do
        step "${s}_$tag" 7200 python3 prove_pulse.py "$T" "$s"      # the summary judges each verdict
    done
    step "block_check_iv_$tag" 3600 python3 block_check_iv.py "$T" || return 1
    step "summary_$tag" 600 python3 prove_pulse.py "$T" summary
}

what=${1:-all}
if [ "$what" = tests ] || [ "$what" = all ]; then
    step test_temperature 600 python3 test_temperature.py || status=1
    step test_lohner6 1800 python3 test_lohner6.py || status=1
fi
if [ "$what" = 18.5 ] || [ "$what" = all ]; then
    (export HH_EL=10.613; proof 18.5 10.5 1.5e-45 1e-25 13.625 1e-16 1e-70) || status=1
fi
if [ "$what" = 6.3 ] || [ "$what" = all ]; then
    (export HH_EL=10.613; proof 6.3 23.0 1.4e-61 1e-32 36.125 1e-35 1e-70) || status=1
fi
if [ "$what" = zero ] || [ "$what" = all ]; then
    (unset HH_EL; proof 18.5 10.5 1.5e-45 1e-25 13.625 1e-16 1e-70) || status=1
fi
[ $status -eq 0 ] && echo "run.sh $what: ALL AS EXPECTED" || echo "run.sh $what: SOMETHING FAILED"
exit $status
