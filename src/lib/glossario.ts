import dati from '../data/glossario.json';

// Glossario: i testi stanno in src/data/glossario.json. Il reef da pesca legge da qui:
// una voce nuova nel file diventa da sola un termine pescabile.
export type Voce = (typeof dati.sezioni)[number]['voci'][number] & { sezione: string; indiceSezione: number };
export const VOCI: Voce[] = dati.sezioni.flatMap((s, indiceSezione) => s.voci.map(v => ({ ...v, sezione: s.titolo, indiceSezione })));

// Una voce di elenco "Nome: testo" o "Nome – testo" mostra il nome in evidenza
export const dividi = (punto: string) => {
  const m = punto.match(/^([^:–]{2,70}?)(?::| –) (.+)$/);
  return m ? { nome: m[1]!, testo: m[2]! } : { nome: '', testo: punto };
};
