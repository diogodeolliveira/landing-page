/* =========================================================
   Forno d'Oro — animações com GSAP + ScrollTrigger + Lenis
   ========================================================= */

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none)").matches;

/* ---------- Scroll suave (Lenis) ---------- */

let lenis = null;
if (!reduceMotion && typeof Lenis !== "undefined") {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop(); // liberado quando a abertura termina
}

// Links internos (#) com scroll suave
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
});

// Recalcula as posições quando cada foto termina de carregar
let refreshTimer;
document.querySelectorAll("img").forEach(img => {
  if (!img.complete) {
    img.addEventListener("load", () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
    }, { once: true });
  }
});

/* ---------- Loader + entrada do hero ---------- */

function intro() {
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
  tl.to(".loader", { yPercent: -100, duration: 1.1, ease: "expo.inOut" })
    .set(".loader", { display: "none" })
    .from(".hero__title .line > span", { yPercent: 110, duration: 1.4, stagger: 0.12 }, "-=0.4")
    .from(".hero__eyebrow, .hero__sub, .hero .btn", { y: 30, opacity: 0, duration: 1.2, stagger: 0.1 }, "-=1.1")
    .from(".hero__plate", { scale: 0.6, rotation: -120, opacity: 0, duration: 1.8 }, "-=1.4")
    .from(".nav", { y: -40, opacity: 0, duration: 1 }, "-=1.2")
    .add(() => lenis && lenis.start(), "-=0.8");
}

// Espera a página carregar, mas no máximo 3,5 s (fotos lentas não travam a abertura)
let introDone = false;
function startIntro() {
  if (introDone) return;
  introDone = true;
  if (reduceMotion) {
    gsap.set(".loader", { display: "none" });
    return;
  }
  intro();
}
if (document.readyState === "complete") setTimeout(startIntro, 300);
else window.addEventListener("load", () => setTimeout(startIntro, 300));
setTimeout(startIntro, 3500);

/* ---------- Cursor personalizado + botões magnéticos ---------- */

if (!isTouch) {
  const cursor = document.querySelector(".cursor");
  const label = cursor.querySelector(".cursor__label");
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
  let mx = -100, my = -100;

  // Descobre o que está embaixo do mouse — funciona também quando a página rola
  // e o elemento passa por baixo do cursor parado (ex.: carrossel do menu)
  function updateTarget() {
    const el = document.elementFromPoint(mx, my);
    const target = el && el.closest("[data-cursor]");
    if (target) label.textContent = target.dataset.cursor;
    cursor.classList.toggle("is-big", !!target);
  }

  window.addEventListener("mousemove", e => {
    mx = e.clientX; my = e.clientY;
    xTo(mx); yTo(my);
    cursor.classList.add("is-visible");
    updateTarget();
  });
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
  window.addEventListener("scroll", updateTarget, { passive: true });

  document.querySelectorAll(".magnetic").forEach(btn => {
    btn.addEventListener("mousemove", e => {
      const r = btn.getBoundingClientRect();
      gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.35, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4 });
    });
    btn.addEventListener("mouseleave", () => gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, .4)" }));
  });

  // Pizza do hero inclina seguindo o mouse
  const heroPizza = document.querySelector(".hero__pizza");
  gsap.set(heroPizza, { transformPerspective: 900 });
  document.querySelector(".hero").addEventListener("mousemove", e => {
    const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
    gsap.to(heroPizza, { rotationY: nx * 16, rotationX: -ny * 16, duration: 1, ease: "power2.out" });
  });
}

/* ---------- Barra de progresso + nav ---------- */

gsap.to(".progress span", {
  scaleX: 1, ease: "none",
  scrollTrigger: { start: 0, end: "max", scrub: 0.3 }
});

const nav = document.querySelector(".nav");
ScrollTrigger.create({
  start: 0, end: "max",
  onUpdate: self => {
    const y = self.scroll();
    nav.classList.toggle("is-scrolled", y > 80);
    nav.classList.toggle("is-hidden", self.direction === 1 && y > 600);
  }
});

/* ---------- Hero: pizza gira e desce com o scroll ---------- */

if (!reduceMotion) {
  gsap.to(".hero .ring", { rotation: 360, duration: 40, ease: "none", repeat: -1 });
}

gsap.timeline({
  scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 }
})
  .to(".hero__disc", { rotation: 160, ease: "none" }, 0)
  .to(".hero__pizza", { y: 140, scale: 0.85, ease: "none" }, 0)
  .to(".hero__content", { y: -120, opacity: 0, ease: "none" }, 0)
  .to(".hero__bg-text", { xPercent: -25, ease: "none" }, 0);

/* ---------- Manifesto: palavras acendem uma a uma ---------- */

document.querySelectorAll(".split-words").forEach(el => {
  el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="word">${w}</span>`).join(" ");
  gsap.to(el.querySelectorAll(".word"), {
    opacity: 1, stagger: 0.1, ease: "none",
    scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true }
  });
});

// Contadores (o HTML já traz o número final, caso o JS não rode)
document.querySelectorAll("[data-count]").forEach(el => {
  const obj = { v: 0 };
  el.textContent = "0";
  gsap.to(obj, {
    v: +el.dataset.count, duration: 2.2, ease: "power3.out",
    onUpdate: () => (el.textContent = Math.round(obj.v)),
    scrollTrigger: { trigger: el, start: "top 85%", once: true }
  });
});
gsap.from(".stat", {
  y: 60, opacity: 0, stagger: 0.15, duration: 1.2, ease: "expo.out",
  scrollTrigger: { trigger: ".stats", start: "top 85%", once: true }
});

/* ---------- Ritual: cada ingrediente se revela enquanto a seção fica fixa ---------- */

const steps = document.querySelectorAll(".step");
const stepNow = document.getElementById("stepNow");
let currentStep = 0;

function setStep(i) {
  if (i === currentStep) return;
  steps[currentStep].classList.remove("is-active");
  steps[i].classList.add("is-active");
  currentStep = i;
  stepNow.textContent = String(i + 1).padStart(2, "0");
  gsap.fromTo(stepNow, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, overwrite: true });
}

const frames = gsap.utils.toArray(".frame");
const ritualTl = gsap.timeline({
  defaults: { ease: "power2.inOut" },
  scrollTrigger: {
    trigger: ".ritual",
    pin: ".ritual__pin",
    start: "top top",
    end: () => "+=" + window.innerHeight * 4,
    scrub: 1,
    invalidateOnRefresh: true,
    onUpdate: self => setStep(Math.min(4, Math.floor(self.progress * 5)))
  }
});

ritualTl
  .to(".ritual__disc", { rotation: 50, ease: "none", duration: 5 }, 0)
  .to(".ring--ritual", { rotation: -180, ease: "none", duration: 5 }, 0);

// cada nova foto abre num círculo a partir do centro, girando e "pousando"
frames.slice(1).forEach((frame, i) => {
  const t = i + 0.7;
  ritualTl
    .fromTo(frame, { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", duration: 0.6 }, t)
    .fromTo(frame.querySelector("img"), { scale: 1.7, rotation: -30 }, { scale: 1.15, rotation: 0, duration: 0.6 }, t);
});
ritualTl.to(".ritual__glow", { opacity: 1, scale: 1.2, duration: 0.6 }, 4.2);

/* ---------- Menu: rolagem horizontal ---------- */

const menuPin = document.querySelector(".menu__pin");
const menuHead = document.querySelector(".menu__head");
const menuTrack = document.querySelector(".menu__track");

function menuDistance() {
  const head = menuHead.offsetWidth + parseFloat(getComputedStyle(menuHead).marginRight);
  const pad = parseFloat(getComputedStyle(menuPin).paddingLeft);
  return Math.max(0, pad + head + menuTrack.offsetWidth - window.innerWidth);
}

gsap.to([menuHead, menuTrack], {
  x: () => -menuDistance(),
  ease: "none",
  scrollTrigger: {
    trigger: ".menu",
    pin: ".menu__pin",
    start: "top top",
    end: () => "+=" + menuDistance(),
    scrub: 1,
    invalidateOnRefresh: true
  }
});

gsap.from(".card", {
  y: 120, opacity: 0, stagger: 0.12, duration: 1.2, ease: "expo.out",
  clearProps: "transform,opacity", // devolve o controle ao CSS (efeito de hover)
  scrollTrigger: { trigger: ".menu", start: "top 70%", once: true }
});

/* ---------- Forno ---------- */

gsap.from(".forno__title .reveal-line > span", {
  yPercent: 110, duration: 1.3, stagger: 0.12, ease: "expo.out",
  scrollTrigger: { trigger: ".forno__title", start: "top 80%", once: true }
});
gsap.from(".forno__text", {
  y: 40, opacity: 0, duration: 1.2, ease: "expo.out",
  scrollTrigger: { trigger: ".forno__text", start: "top 85%", once: true }
});
gsap.fromTo(".forno__arch",
  { clipPath: "inset(100% 0% 0% 0% round 999px 999px 0px 0px)" },
  { clipPath: "inset(0% 0% 0% 0% round 999px 999px 0px 0px)", ease: "power2.out",
    scrollTrigger: { trigger: ".forno__arch", start: "top 90%", end: "top 30%", scrub: 1 } });
gsap.fromTo(".forno__arch img", { yPercent: -10 }, {
  yPercent: 10, ease: "none",
  scrollTrigger: { trigger: ".forno__arch", start: "top bottom", end: "bottom top", scrub: true }
});

// Brasas subindo (canvas)
(function embers() {
  const canvas = document.querySelector(".embers");
  const ctx = canvas.getContext("2d");
  let w, h, parts = [], running = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth; h = canvas.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawn(initial) {
    return {
      x: w * (0.35 + Math.random() * 0.65),
      y: initial ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 2.2,
      vy: 0.4 + Math.random() * 1.3,
      vx: (Math.random() - 0.5) * 0.4,
      life: 0.4 + Math.random() * 0.6,
      t: Math.random() * 100
    };
  }
  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    parts.forEach((p, i) => {
      p.t += 0.03;
      p.y -= p.vy;
      p.x += p.vx + Math.sin(p.t) * 0.5;
      const fade = Math.max(0, Math.min(1, p.y / h)) * p.life;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(255,214,140,${fade})`);
      g.addColorStop(0.4, `rgba(226,88,43,${fade * 0.6})`);
      g.addColorStop(1, "rgba(226,88,43,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      if (p.y < -20) parts[i] = spawn(false);
    });
    requestAnimationFrame(frame);
  }

  resize();
  parts = Array.from({ length: isTouch ? 40 : 90 }, () => spawn(true));
  window.addEventListener("resize", () => { resize(); parts = parts.map(() => spawn(true)); });

  if (reduceMotion) return;
  ScrollTrigger.create({
    trigger: ".forno", start: "top bottom", end: "bottom top",
    onToggle: self => {
      const wasRunning = running;
      running = self.isActive;
      if (running && !wasRunning) frame(); // evita dois loops ao mesmo tempo
    }
  });
})();

/* ---------- Citação com parallax ---------- */

const quoteST = { trigger: ".quote", start: "top bottom", end: "bottom top", scrub: true };
gsap.fromTo(".quote__bg", { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: quoteST });
gsap.to(".quote__layer--1", { xPercent: 30, ease: "none", scrollTrigger: quoteST });
gsap.to(".quote__layer--2", { xPercent: -30, ease: "none", scrollTrigger: quoteST });
gsap.from(".quote blockquote", {
  scale: 0.9, opacity: 0, y: 60, ease: "none",
  scrollTrigger: { trigger: ".quote", start: "top 80%", end: "center center", scrub: true }
});

/* ---------- Reserva ---------- */

gsap.fromTo(".reserva__bg img", { scale: 1.25 }, {
  scale: 1, ease: "none",
  scrollTrigger: { trigger: ".reserva", start: "top bottom", end: "bottom bottom", scrub: true }
});
gsap.from(".reserva h2, .form", {
  y: 50, opacity: 0, stagger: 0.12, duration: 1.1, ease: "expo.out",
  scrollTrigger: { trigger: ".reserva", start: "top 75%", once: true }
});

const form = document.querySelector(".form");
const dateInput = form.querySelector("input[type=date]");
dateInput.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

form.addEventListener("submit", e => {
  e.preventDefault();
  const nameInput = form.querySelector("input[name=nome]");
  const msg = form.querySelector(".form__msg");
  const name = nameInput.value.trim().split(/\s+/)[0];
  const dateOk = dateInput.value && dateInput.value >= dateInput.min;

  nameInput.classList.toggle("is-invalid", !name);
  dateInput.classList.toggle("is-invalid", !dateOk);

  if (!name || !dateOk) {
    msg.classList.add("is-error");
    msg.textContent = !name ? "Por favor, informe seu nome." : "Escolha uma data a partir de hoje.";
  } else {
    msg.classList.remove("is-error");
    msg.textContent = `Grazie, ${name}! Sua mesa está reservada.`;
    form.reset();
  }
  gsap.fromTo(msg, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out" });
});

/* ---------- Rodapé ---------- */

gsap.from(".footer__big", {
  yPercent: 60, opacity: 0, ease: "none",
  scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true }
});

window.addEventListener("load", () => ScrollTrigger.refresh());
