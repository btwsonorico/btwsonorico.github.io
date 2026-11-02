import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Mattoni comuni delle tre scene di misc (barriera, prato dei formicai, nuvole), nello stile del bosco e del
// laghetto: forme a filo con un riempimento tenue, colori delle sezioni, dischi a strati e griglia di punti
// come terreno, nebbia sul fondo. Sono scene per rilassarsi, senza dati.

export function casuale(seme: number) {
  return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
}
export const tema = () => document.documentElement.dataset.theme === 'light';
const css = (nome: string) => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(nome).trim());
export function tavolozza() {
  return { verde: css('--verde'), azzurro: css('--azzurro'), arancio: css('--arancio'), fg: css('--fg'), muted: css('--muted'), bg: css('--bg') };
}
let tav: ReturnType<typeof tavolozza> | null = null;
const T = () => (tav ??= tavolozza());

// Tre toni chiave per ogni scena (di solito verde, azzurro, arancio). Chi guarda li può cambiare col color editor:
// la scelta resta in questo browser, separata per tema chiaro e scuro.
const chiaveToni = (scena: string) => `misc-toni-${scena}-${tema() ? 'chiaro' : 'scuro'}`;
export function toniSalvati(scena: string, base: THREE.ColorRepresentation[]) {
  let salvati: (string | null)[] | null = null;
  try { salvati = JSON.parse(localStorage.getItem(chiaveToni(scena)) ?? 'null'); } catch { /* niente */ }
  return base.map((c, i) => new THREE.Color(salvati?.[i] ?? c));
}
export function salvaToni(scena: string, toni: (string | null)[] | null) {
  try { if (toni) localStorage.setItem(chiaveToni(scena), JSON.stringify(toni)); else localStorage.removeItem(chiaveToni(scena)); } catch { /* niente */ }
}
// Toni della scena che si sta costruendo (li imposta il palco); senza, valgono quelli del sito
let attivi: THREE.Color[] | null = null;
// Toni chiave di partenza delle scene: verde, azzurro e arancio del sito
export const SITO = ['--verde', '--azzurro', '--arancio'].map(css);

// Ogni colore della scena diventa il tono di sezione più vicino (verde, azzurro, arancio), un po' più chiaro o
// più scuro; i colori quasi grigi diventano il colore del testo. Così le scene usano la stessa tavolozza del sito.
const hsl = { h: 0, s: 0, l: 0 }, hsl2 = { h: 0, s: 0, l: 0 };
export function tono(colore: THREE.ColorRepresentation) {
  new THREE.Color(colore).getHSL(hsl);
  const t = T();
  if (hsl.s < 0.2) return (hsl.l > 0.55 ? t.fg : t.muted).clone();
  // La famiglia si sceglie sui toni del sito; il colore che esce è il tono chiave della scena per quella famiglia
  const sito = [t.verde, t.azzurro, t.arancio];
  let meglio = 0, dm = 9;
  sito.forEach((c, i) => {
    c.getHSL(hsl2);
    const d = Math.min(Math.abs(hsl.h - hsl2.h), 1 - Math.abs(hsl.h - hsl2.h));
    if (d < dm) { dm = d; meglio = i; }
  });
  sito[meglio]!.getHSL(hsl2);
  return (attivi?.[meglio] ?? sito[meglio]!).clone().offsetHSL(0, 0, Math.max(-0.12, Math.min(0.12, (hsl.l - hsl2.l) * 0.5)));
}
export const PIENO = () => (tema() ? 0.24 : 0.2);
export const linea = (colore: THREE.ColorRepresentation, opacita = 0.9) => new THREE.LineBasicMaterial({ color: tono(colore), transparent: true, opacity: opacita });

// Materiale di un pezzo: riempimento tenue del tono, e i fili dello stesso tono (li aggiunge pezzo())
export interface Extra { side?: THREE.Side; opacity?: number; fili?: number; grezzo?: boolean; [altro: string]: unknown }
export function mat(colore: THREE.ColorRepresentation, extra: Extra = {}) {
  const c = extra.grezzo ? new THREE.Color(colore) : tono(colore);
  const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: extra.opacity ?? PIENO(), depthWrite: false, side: extra.side ?? THREE.FrontSide });
  if (extra.fili !== 0) m.userData.linea = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: extra.fili ?? 0.85 });
  return m;
}
const spigoli = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
export function pezzo(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  const l = m.userData.linea as THREE.LineBasicMaterial | undefined;
  if (l) o.add(new THREE.LineSegments(spigoli.get(geo) ?? spigoli.set(geo, new THREE.EdgesGeometry(geo, 25)).get(geo)!, l));
  return o;
}
// Sposta a caso i vertici di una forma, sempre allo stesso modo nei vertici che coincidono: sassi e colline irregolari
export function scuoti(geo: THREE.BufferGeometry, ampiezza: number, r: () => number, soloSopra = false) {
  const p = geo.attributes.position as THREE.BufferAttribute, visti = new Map<string, [number, number, number]>();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    const d = visti.get(k) ?? visti.set(k, [(r() - 0.5) * ampiezza, (r() - 0.5) * ampiezza, (r() - 0.5) * ampiezza]).get(k)!;
    if (soloSopra && p.getY(i) <= 0.001) continue;
    p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
  }
  geo.computeVertexNormals();
  return geo;
}
// Unisce più forme in una sola (un solo disegno per tanti pezzi uguali di colore)
export function unisci(geos: THREE.BufferGeometry[]) {
  const g = mergeGeometries(geos.map(x => {
    const y = new THREE.BufferGeometry();
    y.setAttribute('position', (x.index ? x.toNonIndexed() : x).attributes.position!);
    return y;
  }))!;
  g.computeVertexNormals();
  return g;
}
export const sasso = (raggio: number, r: () => number, dettaglio = 0) => scuoti(new THREE.IcosahedronGeometry(raggio, dettaglio), raggio * 0.45, r);

// Curve di livello di un terreno (marching squares): segmenti minori e, ogni tanto, maggiori
export function curveLivello(altezza: (x: number, z: number) => number, L: number, N: number, passoQuota: number, quotaMax: number, ogni = 5, quotaMin = passoQuota) {
  const passo = (L * 2) / N, H: number[] = [], minori: number[] = [], maggiori: number[] = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) H.push(altezza(-L + i * passo, -L + j * passo));
  let n = 1;
  for (let livello = quotaMin; livello < quotaMax; livello += passoQuota, n++) {
    const dove = n % ogni === 0 ? maggiori : minori;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x0 = -L + i * passo, z0 = -L + j * passo;
      if (Math.hypot(x0, z0) > L) continue;
      const v = [H[j * (N + 1) + i]!, H[j * (N + 1) + i + 1]!, H[(j + 1) * (N + 1) + i + 1]!, H[(j + 1) * (N + 1) + i]!];
      const angoli = [[x0, z0], [x0 + passo, z0], [x0 + passo, z0 + passo], [x0, z0 + passo]];
      const tagli: number[][] = [];
      for (let k = 0; k < 4; k++) {
        const a = v[k]!, b = v[(k + 1) % 4]!;
        if ((a < livello) !== (b < livello)) {
          const t = (livello - a) / (b - a), [ax, az] = angoli[k]!, [bx, bz] = angoli[(k + 1) % 4]!;
          tagli.push([ax! + (bx! - ax!) * t, az! + (bz! - az!) * t]);
        }
      }
      for (let k = 0; k + 1 < tagli.length; k += 2) dove.push(tagli[k]![0]!, livello + 0.01, tagli[k]![1]!, tagli[k + 1]![0]!, livello + 0.01, tagli[k + 1]![1]!);
    }
  }
  return { minori, maggiori };
}
// Punti ben distribuiti in un anello: ogni nuovo punto è, fra alcuni candidati, il più lontano da quelli già presi
export function benDistribuiti(n: number, da: number, a: number, r: () => number, presi: { x: number; z: number }[] = []) {
  const nuovi: { x: number; z: number }[] = [];
  for (let k = 0; k < n; k++) {
    let meglio = { x: 0, z: 0 }, dm = -1;
    for (let q = 0; q < 14; q++) {
      const ang = r() * Math.PI * 2, d = Math.sqrt(da * da + r() * (a * a - da * da)), x = Math.cos(ang) * d, z = Math.sin(ang) * d;
      const dist = Math.min(...[...presi, ...nuovi].map(c => Math.hypot(c.x - x, c.z - z)), 99);
      if (dist > dm) { dm = dist; meglio = { x, z }; }
    }
    nuovi.push(meglio);
  }
  return nuovi;
}
// Forma a filo nello stile del bosco: riempimento tenue e spigoli netti (soglia: da quale piega si disegna la linea)
export function filo(geo: THREE.BufferGeometry, base: THREE.Color, fili = 0.85, soglia = 28, riempi = PIENO()) {
  const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: riempi, depthWrite: false, side: THREE.DoubleSide }));
  o.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, soglia), new THREE.LineBasicMaterial({ color: base, transparent: true, opacity: fili })));
  return o;
}
// Solido pieno con l'ombreggiatura dipinta sui vertici (più chiaro verso la luce, più scuro in basso) e poche linee sulle
// pieghe nette: per rocce, ghiaccio e corpi che devono stare in primo piano sul filo
export function pieno(geo: THREE.BufferGeometry, base: THREE.Color, fili = 0.25, soglia = 32, ombra = 0.45, luceForza = 0.55) {
  geo.computeVertexNormals();
  const q = geo.attributes.position as THREE.BufferAttribute, n = geo.attributes.normal as THREE.BufferAttribute, colori: number[] = [], t = new THREE.Color();
  const lx = 0.33, ly = 0.87, lz = 0.36;
  for (let i = 0; i < q.count; i++) {
    t.copy(base).multiplyScalar(ombra + Math.max(0, n.getX(i) * lx + n.getY(i) * ly + n.getZ(i) * lz) * luceForza);
    colori.push(t.r, t.g, t.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colori, 3));
  const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
  if (fili > 0) o.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, soglia), new THREE.LineBasicMaterial({ color: base.clone().offsetHSL(0, 0, -0.15), transparent: true, opacity: fili })));
  return o;
}

// Terreno come nelle altre scene: dischi del tono a strati, più intensi verso il centro, e una griglia di punti
// che segue l'altezza del suolo
export function terreno(gruppo: THREE.Group, colore: THREE.Color, raggio: number, altezza: (x: number, z: number) => number = () => 0, dischi = true) {
  const chiaro = tema();
  if (dischi) for (const [rr, op] of [[raggio, 0.07], [raggio * 0.75, 0.045], [raggio * 0.5, 0.045]] as const) {
    const disco = new THREE.Mesh(new THREE.CircleGeometry(rr, 64), new THREE.MeshBasicMaterial({ color: colore, transparent: true, opacity: op * (chiaro ? 1 : 0.45), depthWrite: false }));
    disco.rotation.x = -Math.PI / 2;
    disco.position.y = -0.01;
    disco.renderOrder = -1;
    gruppo.add(disco);
  }
  const punti: number[] = [], passo = 0.3;
  for (let x = -raggio; x <= raggio; x += passo) for (let z = -raggio; z <= raggio; z += passo)
    if (Math.hypot(x, z) < raggio) punti.push(x, altezza(x, z), z);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(punti, 3));
  gruppo.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: T().muted, size: 0.025, transparent: true, opacity: 0.6 })));
}

// Nastri che ondeggiano (kelp, alghe, fili d'erba): una sola forma per tutti, riempimento tenue e trama a filo.
// Ogni nastro sale dal suo piede, si assottiglia in cima e può avere le foglie a onde; la scena dice di quanto si
// piega ogni punto a ogni fotogramma.
export interface Nastro { x: number; y: number; z: number; alto: number; largo: number; angolo: number; fase: number; colore: THREE.Color; foglie?: boolean }
export function nastri(lista: Nastro[], nodi = 10, grezzo = false) {
  const V = lista.length * nodi * 2;
  const pos = new Float32Array(V * 3), col = new Float32Array(V * 3), idx: number[] = [];
  lista.forEach((q, n) => {
    const c = grezzo ? q.colore : tono(q.colore);
    for (let i = 0; i < nodi; i++) {
      const a = (n * nodi + i) * 2;
      for (const k of [a, a + 1]) col.set([c.r, c.g, c.b], k * 3);
      if (i < nodi - 1) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: PIENO() * 1.3, depthWrite: false, side: THREE.DoubleSide }));
  mesh.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, wireframe: true, transparent: true, opacity: 0.55 })));
  mesh.frustumCulled = false;
  (mesh.children[0] as THREE.Mesh).frustumCulled = false;
  const fuori = new THREE.Vector2();
  // piega(q, t, fuori): spostamento orizzontale del punto all'altezza t (0 al piede, 1 in cima)
  const aggiorna = (piega: (q: Nastro, t: number, fuori: THREE.Vector2) => void, s: number) => {
    lista.forEach((q, n) => {
      for (let i = 0; i < nodi; i++) {
        const t = i / (nodi - 1);
        piega(q, t, fuori.set(0, 0));
        const a = q.angolo + t * 1.4 + Math.sin(s * 0.5 + q.fase) * 0.3;
        const onda = q.foglie ? 0.55 + 0.75 * Math.sin(i * 1.7 + q.fase) ** 2 : 1;
        const w = q.largo * (1 - t * 0.75) * onda / 2, cx = Math.cos(a) * w, cz = Math.sin(a) * w;
        const x = q.x + fuori.x, y = q.y + t * q.alto * (1 - 0.15 * fuori.length() / q.alto), z = q.z + fuori.y;
        const k = (n * nodi + i) * 6;
        pos[k] = x - cx; pos[k + 1] = y; pos[k + 2] = z - cz;
        pos[k + 3] = x + cx; pos[k + 4] = y; pos[k + 5] = z + cz;
      }
    });
    geo.attributes.position!.needsUpdate = true;
  };
  return { mesh, aggiorna };
}

// Grandezza delle particelle in pixel a distanza 1: la stessa per tutte, la aggiorna il palco prima di disegnare
const SCALA = { value: 500 };

// Particelle morbide (nuvole, bolle, neve marina, scie): ognuna col suo colore, la sua grandezza e la sua trasparenza
export function puntiMorbidi(n: number) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3).fill(1), dim = new Float32Array(n).fill(0.1), alfa = new Float32Array(n).fill(1);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('colore', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('dimensione', new THREE.BufferAttribute(dim, 1));
  geo.setAttribute('alfa', new THREE.BufferAttribute(alfa, 1));
  const materiale = new THREE.ShaderMaterial({
    uniforms: { scala: SCALA },
    transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec3 colore; attribute float dimensione; attribute float alfa;
      uniform float scala; varying vec3 vColore; varying float vAlfa;
      void main() {
        vColore = colore; vAlfa = alfa;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = dimensione * scala / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColore; varying float vAlfa;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        gl_FragColor = vec4(vColore, vAlfa * (1.0 - d * d));
      }`,
  });
  const punti = new THREE.Points(geo, materiale);
  punti.frustumCulled = false;
  const aggiorna = () => {
    for (const nome of ['position', 'colore', 'dimensione', 'alfa']) (geo.attributes[nome] as THREE.BufferAttribute).needsUpdate = true;
  };
  return { punti, pos, col, dim, alfa, materiale, aggiorna };
}

export interface Palco {
  scena: THREE.Scene; gruppo: THREE.Group; camera: THREE.PerspectiveCamera;
  // Raggio dal puntatore dentro la scena, o null quando il puntatore è fuori
  raggio: THREE.Raycaster | null;
  chiaro: boolean; ridotto: boolean; telefono: boolean;
  // Fattore per le particelle: grandezza in pixel a distanza 1 dalla camera
  scalaPunti: number;
  // Colori del sito; verde, azzurro e arancio sono i tre toni chiave della scena
  colori: ReturnType<typeof tavolozza>;
  toni: THREE.Color[];
  // Ferma la scena e libera la memoria (per ridisegnarla con altri colori)
  distruggi: () => void;
}
export interface OpzioniPalco {
  camera: THREE.Vector3; mira: THREE.Vector3; fov?: number;
  // Giro lento da solo (radianti al secondo), e quanto si può alzare o abbassare lo sguardo trascinando
  giro?: number; inclina?: [number, number];
  // Nebbia: da quale distanza (in volte la distanza della camera) le cose sfumano nel fondo
  nebbia?: [number, number];
  // Zoom con la rotella o con due dita: quanto vicino e quanto lontano può andare la camera (in volte la distanza)
  zoom?: [number, number];
  aggiorna: (s: number, dt: number, p: Palco) => void;
  clic?: (raggio: THREE.Raycaster, p: Palco) => void;
  // Presa: la scena può tenere il trascinamento per sé (per esempio per tirare una nuvola) invece di girare la vista.
  // afferra risponde true se ha preso qualcosa; trascina arriva a ogni movimento, rilascia quando si lascia.
  afferra?: (raggio: THREE.Raycaster) => boolean; trascina?: (raggio: THREE.Raycaster) => void; rilascia?: () => void;
  // Nome della scena e i suoi tre toni chiave di partenza. famiglie: false quando i toni non sono il verde,
  // l'azzurro e l'arancio della scena (per esempio i colori delle colonie di formiche): allora il resto resta del sito
  scena: string; toni: THREE.ColorRepresentation[]; famiglie?: boolean;
}

// Palco: renderer, camera e ciclo. Trascinando si gira la scena; quando è fuori schermo, nascosta o la scheda
// non si vede, non disegna.
export function palco(el: HTMLElement, o: OpzioniPalco) {
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const telefono = window.innerWidth < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, telefono ? 1.5 : 2));
  el.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  const scena = new THREE.Scene(), gruppo = new THREE.Group();
  scena.add(gruppo);
  const camera = new THREE.PerspectiveCamera(o.fov ?? 40, 1, 0.1, 80);
  const toni = toniSalvati(o.scena, o.toni);
  const famiglie = o.famiglie !== false;
  attivi = famiglie ? toni : null;
  const p: Palco = {
    scena, gruppo, camera, raggio: null, chiaro: tema(), ridotto, telefono, scalaPunti: 500,
    colori: famiglie ? { ...T(), verde: toni[0]!, azzurro: toni[1]!, arancio: toni[2]! } : T(), toni, distruggi: () => {},
  };

  scena.fog = new THREE.Fog(p.colori.bg, 1, 2);
  let inVista = true, vivo = true;
  const io = new IntersectionObserver(v => { inVista = v.some(x => x.isIntersecting); });
  io.observe(el);
  const dir = o.camera.clone().sub(o.mira);
  const dist = dir.length(), alza0 = Math.asin(dir.y / dist), giro0 = Math.atan2(dir.x, dir.z);
  let lontano = 1;
  const ro = new ResizeObserver(() => {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    // In un riquadro stretto la camera si allontana, così la scena entra tutta
    lontano = Math.max(1, 1.3 / camera.aspect);
    camera.updateProjectionMatrix();
    p.scalaPunti = h * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  });
  ro.observe(el);

  // Trascinamento: giro intorno alla scena con un po' di inerzia; lo sguardo sale e scende entro i limiti
  const [giu, su] = o.inclina ?? [-0.12, 0.12];
  let giro = 0, alza = 0, velGiro = 0, premuto = false, mosso = 0, px = 0, py = 0, fermo = 0, dentro = false;
  // Zoom: la distanza voluta cambia con la rotella o allargando due dita; quella vera la segue piano
  const [vicinoMax, lontanoMax] = o.zoom ?? [1, 1];
  let zoom = 1, zoomVoluto = 1;
  const dita = new Map<number, { x: number; y: number }>();
  let pinza = 0;
  if (o.zoom) cv0().addEventListener('wheel', e => {
    e.preventDefault();
    zoomVoluto = THREE.MathUtils.clamp(zoomVoluto * Math.exp(e.deltaY * 0.0012), vicinoMax, lontanoMax);
    fermo = 240;
  }, { passive: false });
  function cv0() { return renderer.domElement; }
  const ndc = new THREE.Vector2(), raggio = new THREE.Raycaster();
  const cv = renderer.domElement;
  cv.style.touchAction = 'pan-y';
  let presa = false;
  const aNdc = (e: PointerEvent) => { const b = cv.getBoundingClientRect(); ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); };
  cv.addEventListener('pointerdown', e => {
    aNdc(e);
    dentro = true;
    raggio.setFromCamera(ndc, camera);
    if (o.afferra?.(raggio)) { presa = true; mosso = 10; try { cv.setPointerCapture(e.pointerId); } catch { /* niente */ } return; }
    dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
    premuto = true; mosso = 0; px = e.clientX; py = e.clientY; velGiro = 0;
    if (dita.size === 2) { const [a, b] = [...dita.values()]; pinza = Math.hypot(a!.x - b!.x, a!.y - b!.y); }
  });
  cv.addEventListener('pointerup', e => { dita.delete(e.pointerId); });
  cv.addEventListener('pointercancel', e => { dita.delete(e.pointerId); });
  const lascia = () => { premuto = false; if (presa) { presa = false; o.rilascia?.(); } };
  window.addEventListener('pointerup', lascia);
  window.addEventListener('pointercancel', lascia);
  cv.addEventListener('pointermove', e => {
    const b = cv.getBoundingClientRect();
    ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    dentro = true;
    if (presa) { raggio.setFromCamera(ndc, camera); o.trascina?.(raggio); return; }
    if (dita.has(e.pointerId)) dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Due dita: allargarle avvicina, stringerle allontana
    if (o.zoom && dita.size === 2) {
      const [a, b] = [...dita.values()], d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinza > 0) zoomVoluto = THREE.MathUtils.clamp(zoomVoluto * (pinza / d), vicinoMax, lontanoMax);
      pinza = d; mosso += 10; fermo = 240;
      return;
    }
    if (!premuto) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX; py = e.clientY;
    mosso += Math.abs(dx) + Math.abs(dy);
    velGiro = -dx * 0.005;
    giro += velGiro;
    alza = Math.min(su, Math.max(giu, alza + dy * 0.003));
    fermo = 240;
  });
  cv.addEventListener('pointerleave', () => { dentro = false; });
  cv.addEventListener('click', () => {
    if (mosso > 6 || !o.clic) return;
    raggio.setFromCamera(ndc, camera);
    o.clic(raggio, p);
  });

  let prima = performance.now(), s = 0;
  function disegna(ora: number) {
    if (!vivo) return;
    requestAnimationFrame(disegna);
    const dt = Math.min(0.05, (ora - prima) / 1000);
    prima = ora;
    if (el.offsetParent === null || !inVista || document.hidden) return;
    s += ridotto ? 0 : dt;
    if (!premuto) { giro += velGiro; velGiro *= 0.94; }
    if (fermo > 0) fermo--; else if (!ridotto) giro += (o.giro ?? 0.02) * dt;
    const a = giro0 + giro, e = alza0 + alza;
    zoom += (zoomVoluto - zoom) * Math.min(1, dt * 6 || 1);
    const d = dist * lontano * zoom;
    camera.position.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).multiplyScalar(d).add(o.mira);
    // La nebbia segue la distanza della camera: sfuma solo il fondo della scena
    const [vicino, fondo] = o.nebbia ?? [0.75, 1.7];
    (scena.fog as THREE.Fog).near = d * vicino; (scena.fog as THREE.Fog).far = d * fondo;
    camera.lookAt(o.mira);
    if (dentro) { raggio.setFromCamera(ndc, camera); p.raggio = raggio; } else p.raggio = null;
    o.aggiorna(s, ridotto ? 0 : dt, p);
    SCALA.value = p.scalaPunti;
    renderer.render(scena, camera);
  }
  requestAnimationFrame(disegna);
  p.distruggi = () => {
    vivo = false;
    io.disconnect(); ro.disconnect();
    window.removeEventListener('pointerup', lascia);
    scena.traverse(o => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach(x => x.dispose());
    });
    renderer.dispose();
    cv.remove();
  };
  return p;
}
