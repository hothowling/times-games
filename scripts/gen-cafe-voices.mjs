#!/usr/bin/env node
/*
 * Pre-record every café order with the project's local MeloTTS English/EN-US model.
 * Start it with: HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 .local/melotts/run.sh ui
 *   node scripts/gen-cafe-voices.mjs [--force] [--speed=1.0]
 * MELOTTS_URL defaults to http://127.0.0.1:7860. No system-voice fallback.
 */
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir, rename, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MENU } from '../public/games/cafe/rules.js';
import { TOPPINGS, orderText, voiceFor } from '../public/games/cafe/voices.js';

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, '').split('=');
  return [key, value.length ? value.join('=') : true];
}));
const speed = Number(args.speed || 1.0);
if (!Number.isFinite(speed) || speed < 0.5 || speed > 1.5) throw new Error('Speed must be between 0.5 and 1.5');
const server = (process.env.MELOTTS_URL || 'http://127.0.0.1:7860').replace(/\/$/, '');
const previewDir = join(root, 'data/melotts-preview');
const manifestPath = join(root, 'public/assets/voice/cafe/manifest.json');
const tmp = await mkdtemp(join(tmpdir(), 'cafe-voices-'));
const clips = [];

function trimmedWave(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Expected WAV');
  let format, pcm;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const tag = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    if (tag === 'fmt ') format = { kind: bytes.readUInt16LE(offset + 8), channels: bytes.readUInt16LE(offset + 10), rate: bytes.readUInt32LE(offset + 12), bits: bytes.readUInt16LE(offset + 22) };
    if (tag === 'data') pcm = bytes.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + (size & 1);
  }
  if (!format || !pcm || format.kind !== 1 || format.bits !== 16) throw new Error('Expected 16-bit PCM');
  const frame = format.channels * 2, frames = Math.floor(pcm.length / frame);
  const windowSize = Math.round(format.rate * .01), levels = [];
  for (let i = 0; i < frames; i += windowSize) {
    let sum = 0, count = 0;
    for (let j = i; j < Math.min(frames, i + windowSize); j++, count++) {
      const v = pcm.readInt16LE(j * frame) / 32768; sum += v * v;
    }
    levels.push(Math.sqrt(sum / count));
  }
  const peak = Math.max(...levels);
  if (peak < .003) throw new Error('Silent speech');
  const threshold = peak * .03, first = levels.findIndex((r) => r > threshold);
  let last = levels.length - 1;
  while (levels[last] <= threshold) last--;
  const pad = Math.round(format.rate * .08);
  const start = Math.max(0, first * windowSize - pad), end = Math.min(frames, (last + 1) * windowSize + pad);
  pcm = pcm.subarray(start * frame, end * frame);
  const duration = (end - start) / format.rate;
  if (duration < 1 || duration > 15) throw new Error(`Unexpected speech duration: ${duration}s`);
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(format.channels, 22); header.writeUInt32LE(format.rate, 24);
  header.writeUInt32LE(format.rate * frame, 28); header.writeUInt16LE(frame, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  return { bytes: Buffer.concat([header, pcm]), duration };
}

try {
  const old = await readFile(manifestPath, 'utf8').then(JSON.parse, () => null);
  for (const order of MENU) for (const topping of TOPPINGS) {
    const output = join(root, 'public', voiceFor(order, topping));
    if (!args.force && old?.engine === 'MeloTTS' && old.speed === speed && await stat(output).then(() => true, () => false)) continue;
    const text = orderText(order, topping);
    const response = await fetch(`${server}/run/predict`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fn_index: 1, data: [text, 'en', speed] }), signal: AbortSignal.timeout(120000)
    });
    if (!response.ok) throw new Error(`MeloTTS HTTP ${response.status}`);
    const result = await response.json(), source = result.data?.[0]?.name;
    if (!source) throw new Error(`MeloTTS did not return audio: ${JSON.stringify(result).slice(0, 200)}`);
    let wave;
    try { wave = trimmedWave(await readFile(source)); }
    finally {
      if (resolve(source).startsWith(previewDir + sep)) {
        await rm(source, { force: true }); await rmdir(dirname(source)).catch(() => {});
      }
    }
    const input = join(tmp, 'order.wav'), staged = join(tmp, basename(output));
    await writeFile(input, wave.bytes);
    await run('/usr/bin/afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', input, staged]);
    clips.push({ output, staged, text, seconds: Number(wave.duration.toFixed(3)) });
    console.log(`${clips.length}/48: ${order.id}-${topping} — ${wave.duration.toFixed(2)}s`);
  }
  // Keep the current assets until every requested replacement has been generated successfully.
  for (const clip of clips) {
    await mkdir(dirname(clip.output), { recursive: true }); await rename(clip.staged, clip.output);
  }
  if (clips.length) await writeFile(manifestPath, JSON.stringify({
    engine: 'MeloTTS', language: 'EN', speaker: 'EN-US', speed, codec: 'AAC', bitrate: 48000,
    clips: [...(old?.clips || []).filter((c) => !clips.some((n) => basename(n.output) === c.file)), ...clips.map((c) => ({ file: basename(c.output), text: c.text, seconds: c.seconds }))]
  }, null, 2) + '\n');
  console.log(`Replaced ${clips.length} café recordings with MeloTTS.`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
