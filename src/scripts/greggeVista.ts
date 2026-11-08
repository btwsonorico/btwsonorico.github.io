import { avanza, DT, L, LATO_MAPPA, LIMITE, meta, N_AZIONI, N_AZIONI_P, nuovoMondo, OGNI, OSTACOLI, PECORE, RAGGIO, scegli, type Mondo, type Tipo } from '../lib/gregge';
import { disegnaTestaCane } from './testaCane';

// Vista del gregge, in isometria: due prati, lo stesso campo, lo stesso orologio. Guarda: due policy a confronto. Gioca: tu a sinistra, l'AI a destra.
// Sui prati si vede quello che ogni cane legge: la differenza fra le due policy è tutta lì.
export type Tappa = { id: string; v: string; nome: string; nota: string; caso?: boolean };
export type Campo = { id: string; nome: string; seme: number; nota: string };
const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
const RECORD = 'misc-rl-record', RECORD_AI = 'misc-rl-record-ai';
const leggi = (k: string) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
const salva = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* niente */ } };
const orologio = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Prato = { m: Mondo; chi: Tipo | 'tu'; pesi: Float32Array | null; caso: boolean; passi: number; dgx: number; dgz: number; pr: Float64Array; storia: number[]; nome: string };

export function monta(radice: HTMLElement, tappe: Tappa[], campi: Campo[], migliorAI: number) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const scrivi = (el: Element, t: string) => { if (el.textContent !== t) el.textContent = t; };
  const FG = tono('--fg'), MUTED = tono('--muted'), LINE = tono('--line'), ARANCIO = tono('--arancio'), BLU = tono('--azzurro'), FONDO = tono('--bg') || '#0a0b0d';
  const tela = $<HTMLCanvasElement>('.tela-gregge'), c = tela.getContext('2d')!, pannello = $<HTMLElement>('.pannello'), bussola = $<HTMLCanvasElement>('.bussola'), cb = bussola.getContext('2d')!;
  const stato = $<HTMLElement>('.stato'), notaCampo = $<HTMLElement>('.nota-campo'), gioca = $<HTMLButtonElement>('.gioca'), pausa = $<HTMLButtonElement>('.pausa'), unPasso = $<HTMLButtonElement>('.un-passo'), vede = $<HTMLButtonElement>('.vede'), bestUomo = $<HTMLElement>('.best-uomo'), bestAI = $<HTMLElement>('.best-ai'), esito = $<HTMLElement>('.esito'), tagPunto = $<HTMLElement>('.tag-punto'), notaTel = $<HTMLElement>('.nota-tel');
  const bottoniCampo = radice.querySelectorAll<HTMLButtonElement>('[data-campo]'), bottoniTappa = radice.querySelectorAll<HTMLButtonElement>('[data-tappa]'), velocita = radice.querySelectorAll<HTMLButtonElement>('[data-vel]');

  const pesi = new Map<string, Float32Array>();
  const carica = async (id: string) => {
    if (!pesi.has(id)) pesi.set(id, new Float32Array(await (await fetch(`/learn/gregge/${id}.bin`)).arrayBuffer()));
    return pesi.get(id)!;
  };
  const prato = (m: Mondo, chi: Prato['chi'], p: Float32Array | null, nome: string, caso = false): Prato => ({ m, chi, pesi: p, caso, passi: 0, dgx: 1, dgz: 0, pr: new Float64Array(N_AZIONI_P).fill(1 / N_AZIONI_P), storia: [0], nome });
  let prati: Prato[] = [], modo: 'guarda' | 'gioca' = 'guarda', seme = Math.floor(Math.random() * 1e9), campo: Campo | null = null, tappa = tappe[tappe.length - 1]!, fermo = false, chiuso = false, attesa = 0, vel = 1, resto = 0, oraPrima = performance.now(), visibile = false, sporco = true;
  let spiegaEl: HTMLElement | null = null, sopra = false, px = 0, pz = 0, vista = true, record = leggi(RECORD), recordAI = leggi(RECORD_AI) || migliorAI, sasso: { x: number; z: number; t: number } | null = null;

  const scriviBest = () => { scrivi(bestUomo, record ? orologio(record) : '-'); scrivi(bestAI, recordAI ? orologio(recordAI) : '-'); };
  const parti = async () => {
    // Le due policy alla stessa tappa del loro training: v per la prima, m per la seconda
    const ultima = tappe[tappe.length - 1]!, t = modo === 'gioca' ? ultima : tappa, dopo = t.id === ultima.id ? '' : ` · ${t.nome}`;
    const [v1, m2] = await Promise.all([carica(t.v), carica(t.id)]);
    prati = modo === 'gioca'
      ? [prato(nuovoMondo(seme), 'tu', null, 'you'), prato(nuovoMondo(seme), 'P', m2, 'the AI')]
      : [prato(nuovoMondo(seme), 'v1', v1, `policy 1: 18 numbers${dopo}`, !!t.caso), prato(nuovoMondo(seme), 'P', m2, `policy 2: 18 numbers + 2 maps${dopo}`, !!t.caso)];
    chiuso = false; attesa = 0; resto = 0; sporco = true;
    scrivi(esito, '');
    scriviBest();
  };
  const passoPrato = (q: Prato) => {
    if (q.m.finito || q.m.tempo >= LIMITE) return;
    if (q.chi === 'tu') { if (sopra) meta(q.m, px, pz); }
    else if (q.passi % OGNI === 0 && q.pesi) { const s = scegli(q.chi, q.pesi, q.m, q.pr, q.caso); q.dgx = s.dgx; q.dgz = s.dgz; }
    avanza(q.m);
    q.passi++;
    if (q.passi % 15 === 0) q.storia.push(q.m.dentro);
  };
  const finito = (q: Prato) => q.m.finito || q.m.tempo >= LIMITE;
  const chiudi = () => {
    chiuso = true;
    if (modo === 'gioca') {
      tela.style.cursor = tela.style.touchAction = '';
      const [io, ai] = prati as [Prato, Prato];
      if (io.m.finito && (!record || io.m.tempo < record)) { record = io.m.tempo; salva(RECORD, record); }
      if (ai.m.finito && (!recordAI || ai.m.tempo < recordAI)) { recordAI = ai.m.tempo; salva(RECORD_AI, recordAI); }
      scriviBest();
      scrivi(esito, !io.m.finito ? 'Time is up for you.' : !ai.m.finito || io.m.tempo < ai.m.tempo ? `You win: ${orologio(io.m.tempo)}${ai.m.finito ? ` against ${orologio(ai.m.tempo)}` : ''}.` : `The AI wins: ${orologio(ai.m.tempo)} against ${orologio(io.m.tempo)}.`);
    } else attesa = 3;
  };

  // --- Disegno
  let W = 0, H = 0, Wp = 0, largo = true;
  const CURVA = 64, TITOLO = 18;
  // I due prati stanno affiancati o uno sopra l'altro: si sceglie la disposizione che li fa più grandi
  const scala = (w: number, h: number) => Math.min(w / (2 * L + 0.6), (h - TITOLO) / (L + 1.2));
  const riquadri = () => {
    const sinistra = largo ? Wp + 16 : 0, libero = W - sinistra, alto = H - CURVA - 8;
    const accanto = scala(libero / 2 - 6, alto), sopra = scala(libero, alto / 2 - 4);
    return accanto >= sopra
      ? [{ x: sinistra, y: 0, w: libero / 2 - 6, h: alto }, { x: sinistra + libero / 2 + 6, y: 0, w: libero / 2 - 6, h: alto }]
      : [{ x: sinistra, y: 0, w: libero, h: alto / 2 - 4 }, { x: sinistra, y: alto / 2 + 4, w: libero, h: alto / 2 - 4 }];
  };
  // Isometria: il prato è girato di 45 gradi e schiacciato a metà in altezza; h alza un punto dal suolo
  const K = Math.SQRT1_2;
  const geometria = (r: { x: number; y: number; w: number; h: number }) => {
    const S = scala(r.w, r.h);
    return { S, cx: r.x + r.w / 2, cy: r.y + TITOLO + (r.h - TITOLO) / 2 + S * 0.3 };
  };
  function disegnaPrato(q: Prato, r: ReturnType<typeof riquadri>[number]) {
    const { S, cx, cy } = geometria(r), { m } = q, d = devicePixelRatio;
    const sx = (x: number, z: number) => cx + (x - z) * S * K, sy = (x: number, z: number, h = 0) => cy + (x + z) * S * K * 0.5 - h * S * 0.8;
    // Il suolo si disegna con le coordinate del prato: la trasformazione fa il resto (i cerchi diventano ellissi)
    const suolo = () => c.setTransform(d * S * K, d * S * K * 0.5, -d * S * K, d * S * K * 0.5, d * cx, d * cy);
    const schermo = () => c.setTransform(d, 0, 0, d, 0, 0);
    const px = 1 / (S * K);
    schermo();
    c.fillStyle = FG;
    c.font = `12px ${stile.getPropertyValue('--mono') || 'monospace'}`;
    c.textAlign = 'left';
    c.fillText(q.nome, r.x, r.y + 12);
    c.textAlign = 'right';
    c.fillText(`${m.dentro}/${PECORE} · ${orologio(m.tempo)}${m.finito ? ' · done' : ''}`, r.x + r.w, r.y + 12);
    // Lo spessore del prato: il bordo di sotto e i due fianchi, come una zolla
    const zolla = S * 0.35;
    c.strokeStyle = LINE; c.lineWidth = 1;
    c.beginPath(); c.ellipse(cx, cy + zolla, L * S, L * S * 0.5, 0, 0, Math.PI); c.moveTo(cx - L * S, cy); c.lineTo(cx - L * S, cy + zolla); c.moveTo(cx + L * S, cy); c.lineTo(cx + L * S, cy + zolla); c.stroke();
    suolo();
    c.lineWidth = px;
    c.save();
    c.beginPath(); c.arc(0, 0, L, 0, Math.PI * 2); c.clip();
    c.strokeStyle = LINE;
    c.beginPath();
    for (let v = -L; v <= L; v += 2) { c.moveTo(v, -L); c.lineTo(v, L); c.moveTo(-L, v); c.lineTo(L, v); }
    c.stroke();
    // Quello che la policy legge: per la seconda, due mappe intorno al cane, girate come le legge lei: le pecore fuori e quelle dentro
    if (vista && q.chi === 'P') {
      const u = [q.dgx, q.dgz], w = [-q.dgz, q.dgx], meta0 = LATO_MAPPA / 2;
      for (const dentro of [false, true]) {
      const conte = new Float32Array(LATO_MAPPA * LATO_MAPPA);
      for (let i = 0; i < PECORE; i++) {
        if ((Math.hypot(m.x[i]! - m.gx, m.z[i]! - m.gz) < RAGGIO) !== dentro) continue;
        const dx = m.x[i]! - m.cane.x, dz = m.z[i]! - m.cane.z, a = Math.max(0, Math.min(LATO_MAPPA - 1, Math.floor(dx * u[0]! + dz * u[1]! + meta0))), b = Math.max(0, Math.min(LATO_MAPPA - 1, Math.floor(dx * w[0]! + dz * w[1]! + meta0)));
        conte[a * LATO_MAPPA + b] = conte[a * LATO_MAPPA + b]! + 1;
      }
      const angolo = (a: number, b: number) => [m.cane.x + (a - meta0) * u[0]! + (b - meta0) * w[0]!, m.cane.z + (a - meta0) * u[1]! + (b - meta0) * w[1]!] as const;
      for (let a = 0; a < LATO_MAPPA; a++) for (let b = 0; b < LATO_MAPPA; b++) {
        const v = conte[a * LATO_MAPPA + b]!;
        if (!v) continue;
        c.globalAlpha = Math.min(0.55, 0.14 + v * 0.03);
        c.fillStyle = dentro ? BLU : ARANCIO;
        c.beginPath();
        c.moveTo(...angolo(a, b)); c.lineTo(...angolo(a + 1, b)); c.lineTo(...angolo(a + 1, b + 1)); c.lineTo(...angolo(a, b + 1));
        c.closePath(); c.fill();
      }
      }
      c.globalAlpha = 1;
    }
    c.restore();
    c.lineWidth = px;
    c.strokeStyle = LINE;
    c.beginPath(); c.arc(0, 0, L, 0, Math.PI * 2); c.stroke();
    c.setLineDash([4 * px, 4 * px]);
    c.strokeStyle = MUTED;
    c.beginPath(); c.arc(m.gx, m.gz, RAGGIO, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
    c.strokeStyle = FG;
    c.lineWidth = 2 * px;
    c.beginPath(); c.arc(m.gx, m.gz, RAGGIO, -Math.PI / 2, -Math.PI / 2 + (m.dentro / PECORE) * Math.PI * 2); c.stroke();
    c.lineWidth = px;
    // I numeri che leggono tutte e due: il centro del gregge e la pecora più lontana
    let cxG = 0, czG = 0, n = 0, far = -1, fd = -1;
    for (let i = 0; i < PECORE; i++) if (Math.hypot(m.x[i]! - m.gx, m.z[i]! - m.gz) >= RAGGIO) { cxG += m.x[i]!; czG += m.z[i]!; n++; }
    if (vista && q.chi !== 'tu' && n) {
      cxG /= n; czG /= n;
      for (let i = 0; i < PECORE; i++) if (Math.hypot(m.x[i]! - m.gx, m.z[i]! - m.gz) >= RAGGIO) { const dd = (m.x[i]! - cxG) ** 2 + (m.z[i]! - czG) ** 2; if (dd > fd) { fd = dd; far = i; } }
      c.strokeStyle = ARANCIO;
      c.setLineDash([3 * px, 3 * px]);
      c.beginPath(); c.moveTo(m.cane.x, m.cane.z); c.lineTo(cxG, czG); c.moveTo(cxG, czG); c.lineTo(m.x[far]!, m.z[far]!); c.stroke();
      c.setLineDash([]);
      c.fillStyle = ARANCIO;
      c.beginPath(); c.arc(cxG, czG, 3 * px, 0, Math.PI * 2); c.fill();
    }
    if (sasso) {
      c.strokeStyle = FG;
      c.globalAlpha = Math.max(0, sasso.t);
      c.beginPath(); c.arc(sasso.x, sasso.z, (1.8 - sasso.t) * 0.9, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 1;
    }
    // L'ombra del cane a terra
    c.fillStyle = LINE;
    c.beginPath(); c.arc(m.cane.x, m.cane.z, 0.16, 0, Math.PI * 2); c.fill();
    schermo();
    // Sopra il suolo, in ordine di profondità: chi è più vicino copre chi è dietro
    const cose: [number, () => void][] = [];
    for (const o of OSTACOLI) {
      const x = sx(o.x, o.z), y = sy(o.x, o.z), alto = (0.25 + o.r) * S * 0.8;
      cose.push([o.x + o.z, () => { c.strokeStyle = MUTED; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - alto); c.stroke(); c.beginPath(); c.ellipse(x, y - alto, Math.max(1.5, o.r * S * 0.8), Math.max(1, o.r * S * 0.5), 0, 0, Math.PI * 2); c.stroke(); }]);
    }
    for (const v of m.mucche) { const x = sx(v.x, v.z), y = sy(v.x, v.z, 0.12); cose.push([v.x + v.z, () => { c.fillStyle = MUTED; c.fillRect(x - 3, y - 2, 6, 4); }]); }
    const lato = Math.max(2, S * 0.11);
    for (let i = 0; i < PECORE; i++) {
      const x = m.x[i]!, z = m.z[i]!, fuori = Math.hypot(x - m.gx, z - m.gz) >= RAGGIO, X = sx(x, z), Y = sy(x, z, 0.07);
      cose.push([x + z, () => { c.fillStyle = fuori ? FG : BLU; c.beginPath(); c.ellipse(X, Y, lato * 0.62, lato * 0.42, 0, 0, Math.PI * 2); c.fill(); }]);
    }
    { const X = sx(m.cane.x, m.cane.z), Y = sy(m.cane.x, m.cane.z, 0.12); cose.push([m.cane.x + m.cane.z + 0.01, () => disegnaTestaCane(c, X, Y + 2, 1, d, ARANCIO, FONDO)]); }
    cose.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  }
  function disegnaCurva() {
    const x0 = largo ? Wp + 16 + 28 : 28, w = W - x0, y0 = H - CURVA + 4, h = CURVA - 18, durata = Math.max(60, ...prati.map(q => q.m.tempo)), Y = (v: number) => y0 + h - (v / PECORE) * h;
    c.font = `11px ${stile.getPropertyValue('--mono') || 'monospace'}`;
    c.fillStyle = MUTED;
    c.textAlign = 'right';
    c.fillText('180', x0 - 4, y0 + 8);
    c.fillText('0', x0 - 4, y0 + h);
    c.textAlign = 'left';
    c.fillText('sheep inside, over time', x0, H - 2);
    c.textAlign = 'right';
    c.fillText(orologio(durata), x0 + w, H - 2);
    c.strokeStyle = LINE;
    c.beginPath(); c.moveTo(x0, Y(0)); c.lineTo(x0 + w, Y(0)); c.moveTo(x0, Y(PECORE)); c.lineTo(x0 + w, Y(PECORE)); c.stroke();
    prati.forEach((q, k) => {
      c.strokeStyle = k ? BLU : FG;
      c.lineWidth = 1.5;
      c.beginPath();
      q.storia.forEach((v, i) => { const x = x0 + ((i * 15 * DT) / durata) * w; if (i) c.lineTo(x, Y(v)); else c.moveTo(x, Y(v)); });
      c.stroke();
      c.lineWidth = 1;
    });
  }
  function disegna() {
    const d = devicePixelRatio;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, W, H);
    const r = riquadri();
    prati.forEach((q, k) => disegnaPrato(q, r[k]!));
    c.setTransform(d, 0, 0, d, 0, 0);
    if (prati.length) disegnaCurva();
    disegnaBussola();
  }
  // La bussola: quanto la seconda policy vuole ogni mossa adesso. Il quadrato al centro è stare fermo
  function disegnaBussola() {
    const q = prati.find(p => p.chi === 'P');
    const d = devicePixelRatio, w = bussola.clientWidth, h = bussola.clientHeight;
    if (!w || !q) return;
    if (bussola.width !== w * d || bussola.height !== h * d) { bussola.width = w * d; bussola.height = h * d; }
    cb.setTransform(d, 0, 0, d, 0, 0);
    cb.clearRect(0, 0, w, h);
    const R = Math.min(w, h) / 2 - 2, cx = w / 2, cy = h / 2, base = Math.atan2(q.dgz, q.dgx);
    cb.strokeStyle = LINE;
    cb.beginPath(); cb.arc(cx, cy, R, 0, Math.PI * 2); cb.stroke();
    cb.strokeStyle = ARANCIO;
    cb.lineWidth = 2;
    cb.beginPath();
    for (let a = 1; a < N_AZIONI; a++) { const t = base + ((a - 1) * Math.PI) / 4, l = Math.min(1, Math.sqrt(q.pr[a]! + q.pr[a + 8]!)) * R; cb.moveTo(cx, cy); cb.lineTo(cx + Math.cos(t) * l, cy + Math.sin(t) * l); }
    cb.stroke();
    cb.lineWidth = 1;
    cb.fillStyle = FG;
    const s = 2 + q.pr[0]! * 8;
    cb.fillRect(cx - s / 2, cy - s / 2, s, s);
  }

  // --- Comandi
  const segnaPressati = () => {
    bottoniCampo.forEach(b => b.setAttribute('aria-pressed', String(modo === 'guarda' && (campo ? b.dataset.campo === campo.id : b.dataset.campo === 'nuovo'))));
    bottoniTappa.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tappa === tappa.id)));
    pausa.setAttribute('aria-pressed', String(fermo));
    scrivi(pausa, fermo ? 'play' : 'pause');
    vede.setAttribute('aria-pressed', String(vista));
  };
  const mettiCampo = (id: string) => {
    modo = 'guarda'; tela.style.cursor = 'crosshair'; tela.style.touchAction = '';
    campo = campi.find(q => q.id === id) ?? null;
    seme = campo ? campo.seme : Math.floor(Math.random() * 1e9);
    scrivi(notaCampo, campo ? campo.nota : tappa.nota);
    scrivi(gioca, 'play');
    fermo = false;
    segnaPressati();
    parti();
  };
  bottoniCampo.forEach(b => b.addEventListener('click', () => mettiCampo(b.dataset.campo!)));
  bottoniTappa.forEach(b => b.addEventListener('click', () => { tappa = tappe.find(t => t.id === b.dataset.tappa)!; modo = 'guarda'; scrivi(notaCampo, tappa.nota); scrivi(gioca, 'play'); fermo = false; segnaPressati(); parti(); }));
  velocita.forEach(b => b.addEventListener('click', () => { vel = Number(b.dataset.vel); velocita.forEach(q => q.setAttribute('aria-pressed', String(q === b))); }));
  pausa.addEventListener('click', () => { fermo = !fermo; segnaPressati(); });
  unPasso.addEventListener('click', () => { fermo = true; segnaPressati(); for (let k = 0; k < OGNI; k++) prati.forEach(passoPrato); sporco = true; });
  vede.addEventListener('click', () => { vista = !vista; segnaPressati(); sporco = true; });
  gioca.addEventListener('click', () => {
    modo = 'gioca'; campo = null; fermo = false;
    seme = Math.floor(Math.random() * 1e9);
    scrivi(gioca, 'new field');
    scrivi(notaCampo, 'You on the left, the AI on the right: same field, same sheep. Move the pointer and the dog follows it.');
    tela.style.cursor = 'none'; tela.style.touchAction = 'none';
    segnaPressati();
    parti();
  });
  const alMondo = (e: PointerEvent, k: number) => {
    const q = tela.getBoundingClientRect(), { S, cx, cy } = geometria(riquadri()[k]!);
    const a = (e.clientX - q.left - cx) / (S * K), b = (e.clientY - q.top - cy) / (S * K * 0.5);
    return [(a + b) / 2, (b - a) / 2] as const;
  };
  const sulPrato = (e: PointerEvent) => {
    const q = tela.getBoundingClientRect(), x = e.clientX - q.left, y = e.clientY - q.top;
    return riquadri().findIndex(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  };
  tela.addEventListener('pointermove', e => { if (modo === 'gioca') { const k = sulPrato(e); sopra = k === 0; if (k === 0) [px, pz] = alMondo(e, 0); } });
  tela.addEventListener('pointerleave', () => { sopra = false; });
  // Il sasso: nello stesso punto di tutti e due i prati, così si vede quale policy regge meglio
  tela.addEventListener('pointerdown', e => {
    const k = sulPrato(e);
    if (k < 0) return;
    if (modo === 'gioca') { sopra = k === 0; if (k === 0) [px, pz] = alMondo(e, 0); return; }
    const [x, z] = alMondo(e, k);
    if (Math.hypot(x, z) > L) return;
    sasso = { x, z, t: 1 };
    for (const q of prati) for (let i = 0; i < PECORE; i++) {
      const dx = q.m.x[i]! - x, dz = q.m.z[i]! - z, d = Math.hypot(dx, dz) || 1;
      if (d < 1.8) { q.m.vx[i] = q.m.vx[i]! + (dx / d) * 1.1; q.m.vz[i] = q.m.vz[i]! + (dz / d) * 1.1; q.m.calma[i] = 0; }
    }
    sporco = true;
  });

  radice.addEventListener('pointerover', e => { spiegaEl = (e.target as Element).closest?.('[data-spiega]') as HTMLElement | null; });
  radice.addEventListener('pointerleave', () => { spiegaEl = null; });
  const aggiornaTag = () => {
    const testo = spiegaEl?.dataset.spiega ?? '';
    tagPunto.hidden = !testo;
    if (testo) {
      scrivi(tagPunto, testo);
      const q = spiegaEl!.getBoundingClientRect(), dx = spiegaEl!.closest('.pannello') ? pannello.getBoundingClientRect().right : q.right, w = tagPunto.offsetWidth, h = tagPunto.offsetHeight, x = dx + 10 + w < innerWidth - 8 ? dx + 10 : Math.max(8, q.left - w - 10), y = Math.max(8, Math.min(innerHeight - h - 8, (q.top + q.bottom) / 2 - h / 2));
      tagPunto.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }
    if (!largo) scrivi(notaTel, testo);
  };

  const misura = () => {
    largo = innerWidth > 760;
    W = tela.clientWidth; H = tela.clientHeight; Wp = largo ? pannello.offsetWidth : 0;
    tela.width = W * devicePixelRatio; tela.height = H * devicePixelRatio;
    sporco = true;
  };
  new ResizeObserver(misura).observe(tela);
  new IntersectionObserver(v => { visibile = v.some(x => x.isIntersecting); if (visibile) sporco = true; }, { rootMargin: '60px' }).observe(tela);
  misura();
  tela.style.cursor = 'crosshair';
  velocita.forEach(q => q.setAttribute('aria-pressed', String(q.dataset.vel === '1')));
  scrivi(gioca, 'play');
  scrivi(notaCampo, tappa.nota);
  fermo = calmo;
  segnaPressati();
  scriviBest();
  parti();

  const ciclo = (ora: number) => {
    requestAnimationFrame(ciclo);
    const dt = Math.min(0.25, (ora - oraPrima) / 1000);
    oraPrima = ora;
    if (!visibile || !W || !prati.length) return;
    if (sasso) { sasso.t -= dt * 1.2; if (sasso.t <= 0) sasso = null; sporco = true; }
    if (!fermo && !chiuso) {
      resto += dt * (modo === 'gioca' ? 1 : vel);
      while (resto >= DT && !chiuso) {
        resto -= DT;
        prati.forEach(passoPrato);
        // In gara si chiude solo quando hanno finito tutti e due
        if (prati.every(finito)) chiudi();
      }
      sporco = true;
    }
    if (chiuso && modo === 'guarda') { attesa -= dt; if (attesa <= 0) { if (!campo) seme = Math.floor(Math.random() * 1e9); parti(); } }
    scrivi(stato, modo === 'gioca' ? 'you are the policy' : fermo ? 'paused' : 'click a meadow to throw a stone');
    aggiornaTag();
    if (sporco) { sporco = false; disegna(); tela.dataset.partita = prati.map(q => `${q.m.dentro}/${PECORE} ${q.m.tempo.toFixed(1)}s`).join(', '); }
  };
  requestAnimationFrame(ciclo);
}
