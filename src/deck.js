// Deck navigation: scroll-snap sheets, keyboard, HUD, index overlay, theme toggle, hash deep-links.
(function () {
  const deck = document.getElementById('deck');
  const sheets = Array.from(deck.querySelectorAll('.sheet'));
  const counter = document.getElementById('hud-counter');
  const bar = document.getElementById('progress-bar');
  const index = document.getElementById('index');
  const indexList = document.getElementById('index-list');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;

  // Index overlay entries
  sheets.forEach((s, i) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + s.id;
    a.innerHTML = '<span>' + String(i + 1).padStart(2, '0') + '</span>' + (s.dataset.title || s.id);
    a.addEventListener('click', (e) => { e.preventDefault(); closeIndex(); go(i); });
    li.appendChild(a);
    indexList.appendChild(li);
  });

  let animId = 0;
  function go(i, instant) {
    i = Math.max(0, Math.min(sheets.length - 1, i));
    const target = sheets[i].offsetTop;
    cancelAnimationFrame(animId);
    if (instant || reduced) { deck.scrollTop = target; }
    else {
      const from = deck.scrollTop, dist = target - from, dur = Math.min(650, 280 + Math.abs(dist) * 0.08);
      const t0 = performance.now();
      const stepFn = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        deck.scrollTop = from + dist * e;
        if (k < 1) animId = requestAnimationFrame(stepFn);
      };
      animId = requestAnimationFrame(stepFn);
    }
    if (history.replaceState) history.replaceState(null, '', '#' + sheets[i].id);
  }
  function update() {
    counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(sheets.length).padStart(2, '0');
    bar.style.width = ((current + 1) / sheets.length * 100) + '%';
    indexList.querySelectorAll('a').forEach((a, i) => a.classList.toggle('active', i === current));
  }
  function openIndex() { index.hidden = false; const first = index.querySelector('a.active') || index.querySelector('a'); if (first) first.focus(); }
  function closeIndex() { index.hidden = true; }

  // Active sheet = the one under the viewport's vertical midpoint (works for sheets taller than the screen).
  let ticking = false;
  function detect() {
    ticking = false;
    const mid = deck.scrollTop + deck.clientHeight * 0.5;
    let i = 0;
    for (let k = 0; k < sheets.length; k++) { if (sheets[k].offsetTop <= mid) i = k; else break; }
    if (i !== current) {
      current = i;
      update();
      document.dispatchEvent(new CustomEvent('sheetchange', { detail: { index: i, sheet: sheets[i] } }));
    }
  }
  deck.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(detect); } }, { passive: true });
  window.addEventListener('resize', detect);

  document.getElementById('hud-prev').addEventListener('click', () => go(current - 1));
  document.getElementById('hud-next').addEventListener('click', () => go(current + 1));
  document.getElementById('hud-index').addEventListener('click', () => (index.hidden ? openIndex() : closeIndex()));
  document.getElementById('index-close').addEventListener('click', closeIndex);
  index.addEventListener('click', (e) => { if (e.target === index) closeIndex(); });

  const themeBtn = document.getElementById('hud-theme');
  themeBtn.addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'light' : 'dark';
    document.dispatchEvent(new CustomEvent('themechange'));
  });

  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (!index.hidden) { if (e.key === 'Escape') { e.preventDefault(); closeIndex(); } return; }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': e.preventDefault(); go(current + 1); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': e.preventDefault(); go(current - 1); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End': e.preventDefault(); go(sheets.length - 1); break;
      case 'i': case 'I': e.preventDefault(); openIndex(); break;
      case 'Escape': closeIndex(); break;
    }
  });

  // Deep link: #s05 etc. Only plain tokens reach location.hash in the viewer.
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target && sheets.includes(target)) {
    current = sheets.indexOf(target);
    go(current, true);
  }
  update();
  setTimeout(() => { detect(); document.dispatchEvent(new CustomEvent('sheetchange', { detail: { index: current, sheet: sheets[current] } })); }, 0);
  window.Deck = { go, get current() { return current; }, sheets };
})();
