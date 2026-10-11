import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MENU, makeDay, matchesPortion, billFor, readProgress, recordDelivery, dayResult, orderWords } from '../public/games/cafe/rules.js';
import { TOPPINGS, orderText, voiceFor } from '../public/games/cafe/voices.js';

test('all café portions are playable and every equivalent cutting is accepted', () => {
  for (const order of MENU) {
    const n = order.parts.reduce((a, b) => a + b);
    for (const cuts of order.cuts) {
      const target = n * cuts / order.denominator;
      assert.ok(Number.isInteger(target) && target > 0 && target <= cuts, order.id);
      for (let slices = 0; slices <= cuts; slices++) {
        assert.equal(matchesPortion(order, slices, cuts), slices === target, `${order.id}: ${slices}/${cuts}`);
      }
      assert.equal(matchesPortion(order, target + 0.5, cuts), false);
      assert.equal(matchesPortion(order, cuts + 1, cuts), false);
    }
  }
  const half = MENU.find((o) => o.id === 'half-eighths');
  assert.equal(matchesPortion(half, 4, 8), true);
  assert.equal(matchesPortion(half, 1, 2), false, 'unsupported cutter');
});

test('peso bills charge for the portion, and coin denominations can make exact change', () => {
  for (const order of MENU) {
    const { whole, price, paid, change } = billFor(order);
    assert.equal(price / whole, order.parts.reduce((a, b) => a + b) / order.denominator);
    assert.ok(Number.isInteger(change) && change >= 0 && change <= 50);
    assert.equal(price + change, paid);
  }
  assert.deepEqual(billFor(MENU[0]), { whole: 10, price: 5, paid: 20, change: 15 });
  assert.deepEqual(billFor(MENU.find((o) => o.id === 'whole')), { whole: 20, price: 20, paid: 20, change: 0 });
});

test('a day varies orders and spaces a weak concept for another attempt', () => {
  const progress = readProgress({ skills: { quarter: { tries: 4, clean: 1 } } });
  for (let level = 1; level <= 3; level++) {
    const day = makeDay(level, progress, () => 0.45);
    assert.equal(day.length, 6);
    assert.ok(day.every((o) => o.level === level));
    assert.ok(new Set(day.map((o) => o.id)).size >= 4);
    for (let i = 1; i < day.length; i++) assert.notEqual(day[i].id, day[i - 1].id);
  }
  const day = makeDay(1, progress, () => 0.45);
  assert.equal(day[5].id, 'quarter');
  assert.ok(day.slice(0, 3).some((o) => o.id === 'quarter'));
  day[0].parts[0] = 99;
  assert.notEqual(MENU.find((o) => o.id === day[0].id).parts[0], 99, 'menu templates remain intact');
});

test('progress ignores malformed data and locked decorations; delivery tracks assisted practice', () => {
  const progress = readProgress({ served: -2, days: '4', level: 99, best: Infinity, theme: 'ocean', skills: { half: { tries: 3, clean: 90 }, unknown: { tries: 100 } } });
  assert.deepEqual(progress, { version: 1, served: 0, days: 0, best: 0, level: 1, theme: 'garden', skills: { half: { tries: 3, clean: 3 } } });
  recordDelivery(progress, MENU[0], false);
  recordDelivery(progress, MENU[0], true);
  assert.deepEqual(progress.skills.half, { tries: 5, clean: 4 });
  assert.equal(progress.served, 2);
  assert.equal(readProgress({ served: 18, theme: 'ocean' }).theme, 'ocean');
});

test('all six customers can finish even with help; English fractions and sums read naturally', () => {
  assert.deepEqual(dayResult(1, 0), { stars: 1, score: 360 });
  assert.deepEqual(dayResult(3, 6), { stars: 3, score: 840 });
  assert.equal(orderWords(MENU.find((o) => o.id === 'add-quarters')), 'one quarter plus two quarters');
  assert.equal(orderWords(MENU.find((o) => o.id === 'whole')), 'one whole');
});

test('every order and flavor has its own playable recorded English sentence', () => {
  const paths = new Set();
  for (const order of MENU) for (const topping of TOPPINGS) {
    const clip = voiceFor(order, topping);
    assert.ok(!paths.has(clip));
    paths.add(clip);
    const bytes = readFileSync(new URL('../public/' + clip, import.meta.url));
    assert.equal(bytes.toString('ascii', 4, 8), 'ftyp', clip);
    assert.ok(bytes.length > 8000, `${clip}: audio payload required`);
    assert.ok(orderText(order, topping).includes(`${topping} pizza`));
  }
  assert.equal(paths.size, 48);
  assert.equal(orderText(MENU.find((o) => o.id === 'whole'), 'cheese'), "I'd like one whole cheese pizza, please.");
});
