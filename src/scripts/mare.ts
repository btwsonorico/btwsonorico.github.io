import * as THREE from 'three';
import { colori, tonoSezione, vista, type Punto } from './vista3d';

// Spiaggia come un piccolo diorama, nello stile del laghetto: un'isola a fagiolo, metà sabbia e metà mare,
// vista in obliquo e in wireframe, che ruota piano. Il mare sta a +x: le creste delle onde arrivano verso la riva,
// si alzano, si rompono in schiuma, risalgono sulla sabbia e si ritirano. Intorno: dune con l'erba, sassi,
// un tronco portato dal mare, conchigliette, due gabbiani. Sulla battigia tre cose, una per sezione del sito,
// spinte dalle onde: un paguro che si porta dietro la casa (SW engineering: costruire i propri strumenti),
// una stella marina (Advisory: la stella che indica la rotta), una conchiglia (Knowledge: quello che il mare porta a riva).

export interface Sezione { id: string; label: string; href: string; tono: string }

const PERIODO = 7, RIVA = 0.35, RISALITA = 0.75, CRESTE = 5;

function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}
const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
const segmenti = (xyz: number[], mat: THREE.LineBasicMaterial) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.LineSegments(g, mat);
};
const curva = (punti: THREE.Vector3[], mat: THREE.LineBasicMaterial, chiusa = false) =>
  chiusa ? new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(punti), mat) : new THREE.Line(new THREE.BufferGeometry().setFromPoints(punti), mat);
const nuvola = (xyz: number[], colore: THREE.Color, size: number, opacita: number) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: colore, size, transparent: true, opacity: opacita }));
};
const spigoli = (geo: THREE.BufferGeometry, mat: THREE.LineBasicMaterial) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);

// Bordo dell'isola: un fagiolo allungato con una baia, come la riva del laghetto
const raggioIsola = (a: number) => 3.4 + 0.5 * Math.cos(2 * a) + 0.25 * Math.sin(3 * a + 0.6) + 0.1 * Math.sin(7 * a + 1);
const dentro = (x: number, z: number, margine = 0) => Math.hypot(x, z) < raggioIsola(Math.atan2(z, x)) - margine;
// Risalita dell'onda in una fase da 0 a 1: sale in fretta, poi si ritira piano
const risalita = (f: number) => f < 0.3 ? 1 - (1 - f / 0.3) ** 3 : 0.5 + 0.5 * Math.cos(((f - 0.3) / 0.7) * Math.PI);
// Fase dell'onda lungo la riva: ogni tratto è un po' in ritardo sul vicino, così l'onda arriva di sbieco
const fase = (z: number, s: number) => ((((s / PERIODO) - z * 0.06 - Math.sin(z * 0.9) * 0.03) % 1) + 1) % 1;
// Bordo dell'acqua sulla sabbia: la riva media è un po' curva, l'onda la fa salire e scendere
const bordo = (z: number, s: number) => RIVA + z * z * 0.04 - risalita(fase(z, s)) * RISALITA + Math.sin(z * 1.7 + s * 0.5) * 0.04;

// Le tre cose della battigia, in 3D. Ogni gruppo guarda verso +x.
function paguro(m: THREE.LineBasicMaterial, mt: THREE.LineBasicMaterial) {
  const g = new THREE.Group();
  // Guscio a spirale: anelli sempre più piccoli lungo un'elica, la casa che si porta dietro
  const guscio = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const u = i / 8, raggio = 0.13 * (1 - u * 0.8), a = u * Math.PI * 2.4;
    const anello = curva(Array.from({ length: 12 }, (_, k) => { const b = (k / 12) * Math.PI * 2; return new THREE.Vector3(Math.cos(b) * raggio, Math.sin(b) * raggio, 0); }), i % 2 ? mt : m, true);
    anello.position.set(-0.08 - u * 0.12, 0.13 + u * 0.12 + Math.sin(a) * 0.03, Math.cos(a) * 0.04);
    anello.rotation.y = Math.PI / 2 + Math.sin(a) * 0.3;
    guscio.add(anello);
  }
  g.add(guscio);
  // Corpo, occhi sugli steli, chele
  const corpo = spigoli(new THREE.SphereGeometry(0.08, 6, 4), m);
  corpo.scale.set(1.1, 0.6, 1);
  corpo.position.set(0.06, 0.06, 0);
  g.add(corpo);
  g.add(segmenti([0.12, 0.08, 0.03, 0.16, 0.17, 0.04, 0.12, 0.08, -0.03, 0.16, 0.17, -0.04], m));
  for (const lato of [1, -1]) {
    const chela = spigoli(new THREE.BoxGeometry(0.09, 0.05, 0.06), m);
    chela.position.set(0.2, 0.05, lato * 0.07);
    chela.rotation.y = lato * 0.4;
    g.add(chela, segmenti([0.12, 0.05, lato * 0.05, 0.17, 0.05, lato * 0.07], m));
  }
  // Zampe: tre per lato, a due tratti, che si muovono quando cammina
  const zampe: THREE.Object3D[] = [];
  for (const lato of [1, -1]) for (const k of [0, 1, 2]) {
    const z = segmenti([0, 0, 0, 0, 0.04, lato * 0.1, 0, 0.04, lato * 0.1, -0.02, -0.04, lato * 0.17], mt);
    z.position.set(0.08 - k * 0.05, 0.05, lato * 0.05);
    g.add(z);
    zampe.push(z);
  }
  return { g, zampe };
}
function stellaMarina(m: THREE.LineBasicMaterial, mt: THREE.LineBasicMaterial) {
  const g = new THREE.Group();
  // Cinque bracci a cono sdraiati, un po' curvi, e un centro bombato
  for (let b = 0; b < 5; b++) {
    const braccio = spigoli(new THREE.ConeGeometry(0.07, 0.32, 5, 1), m);
    const a = (b / 5) * Math.PI * 2;
    braccio.rotation.set(0, -a, -Math.PI / 2 - 0.12);
    braccio.position.set(Math.cos(a) * 0.17, 0.03, Math.sin(a) * 0.17);
    g.add(braccio);
  }
  g.add(spigoli(new THREE.SphereGeometry(0.08, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), mt));
  return { g };
}
function conchiglia(m: THREE.LineBasicMaterial, mt: THREE.LineBasicMaterial) {
  const g = new THREE.Group();
  // Ventaglio bombato: costole che salgono e scendono dal cardine al bordo, bordo ondulato, due orecchie
  const orlo: THREE.Vector3[] = [], costole: number[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = -1.15 + (i / 12) * 2.3, punti: THREE.Vector3[] = [];
    for (let q = 0; q <= 6; q++) {
      const u = q / 6, d = u * (0.32 + (i % 2) * 0.015);
      punti.push(new THREE.Vector3(Math.cos(a) * d, Math.sin(u * Math.PI) * 0.09 * Math.cos(a * 0.8) + 0.01, Math.sin(a) * d));
    }
    for (let q = 0; q < 6; q++) costole.push(...punti[q]!.toArray(), ...punti[q + 1]!.toArray());
    orlo.push(punti[6]!);
  }
  g.add(segmenti(costole, mt), curva(orlo, m));
  g.add(segmenti([0, 0.01, -0.1, 0, 0.01, 0.1, 0, 0.01, -0.1, 0.06, 0.02, -0.08, 0, 0.01, 0.1, 0.06, 0.02, 0.08], m));
  return { g };
}

export function monta(el: HTMLElement, sezioni: Sezione[]) {
  const c = colori(el);
  const toni = sezioni.map(s => tonoSezione(`--${s.tono}`));
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const r = casuale(23);
  const chiaro = document.documentElement.dataset.theme === 'light';
  const acqua = tonoSezione('--azzurro');
  const sabbiaColore = tonoSezione('--arancio').lerp(c.muted, 0.65);
  const verde = tonoSezione('--verde').lerp(c.muted, 0.3);
  const rivaMedia = (z: number) => RIVA + z * z * 0.04 - RISALITA * 0.4;

  // Bordo dell'isola, come la riva del laghetto: una linea chiara e una più interna, appena visibile
  const contorno = Array.from({ length: 180 }, (_, i) => { const a = (i / 180) * Math.PI * 2, d = raggioIsola(a); return new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d); });
  gruppo.add(curva(contorno, linea(c.muted, 0.5), true));

  // Sabbia: puntini color sabbia dalla riva verso l'interno; mare: puntini azzurri, come l'acqua del laghetto
  const sabbia: number[] = [], mare: number[] = [];
  for (let x = -4; x <= 4; x += 0.2) for (let z = -4; z <= 4; z += 0.2) {
    const px = x + (r() - 0.5) * 0.08, pz = z + (r() - 0.5) * 0.08;
    if (!dentro(px, pz, 0.08)) continue;
    if (px < rivaMedia(pz)) sabbia.push(px, 0, pz); else if (px > bordo(pz, 0) + 0.25) mare.push(px, -0.02, pz);
  }
  gruppo.add(nuvola(sabbia, sabbiaColore, 0.024, chiaro ? 0.75 : 0.55), nuvola(mare, acqua, 0.022, chiaro ? 0.55 : 0.35));
  // Acqua riempita d'azzurro tenue, più intenso al largo
  for (const [da, opacita] of [[rivaMedia(0) + 0.1, 0.07], [1.3, 0.05], [2.2, 0.05]] as const) {
    const bordoMare = contorno.filter(p => p.x > da + p.z * p.z * 0.04);
    const ordinati = bordoMare.sort((p, q) => Math.atan2(p.z, p.x) - Math.atan2(q.z, q.x));
    const forma = new THREE.Shape([...ordinati.map(p => new THREE.Vector2(p.x, -p.z)), ...Array.from({ length: 24 }, (_, i) => {
      const z = ordinati[ordinati.length - 1]!.z + (i / 23) * (ordinati[0]!.z - ordinati[ordinati.length - 1]!.z);
      return new THREE.Vector2(da + z * z * 0.04, -z);
    })]);
    const strato = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshBasicMaterial({ color: acqua, transparent: true, opacity: opacita * (chiaro ? 1 : 0.9), depthWrite: false }));
    strato.rotation.x = -Math.PI / 2;
    strato.position.y = -0.03;
    strato.renderOrder = -1;
    gruppo.add(strato);
  }

  // Dune sul retro della spiaggia: ciuffi d'erba verdi e qualche cespuglio, come il prato del laghetto
  const erba: number[] = [];
  for (let k = 0; k < 120; k++) {
    const a = Math.PI * (0.6 + r() * 0.8), d = raggioIsola(a) - 0.15 - r() * 1.3;
    const x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.1 + r() * 0.18;
    for (const dx of [-0.05, 0, 0.05]) erba.push(x, 0, z, x + dx * 1.5, h * (dx === 0 ? 1.3 : 1), z + dx);
  }
  gruppo.add(segmenti(erba, linea(verde, 0.55)));
  for (let k = 0; k < 7; k++) {
    const a = Math.PI * (0.7 + r() * 0.6), d = raggioIsola(a) - 0.4 - r() * 0.7;
    const cespo = spigoli(new THREE.IcosahedronGeometry(0.12 + r() * 0.08, 0), linea(verde, 0.45));
    cespo.position.set(Math.cos(a) * d, 0.06, Math.sin(a) * d);
    cespo.scale.y = 0.65;
    gruppo.add(cespo);
  }
  // Sassi, un tronco portato dal mare, conchigliette sparse
  const matSassi = linea(c.muted, 0.65);
  for (let k = 0; k < 14; k++) {
    let x = 0, z = 0;
    do { x = -2.6 + r() * 3; z = (r() - 0.5) * 5; } while (!dentro(x, z, 0.3) || x > rivaMedia(z) - 0.3);
    const sasso = spigoli(new THREE.DodecahedronGeometry(0.05 + r() * 0.08, 0), matSassi);
    sasso.position.set(x, 0.02, z);
    sasso.scale.y = 0.55;
    sasso.rotation.y = r() * 3;
    gruppo.add(sasso);
  }
  const tronco = spigoli(new THREE.CylinderGeometry(0.06, 0.07, 1.1, 7, 3), linea(c.fg, 0.55));
  tronco.rotation.set(Math.PI / 2, 0, 0.5);
  tronco.position.set(-1.2, 0.06, -1.2);
  gruppo.add(tronco, segmenti([-1.45, 0.08, -1.55, -1.7, 0.2, -1.7, -1.45, 0.08, -1.55, -1.75, 0.1, -1.5], linea(c.fg, 0.55)));
  const matPiccole = linea(sabbiaColore, 0.7);
  for (let k = 0; k < 10; k++) {
    let x = 0, z = 0;
    do { x = -2.5 + r() * 2.8; z = (r() - 0.5) * 5; } while (!dentro(x, z, 0.3) || x > rivaMedia(z) - 0.2);
    const p: THREE.Vector3[] = [];
    for (let i = 0; i <= 26; i++) { const a = i * 0.45, d = 0.06 * Math.exp(-a * 0.1); p.push(new THREE.Vector3(Math.cos(a) * d, 0.01 + i * 0.001, Math.sin(a) * d)); }
    const piccola = curva(p, matPiccole);
    piccola.position.set(x, 0, z);
    piccola.rotation.y = r() * 6;
    gruppo.add(piccola);
  }

  // Onde: creste parallele alla riva che vengono dal largo, si alzano vicino a riva e si rompono in schiuma.
  // Ogni cresta è fatta di tratti, così si ferma al bordo dell'isola.
  const M = 60, ZMAX = 3.6;
  const cresta = () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((M - 1) * 6), 3));
    const l = new THREE.LineSegments(g, linea(acqua, 0));
    gruppo.add(l);
    return l;
  };
  const creste = Array.from({ length: CRESTE }, cresta);
  const schiuma = cresta(), schiuma2 = cresta();
  (schiuma.material as THREE.LineBasicMaterial).color = c.fg.clone();
  (schiuma2.material as THREE.LineBasicMaterial).color = c.fg.clone();
  // Disegna una linea lungo la riva: x(z) e y(z) danno la forma; i tratti fuori dall'isola spariscono
  const tracciaRiva = (l: THREE.LineSegments, x: (z: number) => number, y: (z: number) => number) => {
    const pos = l.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let m = 0; m < M - 1; m++) {
      const z1 = -ZMAX + (m / (M - 1)) * ZMAX * 2, z2 = -ZMAX + ((m + 1) / (M - 1)) * ZMAX * 2;
      const x1 = x(z1), x2 = x(z2);
      const ok = dentro(x1, z1, 0.06) && dentro(x2, z2, 0.06);
      pos.setXYZ(m * 2, x1, ok ? y(z1) : -50, z1);
      pos.setXYZ(m * 2 + 1, ok ? x2 : x1, ok ? y(z2) : -50, ok ? z2 : z1);
    }
    pos.needsUpdate = true;
  };
  // Segno dell'onda più alta sulla sabbia, fisso
  const segno = cresta();
  (segno.material as THREE.LineBasicMaterial).color = c.muted.clone();
  (segno.material as THREE.LineBasicMaterial).opacity = 0.35;
  tracciaRiva(segno, z => RIVA + z * z * 0.04 - RISALITA * 1.03 + Math.sin(z * 2.3) * 0.04, () => 0.005);

  // Le tre cose della battigia: l'onda che sale le spinge verso riva, quella che si ritira le riporta giù
  const materiali: THREE.LineBasicMaterial[][] = sezioni.map(() => []);
  const mat = (k: number, opacita: number) => { const m = linea(toni[k]!, opacita); materiali[k]!.push(m); return m; };
  const pg = paguro(mat(0, 0.95), mat(0, 0.6)), st = stellaMarina(mat(1, 0.9), mat(1, 0.6)), co = conchiglia(mat(2, 0.95), mat(2, 0.6));
  const cose = [
    { g: pg.g, scarto: -0.35, z: -1.3, giro: 0.4 },
    { g: st.g, scarto: -0.6, z: 1.3, giro: 0 },
    { g: co.g, scarto: -0.2, z: 0.1, giro: 2.7 },
  ].map((o, k) => {
    o.g.scale.setScalar(1.25);
    gruppo.add(o.g);
    punti.push({ id: `sezione:${sezioni[k]!.id}`, label: sezioni[k]!.label, href: sezioni[k]!.href, hub: true, famiglia: sezioni[k]!.id, ancora: o.g, tono: sezioni[k]!.tono });
    return { ...o, x: rivaMedia(o.z) + o.scarto };
  });

  // Due gabbiani che girano in tondo sopra il mare, con le ali che battono piano
  const gabbiani = [0, 1].map(k => {
    const g = new THREE.Group();
    const ali = [1, -1].map(lato => { const a = segmenti([0, 0, 0, 0.06, 0.03, lato * 0.12, 0.06, 0.03, lato * 0.12, 0.02, 0, lato * 0.24], linea(c.fg, 0.75)); g.add(a); return a; });
    gruppo.add(g);
    return { g, ali, raggio: 1 + k * 0.6, alto: 1.4 + k * 0.35, fase: k * 2.5, vel: 0.25 - k * 0.06 };
  });

  const accendi = (mats: THREE.Material[], livello: number) => {
    const k = livello === 1 ? 1.4 : livello === 0.5 ? 1 : 0.4;
    mats.forEach(m => { m.opacity = Math.min(1, (m.userData.base ??= m.opacity) * k); });
  };

  // Su schermi larghi il diorama sta a destra, così a sinistra c'è spazio per il testo; sul telefono sta al centro della sua fascia
  gruppo.position.x = el.clientWidth > 700 ? 1.9 : 0;
  let prima = -1;
  vista(el, gruppo, punti, {
    // Vista obliqua come il laghetto, un po' più lontana: il diorama sta tutto nello schermo
    camera: new THREE.Vector3(0, 5.6, 9.4),
    mira: new THREE.Vector3(0, -0.3, 0),
    inclinazione: [0.08, 0.45],
    giro: -0.5,
    aggiorna: (t, acceso) => {
      const s = t / 1000, dt = prima < 0 || t === 0 ? 0 : Math.min(0.05, (t - prima) / 1000);
      prima = t;
      // Creste: partono dal largo, corrono verso la riva, si alzano e poi svaniscono nella schiuma
      creste.forEach((l, k) => {
        const u = (((s / PERIODO) * 1.6 + k / CRESTE) % 1);
        const lontano = 3.6 - u * 3;
        const alto = 0.03 + Math.sin(u * Math.PI * 0.9) ** 2 * 0.1;
        tracciaRiva(l, z => Math.max(rivaMedia(z) + 0.15, lontano + z * z * 0.05 + Math.sin(z * 1.3 + k) * 0.08), z => alto * (0.8 + 0.2 * Math.sin(z * 2 + s)));
        (l.material as THREE.LineBasicMaterial).opacity = Math.sin(u * Math.PI) * (chiaro ? 0.8 : 0.65);
      });
      // Schiuma sul bordo dell'acqua: più bianca mentre l'onda sale; una seconda riga poco più al largo
      tracciaRiva(schiuma, z => bordo(z, s), () => 0.012);
      tracciaRiva(schiuma2, z => bordo(z, s) + 0.13 + Math.sin(z * 5 + s * 3) * 0.04, () => 0.01);
      (schiuma.material as THREE.LineBasicMaterial).opacity = fase(0, s) < 0.35 ? 0.95 : 0.6;
      (schiuma2.material as THREE.LineBasicMaterial).opacity = 0.35;

      cose.forEach((o, k) => {
        const meta = Math.min(rivaMedia(o.z) + o.scarto, bordo(o.z, s) - 0.05);
        const da = o.x;
        o.x += (meta - o.x) * Math.min(1, dt * (meta < o.x ? 3 : 0.7));
        // Il paguro cammina anche da solo, di lato, avanti e indietro lungo la riva
        if (o.g === pg.g) {
          o.z = -1.3 + Math.sin(s * 0.22) * 0.6;
          pg.zampe.forEach((z, i) => { z.rotation.y = Math.sin(s * 10 + i * 1.7) * 0.25; });
        }
        o.g.position.set(o.x, 0, o.z);
        o.giro += (o.x - da) * 1.2;
        o.g.rotation.y = o.giro;
        accendi(materiali[k]!, acceso(sezioni[k]!.id, `sezione:${sezioni[k]!.id}`));
      });
      gabbiani.forEach(g => {
        const a = g.fase + s * g.vel;
        g.g.position.set(1.6 + Math.cos(a) * g.raggio, g.alto + Math.sin(s * 0.7 + g.fase) * 0.08, Math.sin(a) * g.raggio);
        g.g.rotation.y = -a;
        g.ali.forEach((ala, i) => { ala.rotation.x = (i ? -1 : 1) * Math.sin(s * 4 + g.fase) * 0.35; });
      });
    },
  });
}
