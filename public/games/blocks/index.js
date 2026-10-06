import { icon, iconMarkup, setIconText } from '../../core/icons.js';
/*
 * blocks/index.js - 구구단 땅따먹기(원본 times-block/js/game.js). 화면, 판 그리기(끌기), 카드, 소리/캐릭터 연결.
 * 규칙 판정은 rules.js, 효과음·숫자 읽기는 ctx.audio, 캐릭터는 ctx.character 가 맡습니다.
 * 진행도: { level: 아직 못 깬 판, puzzle: 그 판의 문제 } (ctx.saveProgress). 판을 다 채우면 ctx.finish 로 별(지운 땅 수 기준)을 보고합니다.
 * 못 깬 판의 문제는 저장해 두어 나갔다 와도 같은 문제가 나옵니다(건너뛰기 없음). 깬 판은 상단 판 번호를 눌러 골라 다시 할 수 있습니다.
 */
import * as P from './rules.js';

export const dict = {
  ko: {
    titleHtml: '구구단<br>땅따먹기',
    start: '시작!',
    levelLine: '<b>{n}</b>판 · {size}',
    level: '{n}판',
    rule1: '카드가 <b>12</b>면 <b>3×4</b>나 <b>2×6</b>으로 칸을 끌어서 그려요.',
    rule2: '가로·세로는 2~9칸. 이미 채운 칸과는 겹칠 수 없어요.',
    rule3: '카드를 모두 한 번씩 써서 판을 빈틈없이 채우면 성공!',
    rule4: '그려 놓은 땅을 톡 누르면 지워져요.',
    help: '숫자 카드만큼 칸을 끌어서 그려요.',
    big: '가로·세로는 9칸까지예요.',
    overlap: '이미 채운 칸과 겹쳐요.',
    outside: '판 밖으로 나갔어요.',
    nocard: '{n} 카드가 없어요.',
    hintBtn: '💡 힌트 {n}',
    hintShow: '반짝이는 곳에 {w}×{h}={n}!',
    hintNone: '지금 놓은 땅으로는 다 채울 수 없어요. 땅을 하나 지워 보세요.',
    removedMsg: '땅을 지웠어요.',
    card: '{n} 카드',
    cardUsed: '{n} 카드, 사용함',
    clearAll: '모두 지우기',
    pickLevel: '몇 판을 할까요?',
    close: '닫기',
    boardLabel: '땅따먹기 판',
    quit: '나가기',
    winTitle: '다 채웠어요!',
    timeTaken: '걸린 시간',
    removedLabel: '지운 땅',
    times: '{n}번',
    stars: '별 {n}개',
    next: '다음 판',
    quitAsk: '그만할까요?',
    keepGoing: '계속하기'
  },
  en: {
    titleHtml: 'Times Table<br>Blocks',
    start: 'Start!',
    levelLine: 'Level <b>{n}</b> · {size}',
    level: 'Level {n}',
    rule1: 'For card <b>12</b>, drag out <b>3×4</b> or <b>2×6</b> squares.',
    rule2: 'Each side is 2 to 9 squares. Blocks can’t overlap.',
    rule3: 'Use every card once and fill the whole board to win!',
    rule4: 'Tap a block to remove it.',
    help: 'Drag to draw a block that matches a card.',
    big: 'Each side can be at most 9 squares.',
    overlap: 'That overlaps a filled square.',
    outside: 'That goes off the board.',
    nocard: 'There’s no {n} card.',
    hintBtn: '💡 Hint {n}',
    hintShow: 'Try {w}×{h}={n} on the glowing spot!',
    hintNone: 'These blocks can’t fill the board. Try removing one.',
    removedMsg: 'Block removed.',
    card: 'Card {n}',
    cardUsed: 'Card {n}, used',
    clearAll: 'Clear all',
    pickLevel: 'Pick a level',
    close: 'Close',
    boardLabel: 'Game board',
    quit: 'Quit',
    winTitle: 'Board filled!',
    timeTaken: 'Time',
    removedLabel: 'Blocks removed',
    times: '{n}',
    stars: '{n} stars',
    next: 'Next level',
    quitAsk: 'Stop playing?',
    keepGoing: 'Keep going'
  }
};

/* 원본 index.html 의 화면 구성. 처음 화면의 언어 버튼 대신 로비로 나가는 버튼을 둡니다. */
const HTML = `
<div class="app">
  <section class="screen screen-home is-active" data-screen="home">
    <button type="button" class="hud-btn btn-exit" data-i18n-aria="goLobby">${iconMarkup('home')}</button>
    <h1 class="title" data-i18n-html="titleHtml"></h1>
    <div class="mascot mascot-home"></div>
    <p class="level-line" data-ref="homeLevel"></p>
    <button type="button" class="btn btn-primary btn-huge" data-ref="start" data-i18n="start"></button>
    <ol class="rules">
      <li data-i18n-html="rule1"></li>
      <li data-i18n-html="rule2"></li>
      <li data-i18n-html="rule3"></li>
      <li data-i18n-html="rule4"></li>
    </ol>
  </section>

  <section class="screen screen-game" data-screen="game">
    <div class="bar hud-bar">
      <button type="button" class="hud-btn" data-ref="quit" data-i18n-aria="quit">${iconMarkup('home')}</button>
      <button type="button" class="hud-pill level-btn" data-ref="level" aria-haspopup="dialog"></button>
      <span class="hud-pill" data-ref="time">0:00</span>
      <button type="button" class="hud-btn hud-push" data-ref="sound" data-i18n-aria="sound"></button>
    </div>
    <div class="board-wrap">
      <div class="board" data-ref="board" role="application" data-i18n-aria="boardLabel"></div>
    </div>
    <div class="talk-row">
      <div class="mascot mascot-game"></div>
      <p class="bubble" data-ref="bubble" aria-live="polite"></p>
    </div>
    <div class="cards" data-ref="cards"></div>
    <div class="actions">
      <button type="button" class="btn btn-ghost" data-ref="hint"></button>
      <button type="button" class="btn btn-ghost" data-ref="clear" data-i18n="clearAll"></button>
    </div>
  </section>
</div>

<div class="modal" data-ref="win" hidden>
  <div class="modal-card">
    <p class="modal-title" data-i18n="winTitle"></p>
    <div class="mascot mascot-result"></div>
    <div class="result-stars" data-ref="winStars"></div>
    <ul class="result-lines">
      <li><span data-i18n="timeTaken"></span><b data-ref="winTime">-</b></li>
      <li><span data-i18n="removedLabel"></span><b data-ref="winRemoved">-</b></li>
    </ul>
    <button type="button" class="btn btn-primary" data-ref="next" data-i18n="next"></button>
    <button type="button" class="btn btn-ghost" data-ref="exitWin" data-i18n="goLobby"></button>
  </div>
</div>

<div class="modal" data-ref="levelModal" hidden>
  <div class="modal-card">
    <p class="modal-title" data-i18n="pickLevel"></p>
    <div class="level-grid" data-ref="levelGrid"></div>
    <button type="button" class="btn btn-ghost" data-ref="levelClose" data-i18n="close"></button>
  </div>
</div>

<div class="modal" data-ref="quitModal" hidden>
  <div class="modal-card">
    <p class="modal-title" data-i18n="quitAsk"></p>
    <button type="button" class="btn btn-primary" data-ref="keep" data-i18n="keepGoing"></button>
    <button type="button" class="btn btn-ghost" data-ref="exitQuit" data-i18n="goLobby"></button>
  </div>
</div>`;

export function mount(el, ctx) {
  const A = ctx.audio;
  const t = ctx.t;
  el.innerHTML = HTML;
  ctx.apply(el);
  const $ = {};
  for (const n of el.querySelectorAll('[data-ref]')) $[n.dataset.ref] = n;
  const board = $.board;

  /* 원본 마스코트는 얼굴 그림이라 세 자리 모두 얼굴만 그립니다. */
  const chars = {
    home: ctx.character(el.querySelector('.mascot-home'), { body: true }),
    game: ctx.character(el.querySelector('.mascot-game'), { body: true }),
    result: ctx.character(el.querySelector('.mascot-result'), { body: true })
  };

  let level = Math.max(1, Number(ctx.progress?.level) || 1);  /* 아직 못 깬 판(지금까지 연 마지막 판) */
  let current = level;                                         /* 지금 하는 판 */
  let saved = ctx.progress?.puzzle?.level === level ? ctx.progress.puzzle : null;
  let W = 6;
  let H = 6;
  let cards = [];
  let used = [];
  let owner = [];      /* 칸마다 조각 번호, 빈 칸은 -1 */
  let pieces = [];     /* 조각 번호 → { x, y, w, h, card, el } 또는 null(지움) */
  let removed = 0;
  let startedAt = 0;
  let clock = null;
  let drag = null;
  let preview = null;
  let done = false;

  /* destroy() 에서 한꺼번에 지우려고 setTimeout 을 모아 둡니다. */
  const timers = new Set();
  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  }

  /* 원본 소리 버튼은 효과음과 숫자 읽기를 함께 껐습니다. 숫자 읽기도 소리가 켜져 있을 때만 합니다. */
  function speak(nums, opts) {
    if (A.getSound()) A.playNumbers(ctx.lang, nums, opts);
  }

  function show(name) {
    for (const s of el.querySelectorAll('.screen')) s.classList.toggle('is-active', s.dataset.screen === name);
    Object.values(chars).forEach((c) => c.react('idle'));
  }

  function say(text, tone) {
    setIconText($.bubble, text);
    $.bubble.className = 'bubble' + (tone ? ' is-' + tone : '');
  }

  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function tick() {
    $.time.textContent = fmtTime(Date.now() - startedAt);
  }

  /* ---------- 홈 ---------- */

  function renderHome() {
    const n = P.boardSize(level);
    $.homeLevel.innerHTML = t('levelLine', { n: level, size: n + '×' + n });
  }

  /* ---------- 새 판 ---------- */

  function newPuzzle() {
    W = H = P.boardSize(current);
    let shape = current === level ? saved : null;
    if (!shape) {
      shape = P.carve(P.generate(W, H), W, H, current);
      if (current === level) {
        saved = { level, pieces: shape.pieces, holes: shape.holes };
        ctx.saveProgress({ level, puzzle: saved });
      }
    }
    cards = P.cardsFor(shape.pieces);
    used = cards.map(() => false);
    owner = new Array(W * H).fill(-1);
    for (const r of shape.holes) {
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) owner[y * W + x] = P.HOLE;
    }
    pieces = [];
    removed = 0;
    done = false;
    drag = null;
    preview = null;
    hintEl = null;
    /* 땅(채울 칸)만 칸마다 그립니다. 구멍은 비워 두어 판이 L·T·U 모양이나 가운데가 빈 모양이 됩니다. */
    const land = document.createElement('div');
    land.className = 'land';
    owner.forEach((v, i) => {
      if (v === P.HOLE) return;
      const c = document.createElement('i');
      c.style.gridArea = `${Math.floor(i / W) + 1} / ${i % W + 1}`;
      land.appendChild(c);
    });
    board.replaceChildren(land);
    renderHint();
    board.style.setProperty('--w', W);
    board.style.setProperty('--h', H);
    $.level.textContent = t('level', { n: current }) + ' ▾';
    renderCards();
    say(t('help'));
    startedAt = Date.now();
    clearInterval(clock);
    clock = setInterval(tick, 1000);
    tick();
  }

  function pieceOfCard(i) {
    return pieces.find((p) => p && p.card === i) || null;
  }

  function renderCards(match) {
    const box = $.cards;
    box.textContent = '';
    cards.forEach((n, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card' + (used[i] ? ' is-used' : '') + (!used[i] && n === match ? ' is-match' : '');
      b.dataset.n = n;
      const num = document.createElement('span');
      num.textContent = n;
      b.appendChild(num);
      if (used[i]) {
        const p = pieceOfCard(i);
        if (p) {
          const s = document.createElement('small');
          s.textContent = p.w + '×' + p.h;
          b.appendChild(s);
        }
        b.setAttribute('aria-label', t('cardUsed', { n }));
      } else {
        b.setAttribute('aria-label', t('card', { n }));
      }
      box.appendChild(b);
    });
  }

  /* ---------- 좌표 ---------- */

  function cellAt(e) {
    const r = board.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / (r.width / W));
    const y = Math.floor((e.clientY - r.top) / (r.height / H));
    return { x: Math.max(0, Math.min(W - 1, x)), y: Math.max(0, Math.min(H - 1, y)) };
  }

  function place(node, r) {
    node.style.setProperty('--x', r.x);
    node.style.setProperty('--y', r.y);
    node.style.setProperty('--pw', r.w);
    node.style.setProperty('--ph', r.h);
  }

  /* ---------- 미리보기 ---------- */

  function updatePreview() {
    const r = P.rectFrom(drag.start, drag.cur);
    const res = P.check(r, W, owner, cards, used);
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'preview';
      board.appendChild(preview);
    }
    place(preview, r);
    preview.classList.toggle('is-ok', res.ok);
    preview.textContent = r.w + '×' + r.h + '=' + r.w * r.h;
    renderCards(res.ok ? r.w * r.h : 0);
    return { rect: r, res };
  }

  function dropPreview(bad) {
    const p = preview;
    preview = null;
    if (!p) return;
    if (!bad) { p.remove(); return; }
    p.classList.add('is-bad');
    later(() => p.remove(), 300);
  }

  /* ---------- 놓기 / 지우기 ---------- */

  function addPiece(r, cardIndex) {
    const id = pieces.length;
    const node = document.createElement('div');
    const color = id % 8;
    node.className = 'piece';
    node.style.setProperty('--fill', 'var(--p' + color + ')');
    node.style.setProperty('--edge', 'var(--p' + color + '-edge)');
    place(node, r);
    node.innerHTML = '<span class="n">' + r.w * r.h + '</span><span class="f">' + r.w + '×' + r.h + '</span>';
    board.appendChild(node);
    pieces.push({ x: r.x, y: r.y, w: r.w, h: r.h, card: cardIndex, el: node });
    used[cardIndex] = true;
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) owner[y * W + x] = id;
    }
  }

  /* ---------- 힌트(공통 아이템 hint) ---------- */

  let hintEl = null;
  let hintBusy = false;

  function renderHint() {
    $.hint.textContent = t('hintBtn', { n: ctx.items.count('hint') });
  }

  function clearHint() {
    if (hintEl) hintEl.remove();
    hintEl = null;
  }

  /* 지금 놓은 땅으로 끝까지 채울 수 있는 다음 조각을 보여 줍니다. 채울 수 없으면 아이템을 쓰지 않고 알려 줍니다.
     힌트 전구가 없으면 ctx.items.use 가 그 자리에서 살지 묻습니다. */
  async function useHint() {
    if (done || hintBusy) return;
    A.unlock();
    const r = P.hint(W, H, owner, cards, used);
    if (!r) { say(t('hintNone'), 'bad'); chars.game.react('wrong'); return; }
    hintBusy = true;
    const ok = await ctx.items.use('hint');
    hintBusy = false;
    renderHint();
    if (!ok) return;
    clearHint();
    hintEl = document.createElement('div');
    hintEl.className = 'hint';
    place(hintEl, r);
    board.appendChild(hintEl);
    A.nextFx();
    say(t('hintShow', { w: r.w, h: r.h, n: r.w * r.h }), 'good');
  }

  function removePiece(id) {
    const p = pieces[id];
    if (!p) return;
    pieces[id] = null;
    used[p.card] = false;
    for (let i = 0; i < owner.length; i++) if (owner[i] === id) owner[i] = -1;
    p.el.classList.add('is-gone');
    later(() => p.el.remove(), 180);
    removed++;
  }

  function tryPlace(r, res) {
    if (res.reason === 'small') {
      dropPreview(false);
      say(t('help'));
      return;
    }
    if (!res.ok) {
      dropPreview(true);
      A.wrong();
      chars.game.react('wrong');
      say(t(res.reason, { n: r.w * r.h }), 'bad');
      return;
    }
    dropPreview(false);
    clearHint();
    addPiece(r, res.card);
    renderCards();
    A.correct();
    chars.game.react('correct');
    say(r.w + ' × ' + r.h + ' = ' + r.w * r.h + '!', 'good');
    speak([r.w, r.h, r.w * r.h], { delay: A.FX_CORRECT_SEC });
    if (!owner.includes(-1)) win();
  }

  /* ---------- 끌기 ---------- */

  board.addEventListener('pointerdown', (e) => {
    if (done || drag) return;
    A.unlock();
    const c = cellAt(e);
    const id = owner[c.y * W + c.x];
    if (id === P.HOLE) return;
    try { board.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    drag = { pid: e.pointerId, start: c, cur: c, piece: id };
    if (id < 0) updatePreview();
  });

  board.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    const c = cellAt(e);
    if (c.x === drag.cur.x && c.y === drag.cur.y) return;
    drag.cur = c;
    if (drag.piece >= 0) {
      /* 채운 땅에서 시작해 끌면 지우지 않습니다(톡 누를 때만 지움). */
      if (owner[c.y * W + c.x] !== drag.piece) drag.piece = -2;
      return;
    }
    if (drag.piece === -1) updatePreview();
  });

  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag;
    drag = null;
    if (cancelled) { dropPreview(false); renderCards(); return; }
    if (d.piece >= 0) {
      removePiece(d.piece);
      renderCards();
      A.keyTap();
      say(t('removedMsg'));
      return;
    }
    if (d.piece === -1) {
      drag = d;
      const cur = updatePreview();
      drag = null;
      renderCards();
      tryPlace(cur.rect, cur.res);
    }
  }

  board.addEventListener('pointerup', (e) => endDrag(e, false));
  board.addEventListener('pointercancel', (e) => endDrag(e, true));

  /* 카드를 누르면 숫자를 읽어 줍니다. */
  $.cards.addEventListener('click', (e) => {
    const b = e.target.closest('.card');
    if (!b) return;
    A.unlock();
    speak([Number(b.dataset.n)]);
  });

  /* ---------- 성공 ---------- */

  function win() {
    done = true;
    clearInterval(clock);
    const timeMs = Date.now() - startedAt;
    const stars = P.starsFor(removed);
    $.winTime.textContent = fmtTime(timeMs);
    $.winRemoved.textContent = t('times', { n: removed });
    $.winStars.innerHTML = '★★★'.slice(0, stars) + '<span class="off">' + '★★★'.slice(stars) + '</span>';
    $.winStars.setAttribute('aria-label', t('stars', { n: stars }));
    ctx.finish({ stars, score: current, detail: { level: current, timeMs, removed } });
    if (current === level) {
      level++;
      saved = null;
      ctx.saveProgress({ level });
    }
    later(() => {
      $.win.hidden = false;
      A.fanfare();
      chars.result.react('clear');
    }, 500);
  }

  /* ---------- 버튼 ---------- */

  function renderSound() {
    const on = A.getSound();
    $.sound.replaceChildren(icon(on ? 'sound' : 'sound-muted'));
    $.sound.setAttribute('aria-pressed', String(on));
  }

  function on(node, fn) { node.addEventListener('click', fn); }

  on($.start, () => {
    A.unlock();
    A.preloadVoices(ctx.lang);
    show('game');
    current = level;
    newPuzzle();
  });

  on($.next, () => {
    $.win.hidden = true;
    chars.result.react('idle');
    A.nextFx();
    current = Math.min(current + 1, level);
    newPuzzle();
  });

  /* 판 고르기: 깬 판(✓)과 지금 열린 판. 고르면 그 판을 새로 시작합니다. */
  on($.level, () => {
    if (done) return;
    $.levelGrid.replaceChildren(...Array.from({ length: level }, (_, i) => {
      const n = i + 1;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'level-pick' + (n === current ? ' is-current' : '') + (n < level ? ' is-cleared' : '');
      b.textContent = n < level ? n + '✓' : n;
      b.addEventListener('click', () => {
        $.levelModal.hidden = true;
        if (n === current) return;
        current = n;
        A.nextFx();
        newPuzzle();
      });
      return b;
    }).reverse());
    $.levelModal.hidden = false;
  });
  on($.levelClose, () => { $.levelModal.hidden = true; });

  on($.hint, useHint);

  on($.clear, () => {
    if (done) return;
    for (let i = 0; i < pieces.length; i++) if (pieces[i]) removePiece(i);
    renderCards();
    say(t('help'));
  });

  on($.sound, () => {
    const next = !A.getSound();
    ctx.setSound(next);
    if (!next) A.cancelSpeech();
    renderSound();
  });
  on($.quit, () => { $.quitModal.hidden = false; });
  on($.keep, () => { $.quitModal.hidden = true; });
  on($.exitQuit, () => ctx.exit());
  on($.exitWin, () => ctx.exit());
  on(el.querySelector('.btn-exit'), () => ctx.exit());

  /* ---------- 시작 ---------- */

  renderSound();
  renderHome();

  return {
    destroy() {
      clearInterval(clock);
      timers.forEach(clearTimeout);
      timers.clear();
      drag = null;
    }
  };
}
