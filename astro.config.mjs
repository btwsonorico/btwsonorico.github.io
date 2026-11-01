import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://btwsonorico.github.io',
  // La sezione Projects ora si chiama Software (indirizzo /software/): i vecchi indirizzi portano a quelli nuovi
  // L'About è diventata la home
  redirects: { '/projects': '/software', '/about': '/' },
});
