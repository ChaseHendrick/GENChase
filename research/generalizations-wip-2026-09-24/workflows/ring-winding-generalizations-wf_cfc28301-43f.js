export const meta = {
  name: 'ring-winding-generalizations',
  description: 'Minimal winding for the Demina-Kudryashov ring families: central vortex and three polygons, with independent checks and prior-art review',
  phases: [
    { title: 'Explore', detail: 'two directions: two rings plus a central vortex, and three-polygon collapses' },
    { title: 'Verify', detail: 'independent recomputation and prior-art check of each headline result' },
    { title: 'Synthesize' },
  ],
}
const A = args
const CTX = `
Research context. A paper (Typst ${A.typ}) studies P = |omega_0| t_c, the winding of a self-similar point-vortex collapse
(dz_j/dt = kappa (z_j - z_c), t_c = -1/(2 Re kappa), omega_0 = Im kappa, P = |Im kappa|/(-2 Re kappa); Biot-Savart
conj(dz_j/dt) = (1/(2 pi i)) sum_k Gamma_k/(z_j - z_k)). Known: three vortices P > sqrt(3)/2, sharp. Two concentric regular n-gons
(circulations x_n and -1, no central vortex): P = (K_n - sqrt(2n-1) cos n theta)/(2n sin n theta) >= F_n = sqrt(K_n^2 - (2n-1))/(2n)
(Proposition 2; see Section 4 of the paper). A four-vortex collapse with P = 0.7979 < sqrt(3)/2 has been found numerically elsewhere,
and Demina-Kudryashov's seven-vortex example has P = 12433/(1240 sqrt 155) = 0.8054.
Source for the new families: M. V. Demina and N. A. Kudryashov, Theor. Comput. Fluid Dyn. 28 (2014) 357-368 ("DK"). Page images
${A.dk}/p01.png ... p12.png (authoritative; the text layer ${A.dk}/dk2014.txt drops Greek letters). DK's constant Omega satisfies
Omega conj(z_k) = sum' Gamma_j/(z_k - z_j), so Omega = 2 pi i conj(kappa) and P = |Re Omega|/(2 |Im Omega|), collapse iff Im Omega < 0.
Sect. 3 (pp. 361-362): two n-gons, Gamma_1 on radius R1, Gamma_2 on radius r R1, Gamma_0 at the origin; the collapse branch is
Gamma_1 + Gamma_2 r^2 = 0 with r from Eq. (37) and Omega from Eq. (36), b2 = e^{i n phi2} free. Sect. 4 (pp. 362-365): three regular
polygons (n-gon and m-gon on radius R1, n-gon on radius R3) plus Gamma_0; relations (39)-(58); Table 1 and Fig. 1 give collapses.
Earlier scripts that implement DK's formulas: ${A.work}/verify-dk/verify_dk.py and ${A.work}/reconcile/chk.py (read them for conventions).
Work only in your own folder ${A.scratch}/<your-label>/; do not edit the repository; never copy DK text or the PDF into the repository.
Every claimed number must be certified by a direct Biot-Savart evaluation over all vortices at >= 40 digits (mpmath), and every
closed form checked exactly (SymPy) where possible. Label conjectures as conjectures. No personal names on results.
`
const EXPLORE = {
  type: 'object',
  properties: {
    direction: { type: 'string' },
    summary: { type: 'string' },
    results: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, statement: { type: 'string' }, status: { type: 'string', enum: ['proved', 'certified-numerical', 'numerical', 'conjecture', 'refuted'] },
      evidence: { type: 'string' }, headline: { type: 'boolean' }, scripts: { type: 'string' },
    }, required: ['id', 'statement', 'status', 'evidence', 'headline', 'scripts'] } },
    depth_assessment: { type: 'string' },
    next_steps: { type: 'string' },
  },
  required: ['direction', 'summary', 'results', 'depth_assessment', 'next_steps'],
}
const CHECK = { type: 'object', properties: { holds: { type: 'boolean' }, corrected_statement: { type: 'string' }, reasoning: { type: 'string' } }, required: ['holds', 'corrected_statement', 'reasoning'] }
const LIT = { type: 'object', properties: { risk: { type: 'string', enum: ['likely stated', 'unclear', 'probably unstated'] }, sources: { type: 'string' }, reasoning: { type: 'string' } }, required: ['risk', 'sources', 'reasoning'] }

const DIRS = [
  { key: 'central-vortex', prompt: `DIRECTION: two concentric regular n-gons plus a central vortex (DK Sect. 3 with Gamma_0 != 0).
(a) Parametrize the collapsing family: gamma = Gamma_0/Gamma_1, r from DK (37), Gamma_2 = -Gamma_1/r^2, and the relative rotation b2 = e^{i alpha}
    (alpha = n phi2). Derive P(alpha; n, gamma) in closed form. Check whether it keeps the form (K - B cos alpha)/(C sin alpha) of the paper's eq. Pring,
    and if so give K, B, C in closed form in (n, gamma, r). State exactly which alpha collapse (the sign of Im Omega), and for which gamma a real positive r exists.
(b) Minimize over alpha for fixed (n, gamma): closed form of the minimum (the analogue of F_n) and the minimizer.
(c) Minimize further over gamma for each n (and each admissible root r): is there an interior minimum, is the infimum approached at an endpoint
    (gamma -> 0 recovers F_n; gamma -> a boundary where r degenerates), can P approach 0? Give the infimum per n = 2..8 and its limit as n grows.
(d) Compare with the three-vortex bound sqrt(3)/2 and the four-vortex value 0.7979: does a central vortex lower the ring minima below these?
Certify the key minima by Biot-Savart over all 2n + 1 vortices.` },
  { key: 'three-polygons', prompt: `DIRECTION: DK Sect. 4 collapse families of three regular polygons plus a central vortex (n-gon and m-gon on one circle, n-gon on a second circle).
(a) Reconstruct from the page images the relations that define the collapsing families (DK relations (39)-(58), and whichever branch Table 1 uses,
    e.g. (56)-(58)); identify the free parameters left after the collapse conditions.
(b) Express P over each family, in closed form if possible, else numerically, and find its infimum over the free parameters; report whether it is attained.
(c) Reproduce DK Table 1 (Fig. 1a: P = 12433/(1240 sqrt 155)) as a member and say how far below it the family can go. Compare with sqrt(3)/2 and 0.7979.
(d) If the families allow it, study how the infimum behaves with n and m, and whether P can approach 0 within these symmetric families.
Certify the key values by Biot-Savart over all vortices.` },
]

phase('Explore')
const explored = await pipeline(
  DIRS,
  d => agent(CTX + '\nYOUR LABEL: ' + d.key + '\n' + d.prompt, { label: 'explore:' + d.key, phase: 'Explore', schema: EXPLORE }),
  (res, d) => {
    if (!res) return { key: d.key, failed: true }
    const heads = (res.results || []).filter(r => r.headline && r.status !== 'refuted' && r.status !== 'conjecture')
    log(d.key + ': ' + heads.length + ' headline results to verify')
    return parallel(heads.map(r => () => parallel([
      () => agent(CTX + '\nYou are an independent checker. Re-derive or recompute this result YOURSELF from scratch (your own code; read the explorer scripts only for parameters). Try to break it: other parameters, higher precision, edge cases, a flaw in the proof. holds=true only if your own check confirms it as stated.\nRESULT (direction ' + d.key + '):\n' + JSON.stringify(r, null, 2), { label: 'check:' + d.key + ':' + r.id, phase: 'Verify', schema: CHECK }),
      () => agent(CTX + '\nYou are a prior-art checker. How likely is it that this result is already stated in the literature in any equivalent form (spiral angle, pitch, winding, rotation per e-fold, Omega*tau, a ratio of the rates, a normalized path length)? Read the ledger ' + A.ledger + ' (entries J to N and the prior-art tables) and the DK page images first; then search with WebSearch (many publisher sites and arxiv.org are blocked for fetching; say what you could not open). Be conservative.\nRESULT (direction ' + d.key + '):\n' + JSON.stringify(r, null, 2), { label: 'prior-art:' + d.key + ':' + r.id, phase: 'Verify', schema: LIT }),
    ]).then(([check, lit]) => ({ result: r, check, lit }))))
      .then(verified => ({ key: d.key, explore: res, verified }))
  },
)
const ok = explored.filter(Boolean)
phase('Synthesize')
const synthesis = await agent(CTX + `
You are the synthesizer. Two ring directions were explored and each headline result was independently rechecked and checked for prior art.
Write an honest assessment for the author: what is now established (only results whose check held), what failed, what is conjecture, and the most valuable next step.
Say whether any result could strengthen the existing paper's Section 4 (for example a closed-form minimum with a central vortex) and how it relates to the
three-vortex bound sqrt(3)/2 and the four-vortex value 0.7979. Be concrete and conservative; no personal names on results.
DATA:
` + JSON.stringify(ok, null, 1), { label: 'synthesize', phase: 'Synthesize' })
return { synthesis, explored: ok }
