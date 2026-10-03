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

test('rectFrom: 어느 방향으로 끌어도 같은 직사각형', () => {
  assert.deepStrictEqual(puzzle.rectFrom({ x: 4, y: 1 }, { x: 2, y: 3 }), { x: 2, y: 1, w: 3, h: 3 });
});

test('boardSize / starsFor', () => {
  assert.deepStrictEqual([1, 3, 5, 7, 10, 99].map(puzzle.boardSize), [6, 7, 8, 9, 10, 10]);
  assert.deepStrictEqual([0, 1, 3, 4].map(puzzle.starsFor), [3, 2, 2, 1]);
});
