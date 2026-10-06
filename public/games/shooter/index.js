import { icon, iconMarkup, setIconText } from '../../core/icons.js';
/*
 * 구구단 슈터 - 떨어지는 구구단 식의 답을 골라 미사일로 터뜨리는 게임.
 * 규칙 함수는 rules.js(DOM 없음), 여기는 화면과 게임 루프입니다.
 * 원본: times-shooter/game.js. 언어·캐릭터·저장은 플랫폼 ctx 를 씁니다.
 */
import { roundConfig, makeQuestion, makeChoices, starsFor } from './rules.js';

export const dict = {
  ko: {
    title: '구구단 슈터', /* 로비 제목과 맞춤(원본: 구구단 슈팅) */
    start: '시작!',
    again: '다시 하기',
    how1: '떨어지는 구구단의 답을 누르면 미사일이 날아가요!',
    how2: '바닥에 닿거나, 틀린 답을 3번 연달아 누르면 하트가 하나 사라져요.',
    round: '{n} 라운드',
    over: '게임 끝!',
    result: '점수 {s} · {n} 라운드',
    lives: '하트 {n}개',
    pause: '일시정지',
    paused: '일시정지',
    resume: '계속하기',
    best: '🏆 최고 기록 {n}',
    record: '🎉 새 기록!'
  },
  en: {
    title: 'Times Table Shooter',
    start: 'Start!',
    again: 'Play again',
    how1: 'Tap the right answer to fire a rocket at the falling problem!',
    how2: 'You lose a heart if a problem hits the ground or you tap 3 wrong answers in a row.',
    round: 'Round {n}',
    over: 'Game over!',
    result: 'Score {s} · Round {n}',
    lives: '{n} hearts',
    pause: 'Pause',
    paused: 'Paused',
    resume: 'Resume',
    best: '🏆 Best {n}',
    record: '🎉 New record!'
  }
};

const LIVES = 5;
const MISSILE_SEC = 0.35;  /* 미사일이 날아가는 시간 */
const RELOAD_SEC = 0.25;   /* 발사 직후 잠깐 쉼: 두 번 눌러 새 보기를 잘못 누르지 않게 */
const WRONG_SEC = 0.6;     /* 오답 뒤 쉼: 아무 버튼이나 마구 누르지 않게 */
const WRONGS_PER_HEART = 3; /* 오답을 이만큼 연달아 누르면 하트 하나를 잃습니다 */
const BANNER_SEC = 1.6;    /* 라운드 안내가 보이는 동안은 문제를 내지 않습니다 */
const SLOW = 0.5;         /* 모래시계를 쓴 동안 떨어지는 속도 배수 */
const SLOW_SEC = 10;
const COLORS = ['#ffd54a', '#ff9ec0', '#7ee0c3', '#9fd3ff', '#ffb870'];

const HTML = `
<div class="sh-app">
  <header class="sh-hud hud-bar">
    <span class="hud-pill sh-round"></span>
    <span class="hud-pill">${iconMarkup('star')}<b class="sh-score">0</b></span>
    <button type="button" class="hud-btn hud-push sh-sound" data-i18n-aria="sound"></button>
    <button type="button" class="hud-btn sh-pause" data-i18n-aria="pause"><span class="hud-pause" aria-hidden="true"></span></button>
  </header>
  <div class="sh-banner" aria-live="polite"></div>
  <footer class="sh-panel">
    <div class="sh-hero" aria-hidden="true"><div class="sh-face"></div></div>
    <div class="sh-items"></div>
    <div class="sh-hearts" role="img">${iconMarkup('heart-full').repeat(LIVES)}</div>
    <div class="sh-choices">${'<button type="button" class="choice"></button>'.repeat(5)}</div>
  </footer>
  <div class="sh-layer" aria-hidden="true"></div>
</div>
<div class="sh-overlay" data-mode="start">
  <div class="card">
    <h1><span data-show="start" data-i18n="title"></span><span data-show="over" data-i18n="over"></span><span data-show="pause" data-i18n="paused"></span></h1>
    <div class="card-face" aria-hidden="true"></div>
    <p class="record" data-show="over" data-i18n="record"></p>
    <p class="result" data-show="over pause"></p>
    <p class="best"></p>
    <p data-show="start" data-i18n="how1"></p>
    <p data-show="start" data-i18n="how2"></p>
    <button type="button" class="btn-main sh-go"><span data-show="start" data-i18n="start"></span><span data-show="over" data-i18n="again"></span><span data-show="pause" data-i18n="resume"></span></button>
    <button type="button" class="btn-home sh-quit" data-i18n="goLobby"></button>
  </div>
</div>`;

export function mount(el, ctx) {
  el.innerHTML = HTML;
  ctx.apply(el);
  const $ = (sel) => el.querySelector(sel);
  const app = $('.sh-app');
  const layer = $('.sh-layer');
  const face = $('.sh-face');
  const hearts = $('.sh-hearts');
  const choices = $('.sh-choices');
  const buttons = [...choices.children];
  const banner = $('.sh-banner');
  const overlay = $('.sh-overlay');
  const t = ctx.t;

  /* 캐릭터: 아래 언덕의 얼굴과 카드 속 얼굴. 표정을 직접 고르므로 대기 중 웃음은 끕니다. */
  const hero = ctx.character(face, { body: true });
  const cardHero = ctx.character($('.card-face'), { body: true });
  hero.expression('neutral');

  let best = Number(ctx.progress?.best) || 0;  /* 최고 점수(서버 진행도) */
  let savedBest = best;
  let S = newState();

  function newState() {
    return {
      playing: false, paused: false, t: 0, round: 1, cfg: roundConfig(1), score: 0, hits: 0, lives: LIVES,
      wrongs: 0,       /* 연달아 누른 오답 수: 정답을 맞히거나 하트를 잃으면 0 */
      prevBest: best,  /* 이번 판을 시작할 때의 최고 점수: 넘으면 '새 기록' */
      eqs: [], missiles: [], target: null,
      hold: false,     /* 아이템을 사는 동안(팝업) 잠깐 멈춤 */
      slowUntil: 0,    /* 모래시계: 이 게임 시간까지 떨어지는 속도 절반 */
      spawned: 0, nextSpawn: 0, readyAt: 0, lockUntil: 0, lastX: Math.random()
    };
  }

  /* 최고 기록이 오른 경우에만 서버에 저장합니다(게임 끝, 일시정지, 나가기). */
  function saveBest() {
    if (best <= savedBest) return;
    savedBest = best;
    ctx.saveProgress({ best });
  }

  function renderHud() {
    $('.sh-round').textContent = t('round', { n: S.round });
    $('.sh-score').textContent = S.score;
    $('.result').textContent = t('result', { s: S.score, n: S.round });
    setIconText($('.best'), t('best', { n: best }));
    $('.best').hidden = !best;
  }

  /* 오답이 쌓이면 다음에 잃을 하트(남은 것 중 맨 오른쪽)가 흐려지고(1번) 깜박입니다(2번). */
  function renderHearts() {
    for (let i = 0; i < LIVES; i++) {
      const h = hearts.children[i];
      h.classList.toggle('lost', i >= S.lives);
      h.classList.toggle('hurt1', i === S.lives - 1 && S.wrongs === 1);
      h.classList.toggle('hurt2', i === S.lives - 1 && S.wrongs >= 2);
    }
    hearts.setAttribute('aria-label', t('lives', { n: S.lives }));
  }

  function renderSound() {
    const b = $('.sh-sound');
    const on = ctx.audio.getSound();
    b.replaceChildren(icon(on ? 'sound' : 'sound-muted'));
    b.setAttribute('aria-pressed', String(on));
  }

  /* 보기 5개는 과녁(바닥에 가장 가까운 식)의 답으로 만듭니다. 과녁이 없으면 비워 둡니다. */
  function renderChoices() {
    const nums = S.target ? makeChoices(S.target.a, S.target.b) : null;
    buttons.forEach((b, i) => {
      b.textContent = nums ? nums[i] : '';
      b.disabled = !nums;
      b.classList.remove('no');
    });
  }

  /* ---------- 효과음 (WebAudio, 파일 없음). 플랫폼의 AudioContext 하나를 같이 씁니다 ---------- */

  /* iOS 는 사용자가 누른 순간에 깨워야 소리가 납니다(suspended, 또는 다른 앱에 다녀온 뒤의 interrupted). */
  function unlockAudio() {
    const ac = ctx.audio.context();
    if (ac && ac.state !== 'running') ac.resume().catch(() => {});
  }

  function tone(from, to, sec, type, vol, at) {
    const ac = ctx.audio.context();
    if (!ac || !ctx.audio.getSound()) return;
    const t0 = ac.currentTime + (at || 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(to, t0 + sec);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + sec);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + sec);
  }

  function noise(sec, vol) {
    const ac = ctx.audio.context();
    if (!ac || !ctx.audio.getSound()) return;
    const len = Math.floor(ac.sampleRate * sec);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = ac.createBufferSource();
    const gain = ac.createGain();
    src.buffer = buf;
    gain.gain.value = vol;
    src.connect(gain);
    gain.connect(ac.destination);
    src.start();
  }

  const sfx = {
    shoot: () => tone(300, 1200, 0.18, 'square', 0.05),
    boom: () => { noise(0.45, 0.4); tone(160, 40, 0.4, 'sine', 0.35); },
    wrong: () => tone(220, 110, 0.25, 'sawtooth', 0.08),
    miss: () => tone(520, 130, 0.55, 'triangle', 0.22),
    clear: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.16, i * 0.12)),
    over: () => [392, 330, 262].forEach((f, i) => tone(f, f, 0.35, 'triangle', 0.16, 0.5 + i * 0.3))
  };

  /* ---------- 캐릭터 ---------- */

  let moodTimer = 0;

  /* 웃음(happy)/찡그림(angry)을 sec 초 동안 보여 주고 무표정으로 돌아갑니다. */
  function mood(name, sec) {
    clearTimeout(moodTimer);
    hero.expression(name);
    moodTimer = setTimeout(() => hero.expression('neutral'), sec * 1000);
  }

  /* 한 번 재생하는 애니메이션 클래스를 뗐다 붙여 처음부터 다시 재생합니다. */
  function replay(node, cls) {
    node.classList.remove('show', 'kick', 'shake');
    void node.offsetWidth;
    node.classList.add(cls);
  }

  function removeAfter(node) {
    node.addEventListener('animationend', () => node.remove());
  }

  /* ---------- 배치: 식의 위치는 0~1 비율로 두고 화면 크기에 맞춰 픽셀로 바꿉니다 ---------- */

  let W = 0;
  let TOP = 0;
  let GROUND = 0;
  let HX = 0;
  let HY = 0;

  function measure() {
    const a = app.getBoundingClientRect();
    const h = face.getBoundingClientRect();
    W = a.width;
    TOP = $('.sh-hud').getBoundingClientRect().bottom - a.top + 4;
    GROUND = $('.sh-panel').getBoundingClientRect().top - a.top;
    HX = h.left + h.width / 2 - a.left;
    HY = h.top + h.height * 0.25 - a.top;
  }

  function place(e) {
    e.px = 8 + e.x * (W - 16 - e.w);
    e.py = TOP + e.y * (GROUND - TOP - e.h);
    e.el.style.translate = e.px + 'px ' + e.py + 'px';
  }

  /* ---------- 게임 ---------- */

  /* 새 판 상태로 되돌립니다. */
  function reset() {
    layer.textContent = '';
    S = newState();
    app.classList.remove('paused');
    renderHud();
    renderHearts();
    renderChoices();
  }

  function startGame() {
    unlockAudio();
    reset();
    S.playing = true;
    overlay.hidden = true;
    measure();
    startRound(1);
  }

  /* mode: 'start' | 'over' | 'pause' (HTML 의 data-show 참고). 카드 속 얼굴 표정도 함께 바꿉니다. */
  function showOverlay(mode) {
    const newBest = mode === 'over' && S.score > S.prevBest;
    overlay.setAttribute('data-mode', mode);
    overlay.classList.toggle('new-best', newBest);
    cardHero.expression(mode === 'pause' ? 'neutral' : mode === 'over' && !newBest ? 'angry' : 'happy');
    overlay.hidden = false;
  }

  /* 게임 시간(S.t)이 멈추므로 떨어지는 식, 미사일, 다음 문제가 모두 그 자리에서 기다립니다. */
  function pause() {
    if (!S.playing || S.paused) return;
    S.paused = true;
    app.classList.add('paused');
    showOverlay('pause');
    saveBest();
  }

  function resume() {
    unlockAudio();
    S.paused = false;
    app.classList.remove('paused');
    overlay.hidden = true;
  }

  function startRound(n) {
    S.round = n;
    S.cfg = roundConfig(n);
    S.spawned = 0;
    S.readyAt = S.nextSpawn = S.t + BANNER_SEC;
    banner.textContent = t('round', { n });
    replay(banner, 'show');
    renderHud();
  }

  function spawn() {
    let q;
    do {
      q = makeQuestion(S.cfg.maxDan);
    } while (S.eqs.some((e) => e.a === q.a && e.b === q.b));
    const node = document.createElement('div');
    node.className = 'eq';
    node.style.setProperty('--c', COLORS[S.spawned % COLORS.length]);
    node.innerHTML = q.a + ' × ' + q.b + ' = <b>?</b>';
    layer.appendChild(node);
    /* 바로 앞 문제와 가로로 30% 이상 떨어진 곳에서 나오게 합니다. */
    S.lastX = (S.lastX + 0.3 + Math.random() * 0.4) % 1;
    S.eqs.push({ a: q.a, b: q.b, ans: q.a * q.b, el: node, x: S.lastX, y: 0, w: node.offsetWidth, h: node.offsetHeight, state: 'fall' });
    S.spawned++;
    S.nextSpawn = S.t + S.cfg.gapSec;
  }

  function onChoice(ev) {
    const btn = ev.currentTarget;
    const n = Number(btn.textContent);
    if (!S.playing || S.paused || S.t < S.lockUntil) return;
    /* 같은 답의 식이 여러 개면 바닥에 가장 가까운 것을 맞힙니다. */
    let hit = null;
    for (const e of S.eqs) {
      if (e.state === 'fall' && e.ans === n && (!hit || e.y > hit.y)) hit = e;
    }
    if (hit) {
      S.wrongs = 0;
      renderHearts();
      fire(hit);
      S.lockUntil = S.t + RELOAD_SEC;
      return;
    }
    btn.classList.add('no');
    btn.disabled = true;
    S.lockUntil = S.t + WRONG_SEC;
    if (++S.wrongs >= WRONGS_PER_HEART) {
      loseLife();
      return;
    }
    renderHearts();
    sfx.wrong();
    mood('angry', WRONG_SEC);
    replay(face, 'shake');
  }

  /* 과녁 = 바닥에 가장 가까운 떨어지는 식. 과녁이 바뀌었거나 force 면 보기를 새로 뽑습니다. */
  function retarget(force) {
    let target = null;
    for (const e of S.eqs) {
      if (e.state === 'fall' && (!target || e.y > target.y)) target = e;
    }
    if (target === S.target && !force) return;
    if (S.target) S.target.el.classList.remove('target');
    if (target) target.el.classList.add('target');
    S.target = target;
    renderChoices();
  }

  function fire(e) {
    e.state = 'locked';
    e.el.classList.add('locked');
    retarget(true);
    const node = document.createElement('div');
    node.className = 'missile';
    node.textContent = '🚀';
    layer.appendChild(node);
    /* 🚀 그림은 오른쪽 위(-45°)를 보고 있어서 45°를 더해 과녁 쪽으로 돌립니다. */
    const rot = Math.atan2(e.py + e.h / 2 - HY, e.px + e.w / 2 - HX) * 180 / Math.PI + 45;
    S.missiles.push({ el: node, e, t0: S.t, rot });
    sfx.shoot();
    mood('happy', 0.8);
    replay(face, 'kick');
  }

  /* 미사일이 닿으면 식이 완성되고(? → 답) 터집니다. */
  function explode(e) {
    e.state = 'dead';
    e.el.querySelector('b').textContent = e.ans;
    e.el.classList.add('boom');
    removeAfter(e.el);
    burst(e.px + e.w / 2, e.py + e.h / 2);
    addFx('plus', e.px + e.w / 2, e.py, '').textContent = '+10';
    S.score += 10;
    S.hits++;
    if (S.score > best) best = S.score;
    renderHud();
    sfx.boom();
  }

  function burst(x, y) {
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const d = 70 + Math.random() * 50;
      addFx('spark', x, y, '--dx:' + Math.cos(a) * d + 'px;--dy:' + Math.sin(a) * d + 'px;background:' + COLORS[i % COLORS.length]);
    }
  }

  function addFx(cls, x, y, css) {
    const node = document.createElement('i');
    node.className = cls;
    node.style.cssText = 'left:' + x + 'px;top:' + y + 'px;' + css;
    layer.appendChild(node);
    removeAfter(node);
    return node;
  }

  /* 바닥에 닿으면 정답을 보여 주고 하트 하나를 잃습니다. */
  function land(e) {
    e.state = 'dead';
    e.el.querySelector('b').textContent = e.ans;
    e.el.classList.add('miss');
    removeAfter(e.el);
    loseLife();
  }

  /* 하트 하나를 잃습니다(바닥에 닿았거나 오답을 연달아 3번). 쌓인 오답도 그 하트와 함께 없어집니다. */
  function loseLife() {
    S.lives--;
    S.wrongs = 0;
    renderHearts();
    sfx.miss();
    mood('angry', 1.2);
    replay(face, 'shake');
    if (!S.lives) gameOver();
  }

  let overTimer = 0;

  /* 한 판 끝: 결과를 플랫폼에 한 번 보고하고(별 = 깬 라운드 수, rules.js 참고) 최고 기록을 저장합니다. */
  function gameOver() {
    S.playing = false;
    S.target = null;
    renderChoices();
    sfx.over();
    saveBest();
    ctx.finish({ stars: starsFor(S.round - 1), score: S.score, detail: { round: S.round, hits: S.hits, best } });
    overTimer = setTimeout(() => showOverlay('over'), 1500);
  }

  function update(dt) {
    S.t += dt;
    const cfg = S.cfg;
    const falling = S.eqs.filter((e) => e.state === 'fall').length;
    /* 라운드 안내가 끝난 뒤, 간격이 지났거나 풀 문제가 없으면 다음 문제를 냅니다. */
    if (S.t >= S.readyAt && S.spawned < cfg.count && (S.t >= S.nextSpawn || !falling)) spawn();

    for (const e of S.eqs) {
      if (e.state === 'fall') e.y = Math.min(1, e.y + dt * (S.t < S.slowUntil ? SLOW : 1) / cfg.fallSec);
      place(e);
      if (e.state === 'fall' && e.y >= 1 && S.playing) land(e);
    }
    if (!S.playing) return;

    S.missiles = S.missiles.filter((m) => {
      const p = (S.t - m.t0) / MISSILE_SEC;
      if (p >= 1) {
        m.el.remove();
        explode(m.e);
        return false;
      }
      const k = p * p; /* 점점 빨라지게 */
      const x = HX + (m.e.px + m.e.w / 2 - HX) * k;
      const y = HY + (m.e.py + m.e.h / 2 - HY) * k;
      m.el.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + m.rot + 'deg)';
      return true;
    });

    S.eqs = S.eqs.filter((e) => e.state !== 'dead');
    retarget(false);
    choices.classList.toggle('wait', S.t < S.lockUntil);

    if (S.spawned >= cfg.count && !S.eqs.length) {
      sfx.clear();
      mood('happy', 1.5);
      startRound(S.round + 1);
    }
  }

  let last = 0;
  let raf = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    /* 다른 앱/탭에 다녀오면 시간이 크게 튀므로 한 프레임은 0.05초까지만 셉니다(그동안 사실상 일시정지). */
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (S.playing && !S.paused && !S.hold) update(dt);
    app.classList.toggle('slow', S.t < S.slowUntil);
  }

  /* 아이템(공통: 모래시계·보호막). 사는 동안(팝업)은 게임 시간을 멈춥니다. */
  const playing = () => S.playing && !S.paused;
  const itemBar = ctx.itemBar($('.sh-items'), {
    time: { can: () => playing() && S.t >= S.slowUntil, apply: () => { S.slowUntil = S.t + SLOW_SEC; } },
    shield: { can: () => playing() && S.lives < LIVES, apply: () => { S.lives++; renderHearts(); } },
    pause: () => { S.hold = true; },
    resume: () => { S.hold = false; }
  });
  const itemTimer = setInterval(() => itemBar.refresh(), 500);

  /* 다른 앱이나 탭으로 가면 멈춰 두었다가, 돌아와서 '계속하기'로 이어 합니다. */
  const onVisibility = () => { if (document.hidden) pause(); };

  buttons.forEach((b) => b.addEventListener('click', onChoice));
  $('.sh-go').addEventListener('click', () => {
    if (S.paused) resume();
    else startGame();
  });
  $('.sh-quit').addEventListener('click', () => ctx.exit());
  $('.sh-pause').addEventListener('click', pause);
  $('.sh-sound').addEventListener('click', () => {
    ctx.setSound(!ctx.audio.getSound());
    renderSound();
    unlockAudio();
  });
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', measure);

  reset();
  renderSound();
  showOverlay('start');
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(itemTimer);
      clearTimeout(moodTimer);
      clearTimeout(overTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', measure);
      saveBest();
      S.playing = false;
    }
  };
}
