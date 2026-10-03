/*
 * i18n.js - 한국어/영어. 플랫폼 문구는 아래 CORE, 게임 문구는 게임마다 자기 사전을 dict 로 넘깁니다.
 *   t(key, vars, dict)   dict[lang] → CORE[lang] → en → key 순서로 찾고 {name} 을 vars 로 채웁니다.
 *   apply(root, dict)    [data-i18n] → textContent, [data-i18n-html] → innerHTML, [data-i18n-aria] → aria-label
 */

const CORE = {
  ko: {
    appTitle: '구구단 놀이터',
    nickname: '닉네임', pin: '비밀번호 4자리', login: '들어가기', signup: '처음이에요', signupDo: '만들기',
    haveAccount: '이미 있어요', logout: '나가기',
    badNickname: '닉네임은 2~12글자로 써 주세요.', badPin: '비밀번호는 숫자 4자리예요.',
    nicknameTaken: '이미 있는 닉네임이에요.', badLogin: '닉네임이나 비밀번호가 맞지 않아요.',
    locked: '여러 번 틀려서 10분 동안 잠겼어요.', network: '서버에 연결할 수 없어요. 잠시 뒤 다시 해 주세요.',
    server: '문제가 생겼어요. 잠시 뒤 다시 해 주세요.', notEnough: 'Sparkles 가 모자라요.',
    games: '게임', shop: '상점', records: '기록', characters: '캐릭터', settings: '설정', back: '뒤로', close: '닫기',
    play: '놀기', sound: '소리', voice: '문제 읽어주기', language: 'English',
    chooseCharacter: '누구랑 놀까요?', newCharacter: '사진으로 만들기', del: '지우기', delAsk: '이 캐릭터를 지울까요?',
    dressUp: '꾸미기', wear: '착용', remove: '벗기', wearing: '착용 중', buy: '구매', owned: '보유',
    shopCosmetics: '꾸미기', shopItems: '아이템', bought: '{name}을(를) 샀어요!', qty: '{n}개',
    slot_outfit: '옷', slot_head: '머리 장식', slot_face: '안경', slot_back: '가방',
    earned: '+{n} Sparkles!', noEarn: '조금 쉬었다가 하면 Sparkles 를 또 받을 수 있어요.',
    today: '오늘', noRecord: '아직 기록이 없어요. 한 판 해볼까요?', plays: '{n}판', exitAsk: '게임을 그만할까요?',
    keepPlaying: '계속하기', goLobby: '로비로', offlineSave: '결과를 저장하지 못했어요. 연결을 확인해 주세요.',
    makerTitle1: '1. 평소 얼굴', makerTitle2: '2. 웃는 얼굴', makerTitle3: '3. 찡그린 얼굴',
    makerHint: '얼굴이 화면 가운데 오도록 정면에서 찍어 주세요. 칸을 누르면 그 표정을 다시 찍어요.',
    takePhoto: '사진 찍기 / 고르기', save: '저장', cancel: '취소', makerName: '이름',
    makerConsent: '보호자와 함께 만들고 있어요. 얼굴 그림은 내 계정에만 저장되고 다른 사람에게 보이지 않아요.',
    makerLoading: '얼굴 찾기 도구를 받는 중… (처음 한 번, 약 7MB)', makerWorking: '얼굴을 찾고 있어요…',
    makerReady: '다 됐어요! 저장을 눌러 주세요.', noFace: '얼굴을 찾지 못했어요. 정면 사진으로 다시 해 주세요.',
    noMask: '사람을 찾지 못했어요. 밝은 곳에서 다시 찍어 주세요.', badImg: '사진을 열 수 없어요.',
    failLoad: '얼굴 찾기 도구를 받지 못했어요. 연결을 확인해 주세요.', failWork: '사진을 처리하지 못했어요.',
    failSave: '저장하지 못했어요.', tooManyCharacters: '사진 캐릭터는 5개까지 만들 수 있어요.',
    privacy: '원본 사진은 이 기기 밖으로 나가지 않아요. 배경을 지운 얼굴 그림만 내 계정에 저장돼요.',
    sooji: '수지', jiho: '지호'
  },
  en: {
    appTitle: 'Times Table Playground',
    nickname: 'Nickname', pin: '4-digit PIN', login: 'Enter', signup: "I'm new", signupDo: 'Create',
    haveAccount: 'I have one', logout: 'Log out',
    badNickname: 'Nickname must be 2–12 characters.', badPin: 'PIN must be 4 digits.',
    nicknameTaken: 'That nickname is taken.', badLogin: 'Wrong nickname or PIN.',
    locked: 'Too many tries. Locked for 10 minutes.', network: "Can't reach the server. Try again soon.",
    server: 'Something went wrong. Try again soon.', notEnough: 'Not enough Sparkles.',
    games: 'Games', shop: 'Shop', records: 'Records', characters: 'Characters', settings: 'Settings', back: 'Back', close: 'Close',
    play: 'Play', sound: 'Sound', voice: 'Read aloud', language: '한국어',
    chooseCharacter: 'Who will play?', newCharacter: 'Make from photos', del: 'Delete', delAsk: 'Delete this character?',
    dressUp: 'Dress up', wear: 'Wear', remove: 'Remove', wearing: 'Wearing', buy: 'Buy', owned: 'Owned',
    shopCosmetics: 'Dress up', shopItems: 'Items', bought: 'You bought {name}!', qty: '×{n}',
    slot_outfit: 'Outfit', slot_head: 'Headwear', slot_face: 'Glasses', slot_back: 'Bag',
    earned: '+{n} Sparkles!', noEarn: 'Take a short break to earn Sparkles again.',
    today: 'Today', noRecord: 'No records yet. Shall we play?', plays: '{n} plays', exitAsk: 'Leave this game?',
    keepPlaying: 'Keep playing', goLobby: 'Lobby', offlineSave: "Couldn't save the result. Check your connection.",
    makerTitle1: '1. Normal face', makerTitle2: '2. Smiling face', makerTitle3: '3. Frowning face',
    makerHint: 'Face the camera with your face in the middle. Tap a box to retake that face.',
    takePhoto: 'Take / choose photo', save: 'Save', cancel: 'Cancel', makerName: 'Name',
    makerConsent: 'A parent is helping me. The face picture is saved only to my account and nobody else can see it.',
    makerLoading: 'Downloading face tools… (first time only, about 7MB)', makerWorking: 'Finding the face…',
    makerReady: 'All done! Press Save.', noFace: "Couldn't find a face. Try a front-facing photo.",
    noMask: "Couldn't find a person. Try again in a brighter place.", badImg: "Couldn't open that photo.",
    failLoad: "Couldn't download the face tools. Check your connection.", failWork: "Couldn't process the photo.",
    failSave: "Couldn't save.", tooManyCharacters: 'You can make up to 5 photo characters.',
    privacy: 'Original photos never leave this device. Only the cut-out face is saved to your account.',
    sooji: 'Sooji', jiho: 'Jiho'
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
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n, null, dict);
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml, null, dict);
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria, null, dict));
}
