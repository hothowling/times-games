/*
 * classroom - 수지와 지호의 교실. 시험지를 풀고(DONE!) 선생님께 채점받아요.
 *   시험 → 제출 → 채점 → 선생님 반응 → 보상(ctx.finish) → 다음 라운드
 * 원본: times-class (index.html, game.js, styles.css). 플레이어 선택·상점·언어·일별 기록·localStorage 는 플랫폼으로 옮겼습니다.
 * 진행도(ctx.progress) = { round, hearts, best }. 하트가 0이면 연습 모드(3문제 중 2개)로 하트 1개를 되찾습니다.
 */
import {
  roundConfig, generateQuestions, correctOption, questionParts, questionText, cookieHint,
  grade as gradeOf, normalizeProgress, applyGrade, applyPractice, PRACTICE, PRACTICE_PASS, MAX_HEARTS
} from './rules.js';

export const dict = {
  ko: {
    homeTagline: '반짝반짝 구구단 교실', readyTitle: '시험 볼 준비 됐나요?', readyHelp: '카드를 눌러 시작해요!',
    homeShop: '도움 아이템 사러 가기', homeFooter: '답을 고르고 <strong>DONE!</strong>을 눌러 보세요',
    boardMessage: '오늘도<br />할 수 있어! ✦',
    dockCheat: '오답 지우기', dockCookie: '풀이 힌트', dockPill: '정답 보기', dockProtect: '보호막',
    grading: '채점 중', practiceTitle: '같이 연습해 봐요!', practiceHelp: '쉬운 문제 3개 중 2개를 맞히면<br />하트가 하나 돌아와요.',
    quitTitle: '시험을 그만할까요?', quitHelp: '지금까지 푼 답은 저장되지 않아요.',
    continueQuiz: '계속 풀기', goHome: '로비로',
    round: '라운드', resultRound: '라운드 {round} 결과', questionNormal: '맞는 답을 골라요', questionBlank: '빈칸에 들어갈 수를 골라요',
    heartsAria: '하트 {count}개', soundAria: '소리 켜기 또는 끄기', homeAria: '로비로 돌아가기', quitAria: '시험 그만하기',
    itemDockAria: '도움 아이템', itemUse: '{name} 사용', startAria: '{name}(으)로 시작',
    messageA: '완벽해!', messageB: '잘했어!', messageC: '조금만 더!', messageF: '다시 해보자!',
    ribbonA: '완벽해요!', ribbonB: '참 잘했어요!', ribbonC: '계속 연습해요!', ribbonF: '같이 연습해요!',
    scoreDetail: '{total}문제 중 {correct}문제 정답!', protected: ' (보호 +1)', heartLost: '하트가 하나 줄었어요 · 남은 하트 {count}개',
    heartKept: '하트를 모두 지켰어요!', nextRound: '다음 라운드', retry: '다시 도전', home: '로비',
    reviewTitle: '틀린 문제 다시 보기', myAnswer: '내 답', correctAnswer: '정답', reviewContinue: '눌러서 계속하기',
    hintProtect: '보호막: 이번 시험에서 틀린 문제 하나를 보호해요!', hintCheat: '오답 지우기: 틀린 답 두 개를 지웠어요!',
    hintCookie: '힌트 전구: {a} × {left} = {first}, {a} × {right} = {second} · 둘을 더해 보세요!',
    hintPill: '정답 알약: 정답은 {answer}예요. 직접 눌러 보세요! (이번 시험은 별 2개까지)',
    practiceCorrect: '맞았어요! ✨', practiceWrong: '괜찮아요! 정답은 {answer}', practiceRecovered: '하트가 돌아왔어요! ♥',
    practiceAgain: '한 번 더 해보면 할 수 있어요!'
  },
  en: {
    homeTagline: 'A Sparkly Times-Table Classroom', readyTitle: 'Ready for the test?', readyHelp: 'Tap the card to begin!',
    homeShop: 'Get help items', homeFooter: 'Pick an answer and press <strong>DONE!</strong>',
    boardMessage: 'You can<br />do it! ✦',
    dockCheat: 'Eraser', dockCookie: 'Math hint', dockPill: 'Show answer', dockProtect: 'Shield',
    grading: 'Grading', practiceTitle: "Let's practice together!", practiceHelp: 'Get 2 of 3 easy questions right<br />to win back one heart.',
    quitTitle: 'Leave this test?', quitHelp: 'Your answers in this test will not be saved.',
    continueQuiz: 'Keep playing', goHome: 'Lobby',
    round: 'ROUND', resultRound: 'ROUND {round} RESULT', questionNormal: 'Choose the correct answer', questionBlank: 'Choose the missing number',
    heartsAria: '{count} hearts', soundAria: 'Turn sound on or off', homeAria: 'Back to lobby', quitAria: 'Leave the test',
    itemDockAria: 'Help items', itemUse: 'Use {name}', startAria: 'Start as {name}',
    messageA: 'Amazing!', messageB: 'Good job!', messageC: 'Keep practicing!', messageF: 'Try again!',
    ribbonA: 'Perfect!', ribbonB: 'Great work!', ribbonC: 'Keep practicing!', ribbonF: "Let's practice!",
    scoreDetail: '{correct} out of {total} correct!', protected: ' (Shield +1)', heartLost: 'One heart used · {count} hearts left',
    heartKept: 'You kept all your hearts!', nextRound: 'Next Round', retry: 'Try Again', home: 'Lobby',
    reviewTitle: 'Review missed questions', myAnswer: 'Your answer', correctAnswer: 'Answer', reviewContinue: 'Tap to continue',
    hintProtect: 'Shield: one wrong answer is protected!', hintCheat: 'Eraser: two wrong answers are gone!',
    hintCookie: 'Hint Bulb: {a} × {left} = {first}, {a} × {right} = {second} · Add them together!',
    hintPill: 'Answer Pill: the answer is {answer}. Tap it yourself! (max 2 stars this test)',
    practiceCorrect: "That's right! ✨", practiceWrong: 'Nice try! The answer is {answer}', practiceRecovered: 'Your heart is back! ♥',
    practiceAgain: 'One more try—you can do it!'
  }
};

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Nunito:wght@700;800;900&display=swap';
const UI = 'assets/ui/';
/* 공통 아이템(core/catalog.js) 중 교실에서 쓰는 4종: 아이콘 파일과 도크 이름 */
const ITEMS = { eraser: 'cheat-sneak', hint: 'hint-bulb', pill: 'smart-pill', shield: 'score-protection' };
const DOCK_LABEL = { eraser: 'dockCheat', hint: 'dockCookie', pill: 'dockPill', shield: 'dockProtect' };

/* 효과음: 원본 playTone 의 음 높이 그대로. 한 음 = 0.16초, 0.09초 간격 */
const TONES = {
  select: [520], done: [390, 580], start: [360, 480, 650], grading: [280, 330],
  item: [610, 760], win: [520, 660, 820, 1040], softFail: [350, 300]
};

const TEACHER = '<div class="teacher-head"></div><div class="teacher-body"></div>';

const TEMPLATE = `
<div class="app">
  <section id="home-screen" class="screen home-screen active">
    <div class="sun-glow"></div>
    <div class="classroom-backdrop" aria-hidden="true">
      <div class="asset-classroom asset-classroom-home"><img src="assets/bg/classroom.webp" alt="" /></div>
    </div>
    <header class="title-card">
      <p data-i18n="homeTagline"></p>
      <h1><span>Sooji</span> <b>&amp;</b> <span>Jiho's</span><br />Classroom</h1>
      <div class="title-stars">✦ ✨ ✦</div>
    </header>
    <div class="select-panel">
      <div class="tape" aria-hidden="true"></div>
      <h2 data-i18n="readyTitle"></h2>
      <p class="select-help" data-i18n="readyHelp"></p>
      <button id="start-card" class="player-card">
        <span class="home-character-frame" aria-hidden="true"><span id="home-character" class="home-character"></span></span>
        <span class="player-card-text">
          <span id="player-name" class="player-card-name"></span>
          <span id="player-progress" class="player-progress"></span>
        </span>
      </button>
      <button id="home-shop" class="home-shop-button"><img src="${UI}cookie.webp" alt="" /><span data-i18n="homeShop"></span><b>→</b></button>
    </div>
    <button id="home-exit" class="round-icon exit-button" data-i18n-aria="homeAria"><img src="${UI}home.webp" alt="" /></button>
    <button id="home-sound" class="round-icon sound-button" data-i18n-aria="soundAria"><img src="${UI}sound.webp" alt="" /></button>
    <p class="home-footer" data-i18n-html="homeFooter"></p>
  </section>

  <section id="game-screen" class="screen game-screen">
    <header class="hud">
      <button id="home-button" class="hud-profile" data-i18n-aria="quitAria">
        <span id="hud-avatar" class="mini-avatar"></span>
        <span id="hud-name"></span>
      </button>
      <div class="hud-stat hearts" id="hud-hearts"></div>
      <div class="hud-stat sparkles"><img src="${UI}sparkle.webp" alt="" /><b id="hud-sparkles">0</b></div>
    </header>
    <div class="round-strip">
      <span id="round-label"></span>
      <div class="progress-track"><i id="quiz-progress"></i></div>
      <span id="question-count"></span>
    </div>
    <div class="classroom-play" aria-hidden="true">
      <div class="asset-classroom asset-classroom-play"><img src="assets/bg/classroom.webp" alt="" /></div>
      <div id="quiz-character" class="quiz-character"></div>
      <div class="play-board"><span data-i18n-html="boardMessage"></span></div>
      <div class="desk-back"></div>
    </div>
    <article class="paper" id="quiz-paper">
      <div class="paper-holes" aria-hidden="true"></div>
      <div id="question-type" class="question-type"></div>
      <div id="question" class="question"></div>
      <div id="answers" class="answers"></div>
      <button id="done-button" class="done-button" disabled>DONE!</button>
    </article>
    <div class="item-dock" data-i18n-aria="itemDockAria">
      ${Object.entries(ITEMS).map(([key, icon]) => `
      <button class="item-button" data-item="${key}">
        <span class="item-art"><img src="${UI}${icon}.webp" alt="" /></span><b data-count></b><small data-i18n="${DOCK_LABEL[key]}"></small>
      </button>`).join('')}
    </div>
    <div id="hint-toast" class="hint-toast" role="status"></div>
  </section>

  <section id="grading-screen" class="screen grading-screen">
    <div class="grading-board">
      <div class="teacher-wrap">${TEACHER}<div class="teacher-arm">╱</div></div>
      <div class="grading-bubble"><span data-i18n="grading"></span><i></i><i></i><i></i></div>
      <div class="grading-paper">A<span>+</span><div class="red-circle"></div></div>
    </div>
  </section>

  <section id="result-screen" class="screen result-screen">
    <div id="celebration" class="celebration" aria-hidden="true"></div>
    <header class="result-hud">
      <span id="result-round"></span>
      <span class="result-wallet"><img src="${UI}sparkle.webp" alt="" /> <b id="result-total-sparkles">0</b></span>
    </header>
    <div class="result-stage">
      <div class="teacher-mini">${TEACHER}</div>
      <div id="teacher-message" class="speech-bubble"></div>
      <div id="result-character" class="result-character"></div>
    </div>
    <article id="grade-card" class="grade-card grade-a">
      <div class="grade-ribbon"></div>
      <div id="grade-letter" class="grade-letter"></div>
      <div id="grade-stars" class="grade-stars"></div>
      <p id="score-detail"></p>
      <div class="reward-row"><img src="${UI}sparkle.webp" alt="" /><b id="reward-amount"></b></div>
      <div id="heart-result" class="heart-result"></div>
    </article>
    <div id="mistake-overlay" class="mistake-overlay" hidden>
      <section id="mistake-review" class="mistake-review" role="button" tabindex="0">
        <div class="review-heading"><span class="review-mark">✦</span><h3 data-i18n="reviewTitle"></h3></div>
        <div id="mistake-list" class="mistake-list"></div>
        <p class="review-continue"><span data-i18n="reviewContinue"></span> <span class="review-check">✓</span></p>
      </section>
    </div>
    <div class="result-actions">
      <button id="next-round" class="primary-action"></button>
      <button id="open-shop" class="secondary-action"><img class="action-icon" src="${UI}sparkle.webp" alt="" /> <span data-i18n="shop"></span></button>
      <button id="result-home" class="secondary-action"><img class="action-icon" src="${UI}home.webp" alt="" /> <span data-i18n="home"></span></button>
    </div>
  </section>

  <section id="practice-screen" class="screen practice-screen">
    <div class="practice-card">
      <div class="practice-badge">PRACTICE</div>
      <div class="teacher-mini practice-teacher">${TEACHER}</div>
      <h2 data-i18n="practiceTitle"></h2>
      <p data-i18n-html="practiceHelp"></p>
      <div id="practice-dots" class="practice-dots"><i></i><i></i><i></i></div>
      <div id="practice-question" class="practice-question"></div>
      <div id="practice-answers" class="practice-answers"></div>
      <div id="practice-message" class="practice-message"></div>
    </div>
  </section>

  <div id="confirm-modal" class="confirm-modal" hidden>
    <div class="confirm-card">
      <div class="confirm-icon"><img id="confirm-img" src="${UI}home.webp" alt="" /></div>
      <h2 id="confirm-title"></h2>
      <p data-i18n="quitHelp"></p>
      <div>
        <button id="continue-quiz" data-i18n="continueQuiz"></button>
        <button id="quit-quiz"></button>
      </div>
    </div>
  </div>
</div>`;

export function mount(el, ctx) {
  const t = ctx.t;
  const $ = (sel) => el.querySelector(sel);
  const $$ = (sel) => [...el.querySelectorAll(sel)];

  /* 원본 글꼴(Gaegu 손글씨, Nunito). 나갈 때 뗍니다. */
  const font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = FONT_HREF;
  document.head.appendChild(font);

  el.innerHTML = TEMPLATE;
  ctx.apply(el);

  let progress = normalizeProgress(ctx.progress);
  let quiz = null;
  let hintTimer = null;
  let alive = true;
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms);
    timers.add(id);
    return id;
  };

  /* 캐릭터: 플랫폼의 현재 캐릭터(옷·장식 포함). 정리는 플랫폼이 합니다. */
  const homeChr = ctx.character($('#home-character'));
  const quizChr = ctx.character($('#quiz-character'));
  const resultChr = ctx.character($('#result-character'));
  ctx.character($('#hud-avatar'), { body: false }).expression('happy');
  homeChr.expression('happy');
  quizChr.expression('happy');

  function playTone(type) {
    if (!ctx.audio.getSound()) return;
    const wave = type === 'softFail' ? 'sine' : 'triangle';
    (TONES[type] || [440]).forEach((freq, i) => ctx.audio.tone({ freq, dur: 0.16, type: wave, gain: 0.09, at: i * 0.09 }));
  }

  function showScreen(id) {
    for (const s of $$('.screen')) s.classList.toggle('active', s.id === id);
    $('#' + id).scrollTop = 0;
  }

  /* ---------- 홈 ---------- */

  function updateHome() {
    $('#player-name').textContent = ctx.characterName;
    $('#player-progress').textContent = `${t('round')} ${progress.round} · ♥ ${progress.hearts}`;
    $('#start-card').setAttribute('aria-label', t('startAria', { name: ctx.characterName }));
    $('#home-sound').classList.toggle('is-muted', !ctx.audio.getSound());
  }

  function start() {
    playTone('start');
    if (progress.hearts <= 0) startPractice();
    else startRound();
  }

  /* ---------- 시험 ---------- */

  function startRound() {
    quiz = {
      questions: generateQuestions(roundConfig(progress.round)),
      index: 0,
      answers: [],
      selected: null,
      questionItems: new Set(),
      protection: false
    };
    updateGameHUD();
    renderQuestion();
    showScreen('game-screen');
  }

  function renderQuestion() {
    const q = quiz.questions[quiz.index];
    const total = quiz.questions.length;
    quiz.selected = null;
    quiz.questionItems.clear();
    $('#round-label').textContent = `${t('round')} ${progress.round}`;
    $('#question-count').textContent = `${quiz.index + 1} / ${total}`;
    $('#quiz-progress').style.width = `${(quiz.index / total) * 100}%`;
    $('#question-type').textContent = q.mode === 'normal' ? t('questionNormal') : t('questionBlank');
    const [before, after] = questionParts(q);
    $('#question').innerHTML = `${before}<span>?</span>${after}`;
    $('#answers').innerHTML = q.options.map((n) => `<button class="answer-button" data-answer="${n}">${n}</button>`).join('');
    $('#done-button').disabled = true;
    updateItemDock();
    hideHint();
  }

  function selectAnswer(button) {
    for (const b of $$('.answer-button')) b.classList.remove('selected');
    button.classList.add('selected');
    quiz.selected = Number(button.dataset.answer);
    $('#done-button').disabled = false;
    playTone('select');
  }

  function submitAnswer() {
    if (!quiz || quiz.selected === null) return;
    const q = quiz.questions[quiz.index];
    const right = correctOption(q);
    quiz.answers.push({ selected: quiz.selected, correct: right, isCorrect: quiz.selected === right });
    /* 연타로 같은 답이 두 번 들어가지 않게 바로 잠급니다. */
    quiz.selected = null;
    $('#done-button').disabled = true;
    playTone('done');
    quiz.index += 1;
    if (quiz.index >= quiz.questions.length) {
      $('#quiz-progress').style.width = '100%';
      later(showGrading, 220);
      return;
    }
    const paper = $('#quiz-paper');
    paper.classList.add('paper-next');
    later(() => {
      renderQuestion();
      paper.classList.remove('paper-next');
    }, 180);
  }

  function updateGameHUD() {
    $('#hud-name').textContent = ctx.characterName;
    $('#hud-sparkles').textContent = ctx.sparkles();
    $('#hud-hearts').innerHTML = Array.from({ length: MAX_HEARTS }, (_, i) => {
      const full = i < progress.hearts;
      return `<img class="heart-icon${full ? '' : ' is-empty'}" src="${UI}${full ? 'heart-full' : 'heart-empty'}.webp" alt="" />`;
    }).join('');
    $('#hud-hearts').setAttribute('aria-label', t('heartsAria', { count: progress.hearts }));
  }

  /* ---------- 도움 아이템 ---------- */

  const itemUsed = (key) => quiz.questionItems.has(key) || (key === 'shield' && quiz.protection);

  function updateItemDock() {
    for (const button of $$('.item-button')) {
      const key = button.dataset.item;
      const n = ctx.items.count(key);
      const used = itemUsed(key);
      button.querySelector('[data-count]').textContent = n;
      button.setAttribute('aria-label', t('itemUse', { name: t(DOCK_LABEL[key]) }));
      /* 다 쓴 아이템은 흐리게 두고, 누르면 그 자리에서 살지 묻습니다(ctx.items.use). */
      button.classList.toggle('is-empty', n <= 0 && !used);
      button.classList.toggle('used', used);
      button.disabled = used;
    }
  }

  /* 아이템을 먼저 쓰고(없으면 플랫폼이 그 자리에서 살지 묻습니다) 효과를 줍니다. 그사이 문제가 바뀌었으면 효과는 주지 않습니다. */
  let itemBusy = false;
  async function useItem(key) {
    if (!quiz?.questions || itemUsed(key) || itemBusy) return;
    const q = quiz.questions[quiz.index];
    itemBusy = true;
    const ok = await ctx.items.use(key);
    itemBusy = false;
    if (!alive || !ok || quiz?.questions?.[quiz.index] !== q) { if (alive && quiz?.questions) updateItemDock(); return; }
    const right = correctOption(q);
    if (key === 'shield') {
      quiz.protection = true;
      showHint(t('hintProtect'));
    } else {
      quiz.questionItems.add(key);
      if (key === 'eraser') {
        const wrong = $$('.answer-button').filter((b) => Number(b.dataset.answer) !== right);
        for (const b of wrong) {
          b.classList.add('eliminated');
          b.classList.remove('selected');
          if (Number(b.dataset.answer) === quiz.selected) { quiz.selected = null; $('#done-button').disabled = true; }
        }
        showHint(t('hintCheat'));
      } else if (key === 'hint') {
        showHint(t('hintCookie', cookieHint(q)));
      } else if (key === 'pill') {
        showHint(t('hintPill', { answer: right }));
      }
    }
    playTone('item');
    updateItemDock();
  }

  function showHint(message) {
    clearTimeout(hintTimer);
    const toast = $('#hint-toast');
    toast.textContent = message;
    toast.classList.add('show');
    hintTimer = later(hideHint, 5200);
  }
  function hideHint() { $('#hint-toast').classList.remove('show'); }

  /* ---------- 채점·결과 ---------- */

  function showGrading() {
    const raw = quiz.answers.filter((a) => a.isCorrect).length;
    const g = gradeOf(raw, quiz.questions.length, quiz.protection);
    const round = progress.round;
    progress = applyGrade(progress, g);
    ctx.saveProgress(progress);
    /* 채점 연출(1.75초) 동안 결과를 보내 둡니다. Sparkles 는 서버가 별로 정합니다. */
    const reward = ctx.finish({ stars: g.stars, score: raw, detail: { round, correct: raw, total: g.total, grade: g.letter } });
    showScreen('grading-screen');
    playTone('grading');
    later(async () => {
      const r = await reward;
      if (alive) showResult(g, round, r);
    }, 1750);
  }

  function showResult(g, round, reward) {
    const fail = g.letter === 'F';
    $('#result-round').textContent = t('resultRound', { round });
    $('#result-total-sparkles').textContent = reward.sparkles;
    $('#teacher-message').textContent = t('message' + g.key);
    $('#grade-letter').textContent = g.letter;
    $('#grade-stars').textContent = g.mark;
    $('#grade-card').className = `grade-card ${g.cls}`;
    $('#grade-card .grade-ribbon').textContent = t('ribbon' + g.key);
    $('#score-detail').textContent = t('scoreDetail', { total: g.total, correct: g.rawCorrect }) + (g.protected ? t('protected') : '');
    $('#reward-amount').textContent = `+${reward.earned}`;
    $('#heart-result').textContent = fail ? t('heartLost', { count: progress.hearts }) : t('heartKept');
    $('#next-round').innerHTML = `${fail ? t('retry') : t('nextRound')} <span>→</span>`;
    renderMistakeReview();
    resultChr.expression(g.expression);
    makeCelebration(g.letter);
    showScreen('result-screen');
    playTone(fail ? 'softFail' : 'win');
  }

  function renderMistakeReview() {
    const mistakes = quiz.answers
      .map((answer, i) => ({ answer, question: quiz.questions[i] }))
      .filter(({ answer }) => !answer.isCorrect);
    $('#mistake-overlay').hidden = mistakes.length === 0;
    $('#mistake-list').innerHTML = mistakes.map(({ answer, question }) => `
      <div class="mistake-row">
        <div class="mistake-question">${questionText(question)}</div>
        <div class="mistake-answers">
          <span class="mistake-answer">${t('myAnswer')} ${answer.selected}</span>
          <span aria-hidden="true">→</span>
          <span class="correct-answer">${t('correctAnswer')} ${answer.correct}</span>
        </div>
      </div>`).join('');
  }

  function dismissMistakeReview() {
    const overlay = $('#mistake-overlay');
    if (overlay.hidden) return;
    overlay.hidden = true;
    $('#next-round').focus({ preventScroll: true });
  }

  /* A+ 는 색종이 45개, B 18개, C 9개, F 없음 */
  function makeCelebration(letter) {
    const box = $('#celebration');
    box.textContent = '';
    if (letter === 'F') return;
    const count = letter === 'A+' ? 45 : letter === 'B' ? 18 : 9;
    const colors = ['#ff4f7b', '#ffcc2f', '#2b9cf0', '#9b5de5', '#30c97a'];
    for (let i = 0; i < count; i += 1) {
      const bit = document.createElement('i');
      bit.className = 'confetti';
      bit.style.left = `${Math.random() * 100}%`;
      bit.style.background = colors[i % colors.length];
      bit.style.setProperty('--time', `${2.4 + Math.random() * 2.6}s`);
      bit.style.setProperty('--delay', `${-Math.random() * 3}s`);
      bit.style.setProperty('--rotate', `${Math.random() * 180}deg`);
      box.appendChild(bit);
    }
  }

  function nextRound() {
    if (progress.hearts <= 0) startPractice();
    else startRound();
  }

  /* ---------- 연습 모드(하트 0개) ---------- */

  function startPractice() {
    quiz = { practice: { index: 0, correct: 0, questions: generateQuestions(PRACTICE) } };
    for (const dot of $$('#practice-dots i')) dot.className = '';
    renderPracticeQuestion();
    showScreen('practice-screen');
  }

  function renderPracticeQuestion() {
    const q = quiz.practice.questions[quiz.practice.index];
    $('#practice-question').textContent = questionText(q);
    $('#practice-answers').innerHTML = q.options.map((n) => `<button data-practice-answer="${n}">${n}</button>`).join('');
    $('#practice-message').textContent = '';
  }

  function answerPractice(value) {
    const p = quiz.practice;
    const q = p.questions[p.index];
    const correct = value === q.answer;
    if (correct) p.correct += 1;
    $$('#practice-dots i')[p.index].className = correct ? 'correct' : 'wrong';
    $('#practice-message').textContent = correct ? t('practiceCorrect') : t('practiceWrong', { answer: q.answer });
    playTone(correct ? 'select' : 'softFail');
    for (const b of $$('#practice-answers button')) b.disabled = true;
    p.index += 1;
    later(() => {
      if (p.index < PRACTICE.count) renderPracticeQuestion();
      else finishPractice();
    }, 900);
  }

  function finishPractice() {
    const passed = quiz.practice.correct >= PRACTICE_PASS;
    progress = applyPractice(progress, quiz.practice.correct);
    if (passed) {
      ctx.saveProgress(progress);
      $('#practice-message').textContent = t('practiceRecovered');
      playTone('win');
      later(startRound, 1300);
    } else {
      $('#practice-message').textContent = t('practiceAgain');
      later(startPractice, 1400);
    }
  }

  /* ---------- 그만하기 확인 창 ---------- */

  function ask() {
    $('#confirm-title').textContent = t('quitTitle');
    $('#quit-quiz').textContent = t('goHome');
    $('#confirm-img').src = UI + 'home.webp';
    $('#confirm-modal').hidden = false;
  }

  /* ---------- 이벤트(모두 el 안의 요소라 el 과 함께 사라집니다) ---------- */

  $('#start-card').addEventListener('click', start);
  $('#home-shop').addEventListener('click', () => ctx.openShop());
  $('#home-exit').addEventListener('click', () => ctx.exit());
  $('#home-sound').addEventListener('click', () => {
    ctx.setSound(!ctx.audio.getSound());
    updateHome();
    playTone('select');
  });
  $('#answers').addEventListener('click', (e) => {
    const b = e.target.closest('.answer-button');
    if (b && !b.classList.contains('eliminated')) selectAnswer(b);
  });
  $('#done-button').addEventListener('click', submitAnswer);
  for (const b of $$('.item-button')) b.addEventListener('click', () => useItem(b.dataset.item));
  $('#home-button').addEventListener('click', ask);
  $('#continue-quiz').addEventListener('click', () => { $('#confirm-modal').hidden = true; });
  $('#quit-quiz').addEventListener('click', () => {
    $('#confirm-modal').hidden = true;
    ctx.exit();
  });
  $('#next-round').addEventListener('click', nextRound);
  $('#result-home').addEventListener('click', () => ctx.exit());
  $('#open-shop').addEventListener('click', () => ctx.openShop());
  $('#mistake-overlay').addEventListener('click', dismissMistakeReview);
  $('#mistake-review').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dismissMistakeReview();
    }
  });
  $('#practice-answers').addEventListener('click', (e) => {
    const b = e.target.closest('[data-practice-answer]');
    if (b && !b.disabled) answerPractice(Number(b.dataset.practiceAnswer));
  });

  updateHome();

  return {
    destroy() {
      alive = false;
      for (const id of timers) clearTimeout(id);
      timers.clear();
      font.remove();
    }
  };
}
