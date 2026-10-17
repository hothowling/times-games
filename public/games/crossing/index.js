import { iconMarkup } from '../../core/icons.js';
import { VEHICLE_SHEET, VEHICLE_TYPES } from './vehicles.js';
import { createTrafficSound, trafficScene } from './sound.js';
import {
  ANSWER_COLUMNS, SLOW_SECONDS, createRun, readProgress, rowKind, sectionOf, sectionLayout, ensureWorld,
  difficultyForSection, questionForRow, requestMove, advance, playerPosition, carsForRow, resultFor, eraseChoice
} from './rules.js';

export const dict = {
  ko: {
    crTitle: '구구단 건너기', crTag: '생각하고, 폴짝!', crIntro: '차를 피하고 정답이 적힌 건널목을 건너요.',
    crGuide1: '방향 버튼·방향키·화면 탭으로 한 칸씩 이동해요.',
    crGuide2: '오답·차량 충돌은 하트 -1! 하트 3개를 모두 잃으면 도전이 끝나요.',
    crGuide3: '끝없이 이어지는 길! 멀리 갈수록 넓은 도로와 빨라지는 차를 조심해요.',
    crGuide4: '바위나 나무가 있는 칸은 지나갈 수 없어요. 옆으로 돌아가요!',
    crGuide5: '가끔 넓은 도로에 선물이 나와요! 차를 피해 먹으면 하트·차량 감속·보호막을 얻어요.',
    crRockBlocked: '바위가 길을 막고 있어요! 다른 칸으로 돌아가요.',
    crTreeBlocked: '나무가 길을 막고 있어요! 다른 칸으로 돌아가요.',
    crStart: '출발!', crAgain: '다시 도전',
    crLobby: '로비로', crBest: '최고 {n}점', crScore: '{n}점', crDistance: '{n}칸',
    crGates: '건널목 {n}개 통과', crMath: '구구단 횡단보도', crCapital: '나라 수도 횡단보도',
    crLevel: '난이도 {n}', crSlowTimer: '차량 감속 {n}초', crShieldShort: '보호막',
    crGiftHeart: '하트 +1', crGiftSlow: '차량 감속 8초', crGiftShield: '보호막 획득', crSeconds: '{n}초',
    crCountry: '{name}의 수도는?', crChoose: '정답인 길로 이동해요', crSafe: '안전지대 · 천천히 생각해요',
    crTraffic: '차가 지나간 뒤 한 칸씩 건너요', crWalk: '위로 탭하거나 방향 버튼으로 이동해요',
    crWrong: '오답! 하트 -1 · 안전지대에서 다시 골라요.', crRight: '정답! 이제 차가 없는 순간에 건너요.',
    crPath: '정답 건널목 안에서 앞으로 또는 뒤로 이동해요.', crCrossed: '잘 건넜어요! 다음 길로 출발!',
    crCapitalNext: '이제 나라 수도 퀴즈도 함께 나와요!', crHit: '차량 충돌! 하트 -1 · 안전지대에서 다시 출발해요.',
    crProtected: '보호막이 하트 감소를 한 번 막아 줬어요!', crShield: '보호막 준비 완료 · 오답·충돌 1회 보호', crSlow: '8초 동안 차가 천천히 달려요',
    crErased: '오답 길 하나를 지웠어요. 남은 길에서 골라요.', crBlocked: '지워진 길이에요. 다른 길을 골라요.',
    crItemGuide: '힌트: 풀이 도움 · 지우기: 오답 길 1개 제거 · 모래시계: 차량 감속 · 보호막: 오답·충돌 1회 방어',
    crHintMath: '{a} × {b} = {n}에 {a}을 더해 보세요.', crHintOne: '{a}을 한 번 세어 보세요.',
    crHintCapital: '수도의 첫 글자는 “{first}”이에요.', crPause: '잠깐 쉬어 가요', crPauseHelp: '차도 멈췄어요. 준비되면 이어서 가요.',
    crResume: '계속하기', crQuit: '로비로 돌아갈까요?', crQuitHelp: '이번 도전은 끝나지만 최고 기록은 그대로예요.',
    crLeave: '나가기', crOver: '하트를 모두 썼어요',
    crOverHelp: '안전지대에서 정답을 생각하고, 차가 없는 틈에 다시 도전해요.',
    crResult: '건널목 {n}개 · 선물 {gifts}개', crSaving: '기록 저장 중…', crEarned: 'Sparkles +{n}',
    crCredits: '그림·소리 출처', crCreditText: '차량·바위·장애물 나무: 게임용 제작 에셋. 장식 나무·가로등: Kenney (CC0). 캐릭터·의상·UI·국기: 기존 게임 에셋. 차량 통과음: DRAGON-STUDIO / Pixabay. 잔잔한 도로 배경음: 게임에서 합성.',
    crLeft: '왼쪽으로', crRightMove: '오른쪽으로', crForward: '앞으로', crBack: '뒤로',
    crCanvas: '차를 피하고 바위나 나무가 있는 칸을 돌아 정답 건널목으로 이동하는 게임. 아래 방향 버튼 또는 방향키로 조작해요.',
    crOptions: '왼쪽: {left}, 가운데: {middle}, 오른쪽: {right}', crHearts: '남은 하트 {n}개',
    crControls: '이동 방향', crPauseAria: '일시정지', crLoading: '길을 준비하고 있어요…'
  },
  en: {
    crTitle: 'Quiz Crossroads', crTag: 'Think, then hop!', crIntro: 'Dodge cars and cross the path with the right answer.',
    crGuide1: 'Move one step with the buttons, arrow keys, taps or swipes.',
    crGuide2: 'A wrong answer or car collision costs 1 heart. Lose all 3 hearts and the run ends.',
    crGuide3: 'An endless road! Watch for wider roads and faster traffic as you travel farther.',
    crGuide4: 'Rocks and trees block their tiles. Find a way around them!',
    crGuide5: 'Gifts sometimes appear on wide roads! Dodge cars to collect a heart, slow traffic or a shield.',
    crRockBlocked: 'A rock is blocking that tile! Find another way around.',
    crTreeBlocked: 'A tree is blocking that tile! Find another way around.',
    crStart: 'Let’s hop!', crAgain: 'Try again',
    crLobby: 'Lobby', crBest: 'Best: {n} pts', crScore: '{n} pts', crDistance: '{n} steps',
    crGates: '{n} crossings cleared', crMath: 'Times-table crossing', crCapital: 'Capital-city crossing',
    crLevel: 'Level {n}', crSlowTimer: 'Slow traffic: {n}s', crShieldShort: 'Shield',
    crGiftHeart: '+1 heart', crGiftSlow: 'Slow traffic · 8s', crGiftShield: 'Shield gained', crSeconds: '{n}s',
    crCountry: 'Capital of {name}?', crChoose: 'Move to the correct path', crSafe: 'Safe sidewalk · take your time',
    crTraffic: 'Wait for a gap, then hop across', crWalk: 'Tap ahead or use the direction buttons',
    crWrong: 'Wrong answer! −1 heart. Try a different path.', crRight: 'Correct! Wait for a gap between the cars.',
    crPath: 'Move forward or back inside the correct crosswalk.', crCrossed: 'Made it! On to the next road!',
    crCapitalNext: 'Capital-city quizzes join the journey now!', crHit: 'Car collision! −1 heart. Try again from the safe sidewalk.',
    crProtected: 'Your shield prevented one lost heart!', crShield: 'Shield ready · blocks one mistake or collision', crSlow: 'Cars slow down for 8 seconds',
    crErased: 'One wrong path erased. Choose from the remaining paths.', crBlocked: 'That path is erased. Try a different one.',
    crItemGuide: 'Hint: help solving · Eraser: remove 1 wrong path · Hourglass: slow cars · Shield: block 1 mistake or collision',
    crHintMath: 'Add {a} to {a} × {b} = {n}.', crHintOne: 'Count {a} once.',
    crHintCapital: 'The capital starts with “{first}”.', crPause: 'Take a little break', crPauseHelp: 'The cars have stopped too. Continue when you are ready.',
    crResume: 'Continue', crQuit: 'Return to the lobby?', crQuitHelp: 'This attempt will end. Your best record stays saved.',
    crLeave: 'Leave', crOver: 'Out of hearts!',
    crOverHelp: 'Think on the safe sidewalk, then wait for a gap to try again.',
    crResult: '{n} crossings · {gifts} gifts', crSaving: 'Saving your record…', crEarned: 'Sparkles +{n}',
    crCredits: 'Art & sound credits', crCreditText: 'Vehicles, rocks and obstacle trees: original game artwork. Decorative trees and streetlights: Kenney (CC0). Characters, clothing, UI and flags: existing game assets. Car pass-by: DRAGON-STUDIO / Pixabay. Quiet road ambience: synthesized in-game.',
    crLeft: 'Move left', crRightMove: 'Move right', crForward: 'Move forward', crBack: 'Move back',
    crCanvas: 'Dodge cars, go around rocks and trees, and take the correct quiz crosswalk. Use the direction buttons below or arrow keys.',
    crOptions: 'Left: {left}, middle: {middle}, right: {right}', crHearts: '{n} hearts remaining',
    crControls: 'Movement controls', crPauseAria: 'Pause game', crLoading: 'Getting the road ready…'
  }
};

const W = 480;
const CELL = 64;
const HERO_W = 64;
const obstacleSize = (obstacle) => {
  const tree = obstacle.kind === 'tree';
  const width = (tree ? 48 : 58) + obstacle.variant * 2;
  return { width, height: width * (tree ? 112 : 80) / 96 };
};
const ROOT = 'assets/games/crossing/';
const traffic = (row) => ['road', 'crosswalk'].includes(rowKind(row));
const pick = (value, lang) => value[lang] || value.en;

/* A broad thinking sidewalk before each quiz gives both the avatar and labels room. */
function rowDistance(row) {
  const layout = sectionLayout(sectionOf(row));
  return row * 66 + 80 * (layout.id + Math.max(0, Math.min(1, row - layout.gateRow)));
}

const HTML =
  '<canvas class="cr-canvas" tabindex="0" role="img" data-i18n-aria="crCanvas"></canvas>' +
  '<div class="cr-player"><div class="cr-character"></div></div>' +
  '<canvas class="cr-foreground" aria-hidden="true"></canvas>' +
  '<header class="hud-bar cr-hud">' +
    '<button class="hud-btn cr-home" data-i18n-aria="crLobby">' + iconMarkup('home') + '</button>' +
    '<div class="hud-pill cr-hearts" role="img"></div>' +
    '<span class="hud-pill hud-push cr-distance"></span>' +
    '<button class="hud-btn cr-sound" data-i18n-aria="sound"></button>' +
    '<button class="hud-btn cr-pause" data-i18n-aria="crPauseAria"><span class="hud-pause"></span></button>' +
  '</header>' +
  '<div class="cr-runline"><span class="cr-gates"></span>' +
    '<div class="cr-effects" hidden><span class="cr-effect-slow" hidden>' + iconMarkup('hourglass') + '<b></b></span>' +
      '<span class="cr-effect-shield" hidden>' + iconMarkup('score-protection') + '</span></div>' +
    '<span class="cr-wallet">' + iconMarkup('sparkle') + '<b></b></span></div>' +
  '<section class="cr-question" aria-live="polite" aria-atomic="true">' +
    '<div class="cr-qtop"><span class="cr-qkind"></span><span class="cr-level"></span></div>' +
    '<div class="cr-qbody"><img class="cr-flag" hidden alt=""><strong class="cr-qtext"></strong></div>' +
    '<span class="cr-qhelp"></span><p class="cr-sr cr-options"></p>' +
  '</section>' +
  '<div class="cr-loot" role="status" aria-live="polite" aria-atomic="true" hidden>' +
    '<div class="cr-loot-burst" aria-hidden="true"></div><div class="cr-loot-sparks" aria-hidden="true">' + '<i></i>'.repeat(6) + '</div>' +
    '<div class="cr-loot-content"><span class="cr-loot-icon"></span><strong class="cr-loot-label"></strong></div>' +
  '</div>' +
  '<div class="cr-message" role="status" aria-live="polite"></div>' +
  '<footer class="cr-footer"><div class="cr-items"></div>' +
    '<div class="cr-directions" role="group" data-i18n-aria="crControls">' +
      '<button data-move="-1,0" data-i18n-aria="crLeft">←</button>' +
      '<button data-move="0,1" data-i18n-aria="crForward">↑</button>' +
      '<button data-move="0,-1" data-i18n-aria="crBack">↓</button>' +
      '<button data-move="1,0" data-i18n-aria="crRightMove">→</button>' +
    '</div>' +
  '</footer>' +
  '<div class="cr-overlay" data-mode="start"><section class="cr-card" role="dialog" aria-modal="true" aria-labelledby="cr-title">' +
    '<p class="cr-tag"></p><div class="cr-cardhero"></div><h1 id="cr-title"></h1><p class="cr-description"></p>' +
    '<div class="cr-guide"><p data-i18n="crGuide1"></p><p data-i18n="crGuide2"></p><p data-i18n="crGuide3"></p><p data-i18n="crGuide4"></p><p data-i18n="crGuide5"></p></div>' +
    '<p class="cr-item-guide" data-i18n="crItemGuide"></p>' +
    '<div class="cr-result" hidden><div class="cr-stars"></div><strong class="cr-result-score"></strong><span class="cr-result-count"></span><p class="cr-earned"></p></div>' +
    '<p class="cr-best"></p><button class="cr-primary"></button><button class="cr-secondary"></button>' +
    '<button class="cr-credits-toggle" data-i18n="crCredits"></button>' +
    '<div class="cr-credits" hidden><p data-i18n="crCreditText"></p><a href="https://kenney.nl/assets/isometric-tiles-city" target="_blank" rel="noopener noreferrer">Kenney · City</a> · ' +
      '<a href="https://pixabay.com/sound-effects/city-car-drive-by-whoosh-450445/" target="_blank" rel="noopener noreferrer">DRAGON-STUDIO · Pixabay</a></div>' +
  '</section></div>';

export function mount(el, ctx) {
  el.innerHTML = HTML;
  ctx.apply(el);
  const $ = (s) => el.querySelector(s);
  const t = ctx.t;
  const lang = ctx.lang;
  const canvas = $('.cr-canvas');
  const foreground = $('.cr-foreground');
  const back = canvas.getContext('2d');
  const front = foreground.getContext('2d');
  let g = back;
  const overlay = $('.cr-overlay');
  const heroNode = $('.cr-player');
  const lootNode = $('.cr-loot');
  const lootContent = $('.cr-loot-content');
  const lootBurst = $('.cr-loot-burst');
  const lootSparks = [...el.querySelectorAll('.cr-loot-sparks i')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero = ctx.character($('.cr-character'), { body: true });
  const cardHero = ctx.character($('.cr-cardhero'), { body: true });
  cardHero.expression('happy');
  let progress = readProgress(ctx.progress);
  let run = createRun();
  run.mode = 'ready';
  let dead = false, raf = 0, previousTime = 0, scale = 1, H = 800, camera = 0;
  let itemPaused = false, reporting = false, reported = false, messageUntil = 0;
  let pointer = null, questionStamp = '', heartStamp = '', statusText = '';
  let loot = null;
  const images = {};
  const put = (selector, text) => { const n = $(selector); if (n.textContent !== String(text)) n.textContent = text; };
  const active = () => !dead && !itemPaused && run.mode === 'play';
  const trafficSound = createTrafficSound(ctx.audio);
  const syncTrafficSound = () => {
    if (!active() || document.hidden) trafficSound.stop();
    else trafficSound.update(trafficScene(run));
  };

  const sources = {
    vehicles: VEHICLE_SHEET.src,
    rock: ROOT + 'rock.svg',
    obstacleTree: ROOT + 'obstacle-tree.svg',
    gift: 'assets/ui/gift-box.webp',
    tree: ROOT + 'tree.png', lamp: ROOT + 'streetlight.png'
  };
  const loading = Object.entries(sources).map(([key, src]) => new Promise((resolve) => {
    const img = images[key] = new Image();
    img.onload = img.onerror = () => { resolve(); if (!dead) draw(); };
    img.src = src;
  }));
  let assetsReady = false;
  $('.cr-primary').disabled = true;
  Promise.all(loading).then(() => {
    if (dead) return;
    assetsReady = true;
    $('.cr-primary').disabled = false;
    put('.cr-primary', t('crStart'));
  });

  function project(col, row) {
    const x = 48 + col * CELL;
    const anchor = Math.min(H * 0.75, H - 180 / scale);
    return { x, y: anchor - (rowDistance(row) - camera) };
  }

  /* Roads, signs and vehicles share a straight horizontal/vertical grid. */
  function atGround(col, row, paint) {
    const p = project(col, row);
    g.save();
    g.translate(p.x, p.y);
    paint();
    g.restore();
  }

  function polygon(points, fill) {
    g.beginPath();
    points.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
  }

  function strip(rowA, rowB, fill, colA = -2, colB = 8) {
    polygon([project(colA, rowA), project(colB, rowA), project(colB, rowB), project(colA, rowB)], fill);
  }

  function sprite(key, col, row, width, offset = 0) {
    const img = images[key];
    if (!img?.complete || !img.naturalWidth) return;
    const p = project(col, row);
    const height = width * img.naturalHeight / img.naturalWidth;
    g.drawImage(img, p.x - width / 2, p.y - height + offset, width, height);
  }

  function drawRoad(row) {
    const p = project(3, row);
    const asphalt = g.createLinearGradient(0, p.y - 40, 0, p.y + 40);
    asphalt.addColorStop(0, '#414a62');
    asphalt.addColorStop(1, '#535d76');
    strip(row - 0.5, row + 0.5, asphalt);
    for (let col = -1; col < 8; col += 1.5) {
      strip(row - 0.027, row + 0.027, '#ffffff31', col, col + 0.55);
    }
    if (!traffic(row + 1)) {
      strip(row + 0.47, row + 0.5, '#ead6ab');
      strip(row + 0.43, row + 0.47, '#b9a786');
    }
    if (!traffic(row - 1)) {
      strip(row - 0.5, row - 0.44, '#eedbb5');
      strip(row - 0.44, row - 0.41, '#302d3b4a');
    }
  }

  function drawSafe(row) {
    const gate = rowKind(row) === 'gate';
    strip(row - 0.5, row + 0.5, gate ? '#e8cd93' : '#83a94c');
    if (!gate) {
      /* Lawn tiles use the same ground projection as the asphalt and crosswalks. */
      for (let col = -2; col < 8; col++) {
        if ((col + row) % 2 === 0) strip(row - 0.5, row + 0.5, '#93b75b', col, col + 1);
      }
      strip(row - 0.14, row + 0.14, '#d7cb9870');
      strip(row + 0.42, row + 0.5, '#b6cb7880');
    } else {
      strip(row - 0.5, row - 0.46, '#d0b780');
      strip(row + 0.46, row + 0.5, '#f8e3b4');
    }
  }

  function choiceLabel(text, x, y, color) {
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const numeric = /^\d+$/.test(text);
    let size = numeric ? 32 : 18;
    const family = '"Jua", "Nunito", sans-serif';
    g.font = size + 'px ' + family;
    while (size > 12 && g.measureText(text).width > 78) { size--; g.font = size + 'px ' + family; }
    if (g.measureText(text).width <= 82) { g.fillText(text, x, y, 82); return; }
    const words = text.includes(' ') ? text.split(' ') : [...text];
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line + (text.includes(' ') && line ? ' ' : '') + word;
      if (g.measureText(candidate).width > 80 && line) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    lines.slice(0, 2).forEach((s, i) => g.fillText(s, x, y + (i - (Math.min(lines.length, 2) - 1) / 2) * 15, 82));
  }

  function drawCrossing(q) {
    const layout = sectionLayout(q.id);
    if (Math.abs(rowDistance(layout.crossingRow) - camera) > H + 260) return;
    const start = layout.gateRow + 0.5;
    const end = layout.exitRow - 0.5;
    ANSWER_COLUMNS.forEach((col, index) => {
      const open = q.unlocked && q.chosen === col;
      if (open) strip(start, end, '#77edaa30', col - 0.55, col + 0.55);
      for (let r = start + 0.08; r < end; r += 0.32) {
        strip(r, Math.min(r + 0.14, end), open ? '#edfff1' : '#fff7e8', col - 0.48, col + 0.48);
      }
    });
  }

  function drawAnswerBox(q, col, index) {
    const open = q.unlocked && q.chosen === col;
    atGround(col, sectionLayout(q.id).gateRow + 0.48, () => {
      /* Answer boxes sit at the entrance without fence bars or support posts. */
      g.shadowColor = '#312d3250';
      g.shadowBlur = 0;
      g.shadowOffsetY = 4;
      const removed = q.eliminated.includes(index);
      g.fillStyle = open ? '#deffd6' : removed ? '#d8d2c6' : q.wrong.includes(index) ? '#f3d0bc' : '#fff4d9';
      g.strokeStyle = open ? '#55ac59' : '#bd9d66';
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(-46, -40, 92, 46, 7);
      g.fill(); g.stroke();
      g.shadowOffsetY = 0;
      choiceLabel(removed ? '—' : pick(q.choices[index], lang), 0, -17, q.wrong.includes(index) ? '#a44e38' : '#4d3523');
      if (open) { g.fillStyle = '#338c4c'; g.font = 'bold 19px sans-serif'; g.fillText('✓', 37, -44); }
    });
  }

  function drawCar(car) {
    atGround(car.col, car.row, () => {
      const side = car.direction > 0 ? 'right' : 'left';
      const img = images.vehicles;
      const [x, y, frameWidth, frameHeight] = VEHICLE_TYPES[car.variant][side];
      const width = car.length * CELL;
      const height = width * frameHeight / frameWidth;
      const speed = car.speed * (run.t < run.slowUntil ? 0.4 : 1);
      const rush = reducedMotion.matches ? 0 : Math.max(0, Math.min(1, (speed - 0.85) / 1.5));
      const bob = Math.sin(run.trafficTime * (12 + car.variant) + car.row) * rush * 0.9;
      if (rush > 0.08) {
        const tail = -car.direction * width * 0.46;
        const pulse = 0.8 + 0.2 * Math.sin(run.trafficTime * 9 + car.row);
        const trail = (12 + 28 * rush) * pulse;
        const fade = g.createLinearGradient(tail, 0, tail - car.direction * trail, 0);
        fade.addColorStop(0, '#fff2c8' + Math.round(110 * rush).toString(16).padStart(2, '0'));
        fade.addColorStop(1, '#fff2c800');
        g.strokeStyle = fade; g.lineWidth = 1.4 + rush; g.lineCap = 'round';
        for (const [index, y] of [-height * 0.5, -height * 0.22, 6].entries()) {
          const offset = index * 3;
          g.beginPath(); g.moveTo(tail - car.direction * offset, y);
          g.lineTo(tail - car.direction * (trail + offset), y); g.stroke();
        }
      }
      g.fillStyle = '#17203742';
      g.beginPath(); g.ellipse(0, 10, width * (0.44 + rush * 0.025), 8, 0, 0, Math.PI * 2); g.fill();
      if (img?.naturalWidth) {
        if (rush > 0.4) {
          g.save(); g.globalAlpha = rush * 0.07;
          g.drawImage(img, x, y, frameWidth, frameHeight, -width / 2 - car.direction * (5 + rush * 7), -height + 12 + bob, width, height);
          g.restore();
        }
        g.drawImage(img, x, y, frameWidth, frameHeight, -width / 2, -height + 12 + bob, width, height);
      }
      else { g.fillStyle = '#e88854'; g.fillRect(-width / 2, -25, width, 29); }
    });
  }

  function drawObstacle(obstacle) {
    atGround(obstacle.col, obstacle.row, () => {
      const tree = obstacle.kind === 'tree';
      const img = tree ? images.obstacleTree : images.rock;
      const { width, height } = obstacleSize(obstacle);
      /* Center the image vertically on its blocked grass tile. */
      g.translate(0, height / 2);
      if (img?.naturalWidth) g.drawImage(img, -width / 2, -height, width, height);
      else if (tree) {
        g.fillStyle = '#91633e'; g.fillRect(-6, -20, 12, 20);
        g.fillStyle = '#7cab41'; g.fillRect(-width / 2 + 4, -height + 4, width - 8, height * 0.7);
      } else {
        g.fillStyle = '#87959d';
        g.beginPath(); g.moveTo(-27, -8); g.lineTo(-18, -34); g.lineTo(6, -43);
        g.lineTo(27, -21); g.lineTo(23, -3); g.lineTo(-7, 0); g.closePath(); g.fill();
      }
    });
  }

  function drawGift(gift) {
    atGround(gift.col, gift.row, () => {
      const img = images.gift;
      const lift = 2 + Math.sin(run.t * 3 + gift.id) * 2;
      g.fillStyle = '#8e672b30';
      g.beginPath(); g.ellipse(0, 2, 20, 7, 0, 0, Math.PI * 2); g.fill();
      if (img?.naturalWidth) g.drawImage(img, -23, -44 - lift, 46, 46);
      else { g.fillStyle = '#e9b839'; g.fillRect(-18, -34, 36, 34); }
    });
  }

  function draw() {
    if (dead) return;
    front.clearRect(0, 0, W, H);
    g = back;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#88aa53'; g.fillRect(0, 0, W, H);
    const position = playerPosition(run);
    const from = Math.max(-4, Math.floor(position.row) - 7);
    const to = Math.ceil(position.row) + Math.ceil(H / 60) + 3;
    ensureWorld(run, to);
    for (let row = to; row >= from; row--) traffic(row) ? drawRoad(row) : drawSafe(row);
    run.questions.forEach(drawCrossing);
    const obstacles = run.obstacles.filter((obstacle) => obstacle.row >= from && obstacle.row <= to);
    const p = project(position.col, position.row);
    atGround(position.col, position.row, () => {
      g.fillStyle = '#4b3c2940';
      g.beginPath(); g.ellipse(0, 2, 25, 9, 0, 0, Math.PI * 2); g.fill();
    });
    /* Paint back to front, with objects in front of the avatar on a separate canvas. */
    const objects = [];
    const add = (col, row, paint, offset = 0) => objects.push({ depth: project(col, row).y + offset, paint });
    for (let row = from; row <= to; row++) {
      if (traffic(row)) {
        for (const car of carsForRow(row, run.trafficTime)) add(car.col, row, () => drawCar(car));
      } else {
        for (const col of [-0.75, 6.8]) {
          add(col, row + 0.12, () => sprite('tree', col, row + 0.12, row % 3 === 0 ? 66 : 51, 10));
          if (row % 3 === 0) {
            const lampCol = col < 0 ? 0.05 : 6.1;
            add(lampCol, row + 0.3, () => sprite('lamp', lampCol, row + 0.3, 24));
          }
        }
      }
    }
    for (const q of run.questions) {
      const layout = sectionLayout(q.id);
      if (q.id > questionForRow(run).id || Math.abs(rowDistance(layout.crossingRow) - camera) > H + 260) continue;
      ANSWER_COLUMNS.forEach((col, index) => add(col, layout.gateRow + 0.48, () => drawAnswerBox(q, col, index)));
    }
    for (const obstacle of obstacles) add(obstacle.col, obstacle.row, () => drawObstacle(obstacle), obstacleSize(obstacle).height / 2);
    for (const gift of run.gifts) {
      if (!gift.collected && gift.row >= from && gift.row <= to) add(gift.col, gift.row, () => drawGift(gift));
    }
    objects.sort((a, b) => a.depth - b.depth).forEach((object) => {
      g = object.depth > p.y ? front : back;
      object.paint();
    });
    g = back;
    heroNode.style.left = p.x * scale + 'px';
    heroNode.style.top = (p.y - position.lift) * scale + 'px';
    heroNode.classList.toggle('cr-invulnerable', run.t < run.invulnerableUntil && run.mode === 'play');
    heroNode.classList.toggle('cr-shielded', run.shield);
    drawLoot(p, position.lift);
  }

  function showGiftReward(reward) {
    const icon = reward === 'heart' ? 'heart-full' : reward === 'shield' ? 'score-protection' : 'hourglass';
    const label = reward === 'heart' ? 'crGiftHeart' : reward === 'shield' ? 'crGiftShield' : 'crGiftSlow';
    loot = { started: run.t };
    lootNode.dataset.reward = reward;
    $('.cr-loot-icon').innerHTML = iconMarkup(icon);
    put('.cr-loot-label', t(label));
    lootNode.hidden = false;
  }

  /* Game time keeps the entire reward animation frozen while play is paused. */
  function drawLoot(position, lift) {
    if (!loot) return;
    const age = run.t - loot.started;
    if (age >= 2.2) { loot = null; lootNode.hidden = true; return; }
    const pop = Math.min(1, age / 0.28) - 1;
    const burst = Math.min(1, age / 0.65);
    const motion = reducedMotion.matches ? 0 : 1;
    const rise = age * 18 * motion;
    const width = W * scale;
    lootNode.style.left = Math.max(102, Math.min(width - 102, position.x * scale)) + 'px';
    lootNode.style.top = (position.y - lift - HERO_W * 1.3) * scale - rise + 'px';
    lootNode.style.opacity = Math.min(1, age / 0.06) * Math.min(1, (2.2 - age) / 0.5);
    lootContent.style.transform = 'scale(' + (motion ? 1 + 2.7 * pop ** 3 + 1.7 * pop ** 2 : 1) + ')';
    lootBurst.style.transform = 'scale(' + (0.4 + burst * 1.6) + ')';
    lootBurst.style.opacity = 1 - burst;
    lootSparks.forEach((spark, i) => {
      const angle = i * Math.PI / 3;
      const radius = 22 + burst * 43;
      spark.style.transform = 'translate(' + Math.cos(angle) * radius + 'px,' + Math.sin(angle) * radius + 'px) rotate(' + burst * 120 + 'deg)';
      spark.style.opacity = 1 - burst;
    });
  }

  function measure() {
    if (dead) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    scale = r.width / W;
    H = r.height / scale;
    for (const layer of [canvas, foreground]) {
      layer.width = Math.round(r.width * dpr);
      layer.height = Math.round(r.height * dpr);
      const context = layer.getContext('2d');
      context.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      context.imageSmoothingQuality = 'high';
    }
    heroNode.style.width = HERO_W * scale + 'px';
    draw();
  }

  function message(text, kind = '', seconds = 3.5) {
    messageUntil = run.t + seconds;
    statusText = text;
    put('.cr-message', text);
    $('.cr-message').dataset.kind = kind;
  }

  function renderHud() {
    put('.cr-distance', t('crDistance', { n: run.maxRow }));
    put('.cr-gates', t('crGates', { n: run.cleared }));
    const level = difficultyForSection(sectionOf(run.maxRow)).level;
    put('.cr-level', t('crLevel', { n: level }));
    const remaining = Math.max(0, Math.ceil(run.slowUntil - run.t));
    const slow = $('.cr-effect-slow');
    slow.hidden = !remaining;
    put('.cr-effect-slow b', t('crSeconds', { n: remaining }));
    slow.title = t('crSlowTimer', { n: remaining });
    slow.setAttribute('aria-label', slow.title);
    const shield = $('.cr-effect-shield');
    shield.hidden = !run.shield;
    shield.title = t('crShieldShort');
    shield.setAttribute('aria-label', shield.title);
    $('.cr-effects').hidden = !remaining && !run.shield;
    put('.cr-wallet b', ctx.sparkles());
    const hearts = String(run.hearts);
    if (heartStamp !== hearts) {
      heartStamp = hearts;
      $('.cr-hearts').innerHTML = Array.from({ length: 3 }, (_, i) => iconMarkup(i < run.hearts ? 'heart-full' : 'heart-empty')).join('');
      $('.cr-hearts').setAttribute('aria-label', t('crHearts', { n: run.hearts }));
    }
    const q = questionForRow(run);
    const stamp = [q.id, q.unlocked, q.cleared, q.hinted, q.erased].join('-');
    if (questionStamp !== stamp) {
      questionStamp = stamp;
      put('.cr-qkind', t(q.kind === 'math' ? 'crMath' : 'crCapital'));
      put('.cr-qtext', q.kind === 'math' ? q.a + ' × ' + q.b + (q.unlocked ? ' = ' + pick(q.choices[q.correct], lang) + ' ✓' : ' = ?') :
        q.unlocked ? pick(q.choices[q.correct], lang) + ' ✓' : t('crCountry', { name: pick(q.country.name, lang) }));
      $('.cr-question').classList.toggle('cr-capital-question', q.kind === 'capital');
      $('.cr-question').classList.toggle('cr-answered', q.unlocked);
      const flag = $('.cr-flag');
      flag.hidden = q.kind !== 'capital';
      if (q.country) {
        flag.src = 'assets/games/capitals/flags/' + q.country.code.toLowerCase() + '.svg';
        flag.alt = pick(q.country.name, lang);
      }
      const label = (i) => q.eliminated.includes(i) ? '—' : pick(q.choices[i], lang);
      put('.cr-options', t('crOptions', { left: label(0), middle: label(1), right: label(2) }));
      put('.cr-qhelp', q.unlocked ? t('crTraffic') : t('crChoose'));
    }
    if (run.t >= messageUntil) {
      const next = t(run.shield ? 'crShield' : rowKind(run.player.row) === 'gate' ? 'crSafe' : traffic(run.player.row) ? 'crTraffic' : 'crWalk');
      if (statusText !== next) { statusText = next; put('.cr-message', next); $('.cr-message').dataset.kind = ''; }
    }
    el.dataset.row = run.player.row;
    el.dataset.column = run.player.col;
    el.dataset.mode = run.mode;
    el.dataset.hearts = run.hearts;
    el.dataset.cleared = run.cleared;
    el.dataset.level = level;
    el.dataset.gifts = run.giftsCollected;
    $('.cr-pause').disabled = !active();
  }

  const bar = ctx.itemBar($('.cr-items'), {
    eraser: {
      can: () => active() && rowKind(run.player.row) === 'gate' && !questionForRow(run).unlocked && !questionForRow(run).erased &&
        questionForRow(run).choices.some((_, i) => i !== questionForRow(run).correct && !questionForRow(run).wrong.includes(i)),
      apply() { if (dead) return; if (eraseChoice(run)) message(t('crErased'), 'hint', 15); renderHud(); }
    },
    hint: {
      can: () => active() && rowKind(run.player.row) === 'gate' && !questionForRow(run).hinted && !questionForRow(run).unlocked,
      apply() {
        if (dead) return;
        const q = questionForRow(run); q.hinted = true;
        message(q.kind === 'capital' ? t('crHintCapital', { first: pick(q.country.capital, lang)[0] }) :
          q.b === 1 ? t('crHintOne', { a: q.a }) : t('crHintMath', { a: q.a, b: q.b - 1, n: q.a * (q.b - 1) }), 'hint', 30);
        renderHud();
      }
    },
    time: {
      can: () => active() && run.t >= run.slowUntil,
      apply() { if (dead) return; run.slowUntil = run.t + SLOW_SECONDS; message(t('crSlow'), 'good', SLOW_SECONDS); }
    },
    shield: {
      can: () => active() && !run.shield,
      apply() { if (dead) return; run.shield = true; message(t('crShield'), 'good'); }
    },
    pause() { itemPaused = true; trafficSound.stop(); },
    resume() { itemPaused = false; previousTime = 0; syncTrafficSound(); }
  });

  function updateSound() {
    const on = ctx.audio.getSound();
    $('.cr-sound').innerHTML = iconMarkup(on ? 'sound' : 'sound-muted');
    $('.cr-sound').setAttribute('aria-pressed', String(on));
  }

  function showOverlay(mode) {
    trafficSound.stop();
    overlay.hidden = false;
    overlay.dataset.mode = mode;
    $('.cr-guide').hidden = mode !== 'start';
    $('.cr-item-guide').hidden = mode !== 'start';
    $('.cr-result').hidden = mode !== 'result';
    $('.cr-cardhero').hidden = mode === 'exit';
    $('.cr-credits').hidden = true;
    $('.cr-credits-toggle').setAttribute('aria-expanded', 'false');
    put('.cr-tag', mode === 'result' ? t('crResult', { n: run.cleared, gifts: run.giftsCollected }) : t('crTag'));
    put('#cr-title', t(mode === 'start' ? 'crTitle' : mode === 'pause' ? 'crPause' : mode === 'exit' ? 'crQuit' : 'crOver'));
    put('.cr-description', t(mode === 'start' ? 'crIntro' : mode === 'pause' ? 'crPauseHelp' : mode === 'exit' ? 'crQuitHelp' : 'crOverHelp'));
    put('.cr-primary', t(mode === 'start' ? assetsReady ? 'crStart' : 'crLoading' : mode === 'result' ? 'crAgain' : 'crResume'));
    put('.cr-secondary', t(mode === 'exit' ? 'crLeave' : 'crLobby'));
    put('.cr-best', t('crBest', { n: progress.best }));
    $('.cr-primary').disabled = mode === 'start' ? !assetsReady : mode === 'result' && reporting;
    $('.cr-footer').inert = true;
    $('.cr-hud').inert = true;
    canvas.tabIndex = -1;
    $('.cr-card').tabIndex = -1;
    if (!$('.cr-primary').disabled) $('.cr-primary').focus({ preventScroll: true });
    else $('.cr-card').focus({ preventScroll: true });
    bar.refresh();
    renderHud();
  }

  function resume() {
    overlay.hidden = true;
    $('.cr-footer').inert = false;
    $('.cr-hud').inert = false;
    canvas.tabIndex = 0;
    run.mode = 'play';
    previousTime = 0;
    syncTrafficSound();
    canvas.focus({ preventScroll: true });
    bar.refresh();
    renderHud();
  }

  function start() {
    if (!assetsReady || reporting) return;
    trafficSound.stop();
    run = createRun();
    loot = null; lootNode.hidden = true;
    camera = 0;
    previousTime = 0; reported = false; messageUntil = 0; questionStamp = ''; heartStamp = '';
    hero.react('idle');
    resume();
    message(t('crWalk'), '', 4);
    renderHud(); draw();
  }

  function pause() {
    if (!active()) return;
    run.mode = 'pause';
    showOverlay('pause');
  }

  async function finish() {
    if (reported || dead) return;
    reported = true; reporting = true;
    loot = null; lootNode.hidden = true;
    const result = resultFor(run);
    progress.best = Math.max(progress.best, result.score);
    progress.distance = Math.max(progress.distance, run.maxRow);
    progress.runs++;
    hero.react('fail');
    cardHero.react('fail');
    $('.cr-stars').innerHTML = Array.from({ length: 3 }, (_, i) => '<span class="' + (i < result.stars ? '' : 'cr-empty-star') + '">' + iconMarkup('star') + '</span>').join('');
    put('.cr-result-score', t('crScore', { n: result.score }));
    put('.cr-result-count', t('crResult', { n: run.cleared, gifts: run.giftsCollected }));
    put('.cr-earned', t('crSaving'));
    showOverlay('result');
    try {
      await ctx.saveProgress(progress);
      const reward = await ctx.finish(result);
      if (!dead) put('.cr-earned', t('crEarned', { n: reward?.earned || 0 }));
    } finally {
      reporting = false;
      if (!dead) { $('.cr-primary').disabled = false; renderHud(); }
    }
  }

  function processEvents() {
    for (const e of run.events.splice(0)) {
      if (['wrong', 'gift', 'correct', 'hit', 'protected'].includes(e.kind)) trafficSound.duck();
      if (e.kind === 'wrong') { hero.react('wrong'); ctx.audio.wrong(); message(t('crWrong'), 'wrong'); }
      if (e.kind === 'path') message(t('crPath'));
      if (e.kind === 'eliminated') message(t('crBlocked'));
      if (e.kind === 'obstacle') {
        message(t(e.obstacle.kind === 'tree' ? 'crTreeBlocked' : 'crRockBlocked'), 'blocked');
      }
      if (e.kind === 'gift') {
        hero.react('correct'); ctx.audio.correct();
        showGiftReward(e.reward);
      }
      if (e.kind === 'correct') { hero.react('correct'); ctx.audio.correct(); message(t('crRight'), 'good', 4); }
      if (e.kind === 'crossed') message(t(e.question.id === 2 ? 'crCapitalNext' : 'crCrossed'), 'good', 4);
      if (e.kind === 'hit' || e.kind === 'protected') {
        hero.react(e.kind === 'hit' ? 'wrong' : 'correct');
        if (e.kind === 'hit') ctx.audio.wrong();
        message(t(e.kind === 'hit' ? 'crHit' : 'crProtected'), e.kind === 'hit' ? 'wrong' : 'good');
      }
      if (e.kind === 'finish') void finish();
    }
    bar.refresh();
  }

  function move(dx, dy) {
    if (!active()) return;
    requestMove(run, dx, dy);
    processEvents();
    renderHud();
  }

  function keydown(e) {
    if (!overlay.hidden) {
      if (e.key === 'Escape' && ['pause', 'exit'].includes(overlay.dataset.mode)) { e.preventDefault(); resume(); }
      if (e.key === 'Tab') {
        const controls = [...overlay.querySelectorAll('button, select, a[href]')].filter((n) => !n.disabled && n.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return;
    }
    if (e.key === 'Escape' || e.key.toLowerCase() === 'p') { e.preventDefault(); pause(); return; }
    const direction = {
      ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0],
      ArrowUp: [0, 1], w: [0, 1], ' ': [0, 1], ArrowDown: [0, -1], s: [0, -1]
    }[e.key];
    if (direction) { e.preventDefault(); move(...direction); }
  }

  function pointerDown(e) {
    if (!active() || !e.isPrimary) return;
    pointer = { x: e.clientX, y: e.clientY, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
  }
  function pointerUp(e) {
    if (!pointer || pointer.id !== e.pointerId) return;
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    pointer = null;
    if (Math.hypot(dx, dy) > 18) {
      if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0);
      else move(0, dy < 0 ? 1 : -1);
      return;
    }
    const r = canvas.getBoundingClientRect(), p = project(run.player.col, run.player.row);
    const x = e.clientX - r.left - p.x * scale;
    const y = e.clientY - r.top - p.y * scale;
    if (Math.abs(x) > Math.abs(y) * 0.75 && Math.abs(x) > CELL * scale * 0.55) move(Math.sign(x), 0);
    else move(0, y <= 0 ? 1 : -1);
  }
  const pointerCancel = () => { pointer = null; };
  const visibility = () => { if (document.hidden) { trafficSound.stop(); pause(); } previousTime = 0; };
  $('.cr-directions').addEventListener('click', (e) => {
    const button = e.target.closest('[data-move]');
    if (button) move(...button.dataset.move.split(',').map(Number));
  });
  $('.cr-home').onclick = () => { if (active()) { run.mode = 'pause'; showOverlay('exit'); } };
  $('.cr-pause').onclick = pause;
  $('.cr-sound').onclick = () => { ctx.setSound(!ctx.audio.getSound()); updateSound(); syncTrafficSound(); };
  $('.cr-primary').onclick = () => ['start', 'result'].includes(overlay.dataset.mode) ? start() : resume();
  $('.cr-secondary').onclick = () => { trafficSound.stop(); ctx.exit(); };
  $('.cr-credits-toggle').onclick = () => {
    const panel = $('.cr-credits');
    panel.hidden = !panel.hidden;
    $('.cr-credits-toggle').setAttribute('aria-expanded', String(!panel.hidden));
  };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  document.addEventListener('keydown', keydown);
  document.addEventListener('visibilitychange', visibility);
  const observer = new ResizeObserver(measure);
  observer.observe(el);

  let itemRefreshTime = 0;
  function frame(time) {
    if (dead) return;
    const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
    previousTime = time;
    if (active()) {
      advance(run, dt);
      if (run.events.length) processEvents();
      camera += (rowDistance(playerPosition(run).row) - camera) * Math.min(1, dt * 15);
      renderHud();
      if (time - itemRefreshTime > 300) { bar.refresh(); itemRefreshTime = time; }
      draw();
    }
    syncTrafficSound();
    raf = requestAnimationFrame(frame);
  }
  updateSound();
  renderHud();
  measure();
  showOverlay('start');
  raf = requestAnimationFrame(frame);
  return {
    destroy() {
      dead = true;
      trafficSound.destroy();
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerCancel);
      for (const img of Object.values(images)) img.onload = img.onerror = null;
    }
  };
}
