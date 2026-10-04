/*
 * items.js - 게임 안 아이템. 모든 게임이 같은 5종(catalog.js ITEMS)을 쓰고, 게임이 효과를 정합니다.
 *   askBuy(id)                         가진 게 없을 때 '사서 바로 쓸까요?' 팝업 → true/false
 *   createItemBar(el, ids, items, handlers)
 *     handlers = { <id>: { can?: () => bool, apply: () => void }, pause?(), resume?() }
 *     누르면 can() → items.use(id)(필요하면 구매, 그동안 pause) → resume → apply() 순서입니다.
 *     돌려주는 { refresh() } 로 문제가 바뀔 때 버튼 상태를 다시 그립니다.
 */
import { t, pick } from './i18n.js';
import { h, sheet } from './dom.js';
import { state } from './state.js';
import { ITEMS } from './catalog.js';

const SPARK = 'assets/ui/sparkle.webp';

export function askBuy(id) {
  const it = ITEMS[id];
  return new Promise((done) => {
    const dlg = sheet(
      h('img', { class: 'item-ask-icon', src: it.icon, alt: '' }),
      h('h2', null, pick(it.name)),
      h('p', null, t('itemBuyAsk', { price: it.price, n: state.me.user.sparkles })),
      h('button', { type: 'button', class: 'btn', onclick: () => { dlg.returnValue = 'buy'; dlg.close(); } },
        h('img', { class: 'item-ask-spark', src: SPARK, alt: '' }), ' ' + t('itemBuy', { price: it.price })),
      h('button', { type: 'button', class: 'btn btn-sub', onclick: () => dlg.close() }, t('cancel')));
    dlg.addEventListener('close', () => done(dlg.returnValue === 'buy'));
  });
}

export function createItemBar(el, ids, items, handlers) {
  let busy = false;
  const buttons = ids.filter((id) => handlers[id]).map((id) =>
    h('button', { type: 'button', class: 'item-btn', 'data-item': id, 'aria-label': pick(ITEMS[id].name), onclick: () => press(id) },
      h('img', { src: ITEMS[id].icon, alt: '' }), h('b')));
  const bar = h('div', { class: 'item-bar' }, ...buttons);
  el.append(bar);

  async function press(id) {
    const hd = handlers[id];
    if (busy || (hd.can && !hd.can())) return;
    busy = true;
    handlers.pause?.();
    const ok = await items.use(id);
    busy = false;
    handlers.resume?.();
    if (ok) hd.apply();
    refresh();
  }

  function refresh() {
    for (const b of buttons) {
      const id = b.dataset.item;
      const n = items.count(id);
      b.querySelector('b').textContent = n || '+';
      b.classList.toggle('is-empty', !n);
      b.disabled = handlers[id].can ? !handlers[id].can() : false;
    }
  }

  refresh();
  return { refresh };
}
