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

test('Mystery Box cosmetics exclude pack-only items', () => {
  const total = BOX_PRIZES.reduce((sum, prize) => sum + prize[2], 0);
  const available = Object.values(COSMETICS).filter((c) => c.price > 0 && !c.pack);
  for (let i = 0; i < available.length; i++) {
    let draw = 0;
    const prize = pickPrize((n) => draw++ === 0 ? total - 1 : i % n, () => false);
    assert.equal(prize.kind, 'cosmetic');
    assert.equal(COSMETICS[prize.id].pack, undefined);
  }
  assert.deepEqual(pickPrize((n) => n - 1, (id) => !COSMETICS[id].pack), { kind: 'sparkles', amount: 30 });
});
