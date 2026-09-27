# Work in progress

Two numerical studies of the space-clamped and the propagated Hodgkin-Huxley equations at the 1952 constants,
continued after the paper of this folder. They are **not part of the paper**: nothing in `paper/hh-dynamics.tex` rests
on them, their programs are not certificates of any result of the paper, and their reports label every statement
numerical, planned or proved as it stands.

- [`chaos/`](chaos/REPORT.md): Guckenheimer and Oliva's chaotic orbits near J = 7.86 relocated numerically, with a
  horseshoe candidate and a plan for a computer-assisted proof. Numerical evidence, not a proof.
- [`traveling-wave/`](traveling-wave/REPORT.md): the propagated action potential at Hodgkin and Huxley's own constants;
  the first rigorous stage of a shooting argument and the design of the closing step. Work in progress.

The programs and data in `work/` are licensed under the Apache License 2.0, like those in `code/` and `data/`.
