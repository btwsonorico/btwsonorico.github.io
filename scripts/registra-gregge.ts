// @ts-nocheck
// Registra una partita delle due policy finali (tappa 4M) per l'arte del biglietto di AI terms (src/scripts/arteGregge.ts).
// Il biglietto non fa girare né la rete né il gregge: rilegge solo i fotogrammi salvati qui.
// Si lancia con:  npx tsx scripts/registra-gregge.ts [seme]        scrive src/data/gregge-run.ts
//                 npx tsx scripts/registra-gregge.ts --cerca [da] [quanti]   prova molti semi e stampa i tempi
import { readFileSync, writeFileSync } from 'node:fs';
import { avanza, DT, OGNI, PECORE, RAGGIO, scegli, nuovoMondo } from '../src/lib/gregge';

const FPS = 10, PASSI = Math.round(1 / DT / FPS), Q = 0.02, MAX_S = 45;
const pesi = (id: string) => { const b = readFileSync(new URL(`../public/learn/gregge/${id}.bin`, import.meta.url)); return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
// Tappa 4M (rfine in src/data/gregge-tappe.json): la prima policy usa v1.bin, la seconda rfine.bin, come in greggeVista.ts
const POLICY = [{ nome: 'policy 1', tipo: 'v1', pesi: pesi('v1') }, { nome: 'policy 2', tipo: 'P', pesi: pesi('rfine') }] as const;

// Una partita: ogni PASSI passi di simulazione si salva un fotogramma (cane, pecore, mucche e la direzione che il cane legge)
function gioca(seme: number, p: typeof POLICY[number], registra: boolean) {
  const m = nuovoMondo(seme), fot: { pos: Float64Array; ang: number }[] = [];
  let passi = 0, dgx = 1, dgz = 0;
  const foto = () => {
    const n = 1 + PECORE + m.mucche.length, pos = new Float64Array(n * 2);
    pos[0] = m.cane.x; pos[1] = m.cane.z;
    for (let i = 0; i < PECORE; i++) { pos[2 + i * 2] = m.x[i]; pos[3 + i * 2] = m.z[i]; }
    m.mucche.forEach((c, k) => { pos[2 + (PECORE + k) * 2] = c.x; pos[3 + (PECORE + k) * 2] = c.z; });
    fot.push({ pos, ang: Math.atan2(dgz, dgx) });
  };
  let cx = 0, cz = 0;
  for (let i = 0; i < PECORE; i++) { cx += m.x[i]; cz += m.z[i]; }
  const distanza = Math.hypot(cx / PECORE - m.gx, cz / PECORE - m.gz);
  if (registra) foto();
  while (!m.finito && m.tempo < MAX_S) {
    if (passi % OGNI === 0) { const s = scegli(p.tipo, p.pesi, m); dgx = s.dgx; dgz = s.dgz; }
    avanza(m);
    passi++;
    if (registra && (passi % PASSI === 0 || m.finito)) foto();
  }
  return { m, fot, distanza, tempo: m.tempo, finito: m.finito };
}

// Quantizza: il primo fotogramma in int16 (unità di Q), poi per ogni cosa un byte: due nibble con segno (-8..7) per dx e dz.
// L'errore resta nel conto, così la posizione non scivola. La seconda policy aggiunge un byte per fotogramma: la direzione che legge
function codifica(fot: { pos: Float64Array; ang: number }[], conAngolo: boolean) {
  const n = fot[0]!.pos.length / 2, F = fot.length, buf = new Uint8Array(n * 4 + (F - 1) * n + (conAngolo ? F : 0)), dv = new DataView(buf.buffer);
  const rx = new Int32Array(n), rz = new Int32Array(n);
  let k = 0, errore = 0;
  for (let i = 0; i < n; i++) {
    rx[i] = Math.round(fot[0]!.pos[i * 2] / Q); rz[i] = Math.round(fot[0]!.pos[i * 2 + 1] / Q);
    dv.setInt16(k, rx[i], true); dv.setInt16(k + 2, rz[i], true); k += 4;
  }
  const passo = (r: Int32Array, i: number, v: number) => { const d = Math.max(-8, Math.min(7, Math.round(v / Q) - r[i])); r[i] += d; return d & 15; };
  for (let f = 1; f < F; f++) for (let i = 0; i < n; i++) {
    const p = fot[f]!.pos, a = passo(rx, i, p[i * 2]), b = passo(rz, i, p[i * 2 + 1]);
    buf[k++] = (a << 4) | b;
    errore = Math.max(errore, Math.abs(rx[i] * Q - p[i * 2]), Math.abs(rz[i] * Q - p[i * 2 + 1]));
  }
  if (conAngolo) for (let f = 0; f < F; f++) buf[k++] = Math.round(((fot[f]!.ang + Math.PI) / (Math.PI * 2)) * 255) & 255;
  return { buf, errore };
}

const arg = process.argv.slice(2);
if (arg[0] === '--cerca') {
  const da = Number(arg[1] ?? 1), quanti = Number(arg[2] ?? 60);
  for (let s = da; s < da + quanti; s++) {
    const [a, b] = POLICY.map(p => gioca(s, p, false));
    console.log(`seme ${s}\tdistanza ${a.distanza.toFixed(1)}\tp1 ${a.finito ? a.tempo.toFixed(1) + 's' : `${a.m.dentro}/180`}\tp2 ${b.finito ? b.tempo.toFixed(1) + 's' : `${b.m.dentro}/180`}`);
  }
} else {
  const seme = Number(arg[0] ?? 1), corse = [];
  let totale = 0;
  for (const p of POLICY) {
    const g = gioca(seme, p, true), { buf, errore } = codifica(g.fot, p.tipo === 'P');
    totale += buf.length;
    console.log(`${p.nome}: ${g.finito ? `finita in ${g.tempo.toFixed(1)} s` : `ferma a ${g.m.dentro}/180`}, ${g.fot.length} fotogrammi, ${buf.length} byte, errore massimo ${errore.toFixed(4)}`);
    corse.push({ nome: p.nome, angolo: p.tipo === 'P', gx: +g.m.gx.toFixed(4), gz: +g.m.gz.toFixed(4), fotogrammi: g.fot.length, finita: g.finito, dati: Buffer.from(buf).toString('base64') });
  }
  const testo = `// Generato da scripts/registra-gregge.ts (seme ${seme}, tappa 4M): non modificare a mano.
// Una partita per policy, ${FPS} fotogrammi al secondo. Cose: 0 il cane, poi ${PECORE} pecore, poi le mucche.
// dati (base64): primo fotogramma in int16 (unità q), poi per ogni cosa un byte con dx e dz in due nibble con segno; con angolo, alla fine un byte per fotogramma
export const GREGGE_RUN = ${JSON.stringify({ seme, fps: FPS, q: Q, raggio: RAGGIO, corse }, null, 1)} as const;
`;
  writeFileSync(new URL('../src/data/gregge-run.ts', import.meta.url), testo);
  console.log(`totale ${totale} byte, file ${testo.length} caratteri`);
}
