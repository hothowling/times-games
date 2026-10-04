import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickPrize, BOX_PRIZES, COSMETICS, ITEMS } from '../public/core/catalog.js';

test('pickPrize: every slot reachable, cosmetics only when not owned', () => {
  const total = BOX_PRIZES.reduce((s, p) => s + p[2], 0);
  const seen = new Set();
  for (let r = 0; r < total; r++) {
    const p = pickPrize((n) => (n === total ? r : 0), () => false);
    seen.add(p.kind + ':' + (p.amount ?? p.id));
    if (p.kind === 'item') assert.ok(ITEMS[p.id]);
    if (p.kind === 'cosmetic') assert.ok(COSMETICS[p.id].price > 0);
  }
  assert.equal(seen.size, BOX_PRIZES.length);
  /* 꾸미기를 다 가졌으면 Sparkles 30 */
  const last = (n) => n - 1;
  assert.deepEqual(pickPrize(last, () => true), { kind: 'sparkles', amount: 30 });
  assert.equal(pickPrize(last, () => false).kind, 'cosmetic');
});
