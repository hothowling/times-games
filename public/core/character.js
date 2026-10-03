/*
 * character.js - 캐릭터 그리기. 모든 화면과 게임이 이것 하나로 캐릭터를 보여 줍니다.
 *
 *   const c = createCharacter(el, look, { body: true })
 *     look = { key, face: 얼굴 그림 주소, rig: 'sooji'|'jiho'|'photo', equipped: { outfit, head, face, back } }
 *     body: false 면 얼굴만(머리 장식·안경은 그대로) 그립니다.
 *   c.react('correct'|'wrong'|'timeout'|'clear'|'fail'|'idle')   표정 + 동작
 *   c.expression('neutral'|'happy'|'angry'|'surprised'|'sad')     표정만 바꾸기(다음 react 전까지 유지)
 *   c.update(look)   옷 갈아입히기     c.destroy()
 *
 * 얼굴 그림 = 표정 5칸 가로 띠(neutral, happy, angry, surprised, sad). 칸 비율은 캐릭터마다 달라도 됩니다.
 * 몸은 250×275 기준 좌표에서 얼굴·옷·장식을 겹치고(교실 게임의 레이어 방식), 요소 너비에 맞춰 통째로 늘이고 줄입니다.
 * 움직임(숨쉬기·흔들기·점프·반짝이)은 구구단 마스터의 마스코트 애니메이션을 그대로 씁니다(character.css).
 */
import { COSMETICS } from './catalog.js';

const EXPRESSIONS = ['neutral', 'happy', 'angry', 'surprised', 'sad'];
const BOX_W = 250;
const BOX_H = 275;

/* 착용 위치(기준 좌표 px). 캐릭터 그림에서 눈 높이·정수리·어깨선을 재서 맞췄습니다. */
const BASE_RIG = {
  faceX: '50%', faceY: -8, faceW: 194, faceH: 218,
  headX: '50%', headY: -80, headW: 205, headAngle: -3,
  glassesX: '50%', glassesY: 60, glassesW: 132, glassesAngle: 0,
  backRight: 100, backBottom: -20, backW: 150,
  outfitBottom: -50,
  bow: { headY: -42, headW: 145 }
};
export const RIGS = {
  sooji: { ...BASE_RIG, headX: '45.5%', headW: 198, glassesX: '42%', glassesAngle: -8.7 },
  jiho: {
    ...BASE_RIG, faceY: -21, faceW: 174, faceH: 196, headX: '47%', headY: -90, headAngle: 5,
    glassesX: '48%', glassesAngle: -4.9, bow: { headY: -35, headW: 132 }
  },
  /* 사진 캐릭터: 정사각형 칸, 눈이 칸의 54% 높이(core/maker.js 의 EYE_Y) */
  photo: { ...BASE_RIG, faceY: 2, faceW: 200, faceH: 200, headY: -70, glassesY: 75, glassesW: 128, bow: { headY: -34, headW: 140 } }
};

/* 반응: [표정, 동작 클래스, 유지 시간 ms(0 = 다음 반응까지)] */
const REACT = {
  correct: ['happy', 'is-correct', 650],
  wrong: ['surprised', 'is-wrong', 400],
  timeout: ['sad', 'is-timeout', 850],
  clear: ['happy', 'is-clear', 0],
  fail: ['sad', 'is-timeout', 0]
};
const CLASSES = ['is-correct', 'is-wrong', 'is-timeout', 'is-clear', 'is-cheer'];
const CHEER_MS = 1200;

const px = (v) => (typeof v === 'number' ? v + 'px' : v);

function node(tag, cls, parent) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (tag === 'img') { n.alt = ''; n.draggable = false; n.decoding = 'async'; }
  parent?.appendChild(n);
  return n;
}

export function createCharacter(el, look, { body = true } = {}) {
  el.textContent = '';
  el.classList.add('chr');
  el.classList.toggle('chr-faceonly', !body);
  el.setAttribute('aria-hidden', 'true');

  const stage = node('span', 'chr-stage', el);
  node('span', 'chr-glow', stage);
  const sway = node('span', 'chr-sway', stage);
  const breathe = node('span', 'chr-breathe', sway);
  const act = node('span', 'chr-act', breathe);
  const rig = node('span', 'chr-rig', act);
  const sparks = node('span', 'chr-sparkles', stage);
  for (let i = 0; i < 10; i++) node('i', '', sparks);

  const L = {
    back: node('img', 'chr-w chr-back', rig),
    outfit: node('img', 'chr-w chr-outfit', rig),
    face: node('span', 'chr-face', rig),
    head: node('img', 'chr-w chr-head', rig),
    glasses: node('img', 'chr-w chr-glasses', rig)
  };

  let current = look;
  let timer = null;
  let idleTimer = null;
  let busy = false;
  let held = null; /* expression() 로 고정한 표정 */
  let boxW = BOX_W;
  let shift = '';

  function setFace(name) {
    const i = Math.max(0, EXPRESSIONS.indexOf(name));
    L.face.style.backgroundPosition = `${i * 25}% center`;
  }

  function wear(img, id) {
    const c = id && COSMETICS[id];
    img.hidden = !c;
    if (c) img.src = c.img; else img.removeAttribute('src');
  }

  function update(next) {
    current = next;
    const r = RIGS[next.rig] || RIGS.photo;
    const eq = next.equipped || {};
    const bow = COSMETICS[eq.head]?.style === 'bow';
    const vars = {
      '--face-x': r.faceX, '--face-y': r.faceY, '--face-w': r.faceW, '--face-h': r.faceH,
      '--head-x': r.headX, '--head-y': bow ? r.bow.headY : r.headY, '--head-w': bow ? r.bow.headW : r.headW,
      '--head-angle': r.headAngle + 'deg',
      '--glasses-x': r.glassesX, '--glasses-y': r.glassesY, '--glasses-w': r.glassesW, '--glasses-angle': r.glassesAngle + 'deg',
      '--back-right': r.backRight, '--back-bottom': r.backBottom, '--back-w': r.backW, '--outfit-bottom': r.outfitBottom
    };
    for (const [k, v] of Object.entries(vars)) rig.style.setProperty(k, px(v));
    /* 얼굴만 그릴 때는 얼굴 칸을 기준 상자로 씁니다. */
    el.style.setProperty('--chr-ratio', body ? `${BOX_W} / ${BOX_H}` : `${r.faceW} / ${r.faceH}`);
    /* 얼굴만: 기준 상자는 그대로 두고 얼굴 칸이 요소를 채우도록 옮깁니다(얼굴은 항상 가로 가운데). */
    shift = body ? '' : ` translate(${r.faceW / 2 - BOX_W / 2}px, ${-r.faceY}px)`;
    boxW = body ? BOX_W : r.faceW;
    L.face.style.backgroundImage = `url("${next.face}")`;
    wear(L.outfit, body && eq.outfit);
    wear(L.back, body && eq.back);
    wear(L.head, eq.head);
    wear(L.glasses, eq.face);
    fit();
  }

  /* 기준 상자를 요소 너비에 맞춰 늘이고 줄입니다. */
  function fit() {
    const w = el.clientWidth;
    if (!w) return;
    el.style.setProperty('--chr-w', w + 'px');
    rig.style.transform = `scale(${w / boxW})${shift}`;
  }
  const ro = new ResizeObserver(fit);
  ro.observe(el);

  function clear() {
    clearTimeout(timer);
    timer = null;
    el.classList.remove(...CLASSES);
  }

  /* 클래스를 떼고 reflow 한 뒤 다시 붙여 애니메이션을 처음부터 재생합니다. */
  function restart(cls) {
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function react(state) {
    clear();
    const r = REACT[state];
    held = null;
    if (!r) { busy = false; setFace('neutral'); return; }
    busy = true;
    setFace(r[0]);
    restart(r[1]);
    if (!r[2]) return;
    timer = setTimeout(() => {
      timer = null;
      el.classList.remove(r[1]);
      busy = false;
      setFace(held || 'neutral');
    }, r[2]);
  }

  function expression(name) {
    held = name;
    if (!timer) setFace(name);
  }

  /* 대기 중 4~7초마다 잠깐 웃으며 고개 까딱 */
  function scheduleIdle() {
    idleTimer = setTimeout(() => {
      if (!busy && !held && !document.hidden && el.isConnected) {
        clear();
        setFace('happy');
        restart('is-cheer');
        timer = setTimeout(() => { timer = null; el.classList.remove('is-cheer'); if (!busy) setFace(held || 'neutral'); }, CHEER_MS);
      }
      scheduleIdle();
    }, 4000 + Math.random() * 3000);
  }

  update(look);
  setFace('neutral');
  scheduleIdle();

  return {
    react,
    expression,
    update,
    get look() { return current; },
    destroy() { clear(); clearTimeout(idleTimer); ro.disconnect(); }
  };
}
