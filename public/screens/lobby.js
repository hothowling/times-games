import { icon } from '../core/icons.js';
/*
 * lobby.js - 내 캐릭터, 상점/캐릭터/기록 버튼, 게임 목록.
 */
import { t, pick } from '../core/i18n.js';
import { h } from '../core/dom.js';
import { state, lookFor } from '../core/state.js';
import { showGift } from '../core/box.js';
import { openInstallGuide, maybeAutoShowInstall, guideAvailable, installText } from '../core/install-ui.js';
import { INSTALL_REWARD, UPGRADE_REWARD } from '../core/catalog.js';
import { createCharacter } from '../core/character.js';
import { GAMES } from '../games/index.js';
import { TIPS } from './tips.js';

const TIP_MS = 7000;

export function render(view, { go, toast, errorText }) {
  const hero = h('div');
  /* 캐릭터 오른쪽에 세로로 놓는 작은 아이콘 버튼. 글자는 아이콘 아래 작게. */
  const btn = (name, key, path) => h('button', { type: 'button', class: 'lobby-icon', 'aria-label': t(key), onclick: () => go(path) },
    icon(name), h('small', null, t(key)));
  /* 캐릭터 위 말풍선: 도움말을 무작위로 돌려 보여 줍니다. 누르면 관련 화면으로(없으면 다음 도움말). */
  const tipText = h('span');
  const tip = h('button', { type: 'button', class: 'lobby-tip', 'aria-live': 'polite' }, h('i', { 'aria-hidden': 'true' }, '💡'), tipText);
  let tipIndex = -1;
  let tipTimer = 0;
  const showTip = () => {
    let i;
    do i = Math.floor(Math.random() * TIPS.length); while (TIPS.length > 1 && i === tipIndex);
    tipIndex = i;
    tip.classList.remove('is-in');
    void tip.offsetWidth; /* 애니메이션 다시 시작 */
    tipText.textContent = pick(TIPS[i]);
    tip.classList.add('is-in');
    tip.classList.toggle('has-link', !!TIPS[i].go);
  };
  const nextTip = () => { clearInterval(tipTimer); showTip(); tipTimer = setInterval(showTip, TIP_MS); };
  tip.addEventListener('click', () => { const g = TIPS[tipIndex]?.go; if (g) go(g); else nextTip(); });
  nextTip();
  view.append(
    tip,
    h('section', { class: 'lobby-hero' }, hero,
      h('nav', { class: 'lobby-actions' },
        btn('ranking', 'ranking', 'ranking'), btn('characters', 'characters', 'chars'), btn('shop', 'shop', 'shop'), btn('records', 'records', 'records'),
        /* 휴대폰 브라우저에서 아직 홈 화면 보상을 안 받았으면: 설치 안내(언제든 다시 볼 수 있게) */
        guideAvailable() && !state.me.installRewarded
          ? h('button', { type: 'button', class: 'lobby-icon', 'aria-label': installText('installLobby'), onclick: () => openInstallGuide({ go, toast }) },
            icon('home'), h('small', null, installText('installLobby')), h('b', { class: 'lobby-badge' }, '+' + INSTALL_REWARD))
          : null)),
    /* 손님이면 계정 만들기를 권합니다(모은 것이 그대로 남음). */
    state.me.user.guest ? h('button', { type: 'button', class: 'guest-note', onclick: () => go('login?upgrade=1') },
      h('span', null, t('guestNote', { n: UPGRADE_REWARD })), h('b', null, t('guestMake') + ' ›')) : '',
    h('h2', { class: 'screen-title' }, t('games')),
    h('div', { class: 'game-list' }, GAMES.map((g) =>
      h('button', { type: 'button', class: 'game-card', onclick: () => go('play/' + g.id) },
        g.badge ? h('i', { class: 'game-badge is-' + g.badge }, g.badge.toUpperCase()) : null,
        h('img', { src: g.thumb, alt: '', width: 76, height: 76 }),
        h('span', null, h('b', null, pick(g.title)), h('span', null, pick(g.desc))))))
  );
  const c = createCharacter(hero, lookFor());
  /* 오늘 처음 들어왔으면 서버가 랜덤박스를 하나 넣어 주고 gift 를 켭니다. 팝업은 한 번만. */
  if (state.me.gift) {
    state.me.gift = false;
    showGift({ buy: false, toast, errorText });
  } else maybeAutoShowInstall({ go, toast });
  return () => { clearInterval(tipTimer); c.destroy(); };
}
