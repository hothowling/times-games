import { test } from 'node:test';
import assert from 'node:assert/strict';

let fixtureId = 0;
async function fixture(run, { speech = false, deferred = false, onSpeak } = {}) {
  const requests = [], sources = [];
  let release;
  class Context {
    state = 'suspended';
    currentTime = 0;
    destination = {};
    resume() { this.state = 'running'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 5 }); }
    createBufferSource() {
      const source = {
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
    speak(u) { if (onSpeak) onSpeak(u); else u.onerror({ error: 'synthesis-failed' }); }
  };
  const values = {
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
    await run({ audio, requests, sources, release: () => release() });
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
