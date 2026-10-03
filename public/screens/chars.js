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
    const pick = h('button', { type: 'button', class: 'btn', onclick: () => openCamera() }, t('takePhoto'));
    const gallery = h('button', { type: 'button', class: 'btn btn-sub', onclick: () => file.click() }, t('camGallery'));
    const save = h('button', { type: 'button', class: 'btn' }, t('save'));
    const slots = ['😐', '😄', '😠'].map((emoji, i) => h('button', {
      type: 'button', class: 'slot',
      onclick: () => { if (!busy) { step = i; status.textContent = ''; sync(); } }
    }, h('canvas', { width: maker.FRAME, height: maker.FRAME }), h('span', null, emoji)));

    const dlg = h('dialog', { class: 'sheet' }, h('div', { class: 'sheet-card' },
      title,
      h('p', null, t('makerHint')),
      h('div', { class: 'slots' }, slots),
      status, pick, gallery, file, name,
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
      gallery.disabled = busy;
      camTitle.textContent = t('makerTitle' + (step + 1));
      camStatus.textContent = status.textContent;
      shoot.disabled = busy;
      save.disabled = busy || frames.includes(null) || !consent.checked;
    }

    function close() {
      closeGuide();
      dlg.close();
      dlg.remove();
      maker.closeModels();
    }

    file.addEventListener('change', () => {
      const f = file.files[0];
      file.value = ''; /* 같은 사진을 다시 골라도 change 가 오게 */
      if (f) openPhoto(f);
    });

    /* 사진 한 장 → 지금 칸의 얼굴. { ok: 이번 사진 성공, done: 3장 모두 있음 } */
    async function useFile(f) {
      if (busy) return { ok: false, done: false };
      busy = true;
      let ok = false;
      status.textContent = t(maker.modelsReady ? 'makerWorking' : 'makerLoading');
      sync();
      try {
        frames[step] = await maker.makeFrame(f);
        ok = true;
        const next = frames.indexOf(null);
        if (next >= 0) step = next;
        status.textContent = next >= 0 ? '' : t('makerReady');
      } catch (err) {
        status.textContent = t(['noFace', 'noMask', 'badImg', 'failLoad'].includes(err.message) ? err.message : 'failWork');
      }
      busy = false;
      sync();
      return { ok, done: !frames.includes(null) };
    }

    /* ---------- 얼굴 가이드 화면: 카메라(연달아 3장) 또는 앨범 사진(끌고 키워서 맞추기) ---------- */

    const video = h('video', { autoplay: true, muted: true, playsInline: true });
    const photo = h('img', { class: 'cam-photo', alt: '', draggable: false });
    const camTitle = h('p', { class: 'cam-title' });
    const camHint = h('p', { class: 'cam-hint' });
    const camStatus = h('p', { class: 'cam-status', 'aria-live': 'polite' });
    const oval = h('span', { class: 'cam-oval' });
    const shoot = h('button', { type: 'button', class: 'cam-shoot', 'aria-label': t('camShoot') });
    const cam = h('div', { class: 'cam', hidden: true },
      video, photo,
      h('div', { class: 'cam-guide' }, oval, h('span', { class: 'cam-eyes' })),
      camTitle, camHint, camStatus,
      h('div', { class: 'cam-bar' },
        h('button', { type: 'button', class: 'cam-side', onclick: closeGuide }, t('cancel')),
        shoot,
        h('button', { type: 'button', class: 'cam-side', onclick: () => { closeGuide(); file.click(); } }, t('camGallery'))));
    let mode = null; /* 'camera' | 'photo' */
    let stream = null;
    let view = { s: 1, x: 0, y: 0 }; /* 사진 배율과 위치(화면 px) */

    function showGuide(m) {
      mode = m;
      cam.dataset.mode = m;
      camHint.textContent = t(m === 'camera' ? 'camGuide' : 'photoGuide');
      shoot.setAttribute('aria-label', t(m === 'camera' ? 'camShoot' : 'photoUse'));
      cam.hidden = false;
      sync();
    }

    async function openCamera() {
      if (!navigator.mediaDevices?.getUserMedia) { file.click(); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false
        });
      } catch {
        /* 권한 거부·카메라 없음: 앨범에서 고르기로 */
        status.textContent = t('camDenied');
        file.click();
        return;
      }
      video.srcObject = stream;
      showGuide('camera');
    }

    /* 앨범 사진: 처음에는 사진 전체가 보이게 놓습니다. */
    function openPhoto(f) {
      const url = URL.createObjectURL(f);
      photo.onload = () => {
        showGuide('photo');
        const W = cam.clientWidth;
        const H = cam.clientHeight;
        const s = Math.min(W / photo.naturalWidth, H / photo.naturalHeight);
        setView({ s, x: (W - photo.naturalWidth * s) / 2, y: (H - photo.naturalHeight * s) / 2 });
      };
      photo.onerror = () => { status.textContent = t('badImg'); URL.revokeObjectURL(url); };
      if (photo.src) URL.revokeObjectURL(photo.src);
      photo.src = url;
    }

    function setView(v) {
      view = v;
      photo.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.s})`;
    }

    function closeGuide() {
      stream?.getTracks().forEach((tr) => tr.stop());
      stream = null;
      video.srcObject = null;
      if (photo.src) { URL.revokeObjectURL(photo.src); photo.removeAttribute('src'); }
      cam.hidden = true;
      mode = null;
    }

    /* 끌기(한 손가락)와 두 손가락 확대. 확대는 두 손가락 가운데를 기준으로 합니다. */
    const pointers = new Map();
    let gesture = null;
    const mid = () => { const [a, b] = [...pointers.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) }; };
    function startGesture() {
      gesture = { view: { ...view }, ...(pointers.size >= 2 ? mid() : [...pointers.values()][0]) };
    }
    cam.addEventListener('pointerdown', (e) => {
      if (mode !== 'photo' || e.target.closest('button')) return;
      cam.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      startGesture();
    });
    cam.addEventListener('pointermove', (e) => {
      if (!gesture || !pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gesture;
      if (pointers.size >= 2 && g.d) {
        const m = mid();
        const s = Math.min(20, Math.max(0.05, g.view.s * m.d / g.d));
        /* 처음 두 손가락 가운데에 있던 사진 점이 지금 가운데에 오도록 */
        const ix = (g.x - g.view.x) / g.view.s;
        const iy = (g.y - g.view.y) / g.view.s;
        setView({ s, x: m.x - ix * s, y: m.y - iy * s });
      } else {
        setView({ ...g.view, x: g.view.x + e.clientX - g.x, y: g.view.y + e.clientY - g.y });
      }
    });
    const endPointer = (e) => { pointers.delete(e.pointerId); gesture = null; if (pointers.size) startGesture(); };
    cam.addEventListener('pointerup', endPointer);
    cam.addEventListener('pointercancel', endPointer);
    cam.addEventListener('wheel', (e) => {
      if (mode !== 'photo') return;
      e.preventDefault();
      const s = Math.min(20, Math.max(0.05, view.s * Math.exp(-e.deltaY / 500)));
      const ix = (e.clientX - view.x) / view.s;
      const iy = (e.clientY - view.y) / view.s;
      setView({ s, x: e.clientX - ix * s, y: e.clientY - iy * s });
    }, { passive: false });

    /* 앨범 사진은 타원 둘레만 잘라서 넘깁니다(여러 사람이 있어도 고른 얼굴만 찾게). */
    function cropPhoto() {
      const r = oval.getBoundingClientRect();
      const box = cam.getBoundingClientRect();
      const side = Math.max(r.width, r.height) * 1.6;
      const cx = r.left - box.left + r.width / 2;
      const cy = r.top - box.top + r.height / 2;
      const sw = side / view.s;
      const out = Math.round(Math.min(1280, sw));
      const c = document.createElement('canvas');
      c.width = c.height = out;
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, out, out);
      g.drawImage(photo, (cx - side / 2 - view.x) / view.s, (cy - side / 2 - view.y) / view.s, sw, sw, 0, 0, out, out);
      return c;
    }

    /* 카메라는 미리보기처럼 좌우를 뒤집어(거울) 한 장 전체를 찍습니다. */
    function grabVideo() {
      const c = document.createElement('canvas');
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      const g = c.getContext('2d');
      g.translate(c.width, 0);
      g.scale(-1, 1);
      g.drawImage(video, 0, 0);
      return c;
    }

    shoot.addEventListener('click', async () => {
      if (busy || (mode === 'camera' && !video.videoWidth)) return;
      const c = mode === 'camera' ? grabVideo() : cropPhoto();
      cam.classList.remove('flash');
      void cam.offsetWidth;
      cam.classList.add('flash');
      const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.92));
      if (!blob) return;
      const r = await useFile(blob);
      /* 카메라는 다음 표정을 이어 찍고, 앨범 사진은 한 장 쓰면 닫습니다(실패하면 다시 맞추게 둡니다). */
      if (r.done || (mode === 'photo' && r.ok)) closeGuide();
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

    dlg.append(cam);
    document.body.append(dlg);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (!busy) close(); });
    sync();
    dlg.showModal();
    maker.loadModels().catch(() => {}); /* 첫 사진을 고르는 동안 미리 받아 둡니다 */
  }

  draw();
  return () => chars.forEach((c) => c.destroy());
}
