# Research notebook

Open `apps/research/index.html` from the served checkout, choose **Research notebook** on the start page,
or use the same link in the local validator. This is a static browser tool with no account or API key.

1. Enter a question. Google Scholar, Semantic Scholar, arXiv, PubMed and Crossref links carry your
   search terms only when you open them. Asta, OpenAlex, Elicit, ResearchRabbit and Consensus open their own front
   pages; paste the question there. These are external services, not embedded models. Their access
   rules and prices can change.
2. Record each paper's title, DOI or URL, reading status, supporting pages and limitations. Add the
   actual source instead of treating an AI answer as a paper. Edit entries as you read further.
3. Prepare and inspect a prompt containing your question and notes, then copy it into an assistant of
   your choice. GENChase does not call a model or send the notebook automatically.
4. Download JSON for a backup, or Markdown for a review document. Import validates the format and
   merges entries without replacing your current sources. An existing question is retained; the UI
   reports a different imported question. Browser storage can be cleared or unavailable.

The notebook stores no full-text PDFs and does not certify a review, validate a simulation or establish
originality. Source access and reading status are self-reported. External links open separately and
suppress the referring page. Notes remain in browser storage until exported or manually shared.

## Gaps addressed and next candidates

GENChase already has seeded numerical solvers, a compositional pattern-producing network, local
validation jobs, and a Google Scholar query list for generated candidates. The missing pieces were
cross-engine source discovery, a review ledger independent of running a job, and a portable source
packet for AI-assisted review. The notebook supplies those pieces without adding a hosted model
service or a second simulation architecture.

A learning/associative-memory simulation is a separate scientific feature. Further candidates include
self-organizing maps and reservoir computing, each needing a stated learning rule, independent
numerical checks and held-out evaluation before claims about performance. A link to an AI service
is not evidence that GENChase has implemented its model.

Provider references inspected on 2026-09-29:
[Google Scholar help](https://scholar.google.com/intl/en/scholar/help.html),
[Semantic Scholar FAQ](https://www.semanticscholar.org/faq),
[arXiv search](https://arxiv.org/search/), [PubMed help](https://pubmed.ncbi.nlm.nih.gov/help/),
[Crossref metadata search](https://search.crossref.org/), [Elicit](https://elicit.com/),
[ResearchRabbit](https://www.researchrabbit.ai/), [Consensus](https://consensus.app/).
Search-result access was not verified for every provider; some sites refused automated requests.
No claim is made about completeness, paid features, accuracy or continued availability.

## Checks

`node --test apps/research/model.test.js` checks imports, source URLs, query encoding and prompt content.
`node tools/research-notebook-check.js` runs a real browser against the local validator, including
persistence, editing, unsafe input, import/export, mobile overflow and no unsolicited network requests.

## Current research engines

The directory includes [Ai2 Asta](https://allenai.org/asta/agents) for agent-assisted discovery, synthesis
and data analysis, and [Elicit Research Agent](https://elicit.com/blog/introducing-elicit-research-agent),
whose current release announcement is dated August 4, 2026. Their published feature descriptions were
checked on September 29, 2026; GENChase does not reproduce their proprietary engines or imply that
provider claims constitute independent validation. [OpenAlex](https://help.openalex.org/data/works/)
adds an open scholarly graph for citation exploration. These complement exact title/DOI searches and
disciplinary preprint indexes rather than establishing exhaustive literature coverage.
