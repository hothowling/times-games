/*
 * rules.js - 구구단 마스터 규칙을 담은 순수 함수 모음입니다.
 * DOM 이나 브라우저 API 를 전혀 쓰지 않으므로 node --test 로 그대로 검증할 수 있습니다.
 * 원본: times-table-game/js/rules.js
 */

const EPS = 1e-9;

function normalizeRound(round) {
  const r = Math.floor(Number(round));
  return !Number.isFinite(r) || r < 1 ? 1 : r;
}

/* 라운드별 문제 수: 1~2라운드 10문제에서 시작해 11라운드부터 20문제로 굳어집니다. */
export function questionCount(round) {
  const r = normalizeRound(round);
  if (r <= 2) return 10;
  if (r <= 4) return 12;
  if (r <= 6) return 14;
  if (r <= 8) return 16;
  if (r <= 10) return 18;
  return 20;
}

/* 라운드별 단 범위. 앞 라운드는 좁게, 5라운드부터는 2~9단 전체입니다. */
export function danRange(round) {
  const r = normalizeRound(round);
  if (r <= 2) return [2, 5];
  if (r <= 4) return [2, 7];
  return [2, 9];
}

/* 제한시간: 7.0초에서 라운드마다 0.3초씩 줄고 2.5초에서 멈춥니다. */
export function timeLimit(round) {
  const raw = Math.max(2.5, 7.0 - 0.3 * (normalizeRound(round) - 1));
  return Math.round(raw * 10) / 10;
}

/* 제한시간 절반 안에 맞히면 2점, 그 뒤에 맞히면 1점, 넘기면 0점입니다. */
export function pointsFor(elapsed, limit) {
  let e = Number(elapsed);
  const l = Number(limit);
  if (!Number.isFinite(e) || !Number.isFinite(l) || l <= 0) return 0;
  if (e < 0) e = 0;
  if (e <= l / 2 + EPS) return 2;
  if (e <= l + EPS) return 1;
  return 0;
}

/* 문제를 구분하는 키. 한 라운드 안 중복 방지와 오답 기억(진행도 저장)에 함께 씁니다. */
export const key = (a, b) => a + 'x' + b;

function hasKey(missed, k) {
  if (!missed) return false;
  if (typeof missed.has === 'function') return !!missed.has(k);
  if (Array.isArray(missed)) return missed.includes(k);
  return !!missed[k];
}

/*
 * 한 라운드의 문제 목록을 만듭니다.
 * - 같은 식은 두 번 나오지 않습니다.
 * - 지난 라운드에서 틀렸거나 시간 초과한 식(missed: Set, 배열, 객체)은 가중치 3배로 더 자주 뽑힙니다.
 * - rng 는 0 이상 1 미만 값을 돌려주는 함수(테스트에서 주입 가능, 기본값 Math.random).
 */
export function buildRound(round, missed, rng) {
  const rand = typeof rng === 'function' ? rng : Math.random;
  const [lo, hi] = danRange(round);
  const count = questionCount(round);
  const pool = [];
  for (let a = lo; a <= hi; a++) {
    for (let b = 1; b <= 9; b++) {
      pool.push({ a, b, answer: a * b, weight: hasKey(missed, key(a, b)) ? 3 : 1 });
    }
  }
  const out = [];
  while (out.length < count && pool.length > 0) {
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = rand() * total;
    if (!Number.isFinite(r) || r < 0) r = 0;
    if (r >= total) r = total - EPS;
    let acc = 0;
    let picked = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      acc += pool[i].weight;
      if (r < acc) { picked = i; break; }
    }
    const { a, b, answer } = pool.splice(picked, 1)[0];
    out.push({ a, b, answer });
  }
  return out;
}

/*
 * 키패드 입력 판정.
 * 지금까지 누른 숫자열이 정답과 같으면 correct,
 * 정답의 접두어면 partial(계속 입력), 그밖에는 wrong(입력 리셋)입니다.
 */
export function checkInput(buffer, answer) {
  const buf = buffer == null ? '' : String(buffer);
  const ans = String(answer);
  if (buf === '') return 'partial';
  if (buf === ans) return 'correct';
  if (ans.length > buf.length && ans.startsWith(buf)) return 'partial';
  return 'wrong';
}

/*
 * 별 등급(0~3)과 보너스 포인트. 이 별 개수가 그대로 ctx.finish 의 stars 가 됩니다.
 * ratio = 획득 포인트 / 만점(문제 수 x 2), avgTimeRatio = 평균 응답 시간 / 제한시간.
 */
export function rating(points, count, avgTimeRatio) {
  const max = (Number(count) || 0) * 2;
  let ratio = max > 0 ? (Number(points) || 0) / max : 0;
  ratio = Math.min(1, Math.max(0, ratio));
  let avg = Number(avgTimeRatio);
  if (!Number.isFinite(avg)) avg = 1;
  if (ratio >= 0.85 - EPS && avg <= 0.5 + EPS) return { stars: 3, bonus: 5 };
  if (ratio >= 0.6 - EPS) return { stars: 2, bonus: 2 };
  if (ratio >= 0.3 - EPS) return { stars: 1, bonus: 0 };
  return { stars: 0, bonus: 0 };
}

/* 10포인트 = 작은 별 1개, 작은 별 5개 = 큰 별 1개. */
export function starsFor(points) {
  const p = Math.max(0, Number(points) || 0);
  const totalSmall = Math.floor(p / 10);
  return { big: Math.floor(totalSmall / 5), small: totalSmall % 5 };
}

/* 타이머 바 색: 50% 초과 초록, 50% 이하 노랑, 20% 이하 빨강. */
export function timerColor(remainRatio) {
  let r = Number(remainRatio);
  if (!Number.isFinite(r)) r = 0;
  if (r <= 0.2) return 'red';
  if (r <= 0.5) return 'yellow';
  return 'green';
}

/*
 * 저장된 진행도({ round, missed })를 믿을 수 있는 값으로 고칩니다.
 * 처음(null)이거나 깨진 값이면 1라운드, 복습 문제 없음으로 시작합니다.
 */
export function readProgress(data) {
  const round = normalizeRound(data?.round);
  const missed = Array.isArray(data?.missed)
    ? data.missed.filter((k) => typeof k === 'string' && /^\dx\d$/.test(k))
    : [];
  return { round, missed };
}
