# New preprint release status, 2026-09-29

PR [252](https://github.com/ChaseHendrick/GENChase/pull/252) merged as `94d4dfdf7cb051d12fed0aa883c680c5a352d7d3` after 43 successful checks on the exact reviewed head, with no unresolved review threads. All eight releases below were dispatched sequentially through `papers.yml` on that merge commit. Every workflow succeeded.

The actual GitHub source ZIP for each release was downloaded. Each contains exactly one registered manuscript PDF, byte-identical to the reviewed repository PDF. Titles match the registry exactly. The archived `.zenodo.json` declares Publication / Preprint, `other-closed`, manuscript/figure rights reserved, Apache 2.0 code/data and scoped component exceptions. Rank-window additionally discloses the CC BY-NC 4.0 derived outputs. Complete PDF and ZIP SHA-256 hashes are in [the machine-readable audit](paper-github-release-audit-2026-09-29-figures.json).

| Paper | New GitHub release | Source ZIP PDF | Zenodo |
|---|---|---|---|
| minimal-winding | [2.2.3](https://github.com/ChaseHendrick/minimal-winding/releases/tag/2.2.3) | Exact reviewed bytes | [Verified 23048226](https://zenodo.org/records/23048226) |
| collapse-without-rotation | [1.0.3](https://github.com/ChaseHendrick/collapse-without-rotation/releases/tag/1.0.3) | Exact reviewed bytes | [Verified 23048227](https://zenodo.org/records/23048227) |
| stable-expansion | [1.0.3](https://github.com/ChaseHendrick/stable-expansion/releases/tag/1.0.3) | Exact reviewed bytes | [Verified 23048228](https://zenodo.org/records/23048228) |
| rank-window | [1.0.3](https://github.com/ChaseHendrick/rank-window/releases/tag/1.0.3) | Exact reviewed bytes | [Verified 23048232](https://zenodo.org/records/23048232) |
| hh-dynamics | [1.0.4](https://github.com/ChaseHendrick/hh-dynamics/releases/tag/1.0.4) | Exact reviewed bytes | [Verified 23048238](https://zenodo.org/records/23048238) |
| double-pendulum | [1.0.3](https://github.com/ChaseHendrick/double-pendulum/releases/tag/1.0.3) | Exact reviewed bytes | [Verified 23048242](https://zenodo.org/records/23048242) |
| nf-pulse | [1.0.4](https://github.com/ChaseHendrick/nf-pulse/releases/tag/1.0.4) | Exact reviewed bytes | [Verified 23048253](https://zenodo.org/records/23048253) |
| hh-pulse | [1.0.3](https://github.com/ChaseHendrick/hh-pulse/releases/tag/1.0.3) | Exact reviewed bytes | [Verified 23048254](https://zenodo.org/records/23048254) |

## Completed Zenodo verification

At 23:31 UTC, all eight expected versions were public. Each actual Zenodo ZIP was downloaded, opened and checked against the exact reviewed repository PDF. All PDF hashes match; every record has the exact registered title, Publication / Preprint type, `other-closed` license category, scoped component-rights disclosure and open public file access. The license category is distinct from file accessibility. The complete record URLs, versions, ZIP hashes and embedded PDF hashes are in [the Zenodo audit](paper-zenodo-release-audit-2026-09-29-figures.json).

Earlier receipt observations were retained in the working audit: the minimal-winding release-created webhook returned HTTP 202 at 22:55:03 UTC, and the integration displayed hh-pulse 1.0.3 as Received around 23:01 UTC. The initial public version endpoints still showed prior versions. These observations preceded the completed archive checks and were never treated as publication evidence.

Older immutable releases and archives are retained. The checking DOIs printed in the released PDFs continue to identify their immutable prior supporting archives. GENChase itself was not deposited on Zenodo. The verified new version DOIs are available for registry writeback without rebuilding or changing these released PDF bytes.
