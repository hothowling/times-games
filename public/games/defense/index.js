/*
 * 구구단 디펜스 - 울타리 뒤의 캐릭터가 미사일을 자동으로 쏘고, 위에서 끝없이 내려오는 좀비를 막는 게임.
 * 좀비가 울타리에 닿으면 울타리가 조금씩 부서지고, 다 부서지면 끝. 금빛 퀴즈 좀비를 잡으면 구구단 퀴즈가 나오고,
 * 맞히면 미사일 업그레이드 카드 3장 중 하나를 고릅니다. 정답 알약을 쓰면 퀴즈 없이 바로 업그레이드.
 * 규칙·수치는 rules.js(DOM 없음). 그림은 캔버스에 직접 그립니다(ART: 나중에 그림 파일로 바꿀 자리).
 */
import { WORLD_W, FENCE_HP, WAVE_SEC, QUIZ_EVERY, ZOMBIES, UPGRADES, waveConfig, pickType, stats, upgradeChoices, makeQuiz, starsFor } from './rules.js';

export const dict = {
  ko: {
    title: '구구단 디펜스',
    how1: '캐릭터가 미사일을 알아서 쏴요. 좀비가 울타리를 부수기 전에 막아요!',
    how2: '금빛 ❓ 좀비를 잡으면 구구단 퀴즈! 맞히면 미사일이 강해져요.',
    start: '시작!', again: '다시 하기', resume: '계속하기', pause: '일시정지', paused: '일시정지', over: '울타리가 무너졌어요!',
    wave: '{n} 웨이브', result: '{w} 웨이브 · 좀비 {k}마리 · {s}점', best: '🏆 최고 기록 {n}점', record: '🎉 새 기록!',
    quizTitle: '구구단 퀴즈!', quizRight: '정답! 업그레이드를 골라요', quizWrong: '아쉬워요, 정답은 {n}',
    pickTitle: '업그레이드 고르기', level: 'Lv {a} → {b}', allMax: '모든 미사일이 최고 레벨이에요!',
    slow: '⏳ 좀비가 느려졌어요', repaired: '🛡 울타리를 고쳤어요', fence: '울타리'
  },
  en: {
    title: 'Times Table Defense',
    how1: 'Your character fires missiles by itself. Stop the zombies before they break the fence!',
    how2: 'Defeat a golden ❓ zombie for a times table quiz. Get it right to power up!',
    start: 'Start!', again: 'Play again', resume: 'Resume', pause: 'Pause', paused: 'Paused', over: 'The fence fell!',
    wave: 'Wave {n}', result: 'Wave {w} · {k} zombies · {s} pts', best: '🏆 Best {n} pts', record: '🎉 New record!',
    quizTitle: 'Times table quiz!', quizRight: 'Correct! Pick an upgrade', quizWrong: 'So close! The answer is {n}',
    pickTitle: 'Pick an upgrade', level: 'Lv {a} → {b}', allMax: 'Every missile upgrade is maxed!',
    slow: '⏳ Zombies slowed down', repaired: '🛡 Fence repaired', fence: 'Fence'
  }
};

const FENCE_FROM_BOTTOM = 150;  /* 울타리 위치(아래에서 논리 px) */
const SLOW_SEC = 10;
const REPAIR = 35;               /* 보호막으로 고치는 양 */
const MISSILE_SPEED = 320;        /* 미사일이 날아가는 속도(논리 px/초) */

const HTML = `
<div class="df-app">
  <canvas class="df-canvas"></canvas>
  <header class="df-hud">
    <span class="df-pill df-wave"></span>
    <span class="df-pill">⭐ <b class="df-score">0</b></span>
    <span class="df-fence" role="meter" aria-valuemin="0" aria-valuemax="100" data-i18n-aria="fence"><i></i></span>
    <button type="button" class="df-pill df-sound" data-i18n-aria="sound"></button>
    <button type="button" class="df-pill df-pause" data-i18n-aria="pause">⏸️</button>
  </header>
  <div class="df-banner" aria-live="polite"></div>
  <div class="df-hero" aria-hidden="true"></div>
  <div class="df-items"></div>
</div>
<div class="df-overlay" data-mode="start">
  <div class="df-card">
    <h1 data-show="start" data-i18n="title"></h1>
    <h1 data-show="over" data-i18n="over"></h1>
    <h1 data-show="pause" data-i18n="paused"></h1>
    <h1 data-show="quiz" data-i18n="quizTitle"></h1>
    <h1 data-show="pick" data-i18n="pickTitle"></h1>
    <div class="df-card-face" data-show="start over pause" aria-hidden="true"></div>
    <p class="df-record" data-show="over" data-i18n="record"></p>
    <p class="df-result" data-show="over pause"></p>
    <p class="df-best" data-show="start over"></p>
    <p data-show="start" data-i18n="how1"></p>
    <p data-show="start" data-i18n="how2"></p>
    <div class="df-quiz" data-show="quiz">
      <p class="df-q"></p>
      <div class="df-choices"></div>
      <p class="df-quiz-msg" aria-live="polite"></p>
    </div>
    <div class="df-picks" data-show="pick"></div>
    <button type="button" class="df-main df-go" data-show="start over pause"></button>
    <button type="button" class="df-sub df-lobby" data-show="start over pause" data-i18n="goLobby"></button>
  </div>
</div>`;

export function mount(el, ctx) {
  el.innerHTML = HTML;
  ctx.apply(el);
  const $ = (sel) => el.querySelector(sel);
  const t = ctx.t;
  const lang = ctx.lang;
  const canvas = $('.df-canvas');
  const g = canvas.getContext('2d');
  const overlay = $('.df-overlay');
  const banner = $('.df-banner');
  const fenceBar = $('.df-fence');

  const hero = ctx.character($('.df-hero'), { body: true });
  const cardHero = ctx.character($('.df-card-face'), { body: false });

  let best = Number(ctx.progress?.best) || 0;
  let W = WORLD_W;   /* 논리 좌표 너비(고정)·높이(화면 비율) */
  let H = 640;
  let scale = 1;
  let fenceY = H - FENCE_FROM_BOTTOM;
  let G = null;      /* 한 판 상태 */

  function newGame() {
    return {
      mode: 'play', t: 0, wave: 1, waveT: 0, spawnT: 1, quizT: QUIZ_EVERY * 0.6, cool: 0.4,
      zombies: [], missiles: [], fx: [], fence: FENCE_HP, lv: {}, kills: 0, score: 0, slowUntil: 0,
      hold: false, prevBest: best, quiz: null
    };
  }

  /* ---------- 화면 크기 ---------- */

  function measure() {
    const r = el.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    scale = r.width / WORLD_W;
    W = WORLD_W;
    H = r.height / scale;
    fenceY = H - FENCE_FROM_BOTTOM;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
    g.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    el.style.setProperty('--fence-y', fenceY * scale + 'px');
    if (!G || G.mode !== 'play') draw();
  }

  /* 캐릭터(미사일 나가는 곳): 울타리 아래 가운데 */
  const gun = () => ({ x: W / 2, y: fenceY + 52 });

  /* ---------- 진행 ---------- */

  function spawn(type) {
    const z = ZOMBIES[type];
    const cfg = waveConfig(G.wave);
    G.zombies.push({
      type, x: 24 + Math.random() * (W - 48), y: -z.r, r: z.r,
      hp: z.hp * cfg.hpMul, maxHp: z.hp * cfg.hpMul, speed: z.speed * cfg.speedMul * (0.85 + Math.random() * 0.3),
      phase: Math.random() * 6, hitT: 0, biting: false
    });
  }

  function update(dt) {
    G.t += dt;
    G.waveT += dt;
    if (G.waveT >= WAVE_SEC) {
      G.waveT = 0;
      G.wave++;
      say(t('wave', { n: G.wave }));
      ctx.audio.nextFx();
    }
    const cfg = waveConfig(G.wave);
    if ((G.spawnT -= dt) <= 0) {
      spawn(pickType(G.wave));
      G.spawnT = cfg.spawnGap * (0.7 + Math.random() * 0.6);
    }
    if ((G.quizT -= dt) <= 0 && !G.zombies.some((z) => z.type === 'quiz')) {
      spawn('quiz');
      G.quizT = QUIZ_EVERY;
    }

    /* 좀비: 내려오다가 울타리에 닿으면 멈춰서 갉습니다. */
    const slow = G.t < G.slowUntil ? 0.45 : 1;
    for (const z of G.zombies) {
      z.hitT = Math.max(0, z.hitT - dt);
      const stop = fenceY - z.r * 0.6;
      if (z.y < stop) {
        z.y = Math.min(stop, z.y + z.speed * slow * dt);
        z.x += Math.sin(G.t * 2 + z.phase) * 8 * dt;
        z.biting = false;
      } else {
        z.biting = true;
        G.fence -= ZOMBIES[z.type].bite * dt;
      }
    }
    if (G.fence <= 0) { G.fence = 0; gameOver(); return; }

    /* 자동 발사: 울타리에 가장 가까운(아래쪽) 좀비를 노립니다. 다연발은 부채꼴로. */
    const s = stats(G.lv);
    if ((G.cool -= dt) <= 0) {
      const target = G.zombies.filter((z) => z.y > -z.r).reduce((a, z) => (!a || z.y > a.y ? z : a), null);
      if (target) {
        const o = gun();
        const base = Math.atan2(target.y - o.y, target.x - o.x);
        for (let i = 0; i < s.shots; i++) {
          const a = base + (i - (s.shots - 1) / 2) * 0.12;
          G.missiles.push({ x: o.x, y: o.y - 20, vx: Math.cos(a) * MISSILE_SPEED, vy: Math.sin(a) * MISSILE_SPEED, pierce: s.pierce, hit: new Set() });
        }
        G.cool = s.interval;
        ctx.audio.tone({ freq: 760, to: 380, dur: 0.05, type: 'square', gain: 0.025 });
      } else G.cool = 0.1;
    }

    /* 미사일 이동과 맞히기 */
    G.missiles = G.missiles.filter((m) => {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.y < -20 || m.x < -20 || m.x > W + 20 || m.y > H) return false;
      for (const z of G.zombies) {
        if (z.hp <= 0 || m.hit.has(z)) continue;
        if ((z.x - m.x) ** 2 + (z.y - m.y) ** 2 > (z.r + 5) ** 2) continue;
        m.hit.add(z);
        hit(z, s.damage);
        if (s.blast) {
          G.fx.push({ kind: 'blast', x: m.x, y: m.y, r: s.blast, t: 0 });
          for (const o of G.zombies) if (o !== z && o.hp > 0 && (o.x - m.x) ** 2 + (o.y - m.y) ** 2 < (s.blast + o.r) ** 2) hit(o, s.damage * 0.6);
        }
        if (m.pierce-- <= 0) return false;
      }
      return true;
    });

    /* 쓰러진 좀비 */
    let quizNow = false;
    G.zombies = G.zombies.filter((z) => {
      if (z.hp > 0) return true;
      G.kills++;
      G.score += ZOMBIES[z.type].points;
      G.fx.push({ kind: 'pop', x: z.x, y: z.y, r: z.r, t: 0 });
      if (z.type === 'quiz') quizNow = true;
      ctx.audio.tone({ freq: 220, to: 70, dur: 0.12, type: 'triangle', gain: 0.08 });
      return false;
    });
    G.fx = G.fx.filter((f) => (f.t += dt) < 0.4);
    renderHud();
    if (quizNow) openQuiz();
  }

  function hit(z, dmg) {
    z.hp -= dmg;
    z.hitT = 0.12;
  }

  /* ---------- 그리기(ART: 나중에 그림 파일로 바꿀 자리) ---------- */

  function draw() {
    g.clearRect(0, 0, W, H);
    /* 땅: 위는 들판, 울타리 아래는 마당 */
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#5b7f4a');
    sky.addColorStop(0.7, '#7aa35d');
    sky.addColorStop(1, '#c9a46a');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,.06)';
    for (let y = ((G?.t || 0) * 6) % 40 - 40; y < fenceY; y += 40) g.fillRect(0, y, W, 2);
    g.fillStyle = '#d8b67c';
    g.fillRect(0, fenceY + 20, W, H - fenceY - 20);
    if (!G) { drawFence(FENCE_HP); return; }

    for (const f of G.fx) {
      const k = f.t / 0.4;
      g.globalAlpha = 1 - k;
      g.fillStyle = f.kind === 'blast' ? '#ffb347' : '#b6ff9e';
      g.beginPath();
      g.arc(f.x, f.y, f.r * (0.5 + k), 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
    for (const z of G.zombies) drawZombie(z);
    drawFence(G.fence);
    for (const m of G.missiles) drawMissile(m);
  }

  function drawZombie(z) {
    const bob = Math.sin(G.t * (z.biting ? 14 : 6) + z.phase) * (z.biting ? 2 : 3);
    if (z.type === 'quiz') {
      g.fillStyle = 'rgba(255, 213, 74, .55)';
      g.beginPath();
      g.arc(z.x, z.y + bob, z.r + 7 + Math.sin(G.t * 8) * 2, 0, Math.PI * 2);
      g.fill();
    }
    g.font = `${z.r * 2.1}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.globalAlpha = z.hitT > 0 ? 0.55 : 1;
    g.fillText('🧟', z.x, z.y + bob);
    g.globalAlpha = 1;
    if (z.type === 'quiz') {
      g.font = `bold ${z.r}px system-ui, sans-serif`;
      g.fillText('❓', z.x + z.r * 0.8, z.y - z.r * 0.8 + bob);
    }
    if (z.type === 'fast') { g.font = `${z.r}px system-ui, sans-serif`; g.fillText('💨', z.x - z.r, z.y + bob); }
    if (z.hp < z.maxHp) {
      const w = z.r * 1.6;
      g.fillStyle = 'rgba(0,0,0,.45)';
      g.fillRect(z.x - w / 2, z.y - z.r - 8, w, 4);
      g.fillStyle = z.type === 'quiz' ? '#ffd54a' : '#ff5a5a';
      g.fillRect(z.x - w / 2, z.y - z.r - 8, w * Math.max(0, z.hp / z.maxHp), 4);
    }
  }

  /* 울타리: 나무판 12장. 체력이 줄면 판이 정해진 순서로 금 가고 빠집니다. */
  const PLANK_ORDER = [5, 2, 9, 0, 7, 11, 3, 8, 1, 10, 4, 6];
  function drawFence(hp) {
    const n = 12;
    const pw = W / n;
    const lost = (1 - hp / FENCE_HP) * n;          /* 부서진 정도(판 개수 단위) */
    g.fillStyle = '#7a4f2a';
    g.fillRect(0, fenceY - 4, W, 6);
    g.fillRect(0, fenceY + 12, W, 6);
    for (let i = 0; i < n; i++) {
      const rank = PLANK_ORDER.indexOf(i);
      if (rank < lost - 1) continue;              /* 빠진 판 */
      const cracked = rank < lost;
      const x = i * pw + 2;
      g.fillStyle = cracked ? '#a77a4c' : '#c48a50';
      g.beginPath();
      g.moveTo(x, fenceY + 26);
      g.lineTo(x, fenceY - 18);
      g.lineTo(x + (pw - 4) / 2, fenceY - 26);
      g.lineTo(x + pw - 4, fenceY - 18);
      g.lineTo(x + pw - 4, fenceY + 26);
      g.closePath();
      g.fill();
      g.strokeStyle = '#6b4323';
      g.lineWidth = 1.5;
      g.stroke();
      if (cracked) {
        g.beginPath();
        g.moveTo(x + 4, fenceY - 12);
        g.lineTo(x + pw / 2, fenceY);
        g.lineTo(x + 6, fenceY + 14);
        g.stroke();
      }
    }
  }

  function drawMissile(m) {
    const lvl = G.lv.power || 0;
    g.save();
    g.translate(m.x, m.y);
    g.rotate(Math.atan2(m.vy, m.vx));
    g.fillStyle = '#ff9a3c';
    g.beginPath();
    g.moveTo(-10, -3); g.lineTo(-18 - Math.random() * 5, 0); g.lineTo(-10, 3);
    g.fill();
    g.fillStyle = ['#e9edf5', '#9fd3ff', '#ffd54a', '#ff8fc7', '#b38cff', '#ff5a5a'][lvl];
    g.beginPath();
    g.roundRect(-10, -3.5, 16, 7, 3.5);
    g.fill();
    g.fillStyle = '#e5484d';
    g.beginPath();
    g.moveTo(6, -3.5); g.lineTo(11, 0); g.lineTo(6, 3.5);
    g.fill();
    g.restore();
  }

  /* ---------- 화면 위 글자 ---------- */

  let bannerTimer = 0;
  function say(text) {
    banner.textContent = text;
    banner.classList.remove('show');
    void banner.offsetWidth;
    banner.classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => banner.classList.remove('show'), 1600);
  }

  function renderHud() {
    $('.df-wave').textContent = t('wave', { n: G?.wave || 1 });
    $('.df-score').textContent = G?.score || 0;
    const hp = Math.round(G ? G.fence : FENCE_HP);
    fenceBar.querySelector('i').style.transform = `scaleX(${hp / FENCE_HP})`;
    fenceBar.classList.toggle('low', hp < 30);
    fenceBar.setAttribute('aria-valuenow', String(hp));
  }

  function renderSound() {
    const b = $('.df-sound');
    const on = ctx.audio.getSound();
    b.textContent = on ? '🔊' : '🔇';
    b.setAttribute('aria-pressed', String(on));
  }

  /* ---------- 시작·일시정지·끝 ---------- */

  function showOverlay(mode) {
    overlay.dataset.mode = mode;
    overlay.hidden = false;
    $('.df-go').textContent = t(mode === 'start' ? 'start' : mode === 'over' ? 'again' : 'resume');
    $('.df-best').textContent = t('best', { n: best });
    $('.df-best').hidden = !best;
    if (G) $('.df-result').textContent = t('result', { w: G.wave, k: G.kills, s: G.score });
    cardHero.expression(mode === 'over' ? (G.score > G.prevBest ? 'happy' : 'sad') : 'happy');
  }

  function startGame() {
    const ac = ctx.audio.context();
    if (ac && ac.state !== 'running') ac.resume().catch(() => {});
    G = newGame();
    overlay.hidden = true;
    overlay.classList.remove('new-best');
    renderHud();
    say(t('wave', { n: 1 }));
    items.refresh();
  }

  function pause() {
    if (!G || G.mode !== 'play') return;
    G.mode = 'pause';
    showOverlay('pause');
  }

  function resume() {
    G.mode = 'play';
    overlay.hidden = true;
  }

  function gameOver() {
    G.mode = 'over';
    ctx.audio.timeout();
    hero.react('fail');
    if (G.score > best) {
      best = G.score;
      ctx.saveProgress({ best });
    }
    overlay.classList.toggle('new-best', G.score > G.prevBest);
    ctx.finish({ stars: starsFor(G.wave), score: G.score, detail: { wave: G.wave, kills: G.kills, lv: G.lv } });
    draw();
    setTimeout(() => { if (G?.mode === 'over') showOverlay('over'); }, 900);
  }

  /* ---------- 퀴즈와 업그레이드 ---------- */

  function openQuiz() {
    G.mode = 'quiz';
    G.quiz = makeQuiz();
    const q = G.quiz;
    $('.df-q').textContent = `${q.a} × ${q.b} = ?`;
    $('.df-quiz-msg').textContent = '';
    $('.df-choices').replaceChildren(...q.choices.map((n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'df-choice';
      b.textContent = n;
      b.addEventListener('click', () => answerQuiz(n, b));
      return b;
    }));
    showOverlay('quiz');
    ctx.audio.playNumbers(lang, [q.a, q.b]);
    items.refresh();
  }

  function answerQuiz(n, button) {
    if (!G.quiz || G.quiz.done) return;
    const q = G.quiz;
    q.done = true;
    for (const b of $('.df-choices').children) {
      b.disabled = true;
      if (Number(b.textContent) === q.answer) b.classList.add('right');
    }
    if (n === q.answer) {
      ctx.audio.correct();
      hero.react('correct');
      $('.df-quiz-msg').textContent = t('quizRight');
      setTimeout(openPick, 700);
    } else {
      button?.classList.add('wrong');
      ctx.audio.wrong();
      hero.react('wrong');
      $('.df-quiz-msg').textContent = t('quizWrong', { n: q.answer });
      setTimeout(() => { if (G?.mode === 'quiz') resume(); }, 1400);
    }
  }

  function openPick() {
    const ids = upgradeChoices(G.lv);
    if (!ids.length) {
      say(t('allMax'));
      resume();
      return;
    }
    G.mode = 'pick';
    $('.df-picks').replaceChildren(...ids.map((id) => {
      const u = UPGRADES[id];
      const lv = G.lv[id] || 0;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'df-pick';
      b.innerHTML = '<span class="df-pick-icon"></span><b></b><small></small><em></em>';
      b.querySelector('.df-pick-icon').textContent = u.icon;
      b.querySelector('b').textContent = u.name[lang];
      b.querySelector('small').textContent = u.desc[lang];
      b.querySelector('em').textContent = t('level', { a: lv, b: lv + 1 });
      b.addEventListener('click', () => {
        G.lv[id] = lv + 1;
        ctx.audio.fanfare();
        say(`${u.icon} ${u.name[lang]} Lv ${lv + 1}`);
        resume();
        items.refresh();
      });
      return b;
    }));
    showOverlay('pick');
  }

  /* ---------- 아이템(공통: 모래시계·보호막·정답 알약) ---------- */

  const items = ctx.itemBar($('.df-items'), {
    time: { can: () => G?.mode === 'play' && G.t >= G.slowUntil, apply() { G.slowUntil = G.t + SLOW_SEC; say(t('slow')); } },
    shield: { can: () => G?.mode === 'play' && G.fence < FENCE_HP, apply() { G.fence = Math.min(FENCE_HP, G.fence + REPAIR); renderHud(); say(t('repaired')); } },
    /* 정답 알약: 퀴즈 중이면 정답 처리, 아니면 바로 업그레이드 고르기 */
    pill: {
      can: () => (G?.mode === 'play' || (G?.mode === 'quiz' && !G.quiz.done)) && upgradeChoices(G.lv).length > 0,
      apply() {
        if (G.mode === 'quiz') answerQuiz(G.quiz.answer, null);
        else openPick();
      }
    },
    pause: () => { if (G) G.hold = true; },
    resume: () => { if (G) G.hold = false; }
  });
  const itemTimer = setInterval(() => items.refresh(), 400);

  /* ---------- 루프 ---------- */

  let raf = 0;
  let last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (G?.mode === 'play' && !G.hold) update(dt);
    if (G?.mode !== 'over') draw();
  }

  const onVisibility = () => { if (document.hidden) pause(); };

  $('.df-go').addEventListener('click', () => {
    if (G?.mode === 'pause') resume();
    else startGame();
  });
  $('.df-lobby').addEventListener('click', () => ctx.exit());
  $('.df-pause').addEventListener('click', pause);
  $('.df-sound').addEventListener('click', () => { ctx.setSound(!ctx.audio.getSound()); renderSound(); });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', measure);

  measure();
  renderSound();
  renderHud();
  showOverlay('start');
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(itemTimer);
      clearTimeout(bannerTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', measure);
      if (G) G.mode = 'over';
    }
  };
}
