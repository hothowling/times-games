import { icon, iconFromSource } from './icons.js';
/*
 * box.js - 랜덤박스 팝업. 서버가 상품을 정하면(POST box/open) 슬롯머신처럼 그림 띠를 돌리다가 그 상품에서 멈춥니다.
 *   openBox({ buy, toast, errorText })  buy: 상점에서 사서 바로 열기 / 아니면 가진 상자(매일 선물)를 엽니다. 팝업이 닫히면 끝나는 Promise.
 *   showGift(opts)                      매일 첫 접속 때 '오늘의 선물' 팝업(열기 / 나중에).
 */
import { api } from './api.js';
import { t, pick } from './i18n.js';
import { h, sheet } from './dom.js';
import { state, patch } from './state.js';
import { audio } from './audio.js';
import { BOX, BOX_PRIZES, ITEMS, COSMETICS } from './catalog.js';

const SPARK = 'assets/ui/sparkle.webp';
const SPIN_SEC = 2.8;
const CELLS = 26;  /* 멈추기 전까지 지나가는 칸 수 */

/* 상품 → { img, label } */
function face(p) {
  if (p.kind === 'sparkles') return { img: SPARK, label: '+' + p.amount };
  const c = p.kind === 'item' ? ITEMS[p.id] : COSMETICS[p.id];
  return { img: c.icon || c.img, label: pick(c.name) };
}

/* 띠를 채울 아무 상품(꾸미기는 아무 유료 꾸미기). */
function filler() {
  const [kind, value] = BOX_PRIZES[Math.floor(Math.random() * BOX_PRIZES.length)];
  if (kind === 'sparkles') return { kind, amount: value };
  if (kind === 'item') return { kind, id: value };
  const ids = Object.keys(COSMETICS).filter((id) => COSMETICS[id].price > 0);
  return { kind, id: ids[Math.floor(Math.random() * ids.length)] };
}

const cell = (p) => {
  const f = face(p);
  return h('div', { class: 'box-cell' }, iconFromSource(f.img), h('span', null, f.label));
};

function boxSheet(...children) {
  const dlg = sheet(...children);
  dlg.classList.add('box-sheet');
  return dlg;
}

let busy = false;

export async function openBox({ buy, toast, errorText }) {
  if (busy) return;
  if (buy && state.me.user.sparkles < BOX.price) { toast(t('notEnough')); return; }
  busy = true;
  let r;
  try {
    r = await api('POST', 'box/open', { buy: !!buy });
  } catch (err) {
    busy = false;
    toast(errorText(err));
    return;
  }
  const strip = h('div', { class: 'box-strip' }, ...Array.from({ length: CELLS }, filler).map(cell), cell(r.prize), cell(filler()));
  const result = h('p', { class: 'box-result', hidden: true });
  const ok = h('button', { type: 'button', class: 'btn', disabled: true, onclick: () => dlg.close() }, t('boxOk'));
  const dlg = boxSheet(h('h2', null, icon('gift-box'), ' ' + pick(BOX.name)), h('div', { class: 'box-reel' }, strip), result, ok);
  dlg.addEventListener('cancel', (e) => { if (ok.disabled) e.preventDefault(); });
  const closed = new Promise((done) => dlg.addEventListener('close', done));

  /* 띠를 위로 올려 상품 칸(CELLS 번째)이 창 가운데 오게 합니다. 칸 높이는 CSS 의 --cell. */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sec = reduce ? 0 : SPIN_SEC;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    strip.style.transition = `transform ${sec}s cubic-bezier(.33, 1, .68, 1)`;
    strip.style.transform = `translateY(calc(var(--cell) * -${CELLS}))`;
  }));
  /* 칸이 지나갈 때마다 '틱'. 감속 곡선(ease-out cubic)을 거꾸로 풀어 시간을 맞춥니다. */
  if (sec) for (let k = 1; k < CELLS; k++) audio.tone({ freq: 1200, dur: 0.03, type: 'square', gain: 0.05, at: sec * (1 - Math.cbrt(1 - k / CELLS)) });

  setTimeout(() => {
    busy = false;
    patch((me) => { me.user.sparkles = r.sparkles; me.inventory = r.inventory; });
    strip.children[CELLS].classList.add('is-win');
    const f = face(r.prize);
    result.textContent = r.prize.kind === 'sparkles' ? t('earned', { n: r.prize.amount }) : t('boxGot', { name: f.label });
    result.hidden = false;
    ok.disabled = false;
    ok.focus();
    audio.fanfare();
  }, sec * 1000 + 150);
  return closed;
}

export function showGift(opts) {
  const dlg = boxSheet(
    h('h2', null, t('boxGift')),
    iconFromSource(BOX.icon, 'box-gift'),
    h('p', null, t('boxGiftText')),
    h('button', { type: 'button', class: 'btn', onclick: () => { dlg.close(); openBox(opts); } }, t('boxOpen')),
    h('button', { type: 'button', class: 'btn btn-sub', onclick: () => dlg.close() }, t('boxLater')));
}
