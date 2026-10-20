export const meta = {
  name: 'egg-drop-page-review',
  description: 'Review the built egg-drop presentation: numbers vs spec, completeness vs the request, code/UX; adversarially verify findings',
  phases: [
    { title: 'Review', detail: 'three lenses read the spec, sources and built page' },
    { title: 'Verify', detail: 'two refuters per blocking or major finding' },
  ],
}

const ROOT = args.root
const REQUEST = args.request
const FILES = [
  ROOT + '/src/spec.json', ROOT + '/src/content.js', ROOT + '/src/body.html', ROOT + '/src/styles.css',
  ROOT + '/src/viewer.js', ROOT + '/src/device.js', ROOT + '/src/blueprint.js', ROOT + '/src/sim.js', ROOT + '/src/deck.js', ROOT + '/src/orbit.js', ROOT + '/build.js', ROOT + '/tools/physics.js', ROOT + '/tools/merge-spec.js',
]
const FINDINGS = {
  type: 'object', required: ['findings'],
  properties: { findings: { type: 'array', items: { type: 'object', required: ['title', 'file', 'detail', 'severity', 'fix'], properties: {
    title: { type: 'string' }, file: { type: 'string' }, detail: { type: 'string', description: 'What is wrong, with the exact numbers or lines' },
    severity: { type: 'string', description: 'blocking | major | minor' }, fix: { type: 'string', description: 'The concrete change' } } } } },
}
const VERDICT = { type: 'object', required: ['real', 'reason'], properties: { real: { type: 'boolean' }, reason: { type: 'string' } } }

const COMMON = 'PROJECT: a school egg-drop presentation page built from a JSON spec. Files (read them with your tools; read spec.json in full):\n' + FILES.join('\n') +
  '\nThe page is assembled by build.js: body.html is static structure, content.js fills it from SPEC (= src/spec.json), viewer.js runs Three.js, blueprint.js draws the SVG drawing, device.js builds the 3D model from SPEC.geometry, sim.js is the physics, tools/physics.js recomputes every derived physics number from the spec inputs when tools/merge-spec.js builds spec.json (so derived numbers are not hand-typed).\n' +
  'THE USER ASKED FOR (verbatim):\n' + REQUEST + '\n'

const LENSES = [
  { key: 'numbers', prompt: 'LENS: NUMBERS. Recompute every derived number from spec.json and from what content.js displays: volume = L*W*H, mass budget sum vs total_mass_g, materials mass vs mass budget, cost sum vs total_cost_usd, terminal velocity sqrt(2mg/(rho Cd A)) with rho = 1.2, impact speed, peak g from stopping distance with the half-sine factor pi/2, worst-case numbers, per-face peaks, test-ladder impact speeds, compliance table values vs dims/mass, build step component_ids vs the part ids and aliases actually created in device.js (list them), geometry heights (cups + sleeve + canopy + top cups) vs dims_cm.H, sim.crumple_m and sim.suspension_m vs the stopping stages, and anything on one sheet that contradicts another sheet. Report every mismatch with both numbers.' },
  { key: 'completeness', prompt: 'LENS: COMPLETENESS. Compare the user request line by line with what the page delivers (body.html sheet list + content.js + spec.json). The five numbered rules, the presentation style, a full-depth 3D animated model, a drop animation showing the structure surviving, a blueprint the student can sketch on paper, materials, step-by-step build, drop layout and execution, worst-case all-sides protection, very low cost, the multi-height test ladder with the egg going back to the same place, and an explicit answer to what the capsule (pod) consists of. Report anything missing, thin, or only implied; also anything claimed that the spec does not actually support.' },
  { key: 'code', prompt: 'LENS: CODE AND UX. Read every source file. Look for runtime errors (undefined fields used by content.js that spec.json lacks, wrong ids between body.html and content.js, event wiring that cannot fire), controls that do nothing, text likely to overflow or be unreadable in light or dark theme, keyboard traps, missing focus states, and anything that breaks in the claude.ai artifact sandbox (only cdnjs/jsdelivr/unpkg scripts, no window.open, no print, no downloads, no alert/confirm). Also check the physics animation logic in viewer.js dropStep against sim.js for mistakes (units, cm vs m, crumple direction) and device.js compose() for parts that would move the wrong way.' },
]

phase('Review')
const reviews = (await parallel(LENSES.map(l => () =>
  agent(COMMON + '\n' + l.prompt + '\n\nReturn findings only (no praise). Severity: blocking = wrong number shown to the grader, broken feature or missing requirement; major = misleading or clearly weak; minor = polish.',
    { label: 'review:' + l.key, phase: 'Review', schema: FINDINGS, effort: 'high' })
))).filter(Boolean)
const all = reviews.flatMap((r, i) => r.findings.map(f => Object.assign({ lens: LENSES[i].key }, f)))
log(all.length + ' findings: ' + all.filter(f => f.severity === 'blocking').length + ' blocking, ' + all.filter(f => f.severity === 'major').length + ' major, ' + all.filter(f => f.severity === 'minor').length + ' minor')

phase('Verify')
const toVerify = all.filter(f => f.severity === 'blocking' || f.severity === 'major')
const verified = await parallel(toVerify.map(f => () =>
  parallel([0, 1].map(k => () =>
    agent(COMMON + '\n\nA reviewer claims:\nTITLE: ' + f.title + '\nFILE: ' + f.file + '\nDETAIL: ' + f.detail + '\nPROPOSED FIX: ' + f.fix + '\n\nTry to REFUTE it by reading the actual files and recomputing. real = true only if the problem exists exactly as described and the fix is needed. Angle ' + (k ? 'B: assume the reviewer misread the code; check the code path end to end.' : 'A: assume the reviewer miscalculated; redo every number.'),
      { label: 'verify:' + f.title.slice(0, 40), phase: 'Verify', schema: VERDICT })
  )).then(vs => Object.assign({}, f, { votes: vs.filter(Boolean), confirmed: vs.filter(Boolean).filter(v => v.real).length >= 1 }))
))
const confirmed = verified.filter(Boolean).filter(f => f.confirmed)
const rejected = verified.filter(Boolean).filter(f => !f.confirmed)
log(confirmed.length + ' confirmed, ' + rejected.length + ' refuted')
return { confirmed, rejected: rejected.map(f => ({ title: f.title, reasons: f.votes.map(v => v.reason) })), minor: all.filter(f => f.severity === 'minor') }
