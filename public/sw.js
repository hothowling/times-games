/*
 * sw.js - 홈 화면 앱 설치를 위한 최소 서비스 워커(범위: 앱 루트 ./).
 * 아무것도 캐시하지 않습니다. 배포 직후에도 늘 서버의 새 파일을 받도록(서버가 no-cache + Last-Modified 로 확인)
 * 화면 이동(navigate)만 네트워크로 그대로 받고, 연결이 끊겼을 때만 짧은 안내 페이지를 보여 줍니다.
 * 그 밖의 요청(JS·CSS·그림·API)은 건드리지 않습니다.
 */
const OFFLINE = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>똑똑 놀이터</title>
<style>body{margin:0;min-height:100vh;display:grid;place-content:center;gap:12px;padding:24px;text-align:center;
font-family:system-ui,-apple-system,sans-serif;background:#faf5ff;color:#2e1065}
a{display:inline-block;padding:12px 24px;border-radius:16px;background:#7c3aed;color:#fff;text-decoration:none;font-size:18px}</style>
</head><body><p style="font-size:44px;margin:0">📶</p><p>인터넷에 연결되지 않았어요.<br>No internet connection.</p>
<p><a href="./">다시 해 보기 · Retry</a></p></body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { 'content-type': 'text/html; charset=utf-8' } })));
});
