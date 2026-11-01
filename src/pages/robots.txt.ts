import type { APIRoute } from 'astro';
import { INDICIZZABILE } from '../lib/sito';

// Finché il contenuto non è finale il sito chiede a tutti i crawler di non leggerlo; poi lo apre e indica la sitemap
export const GET: APIRoute = ({ site }) => new Response(
  INDICIZZABILE
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`
    : 'User-agent: *\nDisallow: /\n',
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
