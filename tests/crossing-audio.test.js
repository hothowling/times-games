import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTrafficSound, trafficScene, PASS_BY_URL } from '../public/games/crossing/sound.js';
import { createRun, rowKind } from '../public/games/crossing/rules.js';

const settle = () => new Promise((resolve) => setImmediate(resolve));
function parameter(value = 0) {
  return {
    value, events: [],
    setValueAtTime(v, t) { this.value = v; this.events.push(['set', v, t]); },
    linearRampToValueAtTime(v, t) { this.value = v; this.events.push(['ramp', v, t]); },
    setTargetAtTime(v, t, tau) { this.value = v; this.events.push(['target', v, t, tau]); }
  };
}
function fakeContext() {
  const c = {
    state: 'running', sampleRate: 1000, currentTime: 0, destination: {}, sources: [], gains: [], panners: [],
    createBuffer(channels, frames) { return { duration: frames / this.sampleRate, getChannelData: () => new Float32Array(frames) }; },
    decodeAudioData: async () => ({ duration: 2.04 }),
    createBufferSource() {
      const source = { ...node(), playbackRate: parameter(1), start() { this.started = true; }, stop() { this.stopped = true; } };
      this.sources.push(source); return source;
    },
    createGain() { const gain = { ...node(), gain: parameter(1) }; this.gains.push(gain); return gain; },
    createBiquadFilter: () => ({ ...node(), frequency: parameter() }),
    createStereoPanner() { const pan = { ...node(), pan: parameter() }; this.panners.push(pan); return pan; }
  };
  return c;
}
function node() {
  return { connect(to) { this.output = to; }, disconnect() { this.disconnected = true; this.output = null; } };
}
function fixture(fetchAudio) {
  const f = { c: fakeContext(), enabled: true, speaking: false, contextCalls: 0, requests: [] };
  f.sound = createTrafficSound({
    context() { f.contextCalls++; return f.c; },
    getSound: () => f.enabled, isSpeaking: () => f.speaking
  }, { fetchAudio: async (...args) => {
    f.requests.push(args);
    return fetchAudio ? fetchAudio(...args) : { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
  } });
  return f;
}
const scene = (delta = -2, extra = {}) => ({
  active: true, player: { col: 3, row: 1 }, thinking: false, slow: false,
  cars: [{ id: '1:0', col: 3 + delta, row: 1, speed: 1.5, direction: 1 }], ...extra
});

test('traffic audio stays dormant before play or when sound is disabled', async () => {
  const f = fixture();
  f.sound.update(scene(-2, { active: false }));
  f.enabled = false; f.sound.update(scene());
  assert.equal(f.contextCalls, 0);
  assert.equal(f.requests.length, 0);
  f.enabled = true; f.sound.update(scene()); await settle();
  assert.equal(f.c.sources.length, 1);
  assert.equal(f.c.sources[0].loop, true);
  assert.equal(f.requests[0][0], PASS_BY_URL);
  f.sound.destroy();
});

test('nearby passes follow travel direction and never repeat for a lingering car', async () => {
  const f = fixture();
  f.sound.update(scene()); await settle();
  f.sound.update(scene(-1.2));
  assert.equal(f.c.sources.length, 2);
  assert.deepEqual(f.c.panners[0].pan.events.map((e) => e.slice(0, 2)), [['set', -0.7], ['ramp', 0.7]]);
  f.c.currentTime = 3;
  for (const delta of [-1, -0.5, 0, 0.5, 1]) f.sound.update(scene(delta));
  assert.equal(f.c.sources.length, 2);
  f.sound.update(scene(2, { cars: [{ id: '1:1', col: 5, row: 1, speed: 2, direction: -1 }] }));
  f.sound.update(scene(1, { cars: [{ id: '1:1', col: 4, row: 1, speed: 2, direction: -1 }] }));
  assert.equal(f.c.sources.length, 3);
  assert.deepEqual(f.c.panners[1].pan.events.map((e) => e.slice(0, 2)), [['set', 0.7], ['ramp', -0.7]]);
  f.sound.destroy();
});

test('busy lanes obey a global cooldown and wrapping cars do not produce phantom passes', async () => {
  const f = fixture();
  f.sound.update(scene()); await settle();
  f.sound.update(scene(-1));
  f.c.currentTime = 0.2;
  f.sound.update(scene(-2)); f.sound.update(scene(-1));
  assert.equal(f.c.sources.length, 2, 'a second entry during cooldown stays quiet');
  f.c.currentTime = 3;
  f.sound.update(scene(8)); f.sound.update(scene(-1));
  assert.equal(f.c.sources.length, 2, 'screen wrapping is not a nearby approach');
  f.sound.destroy();
});

test('thinking, foreground effects and speech duck traffic; slow traffic lowers playback rate', async () => {
  const f = fixture();
  f.sound.update(scene()); await settle();
  const master = f.c.gains[0];
  assert.equal(master.gain.value, 1);
  f.sound.update(scene(-2, { thinking: true })); assert.equal(master.gain.value, 0.25);
  f.sound.update(scene()); f.sound.duck(); assert.equal(master.gain.value, 0.25);
  f.c.currentTime = 0.5; f.sound.update(scene()); assert.equal(master.gain.value, 0.25);
  f.c.currentTime = 1; f.sound.update(scene()); assert.equal(master.gain.value, 1);
  f.speaking = true; f.sound.update(scene()); assert.equal(master.gain.value, 0.25);
  f.speaking = false; f.sound.update(scene(-1, { slow: true }));
  assert.equal(f.c.sources[0].playbackRate.value, 0.8);
  assert.ok(f.c.sources[1].playbackRate.value < 1);
  f.sound.destroy();
});

test('mute, pause and destroy immediately stop all owned sources and leave the shared context alone', async () => {
  const f = fixture();
  f.sound.update(scene()); await settle(); f.sound.update(scene(-1));
  f.enabled = false; const calls = f.contextCalls;
  f.sound.update(scene(-0.5));
  assert.equal(f.contextCalls, calls);
  assert.ok(f.c.sources.every((s) => s.stopped && s.disconnected));
  assert.ok(f.c.gains[0].disconnected);
  f.enabled = true; f.sound.update(scene(-0.5));
  assert.equal(f.c.sources.length, 3, 'unmute starts ambience without replaying an old pass');
  f.sound.update(scene(-0.4, { active: false }));
  assert.ok(f.c.sources.every((s) => s.stopped));
  f.sound.update(scene(-0.3)); f.sound.destroy(); f.sound.update(scene());
  assert.equal(f.c.sources.length, 4);
  assert.ok(f.c.sources.every((s) => s.stopped));
  assert.equal(f.c.state, 'running');
});

test('a late asset load cannot restart audio after pause or after leaving', async () => {
  for (const leave of [false, true]) {
    let release;
    const f = fixture(() => new Promise((resolve) => { release = resolve; }));
    f.sound.update(scene());
    const signal = f.requests[0][1].signal;
    if (leave) f.sound.destroy(); else f.sound.stop();
    release({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }); await settle();
    assert.equal(f.c.sources.length, 1);
    assert.equal(f.c.sources[0].stopped, true);
    assert.equal(signal.aborted, leave);
    f.sound.destroy();
  }
});

test('a failed optional download keeps the ambience running without retrying every frame', async () => {
  const f = fixture(async () => { throw Error('offline'); });
  f.sound.update(scene()); await settle();
  for (let i = 0; i < 10; i++) f.sound.update(scene(-1));
  assert.equal(f.requests.length, 1);
  assert.equal(f.c.sources.length, 1);
  assert.equal(f.c.sources[0].stopped, undefined);
  f.sound.destroy();
});

test('interrupted or replaced shared contexts do not leave stale sources or cached buffers', async () => {
  const f = fixture();
  f.sound.update(scene()); await settle();
  const old = f.c;
  old.state = 'interrupted'; f.sound.update(scene(-1));
  assert.ok(old.sources.every((s) => s.stopped));
  old.state = 'running'; f.sound.update(scene());
  assert.equal(old.sources.length, 2);
  f.c = fakeContext(); f.sound.update(scene()); await settle();
  assert.ok(old.sources.every((s) => s.stopped));
  assert.equal(old.state, 'running');
  assert.equal(f.requests.length, 2);
  assert.equal(f.c.sources.length, 1);
  f.sound.destroy();
});

test('audio proximity follows the real hopped player and traffic clock, excluding distant lanes', () => {
  const run = createRun(() => 0.4);
  run.player.row = 3; run.trafficTime = 8; run.t = 4; run.slowUntil = 8;
  const before = trafficScene(run);
  assert.equal(before.thinking, true);
  assert.equal(before.slow, true);
  assert.ok(before.cars.every((c) => Math.abs(c.row - before.player.row) <= 1.25 && ['road', 'crosswalk'].includes(rowKind(c.row))));
  run.hop = { from: { col: 3, row: 3 }, to: { col: 3, row: 4 }, elapsed: 0.09 };
  const hopped = trafficScene(run);
  assert.equal(hopped.player.row, 3.5);
  assert.ok(hopped.cars.every((c) => Math.abs(c.row - 3.5) <= 1.25));
  assert.ok(hopped.cars.every((c) => c.row === 4), 'the road behind drops out as the player hops forward');
  run.hop = null;
  run.trafficTime = 8.5;
  assert.notDeepEqual(trafficScene(run).cars.map((c) => c.col), before.cars.map((c) => c.col));
  run.questions[0].unlocked = true;
  assert.equal(trafficScene(run).thinking, false);
});
