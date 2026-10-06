/*
 * login.js - 닉네임 + 비밀번호 4자리로 들어가기 / 처음 만들기 / 손님으로 해 보기.
 *   #/login?upgrade=1  손님이 닉네임·비밀번호를 정해 정식 계정으로 바꾸기(모은 것은 그대로)
 */
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { h } from '../core/dom.js';
import { state, setMe, lookFor } from '../core/state.js';
import { createCharacter } from '../core/character.js';
import { afterLogin, go, toast } from '../core/app.js';
import { audio } from '../core/audio.js';
import { UPGRADE_REWARD } from '../core/catalog.js';

export function render(view, { errorText, params }) {
  const upgrade = !!(params.get('upgrade') && state.me?.user.guest);
  let mode = upgrade ? 'upgrade' : 'login';
  /* 두 아이 앞에 상점 펫들을 줄지어 세워 꾸밉니다(그림만, 계정과 무관). */
  const PETS = ['04-hamster', '02-kitten', '01-puppy', '05-fox', '03-bunny'];
  const pets = h('div', { class: 'login-pets', 'aria-hidden': 'true' },
    PETS.map((p, i) => h('img', { src: `assets/wearables/pets/${p}.webp`, alt: '', draggable: false, style: `--i:${i}` })));
  /* 양옆에는 게임 캐릭터 펫들이 둥실둥실 떠 있습니다. [파일, 자리 클래스] */
  const SIDE = [['06-minecraft-steve', 'l1'], ['08-minecraft-creeper', 'l2'], ['07-minecraft-alex', 'r1'], ['09-roblox-noob', 'r2'], ['10-roblox-bacon', 'r3']];
  const side = SIDE.map(([p, at], i) => h('img', { class: 'login-side ' + at, src: `assets/wearables/pets/${p}.webp`, alt: '', draggable: false, 'aria-hidden': 'true', style: `--i:${i}` }));
  const chars = h('div', { class: 'login-chars' }, h('span'), h('span'), pets, side);
  const nick = h('input', { class: 'field', maxlength: 12, autocomplete: 'username', placeholder: t('nickname'), 'aria-label': t('nickname') });
  const pin = h('input', {
    class: 'field pin-field', type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: 4,
    autocomplete: 'current-password', placeholder: t('pin'), 'aria-label': t('pin')
  });
  const error = h('p', { class: 'form-error', role: 'alert' });
  const submit = h('button', { class: 'btn' });
  const swap = h('button', { type: 'button', class: 'btn btn-sub' });
  /* 손님으로 해 보기: 서버가 임시 계정을 만들고 바로 들어갑니다. 정식 계정으로 바꾸는 중에는 '뒤로'. */
  const guest = h('button', { type: 'button', class: 'btn-link' }, t(upgrade ? 'back' : 'guestPlay'));
  guest.addEventListener('click', async () => {
    if (upgrade) { go('lobby'); return; }
    guest.disabled = true;
    try {
      setMe(await api('POST', 'guest'));
      afterLogin();
    } catch (err) {
      error.textContent = errorText(err);
      guest.disabled = false;
    }
  });

  function sync() {
    submit.textContent = t(mode === 'login' ? 'login' : 'signupDo');
    swap.textContent = t(mode === 'login' ? 'signup' : 'haveAccount');
    swap.hidden = upgrade;
    pin.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    error.textContent = '';
  }

  swap.addEventListener('click', () => { mode = mode === 'login' ? 'signup' : 'login'; sync(); });
  pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 4); });

  const form = h('form', {
    async onsubmit(e) {
      e.preventDefault();
      if (!/^\d{4}$/.test(pin.value)) { error.textContent = t('badPin'); return; }
      submit.disabled = true;
      try {
        const data = await api('POST', mode, { nickname: nick.value, pin: pin.value });
        setMe(data);
        afterLogin();
        /* 손님 → 정식 계정 선물(서버가 한 번만 줌) */
        if (data.reward) { audio.fanfare?.(); toast(t('upgradeDone', { n: data.reward }), 3500); }
      } catch (err) {
        error.textContent = errorText(err);
        submit.disabled = false;
      }
    }
  }, nick, pin, error, submit, swap, guest);

  sync();
  view.append(h('section', { class: 'login' }, h('h1', null, t(upgrade ? 'guestMake' : 'appTitle')),
    upgrade ? h('p', { class: 'login-hint' }, t('guestMakeHint', { n: UPGRADE_REWARD })) : null, chars, form));
  /* 첫 화면의 두 아이는 상점 꾸미기를 입혀 보여 줍니다(계정의 실제 착용과는 무관). */
  const dressed = (key, equipped) => { const look = lookFor(key); return { ...look, equipped: { ...look.equipped, ...equipped } }; };
  const a = createCharacter(chars.children[0], dressed('sooji', { outfit: 'pinkFlowerDress', head: 'bowPink' }));
  const b = createCharacter(chars.children[1], dressed('jiho', { outfit: 'overalls', head: 'propellerHat' }));
  nick.focus();
  return () => { a.destroy(); b.destroy(); };
}
