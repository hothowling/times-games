/*
 * db.js - SQLite(node:sqlite) 열기와 스키마. 파일 하나(data/games.db)라 백업은 파일 복사로 끝납니다.
 */
import { DatabaseSync } from 'node:sqlite';
import { ITEM_RENAME } from '../public/core/catalog.js';

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
create table if not exists looks (         -- 캐릭터별 착용 상태. char_key: 프리셋 키 | 'p<id>'
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
create index if not exists plays_time on plays (created_at);  -- 주간 랭킹
create table if not exists sparkle_log (
  id integer primary key,
  user_id integer not null references users(id) on delete cascade,
  delta integer not null,
  reason text not null,                    -- 'play' | 'buy' | 'box' | 'install'
  ref text,
  created_at integer not null
);
-- 홈 화면 앱 보상은 계정마다 한 번: 같은 사용자의 'install' 줄은 하나만(조회에도 씁니다).
create unique index if not exists sparkle_log_install on sparkle_log (user_id) where reason = 'install';
`;

export function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec('pragma journal_mode = wal; pragma foreign_keys = on;');
  db.exec(SCHEMA);
  /* 손님 계정(로그인 화면의 '손님으로 해 보기'). 예전 DB 에는 열이 없어서 더합니다. */
  if (!db.prepare("select 1 from pragma_table_info('users') where name = 'guest'").get()) {
    db.exec('alter table users add column guest integer not null default 0');
  }
  migrateItems(db);
  /* 판매 종료된 가방을 해제해 이후 다른 장식으로 갈아입을 때도 유효한 착용 상태를 유지합니다. */
  db.exec("update looks set equipped = json_set(equipped, '$.back', null) where json_extract(equipped, '$.back') = 'backpack'");
  /* 기본 티셔츠는 상품이 아닌 의상 미선택 상태로 바꿉니다. */
  db.exec("update looks set equipped = json_set(equipped, '$.outfit', null) where json_extract(equipped, '$.outfit') = 'whiteTee'; delete from inventory where item_id = 'whiteTee'");
  return db;
}

/* 예전 게임별 아이템을 공통 아이템 id 로 옮깁니다(개수는 더함). 옮길 게 없으면 아무것도 안 하므로 매번 불러도 됩니다. */
function migrateItems(db) {
  const move = db.prepare(`insert into inventory (user_id, item_id, qty) select user_id, ?, qty from inventory where item_id = ? and qty > 0
    on conflict do update set qty = qty + excluded.qty`);
  const drop = db.prepare('delete from inventory where item_id = ?');
  tx(db, () => {
    for (const [from, to] of Object.entries(ITEM_RENAME)) {
      move.run(to, from);
      drop.run(from);
    }
  });
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
