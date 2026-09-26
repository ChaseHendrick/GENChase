# A finite rank window cannot show that a neural population code satisfies the eigenspectrum smoothness bound

**Chase Hendrick**, Independent Researcher · [ORCID 0009-0002-9754-6087](https://orcid.org/0009-0002-9754-6087)

**Draft methods note** (drafted in this repository by the owner's standing decision of 2026-09-26), not submitted
anywhere. Two independent referee readings were made in the project
(`notes/review-1.md`, verdict major revision; `notes/review-2.md`, verdict minor revision), and the fixes of both are
applied; the fixes of the second have not been read again.

**[Read the draft (PDF, 14 pages)](paper/note.pdf)**

## Abstract

Stringer, Pachitariu, Steinmetz, Carandini and Harris (Nature 571, 2019) showed that a population code that maps a
d-dimensional stimulus space differentiably to noise-free responses has an eigenspectrum decaying asymptotically
faster than n^-(1+2/d), reported exponents of 1.49, 1.65 and 3.43 for stimulus sets with d = 8, 4 and 1, fitted over
ranks 11-500 (ranks 5-30 for 32 grating directions), and concluded that the code is about as high-dimensional as
smoothness allows. That a finite window of ranks cannot measure an asymptotic exponent is elementary and partly
anticipated; this note makes it quantitative for these stimulus sets. For codes built on bounded eigenfunctions, as
on a torus, a known kernel-matrix bound implies that the finite-sample spectrum is continuous in the variance of the
tail and blind to its rate of decay, so no estimator continuous in that spectrum can tell a differentiable code from
a non-differentiable one. Noise-free codes of fixed smoothness (Matern tuning) placed on the stimulus coordinates of
all ten 8D and 4D stimulus sets give, exactly at the differentiability border, ranks 11-500 exponents from 0.255 to
1.628 at d = 8 and from 0.625 to 1.762 at d = 4, below the bound for short and above it for long tuning length
scales. Non-differentiable codes with Matern nu = 0.75 also exceed the bound in the unwhitened coordinates at 2,800
stimuli, but not over ranks 101-500, not in whitened 8D coordinates and not always with fewer stimuli. For 32
directions a non-differentiable code reaches 3.5012. The tail exponent of the eigenmoment method of Pospisil and
Pillow depends on the unresolved tail: spectra that share a broken power law with tail exponent 1.25 up to rank 500
give tail exponents from 1.138 to 1.394, and the eigenmoment misfit detects the difference rarely or not at all.
The reported exponents are consistent with the bound but cannot show that the code satisfies it or lies close to it.

## Status of the results

- **Proved:** Proposition 1 and Corollary 1 (Section 2 of the note). Proposition 1 follows from Lemmas 5 and 8 of
  Braun (JMLR 2006) with positivity; the note says so.
- **Numerical (floating point, no enclosures):** everything else: the Matern window exponents, the finite-population,
  whitened-coordinate and stimulus-subset computations, the d = 1 examples, the MEME sensitivity, the nearest-neighbour
  dimensions and the cvPCA side result. Every number in the text is a macro written by `code/make_numbers.py` from
  `out/`, and every worded claim ("every set", "none", "three of six") is asserted there.
- **Not done:** no spectrum of any recording is computed; the comparison with the shape of the recorded spectra is
  not made.

## Contents

| Path | What |
|---|---|
| `paper/` | `note.tex` with `abstract.tex`, `results.tex`, `discussion.tex`, the generated `numbers.tex` and `tab_*.tex`, `figures/`, and `note.pdf` |
| `code/` | The programs. `common.py` (stimulus coordinates, Matern kernel, the Stringer window fit), `matern_window.py`, `matern_finiteN.py`, `matern_extra.py` (whitened, subsets, Kong-Valiant eigenmoments), `nn_dim.py`, `circle_d1.py`, `meme_sim.py`, `meme_analyze.py`, `snr_cv.py`, `tails.py`, `est.py`, `sim.py`, `make_numbers.py`, `make_figures.py`, `verify_independent.py`, `check_quotes.py`, and in `code/stage1/` the stage-1 programs that make the simulator's calibration (`calib.py`, `spec.py`, `run_sim.py`) |
| `out/` | Every output the note's numbers come from (JSON, NPZ, per-set checkpoints) and the run logs. Licensed CC BY-NC 4.0, see `out/LICENSE.md` |
| `data/` | Not tracked: the stimulus files and the calibration inputs are downloaded or regenerated (below) |
| `notes/` | `QUALITY.md`, and the two referee reports `review-1.md` and `review-2.md` |

## Inputs (not in this repository)

All experimental inputs come from the deposit of Stringer, Pachitariu, Carandini and Harris on figshare,
doi:[10.25378/janelia.6845348](https://doi.org/10.25378/janelia.6845348), licensed CC BY-NC 4.0 by the depositors.
They are not redistributed here.

1. **Stimulus files** (read by `code/common.py` from `data/stim/`, saved under shorter names). Download
   `https://ndownloader.figshare.com/files/<file id>`:

   | Saved as | figshare file | File id |
   |---|---|---|
   | images_8D_MP030_0607.mat | images_natimg2800_8D_M161025_MP030_2017-06-07.mat | 12462530 |
   | images_8D_MP031_0702.mat | images_natimg2800_8D_M170604_MP031_2017-07-02.mat | 12462533 |
   | images_8D_MP032_0810.mat | images_natimg2800_8D_M170714_MP032_2017-08-10.mat | 12462539 |
   | images_8D_MP032_0915.mat | images_natimg2800_8D_M170714_MP032_2017-09-15.mat | 12462536 |
   | images_8D_MP033_0822.mat | images_natimg2800_8D_M170717_MP033_2017-08-22.mat | 12462542 |
   | images_8D_MP034_0915.mat | images_natimg2800_8D_M170717_MP034_2017-09-15.mat | 12462545 |
   | images_4D_MP032_0922.mat | images_natimg2800_4D_M170714_MP032_2017-09-22.mat | 12462758 |
   | images_4D_MP033_0919.mat | images_natimg2800_4D_M170717_MP033_2017-09-19.mat | 12462761 |
   | images_4D_MP033_0922.mat | images_natimg2800_4D_M170717_MP033_2017-09-22.mat | 12462524 |
   | images_4D_MP034_0920.mat | images_natimg2800_4D_M170717_MP034_2017-09-20.mat | 12462527 |

2. **The simulator's calibration** (read by `meme_sim.py` and `snr_cv.py` from `data/`), the per-neuron signal and
   noise variances of one natural-image recording, `natimg2800_M170714_MP032_2017-09-14.mat` (figshare file
   12462698, 244,220,197 bytes, MD5 597145257e2571213d51bcbbcae263fa). In an empty working folder with an `out/`
   subfolder and `code:code/stage1` on `PYTHONPATH`: `python3 calib.py <that file> nat_MP032_0914`, then copy
   `out/calib_nat_MP032_0914.npz` to `data/`.
3. **The cvPCA simulation inputs** `data/truth_bpl1.5.npy` and `data/sim_bpl1.5.npz` (used by `snr_cv.py` only):
   `python3 run_sim.py <replicates> <joint bootstrap draws> <stimulus bootstrap draws> bpl1.5` in the same
   folder, after step 2; the stage-1 run used 6 joint and 3 stimulus bootstrap draws.

`code/check_quotes.py` checks every quotation against saved texts of the cited papers. Those texts are copyrighted and
are not in this repository; set `NOTE_LIT` to folders holding your own copies to run it.

## Reproduce

From this folder, with the inputs above in place, `code/requirements.txt` installed and `OPENBLAS_NUM_THREADS=1`:

```
python3 code/matern_window.py > out/matern_window.log          # about 1 h, resumable
python3 code/matern_finiteN.py 20 > out/matern_finiteN.log
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
python3 code/make_numbers.py            # writes paper/numbers.tex and paper/tab_*.tex; asserts every worded claim
python3 code/make_figures.py
python3 code/verify_independent.py > out/verify_independent.log
cd paper && pdflatex note && pdflatex note && pdflatex note
```

`make_numbers.py` and `make_figures.py` run from `out/` alone, without the inputs (checked: `make_numbers.py`
reproduces `paper/numbers.tex`, the four tables and `out/numbers.json` byte for byte); `verify_independent.py`
needs the stimulus files.

## License

The programs in `code/` are licensed under the Apache License 2.0. The outputs in `out/` are derived from the
CC BY-NC 4.0 deposit of Stringer et al. and are licensed CC BY-NC 4.0 (`out/LICENSE.md`). The text of the note is
not licensed for reuse. See NOTICE.
