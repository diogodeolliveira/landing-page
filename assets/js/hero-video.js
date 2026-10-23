// Pizzaria das Famílias · o topo em vídeo: a pizza montada da bola de massa até sair do forno,
// conduzida pela rolagem. Cada etapa da legenda ganha o seu trecho de rolagem e os cortes do filme
// passam numa faixa curta. O vídeo foi codificado com quadro-chave a cada 4 quadros e é baixado
// inteiro antes de entrar, para avançar e voltar quadro a quadro sem travar.

export const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
export const span = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;

// the story in scroll progress: 01 a massa, 02 o molho, 03 o queijo, 04 a cobertura, 05 o orégano, then ready
export const STEPS = [[0.035, 0.22], [0.22, 0.38], [0.38, 0.47], [0.47, 0.67], [0.67, 0.82]];
export const FINAL = 0.86;

const FPS = 24, LAST = 239;
// scroll progress -> film frame. The film's cuts: 30 the dough opened, 65 the sauce, 120 the cheese,
// 129 the calabresa, onion and olives, 186 the oregano, 216 the finished pizza
const KEYS = [[0, 0], [0.035, 1], [0.21, 63], [0.225, 65.5], [0.37, 119], [0.385, 120.5], [0.465, 128.4], [0.478, 129.5], [0.665, 185], [0.675, 186.5], [0.815, 215], [0.83, 216.5], [1, LAST]];
function frameAt(p) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [a, fa] = KEYS[i], [b, fb] = KEYS[i + 1];
    if (p <= b) return lerp(fa, fb, span(p, a, b));
  }
  return LAST;
}

export function createHeroVideo(root, { small = false } = {}) {
  const hero = root.closest('[data-hero]');
  const video = root.querySelector('[data-hero-video]');
  const src = small ? 'assets/video/montagem-480.mp4' : 'assets/video/montagem-720.mp4';
  let want = 0, ready = false, busy = false;

  function seek() {
    if (!ready || busy) return;
    if (Math.abs(video.currentTime - want) < 0.3 / FPS) return;
    busy = true;
    video.currentTime = want;
  }
  video.addEventListener('seeked', () => { busy = false; seek(); });
  video.addEventListener('pause', seek);
  video.addEventListener('loadeddata', () => {
    ready = true;
    hero.classList.add('is-film');
    seek();
  }, { once: true });
  // phones only hand over frames once a muted video has played: start it and stop it at once
  video.addEventListener('loadedmetadata', () => { const p = video.play(); if (p) p.then(() => video.pause()).catch(() => {}); }, { once: true });
  // the whole file first, so every frame is at hand when scrolling back and forth (no range requests)
  fetch(src).then((r) => (r.ok ? r.blob() : Promise.reject(r.status))).then((b) => { video.src = URL.createObjectURL(b); }).catch(() => { video.src = src; });

  function update(p) {
    want = Math.min(frameAt(p) + 0.5, LAST + 0.5) / FPS; // the middle of the frame, never its edge
    seek();
  }
  return { update, resize() {} };
}
