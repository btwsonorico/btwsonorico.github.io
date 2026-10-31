import { getCollection } from 'astro:content';

export type TipoNodo = 'testo' | 'tema' | 'fonte' | 'area' | 'tech';
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

// Projects: aree, tecnologie e i testi che ogni area cita in "related".
export async function grafoAree(): Promise<DatiGrafo> {
  const aree = await areePubbliche();
  const scritti = await scrittiPubblici();
  const nodi: Nodo[] = [];
  const archi: [string, string][] = [];
  const aggiungi = (n: Nodo) => { if (!nodi.some(x => x.id === n.id)) nodi.push(n); };
  for (const p of aree) {
    aggiungi({ id: `area:${p.id}`, tipo: 'area', label: p.data.title, href: `/projects/${p.id}/` });
    for (const t of p.data.stack) { aggiungi({ id: `tech:${t}`, tipo: 'tech', label: t }); archi.push([`area:${p.id}`, `tech:${t}`]); }
    for (const r of p.data.related) {
      const s = scritti.find(x => x.id === r);
      if (!s) throw new Error(`L'area "${p.id}" cita "${r}" in related, ma il testo non esiste.`);
      aggiungi({ id: s.id, tipo: 'testo', label: s.data.title, href: `/knowledge/${s.id}/` });
      archi.push([`area:${p.id}`, s.id]);
    }
  }
  return chiudi(nodi, archi);
}
