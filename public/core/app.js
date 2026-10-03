/*
 * app.js - 앱 시작, hash 라우팅, 상단 바, 설정, 토스트, 게임 실행(ctx).
 *   #/login  #/lobby  #/chars  #/shop  #/records  #/ranking  #/play/<게임 id>
 */
import { api } from './api.js';
import { audio } from './audio.js';
import * as i18n from './i18n.js';
import { state, bus, loadMe, settings, patch, lookFor, currentKey, characterName } from './state.js';
import { createCharacter } from './character.js';
import { ITEMS } from './catalog.js';
import { GAMES } from '../games/index.js';

const $ = (id) => document.getElementById(id);
const t = i18n.t;

const SCREENS = {
  login: () => import('../screens/login.js'),
  lobby: () => import('../screens/lobby.js'),
  chars: () => import('../screens/chars.js'),
  shop: () => import('../screens/shop.js'),
  records: () => import('../screens/records.js'),
  ranking: () => import('../screens/ranking.js'),
  play: null
};

let cleanup = null;
let routeToken = 0;

/* ---------- 토스트 ---------- */

let toastTimer = null;
export function toast(msg, ms = 2200) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

/* 에러 코드 → 사용자 문구 */
export const errorText = (err) => t(err?.code || 'server');

export function go(path) {
  if (location.hash === '#/' + path) route();
  else location.hash = '#/' + path;
}

/* ---------- 상단 바 ---------- */

let tbChar = null;
let lastSparkles = null;

function renderTopbar() {
  if (!state.me) return;
  const look = lookFor();
  if (!tbChar) tbChar = createCharacter($('tb-face'), look, { body: false });
  else if (tbChar.look.key !== look.key || JSON.stringify(tbChar.look.equipped) !== JSON.stringify(look.equipped)) tbChar.update(look);
  $('tb-name').textContent = state.me.user.nickname;
  const n = state.me.user.sparkles;
  $('tb-sparkles').textContent = n;
  if (lastSparkles !== null && n > lastSparkles) {
    const box = $('tb-sparkles').parentElement;
    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');
  }
  lastSparkles = n;
}

/* ---------- 설정 ---------- */

async function saveSetting(body) {
  patch((me) => Object.assign(me.user.settings, body));
  try { await api('PATCH', 'settings', body); } catch (err) { toast(errorText(err)); }
}

function applySettings() {
  const s = settings();
  i18n.setLang(s.lang || i18n.detect());
  audio.setSound(s.sound !== false);
  audio.setTts(s.tts !== false);
  document.title = t('appTitle');
  i18n.apply(document);
}

function bindSettings() {
  const dlg = $('settings');
  $('tb-settings').addEventListener('click', () => {
    $('set-sound').checked = audio.getSound();
    $('set-tts').checked = audio.getTts();
    $('set-rank-hidden').checked = !!settings().rankHidden;
    dlg.showModal();
  });
  $('set-sound').addEventListener('change', (e) => { audio.setSound(e.target.checked); saveSetting({ sound: e.target.checked }); });
  $('set-tts').addEventListener('change', (e) => { audio.setTts(e.target.checked); saveSetting({ tts: e.target.checked }); });
  $('set-rank-hidden').addEventListener('change', (e) => saveSetting({ rankHidden: e.target.checked }));
  $('set-lang').addEventListener('click', async () => {
    await saveSetting({ lang: i18n.getLang() === 'ko' ? 'en' : 'ko' });
    applySettings();
    route();
  });
  $('set-logout').addEventListener('click', async () => {
    dlg.close();
    await api('POST', 'logout').catch(() => {});
    state.me = null;
    tbChar?.destroy();
    tbChar = null;
    lastSparkles = null;
    go('login');
  });
  $('tb-me').addEventListener('click', () => go('chars'));
}

/* ---------- 게임 실행 ---------- */

function gameCss(id) {
  let link = document.querySelector(`link[data-game="${id}"]`);
  if (link) return Promise.resolve(link);
  link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `games/${id}/game.css`;
  link.dataset.game = id;
  document.head.appendChild(link);
  return new Promise((ok) => { link.onload = link.onerror = () => ok(link); });
}

/*
 * 게임에 넘겨주는 ctx. 게임은 이것만 쓰고 서버·저장·화면 전환을 직접 하지 않습니다.
 *   lang, t(key, vars), apply(root)       게임 사전(mod.dict)과 플랫폼 문구
 *   audio, setSound(on)                    효과음·숫자 음성(core/audio.js). 소리 켜기/끄기는 설정에 저장
 *   look, characterName, character(el, opts)  현재 캐릭터
 *   progress, saveProgress(data)           게임별 진행도(서버 저장)
 *   items.count(name), items.use(name)     이 게임의 소모품('<게임>.<name>')
 *   finish({ stars, score, detail })       결과 보고 → { earned, sparkles }. 보상 토스트는 플랫폼이 띄웁니다.
 *   openShop(), exit()
 */
async function launch(view, id, token) {
  const meta = GAMES.find((g) => g.id === id);
  if (!meta) { go('lobby'); return null; }
  view.innerHTML = `<p class="loading">${t('games')}…</p>`;
  const [mod, progress] = await Promise.all([
    import(`../games/${id}/index.js`),
    api('GET', 'progress/' + id).then((r) => r.data, () => null),
    gameCss(id)
  ]);
  if (token !== routeToken) return null;
  document.body.classList.add('playing');
  view.textContent = '';
  const el = document.createElement('div');
  el.className = `game game-${id}`;
  view.appendChild(el);

  const dict = mod.dict;
  const key = currentKey();
  const chars = [];
  const itemId = (name) => `${id}.${name}`;
  const ctx = {
    id,
    lang: i18n.getLang(),
    t: (k, vars) => t(k, vars, dict),
    apply: (root) => i18n.apply(root, dict),
    audio,
    /* 게임 안의 소리 버튼: 설정에도 저장됩니다. */
    setSound(on) { audio.setSound(on); saveSetting({ sound: !!on }); },
    look: lookFor(key),
    characterName: characterName(key, t),
    character(target, opts) {
      const c = createCharacter(target, lookFor(key), opts);
      chars.push(c);
      return c;
    },
    progress,
    saveProgress: (data) => api('PUT', 'progress/' + id, { data }).catch(() => {}),
    sparkles: () => state.me.user.sparkles,
    items: {
      count: (name) => state.me.inventory[itemId(name)] || 0,
      async use(name) {
        const iid = itemId(name);
        if (!(state.me.inventory[iid] > 0) || !ITEMS[iid]) return false;
        patch((me) => { me.inventory[iid] -= 1; });
        try {
          await api('POST', 'items/use', { itemId: iid });
          return true;
        } catch {
          patch((me) => { me.inventory[iid] += 1; });
          return false;
        }
      }
    },
    async finish({ stars, score, detail }) {
      try {
        const r = await api('POST', 'plays', {
          game: id, roundKey: crypto.randomUUID(), stars, score, detail, character: key
        });
        patch((me) => { me.user.sparkles = r.sparkles; });
        toast(!r.earned ? t('noEarn') : r.weekRank ? t('earnedRank', { n: r.earned, r: r.weekRank }) : t('earned', { n: r.earned }));
        return r;
      } catch {
        toast(t('offlineSave'));
        return { earned: 0, sparkles: state.me.user.sparkles };
      }
    },
    openShop: () => go('shop?game=' + id),
    exit: () => go('lobby')
  };

  const game = mod.mount(el, ctx) || {};
  return () => {
    game.destroy?.();
    chars.forEach((c) => c.destroy());
    audio.cancelSpeech();
    document.body.classList.remove('playing');
  };
}

/* ---------- 라우팅 ---------- */

async function route() {
  const token = ++routeToken;
  const raw = location.hash.replace(/^#\/?/, '') || 'lobby';
  const [path, query] = raw.split('?');
  const [name, arg] = path.split('/');
  const params = new URLSearchParams(query || '');

  if (cleanup) { const c = cleanup; cleanup = null; c(); }
  if ($('settings').open) $('settings').close();
  const view = $('view');
  view.textContent = '';
  window.scrollTo(0, 0);

  if (!state.me && name !== 'login') { go('login'); return; }
  if (state.me && name === 'login') { go('lobby'); return; }
  $('topbar').hidden = !state.me || name === 'play';

  if (!(name in SCREENS)) { go('lobby'); return; }
  if (name === 'play') {
    cleanup = await launch(view, arg, token);
    return;
  }
  const mod = await SCREENS[name]();
  if (token !== routeToken) return;
  cleanup = mod.render(view, { arg, params, go, toast, errorText }) || null;
}

/* ---------- 시작 ---------- */

async function boot() {
  i18n.setLang(i18n.detect());
  bindSettings();
  bus.addEventListener('change', renderTopbar);
  /* iOS: 첫 터치에서 오디오를 깨웁니다. */
  document.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  try {
    await loadMe();
  } catch {
    $('view').innerHTML = `<p class="screen-empty">${t('network')}</p>`;
    return;
  }
  applySettings();
  window.addEventListener('hashchange', route);
  route();
}

/* 로그인/가입 직후 화면 셸을 다시 맞춥니다(screens/login.js 가 부릅니다). */
export function afterLogin() {
  applySettings();
  renderTopbar();
  go('lobby');
}

boot();
