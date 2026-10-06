#!/usr/bin/env node
/*
 * fetch-word-images.mjs - 영단어 짝맞추기 그림을 웹(CC 라이선스)에서 받아 512x512 로 줄여 저장합니다.
 *
 *   node scripts/fetch-word-images.mjs                 # 그림 없는 구체 명사 주제 단어 전부
 *   node scripts/fetch-word-images.mjs --limit=50      # 50개만
 *   node scripts/fetch-word-images.mjs --only=dog,cat  # 특정 단어만(이미 있어도 다시 받음)
 *   node scripts/fetch-word-images.mjs --topics=all    # 동사·형용사·색깔·숫자·시간까지
 *   node scripts/fetch-word-images.mjs --dry-run       # 받지 않고 후보만 출력
 *   node scripts/fetch-word-images.mjs --source=commons # Openverse 를 건너뛰고 Wikimedia Commons 만
 *   node scripts/fetch-word-images.mjs --skip=dog,cat  # 이 후보(현재 고른 것)를 빼고 다음 후보로 다시 받기
 *   node scripts/fetch-word-images.mjs --pick=dog=2    # 저장된 후보 목록에서 2번 후보로 바꾸기(검색 없음)
 *   node scripts/fetch-word-images.mjs --drop=dog      # 그림을 지우고 이모지로
 *   node scripts/fetch-word-images.mjs --redo          # 이미 받은 단어도 다시 검색해 받기
 *   node scripts/fetch-word-images.mjs --rebuild       # 내려받기 없이 credits.js / images.js 만 다시 씀
 *
 * 출처
 *   1) Openverse API (https://api.openverse.org/v1/) - 익명은 20회/분, 200회/일 제한.
 *      OPENVERSE_CLIENT_ID / OPENVERSE_CLIENT_SECRET 가 있으면 토큰으로 인증해 한도를 늘립니다
 *      (발급: POST /v1/auth_tokens/register/ 후 이메일 인증, https://api.openverse.org/v1/#tag/auth).
 *   2) Wikimedia Commons API - Openverse 한도 초과(429)나 후보가 없을 때 씁니다.
 *   라이선스는 CC0 / CC BY / CC BY-SA / Public domain 만 받습니다.
 *
 * 결과
 *   public/assets/games/wordmatch/img/<id>.jpg   (macOS sips 는 webp 를 쓸 수 없어 JPEG q80)
 *   public/games/wordmatch/images.js             IMAGES = { id: 'jpg' } (게임이 읽음, 자동 생성)
 *   public/games/wordmatch/credits.js            CREDITS = [{ id, title, creator, license, licenseUrl, source, sourceUrl }]
 *   scripts/wordmatch-images.json                위 정보 + 후보 목록(다시 돌릴 때 씀)
 *   scripts/wordmatch-review.html                검수 페이지의 WM_DATA 를 채움(파일로 열어 '보류' 체크 → --skip 명령 복사)
 */
import { readFile, writeFile, mkdir, stat, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { WORDS } from '../public/games/wordmatch/words.js';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = path.join(ROOT, 'public/assets/games/wordmatch/img');
const DB_FILE = path.join(ROOT, 'scripts/wordmatch-images.json');
const CREDITS_FILE = path.join(ROOT, 'public/games/wordmatch/credits.js');
const IMAGES_FILE = path.join(ROOT, 'public/games/wordmatch/images.js');
const REVIEW_FILE = path.join(ROOT, 'scripts/wordmatch-review.html');
const UA = 'times-games-wordmatch/1.0 (educational kids game; image fetch script; contact dev.icecreamsoft@gmail.com)';
const SIZE = 512;

/* 그림으로 보여 주기 쉬운 주제를 먼저, 이 순서로 받습니다. */
const CONCRETE = ['animals', 'food', 'school', 'body', 'home', 'clothes', 'nature', 'places', 'family'];
const ABSTRACT = ['colors', 'numbers', 'time', 'verbs', 'adjectives'];

/* 검색어가 애매한 단어는 바꿔 찾습니다(영어 단어 그대로 찾으면 엉뚱한 사진이 나오는 것). */
const QUERY = {
  bat: 'bat animal', mouse: 'mouse animal', crab: 'crab animal', seal: 'seal animal',
  orange: 'orange fruit', pear: 'pear fruit', date: 'date fruit', tea: 'cup of tea', rice: 'bowl of rice',
  glue: 'glue stick', ruler: 'ruler measuring', bag: 'school backpack', test: 'school exam', class: 'classroom lesson',
  map: 'world map', word: 'alphabet letters', name: 'name tag', answer: 'raising hand classroom',
  head: 'human head', back: 'human back', heart: 'heart organ', lip: 'lips', toe: 'toes', arm: 'human arm', leg: 'human leg',
  cook: 'chef cooking', bank: 'bank building', station: 'train station', pool: 'swimming pool', country: 'countryside',
  fall: 'autumn leaves', glass: 'drinking glass', watch: 'wristwatch', cap: 'baseball cap', ring: 'ring jewelry',
  'police-officer': 'police officer', boat: 'small boat', bike: 'bicycle', toilet: 'toilet restroom',
  'post-office': 'post office', 'fire-station': 'fire station', 'police-station': 'police station',
  brother: 'brothers kids', sister: 'sisters kids', man: 'man portrait', woman: 'woman portrait', person: 'person portrait'
};

/* ---------- 인자 ---------- */
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const ONLY = args.only ? new Set(String(args.only).split(',').map((s) => s.trim()).filter(Boolean)) : null;
const SKIP = args.skip ? new Set(String(args.skip).split(',').map((s) => s.trim()).filter(Boolean)) : null;
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const DRY = !!args['dry-run'];
const SOURCE = args.source || 'auto'; // auto | openverse | commons
const TOPICS = args.topics === 'all' ? [...CONCRETE, ...ABSTRACT]
  : args.topics ? String(args.topics).split(',') : CONCRETE;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => stat(p).then(() => true, () => false);
const log = (...a) => console.log(...a);

/* ---------- 저장 데이터 ---------- */
async function loadDb() {
  try { return JSON.parse(await readFile(DB_FILE, 'utf8')); } catch { return {}; }
}
async function saveDb(db) {
  const sorted = Object.fromEntries(Object.keys(db).sort().map((k) => [k, db[k]]));
  await writeFile(DB_FILE, JSON.stringify(sorted, null, 2) + '\n');
}

/* ---------- 후보 고르기 ---------- */
const norm = (s) => String(s || '').toLowerCase().replace(/\.(jpe?g|png|gif|webp|tiff?)$/i, '').replace(/[_\-.,'"()]+/g, ' ').replace(/\s+/g, ' ').trim();
/* 아이들 게임에 맞지 않거나 그림 카드로 알아보기 어려운 제목 */
const BAD = /\b(logo|diagram|map of|chart|poster|sign|text|tattoo|meme|screenshot|graffiti|stamp|coin|label|menu|book cover|statue|sculpture|plastic|toy|figurine|cartoon|dead|carcass|meat market|butcher|slaughter|hunt|hunting|war|soldier|gun|weapon|blood|nude|naked|nudity|topless|sexy|erotic|fetish|lingerie|underwear|bodysuit|tights|pantyhose|shapewear|corset|bra|bikini|modell?ed|beer|wine|cigar|cigarette|smok\w*|drunk|bw|b&w|black and white|monochrome|film|movie|museum|skeleton|fossil|x ray|surgery|injury|wound)\b/i;
/* 사람 몸·수영복처럼 사진 검색이 위험한 단어는 기본으로 받지 않고 이모지를 씁니다(--only 로 직접 지정하면 받음). */
const EXCLUDE = new Set(['swimsuit', 'body', 'back', 'lip', 'toe', 'pajamas']);

function scoreCandidate(word, c, query) {
  const title = norm(c.title);
  const words = title.split(' ').filter(Boolean);
  const keys = new Set([word.en.toLowerCase(), ...String(query).toLowerCase().split(' ').filter((x) => x.length > 2)]);
  const head = word.en.toLowerCase().replace(/[^a-z ]/g, '');
  /* 제목에 단어가 있어야 후보가 됩니다(Openverse 는 태그만 맞는 엉뚱한 사진도 줍니다). */
  if (!new RegExp(`\\b${head}(s|es)?\\b`).test(title)) return -99;
  let s = 4;
  const core = title.replace(/\b(a|an|the|my|our|cute|little|big|small|one|two|\d+)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (new RegExp(`^${head}(s|es)?$`).test(core)) s += 4;
  else if ([...keys].every((k) => title.includes(k))) s += 1;
  /* 단어가 꾸밈말로 쓰인 제목(Chicken soup, Bear Hotel, Duck-billed …)은 깎습니다. */
  const stock = /stocksnap|rawpixel/i.test(c.provider);
  const after = !stock && title.match(new RegExp(`\\b${head}(?:s|es)?\\s+(\\S+)`));
  if (after && !/^(\d+\w*|on|in|at|of|with|and|or|from|near|by|for|to|under|over|eating|sitting|standing|lying|walking|running|flying|swimming|resting|grazing|portrait|close|closeup|head|face|family|group|pair|couple)$/.test(after[1])) s -= 3;
  if (words.length <= 3) s += 2;
  else if (words.length <= 6) s += 1;
  else s -= 2;
  if (BAD.test(title.replace(new RegExp(`\\b${head}\\b`, 'g'), ' '))) s -= 8;
  if (/\d{4,}|\bp\d{5,}|dsc|img/i.test(c.title)) s -= 1;
  const ar = c.width / c.height;
  if (ar >= 0.75 && ar <= 1.6) s += 2;
  else if (ar < 0.6 || ar > 2) s -= 3;
  if (Math.min(c.width, c.height) < 400) s -= 4;
  if (c.license === 'cc0' || c.license === 'pdm') s += 1;
  if (/stocksnap|rawpixel/i.test(c.provider)) s += 2;
  if (c.quality) s += 3;
  const hint = HINTS[word.topic];
  const rest = title.replace(new RegExp(`\\b${head}(s|es)?\\b`, 'g'), ' ');
  if (hint?.good?.test(rest)) s += 2;
  if (hint?.bad?.test(rest)) s -= 5;
  if (word.topic !== 'family' && word.topic !== 'clothes' && PEOPLE.test(rest)) s -= 3;
  s += Math.max(0, 2 - Math.floor(c.rank / 4)); // 검색 순위가 높을수록 조금 더
  return s;
}
const MIN_SCORE = 7;
/* 주제별로 제목에 같이 있으면 좋은 말 / 나쁜 말(동물인데 요리 사진 등) */
const PEOPLE = /\b(man|men|woman|women|girl|boy|people|person|lady|guy|model|selfie|portrait of)\b/i;
const HINTS = {
  animals: { good: /\b(animals?|wildlife|birds?|pets?|zoo|wild|farm|cute|puppy|kitten|nature)\b/i,
    bad: /\b(food|grilled|fried|roast\w*|rice|meal|dish|soup|sauce|plate|cooked|meat|curry|wings|nuggets|plush|teddy|costume|panda|hotel|island|film)\b/i },
  food: { good: /\b(food|fruits?|vegetables?|fresh|healthy|dessert|drinks?|snack|organic|harvest)\b/i,
    bad: /\b(shop|store|market stall|costume|farm|field|plant|tree|blossom|flower|field)\b/i },
  school: { good: /\b(school|office|desk|writing|study|education|classroom|supplies|stationery)\b/i },
  home: { good: /\b(home|house|interior|kitchen|room)\b/i },
  nature: { good: /\b(nature|landscape|sky|outdoor)\b/i }
};

/* ---------- Openverse ---------- */
let ovToken = null;
let ovBlocked = false;
let ovCalls = 0;
let ovLast = 0;

async function openverseToken() {
  const id = process.env.OPENVERSE_CLIENT_ID;
  const secret = process.env.OPENVERSE_CLIENT_SECRET;
  if (!id || !secret) return null;
  const res = await fetch('https://api.openverse.org/v1/auth_tokens/token/', {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret })
  });
  if (!res.ok) throw new Error(`Openverse token ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function openverse(word, query, category, sources) {
  if (ovBlocked) return null;
  /* 익명 20회/분 → 3.2초 간격 */
  const gap = ovToken ? 400 : 3200;
  const wait = ovLast + gap - Date.now();
  if (wait > 0) await sleep(wait);
  ovLast = Date.now();
  const u = new URL('https://api.openverse.org/v1/images/');
  u.search = new URLSearchParams({
    q: query, license: 'cc0,pdm,by,by-sa', license_type: 'commercial', mature: 'false',
    page_size: '20', extension: 'jpg,png', ...(category ? { category } : {}), ...(sources ? { source: sources } : {})
  });
  const headers = { 'User-Agent': UA };
  if (ovToken) headers.Authorization = `Bearer ${ovToken}`;
  ovCalls++;
  const res = await fetch(u, { headers });
  const left = res.headers.get('x-ratelimit-available-anon_sustained') ?? res.headers.get('x-ratelimit-available-standard_sustained');
  if (left != null) openverse.left = Number(left);
  if (res.status === 429) {
    ovBlocked = true;
    log(`  ! Openverse 429 (한도 초과): ${res.headers.get('retry-after') || ''}s 뒤 재시도 가능. 남은 단어는 Commons 로 받습니다.`);
    return null;
  }
  if (!res.ok) { log(`  ! Openverse ${res.status}`); return null; }
  const data = await res.json();
  return data.results
    .filter((r) => !r.mature && !(r.unstable__sensitivity || []).length && r.width && r.height)
    .map((r, rank) => ({
      rank, source: 'openverse', provider: r.source || r.provider,
      title: r.title || '', creator: r.creator || 'unknown',
      license: r.license, licenseVersion: r.license_version || '',
      licenseUrl: r.license_url || '', url: r.url, sourceUrl: r.foreign_landing_url || r.detail_url,
      width: r.width, height: r.height
    }));
}

/* ---------- Wikimedia Commons ---------- */
let cmLast = 0;
const LICENSE_OK = /^(CC0|CC[- ]BY(-SA)?[- ]\d|Public domain|PD)/i;

function stripHtml(s) {
  return String(s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function commonsLicense(short) {
  const s = short.trim();
  if (/^CC0/i.test(s)) return ['cc0', '1.0'];
  if (/^(Public domain|PD)/i.test(s)) return ['pdm', ''];
  const m = s.match(/^CC[- ]BY(-SA)?[- ]([\d.]+)/i);
  return m ? [m[1] ? 'by-sa' : 'by', m[2]] : null;
}

async function commons(word, query, quality) {
  const wait = cmLast + 1000 - Date.now();
  if (wait > 0) await sleep(wait);
  cmLast = Date.now();
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.search = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '20',
    gsrsearch: quality ? `intitle:"${word.en}" ${query === word.en ? '' : query + ' '}hastemplate:"Quality image" filetype:bitmap`
      : `intitle:"${word.en}" ${query} filetype:bitmap`,
    prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '800',
    iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|ObjectName', maxlag: '5'
  });
  const res = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!res.ok) { log(`  ! Commons ${res.status}`); return null; }
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {}).sort((a, b) => a.index - b.index);
  const out = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || !/jpeg|png/.test(ii.mime || '')) continue;
    const m = ii.extmetadata || {};
    const short = m.LicenseShortName?.value || '';
    if (!LICENSE_OK.test(short)) continue;
    const lic = commonsLicense(short);
    if (!lic) continue;
    out.push({
      rank: out.length, quality: !!quality, source: 'commons', provider: 'wikimedia',
      title: p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
      creator: stripHtml(m.Artist?.value) || 'unknown',
      license: lic[0], licenseVersion: lic[1], licenseName: short,
      licenseUrl: m.LicenseUrl?.value || '', url: ii.thumburl || ii.url,
      sourceUrl: ii.descriptionurl, width: ii.width, height: ii.height
    });
  }
  return out;
}

/* ---------- 내려받기·변환 ---------- */
async function download(url, file) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error('too small');
  await writeFile(file, buf);
}

async function sipsSize(file) {
  const { stdout } = await run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]);
  return [Number(stdout.match(/pixelWidth: (\d+)/)[1]), Number(stdout.match(/pixelHeight: (\d+)/)[1])];
}

/* 가운데를 정사각형으로 자르고 512 로 줄여 JPEG 80 으로 저장 */
async function toSquareJpeg(src, dest) {
  const [w, h] = await sipsSize(src);
  const side = Math.min(w, h);
  await run('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-c', String(side), String(side), src, '--out', dest]);
  await run('sips', ['-z', String(SIZE), String(SIZE), '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', dest, '--out', dest]);
}

/* ---------- 결과 파일 ---------- */
const LICENSE_LABEL = { cc0: 'CC0', pdm: 'Public domain', by: 'CC BY', 'by-sa': 'CC BY-SA' };
const licenseText = (r) => r.licenseName || `${LICENSE_LABEL[r.license] || r.license}${r.licenseVersion && r.license !== 'pdm' ? ' ' + r.licenseVersion : ''}`;

async function writeOutputs(db) {
  const ids = [];
  for (const w of WORDS) {
    const r = db[w.id];
    if (r?.chosen && await exists(path.join(IMG_DIR, `${w.id}.${r.chosen.ext}`))) ids.push([w.id, r.chosen]);
  }
  const credits = ids.map(([id, c]) => ({
    id, title: c.title, creator: c.creator, license: licenseText(c), licenseUrl: c.licenseUrl,
    source: c.source === 'commons' ? 'Wikimedia Commons' : `Openverse / ${c.provider}`, sourceUrl: c.sourceUrl
  }));
  await writeFile(CREDITS_FILE, `/*
 * credits.js - 영단어 그림 출처(자동 생성: scripts/fetch-word-images.mjs). 그림은 assets/games/wordmatch/img/<id>.jpg
 * Openverse·Wikimedia Commons 에서 CC0 / CC BY / CC BY-SA / Public domain 그림만 골라 가운데를 512x512 로 잘라 줄였습니다.
 * CC BY·BY-SA 는 출처 표시가 필요해 게임 그림 카드 아래에 작가와 라이선스를 보여 줍니다.
 */
export const CREDITS = [
${credits.map((c) => '  ' + JSON.stringify(c)).join(',\n')}
];
`);
  await writeFile(IMAGES_FILE, `/*
 * images.js - 그림 파일이 있는 단어(자동 생성: scripts/fetch-word-images.mjs). { id: 확장자 }
 * 그림은 assets/games/wordmatch/img/<id>.<확장자>. 여기 없는 단어는 words.js 의 emoji, 그것도 없으면 글자로 보여 줍니다.
 */
export const IMAGES = {
${ids.map(([id, c]) => `  ${JSON.stringify(id)}: ${JSON.stringify(c.ext)}`).join(',\n')}
};
`);
  /* 검수 페이지에 데이터 채우기 */
  const review = await readFile(REVIEW_FILE, 'utf8');
  const data = {
    words: WORDS.map(({ id, en, ko, topic, emoji }) => ({ id, en, ko, topic, ...(emoji ? { emoji } : {}) })),
    images: Object.fromEntries(ids.map(([id, c]) => {
      const cr = credits.find((x) => x.id === id);
      return [id, { ext: c.ext, url: c.url, title: cr.title, creator: cr.creator, license: cr.license, source: cr.source, sourceUrl: cr.sourceUrl }];
    }))
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  await writeFile(REVIEW_FILE, review.replace(/(\/\* WM_DATA:BEGIN[^\n]*\n)[\s\S]*?(\/\* WM_DATA:END \*\/)/,
    (_, a, b) => `${a}window.WM_DATA = ${json};\n${b}`));
  return credits;
}

/* ---------- 메인 ---------- */
async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  const db = await loadDb();
  if (args.rebuild) {
    const c = await writeOutputs(db);
    log(`credits ${c.length}개 다시 씀`);
    return;
  }
  if (args.pick) {
    /* --pick=dog=2,cat=0 : 저장된 후보 목록(wordmatch-images.json)에서 번호로 골라 받기(검색 없이) */
    for (const pair of String(args.pick).split(',')) {
      const [id, n] = pair.split('=');
      const r = db[id];
      const c = r?.candidates?.[Number(n)];
      if (!c) { log(`${id}: 후보 ${n} 없음`); continue; }
      const tmp = path.join(IMG_DIR, `.${id}.download`);
      try {
        await download(c.url, tmp);
        await toSquareJpeg(tmp, path.join(IMG_DIR, `${id}.jpg`));
        if (r.chosen && r.chosen.url !== c.url) r.rejected = [...new Set([...(r.rejected || []), r.chosen.url])];
        r.chosen = { ...c, ext: 'jpg' };
        log(`${id} ← [${n}] ${licenseText(c)} "${c.title}"`);
      } catch (e) { log(`${id}: ${e.message}`); }
      finally { await rm(tmp, { force: true }); }
    }
    await saveDb(db);
    await writeOutputs(db);
    return;
  }
  if (args.drop) {
    /* --drop=dog,cat : 그림을 지우고 이모지로 돌아가기 */
    for (const id of String(args.drop).split(',')) {
      if (db[id]?.chosen) { db[id].rejected = [...new Set([...(db[id].rejected || []), db[id].chosen.url])]; db[id].chosen = null; }
      await rm(path.join(IMG_DIR, `${id}.jpg`), { force: true });
    }
    await saveDb(db);
    await writeOutputs(db);
    return;
  }
  if (SOURCE !== 'commons') {
    ovToken = await openverseToken();
    log(ovToken ? 'Openverse: 토큰 인증' : 'Openverse: 익명(20회/분, 200회/일)');
  }

  const todo = [];
  for (const topic of TOPICS) {
    for (const w of WORDS.filter((x) => x.topic === topic)) {
      if (ONLY && !ONLY.has(w.id)) continue;
      if (!ONLY && EXCLUDE.has(w.id)) continue;
      if (!ONLY && !SKIP && !args.redo && db[w.id]?.chosen && await exists(path.join(IMG_DIR, `${w.id}.${db[w.id].chosen.ext}`))) continue;
      if (SKIP && !SKIP.has(w.id)) continue;
      todo.push(w);
    }
  }
  const list = todo.slice(0, LIMIT);
  log(`대상 ${list.length}개 (주제: ${TOPICS.join(', ')})${DRY ? ' [dry-run]' : ''}`);

  let ok = 0, fail = 0;
  for (const [i, w] of list.entries()) {
    const query = QUERY[w.id] || w.en;
    const prevBad = new Set(db[w.id]?.rejected || []);
    if (SKIP?.has(w.id) && db[w.id]?.chosen) prevBad.add(db[w.id].chosen.url);
    let cands = [];
    const tried = [];
    const good = () => cands.some((c) => scoreCandidate(w, c, query) >= MIN_SCORE + 3);
    if (SOURCE !== 'commons' && !ovBlocked) {
      /* 먼저 StockSnap·rawpixel(CC0 스톡 사진, 배경이 깔끔함), 모자라면 Openverse 전체 */
      cands.push(...(await openverse(w, query, 'photograph', 'stocksnap,rawpixel') || []));
      tried.push('openverse-stock');
      if (!good()) {
        cands.push(...(await openverse(w, query, 'photograph') || []));
        tried.push('openverse');
      }
    }
    if (SOURCE !== 'openverse' && !good()) {
      cands.push(...(await commons(w, query, true) || []));
      tried.push('commons-QI');
      if (!good()) {
        cands.push(...(await commons(w, query, false) || []));
        tried.push('commons');
      }
    }
    cands = cands.filter((c) => !prevBad.has(c.url))
      .map((c) => ({ ...c, score: scoreCandidate(w, c, query) }))
      .filter((c) => c.score > -50)
      .sort((a, b) => b.score - a.score);
    const tag = `[${i + 1}/${list.length}] ${w.id} (${query}) via ${tried.join('+')}`;
    if (DRY) {
      log(tag);
      for (const c of cands.slice(0, 5)) log(`    ${c.score} ${licenseText(c)} ${c.width}x${c.height} ${c.title.slice(0, 50)} — ${c.url}`);
      continue;
    }
    let chosen = null;
    for (const c of cands.slice(0, 4)) {
      if (c.score < MIN_SCORE) break;
      const tmp = path.join(IMG_DIR, `.${w.id}.download`);
      const dest = path.join(IMG_DIR, `${w.id}.jpg`);
      try {
        await download(c.url, tmp);
        await toSquareJpeg(tmp, dest);
        chosen = { ...c, ext: 'jpg' };
        break;
      } catch (e) {
        log(`  - ${w.id}: ${c.url} 실패 (${e.message})`);
      } finally {
        await rm(tmp, { force: true });
      }
    }
    db[w.id] = {
      en: w.en, query, chosen,
      rejected: [...prevBad],
      candidates: cands.slice(0, 8).map(({ rank, quality, ...c }) => c)
    };
    if (chosen) { ok++; log(`${tag} → ${licenseText(chosen)} "${chosen.title.slice(0, 40)}" (${chosen.provider})`); }
    else { fail++; log(`${tag} → 후보 없음`); }
    if ((i + 1) % 10 === 0) { await saveDb(db); await writeOutputs(db); }
  }
  if (!DRY) {
    await saveDb(db);
    const c = await writeOutputs(db);
    log(`\n받음 ${ok}, 실패 ${fail}, 전체 그림 ${c.length}개. Openverse 호출 ${ovCalls}회` +
      (openverse.left != null ? `, 오늘 남은 익명 호출 ${openverse.left}` : '') + (ovBlocked ? ' (429 로 중단 → Commons 사용)' : ''));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
