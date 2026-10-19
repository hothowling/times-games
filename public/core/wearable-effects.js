/* 금속 꾸미기의 반사광. 원본의 투명 영역으로 마스킹해 안경 구멍·얼굴에는 빛을 칠하지 않습니다. */
import { h } from './dom.js';

export function createWearableShine(parent, className = '') {
  const el = h('span', { class: 'wearable-shine ' + className, 'aria-hidden': 'true', hidden: true },
    h('span', { class: 'wearable-sheen' }),
    h('i', { class: 'wearable-glint wearable-glint-a' }),
    h('i', { class: 'wearable-glint wearable-glint-b' }));
  parent.append(el);
  return {
    el,
    update(cosmetic) {
      el.hidden = !cosmetic?.shine;
      if (!cosmetic?.shine) return;
      el.dataset.shine = cosmetic.shine;
      el.style.setProperty('--shine-image', `url("${new URL(cosmetic.img, document.baseURI).href}")`);
    }
  };
}

/* 상점에서도 착용 모습과 같은 효과를 씁니다. 일반 아이템은 기존 img 그대로입니다. */
export function wearableImage(cosmetic, alt = '') {
  const img = h('img', { src: cosmetic.img, alt });
  if (!cosmetic.shine) return img;
  const wrap = h('span', { class: 'wearable-icon' }, img);
  createWearableShine(wrap).update(cosmetic);
  return wrap;
}
