# Protecting unpublished results

This is how the project records that a result existed before it is published, without publishing
it. The tools are `tools/commit-hash.js` and `tools/verify-commitment.js`; the public record is
[identities/COMMITMENTS.txt](../identities/COMMITMENTS.txt). [PUBLISHING.md](PUBLISHING.md) covers the
software DOI and [PUBLISHING-PAPERS.md](PUBLISHING-PAPERS.md) the papers.

## What a commitment proves, and what it does not

A commitment is a SHA-256 hash of a private file mixed with a 32-byte random salt:

    commitment = SHA-256("GENChase commitment v1\n" || salt || file bytes)

Publishing the commitment reveals nothing about the file. Later, publishing the file and the salt
lets anyone recompute the hash and see that these exact bytes were committed on the date the ledger
line was timestamped. The salt matters: without it, a short statement (one formula, one number)
could be recovered by hashing guesses until one matches.

- **It proves existence at a date, not ownership.** It is evidence for a priority claim. It does not
  stop anyone from reading, using or building on a result once that result is public.
- **The ledger date is written by your own computer.** A git commit date can be set to anything.
  Independent evidence of the date comes from the OpenTimestamps proof beside each stamp file
  (anchored in the Bitcoin blockchain), and from every Zenodo release, which archives the ledger
  with a DOI and Zenodo's own date.
- **Priority in science comes from public, dated disclosure:** arXiv, a journal, a Zenodo record.
  A commitment covers the time between having a result and publishing it; it is not a substitute
  for publishing.
- **Legal background, not legal advice.** Copyright protects the text of a paper and the code, not
  the mathematics. Under 17 U.S.C. § 102(b), protection never extends to any "idea, procedure,
  process, system, method of operation, concept, principle, or discovery" (the idea and expression
  line of *Baker v. Selden*, 101 U.S. 99 (1879)). Mathematical formulas and abstract ideas are not
  patent-eligible (*Gottschalk v. Benson*, 409 U.S. 63 (1972); *Parker v. Flook*, 437 U.S. 584
  (1978); *Alice Corp. v. CLS Bank International*, 573 U.S. 208 (2014)). The code is Apache-2.0,
  whose section 4(d) requires anyone who distributes a derivative to carry the attribution notices
  in [NOTICE](../NOTICE). For a result itself, the protection is credit: plagiarism is research
  misconduct, and a dated record is what lets you show who had it first.

## Where unpublished work lives

**Never push an unpublished result to this repository.** While the repository is public, a push is
publication: every branch, pull request, issue, commit message and Actions log is visible, and
clones, forks and archives keep what they saw. Making the repository private later recalls none of it.

Keep drafts outside the repository: a folder on your computer, or better, a separate **private**
repository (for example `SharpMeow/GENChase-lab`) that you back up. The folder `private/` in this
repository is ignored by git as a convenience, and `tools/commit-hash.js` accepts files there, but a
folder outside the repository is safer: one `git add -f`, or a tool that commits everything, would
publish an ignored file too.

### Switching this repository between public and private

GitHub documents these consequences
([Setting repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)):

Public to private:
- stars and watchers are erased;
- public forks stay public and are detached into their own network;
- on GitHub Free, the published Pages site (the studio at sharpmeow.github.io/GENChase) is unpublished;
- code scanning (the CodeQL check) stops unless GitHub Code Security is enabled for the repository;
- the repository leaves the GitHub Archive Program.

Private to public:
- all code and its whole history, and all Actions history and logs, become visible to everyone;
- stars and watchers are erased again.

Two further costs matter here. GitHub Actions is free for public repositories only; a private one
spends the account's monthly minutes, and this repository's check workflow runs 32 jobs on every
push and pull request. And Zenodo's GitHub integration works with public repositories only, so a release made while
the repository is private is not archived and gets no DOI.

**Recommendation:** keep GENChase public, keep unpublished work in a separate private repository,
and commit hashes here. Nothing is lost by that, and nothing is exposed.

## Committing to a result

1. Optional, once: `pip install opentimestamps-client`, so the timestamp is made the moment you
   commit. Without it, the timestamps workflow makes it after your pull request merges.
2. Commit:

   ```
   node tools/commit-hash.js ~/genchase-lab/new-bound.typ --label "vortex note, draft 1"
   ```

   The label is public. It says what kind of thing this is, never the result. The tool writes:
   - one `commit` line in `identities/COMMITMENTS.txt`;
   - `identities/commitments/<id>.txt`, a copy of that line, which is the file the timestamp covers;
   - `identities/commitments/<id>.txt.ots`, the OpenTimestamps proof, when the client is installed;
   - a **private record**, `new-bound.typ.<id>.commitment.json`, beside your file. It holds the salt.
3. **Back up the private record together with the file, byte for byte.** Without the salt the
   commitment can never be proven, and a file changed by even one byte no longer matches. To record
   a new draft, commit again; each commitment is independent.
4. Add the ledger, the stamp file and the proof in a pull request and merge it. The tool prints the
   `git add` line. It refuses a file, or a record, inside this repository that git would track.
5. Within a day of the merge, the **timestamps workflow** stamps any commitment that arrived without
   a proof and completes pending proofs once Bitcoin has confirmed them (a few hours after
   stamping). It proposes the new `.ots` files in a pull request titled "OpenTimestamps proofs for
   the commitment ledger" and starts the checks on it. Merge that too.
6. Every Zenodo release archives the ledger and its proofs with a DOI, which is one more
   independent, dated copy.

## Revealing

When the result is published (arXiv, a journal, a Zenodo record), reveal the commitment:

```
node tools/commit-hash.js --reveal ~/genchase-lab/new-bound.typ.<id>.commitment.json --published "arXiv:2610.01234"
```

It checks that the file still matches, copies the file and its salt into `identities/revealed/<id>/`,
and appends a `reveal` line. Merge that in a pull request. Anyone can then run:

```
node tools/verify-commitment.js --revealed <id>
```

## Checking a commitment without this repository's code

Anyone can check a revealed commitment with standard tools. With Python:

```
python3 -c "import hashlib,sys; print(hashlib.sha256(b'GENChase commitment v1\n'+bytes.fromhex(sys.argv[1])+open(sys.argv[2],'rb').read()).hexdigest())" SALT_HEX FILE
```

or with a shell that has `xxd` (macOS has it; on Linux it is the `xxd` or `vim` package):

```
{ printf 'GENChase commitment v1\n'; printf '%s' "$SALT_HEX" | xxd -r -p; cat FILE; } | sha256sum
```

The result must appear on a `commit` line of `identities/COMMITMENTS.txt`. The date comes from the
proof: `ots verify identities/commitments/<id>.txt.ots` (full verification needs a Bitcoin Core node,
and a pruned one is enough), or drop the `.txt` file and its `.ots` on opentimestamps.org.

With this repository, `node tools/verify-commitment.js FILE --salt SALT_HEX` does the same and also
names the git commit that first added the line. Before revealing, check your own file with
`--record <private record>` instead of `--salt`.

## What runs automatically

- `npm test`, and so every CI run: `tools/commitment-check.js`, a self-test of both tools with
  negative controls (an edited file, a wrong salt, an edited ledger line, a missing stamp, a
  committed private record, a changed revealed file must all fail), and
  `node tools/verify-commitment.js --all`, which checks the ledger, its stamp files and every reveal,
  and fails if any `*.commitment.json` record is committed.
- The timestamps workflow (`.github/workflows/timestamps.yml`): after every merge that touches the
  ledger, and daily.
- The release workflow runs `node tools/verify-commitment.js --all` before it builds a release.

## Zenodo

Every published Zenodo record gets a DOI. A GitHub release archived by Zenodo gets one for that
version, plus a concept DOI that always resolves to the latest version. For a manual upload, the
form can reserve a DOI before publishing ("Get a DOI now!"), so it can be printed in the paper; the
reserved DOI is registered only when the record is published, and it is lost if the draft is
deleted. A manual upload can also be published with its files restricted or embargoed, so the record
and its date are public while the files open only when you choose. PUBLISHING.md has the steps for
the software DOI.
