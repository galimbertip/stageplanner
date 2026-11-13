/* GPverse StagePlanner — nucleo: dati, archivio locale, import copione, schermate principali.
 * Versione: vedi APP.version e CHANGELOG.md (schema V.maior.minor.patch) */
'use strict';

const APP = { name: 'GPverse StagePlanner', version: 'V2.0.0' };

const CHANGELOG = [
  { v: 'V2.0.0', d: '13/11/2026', t: 'Rinascita GPverse: impara la parte + palco in 2 viste', items: [
    'Nuova grafica GPverse (logo, colori neon, versione cliccabile con le novità).',
    'Ogni nuovo progetto parte dalla definizione del palco: all\'italiana, tre lati, arena, piazza; misure in metri, boccascena, proscenio, quinte. Modelli pronti.',
    'Copione: import da Word (.docx), PDF, testo o incolla; riconosce personaggi, didascalie, scene/atti. Modificabile riga per riga.',
    'Prove: Lettura con copione nascosto a livelli, Botta e risposta con voto e ripasso intelligente, Partner vocale (voci diverse per personaggio, pausa per la tua battuta, ascolto con microfono e controllo parola per parola), Registra le voci, Teleprompter.',
    'Progressi per battuta, percentuale imparata, conto alla rovescia al debutto con battute al giorno.',
    'Palco: pianta dall\'alto e vista dal pubblico (prospettica, da posti diversi della platea), scenografia, arredi, oggetti, luci e persone.',
    'Movimenti legati alle battute: sposti attori e oggetti su una battuta e restano lì fino al movimento successivo; frecce di spostamento e animazione.',
    '«Dove sono» durante le prove: mini pianta con la tua posizione alla battuta corrente.',
    'Tutto resta sul dispositivo, funziona senza internet e si installa come app. Backup e condivisione con la compagnia tramite file.',
    'Stampa / PDF del copione evidenziato e del libro di regia con le piante.'
  ]},
  { v: 'V1.0.0', d: '25/04/2026', t: 'Versione originale (Gemini)', items: [
    'Progetti e scene con planimetria disegnata a mano (rettangoli, cerchi, linee, testo, emoji) e sincronizzazione Firebase.',
    'Esportazione PDF delle planimetrie.'
  ]}
];

/* ───────── utilità ───────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d = 0) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : d; };
const words = s => String(s || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').trim().split(/\s+/).filter(Boolean);
const LS = {
  get(k, d) { try { const v = localStorage.getItem('sp.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sp.' + k, JSON.stringify(v)); } catch {} }
};
const COLORS = ['#3ae8ff', '#ff2bd6', '#ffe600', '#38ff7a', '#ff8a3d', '#8d7bff', '#ff5d8f', '#b6ff3a', '#4da3ff', '#ffb3f0', '#00d1b2', '#ffd36e'];
const LEVEL_COLORS = ['#3a4c66', '#ff3d6e', '#ff8a3d', '#ffc04a', '#8de86a', '#3affb0'];

function toast(msg, ms = 2600) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}
let sheetEl = null;
function sheet(title, body, onOpen) {
  closeSheet();
  sheetEl = document.createElement('div'); sheetEl.className = 'sheet-bg';
  sheetEl.innerHTML = `<div class="sheet" role="dialog" aria-label="${esc(title)}"><h3>${title}<button class="x" data-act="closeSheet" aria-label="Chiudi">✕</button></h3>${body}</div>`;
  sheetEl.addEventListener('click', e => { if (e.target === sheetEl) closeSheet(); });
  document.body.appendChild(sheetEl);
  onOpen && onOpen(sheetEl.firstElementChild);
  return sheetEl.firstElementChild;
}
function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }
function download(name, data, type = 'application/json') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function pickFile(accept) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
    i.onchange = () => res(i.files[0] || null); i.click();
  });
}
function loadScript(src) {
  return new Promise((res, rej) => {
    if ($(`script[src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Impossibile caricare ' + src));
    document.head.appendChild(s);
  });
}
const slug = s => String(s || 'progetto').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').slice(0, 40) || 'progetto';

/* ───────── archivio locale (IndexedDB) ───────── */
const DB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('gpverse-stageplanner', 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('projects', { keyPath: 'id' }); d.createObjectStore('audio'); };
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(store, mode, fn) {
    const d = await this.open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode); const s = t.objectStore(store);
      const out = fn(s); t.oncomplete = () => res(out && 'result' in out ? out.result : out); t.onerror = () => rej(t.error);
    });
  },
  all(store) { return this.tx(store, 'readonly', s => s.getAll()); },
  get(store, k) { return this.tx(store, 'readonly', s => s.get(k)); },
  put(store, v, k) { return this.tx(store, 'readwrite', s => k === undefined ? s.put(v) : s.put(v, k)); },
  del(store, k) { return this.tx(store, 'readwrite', s => s.delete(k)); },
  keys(store) { return this.tx(store, 'readonly', s => s.getAllKeys()); }
};

/* ───────── stato ───────── */
const S = {
  view: 'home', projects: [], p: null, tab: 'copione',
  wiz: null, edit: false, filter: 'all', search: '', jump: null
};
let saveTimer = null;
function touch() { if (!S.p) return; S.p.updated = Date.now(); clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 350); }
async function saveNow() {
  clearTimeout(saveTimer); if (!S.p) return;
  try { await DB.put('projects', JSON.parse(JSON.stringify(S.p))); } catch (e) { toast('Errore di salvataggio: ' + e.message); }
}

/* ───────── modello progetto ───────── */
function newProject(stage, info = {}) {
  return {
    id: uid(), v: 2, title: info.title || 'Nuovo spettacolo', author: info.author || '', company: info.company || '',
    premiere: info.premiere || '', notes: '', created: Date.now(), updated: Date.now(),
    stage: stage || Stage.defaults(), lines: [], chars: [], els: [], blk: {}, prog: {},
    narrator: { voice: '', pitch: 1, rate: 1 }
  };
}
function charColor(p, n) { const c = p.chars.find(c => c.n === n); return c ? c.c : '#6f87a6'; }
function getChar(p, n) { return p.chars.find(c => c.n === n); }
function myNames(p) { return p.chars.filter(c => c.mine).map(c => c.n); }
function isMine(p, l, me) { me = me || myNames(p); return l.t === 'dlg' && (me.includes(l.s) || (l.s === 'TUTTI' && me.length > 0)); }
function ensureChars(p) {
  const have = new Set(p.chars.map(c => c.n));
  p.lines.forEach(l => {
    if (l.t === 'dlg' && l.s && !have.has(l.s)) {
      have.add(l.s); p.chars.push({ n: l.s, c: l.s === 'TUTTI' ? '#b090d8' : COLORS[p.chars.length % COLORS.length], actor: '', mine: false, h: 1.7, voice: '', pitch: 0, rate: 1 });
    }
  });
}
/** Scene derivate dalle righe «head». Restituisce [{id,title,start,end}] dove start è l'indice della riga titolo (o -1 per l'inizio implicito). */
function scenes(p) {
  const out = []; const L = p.lines;
  const firstHead = L.findIndex(l => l.t === 'head');
  if (firstHead !== 0) out.push({ id: '_start', title: firstHead === -1 && !L.length ? 'Scena unica' : 'Inizio', start: -1, end: firstHead === -1 ? L.length : firstHead });
  L.forEach((l, i) => { if (l.t === 'head') { if (out.length) out[out.length - 1].end = i; out.push({ id: l.id, title: l.x, start: i, end: L.length }); } });
  return out;
}
function sceneAt(p, i) { const sc = scenes(p); return sc.find(s => i >= s.start && i < Math.max(s.end, s.start + 1)) || sc[0]; }
function stats(p, names) {
  names = names || myNames(p);
  const mine = p.lines.filter(l => isMine(p, l, names));
  let known = 0, sum = 0;
  mine.forEach(l => { const lv = (p.prog[l.id] || {}).l || 0; if (lv >= 3) known++; sum += lv; });
  const days = p.premiere ? Math.ceil((new Date(p.premiere + 'T20:00') - Date.now()) / 864e5) : null;
  const todo = mine.length - known;
  return { lines: mine.length, words: mine.reduce((a, l) => a + words(l.x).length, 0), known, pct: mine.length ? Math.round(known / mine.length * 100) : 0,
    avg: mine.length ? sum / mine.length : 0, days, perDay: days && days > 0 ? Math.ceil(todo / days) : null, todo };
}
function rateLine(p, id, r) { // r: 0 no, 1 quasi, 2 sì
  const g = p.prog[id] || { l: 0, n: 0, t: 0 };
  g.l = r === 2 ? Math.min(5, g.l + 1) : r === 1 ? Math.max(1, Math.min(g.l, 3)) : Math.max(0, g.l - 2);
  g.n++; g.t = Date.now(); p.prog[id] = g; touch();
}

/* ───────── import copione ───────── */
const HEAD_RE = /^(atto|scena|quadro|prologo|epilogo|intermezzo|finale|parte)\b[\s\wÀ-ÿ'’.,:\-–—IVXLC0-9]*$/i;
function normSpeaker(s) { return s.replace(/\s+/g, ' ').trim().toUpperCase(); }
/** paragrafi: [{text,bold,italic}] → righe */
function parseParagraphs(paras) {
  const lines = []; let pending = null;
  const push = (t, s, x) => lines.push({ id: uid(), t, s: s || '', x: x.trim() });
  for (const para of paras) {
    let raw = (para.text || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();
    if (!raw) { pending = null; continue; }
    if (raw.length < 90 && HEAD_RE.test(raw) && !/[:：]\s*\S{3,}.*\s\S+\s/.test(raw)) { push('head', '', raw); pending = null; continue; }
    let m = raw.match(/^TUTTI\s*[:：.]\s*(.+)$/i);
    if (m) { push('dlg', 'TUTTI', m[1]); pending = null; continue; }
    // NOME (didascalia): testo   |   NOME: testo
    m = raw.match(/^([A-ZÀ-Ý][A-Za-zÀ-ÿ'’.\s]{0,28}?)\s*(\([^)]{0,60}\))?\s*[:：]\s*(.+)$/);
    if (m && !/^(nota|note|n\.?b|attenzione|personaggi|luogo|tempo)$/i.test(m[1].trim())) {
      const sp = normSpeaker(m[1]); const tx = (m[2] ? m[2] + ' ' : '') + m[3];
      push(para.bold ? 'act' : 'dlg', sp, tx); if (para.bold) lines[lines.length - 1].s = ''; pending = null; continue;
    }
    // AMLETO. Testo   (nome tutto maiuscolo seguito da punto)
    m = raw.match(/^([A-ZÀ-Ý][A-ZÀ-Ý'’\s]{1,28})(\s*\([^)]{0,60}\))?\s*[.—–-]\s+(.+)$/);
    if (m && m[1].trim().length > 1) { push('dlg', normSpeaker(m[1]), (m[2] ? m[2].trim() + ' ' : '') + m[3]); pending = null; continue; }
    // NOME da solo su una riga (stile sceneggiatura) → la riga dopo è la battuta
    m = raw.match(/^([A-ZÀ-Ý][A-ZÀ-Ý'’.\s]{1,28})(\s*\([^)]{0,60}\))?$/);
    if (m && raw === raw.toUpperCase() && words(m[1]).length <= 3) { pending = { s: normSpeaker(m[1].replace(/\.$/, '')), pre: m[2] ? m[2].trim() + ' ' : '' }; continue; }
    if (pending) { push('dlg', pending.s, pending.pre + raw); pending.pre = ''; continue; }
    if (/^\(.*\)$/.test(raw) || para.italic) { push('desc', '', raw.replace(/^\((.*)\)$/, '$1')); continue; }
    if (para.bold) { push('act', '', raw); continue; }
    push('desc', '', raw);
  }
  return lines;
}
function htmlToParas(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return $$('p,h1,h2,h3,h4,li', doc).map(p => {
    const nodes = Array.from(p.childNodes).filter(n => n.textContent.trim());
    const all = tag => nodes.length > 0 && nodes.every(n => n.nodeType === 1 && (tag.includes(n.nodeName.toLowerCase()) || n.querySelector && n.querySelector(tag.join(','))));
    const isH = /^H\d$/.test(p.nodeName);
    return { text: p.textContent, bold: !isH && all(['strong', 'b']), italic: all(['em', 'i']), head: isH };
  }).map(x => x.head && !HEAD_RE.test(x.text.trim()) ? { text: 'Scena — ' + x.text } : x);
}
function textToParas(txt) {
  const rows = String(txt).replace(/\r/g, '').split('\n');
  // unisce le righe spezzate: una riga che non inizia con un nome continua la precedente se quest'ultima non finisce con punteggiatura forte
  const out = [];
  rows.forEach(r => {
    const t = r.trim();
    if (!t) { out.push({ text: '' }); return; }
    const prev = out[out.length - 1];
    const startsNew = /^([A-ZÀ-Ý][A-Za-zÀ-ÿ'’.\s]{0,28})(\s*\([^)]*\))?\s*[:：]/.test(t) || /^[A-ZÀ-Ý][A-ZÀ-Ý'’\s]{1,28}[.—–-]\s/.test(t) || HEAD_RE.test(t) || /^\(/.test(t) || (t === t.toUpperCase() && t.length < 32);
    if (prev && prev.text && !startsNew && !/[.!?…:»”")]$/.test(prev.text) && prev.text !== prev.text.toUpperCase()) prev.text += ' ' + t;
    else out.push({ text: t });
  });
  return out;
}
async function fileToParas(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) {
    await loadScript('lib/mammoth.browser.min.js');
    const r = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    return htmlToParas(r.value);
  }
  if (name.endsWith('.pdf')) {
    await loadScript('lib/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const pg = await pdf.getPage(i); const c = await pg.getTextContent();
      const rows = []; // righe con la loro y
      c.items.forEach(it => {
        const y = Math.round(it.transform[5]); const last = rows[rows.length - 1];
        if (last && Math.abs(y - last.y) <= 2) last.t += (last.t && !last.t.endsWith(' ') && !it.str.startsWith(' ') ? ' ' : '') + it.str;
        else rows.push({ y, t: it.str });
      });
      const gaps = rows.slice(1).map((r, k) => Math.abs(rows[k].y - r.y)).filter(g => g > 2).sort((a, b) => a - b);
      const med = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 14;
      rows.forEach((r, k) => { if (k && Math.abs(rows[k - 1].y - r.y) > med * 1.45) text += '\n'; text += r.t + '\n'; });
      text += '\n';
    }
    return textToParas(text.replace(/^\s*\d+\s*$/gm, ''));
  }
  if (name.endsWith('.html') || name.endsWith('.htm')) return htmlToParas(await file.text());
  return textToParas(await file.text());
}
function scriptSummary(lines) {
  const sp = {}; lines.forEach(l => { if (l.t === 'dlg') sp[l.s] = (sp[l.s] || 0) + 1; });
  return { dlg: lines.filter(l => l.t === 'dlg').length, did: lines.filter(l => l.t === 'act' || l.t === 'desc').length, heads: lines.filter(l => l.t === 'head').length,
    chars: Object.entries(sp).sort((a, b) => b[1] - a[1]) };
}
function fmtText(x) { return esc(x).replace(/\(([^)]*)\)/g, '<i>($1)</i>'); }

/* ───────── demo ───────── */
function demoProject() {
  const st = Object.assign(Stage.defaults(), Stage.presets[0].s);
  const p = newProject(st, { title: 'Il ritorno di Nino (demo)', author: 'GPverse', company: 'Compagnia di prova' });
  const raw = `SCENA 1 — La cucina di casa Bianchi
(Sera. Una cucina modesta: tavolo al centro, due sedie, una porta sul fondo.)
ROSA: Sono le nove passate e di Nino nemmeno l'ombra.
CARLO: Arriverà, arriva sempre. È il suo modo di farsi desiderare.
ROSA: Tu lo difendi sempre. Intanto la minestra si fredda.
CARLO (sedendosi): Allora mangiamo noi. Lui si arrangerà.
(Si sente bussare alla porta.)
ROSA: Eccolo. Apri tu, io non mi muovo.
NINO (entrando): Buonasera a tutti! Scusate il ritardo, il treno si è fermato in mezzo ai campi.
CARLO: Il treno, certo. Sempre colpa del treno.
NINO: Questa volta è vero, papà. Ho perfino un regalo per farmi perdonare.
ROSA: Un regalo? Da quando in qua porti regali?
NINO: Da stasera. Ho trovato lavoro.
SCENA 2 — Più tardi
(Rosa e Nino sono rimasti soli. Carlo è uscito a prendere il vino.)
ROSA: Allora, dimmi la verità. Che lavoro hai trovato?
NINO: In un teatro, mamma. Faccio l'attore.
ROSA: L'attore! E tuo padre lo sa?
NINO: Glielo dico stasera, appena torna. Tu stai dalla mia parte?
ROSA: Io sto sempre dalla tua parte. Ma adesso impara bene la parte, che non voglio fare brutte figure.
TUTTI: Alla salute!`;
  p.lines = parseParagraphs(textToParas(raw));
  ensureChars(p); const nino = getChar(p, 'NINO'); nino.mine = true;
  // scenografia e movimenti di esempio
  const D = st.d;
  const E = (k, x, y, extra = {}) => { const e = Stage.makeEl(p, k, extra); p.els.push(e); Stage.setPos(p, -1, e.id, { x, y, r: extra.r || 0, v: true }); return e; };
  E('tavolo', 0, D * 0.45); E('sedia', -1, D * 0.45, { r: 90 }); E('sedia', 1, D * 0.45, { r: -90 });
  const door = E('porta', 0.6, D - 0.05); E('fondale', 0, D - 0.02); E('luce', 0, D * 0.45, { w: 3.2, d: 3.2 });
  const rosa = E('persona', -1.6, D * 0.35, { ch: 'ROSA' }); const carlo = E('persona', 1.6, D * 0.55, { ch: 'CARLO', r: -30 });
  const ninoEl = E('persona', 0.6, D - 0.5, { ch: 'NINO' }); Stage.setPos(p, -1, ninoEl.id, { v: false });
  const at = re => p.lines.findIndex(l => re.test(l.x));
  Stage.setPos(p, at(/sedendosi/), carlo.id, { x: 1, y: D * 0.45, r: -90 });
  Stage.setPos(p, at(/Buonasera a tutti/), ninoEl.id, { x: 0.6, y: D - 0.7, v: true });
  Stage.setPos(p, at(/Ho trovato lavoro/), ninoEl.id, { x: 0.2, y: D * 0.2 });
  const s2 = p.lines.findIndex(l => l.t === 'head' && /2/.test(l.x));
  Stage.setPos(p, s2, carlo.id, { v: false }); Stage.setPos(p, s2, ninoEl.id, { x: -0.6, y: D * 0.3, r: 30 }); Stage.setPos(p, s2, rosa.id, { x: -1.2, y: D * 0.4, r: 60 });
  void door;
  return p;
}

/* ───────── rendering principale ───────── */
const App = {
  async start() {
    try { S.projects = (await DB.all('projects')).sort((a, b) => b.updated - a.updated); } catch (e) { S.projects = []; toast('Archivio non disponibile: ' + e.message); }
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    window.addEventListener('beforeunload', () => saveNow());
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
    const last = LS.get('last', null);
    if (last && S.projects.find(p => p.id === last)) openProject(last, LS.get('tab', 'copione')); else render();
  }
};

function header(title, sub) {
  return `<header class="top">
    <img class="logo" src="assets/logo.jpg" alt="GPverse" data-act="home" style="cursor:pointer">
    <div class="brand"><small>${esc(sub || 'GPVERSE')}</small><b>${esc(title)}</b></div>
    <button class="ver" data-act="changelog" title="Novità di questa versione">${APP.version}</button>
    <span class="sp"></span>
    ${S.view === 'project' ? `<button class="iconbtn" data-act="home" title="Tutti i progetti">⌂</button>` : ''}
  </header>`;
}

function render() {
  const app = $('#app'); const nav = $('#nav');
  if (S.view === 'home') { nav.hidden = true; app.innerHTML = renderHome(); }
  else if (S.view === 'wizard') { nav.hidden = true; app.innerHTML = renderWizard(); Wizard.after(); }
  else if (S.view === 'project') {
    nav.hidden = false; nav.innerHTML = navHTML();
    app.innerHTML = header(S.p.title, 'GPVERSE · STAGEPLANNER') + `<div id="tab"></div>` + footer();
    renderTab();
  }
}
function footer() { return `<div class="foot"><span>GPverse StagePlanner · ${APP.version}</span><span>I dati restano su questo dispositivo</span></div>`; }
const TABS = [['copione', '📜', 'Copione'], ['prove', '🎭', 'Prove'], ['palco', '🎬', 'Palco'], ['compagnia', '👥', 'Compagnia'], ['altro', '⚙', 'Altro']];
function navHTML() { return TABS.map(([k, i, l]) => `<button data-act="tab" data-k="${k}" aria-current="${S.tab === k}"><span>${i}</span>${l}</button>`).join(''); }
function renderTab() {
  const el = $('#tab'); if (!el) return;
  LS.set('tab', S.tab);
  $$('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.k === S.tab));
  if (S.tab === 'copione') el.innerHTML = renderCopione();
  else if (S.tab === 'prove') el.innerHTML = Prove.tabHTML();
  else if (S.tab === 'palco') { el.innerHTML = Stage.tabHTML(); Stage.mount(); }
  else if (S.tab === 'compagnia') el.innerHTML = renderCompagnia();
  else if (S.tab === 'altro') el.innerHTML = renderAltro();
  if (S.tab === 'copione' && S.jump != null) {
    const r = $(`.ln[data-i="${S.jump}"]`); S.jump = null;
    if (r) { r.scrollIntoView({ block: 'center' }); r.classList.add('flash'); }
  }
}

/* HOME */
function renderHome() {
  const cards = S.projects.map(p => {
    const st = stats(p); const me = myNames(p);
    return `<div class="card pcard" data-act="open" data-id="${p.id}">
      ${Stage.topSVG(p, Stage.positionsAt(p, -1), { mini: true })}
      <div class="t">${esc(p.title)}</div>
      <div class="small muted">${esc([p.author, p.company].filter(Boolean).join(' · ') || Stage.typeName(p.stage.type) + ' ' + p.stage.w + '×' + p.stage.d + ' m')}</div>
      ${me.length ? `<div class="small">Tu: <b style="color:${charColor(p, me[0])}">${esc(me.join(', '))}</b> · ${st.known}/${st.lines} battute sapute</div><div class="bar"><i style="width:${st.pct}%"></i></div>` : `<div class="small muted">${p.lines.filter(l => l.t === 'dlg').length} battute · ${p.chars.length} personaggi</div>`}
      ${st.days != null ? `<div class="small" style="color:${st.days <= 7 ? 'var(--warn)' : 'var(--dim)'}">${st.days > 0 ? `Debutto tra ${st.days} giorni` : st.days === 0 ? 'Debutto oggi!' : 'Debutto passato'}</div>` : ''}
    </div>`;
  }).join('');
  return header('StagePlanner') + `
  <div class="hero"><img src="assets/logo.jpg" alt=""><div><h3>Impara la parte. Disegna il palco.</h3>
    <p class="small">Per attori e compagnie, professionisti e amatoriali: copione, prove con partner vocale, scenografia e movimenti in pianta e dal pubblico.</p></div></div>
  <div class="row" style="margin-bottom:14px">
    <button class="go" data-act="newProject">＋ Nuovo progetto</button>
    <button data-act="importProject">⬆ Importa progetto</button>
    <button data-act="demo">✨ Prova la demo</button>
  </div>
  ${S.projects.length ? `<div class="plist">${cards}</div>` : `<div class="card empty"><p>Nessun progetto ancora.</p><p class="small">Un nuovo progetto parte sempre dal <b>palco</b>: misure e forma di dove andrete in scena.</p></div>`}
  ${footer()}`;
}

/* WIZARD nuovo progetto: 1 palco → 2 spettacolo → 3 copione → 4 chi sei */
const Wizard = {
  steps: ['Palco', 'Spettacolo', 'Copione', 'Chi sei'],
  start() { S.wiz = { step: 0, stage: Object.assign(Stage.defaults(), Stage.presets[0].s), info: { title: '', author: '', company: '', premiere: '' }, lines: [], mine: [] }; S.view = 'wizard'; render(); },
  after() {
    const w = S.wiz;
    if (w.step === 0) Stage.formBind($('#stageForm'), w.stage, () => { $('#wzPrev').innerHTML = Stage.topSVG({ stage: w.stage, els: [], chars: [] }, {}, { zones: true, labels: true }); });
    if (w.step === 2) bindDrop($('#drop'), async f => { await Wizard.loadFile(f); });
  },
  async loadFile(f) {
    try { toast('Leggo il copione…'); const paras = await fileToParas(f); S.wiz.lines = parseParagraphs(paras); S.wiz.file = f.name; render(); }
    catch (e) { toast('Non riesco a leggere il file: ' + e.message, 4000); }
  },
  next() {
    const w = S.wiz;
    if (w.step === 1) { w.info.title = $('#wTitle').value.trim(); if (!w.info.title) { toast('Dai un titolo allo spettacolo'); return; } w.info.author = $('#wAuthor').value.trim(); w.info.company = $('#wCompany').value.trim(); w.info.premiere = $('#wPrem').value; }
    if (w.step === 2) { const t = $('#wPaste') && $('#wPaste').value.trim(); if (t && !w.lines.length) w.lines = parseParagraphs(textToParas(t)); if (!w.lines.length) { this.finish(); return; } }
    if (w.step === 3) { this.finish(); return; }
    w.step++; render();
  },
  back() { if (S.wiz.step === 0) { S.view = 'home'; render(); return; } S.wiz.step--; render(); },
  async finish() {
    const w = S.wiz; const p = newProject(w.stage, w.info); p.lines = w.lines; ensureChars(p);
    p.chars.forEach(c => { c.mine = w.mine.includes(c.n); });
    // persone già in scena per ogni personaggio, nascoste finché non le posizioni
    S.projects.unshift(p); S.p = p; await saveNow(); S.wiz = null; openProject(p.id, p.lines.length ? (p.chars.some(c => c.mine) ? 'prove' : 'copione') : 'palco');
    toast('Progetto creato ✓');
  }
};
function renderWizard() {
  const w = S.wiz;
  const steps = `<div class="steps">${Wizard.steps.map((s, i) => `<span class="${i === w.step ? 'on' : i < w.step ? 'done' : ''}">${i + 1} · ${s}</span>`).join('')}</div>`;
  let body = '';
  if (w.step === 0) body = `<p class="muted" style="margin-top:0">Ogni palco è diverso: parti da qui. Scegli un modello e correggi le misure (in metri). Potrai cambiarle in seguito da <b>Altro → Modifica palco</b>.</p>
    <div class="wz"><div class="card" id="stageForm">${Stage.formHTML(w.stage)}</div><div class="preview card"><h3>Pianta</h3><div id="wzPrev">${Stage.topSVG({ stage: w.stage, els: [], chars: [] }, {}, { zones: true, labels: true })}</div>
    <p class="small muted">Il pubblico è in basso. ${Stage.sideNote(w.stage)}</p></div></div>`;
  if (w.step === 1) body = `<div class="card" style="max-width:640px">
      <div class="fld"><label class="f" for="wTitle">Titolo dello spettacolo *</label><input id="wTitle" value="${esc(w.info.title)}" placeholder="Es. Non ti pago"></div>
      <div class="grid2"><div class="fld"><label class="f" for="wAuthor">Autore</label><input id="wAuthor" value="${esc(w.info.author)}" placeholder="Es. Eduardo De Filippo"></div>
      <div class="fld"><label class="f" for="wCompany">Compagnia</label><input id="wCompany" value="${esc(w.info.company)}"></div></div>
      <div class="fld" style="margin-top:10px"><label class="f" for="wPrem">Data del debutto (per il conto alla rovescia)</label><input id="wPrem" type="date" value="${esc(w.info.premiere)}"></div></div>`;
  if (w.step === 2) {
    const sm = w.lines.length ? scriptSummary(w.lines) : null;
    body = `<div class="card" style="max-width:760px">${sm ? `<h3>✓ Copione letto ${w.file ? '· ' + esc(w.file) : ''}</h3>
      <p>${sm.dlg} battute · ${sm.chars.length} personaggi · ${sm.heads} scene/atti · ${sm.did} didascalie</p>
      <p class="small muted">${sm.chars.slice(0, 14).map(([n, k]) => `${esc(n)} (${k})`).join(' · ')}</p>
      <p class="small muted">Se qualcosa non torna potrai correggere righe e personaggi nelle schede Copione e Compagnia.</p>
      <button data-act="wzClearScript">↺ Cambia copione</button>` : `
      <div class="drop" id="drop"><p style="font-size:30px;margin:0">📜</p><p>Trascina qui il copione o <button data-act="wzPick">scegli un file</button></p><p class="small">Word (.docx), PDF, testo (.txt)</p></div>
      <p class="small muted">Il formato che funziona meglio: <span class="mono">NOME: battuta</span> (anche <span class="mono">NOME. battuta</span> o il nome da solo su una riga), didascalie tra parentesi o in corsivo, «SCENA …» / «ATTO …» per dividere le scene, <span class="mono">TUTTI:</span> per le battute corali.</p>
      <div class="fld"><label class="f" for="wPaste">…oppure incolla il testo</label><textarea id="wPaste" rows="7" placeholder="SCENA 1&#10;MARIO: Buongiorno!&#10;(Entra Lucia)&#10;LUCIA: Buongiorno a te."></textarea></div>
      <p class="small muted">Nessun copione? Vai avanti: puoi lavorare solo sul palco e aggiungerlo dopo.</p>`}</div>`;
  }
  if (w.step === 3) {
    const sm = scriptSummary(w.lines);
    body = `<div class="card" style="max-width:760px"><h3>Quale parte reciti?</h3><p class="small muted">Puoi sceglierne più di una (es. doppi ruoli) o nessuna se sei regista. Si cambia quando vuoi da Compagnia.</p>
      <div class="row">${sm.chars.map(([n, k]) => `<button class="chip" data-act="wzMine" data-n="${esc(n)}" aria-pressed="${w.mine.includes(n)}">${esc(n)} <span class="badge">${k}</span></button>`).join('')}</div></div>`;
  }
  const last = w.step === 3 || (w.step === 2 && !w.lines.length);
  return header('Nuovo progetto', 'GPVERSE · STAGEPLANNER') + steps + body +
    `<div class="navbtns"><button data-act="wzBack">← ${w.step ? 'Indietro' : 'Annulla'}</button><button class="go" data-act="wzNext">${last ? (w.step === 2 ? 'Crea progetto (copione dopo) ✓' : 'Crea progetto ✓') : 'Avanti →'}</button></div>`;
}
function bindDrop(el, cb) {
  if (!el) return;
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('over'); });
  el.addEventListener('dragleave', () => el.classList.remove('over'));
  el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) cb(f); });
}

async function openProject(id, tab) {
  const p = S.projects.find(x => x.id === id) || await DB.get('projects', id);
  if (!p) { S.view = 'home'; render(); return; }
  migrate(p); S.p = p; S.view = 'project'; S.tab = tab || 'copione'; S.edit = false; LS.set('last', id);
  Stage.reset(); render(); window.scrollTo(0, 0);
}
function migrate(p) {
  p.stage = Object.assign(Stage.defaults(), p.stage || {}); p.lines = p.lines || []; p.chars = p.chars || []; p.els = p.els || []; p.blk = p.blk || {}; p.prog = p.prog || {};
  p.narrator = p.narrator || { voice: '', pitch: 1, rate: 1 };
}

/* COPIONE */
function renderCopione() {
  const p = S.p;
  if (!p.lines.length) return `<div class="card empty"><p style="font-size:34px;margin:0">📜</p><h3>Nessun copione</h3>
    <p class="small">Importa un file Word, PDF o testo, oppure incollalo. Puoi anche scriverlo riga per riga.</p>
    <div class="row" style="justify-content:center"><button class="go" data-act="importScript">⬆ Importa copione</button><button data-act="pasteScript">📋 Incolla testo</button><button data-act="addLine" data-i="-1">＋ Scrivi una riga</button></div></div>`;
  const me = myNames(p); const sc = scenes(p); const q = S.search.toLowerCase();
  const keyed = new Set(Object.keys(p.blk));
  const myScenes = new Set(sc.filter(s => p.lines.slice(Math.max(0, s.start), s.end).some(l => isMine(p, l, me))).map(s => s.id));
  let html = '';
  p.lines.forEach((l, i) => {
    const s = l.t === 'head' ? sc.find(x => x.start === i) : null;
    if (S.filter === 'mine' && !myScenes.has(sceneAt(p, i).id)) return;
    if (S.filter === 'only' && !(isMine(p, l, me) || l.t === 'head')) return;
    if (q && !(l.x.toLowerCase().includes(q) || l.s.toLowerCase().includes(q))) return;
    const mine = isMine(p, l, me); const lv = (p.prog[l.id] || {}).l || 0;
    const pin = keyed.has(l.id) ? `<span class="pin" title="Movimento sul palco">📍</span>` : '';
    if (l.t === 'head') { html += `<div class="ln t-head" data-act="line" data-i="${i}" id="sc-${esc(s ? s.id : l.id)}"><div class="tx">${esc(l.x)}</div><div class="side">${pin}</div></div>`; return; }
    const who = l.t === 'dlg' ? `<span class="who" style="color:${charColor(p, l.s)};background:${charColor(p, l.s)}1a">${esc(l.s)}</span>` : l.t === 'cue' ? `<span class="who" style="color:var(--warn)">REGIA</span>` : `<span class="who" style="color:var(--faint)">${l.t === 'act' ? 'AZIONE' : 'DID.'}</span>`;
    html += `<div class="ln t-${l.t} ${mine ? 'mine' : ''}" data-act="line" data-i="${i}">${who}<div class="tx">${fmtText(l.x)}</div><div class="side">${pin}${mine ? `<span class="lv" title="Livello ${lv}/5" style="background:${LEVEL_COLORS[lv]}"></span>` : ''}</div></div>`;
  });
  return `<div class="toolbar">
      <select data-chg="jumpScene" aria-label="Vai alla scena"><option value="">Vai alla scena…</option>${sc.map(s => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('')}</select>
      <div class="seg">${[['all', 'Tutto'], ['mine', 'Mie scene'], ['only', 'Mie battute']].map(([k, l]) => `<button data-act="filter" data-k="${k}" aria-pressed="${S.filter === k}">${l}</button>`).join('')}</div>
      <input type="search" data-inp="search" placeholder="Cerca…" value="${esc(S.search)}" aria-label="Cerca nel copione">
      <button data-act="importScript" title="Importa / sostituisci copione">⬆</button>
    </div>
    ${me.length ? '' : `<div class="card small" style="margin-bottom:10px">Scegli il tuo personaggio in <a href="#" data-act="tab" data-k="compagnia">Compagnia</a> per evidenziare le tue battute.</div>`}
    <div class="script">${html || '<p class="muted">Nessuna riga corrisponde.</p>'}</div>
    <p class="small muted">Tocca una riga per provarla, vederla sul palco o modificarla.</p>`;
}
function lineSheet(i) {
  const p = S.p; const l = p.lines[i];
  sheet(l.t === 'head' ? 'Scena' : 'Riga ' + (i + 1), `<p class="small" style="margin-top:0">${l.t === 'dlg' ? `<b style="color:${charColor(p, l.s)}">${esc(l.s)}</b>: ` : ''}${fmtText(l.x).slice(0, 400)}</p>
    <div class="acts"><button class="go" data-act="proveFrom" data-i="${i}">🎭 Prova da qui</button><button data-act="palcoAt" data-i="${i}">🎬 Palco qui</button><button data-act="editLine" data-i="${i}">✏ Modifica</button></div>
    <div class="acts"><button data-act="addLine" data-i="${i}">＋ Riga sotto</button><button data-act="addHead" data-i="${i}">＋ Nuova scena qui</button></div>`);
}
function editLineSheet(i, isNew) {
  const p = S.p; const l = p.lines[i];
  const opts = p.chars.map(c => `<option ${c.n === l.s ? 'selected' : ''}>${esc(c.n)}</option>`).join('');
  sheet(isNew ? 'Nuova riga' : 'Modifica riga', `
    <div class="grid2"><div class="fld"><label class="f">Tipo</label><select id="elT">${[['dlg', 'Battuta'], ['act', 'Azione'], ['desc', 'Didascalia'], ['cue', 'Nota di regia / cue'], ['head', 'Titolo scena/atto']].map(([k, n]) => `<option value="${k}" ${l.t === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="fld"><label class="f">Personaggio</label><select id="elS"><option value="">—</option>${opts}<option value="__new">＋ Nuovo…</option></select></div></div>
    <div class="fld"><label class="f">Testo</label><textarea id="elX" rows="5">${esc(l.x)}</textarea></div>
    <div class="acts"><button class="go" data-act="saveLine" data-i="${i}">Salva</button><button data-act="moveLine" data-i="${i}" data-d="-1">↑</button><button data-act="moveLine" data-i="${i}" data-d="1">↓</button><button class="danger" data-act="delLine" data-i="${i}">🗑 Elimina</button></div>`,
    el => { const t = $('#elX', el); t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
}

/* COMPAGNIA */
function renderCompagnia() {
  const p = S.p;
  const counts = {}; const wc = {};
  p.lines.forEach(l => { if (l.t === 'dlg') { counts[l.s] = (counts[l.s] || 0) + 1; wc[l.s] = (wc[l.s] || 0) + words(l.x).length; } });
  const voices = TTS.voiceOptions();
  const rows = p.chars.map((c, ci) => {
    const st = c.mine ? stats(p, [c.n]) : null;
    return `<div class="card" style="margin-bottom:10px">
      <div class="row"><input type="color" value="${c.c}" data-chg="charColor" data-n="${esc(c.n)}" aria-label="Colore">
        <div style="flex:1;min-width:140px"><b style="font-family:var(--f-display);letter-spacing:.06em;color:${c.c}">${esc(c.n)}</b>
        <div class="small muted">${counts[c.n] || 0} battute · ${wc[c.n] || 0} parole</div></div>
        <button class="chip" data-act="mine" data-n="${esc(c.n)}" aria-pressed="${!!c.mine}">${c.mine ? '★ Sono io' : '☆ Sono io'}</button>
        <button data-act="charMenu" data-n="${esc(c.n)}" title="Rinomina, unisci, elimina">⋯</button></div>
      ${st ? `<div style="margin-top:8px"><div class="small">${st.known}/${st.lines} battute sapute (${st.pct}%)</div><div class="bar"><i style="width:${st.pct}%"></i></div></div>` : ''}
      <div class="grid3" style="margin-top:10px">
        <div><label class="f">Attore / attrice</label><input data-chg="charActor" data-n="${esc(c.n)}" value="${esc(c.actor)}" placeholder="Nome"></div>
        <div><label class="f">Altezza (m)</label><input type="number" step="0.05" min="0.5" max="2.4" data-chg="charH" data-n="${esc(c.n)}" value="${c.h || 1.7}"></div>
        <div><label class="f">Voce</label><select data-chg="charVoice" data-n="${esc(c.n)}"><option value="">Automatica</option>${voices.map(v => `<option value="${esc(v.uri)}" ${v.uri === c.voice ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>
      </div>
      <div class="row" style="margin-top:8px"><label class="f" style="margin:0">Tono</label><input type="range" min="-5" max="5" step="1" value="${c.pitch || 0}" data-chg="charPitch" data-n="${esc(c.n)}" style="flex:1"><button data-act="testVoice" data-n="${esc(c.n)}">▶ Prova</button></div>
    </div>`;
  }).join('');
  return `<h2 class="sec">PERSONAGGI E VOCI</h2>
    <p class="small muted" style="margin-top:0">Segna con ★ i tuoi personaggi. Ogni personaggio può avere una voce e un tono diversi per il partner vocale (le voci disponibili dipendono dal dispositivo). L'altezza serve per la vista dal pubblico.</p>
    ${rows || '<p class="muted">Nessun personaggio: importa un copione o aggiungine uno.</p>'}
    <div class="row"><button data-act="addChar">＋ Personaggio</button></div>
    <h2 class="sec">VOCE NARRANTE (DIDASCALIE)</h2>
    <div class="card"><div class="grid2"><div><label class="f">Voce</label><select data-chg="narVoice"><option value="">Automatica</option>${voices.map(v => `<option value="${esc(v.uri)}" ${v.uri === p.narrator.voice ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>
    <div class="row" style="align-items:end"><button data-act="testVoice" data-n="">▶ Prova</button></div></div></div>`;
}

/* ALTRO */
function renderAltro() {
  const p = S.p;
  return `<h2 class="sec">SPETTACOLO</h2>
  <div class="card">
    <div class="fld"><label class="f">Titolo</label><input data-chg="pf" data-k="title" value="${esc(p.title)}"></div>
    <div class="grid2"><div class="fld"><label class="f">Autore</label><input data-chg="pf" data-k="author" value="${esc(p.author)}"></div><div class="fld"><label class="f">Compagnia</label><input data-chg="pf" data-k="company" value="${esc(p.company)}"></div></div>
    <div class="fld" style="margin-top:10px"><label class="f">Debutto</label><input type="date" data-chg="pf" data-k="premiere" value="${esc(p.premiere)}"></div>
    <div class="fld"><label class="f">Note</label><textarea data-chg="pf" data-k="notes" rows="3">${esc(p.notes)}</textarea></div>
  </div>
  <h2 class="sec">PALCO</h2>
  <div class="card row"><div style="flex:1">${esc(Stage.typeName(p.stage.type))} · ${p.stage.w}×${p.stage.d} m${p.stage.type === 'italiana' ? ` · boccascena ${p.stage.p} m` : ''}</div><button data-act="editStage">📐 Modifica palco</button></div>
  <h2 class="sec">COPIONE</h2>
  <div class="card row"><button data-act="importScript">⬆ Importa / sostituisci</button><button data-act="pasteScript">📋 Incolla testo</button><button data-act="exportTxt">⬇ Esporta testo</button></div>
  <h2 class="sec">STAMPA / PDF</h2>
  <div class="card row"><button data-act="printScript">🖨 Copione evidenziato</button><button data-act="printBook">🖨 Libro di regia (piante)</button></div>
  <h2 class="sec">BACKUP E COMPAGNIA</h2>
  <div class="card">
    <div class="row"><button class="go" data-act="exportProject" data-rec="1">⬇ Backup completo (con registrazioni)</button><button data-act="exportProject">⬇ Backup leggero</button></div>
    <div class="row" style="margin-top:8px"><button data-act="shareProject">📤 Condividi con la compagnia</button><button data-act="importProject">⬆ Importa un file</button></div>
    <p class="small muted">«Condividi» crea un file senza i tuoi progressi e senza la tua parte: chi lo apre sceglie il proprio personaggio. Il file .stage si apre con «Importa progetto» su qualsiasi dispositivo.</p>
    <div class="row" style="margin-top:8px"><button data-act="resetProg">↺ Azzera i miei progressi</button><button class="danger" data-act="delProject">🗑 Elimina progetto</button></div>
  </div>`;
}

/* stampa */
function printHTML(title, body) {
  const w = window.open('', '_blank'); if (!w) { toast('Consenti le finestre pop-up per stampare'); return; }
  w.document.write(`<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font:12pt/1.45 Georgia,serif;color:#111;margin:18mm}h1{font:700 20pt system-ui;margin:0 0 4px}h2{font:700 13pt system-ui;margin:22px 0 8px;border-bottom:1px solid #999;page-break-after:avoid}
    .m{color:#555;font-size:10pt}.l{margin:0 0 6px;page-break-inside:avoid}.s{font:700 9.5pt system-ui;letter-spacing:.06em}.d{font-style:italic;color:#444}.mine{background:#fff3a6;padding:2px 4px}
    .cue{font:9pt monospace;color:#8a5a00}.blk{display:grid;grid-template-columns:1fr 1fr;gap:10px;page-break-inside:avoid;margin:10px 0 18px}.blk svg{width:100%;height:auto;border:1px solid #ccc}.cap{grid-column:1/-1;font-size:10pt}
    @page{margin:14mm}</style></head><body>${body}<script>setTimeout(()=>print(),400)<\/script></body></html>`);
  w.document.close();
}
function printScript() {
  const p = S.p; const me = myNames(p);
  const body = `<h1>${esc(p.title)}</h1><div class="m">${esc([p.author, p.company].filter(Boolean).join(' · '))}${me.length ? ' — parte: ' + esc(me.join(', ')) : ''}</div>` +
    p.lines.map(l => l.t === 'head' ? `<h2>${esc(l.x)}</h2>` : l.t === 'dlg' ? `<p class="l ${isMine(p, l, me) ? 'mine' : ''}"><span class="s">${esc(l.s)}</span> ${fmtText(l.x)}</p>` : l.t === 'cue' ? `<p class="l cue">▸ ${esc(l.x)}</p>` : `<p class="l d">${esc(l.x)}</p>`).join('');
  printHTML(p.title, body);
}
function printBook() {
  const p = S.p; let body = `<h1>${esc(p.title)} — libro di regia</h1><div class="m">${esc(Stage.typeName(p.stage.type))} ${p.stage.w}×${p.stage.d} m · pubblico in basso nella pianta</div>`;
  scenes(p).forEach(sc => {
    body += `<h2>${esc(sc.title)}</h2>`;
    const pts = [sc.start]; for (let i = Math.max(0, sc.start + 1); i < sc.end; i++) if (p.blk[p.lines[i].id]) pts.push(i);
    pts.forEach(i => {
      const pos = Stage.positionsAt(p, i); const l = p.lines[i];
      const cap = i < 0 || (l && l.t === 'head') ? 'Inizio scena' : (l.t === 'dlg' ? l.s + ': ' : '') + l.x;
      body += `<div class="blk"><div class="cap"><b>▸</b> ${esc(cap.slice(0, 160))}</div>${Stage.topSVG(p, pos, { print: true, labels: true, prev: Stage.prevPositions(p, i) })}${Stage.frontSVG(p, pos, { print: true })}</div>`;
    });
  });
  printHTML(p.title + ' — regia', body);
}

/* esporta / importa */
async function exportProject(withRec, share) {
  const p = JSON.parse(JSON.stringify(S.p));
  if (share) { p.prog = {}; p.chars.forEach(c => { c.mine = false; }); }
  const out = { app: 'gpverse-stageplanner', ver: APP.version, project: p, audio: {} };
  if (withRec) {
    const keys = (await DB.keys('audio')).filter(k => String(k).startsWith(p.id + ':'));
    for (const k of keys) {
      const b = await DB.get('audio', k);
      out.audio[k.slice(p.id.length + 1)] = { type: b.type, data: await blobToB64(b) };
    }
  }
  download(slug(p.title) + (share ? '_compagnia' : '') + '.stage', JSON.stringify(out));
  toast(share ? 'File per la compagnia pronto' : 'Backup salvato');
}
const blobToB64 = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(String(f.result).split(',')[1]); f.readAsDataURL(b); });
const b64ToBlob = (d, type) => { const bin = atob(d); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); };
async function importProjectFile() {
  const f = await pickFile('.stage,.json,application/json'); if (!f) return;
  try {
    const j = JSON.parse(await f.text()); if (j.app !== 'gpverse-stageplanner' || !j.project) throw new Error('non è un file StagePlanner');
    const p = j.project; migrate(p);
    if (S.projects.find(x => x.id === p.id)) {
      if (!confirm(`«${p.title}» è già presente. OK = sostituisci, Annulla = importa come copia`)) { const old = p.id; p.id = uid(); p.title += ' (copia)'; for (const k in j.audio) j.audio[k].__old = old; }
      else S.projects = S.projects.filter(x => x.id !== p.id);
    }
    for (const [k, a] of Object.entries(j.audio || {})) await DB.put('audio', b64ToBlob(a.data, a.type), p.id + ':' + k);
    S.projects.unshift(p); S.p = p; await saveNow(); openProject(p.id, myNames(p).length ? 'prove' : 'compagnia');
    toast('Progetto importato ✓' + (myNames(p).length ? '' : ' — scegli il tuo personaggio'));
  } catch (e) { toast('Importazione non riuscita: ' + e.message, 4000); }
}
async function replaceScript(lines) {
  const p = S.p;
  if (p.lines.length && !confirm('Sostituire il copione attuale? Movimenti e progressi legati alle vecchie righe andranno persi.')) return;
  p.lines = lines; p.blk = Object.fromEntries(Object.entries(p.blk).filter(([k]) => k === '_base')); p.prog = {};
  ensureChars(p); touch(); const sm = scriptSummary(lines);
  toast(`Copione: ${sm.dlg} battute, ${sm.chars.length} personaggi`); S.tab = myNames(p).length ? 'copione' : 'compagnia'; render();
}

/* ───────── eventi ───────── */
const ACT = {
  closeSheet, home() { saveNow(); S.view = 'home'; S.p = null; LS.set('last', null); Prove.stop && Prove.stop(); render(); },
  changelog() {
    sheet('Novità', `<div class="cl">${CHANGELOG.map(c => `<article><h4>${c.v} <span class="muted small">· ${c.d}</span></h4><div>${esc(c.t)}</div><ul>${c.items.map(i => `<li class="small">${esc(i)}</li>`).join('')}</ul></article>`).join('')}</div><p class="small muted">Schema versioni V.maior.minor.patch: maior = cambiamento grosso, minor = nuova funzione, patch = correzione.</p>`);
  },
  newProject() { Wizard.start(); },
  async demo() { const p = demoProject(); S.projects.unshift(p); S.p = p; await saveNow(); openProject(p.id, 'palco'); toast('Demo creata: tu sei NINO'); },
  importProject: importProjectFile,
  open(el) { openProject(el.dataset.id); },
  tab(el, e) { e.preventDefault(); Stage.stopPlay && Stage.stopPlay(); S.tab = el.dataset.k; renderTab(); window.scrollTo(0, 0); },
  wzNext() { Wizard.next(); }, wzBack() { Wizard.back(); },
  async wzPick() { const f = await pickFile('.docx,.pdf,.txt,.html,.htm,text/plain'); if (f) Wizard.loadFile(f); },
  wzClearScript() { S.wiz.lines = []; S.wiz.file = ''; render(); },
  wzPreset(el) { Object.assign(S.wiz.stage, Stage.presets[+el.dataset.i].s); render(); },
  wzMine(el) { const w = S.wiz; const n = el.dataset.n; w.mine = w.mine.includes(n) ? w.mine.filter(x => x !== n) : [...w.mine, n]; el.setAttribute('aria-pressed', w.mine.includes(n)); },
  filter(el) { S.filter = el.dataset.k; renderTab(); },
  line(el) { lineSheet(+el.dataset.i); },
  editLine(el) { editLineSheet(+el.dataset.i); },
  addLine(el) {
    const i = +el.dataset.i; const prev = S.p.lines[i];
    const nl = { id: uid(), t: 'dlg', s: prev && prev.t === 'dlg' ? '' : (myNames(S.p)[0] || ''), x: '' };
    S.p.lines.splice(i + 1, 0, nl); touch(); editLineSheet(i + 1, true);
  },
  addHead(el) { const i = +el.dataset.i; const t = prompt('Titolo della scena', 'SCENA ' + (scenes(S.p).length + 1)); if (!t) return; S.p.lines.splice(i, 0, { id: uid(), t: 'head', s: '', x: t }); touch(); closeSheet(); renderTab(); },
  saveLine(el) {
    const p = S.p; const l = p.lines[+el.dataset.i]; let s = $('#elS').value;
    if (s === '__new') { s = normSpeaker(prompt('Nome del nuovo personaggio') || ''); }
    l.t = $('#elT').value; l.x = $('#elX').value.trim(); l.s = l.t === 'dlg' ? s : '';
    if (l.t === 'dlg' && !l.s) { toast('Scegli chi dice la battuta'); return; }
    ensureChars(p); touch(); closeSheet(); renderTab();
  },
  moveLine(el) { const p = S.p; const i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= p.lines.length) return; [p.lines[i], p.lines[j]] = [p.lines[j], p.lines[i]]; touch(); closeSheet(); renderTab(); },
  delLine(el) { const p = S.p; const l = p.lines[+el.dataset.i]; if (!confirm('Eliminare questa riga?')) return; delete p.blk[l.id]; delete p.prog[l.id]; p.lines.splice(+el.dataset.i, 1); touch(); closeSheet(); renderTab(); },
  proveFrom(el) { closeSheet(); Prove.quickFrom(+el.dataset.i); },
  palcoAt(el) { closeSheet(); Stage.goto(+el.dataset.i); S.tab = 'palco'; renderTab(); },
  async importScript() {
    const f = await pickFile('.docx,.pdf,.txt,.html,.htm,text/plain'); if (!f) return;
    try { toast('Leggo il copione…'); const lines = parseParagraphs(await fileToParas(f)); if (!lines.length) throw new Error('nessuna riga trovata'); await replaceScript(lines); }
    catch (e) { toast('Non riesco a leggere il file: ' + e.message, 4000); }
  },
  pasteScript() {
    sheet('Incolla il copione', `<textarea id="pasteTx" rows="12" placeholder="SCENA 1&#10;MARIO: Buongiorno!&#10;(Entra Lucia)&#10;LUCIA: Buongiorno a te."></textarea><div class="acts"><button class="go" data-act="pasteGo">Usa questo testo</button></div>`, el => $('#pasteTx', el).focus());
  },
  pasteGo() { const t = $('#pasteTx').value.trim(); if (!t) return; closeSheet(); replaceScript(parseParagraphs(textToParas(t))); },
  exportTxt() { const p = S.p; download(slug(p.title) + '.txt', p.lines.map(l => l.t === 'head' ? '\n' + l.x.toUpperCase() : l.t === 'dlg' ? `${l.s}: ${l.x}` : `(${l.x})`).join('\n'), 'text/plain'); },
  mine(el) { const c = getChar(S.p, el.dataset.n); c.mine = !c.mine; touch(); renderTab(); },
  charMenu(el) {
    const n = el.dataset.n;
    sheet(esc(n), `<div class="fld"><label class="f">Rinomina (se scrivi il nome di un altro personaggio, i due vengono uniti)</label><input id="cmName" value="${esc(n)}"></div>
      <div class="acts"><button class="go" data-act="charRename" data-n="${esc(n)}">Salva</button><button class="danger" data-act="charDel" data-n="${esc(n)}">🗑 Elimina personaggio</button></div>`);
  },
  charRename(el) {
    const p = S.p; const from = el.dataset.n; const to = normSpeaker($('#cmName').value); if (!to || to === from) { closeSheet(); return; }
    p.lines.forEach(l => { if (l.s === from) l.s = to; });
    const a = getChar(p, from); const b = getChar(p, to);
    if (b) { b.mine = b.mine || a.mine; p.chars = p.chars.filter(c => c !== a); } else a.n = to;
    p.els.forEach(e => { if (e.ch === from) { e.ch = to; e.lb = to; } });
    touch(); closeSheet(); renderTab(); toast(b ? 'Personaggi uniti' : 'Rinominato');
  },
  charDel(el) {
    const p = S.p; const n = el.dataset.n; const k = p.lines.filter(l => l.s === n).length;
    if (!confirm(k ? `${n} ha ${k} battute: diventeranno didascalie. Continuare?` : `Eliminare ${n}?`)) return;
    p.lines.forEach(l => { if (l.s === n) { l.t = 'desc'; l.x = n + ': ' + l.x; l.s = ''; } });
    p.chars = p.chars.filter(c => c.n !== n); touch(); closeSheet(); renderTab();
  },
  addChar() { const n = normSpeaker(prompt('Nome del personaggio') || ''); if (!n) return; if (getChar(S.p, n)) { toast('Esiste già'); return; } S.p.chars.push({ n, c: COLORS[S.p.chars.length % COLORS.length], actor: '', mine: false, h: 1.7, voice: '', pitch: 0, rate: 1 }); touch(); renderTab(); },
  testVoice(el) { const n = el.dataset.n; TTS.speak(n ? `Sono ${n.toLowerCase()}. Questa è la mia voce.` : 'Didascalia: entra in scena il protagonista.', TTS.cfgFor(S.p, n || null)); },
  editStage() {
    const st = JSON.parse(JSON.stringify(S.p.stage));
    const body = `<div id="stageForm">${Stage.formHTML(st, true)}</div><div class="preview" id="esPrev" style="margin-top:10px">${Stage.topSVG({ stage: st, els: [], chars: [] }, {}, { zones: true, labels: true })}</div>
      <div class="acts"><button class="go" data-act="saveStage">Salva palco</button></div>`;
    sheet('Modifica palco', body, el => { Stage.formBind($('#stageForm', el), st, () => { $('#esPrev').innerHTML = Stage.topSVG({ stage: st, els: [], chars: [] }, {}, { zones: true, labels: true }); }); el._st = st; });
  },
  saveStage() { S.p.stage = $('.sheet')._st; touch(); closeSheet(); renderTab(); toast('Palco aggiornato'); },
  printScript, printBook,
  exportProject(el) { exportProject(!!el.dataset.rec, false); },
  shareProject() { exportProject(false, true); },
  resetProg() { if (!confirm('Azzerare tutti i progressi di memorizzazione?')) return; S.p.prog = {}; touch(); toast('Progressi azzerati'); },
  async delProject() {
    const p = S.p; if (!confirm(`Eliminare definitivamente «${p.title}»? Fai prima un backup se ti serve.`)) return;
    await DB.del('projects', p.id); for (const k of (await DB.keys('audio')).filter(k => String(k).startsWith(p.id + ':'))) await DB.del('audio', k);
    S.projects = S.projects.filter(x => x.id !== p.id); S.p = null; S.view = 'home'; LS.set('last', null); render(); toast('Progetto eliminato');
  }
};
const CHG = {
  jumpScene(el) { if (!el.value) return; const r = document.getElementById('sc-' + el.value); if (r) { r.scrollIntoView({ block: 'start', behavior: 'smooth' }); } else { S.filter = 'all'; renderTab(); setTimeout(() => { const r2 = document.getElementById('sc-' + el.value); r2 && r2.scrollIntoView({ block: 'start' }); }, 50); } el.value = ''; },
  charColor(el) { getChar(S.p, el.dataset.n).c = el.value; touch(); },
  charActor(el) { getChar(S.p, el.dataset.n).actor = el.value; touch(); },
  charH(el) { getChar(S.p, el.dataset.n).h = clamp(num(el.value, 1.7), 0.5, 2.4); touch(); },
  charVoice(el) { getChar(S.p, el.dataset.n).voice = el.value; touch(); },
  charPitch(el) { getChar(S.p, el.dataset.n).pitch = +el.value; touch(); },
  narVoice(el) { S.p.narrator.voice = el.value; touch(); },
  pf(el) { S.p[el.dataset.k] = el.value; touch(); if (el.dataset.k === 'title') $('.brand b').textContent = el.value; }
};
const INP = {
  search(el) { S.search = el.value; clearTimeout(INP._t); INP._t = setTimeout(() => { const pos = el.selectionStart; renderTab(); const i = $('[data-inp="search"]'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }, 250); }
};
function onClick(e) {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act] || (Stage.ACT && Stage.ACT[el.dataset.act]) || (Prove.ACT && Prove.ACT[el.dataset.act]);
  if (fn) { if (el.tagName === 'A') e.preventDefault(); fn(el, e); }
}
function onChange(e) {
  const el = e.target.closest('[data-chg]'); if (!el) return;
  const fn = CHG[el.dataset.chg] || (Stage.CHG && Stage.CHG[el.dataset.chg]) || (Prove.CHG && Prove.CHG[el.dataset.chg]);
  fn && fn(el, e);
}
function onInput(e) {
  const el = e.target.closest('[data-inp]'); if (!el) return;
  const fn = INP[el.dataset.inp] || (Stage.INP && Stage.INP[el.dataset.inp]) || (Prove.INP && Prove.INP[el.dataset.inp]);
  fn && fn(el, e);
}

/* ───────── voce (sintesi) ───────── */
const TTS = {
  voices: [],
  init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => { this.voices = speechSynthesis.getVoices(); };
    load(); speechSynthesis.onvoiceschanged = () => { load(); if (S.view === 'project' && S.tab === 'compagnia') renderTab(); };
  },
  voiceOptions() {
    const it = this.voices.filter(v => /^it/i.test(v.lang)); const rest = this.voices.filter(v => !/^it/i.test(v.lang));
    return [...it, ...rest].map(v => ({ uri: v.voiceURI, name: `${v.name} (${v.lang})` }));
  },
  cfgFor(p, name) {
    const it = this.voices.filter(v => /^it/i.test(v.lang));
    if (!name) return { voice: p.narrator.voice, pitch: 1, auto: it[0] };
    const c = getChar(p, name) || { pitch: 0, voice: '' }; const idx = Math.max(0, p.chars.findIndex(x => x.n === name));
    const autoPitch = [1, 0.75, 1.3, 0.9, 1.15, 0.65, 1.4, 0.85][idx % 8];
    return { voice: c.voice, pitch: c.pitch ? clamp(1 + c.pitch * 0.12, 0.3, 2) : autoPitch, auto: it.length ? it[idx % it.length] : null };
  },
  clean(t) { return String(t).replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim(); },
  speak(text, cfg = {}, rate = 1) {
    return new Promise(res => {
      if (!('speechSynthesis' in window)) { setTimeout(res, 400 + words(text).length * 300); return; }
      speechSynthesis.cancel();
      const parts = this.clean(text).match(/[^.!?…;]+[.!?…;]*|.+$/g) || [];
      if (!parts.length) { res(); return; }
      let i = 0; const v = this.voices.find(x => x.voiceURI === cfg.voice) || cfg.auto || null; const gen = ++this.gen;
      const next = () => {
        if (i >= parts.length || gen !== this.gen) { res(); return; }
        const u = new SpeechSynthesisUtterance(parts[i++].trim()); u.lang = v ? v.lang : 'it-IT'; if (v) u.voice = v;
        u.pitch = cfg.pitch || 1; u.rate = clamp(rate, 0.5, 2);
        let done = false; const fin = () => { if (done) return; done = true; clearTimeout(wd); next(); };
        const wd = setTimeout(fin, 2500 + u.text.length * 140 / u.rate); this._fin = fin;
        u.onend = fin; u.onerror = fin; speechSynthesis.speak(u);
      };
      next();
    });
  },
  gen: 0,
  stop() { this.gen++; if ('speechSynthesis' in window) speechSynthesis.cancel(); }
};
TTS.init();
