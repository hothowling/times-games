import { icon, setIconText } from '../../core/icons.js';
/*
 * 영단어 짝맞추기 - 펼쳐진 영어 카드와 한글 카드에서 같은 뜻 두 장을 골라 없애는 게임.
 * 맞히면 그림 카드(사진 → 없으면 이모지 → 없으면 글자만)가 뜨고 영어 → 한글 순서로 읽어 줍니다(core/audio.js speak).
 * 읽기는 녹음 파일(voices.js 에 있는 단어: assets/voice/words/<en|ko>/<id>.m4a)을 쓰고, 없으면 speechSynthesis 로 읽습니다.
 * 규칙은 rules.js, 단어 목록은 words.js(DOM 없음). 틀린 단어는 복습 큐(ctx.progress.review)에 쌓여 다음 판에 먼저 나옵니다.
 * 모드(rules.js MODES): 기본 / 타임어택 / 뒤집기(기억력) / 듣고 찾기 / 거꾸로.
 * 진행도: { best, bestBy: {모드: 점수}, review: [id], learned: [한 번에 맞힌 id], last: { grade, topic, level, mode, preview } }
 */
import { TOPICS, GRADES, WORD_BY_ID } from './words.js';
import { IMAGES } from './images.js';
import { VOICES } from './voices.js';
import { CREDITS } from './credits.js';
import {
  makeRound, judge, pairsFor, nextReview, COMBO_CHEERS, LEVELS,
  MODES, modeConfig, TIME_ATTACK, timeLeft, cardsForMode, listenOrder, nextTarget, judgeTarget,
  scoreForMode, starsForMode, mergeLearned, learnedStats, MEMORY_PEEK_MS, MEMORY_FLIPBACK_MS, PREVIEW_MS
} from './rules.js';

export const dict = {
  ko: {
    title: '영단어 짝맞추기',
    how: '영어 카드와 한글 카드에서 같은 뜻을 찾아 두 장을 눌러요!',
    grade: '학년', grade3: '3학년', grade4: '4학년', grade5: '5학년', grade6: '6학년',
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
    tipHint: '💡 반짝이는 두 장이 짝이에요',
    tipHintMemory: '💡 잠깐 열린 두 장이 짝이에요',
    tipHintListen: '💡 반짝이는 카드가 정답이에요',
    tipEraser: '🧽 실수 하나를 지웠어요',
    tipTime: '⏳ 15초 더!',
    mode: '놀이 방법',
    mode_basic: '🃏 기본', mode_timeattack: '⏱ 타임어택', mode_memory: '🧠 뒤집기', mode_listen: '👂 듣고 찾기', mode_reverse: '🔁 거꾸로',
    modeDesc_basic: '카드가 다 보여요. 천천히 짝을 찾아요.',
    modeDesc_timeattack: '60초! 짝을 찾으면 +5초, 틀리면 -3초.',
    modeDesc_memory: '카드가 뒤집혀 있어요. 두 장씩 뒤집어 짝을 찾아요.',
    modeDesc_listen: '영어를 듣고 맞는 그림 카드를 눌러요.',
    modeDesc_reverse: '한국어를 듣고 맞는 영어 카드를 눌러요.',
    preview: '👀 미리보기 (3초)',
    previewing: '👀 같은 색 두 장이 짝이에요. 잘 봐요!',
    peeking: '👀 잘 기억해요!',
    listenAsk: '🔊 듣고 맞는 카드를 눌러요',
    replay: '🔊 다시 듣기',
    learnedBadge: '익힌 단어 {n}/{total}',
    timeUp: '시간 끝!',
    progress: '{m}/{p}쌍 찾음'
  },
  en: {
    title: 'Word Match',
    how: 'Find the English card and the Korean card that mean the same thing!',
    grade: 'Grade', grade3: '3rd', grade4: '4th', grade5: '5th', grade6: '6th',
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
    tipHint: '💡 The two glowing cards are a pair',
    tipHintMemory: '💡 The two cards that opened are a pair',
    tipHintListen: '💡 The glowing card is the answer',
    tipEraser: '🧽 One mistake erased',
    tipTime: '⏳ +15 seconds!',
    mode: 'Mode',
    mode_basic: '🃏 Basic', mode_timeattack: '⏱ Time Attack', mode_memory: '🧠 Memory', mode_listen: '👂 Listen', mode_reverse: '🔁 Reverse',
    modeDesc_basic: 'All cards face up. Take your time.',
    modeDesc_timeattack: '60 seconds! +5s per pair, -3s per mistake.',
    modeDesc_memory: 'Cards are face down. Flip two at a time to find pairs.',
    modeDesc_listen: 'Listen to the English word and tap the right picture card.',
    modeDesc_reverse: 'Listen to the Korean word and tap the right English card.',
    preview: '👀 Preview (3s)',
    previewing: '👀 Cards with the same color are a pair!',
    peeking: '👀 Remember them!',
    listenAsk: '🔊 Listen and tap the card',
    replay: '🔊 Replay',
    learnedBadge: 'Learned {n}/{total}',
    timeUp: "Time's up!",
    progress: '{m}/{p} pairs found'
  }
};

const POPUP_MS = 1200;   /* 읽기가 끝난 뒤에도 그림 카드를 보여 주는 최소 시간 */
const FLY_MS = 320;      /* 맞힌 두 카드가 가운데로 모이는 시간 */
const SHAKE_MS = 450;
const HINT_MS = 1800;
const TIME_FLASH_MS = 500;

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
  <div class="wm-prompt" hidden>
    <span class="wm-prompt-ask" data-i18n="listenAsk"></span>
    <button type="button" class="wm-replay" data-i18n="replay"></button>
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
    <h1><span data-show="start" data-i18n="title"></span><span data-show="over" class="wm-over-title"></span></h1>
    <div class="wm-card-face" aria-hidden="true"></div>
    <p class="wm-record" data-show="over" data-i18n="record"></p>
    <p class="wm-score" data-show="over"></p>
    <p class="wm-result" data-show="over"></p>
    <p class="wm-best"></p>
    <p data-show="start" data-i18n="how"></p>
    <div data-show="start">
      <h2 data-i18n="mode"></h2>
      <div class="wm-chips wm-modes"></div>
      <p class="wm-mode-desc"></p>
      <div class="wm-chips wm-opts"></div>
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
  const app = $('.wm-app');
  const grid = $('.wm-grid');
  const overlay = $('.wm-overlay');
  const pop = $('.wm-pop');
  const msg = $('.wm-msg');
  const timeEl = $('.wm-time');
  const prompt = $('.wm-prompt');

  const hero = ctx.character($('.wm-face'), { body: false });
  const cardHero = ctx.character($('.wm-card-face'), { body: false });

  const saved = ctx.progress || {};
  let best = Number(saved.best) || 0;
  /* 모드별 최고 점수. 예전 기록(모드 없던 때)은 기본 모드 기록으로 봅니다. */
  const bestBy = {};
  for (const m of MODES) bestBy[m] = Number(saved.bestBy?.[m]) || 0;
  if (!saved.bestBy && best) bestBy.basic = best;
  let review = Array.isArray(saved.review) ? saved.review.filter((id) => WORD_BY_ID.has(id)) : [];
  let learned = mergeLearned(Array.isArray(saved.learned) ? saved.learned : []);
  const pick = {
    grade: GRADES.includes(saved.last?.grade) ? saved.last.grade : GRADES[0],
    topic: saved.last?.topic in TOPICS ? saved.last.topic : 'all',
    level: LEVELS.includes(saved.last?.level) ? saved.last.level : 1,
    mode: MODES.includes(saved.last?.mode) ? saved.last.mode : 'basic',
    preview: !!saved.last?.preview
  };

  let S = null;            /* 한 판 상태 */
  let alive = true;
  let clock = 0;           /* 시간 표시(타임어택은 남은 시간 확인) 타이머 */
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

  const playing = () => !!S && !S.done && !S.locked && overlay.hidden;

  /* ---------- 시간 ---------- */

  const elapsed = () => (S ? (S.acc + (S.runSince ? performance.now() - S.runSince : 0)) / 1000 : 0);
  const remaining = () => timeLeft({ elapsed: elapsed(), matched: S.matched, wrong: S.wrong, bonus: S.bonus });
  function renderTime() {
    if (!S) return;
    if (S.cfg.timed) {
      const left = remaining();
      setIconText(timeEl, '⏳ ' + fmtTime(Math.ceil(left)));
      timeEl.classList.toggle('low', left <= 10);
      if (left <= 0 && !S.done && !S.locked) timeUp();
    } else {
      timeEl.textContent = fmtTime(elapsed());
    }
  }
  function runClock() {
    if (!S || S.runSince || S.done) return;
    S.runSince = performance.now();
    clearInterval(clock);
    clock = setInterval(renderTime, 250);
  }
  function pauseClock() {
    clearInterval(clock);
    if (S?.runSince) {
      S.acc += performance.now() - S.runSince;
      S.runSince = 0;
    }
  }
  /* 타임어택: 시간이 늘거나 줄 때 시계를 잠깐 깜빡입니다. */
  function flashTime(kind) {
    if (!S?.cfg.timed) return;
    timeEl.classList.remove('up', 'down');
    void timeEl.offsetWidth;
    timeEl.classList.add(kind);
    later(() => timeEl.classList.remove(kind), TIME_FLASH_MS);
    renderTime();
  }

  /* ---------- 아이템 ---------- */
  /* hint: 짝(듣고 찾기는 정답 카드) 하나를 잠깐 반짝임. 뒤집기 모드는 두 장을 잠깐 열어 보여 줌.
     eraser: 이미 한 실수 하나를 지움(틀린 횟수 -1, 타임어택이면 3초가 돌아옴). 복습 큐에는 그대로 남깁니다.
     time: 타임어택에서만 +15초. */
  const items = ctx.itemBar($('.wm-items'), {
    hint: { can: playing, apply: useHint },
    eraser: {
      can: () => playing() && S.wrong > 0,
      apply() {
        S.wrong--;
        S.erased++;
        setIconText(msg, t('tipEraser'));
        flashTime('up');
      }
    },
    time: {
      can: () => playing() && S.cfg.timed,
      apply() {
        S.bonus += TIME_ATTACK.item;
        setIconText(msg, t('tipTime'));
        flashTime('up');
      }
    },
    pause: () => pauseClock(),
    resume: () => { if (S && !S.done && !S.locked && overlay.hidden) runClock(); }
  });

  function useHint() {
    const left = S.cards.filter((c) => !c.gone);
    if (S.cfg.cardSide) {
      const card = left.find((c) => c.wordId === S.target);
      if (!card) return;
      card.el.classList.add('glow');
      setIconText(msg, t('tipHintListen'));
      later(() => card.el.classList.remove('glow'), HINT_MS);
      sayPrompt();
      return;
    }
    const target = left.find((c) => review.includes(c.wordId)) || left[0];
    if (!target) return;
    const pair = S.cards.filter((c) => c.wordId === target.wordId);
    pair.forEach((c) => c.el.classList.add('glow'));
    if (S.cfg.faceDown) {
      pair.forEach((c) => c.el.classList.add('open'));
      setIconText(msg, t('tipHintMemory'));
      later(() => pair.forEach((c) => {
        c.el.classList.remove('glow');
        if (!c.gone && S.sel !== c && !S.flipped.includes(c)) c.el.classList.remove('open');
      }), HINT_MS);
      return;
    }
    setIconText(msg, t('tipHint'));
    later(() => pair.forEach((c) => c.el.classList.remove('glow')), HINT_MS);
  }

  /* ---------- 시작 화면 ---------- */

  function chip(label, on, onClick, badge) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wm-chip' + (on ? ' on' : '');
    b.textContent = label;
    if (badge) {
      const s = document.createElement('small');
      s.className = 'wm-badge';
      s.textContent = badge;
      b.append(s);
    }
    b.setAttribute('aria-pressed', String(on));
    b.addEventListener('click', onClick);
    return b;
  }

  function renderStart() {
    $('.wm-modes').replaceChildren(...MODES.map((m) =>
      chip(t('mode_' + m), pick.mode === m, () => { pick.mode = m; renderStart(); renderBest(); })));
    $('.wm-mode-desc').textContent = t('modeDesc_' + pick.mode);
    const opts = [];
    if (modeConfig(pick.mode).preview) {
      opts.push(chip(t('preview'), pick.preview, () => { pick.preview = !pick.preview; renderStart(); }));
    }
    $('.wm-opts').replaceChildren(...opts);
    $('.wm-grades').replaceChildren(...GRADES.map((g) =>
      chip(t('grade' + g), pick.grade === g, () => { pick.grade = g; renderStart(); })));
    const stats = learnedStats(learned);
    const topics = ['all', ...Object.keys(TOPICS)];
    $('.wm-topics').replaceChildren(...topics.map((id) => {
      const st = stats[id] || { n: 0, total: 0 };
      const label = id === 'all' ? t('all') : TOPICS[id][lang];
      const b = chip(label, pick.topic === id, () => { pick.topic = id; renderStart(); }, `${st.n}/${st.total}`);
      b.title = t('learnedBadge', { n: st.n, total: st.total });
      b.setAttribute('aria-label', `${label} · ${b.title}`);
      return b;
    }));
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
    b.replaceChildren(icon(on ? 'sound' : 'sound-muted'));
    b.setAttribute('aria-pressed', String(on));
  }

  function renderBest() {
    const mode = overlay.dataset.mode === 'over' && S ? S.mode : pick.mode;
    const n = bestBy[mode] || 0;
    setIconText($('.wm-best'), t('best', { n }));
    $('.wm-best').hidden = !n;
  }

  function showOverlay(mode) {
    overlay.dataset.mode = mode;
    overlay.hidden = false;
    if (mode === 'start') renderStart();
    renderBest();
    cardHero.expression(mode === 'over' && S && S.stars < 2 ? 'neutral' : 'happy');
  }

  /* ---------- 카드 만들기 ---------- */

  /* 카드 앞면 내용: 글자, 듣고 찾기(한글 카드)는 그림(사진 → 이모지)도 함께. */
  function fillFace(face, c) {
    if (S.cfg.cardSide === 'ko') {
      const w = WORD_BY_ID.get(c.wordId);
      const pic = document.createElement('span');
      pic.className = 'wm-card-pic';
      pic.setAttribute('aria-hidden', 'true');
      pic.textContent = w.emoji || '';
      const src = imageFor(w.id);
      if (src) {
        const img = document.createElement('img');
        img.alt = '';
        img.src = src;
        img.onerror = () => img.replaceWith(w.emoji || '');
        pic.replaceChildren(img);
      }
      const label = document.createElement('span');
      label.className = 'wm-card-label';
      label.textContent = c.text;
      face.append(pic, label);
      face.classList.add('wm-pic');
    } else {
      face.textContent = c.text;
    }
  }

  function makeCardEl(c, pairNo) {
    const b = document.createElement('button');
    b.type = 'button';
    b.lang = c.side === 'en' ? 'en' : 'ko';
    b.dataset.pair = String(pairNo);
    b.style.setProperty('--hue', String(Math.round((pairNo * 360) / 12 + (pairNo % 2) * 15) % 360));
    if (S.cfg.faceDown) {
      /* 뒤집기: 버튼 안에 앞/뒷면. 'open' 이면 앞면(글자)이 보입니다. */
      b.className = 'wm-cardbtn wm-flip';
      b.setAttribute('aria-label', '?');
      const inner = document.createElement('span');
      inner.className = 'wm-inner';
      const front = document.createElement('span');
      front.className = `wm-front wm-${c.side}`;
      fillFace(front, c);
      const back = document.createElement('span');
      back.className = 'wm-back';
      back.textContent = '?';
      inner.append(back, front);
      b.append(inner);
    } else {
      b.className = `wm-cardbtn wm-${c.side}`;
      fillFace(b, c);
    }
    b.addEventListener('click', () => tap(c));
    return b;
  }

  /* ---------- 한 판 ---------- */

  function start() {
    const ac = audio.context();
    if (ac && ac.state !== 'running') ac.resume().catch(() => {});
    audio.warmSpeak();   /* iOS: 탭 안에서 읽기를 깨워 둡니다 */
    stop();
    const mode = pick.mode;
    const mc = modeConfig(mode);
    const pairs = pairsFor(pick.level);
    const round = makeRound({ grade: pick.grade, topic: pick.topic, pairs, reviewIds: review });
    audio.preloadClips(round.words.flatMap((w) => [voiceFor(w.id, 'en'), voiceFor(w.id, 'ko')]));
    const pairNo = new Map(round.words.map((w, i) => [w.id, i]));
    S = {
      ...pick,
      mode, cfg: mc,
      words: round.words,
      cards: cardsForMode(mode, round.cards).map((c) => ({ ...c, gone: false, el: null })),
      left: round.words.length, matched: 0,
      sel: null, flipped: [], locked: false, done: false, cleared: false,
      wrong: 0, erased: 0, bonus: 0, combo: 0, maxCombo: 0,
      wrongIds: new Set(), clearedIds: [],
      order: mc.cardSide ? listenOrder(round.words) : [], target: null,
      acc: 0, runSince: 0, prevBest: bestBy[mode] || 0
    };
    app.dataset.mode = mode;
    const cols = mc.cardSide ? 3 : 4;
    grid.style.setProperty('--cols', String(cols));
    grid.style.setProperty('--rows', String(Math.max(1, Math.ceil(S.cards.length / cols))));
    grid.classList.remove('preview');
    grid.replaceChildren(...S.cards.map((c) => {
      c.el = makeCardEl(c, pairNo.get(c.wordId) + 1);
      return c.el;
    }));
    msg.textContent = '';
    hero.expression('neutral');
    overlay.hidden = true;
    overlay.classList.remove('new-best');
    timeEl.classList.remove('low', 'up', 'down');
    prompt.hidden = !mc.cardSide;
    renderLeft();
    renderTime();

    /* 시작 전 잠깐 보여 주기: 뒤집기는 모든 카드를 열어서, 기본 모드 미리보기는 짝끼리 같은 색으로. */
    const R = S;
    const intro = mc.faceDown ? MEMORY_PEEK_MS : (mc.preview && pick.preview ? PREVIEW_MS : 0);
    if (intro > 0) {
      S.locked = true;
      items.refresh();
      if (mc.faceDown) S.cards.forEach((c) => c.el.classList.add('open'));
      else grid.classList.add('preview');
      msg.textContent = t(mc.faceDown ? 'peeking' : 'previewing');
      later(() => {
        if (S !== R || R.done) return;
        if (mc.faceDown) S.cards.forEach((c) => c.el.classList.remove('open'));
        grid.classList.remove('preview');
        msg.textContent = '';
        S.locked = false;
        items.refresh();
        runClock();
      }, intro);
      return;
    }
    items.refresh();
    runClock();
    if (mc.cardSide) nextQuestion();
  }

  function renderLeft() {
    $('.wm-left').textContent = t('left', { n: S.left });
  }

  function select(c) {
    if (S.sel) S.sel.el.classList.remove('sel');
    S.sel = c;
    if (c) c.el.classList.add('sel');
  }

  /* 듣고 찾기: 다음 문제를 정하고 읽어 줍니다. */
  function nextQuestion() {
    S.target = nextTarget(S.order, S.clearedIds);
    if (S.target) sayPrompt();
  }
  function sayPrompt() {
    if (!S?.target) return;
    const w = WORD_BY_ID.get(S.target);
    const l = S.cfg.promptLang;
    say([l === 'en' ? w.en : w.ko, l, w.id]);
  }

  function tap(c) {
    if (!S || S.locked || S.done || c.gone) return;
    audio.warmSpeak();
    if (S.cfg.cardSide) { tapListen(c); return; }
    if (S.cfg.faceDown) { tapMemory(c); return; }
    if (!S.sel) { select(c); audio.keyTap(); return; }
    if (S.sel === c) { select(null); return; }
    /* 같은 쪽(영어+영어)을 누르면 고른 카드만 바꿉니다. */
    if (S.sel.side === c.side) { select(c); audio.keyTap(); return; }
    const a = S.sel;
    select(null);
    const j = judge(a, c);
    if (j.ok) match([a, c]);
    else miss(a, c);
  }

  /* 뒤집기: 한 장 뒤집고, 두 장째에서 판정. 짝이 아니면 잠깐 뒤 다시 덮습니다. */
  function tapMemory(c) {
    if (S.flipped.includes(c)) return;
    c.el.classList.add('open');
    c.el.setAttribute('aria-label', c.text);
    S.flipped.push(c);
    audio.keyTap();
    if (S.flipped.length < 2) { select(c); return; }
    const [a, b] = S.flipped;
    select(null);
    if (judge(a, b).ok) {
      S.flipped = [];
      match([a, b]);
      return;
    }
    /* 엇갈림: 뒤집기에서는 찾아보는 과정이라 복습 큐에는 넣지 않습니다. */
    S.wrong++;
    S.combo = 0;
    audio.wrong();
    hero.react('wrong');
    msg.textContent = '';
    S.locked = true;
    items.refresh();
    shake([a, b]);
    say([a.text, a.side, a.wordId], [b.text, b.side, b.wordId]);
    const R = S;
    later(() => {
      if (S !== R || R.done) return;
      for (const x of [a, b]) {
        x.el.classList.remove('open');
        x.el.setAttribute('aria-label', '?');
      }
      S.flipped = [];
      S.locked = false;
      items.refresh();
    }, MEMORY_FLIPBACK_MS);
  }

  /* 듣고 찾기 / 거꾸로: 들은 단어 카드를 누릅니다. */
  function tapListen(c) {
    if (judgeTarget(c, S.target)) { match([c]); return; }
    S.wrong++;
    S.combo = 0;
    S.wrongIds.add(S.target);
    S.wrongIds.add(c.wordId);
    audio.wrong();
    hero.react('wrong');
    msg.textContent = '';
    shake([c]);
    /* 누른 단어를 그 카드 언어로 읽어 주고, 문제를 다시 들려줍니다. */
    const w = WORD_BY_ID.get(S.target);
    const l = S.cfg.promptLang;
    say([c.text, c.side, c.wordId], [l === 'en' ? w.en : w.ko, l, w.id]);
  }

  function shake(cs) {
    for (const c of cs) {
      c.el.classList.remove('shake');
      void c.el.offsetWidth;
      c.el.classList.add('shake');
      later(() => c.el.classList.remove('shake'), SHAKE_MS);
    }
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

  /* 맞힘: cs = 맞힌 카드들(짝 두 장, 듣고 찾기는 한 장). */
  async function match(cs) {
    const R = S;
    const gone = () => !alive || S !== R || R.done;   /* 그만두기·새 판·나가기로 이 판이 끝났으면 멈춤 */
    S.locked = true;
    pauseClock();   /* 그림 카드를 보는 시간은 기록에 넣지 않습니다 */
    items.refresh();
    S.combo++;
    S.maxCombo = Math.max(S.maxCombo, S.combo);
    S.left--;
    S.matched++;
    const wordId = cs[0].wordId;
    S.clearedIds.push(wordId);
    renderLeft();
    flashTime('up');
    const w = WORD_BY_ID.get(wordId);
    if (COMBO_CHEERS.includes(S.combo)) {
      audio.fanfare();
      msg.textContent = t('combo', { n: S.combo });
    } else {
      audio.correct();
      msg.textContent = S.combo > 1 ? t('combo', { n: S.combo }) : '';
    }
    hero.react('correct');

    if (S.cfg.faceDown) {
      /* 뒤집기: 맞힌 두 장은 열린 채 흐리게 남습니다. */
      for (const c of cs) {
        c.gone = true;
        c.el.classList.add('open', 'done');
        c.el.disabled = true;
      }
    } else {
      /* 카드가 가운데(카드들의 중간)로 모이며 작아집니다. */
      const rs = cs.map((c) => c.el.getBoundingClientRect());
      const mx = rs.reduce((n, r) => n + (r.left + r.right) / 2, 0) / rs.length;
      const my = rs.reduce((n, r) => n + (r.top + r.bottom) / 2, 0) / rs.length;
      cs.forEach((c, i) => {
        const r = rs[i];
        c.gone = true;
        c.el.style.setProperty('--dx', `${mx - (r.left + r.right) / 2}px`);
        c.el.style.setProperty('--dy', `${my - (r.top + r.bottom) / 2}px`);
        c.el.classList.remove('glow');
        c.el.classList.add('fly');
        c.el.disabled = true;
      });
      await wait(FLY_MS);
      if (gone()) return;
    }

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
    if (!S.cfg.faceDown) cs.forEach((c) => c.el.classList.add('gone'));
    S.locked = false;
    items.refresh();
    if (!S.left) { end(true); return; }
    runClock();
    if (S.cfg.cardSide) nextQuestion();
  }

  function miss(a, b) {
    S.wrong++;
    S.combo = 0;
    S.wrongIds.add(a.wordId);
    S.wrongIds.add(b.wordId);
    audio.wrong();
    hero.react('wrong');
    msg.textContent = '';
    shake([a, b]);
    /* 틀려도 두 단어를 읽어 줍니다(배울 기회). 영어 카드는 영어로, 한글 카드는 한국어로. */
    const en = a.side === 'en' ? a : b;
    const ko = a.side === 'en' ? b : a;
    say([en.text, 'en', en.wordId], [ko.text, 'ko', ko.wordId]);
    flashTime('down');   /* 타임어택: -3초. 0초가 되면 여기서 끝납니다. */
  }

  /* 타임어택: 시간이 다 됐을 때. 그때까지 찾은 만큼으로 끝냅니다. */
  function timeUp() {
    if (!S || S.done) return;
    timers.forEach(clearTimeout);
    timers.clear();
    sayToken++;
    audio.stopSpeak();
    select(null);
    end(false);
  }

  function end(cleared) {
    S.done = true;
    S.cleared = cleared;
    S.locked = false;
    pauseClock();
    items.refresh();
    const seconds = Math.round(elapsed());
    const pairs = S.words.length;
    const left = S.cfg.timed ? remaining() : 0;
    const stats = { pairs, matched: S.matched, wrong: S.wrong, seconds, maxCombo: S.maxCombo, cleared, remaining: left };
    S.stars = starsForMode(S.mode, stats);
    const score = scoreForMode(S.mode, stats);
    review = nextReview(review, { wrongIds: [...S.wrongIds], clearedIds: S.clearedIds });
    /* 한 번에 맞힌 단어 = 맞혔고 이번 판에 틀린 적 없는 단어 */
    learned = mergeLearned(learned, S.clearedIds.filter((id) => !S.wrongIds.has(id)));
    if (score > (bestBy[S.mode] || 0)) bestBy[S.mode] = score;
    if (score > best) best = score;
    ctx.saveProgress({
      best, bestBy, review, learned,
      last: { grade: S.grade, topic: S.topic, level: S.level, mode: S.mode, preview: S.preview }
    });
    if (cleared) {
      audio.fanfare();
      hero.react('clear');
    } else {
      audio.timeout();
      hero.react(S.stars ? 'clear' : 'timeout');
    }
    $('.wm-over-title').textContent = cleared ? t('over') : t('timeUp');
    setIconText($('.wm-score'), '⭐'.repeat(S.stars) + ' ' + t('score', { s: score }));
    $('.wm-result').textContent = (cleared ? '' : t('progress', { m: S.matched, p: pairs }) + ' · ') +
      t('result', { t: fmtTime(seconds), w: S.wrong, c: S.maxCombo });
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
      detail: {
        mode: S.mode, grade: S.grade, topic: S.topic, pairs, matched: S.matched, cleared,
        wrong: S.wrong, erased: S.erased, seconds, maxCombo: S.maxCombo
      }
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
    grid.classList.remove('preview');
  }

  $('.wm-replay').addEventListener('click', () => {
    if (!S || S.done || !S.cfg.cardSide) return;
    audio.warmSpeak();
    sayPrompt();
  });
  $('.wm-again').addEventListener('click', () => start());
  $('.wm-other').addEventListener('click', () => showOverlay('start'));
  $('.wm-lobby').addEventListener('click', () => ctx.exit());
  /* 판 중간에 그만두면 결과 없이 시작 화면으로 돌아갑니다. */
  $('.wm-quit').addEventListener('click', () => {
    stop();
    if (S) { S.done = true; S.locked = false; }
    prompt.hidden = true;
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
