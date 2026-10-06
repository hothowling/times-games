import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detect, shouldAutoShow, openExternalUrl, canGuide } from '../public/core/install.js';

const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1',
  ipadDesktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
  kakaoAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.7204.157 Mobile Safari/537.36;KAKAOTALK 2511450',
  kakaoIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 25.6.1',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 389.0.0.28.88 (iPhone15,3; iOS 18_5; ko_KR; ko; scale=3.00; 1290x2796; 123456789)',
  naverAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-G991N Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.10.1)',
  desktopChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
};

test('detect: platform, browser and guide mode', () => {
  const pick = (ua, opts) => { const d = detect(ua, opts); return [d.os, d.browser, d.inApp, d.mode]; };
  assert.deepEqual(pick(UA.iosSafari), ['ios', 'safari', null, 'ios-safari']);
  assert.deepEqual(pick(UA.iosChrome), ['ios', 'chrome', null, 'ios-chrome']);
  assert.deepEqual(pick(UA.ipadDesktop, { maxTouchPoints: 5 }), ['ios', 'safari', null, 'ios-safari'], 'iPadOS pretends to be a Mac');
  assert.deepEqual(pick(UA.ipadDesktop, { maxTouchPoints: 0 }), ['desktop', 'other', null, 'desktop'], 'a real Mac');
  assert.deepEqual(pick(UA.androidChrome), ['android', 'chrome', null, 'android-chrome']);
  assert.deepEqual(pick(UA.samsung), ['android', 'samsung', null, 'android-samsung']);
  assert.deepEqual(pick(UA.kakaoAndroid), ['android', 'webview', 'kakaotalk', 'inapp']);
  assert.deepEqual(pick(UA.kakaoIos), ['ios', 'other', 'kakaotalk', 'inapp']);
  assert.deepEqual(pick(UA.instagram), ['ios', 'other', 'instagram', 'inapp']);
  assert.deepEqual(pick(UA.naverAndroid), ['android', 'webview', 'naver', 'inapp']);
  assert.deepEqual(pick(UA.desktopChrome), ['desktop', 'other', null, 'desktop']);
  assert.equal(detect(UA.iosSafari, { standalone: true }).mode, 'standalone');
  assert.equal(detect(UA.androidChrome, { standalone: true }).os, 'android');
  assert.equal(canGuide(detect(UA.desktopChrome)), false);
  assert.equal(canGuide(detect(UA.kakaoIos)), true);
});

test('shouldAutoShow: mobile browser, not rewarded, not dismissed, once per visit', () => {
  const info = detect(UA.iosSafari);
  const me = (settings = {}, installRewarded = false) => ({ installRewarded, user: { settings } });
  const now = 1_000_000;
  assert.equal(shouldAutoShow(info, { me: me(), now }), true);
  assert.equal(shouldAutoShow(info, { me: me(), now, shown: true }), false);
  assert.equal(shouldAutoShow(info, { me: me({}, true), now }), false);
  assert.equal(shouldAutoShow(info, { me: me({ installNever: true }), now }), false);
  assert.equal(shouldAutoShow(info, { me: me({ installSnoozeUntil: now + 1 }), now }), false);
  assert.equal(shouldAutoShow(info, { me: me({ installSnoozeUntil: now - 1 }), now }), true);
  assert.equal(shouldAutoShow(detect(UA.desktopChrome), { me: me(), now }), false);
  assert.equal(shouldAutoShow(detect(UA.iosSafari, { standalone: true }), { me: me(), now }), false);
  assert.equal(shouldAutoShow(info, { me: null, now }), false);
});

test('openExternalUrl: KakaoTalk scheme, Android Chrome intent, iOS menu only', () => {
  const url = 'https://ics.jotanow.site/games/#/lobby';
  assert.equal(openExternalUrl(detect(UA.kakaoIos), url), 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url));
  assert.equal(openExternalUrl(detect(UA.kakaoAndroid), url), 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url));
  assert.equal(openExternalUrl(detect(UA.naverAndroid), url), 'intent://ics.jotanow.site/games/#Intent;scheme=https;package=com.android.chrome;end');
  assert.equal(openExternalUrl(detect(UA.instagram), url), null);
});
