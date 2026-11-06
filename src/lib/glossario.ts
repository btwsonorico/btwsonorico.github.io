import { leggiVoci, type Voce } from './glossarioTesto';

// Glossario: ogni termine è una nota in src/content/glossario/<numero> <sezione>/. Il reef da pesca legge da qui:
// una nota nuova diventa da sola un termine pescabile. Per il modello, vedi src/content/template-termine.md.
export type { Voce };
// Il colore di ogni sezione: lo usano i banchi di pesci del reef e i biglietti dei termini
export const TINTE_SEZIONI = ['#d9ecf2', '#f7cf4f', '#f0603f', '#3e6795', '#8fd6b4', '#ff9fb4'];
export const VOCI: Voce[] = leggiVoci(import.meta.glob('../content/glossario/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>);

// Una voce di elenco "Nome: testo" o "Nome – testo" mostra il nome in evidenza
export const dividi = (punto: string) => {
  const m = punto.match(/^([^:–]{2,70}?)(?::| –) (.+)$/);
  return m ? { nome: m[1]!, testo: m[2]! } : { nome: '', testo: punto };
};
