import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COLUMNS, ANSWER_COLUMNS, INITIAL_SECTIONS, KEEP_BEHIND, createRun, makeQuestions, readProgress, requestMove,
  advance, carsForRow, playerPosition, takeHit, resultFor, eraseChoice, rowKind, obstacleAt, questionForRow,
  sectionLayout, sectionOf, ensureWorld, difficultyForSection, collectGift, SLOW_SECONDS
} from '../public/games/crossing/rules.js';
import { COUNTRIES } from '../public/games/capitals/rules.js';
import { VEHICLE_SHEET, VEHICLE_TYPES } from '../public/games/crossing/vehicles.js';

function rng(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function wait(run, seconds) {
  for (let t = 0; t < seconds - 0.00001; t += 0.02) advance(run, Math.min(0.02, seconds - t));
}
function hop(run, dx, dy) {
  assert.equal(requestMove(run, dx, dy), true);
  wait(run, 0.2);
}
function align(run, col) {
  while (run.player.col !== col) hop(run, Math.sign(col - run.player.col), 0);
}

/* Find a forward route, then execute it through the actual movement and landing rules. */
function routeToRow(run, target) {
  const queue = [{ ...run.player, path: [] }];
  const visited = new Set([`${run.player.col},${run.player.row}`]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (current.row === target) return current.path;
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0]]) {
      const col = current.col + dx, row = current.row + dy, key = `${col},${row}`;
      if (col < 0 || col >= COLUMNS || row > target || visited.has(key) || obstacleAt(run, col, row)) continue;
      if (rowKind(row) === 'crosswalk' && col !== ANSWER_COLUMNS[questionForRow(run, row).correct]) continue;
      visited.add(key);
      queue.push({ col, row, path: [...current.path, [dx, dy]] });
    }
  }
  assert.fail('obstacles left no route to the requested sidewalk');
}

test('mixed obstacles leave the start, every quiz entrance, gift and landing clear', () => {
  const layouts = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const run = createRun(rng(seed));
    assert.equal(obstacleAt(run, 3, 0), undefined);
    assert.equal(new Set(run.obstacles.map((obstacle) => `${obstacle.col},${obstacle.row}`)).size, run.obstacles.length);
    for (const obstacle of run.obstacles) {
      assert.ok(Number.isInteger(obstacle.col) && obstacle.col >= 0 && obstacle.col < COLUMNS);
      assert.equal(rowKind(obstacle.row), 'safe');
      assert.equal(obstacle.row, sectionLayout(sectionOf(obstacle.row)).start);
      assert.ok(['rock', 'tree'].includes(obstacle.kind));
    }
    for (let section = 0; section < INITIAL_SECTIONS; section++) {
      const count = run.obstacles.filter((obstacle) => obstacle.row === sectionLayout(section).start).length;
      assert.ok(count >= 1 && count <= difficultyForSection(section).maxObstacles);
    }
    for (const gift of run.gifts) {
      const layout = sectionLayout(gift.id);
      assert.ok(layout.lanes >= 3);
      assert.equal(rowKind(gift.row), 'road');
      assert.ok(gift.row > layout.start + 1 && gift.row < layout.start + layout.lanes);
      assert.equal(obstacleAt(run, gift.col, gift.row), undefined);
      assert.ok(gift.col >= 0 && gift.col < COLUMNS);
    }
    layouts.add(JSON.stringify(run.obstacles.map(({ col, row }) => [col, row])));
  }
  assert.ok(layouts.size > 80);
});

test('rocks and trees block all four directions without damage or consuming a shield', () => {
  for (const kind of ['rock', 'tree']) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const run = createRun(rng(1));
    run.obstacles = [{ col: 3, row: 7, variant: 0, kind }];
    run.player = { col: 3 - dx, row: 7 - dy };
    run.shield = true;
    const before = { ...run.player };
    assert.equal(requestMove(run, dx, dy), false);
    assert.deepEqual(run.player, before);
    assert.equal(run.hop, null);
    assert.equal(run.hearts, 3);
    assert.equal(run.shield, true);
    assert.equal(run.mistakes, 0);
    assert.equal(run.hits, 0);
    assert.equal(run.events.at(-1).kind, 'obstacle');
    assert.equal(run.events.at(-1).obstacle.kind, kind);
    assert.equal(requestMove(run, -dx, -dy), true, 'an unoccupied detour remains available');
  }
});

test('rocks and trees stay balanced without increasing the number of blocked tiles', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const run = createRun(rng(seed));
    let rocks = 0, trees = 0;
    for (let id = 0; id < 100; id++) {
      run.maxRow = sectionLayout(id).start;
      ensureWorld(run);
      const obstacles = run.world.get(id).obstacles;
      assert.ok(obstacles.length >= 1 && obstacles.length <= difficultyForSection(id).maxObstacles);
      if (obstacles.length > 1) assert.equal(new Set(obstacles.map((obstacle) => obstacle.kind)).size, 2);
      rocks += obstacles.filter((obstacle) => obstacle.kind === 'rock').length;
      trees += obstacles.filter((obstacle) => obstacle.kind === 'tree').length;
    }
    const treeShare = trees / (rocks + trees);
    assert.ok(treeShare >= 0.4 && treeShare <= 0.6, 'each long run has an even visual mix');
  }
});

test('long randomized runs keep every quiz and respawn checkpoint reachable', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const run = createRun(rng(seed));
    run.invulnerableUntil = Infinity;
    for (let section = 0; section < 25; section++) {
      for (const [dx, dy] of routeToRow(run, sectionLayout(section).exitRow)) {
        hop(run, dx, dy);
        assert.equal(obstacleAt(run, run.player.col, run.player.row), undefined);
        assert.equal(obstacleAt(run, run.checkpoint.col, run.checkpoint.row), undefined);
      }
      assert.equal(run.mode, 'play');
      assert.equal(run.cleared, section + 1);
      assert.equal(run.hearts, 3);
      run.events.length = 0;
    }
  }
});

test('all eight vehicle types have distinct high-resolution frames and appear in both travel directions', () => {
  const png = readFileSync(new URL('../public/' + VEHICLE_SHEET.src, import.meta.url));
  assert.equal(png.readUInt32BE(16), VEHICLE_SHEET.width);
  assert.equal(png.readUInt32BE(20), VEHICLE_SHEET.height);
  assert.equal(png[25], 6, 'the atlas has a real RGBA transparency channel');
  assert.equal(VEHICLE_TYPES.length, 8);
  const rectangles = [];
  const directions = VEHICLE_TYPES.map(() => new Set());
  for (const vehicle of VEHICLE_TYPES) {
    for (const side of ['left', 'right']) {
      const [x, y, width, height] = vehicle[side];
      assert.ok(width >= vehicle.length * 64 * 3, 'source pixels cover the largest 3× display size');
      assert.ok(x >= 0 && y >= 0 && x + width <= VEHICLE_SHEET.width && y + height <= VEHICLE_SHEET.height);
      assert.ok(rectangles.every(([a, b, w, h]) => x + width <= a || a + w <= x || y + height <= b || b + h <= y), 'no sprite can include its neighbor');
      rectangles.push(vehicle[side]);
    }
  }
  for (let row = 1; row <= 200; row++) {
    for (const car of carsForRow(row, 0)) directions[car.variant].add(car.direction);
  }
  for (const seen of directions) assert.deepEqual([...seen].sort(), [-1, 1]);
});

test('a nearby bus hits the player while a shorter scooter leaves a safe gap', () => {
  for (const scenario of [{ row: 4, time: 0, type: 'bus', hearts: 2 }, { row: 6, time: 4, type: 'scooter', hearts: 3 }]) {
    const run = createRun(rng(1));
    const car = carsForRow(scenario.row, scenario.time).find((c) => VEHICLE_TYPES[c.variant].id === scenario.type);
    assert.ok(car);
    run.t = 2;
    run.trafficTime = scenario.time;
    run.invulnerableUntil = 0;
    run.player = { col: Math.round(car.col + 0.7), row: scenario.row };
    assert.ok(run.player.col >= 0 && run.player.col <= 6);
    advance(run, 0.02);
    assert.equal(run.hearts, scenario.hearts);
  }
});

test('every generated crossing has three unique choices and exactly one factual answer', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const questions = makeQuestions(rng(seed));
    assert.deepEqual(questions.map((q) => q.kind), ['math', 'math', 'math', 'capital', 'math', 'capital']);
    assert.equal(questions.length, INITIAL_SECTIONS);
    assert.notEqual(questions[3].country.code, questions[5].country.code);
    const math = questions.filter((q) => q.kind === 'math');
    assert.equal(new Set(math.map((q) => `${q.a}×${q.b}`)).size, math.length);
    for (const q of questions) {
      assert.equal(q.choices.length, 3);
      for (const lang of ['ko', 'en']) assert.equal(new Set(q.choices.map((c) => c[lang])).size, 3);
      assert.ok(q.correct >= 0 && q.correct < 3);
      if (q.kind === 'math') {
        assert.ok(Number.isInteger(q.a) && q.a >= 2 && q.a <= 9);
        assert.ok(Number.isInteger(q.b) && q.b >= 1 && q.b <= 9);
        assert.equal(Number(q.choices[q.correct].en), q.a * q.b);
        assert.ok(q.choices.every((c) => Number(c.en) > 0));
      } else {
        const source = COUNTRIES.find((c) => c.code === q.country.code);
        assert.deepEqual(q.choices[q.correct], source.capital);
      }
    }
  }
});

test('new runs randomize both factors from the first question across all 2–9 tables', () => {
  const first = Array.from({ length: 100 }, (_, seed) => createRun(rng(seed + 1)).questions[0]);
  assert.deepEqual([...new Set(first.map((q) => q.a))].sort(), [2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual([...new Set(first.map((q) => q.b))].sort(), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('wrong gate costs exactly one heart, returns to the sidewalk, and cannot be bypassed through a gap', () => {
  const run = createRun(rng(20));
  run.player.row = 3;
  const q = run.questions[0];
  const wrong = (q.correct + 1) % 3;
  run.player.col = ANSWER_COLUMNS[wrong];
  assert.equal(requestMove(run, 0, 1), false);
  assert.equal(run.hop, null);
  assert.equal(run.hearts, 2);
  assert.equal(run.mistakes, 1);
  assert.equal(q.unlocked, false);
  requestMove(run, 0, 1);
  assert.equal(run.mistakes, 1, 'one accidental double tap does not cause repeated damage during cooldown');
  assert.equal(run.hearts, 2);
  wait(run, 0.65);
  run.player.col = 2;
  assert.equal(requestMove(run, 0, 1), false, 'walking between the answer paths is blocked');
  run.player.col = ANSWER_COLUMNS[q.correct];
  assert.equal(requestMove(run, 0, 1), true);
  assert.equal(q.unlocked, true);
  assert.equal(run.checkpoint.row, 3);
});

test('three separate wrong answers end a run even while vehicle respawn protection is active', () => {
  const run = createRun(rng(20));
  run.player.row = 3;
  run.player.col = ANSWER_COLUMNS[(run.questions[0].correct + 1) % 3];
  for (let i = 0; i < 3; i++) {
    requestMove(run, 0, 1);
    assert.equal(run.hearts, 2 - i);
    wait(run, 0.65);
  }
  assert.equal(run.mode, 'over');
  assert.equal(run.mistakes, 3);
  assert.equal(run.events.filter((e) => e.kind === 'finish').length, 1);
});

test('shield blocks one wrong answer as well as car damage, then the next wrong answer costs a heart', () => {
  const run = createRun();
  run.player.row = 3;
  run.player.col = ANSWER_COLUMNS[(run.questions[0].correct + 1) % 3];
  run.shield = true;
  requestMove(run, 0, 1);
  assert.equal(run.hearts, 3);
  assert.equal(run.shield, false);
  assert.equal(run.events.at(-1).kind, 'protected');
  wait(run, 0.65);
  requestMove(run, 0, 1);
  assert.equal(run.hearts, 2);
  assert.equal(run.mistakes, 2);
});

test('eraser removes one wrong path and the removed path cannot take a heart', () => {
  const run = createRun();
  assert.equal(eraseChoice(run), false, 'only usable at the quiz sidewalk');
  run.player.row = 3;
  assert.equal(eraseChoice(run), true);
  const q = run.questions[0];
  assert.equal(q.eliminated.length, 1);
  assert.notEqual(q.eliminated[0], q.correct);
  assert.equal(eraseChoice(run), false, 'one eraser per crossing');
  run.player.col = ANSWER_COLUMNS[q.eliminated[0]];
  assert.equal(requestMove(run, 0, 1), false);
  assert.equal(run.hearts, 3);
  assert.equal(run.mistakes, 0);
});

test('wrong answers and car collisions share the same three-heart pool', () => {
  const run = createRun();
  run.player.row = 3;
  run.player.col = ANSWER_COLUMNS[(run.questions[0].correct + 1) % 3];
  requestMove(run, 0, 1);
  wait(run, 0.65);
  requestMove(run, 0, 1);
  wait(run, 1.9);
  takeHit(run);
  assert.equal(run.hearts, 0);
  assert.equal(run.mode, 'over');
  assert.equal(run.mistakes, 2);
  assert.equal(run.hits, 1);
});

test('movement accepts only single whole grid steps and respects the world edges', () => {
  const run = createRun();
  assert.equal(requestMove(run, 0.5, 0.5), false);
  assert.equal(requestMove(run, 0, 2), false);
  assert.equal(requestMove(run, 0, -1), false);
  run.player.col = 0;
  assert.equal(requestMove(run, -1, 0), false);
});

test('the correct crossing confines lateral movement to its own marked path', () => {
  const run = createRun(rng(5));
  run.invulnerableUntil = Infinity;
  run.player.row = 3;
  run.player.col = ANSWER_COLUMNS[run.questions[0].correct];
  hop(run, 0, 1);
  assert.equal(requestMove(run, 1, 0), false);
  assert.equal(requestMove(run, -1, 0), false);
  hop(run, 0, -1);
  assert.equal(run.player.row, 3, 'retreating to the safe median is allowed');
});

test('waiting to solve a problem on the safe median has no time limit or health penalty', () => {
  const run = createRun();
  run.player.row = 3;
  run.checkpoint.row = 3;
  wait(run, 60);
  assert.equal(run.hearts, 3);
  assert.equal(run.mode, 'play');
  assert.equal(run.questions[0].unlocked, false);
  assert.equal(run.cleared, 0);
});

test('car collision during a hop is detected before landing and returns to the safe checkpoint', () => {
  const run = createRun();
  run.invulnerableUntil = 0;
  assert.equal(requestMove(run, 0, 1), true);
  wait(run, 0.14);
  assert.equal(run.hearts, 2);
  assert.deepEqual(run.player, { col: 3, row: 0 });
  assert.equal(run.hop, null);
  assert.equal(run.maxRow, 0);
  assert.ok(run.events.some((e) => e.kind === 'hit'));
});

test('shield absorbs one collision and respawn grace prevents repeated immediate damage', () => {
  const run = createRun();
  run.t = 2;
  run.shield = true;
  assert.equal(takeHit(run), true);
  assert.equal(run.hearts, 3);
  assert.equal(run.shield, false);
  assert.equal(takeHit(run), false);
  run.t += 2;
  takeHit(run);
  assert.equal(run.hearts, 2);
  assert.equal(run.hits, 1);
});

test('losing all hearts reports a terminal state once and stops movement', () => {
  const run = createRun();
  for (let i = 0; i < 3; i++) { run.t += 3; takeHit(run); }
  assert.equal(run.mode, 'over');
  assert.equal(run.hearts, 0);
  assert.equal(run.events.filter((e) => e.kind === 'finish').length, 1);
  assert.equal(requestMove(run, 0, 1), false);
  assert.equal(takeHit(run), false);
});

test('pause freezes cars, invulnerability and an in-flight hop', () => {
  const run = createRun();
  requestMove(run, 0, 1);
  wait(run, 0.04);
  run.mode = 'pause';
  const before = structuredClone(run);
  advance(run, 10);
  assert.deepEqual(run, before);
  assert.ok(playerPosition(run).row > 0 && playerPosition(run).row < 1);
});

test('slow traffic changes its clock continuously and restores normal speed after eight seconds', () => {
  const run = createRun();
  run.slowUntil = 8;
  wait(run, 7.9);
  const before = carsForRow(1, run.trafficTime)[0].col;
  assert.ok(Math.abs(run.trafficTime - 3.16) < 0.02);
  wait(run, 0.2);
  const after = carsForRow(1, run.trafficTime)[0].col;
  assert.ok(after - before > 0 && after - before < 0.2, 'no position jump as the effect expires');
  const trafficTime = run.trafficTime;
  wait(run, 1);
  assert.ok(Math.abs(run.trafficTime - trafficTime - 1) < 0.001);
});

test('the road continues past six quizzes and each narrow or wide section clears in two hops', () => {
  const run = createRun(rng(32));
  run.invulnerableUntil = Infinity;
  for (let id = 0; id < 30; id++) {
    const layout = sectionLayout(id);
    for (const [dx, dy] of routeToRow(run, layout.gateRow)) hop(run, dx, dy);
    const question = questionForRow(run);
    align(run, ANSWER_COLUMNS[question.correct]);
    hop(run, 0, 1);
    assert.equal(rowKind(run.player.row), 'crosswalk');
    assert.equal(run.cleared, id);
    hop(run, 0, 1);
    assert.equal(run.player.row, layout.exitRow);
    assert.equal(rowKind(run.player.row), 'safe');
    assert.deepEqual(run.checkpoint, run.player);
    assert.equal(run.cleared, id + 1);
    assert.equal(run.mode, 'play', 'there is no victory or finish line at any crossing count');
    if (id === 0) {
      const score = resultFor(run).score, gifts = run.giftsCollected;
      hop(run, 0, -1); hop(run, 0, 1);
      assert.equal(run.cleared, 1);
      assert.equal(resultFor(run).score, score);
      assert.equal(run.giftsCollected, gifts);
    }
    run.events.length = 0;
  }
  assert.equal(run.events.some((e) => e.kind === 'finish'), false);
  const result = resultFor(run);
  assert.equal(result.stars, 3);
  assert.equal(result.detail.capitals, 14, 'cumulative records include pruned questions');
  assert.equal(result.detail.correct, 30);
  assert.ok(result.score > 4000);
  assert.ok(run.questions.length <= INITIAL_SECTIONS + KEEP_BEHIND);
});

test('endless records preserve old best values and migrate legacy win counts to runs', () => {
  assert.deepEqual(readProgress(null), { best: 0, distance: 0, runs: 0 });
  assert.deepEqual(readProgress({ best: -5, distance: Infinity, runs: 2.7, table: 0 }), { best: 0, distance: 0, runs: 2 });
  assert.deepEqual(readProgress({ best: 1060, distance: 46, wins: 1, table: 6 }), { best: 1060, distance: 46, runs: 1 });
  assert.equal(readProgress({ best: 1e30 }).best, Number.MAX_SAFE_INTEGER);
});

test('narrow, three-lane and four-lane roads fit continuously before two-hop quiz crossings', () => {
  const widths = new Set();
  for (let id = 0; id < 100; id++) {
    const layout = sectionLayout(id);
    widths.add(layout.lanes);
    assert.equal(sectionOf(layout.start), id);
    assert.equal(sectionOf(layout.end), id);
    assert.equal(layout.end + 1, sectionLayout(id + 1).start);
    assert.equal(layout.exitRow - layout.gateRow, 2);
    assert.equal(rowKind(layout.start), 'safe');
    for (let row = layout.start + 1; row < layout.gateRow; row++) assert.equal(rowKind(row), 'road');
    assert.equal(rowKind(layout.gateRow), 'gate');
    assert.equal(rowKind(layout.crossingRow), 'crosswalk');
    assert.equal(rowKind(layout.exitRow), 'safe');
  }
  assert.deepEqual([...widths].sort(), [2, 3, 4]);
});

function carSpeed(row) {
  let total = 0;
  for (let time = 0; time < 120; time += 0.5) total += carsForRow(row, time)[0].speed;
  return total / 240;
}

test('lanes have different speeds and progression increases speed and density with playable limits', () => {
  for (const id of [2, 4, 7, 9]) {
    const layout = sectionLayout(id);
    const speeds = Array.from({ length: layout.lanes }, (_, lane) => carSpeed(layout.start + lane + 1).toFixed(4));
    assert.equal(new Set(speeds).size, layout.lanes);
  }
  let previous = 0;
  const initialSpeed = carSpeed(sectionLayout(0).start + 1);
  for (const id of [0, 3, 6, 12, 30, 60, 600]) {
    const speed = carSpeed(sectionLayout(id).start + 1);
    const d = difficultyForSection(id);
    assert.ok(d.speed >= previous);
    previous = d.speed;
    assert.ok(speed >= initialSpeed * d.speed * 0.96 && speed <= initialSpeed * d.speed * 1.15,
      'average speed rises with difficulty while instantaneous speeds accelerate and decelerate');
    assert.ok(d.speed <= 2.2 && d.cars <= 3 && d.maxObstacles <= 3);
  }
  assert.equal(carsForRow(sectionLayout(0).start + 1, 0).length, 2);
  assert.equal(carsForRow(sectionLayout(12).start + 1, 0).length, 3);
});

test('accelerating traffic remains continuous, forward-moving and separated over long runs', () => {
  const dt = 0.0001;
  for (const id of [0, 2, 4, 12, 30, 600]) {
    const layout = sectionLayout(id);
    for (let row = layout.start + 1; row <= layout.end; row++) {
      for (let time = 0; time <= 90; time += 0.25) {
        const before = carsForRow(row, time), after = carsForRow(row, time + dt);
        for (const [i, car] of before.entries()) {
          assert.ok(car.speed > 0 && car.speed < 4.5, 'acceleration is bounded and never reverses traffic');
          const displacement = ((after[i].col - car.col + 18) % 12) - 6;
          assert.ok(Math.abs(displacement / dt - car.speed * car.direction) < 0.003,
            'reported speed matches continuous movement, including screen wrap');
          for (const other of before.slice(i + 1)) {
            const distance = Math.abs(((other.col - car.col + 18) % 12) - 6);
            assert.ok(distance > (car.length + other.length) / 2 + 0.5, 'vehicles always leave a usable gap');
          }
        }
      }
    }
  }
});

test('traffic gains and loses speed smoothly and slow items reduce the actual displacement', () => {
  const speeds = Array.from({ length: 100 }, (_, i) => carsForRow(1, i * 0.1)[0].speed);
  assert.ok(Math.max(...speeds) - Math.min(...speeds) > 0.3);
  for (let i = 1; i < speeds.length; i++) assert.ok(Math.abs(speeds[i] - speeds[i - 1]) < 0.08);
  const normal = createRun(rng(11)), slow = createRun(rng(11));
  slow.slowUntil = 8;
  wait(normal, 0.5); wait(slow, 0.5);
  const start = carsForRow(1, 0)[0].col;
  const distance = (run) => Math.abs(((carsForRow(1, run.trafficTime)[0].col - start + 18) % 12) - 6);
  assert.ok(distance(slow) < distance(normal) * 0.5);
});

test('a long world keeps a bounded buffer and cannot regenerate old rewards by retreating', () => {
  const run = createRun(rng(28));
  const firstGift = run.gifts[0];
  run.player = { col: firstGift.col, row: firstGift.row };
  collectGift(run);
  for (let id = 3; id < 5000; id += 37) {
    run.maxRow = sectionLayout(id).start;
    run.player = { col: 3, row: run.maxRow };
    ensureWorld(run);
    assert.ok(run.world.size <= INITIAL_SECTIONS + KEEP_BEHIND);
    assert.ok(run.questions.length <= INITIAL_SECTIONS + KEEP_BEHIND);
    assert.ok(run.obstacles.length <= (INITIAL_SECTIONS + KEEP_BEHIND) * 3);
  }
  assert.equal(run.world.has(0), false);
  assert.equal(run.giftsCollected, 1);
  run.player = { col: 3, row: run.minRow };
  assert.equal(requestMove(run, 0, -1), false);
  assert.equal(run.giftsCollected, 1);
});

test('the multiplication deck uses all 72 combinations before reshuffling in an endless run', () => {
  const questions = makeQuestions(rng(17), 200);
  const math = questions.filter((q) => q.kind === 'math');
  assert.equal(new Set(math.slice(0, 72).map((q) => `${q.a}×${q.b}`)).size, 72);
  for (const q of math) assert.equal(+q.choices[q.correct].en, q.a * q.b);
  assert.ok(questions.some((q) => q.kind === 'capital' && q.id > 100));
});

test('gifts are rarer, vary between wide roads, and never appear on safe tiles or quiz crossings', () => {
  const kinds = new Set(), lanes = new Set(), columns = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    const run = createRun(rng(seed));
    let previous = null;
    for (let cycle = 0; cycle < 20; cycle++) {
      run.maxRow = sectionLayout(cycle * 5).start;
      ensureWorld(run);
      const gifts = run.gifts.filter((gift) => Math.floor(gift.id / 5) === cycle);
      assert.equal(gifts.length, 1, 'one gift per five road sections, previously one per two');
      const gift = gifts[0], layout = sectionLayout(gift.id);
      assert.ok(layout.lanes >= 3);
      assert.equal(rowKind(gift.row), 'road');
      assert.ok(gift.row > layout.start + 1 && gift.row < layout.gateRow - 1);
      assert.ok(gift.col >= 1 && gift.col < COLUMNS - 1);
      if (previous) assert.ok(gift.id - previous.id >= 3, 'gifts cannot appear on adjacent wide roads');
      previous = gift;
      kinds.add(layout.lanes); lanes.add(gift.row - layout.start); columns.add(gift.col);
    }
  }
  assert.deepEqual([...kinds].sort(), [3, 4]);
  assert.deepEqual([...lanes].sort(), [2, 3]);
  assert.equal(columns.size, 5);
});

test('landing on a road gift applies one effect without creating a road respawn point or duplicate rewards', () => {
  const run = createRun(rng(3));
  run.invulnerableUntil = Infinity;
  run.hearts = 2;
  const gift = run.gifts[0], checkpoint = { ...run.checkpoint };
  gift.roll = 0.5;
  run.player = { col: gift.col, row: gift.row - 1 };
  assert.equal(run.giftsCollected, 0);
  hop(run, 0, 1);
  assert.equal(run.hearts, 3);
  assert.equal(run.giftsCollected, 1);
  assert.equal(gift.collected, true);
  assert.deepEqual(run.checkpoint, checkpoint, 'picking up a gift in traffic preserves the last safe checkpoint');
  assert.equal(run.events.find((e) => e.kind === 'gift').reward, 'heart');
  hop(run, 0, -1); hop(run, 0, 1);
  assert.equal(run.giftsCollected, 1);
  assert.equal(run.events.filter((e) => e.kind === 'gift').length, 1);
});

test('gift effects cover hearts, slow traffic and shields, and full hearts never overflow', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const run = createRun(rng(seed)), gift = run.gifts[0];
    run.hearts = 2;
    run.player = { col: gift.col, row: gift.row };
    const effect = collectGift(run);
    seen.add(effect);
    if (effect === 'heart') assert.equal(run.hearts, 3);
    if (effect === 'slow') assert.equal(run.slowUntil, SLOW_SECONDS);
    if (effect === 'shield') assert.equal(run.shield, true);
    assert.equal(collectGift(run), null);
  }
  assert.deepEqual([...seen].sort(), ['heart', 'shield', 'slow']);
  const run = createRun(rng(2)), gift = run.gifts[0];
  run.shield = true;
  run.player = { col: gift.col, row: gift.row };
  assert.equal(collectGift(run), 'slow', 'full hearts and an active shield leave a useful slow-traffic reward');
  assert.equal(run.hearts, 3);
});

test('slow gifts extend the existing timer without a car jump and are capped at twenty seconds', () => {
  const run = createRun(rng(2));
  run.t = 5;
  run.slowUntil = 10;
  const before = carsForRow(1, run.trafficTime);
  for (const id of [0, 5, 10]) {
    run.maxRow = sectionLayout(id).start;
    ensureWorld(run);
    const gift = run.gifts.find((g) => Math.floor(g.id / 5) === id / 5);
    gift.roll = 0;
    run.player = { col: gift.col, row: gift.row };
    assert.equal(collectGift(run), 'slow');
  }
  assert.equal(run.slowUntil, run.t + 20);
  assert.deepEqual(carsForRow(1, run.trafficTime), before);
});

test('only zero hearts ends an endless run, and a gift cannot revive a finished run', () => {
  const run = createRun(rng(1));
  run.cleared = 25;
  run.maxRow = sectionLayout(25).exitRow;
  run.player = { ...run.checkpoint };
  assert.equal(run.mode, 'play');
  run.hearts = 1;
  run.invulnerableUntil = 0;
  takeHit(run);
  assert.equal(run.mode, 'over');
  assert.equal(run.hearts, 0);
  const gift = run.gifts[0];
  run.player = { col: gift.col, row: gift.row };
  assert.equal(collectGift(run), null);
  assert.equal(gift.collected, false);
  assert.equal(run.events.filter((e) => e.kind === 'finish').length, 1);
  assert.equal(resultFor(run).stars, 3);
});
