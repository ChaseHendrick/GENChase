# Private copies of the paper

The paper in this repository has no contact email, and that is deliberate: the author's email must never be committed here, and it must not appear in a commit message, a pull request or a release either. Journals and arXiv need a corresponding-author email, so the author keeps **private copies** outside the repository that add one line under the affiliation.

## What the private copies are

| File | Built from | Used for |
|---|---|---|
| `Hendrick-minimal-winding-v1.pdf` | the Typst source, [`../unequal-mu-n5-floors-2026-09-23.typ`](../unequal-mu-n5-floors-2026-09-23.typ) | a PDF-only arXiv upload, sending to readers |
| `Hendrick-minimal-winding-v1.tex` | the LaTeX source, [`../unequal-mu-n5-floors-2026-09-23.tex`](../unequal-mu-n5-floors-2026-09-23.tex) | arXiv source upload, journals |
| `Hendrick-minimal-winding-v1-latex.pdf` | the private `.tex` | checking what arXiv will build |
| `Hendrick-minimal-winding-v1-latex.zip` | the private `.tex` and `figures/minimal-winding.pdf` | the arXiv source upload |

Each private copy differs from the repository version only in the author block, which gains the email as a `mailto:` link. The private `.tex` also drops the four maintenance comment lines at the top of the repository `.tex`, so its source shows nothing that its PDF does not. The page counts match the repository builds: 13 pages for Typst, 12 for LaTeX.

## Rebuilding them after the paper changes

Rebuild the private copies whenever the paper text changes, so they never drift from the repository version. Replace `you@example.com` with the real address **only in the copies**, never in a file under version control.

Typst (the compiler only reads files inside the project, so the temporary file sits in `research/`; `.gitignore` excludes it):

```
cp research/unequal-mu-n5-floors-2026-09-23.typ research/_private.typ
# In research/_private.typ, replace
#   #text(size: 9.5pt)[Independent researcher]
# with
#   #text(size: 9.5pt)[Independent researcher \ #link("mailto:you@example.com")[you\@example.com]]
# (the @ in the visible text must be escaped as \@)
python3 -c "import typst; typst.compile('research/_private.typ', output='../Hendrick-minimal-winding-v1.pdf', root='.')"
rm research/_private.typ
```

LaTeX (build outside the repository):

```
mkdir -p ~/private-paper/figures
tail -n +5 research/unequal-mu-n5-floors-2026-09-23.tex > ~/private-paper/Hendrick-minimal-winding-v1.tex
cp research/figures/minimal-winding.pdf ~/private-paper/figures/
# In ~/private-paper/Hendrick-minimal-winding-v1.tex, replace
#   \author{Chase Hendrick\\[0.2em] {\small Independent researcher}}
# with
#   \author{Chase Hendrick\\[0.2em] {\small Independent researcher}\\ {\small\href{mailto:you@example.com}{\texttt{you@example.com}}}}
cd ~/private-paper
for i in 1 2 3; do pdflatex Hendrick-minimal-winding-v1.tex; done   # the third run settles the cross-references
zip Hendrick-minimal-winding-v1-latex.zip Hendrick-minimal-winding-v1.tex figures/minimal-winding.pdf
```

## Checks before any commit, push or release

- `git grep -n -I -E 'mailto:[A-Za-z0-9._%+-]+@' -- ':!research/submission/PRIVATE-COPIES.md'` prints nothing. This finds any email written as a link; also search for the address itself.
- `git status` lists no `_private.typ` and no `Hendrick-minimal-winding-*` file. `.gitignore` excludes both names as a safety net, but do not rely on it.
- The drafts in this folder (the endorsement request and the cover letter) keep the placeholder `[your email]`. Fill it in only in the copy you send.
- Release notes and pull request text never quote the address.
