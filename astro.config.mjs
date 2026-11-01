import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://btwsonorico.github.io',
  integrations: [react()],
  // La sezione Projects ora si chiama SW engineering (indirizzo /software/): i vecchi indirizzi portano a quelli nuovi
  redirects: { '/projects': '/software' },
});
