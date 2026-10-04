/*
 * dom.js - 요소 만들기 도우미. 글자는 항상 textContent 로 넣어서 닉네임 등에 HTML 이 섞여도 안전합니다.
 *   h('button', { class: 'btn', onclick: fn }, '글자', 자식요소, ...)
 */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

/* 가운데 뜨는 팝업(.sheet dialog). 닫히면 스스로 지워집니다. */
export function sheet(...children) {
  const dlg = h('dialog', { class: 'sheet' }, h('div', { class: 'sheet-card' }, ...children));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}
