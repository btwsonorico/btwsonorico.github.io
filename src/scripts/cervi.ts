import * as THREE from 'three';

// Una famiglia di cervi bianchi, per le scene 3D (il bosco di Software e il mondo dell'About).
// Forme arrotondate a facce, come i pesci del laghetto; gambe sottili con il ginocchio e lo zoccolo scuro.
// L'andatura è a quattro tempi (posteriore sinistra, anteriore sinistra, posteriore destra, anteriore destra):
// il corpo sale e scende appena e la testa accompagna il passo. Velocità e virate cambiano piano.
// Da fermi brucano o alzano la testa e si guardano intorno; orecchie e coda si muovono.
// I cerbiatti seguono la mamma. Se c'è del cibo (una mela), il cervo libero più vicino va a mangiarlo.
// Quando la scena appare, i cervi crescono da zero uno dopo l'altro, con un piccolo rimbalzo, come gli alberi.

export type Tipo = 'cervo' | 'cerva' | 'cerbiatto';
export interface Cibo { x: number; z: number; aTerra: boolean; mangiata: number }
interface Opzioni {
  colori: { fg: THREE.Color; bg: THREE.Color; muted: THREE.Color };
  chiaro: boolean;
  casuale: () => number;
  tipi: Tipo[];
  // Sceglie una nuova meta a caso, dentro la zona dove i cervi possono camminare
  meta: (out: THREE.Vector2) => void;
  // Punti da aggirare (alberi, stagno...): i cervi ci girano intorno
  ostacoli: () => { x: number; z: number; raggio?: number }[];
  // Il cibo è stato mangiato tutto
  finito?: (cibo: Cibo) => void;
  // Zone dove i cervi non possono mettere piede (per esempio l'acqua): lì si fermano, si girano e cambiano meta
  vietato?: (x: number, z: number) => boolean;
}

const MISURA: Record<Tipo, number> = { cervo: 0.8, cerva: 0.68, cerbiatto: 0.44 };
// Fase di ogni zampa nel passo: posteriore sinistra, anteriore sinistra, posteriore destra, anteriore destra
const ZAMPE = [
  { x: -0.12, z: 0.045, fase: 0, davanti: false }, { x: 0.12, z: 0.045, fase: 0.25, davanti: true },
  { x: -0.12, z: -0.045, fase: 0.5, davanti: false }, { x: 0.12, z: -0.045, fase: 0.75, davanti: true },
];
const morbido = (da: number, a: number, k: number) => da + (a - da) * Math.min(1, k);
const angolo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function famigliaCervi(gruppo: THREE.Group, o: Opzioni) {
  const { colori: c, chiaro } = o, r = o.casuale;
  const linea = (colore: THREE.Color, opacita: number) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
  // Corpo pieno: bianco di notte; di giorno un grigio caldo, perché il bianco sul fondo chiaro sparirebbe
  const matCervo = new THREE.MeshBasicMaterial({ color: new THREE.Color(chiaro ? '#cdc7b8' : '#eef1f5'), transparent: true, opacity: chiaro ? 1 : 0.92 });
  // Sul fondo chiaro i bordi sono scuri, così il cervo bianco si stacca dallo sfondo
  const matBordi = linea(c.fg, chiaro ? 0.5 : 0.4), matCorna = linea(c.fg, chiaro ? 0.75 : 0.85);
  const geoOvale = new THREE.SphereGeometry(1, 8, 6), bordiOvale = new THREE.EdgesGeometry(geoOvale, 25);
  // Ellissoide pieno con i bordi delle facce: il mattone di tutto il corpo
  const ovale = (rx: number, ry: number, rz: number, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geoOvale, matCervo), new THREE.LineSegments(bordiOvale, matBordi));
    g.scale.set(rx, ry, rz);
    g.position.set(x, y, z);
    return g;
  };
  // Gambe snelle ma piene: coscia a cono rovesciato, stinco affusolato, zoccolo scuro
  const geoCoscia = new THREE.CylinderGeometry(0.034, 0.017, 0.17, 6), bordiCoscia = new THREE.EdgesGeometry(geoCoscia, 30);
  const geoStinco = new THREE.CylinderGeometry(0.013, 0.01, 0.16, 6), bordiStinco = new THREE.EdgesGeometry(geoStinco, 30), geoZoccolo = new THREE.CylinderGeometry(0.012, 0.015, 0.018, 6);
  const matZoccolo = new THREE.MeshBasicMaterial({ color: c.fg.clone().lerp(c.bg, chiaro ? 0.2 : 0.55) });
  const matMacchie = new THREE.PointsMaterial({ color: c.muted, size: 0.025, transparent: true, opacity: 0.9 });

  const nuovoCervo = (tipo: Tipo) => {
    const cervo = new THREE.Group();
    const cucciolo = tipo === 'cerbiatto', snella = tipo === 'cerva' ? 0.88 : 1;
    // Il cerbiatto ha le zampe lunghe rispetto al corpo: il corpo sta più in alto
    const lungaZampa = cucciolo ? 1.18 : 1, alto = 0.32 * lungaZampa;
    const corpo = new THREE.Group();
    corpo.position.y = alto;
    corpo.add(
      ovale(0.17 * snella, 0.075 * snella, 0.068 * snella, 0, 0.04, 0),
      ovale(0.085, 0.078 * snella, 0.066 * snella, -0.11, 0.045, 0),
      ovale(0.08, 0.082 * snella, 0.066 * snella, 0.11, 0.035, 0),
    );
    if (cucciolo) {
      const macchie: number[] = [];
      for (let q = 0; q < 10; q++) macchie.push(-0.13 + (q % 5) * 0.06, 0.1, (q < 5 ? 1 : -1) * 0.035);
      const geoMacchie = new THREE.BufferGeometry();
      geoMacchie.setAttribute('position', new THREE.Float32BufferAttribute(macchie, 3));
      corpo.add(new THREE.Points(geoMacchie, matMacchie));
    }
    // Collo e testa: il collo ruota all'attacco sul petto, la testa ruota in cima al collo
    const collo = new THREE.Group();
    collo.position.set(0.14, 0.07, 0);
    collo.add(ovale(0.038, 0.11, 0.034, 0.045, 0.085, 0));
    collo.children[0]!.rotation.z = -0.4;
    const testa = new THREE.Group();
    testa.position.set(0.085, 0.18, 0);
    const muso = ovale(0.07, 0.036, 0.033, 0.045, -0.005, 0);
    muso.rotation.z = -0.3;
    testa.add(muso);
    const orecchie = [1, -1].map(lato => {
      const e = ovale(0.012, 0.038, 0.022, -0.005, 0.035, lato * 0.03);
      e.rotation.x = lato * 0.6;
      testa.add(e);
      return e;
    });
    if (tipo === 'cervo') {
      const corna: number[] = [];
      for (const lato of [1, -1]) corna.push(
        0.0, 0.03, lato * 0.02, -0.03, 0.12, lato * 0.07, -0.015, 0.075, lato * 0.045, 0.04, 0.1, lato * 0.06,
        -0.03, 0.12, lato * 0.07, -0.08, 0.18, lato * 0.09, -0.03, 0.12, lato * 0.07, 0.0, 0.19, lato * 0.08,
        -0.055, 0.15, lato * 0.08, -0.04, 0.21, lato * 0.1,
      );
      const geoCorna = new THREE.BufferGeometry();
      geoCorna.setAttribute('position', new THREE.Float32BufferAttribute(corna, 3));
      testa.add(new THREE.LineSegments(geoCorna, matCorna));
    }
    collo.add(testa);
    const coda = ovale(0.02, 0.035, 0.018, -0.2, 0.06, 0);
    coda.rotation.z = 0.5;
    corpo.add(collo, coda);
    cervo.add(corpo);
    // Zampe: anca, coscia, ginocchio e stinco con lo zoccolo; ogni pezzo ruota intorno al suo attacco
    const zampe = ZAMPE.map(q => {
      const anca = new THREE.Group();
      anca.position.set(q.x * snella, alto, q.z);
      // Coscia affusolata, che parte larga dal corpo e si stringe verso il ginocchio
      const coscia = new THREE.Mesh(geoCoscia, matCervo);
      coscia.position.y = -0.08;
      anca.add(coscia, new THREE.LineSegments(bordiCoscia, matBordi).translateY(-0.08));
      const ginocchio = new THREE.Group();
      ginocchio.position.y = -0.16 * lungaZampa;
      // Stinco sottile e dritto, e lo zoccolo piccolo e scuro
      const stinco = new THREE.Mesh(geoStinco, matCervo);
      stinco.scale.y = lungaZampa;
      stinco.position.y = -0.08 * lungaZampa;
      const zoccolo = new THREE.Mesh(geoZoccolo, matZoccolo);
      zoccolo.position.set(0.004, -0.162 * lungaZampa, 0);
      const bordoStinco = new THREE.LineSegments(bordiStinco, matBordi);
      bordoStinco.scale.y = lungaZampa;
      bordoStinco.position.y = -0.08 * lungaZampa;
      ginocchio.add(stinco, bordoStinco, zoccolo);
      anca.add(ginocchio);
      cervo.add(anca);
      return { ...q, anca, ginocchio };
    });
    cervo.scale.setScalar(MISURA[tipo]);
    cervo.visible = false;
    gruppo.add(cervo);
    const partenza = new THREE.Vector2();
    o.meta(partenza);
    return {
      tipo, alto, cervo, corpo, collo, testa, orecchie, coda, zampe,
      x: partenza.x, z: partenza.y, verso: r() * Math.PI * 2, giro: 0, vel: 0, passo: r(),
      meta: new THREE.Vector2(), stato: 'cammina' as 'cammina' | 'bruca' | 'guarda', timer: 0, sguardo: 0,
      lato: 0, orecchio: 0, scodinzolo: 0, cibo: null as Cibo | null, scala: MISURA[tipo],
    };
  };
  type Cervo = ReturnType<typeof nuovoCervo>;

  const cervi = o.tipi.map(nuovoCervo);
  // Il secondo cervo maschio, se c'è, è più giovane: un po' più piccolo
  cervi.filter(v => v.tipo === 'cervo').slice(1).forEach(v => { v.scala *= 0.9; });
  const mamma = cervi.find(v => v.tipo === 'cerva') ?? cervi[0]!;
  const nuovaMeta = (v: Cervo) => o.meta(v.meta);
  cervi.forEach(nuovaMeta);
  // I cerbiatti partono vicino alla mamma, uno per lato
  cervi.filter(v => v.tipo === 'cerbiatto').forEach((v, i) => { v.lato = i % 2 ? -1 : 1; v.x = mamma.x - 0.25; v.z = mamma.z + v.lato * 0.25; v.verso = mamma.verso; });

  // Il cibo è sparito: chi ci stava andando sceglie un'altra meta
  const lascia = (cibo: Cibo) => {
    cervi.forEach(v => { if (v.cibo === cibo) { v.cibo = null; v.stato = 'cammina'; nuovaMeta(v); } });
  };
  // Crescita: veloce all'inizio, con un piccolo rimbalzo (la stessa degli alberi)
  const ease = (x: number) => { const k = 1.4; x -= 1; return x * x * ((k + 1) * x + k) + 1; };
  let prima = -1, nascita = -1;
  return {
    cervi,
    // Il cervo libero più vicino va verso il cibo
    chiama(cibo: Cibo) {
      let migliore: Cervo | null = null, dist = Infinity;
      for (const v of cervi) {
        if (v.cibo) continue;
        const d = Math.hypot(v.x - cibo.x, v.z - cibo.z);
        if (d < dist) { dist = d; migliore = v; }
      }
      if (migliore) { migliore.cibo = cibo; migliore.stato = 'cammina'; }
    },
    lascia,
    aggiorna(t: number, visibili: boolean) {
      const dt = prima < 0 || t === 0 ? 0 : Math.min(0.05, (t - prima) / 1000);
      prima = t;
      const ostacoli = o.ostacoli();
      if (visibili && nascita < 0) nascita = t;
      cervi.forEach((v, k) => {
        v.cervo.visible = visibili;
        // Con prefers-reduced-motion t resta 0: i cervi sono già cresciuti
        const cresce = t === 0 ? 1 : THREE.MathUtils.clamp((t - nascita - k * 280) / 800, 0, 1);
        v.cervo.scale.setScalar(Math.max(0.001, v.scala * ease(cresce)));
        const cucciolo = v.tipo === 'cerbiatto';
        // Chi ha del cibo va in un punto poco prima del frutto, così ci arriva con la bocca e non con il corpo;
        // i cerbiatti, altrimenti, seguono la mamma: un punto al suo fianco, un po' dietro
        if (v.cibo) {
          const bocca = 0.3 * v.scala, vx = v.cibo.x - v.x, vz = v.cibo.z - v.z, l = Math.hypot(vx, vz) || 1;
          v.meta.set(v.cibo.x - (vx / l) * bocca, v.cibo.z - (vz / l) * bocca);
        }
        else if (cucciolo) {
          const dietro = mamma.verso + Math.PI + v.lato * 0.8;
          v.meta.set(mamma.x + Math.cos(dietro) * 0.28, mamma.z - Math.sin(dietro) * 0.28);
        }
        const dx = v.meta.x - v.x, dz = v.meta.y - v.z, d = Math.hypot(dx, dz);
        if (dt > 0) {
          // Stato: cammina verso la meta; arrivato, bruca o si guarda intorno; poi sceglie una nuova meta.
          // Con il cibo il cervo si ferma quando la bocca ci arriva, e mangia a testa bassa
          if (v.cibo && v.cibo.aTerra && v.stato === 'cammina' && d < 0.05) {
            v.stato = 'bruca';
            v.timer = 2.5;
          } else if (v.cibo) {
            if (v.stato === 'bruca') {
              v.timer -= dt;
              v.cibo.mangiata = 1 - Math.max(0, v.timer) / 2.5;
              if (v.timer <= 0) { const cibo = v.cibo; lascia(cibo); o.finito?.(cibo); }
            }
          } else if (v.stato === 'cammina' && d < (cucciolo ? 0.1 : 0.2)) {
            v.stato = r() < 0.6 ? 'bruca' : 'guarda';
            v.timer = cucciolo ? 1 + r() * 1.5 : 3 + r() * 4;
            v.sguardo = (r() - 0.5) * 1.6;
          } else if (v.stato !== 'cammina') {
            v.timer -= dt;
            if (cucciolo && d > 0.3) v.stato = 'cammina';
            else if (v.timer <= 0) {
              if (!cucciolo && v.stato === 'bruca' && r() < 0.5) { v.stato = 'guarda'; v.timer = 1.5 + r() * 2; v.sguardo = (r() - 0.5) * 1.6; }
              else { v.stato = 'cammina'; if (!cucciolo) nuovaMeta(v); }
            }
          }
          // Velocità: cresce e cala piano; i cerbiatti trottano quando restano indietro; verso il cibo, di buon passo
          const voluta = v.stato !== 'cammina' ? 0 : v.cibo ? 0.3 : cucciolo ? THREE.MathUtils.clamp(0.12 + d * 0.6, 0.12, 0.5) : v.tipo === 'cervo' ? 0.24 : 0.2;
          v.vel = morbido(v.vel, voluta, dt * 1.4);
          // Direzione: verso la meta, lontano dagli ostacoli vicini; la virata accelera e rallenta piano
          let hx = dx / (d || 1), hz = dz / (d || 1);
          for (const q of ostacoli) {
            const raggio = q.raggio ?? 0.5, ox = v.x - q.x, oz = v.z - q.z, od = Math.hypot(ox, oz);
            if (od < raggio && od > 1e-3) { hx += (ox / od) * (raggio - od) * 3; hz += (oz / od) * (raggio - od) * 3; }
          }
          const differenza = angolo(Math.atan2(-hz, hx) - v.verso);
          v.giro = morbido(v.giro, v.vel > 0.02 ? THREE.MathUtils.clamp(differenza * 1.5, -0.9, 0.9) : 0, dt * 2.5);
          v.verso += v.giro * dt;
          const nx = v.x + Math.cos(v.verso) * v.vel * dt, nz = v.z - Math.sin(v.verso) * v.vel * dt;
          if (o.vietato?.(nx, nz)) {
            // Davanti c'è una zona vietata: il cervo si gira e, se la meta era là, ne sceglie un'altra
            v.verso += Math.PI * 0.6 * dt * 4;
            v.vel *= 0.5;
            if (!v.cibo && o.vietato(v.meta.x, v.meta.y)) nuovaMeta(v);
          } else { v.x = nx; v.z = nz; }
          // Passo: avanza con la strada fatta, una falcata ogni 0.4 unità della taglia del cervo
          v.passo += (v.vel * dt) / (0.4 * MISURA[v.tipo]);
          // Orecchie e coda: un piccolo scatto ogni tanto
          if (r() < dt * 0.4) v.orecchio = 1;
          if (r() < dt * 0.25) v.scodinzolo = 1;
          v.orecchio = Math.max(0, v.orecchio - dt * 3);
          v.scodinzolo = Math.max(0, v.scodinzolo - dt * 2.5);
        }
        // Ampiezza del passo: zero da fermi, piena alla velocità di marcia
        const amp = THREE.MathUtils.clamp(v.vel / 0.2, 0, 1.3);
        const giro2 = Math.PI * 2 * v.passo;
        v.cervo.position.set(v.x, 0, v.z);
        v.cervo.rotation.y = v.verso;
        // Il corpo sale e scende due volte per passo, ondeggia di lato e si inclina appena in curva
        v.corpo.position.y = v.alto + Math.sin(giro2 * 2) * 0.006 * amp;
        v.corpo.rotation.x = Math.sin(giro2) * 0.025 * amp - v.giro * 0.08;
        v.corpo.rotation.z = Math.sin(giro2 * 2 + 0.6) * 0.012 * amp;
        v.zampe.forEach(z => {
          const fase = Math.PI * 2 * (v.passo + z.fase);
          // Anca: avanti e indietro. Ginocchio: si piega solo mentre la zampa torna avanti (fase di volo)
          z.anca.rotation.z = Math.sin(fase) * 0.42 * amp;
          const volo = Math.max(0, Math.cos(fase)) ** 1.5 * amp;
          z.ginocchio.rotation.z = (z.davanti ? -1 : 1) * volo * 0.75;
          z.anca.position.y = v.corpo.position.y;
        });
        // Collo e testa: giù per brucare, alti e girati quando si guarda intorno, con un piccolo cenno a ogni passo
        const colloVoluto = v.stato === 'bruca' ? -1.05 : v.stato === 'guarda' ? 0.18 : Math.sin(giro2 * 2 + 0.4) * 0.07 * amp;
        v.collo.rotation.z = morbido(v.collo.rotation.z, colloVoluto, dt * 2.2);
        v.testa.rotation.y = morbido(v.testa.rotation.y, v.stato === 'guarda' ? v.sguardo : 0, dt * 1.8);
        v.testa.rotation.z = morbido(v.testa.rotation.z, v.stato === 'bruca' ? -0.4 : 0, dt * 2);
        v.orecchie.forEach((e, n) => { e.rotation.z = Math.sin(t * 0.03 + n) * 0.5 * v.orecchio; });
        v.coda.rotation.x = Math.sin(t * 0.04) * 0.6 * v.scodinzolo;
      });
    },
  };
}
