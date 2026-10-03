/*
 * rules.js - 판 만들기와 규칙 판정(원본 times-block/js/puzzle.js). DOM 을 쓰지 않아 node --test 로 검증합니다.
 *
 * 판은 직사각형을 반복해서 둘로 자르는 방식(길로틴 분할)으로 만듭니다.
 * 조각의 가로·세로는 항상 2~9칸이라, 조각 넓이(= 카드 숫자)는 모두 구구단의 곱입니다.
 */

export const MIN_SIDE = 2;
export const MAX_SIDE = 9;
const MAX_PIECE_AREA = 24; /* 이보다 넓은 조각은 더 자릅니다 */

/* 판 크기: 1~2판 6×6, 3~4판 7×7, 5~6판 8×8, 7~9판 9×9, 10판부터 10×10 */
export function boardSize(level) {
  let n = Math.max(1, Math.floor(Number(level)) || 1);
  if (n <= 2) return 6;
  if (n <= 4) return 7;
  if (n <= 6) return 8;
  if (n <= 9) return 9;
  return 10;
}

function split(r, rand, out) {
  let canW = r.w >= MIN_SIDE * 2;
  let canH = r.h >= MIN_SIDE * 2;
  let area = r.w * r.h;
  let must = r.w > MAX_SIDE || r.h > MAX_SIDE || area > MAX_PIECE_AREA;
  if (!canW && !canH) { out.push(r); return; }
  if (!must && (area <= 6 || rand() < (area <= 12 ? 0.7 : 0.35))) { out.push(r); return; }

  let axis;
  if (r.w > MAX_SIDE) axis = 'w';
  else if (r.h > MAX_SIDE) axis = 'h';
  else if (canW && canH) axis = rand() < r.w / (r.w + r.h) ? 'w' : 'h';
  else axis = canW ? 'w' : 'h';

  let size = r[axis];
  let k = MIN_SIDE + Math.floor(rand() * (size - MIN_SIDE * 2 + 1)); /* 2 ~ size-2 */
  if (axis === 'w') {
    split({ x: r.x, y: r.y, w: k, h: r.h }, rand, out);
    split({ x: r.x + k, y: r.y, w: r.w - k, h: r.h }, rand, out);
  } else {
    split({ x: r.x, y: r.y, w: r.w, h: k }, rand, out);
    split({ x: r.x, y: r.y + k, w: r.w, h: r.h - k }, rand, out);
  }
}

/* 조각 수가 알맞고(넓이/12 ~ 넓이/6) 같은 숫자가 너무 몰리지 않은 판이 나올 때까지 다시 자릅니다. */
function goodSet(pieces, area) {
  let n = pieces.length;
  if (n < Math.ceil(area / 12) || n > Math.floor(area / 6)) return false;
  let seen = {};
  let distinct = 0;
  for (let i = 0; i < n; i++) {
    let a = pieces[i].w * pieces[i].h;
    if (!seen[a]) { seen[a] = true; distinct++; }
  }
  return distinct * 2 >= n;
}

/* 조각 목록 [{x, y, w, h}] 을 돌려줍니다. 정답 예시일 뿐, 다른 배치로 채워도 성공입니다. */
export function generate(W, H, rand) {
  let out;
  for (let tries = 0; tries < 200; tries++) {
    out = [];
    split({ x: 0, y: 0, w: W, h: H }, rand || Math.random, out);
    if (goodSet(out, W * H)) break;
  }
  return out; /* ponytail: 200번 안에 못 찾으면 마지막 판을 그대로 씁니다(실제로는 몇 번 안에 찾음) */
}

/* 카드 숫자(큰 수부터) */
export function cardsFor(pieces) {
  return pieces.map(function (p) { return p.w * p.h; }).sort(function (a, b) { return b - a; });
}

/* 두 칸을 꼭짓점으로 하는 직사각형 */
export function rectFrom(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x) + 1,
    h: Math.abs(a.y - b.y) + 1
  };
}

/*
 * 놓을 수 있는지 판정합니다.
 * owner: 길이 W*H, 빈 칸은 -1. cards: 숫자 배열, used: 같은 길이의 true/false.
 * 돌려주는 값: { ok: true, card: 카드 번호 } 또는 { ok: false, reason }
 *   reason: 'small'(한 변이 1칸) | 'big'(한 변이 9칸 초과) | 'overlap' | 'nocard'
 */
export function check(r, W, owner, cards, used) {
  if (r.w < MIN_SIDE || r.h < MIN_SIDE) return { ok: false, reason: 'small' };
  if (r.w > MAX_SIDE || r.h > MAX_SIDE) return { ok: false, reason: 'big' };
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (owner[y * W + x] >= 0) return { ok: false, reason: 'overlap' };
    }
  }
  let area = r.w * r.h;
  for (let i = 0; i < cards.length; i++) {
    if (!used[i] && cards[i] === area) return { ok: true, card: i };
  }
  return { ok: false, reason: 'nocard' };
}

/* 별 등급: 지운 조각이 없으면 3개, 3개 이하면 2개, 그 외 1개 */
export function starsFor(removed) {
  if (removed <= 0) return 3;
  if (removed <= 3) return 2;
  return 1;
}
