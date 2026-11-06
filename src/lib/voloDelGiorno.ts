import { TINTE_SEZIONI, VOCI, type Voce } from './glossario';

// Il volo del giorno di AI terms: sei aerei, uno per sezione del glossario, ognuno con un termine.
// La data fa da seme: lo stesso giorno tutti hanno gli stessi termini, con le risposte nello stesso ordine. Non serve un server.
// Risultati e serie restano in questo browser (localStorage). Se una sezione riceve una nota nuova, la scelta del giorno può cambiare.

export const SEZIONI = [...new Set(VOCI.map(v => v.indiceSezione))].sort((a, b) => a - b);
// Il primo volo del giorno è il numero 1
const PRIMO = new Date(2026, 10, 6);

export function oggi(d = new Date()) {
  const chiave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const n = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - PRIMO.getTime()) / 864e5) + 1;
  return { chiave, n };
}

const seme = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const mulberry = (a: number) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type Volo = { indice: number; sezione: number; nome: string; voce: Voce; risposte: string[]; codice: string; tinta: string };
export function voliDel(chiave: string): Volo[] {
  const r = mulberry(seme(`ai-terms ${chiave}`));
  return SEZIONI.map((s, i) => {
    const tutte = VOCI.filter(v => v.indiceSezione === s);
    const voce = tutte[Math.floor(r() * tutte.length)]!;
    const risposte = [...voce.domanda.risposte];
    for (let k = risposte.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [risposte[k], risposte[j]] = [risposte[j]!, risposte[k]!]; }
    return { indice: i, sezione: s, nome: voce.sezione, voce, risposte, codice: `AT${String(i + 1).padStart(2, '0')}`, tinta: TINTE_SEZIONI[s % TINTE_SEZIONI.length]! };
  });
}

// Un timbro sul biglietto: posizione in percentuale, angolo in gradi, verde se giusto
export type Timbro = { x: number; y: number; a: number; ok: boolean };
// tentativi: quante risposte date, compresa quella giusta. fatto: il volo è partito
export type Partita = { chiave: string; tentativi: number[]; fatto: boolean[]; sbagliate: string[][]; timbri: Timbro[][] };
export type Serie = { ultimo: number; serie: number; migliore: number; giocati: number };

const K = 'ai-terms-volo', KS = 'ai-terms-serie';
const leggi = <T>(k: string): T | null => { try { return JSON.parse(localStorage.getItem(k) ?? 'null') as T | null; } catch { return null; } };
const salva = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* niente */ } };

export function partita(chiave: string, n: number): Partita {
  const p = leggi<Partita>(K);
  if (p && p.chiave === chiave && p.tentativi?.length === n) return p;
  return { chiave, tentativi: Array(n).fill(0), fatto: Array(n).fill(false), sbagliate: Array.from({ length: n }, () => []), timbri: Array.from({ length: n }, () => []) };
}
export const salvaPartita = (p: Partita) => salva(K, p);

const serie = (): Serie => leggi<Serie>(KS) ?? { ultimo: 0, serie: 0, migliore: 0, giocati: 0 };
// La serie conta i giorni di fila con tutti i voli partiti. Se l'ultimo giorno finito è prima di ieri, è rotta
export function serieOra(n: number): Serie { const s = serie(); return { ...s, serie: s.ultimo >= n - 1 ? s.serie : 0 }; }
export function chiudiGiorno(n: number): Serie {
  const s = serie();
  if (s.ultimo === n) return s;
  s.serie = s.ultimo === n - 1 ? s.serie + 1 : 1;
  s.ultimo = n;
  s.migliore = Math.max(s.migliore, s.serie);
  s.giocati++;
  salva(KS, s);
  return s;
}

// Il quadratino di ogni volo: verde al primo colpo, giallo al secondo, rosso dopo
export const quadro = (t: number) => (t <= 1 ? '🟩' : t === 2 ? '🟨' : '🟥');
export function testoDaCondividere(n: number, p: Partita, serieN: number) {
  const primi = p.tentativi.filter(t => t === 1).length;
  return `AI terms #${n} ✈️ ${primi}/${p.tentativi.length} first try\n${p.tentativi.map(quadro).join('')}\nstreak ${serieN}\nhttps://btwsonorico.github.io/learn/airport/`;
}
