import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../server/db.js';
import { COSMETICS, validLook } from '../public/core/catalog.js';

test('legacy white tee becomes an empty outfit slot and disappears from inventory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tg-base-outfit-'));
  const file = join(dir, 'test.db');
  let db;
  try {
    db = openDb(file);
    db.prepare('insert into users (id, nickname, pin, created_at) values (1, ?, ?, 0)').run('old-tee', 'test');
    db.prepare('insert into inventory values (1, ?, 1)').run('whiteTee');
    db.prepare('insert into looks values (1, ?, ?)').run('nayeon', JSON.stringify({ outfit: 'whiteTee', head: 'redCap', pet: 'petPuppy' }));
    db.close();
    db = openDb(file);
    const look = JSON.parse(db.prepare('select equipped from looks').get().equipped);
    assert.deepEqual(look, { outfit: null, head: 'redCap', pet: 'petPuppy' });
    assert.ok(validLook(look, () => true));
    assert.equal(db.prepare("select qty from inventory where item_id = 'whiteTee'").get(), undefined);
    assert.equal(COSMETICS.whiteTee, undefined);
  } finally {
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('retired backpack is unselected on startup, preserving other wearables and ownership', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tg-wearables-'));
  const file = join(dir, 'test.db');
  let db;
  try {
    db = openDb(file);
    db.prepare('insert into users (id, nickname, pin, created_at) values (1, ?, ?, 0)').run('old-user', 'test');
    db.prepare('insert into inventory values (1, ?, 1)').run('backpack');
    db.prepare('insert into looks values (1, ?, ?)').run('jiho', JSON.stringify({ outfit: 'uniform', head: 'redCap', face: 'glasses', back: 'backpack' }));
    db.close();
    db = openDb(file);
    const look = JSON.parse(db.prepare('select equipped from looks').get().equipped);
    assert.deepEqual(look, { outfit: 'uniform', head: 'redCap', face: 'glasses', back: null });
    assert.ok(validLook(look, () => true));
    assert.equal(db.prepare("select qty from inventory where item_id = 'backpack'").get().qty, 1);
    assert.equal(COSMETICS.backpack, undefined);
    db.close();
    db = openDb(file);
    assert.deepEqual(JSON.parse(db.prepare('select equipped from looks').get().equipped), look);
  } finally {
    db?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
