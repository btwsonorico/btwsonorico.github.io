import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://btwsonorico.github.io',
  integrations: [react()],
  // La sezione Projects ora si chiama Software (indirizzo /software/): i vecchi indirizzi portano a quelli nuovi
  // L'About è diventata la home
  redirects: { '/projects': '/software', '/about': '/' },
});
