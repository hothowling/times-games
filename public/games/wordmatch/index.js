/*
 * 영단어 짝맞추기 - 펼쳐진 영어 카드와 한글 카드에서 같은 뜻 두 장을 골라 없애는 게임.
 * 맞히면 그림 카드(사진 → 없으면 이모지 → 없으면 글자만)가 뜨고 영어 → 한글 순서로 읽어 줍니다(core/audio.js speak).
 * 읽기는 녹음 파일(voices.js 에 있는 단어: assets/voice/words/<en|ko>/<id>.m4a)을 쓰고, 없으면 speechSynthesis 로 읽습니다.
 * 규칙은 rules.js, 단어 목록은 words.js(DOM 없음). 틀린 단어는 복습 큐(ctx.progress.review)에 쌓여 다음 판에 먼저 나옵니다.
 */
import { TOPICS, GRADES, WORD_BY_ID } from './words.js';
import { IMAGES } from './images.js';
import { VOICES } from './voices.js';
import { CREDITS } from './credits.js';
import { makeRound, judge, scoreFor, starsFor, pairsFor, nextReview, COMBO_CHEERS, LEVELS } from './rules.js';

export const dict = {
  ko: {
    title: '영단어 짝맞추기',
    how: '영어 카드와 한글 카드에서 같은 뜻을 찾아 두 장을 눌러요!',
    grade: '학년', grade3: '3학년', grade4: '4학년',
    topic: '주제', all: '전체',
    level1: '8쌍 (쉬움)', level2: '10쌍 (보통)', level3: '12쌍 (어려움)',
    left: '남은 짝 {n}',
    combo: '{n} 콤보!',
    over: '다 찾았어요!',
    result: '⏱ {t} · ❌ {w}번 · 🔥 최고 {c}콤보',
    score: '{s}점',
    learned: '오늘 배운 단어 (누르면 읽어 줘요)',
    best: '🏆 최고 기록 {n}점',
    record: '🎉 새 기록!',
    review: '📝 복습할 단어 {n}개가 먼저 나와요',
    again: '다시 하기',
    other: '주제 바꾸기',
    quit: '그만하기',
    tipHint: '💡 반짝이는 두 장이 짝이에요'
  },
  en: {
    title: 'Word Match',
    how: 'Find the English card and the Korean card that mean the same thing!',
    grade: 'Grade', grade3: 'Grade 3', grade4: 'Grade 4',
    topic: 'Topic', all: 'All',
    level1: '8 pairs (Easy)', level2: '10 pairs (Normal)', level3: '12 pairs (Hard)',
    left: '{n} left',
    combo: '{n} combo!',
    over: 'All matched!',
    result: '⏱ {t} · ❌ {w} · 🔥 best {c}',
    score: '{s} pts',
    learned: 'Words you learned (tap to hear)',
    best: '🏆 Best {n} pts',
    record: '🎉 New record!',
    review: '📝 {n} words to review come first',
    again: 'Play again',
    other: 'Change topic',
    quit: 'Quit',
    tipHint: '💡 The two glowing cards are a pair'
  }
};

const POPUP_MS = 1200;   /* 읽기가 끝난 뒤에도 그림 카드를 보여 주는 최소 시간 */
const FLY_MS = 320;      /* 맞힌 두 카드가 가운데로 모이는 시간 */
const SHAKE_MS = 450;
const HINT_MS = 1800;

const HTML = `
<div class="wm-app">
  <header class="wm-hud">
    <button type="button" class="wm-pill wm-quit" data-i18n-aria="quit">✕</button>
    <span class="wm-pill wm-left"></span>
    <span class="wm-pill wm-time">0:00</span>
    <button type="button" class="wm-pill wm-sound" data-i18n-aria="sound"></button>
  </header>
  <div class="wm-bar">
    <div class="wm-face" aria-hidden="true"></div>
    <p class="wm-msg" aria-live="polite"></p>
    <div class="wm-items"></div>
  </div>
  <main class="wm-grid"></main>
</div>
<div class="wm-pop" hidden>
  <div class="wm-pop-card">
    <img class="wm-pop-img" alt="" hidden>
    <span class="wm-pop-pic" aria-hidden="true"></span>
    <b class="wm-pop-en"></b>
    <span class="wm-pop-ko"></span>
    <small class="wm-pop-credit" hidden></small>
  </div>
</div>
<div class="wm-overlay" data-mode="start">
  <div class="wm-card">
    <h1><span data-show="start" data-i18n="title"></span><span data-show="over" data-i18n="over"></span></h1>
    <div class="wm-card-face" aria-hidden="true"></div>
    <p class="wm-record" data-show="over" data-i18n="record"></p>
    <p class="wm-score" data-show="over"></p>
    <p class="wm-result" data-show="over"></p>
    <p class="wm-best"></p>
    <p data-show="start" data-i18n="how"></p>
    <div data-show="start">
      <h2 data-i18n="grade"></h2>
      <div class="wm-chips wm-grades"></div>
      <h2 data-i18n="topic"></h2>
      <div class="wm-chips wm-topics"></div>
      <p class="wm-review-note"></p>
      <div class="wm-levels"></div>
    </div>
    <div data-show="over">
      <h2 data-i18n="learned"></h2>
      <ul class="wm-learned"></ul>
      <button type="button" class="wm-main wm-again" data-i18n="again"></button>
      <button type="button" class="wm-sub wm-other" data-i18n="other"></button>
    </div>
    <button type="button" class="wm-sub wm-lobby" data-i18n="goLobby"></button>
  </div>
</div>`;

const IMG_DIR = 'assets/games/wordmatch/img/';
const CREDIT_BY_ID = new Map(CREDITS.map((c) => [c.id, c]));
const LICENSE_SHORT = (l) => (/^(CC0|Public domain)/i.test(l) ? '' : ` · ${l}`);
export const imageFor = (id) => (IMAGES[id] ? `${IMG_DIR}${id}.${IMAGES[id]}` : '');
/* 녹음 음성(MeloTTS, scripts/gen-word-voices.mjs)이 있으면 그 주소, 없으면 '' (speechSynthesis 로 읽음). */
const VOICE_DIR = 'assets/voice/words/';
const HAS_VOICE = { en: new Set(VOICES.en), ko: new Set(VOICES.ko) };
export const voiceFor = (id, l) => (HAS_VOICE[l]?.has(id) ? `${VOICE_DIR}${l}/${id}.m4a` : '');

const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export function mount(el, ctx) {
  el.innerHTML = HTML;
  ctx.apply(el);
  const $ = (sel) => el.querySelector(sel);
  const t = ctx.t;
  const lang = ctx.lang;
  const audio = ctx.audio;
  const grid = $('.wm-grid');
  const overlay = $('.wm-overlay');
  const pop = $('.wm-pop');
  const msg = $('.wm-msg');

  const hero = ctx.character($('.wm-face'), { body: false });
  const cardHero = ctx.character($('.wm-card-face'), { body: false });

  const saved = ctx.progress || {};
  let best = Number(saved.best) || 0;
  let review = Array.isArray(saved.review) ? saved.review.filter((id) => WORD_BY_ID.has(id)) : [];
  const pick = {
    grade: GRADES.includes(saved.last?.grade) ? saved.last.grade : GRADES[0],
    topic: saved.last?.topic in TOPICS ? saved.last.topic : 'all',
    level: LEVELS.includes(saved.last?.level) ? saved.last.level : 1
  };

  let S = null;            /* 한 판 상태 */
  let alive = true;
  let clock = 0;           /* 경과 시간 표시 타이머 */
  let sayToken = 0;        /* 읽기 순서. 새로 읽기 시작하면 앞의 이어 읽기는 멈춥니다. */
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms);
    timers.add(id);
    return id;
  };
  const wait = (ms) => new Promise((ok) => later(ok, ms));

  /* 여러 말([글자, 언어, 단어 id])을 차례로 읽습니다. 녹음 파일이 있으면 그것을, 없으면 speechSynthesis 로.
     중간에 다른 say 가 시작되면 남은 말은 읽지 않습니다. */
  async function say(...parts) {
    const my = ++sayToken;
    for (const [text, l, id] of parts) {
      if (!alive || my !== sayToken) return;
      await audio.speak(text, l, { clip: voiceFor(id, l) });
    }
  }

  /* ---------- 시간 ---------- */

  const elapsed = () => (S ? (S.acc + (S.runSince ? performance.now() - S.runSince : 0)) / 1000 : 0);
  function runClock() {
    if (!S || S.runSince) return;
    S.runSince = performance.now();
    clearInterval(clock);
    clock = setInterval(() => { $('.wm-time').textContent = fmtTime(elapsed()); }, 250);
  }
  function pauseClock() {
    clearInterval(clock);
    if (S?.runSince) {
      S.acc += performance.now() - S.runSince;
      S.runSince = 0;
    }
  }

  /* ---------- 아이템: 힌트 = 짝 하나를 잠깐 반짝임 ---------- */

  const items = ctx.itemBar($('.wm-items'), {
    hint: {
      can: () => !!S && !S.done && !S.locked && overlay.hidden,
      apply() {
        const left = S.cards.filter((c) => !c.gone);
        const target = left.find((c) => review.includes(c.wordId)) || left[0];
        if (!target) return;
        const pair = S.cards.filter((c) => c.wordId === target.wordId);
        pair.forEach((c) => c.el.classList.add('glow'));
        msg.textContent = t('tipHint');
        later(() => pair.forEach((c) => c.el.classList.remove('glow')), HINT_MS);
      }
    },
    pause: () => pauseClock(),
    resume: () => { if (S && !S.done && overlay.hidden) runClock(); }
  });

  /* ---------- 시작 화면 ---------- */

  function chip(label, on, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wm-chip' + (on ? ' on' : '');
    b.textContent = label;
    b.setAttribute('aria-pressed', String(on));
    b.addEventListener('click', onClick);
    return b;
  }

  function renderStart() {
    $('.wm-grades').replaceChildren(...GRADES.map((g) =>
      chip(t('grade' + g), pick.grade === g, () => { pick.grade = g; renderStart(); })));
    const topics = ['all', ...Object.keys(TOPICS)];
    $('.wm-topics').replaceChildren(...topics.map((id) =>
      chip(id === 'all' ? t('all') : TOPICS[id][lang], pick.topic === id, () => { pick.topic = id; renderStart(); })));
    const due = review.filter((id) => pick.topic === 'all' || WORD_BY_ID.get(id).topic === pick.topic).length;
    $('.wm-review-note').textContent = due ? t('review', { n: due }) : '';
    $('.wm-levels').replaceChildren(...LEVELS.map((lv) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wm-main';
      b.dataset.level = lv;
      b.textContent = t('level' + lv);
      b.addEventListener('click', () => { pick.level = lv; start(); });
      return b;
    }));
  }

  function renderSound() {
    const b = $('.wm-sound');
    const on = audio.getSound();
    b.textContent = on ? '🔊' : '🔇';
    b.setAttribute('aria-pressed', String(on));
  }

  function renderBest() {
    $('.wm-best').textContent = t('best', { n: best });
    $('.wm-best').hidden = !best;
  }

  function showOverlay(mode) {
    overlay.dataset.mode = mode;
    overlay.hidden = false;
    if (mode === 'start') renderStart();
    renderBest();
    cardHero.expression(mode === 'over' && S && S.stars < 2 ? 'neutral' : 'happy');
  }

  /* ---------- 한 판 ---------- */

  function start() {
    const ac = audio.context();
    if (ac && ac.state !== 'running') ac.resume().catch(() => {});
    audio.warmSpeak();   /* iOS: 탭 안에서 읽기를 깨워 둡니다 */
    stop();
    const pairs = pairsFor(pick.level);
    const round = makeRound({ grade: pick.grade, topic: pick.topic, pairs, reviewIds: review });
    audio.preloadClips(round.words.flatMap((w) => [voiceFor(w.id, 'en'), voiceFor(w.id, 'ko')]));
    S = {
      ...pick,
      words: round.words,
      cards: round.cards.map((c) => ({ ...c, gone: false, el: null })),
      left: round.words.length,
      sel: null, locked: false, done: false,
      wrong: 0, combo: 0, maxCombo: 0,
      wrongIds: new Set(), clearedIds: [],
      acc: 0, runSince: 0, prevBest: best
    };
    grid.dataset.n = String(S.cards.length);
    grid.replaceChildren(...S.cards.map((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `wm-cardbtn wm-${c.side}`;
      b.lang = c.side === 'en' ? 'en' : 'ko';
      b.textContent = c.text;
      b.addEventListener('click', () => tap(c));
      c.el = b;
      return b;
    }));
    msg.textContent = '';
    hero.expression('neutral');
    overlay.hidden = true;
    overlay.classList.remove('new-best');
    $('.wm-time').textContent = '0:00';
    renderLeft();
    items.refresh();
    runClock();
  }

  function renderLeft() {
    $('.wm-left').textContent = t('left', { n: S.left });
  }

  function select(c) {
    if (S.sel) S.sel.el.classList.remove('sel');
    S.sel = c;
    if (c) c.el.classList.add('sel');
  }

  function tap(c) {
    if (!S || S.locked || S.done || c.gone) return;
    audio.warmSpeak();
    if (!S.sel) { select(c); audio.keyTap(); return; }
    if (S.sel === c) { select(null); return; }
    /* 같은 쪽(영어+영어)을 누르면 고른 카드만 바꿉니다. */
    if (S.sel.side === c.side) { select(c); audio.keyTap(); return; }
    const a = S.sel;
    select(null);
    const j = judge(a, c);
    if (j.ok) match(a, c);
    else miss(a, c);
  }

  /* 그림 카드의 그림: 사진이 있으면 사진(못 불러오면 이모지), 없으면 이모지, 그것도 없으면 숨김. */
  function showPic(w) {
    const img = $('.wm-pop-img');
    const pic = $('.wm-pop-pic');
    const credit = $('.wm-pop-credit');
    const emoji = () => {
      img.hidden = true;
      credit.hidden = true;
      pic.textContent = w.emoji || '';
      pic.hidden = !w.emoji;
    };
    const src = imageFor(w.id);
    if (!src) { emoji(); return; }
    const c = CREDIT_BY_ID.get(w.id);
    img.onerror = emoji;
    img.src = src;
    img.hidden = false;
    pic.hidden = true;
    credit.textContent = c ? `📷 ${c.creator}${LICENSE_SHORT(c.license)}` : '';
    credit.hidden = !c;
  }

  async function match(a, b) {
    const R = S;
    const gone = () => !alive || S !== R || R.done;   /* 그만두기·새 판·나가기로 이 판이 끝났으면 멈춤 */
    S.locked = true;
    pauseClock();   /* 그림 카드를 보는 시간은 기록에 넣지 않습니다 */
    items.refresh();
    S.combo++;
    S.maxCombo = Math.max(S.maxCombo, S.combo);
    S.left--;
    S.clearedIds.push(a.wordId);
    renderLeft();
    const w = WORD_BY_ID.get(a.wordId);
    if (COMBO_CHEERS.includes(S.combo)) {
      audio.fanfare();
      msg.textContent = t('combo', { n: S.combo });
    } else {
      audio.correct();
      msg.textContent = S.combo > 1 ? t('combo', { n: S.combo }) : '';
    }
    hero.react('correct');

    /* 두 카드가 가운데(둘의 중간)로 모이며 작아집니다. */
    const ra = a.el.getBoundingClientRect();
    const rb = b.el.getBoundingClientRect();
    const mx = (ra.left + ra.right + rb.left + rb.right) / 4;
    const my = (ra.top + ra.bottom + rb.top + rb.bottom) / 4;
    for (const [c, r] of [[a, ra], [b, rb]]) {
      c.gone = true;
      c.el.style.setProperty('--dx', `${mx - (r.left + r.right) / 2}px`);
      c.el.style.setProperty('--dy', `${my - (r.top + r.bottom) / 2}px`);
      c.el.classList.add('fly');
      c.el.disabled = true;
    }
    await wait(FLY_MS);
    if (gone()) return;

    /* 그림 카드: 그림(이모지) 크게, 영어 크게, 한글 작게. 읽는 동안 입력을 막습니다. */
    showPic(w);
    $('.wm-pop-en').textContent = w.en;
    $('.wm-pop-ko').textContent = w.ko;
    pop.hidden = false;
    const shown = performance.now();
    await say([w.en, 'en', w.id], [w.ko, 'ko', w.id]);
    if (gone()) return;
    const rest = POPUP_MS - (performance.now() - shown);
    if (rest > 0) await wait(rest);
    if (gone()) return;
    pop.hidden = true;
    a.el.classList.add('gone');
    b.el.classList.add('gone');
    S.locked = false;
    items.refresh();
    if (!S.left) end();
    else runClock();
  }

  function miss(a, b) {
    S.wrong++;
    S.combo = 0;
    S.wrongIds.add(a.wordId);
    S.wrongIds.add(b.wordId);
    audio.wrong();
    hero.react('wrong');
    msg.textContent = '';
    for (const c of [a, b]) {
      c.el.classList.remove('shake');
      void c.el.offsetWidth;
      c.el.classList.add('shake');
      later(() => c.el.classList.remove('shake'), SHAKE_MS);
    }
    /* 틀려도 두 단어를 읽어 줍니다(배울 기회). 영어 카드는 영어로, 한글 카드는 한국어로. */
    const en = a.side === 'en' ? a : b;
    const ko = a.side === 'en' ? b : a;
    say([en.text, 'en', en.wordId], [ko.text, 'ko', ko.wordId]);
  }

  function end() {
    S.done = true;
    pauseClock();
    const seconds = Math.round(elapsed());
    const pairs = S.words.length;
    S.stars = starsFor({ pairs, wrong: S.wrong, seconds });
    const score = scoreFor({ pairs, wrong: S.wrong, seconds, maxCombo: S.maxCombo });
    review = nextReview(review, { wrongIds: [...S.wrongIds], clearedIds: S.clearedIds });
    if (score > best) best = score;
    ctx.saveProgress({ best, review, last: { grade: S.grade, topic: S.topic, level: S.level } });
    audio.fanfare();
    hero.react('clear');
    $('.wm-score').textContent = '⭐'.repeat(S.stars) + ' ' + t('score', { s: score });
    $('.wm-result').textContent = t('result', { t: fmtTime(seconds), w: S.wrong, c: S.maxCombo });
    $('.wm-learned').replaceChildren(...S.words.map((w) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wm-word' + (S.wrongIds.has(w.id) ? ' missed' : '');
      const pic = document.createElement('span');
      pic.className = 'wm-word-pic';
      pic.textContent = w.emoji || '🔤';
      const src = imageFor(w.id);
      if (src) {
        const img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.src = src;
        img.onerror = () => img.replaceWith(w.emoji || '🔤');
        pic.replaceChildren(img);
      }
      const en = document.createElement('b');
      en.lang = 'en';
      en.textContent = w.en;
      const ko = document.createElement('span');
      ko.textContent = w.ko;
      b.append(pic, en, ko);
      b.addEventListener('click', () => say([w.en, 'en', w.id], [w.ko, 'ko', w.id]));
      li.append(b);
      return li;
    }));
    overlay.classList.toggle('new-best', score > S.prevBest);
    ctx.finish({
      stars: S.stars, score,
      detail: { grade: S.grade, topic: S.topic, pairs, wrong: S.wrong, seconds, maxCombo: S.maxCombo }
    });
    later(() => showOverlay('over'), 600);
  }

  function stop() {
    pauseClock();
    clearInterval(clock);
    timers.forEach(clearTimeout);
    timers.clear();
    sayToken++;
    audio.stopSpeak();
    pop.hidden = true;
  }

  $('.wm-again').addEventListener('click', () => start());
  $('.wm-other').addEventListener('click', () => showOverlay('start'));
  $('.wm-lobby').addEventListener('click', () => ctx.exit());
  /* 판 중간에 그만두면 결과 없이 시작 화면으로 돌아갑니다. */
  $('.wm-quit').addEventListener('click', () => {
    stop();
    if (S) { S.done = true; S.locked = false; }
    showOverlay('start');
  });
  $('.wm-sound').addEventListener('click', () => {
    ctx.setSound(!audio.getSound());
    if (!audio.getSound()) audio.stopSpeak();
    renderSound();
  });

  renderSound();
  showOverlay('start');

  return {
    destroy() {
      alive = false;
      stop();
    }
  };
}
