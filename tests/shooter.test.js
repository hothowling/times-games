import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeChoices, roundConfig, makeQuestion, starsFor } from '../public/games/shooter/rules.js';

test('makeChoices: 5 distinct positive choices including the answer', () => {
  for (let run = 0; run < 50; run++) {
    for (let a = 2; a <= 9; a++) {
      for (let b = 1; b <= 9; b++) {
        const c = makeChoices(a, b);
        assert.equal(c.length, 5, `${a}x${b} ${c}`);
        assert.ok(c.includes(a * b), `${a}x${b} no answer ${c}`);
        assert.equal(new Set(c).size, 5, `${a}x${b} duplicate ${c}`);
        assert.ok(c.every((n) => n > 0), `${a}x${b} non-positive ${c}`);
      }
    }
  }
});

test('roundConfig only gets harder', () => {
  for (let r = 1; r < 30; r++) {
    const now = roundConfig(r);
    const next = roundConfig(r + 1);
    assert.ok(next.count >= now.count && next.fallSec <= now.fallSec && next.gapSec <= now.gapSec && next.maxDan >= now.maxDan, `round ${r}`);
  }
  assert.ok(roundConfig(5).count > roundConfig(1).count && roundConfig(5).fallSec < roundConfig(1).fallSec);
});

test('makeQuestion stays in range', () => {
  for (let i = 0; i < 1000; i++) {
    const q = makeQuestion(5);
    assert.ok(q.a >= 2 && q.a <= 5 && q.b >= 1 && q.b <= 9, JSON.stringify(q));
  }
});

test('starsFor: rounds cleared → 0..3 stars', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 20].map(starsFor), [0, 1, 2, 2, 3, 3, 3]);
});
