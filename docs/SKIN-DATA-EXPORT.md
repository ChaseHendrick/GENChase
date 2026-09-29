# Skin probability data export

`Studio.exportData('skin')` now includes `probability.npy` and `meta.json` through the existing engine API. The array is a copied Float32 field with shape `[drawn rows, sites]`, in row-major order. Values are dimensionless site probabilities `|psi|²`, with each row normalized to one. These are the values used by the plate before palette, logarithm, exposure and gamma mapping.

`meta.json.grid` records:

- `sites`, `modes` (the number of drawn rows), `rowMode` and `aspect`.
- Requested `solver`, effective `method`, `boundary`, `g`, `disorder` and `seed`.
- `skinWeight`, zero-based `skinStartSite`, `meanIPR` and a normalization description.

The effective methods are `analytic-open`, `open-right`, `periodic-right` and `legacy-gram-basis`. The existing clean-open shortcut uses the analytic modes when disorder is below 0.04. Gram rows are an orthonormal basis, not right eigenvectors. Legacy `sheet` recipes can have more rows than sites, including repeated modes; current `modes` recipes cap the row count at the number of sites. These distinctions are retained rather than renamed as validated eigenmodes.

The geometry metadata snapshots the computation. The engine adds the recipe, source fingerprint, scientific status and device provenance to the package. Every export returns a fresh probability array, shape array and metadata object. Export does not regenerate a settled plate or alter its settings, pixels or explicit pause preference.

## Reproduction and scope

After the maintained source and generated build agree:

```sh
node tools/skin-data-check.js --write
node tools/skin-rows.js
```

The browser regression covers clean open and periodic chains at N=96, a disordered open chain at N=48, and a v7 legacy sheet/Gram recipe with 60 rows and 48 sites. It reads the actual NPZ package through the public engine API, checks source fingerprint, shape, finite normalized probabilities and diagnostics, mutates returned data to test copy isolation, and confirms settings, pixels and explicit pause are unchanged. Independent references are the clean-open normalized sine/exponential formula and the clean periodic plane-wave density `1/N`.

Negative controls retain an incorrect shape and a normalized corrupted periodic row, with its derived diagnostics updated consistently so the independent uniform reference must reject it. A disordered case is ineligible for the uniform reference. Results are in `validation/results/skin-data-check.json`.

The first browser run used a scratch standalone build with only the maintained Skin source and its build fingerprint refreshed. The checked-in build is regenerated separately. No solver, seed, recipe, color mapping, scientific status or generic image threshold changes are part of this data contract. The clean periodic right-solver status explains that uniform plane-wave density produces one color; legacy and disordered cases do not receive that explanation.
