import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Liste chiuse: tengono piccoli i grafi. Un valore fuori lista ferma la build.
// Per aggiungere un tema o una tecnologia, cambia la lista qui.
export const TEMI = ['retrieval', 'llms', 'methods', 'segmentation', 'qualitative', 'engineering', 'open', 'hmi', 'implications', 'research', 'agents'] as const;
export const TECNOLOGIE = ['python', 'fastapi', 'typescript', 'react', 'mongodb', 'aws', 'azure', 'docker', 'llm-api', 'scikit-learn', 'playwright', 'spec-kit', 'astro', 'three.js'] as const;
// Dove ho imparato un'area: nomi generici, mai clienti o nomi interni.
export const CONTESTI = ['interview analysis', 'event reports', 'feedback hub', 'shared specs', 'this site'] as const;
// Competenze chiave: raggruppano le aree nella pagina Projects, in questo ordine.
export const COMPETENZE = {
  'ai-engineering': { title: 'AI engineering', summary: 'Making AI output reliable and traceable.' },
  'human-ai': { title: 'Human-AI product design', summary: 'Tools where people decide and AI helps.' },
  backend: { title: 'Backend and data', summary: 'The parts users do not see: data, jobs, metrics.' },
  practice: { title: 'Engineering practice', summary: 'How I plan, test and ship.' },
} as const;
const CHIAVI_COMPETENZE = Object.keys(COMPETENZE) as [keyof typeof COMPETENZE, ...(keyof typeof COMPETENZE)[]];
// Advisory: competenze chiave della consulenza e metodi usati. Solo descrizioni generali: mai clienti, settori o dettagli dei framework.
export const COMPETENZE_ADVISORY = {
  strategy: { title: 'AI strategy', summary: 'Where to start with AI.' },
  opportunities: { title: 'Opportunity mapping', summary: 'Where AI creates value.' },
  design: { title: 'Business design', summary: 'How the work changes, and what it is worth.' },
  adoption: { title: 'People and adoption', summary: 'Helping people really use AI.' },
  engagement: { title: 'Engagement management', summary: 'Running the project, from first interview to final report.' },
} as const;
const CHIAVI_ADVISORY = Object.keys(COMPETENZE_ADVISORY) as [keyof typeof COMPETENZE_ADVISORY, ...(keyof typeof COMPETENZE_ADVISORY)[]];
export const METODI = ['interviews', 'benchmarking', 'literature review', 'process mapping', 'prioritisation matrix', 'business case', 'survey', 'field experiment', 'kpi design'] as const;
export const TIPI_FONTE =['paper', 'video', 'site', 'book', 'talk', 'podcast', 'repo'] as const;

const fuoriLista = (cosa: string, lista: readonly string[]) => ({
  errorMap: () => ({ message: `${cosa} non valido. Valori permessi: ${lista.join(', ')}. Per aggiungerne uno, cambia la lista in src/content.config.ts.` }),
});

// Testi: un file Markdown per testo. Le proprietà in testa al file sono le "Properties" di Obsidian.
const scritti = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/scritti' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    kind: z.enum(['essay', 'thought', 'source']),
    summary: z.string(),
    lang: z.enum(['it', 'en']),
    topics: z.array(z.enum(TEMI, fuoriLista('Tema', TEMI))).default([]),
    // Fonti: paper, video, siti... Facoltative. Ogni fonte entra nel grafo.
    // role: main → link in evidenza in cima al testo; secondary → solo nella lista delle fonti in fondo.
    sources: z.array(z.object({
      type: z.enum(TIPI_FONTE, fuoriLista('Tipo di fonte', TIPI_FONTE)),
      title: z.string(),
      author: z.string().optional(),
      url: z.string().url(),
      role: z.enum(['main', 'secondary']).default('main'),
    })).default([]),
    // Nel grafo entrano essay, note sulle fonti e pensieri con almeno una fonte.
    // graph: true aggiunge un pensiero senza fonti; graph: false toglie qualsiasi testo.
    graph: z.boolean().optional(),
    draft: z.boolean().default(false),
  }),
});

// Aree: cosa ho imparato costruendo strumenti, non l'elenco dei progetti. Un file Markdown per area.
const aree = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/aree' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    // Ordine nella lista (1 = prima)
    order: z.number(),
    // Competenza chiave a cui appartiene l'area
    skill: z.enum(CHIAVI_COMPETENZE, fuoriLista('Competenza', CHIAVI_COMPETENZE)),
    stack: z.array(z.enum(TECNOLOGIE, fuoriLista('Tecnologia', TECNOLOGIE))).default([]),
    contexts: z.array(z.enum(CONTESTI, fuoriLista('Contesto', CONTESTI))).default([]),
    // Testi collegati all'area (nome del file senza .md)
    related: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Advisory: un file Markdown per area di consulenza, sotto una competenza chiave.
const advisory = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/advisory' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number(),
    skill: z.enum(CHIAVI_ADVISORY, fuoriLista('Competenza advisory', CHIAVI_ADVISORY)),
    methods: z.array(z.enum(METODI, fuoriLista('Metodo', METODI))).default([]),
    related: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Progetti: dove ho imparato le aree di Projects. Nomi generici, mai clienti o nomi interni.
// learned: aree imparate in questo progetto (nome del file in src/content/aree, senza .md); ogni area in un solo progetto.
// tools: gli strumenti chiave usati nel progetto. growing: cose che sto iniziando a imparare qui, alberelli nel bosco.
const progetti = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/progetti' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number(),
    learned: z.array(z.string()).default([]),
    tools: z.array(z.enum(TECNOLOGIE, fuoriLista('Tecnologia', TECNOLOGIE))).default([]),
    growing: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Glossario: un file Markdown per termine, in una cartella "<numero> <sezione>". Il reef legge le note in src/lib/glossario.ts;
// questa collezione serve a fermare la build se una nota è scritta male.
const glossario = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/glossario' }),
  schema: z.object({
    title: z.string(),
    id: z.string().regex(/^[a-z0-9-]+$/).optional(),
    order: z.number().optional(),
    level: z.enum(['easy', 'medium', 'hard']),
    group: z.string(),
    question: z.string(),
    // Sempre tre risposte: la prima è quella giusta, il gioco le mescola
    answers: z.array(z.string()).length(3),
    draft: z.boolean().default(false),
  }),
});

// Timeline: un file Markdown per evento della storia dell'AI, in src/content/timeline. La pagina della timeline lo legge;
// kind decide il filtro (ricerca, sistemi e modelli, aziende, società). checked: false = bozza ancora da controllare
export const TIPI_EVENTO = ['research', 'system', 'company', 'society'] as const;
const timeline = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/timeline' }),
  schema: z.object({
    title: z.string(),
    year: z.number().int().min(1940).max(2100),
    month: z.number().int().min(1).max(12).optional(),
    kind: z.enum(TIPI_EVENTO, fuoriLista('Tipo di evento', TIPI_EVENTO)),
    who: z.string(),
    source: z.string().url(),
    checked: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { scritti, aree, advisory, progetti, glossario, timeline };
