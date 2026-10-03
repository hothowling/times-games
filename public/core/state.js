/*
 * state.js - 로그인한 사용자 상태(서버 /api/me 결과)와 캐릭터 모양 계산.
 * 바뀌면 bus 에 'change' 이벤트를 보냅니다(헤더의 Sparkles 표시 등이 듣습니다).
 */
import { api } from './api.js';
import { PRESETS, DEFAULT_LOOK } from './catalog.js';

export const state = { me: null };
export const bus = new EventTarget();
const changed = () => bus.dispatchEvent(new Event('change'));

export async function loadMe() {
  try {
    state.me = await api('GET', 'me');
  } catch (err) {
    if (err.code !== 'login') throw err;
    state.me = null;
  }
  changed();
  return state.me;
}

export function setMe(me) {
  state.me = me;
  changed();
}

export function patch(fn) {
  fn(state.me);
  changed();
}

export const settings = () => state.me?.user.settings || {};

/* 고를 수 있는 캐릭터 키: 프리셋 + 내 사진 캐릭터 */
export const characterKeys = () => [...PRESETS, ...(state.me?.characters || []).map((c) => c.key)];

export function currentKey() {
  const key = settings().character;
  return characterKeys().includes(key) ? key : PRESETS[0];
}

export function lookFor(key = currentKey()) {
  const photo = !PRESETS.includes(key);
  return {
    key,
    rig: photo ? 'photo' : key,
    face: photo ? `api/characters/${key.slice(1)}/face` : `assets/characters/${key}.webp`,
    equipped: { ...DEFAULT_LOOK, ...state.me?.looks?.[key] }
  };
}

export function characterName(key, t) {
  if (PRESETS.includes(key)) return t(key);
  return state.me?.characters.find((c) => c.key === key)?.name || '★';
}
