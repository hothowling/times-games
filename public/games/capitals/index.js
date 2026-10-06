import { icon, iconMarkup, setIconText } from '../../core/icons.js';
/*
 * 수도 맞히기 - 국기와 나라 이름을 보고 수도를 4개 보기 중에서 고르는 게임.
 * 한 판 10문제, 문제마다 10초. 답한 뒤에는 그 수도의 사진을 보여 줍니다(사진만 보고 답을 알 수 없게).
 * 사진을 보여 줄 때 "<나라>의 수도는 <수도>." 를 지금 언어로 읽어 주고(voices.js 의 MeloTTS 녹음 → 없으면 speechSynthesis),
 * 다 읽은 뒤 다음 문제로 넘어갑니다. 사진(다음 ▶)을 누르면 읽기를 멈추고 바로 넘어갑니다.
 * 규칙과 나라 목록은 rules.js(DOM 없음), 사진 출처는 credits.js, 녹음 목록은 voices.js(자동 생성) 에 있습니다.
 */
import { makeRound, pointsFor, starsFor, judge, QUESTIONS, SECONDS } from './rules.js';
import { CREDITS } from './credits.js';
import { VOICES } from './voices.js';

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
    tipHint: "💡 '{c}'(으)로 시작해요",
    tipTime: '⏳ 이번 문제는 시간이 멈췄어요',
    tipShield: '🛡 보호막: 이번 판에서 한 번 틀려도 괜찮아요',
    tipSaved: '🛡 보호막이 지켜 줬어요!',
    tipPill: '💊 반짝이는 게 정답이에요 (이번 판은 별 2개까지)',
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
    tipHint: "💡 It starts with '{c}'",
    tipTime: '⏳ Time is frozen for this question',
    tipShield: '🛡 Shield: one mistake is OK this round',
    tipSaved: '🛡 Your shield saved you!',
    tipPill: '💊 The glowing one is right (max 2 stars this round)',
    next: 'Next ▶'
  }
};

const SHOW_MS = 1100;   /* 정답 보기를 보여 준 뒤 사진으로 바꾸기까지 */
const PHOTO_MS = 3500;  /* 사진을 보여 주는 최소 시간(누르면 바로 넘어감) */
const AFTER_SAY_MS = 700;  /* 다 읽은 뒤 다음 문제까지 조금 쉬기 */
const PHOTO_MAX_MS = 9000; /* 읽기가 끝나지 않아도(멈춤 등) 이만큼 지나면 다음 문제 */
const A = 'assets/games/capitals/';
const flagSrc = (c) => `${A}flags/${c.code.toLowerCase()}.svg`;
const photoSrc = (c) => `${A}cities/${c.code.toLowerCase()}.webp`;
const HAS_VOICE = { en: new Set(VOICES.en), ko: new Set(VOICES.ko) };
export const voiceFor = (c, l) => {
  const id = c.code.toLowerCase();
  return HAS_VOICE[l]?.has(id) ? `assets/voice/capitals/${l}/${id}.m4a` : '';
};
/* 읽을 문장(녹음이 없을 때 speechSynthesis 가 읽는 글자). 녹음은 scripts/gen-capital-voices.mjs 가 만듭니다. */
export const sentenceFor = (c, l) => {
  const cap = c.capital[l].replace(/\.$/, '');
  return l === 'ko' ? `${c.name.ko}의 수도는 ${cap}.` : `The capital of ${c.name.en} is ${cap}.`;
};

const HTML = `
<div class="cq-app">
  <header class="cq-hud">
    <button type="button" class="cq-pill cq-quit" data-i18n-aria="quit">✕</button>
    <span class="cq-pill cq-count"></span>
    <span class="cq-pill">${iconMarkup('star')} <b class="cq-score">0</b></span>
    <button type="button" class="cq-pill cq-sound" data-i18n-aria="sound"></button>
  </header>
  <div class="cq-timer"><i></i></div>
  <main class="cq-stage">
    <div class="cq-face" aria-hidden="true"></div>
    <img class="cq-flag" alt="">
    <h2 class="cq-ask" aria-live="polite"></h2>
    <p class="cq-tip" aria-live="polite"></p>
  </main>
  <div class="cq-items"></div>
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
  let sayToken = 0;    /* 읽기 순서. 넘기거나 그만두면 늘려서 앞의 읽기가 끝나도 무시합니다. */
  const tip = $('.cq-tip');

  /* 아이템(공통 5종). 문제마다 같은 아이템은 한 번, 보호막은 켜 둔 동안 다시 못 씀. 사는 동안(팝업)은 타이머를 멈춥니다. */
  const canUse = (id) => !!S && !S.locked && overlay.hidden && !S.used.has(id);
  const mark = (id, text) => { S.used.add(id); setIconText(tip, text); };
  const items = ctx.itemBar($('.cq-items'), {
    hint: { can: () => canUse('hint'), apply: () => mark('hint', t('tipHint', { c: [...S.round[S.i].answer.capital[lang]][0] })) },
    eraser: {
      can: () => canUse('eraser'),
      apply() {
        const q = S.round[S.i];
        const wrong = buttons.filter((b, k) => q.choices[k] !== q.answer && !b.disabled);
        wrong.sort(() => Math.random() - 0.5).slice(0, 2).forEach((b) => { b.disabled = true; b.classList.add('gone'); });
        S.used.add('eraser');
      }
    },
    time: { can: () => canUse('time'), apply() { S.frozen = true; stopTick(); bar.classList.add('frozen'); mark('time', t('tipTime')); } },
    shield: { can: () => canUse('shield') && !S.shield, apply() { S.shield = true; mark('shield', t('tipShield')); } },
    pill: {
      can: () => canUse('pill'),
      apply() { const q = S.round[S.i]; buttons[q.choices.indexOf(q.answer)].classList.add('glow'); mark('pill', t('tipPill')); }
    },
    pause: () => stopTick(),
    resume: () => { if (S && !S.locked && !S.frozen) startTick(); }
  });

  function renderSound() {
    const b = $('.cq-sound');
    const on = ctx.audio.getSound();
    b.replaceChildren(icon(on ? 'sound' : 'sound-muted'));
    b.setAttribute('aria-pressed', String(on));
  }

  function renderBest() {
    setIconText($('.cq-best'), t('best', { n: best }));
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
    ctx.audio.warmSpeak();   /* iOS: 탭 안에서 읽기를 깨워 둡니다 */
    S = { level, round: makeRound(level), i: -1, correct: 0, score: 0, prevBest: best, shield: false };
    ctx.audio.preloadClips(S.round.map((q) => voiceFor(q.answer, lang)));
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
    S.frozen = false;
    S.used = new Set(S.shield ? ['shield'] : []);
    tip.textContent = S.shield ? t('tipShield') : '';
    bar.classList.remove('frozen');
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
    items.refresh();
    startTick();
  }

  /* 탭을 떠나면 타이머가 느려지는데, 한 번에 0.1초까지만 빼서 그동안은 사실상 멈춥니다. */
  function startTick() {
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

  function stopTick() {
    clearInterval(tick);
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
    items.refresh();
    const q = S.round[S.i];
    const right = q.choices.indexOf(q.answer);
    buttons.forEach((b) => { b.disabled = true; });
    buttons[right].classList.add('right');
    const j = judge(k === right, S.shield);
    S.shield = j.shield;
    if (j.counts) S.correct++;
    if (j.saved) tip.textContent = t('tipSaved');
    if (k === right) {
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

  /* 정답 도시 사진과 출처(CC 라이선스는 작가·라이선스 표시 필요). 정답 문장을 읽고,
     다 읽고(최소 PHOTO_MS, 최대 PHOTO_MAX_MS) 나면 다음 문제. 누르면 바로 다음 문제. */
  function showPhoto() {
    const c = S.round[S.i].answer;
    const [artist, license] = CREDITS[c.code];
    photo.querySelector('img').src = photoSrc(c);
    $('.cq-city').textContent = t('city', { city: c.capital[lang], country: c.name[lang] });
    $('.cq-credit').textContent = `📷 ${artist} / Wikimedia Commons · ${license}`;
    photo.hidden = false;
    const my = ++sayToken;
    const shownAt = performance.now();
    next = setTimeout(advance, PHOTO_MAX_MS);
    ctx.audio.speak(sentenceFor(c, lang), lang, { clip: voiceFor(c, lang) }).then(() => {
      if (my !== sayToken) return;
      clearTimeout(next);
      next = setTimeout(advance, Math.max(AFTER_SAY_MS, PHOTO_MS - (performance.now() - shownAt)));
    });
  }

  /* 사진에서 다음 문제로: 읽던 것을 멈추고 넘어갑니다. */
  function advance() {
    sayToken++;
    clearTimeout(next);
    ctx.audio.stopSpeak();
    ask();
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
    sayToken++;
    ctx.audio.stopSpeak();
  }

  buttons.forEach((b, k) => b.addEventListener('click', () => { ctx.audio.warmSpeak(); answer(k); }));
  photo.addEventListener('click', () => { if (S && !photo.hidden) advance(); });
  el.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => start(Number(b.dataset.level))));
  $('.cq-again').addEventListener('click', () => start(S.level));
  $('.cq-other').addEventListener('click', () => showOverlay('start'));
  $('.cq-lobby').addEventListener('click', () => ctx.exit());
  /* 판 중간에 그만두면 결과 없이 시작 화면으로 돌아갑니다. */
  $('.cq-quit').addEventListener('click', () => { stop(); photo.hidden = true; showOverlay('start'); });
  $('.cq-sound').addEventListener('click', () => {
    ctx.setSound(!ctx.audio.getSound());
    if (!ctx.audio.getSound()) ctx.audio.stopSpeak();
    renderSound();
  });

  renderSound();
  showOverlay('start');
  return { destroy: stop };
}
