import type { APIRoute } from 'astro';
import { advisoryPubbliche, areePubbliche, contaTemi, scrittiPubblici } from '../lib/grafi';

// Mappa del sito per i motori di ricerca: le pagine principali e tutte le pagine di aree, testi e temi
export const GET: APIRoute = async ({ site }) => {
  const percorsi = [
    '/', '/software/', '/advisory/', '/knowledge/', '/learn/', '/learn/ai-terms/', '/learn/neural-network/', '/learn/diffusion/',
    ...(await areePubbliche()).map(a => `/software/${a.id}/`),
    ...(await advisoryPubbliche()).map(a => `/advisory/${a.id}/`),
    ...(await scrittiPubblici()).map(s => `/knowledge/${s.id}/`),
    ...(await contaTemi()).map(t => `/knowledge/t/${t.nome}/`),
  ];
  const righe = percorsi.map(p => `  <url><loc>${new URL(p, site).href}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${righe}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
