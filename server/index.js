/*
 * index.js - 서버 실행. 켤 때 git 커밋(해시·날짜)을 읽어 /api/version 으로 알려 줍니다. PORT(기본 8010), DATA_DIR(기본 ./data), ADMIN_PASSWORD(없으면 관리자 페이지 꺼짐).
 *   node server/index.js
 */
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { createApp } from './app.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || join(root, 'data');
const port = Number(process.env.PORT) || 8010;
const host = process.env.HOST || '127.0.0.1';

mkdirSync(dataDir, { recursive: true });
/* 지금 돌고 있는 코드의 커밋. 배포(deploy/deploy.sh)가 서비스를 다시 켜므로 켤 때 한 번 읽으면 됩니다. */
let version = { commit: null, date: null };
try {
  const [commit, date] = execFileSync('git', ['log', '-1', '--format=%h%n%cI'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
  version = { commit, date };
} catch { /* git 이 없거나 저장소가 아니면 비워 둡니다. */ }

const db = openDb(join(dataDir, 'games.db'));
createServer(createApp({ db, dataDir, adminPassword: process.env.ADMIN_PASSWORD, version })).listen(port, host, () => {
  console.log(`times-games http://${host}:${port}/`);
});
