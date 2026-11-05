import { leggiVoci, type Voce } from './glossarioTesto';

// Glossario: ogni termine è una nota in src/content/glossario/<numero> <sezione>/. Il reef da pesca legge da qui:
// una nota nuova diventa da sola un termine pescabile. Per il modello, vedi src/content/template-termine.md.
export type { Voce };
export const VOCI: Voce[] = leggiVoci(import.meta.glob('../content/glossario/*/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>);

// Una voce di elenco "Nome: testo" o "Nome – testo" mostra il nome in evidenza
export const dividi = (punto: string) => {
  const m = punto.match(/^([^:–]{2,70}?)(?::| –) (.+)$/);
  return m ? { nome: m[1]!, testo: m[2]! } : { nome: '', testo: punto };
};
