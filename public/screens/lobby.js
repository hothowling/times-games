/*
 * lobby.js - 내 캐릭터, 상점/캐릭터/기록 버튼, 게임 목록.
 */
import { t, pick } from '../core/i18n.js';
import { h } from '../core/dom.js';
import { lookFor } from '../core/state.js';
import { createCharacter } from '../core/character.js';
import { GAMES } from '../games/index.js';

export function render(view, { go }) {
  const hero = h('div');
  const btn = (key, path) => h('button', { type: 'button', class: 'btn btn-sub', onclick: () => go(path) }, t(key));
  view.append(
    h('section', { class: 'lobby-hero' }, hero),
    h('div', { class: 'lobby-actions' }, btn('characters', 'chars'), btn('shop', 'shop'), btn('records', 'records')),
    h('h2', { class: 'screen-title' }, t('games')),
    h('div', { class: 'game-list' }, GAMES.map((g) =>
      h('button', { type: 'button', class: 'game-card', onclick: () => go('play/' + g.id) },
        h('img', { src: g.thumb, alt: '', width: 76, height: 76 }),
        h('span', null, h('b', null, pick(g.title)), h('span', null, pick(g.desc))))))
  );
  const c = createCharacter(hero, lookFor());
  return () => c.destroy();
}
