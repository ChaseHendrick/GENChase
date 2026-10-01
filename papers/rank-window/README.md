# A Finite Rank Window Cannot Show That a Neural Population Code Satisfies the Eigenspectrum Smoothness Bound

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Preprint**, release 1.0.4 archived on Zenodo with its programs ([doi:10.5281/zenodo.23050586](https://doi.org/10.5281/zenodo.23050586)); release 1.0.0 remains at [doi:10.5281/zenodo.22994835](https://doi.org/10.5281/zenodo.22994835). Not peer reviewed. Three independent referee readings were made in the project: the first recommended major revision and the second
and third recommended minor revision. The fixes of the first two are applied; of the third, the findings that
further readers confirmed are fixed and the others are answered. The fixes of the third have not been read again.
The review reports remain in the development records and are not included in this companion archive.

**[Read the preprint (PDF, 17 pages)](paper/note.pdf)**

## Abstract

Stringer, Pachitariu, Steinmetz, Carandini and Harris (Nature 571, 2019) showed that a population code that maps a
d-dimensional stimulus space differentiably to noise-free responses has an eigenspectrum decaying asymptotically
faster than n^-(1+2/d), reported exponents of 1.49, 1.65 and 3.43 for stimulus sets with d = 8, 4 and 1, fitted over
ranks 11-500 (ranks 5-30 for 32 grating directions in their Methods, 11-30 in their deposited code), and concluded
that the code is about as high-dimensional as smoothness allows. That a finite window of ranks cannot measure an
asymptotic exponent is elementary and partly anticipated; this note makes it quantitative for these stimulus sets.
For codes built on bounded eigenfunctions, as on a torus, a bound adapted from known kernel-matrix bounds shows that
the head of the spectrum fixes the finite-sample spectrum up to a constant times the variance of the tail, whatever the
tail's rate of decay, so no estimator continuous in that
spectrum can tell a continuously differentiable code from one with infinite expected squared gradient. We place
noise-free codes of fixed smoothness (Matern tuning) on the stimulus coordinates of all ten 8D and 4D stimulus sets.
Codes exactly at the differentiability border give ranks 11-500 exponents from 0.255 to 1.628 at d = 8 and from
0.625 to 1.762 at d = 4, below the bound for short and above it for long tuning length scales, with infinitely many
or 8,704 neurons and in whitened coordinates. Non-differentiable codes with Matern nu = 0.75 also exceed the bound
in the unwhitened coordinates at 2,800 stimuli, but not over ranks 101-500, not in whitened 8D coordinates and not
always with fewer stimuli. For 32 directions a non-differentiable code reaches 3.5012 over ranks 5-30 and 3.4306
over ranks 11-30. The tail exponent of the eigenmoment method of Pospisil and Pillow depends on the unresolved tail:
spectra that share a broken power law with tail exponent 1.25 up to rank 500 give tail exponents from 1.138 to 1.394,
and the eigenmoment misfit flags none of 20 simulated data sets of any variant with diagonal weights (95% upper
bound 0.168 on the flag probability) and at most 5 of 20 with full whitening (upper bound 0.491), depending on the
reference distribution. The reported exponents are consistent with the bound but cannot show that the code
satisfies it or lies close to it.

## Status of the results

- **Proved:** Proposition 1 and Corollary 1 (Section 2 of the note), and the one-line Fatou argument after them that
  a stationary code with infinite expected squared gradient is differentiable nowhere. Proposition 1 adapts the
  argument of Lemmas 5 and 8 of Braun (JMLR 2006), which are stated for the uncentred kernel matrix of a Mercer kernel
  with orthonormal eigenfunctions and nonincreasing eigenvalues; the note says what the proof changes (Weyl's
  inequality applied to the centred matrices, the projection, positivity for the maximum).
- **Numerical (floating point, no enclosures):** everything else: the Matern window exponents, the finite-population,
  whitened-coordinate and stimulus-subset computations, the d = 1 examples (over ranks 5-30 and 11-30), the MEME
  sensitivity and its flag counts, the nearest-neighbour dimensions and the cvPCA side result. Spectra, fits and
  window exponents are in double precision; the simulated responses, their Gram products and the cvPCA
  eigendecomposition are in single precision, and `code/precision_check.py` measures the effect (far below the
  printed precision). Every number in the text is a macro written by `code/make_numbers.py` from `out/`, and the
  worded claims that rest on them ("every set", "none", "three of six", the flag counts) are asserted there.
- **Not done:** no exponent fitted to any recording enters the note (`code/stage1/calib.py` prints window slopes of
  the calibration recording's spectra, which are not used). The only neural data used are the per-neuron signal and
  noise variances and the noise spectrum of one natural-image recording, which calibrate the simulator (the variance
  of its shared noise mode is set close to the recording's largest noise eigenvalue), and that recording's cvPCA
  spectrum at ranks 11, 100 and 500, with which the cvPCA side result compares simulated spectra (all computed by
  `code/stage1/calib.py`). The comparison with the shape of the recorded spectra is not made.

## Contents

| Path | What |
|---|---|
| `paper/` | `note.tex` with `abstract.tex`, `results.tex`, `discussion.tex`, the generated `numbers.tex` and `tab_*.tex`, `figures/`, and `note.pdf` |
| `code/` | The programs. `common.py` (stimulus coordinates, Matern kernel, the Stringer window fit), `matern_window.py`, `matern_finiteN.py`, `matern_extra.py` (whitened, subsets, Kong-Valiant eigenmoments), `nn_dim.py`, `circle_d1.py`, `meme_sim.py`, `meme_analyze.py`, `snr_cv.py`, `precision_check.py`, `tails.py`, `est.py`, `sim.py`, `make_numbers.py`, `make_figures.py`, `verify_independent.py`, `check_quotes.py`, and in `code/stage1/` the stage-1 programs that make the simulator's calibration (`calib.py`, `spec.py`, `run_sim.py`) |
| `out/` | Every output the note's numbers come from (JSON, NPZ, per-set checkpoints). The run logs the commands below write are not tracked (`*.log` is ignored by the repository). Licensed CC BY-NC 4.0, see `out/LICENSE.md` |
| `data/` | Not tracked: the stimulus files and the calibration inputs are downloaded or regenerated (below) |

## Inputs (not in this repository)

All experimental inputs come from the deposit of Stringer, Pachitariu, Carandini and Harris on figshare,
doi:[10.25378/janelia.6845348](https://doi.org/10.25378/janelia.6845348), licensed CC BY-NC 4.0 by the depositors.
They are not redistributed here.

1. **Stimulus files** (read by `code/common.py` from `data/stim/`, or from the folder in the environment variable
   `NOTE_STIM`, saved under shorter names). Download `https://ndownloader.figshare.com/files/<file id>`. The MD5s
   are those the figshare API reports for these files, and the third referee and this revision matched them on
   download:

   | Saved as | figshare file | File id | Bytes | MD5 |
   |---|---|---|---|---|
   | images_8D_MP030_0607.mat | images_natimg2800_8D_M161025_MP030_2017-06-07.mat | 12462530 | 4,798,692 | ec3b8ea7fa267a92fbe55ccacd0c6399 |
   | images_8D_MP031_0702.mat | images_natimg2800_8D_M170604_MP031_2017-07-02.mat | 12462533 | 3,777,355 | ca38dc90580959488b2e873dad61683f |
   | images_8D_MP032_0810.mat | images_natimg2800_8D_M170714_MP032_2017-08-10.mat | 12462539 | 3,385,679 | 558ebb6d64cdfbde02e7ece71d5e0a97 |
   | images_8D_MP032_0915.mat | images_natimg2800_8D_M170714_MP032_2017-09-15.mat | 12462536 | 6,529,718 | 8647c41671a084a746e3d7b76a9658e6 |
   | images_8D_MP033_0822.mat | images_natimg2800_8D_M170717_MP033_2017-08-22.mat | 12462542 | 3,692,590 | 091aa99f53d5933b5e56cdd466a46502 |
   | images_8D_MP034_0915.mat | images_natimg2800_8D_M170717_MP034_2017-09-15.mat | 12462545 | 6,579,080 | 6a987d1701b31094842fdbc7f11e2a5e |
   | images_4D_MP032_0922.mat | images_natimg2800_4D_M170714_MP032_2017-09-22.mat | 12462758 | 3,927,306 | d8c37e4428a8b80287da1c363ef5e41c |
   | images_4D_MP033_0919.mat | images_natimg2800_4D_M170717_MP033_2017-09-19.mat | 12462761 | 2,374,685 | 305a6264eadc808c5361fd199bc8efde |
   | images_4D_MP033_0922.mat | images_natimg2800_4D_M170717_MP033_2017-09-22.mat | 12462524 | 4,661,615 | cc46d398c8edc5959cfbbb9ecbd75084 |
   | images_4D_MP034_0920.mat | images_natimg2800_4D_M170717_MP034_2017-09-20.mat | 12462527 | 3,934,603 | db5919a8db59a222057661a4d66a1c3e |

2. **The simulator's calibration** (read by `meme_sim.py` and `snr_cv.py` from `data/`, and by `precision_check.py`
   from `data/` or the folder in `NOTE_DATA`), the per-neuron signal and
   noise variances of one natural-image recording, `natimg2800_M170714_MP032_2017-09-14.mat` (figshare file
   12462698, 244,220,197 bytes, MD5 597145257e2571213d51bcbbcae263fa). In an empty working folder with an `out/`
   subfolder and `code:code/stage1` on `PYTHONPATH`: `python3 calib.py <that file> nat_MP032_0914`, then copy
   `out/calib_nat_MP032_0914.npz` to `data/`.
3. **The cvPCA simulation inputs** `data/truth_bpl1.5.npy` and `data/sim_bpl1.5.npz` (used by `snr_cv.py` only):
   `python3 run_sim.py <replicates> <joint bootstrap draws> <stimulus bootstrap draws> bpl1.5` in the same
   folder, after step 2; the stage-1 run used 6 joint and 3 stimulus bootstrap draws.

**Where `est.py`, `sim.py` and `code/stage1/` come from.** They were written for an earlier, unpublished feasibility
study in this project (a simulator calibrated to one natural-image recording, used to test how cvPCA and MEME
estimates behave when the true spectrum is known). The note reuses these programs and regenerates the inputs they
produce with the commands above; it does not use or report that study's results.

`code/check_quotes.py` checks every quotation against saved texts of the cited papers. Those texts are copyrighted and
are not in this repository; set `NOTE_LIT` to folders holding your own copies to run it.

## Reproduce

From this folder, with the inputs above in place, `code/requirements.txt` installed and `OPENBLAS_NUM_THREADS=1`:

```
python3 code/matern_window.py > out/matern_window.log          # about 1 h, resumable
python3 code/matern_finiteN.py 20 --first > out/matern_finiteN_first.log   # first run: 54 cells, 20 replicates
python3 code/matern_finiteN.py 5 > out/matern_finiteN.log                   # the other 58 cells, 5 replicates
python3 code/matern_extra.py white > out/matern_extra_white.log
python3 code/matern_extra.py sub > out/matern_extra_sub.log
python3 code/matern_extra.py kv > out/matern_extra_kv.log
python3 code/matern_extra.py kvN > out/matern_extra_kvN_a.log
python3 code/nn_dim.py > out/nn_dim.log
python3 code/circle_d1.py > out/circle_d1.log
python3 code/meme_sim.py 20 0 > out/meme_sim.log
python3 code/meme_sim.py 80 20 base > out/meme_sim_base.log
python3 code/meme_analyze.py > out/meme_analyze.log
python3 code/snr_cv.py 3 99 > out/snr_cv_seed99.log
python3 code/snr_cv.py 5 100 > out/snr_cv_seed100.log
python3 code/precision_check.py > out/precision_check.log      # about 5 min; reproduces stored results exactly with one BLAS thread
python3 code/make_numbers.py            # writes paper/numbers.tex and paper/tab_*.tex; asserts the worded claims
python3 code/make_figures.py
python3 code/verify_independent.py > out/verify_independent.log
cd paper && pdflatex note && pdflatex note && pdflatex note
```

`make_numbers.py` and `make_figures.py` run from `out/` alone, without the inputs (checked: `make_numbers.py`
reproduces `paper/numbers.tex`, the five tables and `out/numbers.json` byte for byte); `verify_independent.py`
needs the stimulus files (`NOTE_STIM=<folder> python3 code/verify_independent.py` reads them from another folder).

The finite populations were computed in two stages, and the two `matern_finiteN.py` lines repeat them. `--first`
restricts the run to the cells of the first computation: ell = 1/4, 1 and 4, with nu = 1 on every set and all five nu
on 8D MP032 2017-08-10 and 4D MP032 2017-09-22. The second line adds the other cells (nu = 1 at ell = 1/2, 2 and 8,
and nu = 0.75 at ell = 2, 4 and 8 where not already computed) with 5 replicates. Replicate r uses the same Wishart
draw in every run (a generator seeded [20260926, 7, r]), so the stage that computes a cell sets only its replicate
count, not its values.

The full in-project rerun of 2026-09-27 ran these commands from the downloaded inputs and
reproduced every committed output, and `make_numbers.py` then reproduced `paper/numbers.tex`, the tables and
`out/numbers.json` byte for byte. The one exception is the last bits of the `matern_window.py` outputs. They were
computed with two BLAS threads, and one thread gives spectra within 1e-8 relative of them (window exponents within
1e-9, and the finite-population values that rest on them within 2e-13). No printed number changes.

## License

The programs in `code/` are licensed under the Apache License 2.0. The outputs in `out/` are derived from the
CC BY-NC 4.0 deposit of Stringer et al. and are licensed CC BY-NC 4.0 (`out/LICENSE.md`). The text of the note is
not licensed for reuse. See NOTICE.
