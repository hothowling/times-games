/*
 * rules.js - 구구단 슈터의 규칙(DOM 없음). tests/shooter.test.js 에서 검사합니다.
 * 원본: times-shooter/game.js 위쪽 규칙 함수
 */

const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* 라운드가 오를수록 문제 수와 단 범위는 늘고, 떨어지는 시간과 나오는 간격은 줄어듭니다. */
export function roundConfig(r) {
  return {
    count: Math.min(6 + 2 * r, 20),          /* 이번 라운드 문제 수 */
    fallSec: Math.max(5, 12.7 - 0.7 * r),    /* 맨 위에서 바닥까지 걸리는 시간 */
    gapSec: Math.max(1.2, 4.35 - 0.35 * r),  /* 다음 문제가 나오는 간격 */
    maxDan: Math.min(9, 4 + r)               /* 2단 ~ maxDan단 */
  };
}

export function makeQuestion(maxDan) {
  return { a: rand(2, maxDan), b: rand(1, 9) };
}

/* 정답 + 헷갈리는 오답 4개(이웃 곱, ±1, ±2, ±10). ans+1, ans+2, ans+10, ans-1 은 늘 쓸 수 있어 5개가 채워집니다. */
export function makeChoices(a, b) {
  const ans = a * b;
  const out = [ans];
  for (const n of shuffle([a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10])) {
    if (n > 0 && out.length < 5 && !out.includes(n)) out.push(n);
  }
  return shuffle(out);
}

/*
 * 별: 하트가 다 떨어질 때까지 끝없이 하는 게임이라 '깬 라운드 수'로 정합니다.
 *   0라운드 → 0개, 1라운드 → 1개, 2~3라운드 → 2개, 4라운드 이상 → 3개
 * roundConfig 로 보면 1~4라운드 문제 수는 8·10·12·14개라서,
 * 별 3개는 문제 44개를 하트 5개로 버텨야 하고(5라운드는 9.2초 만에 떨어짐) 2개는 18개면 됩니다.
 */
export function starsFor(roundsCleared) {
  if (roundsCleared >= 4) return 3;
  if (roundsCleared >= 2) return 2;
  return roundsCleared >= 1 ? 1 : 0;
}
