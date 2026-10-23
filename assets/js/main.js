// Pizzaria das Famílias · interações da página
import { createHeroVideo, clamp, span, STEPS, FINAL } from './hero-video.js?v=9.5';

const CONFIG = {
  // WhatsApp para reservas, só dígitos, com 55 e DDD: (41) 3669-6782.
  // Vazio: o pedido de reserva abre o Instagram e a mensagem é copiada.
  whatsapp: '554136696782',
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

// ---------- the hero: the film of the pizza being made, run by the scroll (on a phone it just plays) ----------
const hero = document.querySelector('[data-hero]');
const playMQ = window.matchMedia('(max-width: 760px)');
const playing = () => playMQ.matches; // a phone: one screen, the film plays by itself, no long scroll
const heroFilm = hero && createHeroVideo(hero.querySelector('.hero__stage'), { small: phone(), play: playing() });

let heroP = 0, heroS = 0;
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
  u.fill.style.height = `${clamp(span(p, STEPS[0][0], FINAL)) * 100}%`;
  // a warm flash from the oven over the film's cut to the finished pizza
  u.oven.style.opacity = String(span(p, 0.79, 0.825) * (1 - span(p, 0.83, 0.88)));
  heroFilm.update(p);
}

// ---------- one loop for the hero ----------
const visibleSet = new Set();
const visIO = 'IntersectionObserver' in window && new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? visibleSet.add(e.target) : visibleSet.delete(e.target))), { rootMargin: '200px' });
if (hero && visIO) visIO.observe(hero);

function resizeAll() { heroFilm?.resize(); needsHero = true; }
addEventListener('resize', resizeAll);

const nav = document.querySelector('[data-nav]');
let needsHero = true;
function onScroll() {
  if (hero && !playing()) {
    const r = hero.getBoundingClientRect();
    heroP = clamp(-r.top / (r.height - innerHeight));
    needsHero = true;
  }
  nav.classList.toggle('is-solid', scrollY > 40);
}
addEventListener('scroll', onScroll, { passive: true });
// the two tops: scroll-run film with the steps (computer), or one screen with the film playing (phone)
function applyHeroMode() {
  if (!hero) return;
  const play = playing();
  hero.classList.toggle('hero--play', play);
  heroFilm.setMode(play ? 'play' : 'scroll');
  if (play) { show(heroUI.intro, 1, 0); heroUI.oven.style.opacity = '0'; }
  onScroll();
  heroS = heroP;
  needsHero = true;
}
playMQ.addEventListener('change', applyHeroMode);
applyHeroMode();
resizeAll();

const t0 = performance.now();
let lastNow = t0;
function frame(now) {
  const time = (now - t0) / 1000, dt = Math.min(0.1, (now - lastNow) / 1000);
  lastNow = now;
  if (hero && !playing()) {
    // with motion on, the story eases after the scroll (a fast flick still plays every beat)
    const prev = heroS;
    heroS = still() ? heroP : heroS + (heroP - heroS) * (1 - Math.exp(-dt * 4.2));
    if (Math.abs(heroP - heroS) < 0.00005) heroS = heroP;
    if (heroS !== prev) needsHero = true;
  }
  if (hero && !playing() && (visibleSet.has(hero) || !visIO) && (needsHero || !still())) { updateHero(time); needsHero = false; }
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
  const termsBox = booking.querySelector('[data-terms]'), terms = termsBox.querySelector('input');
  terms.addEventListener('change', () => { if (terms.checked) { termsBox.classList.remove('is-missing'); if (status.textContent.includes('termos')) status.textContent = ''; } });
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
      : !s.hora ? ['Escolha o horário de chegada, entre 19h e 20h.', booking.querySelector('[name="hora"]')]
      : !nome ? ['Escreva seu nome para a gente saber de quem é a reserva.', booking.querySelector('[name="nome"]')]
      : !terms.checked ? ['Para enviar, marque que leu e concorda com os termos da reserva.', terms] : null;
    termsBox.classList.toggle('is-missing', miss?.[1] === terms);
    if (miss) { status.textContent = miss[0]; miss[1].focus(); return; }
    const text = `Olá! Sou ${nome} e gostaria de reservar o buffet livre para ${s.pessoas} pessoas, ${longFmt.format(s.date)}, chegando às ${s.hora}${s.niver ? '. É aniversário!' : '.'} Li e concordo com os termos da reserva.`;
    if (CONFIG.whatsapp) { window.open(reserveHref(text), '_blank', 'noopener'); status.textContent = 'Abrimos o WhatsApp com a sua mensagem pronta.'; return; }
    try { await navigator.clipboard.writeText(text); status.textContent = 'Mensagem copiada. Cole no direct do nosso Instagram.'; }
    catch { status.textContent = `Mande no direct do Instagram: “${text}”`; }
    window.open(CONFIG.instagram, '_blank', 'noopener');
  });
  render();
}

const pauseBtn = document.querySelector('[data-pause]');
if (pauseBtn) {
  if (reduce && !playing()) pauseBtn.hidden = true; // on a phone the film loops even then, so the button stays
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    root.classList.toggle('paused', paused);
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.textContent = paused ? 'Retomar animações' : 'Pausar animações';
    heroFilm?.hold(paused);
    needsHero = true;
  });
}

const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();
