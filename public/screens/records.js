/*
 * records.js - 최근 14일 기록. 서버의 판 기록(plays)을 이 기기 날짜로 묶어 보여 줍니다.
 */
import { api } from '../core/api.js';
import { t, pick, getLang } from '../core/i18n.js';
import { h } from '../core/dom.js';
import { GAMES } from '../games/index.js';

const dayKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* plays → [{ day, games: { id: { plays, stars, sparkles } } }] 최신 날짜부터 */
export function groupByDay(plays) {
  const days = new Map();
  for (const p of plays) {
    const k = dayKey(p.at);
    if (!days.has(k)) days.set(k, {});
    const g = days.get(k);
    const s = (g[p.game] ||= { plays: 0, stars: 0, sparkles: 0 });
    s.plays += 1;
    s.stars += p.stars;
    s.sparkles += p.sparkles;
  }
  return [...days].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([day, games]) => ({ day, games }));
}

export function render(view, { go, errorText }) {
  const list = h('div', null, h('p', { class: 'loading' }, '…'));
  view.append(
    h('button', { type: 'button', class: 'back-btn', onclick: () => go('lobby') }, '‹ ' + t('back')),
    h('h2', { class: 'screen-title' }, t('records')),
    list
  );
  api('GET', 'records?days=14').then(({ plays }) => {
    list.textContent = '';
    const days = groupByDay(plays);
    if (!days.length) { list.append(h('p', { class: 'screen-empty' }, t('noRecord'))); return; }
    const today = dayKey(Date.now());
    for (const { day, games } of days) {
      const label = day === today ? t('today')
        : new Date(day + 'T00:00').toLocaleDateString(getLang(), { month: 'long', day: 'numeric', weekday: 'short' });
      list.append(h('div', { class: 'rec-day' }, h('h3', null, label),
        Object.entries(games).map(([id, s]) => h('div', { class: 'rec-line' },
          h('b', null, pick(GAMES.find((g) => g.id === id)?.title) || id),
          h('span', null, `${t('plays', { n: s.plays })} · ★${s.stars} · ✨${s.sparkles}`)))));
    }
  }, (err) => { list.textContent = errorText(err); });
}
