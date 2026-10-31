// Salva in src/data/contributi.json il calendario dei contributi GitHub (solo date e numeri).
// La build lo usa quando non ha un token GitHub, per esempio nel workflow senza il secret GH_CONTRIB_TOKEN.
// Uso: npm run contributi (serve la gh CLI con l'account btwsonorico).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const UTENTE = 'btwsonorico';
const query = `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar {
  weeks { contributionDays { date weekday contributionCount } } } } } }`;
const token = execFileSync('gh', ['auth', 'token', '--user', UTENTE], { encoding: 'utf8' }).trim();
const r = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { login: UTENTE } }),
});
const json = await r.json();
if (!r.ok || json.errors) throw new Error(`Risposta GitHub non valida: ${JSON.stringify(json.errors ?? r.status)}`);
const giorni = json.data.user.contributionsCollection.contributionCalendar.weeks.flatMap(w => w.contributionDays);
mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/contributi.json', JSON.stringify(giorni) + '\n');
console.log(`${giorni.length} giorni salvati, fino al ${giorni.at(-1).date}.`);
