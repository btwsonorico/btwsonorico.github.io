// La casa di /learn/decision/: un decision model (src/lib/decisore.ts) prende tre decisioni in catena, e qui c'è lo stato della casa.
// Il modello non scrive testo: la lingua, l'intento e l'etichetta di ogni parola sono scelte fra risposte date, con una probabilità.
// Le frasi di risposta sono modelli fissi, riempiti con le stanze e i valori che i modelli hanno scelto.

import { decidi, parole, parti, type Decisore } from './decisore';
export type Lingua = 'en' | 'it';
export { parole };

// --- La casa
export const STANZE = ['cucina', 'soggiorno', 'camera', 'bagno', 'studio', 'ingresso'] as const;
export type Stanza = typeof STANZE[number];
export const NOMI: Record<Stanza, { en: string; it: string; inEn: string; inIt: string }> = {
  cucina: { en: 'kitchen', it: 'cucina', inEn: 'in the kitchen', inIt: 'in cucina' },
  soggiorno: { en: 'living room', it: 'soggiorno', inEn: 'in the living room', inIt: 'in soggiorno' },
  camera: { en: 'bedroom', it: 'camera', inEn: 'in the bedroom', inIt: 'in camera' },
  bagno: { en: 'bathroom', it: 'bagno', inEn: 'in the bathroom', inIt: 'in bagno' },
  studio: { en: 'study', it: 'studio', inEn: 'in the study', inIt: 'nello studio' },
  ingresso: { en: 'hall', it: 'ingresso', inEn: 'in the hall', inIt: "nell'ingresso" },
};
const SINONIMI: Record<string, Stanza> = {
  kitchen: 'cucina', cucina: 'cucina', 'living room': 'soggiorno', lounge: 'soggiorno', 'sitting room': 'soggiorno', 'living': 'soggiorno', soggiorno: 'soggiorno', salotto: 'soggiorno', sala: 'soggiorno',
  bedroom: 'camera', camera: 'camera', 'camera da letto': 'camera', bathroom: 'bagno', bagno: 'bagno', study: 'studio', office: 'studio', studio: 'studio', ufficio: 'studio',
  hall: 'ingresso', hallway: 'ingresso', entrance: 'ingresso', ingresso: 'ingresso', corridoio: 'ingresso',
};
const ARTICOLI = new Set(['the', 'my', 'our', 'il', 'lo', 'la', 'l', 'i', 'gli', 'le', 'del', 'della', 'dello', 'nel', 'nella', 'nello', 'in', 'al', 'alla', 'mio', 'mia', 'nostro', 'nostra']);
export const COLORI: Record<string, string> = {
  red: '#ff4a3d', rosso: '#ff4a3d', rossa: '#ff4a3d', blue: '#4d8dff', blu: '#4d8dff', green: '#4fd27a', verde: '#4fd27a', warm: '#ffb36b', calda: '#ffb36b', caldo: '#ffb36b', cosy: '#ffb36b', cozy: '#ffb36b',
  cold: '#d7ecff', cool: '#d7ecff', fredda: '#d7ecff', freddo: '#d7ecff', white: '#fff4e0', bianca: '#fff4e0', bianco: '#fff4e0', yellow: '#ffd75e', gialla: '#ffd75e', giallo: '#ffd75e',
  purple: '#b07cff', viola: '#b07cff', pink: '#ff8fc8', rosa: '#ff8fc8', orange: '#ff9a3d', arancione: '#ff9a3d', azzurra: '#7fd0ff', azzurro: '#7fd0ff', 'light blue': '#7fd0ff',
};
const LUCE_NORMALE = '#ffd9a6';
const PAROLE_NUMERO: Record<string, number> = { sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19, venti: 20, ventuno: 21, ventidue: 22, ventitre: 23, ventitré: 23, ventiquattro: 24, venticinque: 25 };
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
export type Stato = { stanze: Record<Stanza, StatoStanza>; tv: boolean; musica: boolean; volume: number; muto: boolean; termostato: number; caffe: number; pulizia: Stanza[]; giri: number };
export const statoIniziale = (): Stato => ({
  stanze: Object.fromEntries(STANZE.map(s => [s, { luce: s === 'soggiorno' ? 0.7 : 0, colore: LUCE_NORMALE, tapparelle: 1 }])) as Record<Stanza, StatoStanza>,
  tv: false, musica: false, volume: 0.5, muto: false, termostato: 20.5, caffe: 0, pulizia: [], giri: 0,
});

// --- La catena di decisioni su un comando
export type Scelta = { nome: string; p: number };
export type Passo = {
  testo: string; ws: string[]; lingua: Lingua; pLingua: number; prime: Scelta[]; etichette: string[];
  stanze: Stanza[]; tutte: boolean; ignota: string | null; colore: string | null; numero: number | null;
  decisione: 'agisci' | 'chiedi' | 'rifiuta'; intento: string; ripreso: boolean;
};
export const AGISCI = 0.6, CHIEDI = 0.25;

// Un messaggio può contenere più comandi: si taglia sui legami fra frasi, una regola fissa e non un modello
export const dividi = (t: string) => t.split(/\s*(?:[,;.!?]|\band then\b|\bthen\b|\band\b|\be poi\b|\bpoi\b|\be\b|\bed\b)\s*/i).map(s => s.trim()).filter(s => parole(s).length > 0);

export type Etichette = { casa: Float32Array[]; lingua: Float32Array[] };
export function leggi(d: Decisore, et: Etichette, testo: string, prima: string | null): Passo {
  const ws = parole(testo), compiti = d.meta.compiti, nomi = d.meta.nomi;
  const pl = decidi(d, ws, et.lingua, compiti.lingua!.temperatura), kl = pl.indexOf(Math.max(...pl));
  const lingua = nomi.lingua![kl] as Lingua, pLingua = pl[kl]!;
  const p = decidi(d, ws, et.casa, compiti.casa!.temperatura), ordine = p.map((_, k) => k).sort((a, b) => p[b]! - p[a]!);
  const prime = ordine.slice(0, 3).map(k => ({ nome: nomi.casa![k]!, p: p[k]! }));
  const etichette = parti(d, ws);
  // Le parole con la stessa etichetta, una dopo l'altra, formano un pezzo
  const pezzi: { tipo: string; testo: string }[] = [];
  etichette.forEach((e, i) => { if (e === 'O') return; const ultimo = pezzi[pezzi.length - 1]; if (ultimo && etichette[i - 1] === e) ultimo.testo += ` ${ws[i]}`; else pezzi.push({ tipo: e, testo: ws[i]! }); });
  const stanze: Stanza[] = [];
  let ignota: string | null = null;
  for (const q of pezzi.filter(q => q.tipo === 'STANZA')) {
    const pulito = q.testo.split(' ').filter(w => !ARTICOLI.has(w)).join(' '), s = SINONIMI[pulito] ?? simile(pulito);
    if (s) { if (!stanze.includes(s)) stanze.push(s); } else if (pulito) ignota = pulito;
  }
  // Se il modello non ha marcato una stanza nota, la cerca il dizionario delle stanze
  if (!stanze.length && !ignota) {
    const frase = ` ${ws.join(' ')} `;
    for (const [nome, s] of Object.entries(SINONIMI).sort((a, b) => b[0].length - a[0].length)) if (frase.includes(` ${nome} `) && !stanze.includes(s)) { stanze.push(s); break; }
  }
  const pezzoColore = pezzi.find(q => q.tipo === 'COLORE')?.testo ?? '';
  const colore = Object.entries(COLORI).find(([k]) => ` ${pezzoColore} `.includes(` ${k} `))?.[1] ?? (pezzoColore ? LUCE_NORMALE : null);
  const cifra = testo.match(/\d+(?:[.,]\d+)?/)?.[0], numero = cifra ? parseFloat(cifra.replace(',', '.')) : ws.map(w => PAROLE_NUMERO[w]).find(v => v !== undefined) ?? null;
  let intento = prime[0]!.nome, ripreso = false;
  const pMax = prime[0]!.p;
  let decisione: Passo['decisione'] = intento === 'fuori' ? 'rifiuta' : pMax >= AGISCI ? 'agisci' : pMax >= CHIEDI ? 'chiedi' : 'rifiuta';
  // "anche in cucina": lo stesso intento di prima, con la stanza nuova
  if (intento === 'anche' || (decisione !== 'agisci' && stanze.length && prima && ws.length <= 4)) {
    if (prima) { intento = prima; ripreso = true; decisione = 'agisci'; } else decisione = 'rifiuta';
  }
  return { testo, ws, lingua, pLingua, prime, etichette, stanze, tutte: TUTTE.test(ws.join(' ')), ignota, colore, numero, decisione, intento, ripreso };
}

// --- Cosa fa la casa. Risponde con una frase fissa nella lingua del comando
export type Esito = { stato: Stato; messaggio: string; fuoco: Stanza | null; fatto: boolean };
const elenco = (l: Lingua, ss: Stanza[]) => {
  const n = ss.map(s => NOMI[s][l === 'en' ? 'inEn' : 'inIt']);
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} ${l === 'en' ? 'and' : 'e'} ${n[n.length - 1]}` : n[0]!;
};
const copia = (s: Stato): Stato => JSON.parse(JSON.stringify(s));

export function applica(stato: Stato, q: Passo, dove: Stanza, storia: Stato[]): Esito {
  const l = q.lingua, t = (en: string, it: string) => (l === 'en' ? en : it);
  if (q.ignota) return { stato, messaggio: t(`This house has no ${q.ignota}.`, `In questa casa non c'è ${/^[aeiou]/.test(q.ignota) ? "l'" : 'il '}${q.ignota}.`), fuoco: null, fatto: false };
  const s = copia(stato), ss = q.tutte ? [...STANZE] : q.stanze.length ? q.stanze : [dove], dove1 = ss.length === 1 ? ss[0]! : null;
  const fine = (en: string, it: string, fuoco: Stanza | null = dove1): Esito => { storia.push(copia(stato)); if (storia.length > 30) storia.shift(); return { stato: s, messaggio: t(en, it), fuoco, fatto: true }; };
  const tutteLe = (f: (x: StatoStanza) => void) => ss.forEach(k => f(s.stanze[k]));
  const dove2 = elenco(l, ss), perc = q.numero !== null && q.numero <= 100 ? q.numero / 100 : null;
  switch (q.intento) {
    case 'luce_accendi': {
      if (ss.every(k => stato.stanze[k].luce > 0) && perc === null) return { stato, messaggio: t(`The light is already on ${dove2}.`, `La luce è già accesa ${dove2}.`), fuoco: dove1, fatto: false };
      tutteLe(x => { x.luce = perc ?? Math.max(x.luce, 0.8); }); return fine(`Light on ${dove2}.`, `Luce accesa ${dove2}.`);
    }
    case 'luce_spegni': {
      if (ss.every(k => stato.stanze[k].luce === 0)) return { stato, messaggio: t(`The light is already off ${dove2}.`, `La luce è già spenta ${dove2}.`), fuoco: dove1, fatto: false };
      tutteLe(x => { x.luce = 0; }); return fine(`Light off ${dove2}.`, `Luce spenta ${dove2}.`);
    }
    case 'luce_su': tutteLe(x => { x.luce = perc ?? Math.min(1, Math.max(0.45, x.luce + 0.3)); }); return fine(`Brighter ${dove2}.`, `Più luce ${dove2}.`);
    case 'luce_giu': tutteLe(x => { x.luce = perc ?? (x.luce ? Math.max(0.12, x.luce - 0.3) : 0.25); }); return fine(`Dimmed ${dove2}.`, `Luce abbassata ${dove2}.`);
    case 'luce_colore': {
      const c = q.colore ?? LUCE_NORMALE;
      tutteLe(x => { x.colore = c; if (!x.luce) x.luce = 0.8; }); return fine(`New light colour ${dove2}.`, `Nuovo colore della luce ${dove2}.`);
    }
    case 'tapparelle_apri': tutteLe(x => { x.tapparelle = 1; }); return fine(`Blinds open ${dove2}.`, `Tapparelle aperte ${dove2}.`);
    case 'tapparelle_chiudi': tutteLe(x => { x.tapparelle = 0; }); return fine(`Blinds closed ${dove2}.`, `Tapparelle chiuse ${dove2}.`);
    case 'caldo_su': s.termostato = Math.min(26, s.termostato + 1); return fine(`Heating up to ${s.termostato}°.`, `Riscaldamento a ${s.termostato}°.`, 'ingresso');
    case 'caldo_giu': s.termostato = Math.max(15, s.termostato - 1); return fine(`Heating down to ${s.termostato}°.`, `Riscaldamento a ${s.termostato}°.`, 'ingresso');
    case 'temperatura': {
      if (q.numero === null) return { stato, messaggio: t('Which temperature? Try "set it to 21".', 'Che temperatura? Prova «mettila a 21».'), fuoco: null, fatto: false };
      s.termostato = Math.max(15, Math.min(28, q.numero)); return fine(`Thermostat set to ${s.termostato}°.`, `Termostato a ${s.termostato}°.`, 'ingresso');
    }
    case 'musica_play': s.musica = true; s.muto = false; return fine('Music on in the living room.', 'Musica accesa in soggiorno.', 'soggiorno');
    case 'musica_stop': if (!stato.musica) return { stato, messaggio: t('No music is playing.', 'Non c’è musica.'), fuoco: null, fatto: false }; s.musica = false; return fine('Music off.', 'Musica spenta.', 'soggiorno');
    case 'volume_su': s.volume = Math.min(1, s.volume + 0.25); s.muto = false; return fine(`Volume ${Math.round(s.volume * 100)}%.`, `Volume al ${Math.round(s.volume * 100)}%.`, 'soggiorno');
    case 'volume_giu': s.volume = Math.max(0.1, s.volume - 0.25); return fine(`Volume ${Math.round(s.volume * 100)}%.`, `Volume al ${Math.round(s.volume * 100)}%.`, 'soggiorno');
    case 'muto': s.muto = true; return fine('Muted.', 'Audio disattivato.', 'soggiorno');
    case 'pulisci': {
      const dove3 = q.stanze.length ? q.stanze : [...STANZE];
      s.pulizia = dove3; s.giri++; return fine(`The robot is cleaning ${q.stanze.length ? elenco(l, dove3) : 'the whole house'}.`, `Il robot pulisce ${q.stanze.length ? elenco(l, dove3) : 'tutta la casa'}.`, null);
    }
    case 'caffe': {
      if (q.stanze.length && !q.stanze.includes('cucina')) return { stato, messaggio: t('The coffee machine is in the kitchen.', 'La macchina del caffè è in cucina.'), fuoco: 'cucina', fatto: false };
      s.caffe++; return fine('Making a coffee in the kitchen.', 'Caffè in preparazione in cucina.', 'cucina');
    }
    case 'tv_accendi': case 'tv_spegni': {
      if (q.stanze.length && !q.stanze.includes('soggiorno')) return { stato, messaggio: t(`There is no TV ${elenco(l, q.stanze)}. It is in the living room.`, `Non c'è una TV ${elenco(l, q.stanze)}. È in soggiorno.`), fuoco: 'soggiorno', fatto: false };
      s.tv = q.intento === 'tv_accendi'; return fine(s.tv ? 'TV on.' : 'TV off.', s.tv ? 'TV accesa.' : 'TV spenta.', 'soggiorno');
    }
    case 'scena_notte':
      STANZE.forEach(k => { s.stanze[k].luce = 0; s.stanze[k].tapparelle = 0; }); s.tv = false; s.musica = false; s.termostato = 18;
      return fine('Good night: lights off, blinds down, heating at 18°.', 'Buonanotte: luci spente, tapparelle giù, riscaldamento a 18°.', null);
    case 'scena_esco':
      STANZE.forEach(k => { s.stanze[k].luce = 0; }); s.tv = false; s.musica = false; s.termostato = 17; s.pulizia = [...STANZE]; s.giri++;
      return fine('Bye: everything off, heating at 17°, and the robot cleans while you are out.', 'Ciao: tutto spento, riscaldamento a 17°, e il robot pulisce mentre sei fuori.', null);
    case 'scena_film':
      STANZE.forEach(k => { s.stanze[k].luce = 0; }); s.stanze.soggiorno.luce = 0.18; s.stanze.soggiorno.colore = '#ff9a5a'; s.stanze.soggiorno.tapparelle = 0; s.tv = true; s.musica = false;
      return fine('Movie mode: soft light, blinds down, TV on.', 'Modalità film: luce soffusa, tapparelle giù, TV accesa.', 'soggiorno');
    case 'scena_arrivo':
      s.stanze.ingresso.luce = 0.8; s.stanze.soggiorno.luce = Math.max(0.7, s.stanze.soggiorno.luce); s.stanze.cucina.luce = Math.max(0.5, s.stanze.cucina.luce); s.termostato = 21;
      return fine('Welcome home: lights on and heating at 21°.', 'Bentornato: luci accese e riscaldamento a 21°.', null);
    case 'annulla': {
      const indietro = storia.pop();
      if (!indietro) return { stato, messaggio: t('There is nothing to undo.', 'Non c’è niente da annullare.'), fuoco: null, fatto: false };
      return { stato: { ...indietro, caffe: stato.caffe, giri: stato.giri, pulizia: stato.pulizia }, messaggio: t('Undone.', 'Fatto, rimesso com’era.'), fuoco: null, fatto: true };
    }
  }
  return { stato, messaggio: t('This is not something the house can do.', 'Questo la casa non lo sa fare.'), fuoco: null, fatto: false };
}

// Nomi leggibili degli intenti, nelle due lingue
export const INTENTI: Record<string, { en: string; it: string }> = {
  luce_accendi: { en: 'light on', it: 'accendi luce' }, luce_spegni: { en: 'light off', it: 'spegni luce' }, luce_su: { en: 'brighter', it: 'più luce' }, luce_giu: { en: 'dimmer', it: 'meno luce' },
  luce_colore: { en: 'light colour', it: 'colore luce' }, tapparelle_apri: { en: 'open blinds', it: 'apri tapparelle' }, tapparelle_chiudi: { en: 'close blinds', it: 'chiudi tapparelle' },
  caldo_su: { en: 'warmer', it: 'più caldo' }, caldo_giu: { en: 'cooler', it: 'più fresco' }, temperatura: { en: 'set temperature', it: 'imposta gradi' }, musica_play: { en: 'play music', it: 'musica' },
  musica_stop: { en: 'stop music', it: 'ferma musica' }, volume_su: { en: 'louder', it: 'più forte' }, volume_giu: { en: 'quieter', it: 'più piano' }, muto: { en: 'mute', it: 'muto' },
  pulisci: { en: 'vacuum', it: 'aspirapolvere' }, caffe: { en: 'coffee', it: 'caffè' }, tv_accendi: { en: 'TV on', it: 'accendi TV' }, tv_spegni: { en: 'TV off', it: 'spegni TV' },
  scena_notte: { en: 'scene: night', it: 'scena: notte' }, scena_esco: { en: 'scene: away', it: 'scena: esco' }, scena_film: { en: 'scene: movie', it: 'scena: film' }, scena_arrivo: { en: 'scene: home', it: 'scena: arrivo' },
  annulla: { en: 'undo', it: 'annulla' }, anche: { en: 'same again', it: 'anche qui' }, fuori: { en: 'not for the house', it: 'non per la casa' },
};
