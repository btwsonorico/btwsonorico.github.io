import { TINTE_SEZIONI, VOCI, type Voce } from './glossario';

// AI terms come serie infinita. Ci sono sei aerei, uno per sezione del glossario; ognuno porta un termine a caso della
// sua sezione. Quando il termine è indovinato, l'aereo fa il suo giro con lo striscione, poi torna in attesa con un
// termine nuovo. La serie conta i termini indovinati di fila al primo colpo; un errore la azzera.
// Ogni termine indovinato entra nell'album. Serie, record e album restano in questo browser (localStorage):
// si perdono se si cancellano i dati del sito, in navigazione privata, e su Safari dopo 7 giorni senza visite.

export const SEZIONI = [...new Set(VOCI.map(v => v.indiceSezione))].sort((a, b) => a - b);
export const TOTALE = VOCI.length;

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
const KS = 'ai-terms-serie-v2', KA = 'ai-terms-album';
export const serie = (): Serie => leggi<Serie>(KS) ?? { ora: 0, migliore: 0 };
export function segnaRisposta(giusto: boolean, primoColpo: boolean): Serie {
  const s = serie();
  if (!giusto) s.ora = 0;
  else if (primoColpo) { s.ora++; s.migliore = Math.max(s.migliore, s.ora); }
  salva(KS, s);
  return s;
}

// L'album: una pagina per termine indovinato, con quante volte e il miglior risultato
export type Pagina = { termine: string; sezione: number; livello: string; primo: number; volte: number; quando: string };
export const album = (): Record<string, Pagina> => leggi<Record<string, Pagina>>(KA) ?? {};
export function incolla(v: Volo, tentativi: number) {
  const a = album(), vecchia = a[v.voce.id];
  a[v.voce.id] = { termine: v.voce.termine, sezione: v.sezione, livello: v.voce.livello, primo: Math.min(vecchia?.primo ?? 99, tentativi), volte: (vecchia?.volte ?? 0) + 1, quando: new Date().toISOString().slice(0, 10) };
  salva(KA, a);
  return a;
}
