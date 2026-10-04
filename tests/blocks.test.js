/*
 * blocks.test.js - 땅따먹기 판 만들기/판정 테스트.
 * 실행: node --test (원본 times-block/tests/puzzle.test.js)
 */
import test from 'node:test';
import assert from 'node:assert';
import * as puzzle from '../public/games/blocks/rules.js';

test('generate: 모든 크기에서 조각이 판을 빈틈없이, 겹치지 않게 덮는다', () => {
  for (let n = 4; n <= 10; n++) {
    for (let t = 0; t < 300; t++) {
      const pieces = puzzle.generate(n, n);
      const owner = new Array(n * n).fill(-1);
      pieces.forEach((p, i) => {
        assert.ok(p.w >= 2 && p.w <= 9 && p.h >= 2 && p.h <= 9, `변 길이 ${p.w}x${p.h}`);
        const r = puzzle.check(p, n, owner, [p.w * p.h], [false]);
        assert.ok(r.ok, `조각 ${i} 겹침`);
        for (let y = p.y; y < p.y + p.h; y++) {
          for (let x = p.x; x < p.x + p.w; x++) owner[y * n + x] = i;
        }
      });
      assert.ok(owner.every((v) => v >= 0), '빈 칸 없음');
    }
  }
});

test('check: 이유별로 거절한다', () => {
  const W = 6;
  const owner = new Array(36).fill(-1);
  owner[0] = 0;
  assert.strictEqual(puzzle.check({ x: 1, y: 1, w: 1, h: 4 }, W, owner, [4], [false]).reason, 'small');
  assert.strictEqual(puzzle.check({ x: 0, y: 0, w: 2, h: 2 }, W, owner, [4], [false]).reason, 'overlap');
  assert.strictEqual(puzzle.check({ x: 1, y: 1, w: 2, h: 2 }, W, owner, [4], [true]).reason, 'nocard');
  assert.deepStrictEqual(puzzle.check({ x: 1, y: 1, w: 2, h: 3 }, W, owner, [6, 6], [true, false]), { ok: true, card: 1 });
  assert.strictEqual(puzzle.check({ x: 0, y: 0, w: 10, h: 2 }, 10, new Array(100).fill(-1), [20], [false]).reason, 'big');
});

test('carve: 라운드가 오르면 구멍이 생기고, 남은 땅은 한 덩어리에 넓이 60% 이상', () => {
  for (const level of [1, 3, 5, 6, 8, 12]) {
    for (let t = 0; t < 200; t++) {
      const n = puzzle.boardSize(level);
      const all = puzzle.generate(n, n);
      const { pieces, holes } = puzzle.carve(all, n, n, level);
      assert.strictEqual(pieces.length + holes.length, all.length);
      assert.ok(holes.length <= puzzle.holeCount(level));
      if (level <= 2) assert.strictEqual(holes.length, 0);
      const area = pieces.reduce((s, p) => s + p.w * p.h, 0);
      assert.ok(area >= n * n * 0.6 && (!holes.length || pieces.length >= 4), `level ${level} area ${area}`);
      assert.ok(holes.every((p) => p.w < n && p.h < n));
      /* 한 덩어리: 첫 칸에서 퍼져서 모든 땅에 닿는다 */
      const land = new Set();
      pieces.forEach((p) => { for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) land.add(y * n + x); });
      const seen = new Set([land.values().next().value]);
      const todo = [...seen];
      while (todo.length) {
        const i = todo.pop();
        for (const j of [i % n ? i - 1 : -1, (i + 1) % n ? i + 1 : -1, i - n, i + n]) if (land.has(j) && !seen.has(j)) { seen.add(j); todo.push(j); }
      }
      assert.strictEqual(seen.size, land.size, `level ${level} 끊긴 땅`);
    }
  }
  /* 3판부터는 대부분 구멍이 생긴다 */
  let holed = 0;
  for (let t = 0; t < 100; t++) if (puzzle.carve(puzzle.generate(8, 8), 8, 8, 5).holes.length) holed++;
  assert.ok(holed >= 90, `holed ${holed}`);
});

test('check: 구멍에 걸치면 outside', () => {
  const owner = new Array(36).fill(-1);
  owner[7] = puzzle.HOLE;
  assert.strictEqual(puzzle.check({ x: 0, y: 0, w: 2, h: 2 }, 6, owner, [4], [false]).reason, 'outside');
});

test('hint: 빈 판·구멍 난 판에서 언제나 첫 조각을 찾고, 막힌 배치는 null', () => {
  let slow = 0;
  for (const level of [1, 6, 10, 12]) {
    for (let t = 0; t < 40; t++) {
      const n = puzzle.boardSize(level);
      const { pieces, holes } = puzzle.carve(puzzle.generate(n, n), n, n, level);
      const owner = new Array(n * n).fill(-1);
      holes.forEach((p) => { for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) owner[y * n + x] = puzzle.HOLE; });
      const cards = puzzle.cardsFor(pieces);
      const used = cards.map(() => false);
      const started = Date.now();
      const r = puzzle.hint(n, n, owner, cards, used);
      if (Date.now() - started > 300) slow++;
      assert.ok(r, `level ${level} 힌트 없음`);
      const res = puzzle.check(r, n, owner, cards, used);
      assert.ok(res.ok && r.x + r.y * n === owner.indexOf(-1), JSON.stringify(r));
    }
  }
  assert.ok(slow <= 2, `slow ${slow}`);
  /* 2x2 카드 하나로 4x2 판: 못 채움 */
  assert.strictEqual(puzzle.hint(4, 2, new Array(8).fill(-1), [4], [false]), null);
  assert.deepStrictEqual(puzzle.hint(4, 2, new Array(8).fill(-1), [4, 4], [false, false]), { x: 0, y: 0, w: 2, h: 2 });
});

test('rectFrom: 어느 방향으로 끌어도 같은 직사각형', () => {
  assert.deepStrictEqual(puzzle.rectFrom({ x: 4, y: 1 }, { x: 2, y: 3 }), { x: 2, y: 1, w: 3, h: 3 });
});

test('boardSize / starsFor', () => {
  assert.deepStrictEqual([1, 3, 5, 7, 10, 99].map(puzzle.boardSize), [6, 7, 8, 9, 10, 10]);
  assert.deepStrictEqual([0, 1, 3, 4].map(puzzle.starsFor), [3, 2, 2, 1]);
});
