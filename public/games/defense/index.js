import { icon, iconFromSource, iconMarkup, setIconText } from '../../core/icons.js';
/*
 * 구구단 디펜스 - 울타리 뒤의 캐릭터가 미사일을 자동으로 쏘고, 위에서 끝없이 내려오는 좀비를 막는 게임.
 * 좀비가 울타리에 닿으면 울타리가 조금씩 부서지고, 다 부서지면 끝. 금빛 퀴즈 좀비를 잡으면 구구단 퀴즈가 나오고,
 * 맞히면 미사일 업그레이드 카드 3장 중 하나를 고릅니다. 정답 알약을 쓰면 퀴즈 없이 바로 업그레이드.
 * 규칙·수치는 rules.js(DOM 없음). 들판·좀비·울타리·미사일·폭발은 assets/games/defense/ 그림을 캔버스에 그립니다.
 */
import { PRESETS } from '../../core/catalog.js';
import { WORLD_W, FENCE_HP, WAVE_SEC, QUIZ_EVERY, ZOMBIES, UPGRADES, waveConfig, pickType, stats, upgradeChoices, makeQuiz, starsFor } from './rules.js';

export const dict = {
  ko: {
    title: '구구단 디펜스',
    how1: '캐릭터가 미사일을 알아서 쏴요. 좀비가 울타리를 부수기 전에 막아요!',
    how2: '금빛 ❓ 좀비를 잡으면 구구단 퀴즈! 맞히면 미사일이 강해져요.',
    how3: '화면을 누르거나 좌우로 끌면 캐릭터가 움직여요.',
    start: '시작!', again: '다시 하기', resume: '계속하기', pause: '일시정지', paused: '일시정지', over: '울타리가 무너졌어요!',
    wave: '{n} 웨이브', result: '{w} 웨이브 · 좀비 {k}마리 · {s}점', best: '🏆 최고 기록 {n}점', record: '🎉 새 기록!',
    quizTitle: '구구단 퀴즈!', quizRight: '정답! 업그레이드를 골라요', quizWrong: '아쉬워요, 정답은 {n}', quizLate: '시간이 지났어요! 정답은 {n}',
    pickTitle: '업그레이드 고르기', level: 'Lv {a} → {b}', allMax: '모든 미사일이 최고 레벨이에요!',
    bonusLine: '보너스 +{n} Sparkles', rewardTitle: '보상 고르기',
    rewardBonus: '+{n} Sparkles', rewardBonusDesc: '게임이 끝나면 받아요',
    rewardShield: '보호막', rewardShieldDesc: '울타리를 바로 고쳐요',
    rewardFriend: '{name} 부르기', rewardFriendDesc: '30초 동안 같이 싸워요',
    slow: '⏳ 좀비가 느려졌어요', repaired: '🛡 울타리를 고쳤어요', fence: '울타리',
    friendCome: '{name}이(가) 도와주러 왔어요!', friendBye: '{name}이(가) 돌아갔어요'
  },
  en: {
    title: 'Times Table Defense',
    how1: 'Your character fires missiles by itself. Stop the zombies before they break the fence!',
    how2: 'Defeat a golden ❓ zombie for a times table quiz. Get it right to power up!',
    how3: 'Tap or drag left and right to move your character.',
    start: 'Start!', again: 'Play again', resume: 'Resume', pause: 'Pause', paused: 'Paused', over: 'The fence fell!',
    wave: 'Wave {n}', result: 'Wave {w} · {k} zombies · {s} pts', best: '🏆 Best {n} pts', record: '🎉 New record!',
    quizTitle: 'Times table quiz!', quizRight: 'Correct! Pick an upgrade', quizWrong: 'So close! The answer is {n}', quizLate: "Time's up! The answer is {n}",
    pickTitle: 'Pick an upgrade', level: 'Lv {a} → {b}', allMax: 'Every missile upgrade is maxed!',
    bonusLine: 'Bonus +{n} Sparkles', rewardTitle: 'Pick a reward',
    rewardBonus: '+{n} Sparkles', rewardBonusDesc: 'Paid when the game ends',
    rewardShield: 'Shield', rewardShieldDesc: 'Repairs the fence now',
    rewardFriend: 'Call {name}', rewardFriendDesc: 'Fights with you for 30 seconds',
    slow: '⏳ Zombies slowed down', repaired: '🛡 Fence repaired', fence: 'Fence',
    friendCome: '{name} is here to help!', friendBye: '{name} went home'
  }
};

const FENCE_FROM_BOTTOM = 150;  /* 울타리 위치(아래에서 논리 px) */
/* 작은 울타리 2개: 배경의 두 흙길 위, 메인 울타리보다 BAR_ABOVE 위. 그 길로 오는 좀비는 이것부터 갉습니다. */
const BARS = [{ x: 105 }, { x: 266 }];
const BAR_PLANKS = 3;
const BAR_PW = 24;               /* 작은 울타리 판 너비(메인은 30) */
const BAR_ABOVE = 170;
const BAR_HP = 40;
const QUIZ_SEC = 5;              /* 퀴즈를 푸는 시간. 지나면 틀린 것으로 닫힘 */
const QUIZ_BONUS = 3;            /* 업그레이드를 다 채운 뒤 퀴즈 정답마다 Sparkles(서버 상한 BONUS_MAX) */
const FRIEND_SEC = 30;           /* 친구 부르기: 같이 싸우는 시간 */
const FRIEND_DX = 100;           /* 친구 자리: 캐릭터와의 간격 */
const HERO_SPEED = 260;          /* 캐릭터가 걷는 속도(논리 px/초) */
const HERO_MARGIN = 30;          /* 캐릭터가 갈 수 있는 양 끝 */
const SLOW_SEC = 10;
const REPAIR = 35;               /* 보호막으로 고치는 양 */
const MISSILE_SPEED = 320;        /* 미사일이 날아가는 속도(논리 px/초) */

const HTML = `
<div class="df-app">
  <canvas class="df-canvas"></canvas>
  <header class="df-hud">
    <span class="df-pill df-wave"></span>
    <span class="df-pill">${iconMarkup('star')} <b class="df-score">0</b></span>
    <span class="df-fence" role="meter" aria-valuemin="0" aria-valuemax="100" data-i18n-aria="fence"><i></i></span>
    <button type="button" class="df-pill df-sound" data-i18n-aria="sound"></button>
    <button type="button" class="df-pill df-pause" data-i18n-aria="pause">⏸️</button>
  </header>
  <div class="df-banner" aria-live="polite"></div>
  <div class="df-hero" aria-hidden="true"></div>
  <div class="df-friend" aria-hidden="true" hidden><b class="df-friend-time"></b><div class="df-friend-body"></div></div>
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
    <p data-show="start" data-i18n="how3"></p>
    <div class="df-quiz" data-show="quiz">
      <div class="df-qtimer"><i></i></div>
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

  const heroEl = $('.df-hero');
  const hero = ctx.character(heroEl, { body: true });
  /* 친구: 나를 뺀 프리셋(수지·지호·나연…) 중 하나. 한 번 다녀가면 다음 친구를 다시 뽑습니다. */
  const friendEl = $('.df-friend');
  const others = PRESETS.filter((k) => k !== ctx.look.key);
  let friendName = '';
  let friend = null;
  function pickFriend() {
    const key = others[Math.floor(Math.random() * others.length)];
    friendName = t(key);
    friend?.destroy();
    friend = ctx.character(friendEl.querySelector('.df-friend-body'), { body: true, key });
  }
  pickFriend();
  const cardHero = ctx.character($('.df-card-face'), { body: false });

  let best = Number(ctx.progress?.best) || 0;
  let W = WORLD_W;   /* 논리 좌표 너비(고정)·높이(화면 비율) */
  let H = 640;
  let scale = 1;
  let fenceY = H - FENCE_FROM_BOTTOM;
  let G = null;      /* 한 판 상태 */

  function newGame() {
    return {
      mode: 'play', t: 0, wave: 1, waveT: 0, spawnT: 1, quizT: QUIZ_EVERY * 0.6, cool: 0.4, friendCool: 0.6, friendUntil: 0,
      heroX: WORLD_W / 2, heroTo: WORLD_W / 2, keyDir: 0, bonus: 0,
      zombies: [], missiles: [], fx: [], fence: FENCE_HP, lv: {}, kills: 0, score: 0, slowUntil: 0,
      bars: BARS.map((b) => ({ ...b, hp: BAR_HP })),
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
    el.style.setProperty('--unit', scale + 'px');
    placeHeroes();
    if (!G || G.mode !== 'play') draw();
  }

  const barY = () => fenceY - BAR_ABOVE;

  /* 캐릭터(미사일 나가는 곳): 울타리 아래 가운데 */
  const gun = () => ({ x: G ? G.heroX : W / 2, y: fenceY + 52 });
  /* 친구는 캐릭터 왼쪽(오른쪽 아래는 아이템 버튼 자리), 캐릭터가 왼쪽 끝이면 오른쪽에 섭니다. */
  const friendX = () => (G.heroX - FRIEND_DX >= HERO_MARGIN ? G.heroX - FRIEND_DX : G.heroX + FRIEND_DX);

  /* 캐릭터 이동: 누르거나 끈 곳(heroTo)으로, 또는 ← → 키로 걸어갑니다. 그림은 DOM 이라 left 를 옮깁니다. */
  function moveHero(dt) {
    if (G.keyDir) G.heroTo = G.heroX + G.keyDir * 40;
    const to = Math.max(HERO_MARGIN, Math.min(W - HERO_MARGIN, G.heroTo));
    const step = HERO_SPEED * dt;
    G.heroX += Math.max(-step, Math.min(step, to - G.heroX));
    placeHeroes();
  }

  function placeHeroes() {
    heroEl.style.left = (G ? G.heroX : W / 2) * scale + 'px';
    if (G) friendEl.style.left = friendX() * scale + 'px';
  }

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
      /* 막는 것: 아직 지나지 않은, 부서지지 않은 작은 울타리가 앞에 있으면 그것, 아니면 메인 울타리 */
      const bar = G.bars.find((b) => b.hp > 0 && Math.abs(z.x - b.x) < (BAR_PLANKS * BAR_PW) / 2 + z.r * 0.3 && z.y <= barY() - z.r * 0.6);
      const stop = (bar ? barY() : fenceY) - z.r * 0.6;
      if (z.y < stop) {
        z.y = Math.min(stop, z.y + z.speed * slow * dt);
        z.x += Math.sin(G.t * 2 + z.phase) * 8 * dt;
        z.biting = false;
      } else {
        z.biting = true;
        if (bar) bar.hp = Math.max(0, bar.hp - ZOMBIES[z.type].bite * dt);
        else G.fence -= ZOMBIES[z.type].bite * dt;
      }
    }
    if (G.fence <= 0) { G.fence = 0; gameOver(); return; }

    /* 자동 발사: 울타리에 가장 가까운(아래쪽) 좀비를 노립니다. 다연발은 부채꼴로.
       친구가 와 있으면 친구도 같은 업그레이드로 쏘고, 두 번째로 가까운 좀비를 노립니다(하나뿐이면 같은 좀비). */
    const s = stats(G.lv);
    const order = G.zombies.filter((z) => z.y > -z.r).sort((a, b) => b.y - a.y);
    G.cool = fire(G.cool, gun(), order[0]);
    if (G.t < G.friendUntil) {
      G.friendCool = fire(G.friendCool, { x: friendX(), y: gun().y }, order[1] || order[0]);
      friendEl.querySelector('b').textContent = Math.ceil(G.friendUntil - G.t);
    } else if (!friendEl.hidden) {
      friendEl.hidden = true;
      say(t('friendBye', { name: friendName }));
      pickFriend();
    }

    function fire(cool, o, target) {
      if ((cool -= dt) > 0) return cool;
      if (!target) return 0.1;
      const base = Math.atan2(target.y - o.y, target.x - o.x);
      for (let i = 0; i < s.shots; i++) {
        const a = base + (i - (s.shots - 1) / 2) * 0.12;
        G.missiles.push({ x: o.x, y: o.y - 20, vx: Math.cos(a) * MISSILE_SPEED, vy: Math.sin(a) * MISSILE_SPEED, pierce: s.pierce, hit: new Set() });
      }
      ctx.audio.tone({ freq: 760, to: 380, dur: 0.05, type: 'square', gain: 0.025 });
      return s.interval;
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

  /* ---------- 그리기(그림: assets/games/defense/, 크기·프레임은 그 폴더의 manifest.json) ---------- */

  const ART = 'assets/games/defense/';
  const art = (f) => Object.assign(new Image(), { src: ART + f });
  const IMG = {
    bg: art('background.webp'), rail: art('fence-rail.png'), boom: art('explosion.png'),
    fence: [art('fence-intact.png'), art('fence-cracked.png'), art('fence-broken.png')],
    missile: [0, 1, 2, 3, 4, 5].map((n) => art(`missile-${n}.png`)),
    zombie: Object.fromEntries(Object.keys(ZOMBIES).map((k) => [k, art(`zombie-${k}.png`)]))
  };
  /* 좀비 스트립: 프레임 크기(px), 걷기 fps. 프레임 0~3 걷기, 4~5 갉기. */
  const SPRITE = { normal: [96, 8], fast: [80, 12], tank: [140, 8], quiz: [104, 8] };
  const ok = (im) => im.complete && im.naturalWidth > 0;

  function draw() {
    g.clearRect(0, 0, W, H);
    /* 배경: 들판(위 1120px)은 울타리까지, 마당(아래 480px)은 울타리부터 끝까지 늘려 붙입니다. */
    const yard = fenceY + 10;
    if (ok(IMG.bg)) {
      g.drawImage(IMG.bg, 0, 0, 720, 1120, 0, 0, W, yard);
      g.drawImage(IMG.bg, 0, 1120, 720, 480, 0, yard, W, H - yard);
    } else {
      g.fillStyle = '#7aa35d';
      g.fillRect(0, 0, W, yard);
      g.fillStyle = '#d8b67c';
      g.fillRect(0, yard, W, H - yard);
    }
    if (!G) { BARS.forEach((b) => drawBar({ ...b, hp: BAR_HP })); drawFence(FENCE_HP); return; }
    /* 작은 울타리 뒤(위)의 좀비 → 작은 울타리 → 나머지 좀비 → 메인 울타리 순서로 겹칩니다. */
    for (const z of G.zombies) if (z.y < barY()) drawZombie(z);
    for (const b of G.bars) drawBar(b);
    for (const z of G.zombies) if (z.y >= barY()) drawZombie(z);
    drawFence(G.fence);
    for (const m of G.missiles) drawMissile(m);
    /* 폭발: 8프레임(20fps) = fx 수명 0.4초 */
    for (const f of G.fx) {
      if (!ok(IMG.boom)) continue;
      const size = f.kind === 'blast' ? f.r * 2.4 : f.r * 3;
      g.drawImage(IMG.boom, Math.min(7, Math.floor(f.t * 20)) * 128, 0, 128, 128, f.x - size / 2, f.y - size / 2, size, size);
    }
  }

  function drawZombie(z) {
    const im = IMG.zombie[z.type];
    const [px, fps] = SPRITE[z.type];
    const frame = z.biting ? 4 + Math.floor(G.t * 8 + z.phase) % 2 : Math.floor(G.t * fps + z.phase) % 4;
    const size = z.r * 2.8;
    /* 앵커(0.5, 0.9) = 발. 좀비의 발은 중심(z.y)에서 반지름만큼 아래. */
    g.globalAlpha = z.hitT > 0 ? 0.55 : 1;
    if (ok(im)) g.drawImage(im, frame * px, 0, px, px, z.x - size / 2, z.y + z.r - size * 0.9, size, size);
    g.globalAlpha = 1;
    if (z.hp < z.maxHp) {
      const w = z.r * 1.6;
      const top = z.y + z.r - size * 0.9 - 2;
      g.fillStyle = 'rgba(0,0,0,.45)';
      g.fillRect(z.x - w / 2, top, w, 4);
      g.fillStyle = z.type === 'quiz' ? '#ffd54a' : '#ff5a5a';
      g.fillRect(z.x - w / 2, top, w * Math.max(0, z.hp / z.maxHp), 4);
    }
  }

  /* 울타리: 가로대 2개 위에 나무판 12장. 체력이 줄면 판이 정해진 순서로 금 가고(cracked) 부서집니다(broken). */
  const PLANK_ORDER = [5, 2, 9, 0, 7, 11, 3, 8, 1, 10, 4, 6];
  function drawFence(hp) {
    const n = 12;
    const pw = W / n;
    const ph = pw * 112 / 64;
    const bottom = fenceY + ph / 2;
    const lost = (1 - hp / FENCE_HP) * n;          /* 부서진 정도(판 개수 단위) */
    if (ok(IMG.rail)) {
      g.drawImage(IMG.rail, 0, fenceY - ph * 0.28, W, 10);
      g.drawImage(IMG.rail, 0, fenceY + ph * 0.18, W, 10);
    }
    for (let i = 0; i < n; i++) {
      const rank = PLANK_ORDER.indexOf(i);
      const im = IMG.fence[rank < lost - 1 ? 2 : rank < lost ? 1 : 0];
      if (ok(im)) g.drawImage(im, i * pw, bottom - ph, pw, ph);
    }
  }

  /* 작은 울타리: 판 3장. 체력 60% 아래면 금 가고, 0 이면 부서진 조각만 남습니다(더는 막지 않음). */
  function drawBar(b) {
    const ph = BAR_PW * 112 / 64;
    const left = b.x - (BAR_PLANKS * BAR_PW) / 2;
    const y = barY();
    const im = IMG.fence[b.hp <= 0 ? 2 : b.hp < BAR_HP * 0.6 ? 1 : 0];
    if (ok(IMG.rail) && b.hp > 0) {
      g.drawImage(IMG.rail, 0, 0, 120, 24, left - 4, y - ph * 0.28, BAR_PLANKS * BAR_PW + 8, 8);
      g.drawImage(IMG.rail, 0, 0, 120, 24, left - 4, y + ph * 0.18, BAR_PLANKS * BAR_PW + 8, 8);
    }
    if (ok(im)) for (let i = 0; i < BAR_PLANKS; i++) g.drawImage(im, left + i * BAR_PW, y + ph / 2 - ph, BAR_PW, ph);
  }

  /* 미사일: 공격력 레벨(0~5)마다 다른 그림, 오른쪽을 보는 그림을 날아가는 방향으로 돌립니다. */
  function drawMissile(m) {
    const im = IMG.missile[Math.min(5, G.lv.power || 0)];
    if (!ok(im)) return;
    g.save();
    g.translate(m.x, m.y);
    g.rotate(Math.atan2(m.vy, m.vx));
    g.drawImage(im, -14, -6, 28, 12);
    g.restore();
  }

  /* ---------- 화면 위 글자 ---------- */

  let bannerTimer = 0;
  function say(text) {
    setIconText(banner, text);
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
    b.replaceChildren(icon(on ? 'sound' : 'sound-muted'));
    b.setAttribute('aria-pressed', String(on));
  }

  /* ---------- 시작·일시정지·끝 ---------- */

  function showOverlay(mode) {
    overlay.dataset.mode = mode;
    overlay.hidden = false;
    $('.df-go').textContent = t(mode === 'start' ? 'start' : mode === 'over' ? 'again' : 'resume');
    setIconText($('.df-best'), t('best', { n: best }));
    $('.df-best').hidden = !best;
    if (G) $('.df-result').textContent = t('result', { w: G.wave, k: G.kills, s: G.score }) + (G.bonus ? ' · ' + t('bonusLine', { n: G.bonus }) : '');
    cardHero.expression(mode === 'over' ? (G.score > G.prevBest ? 'happy' : 'sad') : 'happy');
  }

  function startGame() {
    const ac = ctx.audio.context();
    if (ac && ac.state !== 'running') ac.resume().catch(() => {});
    G = newGame();
    friendEl.hidden = true;
    placeHeroes();
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
    ctx.finish({ stars: starsFor(G.wave), score: G.score, bonus: G.bonus, detail: { wave: G.wave, kills: G.kills, lv: G.lv, bonus: G.bonus } });
    draw();
    setTimeout(() => { if (G?.mode === 'over') showOverlay('over'); }, 900);
  }

  /* ---------- 퀴즈와 업그레이드 ---------- */

  function openQuiz() {
    G.mode = 'quiz';
    G.quiz = { ...makeQuiz(), left: QUIZ_SEC };
    const q = G.quiz;
    tickQuiz(0);
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

  /* 퀴즈 남은 시간: 막대를 줄이고, 다 되면 틀린 것으로(정답을 보여 주고 닫힘). 사는 팝업(hold) 동안은 멈춤. */
  function tickQuiz(dt) {
    const q = G.quiz;
    q.left = Math.max(0, q.left - dt);
    const bar = $('.df-qtimer i');
    bar.style.transform = `scaleX(${q.left / QUIZ_SEC})`;
    bar.classList.toggle('low', q.left < 2);
    if (!q.left) answerQuiz(null, null);
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
      /* 업그레이드를 다 채웠으면 업그레이드 대신 Sparkles 를 모아 두었다가 finish 의 bonus 로 받습니다. */
      if (!upgradeChoices(G.lv).length) {
        $('.df-quiz-msg').textContent = t('quizRight');
        setTimeout(openReward, 700);
        return;
      }
      $('.df-quiz-msg').textContent = t('quizRight');
      setTimeout(openPick, 700);
    } else {
      button?.classList.add('wrong');
      ctx.audio.wrong();
      hero.react('wrong');
      $('.df-quiz-msg').textContent = t(n === null ? 'quizLate' : 'quizWrong', { n: q.answer });
      setTimeout(() => { if (G?.mode === 'quiz') resume(); }, 1400);
    }
  }

  /*
   * 업그레이드를 다 채운 뒤의 퀴즈 보상: Sparkles(게임이 끝나면 finish 의 bonus 로) / 보호막 / 친구 부르기 중 하나.
   * 보호막·친구는 가방에 넣지 않고 바로 씁니다(지금 쓸 수 없으면 카드가 나오지 않음).
   */
  function openReward() {
    const cards = [
      ['bonus', 'assets/ui/sparkle.webp', t('rewardBonus', { n: QUIZ_BONUS }), t('rewardBonusDesc'), () => { G.bonus += QUIZ_BONUS; say(`✨ +${QUIZ_BONUS}`); }],
      needRepair() && ['shield', 'assets/ui/score-protection.webp', t('rewardShield'), t('rewardShieldDesc'), repair],
      G.t >= G.friendUntil && ['friend', 'assets/ui/call-friend.webp', t('rewardFriend', { name: friendName }), t('rewardFriendDesc'), callFriend]
    ].filter(Boolean);
    G.mode = 'pick';
    $('h1[data-show="pick"]').textContent = t('rewardTitle');
    $('.df-picks').replaceChildren(...cards.map(([, source, name, desc, use]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'df-pick';
      b.innerHTML = '<b></b><small></small><em></em>';
      b.prepend(iconFromSource(source, 'df-pick-icon'));
      b.querySelector('b').textContent = name;
      b.querySelector('small').textContent = desc;
      b.addEventListener('click', () => {
        ctx.audio.fanfare();
        resume();
        use();
        items.refresh();
      });
      return b;
    }));
    showOverlay('pick');
  }

  function openPick() {
    const ids = upgradeChoices(G.lv);
    if (!ids.length) {
      say(t('allMax'));
      resume();
      return;
    }
    G.mode = 'pick';
    $('h1[data-show="pick"]').textContent = t('pickTitle');
    $('.df-picks').replaceChildren(...ids.map((id) => {
      const u = UPGRADES[id];
      const lv = G.lv[id] || 0;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'df-pick';
      b.innerHTML = '<b></b><small></small><em></em>';
      b.prepend(iconFromSource(`${ART}icon-${id}.png`, 'df-pick-icon'));
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

  /* 보호막 효과(아이템·퀴즈 보상 공통): 메인 울타리를 고치고 작은 울타리는 새것으로 */
  const needRepair = () => G.fence < FENCE_HP || G.bars.some((b) => b.hp < BAR_HP);
  function repair() {
    G.fence = Math.min(FENCE_HP, G.fence + REPAIR);
    G.bars.forEach((b) => { b.hp = BAR_HP; });
    renderHud();
    say(t('repaired'));
  }

  /* 친구 부르기 효과(아이템·퀴즈 보상 공통): 친구가 FRIEND_SEC 초 동안 같이 쏩니다. */
  function callFriend() {
    G.friendUntil = G.t + FRIEND_SEC;
    G.friendCool = 0.3;
    friendEl.hidden = false;
    friend.react('correct');
    say(t('friendCome', { name: friendName }));
  }

  /* ---------- 아이템(공통: 모래시계·보호막·정답 알약·친구 부르기) ---------- */

  const items = ctx.itemBar($('.df-items'), {
    time: { can: () => G?.mode === 'play' && G.t >= G.slowUntil, apply() { G.slowUntil = G.t + SLOW_SEC; say(t('slow')); } },
    /* 보호막: 메인 울타리를 고치고 작은 울타리는 새것으로 */
    shield: { can: () => G?.mode === 'play' && needRepair(), apply: repair },
    /* 정답 알약: 퀴즈 중이면 정답 처리, 아니면 바로 업그레이드 고르기 */
    pill: {
      can: () => (G?.mode === 'play' || (G?.mode === 'quiz' && !G.quiz.done)) && upgradeChoices(G.lv).length > 0,
      apply() {
        if (G.mode === 'quiz') answerQuiz(G.quiz.answer, null);
        else openPick();
      }
    },
    /* 친구 부르기: 친구가 FRIEND_SEC 초 동안 같이 쏩니다. */
    friend: { can: () => G?.mode === 'play' && G.t >= G.friendUntil, apply: callFriend },
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
    if (G?.mode === 'play' && !G.hold) { moveHero(dt); update(dt); }
    else if (G?.mode === 'quiz' && !G.hold && !G.quiz.done) tickQuiz(dt);
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
  /* 누르거나 끈 곳의 가로 위치로 캐릭터가 갑니다(버튼·카드 위 누름은 그쪽이 받음). */
  const aim = (e) => { if (G?.mode === 'play' && !G.hold) G.heroTo = (e.clientX - el.getBoundingClientRect().left) / scale; };
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture?.(e.pointerId); aim(e); });
  canvas.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') aim(e); });
  const onKey = (e) => {
    if (!G || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    if (e.type === 'keydown') G.keyDir = dir;
    else if (G.keyDir === dir) { G.keyDir = 0; G.heroTo = G.heroX; }
    e.preventDefault();
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKey);
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
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKey);
      window.removeEventListener('resize', measure);
      if (G) G.mode = 'over';
    }
  };
}
