# Release checklist

1. Review the complete diff, including generated entry points and validation records.
   Confirm third-party notices and new dependencies are accounted for.
2. Run the checks for the changed areas in [TESTING.md](../TESTING.md). Preserve every
   scientific CI job. Record hardware/parameter/precision limits honestly.
3. Confirm recipe version/default migrations, mobile recovery controls and real print
   exports. For prepress changes, inspect files with independent readers and run the
   native conversion fixture. A file-format pass is not a printer's approval.
4. Update README and focused guides to describe the shipped behavior and limitations.
   Do not call partial scientific evidence full validation or an established identity novel.
5. Wait for every required check on the exact pull-request head, then squash-merge
   using the repository author identity in AGENTS.md. Do not merge a stale tested head.
6. Verify the GitHub Pages build and [hosted studio](https://sharpmeow.github.io/GENChase/).
   Open a technique, its science report and print setup at a narrow viewport. Check
   the README link and repository homepage still point to the deployed studio.
7. If a regression ships, create a focused fix or revert commit and run the relevant
   checks. Do not force-push published history or silently downgrade scientific checks.

GitHub Pages serves the `main` branch root. `.nojekyll` keeps the static folder build
unchanged by Jekyll. The portable `dist/studio.html` is a separate offline fallback.
No deployment secrets or runtime server are required.
