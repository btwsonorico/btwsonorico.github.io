import { agisci, avanza, DT, inizioPremio, L, LIMITE, meta, N_AZIONI, nuovoMondo, OGNI, OSTACOLI, PECORE, premio, punteggi, RAGGIO, vedi, type Mondo, type Prima } from '../lib/gregge';

// Vista del gregge, dall'alto. Guarda: l'agente gioca con i pesi di una tappa del training. Gioca: il cane segue il puntatore, e l'AI ha già giocato lo stesso campo.
export type Tappa = { id: string; nome: string; nota: string; premio: string; caso?: boolean };
const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
const RECORD = 'misc-rl-record', RECORD_AI = 'misc-rl-record-ai', MIGLIORE_AI = 24.1, ORA_LENTO = 0.25;
const leggi = (k: string) => { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } };
const scriviR = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* niente */ } };
const orologio = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function monta(radice: HTMLElement, tappe: Tappa[]) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const scrivi = (el: Element, t: string) => { if (el.textContent !== t) el.textContent = t; };
  const FG = tono('--fg'), MUTED = tono('--muted'), LINE = tono('--line'), ARANCIO = tono('--arancio'), BLU = tono('--azzurro');
  const tela = $<HTMLCanvasElement>('.tela-gregge'), c = tela.getContext('2d')!, pannello = $<HTMLElement>('.pannello'), bussola = $<HTMLCanvasElement>('.bussola'), cb = bussola.getContext('2d')!;
  const stato = $<HTMLElement>('.stato'), letturaPremio = $<HTMLElement>('.lettura-premio'), notaTappa = $<HTMLElement>('.nota-tappa'), gioca = $<HTMLButtonElement>('.gioca'), guarda = $<HTMLButtonElement>('.guarda'), bestUomo = $<HTMLElement>('.best-uomo'), bestAI = $<HTMLElement>('.best-ai'), esito = $<HTMLElement>('.esito');
  const bottoni = radice.querySelectorAll<HTMLButtonElement>('[data-tappa]'), velocita = radice.querySelectorAll<HTMLButtonElement>('[data-vel]');
  const tagPunto = $<HTMLElement>('.tag-punto'), notaTel = $<HTMLElement>('.nota-tel');

  const pesi = new Map<string, Float32Array>();
  const carica = async (id: string) => {
    if (!pesi.has(id)) pesi.set(id, new Float32Array(await (await fetch(`/learn/gregge/${id}.bin`)).arrayBuffer()));
    return pesi.get(id)!;
  };
  let modo: 'guarda' | 'gioca' = 'guarda', tappa = tappe[tappe.length - 1]!, m: Mondo = nuovoMondo(semeNuovo()), passi = 0, prima: Prima = inizioPremio(m), totale = 0, ultimo = 0, chiuso = false;
  let vel = 1, resto = 0, oraPrima = performance.now(), visibile = false, sporco = true, spiegaEl: HTMLElement | null = null, sopra = false, px = 0, pz = 0, tempoAI: number | null = null, calcolo = 0;
  let pr = new Float64Array(N_AZIONI), riferimento = [1, 0], record = leggi(RECORD), recordAI = leggi(RECORD_AI) || MIGLIORE_AI;
  function semeNuovo() { return Math.floor(Math.random() * 1e9); }
  let seme = 0;

  const scegli = (u: Float64Array, caso: boolean, r: () => number) => {
    let mx = -Infinity, a = 0, tot = 0;
    for (let k = 0; k < N_AZIONI; k++) if (u[k]! > mx) { mx = u[k]!; a = k; }
    for (let k = 0; k < N_AZIONI; k++) { pr[k] = Math.exp(u[k]! - mx); tot += pr[k]!; }
    for (let k = 0; k < N_AZIONI; k++) pr[k] = pr[k]! / tot;
    if (caso) { let q = r(); a = 0; while (a < N_AZIONI - 1 && q >= pr[a]!) { q -= pr[a]!; a++; } }
    return a;
  };

  const azzera = (s: number) => { seme = s; m = nuovoMondo(s); passi = 0; prima = inizioPremio(m); totale = ultimo = 0; chiuso = false; resto = 0; pr.fill(1 / N_AZIONI); sporco = true; };
  const unPasso = () => {
    if (modo === 'gioca') {
      if (sopra) meta(m, px, pz);
    } else if (passi % OGNI === 0) {
      const p = pesi.get(tappa.id);
      if (p) {
        if (passi) { ultimo = premio(tappa.premio, prima, m); totale += ultimo; }
        const { o, dgx, dgz } = vedi(m), a = scegli(punteggi(p, o), !!tappa.caso, m.r);
        riferimento = [dgx, dgz];
        agisci(m, a, dgx, dgz);
      }
    }
    avanza(m);
    passi++;
  };

  // L'AI gioca lo stesso campo senza grafica, a piccoli pezzi, così la pagina non si blocca: è il tempo da battere
  function calcolaAI(s: number) {
    const id = ++calcolo, finale = tappe.find(t => t.premio === 'buono' && t.id === 'fine') ?? tappe[tappe.length - 1]!;
    tempoAI = null;
    carica(finale.id).then(p => {
      const a = nuovoMondo(s);
      const pezzo = () => {
        if (id !== calcolo) return;
        const fine = performance.now() + 8;
        while (!a.finito && a.tempo < LIMITE && performance.now() < fine) {
          const { o, dgx, dgz } = vedi(a), u = punteggi(p, o);
          let b = 0;
          for (let k = 1; k < N_AZIONI; k++) if (u[k]! > u[b]!) b = k;
          agisci(a, b, dgx, dgz);
          for (let k = 0; k < OGNI && !a.finito; k++) avanza(a);
        }
        if (a.finito || a.tempo >= LIMITE) {
          tempoAI = a.finito ? a.tempo : Infinity;
          if (a.finito && (!recordAI || a.tempo < recordAI)) { recordAI = a.tempo; scriviR(RECORD_AI, a.tempo); }
          scriviBest();
        } else setTimeout(pezzo, 0);
      };
      pezzo();
    });
  }
  const scriviBest = () => {
    scrivi(bestUomo, record ? orologio(record) : '-');
    scrivi(bestAI, recordAI ? orologio(recordAI) : '-');
    if (modo === 'gioca' && !chiuso) scrivi(esito, tempoAI === null ? 'the AI is playing this field...' : tempoAI === Infinity ? 'the AI did not finish this field' : `to beat on this field: ${orologio(tempoAI)}`);
  };

  // --- Disegno
  let W = 0, H = 0, Wp = 0;
  const piano = () => {
    const sinistra = innerWidth > 760 ? Wp + 16 : 0, libero = W - sinistra, S = Math.min(libero, H) / (2 * L + 0.4);
    return { S, cx: sinistra + libero / 2, cy: H / 2 };
  };
  function disegna() {
    const { S, cx, cy } = piano(), d = devicePixelRatio, X = (x: number) => cx + x * S, Y = (z: number) => cy + z * S;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, W, H);
    c.lineWidth = 1;
    // Il prato: griglia a filo, come gli altri piani
    c.save();
    c.beginPath(); c.arc(cx, cy, L * S, 0, Math.PI * 2); c.clip();
    c.strokeStyle = LINE;
    c.beginPath();
    for (let q = -L; q <= L; q += 1) { c.moveTo(X(q), Y(-L)); c.lineTo(X(q), Y(L)); c.moveTo(X(-L), Y(q)); c.lineTo(X(L), Y(q)); }
    c.stroke();
    c.restore();
    c.strokeStyle = LINE;
    c.beginPath(); c.arc(cx, cy, L * S, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = MUTED;
    c.beginPath();
    for (const o of OSTACOLI) { const r = Math.max(1.5, o.r * S); c.moveTo(X(o.x) + r, Y(o.z)); c.arc(X(o.x), Y(o.z), r, 0, Math.PI * 2); }
    c.stroke();
    c.fillStyle = MUTED;
    for (const v of m.mucche) c.fillRect(X(v.x) - 3, Y(v.z) - 2, 6, 4);
    // Il cerchio: tratteggiato, si accende man mano che le pecore entrano
    c.strokeStyle = MUTED;
    c.setLineDash([4, 4]);
    c.beginPath(); c.arc(X(m.gx), Y(m.gz), RAGGIO * S, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
    c.strokeStyle = FG;
    c.lineWidth = 2;
    c.beginPath(); c.arc(X(m.gx), Y(m.gz), RAGGIO * S, -Math.PI / 2, -Math.PI / 2 + (m.dentro / PECORE) * Math.PI * 2); c.stroke();
    c.lineWidth = 1;
    const lato = Math.max(2, S * 0.09);
    for (let i = 0; i < PECORE; i++) {
      c.fillStyle = Math.hypot(m.x[i]! - m.gx, m.z[i]! - m.gz) < RAGGIO ? BLU : FG;
      c.fillRect(X(m.x[i]!) - lato / 2, Y(m.z[i]!) - lato / 2, lato, lato);
    }
    // Il cane e la direzione che ha scelto
    const a = X(m.cane.x), b = Y(m.cane.z);
    c.strokeStyle = ARANCIO;
    c.beginPath(); c.moveTo(a, b); c.lineTo(X(m.cane.mx), Y(m.cane.mz)); c.stroke();
    c.fillStyle = ARANCIO;
    c.fillRect(a - 4, b - 4, 8, 8);
  }
  // Le nove mosse: quanto vuole ognuna adesso. "Avanti" è la direzione dal gregge al cerchio
  function disegnaBussola() {
    const d = devicePixelRatio, w = bussola.clientWidth, h = bussola.clientHeight;
    if (!w) return;
    if (bussola.width !== w * d || bussola.height !== h * d) { bussola.width = w * d; bussola.height = h * d; }
    cb.setTransform(d, 0, 0, d, 0, 0);
    cb.clearRect(0, 0, w, h);
    const R = Math.min(w, h) / 2 - 2, cx = w / 2, cy = h / 2, base = Math.atan2(riferimento[1]!, riferimento[0]!);
    cb.strokeStyle = LINE;
    cb.beginPath(); cb.arc(cx, cy, R, 0, Math.PI * 2); cb.stroke();
    cb.strokeStyle = ARANCIO;
    cb.lineWidth = 2;
    cb.beginPath();
    for (let a = 1; a < N_AZIONI; a++) {
      const t = base + ((a - 1) * Math.PI) / 4, l = Math.min(1, Math.sqrt(pr[a]!)) * R;
      cb.moveTo(cx, cy); cb.lineTo(cx + Math.cos(t) * l, cy + Math.sin(t) * l);
    }
    cb.stroke();
    cb.lineWidth = 1;
    cb.fillStyle = FG;
    const q = 2 + pr[0]! * 8;
    cb.fillRect(cx - q / 2, cy - q / 2, q, q);
  }

  // --- Comandi
  const mettiTappa = async (t: Tappa) => {
    calcolo++;
    tappa = t;
    modo = 'guarda';
    bottoni.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tappa === t.id)));
    scrivi(notaTappa, t.nota);
    scrivi(esito, '');
    await carica(t.id);
    azzera(seme || semeNuovo());
  };
  bottoni.forEach(b => b.addEventListener('click', () => mettiTappa(tappe.find(t => t.id === b.dataset.tappa)!)));
  const mettiVel = (n: number) => { vel = n; velocita.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.vel) === n))); };
  velocita.forEach(b => b.addEventListener('click', () => mettiVel(Number(b.dataset.vel))));
  gioca.addEventListener('click', () => {
    modo = 'gioca';
    azzera(semeNuovo());
    scrivi(gioca, 'new field');
    scrivi(notaTappa, '');
    bottoni.forEach(b => b.setAttribute('aria-pressed', 'false'));
    guarda.hidden = false;
    calcolaAI(seme);
    scriviBest();
    tela.style.cursor = 'none';
    // Solo mentre si gioca il dito guida il cane: altrimenti deve poter scorrere la pagina
    tela.style.touchAction = 'none';
  });
  // Lo stesso campo, con l'AI finale al comando
  guarda.addEventListener('click', () => { const s = seme; mettiTappa(tappe.find(t => t.id === 'fine') ?? tappe[tappe.length - 1]!).then(() => azzera(s)); tela.style.cursor = tela.style.touchAction = ''; });
  const alMondo = (e: PointerEvent) => { const { S, cx, cy } = piano(), q = tela.getBoundingClientRect(); px = (e.clientX - q.left - cx) / S; pz = (e.clientY - q.top - cy) / S; sopra = true; };
  tela.addEventListener('pointermove', alMondo);
  tela.addEventListener('pointerdown', alMondo);
  tela.addEventListener('pointerleave', () => { sopra = false; });

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
    if (matchMedia('(max-width: 760px)').matches) scrivi(notaTel, testo);
  };

  const fineGiro = () => {
    chiuso = true;
    if (modo === 'gioca') {
      tela.style.cursor = tela.style.touchAction = '';
      if (m.finito && (!record || m.tempo < record)) { record = m.tempo; scriviR(RECORD, m.tempo); }
      scriviBest();
      const io = m.finito ? m.tempo : Infinity;
      scrivi(esito, !m.finito ? 'time is up.' : tempoAI === null ? `your time: ${orologio(io)}` : io < tempoAI ? `you win. ${orologio(io)} against ${tempoAI === Infinity ? 'no finish' : orologio(tempoAI)}` : `the AI wins. ${orologio(tempoAI)} against your ${orologio(io)}`);
    } else {
      // Guarda: un altro campo dopo una pausa breve
      setTimeout(() => { if (modo === 'guarda' && chiuso) azzera(semeNuovo()); }, 1800);
    }
  };

  const misura = () => {
    W = tela.clientWidth; H = tela.clientHeight; Wp = innerWidth > 760 ? pannello.offsetWidth : 0;
    tela.width = W * devicePixelRatio; tela.height = H * devicePixelRatio;
    sporco = true;
  };
  new ResizeObserver(misura).observe(tela);
  new IntersectionObserver(v => { visibile = v.some(x => x.isIntersecting); if (visibile) sporco = true; }, { rootMargin: '60px' }).observe(tela);
  misura();
  mettiVel(1);
  scriviBest();
  scrivi(gioca, 'play');
  mettiTappa(tappa);

  const ciclo = (ora: number) => {
    requestAnimationFrame(ciclo);
    const dt = Math.min(ORA_LENTO, (ora - oraPrima) / 1000);
    oraPrima = ora;
    if (!visibile || !W) return;
    if (!chiuso) {
      resto += dt * (modo === 'gioca' ? 1 : vel);
      while (resto >= DT && !chiuso) {
        resto -= DT;
        unPasso();
        if (m.finito || m.tempo >= LIMITE) { fineGiro(); break; }
      }
      sporco = true;
      scrivi(stato, `${m.dentro}/${PECORE} inside · ${orologio(m.tempo)}`);
      scrivi(letturaPremio, modo === 'gioca' ? 'you are the agent: move the pointer' : `reward so far ${totale >= 0 ? '+' : ''}${totale.toFixed(2)}`);
    }
    aggiornaTag();
    if (sporco) { sporco = false; disegna(); disegnaBussola(); }
  };
  requestAnimationFrame(ciclo);
}
