import * as THREE from 'three';

// Base comune per le scene 3D di Projects (bosco) e Advisory (laghetto).
// Gestisce renderer, camera, etichette, trascinamento per ruotare, clic per aprire
// e l'evento "grafo:evidenzia" che arriva dalle liste della pagina.

// Dati di una sezione: competenze chiave e le loro aree
export interface Area { id: string; label: string; href: string; sintesi?: string; peso: number; punti: number }
export interface Competenza { id: string; label: string; href: string; sintesi?: string; aree: Area[] }
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
  // Scena che deve entrare tutta a ogni rotazione: raggio massimo del suolo, punto più alto e più arretrato di ciò che vola
  // e dove inizia lo spazio libero a sinistra, in pixel (misurato a ogni cambio di misura). Se manca, la camera resta dove
  // dice l'opzione camera
  entra?: { raggio: number; alto: number; dietro: number; sinistra: () => number };
  // Chiamata a ogni fotogramma: muove gli oggetti e li accende o spegne
  aggiorna: (t: number, acceso: (famiglia: string, id: string) => number) => void;
  // Dà a chi la chiede una funzione che porta un punto della scena sullo schermo, in pixel
  conProiezione?: (f: (v: THREE.Vector3) => { x: number; y: number }) => void;
  // Chiamata subito dopo aggiorna: serve alla crescita iniziale, che ha l'ultima parola sulle scale
  dopo?: (t: number) => void;
  // Rotazione iniziale intorno all'asse verticale (0.4 se manca), rotazione lenta automatica (sì se manca)
  // e quanto si può girare la scena a destra e a sinistra della rotazione iniziale (senza limite se manca)
  giro?: number;
  ruotaDaSola?: boolean;
  giroMax?: number;
  // Quanto si può inclinare la vista verso il basso, oltre l'inclinazione minima (0.25 se manca; 0: mai più in basso)
  giuMax?: number;
  // Zone cliccabili grandi (per esempio tutto lo stagno): dal raggio della camera restituisce l'id di un punto, o null.
  // Vale quando il puntatore non è vicino a nessun punto
  zona?: (raggio: THREE.Raycaster) => string | null;
  // Puntatore che si muove sopra la scena (senza trascinare): riceve il raggio dalla camera, o null quando esce
  puntatore?: (raggio: THREE.Raycaster | null) => void;
  // Clic che non prende nessun punto (per esempio un sasso lanciato nello stagno): riceve il raggio dalla camera
  clicVuoto?: (raggio: THREE.Raycaster) => void;
  // Zoom libero con rotella, pinch del trackpad e due dita, verso il punto indicato. Si torna indietro allo stesso modo
  zoomLibero?: boolean;
}

const css = (el: HTMLElement, nome: string) => new THREE.Color(getComputedStyle(el).getPropertyValue(nome).trim());

// Colore di una sezione (--verde, --azzurro, --arancio) nel tema attuale
export const tonoSezione = (nome: string) => css(document.documentElement, nome);
export function colori(el: HTMLElement) {
  return { fg: css(el, '--fg'), accent: css(el, '--accent'), muted: css(el, '--muted'), line: css(el, '--line'), bg: css(el, '--bg') };
}

// Crescita iniziale, come il bosco di Software: la base c'è già, i pezzi nascono uno dopo l'altro con un piccolo rimbalzo
// e le etichette arrivano quando è tutto cresciuto. I pezzi fermi nell'origine hanno le coordinate dentro la forma
// (erba, canne): quelli crescono solo in altezza. Con il movimento ridotto (t = 0) è tutto già cresciuto.
export function crescita(pezzi: THREE.Object3D[], punti: Punto[], da = 300, per = 2600, dura = 850) {
  const ease = (x: number) => { const k = 1.4; x -= 1; return x * x * ((k + 1) * x + k) + 1; };
  const voci = pezzi.map((p, i) => ({ p, base: p.scale.clone(), soloY: !(p as THREE.Group).isGroup && p.position.lengthSq() < 1e-6, ritardo: da + (i / Math.max(1, pezzi.length)) * per }));
  const accese = punti.filter(q => !q.spento);
  accese.forEach(q => { q.spento = true; });
  let inizio = -1, finito = false;
  return (t: number) => {
    if (finito) return;
    if (inizio < 0) inizio = t;
    const tempo = t === 0 ? Infinity : t - inizio;
    for (const v of voci) {
      const u = THREE.MathUtils.clamp((tempo - v.ritardo) / dura, 0, 1);
      if (u >= 1 && tempo < da + per + dura) continue;
      const e = Math.max(0.001, ease(u));
      if (v.soloY) v.p.scale.y = v.base.y * Math.min(1, e); else v.p.scale.copy(v.base).multiplyScalar(e);
      v.p.visible = u > 0;
    }
    if (tempo >= da + per + dura) {
      finito = true;
      voci.forEach(v => { v.p.visible = true; if (v.soloY) v.p.scale.y = v.base.y; });
      accese.forEach(q => { q.spento = false; });
    }
  };
}

export function vista(el: HTMLElement, gruppo: THREE.Group, punti: Punto[], o: Opzioni) {
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const c = colori(el);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  // Sul telefono una risoluzione un po' più bassa: la scena resta nitida e consuma meno batteria
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.5 : 2));
  // La scena disegna solo quando si vede: fuori dallo schermo, o con la scheda in secondo piano, si ferma
  let inVista = true;
  new IntersectionObserver(voci => { inVista = voci.some(v => v.isIntersecting); }).observe(el);
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(gruppo);
  // Scena inquadrata a calcolo: obiettivo stretto da più lontano, così il bordo davanti non diventa ripido
  const camera = new THREE.PerspectiveCamera(o.entra ? 28 : 40, 1, 0.1, 60);

  const etichette = punti.map(p => {
    const s = document.createElement('span');
    s.className = `etichetta ${p.hub ? 'skill' : 'area'}`;
    s.textContent = p.label;
    if (p.tono) s.dataset.tono = p.tono;
    s.style.opacity = '0';
    el.appendChild(s);
    return s;
  });

  // Sintesi: con lo zoom su un albero, un branco o una competenza, due righe appaiono sotto di lui
  const sintesi = new Map<string, string>();
  if (el.dataset.grafo) (JSON.parse(el.dataset.grafo) as DatiCompetenze).competenze?.forEach(k => {
    if (k.sintesi) sintesi.set(`skill:${k.id}`, k.sintesi);
    k.aree.forEach(a => { if (a.sintesi) sintesi.set(`area:${a.id}`, a.sintesi); });
  });
  const tagSintesi = document.createElement('div');
  tagSintesi.className = 'sintesi-tag';
  tagSintesi.hidden = true;
  el.appendChild(tagSintesi);

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
  o.conProiezione?.(v => { v.applyMatrix4(gruppo.matrixWorld).project(camera); return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h }; });
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
    // Lontano dai punti: la scena può dire a quale zona grande appartiene il puntatore
    if (best < 0 && o.zona) {
      raggio.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), camera);
      const id = o.zona(raggio);
      if (id) best = punti.findIndex(p => p.id === id);
    }
    return best;
  };
  const locale = (e: MouseEvent) => { const b = el.getBoundingClientRect(); return new THREE.Vector2(e.clientX - b.left, e.clientY - b.top); };

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
      if (o.giroMax !== undefined) rotY = THREE.MathUtils.clamp(rotY, (o.giro ?? 0.4) - o.giroMax, (o.giro ?? 0.4) + o.giroMax);
      rotX = THREE.MathUtils.clamp(rotX + (m.y - ultimo.y) * 0.004, o.inclinazione[0] - (o.giuMax ?? 0.25), o.inclinazione[1]);
    } else {
      sopra = piuVicino(m.x, m.y);
      el.style.cursor = sopra >= 0 && punti[sopra]!.href ? 'pointer' : '';
      if (o.puntatore) {
        raggio.setFromCamera(new THREE.Vector2((m.x / w) * 2 - 1, -(m.y / h) * 2 + 1), camera);
        o.puntatore(raggio);
      }
    }
    ultimo.copy(m);
  });
  el.addEventListener('pointerup', e => {
    ruota = false;
    if (mosso < 4) {
      const m = locale(e);
      const i = piuVicino(m.x, m.y);
      if (i >= 0 && punti[i]!.href) apri(punti[i]!);
      else if (zoomId) zoomSu(null);
      else if (o.clicVuoto) {
        raggio.setFromCamera(new THREE.Vector2((m.x / w) * 2 - 1, -(m.y / h) * 2 + 1), camera);
        o.clicVuoto(raggio);
      }
    }
  });
  // Il browser prende il gesto per scorrere la pagina: la rotazione non deve restare appesa
  el.addEventListener('pointercancel', () => { ruota = false; });
  // Un clic mostra l'argomento: se la pagina ha la lista delle competenze, apre lì la sua voce;
  // altrimenti (per esempio nella home) va alla pagina dell'argomento
  function apri(p: Punto) {
    const voce = document.querySelector<HTMLElement>(`.competenze [data-id="${p.id}"]`);
    if (!voce) {
      if (ridotto) { window.location.href = p.href; return; }
      // Passaggio morbido alla pagina: la camera si avvicina al punto mentre la scena sfuma, poi la pagina cambia
      zoomSu(p.id);
      el.style.transition = 'opacity .5s ease';
      el.style.opacity = '0';
      setTimeout(() => { window.location.href = p.href; }, 480);
      // Tornando indietro col browser la pagina riappare intatta: la scena torna visibile
      window.addEventListener('pageshow', () => { el.style.opacity = ''; zoomSu(null); }, { once: true });
      return;
    }
    for (let d = voce.closest('details'); d; d = d.parentElement?.closest('details') ?? null) d.open = true;
    voce.scrollIntoView({ block: 'center', behavior: ridotto ? 'auto' : 'smooth' });
    voce.classList.remove('lampo');
    void voce.offsetWidth; // riparte l'animazione CSS
    voce.classList.add('lampo');
    zoomSu(p.id);
  }
  // Zoom: la camera si avvicina piano a un punto (per esempio la competenza aperta nella lista) e lo segue mentre la scena gira.
  // Un clic nel vuoto della scena, o chiudere la voce, riporta la vista intera.
  let zoomId: string | null = null, zoom = 1, zoomVoluto = 1, miraLibera = false;
  const miraOra = o.mira.clone(), miraVoluta = new THREE.Vector3(), base = new THREE.Vector3();
  // La pagina può sapere su cosa è la vista (la home nasconde il testo durante lo zoom libero)
  const avvisaZoom = () => window.dispatchEvent(new CustomEvent('grafo:zoomato', { detail: { id: zoomId, libero: miraLibera } }));
  function zoomSu(id: string | null) {
    zoomId = id && punti.some(p => p.id === id) ? id : null;
    miraLibera = false;
    zoomVoluto = zoomId ? 0.5 : 1;
    fermo = zoomId ? 600 : 0;
    avvisaZoom();
  }
  window.addEventListener('grafo:zoom', e => zoomSu((e as CustomEvent<string | null>).detail));

  // Zoom libero: la prima volta che ci si avvicina, la mira va sul punto del suolo indicato e gira insieme alla scena.
  // Tornati alla vista intera, la mira torna al suo posto
  const puntoLibero = new THREE.Object3D();
  if (o.zoomLibero) {
    gruppo.add(puntoLibero);
    const suolo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), inversa = new THREE.Matrix4(), colpito = new THREE.Vector3();
    const cambiaZoom = (fattore: number, x: number, y: number) => {
      zoomVoluto = THREE.MathUtils.clamp(zoomVoluto * fattore, 0.2, 1);
      if (zoomVoluto >= 0.995) { zoomSu(null); return; }
      if (zoomId || miraLibera) return;
      raggio.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), camera);
      gruppo.updateMatrixWorld();
      const nelGruppo = raggio.ray.clone().applyMatrix4(inversa.copy(gruppo.matrixWorld).invert());
      const dentro = nelGruppo.intersectPlane(suolo, colpito) && (!o.entra || colpito.length() < o.entra.raggio);
      if (dentro) puntoLibero.position.copy(colpito); else puntoLibero.position.set(0, 0, 0);
      miraLibera = true;
      fermo = 600;
      avvisaZoom();
    };
    el.addEventListener('wheel', e => {
      // Se la pagina scorre (finestra bassa o stretta), la rotella la fa scorrere. Il pinch del trackpad arriva con ctrl
      if (!e.ctrlKey && document.documentElement.scrollHeight > window.innerHeight + 1) return;
      e.preventDefault();
      const m = locale(e);
      cambiaZoom(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)), m.x, m.y);
    }, { passive: false });
    // Due dita sul telefono. Un dito solo resta alla rotazione e allo scroll della pagina
    const dita = (e: TouchEvent) => {
      const [a, b] = [e.touches[0]!, e.touches[1]!], r = el.getBoundingClientRect();
      return { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), x: (a.clientX + b.clientX) / 2 - r.left, y: (a.clientY + b.clientY) / 2 - r.top };
    };
    let distanzaDita = 0;
    el.addEventListener('touchstart', e => {
      if (e.touches.length !== 2) return;
      ruota = false; mosso = 99;
      distanzaDita = dita(e).d;
    }, { passive: true });
    el.addEventListener('touchmove', e => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      mosso = 99; ruota = false;
      const q = dita(e);
      if (distanzaDita > 0 && q.d > 0) cambiaZoom(distanzaDita / q.d, q.x, q.y);
      distanzaDita = q.d;
    }, { passive: false });
  }
  el.addEventListener('pointerleave', () => { sopra = -1; o.puntatore?.(null); });
  window.addEventListener('grafo:evidenzia', e => {
    const id = (e as CustomEvent<string | null>).detail ?? '';
    esterno = punti.findIndex(p => p.id === id);
  });

  // Inquadratura calcolata: parte con la camera vicina e la mira che mette la scena al centro del riquadro, in verticale.
  // Se così la cima o il bordo davanti escono, o il suolo sfora ai lati, allontana la camera un poco alla volta:
  // la scena è sempre la più grande che entra nel riquadro.
  const miraPreferita = o.mira.y;
  function inquadra({ raggio, alto, dietro, sinistra }: { raggio: number; alto: number; dietro: number; sinistra: () => number }) {
    // Spazio libero: da dove finisce il testo al bordo destro. L'erba può passare appena sotto il testo; il centro della scena
    // va al centro di questo spazio. Con una finestra stretta il testo non si prende mai più di metà larghezza
    const occupato = Math.min(sinistra(), w * 0.5) * 0.85, libero = w - occupato;
    camera.setViewOffset(w, h, -occupato / 2, 0, w, h);
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), margine = 1 - 2 * Math.min(0.06, 24 / h);
    const su = new THREE.Vector3(), avanti = new THREE.Vector3(), v = new THREE.Vector3();
    const altezzaSchermo = (cam: THREE.Vector3, mira: number, y: number, z: number) => {
      avanti.set(0, mira - cam.y, -cam.z).normalize();
      su.set(0, -avanti.z, avanti.y);
      v.set(0, y - cam.y, z - cam.z);
      return v.dot(su) / v.dot(avanti) / tan;
    };
    const fondo = (cam: THREE.Vector3, mira: number) => Math.min(...o.inclinazione.map(a => altezzaSchermo(cam, mira, -raggio * Math.sin(a), raggio * Math.cos(a))));
    // Sopra resta libera la barra del sito
    const limite = 1 - 2 * Math.min(0.12, 64 / h), centro = (limite - margine) / 2;
    const cima = (cam: THREE.Vector3, mira: number) => Math.max(...o.inclinazione.map(a => altezzaSchermo(cam, mira, alto * Math.cos(a) + dietro * Math.sin(a), -dietro * Math.cos(a) + alto * Math.sin(a))));
    const cam = base.clone().multiplyScalar(0.5);
    let mira = miraPreferita;
    for (let giri = 0; giri < 60; giri++) {
      // La scena sta al centro dello spazio fra la barra e il fondo. Più in basso guarda la camera, più in alto sale la scena
      let sale = miraPreferita - 8, scende = miraPreferita + 8;
      for (let q = 0; q < 24; q++) { const m = (sale + scende) / 2; if ((cima(cam, m) + fondo(cam, m)) / 2 < centro) scende = m; else sale = m; }
      mira = sale;
      const lati = raggio / cam.length() / tan / (libero / h);
      if (fondo(cam, mira) >= -margine && cima(cam, mira) <= limite && lati <= margine) break;
      cam.multiplyScalar(1.02);
    }
    base.copy(cam);
    o.mira.y = mira;
    miraOra.copy(o.mira);
  }

  const misura = () => {
    w = el.clientWidth; h = el.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    // In un riquadro stretto o alto la camera si allontana, così la scena entra tutta
    base.copy(o.camera).multiplyScalar(Math.max(1, 1.3 / camera.aspect) ** 1.6);
    // Scena a tutto schermo dietro alla pagina (pagine delle sezioni su schermi larghi): il centro della scena
    // si sposta a destra, nello spazio libero accanto alla colonna di testo, e la camera si allontana un po'
    if (el.closest('.sfondo .a-grafo') && window.innerWidth >= 1080) {
      camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
      base.multiplyScalar(1.25);
    } else camera.clearViewOffset();
    if (o.entra) inquadra(o.entra);
    camera.position.copy(base);
    camera.lookAt(miraOra);
    // La nebbia segue la distanza della camera: sfuma solo il fondo della scena
    const d = camera.position.distanceTo(o.mira);
    // Con la camera vicina il fondo della scena è più lontano in proporzione: la nebbia parte più in là
    scene.fog = o.entra ? new THREE.Fog(c.bg, d, d * 2.4) : new THREE.Fog(c.bg, d * 0.75, d * 1.7);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(misura).observe(el);
  // Il testo cambia larghezza quando arriva il suo font: lo spazio libero va rimisurato
  if (o.entra) document.fonts?.ready.then(misura);

  function disegna() {
    // Una scena in una tab nascosta non consuma risorse
    if (el.offsetParent === null || !inVista || document.hidden) { requestAnimationFrame(disegna); return; }
    const t = ridotto ? 0 : performance.now();
    if (fermo > 0) fermo--; else if (!ruota && !ridotto && o.ruotaDaSola !== false) rotY += 0.0012;
    gruppo.rotation.set(rotX, rotY, 0);
    // Zoom morbido: la mira scivola verso il punto scelto e la camera si avvicina, con la stessa direzione di sempre
    const pz = zoomId ? punti.find(p => p.id === zoomId) : null;
    if (pz) { gruppo.updateMatrixWorld(); pz.ancora.getWorldPosition(miraVoluta); }
    else if (miraLibera) { gruppo.updateMatrixWorld(); puntoLibero.getWorldPosition(miraVoluta); }
    else miraVoluta.copy(o.mira);
    if ((zoomId || miraLibera) && !ruota) fermo = Math.max(fermo, 2);
    const k = ridotto ? 1 : 0.06;
    miraOra.lerp(miraVoluta, k);
    zoom += (zoomVoluto - zoom) * k;
    camera.position.copy(base).sub(o.mira).multiplyScalar(zoom).add(miraOra);
    camera.lookAt(miraOra);

    const fuoco = sopra >= 0 ? sopra : esterno;
    const f = fuoco >= 0 ? punti[fuoco]! : null;
    // 1: in primo piano; 0.5: stessa competenza; 0.15: spento. Senza fuoco tutto a 0.5.
    const acceso = (famiglia: string, id: string) => !f ? 0.5 : id === f.id ? 1 : famiglia === f.famiglia ? 0.5 : 0.15;
    o.aggiorna(t, acceso);
    o.dopo?.(t);
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
    const zoomato = zoomId ? punti.findIndex(p => p.id === zoomId) : -1, testo = zoomato >= 0 ? sintesi.get(punti[zoomato]!.id) : undefined;
    tagSintesi.hidden = !testo;
    if (testo) {
      const pz2 = punti[zoomato]!, sc = schermo(zoomato), dentro = `${pz2.label}: ${testo}`;
      if (tagSintesi.textContent !== dentro) tagSintesi.textContent = dentro;
      const largo = tagSintesi.offsetWidth, x = THREE.MathUtils.clamp(sc.x - largo / 2, 8, Math.max(8, w - largo - 8)), y = THREE.MathUtils.clamp(sc.y + 26, 8, Math.max(8, h - tagSintesi.offsetHeight - 8));
      tagSintesi.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(disegna);
  }
  requestAnimationFrame(disegna);
  return { colori: c };
}
