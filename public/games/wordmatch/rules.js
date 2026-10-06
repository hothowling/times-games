/*
 * rules.js - 영단어 짝맞추기 규칙(DOM 없음). tests/wordmatch.test.js 에서 검사합니다.
 * 한 판 = 단어 N개(쌍) → 카드 2N장(영어 1장 + 한글 1장씩)을 섞어 깝니다.
 */
import { WORDS } from './words.js';

export const LEVELS = [1, 2, 3];
/* 레벨 → 쌍 개수(8/10/12). */
export const pairsFor = (level) => [8, 10, 12][Math.min(3, Math.max(1, Number(level) || 1)) - 1];

export const REVIEW_MAX = 100;

export function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/*
 * 이 학년·주제에서 쓸 단어 후보. 같은 학년이 먼저, 모자라면 다른 학년 같은 주제가 뒤에 붙습니다.
 * topic 이 없거나 'all' 이면 모든 주제.
 */
export function poolFor(grade, topic, words = WORDS) {
  const inTopic = words.filter((w) => !topic || topic === 'all' || w.topic === topic);
  const same = inTopic.filter((w) => w.grade === grade);
  const other = inTopic.filter((w) => w.grade !== grade);
  return { same, other };
}

/*
 * makeRound({ grade, topic, pairs, reviewIds, rng, words })
 *   → { words: [단어...], cards: [{ uid, wordId, side: 'en'|'ko', text }] }
 * 복습 단어(reviewIds 중 이 주제에 있는 것)를 먼저 넣되 쌍의 절반까지만, 나머지는 같은 학년 → 다른 학년 순.
 * 한 판 안에서 같은 뜻(ko)이나 같은 영어(en)는 두 번 나오지 않습니다. 후보가 모자라면 쌍 수가 줄어듭니다.
 */
export function makeRound({ grade, topic, pairs = 8, reviewIds = [], rng = Math.random, words = WORDS } = {}) {
  const { same, other } = poolFor(grade, topic, words);
  const byId = new Map([...same, ...other].map((w) => [w.id, w]));
  const picked = [];
  const ko = new Set();
  const en = new Set();
  const add = (w) => {
    if (!w || picked.length >= pairs || ko.has(w.ko) || en.has(w.en.toLowerCase())) return;
    picked.push(w);
    ko.add(w.ko);
    en.add(w.en.toLowerCase());
  };
  const reviewCap = Math.ceil(pairs / 2);
  for (const id of reviewIds) {
    if (picked.length >= reviewCap) break;
    add(byId.get(id));
  }
  for (const w of shuffle([...same], rng)) add(w);
  for (const w of shuffle([...other], rng)) add(w);

  const cards = shuffle(picked.flatMap((w) => [
    { uid: w.id + ':en', wordId: w.id, side: 'en', text: w.en },
    { uid: w.id + ':ko', wordId: w.id, side: 'ko', text: w.ko }
  ]), rng);
  return { words: picked, cards };
}

/* 두 카드가 짝인지: 같은 단어의 영어 카드와 한글 카드. */
export function judge(a, b) {
  const ok = !!a && !!b && a.uid !== b.uid && a.side !== b.side && a.wordId === b.wordId;
  return { ok, wordId: ok ? a.wordId : null };
}

/* 콤보 축하(팡파레) 지점 */
export const COMBO_CHEERS = [3, 5, 10];

/*
 * 점수: 쌍마다 100 + 가장 긴 콤보 × 20 + 빨리 끝낸 보너스(쌍당 8초 기준, 남은 초 × 5) - 틀린 횟수 × 30. 0 아래로는 안 내려감.
 */
export function scoreFor({ pairs, wrong = 0, seconds = 0, maxCombo = 0 }) {
  const speed = Math.max(0, Math.round(pairs * 8 - seconds)) * 5;
  return Math.max(0, pairs * 100 + maxCombo * 20 + speed - wrong * 30);
}

/*
 * 별(다 맞힌 판만 부르므로 최소 1개).
 *   3: 틀린 횟수 ≤ 쌍/8(내림) 이고 쌍당 10초 안
 *   2: 틀린 횟수 ≤ 쌍/3(올림)
 *   1: 그 밖
 */
export function starsFor({ pairs, wrong = 0, seconds = 0 }) {
  if (!pairs) return 0;
  if (wrong <= Math.floor(pairs / 8) && seconds <= pairs * 10) return 3;
  if (wrong <= Math.ceil(pairs / 3)) return 2;
  return 1;
}

/*
 * 복습 큐 갱신: 이번 판에 틀린 단어는 맨 앞에, 이번 판에 틀리지 않고 맞힌 복습 단어는 뺍니다. 최대 REVIEW_MAX 개.
 */
export function nextReview(prev = [], { wrongIds = [], clearedIds = [] } = {}) {
  const wrong = new Set(wrongIds);
  const cleared = new Set(clearedIds.filter((id) => !wrong.has(id)));
  const out = [...wrong, ...prev.filter((id) => !wrong.has(id) && !cleared.has(id))];
  return out.slice(0, REVIEW_MAX);
}
