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
  'ai-engineering': { title: 'AI engineering', summary: 'Prompts, grounded output, evaluation and pipelines around LLMs.' },
  'human-ai': { title: 'Human-AI product design', summary: 'Tools where the person decides and the AI assists.' },
  backend: { title: 'Backend and data', summary: 'APIs, background jobs, data integrity and telemetry.' },
  practice: { title: 'Engineering practice', summary: 'Specs before code, honest tests, one-command deploys.' },
} as const;
const CHIAVI_COMPETENZE = Object.keys(COMPETENZE) as [keyof typeof COMPETENZE, ...(keyof typeof COMPETENZE)[]];
// Advisory: competenze chiave della consulenza e metodi usati. Solo descrizioni generali: mai clienti, settori o dettagli dei framework.
export const COMPETENZE_ADVISORY = {
  strategy: { title: 'AI strategy', summary: 'Where an organisation stands with AI, and where it can go.' },
  opportunities: { title: 'Opportunity mapping', summary: 'Which processes and use cases are worth doing with AI.' },
  design: { title: 'Business design', summary: 'How the process changes with AI, and what it is worth.' },
  adoption: { title: 'People and adoption', summary: 'From AI used on single tasks to AI that changes the whole process.' },
  engagement: { title: 'Engagement management', summary: 'Running an advisory project: clear goals, evidence, and outputs both business and engineering understand.' },
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

export const collections = { scritti, aree, advisory };
