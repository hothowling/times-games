/*
 * rules.js - 구구단 디펜스 규칙(DOM 없음). tests/defense.test.js 에서 검사합니다.
 * 좌표는 가로 360 기준의 논리 좌표입니다(세로는 화면 비율에 따라 늘어남).
 */

export const WORLD_W = 360;
export const FENCE_HP = 100;
export const WAVE_SEC = 25;      /* 웨이브 길이 */
export const QUIZ_EVERY = 12;    /* 퀴즈 좀비가 나오는 간격(초) */

/* 좀비 종류: 체력(웨이브 배수 전), 속도(px/초), 반지름, 울타리를 갉는 힘(초당), 점수 */
export const ZOMBIES = {
  normal: { hp: 2, speed: 26, r: 17, bite: 2, points: 10 },
  fast: { hp: 1.4, speed: 48, r: 14, bite: 1.5, points: 15 },
  tank: { hp: 6, speed: 15, r: 25, bite: 4, points: 40 },
  quiz: { hp: 4, speed: 22, r: 19, bite: 2, points: 30 }
};

/*
 * 웨이브가 오를수록 자주, 세게, 조금 빠르게. 빠른 좀비는 2웨이브, 튼튼한 좀비는 3웨이브부터.
 * 체력은 웨이브마다 1.25배(곱): 업그레이드를 다 채워도 언젠가는 무너지게 합니다.
 * 대략(시뮬레이션, 작은 울타리·친구·아이템 없이): 퀴즈를 못 맞히면 4웨이브, 절반 맞히면 5웨이브, 거의 다 맞히면 10웨이브쯤.
 */
/* 5웨이브부터는 더 가파르게: 웨이브마다 체력 ×LATE.hp, 출현 간격 ×LATE.spawn, 튼튼한 좀비 비중 +LATE.tank */
export const LATE_FROM = 5;
export const LATE = { hp: 1.18, spawn: 0.9, tank: 0.8 };

export function waveConfig(wave) {
  const w = Math.max(1, Math.floor(wave) || 1);
  const late = Math.max(0, w - LATE_FROM + 1);   /* 5웨이브부터 1, 2, 3… */
  return {
    spawnGap: Math.max(0.35, 3.0 * 0.88 ** (w - 1) * LATE.spawn ** late),
    hpMul: 1.25 ** (w - 1) * LATE.hp ** late,
    speedMul: Math.min(1.7, 1 + 0.05 * (w - 1) + 0.03 * late),
    weights: { normal: 6, fast: w >= 2 ? 2 + w * 0.3 : 0, tank: w >= 3 ? 1 + w * 0.2 + late * LATE.tank : 0 }
  };
}

export function pickType(wave, rand = Math.random) {
  const ws = Object.entries(waveConfig(wave).weights);
  let r = rand() * ws.reduce((s, [, n]) => s + n, 0);
  for (const [type, n] of ws) if ((r -= n) < 0) return type;
  return 'normal';
}

/*
 * 미사일 업그레이드: 퀴즈를 맞히거나 정답 알약을 쓰면 카드 3장 중 하나를 골라 레벨을 올립니다.
 * lv = { power: 0, rapid: 0, ... } → stats(lv) 가 실제 수치.
 */
export const UPGRADES = {
  power: { max: 5, icon: '💥', name: { ko: '공격력', en: 'Power' }, desc: { ko: '미사일이 더 세져요', en: 'Missiles hit harder' } },
  rapid: { max: 5, icon: '⚡', name: { ko: '연사 속도', en: 'Fire rate' }, desc: { ko: '더 빨리 쏴요', en: 'Fire faster' } },
  multi: { max: 4, icon: '🚀', name: { ko: '다연발', en: 'Multi-shot' }, desc: { ko: '한 번에 미사일이 하나 더', en: 'One more missile per shot' } },
  pierce: { max: 3, icon: '🎯', name: { ko: '관통', en: 'Pierce' }, desc: { ko: '좀비를 하나 더 뚫고 가요', en: 'Goes through one more zombie' } },
  blast: { max: 4, icon: '💣', name: { ko: '폭발', en: 'Blast' }, desc: { ko: '맞은 곳 주변도 터져요', en: 'Explodes around the hit' } }
};

export function stats(lv = {}) {
  return {
    damage: 1.35 ** (lv.power || 0),
    interval: 1.1 * 0.82 ** (lv.rapid || 0),   /* 처음엔 1.1초에 한 발, 연사 5레벨이면 0.4초 */
    shots: 1 + (lv.multi || 0),
    pierce: lv.pierce || 0,
    blast: (lv.blast || 0) * 22   /* 폭발 반지름, 0 이면 없음 */
  };
}

/* 아직 최대가 아닌 업그레이드 중 n 개(다 찼으면 빈 배열). */
export function upgradeChoices(lv, rand = Math.random, n = 3) {
  const left = Object.keys(UPGRADES).filter((id) => (lv[id] || 0) < UPGRADES[id].max);
  for (let i = left.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [left[i], left[j]] = [left[j], left[i]];
  }
  return left.slice(0, n);
}

/* 구구단 퀴즈: 2~9단, 보기 4개(정답 + 헷갈리는 오답). */
export function makeQuiz(rand = Math.random) {
  const a = 2 + Math.floor(rand() * 8);
  const b = 2 + Math.floor(rand() * 8);
  const ans = a * b;
  const pool = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10]
    .filter((n, i, arr) => n > 0 && n !== ans && arr.indexOf(n) === i);
  const choices = [ans];
  while (choices.length < 4) choices.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { a, b, answer: ans, choices };
}

/* 별: 버틴 웨이브. 3웨이브 → 1개, 5웨이브 → 2개, 8웨이브 → 3개 */
export const starsFor = (wave) => (wave >= 8 ? 3 : wave >= 5 ? 2 : wave >= 3 ? 1 : 0);
