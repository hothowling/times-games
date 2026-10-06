import { icon } from '../core/icons.js';
/*
 * ranking.js - 랭킹. 이번 주(월요일 0시 KST 초기화) / 명예의 전당, 전체(별 합계) + 게임별 최고 기록.
 * 1~3위는 단상 위 전신 캐릭터, 4~20위는 목록, 맨 아래에 내 순위를 고정합니다.
 * 다른 사람의 캐릭터는 항상 수지/지호 얼굴로 그립니다(사진 얼굴은 본인만 봄, 서버가 face 를 정해 줍니다).
 */
import { api } from '../core/api.js';
import { t, pick } from '../core/i18n.js';
import { h } from '../core/dom.js';
import { settings } from '../core/state.js';
import { createCharacter } from '../core/character.js';
import { GAMES } from '../games/index.js';

const look = (l) => ({ key: l.face, rig: l.face, face: `assets/characters/${l.face}.webp`, equipped: l.equipped });

export function render(view, { go, errorText }) {
  let period = 'week';
  let board = 'all';
  let chars = [];
  let token = 0;

  const fmt = (n) => (board === 'all' ? t('rankStars', { n }) : pick(GAMES.find((g) => g.id === board).rank).replace('{n}', n));
  const periods = h('div', { class: 'rank-periods' });
  const boards = h('div', { class: 'rank-boards', role: 'tablist' });
  const body = h('div', { class: 'rank-body' });
  const mine = h('div', { class: 'rank-me' });
  view.append(
    h('button', { type: 'button', class: 'back-btn', onclick: () => go('lobby') }, '‹ ' + t('back')),
    h('h2', { class: 'screen-title' }, icon('ranking'), ' ' + t('ranking')),
    periods, boards, body, mine
  );

  function clear() {
    chars.forEach((c) => c.destroy());
    chars = [];
  }

  function avatar(l, body) {
    const el = h('span');
    chars.push(createCharacter(el, look(l), { body }));
    return el;
  }

  function tabs() {
    const tab = (on, label, fn, cls) => h('button', { type: 'button', class: cls, 'aria-selected': String(on), onclick: fn }, label);
    periods.replaceChildren(
      tab(period === 'week', t('rankWeek'), () => { period = 'week'; load(); }, 'rank-period'),
      tab(period === 'all', t('rankAll'), () => { period = 'all'; load(); }, 'rank-period'));
    boards.replaceChildren(...[['all', t('rankTotal')], ...GAMES.map((g) => [g.id, pick(g.short)])].map(([id, label]) =>
      tab(board === id, label, () => { board = id; load(); }, 'rank-board')));
  }

  async function load() {
    const my = ++token;
    tabs();
    let data;
    try {
      data = await api('GET', `ranking?board=${board}&period=${period}`);
    } catch (err) {
      body.textContent = errorText(err);
      return;
    }
    if (my !== token) return;
    clear();

    const top3 = data.top.filter((r) => r.rank <= 3).slice(0, 3);
    const rest = data.top.slice(top3.length);
    /* 단상은 2위 · 1위 · 3위 순서로 놓습니다. */
    const order = [top3[1], top3[0], top3[2]].filter(Boolean);
    body.replaceChildren(...[
      data.top.length ? h('div', { class: 'podium' }, order.map((r) =>
        h('div', { class: `podium-spot place-${Math.min(r.rank, 3)}` + (r.me ? ' is-me' : '') },
          r.rank === 1 ? h('span', { class: 'crown' }, icon('crown')) : null,
          avatar(r.look, true),
          h('b', { class: 'podium-name' }, r.nickname),
          h('span', { class: 'podium-value' }, fmt(r.value)),
          h('span', { class: 'podium-step' }, r.rank)))) : h('p', { class: 'screen-empty' }, t('rankEmpty')),
      rest.length ? h('ol', { class: 'rank-list' }, rest.map((r) =>
        h('li', { class: r.me ? 'is-me' : '' },
          h('span', { class: 'rank-no' }, r.rank),
          avatar(r.look, false),
          h('span', { class: 'rank-name' }, r.nickname),
          h('b', null, fmt(r.value))))) : null,
      period === 'week' ? h('p', { class: 'rank-note' }, t('rankResets')) : null
    ].filter(Boolean));

    mine.replaceChildren(...[
      h('span', null, t('rankMe')),
      h('b', null, data.me ? t('rankNth', { n: data.me.rank }) : t('rankNone')),
      data.me ? h('span', null, fmt(data.me.value)) : null,
      settings().rankHidden ? h('span', { class: 'rank-hidden' }, t('rankHiddenNote')) : null].filter(Boolean));
  }

  load();
  return () => { token++; clear(); };
}
