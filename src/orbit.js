// Minimal orbit controls (drag to rotate, pinch / ctrl+wheel / buttons to zoom) with damping.
// Plain wheel scrolls the deck; zoom needs ctrl/cmd + wheel so the presentation stays scrollable.
function OrbitControls(camera, dom, opts) {
  opts = opts || {};
  const self = this;
  this.target = new THREE.Vector3(0, 0, 0);
  this.theta = opts.theta != null ? opts.theta : 0.6;   // azimuth
  this.phi = opts.phi != null ? opts.phi : 1.15;        // polar (0 = top)
  this.radius = opts.radius != null ? opts.radius : 60;
  this.minRadius = opts.minRadius || 8;
  this.maxRadius = opts.maxRadius || 400;
  this.minPhi = 0.08; this.maxPhi = Math.PI - 0.15;
  this.autoRotate = !!opts.autoRotate;
  this.autoRotateSpeed = opts.autoRotateSpeed || 0.25; // rad/s
  this.enabled = true;
  let vTheta = 0, vPhi = 0, vZoom = 0;
  let dragging = false, lastX = 0, lastY = 0, pinchDist = 0, pointers = new Map();
  let idleTimer = 0;

  function onDown(e) {
    if (!self.enabled) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { dragging = true; lastX = e.clientX; lastY = e.clientY; }
    if (pointers.size === 2) { const p = Array.from(pointers.values()); pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }
    dom.setPointerCapture && dom.setPointerCapture(e.pointerId);
    self.autoRotate = false; idleTimer = 0;
  }
  function onMove(e) {
    if (!self.enabled || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const p = Array.from(pointers.values());
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      if (pinchDist > 0) vZoom += (pinchDist - d) * 0.01;
      pinchDist = d;
      return;
    }
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    vTheta -= dx * 0.006; vPhi -= dy * 0.006;
  }
  function onUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0) dragging = false;
  }
  function onWheel(e) {
    if (!self.enabled) return;
    if (!(e.ctrlKey || e.metaKey)) return; // let the deck scroll
    e.preventDefault();
    vZoom += e.deltaY * 0.004;
  }
  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointermove', onMove);
  dom.addEventListener('pointerup', onUp);
  dom.addEventListener('pointercancel', onUp);
  dom.addEventListener('pointerleave', onUp);
  dom.addEventListener('wheel', onWheel, { passive: false });

  this.zoomBy = function (f) { vZoom += f; self.autoRotate = false; };
  this.set = function (o) {
    if (o.theta != null) self.theta = o.theta;
    if (o.phi != null) self.phi = o.phi;
    if (o.radius != null) self.radius = o.radius;
    if (o.target) self.target.copy(o.target);
    vTheta = vPhi = vZoom = 0;
  };
  this.update = function (dt) {
    dt = Math.min(dt || 0.016, 0.05);
    if (self.autoRotate) self.theta += self.autoRotateSpeed * dt;
    self.theta += vTheta; self.phi += vPhi;
    self.radius *= Math.exp(vZoom);
    vTheta *= 0.82; vPhi *= 0.82; vZoom *= 0.7;
    self.phi = Math.max(self.minPhi, Math.min(self.maxPhi, self.phi));
    self.radius = Math.max(self.minRadius, Math.min(self.maxRadius, self.radius));
    const sp = Math.sin(self.phi);
    camera.position.set(
      self.target.x + self.radius * sp * Math.sin(self.theta),
      self.target.y + self.radius * Math.cos(self.phi),
      self.target.z + self.radius * sp * Math.cos(self.theta)
    );
    camera.lookAt(self.target);
  };
  this.dispose = function () {
    dom.removeEventListener('pointerdown', onDown); dom.removeEventListener('pointermove', onMove);
    dom.removeEventListener('pointerup', onUp); dom.removeEventListener('pointercancel', onUp);
    dom.removeEventListener('pointerleave', onUp); dom.removeEventListener('wheel', onWheel);
  };
}
