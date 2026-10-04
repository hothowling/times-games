/*
 * index.js - 구구단 마스터: 화면 그리기, 화면 전환, 애니메이션, 입력 받기.
 * 원본: times-table-game/js/ui.js. 게임 규칙은 rules.js, 진행은 game.js 가 맡고 여기서는 화면에 옮깁니다.
 * 플랫폼 연결:
 *   - 언어 ctx.lang, 소리·읽어주기 켜기/끄기는 로비 설정(ctx.audio.getSound()/getTts())
 *   - 캐릭터 ctx.character (시작·결과 화면은 전신, 게임 화면은 얼굴만)
 *   - 진행도 ctx.progress = { round: 다음 라운드, missed: 복습 문제 키 } → 라운드가 끝날 때마다 저장
 *   - 라운드 결과 ctx.finish({ stars: 별 등급 0~3, score: 포인트+보너스, detail })
 */
import * as rules from './rules.js';
import { createGame } from './game.js';

export const dict = {
  ko: {
    title: '구구단 마스터',
    tagline: '빠르게 답하고 별을 모아요!',
    start: '시작!',
    round: '라운드 {n}',
    progress: '{i} / {n}',
    timeUp: '시간 초과!',
    tipHint: '💡 첫 자리는 {d}', tipTime: '⏳ +5초', tipPill: '💊 정답 {n} (이번 판은 별 2개까지)',
    great: '정답!',
    roundClear: '라운드 클리어!',
    next: '다음 라운드',
    home: '홈으로',
    quitAsk: '그만할까요?',
    keepGoing: '계속하기',
    points: '포인트',
    timeTaken: '걸린 시간',
    correctLabel: '정답 수',
    pointsLabel: '획득 포인트',
    bonus: '별 보너스',
    seconds: '{s}초',
    quit: '나가기',
    collected: '이번에 모은',
    starsLabel: '이번에 모은 별',
    howTo: '놀이 방법',
    rule1: '문제를 보고 아래 숫자 키패드로 답을 눌러요.',
    rule2: '시간의 절반 안에 맞히면 2점, 시간 안에 맞히면 1점!',
    rule3: '틀린 숫자를 눌러도 감점은 없어요. 다시 누르면 돼요.',
    rule4: '놓친 문제는 다음 라운드에 더 자주 나와요.'
  },
  en: {
    title: 'Times Table Master',
    tagline: 'Answer fast and collect stars!',
    start: 'Start!',
    round: 'Round {n}',
    progress: '{i} / {n}',
    timeUp: "Time's up!",
    tipHint: '💡 Starts with {d}', tipTime: '⏳ +5 seconds', tipPill: '💊 Answer {n} (max 2 stars this round)',
    great: 'Correct!',
    roundClear: 'Round Clear!',
    next: 'Next Round',
    home: 'Home',
    quitAsk: 'Stop playing?',
    keepGoing: 'Keep going',
    points: 'points',
    timeTaken: 'Time',
    correctLabel: 'Correct',
    pointsLabel: 'Points',
    bonus: 'Star bonus',
    seconds: '{s}s',
    quit: 'Quit',
    collected: 'Collected',
    starsLabel: 'Stars collected',
    howTo: 'How to play',
    rule1: 'Look at the problem and tap the answer on the keypad.',
    rule2: 'Answer within half the time for 2 points, in time for 1 point!',
    rule3: 'A wrong digit costs nothing. Just try again.',
    rule4: 'Missed problems come back more often next round.'
  }
};

const HTML = `
  <section class="screen" data-screen="home">
    <div class="m-top">
      <button type="button" class="m-icon" data-act="exit" data-i18n-aria="home"><img src="assets/ui/home.webp" alt=""></button>
    </div>
    <h1 class="title" data-i18n="title"></h1>
    <p class="tagline" data-i18n="tagline"></p>
    <div class="mascot mascot-home"></div>
    <div class="home-round"><span class="badge" data-ref="homeRound"></span></div>
    <button type="button" class="m-btn btn-primary btn-huge" data-act="start" data-i18n="start"></button>
    <h2 class="section-title" data-i18n="howTo"></h2>
    <ul class="rule-list">
      <li data-i18n="rule1"></li><li data-i18n="rule2"></li><li data-i18n="rule3"></li><li data-i18n="rule4"></li>
    </ul>
  </section>

  <section class="screen" data-screen="game">
    <div class="m-top game-top">
      <span class="badge" data-ref="gameRound"></span>
      <span class="badge" data-ref="gameProgress"></span>
      <div class="stars-row stars-small" data-ref="gameStars"></div>
      <button type="button" class="m-icon" data-act="quit" data-i18n-aria="quit">✕</button>
    </div>
    <div class="timer-track"><div class="timer-bar is-green" data-ref="timerBar"></div></div>
    <div class="q-area">
      <div class="q-card" data-ref="qCard">
        <span class="q-num" data-ref="qa">2</span>
        <span class="q-op">×</span>
        <span class="q-num" data-ref="qb">3</span>
        <span class="q-op">=</span>
        <span class="q-slot" data-ref="qSlot">?</span>
      </div>
      <div class="feedback" data-ref="feedback" aria-live="polite"></div>
    </div>
    <!-- 작은 캐릭터: 문제 카드와 키패드 사이. 움직임은 transform 만 써서 레이아웃이 밀리지 않습니다 -->
    <div class="mascot-row" data-ref="mascotRow">
      <div class="mascot mascot-game" data-ref="mascotGame"></div>
      <div class="m-items" data-ref="items"></div>
    </div>
    <div class="keypad" data-ref="keypad">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button type="button" class="key" data-digit="${d}">${d}</button>`).join('')}
      <span class="key key-blank" aria-hidden="true"></span>
      <button type="button" class="key" data-digit="0">0</button>
      <span class="key key-blank" aria-hidden="true"></span>
    </div>
  </section>

  <section class="screen" data-screen="result">
    <div class="confetti" data-ref="confetti" aria-hidden="true"></div>
    <h2 class="title small" data-i18n="roundClear"></h2>
    <div class="result-round" data-ref="resultRound"></div>
    <div class="mascot mascot-result"></div>
    <div class="result-stars" data-ref="resultStars" aria-live="polite"></div>
    <ul class="result-lines">
      <li><span data-i18n="timeTaken"></span><b data-ref="resTime">-</b></li>
      <li><span data-i18n="correctLabel"></span><b data-ref="resCorrect">-</b></li>
      <li><span data-i18n="pointsLabel"></span><b data-ref="resPoints">-</b></li>
      <li data-ref="resBonusRow"><span data-i18n="bonus"></span><b data-ref="resBonus">-</b></li>
    </ul>
    <div class="star-box">
      <div class="star-caption"><span data-i18n="collected"></span> <b data-ref="resultTotal">0</b> <span data-i18n="points"></span></div>
      <div class="stars-row" data-ref="resultStarsTotal" data-i18n-aria="starsLabel"></div>
    </div>
    <button type="button" class="m-btn btn-primary btn-huge" data-act="next" data-i18n="next"></button>
    <button type="button" class="m-btn btn-ghost" data-act="exit" data-i18n="home"></button>
  </section>

  <!-- 나가기 확인 모달 -->
  <div class="modal" data-ref="modalQuit" hidden>
    <div class="modal-card">
      <p class="modal-title" data-i18n="quitAsk"></p>
      <button type="button" class="m-btn btn-primary" data-act="keep" data-i18n="keepGoing"></button>
      <button type="button" class="m-btn btn-ghost" data-act="exit" data-i18n="home"></button>
    </div>
  </div>
`;

/*
 * 게임 화면 캐릭터 크기를 실제로 남는 공간(캐릭터 줄 위쪽 ~ 키패드 위쪽)에 맞춥니다.
 * 모바일 브라우저는 주소창/툴바 때문에 CSS 의 100vh 가 실제 보이는 높이보다 커서,
 * 화면 높이로 추정하지 않고 키패드 위치를 직접 잽니다.
 */
const MASCOT_MIN_W = 56;
const MASCOT_MAX_W = 200;
const MASCOT_ROOM = 26; /* 점프와 반짝이 여유 */

export function mount(root, ctx) {
  const { audio, t } = ctx;
  root.innerHTML = HTML;
  ctx.apply(root);

  const el = {};
  root.querySelectorAll('[data-ref]').forEach((n) => { el[n.dataset.ref] = n; });
  const screens = {};
  root.querySelectorAll('[data-screen]').forEach((n) => { screens[n.dataset.screen] = n; });

  /* 캐릭터: 화면마다 하나씩. 반응은 지금 보이는 화면의 캐릭터에게만 전합니다. */
  const chars = {
    home: ctx.character(root.querySelector('.mascot-home')),
    game: ctx.character(el.mascotGame, { body: false }),
    result: ctx.character(root.querySelector('.mascot-result'))
  };
  let current = 'home';
  const mascot = (state) => chars[current]?.react(state);

  let progress = rules.readProgress(ctx.progress);
  const starState = {};
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  };

  const game = createGame({
    onScreen: showScreen,
    onRoundStart,
    onQuestion,
    onTimer,
    onInput,
    onCorrect,
    onTransition,
    onTimeout,
    onWrong,
    onResult
  }, { isSpeaking: audio.isSpeaking });

  /* ---------- 화면 전환 ---------- */

  function showScreen(name) {
    audio.cancelSpeech();
    current = name;
    for (const [k, node] of Object.entries(screens)) node.classList.toggle('is-active', k === name);
    /* 화면이 바뀌면 캐릭터는 모두 대기 상태로 돌아갑니다(클리어 웃음 등 해제). */
    Object.values(chars).forEach((c) => c.react('idle'));
    if (name === 'home') renderHome();
    if (name !== 'result') clearConfetti();
    window.scrollTo(0, 0);
    if (name === 'game') fitGameMascot();
  }

  /* ---------- 별 표시 ---------- */

  function starIcons(points, maxIcons) {
    const s = rules.starsFor(points);
    let icons = [...Array(s.big).fill('🌟'), ...Array(s.small).fill('⭐')];
    if (maxIcons && icons.length > maxIcons) icons = [...icons.slice(0, maxIcons), '…'];
    return icons;
  }

  /* 별을 다시 그립니다. 개수가 늘었을 때만 새 별에 팝 애니메이션을 줍니다. */
  function renderStars(node, id, points, max) {
    const icons = starIcons(points, max);
    const before = starState[id] === undefined ? -1 : starState[id];
    node.textContent = '';
    if (!icons.length) {
      const none = document.createElement('span');
      none.className = 'star-none';
      none.textContent = '☆';
      node.appendChild(none);
    }
    icons.forEach((icon, i) => {
      const span = document.createElement('span');
      span.className = 'star' + (before >= 0 && i >= before ? ' pop' : '');
      span.textContent = icon;
      node.appendChild(span);
    });
    if (before >= 0 && icons.length > before) audio.starPop();
    starState[id] = icons.length;
  }

  /* ---------- 시작 화면 ---------- */

  function renderHome() {
    el.homeRound.textContent = t('round', { n: progress.round });
  }

  /* ---------- 게임 화면 ---------- */

  function renderTop(info) {
    el.gameRound.textContent = t('round', { n: info.round });
    el.gameProgress.textContent = t('progress', { i: info.number || 1, n: info.count });
  }

  function setFeedback(text, kind) {
    el.feedback.className = 'feedback' + (text ? ' show' + (kind ? ' ' + kind : '') : '');
    el.feedback.textContent = text || '';
  }

  /* 클래스를 다시 붙여 애니메이션을 처음부터 재생합니다. */
  function shakeCard() {
    el.qCard.classList.remove('shake');
    void el.qCard.offsetWidth;
    el.qCard.classList.add('shake');
  }

  function fitGameMascot() {
    if (current !== 'game') return;
    /* 보이는 높이가 짧으면 키패드를 줄여 캐릭터 자리를 만듭니다(재기 전에 적용). */
    const vh = window.innerHeight || 0;
    root.classList.toggle('is-compact', vh > 0 && vh < 760);
    root.classList.toggle('is-compact-xs', vh > 0 && vh < 640);
    const rowTop = el.mascotRow.getBoundingClientRect().top;
    /*
     * 키패드는 화면 아래에 고정(position: fixed; bottom: 0)이므로 윗선 = 보이는 높이 - 키패드 높이.
     * 화면 전환 애니메이션(transform) 중에는 getBoundingClientRect() 가 틀린 값을 주어 이렇게 계산합니다.
     */
    const padTop = (vh || el.keypad.getBoundingClientRect().bottom) - el.keypad.offsetHeight;
    const avail = Math.floor(padTop - rowTop - 8);
    /* 캐릭터 세로/가로 비율은 캐릭터마다 달라서 그려진 요소에서 잽니다. */
    const ratio = el.mascotGame.offsetHeight / el.mascotGame.offsetWidth || 1.12;
    const w = Math.min(MASCOT_MAX_W, Math.max(MASCOT_MIN_W, Math.floor((avail - MASCOT_ROOM) / ratio)));
    el.mascotGame.style.setProperty('--mascot-w', w + 'px');
    el.mascotRow.style.height = Math.max(avail, MASCOT_MIN_W) + 'px';
  }

  let fitTimer = null;
  function scheduleFit() {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => { fitTimer = null; fitGameMascot(); }, 60);
  }

  function onRoundStart(info) {
    renderTop({ round: info.round, number: 1, count: info.count });
    renderStars(el.gameStars, 'game', info.sessionPoints, 10);
    setFeedback('');
  }

  /* 다음 문제로 넘어가기 직전: 넘김 소리와 함께 문제 카드를 옆으로 밀어 냅니다. */
  function onTransition() {
    audio.nextFx();
    el.qCard.classList.remove('shake', 'is-entering');
    void el.qCard.offsetWidth;
    el.qCard.classList.add('is-leaving');
  }

  /* ---------- 아이템(공통: 힌트·모래시계·정답 알약). 문제마다 같은 아이템은 한 번. ---------- */

  let curAnswer = 0;
  let slotHint = '';           /* 답 칸에 흐리게 보여 줄 글자(힌트: 첫 자리, 알약: 정답) */
  let usedHere = new Set();
  const canUse = (id) => game.state() === 'question' && el.modalQuit.hidden && !usedHere.has(id);
  const showHint = (id, text, slot) => {
    usedHere.add(id);
    setFeedback(text, 'is-tip');
    if (slot !== undefined) { slotHint = slot; onInput(''); }
  };
  const itemBar = ctx.itemBar(el.items, {
    hint: { can: () => canUse('hint') && !usedHere.has('pill'), apply: () => { const d = String(curAnswer)[0]; showHint('hint', t('tipHint', { d }), String(curAnswer).length > 1 ? d + '_' : d); } },
    time: { can: () => canUse('time'), apply: () => { game.addTime(5); showHint('time', t('tipTime')); } },
    pill: { can: () => canUse('pill'), apply: () => showHint('pill', t('tipPill', { n: curAnswer }), String(curAnswer)) },
    pause: () => game.pause(),
    resume: () => { if (el.modalQuit.hidden && !document.hidden) game.resume(); }
  });

  function onQuestion(info) {
    curAnswer = info.answer;
    slotHint = '';
    usedHere = new Set();
    itemBar.refresh();
    renderTop(info);
    el.qa.textContent = String(info.a);
    el.qb.textContent = String(info.b);
    el.qSlot.className = 'q-slot';
    el.qSlot.textContent = '?';
    setFeedback('');
    el.qCard.classList.remove('shake', 'is-leaving', 'is-entering');
    void el.qCard.offsetWidth;
    el.qCard.classList.add('is-entering');
    /* 문제의 두 숫자를 차례로 읽어 줍니다(설정의 '문제 읽어주기'가 꺼져 있으면 audio 가 건너뜁니다). */
    audio.playNumbers(ctx.lang, [info.a, info.b]);
  }

  function onTimer(s) {
    const pct = Math.max(0, Math.min(1, s.ratio));
    el.timerBar.style.width = (pct * 100).toFixed(1) + '%';
    el.timerBar.className = 'timer-bar is-' + rules.timerColor(pct);
  }

  function onInput(buffer) {
    el.qSlot.className = 'q-slot' + (!buffer && slotHint ? ' is-hint' : '');
    el.qSlot.textContent = buffer || slotHint || '?';
  }

  /*
   * 정답 숫자를 읽어 줍니다. 효과음이 켜져 있으면 효과음이 끝나고 약 0.12초 뒤에 시작해
   * 두 소리가 겹치지 않게 합니다.
   */
  function speakAnswer(answer, fxSec) {
    const delay = audio.getSound() ? (fxSec || 0) + 0.12 : 0;
    audio.playNumbers(ctx.lang, [answer], { delay });
  }

  function onCorrect(info) {
    itemBar.refresh();
    el.qSlot.className = 'q-slot is-answer';
    el.qSlot.textContent = String(info.answer);
    setFeedback(t('great') + ' +' + info.points + (info.points === 2 ? '!' : ''), null);
    audio.correct();
    mascot('correct');
    renderStars(el.gameStars, 'game', info.sessionPoints, 10);
    speakAnswer(info.answer, audio.FX_CORRECT_SEC);
  }

  function onTimeout(info) {
    itemBar.refresh();
    el.qSlot.className = 'q-slot is-answer';
    el.qSlot.textContent = String(info.answer);
    setFeedback(t('timeUp') + ' = ' + info.answer, 'is-late');
    audio.timeout();
    mascot('timeout');
    speakAnswer(info.answer, audio.FX_TIMEOUT_SEC);
  }

  function onWrong() {
    shakeCard();
    setFeedback('✗', 'is-bad');
    audio.wrong();
    mascot('wrong');
    el.qSlot.className = 'q-slot';
    el.qSlot.textContent = '?';
  }

  /* ---------- 결과 화면 ---------- */

  function drawRatingStars(count) {
    el.resultStars.textContent = '';
    for (let i = 0; i < 3; i++) {
      const span = document.createElement('span');
      span.className = 'star' + (i < count ? ' pop' : '');
      span.textContent = i < count ? '★' : '☆';
      if (i < count) span.style.animationDelay = i * 220 + 'ms';
      el.resultStars.appendChild(span);
    }
  }

  function onResult(info) {
    el.resultRound.textContent = t('round', { n: info.round });
    el.resTime.textContent = t('seconds', { s: info.seconds.toFixed(1) });
    el.resCorrect.textContent = info.correct + ' / ' + info.count;
    el.resPoints.textContent = String(info.points);
    el.resBonus.textContent = '+' + info.bonus;
    el.resBonusRow.hidden = info.bonus <= 0;
    el.resultTotal.textContent = String(info.sessionPoints);
    renderStars(el.resultStarsTotal, 'result', info.sessionPoints, 14);
    drawRatingStars(info.stars);
    audio.fanfare();
    /* 별이 하나라도 있으면 웃으며 크게 두 번 뛰고, 0개면 살짝 시무룩했다가 돌아옵니다. */
    mascot(info.stars > 0 ? 'clear' : 'timeout');
    if (info.stars >= 3) confetti();

    /* 다음 라운드와 복습 문제를 저장하고, 별 등급을 플랫폼에 알립니다(보상 토스트는 플랫폼이 띄웁니다). */
    progress = { round: info.round + 1, missed: info.missed };
    ctx.saveProgress(progress);
    ctx.finish({
      stars: info.stars,
      score: info.total,
      detail: { round: info.round, correct: info.correct, questions: info.count, avgMs: info.avgMs }
    });
  }

  function confetti() {
    clearConfetti();
    const colors = ['#7c3aed', '#db2777', '#a78bfa', '#f4c020', '#1f9d63'];
    for (let i = 0; i < 36; i++) {
      const piece = document.createElement('i');
      piece.style.left = Math.round(Math.random() * 96) + '%';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = Math.round(Math.random() * 600) + 'ms';
      el.confetti.appendChild(piece);
    }
    later(clearConfetti, 2600);
  }

  function clearConfetti() {
    el.confetti.textContent = '';
  }

  /* ---------- 모달 ---------- */

  function openQuit() {
    el.modalQuit.hidden = false;
    game.pause();
    audio.cancelSpeech();
  }

  function closeQuit() {
    el.modalQuit.hidden = true;
    game.resume();
  }

  /* ---------- 이벤트 연결 ---------- */

  const actions = {
    start: () => { audio.unlock(); game.start(progress.round, progress.missed); },
    next: () => game.nextRound(),
    quit: openQuit,
    keep: closeQuit,
    exit: () => ctx.exit()
  };

  root.addEventListener('click', (ev) => {
    const digit = ev.target.closest('[data-digit]')?.dataset.digit;
    if (digit !== undefined) {
      audio.keyTap();
      game.pressDigit(digit);
      return;
    }
    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (act) actions[act]();
  });

  /* 더블탭 확대 방지 보조 */
  root.addEventListener('dblclick', (ev) => ev.preventDefault());

  function onKey(ev) {
    if (current !== 'game' || !el.modalQuit.hidden) return;
    if (ev.key >= '0' && ev.key <= '9') game.pressDigit(ev.key);
  }

  function onVisibility() {
    if (document.hidden) {
      game.pause();
      audio.cancelSpeech();
    } else if (el.modalQuit.hidden) {
      game.resume();
    }
  }

  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibility);
  /* 화면 회전, 주소창 접힘/펼침 등으로 보이는 높이가 바뀌면 캐릭터 크기를 다시 맞춥니다. */
  window.addEventListener('resize', scheduleFit);
  window.addEventListener('orientationchange', scheduleFit);
  window.visualViewport?.addEventListener('resize', scheduleFit);

  /* 지금 언어의 숫자 음성 파일을 미리 받아 둡니다. */
  audio.preloadVoices(ctx.lang);
  showScreen('home');

  return {
    destroy() {
      game.destroy();
      clearTimeout(fitTimer);
      timers.forEach(clearTimeout);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', scheduleFit);
      window.removeEventListener('orientationchange', scheduleFit);
      window.visualViewport?.removeEventListener('resize', scheduleFit);
    }
  };
}
