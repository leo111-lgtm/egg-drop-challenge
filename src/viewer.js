// Three.js stage. One renderer whose canvas moves between sheets. Modes:
//   model – orbit the device, labels, exploded view
//   build – step-by-step assembly (parts of the active step fly in)
//   drop  – the fall from the building with drag, crumple and suspension, live telemetry
const Viewer = (function () {
  const CM = 0.01;
  let renderer, stage = null, labelsEl = null, mode = null, last = 0, running = false, ro = null;
  let T = {};
  let mScene, mCamera, mControls, mDevice, mGrid;
  let dScene, dCamera, dControls, dDevice, dBuilding = [], dWindows = [], dFloorLines, dRing, dTarget, dFigures = [];
  let traj = null, land = null, drop = null, dTotal = 0;
  const state = { labels: true, explode: 0, step: -1, camMode: 'follow', xray: false };
  let labelEls = [];
  const buildAnim = new Map(); // part id -> start time
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = (SPEC.build_steps || []);

  const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function colorOf(n, fb) { const v = tok(n); try { return new THREE.Color(v || fb); } catch (e) { return new THREE.Color(fb); } }
  function readTokens() {
    T = {
      ink: colorOf('--ink', '#0f2140'), ink2: colorOf('--ink-2', '#4e5f79'), line: colorOf('--line', '#bccadc'),
      grid: colorOf('--grid', '#d3dce9'), paper: colorOf('--paper', '#ffffff'), bg: colorOf('--bg', '#e9eef5'),
      accent: colorOf('--accent', '#cf8400'), cyan: colorOf('--cyan', '#0a6ea6'),
    };
  }
  const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);

  // ---------- init ----------
  function init() {
    if (typeof THREE === 'undefined' || typeof buildDevice !== 'function') return false;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    readTokens();
    buildModelScene();
    buildDropScene();
    applyTheme();
    window.addEventListener('resize', resize);
    ro = new ResizeObserver(resize);
    const retheme = () => { readTokens(); applyTheme(); };
    document.addEventListener('themechange', retheme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme);
    document.addEventListener('sheetchange', (e) => attachTo(e.detail.sheet));
    document.addEventListener('visibilitychange', () => { last = 0; });
    running = true;
    requestAnimationFrame(loop);
    return true;
  }

  // ---------- model scene ----------
  function buildModelScene() {
    mScene = new THREE.Scene();
    mCamera = new THREE.PerspectiveCamera(30, 16 / 9, 1, 2000);
    const H = SPEC.dims_cm.H;
    mControls = new OrbitControls(mCamera, renderer.domElement, { radius: Math.max(SPEC.dims_cm.L, H) * 3.1, phi: 1.12, theta: 0.65, minRadius: 18, maxRadius: 320, autoRotate: true, autoRotateSpeed: 0.22 });
    mControls.target.set(0, H * 0.5, 0);
    mScene.add(new THREE.HemisphereLight(0xffffff, 0x8a94a6, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(45, 95, 55);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const s = 45; key.shadow.camera.left = -s; key.shadow.camera.right = s; key.shadow.camera.top = s; key.shadow.camera.bottom = -s;
    key.shadow.camera.near = 10; key.shadow.camera.far = 320; key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02;
    mScene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(-70, 35, -40); mScene.add(fill);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: 0.2 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; mScene.add(ground);
    mDevice = buildDevice(THREE, SPEC);
    mScene.add(mDevice.group);
    rebuildGrid();
  }
  function rebuildGrid() {
    if (mGrid) { mScene.remove(mGrid); mGrid.geometry.dispose(); mGrid.material.dispose(); }
    mGrid = new THREE.GridHelper(120, 24, T.line.getHex(), T.grid.getHex());
    mGrid.position.y = 0.02;
    mGrid.material.transparent = true; mGrid.material.opacity = 0.9;
    mScene.add(mGrid);
  }

  // ---------- drop scene ----------
  function buildDropScene() {
    const site = SPEC.site || {};
    const floors = site.floors || 7;
    const H = SPEC.physics.design_height_m;
    const rail = 1.0;
    const Hb = H - rail;              // balcony floor height
    const fh = Hb / floors;
    dScene = new THREE.Scene();
    dScene.fog = new THREE.Fog(0xffffff, 45, 190);
    dCamera = new THREE.PerspectiveCamera(42, 16 / 9, 0.02, 900);
    dControls = new OrbitControls(dCamera, renderer.domElement, { radius: 7, phi: 1.38, theta: 0.85, minRadius: 0.35, maxRadius: 140 });
    dControls.enabled = false;
    dScene.add(new THREE.HemisphereLight(0xffffff, 0x6d7889, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.95);
    sun.position.set(28, 60, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -34; sun.shadow.camera.right = 34; sun.shadow.camera.top = 44; sun.shadow.camera.bottom = -34;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 220; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
    dScene.add(sun);
    // ground: concrete
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x8d949c, roughness: 1, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; dScene.add(ground);
    // building: front face at z = -1.4, balcony slab at the top floor sticks out to z = +0.6
    const bw = 18, bd = 14, zFace = -1.4;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, Hb + 1.2, bd), wallMat);
    body.position.set(0, (Hb + 1.2) / 2, zFace - bd / 2);
    body.castShadow = true; body.receiveShadow = true; dScene.add(body); dBuilding.push(body);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(6, 0.22, 2.0), wallMat);
    slab.position.set(0, Hb - 0.11, zFace + 1.0); slab.castShadow = true; slab.receiveShadow = true; dScene.add(slab); dBuilding.push(slab);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.4 });
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(6, 0.05, 0.05), railMat); railTop.position.set(0, Hb + rail, zFace + 2.0); dScene.add(railTop);
    for (let i = -3; i <= 3; i += 1) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, rail, 0.04), railMat); post.position.set(i, Hb + rail / 2, zFace + 2.0); dScene.add(post); }
    // floor lines and windows on the front face
    const pts = [];
    for (let f = 1; f <= floors; f++) { const y = f * fh; pts.push(-bw / 2, y, zFace + 0.01, bw / 2, y, zFace + 0.01); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    dFloorLines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    dScene.add(dFloorLines);
    const winMat = new THREE.MeshStandardMaterial({ color: 0x3a4a60, roughness: 0.3, metalness: 0.2 });
    for (let f = 0; f < floors; f++) {
      for (let i = -2; i <= 2; i++) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), winMat);
        w.position.set(i * 3.2, f * fh + fh * 0.55, zFace + 0.012); dScene.add(w); dWindows.push(w);
      }
    }
    // landing target (under the release point) and keep-out ring
    const dropX = 0, dropZ = zFace + 2.0 + 0.45;
    const keep = site.keepout_m || 4;
    dRing = new THREE.Mesh(new THREE.RingGeometry(keep - 0.06, keep, 96), new THREE.MeshBasicMaterial({ color: 0xcf8400, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    dRing.rotation.x = -Math.PI / 2; dRing.position.set(dropX, 0.004, dropZ); dScene.add(dRing);
    const tg = new THREE.BufferGeometry();
    const s = 0.75, ty = 0.005;
    tg.setAttribute('position', new THREE.Float32BufferAttribute([
      -s, ty, -s, s, ty, -s, s, ty, -s, s, ty, s, s, ty, s, -s, ty, s, -s, ty, s, -s, ty, -s,
      -s * 0.3, ty, 0, s * 0.3, ty, 0, 0, ty, -s * 0.3, 0, ty, s * 0.3], 3));
    dTarget = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0x000000 }));
    dTarget.position.set(dropX, 0, dropZ); dScene.add(dTarget);
    // spotters at the keep-out line, for scale
    const figMat = new THREE.MeshStandardMaterial({ color: 0x1f2a44, roughness: 0.9 });
    [[-keep - 0.4, dropZ + 1.5], [keep + 0.4, dropZ + 1.5], [0, dropZ + keep + 1.2]].forEach(([x, z]) => {
      const g = new THREE.Group();
      const bodyM = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 1.3, 12), figMat); bodyM.position.y = 0.65; bodyM.castShadow = true;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), figMat); head.position.y = 1.5; head.castShadow = true;
      g.add(bodyM); g.add(head); g.position.set(x, 0, z); dScene.add(g); dFigures.push(g);
    });
    dDevice = buildDevice(THREE, SPEC);
    dDevice.group.scale.setScalar(CM);
    dDevice.group.position.set(dropX, H, dropZ);
    dScene.add(dDevice.group);
    dScene.userData.drop = { x: dropX, z: dropZ, H: H, Hb: Hb };
  }

  function applyTheme() {
    if (!mScene) return;
    rebuildGrid();
    const dark = T.bg.getHSL({ h: 0, s: 0, l: 0 }).l < 0.5;
    dBuilding.forEach((m) => m.material.color.copy(dark ? new THREE.Color(0x21355a) : new THREE.Color(0xf1f3f6)));
    dWindows.forEach((w) => w.material.color.copy(dark ? new THREE.Color(0xf4b63a) : new THREE.Color(0x3a4a60)));
    dFloorLines.material.color.copy(dark ? new THREE.Color(0xffffff) : new THREE.Color(0x000000));
    dTarget.material.color.copy(T.ink);
    dRing.material.color.copy(T.accent);
    dScene.fog.color.copy(T.bg);
  }

  // ---------- attach / modes ----------
  function attachTo(sheet) {
    const st = sheet && sheet.querySelector('.stage');
    if (!st) return;
    if (stage === st) { onModeEnter(); return; }
    if (stage) { ro.unobserve(stage); stage.classList.remove('live'); const ph = stage.querySelector('.placeholder'); if (ph) ph.hidden = false; }
    stage = st;
    labelsEl = st.querySelector('.labels');
    st.insertBefore(renderer.domElement, st.firstChild);
    st.classList.add('live');
    const ph = st.querySelector('.placeholder'); if (ph) ph.hidden = true;
    ro.observe(stage);
    mode = st.dataset.view || 'model';
    resize();
    onModeEnter();
  }
  function onModeEnter() {
    mControls.enabled = mode !== 'drop';
    dControls.enabled = mode === 'drop';
    clearLabels();
    if (mode === 'model') {
      mDevice.setVisibleParts(null); mDevice.setHighlight(null); mDevice.setCrumple(0); mDevice.setEggOffset(0);
      mDevice.setExplode(state.explode); mDevice.setXray(state.xray);
      mControls.autoRotate = stage.dataset.auto !== '0';
      if (stage.dataset.auto === '1') { mControls.set({ radius: Math.max(SPEC.dims_cm.L, SPEC.dims_cm.H) * 3.0, phi: 1.1 }); }
      makeLabels();
    } else if (mode === 'build') {
      mDevice.setExplode(0); mDevice.setCrumple(0); mDevice.setEggOffset(0);
      mControls.autoRotate = false;
      mControls.set({ radius: Math.max(SPEC.dims_cm.L, SPEC.dims_cm.H) * 2.6, phi: 1.05, theta: 0.7 });
      if (state.step < 0) setStep(0); else setStep(state.step);
    } else if (mode === 'drop') {
      dropReset();
      if (!reduced) dropPlay();
    }
  }
  function resize() {
    if (!stage || !renderer) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    [mCamera, dCamera].forEach((c) => { c.aspect = w / h; c.updateProjectionMatrix(); });
  }

  // ---------- labels ----------
  let leaderSvg = null;
  function clearLabels() { labelEls.forEach((l) => l.el.remove()); labelEls = []; if (leaderSvg) { leaderSvg.remove(); leaderSvg = null; } }
  function makeLabels() {
    if (!labelsEl || !state.labels) return;
    leaderSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    leaderSvg.setAttribute('class', 'leaders');
    labelsEl.appendChild(leaderSvg);
    (mDevice.labelPoints || []).forEach((lp) => {
      const el = document.createElement('div');
      el.className = 'lbl'; el.textContent = lp.text;
      labelsEl.appendChild(el);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '3');
      leaderSvg.appendChild(line); leaderSvg.appendChild(dot);
      labelEls.push({ el, id: lp.id, local: lp.local, line, dot });
    });
  }
  const _v = new THREE.Vector3();
  function projectLabels() {
    if (!labelEls.length || !stage) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    mDevice.group.updateMatrixWorld(true);
    const cols = { left: [], right: [] };
    labelEls.forEach((l) => {
      const part = mDevice.parts[l.id];
      const hide = () => { l.el.style.opacity = '0'; l.line.setAttribute('opacity', '0'); l.dot.setAttribute('opacity', '0'); };
      if (!part || !part.visible) { hide(); return; }
      _v.copy(l.local); part.localToWorld(_v); _v.project(mCamera);
      if (_v.z > 1 || Math.abs(_v.x) > 1.15 || Math.abs(_v.y) > 1.15) { hide(); return; }
      const px = (_v.x + 1) / 2 * w, py = (1 - _v.y) / 2 * h;
      cols[px < w / 2 ? 'left' : 'right'].push({ l, px, py });
    });
    const pad = 10, lh = 22, gap = 6;
    // balance the two columns so one side never carries almost everything
    while (cols.right.length - cols.left.length > 1) { cols.right.sort((a, b) => a.px - b.px); cols.left.push(cols.right.shift()); }
    while (cols.left.length - cols.right.length > 1) { cols.left.sort((a, b) => b.px - a.px); cols.right.push(cols.left.shift()); }
    ['left', 'right'].forEach((side) => {
      const arr = cols[side].sort((a, b) => a.py - b.py);
      let cursor = pad;
      arr.forEach((p) => {
        let y = Math.max(cursor, Math.min(h - pad - lh, p.py - lh / 2));
        y = Math.max(y, cursor);
        cursor = y + lh + gap;
        const el = p.l.el, lw = el.offsetWidth || 120;
        el.style.opacity = '1';
        el.style.top = y + 'px';
        if (side === 'left') { el.style.left = pad + 'px'; el.style.right = 'auto'; } else { el.style.right = pad + 'px'; el.style.left = 'auto'; }
        const ex = side === 'left' ? pad + lw : w - pad - lw, ey = y + lh / 2;
        p.l.line.setAttribute('x1', ex); p.l.line.setAttribute('y1', ey); p.l.line.setAttribute('x2', p.px); p.l.line.setAttribute('y2', p.py); p.l.line.setAttribute('opacity', '1');
        p.l.dot.setAttribute('cx', p.px); p.l.dot.setAttribute('cy', p.py); p.l.dot.setAttribute('opacity', '1');
      });
      // if the column overflowed the bottom, shift the whole column up
      const over = cursor - gap - (h - pad);
      if (over > 0) arr.forEach((p) => { const y = parseFloat(p.l.el.style.top) - over; p.l.el.style.top = y + 'px'; p.l.line.setAttribute('y1', y + lh / 2); });
    });
  }

  // ---------- build mode ----------
  function setStep(i) {
    i = Math.max(0, Math.min(steps.length - 1, i));
    state.step = i;
    const visible = new Set();
    for (let k = 0; k <= i; k++) (steps[k].component_ids || []).forEach((id) => visible.add(id));
    const hl = steps[i].component_ids || [];
    mDevice.setVisibleParts(Array.from(visible));
    mDevice.setHighlight(hl);
    const internal = /^(pod|egg|sock|bands|pad_|floor|toggles)/;
    mDevice.setXray(hl.some((id) => internal.test(id)) || state.xray);
    buildAnim.clear();
    const now = performance.now();
    hl.forEach((id) => buildAnim.set(id, now));
    document.dispatchEvent(new CustomEvent('buildstep', { detail: { index: i } }));
  }
  function animateBuild(now) {
    if (mode !== 'build' || !buildAnim.size) return;
    buildAnim.forEach((t0, id) => {
      const k = (now - t0) / 650;
      const off = reduced ? 0 : 24 * (1 - ease(k));
      mDevice.setPartOffset(id, off);
      if (k >= 1) buildAnim.delete(id);
    });
  }

  // ---------- drop mode ----------
  function dropReset() {
    const P = SPEC.physics, S = SPEC.sim || {};
    traj = Sim.trajectory({ h0: P.design_height_m, m: P.mass_kg, cd: P.cd, area: P.drag_area_m2 });
    land = Sim.landing({ vImpact: traj.vImpact, crumple_m: S.crumple_m, suspension_m: S.suspension_m, shape: S.pulse_shape });
    drop = { t: 0, playing: false, speed: 1, slowmo: true, done: false, maxG: 0, phase: 'READY', rate: 1 };
    dTotal = traj.tImpact + land.tEgg + 1.8;
    dDevice.setCrumple(0); dDevice.setEggOffset(0); dDevice.setVisibleParts(null); dDevice.setHighlight(null); dDevice.setExplode(0);
    const u = dScene.userData.drop;
    dDevice.group.position.set(u.x, u.H, u.z);
    dControls.set({ radius: 3.4, phi: 1.38, theta: 0.9, target: new THREE.Vector3(u.x, u.H + 0.15, u.z) });
    if (state.camMode === 'wide') dControls.set({ radius: 46, phi: 1.25, theta: 0.55, target: new THREE.Vector3(0, u.H * 0.45, u.z) });
    updateTelemetry(u.H, 0, 0, 0, 'READY');
    document.dispatchEvent(new CustomEvent('dropstate', { detail: { playing: false, done: false } }));
  }
  function dropPlay() { if (!drop) dropReset(); if (drop.done) dropReset(); drop.playing = true; document.dispatchEvent(new CustomEvent('dropstate', { detail: { playing: true, done: false } })); }
  function dropPause() { if (drop) { drop.playing = false; document.dispatchEvent(new CustomEvent('dropstate', { detail: { playing: false, done: drop.done } })); } }
  function dropReplay() { dropReset(); dropPlay(); }
  function dropStep(dt) {
    if (!drop || !drop.playing) return;
    const u = dScene.userData.drop, g = Sim.G, P = SPEC.physics, S = SPEC.sim || {};
    const tI = traj.tImpact;
    const nearImpact = drop.t > tI - 0.22 && drop.t < tI + land.tEgg + 0.3;
    drop.rate = drop.slowmo && nearImpact ? 0.08 : 1;
    drop.t += dt * drop.speed * drop.rate;
    let y = 0, v = 0, gEgg = 0, phase = '', crumple = 0, eggOff = 0;
    if (drop.t < tI) {
      const s = Sim.sample(traj, drop.t); y = s.y; v = s.v;
      const k = 0.5 * Sim.RHO * P.cd * P.drag_area_m2 / P.mass_kg;
      gEgg = k * v * v / g;
      phase = drop.t < 0.08 ? 'RELEASE' : (v < 0.92 * traj.vt ? 'ACCELERATING' : 'TERMINAL VELOCITY');
    } else {
      const tau = drop.t - tI;
      const vi = traj.vImpact;
      const body = Sim.pulse(vi, land.dBody, tau, S.pulse_shape);
      const egg = Sim.pulse(vi, land.dEgg, tau, S.pulse_shape);
      crumple = body.s / land.dBody;
      v = egg.vel;
      gEgg = egg.a / g;
      if (!egg.done) {
        eggOff = Math.max(0, egg.s - body.s);
        phase = body.done ? 'PAD AND SPONGE' : 'IMPACT · CUPS CRUSH';
      } else {
        const t2 = tau - egg.T;
        const rest = (S.static_sag_cm || 1) * CM;
        const start = land.dEgg - land.dBody;
        eggOff = rest + (start - rest) * Math.exp(-4.2 * t2) * Math.cos(2 * Math.PI * 1.6 * t2);
        gEgg = 1 + (start - rest) / Math.max(0.01, start) * Math.exp(-4.2 * t2) * Math.cos(2 * Math.PI * 1.6 * t2) * 0.4;
        v = 0;
        phase = t2 < 1.1 ? 'SETTLE' : 'EGG INTACT';
        if (drop.t >= dTotal) { drop.playing = false; drop.done = true; document.dispatchEvent(new CustomEvent('dropstate', { detail: { playing: false, done: true } })); }
      }
    }
    drop.maxG = Math.max(drop.maxG, gEgg);
    drop.phase = phase;
    dDevice.group.position.y = y;
    dDevice.setCrumple(Math.min(1, crumple));
    dDevice.setEggOffset(eggOff / CM);
    // camera
    const devC = new THREE.Vector3(u.x, y + SPEC.dims_cm.H * CM * 0.5 - crumple * land.dBody, u.z);
    if (state.camMode === 'follow') {
      const close = drop.t > tI - 1.0;
      const goalR = close ? 1.15 : 3.4;
      const goalPhi = close ? 1.25 : 1.38;
      const k = Math.min(1, dt * (close ? 2.2 : 3));
      dControls.radius += (goalR - dControls.radius) * k;
      dControls.phi += (goalPhi - dControls.phi) * k;
      dControls.target.lerp(devC, Math.min(1, dt * 8));
      if (close && drop.playing && !reduced) dControls.theta += dt * 0.12 * (drop.rate < 1 ? 1 : 0.4);
    }
    updateTelemetry(y, v, drop.t, gEgg, phase);
  }
  function updateTelemetry(y, v, t, gEgg, phase) {
    if (!stage) return;
    const tel = stage.querySelector('.telemetry'); if (!tel) return;
    const q = (n) => tel.querySelector('[data-tel="' + n + '"]');
    const set = (n, s) => { const e = q(n); if (e) e.textContent = s; };
    set('h', y.toFixed(2) + ' m');
    set('v', v.toFixed(1) + ' m/s · ' + (v * 3.6).toFixed(0) + ' km/h');
    set('t', t.toFixed(2) + ' s' + (drop && drop.rate < 1 ? '  ×' + drop.rate.toFixed(2) : ''));
    set('g', gEgg.toFixed(1) + ' g');
    set('gmax', (drop ? drop.maxG : 0).toFixed(1) + ' g');
    set('phase', phase);
  }

  // ---------- loop ----------
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (!stage || document.hidden) { last = now; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    if (mode === 'drop') {
      dropStep(dt);
      dControls.update(dt);
      renderer.render(dScene, dCamera);
    } else {
      animateBuild(now);
      if (mDevice.update) mDevice.update(dt);
      mControls.update(dt);
      renderer.render(mScene, mCamera);
      if (mode === 'model') projectLabels();
    }
  }

  return {
    init,
    get mode() { return mode; },
    get ready() { return !!renderer; },
    setExplode(f) { state.explode = f; if (mode === 'model') mDevice.setExplode(f); },
    setLabels(on) { state.labels = on; clearLabels(); if (mode === 'model') makeLabels(); },
    toggleXray() { state.xray = !state.xray; mDevice.setXray(state.xray); return state.xray; },
    toggleLabels() { this.setLabels(!state.labels); return state.labels; },
    setStep, get step() { return state.step; }, get stepCount() { return steps.length; },
    nextStep() { setStep(state.step + 1); }, prevStep() { setStep(state.step - 1); },
    dropPlay, dropPause, dropReplay,
    get dropPlaying() { return !!(drop && drop.playing); },
    toggleSlowmo() { if (drop) drop.slowmo = !drop.slowmo; return drop ? drop.slowmo : true; },
    get slowmo() { return drop ? drop.slowmo : true; },
    setCamMode(m) { state.camMode = m; if (drop) { const u = dScene.userData.drop; if (m === 'wide') dControls.set({ radius: 46, phi: 1.25, theta: 0.55, target: new THREE.Vector3(0, u.H * 0.45, u.z) }); else dControls.set({ radius: 3.4, phi: 1.38 }); } },
    get camMode() { return state.camMode; },
    zoom(f) { (mode === 'drop' ? dControls : mControls).zoomBy(f); },
    resetView() { if (mode === 'drop') { this.setCamMode(state.camMode); } else { mControls.set({ radius: Math.max(SPEC.dims_cm.L, SPEC.dims_cm.H) * 3.0, phi: 1.1, theta: 0.65, target: new THREE.Vector3(0, SPEC.dims_cm.H * 0.5, 0) }); } },
    get drop() { return drop; }, get traj() { return traj; }, get land() { return land; },
  };
})();
