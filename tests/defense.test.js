import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waveConfig, pickType, stats, upgradeChoices, makeQuiz, starsFor, UPGRADES } from '../public/games/defense/rules.js';

test('waves only get harder; fast from wave 2, tank from wave 3', () => {
  for (let w = 1; w < 30; w++) {
    const a = waveConfig(w);
    const b = waveConfig(w + 1);
    assert.ok(b.spawnGap <= a.spawnGap && b.hpMul > a.hpMul && b.speedMul >= a.speedMul, `wave ${w}`);
  }
  const seen = (w) => new Set(Array.from({ length: 2000 }, () => pickType(w)));
  assert.deepEqual([...seen(1)], ['normal']);
  assert.ok(seen(2).has('fast') && !seen(2).has('tank'));
  assert.ok(seen(3).has('tank'));
});

test('upgrades: stats improve, choices are distinct and stop at max', () => {
  const base = stats({});
  const up = stats({ power: 1, rapid: 1, multi: 1, pierce: 1, blast: 1 });
  assert.ok(up.damage > base.damage && up.interval < base.interval && up.shots === 2 && up.pierce === 1 && up.blast > 0);
  for (let i = 0; i < 100; i++) {
    const c = upgradeChoices({});
    assert.equal(c.length, 3);
    assert.equal(new Set(c).size, 3);
  }
  const maxed = Object.fromEntries(Object.entries(UPGRADES).map(([id, u]) => [id, u.max]));
  assert.deepEqual(upgradeChoices(maxed), []);
  assert.deepEqual(upgradeChoices({ ...maxed, power: 0 }), ['power']);
});

test('quiz: 4 distinct positive choices with the answer', () => {
  for (let i = 0; i < 2000; i++) {
    const q = makeQuiz();
    assert.equal(q.answer, q.a * q.b);
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(q.choices.includes(q.answer) && q.choices.every((n) => n > 0));
  }
});

test('stars by wave', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 7, 8, 20].map(starsFor), [0, 0, 1, 1, 2, 2, 3, 3]);
});
