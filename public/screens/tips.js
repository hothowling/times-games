/*
 * tips.js - 로비 캐릭터 위 말풍선에 돌아가며 보여 주는 도움말.
 *   go: 말풍선을 누르면 갈 화면(없으면 다음 도움말로).  when(state): 이 조건일 때만 보여 줌.
 * 새 기능이 생기면 여기에 한 줄 추가하면 됩니다.
 */
export const TIPS = [
  { go: 'shop', ko: '캐릭터를 꾸며 보세요! 상점에 옷·모자·안경이 가득해요.', en: 'Dress up your character! The shop is full of outfits, hats and glasses.' },
  { go: 'shop', ko: '펫을 데려오면 캐릭터 옆에서 함께 다녀요.', en: 'Adopt a pet and it will stay right by your side.' },
  { go: 'shop', ko: '랜덤박스를 열면 꾸미기 아이템이 나올 수도 있어요.', en: 'Open a mystery box — you might get something to wear!' },
  { ko: '매일 처음 들어오면 랜덤박스 선물이 도착해요.', en: 'Come back every day for a free mystery box.' },
  { go: 'chars', ko: '사진으로 나만의 캐릭터를 만들 수 있어요.', en: 'Make your own character from a photo.' },
  { go: 'chars', ko: '캐릭터마다 다른 옷을 입혀 줄 수 있어요.', en: 'Each character can wear a different outfit.' },
  { go: 'ranking', ko: '랭킹은 매주 월요일에 새로 시작해요. 이번 주 1등에 도전!', en: 'Rankings start fresh every Monday. Go for #1 this week!' },
  { ko: '별 3개를 받으면 Sparkles를 훨씬 많이 받아요.', en: 'Get 3 stars to earn a lot more Sparkles.' },
  { ko: '어려운 판은 게임 속 아이템(힌트·모래시계·방패)으로 넘어 봐요.', en: 'Stuck? Try in-game items like hints, hourglasses and shields.' },
  { go: 'play/wordmatch', ko: '영단어 짝맞추기에는 놀이 방법이 5가지나 있어요.', en: 'Word Match has 5 different ways to play.' },
  { go: 'play/capitals', ko: '수도 맞히기는 정답 사진과 함께 수도 이름을 읽어 줘요.', en: 'Capital Quiz reads the capital aloud with a photo.' },
  { go: 'play/defense', ko: '구구단 디펜스: 금빛 좀비를 잡으면 퀴즈로 미사일이 강해져요.', en: 'Defense: catch the golden zombie to power up your missiles.' },
  { go: 'records', ko: '기록에서 그동안 한 게임을 다시 볼 수 있어요.', en: 'See every game you have played in Records.' },
  { ko: '설정(톱니바퀴)에서 소리와 읽어주기를 켜고 끌 수 있어요.', en: 'Turn sound and read-aloud on or off in Settings (the gear).' }
];
