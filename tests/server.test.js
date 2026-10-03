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
  let r = await a('POST', '/api/plays', { game: 'blocks', roundKey: 'r1', stars: 3, score: 10 });
  assert.deepEqual(r.body, { earned: 10, sparkles: 10 });
  r = await a('POST', '/api/plays', { game: 'blocks', roundKey: 'r1', stars: 3 });
  assert.deepEqual(r.body, { earned: 10, sparkles: 10 }, 'same roundKey pays once');
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
  r = await a('POST', '/api/shop/buy', { itemId: 'classroom.cheat' });
  assert.equal((await a('POST', '/api/items/use', { itemId: 'classroom.cheat' })).body.qty, 0);
  assert.equal((await a('POST', '/api/items/use', { itemId: 'classroom.cheat' })).body.error, 'noItem');

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
    assert.match(await page.text(), /구구단 놀이터 관리/);
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
