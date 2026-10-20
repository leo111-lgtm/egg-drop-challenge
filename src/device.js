// Builds the Lantern Lander Mk2 as a Three.js group in centimetres, y = 0 at the cup mouths on the ground,
// centred on x and z. Geometry comes from SPEC.geometry so the 3D model and the blueprint share one set of numbers.
// Bottom to top: 9 oz crumple cups · floor + 16 × 12 sleeve (door on the front, +z) with 2 cm pads inside,
// socket, pod and egg · canopy · 3 oz bumper cups. 3 oz side cups on every wall.
function buildDevice(THREE, S) {
  const G = S.geometry;
  const group = new THREE.Group();
  const parts = {};
  const meta = {};
  const aliases = { cups_side: ['cups_side_f', 'cups_side_b', 'cups_side_l', 'cups_side_r'], pads_wall: ['pad_wall_f', 'pad_wall_b', 'pad_wall_l', 'pad_wall_r'] };
  const bandSegs = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const mat = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.88, metalness: 0.0 }, o || {}));
  const COL = { card: 0xcfa872, cardDark: 0xb48d5a, cup: 0xf1ebdf, band: 0xd94f3d, egg: 0xf6ead3, pulp: 0xb7b2a6, paper: 0xe6e2d8, straw: 0xffffff, sponge: 0xe9d85a };
  const L = buildLayout(G);
  const C = G.canopy, SL = G.sleeve, CB = G.cups_bottom, CT = G.cups_top, CS = G.cups_side, PD = G.pads, PO = G.pod, E = G.egg, SO = G.socket;
  const half = SL.w / 2, t = SL.t;

  function add(id, obj, base, dir, flags) {
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    obj.userData.id = id;
    group.add(obj);
    parts[id] = obj;
    meta[id] = Object.assign({ base: base.clone(), dir: dir || V(0, 0, 0), off: 0, body: true, egg: false, crush: false }, flags || {});
    return obj;
  }
  const _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion();
  function orient(mesh, a, b) {
    _d.subVectors(b, a);
    const len = Math.max(0.01, _d.length());
    mesh.position.copy(a).addScaledVector(_d, 0.5);
    mesh.scale.set(1, len, 1);
    _q.setFromUnitVectors(_up, _d.normalize());
    mesh.quaternion.copy(_q);
  }
  function cylBetween(a, b, r, m) { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8, 1), m); orient(mesh, a, b); return mesh; }
  // a paper cup standing on its base at the origin, mouth at +y
  function cupGeo(c) { const g = new THREE.CylinderGeometry(c.r_mouth, c.r_base, c.h, 22, 1, false); g.translate(0, c.h / 2, 0); return g; }

  // ----- bottom crumple cups: mouth down on the ground, base glued under the floor corners -----
  const cupsBottom = new THREE.Group();
  const cornerXZ = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  cornerXZ.forEach(([sx, sz]) => {
    const g = new THREE.CylinderGeometry(CB.r_base, CB.r_mouth, CB.h, 22, 1, false); g.translate(0, CB.h / 2, 0);
    const m = new THREE.Mesh(g, mat(COL.cup));
    m.position.set(sx * (half - CB.inset), 0, sz * (half - CB.inset));
    cupsBottom.add(m);
  });
  add('cups_bottom', cupsBottom, V(0, 0, 0), V(0, -1, 0), { crush: true, body: false });

  // ----- floor, floor pad, socket -----
  add('floor', new THREE.Mesh(new THREE.BoxGeometry(SL.w - 2 * t, t, SL.d - 2 * t), mat(COL.cardDark)), V(0, L.floorBottom + t / 2, 0), V(0, -0.4, 0));
  add('pad_floor', new THREE.Mesh(new THREE.BoxGeometry(PD.floor, PD.t, PD.floor), mat(COL.paper)), V(0, L.floorTop + PD.t / 2, 0), V(0, -0.25, 0));
  const ringGeo = new THREE.CylinderGeometry(SO.r, SO.r, SO.h, 32, 1, true);
  add('socket', new THREE.Mesh(ringGeo, mat(COL.cardDark, { side: THREE.DoubleSide })), V(0, L.padFloorTop + SO.h / 2, 0), V(0, -0.1, 0));

  // ----- sleeve walls; the front wall (+z) carries the door -----
  const wallMat = () => mat(COL.card, { side: THREE.DoubleSide });
  const front = new THREE.Shape();
  front.moveTo(-half, 0); front.lineTo(half, 0); front.lineTo(half, SL.h); front.lineTo(-half, SL.h); front.closePath();
  const door = new THREE.Path();
  const dw = SL.door.w, dh = SL.door.h, dy = SL.door.bottom_offset;
  door.moveTo(-dw / 2, dy); door.lineTo(dw / 2, dy); door.lineTo(dw / 2, dy + dh); door.lineTo(-dw / 2, dy + dh); door.closePath();
  front.holes.push(door);
  const frontGeo = new THREE.ExtrudeGeometry(front, { depth: t, bevelEnabled: false });
  frontGeo.translate(0, 0, -t);
  add('wall_front', new THREE.Mesh(frontGeo, wallMat()), V(0, L.floorBottom, half), V(0, 0, 1));
  add('wall_back', new THREE.Mesh(new THREE.BoxGeometry(SL.w, SL.h, t), wallMat()), V(0, L.floorBottom + SL.h / 2, -half + t / 2), V(0, 0, -1));
  add('wall_left', new THREE.Mesh(new THREE.BoxGeometry(t, SL.h, SL.d - 2 * t), wallMat()), V(-half + t / 2, L.floorBottom + SL.h / 2, 0), V(-1, 0, 0));
  add('wall_right', new THREE.Mesh(new THREE.BoxGeometry(t, SL.h, SL.d - 2 * t), wallMat()), V(half - t / 2, L.floorBottom + SL.h / 2, 0), V(1, 0, 0));

  // ----- wall pads (2 cm newspaper on every inner wall) -----
  const padY = L.floorBottom + SL.h / 2;
  add('pad_wall_f', new THREE.Mesh(new THREE.BoxGeometry(PD.wall_w, PD.wall_h, PD.t), mat(COL.paper)), V(0, padY, half - t - PD.t / 2), V(0, 0, 1));
  add('pad_wall_b', new THREE.Mesh(new THREE.BoxGeometry(PD.wall_w, PD.wall_h, PD.t), mat(COL.paper)), V(0, padY, -half + t + PD.t / 2), V(0, 0, -1));
  add('pad_wall_l', new THREE.Mesh(new THREE.BoxGeometry(PD.t, PD.wall_h, PD.wall_w), mat(COL.paper)), V(-half + t + PD.t / 2, padY, 0), V(-1, 0, 0));
  add('pad_wall_r', new THREE.Mesh(new THREE.BoxGeometry(PD.t, PD.wall_h, PD.wall_w), mat(COL.paper)), V(half - t - PD.t / 2, padY, 0), V(1, 0, 0));

  // ----- ceiling pad under the canopy, canopy, bumper cups -----
  add('pad_top', new THREE.Mesh(new THREE.BoxGeometry(PD.floor, PD.t, PD.floor), mat(COL.paper)), V(0, L.sleeveTop - PD.t / 2, 0), V(0, 0.5, 0));
  const canShape = new THREE.Shape();
  canShape.moveTo(-C.w / 2, -C.d / 2); canShape.lineTo(C.w / 2, -C.d / 2); canShape.lineTo(C.w / 2, C.d / 2); canShape.lineTo(-C.w / 2, C.d / 2); canShape.closePath();
  if (C.vent_r > 0) { const hole = new THREE.Path(); hole.absarc(0, 0, C.vent_r, 0, Math.PI * 2, true); canShape.holes.push(hole); }
  const canGeo = new THREE.ExtrudeGeometry(canShape, { depth: C.t, bevelEnabled: false });
  canGeo.rotateX(Math.PI / 2); canGeo.translate(0, C.t, 0);
  add('canopy', new THREE.Mesh(canGeo, mat(COL.card)), V(0, L.canopyBottom, 0), V(0, 1, 0));
  const cupsTop = new THREE.Group();
  cornerXZ.forEach(([sx, sz]) => {
    const m = new THREE.Mesh(cupGeo(CT), mat(COL.cup));
    m.position.set(sx * (C.w / 2 - CT.inset), 0, sz * (C.d / 2 - CT.inset));
    cupsTop.add(m);
  });
  add('cups_top', cupsTop, V(0, L.canopyTop, 0), V(0, 1.6, 0));

  // ----- side cups: four per wall, base on the wall, mouth outward -----
  const sideDefs = [
    ['cups_side_f', (x, y) => V(x, y, half), new THREE.Euler(Math.PI / 2, 0, 0), V(0, 0, 1)],
    ['cups_side_b', (x, y) => V(x, y, -half), new THREE.Euler(-Math.PI / 2, 0, 0), V(0, 0, -1)],
    ['cups_side_r', (x, y) => V(half, y, x), new THREE.Euler(0, 0, -Math.PI / 2), V(1, 0, 0)],
    ['cups_side_l', (x, y) => V(-half, y, x), new THREE.Euler(0, 0, Math.PI / 2), V(-1, 0, 0)],
  ];
  sideDefs.forEach(([id, pos, rot, dir]) => {
    const grp = new THREE.Group();
    [-CS.dx, CS.dx].forEach((x) => CS.rows.forEach((row) => {
      const m = new THREE.Mesh(cupGeo(CS), mat(COL.cup));
      m.rotation.copy(rot);
      m.position.copy(pos(x, L.floorBottom + row));
      grp.add(m);
    }));
    add(id, grp, V(0, 0, 0), dir);
  });

  // ----- pod (carton cell + dome lid + sponges) and egg, seated in the socket -----
  const pod = new THREE.Group();
  const cell = new THREE.Mesh(new THREE.CylinderGeometry(PO.w / 2, PO.w * 0.4, PO.cell_h, 20, 1, false), mat(COL.pulp));
  cell.position.y = -PO.h / 2 + PO.cell_h / 2;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(PO.w / 2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(COL.pulp, { side: THREE.DoubleSide }));
  dome.scale.set(1, (PO.h - PO.cell_h) / (PO.w / 2), 1);
  dome.position.y = -PO.h / 2 + PO.cell_h;
  const spongeB = new THREE.Mesh(new THREE.CylinderGeometry(PO.w * 0.42, PO.w * 0.4, G.sponge_t, 16), mat(COL.sponge));
  spongeB.position.y = -PO.h / 2 + G.sponge_t / 2 + 0.05;
  pod.add(cell); pod.add(dome); pod.add(spongeB);
  add('pod', pod, V(0, L.podCenterY, 0), V(0, 0.9, 0), { egg: true });
  const eggGeo = new THREE.SphereGeometry(E.dia / 2, 28, 22);
  eggGeo.scale(1, E.len / E.dia, 1);
  add('egg', new THREE.Mesh(eggGeo, mat(COL.egg, { roughness: 0.5 })), V(0, L.podCenterY - PO.h / 2 + G.sponge_t + E.len / 2, 0), V(0, 1.9, 0), { egg: true });

  // ----- two retaining bands crossed over the pod lid, anchored at the top centre of opposite walls -----
  const bandMat = mat(COL.band, { roughness: 0.6 });
  const bandGroup = new THREE.Group();
  const ay = L.anchorY;
  const anchorPairs = [[V(0, ay, half - t), V(0, ay, -half + t)], [V(half - t, ay, 0), V(-half + t, ay, 0)]];
  anchorPairs.forEach((pair) => pair.forEach((a) => {
    const seg = cylBetween(a, V(0, L.podTop, 0), G.bands.r, bandMat);
    seg.userData.anchor = a.clone();
    bandGroup.add(seg); bandSegs.push(seg);
  }));
  add('bands', bandGroup, V(0, 0, 0), V(0, 0, 0), { band: true });
  const toggles = new THREE.Group();
  [[0, half + 0.25, 'z'], [0, -half - 0.25, 'z'], [half + 0.25, 0, 'x'], [-half - 0.25, 0, 'x']].forEach(([x, z, axis]) => {
    const tg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, G.anchors.toggle_len, 10), mat(COL.straw));
    if (axis === 'z') tg.rotation.z = Math.PI / 2; else tg.rotation.x = Math.PI / 2;
    tg.position.set(x, ay, z);
    toggles.add(tg);
  });
  add('toggles', toggles, V(0, 0, 0), V(0, 0, 0));

  // ----- state and composition -----
  const state = { crumple: 0, eggOff: 0, explode: 0, highlight: null, visible: null, xray: false };
  const crumpleDepth = CB.h * (1 - CB.crush_to);
  const EXPLODE = G.explode_cm || 9;
  const _p = new THREE.Vector3();
  function compose() {
    const sink = state.crumple * crumpleDepth;
    for (const id in meta) {
      const m = meta[id], obj = parts[id];
      if (m.band) continue;
      _p.copy(m.base).addScaledVector(m.dir, state.explode * EXPLODE);
      _p.y += m.off;
      if (m.body) _p.y -= sink;
      if (m.egg) _p.y -= sink + state.eggOff;
      if (m.crush) { obj.scale.y = Math.max(CB.crush_to, 1 - state.crumple * (1 - CB.crush_to)); obj.scale.x = obj.scale.z = 1 + state.crumple * 0.25; }
      obj.position.copy(_p);
    }
    const ex = state.explode * EXPLODE;
    const top = V(0, L.podTop - sink - state.eggOff + meta.pod.dir.y * ex, 0);
    bandSegs.forEach((b) => { const a = b.userData.anchor.clone(); a.y -= sink; orient(b, a, top); });
  }
  compose();

  function expand(ids) { const out = []; ids.forEach((id) => { if (aliases[id]) out.push.apply(out, aliases[id]); else out.push(id); }); return out; }
  function applyLook() {
    for (const id in parts) {
      const obj = parts[id];
      obj.visible = !state.visible || state.visible.has(id);
      const hl = state.highlight ? state.highlight.has(id) : null;
      const isWall = /^wall_/.test(id) || id === 'canopy';
      obj.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        if (m.userData.baseOpacity == null) { m.userData.baseOpacity = m.opacity; m.userData.baseTransparent = m.transparent; }
        const base = (state.xray && isWall) ? 0.22 : m.userData.baseOpacity;
        const trans = (state.xray && isWall) ? true : m.userData.baseTransparent;
        if (hl === true) { m.emissive = new THREE.Color(0xcf8400); m.emissiveIntensity = 0.4; m.opacity = base; m.transparent = trans; }
        else if (hl === false) { m.emissive = new THREE.Color(0x000000); m.emissiveIntensity = 0; m.opacity = Math.min(base, 0.25); m.transparent = true; }
        else { m.emissive = new THREE.Color(0x000000); m.emissiveIntensity = 0; m.opacity = base; m.transparent = trans; }
        m.depthWrite = !(m.transparent && m.opacity < 0.5);
      });
    }
  }

  const labelPoints = (G.labels || []).map((l) => ({ id: l.id, text: l.text, local: V(l.at[0], l.at[1], l.at[2]) }));

  return {
    group, parts, labelPoints, layout: L, aliases,
    crumpleDepthCm: crumpleDepth,
    setCrumple(f) { state.crumple = Math.max(0, Math.min(1, f)); compose(); },
    setEggOffset(cm) { state.eggOff = Math.max(0, cm); compose(); },
    setExplode(f) { state.explode = Math.max(0, Math.min(1, f)); compose(); },
    setPartOffset(id, dy) { expand([id]).forEach((k) => { if (meta[k]) meta[k].off = dy; }); compose(); },
    setVisibleParts(ids) { state.visible = ids ? new Set(expand(ids)) : null; applyLook(); },
    setHighlight(ids) { state.highlight = ids && ids.length ? new Set(expand(ids)) : null; applyLook(); },
    setXray(on) { state.xray = !!on; applyLook(); },
    get xray() { return state.xray; },
    update() {},
  };
}

// Vertical layout shared by the 3D model, the blueprint and the content (cm, y = 0 at the cup mouths on the ground).
function buildLayout(G) {
  const cupH = G.cups_bottom.h, t = G.sleeve.t;
  const floorBottom = cupH;
  const floorTop = cupH + t;
  const sleeveTop = cupH + G.sleeve.h;
  const canopyBottom = sleeveTop;
  const canopyTop = sleeveTop + G.canopy.t;
  const total = canopyTop + G.cups_top.h;
  const padFloorTop = floorTop + G.pads.t;
  const padTopBottom = sleeveTop - G.pads.t;
  const podBottom = padFloorTop;
  const podCenterY = podBottom + G.pod.h / 2;
  const podTop = podBottom + G.pod.h;
  return {
    cupH, floorBottom, floorTop, sleeveTop, canopyBottom, canopyTop, total, padFloorTop, padTopBottom, podBottom, podCenterY, podTop,
    anchorY: sleeveTop - G.bands.anchor_from_top,
    clearAbove: padTopBottom - podTop,
    clearSide: G.sleeve.w / 2 - t - G.pads.t - G.pod.w / 2,
  };
}
