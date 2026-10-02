export const meta = {
  name: 'cardiac-rings-items-1-4-7',
  description: 'Reruns from the paper copies (item 7) and a multi-lens third reading of cardiac-rings (items 1 and 4), each finding verified by two skeptics',
  phases: [
    { title: 'Rerun', detail: 'CAPD certificate and every-N collect from the paper copies; collect the N = 16, 32, 64 rerun' },
    { title: 'Read', detail: 'five read-only lenses over the manuscript and its records' },
    { title: 'Verify', detail: 'two skeptics per finding' },
  ],
}

const S = '/tmp/claude-0/-home-user-GENChase/8e652c2a-6f64-5009-9ee8-187ba6394e5c/scratchpad'
const BASE = `Repository: /home/user/GENChase (branch claude/inspiring-edison-twrpsg). Paper: papers/cardiac-rings/ (manuscript paper/cardiac-rings.tex and its PDF, code/ and data/ which are byte-identical copies of research/cardiac-cycle-certificates/, notes/QUALITY.md, review/). The quality bar is in docs/PUBLISHING-PAPERS.md section 0 and the paper's notes/QUALITY.md. The manuscript was just extended with an every-N existence theorem (a theorem covering every ring size N >= 8 and the cable, eps = 1/N^2 as an interval parameter over [0, 1/64], record data/fourier-existence-alln.json, program code/fourier/alln.py) and a phase-reduction remark (numerical, data/numerics-phase-reduction.json); the agent integrating them was stopped before its own reading, so treat that material with particular care. Other long computations share this 4-core machine: keep your own CPU use modest and bound every command with timeout. No em dashes in any prose you write. Never claim an outside review; all readings here are in-project.`

const FINDINGS = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
    summary: { type: 'string' },
    findings: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' },
      severity: { type: 'string', enum: ['must', 'should', 'nit'] },
      location: { type: 'string', description: 'file and line, or section/theorem/equation number' },
      issue: { type: 'string' },
      evidence: { type: 'string', description: 'quote the text and the record value or the reasoning that shows the defect' },
      fix: { type: 'string' },
    }, required: ['id', 'severity', 'location', 'issue', 'evidence', 'fix'] } },
    checked_sound: { type: 'array', items: { type: 'string' } },
  },
  required: ['lens', 'summary', 'findings', 'checked_sound'],
}
const VERDICT = { type: 'object', properties: {
  real: { type: 'boolean' }, severity: { type: 'string', enum: ['must', 'should', 'nit', 'none'] },
  reason: { type: 'string' }, corrected_fix: { type: 'string' },
}, required: ['real', 'severity', 'reason', 'corrected_fix'] }
const RERUN = { type: 'object', properties: {
  capd_rerun: { type: 'string' }, alln_collect: { type: 'string' }, n16_32_64: { type: 'string' },
  note_written: { type: 'string' }, item7_closable: { type: 'boolean' }, remaining_gaps: { type: 'array', items: { type: 'string' } },
}, required: ['capd_rerun', 'alln_collect', 'n16_32_64', 'note_written', 'item7_closable', 'remaining_gaps'] }

const LENSES = [
  { key: 'existence-proofs', prompt: `Lens: proofs of existence. Read Sections on existence in Fourier space (the lemmas numbered 4.x), the every-N existence theorem and its proof, and the parts of code/fourier/existence.py, code/fourier/fourier_eval.py and code/fourier/alln.py whose inequalities the proofs cite. Is every step proved in full or cited precisely? Do the inequalities the text states match what the programs check (read the code, compare)? For the every-N theorem: is the interval-parameter argument (eps as a parameter, the mean value / Lipschitz control in eps, the gluing of pieces by ball inclusion, the endpoints eps = 0 for the cable and eps = 1/64 for N = 8) complete; is uniqueness stated in the right space; is the identification with the Stage E proofs at N = 8, 16, 32, 64 correct; does the theorem say nothing about stability beyond what is proved?` },
  { key: 'stability-proofs', prompt: `Lens: proofs of stability. Read the section on stability through one Hill operator (results numbered 5.x) and Appendix A (Lemmas A.1 to A.3, Proposition A.4, Theorem A.5, Lemma A.6, Theorem A.7), and the parts of code/fourier/stability.py they cite, with code/fourier/LEMMAS-stability.md. Is every step proved in full from the stated elementary facts? Check the Riesz-projection homotopy count, the Schur-complement small gain, the tail bounds, the counting of Floquet multipliers per strip, algebraic multiplicities, and that the conclusion (local exponential orbital stability with asymptotic phase, bound e^(-delta T)) follows. Report gaps, wrong citations of the appendix, and claims beyond what is proved.` },
  { key: 'numbers', prompt: `Lens: every printed number. List every numerical value printed in the manuscript (abstract, theorems, tables, text, captions) and in papers/cardiac-rings/README.md, and compare each with the record it comes from (data/*.json; use python3 with json to read exact values). Printed enclosure ends must be rounded outward (lower ends down, upper ends up); a printed bound must be implied by the record's bound; widths and counts must match. Also check page counts stated anywhere against pdfinfo of the PDF. Report each mismatch with the printed text, the record path and value.` },
  { key: 'claims-sources', prompt: `Lens: claims, labels and sources (quality items 3 and 4). (a) Every result carries its label (proved, computer-assisted, numerical) as the paper's Labels paragraph defines, including the new every-N theorem and the phase-reduction remark. (b) Make a list of every source on which a PROOF STEP depends (not background), and for each say how the paper and notes/QUALITY.md, RESEARCH.md and research/cardiac-cycle-certificates/notes/readings-rings-2026-10-01.md record that it was read; Kato (1976) is now cited only as "see also" because Appendix A proves the facts: confirm no proof step still depends on Kato or on any unread source. (c) Priority and novelty statements are scoped to the logged searches ("as far as we could find"); no apology for unobtainable sources (docs/PUBLISHING-PAPERS.md rule); no claim of outside review; the Use of AI statement is present at body size. Report the list in (b) in checked_sound as well, and anything failing as findings.` },
  { key: 'capd-reproducibility', prompt: `Lens: the CAPD section, the link of the two cell certificates (Lemma 6.1, code/fourier/link_cell.py) and the reproducibility section. Check the CAPD argument is complete (the section, the Poincare map, the contraction ball, the multiplier bound), that Lemma 6.1's statement matches what link_cell.py checks, and that the reproducibility section and README "Reproduce" instructions match code/run_all.sh exactly (commands, options, times, memory, what is rerun and what is only checked). Read code/run_all.sh and code/proofs/. Report mismatches and missing instructions.` },
]

phase('Rerun')
const rerunP = agent(`${BASE}\n\nTask (quality item 7, reproducible): rerun from the paper's own copies and record the outcome. Do not edit the manuscript.\n1. The CAPD cell certificate: CAPD 6.1.0 with the project's patch is installed in $HOME/capd-install (check the patch with: grep -n "GENChase patch" $HOME/capd-install/include/capd/poincare/PoincareMap_templateMembers.h). Using only papers/cardiac-rings/code/proofs/, code/model/ and code/candidates/ copied into a scratch folder under ${S}/rerun-capd/, rebuild and rerun the certificate exactly as the paper and research/cardiac-cycle-certificates/README.md describe (read them for the commands), with every command under timeout and nice -n 5, using one core. Compare the result with data/cell-gks0.0275.json (period interval, multiplier bound, verdict).\n2. The every-N record: run \`cd papers/cardiac-rings && timeout 1800 nice -n 5 sh code/run_all.sh alln\` and report its comparison lines.\n3. The N = 16, 32, 64 Stage E and Stage S rerun is already running in the background, writing ${S}/rerun-16-32-64.log (it ends with a line exit=<code>). Wait for it with a loop that checks every 60 s and gives up after 100 minutes, then read its comparison lines.\n4. Write papers/cardiac-rings/notes/rerun-2026-10-02.md in the form of notes/rerun-2026-10-01.md: date, versions (python3, python-flint, numpy, scipy, CAPD, compiler), exact commands, summary output lines, a comparison table key by key, and what was not rerun. State facts only. Report whether item 7 can be closed and what remains.`, { label: 'rerun', phase: 'Rerun', schema: RERUN })

phase('Read')
const readP = pipeline(
  LENSES,
  l => agent(`${BASE}\n\nYou are one of five independent in-project readers (a third reading of this manuscript, quality item 1 and item 4). Read-only: do not edit any file. ${l.prompt}\nSeverity: must = a gap in a proof, a false or unsupported claim, a wrong number, a broken rule; should = an unclear or imprecise statement a careful reader would stumble on; nit = wording. Report only what you have checked against the text and the files.`, { label: `read:${l.key}`, phase: 'Read', schema: FINDINGS }),
  (rep, l) => parallel((rep && rep.findings ? rep.findings : []).map(f => () => parallel([
      () => agent(`${BASE}\n\nSkeptic A (does it exist): check that this finding about papers/cardiac-rings describes what is actually in the files (open the manuscript and the cited records or code at the stated location; quote them). If the text or value is not as described, real=false. Default real=false if you cannot confirm.\nFinding (${l.key}): ${JSON.stringify(f)}`, { label: `verifyA:${l.key}:${f.id}`, phase: 'Verify', schema: VERDICT, effort: 'medium' }),
      () => agent(`${BASE}\n\nSkeptic B (is it a defect): assume the quoted text is accurate and decide whether it is actually a defect: is the proof step really incomplete or wrong, the number really inconsistent with the record (respecting outward rounding), the claim really unsupported, the rule really broken? If it is fine as written, real=false. If the proposed fix would introduce an error or overstate, give a corrected fix. Default real=false if uncertain.\nFinding (${l.key}): ${JSON.stringify(f)}`, { label: `verifyB:${l.key}:${f.id}`, phase: 'Verify', schema: VERDICT }),
    ]).then(vs => ({ lens: l.key, ...f, verdicts: vs, confirmed: vs.filter(Boolean).length === 2 && vs.every(v => v && v.real) })))
  ).then(vs => ({ lens: l.key, summary: rep ? rep.summary : 'no report', checked_sound: rep ? rep.checked_sound : [], findings: vs.filter(Boolean) }))
)

const [rerun, reads] = await Promise.all([rerunP, readP])
const all = (reads || []).filter(Boolean)
const confirmed = all.flatMap(r => r.findings.filter(f => f.confirmed)).map(f => ({
  lens: f.lens, id: f.id, severity: f.verdicts[1].severity !== 'none' ? f.verdicts[1].severity : f.severity, location: f.location,
  issue: f.issue, evidence: f.evidence, fix: f.verdicts[1].corrected_fix || f.fix }))
const disputed = all.flatMap(r => r.findings.filter(f => !f.confirmed)).map(f => ({ lens: f.lens, id: f.id, issue: f.issue,
  why: (f.verdicts || []).filter(Boolean).map(v => v.reason).join(' | ') }))
log(`${confirmed.length} confirmed findings, ${disputed.length} not confirmed`)
return { rerun, confirmed, disputed, summaries: all.map(r => ({ lens: r.lens, summary: r.summary, checked_sound: r.checked_sound })) }
