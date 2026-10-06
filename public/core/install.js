/*
 * install.js - '홈 화면에 추가' 안내에 쓰는 순수 로직(DOM 없음, node 테스트: tests/install.test.js).
 *   detect(ua, { standalone, maxTouchPoints })  → { os, browser, inApp, standalone, mode }
 *   current()                                   → 지금 브라우저로 detect
 *   shouldAutoShow(info, { me, now, shown })    → 로비에서 안내 팝업을 저절로 띄울지
 *   openExternalUrl(info, url)                  → 인앱 브라우저에서 Chrome/Safari 로 여는 주소(없으면 null)
 * 팝업과 동작 그림은 core/install-ui.js.
 *
 * mode:
 *   'standalone'      이미 홈 화면 앱으로 실행 중
 *   'desktop'         컴퓨터(안내하지 않음)
 *   'inapp'           카카오톡·인스타그램 등 앱 안 브라우저 → Chrome/Safari 로 열어 달라고 안내
 *   'ios-safari'      공유 → 홈 화면에 추가 → 추가
 *   'ios-chrome'      (iOS 16.4+) 주소창 오른쪽 공유 → 홈 화면에 추가 → 추가 (Edge·Firefox 도 같은 흐름)
 *   'ios-other'       iOS 의 알 수 없는 브라우저 → Safari 로 열어 달라고 안내
 *   'android-chrome'  설치 버튼(beforeinstallprompt) 또는 ⋮ → 홈 화면에 추가
 *   'android-samsung' 아래 ≡ → 현재 페이지 추가 → 홈 화면
 *   'android-other'   브라우저 메뉴 → 홈 화면에 추가
 */
const IN_APP = [
  ['kakaotalk', /KAKAOTALK/i],
  ['instagram', /Instagram/i],
  ['facebook', /FBAN|FBAV|FB_IAB|FBIOS/],
  ['naver', /NAVER\(inapp|\bNAVER\b/i],
  ['line', /\bLine\/\d/i],
  ['band', /\bBAND\/\d/i],
  ['daum', /DaumApps|DaumDevice/i]
];

export function detect(ua = '', { standalone = false, maxTouchPoints = 0 } = {}) {
  ua = String(ua);
  /* iPadOS 13+ 는 기본으로 Mac 처럼 보입니다. 터치가 되면 iPad 로 봅니다. */
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  const android = !ios && /Android/i.test(ua);
  const os = ios ? 'ios' : android ? 'android' : 'desktop';
  const inApp = os === 'desktop' ? null : (IN_APP.find(([, re]) => re.test(ua))?.[0] || null);

  let browser = 'other';
  if (ios) {
    if (/CriOS\//.test(ua)) browser = 'chrome';
    else if (/EdgiOS\//.test(ua)) browser = 'edge';
    else if (/FxiOS\//.test(ua)) browser = 'firefox';
    else if (/Version\/[\d.]+.*Safari\//.test(ua)) browser = 'safari';
  } else if (android) {
    if (/SamsungBrowser\//.test(ua)) browser = 'samsung';
    else if (/Firefox\//.test(ua)) browser = 'firefox';
    else if (/EdgA\//.test(ua)) browser = 'edge';
    else if (/; wv\)/.test(ua) || /Version\/[\d.]+ Chrome\//.test(ua)) browser = 'webview';
    else if (/Chrome\//.test(ua)) browser = 'chrome';
  }

  let mode;
  if (standalone) mode = 'standalone';
  else if (os === 'desktop') mode = 'desktop';
  else if (inApp) mode = 'inapp';
  else if (ios) mode = browser === 'safari' ? 'ios-safari' : ['chrome', 'edge', 'firefox'].includes(browser) ? 'ios-chrome' : 'ios-other';
  else mode = browser === 'chrome' ? 'android-chrome' : browser === 'samsung' ? 'android-samsung' : browser === 'webview' ? 'inapp' : 'android-other';

  return { os, browser, inApp, standalone: !!standalone, mode };
}

/* 브라우저에서 지금 상태로 detect. */
export function current() {
  const standalone = (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  return detect(navigator.userAgent, { standalone, maxTouchPoints: navigator.maxTouchPoints || 0 });
}

/* 안내를 보여 줄 수 있는 환경인지(휴대폰·태블릿 브라우저, 아직 홈 화면 앱이 아님). */
export const canGuide = (info) => info.mode !== 'standalone' && info.mode !== 'desktop';

/*
 * 로비에서 저절로 띄울지: 휴대폰 브라우저 + 아직 보상 전 + '다시 보지 않기' 아님 + '다음에'(3일) 지남 + 이번 접속에 아직 안 띄움.
 * me 는 /api/me 결과(installRewarded, user.settings).
 */
export function shouldAutoShow(info, { me, now = Date.now(), shown = false } = {}) {
  if (!me || shown || !canGuide(info) || me.installRewarded) return false;
  const s = me.user?.settings || {};
  if (s.installNever) return false;
  return !(Number(s.installSnoozeUntil) > now);
}

/* 인앱 브라우저 → 바깥 브라우저로 여는 주소. iOS 의 카카오톡 말고는 앱 메뉴의 'Safari 로 열기'를 써야 해서 null. */
export function openExternalUrl(info, url) {
  if (info.inApp === 'kakaotalk') return 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
  if (info.inApp === 'line') {
    const u = new URL(url);
    u.searchParams.set('openExternalBrowser', '1');
    return u.href;
  }
  if (info.os === 'android') {
    /* intent 주소의 '#Intent' 앞에는 # 이 또 올 수 없어 해시(#/lobby)는 뺍니다. 없으면 로비로 열립니다. */
    const u = new URL(url);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;end`;
  }
  return null;
}
