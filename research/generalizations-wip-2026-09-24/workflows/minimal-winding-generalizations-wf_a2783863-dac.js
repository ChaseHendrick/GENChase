export const meta = {
  name: 'minimal-winding-generalizations',
  description: 'Explore five generalizations of the minimal-winding bound with computation, verify, and synthesize',
  phases: [
    { title: 'Explore', detail: 'five directions, each with real computation' },
    { title: 'Verify', detail: 'independent recomputation and literature-risk check per headline result' },
    { title: 'Synthesize', detail: 'rank directions and draft an honest research program' },
  ],
}

const SP = '/tmp/claude-0/-home-user-GENChase/04604b4b-7efe-5ca6-9b53-4838030930e5/scratchpad'
const REPO = SP + '/wt-tex'
const CTX = `
BACKGROUND (a finished paper; read it first: ${REPO}/research/unequal-mu-n5-floors-2026-09-23.tex, about 10 pages)
- Point vortices: conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} Gamma_k/(z_j - z_k). Self-similar motion: dz_j/dt = kappa (z_j - z_c) for all j, with z_c the center of vorticity; lambda^2 = 1 + 2 t Re kappa; collapse iff Re kappa < 0, at t_c = -1/(2 Re kappa); omega_0 = Im kappa.
- The winding number studied: P = |omega_0| t_c = |Im kappa| / (-2 Re kappa). It is invariant under rescaling lengths, times and circulations. Each vortex moves on a logarithmic spiral; its path makes the constant angle arctan(2P) with the direction to the collision point, and its path length is r0 sqrt(1 + 4P^2).
- Proved results: for three vortices, normalized Gamma = (1, mu, -mu/(1+mu)), 0 < mu <= 1, zero angular impulse; the collapsing shapes form two arcs (one per orientation); P has one minimum per arc; the squared minima are roots of an explicit cubic Q(mu, y); the least one, P_-(mu), increases strictly from sqrt(3)/2 (mu -> 0, not attained) to sqrt(2) (mu = 1). Hence P > sqrt(3)/2 for every self-similar three-vortex collapse, sharp; equivalently the spiral angle exceeds pi/3 and every vortex travels more than twice its initial distance to the collision point. At mu = 1 the minimum sqrt(2) gives spiral angle arccos(1/3). At mu = 1/2 the minima are 1.0647... and 2.2038... For two concentric regular n-gons with circulations x_n = (n + sqrt(2n-1))/(n-1) and -1: P = (K_n - sqrt(2n-1) cos n theta)/(2n sin n theta) >= F_n = sqrt(K_n^2 - 2n + 1)/(2n), K_n = (n-1) sinh((n+2) eta/2), cosh eta = n/(n-1); F_2 = 3 sqrt5/4 ~ 1.677, F_3 = sqrt29/3 ~ 1.795, F_4 = sqrt322/9 ~ 1.994, F_5 = sqrt31682/80 ~ 2.225.
- Known literature context (see ${REPO}/RESEARCH.md, which is a ledger of prior-art searches; READ the entries mentioning collapse before searching the web, and respect entries marked skip): Groebli 1877; Novikov-Sedov 1979 (4- and 5-vortex collapse); Aref 1979, 1982, 2010 (rates Omega, tau; spiral exponent Eq. 29c); Kimura 1987; Tavantzis-Ting 1988; Borisov-Lebedev 1998 (collapse conditions); Kidambi-Newton 1998 (sphere); Leoncini-Kuznetsov-Zaslavsky 2000 (fastest collapse, tau = 4 pi/3, a different quantity); O'Neil 2007 (triple rings); Kudela 2014 (n-vortex self-similar collapse, numerical); Krishnamurthy-Aref-Stremler 2018 (triangle geometry, tau via cot of angles); Krishnamurthy-Stremler 2018 (normalized circumcenter path length sqrt(1+4P^2), numerical observation that it exceeds 2); Badin-Barry 2018 and Reinaud-Dritschel-Scott 2022 (generalized Euler / QG collapse); Gotoda 2021 (self-similar N-vortex motions; its arXiv v1 Eq. (3.3) B has a misprint, use Biot-Savart directly); Grotto-Pappalettera 2022 (bursts, non-uniqueness); Drivas-Khanikati-Khanikati 2026 arXiv:2607.16490 (collapse on surfaces: self-similar on plane and sphere in chord length, none on hyperbolic plane). Full texts read in this project: Aref 2010, Gotoda arXiv v1, 1706.00731, 2607.16490, nlin/0503057, 1407.1641 (extracts in ${SP}/lit/*.txt: kas.txt, s2607.txt, bl.txt, dk1407.txt). Demina-Kudryashov 2014 (double rings) is unread.
RULES
- Real computation, not speculation: sympy for exact algebra, mpmath (>= 40 digits) for numerics, scipy/numpy if installed. Validate every configuration you report by direct Biot-Savart evaluation (self-similarity residual, collapse sign). Keep any single computation under about 10 minutes; if something is too expensive, say so and scale down.
- Honesty: label every result as proved (give the proof), numerical evidence (give the method, precision, residuals and coverage), conjecture, or refuted. Never round toward a hoped-for value. A negative result (a conjectured bound fails) is valuable; report it plainly with the counterexample.
- Novelty: before calling anything new, check the RESEARCH.md ledger and search the literature (WebSearch returns summaries only, which are weak evidence; most scholarly hosts are blocked). Report novelty risk honestly; never claim novelty. Do not attach any person's name to a result.
- STRICTLY READ-ONLY on ${REPO} and /home/user/GENChase: do not modify, create or delete files there, no git state changes, no GitHub writes. Work only under ${SP}/research/<your-label>/ (create it). The paper text must not be edited.
- The user wants depth and correctness over breadth. Prefer one solid, verified, meaningful result over many shallow ones.`

const EXPLORE = {
  type: 'object',
  properties: {
    direction: { type: 'string' },
    summary: { type: 'string', description: 'what you found, in 5-10 sentences, plain and precise' },
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          statement: { type: 'string', description: 'precise mathematical statement' },
          status: { type: 'string', enum: ['proved', 'numerical evidence', 'conjecture', 'refuted'] },
          evidence: { type: 'string', description: 'proof sketch or numerical method, precision, residuals, coverage, and the scratch file path of the code' },
          headline: { type: 'boolean', description: 'true if this is among the most significant findings of this direction' },
          novelty_risk: { type: 'string', description: 'what prior work might contain it, what was checked' },
        },
        required: ['id', 'statement', 'status', 'evidence', 'headline', 'novelty_risk'],
      },
    },
    depth_assessment: { type: 'string', description: 'how deep/significant this direction is, honestly' },
    next_steps: { type: 'string' },
  },
  required: ['direction', 'summary', 'results', 'depth_assessment', 'next_steps'],
}

const CHECK = {
  type: 'object',
  properties: {
    holds: { type: 'boolean', description: 'true only if your independent recomputation or proof check confirms the statement as stated' },
    corrected_statement: { type: 'string', description: 'if it holds only in a weaker or corrected form, that form; else empty' },
    reasoning: { type: 'string' },
  },
  required: ['holds', 'corrected_statement', 'reasoning'],
}

const LIT = {
  type: 'object',
  properties: {
    risk: { type: 'string', enum: ['known', 'likely known', 'unclear', 'probably unstated'] },
    sources: { type: 'string', description: 'papers that contain or nearly contain it, with what exactly, and how you know (read, ledger note, search summary)' },
    reasoning: { type: 'string' },
  },
  required: ['risk', 'sources', 'reasoning'],
}

const DIRS = [
  { key: 'n-vortex', prompt: `DIRECTION 1: a universal winding bound for self-similar collapse of N >= 4 point vortices? Set up the self-similar collapse problem for N = 4 (and N = 5 if feasible): the necessary conditions (sum_{i<j} Gamma_i Gamma_j = 0, zero angular impulse about z_c, sum Gamma != 0) and the shape equations conj(sum_k Gamma_k/(z_j - z_k)) = 2 pi i conj(kappa) conj(z_j - z_c) with one common complex kappa. Find collapsing solutions numerically (e.g. Newton or least squares with many random starts, or continuation from known families: Novikov-Sedov four-vortex collapse, the two-ring n = 2 parallelogram family, three vortices plus a vanishing fourth, Gotoda 2021 four- and five-vortex families if reconstructible), certify each at high precision, and explore the infimum of P over circulations and shapes. Key questions: (a) is P bounded below by sqrt(3)/2 for N = 4, or by some other positive constant, or can P approach 0 (collapse with almost no rotation)? (b) Can P be smaller than sqrt(3)/2, and if so what is the smallest value found and in what configuration? (c) Do degenerations (a circulation -> 0, two vortices merging into one, a vortex at z_c) explain the infimum? (d) Is there any argument that Im kappa != 0 for every self-similar collapse of any N (collapse must rotate)? Try to prove or find a counterexample. Report the certified configurations (circulations, positions, kappa, P, residual).` },
  { key: 'sphere', prompt: `DIRECTION 2: minimal winding on the sphere. Three point vortices on the unit sphere (Kidambi-Newton 1998; Drivas-Khanikati-Khanikati 2026, extract in ${SP}/lit/s2607.txt, show every collapse on the sphere is self-similar in chord length). Write the spherical equations of motion (they are in the extract), find the collapsing configurations (conditions and the family), and define the natural analog of the winding: the rotation angle of the configuration about the collision point per unit change of ln(chord^2) (check whether it is constant along the motion, as on the plane, or varies with size). Compute it along collapsing trajectories by high-precision integration and in closed form if possible. Questions: does the planar bound P > sqrt(3)/2 persist, strengthen or weaken with curvature (size of the configuration relative to the sphere radius)? Is there a sharp curvature-dependent bound? What happens for configurations of size comparable to the radius? Verify everything numerically.` },
  { key: 'alpha-models', prompt: `DIRECTION 3: generalized Euler / generalized SQG point vortices, interaction kernel G(r) = c_alpha r^(-alpha) for 0 < alpha < 2 (alpha -> 0 recovers the logarithmic Euler kernel; alpha = 1 is SQG). The velocity of vortex j is the skew gradient of sum_k Gamma_k G(|z_j - z_k|). Derive the conditions for self-similar three-vortex collapse in these models (note H is now homogeneous of degree -alpha, so conservation of H during collapse forces H = 0 rather than the harmonic condition; the angular impulse condition also changes; compare with Badin-Barry 2018 and Reinaud-Dritschel-Scott 2022 as recorded in the ledger). Parametrize the collapsing family, compute P = |Im kappa|/(-2 Re kappa) (still well defined since self-similar motion has dz/dt = kappa(t)(z - z_c) with kappa(t) scaling like lambda^-(alpha+2)... check how P must be defined so it is the rotation per e-fold of size^2, and whether the trajectories are still logarithmic spirals), and find P_min(alpha) numerically for alpha in a grid, plus its behaviour as alpha -> 0 (does it tend to sqrt(3)/2?) and alpha -> 2. Look for a closed form or a clean monotonicity statement. Verify with direct integration for a few alpha.` },
  { key: 'geometry', prompt: `DIRECTION 4: the geometry behind sqrt(3)/2. Express P for three vortices intrinsically in the triangle's angles A, B, C and the circulations (use Krishnamurthy-Aref-Stremler 2018, extract ${SP}/lit/kas.txt: Eq. (46b) gives the collapse time via cot of the angles; derive the rotation rate similarly, e.g. from the circumcircle equations or directly). Then: (a) find the minimizing triangle shapes along the minimal branch P_-(mu), and the limiting shape as mu -> 0 (angles, which vortices merge or separate, where the collision point sits on the circumcircle; note that for zero angular impulse the center of vorticity lies on the circumcircle, KAS Eq. (40)); (b) explain the value sqrt(3)/2 (spiral angle pi/3) conceptually: is the mu -> 0 limit a two-vortex-plus-tracer problem whose spiral angle can be computed directly? Is there a simple characterization of the minimizers (an angle condition, an extremal property, a relation to the equilateral relative equilibrium)? (c) Is the equal-circulation minimum's spiral angle arccos(1/3) (the tetrahedral angle) meaningful or a coincidence, and is there a unifying formula for cos(spiral angle) = 1/sqrt(1 + 4 P_min^2) along mu? (d) Is there a cleaner invariant formulation of Theorem 1 (e.g. in terms of H-like or impulse-like quantities) that might generalize? Prove what you can; verify numerically.` },
  { key: 'consequences', prompt: `DIRECTION 5: rigorous consequences of the winding bound. Work out what P > sqrt(3)/2 (and the ring bounds) imply, with proofs, for: (a) bursts (the time-reversed self-similar expansion from a point, relevant to non-uniqueness of weak solutions: Grotto-Pappalettera 2022; zero-noise selection arXiv:2307.05133): a lower bound on how much a bursting triple must rotate, the angle swept, or winding numbers of trajectories over [t_c - epsilon, t_c]; (b) the total rotation angle and the number of turns before collapse from a given initial size to a given final size (the number of turns to shrink by a factor s is P ln(s^2)/(2 pi)); (c) lower bounds on the arclength, curvature or other geometric features of vortex trajectories, or on fluid-particle (passive tracer) paths near a collapsing triple; (d) any implication for enstrophy or energy-type quantities, for the stability discussion of Tavantzis-Ting, or for finite-core merger (Reinaud et al.). Only report statements you can prove or check numerically; say plainly where the bound implies nothing interesting. Assess honestly whether any of these consequences is deeper than a restatement.` },
]

phase('Explore')
const explored = await pipeline(
  DIRS,
  d => agent(`${CTX}\n\nYOUR LABEL: ${d.key}\n${d.prompt}`, { label: `explore:${d.key}`, phase: 'Explore', schema: EXPLORE }),
  (res, d) => {
    if (!res) return { key: d.key, failed: true }
    const heads = (res.results || []).filter(r => r.headline && r.status !== 'refuted' && r.status !== 'conjecture')
    log(`${d.key}: ${(res.results || []).length} result(s), ${heads.length} headline to verify`)
    return parallel(heads.map(r => () => parallel([
      () => agent(`${CTX}\n\nYou are an independent checker. Re-derive or recompute the following result YOURSELF from scratch (write your own code; do not reuse the explorer's scripts except to read their parameters). Try hard to break it: other parameter ranges, higher precision, edge cases, a flaw in the proof. Set holds=true only if your own check confirms it as stated.\n\nRESULT (from direction ${d.key}):\n${JSON.stringify(r, null, 2)}`, { label: `check:${d.key}:${r.id}`, phase: 'Verify', schema: CHECK }),
      () => agent(`${CTX}\n\nYou are a prior-art checker. Determine how likely it is that the following result is already stated in the literature, in any equivalent form (for example as a bound on a spiral angle, a pitch, a winding number, a rotation angle per e-fold, Omega times tau, B/(-2A), or a normalized path length). Read the RESEARCH.md ledger and identities/ notes first, then search. Be conservative.\n\nRESULT (from direction ${d.key}):\n${JSON.stringify(r, null, 2)}`, { label: `prior-art:${d.key}:${r.id}`, phase: 'Verify', schema: LIT }),
    ]).then(([chk, lit]) => ({ ...r, check: chk, prior_art: lit }))))
      .then(verified => ({ key: d.key, explore: res, verified }))
  },
)

const ok = explored.filter(Boolean)
const failed = ok.filter(e => e.failed).map(e => e.key)
if (failed.length) log(`explorers that died: ${failed.join(', ')}`)

phase('Synthesize')
const synthesis = await agent(`${CTX}\n\nYou are the synthesizer. Five directions were explored and their headline results independently rechecked and checked for prior art. Write an honest assessment for the author (a scientifically literate reader) answering: is there a deeper theory here? Rank the directions by (verified strength of results) x (depth/significance) x (low prior-art risk). For each direction give: what is now established (only results whose independent check held), what failed, what remains conjecture, and the single most valuable next step. Then state, in a few sentences, whether the findings add up to a unifying principle (and what exactly it would say) or remain separate observations. Be concrete and conservative; no hype; no personal names on results. Also flag anything that could affect the existing paper (for example a counterexample to a stated result, or prior art).\n\nDATA:\n${JSON.stringify(ok, null, 1)}`, { label: 'synthesize', phase: 'Synthesize' })

return { synthesis, explored: ok, failed }
