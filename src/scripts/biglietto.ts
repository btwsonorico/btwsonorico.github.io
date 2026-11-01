import * as THREE from 'three';
import { colori, tonoSezione, vista, type Punto } from './vista3d';

// Biglietto da visita in wireframe, nello stile di bosco e laghetto. Davanti: nome, ruolo, ente ed email,
// scritti nel font del sito. Dietro: tre timbri, uno per sezione (un albero per SW engineering, un pesce per Advisory,
// una stella per Knowledge). Il biglietto gira piano da solo; si gira trascinando. Un clic su un timbro apre la sezione.

export interface Sezione { id: string; label: string; href: string; tono: string }
export interface Testi { nome: string; ruolo: string; ente: string; email: string }

const W = 3.4, H = 2, D = 0.05, RAGGIO = 0.14;

const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
const segmenti = (xyz: number[], mat: THREE.LineBasicMaterial) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
  return new THREE.LineSegments(g, mat);
};
const anello = (punti: THREE.Vector3[], mat: THREE.LineBasicMaterial) => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(punti), mat);
const cerchio = (raggio: number, n: number, z: number) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(a) * raggio, Math.sin(a) * raggio, z);
});
// Rettangolo con gli angoli arrotondati, sul piano z
function bordoArrotondato(w: number, h: number, r: number, z: number) {
  const p: THREE.Vector3[] = [];
  const angoli = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, Math.PI * 1.5]] as const;
  for (const [cx, cy, a0] of angoli) for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * (Math.PI / 2); p.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z)); }
  return p;
}

// Testo del fronte su un canvas, usato come texture: il font pixel del sito resta nitido
async function fronte(t: Testi, c: ReturnType<typeof colori>) {
  try { await document.fonts.load('48px "Departure Mono"'); } catch {}
  const tela = document.createElement('canvas');
  tela.width = 1360; tela.height = 800;
  const ctx = tela.getContext('2d')!;
  const css = (k: THREE.Color) => `#${k.getHexString()}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = css(c.muted);
  ctx.font = '33px "Departure Mono", monospace';
  ctx.fillText('~/riccardomondi', 90, 130);
  ctx.fillStyle = css(c.fg);
  ctx.font = '88px "Departure Mono", monospace';
  ctx.fillText(t.nome, 90, 330);
  ctx.font = '44px "Departure Mono", monospace';
  ctx.fillStyle = css(c.accent);
  ctx.fillText(t.ruolo, 90, 410);
  ctx.fillStyle = css(c.muted);
  ctx.font = '30px "Departure Mono", monospace';
  const parole = t.ente.split(' '), righe: string[] = [];
  let riga = '';
  for (const p of parole) { if (ctx.measureText(`${riga} ${p}`).width > 1100 && riga) { righe.push(riga); riga = p; } else riga = riga ? `${riga} ${p}` : p; }
  righe.push(riga);
  righe.forEach((r, i) => ctx.fillText(r, 90, 500 + i * 44));
  ctx.fillStyle = css(c.fg);
  ctx.font = '33px "Departure Mono", monospace';
  ctx.fillText(t.email, 90, 700);
  // Un piccolo motivo a pixel nell'angolo, come un codice da scansionare
  ctx.fillStyle = css(c.fg);
  let seme = 7;
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
    seme = (seme * 16807) % 2147483647;
    const bordo = i === 0 || j === 0 || i === 6 || j === 6;
    if (bordo || seme % 3 === 0) ctx.fillRect(1100 + i * 22, 90 + j * 22, 18, 18);
  }
  const tex = new THREE.CanvasTexture(tela);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function monta(el: HTMLElement, sezioni: Sezione[], testi: Testi) {
  const c = colori(el);
  const toni = sezioni.map(s => tonoSezione(`--${s.tono}`));
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];

  // Il biglietto: bordo arrotondato davanti e dietro, spigoli agli angoli, una cornice interna tenue
  const matBordo = linea(c.fg, 0.85), matCornice = linea(c.muted, 0.35);
  gruppo.add(anello(bordoArrotondato(W, H, RAGGIO, D / 2), matBordo), anello(bordoArrotondato(W, H, RAGGIO, -D / 2), matBordo));
  gruppo.add(anello(bordoArrotondato(W - 0.16, H - 0.16, RAGGIO * 0.7, D / 2 + 0.001), matCornice), anello(bordoArrotondato(W - 0.16, H - 0.16, RAGGIO * 0.7, -D / 2 - 0.001), matCornice));
  const spigoli: number[] = [];
  for (const [x, y] of [[W / 2, 0], [-W / 2, 0], [0, H / 2], [0, -H / 2]] as const) spigoli.push(x, y, D / 2, x, y, -D / 2);
  gruppo.add(segmenti(spigoli, matBordo));
  // Fronte: la texture con il testo arriva quando il font è pronto
  fronte(testi, c).then(tex => {
    const piano = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, H - 0.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    piano.position.z = D / 2 + 0.003;
    gruppo.add(piano);
  });

  // Retro: tre timbri a cerchio con un disegno dentro, nel colore della sezione
  const materiali: THREE.LineBasicMaterial[][] = sezioni.map(() => []);
  const mat = (k: number, opacita: number) => { const m = linea(toni[k]!, opacita); materiali[k]!.push(m); return m; };
  const z = -D / 2 - 0.004;
  const disegni = [
    // Albero: chioma a triangoli e tronco
    (k: number) => segmenti([0, 0.26, z, -0.17, 0, z, 0, 0.26, z, 0.17, 0, z, -0.17, 0, z, 0.17, 0, z, 0, 0.14, z, -0.21, -0.12, z, 0, 0.14, z, 0.21, -0.12, z, -0.21, -0.12, z, 0.21, -0.12, z, 0, -0.12, z, 0, -0.26, z], mat(k, 0.9)),
    // Pesce: corpo a fuso, coda e occhio
    (k: number) => {
      const p: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; p.push(new THREE.Vector3(Math.cos(a) * 0.2, Math.sin(a) * 0.1, z)); }
      const g = new THREE.Group();
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), mat(k, 0.9)));
      g.add(segmenti([-0.2, 0, z, -0.3, 0.1, z, -0.2, 0, z, -0.3, -0.1, z, -0.3, 0.1, z, -0.3, -0.1, z, 0.1, 0.03, z, 0.12, 0.03, z], mat(k, 0.9)));
      return g;
    },
    // Stella a quattro punte
    (k: number) => anello(Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2, d = i % 2 ? 0.07 : 0.27; return new THREE.Vector3(Math.sin(a) * d, Math.cos(a) * d, z); }), mat(k, 0.9)),
  ];
  const timbri = sezioni.map((s, k) => {
    const timbro = new THREE.Group();
    // Sul retro la sinistra è invertita: il primo timbro va a destra guardando il retro dal davanti
    timbro.position.set((1 - k) * 1.05, 0.12, 0);
    timbro.add(anello(cerchio(0.42, 48, z), mat(k, 0.8)));
    // Cerchio esterno tratteggiato, come un timbro vero
    const tratti: number[] = [];
    for (let i = 0; i < 36; i += 2) { const a = (i / 36) * Math.PI * 2, b = ((i + 1) / 36) * Math.PI * 2; tratti.push(Math.cos(a) * 0.5, Math.sin(a) * 0.5, z, Math.cos(b) * 0.5, Math.sin(b) * 0.5, z); }
    timbro.add(segmenti(tratti, mat(k, 0.5)));
    timbro.add(disegni[k]!(k));
    gruppo.add(timbro);
    const ancora = new THREE.Object3D();
    ancora.position.set(0, -0.62, z);
    timbro.add(ancora);
    const punto: Punto = { id: `sezione:${s.id}`, label: s.label, href: s.href, hub: true, famiglia: s.id, ancora, base: timbro, tono: s.tono, spento: true };
    punti.push(punto);
    return { timbro, punto };
  });

  const accendi = (mats: THREE.Material[], livello: number) => {
    const k = livello === 1 ? 1.4 : livello === 0.5 ? 1 : 0.4;
    mats.forEach(m => { m.opacity = Math.min(1, (m.userData.base ??= m.opacity) * k); });
  };
  const camera = new THREE.Vector3(0, 0.5, 6.5);
  const verso = camera.clone().normalize(), normale = new THREE.Vector3();

  vista(el, gruppo, punti, {
    camera,
    mira: new THREE.Vector3(0, 0, 0),
    inclinazione: [0.05, 0.45],
    giro: -0.35,
    aggiorna: (t, acceso) => {
      // Il biglietto ondeggia appena, come se fosse appeso a un filo
      gruppo.position.y = Math.sin(t * 0.0012) * 0.05;
      // Il retro si tocca solo quando è girato verso la camera
      normale.set(0, 0, 1).applyQuaternion(gruppo.quaternion);
      const retro = normale.dot(verso) < 0;
      timbri.forEach((q, k) => {
        // Da davanti i timbri del retro non si vedono: il biglietto non è trasparente
        q.punto.spento = !retro;
        q.timbro.visible = retro;
        accendi(materiali[k]!, acceso(sezioni[k]!.id, q.punto.id));
      });
    },
  });
}
