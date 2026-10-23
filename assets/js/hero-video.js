// Pizzaria das Famílias · o topo em vídeo: a pizza montada da bola de massa até sair do forno.
// No computador o filme é conduzido pela rolagem: cada etapa da legenda ganha o seu trecho e os
// cortes passam numa faixa curta (quadro-chave a cada 4 quadros, arquivo baixado inteiro, para
// avançar e voltar sem travar). No celular o topo ocupa uma tela só e o filme começa sozinho e fica
// em loop enquanto a pessoa estiver no site, sem prender a rolagem.

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

export function createHeroVideo(root, { small = false, play = false } = {}) {
  const hero = root.closest('[data-hero]');
  const video = root.querySelector('[data-hero-video]');
  const src = small ? 'assets/video/montagem-480.mp4' : 'assets/video/montagem-720.mp4';
  let mode = play ? 'play' : 'scroll';
  let want = 0, ready = false, busy = false, held = false;

  // ---- scroll mode: seek to the frame the scroll asks for, one seek at a time ----
  function seek() {
    if (mode !== 'scroll' || !ready || busy) return;
    if (Math.abs(video.currentTime - want) < 0.3 / FPS) return;
    busy = true;
    video.currentTime = want;
  }
  video.addEventListener('seeked', () => { busy = false; seek(); });
  video.addEventListener('pause', seek);

  // ---- play mode: the film starts by itself and loops for as long as the visitor is on the site ----
  function run() {
    if (mode !== 'play') return;
    if (held) { video.pause(); return; }
    if (!video.paused) return;
    const p = video.play();
    if (p) p.catch(waitForTouch);
  }
  // some phones refuse to start a video on their own (battery saver, data saver): the first touch starts it
  function waitForTouch() {
    const go = () => { ['touchend', 'pointerup', 'click', 'keydown'].forEach((t) => removeEventListener(t, go, true)); run(); };
    ['touchend', 'pointerup', 'click', 'keydown'].forEach((t) => addEventListener(t, go, { capture: true, passive: true }));
  }
  // back from another app or tab, or a paused stream: carry on
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
  video.addEventListener('pause', () => { if (mode === 'play' && !held && !document.hidden && !video.ended) run(); });

  video.addEventListener('loadeddata', () => {
    ready = true;
    hero.classList.add('is-film');
    if (mode === 'scroll') seek(); else run();
  }, { once: true });

  function setMode(m) {
    mode = m;
    video.loop = video.autoplay = m === 'play';
    if (m === 'play') run();
    else { video.pause(); seek(); }
  }

  if (mode === 'play') {
    // a phone: stream it and let it play (no need to hold the whole file for seeking)
    video.preload = 'auto';
    video.src = src;
  } else {
    // phones only hand over frames once a muted video has played: start it and stop it at once
    video.addEventListener('loadedmetadata', () => { if (mode !== 'scroll') return; const p = video.play(); if (p) p.then(() => video.pause()).catch(() => {}); }, { once: true });
    // the whole file first, so every frame is at hand when scrolling back and forth (no range requests)
    fetch(src).then((r) => (r.ok ? r.blob() : Promise.reject(r.status))).then((b) => { video.src = URL.createObjectURL(b); }).catch(() => { video.src = src; });
  }
  setMode(mode);

  return {
    update(p) {
      want = Math.min(frameAt(p) + 0.5, LAST + 0.5) / FPS; // the middle of the frame, never its edge
      seek();
    },
    setMode,
    hold(on) { held = on; run(); }, // the footer's "pause animations"
    resize() {},
  };
}
