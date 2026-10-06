import { icon } from '../core/icons.js';
/*
 * lobby.js - 내 캐릭터, 상점/캐릭터/기록 버튼, 게임 목록.
 */
import { t, pick } from '../core/i18n.js';
import { h } from '../core/dom.js';
import { state, lookFor } from '../core/state.js';
import { showGift } from '../core/box.js';
import { createCharacter } from '../core/character.js';
import { GAMES } from '../games/index.js';

export function render(view, { go, toast, errorText }) {
  const hero = h('div');
  /* 캐릭터 오른쪽에 세로로 놓는 작은 아이콘 버튼. 글자는 아이콘 아래 작게. */
  const btn = (name, key, path) => h('button', { type: 'button', class: 'lobby-icon', 'aria-label': t(key), onclick: () => go(path) },
    icon(name), h('small', null, t(key)));
  view.append(
    h('section', { class: 'lobby-hero' }, hero,
      h('nav', { class: 'lobby-actions' },
        btn('ranking', 'ranking', 'ranking'), btn('characters', 'characters', 'chars'), btn('shop', 'shop', 'shop'), btn('records', 'records', 'records'))),
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
  }
  return () => c.destroy();
}
