// Fills every sheet from SPEC, draws the SVG charts and diagrams, wires the controls, starts the viewer.
(function () {
  const S = SPEC;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (n, d) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d == null ? 1 : d, minimumFractionDigits: 0 });
  const money = (n) => '$' + Number(n).toFixed(2);
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const pill = (ok, yes, no) => '<span class="pill ' + (ok ? 'ok' : 'fail') + '">' + (ok ? (yes || 'pass') : (no || 'fail')) + '</span>';
  const P = S.physics, D = S.dims_cm, L = S.limits;
  const allPass = S.compliance.every((c) => c.pass);
  const maxSide = Math.max(D.L, D.W, D.H);
  const volume = D.L * D.W * D.H;
  const buildMinutes = S.build_steps.reduce((a, b) => a + (b.minutes || 0), 0);
  const costTotal = S.materials.reduce((a, b) => a + (b.est_cost_usd || 0), 0);
  const tr = Sim.trajectory({ h0: P.design_height_m, m: P.mass_kg, cd: P.cd, area: P.drag_area_m2 });
  const ld = Sim.landing({ vImpact: tr.vImpact, crumple_m: S.sim.crumple_m, suspension_m: S.sim.suspension_m, shape: S.sim.pulse_shape });

  // ---------- title blocks ----------
  const sheets = Array.from(document.querySelectorAll('.sheet'));
  sheets.forEach((sh, i) => {
    const tb = sh.querySelector('.title-block'); if (!tb) return;
    tb.innerHTML =
      '<div><b>Project</b>' + esc(S.project) + '</div>' +
      '<div><b>Sheet</b>' + pad(i + 1) + ' / ' + pad(sheets.length) + ' · ' + esc(sh.dataset.title) + '</div>' +
      '<div><b>Device</b>' + esc(S.name) + '</div>' +
      '<div><b>Units</b>cm · g · m/s · USD</div>' +
      '<div><b>Team</b>' + esc((S.collaborators || [S.author]).join(' · ')) + '</div>' +
      '<div><b>Date</b>' + esc(S.date) + '</div>';
  });

  function kpi(label, value, unit, cls) {
    return '<div class="kpi ' + (cls || '') + '"><div class="figure-label">' + esc(label) + '</div><div class="figure">' + esc(value) + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</div></div>';
  }
  function table(target, head, rows, foot) {
    const t = $(target);
    t.innerHTML = '<thead><tr>' + head.map((h) => '<th' + (h.num ? ' class="num"' : '') + '>' + esc(h.label) + '</th>').join('') + '</tr></thead>' +
      '<tbody>' + rows.map((r) => '<tr>' + r.map((c, i) => '<td' + (head[i].num ? ' class="num"' : '') + (c && c.cls ? ' class="' + c.cls + '"' : '') + '>' + (c && c.html != null ? c.html : esc(c)) + '</td>').join('') + '</tr>').join('') + '</tbody>' +
      (foot ? '<tfoot><tr>' + foot.map((c, i) => '<td' + (head[i].num ? ' class="num"' : '') + '>' + (c && c.html != null ? c.html : esc(c)) + '</td>').join('') + '</tr></tfoot>' : '');
  }

  // ---------- 01 cover ----------
  $('cover-date').textContent = S.date;
  $('cover-team').innerHTML = '<b>Collaborators</b> · ' + esc((S.collaborators || [S.author]).join(' · '));
  $('cover-title').textContent = S.name;
  $('cover-tagline').textContent = S.tagline;
  $('cover-summary').textContent = S.summary;
  $('cover-kpis').innerHTML =
    kpi('Size L × W × H', D.L + ' × ' + D.W + ' × ' + D.H, 'cm', maxSide < L.max_side_cm ? 'ok' : 'warn') +
    kpi('Mass with egg', fmt(S.total_mass_g, 0), 'g of ' + L.max_mass_g, S.total_mass_g <= L.max_mass_g ? 'ok' : 'warn') +
    kpi('Materials cost', money(S.total_cost_usd), 'USD', 'ok') +
    kpi('Terminal velocity', fmt(P.terminal_velocity_ms, 1), 'm/s') +
    kpi('Peak load on egg', fmt(P.peak_decel_g, 0) + ' / ' + fmt(P.worst_case_peak_decel_g, 0), 'g upright / worst', P.worst_case_peak_decel_g < P.egg_tolerance_assumption_g ? 'ok' : 'warn');
  $('cover-stamp').innerHTML = allPass ? '<span class="stamp">All five rules met</span>' : '<span class="pill fail">Check compliance sheet</span>';

  // ---------- 02 brief ----------
  table('rules-table', [{ label: '#' }, { label: 'Assignment requirement' }, { label: 'This design' }, { label: 'Status' }],
    S.compliance.map((c) => [c.rule, c.requirement, c.our_value, { html: pill(c.pass) }]));
  $('brief-worstcase').innerHTML = '<b>Assume the worst.</b> ' + esc(S.worst_case_statement);
  $('brief-cost').innerHTML = '<b>Keep it cheap.</b> ' + esc(S.cost_statement);

  // ---------- 03 physics ----------
  $('physics-lede').textContent = 'From ' + P.design_height_m + ' m with no air, the egg would hit at ' + fmt(P.no_drag_impact_speed_ms, 1) + ' m/s. This device weighs ' + fmt(P.mass_kg * 1000, 0) + ' g and presents ' + fmt(P.drag_area_m2, 3) + ' m² to the air, so it settles at ' + fmt(P.terminal_velocity_ms, 1) + ' m/s and lands at about ' + fmt(P.expected_impact_speed_ms, 1) + ' m/s after ' + fmt(P.time_to_impact_s, 1) + ' s.';
  $('physics-kpis').innerHTML =
    kpi('No-drag impact', fmt(P.no_drag_impact_speed_ms, 1), 'm/s') +
    kpi('Terminal velocity', fmt(P.terminal_velocity_ms, 1), 'm/s') +
    kpi('Impact speed', fmt(P.expected_impact_speed_ms, 1), 'm/s') +
    kpi('Stopping distance', fmt(P.stopping_distance_m * 100, 1), 'cm') +
    kpi('Peak load on egg', fmt(P.peak_decel_g, 0), 'g', P.peak_decel_g < P.egg_tolerance_assumption_g ? 'ok' : 'warn') +
    kpi('Safety factor', fmt(P.safety_factor, 1), '× vs ' + P.egg_tolerance_assumption_g + ' g assumed', P.safety_factor >= 1.5 ? 'ok' : 'warn');
  $('physics-formulas').innerHTML =
    '<div><b>Free fall</b>  v = √(2·g·h)</div>' +
    '<div><b>Terminal velocity</b>  v<sub>t</sub> = √( 2·m·g / (ρ·C<sub>d</sub>·A) )   ρ = 1.2 kg/m³</div>' +
    '<div><b>Stopping</b>  a = v² / (2·d)   d = crumple + suspension travel</div>' +
    '<div><b>Load on egg</b>  n = a / g   (elastic stop peaks at π/2 × average)</div>';
  $('physics-calc').innerHTML = P.explanation.map((line, i) => '<div><i>' + pad(i + 1) + '</i><span>' + esc(line) + '</span></div>').join('');
  $('physics-chart').innerHTML = speedChart();

  function speedChart() {
    const W = 640, H = 330, m = { l: 54, r: 18, t: 28, b: 42 };
    const h0 = P.design_height_m, vmax = Math.ceil(P.no_drag_impact_speed_ms / 5) * 5;
    const x = (hf) => m.l + hf / h0 * (W - m.l - m.r);
    const y = (v) => H - m.b - v / vmax * (H - m.t - m.b);
    let grid = '';
    for (let hf = 0; hf <= h0; hf += 5) grid += '<line class="bp-grid-major" x1="' + x(hf) + '" y1="' + m.t + '" x2="' + x(hf) + '" y2="' + (H - m.b) + '"/><text class="bp-label" x="' + x(hf) + '" y="' + (H - m.b + 16) + '" text-anchor="middle">' + hf + '</text>';
    for (let v = 0; v <= vmax; v += 5) grid += '<line class="bp-grid-major" x1="' + m.l + '" y1="' + y(v) + '" x2="' + (W - m.r) + '" y2="' + y(v) + '"/><text class="bp-label" x="' + (m.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>';
    let noDrag = '', withDrag = '';
    for (let hf = 0; hf <= h0; hf += 0.25) noDrag += (hf ? 'L' : 'M') + x(hf).toFixed(1) + ',' + y(Math.sqrt(2 * Sim.G * hf)).toFixed(1);
    for (let i = 0; i < tr.t.length; i += 2) withDrag += (i ? 'L' : 'M') + x(h0 - tr.y[i]).toFixed(1) + ',' + y(tr.v[i]).toFixed(1);
    withDrag += 'L' + x(h0).toFixed(1) + ',' + y(tr.vImpact).toFixed(1);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Speed against height fallen, with and without air drag">' +
      '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="none"/>' + grid +
      '<line class="bp-line" x1="' + m.l + '" y1="' + (H - m.b) + '" x2="' + (W - m.r) + '" y2="' + (H - m.b) + '"/><line class="bp-line" x1="' + m.l + '" y1="' + m.t + '" x2="' + m.l + '" y2="' + (H - m.b) + '"/>' +
      '<text class="bp-sub" x="' + (W - m.r) + '" y="' + (H - 6) + '" text-anchor="end">HEIGHT FALLEN · m</text>' +
      '<text class="bp-sub" x="' + m.l + '" y="' + (m.t - 10) + '">SPEED · m/s</text>' +
      '<path class="bp-hidden" d="' + noDrag + '"/>' +
      '<line class="bp-dim" stroke-dasharray="3 3" x1="' + m.l + '" y1="' + y(tr.vt) + '" x2="' + (W - m.r) + '" y2="' + y(tr.vt) + '"/>' +
      '<text class="bp-dim-text" x="' + x(h0 * 0.45) + '" y="' + (y(tr.vt) + 15) + '" text-anchor="middle">terminal velocity ' + tr.vt.toFixed(1) + ' m/s</text>' +
      '<path class="bp-line" stroke="var(--accent)" d="' + withDrag + '"/>' +
      '<circle cx="' + x(h0) + '" cy="' + y(tr.vImpact) + '" r="4" fill="var(--accent)" stroke="var(--ink)"/>' +
      '<text class="bp-label" x="' + (x(h0) - 10) + '" y="' + (y(tr.vImpact) - 12) + '" text-anchor="end">impact ' + tr.vImpact.toFixed(1) + ' m/s at ' + tr.tImpact.toFixed(1) + ' s</text>' +
      '<circle cx="' + x(h0) + '" cy="' + y(P.no_drag_impact_speed_ms) + '" r="3.5" fill="var(--paper)" stroke="var(--ink-2)"/>' +
      '<text class="bp-label" x="' + (x(h0) - 8) + '" y="' + (y(P.no_drag_impact_speed_ms) + 4) + '" text-anchor="end">no air: ' + P.no_drag_impact_speed_ms.toFixed(1) + ' m/s</text>' +
      '<text class="bp-sub" x="' + (m.l + 8) + '" y="' + (y(0) - 8) + '">— this device (with drag)   - - no air</text>' +
      '</svg>';
  }

  // ---------- 04 design ----------
  $('design-title').textContent = S.name;
  $('design-lede').textContent = S.tagline;
  $('design-why').innerHTML = S.why_this_design.map((w) => '<li>' + esc(w) + '</li>').join('');
  table('design-parts', [{ label: 'ID' }, { label: 'Part' }, { label: 'Material' }, { label: 'Size (cm)' }, { label: 'Role' }],
    S.components.map((c) => [c.id, c.name, c.material, c.size_cm, { html: '<span class="note">' + esc(c.role) + '</span>' }]));

  // ---------- 05 blueprint ----------
  if (typeof Blueprint !== 'undefined') $('blueprint').innerHTML = Blueprint.render(S);
  $('sketch-steps').innerHTML = S.sketch_guide.steps.map((s, i) => '<li class="step"><div class="n">' + pad(i + 1) + '</div><div><p>' + esc(s) + '</p></div></li>').join('');
  table('sketch-views', [{ label: 'View' }, { label: 'What to draw' }, { label: 'Dimensions to label' }],
    S.sketch_guide.views.map((v) => [v.view, v.what_to_draw, { html: v.key_dimensions.map((k) => '<span class="pill info">' + esc(k) + '</span>').join(' ') }]));

  // ---------- 06 measurements ----------
  $('dims-kpis').innerHTML =
    kpi('Length', D.L, 'cm', D.L < L.max_side_cm ? 'ok' : 'warn') +
    kpi('Width', D.W, 'cm', D.W < L.max_side_cm ? 'ok' : 'warn') +
    kpi('Height', D.H, 'cm', D.H < L.max_side_cm ? 'ok' : 'warn') +
    kpi('Volume', fmt(volume, 0), 'cm³');
  $('volume-formula').innerHTML = '<b>Volume</b> = L × W × H = ' + D.L + ' × ' + D.W + ' × ' + D.H + ' = <b>' + fmt(volume, 0) + ' cm³</b>' +
    (Math.abs(volume - S.volume_cm3) > 1 ? '  (spec says ' + fmt(S.volume_cm3, 0) + ')' : '') + '<br>Limit: every side &lt; ' + L.max_side_cm + ' cm ' + pill(maxSide < L.max_side_cm, 'all three pass');
  $('dims-bars').innerHTML = limitBars([['Length', D.L], ['Width', D.W], ['Height', D.H]], L.max_side_cm, 'cm', 32);
  $('measure-how').innerHTML = S.measure_how.map((s) => '<li>' + esc(s) + '</li>').join('');
  $('dims-margin').innerHTML = '<b>Margin.</b> Tightest side is ' + maxSide + ' cm, leaving ' + fmt(L.max_side_cm - maxSide, 1) + ' cm under the limit. Measure after the last piece of tape goes on, and press any bulge flat before the grader measures.';

  function limitBars(items, limit, unit, maxScale) {
    const W = 640, rowH = 34, H = items.length * rowH + 36, l = 90, r = 70;
    const x = (v) => l + v / maxScale * (W - l - r);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Each dimension against the limit">';
    for (let v = 0; v <= maxScale; v += 5) s += '<line class="bp-grid-major" x1="' + x(v) + '" y1="6" x2="' + x(v) + '" y2="' + (H - 24) + '"/><text class="bp-label" x="' + x(v) + '" y="' + (H - 8) + '" text-anchor="middle">' + v + '</text>';
    items.forEach(([name, v], i) => {
      const y = 12 + i * rowH;
      s += '<text class="bp-label" x="' + (l - 10) + '" y="' + (y + 15) + '" text-anchor="end">' + esc(name) + '</text>' +
        '<rect x="' + x(0) + '" y="' + y + '" width="' + (x(v) - x(0)) + '" height="20" fill="var(--accent)" stroke="var(--ink)"/>' +
        '<text class="bp-dim-text" x="' + (x(v) + 6) + '" y="' + (y + 15) + '">' + v + ' ' + unit + '</text>';
    });
    s += '<line x1="' + x(limit) + '" y1="4" x2="' + x(limit) + '" y2="' + (H - 22) + '" stroke="var(--warn)" stroke-width="2" stroke-dasharray="6 4"/>' +
      '<text x="' + (x(limit) + 5) + '" y="12" fill="var(--warn)" class="bp-dim-text">limit ' + limit + ' ' + unit + '</text></svg>';
    return s;
  }

  // ---------- 07 mass ----------
  const massSum = S.mass_budget_g.reduce((a, b) => a + b.grams, 0);
  $('mass-lede').textContent = 'Every part weighed on a kitchen scale, egg included. Total ' + fmt(massSum, 0) + ' g against a ' + L.max_mass_g + ' g limit. Lighter is faster to slow down: terminal velocity scales with the square root of mass.';
  table('mass-table', [{ label: 'Item' }, { label: 'Mass', num: true }, { label: 'Note' }],
    S.mass_budget_g.map((m) => [m.item, fmt(m.grams, 0) + ' g', { html: '<span class="note">' + esc(m.note) + '</span>' }]),
    ['Total (device + egg)', fmt(massSum, 0) + ' g', { html: pill(massSum <= L.max_mass_g, 'under ' + L.max_mass_g + ' g', 'over limit') }]);
  const vtAtLimit = P.terminal_velocity_ms * Math.sqrt(L.max_mass_g / massSum);
  $('mass-kpis').innerHTML =
    kpi('Total mass', fmt(massSum, 0), 'g', massSum <= L.max_mass_g ? 'ok' : 'warn') +
    kpi('Of the limit', fmt(massSum / L.max_mass_g * 100, 0), '%') +
    kpi('Margin', fmt(L.max_mass_g - massSum, 0), 'g spare');
  $('mass-bar').innerHTML = limitBars([['Device + egg', Math.round(massSum)]], L.max_mass_g, 'g', 1000).replace(/v \+= 5/g, '');
  $('mass-note').innerHTML = '<b>Why not use the whole 940 g?</b> Mass is what drag has to fight. At ' + fmt(massSum, 0) + ' g this device settles at ' + fmt(P.terminal_velocity_ms, 1) + ' m/s; the same shape at 940 g would hit at about ' + fmt(vtAtLimit, 1) + ' m/s, with ' + fmt((vtAtLimit * vtAtLimit) / (P.terminal_velocity_ms * P.terminal_velocity_ms), 1) + '× the impact energy.';

  // ---------- 08 materials ----------
  const freeCount = S.materials.filter((m) => !m.est_cost_usd).length;
  $('materials-lede').textContent = S.materials.length + ' lines, ' + freeCount + ' of them free from home. Estimated spend ' + money(costTotal) + ' at a dollar store or supermarket. Nothing on this list needs a hobby shop.';
  table('materials-table', [{ label: 'Item' }, { label: 'Qty' }, { label: 'Spec' }, { label: 'Where to get it' }, { label: 'Mass', num: true }, { label: 'Cost', num: true }, { label: 'Purpose' }],
    S.materials.map((m) => [m.item, m.qty, m.spec, m.source, fmt(m.est_mass_g, 0) + ' g', m.est_cost_usd ? money(m.est_cost_usd) : { html: '<span class="pill ok">free</span>' }, { html: '<span class="note">' + esc(m.purpose) + '</span>' }]),
    ['Totals', '', '', '', fmt(S.materials.reduce((a, b) => a + (b.est_mass_g || 0), 0), 0) + ' g', money(costTotal), '']);
  $('materials-kpis').innerHTML =
    kpi('Estimated cost', money(costTotal), 'USD', 'ok') +
    kpi('Free from home', freeCount + ' of ' + S.materials.length, 'lines') +
    kpi('Dearest single line', money(Math.max.apply(null, S.materials.map((m) => m.est_cost_usd || 0))), 'USD') +
    '<div class="kpi"><div class="figure-label">Tools</div><div style="font-size:1.05em;line-height:1.3">' + esc(S.tools.join(' · ')) + '</div></div>';

  // ---------- 09 build ----------
  $('build-time').textContent = 'about ' + fmt(buildMinutes, 0) + ' minutes in ' + S.build_steps.length + ' steps';
  const stepsEl = $('build-steps');
  S.build_steps.forEach((st, i) => {
    const li = el('<li class="step" data-i="' + i + '"><div class="n">' + pad(st.n || i + 1) + '</div><div><h4>' + esc(st.title) + '</h4><p>' + esc(st.detail) + '</p><div class="meta">' + fmt(st.minutes, 0) + ' min · ' + esc(st.tools) + (st.component_ids && st.component_ids.length ? ' · parts ' + esc(st.component_ids.join(', ')) : '') + '</div>' + (st.tip ? '<div class="tip">' + esc(st.tip) + '</div>' : '') + '</div></li>');
    li.addEventListener('click', () => { if (Viewer.ready) Viewer.setStep(i); else setActiveStep(i); });
    stepsEl.appendChild(li);
  });
  function setActiveStep(i) {
    stepsEl.querySelectorAll('.step').forEach((s, k) => s.classList.toggle('active', k === i));
    const st = S.build_steps[i];
    const active = stepsEl.querySelector('.step.active');
    const box = stepsEl.parentElement;
    if (active && box) {
      const top = active.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 8;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - active.offsetHeight - 16) box.scrollTo({ top: top, behavior: 'smooth' });
    }
    $('build-counter').textContent = 'Step ' + (i + 1) + ' of ' + S.build_steps.length + ' · ' + fmt(st.minutes, 0) + ' min';
    $('build-detail').innerHTML = '<b>' + pad(i + 1) + ' · ' + esc(st.title) + '.</b> ' + esc(st.detail) + (st.tip ? '<br><span class="note">Tip: ' + esc(st.tip) + '</span>' : '');
    $('btn-step-prev').disabled = i === 0;
    $('btn-step-next').disabled = i === S.build_steps.length - 1;
  }
  document.addEventListener('buildstep', (e) => setActiveStep(e.detail.index));
  $('btn-step-prev').addEventListener('click', () => Viewer.ready ? Viewer.prevStep() : null);
  $('btn-step-next').addEventListener('click', () => Viewer.ready ? Viewer.nextStep() : null);
  setActiveStep(0);

  // ---------- 10 drop day ----------
  const DP = S.drop_plan;
  $('drop-lede').textContent = DP.site + ' Release from ' + DP.height_floors + ' (' + DP.height_m + ' m). ' + DP.landing_zone;
  $('site-diagram').innerHTML = siteDiagram();
  $('release-technique').innerHTML = '<b>Release.</b> ' + esc(DP.release_technique) + ' <b>Orientation.</b> ' + esc(DP.orientation_at_release);
  table('drop-roles', [{ label: 'Role' }, { label: 'Task' }], DP.roles.map((r) => [r.role, r.task]));
  $('drop-sequence').innerHTML = DP.sequence.map((s, i) => '<li class="step"><div class="n">' + pad(i + 1) + '</div><div><p>' + esc(s) + '</p></div></li>').join('');
  $('drop-safety').innerHTML = DP.safety.map((s) => '<li>' + esc(s) + '</li>').join('');

  function siteDiagram() {
    const W = 620, H = 440, scale = 22, keep = S.site.keepout_m || 4;
    const cx = 310, cy = 300; // landing target
    const r = keep * scale;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Top view of the drop site">';
    for (let x = 0; x <= W; x += scale) s += '<line class="bp-grid" x1="' + x + '" y1="0" x2="' + x + '" y2="' + H + '"/>';
    for (let y = 0; y <= H; y += scale) s += '<line class="bp-grid" x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '"/>';
    s += '<rect class="bp-fill" x="60" y="20" width="500" height="92"/>' +
      '<text class="bp-title" x="80" y="52">Building · ' + esc(DP.height_floors) + '</text>' +
      '<text class="bp-sub" x="80" y="72">FRONT FACE · DROP SIDE</text>' +
      '<rect class="bp-soft" x="250" y="112" width="120" height="26"/>' +
      '<text class="bp-label" x="310" y="129" text-anchor="middle">balcony / window ledge</text>' +
      '<line class="bp-center" x1="' + cx + '" y1="138" x2="' + cx + '" y2="' + (cy - 20) + '"/>' +
      '<text class="bp-label" x="' + (cx + 8) + '" y="170">release point directly above target</text>' +
      '<text class="bp-label" x="' + (cx + 8) + '" y="186">' + DP.height_m + ' m vertical drop line</text>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="8 6"/>' +
      '<text class="bp-dim-text" x="' + cx + '" y="' + (cy + r + 16) + '" text-anchor="middle">keep-out radius ' + keep + ' m · nobody inside until the device is down</text>' +
      '<rect x="' + (cx - 1.5 * scale / 2) + '" y="' + (cy - 1.5 * scale / 2) + '" width="' + (1.5 * scale) + '" height="' + (1.5 * scale) + '" fill="var(--accent-soft)" stroke="var(--ink)" stroke-width="1.6"/>' +
      '<line class="bp-line" x1="' + (cx - 10) + '" y1="' + cy + '" x2="' + (cx + 10) + '" y2="' + cy + '"/><line class="bp-line" x1="' + cx + '" y1="' + (cy - 10) + '" x2="' + cx + '" y2="' + (cy + 10) + '"/>' +
      '<text class="bp-label" x="' + (cx + 24) + '" y="' + (cy + 4) + '">target 1.5 × 1.5 m, chalk or tape</text>';
    const people = [[cx - r - 18, cy - 10, 'Spotter A'], [cx + r + 18, cy - 10, 'Spotter B'], [cx, cy + r + 40, 'Egg checker'], [cx - r - 60, cy + r - 10, 'Timer / camera']];
    people.forEach(([x, y, name]) => {
      s += '<circle cx="' + x + '" cy="' + y + '" r="7" fill="var(--cyan)" stroke="var(--ink)"/><text class="bp-label" x="' + x + '" y="' + (y + 20) + '" text-anchor="middle">' + esc(name) + '</text>';
    });
    s += '<line class="bp-dim" x1="40" y1="' + (H - 24) + '" x2="' + (40 + 5 * scale) + '" y2="' + (H - 24) + '"/>' +
      '<line class="bp-dim" x1="40" y1="' + (H - 30) + '" x2="40" y2="' + (H - 18) + '"/><line class="bp-dim" x1="' + (40 + 5 * scale) + '" y1="' + (H - 30) + '" x2="' + (40 + 5 * scale) + '" y2="' + (H - 18) + '"/>' +
      '<text class="bp-dim-text" x="' + (40 + 2.5 * scale) + '" y="' + (H - 30) + '" text-anchor="middle">5 m</text>' +
      '<text class="bp-sub" x="' + (W - 12) + '" y="' + (H - 12) + '" text-anchor="end">TOP VIEW · 1 square = 1 m</text></svg>';
    return s;
  }

  // ---------- 11 simulation ----------
  $('sim-lede').textContent = 'The animation integrates the drag equation with the numbers from sheet 03 (' + fmt(P.mass_kg * 1000, 0) + ' g, Cd ' + P.cd + ', ' + fmt(P.drag_area_m2, 3) + ' m²), then runs the landing through ' + fmt(S.sim.crumple_m * 100, 1) + ' cm of cup crush and ' + fmt(S.sim.suspension_m * 100, 1) + ' cm of pad and sponge. Impact plays in slow motion.';
  let i90 = tr.v.findIndex((v) => v >= 0.9 * tr.vt); if (i90 < 0) i90 = tr.t.length - 1;
  const phases = [
    ['Release', 'Let go level with both hands at once, no spin. For the first instant the egg is weightless: 0 g.'],
    ['Accelerating', 'Drag grows with the square of speed. The device reaches 90% of terminal velocity after ' + fmt(tr.t[i90], 1) + ' s, about ' + fmt(P.design_height_m - tr.y[i90], 1) + ' m down.'],
    ['Terminal velocity', fmt(tr.vt, 1) + ' m/s. Drag now equals weight, so the egg feels exactly 1 g, as if it were sitting on a table. It stays there until the ground at ' + fmt(tr.tImpact, 1) + ' s.'],
    ['Impact: cups crush', 'The four 9 oz cups fold up ' + fmt(ld.dBody * 100, 1) + ' cm and take most of the energy; the frame slows hard while the egg, seated in its socket, slows with it.'],
    ['Pad and sponge', 'The pod presses ' + fmt((ld.dEgg - ld.dBody) * 100, 1) + ' cm into the floor pad and the sponge pocket, rounding off the stop: the whole landing takes ' + fmt(ld.tEgg * 1000, 0) + ' ms with a peak of ' + fmt(ld.gEggPeak, 0) + ' g on the egg.'],
    ['Settle: egg intact', 'Peak load ' + fmt(ld.gEggPeak, 0) + ' g against an assumed tolerance of ' + P.egg_tolerance_assumption_g + ' g. The cups are sacrificial and get swapped; the egg never touched anything hard.'],
  ];
  $('sim-phases').innerHTML = phases.map((p, i) => '<li class="step"><div class="n">' + pad(i + 1) + '</div><div><h4>' + esc(p[0]) + '</h4><p>' + esc(p[1]) + '</p></div></li>').join('');
  $('sim-kpis').innerHTML =
    kpi('Impact speed', fmt(tr.vImpact, 1), 'm/s') +
    kpi('Fall time', fmt(tr.tImpact, 1), 's') +
    kpi('Stopping distance', fmt(ld.dEgg * 100, 1), 'cm') +
    kpi('Peak load (model)', fmt(ld.gEggPeak, 0), 'g', ld.gEggPeak < P.egg_tolerance_assumption_g ? 'ok' : 'warn');
  const playBtn = $('btn-drop-play');
  playBtn.addEventListener('click', () => { if (!Viewer.ready) return; Viewer.dropPlaying ? Viewer.dropPause() : Viewer.dropPlay(); });
  $('btn-drop-replay').addEventListener('click', () => Viewer.ready && Viewer.dropReplay());
  $('btn-drop-slow').addEventListener('click', (e) => { if (!Viewer.ready) return; e.currentTarget.classList.toggle('active', Viewer.toggleSlowmo()); });
  $('btn-cam-follow').addEventListener('click', () => { if (!Viewer.ready) return; Viewer.setCamMode('follow'); $('btn-cam-follow').classList.add('active'); $('btn-cam-wide').classList.remove('active'); });
  $('btn-cam-wide').addEventListener('click', () => { if (!Viewer.ready) return; Viewer.setCamMode('wide'); $('btn-cam-wide').classList.add('active'); $('btn-cam-follow').classList.remove('active'); });
  document.addEventListener('dropstate', (e) => { playBtn.textContent = e.detail.playing ? 'Pause' : (e.detail.done ? 'Play again' : 'Play'); });

  // ---------- 12 worst case ----------
  $('worst-lede').textContent = S.worst_case_statement;
  table('faces-table', [{ label: 'Lands on' }, { label: 'What crushes, in order' }, { label: 'Speed', num: true }, { label: 'Stopping distance', num: true }, { label: 'Peak on egg', num: true }, { label: 'Verdict' }],
    S.protection_by_face.map((f) => [f.face, f.protection, fmt(f.impact_speed_ms, 1) + ' m/s', fmt(f.stopping_distance_cm, 1) + ' cm', fmt(f.peak_g, 0) + ' g', { html: pill(/^surviv/i.test(f.verdict), 'survives', /^marginal/i.test(f.verdict) ? 'marginal' : 'fails') + ' <span class="note">' + esc(f.verdict.replace(/^(survives|marginal|fails)\s*/i, '')) + '</span>' }]));
  $('faces-diagram').innerHTML = facesDiagram();
  $('worst-calc').innerHTML = P.worst_case_explanation.map((line, i) => '<div><i>' + pad(i + 1) + '</i><span>' + esc(line) + '</span></div>').join('');

  function facesDiagram() {
    const faces = S.protection_by_face;
    const find = (re) => faces.find((f) => re.test(f.face));
    const panels = [
      ['Upright', find(/bottom|upright|base|feet/i), 0],
      ['On a side', find(/side/i), 90],
      ['Upside-down', find(/top|upside|invert/i), 180],
      ['On a corner', find(/corner|edge/i), 45],
    ];
    const W = 640, H = 200, pw = W / 4;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="The four landing orientations">';
    panels.forEach(([name, f, rot], i) => {
      const cx = pw * i + pw / 2, size = 58;
      s += '<line class="bp-line" x1="' + (pw * i + 14) + '" y1="150" x2="' + (pw * (i + 1) - 14) + '" y2="150"/>';
      s += '<g transform="translate(' + cx + ',' + (150 - (rot === 45 ? size * 0.72 : size / 2)) + ') rotate(' + rot + ')">' +
        '<rect class="bp-fill" x="' + (-size / 2) + '" y="' + (-size / 2) + '" width="' + size + '" height="' + size + '"/>' +
        '<rect class="bp-soft" x="' + (-size / 2) + '" y="' + (size / 2 - 12) + '" width="' + size + '" height="12"/>' +
        '<ellipse class="bp-egg" cx="0" cy="-2" rx="9" ry="12"/>' +
        '<line class="bp-elastic" x1="-' + (size / 2) + '" y1="-' + (size / 2) + '" x2="-7" y2="-8"/><line class="bp-elastic" x1="' + (size / 2) + '" y1="-' + (size / 2) + '" x2="7" y2="-8"/>' +
        '<line class="bp-elastic" x1="-' + (size / 2) + '" y1="' + (size / 2) + '" x2="-7" y2="6"/><line class="bp-elastic" x1="' + (size / 2) + '" y1="' + (size / 2) + '" x2="7" y2="6"/>' +
        '</g>';
      s += '<text class="bp-title" x="' + cx + '" y="24" text-anchor="middle" style="font-size:14px">' + esc(name) + '</text>';
      if (f) s += '<text class="bp-dim-text" x="' + cx + '" y="172" text-anchor="middle">' + fmt(f.peak_g, 0) + ' g · ' + fmt(f.stopping_distance_cm, 1) + ' cm</text>';
      s += '<path d="M' + (cx - 40) + ',44 l0,14 l-4,-5 m4,5 l4,-5" fill="none" stroke="var(--ink-2)" stroke-width="1.2"/>';
    });
    s += '<text class="bp-sub" x="' + (W - 10) + '" y="' + (H - 6) + '" text-anchor="end">PEAK LOAD ON THE EGG · STOPPING DISTANCE</text></svg>';
    return s;
  }

  // ---------- 13 test ladder ----------
  const ladder = S.test_ladder;
  $('ladder-lede').textContent = ladder.length + ' drops from increasing heights, same device every time. Between drops: inspect, swap what crushed, re-seat the egg in its marked cradle, re-measure, climb higher.';
  table('ladder-table', [{ label: 'Drop' }, { label: 'From' }, { label: 'Height', num: true }, { label: 'Impact speed', num: true }, { label: 'Purpose' }, { label: 'Counts as a pass' }],
    ladder.map((d) => [{ html: '<b>' + esc(d.drop) + '</b>' }, d.height_floors, fmt(d.height_m, 1) + ' m', fmt(d.expected_impact_speed_ms, 1) + ' m/s', d.purpose, { html: '<span class="note">' + esc(d.pass_criteria) + '</span>' }]));
  $('ladder-chart').innerHTML = ladderChart();
  $('reset-steps').innerHTML = S.reset_between_drops.map((s, i) => '<li class="step"><div class="n">' + pad(i + 1) + '</div><div><p>' + esc(s) + '</p></div></li>').join('');
  table('spares-table', [{ label: 'Spare' }, { label: 'Carry', num: true }, { label: 'Swap', num: true }, { label: 'Swap it when' }],
    S.spares.map((sp) => [sp.item, sp.qty_spare, fmt(sp.swap_minutes, 0) + ' min', { html: '<span class="note">' + esc(sp.when) + '</span>' }]));

  function ladderChart() {
    const W = 640, H = 230, m = { l: 60, r: 20, t: 26, b: 40 };
    const n = ladder.length, hmax = Math.max(P.design_height_m, Math.max.apply(null, ladder.map((d) => d.height_m)));
    const bw = (W - m.l - m.r) / n;
    const y = (h) => H - m.b - h / hmax * (H - m.t - m.b);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Drop heights and impact speeds of the test ladder">';
    for (let h = 0; h <= hmax; h += 5) s += '<line class="bp-grid-major" x1="' + m.l + '" y1="' + y(h) + '" x2="' + (W - m.r) + '" y2="' + y(h) + '"/><text class="bp-label" x="' + (m.l - 8) + '" y="' + (y(h) + 4) + '" text-anchor="end">' + h + ' m</text>';
    ladder.forEach((d, i) => {
      const x0 = m.l + i * bw + bw * 0.22, w = bw * 0.56;
      s += '<rect x="' + x0 + '" y="' + y(d.height_m) + '" width="' + w + '" height="' + (y(0) - y(d.height_m)) + '" fill="var(--accent-soft)" stroke="var(--ink)" stroke-width="1.4"/>' +
        '<text class="bp-dim-text" x="' + (x0 + w / 2) + '" y="' + (y(d.height_m) - 8) + '" text-anchor="middle">' + fmt(d.height_m, 1) + ' m · ' + fmt(d.expected_impact_speed_ms, 1) + ' m/s</text>' +
        '<text class="bp-label" x="' + (x0 + w / 2) + '" y="' + (H - m.b + 16) + '" text-anchor="middle">drop ' + d.drop + '</text>' +
        '<text class="bp-sub" x="' + (x0 + w / 2) + '" y="' + (H - m.b + 30) + '" text-anchor="middle">' + esc(d.height_floors).toUpperCase() + '</text>';
    });
    s += '<line class="bp-line" x1="' + m.l + '" y1="' + y(0) + '" x2="' + (W - m.r) + '" y2="' + y(0) + '"/>' +
      '<text class="bp-sub" x="' + m.l + '" y="' + (m.t - 10) + '">RELEASE HEIGHT · IMPACT SPEED FROM THE DRAG MODEL</text></svg>';
    return s;
  }

  // ---------- 14 egg access + failure modes ----------
  const EA = S.egg_access;
  $('access-lede').textContent = 'The egg comes out in about ' + fmt(EA.seconds, 0) + ' seconds and goes back into the identical spot. ' + EA.same_place_feature;
  $('access-steps').innerHTML = [['Open', EA.open], ['Seat', EA.seat], ['Close', EA.close]].map((p, i) => '<li class="step"><div class="n">' + pad(i + 1) + '</div><div><h4>' + esc(p[0]) + '</h4><p>' + esc(p[1]) + '</p></div></li>').join('');
  $('access-feature').innerHTML = '<b>Same place, every time.</b> ' + esc(EA.same_place_feature);
  $('test-steps').innerHTML = S.test_protocol.map((s, i) => '<li class="step"><div class="n">' + pad(i + 1) + '</div><div><p>' + esc(s) + '</p></div></li>').join('');
  table('failure-table', [{ label: 'Failure mode' }, { label: 'Likelihood' }, { label: 'What prevents it' }],
    S.failure_modes.map((f) => [f.mode, { html: '<span class="pill ' + (/high/i.test(f.likelihood) ? 'fail' : /medium|moderate/i.test(f.likelihood) ? 'info' : 'ok') + '">' + esc(f.likelihood) + '</span>' }, f.mitigation]));

  // ---------- 15 compliance ----------
  table('compliance-table', [{ label: 'Rule' }, { label: 'Requirement' }, { label: 'Our value' }, { label: 'Status' }],
    S.compliance.map((c) => [c.rule, c.requirement, c.our_value, { html: pill(c.pass) }]));
  $('egg-prep').innerHTML = S.egg_prep.map((s) => '<li>' + esc(s) + '</li>').join('');
  $('final-checklist').innerHTML = S.final_checklist.map((s) => '<li>' + esc(s) + '</li>').join('');
  table('alternatives-table', [{ label: 'Concept' }, { label: 'Mass', num: true }, { label: 'Cost', num: true }, { label: 'Worst-case peak', num: true }, { label: 'Panel score', num: true }, { label: 'Why not chosen' }],
    S.alternatives.map((a) => [a.name, fmt(a.total_mass_g, 0) + ' g', money(a.total_cost_usd || 0), fmt(a.worst_case_peak_decel_g, 0) + ' g', fmt(a.panel_score, 1) + ' / 30', { html: '<span class="note">' + esc(a.why_not) + '</span>' }]));

  // ---------- viewer wiring ----------
  const ok = typeof Viewer !== 'undefined' && Viewer.init();
  if (!ok) {
    document.querySelectorAll('.stage .placeholder').forEach((p) => { p.textContent = 'The 3D view needs WebGL. Open this file in Chrome, Safari or Edge.'; });
  } else {
    $('btn-labels').addEventListener('click', (e) => e.currentTarget.classList.toggle('active', Viewer.toggleLabels()));
    $('btn-labels').classList.add('active');
    $('btn-xray').addEventListener('click', (e) => e.currentTarget.classList.toggle('active', Viewer.toggleXray()));
    $('btn-reset-view').addEventListener('click', () => Viewer.resetView());
    $('btn-zoom-in').addEventListener('click', () => Viewer.zoom(-0.25));
    $('btn-zoom-out').addEventListener('click', () => Viewer.zoom(0.25));
    $('explode').addEventListener('input', (e) => Viewer.setExplode(Number(e.target.value) / 100));
  }
})();
