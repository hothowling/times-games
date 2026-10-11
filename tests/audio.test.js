import { test } from 'node:test';
import assert from 'node:assert/strict';

let fixtureId = 0;
async function fixture(run, { speech = false, deferred = false, onSpeak, onResume } = {}) {
  const requests = [], sources = [], contexts = [], oscillators = [];
  const document = new EventTarget();
  document.hidden = false;
  const window = new EventTarget();
  let release;
  class Context {
    constructor() { contexts.push(this); }
    state = 'suspended';
    currentTime = 0;
    destination = {};
    resumeCalls = 0;
    resume() {
      this.resumeCalls++;
      if (onResume) return onResume(this);
      this.state = 'running';
      return Promise.resolve();
    }
    decodeAudioData() { return Promise.resolve({ duration: 5 }); }
    createBuffer() { return {}; }
    createOscillator() {
      const osc = {
        frequency: { setValueAtTime() {}, linearRampToValueAtTime() {} },
        connect() {}, start() { this.started = true; }, stop() {}
      };
      oscillators.push(osc);
      return osc;
    }
    createGain() {
      return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
    createBufferSource() {
      const source = {
        context: this,
        connect() {}, disconnect() {},
        start() { this.started = true; }, stop() { this.stopped = true; }
      };
      sources.push(source);
      return source;
    }
  }
  class Utterance { constructor(text) { this.text = text; } }
  const synth = {
    getVoices: () => [], cancel() {}, addEventListener() {},
    paused: false, resume() { this.paused = false; },
    speak(u) { if (onSpeak) onSpeak(u); else u.onerror({ error: 'synthesis-failed' }); }
  };
  const values = {
    document, window,
    AudioContext: Context, webkitAudioContext: undefined, Audio: undefined,
    speechSynthesis: speech ? synth : undefined,
    SpeechSynthesisUtterance: speech ? Utterance : undefined,
    fetch: async (url) => {
      requests.push(url);
      if (deferred) await new Promise((ok) => { release = ok; });
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
    }
  };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let audio;
  try {
    for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
    ({ audio } = await import(`../public/core/audio.js?fixture=${++fixtureId}`));
    await run({ audio, requests, sources, contexts, oscillators, document, window, synth, release: () => release() });
  } finally {
    audio?.stopSpeak(); audio?.cancelSpeech();
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
}

test('explicit recorded listening works without speech synthesis or automatic TTS', async () => {
  await fixture(async ({ audio, requests, sources }) => {
    audio.setTts(false);
    assert.equal(audio.speechSupported, false);
    assert.equal(await audio.speak('An order', 'en', { clip: 'order.m4a' }), false);
    assert.equal(requests.length, 0, 'automatic narration remains off');
    const playback = audio.speak('An order', 'en', { clip: 'order.m4a', force: true });
    await new Promise((ok) => setImmediate(ok));
    assert.deepEqual(requests, ['order.m4a']);
    assert.equal(sources.length, 1);
    assert.equal(sources[0].started, true);
    assert.equal(audio.context().state, 'running');
    sources[0].onended();
    assert.equal(await playback, true);
  });
});

test('explicit listening still respects the master sound switch', async () => {
  await fixture(async ({ audio, requests }) => {
    audio.setSound(false);
    assert.equal(await audio.speak('An order', 'en', { clip: 'order.m4a', force: true }), false);
    assert.equal(requests.length, 0);
  });
});

test('leaving while a recording loads cannot start stale audio afterward', async () => {
  await fixture(async ({ audio, sources, release }) => {
    const playback = audio.speak('Old order', 'en', { clip: 'slow.m4a', force: true });
    audio.stopSpeak();
    assert.equal(await playback, true, 'cancelled playback settles');
    release();
    await new Promise((ok) => setImmediate(ok));
    assert.equal(sources.length, 0);
  }, { deferred: true });
});

test('speech synthesis failure is reported instead of being treated as successful playback', async () => {
  await fixture(async ({ audio }) => {
    assert.equal(await audio.speak('An order', 'en'), false);
    audio.setTts(false);
    assert.equal(await audio.speak('An order', 'en', { force: true }), false);
  }, { speech: true });
});

test('a speech end event without a start event is not accepted as audible playback', async () => {
  await fixture(async ({ audio }) => {
    assert.equal(await audio.speak('An order', 'en'), false);
  }, { speech: true, onSpeak: (u) => u.onend() });
  await fixture(async ({ audio }) => {
    assert.equal(await audio.speak('An order', 'en'), true);
  }, { speech: true, onSpeak: (u) => { u.onstart(); u.onend(); } });
});

test('returning from a hidden page recovers suspended and interrupted audio without replacing it', async () => {
  await fixture(async ({ audio, contexts, document, window, synth }) => {
    for (const event of ['visibilitychange', 'pageshow', 'focus']) {
      const target = event === 'visibilitychange' ? document : window;
      target.dispatchEvent(new Event(event));
    }
    assert.equal(contexts.length, 0, 'screen events before first input do not create audio');
    const c = audio.context();
    for (const state of ['suspended', 'interrupted']) {
      for (const event of ['visibilitychange', 'pageshow', 'focus']) {
        c.state = state;
        synth.paused = true;
        document.hidden = true;
        const calls = c.resumeCalls;
        const target = event === 'visibilitychange' ? document : window;
        target.dispatchEvent(new Event(event));
        assert.equal(c.resumeCalls, calls, 'hidden pages do not try to restart audio');
        document.hidden = false;
        target.dispatchEvent(new Event(event));
        assert.equal(c.state, 'running', `${event} restores ${state} audio`);
        assert.equal(synth.paused, false);
      }
    }
    assert.deepEqual(contexts, [c], 'reuse the shared context after each interruption');
  }, { speech: true });
});

test('effects and games using the shared context recover even without a foreground event', async () => {
  await fixture(async ({ audio, contexts, oscillators }) => {
    const c = audio.context();
    c.state = 'interrupted';
    audio.correct();
    assert.equal(c.state, 'running');
    assert.equal(oscillators.length, 2);
    assert.ok(oscillators.every((osc) => osc.started));
    c.state = 'suspended';
    assert.equal(audio.context(), c);
    assert.equal(c.state, 'running');
    assert.deepEqual(contexts, [c]);
  });
});

test('touch and keyboard input can unlock audio again after repeated interruptions', async () => {
  await fixture(async ({ audio, contexts, sources, document }) => {
    document.dispatchEvent(new Event('pointerdown'));
    const c = contexts[0];
    assert.equal(c.state, 'running');
    assert.equal(sources.length, 1, 'first input plays the iOS silent unlock buffer');
    for (const event of ['pointerdown', 'touchend', 'keydown', 'pointerdown']) {
      c.state = 'interrupted';
      const count = sources.length;
      document.dispatchEvent(new Event(event));
      assert.equal(c.state, 'running');
      assert.equal(sources.length, count + 1, `${event} unlocks again`);
    }
    document.dispatchEvent(new Event('pointerdown'));
    assert.equal(sources.length, 5, 'ordinary input does not keep creating silent sources');
    assert.equal(audio.context(), c);
  });
});

test('rejected and pending automatic resumes still allow a later input to recover', async () => {
  for (const failure of ['reject', 'throw', 'pending']) {
    let blocked = false;
    await fixture(async ({ audio, document }) => {
      audio.unlock();
      const c = audio.context();
      c.state = 'interrupted';
      blocked = true;
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((ok) => setImmediate(ok));
      assert.equal(c.state, 'interrupted');
      const calls = c.resumeCalls;
      blocked = false;
      document.dispatchEvent(new Event('pointerdown'));
      assert.equal(c.state, 'running');
      assert.ok(c.resumeCalls > calls, 'a previous pending/rejected call does not block retry');
    }, { onResume: (c) => {
      if (blocked) {
        if (failure === 'throw') throw new Error('not allowed');
        if (failure === 'reject') return Promise.reject(new Error('not allowed'));
        return new Promise(() => {});
      }
      c.state = 'running';
      return Promise.resolve();
    } });
  }
});

test('automatic recovery and input respect the master sound switch', async () => {
  await fixture(async ({ audio, contexts, sources, document, window }) => {
    audio.setSound(false);
    document.dispatchEvent(new Event('pointerdown'));
    assert.equal(contexts.length, 0);
    audio.setSound(true);
    document.dispatchEvent(new Event('pointerdown'));
    const c = contexts[0];
    audio.setSound(false);
    c.state = 'interrupted';
    const calls = c.resumeCalls;
    const count = sources.length;
    for (const event of ['visibilitychange', 'pointerdown', 'touchend', 'keydown']) {
      document.dispatchEvent(new Event(event));
    }
    window.dispatchEvent(new Event('pageshow'));
    window.dispatchEvent(new Event('focus'));
    assert.equal(c.resumeCalls, calls);
    assert.equal(sources.length, count);
    audio.setSound(true);
    assert.equal(c.state, 'running');
  });
});

test('recorded words recover after interruption and reuse cached audio after a closed context', async () => {
  await fixture(async ({ audio, contexts, requests, sources }) => {
    const first = audio.speak('An order', 'en', { clip: 'order.m4a' });
    await new Promise((ok) => setImmediate(ok));
    const buffer = sources[0].buffer;
    sources[0].onended();
    assert.equal(await first, true);
    for (const state of ['interrupted', 'closed']) {
      contexts.at(-1).state = state;
      const playback = audio.speak('An order', 'en', { clip: 'order.m4a' });
      await new Promise((ok) => setImmediate(ok));
      const source = sources.at(-1);
      assert.equal(source.context, contexts.at(-1));
      assert.equal(source.context.state, 'running');
      assert.equal(source.buffer, buffer, 'keep the decoded clip cache');
      source.onended();
      assert.equal(await playback, true);
    }
    assert.equal(contexts.length, 2, 'only a closed context requires replacement');
    assert.deepEqual(requests, ['order.m4a']);
  });
});

test('a recording interrupted while loading resumes before scheduling playback', async () => {
  await fixture(async ({ audio, contexts, sources, release }) => {
    const playback = audio.speak('An order', 'en', { clip: 'slow.m4a' });
    contexts[0].state = 'interrupted';
    release();
    await new Promise((ok) => setImmediate(ok));
    assert.equal(contexts[0].state, 'running');
    assert.equal(sources[0].started, true);
    sources[0].onended();
    assert.equal(await playback, true);
  }, { deferred: true });
});

test('number narration recovers interrupted or closed audio and keeps completion callbacks', async () => {
  await fixture(async ({ audio, contexts, requests, sources }) => {
    audio.preloadVoices('ko');
    await new Promise((ok) => setImmediate(ok));
    for (const state of ['interrupted', 'closed']) {
      contexts.at(-1).state = state;
      let ended = 0;
      assert.equal(audio.playNumbers('ko', [2, 3], { onend: () => ended++ }), true);
      const source = sources.at(-1);
      assert.equal(source.context, contexts.at(-1));
      assert.equal(source.context.state, 'running');
      source.onended();
      assert.equal(ended, 1);
      audio.cancelSpeech();
      assert.equal(ended, 1);
    }
    assert.equal(contexts.length, 2);
    assert.equal(requests.length, 36, 'number buffers are not downloaded again');
  });
});
