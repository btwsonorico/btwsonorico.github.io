// Base comune delle scene a celle della pagina About (gioco della vita, onde).
// Prepara il canvas a tutto schermo, il ciclo di disegno e gli ascoltatori; ferma() spegne tutto,
// così la pagina può passare da una scena all'altra.

export const CELLA = 8;

export type Scena = { ferma(): void };

export function avvia(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const css = (nome: string, riserva: string) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || riserva;
  const colori = { bg: css('--bg', '#0a0b0d'), fg: css('--fg', '#d9dde3'), muted: css('--muted', '#7a828d'), line: css('--line', '#1c2026') };
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dim = { w: 0, h: 0, colonne: 0, righe: 0 };
  let suRidimensiona: (() => void) | null = null;

  const misura = () => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    dim.w = canvas.clientWidth; dim.h = canvas.clientHeight;
    canvas.width = dim.w * dpr; canvas.height = dim.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dim.colonne = Math.ceil(dim.w / CELLA); dim.righe = Math.ceil(dim.h / CELLA);
    suRidimensiona?.();
  };
  misura();
  const osservatore = new ResizeObserver(misura);
  osservatore.observe(canvas);

  const ascoltatori: [string, EventListener][] = [];
  let fotogramma = 0;

  return {
    ctx, dim, colori, ridotto,
    // Pseudo-casuale con seme: la scena parte sempre uguale
    casuale(seme = 7) { return () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; }; },
    posizione(e: PointerEvent) { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] as const; },
    ridimensiona(fn: () => void) { suRidimensiona = fn; },
    ascolta<K extends keyof HTMLElementEventMap>(tipo: K, fn: (e: HTMLElementEventMap[K]) => void) {
      canvas.addEventListener(tipo, fn as EventListener);
      ascoltatori.push([tipo, fn as EventListener]);
    },
    // Ciclo di disegno: dt in secondi, al massimo 0.05; con il movimento ridotto dt resta 0 e la scena sta ferma
    ciclo(disegna: (dt: number, ora: number) => void) {
      let prima = performance.now();
      const passo = (ora: number) => {
        const dt = ridotto ? 0 : Math.min(0.05, (ora - prima) / 1000);
        prima = ora;
        disegna(dt, ora);
        fotogramma = requestAnimationFrame(passo);
      };
      fotogramma = requestAnimationFrame(passo);
    },
    ferma() {
      cancelAnimationFrame(fotogramma);
      osservatore.disconnect();
      ascoltatori.forEach(([tipo, fn]) => canvas.removeEventListener(tipo, fn));
      canvas.style.cursor = '';
      ctx.clearRect(0, 0, dim.w, dim.h);
    },
  };
}
