// Il gregge di Learn senza grafica: stesse regole di src/scripts/nuvole.ts per pecore, cane e mucche, stessi ostacoli.
// Serve al training con reinforcement learning (scripts/allena-gregge.ts) e alla pagina /learn/reinforcement/, dove l'uomo e l'AI giocano sullo stesso mondo.
export const L = 8, PECORE = 180, RAGGIO = 1.3 + PECORE * 0.0028, DT = 1 / 30, OGNI = 8, LIMITE = 180;
const SPAZIO_CANE = 1.6, MANDRIE = [[1.6, -2.4, 5], [-1.6, 3.2, 5], [3.4, 1.8, 4]] as const;
// x, z, raggio di pale, alberi e cespugli della scena
const O = [3.3,-4,0.18,5.2,1.4,0.18,-4.9,3.6,0.18,6.6,-1.6,0.18,-4,-3.6,0.18,0.3,-6.4,0.18,0.53,6.465,0.146,-0.583,6.817,0.156,0.637,7.058,0.155,-0.197,7.341,0.159,0.251,7.408,0.206,-1.677,6.877,0.088,-4.35,-0.542,0.173,-4.348,-0.284,0.203,-4.486,0.07,0.199,-3.856,-0.896,0.081,-4.087,-1.01,0.113,-4.462,-0.916,0.081,3.749,5.643,0.143,4.04,5.221,0.172,3.923,5.719,0.187,2.716,6.425,0.113,4.672,4.665,0.11,-7.008,1.168,0.164,-6.88,1.395,0.147,-6.872,1.623,0.168,-6.123,0.71,0.089,-6.912,0.502,0.088,-7.19,0.678,0.12,-0.174,-3.128,0.162,-1.129,-2.49,0.152,-0.488,-3.201,0.16,-0.267,-2.521,0.209,0.38,-2.638,0.103,-6.712,-2.949,0.186,-6.912,-2.614,0.178,-6.25,-3.109,0.144,-5.11,-2.624,0.113,-6.393,-1.648,0.113,-4.704,-5.633,0.208,-3.953,-5.589,0.157,-3.573,-5.018,0.174,-3.516,-5.886,0.162,-4.508,-5.467,0.147,-4.112,-4.928,0.209,-4,-3.854,0.096,-2.929,-5.684,0.107,-2.972,1.956,0.141,-2.547,2.74,0.161,-3.169,2.388,0.183,-2.313,3.372,0.109,-3.065,1.4,0.087,-3.228,5.277,0.147,-3.494,4.811,0.158,-3.426,5.569,0.175,-2.178,5.248,0.083,-3.436,4.369,0.106,-2.052,5.43,0.107,-2.402,-6.274,0.154,-1.708,-6.36,0.148,-2.372,-6.665,0.172,-1.384,-6.773,0.158,-0.846,-6.778,0.148,-2.166,-6.941,0.164,6.559,2.607,0.195,1.115,-5.078,0.204,2.518,1.275,0.211,2.048,-6.672,0.182,-5.181,1.996,0.182,-2.383,-2.057,0.112,-2.579,-2.136,0.103,-2.479,-2.237,0.091,-4.619,5.398,0.1,-4.868,5.184,0.094,3.991,2.018,0.11,-6.427,3.005,0.11,-6.577,3.054,0.103,6.541,0.316,0.087,6.315,0.183,0.105,-5.596,-0.506,0.092,3.615,-6.329,0.086,4.973,-4.88,0.113,5.119,-4.771,0.103,5.846,-3.461,0.109];
export const OSTACOLI = Array.from({ length: O.length / 3 }, (_, i) => ({ x: O[i * 3]!, z: O[i * 3 + 1]!, r: O[i * 3 + 2]! }));

const morbido = (da: number, a: number, k: number) => da + (a - da) * Math.min(1, k);
const angolo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
// Numeri casuali con un seme: lo stesso seme dà lo stesso mondo all'uomo e all'AI
const generatore = (seme: number) => () => {
  seme = (seme + 0x6d2b79f5) | 0;
  let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type Mucca = { x: number; z: number; verso: number; vel: number; timer: number; stato: 0 | 1 | 2; mandria: number };
export type Mondo = {
  r: () => number; s: number; x: Float32Array; z: Float32Array; vx: Float32Array; vz: Float32Array; calma: Float32Array; timer: Float32Array; voglia: Uint8Array; verso: Float32Array; spazio: Float32Array;
  cane: { x: number; z: number; verso: number; vel: number; giro: number; mx: number; mz: number }; mucche: Mucca[];
  gx: number; gz: number; dentro: number; tempo: number; finito: boolean;
};

export function nuovoMondo(seme: number): Mondo {
  const r = generatore(seme), n = PECORE;
  const m: Mondo = {
    r, s: r() * 100, x: new Float32Array(n), z: new Float32Array(n), vx: new Float32Array(n), vz: new Float32Array(n), calma: new Float32Array(n).fill(1), timer: new Float32Array(n), voglia: new Uint8Array(n), verso: new Float32Array(n), spazio: new Float32Array(n),
    cane: { x: 0, z: 0, verso: r() * 6, vel: 0, giro: 0, mx: 0, mz: 0 }, mucche: [], gx: 0, gz: 0, dentro: 0, tempo: 0, finito: false,
  };
  // Il gregge parte in un punto del pascolo, il cerchio lontano da lui e senza ostacoli dentro: come nel gioco di Learn
  const a0 = r() * 6.28, d0 = Math.sqrt(r()) * 3, cx = Math.cos(a0) * d0, cz = Math.sin(a0) * d0;
  for (let i = 0; i < n; i++) {
    const a = r() * 6, d = Math.sqrt(r()) * 1.3;
    m.x[i] = cx + Math.cos(a) * d; m.z[i] = cz + Math.sin(a) * d * 0.8;
    m.verso[i] = r() * 6; m.timer[i] = r() * 6; m.spazio[i] = 0.11 + r() * 0.08;
  }
  for (let prova = 0; prova < 400; prova++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * (L - RAGGIO - 0.8), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.hypot(x - cx, z - cz) > RAGGIO + 1.5 && OSTACOLI.every(o => Math.hypot(x - o.x, z - o.z) >= o.r + RAGGIO * 0.75)) { m.gx = x; m.gz = z; break; }
  }
  const ac = r() * 6.28, dc = 2 + r() * 1.5;
  m.cane.x = m.cane.mx = cx + Math.cos(ac) * dc; m.cane.z = m.cane.mz = cz + Math.sin(ac) * dc;
  MANDRIE.forEach(([mx, mz, k], mandria) => { for (let q = 0; q < k; q++) m.mucche.push({ x: mx + (r() - 0.5) * 1.2, z: mz + (r() - 0.5) * 1.2, verso: r() * 6, vel: 0, timer: r() * 8, stato: 0, mandria }); });
  return m;
}

const CELLE = 34, testa = new Int32Array(CELLE * CELLE), dopo = new Int32Array(PECORE);
const cella = (v: number) => Math.max(0, Math.min(CELLE - 1, Math.floor((v + L + 0.5) / 0.5)));

// Un passo del mondo. Le regole e i numeri vengono dal ciclo di src/scripts/nuvole.ts
export function avanza(m: Mondo, dt = DT) {
  if (m.finito) return;
  const { x, z, vx, vz, calma, timer, voglia, verso, spazio, cane, mucche, r } = m, n = PECORE;
  m.s += dt;
  // Cane: va verso la sua meta, con velocità e curve limitate
  {
    const dx = cane.mx - cane.x, dz = cane.mz - cane.z, d = Math.hypot(dx, dz);
    cane.vel = morbido(cane.vel, d < 0.08 ? 0 : Math.min(1.05, 0.12 + d * 0.9), dt * 2.2);
    const diff = d > 0.05 ? angolo(Math.atan2(-dz, dx) - cane.verso) : 0;
    cane.giro = morbido(cane.giro, Math.max(-3.5, Math.min(3.5, diff * 3)), dt * 6);
    cane.verso += cane.giro * dt;
    cane.x += Math.cos(cane.verso) * cane.vel * dt; cane.z -= Math.sin(cane.verso) * cane.vel * dt;
  }
  // Mucche: brucano, camminano piano, si sdraiano; se il cane è vicino si spostano
  for (const c of mucche) {
    const dc = Math.hypot(c.x - cane.x, c.z - cane.z);
    c.timer -= dt;
    if (dc < 0.8 && c.stato === 2) { c.stato = 1; c.timer = 3; }
    if (c.timer <= 0) {
      const tira = r();
      c.stato = c.stato === 2 ? 0 : tira < 0.2 ? 2 : tira < 0.6 ? 0 : 1;
      c.timer = c.stato === 2 ? 15 + r() * 20 : c.stato === 0 ? 5 + r() * 10 : 2 + r() * 3;
      if (c.stato === 1) { const h = MANDRIE[c.mandria]!; c.verso = Math.atan2(-(h[1] - c.z), h[0] - c.x) + (r() - 0.5) * 1.6; }
    }
    let voluta = c.stato === 1 ? 0.06 : 0;
    if (dc < 0.7) { voluta = 0.2; c.verso += angolo(Math.atan2(-(c.z - cane.z), c.x - cane.x) - c.verso) * Math.min(1, dt * 2); }
    c.vel = morbido(c.vel, voluta, dt * 1.5);
    const nx = c.x + Math.cos(c.verso) * c.vel * dt, nz = c.z - Math.sin(c.verso) * c.vel * dt;
    if (Math.hypot(nx, nz) > L - 1.6 || OSTACOLI.some(o => Math.hypot(nx - o.x, nz - o.z) < o.r + 0.1)) c.verso += dt * 2; else { c.x = nx; c.z = nz; }
  }
  let d = 0;
  for (let i = 0; i < n; i++) if (Math.hypot(x[i]! - m.gx, z[i]! - m.gz) < RAGGIO) d++;
  m.dentro = d;
  m.tempo += dt;
  if (d === n) { m.finito = true; return; }
  const quasiTutte = d > n * 0.85, px0 = Math.sin(m.s * 0.025) * 2.4, pz0 = Math.sin(m.s * 0.019 + 1) * 2;
  testa.fill(-1);
  for (let i = 0; i < n; i++) { const k = cella(x[i]!) * CELLE + cella(z[i]!); dopo[i] = testa[k]!; testa[k] = i; }
  for (let i = 0; i < n; i++) {
    const qx = x[i]!, qz = z[i]!, cx0 = cella(qx), cz0 = cella(qz), sp = spazio[i]!;
    let ax = 0, az = 0, mx = 0, mz = 0, cx = 0, cz = 0, nv = 0, paura = 0;
    for (let a = Math.max(0, cx0 - 1); a <= Math.min(CELLE - 1, cx0 + 1); a++) for (let b = Math.max(0, cz0 - 1); b <= Math.min(CELLE - 1, cz0 + 1); b++) {
      for (let j = testa[a * CELLE + b]!; j >= 0; j = dopo[j]!) {
        if (j === i) continue;
        const dx = qx - x[j]!, dz = qz - z[j]!, q2 = dx * dx + dz * dz;
        if (q2 > 0.49 || q2 < 1e-8) continue;
        const dd = Math.sqrt(q2);
        nv++; mx += vx[j]!; mz += vz[j]!; cx += x[j]!; cz += z[j]!;
        if (dd < sp) { const f = (sp - dd) * 22 / dd; ax += dx * f; az += dz * f; }
        const pp = (1 - calma[j]!) * (1 - dd / 0.7);
        if (pp > paura) paura = pp;
      }
    }
    const dc = Math.hypot(qx - cane.x, qz - cane.z) || 1e-3;
    if (dc < SPAZIO_CANE) { const f = (SPAZIO_CANE - dc) * 2.6 / dc; ax += (qx - cane.x) * f; az += (qz - cane.z) * f; paura = Math.max(paura, 1 - dc / SPAZIO_CANE); }
    calma[i] = morbido(calma[i]!, 1 - Math.min(1, paura * 1.6), dt * (paura > 1 - calma[i]! ? 4 : 0.35));
    const agitata = 1 - calma[i]!;
    if (nv) {
      ax += ((mx / nv) - vx[i]!) * 1.5 * (0.3 + agitata);
      az += ((mz / nv) - vz[i]!) * 1.5 * (0.3 + agitata);
      ax += ((cx / nv) - qx) * (0.15 + agitata * 0.8);
      az += ((cz / nv) - qz) * (0.15 + agitata * 0.8);
    }
    timer[i] = timer[i]! - dt;
    if (timer[i]! <= 0) { voglia[i] = voglia[i] ? 0 : 1; timer[i] = voglia[i] ? 1.5 + r() * 2.5 : 2.5 + r() * 5; if (voglia[i]) verso[i] = verso[i]! + (r() - 0.5) * 2; }
    if (voglia[i] && agitata < 0.3) { ax += Math.cos(verso[i]!) * 0.6; az -= Math.sin(verso[i]!) * 0.6; }
    const gx = m.gx - qx, gz = m.gz - qz, dg = Math.hypot(gx, gz) || 1;
    if (agitata < 0.3 && dg < RAGGIO) { if (dg > RAGGIO - 0.4) { ax += (gx / dg) * 1.2; az += (gz / dg) * 1.2; } }
    else if (agitata < 0.3 && quasiTutte) { ax += (gx / dg) * 0.7; az += (gz / dg) * 0.7; }
    else if (agitata < 0.3) { const px = px0 - qx, pz = pz0 - qz, dp = Math.hypot(px, pz) || 1; ax += (px / dp) * Math.min(1, dp) * 0.12; az += (pz / dp) * Math.min(1, dp) * 0.12; }
    for (const o of OSTACOLI) {
      const dx = qx - o.x, dz = qz - o.z, q2 = dx * dx + dz * dz, giro = o.r + 0.07;
      if (q2 < giro * giro && q2 > 1e-8) { const dd = Math.sqrt(q2), f = (giro - dd) * 30 / dd; ax += dx * f; az += dz * f; }
    }
    for (const c of mucche) {
      const dx = qx - c.x, dz = qz - c.z, q2 = dx * dx + dz * dz;
      if (q2 < 0.04 && q2 > 1e-8) { const dd = Math.sqrt(q2), f = (0.2 - dd) * 30 / dd; ax += dx * f; az += dz * f; }
    }
    const dr = Math.hypot(qx, qz);
    if (dr > L - 1.8) { const f = (dr - L + 1.8) * 4 / dr; ax -= qx * f; az -= qz * f; }
    vx[i] = vx[i]! + ax * dt; vz[i] = vz[i]! + az * dt;
    const attrito = Math.exp(-dt * (agitata > 0.2 ? 1.2 : 3.5));
    vx[i] = vx[i]! * attrito; vz[i] = vz[i]! * attrito;
    const v = Math.hypot(vx[i]!, vz[i]!), vMax = (quasiTutte ? 0.3 : 0.15) + agitata * 0.9;
    if (v > vMax) { vx[i] = vx[i]! * vMax / v; vz[i] = vz[i]! * vMax / v; }
    x[i] = qx + vx[i]! * dt; z[i] = qz + vz[i]! * dt;
    if (v > 0.03) verso[i] = verso[i]! + angolo(Math.atan2(-vz[i]!, vx[i]!) - verso[i]!) * Math.min(1, dt * 4);
  }
}

// La meta del cane, dentro il prato: come il puntatore nel gioco
export function meta(m: Mondo, x: number, z: number) {
  const d = Math.hypot(x, z), k = d > L - 0.8 ? (L - 0.8) / d : 1;
  m.cane.mx = x * k; m.cane.mz = z * k;
}

// --- Quello che vede e che può fare l'agente. Non usa immagini né telecamera: legge solo gregge, cane, cerchio e ostacoli, come pochi numeri
// girati in modo che "avanti" sia sempre dal gregge verso il cerchio. Per questo gioca uguale da qualsiasi punto di vista
export const N_VISTA = 18, N_AZIONI = 9;
export function vedi(m: Mondo, o: Float32Array = new Float32Array(N_VISTA)) {
  const { x, z, calma, cane } = m;
  let cx = 0, cz = 0, n = 0, ag = 0;
  for (let i = 0; i < PECORE; i++) if (Math.hypot(x[i]! - m.gx, z[i]! - m.gz) >= RAGGIO) { cx += x[i]!; cz += z[i]!; ag += 1 - calma[i]!; n++; }
  if (n) { cx /= n; cz /= n; ag /= n; } else { cx = m.gx; cz = m.gz; }
  let dgx = m.gx - cx, dgz = m.gz - cz;
  const dg = Math.hypot(dgx, dgz) || 1;
  dgx /= dg; dgz /= dg;
  // Il riferimento: u dal gregge verso il cerchio, w di lato
  const uu = (a: number, b: number) => a * dgx + b * dgz, ww = (a: number, b: number) => -a * dgz + b * dgx;
  let far = -1, fd = -1, s2 = 0;
  for (let i = 0; i < PECORE; i++) if (Math.hypot(x[i]! - m.gx, z[i]! - m.gz) >= RAGGIO) { const d = (x[i]! - cx) ** 2 + (z[i]! - cz) ** 2; s2 += d; if (d > fd) { fd = d; far = i; } }
  const vx = Math.cos(cane.verso) * cane.vel, vz = -Math.sin(cane.verso) * cane.vel;
  o[0] = uu(cane.x - cx, cane.z - cz) / 4; o[1] = ww(cane.x - cx, cane.z - cz) / 4;
  o[2] = dg / 8;
  o[3] = far >= 0 ? uu(x[far]! - cx, z[far]! - cz) / 4 : 0; o[4] = far >= 0 ? ww(x[far]! - cx, z[far]! - cz) / 4 : 0;
  o[5] = n ? Math.sqrt(s2 / n) / 4 : 0;
  o[6] = m.dentro / PECORE;
  o[7] = ag;
  o[8] = uu(vx, vz); o[9] = ww(vx, vz);
  o[10] = uu(cx, cz) / 8; o[11] = ww(cx, cz) / 8;
  o[12] = m.dentro > PECORE * 0.85 ? 1 : 0;
  o[13] = n / PECORE;
  // L'ostacolo più vicino davanti al gregge, sulla via del cerchio, e quello più vicino al cane. Le mucche contano come ostacoli
  let av = Infinity, au = 0, aw = 0, cd = Infinity, cu = 0, cw = 0;
  const guarda = (ox: number, oz: number) => {
    const fu = uu(ox - cx, oz - cz), fw = ww(ox - cx, oz - cz), f = fu * fu + fw * fw;
    if (fu > 0 && f < av) { av = f; au = fu; aw = fw; }
    const du = uu(ox - cane.x, oz - cane.z), dw = ww(ox - cane.x, oz - cane.z), q = du * du + dw * dw;
    if (q < cd) { cd = q; cu = du; cw = dw; }
  };
  for (const q of OSTACOLI) guarda(q.x, q.z);
  for (const q of m.mucche) guarda(q.x, q.z);
  o[14] = au / 4; o[15] = aw / 4; o[16] = cu / 4; o[17] = cw / 4;
  return { o, dgx, dgz };
}

// Azione 0: fermo. Le altre: una delle otto direzioni, rispetto al riferimento qui sopra
export function agisci(m: Mondo, a: number, dgx: number, dgz: number) {
  if (!a) { meta(m, m.cane.x, m.cane.z); return; }
  // Le azioni oltre l'ottava sono le stesse direzioni al passo: la meta è vicina, quindi il cane rallenta
  const lenta = a > 8, t = (((lenta ? a - 8 : a) - 1) * Math.PI) / 4, u = Math.cos(t), w = Math.sin(t), l = lenta ? 0.4 : 2;
  meta(m, m.cane.x + (u * dgx - w * dgz) * l, m.cane.z + (u * dgz + w * dgx) * l);
}

// La rete dell'agente: 18 numeri entrano, 64 e 64 neuroni, 9 punteggi escono
export const STRATI = [N_VISTA, 64, 64, N_AZIONI];
export function punteggi(pesi: ArrayLike<number>, o: ArrayLike<number>, u = new Float64Array(N_AZIONI), strati = STRATI) {
  let k = 0, prima: ArrayLike<number> = o;
  for (let l = 1; l < strati.length; l++) {
    const e = strati[l - 1]!, n = strati[l]!, ora = l === strati.length - 1 ? u : new Float64Array(n);
    for (let j = 0; j < n; j++) {
      let s = pesi[k + e]!;
      for (let i = 0; i < e; i++) s += pesi[k + i]! * prima[i]!;
      ora[j] = l === strati.length - 1 ? s : Math.tanh(s);
      k += e + 1;
    }
    prima = ora;
  }
  return u;
}
export const N_PESI = STRATI.slice(1).reduce((a, n, l) => a + n * (STRATI[l]! + 1), 0);

// La mappa del gregge: i 18 numeri, più una griglia 16 per 16 centrata sul cane, con quante pecore fuori dal cerchio stanno in ogni cella.
// È girata come il resto, con "avanti" dal gregge verso il cerchio. Una cella è larga 1; chi è più lontano finisce sul bordo
export const LATO_MAPPA = 16, N_VISTA_MAPPA = N_VISTA + LATO_MAPPA * LATO_MAPPA, STRATI_MAPPA = [N_VISTA_MAPPA, 64, 64, N_AZIONI];
export function vediMappa(m: Mondo) {
  const { o: base, dgx, dgz } = vedi(m), o = new Float32Array(N_VISTA_MAPPA);
  o.set(base);
  for (let i = 0; i < PECORE; i++) {
    if (Math.hypot(m.x[i]! - m.gx, m.z[i]! - m.gz) < RAGGIO) continue;
    const dx = m.x[i]! - m.cane.x, dz = m.z[i]! - m.cane.z, u = dx * dgx + dz * dgz, w = -dx * dgz + dz * dgx;
    const a = Math.max(0, Math.min(LATO_MAPPA - 1, Math.floor(u + LATO_MAPPA / 2))), b = Math.max(0, Math.min(LATO_MAPPA - 1, Math.floor(w + LATO_MAPPA / 2)));
    o[N_VISTA + a * LATO_MAPPA + b] = o[N_VISTA + a * LATO_MAPPA + b]! + 0.05;
  }
  return { o, dgx, dgz };
}

// Due mappe: le pecore fuori, come in M, e le pecore già dentro il cerchio, così il cane vede chi rischia di spaventare
export const N_AZIONI_P = 17, N_VISTA_P = N_VISTA_MAPPA + LATO_MAPPA * LATO_MAPPA, STRATI_P = [N_VISTA_P, 64, 64, N_AZIONI_P];
export function vediDue(m: Mondo) {
  const { o: base, dgx, dgz } = vediMappa(m), o = new Float32Array(N_VISTA_P);
  o.set(base);
  for (let i = 0; i < PECORE; i++) {
    if (Math.hypot(m.x[i]! - m.gx, m.z[i]! - m.gz) >= RAGGIO) continue;
    const dx = m.x[i]! - m.cane.x, dz = m.z[i]! - m.cane.z, u = dx * dgx + dz * dgz, w = -dx * dgz + dz * dgx;
    const a = Math.max(0, Math.min(LATO_MAPPA - 1, Math.floor(u + LATO_MAPPA / 2))), b = Math.max(0, Math.min(LATO_MAPPA - 1, Math.floor(w + LATO_MAPPA / 2))), k = N_VISTA_MAPPA + a * LATO_MAPPA + b;
    o[k] = o[k]! + 0.05;
  }
  return { o, dgx, dgz };
}

// Un cerchio nuovo con il gregge dov'è: come quando il gioco di Learn riparte, senza rimettere a posto pecore e cane
export function nuovoCerchio(m: Mondo) {
  let cx = 0, cz = 0;
  for (let i = 0; i < PECORE; i++) { cx += m.x[i]!; cz += m.z[i]!; }
  cx /= PECORE; cz /= PECORE;
  for (let prova = 0; prova < 400; prova++) {
    const a = m.r() * 6.28, d = Math.sqrt(m.r()) * (L - RAGGIO - 0.8), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.hypot(x - cx, z - cz) > RAGGIO + 1.5 && OSTACOLI.every(o => Math.hypot(x - o.x, z - o.z) >= o.r + RAGGIO * 0.75)) { m.gx = x; m.gz = z; break; }
  }
  m.finito = false; m.tempo = 0; m.dentro = 0;
}

// --- Il premio. v1 è la prima run. M è uguale, con più premio se finisce presto e un piccolo costo se scade il tempo con pecore fuori.
// Nessuna punizione per chi spinge: con troppe punizioni il cane smette di toccare le pecore
// Q e R: premio convesso, l'ultima pecora vale circa 5 volte la media di oggi, e perderla costa altrettanto
export const PREMI: Record<string, { scadenza: number; finaleVel: number; convesso?: boolean }> = { v1: { scadenza: 0, finaleVel: 2 }, M: { scadenza: 1, finaleVel: 4 }, P: { scadenza: 1, finaleVel: 4 }, Q: { scadenza: 1, finaleVel: 4, convesso: true }, R: { scadenza: 1, finaleVel: 4, convesso: true } };
export type Prima = { l: number; d: number };
function misure(m: Mondo) {
  let s = 0, d = 0;
  for (let i = 0; i < PECORE; i++) {
    const q = Math.hypot(m.x[i]! - m.gx, m.z[i]! - m.gz);
    s += Math.min(6, Math.max(0, q - RAGGIO));
    if (q < RAGGIO) d++;
  }
  return { l: s / PECORE / 6, d };
}
export const inizioPremio = (m: Mondo): Prima => misure(m);
export function premio(nome: string, prima: Prima, m: Mondo) {
  const f = PREMI[nome] ?? PREMI.v1!, q = misure(m);
  const dd = (q.d - prima.d) / PECORE;
  let r = 8 * (prima.l - q.l) - 0.003 + (f.convesso ? 1.5 * dd + 4.5 * ((q.d / PECORE) ** 3 - (prima.d / PECORE) ** 3) : 3 * dd);
  if (m.finito) r += 3 + f.finaleVel * (1 - m.tempo / LIMITE);
  else if (m.tempo >= LIMITE) r -= f.scadenza * (1 - q.d / PECORE);
  prima.l = q.l; prima.d = q.d;
  return r;
}

// --- Una policy: cosa legge, e la mossa che sceglie. Tiene anche quanto vuole ogni mossa, per la bussola
export type Tipo = 'v1' | 'M' | 'P';
export function scegli(tipo: Tipo, pesi: ArrayLike<number>, m: Mondo, pr?: Float64Array, caso = false) {
  const na = tipo === 'P' ? N_AZIONI_P : N_AZIONI, { o, dgx, dgz } = tipo === 'P' ? vediDue(m) : tipo === 'M' ? vediMappa(m) : vedi(m), u = punteggi(pesi, o, new Float64Array(na), tipo === 'P' ? STRATI_P : tipo === 'M' ? STRATI_MAPPA : STRATI);
  let mx = -Infinity, a = 0, tot = 0;
  for (let k = 0; k < na; k++) if (u[k]! > mx) { mx = u[k]!; a = k; }
  if (pr || caso) {
    const q = pr ?? new Float64Array(na);
    for (let k = 0; k < na; k++) { q[k] = Math.exp(u[k]! - mx); tot += q[k]!; }
    for (let k = 0; k < na; k++) q[k] = q[k]! / tot;
    if (caso) { let z = m.r(); a = 0; while (a < na - 1 && z >= q[a]!) { z -= q[a]!; a++; } }
  }
  agisci(m, a, dgx, dgz);
  return { a, dgx, dgz };
}
