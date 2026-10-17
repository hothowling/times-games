/* Endless road crossing simulation. World coordinates are columns and rows; no DOM or timers. */
import { COUNTRIES } from '../capitals/rules.js';
import { VEHICLE_TYPES } from './vehicles.js';

export const COLUMNS = 7;
export const CROSSING_STEPS = 2;
export const INITIAL_SECTIONS = 6;
export const KEEP_BEHIND = 2;
export const MAX_HEARTS = 3;
export const HOP_SECONDS = 0.18;
export const SLOW_SECONDS = 8;
export const ANSWER_COLUMNS = [1, 3, 5];
const PERIOD = 12;
const mod = (n, d) => ((n % d) + d) % d;
const ROAD_PATTERN = [2, 2, 3, 2, 4];
const SECTION_STARTS = [0, 7, 14, 22, 29];
const CYCLE_ROWS = 38;

export function sectionLayout(id) {
  const index = id % ROAD_PATTERN.length;
  const start = Math.floor(id / ROAD_PATTERN.length) * CYCLE_ROWS + SECTION_STARTS[index];
  const lanes = ROAD_PATTERN[index];
  const gateRow = start + lanes + 1;
  return { id, start, lanes, gateRow, crossingRow: gateRow + 1, exitRow: gateRow + CROSSING_STEPS, end: gateRow + 3 };
}

export function sectionOf(row) {
  const position = Math.max(0, row);
  const cycle = Math.floor(position / CYCLE_ROWS);
  const local = position - cycle * CYCLE_ROWS;
  let index = SECTION_STARTS.length - 1;
  while (local < SECTION_STARTS[index]) index--;
  return cycle * ROAD_PATTERN.length + index;
}
const FACTS = Array.from({ length: 8 }, (_, i) => i + 2)
  .flatMap((a) => Array.from({ length: 9 }, (_, i) => ({ a, b: i + 1 })));

function shuffle(values, rng) {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomFor(seed, index, salt = 0) {
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b1) ^ salt) >>> 0;
  return () => {
    let n = value += 0x6d2b79f5;
    n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

export function readProgress(raw) {
  const count = (v) => Number.isFinite(v) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(v))) : 0;
  return {
    best: count(raw?.best), distance: count(raw?.distance), runs: count(raw?.runs ?? raw?.wins)
  };
}

/* First three crossings teach multiplication. Capitals join every other crossing afterward. */
export const kindForGate = (id) => id >= 3 && id % 2 === 1 ? 'capital' : 'math';

export function difficultyForSection(section) {
  const level = 1 + Math.floor(Math.max(0, section) / 3);
  return {
    level,
    speed: 1 + Math.min(12, level - 1) * 0.1,
    cars: level >= 5 ? 3 : 2,
    maxObstacles: Math.min(3, 2 + Math.floor((level - 1) / 4))
  };
}

function makeQuestion(id, seed) {
  const rng = randomFor(seed, id, 0x1234);
  const kind = kindForGate(id);
  let answer, choices, country, a, b;
  if (kind === 'math') {
    const index = id < 3 ? id : 1 + id / 2;
    const deck = shuffle(FACTS, randomFor(seed, Math.floor(index / FACTS.length), 0x2345));
    ({ a, b } = deck[index % FACTS.length]);
    answer = String(a * b);
    const distractors = [...new Set([a * (b - 1), a * (b + 1), a * b - 1, a * b + 1])]
      .filter((n) => n > 0 && n !== a * b);
    choices = shuffle([answer, ...shuffle(distractors, rng).slice(0, 2).map(String)], rng)
      .map((s) => ({ ko: s, en: s }));
  } else {
    const index = (id - 3) / 2;
    const countries = COUNTRIES.filter((c) => c.level <= Math.min(3, 1 + Math.floor(id / 12)));
    const deck = shuffle(countries, randomFor(seed, Math.floor(index / countries.length), 0x3456));
    country = deck[index % countries.length];
    answer = country.capital.en;
    const others = shuffle(countries.filter((c) => c.code !== country.code), rng).slice(0, 2);
    choices = shuffle([country, ...others], rng).map((c) => c.capital);
  }
  return {
    id, kind, a, b, country, choices, correct: choices.findIndex((c) => c.en === answer),
    unlocked: false, chosen: null, cleared: false, wrong: [], eliminated: [], hinted: false, erased: false
  };
}

export function makeQuestions(rng = Math.random, count = INITIAL_SECTIONS, start = 0) {
  const seed = Math.floor(rng() * 4294967296) >>> 0;
  return Array.from({ length: count }, (_, i) => makeQuestion(start + i, seed));
}

function makeSection(seed, id) {
  const layout = sectionLayout(id);
  const rng = randomFor(seed, id, 0x4567);
  /* One chest per five sections, randomly on either wide road in the cycle. */
  const cycle = Math.floor(id / ROAD_PATTERN.length);
  const giftRng = randomFor(seed, cycle, 0x5678);
  const giftSection = cycle * ROAD_PATTERN.length + (giftRng() < 0.5 ? 2 : 4);
  const columns = shuffle(Array.from({ length: COLUMNS }, (_, col) => col)
    .filter((col) => id !== 0 || col !== 3), rng);
  const count = 1 + Math.floor(rng() * difficultyForSection(id).maxObstacles);
  const firstKind = Math.floor(randomFor(seed, Math.floor(id / 2), 0x6789)() * 2);
  return {
    id, question: makeQuestion(id, seed),
    obstacles: columns.slice(0, count).map((col, index) => ({
      col, row: layout.start, variant: Math.floor(rng() * 4),
      kind: (id + index + firstKind) % 2 ? 'tree' : 'rock'
    })),
    gift: id === giftSection ? {
      id, col: 1 + Math.floor(giftRng() * (COLUMNS - 2)),
      row: layout.start + 2 + Math.floor(giftRng() * (layout.lanes - 2)),
      roll: giftRng(), collected: false
    } : null
  };
}

/* Keep a small live window. Old sections are behind the allowed retreat boundary. */
export function ensureWorld(run, row = run.player.row) {
  const current = sectionOf(run.maxRow);
  const first = Math.max(0, current - KEEP_BEHIND);
  const last = Math.max(current + INITIAL_SECTIONS - 1, sectionOf(row), run.worldEnd ?? 0);
  if (run.worldStart === first && run.worldEnd >= last) return;
  for (const id of run.world.keys()) if (id < first) run.world.delete(id);
  for (let id = first; id <= last; id++) {
    if (!run.world.has(id)) run.world.set(id, makeSection(run.seed, id));
  }
  run.worldStart = first;
  run.worldEnd = last;
  run.minRow = sectionLayout(first).start;
  const sections = [...run.world.values()];
  run.questions = sections.map((section) => section.question);
  run.obstacles = sections.flatMap((section) => section.obstacles);
  run.gifts = sections.flatMap((section) => section.gift ? [section.gift] : []);
}

export const obstacleAt = (run, col, row) => run.obstacles.find((obstacle) => obstacle.col === col && obstacle.row === row);

export function createRun(rng = Math.random) {
  const run = {
    seed: Math.floor(rng() * 4294967296) >>> 0,
    mode: 'play', t: 0, trafficTime: 0,
    player: { col: 3, row: 0 }, checkpoint: { col: 3, row: 0 }, hop: null,
    world: new Map(), questions: [], obstacles: [], gifts: [], minRow: 0,
    hearts: MAX_HEARTS, shield: false, giftsCollected: 0, capitalsCleared: 0,
    slowUntil: 0, invulnerableUntil: 1.2, hurtUntil: 0, maxRow: 0, cleared: 0, mistakes: 0, hits: 0,
    events: []
  };
  ensureWorld(run);
  return run;
}

export function rowKind(row) {
  if (row < 0) return 'safe';
  const layout = sectionLayout(sectionOf(row));
  return row === layout.gateRow ? 'gate' : row === layout.crossingRow ? 'crosswalk' :
    (row > layout.start && row < layout.gateRow) || row === layout.end ? 'road' : 'safe';
}

export function questionForRow(run, row = run.player.row) {
  ensureWorld(run, row);
  return run.world.get(Math.max(run.worldStart, sectionOf(row))).question;
}

/* Integrate acceleration analytically: changing speed must never teleport a car. */
export function carsForRow(row, time) {
  if (!['road', 'crosswalk'].includes(rowKind(row))) return [];
  const difficulty = difficultyForSection(sectionOf(row));
  const direction = row % 2 ? 1 : -1;
  const layout = sectionLayout(sectionOf(row));
  const laneSpeed = 0.9 + ((row - layout.start) * 37) % 7 * 0.075;
  const cruise = laneSpeed * difficulty.speed * (layout.lanes >= 3 ? 1.1 : 1);
  const phase = row * 0.73;
  const rate = 0.78 + row % 4 * 0.09;
  const distance = cruise * (time + 0.22 * (Math.cos(phase) - Math.cos(time * rate + phase)) / rate);
  const velocity = cruise * (1 + 0.22 * Math.sin(time * rate + phase));
  return Array.from({ length: difficulty.cars }, (_, i) => {
    const variant = (row + i) % VEHICLE_TYPES.length;
    const type = VEHICLE_TYPES[variant];
    const responsePhase = i * 1.9 + variant * 0.47;
    /* Bounded individual surges preserve lane spacing, even after hours of play. */
    const offset = type.surge * (Math.sin(time * type.surgeRate + responsePhase) - Math.sin(responsePhase));
    return {
      col: mod(row * 2.37 + i * PERIOD / difficulty.cars + (distance + offset) * direction + 3, PERIOD) - 3,
      row, direction, variant, length: type.length,
      speed: velocity + type.surge * type.surgeRate * Math.cos(time * type.surgeRate + responsePhase)
    };
  });
}

export function playerPosition(run) {
  if (!run.hop) return { ...run.player, lift: 0 };
  const h = run.hop;
  const t = Math.min(1, h.elapsed / HOP_SECONDS);
  return {
    col: h.from.col + (h.to.col - h.from.col) * t,
    row: h.from.row + (h.to.row - h.from.row) * t,
    lift: Math.sin(t * Math.PI) * 12
  };
}

export function requestMove(run, dx, dy) {
  if (run.mode !== 'play' || run.hop || run.t < run.hurtUntil || Math.abs(dx) + Math.abs(dy) !== 1 || !Number.isInteger(dx) || !Number.isInteger(dy)) return false;
  const from = run.player;
  const to = { col: from.col + dx, row: from.row + dy };
  if (to.col < 0 || to.col >= COLUMNS || to.row < run.minRow) return false;
  ensureWorld(run, to.row);
  const obstacle = obstacleAt(run, to.col, to.row);
  if (obstacle) {
    run.events.push({ kind: 'obstacle', obstacle });
    return false;
  }
  if (rowKind(to.row) === 'crosswalk') {
    const q = questionForRow(run, to.row);
    const index = ANSWER_COLUMNS.indexOf(to.col);
    if (index < 0 || (q.unlocked && q.chosen !== to.col)) {
      run.events.push({ kind: 'path' });
      return false;
    }
    if (!q.unlocked) {
      if (q.eliminated.includes(index)) {
        run.events.push({ kind: 'eliminated' });
        return false;
      }
      if (index !== q.correct) {
        if (!q.wrong.includes(index)) q.wrong.push(index);
        run.mistakes++;
        run.checkpoint = { ...from };
        takeHit(run, 'answer');
        return false;
      }
      q.unlocked = true;
      q.chosen = to.col;
      run.checkpoint = { ...from };
      run.events.push({ kind: 'correct', question: q });
    }
  }
  run.hop = { from: { ...from }, to, elapsed: 0 };
  return true;
}

export function takeHit(run, source = 'car') {
  if (run.mode !== 'play' || run.t < run.hurtUntil || (source === 'car' && run.t < run.invulnerableUntil)) return false;
  const saved = run.shield;
  if (saved) run.shield = false;
  else { run.hearts--; if (source === 'car') run.hits++; }
  run.hop = null;
  run.player = { ...run.checkpoint };
  run.invulnerableUntil = run.t + 1.8;
  run.hurtUntil = run.t + 0.6;
  run.events.push({ kind: saved ? 'protected' : source === 'answer' ? 'wrong' : 'hit', source });
  if (!run.hearts) {
    run.mode = 'over';
    run.events.push({ kind: 'finish' });
  }
  return true;
}

/* Free chest rewards apply to this run immediately; they never grant paid inventory. */
export function collectGift(run) {
  if (run.mode !== 'play') return null;
  const gift = run.gifts.find((g) => !g.collected && g.col === run.player.col && g.row === run.player.row);
  if (!gift) return null;
  const rewards = ['slow'];
  if (run.hearts < MAX_HEARTS) rewards.push('heart');
  if (!run.shield) rewards.push('shield');
  const reward = rewards[Math.min(rewards.length - 1, Math.floor(gift.roll * rewards.length))];
  gift.collected = true;
  run.giftsCollected++;
  if (reward === 'heart') run.hearts = Math.min(MAX_HEARTS, run.hearts + 1);
  if (reward === 'shield') run.shield = true;
  if (reward === 'slow') run.slowUntil = Math.min(run.t + 20, Math.max(run.t, run.slowUntil) + SLOW_SECONDS);
  run.events.push({ kind: 'gift', reward });
  return reward;
}

/* Erase one unknown wrong path; walking toward a visibly erased path is just blocked. */
export function eraseChoice(run) {
  const q = questionForRow(run);
  if (run.mode !== 'play' || rowKind(run.player.row) !== 'gate' || q.unlocked || q.erased) return false;
  const index = q.choices.findIndex((_, i) => i !== q.correct && !q.wrong.includes(i) && !q.eliminated.includes(i));
  if (index < 0) return false;
  q.eliminated.push(index);
  q.erased = true;
  return true;
}

function land(run) {
  run.player = { ...run.hop.to };
  run.hop = null;
  run.maxRow = Math.max(run.maxRow, run.player.row);
  if (['safe', 'gate'].includes(rowKind(run.player.row))) run.checkpoint = { ...run.player };
  const q = questionForRow(run);
  if (run.player.row === sectionLayout(q.id).exitRow && q.unlocked && !q.cleared) {
    q.cleared = true;
    run.cleared++;
    if (q.kind === 'capital') run.capitalsCleared++;
    run.events.push({ kind: 'crossed', question: q });
  }
  collectGift(run);
}

/* Small physics steps test the complete hop, so a fast crossing cannot skip a car. */
export function advance(run, seconds) {
  if (run.mode !== 'play' || !Number.isFinite(seconds) || seconds <= 0) return;
  let remaining = Math.min(seconds, 0.1);
  while (remaining > 0.000001 && run.mode === 'play') {
    const dt = Math.min(remaining, 0.02);
    remaining -= dt;
    run.t += dt;
    run.trafficTime += dt * (run.t < run.slowUntil ? 0.4 : 1);
    if (run.hop) {
      run.hop.elapsed += dt;
      if (run.hop.elapsed >= HOP_SECONDS - 0.000001) land(run);
    }
    if (run.t < run.invulnerableUntil || run.mode !== 'play') continue;
    const p = playerPosition(run);
    const row = Math.round(p.row);
    if (Math.abs(p.row - row) > 0.34) continue;
    if (carsForRow(row, run.trafficTime).some((c) => Math.abs(c.col - p.col) < c.length / 2 + 0.17)) takeHit(run);
  }
}

export function resultFor(run) {
  return {
    score: run.maxRow * 10 + run.cleared * 100,
    stars: run.cleared >= 12 ? 3 : run.cleared >= 6 ? 2 : run.cleared >= 2 ? 1 : 0,
    detail: {
      distance: run.maxRow, correct: run.cleared, mistakes: run.mistakes, hits: run.hits,
      capitals: run.capitalsCleared, gifts: run.giftsCollected, level: difficultyForSection(sectionOf(run.maxRow)).level
    }
  };
}
