/*
 * shop.js - 상점. 꾸미기(계정 공유, 지금 캐릭터에 입혀 봄)와 게임별 아이템(소모품).
 *   #/shop?game=<id>  게임에서 왔으면 아이템 탭부터 열고, 뒤로 가면 그 게임으로 돌아갑니다.
 */
import { api } from '../core/api.js';
import { t, pick } from '../core/i18n.js';
import { h } from '../core/dom.js';
import { state, patch, lookFor, currentKey } from '../core/state.js';
import { createCharacter } from '../core/character.js';
import { COSMETICS, ITEMS, SLOTS, BOX } from '../core/catalog.js';
import { openBox } from '../core/box.js';
import { audio } from '../core/audio.js';
import { GAMES } from '../games/index.js';

const SPARK = 'assets/ui/sparkle.webp';

export function render(view, { go, toast, errorText, params }) {
  const fromGame = params.get('game');
  let tab = fromGame ? 'items' : 'cosmetics';
  let busy = false;
  const key = currentKey();

  const preview = h('div');
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const body = h('div');
  view.append(
    h('button', { type: 'button', class: 'back-btn', onclick: () => go(fromGame ? 'play/' + fromGame : 'lobby') }, '‹ ' + t('back')),
    h('section', { class: 'shop-preview' }, preview),
    tabs,
    body
  );
  const chr = createCharacter(preview, lookFor(key));

  const price = (n) => h('span', { class: 'price' }, h('img', { src: SPARK, alt: '' }), n);

  async function buy(itemId, name) {
    if (busy) return false;
    if (state.me.user.sparkles < (COSMETICS[itemId] || ITEMS[itemId]).price) { toast(t('notEnough')); return false; }
    busy = true;
    try {
      const r = await api('POST', 'shop/buy', { itemId });
      patch((me) => { me.user.sparkles = r.sparkles; me.inventory = r.inventory; });
      audio.tone({ freq: 660, to: 990, dur: 0.18, type: 'triangle' });
      toast(t('bought', { name }));
      return true;
    } catch (err) {
      toast(errorText(err));
      return false;
    } finally {
      busy = false;
    }
  }

  async function wear(slot, id) {
    const equipped = { ...lookFor(key).equipped, [slot]: id };
    try {
      const r = await api('PUT', 'looks/' + key, { equipped });
      patch((me) => { me.looks[key] = r.equipped; });
      chr.update(lookFor(key));
      chr.react('correct');
    } catch (err) {
      toast(errorText(err));
    }
  }

  async function onCosmetic(id) {
    const c = COSMETICS[id];
    const worn = lookFor(key).equipped[c.slot] === id;
    if (!state.me.inventory[id] && !(await buy(id, pick(c.name)))) return;
    /* 옷은 벗을 수 없고(항상 하나), 장식은 다시 누르면 벗습니다. */
    if (worn) { if (c.slot !== 'outfit') await wear(c.slot, null); }
    else await wear(c.slot, id);
    draw();
  }

  function cosmetics() {
    const eq = lookFor(key).equipped;
    return SLOTS.map((slot) => h('div', { class: 'shop-section' },
      h('h3', null, t('slot_' + slot)),
      h('div', { class: 'shop-grid' }, Object.entries(COSMETICS).filter(([, c]) => c.slot === slot).map(([id, c]) => {
        const owned = !!state.me.inventory[id];
        const worn = eq[slot] === id;
        return h('button', { type: 'button', class: 'shop-item' + (worn ? ' is-worn' : ''), onclick: () => onCosmetic(id) },
          h('img', { src: c.img, alt: '' }),
          pick(c.name),
          worn ? h('span', { class: 'tag' }, t('wearing')) : owned ? h('span', { class: 'tag' }, t('wear')) : price(c.price));
      }))));
  }

  /* 랜덤박스: 사면 바로 열고, 매일 받은 상자가 있으면 '열기'. 열고 나면 개수·잔액을 다시 그립니다. */
  function box() {
    const have = state.me.inventory[BOX.id] || 0;
    const open = (buy) => openBox({ buy, toast, errorText }).then(draw);
    return h('div', { class: 'shop-section' },
      h('h3', null, pick(BOX.name)),
      h('div', { class: 'shop-grid' },
        h('button', { type: 'button', class: 'shop-item', onclick: () => open(true) },
          h('img', { src: BOX.icon, alt: '' }), pick(BOX.name), h('span', { class: 'desc' }, pick(BOX.desc)), price(BOX.price)),
        have ? h('button', { type: 'button', class: 'shop-item', onclick: () => open(false) },
          h('img', { src: BOX.icon, alt: '' }), t('boxOpen'), h('span', { class: 'tag' }, t('boxHave', { n: have }))) : null));
  }

  /* 아이템 5종은 모든 게임이 같이 씁니다. '쓰는 곳'은 games/index.js 의 items. 게임에서 왔으면 그 게임 아이템을 강조합니다. */
  function items() {
    return [box(), h('div', { class: 'shop-section' },
      h('h3', null, t('itemsTitle')),
      h('div', { class: 'shop-grid' }, Object.entries(ITEMS).map(([id, i]) => {
        const where = GAMES.filter((g) => g.items?.includes(id));
        return h('button', { type: 'button', class: 'shop-item' + (fromGame && where.some((g) => g.id === fromGame) ? ' is-worn' : ''),
          onclick: async () => { if (await buy(id, pick(i.name))) draw(); } },
          h('img', { src: i.icon, alt: '' }),
          pick(i.name),
          h('span', { class: 'desc' }, pick(i.desc)),
          h('span', { class: 'where' }, t('itemWhere', { games: where.map((g) => pick(g.short)).join(' · ') })),
          price(i.price),
          h('span', { class: 'tag' }, `${t('owned')} ${t('qty', { n: state.me.inventory[id] || 0 })}`));
      })))];
  }

  function draw() {
    tabs.replaceChildren(...['cosmetics', 'items'].map((k) => h('button', {
      type: 'button', class: 'tab', role: 'tab', 'aria-selected': String(tab === k),
      onclick: () => { tab = k; draw(); }
    }, t(k === 'cosmetics' ? 'shopCosmetics' : 'shopItems'))));
    body.replaceChildren(...(tab === 'cosmetics' ? cosmetics() : items()));
  }

  draw();
  return () => chr.destroy();
}
