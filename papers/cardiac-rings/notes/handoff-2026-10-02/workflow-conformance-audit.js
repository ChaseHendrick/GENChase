export const meta = {
  name: 'cardiac-rings-conformance-audit',
  description: 'Read-only audit of papers/cardiac-rings against the eight released papers and the quality bar, with each finding adversarially verified',
  phases: [
    { title: 'Survey', detail: 'one auditor per dimension compares cardiac-rings with the released papers' },
    { title: 'Verify', detail: 'a skeptic checks each finding against the files' },
    { title: 'Critic', detail: 'completeness critic looks for dimensions not covered' },
  ],
}

const COMMON = `You are auditing the draft manuscript and companion folder papers/cardiac-rings/ in the GENChase repository at /home/user/GENChase (READ-ONLY: do not edit, create or delete any file in the repository; you may write scratch files only under /tmp/claude-0/-home-user-GENChase/8e652c2a-6f64-5009-9ee8-187ba6394e5c/scratchpad/audit/). The goal: cardiac-rings must resemble the eight released papers in form and conventions, and meet the repository's quality bar, before it is published as a preprint. The released papers, each a folder under papers/: minimal-winding, collapse-without-rotation, stable-expansion, rank-window, hh-dynamics, double-pendulum, nf-pulse (all LaTeX) and hh-pulse (Markdown via Pandoc). The rules are in AGENTS.md, docs/PUBLISHING-PAPERS.md (sections 0 and 1, the AI statement rule, the rule for sources that could not be obtained), papers/papers.json, tools/paper-check.js and tools/paper-sync.js. The cardiac-rings study lives in research/cardiac-cycle-certificates/; the paper's code/ and data/ are copies of it. Note: another agent is right now adding an every-N existence theorem and a phase-reduction remark to papers/cardiac-rings/paper/cardiac-rings.tex and its code/data copies; do not report the half-finished state of that new material, but do report conventions it must follow. Do not run heavy computations or rebuild PDFs (other jobs use the CPU); you may use pdftotext/pdfinfo on existing PDFs, grep, and read files. Report only differences or defects you have seen in the files, each with exact locations (file and line or section) and the released paper(s) that show the convention. Never invent a convention: if the released papers disagree among themselves, say so and name which papers do what. Severity: must = violates a written rule or a check, or would mislead a reader; should = departs from the convention all or most released papers follow; nit = cosmetic.`

const FINDINGS = {
  type: 'object',
  properties: {
    dimension: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          severity: { type: 'string', enum: ['must', 'should', 'nit'] },
          file: { type: 'string' },
          location: { type: 'string' },
          observed: { type: 'string' },
          convention: { type: 'string', description: 'what the released papers do, naming which ones, with file:line evidence' },
          proposed_fix: { type: 'string' },
        },
        required: ['id', 'severity', 'file', 'location', 'observed', 'convention', 'proposed_fix'],
      },
    },
    checked_and_fine: { type: 'array', items: { type: 'string' } },
  },
  required: ['dimension', 'findings', 'checked_and_fine'],
}

const VERDICT = {
  type: 'object',
  properties: {
    real: { type: 'boolean' },
    severity: { type: 'string', enum: ['must', 'should', 'nit', 'none'] },
    reason: { type: 'string' },
    corrected_fix: { type: 'string', description: 'the fix as it should be applied, or empty if the proposed fix is right' },
  },
  required: ['real', 'severity', 'reason', 'corrected_fix'],
}

const DIMENSIONS = [
  { key: 'front-matter', prompt: `Dimension: front matter and document setup of the LaTeX manuscript. Compare papers/cardiac-rings/paper/cardiac-rings.tex with the seven LaTeX papers: document class and options, packages, fonts, page geometry, title formatting, author block (name, affiliation line, ORCID, email as in papers/papers.json author), date line (several released papers removed theirs), abstract environment, keywords or MSC codes if the others have them, the header comment stating how the PDF is built (several now say Tectonic), theorem/lemma environments and numbering, the "Labels" convention (Proved / Computer-assisted / Numerical) and how claims are labelled, section order (Introduction, results, methods, limitations, discussion), and the status/draft wording anywhere in the source or PDF.` },
  { key: 'end-matter', prompt: `Dimension: end matter and references. Compare the end of papers/cardiac-rings/paper/cardiac-rings.tex with the released papers: Data availability paragraph (the released papers cite the companion URL https://github.com/ChaseHendrick/<id> and their Zenodo concept DOI; cardiac-rings has none yet, so say what it should say and what placeholder is needed until its first DOI exists), Funding statement, the "Use of AI." statement (labelled, body size, exact wording in docs/PUBLISHING-PAPERS.md), the "Rights and licenses" paragraph (wording used by the others), acknowledgments, order of these items, and the bibliography: entry format (authors, title, journal in italics or not, volume bold, year placement, pages, doi:, arXiv ids), consistency within cardiac-rings, how the companion papers by the same author are cited (concept DOIs), and whether any source that could not be obtained is worded with an apology (forbidden) instead of stated positively.` },
  { key: 'companion', prompt: `Dimension: the companion package. Compare papers/cardiac-rings/ (README.md, NOTICE, code/, data/, review/, notes/ which stays private) with the released papers' folders: README section structure and wording (title, author line, the status line, "Read the paper (PDF, N pages)" link, ## Abstract, status of results, programs table, reproduce instructions, Cite section with BibTeX, License), RELEASES.md (cardiac-rings has none; show the format a 1.0.0 entry must have), NOTICE, how review files are handled (rank-window says review reports stay in development records; others include review/), the companionExclude field in papers/papers.json, and run \`timeout 300 node tools/paper-sync.js --check cardiac-rings\` and \`timeout 300 node tools/paper-check.js --paper cardiac-rings\` (both read-only) and report each problem they list with the exact offending text (grep for research/ and papers/ paths). For each path reference, propose a rewording that keeps the meaning without naming a GENChase path, and say whether the file is a byte-identical copy whose SHA-256 is stored in a record (check the records under papers/cardiac-rings/data/ and research/cardiac-cycle-certificates/results/ for the file name): editing such a file would break the hash check, so propose companionExclude or a different fix for those.` },
  { key: 'quality-bar', prompt: `Dimension: the quality bar. Read papers/cardiac-rings/notes/QUALITY.md and the QUALITY.md of at least four released papers (minimal-winding, nf-pulse, hh-dynamics, double-pendulum). For each of the seven items, say what evidence the released papers recorded to check it (reruns logged in a file, number and kind of adversarial readings and where their fixes are recorded, sources read, prior-article review entries in RESEARCH.md) and what cardiac-rings still lacks, concretely: which reruns (from the paper's code copies) are missing, which readings, which sources. Check the page count stated in QUALITY.md, README.md and papers/papers.json against pdfinfo of the PDF. Check that no text claims an outside review. Report as findings the specific gaps with the exact action that would close each.` },
  { key: 'figures-tables', prompt: `Dimension: figures and tables. List every figure and table in cardiac-rings (pdftotext the PDF and grep the source) and compare with the released papers: do they all have at least one figure, how figures are produced (a plot_*.py program in code/ reading stored data, listed in the programs table, with "no check"), the figure-layout rule (legends and notes outside data panels, docs/FIGURE-LAYOUT-AUDIT-2026-09-29.md), captions, vector format. If cardiac-rings has no figure, propose the figures a reader of this paper would expect (for example the cell's action potential over one period with its period enclosure, the rotating wave on a ring as a space-time plot, the Floquet/Hill spectrum with the excluded region, the eps pieces of the every-N proof), each computed only from data already stored in the records or data/, and name the data file. Also check tables: number formatting, outward rounding of printed enclosures (a printed lower end must be rounded down and an upper end up), units.` },
  { key: 'style-claims', prompt: `Dimension: writing style and claims. Read the whole of papers/cardiac-rings/paper/cardiac-rings.tex (skip the half-written every-N material if present) and compare its prose conventions with nf-pulse, hh-dynamics and minimal-winding: no em dashes; American or British spelling consistently (the released papers moved to American spelling; check which); priority wording ("as far as we could find", "in the works we read", never "first" without a search behind it, and the logged search in RESEARCH.md); no claim of outside review; no apology for unobtainable sources; the "What is not proved" / limitations section; the "Sources" paragraph stating how far each source was read; numbers in the abstract and README match the theorems; every theorem says which parts are computer-assisted. Also check the title: the released titles state the result plainly; is "Near a Hopf Point" accurate for what v1 proves (G_Ks = 0.0275, about 1.5 per cent below the numerically computed Hopf point), and is the title consistent between the tex, README and papers.json.` },
]

phase('Survey')
const results = await pipeline(
  DIMENSIONS,
  d => agent(`${COMMON}\n\n${d.prompt}`, { label: `survey:${d.key}`, phase: 'Survey', schema: FINDINGS }),
  (rep, d) => parallel((rep && rep.findings ? rep.findings : []).map(f => () =>
    agent(`${COMMON}\n\nYou are a skeptic verifying one audit finding about papers/cardiac-rings. Check it against the actual files. It is real only if (1) the observed text or state is actually in the cardiac-rings files as described, and (2) the stated convention is actually what the cited released papers do (open them and check), or the cited rule actually says so. Downgrade severity if the convention is not followed by most released papers. If the proposed fix would break something (a stored hash, a check, the scientific meaning, a statement that must stay), say so and give a corrected fix. Default to real=false if you cannot confirm it.\n\nFinding (dimension ${d.key}):\n${JSON.stringify(f, null, 2)}`,
      { label: `verify:${d.key}:${f.id}`, phase: 'Verify', schema: VERDICT })
      .then(v => ({ dimension: d.key, ...f, verdict: v }))
  )).then(vs => ({ dimension: d.key, checked_and_fine: rep ? rep.checked_and_fine : [], verified: vs.filter(Boolean) }))
)

const all = results.filter(Boolean)
const confirmed = all.flatMap(r => r.verified.filter(f => f.verdict && f.verdict.real))
const rejected = all.flatMap(r => r.verified.filter(f => !f.verdict || !f.verdict.real))
log(`${confirmed.length} confirmed, ${rejected.length} rejected`)

phase('Critic')
const critic = await agent(`${COMMON}\n\nYou are a completeness critic. Six auditors compared cardiac-rings with the released papers along these dimensions: ${DIMENSIONS.map(d => d.key).join(', ')}. Their confirmed findings are:\n${JSON.stringify(confirmed.map(f => ({ dim: f.dimension, sev: f.verdict.severity, file: f.file, loc: f.location, observed: f.observed })), null, 1)}\n\nWhat did they miss? Look for any other way cardiac-rings differs from the released papers or falls short of the quality bar and the publishing runbook (docs/PUBLISHING-PAPERS.md sections 0 and 1), for example: the papers.json entry fields and note, the README "Cite" BibTeX, CITATION handling, the arXiv-style abstract length check, page counts, the reference lists, code copies vs records, the run_all.sh, the data/ folder, licenses of copied third-party code (Erhardt's MIT model, CAPD patch), and anything that would make paper-check --release fail. Return only NEW findings, verified by you against the files.`, { label: 'critic', phase: 'Critic', schema: FINDINGS })

return {
  confirmed: confirmed.map(f => ({ dimension: f.dimension, severity: f.verdict.severity, file: f.file, location: f.location, observed: f.observed, convention: f.convention, fix: f.verdict.corrected_fix || f.proposed_fix, reason: f.verdict.reason })),
  critic: critic ? critic.findings : [],
  rejected: rejected.map(f => ({ dimension: f.dimension, file: f.file, observed: f.observed, why: f.verdict ? f.verdict.reason : 'no verdict' })),
  fine: all.flatMap(r => r.checked_and_fine.map(x => r.dimension + ': ' + x)),
}
