# Reviewing a validation record: a guide for outside experts

Thank you for considering a review. Every validation record in GENChase has so far been reviewed
inside the project, and the [validation contract](../validation/README.md) says a status should be
promoted only after a reviewer has run the test, inspected the reference and the failure control, and
checked that the stated limits match the results. This guide tells a domain expert what to read, what
to run, what to compare with the primary source, and how the sign-off is recorded.

**A review covers the recorded domain, not the whole tab.** Each record that carries a validated
status states a domain: exact recipes, parameters, boundary conditions, grids, times and precision.
Your sign-off applies to that domain and to the scope you write down, never to every setting the
controls allow. Five of the lattice and neuroscience tabs below are **unvalidated**: they have no
registered numerical evidence to reproduce, so a review of them checks the model and the numbers the
tab prints, and says what evidence would be needed; it does not validate them.

Finding a problem is as useful as a sign-off. Please report it the same way.

## Before you start

You need Node.js 22 and, for the browser tests, Playwright with Chromium.

```
git clone https://github.com/SharpMeow/GENChase.git && cd GENChase
git rev-parse HEAD                    # note the commit you reviewed
npm run setup:checks                  # installs Playwright and Chromium for the browser tests
node tools/build.js                   # assembles the studio from src/
node tools/science.js                 # checks the records' structure (not their science)
node tools/verify.js --list <id>      # shows the recorded tests for a technique, without running them
node tools/verify.js --print <id>     # runs the recorded numerical and print tests
```

What to read for every record:

- The record itself in [validation/techniques.json](../validation/techniques.json): `status`,
  `equation`, `reference`, `limitations`, `remaining`, each evidence entry's `benchmark`,
  `failureControl`, `command` and `results`, and for validated records `domain` and `reviewed`.
- The result files under `validation/results/` that the record names.
- The technique's source file (`source` in the record). The status line and science report in the
  studio (`python3 -m http.server 8080 --bind 127.0.0.1`, then open
  `http://127.0.0.1:8080/index.html#<id>`) show what the tab prints.

The browser tests use whatever renderer Chromium finds. Continuous integration uses a software
renderer, so please record your GPU or say that you used software rendering.

`node tools/check.js <id> 12000` and `node tools/export.js <id> 8 300` check that the plate renders,
is deterministic and prints; they are runtime checks, not numerical evidence.

## Phase field: `cahn`, `ohta`, `pfc`

Status: validated within stated limits (reviewed inside the project 2026-09-22). Source:
`src/modules/pde.js`.

- **Read:** [PDE-FIELD-REVIEW.md](../validation/PDE-FIELD-REVIEW.md) (the twelve-recipe domain, two
  recipes per module), [PDE-FAMILY.md](../validation/PDE-FAMILY.md),
  [CAHN-HILLIARD.md](../validation/CAHN-HILLIARD.md),
  [CAHN-STABILITY.md](../validation/CAHN-STABILITY.md), and the results
  `pde-field-review.json`, `pde-family-science.json`, `pde-spatial-review.json`,
  `cahn-mobility.json`, `cahn-time-refinement.json`, `cahn-stability.json`.
- **Run:** `node tools/verify.js --print cahn ohta pfc`. It runs `pde-science.js`,
  `pde-convergence.js`, `pde-stability.js`, `pde-family-science.js`, `pde-field-review.js`,
  `pde-spatial-review.js` and `pde-print-state.js`, each once.
- **Check against the sources** (J. W. Cahn and J. E. Hilliard, J. Chem. Phys. 28, 258 (1958);
  T. Ohta and K. Kawasaki, Macromolecules 19, 2621 (1986); K. R. Elder, M. Katakowski, M. Haataja
  and M. Grant, Phys. Rev. Lett. 88, 245701 (2002), and Elder and Grant, Phys. Rev. E 70, 051605
  (2004)):
  - the free energy, chemical potential and conserved dynamics in the displayed equation and in the
    shaders, including the degenerate mobility option M proportional to max(1 - c^2, 0);
  - the Ohta-Kawasaki long-range term, reduced to -sigma(u - m), and that m is the field's actual
    initial mean;
  - that the phase-field crystal is the Swift-Hohenberg free energy under conserved dynamics, with
    the same nine-point operator in every pass;
  - the explicit step bound from the discrete Laplacian's symbol, and that the stability test's
    failure controls (the restored old failures) do fail;
  - whether the independent Float64 references are independent in the sense that matters (they must
    not share code with the shaders), and whether the spatial review holds the physical domain fixed;
  - that the enumerated domain in the results matches the record's `domain`.
- **Known limits to confirm or dispute:** finite grids and float32; no continuum or phase-diagram
  claim; the additive noise option is not the conserved, fluctuation-dissipation noise of the
  papers.

## Lattice statistical mechanics: `ising`, `percolation`, `potts`, `xy`

Status: unvalidated, all four. No numerical evidence is registered, so there is no recorded test to
reproduce. Sources: `src/modules/lattice.js` (ising, percolation), `src/modules/potts.js`,
`src/modules/xy.js`; the uncertainty harness `src/shared/stats.js`.

- **Read:** the four records, the `ising` and `potts` rows and the known problems in
  [COMPARISON-AUDIT.md](../validation/COMPARISON-AUDIT.md), and
  [RESEARCH-GRADE.md](RESEARCH-GRADE.md) section 2, which plans these as the cheapest promotions.
- **Run:** `node tools/stats-check.js` (the harness against closed-form answers, with negative
  controls that must undercover); `node tools/check.js ising 12000` and the same for the other
  three; and, for data you can analyze yourself,
  `node tools/run.js '#ising/ising-1925' --set T=2.0 --out ising.npz --steps 6000`
  (state export exists for `ising` only; the other three write `meta.json` alone).
- **Check against the sources:**
  - `ising` (E. Ising, Z. Phys. 31, 253 (1925); L. Onsager, Phys. Rev. 65, 117 (1944);
    N. Metropolis et al., J. Chem. Phys. 21, 1087 (1953); C. N. Yang, Phys. Rev. 85, 808 (1952)):
    T_c = 2/ln(1 + sqrt 2); the Metropolis acceptance and whether the checkerboard update keeps
    detailed balance; the exact spontaneous magnetization used below 0.95 T_c at h = 0; and whether
    the |m| error bar (integrated autocorrelation time with an automatic window, first half of the
    series discarded) and its "pending" rule are honest.
  - `percolation` (S. R. Broadbent and J. M. Hammersley, 1957; J. Hoshen and R. Kopelman, 1976;
    H. Kesten, 1980): the bond threshold 1/2, the quoted site threshold 0.592746, the cluster
    labeling and the spanning test.
  - `potts` (F. Graner and J. Glazier, Phys. Rev. Lett. 69, 2013 (1992); von Neumann and Mullins):
    the extended Potts Hamiltonian, the von Neumann-Mullins slope and its bootstrap error bar, and
    the recorded inconsistency that side counts use 4-neighbor bonds while the energy uses 8. The
    mean side count of six is labeled true by construction, not a prediction.
  - `xy` (J. M. Kosterlitz and D. J. Thouless, J. Phys. C 6, 1181 (1973)): the planar-rotor
    Hamiltonian, the overdamped Langevin (model A) dynamics, and what the printed |m| means on a
    finite two-dimensional lattice.
- **Useful output:** which exact results each tab should be compared with, over which sizes and
  seeds, and whether the printed comparisons are sound. That is the evidence a later promotion
  needs.

## Computational neuroscience: `hodgkin-huxley`, `neural-mass`, `cortex`

- **`hodgkin-huxley`**, validated within stated limits (2026-09-22), source
  `src/modules/hodgkin-huxley.js`.
  - Read [HODGKIN-HUXLEY.md](../validation/HODGKIN-HUXLEY.md) and the results
    `hodgkin-huxley-science.json`, `hodgkin-huxley-duration-science.json`.
  - Run `node tools/verify.js --print hodgkin-huxley` (`hodgkin-huxley-science.js`,
    `hodgkin-huxley-duration-science.js`, `hodgkin-huxley-print.js`).
  - Check against A. L. Hodgkin and A. F. Huxley, J. Physiol. 117, 500-544 (1952), the equations on
    pages 518-519 and Table 3 on page 520: the rate functions and constants, the modern voltage
    convention (V_modern = -V_original - 65 mV, with the current sign reversed), the 6.3 degree
    Celsius parameters, and that the Dormand-Prince reference is written separately from the
    production RK4.
- **`neural-mass`**, validated within stated limits (2026-09-22), source
  `src/modules/neural-mass.js`.
  - Read [NEURAL-MASS.md](../validation/NEURAL-MASS.md) and the results
    `neural-mass-science.json`, `neural-mass-print.json`.
  - Run `node tools/verify.js --print neural-mass` (`neural-mass-science.js`,
    `neural-mass-print.js`).
  - Check against E. Montbrió, D. Pazó and A. Roxin, Phys. Rev. X 5, 021028 (2015), Eq. (12): the
    rate and voltage equations, the closed-form Riccati flow used for J = 0, the pulse handling, and
    the six presets.
- **Wording to settle for both:** the opening paragraphs of HODGKIN-HUXLEY.md and NEURAL-MASS.md
  describe the evidence as partial validation, while both records now say validated within stated
  limits after later extensions. Please say which label the evidence supports.
- **`cortex`**, unvalidated, source `src/modules/cortex.js`. No numerical evidence is registered.
  Run `node tools/check.js cortex 12000` and read the record. Check the neural field against
  H. R. Wilson and J. D. Cowan (1972, 1973) and S. Amari (1977), the planforms against G. B.
  Ermentrout and J. D. Cowan, Biol. Cybern. 34, 137 (1979), and the complex-logarithm map against
  E. Schwartz, Biol. Cybern. 25, 181 (1977). The credit states that the orientation-preference
  extension of Bressloff et al. (2001) is not what the tab computes.

## Point-vortex collapse: `three-vortex-bound`, `parallelogram-lock`, `quincunx-lock`, `double-triangle-bound`

Status: validated within stated limits (2026-09-22). Sources are the modules of the same names in
`src/modules/`.

- **Read:** [VORTEX-FAMILIES.md](../validation/VORTEX-FAMILIES.md) (four recipes per module for the
  first three), [POLYGON-REVIEW.md](../validation/POLYGON-REVIEW.md) (sixteen recipes for
  `double-triangle-bound`), [IDENTITIES.md](../IDENTITIES.md),
  [identities/polygon-collapse.md](../identities/polygon-collapse.md),
  [identities/ORIGINALITY-FOLLOWUP.md](../identities/ORIGINALITY-FOLLOWUP.md) and
  [identities/NOVELTY-AUDIT.md](../identities/NOVELTY-AUDIT.md), and the results
  `vortex-family-review.json`, `polygon-review.json`, `double-triangle.json`,
  `polygon-collapse.json`.
- **Run:** `node tools/verify.js --print three-vortex-bound parallelogram-lock quincunx-lock
  double-triangle-bound`. The Node-only checks can also be run alone:
  `node tools/double-triangle-check.js` and `node tools/polygon-collapse-check.js`.
- **Check against the sources** (W. Gröbli, 1877, section 10; Y. Kimura, J. Phys. Soc. Jpn. 56, 2024
  (1987), Eq. (4.4); H. Aref, Phys. Fluids 22, 057104 (2010); E. A. Novikov and Yu. B. Sedov, Sov.
  Phys. JETP 50, 297 (1979); T. Gotoda, arXiv:2002.09624, eq. (3.13); H. Aref, Phys. Fluids 25, 2183
  (1982); J. Koiller et al., Physica D 16, 27-61 (1985), section 11):
  - the point-vortex kernel and circulations stated in VORTEX-FAMILIES.md, and the collapse
    conditions for each family;
  - each closed form for omega_0 t_c and its minimum, and that the reference computes the rates
    independently of the module's all-pairs solver;
  - that the attribution text makes no priority claim: the three-vortex formula specializes
    Gröbli's spiral coefficient, and the other minima are bounds on classical families whose
    originality is unconfirmed.
- The manuscript on minimal winding in `research/` is a separate matter from these records; see
  [papers/minimal-winding/submission/CHECKLIST.md](../papers/minimal-winding/submission/CHECKLIST.md).

## Recording the sign-off

1. **You report** on a GitHub issue with the
   [Outside review template](https://github.com/SharpMeow/GENChase/issues/new?template=outside-review.yml):
   the techniques, the commit you reviewed, the commands and whether each passed, your environment,
   what you compared with which equation or table of which source, the problems you found, the scope
   you sign off in your own words, and whether you agree to be named. If you prefer not to use
   GitHub, send the same content to the maintainer, who will post it with your permission.
2. **The maintainer records it**, only with your consent and with your name and affiliation as you
   give them, by adding an entry to each reviewed record in `validation/techniques.json`:

   ```json
   "reviewers": [
     {
       "name": "as you give it",
       "affiliation": "as you give it",
       "date": "YYYY-MM-DD, the day of your review",
       "scope": "your scope statement",
       "evidence": "https://github.com/SharpMeow/GENChase/issues/<number>"
     }
   ]
   ```

   `node tools/science.js` rejects a malformed entry; `node tools/science.js --write` then shows the
   review in the Outside review column of [VALIDATION.md](../VALIDATION.md). The pull request links
   the issue.
3. **Problems** you report are fixed in ordinary pull requests, and the record's limitations are
   updated. A review applies to the commit you reviewed; if the source changes later, the record's
   fingerprint changes too, and the issue still says which version you saw.
4. A review never promotes a status by itself. Promotion follows the evidence rules in the
   validation contract.
