import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROUND_DATA, roundConfig, generateQuestions, makeOptions, correctOption, questionText,
  cookieHint, grade, normalizeProgress, applyGrade, applyPractice
} from '../public/games/classroom/rules.js';

/* 재현 가능한 난수(mulberry32) */
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('round table: 6라운드부터는 마지막 줄(빈칸 문제 포함)', () => {
  assert.equal(roundConfig(1).count, 4);
  assert.deepEqual(roundConfig(6), ROUND_DATA[5]);
  assert.deepEqual(roundConfig(42), ROUND_DATA[5]);
  assert.deepEqual(roundConfig(0), ROUND_DATA[0]);
});

test('questions: 개수·범위·보기 3개(서로 다름, 양수, 정답 포함)', () => {
  for (let seed = 1; seed < 40; seed++) {
    const rand = seeded(seed);
    for (let round = 1; round <= 7; round++) {
      const c = roundConfig(round);
      const qs = generateQuestions(c, rand);
      assert.equal(qs.length, c.count);
      for (const q of qs) {
        assert.ok(q.a >= c.min && q.a <= c.max && q.b >= 2 && q.b <= 9);
        assert.equal(q.answer, q.a * q.b);
        assert.ok(c.modes.includes(q.mode));
        assert.equal(q.options.length, 3);
        assert.equal(new Set(q.options).size, 3);
        assert.ok(q.options.every((n) => Number.isInteger(n) && n > 0));
        assert.ok(q.options.includes(correctOption(q)));
      }
    }
  }
});

test('questions: 조합이 남아 있으면 같은 a×b 를 다시 내지 않음', () => {
  const qs = generateQuestions(roundConfig(5), seeded(7));
  assert.equal(new Set(qs.map((q) => `${q.a}x${q.b}`)).size, qs.length);
});

test('distractors: 곱 문제는 이웃 단의 곱에서 고름', () => {
  const opts = makeOptions(42, 7, 6, 'normal', seeded(3));
  const near = [35, 49, 36, 48, 35, 48, 44];
  assert.ok(opts.filter((n) => n !== 42).every((n) => near.includes(n)));
});

test('question text / correct option', () => {
  assert.equal(questionText({ a: 3, b: 4, answer: 12, mode: 'normal' }), '3 × 4 = ?');
  assert.equal(questionText({ a: 3, b: 4, answer: 12, mode: 'missingA' }), '? × 4 = 12');
  assert.equal(questionText({ a: 3, b: 4, answer: 12, mode: 'missingB' }), '3 × ? = 12');
  assert.equal(correctOption({ a: 3, b: 4, answer: 12, mode: 'missingB' }), 4);
});

test('cookie hint: a×b = a×(b-2) + a×2', () => {
  assert.deepEqual(cookieHint({ a: 7, b: 6 }), { a: 7, left: 4, first: 28, right: 2, second: 14 });
  const h = cookieHint({ a: 5, b: 2 });
  assert.equal(h.first + h.second, 10);
});

test('grading thresholds and stars', () => {
  assert.equal(grade(4, 4).letter, 'A+');
  assert.equal(grade(4, 4).stars, 3);
  assert.equal(grade(7, 10).letter, 'B');
  assert.equal(grade(6, 10).letter, 'C');
  assert.equal(grade(4, 10).letter, 'C');
  assert.equal(grade(3, 10).letter, 'F');
  assert.equal(grade(3, 10).stars, 0);
  /* 점수 보호: 틀린 문제 1개를 맞은 것으로 */
  const g = grade(3, 4, true);
  assert.equal(g.letter, 'A+');
  assert.equal(g.correct, 4);
  assert.equal(g.rawCorrect, 3);
  assert.ok(g.protected);
  assert.equal(grade(4, 4, true).protected, false);
});

test('progress: F 는 하트 -1, 통과는 다음 라운드, 연습 통과는 하트 1개', () => {
  let p = normalizeProgress(null);
  assert.deepEqual(p, { round: 1, hearts: 5, best: {} });
  p = applyGrade(p, grade(4, 4));
  assert.deepEqual(p, { round: 2, hearts: 5, best: { 1: 4 } });
  p = applyGrade(p, grade(0, 5));
  assert.deepEqual(p, { round: 2, hearts: 4, best: { 1: 4, 2: 0 } });
  p = applyGrade({ round: 2, hearts: 0, best: {} }, grade(0, 5));
  assert.equal(p.hearts, 0);
  assert.equal(applyPractice({ round: 3, hearts: 0 }, 2).hearts, 1);
  assert.equal(applyPractice({ round: 3, hearts: 0 }, 1).hearts, 0);
  assert.deepEqual(normalizeProgress({ round: -1, hearts: 99 }), { round: 1, hearts: 5, best: {} });
});
