/*
 * game.js - 구구단 마스터 상태 머신입니다. 원본: times-table-game/js/game.js
 *
 *   HOME -> ROUND_START -> QUESTION -> (정답) FEEDBACK(0.4초) -> 다음 문제
 *                              \-> (시간 초과) REVEAL(1초) -> 다음 문제
 *   정답 숫자 읽어주기가 아직 끝나지 않았으면 다음 문제는 조금(최대 1.2초) 기다렸다가,
 *   읽어주기가 끝난 뒤 0.6초 쉬고 냅니다.
 *   문제가 모두 끝나면 RESULT, 여기서 다음 라운드 또는 로비로 갑니다.
 *
 * 화면 그리기는 전부 index.js 가 맡고, 여기서는 on 핸들러로 알려 주기만 합니다.
 *   const game = createGame(on, { isSpeaking })
 *   game.start(round, missedKeys)  저장된 진행도에서 시작
 */
import * as rules from './rules.js';

const FEEDBACK_MS = 400;
const REVEAL_MS = 1000;
const BACKGROUND_GAP_MS = 700;
const VOICE_WAIT_MAX_MS = 1200;
const VOICE_POLL_MS = 50;
/* 정답 읽어주기가 끝난 뒤 다음 문제 읽어주기까지 두는 쉼. 두 소리가 이어 들리지 않게 합니다. */
const VOICE_GAP_MS = 600;
/* 다음 문제로 넘어가는 효과(소리 + 카드 넘김)의 길이. 쉬는 시간의 끝부분에서 재생합니다. */
const TRANSITION_MS = 320;

export function createGame(on, { isSpeaking }) {
  let state = 'home';
  let sess = null;
  let prevMissed = {};
  let curMissed = {};
  let buffer = '';
  /* 이번에 게임을 연 뒤 모은 포인트(원본의 '오늘 포인트' 자리. 날짜별 기록은 플랫폼이 맡습니다) */
  let sessionPoints = 0;

  let rafId = null;
  let stepTimer = null;
  let stepToken = 0;
  let qStart = 0;
  let lastTick = 0;
  let paused = false;
  let pausedAt = 0;

  const now = () => performance.now();

  function emit(name, arg) {
    try {
      on[name]?.(arg);
    } catch (e) {
      console.log('[master] listener 오류 ' + name, e);
    }
  }

  /* ---------- 타이머 ---------- */

  function stopTimer() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function startTimer() {
    stopTimer();
    qStart = now();
    lastTick = qStart;
    paused = false;
    rafId = requestAnimationFrame(tick);
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (state !== 'question' || !sess) return;
    const t = now();
    if (paused) {
      lastTick = t;
      return;
    }
    /* 탭이 백그라운드였다가 돌아온 경우: 그 사이 시간은 없던 것으로 하고 이어갑니다. */
    const gap = t - lastTick;
    if (gap > BACKGROUND_GAP_MS) qStart += gap;
    lastTick = t;
    const elapsed = (t - qStart) / 1000;
    const remain = Math.max(0, sess.limit - elapsed);
    emit('onTimer', { remain, ratio: sess.limit > 0 ? remain / sess.limit : 0 });
    if (elapsed >= sess.limit) timeUp();
  }

  function clearStep() {
    stepToken++;
    if (stepTimer !== null) {
      clearTimeout(stepTimer);
      stepTimer = null;
    }
  }

  /* 다음 단계를 한 번만 예약합니다(두 번 넘어가는 사고 방지). */
  function scheduleStep(ms, fn) {
    clearStep();
    const myToken = stepToken;
    stepTimer = setTimeout(() => {
      if (myToken !== stepToken) return;
      stepTimer = null;
      fn();
    }, ms);
  }

  /* ---------- 라운드 진행 ---------- */

  function beginRound(round) {
    clearStep();
    stopTimer();
    curMissed = {};
    const limit = rules.timeLimit(round);
    sess = {
      round,
      limit,
      questions: rules.buildRound(round, prevMissed, Math.random),
      index: 0,
      points: 0,
      correct: 0,
      ratios: [],
      timeSum: 0
    };
    buffer = '';
    state = 'roundStart';
    emit('onScreen', 'game');
    emit('onRoundStart', { round, count: sess.questions.length, limit, sessionPoints });
    nextQuestion();
  }

  const currentQuestion = () => (sess && sess.index < sess.questions.length ? sess.questions[sess.index] : null);

  function nextQuestion() {
    if (!sess) return;
    if (sess.index >= sess.questions.length) {
      finishRound();
      return;
    }
    clearStep();
    buffer = '';
    state = 'question';
    const q = currentQuestion();
    emit('onQuestion', {
      a: q.a,
      b: q.b,
      answer: q.answer,
      index: sess.index,
      number: sess.index + 1,
      count: sess.questions.length,
      round: sess.round,
      limit: sess.limit
    });
    emit('onInput', '');
    emit('onTimer', { remain: sess.limit, ratio: 1 });
    startTimer();
  }

  function advance() {
    if (!sess) return;
    sess.index++;
    nextQuestion();
  }

  /*
   * 정답 읽어주기가 끝난 뒤 다음 문제로 넘어갑니다.
   * 다음 문제의 읽어주기가 앞 소리를 끊지 않게 하려는 것이고, 오래 기다리지는 않습니다.
   */
  function advanceWhenQuiet() {
    let waited = 0;
    let spoke = false;
    function check() {
      const busy = isSpeaking();
      if (busy) spoke = true;
      if (busy && waited < VOICE_WAIT_MAX_MS) {
        waited += VOICE_POLL_MS;
        scheduleStep(VOICE_POLL_MS, check);
        return;
      }
      /* 읽어주기가 있었다면 잠깐 쉬고, 쉬는 시간의 끝부분에서 넘김 효과를 냅니다. */
      if (spoke) {
        scheduleStep(Math.max(0, VOICE_GAP_MS - TRANSITION_MS), transitionThenAdvance);
        return;
      }
      transitionThenAdvance();
    }
    check();
  }

  /* 넘김 효과를 알린 뒤 효과 길이만큼 기다렸다가 다음 문제를 냅니다. 마지막 문제 뒤에는 효과 없이 결과로 갑니다. */
  function transitionThenAdvance() {
    if (!sess) return;
    if (sess.index + 1 >= sess.questions.length) {
      advance();
      return;
    }
    emit('onTransition');
    scheduleStep(TRANSITION_MS, advance);
  }

  function succeed(shownText) {
    if (state !== 'question' || !sess) return;
    const q = currentQuestion();
    const elapsed = Math.min(sess.limit, Math.max(0, (now() - qStart) / 1000));
    stopTimer();
    state = 'feedback';
    /* 타이머 오차로 0점이 되는 일은 없게, 맞힌 문제는 최소 1점을 줍니다. */
    const pts = Math.max(1, rules.pointsFor(elapsed, sess.limit));
    sess.points += pts;
    sess.correct++;
    sess.ratios.push(sess.limit > 0 ? elapsed / sess.limit : 1);
    sess.timeSum += elapsed;
    sessionPoints += pts;
    emit('onCorrect', {
      points: pts,
      elapsed,
      answer: q.answer,
      shown: shownText === undefined ? String(q.answer) : shownText,
      sessionPoints
    });
    emit('onTimer', { remain: 0, ratio: 0 });
    scheduleStep(FEEDBACK_MS, advanceWhenQuiet);
  }

  function timeUp() {
    if (state !== 'question' || !sess) return;
    const q = currentQuestion();
    stopTimer();
    state = 'reveal';
    sess.ratios.push(1);
    sess.timeSum += sess.limit;
    curMissed[rules.key(q.a, q.b)] = true;
    emit('onTimeout', { answer: q.answer, a: q.a, b: q.b, sessionPoints });
    scheduleStep(REVEAL_MS, advanceWhenQuiet);
  }

  const average = (list) => (list.length ? list.reduce((s, x) => s + x, 0) / list.length : 1);

  function finishRound() {
    clearStep();
    stopTimer();
    if (!sess) return;
    state = 'result';
    const count = sess.questions.length;
    const avg = average(sess.ratios);
    const r = rules.rating(sess.points, count, avg);
    sessionPoints += r.bonus;
    prevMissed = curMissed;
    curMissed = {};
    emit('onScreen', 'result');
    emit('onResult', {
      round: sess.round,
      count,
      correct: sess.correct,
      points: sess.points,
      bonus: r.bonus,
      total: sess.points + r.bonus,
      stars: r.stars,
      avgRatio: avg,
      seconds: Math.round(sess.timeSum * 10) / 10,
      avgMs: Math.round((sess.timeSum / count) * 1000),
      /* 다음 라운드에 3배로 나올 복습 문제(진행도에 저장) */
      missed: Object.keys(prevMissed),
      sessionPoints
    });
  }

  /* ---------- 외부에서 부르는 조작들 ---------- */

  /* 저장된 진행도에서 시작합니다. missed 는 지난 라운드의 복습 문제 키 목록입니다. */
  function start(round, missed) {
    prevMissed = Object.fromEntries((missed || []).map((k) => [k, true]));
    curMissed = {};
    beginRound(round);
  }

  function nextRound() {
    beginRound(sess ? sess.round + 1 : 1);
  }

  function pressDigit(digit) {
    if (state !== 'question' || !sess) return;
    const q = currentQuestion();
    buffer += String(digit);
    const verdict = rules.checkInput(buffer, q.answer);
    if (verdict === 'correct') {
      succeed(buffer);
      return;
    }
    if (verdict === 'partial') {
      emit('onInput', buffer);
      return;
    }
    buffer = '';
    emit('onWrong', { source: 'keypad' });
    emit('onInput', '');
  }

  function pause() {
    if (paused) return;
    paused = true;
    pausedAt = now();
  }

  function resume() {
    if (!paused) return;
    paused = false;
    const delta = now() - pausedAt;
    if (delta > 0) qStart += delta;
    lastTick = now();
  }

  /* 로비로 나갈 때: 예약된 단계와 rAF 를 모두 멈춥니다. */
  function destroy() {
    clearStep();
    stopTimer();
    state = 'home';
    sess = null;
  }

  return {
    start,
    nextRound,
    pressDigit,
    pause,
    resume,
    destroy,
    state: () => state
  };
}
