/*
 * login.js - 닉네임 + 비밀번호 4자리로 들어가기 / 처음 만들기.
 */
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { h } from '../core/dom.js';
import { setMe, lookFor } from '../core/state.js';
import { createCharacter } from '../core/character.js';
import { afterLogin } from '../core/app.js';

export function render(view, { errorText }) {
  let mode = 'login';
  const chars = h('div', { class: 'login-chars' }, h('span'), h('span'));
  const nick = h('input', { class: 'field', maxlength: 12, autocomplete: 'username', placeholder: t('nickname'), 'aria-label': t('nickname') });
  const pin = h('input', {
    class: 'field pin-field', type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: 4,
    autocomplete: 'current-password', placeholder: t('pin'), 'aria-label': t('pin')
  });
  const error = h('p', { class: 'form-error', role: 'alert' });
  const submit = h('button', { class: 'btn' });
  const swap = h('button', { type: 'button', class: 'btn btn-sub' });

  function sync() {
    submit.textContent = t(mode === 'login' ? 'login' : 'signupDo');
    swap.textContent = t(mode === 'login' ? 'signup' : 'haveAccount');
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
  }, nick, pin, error, submit, swap);

  sync();
  view.append(h('section', { class: 'login' }, h('h1', null, t('appTitle')), chars, form));
  const a = createCharacter(chars.children[0], lookFor('sooji'));
  const b = createCharacter(chars.children[1], lookFor('jiho'));
  nick.focus();
  return () => { a.destroy(); b.destroy(); };
}
