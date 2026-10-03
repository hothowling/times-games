/*
 * master.test.js - 구구단 마스터 규칙 순수 함수 단위 테스트(원본 times-table-game/tests/rules.test.js).
 * 실행: node --test
 */
import test from 'node:test';
import assert from 'node:assert';
import * as rules from '../public/games/master/rules.js';

test('questionCount: 라운드 구간마다 문제 수가 정해진다', () => {
  assert.strictEqual(rules.questionCount(1), 10);
  assert.strictEqual(rules.questionCount(2), 10);
  assert.strictEqual(rules.questionCount(3), 12);
  assert.strictEqual(rules.questionCount(4), 12);
  assert.strictEqual(rules.questionCount(5), 14);
  assert.strictEqual(rules.questionCount(6), 14);
  assert.strictEqual(rules.questionCount(7), 16);
  assert.strictEqual(rules.questionCount(8), 16);
  assert.strictEqual(rules.questionCount(9), 18);
  assert.strictEqual(rules.questionCount(10), 18);
  assert.strictEqual(rules.questionCount(11), 20);
  assert.strictEqual(rules.questionCount(50), 20);
});

test('questionCount: 이상한 값은 1라운드로 취급한다', () => {
  assert.strictEqual(rules.questionCount(0), 10);
  assert.strictEqual(rules.questionCount(-3), 10);
  assert.strictEqual(rules.questionCount(undefined), 10);
});

test('danRange: 라운드가 오를수록 단 범위가 넓어진다', () => {
  assert.deepStrictEqual(rules.danRange(1), [2, 5]);
  assert.deepStrictEqual(rules.danRange(2), [2, 5]);
  assert.deepStrictEqual(rules.danRange(3), [2, 7]);
  assert.deepStrictEqual(rules.danRange(4), [2, 7]);
  assert.deepStrictEqual(rules.danRange(5), [2, 9]);
  assert.deepStrictEqual(rules.danRange(12), [2, 9]);
});

test('timeLimit: 7.0초에서 0.3초씩 줄고 2.5초에서 멈춘다', () => {
  assert.strictEqual(rules.timeLimit(1), 7.0);
  assert.strictEqual(rules.timeLimit(2), 6.7);
  assert.strictEqual(rules.timeLimit(3), 6.4);
  assert.strictEqual(rules.timeLimit(5), 5.8);
  assert.strictEqual(rules.timeLimit(10), 4.3);
  assert.strictEqual(rules.timeLimit(15), 2.8);
  assert.strictEqual(rules.timeLimit(16), 2.5);
  assert.strictEqual(rules.timeLimit(99), 2.5);
});

test('pointsFor: 절반 안 2점, 제한시간 안 1점, 넘으면 0점', () => {
  assert.strictEqual(rules.pointsFor(0, 5), 2);
  assert.strictEqual(rules.pointsFor(2.4, 5), 2);
  assert.strictEqual(rules.pointsFor(2.5, 5), 2);
  assert.strictEqual(rules.pointsFor(2.51, 5), 1);
  assert.strictEqual(rules.pointsFor(4.99, 5), 1);
  assert.strictEqual(rules.pointsFor(5, 5), 1);
  assert.strictEqual(rules.pointsFor(5.01, 5), 0);
  assert.strictEqual(rules.pointsFor(1.2, 2.5), 2);
  assert.strictEqual(rules.pointsFor(2.4, 2.5), 1);
  assert.strictEqual(rules.pointsFor(3, 2.5), 0);
});

test('checkInput: 접두어면 partial, 같으면 correct, 아니면 wrong', () => {
  assert.strictEqual(rules.checkInput('2', 21), 'partial');
  assert.strictEqual(rules.checkInput('21', 21), 'correct');
  assert.strictEqual(rules.checkInput('23', 21), 'wrong');
  assert.strictEqual(rules.checkInput('3', 21), 'wrong');
  assert.strictEqual(rules.checkInput('6', 6), 'correct');
  assert.strictEqual(rules.checkInput('7', 6), 'wrong');
  assert.strictEqual(rules.checkInput('', 6), 'partial');
  assert.strictEqual(rules.checkInput('81', 81), 'correct');
  assert.strictEqual(rules.checkInput('8', 81), 'partial');
  assert.strictEqual(rules.checkInput('811', 81), 'wrong');
  assert.strictEqual(rules.checkInput('0', 9), 'wrong');
});

test('rating: 등급과 보너스', () => {
  assert.deepStrictEqual(rules.rating(20, 10, 0.4), { stars: 3, bonus: 5 });
  assert.deepStrictEqual(rules.rating(17, 10, 0.5), { stars: 3, bonus: 5 });
  assert.deepStrictEqual(rules.rating(17, 10, 0.51), { stars: 2, bonus: 2 });
  assert.deepStrictEqual(rules.rating(12, 10, 0.9), { stars: 2, bonus: 2 });
  assert.deepStrictEqual(rules.rating(11, 10, 0.9), { stars: 1, bonus: 0 });
  assert.deepStrictEqual(rules.rating(6, 10, 0.9), { stars: 1, bonus: 0 });
  assert.deepStrictEqual(rules.rating(5, 10, 0.9), { stars: 0, bonus: 0 });
  assert.deepStrictEqual(rules.rating(0, 10, 1), { stars: 0, bonus: 0 });
  assert.deepStrictEqual(rules.rating(100, 10, 0.1), { stars: 3, bonus: 5 });
  assert.deepStrictEqual(rules.rating(5, 0, 0.1), { stars: 0, bonus: 0 });
});

test('starsFor: 10포인트 = 작은 별, 작은 별 5개 = 큰 별', () => {
  assert.deepStrictEqual(rules.starsFor(0), { big: 0, small: 0 });
  assert.deepStrictEqual(rules.starsFor(9), { big: 0, small: 0 });
  assert.deepStrictEqual(rules.starsFor(10), { big: 0, small: 1 });
  assert.deepStrictEqual(rules.starsFor(49), { big: 0, small: 4 });
  assert.deepStrictEqual(rules.starsFor(50), { big: 1, small: 0 });
  assert.deepStrictEqual(rules.starsFor(73), { big: 1, small: 2 });
  assert.deepStrictEqual(rules.starsFor(120), { big: 2, small: 2 });
  assert.deepStrictEqual(rules.starsFor(-5), { big: 0, small: 0 });
});

test('timerColor: 남은 시간 비율에 따른 색', () => {
  assert.strictEqual(rules.timerColor(1), 'green');
  assert.strictEqual(rules.timerColor(0.51), 'green');
  assert.strictEqual(rules.timerColor(0.5), 'yellow');
  assert.strictEqual(rules.timerColor(0.21), 'yellow');
  assert.strictEqual(rules.timerColor(0.2), 'red');
  assert.strictEqual(rules.timerColor(0), 'red');
});

test('buildRound: 문제 수와 단 범위, 중복 없음', () => {
  for (let round = 1; round <= 12; round++) {
    const list = rules.buildRound(round, {}, Math.random);
    const range = rules.danRange(round);
    assert.strictEqual(list.length, rules.questionCount(round), 'round ' + round);
    const seen = new Set();
    for (const q of list) {
      const key = rules.key(q.a, q.b);
      assert.ok(!seen.has(key), '중복 문제: ' + key);
      seen.add(key);
      assert.ok(q.a >= range[0] && q.a <= range[1], '단 범위 밖: ' + q.a);
      assert.ok(q.b >= 1 && q.b <= 9, '곱하는 수 범위 밖: ' + q.b);
      assert.strictEqual(q.answer, q.a * q.b);
    }
  }
});

test('buildRound: 오답 문제는 가중치 3배로 먼저 뽑힌다', () => {
  /* rng 가 0.06 을 돌려주면 가중치가 없을 때는 세 번째 후보가, 3배일 때는 첫 후보가 뽑힙니다. */
  const rng = () => 0.06;
  const plain = rules.buildRound(1, {}, rng);
  assert.deepStrictEqual({ a: plain[0].a, b: plain[0].b }, { a: 2, b: 3 });

  const weightedObj = rules.buildRound(1, { '2x1': true }, rng);
  assert.deepStrictEqual({ a: weightedObj[0].a, b: weightedObj[0].b }, { a: 2, b: 1 });

  const weightedSet = rules.buildRound(1, new Set(['2x1']), rng);
  assert.deepStrictEqual({ a: weightedSet[0].a, b: weightedSet[0].b }, { a: 2, b: 1 });

  const weightedArray = rules.buildRound(1, ['2x1'], rng);
  assert.deepStrictEqual({ a: weightedArray[0].a, b: weightedArray[0].b }, { a: 2, b: 1 });
});

test('buildRound: 가중치를 준 문제가 통계적으로 더 자주 나온다', () => {
  /* 간단한 결정론적 난수(LCG)로 400라운드를 돌려 출현 횟수를 비교합니다. */
  let seed = 12345;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const missed = { '4x7': true };
  let missedHits = 0;
  let otherHits = 0;
  const rounds = 400;
  for (let i = 0; i < rounds; i++) {
    const list = rules.buildRound(3, missed, rng);
    for (const q of list) {
      if (q.a === 4 && q.b === 7) missedHits++;
      if (q.a === 5 && q.b === 3) otherHits++;
    }
  }
  assert.ok(missedHits > otherHits * 1.5, '가중치 효과 부족: ' + missedHits + ' vs ' + otherHits);
});

test('buildRound: rng 없이도 동작한다', () => {
  const list = rules.buildRound(2);
  assert.strictEqual(list.length, 10);
});

test('readProgress: 진행도 복원과 깨진 값 처리', () => {
  assert.deepStrictEqual(rules.readProgress(null), { round: 1, missed: [] });
  assert.deepStrictEqual(rules.readProgress({ round: 4, missed: ['3x7', 'bad', 5, '9x9'] }), { round: 4, missed: ['3x7', '9x9'] });
  assert.deepStrictEqual(rules.readProgress({ round: -2, missed: 'x' }), { round: 1, missed: [] });
});
