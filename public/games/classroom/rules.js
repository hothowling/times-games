/*
 * rules.js - 교실 게임의 순수 로직(DOM 없음). tests/classroom.test.js 에서 검사합니다.
 * 원본: times-class/game.js 의 ROUND_DATA, generateQuestions, makeOptions, showResult, useItem(cookie), practice
 */

export const MAX_HEARTS = 5;

/* 라운드 표: 문제 수, 앞 수(a) 범위, 문제 모양. 6라운드부터는 마지막 줄을 계속 씁니다. */
export const ROUND_DATA = [
  { count: 4, min: 2, max: 2, modes: ['normal'] },
  { count: 5, min: 2, max: 3, modes: ['normal'] },
  { count: 6, min: 2, max: 5, modes: ['normal'] },
  { count: 8, min: 2, max: 9, modes: ['normal'] },
  { count: 10, min: 2, max: 9, modes: ['normal'] },
  { count: 10, min: 2, max: 9, modes: ['normal', 'missingA', 'missingB'] }
];

/* 연습 모드: 쉬운 문제 3개 중 2개를 맞히면 하트 1개 회복 */
export const PRACTICE = { count: 3, min: 2, max: 3, modes: ['normal'] };
export const PRACTICE_PASS = 2;

export function roundConfig(round) {
  const r = Math.max(1, Math.floor(round) || 1);
  const c = ROUND_DATA[Math.min(r, ROUND_DATA.length) - 1];
  return { ...c, modes: [...c.modes] };
}

const randomInt = (min, max, rand) => Math.floor(rand() * (max - min + 1)) + min;

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* 문제의 정답 칸 값: 빈칸 문제면 빠진 인수, 아니면 곱 */
export function correctOption(q) {
  if (q.mode === 'missingA') return q.a;
  if (q.mode === 'missingB') return q.b;
  return q.answer;
}

/* 보기 3개(정답 + 헷갈리는 오답 2개). 곱 문제는 이웃 단의 곱, 빈칸 문제는 ±1~3 */
export function makeOptions(correct, a, b, mode, rand = Math.random) {
  const pool = new Set([correct]);
  const candidates = mode === 'normal'
    ? [a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b, correct - a, correct + b, correct + 2]
    : [correct - 1, correct + 1, correct - 2, correct + 2, Math.max(2, correct + 3)];
  shuffle(candidates, rand).forEach((n) => { if (n > 0 && pool.size < 3) pool.add(n); });
  while (pool.size < 3) pool.add(Math.max(1, correct + randomInt(-5, 5, rand)));
  return shuffle([...pool], rand);
}

/* 한 판의 문제들. 같은 a×b 는 가능한 조합이 남아 있는 동안 다시 내지 않습니다. */
export function generateQuestions(config, rand = Math.random) {
  const questions = [];
  const used = new Set();
  const combos = (config.max - config.min + 1) * 8;
  while (questions.length < config.count) {
    const a = randomInt(config.min, config.max, rand);
    const b = randomInt(2, 9, rand);
    const key = `${a}x${b}`;
    if (used.has(key) && used.size < combos) continue;
    used.add(key);
    const answer = a * b;
    const mode = config.modes[randomInt(0, config.modes.length - 1, rand)];
    const q = { a, b, answer, mode };
    q.options = makeOptions(correctOption(q), a, b, mode, rand);
    questions.push(q);
  }
  return questions;
}

/* 문제 글자를 '?' 앞뒤로 나눠 돌려줍니다(화면에서는 '?' 를 빨간 span 으로 감쌉니다). */
export function questionParts(q) {
  if (q.mode === 'missingA') return ['', ` × ${q.b} = ${q.answer}`];
  if (q.mode === 'missingB') return [`${q.a} × `, ` = ${q.answer}`];
  return [`${q.a} × ${q.b} = `, ''];
}
export const questionText = (q) => questionParts(q).join('?');

/* Cookie 힌트: b 를 (b-2) 와 2 로 나눠 두 곱의 합으로 보여 줍니다. 예) 7×6 → 7×4 + 7×2 */
export function cookieHint(q) {
  const left = Math.max(1, q.b - 2);
  const right = q.b - left;
  return { a: q.a, left, first: q.a * left, right, second: q.a * right };
}

/*
 * 채점. Score Protection 을 썼으면 틀린 문제 1개를 맞은 것으로 칩니다.
 *   A+ 100% · B 70% 이상 · C 40% 이상 · F 그 아래. stars 는 플랫폼 보상(0~3)
 */
export const GRADES = {
  'A+': { letter: 'A+', stars: 3, cls: 'grade-a', key: 'A', mark: '★ ★ ★', expression: 'happy' },
  B: { letter: 'B', stars: 2, cls: 'grade-b', key: 'B', mark: '★ ★ ★', expression: 'happy' },
  C: { letter: 'C', stars: 1, cls: 'grade-c', key: 'C', mark: '★ ★ ☆', expression: 'surprised' },
  F: { letter: 'F', stars: 0, cls: 'grade-f', key: 'F', mark: '★ ☆ ☆', expression: 'sad' }
};

export function grade(rawCorrect, total, protection = false) {
  const correct = protection && rawCorrect < total ? rawCorrect + 1 : rawCorrect;
  const percent = (correct / total) * 100;
  const letter = percent === 100 ? 'A+' : percent >= 70 ? 'B' : percent >= 40 ? 'C' : 'F';
  return { ...GRADES[letter], correct, rawCorrect, total, protected: correct !== rawCorrect };
}

/* 진행도 { round, hearts, best }. 서버에서 받은 값이 이상하면 처음 값으로 고칩니다. */
export function normalizeProgress(p) {
  const round = Number.isInteger(p?.round) && p.round >= 1 ? p.round : 1;
  const hearts = Number.isInteger(p?.hearts) ? Math.min(MAX_HEARTS, Math.max(0, p.hearts)) : MAX_HEARTS;
  const best = p?.best && typeof p.best === 'object' ? { ...p.best } : {};
  return { round, hearts, best };
}

/* 채점 결과를 진행도에 반영: F 면 하트 -1(라운드 그대로), 아니면 다음 라운드. best 는 라운드별 최고 정답 수 */
export function applyGrade(progress, g) {
  const p = normalizeProgress(progress);
  const key = String(p.round);
  p.best[key] = Math.max(p.best[key] || 0, g.correct);
  if (g.letter === 'F') p.hearts = Math.max(0, p.hearts - 1);
  else p.round += 1;
  return p;
}

/* 연습 모드를 마쳤을 때: 통과하면 하트 1개로 다시 시작 */
export function applyPractice(progress, correct) {
  const p = normalizeProgress(progress);
  if (correct >= PRACTICE_PASS) p.hearts = 1;
  return p;
}
