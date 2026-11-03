import { getCollection } from 'astro:content';
import { COMPETENZE, COMPETENZE_ADVISORY } from '../content.config';

export type TipoNodo = 'testo' | 'tema' | 'fonte' | 'area' | 'tech' | 'skill';
export interface Nodo { id: string; tipo: TipoNodo; label: string; href?: string; debole?: boolean }
// Stella: un testo meno recente. Nel grafo è un punto piccolo che gira intorno ai suoi temi, senza archi.
export interface Stella { id: string; label: string; href: string; temi: string[] }
export interface DatiGrafo { nodi: Nodo[]; archi: [string, string][]; stelle?: Stella[] }

// Per ogni tema, solo i testi più recenti sono nodi pieni: il grafo resta leggibile anche con molti testi.
export const MAX_PER_TEMA = 4;

export const scrittiPubblici = async () =>
  (await getCollection('scritti', ({ data }) => !data.draft)).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

export const areePubbliche = async () =>
  (await getCollection('aree', ({ data }) => !data.draft)).sort((a, b) => a.data.order - b.data.order);

export const advisoryPubbliche = async () =>
  (await getCollection('advisory', ({ data }) => !data.draft)).sort((a, b) => a.data.order - b.data.order);

// Le due sezioni con competenze chiave e aree: stessa forma, contenuti diversi
export type Sezione = 'projects' | 'advisory';
export const sezioni = {
  projects: { competenze: COMPETENZE as Record<string, { title: string; summary: string }>, aree: areePubbliche },
  advisory: { competenze: COMPETENZE_ADVISORY as Record<string, { title: string; summary: string }>, aree: advisoryPubbliche },
};

function chiudi(nodi: Nodo[], archi: [string, string][]): DatiGrafo {
  const ids = new Set(nodi.map(n => n.id));
  const visti = new Set<string>();
  return {
    nodi,
    archi: archi.filter(([a, b]) => {
      const k = [a, b].sort().join('|');
      if (!ids.has(a) || !ids.has(b) || a === b || visti.has(k)) return false;
      visti.add(k);
      return true;
    }),
  };
}

// Knowledge: essay, note sulle fonti e pensieri con almeno una fonte. graph: true/false forza la scelta.
const testiNelGrafo = async () => (await scrittiPubblici())
  .filter(s => s.data.graph ?? (s.data.kind !== 'thought' || s.data.sources.length > 0));

// Pagina di un tema con tutti i suoi testi
export const hrefTema = (t: string) => `/knowledge/t/${t}/`;

// Temi con il numero di testi, dal più usato. Servono alle etichette sopra le liste.
export async function contaTemi() {
  const conta = new Map<string, number>();
  for (const s of await scrittiPubblici()) for (const t of s.data.topics) conta.set(t, (conta.get(t) ?? 0) + 1);
  return [...conta].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([nome, n]) => ({ nome, n }));
}

// fonti: false dà la vista compatta, solo testi e temi. Le fonti restano nella pagina di ogni testo.
export async function grafoKnowledge({ fonti = true } = {}): Promise<DatiGrafo> {
  const testi = await testiNelGrafo();
  // Un testo è un nodo pieno se è fra i MAX_PER_TEMA più recenti di almeno un suo tema (i testi sono già dal più recente)
  const visti = new Map<string, number>();
  const pieni = new Set<string>();
  for (const s of testi) {
    if (!s.data.topics.length) pieni.add(s.id);
    for (const t of s.data.topics) {
      const n = visti.get(t) ?? 0;
      if (n < MAX_PER_TEMA) pieni.add(s.id);
      visti.set(t, n + 1);
    }
  }
  const nodi: Nodo[] = [];
  const archi: [string, string][] = [];
  const stelle: Stella[] = [];
  const aggiungi = (n: Nodo) => { if (!nodi.some(x => x.id === n.id)) nodi.push(n); };
  for (const s of testi) {
    if (!pieni.has(s.id)) {
      stelle.push({ id: s.id, label: s.data.title, href: `/knowledge/${s.id}/`, temi: s.data.topics.map(t => `tema:${t}`) });
      continue;
    }
    aggiungi({ id: s.id, tipo: 'testo', label: s.data.title, href: `/knowledge/${s.id}/` });
    for (const t of s.data.topics) { aggiungi({ id: `tema:${t}`, tipo: 'tema', label: `#${t}`, href: hrefTema(t) }); archi.push([s.id, `tema:${t}`]); }
    for (const f of fonti ? s.data.sources : []) {
      const id = `fonte:${f.url}`;
      // Se una fonte è principale in almeno un testo, nel grafo resta piena
      const esistente = nodi.find(n => n.id === id);
      if (esistente) esistente.debole &&= f.role === 'secondary';
      else aggiungi({ id, tipo: 'fonte', label: `[${f.type}] ${f.title}`, href: f.url, debole: f.role === 'secondary' });
      archi.push([s.id, id]);
    }
    for (const m of (s.body ?? '').matchAll(/\/knowledge\/([\w-]+)\//g)) archi.push([s.id, m[1]!]);
  }
  return { ...chiudi(nodi, archi), stelle };
}

// Dati per le scene 3D di Projects (bosco) e Advisory (laghetto): competenze, aree, peso e numero di punti.
// peso: tecnologie (Projects) o metodi (Advisory) dell'area; punti: righe "- " del suo file.
export async function datiCompetenze(sezione: Sezione) {
  const { competenze, aree: carica } = sezioni[sezione];
  // Projects si chiama Software: le pagine stanno in /software/
  const percorso = sezione === 'projects' ? 'software' : sezione;
  const aree = await carica();
  const scritti = await scrittiPubblici();
  for (const a of aree) for (const r of a.data.related)
    if (!scritti.some(x => x.id === r)) throw new Error(`L'area "${a.id}" cita "${r}" in related, ma il testo non esiste.`);
  // Solo Projects: i progetti dove ho imparato le aree
  const progetti = sezione === 'projects'
    ? (await getCollection('progetti', ({ data }) => !data.draft)).sort((a, b) => a.data.order - b.data.order)
    : [];
  const viste = new Set<string>();
  for (const p of progetti) for (const id of p.data.learned) {
    if (!aree.some(a => a.id === id)) throw new Error(`Il progetto "${p.id}" cita l'area "${id}" in learned, ma l'area non esiste.`);
    if (viste.has(id)) throw new Error(`L'area "${id}" è in learned di più progetti: un'area si impara in un progetto solo.`);
    viste.add(id);
  }
  return {
    progetti: progetti.map(p => ({ id: p.id, label: p.data.title, aree: p.data.learned, strumenti: p.data.tools, crescita: p.data.growing })),
    competenze: Object.entries(competenze)
      .filter(([id]) => aree.some(a => a.data.skill === id))
      .map(([id, c]) => ({
        id, label: c.title, href: `/${percorso}/#${id}`, sintesi: c.summary,
        aree: aree.filter(a => a.data.skill === id).map(a => ({
          id: a.id, label: a.data.title, href: `/${percorso}/#${id}`, sintesi: a.data.summary,
          peso: ('stack' in a.data ? a.data.stack : a.data.methods).length,
          punti: (a.body?.match(/^- /gm) ?? []).length,
        })),
      })),
  };
}
