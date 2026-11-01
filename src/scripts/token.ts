// Token che cadono: una frase si scrive da sola, un token alla volta, come la risposta di un LLM.
// Poi i token si staccano, cadono a pixel e si ammucchiano in fondo allo schermo.
// Il puntatore spinge via i token vicini; quando il mucchio è troppo alto, i token più vecchi svaniscono.

import { avvia, CELLA, FONT, type Scena } from './pixel';

export type Frase = { testo: string; colore: string };
type Token = {
  testo: string; colore: string; x: number; y: number; vx: number; vy: number; w: number;
  stato: 'scritto' | 'cade' | 'fermo'; nato: number; via: number;
};

const ALTO = 16, RIGA = 22, GRAVITA = 900, MASSIMO = 240;

// Divide la frase in token: parole intere, e le parole lunghe in due pezzi come fa un tokenizer
function tokenizza(testo: string, r: () => number) {
  return testo.split(/(?<=\s)/).flatMap(parola => {
    const nuda = parola.trimEnd();
    if (nuda.length < 8) return [parola];
    const taglio = 3 + Math.floor(r() * (nuda.length - 5));
    return [parola.slice(0, taglio), parola.slice(taglio)];
  });
}

export function monta(canvas: HTMLCanvasElement, frasi: Frase[]): Scena {
  const s = avvia(canvas);
  const { ctx, dim, colori } = s;
  const r = s.casuale(3);
  const token: Token[] = [];
  let cime = new Float32Array(0);
  const prepara = () => { cime = new Float32Array(dim.colonne).fill(dim.h); ricalcola(); };

  // Riquadro dove si scrive la frase: a destra del testo su schermi larghi, in alto sui telefoni
  const riquadro = () => {
    const x = dim.w < 640 ? 16 : Math.round(dim.w * 0.52);
    return { x, y: 96, larghezza: Math.min(440, dim.w - x - 32) };
  };

  // Colonne coperte da un token, e il punto più alto del mucchio sotto di lui
  const colonne = (t: Token) => [Math.max(0, Math.floor(t.x / CELLA)), Math.min(dim.colonne - 1, Math.floor((t.x + t.w - 1) / CELLA))] as const;
  const appoggio = (t: Token) => { const [a, b] = colonne(t); let m = dim.h; for (let c = a; c <= b; c++) m = Math.min(m, cime[c]!); return m; };
  const posa = (t: Token, y: number) => { t.y = y - ALTO; t.vx = t.vy = 0; t.stato = 'fermo'; const [a, b] = colonne(t); for (let c = a; c <= b; c++) cime[c] = t.y; };
  // Rifà il mucchio dal basso: chi non ha più niente sotto ricomincia a cadere
  function ricalcola() {
    cime.fill(dim.h);
    token.filter(t => t.stato === 'fermo').sort((a, b) => b.y - a.y).forEach(t => {
      const y = appoggio(t);
      if (Math.abs(t.y + ALTO - y) <= 2) posa(t, y); else t.stato = 'cade';
    });
  }
  prepara();
  s.ridimensiona(prepara);

  // Scrittura: un token ogni 70–150 ms; a frase finita, una pausa e poi i token cadono uno alla volta
  let frase = 0, pezzi: string[] = [], scritti: Token[] = [], prossimo = 0, fase: 'scrive' | 'pausa' | 'cade' = 'scrive';
  const nuovaFrase = () => { pezzi = tokenizza(frasi[frase % frasi.length]!.testo, r); scritti = []; fase = 'scrive'; };
  nuovaFrase();

  const scrivi = (ora: number) => {
    const f = frasi[frase % frasi.length]!, q = riquadro();
    ctx.font = FONT;
    const testo = pezzi[scritti.length]!;
    const w = Math.ceil(ctx.measureText(testo).width) + 6;
    const prima = scritti[scritti.length - 1];
    let x = prima ? prima.x + prima.w + 1 : q.x, y = prima ? prima.y : q.y;
    if (x + w > q.x + q.larghezza) { x = q.x; y += RIGA; }
    const t: Token = { testo, colore: f.colore, x, y, vx: 0, vy: 0, w, stato: 'scritto', nato: ora, via: 0 };
    scritti.push(t); token.push(t);
  };

  // Il puntatore spinge i token vicini, anche quelli già fermi nel mucchio
  s.ascolta('pointermove', e => {
    const [px, py] = s.posizione(e);
    let mosso = false;
    for (const t of token) {
      if (t.stato === 'scritto') continue;
      const dx = t.x + t.w / 2 - px, dy = t.y + ALTO / 2 - py, d = Math.hypot(dx, dy);
      if (d > 70 || d < 1) continue;
      const spinta = (1 - d / 70) * 420;
      t.vx += (dx / d) * spinta; t.vy += (dy / d) * spinta - 60;
      if (t.stato === 'fermo') { t.stato = 'cade'; mosso = true; }
    }
    if (mosso) ricalcola();
  });

  s.ciclo((dt, ora) => {
    ctx.clearRect(0, 0, dim.w, dim.h);
    if (dt > 0 && ora > prossimo) {
      if (fase === 'scrive') {
        scrivi(ora);
        prossimo = ora + 70 + r() * 80;
        if (scritti.length === pezzi.length) { fase = 'pausa'; prossimo = ora + 1800; }
      } else if (fase === 'pausa') fase = 'cade';
      else {
        const t = scritti.find(q => q.stato === 'scritto');
        if (t) { t.stato = 'cade'; t.vx = (r() - 0.5) * 80; t.vy = -40 - r() * 60; prossimo = ora + 45; }
        else { frase++; nuovaFrase(); prossimo = ora + 600; }
      }
    }

    // Fisica: i token cadono, rimbalzano piano sui bordi e si fermano sul mucchio
    for (const t of token) {
      if (t.stato !== 'cade' || dt === 0) continue;
      t.vy += GRAVITA * dt;
      t.vx *= 1 - dt * 1.5;
      t.x += t.vx * dt; t.y += t.vy * dt;
      if (t.x < 0) { t.x = 0; t.vx = Math.abs(t.vx) * 0.5; }
      if (t.x + t.w > dim.w) { t.x = dim.w - t.w; t.vx = -Math.abs(t.vx) * 0.5; }
      if (t.y < 0) { t.y = 0; t.vy = Math.abs(t.vy) * 0.3; }
      const y = appoggio(t);
      if (t.vy > 0 && t.y + ALTO >= y) posa(t, y);
    }

    // Mucchio troppo alto o troppi token: i più vecchi svaniscono
    const fermi = token.filter(t => t.stato === 'fermo');
    if (fermi.length > MASSIMO || Math.min(...cime) < dim.h * 0.55) {
      fermi.slice(0, 12).forEach(t => { if (!t.via) t.via = ora; });
    }
    for (let k = token.length - 1; k >= 0; k--) if (token[k]!.via && ora - token[k]!.via > 700) { token.splice(k, 1); ricalcola(); }

    // Disegno: un rettangolo tenue del colore della frase e il testo; il token appena scritto si accende
    ctx.font = FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (const t of token) {
      const svanisce = t.via ? Math.max(0, 1 - (ora - t.via) / 700) : 1;
      const nuovo = t.stato === 'scritto' ? Math.max(0, 1 - (ora - t.nato) / 400) : 0;
      const x = Math.round(t.x), y = Math.round(t.y);
      ctx.globalAlpha = (0.14 + nuovo * 0.4) * svanisce;
      ctx.fillStyle = t.colore;
      ctx.fillRect(x, y, t.w, ALTO);
      ctx.globalAlpha = svanisce;
      ctx.fillStyle = t.stato === 'fermo' ? t.colore : nuovo > 0.5 ? colori.fg : t.colore;
      ctx.fillText(t.testo.trimEnd(), x + 3, y + ALTO / 2 + 1);
    }
    // Cursore a blocco che lampeggia dopo l'ultimo token, mentre la frase si scrive
    if (fase !== 'cade' && Math.floor(ora / 500) % 2 === 0) {
      const u = scritti[scritti.length - 1], q = riquadro();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = frasi[frase % frasi.length]!.colore;
      ctx.fillRect(u ? Math.round(u.x + u.w + 2) : q.x, u ? Math.round(u.y) : q.y, CELLA, ALTO);
    }
    ctx.globalAlpha = 1;
  });
  return s;
}
