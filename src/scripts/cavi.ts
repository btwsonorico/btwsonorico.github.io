import * as THREE from 'three';
import { casuale, mat, pezzo, linea, terreno, palco, curveLivello, benDistribuiti, SITO, type Palco } from './natura';
import { VOCI, paroleDi } from '../lib/glossario';
import { nuovaScheda } from './schedaGlossario';

// Stormo del glossario: colline a curve di livello, una linea di tralicci con i cavi e un uccello per ogni definizione.
// Lo stormo vola; ogni tanto un uccello scende, si posa su un cavo e la sua definizione appare per intero. Resta il tempo
// di leggerla, poi riparte e ne scende un altro. Una voce nuova nel glossario è un uccello in più.

const L = 8, N = VOCI.length;
const CENTRO = new THREE.Vector3(0, 4.3, 0), LARGO = 4.6, QUOTA_MIN = 3.3, QUOTA_MAX = 5.3, VEL_MIN = 0.7, VEL_MAX = 1.35;
const SU = new THREE.Vector3(0, 1, 0);

export function monta(el: HTMLElement) {
  const r = casuale(41);
  const p = palco(el, {
    camera: new THREE.Vector3(0, 7.4, 17.5), mira: new THREE.Vector3(0, 2, 0), giro: 0.006, inclina: [-0.14, 0.5], nebbia: [1.0, 2.0], zoom: [0.45, 1.2], aggiorna, clic,
    scena: 'cavi', toni: SITO,
  });
  const g = p.gruppo, c = p.colori;

  // --- Colline basse e larghe: la scena è lo sfondo dello stormo
  const altezza = (x: number, z: number) => 0.2 + 0.06 * Math.sin(x * 0.8 + 1) * Math.cos(z * 0.7)
    + 1.1 * Math.exp(-((x + 4.5) ** 2 + (z + 3.5) ** 2) / 7) + 0.9 * Math.exp(-((x - 4.6) ** 2 + (z + 3) ** 2) / 6) + 0.7 * Math.exp(-((x - 2) ** 2 + (z - 5) ** 2) / 5);
  terreno(g, c.verde, L + 0.5, altezza, false);
  {
    const geo = new THREE.RingGeometry(0.01, L + 0.3, 96, 30).rotateX(-Math.PI / 2);
    const q = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < q.count; i++) q.setY(i, altezza(q.getX(i), q.getZ(i)) - 0.01);
    const velo = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c.verde, transparent: true, opacity: p.chiaro ? 0.08 : 0.04, depthWrite: false }));
    velo.renderOrder = -1;
    g.add(velo);
    const { minori, maggiori } = curveLivello(altezza, L, 120, 0.2, 2.4);
    for (const [xyz, op] of [[minori, 0.3], [maggiori, 0.7]] as const) {
      const curve = new THREE.BufferGeometry();
      curve.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
      g.add(new THREE.LineSegments(curve, new THREE.LineBasicMaterial({ color: c.verde, transparent: true, opacity: op })));
    }
  }

  // --- Tralicci: quattro gambe che salgono strette, controventi a X e un braccio in cima. I cavi vanno da un traliccio all'altro
  const tinta = p.chiaro ? '#3a332c' : '#e8e6e0', H = 2.7;
  const TRALICCI = [-6.2, -2.1, 2.1, 6.2].map((x, i) => new THREE.Vector3(x, 0, 0.9 * Math.sin(i * 1.7 + 0.5)));
  TRALICCI.forEach(t => { t.y = altezza(t.x, t.z); });
  const attacchi = TRALICCI.map((t, i) => {
    const prima = TRALICCI[Math.max(0, i - 1)]!, dopo = TRALICCI[Math.min(TRALICCI.length - 1, i + 1)]!;
    const via = dopo.clone().sub(prima).setY(0).normalize(), lato = new THREE.Vector3(-via.z, 0, via.x);
    const seg: number[] = [], punto = (y: number, a: number, b: number) => t.clone().addScaledVector(via, a).addScaledVector(lato, b).setY(t.y + y);
    const riga = (q: THREE.Vector3, w: THREE.Vector3) => seg.push(q.x, q.y, q.z, w.x, w.y, w.z);
    const largo = (y: number) => 0.26 * (1 - y / H) ** 1.3 + 0.035;
    const ANGOLI = [[1, 1], [1, -1], [-1, -1], [-1, 1]] as const, LIVELLI = 6;
    for (let l = 0; l < LIVELLI; l++) {
      const y0 = (l / LIVELLI) * H, y1 = ((l + 1) / LIVELLI) * H, a0 = largo(y0), a1 = largo(y1);
      ANGOLI.forEach(([a, b], k) => {
        const [e, f] = ANGOLI[(k + 1) % 4]!;
        riga(punto(y0, a * a0, b * a0), punto(y1, a * a1, b * a1));
        riga(punto(y1, a * a1, b * a1), punto(y1, e * a1, f * a1));
        riga(punto(y0, a * a0, b * a0), punto(y1, e * a1, f * a1));
      });
    }
    // Braccio: i due cavi di lato stanno alle sue punte, il terzo in cima
    const yBraccio = H * 0.84, sx = punto(yBraccio, 0, -0.62), dx = punto(yBraccio, 0, 0.62), cima = punto(H, 0, 0);
    riga(sx, dx);
    riga(sx, punto(H * 0.92, 0, 0));
    riga(dx, punto(H * 0.92, 0, 0));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    g.add(new THREE.LineSegments(geo, linea(tinta, 0.7)));
    return [sx, dx, cima];
  });
  const FRECCIA = 0.32;
  const sulCavo = (campata: number, filo: number, u: number, fuori = new THREE.Vector3()) =>
    fuori.lerpVectors(attacchi[campata]![filo]!, attacchi[campata + 1]![filo]!, u).setY(THREE.MathUtils.lerp(attacchi[campata]![filo]!.y, attacchi[campata + 1]![filo]!.y, u) - FRECCIA * 4 * u * (1 - u));
  {
    const seg: number[] = [], a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let q = 0; q < TRALICCI.length - 1; q++) for (let f = 0; f < 3; f++) for (let i = 0; i < 24; i++) {
      sulCavo(q, f, i / 24, a); sulCavo(q, f, (i + 1) / 24, b);
      seg.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    g.add(new THREE.LineSegments(geo, linea(tinta, 0.55)));
  }

  // --- Abeti a filo, sparsi lontano dalla linea dei cavi
  const chioma = mat(c.verde, { grezzo: true, opacity: 0.18, fili: 0.75 });
  benDistribuiti(16, 2, L - 1, r).forEach(q => {
    if (Math.abs(q.z) < 1.8) return;
    const h = 0.55 + r() * 0.5, y = altezza(q.x, q.z);
    g.add(pezzo(new THREE.ConeGeometry(h * 0.3, h * 0.65, 6), chioma, q.x, y + h * 0.45, q.z), pezzo(new THREE.ConeGeometry(h * 0.22, h * 0.5, 6), chioma, q.x, y + h * 0.85, q.z));
  });

  // --- Stormo: un uccello per definizione, due segmenti a V
  type Uccello = { pos: THREE.Vector3; vel: THREE.Vector3; stato: 'vola' | 'scende' | 'posato'; fase: number; battito: number };
  const uccelli: Uccello[] = VOCI.map((_, i) => {
    const a = i * 2.4, d = Math.sqrt(i / N) * LARGO * 0.7;
    return {
      pos: new THREE.Vector3(CENTRO.x + Math.cos(a) * d, QUOTA_MIN + r() * (QUOTA_MAX - QUOTA_MIN), CENTRO.z + Math.sin(a) * d * 0.7),
      vel: new THREE.Vector3(Math.cos(a + 1.5), 0, Math.sin(a + 1.5)), stato: 'vola', fase: r() * 6, battito: 8 + r() * 4,
    };
  });
  const posU = new Float32Array(N * 12), colU = new Float32Array(N * 12);
  const geoU = new THREE.BufferGeometry();
  geoU.setAttribute('position', new THREE.BufferAttribute(posU, 3));
  geoU.setAttribute('color', new THREE.BufferAttribute(colU, 3));
  const lineeU = new THREE.LineSegments(geoU, new THREE.LineBasicMaterial({ vertexColors: true }));
  lineeU.frustumCulled = false;
  g.add(lineeU);
  const colVolo = p.colori.fg.clone(), colPosato = p.colori.arancio.clone();

  // --- Chi si posa: un giro per volta su tutte le definizioni, in ordine casuale. Un clic su un uccello in volo lo fa scendere
  const giro: number[] = [];
  const prossimoDaGiro = () => {
    if (!giro.length) {
      for (let i = 0; i < N; i++) giro.push(i);
      for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [giro[i], giro[j]] = [giro[j]!, giro[i]!]; }
    }
    return giro.pop()!;
  };
  const scheda = nuovaScheda(el.parentElement!, 'next →', () => riparte());
  const nome = document.createElement('span');
  nome.className = 'etichetta skill';
  nome.style.opacity = '0';
  el.appendChild(nome);
  const posto = new THREE.Vector3();
  let attivo = -1, scelto = -1, attesa = 2.5, lettura = 0;
  const scendi = (i: number) => {
    attivo = i;
    // Un posto sul cavo che resti visibile accanto alla scheda: a sinistra su schermi larghi, in alto su telefono
    const stretto = el.clientWidth < 700;
    for (let prova = 0; prova < 16; prova++) {
      sulCavo(Math.floor(r() * (TRALICCI.length - 1)), Math.floor(r() * 3), 0.15 + r() * 0.7, posto);
      tmp.copy(posto);
      g.localToWorld(tmp).project(p.camera);
      if (stretto ? Math.abs(tmp.x) < 0.6 : tmp.x > -0.75 && tmp.x < 0.05) break;
    }
    uccelli[i]!.stato = 'scende';
    nome.textContent = VOCI[i]!.termine;
  };
  const posa = () => {
    const u = uccelli[attivo]!;
    u.pos.copy(posto); u.vel.set(0, 0, 0); u.stato = 'posato';
    scheda.mostra(VOCI[attivo]!);
    nome.style.opacity = '1';
    // Il tempo di leggerla: circa 3 parole al secondo, mai troppo poco
    lettura = THREE.MathUtils.clamp(paroleDi(VOCI[attivo]!) / 3, 7, 90);
  };
  function riparte() {
    if (attivo < 0) return;
    const u = uccelli[attivo]!;
    if (u.stato === 'posato') u.vel.set((r() - 0.5) * 0.6, 0.9, (r() - 0.5) * 0.6);
    u.stato = 'vola';
    attivo = -1;
    attesa = scelto >= 0 ? 0 : 1.8;
    scheda.nascondi();
    nome.style.opacity = '0';
  }
  function clic(raggio: THREE.Raycaster) {
    let meglio = 0.55, chi = -1;
    uccelli.forEach((u, i) => { if (u.stato === 'vola') { const d = raggio.ray.distanceToPoint(u.pos); if (d < meglio) { meglio = d; chi = i; } } });
    if (chi < 0) return;
    scelto = chi;
    if (attivo >= 0) riparte();
  }

  const dir = new THREE.Vector3(), lato = new THREE.Vector3(), acc = new THREE.Vector3(), media = new THREE.Vector3(), centro = new THREE.Vector3(), separa = new THREE.Vector3(), tmp = new THREE.Vector3(), colU0 = new THREE.Color();
  function aggiorna(s: number, dt: number, q: Palco) {
    // Turni: chi è posato legge, poi riparte; quando nessuno è posato ne scende un altro
    if (attivo < 0) {
      attesa -= q.ridotto ? 1 : dt;
      if (attesa <= 0) {
        const i = scelto >= 0 ? scelto : prossimoDaGiro();
        scelto = -1;
        scendi(i);
        if (q.ridotto) posa();
      }
    } else if (uccelli[attivo]!.stato === 'posato' && !scheda.stato.sopra && !q.ridotto) {
      lettura -= dt;
      if (lettura <= 0) riparte();
    }
    const raggio = q.raggio;
    uccelli.forEach((u, i) => {
      if (u.stato === 'vola') {
        media.set(0, 0, 0); centro.set(0, 0, 0); separa.set(0, 0, 0);
        let vicini = 0;
        uccelli.forEach((o, j) => {
          if (j === i || o.stato !== 'vola') return;
          tmp.subVectors(o.pos, u.pos);
          const d2 = tmp.lengthSq();
          if (d2 > 1.7) return;
          vicini++;
          media.add(o.vel); centro.add(tmp);
          if (d2 < 0.12) separa.addScaledVector(tmp, -1 / (Math.sqrt(d2) + 0.01));
        });
        acc.set(0, 0, 0);
        if (vicini) acc.addScaledVector(media.divideScalar(vicini).sub(u.vel), 0.7).addScaledVector(centro.divideScalar(vicini), 0.35);
        acc.addScaledVector(separa, 1.3);
        // Una meta che vaga piano, e confini morbidi
        tmp.set(Math.sin(s * 0.11) * 2.4, CENTRO.y + Math.sin(s * 0.17) * 0.5, Math.sin(s * 0.08 + 1) * 1.6).sub(u.pos);
        acc.addScaledVector(tmp, 0.1);
        const fuori = Math.hypot(u.pos.x, u.pos.z * 1.4) - LARGO;
        if (fuori > 0) { acc.x -= u.pos.x * fuori * 0.6; acc.z -= u.pos.z * fuori * 0.6; }
        if (u.pos.y < QUOTA_MIN) acc.y += (QUOTA_MIN - u.pos.y) * 3;
        if (u.pos.y > QUOTA_MAX) acc.y -= (u.pos.y - QUOTA_MAX) * 3;
        // Si scostano dal puntatore
        if (raggio) {
          const d = raggio.ray.distanceToPoint(u.pos);
          if (d < 0.8) { raggio.ray.closestPointToPoint(u.pos, tmp); tmp.subVectors(u.pos, tmp).normalize(); acc.addScaledVector(tmp, (1 - d / 0.8) * 6); }
        }
        u.vel.addScaledVector(acc, dt);
        const v = u.vel.length() || 1;
        u.vel.multiplyScalar(THREE.MathUtils.clamp(v, VEL_MIN, VEL_MAX) / v);
        u.pos.addScaledVector(u.vel, dt);
      } else if (u.stato === 'scende') {
        // Plana sul posto: rallenta arrivando, le ali battono meno
        tmp.subVectors(posto, u.pos);
        const d = tmp.length();
        if (d < 0.04) posa();
        else {
          tmp.multiplyScalar(Math.min(1.5, 0.35 + d * 0.8) / d).sub(u.vel);
          u.vel.addScaledVector(tmp, Math.min(1, dt * 2.5));
          u.pos.addScaledVector(u.vel, dt);
        }
      }
      // Disegno: in volo una V che batte, posato due trattini chiusi sopra il cavo
      const k = i * 12, posato = u.stato === 'posato';
      dir.copy(u.vel).setY(0);
      if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0);
      dir.normalize();
      lato.crossVectors(SU, dir);
      const battito = q.ridotto ? 0.3 : Math.sin(s * u.battito + u.fase) + 0.3, a = 0.13, h = battito * 0.055, y = u.pos.y + (posato ? 0.035 : 0);
      if (posato) {
        posU.set([u.pos.x, y, u.pos.z, u.pos.x + dir.x * 0.09 + lato.x * 0.02, y + 0.05, u.pos.z + dir.z * 0.09 + lato.z * 0.02, u.pos.x, y, u.pos.z, u.pos.x - dir.x * 0.09 - lato.x * 0.02, y + 0.03, u.pos.z - dir.z * 0.09 - lato.z * 0.02], k);
      } else {
        posU.set([u.pos.x, y, u.pos.z, u.pos.x + lato.x * a - dir.x * 0.05, y + h, u.pos.z + lato.z * a - dir.z * 0.05, u.pos.x, y, u.pos.z, u.pos.x - lato.x * a - dir.x * 0.05, y + h, u.pos.z - lato.z * a - dir.z * 0.05], k);
      }
      colU0.copy(i === attivo ? colPosato : colVolo);
      for (let v = 0; v < 4; v++) colU.set([colU0.r, colU0.g, colU0.b], k + v * 3);
    });
    geoU.attributes.position!.needsUpdate = true;
    geoU.attributes.color!.needsUpdate = true;
    // Nome accanto all'uccello posato
    if (attivo >= 0 && uccelli[attivo]!.stato === 'posato') {
      tmp.copy(uccelli[attivo]!.pos);
      g.localToWorld(tmp).project(q.camera);
      nome.style.transform = `translate(${Math.round((tmp.x * 0.5 + 0.5) * el.clientWidth - nome.offsetWidth / 2)}px, ${Math.round((-tmp.y * 0.5 + 0.5) * el.clientHeight - 30)}px)`;
    }
  }
  const distruggi = p.distruggi;
  p.distruggi = () => { scheda.togli(); nome.remove(); distruggi(); };
  return p;
}
