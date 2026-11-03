import { modelloDa, parole, punteggi, softmax, type Modello } from '../lib/emoji';

// Vista del decision model. In cima l'autotagger: un encoder minuscolo sceglie fra 50 emoji, e togliendo una parola alla volta si vede quale conta.
// Sotto i ticket: un modello ancora più semplice somma i pesi delle parole e sceglie fra quattro risposte fisse.
type Ticket = { classi: string[]; temperatura: number; scarti: number[]; voci: Record<string, number[]> };
type Etichette = { emoji: string[]; temperatura: number };

const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
const INCERTO = 0.3, QUANTE = 5;

// Il pulsante unico: una frase a caso dal set, mai la stessa due volte di fila
function aCaso(radice: HTMLElement, area: HTMLTextAreaElement, aggiorna: () => void) {
  const pulsante = radice.querySelector<HTMLButtonElement>('.a-caso')!, frasi = JSON.parse(pulsante.dataset.frasi ?? '[]') as string[];
  pulsante.addEventListener('click', () => {
    let f = area.value;
    while (f === area.value && frasi.length > 1) f = frasi[Math.floor(Math.random() * frasi.length)]!;
    area.value = f;
    aggiorna();
  });
}

function barra(contenitore: HTMLElement, colore?: string) {
  const r = document.createElement('div'), n = document.createElement('span'), tr = document.createElement('div'), pieno = document.createElement('div'), num = document.createElement('span');
  r.className = 'barra-voce'; tr.className = 'traccia'; pieno.className = 'pieno'; n.className = 'nome'; num.className = 'num';
  pieno.style.background = colore ?? tono('--arancio');
  tr.append(pieno); r.append(n, tr, num); contenitore.append(r);
  return { n, pieno, num };
}

function montaEmoji(radice: HTMLElement, m: Modello, d: Etichette) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const area = $<HTMLTextAreaElement>('.messaggio'), grande = $<HTMLElement>('.emoji-grande'), quota = $<HTMLElement>('.emoji-quota'), esito = $<HTMLElement>('.esito'), righe = $<HTMLElement>('.parole'), barre = $<HTMLElement>('.barre');
  const voci = Array.from({ length: QUANTE }, () => barra(barre));
  const prob = (ws: string[]) => softmax(punteggi(m, ws), d.temperatura);
  const nota = (w: string) => m.indice.has(w);
  function aggiorna() {
    const tutte = parole(area.value), ws = tutte.filter(nota);
    if (!ws.length) {
      grande.textContent = '·'; quota.textContent = ''; esito.textContent = tutte.length ? 'it knows none of these words' : 'write something'; righe.replaceChildren();
      voci.forEach(v => { v.n.textContent = ''; v.pieno.style.width = '0'; v.num.textContent = ''; });
      return;
    }
    const p = prob(ws), ordine = p.map((_, i) => i).sort((a, b) => p[b]! - p[a]!), prima = ordine[0]!;
    grande.textContent = d.emoji[prima]!;
    quota.textContent = `${Math.round(p[prima]! * 100)}%`;
    esito.textContent = p[prima]! >= INCERTO ? 'its choice' : 'not sure: this is only its best guess';
    voci.forEach((v, k) => { const i = ordine[k]!; v.n.textContent = d.emoji[i]!; v.pieno.style.width = `${p[i]! * 100}%`; v.num.textContent = `${Math.round(p[i]! * 100)}%`; });
    // Ogni parola si accende quanto la scelta scende se la si toglie. Il testo si scrive sempre come testo, mai come HTML
    let n = -1;
    righe.replaceChildren(...tutte.flatMap((w, i) => {
      const s = document.createElement('span');
      s.textContent = w;
      if (!nota(w)) return i ? [' ', s] : [s];
      n++;
      const q = n, senza = ws.length > 1 ? prob(ws.filter((_, k) => k !== q))[prima]! : 0, peso = Math.max(0, Math.min(1, (p[prima]! - senza) / Math.max(0.05, p[prima]!)));
      if (peso > 0.15) { s.style.color = tono('--arancio'); s.style.opacity = String(0.45 + peso * 0.55); }
      return i ? [' ', s] : [s];
    }));
  }
  area.addEventListener('input', aggiorna);
  aCaso(radice, area, aggiorna);
  aggiorna();
}

function montaTicket(radice: HTMLElement, d: Ticket) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const COLORI = [tono('--arancio'), tono('--verde'), tono('--fg'), tono('--azzurro')];
  const area = $<HTMLTextAreaElement>('.messaggio'), barre = $<HTMLElement>('.barre'), esito = $<HTMLElement>('.esito'), righe = $<HTMLElement>('.parole');
  const voci = d.classi.map((nome, k) => { const v = barra(barre, COLORI[k]); v.n.textContent = nome; v.n.style.color = COLORI[k]!; return v; });
  // Le stesse regole dello script di allenamento: parole singole e coppie di parole
  function aggiorna() {
    const p = parole(area.value), o = [...d.scarti], tratti = [...p, ...p.slice(1).map((w, i) => `${p[i]} ${w}`)];
    let note = 0;
    for (const f of tratti) { const w = d.voci[f]; if (w) { note++; w.forEach((v, k) => { o[k]! += v; }); } }
    const q = softmax(o, d.temperatura), m = q.indexOf(Math.max(...q)), c = p.length > 0;
    voci.forEach((v, k) => { v.pieno.style.width = `${c ? q[k]! * 100 : 0}%`; v.num.textContent = c ? `${Math.round(q[k]! * 100)}%` : '–'; });
    righe.replaceChildren(...p.flatMap((w, i) => {
      const s = document.createElement('span'), pesi = d.voci[w];
      s.textContent = w;
      if (pesi) { const k = pesi.indexOf(Math.max(...pesi)); if (pesi[k]! > 0) s.style.color = COLORI[k]!; }
      return i ? [' ', s] : [s];
    }));
    esito.textContent = !c ? 'waiting for a message' : !note ? 'it knows none of these words' : `route to ${d.classi[m]}`;
  }
  area.addEventListener('input', aggiorna);
  aCaso(radice, area, aggiorna);
  aggiorna();
}

export async function monta(radice: HTMLElement) {
  const emoji = radice.querySelector<HTMLElement>('[data-emoji]')!, ticket = radice.querySelector<HTMLElement>('[data-ticket]')!;
  fetch('/learn/decisioni.json').then(r => r.json() as Promise<Ticket>).then(d => montaTicket(ticket, d)).catch(() => { ticket.querySelector('.esito')!.textContent = 'could not load the model'; });
  try {
    const [pesi, vettori, testo, d] = await Promise.all([fetch('/learn/emoji.bin').then(r => r.arrayBuffer()), fetch('/learn/emoji-vettori.bin').then(r => r.arrayBuffer()), fetch('/learn/emoji-parole.txt').then(r => r.text()), fetch('/learn/emoji.json').then(r => r.json() as Promise<Etichette>)]);
    montaEmoji(emoji, modelloDa(pesi, vettori, testo), d);
  } catch { emoji.querySelector('.esito')!.textContent = 'could not load the model'; }
}
