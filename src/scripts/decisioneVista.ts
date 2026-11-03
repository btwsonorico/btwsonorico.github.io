// Vista del decision model: legge il messaggio, somma i pesi delle parole e sceglie fra quattro risposte fisse.
// La soglia decide quando agisce da solo; i quadrati sono 40 messaggi scritti a mano che il modello non ha mai visto.
type Caso = { t: string; y: number; s: number; p: number };
type Dati = { classi: string[]; temperatura: number; scarti: number[]; voci: Record<string, number[]>; casi: Caso[] };

const stile = getComputedStyle(document.documentElement), tono = (n: string) => stile.getPropertyValue(n).trim();
const parole = (t: string) => t.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);

export async function monta(radice: HTMLElement) {
  const $ = <E extends Element>(q: string) => radice.querySelector<E>(q)!;
  const COLORI = [tono('--arancio'), tono('--verde'), tono('--fg'), tono('--azzurro')];
  const area = $<HTMLTextAreaElement>('.messaggio'), barre = $<HTMLElement>('.barre'), esito = $<HTMLElement>('.esito'), righe = $<HTMLElement>('.parole');
  const cursore = $<HTMLInputElement>('.cursore-soglia'), lettura = $<HTMLElement>('.lettura'), casiEl = $<HTMLElement>('.casi'), dettaglio = $<HTMLElement>('.dettaglio');
  let dati: Dati;
  try { dati = await (await fetch('/learn/decisioni.json')).json() as Dati; }
  catch { esito.textContent = 'could not load the model'; return; }
  const { classi, temperatura, scarti, voci } = dati, K = classi.length;

  const voceBarra = classi.map((nome, k) => {
    const r = document.createElement('div'), n = document.createElement('span'), tr = document.createElement('div'), pieno = document.createElement('div'), num = document.createElement('span');
    r.className = 'barra-voce'; tr.className = 'traccia'; pieno.className = 'pieno'; num.className = 'num';
    n.textContent = nome; n.style.color = COLORI[k]!; pieno.style.background = COLORI[k]!;
    tr.append(pieno); r.append(n, tr, num); barre.append(r);
    return { pieno, num };
  });

  // Le stesse regole dello script di allenamento: parole singole e coppie di parole
  function scegli(testo: string) {
    const p = parole(testo), o = [...scarti], tratti = [...p, ...p.slice(1).map((w, i) => `${p[i]} ${w}`)];
    let note = 0;
    for (const f of tratti) { const w = voci[f]; if (w) { note++; for (let k = 0; k < K; k++) o[k]! += w[k]!; } }
    const m = Math.max(...o), e = o.map(v => Math.exp((v - m) / temperatura)), s = e.reduce((a, b) => a + b);
    return { prob: e.map(v => v / s), note, p };
  }
  const soglia = () => Number(cursore.value) / 100;

  function aggiorna() {
    const testo = area.value, { prob, note, p } = scegli(testo), migliore = prob.indexOf(Math.max(...prob));
    voceBarra.forEach((v, k) => { const q = testo.trim() ? prob[k]! : 0; v.pieno.style.width = `${q * 100}%`; v.num.textContent = testo.trim() ? q.toFixed(2) : '–'; });
    // Ogni parola prende il colore della risposta che spinge di più. Il testo si scrive sempre come testo, mai come HTML
    righe.replaceChildren(...p.flatMap((w, i) => {
      const s = document.createElement('span'), pesi = voci[w];
      s.textContent = w;
      if (pesi) { const k = pesi.indexOf(Math.max(...pesi)); if (pesi[k]! > 0) s.style.color = COLORI[k]!; }
      return i ? [' ', s] : [s];
    }));
    if (!testo.trim()) esito.textContent = 'waiting for a message';
    else if (!note) esito.textContent = 'it knows none of these words: ask a person';
    else if (prob[migliore]! >= soglia()) esito.textContent = `acts alone: route to ${classi[migliore]}`;
    else esito.textContent = `not sure enough: ask a person (best guess ${classi[migliore]})`;
  }

  // I 40 messaggi di prova, dal più incerto al più sicuro
  const casi = [...dati.casi].sort((a, b) => a.p - b.p);
  const quadri = casi.map((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Test message ${i + 1}`);
    const mostra = () => {
      quadri.forEach(q => q.classList.remove('scelto'));
      b.classList.add('scelto');
      const agisce = c.p >= soglia();
      dettaglio.textContent = `"${c.t}": it says ${classi[c.s]} at ${c.p.toFixed(2)}, the right answer is ${classi[c.y]}. ${agisce ? (c.s === c.y ? 'It acts, and it is right.' : 'It acts, and it is wrong.') : 'It asks a person.'}`;
    };
    b.addEventListener('pointerenter', mostra);
    b.addEventListener('focus', mostra);
    b.addEventListener('click', mostra);
    casiEl.append(b);
    return b;
  });
  function aggiornaSoglia() {
    const q = soglia();
    let agisce = 0, errori = 0;
    casi.forEach((c, i) => {
      const a = c.p >= q, giusto = c.s === c.y;
      if (a) { agisce++; if (!giusto) errori++; }
      quadri[i]!.classList.toggle('giusto', a && giusto);
      quadri[i]!.classList.toggle('sbagliato', a && !giusto);
    });
    lettura.textContent = `threshold ${q.toFixed(2)} · acts on ${agisce} of ${casi.length} · ${errori} ${errori === 1 ? 'error' : 'errors'}`;
    aggiorna();
  }

  area.addEventListener('input', aggiorna);
  cursore.addEventListener('input', aggiornaSoglia);
  radice.querySelectorAll<HTMLButtonElement>('[data-esempio]').forEach(b => b.addEventListener('click', () => { area.value = b.dataset.esempio ?? ''; aggiorna(); }));
  area.value = 'I was charged twice this month';
  aggiornaSoglia();
}
