// Legge i termini del glossario dai file Markdown in src/content/glossario.
// La cartella "2 Generative models" dà sezione e ordine delle sezioni; il testo della nota dà definizione e punti.
// Le proprietà hanno la forma controllata dalla build in src/content.config.ts.
export type Voce = {
  id: string; termine: string; livello: string; sotto: string;
  definizione: string[]; punti: string[];
  domanda: { testo: string; risposte: string[] };
  sezione: string; indiceSezione: number;
};

const valore = (t: string) => {
  const s = t.trim();
  if (s.startsWith('"')) { try { return JSON.parse(s) as string; } catch { return s.slice(1, -1); } }
  return s.startsWith("'") ? s.slice(1, -1).replace(/''/g, "'") : s;
};

function leggiNota(testo: string) {
  const righe = testo.replace(/\r\n/g, '\n').split('\n'), fine = righe.indexOf('---', 1);
  const prop: Record<string, string | string[]> = {};
  let lista = '';
  for (const r of righe.slice(1, fine)) {
    const v = r.match(/^\s*- (.*)$/), k = r.match(/^([a-z]+):\s*(.*)$/);
    if (v && lista) (prop[lista] as string[]).push(valore(v[1]!));
    else if (k) { lista = k[2] ? '' : k[1]!; prop[k[1]!] = k[2] ? valore(k[2]) : []; }
  }
  const definizione: string[] = [], punti: string[] = [];
  for (const blocco of righe.slice(fine + 1).join('\n').split(/\n\s*\n/)) {
    const pezzi = blocco.split('\n').map(x => x.trim()).filter(Boolean);
    if (!pezzi.length) continue;
    if (pezzi[0]!.startsWith('- ')) pezzi.forEach(x => (x.startsWith('- ') ? punti.push(x.slice(2)) : punti[punti.length - 1] += ` ${x}`));
    else definizione.push(pezzi.join(' '));
  }
  return { prop, definizione, punti };
}

export function leggiVoci(file: Record<string, string>): Voce[] {
  const note = Object.entries(file).map(([percorso, testo]) => {
    const m = percorso.match(/glossario\/(\d+) ([^/]+)\/([^/]+)\.md$/);
    if (!m) throw new Error(`Glossario: percorso non valido: ${percorso}`);
    return { n: Number(m[1]), sezione: m[2]!, nome: m[3]!, ...leggiNota(testo) };
  }).filter(x => x.prop.draft !== 'true');
  const sezioni = [...new Set(note.map(x => x.n))].sort((a, b) => a - b);
  // Una nota senza order va in fondo alla sua sezione
  const ordine = (x: (typeof note)[number]) => Number(x.prop.order ?? Infinity);
  note.sort((a, b) => a.n - b.n || ordine(a) - ordine(b) || a.nome.localeCompare(b.nome));
  return note.map(x => ({
    id: (x.prop.id as string) || x.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    termine: x.prop.title as string,
    livello: x.prop.level as string,
    sotto: x.prop.group as string,
    definizione: x.definizione,
    punti: x.punti,
    domanda: { testo: x.prop.question as string, risposte: x.prop.answers as string[] },
    sezione: x.sezione,
    indiceSezione: sezioni.indexOf(x.n),
  }));
}
