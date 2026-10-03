# Scoped model translation and flux wording audit, 2026-10-03

The49 sampled RHS and Jacobian comparisons are numerical fidelity checks, not proof of global symbolic equivalence. They compare an independent literal-MATLAB expression walker and forward AD against the current reference and complex-step Jacobian, including the smoothed minus40mV threshold and signed points near15mV. Worst normalized RHS error4.65e-16; Jacobian error4.86e-15. Existing exact generated-token, decimal-enclosure and scales/parameter controls pass. A170-to240 f2 mutation is rejected. No ODE integration or new scientific admission occurred.

The bounded command completed in1.33seconds, sampled aggregate RSS112.03MiB. The persistent model-flux regression is test_membrane_capacitance_does_not_scale_internal_calcium_flux in the new test_alln_stability.py; it passes the actual model and rejects an artificial Cm factor on Ca_sr. Seven preliminary program tests pass.

## Confirmed correction

Only membrane-current contributions to Ca_i, Ca_ss and Na_i carry the flux-capacitance factor. Calcium uptake, leak, release and transfer do not. At the fixed control state, Ca_sr derivative equals0.0011281062224290917 for both Cm1 andCm0.185, while the Na_i derivative ratio is5.405405405405405. The earlier every-concentration-flux wording is therefore false. Current paperTeX, paperREADME, researchREADME and APscoping docs were corrected. Historical audit records remain unchanged.

Holding Ki fixed modifies the19-state dynamics, rather than restricting them to a conserved-charge leaf. Writing total buffered calcium as Ctot and using the literal unstimulated convention, Q18=Na_i+Ki+2Ctot-Cm^2 V/(F Vc) has derivative Cm/(F Vc)*(IK1+Ito+IKr+IKs-2INaK+IpK), which is minus the omitted Ki derivative. This follows by exact current bookkeeping; internal calcium terms cancel between compartments. The numerical control gives full19charge derivative-2.17e-19 and clamped18 derivative1.27179599e-5, with omitted Ki derivative the negative of that value. The manuscript now states the distinction explicitly. The theorem scope is unchanged.

## Source variants and domain

The targeted source is Erhardt’s18-state smoothed, potassium-clamped model, not the canonical full19TP06 cell. Extracellular Ko5.4, Nao140 andCao2 are fixed reservoirs. Stimulus is exactly zero in the pinned MATLAB target. Power-of-two coordinate scaling is exact and its Jacobian is conjugated by the same diagonal scaling; no physical time rescaling is introduced.

The retained original-author implementation uses f2 denominator170, while the separately pinned correctedCellML uses240 and shorter R/F digits. These variants are not globally identical. The smooth h/j switch is also a model modification, and the concentration capacitance differs from the original-author convention. No variant is silently substituted. At V15 the literal GHK quotient is undefined; pure scalar evaluation raises and the certified Arb wrapper rejects it. The current theorem uses the explicit domain with nonzero divisors; no global GHK extension was introduced. The float NumPy reference can instead emit nonfinite output at exactly15mV, which is untrusted numerical behavior, not a certified acceptance.

## Pinned primary material

The retained MATLAB file is work/cardiac-study/sources/erhardt-code/bifurcation analysis/TP06_18d_endo_bif.m, SHA256 a50f6c08b4360dd257cce389a39ae72fda51e3642641bf5b8e5fced6c2225670. [Pinned author source](https://github.com/andreerhardt/cardiac-dynamics-of-a-human-ventricular-tissue-model-with-focus-on-early-afterdepolarizations/blob/dc78f86fd218418e029ec43d945bcd0fc54b9f1e/bifurcation%20analysis/TP06_18d_endo_bif.m).

- [author-HVM2-index.html](https://bioinformatics.bio.uu.nl/khwjtuss/SourceCodes/HVM2/): retained work/cardiac-study/ap-model-audit/primary-sources/author-HVM2-index.html; SHA256 a104b1f2a217a91495a3245726929b730c9284e0a2cb8e4ba380aee22081a71e.
- [author-Main.cc](https://bioinformatics.bio.uu.nl/khwjtuss/SourceCodes/HVM2/Source/Main.cc): retained work/cardiac-study/ap-model-audit/primary-sources/author-Main.cc; SHA256 0264d2b770ed7d8e01a1631298723f149cf777bfcb4c46c6a9c940c10d8106e3.
- [author-Step.cc](https://bioinformatics.bio.uu.nl/khwjtuss/SourceCodes/HVM2/Source/Step.cc): retained work/cardiac-study/ap-model-audit/primary-sources/author-Step.cc; SHA256 8a305ae719a3a730e7e902a25107de942bb7cc93f6bfecefd6d79d6511f7a61c.
- [author-Variables.cc](https://bioinformatics.bio.uu.nl/khwjtuss/SourceCodes/HVM2/Source/Variables.cc): retained work/cardiac-study/ap-model-audit/primary-sources/author-Variables.cc; SHA256 56c4f2a688cd024ff7107d241dd7ad5144f1d211eb5dad4864bbca38f7d68825.
- [tp06-endo.cellml](https://models.cellml.org/workspace/604/rawfile/de5a4e600b57c8b9b0bd477695648c82351bc6dd/ten_tusscher_model_2006_endo.cellml): retained work/cardiac-study/ap-model-audit/primary-sources/tp06-endo.cellml; SHA256 317a1dc029d7914017709d2e3556df6ce9c8473bf3149c4af279e869b63f2daa.
- [TNNP-unit-fixes.pdf](https://models.cellml.org/workspace/604/rawfile/de5a4e600b57c8b9b0bd477695648c82351bc6dd/TNNP_unit_fixes.pdf): retained work/cardiac-study/ap-model-audit/primary-sources/TNNP-unit-fixes.pdf; SHA256 96ccd5e449a78357e97a24dad648d93bcfb15de0791c3cb8511a4aa7f1998dec.
- [barral-units-supplement.pdf](https://www.frontiersin.org/api/v4/articles/879035/file/Presentation_1.pdf/879035_supplementary-materials_presentations_1_pdf/1): retained work/cardiac-study/ap-model-audit/primary-sources/barral-units-supplement.pdf; SHA256 203872293c76b676a29db2a4af352fb5f28efb9defac1e2c09cdbc28c5774d7f.

All seven retained primary byte hashes were checked against the prior source manifest. Current web retrieval attempts failed in the browser tool, so this audit uses those already pinned primary bytes; it does not claim a fresh remote retrieval. Prior complete model-choice and charge audits were read first.

## Frozen bytes and evidence

All seven model/infrastructure files below are byte-identical to currentHEAD. No accepted proof source or result was edited.
- research/cardiac-cycle-certificates/model/tp06_18d.py: 76f7466a81d9498dd2d9b8d139f2c48667b7e33fad2c35a5eb61ab62f00620b9
- research/cardiac-cycle-certificates/model/tp06_capd.hpp: 4eece8e152aaa8a70f35ed2d81bc71bbd505d381deb0d03acecfa7fe23f90549
- research/cardiac-cycle-certificates/model/setup.hpp: 90e7e6cc791f04bdb2a1a589a154be5fd0cd91c265a1e4dc1e96d62e9efd8357
- research/cardiac-cycle-certificates/model/scales.txt: 3ecc919b74bdc5889457d79292696be957442ae3de4bc55584feeb709bc855d0
- research/cardiac-cycle-certificates/fourier/tp06_18d_arb.py: cb010d494ec54c8681684f10668cb4eed0329589e90ccf1498229bd4bd07b819
- research/cardiac-cycle-certificates/fourier/arbmodel.py: 7f5838e3d0bad1991f7ca5ce0ba43288ac3cbe252ddd8cbff074b5180bc669e7
- research/cardiac-cycle-certificates/fourier/test_arbmodel.py: 2b2a1a0dffab2b323ba135131f03ab142538d14cf37dc722f8262200bf0a4bce

Actual numerical receipt: translation-controls.json; source: check_translation.py; bounded supervisor receipt: /private/tmp/cardiac-model-translation-audit-2026-10-03.log.receipt.json. The allN/cable spectra remain untrusted in /private/tmp/cardiac-alln-spectrum-pilot-2026-10-03.json.

New preliminary research files:
- research/cardiac-cycle-certificates/fourier/LEMMAS-alln-stability.md: 51b303859a9c26cef4a4208a93453f3404b50c0b76da143e7de5ab50d7aa91b8
- research/cardiac-cycle-certificates/fourier/alln_stability.py: 6a5400fe58ef75fea3e83bc5cb08acecbcaec93c17b724639a5cd43843d66271
- research/cardiac-cycle-certificates/fourier/test_alln_stability.py: 9d3642b067fcb3b641a0d6f4b83f25e31b3bf60c433ead14f14b78da45655bb1
