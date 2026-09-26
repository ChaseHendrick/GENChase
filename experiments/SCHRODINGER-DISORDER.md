# Correlated disorder and finite-time packet spread

This experiment tests a narrow question in established physics: at the same disorder RMS **and identical potential-value histogram**, does spatial arrangement change a packet's spread by more than ordinary seed variation in this declared finite lattice? It is not a new formula or an Anderson-localization proof. No AI model, fitted law or optimized parameter search runs here.

## Result: a fragile screening signal

The frozen eight-seed criterion passed: at time 24, the correlated fields had
mean centered variance **119.352** versus **83.951** for the histogram-matched
shuffled fields, a **42.17%** increase. The mean paired difference was 35.401
lattice-spacing squared, with a paired bootstrap 95% interval **[1.135, 65.821]**.
It exceeded the pooled within-arm seed standard deviation of 33.243 by only
6.5%. Seven pairs increased; one changed strongly in the opposite direction.

| Seed | Correlated variance | Shuffled variance | Paired difference |
|---|---:|---:|---:|
| 4101 | 138.552 | 64.513 | +74.039 |
| 4102 | 43.408 | 97.696 | −54.288 |
| 4103 | 178.266 | 85.609 | +92.657 |
| 4104 | 130.373 | 69.340 | +61.033 |
| 4105 | 75.142 | 74.274 | +0.868 |
| 4106 | 168.939 | 91.016 | +77.924 |
| 4107 | 108.524 | 94.564 | +13.960 |
| 4108 | 111.610 | 94.597 | +17.013 |

This is not a confirmed population effect. A **post-hoc uncertainty sensitivity**,
the paired Student 95% interval with seven degrees of freedom, is **[−6.126, 76.927]**
and includes zero. That interval assumes normally distributed pair differences;
neither method supplies a distribution-free guarantee with eight seeds. The
bootstrap acceptance rule was not replaced, but its marginal success should not
be confused with robust inference. More independent seeds are a clear follow-up.

All 48 paired scientific runs passed the declared numerical integrity checks.
The largest change from halving the step was **0.1155%**, and from doubling the
periodic box **0.00615%**. The frozen effect criteria survived both repeats.
The largest sampled modified-invariant drift was **2.55×10⁻⁷**. Maximum sampled
outer-strip probability was **0.09869%**, close to the predeclared 0.1% ceiling.
The exact free-mode error was 5.69×10⁻⁵; reversing the imaginary-update sign
produced error 1.577 and failed the invariant check. Both identical-input controls
behaved as required. There were 52 forward runs, including controls.

Variance measures broadening about the moving centroid, not total distance
traveled. The free-packet reference travels farther while retaining a narrower
shape (final variance 47.605), and its boundary-strip probability reaches 0.180%,
above the paired experiment's ceiling. It is not a boundary-validated free-space
baseline. Equal whole-field histograms also leave local initial potential energies
unequal; these are recorded for every pair. The result does not identify a unique
transport mechanism or establish historical originality.

## Frozen protocol

The model is the finite periodic Schrödinger Hamiltonian `H = -0.5 Δ₅ + V`, with unit lattice spacing, eight seeds 4101–4108, 64² sites, no absorption, no hard walls and no interactions. The kinetic bandwidth is 4. This is a discrete lattice model; no continuum limit is claimed.

For each seed, independent standard-normal values are convolved periodically with `[1,4,6,4,1]/16` in each coordinate. Subtract the whole-tile mean and normalize RMS to 0.5, then store float32. The comparison arm is a seeded Fisher–Yates permutation of the **exact same float32 values**, so mean, RMS, tails and the complete one-point histogram match. The shuffled field is a finite histogram-preserving reference, not mathematically independent white noise. Neighbor and lag-four correlations and exact little-endian float32 SHA-256 hashes are recorded. Only the declared finite family of correlations is tested.

Every pair uses the same normalized packet. At integer coordinates centered on the box, let `q=(x²+y²)/12²`. For q<1 the amplitude is `exp(-(x²+y²)/(4*3²) + 1 - 1/(1-q))`; it is zero outside. Multiply by `exp(i*0.7*x)` and normalize its squared sum to one. The common-time real/imaginary state is initialized through the audited shader's symmetric half-step procedure.

The maintained `SCH_STEP_FS` advances the field with step 0.1. A conservative bound requires `dt*(4+max|V|)<1.6`; every case reports its actual margin. Observations occur at times 0, 8, 16 and **24, the frozen primary endpoint**. Centered positive density uses `R² + ((Iminus+Iplus)/2)²`; spatial variance is its normalized second central moment. Centroid, displacement from the initial center, inverse participation ratio and boundary-strip probability accompany it. The separate summed Visscher invariant `R²+Iminus*Iplus` is never locally clipped and must drift less than 10⁻⁵ at the sampled times. Its initial value can differ slightly between potentials because it is a time-discretization invariant.

## Decision and uncertainty

The primary comparison is each seed's correlated-minus-shuffled final variance. Report its mean, a seeded 10,000-resample paired bootstrap 95% percentile interval, and both arms' seed variation. “More than seed variation” means the absolute mean paired effect exceeds the pooled within-arm sample standard deviation. The frozen hypothesis additionally requires at least a 10% absolute relative effect and an interval that excludes zero. With only eight independent seeds this uncertainty estimate is approximate and does not characterize rare outcomes. No samples or times are selected after seeing the results.

Every pair is repeated at dt=0.05 and on a 128² lattice at the same unit spacing and dt=0.1. The larger lattice repeats the exact 64² potential tile while retaining the same localized packet, so the local Hamiltonian is unchanged. This tests periodic wavefunction return/sensitivity; it is not independent outer disorder, a thermodynamic limit or mesh refinement. Spatial moments use the signed coordinates centered on each box and can be misleading if the packet wraps. The outer four-site probability strip must stay below 0.1%, final variance must change by ≤2% on enlarging the domain and ≤0.5% on halving the step, and the paired effect criteria/direction must survive both repeats. None of these bounds proves zero boundary influence at all times.

An independent exact free-lattice Fourier mode checks propagation and a reversed imaginary-update sign must fail. An identical-potential replay must reproduce its full metric series exactly, and pairing every observation with itself must fail the same effect criterion. A free-packet run is included as a reference, not as a matched-disorder arm.

## Reproduce

Use the browser setup in [BUILDING.md](../BUILDING.md), then:

```sh
node tools/schrodinger-disorder.js > experiments/results/schrodinger-disorder.json
```

[The artifact](results/schrodinger-disorder.json) saves all seeds, field-generation definitions/hashes, source and harness hashes, every trial's time series, paired differences, uncertainty, numerical checks and rejected controls. `summary` states whether the frozen bounded hypothesis passed or failed. No production module or scientific-validation inventory is changed by this experiment.

## Prior articles and interpretation

[Miniatura et al. (2008)](https://arxiv.org/pdf/0807.3698) already treat expanding matter waves in two-dimensional spatially correlated disorder, including variance and finite-size effects. [Piraud et al. (2013)](https://www.cpht.polytechnique.fr/cpht/uquantmat/publications/papers/piraud2013njp15_075007.pdf) explicitly connect transport to disorder statistics. This filtered finite-lattice model does not reproduce their continuum optical-speckle calculations.

[The 2020 two-dimensional localization experiment](https://www.nature.com/articles/s41467-020-18652-w) distinguishes classical trapping from interference-induced localization. Equal global disorder histogram does not equalize the potential energy sampled by the initial packet, which is reported per run here. Reduced finite-time spreading may reflect trapping or scattering; it does not establish exponentially localized eigenstates or asymptotic transport arrest. No historical originality is established.

Research on 2026-09-21 used the exact queries `correlated disorder two dimensional
wavepacket spreading Anderson localization Gaussian correlations quantum particles`
and `site:arxiv.org two dimensional correlated disorder quantum wave packet expansion
localization speckle`, after reading the project ledger. The Miniatura introduction,
correlation/variance discussion and finite-size section were read; the Piraud
abstract and opening context were read, not its full 47-page derivation. The 2020
article's introduction and classical-trapping distinction were read. These primary
sources establish that the broad idea is in prior articles; no exact-protocol originality
claim follows from the search.
