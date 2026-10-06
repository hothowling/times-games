/*
 * install-ui.js - '홈 화면에 추가' 안내 팝업(휴대폰 동작 그림 포함)과 홈 화면 앱 첫 실행 보상.
 *   openInstallGuide({ auto, go, toast })  안내 팝업. auto 면 '다음에'(3일 쉬기) / '다시 보지 않기' 버튼이 붙습니다.
 *   maybeAutoShowInstall({ go, toast })   로비에서 부릅니다. 규칙(core/install.js 의 shouldAutoShow)에 맞을 때만 띄웁니다.
 *   claimInstallReward()                  홈 화면 앱(standalone)으로 실행 중이고 아직 안 받았으면 보상을 받고 축하 팝업.
 *   guideAvailable()                      휴대폰 브라우저라 안내를 보여 줄 수 있는지(로비 아이콘·설정 버튼).
 * 판별 로직은 core/install.js(순수 함수), 모양은 core/install.css.
 */
import { api } from './api.js';
import { t } from './i18n.js';
import { h, sheet } from './dom.js';
import { icon, setIconText } from './icons.js';
import { state, patch } from './state.js';
import { audio } from './audio.js';
import { INSTALL_REWARD } from './catalog.js';
import { current, canGuide, shouldAutoShow, openExternalUrl } from './install.js';

const DICT = {
  ko: {
    installLobby: '앱 설치',
    installTitle: '홈 화면에 놀이터 놓기',
    installReward: '홈 화면 아이콘으로 들어오면 ✨{n} 선물!',
    installNow: '설치하기', installLater: '다음에', installNever: '다시 보지 않기',
    installDone: '설치됐어요! 홈 화면의 아이콘으로 들어와 주세요.',
    installIosNote: '홈 화면 앱은 따로 로그인해요. 닉네임과 비밀번호로 다시 로그인하면 선물을 받아요.',
    installGuestNote: '손님 기록은 홈 화면 앱으로 옮겨지지 않아요. 먼저 계정을 만들어 주세요.',
    installGuestBtn: '계정 먼저 만들기',
    stepShareBottom: '아래쪽 공유 버튼을 눌러요 (안 보이면 ⋯ 먼저)',
    stepShareTop: '주소창 오른쪽 공유 버튼을 눌러요',
    stepDots: '오른쪽 위 ⋮ 메뉴를 눌러요',
    stepBurger: '아래쪽 ≡ 메뉴를 눌러요',
    stepAddIos: "'홈 화면에 추가'를 눌러요 (목록을 내리면 있어요)",
    stepAddAndroid: "'홈 화면에 추가'나 '앱 설치'를 눌러요",
    stepAddPage: "'현재 페이지 추가'를 눌러요",
    stepConfirmIos: "오른쪽 위 '추가'를 눌러요",
    stepConfirmAndroid: "'설치'(또는 '추가')를 눌러요",
    stepConfirmSamsung: "'홈 화면'을 골라요",
    stepHome: '홈 화면의 아이콘으로 들어와요!',
    inappTitleIos: 'Safari로 열어 주세요', inappTitleAndroid: 'Chrome으로 열어 주세요',
    inappText: '{app} 안에서는 홈 화면에 추가할 수 없어요.',
    inappIos: "화면 아래(또는 위)의 ⋯ 메뉴에서 'Safari로 열기'(또는 '다른 브라우저로 열기')를 눌러요.",
    otherIos: '이 브라우저에서는 홈 화면에 추가하기 어려워요. Safari로 열어 주세요.',
    openChrome: 'Chrome으로 열기', openSafari: 'Safari로 열기',
    copyUrl: '주소 복사', copied: '주소를 복사했어요. Chrome·Safari 주소창에 붙여 넣어 주세요.', copyFail: '복사하지 못했어요. 주소창의 주소를 길게 눌러 복사해 주세요.',
    app_kakaotalk: '카카오톡', app_instagram: '인스타그램', app_facebook: '페이스북', app_naver: '네이버 앱', app_line: '라인',
    app_band: '밴드', app_daum: '다음 앱', app_other: '이 앱',
    phAdd: '홈 화면에 추가', phInstall: '앱 설치', phCopy: '복사', phBookmark: '북마크 추가', phFind: '페이지에서 찾기',
    phAddPage: '현재 페이지 추가', phHome: '홈 화면', phQuick: '빠른 실행', phCancel: '취소', phAddBtn: '추가', phInstallBtn: '설치',
    giftTitle: '선물 도착!', giftText: '홈 화면 앱으로 들어왔어요! ✨{n} 받았어요.'
  },
  en: {
    installLobby: 'Get app',
    installTitle: 'Put us on your home screen',
    installReward: 'Open from the home screen icon and get ✨{n}!',
    installNow: 'Install', installLater: 'Later', installNever: "Don't show again",
    installDone: 'Installed! Open it from the icon on your home screen.',
    installIosNote: 'The home screen app has its own login. Log in again with your nickname and PIN to get the gift.',
    installGuestNote: "Guest progress doesn't move to the home screen app. Please make an account first.",
    installGuestBtn: 'Make an account first',
    stepShareBottom: 'Tap the Share button at the bottom (or ⋯ first)',
    stepShareTop: 'Tap Share at the right of the address bar',
    stepDots: 'Tap the ⋮ menu at the top right',
    stepBurger: 'Tap the ≡ menu at the bottom',
    stepAddIos: "Tap 'Add to Home Screen' (scroll down)",
    stepAddAndroid: "Tap 'Add to Home screen' or 'Install app'",
    stepAddPage: "Tap 'Add page to'",
    stepConfirmIos: "Tap 'Add' at the top right",
    stepConfirmAndroid: "Tap 'Install' (or 'Add')",
    stepConfirmSamsung: "Choose 'Home screen'",
    stepHome: 'Open it from your home screen!',
    inappTitleIos: 'Please open in Safari', inappTitleAndroid: 'Please open in Chrome',
    inappText: "You can't add to the home screen inside {app}.",
    inappIos: "Tap the ⋯ menu at the bottom (or top) and choose 'Open in Safari' (or 'Open in browser').",
    otherIos: 'This browser cannot add to the home screen. Please open in Safari.',
    openChrome: 'Open in Chrome', openSafari: 'Open in Safari',
    copyUrl: 'Copy link', copied: 'Link copied. Paste it into Chrome or Safari.', copyFail: "Couldn't copy. Long-press the address bar to copy.",
    app_kakaotalk: 'KakaoTalk', app_instagram: 'Instagram', app_facebook: 'Facebook', app_naver: 'the NAVER app', app_line: 'LINE',
    app_band: 'BAND', app_daum: 'the Daum app', app_other: 'this app',
    phAdd: 'Add to Home Screen', phInstall: 'Install app', phCopy: 'Copy', phBookmark: 'Add bookmark', phFind: 'Find on page',
    phAddPage: 'Add page to', phHome: 'Home screen', phQuick: 'Quick access', phCancel: 'Cancel', phAddBtn: 'Add', phInstallBtn: 'Install',
    giftTitle: 'A gift for you!', giftText: 'You came in from the home screen app! You got ✨{n}.'
  }
};
const tt = (k, vars) => t(k, vars, DICT);
export const installText = tt;

const APP_ICON = 'assets/app/icon-192.png';

/* ---------- 설치 이벤트(Android Chrome 등) ---------- */

let deferred = null;     /* beforeinstallprompt 이벤트. 있으면 진짜 '설치하기' 버튼을 보여 줍니다. */
let lastToast = null;
let openDlg = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    openDlg?.close('installed');
    lastToast?.(tt('installDone'), 4000);
  });
}

export const guideAvailable = () => canGuide(current());

function saveSetting(body) {
  patch((me) => Object.assign(me.user.settings, body));
  api('PATCH', 'settings', body).then((r) => patch((me) => { me.user.settings = r.settings; }), () => {});
}

/* ---------- 동작 그림 ---------- */

const svg = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const SVG = {
  share: svg('<path d="M12 3v11M8 7l4-4 4 4"/><path d="M8 10H6v10h12V10h-2"/>'),
  dots: svg('<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>'),
  burger: svg('<path d="M5 7h14M5 12h14M5 17h14"/>'),
  add: svg('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>'),
  copy: svg('<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V5h10"/>'),
  book: svg('<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>'),
  find: svg('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  fwd: svg('<path d="M9 5l7 7-7 7"/>'),
  tabs: svg('<rect x="4" y="7" width="13" height="13" rx="2"/><path d="M8 4h12v12"/>'),
  home: svg('<path d="M4 11l8-7 8 7v9H4z"/>')
};
const ico = (name) => { const s = h('span', { class: 'ig-svg' }); s.innerHTML = SVG[name]; return s; };

/*
 * 기기별 그림 설정. bar: 버튼이 있는 줄(top | bottom), btn: 누를 버튼, menu: sheet(아래에서 올라옴) | drop(오른쪽 위에서 펼쳐짐),
 * rows: 메뉴 줄(target 이 누를 줄), dialog: ios(위쪽 '추가') | android(가운데 '설치') | list(가운데 목록에서 '홈 화면').
 */
const VARIANTS = {
  'ios-safari': { bar: 'bottom', btn: 'share', menu: 'sheet', rows: [['copy', 'phCopy'], ['book', 'phBookmark'], ['add', 'phAdd', true], ['find', 'phFind']], dialog: 'ios',
    steps: ['stepShareBottom', 'stepAddIos', 'stepConfirmIos', 'stepHome'] },
  'ios-chrome': { bar: 'top', btn: 'share', menu: 'sheet', rows: [['copy', 'phCopy'], ['book', 'phBookmark'], ['add', 'phAdd', true], ['find', 'phFind']], dialog: 'ios',
    steps: ['stepShareTop', 'stepAddIos', 'stepConfirmIos', 'stepHome'] },
  'android-chrome': { bar: 'top', btn: 'dots', menu: 'drop', rows: [['book', 'phBookmark'], ['find', 'phFind'], ['add', 'phAdd', true], ['copy', 'phCopy']], dialog: 'android',
    steps: ['stepDots', 'stepAddAndroid', 'stepConfirmAndroid', 'stepHome'] },
  'android-samsung': { bar: 'bottom', btn: 'burger', menu: 'sheet', rows: [['book', 'phBookmark'], ['add', 'phAddPage', true], ['find', 'phFind'], ['copy', 'phCopy']], dialog: 'list',
    steps: ['stepBurger', 'stepAddPage', 'stepConfirmSamsung', 'stepHome'] }
};
VARIANTS['android-other'] = VARIANTS['android-chrome'];

function buildPhone(v) {
  const btn = h('span', { class: 'ig-btn' }, ico(v.btn));
  /* 브라우저 줄: iOS Safari 는 아래 도구 막대(◀ ▶ 공유 책 탭), 나머지는 주소창 + 버튼. */
  const bar = v.bar === 'bottom' && v.btn === 'share'
    ? h('div', { class: 'ig-bar is-bottom is-tools' }, ico('back'), ico('fwd'), btn, ico('book'), ico('tabs'))
    : v.bar === 'bottom'
      ? h('div', { class: 'ig-bar is-bottom is-tools' }, ico('back'), ico('fwd'), ico('home'), ico('tabs'), btn)
      : h('div', { class: 'ig-bar is-top' }, h('span', { class: 'ig-url' }), btn);
  const url = v.bar === 'bottom' ? h('div', { class: 'ig-bar is-top is-url-only' }, h('span', { class: 'ig-url' })) : null;
  const page = h('div', { class: 'ig-page' },
    h('i', { class: 'ig-blk is-head' }), h('i', { class: 'ig-blk is-hero' }), h('i', { class: 'ig-blk' }), h('i', { class: 'ig-blk' }), h('i', { class: 'ig-blk' }));
  let target = null;
  const rows = v.rows.map(([i, label, hit]) => {
    const r = h('div', { class: 'ig-row' + (hit ? ' is-target' : '') }, ico(i), h('span', null, tt(label)));
    if (hit) target = r;
    return r;
  });
  const menu = h('div', { class: 'ig-menu is-' + v.menu }, v.menu === 'sheet' ? h('i', { class: 'ig-grab' }) : null, ...rows);

  const appImg = () => h('img', { src: APP_ICON, alt: '' });
  let confirm;
  let dialog;
  if (v.dialog === 'ios') {
    confirm = h('b', { class: 'ig-confirm' }, tt('phAddBtn'));
    dialog = h('div', { class: 'ig-dialog is-ios' },
      h('div', { class: 'ig-dlg-head' }, h('span', null, tt('phCancel')), h('span', null, tt('phAdd')), confirm),
      h('div', { class: 'ig-dlg-app' }, appImg(), h('span', null, t('appTitle'))));
  } else if (v.dialog === 'android') {
    confirm = h('b', { class: 'ig-confirm' }, tt('phInstallBtn'));
    dialog = h('div', { class: 'ig-dialog is-card' },
      h('span', { class: 'ig-dlg-title' }, tt('phInstall')),
      h('div', { class: 'ig-dlg-app' }, appImg(), h('span', null, t('appTitle'))),
      h('div', { class: 'ig-dlg-btns' }, h('span', null, tt('phCancel')), confirm));
  } else {
    confirm = h('div', { class: 'ig-row ig-confirm' }, ico('home'), h('span', null, tt('phHome')));
    dialog = h('div', { class: 'ig-dialog is-card' },
      h('span', { class: 'ig-dlg-title' }, tt('phAddPage')),
      h('div', { class: 'ig-row' }, ico('book'), h('span', null, tt('phBookmark'))),
      confirm,
      h('div', { class: 'ig-row' }, ico('fwd'), h('span', null, tt('phQuick'))));
  }

  /* 홈 화면: 다른 앱 칸들 사이에 우리 아이콘이 통통 튀며 나타납니다. */
  const apps = [];
  const hues = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c', '#94a3b8', '#4ade80', '#38bdf8'];
  for (let i = 0; i < 12; i++) {
    if (i === 6) {
      apps.push(h('div', { class: 'ig-app is-ours' },
        h('span', { class: 'ig-app-icon' }, appImg(), h('i', { class: 'ig-spark s1' }), h('i', { class: 'ig-spark s2' }), h('i', { class: 'ig-spark s3' }), h('i', { class: 'ig-spark s4' }),
          h('b', { class: 'ig-plus' }, '+' + INSTALL_REWARD)),
        h('small', null, t('appTitle'))));
    } else apps.push(h('div', { class: 'ig-app' }, h('span', { class: 'ig-app-icon', style: `background:${hues[i % hues.length]}` }), h('small')));
  }
  const ours = apps[6];
  const home = h('div', { class: 'ig-home' }, h('div', { class: 'ig-grid' }, apps),
    h('div', { class: 'ig-dock' }, ...['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'].map((c) => h('span', { style: `background:${c}` }))));

  const finger = h('i', { class: 'ig-finger' });
  const screen = h('div', { class: 'ig-screen' }, url, page, bar, menu, dialog, home, finger);
  const phone = h('div', { class: `ig-phone is-${v.menu} is-dlg-${v.dialog}`, 'aria-hidden': 'true' }, h('i', { class: 'ig-notch' }), screen);
  return { phone, screen, finger, targets: [btn, target, confirm, ours] };
}

/* el 의 가운데가 root 안에서 어디인지(transform 은 빼고 레이아웃 위치로) */
function centerIn(el, root) {
  /* 메뉴 줄은 글자를 가리지 않게 오른쪽을 누릅니다. */
  let x = el.offsetWidth * (el.classList.contains('ig-row') ? 0.8 : 0.5), y = el.offsetHeight / 2;
  for (let n = el; n && n !== root; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
  return [x, y];
}

const STEP_MS = [2600, 2600, 2400, 3400];

function animate(guide, phone, finger, targets, list) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { guide.dataset.step = '2'; guide.classList.add('is-static'); return () => {}; }
  let step = 0;
  let timer = null;
  const screen = finger.parentElement;
  function next() {
    step = step % 4 + 1;
    guide.dataset.step = String(step);
    [...list.children].forEach((li, i) => li.toggleAttribute('aria-current', i === step - 1));
    const [x, y] = step === 4 ? [screen.clientWidth * 0.62, screen.clientHeight * 0.7] : centerIn(targets[step - 1], screen);
    finger.style.setProperty('--fx', x + 'px');
    finger.style.setProperty('--fy', y + 'px');
    timer = setTimeout(next, STEP_MS[step - 1]);
  }
  /* 처음 위치는 화면 가운데 */
  finger.style.setProperty('--fx', screen.clientWidth / 2 + 'px');
  finger.style.setProperty('--fy', screen.clientHeight * 0.6 + 'px');
  timer = setTimeout(next, 350);
  return () => clearTimeout(timer);
}

/* ---------- 안내 팝업 ---------- */

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(location.href);
    lastToast?.(tt('copied'), 3500);
  } catch {
    lastToast?.(tt('copyFail'), 3500);
  }
}

function inAppBody(info) {
  const ios = info.os === 'ios';
  const ext = openExternalUrl(info, location.href);
  const app = tt('app_' + (info.inApp || 'other'));
  return [
    h('p', null, info.mode === 'ios-other' ? tt('otherIos') : tt('inappText', { app })),
    ext ? h('a', { class: 'btn', href: ext }, tt(ios ? 'openSafari' : 'openChrome')) : null,
    ios && !ext && info.mode !== 'ios-other' ? h('p', { class: 'ig-tip' }, tt('inappIos')) : null,
    h('button', { type: 'button', class: 'btn btn-sub', onclick: copyUrl }, tt('copyUrl'))
  ];
}

export function openInstallGuide({ auto = false, go, toast } = {}) {
  if (openDlg) return openDlg;
  lastToast = toast || lastToast;
  const info = current();
  if (!canGuide(info)) return null;
  const me = state.me;
  const outside = info.mode === 'inapp' || info.mode === 'ios-other';
  let choice = null;
  let stop = () => {};

  const reward = h('p', { class: 'ig-reward' });
  setIconText(reward, tt('installReward', { n: INSTALL_REWARD }));
  const body = [];
  if (outside) {
    body.push(...inAppBody(info));
  } else {
    const v = VARIANTS[info.mode];
    const { phone, finger, targets } = buildPhone(v);
    const list = h('ol', { class: 'ig-steps' }, v.steps.map((k) => {
      const li = h('li');
      setIconText(li, tt(k));
      return li;
    }));
    const guide = h('div', { class: 'ig-guide' }, phone, list);
    body.push(guide);
    requestAnimationFrame(() => { stop = animate(guide, phone, finger, targets, list); });
    if (info.os === 'ios') {
      body.push(h('p', { class: 'ig-tip' }, tt('installIosNote')));
      if (me?.user.guest && go) {
        body.push(h('p', { class: 'ig-tip is-warn' }, tt('installGuestNote')),
          h('button', { type: 'button', class: 'btn btn-sub', onclick: () => { dlg.close('account'); go('login?upgrade=1'); } }, tt('installGuestBtn')));
      }
    }
    if (deferred && info.os === 'android') {
      body.unshift(h('button', { type: 'button', class: 'btn ig-install', async onclick() {
        const e = deferred;
        if (!e) return;
        deferred = null;
        e.prompt();
        const r = await e.userChoice.catch(() => null);
        if (r?.outcome === 'accepted') { dlg.close('installed'); toast?.(tt('installDone'), 4000); }
      } }, tt('installNow')));
    }
  }

  const buttons = auto
    ? [h('button', { type: 'button', class: 'btn btn-sub', onclick: () => dlg.close('later') }, tt('installLater')),
      h('button', { type: 'button', class: 'btn-link ig-never', onclick: () => { choice = 'never'; dlg.close('never'); } }, tt('installNever'))]
    : [h('button', { type: 'button', class: 'btn btn-sub', onclick: () => dlg.close('close') }, t('close'))];

  const title = outside ? tt(info.os === 'ios' ? 'inappTitleIos' : 'inappTitleAndroid') : tt('installTitle');
  const dlg = sheet(h('h2', null, title), me?.installRewarded ? null : reward, ...body, ...buttons);
  dlg.classList.add('install-sheet');
  openDlg = dlg;
  dlg.addEventListener('close', () => {
    stop();
    openDlg = null;
    /* 저절로 뜬 팝업: '다시 보지 않기'가 아니면 어떻게 닫든 3일 쉽니다(설치했으면 보상 때 다시 안 뜸). */
    if (auto) saveSetting(choice === 'never' ? { installNever: true } : { installSnooze: true });
  });
  return dlg;
}

let autoShown = false;
export function maybeAutoShowInstall({ go, toast }) {
  const info = current();
  if (!shouldAutoShow(info, { me: state.me, shown: autoShown })) return;
  autoShown = true;
  /* 로비가 먼저 그려진 뒤에 띄웁니다. 그새 다른 화면으로 갔거나 다른 팝업이 떠 있으면 이번에는 넘어갑니다. */
  setTimeout(() => {
    const onLobby = /^#?\/?(lobby)?$/.test(location.hash);
    if (!onLobby || document.querySelector('dialog[open]')) { autoShown = false; return; }
    openInstallGuide({ auto: true, go, toast });
  }, 700);
}

/* ---------- 홈 화면 앱 보상 ---------- */

let claiming = false;
export async function claimInstallReward() {
  const info = current();
  if (info.mode !== 'standalone' || !state.me || state.me.installRewarded || claiming) return;
  claiming = true;
  try {
    /* standalone 은 브라우저가 알려 주는 값이라 꾸밀 수 있습니다. 계정마다 한 번, 30 이라 그대로 믿습니다. */
    const r = await api('POST', 'reward/install', { standalone: true, platform: info.os });
    patch((me) => { me.user.sparkles = r.sparkles; me.installRewarded = true; });
    if (r.granted) celebrate(r.amount);
  } catch { /* 다음 실행 때 다시 해 봅니다 */ } finally {
    claiming = false;
  }
}

function celebrate(n) {
  const text = h('p');
  setIconText(text, tt('giftText', { n }));
  const dlg = sheet(
    h('h2', null, tt('giftTitle')),
    icon('sparkle', 'box-gift'),
    text,
    h('button', { type: 'button', class: 'btn', onclick: () => dlg.close() }, t('boxOk')));
  dlg.classList.add('box-sheet');
  audio.fanfare();
}
