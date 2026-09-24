# Signed release tags

A release tag names one commit, and a commit hash fixes every file in it. A signed tag adds proof
that the holder of your key made that release. GitHub shows it as Verified, anyone can check it
with git, and with the Zenodo archive of the same release you have a signed, dated, independently
archived snapshot of the whole project. `tools/tag-release.js` makes and checks these tags;
[COMMITMENTS.md](COMMITMENTS.md) covers results that are not yet public.

## One-time setup, on your own computer

Do this on your machine, never in a cloud session: the private key must never leave your computer.
You need git 2.34 or newer (`git --version`) and `ssh-keygen`, which comes with macOS, Linux and
Git for Windows.

1. **Make a signing key**, with a passphrase:

   ```
   ssh-keygen -t ed25519 -C "GENChase release signing" -f ~/.ssh/genchase_signing
   ```

2. **Tell git to sign with it.** In your clone of GENChase (add `--global` to use it everywhere):

   ```
   git config gpg.format ssh
   git config user.signingkey "$HOME/.ssh/genchase_signing"
   git config tag.gpgSign true
   git config user.name Chaos
   git config user.email 326338179+SharpMeow@users.noreply.github.com
   ```

   The name and email are the project identity in AGENTS.md; a tag made under any other identity
   is refused. On Windows, in PowerShell, write the key path as `"$HOME\.ssh\genchase_signing"`.

3. **Register the key with GitHub**, so tags show as Verified: Settings, SSH and GPG keys, New SSH
   key, key type **Signing Key**, and paste the contents of `~/.ssh/genchase_signing.pub`.

4. **Register the key in the repository**, in a pull request. Add one line to
   [identities/allowed_signers](../identities/allowed_signers):

   ```
   printf '%s namespaces="git" %s\n' 326338179+SharpMeow@users.noreply.github.com "$(cut -d' ' -f1,2 ~/.ssh/genchase_signing.pub)" >> identities/allowed_signers
   ```

   Once that merges, signing is required: the release workflow refuses an unsigned release tag,
   and the tag signature workflow fails for any pushed tag that is unsigned or signed by another key.

## Each release

1. Prepare it as [PUBLISHING.md](PUBLISHING.md) says: a pull request that sets `version` and
   `date-released` in `CITATION.cff`, merged, with a green check run on `main`.
2. `git checkout main && git pull`
3. `node tools/tag-release.js vX.Y.Z --dry-run` runs every check without tagging. It checks your
   identity and signing key against `identities/allowed_signers`, a clean tree at `origin/main`, the
   version in `CITATION.cff`, the build, lint, science inventory and the commitment ledger.
4. `node tools/tag-release.js vX.Y.Z` makes the signed tag (ssh-keygen asks for the passphrase) and
   verifies it.
5. `git push origin vX.Y.Z`. The **tag signature** workflow checks the pushed tag.
6. Run the **Publish offline studio** workflow on `main` with the same version. It verifies the tag
   again and publishes the release from that tag. Zenodo archives it while the repository is public.

## Checking a release

Anyone can verify a release tag:

```
git fetch origin tag vX.Y.Z
git -c gpg.ssh.allowedSignersFile=identities/allowed_signers tag -v vX.Y.Z
```

or `node tools/tag-release.js --verify vX.Y.Z --on-main`, which also checks the tagger identity and
that the tagged commit is on `main`. Tags made before signing began (v0.6.2 and earlier) are
lightweight tags that GitHub created, and carry no signature.

## If a key is lost or exposed

Remove its line from `identities/allowed_signers` in a pull request, add the new key, and sign
future tags with the new one. A tag signed with the old key can still be checked against the file
as it was at that tag:

```
git show vX.Y.Z:identities/allowed_signers > /tmp/allowed_signers
git -c gpg.ssh.allowedSignersFile=/tmp/allowed_signers tag -v vX.Y.Z
```

## Signing commits too

Optional: `git config commit.gpgSign true` signs every commit you make with the same key, and GitHub
shows those commits as Verified. Nothing in this repository requires it.

## What runs automatically

- `npm test`, and so every CI run: `tools/signing-check.js` makes throwaway keys in a temporary
  repository and checks that a correctly signed tag passes and that an unsigned tag, a lightweight
  tag, a tag signed by an unlisted key, a tag under another identity, a tag off `main`, a tag
  pointing at the wrong commit, a tag altered after signing and a key listed for the wrong identity
  are all refused.
- `.github/workflows/tags.yml` runs `node tools/tag-release.js --verify <tag> --on-main` on every
  pushed `v*` tag.
- `.github/workflows/release.yml` releases an existing tag only after verifying it, and refuses to
  create an unsigned tag once `identities/allowed_signers` lists a key.
