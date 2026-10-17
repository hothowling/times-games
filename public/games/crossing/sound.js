import { carsForRow, playerPosition, questionForRow, rowKind } from './rules.js';

export const PASS_BY_URL = 'assets/games/crossing/audio/car-drive-by-whoosh.mp3';

/* Use the same positions as drawing/collision, including hops and slowed traffic. */
export function trafficScene(run, active = true) {
  const player = playerPosition(run), cars = [];
  for (let row = Math.max(0, Math.floor(player.row) - 1); row <= Math.ceil(player.row) + 1; row++) {
    if (Math.abs(row - player.row) > 1.25 || !['road', 'crosswalk'].includes(rowKind(row))) continue;
    carsForRow(row, run.trafficTime).forEach((car, index) => cars.push({ ...car, id: row + ':' + index }));
  }
  return {
    active, player, cars, slow: run.slowUntil > run.t,
    thinking: rowKind(run.player.row) === 'gate' && !questionForRow(run).unlocked
  };
}

/* This controller owns its nodes only; the platform owns the shared AudioContext. */
export function createTrafficSound(audio, { fetchAudio = (...args) => fetch(...args) } = {}) {
  let dead = false, context = null, master = null, ambience = null, clip = null, noise = null;
  let loading = null, request = null, clipRequested = false, previous = new Map(), nextPass = 0, duckUntil = 0;
  const voices = new Set();

  function release(voice) {
    voices.delete(voice);
    voice.source.onended = null;
    for (const node of voice.nodes) node.disconnect();
  }

  function stop() {
    previous.clear();
    if (master) { master.gain.value = 0; master.disconnect(); master = null; }
    for (const voice of [...voices]) {
      voice.source.stop();
      release(voice);
    }
    ambience = null;
    nextPass = 0;
  }

  function loadClip(c) {
    if (clipRequested || loading) return;
    clipRequested = true;
    const controller = request = new AbortController();
    loading = (async () => {
      try {
        const response = await fetchAudio(PASS_BY_URL, { signal: controller.signal });
        if (!response.ok) return;
        const buffer = await c.decodeAudioData(await response.arrayBuffer());
        // Finishing a request never starts playback. Only a live update may do so.
        if (!dead && context === c) clip = buffer;
      } catch { /* Ambient audio and gameplay still work if this optional file fails. */ }
      finally { if (request === controller) { loading = null; request = null; } }
    })();
  }

  function noiseBuffer(c) {
    const buffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 5719, value = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      value = (value + (seed / 2147483648 - 1) * 0.025) / 1.025;
      // A short taper makes the four-second loop join without a click.
      data[i] = value * 4 * Math.min(1, i / 512, (data.length - 1 - i) / 512);
    }
    return buffer;
  }

  function beginAmbience(c) {
    master = c.createGain();
    master.gain.setValueAtTime(0, c.currentTime);
    master.connect(c.destination);
    const source = c.createBufferSource(), high = c.createBiquadFilter(), low = c.createBiquadFilter(), gain = c.createGain();
    source.buffer = noise ||= noiseBuffer(c);
    source.loop = true;
    high.type = 'highpass'; high.frequency.value = 100;
    low.type = 'lowpass'; low.frequency.value = 650;
    gain.gain.value = 0.045;
    source.connect(high); high.connect(low); low.connect(gain); gain.connect(master);
    ambience = { source, low, nodes: [source, high, low, gain] };
    voices.add(ambience);
    source.start();
  }

  function passBy(car, scene) {
    const c = context, now = c.currentTime;
    const source = c.createBufferSource(), gain = c.createGain();
    const pan = c.createStereoPanner?.();
    const speed = Math.abs(car.speed) * (scene.slow ? 0.4 : 1);
    source.buffer = clip;
    source.playbackRate.value = Math.max(0.65, Math.min(1.25, 0.85 + speed * 0.12));
    const duration = clip.duration / source.playbackRate.value;
    const volume = (0.09 + Math.min(speed, 3) * 0.02) * (1 - Math.abs(car.row - scene.player.row) * 0.28);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.08);
    gain.gain.setValueAtTime(volume, now + Math.max(0.08, duration - 0.18));
    gain.gain.linearRampToValueAtTime(0, now + duration);
    source.connect(gain);
    if (pan) {
      pan.pan.setValueAtTime(-0.7 * car.direction, now);
      pan.pan.linearRampToValueAtTime(0.7 * car.direction, now + duration);
      gain.connect(pan); pan.connect(master);
    } else gain.connect(master);
    const voice = { source, nodes: [source, gain, ...(pan ? [pan] : [])] };
    voices.add(voice);
    source.onended = () => release(voice);
    source.start();
    nextPass = now + Math.max(1.1, duration * 0.8);
  }

  return {
    update(scene) {
      if (dead || !scene.active || !audio.getSound()) { stop(); return; }
      const c = audio.context();
      if (!c) { stop(); return; }
      if (context !== c) {
        stop(); request?.abort(); request = null; loading = null;
        context = c; clip = null; noise = null; clipRequested = false; duckUntil = 0;
      }
      // Do not queue sources against an interrupted mobile audio context.
      if (c.state !== 'running') { stop(); return; }
      loadClip(c);
      if (!ambience) beginAmbience(c);
      const quiet = scene.thinking || audio.isSpeaking?.() || c.currentTime < duckUntil;
      master.gain.setTargetAtTime(quiet ? 0.25 : 1, c.currentTime, 0.12);
      ambience.source.playbackRate.setTargetAtTime(scene.slow ? 0.8 : 1, c.currentTime, 0.15);
      ambience.low.frequency.setTargetAtTime(scene.slow ? 420 : 650, c.currentTime, 0.15);
      const next = new Map(), candidates = [];
      for (const car of scene.cars) {
        const delta = car.col - scene.player.col, before = previous.get(car.id);
        next.set(car.id, delta);
        // Entry into the nearby window, not repeated playback while a car stays there.
        if (before !== undefined && Math.abs(before) > 1.35 && Math.abs(delta) <= 1.35 &&
            Math.abs(delta - before) < 3 && delta * car.direction <= 0) candidates.push(car);
      }
      previous = next;
      candidates.sort((a, b) => Math.abs(a.row - scene.player.row) - Math.abs(b.row - scene.player.row));
      if (clip && candidates.length && c.currentTime >= nextPass && voices.size < 3) passBy(candidates[0], scene);
    },
    duck() {
      if (!context || !master) return;
      duckUntil = context.currentTime + 0.65;
      master.gain.setTargetAtTime(0.25, context.currentTime, 0.025);
    },
    stop,
    destroy() {
      dead = true;
      request?.abort();
      stop();
      clip = null; noise = null;
    }
  };
}
