/*
 * index.js - 서버 실행. PORT(기본 8010), DATA_DIR(기본 ./data).
 *   node server/index.js
 */
import { createServer } from 'node:http';
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
const db = openDb(join(dataDir, 'games.db'));
createServer(createApp({ db, dataDir })).listen(port, host, () => {
  console.log(`times-games http://${host}:${port}/`);
});
