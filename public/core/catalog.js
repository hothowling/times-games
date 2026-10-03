/*
 * catalog.js - 상점 품목, 가격, 보상 규칙. 서버(server/app.js)와 브라우저가 같은 파일을 씁니다.
 * DOM 을 쓰지 않는 순수 데이터만 둡니다.
 */

/* 프리셋 캐릭터. 모든 계정에 항상 보입니다. 사진 캐릭터 키는 'p<id>' 입니다. */
export const PRESETS = ['sooji', 'jiho'];

/* 착용 슬롯. outfit 은 항상 하나를 입고, 나머지는 비울 수 있습니다. */
export const SLOTS = ['outfit', 'head', 'face', 'back'];
export const DEFAULT_LOOK = { outfit: 'uniform', head: null, face: null, back: null };

const W = 'assets/wearables/';
const cos = (slot, file, price, ko, en, extra) =>
  Object.assign({ slot, img: W + file, price, name: { ko, en } }, extra);

/* 꾸미기: 계정 공유, 한 번 사면 계속 보유. price 0 은 처음부터 보유. */
export const COSMETICS = {
  uniform: cos('outfit', 'outfits/01-school-uniform.webp', 0, '단정한 교복', 'Classic Uniform'),
  sailor: cos('outfit', 'outfits/02-sailor-uniform.webp', 18, '세일러 교복', 'Sailor Uniform'),
  hoodie: cos('outfit', 'outfits/03-casual-hoodie.webp', 20, '컬러 후드', 'Color Hoodie'),
  overalls: cos('outfit', 'outfits/04-denim-overalls.webp', 22, '데님 멜빵', 'Denim Overalls'),
  pinkDress: cos('outfit', 'outfits/05-pink-dress.webp', 25, '핑크 리본 드레스', 'Pink Ribbon Dress'),
  mintDress: cos('outfit', 'outfits/06-mint-dress.webp', 25, '민트 플라워 드레스', 'Mint Flower Dress'),
  labCoat: cos('outfit', 'outfits/07-lab-coat.webp', 30, '꼬마 과학자 가운', 'Junior Scientist Coat'),
  heroSuit: cos('outfit', 'outfits/08-hero-suit.webp', 35, '별빛 히어로 슈트', 'Star Hero Suit'),
  jersey: cos('outfit', 'outfits/09-sports-jersey.webp', 28, '7번 스포츠 저지', 'Number 7 Jersey'),
  magic: cos('outfit', 'outfits/10-magic-costume.webp', 40, '마법학교 제복', 'Magic Academy Uniform'),
  redCap: cos('head', 'red-cap.webp', 10, '빨간 모자', 'Red Cap'),
  bowRed: cos('head', 'hair-bows/01-classic-red-bow.webp', 10, '클래식 빨간 리본', 'Classic Red Bow', { style: 'bow' }),
  bowPink: cos('head', 'hair-bows/02-pink-polka-bow.webp', 10, '핑크 도트 리본', 'Pink Polka Bow', { style: 'bow' }),
  bowNavy: cos('head', 'hair-bows/03-navy-school-bow.webp', 10, '네이비 스쿨 리본', 'Navy School Bow', { style: 'bow' }),
  bowYellow: cos('head', 'hair-bows/04-yellow-star-bow.webp', 10, '노란 별 리본', 'Yellow Star Bow', { style: 'bow' }),
  bowMint: cos('head', 'hair-bows/05-mint-flower-bow.webp', 10, '민트 꽃 리본', 'Mint Flower Bow', { style: 'bow' }),
  bowPurple: cos('head', 'hair-bows/06-purple-magic-bow.webp', 10, '보라 마법 리본', 'Purple Magic Bow', { style: 'bow' }),
  glasses: cos('face', 'glasses.webp', 20, '동그란 안경', 'Round Glasses'),
  backpack: cos('back', 'backpack.webp', 30, '파란 가방', 'Blue Backpack')
};

/* 게임별 소모품: 사면 개수가 늘고, 게임 안에서 쓰면 줄어듭니다. id 는 '<게임>.<이름>' */
const U = 'assets/ui/';
const item = (game, icon, price, ko, en, descKo, descEn) =>
  ({ game, icon: U + icon, price, name: { ko, en }, desc: { ko: descKo, en: descEn } });

export const ITEMS = {
  'classroom.cheat': item('classroom', 'cheat-sneak.webp', 10, '두 개 지우기', 'Cheat Sneak', '틀린 답 2개를 지워 줘요.', 'Removes two wrong choices.'),
  'classroom.cookie': item('classroom', 'cookie.webp', 15, '풀이 쿠키', 'Cookie', '정답으로 가는 풀이를 알려 줘요.', 'Shows a helpful way to solve it.'),
  'classroom.protect': item('classroom', 'score-protection.webp', 20, '점수 보호', 'Score Protection', '틀린 문제 1개를 맞은 것으로 지켜 줘요.', 'Protects one wrong answer in a test.'),
  'classroom.pill': item('classroom', 'smart-pill.webp', 30, '똑똑 알약', 'Smart Pill', '현재 문제의 정답을 보여 줘요.', 'Shows the answer to this question.')
};

/* 게임 결과 별(0~3) → Sparkles. 모든 게임 공통. */
export const REWARD = [1, 3, 6, 10];

export const GAMES = ['master', 'blocks', 'shooter', 'classroom'];

export const isPhotoKey = (key) => /^p\d+$/.test(key);

/* 장착 상태가 규칙에 맞는지 검사합니다. owned(id) 는 보유 여부를 돌려주는 함수. */
export function validLook(equipped, owned) {
  if (!equipped || typeof equipped !== 'object') return false;
  for (const slot of SLOTS) {
    const id = equipped[slot];
    if (id == null) {
      if (slot === 'outfit') return false;
      continue;
    }
    const c = COSMETICS[id];
    if (!c || c.slot !== slot || !owned(id)) return false;
  }
  return Object.keys(equipped).every((k) => SLOTS.includes(k));
}
