import { h } from '../../core/dom.js';
import { icon, iconMarkup } from '../../core/icons.js';
import {
  CUSTOMERS_PER_DAY, COINS, THEMES, makeDay, matchesPortion, numerator,
  billFor, orderWords, readProgress, recordDelivery, dayResult
} from './rules.js';
import { TOPPINGS, orderText, voiceFor } from './voices.js';

export const dict = {
  ko: {
    title: '펫 피자 카페', cfTagline: '작은 손님들, 맛있는 분수!',
    cfDay: '카페 {n}일째', cfGuest: '손님 {n}/6', cfIntro: '펫 손님들의 카페를 운영해요. 영어 주문대로 피자를 자르고, 페소 거스름돈을 건네세요.',
    cfGentle: '손님은 기다려 줘요. 틀려도 다시 만들 수 있어요!',
    cfLevel1: '첫 카페', cfLevel1Desc: '반 · 4분의 1 · 돈 계산',
    cfLevel2: '피자 연구소', cfLevel2Desc: '3·6·8조각 · 같은 크기',
    cfLevel3: '셰프의 도전', cfLevel3Desc: '분수 더하기 · 돈 계산',
    cfStart: '카페 문 열기', cfSaved: '총 {n}명의 손님 · 최고 {s}점',
    cfDecor: '나의 카페 꾸미기', cfGarden: '초록 정원', cfSunset: '복숭아 노을', cfOcean: '푸른 바다',
    cfLocked: '손님 {n}명 더', cfDecorHint: '손님 6명, 18명을 맞으면 새 색깔을 골라요.',
    cfRead: '듣기', cfListening: '재생 중…', cfSoundHelp: '소리를 켜면 주문을 들을 수 있어요.',
    cfVoiceError: '주문 음성을 재생하지 못했어요. 다시 눌러 주세요.',
    cfTranslate: '뜻 보기', cfTranslation: '{p} 피자 {f} 주세요.',
    cfStepOrder: '주문 받기', cfStepPizza: '피자 요리하기', cfStepMoney: '계산하고 건네기',
    cfOrderHint: '손님의 주문을 듣고 확인해요', cfKitchenHint: '조각과 맛을 골라 오븐에 구워요', cfCheckoutHint: '거스름돈과 피자를 함께 건네요',
    cfWelcome: '어서 와요, 작은 셰프!', cfPickLevel: '오늘은 어떤 카페를 열까요?', cfQueue: '오늘의 작은 손님들',
    cfOrderTicket: '손님의 주문서', cfKitchen: '나의 피자 작업대', cfCheckout: '카페 계산대',
    cfBoard: '손님이 주문한 만큼 조각을 눌러요', cfIngredients: '토핑 바구니', cfOvenHint: '준비됐나요? 이제 노릇하게 구워요!',
    cfBaking: '피자가 맛있게 구워지고 있어요!', cfBakingHint: '따뜻한 피자를 꺼내 계산대로 가져갈게요.', cfBaked: '갓 구운 피자 준비 완료!',
    cfEmptyHint: '동전을 눌러 쟁반에 담아 주세요', cfPaidHint: '손님이 건넨 돈이에요', cfPriceHint: '주문한 조각의 가격이에요',
    cfServeHint: '계산이 끝나면 손님에게 건네요', cfChef: '나의 셰프', cfComplete: '주문 완료',
    cfPizzaTitle: '피자 조각을 눌러 담아요', cfCut: '{n}조각으로 자르기',
    cfSlice: '{n}번째 조각', cfSelected: '{d}조각 중 {n}조각을 담았어요 · {n}/{d}',
    cfCheese: '치즈', cfTomato: '토마토', cfMushroom: '버섯',
    cfTopping: '주문한 맛도 골라 주세요', cfWholePrice: '한 판 가격 ₱{n}',
    cfCook: '오븐에 넣기', cfHint: '그림 도움말', cfChooseTopping: '주문은 {p} 피자예요. 그 맛을 골라 주세요!',
    cfWrongPortion: '지금 담은 양은 {n}/{d}이에요. 주문은 {f}예요. 같은 크기의 조각을 세어 볼까요?',
    cfPortionHelp: '한 판을 똑같이 {d}조각으로 나누고 {n}조각을 담으면 {n}/{d}이에요.',
    cfSumHelp: '조각 크기는 같아요. {a} + {b} = {n}조각이므로, {f} = {n}/{d}이에요.',
    cfMoneyTitle: '거스름돈을 담아요', cfPrice: '피자 가격', cfPaid: '받은 돈', cfYourChange: '내가 담은 거스름돈',
    cfCoin: '₱{n} 추가', cfRemoveCoin: '₱{n} 빼기', cfUndo: '하나 빼기', cfClear: '모두 비우기',
    cfCoinHelp: '돈을 눌러 담아요. 담은 돈을 누르면 뺄 수 있어요.', cfGive: '피자와 돈 건네기',
    cfChangeLow: '피자 ₱{p} + 거스름돈 ₱{c} = ₱{total}. 받은 ₱{paid}보다 ₱{gap} 부족해요. 조금 더 담아 주세요.',
    cfChangeHigh: '피자 ₱{p} + 거스름돈 ₱{c} = ₱{total}. 받은 ₱{paid}보다 ₱{gap} 많아요. 조금 빼 주세요.',
    cfMoneyHelp: '받은 돈 − 피자 가격 = 거스름돈. ₱{paid} − ₱{p} = ₱{c}',
    cfTrayFull: '쟁반을 비우거나 돈을 조금 빼 보세요.',
    cfThanks: '냠냠! 고마워요, 셰프!', cfReceipt: '주문 {f} = 담은 양 {n}/{d}\n피자 ₱{p} + 거스름돈 ₱{c} = 받은 돈 ₱{paid}',
    cfNext: '다음 손님', cfCloseDay: '오늘 카페 마치기', cfDayDone: '모두 맛있게 먹었어요!',
    cfDayResult: '손님 6명 완료 · {s}점', cfCleanResult: '도움 없이 완성한 주문 {n}개. 나머지도 끝까지 해냈어요!',
    cfLearning: '오늘 연습: 영어 주문 · 분수 · 페소 거스름돈',
    cfNewTheme: '새 카페 색깔: {name}!', cfRest: '오늘 카페는 끝! 잠깐 쉬어도 좋아요.',
    cfAgain: '다음 카페 준비', cfSaving: '오늘 기록을 정리하는 중…', cfMenu: '카페 준비로 돌아가기',
    cfHintOrder: '주문: {f}', cfEmpty: '아직 담은 돈이 없어요', cfGotIt: '알겠어요'
  },
  en: {
    title: 'Pet Pizza Café', cfTagline: 'Little guests, tasty fractions!',
    cfDay: 'Café day {n}', cfGuest: 'Guest {n}/6', cfIntro: 'Run a café for your pets! Slice pizza for their English orders, then give their peso change.',
    cfGentle: 'Your guests can wait. You can always try again!',
    cfLevel1: 'First café', cfLevel1Desc: 'Halves · quarters · money',
    cfLevel2: 'Pizza lab', cfLevel2Desc: '3, 6 & 8 slices · equal amounts',
    cfLevel3: 'Chef challenge', cfLevel3Desc: 'Adding fractions · money',
    cfStart: 'Open my café', cfSaved: '{n} guests served · Best {s}',
    cfDecor: 'Decorate my café', cfGarden: 'Green garden', cfSunset: 'Peach sunset', cfOcean: 'Blue ocean',
    cfLocked: '{n} more guests', cfDecorHint: 'Serve 6 and 18 guests to unlock new café colors.',
    cfRead: 'Listen', cfListening: 'Playing…', cfSoundHelp: 'Turn sound on to hear the order.',
    cfVoiceError: 'The order audio could not play. Please try again.',
    cfTranslate: 'Korean meaning', cfTranslation: '{p} 피자 {f} 주세요.',
    cfStepOrder: 'Take the order', cfStepPizza: 'Cook the pizza', cfStepMoney: 'Count & serve',
    cfOrderHint: 'Listen to your little guest', cfKitchenHint: 'Pick slices and flavor, then bake', cfCheckoutHint: 'Give the pizza and the change',
    cfWelcome: 'Welcome, little chef!', cfPickLevel: 'Which café shall we open today?', cfQueue: 'Today’s little guests',
    cfOrderTicket: 'Your guest’s order', cfKitchen: 'My pizza kitchen', cfCheckout: 'Café checkout',
    cfBoard: 'Tap the slices your guest wants', cfIngredients: 'Topping baskets', cfOvenHint: 'All ready? Let’s bake it golden!',
    cfBaking: 'Your pizza is baking!', cfBakingHint: 'We’ll bring the warm pizza to the checkout.', cfBaked: 'Fresh from the oven!',
    cfEmptyHint: 'Tap coins to put them on the tray', cfPaidHint: 'The money your guest gave you', cfPriceHint: 'The price of the ordered slices',
    cfServeHint: 'All counted? Give it to your guest', cfChef: 'My chef', cfComplete: 'Order complete',
    cfPizzaTitle: 'Cut and choose your slices', cfCut: 'Cut into {n}',
    cfSlice: 'Slice {n}', cfSelected: '{n} of {d} slices on the plate · {n}/{d}',
    cfCheese: 'Cheese', cfTomato: 'Tomato', cfMushroom: 'Mushroom',
    cfTopping: 'Pick the flavor in the order', cfWholePrice: 'Whole pizza: ₱{n}',
    cfCook: 'Bake my pizza', cfHint: 'Show me a picture', cfChooseTopping: 'The order is for {p} pizza. Choose that flavor!',
    cfWrongPortion: 'Your plate has {n}/{d}. The order is {f}. Let’s count equal slices!',
    cfPortionHelp: 'Cut one whole into {d} equal slices. Take {n} slices to make {n}/{d}.',
    cfSumHelp: 'The slices are the same size. {a} + {b} = {n} slices, so {f} = {n}/{d}.',
    cfMoneyTitle: 'Put the change on the tray', cfPrice: 'Pizza price', cfPaid: 'Customer paid', cfYourChange: 'Change on my tray',
    cfCoin: 'Add ₱{n}', cfRemoveCoin: 'Remove ₱{n}', cfUndo: 'Take one back', cfClear: 'Clear tray',
    cfCoinHelp: 'Tap money to add it. Tap money on the tray to take it back.', cfGive: 'Serve pizza & change',
    cfChangeLow: 'Pizza ₱{p} + change ₱{c} = ₱{total}. That is ₱{gap} less than ₱{paid}. Add a little more.',
    cfChangeHigh: 'Pizza ₱{p} + change ₱{c} = ₱{total}. That is ₱{gap} more than ₱{paid}. Take a little back.',
    cfMoneyHelp: 'Paid − price = change. ₱{paid} − ₱{p} = ₱{c}',
    cfTrayFull: 'Take some money back or clear the tray.',
    cfThanks: 'Yum! Thank you, chef!', cfReceipt: 'Order {f} = your plate {n}/{d}\nPizza ₱{p} + change ₱{c} = paid ₱{paid}',
    cfNext: 'Next guest', cfCloseDay: 'Close for today', cfDayDone: 'Everyone enjoyed their pizza!',
    cfDayResult: '6 happy guests · {s} points', cfCleanResult: '{n} orders without help. You finished the others, too!',
    cfLearning: 'Today’s practice: English orders · fractions · peso change',
    cfNewTheme: 'New café color: {name}!', cfRest: 'Your café day is done. This is a good time for a break.',
    cfAgain: 'Plan another day', cfSaving: 'Wrapping up today’s record…', cfMenu: 'Back to café setup',
    cfHintOrder: 'Order: {f}', cfEmpty: 'No change on the tray yet', cfGotIt: 'Got it'
  }
};

const PETS = [
  ['Mochi', '01-puppy'], ['Luna', '02-kitten'], ['Coco', '03-bunny'],
  ['Bean', '04-hamster'], ['Maple', '05-fox'], ['Pip', '11-penguala-blue']
].map(([name, file]) => ({ name, src: `assets/wearables/pets/${file}.webp` }));
const TOPPING_KEYS = { cheese: 'cfCheese', tomato: 'cfTomato', mushroom: 'cfMushroom' };
const THEME_KEYS = { garden: 'cfGarden', sunset: 'cfSunset', ocean: 'cfOcean' };

function toppingArt(kind, x = 12, y = 12, scale = 1) {
  const shapes = {
    cheese: '<path d="M-9 7L8-8 10 9Z" fill="#ffe277" stroke="#c18a2e" stroke-width="1.5"/><circle cx="3" cy="2" r="2" fill="#dfa444"/>',
    tomato: '<circle r="9" fill="#ee7664" stroke="#ba4b43" stroke-width="1.5"/><path d="M-5-7L0-4 5-7 1-9Z" fill="#428c4b"/><path d="M-4 2Q0-2 4 2" fill="none" stroke="#ffc1a3" stroke-width="2"/>',
    mushroom: '<path d="M-3 0v9h6V0" fill="#fff4db" stroke="#9a7256" stroke-width="1.5"/><path d="M-10 1C-10-12 10-12 10 1Z" fill="#caa289" stroke="#9a7256" stroke-width="1.5"/>'
  };
  return `<g transform="translate(${x} ${y}) scale(${scale})" pointer-events="none">${shapes[kind]}</g>`;
}
const toppingIcon = (kind) => `<svg viewBox="0 0 24 24" aria-hidden="true">${toppingArt(kind)}</svg>`;
const polar = (angle, radius) => [120 + radius * Math.cos(angle * Math.PI / 180), 120 + radius * Math.sin(angle * Math.PI / 180)];

// Each SVG wedge is a real keyboard-accessible control, rather than an answer choice.
function pizzaMarkup(cuts, selected, topping, interactive, label, plated = false) {
  let pieces = '';
  for (let i = 0; i < cuts; i++) {
    const from = -90 + i * 360 / cuts, to = from + 360 / cuts;
    const a = polar(from, 101), b = polar(to, 101), c = polar((from + to) / 2, 65);
    const picked = selected.has(i);
    if (plated && !picked) continue;
    const ca = polar(from, 110), cb = polar(to, 110);
    if (plated) pieces += `<path d="M120 120L${ca.join(' ')}A110 110 0 0 1 ${cb.join(' ')}Z" fill="#bd7c40"/>`;
    const inner = polar((from + to) / 2 - 360 / cuts / 7, 38);
    const outer = polar((from + to) / 2 + 360 / cuts / 7, 83);
    pieces += `<g opacity="${picked ? 1 : .62}"><path d="M120 120L${a.join(' ')}A101 101 0 ${360 / cuts > 180 ? 1 : 0} 1 ${b.join(' ')}Z" fill="#ffd16c" stroke="${picked && interactive ? '#668743' : '#b9833f'}" stroke-width="${picked && interactive ? 4 : 2}" ${interactive ? `class="cf-wedge" role="button" tabindex="0" data-slice="${i}" aria-label="${label(i + 1)}" aria-pressed="${picked}"` : ''}/>${toppingArt(topping, ...c, .85)}${toppingArt(topping, ...inner, .55)}${toppingArt(topping, ...outer, .65)}</g>`;
  }
  const crust = plated ? '' : Array.from({ length: 22 }, (_, i) => {
    const [x, y] = polar(i * 360 / 22, 107);
    return `<ellipse cx="${x}" cy="${y}" rx="2.2" ry="1.4" fill="#a96a2b" opacity=".45"/>`;
  }).join('');
  const dividers = plated ? '' : Array.from({ length: cuts }, (_, i) => {
    const end = polar(-90 + i * 360 / cuts, 100);
    return `<path d="M120 120L${end.join(' ')}" fill="none" stroke="#a67435" stroke-width="1.8" pointer-events="none"/>`;
  }).join('');
  return `<svg class="cf-pizza" viewBox="0 0 240 240" ${interactive ? 'role="group"' : 'aria-hidden="true"'}><circle cx="120" cy="125" r="114" fill="#0001"/><circle cx="120" cy="120" r="112" fill="${plated ? '#fff7e8' : '#bd7c40'}"/><circle cx="120" cy="120" r="106" fill="${plated ? '#f2e5d1' : '#ebae59'}"/>${crust}${pieces}${dividers}</svg>`;
}

const fractionText = (order) => order.parts.map((n) => `${n}/${order.denominator}`).join(' + ');
const petImage = (pet, attrs = {}) => h('img', { src: pet.src, alt: pet.name, ...attrs });
const propArt = (kind, className = '') => h('span', { class: `cf-prop cf-prop-${kind} ${className}`, 'aria-hidden': 'true' });

export function mount(el, ctx) {
  const t = ctx.t;
  let progress = readProgress(ctx.progress);
  let level = progress.level;
  let destroyed = false;
  let saveQueue = Promise.resolve();
  let day = [], guests = [], guestIndex = 0, stage = 'setup';
  let order, cuts, selected, topping, requestedTopping, coins, clean, cleanOrders, dayScore;
  let showTranslation = false;
  let finished = false;
  let rewardPending = false;
  let startingServed = 0;
  let bakeTimer = null;
  let voicePlayback = null;

  el.innerHTML = `<div class="cf-shell">
    <header class="cf-hud hud-bar">
      <button class="hud-btn cf-home" type="button" data-i18n-aria="goLobby">${iconMarkup('home')}</button>
      <span class="hud-pill cf-day"></span>
      <span class="hud-pill cf-count"></span>
      <button class="hud-btn hud-push cf-sound" type="button" data-i18n-aria="sound"></button>
    </header>
    <div class="cf-sign"><div class="cf-sign-copy"><p class="cf-welcome" data-i18n="cfWelcome"></p><h1 data-i18n="title"></h1><p data-i18n="cfTagline"></p></div><div class="cf-chef-badge"><div class="cf-chef"></div><span data-i18n="cfChef"></span></div></div>
    <section class="cf-card cf-intro">
      <div class="cf-howto"></div>
      <h2 class="cf-level-title" data-i18n="cfPickLevel"></h2>
      <div class="cf-levels"></div>
      <button class="cf-main cf-start" type="button" data-i18n="cfStart"></button>
      <p class="cf-gentle" data-i18n="cfGentle"></p>
      <p class="cf-muted cf-saved"></p><div class="cf-setup-decor"></div>
    </section>
    <section class="cf-card cf-service" hidden></section>
    <section class="cf-card cf-summary" hidden></section>
  </div>`;
  ctx.apply(el);
  const $ = (selector) => el.querySelector(selector);
  const intro = $('.cf-intro'), service = $('.cf-service'), summary = $('.cf-summary');
  const chef = ctx.character($('.cf-chef'), { body: true });
  $('.cf-howto').replaceChildren(...['order', 'oven', 'register'].map((kind, i) => h('div', { class: 'cf-howto-step' },
    propArt(kind), h('div', {}, h('strong', {}, `${i + 1}. ${t(['cfStepOrder', 'cfStepPizza', 'cfStepMoney'][i])}`),
      h('span', {}, t(['cfOrderHint', 'cfKitchenHint', 'cfCheckoutHint'][i]))))));
  $('.cf-home').addEventListener('click', () => ctx.exit());
  $('.cf-sound').addEventListener('click', () => {
    ctx.setSound(!ctx.audio.getSound());
    if (!ctx.audio.getSound()) ctx.audio.stopSpeak();
    renderSound();
  });
  $('.cf-start').addEventListener('click', startDay);

  function persist() {
    const snapshot = structuredClone(progress);
    saveQueue = saveQueue.then(() => ctx.saveProgress(snapshot)).catch(() => {});
  }

  function renderSound() {
    $('.cf-sound').replaceChildren(icon(ctx.audio.getSound() ? 'sound' : 'sound-muted'));
    $('.cf-sound').setAttribute('aria-pressed', String(ctx.audio.getSound()));
    renderOrderVoice();
  }

  function renderOrderVoice() {
    const read = $('.cf-read'), status = $('.cf-voice-status');
    const current = voicePlayback?.order === order ? voicePlayback : null;
    if (read) {
      read.disabled = !ctx.audio.getSound() || !!current?.pending;
      read.setAttribute('aria-busy', String(!!current?.pending));
      read.textContent = t(current?.pending ? 'cfListening' : 'cfRead');
      read.title = ctx.audio.getSound() ? t('cfRead') : t('cfSoundHelp');
    }
    if (status) status.hidden = !current?.failed;
  }

  function renderHud() {
    $('.cf-day').textContent = t('cfDay', { n: stage === 'done' ? progress.days : progress.days + 1 });
    $('.cf-count').hidden = stage === 'setup';
    $('.cf-count').textContent = t('cfGuest', { n: Math.min(guestIndex + 1, CUSTOMERS_PER_DAY) });
    el.dataset.theme = progress.theme;
  }

  function decorations() {
    return h('div', { class: 'cf-decorations' }, h('h2', {}, t('cfDecor')),
      h('div', { class: 'cf-themes' }, THEMES.map((theme) => {
        const unlocked = progress.served >= theme.at;
        return h('button', {
          type: 'button', class: 'cf-theme', 'data-theme': theme.id,
          'aria-pressed': String(theme.id === progress.theme), disabled: !unlocked,
          onclick: () => {
            progress.theme = theme.id;
            persist(); renderHud();
            if (stage === 'setup') renderSetup(); else renderSummary();
          }
        }, t(THEME_KEYS[theme.id]), !unlocked ? h('div', {}, t('cfLocked', { n: theme.at - progress.served })) : null);
      })), h('p', { class: 'cf-muted' }, t('cfDecorHint')));
  }

  function renderSetup() {
    intro.hidden = false; service.hidden = true; summary.hidden = true;
    $('.cf-sign').hidden = false;
    $('.cf-levels').replaceChildren(...[1, 2, 3].map((n) => h('button', {
      type: 'button', class: 'cf-level', 'aria-pressed': String(n === level),
      onclick: () => { level = n; progress.level = n; persist(); renderSetup(); }
    }, h('span', { class: 'cf-level-number', 'aria-hidden': 'true' }, `${n}`), h('strong', {}, t(`cfLevel${n}`)), h('span', {}, t(`cfLevel${n}Desc`)))));
    $('.cf-saved').textContent = t('cfSaved', { n: progress.served, s: progress.best });
    $('.cf-setup-decor').replaceChildren(decorations());
    renderHud();
  }

  function startDay() {
    ctx.audio.unlock(); ctx.audio.stopSpeak();
    day = makeDay(level, progress);
    const offset = Math.floor(Math.random() * PETS.length);
    guests = PETS.map((_, i) => PETS[(i + offset) % PETS.length]);
    guestIndex = 0; cleanOrders = 0; dayScore = 0; finished = false;
    startingServed = progress.served;
    intro.hidden = true; summary.hidden = true; service.hidden = false;
    $('.cf-sign').hidden = true;
    nextOrder();
  }

  function nextOrder() {
    voicePlayback = null;
    ctx.audio.stopSpeak();
    order = day[guestIndex]; cuts = order.cuts[0]; selected = new Set();
    requestedTopping = TOPPINGS[(guestIndex + progress.days) % TOPPINGS.length];
    topping = null; coins = []; clean = true; showTranslation = false;
    stage = 'pizza'; renderService(); renderHud();
    ctx.audio.preloadClips([voiceFor(order, requestedTopping)]);
    el.scrollIntoView({ block: 'start' });
    focusStage('.cf-order');
    void listen();
  }

  function focusStage(selector) {
    const target = service.querySelector(selector);
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }

  function englishOrder() {
    return orderText(order, requestedTopping);
  }

  function button(text, className, onclick, attrs = {}) {
    return h('button', { type: 'button', class: className, onclick, ...attrs }, text);
  }

  function renderService() {
    service.replaceChildren();
    service.dataset.stage = stage;
    service.append(h('div', { class: 'cf-shop-bar' }, h('div', {}, h('span', { class: 'cf-shop-mark', 'aria-hidden': 'true' }, 'P'),
      h('strong', {}, t('title'))), h('span', { class: 'cf-muted' }, t('cfQueue'))));
    const queue = h('div', { class: 'cf-queue', 'aria-hidden': 'true' }, guests.map((pet, i) => petImage(pet, { class: i < guestIndex ? 'cf-fed' : i === guestIndex ? 'cf-current' : '' })));
    service.append(queue);
    const activeStep = stage === 'served' ? 3 : stage === 'money' ? 2 : 1;
    service.append(h('ol', { class: 'cf-steps', 'aria-label': ctx.lang === 'ko' ? '주문 단계' : 'Order steps' },
      ['order', 'oven', 'register'].map((kind, i) => h('li', {
        class: i < activeStep ? 'cf-complete' : i === activeStep ? 'cf-active' : '',
        'aria-current': i === activeStep ? 'step' : null
      }, propArt(kind), h('span', { class: 'cf-step-number', 'aria-hidden': 'true' }, i < activeStep ? '✓' : String(i + 1)),
      h('strong', {}, t(['cfStepOrder', 'cfStepPizza', 'cfStepMoney'][i]))))));
    if (stage === 'served') { renderServed(); return; }
    if (stage === 'baking') { renderBaking(); return; }
    const pet = guests[guestIndex];
    const speech = h('div', { class: 'cf-speech' }, h('span', { class: 'cf-ticket-label' }, t('cfOrderTicket')),
      h('span', { class: 'cf-customer-name' }, pet.name),
      h('p', { class: 'cf-order', lang: 'en' }, englishOrder()));
    const tools = h('div', { class: 'cf-order-tools' }, h('span', { class: 'cf-recipe', 'aria-label': fractionText(order) }, fractionText(order)));
    if (ctx.audio.voiceSupported || ctx.audio.speechSupported) tools.append(button(t('cfRead'), 'cf-small cf-read', listen, {
      disabled: !ctx.audio.getSound(), title: ctx.audio.getSound() ? t('cfRead') : t('cfSoundHelp')
    }));
    if (ctx.lang === 'ko') tools.append(button(t('cfTranslate'), 'cf-small', () => {
      showTranslation = !showTranslation;
      translation.hidden = !showTranslation;
      translateButton?.setAttribute('aria-expanded', String(showTranslation));
    }, { 'aria-expanded': String(showTranslation) }));
    const translateButton = tools.querySelector('button:last-child');
    const translation = h('p', { class: 'cf-translation', lang: 'ko', hidden: !showTranslation }, t('cfTranslation', { p: dict.ko[TOPPING_KEYS[requestedTopping]], f: orderWords(order, 'ko') }));
    speech.append(tools, h('p', { class: 'cf-muted cf-voice-status', role: 'status', hidden: true }, t('cfVoiceError')), translation);
    const layout = h('div', { class: 'cf-service-layout' });
    service.append(layout);
    layout.append(h('aside', { class: 'cf-customer' }, h('div', { class: 'cf-guest-portrait' }, petImage(pet, { class: 'cf-pet' })), speech));
    const work = h('div', { class: 'cf-work' });
    layout.append(work);
    if (stage === 'pizza') renderPizza(work); else renderMoney(work);
    renderOrderVoice();
  }

  function feedback(text, picture = false) {
    const box = $('.cf-feedback');
    box.hidden = false;
    box.replaceChildren(h('div', {}, text));
    if (picture) {
      const sample = h('div', {});
      sample.innerHTML = pizzaMarkup(order.denominator, new Set(Array.from({ length: numerator(order) }, (_, i) => i)), requestedTopping, false);
      box.append(sample);
    }
    box.append(button(t('cfGotIt'), 'cf-small cf-feedback-close', () => { box.hidden = true; }));
  }

  async function listen(event) {
    const manual = !!event;
    if (!ctx.audio.getSound() || (!manual && !ctx.audio.getTts())) return;
    if (!ctx.audio.voiceSupported && !ctx.audio.speechSupported) return;
    const playback = { order, pending: true, failed: false };
    voicePlayback = playback;
    renderOrderVoice();
    // New orders follow the start/next-guest tap, so unlock within that gesture.
    ctx.audio.unlock();
    try {
      const played = await ctx.audio.speak(englishOrder(), 'en', {
        clip: voiceFor(order, requestedTopping), force: manual, rate: .85
      });
      playback.failed = !played;
    } catch {
      playback.failed = true;
    } finally {
      playback.pending = false;
      if (!destroyed && voicePlayback === playback) renderOrderVoice();
    }
  }

  function help() {
    clean = false;
    const bill = billFor(order);
    if (stage === 'money') feedback(t('cfMoneyHelp', { paid: bill.paid, p: bill.price, c: bill.change }));
    else feedback(t(order.parts.length === 2 ? 'cfSumHelp' : 'cfPortionHelp', {
      a: order.parts[0], b: order.parts[1], n: numerator(order), d: order.denominator, f: fractionText(order)
    }), true);
  }

  function renderPizza(work) {
    work.append(h('span', { class: 'cf-eyebrow' }, t('cfKitchen')), h('h2', {}, t('cfPizzaTitle')));
    work.append(h('div', { class: 'cf-work-order' }, t('cfHintOrder', { f: fractionText(order) }),
      h('span', { 'aria-hidden': 'true' }, ' · '), t(TOPPING_KEYS[requestedTopping])));
    work.append(h('div', { class: 'cf-cutters' }, order.cuts.map((n) => button(t('cfCut', { n }), 'cf-small', () => {
      if (cuts !== n) { cuts = n; selected.clear(); renderService(); }
    }, { 'aria-pressed': String(cuts === n) }))));
    const station = h('div', { class: 'cf-pizza-station' });
    const plate = h('div', { class: 'cf-prep-board' }, h('p', { class: 'cf-board-note' }, t('cfBoard')), h('div', { class: 'cf-pizza-wrap' }), h('p', { class: 'cf-selected', 'aria-live': 'polite' }));
    const flavors = h('div', { class: 'cf-ingredients' }, h('h3', {}, t('cfIngredients')), h('p', { class: 'cf-muted cf-topping-note' }, t('cfTopping')), h('div', { class: 'cf-toppings' }, TOPPINGS.map((kind) => {
      const b = button(t(TOPPING_KEYS[kind]), 'cf-small', () => {
        topping = kind;
        for (const item of flavors.querySelectorAll('[data-topping]')) item.setAttribute('aria-pressed', String(item.dataset.topping === kind));
        drawPizza();
      }, { 'aria-pressed': String(topping === kind), 'data-topping': kind });
      const art = h('span', { 'aria-hidden': 'true' }); art.innerHTML = toppingIcon(kind); b.prepend(art);
      return b;
    })), h('p', { class: 'cf-muted cf-whole-price' }, t('cfWholePrice', { n: billFor(order).whole })));
    station.append(plate, flavors); work.append(station);
    work.append(h('div', { class: 'cf-oven-action' }, propArt('oven'), h('div', {}, h('p', {}, t('cfOvenHint')),
      button(t('cfCook'), 'cf-main', cook))), h('div', { class: 'cf-actions' }, button(t('cfHint'), 'cf-small cf-help', help)));
    work.append(h('div', { class: 'cf-feedback', role: 'status', hidden: true }));
    drawPizza();
  }

  function drawPizza(focusedSlice = null) {
    const wrap = $('.cf-pizza-wrap');
    wrap.innerHTML = pizzaMarkup(cuts, selected, topping || 'cheese', true, (n) => t('cfSlice', { n }));
    const svg = wrap.firstElementChild;
    svg.setAttribute('aria-label', t('cfCut', { n: cuts }));
    const tap = (target) => {
      if (stage !== 'pizza') return;
      const slice = target.closest('[data-slice]');
      if (!slice) return;
      const index = Number(slice.dataset.slice);
      if (selected.has(index)) selected.delete(index); else selected.add(index);
      ctx.audio.keyTap(); drawPizza(index);
    };
    svg.addEventListener('click', (event) => tap(event.target));
    svg.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); tap(event.target); }
    });
    $('.cf-selected').textContent = t('cfSelected', { d: cuts, n: selected.size });
    if (focusedSlice !== null) wrap.querySelector(`[data-slice="${focusedSlice}"]`).focus({ preventScroll: true });
  }

  function cook() {
    if (stage !== 'pizza') return;
    if (!matchesPortion(order, selected.size, cuts)) {
      clean = false;
      feedback(t('cfWrongPortion', { n: selected.size, d: cuts, f: fractionText(order) }), true);
      return;
    }
    if (topping !== requestedTopping) {
      clean = false; feedback(t('cfChooseTopping', { p: t(TOPPING_KEYS[requestedTopping]) })); return;
    }
    ctx.audio.correct(); ctx.audio.stopSpeak();
    stage = 'baking'; renderService(); focusStage('.cf-baking h2');
    bakeTimer = setTimeout(() => {
      bakeTimer = null;
      if (destroyed || stage !== 'baking') return;
      stage = 'money'; renderService(); focusStage('.cf-work h2');
    }, 1400);
  }

  function renderBaking() {
    const plate = h('div', { class: 'cf-baking-pizza', 'aria-hidden': 'true' });
    plate.innerHTML = pizzaMarkup(cuts, selected, topping, false, null, true);
    service.append(h('div', { class: 'cf-baking', role: 'status' }, propArt('oven'), plate,
      h('h2', {}, t('cfBaking')), h('p', { class: 'cf-muted' }, t('cfBakingHint'))));
  }

  function renderMoney(work) {
    const bill = billFor(order);
    const plate = h('div', { class: 'cf-checkout-pizza', 'aria-hidden': 'true' });
    plate.innerHTML = pizzaMarkup(cuts, selected, topping, false, null, true);
    work.append(h('div', { class: 'cf-checkout-heading' }, propArt('register'), h('div', {},
      h('span', { class: 'cf-eyebrow' }, t('cfCheckout')), h('h2', {}, t('cfMoneyTitle')))));
    work.append(h('div', { class: 'cf-bill' },
      h('div', { class: 'cf-ready-pizza' }, plate, h('span', {}, t('cfBaked'))),
      h('div', { class: 'cf-bill-price' }, h('span', {}, t('cfPrice')), h('b', {}, `₱${bill.price}`), h('small', {}, t('cfPriceHint'))),
      h('div', { class: 'cf-bill-paid' }, h('span', {}, t('cfPaid')), h('b', {}, `₱${bill.paid}`), h('small', {}, t('cfPaidHint')))));
    work.append(h('div', { class: 'cf-tray' }));
    work.append(h('div', { class: 'cf-coins' }, COINS.map((n) => button(`₱${n}`, 'cf-coin', () => {
      if (coins.length >= 40) { feedback(t('cfTrayFull')); return; }
      coins.push(n); ctx.audio.keyTap(); renderTray();
    }, { 'aria-label': t('cfCoin', { n }) }))));
    work.append(h('p', { class: 'cf-muted' }, t('cfCoinHelp')));
    work.append(h('div', { class: 'cf-actions' },
      button(t('cfUndo'), 'cf-small cf-undo', () => { coins.pop(); renderTray(); }),
      button(t('cfClear'), 'cf-small cf-clear', () => { coins = []; renderTray(); })));
    work.append(h('div', { class: 'cf-deliver-action' }, h('p', { class: 'cf-muted' }, t('cfServeHint')),
      h('div', { class: 'cf-actions' }, button(t('cfGive'), 'cf-main', deliver), button(t('cfHint'), 'cf-small cf-help', help))));
    work.append(h('div', { class: 'cf-feedback', role: 'status', hidden: true }));
    renderTray();
  }

  function renderTray() {
    $('.cf-feedback').hidden = true;
    $('.cf-tray').replaceChildren(h('span', { class: 'cf-muted' }, t('cfYourChange')),
      h('b', { class: 'cf-tray-total', 'aria-live': 'polite' }, `₱${coins.reduce((a, b) => a + b, 0)}`),
      h('div', { class: 'cf-tray-coins' }, coins.length ? COINS.filter((n) => coins.includes(n)).map((n) => {
        const count = coins.filter((value) => value === n).length;
        const stack = button(`₱${n}`, 'cf-coin-stack', () => { coins.splice(coins.lastIndexOf(n), 1); renderTray(); }, { 'aria-label': t('cfRemoveCoin', { n }) });
        if (count > 1) stack.append(h('small', { class: 'cf-coin-count' }, `×${count}`));
        return stack;
      }) : h('span', { class: 'cf-empty-tray' }, t('cfEmptyHint'))));
    $('.cf-undo').disabled = $('.cf-clear').disabled = !coins.length;
  }

  function deliver() {
    if (stage !== 'money') return;
    const bill = billFor(order), change = coins.reduce((a, b) => a + b, 0);
    if (change !== bill.change) {
      clean = false;
      feedback(t(change < bill.change ? 'cfChangeLow' : 'cfChangeHigh', {
        p: bill.price, c: change, total: bill.price + change, paid: bill.paid, gap: Math.abs(change - bill.change)
      }));
      return;
    }
    // Change the stage synchronously so repeated taps cannot save or pay twice.
    stage = 'served';
    if (clean) cleanOrders++;
    recordDelivery(progress, order, clean); persist();
    ctx.audio.correct(); renderService(); focusStage('.cf-served h2');
  }

  function renderServed() {
    const bill = billFor(order), pet = guests[guestIndex];
    const plate = h('div', { class: 'cf-mini-pizza', 'aria-hidden': 'true' });
    plate.innerHTML = pizzaMarkup(cuts, selected, topping, false, null, true);
    service.append(h('div', { class: 'cf-served' }, h('span', { class: 'cf-complete-badge' }, `✓ ${t('cfComplete')}`), petImage(pet, { class: 'cf-pet' }), plate,
      h('h2', {}, t('cfThanks')), h('div', { class: 'cf-receipt', style: 'white-space:pre-line' }, t('cfReceipt', {
        f: fractionText(order), n: selected.size, d: cuts, p: bill.price, c: bill.change, paid: bill.paid
      })), button(t(guestIndex === CUSTOMERS_PER_DAY - 1 ? 'cfCloseDay' : 'cfNext'), 'cf-main', () => {
        if (stage !== 'served') return;
        if (guestIndex === CUSTOMERS_PER_DAY - 1) closeDay();
        else { guestIndex++; ctx.audio.nextFx(); nextOrder(); }
      })));
  }

  async function closeDay() {
    if (finished) return;
    finished = true; stage = 'done'; rewardPending = true;
    const result = dayResult(level, cleanOrders); dayScore = result.score;
    progress.days++; progress.best = Math.max(progress.best, result.score); persist();
    ctx.audio.stopSpeak(); ctx.audio.fanfare();
    service.hidden = true; summary.hidden = false; $('.cf-sign').hidden = false; renderHud(); renderSummary();
    try {
      await saveQueue;
      await ctx.finish({ ...result, detail: { level, served: CUSTOMERS_PER_DAY, clean: cleanOrders, concepts: day.map((o) => o.id) } });
    } finally {
      rewardPending = false;
      if (!destroyed) renderSummary();
    }
  }

  function renderSummary() {
    const result = dayResult(level, cleanOrders);
    summary.replaceChildren(h('div', { class: 'cf-summary-pets', 'aria-hidden': 'true' }, guests.map((p) => petImage(p))),
      h('h2', {}, t('cfDayDone')), h('div', { class: 'cf-stars', role: 'img', 'aria-label': `${result.stars}/3` },
        Array.from({ length: result.stars }, () => icon('star'))),
      h('p', {}, t('cfDayResult', { s: dayScore })), h('p', { class: 'cf-muted' }, t('cfCleanResult', { n: cleanOrders })),
      h('p', { class: 'cf-muted' }, t('cfLearning')));
    for (const theme of THEMES.filter((t) => t.at > startingServed && t.at <= progress.served)) {
      summary.append(h('p', { class: 'cf-new-theme' }, t('cfNewTheme', { name: t(THEME_KEYS[theme.id]) })));
    }
    summary.append(decorations(), h('p', { class: 'cf-muted' }, t('cfRest')),
      h('div', { class: 'cf-actions' }, button(t('goLobby'), 'cf-main', () => ctx.exit()),
        button(t(rewardPending ? 'cfSaving' : 'cfAgain'), 'cf-small', () => {
          stage = 'setup'; chef.expression('happy'); renderSetup();
        }, { disabled: rewardPending })));
  }

  renderSound(); renderSetup();
  return {
    destroy() {
      destroyed = true;
      clearTimeout(bakeTimer);
      ctx.audio.stopSpeak();
      chef.destroy();
    }
  };
}
