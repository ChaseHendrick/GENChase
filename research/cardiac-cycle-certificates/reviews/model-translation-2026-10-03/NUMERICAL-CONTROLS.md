# Actual model translation numerical controls, 2026-10-03

This is a readable transcription of the 49 actual rows in `translation-controls.json`, SHA-256
`8d8b4e12ea0e4afc8d4c6c2a26f2225cd3ffe9f65f933015467317d7c9a8fe84`. It is not a new computation or a global symbolic-equivalence proof.
The source comparison uses the retained literal MATLAB expression walker with forward AD, and the frozen
reference with complex-step Jacobian. The exact sampled-state construction and random seed are in
`check_translation.py`; the 49 voltage values alone do not specify complete 18-state inputs.

| Point | V (mV) | Normalized RHS error | Normalized Jacobian error |
| --- | --- | --- | --- |
| 1 | -80 | 4.3300748045253375e-19 | 3.3812118581319686e-16 |
| 2 | -40.000999999999998 | 1.3768985866372729e-16 | 1.8350328342441134e-16 |
| 3 | -40 | 0 | 4.2134332391267362e-16 |
| 4 | -39.999000000000002 | 1.3769229471311331e-16 | 4.2135266898952282e-16 |
| 5 | -20 | 0 | 2.5893530174787771e-16 |
| 6 | 0 | 5.4190431156225137e-20 | 2.9928643410917787e-16 |
| 7 | 14.99 | 0 | 3.8740016720408931e-16 |
| 8 | 15.01 | 0 | 4.8609075486327344e-15 |
| 9 | 30 | 2.7101865760097293e-20 | 1.3100972355807688e-16 |
| 10 | -12.689735146229204 | 2.1651649746017413e-19 | 1.3004350466994725e-16 |
| 11 | 25.622400706170502 | 1.694054411721672e-21 | 1.8374621470044074e-16 |
| 12 | -77.895183955652286 | 0 | 7.6243069413451291e-16 |
| 13 | -13.393650707064804 | 0 | 2.1843849618925776e-16 |
| 14 | -82.667174110565711 | 8.6367108669659135e-19 | 8.0095734977683272e-16 |
| 15 | 27.334954336384257 | 0 | 3.9055994598590918e-16 |
| 16 | -27.128982321864029 | 4.2351542118283574e-22 | 4.0671232161154416e-16 |
| 17 | -10.552587263876111 | 0 | 2.0318162929188819e-16 |
| 18 | -24.432928345245529 | 0 | 3.3794099223321843e-16 |
| 19 | -10.767932405896335 | 6.7978350015306244e-18 | 4.850804715180858e-16 |
| 20 | -1.6424058241993063 | 0 | 3.642010231680433e-16 |
| 21 | -49.763177840156679 | 2.1665984250062149e-19 | 3.4770135534205616e-16 |
| 22 | 2.9155297892297711 | 0 | 2.5375410027247451e-16 |
| 23 | 7.9147219111641292 | 0 | 4.5414859680797074e-16 |
| 24 | -16.494979313495044 | 1.7246775602407902e-18 | 2.2265224213207268e-16 |
| 25 | -54.077158837303323 | 4.2351512327139583e-22 | 2.2087704534450225e-16 |
| 26 | -20.767493017896083 | 0 | 3.6102236673061638e-16 |
| 27 | -26.029178660231196 | 0 | 4.0991932215263924e-16 |
| 28 | -68.860958207594933 | 2.7636604777990734e-16 | 4.0615683551382993e-16 |
| 29 | -78.786225969877492 | 4.3276854632359869e-19 | 1.691143823570376e-16 |
| 30 | -65.350041496883208 | 1.1353442510680603e-16 | 3.0388797513813326e-16 |
| 31 | -24.049179984025219 | 1.1080125132391135e-16 | 4.1107586343196537e-16 |
| 32 | -36.79472633852675 | 1.9272737099202595e-16 | 5.6054741174631931e-16 |
| 33 | -8.7590875133912416 | 1.0834590589293173e-19 | 2.4785834354990736e-16 |
| 34 | -83.809185046601414 | 0 | 3.9411084685679758e-16 |
| 35 | -64.802827916123007 | 0 | 1.3619433611797309e-16 |
| 36 | -67.133945797489247 | 2.1651262205517922e-19 | 4.6823718844378175e-16 |
| 37 | -7.9041989222321343 | 2.0071170619164012e-16 | 2.2707819553334853e-16 |
| 38 | -53.441320280662538 | 0 | 3.3056252614869683e-16 |
| 39 | -80.245163979380408 | 2.5369362518584725e-17 | 2.9041234172869124e-16 |
| 40 | 12.681404370524715 | 0 | 3.3709193834178698e-16 |
| 41 | 13.444548676963528 | 0 | 2.2361129967845656e-16 |
| 42 | 24.362190200911364 | 0 | 2.2088546974214866e-16 |
| 43 | 27.011035628589195 | 4.6477859735818301e-16 | 3.3980070301178553e-16 |
| 44 | 17.025543336110999 | 8.4702892147129643e-22 | 1.6929619481100382e-16 |
| 45 | 5.7165919461106256 | 4.3302786031971157e-19 | 4.5672909292395327e-16 |
| 46 | 14.601554124730614 | 0 | 2.8319084292788828e-16 |
| 47 | 13.337794924449675 | 4.3219519202141371e-19 | 3.9768021319372058e-16 |
| 48 | -57.259904389620544 | 0 | 4.0589989286016768e-16 |
| 49 | -32.989448247470975 | 0 | 4.8074763686045499e-16 |

All 49 rows were retained, including signed points near the smoothed minus 40 mV threshold and 15 mV quotient.
Worst normalized RHS error: 4.64778597358183e-16.
Worst normalized Jacobian error: 4.8609075486327344e-15.

## Actual auxiliary controls

```json
{
  "trust_controls": [
    {
      "name": "test_generated_file",
      "result": "fresh; reference SHA-256 pinned; 101 decimals -> _D, 164 integers -> _I, 22 exponents kept, 1843 other tokens identical"
    },
    {
      "name": "test_decimal_and_scale_balls",
      "result": "83 decimal literals enclosed with radius <= 2^(2-prec)|q| at 53/128/256 bits; 42 integers and 36 scales exact"
    },
    {
      "name": "test_scales_and_params_match_capd",
      "result": "scale exponents and the 7 parameter decimals equal model/tp06_capd.hpp and model/setup.hpp"
    }
  ],
  "membrane_vs_internal_flux": {
    "Ca_sr_Cm1": 0.0011281062224290917,
    "Ca_sr_Cm0185": 0.0011281062224290917,
    "Na_i_ratio": 5.405405405405405,
    "false_all_flux_scale_difference": 0.004969765250160593
  },
  "charge_clamp": {
    "full19_charge_derivative_float": -2.168404344971009e-19,
    "clamped18_charge_derivative_float": 1.2717959929607137e-05,
    "omitted_Ki_derivative_float": -1.2717959929607281e-05,
    "conclusion": "Ki clamping is not reduction to the conserved full19 charge leaf"
  },
  "V15_refused_by_pure_scalar_reference_and_arb": true,
  "negative_controls": {
    "f2_170_to_240_refused_error": 0.019014662174789167
  }
}
```

The exact `REPORT.md`, program, numerical JSON, unchanged-native-source snapshot and supervisor log/receipt
are preserved without edits. `preservation-manifest.json` binds those copies and separately confirms the seven
native model/infrastructure files match current HEAD. Its preliminary-source test-count snapshot is historical;
later prototype changes do not alter these 49 observations. No ODE integration or scientific theorem admission
is supplied by these controls.
