import { icon, iconFromSource } from '../core/icons.js';
/*
 * shop.js - 상점. 꾸미기(계정 공유, 지금 캐릭터에 입혀 봄)와 게임별 아이템(소모품).
 *   #/shop?game=<id>  게임에서 왔으면 아이템 탭부터 열고, 뒤로 가면 그 게임으로 돌아갑니다.
 */
import { api } from '../core/api.js';
import { t, pick } from '../core/i18n.js';
import { h } from '../core/dom.js';
import { state, patch, lookFor, currentKey } from '../core/state.js';
import { createCharacter } from '../core/character.js';
import { wearableImage } from '../core/wearable-effects.js';
import { COSMETICS, PACKS, ITEMS, SLOTS, BOX } from '../core/catalog.js';
import { openBox } from '../core/box.js';
import { audio } from '../core/audio.js';
import { GAMES } from '../games/index.js';

const companionText = (c, key) => t(c.style === 'prop' ? ({
  petTogether: 'propUsing', petPreview: 'propPreview', petJoin: 'propUse',
  petRemove: 'propRemove', buyAndAdopt: 'buyAndUseProp'
}[key] || key) : key);


export function render(view, { go, toast, errorText, params }) {
  const fromGame = params.get('game');
  let tab = fromGame ? 'items' : 'cosmetics';
  let busy = false;
  let actionBusy = false;
  let selected = null;
  let alive = true;
  const key = currentKey();

  const preview = h('div');
  const previewActions = h('div', { class: 'shop-preview-actions', 'aria-live': 'polite' });
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const body = h('div');
  view.append(
    h('button', { type: 'button', class: 'back-btn', onclick: () => go(fromGame ? 'play/' + fromGame : 'lobby') }, '‹ ' + t('back')),
    h('section', { class: 'shop-preview' }, preview, previewActions),
    tabs,
    body
  );
  const chr = createCharacter(preview, lookFor(key));

  const price = (n) => h('span', { class: 'price' }, icon('sparkle'), n);

  async function buy(itemId, name) {
    if (busy) return false;
    if (state.me.user.sparkles < (PACKS[itemId] || COSMETICS[itemId] || ITEMS[itemId]).price) { toast(t('notEnough')); return false; }
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

  async function wear(changes) {
    const equipped = { ...lookFor(key).equipped, ...changes };
    try {
      const r = await api('PUT', 'looks/' + key, { equipped });
      patch((me) => { me.looks[key] = r.equipped; });
      if (alive) { chr.update(lookFor(key)); chr.react('correct'); }
      return true;
    } catch (err) {
      toast(errorText(err));
      return false;
    }
  }

  const owns = (id) => COSMETICS[id].price === 0 || !!state.me.inventory[id];
  const ownsPack = (pack) => pack.items.every(owns);
  const packWorn = (pack) => pack.items.every((id) => lookFor(key).equipped[COSMETICS[id].slot] === id);
  const packLook = (pack, remove = false) => Object.fromEntries(pack.items.map((id) => [COSMETICS[id].slot, remove ? null : id]));

  function onCosmetic(id) {
    if (actionBusy || busy) return;
    selected = COSMETICS[id]?.pack && !owns(id) ? COSMETICS[id].pack : id;
    draw();
  }

  function cancelPreview() {
    if (actionBusy) return;
    selected = null;
    draw();
  }

  async function confirmCosmetic() {
    if (!selected || actionBusy || busy) return;
    const id = selected;
    const pack = PACKS[id];
    const c = pack || COSMETICS[id];
    const owned = pack ? ownsPack(pack) : owns(id);
    const remove = owned && (pack ? packWorn(pack) : lookFor(key).equipped[c.slot] === id);
    actionBusy = true;
    draw();
    try {
      if (!owned && !(await buy(id, pick(c.name)))) return;
      if (await wear(pack ? packLook(pack, remove) : { [c.slot]: remove ? null : id })) selected = null;
    } finally {
      actionBusy = false;
      if (alive) draw();
    }
  }

  function drawPreview() {
    const look = lookFor(key);
    previewActions.hidden = tab !== 'cosmetics';
    if (!selected || tab !== 'cosmetics') {
      chr.update(look);
      previewActions.replaceChildren(h('p', { class: 'shop-try-hint' }, t('tryBeforeBuy')));
      return;
    }
    const pack = PACKS[selected];
    const c = pack || COSMETICS[selected];
    chr.update({ ...look, equipped: { ...look.equipped, ...(pack ? packLook(pack) : { [c.slot]: selected }) } });
    const owned = pack ? ownsPack(pack) : owns(selected);
    const worn = pack ? packWorn(pack) : look.equipped[c.slot] === selected;
    previewActions.replaceChildren(
      h('p', { class: 'shop-try-name' }, pick(c.name), ' · ', companionText(c, c.slot === 'pet' ? (worn ? 'petTogether' : 'petPreview') : (worn ? 'wearing' : 'tryingOn'))),
      ...(pack ? [h('p', { class: 'shop-try-hint' }, pick(pack.desc))] : []),
      h('div', { class: 'shop-try-buttons' },
        h('button', { type: 'button', class: 'btn btn-small shop-confirm', disabled: actionBusy, onclick: confirmCosmetic },
          owned ? companionText(c, c.slot === 'pet' ? (worn ? 'petRemove' : 'petJoin') : (worn ? 'remove' : 'wear')) : [companionText(c, c.slot === 'pet' ? 'buyAndAdopt' : 'buyAndWear'), ' · ', icon('sparkle'), ' ' + c.price]),
        h('button', { type: 'button', class: 'btn btn-sub btn-small', disabled: actionBusy, onclick: cancelPreview }, t('cancel'))));
  }

  function cosmetics() {
    const eq = lookFor(key).equipped;
    const entries = Object.entries(COSMETICS);
    const card = ([id, c]) => {
      const owned = owns(id);
      const worn = eq[c.slot] === id;
      return h('button', { type: 'button', 'data-cosmetic': id,
        'aria-pressed': String(selected === id), disabled: actionBusy,
        class: 'shop-item' + (worn ? ' is-worn' : '') + (selected === id ? ' is-selected' : '') + (c.isNew ? ' is-new' : ''), onclick: () => onCosmetic(id) },
        c.isNew ? h('span', { class: 'shop-new-badge' }, t('newBadge')) : null,
        wearableImage(c), pick(c.name),
        selected === id && !worn ? h('span', { class: 'tag' }, companionText(c, c.slot === 'pet' ? 'petPreview' : 'tryingOn')) : worn ? h('span', { class: 'tag' }, companionText(c, c.slot === 'pet' ? 'petTogether' : 'wearing')) : owned ? h('span', { class: 'tag' }, t('owned')) : c.pack ? h('span', { class: 'tag' }, pick(PACKS[c.pack].name)) : price(c.price));
    };
    const section = (title, list, cls = '') => h('div', { class: 'shop-section ' + cls },
      h('h3', null, title), h('div', { class: 'shop-grid' }, list.map(card)));
    /* 분류(옷·머리 장식·안경·가방·펫)별로, 최근에 들어온 아이템부터 보여 줍니다(catalog.js ADDED). 같은 날이면 카탈로그 순서. */
    const packs = h('div', { class: 'shop-section' }, h('h3', null, t('shopPacks')),
      ...Object.entries(PACKS).map(([id, pack]) => h('button', {
        type: 'button', class: 'shop-item shop-pack' + (selected === id ? ' is-selected' : '') + (packWorn(pack) ? ' is-worn' : ''),
        'data-pack': id, 'aria-pressed': String(selected === id), disabled: actionBusy, onclick: () => onCosmetic(id)
      }, h('span', { class: 'shop-pack-images' }, pack.items.map((itemId) => wearableImage(COSMETICS[itemId], pick(COSMETICS[itemId].name)))),
      h('strong', null, pick(pack.name)), h('span', { class: 'desc' }, pick(pack.desc)),
      ownsPack(pack) ? h('span', { class: 'tag' }, t(packWorn(pack) ? 'wearing' : 'owned')) : price(pack.price))));
    return [packs, ...SLOTS.flatMap((slot) => {
      const list = entries.filter(([, c]) => c.slot === slot).sort((a, b) => b[1].added.localeCompare(a[1].added));
      return list.length ? [section(t('slot_' + slot), list)] : [];
    })];
  }

  /* 랜덤박스: 사면 바로 열고, 매일 받은 상자가 있으면 '열기'. 열고 나면 개수·잔액을 다시 그립니다. */
  function box() {
    const have = state.me.inventory[BOX.id] || 0;
    const open = (buy) => openBox({ buy, toast, errorText }).then(draw);
    return h('div', { class: 'shop-section' },
      h('h3', null, pick(BOX.name)),
      h('div', { class: 'shop-grid' },
        h('button', { type: 'button', class: 'shop-item', onclick: () => open(true) },
          iconFromSource(BOX.icon), pick(BOX.name), h('span', { class: 'desc' }, pick(BOX.desc)), price(BOX.price)),
        have ? h('button', { type: 'button', class: 'shop-item', onclick: () => open(false) },
          iconFromSource(BOX.icon), t('boxOpen'), h('span', { class: 'tag' }, t('boxHave', { n: have }))) : null));
  }

  /* 아이템 5종은 모든 게임이 같이 씁니다. '쓰는 곳'은 games/index.js 의 items. 게임에서 왔으면 그 게임 아이템을 강조합니다. */
  function items() {
    return [box(), h('div', { class: 'shop-section' },
      h('h3', null, t('itemsTitle')),
      h('div', { class: 'shop-grid' }, Object.entries(ITEMS).map(([id, i]) => {
        const where = GAMES.filter((g) => g.items?.includes(id));
        return h('button', { type: 'button', class: 'shop-item' + (fromGame && where.some((g) => g.id === fromGame) ? ' is-worn' : ''),
          onclick: async () => { if (await buy(id, pick(i.name))) draw(); } },
          iconFromSource(i.icon),
          pick(i.name),
          h('span', { class: 'desc' }, pick(i.desc)),
          h('span', { class: 'where' }, t('itemWhere', { games: where.map((g) => pick(g.short)).join(' · ') })),
          price(i.price),
          h('span', { class: 'tag' }, `${t('owned')} ${t('qty', { n: state.me.inventory[id] || 0 })}`));
      })))];
  }

  function draw() {
    drawPreview();
    tabs.replaceChildren(...['cosmetics', 'items'].map((k) => h('button', {
      type: 'button', class: 'tab', role: 'tab', 'aria-selected': String(tab === k),
      disabled: actionBusy, onclick: () => { selected = null; tab = k; draw(); }
    }, t(k === 'cosmetics' ? 'shopCosmetics' : 'shopItems'))));
    body.replaceChildren(...(tab === 'cosmetics' ? cosmetics() : items()));
  }

  draw();
  return () => { alive = false; chr.destroy(); };
}
