/*
 * chars.js - 캐릭터 고르기(수지·지호 + 내 사진 캐릭터), 사진으로 만들기, 지우기.
 */
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { h } from '../core/dom.js';
import { state, patch, lookFor, currentKey, characterKeys, characterName, loadMe } from '../core/state.js';
import { createCharacter } from '../core/character.js';
import * as maker from '../core/maker.js';

export function render(view, { go, toast, errorText }) {
  const grid = h('div', { class: 'char-grid' });
  let chars = [];
  view.append(
    h('button', { type: 'button', class: 'back-btn', onclick: () => go('lobby') }, '‹ ' + t('back')),
    h('h2', { class: 'screen-title' }, t('chooseCharacter')),
    grid,
    h('p', { style: 'margin-top:18px' }, h('button', { type: 'button', class: 'btn', onclick: () => go('shop') }, t('dressUp')))
  );

  async function select(key) {
    patch((me) => { me.user.settings.character = key; });
    draw();
    try { await api('PATCH', 'settings', { character: key }); } catch (err) { toast(errorText(err)); }
  }

  async function remove(c) {
    if (!confirm(t('delAsk'))) return;
    try {
      await api('DELETE', 'characters/' + c.id);
      await loadMe();
      draw();
    } catch (err) { toast(errorText(err)); }
  }

  function draw() {
    chars.forEach((c) => c.destroy());
    chars = [];
    const cur = currentKey();
    const cards = characterKeys().map((key) => {
      const slot = h('span');
      const photo = state.me.characters.find((c) => c.key === key);
      const card = h('div', { style: 'position:relative' },
        h('button', { type: 'button', class: 'char-card', 'aria-pressed': String(key === cur), onclick: () => select(key) },
          slot, characterName(key, t)),
        photo && h('button', { type: 'button', class: 'char-del', 'aria-label': t('del'), onclick: () => remove(photo) }, '✕'));
      chars.push(createCharacter(slot, lookFor(key), { body: false }));
      return card;
    });
    grid.replaceChildren(...cards, h('button', { type: 'button', class: 'char-new', onclick: openMaker }, '📷 ' + t('newCharacter')));
  }

  /* ---------- 사진으로 만들기 ---------- */

  function openMaker() {
    const frames = [null, null, null];
    let step = 0;
    let busy = false;
    const title = h('h2');
    const status = h('p', { class: 'maker-status', 'aria-live': 'polite' });
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
    const name = h('input', { class: 'field', maxlength: 12, placeholder: t('makerName'), 'aria-label': t('makerName') });
    const consent = h('input', { type: 'checkbox' });
    const pick = h('button', { type: 'button', class: 'btn', onclick: () => file.click() }, t('takePhoto'));
    const save = h('button', { type: 'button', class: 'btn' }, t('save'));
    const slots = ['😐', '😄', '😠'].map((emoji, i) => h('button', {
      type: 'button', class: 'slot',
      onclick: () => { if (!busy) { step = i; status.textContent = ''; sync(); } }
    }, h('canvas', { width: maker.FRAME, height: maker.FRAME }), h('span', null, emoji)));

    const dlg = h('dialog', { class: 'sheet' }, h('div', { class: 'sheet-card' },
      title,
      h('p', null, t('makerHint')),
      h('div', { class: 'slots' }, slots),
      status, pick, file, name,
      h('label', { class: 'consent' }, consent, t('makerConsent')),
      save,
      h('button', { type: 'button', class: 'btn btn-sub', onclick: close }, t('cancel')),
      h('p', { class: 'maker-note' }, t('privacy'))));

    function sync() {
      title.textContent = t('makerTitle' + (step + 1));
      slots.forEach((slot, i) => {
        const ctx = slot.firstChild.getContext('2d');
        ctx.clearRect(0, 0, maker.FRAME, maker.FRAME);
        if (frames[i]) ctx.putImageData(frames[i], 0, 0);
        slot.classList.toggle('on', i === step);
        slot.disabled = busy;
      });
      pick.disabled = busy;
      save.disabled = busy || frames.includes(null) || !consent.checked;
    }

    function close() {
      dlg.close();
      dlg.remove();
      maker.closeModels();
    }

    file.addEventListener('change', async () => {
      const f = file.files[0];
      file.value = ''; /* 같은 사진을 다시 골라도 change 가 오게 */
      if (!f || busy) return;
      busy = true;
      status.textContent = t(maker.modelsReady ? 'makerWorking' : 'makerLoading');
      sync();
      try {
        frames[step] = await maker.makeFrame(f);
        const next = frames.indexOf(null);
        if (next >= 0) step = next;
        status.textContent = next >= 0 ? '' : t('makerReady');
      } catch (err) {
        status.textContent = t(['noFace', 'noMask', 'badImg', 'failLoad'].includes(err.message) ? err.message : 'failWork');
      }
      busy = false;
      sync();
    });
    consent.addEventListener('change', sync);

    save.addEventListener('click', async () => {
      busy = true;
      sync();
      try {
        const blob = await maker.makeSheet(frames);
        const r = await api('POST', 'characters?name=' + encodeURIComponent(name.value.trim()), blob, { 'content-type': blob.type });
        await api('PATCH', 'settings', { character: r.key });
        await loadMe();
        close();
        draw();
      } catch (err) {
        status.textContent = err.code ? errorText(err) : t('failSave');
        busy = false;
        sync();
      }
    });

    document.body.append(dlg);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (!busy) close(); });
    sync();
    dlg.showModal();
    maker.loadModels().catch(() => {}); /* 첫 사진을 고르는 동안 미리 받아 둡니다 */
  }

  draw();
  return () => chars.forEach((c) => c.destroy());
}
