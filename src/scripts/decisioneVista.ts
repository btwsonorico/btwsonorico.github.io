import { carica, decidi, etichette, parole, type Decisore, type Meta } from '../lib/decisore';
import { AGISCI, applica, dividi, INTENTI, leggi, NOMI, QUANTI, statoIniziale, type Etichette, type Passo, type Stanza, type Stato } from '../lib/casa';
import { montaCasa, type Vista } from './casaScena';

// Vista dei decision model. In cima la casa: un comando in inglese o in italiano passa per quattro decisioni (lingua, intento,
// quanto spingere, etichetta di ogni parola) e la casa fa quello che il modello ha scelto. Sotto, un secondo modello con la stessa
// forma su due dataset veri: Banking77 e CLINC150. Le risposte possibili sono testo: cambiano da un compito all'altro.

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
  const area = $<HTMLTextAreaElement>('.comando'), traccia = $<HTMLElement>('.passi');
  let stato: Stato = statoIniziale(), dove: Stanza = 'soggiorno', ultimo: string | null = null;
  const storia: Stato[] = [];
  const vista: Vista = montaCasa($<HTMLElement>('.scena-casa'), $<HTMLElement>('.etichette'), s => { dove = s; vista.dove(s); vista.fuoco(s, 6); dovEl.textContent = NOMI[s].en; });
  const dovEl = $<HTMLElement>('.dove');
  vista.imposta(stato);


  function esegui(q: Passo, scheda: HTMLElement) {
    const e = applica(stato, q, dove, storia, performance.now() / 1000);
    stato = e.stato; vista.imposta(stato);
    if (e.fuoco) vista.fuoco(e.fuoco);
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
        b.addEventListener('click', () => { scelte.remove(); esegui({ ...q, intento: x.nome, decisione: 'agisci' }, s); });
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
    const gruppo = crea('div', 'comando-fatto');
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
    traccia.prepend(gruppo);
    while (traccia.children.length > 6) traccia.lastElementChild!.remove();
  }
  $<HTMLButtonElement>('.invia').addEventListener('click', invia);
  area.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia(); } });
  aCaso($<HTMLButtonElement>('.a-caso'), area, invia);
  // All'apertura la casa esegue il comando già scritto, così si vede subito una decisione
  invia();
}

// --- Banking77 e CLINC150: lo stesso modello con altre risposte possibili
function montaCompito(radice: HTMLElement, d: Decisore, nome: string) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const c = d.meta.compiti[nome]!, nomi = d.meta.nomi[nome]!.map(x => x.replace(/_/g, ' ')), et = etichette(d, c.etichette);
  const area = $<HTMLTextAreaElement>('.messaggio'), righe = $<HTMLElement>('.parole'), esito = $<HTMLElement>('.esito'), barre = $<HTMLElement>('.barre');
  const voci = Array.from({ length: 5 }, () => barra(barre));
  const oos = nomi.indexOf('oos');
  const pulsante = $<HTMLButtonElement>('.a-caso');
  pulsante.dataset.frasi = JSON.stringify(d.meta.esempi[nome] ?? []);
  function aggiorna() {
    const ws = parole(area.value);
    if (!ws.length) { esito.textContent = 'write something'; righe.replaceChildren(); voci.forEach(v => { v.n.textContent = ''; v.pieno.style.width = '0'; v.num.textContent = ''; }); return; }
    const p = decidi(d, ws, et, c.temperatura), ordine = p.map((_, k) => k).sort((a, b) => p[b]! - p[a]!), prima = ordine[0]!;
    const fuori = oos >= 0 && (prima === oos || (c.soglia !== null && p[prima]! < c.soglia));
    voci.forEach((v, k) => { const i = ordine[k]!; v.n.textContent = i === oos ? 'out of scope' : nomi[i]!; v.pieno.style.width = pc(p[i]!); v.num.textContent = pc(p[i]!); });
    esito.textContent = fuori ? `out of scope: no intent passes ${pc(c.soglia ?? 0)}, so it hands over to a person` : `${nomi[prima]}, ${pc(p[prima]!)}`;
    // Ogni parola si accende quanto la scelta scende se la si toglie. Il testo si scrive sempre come testo, mai come HTML
    righe.replaceChildren(...ws.flatMap((w, i) => {
      const s = crea('span', '', w);
      if (ws.length > 1) {
        const senza = decidi(d, ws.filter((_, k) => k !== i), et, c.temperatura)[prima]!, peso = Math.max(0, Math.min(1, (p[prima]! - senza) / Math.max(0.05, p[prima]!)));
        if (peso > 0.12) { s.style.color = tono('--arancio'); s.style.opacity = String(0.45 + peso * 0.55); }
      }
      return i ? [' ', s] : [s];
    }));
  }
  let attesa = 0;
  area.addEventListener('input', () => { clearTimeout(attesa); attesa = window.setTimeout(aggiorna, 60); });
  aCaso(pulsante, area, aggiorna);
  aggiorna();
}

export async function monta(radice: HTMLElement) {
  const scarica = async (nome: string) => {
    const [meta, bin] = await Promise.all([fetch(`/learn/decisore-${nome}.json`).then(r => r.json() as Promise<Meta>), fetch(`/learn/decisore-${nome}.bin`).then(r => r.arrayBuffer())]);
    return carica(meta, bin);
  };
  // Prima la casa, poi il modello delle demo business
  try { montaCasaVista(radice.querySelector<HTMLElement>('[data-casa]')!, await scarica('casa')); }
  catch (e) { console.error(e); radice.querySelectorAll('[data-casa] .passi').forEach(x => { x.textContent = 'could not load the model'; }); }
  try { const d = await scarica('banca'); for (const el of radice.querySelectorAll<HTMLElement>('[data-compito]')) montaCompito(el, d, el.dataset.compito!); }
  catch (e) { console.error(e); radice.querySelectorAll('[data-compito] .esito').forEach(x => { x.textContent = 'could not load the model'; }); }
}
