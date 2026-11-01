// Interruttore unico per motori di ricerca e AI.
// false: il sito chiede di non essere letto né indicizzato (robots.txt e meta robots), finché il contenuto non è finale.
// true: il sito è aperto a Google, Bing e ai crawler delle AI, con sitemap e llms.txt.
export const INDICIZZABILE = false;

// Chi sono, in un posto solo: lo usano i dati strutturati della home e llms.txt
export const SITO = {
  nome: 'Riccardo Mondi',
  ruolo: 'AI Advisor and Developer',
  ente: 'Politecnico di Milano',
  gruppo: 'Osservatorio Artificial Intelligence + Team R&D',
  email: 'riccardo.mondi@polimi.it',
  github: 'https://github.com/btwsonorico',
  linkedin: 'https://www.linkedin.com/in/riccardo-mondi-7717181aa/',
  bio: 'I help organisations adopt AI, and I build the tools that make it work: from research to code.',
};
