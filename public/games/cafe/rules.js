/* Pet Pizza Café: fractions and money, independent of the DOM. */
export const CUSTOMERS_PER_DAY = 6;
export const COINS = [1, 5, 10, 20];
export const THEMES = [
  { id: 'garden', at: 0 }, { id: 'sunset', at: 6 }, { id: 'ocean', at: 18 }
];

const menu = (id, level, denominator, parts, cuts) => ({ id, level, denominator, parts, cuts });
export const MENU = [
  menu('half', 1, 2, [1], [2, 4]),
  menu('quarter', 1, 4, [1], [4]),
  menu('three-quarters', 1, 4, [3], [4]),
  menu('whole', 1, 4, [4], [4]),
  menu('third', 2, 3, [1], [3, 6]),
  menu('two-thirds', 2, 3, [2], [3, 6]),
  menu('sixth', 2, 6, [1], [6]),
  menu('three-eighths', 2, 8, [3], [8]),
  menu('half-eighths', 2, 4, [2], [4, 8]),
  menu('quarter-eighths', 2, 4, [1], [4, 8]),
  menu('add-quarters', 3, 4, [1, 2], [4, 8]),
  menu('add-thirds', 3, 3, [1, 1], [3, 6]),
  menu('add-sixths', 3, 6, [1, 2], [6]),
  menu('add-eighths', 3, 8, [2, 3], [8]),
  menu('add-half', 3, 8, [1, 3], [4, 8]),
  menu('add-whole', 3, 4, [2, 2], [4, 8])
];
const bounded = (value, max = 1_000_000) => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : 0;
export const safeLevel = (value) => [1, 2, 3].includes(value) ? value : 1;

export function readProgress(raw) {
  const served = bounded(raw?.served);
  const skills = {};
  for (const { id } of MENU) {
    const tries = bounded(raw?.skills?.[id]?.tries);
    const clean = Math.min(tries, bounded(raw?.skills?.[id]?.clean));
    if (tries) skills[id] = { tries, clean };
  }
  return {
    version: 1, served, days: bounded(raw?.days), best: bounded(raw?.best, 840),
    level: safeLevel(raw?.level), skills,
    theme: THEMES.some((t) => t.id === raw?.theme && served >= t.at) ? raw.theme : 'garden'
  };
}

export const numerator = (order) => order.parts.reduce((sum, n) => sum + n, 0);

// Any equal portion is accepted: two quarters and four eighths are both one half.
export function matchesPortion(order, selected, cuts) {
  return order.cuts.includes(cuts) && Number.isInteger(selected) && selected > 0 && selected <= cuts
    && selected * order.denominator === numerator(order) * cuts;
}

export function billFor(order) {
  const whole = order.denominator * 5;
  const price = numerator(order) * 5;
  const paid = price <= 20 ? 20 : 50;
  return { whole, price, paid, change: paid - price };
}

export function fractionWords(n, d, lang = 'en') {
  if (lang === 'ko') return n === d ? '한 판' : `${d}분의 ${n}`;
  if (n === d) return 'one whole';
  const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  const names = { 2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['quarter', 'quarters'], 6: ['sixth', 'sixths'], 8: ['eighth', 'eighths'] };
  return `${numbers[n]} ${names[d][n === 1 ? 0 : 1]}`;
}

export function orderWords(order, lang = 'en') {
  return order.parts.map((n) => fractionWords(n, order.denominator, lang)).join(lang === 'ko' ? ' + ' : ' plus ');
}

function shuffle(items, rng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(rng() * (i + 1))));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// A short, varied day. Revisit a previously tricky portion after other orders.
export function makeDay(level, progress, rng = Math.random) {
  const pool = MENU.filter((o) => o.level === safeLevel(level));
  const deck = shuffle(pool, rng);
  const out = [];
  for (let i = 0; i < CUSTOMERS_PER_DAY; i++) out.push(deck[i % deck.length]);
  const tricky = pool.filter((o) => {
    const s = progress.skills?.[o.id];
    return s && s.tries > s.clean;
  }).sort((a, b) => {
    const sa = progress.skills[a.id], sb = progress.skills[b.id];
    return (sb.tries - sb.clean) / sb.tries - (sa.tries - sa.clean) / sa.tries;
  });
  const review = tricky[0];
  if (review) {
    const others = deck.filter((o) => o.id !== review.id);
    out[0] = review;
    for (let i = 1; i < 5; i++) out[i] = others[(i - 1) % others.length];
    out[5] = review;
  }
  return out.map((o) => ({ ...o, parts: [...o.parts], cuts: [...o.cuts] }));
}

export function recordDelivery(progress, order, clean) {
  const prev = progress.skills[order.id] || { tries: 0, clean: 0 };
  progress.skills[order.id] = { tries: prev.tries + 1, clean: prev.clean + (clean ? 1 : 0) };
  progress.served += 1;
}

export function dayResult(level, cleanOrders) {
  const clean = Math.max(0, Math.min(CUSTOMERS_PER_DAY, Math.trunc(cleanOrders) || 0));
  return {
    stars: clean >= 5 ? 3 : clean >= 3 ? 2 : 1,
    score: CUSTOMERS_PER_DAY * (60 + 20 * (safeLevel(level) - 1)) + clean * 40
  };
}
