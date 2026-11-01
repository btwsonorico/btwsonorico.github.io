import type { APIRoute } from 'astro';
import { COMPETENZE, COMPETENZE_ADVISORY } from '../content.config';
import { scrittiPubblici } from '../lib/grafi';
import { SITO } from '../lib/sito';

// llms.txt: il sito riassunto in testo semplice, per gli strumenti AI che lo leggono (convenzione proposta su llmstxt.org)
export const GET: APIRoute = async ({ site }) => {
  const url = (p: string) => new URL(p, site).href;
  const scritti = await scrittiPubblici();
  const righe = [
    `# ${SITO.nome}`,
    '',
    `> ${SITO.ruolo} at ${SITO.ente} (${SITO.gruppo}). ${SITO.bio}`,
    '',
    `Contact: ${SITO.email} · GitHub: ${SITO.github} · LinkedIn: ${SITO.linkedin}`,
    '',
    '## Software',
    `What I build: key skills, areas and the projects where I learned them. ${url('/software/')}`,
    ...Object.values(COMPETENZE).map(c => `- ${c.title}: ${c.summary}`),
    '',
    '## Advisory',
    `How I help organisations adopt AI. ${url('/advisory/')}`,
    ...Object.values(COMPETENZE_ADVISORY).map(c => `- ${c.title}: ${c.summary}`),
    '',
    '## Knowledge',
    `Notes on papers, talks and books. ${url('/knowledge/')}`,
    ...scritti.map(s => `- [${s.data.title}](${url(`/knowledge/${s.id}/`)}): ${s.data.summary}`),
  ];
  return new Response(righe.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
