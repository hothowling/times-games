/*
 * audio.js - 효과음(WebAudio)과 숫자 읽어주기(녹음 파일)를 담당합니다.
 * 효과음은 오실레이터로 만들고, 읽어주기는 assets/voice/<lang>/NN.ogg 녹음 파일을 이어 붙여 재생합니다.
 * 게임마다 다른 효과음은 audio.context() / audio.tone() 으로 같은 AudioContext 위에 만듭니다
 * (iOS 는 AudioContext 개수가 제한되어 하나만 씁니다). 원본: times-table-game/js/audio.js
 */
  const global = globalThis;

  var ctx = null;
  var soundOn = true;
  var ttsOn = true;
  var speaking = false;
  var speakToken = 0;

  function ensureCtx() {
    if (ctx) return ctx;
    var Ctor = global.AudioContext || global.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  /* 하나의 음을 냅니다. at 은 지금부터 몇 초 뒤에 시작할지입니다. */
  function tone(opts) {
    var c = ensureCtx();
    if (!c || !soundOn) return;
    var now = c.currentTime + (opts.at || 0);
    var dur = opts.dur || 0.12;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq, now);
    if (opts.to && opts.to !== opts.freq) {
      osc.frequency.linearRampToValueAtTime(opts.to, now + dur);
    }
    var peak = (opts.gain === undefined) ? 0.18 : opts.gain;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function resume() {
    var c = ensureCtx();
    if (c && c.state === 'suspended' && c.resume) {
      try { c.resume(); } catch (e) { /* 무시 */ }
    }
  }

  /*
   * 첫 사용자 탭에서 호출합니다.
   * iOS 는 사용자 탭 안에서 컨텍스트를 깨우고 소리를 한 번 내야 이후 재생이 풀립니다.
   * 그래서 1샘플짜리 무음 버퍼를 한 번 재생합니다.
   */
  function unlock() {
    resume();
    var c = ensureCtx();
    if (!c) return;
    try {
      var buf = c.createBuffer(1, 1, c.sampleRate || 22050);
      var src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(0);
    } catch (e) { /* 무시 */ }
  }

  /* 효과음 길이(초). 읽어주기가 효과음과 겹치지 않도록 ui.js 가 이 값을 보고 늦춰 시작합니다. */
  var FX_CORRECT_SEC = 0.26;
  var FX_TIMEOUT_SEC = 0.45;

  /* 정답: 짧게 올라가는 두 음 */
  function correct() {
    tone({ freq: 784, dur: 0.11, type: 'triangle' });
    tone({ freq: 1175, dur: 0.16, type: 'triangle', at: 0.1 });
  }

  /* 오답: 낮게 웅 하는 버즈 */
  function wrong() {
    tone({ freq: 160, to: 120, dur: 0.2, type: 'sawtooth', gain: 0.12 });
  }

  /* 시간 초과: 내려가는 음 */
  function timeout() {
    tone({ freq: 620, to: 220, dur: 0.45, type: 'sine', gain: 0.16 });
  }

  /* 라운드 클리어: 네 음 팡파레 */
  function fanfare() {
    var notes = [523, 659, 784, 1047];
    for (var i = 0; i < notes.length; i++) {
      tone({ freq: notes[i], dur: 0.18, type: 'triangle', at: i * 0.13 });
    }
  }

  /* 별 획득: 반짝이는 고음 */
  function starPop() {
    tone({ freq: 1568, dur: 0.09, type: 'sine', gain: 0.12 });
    tone({ freq: 2093, dur: 0.12, type: 'sine', gain: 0.1, at: 0.07 });
  }

  /* 다음 문제로 넘어갈 때: 위로 올라가는 짧은 '뾰롱' */
  function nextFx() {
    tone({ freq: 660, to: 1320, dur: 0.14, type: 'sine', gain: 0.12 });
    tone({ freq: 1320, dur: 0.12, type: 'triangle', gain: 0.08, at: 0.11 });
  }

  function keyTap() {
    tone({ freq: 520, dur: 0.05, type: 'square', gain: 0.07 });
  }

  /* ---------- 숫자 읽어주기(녹음 파일) ---------- */

  /*
   * 녹음 파일은 1~9 × 1~9 의 서로 다른 곱 36개뿐입니다(인수 1~9 도 01~09 로 들어 있습니다).
   * "곱하기 / 은" 같은 연결 말은 없으므로 문제는 [a, b], 정답은 [답] 으로 숫자만 읽습니다.
   */
  var VOICE_NUMBERS = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27,
    28, 30, 32, 35, 36, 40, 42, 45, 48, 49, 54, 56, 63, 64, 72, 81
  ];
  var VOICE_LANGS = { en: 'en', ko: 'ko' };
  var VOICE_DIR = 'assets/voice/';

  var TRIM_THRESHOLD = 0.02;  /* 이 크기보다 작은 샘플은 무음으로 봅니다 */
  var TRIM_PAD_SEC = 0.03;    /* 잘라 낸 앞뒤에 남겨 둘 여유 */
  var CLIP_GAP_SEC = 0.12;    /* 숫자와 숫자 사이 쉬는 시간 */
  var DEFAULT_RATE = 1.1;
  var START_LEAD_SEC = 0.02;  /* 예약 재생이 늦지 않게 두는 작은 여유 */
  var SAFETY_MS = 600;        /* onended 가 오지 않을 때(컨텍스트 멈춤 등) 대비한 여유 */

  /* clips[lang][n] = { buffer, offset, duration } 또는 { el: HTMLAudioElement } */
  var clips = { en: {}, ko: {} };
  var pending = { en: {}, ko: {} };   /* 불러오는 중인 클립(중복 요청 방지) */
  var preloaded = { en: false, ko: false };
  var decodeWarned = false;

  var activeSources = [];
  var activeEls = [];
  var safetyTimer = null;
  var gapTimer = null;

  var hasAudioEl = typeof global.Audio === 'function';
  var hasCtxCtor = !!(global.AudioContext || global.webkitAudioContext);

  function log(msg, err) {
    if (global.console && global.console.log) global.console.log('[tt] ' + msg, err || '');
  }

  function voiceLang(lang) {
    return VOICE_LANGS[lang] || (String(lang || '').toLowerCase().indexOf('en') === 0 ? 'en' : 'ko');
  }

  function clipUrl(lang, n) {
    return VOICE_DIR + lang + '/' + (n < 10 ? '0' + n : String(n)) + '.ogg';
  }

  /*
   * 버퍼 앞뒤의 무음을 찾아 재생할 구간을 돌려줍니다.
   * 첫 채널에서 threshold 를 넘는 첫/마지막 샘플을 찾고 앞뒤로 pad 만큼 여유를 둡니다.
   * 소리가 전혀 없으면 버퍼 전체를 씁니다.
   */
  function trimBounds(buffer, threshold, pad) {
    var thr = (threshold === undefined) ? TRIM_THRESHOLD : threshold;
    var padSec = (pad === undefined) ? TRIM_PAD_SEC : pad;
    var total = buffer.duration || (buffer.length / buffer.sampleRate);
    var data;
    try {
      data = buffer.getChannelData(0);
    } catch (e) {
      data = null;
    }
    if (!data || !data.length) return { offset: 0, duration: total };
    var first = -1;
    var lastIdx = -1;
    var i;
    for (i = 0; i < data.length; i++) {
      if (data[i] > thr || data[i] < -thr) { first = i; break; }
    }
    if (first < 0) return { offset: 0, duration: total };
    for (i = data.length - 1; i >= first; i--) {
      if (data[i] > thr || data[i] < -thr) { lastIdx = i; break; }
    }
    var sr = buffer.sampleRate;
    var start = Math.max(0, first / sr - padSec);
    var end = Math.min(total, (lastIdx + 1) / sr + padSec);
    if (end <= start) return { offset: 0, duration: total };
    return { offset: start, duration: end - start };
  }

  /* decodeAudioData 는 콜백형(옛 Safari)과 Promise 형이 있어 둘 다 받아 한 번만 결과를 넘깁니다. */
  function decode(c, data, ok, fail) {
    var settled = false;
    function good(buf) {
      if (settled) return;
      settled = true;
      if (buf) ok(buf); else fail(new Error('empty buffer'));
    }
    function bad(err) {
      if (settled) return;
      settled = true;
      fail(err);
    }
    try {
      var p = c.decodeAudioData(data, good, bad);
      if (p && typeof p.then === 'function') p.then(good, bad);
    } catch (e) {
      bad(e);
    }
  }

  function fetchWithXhr(url, ok, fail) {
    if (typeof global.XMLHttpRequest !== 'function') {
      fail(new Error('no XMLHttpRequest'));
      return;
    }
    try {
      var xhr = new global.XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function () {
        /* file:// 에서는 status 가 0 이어도 내용이 들어오는 경우가 있습니다. */
        var okStatus = (xhr.status >= 200 && xhr.status < 300) || (xhr.status === 0 && xhr.response);
        if (okStatus && xhr.response && xhr.response.byteLength) ok(xhr.response);
        else fail(new Error('xhr status ' + xhr.status));
      };
      xhr.onerror = function () { fail(new Error('xhr error')); };
      xhr.send();
    } catch (e) {
      fail(e);
    }
  }

  /* fetch 가 있으면 fetch, 실패하면(file:// 등) XMLHttpRequest 로 다시 시도합니다. */
  function loadBytes(url, ok, fail) {
    if (typeof global.fetch !== 'function') {
      fetchWithXhr(url, ok, fail);
      return;
    }
    var p;
    try {
      p = global.fetch(url);
    } catch (e) {
      fetchWithXhr(url, ok, fail);
      return;
    }
    p.then(function (res) {
      if (!res || !res.ok) throw new Error('http ' + (res ? res.status : '?'));
      return res.arrayBuffer();
    }).then(ok, function () {
      fetchWithXhr(url, ok, fail);
    });
  }

  /* 파일을 받을 수 없을 때의 마지막 방법: 클립마다 audio 요소를 하나씩 둡니다(무음 잘라 내기는 못 합니다). */
  function useElement(lang, n, url) {
    if (!hasAudioEl) return false;
    try {
      var a = new global.Audio();
      a.preload = 'auto';
      a.src = url;
      var entry = { el: a };
      a.addEventListener('error', function () {
        if (clips[lang][n] === entry) delete clips[lang][n];
        log('음성 파일을 열 수 없음 ' + url);
      });
      clips[lang][n] = entry;
      return true;
    } catch (e) {
      return false;
    }
  }

  function noteDecodeFailures(lang, done, ok) {
    if (done < VOICE_NUMBERS.length || ok > 0 || decodeWarned) return;
    decodeWarned = true;
    if (global.console && global.console.warn) {
      global.console.warn('[tt] 이 브라우저는 Ogg Opus 음성 파일을 재생하지 못해 읽어주기 없이 진행합니다 (' + lang + ')');
    }
  }

  /*
   * 한 언어의 36개 클립을 모두 받아 디코딩해 둡니다.
   * 이미 받았거나 받는 중인 클립은 다시 요청하지 않습니다. 실패한 클립은 기록만 하고 건너뜁니다.
   */
  function preloadVoices(lang) {
    var L = voiceLang(lang);
    if (preloaded[L]) return;
    preloaded[L] = true;
    var c = hasCtxCtor ? ensureCtx() : null;
    var settled = 0;
    var decoded = 0;
    var decodeTried = 0;

    function settle(isDecoded, triedDecode) {
      settled++;
      if (isDecoded) decoded++;
      if (triedDecode) decodeTried++;
      if (decodeTried > 0) noteDecodeFailures(L, settled, decoded);
    }

    VOICE_NUMBERS.forEach(function (n) {
      if (clips[L][n] || pending[L][n]) {
        settle(!!clips[L][n], false);
        return;
      }
      var url = clipUrl(L, n);
      if (!c) {
        useElement(L, n, url);
        settle(false, false);
        return;
      }
      pending[L][n] = true;
      loadBytes(url, function (bytes) {
        decode(c, bytes, function (buf) {
          var b = trimBounds(buf);
          clips[L][n] = { buffer: buf, offset: b.offset, duration: b.duration };
          delete pending[L][n];
          settle(true, true);
        }, function (err) {
          delete pending[L][n];
          log('음성 디코딩 실패 ' + url, err);
          settle(false, true);
        });
      }, function (err) {
        delete pending[L][n];
        log('음성 파일 읽기 실패, audio 요소로 대신합니다 ' + url, err);
        useElement(L, n, url);
        settle(false, false);
      });
    });
  }

  function clearSafety() {
    if (safetyTimer !== null) {
      global.clearTimeout(safetyTimer);
      safetyTimer = null;
    }
    if (gapTimer !== null) {
      global.clearTimeout(gapTimer);
      gapTimer = null;
    }
  }

  /* 예약해 둔 재생을 모두 멈춥니다. 멈춘 재생의 onend 콜백은 더 이상 부르지 않습니다. */
  function cancelSpeech() {
    speakToken++;
    clearSafety();
    speaking = false;
    var list = activeSources;
    activeSources = [];
    for (var i = 0; i < list.length; i++) {
      list[i].onended = null;
      try { list[i].stop(0); } catch (e) { /* 이미 끝난 소스 */ }
      try { list[i].disconnect(); } catch (e2) { /* 무시 */ }
    }
    var els = activeEls;
    activeEls = [];
    for (var j = 0; j < els.length; j++) {
      els[j].onended = null;
      els[j].onerror = null;
      try { els[j].pause(); } catch (e3) { /* 무시 */ }
    }
  }

  /* 모든 클립이 디코딩된 버퍼일 때: WebAudio 로 한 번에 이어 붙여 예약합니다. */
  function scheduleBuffers(c, items, rate, delay, finish) {
    var when = c.currentTime + START_LEAD_SEC + delay;
    var first = when;
    var last = null;
    for (var i = 0; i < items.length; i++) {
      var clip = items[i];
      var src = c.createBufferSource();
      src.buffer = clip.buffer;
      if (src.playbackRate) src.playbackRate.value = rate;
      src.connect(c.destination);
      src.start(when, clip.offset, clip.duration);
      activeSources.push(src);
      last = src;
      when += clip.duration / rate;
      if (i < items.length - 1) when += CLIP_GAP_SEC;
    }
    last.onended = finish;
    /* 컨텍스트가 멈춰 onended 가 오지 않아도 뒷 동작(듣기 시작 등)이 멈추지 않게 합니다. */
    safetyTimer = global.setTimeout(finish, Math.round((when - first + delay) * 1000) + SAFETY_MS);
  }

  /* audio 요소가 섞여 있을 때: 하나씩 차례로 재생합니다. */
  function playSequential(c, items, rate, delay, myToken, finish) {
    var index = 0;
    function next() {
      gapTimer = null;
      if (myToken !== speakToken) return;
      if (index >= items.length) {
        finish();
        return;
      }
      var clip = items[index++];
      var afterOne = function () {
        if (myToken !== speakToken) return;
        gapTimer = global.setTimeout(next, index < items.length ? Math.round(CLIP_GAP_SEC * 1000) : 0);
      };
      if (clip.buffer && c) {
        try {
          var src = c.createBufferSource();
          src.buffer = clip.buffer;
          if (src.playbackRate) src.playbackRate.value = rate;
          src.connect(c.destination);
          src.onended = afterOne;
          src.start(c.currentTime + START_LEAD_SEC, clip.offset, clip.duration);
          activeSources.push(src);
        } catch (e) {
          afterOne();
        }
        return;
      }
      var a = clip.el;
      a.onended = afterOne;
      a.onerror = afterOne;
      activeEls.push(a);
      try {
        a.currentTime = 0;
        a.playbackRate = rate;
        var p = a.play();
        if (p && typeof p.then === 'function') p.then(null, afterOne);
      } catch (e2) {
        afterOne();
      }
    }
    gapTimer = global.setTimeout(next, Math.round(delay * 1000));
    /* 클립 하나에 넉넉히 2초씩 잡은 안전 타이머 */
    safetyTimer = global.setTimeout(finish, Math.round(delay * 1000) + items.length * 2000 + SAFETY_MS);
  }

  /*
   * playNumbers(lang, numbers, opts)
   * opts = { rate: 1.1, delay: 초, force, onend: function }
   * numbers 의 숫자 클립을 차례로 이어서 재생합니다. 없는 클립은 건너뜁니다.
   * onend 는 끝났을 때 비동기로 딱 한 번 부릅니다. 읽어주기가 꺼져 있거나, 지원되지 않거나,
   * 재생할 클립이 하나도 없으면 곧바로(비동기) 부릅니다. 다른 재생으로 바뀌며 취소되면 부르지 않습니다.
   */
  function playNumbers(lang, numbers, options) {
    var opts = options || {};
    var done = typeof opts.onend === 'function' ? opts.onend : null;
    cancelSpeech();
    var myToken = speakToken;
    var finished = false;
    var finish = function () {
      if (finished || myToken !== speakToken) return;
      finished = true;
      clearSafety();
      speaking = false;
      activeSources = [];
      activeEls = [];
      if (done) done();
    };
    var skip = function () {
      global.setTimeout(finish, 0);
      return false;
    };
    /* 플랫폼의 '소리'는 전체 스위치라 꺼져 있으면 읽어주기도 하지 않습니다. */
    if (!soundOn || (!ttsOn && !opts.force) || !numbers || !numbers.length) return skip();
    var L = voiceLang(lang);
    var items = [];
    var allBuffers = true;
    for (var i = 0; i < numbers.length; i++) {
      var clip = clips[L][Number(numbers[i])];
      if (!clip) continue;
      if (!clip.buffer) allBuffers = false;
      items.push(clip);
    }
    if (!items.length) return skip();
    var c = ctx;
    if (allBuffers && !c) return skip();
    if (c) resume();
    var rate = opts.rate || DEFAULT_RATE;
    var delay = Math.max(0, Number(opts.delay) || 0);
    speaking = true;
    try {
      if (allBuffers) scheduleBuffers(c, items, rate, delay, finish);
      else playSequential(c, items, rate, delay, myToken, finish);
    } catch (e) {
      log('음성 재생 실패', e);
      cancelSpeech();
      speaking = false;
      myToken = speakToken;
      return skip();
    }
    return true;
  }

  function hasVoice(lang, n) {
    return !!clips[voiceLang(lang)][Number(n)];
  }

  export const audio = {
    context: ensureCtx,
    tone: tone,
    unlock: unlock,
    resume: resume,
    voiceSupported: hasCtxCtor || hasAudioEl,
    setSound: function (on) { soundOn = !!on; if (on && ctx) resume(); }, /* 탭 전에는 컨텍스트를 만들지 않습니다 */
    getSound: function () { return soundOn; },
    setTts: function (on) { ttsOn = !!on; if (!on) cancelSpeech(); },
    getTts: function () { return ttsOn; },
    isSpeaking: function () { return speaking; },
    preloadVoices: preloadVoices,
    playNumbers: playNumbers,
    hasVoice: hasVoice,
    cancelSpeech: cancelSpeech,
    FX_CORRECT_SEC: FX_CORRECT_SEC,
    FX_TIMEOUT_SEC: FX_TIMEOUT_SEC,
    CLIP_GAP_SEC: CLIP_GAP_SEC,
    _trimBounds: trimBounds,
    correct: correct,
    wrong: wrong,
    timeout: timeout,
    fanfare: fanfare,
    starPop: starPop,
    nextFx: nextFx,
    keyTap: keyTap
  };
