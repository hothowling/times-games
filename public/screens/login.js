/*
 * login.js - 닉네임 + 비밀번호 4자리로 들어가기 / 처음 만들기 / 손님으로 해 보기.
 *   #/login?upgrade=1  손님이 닉네임·비밀번호를 정해 정식 계정으로 바꾸기(모은 것은 그대로)
 */
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { h } from '../core/dom.js';
import { state, setMe, lookFor } from '../core/state.js';
import { createCharacter } from '../core/character.js';
import { afterLogin, go } from '../core/app.js';

export function render(view, { errorText, params }) {
  const upgrade = !!(params.get('upgrade') && state.me?.user.guest);
  let mode = upgrade ? 'upgrade' : 'login';
  const chars = h('div', { class: 'login-chars' }, h('span'), h('span'));
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
        setMe(await api('POST', mode, { nickname: nick.value, pin: pin.value }));
        afterLogin();
      } catch (err) {
        error.textContent = errorText(err);
        submit.disabled = false;
      }
    }
  }, nick, pin, error, submit, swap, guest);

  sync();
  view.append(h('section', { class: 'login' }, h('h1', null, t(upgrade ? 'guestMake' : 'appTitle')),
    upgrade ? h('p', { class: 'login-hint' }, t('guestMakeHint')) : null, chars, form));
  const a = createCharacter(chars.children[0], lookFor('sooji'));
  const b = createCharacter(chars.children[1], lookFor('jiho'));
  nick.focus();
  return () => { a.destroy(); b.destroy(); };
}
