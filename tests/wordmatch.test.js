import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, TOPICS, GRADES, slug } from '../public/games/wordmatch/words.js';
import { VOICES } from '../public/games/wordmatch/voices.js';
import { readdirSync } from 'node:fs';
import {
  makeRound, judge, scoreFor, starsFor, pairsFor, shuffle, nextReview, REVIEW_MAX,
  MODES, MODE_CONFIG, modeConfig, isListenMode, TIME_ATTACK, timeLeft, cardsForMode, listenOrder, nextTarget, judgeTarget,
  scoreForMode, starsForMode, mergeLearned, learnedStats
} from '../public/games/wordmatch/rules.js';

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
    const grade = GRADES[run % GRADES.length];
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

test('grades 3–6: every grade has words, every (grade, topic) fills 12 pairs from that topic', () => {
  assert.deepEqual(GRADES, [3, 4, 5, 6]);
  for (const g of GRADES) assert.ok(WORDS.filter((w) => w.grade === g).length >= 150, `grade ${g}`);
  for (const g of [5, 6]) {
    /* 5·6학년 단어가 있는 주제는 그 학년 단어만으로 한 판(8쌍)을 채우거나, 모자라면 다른 학년으로 채웁니다. */
    const topics = new Set(WORDS.filter((w) => w.grade === g).map((w) => w.topic));
    assert.ok(topics.size >= 14, `grade ${g} topics`);
  }
  for (const g of GRADES) {
    for (const t of ['all', ...Object.keys(TOPICS)]) {
      const { words } = makeRound({ grade: g, topic: t, pairs: 12, rng: seeded(g * 31 + t.length) });
      assert.equal(words.length, 12, `${g} ${t}`);
      assert.equal(new Set(words.map((w) => w.ko)).size, 12, `${g} ${t}`);
      const sameN = WORDS.filter((w) => w.grade === g && (t === 'all' || w.topic === t)).length;
      assert.equal(words.filter((w) => w.grade === g).length, Math.min(12, sameN), `${g} ${t}: same grade first`);
    }
  }
});

test('makeRound: fallback prefers the nearest grade (grade 3 jobs → grade 5 before grade 6)', () => {
  const g5 = WORDS.filter((w) => w.topic === 'jobs' && w.grade === 5).length;
  assert.ok(g5 >= 8 && !WORDS.some((w) => w.topic === 'jobs' && w.grade < 5));
  for (let seed = 1; seed < 20; seed++) {
    const { words } = makeRound({ grade: 3, topic: 'jobs', pairs: 8, rng: seeded(seed) });
    assert.ok(words.every((w) => w.grade === 5), `seed ${seed}`);
    const six = makeRound({ grade: 6, topic: 'family', pairs: 12, rng: seeded(seed) }).words;
    /* 6학년 가족 5개 → 5학년 5개 → 나머지 2개는 4학년 */
    assert.deepEqual(six.map((w) => w.grade).sort(), [4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6], `seed ${seed}`);
  }
});

test('old saves still load: grade 3/4 ids keep working, unknown ids dropped', () => {
  const old = ['dog', 'apple', 'monday', 'gone-word', 'pilot'];
  assert.deepEqual(mergeLearned(old, []), ['dog', 'apple', 'monday', 'pilot']);
  const st = learnedStats(mergeLearned(old, []));
  assert.equal(st.jobs.n, 1);
  assert.equal(st.jobs.total, WORDS.filter((w) => w.topic === 'jobs').length);
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

test('modes: five modes, listen and reverse share one shape with opposite sides', () => {
  assert.deepEqual(MODES, ['basic', 'timeattack', 'memory', 'listen', 'reverse']);
  for (const m of MODES) assert.ok(MODE_CONFIG[m], m);
  assert.equal(modeConfig('nope'), MODE_CONFIG.basic);
  assert.deepEqual([MODE_CONFIG.listen.cardSide, MODE_CONFIG.listen.promptLang], ['ko', 'en']);
  assert.deepEqual([MODE_CONFIG.reverse.cardSide, MODE_CONFIG.reverse.promptLang], ['en', 'ko']);
  assert.deepEqual(MODES.filter(isListenMode), ['listen', 'reverse']);
  assert.ok(MODE_CONFIG.timeattack.timed && MODE_CONFIG.memory.faceDown && MODE_CONFIG.basic.preview);
});

test('timeLeft: 60s, +5 per pair, -3 per wrong, +bonus, floor 0', () => {
  assert.equal(timeLeft({ elapsed: 0 }), 60);
  assert.equal(timeLeft({ elapsed: 10, matched: 2, wrong: 1 }), 60 + 10 - 3 - 10);
  assert.equal(timeLeft({ elapsed: 10, bonus: TIME_ATTACK.item }), 65);
  assert.equal(timeLeft({ elapsed: 100, wrong: 5 }), 0);
  /* 지우개로 틀림을 하나 지우면 3초가 돌아옴 */
  assert.equal(timeLeft({ elapsed: 20, wrong: 1 }) + 3, timeLeft({ elapsed: 20, wrong: 0 }));
});

test('cardsForMode: listen keeps ko cards, reverse keeps en cards, others keep all', () => {
  const { cards, words } = makeRound({ grade: 3, topic: 'food', pairs: 8, rng: seeded(11) });
  assert.equal(cardsForMode('basic', cards).length, 16);
  assert.equal(cardsForMode('memory', cards).length, 16);
  const ko = cardsForMode('listen', cards);
  const en = cardsForMode('reverse', cards);
  assert.equal(ko.length, words.length);
  assert.ok(ko.every((c) => c.side === 'ko'));
  assert.ok(en.every((c) => c.side === 'en'));
  assert.deepEqual(new Set(ko.map((c) => c.wordId)), new Set(words.map((w) => w.id)));
});

test('listen sequencing: every word once, wrong keeps the target, ends with null', () => {
  const { words, cards } = makeRound({ grade: 4, topic: 'animals', pairs: 10, rng: seeded(12) });
  const order = listenOrder(words, seeded(13));
  assert.deepEqual([...order].sort(), words.map((w) => w.id).sort());
  const cleared = [];
  const asked = [];
  let target = nextTarget(order, cleared);
  while (target) {
    asked.push(target);
    const wrongCard = cards.find((c) => c.side === 'ko' && c.wordId !== target && !cleared.includes(c.wordId));
    if (wrongCard) {
      assert.equal(judgeTarget(wrongCard, target), false);
      assert.equal(nextTarget(order, cleared), target, 'same target after a miss');
    }
    const right = cards.find((c) => c.side === 'ko' && c.wordId === target);
    assert.ok(judgeTarget(right, target));
    cleared.push(target);
    target = nextTarget(order, cleared);
  }
  assert.deepEqual(asked, order);
  assert.equal(judgeTarget(null, 'cat'), false);
});

test('scoreForMode: basic = scoreFor; never negative; more mistakes / time never help', () => {
  const st = { pairs: 8, wrong: 1, seconds: 50, maxCombo: 4 };
  assert.equal(scoreForMode('basic', st), scoreFor(st));
  for (const mode of MODES) {
    assert.equal(scoreForMode(mode, { pairs: 1, matched: 0, wrong: 200, seconds: 999, cleared: false }), 0, mode);
    const a = scoreForMode(mode, { pairs: 10, wrong: 3, seconds: 60, maxCombo: 3, remaining: 20 });
    assert.ok(Number.isInteger(a), mode);
    assert.ok(scoreForMode(mode, { pairs: 10, wrong: 30, seconds: 60, maxCombo: 3, remaining: 20 }) <= a, mode);
    assert.ok(scoreForMode(mode, { pairs: 10, wrong: 3, seconds: 600, maxCombo: 3, remaining: 20 }) <= a, mode);
  }
  /* 뒤집기: 쌍 수까지의 엇갈림은 깎지 않음 */
  assert.equal(scoreForMode('memory', { pairs: 8, wrong: 0, seconds: 200 }), scoreForMode('memory', { pairs: 8, wrong: 8, seconds: 200 }));
  assert.ok(scoreForMode('memory', { pairs: 8, wrong: 9, seconds: 200 }) < scoreForMode('memory', { pairs: 8, wrong: 8, seconds: 200 }));
});

test('scoreForMode timeattack: clear bonus and remaining time; beats basic for the same play', () => {
  const play = { pairs: 8, matched: 8, wrong: 1, seconds: 40, maxCombo: 5 };
  const ta = scoreForMode('timeattack', { ...play, cleared: true, remaining: timeLeft({ elapsed: 40, matched: 8, wrong: 1 }) });
  assert.equal(ta, 8 * 150 + 5 * 30 - 30 + 300 + 57 * 10);
  assert.ok(ta > scoreForMode('basic', play));
  const timeout = scoreForMode('timeattack', { ...play, matched: 5, cleared: false, remaining: 0 });
  assert.equal(timeout, 5 * 150 + 5 * 30 - 30);
  assert.ok(timeout < ta);
});

test('starsForMode: timeattack timeout by progress (0 under half), memory tolerant of misses', () => {
  assert.equal(starsForMode('timeattack', { pairs: 8, matched: 3, cleared: false }), 0);
  assert.equal(starsForMode('timeattack', { pairs: 8, matched: 4, cleared: false }), 1);
  assert.equal(starsForMode('timeattack', { pairs: 8, matched: 6, cleared: false }), 2);
  assert.equal(starsForMode('timeattack', { pairs: 8, matched: 8, wrong: 0, cleared: true }), 3);
  assert.equal(starsForMode('timeattack', { pairs: 8, matched: 8, wrong: 5, cleared: true }), 2);
  assert.equal(starsForMode('memory', { pairs: 8, wrong: 8, seconds: 100 }), 3);
  assert.equal(starsForMode('memory', { pairs: 8, wrong: 16, seconds: 100 }), 2);
  assert.equal(starsForMode('memory', { pairs: 8, wrong: 17, seconds: 100 }), 1);
  assert.equal(starsForMode('listen', { pairs: 8, wrong: 0, seconds: 30 }), starsFor({ pairs: 8, wrong: 0, seconds: 30 }));
  for (const mode of MODES) {
    assert.equal(starsForMode(mode, { pairs: 0 }), 0);
    for (let wrong = 0; wrong < 30; wrong++) {
      const s = starsForMode(mode, { pairs: 10, wrong, seconds: 90 });
      assert.ok(s >= 1 && s <= 3, mode);
      assert.ok(starsForMode(mode, { pairs: 10, wrong: wrong + 1, seconds: 90 }) <= s, mode);
    }
  }
});

test('learned words: merge dedupes and drops unknown ids; per-topic counts', () => {
  const m = mergeLearned(['dog', 'cat'], ['cat', 'nope', 'apple']);
  assert.deepEqual(m, ['dog', 'cat', 'apple']);
  const st = learnedStats(m);
  assert.equal(st.animals.n, 2);
  assert.equal(st.food.n, 1);
  assert.equal(st.all.n, 3);
  assert.equal(st.all.total, WORDS.length);
  assert.equal(st.animals.total, WORDS.filter((w) => w.topic === 'animals').length);
  /* 모든 단어를 익혀도 진행도 저장(32KB) 안에 들어감 */
  const all = mergeLearned([], WORDS.map((w) => w.id));
  assert.ok(JSON.stringify({ learned: all, review: all.slice(0, REVIEW_MAX) }).length < 32 * 1024);
});
