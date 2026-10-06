#!/usr/bin/env node
/*
 * gen-capital-voices.mjs - 수도 맞히기 정답 문장("<나라>의 수도는 <수도>." / "The capital of <Country> is <Capital>.")
 * 음성을 로컬 MeloTTS(Gradio) 서버로 미리 만들어 둡니다. gen-word-voices.mjs 와 같은 방식(필요한 부분만 복사).
 *
 *   node scripts/gen-capital-voices.mjs                 # 없는 파일만 전부(en + ko)
 *   node scripts/gen-capital-voices.mjs --only=KR,US    # 특정 나라만(국가 코드)
 *   node scripts/gen-capital-voices.mjs --lang=ko       # 한 언어만
 *   node scripts/gen-capital-voices.mjs --speed=1.0     # 속도(기본 en 0.9, ko 1.0)
 *   node scripts/gen-capital-voices.mjs --force         # 이미 있어도 다시 만들기
 *   node scripts/gen-capital-voices.mjs --rebuild       # 만들지 않고 voices.js 만 다시 씀
 *   node scripts/gen-capital-voices.mjs --list          # 읽을 문장만 보여 주기
 *   MELOTTS_URL=http://127.0.0.1:7860 (기본값)
 *
 * 순서: MeloTTS → wav(서버가 data/melotts-preview/ 아래에 씀) → 앞뒤 무음 잘라 내기(60ms 여유)
 *       → macOS afconvert 로 AAC 32kbps .m4a → 이 스크립트가 만든 wav 지우기.
 *
 * 결과
 *   public/assets/voice/capitals/<en|ko>/<code 소문자>.m4a
 *   public/games/capitals/voices.js   VOICES = { en: [code...], ko: [code...] } (게임이 읽음, 자동 생성)
 */
import { readFile, writeFile, mkdir, stat, rm, rmdir, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { COUNTRIES } from '../public/games/capitals/rules.js';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public/assets/voice/capitals');
const VOICES_FILE = path.join(ROOT, 'public/games/capitals/voices.js');
const PREVIEW_DIR = path.join(ROOT, 'data/melotts-preview');
const SERVER = (process.env.MELOTTS_URL || 'http://127.0.0.1:7860').replace(/\/$/, '');
const LANGS = ['en', 'ko'];
const DEFAULT_SPEED = { en: 0.9, ko: 1.0 };
const PAD_SEC = 0.06;          /* 잘라 낸 앞뒤에 남기는 무음 */
const MIN_SEC = 1.0;           /* 문장 소리 구간이 이보다 짧거나 */
const MAX_SEC = 5.0;           /* 길면 한 번 다시 만들어 보고, 그래도 그러면 '확인 필요'로 적습니다 */

/*
 * 발음 고치기: 화면에 보이는 이름과 다르게 '읽을' 글자. 키는 `${lang}:${code}`, 값은 { name?, capital? }.
 * 화면 글자(rules.js)는 그대로 두고 소리만 바꿉니다. 들어 보고 꼭 필요한 것만 넣습니다.
 *   ko:US - 'D.C.' 를 한국어 모델이 글자 그대로 읽지 못해 '디씨'로 풀어 씁니다.
 * 영어에서 'the' 를 붙여 읽는 나라 이름은 THE 에 둡니다(The capital of the United States ...).
 */
const SAY = {
  'ko:US': { capital: '워싱턴 디씨' }
};
const THE = new Set(['US', 'GB', 'NL', 'PH', 'AE']);

const sentence = (c, lang) => {
  const o = SAY[`${lang}:${c.code}`] || {};
  const name = o.name || (lang === 'en' && THE.has(c.code) ? `the ${c.name.en}` : c.name[lang]);
  const cap = o.capital || c.capital[lang];
  const end = cap.endsWith('.') ? '' : '.';
  return lang === 'ko' ? `${name}의 수도는 ${cap}${end}` : `The capital of ${name} is ${cap}${end}`;
};

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const only = args.only ? new Set(String(args.only).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)) : null;
const langs = args.lang ? [String(args.lang)] : LANGS;
if (langs.some((l) => !LANGS.includes(l))) throw new Error(`--lang 은 en 또는 ko: ${args.lang}`);
const speedFor = (l) => (args.speed ? Number(args.speed) : DEFAULT_SPEED[l]);

const exists = (f) => stat(f).then(() => true, () => false);
const idOf = (c) => c.code.toLowerCase();
const fileOf = (l, c) => path.join(OUT_DIR, l, `${idOf(c)}.m4a`);

/* ---------- wav 읽기/쓰기(16비트 PCM) ---------- */

function parseWav(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') throw new Error('not a wav');
  let off = 12, fmt = null, data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('latin1', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(off + 8), channels: buf.readUInt16LE(off + 10), rate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    if (id === 'data') { data = buf.subarray(off + 8, Math.min(buf.length, off + 8 + size)); break; }
    off += 8 + size + (size & 1);
  }
  if (!fmt || !data || fmt.format !== 1 || fmt.bits !== 16) throw new Error('unsupported wav');
  return { ...fmt, data };
}

function wavBytes({ channels, rate }, pcm) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0, 'latin1'); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8, 'latin1');
  h.write('fmt ', 12, 'latin1'); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * channels * 2, 28); h.writeUInt16LE(channels * 2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36, 'latin1'); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/* 10ms 창의 RMS 로 소리 구간을 찾아(가장 큰 창의 3%) 앞뒤 PAD_SEC 를 남기고 잘라 냅니다. */
function trim(wav) {
  const frame = wav.channels * 2;
  const n = Math.floor(wav.data.length / frame);
  const win = Math.max(1, Math.round(wav.rate * 0.01));
  const rms = [];
  for (let i = 0; i < n; i += win) {
    let acc = 0, k = 0;
    for (let j = i; j < Math.min(n, i + win); j++, k++) {
      const v = wav.data.readInt16LE(j * frame) / 32768;
      acc += v * v;
    }
    rms.push(Math.sqrt(acc / k));
  }
  const peak = Math.max(...rms);
  if (!(peak > 0.003)) return { pcm: wav.data, voiced: 0, total: n / wav.rate };
  const thr = peak * 0.03;
  const first = rms.findIndex((r) => r > thr);
  let last = rms.length - 1;
  while (last > first && rms[last] <= thr) last--;
  const pad = Math.round(PAD_SEC * wav.rate);
  const s = Math.max(0, first * win - pad);
  const e = Math.min(n, (last + 1) * win + pad);
  return { pcm: wav.data.subarray(s * frame, e * frame), voiced: ((last + 1 - first) * win) / wav.rate, total: (e - s) / wav.rate };
}

/* ---------- MeloTTS ---------- */

async function synth(text, lang, speed) {
  const res = await fetch(`${SERVER}/run/predict`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fn_index: 1, data: [text, lang, speed] })
  });
  if (!res.ok) throw new Error(`http ${res.status}`);
  const j = await res.json();
  const file = j?.data?.[0]?.name;
  if (!file) throw new Error(`no file: ${JSON.stringify(j).slice(0, 200)}`);
  return file;
}

async function dropWav(file) {
  if (!path.resolve(file).startsWith(PREVIEW_DIR + path.sep)) return;
  await rm(file, { force: true });
  const dir = path.dirname(file);
  if (dir !== PREVIEW_DIR) await rmdir(dir).catch(() => {});
}

async function makeOne(c, lang, tmp) {
  const text = sentence(c, lang);
  const speed = speedFor(lang);
  let best = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const wavFile = await synth(text, lang, speed);
    let t;
    try {
      const wav = parseWav(await readFile(wavFile));
      t = { ...trim(wav), wav };
    } finally {
      await dropWav(wavFile);
    }
    best = t;
    if (t.voiced >= MIN_SEC && t.voiced <= MAX_SEC) break;
  }
  const out = fileOf(lang, c);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(tmp, wavBytes(best.wav, best.pcm));
  await run('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '32000', tmp, out]);
  await rm(tmp, { force: true });
  return { text, voiced: best.voiced, total: best.total, size: (await stat(out)).size, odd: best.voiced < MIN_SEC || best.voiced > MAX_SEC };
}

/* ---------- voices.js ---------- */

async function writeManifest() {
  const have = {};
  for (const l of LANGS) {
    const files = new Set(await readdir(path.join(OUT_DIR, l)).catch(() => []));
    have[l] = COUNTRIES.filter((c) => files.has(`${idOf(c)}.m4a`)).map(idOf);
  }
  const list = (ids) => ids.length ? `[\n${ids.map((id) => `    ${JSON.stringify(id)}`).join(',\n')}\n  ]` : '[]';
  const src = `/*
 * voices.js - 정답 문장 녹음이 있는 나라(자동 생성: scripts/gen-capital-voices.mjs). { en: [code], ko: [code] } (국가 코드 소문자)
 * 음성은 assets/voice/capitals/<en|ko>/<code>.m4a (MeloTTS). 여기 없는 나라는 브라우저 speechSynthesis 로 읽습니다.
 */
export const VOICES = {
  en: ${list(have.en)},
  ko: ${list(have.ko)}
};
`;
  await writeFile(VOICES_FILE, src);
  return have;
}

/* ---------- 실행 ---------- */

async function main() {
  const countries = only ? COUNTRIES.filter((c) => only.has(c.code)) : COUNTRIES;
  if (only) for (const code of only) if (!COUNTRIES.some((c) => c.code === code)) console.warn(`없는 국가 코드: ${code}`);
  if (args.list) {
    for (const l of langs) for (const c of countries) console.log(`${l} ${c.code} ${sentence(c, l)}`);
    return;
  }
  if (!args.rebuild) {
    const jobs = [];
    for (const l of langs) for (const c of countries) jobs.push([c, l]);
    const tmp = path.join(PREVIEW_DIR, `.gen-capital-voices-${process.pid}.wav`);
    await mkdir(PREVIEW_DIR, { recursive: true });
    const stats = { made: 0, skipped: 0, failed: [], odd: [], voiced: { en: [], ko: [] }, bytes: 0 };
    const t0 = Date.now();
    let i = 0;
    for (const [c, l] of jobs) {
      i++;
      const tag = `[${i}/${jobs.length}] ${l} ${c.code}`;
      if (!args.force && await exists(fileOf(l, c))) { stats.skipped++; continue; }
      try {
        const r = await makeOne(c, l, tmp);
        stats.made++;
        stats.bytes += r.size;
        stats.voiced[l].push(r.voiced);
        if (r.odd) stats.odd.push(`${l}:${c.code}(${r.voiced.toFixed(2)}s)`);
        console.log(`${tag} ${r.text} → 소리 ${r.voiced.toFixed(2)}s, 파일 ${r.total.toFixed(2)}s, ${(r.size / 1024).toFixed(1)}KB${r.odd ? '  ⚠ 길이 확인' : ''}`);
      } catch (e) {
        stats.failed.push(`${l}:${c.code}`);
        console.error(`${tag} 실패: ${e.message}`);
      }
    }
    const avg = (a) => (a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(2) + 's' : '-');
    console.log(`\n만듦 ${stats.made}, 건너뜀 ${stats.skipped}, 실패 ${stats.failed.length}, ${(stats.bytes / 1024).toFixed(0)}KB, ${((Date.now() - t0) / 1000).toFixed(0)}초`);
    console.log(`평균 소리 길이 en ${avg(stats.voiced.en)}, ko ${avg(stats.voiced.ko)}`);
    if (stats.failed.length) console.log(`실패: ${stats.failed.join(', ')}`);
    if (stats.odd.length) console.log(`길이 확인 필요: ${stats.odd.join(', ')}`);
  }
  const have = await writeManifest();
  console.log(`voices.js: en ${have.en.length}, ko ${have.ko.length} / ${COUNTRIES.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
