// Allena il piccolo decision model di /learn/decision/ e salva il risultato in public/learn/decisioni.json.
// Legge un messaggio di assistenza e sceglie fra quattro risposte fisse, con una probabilità. Non genera testo.
// L'allenamento usa messaggi composti da modelli di frase; calibrazione e prova usano messaggi scritti a mano, mai visti. Si lancia con: node scripts/allena-decisioni.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const CLASSI = ['billing', 'bug', 'account', 'sales'];
const scegli = a => a[Math.floor(Math.random() * a.length)];
const riempi = s => s.replace(/\{(\w+)\}/g, (_, k) => scegli(PEZZI[k]));

const PEZZI = {
  piano: ['pro plan', 'team plan', 'subscription', 'annual plan', 'monthly plan', 'membership', 'business plan', 'license', 'account'],
  soldi: ['charge', 'invoice', 'payment', 'receipt', 'refund', 'bill', 'transaction', 'fee', 'renewal'],
  quando: ['this month', 'last week', 'yesterday', 'today', 'in march', 'again', 'this morning', 'last month'],
  parte: ['export', 'dashboard', 'search', 'upload', 'editor', 'mobile app', 'chart', 'login page', 'report', 'calendar', 'settings page', 'sync', 'notification', 'filter'],
  guasto: ['crashes', 'freezes', 'is broken', 'stops working', 'shows an error', 'fails', 'does not load', 'hangs', 'returns a blank page', 'keeps spinning', 'throws an exception', 'is very slow'],
  accesso: ['password', 'two factor code', 'email address', 'username', 'login', 'profile', 'verification code', 'recovery email', 'security key'],
  azione: ['reset', 'change', 'update', 'recover'],
  persone: ['team', 'company', 'department', 'startup', 'school', 'firm', 'agency'],
  numero: ['20', '50', '100', '200', '500', '1000'],
  vendita: ['pricing', 'a quote', 'a demo', 'a discount', 'enterprise pricing', 'volume pricing', 'a trial', 'a call with sales'],
  apertura: ['hi,', 'hello,', 'hey,', 'please help:', 'good morning,', '', '', '', ''],
};
const MODELLI = {
  billing: [
    '{apertura} i was charged twice for my {piano} {quando}', '{apertura} i need a refund for the {soldi} {quando}', '{apertura} my {soldi} looks wrong {quando}',
    '{apertura} why did you charge my card {quando}', '{apertura} please cancel my {piano} and refund me', '{apertura} the {soldi} amount is higher than my {piano} price',
    '{apertura} i did not authorize this {soldi}', '{apertura} i was billed after i cancelled my {piano}', '{apertura} can i get a copy of my {soldi} from {quando}',
    '{apertura} my credit card was declined for the {piano}', '{apertura} you took money from my bank twice', '{apertura} i want my money back for the {piano}',
    '{apertura} please update the vat number on my invoice', '{apertura} i paid but my {soldi} still shows unpaid',
  ],
  bug: [
    '{apertura} the {parte} {guasto} {quando}', '{apertura} the {parte} {guasto} when i open it', '{apertura} every time i click the {parte} it {guasto}',
    '{apertura} after the update the {parte} {guasto}', '{apertura} i get an error in the {parte}', '{apertura} there is a bug in the {parte}',
    '{apertura} the {parte} {guasto} on my phone', '{apertura} data disappears from the {parte} after saving', '{apertura} the {parte} shows the wrong numbers',
    '{apertura} the button in the {parte} does nothing', '{apertura} the app {guasto} when i use the {parte}', '{apertura} steps to reproduce: open the {parte} and it {guasto}',
  ],
  account: [
    '{apertura} i forgot my {accesso}', '{apertura} how do i {azione} my {accesso}', '{apertura} i cannot log in to my account', '{apertura} i am locked out of my account',
    '{apertura} i want to {azione} my {accesso}', '{apertura} please delete my account and my data', '{apertura} i never received the {accesso} email',
    '{apertura} someone else may have access to my account', '{apertura} how do i add a new user to my workspace', '{apertura} i need to transfer ownership of my account',
    '{apertura} my {accesso} is not accepted', '{apertura} how can i remove a member from our workspace',
  ],
  sales: [
    '{apertura} can i get {vendita} for my {persone}', '{apertura} we are a {persone} of {numero} people, what does it cost', '{apertura} do you offer {vendita}',
    '{apertura} i would like {vendita}', '{apertura} we want to buy {numero} seats', '{apertura} what is the price for {numero} users', '{apertura} can someone show our {persone} a demo',
    '{apertura} we are comparing vendors and need {vendita}', '{apertura} do you have a plan for a {persone} of {numero}', '{apertura} i want to talk to someone about buying this for my {persone}',
    '{apertura} is there {vendita} for nonprofits', '{apertura} we are interested in your product for our {persone}',
  ],
};

// Scritti a mano, con frasi che i modelli non contengono. Metà calibra la probabilità, metà è la prova mostrata sulla pagina
const A_MANO = {
  billing: ['there are two identical payments on my statement', 'you charged me after my trial ended', 'i cancelled last month and was still billed', 'the invoice has the wrong company name', 'my card got charged but nothing changed', 'how do i get my money back', 'can you send me last year\'s receipts', 'the renewal price went up without notice', 'i was overcharged by twenty euros', 'why is there a fee on my bill', 'refund please, i bought the wrong plan', 'payment went through twice on friday', 'i need an invoice for my accountant', 'stop charging my card', 'the amount on my receipt is not what you advertised', 'my bank shows a transaction i do not recognise', 'my yearly plan renewed and i did not want it', 'i paid for a year but you billed me monthly', 'please correct the tax on my invoice', 'i was promised a credit that never arrived'],
  bug: ['the page goes white when i press save', 'nothing happens when i click export', 'my charts show yesterday\'s numbers', 'the app closes by itself on android', 'i see error 500 on the dashboard', 'search returns nothing even for exact names', 'uploads get stuck at ninety percent', 'the editor loses my text when i switch tabs', 'notifications arrive twice', 'the calendar shows the wrong time zone', 'it crashes when i open a large file', 'the csv export has broken columns', 'the sync never finishes', 'images do not load on the report', 'i get a spinning wheel forever', 'the filter ignores the date i pick', 'since the last version the screen flickers', 'clicking the link takes me to a 404', 'totals in the report are wrong', 'the mobile app freezes at startup'],
  account: ['i can\'t sign in anymore', 'the reset link never reaches my inbox', 'please change the email on my profile', 'i lost my phone and my two factor code', 'how do i close my account', 'someone logged into my account from another country', 'i need to give my colleague admin rights', 'my username is misspelled', 'it says my password is wrong but it is right', 'i got locked out after three attempts', 'how do i remove an old member from the workspace', 'can i merge my two accounts', 'i want all my personal data deleted', 'the verification code is never accepted', 'how can i turn on two factor', 'i left the company, move my account to my manager', 'i forgot which email i used to register', 'my profile picture will not change', 'how do i change my login name', 'please unlock my account'],
  sales: ['how much for a team of thirty', 'we would like to see the product before deciding', 'is there a discount for universities', 'can you send a quote for 200 seats', 'do you have enterprise terms', 'i want to compare your plans with a competitor', 'who can i talk to about a large order', 'we plan to roll this out across the company', 'what do you charge for nonprofits', 'can we get a longer trial for our team', 'our procurement team needs a price list', 'we are evaluating tools for next year', 'is annual cheaper for a bigger team', 'can someone call me about your product', 'i run an agency, do you have reseller pricing', 'what would 500 users cost', 'we are a startup looking for a good deal', 'could we schedule a demo next week', 'do you offer volume discounts', 'i would like to buy licenses for my school'],
};

const parole = t => t.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
const tratti = t => { const p = parole(t); return [...p, ...p.slice(1).map((w, i) => `${p[i]} ${w}`)]; };

const allena = [];
CLASSI.forEach((c, k) => { for (let i = 0; i < 1500; i++) allena.push([riempi(scegli(MODELLI[c])), k]); });
const conte = new Map();
allena.forEach(([t]) => new Set(tratti(t)).forEach(f => conte.set(f, (conte.get(f) ?? 0) + 1)));
const voci = [...conte].filter(([f, n]) => n >= (f.includes(' ') ? 8 : 2)).map(([f]) => f), indice = new Map(voci.map((f, i) => [f, i]));
const K = CLASSI.length, pesi = new Float64Array(voci.length * K), scarti = new Float64Array(K);

const logit = t => {
  const o = [...scarti];
  for (const f of tratti(t)) { const i = indice.get(f); if (i !== undefined) for (let k = 0; k < K; k++) o[k] += pesi[i * K + k]; }
  return o;
};
const softmax = (o, T = 1) => { const m = Math.max(...o), e = o.map(v => Math.exp((v - m) / T)), s = e.reduce((a, b) => a + b); return e.map(v => v / s); };

for (let ep = 0; ep < 12; ep++) {
  const lr = 0.25 / (1 + ep * 0.4);
  allena.sort(() => Math.random() - 0.5);
  for (const [t, y] of allena) {
    const p = softmax(logit(t));
    for (let k = 0; k < K; k++) {
      const g = p[k] - (k === y ? 1 : 0);
      scarti[k] -= lr * g * 0.2;
      for (const f of tratti(t)) { const i = indice.get(f); if (i !== undefined) pesi[i * K + k] -= lr * (g + 1e-4 * pesi[i * K + k]); }
    }
  }
}

// Metà calibra, metà è la prova: la temperatura rende la probabilità più onesta, senza cambiare la scelta
const cal = [], prova = [];
CLASSI.forEach((c, k) => A_MANO[c].forEach((t, i) => (i % 2 ? prova : cal).push([t, k])));
const nll = T => cal.reduce((s, [t, y]) => s - Math.log(Math.max(1e-9, softmax(logit(t), T)[y])), 0) / cal.length;
let TEMP = 1, meglio = Infinity;
for (let T = 0.5; T <= 8; T += 0.05) { const v = nll(T); if (v < meglio) { meglio = v; TEMP = T; } }

const casi = prova.map(([t, y]) => { const p = softmax(logit(t), TEMP), s = p.indexOf(Math.max(...p)); return { t, y, s, p: +p[s].toFixed(3) }; });
const giuste = casi.filter(c => c.s === c.y).length;
const utili = voci.map((f, i) => ({ f, w: [...pesi.subarray(i * K, i * K + K)] })).filter(v => v.w.some(x => Math.abs(x) > 0.05));
const uscita = { classi: CLASSI, temperatura: +TEMP.toFixed(2), scarti: [...scarti].map(v => +v.toFixed(3)), voci: Object.fromEntries(utili.map(v => [v.f, v.w.map(x => +x.toFixed(2))])), casi };
mkdirSync('public/learn', { recursive: true });
writeFileSync('public/learn/decisioni.json', JSON.stringify(uscita));
console.log({ tratti: utili.length, temperatura: TEMP, allenamento: allena.length, calibrazione: cal.length, prova: casi.length, giuste, kb: Math.round(JSON.stringify(uscita).length / 1024) });
casi.filter(c => c.s !== c.y).forEach(c => console.log('sbagliata', c.p, CLASSI[c.y], '->', CLASSI[c.s], '|', c.t));
for (const q of [0.5, 0.7, 0.8, 0.9]) { const a = casi.filter(c => c.p >= q); console.log('soglia', q, 'agisce', a.length, 'errori', a.filter(c => c.s !== c.y).length); }
