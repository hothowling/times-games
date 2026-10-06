/* 64px cells in one 8 × 4 atlas. The shared catalog remains plain server-safe data. */
import { h } from './dom.js';

export const ICONS = ["ranking","characters","shop","records","settings","sound-muted","star","crown","heart-empty","cheat-sneak","cookie","hint-bulb","sparkle","red-cap","smart-pill","call-friend","hourglass","heart-full","backpack","gift-box","score-protection","glasses","home","sound","power","rapid","multi","pierce","blast"];

const names = new Set(ICONS);
export function iconMarkup(name, className = '') {
  if (!names.has(name)) throw new Error('Unknown UI icon: ' + name);
  if (!/^[\w -]*$/.test(className)) throw new Error('Invalid icon class');
  return `<span class="ui-icon ${className}" data-icon="${name}" aria-hidden="true"></span>`;
}

export function icon(name, className = '') {
  if (!names.has(name)) throw new Error('Unknown UI icon: ' + name);
  return h('span', { class: 'ui-icon ' + className, 'data-icon': name, 'aria-hidden': 'true' });
}

/* Cosmetic body art stays a full image; small UI art is taken from the shared atlas. */
export function iconFromSource(source, className = '') {
  const name = source.split('/').pop().replace(/\.(webp|png)$/, '').replace(/^icon-/, '');
  return names.has(name) ? icon(name, className) : h('img', { src: source, class: className, alt: '' });
}

/* Item feedback keeps its readable text while using the same art as its button. */
const EMOJI = { '💡': 'hint-bulb', '⏳': 'hourglass', '🛡': 'score-protection', '💊': 'smart-pill', '🏆': 'ranking', '✨': 'sparkle', '⭐': 'star', '🌟': 'star', '💥': 'power', '⚡': 'rapid', '🚀': 'multi', '🎯': 'pierce', '💣': 'blast', '🔊': 'sound', '🔇': 'sound-muted' };
const emojiPattern = /(💡|⏳|🛡️?|💊|🏆|✨|⭐|🌟|💥|⚡|🚀|🎯|💣|🔊|🔇)/gu;
export function setIconText(element, text) {
  element.replaceChildren(...String(text).split(emojiPattern).filter(Boolean).map((part) => {
    const name = EMOJI[part.replace(/\uFE0F/g, '')];
    return name ? icon(name) : part;
  }));
}
