/* F4M start page.
   1) Logo: the short name assembled from drifting fibres (canvas).
   2) Line drawings for three of the four length scales: molecule, nanofibril, material.
   Source and notes on what is exact and what is schematic: prototypes/2026-11-20_start-page/ (hero-c.html, README.md). */

/* ---------- 1) Logo ---------- */
(() => {
  const cv = document.getElementById('logo-fibres');
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext('2d');
  const stage = cv.parentElement, btn = document.getElementById('logo-replay');
  const TEXT = cv.dataset.text || 'F4M';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COL = ['#1d2b23', '#4a6a4c', '#c9982b'];
  const TH = -0.30;                       // direction of the ordered fibres (radians)
  const R = 80;                           // pointer reach in px
  let W = 0, H = 0, dpr = 1, fibres = [], ambient = [], t0 = 0, last = 0, raf = 0, onScreen = true;
  const ptr = { x: 0, y: 0, on: false };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = p => p <= 0 ? 0 : p >= 1 ? 1 : (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const turn = (from, to) => { let d = (((to - from) % Math.PI) + Math.PI) % Math.PI; return d > Math.PI / 2 ? d - Math.PI : d; };
  const pick = () => { const r = Math.random(); return r < .6 ? 0 : r < .9 ? 1 : 2; };

  function letterTargets() {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d', { willReadFrequently: true });
    const font = fs => { o.font = `900 ${fs}px Archivo, system-ui, sans-serif`; if ('fontStretch' in o) o.fontStretch = 'expanded'; if ('letterSpacing' in o) o.letterSpacing = (-fs * .02) + 'px'; };
    font(100);
    let m = o.measureText(TEXT);
    const fs = Math.min(W * .86 / m.width, H * .84 / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)) * 100;
    font(fs);
    m = o.measureText(TEXT);
    o.fillText(TEXT, (W - m.width) / 2, (H + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
    const px = o.getImageData(0, 0, W, H).data;
    const inside = (x, y) => { x |= 0; y |= 0; return x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] > 128; };

    const ux = Math.cos(TH), uy = Math.sin(TH), nx = -uy, ny = ux, cx = W / 2, cy = H / 2;
    const gap = Math.max(2.8, fs / 60), diag = Math.hypot(W, H) / 2, out = [];
    const split = (a, b, d) => {
      let s = a;
      while (b - s > 5) {
        let L = Math.min(b - s, rnd(fs * .07, fs * .19));
        if (b - s - L < 7) L = b - s;
        const mid = s + L / 2, jd = d + rnd(-.5, .5);
        out.push({ tx: cx + mid * ux + jd * nx, ty: cy + mid * uy + jd * ny, h: Math.max(2, L / 2 - 1.1), ta: TH + rnd(-.03, .03) });
        s += L + 1.3;
      }
    };
    for (let d = -diag; d <= diag; d += gap) {
      let run = null;
      for (let t = -diag; t <= diag; t += 1.25) {
        if (inside(cx + t * ux + d * nx, cy + t * uy + d * ny)) { if (run === null) run = t; }
        else if (run !== null) { split(run, t, d); run = null; }
      }
    }
    return { out, fs };
  }

  function scatter(f) {
    f.sx = rnd(-20, W + 20); f.sy = rnd(-10, H + 10); f.sa = rnd(0, Math.PI);
    f.spin = rnd(-.5, .5); f.vx = rnd(3, 12); f.vy = rnd(-3, 3); f.ph = rnd(0, 6.28);
    f.bend = rnd(-.55, .55) * f.h;
    f.delay = .4 + (f.tx / W) * 1.4 + rnd(0, .5); f.dur = rnd(1.4, 2.2);
  }

  function build() {
    const box = cv.getBoundingClientRect();
    W = Math.max(200, Math.round(box.width)); H = Math.max(120, Math.round(box.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    const { out, fs } = letterTargets();
    const lw = Math.max(1.2, fs / 120);
    fibres = out.map(f => { const g = Object.assign(f, { c: pick(), lw: lw * rnd(.8, 1.25), ox: 0, oy: 0, vox: 0, voy: 0, oa: 0, va: 0 }); scatter(g); return g; });
    const n = Math.round(Math.min(40, W / 14));
    ambient = Array.from({ length: n }, () => ({ x: rnd(0, W), y: rnd(0, H), a: rnd(0, Math.PI), spin: rnd(-.25, .25), vx: rnd(4, 11), h: rnd(fs * .03, fs * .08), bend: rnd(-.5, .5), ph: rnd(0, 6.28), c: pick(), lw: lw * .8 }));
    return fibres.length > 0;
  }

  function stroke(x, y, a, h, bend, c, lw) {
    const ux = Math.cos(a) * h, uy = Math.sin(a) * h;
    ctx.strokeStyle = COL[c]; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x - ux, y - uy);
    ctx.quadraticCurveTo(x - Math.sin(a) * bend, y + Math.cos(a) * bend, x + ux, y + uy);
    ctx.stroke();
  }

  function frame(now) {
    raf = 0;
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.lineCap = 'round';

    ctx.globalAlpha = .2;
    for (const a of ambient) {
      a.x += a.vx * dt; a.a += a.spin * dt; if (a.x > W + 40) { a.x = -40; a.y = rnd(0, H); }
      stroke(a.x, a.y + Math.sin(t * .5 + a.ph) * 5, a.a, a.h, a.bend * a.h, a.c, a.lw);
    }
    ctx.globalAlpha = 1;

    for (const f of fibres) {
      const p = ease((t - f.delay) / f.dur);
      const lx = f.sx + f.vx * t + Math.sin(t * .7 + f.ph) * 10, ly = f.sy + f.vy * t + Math.cos(t * .5 + f.ph) * 8;
      const la = f.sa + f.spin * t;
      let x = lx + (f.tx - lx) * p + f.ox, y = ly + (f.ty - ly) * p + f.oy;
      const a = la + turn(la, f.ta) * p + f.oa;
      if (ptr.on) {
        const dx = x - ptr.x, dy = y - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < R * R) { const d = Math.sqrt(d2) || 1, k = 1 - d / R; f.vox += dx / d * k * k * 2400 * dt; f.voy += dy / d * k * k * 2400 * dt; f.va += (f.ph > 3.14 ? 1 : -1) * k * 14 * dt; }
      }
      f.vox += (-40 * f.ox - 7 * f.vox) * dt; f.voy += (-40 * f.oy - 7 * f.voy) * dt; f.va += (-30 * f.oa - 6 * f.va) * dt;
      f.ox += f.vox * dt; f.oy += f.voy * dt; f.oa += f.va * dt;
      const sh = Math.sin(t * 1.3 + f.tx * .018 + f.ty * .05) * .5 * p;
      stroke(x - Math.sin(a) * sh, y + Math.cos(a) * sh, a, f.h, f.bend * (1 - p) + f.oa * 10, f.c, f.lw);
    }
    if (!reduce && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  function start(replay) {
    if (!build()) return;                 // nothing to draw: keep the plain text logo
    stage.classList.add('is-live');
    t0 = performance.now() - (replay && !reduce ? 0 : 60000);
    if (reduce) frame(performance.now()); else kick();
  }

  cv.addEventListener('pointermove', e => { const b = cv.getBoundingClientRect(); ptr.x = e.clientX - b.left; ptr.y = e.clientY - b.top; ptr.on = true; });
  cv.addEventListener('pointerleave', () => { ptr.on = false; });
  if (btn && !reduce) { btn.hidden = false; btn.addEventListener('click', () => { fibres.forEach(scatter); t0 = performance.now(); kick(); }); }
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { onScreen = es[0].isIntersecting; if (onScreen && !reduce) kick(); }).observe(cv);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce) kick(); });
  let rz = 0, lastW = 0; addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(rz); rz = setTimeout(() => start(false), 200); });
  lastW = innerWidth;

  (document.fonts && document.fonts.load ? document.fonts.load('900 100px Archivo') : Promise.resolve()).catch(() => {}).then(() => start(true));
})();

/* ---------- 2) Line drawings ---------- */
(() => {
  const chem = document.querySelector('svg[data-scale="molecule"]'), fib = document.querySelector('svg[data-scale="nanofibril"]'), mat = document.querySelector('svg[data-scale="material"]');
  if (!chem || !fib || !mat) return;
  const NS = 'http://www.w3.org/2000/svg';
  const f = n => n.toFixed(1);
  const make = (svg, tag, cls, j, attrs) => { const e = document.createElementNS(NS, tag); e.setAttribute('class', cls); if (tag !== 'text' && !cls.includes('dot') && !cls.includes('stub')) e.setAttribute('pathLength', '1'); e.style.setProperty('--j', j); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const dir = v => { const l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l]; };
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /* Molecule: a piece of the cellulose chain in the textbook convention.
     The repeating unit is glucose (anhydroglucose); two units are drawn because neighbours are turned
     over relative to each other. Beta-1,4-linked 4C1 chairs (standard chair template, C4 left, ring O
     upper right). No brackets: dashed bonds at both ends show that the chain continues.
     Equatorial bonds follow the chair rule (parallel to the ring bonds one position away).
     Unit 1 carries an ester at O-6; the filled dot stands for a variable group R. */
  const S = 19, L = .9, OX = 39.5, OY = 90;
  const VA = [.80, .18], VB = [1, -.22], VC = [.48, .74];       // C4->C5, C5->O5, O5->C1
  function glucose(C4, fy) {
    const m = v => [v[0], v[1] * fy], a = m(VA), b = m(VB), c = m(VC), ea = dir(a), eb = dir(b), ec = dir(c);
    const C5 = add(C4, a), O5 = add(C5, b), C1 = add(O5, c), C2 = add(C1, a, -1), C3 = add(C2, b, -1), C6 = add(C5, ec, -L);
    return { C4, C5, O5, C1, C2, C3, C6, O4: add(C4, eb, -L), O1: add(C1, eb, L), O2: add(C2, ec, L * .9), O3: add(C3, ea, -L * .7), O6: add(C6, dir(m([.78, -.42])), L) };
  }
  const U1 = glucose([0, 0], 1), U2 = glucose(add(U1.O1, dir([1, .22]), L), -1);
  const REPEAT = add(U2.O1, dir([1, -.22]), L)[0];               // x of the next C4 = length of the repeat
  const P = p => [OX + S * p[0], OY + S * p[1]];
  let j = 0; const TO = 5.4;
  const bond = (a, b, ta, tb, cls) => { const dx = b[0] - a[0], dy = b[1] - a[1], D = Math.hypot(dx, dy) || 1; make(chem, 'path', 'd bond' + (cls ? ' ' + cls : ''), j++ * .4, { d: `M${f(a[0] + dx / D * ta)} ${f(a[1] + dy / D * ta)}L${f(b[0] - dx / D * tb)} ${f(b[1] - dy / D * tb)}` }); };
  const label = (p, txt, from) => { const left = from && p[0] < from[0] - 2, wide = txt.length > 1; const t = make(chem, 'text', 'lab', 0, { x: f(p[0] + (wide ? (left ? 3.7 : -3.7) : 0)), y: f(p[1]), dy: '.36em', 'text-anchor': wide ? (left ? 'end' : 'start') : 'middle' }); t.textContent = left && txt === 'OH' ? 'HO' : txt; };
  function drawUnit(U) {
    const q = {}; for (const k in U) q[k] = P(U[k]);
    bond(q.C4, q.C5, 0, 0); bond(q.C5, q.O5, 0, TO); bond(q.O5, q.C1, TO, 0); bond(q.C1, q.C2, 0, 0); bond(q.C2, q.C3, 0, 0); bond(q.C3, q.C4, 0, 0);
    label(q.O5, 'O');
    bond(q.C2, q.O2, 0, TO); label(q.O2, 'OH', q.C2);
    bond(q.C3, q.O3, 0, TO); label(q.O3, 'OH', q.C3);
    bond(q.C5, q.C6, 0, 0);
    return q;
  }
  const q1 = drawUnit(U1), q2 = drawUnit(U2);
  // ester at O-6 of unit 1: O-C(=O)-R, R shown as a dot
  const B = S * L * .9, c7 = [q1.O6[0] - B * .5, q1.O6[1] - B * .87], o7 = [c7[0] + B * .5, c7[1] - B * .87], RG = [c7[0] - B, c7[1]];
  bond(q1.C6, q1.O6, 0, TO); label(q1.O6, 'O');
  bond(q1.O6, c7, TO, 0, 's'); bond(c7, RG, 0, 4.4, 's');
  bond([c7[0] - 1.5, c7[1] - .9], [o7[0] - 1.5, o7[1] - .9], 0, TO, 's'); bond([c7[0] + 1.5, c7[1] + .9], [o7[0] + 1.5, o7[1] + .9], 0, TO, 's');
  label(o7, 'O');
  make(chem, 'circle', 'dot', 0, { cx: f(RG[0]), cy: f(RG[1]), r: 4.6 });
  // free hydroxyl at C-6 of unit 2, glycosidic oxygens, dashed chain ends
  bond(q2.C6, q2.O6, 0, TO); label(q2.O6, 'OH', q2.C6);
  bond(q1.C1, q1.O1, 0, TO); bond(q1.O1, q2.C4, TO, 0); label(q1.O1, 'O');
  const o4 = P(U1.O4), endL = P(add(U1.O4, dir([-1, -.22]), L * 1.1)), endR = P(add(U2.O1, dir([1, -.22]), L * 1.1));
  bond(q1.C4, o4, 0, TO); label(o4, 'O'); bond(o4, endL, TO, 0, 'stub');
  bond(q2.C1, q2.O1, 0, TO); label(q2.O1, 'O'); bond(q2.O1, endR, TO, 0, 'stub');
  const nm = REPEAT * S / 1.03, x0 = 100 - nm / 2;                // two glucose units along the chain = 1.03 nm
  make(chem, 'path', 'd bar', 16, { d: `M${f(x0)} 166H${f(x0 + nm)}M${f(x0)} 163v6M${f(x0 + nm)} 163v6` });
  make(chem, 'text', 'cap', 0, { x: f(x0 + nm), y: 160, 'text-anchor': 'end' }).textContent = '1 nm';

  /* Nanofibril: side view of a short piece of one fibril, schematic.
     Parallel lines stand for the cellulose chains packed side by side; their number is not a statement
     about the chain count of a fibril. Dashed ends: the fibril continues (micrometres long).
     The straw dots are the same variable group R as in the molecule panel, drawn on the two visible
     edges only: the surface is modified, the core is not. Scale: 8 units per nm, fibril about 3.5 nm wide. */
  const NM = 8, WID = 3.5 * NM, NCH = 6, SEG = 30;
  const Q = [[20, 126], [72, 112], [118, 66], [182, 40]];           // centre line (cubic Bezier)
  const bez = t => { const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t; return [a * Q[0][0] + b * Q[1][0] + c * Q[2][0] + d * Q[3][0], a * Q[0][1] + b * Q[1][1] + c * Q[2][1] + d * Q[3][1]]; };
  const tan = t => { const u = 1 - t; return dir([3 * u * u * (Q[1][0] - Q[0][0]) + 6 * u * t * (Q[2][0] - Q[1][0]) + 3 * t * t * (Q[3][0] - Q[2][0]), 3 * u * u * (Q[1][1] - Q[0][1]) + 6 * u * t * (Q[2][1] - Q[1][1]) + 3 * t * t * (Q[3][1] - Q[2][1])]); };
  const at = (t, off) => { const p = bez(t), d = tan(t); return [p[0] - d[1] * off, p[1] + d[0] * off]; };
  for (let k = 0; k < NCH; k++) {
    const off = (k / (NCH - 1) - .5) * WID, outer = k === 0 || k === NCH - 1, cls = outer ? 'd bond' : 'd m thin';
    const pts = Array.from({ length: SEG + 1 }, (_, n) => at(n / SEG, off));
    make(fib, 'path', cls, k * .8, { d: 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') });
    for (const [t, sgn] of [[0, -1], [1, 1]]) { const p = at(t, off), d = tan(t); make(fib, 'path', cls + ' stub', 0, { d: `M${f(p[0])} ${f(p[1])}L${f(p[0] + d[0] * 11 * sgn)} ${f(p[1] + d[1] * 11 * sgn)}` }); }
  }
  const rf = rng(41);
  for (const side of [-1, 1]) {
    for (let t = .05 + rf() * .06; t < .97; t += .075 + rf() * .085) {
      const a = at(t, side * WID / 2), b = at(t, side * (WID / 2 + 6)), c = at(t, side * (WID / 2 + 8.2));
      make(fib, 'path', 'd graft', 6 + t * 6, { d: `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}` });
      make(fib, 'circle', 'dot', 0, { cx: f(c[0]), cy: f(c[1]), r: 2.7 });
    }
  }
  make(fib, 'path', 'd bar', 16, { d: `M60 166H${60 + 10 * NM}M60 163v6M${60 + 10 * NM} 163v6` });
  make(fib, 'text', 'cap', 0, { x: 60 + 10 * NM + 5, y: 169 }).textContent = '10 nm';

  /* Material: the bulk material at centimetre scale (a porous monolith, e.g. an aerogel or foam)
     with a pull-out showing what it is made of: a network of surface-modified nanofibrils.
     Schematic, fixed random seed. */
  const rand = rng(20261120);
  const rr = (a, b) => a + rand() * (b - a);
  const CX = 68, TOP = 70, BOT = 128, RX = 46, RY = 13;
  make(mat, 'ellipse', 'd', 0, { cx: CX, cy: TOP, rx: RX, ry: RY });
  make(mat, 'path', 'd', 1, { d: `M${CX - RX} ${TOP}V${BOT}A${RX} ${RY} 0 0 0 ${CX + RX} ${BOT}V${TOP}` });
  const pores = [], edge = x => RY * Math.sqrt(Math.max(0, 1 - ((x - CX) / RX) ** 2));
  for (let k = 0; k < 400 && pores.length < 26; k++) {
    const r = rr(1.4, 4.2), x = rr(CX - RX + r + 3, CX + RX - r - 3), y = rr(TOP, BOT + RY);
    if (y < TOP + edge(x) + r + 3 || y > BOT + edge(x) - r - 3) continue;
    if (pores.some(p => Math.hypot(p[0] - x, p[1] - y) < p[2] + r + 2.5)) continue;
    pores.push([x, y, r]); make(mat, 'circle', 'd m thin', 2 + pores.length * .3, { cx: f(x), cy: f(y), r: f(r) });
  }
  for (const [dx, dy, r] of [[-22, -2, 4], [-4, 4, 3], [14, -3, 4.5], [27, 3, 2.5], [-10, -6, 2.5], [4, -5, 2]]) make(mat, 'ellipse', 'd m thin', 4, { cx: CX + dx, cy: TOP + dy, rx: r, ry: f(r * .32) });

  const IX = 152, IY = 42, IR = 36, MX = 99, MY = 100, MR = 5;      // pull-out circle and its source spot
  const ux = (IX - MX) / Math.hypot(IX - MX, IY - MY), uy = (IY - MY) / Math.hypot(IX - MX, IY - MY);
  make(mat, 'path', 'd bar', 9, { d: `M${f(MX - uy * MR)} ${f(MY + ux * MR)}L${f(IX - uy * IR)} ${f(IY + ux * IR)}M${f(MX + uy * MR)} ${f(MY - ux * MR)}L${f(IX + uy * IR)} ${f(IY - ux * IR)}` });
  const bg = make(mat, 'circle', 'd', 9, { cx: IX, cy: IY, r: IR }); bg.style.fill = 'var(--paper)'; bg.style.stroke = 'none';
  const clip = document.createElementNS(NS, 'clipPath'); clip.id = 'scale-field'; const cc = document.createElementNS(NS, 'circle'); cc.setAttribute('cx', IX); cc.setAttribute('cy', IY); cc.setAttribute('r', IR); clip.appendChild(cc); mat.appendChild(clip);
  const g = document.createElementNS(NS, 'g'); g.setAttribute('clip-path', 'url(#scale-field)'); mat.appendChild(g);
  for (let k = 0; k < 9; k++) {
    const a0 = rr(0, 6.283), a1 = a0 + Math.PI + rr(-1.05, 1.05), RO = IR + 8;
    const p0 = [IX + RO * Math.cos(a0), IY + RO * Math.sin(a0)], p1 = [IX + RO * Math.cos(a1), IY + RO * Math.sin(a1)];
    const nx = -(p1[1] - p0[1]) / (2 * RO), ny = (p1[0] - p0[0]) / (2 * RO), b1 = rr(-13, 13), b2 = rr(-13, 13);
    const c1 = [p0[0] + (p1[0] - p0[0]) * .33 + nx * b1, p0[1] + (p1[1] - p0[1]) * .33 + ny * b1], c2 = [p0[0] + (p1[0] - p0[0]) * .66 + nx * b2, p0[1] + (p1[1] - p0[1]) * .66 + ny * b2];
    const d = `M${f(p0[0])} ${f(p0[1])}C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p1[0])} ${f(p1[1])}`;
    for (const [cls, w] of [['d under', 5.4], ['d shell', 3.8], ['d', 1.5]]) make(g, 'path', cls, 10 + k, { d }).style.strokeWidth = w;
  }
  make(mat, 'circle', 'd m', 11, { cx: IX, cy: IY, r: IR });
  make(mat, 'circle', 'd m', 9, { cx: MX, cy: MY, r: MR }).style.fill = 'var(--paper)';
  make(mat, 'path', 'd bar', 16, { d: `M${IX - 25} 88H${IX + 25}M${IX - 25} 85v6M${IX + 25} 85v6` });      // 3 nm core = 1.5 units, so 100 nm = 50 units
  make(mat, 'text', 'cap', 0, { x: IX, y: 101, 'text-anchor': 'middle' }).textContent = '100 nm';
  make(mat, 'path', 'd bar', 16, { d: `M${CX - RX} 166H${CX}M${CX - RX} 163v6M${CX} 163v6` });
  make(mat, 'text', 'cap', 0, { x: CX + 5, y: 169 }).textContent = '1 cm';
})();
