# Repository automation checks

The timestamp and volunteer-ledger workflows propose generated changes as pull requests. They never merge those proposals. Submitted vortex results are independently re-verified from the base branch, including renamed files; symlink replacements are refused.

For bot proposals to trigger ordinary `pull_request` checks, configure a separate repository secret named `AUTOMATION_TOKEN`. Use a fine-grained token restricted to **GENChase**, with **Contents: read and write** and **Pull requests: read and write**. The checkout and PR creation use the same token, so updates to an existing proposal also trigger the normal checks. Those events include the usual CodeQL and Pages checks. Keep an appropriate expiry and rotate the secret when needed. No administration permission is required.

Do not repurpose `PAPERS_TOKEN`: it is for the eight companion repositories and their publication workflow. No existing credential is copied or granted additional repository access by this change.

Without `AUTOMATION_TOKEN`, the workflows retain the built-in `GITHUB_TOKEN` path and explicitly dispatch the check and Pages workflows. Those runs validate the candidate branch, but **workflow-dispatch checks do not satisfy required PR check contexts**. The workflow reports this configuration limitation instead of claiming that the PR is ready to merge. See [GitHub's required-check documentation](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks) and [workflow triggering with tokens](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

The read-only preprint monitor downloads all eight registered Zenodo source archives and checks titles, Publication / Preprint type, component-rights metadata and the manuscript PDF bytes. It runs weekly and can be dispatched manually. It publishes no records, changes no release assets and never archives GENChase on Zenodo.

`node tools/automation-check.js` exercises the actual shell steps against local Git remotes and a mock GitHub CLI, covering configured-token and built-in-token paths, no-op runs, PR creation/update, dispatch failures, renamed submissions and symlink refusal. These fixtures do not verify a live token's permissions.

With the owner's approval, `AUTOMATION_TOKEN` was configured on 2026-09-29. GitHub's form confirmed one selected repository, Contents and Pull requests write access, and required Metadata read access. The encrypted repository-secret listing confirms it was saved; `PAPERS_TOKEN` was not changed. It expires on **2026-10-29** and must be rotated before then. Token creation and storage are distinct from verifying a live automation-created PR's check events.
