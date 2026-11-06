import { TINTE_SEZIONI, VOCI, type Voce } from './glossario';

// AI terms come serie infinita. Ci sono sei aerei, uno per sezione del glossario; ognuno porta un termine a caso della
// sua sezione. Quando il termine è indovinato, l'aereo fa il suo giro con lo striscione, poi torna in attesa con un
// termine nuovo. La serie conta i termini indovinati di fila al primo colpo; un errore la azzera.
// La serie e i record restano in questo browser (localStorage): si perdono se si cancellano i dati del sito,
// in navigazione privata, e su Safari dopo 7 giorni senza visite.

export const SEZIONI = [...new Set(VOCI.map(v => v.indiceSezione))].sort((a, b) => a - b);

export type Volo = { indice: number; sezione: number; nome: string; voce: Voce; risposte: string[]; codice: string; tinta: string; seriale: string };
// Un termine nuovo per l'aereo i, evitando quelli usati di recente quando si può
export function nuovoVolo(i: number, evita: string[] = []): Volo {
  const s = SEZIONI[i]!, tutte = VOCI.filter(v => v.indiceSezione === s), libere = tutte.filter(v => !evita.includes(v.id));
  const scelta = (libere.length ? libere : tutte), voce = scelta[Math.floor(Math.random() * scelta.length)]!;
  const risposte = [...voce.domanda.risposte];
  for (let k = risposte.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [risposte[k], risposte[j]] = [risposte[j]!, risposte[k]!]; }
  return { indice: i, sezione: s, nome: voce.sezione, voce, risposte, codice: `AT${String(i + 1).padStart(2, '0')}`, tinta: TINTE_SEZIONI[s % TINTE_SEZIONI.length]!, seriale: String(Math.floor(Math.random() * 1e6)).padStart(6, '0') };
}

// Un timbro sul biglietto: posizione in percentuale, angolo in gradi, verde se giusto
export type Timbro = { x: number; y: number; a: number; ok: boolean };
// Lo stato di ogni aereo, solo in memoria: risposte date, partito o no, risposte sbagliate, timbri
export type Partita = { tentativi: number[]; fatto: boolean[]; sbagliate: string[][]; timbri: Timbro[][] };
export const nuovaPartita = (n: number): Partita => ({ tentativi: Array(n).fill(0), fatto: Array(n).fill(false), sbagliate: Array.from({ length: n }, () => []), timbri: Array.from({ length: n }, () => []) });
export function azzera(p: Partita, i: number) { p.tentativi[i] = 0; p.fatto[i] = false; p.sbagliate[i] = []; p.timbri[i] = []; }

const leggi = <T>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) ?? 'null') as T | null; } catch { return null; } };
const salva = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* niente */ } };

// La serie: adesso e il record
export type Serie = { ora: number; migliore: number };
const KS = 'ai-terms-serie-v2';
export const serie = (): Serie => leggi<Serie>(KS) ?? { ora: 0, migliore: 0 };
export function segnaRisposta(giusto: boolean, primoColpo: boolean): Serie {
  const s = serie();
  if (!giusto) s.ora = 0;
  else if (primoColpo) { s.ora++; s.migliore = Math.max(s.migliore, s.ora); }
  salva(KS, s);
  return s;
}

// Un volo per un termine preciso: va all'aereo della sua sezione
export function voloDa(voce: Voce): Volo {
  const i = SEZIONI.indexOf(voce.indiceSezione), base = nuovoVolo(i);
  const risposte = [...voce.domanda.risposte];
  for (let k = risposte.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [risposte[k], risposte[j]] = [risposte[j]!, risposte[k]!]; }
  return { ...base, voce, nome: voce.sezione, risposte };
}

// Il quiz: sei termini a caso, due facili, due medi e due difficili, dal più facile al più difficile
export function quiz(): Voce[] {
  const scelti: Voce[] = [];
  for (const l of ['easy', 'medium', 'hard']) {
    const tutti = VOCI.filter(v => v.livello === l && !scelti.includes(v));
    for (let k = 0; k < 2 && tutti.length; k++) scelti.push(tutti.splice(Math.floor(Math.random() * tutti.length), 1)[0]!);
  }
  return scelti;
}
// Un termine a caso per l'endless, evitando quelli recenti
export function aCaso(evita: string[]): Voce {
  const libere = VOCI.filter(v => !evita.includes(v.id));
  const da = libere.length ? libere : VOCI;
  return da[Math.floor(Math.random() * da.length)]!;
}

// I record del quiz (giuste al primo colpo su 6) e dell'endless (giuste prima di finire le vite)
export type Primati = { quiz: number; endless: number };
const KR = 'ai-terms-record';
export const primati = (): Primati => leggi<Primati>(KR) ?? { quiz: 0, endless: 0 };
export function segnaPrimato(campo: keyof Primati, valore: number): boolean {
  const r = primati();
  if (valore <= r[campo]) return false;
  r[campo] = valore;
  salva(KR, r);
  return true;
}
