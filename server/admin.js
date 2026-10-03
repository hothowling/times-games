/*
 * admin.js - 관리자 페이지(/admin/)와 API(/admin/api/*). 브라우저 기본 로그인 창(HTTP Basic)으로 지킵니다.
 * 비밀번호는 환경 변수 ADMIN_PASSWORD. 없으면 관리자 기능 전체가 404 입니다.
 * 사진 얼굴 그림은 "본인만 보기" 원칙이라 관리자에게도 보여 주지 않고 개수만 알려 줍니다.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual, createHash } from 'node:crypto';

const PAGE = join(dirname(fileURLToPath(import.meta.url)), 'admin.html');
const MAX_FAILS = 10;
const LOCK_MS = 10 * 60 * 1000;
const sha = (s) => createHash('sha256').update(s).digest();

/* h = { route, fail, send, readJson, hashPin } (app.js 의 도우미) */
export function adminRoutes(db, password, h) {
  // ponytail: IP별 실패 횟수는 메모리에만 둡니다(재시작하면 초기화). 여러 프로세스로 늘리면 DB 로.
  const fails = new Map();

  /* 맞으면 true. 틀리면 401 과 로그인 창 요청을 보내고 false. */
  function allowed(req, res) {
    if (!password) h.fail(404, 'notFound');
    const ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
    const f = fails.get(ip);
    if (f && f.until > Date.now()) h.fail(429, 'locked');
    const auth = req.headers.authorization || '';
    const given = auth.startsWith('Basic ') ? Buffer.from(auth.slice(6), 'base64').toString() : '';
    const pass = given.slice(given.indexOf(':') + 1);
    if (given && timingSafeEqual(sha(pass), sha(password))) { fails.delete(ip); return true; }
    if (given) {
      const n = (f?.n || 0) + 1;
      fails.set(ip, n >= MAX_FAILS ? { n: 0, until: Date.now() + LOCK_MS } : { n, until: 0 });
    }
    h.send(res, 401, { error: 'admin' }, { 'www-authenticate': 'Basic realm="times-games admin", charset="UTF-8"' });
    return false;
  }

  const q = (sql) => db.prepare(sql);
  const S = {
    users: q(`select u.id, u.nickname, u.sparkles, u.created_at, u.locked_until,
      (select count(*) from plays p where p.user_id = u.id) as plays,
      (select max(created_at) from plays p where p.user_id = u.id) as last_play,
      (select count(*) from characters c where c.user_id = u.id) as photos
      from users u order by coalesce(last_play, u.created_at) desc`),
    user: q('select id, nickname, sparkles, settings, created_at, fails, locked_until from users where id = ?'),
    plays: q('select game_id, char_key, stars, score, sparkles, detail, created_at from plays where user_id = ? order by created_at desc limit 300'),
    log: q('select delta, reason, ref, created_at from sparkle_log where user_id = ? order by id desc limit 200'),
    inventory: q('select item_id, qty from inventory where user_id = ? and qty > 0 order by item_id'),
    progress: q('select game_id, data from progress where user_id = ?'),
    photos: q('select count(*) as n from characters where user_id = ?'),
    setPin: q('update users set pin = ?, fails = 0, locked_until = 0 where id = ?'),
    dropSessions: q('delete from sessions where user_id = ?'),
    /* 날짜는 브라우저 시간대(tz: getTimezoneOffset 분)로 묶습니다. */
    daily: q(`select date(created_at / 1000 - ? * 60, 'unixepoch') as day, game_id, count(*) as plays, count(distinct user_id) as players
      from plays where created_at >= ? group by day, game_id order by day desc`),
    totals: q('select (select count(*) from users) as users, (select count(*) from plays) as plays, (select coalesce(sum(sparkles), 0) from users) as sparkles')
  };

  const guard = (fn) => async (req, res, m, url) => { if (allowed(req, res)) await fn(req, res, m, url); };

  /* 페이지 안의 주소가 상대 경로라 끝에 / 가 있어야 합니다(/games/admin → /games/admin/). */
  h.route('GET', '/admin', async (req, res) => { res.writeHead(301, { location: 'admin/' }); res.end(); });

  h.route('GET', '/admin/', guard(async (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(readFileSync(PAGE));
  }));

  h.route('GET', '/admin/api/summary', guard(async (req, res, _m, url) => {
    const tz = Number(url.searchParams.get('tz')) || 0;
    h.send(res, 200, { totals: S.totals.get(), daily: S.daily.all(tz, Date.now() - 14 * 864e5) });
  }));

  h.route('GET', '/admin/api/users', guard(async (req, res) => {
    // ponytail: 전체 목록을 한 번에. 사용자가 수천 명을 넘으면 페이지 나누기.
    h.send(res, 200, { users: S.users.all() });
  }));

  h.route('GET', '/admin/api/users/(\\d+)', guard(async (req, res, m) => {
    const id = Number(m[1]);
    const user = S.user.get(id);
    if (!user) h.fail(404, 'notFound');
    h.send(res, 200, {
      user: { ...user, settings: JSON.parse(user.settings) },
      photos: S.photos.get(id).n,
      plays: S.plays.all(id).map((p) => ({ ...p, detail: p.detail && JSON.parse(p.detail) })),
      log: S.log.all(id),
      inventory: S.inventory.all(id),
      progress: Object.fromEntries(S.progress.all(id).map((p) => [p.game_id, JSON.parse(p.data)]))
    });
  }));

  /* PIN 재설정: 잠금도 풀고, 다른 기기의 로그인은 끊습니다. */
  h.route('POST', '/admin/api/users/(\\d+)/pin', guard(async (req, res, m) => {
    const { pin } = await h.readJson(req);
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) h.fail(400, 'badPin');
    if (!S.setPin.run(h.hashPin(pin), Number(m[1])).changes) h.fail(404, 'notFound');
    S.dropSessions.run(Number(m[1]));
    h.send(res, 200, {});
  }));
}
