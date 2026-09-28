# Mutation gate

`code/mutation_study.py` copies `code/`, replaces one exact source string, and runs the program that mutation belongs to. A mutation marked `weak` is not expected to be caught. Every other mutation must stop that program (`caught` at a failed check, or `exception`). The harness exits 0 only when the baselines pass and that is true; it exits 1 otherwise. It rewrites `data/mutation_study.txt`.

## What already runs

Nothing in CI. `.github/workflows/check.yml` never calls this study, and no workflow under `.github/workflows/` names `mutation_study` or the certificate programs. The committed record is `data/mutation_study.txt`: 17 mutations, Python 3.11.15, 2 workers, `run time 2236 s`. Baselines passed. The file records that all 16 mutations not marked weak stopped at a failed check, and that the one marked weak (B3) passed.

## What a CI gate would execute

The full study, baselines included (do not pass `--no-baseline`):

```
python3 papers/hh-dynamics/code/mutation_study.py
```

Require exit status 0. The committed run took 2236 s, so it does not fit the current check job.

## Cheapest must-fail mutation

The committed times are rounded to the nearest second. H1 and H3 are tied at 1 s; both belong to `certify_equilibria_hopf.py` and neither is marked weak. The command below is H1, and it was run on 2026-09-28 with `--no-baseline` (a trial; baselines skipped). The harness exited 0. The patched program stopped at:

```
FAIL  [selftest] Jss and dJss/du from the series agree with mpmath at u = 7.3
```

differences 0.0045, 0.0011, about 0 s. Copy `data/mutation_study.txt` aside first: this command overwrites it.

```
python3 papers/hh-dynamics/code/mutation_study.py --only H1 --no-baseline
```
