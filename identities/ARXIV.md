# Submitting the note

The compiled note is [`note.pdf`](note.pdf). Typst source is [`note.typ`](note.typ). Canonical byte-exact statements are [`STATEMENTS.txt`](STATEMENTS.txt). SHA-256 fingerprints are [`HASHES.txt`](HASHES.txt).

**Audit correction (2026-09-20):** the frozen note contains priority claims not established by the literature review. Prepare a corrected version incorporating [NOVELTY-AUDIT.md](NOVELTY-AUDIT.md) and the [explicit Gröbli comparison](ORIGINALITY-FOLLOWUP.md) before a new submission; preserve the archived original and its hashes. Dates below refer to GENChase records, not proven first discovery.

## GitHub release

Created after this lands on `main`, tag `identities-2026-09-20`, attaching `note.pdf`, `STATEMENTS.txt`, and `HASHES.txt`. That release is the citable snapshot. GitHub's timestamp on the tag is a public date.

## Zenodo DOI (one sitting)

1. Sign in at [zenodo.org](https://zenodo.org) with the SharpMeow GitHub account.
2. GitHub → Settings → Applications → Authorized OAuth Apps → Zenodo, or Zenodo → GitHub → connect.
3. In Zenodo, flip SharpMeow/GENChase on.
4. Push (or retag) the release `identities-2026-09-20`. Zenodo mints a DOI on that release and keeps a snapshot.
5. Put the DOI in `CITATION.cff` (`doi:`) and in the cite blocks of `IDENTITIES.md`.

`.zenodo.json` at the repository root already names the three identities and the author Chaos, so the landing page is not a blank software dump.

## arXiv (one sitting)

arXiv wants TeX when it can get it. This note is Typst. Upload the PDF as the only source, or convert `note.typ` to LaTeX first.

- Category: `physics.flu-dyn`. Secondary: `math.DS`.
- Title: Closed forms and sharp minima of ω t_c on three classical point-vortex collapse families
- Authors: Chaos (the GENChase author name; arXiv will ask for an email)
- Comments: 4 pages. Recorded in GENChase: Three-vortex collapse bound 2026-09-19; parallelogram lock and quincunx lock 2026-09-20. Source: https://github.com/SharpMeow/GENChase
- License on arXiv: arXiv.org perpetual non-exclusive license, or CC BY 4.0 if offered. Do not relicense the GENChase software; this is the note.
- Abstract (plain text):

Self-similar collapse of N point vortices is classical. Gröbli (1877) and Novikov-Sedov (1979) found the families; Aref (2010) and Gotoda (2020) wrote the collapse rate A and the spin B as separate functions of a shape angle. Their dimensionless product omega_0 t_c = -B/(2A) is the pitch of the logarithmic spiral the configuration traces as it shrinks. This note records three closed forms of that product, each with a unique algebraic interior minimum. No earlier exact minima were located in the sources inspected, but historical priority remains unconfirmed. Three-vortex collapse bound, on Gröbli's Gamma = (1,1,-1/2) family: omega_0 t_c = (2 - cos^2 theta)/sin(2 theta) >= sqrt(2), equality at tan theta = 1/sqrt(2). The parallelogram lock, on the Novikov-Sedov four-vortex parallelogram: omega_0 t_c = (sqrt(3)/4)(4 - cos 2 theta)/sin(2 theta) >= 3 sqrt(5)/4, equality at cos 2 theta = 1/4. The quincunx lock, on the Novikov-Sedov five-vortex quincunx: omega_0 t_c = (3/16)(7 - 4 cos 2 theta)/sin(2 theta) >= 3 sqrt(33)/16, equality at cos 2 theta = 4/7. The names are project labels; cite the underlying classical sources as well as this derivation.

Until an arXiv id or a Zenodo DOI exists, cite the GitHub file and the release tag.
