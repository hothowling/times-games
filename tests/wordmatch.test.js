import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, TOPICS, GRADES, slug } from '../public/games/wordmatch/words.js';
import { VOICES } from '../public/games/wordmatch/voices.js';
import { readdirSync } from 'node:fs';
import { makeRound, judge, scoreFor, starsFor, pairsFor, shuffle, nextReview, REVIEW_MAX } from '../public/games/wordmatch/rules.js';

/* 재현 가능한 난수 */
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('word data: unique ids, en and ko; valid grade and topic; every topic can fill 12 pairs', () => {
  assert.ok(WORDS.length >= 300);
  assert.equal(new Set(WORDS.map((w) => w.id)).size, WORDS.length);
  assert.equal(new Set(WORDS.map((w) => w.ko)).size, WORDS.length, 'no two words share a meaning');
  assert.equal(new Set(WORDS.map((w) => w.en.toLowerCase())).size, WORDS.length);
  for (const w of WORDS) {
    assert.equal(w.id, slug(w.en), w.en);
    assert.ok(/^[a-z0-9-]+$/.test(w.id) && w.en && w.ko && GRADES.includes(w.grade) && TOPICS[w.topic], w.en);
  }
  for (const t of Object.keys(TOPICS)) assert.ok(WORDS.filter((w) => w.topic === t).length >= 12, t);
});

test('pairsFor: 8 / 10 / 12, clamped', () => {
  assert.deepEqual([1, 2, 3].map(pairsFor), [8, 10, 12]);
  assert.equal(pairsFor(0), 8);
  assert.equal(pairsFor(9), 12);
});

test('makeRound: 2 × pairs cards, each word once in en and ko, no duplicate meaning', () => {
  const rng = seeded(7);
  for (let run = 0; run < 300; run++) {
    const grade = GRADES[run % 2];
    const topics = ['all', ...Object.keys(TOPICS)];
    const topic = topics[run % topics.length];
    const pairs = pairsFor(1 + (run % 3));
    const { words, cards } = makeRound({ grade, topic, pairs, rng });
    assert.equal(words.length, pairs, `${grade} ${topic}`);
    assert.equal(cards.length, pairs * 2);
    assert.equal(new Set(cards.map((c) => c.uid)).size, cards.length);
    assert.equal(new Set(words.map((w) => w.ko)).size, words.length);
    for (const w of words) {
      if (topic !== 'all') assert.equal(w.topic, topic);
      const mine = cards.filter((c) => c.wordId === w.id);
      assert.deepEqual(mine.map((c) => c.side).sort(), ['en', 'ko']);
      assert.equal(mine.find((c) => c.side === 'en').text, w.en);
      assert.equal(mine.find((c) => c.side === 'ko').text, w.ko);
    }
  }
});

test('makeRound: same grade first, other grades only to fill', () => {
  const { words } = makeRound({ grade: 3, topic: 'animals', pairs: 12, rng: seeded(1) });
  assert.ok(words.every((w) => w.grade === 3));
  const colors = makeRound({ grade: 4, topic: 'colors', pairs: 12, rng: seeded(2) }).words;
  assert.equal(colors.length, 12);
  assert.equal(colors.filter((w) => w.grade === 4).length, WORDS.filter((w) => w.topic === 'colors' && w.grade === 4).length);
});

test('makeRound: review words come first (up to half the pairs), unknown ids ignored', () => {
  const review = ['tiger', 'nope', 'owl', 'apple', 'rabbit'];
  const { words } = makeRound({ grade: 3, topic: 'animals', pairs: 8, reviewIds: review, rng: seeded(3) });
  /* apple 은 동물이 아니라 빠지고, owl 은 4학년이어도 복습이라 들어옵니다. */
  assert.deepEqual(words.slice(0, 3).map((w) => w.id), ['tiger', 'owl', 'rabbit']);
  const many = WORDS.filter((w) => w.topic === 'food').map((w) => w.id);
  const r = makeRound({ grade: 3, topic: 'food', pairs: 8, reviewIds: many, rng: seeded(4) });
  assert.deepEqual(r.words.slice(0, 4).map((w) => w.id), many.slice(0, 4));
});

test('makeRound: small custom pool shrinks the round instead of duplicating', () => {
  const words = [
    { id: 'a', en: 'a', ko: '가', grade: 3, topic: 'x' },
    { id: 'b', en: 'b', ko: '가', grade: 3, topic: 'x' },
    { id: 'c', en: 'c', ko: '다', grade: 4, topic: 'x' }
  ];
  const r = makeRound({ grade: 3, topic: 'x', pairs: 8, words, rng: seeded(5) });
  assert.equal(r.words.length, 2);
  assert.equal(r.cards.length, 4);
});

test('judge: only the en and ko card of the same word match', () => {
  const en = { uid: 'cat:en', wordId: 'cat', side: 'en', text: 'cat' };
  const ko = { uid: 'cat:ko', wordId: 'cat', side: 'ko', text: '고양이' };
  const dogKo = { uid: 'dog:ko', wordId: 'dog', side: 'ko', text: '개' };
  assert.deepEqual(judge(en, ko), { ok: true, wordId: 'cat' });
  assert.deepEqual(judge(ko, en), { ok: true, wordId: 'cat' });
  assert.equal(judge(en, dogKo).ok, false);
  assert.equal(judge(en, en).ok, false);
  assert.equal(judge(en, null).ok, false);
});

test('stars: 1..3 for a cleared round, never rise with more mistakes or more time', () => {
  for (const pairs of [8, 10, 12]) {
    assert.equal(starsFor({ pairs, wrong: 0, seconds: 30 }), 3);
    assert.equal(starsFor({ pairs, wrong: 50, seconds: 999 }), 1);
    for (let wrong = 0; wrong < 20; wrong++) {
      for (let s = 0; s < 300; s += 10) {
        const st = starsFor({ pairs, wrong, seconds: s });
        assert.ok(st >= 1 && st <= 3);
        assert.ok(starsFor({ pairs, wrong: wrong + 1, seconds: s }) <= st);
        assert.ok(starsFor({ pairs, wrong, seconds: s + 10 }) <= st);
      }
    }
  }
  assert.equal(starsFor({ pairs: 0 }), 0);
});

test('score: rewards pairs, combo and speed, punishes mistakes, never negative', () => {
  const base = scoreFor({ pairs: 8, wrong: 0, seconds: 64, maxCombo: 0 });
  assert.equal(base, 800);
  assert.ok(scoreFor({ pairs: 8, wrong: 0, seconds: 30, maxCombo: 0 }) > base);
  assert.ok(scoreFor({ pairs: 8, wrong: 0, seconds: 64, maxCombo: 8 }) > base);
  assert.ok(scoreFor({ pairs: 8, wrong: 3, seconds: 64, maxCombo: 0 }) < base);
  assert.equal(scoreFor({ pairs: 1, wrong: 100, seconds: 500 }), 0);
});

test('shuffle keeps the items; nextReview puts misses first, drops cleared, caps length', () => {
  const a = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(shuffle([...a], seeded(9)).sort(), a);
  assert.deepEqual(nextReview(['x', 'y', 'z'], { wrongIds: ['q', 'y'], clearedIds: ['x', 'y'] }), ['q', 'y', 'z']);
  const long = Array.from({ length: 150 }, (_, i) => 'w' + i);
  assert.equal(nextReview(long, { wrongIds: ['new'] }).length, REVIEW_MAX);
  assert.equal(nextReview(long, { wrongIds: ['new'] })[0], 'new');
});

test('voices.js: listed ids are real words and match the m4a files on disk', () => {
  const ids = new Set(WORDS.map((w) => w.id));
  for (const l of ['en', 'ko']) {
    assert.ok(Array.isArray(VOICES[l]), l);
    assert.equal(new Set(VOICES[l]).size, VOICES[l].length, `${l}: no duplicates`);
    for (const id of VOICES[l]) assert.ok(ids.has(id), `${l}:${id}`);
    let files = [];
    try { files = readdirSync(new URL(`../public/assets/voice/words/${l}/`, import.meta.url)); } catch { /* 폴더 없음 */ }
    const onDisk = files.filter((f) => f.endsWith('.m4a')).map((f) => f.slice(0, -4)).filter((id) => ids.has(id)).sort();
    assert.deepEqual([...VOICES[l]].sort(), onDisk, `${l}: voices.js matches files`);
  }
});
