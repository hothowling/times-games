/*
 * catalog.js - 상점 품목, 가격, 보상 규칙. 서버(server/app.js)와 브라우저가 같은 파일을 씁니다.
 * DOM 을 쓰지 않는 순수 데이터만 둡니다.
 */

/* 프리셋 캐릭터. 모든 계정에 항상 보입니다. 사진 캐릭터 키는 'p<id>' 입니다. */
export const PRESETS = ['sooji', 'jiho', 'nayeon', 'angie', 'bs'];

/* 의상 선택이 없으면 렌더러가 기본 흰색 티셔츠를 그립니다. */
export const SLOTS = ['outfit', 'head', 'face', 'back', 'pet'];
export const DEFAULT_LOOK = { outfit: null, head: null, face: null, back: null, pet: null };
export const BASE_OUTFIT = 'assets/wearables/outfits/11-white-tee.webp?v=hands-low-20261008';

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
  strongBoy: cos('outfit', 'outfits/14-strong-boy.webp', 35, '스트롱보이 의상', 'Strong Boy Costume'),
  denimJacket: cos('outfit', 'outfits/15-denim-jacket.webp', 25, '데님 재킷', 'Denim Jacket'),
  basketballUniform: cos('outfit', 'outfits/16-basketball-uniform.webp', 28, '23번 농구 유니폼', 'Number 23 Basketball Uniform'),
  juniorAstronaut: cos('outfit', 'outfits/17-junior-astronaut.webp', 35, '꼬마 우주복', 'Junior Astronaut Suit'),
  jungleExplorer: cos('outfit', 'outfits/18-jungle-explorer.webp', 30, '정글 탐험가', 'Jungle Explorer'),
  boysRashguard: cos('outfit', 'outfits/19-boys-rashguard.webp', 28, '남아 래시가드', 'Boys Rashguard'),
  girlsRashguard: cos('outfit', 'outfits/20-girls-rashguard.webp', 28, '여아 래시가드', 'Girls Rashguard'),
  jersey: cos('outfit', 'outfits/09-sports-jersey.webp', 28, '7번 스포츠 저지', 'Number 7 Jersey'),
  magic: cos('outfit', 'outfits/10-magic-costume.webp', 40, '마법학교 제복', 'Magic Academy Uniform'),
  pinkFlowerDress: cos('outfit', 'outfits/12-pink-flower-dress.webp', 25, '핑크 플라워 드레스', 'Pink Flower Dress'),
  purpleSunflowerDress: cos('outfit', 'outfits/13-purple-sunflower-dress.webp', 25, '해바라기 퍼플 드레스', 'Purple Sunflower Dress'),
  redCap: cos('head', 'red-cap.webp', 10, '빨간 모자', 'Red Cap'),
  catEars: cos('head', 'hats/01-cat-ears.webp', 15, '고양이 머리띠', 'Cat Ear Headband'),
  cowboyHat: cos('head', 'hats/02-cowboy-hat.webp', 20, '카우보이 모자', 'Cowboy Hat'),
  hardHat: cos('head', 'hats/03-yellow-hard-hat.webp', 20, '노란 안전모', 'Yellow Hard Hat'),
  propellerHat: cos('head', 'hats/04-propeller-hat.webp', 20, '프로펠러 모자', 'Propeller Hat'),
  chickenHat: cos('head', 'hats/05-chicken-hat.webp', 20, '꼬꼬닭 모자', 'Chicken Hat'),
  watermelonHat: cos('head', 'hats/06-watermelon-hat.webp', 20, '수박 모자', 'Watermelon Hat'),
  bowRed: cos('head', 'hair-bows/01-classic-red-bow.webp', 10, '클래식 빨간 리본', 'Classic Red Bow', { style: 'bow' }),
  bowPink: cos('head', 'hair-bows/02-pink-polka-bow.webp', 10, '핑크 도트 리본', 'Pink Polka Bow', { style: 'bow' }),
  bowNavy: cos('head', 'hair-bows/03-navy-school-bow.webp', 10, '네이비 스쿨 리본', 'Navy School Bow', { style: 'bow' }),
  bowYellow: cos('head', 'hair-bows/04-yellow-star-bow.webp', 10, '노란 별 리본', 'Yellow Star Bow', { style: 'bow' }),
  bowMint: cos('head', 'hair-bows/05-mint-flower-bow.webp', 10, '민트 꽃 리본', 'Mint Flower Bow', { style: 'bow' }),
  bowPurple: cos('head', 'hair-bows/06-purple-magic-bow.webp', 10, '보라 마법 리본', 'Purple Magic Bow', { style: 'bow' }),
  bowPurpleFlower: cos('head', 'hair-bows/07-purple-flower-bow.webp', 10, '퍼플 플라워 리본', 'Purple Flower Ribbon', { style: 'bow' }),
  bowPinkFlower: cos('head', 'hair-bows/08-pink-flower-bow.webp', 10, '핑크 플라워 리본', 'Pink Flower Ribbon', { style: 'bow' }),
  sunflowerClip: cos('head', 'hair-clips/01-large-sunflower.webp', 10, '큰 해바라기 머리핀', 'Large Sunflower Hair Clip', { style: 'clip' }),
  glasses: cos('face', 'glasses.webp', 20, '동그란 안경', 'Round Glasses'),
  batmanGlasses: cos('face', 'glasses/01-batman-mask.webp', 30, '배트맨 가면 안경', 'Batman Mask Glasses', { lensY: 0.65 }),
  heartGlasses: cos('face', 'glasses/02-heart-glasses.webp', 20, '하트 안경', 'Heart Glasses'),
  starGlasses: cos('face', 'glasses/03-star-glasses.webp', 20, '별 안경', 'Star Glasses'),
  spiralGlasses: cos('face', 'glasses/04-spiral-glasses.webp', 20, '빙글빙글 안경', 'Spiral Glasses'),
  frogGlasses: cos('face', 'glasses/05-frog-glasses.webp', 20, '개구리 안경', 'Frog Glasses'),
  swimGoggles: cos('face', 'glasses/06-swim-goggles.webp', 20, '수경', 'Swim Goggles'),
  petPuppy: cos('pet', 'pets/01-puppy.webp', 25, '강아지 펫', 'Puppy Pet'),
  petKitten: cos('pet', 'pets/02-kitten.webp', 25, '고양이 펫', 'Kitten Pet'),
  petBunny: cos('pet', 'pets/03-bunny.webp', 25, '토끼 펫', 'Bunny Pet'),
  petHamster: cos('pet', 'pets/04-hamster.webp', 25, '햄스터 펫', 'Hamster Pet'),
  petFox: cos('pet', 'pets/05-fox.webp', 25, '여우 펫', 'Fox Pet'),
  petSteve: cos('pet', 'pets/06-minecraft-steve.webp', 35, '스티브 펫', 'Steve Pet'),
  petAlex: cos('pet', 'pets/07-minecraft-alex.webp', 35, '알렉스 펫', 'Alex Pet'),
  petCreeper: cos('pet', 'pets/08-minecraft-creeper.webp', 35, '크리퍼 펫', 'Creeper Pet'),
  petNoob: cos('pet', 'pets/09-roblox-noob.webp', 35, '로블록스 눕 펫', 'Roblox Noob Pet'),
  petBacon: cos('pet', 'pets/10-roblox-bacon.webp', 35, '베이컨 헤어 펫', 'Bacon Hair Pet'),
  petPengualaBlue: cos('pet', 'pets/11-penguala-blue.webp', 30, 'Penguala 블루', 'Blue Penguala'),
  petPengualaTurquoise: cos('pet', 'pets/12-penguala-turquoise.webp', 30, 'Penguala 청록', 'Turquoise Penguala'),
  petPengualaPurple: cos('pet', 'pets/13-penguala-purple.webp', 30, 'Penguala 퍼플', 'Purple Penguala'),
  beachBall: cos('pet', 'props/01-beach-ball.webp', 15, '비치볼', 'Beach Ball', { style: 'prop', renderW: 110 }),
  duckSwimRing: cos('pet', 'props/02-duck-swim-ring.webp', 22, '오리 튜브', 'Duck Swim Ring', { style: 'prop', renderW: 130 }),
  stripedSwimRing: cos('pet', 'props/03-striped-swim-ring.webp', 18, '줄무늬 튜브', 'Striped Swim Ring', { style: 'prop', renderW: 120 })
};

/*
 * 아이템이 상점에 들어온 날. 여기에 없는 아이템은 처음부터 있던 것(BASE_DAY)입니다.
 * 새 아이템을 넣을 때 오늘 날짜 줄을 맨 위에 추가하면:
 *   - 가장 최근 날짜의 아이템에만 NEW 배지가 붙고(이전 NEW 는 자동으로 빠짐),
 *   - 상점 각 분류에서 최근에 들어온 것부터 보입니다.
 * 같은 날 두 번 넣었으면 '2026-10-06a', '2026-10-06b' 처럼 글자를 붙여 순서를 정합니다(문자열 순서로 비교).
 */
const BASE_DAY = '2026-10-03';
const ADDED = {
  '2026-10-09b': ['boysRashguard', 'girlsRashguard', 'swimGoggles', 'beachBall', 'duckSwimRing', 'stripedSwimRing'],
  '2026-10-09': ['petPengualaBlue', 'petPengualaTurquoise', 'petPengualaPurple'],
  '2026-10-08': ['denimJacket', 'basketballUniform', 'juniorAstronaut', 'jungleExplorer',
    'bowPurpleFlower', 'bowPinkFlower', 'sunflowerClip'],
  '2026-10-06b': ['strongBoy', 'catEars', 'cowboyHat', 'hardHat', 'propellerHat', 'chickenHat', 'watermelonHat',
    'batmanGlasses', 'heartGlasses', 'starGlasses', 'spiralGlasses', 'frogGlasses',
    'petPuppy', 'petKitten', 'petBunny', 'petHamster', 'petFox', 'petSteve', 'petAlex', 'petCreeper', 'petNoob', 'petBacon'],
  '2026-10-06a': ['pinkFlowerDress', 'purpleSunflowerDress']
};
const LATEST_DAY = Object.keys(ADDED).sort().at(-1);
for (const [day, ids] of Object.entries(ADDED)) for (const id of ids) COSMETICS[id].added = day;
for (const c of Object.values(COSMETICS)) {
  c.added ??= BASE_DAY;
  c.isNew = c.added === LATEST_DAY;
}


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
  friend: item('call-friend.webp', 25, '친구 부르기', 'Call a Friend', '다른 친구(수지·지호·나연)가 와서 30초 동안 같이 싸워요.', 'Another friend (Sooji, Jiho or Nayeon) joins the fight for 30 seconds.')
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

/* 게임 결과 별(0~3) → Sparkles 기본값. 게임별 배율(GAME_REWARD)을 곱합니다. */
export const REWARD = [1, 3, 6, 10];
/*
 * 게임별 보상 배율: 한 판이 긴 게임일수록 크게 해서, 어느 게임이든 1분에 비슷한 Sparkles(약 7~9)를 벌게 합니다.
 * 2026-10-08 운영 기록(390판)으로 잡은 값: 한 판 길이 추정 교실·땅따먹기 ~0.8분, 수도 ~1분, 마스터·영단어 ~1.5분, 슈터 ~2분, 디펜스 ~4분.
 * 이후 plays.duration_ms 가 쌓이면 실제 판 길이로 다시 맞춥니다. 없는 게임은 1.
 */
export const GAME_REWARD = { defense: 4, shooter: 2, master: 1.5, wordmatch: 1.5 };
export const rewardFor = (game, stars) => Math.round(REWARD[stars] * (GAME_REWARD[game] ?? 1));
/* 게임이 한 판에 따로 얹어 줄 수 있는 Sparkles 의 상한(예: 디펜스의 업그레이드를 다 채운 뒤 퀴즈 정답). 서버가 자릅니다. */
export const BONUS_MAX = 30;
/* 홈 화면에 추가한 앱(standalone)으로 처음 들어오면 계정마다 한 번 주는 Sparkles(POST /api/reward/install). */
export const INSTALL_REWARD = 30;
/* 손님이 정식 계정을 만들면(POST /api/upgrade) 한 번 주는 Sparkles. */
export const UPGRADE_REWARD = 30;
/* 설치 안내 팝업의 '다음에': 이만큼 지나면 다시 보여 줍니다. */
export const INSTALL_SNOOZE_MS = 3 * 864e5;

export const GAMES = ['master', 'blocks', 'shooter', 'classroom', 'capitals', 'defense', 'wordmatch'];

export const isPhotoKey = (key) => /^p\d+$/.test(key);

/* 장착 상태가 규칙에 맞는지 검사합니다. owned(id) 는 보유 여부를 돌려주는 함수. */
export function validLook(equipped, owned) {
  if (!equipped || typeof equipped !== 'object') return false;
  for (const slot of SLOTS) {
    const id = equipped[slot];
    if (id == null) {
      continue;
    }
    const c = COSMETICS[id];
    if (!c || c.slot !== slot || !owned(id)) return false;
  }
  return Object.keys(equipped).every((k) => SLOTS.includes(k));
}
