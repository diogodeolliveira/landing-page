// Pizzaria das Famílias · interações da página
import { createStage, clamp, span, lerp, easeInOut } from './pizza3d.js?v=5.6';

const CONFIG = {
  // WhatsApp para reservas, só dígitos, com 55 e DDD (ex.: '5541999999999').
  // Vazio: o pedido de reserva abre o Instagram e a mensagem é copiada.
  whatsapp: '',
  instagram: 'https://www.instagram.com/pizzariadasfamilias_/',
};

const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches && !root.classList.contains('force-motion');
if (!reduce) root.classList.add('motion');
const phone = () => window.matchMedia('(max-width: 760px)').matches;
let paused = false;
const still = () => reduce || paused;

// ---------- reveals ----------
document.querySelectorAll('.cards, .stats, .exp__grid').forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty('--i', i)));
const revealIO = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('is-in');
  e.target.querySelectorAll('[data-count]').forEach(countUp);
  revealIO.unobserve(e.target);
}), { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }) : null;
document.querySelectorAll('[data-reveal]').forEach((el) => (revealIO ? revealIO.observe(el) : el.classList.add('is-in')));

function countUp(el) {
  const to = Number(el.dataset.count);
  if (reduce) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 1400;
  const tick = (t) => {
    const k = clamp((t - t0) / dur);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(tick);
  };
  el.textContent = '0';
  requestAnimationFrame(tick);
}

// ---------- embers floating in the dark ----------
const embers = document.querySelector('[data-embers]');
if (embers && !reduce) {
  const g = embers.getContext('2d');
  let W = 0, H = 0, dots = [];
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = embers.width = innerWidth * dpr; H = embers.height = innerHeight * dpr;
    dots = Array.from({ length: phone() ? 26 : 54 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.6 + 0.6) * dpr, v: (Math.random() * 0.25 + 0.08) * dpr, a: Math.random() * 0.6 + 0.2, ph: Math.random() * 6.28 }));
  };
  resize(); addEventListener('resize', resize);
  let last = 0;
  const loop = (t) => {
    if (!document.hidden && !paused && t - last > 30) {
      last = t;
      g.clearRect(0, 0, W, H);
      for (const d of dots) {
        d.y -= d.v; d.x += Math.sin(t / 1600 + d.ph) * 0.2;
        if (d.y < -10) { d.y = H + 10; d.x = Math.random() * W; }
        g.beginPath(); g.arc(d.x, d.y, d.r, 0, 6.283);
        g.fillStyle = `rgba(252, ${200 + Math.round(d.a * 40)}, 40, ${d.a * (0.55 + 0.45 * Math.sin(t / 900 + d.ph))})`;
        g.fill();
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// ---------- the hero: the pizza is born on the bench as you scroll ----------
const hero = document.querySelector('[data-hero]');
const heroStage = hero && createStage(hero.querySelector('[data-hero-canvas]'), { quality: phone() ? 0.6 : 1 });
if (hero && !heroStage) root.classList.add('no-webgl');
if (/[?&]debug\b/.test(location.search)) window.__hero = heroStage; // inspection only

// the story, in scroll progress: the dough lands at IMPACT
const IMPACT = 0.105;
const PH = {
  drop: [0.035, IMPACT], impact: [IMPACT, 0.235], flat: [0.15, 0.25],
  sauce: [0.25, 0.45], cheese: [0.45, 0.585],
  calabresa: [0.585, 0.665], onion: [0.64, 0.7], olive: [0.665, 0.72],
  oregano: [0.72, 0.765], bake: [0.75, 0.815], basil: [0.8, 0.87],
};
const STEPS = [[0.035, 0.25], [0.25, 0.45], [0.45, 0.585], [0.585, 0.72], [0.72, 0.88]];
const FINAL = 0.9;
const CAM = [ // p, radius, elevation, azimuth, lookY
  [0.0, 7.2, 0.4, -0.55, 0.55],
  [0.04, 7.0, 0.38, -0.5, 0.75],
  [IMPACT, 6.3, 0.33, -0.42, 0.24],
  [0.16, 6.8, 0.42, -0.36, 0.2],
  [0.25, 7.5, 0.78, -0.16, 0.24],
  [0.42, 7.4, 0.86, 0.04, 0.12],
  [0.47, 7.6, 0.98, 0.1, 0.1],
  [0.6, 7.6, 1.08, 0.2, 0.08],
  [0.72, 7.2, 0.96, 0.3, 0.1],
  [0.82, 6.6, 0.74, 0.45, 0.12],
  [0.93, 5.6, 0.5, 0.7, 0.14],
  [1.0, 5.7, 0.52, 0.78, 0.14],
];
function camAt(p) {
  for (let i = 0; i < CAM.length - 1; i++) {
    const [a, ...ka] = CAM[i], [b, ...kb] = CAM[i + 1];
    if (p <= b) { const t = easeInOut(span(p, a, b)); return ka.map((v, k) => lerp(v, kb[k], t)); }
  }
  return CAM[CAM.length - 1].slice(1);
}

let heroP = 0, heroS = 0, shakeT0 = -1;
const heroUI = hero && {
  intro: hero.querySelector('[data-intro]'),
  cue: hero.querySelector('[data-scrollcue]'),
  steps: [...hero.querySelectorAll('[data-step]')],
  final: hero.querySelector('[data-final]'),
  oven: hero.querySelector('[data-oven]'),
  num: hero.querySelector('[data-rail-num]'),
  fill: hero.querySelector('[data-rail-fill]'),
};
function show(el, o, lift = 18) {
  el.style.opacity = String(o);
  el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
  el.style.transform = reduce ? '' : `translateY(${(1 - o) * lift}px)`;
}
function updateHero(time) {
  const p = heroS;
  const u = heroUI;
  show(u.intro, 1 - span(p, 0.012, 0.045), -30);
  u.cue.style.opacity = String(1 - span(p, 0.005, 0.03));
  u.steps.forEach((el, i) => { const [a, b] = STEPS[i]; show(el, span(p, a, a + 0.02) * (1 - span(p, b - 0.02, b))); });
  show(u.final, span(p, FINAL, FINAL + 0.03));
  const step = STEPS.findIndex(([a, b]) => p >= a && p < b);
  u.num.textContent = p >= FINAL ? '06' : step < 0 ? '00' : `0${step + 1}`;
  u.fill.style.height = `${clamp(span(p, PH.drop[0], FINAL)) * 100}%`;
  const ovenOn = span(p, 0.75, 0.78) * (1 - span(p, 0.81, 0.87));
  u.oven.style.opacity = String(ovenOn);

  if (!heroStage) return;
  const s = heroStage;
  const ph = (k) => span(p, PH[k][0], PH[k][1]);
  s.pizza.apply({
    sift: 1 - span(p, 0.03, 0.07),
    motes: clamp(lerp(1, 0.3, span(p, 0.12, 0.24)) + 0.4 * span(p, 0.86, 0.95)),
    drop: ph('drop'), impact: ph('impact'), flat: ph('flat'),
    dust: 1 - span(p, 0.3, 0.44),
    sauce: ph('sauce'), cheese: ph('cheese'),
    calabresa: ph('calabresa'), onion: ph('onion'), olive: ph('olive'),
    oregano: ph('oregano'), bake: ph('bake'), basil: ph('basil'),
    steam: still() ? 0 : span(p, 0.79, 0.86),
  }, still() ? 0 : time); // with motion off, nothing drifts on its own
  s.oven.intensity = 28 * ovenOn;

  let [radius, elev, az, lookY] = camAt(p);
  // the camera follows the dough down, then settles on the bench
  const dy = s.pizza.info.doughY;
  if (dy > 0 && p < IMPACT + 0.03) lookY = lerp(lookY, clamp(0.22 + dy * 0.34, 0.22, 1.3), 1 - span(p, IMPACT, IMPACT + 0.03));
  const live = still() ? 0 : 1;
  // narrower screens step back so the whole pizza stays in the frame
  const fit = phone() ? 1.7 : Math.pow(clamp(1.6 / (innerWidth / innerHeight), 1, 1.8), 0.85);
  Object.assign(s.view, {
    radius: radius * fit,
    elev: elev + live * Math.sin(time * 0.18) * 0.012,
    az: az + live * Math.sin(time * 0.25) * 0.03,
    lookY,
    offsetX: phone() ? 0 : 0.2,
    offsetY: phone() ? 0.2 : 0,
  });
  // a short jolt when the dough hits the bench
  const k = time - shakeT0, jolt = live && shakeT0 >= 0 && k < 1.2 ? Math.exp(-k * 6.5) : 0;
  s.view.shakeX = Math.sin(k * 61) * 0.05 * jolt;
  s.view.shakeY = Math.cos(k * 53) * 0.04 * jolt;
  s.view.fov = 30 - 1.4 * jolt * clamp(k * 30);
  s.key.intensity = 180 * (1 + live * Math.sin(time * 0.6) * 0.035 * span(p, 0.86, 0.95));
  s.render();
}

// ---------- one loop for the 3D view ----------
const visibleSet = new Set();
const visIO = 'IntersectionObserver' in window && new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? visibleSet.add(e.target) : visibleSet.delete(e.target))), { rootMargin: '200px' });
if (hero && visIO) visIO.observe(hero);

function resizeAll() { heroStage?.resize(); }
resizeAll();
addEventListener('resize', resizeAll);

const nav = document.querySelector('[data-nav]');
let needsHero = true;
function onScroll() {
  if (hero) {
    const r = hero.getBoundingClientRect();
    heroP = clamp(-r.top / (r.height - innerHeight));
    needsHero = true;
  }
  nav.classList.toggle('is-solid', scrollY > 40);
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();
heroS = heroP;

const t0 = performance.now();
let lastNow = t0;
function frame(now) {
  const time = (now - t0) / 1000, dt = Math.min(0.1, (now - lastNow) / 1000);
  lastNow = now;
  if (hero) {
    // with motion on, the story eases after the scroll (a fast flick still plays every beat)
    const prev = heroS;
    heroS = still() ? heroP : heroS + (heroP - heroS) * (1 - Math.exp(-dt * 6));
    if (Math.abs(heroP - heroS) < 0.00005) heroS = heroP;
    if (!still() && prev < IMPACT && heroS >= IMPACT) shakeT0 = time;
    if (heroS !== prev) needsHero = true;
  }
  if (hero && (visibleSet.has(hero) || !visIO) && (needsHero || !still())) { updateHero(time); needsHero = false; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- card tilt ----------
if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

// ---------- bom saber: one row open at a time ----------
const rows = document.querySelector('[data-rows]');
rows?.addEventListener('click', (e) => {
  const btn = e.target.closest('.row > button');
  if (!btn) return;
  const row = btn.parentElement, open = !row.classList.contains('is-open');
  rows.querySelectorAll('.row').forEach((r) => { const on = r === row && open; r.classList.toggle('is-open', on); r.firstElementChild.setAttribute('aria-expanded', String(on)); });
});

// ---------- reservation ----------
const reserveHref = (text) => (CONFIG.whatsapp ? `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}` : CONFIG.instagram);
const booking = document.querySelector('[data-booking]');
if (booking) {
  const cal = booking.querySelector('[data-cal]');
  const sum = booking.querySelector('[data-booking-sum]');
  const status = booking.querySelector('[data-booking-status]');
  const pv = booking.querySelector('[data-people-val]');
  const longFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const monFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
  const s = { date: null, hora: '', pessoas: 10, niver: false };
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const start = new Date(d0); start.setDate(d0.getDate() - d0.getDay());
  for (let k = 0; k < 35; k++) {
    const d = new Date(start); d.setDate(start.getDate() + k);
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'day' });
    b.dataset.day = d.toISOString();
    b.setAttribute('aria-label', longFmt.format(d));
    b.setAttribute('aria-pressed', 'false');
    b.append(String(d.getDate()));
    const isToday = d.getTime() === d0.getTime();
    if (isToday || d.getDate() === 1) b.append(Object.assign(document.createElement('small'), { textContent: isToday ? 'hoje' : monFmt.format(d).replace('.', '') }));
    if (d < d0) b.disabled = true;
    cal.append(b);
  }
  const render = () => {
    pv.textContent = s.pessoas;
    booking.querySelector('[data-pstep="-1"]').disabled = s.pessoas <= 10;
    booking.querySelector('[data-pstep="1"]').disabled = s.pessoas >= 200;
    if (!s.date || !s.hora) { sum.textContent = !s.date ? 'Escolha o dia e o horário.' : 'Agora escolha o horário de chegada.'; return; }
    const same = s.date.getTime() === d0.getTime();
    sum.innerHTML = `<strong>${longFmt.format(s.date)}</strong>, chegando às <strong>${s.hora}</strong>, para <strong>${s.pessoas} pessoas</strong>${s.niver ? ', com aniversariante' : ''}.${same ? ' Para hoje, mande o pedido o quanto antes.' : ''}`;
  };
  cal.addEventListener('click', (e) => {
    const b = e.target.closest('.day');
    if (!b || b.disabled) return;
    cal.querySelectorAll('.day').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    s.date = new Date(b.dataset.day); status.textContent = ''; render();
  });
  booking.addEventListener('change', (e) => {
    if (e.target.name === 'hora') s.hora = e.target.value;
    if (e.target.name === 'niver') s.niver = e.target.checked;
    render();
  });
  booking.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pstep]');
    if (!b) return;
    s.pessoas = clamp(s.pessoas + Number(b.dataset.pstep), 10, 200); render();
  });
  booking.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = booking.querySelector('[name="nome"]').value.trim();
    const miss = !s.date ? ['Escolha o dia da reserva no calendário.', cal.querySelector('.day:not(:disabled)')]
      : !s.hora ? ['Escolha o horário de chegada: 19h, 19h30 ou 20h.', booking.querySelector('[name="hora"]')]
      : !nome ? ['Escreva seu nome para a gente saber de quem é a reserva.', booking.querySelector('[name="nome"]')] : null;
    if (miss) { status.textContent = miss[0]; miss[1].focus(); return; }
    const text = `Olá! Sou ${nome} e gostaria de reservar o buffet livre para ${s.pessoas} pessoas, ${longFmt.format(s.date)}, chegando às ${s.hora}${s.niver ? '. É aniversário!' : '.'}`;
    if (CONFIG.whatsapp) { window.open(reserveHref(text), '_blank', 'noopener'); status.textContent = 'Abrimos o WhatsApp com a sua mensagem pronta.'; return; }
    try { await navigator.clipboard.writeText(text); status.textContent = 'Mensagem copiada. Cole no direct do nosso Instagram.'; }
    catch { status.textContent = `Mande no direct do Instagram: “${text}”`; }
    window.open(CONFIG.instagram, '_blank', 'noopener');
  });
  render();
}

const pauseBtn = document.querySelector('[data-pause]');
if (pauseBtn) {
  if (reduce) pauseBtn.hidden = true;
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    root.classList.toggle('paused', paused);
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.textContent = paused ? 'Retomar animações' : 'Pausar animações';
    needsHero = true;
  });
}

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();
