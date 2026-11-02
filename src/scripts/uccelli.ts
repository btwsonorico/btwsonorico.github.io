import { avvia, type Scena } from './pixel';

// Uccelli che passano di lato, disegnati a barre verticali: una tela piccola nascosta contiene le sagome, ogni colonna
// la legge dall'alto in basso e diventa una serie di barre sottili; dove la sagoma è più piena la barra è più larga.
// In basso una lunga fascia che ondeggia, come una riva lontana; davanti i grandi, dietro i piccoli e più lenti.
// Il puntatore disturba gli uccelli vicini: accelerano e salgono.

const PASSO = 5, RIGA = 2;

export function monta(canvas: HTMLCanvasElement): Scena {
  const s = avvia(canvas);
  const { ctx, dim } = s;
  const chiaro = document.documentElement.dataset.theme === 'light';
  const inchiostro = chiaro ? '#6d5d43' : '#a8977a';
  const r = s.casuale(17);
  const tela = document.createElement('canvas'), mini = tela.getContext('2d', { willReadFrequently: true })!;
  const misura = () => { tela.width = Math.max(1, Math.ceil(dim.w / PASSO)); tela.height = Math.max(1, Math.ceil(dim.h / RIGA)); };
  misura();
  s.ridimensiona(misura);
  // Stormi: stessa profondità e stessa velocità, ognuno al suo posto in una V larga; ogni tanto uno solo, grande
  type Membro = { dx: number; dy: number; fase: number; battito: number };
  type Stormo = { x: number; y: number; scala: number; vel: number; membri: Membro[]; fuga: number };
  const nuovo = (dentro: boolean): Stormo => {
    const prof = r(), scala = 0.3 + prof * prof * 1.1, n = prof > 0.82 ? 1 : 3 + Math.floor(r() * 6);
    const membri = Array.from({ length: n }, (_, k) => {
      const fila = Math.ceil(k / 2), lato = k % 2 ? 1 : -1;
      return { dx: -fila * 34 * scala * (0.8 + r() * 0.4), dy: lato * fila * 20 * scala + (r() - 0.5) * 8 * scala, fase: r() * 6, battito: 5.5 + r() * 2.5 };
    });
    return { x: dentro ? r() * tela.width : -30 - r() * 140, y: tela.height * (0.12 + r() * 0.5), scala, vel: (6 + scala * 13) * (0.85 + r() * 0.3), membri, fuga: 0 };
  };
  const stormi = Array.from({ length: 6 }, () => nuovo(true)).sort((a, b) => a.scala - b.scala);
  let px = -999, py = -999;
  s.ascolta('pointermove', e => { const [x, y] = s.posizione(e); px = x / PASSO; py = y / RIGA; });
  s.ascolta('pointerleave', () => { px = py = -999; });

  // Un uccello di profilo, rivolto a destra: becco, testa, dorso, coda; l'ala a punta sale e scende all'indietro.
  // La tela ha righe più fitte delle colonne: K riporta le proporzioni giuste
  const K = PASSO / RIGA;
  const uccello = (x: number, y: number, scala: number, batte: number) => {
    mini.save();
    mini.translate(x, y);
    mini.scale(8 * scala, 8 * scala * K);
    mini.beginPath();
    mini.moveTo(1.65, 0.02); mini.lineTo(1.2, -0.15); mini.quadraticCurveTo(0.95, -0.28, 0.6, -0.18); mini.quadraticCurveTo(0, -0.26, -0.55, -0.08);
    mini.lineTo(-1.75, -0.04); mini.lineTo(-1.7, 0.1); mini.lineTo(-0.55, 0.1); mini.quadraticCurveTo(0.2, 0.26, 0.85, 0.12); mini.lineTo(1.25, 0.08); mini.closePath();
    mini.fill();
    const alza = batte * 1.7, indietro = 0.85 - Math.abs(batte) * 0.25;
    mini.beginPath();
    mini.moveTo(0.55, -0.12); mini.quadraticCurveTo(0.2, -alza * 0.55, -indietro, -alza); mini.quadraticCurveTo(-0.4, -alza * 0.45, -0.45, -0.04); mini.closePath();
    mini.fill();
    mini.restore();
  };
  let t = 0;
  const seme = Array.from({ length: 400 }, () => r());
  s.ciclo(dt => {
    t += dt;
    const W = tela.width, H = tela.height;
    mini.globalAlpha = 1;
    mini.fillStyle = '#000'; mini.fillRect(0, 0, W, H);
    mini.fillStyle = '#fff';
    // Fascia lontana: a sinistra poche linee sottili, verso destra cresce e sale come una costa alta
    for (let i = 0; i < W; i++) {
      const u = i / Math.max(1, W), n = seme[i % 400]!, m = seme[(i * 7) % 400]!;
      const forza = Math.min(1, Math.max(0, (u - 0.18) * 1.5)) ** 1.25;
      const costa = Math.max(0, u - 0.62) ** 1.7 * (0.62 + 0.2 * Math.sin(u * 19) + 0.12 * Math.sin(u * 47));
      const centro = H * 0.8 + Math.sin(u * 6 + t * 0.1) * H * 0.008;
      const giu = H * (0.012 + 0.05 * forza) * (0.75 + 0.25 * m), su = H * (0.012 + 0.07 * forza + costa * 2.2) * (0.86 + 0.14 * Math.sin(i * 0.7 + t * 0.35) * n);
      mini.globalAlpha = 0.18 + 0.82 * forza * (0.55 + 0.45 * m);
      if (forza > 0 || i % 2 === 0) mini.fillRect(i, centro - su, 1, su + giu);
    }
    stormi.forEach((b, k) => {
      const fuori = b.x + b.membri.reduce((a, m) => Math.min(a, m.dx), 0) > W + 40;
      if (fuori) { stormi[k] = nuovo(false); return; }
      const d = Math.hypot((b.x - px) * PASSO, (b.y - py) * RIGA);
      if (d < 220) { b.fuga = Math.min(1, b.fuga + dt * 3); b.y -= dt * 18 * (1 - d / 220); }
      b.fuga = Math.max(0, b.fuga - dt * 0.4);
      b.x += b.vel * (1 + b.fuga * 1.2) * dt;
      mini.globalAlpha = 0.6 + Math.min(0.4, b.scala * 0.45);
      b.membri.forEach(m => {
        // Batte le ali, poi plana per un tratto
        const plana = Math.sin(t * 0.45 + m.fase) > 0.5;
        const batte = plana ? 0.18 + Math.sin(t * 1.4 + m.fase) * 0.05 : Math.sin(t * m.battito * (1 + b.fuga * 0.8) + m.fase);
        uccello(b.x + m.dx, b.y + m.dy * K * 0.5 + Math.sin(t * 0.7 + m.fase) * 2, b.scala, batte);
      });
    });
    mini.globalAlpha = 1;
    // Lettura a colonne: ogni colonna è una serie di barre; la larghezza segue la luminosità, a gradini
    const dati = mini.getImageData(0, 0, W, H).data;
    const largaDi = (v: number) => (v < 36 ? 0 : v < 110 ? 1 : v < 190 ? 2 : 3);
    ctx.clearRect(0, 0, dim.w, dim.h);
    ctx.fillStyle = inchiostro;
    for (let i = 0; i < W; i++) {
      const X = i * PASSO;
      for (let j = 0; j < H; j++) {
        const larga = largaDi(dati[(j * W + i) * 4]!);
        if (!larga) continue;
        let fine = j + 1;
        while (fine < H && largaDi(dati[(fine * W + i) * 4]!) === larga) fine++;
        ctx.fillRect(X + Math.floor((PASSO - larga) / 2), j * RIGA, larga, (fine - j) * RIGA);
        j = fine - 1;
      }
    }
  });
  return { ferma: s.ferma };
}
