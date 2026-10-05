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

/*
 * 아이템(소모품): 모든 게임이 같은 종류를 쓰고, 효과는 게임마다 다릅니다. 어느 게임이 무엇을 쓰는지는 games/index.js 의 items.
 * 사면 개수가 늘고, 게임 안에서 쓰면 줄어듭니다. 게임 중에 없으면 그 자리에서 사서 바로 씁니다(ctx.items.use).
 * 정답 알약(pill)을 쓴 판은 별을 최대 2개만 받습니다(core/app.js 의 finish).
 */
const U = 'assets/ui/';
const item = (icon, price, ko, en, descKo, descEn) =>
  ({ icon: U + icon, price, name: { ko, en }, desc: { ko: descKo, en: descEn } });

export const ITEMS = {
  hint: item('hint-bulb.webp', 15, '힌트 전구', 'Hint Bulb', '풀이나 다음 할 일을 살짝 알려 줘요.', 'Gives a little hint.'),
  eraser: item('cheat-sneak.webp', 10, '오답 지우기', 'Eraser', '틀린 보기 2개를 지워 줘요.', 'Removes two wrong choices.'),
  time: item('hourglass.webp', 15, '모래시계', 'Hourglass', '시간을 더 주거나 천천히 흐르게 해요.', 'Gives you more time.'),
  shield: item('score-protection.webp', 20, '보호막', 'Shield', '실수 하나를 지켜 줘요.', 'Protects you from one mistake.'),
  pill: item('smart-pill.webp', 30, '정답 알약', 'Answer Pill', '정답을 보여 줘요. 쓴 판은 별을 2개까지만 받아요.', 'Shows the answer. That round gets at most 2 stars.'),
  friend: item('call-friend.webp', 25, '친구 부르기', 'Call a Friend', '수지나 지호가 와서 30초 동안 같이 싸워요.', 'Sooji or Jiho joins the fight for 30 seconds.')
};

/* 예전 게임별 아이템 id → 지금 id. 서버가 시작할 때 인벤토리를 옮깁니다(server/db.js). */
export const ITEM_RENAME = {
  'classroom.cookie': 'hint', 'blocks.hint': 'hint', 'classroom.cheat': 'eraser',
  'classroom.protect': 'shield', 'classroom.pill': 'pill'
};

/*
 * 랜덤박스: 상점에서 사면 바로 열고, 매일 처음 들어오면 하나(인벤토리 'box')를 줍니다. 무엇이 나올지는 서버가 정합니다.
 * BOX_PRIZES: [종류, 값, 가중치]. cosmetic 은 아직 없는 유료 꾸미기 중 하나(다 있으면 Sparkles 30).
 */
export const BOX = {
  id: 'box', icon: U + 'gift-box.webp', price: 15,
  name: { ko: '랜덤박스', en: 'Mystery Box' },
  desc: { ko: '무엇이 나올지 몰라요! Sparkles, 아이템, 꾸미기 중 하나.', en: 'Who knows! Sparkles, an item or something to wear.' }
};
export const BOX_PRIZES = [
  ['sparkles', 5, 30], ['sparkles', 10, 20], ['sparkles', 30, 6], ['sparkles', 50, 2],
  ['item', 'hint', 8], ['item', 'eraser', 8], ['item', 'time', 6], ['item', 'shield', 5], ['item', 'pill', 3], ['item', 'friend', 4],
  ['cosmetic', null, 8]
];

/* rand(n) 은 0 ~ n-1 정수, owned(id) 는 보유 여부. 돌려주는 값: { kind: 'sparkles', amount } | { kind: 'item' | 'cosmetic', id } */
export function pickPrize(rand, owned) {
  const total = BOX_PRIZES.reduce((s, p) => s + p[2], 0);
  let r = rand(total);
  const [kind, value] = BOX_PRIZES.find((p) => (r -= p[2]) < 0);
  if (kind === 'sparkles') return { kind, amount: value };
  if (kind === 'item') return { kind, id: value };
  const left = Object.keys(COSMETICS).filter((id) => COSMETICS[id].price > 0 && !owned(id));
  return left.length ? { kind, id: left[rand(left.length)] } : { kind: 'sparkles', amount: 30 };
}

/* 게임 결과 별(0~3) → Sparkles. 모든 게임 공통. */
export const REWARD = [1, 3, 6, 10];

export const GAMES = ['master', 'blocks', 'shooter', 'classroom', 'capitals', 'defense'];

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
