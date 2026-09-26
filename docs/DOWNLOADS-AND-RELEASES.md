# Browser studio and offline releases

Use [Start here](https://chasehendrick.github.io/GENChase/start.html) to choose a pattern,
make a first print, download an offline copy, or find a contribution path. The direct
[studio link](https://chasehendrick.github.io/GENChase/) still opens the app immediately
and existing recipe links remain valid.

## For artists

Download `GENChase-studio.zip` from the [latest release](https://github.com/ChaseHendrick/GENChase/releases/latest),
extract it, and open `GENChase/START-HERE.html`. Keep the folder together. The bundle
contains the self-contained studio, introductory examples, licenses, and recorded
scientific evidence. It needs no server or development tools. Keep `VERSION.json`
with saved recipes when the exact software version matters.

The source archive is for people who want the local checker, source modules, or
development tools. It includes the optional Python launchers. Making artwork in
the browser or offline bundle does not require Python, Node.js, or a GitHub account.

## For testing and contributions

From a source checkout, install Node.js 22 or newer, then run:

```sh
npm run setup:checks
npm run validator
```

The setup command explicitly installs the pinned optional Playwright/axe tools and
Chromium. It does not run a scientific job, install a native experiment backend, or
upload data. Linux may need the system browser libraries described in
[BUILDING.md](../BUILDING.md). Fast development checks remain `npm test`, with no install.

To share results, install GitHub CLI and run `gh auth login`. Choose files under
**Share results**, or explicitly enable automatic sharing for one run. The
[local checker guide](../apps/validate/README.md) describes platform support,
privacy, recovery and the difference between completed execution and scientific coverage.

## Maintainer release process

GitHub Pages uses **GitHub Actions** as its publishing source. The
[Pages workflow](../.github/workflows/pages.yml) checks the maintained build,
scientific inventory and catalog, then uploads a snapshot of tracked files.
Pull requests build the same artifact without deploying. Pushes to `main` and
manual runs on `main` deploy through the protected `github-pages` environment.
Local dependencies, credentials and untracked volunteer files are not copied.

The start page and studio update together after a merge. `DEPLOYMENT.json` on
the live site identifies the exact deployed commit and workflow run. To recover
a deployment, rerun the Pages workflow on `main`. Keep Settings > Pages > Source
set to **GitHub Actions**. Do not replace the studio root with the start page:
that would break saved recipe links.

Releases use `MAJOR.MINOR.PATCH`, starting at `0.4.1`, written without a leading v
(`0.8.0`, not `v0.8.0`; owner's decision, 2026-09-26). The releases made before that
decision keep their tags, `v0.4.1` to `v0.7.1`; a tag is never renamed, and a link
to one of those releases uses its real tag. Patch numbers identify
fixes, and minor numbers identify new features. During the initial `0.x` series,
minor releases may also change compatibility; their notes must explain this.
A future `1.0.0` will mark the declared stable software interface. These software
versions are independent of recipe/API versions and scientific validation status.
Dates belong in [CHANGELOG.md](../CHANGELOG.md) and release notes, not version names.
`0.4.1` is the first public release in this series. The earlier calendar-named
release is withdrawn when 0.4.1 is published; the latest download link follows
the numbered release.

The release workflow is manually dispatched with a version such as `0.8.0`.
It checks the selected main commit, creates the deterministic offline ZIP and a
SHA-256 checksum, tests the extracted bundle in Chromium, and publishes assets
on a GitHub Release. It refuses a version written with a leading v, and a version
already tagged under either spelling (`0.7.1` or `v0.7.1`), so older releases stay
immutable.
Release notes identify the exact commit and link its scientific evidence.

Build a local preview without publishing:

```sh
python3 tools/package-release.py --version 0.4.1
node tools/distribution-check.js tools/dist/release/GENChase-studio.zip
```

The package uses an explicit file list and tracked validation evidence. Local run
logs, credentials, node_modules, checkpoints, and volunteer submissions are not
included. Its fixed timestamps and sorted entries make identical input reproducible.
A dirty local preview records `workingTreeModified: true`; the publication workflow
requires a clean tracked checkout. A release is a software distribution, not a claim
that every technique is scientifically validated.
