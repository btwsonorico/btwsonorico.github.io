import * as THREE from 'three';
import { colori, crescita, tonoSezione, vista, type Punto } from './vista3d';

// Knowledge come cielo di stormi, nello stile del bosco e del laghetto. Ogni tema è uno stormo arancione col suo
// capofila; ogni testo è un uccello riconoscibile dentro lo stormo, in mezzo a uccellini che danno volume.
// Gli archi del grafo diventano voli: un testo con più temi è un migratore (chiaro) che fa la spola fra i suoi stormi,
// e due temi che condividono testi volano più vicini. L'età è l'altezza: i testi recenti volano alti e accesi, i più
// vecchi bassi e tenui. Passando sopra un tema lo stormo si stringe, gli altri si spengono e compaiono le scie verso
// gli stormi collegati. Uno stormo si può afferrare e spostare; un clic sul prato fa cadere semi, e gli uccelli vicini
// scendono a mangiare.

export interface DatiStormi { temi: { id: string; label: string; href: string }[]; testi: { id: string; label: string; href: string; temi: string[]; eta: number }[] }

const QUOTA = 2.1;

export function monta(el: HTMLElement) {
  const { temi, testi } = JSON.parse(el.dataset.grafo!) as DatiStormi;
  const c = colori(el);
  const chiaro = document.documentElement.dataset.theme === 'light';
  const arancio = tonoSezione('--arancio'), verde = tonoSezione('--verde'), azzurro = tonoSezione('--azzurro');
  let seme = 29;
  const r = () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
  const gruppo = new THREE.Group();
  const punti: Punto[] = [];
  const linea = (colore: THREE.Color, opacita = 1) => new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });

  // --- Prato e acqua: la base, che c'è subito
  for (const [raggio, op] of [[6.4, 0.07], [4.8, 0.045], [3.2, 0.045]] as const) {
    const disco = new THREE.Mesh(new THREE.CircleGeometry(raggio, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: verde, transparent: true, opacity: op * (chiaro ? 1.6 : 0.45), depthWrite: false }));
    disco.position.y = -0.01; disco.renderOrder = -1;
    gruppo.add(disco);
  }
  const griglia: number[] = [];
  for (let x = -6.4; x <= 6.4; x += 0.4) for (let z = -6.4; z <= 6.4; z += 0.4) if (Math.hypot(x, z) < 6.4) griglia.push(x, 0, z);
  const geoG = new THREE.BufferGeometry();
  geoG.setAttribute('position', new THREE.Float32BufferAttribute(griglia, 3));
  gruppo.add(new THREE.Points(geoG, new THREE.PointsMaterial({ color: c.muted, size: 0.024, transparent: true, opacity: 0.55 })));
  const rivaDi = (a: number) => 1.15 + 0.22 * Math.cos(2 * a + 0.5) + 0.1 * Math.sin(3 * a);
  const LAGO = new THREE.Vector2(2.2, 1.5);
  const riva = Array.from({ length: 72 }, (_, k) => { const a = (k / 72) * Math.PI * 2, d = rivaDi(a); return new THREE.Vector3(LAGO.x + Math.cos(a) * d, 0.005, LAGO.y + Math.sin(a) * d * 0.75); });
  gruppo.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(riva), linea(azzurro, chiaro ? 0.9 : 0.6)));
  const forma = new THREE.Shape(riva.map(q => new THREE.Vector2(q.x, -q.z)));
  gruppo.add(new THREE.Mesh(new THREE.ShapeGeometry(forma).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: azzurro, transparent: true, opacity: chiaro ? 0.14 : 0.1, depthWrite: false })));
  const nBase = gruppo.children.length;

  // --- Qualche albero sul bordo del prato, a filo come nel bosco
  const solido = (geo: THREE.BufferGeometry, tinta: THREE.Color) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: tinta, transparent: true, opacity: chiaro ? 0.24 : 0.2, depthWrite: false })), new THREE.LineSegments(new THREE.EdgesGeometry(geo), linea(tinta, 0.9)));
    return g;
  };
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2 + r() * 0.4, d = 4.3 + r() * 1.9, x = Math.cos(a) * d, z = Math.sin(a) * d, alto = 0.55 + r() * 0.4, o = new THREE.Group(), tinta = verde.clone().offsetHSL(0, 0, (r() - 0.5) * 0.14);
    o.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, alto * 0.6, 0)]), linea(c.fg, 0.7)));
    if (k % 3 === 0) for (let q = 0; q < 3; q++) { const cono = solido(new THREE.ConeGeometry(0.28 * (1 - q * 0.2), alto * 0.5, 7), tinta); cono.position.y = alto * 0.35 + q * alto * 0.26; o.add(cono); }
    else { const palla = solido(new THREE.IcosahedronGeometry(alto * 0.3, 1), tinta); palla.position.y = alto * 0.75; o.add(palla); }
    o.position.set(x, 0, z);
    gruppo.add(o);
  }

  // --- Stormi: una casa per tema, in cerchio all'inizio; poi i temi che condividono testi si avvicinano
  type Stormo = { id: string; casa: THREE.Vector3; v: THREE.Vector3; centro: THREE.Object3D; legami: Map<number, number>; fase: number; capofila: Uccello | null; stretta: number };
  type Uccello = { p: THREE.Vector3; v: THREE.Vector3; casa: number; posto: THREE.Vector3; fase: number; scala: number; luce: number; quota: number; testo: string | null; rotta: number[]; tappa: number; sosta: number; viaggia: boolean; seme: Seme | null; mangia: number; decollo: number; tipo: 'piccolo' | 'testo' | 'capofila' };
  type Seme = { p: THREE.Vector3; vy: number; resto: number; aTerra: boolean; o: THREE.Mesh };
  const indice = new Map(temi.map((t, i) => [t.id, i]));
  const stormi: Stormo[] = temi.map((t, i) => {
    const a = (i / temi.length) * Math.PI * 2, centro = new THREE.Object3D();
    gruppo.add(centro);
    punti.push({ id: `tema:${t.id}`, label: `#${t.label}`, href: t.href, hub: true, famiglia: t.id, ancora: centro });
    return { id: t.id, casa: new THREE.Vector3(Math.cos(a) * 3.3, QUOTA + (i % 3) * 0.35, Math.sin(a) * 2.6), v: new THREE.Vector3(), centro, legami: new Map(), fase: r() * 6, capofila: null, stretta: 1 };
  });
  const uccelli: Uccello[] = [];
  const postoCaso = (largo: number) => { const a = r() * 6.28, d = Math.sqrt(r()) * largo; return new THREE.Vector3(Math.cos(a) * d, (r() - 0.5) * 0.5, Math.sin(a) * d); };
  const nuovo = (casa: number, tipo: Uccello['tipo'], largo: number, opz: Partial<Uccello> = {}): Uccello => {
    const a = r() * 6.28, d = 0.6 + r() * 3.4;
    const u: Uccello = { p: new THREE.Vector3(Math.cos(a) * d, 0.05, Math.sin(a) * d), v: new THREE.Vector3(), casa, posto: postoCaso(largo), fase: r() * 6, scala: tipo === 'capofila' ? 2.2 : tipo === 'testo' ? 1.5 : 0.8 + r() * 0.3, luce: 0.75, quota: 0, testo: null, rotta: [casa], tappa: 0, sosta: 2 + r() * 8, viaggia: false, seme: null, mangia: 0, decollo: 0.5 + r() * 2.5, tipo, ...opz };
    uccelli.push(u);
    return u;
  };
  // Capofila di ogni stormo, poi un uccello per testo, poi i piccoli che danno volume: più testi, stormo più grande
  stormi.forEach((s, i) => { s.capofila = nuovo(i, 'capofila', 0.05); s.centro.position.copy(s.casa); });
  const conta = stormi.map(() => 0);
  testi.forEach(t => {
    const rotta = t.temi.map(x => indice.get(x)).filter((x): x is number => x !== undefined);
    if (!rotta.length) return;
    rotta.forEach(i => { conta[i]!++; rotta.forEach(j => { if (j !== i) stormi[i]!.legami.set(j, (stormi[i]!.legami.get(j) ?? 0) + 1); }); });
    // L'età è l'altezza: i testi recenti in alto e accesi, i vecchi in basso e tenui
    const u = nuovo(rotta[0]!, 'testo', 0.55, { testo: t.id, rotta, quota: (0.5 - t.eta) * 1.5, luce: 1 - t.eta * 0.55 });
    const ancora = new THREE.Object3D();
    gruppo.add(ancora);
    punti.push({ id: t.id, label: t.label, href: t.href, hub: false, famiglia: temi[rotta[0]!]!.id, ancora });
    (u as Uccello & { ancora?: THREE.Object3D }).ancora = ancora;
  });
  const telefono = window.innerWidth < 700;
  stormi.forEach((_, i) => { const n = Math.min(telefono ? 22 : 40, 10 + conta[i]! * 4); for (let k = 0; k < n; k++) nuovo(i, 'piccolo', 0.4 + Math.sqrt(conta[i]!) * 0.14); });

  // Una sola forma per tutti gli uccelli: una V a due segmenti, con colori per vertice (accensione e età senza trasparenze)
  const N = uccelli.length, posV = new Float32Array(N * 12), colV = new Float32Array(N * 12);
  const geoV = new THREE.BufferGeometry();
  geoV.setAttribute('position', new THREE.BufferAttribute(posV, 3));
  geoV.setAttribute('color', new THREE.BufferAttribute(colV, 3));
  const lineeV = new THREE.LineSegments(geoV, new THREE.LineBasicMaterial({ vertexColors: true }));
  lineeV.frustumCulled = false;
  gruppo.add(lineeV);
  // Corpi dei testi e dei capofila: un puntino, così si distinguono dalla massa
  const speciali = uccelli.filter(u => u.tipo !== 'piccolo');
  const posC = new Float32Array(speciali.length * 3), colC = new Float32Array(speciali.length * 3);
  const geoC = new THREE.BufferGeometry();
  geoC.setAttribute('position', new THREE.BufferAttribute(posC, 3));
  geoC.setAttribute('color', new THREE.BufferAttribute(colC, 3));
  const corpi = new THREE.Points(geoC, new THREE.PointsMaterial({ vertexColors: true, size: 0.075 }));
  corpi.frustumCulled = false;
  gruppo.add(corpi);
  // Scie: dallo stormo acceso verso quelli collegati, solo quando il puntatore è sopra
  const SEG = 14, maxLegami = Math.max(1, ...stormi.map(s => s.legami.size));
  const posS = new Float32Array(maxLegami * SEG * 6), geoS = new THREE.BufferGeometry();
  geoS.setAttribute('position', new THREE.BufferAttribute(posS, 3));
  const matS = linea(c.fg, 0);
  const scie = new THREE.LineSegments(geoS, matS);
  scie.frustumCulled = false;
  gruppo.add(scie);

  // --- Semi: un clic sul prato ne fa cadere una manciata; gli uccelli vicini scendono a mangiare
  const semi: Seme[] = [];
  const geoSeme = new THREE.IcosahedronGeometry(0.022, 0), matSeme = new THREE.MeshBasicMaterial({ color: arancio.clone().lerp(c.fg, 0.25) });
  const pianoTerra = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), inversa = new THREE.Matrix4(), punto = new THREE.Vector3();
  const clicVuoto = (raggio: THREE.Raycaster) => {
    gruppo.updateMatrixWorld();
    const rl = raggio.ray.clone().applyMatrix4(inversa.copy(gruppo.matrixWorld).invert());
    if (!rl.intersectPlane(pianoTerra, punto) || Math.hypot(punto.x, punto.z) > 6) return;
    for (let k = 0; k < 7; k++) {
      const o = new THREE.Mesh(geoSeme, matSeme);
      const q = new THREE.Vector3(punto.x + (r() - 0.5) * 0.45, 2.2 + r() * 0.6, punto.z + (r() - 0.5) * 0.45);
      o.position.copy(q);
      gruppo.add(o);
      semi.push({ p: q, vy: 0, resto: 1, aTerra: false, o });
    }
    // Scendono i piccoli più vicini (uno per seme, più qualcuno che resta a guardare)
    const liberi = uccelli.filter(u => u.tipo === 'piccolo' && !u.seme).sort((a, b) => a.p.distanceToSquared(punto) - b.p.distanceToSquared(punto)).slice(0, 7);
    liberi.forEach((u, k) => { u.seme = semi[semi.length - 7 + k]!; u.mangia = 0; });
  };

  // --- Presa: si afferra lo stormo più vicino al raggio e lo si sposta su un piano orizzontale alla sua quota;
  // i temi collegati lo seguono un poco, perché le molle tirano. Un clic senza spostamento apre il tema.
  let preso = -1;
  const pianoPresa = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), metaPresa = new THREE.Vector3();
  const locale = (raggio: THREE.Raycaster) => { gruppo.updateMatrixWorld(); return raggio.ray.clone().applyMatrix4(inversa.copy(gruppo.matrixWorld).invert()); };
  const afferra = (raggio: THREE.Raycaster) => {
    const rl = locale(raggio);
    let meglio = 0.6, chi = -1;
    stormi.forEach((s, i) => { const d = rl.distanceToPoint(s.casa); if (d < meglio) { meglio = d; chi = i; } });
    if (chi < 0) return false;
    preso = chi;
    pianoPresa.constant = -stormi[chi]!.casa.y;
    metaPresa.copy(stormi[chi]!.casa);
    el.style.cursor = 'grabbing';
    return true;
  };
  const trascina = (raggio: THREE.Raycaster) => {
    if (preso >= 0 && locale(raggio).intersectPlane(pianoPresa, punto) && Math.hypot(punto.x, punto.z) < 5.5) metaPresa.copy(punto);
  };
  const rilascia = () => { preso = -1; el.style.cursor = ''; };

  // Puntatore: i piccoli si scostano appena, come nella home
  let raggioL: THREE.Ray | null = null;
  const puntatore = (raggio: THREE.Raycaster | null) => { raggioL = raggio ? locale(raggio) : null; };

  // --- Ciclo
  const ACCESO = arancio.clone(), CHIARO = c.fg.clone().lerp(azzurro, 0.25), SPENTO = c.bg.clone();
  const t3 = new THREE.Vector3(), acc = new THREE.Vector3(), meta = new THREE.Vector3(), col = new THREE.Color(), ctrl = new THREE.Vector3(), a3 = new THREE.Vector3(), b3 = new THREE.Vector3();
  let prima = -1, primoT = -1;
  const dopo = crescita(gruppo.children.slice(nBase).filter(o => !(o instanceof THREE.LineSegments) && !(o instanceof THREE.Points) && o.type === 'Group'), punti, 200, 1800);
  vista(el, gruppo, punti, {
    camera: new THREE.Vector3(0, 3.1, 12.2),
    mira: new THREE.Vector3(0, 1.85, 0),
    inclinazione: [0.04, 0.4],
    giuMax: 0.04,
    clicVuoto, afferra, trascina, rilascia, puntatore, dopo,
    aggiorna: (t, acceso) => {
      if (primoT < 0) primoT = t;
      const dt = prima < 0 || t === 0 ? 0 : Math.min(0.05, (t - prima) / 1000), s = t / 1000, eta = t === 0 ? 99 : (t - primoT) / 1000;
      prima = t;
      // Case degli stormi: si respingono, i temi con testi in comune si attirano, tutte tornano piano verso il centro
      stormi.forEach((a, i) => {
        acc.set(-a.casa.x * 0.03, (QUOTA + (i % 3) * 0.35 - a.casa.y) * 0.3, -a.casa.z * 0.03);
        stormi.forEach((b, j) => {
          if (i === j) return;
          t3.copy(a.casa).sub(b.casa); t3.y *= 0.3;
          const d = Math.max(0.3, t3.length());
          acc.addScaledVector(t3, 1.5 / (d * d * d));
          const n = a.legami.get(j);
          if (n) acc.addScaledVector(t3, -Math.min(0.1, 0.03 + n * 0.012) * (d - 2.8) / d);
        });
        acc.x += Math.sin(s * 0.13 + a.fase) * 0.03; acc.z += Math.cos(s * 0.11 + a.fase) * 0.03;
        if (i === preso) { a.casa.lerp(metaPresa, Math.min(1, dt * 6)); a.v.set(0, 0, 0); }
        else { a.v.addScaledVector(acc, dt); a.v.multiplyScalar(1 - dt * 0.9); a.casa.addScaledVector(a.v, dt); }
        a.casa.y = THREE.MathUtils.clamp(a.casa.y, 1.5, 3.2);
        // Sopra il puntatore lo stormo si stringe
        const livello = acceso(a.id, `tema:${a.id}`);
        a.stretta += ((livello === 1 ? 0.55 : 1) - a.stretta) * Math.min(1, dt * 3);
      });
      // Baricentro di ogni stormo, per l'etichetta
      const somme = stormi.map(() => ({ x: 0, y: 0, z: 0, n: 0 }));
      uccelli.forEach((u, k) => {
        const casa = stormi[u.casa]!;
        // Migratore: dopo una sosta parte verso il prossimo stormo della sua rotta
        if (u.rotta.length > 1) {
          u.sosta -= dt;
          if (!u.viaggia && u.sosta <= 0) { u.tappa = (u.tappa + 1) % u.rotta.length; u.casa = u.rotta[u.tappa]!; u.viaggia = true; }
          if (u.viaggia && u.p.distanceTo(stormi[u.casa]!.casa) < 0.5) { u.viaggia = false; u.sosta = 7 + r() * 10; }
        }
        const fermoATerra = eta < u.decollo;
        if (u.seme) {
          meta.copy(u.seme.p); meta.y = 0.05;
          if (u.seme.aTerra && u.p.distanceTo(meta) < 0.08) { u.mangia += dt; u.seme.resto = Math.max(0, 1 - u.mangia / 2.2); }
          if (u.mangia > 2.2) u.seme = null;
        } else if (fermoATerra) meta.copy(u.p);
        else meta.copy(casa.casa).addScaledVector(u.posto, casa.stretta).setY(casa.casa.y + u.posto.y * casa.stretta + u.quota);
        const veloce = u.viaggia ? 1.5 : u.seme ? 1.2 : 0.9;
        acc.copy(meta).sub(u.p).multiplyScalar(u.seme ? 2.2 : 1.1);
        // Giri dolci intorno al proprio posto: la massa respira, non resta ferma
        acc.x += Math.sin(s * 1.1 + u.fase) * 0.5; acc.y += Math.sin(s * 1.5 + u.fase * 2) * 0.22; acc.z += Math.cos(s * 0.9 + u.fase) * 0.5;
        if (raggioL && u.tipo === 'piccolo' && preso < 0) {
          const d2 = raggioL.distanceSqToPoint(u.p);
          if (d2 < 0.25) { raggioL.closestPointToPoint(u.p, t3); acc.addScaledVector(t3.subVectors(u.p, t3).normalize(), (1 - Math.sqrt(d2) / 0.5) * 4); }
        }
        if (!fermoATerra && !u.seme && u.p.y < 0.5) acc.y += 2.5;
        u.v.addScaledVector(acc, dt);
        const v = u.v.length();
        if (v > veloce) u.v.multiplyScalar(veloce / v);
        u.v.multiplyScalar(1 - dt * (u.seme && u.mangia > 0 ? 6 : 0.7));
        u.p.addScaledVector(u.v, dt);
        if (u.p.y < 0.03) { u.p.y = 0.03; u.v.y = Math.max(0, u.v.y); }
        if (!u.viaggia && u.tipo !== 'testo' && !u.seme && !fermoATerra) { const q = somme[u.casa]!; q.x += u.p.x; q.y += u.p.y; q.z += u.p.z; q.n++; }
        // Disegno: una V che batte, orientata di traverso rispetto al volo; a terra o mentre mangia le ali restano chiuse
        const aTerra = fermoATerra || (u.seme && u.mangia > 0);
        const batte = aTerra ? 0.02 : Math.sin(s * (u.tipo === 'piccolo' ? 11 : 8) + u.fase) * 0.055 + 0.015, l = 0.055 * u.scala;
        const vl = Math.hypot(u.v.x, u.v.z) || 1, nx = -u.v.z / vl, nz = u.v.x / vl;
        const y = u.p.y + (u.seme && u.mangia > 0 ? -Math.abs(Math.sin(s * 9 + u.fase)) * 0.015 : 0), ali = batte * u.scala;
        posV.set([u.p.x, y, u.p.z, u.p.x + nx * l, y + ali, u.p.z + nz * l, u.p.x, y, u.p.z, u.p.x - nx * l, y + ali, u.p.z - nz * l], k * 12);
        // Colore: arancio, i migratori più chiari; età e accensione portano verso il fondo
        const tema = temi[u.rotta[0]!]!.id;
        const id = u.tipo === 'capofila' ? `tema:${tema}` : u.testo;
        const livello = id ? acceso(tema, id) : acceso(tema, `tema:${tema}`) >= 0.5 ? acceso(tema, '') : 0.15;
        const forza = (livello === 1 ? 1.15 : livello === 0.5 ? 1 : 0.22) * u.luce * (u.tipo === 'piccolo' ? 0.72 : 1);
        col.copy(u.rotta.length > 1 ? CHIARO : ACCESO).lerp(SPENTO, 1 - Math.min(1, forza));
        for (let q = 0; q < 4; q++) colV.set([col.r, col.g, col.b], k * 12 + q * 3);
        const conAncora = u as Uccello & { ancora?: THREE.Object3D };
        if (conAncora.ancora) conAncora.ancora.position.copy(u.p);
      });
      speciali.forEach((u, k) => {
        posC.set([u.p.x, u.p.y, u.p.z], k * 3);
        const tema = temi[u.rotta[0]!]!.id, livello = u.tipo === 'capofila' ? acceso(tema, `tema:${tema}`) : acceso(tema, u.testo!);
        col.copy(u.rotta.length > 1 ? CHIARO : ACCESO).lerp(SPENTO, 1 - Math.min(1, (livello === 1 ? 1.15 : livello === 0.5 ? 1 : 0.22) * u.luce));
        colC.set([col.r, col.g, col.b], k * 3);
      });
      stormi.forEach((a, i) => { const q = somme[i]!; if (q.n) a.centro.position.set(q.x / q.n, q.y / q.n + 0.28, q.z / q.n); });
      geoV.attributes.position!.needsUpdate = true; geoV.attributes.color!.needsUpdate = true;
      geoC.attributes.position!.needsUpdate = true; geoC.attributes.color!.needsUpdate = true;
      // Scie verso i temi collegati: archi sottili, solo per lo stormo sotto il puntatore
      const fuoco = stormi.findIndex(a => acceso(a.id, `tema:${a.id}`) === 1);
      matS.opacity += ((fuoco >= 0 ? 0.55 : 0) - matS.opacity) * Math.min(1, dt * 5);
      if (fuoco >= 0) {
        let n = 0;
        stormi[fuoco]!.legami.forEach((_, j) => {
          a3.copy(stormi[fuoco]!.centro.position); b3.copy(stormi[j]!.centro.position);
          ctrl.copy(a3).add(b3).multiplyScalar(0.5); ctrl.y += 0.6;
          for (let q = 0; q < SEG; q++) {
            const u0 = q / SEG, u1 = (q + 1) / SEG;
            const punto2 = (u: number) => [(1 - u) ** 2 * a3.x + 2 * u * (1 - u) * ctrl.x + u * u * b3.x, (1 - u) ** 2 * a3.y + 2 * u * (1 - u) * ctrl.y + u * u * b3.y, (1 - u) ** 2 * a3.z + 2 * u * (1 - u) * ctrl.z + u * u * b3.z];
            // Trattini che scorrono: uno sì e uno no
            if ((q + Math.floor(s * 2)) % 2) { posS.fill(0, (n * SEG + q) * 6, (n * SEG + q + 1) * 6); continue; }
            posS.set([...punto2(u0), ...punto2(u1)], (n * SEG + q) * 6);
          }
          n++;
        });
        posS.fill(0, n * SEG * 6);
        geoS.attributes.position!.needsUpdate = true;
      }
      // Semi: cadono, restano sul prato, spariscono man mano che vengono mangiati
      for (let k = semi.length - 1; k >= 0; k--) {
        const q = semi[k]!;
        if (!q.aTerra) { q.vy -= dt * 4; q.p.y += q.vy * dt; if (q.p.y <= 0.02) { q.p.y = 0.02; q.aTerra = true; } }
        q.o.position.copy(q.p);
        q.o.scale.setScalar(Math.max(0.01, q.resto));
        if (q.resto <= 0) { gruppo.remove(q.o); semi.splice(k, 1); }
      }
    },
  });
}
