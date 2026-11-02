import * as THREE from 'three';

// Grafo 3D a forze. Si può tirare un nodo (gli altri seguono le molle), aprirlo con un clic,
// ruotare la scena trascinando lo spazio vuoto. La lista dei testi può evidenziare un nodo
// con l'evento "grafo:evidenzia".

type Tipo = 'testo' | 'tema' | 'fonte' | 'area' | 'tech' | 'skill';
interface Nodo { id: string; tipo: Tipo; label: string; href?: string; debole?: boolean }
interface Stato extends Nodo { p: THREE.Vector3; v: THREE.Vector3; mesh: THREE.Mesh; etichetta: HTMLSpanElement; vicini: Set<number> }
interface StellaGrezza { id: string; label: string; href: string; temi: string[] }

// Colori letti dal grafo stesso: una sezione può avere un suo --accent
const css = (el: HTMLElement, nome: string) => new THREE.Color(getComputedStyle(el).getPropertyValue(nome).trim());

export function monta(el: HTMLElement) {
  const { nodi: grezzi, archi: archiId, stelle: grezzeStelle = [] } = JSON.parse(el.dataset.grafo!) as { nodi: Nodo[]; archi: [string, string][]; stelle?: StellaGrezza[] };
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colori = { fg: css(el, '--fg'), accent: css(el, '--accent'), muted: css(el, '--muted'), line: css(el, '--line'), bg: css(el, '--bg') };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(colori.bg, 6, 13);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.z = 9;
  const gruppo = new THREE.Group();
  scene.add(gruppo);

  // Forma e colore per tipo. I nodi "hub" (temi, tecnologie, competenze) hanno sempre l'etichetta.
  // Competenze e aree hanno le stesse palle di temi e testi: il grafo Projects si legge come quello Knowledge.
  const stile: Record<Tipo, { geo: THREE.BufferGeometry; colore: THREE.Color; wire: boolean; hub: boolean }> = {
    testo: { geo: new THREE.SphereGeometry(0.09, 16, 12), colore: colori.fg, wire: false, hub: false },
    tema: { geo: new THREE.SphereGeometry(0.14, 20, 14), colore: colori.accent, wire: false, hub: true },
    fonte: { geo: new THREE.OctahedronGeometry(0.13), colore: colori.muted, wire: true, hub: false },
    area: { geo: new THREE.SphereGeometry(0.09, 16, 12), colore: colori.fg, wire: false, hub: false },
    tech: { geo: new THREE.BoxGeometry(0.15, 0.15, 0.15), colore: colori.accent, wire: false, hub: true },
    skill: { geo: new THREE.SphereGeometry(0.14, 20, 14), colore: colori.accent, wire: false, hub: true },
  };

  // Posizioni iniziali su una sfera, deterministiche
  const nodi: Stato[] = grezzi.map((n, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / grezzi.length), theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const p = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)).multiplyScalar(2.5);
    const st = stile[n.tipo];
    const mesh = new THREE.Mesh(st.geo, new THREE.MeshBasicMaterial({ color: st.colore, wireframe: st.wire, transparent: true }));
    gruppo.add(mesh);
    const etichetta = document.createElement('span');
    etichetta.className = `etichetta ${n.tipo}`;
    etichetta.textContent = n.label;
    etichetta.style.opacity = '0';
    el.appendChild(etichetta);
    return { ...n, p, v: new THREE.Vector3(), mesh, etichetta, vicini: new Set() };
  });
  const indice = new Map(nodi.map((n, i) => [n.id, i]));
  const archi = archiId.map(([a, b]) => [indice.get(a)!, indice.get(b)!] as [number, number]);
  archi.forEach(([a, b]) => { nodi[a]!.vicini.add(b); nodi[b]!.vicini.add(a); });

  const posLinee = new Float32Array(archi.length * 6), colLinee = new Float32Array(archi.length * 6);
  const geoLinee = new THREE.BufferGeometry();
  geoLinee.setAttribute('position', new THREE.BufferAttribute(posLinee, 3));
  geoLinee.setAttribute('color', new THREE.BufferAttribute(colLinee, 3));
  gruppo.add(new THREE.LineSegments(geoLinee, new THREE.LineBasicMaterial({ vertexColors: true })));

  // Testi meno recenti (oltre i 4 per tema): uccelli bianchi senza archi che girano intorno al loro tema,
  // o viaggiano da un tema all'altro se ne hanno più di uno. Orbita e velocità diverse per ogni stella.
  const geoStella = new THREE.SphereGeometry(0.048, 10, 8);
  const stelle = grezzeStelle.map((s, k) => {
    const temi = s.temi.map(t => indice.get(t)).filter((i): i is number => i !== undefined);
    const mesh = new THREE.Mesh(geoStella, new THREE.MeshBasicMaterial({ color: colori.fg, transparent: true, opacity: 0, depthWrite: false }));
    gruppo.add(mesh);
    const etichetta = document.createElement('span');
    etichetta.className = 'etichetta testo';
    etichetta.textContent = s.label;
    etichetta.style.opacity = '0';
    el.appendChild(etichetta);
    const asse = new THREE.Vector3(Math.sin(k * 2.1 + 1), Math.cos(k * 1.3), Math.sin(k * 0.7 + 2)).normalize();
    const u = new THREE.Vector3().crossVectors(asse, new THREE.Vector3(0.3, 1, 0.2)).normalize();
    const v = new THREE.Vector3().crossVectors(asse, u).normalize();
    return { ...s, temi, mesh, etichetta, u, v, fase: k * 1.7, giro: 0.00035 + (k % 5) * 0.00004, viaggio: 0.00006 + (k % 3) * 0.00002, raggio: 0.42 + (k % 4) * 0.09 };
  }).filter(s => s.temi.length);

  // Stato dell'interazione
  let sopra = -1, preso = -1, esterno = -1, ruota = false, mosso = 0;
  let sopraStella = -1, presaStella = -1, esternaStella = -1;
  const giu = new THREE.Vector2(), ultimo = new THREE.Vector2();
  let rotY = 0, rotX = 0.15, velY = ridotto ? 0 : 0.0015, fermo = 0;
  const piano = new THREE.Plane(), raggio = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let w = 1, h = 1;

  function schermo(i: number) {
    const v = nodi[i]!.mesh.getWorldPosition(new THREE.Vector3()).project(camera);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, z: v.z };
  }
  function schermoStella(k: number) {
    const v = stelle[k]!.mesh.getWorldPosition(new THREE.Vector3()).project(camera);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, z: v.z };
  }
  function stellaVicina(x: number, y: number) {
    let best = -1, dist = 14;
    stelle.forEach((st, k) => { if (!st.mesh.visible) return; const s = schermoStella(k); const d = Math.hypot(s.x - x, s.y - y); if (d < dist) { dist = d; best = k; } });
    return best;
  }
  function piuVicino(x: number, y: number) {
    let best = -1, dist = 18;
    nodi.forEach((n, i) => { if (!n.mesh.visible) return; const s = schermo(i); const d = Math.hypot(s.x - x, s.y - y); if (d < dist) { dist = d; best = i; } });
    return best;
  }
  const locale = (e: PointerEvent) => { const b = el.getBoundingClientRect(); return new THREE.Vector2(e.clientX - b.left, e.clientY - b.top); };

  el.addEventListener('pointerdown', e => {
    const m = locale(e);
    giu.copy(m); ultimo.copy(m); mosso = 0;
    preso = piuVicino(m.x, m.y);
    presaStella = preso < 0 ? stellaVicina(m.x, m.y) : -1;
    ruota = preso < 0;
    if (preso >= 0) {
      const mondo = nodi[preso]!.mesh.getWorldPosition(new THREE.Vector3());
      piano.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), mondo);
    }
    el.setPointerCapture(e.pointerId);
    fermo = 240;
  });
  el.addEventListener('pointermove', e => {
    const m = locale(e);
    mosso = Math.max(mosso, m.distanceTo(giu));
    if (preso >= 0) {
      ndc.set((m.x / w) * 2 - 1, -(m.y / h) * 2 + 1);
      raggio.setFromCamera(ndc, camera);
      const punto = new THREE.Vector3();
      if (raggio.ray.intersectPlane(piano, punto)) { nodi[preso]!.p.copy(gruppo.worldToLocal(punto)); nodi[preso]!.v.set(0, 0, 0); }
    } else if (ruota) {
      rotY += (m.x - ultimo.x) * 0.006;
      rotX = THREE.MathUtils.clamp(rotX + (m.y - ultimo.y) * 0.006, -1.2, 1.2);
    } else {
      sopra = piuVicino(m.x, m.y);
      sopraStella = sopra < 0 ? stellaVicina(m.x, m.y) : -1;
      el.style.cursor = sopra >= 0 || sopraStella >= 0 ? 'pointer' : '';
    }
    ultimo.copy(m);
  });
  el.addEventListener('pointerup', () => {
    if (preso >= 0 && mosso < 4 && nodi[preso]!.href) {
      const n = nodi[preso]!;
      if (n.tipo === 'fonte') window.open(n.href, '_blank', 'noopener'); else window.location.href = n.href!;
    } else if (presaStella >= 0 && mosso < 4) {
      const st = stelle[presaStella]!;
      window.location.href = st.href;
    }
    preso = -1; presaStella = -1; ruota = false;
  });
  el.addEventListener('pointerleave', () => { if (preso < 0) { sopra = -1; sopraStella = -1; } });
  window.addEventListener('grafo:evidenzia', e => {
    const id = (e as CustomEvent<string | null>).detail ?? '';
    esterno = indice.get(id) ?? -1;
    esternaStella = stelle.findIndex(s => s.id === id);
  });

  new ResizeObserver(() => {
    w = el.clientWidth; h = el.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.position.z = w < 640 ? 11 : 9;
    camera.updateProjectionMatrix();
  }).observe(el);

  // Comparsa: all'inizio c'è solo il nodo con più collegamenti; gli altri si propagano lungo gli archi, ognuno esce dal
  // nodo che lo ha chiamato con un piccolo rimbalzo. Gli archi si tendono mentre i nodi escono, le stelle arrivano per ultime.
  const nascita = nodi.map(() => ({ ritardo: 0, da: -1 }));
  {
    const primo = nodi.reduce((m, n, i) => (n.vicini.size > nodi[m]!.vicini.size ? i : m), 0);
    const visti = new Set([primo]), coda = [primo], ordine: number[] = [];
    while (visti.size < nodi.length) {
      while (coda.length) {
        const i = coda.shift()!;
        ordine.push(i);
        [...nodi[i]!.vicini].forEach(j => { if (!visti.has(j)) { visti.add(j); coda.push(j); nascita[j]!.da = i; } });
      }
      // Nodi senza collegamenti con gli altri: partono da soli
      const resto = nodi.findIndex((_, i) => !visti.has(i));
      if (resto >= 0) { visti.add(resto); coda.push(resto); }
    }
    while (coda.length) ordine.push(coda.shift()!);
    const passoNascita = Math.min(90, 3000 / Math.max(1, ordine.length));
    ordine.forEach((i, k) => { nascita[i]!.ritardo = k ? 350 + k * passoNascita : 0; });
  }
  const FINE_NASCITA = Math.max(...nascita.map(q => q.ritardo)) + 700;
  const rimbalzo = (x: number) => { const k = 1.4; x -= 1; return x * x * ((k + 1) * x + k) + 1; };
  let avvio = -1;

  // Vita sopra il grafo, discreta: il grafo resta fermo e leggibile, gli uccelli sono solo un di più e si scostano dal puntatore.
  // Intorno a ogni tema gira un piccolo stormo arancione; intorno volano anche gli uccelli bianchi dei testi meno recenti;
  // ogni tanto un uccello vola lungo un arco e un puntino bianco si accende per un paio di secondi, col suo nome.
  type Giro = { tema: number; raggio: number; vel: number; fase: number; alza: number; piega: number; battito: number };
  const giri: Giro[] = [];
  nodi.forEach((n, i) => {
    if (!stile[n.tipo].hub) return;
    const quanti = Math.min(14, 6 + Math.round(n.vicini.size * 1.5));
    for (let k = 0; k < quanti; k++) giri.push({ tema: i, raggio: 0.28 + Math.random() * 0.3, vel: (0.4 + Math.random() * 0.4) * (i % 2 ? 1 : -1), fase: Math.random() * 6.28, alza: 0.06 + Math.random() * 0.16, piega: Math.random() * 6.28, battito: 8 + Math.random() * 5 });
  });
  const viaggi = Array.from({ length: Math.min(4, archi.length) }, () => ({ arco: -1, verso: 1, via: 0, dura: 2800, battito: 7 + Math.random() * 3, fase: Math.random() * 6.28 }));
  // Puntino bianco acceso a turno
  const puntini = nodi.map((n, i) => (n.tipo === 'testo' ? i : -1)).filter(i => i >= 0);
  let visita = -1, visitaFine = 0, prossimaLuce = 0;
  const stellePrima = stelle.map(st => st.mesh.position.clone());
  const totUccelli = giri.length + viaggi.length + stelle.length, posU = new Float32Array(totUccelli * 12), colU = new Float32Array(totUccelli * 12), spinta = new Float32Array(totUccelli * 3);
  const geoU = new THREE.BufferGeometry();
  geoU.setAttribute('position', new THREE.BufferAttribute(posU, 3));
  geoU.setAttribute('color', new THREE.BufferAttribute(colU, 3));
  const lineeU = new THREE.LineSegments(geoU, new THREE.LineBasicMaterial({ vertexColors: true }));
  lineeU.frustumCulled = false;
  gruppo.add(lineeU);
  // Puntatore in coordinate della scena: gli uccelli vicini si scostano, poi tornano
  let mouseU: THREE.Vector2 | null = null, tempoU = -1;
  const rayU = new THREE.Ray(), inversaU = new THREE.Matrix4(), vicinoU = new THREE.Vector3();
  el.addEventListener('pointermove', e => { const q = locale(e); (mouseU ??= new THREE.Vector2()).set((q.x / w) * 2 - 1, -(q.y / h) * 2 + 1); });
  el.addEventListener('pointerleave', () => { mouseU = null; });
  const scosta = (k: number, dt: number) => {
    const o = k * 3;
    if (mouseU) {
      const d2 = rayU.distanceSqToPoint(uPos);
      if (d2 < 0.3) {
        rayU.closestPointToPoint(uPos, vicinoU);
        vicinoU.subVectors(uPos, vicinoU).normalize().multiplyScalar((1 - Math.sqrt(d2) / 0.55) * dt * 2.6);
        spinta[o] = spinta[o]! + vicinoU.x; spinta[o + 1] = spinta[o + 1]! + vicinoU.y; spinta[o + 2] = spinta[o + 2]! + vicinoU.z;
      }
    }
    const torna = 1 - dt * 0.9;
    spinta[o] = spinta[o]! * torna; spinta[o + 1] = spinta[o + 1]! * torna; spinta[o + 2] = spinta[o + 2]! * torna;
    uPos.x += spinta[o]!; uPos.y += spinta[o + 1]!; uPos.z += spinta[o + 2]!;
  };
  const uPos = new THREE.Vector3(), uDir = new THREE.Vector3(), uLato = new THREE.Vector3(), uSu = new THREE.Vector3(0, 1, 0), uCol = new THREE.Color();
  const disegnaUccello = (k: number, ali: number, grande: number, colore: THREE.Color) => {
    uLato.crossVectors(uDir, uSu).normalize().multiplyScalar(0.05 * grande);
    const a = ali * 0.034 * grande, o = k * 12;
    posU.set([uPos.x - uLato.x, uPos.y + a, uPos.z - uLato.z, uPos.x, uPos.y, uPos.z, uPos.x, uPos.y, uPos.z, uPos.x + uLato.x, uPos.y + a, uPos.z + uLato.z], o);
    for (let q = 0; q < 4; q++) colU.set([colore.r, colore.g, colore.b], o + q * 3);
  };

  // Fisica: repulsione fra tutti, molle sugli archi, richiamo verso il centro, attrito
  function passo() {
    const n = nodi.length;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const d = nodi[i]!.p.clone().sub(nodi[j]!.p);
      const l2 = Math.max(d.lengthSq(), 0.05);
      d.multiplyScalar(0.015 / (l2 * Math.sqrt(l2)));
      nodi[i]!.v.add(d); nodi[j]!.v.sub(d);
    }
    archi.forEach(([a, b]) => {
      const d = nodi[b]!.p.clone().sub(nodi[a]!.p);
      const riposo = stile[nodi[a]!.tipo].hub || stile[nodi[b]!.tipo].hub ? 1.3 : 1;
      d.multiplyScalar(0.012 * (d.length() - riposo));
      nodi[a]!.v.add(d); nodi[b]!.v.sub(d);
    });
    nodi.forEach((nd, i) => {
      if (i === preso) return;
      nd.v.addScaledVector(nd.p, -0.008).multiplyScalar(0.86);
      nd.p.add(nd.v);
    });
  }
  for (let i = 0; i < 300; i++) passo();

  // Invito al tocco: i nodi cliccabili "respirano" piano e, quando nessuno tocca il grafo,
  // un anello parte ogni tanto da un nodo a caso. Niente movimento con prefers-reduced-motion.
  const cliccabili = nodi.map((n, i) => (n.href ? i : -1)).filter(i => i >= 0);
  const anello = document.createElement('span');
  anello.className = 'anello';
  el.appendChild(anello);
  let pingato = -1;
  if (!ridotto && cliccabili.length) setInterval(() => {
    if (el.offsetParent === null || preso >= 0 || sopra >= 0 || esterno >= 0 || avvio < 0 || performance.now() - avvio < FINE_NASCITA) return;
    pingato = cliccabili[Math.floor(Math.random() * cliccabili.length)]!;
    anello.className = `anello ${nodi[pingato]!.tipo}`;
    void anello.offsetWidth; // riparte l'animazione CSS
    anello.classList.add('via');
  }, 2600);

  function disegna() {
    // Un grafo in una tab nascosta non consuma risorse
    if (el.offsetParent === null) { requestAnimationFrame(disegna); return; }
    passo();
    if (fermo > 0) fermo--; else if (preso < 0 && !ruota) rotY += velY;
    gruppo.rotation.set(rotX, rotY, 0);
    gruppo.updateMatrixWorld();

    const fuoco = preso >= 0 ? preso : sopra >= 0 ? sopra : esterno;
    const acceso = (i: number) => fuoco < 0 || i === fuoco || nodi[fuoco]!.vicini.has(i);

    const t = performance.now();
    if (avvio < 0) avvio = t;
    const eta = ridotto ? Infinity : t - avvio;
    // Ogni tanto un puntino bianco si accende per un paio di secondi e mostra il suo nome
    if (visita >= 0 && t > visitaFine) visita = -1;
    if (!ridotto && puntini.length && eta > FINE_NASCITA && t > prossimaLuce && fuoco < 0) {
      visita = puntini[Math.floor(Math.random() * puntini.length)]!;
      visitaFine = t + 2200;
      prossimaLuce = t + 3400 + Math.random() * 2600;
    }
    const uscita = (i: number) => THREE.MathUtils.clamp((eta - nascita[i]!.ritardo) / 700, 0, 1);
    nodi.forEach((nd, i) => {
      // Mentre nasce, il nodo scivola dal suo genitore al suo posto
      const u = uscita(i), e = rimbalzo(u), genitore = nascita[i]!.da;
      if (u < 1 && genitore >= 0) nd.mesh.position.lerpVectors(nodi[genitore]!.p, nd.p, Math.min(1, e)); else nd.mesh.position.copy(nd.p);
      nd.mesh.visible = u > 0;
      // Le fonti secondarie sono più piccole e più tenui; i nodi cliccabili respirano
      const respiro = !ridotto && nd.href && i !== fuoco ? 1 + 0.08 * Math.sin(t * 0.0022 + i * 1.7) : 1;
      const s = (i === fuoco ? 1.7 : i === visita ? 1.45 : 1) * (nd.debole ? 0.7 : 1) * respiro;
      if (u < 1) nd.mesh.scale.setScalar(Math.max(0.001, s * e)); else nd.mesh.scale.lerp(new THREE.Vector3(s, s, s), 0.2);
      (nd.mesh.material as THREE.MeshBasicMaterial).opacity = (acceso(i) ? 1 : 0.18) * (nd.debole && i !== fuoco ? 0.5 : 1);
      const sc = schermo(i);
      const mostra = i === fuoco || (i === visita && fuoco < 0) || (stile[nd.tipo].hub && acceso(i)) || (fuoco >= 0 && nodi[fuoco]!.vicini.has(i));
      nd.etichetta.style.opacity = mostra && sc.z < 1 && u >= 1 ? '1' : '0';
      nd.etichetta.classList.toggle('attiva', i === fuoco);
      nd.etichetta.style.transform = `translate(${Math.round(sc.x + 12)}px, ${Math.round(sc.y - 8)}px)`;
    });
    if (pingato >= 0) {
      const sc = schermo(pingato);
      anello.style.left = `${sc.x}px`;
      anello.style.top = `${sc.y}px`;
    }
    // Stelle: orbita intorno al tema; con più temi, viaggio da uno all'altro con una sosta su ciascuno
    const tempo = ridotto ? 0 : t;
    stelle.forEach((st, k) => {
      const n = st.temi.length;
      const centro = nodi[st.temi[0]!]!.p.clone();
      if (n > 1) {
        const corsa = st.fase + tempo * st.viaggio;
        const tratto = Math.floor(corsa);
        const da = nodi[st.temi[tratto % n]!]!.p, a = nodi[st.temi[(tratto + 1) % n]!]!.p;
        centro.copy(da).lerp(a, THREE.MathUtils.smootherstep(corsa - tratto, 0.25, 0.75));
      }
      const ang = st.fase + tempo * st.giro;
      st.mesh.position.copy(centro).addScaledVector(st.u, Math.cos(ang) * st.raggio).addScaledVector(st.v, Math.sin(ang) * st.raggio);
      const attiva = k === sopraStella || k === presaStella || k === esternaStella;
      const s = attiva ? 2.4 : 1;
      // Le stelle arrivano quando il grafo è formato
      const arriva = THREE.MathUtils.clamp((eta - FINE_NASCITA - k * 50) / 700, 0, 1);
      st.mesh.visible = arriva > 0;
      if (arriva < 1) st.mesh.scale.setScalar(Math.max(0.001, s * rimbalzo(arriva))); else st.mesh.scale.lerp(new THREE.Vector3(s, s, s), 0.2);
      const sc = schermoStella(k);
      st.etichetta.style.opacity = attiva && sc.z < 1 ? '1' : '0';
      st.etichetta.style.transform = `translate(${Math.round(sc.x + 10)}px, ${Math.round(sc.y - 8)}px)`;
    });
    archi.forEach(([a, b], k) => {
      // L'arco esiste quando sono nati tutti e due i nodi: fino ad allora i suoi capi coincidono
      if (uscita(a) > 0 && uscita(b) > 0) { nodi[a]!.mesh.position.toArray(posLinee, k * 6); nodi[b]!.mesh.position.toArray(posLinee, k * 6 + 3); }
      else { nodi[a]!.p.toArray(posLinee, k * 6); nodi[a]!.p.toArray(posLinee, k * 6 + 3); }
      const toccato = fuoco >= 0 && (a === fuoco || b === fuoco);
      const c = toccato ? colori.accent : fuoco >= 0 ? colori.line : colori.line.clone().lerp(colori.muted, 0.45);
      c.toArray(colLinee, k * 6); c.toArray(colLinee, k * 6 + 3);
    });
    geoLinee.attributes.position!.needsUpdate = true;
    geoLinee.attributes.color!.needsUpdate = true;

    const sec = t / 1000, dtU = tempoU < 0 ? 0 : Math.min(0.05, (t - tempoU) / 1000);
    tempoU = t;
    if (mouseU) { raggio.setFromCamera(mouseU, camera); rayU.copy(raggio.ray).applyMatrix4(inversaU.copy(gruppo.matrixWorld).invert()); }
    // Stormi intorno ai temi: orbite un po' storte, ognuno la sua; si spengono con il loro tema
    giri.forEach((u, k) => {
      const nd = nodi[u.tema]!, nato = uscita(u.tema), a = u.fase + (ridotto ? 0 : sec * u.vel);
      const r2 = u.raggio * (1 + Math.sin(a * 2.3 + u.piega) * 0.16) * Math.min(1, nato);
      uPos.set(Math.cos(a) * r2, Math.sin(a + u.piega) * u.alza * Math.min(1, nato), Math.sin(a) * r2).add(nd.mesh.position);
      scosta(k, dtU);
      uDir.set(-Math.sin(a) * Math.sign(u.vel), 0, Math.cos(a) * Math.sign(u.vel));
      uCol.copy(colori.accent).lerp(colori.bg, nato <= 0 ? 1 : acceso(u.tema) ? 0.3 : 0.86);
      disegnaUccello(k, ridotto ? 0.3 : Math.sin(sec * u.battito + u.fase) + 0.4, 0.85, uCol);
    });
    // Uccelli di passaggio: uno per arco, in un arco alto; partono solo a grafo formato
    viaggi.forEach((v, q) => {
      const k = giri.length + q;
      if (v.arco < 0 || t - v.via > v.dura) {
        v.arco = eta > FINE_NASCITA && !ridotto && Math.random() < 0.006 ? Math.floor(Math.random() * archi.length) : -1;
        v.via = t; v.verso = Math.random() < 0.5 ? 1 : -1;
        if (v.arco < 0) { posU.fill(0, k * 12, (k + 1) * 12); return; }
      }
      const [a0, b0] = archi[v.arco]!, a = nodi[v.verso > 0 ? a0 : b0]!, b = nodi[v.verso > 0 ? b0 : a0]!, u = (t - v.via) / v.dura;
      uPos.lerpVectors(a.p, b.p, u); uPos.y += Math.sin(u * Math.PI) * 0.16;
      scosta(k, dtU);
      uDir.subVectors(b.p, a.p).setY(0).normalize();
      uCol.copy(colori.fg).lerp(colori.bg, acceso(a0) && acceso(b0) ? 0.25 : 0.86);
      disegnaUccello(k, Math.sin(sec * v.battito + v.fase) + 0.4, 1, uCol);
    });
    // Testi meno recenti: un uccello bianco sul percorso già calcolato; si prende come prima, col clic
    stelle.forEach((st, q) => {
      const k = giri.length + viaggi.length + q, arriva = THREE.MathUtils.clamp((eta - FINE_NASCITA - q * 50) / 700, 0, 1);
      if (arriva <= 0) { posU.fill(0, k * 12, (k + 1) * 12); return; }
      uPos.copy(st.mesh.position);
      uDir.subVectors(uPos, stellePrima[q]!).setY(0);
      stellePrima[q]!.copy(uPos);
      if (uDir.lengthSq() < 1e-9) uDir.set(1, 0, 0);
      uDir.normalize();
      scosta(k, dtU);
      const attiva = q === sopraStella || q === presaStella || q === esternaStella, spenta = fuoco >= 0 && !st.temi.includes(fuoco);
      uCol.copy(colori.fg).lerp(colori.bg, attiva ? 0 : spenta ? 0.86 : 0.15);
      disegnaUccello(k, ridotto ? 0.3 : Math.sin(sec * 9 + st.fase) + 0.4, (attiva ? 1.8 : 1.05) * rimbalzo(arriva), uCol);
    });
    geoU.attributes.position!.needsUpdate = true;
    geoU.attributes.color!.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(disegna);
  }
  requestAnimationFrame(disegna);
}
