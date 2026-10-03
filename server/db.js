/*
 * db.js - SQLite(node:sqlite) 열기와 스키마. 파일 하나(data/games.db)라 백업은 파일 복사로 끝납니다.
 */
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
create table if not exists users (
  id integer primary key,
  nickname text not null unique collate nocase,
  pin text not null,                       -- scrypt 'salt:hash'
  sparkles integer not null default 0,
  settings text not null default '{}',     -- { lang, sound, tts, character }
  fails integer not null default 0,        -- 연속 로그인 실패
  locked_until integer not null default 0,
  created_at integer not null
);
create table if not exists sessions (
  token text primary key,                  -- sha256(쿠키 값)
  user_id integer not null references users(id) on delete cascade,
  expires_at integer not null
);
create table if not exists characters (    -- 사진 캐릭터만. 얼굴 그림은 data/faces/<id>
  id integer primary key,
  user_id integer not null references users(id) on delete cascade,
  name text not null,
  mime text not null,
  created_at integer not null
);
create table if not exists looks (         -- 캐릭터별 착용 상태. char_key: 'sooji' | 'jiho' | 'p<id>'
  user_id integer not null references users(id) on delete cascade,
  char_key text not null,
  equipped text not null,
  primary key (user_id, char_key)
);
create table if not exists inventory (
  user_id integer not null references users(id) on delete cascade,
  item_id text not null,
  qty integer not null,
  primary key (user_id, item_id)
);
create table if not exists progress (      -- 게임별 진행도(JSON)
  user_id integer not null references users(id) on delete cascade,
  game_id text not null,
  data text not null,
  primary key (user_id, game_id)
);
create table if not exists plays (
  id integer primary key,
  user_id integer not null references users(id) on delete cascade,
  game_id text not null,
  round_key text not null,
  char_key text,
  stars integer not null,
  score integer,
  detail text,
  sparkles integer not null,
  created_at integer not null,
  unique (user_id, game_id, round_key)
);
create index if not exists plays_user_time on plays (user_id, created_at);
create table if not exists sparkle_log (
  id integer primary key,
  user_id integer not null references users(id) on delete cascade,
  delta integer not null,
  reason text not null,                    -- 'play' | 'buy'
  ref text,
  created_at integer not null
);
`;

export function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec('pragma journal_mode = wal; pragma foreign_keys = on;');
  db.exec(SCHEMA);
  return db;
}

/* fn 안의 쿼리를 한 트랜잭션으로 묶습니다. 중간에 throw 하면 전부 되돌립니다. */
export function tx(db, fn) {
  db.exec('begin');
  try {
    const out = fn();
    db.exec('commit');
    return out;
  } catch (err) {
    db.exec('rollback');
    throw err;
  }
}
