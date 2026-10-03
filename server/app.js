/*
 * app.js - HTTP 처리: /api/* JSON API + public/ 정적 파일.
 * createApp({ db, dataDir, adminPassword }) 가 (req, res) 핸들러를 돌려줍니다(테스트에서 그대로 띄워 씁니다).
 * 관리자 페이지는 server/admin.js (/admin/).
 */
import { createReadStream, mkdirSync, statSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { tx } from './db.js';
import { adminRoutes } from './admin.js';
import { PRESETS, COSMETICS, ITEMS, REWARD, GAMES, DEFAULT_LOOK, isPhotoKey, validLook } from '../public/core/catalog.js';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SESSION_DAYS = 180;
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;
const MAX_PHOTO_CHARS = 5;
const MAX_FACE_BYTES = 3 * 1024 * 1024; // Safari 는 WebP 를 못 만들어 PNG(2000×400)로 올립니다
const MAX_JSON_BYTES = 32 * 1024;
// ponytail: 같은 게임 보상은 8초에 한 번. 클라이언트가 결과를 꾸미면 막을 수 없음, 필요하면 게임별 서버 검증으로.
const PLAY_GAP_MS = 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.wasm': 'application/wasm',
  '.task': 'application/octet-stream', '.tflite': 'application/octet-stream', '.ico': 'image/x-icon'
};

class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
const fail = (status, code) => { throw new HttpError(status, code); };

const sha = (s) => createHash('sha256').update(s).digest('hex');

function hashPin(pin) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(pin, salt, 32).toString('hex');
}

function checkPin(pin, stored) {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(scryptSync(pin, salt, 32), Buffer.from(hash, 'hex'));
}

function readBody(req, limit) {
  return new Promise((ok, no) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { no(new HttpError(413, 'tooLarge')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', no);
  });
}

async function readJson(req) {
  const buf = await readBody(req, MAX_JSON_BYTES);
  try { return buf.length ? JSON.parse(buf) : {}; } catch { fail(400, 'badJson'); }
}

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function send(res, status, body, headers = {}) {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers });
  res.end(data);
}

const isImage = (buf, mime) =>
  (mime === 'image/png' && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
  (mime === 'image/webp' && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP');

export function createApp({ db, dataDir, adminPassword }) {
  const facesDir = join(dataDir, 'faces');
  mkdirSync(facesDir, { recursive: true });

  const q = (sql) => db.prepare(sql);
  const S = {
    userById: q('select * from users where id = ?'),
    userByNick: q('select * from users where nickname = ?'),
    insertUser: q('insert into users (nickname, pin, settings, created_at) values (?, ?, ?, ?)'),
    setFails: q('update users set fails = ?, locked_until = ? where id = ?'),
    setSettings: q('update users set settings = ? where id = ?'),
    addSparkles: q('update users set sparkles = sparkles + ? where id = ?'),
    insertSession: q('insert into sessions (token, user_id, expires_at) values (?, ?, ?)'),
    session: q('select user_id from sessions where token = ? and expires_at > ?'),
    deleteSession: q('delete from sessions where token = ?'),
    inventory: q('select item_id, qty from inventory where user_id = ?'),
    invQty: q('select qty from inventory where user_id = ? and item_id = ?'),
    invAdd: q('insert into inventory (user_id, item_id, qty) values (?, ?, 1) on conflict do update set qty = qty + 1'),
    invUse: q('update inventory set qty = qty - 1 where user_id = ? and item_id = ? and qty > 0'),
    chars: q('select id, name, created_at from characters where user_id = ? order by id'),
    charById: q('select * from characters where id = ? and user_id = ?'),
    charCount: q('select count(*) as n from characters where user_id = ?'),
    insertChar: q('insert into characters (user_id, name, mime, created_at) values (?, ?, ?, ?)'),
    deleteChar: q('delete from characters where id = ? and user_id = ?'),
    looks: q('select char_key, equipped from looks where user_id = ?'),
    setLook: q('insert into looks (user_id, char_key, equipped) values (?, ?, ?) on conflict do update set equipped = excluded.equipped'),
    deleteLook: q('delete from looks where user_id = ? and char_key = ?'),
    progress: q('select data from progress where user_id = ? and game_id = ?'),
    setProgress: q('insert into progress (user_id, game_id, data) values (?, ?, ?) on conflict do update set data = excluded.data'),
    playByKey: q('select sparkles from plays where user_id = ? and game_id = ? and round_key = ?'),
    lastReward: q('select max(created_at) as t from plays where user_id = ? and game_id = ? and sparkles > 0'),
    insertPlay: q('insert into plays (user_id, game_id, round_key, char_key, stars, score, detail, sparkles, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    plays: q('select game_id, char_key, stars, score, sparkles, created_at from plays where user_id = ? and created_at >= ? order by created_at desc limit 1000'),
    log: q('insert into sparkle_log (user_id, delta, reason, ref, created_at) values (?, ?, ?, ?, ?)')
  };

  /* ---------- 세션 ---------- */

  function login(res, req, userId) {
    const token = randomBytes(32).toString('base64url');
    S.insertSession.run(sha(token), userId, Date.now() + SESSION_DAYS * 864e5);
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    res.setHeader('set-cookie', `sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`);
  }

  function currentUser(req) {
    const token = cookies(req).sid;
    if (!token) fail(401, 'login');
    const row = S.session.get(sha(token), Date.now());
    if (!row) fail(401, 'login');
    return S.userById.get(row.user_id);
  }

  /* ---------- 상태 묶음 ---------- */

  const owns = (userId, id) => (COSMETICS[id] && COSMETICS[id].price === 0) || !!S.invQty.get(userId, id)?.qty;

  function inventoryOf(userId) {
    const inv = {};
    for (const r of S.inventory.all(userId)) if (r.qty > 0) inv[r.item_id] = r.qty;
    for (const [id, c] of Object.entries(COSMETICS)) if (c.price === 0) inv[id] = 1;
    return inv;
  }

  function me(user) {
    const looks = {};
    for (const r of S.looks.all(user.id)) looks[r.char_key] = JSON.parse(r.equipped);
    return {
      user: { id: user.id, nickname: user.nickname, sparkles: user.sparkles, settings: JSON.parse(user.settings) },
      inventory: inventoryOf(user.id),
      characters: S.chars.all(user.id).map((c) => ({ key: 'p' + c.id, id: c.id, name: c.name })),
      looks
    };
  }

  const charExists = (userId, key) =>
    PRESETS.includes(key) || (isPhotoKey(key) && !!S.charById.get(Number(key.slice(1)), userId));

  /* ---------- 라우트 ---------- */

  const routes = [];
  const route = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern + '$'), fn });

  route('POST', '/api/signup', async (req, res) => {
    const { nickname, pin } = await readJson(req);
    const nick = typeof nickname === 'string' ? nickname.trim() : '';
    if ([...nick].length < 2 || [...nick].length > 12 || /[\u0000-\u001f<>]/.test(nick)) fail(400, 'badNickname');
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) fail(400, 'badPin');
    if (S.userByNick.get(nick)) fail(409, 'nicknameTaken');
    const settings = JSON.stringify({ character: 'sooji' });
    const id = Number(S.insertUser.run(nick, hashPin(pin), settings, Date.now()).lastInsertRowid);
    login(res, req, id);
    send(res, 200, me(S.userById.get(id)));
  });

  route('POST', '/api/login', async (req, res) => {
    const { nickname, pin } = await readJson(req);
    const user = typeof nickname === 'string' && S.userByNick.get(nickname.trim());
    if (!user) fail(401, 'badLogin');
    const now = Date.now();
    if (user.locked_until > now) fail(429, 'locked');
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin) || !checkPin(pin, user.pin)) {
      const fails = user.fails + 1;
      if (fails >= MAX_FAILS) S.setFails.run(0, now + LOCK_MS, user.id);
      else S.setFails.run(fails, 0, user.id);
      fail(401, fails >= MAX_FAILS ? 'locked' : 'badLogin');
    }
    S.setFails.run(0, 0, user.id);
    login(res, req, user.id);
    send(res, 200, me(user));
  });

  route('POST', '/api/logout', async (req, res) => {
    const token = cookies(req).sid;
    if (token) S.deleteSession.run(sha(token));
    send(res, 200, {}, { 'set-cookie': 'sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' });
  });

  route('GET', '/api/me', async (req, res) => send(res, 200, me(currentUser(req))));

  route('PATCH', '/api/settings', async (req, res) => {
    const user = currentUser(req);
    const body = await readJson(req);
    const s = JSON.parse(user.settings);
    if ('lang' in body) s.lang = body.lang === 'en' ? 'en' : 'ko';
    if ('sound' in body) s.sound = !!body.sound;
    if ('tts' in body) s.tts = !!body.tts;
    if ('character' in body) {
      if (typeof body.character !== 'string' || !charExists(user.id, body.character)) fail(400, 'badCharacter');
      s.character = body.character;
    }
    S.setSettings.run(JSON.stringify(s), user.id);
    send(res, 200, { settings: s });
  });

  /* 사진 캐릭터: 본문은 그림 파일 그대로(image/webp | image/png), 이름은 ?name= */
  route('POST', '/api/characters', async (req, res, _m, url) => {
    const user = currentUser(req);
    const mime = (req.headers['content-type'] || '').split(';')[0].trim();
    const buf = await readBody(req, MAX_FACE_BYTES);
    if (!isImage(buf, mime)) fail(400, 'badImage');
    if (S.charCount.get(user.id).n >= MAX_PHOTO_CHARS) fail(409, 'tooManyCharacters');
    const name = (url.searchParams.get('name') || '').trim().slice(0, 12) || '★';
    const id = tx(db, () => {
      const id = Number(S.insertChar.run(user.id, name, mime, Date.now()).lastInsertRowid);
      S.setLook.run(user.id, 'p' + id, JSON.stringify(DEFAULT_LOOK));
      return id;
    });
    writeFileSync(join(facesDir, String(id)), buf);
    send(res, 200, { key: 'p' + id, id, name });
  });

  /* 얼굴 그림은 주인에게만 내려줍니다. */
  route('GET', '/api/characters/(\\d+)/face', async (req, res, m) => {
    const user = currentUser(req);
    const c = S.charById.get(Number(m[1]), user.id);
    if (!c) fail(404, 'notFound');
    const buf = readFileSync(join(facesDir, String(c.id)));
    res.writeHead(200, { 'content-type': c.mime, 'cache-control': 'private, max-age=31536000, immutable' });
    res.end(buf);
  });

  route('DELETE', '/api/characters/(\\d+)', async (req, res, m) => {
    const user = currentUser(req);
    const id = Number(m[1]);
    if (!S.charById.get(id, user.id)) fail(404, 'notFound');
    tx(db, () => {
      S.deleteChar.run(id, user.id);
      S.deleteLook.run(user.id, 'p' + id);
      const s = JSON.parse(user.settings);
      if (s.character === 'p' + id) { s.character = 'sooji'; S.setSettings.run(JSON.stringify(s), user.id); }
    });
    rmSync(join(facesDir, String(id)), { force: true });
    send(res, 200, {});
  });

  route('PUT', '/api/looks/([\\w]+)', async (req, res, m) => {
    const user = currentUser(req);
    const { equipped } = await readJson(req);
    if (!charExists(user.id, m[1])) fail(404, 'notFound');
    const look = { ...DEFAULT_LOOK, ...equipped };
    if (!validLook(look, (id) => owns(user.id, id))) fail(400, 'badLook');
    S.setLook.run(user.id, m[1], JSON.stringify(look));
    send(res, 200, { equipped: look });
  });

  route('POST', '/api/shop/buy', async (req, res) => {
    const user = currentUser(req);
    const { itemId } = await readJson(req);
    const entry = Object.hasOwn(COSMETICS, itemId) ? COSMETICS[itemId] : Object.hasOwn(ITEMS, itemId) ? ITEMS[itemId] : null;
    if (!entry) fail(400, 'badItem');
    if (COSMETICS[itemId] && owns(user.id, itemId)) fail(409, 'owned');
    tx(db, () => {
      const fresh = S.userById.get(user.id);
      if (fresh.sparkles < entry.price) fail(400, 'notEnough');
      S.addSparkles.run(-entry.price, user.id);
      S.invAdd.run(user.id, itemId);
      S.log.run(user.id, -entry.price, 'buy', itemId, Date.now());
    });
    send(res, 200, { sparkles: S.userById.get(user.id).sparkles, inventory: inventoryOf(user.id) });
  });

  route('POST', '/api/items/use', async (req, res) => {
    const user = currentUser(req);
    const { itemId } = await readJson(req);
    if (!Object.hasOwn(ITEMS, itemId)) fail(400, 'badItem');
    if (!S.invUse.run(user.id, itemId).changes) fail(400, 'noItem');
    send(res, 200, { qty: S.invQty.get(user.id, itemId).qty });
  });

  route('GET', '/api/progress/(\\w+)', async (req, res, m) => {
    const user = currentUser(req);
    if (!GAMES.includes(m[1])) fail(404, 'notFound');
    const row = S.progress.get(user.id, m[1]);
    send(res, 200, { data: row ? JSON.parse(row.data) : null });
  });

  route('PUT', '/api/progress/(\\w+)', async (req, res, m) => {
    const user = currentUser(req);
    if (!GAMES.includes(m[1])) fail(404, 'notFound');
    const { data } = await readJson(req);
    S.setProgress.run(user.id, m[1], JSON.stringify(data ?? null));
    send(res, 200, {});
  });

  /* 게임 결과: Sparkles 는 서버가 별 개수로 정합니다. 같은 roundKey 는 한 번만 지급. */
  route('POST', '/api/plays', async (req, res) => {
    const user = currentUser(req);
    const b = await readJson(req);
    if (!GAMES.includes(b.game)) fail(400, 'badGame');
    if (typeof b.roundKey !== 'string' || !b.roundKey || b.roundKey.length > 64) fail(400, 'badRoundKey');
    const stars = Number(b.stars);
    if (!Number.isInteger(stars) || stars < 0 || stars > 3) fail(400, 'badStars');
    const score = Number.isFinite(Number(b.score)) ? Math.round(Number(b.score)) : null;
    const charKey = typeof b.character === 'string' && charExists(user.id, b.character) ? b.character : null;
    const detail = b.detail === undefined ? null : JSON.stringify(b.detail);
    const earned = tx(db, () => {
      const prev = S.playByKey.get(user.id, b.game, b.roundKey);
      if (prev) return prev.sparkles;
      const now = Date.now();
      const last = S.lastReward.get(user.id, b.game).t || 0;
      const sparkles = now - last < PLAY_GAP_MS ? 0 : REWARD[stars];
      S.insertPlay.run(user.id, b.game, b.roundKey, charKey, stars, score, detail, sparkles, now);
      if (sparkles) {
        S.addSparkles.run(sparkles, user.id);
        S.log.run(user.id, sparkles, 'play', b.game, now);
      }
      return sparkles;
    });
    send(res, 200, { earned, sparkles: S.userById.get(user.id).sparkles });
  });

  route('GET', '/api/records', async (req, res, _m, url) => {
    const user = currentUser(req);
    const days = Math.min(60, Math.max(1, Number(url.searchParams.get('days')) || 14));
    const rows = S.plays.all(user.id, Date.now() - days * 864e5);
    send(res, 200, { plays: rows.map((r) => ({ game: r.game_id, character: r.char_key, stars: r.stars, score: r.score, sparkles: r.sparkles, at: r.created_at })) });
  });

  adminRoutes(db, adminPassword, { route, fail, send, readJson, hashPin });

  /* ---------- 정적 파일 ---------- */

  function serveStatic(req, res, pathname) {
    let rel;
    try { rel = decodeURIComponent(pathname); } catch { fail(400, 'badPath'); }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = normalize(join(PUBLIC, rel));
    if (!file.startsWith(PUBLIC + '/')) fail(404, 'notFound');
    let st;
    try { st = statSync(file); } catch { fail(404, 'notFound'); }
    if (!st.isFile()) fail(404, 'notFound');
    const mtime = st.mtime.toUTCString();
    // 업데이트가 바로 보이도록 매번 확인(바뀌지 않았으면 304)
    const headers = { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'last-modified': mtime, 'cache-control': 'no-cache' };
    if (req.headers['if-modified-since'] === mtime) { res.writeHead(304, headers); res.end(); return; }
    res.writeHead(200, { ...headers, 'content-length': st.size });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).pipe(res);
  }

  return async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    try {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = url.pathname.match(r.re);
        if (m) return await r.fn(req, res, m, url);
      }
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/')) fail(404, 'notFound');
      if (req.method !== 'GET' && req.method !== 'HEAD') fail(405, 'method');
      serveStatic(req, res, url.pathname);
    } catch (err) {
      if (!(err instanceof HttpError)) console.error(err);
      if (res.headersSent) { res.destroy(); return; }
      send(res, err.status || 500, { error: err.code || 'server' });
    }
  };
}
