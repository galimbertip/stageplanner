/* GPverse StagePlanner — prove: lettura, botta e risposta, partner vocale, ascolto, registrazioni, teleprompter. */
'use strict';

const Prove = (() => {
  const O = Object.assign({ range: 'mine', mask: 1, pause: 'auto', repeat: false, readDid: false, ctx: 2, rate: 1, order: 'smart', fs: 1, mini: true, speakCue: true, recWhich: 'others', tspeed: 40 }, LS.get('prove', {}));
  const save = () => LS.set('prove', O);
  const SRC = window.SpeechRecognition || window.webkitSpeechRecognition;
  let R = null; let wake = null;

  /* ───── utilità ───── */
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, ' ').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  function compare(expected, spoken) {
    const a = norm(expected), b = norm(spoken); const n = a.length, m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const ok = new Array(n).fill(false); let i = 0, j = 0;
    while (i < n && j < m) { if (a[i] === b[j]) { ok[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
    const score = n ? dp[0][0] / n : 1;
    // ricostruisce l'html sulle parole originali
    let k = 0; const html = esc(TTS.clean(expected)).split(/(\s+)/).map(tok => { if (!tok.trim()) return tok; const parts = norm(tok); if (!parts.length) return tok; const good = parts.every(() => ok[k++]); return `<span class="${good ? 'ok' : 'ko'}">${tok}</span>`; }).join('');
    return { score, html };
  }
  function mask(text, level, reveal = 0) {
    if (level <= 0) return fmtText(text);
    const toks = String(text).split(/(\s+)/); let w = 0; const total = words(text).length;
    if (level >= 3 && !reveal) return `<span class="mask">▒▒▒ ${total} ${total === 1 ? 'parola' : 'parole'} ▒▒▒</span>`;
    return toks.map(t => {
      if (!t.trim()) return t; if (/^\(.*\)$/.test(t)) return `<i>${esc(t)}</i>`;
      w++; if (w <= reveal) return esc(t);
      if (level === 2) return w === 1 ? esc(t) : `<span class="mask">${'·'.repeat(Math.min(6, t.length))}</span>`;
      if (level >= 3) return `<span class="mask">${'·'.repeat(Math.min(6, t.length))}</span>`;
      const m = t.match(/^([«"“(]*)([\p{L}\p{N}])(.*?)([.,;:!?…»"”)]*)$/u); if (!m) return esc(t);
      return esc(m[1] + m[2]) + `<span class="mask">${'·'.repeat(Math.min(5, m[3].length))}</span>` + esc(m[4]);
    }).join('');
  }
  const sleep = ms => new Promise(r => { const t = setTimeout(r, ms); if (R) R.cancels.push(() => { clearTimeout(t); r(); }); });
  const recKey = (p, l) => p.id + ':' + l.id;
  async function wakeOn() { try { wake = await navigator.wakeLock.request('screen'); } catch {} }
  function wakeOff() { try { wake && wake.release(); } catch {} wake = null; }

  function rangeIdx(p, start) {
    const me = myNames(p); const sc = scenes(p); let ids;
    if (O.range === 'all') ids = sc;
    else if (O.range === 'mine') ids = sc.filter(s => p.lines.slice(Math.max(0, s.start), s.end).some(l => isMine(p, l, me)));
    else ids = sc.filter(s => s.id === O.range);
    if (!ids.length) ids = sc;
    const out = []; ids.forEach(s => { for (let i = Math.max(0, s.start); i < s.end; i++) out.push(i); });
    if (start != null) { const sc0 = sceneAt(p, start); const o2 = []; for (let i = start; i < sc0.end; i++) o2.push(i); return o2; }
    return out;
  }

  /* ───── scheda Prove ───── */
  function tabHTML() {
    const p = S.p; const me = myNames(p);
    if (!p.lines.some(l => l.t === 'dlg')) return `<div class="card empty"><p style="font-size:34px;margin:0">🎭</p><h3>Serve un copione</h3><p class="small">Importa il copione per provare la parte.</p><button class="go" data-act="tab" data-k="copione">Vai al copione</button></div>`;
    const chips = p.chars.filter(c => c.n !== 'TUTTI').map(c => `<button class="chip" data-act="pMine" data-n="${esc(c.n)}" aria-pressed="${!!c.mine}"><span style="color:${c.c}">●</span> ${esc(c.n)}</button>`).join('');
    const st = stats(p); const sc = scenes(p);
    const weak = p.lines.filter(l => isMine(p, l, me) && ((p.prog[l.id] || {}).l || 0) < 3).length;
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l, dis]) => `<button data-act="pOpt" data-k="${key}" data-v="${v}" aria-pressed="${String(O[key]) === String(v)}" ${dis ? 'disabled' : ''}>${l}</button>`).join('')}</div>`;
    return `<h2 class="sec">LA TUA PARTE</h2>
      <div class="row" style="margin-bottom:10px">${chips}</div>
      ${me.length ? `<div class="card"><div class="grid3">
        <div class="stat"><b>${st.pct}%</b><span>imparata (${st.known}/${st.lines} battute)</span></div>
        <div class="stat"><b>${st.words}</b><span>parole da sapere</span></div>
        <div class="stat"><b>${st.days != null ? (st.days > 0 ? st.days : '—') : '—'}</b><span>${st.days != null ? (st.days > 0 ? 'giorni al debutto' + (st.perDay ? ` · ${st.perDay} battute/giorno` : '') : 'debutto passato') : 'imposta il debutto in Altro'}</span></div>
      </div><div class="bar" style="margin-top:10px"><i style="width:${st.pct}%"></i></div>
      <div class="small muted" style="margin-top:6px">${weak ? `${weak} battute da consolidare.` : 'Tutte le battute sono consolidate. Ripassa ogni tanto!'} Livelli: ${LEVEL_COLORS.map((c, i) => `<span class="lv" style="display:inline-block;background:${c};vertical-align:middle"></span> ${i}`).join(' ')}</div></div>`
        : `<div class="card small">Scegli qui sopra il tuo personaggio (puoi sceglierne più di uno).</div>`}
      <h2 class="sec">COSA PROVARE</h2>
      <div class="row"><select data-chg="pRange" style="width:auto;flex:1 1 220px">
        <option value="mine" ${O.range === 'mine' ? 'selected' : ''}>Solo le scene dove ci sono io</option><option value="all" ${O.range === 'all' ? 'selected' : ''}>Tutto il copione</option>
        ${sc.map(s => `<option value="${esc(s.id)}" ${O.range === s.id ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select></div>
      <h2 class="sec">MODALITÀ</h2>
      <div class="modes">
        ${modeCard('read', '📖', 'Lettura', 'Il copione con le tue battute nascoste a livelli: iniziali, prima parola, tutto nascosto. Tocca per sbirciare.')}
        ${modeCard('cue', '🎯', 'Botta e risposta', 'Vedi (e senti) la battuta d\'attacco, dici la tua, poi ti voti. Prima le battute più deboli.')}
        ${modeCard('partner', '🎧', 'Partner vocale', 'Gli altri personaggi parlano con voci diverse e si fermano per la tua battuta. Col microfono controlla parola per parola.')}
        ${modeCard('listen', '🎵', 'Ascolta come una canzone', 'Tutto letto ad alta voce, anche le tue battute: per imparare in macchina o camminando.')}
        ${modeCard('record', '🎙', 'Registra le voci', 'Registra tu o un compagno le battute: il partner vocale userà le voci vere al posto di quella sintetica.')}
        ${modeCard('tele', '📜', 'Teleprompter', 'Il copione scorre da solo a velocità regolabile.')}
      </div>
      <h2 class="sec">OPZIONI</h2>
      <div class="card">
        <div class="fld"><label class="f">Le tue battute</label>${seg('mask', [[0, 'Visibili'], [1, 'Iniziali'], [2, 'Prima parola'], [3, 'Nascoste']])}</div>
        <div class="fld"><label class="f">Partner vocale: la tua battuta</label>${seg('pause', [['auto', 'Pausa automatica'], ['tap', 'Aspetta un tocco'], ['mic', '🎤 Ascolta il microfono', !SRC]])}
          ${SRC ? '' : '<div class="small muted">Il riconoscimento vocale non è disponibile in questo browser (usa Chrome o Edge).</div>'}</div>
        <div class="fld"><label class="f">Botta e risposta</label>${seg('order', [['smart', 'Prima le più deboli'], ['seq', 'In ordine']])} ${seg('ctx', [[1, '1'], [2, '2'], [3, '3']])} <span class="small muted">battute di contesto</span></div>
        <div class="row small" style="gap:16px">
          <label><input type="checkbox" data-chg="pChk" data-k="repeat" ${O.repeat ? 'checked' : ''}> Dopo la pausa leggi la mia battuta</label>
          <label><input type="checkbox" data-chg="pChk" data-k="readDid" ${O.readDid ? 'checked' : ''}> Leggi le didascalie</label>
          <label><input type="checkbox" data-chg="pChk" data-k="speakCue" ${O.speakCue ? 'checked' : ''}> Botta e risposta: leggi la battuta d'attacco</label>
          <label><input type="checkbox" data-chg="pChk" data-k="mini" ${O.mini ? 'checked' : ''}> Mostra «Dove sono» sul palco</label>
        </div>
        <div class="row" style="margin-top:8px"><label class="f" style="margin:0">Velocità voce</label><input type="range" min="0.6" max="1.6" step="0.05" value="${O.rate}" data-chg="pRate" style="flex:1"><span class="mono small" id="rateV">${O.rate.toFixed(2)}×</span></div>
      </div>`;
  }
  const modeCard = (k, ic, t, d) => `<button class="mode card" data-act="pStart" data-k="${k}"><span class="ic">${ic}</span><span><b>${t}</b><small>${d}</small></span></button>`;

  /* ───── player ───── */
  function open(mode, start) {
    const p = S.p; const me = myNames(p);
    if (!me.length && mode !== 'record' && mode !== 'tele' && mode !== 'listen') { toast('Scegli prima il tuo personaggio'); return; }
    const seq = rangeIdx(p, start);
    R = { mode, seq, i: 0, playing: false, cancels: [], me, reveal: {}, stats: [0, 0, 0], recs: new Set() };
    if (mode === 'cue') {
      let q = seq.filter(i => isMine(p, p.lines[i], me));
      if (O.order === 'smart') q = q.map(i => ({ i, g: p.prog[p.lines[i].id] || { l: 0, t: 0 } })).sort((a, b) => a.g.l - b.g.l || a.g.t - b.g.t || a.i - b.i).map(x => x.i);
      if (!q.length) { toast('Nessuna tua battuta in questo intervallo'); R = null; return; }
      R.q = q; R.hint = 0; R.shown = false; R.spoken = null;
    }
    const el = $('#player'); el.hidden = false; document.body.style.overflow = 'hidden'; wakeOn();
    el.innerHTML = `<div class="ph"><button data-act="pClose" aria-label="Chiudi">✕</button><span class="t" id="pTitle"></span>
      <button class="iconbtn" data-act="pFs" data-d="-1" title="Testo più piccolo">A−</button><button class="iconbtn" data-act="pFs" data-d="1" title="Testo più grande">A+</button></div>
      <div class="pb" id="pBody"></div><div class="pf" id="pFoot"></div>`;
    el.style.setProperty('--fs', O.fs);
    DB.keys('audio').then(ks => { ks.forEach(k => { if (String(k).startsWith(p.id + ':')) R && R.recs.add(String(k).slice(p.id.length + 1)); }); if (R && (mode === 'record')) draw(); });
    draw();
    if (mode === 'partner' || mode === 'listen') { R.playing = true; draw(); runPartner(); }
    if (mode === 'cue') cueSpeak();
  }
  function close() {
    stop(); R = null; const el = $('#player'); el.hidden = true; el.innerHTML = ''; document.body.style.overflow = ''; wakeOff();
    if (S.view === 'project' && S.tab === 'prove') renderTab();
  }
  function stop() {
    if (!R) return; R.playing = false; TTS.stop(); if (R.audio) { R.audio.pause(); R.audio = null; } if (R.rec) { try { R.rec.abort(); } catch {} R.rec = null; }
    R.cancels.splice(0).forEach(f => f()); if (R.release) { R.release('stop'); R.release = null; } if (R.tele) { cancelAnimationFrame(R.tele); R.tele = 0; }
    if (R.mr && R.mr.state === 'recording') R.mr.stop();
  }
  function draw() {
    if (!R) return; const p = S.p; const t = { read: 'LETTURA', cue: 'BOTTA E RISPOSTA', partner: 'PARTNER VOCALE', listen: 'ASCOLTO', record: 'REGISTRA LE VOCI', tele: 'TELEPROMPTER' }[R.mode];
    $('#pTitle').textContent = `${t} · ${p.title}`;
    ({ read: drawRead, cue: drawCue, partner: drawPartner, listen: drawPartner, record: drawRecord, tele: drawTele })[R.mode]();
  }
  const whoTag = (p, l) => l.t === 'dlg' ? `<span class="who" style="color:${charColor(p, l.s)}">${esc(l.s)}</span> ` : '';
  function miniMap(i) {
    if (!O.mini || !S.p.els.length) return '';
    return `<div class="mini">${Stage.topSVG(S.p, Stage.positionsAt(S.p, i), { labels: true, highlight: R.me, prev: Stage.prevPositions(S.p, i) })}</div>`;
  }

  /* LETTURA */
  function drawRead() {
    const p = S.p;
    $('#pBody').innerHTML = `<div class="big">${R.seq.map(i => {
      const l = p.lines[i]; const mine = isMine(p, l, R.me);
      if (l.t === 'head') return `<h3 style="margin:18px 0 8px">${esc(l.x)}</h3>`;
      if (l.t !== 'dlg') return `<p class="muted" style="font-style:italic;margin:6px 0">${fmtText(l.x)}</p>`;
      return `<p style="margin:8px 0" ${mine ? `data-act="pPeek" data-i="${i}" class="focus" ` : ''}>${whoTag(p, l)}${mine && !R.reveal[i] ? mask(l.x, O.mask) : fmtText(l.x)}</p>`;
    }).join('')}</div>`;
    $('#pFoot').innerHTML = maskSeg() + `<button data-act="pStart" data-k="cue">🎯 Botta e risposta</button>`;
  }
  const maskSeg = () => `<div class="seg">${[[0, 'Visibili'], [1, 'Iniziali'], [2, '1ª parola'], [3, 'Nascoste']].map(([v, l]) => `<button data-act="pMask" data-v="${v}" aria-pressed="${O.mask === v}">${l}</button>`).join('')}</div>`;

  /* BOTTA E RISPOSTA */
  function cueContext(i) {
    const p = S.p; const out = []; let j = i - 1;
    while (j >= 0 && out.length < O.ctx) { const l = p.lines[j]; if (l.t === 'head') break; if (l.t === 'dlg' || O.readDid) out.unshift(j); j--; }
    return out;
  }
  function drawCue() {
    const p = S.p;
    if (R.qi == null) R.qi = 0;
    if (R.qi >= R.q.length) { return drawCueEnd(); }
    const i = R.q[R.qi]; const l = p.lines[i]; const g = p.prog[l.id] || { l: 0 };
    const ctx = cueContext(i);
    $('#pBody').innerHTML = `<div class="small muted" style="margin-bottom:10px">${R.qi + 1} / ${R.q.length} · ${esc(sceneAt(p, i).title)} · livello <span class="lv" style="display:inline-block;vertical-align:middle;background:${LEVEL_COLORS[g.l]}"></span> ${g.l}/5</div>
      ${ctx.length ? ctx.map(j => `<div class="ctx big">${whoTag(p, p.lines[j])}${fmtText(p.lines[j].x)}</div>`).join('') : '<div class="ctx">— inizio scena —</div>'}
      <div class="focus big"><div class="who" style="color:${charColor(p, l.s)}">${esc(l.s)} · TU</div>
        <div ${R.spoken ? 'class="diff"' : ''}>${R.spoken ? R.spoken.html : R.shown ? fmtText(l.x) : mask(l.x, Math.max(O.mask, 1), R.hint)}</div>
        ${R.spoken ? `<div class="small" style="margin-top:8px">Precisione: <b>${Math.round(R.spoken.score * 100)}%</b> · hai detto: <i>${esc(R.spoken.text)}</i></div>` : ''}
        <div class="live" id="live"></div></div>
      ${R.shown ? `<div class="rate"><button class="r0" data-act="pRate" data-v="0">✗ Non la sapevo</button><button class="r1" data-act="pRate" data-v="1">≈ Quasi</button><button class="r2" data-act="pRate" data-v="2">✓ La sapevo</button></div>` : ''}
      ${miniMap(i)}`;
    $('#pFoot').innerHTML = R.shown ? `<button data-act="pCueRepeat">🔁 Riascolta</button>` :
      `<button data-act="pHint">💡 Aiuto</button>${SRC ? `<button data-act="pSay" id="sayBtn">🎤 Dilla</button>` : ''}<button class="go" data-act="pShow">👁 Mostra</button><button data-act="pCueRepeat" title="Riascolta la battuta d'attacco">🔁</button>`;
  }
  function drawCueEnd() {
    const p = S.p; const [no, al, ok] = R.stats; const st = stats(p, R.me);
    $('#pBody').innerHTML = `<div class="focus" style="text-align:center"><h3>Giro finito!</h3><p class="big">✓ ${ok} · ≈ ${al} · ✗ ${no}</p><p>Parte imparata: <b>${st.pct}%</b></p><div class="bar"><i style="width:${st.pct}%"></i></div></div>`;
    $('#pFoot').innerHTML = `${R.wrong && R.wrong.length ? `<button class="go" data-act="pRetry">↻ Ripeti le ${R.wrong.length} sbagliate</button>` : ''}<button data-act="pStart" data-k="cue">↻ Nuovo giro</button><button data-act="pClose">Fine</button>`;
  }
  async function cueSpeak() {
    if (!R || R.mode !== 'cue' || !O.speakCue || R.qi >= R.q.length) return;
    const p = S.p; const ctx = cueContext(R.q[R.qi]); const j = ctx[ctx.length - 1]; if (j == null) return;
    const l = p.lines[j]; await sayLine(l, true);
  }
  async function sayLine(l, quick) {
    const p = S.p;
    if (l.t !== 'dlg') { if (O.readDid || quick) await TTS.speak(l.x, TTS.cfgFor(p, null), O.rate); return; }
    if (R && R.recs.has(l.id)) {
      const b = await DB.get('audio', recKey(p, l));
      if (b && R) { await new Promise(res => { const a = new Audio(URL.createObjectURL(b)); a.playbackRate = clamp(O.rate, 0.6, 1.6); R.audio = a; a.onended = a.onerror = () => res(); R.cancels.push(res); a.play().catch(res); }); return; }
    }
    await TTS.speak(l.x, TTS.cfgFor(p, l.s), O.rate);
  }
  function listen(expected, onLive) {
    return new Promise((res, rej) => {
      if (!SRC) { rej(new Error('Riconoscimento vocale non disponibile')); return; }
      const rec = new SRC(); rec.lang = 'it-IT'; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
      const n = words(expected).length; let best = '', silence = 0, done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(silence); clearTimeout(maxT); try { rec.stop(); } catch {} res(best); };
      const maxT = setTimeout(finish, 7000 + n * 900);
      rec.onresult = e => {
        const all = Array.from(e.results).map(r => r[0].transcript).join(' ');
        const last = e.results[e.results.length - 1][0].transcript;
        best = compare(expected, all).score >= compare(expected, last).score ? all : last;
        onLive && onLive(best); clearTimeout(silence); silence = setTimeout(finish, 1900);
        if (norm(best).length >= n && compare(expected, best).score > 0.92) setTimeout(finish, 350);
      };
      rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { done = true; clearTimeout(maxT); rej(new Error('Microfono non consentito')); } else if (e.error !== 'no-speech' && e.error !== 'aborted') finish(); };
      rec.onend = () => { if (!done) finish(); };
      if (R) { R.rec = rec; R.cancels.push(() => { done = true; clearTimeout(maxT); clearTimeout(silence); try { rec.abort(); } catch {} res(best); }); }
      try { rec.start(); } catch (e) { rej(e); }
    });
  }

  /* PARTNER VOCALE / ASCOLTO */
  function drawPartner() {
    const p = S.p; const i = R.seq[R.i]; const l = p.lines[i];
    if (!l) { $('#pBody').innerHTML = `<div class="focus" style="text-align:center"><h3>Fine!</h3><p>${R.stats[2] + R.stats[1] + R.stats[0] ? `Al microfono: ✓ ${R.stats[2]} · ≈ ${R.stats[1]} · ✗ ${R.stats[0]}` : 'Bravo, scena completata.'}</p></div>`; $('#pFoot').innerHTML = `<button data-act="pRestart">↻ Da capo</button><button data-act="pClose">Fine</button>`; return; }
    const mine = isMine(p, l, R.me) && R.mode !== 'listen';
    const prev = []; for (let j = R.i - 1; j >= 0 && prev.length < 2; j--) { const x = p.lines[R.seq[j]]; if (x.t === 'head') break; prev.unshift(x); }
    const text = mine && !R.revealCur ? mask(l.x, O.mask) : R.diff ? R.diff : fmtText(l.x);
    $('#pBody').innerHTML = `<div class="small muted" style="margin-bottom:10px">${R.i + 1} / ${R.seq.length} · ${esc(sceneAt(p, i).title)}</div>
      ${prev.map(x => `<div class="ctx big">${whoTag(p, x)}${fmtText(x.x)}</div>`).join('')}
      ${l.t === 'head' ? `<h3 class="big">${esc(l.x)}</h3>` : `<div class="${mine ? 'focus' : 'card'} big" style="margin-top:6px">
        ${l.t === 'dlg' ? `<div class="who" style="color:${charColor(p, l.s)};font:700 12px var(--f-display);letter-spacing:.12em;margin-bottom:6px">${esc(l.s)}${mine ? ' · TOCCA A TE' : ''}</div>` : ''}
        <div class="${R.diff ? 'diff' : ''}" style="${l.t !== 'dlg' ? 'font-style:italic;color:#9fb3cc' : ''}">${text}</div>
        ${mine && R.waiting === 'mic' ? `<div class="mic" style="margin-top:10px"><i></i> TI ASCOLTO…</div>` : ''}
        ${mine && R.waiting === 'auto' ? `<div class="bar" style="margin-top:10px"><i id="cd" style="width:100%;transition:width linear"></i></div>` : ''}
        <div class="live" id="live"></div></div>`}
      ${miniMap(i)}`;
    $('#pFoot').innerHTML = `<button data-act="pPrev" title="Indietro">⏮</button><button class="go" data-act="pPlay">${R.playing ? '⏸ Pausa' : '▶ Avvia'}</button>
      ${R.waiting ? `<button data-act="pDone">✓ Fatto</button>` : ''}<button data-act="pNext" title="Avanti">⏭</button>
      ${mine && !R.revealCur ? `<button data-act="pPeekCur">👁</button>` : ''}`;
    if (R.waiting === 'auto' && R.cdMs) requestAnimationFrame(() => { const c = $('#cd'); if (c) { c.style.transitionDuration = R.cdMs + 'ms'; c.style.width = '0%'; } });
  }
  async function runPartner() {
    const p = S.p; const my = R; const tok = (R.tok = (R.tok || 0) + 1);
    const alive = () => R === my && R.playing && R.tok === tok;
    while (alive() && R.i < R.seq.length) {
      const l = p.lines[R.seq[R.i]]; R.revealCur = false; R.diff = null; R.waiting = null; draw();
      if (l.t === 'head') await sleep(800);
      else if (l.t !== 'dlg') { if (O.readDid) await sayLine(l); else await sleep(350); }
      else if (isMine(p, l, R.me) && R.mode !== 'listen') await myTurn(l);
      else await sayLine(l);
      if (!alive()) return;
      await sleep(180); if (!alive()) return; R.i++;
    }
    if (R === my && R.i >= R.seq.length) { R.playing = false; draw(); }
  }
  async function myTurn(l) {
    const p = S.p; const n = words(l.x).length;
    const waitTap = ms => new Promise(res => { R.release = res; if (ms) { const t = setTimeout(res, ms); R.cancels.push(() => { clearTimeout(t); res(); }); } });
    if (O.pause === 'mic' && SRC) {
      R.waiting = 'mic'; draw();
      try {
        const said = await listen(l.x, t => { const lv = $('#live'); if (lv) lv.textContent = t; });
        if (!R || !R.playing) return;
        const c = compare(l.x, said); const r = c.score >= 0.9 ? 2 : c.score >= 0.6 ? 1 : 0;
        rateLine(p, l.id, r); R.stats[r]++; R.waiting = null; R.revealCur = true; R.diff = c.html + `<div class="small muted" style="margin-top:6px">${Math.round(c.score * 100)}% ${r === 2 ? '✓' : r === 1 ? '≈' : '✗'}</div>`; draw();
        await sleep(r === 2 ? 900 : 2600);
      } catch (e) { toast(e.message + ' — passo alla pausa a tocco'); O.pause = 'tap'; save(); R.waiting = 'tap'; draw(); await waitTap(0); }
    } else if (O.pause === 'tap') { R.waiting = 'tap'; draw(); await waitTap(0); }
    else { const ms = Math.round((1300 + n * 470) / O.rate); R.waiting = 'auto'; R.cdMs = ms; draw(); await waitTap(ms); }
    if (!R || !R.playing) return;
    R.waiting = null; R.release = null;
    if (O.repeat) { R.revealCur = true; draw(); await sayLine(l); }
    else if (!R.diff) { R.revealCur = true; draw(); await sleep(500); }
  }

  /* REGISTRA */
  function drawRecord() {
    const p = S.p;
    const list = R.seq.filter(i => { const l = p.lines[i]; if (l.t !== 'dlg') return false; const m = isMine(p, l, R.me); return O.recWhich === 'all' || (O.recWhich === 'mine' ? m : !m); });
    $('#pBody').innerHTML = `<p class="small muted" style="margin-top:0">Registra con la tua voce (o con un compagno vicino a te) le battute: il partner vocale e il botta e risposta useranno queste registrazioni al posto della voce sintetica. Registrare anche le tue serve per ascoltarle «come una canzone».</p>
      <div class="rec-list script">${list.map(i => { const l = p.lines[i]; const has = R.recs.has(l.id); const on = R.recId === l.id;
        return `<div class="ln t-dlg" id="rec-${l.id}"><span class="who" style="color:${charColor(p, l.s)}">${esc(l.s)}</span><div class="tx">${fmtText(l.x)}</div>
          <div class="side"><button class="recbtn ${on ? 'on' : ''}" data-act="pRec" data-i="${i}">${on ? '■' : '●'}</button>${has ? `<button data-act="pRecPlay" data-i="${i}">▶</button><button data-act="pRecDel" data-i="${i}">🗑</button>` : ''}</div></div>`; }).join('') || '<p class="muted">Nessuna battuta da registrare in questo intervallo.</p>'}</div>`;
    $('#pFoot').innerHTML = `<div class="seg">${[['others', 'Degli altri'], ['mine', 'Le mie'], ['all', 'Tutte']].map(([v, l]) => `<button data-act="pRecWhich" data-v="${v}" aria-pressed="${O.recWhich === v}">${l}</button>`).join('')}</div><span class="small muted" style="align-self:center">${R.recs.size} registrate</span>`;
  }
  async function toggleRec(i) {
    const p = S.p; const l = p.lines[i];
    if (R.mr && R.mr.state === 'recording') { const same = R.recId === l.id; R.mr.stop(); if (same) return; await new Promise(r => setTimeout(r, 200)); }
    try { R.stream = R.stream || await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { toast('Microfono non disponibile: ' + e.message); return; }
    const chunks = []; const mr = new MediaRecorder(R.stream); R.mr = mr; R.recId = l.id;
    mr.ondataavailable = e => e.data.size && chunks.push(e.data);
    mr.onstop = async () => {
      const b = new Blob(chunks, { type: mr.mimeType || 'audio/webm' }); if (R) { R.recId = null; }
      if (b.size > 800) { await DB.put('audio', b, recKey(p, l)); R && R.recs.add(l.id); }
      if (R && R.mode === 'record') { draw(); const nx = $(`#rec-${l.id}`); nx && nx.nextElementSibling && nx.nextElementSibling.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    };
    mr.start(); draw();
  }

  /* TELEPROMPTER */
  function drawTele() {
    const p = S.p;
    $('#pBody').innerHTML = `<div class="tele">${R.seq.map(i => { const l = p.lines[i]; const mine = isMine(p, l, R.me);
      if (l.t === 'head') return `<p style="color:var(--violet);font-family:var(--f-display);font-size:.6em;letter-spacing:.14em">${esc(l.x)}</p>`;
      if (l.t !== 'dlg') return `<p style="color:#7d90aa;font-style:italic;font-size:.75em">${fmtText(l.x)}</p>`;
      return `<p style="${mine ? 'color:var(--cyan)' : ''}"><span style="color:${charColor(p, l.s)};font:700 .45em var(--f-display);letter-spacing:.1em;display:block">${esc(l.s)}</span>${mine ? mask(l.x, O.mask) : fmtText(l.x)}</p>`; }).join('')}</div>`;
    $('#pFoot').innerHTML = `<button class="go" data-act="pTele">${R.tele ? '⏸' : '▶'}</button><input type="range" min="10" max="160" value="${O.tspeed}" data-inp="pTs" style="flex:1;max-width:320px" aria-label="Velocità"><span class="mono small" style="align-self:center">${O.tspeed}</span>${maskSeg()}`;
  }
  function teleToggle() {
    if (R.tele) { cancelAnimationFrame(R.tele); R.tele = 0; drawTeleFoot(); return; }
    const body = $('#pBody'); let last = performance.now(); let acc = body.scrollTop;
    const step = now => { const dt = (now - last) / 1000; last = now; acc += O.tspeed * dt; body.scrollTop = acc; if (body.scrollTop + body.clientHeight >= body.scrollHeight - 2) { R.tele = 0; drawTeleFoot(); return; } R.tele = requestAnimationFrame(step); };
    R.tele = requestAnimationFrame(step); drawTeleFoot();
  }
  const drawTeleFoot = () => { const b = $('[data-act="pTele"]'); if (b) b.textContent = R.tele ? '⏸' : '▶'; };

  /* ───── azioni ───── */
  const ACT = {
    pMine(el) { const c = getChar(S.p, el.dataset.n); c.mine = !c.mine; touch(); renderTab(); },
    pOpt(el) { const k = el.dataset.k; const v = el.dataset.v; O[k] = /^\d+$/.test(v) ? +v : v; save(); $$(`[data-act="pOpt"][data-k="${k}"]`).forEach(b => b.setAttribute('aria-pressed', b === el)); },
    pStart(el) { const m = el.dataset.k; if (R) { stop(); } open(m); },
    pClose: close,
    pFs(el) { O.fs = clamp(O.fs + (+el.dataset.d) * 0.12, 0.7, 2.2); save(); $('#player').style.setProperty('--fs', O.fs); },
    pMask(el) { O.mask = +el.dataset.v; save(); R.reveal = {}; draw(); },
    pPeek(el) { const i = +el.dataset.i; R.reveal[i] = !R.reveal[i]; draw(); },
    pHint() { R.hint++; const l = S.p.lines[R.q[R.qi]]; if (R.hint >= words(l.x).length) R.shown = true; draw(); },
    pShow() { R.shown = true; TTS.stop(); draw(); },
    pCueRepeat() { TTS.stop(); cueSpeak(); },
    async pSay(el) {
      const p = S.p; const l = p.lines[R.q[R.qi]]; TTS.stop(); el.disabled = true; el.innerHTML = '<span class="mic"><i></i> ASCOLTO</span>';
      try { const said = await listen(l.x, t => { const lv = $('#live'); if (lv) lv.textContent = t; }); if (!R) return; const c = compare(l.x, said); R.spoken = Object.assign(c, { text: said || '(niente)' }); R.shown = true; draw(); }
      catch (e) { toast(e.message); el.disabled = false; el.textContent = '🎤 Dilla'; }
    },
    pRate(el) {
      const r = +el.dataset.v; const id = S.p.lines[R.q[R.qi]].id; rateLine(S.p, id, r); R.stats[r]++; if (r < 2) (R.wrong = R.wrong || []).push(R.q[R.qi]);
      R.qi++; R.hint = 0; R.shown = false; R.spoken = null; draw(); $('#pBody').scrollTop = 0; cueSpeak();
    },
    pRetry() { R.q = R.wrong.slice(); R.wrong = []; R.qi = 0; R.stats = [0, 0, 0]; draw(); cueSpeak(); },
    pPlay() { if (R.playing) { stop(); draw(); } else { R.playing = true; if (R.i >= R.seq.length) R.i = 0; draw(); runPartner(); } },
    pRestart() { R.i = 0; R.stats = [0, 0, 0]; R.playing = true; draw(); runPartner(); },
    pDone() { if (R.release) { const f = R.release; R.release = null; R.cancels.splice(0).forEach(x => x()); f('done'); } },
    pPrev() { const was = R.playing; stop(); R.i = Math.max(0, R.i - 1); while (R.i > 0 && S.p.lines[R.seq[R.i]].t !== 'dlg') R.i--; R.playing = was; draw(); if (was) runPartner(); },
    pNext() { const was = R.playing; stop(); R.i = Math.min(R.seq.length, R.i + 1); R.playing = was; draw(); if (was) runPartner(); },
    pPeekCur() { R.revealCur = true; draw(); },
    pRec(el) { toggleRec(+el.dataset.i); },
    async pRecPlay(el) { const l = S.p.lines[+el.dataset.i]; const b = await DB.get('audio', recKey(S.p, l)); if (b) new Audio(URL.createObjectURL(b)).play(); },
    async pRecDel(el) { const l = S.p.lines[+el.dataset.i]; await DB.del('audio', recKey(S.p, l)); R.recs.delete(l.id); draw(); },
    pRecWhich(el) { O.recWhich = el.dataset.v; save(); draw(); },
    pTele() { teleToggle(); }
  };
  const CHG = {
    pRange(el) { O.range = el.value; save(); },
    pChk(el) { O[el.dataset.k] = el.checked; save(); },
    pRate(el) { O.rate = +el.value; save(); const v = $('#rateV'); if (v) v.textContent = O.rate.toFixed(2) + '×'; }
  };
  const INP = { pTs(el) { O.tspeed = +el.value; save(); const s = el.nextElementSibling; if (s) s.textContent = O.tspeed; } };

  document.addEventListener('keydown', e => {
    if (!R || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === 'Escape') { close(); return; }
    if (R.mode === 'partner' || R.mode === 'listen') {
      if (e.key === ' ') { e.preventDefault(); R.waiting && R.waiting !== 'mic' ? ACT.pDone() : ACT.pPlay(); }
      if (e.key === 'ArrowRight') ACT.pNext(); if (e.key === 'ArrowLeft') ACT.pPrev();
    }
    if (R.mode === 'cue') {
      if (e.key === ' ' && !R.shown) { e.preventDefault(); ACT.pShow(); }
      if (R.shown && ['1', '2', '3'].includes(e.key)) ACT.pRate({ dataset: { v: +e.key - 1 } });
      if (e.key.toLowerCase() === 'h' && !R.shown) ACT.pHint();
    }
    if (R.mode === 'tele' && e.key === ' ') { e.preventDefault(); teleToggle(); }
  });

  return {
    tabHTML, ACT, CHG, INP, stop: () => { if (R) close(); }, compare, mask,
    quickFrom(i) { const p = S.p; if (!myNames(p).length) { S.tab = 'prove'; renderTab(); toast('Scegli prima il tuo personaggio'); return; } open('partner', i); }
  };
})();
