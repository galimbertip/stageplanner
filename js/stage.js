/* GPverse StagePlanner — palco: definizione, scenografia, pianta dall'alto, vista dal pubblico, movimenti per battuta.
 * Coordinate in metri: x da sinistra a destra visto dal pubblico (0 = centro), y verso il fondo (0 = linea del boccascena / sipario),
 * z in altezza. Rotazione r in gradi, oraria vista dall'alto; r = 0 = rivolto al pubblico. */
'use strict';

const Stage = (() => {
  const presets = [
    { n: 'Sala parrocchiale', s: { type: 'italiana', w: 8, d: 5, p: 6, a: 1, h: 4, q: 2 } },
    { n: 'Teatro medio', s: { type: 'italiana', w: 12, d: 8, p: 9, a: 1.5, h: 6, q: 3 } },
    { n: 'Teatro grande', s: { type: 'italiana', w: 18, d: 12, p: 12, a: 2, h: 8, q: 4 } },
    { n: 'Palco in piazza', s: { type: 'libero', w: 8, d: 6, p: 8, a: 0, h: 4, q: 0 } },
    { n: 'Tre lati', s: { type: 'tre-lati', w: 7, d: 5, p: 7, a: 0, h: 4, q: 0 } },
    { n: 'Arena / pianta centrale', s: { type: 'arena', w: 6, d: 6, p: 6, a: 0, h: 4, q: 0 } }
  ];
  const TYPES = [['italiana', 'All\'italiana'], ['tre-lati', 'Tre lati'], ['arena', 'Arena'], ['libero', 'Libero / piazza']];
  const typeName = t => (TYPES.find(x => x[0] === t) || TYPES[0])[1];
  const defaults = () => ({ type: 'italiana', w: 10, d: 7, p: 8, a: 1.2, h: 5, q: 3, floor: '#2b2118', side: 'attore', seatX: 0, seatRow: 1 });

  /* libreria: [chiave, icona, nome, {w,d,h,z,c,sh}] — 'W' e 'H' = larghezza e altezza del palco */
  const LIB = [
    ['Scenografia', [
      ['fondale', '🎞', 'Fondale', { w: 'W', d: 0.08, h: 'H', c: '#25324a' }],
      ['quinta', '▮', 'Quinta', { w: 1.2, d: 0.08, h: 'H', c: '#1b2333' }],
      ['parete', '🧱', 'Parete', { w: 3, d: 0.1, h: 2.6, c: '#6c6f7d' }],
      ['porta', '🚪', 'Porta', { w: 0.9, d: 0.1, h: 2.1, c: '#7a5534', sh: 'door' }],
      ['finestra', '🪟', 'Finestra', { w: 1.2, d: 0.1, h: 1.2, z: 1, c: '#7fb6d6' }],
      ['pedana', '⬛', 'Pedana', { w: 2, d: 1, h: 0.4, c: '#5b4636' }],
      ['scala', '🪜', 'Scala', { w: 1, d: 1.5, h: 1, c: '#6b5a48', sh: 'stairs' }],
      ['colonna', '🏛', 'Colonna', { w: 0.4, d: 0.4, h: 3, c: '#c9c3b5', sh: 'round' }],
      ['albero', '🌳', 'Albero', { w: 1.4, d: 1.4, h: 3.2, c: '#2f7a3c', sh: 'round' }]
    ]],
    ['Arredi', [
      ['tavolo', '🍽', 'Tavolo', { w: 1.4, d: 0.8, h: 0.75, c: '#8a5a3b' }],
      ['tavolino', '⚪', 'Tavolino', { w: 0.7, d: 0.7, h: 0.5, c: '#8a5a3b', sh: 'round' }],
      ['sedia', '🪑', 'Sedia', { w: 0.45, d: 0.45, h: 0.9, c: '#a0703f' }],
      ['poltrona', '💺', 'Poltrona', { w: 0.9, d: 0.85, h: 0.9, c: '#7b2f3a' }],
      ['divano', '🛋', 'Divano', { w: 2, d: 0.9, h: 0.85, c: '#4a5d8a' }],
      ['letto', '🛏', 'Letto', { w: 1.6, d: 2, h: 0.6, c: '#c9b9a0' }],
      ['armadio', '🚪', 'Armadio', { w: 1.2, d: 0.6, h: 2, c: '#5e4029' }],
      ['scrivania', '🗄', 'Scrivania', { w: 1.3, d: 0.7, h: 0.75, c: '#6d4b31' }],
      ['panca', '▬', 'Panca', { w: 1.6, d: 0.4, h: 0.45, c: '#8a6a45' }]
    ]],
    ['Oggetti', [
      ['oggetto', '📦', 'Oggetto', { w: 0.35, d: 0.35, h: 0.35, c: '#c0a060' }],
      ['baule', '🧳', 'Baule', { w: 0.9, d: 0.5, h: 0.5, c: '#6b4a2b' }],
      ['lampada', '💡', 'Lampada', { w: 0.4, d: 0.4, h: 1.6, c: '#e8d27a', sh: 'round' }],
      ['tappeto', '🟫', 'Tappeto', { w: 2, d: 1.4, h: 0.02, c: '#7d3b3b' }],
      ['pianta', '🪴', 'Pianta', { w: 0.6, d: 0.6, h: 1.2, c: '#3e8e4f', sh: 'round' }]
    ]],
    ['Luci e segni', [
      ['luce', '🔆', 'Luce (area)', { w: 2.5, d: 2.5, h: 0, c: '#ffe27a', sh: 'light' }],
      ['testo', '🔤', 'Scritta', { w: 1, d: 0.3, h: 0, c: '#d5f4ff', sh: 'text' }],
      ['segno', '✚', 'Segno a terra', { w: 0.3, d: 0.3, h: 0, c: '#ff2bd6', sh: 'mark' }]
    ]]
  ];
  const libItem = k => { for (const [, items] of LIB) for (const it of items) if (it[0] === k) return it; return null; };

  /* ───── modello elementi e movimenti ───── */
  function makeEl(p, k, extra = {}) {
    if (k === 'persona') {
      const c = extra.ch ? getChar(p, extra.ch) : null;
      return { id: uid(), k, sh: 'person', lb: extra.ch || extra.lb || 'Comparsa', ch: extra.ch || '', w: 0.5, d: 0.35, h: c ? c.h || 1.7 : 1.7, z: 0, c: c ? c.c : '#b9c6d8' };
    }
    const it = libItem(k) || libItem('oggetto'); const d = it[3]; const st = p.stage;
    const v = x => x === 'W' ? (st.type === 'italiana' ? st.p : st.w) : x === 'H' ? st.h : x;
    return { id: uid(), k, sh: d.sh || 'box', lb: it[2], w: extra.w || v(d.w), d: extra.d || v(d.d), h: v(d.h), z: d.z || 0, c: d.c };
  }
  const keyOf = (p, idx) => idx < 0 || !p.lines[idx] ? '_base' : p.lines[idx].id;
  function setPos(p, idx, id, part) {
    const k = keyOf(p, idx); p.blk[k] = p.blk[k] || {}; p.blk[k][id] = Object.assign(p.blk[k][id] || {}, part);
  }
  function positionsAt(p, idx) {
    const out = {}; const base = p.blk._base || {};
    p.els.forEach(e => { out[e.id] = Object.assign({ x: 0, y: p.stage.d / 2, r: 0, v: true }, base[e.id] || {}); });
    const n = Math.min(idx, p.lines.length - 1);
    for (let i = 0; i <= n; i++) { const k = p.blk[p.lines[i].id]; if (k) for (const id in k) if (out[id]) Object.assign(out[id], k[id]); }
    return out;
  }
  function prevPositions(p, idx) {
    if (idx < 0) return {}; const k = p.blk[keyOf(p, idx)]; if (!k) return {};
    const before = positionsAt(p, idx - 1); const now = positionsAt(p, idx); const out = {};
    for (const id in k) { const a = before[id], b = now[id]; if (a && b && a.v && b.v && (Math.abs(a.x - b.x) > 0.05 || Math.abs(a.y - b.y) > 0.05)) out[id] = a; }
    return out;
  }

  /* ───── geometria palco ───── */
  function geo(st) {
    const W = +st.w, D = +st.d, it = st.type === 'italiana';
    const P = it ? Math.min(+st.p || W, W) : W, A = it ? +st.a || 0 : 0;
    return { W, D, P, A, H: +st.h || 4, it, q: it ? Math.max(0, Math.round(+st.q || 0)) : 0 };
  }
  function zoneName(st, col, row) {
    const rows = ['AVANTI', 'CENTRO', 'FONDO']; const actor = st.side !== 'pubblico';
    const cols = actor ? ['DX', 'C', 'SX'] : ['SX', 'C', 'DX'];
    return (rows[row] + ' ' + cols[col]).replace('CENTRO C', 'CENTRO');
  }
  const sideNote = st => st.side === 'pubblico' ? 'Destra e sinistra sono quelle del pubblico.' : 'Destra e sinistra sono quelle dell\'attore (rivolto al pubblico), come si usa in teatro.';

  /* colori */
  const PAL = {
    dark: { bg: '#02040a', wall: '#0b1220', wallS: '#3a4c66', grid: 'rgba(255,255,255,.07)', zone: 'rgba(141,123,255,.35)', txt: '#6f87a6', lbl: '#d5f4ff', halo: '#02040a', arrow: '#3ae8ff', sel: '#3ae8ff' },
    print: { bg: '#ffffff', wall: '#d8d8d8', wallS: '#555', grid: 'rgba(0,0,0,.08)', zone: 'rgba(90,75,209,.35)', txt: '#555', lbl: '#111', halo: '#ffffff', arrow: '#0a7d99', sel: '#0a7d99' }
  };
  const elColor = (p, e) => e.ch ? charColor(p, e.ch) : e.c;
  function shade(hex, f) { // f<1 scurisce, f>1 schiarisce
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex;
    const n = parseInt(m[1], 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = f > 1 ? f - 1 : 0; const k = f > 1 ? 1 : f;
    r = Math.round(clamp(r * k + (255 - r) * t, 0, 255)); g = Math.round(clamp(g * k + (255 - g) * t, 0, 255)); b = Math.round(clamp(b * k + (255 - b) * t, 0, 255));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  const f2 = n => Math.round(n * 1000) / 1000;
  const initials = s => String(s || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  /* ───── PIANTA (vista dall'alto) ───── */
  function topBox(st, opts) {
    const g = geo(st); const m = opts.mini ? 0.4 : 1.3; const side = st.type === 'tre-lati' || st.type === 'arena' ? (opts.mini ? 0.4 : 1.4) : 0;
    const x0 = -g.W / 2 - m - side, x1 = g.W / 2 + m + side;
    const y0 = -(g.D + m + (st.type === 'arena' && !opts.mini ? 1 : 0)), y1 = g.A + m + (opts.mini ? 0 : 0.6);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function topSVG(p, pos, opts = {}) {
    const st = p.stage; const g = geo(st); const C = opts.print ? PAL.print : PAL.dark;
    const vb = opts.vb || topBox(st, opts); const fs = opts.mini ? 0 : 0.24;
    const gid = 'g' + Math.random().toString(36).slice(2, 7);
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f2(vb.x)} ${f2(vb.y)} ${f2(vb.w)} ${f2(vb.h)}" preserveAspectRatio="xMidYMid meet" font-family="system-ui,Segoe UI,Roboto,sans-serif">
      <defs><radialGradient id="${gid}l"><stop offset="0" stop-color="#ffe27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>
      <marker id="${gid}a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${C.arrow}"/></marker></defs>
      <rect x="${f2(vb.x - 50)}" y="${f2(vb.y - 50)}" width="${f2(vb.w + 100)}" height="${f2(vb.h + 100)}" fill="${C.bg}"/>`;
    const floor = opts.print ? '#efe6da' : (st.floor || '#2b2118');
    // pavimento
    s += `<rect x="${-g.W / 2}" y="${-g.D}" width="${g.W}" height="${g.D}" fill="${floor}" stroke="${C.wallS}" stroke-width=".03"/>`;
    if (g.A > 0) s += `<path d="M${-g.P / 2},0 L${-g.P / 2},${g.A * 0.6} Q0,${g.A * 1.35} ${g.P / 2},${g.A * 0.6} L${g.P / 2},0Z" fill="${floor}" stroke="${C.wallS}" stroke-width=".03"/>`;
    // griglia 1 m
    if (!opts.mini) {
      let gl = '';
      for (let x = Math.ceil(-g.W / 2); x <= g.W / 2; x++) gl += `M${x},${-g.D}V${g.A > 0 && Math.abs(x) <= g.P / 2 ? g.A * 0.6 : 0}`;
      for (let y = Math.ceil(-g.A); y <= g.D; y++) gl += `M${-(y < 0 ? g.P : g.W) / 2},${-y}H${(y < 0 ? g.P : g.W) / 2}`;
      s += `<path d="${gl}" stroke="${C.grid}" stroke-width=".015" fill="none"/>`;
    }
    // zone
    if (opts.zones) {
      const X0 = -g.P / 2, Y0 = 0, cw = g.P / 3, rh = g.D / 3;
      s += `<path d="M${X0 + cw},0V${-g.D}M${X0 + 2 * cw},0V${-g.D}M${X0},${-rh}H${-X0}M${X0},${-2 * rh}H${-X0}" stroke="${C.zone}" stroke-width=".025" stroke-dasharray=".12 .12" fill="none"/>`;
      if (!opts.mini) for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) s += `<text x="${f2(X0 + cw * (c + 0.5))}" y="${f2(-(Y0 + rh * (r + 0.5)))}" font-size="${f2(Math.min(0.2, cw / 9))}" fill="${C.zone}" text-anchor="middle" dominant-baseline="middle" font-weight="700" letter-spacing=".02">${zoneName(st, c, r)}</text>`;
    }
    // boccascena e quinte
    if (g.it) {
      const t = 0.25;
      s += `<rect x="${-g.W / 2 - 0.3}" y="${-t / 2}" width="${(g.W - g.P) / 2 + 0.3}" height="${t}" fill="${C.wall}" stroke="${C.wallS}" stroke-width=".02"/>`;
      s += `<rect x="${g.P / 2}" y="${-t / 2}" width="${(g.W - g.P) / 2 + 0.3}" height="${t}" fill="${C.wall}" stroke="${C.wallS}" stroke-width=".02"/>`;
      s += `<line x1="${-g.P / 2}" y1="0" x2="${g.P / 2}" y2="0" stroke="#a3243b" stroke-width=".05" stroke-dasharray=".25 .1" opacity=".8"/>`;
      for (let i = 0; i < g.q; i++) {
        const y = g.D * (i + 0.7) / (g.q + 0.6); const len = Math.min(1.3, (g.W - g.P) / 2 + 0.6);
        s += `<rect x="${-g.P / 2 - len + 0.35}" y="${f2(-y - 0.04)}" width="${len}" height=".08" fill="${C.wallS}"/><rect x="${g.P / 2 - 0.35}" y="${f2(-y - 0.04)}" width="${len}" height=".08" fill="${C.wallS}"/>`;
      }
    }
    // etichette del palco
    if (opts.labels && !opts.mini) {
      const lab = (x, y, t, a = 'middle', rot = 0) => `<text x="${f2(x)}" y="${f2(y)}" font-size="${fs}" fill="${C.txt}" text-anchor="${a}" letter-spacing=".04" font-weight="700" ${rot ? `transform="rotate(${rot} ${f2(x)} ${f2(y)})"` : ''}>${t}</text>`;
      const below = g.A + 0.75;
      s += lab(0, below, st.type === 'arena' ? '▼ PUBBLICO ▼' : '▼ PUBBLICO ▼');
      if (st.type === 'tre-lati' || st.type === 'arena') { s += lab(-g.W / 2 - 0.9, -g.D / 2, 'PUBBLICO', 'middle', -90) + lab(g.W / 2 + 0.9, -g.D / 2, 'PUBBLICO', 'middle', 90); }
      if (st.type === 'arena') s += lab(0, -g.D - 0.9, '▲ PUBBLICO ▲');
      s += lab(0, -g.D - 0.2, `${g.W} m`, 'middle') + lab(g.W / 2 + 0.12, -g.D / 2, `${g.D} m`, 'start');
      if (g.it) { s += lab(0, -0.22, `boccascena ${g.P} m`); if (g.A > 0) s += lab(0, g.A * 0.5, 'proscenio'); }
      const actor = st.side !== 'pubblico';
      s += lab(-g.W / 2 + 0.1, 0.35 + g.A * 0.2, actor ? 'DX attore' : 'SX', 'start') + lab(g.W / 2 - 0.1, 0.35 + g.A * 0.2, actor ? 'SX attore' : 'DX', 'end');
    }
    // elementi
    const order = e => e.sh === 'light' ? 0 : e.sh === 'mark' || e.sh === 'text' || e.k === 'tappeto' ? 1 : e.sh === 'person' ? 3 : 2;
    const els = p.els.slice().sort((a, b) => order(a) - order(b) || (a.id === opts.sel) - (b.id === opts.sel));
    // frecce di spostamento
    if (opts.prev) for (const id in opts.prev) {
      const a = opts.prev[id], b = pos[id]; if (!b) continue;
      s += `<line x1="${f2(a.x)}" y1="${f2(-a.y)}" x2="${f2(b.x)}" y2="${f2(-b.y)}" stroke="${C.arrow}" stroke-width=".035" stroke-dasharray=".12 .08" marker-end="url(#${gid}a)" opacity=".85"/>
        <circle cx="${f2(a.x)}" cy="${f2(-a.y)}" r=".07" fill="none" stroke="${C.arrow}" stroke-width=".02"/>`;
    }
    for (const e of els) {
      const q = pos[e.id]; if (!q) continue;
      const vis = q.v !== false; if (!vis && !opts.ghosts) continue;
      const o = (q.o != null ? q.o : 1) * (vis ? 1 : 0.22);
      s += elTop(p, e, q, o, opts, C, gid, fs);
    }
    // maniglie selezione
    if (opts.sel && pos[opts.sel]) {
      const e = p.els.find(x => x.id === opts.sel); const q = pos[opts.sel];
      if (e) {
        const hs = opts.hs || 0.12; const isP = e.sh === 'person';
        const w = isP ? 0.6 : Math.max(e.w, 0.2), d = isP ? 0.6 : Math.max(e.d, 0.2);
        const hy = isP ? d / 2 + 0.3 : -(d / 2 + 0.45);
        s += `<g transform="translate(${f2(q.x)},${f2(-q.y)}) rotate(${f2(q.r || 0)})">
          <rect x="${-w / 2 - 0.06}" y="${-d / 2 - 0.06}" width="${w + 0.12}" height="${d + 0.12}" fill="none" stroke="${C.sel}" stroke-width=".025" stroke-dasharray=".08 .06"/>
          <line x1="0" y1="${isP ? d / 2 - 0.06 : -d / 2 - 0.06}" x2="0" y2="${hy}" stroke="${C.sel}" stroke-width=".02"/>
          <circle data-h="rot" data-el="${e.id}" cx="0" cy="${f2(hy)}" r="${f2(hs)}" fill="${C.bg}" stroke="${C.sel}" stroke-width=".03" style="cursor:grab"/>
          ${isP || e.sh === 'text' || e.sh === 'mark' ? '' : `<rect data-h="size" data-el="${e.id}" x="${f2(w / 2 - hs * 0.8)}" y="${f2(d / 2 - hs * 0.8)}" width="${f2(hs * 1.6)}" height="${f2(hs * 1.6)}" fill="${C.sel}" style="cursor:nwse-resize"/>`}
        </g>`;
      }
    }
    return s + '</svg>';
  }
  function elTop(p, e, q, o, opts, C, gid, fs) {
    const col = elColor(p, e); const w = Math.max(0.05, e.w), d = Math.max(0.03, e.d);
    const ghost = q.v === false ? ` stroke-dasharray=".08 .06"` : '';
    const stroke = `stroke="${shade(col, 1.45)}" stroke-width=".022"${ghost}`;
    let shape = '', label = '';
    const hl = opts.highlight && e.ch && opts.highlight.includes(e.ch);
    switch (e.sh) {
      case 'person': {
        shape = `<circle r="${hl ? 0.29 : 0.25}" fill="${col}" ${stroke}/>${hl ? `<circle r=".42" fill="none" stroke="${col}" stroke-width=".03" opacity=".7"/>` : ''}<path d="M-.11,.21L.11,.21L0,.38Z" fill="${shade(col, 1.5)}"/>`;
        label = `<text y=".085" font-size=".22" font-weight="800" text-anchor="middle" fill="#04060b">${esc(initials(e.lb))}</text>`;
        if (!opts.mini) label += `<text y="${-0.36}" font-size="${fs * 0.85}" font-weight="700" text-anchor="middle" fill="${C.lbl}" stroke="${C.halo}" stroke-width=".05" paint-order="stroke">${esc(e.lb)}</text>`;
        break;
      }
      case 'round': shape = `<ellipse rx="${w / 2}" ry="${d / 2}" fill="${col}" fill-opacity=".9" ${stroke}/>`; break;
      case 'light': shape = `<ellipse rx="${w / 2}" ry="${d / 2}" fill="url(#${gid}l)" stroke="#ffe27a" stroke-width=".015" stroke-opacity=".4"${ghost}/>`; break;
      case 'door': shape = `<rect x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" fill="${col}" ${stroke}/><path d="M${-w / 2},${d / 2}L${-w / 2},${d / 2 + w * 0.92}M${w / 2},${d / 2}A${w},${w} 0 0 1 ${-w / 2 + w * 0.08},${d / 2 + w * 0.92}" fill="none" stroke="${shade(col, 1.5)}" stroke-width=".02" stroke-dasharray=".06 .05"/>`; break;
      case 'stairs': { let st = ''; const n = Math.max(2, Math.round(d / 0.3)); for (let i = 1; i < n; i++) st += `M${-w / 2},${f2(-d / 2 + d * i / n)}H${w / 2}`; shape = `<rect x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" fill="${col}" ${stroke}/><path d="${st}" stroke="${shade(col, 0.6)}" stroke-width=".02"/>`; break; }
      case 'text': shape = `<rect x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" fill="transparent"/>`; label = `<text y=".08" font-size=".26" font-weight="700" text-anchor="middle" fill="${col}">${esc(e.lb)}</text>`; break;
      case 'mark': shape = `<path d="M-.15,0H.15M0,-.15V.15" stroke="${col}" stroke-width=".06"/><rect x="-.25" y="-.25" width=".5" height=".5" fill="transparent"/>`; break;
      default: shape = `<rect x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" rx=".03" fill="${col}" fill-opacity="${e.k === 'tappeto' ? 0.7 : 0.9}" ${stroke}/>`;
    }
    if (!label && !opts.mini && opts.labels !== false && e.sh !== 'mark') {
      const big = Math.max(w, d) > 0.7;
      label = `<text y="${big ? 0.08 : -Math.max(d / 2, 0.15) - 0.08}" font-size="${fs * 0.8}" font-weight="600" text-anchor="middle" fill="${C.lbl}" stroke="${C.halo}" stroke-width=".04" paint-order="stroke" opacity=".9">${esc(e.lb)}</text>`;
    }
    return `<g data-el="${e.id}" opacity="${f2(o)}" transform="translate(${f2(q.x)},${f2(-q.y)})" style="cursor:move"><g transform="rotate(${f2(q.r || 0)})">${shape}</g>${label}</g>`;
  }

  /* ───── VISTA DAL PUBBLICO (prospettiva) ───── */
  function eye(st) {
    const g = geo(st); const row = clamp(st.seatRow ?? 1, 0, 2);
    return { x: (st.seatX || 0) * g.W * 0.33, y: -[3.5, 7.5, 13][row] - g.A, z: [0.5, 1.6, 3.4][row] };
  }
  function frontSVG(p, pos, opts = {}) {
    const st = p.stage; const g = geo(st); const E = eye(st); const C = opts.print ? PAL.print : PAL.dark; const F = 10;
    const pr = (x, y, z) => { const dz = Math.max(0.4, y - E.y); return [(x - E.x) / dz * F, -(z - E.z) / dz * F]; };
    const pts = arr => arr.map(a => a.map(f2).join(',')).join(' ');
    const poly = (P3, fill, extra = '') => `<polygon points="${pts(P3.map(v => pr(v[0], v[1], v[2])))}" fill="${fill}" ${extra}/>`;
    const topZ = g.H + 1.2;
    // cornice di visualizzazione
    const ext = [[-g.W / 2, -g.A, 0], [g.W / 2, -g.A, 0], [-g.W / 2, g.D, topZ], [g.W / 2, g.D, topZ], [-g.W / 2, -g.A, g.H + 0.5], [g.W / 2, -g.A, g.H + 0.5], [-g.W / 2, -g.A, -1]].map(v => pr(...v));
    let mnx = Math.min(...ext.map(v => v[0])), mxx = Math.max(...ext.map(v => v[0])), mny = Math.min(...ext.map(v => v[1])), mxy = Math.max(...ext.map(v => v[1]));
    const padX = (mxx - mnx) * 0.04, padY = (mxy - mny) * 0.04; mnx -= padX; mxx += padX; mny -= padY; mxy += padY;
    const floor = opts.print ? '#efe6da' : (st.floor || '#2b2118');
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f2(mnx)} ${f2(mny)} ${f2(mxx - mnx)} ${f2(mxy - mny)}" preserveAspectRatio="xMidYMid meet" font-family="system-ui,Segoe UI,Roboto,sans-serif">
      <rect x="${f2(mnx - 50)}" y="${f2(mny - 50)}" width="${f2(mxx - mnx + 100)}" height="${f2(mxy - mny + 100)}" fill="${opts.print ? '#fff' : '#05070d'}"/>`;
    // fondo (muro) e pavimento
    s += poly([[-g.W / 2, g.D, 0], [g.W / 2, g.D, 0], [g.W / 2, g.D, topZ], [-g.W / 2, g.D, topZ]], opts.print ? '#e4e4e4' : '#0d1424');
    s += poly([[-g.W / 2, 0, 0], [g.W / 2, 0, 0], [g.W / 2, g.D, 0], [-g.W / 2, g.D, 0]], floor);
    if (g.A > 0) s += poly([[-g.P / 2, -g.A, 0], [g.P / 2, -g.A, 0], [g.P / 2, 0, 0], [-g.P / 2, 0, 0]], floor);
    // griglia a terra
    let gl = '';
    for (let y = 0; y <= g.D; y++) { const a = pr(-g.W / 2, y, 0), b = pr(g.W / 2, y, 0); gl += `M${f2(a[0])},${f2(a[1])}L${f2(b[0])},${f2(b[1])}`; }
    for (let x = Math.ceil(-g.W / 2); x <= g.W / 2; x++) { const a = pr(x, 0, 0), b = pr(x, g.D, 0); gl += `M${f2(a[0])},${f2(a[1])}L${f2(b[0])},${f2(b[1])}`; }
    s += `<path d="${gl}" stroke="${C.grid}" stroke-width=".02" fill="none"/>`;
    // luci e segni a terra
    const items = [];
    p.els.forEach(e => {
      const q = pos[e.id]; if (!q || q.v === false) return; const o = q.o != null ? q.o : 1;
      if (e.sh === 'light') {
        const ring = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; ring.push([q.x + Math.cos(a) * e.w / 2, q.y + Math.sin(a) * e.d / 2, 0.01]); }
        s += poly(ring, '#ffe27a', `fill-opacity="${f2(0.16 * o)}"`); return;
      }
      if (e.sh === 'mark' || e.sh === 'text') { const [x, y] = pr(q.x, q.y, 0); const sc = F / Math.max(0.4, q.y - E.y);
        s += e.sh === 'mark' ? `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(0.08 * sc)}" fill="${elColor(p, e)}" opacity="${o}"/>` : `<text x="${f2(x)}" y="${f2(y)}" font-size="${f2(0.22 * sc)}" text-anchor="middle" fill="${elColor(p, e)}" opacity="${o}">${esc(e.lb)}</text>`; return; }
      items.push({ d: q.y + (e.sh === 'person' ? 0 : 0.001), svg: () => e.sh === 'person' ? personFront(p, e, q, pr, opts, C) : prismFront(p, e, q, E, pr, poly) });
    });
    // quinte e boccascena
    if (g.it) {
      for (let i = 0; i < g.q; i++) {
        const y = g.D * (i + 0.7) / (g.q + 0.6); const len = Math.min(1.3, (g.W - g.P) / 2 + 0.6);
        [-1, 1].forEach(sd => { const x0 = sd * (g.P / 2 - 0.35), x1 = sd * (g.P / 2 - 0.35 + len);
          items.push({ d: y, svg: () => poly([[x0, y, 0], [x1, y, 0], [x1, y, g.H], [x0, y, g.H]], opts.print ? '#9aa0aa' : '#141c2c', `stroke="${C.wallS}" stroke-width=".02"`) }); });
      }
      const fr = opts.print ? '#555' : '#0a0f1a', far = g.W / 2 + 6;
      items.push({ d: -0.001, svg: () =>
        poly([[-far, 0, -1.5], [-g.P / 2, 0, -1.5], [-g.P / 2, 0, g.H + 5], [-far, 0, g.H + 5]], fr) +
        poly([[g.P / 2, 0, -1.5], [far, 0, -1.5], [far, 0, g.H + 5], [g.P / 2, 0, g.H + 5]], fr) +
        poly([[-far, 0, g.H], [far, 0, g.H], [far, 0, g.H + 5], [-far, 0, g.H + 5]], fr) +
        poly([[-g.P / 2, 0, g.H - 0.5], [g.P / 2, 0, g.H - 0.5], [g.P / 2, 0, g.H], [-g.P / 2, 0, g.H]], '#7a1d2e', 'opacity=".85"') });
    }
    // bordo anteriore del palco
    const fw = g.A > 0 ? g.P : g.W, fy = -g.A;
    items.push({ d: fy - 0.01, svg: () => poly([[-fw / 2, fy, -1.2], [fw / 2, fy, -1.2], [fw / 2, fy, 0], [-fw / 2, fy, 0]], opts.print ? '#bbb' : '#120d0a', `stroke="${C.wallS}" stroke-width=".02"`) });
    items.sort((a, b) => b.d - a.d).forEach(it => { s += it.svg(); });
    return s + '</svg>';
  }
  function footprint(e, q) {
    const th = -(q.r || 0) * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th); const w = Math.max(0.04, e.w), d = Math.max(0.03, e.d);
    let loc;
    if (e.sh === 'round') { loc = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; loc.push([Math.cos(a) * w / 2, Math.sin(a) * d / 2]); } }
    else loc = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
    return loc.map(([lx, ly]) => [q.x + lx * c - ly * sn, q.y + lx * sn + ly * c]);
  }
  function prismFront(p, e, q, E, pr, poly) {
    const col = elColor(p, e); const fp = footprint(e, q); const z0 = e.z || 0, z1 = z0 + Math.max(0.02, e.h || 0.02);
    let area = 0; fp.forEach((a, i) => { const b = fp[(i + 1) % fp.length]; area += a[0] * b[1] - b[0] * a[1]; }); const ccw = area > 0;
    const o = q.o != null ? q.o : 1; const op = `opacity="${f2(o)}" stroke="${shade(col, 0.55)}" stroke-width=".015" stroke-linejoin="round"`;
    let s = '';
    if (E.z < z0) s += poly(fp.map(v => [v[0], v[1], z0]), shade(col, 0.45), op);
    fp.forEach((a, i) => {
      const b = fp[(i + 1) % fp.length]; let nx = b[1] - a[1], ny = -(b[0] - a[0]); if (!ccw) { nx = -nx; ny = -ny; }
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (nx * (E.x - mx) + ny * (E.y - my) <= 0) return;
      const len = Math.hypot(nx, ny) || 1; const light = 0.55 + 0.35 * Math.max(0, (-ny / len) * 0.8 + (nx / len) * 0.2);
      s += poly([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], shade(col, light), op);
    });
    if (E.z > z1) s += poly(fp.map(v => [v[0], v[1], z1]), shade(col, 1.18), op);
    if (e.sh === 'door') { const fr = fp; const a = fr[0], b = fr[1]; const k = 0.12;
      s += poly([[a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - 0.01, z0], [b[0] - (b[0] - a[0]) * k, b[1] - (b[1] - a[1]) * k - 0.01, z0], [b[0] - (b[0] - a[0]) * k, b[1] - 0.01, z1 - 0.12], [a[0] + (b[0] - a[0]) * k, a[1] - 0.01, z1 - 0.12]], shade(col, 0.4), `opacity="${f2(o * 0.8)}"`); }
    return s;
  }
  function personFront(p, e, q, pr, opts, C) {
    const col = elColor(p, e); const h = e.h || 1.7; const [x, y0] = pr(q.x, q.y, 0); const y1 = pr(q.x, q.y, h)[1]; const k = (y0 - y1) / h;
    const away = Math.cos((q.r || 0) * Math.PI / 180) < -0.2; const fill = away ? shade(col, 0.55) : col; const o = q.o != null ? q.o : 1;
    const hl = opts.highlight && e.ch && opts.highlight.includes(e.ch);
    const sh = h - 0.27, hip = h * 0.5;
    const body = `M-.21,${-sh}Q0,${-sh - 0.05} .21,${-sh}L.24,${-hip + 0.05}L.17,${-hip}L.16,0L.03,0L0,${-hip + 0.12}L-.03,0L-.16,0L-.17,${-hip}L-.24,${-hip + 0.05}Z`;
    return `<g transform="translate(${f2(x)},${f2(y0)}) scale(${f2(k)})" opacity="${f2(o)}">
      <ellipse cx="0" cy="0" rx=".28" ry=".06" fill="#000" opacity=".35"/>
      <path d="${body}" fill="${fill}" stroke="${shade(col, 0.5)}" stroke-width=".015"/>
      <circle cx="0" cy="${f2(-h + 0.12)}" r=".12" fill="${fill}" stroke="${shade(col, 0.5)}" stroke-width=".015"/>
      ${hl ? `<path d="M0,${f2(-h - 0.22)}l-.07,-.1h.14z" fill="${col}"/>` : ''}
      <text y="${f2(-h - 0.06)}" font-size=".17" font-weight="700" text-anchor="middle" fill="${opts.print ? '#111' : '#d5f4ff'}" stroke="${opts.print ? '#fff' : '#05070d'}" stroke-width=".03" paint-order="stroke">${esc(e.lb)}</text></g>`;
  }

  /* ───── modulo di definizione del palco ───── */
  function formHTML(st) {
    const it = st.type === 'italiana';
    const f = (k, l, step = 0.1, min = 0, max = 60) => `<div class="fld"><label class="f">${l}</label><input type="number" inputmode="decimal" step="${step}" min="${min}" max="${max}" data-sk="${k}" value="${st[k]}"></div>`;
    return `<div class="presets">${presets.map((pr, i) => `<button class="chip" data-preset="${i}">${pr.n}</button>`).join('')}</div>
      <div class="fld"><label class="f">Forma</label><div class="seg" style="flex-wrap:wrap">${TYPES.map(([k, n]) => `<button data-stype="${k}" aria-pressed="${st.type === k}">${n}</button>`).join('')}</div></div>
      <div class="grid3">${f('w', 'Larghezza palco (m)')}${f('d', 'Profondità (m)')}${f('h', it ? 'Altezza boccascena (m)' : 'Altezza scena (m)')}
      ${it ? f('p', 'Larghezza boccascena (m)') + f('a', 'Proscenio, davanti al sipario (m)') + f('q', 'Quinte per lato', 1, 0, 8) : ''}</div>
      <div class="fld" style="margin-top:6px"><label class="f">Destra e sinistra</label><div class="seg"><button data-sside="attore" aria-pressed="${st.side !== 'pubblico'}">dell'attore (uso teatrale)</button><button data-sside="pubblico" aria-pressed="${st.side === 'pubblico'}">del pubblico</button></div></div>
      <div class="row" style="margin-top:8px"><label class="f" style="margin:0">Colore pavimento</label><input type="color" data-sk="floor" value="${st.floor || '#2b2118'}"></div>`;
  }
  function formBind(root, st, cb) {
    if (!root) return;
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-preset],[data-stype],[data-sside]'); if (!b) return;
      if (b.dataset.preset != null) Object.assign(st, presets[+b.dataset.preset].s);
      if (b.dataset.stype) { st.type = b.dataset.stype; if (st.type !== 'italiana') { st.p = st.w; } }
      if (b.dataset.sside) st.side = b.dataset.sside;
      root.innerHTML = formHTML(st); cb();
    });
    root.addEventListener('input', e => {
      const i = e.target.closest('[data-sk]'); if (!i) return; const k = i.dataset.sk;
      if (k === 'floor') st.floor = i.value; else { const v = num(i.value, NaN); if (!isFinite(v)) return; st[k] = clamp(v, 0, 60); }
      if (st.type === 'italiana') { st.w = Math.max(st.w, 1); st.p = Math.min(st.p || st.w, st.w); }
      st.d = Math.max(st.d, 1); st.h = Math.max(st.h, 1); cb();
    });
  }

  /* ───── editor (scheda Palco) ───── */
  const E = { idx: -1, sel: null, vb: null, undo: [], redo: [], play: null };
  const view = () => LS.get('stageView', window.innerWidth > 860 ? 'both' : 'top');
  const reset = () => { E.idx = -1; E.sel = null; E.vb = null; E.undo = []; E.redo = []; stopPlay(); };
  const goto = i => { E.idx = i; E.vb = null; };
  const snapStep = () => LS.get('snap', true) ? 0.1 : 0.01;
  const snap = v => { const s = snapStep(); return Math.round(v / s) * s; };

  function tabHTML() {
    const p = S.p; const v = view(); const sc = scenes(p); const cur = sceneAt(p, E.idx);
    return `<div class="stagebar">
        <button class="go" data-act="libOpen">＋ Aggiungi</button>
        <button data-act="undo" title="Annulla (Ctrl+Z)" ${E.undo.length ? '' : 'disabled'}>↶</button><button data-act="redo" title="Ripristina" ${E.redo.length ? '' : 'disabled'}>↷</button>
        <div class="seg">${[['top', 'Pianta'], ['front', 'Pubblico'], ['both', 'Entrambe']].map(([k, l]) => `<button data-act="sView" data-k="${k}" aria-pressed="${v === k}">${l}</button>`).join('')}</div>
        <button class="chip" data-act="sZones" aria-pressed="${LS.get('zones', true)}">Zone</button>
        <button class="chip" data-act="sSnap" aria-pressed="${LS.get('snap', true)}">Griglia 10 cm</button>
        <button data-act="sFit" title="Adatta">⤢</button><button data-act="sPng" title="Salva immagine">🖼</button>
      </div>
      <div class="views ${v === 'both' ? 'both' : ''}">
        <div class="vbox" ${v === 'front' ? 'hidden' : ''}><span class="lbl">PIANTA · DALL'ALTO</span><div id="topWrap"></div></div>
        <div class="vbox" ${v === 'top' ? 'hidden' : ''}><span class="lbl">DAL PUBBLICO</span>
          <div class="tools"><div class="seg">${[[-1, 'Sx'], [0, 'Centro'], [1, 'Dx']].map(([k, l]) => `<button data-act="seatX" data-k="${k}" aria-pressed="${(p.stage.seatX || 0) === k}">${l}</button>`).join('')}</div>
          <div class="seg">${[[0, 'Vicino'], [1, 'Medio'], [2, 'Lontano']].map(([k, l]) => `<button data-act="seatRow" data-k="${k}" aria-pressed="${(p.stage.seatRow ?? 1) === k}">${l}</button>`).join('')}</div></div>
          <div id="frontWrap"></div></div>
      </div>
      <div class="card timeline">
        <div class="row">
          <select data-chg="sScene" style="flex:1 1 160px;width:auto" aria-label="Scena">${sc.map(s => `<option value="${s.start}" ${s.id === cur.id ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select>
          <button data-act="kPrev" title="Movimento precedente">⏮</button><button data-act="lPrev" title="Battuta precedente">◀</button>
          <button data-act="lNext" title="Battuta successiva">▶</button><button data-act="kNext" title="Movimento successivo">⏭</button>
          <button data-act="sPlay" id="playBtn">${E.play ? '■ Stop' : '▷ Anima'}</button>
          <button data-act="addMoment" title="Aggiungi un momento senza battuta (es. «Entra Mario»)">＋ Momento</button>
        </div>
        <input type="range" id="tl" data-inp="tl" aria-label="Battuta">
        <div class="cur" id="tlCur"></div>
      </div>
      <div class="props" id="props"></div>
      <p class="small muted">Trascina per spostare, la maniglia tonda ruota, quella quadrata ridimensiona. Due dita o rotellina per lo zoom, trascina il vuoto per muovere la vista. <b>Posizioni e visibilità valgono dalla battuta scelta in poi</b>: scegli la battuta in basso e sposta gli attori per segnare i movimenti.</p>`;
  }
  function fitHeights() {
    const p = S.p; if (!p) return; const vb = topBox(p.stage, {}); const max = Math.max(280, window.innerHeight * 0.62);
    [['#topWrap', vb.h / vb.w]].forEach(([sel, ar]) => { const w = $(sel); if (w && !w.closest('[hidden]')) w.style.height = Math.round(clamp(w.clientWidth * ar, 240, max)) + 'px'; });
  }
  function mount() {
    const wrap = $('#topWrap'); if (wrap) bindPointer(wrap); fitHeights();
    if (!mount._r) { mount._r = true; window.addEventListener('resize', () => { if (S.view === 'project' && S.tab === 'palco') { fitHeights(); draw(); } }); }
    draw(); drawTimeline(); drawProps();
    if (!mount._k) { mount._k = true; document.addEventListener('keydown', onKey); }
  }
  function onKey(e) {
    if (S.view !== 'project' || S.tab !== 'palco' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || $('.sheet-bg')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? ACT.redo() : ACT.undo(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { if (E.sel) { e.preventDefault(); ACT.elDel(); } return; }
    if (e.key === 'ArrowRight' && !E.sel) { ACT.lNext(); return; } if (e.key === 'ArrowLeft' && !E.sel) { ACT.lPrev(); return; }
    if (E.sel && /^Arrow/.test(e.key)) {
      e.preventDefault(); const q = positionsAt(S.p, E.idx)[E.sel]; const st = e.shiftKey ? 0.5 : 0.1;
      pushUndo(); setPos(S.p, E.idx, E.sel, { x: f2(q.x + (e.key === 'ArrowRight' ? st : e.key === 'ArrowLeft' ? -st : 0)), y: f2(q.y + (e.key === 'ArrowUp' ? st : e.key === 'ArrowDown' ? -st : 0)) });
      touch(); draw(); drawProps();
    }
  }
  let raf = 0, livePos = null;
  function draw() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const p = S.p; if (!p) return; const pos = livePos || positionsAt(p, E.idx);
      const tw = $('#topWrap'), fw = $('#frontWrap');
      if (tw && !tw.closest('[hidden]')) {
        const vb = E.vb || topBox(p.stage, {}); const mpp = vb.w / Math.max(200, tw.clientWidth);
        tw.innerHTML = topSVG(p, pos, { ghosts: !livePos, zones: LS.get('zones', true), labels: true, sel: livePos ? null : E.sel, vb: E.vb, hs: Math.max(0.08, 11 * mpp), prev: livePos ? null : prevPositions(p, E.idx), highlight: myNames(p) });
      }
      if (fw && !fw.closest('[hidden]')) {
        fw.innerHTML = frontSVG(p, pos, { highlight: myNames(p) });
        const vb = $('svg', fw).viewBox.baseVal; const h = Math.round(clamp(fw.clientWidth * vb.height / vb.width, 220, Math.max(280, window.innerHeight * 0.62)));
        if (Math.abs(fw.offsetHeight - h) > 4) fw.style.height = h + 'px';
      }
    });
  }
  function lineLabel(p, i) {
    if (i < 0) return '<b>INIZIO</b> · posizioni di partenza';
    const l = p.lines[i]; if (!l) return '';
    const who = l.t === 'dlg' ? `<b style="color:${charColor(p, l.s)}">${esc(l.s)}</b>: ` : l.t === 'head' ? '<b style="color:var(--violet)">INIZIO SCENA</b> · ' : l.t === 'cue' ? '<b style="color:var(--warn)">MOMENTO</b> · ' : '';
    return `${who}${fmtText(l.x.length > 180 ? l.x.slice(0, 180) + '…' : l.x)}`;
  }
  function drawTimeline() {
    const p = S.p; const tl = $('#tl'); if (!tl) return; const sc = sceneAt(p, E.idx);
    tl.min = sc.start; tl.max = Math.max(sc.start, sc.end - 1); tl.value = E.idx;
    const sel = $('[data-chg="sScene"]'); if (sel) sel.value = sc.start;
    const k = p.blk[keyOf(p, E.idx)]; const n = k ? Object.keys(k).length : 0;
    const pos = E.idx < 0 ? 0 : E.idx - Math.max(0, sc.start) + 1, tot = sc.end - Math.max(0, sc.start);
    $('#tlCur').innerHTML = `<span class="badge">${E.idx < 0 ? '0' : pos}/${tot}</span> ${n && E.idx >= 0 ? `<span class="badge" style="color:var(--cyan);border-color:var(--cyan-d)">📍 ${n} ${n === 1 ? 'movimento' : 'movimenti'} qui</span> ` : ''}${lineLabel(p, E.idx)}`;
  }
  function drawProps() {
    const el = $('#props'); if (!el) return; const p = S.p;
    const e = p.els.find(x => x.id === E.sel);
    if (!e) { el.innerHTML = p.els.length ? '' : `<div class="card small">Il palco è vuoto: premi <b>＋ Aggiungi</b> per mettere scenografia, arredi, oggetti, luci e i personaggi.</div>`; return; }
    const q = positionsAt(p, E.idx)[e.id]; const k = p.blk[keyOf(p, E.idx)]; const hasKey = !!(k && k[e.id]);
    const isP = e.sh === 'person';
    const n = (key, l, val, step = 0.05) => `<div><label class="f">${l}</label><input type="number" inputmode="decimal" step="${step}" data-chg="elNum" data-k="${key}" value="${f2(val)}"></div>`;
    el.innerHTML = `<div class="card">
      <div class="row"><b style="font-family:var(--f-display);letter-spacing:.06em;color:${elColor(p, e)}">${esc(e.lb)}</b><span class="badge">${esc(isP ? 'persona' : (libItem(e.k) || [0, 0, e.k])[2])}</span>${q.v === false ? '<span class="badge" style="color:var(--warn)">nascosto qui</span>' : ''}<span class="sp" style="flex:1"></span><button data-act="desel" title="Chiudi">✕</button></div>
      <div class="grid3" style="margin-top:10px">
        <div><label class="f">Nome</label><input data-chg="elLb" value="${esc(e.lb)}" ${e.ch ? 'disabled title="Il nome segue il personaggio"' : ''}></div>
        ${isP ? `<div><label class="f">Personaggio</label><select data-chg="elCh"><option value="">— comparsa —</option>${p.chars.map(c => `<option ${c.n === e.ch ? 'selected' : ''}>${esc(c.n)}</option>`).join('')}</select></div>` : `<div><label class="f">Colore</label><input type="color" data-chg="elC" value="${e.c}"></div>`}
        ${n('x', 'X (m, dal centro)', q.x)}${n('y', 'Y (m, dal sipario)', q.y)}
        ${isP ? n('h', 'Altezza (m)', e.h) : n('w', 'Larghezza (m)', e.w) + n('d', 'Profondità (m)', e.d) + n('h', 'Altezza (m)', e.h) + n('z', 'Da terra (m)', e.z || 0)}
      </div>
      <div class="row" style="margin-top:10px"><label class="f" style="margin:0">Rotazione</label><input type="range" min="-180" max="180" step="5" value="${Math.round(q.r || 0)}" data-inp="elR" style="flex:1"><span class="mono small" id="rVal">${Math.round(q.r || 0)}°</span></div>
      <div class="acts">
        <button data-act="elRot" data-d="-45">⟲ 45°</button><button data-act="elRot" data-d="45">⟳ 45°</button>
        <button data-act="elVis">${q.v === false ? '👁 Mostra da qui' : '🙈 Nascondi da qui'}</button>
        ${hasKey && E.idx >= 0 ? `<button data-act="elUnkey">✖ Togli movimento qui</button>` : ''}
        <button data-act="elDup">⧉ Duplica</button><button class="danger" data-act="elDel">🗑 Elimina</button>
      </div>
      <p class="small muted" style="margin-bottom:0">Posizione, rotazione e visibilità valgono da «${E.idx < 0 ? 'Inizio' : 'questa battuta'}» in poi. Nome, misure e colore valgono per tutto lo spettacolo.</p></div>`;
  }
  function pushUndo() { E.undo.push(JSON.stringify({ els: S.p.els, blk: S.p.blk })); if (E.undo.length > 60) E.undo.shift(); E.redo = []; syncUndo(); }
  function syncUndo() { const u = $('[data-act="undo"]'), r = $('[data-act="redo"]'); if (u) u.disabled = !E.undo.length; if (r) r.disabled = !E.redo.length; }

  /* puntatore: trascina, ruota, ridimensiona, pan, zoom */
  function bindPointer(wrap) {
    const ptrs = new Map(); let mode = null, st = null;
    const svgPt = (cx, cy, inv) => { const svg = $('svg', wrap); const m = inv || svg.getScreenCTM().inverse(); const pt = new DOMPoint(cx, cy).matrixTransform(m); return { x: pt.x, y: pt.y, m }; };
    const curVb = () => E.vb || topBox(S.p.stage, {});
    wrap.addEventListener('pointerdown', e => {
      if (E.play) return; wrap.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { // pinch
        const [a, b] = [...ptrs.values()]; const m = svgPt((a.x + b.x) / 2, (a.y + b.y) / 2);
        mode = 'pinch'; st = { d: Math.hypot(a.x - b.x, a.y - b.y), vb: Object.assign({}, curVb()), mid: m, inv: m.m }; return;
      }
      const h = e.target.closest('[data-h]'); const g = e.target.closest('[data-el]'); const pt = svgPt(e.clientX, e.clientY);
      if (h) { mode = h.dataset.h; st = { id: h.dataset.el, moved: false }; return; }
      if (g) {
        const id = g.dataset.el; const q = positionsAt(S.p, E.idx)[id];
        if (E.sel !== id) { E.sel = id; drawProps(); draw(); }
        mode = 'drag'; st = { id, off: { x: pt.x - q.x, y: -pt.y - q.y }, moved: false, sx: e.clientX, sy: e.clientY, ghost: q.v === false }; return;
      }
      mode = 'pan'; st = { p0: pt, vb: Object.assign({}, curVb()), inv: pt.m, sx: e.clientX, sy: e.clientY, moved: false };
    });
    wrap.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (!mode) return;
      if (mode === 'pinch' && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]; const k = clamp(st.d / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), 0.05, 20);
        const w = clamp(st.vb.w * k, 2, 80), h = st.vb.h * (w / st.vb.w);
        E.vb = { x: st.mid.x - (st.mid.x - st.vb.x) * (w / st.vb.w), y: st.mid.y - (st.mid.y - st.vb.y) * (w / st.vb.w), w, h }; draw(); return;
      }
      if (mode === 'pan') {
        if (Math.hypot(e.clientX - st.sx, e.clientY - st.sy) < 4 && !st.moved) return; st.moved = true;
        const c = svgPt(e.clientX, e.clientY, st.inv); E.vb = { x: st.vb.x - (c.x - st.p0.x), y: st.vb.y - (c.y - st.p0.y), w: st.vb.w, h: st.vb.h }; draw(); return;
      }
      const pt = svgPt(e.clientX, e.clientY);
      if (mode === 'drag') {
        if (!st.moved && Math.hypot(e.clientX - st.sx, e.clientY - st.sy) < 4) return;
        if (!st.moved) { pushUndo(); st.moved = true; }
        const part = { x: f2(snap(pt.x - st.off.x)), y: f2(snap(-pt.y - st.off.y)) }; if (st.ghost) part.v = true;
        setPos(S.p, E.idx, st.id, part); draw(); return;
      }
      const q = positionsAt(S.p, E.idx)[st.id]; const el = S.p.els.find(x => x.id === st.id); if (!q || !el) return;
      const vx = pt.x - q.x, vy = pt.y - (-q.y);
      if (!st.moved) { pushUndo(); st.moved = true; }
      if (mode === 'rot') {
        let a = el.sh === 'person' ? Math.atan2(-vx, vy) : Math.atan2(vx, -vy); a = a * 180 / Math.PI;
        a = e.shiftKey ? Math.round(a) : Math.round(a / 15) * 15; if (a > 180) a -= 360; if (a <= -180) a += 360;
        setPos(S.p, E.idx, st.id, { r: a }); draw(); return;
      }
      if (mode === 'size') {
        const r = (q.r || 0) * Math.PI / 180; const lx = vx * Math.cos(r) + vy * Math.sin(r), ly = -vx * Math.sin(r) + vy * Math.cos(r);
        el.w = f2(Math.max(0.1, Math.round(Math.abs(lx) * 2 / 0.05) * 0.05)); el.d = f2(Math.max(0.05, Math.round(Math.abs(ly) * 2 / 0.05) * 0.05));
        if (el.sh === 'light') el.w = el.d = Math.max(el.w, el.d); draw();
      }
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
      if (mode === 'pinch') { if (ptrs.size < 2) mode = null; return; }
      if (mode === 'pan' && !st.moved && E.sel) { E.sel = null; drawProps(); draw(); }
      if (st && st.moved && mode !== 'pan') { touch(); drawProps(); drawTimeline(); syncUndo(); }
      if (!ptrs.size) { mode = null; st = null; }
    };
    wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
    wrap.addEventListener('wheel', e => {
      e.preventDefault(); const vb = Object.assign({}, curVb()); const pt = svgPt(e.clientX, e.clientY);
      const k = Math.exp(e.deltaY * 0.0015); const w = clamp(vb.w * k, 2, 80); const f = w / vb.w;
      E.vb = { x: pt.x - (pt.x - vb.x) * f, y: pt.y - (pt.y - vb.y) * f, w, h: vb.h * f }; draw();
    }, { passive: false });
  }

  /* animazione dei movimenti nella scena */
  function stopPlay() { if (E.play) { cancelAnimationFrame(E.play.raf); E.play = null; livePos = null; const b = $('#playBtn'); if (b) b.textContent = '▷ Anima'; draw(); } }
  function play() {
    const p = S.p; const sc = sceneAt(p, E.idx); const steps = [];
    for (let i = E.idx + 1; i < sc.end; i++) if (p.blk[p.lines[i].id]) steps.push(i);
    if (!steps.length) { toast('Nessun movimento dopo questa battuta in questa scena'); return; }
    E.sel = null; drawProps(); E.play = { raf: 0 }; $('#playBtn').textContent = '■ Stop';
    let from = positionsAt(p, E.idx), si = 0, t0 = performance.now(); const dur = 1100, hold = 450;
    let to = positionsAt(p, steps[0]); E.idx = steps[0]; drawTimeline();
    const tick = now => {
      if (!E.play) return; let t = (now - t0) / dur;
      if (t >= 1 + hold / dur) {
        si++; if (si >= steps.length) { stopPlay(); drawTimeline(); return; }
        from = to; to = positionsAt(p, steps[si]); E.idx = steps[si]; drawTimeline(); t0 = now; t = 0;
      }
      const k = clamp(t, 0, 1); const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; const out = {};
      for (const id in to) {
        const a = from[id] || to[id], b = to[id]; const va = a.v !== false, vb2 = b.v !== false;
        let dr = ((b.r || 0) - (a.r || 0)); if (dr > 180) dr -= 360; if (dr < -180) dr += 360;
        out[id] = { x: va && vb2 ? a.x + (b.x - a.x) * ease : b.x, y: va && vb2 ? a.y + (b.y - a.y) * ease : b.y, r: (a.r || 0) + dr * ease,
          v: va || vb2, o: va && vb2 ? 1 : va ? 1 - ease : ease };
      }
      livePos = out; draw(); E.play.raf = requestAnimationFrame(tick);
    };
    E.play.raf = requestAnimationFrame(tick);
  }

  async function exportPng() {
    const p = S.p; const pos = positionsAt(p, E.idx); const v = view(); const list = [];
    if (v !== 'front') list.push(['pianta', topSVG(p, pos, { zones: LS.get('zones', true), labels: true, prev: prevPositions(p, E.idx) })]);
    if (v !== 'top') list.push(['pubblico', frontSVG(p, pos, {})]);
    for (const [n, svg] of list) {
      const img = new Image(); const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      await new Promise(r => { img.onload = r; img.onerror = r; img.src = url; });
      const W = 1800, H = Math.round(W * (img.height / img.width || 0.66)); const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H); URL.revokeObjectURL(url);
      g.font = '700 22px system-ui, sans-serif'; g.textAlign = 'right'; g.fillStyle = 'rgba(58,232,255,.85)'; g.fillText(`GPverse StagePlanner ${APP.version}`, W - 18, H - 18);
      await new Promise(r => c.toBlob(b => { download(`${slug(p.title)}_${n}_${E.idx < 0 ? 'inizio' : 'riga' + (E.idx + 1)}.png`, b); r(); }, 'image/png'));
    }
  }

  function addElement(el) {
    const p = S.p; pushUndo(); p.els.push(el);
    const vb = E.vb || topBox(p.stage, {}); const g = geo(p.stage);
    let x = clamp(vb.x + vb.w / 2, -g.W / 2, g.W / 2), y = clamp(-(vb.y + vb.h / 2), 0, g.D);
    if (el.k === 'fondale') { x = 0; y = g.D - 0.1; } if (el.k === 'quinta') { x = -g.P / 2; }
    const n = p.els.filter(e => Math.abs((positionsAt(p, E.idx)[e.id] || {}).x - x) < 0.2).length; x += (n % 4) * 0.3;
    const part = { x: f2(snap(x)), y: f2(snap(y)), r: 0, v: true };
    if (E.idx >= 0) { setPos(p, -1, el.id, Object.assign({}, part, { v: false })); setPos(p, E.idx, el.id, { v: true }); } else setPos(p, -1, el.id, part);
    E.sel = el.id; touch(); closeSheet(); draw(); drawProps(); drawTimeline(); syncUndo();
  }

  const ACT = {
    libOpen() {
      const p = S.p; const placed = new Set(p.els.filter(e => e.ch).map(e => e.ch));
      const ppl = p.chars.filter(c => c.n !== 'TUTTI').map(c => `<button data-act="addPerson" data-n="${esc(c.n)}" style="${placed.has(c.n) ? 'opacity:.55' : ''}"><span style="color:${c.c}">●</span>${esc(c.n)}${placed.has(c.n) ? ' ✓' : ''}</button>`).join('');
      sheet('Aggiungi al palco', `<h2 class="sec" style="margin-top:0">PERSONE</h2><div class="lib">${ppl}<button data-act="addPerson" data-n=""><span>👤</span>Comparsa</button></div>
        ${LIB.map(([g, items]) => `<h2 class="sec">${esc(g.toUpperCase())}</h2><div class="lib">${items.map(([k, ic, n]) => `<button data-act="addEl" data-k="${k}"><span>${ic}</span>${esc(n)}</button>`).join('')}</div>`).join('')}
        <p class="small muted">${E.idx < 0 ? 'Gli elementi aggiunti ora sono presenti dall\'inizio.' : 'Gli elementi aggiunti ora compaiono da questa battuta in poi.'}</p>`);
    },
    addEl(el) { addElement(makeEl(S.p, el.dataset.k)); },
    addPerson(el) {
      const p = S.p; const n = el.dataset.n;
      const ex = n && p.els.find(e => e.ch === n);
      if (ex) { closeSheet(); E.sel = ex.id; const q = positionsAt(p, E.idx)[ex.id]; if (q.v === false) { pushUndo(); setPos(p, E.idx, ex.id, { v: true }); touch(); } draw(); drawProps(); toast(n + ' è già sul palco: selezionato'); return; }
      const lb = n || prompt('Nome della comparsa', 'Comparsa'); if (lb === null) return;
      addElement(makeEl(p, 'persona', n ? { ch: n } : { lb }));
    },
    desel() { E.sel = null; draw(); drawProps(); },
    undo() { if (!E.undo.length) return; E.redo.push(JSON.stringify({ els: S.p.els, blk: S.p.blk })); Object.assign(S.p, JSON.parse(E.undo.pop())); if (!S.p.els.find(e => e.id === E.sel)) E.sel = null; touch(); draw(); drawProps(); drawTimeline(); syncUndo(); },
    redo() { if (!E.redo.length) return; E.undo.push(JSON.stringify({ els: S.p.els, blk: S.p.blk })); Object.assign(S.p, JSON.parse(E.redo.pop())); touch(); draw(); drawProps(); drawTimeline(); syncUndo(); },
    sView(el) { LS.set('stageView', el.dataset.k); stopPlay(); renderTab(); },
    sZones(el) { LS.set('zones', !LS.get('zones', true)); el.setAttribute('aria-pressed', LS.get('zones', true)); draw(); },
    sSnap(el) { LS.set('snap', !LS.get('snap', true)); el.setAttribute('aria-pressed', LS.get('snap', true)); },
    sFit() { E.vb = null; draw(); },
    sPng() { exportPng(); },
    seatX(el) { S.p.stage.seatX = +el.dataset.k; touch(); $$('[data-act="seatX"]').forEach(b => b.setAttribute('aria-pressed', b === el)); draw(); },
    seatRow(el) { S.p.stage.seatRow = +el.dataset.k; touch(); $$('[data-act="seatRow"]').forEach(b => b.setAttribute('aria-pressed', b === el)); draw(); },
    lPrev() { stopPlay(); const sc = sceneAt(S.p, E.idx); if (E.idx > sc.start) { E.idx--; } else if (E.idx > -1) { E.idx--; } refresh(); },
    lNext() { stopPlay(); if (E.idx < S.p.lines.length - 1) E.idx++; refresh(); },
    kPrev() { stopPlay(); const p = S.p; for (let i = E.idx - 1; i >= 0; i--) if (p.blk[p.lines[i].id]) { E.idx = i; refresh(); return; } E.idx = -1; refresh(); },
    kNext() { stopPlay(); const p = S.p; for (let i = E.idx + 1; i < p.lines.length; i++) if (p.blk[p.lines[i].id]) { E.idx = i; refresh(); return; } toast('Nessun altro movimento'); },
    sPlay() { E.play ? stopPlay() : play(); },
    addMoment() {
      const t = prompt('Descrivi il momento (es. «Entra Mario», «Cambio luce», «Buio»)'); if (!t) return;
      const p = S.p; p.lines.splice(E.idx + 1, 0, { id: uid(), t: 'cue', s: '', x: t.trim() }); E.idx++; touch(); refresh(); toast('Momento aggiunto anche al copione');
    },
    elRot(el) { const q = positionsAt(S.p, E.idx)[E.sel]; let r = (q.r || 0) + +el.dataset.d; if (r > 180) r -= 360; if (r <= -180) r += 360; pushUndo(); setPos(S.p, E.idx, E.sel, { r }); touch(); draw(); drawProps(); },
    elVis() { const q = positionsAt(S.p, E.idx)[E.sel]; pushUndo(); setPos(S.p, E.idx, E.sel, { v: q.v === false }); touch(); draw(); drawProps(); drawTimeline(); },
    elUnkey() { const k = S.p.blk[keyOf(S.p, E.idx)]; if (!k) return; pushUndo(); delete k[E.sel]; if (!Object.keys(k).length) delete S.p.blk[keyOf(S.p, E.idx)]; touch(); draw(); drawProps(); drawTimeline(); },
    elDup() {
      const p = S.p; const e = p.els.find(x => x.id === E.sel); const q = positionsAt(p, E.idx)[e.id];
      const c = Object.assign({}, e, { id: uid(), ch: '', lb: e.ch ? 'Comparsa' : e.lb }); if (c.sh === 'person' && e.ch) c.c = charColor(p, e.ch);
      pushUndo(); p.els.push(c); setPos(p, -1, c.id, { x: f2(q.x + 0.5), y: q.y, r: q.r || 0, v: E.idx < 0 }); if (E.idx >= 0) setPos(p, E.idx, c.id, { v: true });
      E.sel = c.id; touch(); draw(); drawProps();
    },
    elDel() {
      const p = S.p; const e = p.els.find(x => x.id === E.sel); if (!e || !confirm(`Eliminare «${e.lb}» da tutto lo spettacolo?`)) return;
      pushUndo(); p.els = p.els.filter(x => x !== e); for (const k in p.blk) { delete p.blk[k][e.id]; if (!Object.keys(p.blk[k]).length) delete p.blk[k]; }
      E.sel = null; touch(); draw(); drawProps(); drawTimeline();
    }
  };
  function refresh() { draw(); drawTimeline(); drawProps(); }
  const CHG = {
    sScene(el) { stopPlay(); E.idx = +el.value; refresh(); },
    elLb(el) { const e = S.p.els.find(x => x.id === E.sel); pushUndo(); e.lb = el.value.trim() || e.lb; touch(); draw(); drawProps(); },
    elC(el) { const e = S.p.els.find(x => x.id === E.sel); pushUndo(); e.c = el.value; touch(); draw(); },
    elCh(el) { const p = S.p; const e = p.els.find(x => x.id === E.sel); pushUndo(); e.ch = el.value; e.lb = el.value || 'Comparsa'; const c = getChar(p, el.value); if (c) { e.h = c.h || 1.7; e.c = c.c; } touch(); draw(); drawProps(); },
    elNum(el) {
      const p = S.p; const e = p.els.find(x => x.id === E.sel); const k = el.dataset.k; const v = num(el.value, NaN); if (!isFinite(v)) return; pushUndo();
      if (k === 'x' || k === 'y') setPos(p, E.idx, e.id, { [k]: f2(v) });
      else { e[k] = f2(clamp(v, k === 'z' ? 0 : 0.01, 60)); if (k === 'h' && e.ch) { const c = getChar(p, e.ch); if (c) c.h = e[k]; } }
      touch(); draw(); drawTimeline();
    }
  };
  const INP = {
    tl(el) { stopPlay(); E.idx = +el.value; draw(); drawTimeline(); drawProps(); },
    elR(el) {
      if (!INP._u) { pushUndo(); INP._u = true; setTimeout(() => { INP._u = false; }, 800); }
      setPos(S.p, E.idx, E.sel, { r: +el.value }); $('#rVal').textContent = el.value + '°'; touch(); draw();
    }
  };

  return { presets, defaults, typeName, sideNote, formHTML, formBind, makeEl, setPos, positionsAt, prevPositions, topSVG, frontSVG,
    tabHTML, mount, reset, goto, stopPlay, ACT, CHG, INP, geo, keyOf, get idx() { return E.idx; } };
})();
