import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FRAME, EYE_Y, EYE_DIST, SHEET_ORDER, frameTransform, mapPoint, keepPolygon, alphaOf } from '../public/core/maker.js';

function face(pts) {
  const lm = Array.from({ length: 478 }, () => ({ x: 300, y: 300 }));
  for (const [k, v] of Object.entries(pts)) lm[k] = v;
  return lm;
}
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} != ${b}`);

test('tilted faces end up level, centered, EYE_DIST apart', () => {
  for (const deg of [0, 25, -40]) {
    const r = deg * Math.PI / 180;
    const lm = face({ 33: { x: 200, y: 300 }, 263: { x: 200 + 90 * Math.cos(r), y: 300 + 90 * Math.sin(r) } });
    const T = frameTransform(lm);
    const a = mapPoint(lm[33], T);
    const b = mapPoint(lm[263], T);
    near(a.y, EYE_Y, `${deg}° left eye`);
    near(b.y, EYE_Y, `${deg}° right eye`);
    near(b.x - a.x, EYE_DIST, `${deg}° eye distance`);
    near((a.x + b.x) / 2, FRAME / 2, `${deg}° center`);
  }
});

test('keep polygon wraps the jaw line, chin inside the frame', () => {
  const lm = face({ 33: { x: 250, y: 300 }, 263: { x: 350, y: 300 }, 10: { x: 300, y: 243 }, 152: { x: 300, y: 420 } });
  const poly = keepPolygon(lm, frameTransform(lm));
  assert.equal(poly.length, 15 + 4);
  assert.ok(poly[0].x < 0 && poly.at(-1).x < 0 && poly.at(-1).y < 0);
  assert.ok(poly[8].y > EYE_Y && poly[8].y < FRAME);
});

test('alpha curve and 5-frame sheet order', () => {
  assert.equal(alphaOf(0), 0);
  assert.equal(alphaOf(1), 1);
  assert.ok(alphaOf(0.55) > 0.4 && alphaOf(0.55) < 0.6);
  /* neutral, happy, angry, surprised(=neutral), sad(=angry) */
  assert.deepEqual(SHEET_ORDER, [0, 1, 2, 0, 2]);
});
