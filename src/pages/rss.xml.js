import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const scritti = await getCollection('scritti', ({ data }) => !data.draft);
  return rss({
    title: 'Riccardo Mondi',
    description: 'Essays, thoughts and reading notes.',
    site: context.site,
    items: scritti
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map(s => ({ title: s.data.title, pubDate: s.data.date, description: s.data.summary, link: `/knowledge/${s.id}/` })),
  });
}
