// Una piccola rete neurale vera, senza librerie e senza pagina intorno: due ingressi, strati nascosti a scelta, una uscita.
// Calcola tutto nel browser, così le pagine di Learn la allenano dal vivo su un sito statico.
export type Attivazione = 'tanh' | 'relu';
export type Punto = { x: number; y: number; c: number };

export type Rete = {
  forma: number[];
  attivazione: Attivazione;
  // Per ogni strato dopo gli ingressi: pesi[l][j * entrate + i] collega il neurone i dello strato prima al neurone j
  pesi: Float64Array[];
  scarti: Float64Array[];
  // Valore di ogni neurone dopo l'ultimo calcolo; uscite[0] sono i due ingressi
  uscite: Float64Array[];
  // Solo per l'allenamento
  pendenze: Float64Array[];
  gradPesi: Float64Array[];
  gradScarti: Float64Array[];
  velPesi: Float64Array[];
  velScarti: Float64Array[];
};

const MOMENTO = 0.9;

// Numeri casuali ripetibili: lo stesso seme dà gli stessi dati e la stessa partenza
export const casuale = (seme: number) => () => {
  seme = (seme + 0x6d2b79f5) | 0;
  let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function nuovaRete(nascosti: number[], attivazione: Attivazione, seme: number): Rete {
  const forma = [2, ...nascosti, 1], r = casuale(seme), zeri = (n: number) => new Float64Array(n);
  const pesi: Float64Array[] = [], scarti: Float64Array[] = [];
  for (let l = 1; l < forma.length; l++) {
    const entrate = forma[l - 1]!, neuroni = forma[l]!, scala = Math.sqrt((attivazione === 'relu' ? 2 : 1) / entrate);
    pesi.push(Float64Array.from({ length: entrate * neuroni }, () => (r() * 2 - 1) * scala * 1.7));
    // ReLU parte da uno scarto piccolo e positivo: meno neuroni restano spenti per sempre
    scarti.push(Float64Array.from({ length: neuroni }, () => attivazione === 'relu' ? 0.1 : (r() * 2 - 1) * 0.1));
  }
  return {
    forma, attivazione, pesi, scarti,
    uscite: forma.map(zeri),
    pendenze: forma.map(zeri),
    gradPesi: pesi.map(p => zeri(p.length)),
    gradScarti: scarti.map(s => zeri(s.length)),
    velPesi: pesi.map(p => zeri(p.length)),
    velScarti: scarti.map(s => zeri(s.length)),
  };
}

// Rete con la stessa profondità e un neurone in più o in meno: tiene i pesi che ci sono ancora, i nuovi restano casuali
export function copiaPesi(da: Rete, a: Rete) {
  for (let l = 0; l < a.pesi.length; l++) {
    const entrateDa = da.forma[l]!, entrateA = a.forma[l]!, neuroni = Math.min(da.forma[l + 1]!, a.forma[l + 1]!), entrate = Math.min(entrateDa, entrateA);
    for (let j = 0; j < neuroni; j++) {
      a.scarti[l]![j] = da.scarti[l]![j]!;
      for (let i = 0; i < entrate; i++) a.pesi[l]![j * entrateA + i] = da.pesi[l]![j * entrateDa + i]!;
    }
  }
}

// Calcolo in avanti. Restituisce la probabilità della classe 1; i valori dei neuroni restano in rete.uscite
export function avanti(rete: Rete, x: number, y: number): number {
  const { forma, pesi, scarti, uscite, pendenze, attivazione } = rete, ultimo = forma.length - 1;
  uscite[0]![0] = x;
  uscite[0]![1] = y;
  let somma = 0;
  for (let l = 1; l <= ultimo; l++) {
    const prima = uscite[l - 1]!, qui = uscite[l]!, p = pesi[l - 1]!, b = scarti[l - 1]!, entrate = forma[l - 1]!;
    for (let j = 0; j < forma[l]!; j++) {
      somma = b[j]!;
      const riga = j * entrate;
      for (let i = 0; i < entrate; i++) somma += p[riga + i]! * prima[i]!;
      if (l === ultimo) {
        qui[j] = 1 / (1 + Math.exp(-somma));
      } else if (attivazione === 'tanh') {
        const t = Math.tanh(somma);
        qui[j] = t;
        pendenze[l]![j] = 1 - t * t;
      } else {
        qui[j] = somma > 0 ? somma : 0;
        pendenze[l]![j] = somma > 0 ? 1 : 0;
      }
    }
  }
  return uscite[ultimo]![0]!;
}

// Un passo di allenamento su un gruppo di punti: errore all'indietro, poi ogni peso si sposta un poco. Restituisce l'errore del gruppo
export function passo(rete: Rete, gruppo: Punto[], tasso: number): number {
  const { forma, pesi, scarti, uscite, pendenze, gradPesi, gradScarti, velPesi, velScarti } = rete, ultimo = forma.length - 1;
  gradPesi.forEach(g => g.fill(0));
  gradScarti.forEach(g => g.fill(0));
  let totale = 0;
  // Quanto ogni neurone dello strato ha contribuito all'errore
  const colpa = forma.map(n => new Float64Array(n));
  for (const q of gruppo) {
    const p = avanti(rete, q.x, q.y);
    totale += errorePunto(p, q.c);
    colpa[ultimo]![0] = p - q.c;
    for (let l = ultimo; l >= 1; l--) {
      const entrate = forma[l - 1]!, w = pesi[l - 1]!, gw = gradPesi[l - 1]!, gb = gradScarti[l - 1]!, prima = uscite[l - 1]!, sotto = colpa[l - 1]!;
      sotto.fill(0);
      for (let j = 0; j < forma[l]!; j++) {
        const d = colpa[l]![j]!, riga = j * entrate;
        gb[j] = gb[j]! + d;
        for (let i = 0; i < entrate; i++) {
          gw[riga + i] = gw[riga + i]! + d * prima[i]!;
          sotto[i] = sotto[i]! + d * w[riga + i]!;
        }
      }
      if (l > 1) for (let i = 0; i < entrate; i++) sotto[i] = sotto[i]! * pendenze[l - 1]![i]!;
    }
  }
  const n = gruppo.length;
  for (let l = 0; l < pesi.length; l++) {
    aggiorna(pesi[l]!, gradPesi[l]!, velPesi[l]!, tasso, n);
    aggiorna(scarti[l]!, gradScarti[l]!, velScarti[l]!, tasso, n);
  }
  return totale / n;
}

function aggiorna(valori: Float64Array, grad: Float64Array, vel: Float64Array, tasso: number, n: number) {
  for (let k = 0; k < valori.length; k++) {
    vel[k] = MOMENTO * vel[k]! - tasso * grad[k]! / n;
    valori[k] = valori[k]! + vel[k]!;
  }
}

const errorePunto = (p: number, c: number) => {
  const q = Math.min(1 - 1e-9, Math.max(1e-9, p));
  return -(c * Math.log(q) + (1 - c) * Math.log(1 - q));
};

// Errore medio e quota di punti giusti su tutti i dati
export function misura(rete: Rete, dati: Punto[]) {
  let errore = 0, giusti = 0;
  for (const q of dati) {
    const p = avanti(rete, q.x, q.y);
    errore += errorePunto(p, q.c);
    if ((p >= 0.5 ? 1 : 0) === q.c) giusti++;
  }
  return { errore: errore / dati.length, precisione: giusti / dati.length };
}
