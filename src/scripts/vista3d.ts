import * as THREE from 'three';

// Base comune per le scene 3D di Projects (bosco) e Advisory (laghetto).
// Gestisce renderer, camera, etichette, trascinamento per ruotare, clic per aprire
// e l'evento "grafo:evidenzia" che arriva dalle liste della pagina.

// Dati di una sezione: competenze chiave e le loro aree
export interface Area { id: string; label: string; href: string; peso: number; punti: number }
export interface Competenza { id: string; label: string; href: string; aree: Area[] }
// Progetto (solo Projects): le aree imparate lì, gli strumenti chiave, le cose che sto iniziando (alberelli)
export interface Progetto { id: string; label: string; aree: string[]; strumenti: string[]; crescita: string[] }
export interface DatiCompetenze { competenze: Competenza[]; progetti?: Progetto[] }

// Un punto cliccabile della scena. famiglia: la competenza a cui appartiene.
// base (facoltativa): con la base, il punto si tocca lungo tutto il segmento base-ancora (per esempio un albero intero).
// spento: il punto non si vede e non si tocca (per esempio i pali dei progetti nella vista per competenza).
// tono (facoltativo): colore della sezione per l'etichetta (verde, azzurro, arancio), per le scene con più sezioni.
export interface Punto { id: string; label: string; href: string; hub: boolean; famiglia: string; ancora: THREE.Object3D; base?: THREE.Object3D; spento?: boolean; tono?: string }

interface Opzioni {
  camera: THREE.Vector3;
  mira: THREE.Vector3;
  inclinazione: [number, number];
  // Chiamata a ogni fotogramma: muove gli oggetti e li accende o spegne
  aggiorna: (t: number, acceso: (famiglia: string, id: string) => number) => void;
  // Rotazione iniziale intorno all'asse verticale (0.4 se manca) e rotazione lenta automatica (sì se manca)
  giro?: number;
  ruotaDaSola?: boolean;
  // Clic che non prende nessun punto (per esempio un sasso lanciato nello stagno): riceve il raggio dalla camera
  clicVuoto?: (raggio: THREE.Raycaster) => void;
}

const css = (el: HTMLElement, nome: string) => new THREE.Color(getComputedStyle(el).getPropertyValue(nome).trim());

// Colore di una sezione (--verde, --azzurro, --arancio) nel tema attuale
export const tonoSezione = (nome: string) => css(document.documentElement, nome);
export function colori(el: HTMLElement) {
  return { fg: css(el, '--fg'), accent: css(el, '--accent'), muted: css(el, '--muted'), line: css(el, '--line'), bg: css(el, '--bg') };
}

export function vista(el: HTMLElement, gruppo: THREE.Group, punti: Punto[], o: Opzioni) {
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const c = colori(el);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(gruppo);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);

  const etichette = punti.map(p => {
    const s = document.createElement('span');
    s.className = `etichetta ${p.hub ? 'skill' : 'area'}`;
    s.textContent = p.label;
    if (p.tono) s.dataset.tono = p.tono;
    s.style.opacity = '0';
    el.appendChild(s);
    return s;
  });

  const larghezze: number[] = [];
  let w = 1, h = 1, rotY = o.giro ?? 0.4, rotX = o.inclinazione[0], fermo = 0;
  let sopra = -1, esterno = -1, ruota = false, mosso = 0;
  const giu = new THREE.Vector2(), ultimo = new THREE.Vector2();
  const vettore = new THREE.Vector3();
  const raggio = new THREE.Raycaster();

  const schermo = (i: number) => {
    const v = punti[i]!.ancora.getWorldPosition(vettore).project(camera);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, z: v.z };
  };
  const proietta = (o: THREE.Object3D) => {
    const v = o.getWorldPosition(vettore).project(camera);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, z: v.z };
  };
  // Distanza sullo schermo fra il puntatore e un punto, o il segmento base-ancora se il punto ha una base
  const distanza = (p: Punto, x: number, y: number) => {
    if (p.spento) return Infinity;
    const a = proietta(p.ancora);
    if (a.z >= 1) return Infinity;
    if (!p.base) return Math.hypot(a.x - x, a.y - y);
    const b = proietta(p.base);
    const dx = a.x - b.x, dy = a.y - b.y, l2 = dx * dx + dy * dy || 1;
    const u = THREE.MathUtils.clamp(((x - b.x) * dx + (y - b.y) * dy) / l2, 0, 1);
    return Math.hypot(b.x + u * dx - x, b.y + u * dy - y);
  };
  const piuVicino = (x: number, y: number) => {
    // Raggio di presa largo: pesci e alberi piccoli si prendono facilmente
    let best = -1, dist = 28;
    punti.forEach((p, i) => { const d = distanza(p, x, y); if (d < dist) { dist = d; best = i; } });
    return best;
  };
  const locale = (e: PointerEvent) => { const b = el.getBoundingClientRect(); return new THREE.Vector2(e.clientX - b.left, e.clientY - b.top); };

  el.addEventListener('pointerdown', e => {
    const m = locale(e);
    giu.copy(m); ultimo.copy(m); mosso = 0; ruota = true; fermo = 240;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', e => {
    const m = locale(e);
    mosso = Math.max(mosso, m.distanceTo(giu));
    if (ruota) {
      rotY += (m.x - ultimo.x) * 0.006;
      rotX = THREE.MathUtils.clamp(rotX + (m.y - ultimo.y) * 0.004, o.inclinazione[0] - 0.25, o.inclinazione[1]);
    } else {
      sopra = piuVicino(m.x, m.y);
      el.style.cursor = sopra >= 0 && punti[sopra]!.href ? 'pointer' : '';
    }
    ultimo.copy(m);
  });
  el.addEventListener('pointerup', e => {
    ruota = false;
    if (mosso < 4) {
      const m = locale(e);
      const i = piuVicino(m.x, m.y);
      if (i >= 0 && punti[i]!.href) apri(punti[i]!);
      else if (o.clicVuoto) {
        raggio.setFromCamera(new THREE.Vector2((m.x / w) * 2 - 1, -(m.y / h) * 2 + 1), camera);
        o.clicVuoto(raggio);
      }
    }
  });
  // Un clic mostra l'argomento: se la pagina ha la lista delle competenze, apre lì la sua voce;
  // altrimenti (per esempio nella home) va alla pagina dell'argomento
  function apri(p: Punto) {
    const voce = document.querySelector<HTMLElement>(`.competenze [data-id="${p.id}"]`);
    if (!voce) { window.location.href = p.href; return; }
    for (let d = voce.closest('details'); d; d = d.parentElement?.closest('details') ?? null) d.open = true;
    voce.scrollIntoView({ block: 'center', behavior: ridotto ? 'auto' : 'smooth' });
    voce.classList.remove('lampo');
    void voce.offsetWidth; // riparte l'animazione CSS
    voce.classList.add('lampo');
  }
  el.addEventListener('pointerleave', () => { sopra = -1; });
  window.addEventListener('grafo:evidenzia', e => {
    const id = (e as CustomEvent<string | null>).detail ?? '';
    esterno = punti.findIndex(p => p.id === id);
  });

  new ResizeObserver(() => {
    w = el.clientWidth; h = el.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    // In un riquadro stretto o alto la camera si allontana, così la scena entra tutta
    camera.position.copy(o.camera).multiplyScalar(Math.max(1, 1.3 / camera.aspect));
    camera.lookAt(o.mira);
    // La nebbia segue la distanza della camera: sfuma solo il fondo della scena
    const d = camera.position.distanceTo(o.mira);
    scene.fog = new THREE.Fog(c.bg, d * 0.75, d * 1.7);
    camera.updateProjectionMatrix();
  }).observe(el);

  function disegna() {
    // Una scena in una tab nascosta non consuma risorse
    if (el.offsetParent === null) { requestAnimationFrame(disegna); return; }
    const t = ridotto ? 0 : performance.now();
    if (fermo > 0) fermo--; else if (!ruota && !ridotto && o.ruotaDaSola !== false) rotY += 0.0012;
    gruppo.rotation.set(rotX, rotY, 0);

    const fuoco = sopra >= 0 ? sopra : esterno;
    const f = fuoco >= 0 ? punti[fuoco]! : null;
    // 1: in primo piano; 0.5: stessa competenza; 0.15: spento. Senza fuoco tutto a 0.5.
    const acceso = (famiglia: string, id: string) => !f ? 0.5 : id === f.id ? 1 : famiglia === f.famiglia ? 0.5 : 0.15;
    o.aggiorna(t, acceso);
    gruppo.updateMatrixWorld();

    const posti = punti.map((p, i) => {
      const sc = schermo(i);
      const a = acceso(p.famiglia, p.id);
      const mostra = !p.spento && sc.z < 1 && (i === fuoco || (p.hub && a > 0.15) || (!!f && f.hub && f.famiglia === p.famiglia));
      etichette[i]!.style.opacity = mostra ? '1' : '0';
      etichette[i]!.classList.toggle('attiva', i === fuoco);
      // Vicino al bordo destro l'etichetta passa a sinistra del punto, così resta leggibile
      // Larghezza letta una volta sola (rileggerla a ogni fotogramma rallenta la pagina); +14 per l'etichetta attiva
      const largo = (larghezze[i] ||= etichette[i]!.offsetWidth) + (i === fuoco ? 14 : 0);
      const x = Math.max(4, sc.x + 12 + largo > w - 4 ? sc.x - 12 - largo : sc.x + 12);
      return { i, x, y: sc.y - 8, largo, mostra };
    });
    // Etichette visibili che si toccano (per esempio i pesci di un branco, vicini fra loro):
    // dall'alto in basso, ognuna scende quanto basta per non coprire quella sopra
    const ALTO = 18;
    const visibili = posti.filter(q => q.mostra).sort((p, q) => p.y - q.y);
    visibili.forEach((q, k) => {
      for (let j = 0; j < k; j++) {
        const sopra = visibili[j]!;
        if (q.x < sopra.x + sopra.largo && sopra.x < q.x + q.largo && q.y < sopra.y + ALTO) q.y = sopra.y + ALTO;
      }
    });
    posti.forEach(q => { etichette[q.i]!.style.transform = `translate(${Math.round(q.x)}px, ${Math.round(q.y)}px)`; });
    renderer.render(scene, camera);
    requestAnimationFrame(disegna);
  }
  requestAnimationFrame(disegna);
  return { colori: c };
}
