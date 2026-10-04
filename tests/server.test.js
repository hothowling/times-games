import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';

const dir = mkdtempSync(join(tmpdir(), 'tg-'));
const db = openDb(':memory:');
const server = createServer(createApp({ db, dataDir: dir }));
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

/* 쿠키를 들고 다니는 간단한 클라이언트 */
function client() {
  let cookie = '';
  return async (method, path, body, headers = {}) => {
    const raw = body instanceof Uint8Array;
    const res = await fetch(base + path, {
      method,
      headers: { cookie, ...(body && !raw ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body)
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const type = res.headers.get('content-type') || '';
    return { status: res.status, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
  };
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

test('signup, login, lockout', async () => {
  const a = client();
  assert.equal((await a('POST', '/api/signup', { nickname: '가', pin: '1234' })).body.error, 'badNickname');
  assert.equal((await a('POST', '/api/signup', { nickname: '수지', pin: '12a4' })).body.error, 'badPin');
  const r = await a('POST', '/api/signup', { nickname: '수지', pin: '1234' });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.sparkles, 0);
  assert.equal(r.body.inventory.uniform, 1);
  assert.equal((await a('GET', '/api/me')).status, 200);
  assert.equal((await client()('GET', '/api/me')).status, 401);
  assert.equal((await client()('POST', '/api/signup', { nickname: '수지', pin: '1111' })).status, 409);

  const b = client();
  for (let i = 0; i < 4; i++) assert.equal((await b('POST', '/api/login', { nickname: '수지', pin: '0000' })).body.error, 'badLogin');
  assert.equal((await b('POST', '/api/login', { nickname: '수지', pin: '0000' })).body.error, 'locked');
  assert.equal((await b('POST', '/api/login', { nickname: '수지', pin: '1234' })).status, 429);
});

test('plays reward, idempotency, shop, looks', async () => {
  const a = client();
  await a('POST', '/api/signup', { nickname: 'jiho', pin: '4321' });
  const pay = ({ earned, sparkles }) => ({ earned, sparkles });
  let r = await a('POST', '/api/plays', { game: 'blocks', roundKey: 'r1', stars: 3, score: 10 });
  assert.deepEqual(pay(r.body), { earned: 10, sparkles: 10 });
  r = await a('POST', '/api/plays', { game: 'blocks', roundKey: 'r1', stars: 3 });
  assert.deepEqual(pay(r.body), { earned: 10, sparkles: 10 }, 'same roundKey pays once');
  r = await a('POST', '/api/plays', { game: 'blocks', roundKey: 'r2', stars: 3 });
  assert.equal(r.body.earned, 0, 'too soon after last reward');
  r = await a('POST', '/api/plays', { game: 'master', roundKey: 'r1', stars: 2 });
  assert.equal(r.body.earned, 6);
  assert.equal((await a('POST', '/api/plays', { game: 'nope', roundKey: 'x', stars: 1 })).status, 400);
  assert.equal((await a('POST', '/api/plays', { game: 'master', roundKey: 'x', stars: 4 })).status, 400);

  assert.equal((await a('POST', '/api/shop/buy', { itemId: 'magic' })).body.error, 'notEnough');
  await a('POST', '/api/plays', { game: 'shooter', roundKey: 'r1', stars: 3 });
  assert.equal((await a('POST', '/api/shop/buy', { itemId: 'constructor' })).body.error, 'badItem');
  r = await a('POST', '/api/shop/buy', { itemId: 'redCap' });
  assert.equal(r.body.sparkles, 16);
  assert.equal(r.body.inventory.redCap, 1);
  assert.equal((await a('POST', '/api/shop/buy', { itemId: 'redCap' })).body.error, 'owned');
  r = await a('POST', '/api/shop/buy', { itemId: 'eraser' });
  assert.equal((await a('POST', '/api/items/use', { itemId: 'eraser' })).body.qty, 0);
  assert.equal((await a('POST', '/api/items/use', { itemId: 'eraser' })).body.error, 'noItem');

  assert.equal((await a('PUT', '/api/looks/jiho', { equipped: { head: 'redCap' } })).status, 200);
  assert.equal((await a('PUT', '/api/looks/jiho', { equipped: { face: 'glasses' } })).body.error, 'badLook', 'not owned');
  assert.equal((await a('PUT', '/api/looks/jiho', { equipped: { face: 'redCap' } })).body.error, 'badLook', 'wrong slot');
  assert.equal((await a('PUT', '/api/looks/jiho', { equipped: { outfit: null } })).body.error, 'badLook');
  assert.equal((await a('PUT', '/api/looks/nobody', { equipped: {} })).status, 404);
  assert.deepEqual((await a('GET', '/api/me')).body.looks.jiho, { outfit: 'uniform', head: 'redCap', face: null, back: null });

  r = await a('GET', '/api/records?days=1');
  assert.equal(r.body.plays.length, 4);
});

test('photo faces are private to their owner', async () => {
  const a = client();
  const b = client();
  await a('POST', '/api/signup', { nickname: 'owner', pin: '1111' });
  await b('POST', '/api/signup', { nickname: 'other', pin: '2222' });
  assert.equal((await a('POST', '/api/characters?name=나', new Uint8Array([1, 2, 3]), { 'content-type': 'image/png' })).body.error, 'badImage');
  const r = await a('POST', '/api/characters?name=나', PNG, { 'content-type': 'image/png' });
  assert.equal(r.status, 200);
  const path = `/api/characters/${r.body.id}/face`;
  const mine = await a('GET', path);
  assert.equal(mine.status, 200);
  assert.deepEqual(new Uint8Array(mine.body), PNG);
  assert.equal((await b('GET', path)).status, 404);
  assert.equal((await client()('GET', path)).status, 401);
  assert.equal((await b('DELETE', `/api/characters/${r.body.id}`)).status, 404);
  assert.equal((await a('PATCH', '/api/settings', { character: r.body.key })).body.settings.character, r.body.key);
  assert.equal((await b('PATCH', '/api/settings', { character: r.body.key })).status, 400);
  assert.equal((await a('DELETE', `/api/characters/${r.body.id}`)).status, 200);
  assert.equal((await a('GET', path)).status, 404);
  assert.equal((await a('GET', '/api/me')).body.user.settings.character, 'sooji');
});

test('static files stay inside public/', async () => {
  const res = await fetch(base + '/%2e%2e/server/app.js');
  assert.equal(res.status, 404);
  assert.equal((await fetch(base + '/core/catalog.js')).status, 200);
});

test('admin: off without password, Basic auth, PIN reset', async () => {
  assert.equal((await fetch(base + '/admin/')).status, 404, 'disabled when ADMIN_PASSWORD is unset');

  const adb = openDb(':memory:');
  const srv = createServer(createApp({ db: adb, dataDir: mkdtempSync(join(tmpdir(), 'tg-')), adminPassword: 's3cret-pass' }));
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${srv.address().port}`;
  const basic = (p) => ({ authorization: 'Basic ' + Buffer.from('admin:' + p).toString('base64') });
  try {
    const no = await fetch(url + '/admin/');
    assert.equal(no.status, 401);
    assert.match(no.headers.get('www-authenticate'), /^Basic/);
    assert.equal((await fetch(url + '/admin/api/users', { headers: basic('wrong') })).status, 401);
    const page = await fetch(url + '/admin/', { headers: basic('s3cret-pass') });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /똑똑 놀이터 관리/);
    assert.equal((await fetch(url + '/admin', { redirect: 'manual' })).headers.get('location'), 'admin/');

    const signup = await fetch(url + '/api/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nickname: 'kid', pin: '1111' }) });
    const cookie = signup.headers.get('set-cookie').split(';')[0];
    const { users } = await (await fetch(url + '/admin/api/users', { headers: basic('s3cret-pass') })).json();
    assert.equal(users.length, 1);
    const id = users[0].id;
    const detail = await (await fetch(url + `/admin/api/users/${id}`, { headers: basic('s3cret-pass') })).json();
    assert.equal(detail.user.nickname, 'kid');
    assert.equal(detail.user.pin, undefined, 'never exposes the PIN hash');

    const reset = await fetch(url + `/admin/api/users/${id}/pin`, { method: 'POST', headers: { ...basic('s3cret-pass'), 'content-type': 'application/json' }, body: JSON.stringify({ pin: '2222' }) });
    assert.equal(reset.status, 200);
    assert.equal((await fetch(url + '/api/me', { headers: { cookie } })).status, 401, 'old sessions are dropped');
    const login = await fetch(url + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nickname: 'kid', pin: '2222' }) });
    assert.equal(login.status, 200);
    const sum = await (await fetch(url + '/admin/api/summary?tz=-540', { headers: basic('s3cret-pass') })).json();
    assert.equal(sum.totals.users, 1);
  } finally {
    srv.close();
  }
});

test('ranking: week/all, ties, hidden users, photo users show a preset face', async () => {
  const mk = async (nick) => { const c = client(); await c('POST', '/api/signup', { nickname: nick, pin: '1234' }); return c; };
  const [a, b, c] = [await mk('rank-a'), await mk('rank-b'), await mk('rank-c')];
  const play = (cl, game, key, stars, score, detail) => cl('POST', '/api/plays', { game, roundKey: key, stars, score, detail });
  await play(a, 'shooter', 'x', 3, 300);
  await play(b, 'shooter', 'x', 3, 300);
  await play(c, 'shooter', 'x', 1, 50);
  const r = await play(c, 'classroom', 'y', 2, 5, { round: 4 });
  assert.equal(r.body.weekRank, (await c('GET', '/api/ranking')).body.me.rank, 'result carries this week\'s overall rank');
  assert.equal((await c('GET', '/api/ranking')).body.me.value, 3);

  /* 지난주 기록은 주간에서 빠지고 명예의 전당에만 남습니다. */
  const uid = (await a('GET', '/api/me')).body.user.id;
  db.prepare("insert into plays (user_id, game_id, round_key, stars, score, sparkles, created_at) values (?, 'shooter', 'old', 3, 999, 0, ?)").run(uid, Date.now() - 30 * 864e5);

  let s = (await a('GET', '/api/ranking?board=shooter')).body;
  const names = (list) => list.filter((x) => x.nickname.startsWith('rank-')).map((x) => `${x.rank}:${x.nickname}:${x.value}`);
  assert.deepEqual(names(s.top), ['1:rank-a:300', '1:rank-b:300', '3:rank-c:50']);
  s = (await a('GET', '/api/ranking?board=shooter&period=all')).body;
  assert.equal(s.top[0].nickname, 'rank-a');
  assert.equal(s.top[0].value, 999);
  assert.deepEqual(s.me, { value: 999, rank: 1 });

  s = (await c('GET', '/api/ranking?board=classroom')).body;
  assert.deepEqual(names(s.top), ['1:rank-c:4']);

  /* 숨기면 목록에서 빠지지만 내 순위는 보입니다. */
  await b('PATCH', '/api/settings', { rankHidden: true });
  s = (await b('GET', '/api/ranking?board=shooter')).body;
  assert.ok(!s.top.some((x) => x.nickname === 'rank-b'));
  assert.equal(s.me.rank, 1);

  /* 사진 캐릭터를 쓰면 마지막 프리셋 얼굴 + 사진 캐릭터의 옷 */
  await a('PATCH', '/api/settings', { character: 'jiho' });
  const photo = await a('POST', '/api/characters', PNG, { 'content-type': 'image/png' });
  await a('PATCH', '/api/settings', { character: photo.body.key });
  s = (await c('GET', '/api/ranking?board=shooter')).body;
  const ra = s.top.find((x) => x.nickname === 'rank-a');
  assert.equal(ra.look.face, 'jiho');
  assert.equal(ra.look.equipped.outfit, 'uniform');
  assert.ok(!JSON.stringify(s).includes('/face'), 'no photo face urls');

  assert.equal((await a('GET', '/api/ranking?board=nope')).status, 400);
  assert.equal((await client()('GET', '/api/ranking')).status, 401);
});

test('mystery box: one free box a day, buy-and-open costs 15, prizes are applied', async () => {
  const a = client();
  let r = await a('POST', '/api/signup', { nickname: 'boxkid', pin: '1234' });
  assert.equal(r.body.gift, true);
  assert.equal(r.body.inventory.box, 1);
  r = await a('GET', '/api/me');
  assert.equal(r.body.gift, false, 'only once a day');
  assert.equal(r.body.inventory.box, 1);

  r = await a('POST', '/api/box/open', {});
  assert.equal(r.status, 200);
  assert.ok(!r.body.inventory.box);
  assert.ok(['sparkles', 'item', 'cosmetic'].includes(r.body.prize.kind));
  assert.equal((await a('POST', '/api/box/open', {})).body.error, 'noItem');
  assert.equal((await a('POST', '/api/box/open', { buy: true })).body.error, 'notEnough');

  db.prepare("update users set sparkles = 1000 where nickname = 'boxkid'").run();
  for (let i = 0; i < 20; i++) {
    const before = (await a('GET', '/api/me')).body;
    r = await a('POST', '/api/box/open', { buy: true });
    const p = r.body.prize;
    if (p.kind === 'sparkles') assert.equal(r.body.sparkles, before.user.sparkles - 15 + p.amount);
    else {
      assert.equal(r.body.sparkles, before.user.sparkles - 15);
      assert.equal(r.body.inventory[p.id], (p.kind === 'item' ? before.inventory[p.id] || 0 : 0) + 1, JSON.stringify(p));
    }
  }

  /* 다음 날이 되면 또 하나 */
  const s = JSON.parse(db.prepare("select settings from users where nickname = 'boxkid'").get().settings);
  s.dailyBox = '2000-01-01';
  db.prepare("update users set settings = ? where nickname = 'boxkid'").run(JSON.stringify(s));
  r = await a('GET', '/api/me');
  assert.equal(r.body.gift, true);
  assert.equal(r.body.inventory.box, 1);
});

test('items: buy-and-use in place, old per-game item ids are migrated', async () => {
  const a = client();
  await a('POST', '/api/signup', { nickname: 'itemkid', pin: '1234' });
  assert.equal((await a('POST', '/api/items/use', { itemId: 'time', buy: true })).body.error, 'notEnough');
  db.prepare("update users set sparkles = 40 where nickname = 'itemkid'").run();
  let r = await a('POST', '/api/items/use', { itemId: 'shield', buy: true });
  assert.deepEqual(r.body, { qty: 0, sparkles: 20 });
  assert.equal((await a('POST', '/api/items/use', { itemId: 'classroom.cheat' })).body.error, 'badItem');

  /* 예전 id 로 들어 있던 인벤토리: cookie 2 + blocks.hint 1 → hint 3, cheat 1 → eraser 1 */
  const file = join(dir, 'migrate.db');
  const old = openDb(file);
  old.prepare("insert into users (nickname, pin, created_at) values ('m', 'x', 0)").run();
  const ins = old.prepare('insert into inventory (user_id, item_id, qty) values (1, ?, ?)');
  ins.run('classroom.cookie', 2); ins.run('blocks.hint', 1); ins.run('classroom.cheat', 1); ins.run('hint', 1);
  old.close();
  for (let i = 0; i < 2; i++) {
    const again = openDb(file);
    const inv = Object.fromEntries(again.prepare('select item_id, qty from inventory order by item_id').all().map((r) => [r.item_id, r.qty]));
    assert.deepEqual(inv, { eraser: 1, hint: 4 });
    again.close();
  }
});
