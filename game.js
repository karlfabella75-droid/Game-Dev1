// JavaScript: game logic, drawing, shop, power-ups and input for Quiz Dash.
// Reads the question list (QS) from questions.js.
(() => {
'use strict';
const CW = 360, CH = 480, HOR = 140, GROUND = 400, LANEW = 96, ZMAX = 140, K = 0.06;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const hcv = document.getElementById('heroCv'), hctx = hcv.getContext('2d');
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sOf = z => 1 / (1 + z * K);
const yOf = s => HOR + (GROUND - HOR) * s;
const xOf = (lane, s) => CW / 2 + (lane - 1) * LANEW * s;
const LCOL = ['#3fd0c0', '#f2c14e', '#b79cff'], LET = ['A', 'B', 'C'];
const MAPS = [
  { name: 'Neon City', scene: 'city', sky: ['#150d38', '#5a2a6e', '#ff8a4d'], sun: '#ffb35a', horizon: '#1b1033', ground: '#0f0b1f', road: '#2a2442', edge: '#6f63a8', stripe: 'rgba(241,236,255,.55)' },
  { name: 'Deep Forest', scene: 'forest', sky: ['#102b38', '#24634d', '#91b76c'], sun: '#e8e89b', horizon: '#183d32', ground: '#152c26', road: '#234036', edge: '#7aac63', stripe: 'rgba(218,245,177,.6)' },
  { name: 'Golden Dunes', scene: 'desert', sky: ['#271844', '#a6534b', '#f4ba67'], sun: '#fff2bd', horizon: '#633c46', ground: '#473027', road: '#61402d', edge: '#d58a48', stripe: 'rgba(255,230,177,.65)' },
  { name: 'Frost Ridge', scene: 'winter', sky: ['#0b1d3c', '#3c6b92', '#c9e6ef'], sun: '#effaff', horizon: '#213b58', ground: '#1c344d', road: '#334f68', edge: '#8bb9cf', stripe: 'rgba(235,249,255,.7)' }
];

/* ---------- characters and power-ups ---------- */
const CHARS = [
  { id: 'rex', name: 'Rex', price: 0, perk: 'No special perk. A reliable runner.',
    pal: { style: 'cap', hair: '#4a2f1e', hat: '#ff7a3d', hatDark: '#c75a1f', skin: '#f0c9a0', shirt: '#3fd0c0', shirt2: '#2a9c90', vest: '#e0732f', pants: '#2b2f5c' } },
  { id: 'mika', name: 'Mika', price: 120, coin: 2, perk: 'Lucky: every coin you grab is worth 2.',
    pal: { style: 'beanie', hair: '#2a1a3a', hat: '#7a4bd6', hatDark: '#5430a6', skin: '#d9a27a', shirt: '#ff7ab8', shirt2: '#d4558f', vest: '#fff0f6', pants: '#3a2a66' } },
  { id: 'sage', name: 'Sage', price: 260, quiz: 1.5, perk: 'Scholar: right answers score 50% more.',
    pal: { style: 'glasses', hair: '#1b1330', hat: '#1b1330', hatDark: '#1b1330', skin: '#f0c9a0', shirt: '#6aa0ff', shirt2: '#4a78d0', vest: '#f2c14e', pants: '#23305f' } },
  { id: 'bolt', name: 'Bolt', price: 420, shield: true, perk: 'Armored: every run starts with a shield.',
    pal: { style: 'helmet', hair: '#1b1330', hat: '#ff5d73', hatDark: '#b23a4c', skin: '#8a5a3c', shirt: '#f2c14e', shirt2: '#c9962a', vest: '#1b1330', pants: '#1b1330' } },
  { id: 'nova', name: 'Nova', price: 650, lives: 4, perk: 'Royal: you start with four lives, not three.',
    pal: { style: 'crown', hair: '#e8e0ff', hat: '#f2c14e', hatDark: '#c9962a', skin: '#f0c9a0', shirt: '#b79cff', shirt2: '#8a68e0', vest: '#3fd0c0', pants: '#1f1a3d' } }
];
const PU = {
  magnet: { name: 'Magnet', chip: 'Magnet', color: '#ff5d73', dur: 9, desc: 'Pulls coins toward you for 9 seconds.' },
  shield: { name: 'Shield', chip: 'Shield', color: '#3fd0c0', desc: 'Absorbs your next crash or wrong answer.' },
  x2: { name: 'Double score', chip: '2x score', color: '#f2c14e', dur: 10, desc: 'Every point counts twice for 10 seconds.' },
  slow: { name: 'Slow-mo', chip: 'Slow-mo', color: '#5aa8ff', dur: 7, desc: 'The world slows down for 7 seconds.' },
  clue: { name: 'Clue', chip: 'Clue ready', color: '#b79cff', desc: 'Crosses out one wrong answer at the next quiz gate.' }
};
const PUTYPES = Object.keys(PU);

/* ---------- save ---------- */
const SAVE_KEY = 'quizdash-save';
function loadSave() {
  let s = null; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { /* ignore */ }
  if (!s || typeof s !== 'object') s = {};
  let best = 0; try { const o = JSON.parse(localStorage.getItem('quizdash-best') || 'null'); if (o && o.score) best = o.score; } catch (e) { /* ignore */ }
  const owned = Array.isArray(s.owned) ? s.owned.filter(id => CHARS.some(c => c.id === id)) : [];
  if (!owned.includes('rex')) owned.unshift('rex');
  return { coins: s.coins | 0, owned, sel: owned.includes(s.sel) ? s.sel : 'rex', best: Math.max(s.best | 0, best) };
}
let SAVE = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* ignore */ } }
const curChar = () => CHARS.find(c => c.id === SAVE.sel) || CHARS[0];

/* ---------- drawing helpers shared by game and menus ---------- */
function drawChar(g, pal, r, sliding) {
  if (sliding) {
    g.fillStyle = pal.pants; g.fillRect(-32, -14, 20, 9);
    g.fillStyle = pal.shirt2; g.fillRect(-14, -28, 30, 19);
    g.fillStyle = pal.shirt; g.fillRect(-10, -26, 24, 12);
    g.fillStyle = pal.hair; g.beginPath(); g.arc(21, -20, 8.5, 0, 7); g.fill();
    g.fillStyle = pal.hat; g.beginPath(); g.arc(21, -22, 8.8, Math.PI, 0); g.fill();
    return;
  }
  g.fillStyle = pal.pants; g.fillRect(-9 + r * 4, -22, 8, 20); g.fillRect(1 - r * 4, -22, 8, 20);
  g.fillStyle = '#f1ecff'; g.fillRect(-10 + r * 4, -4, 10, 4); g.fillRect(0 - r * 4, -4, 10, 4);
  g.fillStyle = pal.shirt; g.fillRect(-12, -48, 24, 28);
  g.fillStyle = pal.shirt2; g.fillRect(-16, -44 + r * 3, 5, 20); g.fillRect(11, -44 - r * 3, 5, 20);
  g.fillStyle = pal.vest; g.fillRect(-9, -46, 18, 20);
  g.fillStyle = pal.skin; g.fillRect(-3, -53, 6, 6);
  g.fillStyle = pal.hair; g.beginPath(); g.arc(0, -58, 10, 0, 7); g.fill();
  g.fillStyle = pal.skin; g.fillRect(-10, -57, 2, 4); g.fillRect(8, -57, 2, 4);
  switch (pal.style) {
    case 'cap':
      g.fillStyle = pal.hat; g.beginPath(); g.arc(0, -58, 10.5, Math.PI, 0); g.fill();
      g.fillStyle = pal.hatDark; g.fillRect(-10.5, -59, 21, 3); break;
    case 'beanie':
      g.fillStyle = pal.hat; g.beginPath(); g.arc(0, -59, 10.8, Math.PI, 0); g.fill();
      g.fillStyle = pal.hatDark; g.fillRect(-10.8, -62, 21.6, 4); g.beginPath(); g.arc(0, -70, 3.6, 0, 7); g.fill(); break;
    case 'glasses':
      g.fillStyle = pal.hair; g.beginPath(); g.arc(0, -69, 4.5, 0, 7); g.fill();
      g.fillStyle = '#f1ecff'; g.fillRect(-11, -59, 3, 2); g.fillRect(8, -59, 3, 2); break;
    case 'helmet':
      g.fillStyle = pal.hat; g.beginPath(); g.arc(0, -58, 11.5, 0, 7); g.fill();
      g.fillStyle = pal.hatDark; g.fillRect(-2, -69, 4, 11); g.fillRect(-11.5, -52, 23, 3); break;
    case 'crown':
      g.fillStyle = pal.hat; g.beginPath(); g.moveTo(-8, -65); g.lineTo(-8, -74); g.lineTo(-4, -69); g.lineTo(0, -75); g.lineTo(4, -69); g.lineTo(8, -74); g.lineTo(8, -65); g.closePath(); g.fill();
      g.fillStyle = '#ff5d73'; g.beginPath(); g.arc(0, -68, 1.7, 0, 7); g.fill(); break;
  }
}
function charCanvas(ch, w, h, sc) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.translate(w / 2, h - 8); g.scale(sc, sc);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 2, 16, 5, 0, 0, 7); g.fill();
  drawChar(g, ch.pal, 0.4, false); return c;
}
function drawOrb(g, x, y, r, type) {
  const c = PU[type].color, u = r;
  const gl = g.createRadialGradient(x, y, r * 0.3, x, y, r * 1.9); gl.addColorStop(0, c + '88'); gl.addColorStop(1, c + '00');
  g.fillStyle = gl; g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(1, r * 0.12); g.stroke();
  g.save(); g.translate(x, y); g.fillStyle = '#120f24'; g.strokeStyle = '#120f24';
  if (type === 'magnet') {
    g.lineWidth = u * 0.3; g.beginPath(); g.arc(0, u * 0.05, u * 0.42, 0, Math.PI);
    g.moveTo(u * 0.42, u * 0.05); g.lineTo(u * 0.42, -u * 0.5); g.moveTo(-u * 0.42, u * 0.05); g.lineTo(-u * 0.42, -u * 0.5); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(-u * 0.57, -u * 0.52, u * 0.3, u * 0.17); g.fillRect(u * 0.27, -u * 0.52, u * 0.3, u * 0.17);
  } else if (type === 'shield') {
    g.beginPath(); g.moveTo(-u * 0.5, -u * 0.5); g.lineTo(u * 0.5, -u * 0.5); g.lineTo(u * 0.5, u * 0.1);
    g.quadraticCurveTo(u * 0.5, u * 0.6, 0, u * 0.8); g.quadraticCurveTo(-u * 0.5, u * 0.6, -u * 0.5, u * 0.1); g.closePath(); g.fill();
  } else if (type === 'x2') {
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? u * 0.32 : u * 0.7; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
  } else if (type === 'slow') {
    g.lineWidth = u * 0.15; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, u * 0.58, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(0, -u * 0.38); g.lineTo(0, 0); g.lineTo(u * 0.28, u * 0.16); g.stroke();
  } else {
    g.beginPath(); g.arc(0, -u * 0.12, u * 0.42, 0, 7); g.fill();
    g.fillRect(-u * 0.2, u * 0.28, u * 0.4, u * 0.14); g.fillRect(-u * 0.14, u * 0.46, u * 0.28, u * 0.1);
  }
  g.restore();
}
const ICON = {};
function iconURL(t) {
  if (!ICON[t]) { const c = document.createElement('canvas'); c.width = c.height = 48; drawOrb(c.getContext('2d'), 24, 24, 17, t); ICON[t] = c.toDataURL(); }
  return ICON[t];
}
const COIN_SVG = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6.5" fill="#f2c14e"/><circle cx="6" cy="6" r="2.6" fill="#ffe28a"/></svg>';

/* ---------- run state ---------- */
let G = null, lastLives = '', chipSig = '', view = 'run';
const SKY = []; { let x = 0; while (x < CW) { const w = rnd(14, 38); SKY.push({ x, w, h: rnd(14, 60) }); x += w + rnd(0, 6); } }

function reset() {
  const ch = curChar(), lives = ch.lives || 3;
  G = { state: 'play', t: 0, dist: 0, speed: 22, score: 0, coins: 0, lives, maxLives: lives, streak: 0, bestStreak: 0, correct: 0, asked: 0, ch, result: null, map: pick(MAPS),
    p: { x: 1, lane: 1, jy: 0, vy: 0, slide: 0, inv: 0 }, obs: [], cn: [], pk: [], bld: [], gate: null, nextSpawn: 30, nextPU: 55, sinceGate: 0,
    shake: 0, flash: 0, fx: [], cardT: 0, pool: shuffle(QS.slice()), pc: 0, pu: { magnet: 0, x2: 0, slow: 0 }, shield: !!ch.shield, clue: false };
  for (let i = 0; i < 11; i++) for (const side of [-1, 1]) G.bld.push({ side, z: i * 14 + rnd(0, 6), w: rnd(60, 110), h: rnd(110, 280), hue: G.map.scene === 'forest' ? rnd(105, 145) : rnd(240, 300), id: rnd(0, 999) });
  lastLives = ''; chipSig = '\u0000';
  $('card').hidden = true; $('pause').hidden = true;
}
function nextQuestion() {
  if (G.pc >= G.pool.length) { G.pool = shuffle(QS.slice()); G.pc = 0; }
  return G.pool[G.pc++];
}
const addScore = n => { const v = n * (G.pu.x2 > 0 ? 2 : 1); G.score += v; return v; };

/* ---------- spawning ---------- */
const addObs = (t, lane, z) => G.obs.push({ t, lane, z, hit: false, hue: rnd(190, 330) });
const addCoins = (lane, z, n) => { for (let i = 0; i < n; i++) G.cn.push({ lane, z: z + i * 4, got: false }); };
function spawnPattern() {
  const z = ZMAX, early = G.t < 10, r = Math.random();
  if (early ? r < 0.5 : r < 0.3) {
    const lane = rnd(0, 2); addObs(pick(early ? ['barrier', 'overhead'] : ['barrier', 'overhead', 'block']), lane, z);
    addCoins((lane + rnd(1, 2)) % 3, z + 2, 4);
  } else if (!early && r < 0.5) {
    const gap = rnd(0, 2); for (let l = 0; l < 3; l++) if (l !== gap) addObs('block', l, z);
    addCoins(gap, z - 2, 6);
  } else if (!early && r < 0.65) {
    for (let l = 0; l < 3; l++) addObs('barrier', l, z);
    addCoins(1, z + 10, 4);
  } else if (!early && r < 0.8) {
    for (let l = 0; l < 3; l++) addObs('overhead', l, z);
    addCoins(1, z + 10, 4);
  } else addCoins(rnd(0, 2), z, 7);
  G.pk = G.pk.filter(k => !G.obs.some(o => o.lane === k.lane && Math.abs(o.z - k.z) < 8));
}
function spawnPU() {
  const lanes = [0, 1, 2].filter(l => !G.obs.some(o => o.lane === l && Math.abs(o.z - ZMAX) < 10) && !G.cn.some(c => Math.round(c.lane) === l && Math.abs(c.z - ZMAX) < 8));
  if (!lanes.length) { G.nextPU = G.dist + 15; return; }
  let t = pick(PUTYPES);
  if (t === 'shield' && G.shield) t = pick(['magnet', 'x2', 'slow', 'clue']);
  if (t === 'clue' && G.clue) t = pick(['magnet', 'x2', 'slow']);
  G.pk.push({ type: t, lane: pick(lanes), z: ZMAX, got: false });
}
function applyClue(gate) {
  if (gate.out >= 0) return;
  gate.out = pick([0, 1, 2].filter(i => i !== gate.correct));
  document.querySelectorAll('.opt')[gate.out].classList.add('out');
  pop(CW / 2, GROUND - 90, 'One wrong answer removed', PU.clue.color);
}
function spawnGate() {
  const q = nextQuestion(), opts = shuffle([{ t: q[2], ok: true }, { t: q[3], ok: false }, { t: q[4], ok: false }]);
  const gate = { z: ZMAX, cat: q[0], q: q[1], opts: opts.map(o => o.t), correct: opts.findIndex(o => o.ok), done: false, out: -1 };
  G.gate = gate; G.asked++;
  document.querySelectorAll('.opt').forEach((c, i) => { c.querySelector('span').textContent = gate.opts[i]; c.classList.remove('good', 'bad', 'out'); });
  $('cCat').textContent = gate.cat; $('cQ').textContent = gate.q; $('cRes').textContent = ''; $('cRes').className = 'res';
  const questionLength = gate.q.length;
  $('card').className = 'card' + (questionLength >= 55 ? ' long' : questionLength >= 38 ? ' medium' : '');
  $('card').hidden = false; G.cardT = 0;
  if (G.clue) { G.clue = false; applyClue(gate); }
}

/* ---------- effects ---------- */
function pop(x, y, text, color) { G.fx.push({ k: 't', x, y, vy: -40, life: 1, text, color }); }
function spark(x, y, color, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 40 + Math.random() * 100; G.fx.push({ k: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0.5 + Math.random() * 0.4, color }); } }

/* ---------- rules ---------- */
function applyPU(type) {
  const p = G.p, x = xOf(p.x, 1), c = PU[type].color;
  spark(x, GROUND - 40, c, 18); pop(x, GROUND - 80, PU[type].name, c);
  if (type === 'magnet' || type === 'x2' || type === 'slow') G.pu[type] = PU[type].dur;
  else if (type === 'shield') G.shield = true;
  else if (G.gate && !G.gate.done) applyClue(G.gate);
  else G.clue = true;
}
function hurt(force) {
  if (G.state !== 'play') return;
  const p = G.p;
  if (!force && p.inv > 0) return;
  if (G.shield) {
    G.shield = false; p.inv = 1.2; G.shake = 6;
    spark(xOf(p.x, 1), GROUND - 40, '#3fd0c0', 22); pop(xOf(p.x, 1), GROUND - 80, 'Shield broke', '#3fd0c0');
    return;
  }
  G.lives--; p.inv = 1.6; G.shake = 12; G.flash = 0.35;
  pop(xOf(p.x, 1), GROUND - 70, '-1 life', '#ff5d73'); spark(xOf(p.x, 1), GROUND - 30, '#ff5d73', 14);
  if (G.lives <= 0) endRun();
}
function resolveGate() {
  const g = G.gate, p = G.p, lane = Math.max(0, Math.min(2, Math.round(p.x)));
  g.done = true; G.sinceGate = 0;
  const cells = document.querySelectorAll('.opt'), res = $('cRes');
  $('card').classList.add('done'); cells[g.correct].classList.add('good');
  if (lane === g.correct) {
    G.streak++; G.correct++; G.bestStreak = Math.max(G.bestStreak, G.streak);
    const award = Math.round(addScore((100 + 25 * (G.streak - 1)) * (G.ch.quiz || 1))); G.coins += 10;
    res.textContent = 'Correct! +' + award + ' points, +10 coins'; res.className = 'res ok';
    pop(xOf(p.x, 1), GROUND - 80, '+' + award, '#5ee08a'); spark(xOf(p.x, 1), GROUND - 40, '#5ee08a', 24);
    addCoins(g.correct, 6, 8);
    if (G.streak % 5 === 0 && G.lives < G.maxLives) { G.lives++; res.textContent += ' · extra life!'; }
  } else {
    G.streak = 0; cells[lane].classList.add('bad');
    res.textContent = 'Not quite. The answer was ' + g.opts[g.correct] + '.'; res.className = 'res no';
    hurt(true);
  }
  G.cardT = 2.4;
}
function endRun() {
  if (G.state === 'over') return;
  G.state = 'over';
  const sc = Math.floor(G.score), isBest = sc > SAVE.best;
  if (isBest) SAVE.best = sc;
  SAVE.coins += G.coins; persist();
  G.result = { sc, isBest, coins: G.coins, correct: G.correct, asked: G.asked, streak: G.bestStreak };
  const mine = G;
  setTimeout(() => { if (G === mine) showMenu(); }, 800);
}

/* ---------- update ---------- */
function update(dt) {
  const g = G, p = g.p;
  g.t += dt;
  for (const k in g.pu) if (g.pu[k] > 0) g.pu[k] = Math.max(0, g.pu[k] - dt);
  const approaching = g.gate && !g.gate.done && g.gate.z > 30;
  g.speed = Math.min(36, 22 + g.t * 0.14);
  const v = g.speed * Math.min(approaching ? 0.55 : 1, g.pu.slow > 0 ? 0.6 : 1) * dt;
  g.dist += v; addScore(v * 0.12); g.sinceGate += dt;

  p.x += (p.lane - p.x) * Math.min(1, dt * 16);
  if (p.jy > 0 || p.vy > 0) { p.vy -= 900 * dt; p.jy += p.vy * dt; if (p.jy <= 0) { p.jy = 0; p.vy = 0; } }
  if (p.slide > 0) p.slide -= dt;
  if (p.inv > 0) p.inv -= dt;

  for (const o of g.obs) o.z -= v;
  for (const c of g.cn) c.z -= v;
  for (const k of g.pk) k.z -= v;
  for (const b of g.bld) { b.z -= v; if (b.z < -12) { b.z += 154; b.w = rnd(60, 110); b.h = rnd(110, 280); b.hue = rnd(240, 300); b.id = rnd(0, 999); } }
  if (g.gate) g.gate.z -= v;
  g.obs = g.obs.filter(o => o.z > -8);
  g.cn = g.cn.filter(c => c.z > -8 && !c.got);
  if (g.pu.magnet > 0) for (const c of g.cn) if (c.z < 45 && c.z > -3) c.lane += (p.x - c.lane) * Math.min(1, dt * 7);

  if (!g.gate) {
    if (g.sinceGate > (g.asked === 0 ? 9 : 17)) spawnGate();
    else if (g.dist >= g.nextSpawn) { spawnPattern(); g.nextSpawn = g.dist + Math.max(15, 24 - (g.speed - 30) * 0.25) + rnd(0, 8); }
    if (g.dist >= g.nextPU) { spawnPU(); g.nextPU = g.dist + rnd(80, 130); }
  }

  for (const o of g.obs) {
    if (o.hit || o.z > 2 || o.z < -2 || Math.abs(p.x - o.lane) > 0.55) continue;
    if (o.t === 'block' || (o.t === 'barrier' && p.jy < 26) || (o.t === 'overhead' && p.slide <= 0)) { o.hit = true; hurt(false); }
  }
  for (const c of g.cn) {
    if (!c.got && Math.abs(c.z) < 2 && Math.abs(p.x - c.lane) < 0.6) { c.got = true; g.coins += g.ch.coin || 1; addScore(5); spark(xOf(p.x, 1), GROUND - 30, '#f2c14e', 4); }
  }
  for (const k of g.pk) if (!k.got && Math.abs(k.z) < 2.5 && Math.abs(p.x - k.lane) < 0.6) { k.got = true; applyPU(k.type); }
  g.pk = g.pk.filter(k => k.z > -8 && !k.got);
  if (g.gate && !g.gate.done && g.gate.z <= 0.5) resolveGate();
  if (g.gate && g.gate.z < -10) { g.gate = null; g.nextSpawn = g.dist + 10; }
  if (g.cardT > 0) { g.cardT -= dt; if (g.cardT <= 0) $('card').hidden = true; }
}

/* ---------- drawing the run ---------- */
const fog = z => Math.max(0, Math.min(1, (ZMAX + 8 - z) / 30));
function quad(o, w, sA, sB) {
  const xa = CW / 2 + o * LANEW * sA, xb = CW / 2 + o * LANEW * sB, ya = yOf(sA), yb = yOf(sB);
  ctx.beginPath(); ctx.moveTo(xa - w * sA, ya); ctx.lineTo(xa + w * sA, ya); ctx.lineTo(xb + w * sB, yb); ctx.lineTo(xb - w * sB, yb); ctx.closePath(); ctx.fill();
}
function drawBld(b) {
  const s = sOf(b.z); if (s > 1.7) return;
  const cx = CW / 2 + b.side * (1.5 * LANEW + 14 + b.w / 2) * s, y = yOf(s), w = b.w * s, h = b.h * s;
  if (G.map.scene === 'forest') {
    ctx.fillStyle = '#4b3529'; ctx.fillRect(cx - 4 * s, y - h * 0.45, 8 * s, h * 0.45);
    ctx.fillStyle = 'hsl(' + b.hue + ',48%,22%)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(cx, y - h + i * h * 0.22); ctx.lineTo(cx - w * (0.48 - i * 0.08), y - h * 0.24 + i * h * 0.2); ctx.lineTo(cx + w * (0.48 - i * 0.08), y - h * 0.24 + i * h * 0.2); ctx.closePath(); ctx.fill();
    }
    return;
  }
  if (G.map.scene === 'desert') {
    const cw = Math.max(5 * s, 12 * s), ch = h * 0.62;
    ctx.fillStyle = '#52734a'; ctx.fillRect(cx - cw / 2, y - ch, cw, ch);
    ctx.fillRect(cx - cw * 1.25, y - ch * 0.6, cw * 0.45, ch * 0.32);
    ctx.fillRect(cx - cw * 1.25, y - ch * 0.84, cw * 0.45, ch * 0.25);
    ctx.fillRect(cx + cw * 0.8, y - ch * 0.46, cw * 0.45, ch * 0.28);
    ctx.fillRect(cx + cw * 0.8, y - ch * 0.72, cw * 0.45, ch * 0.28);
    ctx.fillStyle = 'rgba(255,215,145,.35)'; ctx.beginPath(); ctx.ellipse(cx + w * 0.35, y - 2 * s, w * 0.36, 3 * s, 0, 0, 7); ctx.fill();
    return;
  }
  if (G.map.scene === 'winter') {
    ctx.fillStyle = '#18364b';
    for (let i = 0; i < 3; i++) {
      const top = y - h + i * h * 0.24, half = w * (0.46 - i * 0.07);
      ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx - half, y - h * 0.18 + i * h * 0.23); ctx.lineTo(cx + half, y - h * 0.18 + i * h * 0.23); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e6f4f4'; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx - half * 0.22, top + h * 0.25); ctx.lineTo(cx - half * 0.04, top + h * 0.19); ctx.lineTo(cx + half * 0.2, top + h * 0.28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#18364b';
    }
    return;
  }
  ctx.fillStyle = 'hsl(' + b.hue + ',34%,15%)'; ctx.fillRect(cx - w / 2, y - h, w, h);
  ctx.fillStyle = 'hsl(' + b.hue + ',34%,22%)'; ctx.fillRect(cx - w / 2, y - h, w, 5 * s);
  const rows = Math.floor(b.h / 24), cols = Math.floor(b.w / 20);
  ctx.fillStyle = 'rgba(255,208,120,.8)';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if ((r * 7 + c * 3 + b.id) % 5 < 2) ctx.fillRect(cx - w / 2 + (c * 20 + 6) * s, y - h + (r * 24 + 10) * s, 8 * s, 11 * s);
}
function drawMapBackdrop(map) {
  if (map.scene === 'city') {
    ctx.fillStyle = map.horizon; SKY.forEach(b => ctx.fillRect(b.x, HOR - b.h, b.w, b.h + 1));
  } else if (map.scene === 'forest') {
    ctx.fillStyle = '#244a43'; ctx.beginPath(); ctx.moveTo(0, HOR); ctx.lineTo(0, 92); ctx.lineTo(55, 55); ctx.lineTo(112, 95); ctx.lineTo(173, 47); ctx.lineTo(238, 92); ctx.lineTo(310, 52); ctx.lineTo(CW, 90); ctx.lineTo(CW, HOR); ctx.fill();
    ctx.fillStyle = '#193b35'; ctx.beginPath(); ctx.moveTo(0, HOR); ctx.lineTo(0, 117); ctx.lineTo(70, 75); ctx.lineTo(140, 115); ctx.lineTo(215, 72); ctx.lineTo(290, 118); ctx.lineTo(CW, 84); ctx.lineTo(CW, HOR); ctx.fill();
  } else if (map.scene === 'desert') {
    ctx.fillStyle = '#8d514b'; ctx.beginPath(); ctx.moveTo(0, HOR); ctx.lineTo(0, 115); ctx.lineTo(56, 88); ctx.lineTo(98, 91); ctx.lineTo(136, 64); ctx.lineTo(190, 97); ctx.lineTo(232, 77); ctx.lineTo(280, 100); ctx.lineTo(326, 70); ctx.lineTo(CW, 92); ctx.lineTo(CW, HOR); ctx.fill();
    ctx.fillStyle = '#654047'; ctx.beginPath(); ctx.moveTo(0, HOR); ctx.lineTo(0, 132); ctx.lineTo(73, 100); ctx.lineTo(124, 118); ctx.lineTo(182, 91); ctx.lineTo(248, 126); ctx.lineTo(311, 99); ctx.lineTo(CW, 123); ctx.lineTo(CW, HOR); ctx.fill();
  } else {
    ctx.fillStyle = '#7299b0'; ctx.beginPath(); ctx.moveTo(0, HOR); ctx.lineTo(0, 111); ctx.lineTo(53, 56); ctx.lineTo(92, 96); ctx.lineTo(159, 38); ctx.lineTo(225, 102); ctx.lineTo(286, 52); ctx.lineTo(CW, 105); ctx.lineTo(CW, HOR); ctx.fill();
    ctx.fillStyle = '#e4f2f5'; ctx.beginPath(); ctx.moveTo(53, 56); ctx.lineTo(36, 76); ctx.lineTo(53, 69); ctx.lineTo(65, 81); ctx.lineTo(92, 96); ctx.lineTo(159, 38); ctx.lineTo(136, 66); ctx.lineTo(155, 60); ctx.lineTo(168, 74); ctx.lineTo(225, 102); ctx.lineTo(286, 52); ctx.lineTo(270, 75); ctx.lineTo(286, 67); ctx.lineTo(302, 81); ctx.lineTo(CW, 105); ctx.lineTo(CW, HOR); ctx.lineTo(0, HOR); ctx.closePath(); ctx.fill();
  }
}
function drawObs(o) {
  const s = sOf(o.z), x = xOf(o.lane, s), y = yOf(s);
  if (s > 1.8) return;
  if (o.t === 'barrier') {
    const w = 82 * s, h = 32 * s;
    ctx.fillStyle = '#3a3263'; ctx.fillRect(x - w / 2 + 4 * s, y - h, 6 * s, h); ctx.fillRect(x + w / 2 - 10 * s, y - h, 6 * s, h);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#ff5d73' : '#f4efe4'; ctx.fillRect(x - w / 2 + i * w / 6, y - h, w / 6 + .5, h * 0.5); }
  } else if (o.t === 'overhead') {
    const w = 86 * s, hp = 96 * s;
    ctx.fillStyle = '#3a3263'; ctx.fillRect(x - w / 2, y - hp, 6 * s, hp); ctx.fillRect(x + w / 2 - 6 * s, y - hp, 6 * s, hp);
    for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#f2c14e' : '#1b1330'; ctx.fillRect(x - w / 2 + i * w / 7, y - 68 * s, w / 7 + .5, 18 * s); }
  } else {
    const w = 84 * s, h = 98 * s;
    ctx.fillStyle = 'hsl(' + o.hue + ',45%,34%)'; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillStyle = 'hsl(' + o.hue + ',45%,44%)'; ctx.fillRect(x - w / 2, y - h, w, 12 * s);
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x - w / 2 + 8 * s, y - h + 22 * s, w - 16 * s, 26 * s);
    ctx.fillStyle = '#1b1330'; ctx.fillRect(x - 1.5 * s, y - h + 22 * s, 3 * s, 26 * s);
    ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(x - w / 3, y - 16 * s, 5 * s, 0, 7); ctx.arc(x + w / 3, y - 16 * s, 5 * s, 0, 7); ctx.fill();
  }
}
function drawCoin(c) {
  const s = sOf(c.z), x = xOf(c.lane, s), y = yOf(s) - 30 * s; if (s > 1.8) return;
  const spin = Math.abs(Math.cos(G.t * 4 + c.z * 0.3));
  ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.ellipse(x, y, (2 + 8 * spin) * s, 9 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.ellipse(x - s, y - s, (1 + 3 * spin) * s, 4 * s, 0, 0, 7); ctx.fill();
}
function drawPickup(k) {
  const s = sOf(k.z), x = xOf(k.lane, s), y0 = yOf(s); if (s > 1.8) return;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y0, 12 * s, 4 * s, 0, 0, 7); ctx.fill();
  drawOrb(ctx, x, y0 - 36 * s + Math.sin(G.t * 4 + k.z * 0.2) * 3 * s, 16 * s, k.type);
}
function drawGate(gt) {
  const s = sOf(gt.z), y = yOf(s); if (s > 1.8) return;
  const h = 124 * s;
  for (let l = 0; l < 3; l++) {
    const x = xOf(l, s), w = LANEW * 0.92 * s, isOut = gt.out === l;
    let a = isOut ? '18' : '55';
    if (gt.done) a = l === gt.correct ? '99' : '22';
    ctx.fillStyle = (gt.done && l === gt.correct ? '#5ee08a' : LCOL[l]) + a; ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.strokeStyle = gt.done && l === gt.correct ? '#5ee08a' : LCOL[l]; ctx.lineWidth = Math.max(1, 3 * s);
    ctx.globalAlpha = (isOut ? 0.4 : 1) * ctx.globalAlpha; ctx.strokeRect(x - w / 2, y - h, w, h);
    if (isOut) { ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x + w / 2, y); ctx.moveTo(x + w / 2, y - h); ctx.lineTo(x - w / 2, y); ctx.stroke(); }
    ctx.fillStyle = '#f1ecff'; ctx.font = '700 ' + Math.max(8, 58 * s) + 'px "Chakra Petch", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(LET[l], x, y - h / 2);
    ctx.globalAlpha = isOut ? ctx.globalAlpha / 0.4 : ctx.globalAlpha;
  }
  const bx = xOf(0, s) - LANEW * 0.5 * s;
  ctx.fillStyle = '#2a2450'; ctx.fillRect(bx, y - h - 16 * s, LANEW * 3 * s, 16 * s);
  ctx.fillStyle = '#f2c14e'; ctx.font = '700 ' + Math.max(7, 12 * s) + 'px "Chakra Petch", sans-serif'; ctx.fillText('QUIZ GATE', CW / 2, y - h - 8 * s);
  ctx.textBaseline = 'alphabetic';
}
function drawPlayer() {
  const p = G.p, x = xOf(p.x, 1), gy = GROUND - p.jy;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 2, Math.max(6, 16 - p.jy * 0.12), 5, 0, 0, 7); ctx.fill();
  if (p.inv > 0 && Math.floor(G.t * 16) % 2 === 0) ctx.globalAlpha = 0.35;
  ctx.save(); ctx.translate(x, gy);
  drawChar(ctx, G.ch.pal, Math.sin(G.t * 18) * (p.jy > 0 ? 0.3 : 1), p.slide > 0);
  ctx.restore(); ctx.globalAlpha = 1;
  if (G.pu.magnet > 0) {
    ctx.strokeStyle = 'rgba(255,93,115,' + (0.35 + 0.25 * Math.sin(G.t * 8)) + ')'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.arc(x, gy - 30, 40 + Math.sin(G.t * 6) * 3, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  }
  if (G.shield) {
    ctx.fillStyle = 'rgba(63,208,192,.16)'; ctx.strokeStyle = 'rgba(63,208,192,.9)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, gy - 36, 28, 42, 0, 0, 7); ctx.fill(); ctx.stroke();
  }
}
function drawFx(dt) {
  G.fx = G.fx.filter(f => f.life > 0);
  for (const f of G.fx) {
    f.life -= dt * (f.k === 't' ? 0.8 : 1.6);
    if (f.k === 't') {
      f.y += f.vy * dt; f.vy *= 0.96;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.6)); ctx.font = '700 15px "Chakra Petch", sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = '#120f24'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); ctx.globalAlpha = 1;
    } else {
      f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.94; f.vy = f.vy * 0.94 + 80 * dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.5)); ctx.fillStyle = f.color; ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3); ctx.globalAlpha = 1;
    }
  }
}
function render(dt) {
  const g = G;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, CW, CH);
  const sh = g.shake; g.shake = Math.max(0, g.shake - dt * 30);
  ctx.save(); ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
  const map = g.map;
  const sky = ctx.createLinearGradient(0, 0, 0, HOR); sky.addColorStop(0, map.sky[0]); sky.addColorStop(0.55, map.sky[1]); sky.addColorStop(1, map.sky[2]);
  ctx.fillStyle = sky; ctx.fillRect(-10, -10, CW + 20, HOR + 12);
  const sun = ctx.createRadialGradient(CW / 2, HOR - 8, 4, CW / 2, HOR - 8, 60); sun.addColorStop(0, map.sun); sun.addColorStop(0.35, map.sky[2]); sun.addColorStop(1, map.sky[2] + '00');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, CW, HOR);
  drawMapBackdrop(map);
  ctx.fillStyle = map.ground; ctx.fillRect(-10, HOR, CW + 20, CH - HOR + 10);

  const sb = (CH - HOR) / (GROUND - HOR);
  ctx.fillStyle = map.road; ctx.beginPath(); ctx.moveTo(CW / 2, HOR); ctx.lineTo(CW / 2 + 1.5 * LANEW * sb, CH); ctx.lineTo(CW / 2 - 1.5 * LANEW * sb, CH); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.055)';
  const ph = g.dist % 16;
  for (let k = 0; k < 20; k += 2) { const zA = k * 8 - ph, zB = zA + 8; if (zB < -3) continue; quad(0, 1.5 * LANEW, sOf(Math.max(zA, -3)), sOf(zB)); }
  ctx.fillStyle = map.edge;
  for (const o of [-1.5, 1.5]) quad(o, 2.5, sOf(-3), 0.001);
  ctx.fillStyle = map.stripe;
  const pd = g.dist % 10;
  for (let k = 0; k < 15; k++) { let zA = k * 10 - pd; const zB = zA + 5; if (zB < -2) continue; zA = Math.max(zA, -2); for (const o of [-0.5, 0.5]) quad(o, 1.6, sOf(zA), sOf(zB)); }

  const items = [];
  g.bld.forEach(b => items.push({ z: b.z, f: () => drawBld(b) }));
  g.obs.forEach(o => items.push({ z: o.z, f: () => drawObs(o) }));
  g.cn.forEach(c => items.push({ z: c.z, f: () => drawCoin(c) }));
  g.pk.forEach(k => items.push({ z: k.z, f: () => drawPickup(k) }));
  if (g.gate) items.push({ z: g.gate.z, f: () => drawGate(g.gate) });
  items.push({ z: 0, f: drawPlayer, nf: true });
  items.sort((a, b) => b.z - a.z);
  for (const it of items) { ctx.globalAlpha = it.nf ? 1 : fog(it.z); it.f(); }
  ctx.globalAlpha = 1;
  drawFx(dt);
  ctx.restore();
  ctx.fillStyle = 'rgba(12,10,24,.72)'; ctx.fillRect(10, 10, 128, 22);
  ctx.fillStyle = '#f1ecff'; ctx.font = '600 10px "DM Sans", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(map.name.toUpperCase(), 17, 21);
  ctx.textBaseline = 'alphabetic';
  if (g.pu.slow > 0) { ctx.fillStyle = 'rgba(90,168,255,.08)'; ctx.fillRect(0, 0, CW, CH); }
  if (g.pu.x2 > 0) { ctx.strokeStyle = 'rgba(242,193,78,' + (0.35 + 0.2 * Math.sin(g.t * 6)) + ')'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, CW - 4, CH - 4); }
  if (g.flash > 0) { ctx.fillStyle = 'rgba(255,60,80,' + g.flash + ')'; ctx.fillRect(0, 0, CW, CH); g.flash = Math.max(0, g.flash - dt); }
}

/* ---------- hub drawing ---------- */
function drawHero(ts) {
  const g = hctx, W = 360, H = 150, hz = 96;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  const sk = g.createLinearGradient(0, 0, 0, hz); sk.addColorStop(0, '#150d38'); sk.addColorStop(0.6, '#5a2a6e'); sk.addColorStop(1, '#ff8a4d');
  g.fillStyle = sk; g.fillRect(0, 0, W, hz);
  const sun = g.createRadialGradient(W / 2, hz - 6, 3, W / 2, hz - 6, 50); sun.addColorStop(0, '#fff1b0'); sun.addColorStop(0.4, '#ffb35a'); sun.addColorStop(1, 'rgba(255,138,77,0)');
  g.fillStyle = sun; g.fillRect(0, 0, W, hz);
  g.fillStyle = '#1b1033'; SKY.forEach(b => g.fillRect(b.x, hz - b.h * 0.9, b.w, b.h * 0.9 + 1));
  g.fillStyle = '#0f0b1f'; g.fillRect(0, hz, W, H - hz);
  g.fillStyle = '#2a2442'; g.beginPath(); g.moveTo(W / 2, hz); g.lineTo(W / 2 + 130, H); g.lineTo(W / 2 - 130, H); g.closePath(); g.fill();
  g.fillStyle = 'rgba(241,236,255,.5)';
  for (const off of [-1, 1]) for (let k = 0; k < 6; k++) {
    const t = (ts / 500 + k / 6) % 1, e = t * t, y = hz + (H - hz) * e, x = W / 2 + off * 130 / 3 * e * 1.0 * (1);
    g.fillRect(x - (0.5 + 2 * e), y, 1 + 4 * e, 1 + 9 * e);
  }
  const ch = curChar(), bob = Math.abs(Math.sin(ts / 130)) * 3;
  g.save(); g.translate(W / 2, H - 6 - bob); g.scale(1.15, 1.15);
  drawChar(g, ch.pal, Math.sin(ts / 110), false); g.restore();
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(W / 2, H - 4, 20 - bob, 5, 0, 0, 7); g.fill();
}

/* ---------- hud ---------- */
function heart(on) { return '<svg width="18" height="16" viewBox="0 0 24 22"><path d="M12 21C5 15 1 11.5 1 7.2 1 3.9 3.5 1.5 6.6 1.5c2 0 3.9 1 5.4 3 1.5-2 3.4-3 5.4-3C20.5 1.5 23 3.9 23 7.2 23 11.5 19 15 12 21z" fill="' + (on ? '#ff5d73' : 'none') + '" stroke="#ff5d73" stroke-width="2"/></svg>'; }
function chips() {
  const items = [];
  for (const k of ['magnet', 'x2', 'slow']) if (G.pu[k] > 0) items.push({ k, txt: PU[k].chip + ' ' + Math.ceil(G.pu[k]) + 's' });
  if (G.shield) items.push({ k: 'shield', txt: PU.shield.chip });
  if (G.clue) items.push({ k: 'clue', txt: PU.clue.chip });
  const sig = items.map(i => i.txt).join('|'); if (sig === chipSig) return; chipSig = sig;
  const box = $('chips'); box.innerHTML = '';
  if (!items.length) { const h = document.createElement('span'); h.className = 'hint'; h.textContent = 'Grab glowing orbs for power-ups'; box.appendChild(h); return; }
  for (const it of items) {
    const s = document.createElement('span'); s.className = 'chip'; s.style.setProperty('--c', PU[it.k].color);
    const im = document.createElement('img'); im.src = iconURL(it.k); im.alt = '';
    s.appendChild(im); s.appendChild(document.createTextNode(it.txt)); box.appendChild(s);
  }
}
function hud() {
  $('hScore').textContent = Math.floor(G.score); $('hCoins').textContent = G.coins; $('hStreak').textContent = 'x' + G.streak;
  const sig = G.lives + '/' + G.maxLives;
  if (lastLives !== sig) { lastLives = sig; let h = ''; for (let i = 0; i < G.maxLives; i++) h += heart(G.lives > i); $('hLives').innerHTML = h; }
  chips();
}

/* ---------- menu, shop, guide ---------- */
function setView(v) {
  view = v;
  for (const n of ['run', 'shop', 'guide']) { $('view-' + n).hidden = n !== v; $('tab-' + n).setAttribute('aria-selected', n === v ? 'true' : 'false'); }
  if (v === 'shop') renderShop();
}
function refreshHub() {
  const ch = curChar();
  $('wallet').textContent = SAVE.coins;
  $('heroName').textContent = ch.name; $('heroPerk').textContent = ch.perk;
  $('bestLine').textContent = SAVE.best ? 'Best score ' + SAVE.best : 'No runs yet. Your best score will show here.';
  const r = G && G.result;
  $('result').hidden = !r; $('goBtn').textContent = r ? 'Run again' : 'Start run';
  if (r) {
    $('rScore').textContent = r.sc; $('rCoins').textContent = '+' + r.coins; $('rCorrect').textContent = r.correct + '/' + r.asked; $('rStreak').textContent = r.streak;
    $('rBadge').hidden = !r.isBest;
  }
}
function showMenu() {
  $('game').hidden = true; $('menu').hidden = false; $('pause').hidden = true;
  refreshHub(); setView('run');
}
function shopMsg(t) { $('shopMsg').textContent = t; }
function renderShop() {
  const box = $('shopGrid'); box.innerHTML = '';
  for (const ch of CHARS) {
    const owned = SAVE.owned.includes(ch.id), sel = SAVE.sel === ch.id;
    const card = document.createElement('article'); card.className = 'char' + (sel ? ' sel' : '') + (owned ? '' : ' locked');
    const pv = document.createElement('div'); pv.className = 'pv'; pv.appendChild(charCanvas(ch, 120, 112, 1.2));
    const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = sel ? 'Equipped' : owned ? 'Owned' : 'Locked';
    const nm = document.createElement('h3'); nm.textContent = ch.name;
    const pk = document.createElement('p'); pk.textContent = ch.perk;
    const btn = document.createElement('button'); btn.className = 'buy';
    if (sel) { btn.textContent = 'Equipped'; btn.disabled = true; btn.classList.add('equip'); }
    else if (owned) {
      btn.textContent = 'Equip'; btn.classList.add('equip');
      btn.addEventListener('click', () => { SAVE.sel = ch.id; persist(); renderShop(); refreshHub(); shopMsg(ch.name + ' is ready to run.'); });
    } else if (SAVE.coins >= ch.price) {
      btn.innerHTML = 'Buy ' + COIN_SVG + ch.price;
      btn.addEventListener('click', () => {
        if (SAVE.coins < ch.price) return;
        SAVE.coins -= ch.price; SAVE.owned.push(ch.id); SAVE.sel = ch.id; persist(); renderShop(); refreshHub(); shopMsg(ch.name + ' unlocked and equipped.');
      });
    } else { btn.textContent = 'Need ' + (ch.price - SAVE.coins) + ' more'; btn.disabled = true; }
    const head = document.createElement('div'); head.className = 'chead'; head.appendChild(nm);
    if (!owned) { const pr = document.createElement('span'); pr.className = 'price'; pr.innerHTML = COIN_SVG + ch.price; head.appendChild(pr); }
    card.append(pv, tag, head, pk, btn); box.appendChild(card);
  }
}
function renderGuide() {
  const ul = $('puList');
  for (const t of PUTYPES) {
    const li = document.createElement('li'), im = document.createElement('img'), sp = document.createElement('span'), b = document.createElement('b');
    im.src = iconURL(t); im.alt = ''; b.textContent = PU[t].name; sp.appendChild(b); sp.appendChild(document.createTextNode(PU[t].desc));
    li.append(im, sp); ul.appendChild(li);
  }
}

/* ---------- loop ---------- */
function start() { reset(); $('menu').hidden = true; $('game').hidden = false; hud(); }
function pauseGame() { if (G && G.state === 'play' && !$('game').hidden) { G.state = 'pause'; $('pause').hidden = false; } }
function resumeGame() { if (G && G.state === 'pause') { G.state = 'play'; $('pause').hidden = true; } }
let last = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (G && !$('game').hidden) { if (G.state === 'play') update(dt); render(dt); hud(); }
  else if (!$('menu').hidden && view === 'run') drawHero(ts);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- input ---------- */
const playing = () => G && G.state === 'play' && !$('game').hidden;
function goLeft() { if (playing()) G.p.lane = Math.max(0, G.p.lane - 1); }
function goRight() { if (playing()) G.p.lane = Math.min(2, G.p.lane + 1); }
function jump() { if (!playing()) return; const p = G.p; if (p.jy <= 0.01) { p.vy = 340; p.jy = 0.01; p.slide = 0; } }
function slide() { if (!playing()) return; const p = G.p; if (p.jy > 0.5) p.vy = -520; else p.slide = 0.55; }
$('bLeft').addEventListener('pointerdown', e => { e.preventDefault(); goLeft(); });
$('bRight').addEventListener('pointerdown', e => { e.preventDefault(); goRight(); });
$('bJump').addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
$('bSlide').addEventListener('pointerdown', e => { e.preventDefault(); slide(); });
$('goBtn').addEventListener('click', start);
$('changeBtn').addEventListener('click', () => setView('shop'));
$('pauseBtn').addEventListener('click', pauseGame);
$('resumeBtn').addEventListener('click', resumeGame);
$('quitBtn').addEventListener('click', () => { if (G && G.state === 'pause') endRun(); });
for (const n of ['run', 'shop', 'guide']) $('tab-' + n).addEventListener('click', () => setView(n));
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (G && !$('game').hidden && (k === 'p' || k === 'escape')) { e.preventDefault(); if (G.state === 'pause') resumeGame(); else pauseGame(); return; }
  if (!playing()) return;
  if (k === 'arrowleft' || k === 'a') { e.preventDefault(); goLeft(); }
  else if (k === 'arrowright' || k === 'd') { e.preventDefault(); goRight(); }
  else if (k === 'arrowup' || k === 'w' || k === ' ') { e.preventDefault(); jump(); }
  else if (k === 'arrowdown' || k === 's') { e.preventDefault(); slide(); }
});
let sw = null;
cv.addEventListener('pointerdown', e => { sw = { x: e.clientX, y: e.clientY, used: false }; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } });
cv.addEventListener('pointermove', e => {
  if (!sw || sw.used) return;
  const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 26) return;
  sw.used = true;
  if (Math.abs(dx) > Math.abs(dy)) { if (dx > 0) goRight(); else goLeft(); } else { if (dy < 0) jump(); else slide(); }
});
['pointerup', 'pointercancel'].forEach(n => cv.addEventListener(n, () => { sw = null; }));

renderGuide();
showMenu();
})();
