/*
 * games/index.js - 미니게임 목록. 새 게임 = games/<id>/ 폴더 + 여기에 한 줄.
 * 게임 폴더: index.js(export function mount(el, ctx) → { destroy }), game.css(.game-<id> 아래로 스코프)
 * 서버가 받는 게임 id 는 core/catalog.js 의 GAMES 에도 넣어야 합니다.
 * items: 이 게임에서 쓸 수 있는 공통 아이템(core/catalog.js ITEMS). 효과는 게임이 정합니다.
 * short: 랭킹 탭 이름, rank: 랭킹 값 표시({n}). 랭킹 값은 서버가 max(score) 로 셉니다(교실만 최고 라운드, server/app.js BOARD_SQL).
 */
export const GAMES = [
   {
    id: 'capitals', items: ['hint', 'eraser', 'time', 'shield', 'pill'], thumb: 'assets/thumbs/capitals.jpg',
    title: { ko: '수도 맞히기', en: 'Capital Quiz' },
    short: { ko: '수도', en: 'Capitals' }, rank: { ko: '{n}점', en: '{n} pts' },
    desc: { ko: '국기와 나라를 보고 수도를 골라요.', en: 'See the flag and pick the capital city.' }
  },
  {
    id: 'classroom', items: ['hint', 'eraser', 'shield', 'pill'], thumb: 'assets/thumbs/ttclass.jpg',
    title: { ko: '수지와 지호의 교실', en: "Sooji & Jiho's Classroom" },
    short: { ko: '교실', en: 'Classroom' }, rank: { ko: '{n}라운드', en: 'Round {n}' },
    desc: { ko: '시험지를 풀고 선생님께 채점받아요.', en: 'Solve the test on your desk and get graded.' }
  },
  {
    id: 'shooter', items: ['time', 'shield'], thumb: 'assets/thumbs/ttshooter.jpg',
    title: { ko: '구구단 슈터', en: 'Times Table Shooter' },
    short: { ko: '슈터', en: 'Shooter' }, rank: { ko: '{n}점', en: '{n} pts' },
    desc: { ko: '정답을 눌러 떨어지는 문제를 맞혀요.', en: 'Tap the right answer to fire at falling problems.' }
  },
  {
    id: 'blocks', items: ['hint'], thumb: 'assets/thumbs/ttblock.jpg',
    title: { ko: '구구단 땅따먹기', en: 'Times Table Blocks' },
    short: { ko: '땅따먹기', en: 'Blocks' }, rank: { ko: 'Lv {n}', en: 'Lv {n}' },
    desc: { ko: '숫자 카드에 맞는 블록으로 판을 채워요.', en: 'Draw blocks that match each card and fill the board.' }
  },
  {
    id: 'master', items: ['hint', 'time', 'pill'], thumb: 'assets/thumbs/tt.jpg',
    title: { ko: '구구단 마스터', en: 'Times Table Master' },
    short: { ko: '마스터', en: 'Master' }, rank: { ko: '{n}점', en: '{n} pts' },
    desc: { ko: '시간 안에 빠르게 답하고 별을 모아요.', en: 'Answer fast before the timer runs out.' }
  }
 
];
