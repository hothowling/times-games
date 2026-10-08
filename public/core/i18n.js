import { setIconText } from './icons.js';
/*
 * i18n.js - 한국어/영어. 플랫폼 문구는 아래 CORE, 게임 문구는 게임마다 자기 사전을 dict 로 넘깁니다.
 *   t(key, vars, dict)   dict[lang] → CORE[lang] → en → key 순서로 찾고 {name} 을 vars 로 채웁니다.
 *   apply(root, dict)    [data-i18n] → textContent, [data-i18n-html] → innerHTML, [data-i18n-aria] → aria-label
 */

const CORE = {
  ko: {
    appTitle: '똑똑 놀이터',
    nickname: '닉네임', pin: '비밀번호 4자리', login: '들어가기', signup: '처음이에요', signupDo: '만들기',
    haveAccount: '이미 있어요', logout: '나가기',
    badNickname: '닉네임은 2~12글자로 써 주세요.', badPin: '비밀번호는 숫자 4자리예요.',
    nicknameTaken: '이미 있는 닉네임이에요.', badLogin: '닉네임이나 비밀번호가 맞지 않아요.',
    locked: '여러 번 틀려서 10분 동안 잠겼어요.', suspended: '이용이 정지된 계정이에요. 선생님이나 관리자에게 물어봐 주세요.', network: '서버에 연결할 수 없어요. 잠시 뒤 다시 해 주세요.',
    server: '문제가 생겼어요. 잠시 뒤 다시 해 주세요.', notEnough: 'Sparkles 가 모자라요.',
    games: '게임', updated: '업데이트', shop: '상점', records: '기록', characters: '캐릭터', settings: '설정', back: '뒤로', close: '닫기',
    play: '놀기', sound: '소리', voice: '문제 읽어주기', language: 'English',
    chooseCharacter: '누구랑 놀까요?', newCharacter: '사진으로 만들기', del: '지우기', delAsk: '이 캐릭터를 지울까요?',
    dressUp: '꾸미기', wear: '착용', remove: '벗기', wearing: '착용 중', buy: '구매', owned: '보유',
    shopCosmetics: '꾸미기', shopItems: '아이템', bought: '{name}을(를) 샀어요!', qty: '{n}개',
    tryBeforeBuy: '아이템을 눌러 먼저 입어보세요.', tryingOn: '입어보는 중', buyAndWear: '구매하고 착용',
    slot_pet: '펫', petTogether: '함께하는 중', petPreview: '함께 미리보기', petJoin: '함께하기', petRemove: '돌려보내기', buyAndAdopt: '구매하고 데려오기',
    slot_outfit: '옷', slot_head: '머리 장식', slot_face: '안경', slot_back: '가방', newBadge: 'NEW',
    earned: '+{n} Sparkles!', noEarn: '조금 쉬었다가 하면 Sparkles 를 또 받을 수 있어요.',
    today: '오늘', noRecord: '아직 기록이 없어요. 한 판 해볼까요?', plays: '{n}판', exitAsk: '게임을 그만할까요?',
    keepPlaying: '계속하기', goLobby: '로비로', offlineSave: '결과를 저장하지 못했어요. 연결을 확인해 주세요.',
    makerTitle1: '1. 평소 얼굴', makerTitle2: '2. 웃는 얼굴', makerTitle3: '3. 찡그린 얼굴',
    makerHint: '얼굴이 화면 가운데 오도록 정면에서 찍어 주세요. 칸을 누르면 그 표정을 다시 찍어요.',
    takePhoto: '📷 사진 찍기', camGallery: '앨범에서 고르기', camShoot: '찍기',
    camGuide: '얼굴을 동그라미 안에, 눈을 점선에 맞춰요', camDenied: '카메라를 쓸 수 없어서 앨범을 열었어요.', photoGuide: '사진을 끌고, 두 손가락으로 키워서 얼굴을 동그라미에 맞춰요', photoUse: '이 얼굴 쓰기', save: '저장', cancel: '취소', makerName: '이름',
    makerConsent: '보호자와 함께 만들고 있어요. 얼굴 그림은 내 계정에만 저장되고 다른 사람에게 보이지 않아요.',
    makerLoading: '얼굴 찾기 도구를 받는 중… (처음 한 번, 약 7MB)', makerWorking: '얼굴을 찾고 있어요…',
    makerReady: '다 됐어요! 저장을 눌러 주세요.', noFace: '얼굴을 찾지 못했어요. 정면 사진으로 다시 해 주세요.',
    noMask: '사람을 찾지 못했어요. 밝은 곳에서 다시 찍어 주세요.', badImg: '사진을 열 수 없어요.',
    failLoad: '얼굴 찾기 도구를 받지 못했어요. 연결을 확인해 주세요.', failWork: '사진을 처리하지 못했어요.',
    failSave: '저장하지 못했어요.', tooManyCharacters: '사진 캐릭터는 5개까지 만들 수 있어요.',
    privacy: '원본 사진은 이 기기 밖으로 나가지 않아요. 배경을 지운 얼굴 그림만 내 계정에 저장돼요.',
    sooji: '수지', jiho: '지호', nayeon: '나연', angie: '앤지', bs: 'BS',
    ranking: '랭킹', rankWeek: '이번 주', rankAll: '명예의 전당', rankTotal: '전체', rankStars: '★ {n}',
    rankMe: '내 순위', rankNth: '{n}위', rankNone: '아직 기록이 없어요', rankEmpty: '아직 아무도 없어요. 첫 번째 주인공이 되어 볼까요?',
    guestPlay: '손님으로 해 보기', guestNote: '손님으로 놀고 있어요. 계정을 만들면 모은 것이 그대로 남고 Sparkles {n}을 더 받아요!',
    guestMake: '계정 만들기', guestMakeHint: '닉네임과 비밀번호를 정하면 지금까지 모은 Sparkles·아이템·기록이 그대로 남고, 선물로 Sparkles {n}을 받아요!', upgradeDone: '계정을 만들었어요! 선물로 Sparkles {n}을 받았어요.',
    guestLogoutAsk: '손님 기록은 나가면 다시 찾을 수 없어요. 그래도 나갈까요?', rankGuestNote: '손님은 다른 사람 랭킹에 안 보여요',
    tooManyGuests: '손님 계정을 너무 많이 만들었어요. 잠시 뒤 다시 해 주세요.',
    rankHiddenNote: '이름 숨김 중', rankHide: '랭킹에서 내 이름 숨기기', rankResets: '매주 월요일 0시에 새로 시작해요.',
    earnedRank: '+{n} Sparkles! · 이번 주 {r}위',
    boxOpen: '열기', boxLater: '나중에', boxOk: '좋아요!', boxGot: '{name}을(를) 받았어요!', boxHave: '{n}개 있어요',
    itemBuyAsk: '가진 게 없어요. {price} Sparkles 로 사서 바로 쓸까요? (내 Sparkles {n})', itemBuy: '{price} 로 사서 쓰기',
    itemWhere: '쓰는 곳: {games}', itemsTitle: '아이템',
    installMenu: '앱처럼 쓰기',
    boxGift: '오늘의 선물!', boxGiftText: '매일 처음 들어오면 랜덤박스를 하나 줘요. 지금 열어 볼까요?', noItem: '가진 게 없어요.'
  },
  en: {
    appTitle: 'Smart Playground',
    nickname: 'Nickname', pin: '4-digit PIN', login: 'Enter', signup: "I'm new", signupDo: 'Create',
    haveAccount: 'I have one', logout: 'Log out',
    badNickname: 'Nickname must be 2–12 characters.', badPin: 'PIN must be 4 digits.',
    nicknameTaken: 'That nickname is taken.', badLogin: 'Wrong nickname or PIN.',
    locked: 'Too many tries. Locked for 10 minutes.', suspended: 'This account is suspended. Please ask a teacher or the admin.', network: "Can't reach the server. Try again soon.",
    server: 'Something went wrong. Try again soon.', notEnough: 'Not enough Sparkles.',
    games: 'Games', updated: 'Updated', shop: 'Shop', records: 'Records', characters: 'Characters', settings: 'Settings', back: 'Back', close: 'Close',
    play: 'Play', sound: 'Sound', voice: 'Read aloud', language: '한국어',
    chooseCharacter: 'Who will play?', newCharacter: 'Make from photos', del: 'Delete', delAsk: 'Delete this character?',
    dressUp: 'Dress up', wear: 'Wear', remove: 'Remove', wearing: 'Wearing', buy: 'Buy', owned: 'Owned',
    shopCosmetics: 'Dress up', shopItems: 'Items', bought: 'You bought {name}!', qty: '×{n}',
    tryBeforeBuy: 'Tap an item to try it on first.', tryingOn: 'Trying on', buyAndWear: 'Buy and wear',
    slot_pet: 'Pets', petTogether: 'Together', petPreview: 'Previewing together', petJoin: 'Bring along', petRemove: 'Send home', buyAndAdopt: 'Buy and bring along',
    slot_outfit: 'Outfit', slot_head: 'Headwear', slot_face: 'Glasses', slot_back: 'Bag', newBadge: 'NEW',
    earned: '+{n} Sparkles!', noEarn: 'Take a short break to earn Sparkles again.',
    today: 'Today', noRecord: 'No records yet. Shall we play?', plays: '{n} plays', exitAsk: 'Leave this game?',
    keepPlaying: 'Keep playing', goLobby: 'Lobby', offlineSave: "Couldn't save the result. Check your connection.",
    makerTitle1: '1. Normal face', makerTitle2: '2. Smiling face', makerTitle3: '3. Frowning face',
    makerHint: 'Face the camera with your face in the middle. Tap a box to retake that face.',
    takePhoto: '📷 Take photo', camGallery: 'Choose from album', camShoot: 'Shoot',
    camGuide: 'Fit your face in the oval, eyes on the line', camDenied: "Can't use the camera, so the album is open.", photoGuide: 'Drag and pinch the photo to fit the face in the oval', photoUse: 'Use this face', save: 'Save', cancel: 'Cancel', makerName: 'Name',
    makerConsent: 'A parent is helping me. The face picture is saved only to my account and nobody else can see it.',
    makerLoading: 'Downloading face tools… (first time only, about 7MB)', makerWorking: 'Finding the face…',
    makerReady: 'All done! Press Save.', noFace: "Couldn't find a face. Try a front-facing photo.",
    noMask: "Couldn't find a person. Try again in a brighter place.", badImg: "Couldn't open that photo.",
    failLoad: "Couldn't download the face tools. Check your connection.", failWork: "Couldn't process the photo.",
    failSave: "Couldn't save.", tooManyCharacters: 'You can make up to 5 photo characters.',
    privacy: 'Original photos never leave this device. Only the cut-out face is saved to your account.',
    sooji: 'Sooji', jiho: 'Jiho', nayeon: 'Nayeon', angie: 'Angie', bs: 'BS',
    ranking: 'Ranking', rankWeek: 'This week', rankAll: 'Hall of Fame', rankTotal: 'All', rankStars: '★ {n}',
    rankMe: 'My rank', rankNth: '#{n}', rankNone: 'No record yet', rankEmpty: 'Nobody yet. Be the first star!',
    guestPlay: 'Play as a guest', guestNote: "You're playing as a guest. Make an account to keep everything and get {n} bonus Sparkles!",
    guestMake: 'Make an account', guestMakeHint: 'Pick a nickname and PIN to keep your Sparkles, items and records, plus {n} bonus Sparkles!', upgradeDone: 'Account made! You got {n} bonus Sparkles.',
    guestLogoutAsk: "A guest account can't be found again after you log out. Log out anyway?", rankGuestNote: "Guests don't show in others' rankings",
    tooManyGuests: 'Too many guest accounts. Try again later.',
    rankHiddenNote: 'Name hidden', rankHide: 'Hide my name in rankings', rankResets: 'Starts fresh every Monday.',
    earnedRank: '+{n} Sparkles! · #{r} this week',
    boxOpen: 'Open', boxLater: 'Later', boxOk: 'Yay!', boxGot: 'You got {name}!', boxHave: 'You have {n}',
    itemBuyAsk: "You don't have one. Buy it for {price} Sparkles and use it now? (You have {n})", itemBuy: 'Buy for {price} and use',
    itemWhere: 'Used in: {games}', itemsTitle: 'Items',
    installMenu: 'Use like an app',
    boxGift: "Today's gift!", boxGiftText: 'You get a free Mystery Box every day. Open it now?', noItem: "You don't have one."
  }
};

let lang = 'ko';

export const getLang = () => lang;

export function detect() {
  return String(navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function setLang(next) {
  lang = next === 'en' ? 'en' : 'ko';
  document.documentElement.lang = lang;
}

export function t(key, vars, dict) {
  const s = dict?.[lang]?.[key] ?? CORE[lang][key] ?? dict?.en?.[key] ?? CORE.en[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
}

/* {ko, en} 객체(카탈로그 이름 등)에서 현재 언어 값을 고릅니다. */
export const pick = (obj) => obj?.[lang] ?? obj?.en ?? '';

export function apply(root, dict) {
  for (const el of root.querySelectorAll('[data-i18n]')) setIconText(el, t(el.dataset.i18n, null, dict));
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml, null, dict);
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria, null, dict));
}
