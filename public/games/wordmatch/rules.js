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

/* ======================================================================
 * 게임 모드
 *   basic      기본: 카드가 다 보이고 시간 제한 없음
 *   timeattack 타임어택: 60초에서 시작, 짝 하나 +5초, 틀리면 -3초, 0초면 끝(그때까지 한 만큼 점수·별)
 *   memory     뒤집기: 카드가 뒷면. 두 장을 뒤집어 짝이면 열린 채로 남고, 아니면 0.9초 뒤 다시 덮음
 *   listen     듣고 찾기: 한글(+그림) 카드만 깔고, 영어 음성을 듣고 맞는 카드를 누름
 *   reverse    거꾸로: 영어 카드만 깔고, 한국어 음성을 듣고 맞는 카드를 누름
 * listen 과 reverse 는 같은 구현을 (cardSide, promptLang) 으로 나눠 씁니다.
 * ==================================================================== */
export const MODES = ['basic', 'timeattack', 'memory', 'listen', 'reverse'];
export const MODE_CONFIG = {
  basic: { faceDown: false, timed: false, cardSide: null, promptLang: null, preview: true },
  timeattack: { faceDown: false, timed: true, cardSide: null, promptLang: null, preview: false },
  memory: { faceDown: true, timed: false, cardSide: null, promptLang: null, preview: false },
  listen: { faceDown: false, timed: false, cardSide: 'ko', promptLang: 'en', preview: false },
  reverse: { faceDown: false, timed: false, cardSide: 'en', promptLang: 'ko', preview: false }
};
export const modeConfig = (mode) => MODE_CONFIG[mode] || MODE_CONFIG.basic;
export const isListenMode = (mode) => !!modeConfig(mode).cardSide;

/* 뒤집기: 시작할 때 모든 카드를 잠깐 보여 주는 시간(0 이면 안 보여 줌), 틀린 두 장을 다시 덮는 시간 */
export const MEMORY_PEEK_MS = 2000;
export const MEMORY_FLIPBACK_MS = 900;
/* 기본 모드 '미리보기': 짝끼리 같은 색으로 보여 주는 시간 */
export const PREVIEW_MS = 3000;

/* 타임어택 시간(초). time 아이템은 +item 초. */
export const TIME_ATTACK = { start: 60, perPair: 5, perWrong: 3, item: 15 };

/*
 * 타임어택 남은 시간(초) = 시작 60 + 맞힌 짝 × 5 + 아이템으로 더한 초 - 틀린 횟수 × 3 - 흐른 시간.
 * 0 아래로는 0. (지우개로 틀린 횟수를 하나 지우면 3초가 돌아옵니다.)
 */
export function timeLeft({ elapsed = 0, matched = 0, wrong = 0, bonus = 0 }, cfg = TIME_ATTACK) {
  return Math.max(0, cfg.start + matched * cfg.perPair + bonus - wrong * cfg.perWrong - elapsed);
}

/* 듣고 찾기: 한 판의 카드는 한쪽(side)만. */
export function cardsForMode(mode, cards) {
  const side = modeConfig(mode).cardSide;
  return side ? cards.filter((c) => c.side === side) : cards;
}

/* 듣고 찾기 문제 순서: 단어 id 를 섞은 것. 복습 단어가 있어도 순서는 무작위(카드 위치를 외우지 않게). */
export function listenOrder(words, rng = Math.random) {
  return shuffle(words.map((w) => w.id), rng);
}

/* 다음 문제: order 에서 아직 안 맞힌 첫 단어. 다 맞혔으면 null. 틀리면 같은 문제를 다시 냅니다(호출하는 쪽이 그대로 둠). */
export function nextTarget(order, clearedIds = []) {
  const done = new Set(clearedIds);
  return order.find((id) => !done.has(id)) ?? null;
}

/* 듣고 찾기 판정: 누른 카드가 지금 문제 단어인지. */
export function judgeTarget(card, targetId) {
  return !!card && targetId != null && card.wordId === targetId;
}

/*
 * 모드별 점수. 랭킹은 모드와 상관없이 이 점수 하나로 겨룹니다.
 *   basic      scoreFor: 쌍 × 100 + 최고 콤보 × 20 + max(0, 쌍 × 8 - 초) × 5 - 틀림 × 30
 *   listen/reverse  쌍 × 120 + 최고 콤보 × 20 + max(0, 쌍 × 6 - 초) × 5 - 틀림 × 40
 *   memory     쌍 × 150 + 최고 콤보 × 40 + max(0, 쌍 × 12 - 초) × 3 - max(0, 틀림 - 쌍) × 15
 *              (처음 '쌍 수' 만큼의 엇갈림은 찾아보는 과정이라 깎지 않음)
 *   timeattack 맞힌 짝 × 150 + 최고 콤보 × 30 - 틀림 × 30
 *              + 다 찾으면 300 + 남은 초 × 10 (시간이 다 되면 이 보너스 없음)
 *              → 같은 실력이면 기본 모드보다 높게 나옵니다(시간 압박 속에서 푼 값).
 * 모두 0 아래로는 안 내려가고 정수입니다.
 */
export function scoreForMode(mode, { pairs = 0, matched = pairs, wrong = 0, seconds = 0, maxCombo = 0, cleared = true, remaining = 0 } = {}) {
  let s;
  switch (mode) {
    case 'timeattack':
      s = matched * 150 + maxCombo * 30 - wrong * 30 + (cleared ? 300 + Math.round(remaining) * 10 : 0);
      break;
    case 'memory':
      s = pairs * 150 + maxCombo * 40 + Math.max(0, Math.round(pairs * 12 - seconds)) * 3 - Math.max(0, wrong - pairs) * 15;
      break;
    case 'listen':
    case 'reverse':
      s = pairs * 120 + maxCombo * 20 + Math.max(0, Math.round(pairs * 6 - seconds)) * 5 - wrong * 40;
      break;
    default:
      return scoreFor({ pairs, wrong, seconds, maxCombo });
  }
  return Math.max(0, Math.round(s));
}

/*
 * 모드별 별.
 *   basic, listen, reverse  starsFor (다 맞힌 판 1~3)
 *   memory     3: 틀림 ≤ 쌍 이고 쌍당 15초 안 / 2: 틀림 ≤ 쌍 × 2 / 1: 그 밖
 *   timeattack 다 찾음: 3(틀림 ≤ 쌍/8 내림) / 2
 *              시간 끝: 찾은 비율 < 1/2 → 0, < 3/4 → 1, 그 이상 → 2
 */
export function starsForMode(mode, { pairs = 0, matched = pairs, wrong = 0, seconds = 0, cleared = true } = {}) {
  if (!pairs) return 0;
  if (mode === 'timeattack') {
    if (cleared) return wrong <= Math.floor(pairs / 8) ? 3 : 2;
    const ratio = matched / pairs;
    return ratio < 0.5 ? 0 : ratio < 0.75 ? 1 : 2;
  }
  if (mode === 'memory') {
    if (wrong <= pairs && seconds <= pairs * 15) return 3;
    if (wrong <= pairs * 2) return 2;
    return 1;
  }
  return starsFor({ pairs, wrong, seconds });
}

/* ---------- 익힌 단어(한 번에 맞힌 단어) ---------- */

/* 익힌 단어 id 목록에 새 id 를 더합니다. 모르는 id 는 버리고 중복 없이. */
export function mergeLearned(prev = [], ids = [], words = WORDS) {
  const known = new Set(words.map((w) => w.id));
  const out = [];
  const seen = new Set();
  for (const id of [...prev, ...ids]) {
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/* 주제별 { n: 익힌 수, total: 전체 수 }. 'all' 은 모든 주제 합. */
export function learnedStats(learned = [], words = WORDS) {
  const set = new Set(learned);
  const out = { all: { n: 0, total: 0 } };
  for (const w of words) {
    const s = (out[w.topic] ||= { n: 0, total: 0 });
    s.total++;
    out.all.total++;
    if (set.has(w.id)) { s.n++; out.all.n++; }
  }
  return out;
}
