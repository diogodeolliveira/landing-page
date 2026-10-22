// Pizzaria das Famílias · a pizza nasce na bancada (Three.js), conduzida pela rolagem.
// A massa cai e se acomoda, a farinha se espalha pela bancada, o molho é despejado da concha e
// espalhado em espiral, a mussarela cai como chuva, a cobertura é posta à mão, o orégano e o
// manjericão caem devagar e o forno doura tudo. Cada efeito tem causa e consequência.
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const YELLOW = 0xfcf10c;
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);
const span = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIn = (t) => t * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// seconds of "physical" time the flour burst runs through while the impact phase is scrolled
export const IMPACT_SECONDS = 3.2;

// ---------- canvas textures ----------
function canvas(w = 512, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function spot(g, x, y, r, inner, outer = 'rgba(0,0,0,0)') { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
function polar(r, cx, cy, maxR) { const a = r() * TAU, d = Math.sqrt(r()) * maxR; return [cx + Math.cos(a) * d, cy + Math.sin(a) * d]; }

function crustTextures() {
  const W = 1024, H = 256;
  const [rc, rg] = canvas(W, H), [bc, bg] = canvas(W, H); const r = rng(3);
  rg.fillStyle = '#ead1a1'; rg.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) { rg.fillStyle = r() > 0.5 ? 'rgba(255,246,225,0.45)' : 'rgba(176,128,70,0.18)'; rg.fillRect(r() * W, r() * H, 2, 2); }
  const grad = bg.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#b97436'); grad.addColorStop(0.45, '#c98838'); grad.addColorStop(0.75, '#a35e24'); grad.addColorStop(1, '#8a4c1c');
  bg.fillStyle = grad; bg.fillRect(0, 0, W, H);
  for (let i = 0; i < 4000; i++) { bg.fillStyle = r() > 0.6 ? 'rgba(255,224,170,0.35)' : 'rgba(110,55,20,0.25)'; bg.fillRect(r() * W, r() * H, 2, 2); }
  for (let i = 0; i < 70; i++) { const x = r() * W, y = H * (0.35 + r() * 0.5), s = r() * 22 + 6; spot(bg, x, y, s, 'rgba(40,18,8,0.85)', 'rgba(90,40,14,0)'); }
  for (let i = 0; i < 120; i++) spot(bg, r() * W, H * (0.3 + r() * 0.6), r() * 7 + 2, 'rgba(25,10,4,0.9)');
  for (let i = 0; i < 160; i++) { bg.fillStyle = 'rgba(255,245,225,0.35)'; bg.fillRect(r() * W, r() * H * 0.4, 2, 2); }
  const raw = tex(rc), baked = tex(bc);
  [raw, baked].forEach((t) => { t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); });
  return { raw, baked };
}
function doughTop(baked) {
  const [c, g] = canvas(512); const r = rng(baked ? 15 : 11);
  g.fillStyle = baked ? '#d39a55' : '#ecd3a3'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) { g.fillStyle = r() > 0.5 ? 'rgba(255,240,210,0.3)' : 'rgba(150,100,50,0.2)'; g.fillRect(r() * 512, r() * 512, 2, 2); }
  if (baked) for (let i = 0; i < 60; i++) spot(g, ...polar(r, 256, 256, 250), r() * 18 + 4, 'rgba(90,40,14,0.7)');
  return tex(c);
}
// the dough ball: pale, floury, with a few air bubbles under the skin
function doughBallTexture() {
  const [c, g] = canvas(1024, 512); const r = rng(61);
  g.fillStyle = '#f4e6ca'; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 40; i++) spot(g, r() * 1024, r() * 512, r() * 160 + 60, r() > 0.5 ? 'rgba(255,250,238,0.35)' : 'rgba(222,196,150,0.25)');
  for (let i = 0; i < 16000; i++) { g.fillStyle = r() > 0.4 ? 'rgba(255,252,244,0.22)' : 'rgba(196,160,112,0.06)'; g.fillRect(r() * 1024, r() * 512, 1, 1); }
  for (let i = 0; i < 600; i++) spot(g, r() * 1024, r() * 512, r() * 2.5 + 0.8, 'rgba(255,255,252,0.35)');
  return tex(c);
}
function sauceTexture() {
  const [c, g] = canvas(1024); const r = rng(23); sauceTexture.canvas = c;
  const base = g.createRadialGradient(512, 512, 60, 512, 512, 512);
  base.addColorStop(0, '#b52614'); base.addColorStop(0.8, '#a01c0d'); base.addColorStop(1, '#7c140a');
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 300; i++) {
    g.strokeStyle = r() > 0.5 ? 'rgba(110,14,6,0.3)' : 'rgba(222,70,36,0.24)';
    g.lineWidth = r() * 9 + 2; const rad = r() * 470 + 20, a = r() * TAU;
    g.beginPath(); g.arc(512, 512, rad, a, a + r() * 0.9 + 0.15); g.stroke();
  }
  for (let i = 0; i < 160; i++) spot(g, ...polar(r, 512, 512, 480), r() * 26 + 6, 'rgba(255,140,90,0.22)');
  for (let i = 0; i < 900; i++) { g.fillStyle = r() > 0.5 ? 'rgba(52,70,22,0.75)' : 'rgba(30,40,12,0.6)'; g.fillRect(r() * 1024, r() * 1024, 3, 2); }
  return tex(c);
}
function cheeseTextures() {
  const S = 1024; const [rc, rg] = canvas(S), [bc, bg] = canvas(S), [hc, hg] = canvas(S); const r = rng(37);
  for (let i = 0; i < 2600; i++) { // raw: shredded mozzarella
    const [x, y] = polar(r, 512, 512, 430);
    rg.save(); rg.translate(x, y); rg.rotate(r() * 3.14);
    rg.fillStyle = r() > 0.3 ? 'rgba(250,246,234,0.95)' : 'rgba(238,228,200,0.95)';
    rg.beginPath(); rg.roundRect(-r() * 16 - 8, -3, r() * 30 + 16, r() * 4 + 4, 3); rg.fill(); rg.restore();
  }
  hg.fillStyle = '#000'; hg.fillRect(0, 0, S, S);
  const edge = new Path2D(); // baked: one melted sheet with a wavy edge
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * TAU, rad = 436 + Math.sin(a * 7 + 1.3) * 12 + Math.sin(a * 13) * 8 + (r() - 0.5) * 8;
    const x = 512 + Math.cos(a) * rad, y = 512 + Math.sin(a) * rad; if (i === 0) edge.moveTo(x, y); else edge.lineTo(x, y);
  }
  edge.closePath();
  const base = bg.createRadialGradient(512, 512, 30, 512, 512, 440);
  base.addColorStop(0, '#f3cf6c'); base.addColorStop(0.6, '#ebbd4f'); base.addColorStop(1, '#d6983a');
  bg.fillStyle = base; bg.fill(edge);
  hg.save(); hg.filter = 'blur(10px)'; hg.fillStyle = '#7a7a7a'; hg.fill(edge); hg.restore();
  for (let i = 0; i < 300; i++) {
    const [x, y] = polar(r, 512, 512, 410), s = r() * 40 + 10, up = r() > 0.5;
    spot(bg, x, y, s, up ? 'rgba(255,240,190,0.5)' : 'rgba(214,150,52,0.35)');
    spot(hg, x, y, s, up ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)');
  }
  for (let i = 0; i < 90; i++) { // leopard bubbles: raised blisters, dark ring, light middle
    const [x, y] = polar(r, 512, 512, 400), s = r() * 22 + 8;
    spot(bg, x, y, s * 1.5, 'rgba(150,80,22,0.75)', 'rgba(170,96,30,0)');
    spot(bg, x - s * 0.15, y - s * 0.15, s * 0.7, 'rgba(250,224,150,0.95)', 'rgba(240,200,110,0)');
    spot(hg, x, y, s * 1.3, 'rgba(255,255,255,0.85)');
  }
  for (let i = 0; i < 70; i++) spot(bg, ...polar(r, 512, 512, 410), r() * 6 + 2, 'rgba(70,32,10,0.85)');
  bg.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 40; i++) {
    const [x, y] = polar(r, 512, 512, 390), rx = r() * 22 + 7, ry = r() * 13 + 5, rot = r() * 3;
    bg.beginPath(); bg.ellipse(x, y, rx, ry, rot, 0, 7); bg.fill();
    hg.save(); hg.filter = 'blur(4px)'; hg.fillStyle = '#1a1a1a'; hg.beginPath(); hg.ellipse(x, y, rx, ry, rot, 0, 7); hg.fill(); hg.restore();
  }
  bg.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 160; i++) { const [x, y] = polar(r, 512, 512, 390); bg.fillStyle = 'rgba(255,255,240,0.55)'; bg.beginPath(); bg.ellipse(x, y, r() * 10 + 3, r() * 3 + 1.5, r() * 3, 0, 7); bg.fill(); }
  return { raw: tex(rc), baked: tex(bc), height: tex(hc, false), normal: heightToNormal(hc, 3.2) };
}
function noiseTexture(seed) {
  const [c, g] = canvas(256); const r = rng(seed);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) { const v = Math.floor(r() * 255); spot(g, r() * 256, r() * 256, r() * 26 + 6, `rgba(${v},${v},${v},0.8)`); }
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function pepperoniTextures() {
  const [rc, rg] = canvas(256), [bc, bg] = canvas(256); const r = rng(41);
  const paint = (g, baked) => {
    g.fillStyle = baked ? '#5a120c' : '#7a221c'; g.fillRect(0, 0, 256, 256);
    const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    if (baked) { gr.addColorStop(0, '#b02a1c'); gr.addColorStop(0.62, '#9a2216'); gr.addColorStop(0.86, '#5e140c'); gr.addColorStop(1, '#2a0804'); }
    else { gr.addColorStop(0, '#d0564a'); gr.addColorStop(0.85, '#b23f35'); gr.addColorStop(1, '#7c241d'); }
    g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 128, 0, 7); g.fill();
    for (let i = 0; i < 80; i++) { g.fillStyle = baked ? `rgba(240,170,120,${0.35 + r() * 0.3})` : `rgba(250,${200 + r() * 30},${185 + r() * 30},0.8)`; g.beginPath(); g.ellipse(...polar(r, 128, 128, 100), r() * 5 + 2, r() * 3.5 + 1.5, r() * 3, 0, 7); g.fill(); }
    if (baked) spot(g, 120, 116, 60, 'rgba(255,160,90,0.35)');
  };
  paint(rg, false); paint(bg, true);
  return { raw: tex(rc), baked: tex(bc) };
}
function basilTexture() {
  const [c, g] = canvas(256); g.fillStyle = '#2f6b1f'; g.fillRect(0, 0, 256, 256);
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(20,60,10,0.6)'); gr.addColorStop(0.5, 'rgba(110,170,60,0.35)'); gr.addColorStop(1, 'rgba(20,60,10,0.6)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(160,210,110,0.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke();
  g.lineWidth = 1.5; for (let i = 1; i < 7; i++) { g.beginPath(); g.moveTo(128, i * 36); g.lineTo(40, i * 36 - 24); g.moveTo(128, i * 36); g.lineTo(216, i * 36 - 24); g.stroke(); }
  return tex(c);
}
function softTexture(inner, outer) { const [c, g] = canvas(128); spot(g, 64, 64, 64, inner, outer); return tex(c); }
function bumpTexture(seed, w = 256, repeat = [3, 1]) {
  const [c, g] = canvas(w); const r = rng(seed);
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, w);
  for (let i = 0; i < 4000; i++) { const v = 80 + r() * 100; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(r() * w, r() * w, r() * 3 + 1, 0, 7); g.fill(); }
  const t = tex(c, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); return t;
}
// the bench: dark stone, a little mottled, dissolving into the dark at its edges
function benchTextures() {
  const S = 1024; const [c, g] = canvas(S); const r = rng(5);
  g.fillStyle = '#12100d'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) spot(g, r() * S, r() * S, r() * 240 + 80, r() > 0.5 ? `rgba(40,33,26,${0.12 + r() * 0.16})` : `rgba(3,3,2,${0.25 + r() * 0.25})`);
  for (let i = 0; i < 30000; i++) { const v = r(); g.fillStyle = v > 0.96 ? 'rgba(96,86,72,0.22)' : v > 0.5 ? 'rgba(30,27,22,0.55)' : 'rgba(0,0,0,0.5)'; const s = r() * 1.6 + 0.6; g.fillRect(r() * S, r() * S, s, s); }
  for (let i = 0; i < 110; i++) {
    g.strokeStyle = `rgba(90,80,66,${0.06 + r() * 0.12})`; g.lineWidth = r() * 1.1 + 0.3;
    const x = r() * S, y = r() * S, a = r() * TAU, l = 30 + r() * 150;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const map = tex(c); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(3, 3);
  const [ac, ag] = canvas(512);
  const gr = ag.createRadialGradient(256, 256, 0, 256, 256, 256);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.42, '#fff'); gr.addColorStop(1, '#000');
  ag.fillStyle = gr; ag.fillRect(0, 0, 512, 512);
  return { map, alpha: tex(ac, false) };
}
// flour on the bench: a fine dusting before, and what the impact throws out (streaks, a ring of clumps)
function flourTextures() {
  const S = 1024, C = S / 2; const [dc, dg] = canvas(S), [bc, bg] = canvas(S); const r = rng(17);
  for (let i = 0; i < 15000; i++) {
    const a = r() * TAU, d = Math.pow(r(), 0.9) * C * 0.62, k = 1 - d / (C * 0.62);
    dg.fillStyle = `rgba(255,255,255,${(0.05 + r() * 0.3) * (0.15 + 0.85 * k * k)})`;
    const s = r() * 1.4 + 0.5; dg.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d * 0.94, s, s);
  }
  for (let i = 0; i < 60; i++) spot(dg, ...polar(r, C, C, C * 0.4), r() * 40 + 12, 'rgba(255,255,255,0.05)');
  // streaks are broken into grains, so the deposit reads as thrown powder, not a drawing
  for (let i = 0; i < 1300; i++) {
    const a = r() * TAU, d0 = C * (0.13 + r() * 0.14), len = C * (0.04 + Math.pow(r(), 2) * 0.42), al = 0.07 + r() * 0.2;
    for (let t = 0; t < len; t += 1.6 + r() * 3) { const dd = d0 + t, aj = a + (r() - 0.5) * 0.012; const sz = (r() * 1.6 + 0.5) * (1 - t / len * 0.6); bg.fillStyle = `rgba(255,255,255,${al * (1 - t / len)})`; bg.fillRect(C + Math.cos(aj) * dd, C + Math.sin(aj) * dd, sz, sz); }
  }
  for (let i = 0; i < 8000; i++) { const a = r() * TAU, d = C * (0.16 + Math.pow(r(), 0.7) * 0.6), fade = 1 - (d / C - 0.16) / 0.6; bg.fillStyle = `rgba(255,255,255,${(0.08 + r() * 0.32) * (0.3 + 0.7 * fade)})`; const s = r() * 2.2 + 0.5; bg.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, s, s); }
  for (let i = 0; i < 260; i++) { const a = r() * TAU, d = C * (0.22 + r() * 0.36); spot(bg, C + Math.cos(a) * d, C + Math.sin(a) * d, r() * 8 + 2, 'rgba(255,255,255,0.32)'); }
  return { dust: tex(dc), blast: tex(bc) };
}

// relief: turn a grey height map into a normal map, so light catches every bubble
function heightToNormal(src, strength = 2.5) {
  const w = src.width, h = src.height;
  const s = src.getContext('2d').getImageData(0, 0, w, h).data;
  const [c, g] = canvas(w, h); const out = g.createImageData(w, h), o = out.data;
  const at = (x, y) => s[((Math.min(h - 1, Math.max(0, y)) * w) + Math.min(w - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    o[i] = (-dx / l * 0.5 + 0.5) * 255; o[i + 1] = (dy / l * 0.5 + 0.5) * 255; o[i + 2] = (1 / l * 0.5 + 0.5) * 255; o[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  return tex(c, false);
}

// ---------- shader helpers ----------
// sauce spread by the back of the ladle along an Archimedean spiral: r = R0 + B·θ
const SAUCE_R0 = 0.3, SAUCE_B = 0.27 / TAU, SAUCE_THETA = (1.2 - SAUCE_R0) / SAUCE_B, SAUCE_Y = 0.097;
const SWIRL = `
  {
    vec2 cc = vMapUv - 0.5;
    float ph = atan(-cc.y, cc.x); if (ph < 0.0) ph += 6.28318;
    float rr = length(cc) * 2.5 + (texture2D(uNoise, vMapUv * 2.0).r - 0.5) * 0.08;
    float kk = floor((rr - uSR0 - uSB * ph) / (6.28318 * uSB) + 0.5);
    float thp = ph + 6.28318 * kk;
    float cov = max(max(step(rr, uCR), step(thp, uTheta)), uFill);
    if (cov < 0.5) discard;
    fresh = (1.0 - smoothstep(0.0, 1.8, uTheta - thp)) * step(uCR, rr) * (1.0 - uFill);
    diffuseColor.rgb *= 1.0 - 0.14 * fresh;
  }`;
// bake = mix the raw map into the baked map; reveal = draw a layer progressively
function enhance(mat, key, { baked, reveal, revealMap, noise } = {}) {
  const u = {
    uBake: { value: 0 }, uProgress: { value: 1 }, uBakedMap: { value: baked || null }, uReveal: { value: revealMap || null },
    uNoise: { value: noise || null }, uTheta: { value: 0 }, uCR: { value: 0 }, uFill: { value: 0 }, uSR0: { value: SAUCE_R0 }, uSB: { value: SAUCE_B },
  };
  mat.userData.u = u;
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uBake; uniform float uProgress; uniform sampler2D uBakedMap; uniform sampler2D uReveal; uniform sampler2D uNoise; uniform float uTheta; uniform float uCR; uniform float uFill; uniform float uSR0; uniform float uSB;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float fresh = 0.0;
        ${baked ? 'vec4 bakedCol = vec4(diffuse, opacity) * texture2D(uBakedMap, vMapUv); diffuseColor = mix(diffuseColor, bakedCol, uBake);' : ''}
        ${reveal === 'swirl' ? SWIRL : ''}
        ${reveal === 'blot' ? 'if (texture2D(uReveal, vMapUv).r > uProgress * 1.02 - 0.001) discard;' : ''}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.08, fresh);');
  };
  return mat;
}

// flour grains as round soft points, lit warmer the higher they float into the side light
const POINT_FRAG = `
  varying float vA; varying float vL;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vA;
    if (a < 0.004) discard;
    gl_FragColor = vec4(mix(vec3(0.5, 0.47, 0.42), vec3(1.0, 0.94, 0.82), vL), a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
// the burst: every grain follows a closed-form flight (drag + gravity), evaluated on the GPU, so the
// cloud is identical whether the visitor scrolls forward, backward or stops in the middle
const BURST_VERT = `
  attribute vec3 aV; attribute vec4 aK;
  uniform float uT; uniform float uFade; uniform float uSize;
  varying float vA; varying float vL;
  void main() {
    float k = aK.x, g = aK.y, fine = step(1.0, aK.w), seed = fract(aK.w);
    float t = uT;
    float e = (1.0 - exp(-k * t)) / k;
    vec3 p = position + vec3(aV.x, 0.0, aV.z) * e;
    float y = position.y + (aV.y + g / k) * e - (g / k) * t;
    float landed = 1.0 - step(0.0, y);
    float drift = fine * min(t, 3.2);
    p.x += sin(t * 1.7 + seed * 40.0) * 0.05 * drift;
    p.z += cos(t * 1.3 + seed * 31.0) * 0.05 * drift;
    p.y = max(y, 0.003 + seed * 0.004) + fine * sin(t * 2.1 + seed * 17.0) * 0.012 * drift;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aK.z * uSize / -mv.z;
    float born = smoothstep(0.0, 0.03, t);
    float settle = landed * (1.0 - fine) * smoothstep(0.4, 1.4, t);
    float age = fine * smoothstep(1.6, 3.2, t) * 0.8;
    vA = uFade * born * (1.0 - settle * 0.9) * (1.0 - age) * mix(0.9, 0.5, fine);
    vL = clamp(0.3 + p.y * 1.5 + p.x * 0.12, 0.0, 1.0);
  }`;
// flour sifted from above at rest, and the motes that hang in the light afterwards
const DRIFT_VERT = `
  attribute vec4 aS;
  uniform float uTime; uniform float uFade; uniform float uSize; uniform float uH; uniform float uY0; uniform float uDir;
  varying float vA; varying float vL;
  void main() {
    float m = mod(uTime * aS.x + aS.y * uH, uH);
    float y = uDir < 0.0 ? uY0 + uH - m : uY0 + m;
    vec3 p = vec3(position.x + sin(uTime * 0.7 + aS.y * 30.0) * aS.z, y, position.z + cos(uTime * 0.5 + aS.y * 21.0) * aS.z);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aS.w * uSize / -mv.z;
    float k = (y - uY0) / uH;
    vA = uFade * smoothstep(0.0, 0.1, k) * smoothstep(1.0, 0.72, k);
    vL = clamp(0.4 + p.x * 0.14 + k * 0.25, 0.0, 1.0);
  }`;
function points(n, attrs, vertexShader, uniforms) {
  const geo = new THREE.BufferGeometry();
  Object.entries(attrs).forEach(([name, [arr, size]]) => geo.setAttribute(name, new THREE.BufferAttribute(arr, size)));
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader: POINT_FRAG, transparent: true, depthWrite: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  return pts;
}
function drift(n, seed, { radius, h, y0, dir, speed, size, sway, cx = 0, cz = 0 }) {
  const r = rng(seed), pos = new Float32Array(n * 3), s = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * radius;
    pos.set([cx + Math.cos(a) * d, 0, cz + Math.sin(a) * d], i * 3);
    s.set([lerp(speed[0], speed[1], r()), r(), sway * (0.4 + r() * 0.6), lerp(size[0], size[1], r())], i * 4);
  }
  return points(n, { position: [pos, 3], aS: [s, 4] }, DRIFT_VERT, { uTime: { value: 0 }, uFade: { value: 0 }, uSize: { value: 1 }, uH: { value: h }, uY0: { value: y0 }, uDir: { value: dir } });
}

// ---------- the crust profile, shared by the crust and the dough that becomes it ----------
const PROF = [[0, 0], [1.26, 0], [1.42, 0.012], [1.51, 0.055], [1.555, 0.12], [1.54, 0.19], [1.47, 0.235], [1.38, 0.22], [1.31, 0.16], [1.27, 0.1], [1.25, 0.088], [0, 0.088]];
const PROF_CUM = PROF.reduce((acc, p, i) => { acc.push(i ? acc[i - 1] + Math.hypot(p[0] - PROF[i - 1][0], p[1] - PROF[i - 1][1]) : 0); return acc; }, []);
function profAt(s) {
  const d = clamp(s) * PROF_CUM[PROF_CUM.length - 1];
  let j = 1; while (j < PROF.length - 1 && PROF_CUM[j] < d) j++;
  const t = (d - PROF_CUM[j - 1]) / ((PROF_CUM[j] - PROF_CUM[j - 1]) || 1);
  return [lerp(PROF[j - 1][0], PROF[j][0], t), lerp(PROF[j - 1][1], PROF[j][1], t)];
}
function rimDeformer() {
  const cr = rng(77);
  const waves = Array.from({ length: 6 }, (_, k) => ({ k: [3, 5, 8, 13, 21, 34][k], ph: cr() * TAU, a: [0.018, 0.014, 0.012, 0.01, 0.008, 0.006][k] }));
  const puffs = Array.from({ length: 14 }, () => ({ a: cr() * TAU, w: 0.12 + cr() * 0.2, h: 0.02 + cr() * 0.035 }));
  return (x, y, z) => {
    const rad = Math.hypot(x, z);
    if (rad < 1.2) return [x, y, z];
    const ang = Math.atan2(z, x), rim = Math.min(1, (rad - 1.2) / 0.3);
    let s = 1; waves.forEach((wv) => { s += Math.sin(ang * wv.k + wv.ph) * wv.a * rim; });
    let lift = 0; puffs.forEach((pf) => { const d = Math.atan2(Math.sin(ang - pf.a), Math.cos(ang - pf.a)); lift += pf.h * Math.exp(-(d * d) / (pf.w * pf.w)); });
    const top = Math.max(0, (y - 0.06) / 0.18);
    return [x * s, y + lift * top * rim + Math.sin(ang * 9 + 1.7) * 0.008 * top, z * s];
  };
}

// a lathe's first and last columns sit on the same seam; give them the same normal so no line shows
function seamless(geo, nPts, segments) {
  const n = geo.attributes.normal;
  for (let j = 0; j < nPts; j++) {
    const a = j, b = segments * nPts + j;
    const x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
  }
  n.needsUpdate = true;
}

// ---------- the pizza and everything that happens on the bench ----------
export function createPizza(quality = 1) {
  const group = new THREE.Group();
  const layers = { base: new THREE.Group(), sauce: new THREE.Group(), cheese: new THREE.Group(), toppings: new THREE.Group() };
  Object.values(layers).forEach((l) => group.add(l));
  const dummy = new THREE.Object3D();
  const deform = rimDeformer();
  const info = { doughY: -1, focus: [] };
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // --- flour on the bench (lit, so the side light rakes across it)
  const fl = flourTextures();
  const decalU = { uBlastMap: { value: fl.blast }, uFront: { value: 0 }, uBlast: { value: 0 } };
  const decalMat = new THREE.MeshStandardMaterial({ map: fl.dust, transparent: true, depthWrite: false, roughness: 1, color: '#fffaf0' });
  decalMat.customProgramCacheKey = () => 'flour-decal';
  decalMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, decalU);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uBlastMap; uniform float uFront; uniform float uBlast;')
      .replace('#include <map_fragment>', `
        float dustA = texture2D(map, vMapUv).a;
        float blastA = texture2D(uBlastMap, vMapUv).a;
        float rr = length(vMapUv - 0.5);
        float inside = 1.0 - smoothstep(uFront - 0.05, uFront, rr);
        float fa = dustA * (1.0 - 0.75 * uBlast * inside) + blastA * uBlast * inside;
        diffuseColor.a *= clamp(fa, 0.0, 1.0);`);
  };
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), decalMat);
  decal.rotation.x = -Math.PI / 2; decal.position.y = 0.0015; decal.receiveShadow = true; decal.renderOrder = -2;
  group.add(decal);

  // --- crust with a puffy rim
  const crustTex = crustTextures();
  const crustMat = enhance(new THREE.MeshStandardMaterial({ map: crustTex.raw, roughness: 0.86, bumpMap: bumpTexture(5), bumpScale: 1.4 }), 'crust', { baked: crustTex.baked });
  const crustGeo = new THREE.LatheGeometry(PROF.map(([x, y]) => new THREE.Vector2(x, y)), 192);
  { const pos = crustGeo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setXYZ(i, ...deform(pos.getX(i), pos.getY(i), pos.getZ(i))); crustGeo.computeVertexNormals(); seamless(crustGeo, PROF.length, 192); }
  const crust = new THREE.Mesh(crustGeo, crustMat);
  crust.castShadow = true; crust.receiveShadow = true;
  const topMat = enhance(new THREE.MeshStandardMaterial({ map: doughTop(false), roughness: 0.85 }), 'top', { baked: doughTop(true) });
  const top = new THREE.Mesh(new THREE.CircleGeometry(1.27, 96), topMat);
  top.rotation.x = -Math.PI / 2; top.position.y = 0.09; top.receiveShadow = true;
  layers.base.add(crust, top);

  // --- the dough ball: falls, squashes, wobbles, then is stretched into the very shape of the crust
  const DOUGH_R = 0.55;
  const doughGeo = new THREE.SphereGeometry(DOUGH_R, 80, 52);
  const dPos = doughGeo.attributes.position, nV = dPos.count;
  const ballXYZ = new Float32Array(dPos.array), discXYZ = new Float32Array(nV * 3), jitter = new Float32Array(nV), rimW = new Float32Array(nV);
  // UVs: the sphere's own while it is a ball, a top-down projection once it is a disc (no pinch at the pole)
  const dUV = doughGeo.attributes.uv, ballUV = new Float32Array(dUV.array), discUV = new Float32Array(nV * 2);
  for (let i = 0; i < nV; i++) {
    const x = ballXYZ[i * 3], y = ballXYZ[i * 3 + 1], z = ballXYZ[i * 3 + 2];
    const s = 1 - Math.acos(clamp(y / DOUGH_R, -1, 1)) / Math.PI;
    const [px, py] = profAt(s), hl = Math.hypot(x, z), dx = hl > 1e-6 ? x / hl : 0, dz = hl > 1e-6 ? z / hl : 0;
    discXYZ.set(deform(px * dx, py, px * dz), i * 3);
    const a = Math.atan2(z, x); jitter[i] = 0.6 * Math.sin(a * 3 + 1.1) + 0.4 * Math.sin(a * 7 + 2.3); rimW[i] = Math.max(0, 1 - ((s - 0.5) / 0.2) ** 2);
    discUV[i * 2] = discXYZ[i * 3] / 3.4 + 0.5; discUV[i * 2 + 1] = discXYZ[i * 3 + 2] / 3.4 + 0.5;
  }
  const dough = new THREE.Mesh(doughGeo, new THREE.MeshPhysicalMaterial({ map: doughBallTexture(), roughness: 0.72, sheen: 0.6, sheenRoughness: 0.55, sheenColor: new THREE.Color('#fff4e0') }));
  dough.castShadow = true; dough.receiveShadow = true; dough.frustumCulled = false; group.add(dough); // its vertices move every frame
  function placeDough(drop, it, flat) {
    let sy, yc, rot;
    if (it <= 0) { const d = easeIn(drop); yc = lerp(4.1, DOUGH_R * 0.94, d); sy = lerp(1, 1.09, d); rot = (1 - drop) * 2.4; }
    else {
      const spring = 0.92 - 0.3 * Math.exp(-4.5 * it) * Math.cos(14 * it);
      sy = lerp(1.09, spring, clamp(it / 0.05)); yc = DOUGH_R * sy * 0.94; rot = 0;
    }
    const sx = 1 / Math.sqrt(sy), a = dPos.array, wob = Math.sin(Math.PI * flat);
    for (let i = 0; i < nV; i++) {
      const k = i * 3;
      let x = ballXYZ[k] * sx, y = ballXYZ[k + 1] * sy + yc, z = ballXYZ[k + 2] * sx;
      if (it > 0 && y < 0) y = 0; // the contact patch flattens against the bench
      if (flat > 0) { const f = clamp(flat + jitter[i] * 0.1 * rimW[i] * wob); x = lerp(x, discXYZ[k], f); y = lerp(y, discXYZ[k + 1], f); z = lerp(z, discXYZ[k + 2], f); }
      a[k] = x; a[k + 1] = y; a[k + 2] = z;
    }
    const m = clamp((flat - 0.15) / 0.6), uv = dUV.array;
    for (let i = 0; i < nV * 2; i++) uv[i] = lerp(ballUV[i], discUV[i], m);
    dUV.needsUpdate = true;
    dPos.needsUpdate = true; doughGeo.computeVertexNormals();
    dough.rotation.y = rot;
    info.doughY = yc;
  }

  // --- the flour thrown out by the impact
  const flN = Math.round(4200 * quality), fr = rng(29);
  const flP0 = new Float32Array(flN * 3), flV = new Float32Array(flN * 3), flK = new Float32Array(flN * 4);
  for (let i = 0; i < flN; i++) {
    const a = fr() * TAU, fine = fr() < 0.42 ? 1 : 0, r0 = 0.26 + fr() * 0.24, aj = a + (fr() - 0.5) * 0.35;
    flP0.set([Math.cos(a) * r0, 0.01 + fr() * 0.05, Math.sin(a) * r0], i * 3);
    const sp = fine ? 0.8 + fr() * 2.6 : 1.3 + Math.pow(fr(), 1.8) * 5.4, up = fine ? 0.3 + fr() * 1.7 : 0.08 + Math.pow(fr(), 2) * 1.5;
    flV.set([Math.cos(aj) * sp, up, Math.sin(aj) * sp], i * 3);
    flK.set([fine ? 3.2 + fr() * 1.5 : 1.3 + fr() * 0.8, fine ? 0.18 + fr() * 0.2 : 5.5 + fr() * 2.5, fine ? 1.2 + fr() * 1.6 : 2 + fr() * 3, fine + fr() * 0.999], i * 4);
  }
  const burst = points(flN, { position: [flP0, 3], aV: [flV, 3], aK: [flK, 4] }, BURST_VERT, { uT: { value: 0 }, uFade: { value: 0 }, uSize: { value: 1 } });
  group.add(burst);
  // a low, short-lived veil where the cloud is densest (kept faint: flour, not smoke)
  const puffTex = softTexture('rgba(255,250,240,0.6)', 'rgba(255,250,240,0)'), pr = rng(31);
  const puffs = Array.from({ length: 16 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity: 0, depthWrite: false }));
    s.userData = { a: pr() * TAU, v: 1.1 + pr() * 1.4, y: pr() * 0.05, g: 0.7 + pr() * 0.6 };
    group.add(s); return s;
  });
  const sift = drift(Math.round(380 * quality), 43, { radius: 0.62, h: 3.9, y0: 0, dir: -1, speed: [0.28, 0.5], size: [1.2, 2.6], sway: 0.06, cx: 0.1, cz: 0.05 });
  const motes = drift(Math.round(160 * quality), 47, { radius: 2.6, h: 2.2, y0: 0.05, dir: 1, speed: [0.03, 0.08], size: [1.4, 3.2], sway: 0.18 });
  group.add(sift, motes);

  // --- sauce: the spread layer, the puddle, the stream and the ladle
  const sauceMap = sauceTexture(), sauceNormal = heightToNormal(sauceTexture.canvas, 1.6);
  const sauceMat = enhance(new THREE.MeshPhysicalMaterial({ map: sauceMap, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.22, normalMap: sauceNormal, normalScale: new THREE.Vector2(0.38, 0.38) }), 'sauce', { reveal: 'swirl', noise: noiseTexture(53) });
  const sauce = new THREE.Mesh(new THREE.CircleGeometry(1.25, 128), sauceMat);
  sauce.rotation.x = -Math.PI / 2; sauce.position.y = SAUCE_Y; sauce.receiveShadow = true;
  layers.sauce.add(sauce);
  const wetMat = new THREE.MeshPhysicalMaterial({ map: sauceMap, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06, normalMap: sauceNormal, normalScale: new THREE.Vector2(0.3, 0.3) });
  const domeGeo = new THREE.RingGeometry(0.0001, 1, 72, 14);
  { const p = domeGeo.attributes.position; for (let i = 0; i < p.count; i++) { const rr = Math.min(1, Math.hypot(p.getX(i), p.getY(i))); p.setZ(i, Math.pow(1 - rr * rr, 1.6)); } domeGeo.computeVertexNormals(); }
  const puddle = new THREE.Mesh(domeGeo, wetMat);
  puddle.rotation.x = -Math.PI / 2; puddle.position.y = SAUCE_Y + 0.001; puddle.castShadow = false; puddle.receiveShadow = true;
  layers.sauce.add(puddle);
  const streamTex = sauceMap.clone(); streamTex.needsUpdate = true; streamTex.wrapS = streamTex.wrapT = THREE.RepeatWrapping; streamTex.repeat.set(0.3, 1.8);
  const streamU = { uYb: { value: 0 }, uYt: { value: 1 }, uR0: { value: 0.035 }, uR1: { value: 0.055 }, uTime: { value: 0 }, uWob: { value: 0.09 } };
  const streamMat = new THREE.MeshPhysicalMaterial({ map: streamTex, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
  streamMat.customProgramCacheKey = () => 'stream';
  streamMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, streamU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uYb; uniform float uYt; uniform float uR0; uniform float uR1; uniform float uTime; uniform float uWob;')
      .replace('#include <begin_vertex>', 'float vv = position.y; float rad = mix(uR0, uR1, vv) * (1.0 + uWob * sin(vv * 23.0 - uTime * 11.0)); vec3 transformed = vec3(position.x * rad, mix(uYb, uYt, vv), position.z * rad);');
  };
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 22, 48, true).translate(0, 0.5, 0), streamMat);
  stream.frustumCulled = false; stream.castShadow = true;
  const bead = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), wetMat); bead.castShadow = true;
  layers.sauce.add(stream, bead);
  const steel = new THREE.MeshStandardMaterial({ color: '#dcdcd6', metalness: 1, roughness: 0.2, envMapIntensity: 3.4, side: THREE.DoubleSide });
  const LADLE = [[0, 0], [0.1, 0.004], [0.17, 0.025], [0.215, 0.06], [0.24, 0.11], [0.248, 0.155], [0.238, 0.16], [0.226, 0.112], [0.203, 0.068], [0.16, 0.036], [0.095, 0.017], [0, 0.013]].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(LADLE, 56), steel);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(0.24, 0.15, 0), v3(0.42, 0.36, 0), v3(0.95, 0.92, 0), v3(1.8, 1.72, 0)]), 48, 0.021, 10), steel);
  const content = new THREE.Mesh(new THREE.CircleGeometry(0.228, 40), wetMat);
  content.rotation.x = -Math.PI / 2; content.position.y = 0.14;
  [bowl, handle].forEach((m) => { m.castShadow = true; });
  const tilt = new THREE.Group(); tilt.add(bowl, handle, content);
  const LADLE_YAW = 0.62;
  const ladle = new THREE.Group(); ladle.add(tilt); ladle.rotation.y = LADLE_YAW; layers.sauce.add(ladle);
  const LIP = v3(-0.248, 0.157, 0), Z = v3(0, 0, 1), Y = v3(0, 1, 0), tmp = v3(0, 0, 0), lipAt = v3(0, 0, 0);
  function ladlePour(alpha, target) { tmp.copy(LIP).applyAxisAngle(Z, alpha).applyAxisAngle(Y, LADLE_YAW); tilt.rotation.z = alpha; ladle.position.copy(target).sub(tmp); }
  function spiralAt(theta, out) { const rs = Math.min(1.2, SAUCE_R0 + SAUCE_B * theta); return out.set(rs * Math.cos(theta), SAUCE_Y + 0.004, rs * Math.sin(theta)); }
  // where the ladle stands once it has finished pouring and tilted back (lip still over the middle)
  const pourEnd = v3(0, 1.02, 0).sub(LIP.clone().applyAxisAngle(Y, LADLE_YAW)), spot3 = v3(0, 0, 0);

  function applySauce(u, time) {
    const show = u > 0;
    ladle.visible = show && u < 1; stream.visible = false; bead.visible = false;
    layers.sauce.visible = show;
    if (!show) { info.focus.length = 0; return; }
    const LIP_Y = 1.02, surface = SAUCE_Y + 0.004;
    // the puddle: grows while the sauce pours, then flattens as the ladle drags it outwards
    const grow = easeOut(span(u, 0.2, 0.4)), flatten = span(u, 0.5, 0.78);
    const domeR = lerp(0.04, 0.42, grow) + 0.05 * flatten, domeH = 0.058 * Math.sqrt(span(u, 0.19, 0.3)) * Math.pow(1 - flatten, 1.4);
    puddle.visible = u > 0.19 && domeH > 0.0015;
    puddle.scale.set(domeR, domeR, Math.max(domeH, 0.0001));
    const pool = SAUCE_Y + 0.001 + domeH;
    // the spread layer follows the back of the ladle
    const theta = SAUCE_THETA * easeInOut(span(u, 0.5, 0.92));
    sauce.visible = u > 0.42;
    sauceMat.userData.u.uTheta.value = theta; sauceMat.userData.u.uCR.value = domeR * 0.92; sauceMat.userData.u.uFill.value = span(u, 0.96, 1);
    // the ladle: comes down full, tips, pours, rights itself, spreads, leaves
    content.visible = u < 0.3;
    content.scale.setScalar(lerp(1, 0.6, span(u, 0.16, 0.3))); content.position.y = lerp(0.14, 0.09, span(u, 0.16, 0.3));
    if (u < 0.42) {
      const descend = easeOut(span(u, 0, 0.12));
      const alpha = lerp(0.12, 1.08, easeInOut(span(u, 0.12, 0.2))) * (1 - easeInOut(span(u, 0.36, 0.42)));
      lipAt.set(0, lerp(3.4, LIP_Y, descend), 0);
      ladlePour(alpha, lipAt);
      // the stream: a leading bead falls (accelerating), then a continuous rope that thins and lets go
      const front = span(u, 0.15, 0.21), tail = span(u, 0.355, 0.42);
      if (front > 0 && tail < 1) {
        const yb = lerp(LIP_Y, pool, easeIn(front)), yt = lerp(LIP_Y, pool, easeIn(tail));
        stream.visible = yt - yb > 0.01;
        streamU.uYb.value = yb; streamU.uYt.value = yt; streamU.uTime.value = time;
        streamU.uR1.value = 0.056 * (1 - tail * 0.6); streamU.uR0.value = 0.036 * (1 - tail * 0.3);
        streamTex.offset.y = -time * 1.6;
        if (front < 1) { bead.visible = true; bead.position.set(0, yb, 0); bead.scale.set(0.05, 0.065, 0.05); }
      }
    } else {
      // from the pour pose down onto the puddle, then along the spiral, then up and away
      const settle = easeInOut(span(u, 0.42, 0.5));
      spiralAt(theta, spot3);
      const lift = easeIn(span(u, 0.92, 1));
      tilt.rotation.z = 0.06 * Math.sin(theta * 0.5) * (1 - lift);
      ladle.position.set(lerp(pourEnd.x, spot3.x, settle), lerp(pourEnd.y, spot3.y, settle) + lift * 3.2, lerp(pourEnd.z, spot3.z, settle));
    }
    info.focus.length = 0;
    if (ladle.visible) info.focus.push(ladle.position.clone(), v3(0, LIP_Y + 0.3, 0));
  }

  // --- cheese: shreds rain from a moving hand; the layer under them appears exactly where they land
  const shN = Math.round(340 * quality), shr = rng(19);
  const shGeo = new THREE.BoxGeometry(0.1, 0.009, 0.02, 8, 1, 2);
  { const p = shGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, p.getY(i) - x * x * 4); p.setZ(i, p.getZ(i) + Math.sin(x * 40) * 0.003); } shGeo.computeVertexNormals(); }
  const shreds = new THREE.InstancedMesh(shGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.62 }), shN);
  shreds.frustumCulled = false; shreds.castShadow = true;
  const col = new THREE.Color();
  const shData = Array.from({ length: shN }, (_, i) => {
    const a = shr() * TAU, d = Math.sqrt(shr()) * 1.18, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const pass = shr() < 0.5 ? 0 : 1, phi = ((a % TAU) + TAU) % TAU / TAU;
    const tl = 0.1 + 0.78 * ((pass + phi) / 2) + (shr() - 0.5) * 0.05, fd = 0.15 + shr() * 0.06;
    const y0 = 2.3 + shr() * 1.1, sx = x * 0.55 + (shr() - 0.5) * 0.3, sz = z * 0.55 + (shr() - 0.5) * 0.3;
    col.setRGB(1, lerp(0.97, 0.92, shr()), lerp(0.9, 0.78, shr())); shreds.setColorAt(i, col);
    return { x, z, tl, fd, y0, sx, sz, yl: 0.113 + shr() * 0.012, rx: (shr() - 0.5) * 6, ry: shr() * TAU, rz: (shr() - 0.5) * 6, spin: 2 + shr() * 5, len: 0.7 + shr() * 0.8, hop: 0.015 + shr() * 0.035, fz: (shr() - 0.5) * 0.3 };
  });
  group.add(shreds);
  const [rvc, rvg] = canvas(512); rvg.fillStyle = 'rgb(246,246,246)'; rvg.fillRect(0, 0, 512, 512);
  rvg.globalCompositeOperation = 'darken';
  shData.forEach((s) => { const v = Math.round(clamp(s.tl + 0.02) * 255); rvg.fillStyle = `rgb(${v},${v},${v})`; rvg.beginPath(); rvg.arc((s.x / 2.6 + 0.5) * 512, (s.z / 2.6 + 0.5) * 512, 26 + (s.len - 0.7) * 10, 0, 7); rvg.fill(); });
  const ch = cheeseTextures();
  const cheeseMat = enhance(new THREE.MeshPhysicalMaterial({ map: ch.raw, transparent: true, alphaTest: 0.04, roughness: 0.7, clearcoat: 0, clearcoatRoughness: 0.3, normalMap: ch.normal, normalScale: new THREE.Vector2(0.3, 0.3), displacementMap: ch.height, displacementScale: 0.005, sheen: 0, sheenRoughness: 0.55, sheenColor: new THREE.Color('#ffc75a') }), 'cheese', { baked: ch.baked, reveal: 'blot', revealMap: tex(rvc, false) });
  const cheese = new THREE.Mesh(new THREE.RingGeometry(0.0001, 1.3, 220, quality > 0.7 ? 110 : 60), cheeseMat);
  cheese.rotation.x = -Math.PI / 2; cheese.position.y = 0.108; cheese.receiveShadow = true;
  layers.cheese.add(cheese);
  function applyCheese(u) {
    layers.cheese.visible = u > 0; cheeseMat.userData.u.uProgress.value = u;
    shreds.visible = u > 0 && u < 1;
    if (!shreds.visible) return;
    const sink = span(u, 0.9, 1);
    shData.forEach((s, i) => {
      const f = (u - (s.tl - s.fd)) / s.fd;
      if (f <= 0) { dummy.position.set(0, -5, 0); dummy.scale.setScalar(0.0001); }
      else if (f < 1) {
        const e = easeIn(f), q = 1 - f;
        dummy.position.set(lerp(s.sx, s.x, f), lerp(s.y0, s.yl, e), lerp(s.sz, s.z, f));
        dummy.rotation.set(s.rx * q + Math.sin(f * s.spin) * 0.6 * q, s.ry + s.spin * q, s.rz * q + s.fz);
        dummy.scale.set(s.len, 1, 1);
      } else {
        const b = clamp((u - s.tl) / 0.04);
        dummy.position.set(s.x, s.yl + s.hop * Math.sin(Math.PI * b) * (1 - b) - sink * 0.006, s.z);
        dummy.rotation.set(0.25 * Math.sin(Math.PI * b) * (1 - b), s.ry, s.fz);
        dummy.scale.set(s.len, Math.max(0.05, 1 - sink), 1);
      }
      dummy.updateMatrix(); shreds.setMatrixAt(i, dummy.matrix);
    });
    shreds.instanceMatrix.needsUpdate = true;
  }

  // --- toppings, placed by hand: each one arcs in, turns over and slows down onto its spot
  function scatter(seed, n, minD, maxR) {
    const r = rng(seed), pts = []; let guard = 0;
    while (pts.length < n && guard++ < 6000) {
      const a = r() * TAU, d = Math.sqrt(r()) * maxR, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (pts.every((p) => Math.hypot(p.x - x, p.z - z) > minD)) pts.push({ x, z, a, rot: r() * TAU, tx: (r() - 0.5) * 0.12, tz: (r() - 0.5) * 0.12 });
    }
    const order = pts.map((p) => ({ p, k: ((p.a + 1.3) % TAU + TAU) % TAU + (Math.hypot(p.x, p.z) < 0.45 ? TAU : 0) })).sort((m, n2) => m.k - n2.k).map((o) => o.p);
    order.forEach((p, i) => {
      const d = Math.hypot(p.x, p.z) || 1, ox = d > 0.05 ? p.x / d : Math.cos(p.rot), oz = d > 0.05 ? p.z / d : Math.sin(p.rot), out = 0.9 + r() * 0.6;
      Object.assign(p, { t0: (i / order.length) * 0.72, dur: 0.28, sx: p.x + ox * out, sz: p.z + oz * out, sh: 0.9 + r() * 0.6, rx0: (r() - 0.5) * 5, rz0: (r() - 0.5) * 5, ry0: (r() - 0.5) * 4 });
    });
    return order;
  }
  function instanced(geo, mat, pts, y, flat, rotX = 0, mode = 'hand') {
    const m = new THREE.InstancedMesh(geo, mat, pts.length);
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.userData = { pts, y, flat, rotX, mode };
    layers.toppings.add(m); return m;
  }
  // calabresa: a shallow cupped slice, planar UVs
  const pepProf = [[0, 0.012], [0.06, 0.014], [0.11, 0.022], [0.145, 0.036], [0.163, 0.048], [0.172, 0.042], [0.166, 0.022], [0.13, 0.006], [0, 0]].map(([x, y]) => new THREE.Vector2(x, y));
  const pepGeo = new THREE.LatheGeometry(pepProf, 40);
  { const pos = pepGeo.attributes.position, uv = pepGeo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 0.36 + 0.5, pos.getZ(i) / 0.36 + 0.5); uv.needsUpdate = true; pepGeo.computeVertexNormals(); }
  const pep = pepperoniTextures();
  const pepMat = enhance(new THREE.MeshPhysicalMaterial({ map: pep.raw, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.25, side: THREE.DoubleSide }), 'pep', { baked: pep.baked });
  const calabresa = instanced(pepGeo, pepMat, scatter(71, 14, 0.36, 1.07), 0.118, false);
  const onion = instanced(new THREE.TorusGeometry(0.1, 0.013, 10, 48), new THREE.MeshPhysicalMaterial({ color: '#f0dbe9', roughness: 0.25, clearcoat: 0.6, transparent: true, opacity: 0.86 }), scatter(83, 10, 0.3, 1.05), 0.138, true, Math.PI / 2, 'drop');
  const olive = instanced(new THREE.TorusGeometry(0.046, 0.027, 14, 32), new THREE.MeshPhysicalMaterial({ color: '#121212', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 }), scatter(97, 10, 0.3, 1.04), 0.142, true, Math.PI / 2, 'drop');
  function placeHand(mesh, t) {
    const { pts, y, flat, rotX, mode } = mesh.userData;
    pts.forEach((p, i) => {
      const lt = clamp((t - p.t0) / p.dur);
      if (lt <= 0) { dummy.position.set(p.x, -5, p.z); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); return; }
      const q = 1 - lt;
      if (mode === 'hand') {
        const e = easeOut(lt), a = 1 - e;
        const cx = (p.sx + p.x) / 2, cz = (p.sz + p.z) / 2, cy = y + p.sh + 0.35;
        dummy.position.set(a * a * p.sx + 2 * a * e * cx + e * e * p.x, a * a * (y + p.sh) + 2 * a * e * cy + e * e * y, a * a * p.sz + 2 * a * e * cz + e * e * p.z);
        const r = 1 - easeOut(Math.min(1, lt * 1.15));
        dummy.rotation.set(p.tx + p.rx0 * r, p.rot + p.ry0 * r, p.tz + p.rz0 * r);
      } else {
        const e = easeOutBack(lt);
        dummy.position.set(lerp(p.x + (p.sx - p.x) * 0.18, p.x, Math.min(e, 1)), Math.max(y - 0.004, lerp(y + 0.75 + p.sh * 0.3, y, e)), lerp(p.z + (p.sz - p.z) * 0.18, p.z, Math.min(e, 1)));
        dummy.rotation.set((flat ? rotX : 0) + p.tx + q * p.rx0 * 0.7, p.rot + q * 2.5, p.tz + q * p.rz0 * 0.5);
      }
      dummy.scale.setScalar(1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  // --- herbs: oregano falls in a slow, scattered rain; basil leaves drift down like real leaves
  const orR = rng(101), orN = Math.round(380 * quality), orPos = new Float32Array(orN * 3);
  const orData = Array.from({ length: orN }, () => { const a = orR() * TAU, d = Math.sqrt(orR()) * 1.18; return { x: Math.cos(a) * d, z: Math.sin(a) * d, y0: 1.5 + orR() * 1.3, t0: orR() * 0.6, ph: orR() * TAU, sw: 0.03 + orR() * 0.05 }; });
  const orGeo = new THREE.BufferGeometry(); orGeo.setAttribute('position', new THREE.BufferAttribute(orPos, 3));
  const oregano = new THREE.Points(orGeo, new THREE.PointsMaterial({ color: '#4c5a24', size: 0.024, transparent: true, opacity: 1, depthWrite: false }));
  oregano.frustumCulled = false; layers.toppings.add(oregano);
  function applyOregano(t, bake) {
    oregano.visible = t > 0;
    if (!oregano.visible) return;
    const yl = lerp(0.125, 0.162, bake);
    orData.forEach((o, i) => {
      const lt = clamp((t - o.t0) / 0.4);
      if (lt <= 0) { orPos.set([o.x, -5, o.z], i * 3); return; }
      const e = 1 - Math.pow(1 - lt, 1.6), q = 1 - lt;
      orPos.set([o.x + Math.sin(lt * 9 + o.ph) * o.sw * q, lerp(o.y0, yl, e), o.z + Math.cos(lt * 7 + o.ph) * o.sw * q], i * 3);
    });
    orGeo.attributes.position.needsUpdate = true;
  }
  const leaf = new THREE.Shape(); leaf.moveTo(0, -0.12); leaf.bezierCurveTo(0.09, -0.06, 0.08, 0.07, 0, 0.13); leaf.bezierCurveTo(-0.08, 0.07, -0.09, -0.06, 0, -0.12);
  const leafGeo = new THREE.ShapeGeometry(leaf, 12);
  { const pos = leafGeo.attributes.position, uv = leafGeo.attributes.uv; for (let i = 0; i < pos.count; i++) { uv.setXY(i, pos.getX(i) / 0.2 + 0.5, pos.getY(i) / 0.26 + 0.5); pos.setZ(i, -Math.abs(pos.getX(i)) * 0.35); } leafGeo.computeVertexNormals(); }
  const basil = new THREE.InstancedMesh(leafGeo, new THREE.MeshPhysicalMaterial({ map: basilTexture(), roughness: 0.35, clearcoat: 0.5, side: THREE.DoubleSide }), 6);
  basil.castShadow = true; basil.frustumCulled = false; layers.toppings.add(basil);
  const bR = rng(113);
  const basilData = [[0.55, 0.3], [-0.45, 0.62], [-0.2, -0.6], [0.62, -0.42], [-0.78, -0.08], [0.08, 0.05]].map(([x, z], i) => ({ x, z, t0: i * 0.1, rot: bR() * TAU, ph: bR() * TAU, y0: 2.1 + bR() * 0.6, sway: 0.18 + bR() * 0.12 }));
  function applyBasil(t) {
    basil.visible = t > 0;
    if (!basil.visible) return;
    basilData.forEach((b, i) => {
      const lt = clamp((t - b.t0) / 0.5);
      if (lt <= 0) { dummy.position.set(0, -5, 0); dummy.scale.setScalar(0.0001); }
      else {
        const q = 1 - lt, e = 1 - Math.pow(q, 1.7), w = Math.sin(lt * 8.5 + b.ph);
        dummy.position.set(b.x + w * b.sway * q, lerp(b.y0, 0.162, e), b.z + Math.cos(lt * 6 + b.ph) * b.sway * 0.5 * q);
        dummy.rotation.set(-Math.PI / 2 + w * 0.75 * q, b.rot + q * 3.2, Math.cos(lt * 8.5 + b.ph) * 0.5 * q);
        dummy.scale.setScalar(1.15);
      }
      dummy.updateMatrix(); basil.setMatrixAt(i, dummy.matrix);
    });
    basil.instanceMatrix.needsUpdate = true;
  }

  // --- steam once it is out of the oven
  const steamTex = softTexture('rgba(255,255,255,0.6)', 'rgba(255,255,255,0)'), stR = rng(29);
  const steam = Array.from({ length: 18 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false }));
    s.userData = { x: (stR() - 0.5) * 1.9, z: (stR() - 0.5) * 1.9, off: stR(), speed: 0.22 + stR() * 0.22, size: 0.9 + stR() * 1.1 };
    group.add(s); return s;
  });

  const state = { sift: 1, motes: 1, drop: 0, impact: 0, flat: 0, dust: 1, sauce: 0, cheese: 0, calabresa: 0, onion: 0, olive: 0, oregano: 0, bake: 0, basil: 0, steam: 0 };

  function apply(s, time = 0) {
    Object.assign(state, s);
    // flour in the air before and after
    sift.visible = state.sift > 0.002; sift.material.uniforms.uTime.value = time; sift.material.uniforms.uFade.value = state.sift;
    motes.visible = state.motes > 0.002; motes.material.uniforms.uTime.value = time; motes.material.uniforms.uFade.value = state.motes * 0.55;
    // the dough
    const it = state.impact * IMPACT_SECONDS, flat = easeInOut(state.flat);
    dough.visible = state.drop > 0 && flat < 0.999;
    if (dough.visible) placeDough(state.drop, it, flat); else info.doughY = -1;
    layers.base.visible = flat >= 0.999;
    // the burst and what it leaves on the bench
    burst.visible = it > 0 && state.dust > 0.002;
    burst.material.uniforms.uT.value = it; burst.material.uniforms.uFade.value = state.dust;
    puffs.forEach((sp) => {
      const u = sp.userData, show = it > 0 && it < 3;
      sp.visible = show; if (!show) return;
      const r = 0.45 + u.v * (1 - Math.exp(-2.2 * it)) / 2.2;
      sp.position.set(Math.cos(u.a) * r, 0.06 + u.y + 0.13 * (1 - Math.exp(-2.5 * it)), Math.sin(u.a) * r);
      sp.scale.set(0.5 + 1.5 * (1 - Math.exp(-1.6 * it)) * u.g, (0.3 + 0.7 * (1 - Math.exp(-1.6 * it))) * u.g, 1);
      sp.material.opacity = 0.13 * smooth(it / 0.05) * Math.exp(-1.1 * it) * state.dust;
    });
    decalU.uFront.value = 0.41 * (1 - Math.exp(-2.4 * it)); decalU.uBlast.value = 0.85 * clamp(it / 0.06);
    // sauce, cheese, toppings, herbs
    applySauce(state.sauce, time);
    applyCheese(state.cheese);
    placeHand(calabresa, state.calabresa); placeHand(onion, state.onion); placeHand(olive, state.olive);
    applyOregano(state.oregano, state.bake); applyBasil(state.basil);
    // the oven: everything turns golden, the cheese melts and shines, the slices cup up
    const b = state.bake;
    [crustMat, topMat, cheeseMat, pepMat].forEach((m) => { m.userData.u.uBake.value = b; });
    cheeseMat.roughness = lerp(0.72, 0.4, b); cheeseMat.clearcoat = lerp(0, 0.4, b); cheeseMat.sheen = lerp(0, 0.7, b);
    cheeseMat.displacementScale = lerp(0.005, 0.045, b); cheeseMat.normalScale.setScalar(lerp(0.3, 1.25, b));
    pepMat.roughness = lerp(0.5, 0.42, b); pepMat.clearcoat = lerp(0.2, 0.32, b);
    calabresa.scale.y = lerp(1, 1.5, b);
    steam.forEach((sp) => {
      const u = sp.userData, ph = (time * u.speed + u.off) % 1;
      sp.position.set(u.x + Math.sin(ph * 6 + u.off * 9) * 0.14, 0.25 + ph * 1.2, u.z);
      sp.scale.setScalar(u.size * (0.45 + ph * 0.7)); sp.material.opacity = state.steam * Math.sin(ph * Math.PI) * 0.2; sp.visible = state.steam > 0.01;
    });
    // what the lens should keep sharp besides the pizza
    if (dough.visible && info.doughY > 0.7) info.focus.push(v3(0, info.doughY + DOUGH_R, 0), v3(0, Math.max(0, info.doughY - DOUGH_R), 0));
  }
  const smooth = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };

  function setPointScale(px) {
    burst.material.uniforms.uSize.value = 0.0062 * px;
    sift.material.uniforms.uSize.value = 0.0062 * px;
    motes.material.uniforms.uSize.value = 0.0062 * px;
  }

  // polished steel needs its own reflections (the scene's are kept dim for the food)
  function setEnv(env) { steel.envMap = env; steel.envMapIntensity = 1.5; steel.needsUpdate = true; }

  return { group, apply, state, info, setPointScale, setEnv };
}

// ---------- post-processing in GLSL: macro-lens focus + glow on the highlights ----------
const QUAD_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BLUR_FRAG = `
  uniform sampler2D tMap; uniform vec2 uDir; uniform float uThreshold; varying vec2 vUv;
  vec4 pick(vec2 uv) {
    vec4 c = texture2D(tMap, uv);
    if (uThreshold > 0.0) { float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); c *= smoothstep(uThreshold, uThreshold * 1.8, l); }
    return c;
  }
  void main() {
    vec4 s = pick(vUv) * 0.227027;
    s += (pick(vUv + uDir * 1.3846) + pick(vUv - uDir * 1.3846)) * 0.316216;
    s += (pick(vUv + uDir * 3.2308) + pick(vUv - uDir * 3.2308)) * 0.070270;
    gl_FragColor = s;
  }`;
const COMPOSITE_FRAG = `
  uniform sampler2D tScene; uniform sampler2D tBlur; uniform sampler2D tBloom;
  uniform vec2 uFocus; uniform vec2 uRadius; uniform float uDof; uniform float uBloom; uniform float uWarm;
  varying vec2 vUv;
  void main() {
    vec4 sharp = texture2D(tScene, vUv);
    vec4 soft = texture2D(tBlur, vUv);
    float coc = smoothstep(0.95, 1.75, length((vUv - uFocus) / uRadius)) * uDof;
    vec4 col = mix(sharp, soft, coc);
    vec3 glow = texture2D(tBloom, vUv).rgb * uBloom;
    col.rgb += glow;
    col.a = max(col.a, clamp(dot(glow, vec3(0.333)), 0.0, 1.0));
    col.rgb *= mix(vec3(1.0), vec3(1.05, 1.0, 0.92), uWarm);
    gl_FragColor = col;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function createPost(renderer) {
  const opts = { type: THREE.HalfFloatType, depthBuffer: false };
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const halfA = new THREE.WebGLRenderTarget(1, 1, opts), halfB = new THREE.WebGLRenderTarget(1, 1, opts);
  const quarterA = new THREE.WebGLRenderTarget(1, 1, opts), quarterB = new THREE.WebGLRenderTarget(1, 1, opts);
  const blur = new THREE.ShaderMaterial({ uniforms: { tMap: { value: null }, uDir: { value: new THREE.Vector2() }, uThreshold: { value: 0 } }, vertexShader: QUAD_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.NoBlending });
  const composite = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: sceneRT.texture }, tBlur: { value: halfB.texture }, tBloom: { value: quarterB.texture }, uFocus: { value: new THREE.Vector2(0.5, 0.5) }, uRadius: { value: new THREE.Vector2(0.3, 0.3) }, uDof: { value: 1 }, uBloom: { value: 0.14 }, uWarm: { value: 1 } },
    vertexShader: QUAD_VERT, fragmentShader: COMPOSITE_FRAG, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blur);
  quad.frustumCulled = false;
  const qScene = new THREE.Scene(); qScene.add(quad);
  const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const px = new THREE.Vector2();

  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(qScene, qCam); }
  function blurInto(src, a, b, w, h, spread, threshold = 0) {
    blur.uniforms.uThreshold.value = threshold;
    blur.uniforms.tMap.value = src; blur.uniforms.uDir.value.set(spread / w, 0); pass(blur, a);
    blur.uniforms.uThreshold.value = 0;
    blur.uniforms.tMap.value = a.texture; blur.uniforms.uDir.value.set(0, spread / h); pass(blur, b);
    blur.uniforms.tMap.value = b.texture; blur.uniforms.uDir.value.set(spread * 2 / w, 0); pass(blur, a);
    blur.uniforms.tMap.value = a.texture; blur.uniforms.uDir.value.set(0, spread * 2 / h); pass(blur, b);
  }
  return {
    composite,
    setSize(w, h, dpr) {
      const W = Math.round(w * dpr), H = Math.round(h * dpr);
      sceneRT.setSize(W, H);
      halfA.setSize(W >> 1, H >> 1); halfB.setSize(W >> 1, H >> 1);
      quarterA.setSize(W >> 2, H >> 2); quarterB.setSize(W >> 2, H >> 2);
      px.set(W, H);
    },
    render(scene, camera) {
      renderer.setRenderTarget(sceneRT); renderer.render(scene, camera);
      blurInto(sceneRT.texture, halfA, halfB, px.x / 2, px.y / 2, 1.6);
      blurInto(sceneRT.texture, quarterA, quarterB, px.x / 4, px.y / 4, 1.6, 0.95);
      pass(composite, null);
    },
  };
}

// ---------- a stage: renderer + scene + warm side light + the bench ----------
export function createStage(canvas, { quality = 1 } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (err) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality > 0.7 ? 1.75 : 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const post = quality > 0.7 && renderer.capabilities.isWebGL2 ? createPost(renderer) : null;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  scene.add(new THREE.HemisphereLight(0xffeccc, 0x0a0805, 0.16));
  // warm light from the side, low, so it rakes across the flour and the dough
  const key = new THREE.SpotLight(0xffcf94, 180, 0, 0.5, 0.75, 2);
  key.position.set(6.2, 3.4, 1.8); key.castShadow = true; key.shadow.mapSize.set(quality > 0.7 ? 2048 : 1024, quality > 0.7 ? 2048 : 1024);
  key.shadow.camera.near = 2; key.shadow.camera.far = 20;
  key.shadow.radius = 5; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key); scene.add(key.target);
  const sky = new THREE.DirectionalLight(0xffe2b8, 0.5); sky.position.set(1.5, 8, 2); scene.add(sky);
  const fill = new THREE.DirectionalLight(0xffd7a8, 0.28); fill.position.set(-5, 2.6, 3.2); scene.add(fill);
  const spec = new THREE.PointLight(0xfff1d6, 2.0, 10, 1.6); spec.position.set(-1.4, 3.4, 2.8); scene.add(spec);
  // the brand's yellow, as a glow on the bench behind the pizza
  const rim = new THREE.SpotLight(YELLOW, 14, 16, 0.6, 0.7, 1.4); rim.position.set(-3.8, 2.6, -4.6); rim.target.position.set(0.4, -0.6, -1.6); scene.add(rim); scene.add(rim.target);
  const oven = new THREE.PointLight(0xff7a1a, 0, 9, 1.6); oven.position.set(0, 0.6, 2.2); scene.add(oven);

  const bt = benchTextures();
  const bench = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshStandardMaterial({ map: bt.map, alphaMap: bt.alpha, transparent: true, roughness: 0.8 }));
  bench.rotation.x = -Math.PI / 2; bench.position.y = -0.001; bench.receiveShadow = true; bench.renderOrder = -3;
  scene.add(bench);

  const pizza = createPizza(quality);
  pizza.setEnv(scene.environment);
  scene.add(pizza.group);

  const view = { radius: 7, elev: 0.4, az: 0, lookY: 0.4, offsetX: 0, offsetY: 0, shakeX: 0, shakeY: 0, fov: 30 };
  let w = 1, h = 1;
  function resize() {
    const r = canvas.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    post?.setSize(w, h, renderer.getPixelRatio());
    pizza.setPointScale((h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)));
  }
  function placeCamera() {
    const { radius, elev, az, lookY, shakeX, shakeY } = view;
    if (Math.abs(camera.fov - view.fov) > 0.001) { camera.fov = view.fov; camera.updateProjectionMatrix(); }
    camera.position.set(Math.sin(az) * Math.cos(elev) * radius + shakeX, Math.sin(elev) * radius + lookY + shakeY, Math.cos(az) * Math.cos(elev) * radius);
    camera.lookAt(shakeX * 0.4, lookY + shakeY * 0.4, 0);
    if (view.offsetX || view.offsetY) camera.setViewOffset(w, h, -view.offsetX * w, view.offsetY * h, w, h); else camera.clearViewOffset();
  }
  // keep the pizza, and whatever is falling onto it, inside the sharp zone
  const fv = new THREE.Vector3();
  function focus() {
    camera.updateMatrixWorld(); pizza.group.updateMatrixWorld(true);
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
    const add = (u, v) => { x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); };
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      for (const y of [0.05, 0.3]) { fv.set(Math.cos(a) * 1.6, y, Math.sin(a) * 1.6); pizza.group.localToWorld(fv); fv.project(camera); add(fv.x * 0.5 + 0.5, fv.y * 0.5 + 0.5); }
    }
    for (const p of pizza.info.focus) { fv.copy(p); pizza.group.localToWorld(fv); fv.project(camera); add(clamp(fv.x * 0.5 + 0.5, -0.2, 1.2), clamp(fv.y * 0.5 + 0.5, -0.2, 1.2)); }
    post.composite.uniforms.uFocus.value.set((x0 + x1) / 2, (y0 + y1) / 2);
    post.composite.uniforms.uRadius.value.set(Math.max(0.05, (x1 - x0) / 2) * 1.12, Math.max(0.05, (y1 - y0) / 2) * 1.12);
  }
  function render() {
    placeCamera();
    if (post) { focus(); post.render(scene, camera); } else renderer.render(scene, camera);
  }
  return { THREE, renderer, scene, camera, pizza, view, oven, key, resize, render, size: () => ({ w, h }) };
}

export { clamp, span, lerp, easeOut, easeInOut };
