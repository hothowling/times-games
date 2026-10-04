/*
 * 수도 맞히기 - 국기와 나라 이름을 보고 수도를 4개 보기 중에서 고르는 게임.
 * 한 판 10문제, 문제마다 10초. 답한 뒤에는 그 수도의 사진을 보여 줍니다(사진만 보고 답을 알 수 없게).
 * 규칙과 나라 목록은 rules.js(DOM 없음), 사진 출처는 credits.js 에 있습니다.
 */
import { makeRound, pointsFor, starsFor, QUESTIONS, SECONDS } from './rules.js';
import { CREDITS } from './credits.js';

export const dict = {
  ko: {
    title: '수도 맞히기',
    how: '국기와 나라 이름을 보고 수도를 골라요. 빨리 맞힐수록 점수가 많아요!',
    level1: '쉬움', level2: '보통', level3: '어려움',
    ask: '{c}의 수도는?',
    count: '{n} / {m}',
    over: '다 풀었어요!',
    result: '{m}문제 중 {c}개 · {s}점',
    best: '🏆 최고 기록 {n}점',
    record: '🎉 새 기록!',
    again: '다시 하기',
    other: '단계 바꾸기',
    quit: '그만하기',
    city: '{city} · {country}',
    next: '다음 ▶'
  },
  en: {
    title: 'Capital Quiz',
    how: 'Look at the flag and country, then pick its capital. Faster answers score more!',
    level1: 'Easy', level2: 'Normal', level3: 'Hard',
    ask: 'Capital of {c}?',
    count: '{n} / {m}',
    over: 'All done!',
    result: '{c} of {m} correct · {s} pts',
    best: '🏆 Best {n} pts',
    record: '🎉 New record!',
    again: 'Play again',
    other: 'Change level',
    quit: 'Quit',
    city: '{city}, {country}',
    next: 'Next ▶'
  }
};

const SHOW_MS = 1100;   /* 정답 보기를 보여 준 뒤 사진으로 바꾸기까지 */
const PHOTO_MS = 3500;  /* 사진을 보여 주고 다음 문제로 넘어가기까지(누르면 바로 넘어감) */
const A = 'assets/games/capitals/';
const flagSrc = (c) => `${A}flags/${c.code.toLowerCase()}.svg`;
const photoSrc = (c) => `${A}cities/${c.code.toLowerCase()}.webp`;

const HTML = `
<div class="cq-app">
  <header class="cq-hud">
    <button type="button" class="cq-pill cq-quit" data-i18n-aria="quit">✕</button>
    <span class="cq-pill cq-count"></span>
    <span class="cq-pill">⭐ <b class="cq-score">0</b></span>
    <button type="button" class="cq-pill cq-sound" data-i18n-aria="sound"></button>
  </header>
  <div class="cq-timer"><i></i></div>
  <main class="cq-stage">
    <div class="cq-face" aria-hidden="true"></div>
    <img class="cq-flag" alt="">
    <h2 class="cq-ask" aria-live="polite"></h2>
  </main>
  <button type="button" class="cq-photo" hidden>
    <img alt="">
    <b class="cq-city"></b>
    <small class="cq-credit"></small>
    <span class="cq-next" data-i18n="next"></span>
  </button>
  <div class="cq-choices">${'<button type="button" class="cq-choice"></button>'.repeat(4)}</div>
</div>
<div class="cq-overlay" data-mode="start">
  <div class="cq-card">
    <h1><span data-show="start" data-i18n="title"></span><span data-show="over" data-i18n="over"></span></h1>
    <div class="cq-card-face" aria-hidden="true"></div>
    <p class="cq-record" data-show="over" data-i18n="record"></p>
    <p class="cq-result" data-show="over"></p>
    <p class="cq-best"></p>
    <p data-show="start" data-i18n="how"></p>
    <div class="cq-levels" data-show="start">
      <button type="button" class="cq-main" data-level="1" data-i18n="level1"></button>
      <button type="button" class="cq-main" data-level="2" data-i18n="level2"></button>
      <button type="button" class="cq-main" data-level="3" data-i18n="level3"></button>
    </div>
    <button type="button" class="cq-main cq-again" data-show="over" data-i18n="again"></button>
    <button type="button" class="cq-sub cq-other" data-show="over" data-i18n="other"></button>
    <button type="button" class="cq-sub cq-lobby" data-i18n="goLobby"></button>
  </div>
</div>`;

export function mount(el, ctx) {
  el.innerHTML = HTML;
  ctx.apply(el);
  const $ = (sel) => el.querySelector(sel);
  const t = ctx.t;
  const lang = ctx.lang;
  const buttons = [...el.querySelectorAll('.cq-choice')];
  const overlay = $('.cq-overlay');
  const bar = $('.cq-timer i');
  const photo = $('.cq-photo');

  const hero = ctx.character($('.cq-face'), { body: false });
  const cardHero = ctx.character($('.cq-card-face'), { body: false });

  let best = Number(ctx.progress?.best) || 0;
  let S = null;        /* 한 판 상태 */
  let tick = 0;        /* 남은 시간 타이머 */
  let next = 0;        /* 다음 문제 타이머 */

  function renderSound() {
    const b = $('.cq-sound');
    const on = ctx.audio.getSound();
    b.textContent = on ? '🔊' : '🔇';
    b.setAttribute('aria-pressed', String(on));
  }

  function renderBest() {
    $('.cq-best').textContent = t('best', { n: best });
    $('.cq-best').hidden = !best;
  }

  function showOverlay(mode) {
    overlay.dataset.mode = mode;
    overlay.hidden = false;
    renderBest();
    cardHero.expression(mode === 'over' && S.correct < 5 ? 'sad' : 'happy');
  }

  function start(level) {
    const ac = ctx.audio.context();
    if (ac && ac.state !== 'running') ac.resume().catch(() => {});
    S = { level, round: makeRound(level), i: -1, correct: 0, score: 0, prevBest: best };
    overlay.hidden = true;
    overlay.classList.remove('new-best');
    ask();
  }

  function ask() {
    S.i++;
    if (S.i >= S.round.length) { photo.hidden = true; return end(); }
    const q = S.round[S.i];
    S.left = SECONDS;
    S.locked = false;
    photo.hidden = true;
    hero.expression('neutral');
    /* 이번 문제의 사진과 다음 문제의 국기를 미리 받아 둡니다. */
    new Image().src = photoSrc(q.answer);
    if (S.round[S.i + 1]) new Image().src = flagSrc(S.round[S.i + 1].answer);
    $('.cq-count').textContent = t('count', { n: S.i + 1, m: QUESTIONS });
    $('.cq-score').textContent = S.score;
    $('.cq-flag').src = flagSrc(q.answer);
    $('.cq-ask').textContent = t('ask', { c: q.answer.name[lang] });
    buttons.forEach((b, k) => {
      b.textContent = q.choices[k].capital[lang];
      b.className = 'cq-choice';
      b.disabled = false;
    });
    renderTimer();
    /* 탭을 떠나면 타이머가 느려지는데, 한 번에 0.1초까지만 빼서 그동안은 사실상 멈춥니다. */
    let last = performance.now();
    clearInterval(tick);
    tick = setInterval(() => {
      const now = performance.now();
      S.left -= Math.min(0.1, (now - last) / 1000);
      last = now;
      renderTimer();
      if (S.left <= 0) answer(-1);
    }, 100);
  }

  function renderTimer() {
    bar.style.transform = `scaleX(${Math.max(0, S.left) / SECONDS})`;
    bar.classList.toggle('low', S.left < 3);
  }

  /* k = 누른 보기 번호, -1 = 시간 초과. 정답 보기는 늘 초록으로 보여 줍니다. */
  function answer(k) {
    if (S.locked) return;
    S.locked = true;
    clearInterval(tick);
    const q = S.round[S.i];
    const right = q.choices.indexOf(q.answer);
    buttons.forEach((b) => { b.disabled = true; });
    buttons[right].classList.add('right');
    if (k === right) {
      S.correct++;
      S.score += pointsFor(S.level, S.left);
      $('.cq-score').textContent = S.score;
      ctx.audio.correct();
      hero.react('correct');
    } else {
      if (k >= 0) buttons[k].classList.add('wrong');
      if (k < 0) ctx.audio.timeout(); else ctx.audio.wrong();
      hero.react(k < 0 ? 'timeout' : 'wrong');
    }
    next = setTimeout(showPhoto, SHOW_MS);
  }

  /* 정답 도시 사진과 출처(CC 라이선스는 작가·라이선스 표시 필요). 누르거나 시간이 지나면 다음 문제. */
  function showPhoto() {
    const c = S.round[S.i].answer;
    const [artist, license] = CREDITS[c.code];
    photo.querySelector('img').src = photoSrc(c);
    $('.cq-city').textContent = t('city', { city: c.capital[lang], country: c.name[lang] });
    $('.cq-credit').textContent = `📷 ${artist} / Wikimedia Commons · ${license}`;
    photo.hidden = false;
    next = setTimeout(ask, PHOTO_MS);
  }

  function end() {
    if (S.score > best) {
      best = S.score;
      ctx.saveProgress({ best });
    }
    const stars = starsFor(S.correct);
    if (stars) ctx.audio.fanfare();
    $('.cq-result').textContent = t('result', { m: QUESTIONS, c: S.correct, s: S.score });
    overlay.classList.toggle('new-best', S.score > S.prevBest);
    ctx.finish({ stars, score: S.score, detail: { level: S.level, correct: S.correct } });
    showOverlay('over');
  }

  function stop() {
    clearInterval(tick);
    clearTimeout(next);
  }

  buttons.forEach((b, k) => b.addEventListener('click', () => answer(k)));
  photo.addEventListener('click', () => { clearTimeout(next); ask(); });
  el.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => start(Number(b.dataset.level))));
  $('.cq-again').addEventListener('click', () => start(S.level));
  $('.cq-other').addEventListener('click', () => showOverlay('start'));
  $('.cq-lobby').addEventListener('click', () => ctx.exit());
  /* 판 중간에 그만두면 결과 없이 시작 화면으로 돌아갑니다. */
  $('.cq-quit').addEventListener('click', () => { stop(); photo.hidden = true; showOverlay('start'); });
  $('.cq-sound').addEventListener('click', () => { ctx.setSound(!ctx.audio.getSound()); renderSound(); });

  renderSound();
  showOverlay('start');
  return { destroy: stop };
}
