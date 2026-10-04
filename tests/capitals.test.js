import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { COUNTRIES, makeRound, pointsFor, starsFor, QUESTIONS, CHOICES } from '../public/games/capitals/rules.js';
import { CREDITS } from '../public/games/capitals/credits.js';

test('country data: unique codes and capitals, every level has enough countries', () => {
  assert.equal(new Set(COUNTRIES.map((c) => c.code)).size, COUNTRIES.length);
  assert.equal(new Set(COUNTRIES.map((c) => c.capital.en)).size, COUNTRIES.length);
  assert.equal(new Set(COUNTRIES.map((c) => c.capital.ko)).size, COUNTRIES.length);
  for (const c of COUNTRIES) assert.ok(/^[A-Z]{2}$/.test(c.code) && c.name.ko && c.name.en && c.capital.ko && c.capital.en && [1, 2, 3].includes(c.level), c.code);
  for (const l of [1, 2, 3]) assert.ok(COUNTRIES.filter((c) => c.level <= l).length >= QUESTIONS);
});

test('makeRound: 10 distinct questions within the level, 4 distinct choices with the answer', () => {
  for (let run = 0; run < 200; run++) {
    const level = 1 + (run % 3);
    const round = makeRound(level);
    assert.equal(round.length, QUESTIONS);
    assert.equal(new Set(round.map((q) => q.answer)).size, QUESTIONS);
    for (const q of round) {
      assert.ok(q.answer.level <= level);
      assert.equal(q.choices.length, CHOICES);
      assert.equal(new Set(q.choices).size, CHOICES);
      assert.ok(q.choices.includes(q.answer) && q.choices.every((c) => c.level <= level));
    }
  }
});

test('points and stars', () => {
  assert.equal(pointsFor(1, 10), 20);
  assert.equal(pointsFor(3, 0.2), 31);
  assert.equal(pointsFor(2, -1), 20);
  assert.deepEqual([0, 4, 5, 7, 8, 9, 10].map(starsFor), [0, 0, 1, 1, 2, 2, 3]);
});

test('every country has a flag, a city photo and a photo credit', () => {
  const dir = new URL('../public/assets/games/capitals/', import.meta.url);
  for (const c of COUNTRIES) {
    const code = c.code.toLowerCase();
    assert.ok(existsSync(new URL(`flags/${code}.svg`, dir)), `flag ${code}`);
    assert.ok(existsSync(new URL(`cities/${code}.webp`, dir)), `photo ${code}`);
    const [artist, license, url] = CREDITS[c.code] || [];
    assert.ok(artist && license && url?.startsWith('https://commons.wikimedia.org/'), `credit ${c.code}`);
  }
});
