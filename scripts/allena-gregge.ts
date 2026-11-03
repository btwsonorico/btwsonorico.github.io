// @ts-nocheck
// Allena il cane del gregge con PPO e salva le tappe. Il gregge è src/lib/gregge.ts, lo stesso della pagina /learn/reinforcement/.
// Si lancia con: npx tsx scripts/allena-gregge.ts <cartella di uscita> <run: v1|M> [decisioni totali] [processi]
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { agisci, avanza, inizioPremio, LIMITE, N_AZIONI, N_VISTA, N_VISTA_MAPPA, nuovoMondo, OGNI, premio, punteggi, vedi, vediMappa, type Mondo } from '../src/lib/gregge';

// Run M: il cane vede anche la mappa del gregge
const CON_MAPPA = (isMainThread ? process.argv[3] : workerData.run) === 'M', N_V = CON_MAPPA ? N_VISTA_MAPPA : N_VISTA, vista = (m: Mondo) => (CON_MAPPA ? vediMappa(m) : vedi(m));
const STRATI = [N_V, 64, 64, N_AZIONI], STRATI_V = [N_V, 64, 64, 1], PER_PROCESSO = 1024, LAMBDA = 0.95, CLIP = 0.2, EPOCHE = 4, GRUPPO = 512, LR = 3e-4;
const contaPesi = (s: number[]) => s.slice(1).reduce((a, n, l) => a + n * (s[l]! + 1), 0);

const avantiV = (pesi: ArrayLike<number>, o: ArrayLike<number>) => {
  let k = 0, prima = o;
  for (let l = 1; l < STRATI_V.length; l++) {
    const e = STRATI_V[l - 1]!, n = STRATI_V[l]!, ora = new Float64Array(n);
    for (let j = 0; j < n; j++) { let s = pesi[k + e]!; for (let i = 0; i < e; i++) s += pesi[k + i]! * prima[i]!; ora[j] = l === STRATI_V.length - 1 ? s : Math.tanh(s); k += e + 1; }
    prima = ora;
  }
  return prima[0]!;
};

if (!isMainThread) {
  // --- Un processo gioca: raccoglie quello che vede, le azioni e i premi con la rete del momento
  const { run } = workerData;
  let seme: number = workerData.seme;
  const nuovo = () => nuovoMondo(seme++);
  let m = nuovo(), prima = inizioPremio(m);
  parentPort!.on('message', ({ pp, pv }: { pp: Float32Array; pv: Float64Array }) => {
    const obs = new Float32Array(PER_PROCESSO * N_V), az = new Uint8Array(PER_PROCESSO), lp = new Float32Array(PER_PROCESSO), val = new Float32Array(PER_PROCESSO + 1), rew = new Float32Array(PER_PROCESSO), fine = new Uint8Array(PER_PROCESSO);
    const tempi: number[] = [];
    for (let t = 0; t < PER_PROCESSO; t++) {
      const { o, dgx, dgz } = vista(m), u = punteggi(pp, o, undefined, STRATI);
      let mx = -Infinity;
      for (let a = 0; a < N_AZIONI; a++) if (u[a]! > mx) mx = u[a]!;
      let tot = 0;
      const pr = new Float64Array(N_AZIONI);
      for (let a = 0; a < N_AZIONI; a++) { pr[a] = Math.exp(u[a]! - mx); tot += pr[a]!; }
      let q = Math.random() * tot, a = 0;
      while (a < N_AZIONI - 1 && q >= pr[a]!) { q -= pr[a]!; a++; }
      obs.set(o, t * N_V); az[t] = a; lp[t] = Math.log(pr[a]! / tot); val[t] = avantiV(pv, o);
      agisci(m, a, dgx, dgz);
      for (let k = 0; k < OGNI && !m.finito; k++) avanza(m);
      rew[t] = premio(run, prima, m);
      if (m.finito || m.tempo >= LIMITE) {
        fine[t] = 1;
        if (m.finito) tempi.push(m.tempo);
        m = nuovo(); prima = inizioPremio(m);
      }
    }
    val[PER_PROCESSO] = avantiV(pv, vista(m).o);
    parentPort!.postMessage({ obs, az, lp, val, rew, fine, tempi });
  });
} else {
  const [uscita, run = 'M', totale = '4000000', processi = '10'] = process.argv.slice(2);
  const ENTROPIA = 0.01, GAMMA = 0.995;
  mkdirSync(uscita!, { recursive: true });
  const TAPPE = [0, 20000, 60000, 150000, 400000, 800000, 1500000, 3000000, 6000000];
  const nP = contaPesi(STRATI), nV = contaPesi(STRATI_V);
  // Pesi di partenza: piccoli sull'ultimo strato, così all'inizio l'agente sceglie a caso
  const pesiNuovi = (s: number[], ultimo: number) => {
    const o = new Float64Array(contaPesi(s));
    let k = 0;
    for (let l = 1; l < s.length; l++) for (let j = 0; j < s[l]!; j++) {
      for (let i = 0; i < s[l - 1]!; i++) o[k++] = (Math.random() * 2 - 1) * (l === s.length - 1 ? ultimo : Math.sqrt(3 / s[l - 1]!));
      o[k++] = 0;
    }
    return o;
  };
  const P = pesiNuovi(STRATI, 0.02), V = pesiNuovi(STRATI_V, 0.1);
  const adam = (n: number) => ({ a: new Float64Array(n), b: new Float64Array(n), k: 0 });
  const aP = adam(nP), aV = adam(nV);
  const passoAdam = (x: Float64Array, g: Float64Array, s: { a: Float64Array; b: Float64Array; k: number }, lr: number) => {
    s.k++;
    let nn = 0;
    for (let i = 0; i < x.length; i++) nn += g[i]! * g[i]!;
    const taglio = Math.min(1, 0.5 / (Math.sqrt(nn) + 1e-8)), c1 = 1 - 0.9 ** s.k, c2 = 1 - 0.999 ** s.k;
    for (let i = 0; i < x.length; i++) {
      const v = g[i]! * taglio;
      s.a[i] = 0.9 * s.a[i]! + 0.1 * v; s.b[i] = 0.999 * s.b[i]! + 0.001 * v * v;
      x[i] = x[i]! - lr * (s.a[i]! / c1) / (Math.sqrt(s.b[i]! / c2) + 1e-5);
    }
  };
  // Avanti e indietro su una rete a tanh. dUscita riceve l'uscita e torna il gradiente da rimandare indietro
  const un = (x: Float64Array, s: number[], o: ArrayLike<number>, g: Float64Array, dUscita: (u: Float64Array) => ArrayLike<number>) => {
    const att: Float64Array[] = [Float64Array.from(o as ArrayLike<number>)], off: number[] = [];
    let k = 0;
    for (let l = 1; l < s.length; l++) {
      const e = s[l - 1]!, n = s[l]!, ora = new Float64Array(n), prima = att[l - 1]!;
      off.push(k);
      for (let j = 0; j < n; j++) { let t = x[k + e]!; for (let i = 0; i < e; i++) t += x[k + i]! * prima[i]!; ora[j] = l === s.length - 1 ? t : Math.tanh(t); k += e + 1; }
      att.push(ora);
    }
    let d: ArrayLike<number> = dUscita(att[s.length - 1]!);
    for (let l = s.length - 1; l >= 1; l--) {
      const e = s[l - 1]!, n = s[l]!, prima = att[l - 1]!, sotto = new Float64Array(e);
      let q = off[l - 1]!;
      for (let j = 0; j < n; j++) {
        const f = l === s.length - 1 ? 1 : 1 - att[l]![j]! ** 2, v = d[j]! * f;
        for (let i = 0; i < e; i++) { g[q + i] = g[q + i]! + v * prima[i]!; sotto[i] = sotto[i]! + v * x[q + i]!; }
        g[q + e] = g[q + e]! + v; q += e + 1;
      }
      d = sotto;
    }
  };
  // Le partite di controllo: sempre gli stessi semi, nessuna esplorazione
  const prova = (pesi: Float32Array, semi = 24) => {
    const r: { t: number; f: boolean; dentro: number }[] = [];
    for (let s = 0; s < semi; s++) {
      const m = nuovoMondo(1000 + s);
      while (!m.finito && m.tempo < LIMITE) {
        const { o, dgx, dgz } = vista(m), u = punteggi(pesi, o, undefined, STRATI);
        let a = 0;
        for (let q = 1; q < N_AZIONI; q++) if (u[q]! > u[a]!) a = q;
        agisci(m, a, dgx, dgz);
        for (let k = 0; k < OGNI && !m.finito; k++) avanza(m);
      }
      r.push({ t: m.tempo, f: m.finito, dentro: m.dentro });
    }
    const ok = r.filter(q => q.f).map(q => q.t).sort((a, b) => a - b);
    return { finite: ok.length, semi, mediana: ok.length ? +ok[ok.length >> 1]!.toFixed(1) : null, migliore: ok.length ? +ok[0]!.toFixed(1) : null, dentro: Math.round(r.reduce((a, q) => a + q.dentro, 0) / semi) };
  };
  const salva = (nome: string, passi: number) => {
    const f = Float32Array.from(P);
    writeFileSync(`${uscita}/${nome}.bin`, Buffer.from(f.buffer));
    const e = prova(f);
    writeFileSync(`${uscita}/${nome}.json`, JSON.stringify({ passi, ...e }));
    console.log('TAPPA', nome, JSON.stringify(e));
  };
  const lavoratori = Array.from({ length: Number(processi) }, (_, i) => new Worker(fileURLToPath(import.meta.url), { workerData: { run, seme: 100000 + i * 100000 } }));
  const raccogli = () => Promise.all(lavoratori.map(w => new Promise<any>(ok => { w.once('message', ok); w.postMessage({ pp: Float32Array.from(P), pv: V }); })));
  const t0 = Date.now(), fino = Number(totale);
  let fatti = 0, tappa = 1;
  salva('t0', 0);
  while (fatti < fino) {
    const dati = await raccogli(), N = PER_PROCESSO * dati.length, obs = new Float32Array(N * N_V), az = new Uint8Array(N), lp = new Float32Array(N), adv = new Float32Array(N), ret = new Float32Array(N);
    let riga = 0, somma = 0;
    const tempi: number[] = [];
    for (const d of dati) {
      let g = 0;
      for (let t = PER_PROCESSO - 1; t >= 0; t--) {
        const nz = d.fine[t] ? 0 : 1, de = d.rew[t] + GAMMA * d.val[t + 1] * nz - d.val[t];
        g = de + GAMMA * LAMBDA * nz * g;
        adv[riga + t] = g; ret[riga + t] = g + d.val[t]; somma += d.rew[t];
      }
      obs.set(d.obs, riga * N_V); az.set(d.az, riga); lp.set(d.lp, riga);
      tempi.push(...d.tempi);
      riga += PER_PROCESSO;
    }
    let ma = 0, sa = 0;
    for (let i = 0; i < N; i++) ma += adv[i]!;
    ma /= N;
    for (let i = 0; i < N; i++) sa += (adv[i]! - ma) ** 2;
    sa = Math.sqrt(sa / N) + 1e-8;
    const lr = LR * Math.max(0.1, 1 - fatti / fino), ordine = Int32Array.from({ length: N }, (_, i) => i), gP = new Float64Array(nP), gV = new Float64Array(nV);
    for (let e = 0; e < EPOCHE; e++) {
      for (let i = N - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)), t = ordine[i]!; ordine[i] = ordine[j]!; ordine[j] = t; }
      for (let b = 0; b + GRUPPO <= N; b += GRUPPO) {
        gP.fill(0); gV.fill(0);
        for (let q = b; q < b + GRUPPO; q++) {
          const i = ordine[q]!, o = obs.subarray(i * N_V, (i + 1) * N_V), a = az[i]!, A = (adv[i]! - ma) / sa;
          un(P, STRATI, o, gP, u => {
            let mx = -Infinity;
            for (let k = 0; k < N_AZIONI; k++) if (u[k]! > mx) mx = u[k]!;
            let tot = 0;
            const pr = new Float64Array(N_AZIONI);
            for (let k = 0; k < N_AZIONI; k++) { pr[k] = Math.exp(u[k]! - mx); tot += pr[k]!; }
            for (let k = 0; k < N_AZIONI; k++) pr[k] = pr[k]! / tot;
            const rapporto = Math.exp(Math.log(pr[a]!) - lp[i]!), c = rapporto > 1 + CLIP ? 1 + CLIP : rapporto < 1 - CLIP ? 1 - CLIP : rapporto;
            const coef = A * rapporto <= A * c ? -A * rapporto : 0, d = new Float64Array(N_AZIONI);
            for (let k = 0; k < N_AZIONI; k++) {
              d[k] = coef * ((k === a ? 1 : 0) - pr[k]!);
              // Entropia: tiene viva l'esplorazione
              let dh = 0;
              for (let w = 0; w < N_AZIONI; w++) dh += (Math.log(pr[w]! + 1e-12) + 1) * pr[w]! * ((w === k ? 1 : 0) - pr[k]!);
              d[k] = d[k]! + ENTROPIA * dh;
            }
            return d;
          });
          un(V, STRATI_V, o, gV, u => [u[0]! - ret[i]!]);
        }
        for (let k = 0; k < nP; k++) gP[k] = gP[k]! / GRUPPO;
        for (let k = 0; k < nV; k++) gV[k] = gV[k]! / GRUPPO;
        passoAdam(P, gP, aP, lr);
        passoAdam(V, gV, aV, lr);
      }
    }
    fatti += N;
    tempi.sort((a, b) => a - b);
    console.log(`${fatti} decisioni, ${Math.round((Date.now() - t0) / 1000)} s, premio per decisione ${(somma / N).toFixed(4)}, partite finite ${tempi.length}, tempo mediano ${tempi.length ? tempi[tempi.length >> 1]!.toFixed(0) : '-'}`);
    while (tappa < TAPPE.length && fatti >= TAPPE[tappa]!) { salva(`t${TAPPE[tappa]}`, fatti); tappa++; }
    writeFileSync(`${uscita}/ultima.bin`, Buffer.from(Float32Array.from(P).buffer));
  }
  salva('fine', fatti);
  await Promise.all(lavoratori.map(w => w.terminate()));
  console.log('fine');
}
