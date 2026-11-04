// La casa di /learn/decision/: un decision model (src/lib/decisore.ts) prende quattro decisioni su ogni comando, e qui c'è lo stato della casa.
// Il modello non scrive testo: la lingua, l'intento, quanto spingere e l'etichetta di ogni parola sono scelte fra risposte date, con una probabilità.
// Le frasi di risposta sono modelli fissi, riempiti con le stanze e i valori che il modello ha scelto.

import { decidi, parole, parti, type Decisore } from './decisore';
export type Lingua = 'en' | 'it';
export { parole };

// --- La casa: quattro stanze e il giardino. Ogni oggetto sta in una stanza precisa
export const STANZE = ['soggiorno', 'cucina', 'camera', 'bagno', 'giardino'] as const;
export type Stanza = typeof STANZE[number];
export const DENTRO: Stanza[] = ['soggiorno', 'cucina', 'camera', 'bagno'];
export const NOMI: Record<Stanza, { en: string; it: string; inEn: string; inIt: string }> = {
  soggiorno: { en: 'living room', it: 'soggiorno', inEn: 'in the living room', inIt: 'in soggiorno' },
  cucina: { en: 'kitchen', it: 'cucina', inEn: 'in the kitchen', inIt: 'in cucina' },
  camera: { en: 'bedroom', it: 'camera', inEn: 'in the bedroom', inIt: 'in camera' },
  bagno: { en: 'bathroom', it: 'bagno', inEn: 'in the bathroom', inIt: 'in bagno' },
  giardino: { en: 'garden', it: 'giardino', inEn: 'in the garden', inIt: 'in giardino' },
};
// Le casse della musica: una in tre stanze
export const CASSE: Stanza[] = ['soggiorno', 'cucina', 'camera'];
const SINONIMI: Record<string, Stanza> = {
  kitchen: 'cucina', cucina: 'cucina', 'living room': 'soggiorno', lounge: 'soggiorno', 'sitting room': 'soggiorno', living: 'soggiorno', soggiorno: 'soggiorno', salotto: 'soggiorno', sala: 'soggiorno', den: 'soggiorno',
  bedroom: 'camera', camera: 'camera', 'camera da letto': 'camera', 'master bedroom': 'camera', bathroom: 'bagno', bagno: 'bagno', 'master bathroom': 'bagno',
  garden: 'giardino', giardino: 'giardino', backyard: 'giardino', yard: 'giardino', lawn: 'giardino', prato: 'giardino', fuori: 'giardino', outside: 'giardino',
};
const ARTICOLI = new Set(['the', 'my', 'our', 'il', 'lo', 'la', 'l', 'i', 'gli', 'le', 'del', 'della', 'dello', 'nel', 'nella', 'nello', 'in', 'al', 'alla', 'mio', 'mia', 'nostro', 'nostra', 'da', 'letto']);
export const COLORI: Record<string, string> = {
  red: '#ff6a5c', rosso: '#ff6a5c', rossa: '#ff6a5c', blue: '#6f9dff', blu: '#6f9dff', green: '#6fdc8c', verde: '#6fdc8c', warm: '#ffb36b', calda: '#ffb36b', caldo: '#ffb36b', cosy: '#ffb36b', cozy: '#ffb36b',
  cold: '#d7ecff', cool: '#d7ecff', fredda: '#d7ecff', freddo: '#d7ecff', white: '#fff4e0', bianca: '#fff4e0', bianco: '#fff4e0', yellow: '#ffe07a', gialla: '#ffe07a', giallo: '#ffe07a',
  purple: '#b98cff', viola: '#b98cff', pink: '#ff9fd0', rosa: '#ff9fd0', orange: '#ffa04d', arancione: '#ffa04d', azzurra: '#8fd6ff', azzurro: '#8fd6ff', 'light blue': '#8fd6ff',
};
export const LUCE_NORMALE = '#ffd9a6';
const PAROLE_NUMERO: Record<string, number> = {
  one: 1, two: 2, three: 3, five: 5, ten: 10, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  uno: 1, due: 2, tre: 3, cinque: 5, dieci: 10, quindici: 15, sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19, venti: 20, ventuno: 21, ventidue: 22, ventitre: 23, ventitré: 23, ventiquattro: 24, venticinque: 25,
  trenta: 30, quaranta: 40, cinquanta: 50, sessanta: 60, settanta: 70, ottanta: 80, novanta: 90, cento: 100, half: 50, halfway: 50, metà: 50,
};
// Un nome di stanza scritto con un errore: la stanza più vicina, se dista al massimo 1 lettera (2 per i nomi lunghi)
const distanza = (a: string, b: string) => {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { let prima = d[0]!; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]!; d[j] = Math.min(d[j]! + 1, d[j - 1]! + 1, prima + (a[i - 1] === b[j - 1] ? 0 : 1)); prima = t; } }
  return d[b.length]!;
};
const simile = (w: string): Stanza | undefined => {
  if (w.length < 4) return undefined;
  let meglio: Stanza | undefined, dm = w.length >= 7 ? 3 : 2;
  for (const [nome, s] of Object.entries(SINONIMI)) { const x = distanza(w, nome); if (x < dm) { dm = x; meglio = s; } }
  return meglio;
};
const TUTTE = /\b(all|every|everything|everywhere|whole|tutte|tutti|tutto|tutta|ovunque|ogni)\b/;

export type StatoStanza = { luce: number; colore: string; tapparelle: number };
export type Stato = {
  stanze: Record<Stanza, StatoStanza>; termostato: number; ventola: number; tv: boolean;
  musica: Stanza[]; brano: number; volume: number; muto: boolean; pulizia: Stanza[]; giri: number; tosaerba: boolean; erba: number;
  caffe: number; timer: number; timerFine: number;
};
export const statoIniziale = (): Stato => ({
  stanze: Object.fromEntries(STANZE.map(s => [s, { luce: s === 'soggiorno' ? 0.7 : 0, colore: LUCE_NORMALE, tapparelle: 1 }])) as Record<Stanza, StatoStanza>,
  termostato: 20.5, ventola: 0, tv: false, musica: [], brano: 0, volume: 0.5, muto: false, pulizia: [], giri: 0, tosaerba: false, erba: 1, caffe: 0, timer: 0, timerFine: 0,
});

// --- La catena di decisioni su un comando
export type Scelta = { nome: string; p: number };
export type Quanto = 'poco' | 'normale' | 'molto' | 'tutto';
export type Passo = {
  testo: string; ws: string[]; lingua: Lingua; pLingua: number; prime: Scelta[]; etichette: string[];
  quanto: Quanto; pQuanto: number; dosabile: boolean;
  stanze: Stanza[]; tutte: boolean; ignota: string | null; colore: string | null; numero: number | null;
  decisione: 'agisci' | 'chiedi' | 'rifiuta' | 'contesto'; intento: string; ripreso: boolean;
};
export const AGISCI = 0.6, CHIEDI = 0.25;
const DOSABILI = new Set(['luce_su', 'luce_giu', 'caldo_su', 'caldo_giu', 'volume_su', 'volume_giu', 'tapparelle_apri', 'tapparelle_chiudi']);

// Un messaggio può contenere più comandi: si taglia sui legami fra frasi, una regola fissa e non un modello.
// "camera e bagno" resta insieme: dopo il taglio il pezzo "bagno" eredita l'intento di prima
export const dividi = (t: string) => t.split(/\s*(?:[,;.!?]|\band then\b|\band also\b|\bthen\b|\balso\b|\bplus\b|\band\b|\boh and\b|\be poi\b|\be anche\b|\bpoi\b|\binoltre\b|\bpoi anche\b|\be\b|\bed\b|\bah\b|\bpoi\b)\s*/i).map(s => s.trim()).filter(s => parole(s).length > 0);

export type Etichette = { casa: Float32Array[]; lingua: Float32Array[]; quanto: Float32Array[] };
export function leggi(d: Decisore, et: Etichette, testo: string, prima: string | null): Passo {
  const ws = parole(testo), compiti = d.meta.compiti, nomi = d.meta.nomi;
  const pl = decidi(d, ws, et.lingua, compiti.lingua!.temperatura), kl = pl.indexOf(Math.max(...pl));
  const lingua = nomi.lingua![kl] as Lingua, pLingua = pl[kl]!;
  const p = decidi(d, ws, et.casa, compiti.casa!.temperatura), ordine = p.map((_, k) => k).sort((a, b) => p[b]! - p[a]!);
  const prime = ordine.slice(0, 3).map(k => ({ nome: nomi.casa![k]!, p: p[k]! }));
  const pq = decidi(d, ws, et.quanto, compiti.quanto!.temperatura), kq = pq.indexOf(Math.max(...pq));
  const etichette = parti(d, ws);
  // Le parole con la stessa etichetta, una dopo l'altra, formano un pezzo
  const pezzi: { tipo: string; testo: string }[] = [];
  etichette.forEach((e, i) => { if (e === 'O') return; const ultimo = pezzi[pezzi.length - 1]; if (ultimo && etichette[i - 1] === e) ultimo.testo += ` ${ws[i]}`; else pezzi.push({ tipo: e, testo: ws[i]! }); });
  const stanze: Stanza[] = [];
  let ignota: string | null = null;
  for (const q of pezzi.filter(q => q.tipo === 'STANZA')) {
    const pulito = q.testo.split(' ').filter(w => !ARTICOLI.has(w)).join(' '), s = SINONIMI[pulito] ?? SINONIMI[q.testo] ?? simile(pulito);
    if (s) { if (!stanze.includes(s)) stanze.push(s); } else if (pulito && pulito.length > 2) ignota = pulito;
  }
  // Se il modello non ha marcato una stanza nota, la cerca il dizionario delle stanze
  if (!stanze.length && !ignota) {
    const frase = ` ${ws.join(' ')} `;
    for (const [nome, s] of Object.entries(SINONIMI).sort((a, b) => b[0].length - a[0].length)) if (frase.includes(` ${nome} `) && !stanze.includes(s)) stanze.push(s);
  }
  const pezzoColore = pezzi.find(q => q.tipo === 'COLORE')?.testo ?? '';
  const colore = Object.entries(COLORI).find(([k]) => ` ${pezzoColore} `.includes(` ${k} `))?.[1] ?? Object.entries(COLORI).find(([k]) => ` ${ws.join(' ')} `.includes(` ${k} `))?.[1] ?? (pezzoColore ? LUCE_NORMALE : null);
  const cifra = testo.match(/\d+(?:[.,]\d+)?/)?.[0], numero = cifra ? parseFloat(cifra.replace(',', '.')) : ws.map(w => PAROLE_NUMERO[w]).find(v => v !== undefined) ?? null;
  let intento = prime[0]!.nome, ripreso = false;
  const pMax = prime[0]!.p;
  let decisione: Passo['decisione'] = intento === 'fuori' ? 'rifiuta' : pMax >= AGISCI ? 'agisci' : pMax >= CHIEDI ? 'chiedi' : 'rifiuta';
  // "anche in cucina", o un pezzo che è solo una stanza: lo stesso intento di prima, con la stanza nuova
  if (intento === 'anche' || (decisione !== 'agisci' && stanze.length && prima && ws.length <= 4)) {
    if (prima) { intento = prima; ripreso = true; decisione = 'agisci'; } else decisione = 'rifiuta';
  }
  return { testo, ws, lingua, pLingua, prime, etichette, quanto: nomi.quanto![kq] as Quanto, pQuanto: pq[kq]!, dosabile: DOSABILI.has(intento),
    stanze, tutte: TUTTE.test(ws.join(' ')), ignota, colore, numero, decisione, intento, ripreso };
}

// --- Cosa fa la casa. Risponde con una frase fissa nella lingua del comando
export type Esito = { stato: Stato; messaggio: string; fuoco: Stanza | null; fatto: boolean };
const elenco = (l: Lingua, ss: Stanza[]) => {
  const n = ss.map(s => NOMI[s][l === 'en' ? 'inEn' : 'inIt']);
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} ${l === 'en' ? 'and' : 'e'} ${n[n.length - 1]}` : n[0]!;
};
const copia = (s: Stato): Stato => JSON.parse(JSON.stringify(s));
const tondo = (x: number) => Math.round(x * 2) / 2;
const pc = (x: number) => `${Math.round(x * 100)}%`;
// Quanto si muove ogni cosa per "un po'", "normale", "molto"; "fino in fondo" va al limite
const PASSO: Record<Quanto, number> = { poco: 0.12, normale: 0.3, molto: 0.55, tutto: 1 };
const GRADI: Record<Quanto, number> = { poco: 0.5, normale: 1, molto: 2.5, tutto: 99 };
const QUANTO_EN: Record<Quanto, string> = { poco: 'a little', normale: '', molto: 'a lot', tutto: 'all the way' };
const QUANTO_IT: Record<Quanto, string> = { poco: 'un po\'', normale: '', molto: 'molto', tutto: 'al massimo' };

export function applica(stato: Stato, q: Passo, dove: Stanza, storia: Stato[], ora = 0): Esito {
  const l = q.lingua, t = (en: string, it: string) => (l === 'en' ? en : it);
  const no = (en: string, it: string, fuoco: Stanza | null = null): Esito => ({ stato, messaggio: t(en, it), fuoco, fatto: false });
  if (q.ignota) return no(`This house has no ${q.ignota}.`, `In questa casa non c'è ${/^[aeiou]/.test(q.ignota) ? "l'" : 'il '}${q.ignota}.`);
  const s = copia(stato), qn = q.dosabile ? q.quanto : 'normale', passo = PASSO[qn], come = t(QUANTO_EN[qn], QUANTO_IT[qn]);
  const ss = q.tutte && !q.stanze.length ? [...STANZE] : q.stanze.length ? q.stanze : [dove], dove1 = ss.length === 1 ? ss[0]! : null;
  const fine = (en: string, it: string, fuoco: Stanza | null = dove1): Esito => { storia.push(copia(stato)); if (storia.length > 30) storia.shift(); return { stato: s, messaggio: t(en, it).replace(/\s+/g, ' ').replace(' .', '.'), fuoco, fatto: true }; };
  const tutteLe = (f: (x: StatoStanza) => void, quali = ss) => quali.forEach(k => f(s.stanze[k]));
  const dove2 = elenco(l, ss), perc = q.numero !== null && q.numero <= 100 ? q.numero / 100 : null;
  const finestre = ss.filter(k => k !== 'giardino');
  switch (q.intento) {
    case 'luce_accendi': {
      if (ss.every(k => stato.stanze[k].luce > 0) && perc === null) return no(`The light is already on ${dove2}.`, `La luce è già accesa ${dove2}.`, dove1);
      tutteLe(x => { x.luce = perc ?? Math.max(x.luce, 0.8); }); return fine(`Light on ${dove2}.`, `Luce accesa ${dove2}.`);
    }
    case 'luce_spegni': {
      if (ss.every(k => stato.stanze[k].luce === 0)) return no(`The light is already off ${dove2}.`, `La luce è già spenta ${dove2}.`, dove1);
      tutteLe(x => { x.luce = 0; }); return fine(`Light off ${dove2}.`, `Luce spenta ${dove2}.`);
    }
    case 'luce_su': tutteLe(x => { x.luce = qn === 'tutto' ? 1 : Math.min(1, Math.max(0.15, x.luce) + passo); }); return fine(`${come ? `${come[0]!.toUpperCase()}${come.slice(1)} brighter` : 'Brighter'} ${dove2}: ${pc(s.stanze[ss[0]!].luce)}.`, `Luce più forte ${come} ${dove2}: ${pc(s.stanze[ss[0]!].luce)}.`);
    case 'luce_giu': tutteLe(x => { x.luce = qn === 'tutto' ? 0.05 : x.luce ? Math.max(0.05, x.luce - passo) : 0.25; }); return fine(`Dimmed ${come} ${dove2}: ${pc(s.stanze[ss[0]!].luce)}.`, `Luce abbassata ${come} ${dove2}: ${pc(s.stanze[ss[0]!].luce)}.`);
    case 'luce_livello': {
      if (perc === null) return no('How bright? Try "lights at 40 percent".', 'Quanta luce? Prova «luci al 40 per cento».');
      tutteLe(x => { x.luce = perc; }); return fine(`Light at ${pc(perc)} ${dove2}.`, `Luce al ${pc(perc)} ${dove2}.`);
    }
    case 'luce_colore': {
      const c = q.colore ?? LUCE_NORMALE;
      tutteLe(x => { x.colore = c; if (!x.luce) x.luce = 0.8; }); return fine(`New light colour ${dove2}.`, `Nuovo colore della luce ${dove2}.`);
    }
    case 'tapparelle_apri': case 'tapparelle_chiudi': case 'tapparelle_livello': {
      if (!finestre.length) return no('The garden has no blinds.', 'Il giardino non ha tapparelle.', 'giardino');
      const apri = q.intento === 'tapparelle_apri';
      if (q.intento === 'tapparelle_livello') {
        if (perc === null) return no('How open? Try "blinds at 50 percent".', 'Quanto aperte? Prova «tapparelle al 50 per cento».');
        tutteLe(x => { x.tapparelle = perc; }, finestre); return fine(`Blinds at ${pc(perc)} ${elenco(l, finestre)}.`, `Tapparelle al ${pc(perc)} ${elenco(l, finestre)}.`);
      }
      if (finestre.every(k => stato.stanze[k].tapparelle === (apri ? 1 : 0)) && perc === null) return no(`The blinds are already ${apri ? 'open' : 'closed'} ${elenco(l, finestre)}.`, `Le tapparelle sono già ${apri ? 'aperte' : 'chiuse'} ${elenco(l, finestre)}.`, finestre.length === 1 ? finestre[0]! : null);
      // Aprire senza dire quanto vuol dire aprire tutto; "un po'" sposta solo di un tratto
      tutteLe(x => { x.tapparelle = perc ?? (qn === 'poco' || qn === 'molto' ? Math.max(0, Math.min(1, x.tapparelle + (apri ? passo : -passo))) : apri ? 1 : 0); }, finestre);
      return fine(`Blinds ${apri ? 'up' : 'down'} ${come} ${elenco(l, finestre)}.`, `Tapparelle ${apri ? 'alzate' : 'abbassate'} ${come} ${elenco(l, finestre)}.`);
    }
    case 'caldo_su': s.termostato = Math.min(26, tondo(s.termostato + GRADI[qn])); return fine(`Heating ${come} up: ${s.termostato}°.`, `Riscaldamento ${come} più alto: ${s.termostato}°.`, 'soggiorno');
    case 'caldo_giu': s.termostato = Math.max(16, tondo(s.termostato - GRADI[qn])); return fine(`Heating ${come} down: ${s.termostato}°.`, `Riscaldamento ${come} più basso: ${s.termostato}°.`, 'soggiorno');
    case 'temperatura': {
      if (q.numero === null) return no('Which temperature? Try "set it to 21".', 'Che temperatura? Prova «mettila a 21».');
      // Un numero sopra 40 è in Fahrenheit, come nelle frasi americane
      const c = q.numero > 40 ? (q.numero - 32) * 5 / 9 : q.numero;
      s.termostato = Math.max(16, Math.min(26, tondo(c)));
      return fine(`Thermostat set to ${s.termostato}°${q.numero > 40 ? ` (${q.numero}°F)` : ''}.`, `Termostato a ${s.termostato}°${q.numero > 40 ? ` (${q.numero}°F)` : ''}.`, 'soggiorno');
    }
    case 'ventilatore_on': case 'ventilatore_off': {
      if (q.stanze.length && !q.stanze.includes('camera')) return no('The fan is in the bedroom.', 'Il ventilatore è in camera.', 'camera');
      if (q.intento === 'ventilatore_off') { if (!stato.ventola) return no('The fan is already off.', 'Il ventilatore è già spento.', 'camera'); s.ventola = 0; return fine('Fan off in the bedroom.', 'Ventilatore spento in camera.', 'camera'); }
      s.ventola = perc ?? (s.ventola || 0.6); return fine(`Fan at ${pc(s.ventola)} in the bedroom.`, `Ventilatore al ${pc(s.ventola)} in camera.`, 'camera');
    }
    case 'musica_play': {
      const dove3 = q.tutte ? [...CASSE] : ss.filter(k => CASSE.includes(k));
      if (!dove3.length) return no(`There is no speaker ${dove2}. They are in the living room, kitchen and bedroom.`, `Non c'è una cassa ${dove2}. Sono in soggiorno, cucina e camera.`, null);
      s.musica = [...new Set([...s.musica, ...dove3])]; s.muto = false; return fine(`Music on ${elenco(l, dove3)}.`, `Musica accesa ${elenco(l, dove3)}.`, dove3.length === 1 ? dove3[0]! : null);
    }
    case 'musica_stop': {
      if (!stato.musica.length) return no('No music is playing.', 'Non c\'è musica.');
      const via = q.stanze.length ? q.stanze : [...CASSE];
      s.musica = s.musica.filter(k => !via.includes(k)); return fine(`Music off ${s.musica.length ? elenco(l, via.filter(k => CASSE.includes(k))) : ''}.`, `Musica spenta ${s.musica.length ? elenco(l, via.filter(k => CASSE.includes(k))) : ''}.`, null);
    }
    case 'musica_avanti':
      if (!s.musica.length) s.musica = [CASSE.includes(dove) ? dove : 'soggiorno'];
      s.brano++; s.muto = false; return fine('Next song.', 'Prossima canzone.', s.musica.length === 1 ? s.musica[0]! : null);
    case 'volume_su': s.volume = qn === 'tutto' ? 1 : Math.min(1, s.volume + passo * 0.7); s.muto = false; return fine(`Volume ${pc(s.volume)}.`, `Volume al ${pc(s.volume)}.`, null);
    case 'volume_giu': s.volume = qn === 'tutto' ? 0.05 : Math.max(0.05, s.volume - passo * 0.7); return fine(`Volume ${pc(s.volume)}.`, `Volume al ${pc(s.volume)}.`, null);
    case 'volume_livello': {
      if (perc === null) return no('Which volume? Try "volume at 30".', 'Che volume? Prova «volume a 30».');
      s.volume = Math.max(0.05, perc); s.muto = false; return fine(`Volume ${pc(s.volume)}.`, `Volume al ${pc(s.volume)}.`, null);
    }
    case 'muto': s.muto = true; return fine('Muted.', 'Audio disattivato.', null);
    case 'tv_accendi': case 'tv_spegni': {
      if (q.stanze.length && !q.stanze.includes('soggiorno')) return no(`There is no TV ${elenco(l, q.stanze)}. It is in the living room.`, `Non c'è una TV ${elenco(l, q.stanze)}. È in soggiorno.`, 'soggiorno');
      s.tv = q.intento === 'tv_accendi'; return fine(s.tv ? 'TV on.' : 'TV off.', s.tv ? 'TV accesa.' : 'TV spenta.', 'soggiorno');
    }
    case 'pulisci': {
      if (q.stanze.length === 1 && q.stanze[0] === 'giardino') return no('The robot cleans only inside. Try the lawn mower.', 'Il robot pulisce solo dentro. Prova il tosaerba.', 'giardino');
      const dove3 = q.stanze.filter(k => k !== 'giardino').length ? q.stanze.filter(k => k !== 'giardino') : [...DENTRO];
      s.pulizia = dove3; s.giri++; return fine(`The robot is cleaning ${q.stanze.length ? elenco(l, dove3) : 'the whole house'}.`, `Il robot pulisce ${q.stanze.length ? elenco(l, dove3) : 'tutta la casa'}.`, null);
    }
    case 'pulisci_stop': if (!stato.pulizia.length) return no('The robot is already at its base.', 'Il robot è già alla base.'); s.pulizia = []; s.giri++; return fine('The robot goes back to its base.', 'Il robot torna alla base.', null);
    case 'tosaerba': s.tosaerba = true; return fine('The mower is cutting the grass.', 'Il tosaerba taglia l\'erba.', 'giardino');
    case 'tosaerba_stop': if (!stato.tosaerba) return no('The mower is already parked.', 'Il tosaerba è già parcheggiato.', 'giardino'); s.tosaerba = false; return fine('The mower goes back to its shed.', 'Il tosaerba torna nella casetta.', 'giardino');
    case 'caffe': {
      if (q.stanze.length && !q.stanze.includes('cucina')) return no('The coffee machine is in the kitchen.', 'La macchina del caffè è in cucina.', 'cucina');
      s.caffe++; return fine('Making a coffee in the kitchen.', 'Caffè in preparazione in cucina.', 'cucina');
    }
    case 'timer': {
      const minuti = q.numero !== null && q.numero > 0 && q.numero <= 180 ? q.numero : 5;
      s.timer = minuti; s.timerFine = ora + minuti * 60; return fine(`Timer: ${minuti} minutes.`, `Timer: ${minuti} minuti.`, 'cucina');
    }
    case 'timer_stop': if (!stato.timer) return no('There is no timer.', 'Non c\'è nessun timer.', 'cucina'); s.timer = 0; s.timerFine = 0; return fine('Timer cancelled.', 'Timer cancellato.', 'cucina');
    case 'scena_notte':
      STANZE.forEach(k => { s.stanze[k].luce = 0; s.stanze[k].tapparelle = 0; }); s.stanze.giardino.luce = 0.3; s.tv = false; s.musica = []; s.termostato = 18; s.ventola = 0;
      return fine('Good night: lights off, blinds down, a soft light in the garden, heating at 18°.', 'Buonanotte: luci spente, tapparelle giù, una luce leggera in giardino, riscaldamento a 18°.', null);
    case 'scena_esco':
      STANZE.forEach(k => { s.stanze[k].luce = 0; }); s.tv = false; s.musica = []; s.termostato = 17; s.ventola = 0; s.pulizia = [...DENTRO]; s.giri++; s.tosaerba = true;
      return fine('Bye: everything off, heating at 17°. The robot cleans and the mower cuts the grass while you are out.', 'Ciao: tutto spento, riscaldamento a 17°. Il robot pulisce e il tosaerba taglia l\'erba mentre sei fuori.', null);
    case 'scena_film':
      DENTRO.forEach(k => { s.stanze[k].luce = 0; }); s.stanze.soggiorno.luce = 0.15; s.stanze.soggiorno.colore = '#ff9a5a'; s.stanze.soggiorno.tapparelle = 0; s.tv = true; s.musica = [];
      return fine('Movie mode: soft light, blinds down, TV on.', 'Modalità film: luce soffusa, tapparelle giù, TV accesa.', 'soggiorno');
    case 'scena_arrivo':
      s.stanze.soggiorno.luce = Math.max(0.7, s.stanze.soggiorno.luce); s.stanze.cucina.luce = Math.max(0.5, s.stanze.cucina.luce); s.stanze.giardino.luce = Math.max(0.6, s.stanze.giardino.luce);
      s.termostato = 21; s.pulizia = []; s.tosaerba = false; s.musica = ['soggiorno']; s.muto = false;
      return fine('Welcome home: lights on, heating at 21°, some music in the living room.', 'Bentornato: luci accese, riscaldamento a 21°, un po\' di musica in soggiorno.', null);
    case 'annulla': {
      const indietro = storia.pop();
      if (!indietro) return no('There is nothing to undo.', 'Non c\'è niente da annullare.');
      return { stato: { ...indietro, caffe: stato.caffe, giri: stato.giri + 1, erba: stato.erba }, messaggio: t('Undone.', 'Fatto, rimesso com\'era.'), fuoco: null, fatto: true };
    }
  }
  return no('This is not something the house can do.', 'Questo la casa non lo sa fare.');
}

// Nomi leggibili degli intenti, nelle due lingue
export const INTENTI: Record<string, { en: string; it: string }> = {
  luce_accendi: { en: 'light on', it: 'accendi luce' }, luce_spegni: { en: 'light off', it: 'spegni luce' }, luce_su: { en: 'brighter', it: 'più luce' }, luce_giu: { en: 'dimmer', it: 'meno luce' },
  luce_livello: { en: 'light to %', it: 'luce al %' }, luce_colore: { en: 'light colour', it: 'colore luce' },
  tapparelle_apri: { en: 'open blinds', it: 'apri tapparelle' }, tapparelle_chiudi: { en: 'close blinds', it: 'chiudi tapparelle' }, tapparelle_livello: { en: 'blinds to %', it: 'tapparelle al %' },
  caldo_su: { en: 'warmer', it: 'più caldo' }, caldo_giu: { en: 'cooler', it: 'più fresco' }, temperatura: { en: 'set temperature', it: 'imposta gradi' },
  ventilatore_on: { en: 'fan on', it: 'accendi ventilatore' }, ventilatore_off: { en: 'fan off', it: 'spegni ventilatore' },
  musica_play: { en: 'play music', it: 'musica' }, musica_stop: { en: 'stop music', it: 'ferma musica' }, musica_avanti: { en: 'next song', it: 'prossima canzone' },
  volume_su: { en: 'louder', it: 'più forte' }, volume_giu: { en: 'quieter', it: 'più piano' }, volume_livello: { en: 'volume to %', it: 'volume al %' }, muto: { en: 'mute', it: 'muto' },
  tv_accendi: { en: 'TV on', it: 'accendi TV' }, tv_spegni: { en: 'TV off', it: 'spegni TV' },
  pulisci: { en: 'vacuum', it: 'aspirapolvere' }, pulisci_stop: { en: 'vacuum home', it: 'robot alla base' }, tosaerba: { en: 'mow the lawn', it: 'taglia l\'erba' }, tosaerba_stop: { en: 'park the mower', it: 'ferma tosaerba' },
  caffe: { en: 'coffee', it: 'caffè' }, timer: { en: 'timer', it: 'timer' }, timer_stop: { en: 'cancel timer', it: 'cancella timer' },
  scena_notte: { en: 'scene: night', it: 'scena: notte' }, scena_esco: { en: 'scene: away', it: 'scena: esco' }, scena_film: { en: 'scene: movie', it: 'scena: film' }, scena_arrivo: { en: 'scene: home', it: 'scena: arrivo' },
  annulla: { en: 'undo', it: 'annulla' }, anche: { en: 'same again', it: 'anche qui' }, fuori: { en: 'not for the house', it: 'non per la casa' },
};
export const QUANTI: Record<Quanto, { en: string; it: string }> = { poco: { en: 'a little', it: 'un po\'' }, normale: { en: 'normal', it: 'normale' }, molto: { en: 'a lot', it: 'molto' }, tutto: { en: 'all the way', it: 'fino in fondo' } };
