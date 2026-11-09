import { carica, decidi, etichette, parole, type Decisore, type Meta } from '../lib/decisore';
import { AGISCI, applica, dividi, INTENTI, leggi, NOMI, QUANTI, statoIniziale, type Etichette, type Passo, type Stanza, type Stato } from '../lib/casa';
import { montaCasa, type Vista } from './casaScena';

// Vista dei decision model. In cima la casa: un comando in inglese o in italiano passa per quattro decisioni (lingua, intento,
// quanto spingere, etichetta di ogni parola) e la casa fa quello che il modello ha scelto. Sotto, lo stesso modello sceglie fra
// risposte scritte da chi guarda (src/pages/learn/decision.astro, PROVE). Le risposte possibili sono testo: cambiano da un compito all'altro.

const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
const COLORE_TAG: Record<string, string> = { STANZA: '--arancio', COLORE: '--azzurro', NUMERO: '--verde' };
const pc = (p: number) => `${Math.round(p * 100)}%`;
const crea = <K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, testo?: string) => { const e = document.createElement(tag); if (classe) e.className = classe; if (testo !== undefined) e.textContent = testo; return e; };

function barra(contenitore: HTMLElement, colore = tono('--arancio')) {
  const r = crea('div', 'barra-voce'), n = crea('span', 'nome'), tr = crea('div', 'traccia'), pieno = crea('div', 'pieno'), num = crea('span', 'num');
  pieno.style.background = colore; tr.append(pieno); r.append(n, tr, num); contenitore.append(r);
  return { n, pieno, num };
}
// Il pulsante a caso: una frase dal set, mai la stessa due volte di fila
function aCaso(pulsante: HTMLButtonElement, area: HTMLTextAreaElement, dopo: () => void) {
  const frasi = JSON.parse(pulsante.dataset.frasi ?? '[]') as string[];
  pulsante.addEventListener('click', () => { let f = area.value; while (f === area.value && frasi.length > 1) f = frasi[Math.floor(Math.random() * frasi.length)]!; area.value = f; dopo(); });
}

// --- La casa
function montaCasaVista(radice: HTMLElement, d: Decisore) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const et: Etichette = { casa: etichette(d, d.meta.compiti.casa!.etichette), lingua: etichette(d, d.meta.compiti.lingua!.etichette), quanto: etichette(d, d.meta.compiti.quanto!.etichette) };
  const area = $<HTMLTextAreaElement>('.comando'), risposte = $<HTMLElement>('.ultima');
  let stato: Stato = statoIniziale(), dove: Stanza = 'soggiorno', ultimo: string | null = null;
  const storia: Stato[] = [];
  // Un clic su una stanza la sceglie: i comandi senza stanza vanno lì. Si vede dal bordo arancio del pavimento
  const vista: Vista = montaCasa($<HTMLElement>('.scena-casa'), $<HTMLElement>('.etichette'), s => { dove = s; vista.dove(s); if (document.activeElement !== area) vista.fuoco(s, 6); });
  vista.imposta(stato);

  // All'apertura la casella ha un comando a caso, non ancora mandato: lo mandi con send, o lo cambi
  const tastoCaso = $<HTMLButtonElement>('.a-caso'), frasi = JSON.parse(tastoCaso.dataset.frasi ?? '[]') as string[];
  if (frasi.length) area.value = frasi[Math.floor(Math.random() * frasi.length)]!;
  // Il cursore nella casella alza il tetto e mostra la casa da vicino; fuori dalla casella il tetto si richiude
  area.addEventListener('focus', () => vista.scrive(true));
  area.addEventListener('blur', () => vista.scrive(false));
  // Col mouse, un clic sulla casa, su send o sugli esempi non toglie il cursore dalla casella: il tetto resta alzato
  const conMouse = window.matchMedia('(hover: hover)').matches;
  for (const q of ['.scena-casa', '.invia', '.a-caso', '.esempi']) $<HTMLElement>(q).addEventListener('mousedown', e => { if (conMouse && document.activeElement === area) e.preventDefault(); });
  // Gli esempi scrivono la frase nella casella, senza mandarla
  radice.querySelectorAll<HTMLButtonElement>('.esempio').forEach(b => b.addEventListener('click', () => { area.value = b.textContent ?? ''; area.focus(); leggiOra(); }));

  // Mentre scrivi il modello legge già, come i modelli della banca e dell'assistente qui sotto: per ogni pezzo del comando,
  // le tre risposte più probabili e le parole accese quanto contano per la scelta. Una parola conta quanto la scelta scende
  // se la togli. La casa non fa niente finché non premi send
  const vivo = $<HTMLElement>('.dal-vivo'), cc = d.meta.compiti.casa!, cl = d.meta.compiti.lingua!;
  function leggiOra() {
    const pezzi = dividi(area.value).slice(0, 4);
    if (!pezzi.length) { vivo.replaceChildren(); return; }
    vivo.replaceChildren(crea('p', 'titoletto', 'live, before you send: what the model reads'));
    for (const pz of pezzi) {
      const ws = parole(pz), p = decidi(d, ws, et.casa, cc.temperatura), ordine = p.map((_, k) => k).sort((a, b) => p[b]! - p[a]!), prima = ordine[0]!;
      const pl = decidi(d, ws, et.lingua, cl.temperatura), lingua = d.meta.nomi.lingua![pl.indexOf(Math.max(...pl))] === 'it' ? 'it' : 'en';
      const riga = crea('p', 'parole');
      ws.forEach((w, i) => {
        const sp = crea('span', '', w);
        if (ws.length > 1) {
          const senza = decidi(d, ws.filter((_, k) => k !== i), et.casa, cc.temperatura)[prima]!, peso = Math.max(0, Math.min(1, (p[prima]! - senza) / Math.max(0.05, p[prima]!)));
          if (peso > 0.12) { sp.style.color = tono('--arancio'); sp.style.opacity = String(0.45 + peso * 0.55); }
        }
        riga.append(i ? ' ' : '', sp);
      });
      const barre = crea('div', 'barre');
      ordine.slice(0, 3).forEach((k, j) => { const nome = d.meta.nomi.casa![k]!, b = barra(barre, j ? tono('--muted') : tono('--arancio')); b.n.textContent = INTENTI[nome]?.[lingua] ?? nome; b.pieno.style.width = pc(p[k]!); b.num.textContent = pc(p[k]!); });
      vivo.append(riga, barre);
    }
  }
  let attesa = 0;
  area.addEventListener('input', () => { clearTimeout(attesa); attesa = window.setTimeout(leggiOra, 80); });
  leggiOra();

  // Sotto la casella resta sempre l'ultimo comando: per ogni pezzo, le parole, la scelta del modello e le due alternative con
  // le percentuali, la decisione e la risposta della casa. Se il modello chiede, i tasti della scelta stanno anche qui.
  // Sopra le barre, la lingua e quanto spingere. Non c'è una history: si vede solo l'ultimo comando
  function riassumi(gruppo: HTMLElement) {
    risposte.replaceChildren(crea('p', 'detto', `> ${gruppo.dataset.testo}`));
    gruppo.querySelectorAll<HTMLElement>('.passo').forEach(a => {
      const pezzo = crea('div', `pezzo ${[...a.classList].filter(c => c !== 'passo').join(' ')}`);
      for (const q of ['.frase', '.chip', '.barre', '.decisione']) { const x = a.querySelector(q); if (x) pezzo.append(x.cloneNode(true)); }
      const testo = a.querySelector('.risposta')?.textContent;
      if (testo) pezzo.append(crea('p', a.classList.contains('niente') || a.classList.contains('rifiuta') ? 'risposta niente' : 'risposta', testo));
      const scelte = a.querySelector('.scelte');
      if (scelte) { const copia = crea('div', 'scelte'); scelte.querySelectorAll('button').forEach(b => { const c = crea('button', '', b.textContent ?? ''); c.type = 'button'; c.addEventListener('click', () => { b.click(); riassumi(gruppo); }); copia.append(c); }); pezzo.append(copia); }
      risposte.append(pezzo);
    });
  }

  function esegui(q: Passo, scheda: HTMLElement) {
    const e = applica(stato, q, dove, storia, performance.now() / 1000);
    stato = e.stato; vista.imposta(stato);
    vista.comando(q.intento, e.fuoco, e.fatto);
    if (e.fatto && q.intento !== 'annulla') ultimo = q.intento;
    scheda.querySelector('.risposta')!.textContent = e.messaggio;
    scheda.classList.toggle('niente', !e.fatto);
  }

  function scheda(q: Passo) {
    const s = crea('article', `passo ${q.decisione}`);
    // Le parole, colorate dall'etichetta che il modello ha dato a ognuna
    const frase = crea('p', 'frase');
    q.ws.forEach((w, i) => { const sp = crea('span', '', w); const c = COLORE_TAG[q.etichette[i]!]; if (c) { sp.style.color = tono(c); sp.title = q.etichette[i]!.toLowerCase(); } frase.append(i ? ' ' : '', sp); });
    const chip = crea('p', 'chip', `${q.lingua === 'en' ? 'english' : 'italiano'} ${pc(q.pLingua)}${q.dosabile && q.decisione !== 'rifiuta' ? ` · ${q.lingua === 'en' ? 'how much' : 'quanto'}: ${QUANTI[q.quanto][q.lingua]} ${pc(q.pQuanto)}` : ''}`);
    const barre = crea('div', 'barre');
    q.prime.forEach((x, k) => { const b = barra(barre, k ? tono('--muted') : tono('--arancio')); b.n.textContent = INTENTI[x.nome]?.[q.lingua] ?? x.nome; b.pieno.style.width = pc(x.p); b.num.textContent = pc(x.p); });
    const decisione = crea('p', 'decisione', q.ripreso ? `${q.lingua === 'en' ? 'same as before' : 'come prima'}: ${INTENTI[q.intento]?.[q.lingua]}` : q.decisione === 'agisci' ? (q.lingua === 'en' ? 'acts' : 'agisce') : q.decisione === 'chiedi' ? (q.lingua === 'en' ? 'not sure, asks' : 'non è sicuro, chiede') : q.decisione === 'contesto' ? (q.lingua === 'en' ? 'context only, nothing to do' : 'solo contesto, niente da fare') : (q.lingua === 'en' ? 'refuses' : 'rifiuta'));
    const risposta = crea('p', 'risposta');
    s.append(frase, chip, barre, decisione, risposta);
    if (q.decisione === 'agisci') esegui(q, s);
    else if (q.decisione === 'chiedi') {
      risposta.textContent = q.lingua === 'en' ? 'Did you mean:' : 'Intendevi:';
      const scelte = crea('div', 'scelte');
      q.prime.slice(0, 2).filter(x => x.nome !== 'fuori').forEach(x => {
        const b = crea('button', '', INTENTI[x.nome]?.[q.lingua] ?? x.nome); b.type = 'button';
        b.addEventListener('click', () => { scelte.remove(); vista.azzera(); esegui({ ...q, intento: x.nome, decisione: 'agisci' }, s); const g = s.closest<HTMLElement>('.comando-fatto'); if (g) riassumi(g); });
        scelte.append(b);
      });
      s.append(scelte);
    } else if (q.decisione === 'contesto') risposta.textContent = '';
    else risposta.textContent = q.prime[0]!.nome === 'fuori' ? (q.lingua === 'en' ? 'This is not something the house can do.' : 'Questo la casa non lo sa fare.') : (q.lingua === 'en' ? 'I am not sure what you mean.' : 'Non ho capito cosa vuoi.');
    return s;
  }

  function invia() {
    const testo = area.value.trim();
    if (!testo) return;
    vista.azzera(); clearTimeout(attesa); vivo.replaceChildren();
    const gruppo = crea('div', 'comando-fatto');
    gruppo.dataset.testo = testo;
    gruppo.append(crea('p', 'detto', `> ${testo}`));
    // Nello stesso comando, un pezzo senza stanza vale per la stanza del pezzo prima: "accendi la luce in camera e chiudi le tapparelle"
    let stanzePrima: Stanza[] = [];
    // Un pezzo di una o due parole senza stanza ("ehm casa", "ok") non è un comando: si attacca al pezzo dopo
    const pezzi: string[] = [];
    for (const x of dividi(testo)) {
      const prec = pezzi[pezzi.length - 1], qp = prec !== undefined && parole(prec).length <= 2 ? leggi(d, et, prec, null) : null;
      if (qp && !qp.stanze.length && qp.decisione !== 'agisci') pezzi[pezzi.length - 1] = `${prec} ${x}`; else pezzi.push(x);
    }
    // Prima si leggono tutti i pezzi, ognuno con l'intento del pezzo prima ("e in bagno")
    const letti: Passo[] = [];
    for (const pezzo of pezzi) {
      const q = leggi(d, et, pezzo, ultimo);
      if (!q.stanze.length && !q.tutte && !q.ignota) q.stanze = stanzePrima; else stanzePrima = q.stanze;
      if (q.decisione === 'agisci' && !q.ripreso && q.intento !== 'annulla' && q.intento !== 'fuori') ultimo = q.intento;
      letti.push(q);
    }
    // Un pezzo incerto accanto a pezzi che agiscono ("che afa in camera, accendi il ventilatore") è contesto, non un rifiuto
    const altri = letti.some(q => q.decisione === 'agisci');
    for (const q of letti) {
      if (altri && letti.length > 1 && q.decisione === 'rifiuta' && (q.prime[0]!.p < AGISCI || q.stanze.length > 0)) q.decisione = 'contesto';
      gruppo.append(scheda(q));
    }
    riassumi(gruppo);
  }
  $<HTMLButtonElement>('.invia').addEventListener('click', invia);
  area.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia(); } });
  // Il tasto a caso scrive soltanto la frase. Il comando parte col tasto send, come all'apertura della pagina
  aCaso(tastoCaso, area, () => { leggiOra(); if (conMouse) area.focus(); });
}

// --- Opzioni libere: le risposte le scrive chi guarda, su un campo noto (banca, assistente) o nuovo. Il modello le legge come
// testo, come gli intenti della casa, e sceglie per ogni frase. Così si vede quanto si trasferisce quello che ha imparato.
// Qui le percentuali non sono calibrate: non ci sono frasi per regolare la temperatura, quindi vale 1
function montaOpzioni(radice: HTMLElement, d: Decisore) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const opz = $<HTMLTextAreaElement>('.opzioni'), frasi = $<HTMLTextAreaElement>('.frasi'), corpo = $<HTMLElement>('tbody'), caso = $<HTMLElement>('.caso');
  const prove = JSON.parse(opz.dataset.prove ?? '{}') as Record<string, { opzioni: string[]; frasi: string[] }>;
  const pronti = [...radice.querySelectorAll<HTMLButtonElement>('.pronto')];
  const righe = (t: string, n: number) => [...new Set(t.split('\n').map(x => x.trim()).filter(Boolean))].slice(0, n);
  function aggiorna() {
    const op = righe(opz.value, 15), fr = righe(frasi.value, 12);
    if (op.length < 2) { corpo.replaceChildren(); caso.textContent = 'write at least two answers, one per line'; return; }
    const et = etichette(d, op), dubbio = 2 / op.length;
    corpo.replaceChildren(...fr.filter(f => parole(f).length).map(f => {
      const p = decidi(d, parole(f), et, 1), ordine = p.map((_, k) => k).sort((a, b) => p[b]! - p[a]!), [a, b] = [ordine[0]!, ordine[1]!];
      const riga = crea('tr', p[a]! < dubbio ? 'incerto' : ''), scelta = crea('td', 'scelta', op[a]!), seconda = crea('td', 'seconda-scelta', op[b]!);
      const barra = crea('span', 'mini'); barra.style.width = pc(p[a]!);
      scelta.append(crea('span', 'num', pc(p[a]!)), barra); seconda.append(crea('span', 'num', pc(p[b]!)));
      riga.append(crea('td', '', f), scelta, seconda);
      return riga;
    }));
    caso.textContent = `${op.length} answers: a random pick is right ${pc(1 / op.length)} of the time. Grey rows: the model is not sure, its best answer is below ${pc(dubbio)}.`;
  }
  const metti = (n: string) => { const q = prove[n]; if (!q) return; opz.value = q.opzioni.join('\n'); frasi.value = q.frasi.join('\n'); pronti.forEach(b => b.classList.toggle('scelto', b.dataset.prova === n)); aggiorna(); };
  pronti.forEach(b => b.addEventListener('click', () => metti(b.dataset.prova!)));
  let attesa = 0;
  for (const t of [opz, frasi]) t.addEventListener('input', () => { pronti.forEach(b => b.classList.remove('scelto')); clearTimeout(attesa); attesa = window.setTimeout(aggiorna, 120); });
  metti(Object.keys(prove)[0]!);
}

export async function monta(radice: HTMLElement) {
  const scarica = async (nome: string) => {
    const [meta, bin] = await Promise.all([fetch(`/learn/decisore-${nome}.json`).then(r => r.json() as Promise<Meta>), fetch(`/learn/decisore-${nome}.bin`).then(r => r.arrayBuffer())]);
    return carica(meta, bin);
  };
  // Un solo modello, scaricato una volta: guida la casa e sceglie fra le risposte della tabella
  let d: Decisore;
  try { d = await scarica('tutto'); }
  catch (e) { console.error(e); radice.querySelectorAll('[data-casa] .ultima, [data-opzioni] .caso').forEach(x => { x.textContent = 'could not load the model'; }); return; }
  montaCasaVista(radice.querySelector<HTMLElement>('[data-casa]')!, d);
  const tua = radice.querySelector<HTMLElement>('[data-opzioni]');
  if (tua) montaOpzioni(tua, d);
}
