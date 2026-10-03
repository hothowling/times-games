/*
 * maker.js - 사진 3장(평소·웃음·찡그림) → 배경을 지운 얼굴 5칸 띠(2000×400).
 * 칸 순서는 캐릭터 표준(neutral, happy, angry, surprised, sad)이고, 놀람=평소, 슬픔=찡그림으로 채웁니다.
 * 얼굴 찾기·배경 제거는 MediaPipe(WASM, vendor/mediapipe/)로 브라우저 안에서 합니다. 원본 사진은 밖으로 나가지 않습니다.
 * MediaPipe 는 만들기 화면을 열 때만 받고(약 7MB, gzip), 닫으면 메모리를 돌려줍니다.
 * 원본: times-shooter/chars.js. 위쪽 계산 함수는 tests/maker.test.js 가 Node 에서 검사합니다.
 */

export const FRAME = 400;   /* 한 칸 크기 */
const PAD = 100;            /* 배경 제거 때 어깨와 주변까지 보이도록 한 칸 둘레에 더 그리는 여백 */
export const EYE_DIST = 140; /* 두 눈꼬리 사이 거리 */
export const EYE_Y = 216;    /* 두 눈 가운데 높이. 턱 아래에 입을 벌릴 만큼 여유를 둡니다 */
/* face mesh 턱선: 화면 왼쪽 턱 모서리(58) → 턱 끝(152) → 오른쪽 턱 모서리(288) */
const JAW = [58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288];
/* 찍은 3장(0 평소, 1 웃음, 2 찡그림) → 5칸 */
export const SHEET_ORDER = [0, 1, 2, 0, 2];

/* 두 눈꼬리(33, 263)로 사진을 한 칸에 맞춥니다: 눈은 수평, 사이는 EYE_DIST, 가운데는 (FRAME/2, EYE_Y). */
export function frameTransform(lm) {
  const a = lm[33];
  const b = lm[263];
  return {
    ex: (a.x + b.x) / 2,
    ey: (a.y + b.y) / 2,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
    scale: EYE_DIST / Math.hypot(b.x - a.x, b.y - a.y)
  };
}

/* 사진 좌표 → 한 칸 좌표. makeFrame 에서 canvas 에 그릴 때와 같은 변환입니다. */
export function mapPoint(p, T) {
  const dx = p.x - T.ex;
  const dy = p.y - T.ey;
  const cos = Math.cos(-T.angle);
  const sin = Math.sin(-T.angle);
  return {
    x: FRAME / 2 + (dx * cos - dy * sin) * T.scale,
    y: EYE_Y + (dx * sin + dy * cos) * T.scale
  };
}

/* 남길 영역: 턱선 위쪽 전부. 턱 모서리 높이에서 양옆으로 곧게 잘라 목과 어깨를 지웁니다.
   턱선은 얼굴 가운데에서 2% 바깥으로 넓혀 턱 끝이 깎이지 않게 합니다. */
export function keepPolygon(lm, T) {
  const c = mapPoint({ x: (lm[10].x + lm[152].x) / 2, y: (lm[10].y + lm[152].y) / 2 }, T);
  const jaw = JAW.map((i) => {
    const p = mapPoint(lm[i], T);
    return { x: c.x + (p.x - c.x) * 1.02, y: c.y + (p.y - c.y) * 1.02 };
  });
  return [{ x: -1, y: jaw[0].y }, ...jaw,
    { x: FRAME + 1, y: jaw[jaw.length - 1].y }, { x: FRAME + 1, y: -1 }, { x: -1, y: -1 }];
}

/* 사람일 확률(0~1) → 불투명도(0~1). 경계를 조금 또렷하게 해서 배경이 비치는 테두리를 줄입니다. */
export function alphaOf(conf) {
  const v = (conf - 0.3) / 0.5;
  return v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
}

/* ---------- MediaPipe ---------- */

/* 모델 출처: storage.googleapis.com/mediapipe-models 의 face_landmarker/float16/latest,
   image_segmenter/selfie_segmenter/float16/latest. 라이브러리는 @mediapipe/tasks-vision 1.0.1 */
const BASE = () => new URL('vendor/mediapipe/', document.baseURI).href;
let models = null;
export let modelsReady = false;

export function loadModels() {
  if (!models) {
    const base = BASE();
    models = import(base + 'vision_bundle.mjs').then(async (mp) => {
      const files = await mp.FilesetResolver.forVisionTasks(base + 'wasm');
      /* 두 작업을 동시에 만들면 WASM 로더가 전역 변수를 두고 다투므로 차례로 만듭니다. */
      const lm = await mp.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: base + 'face_landmarker.task', delegate: 'CPU' },
        runningMode: 'IMAGE',
        numFaces: 1
      });
      const seg = await mp.ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: base + 'selfie_segmenter.tflite', delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputConfidenceMasks: true,
        outputCategoryMask: false
      });
      modelsReady = true;
      return { lm, seg };
    });
    models.catch(() => { models = null; }); /* 실패하면 다음에 다시 시도 */
  }
  return models;
}

export function closeModels() {
  if (!models) return;
  models.then((m) => { m.lm.close(); m.seg.close(); }, () => {});
  models = null;
  modelsReady = false;
}

/* ---------- 사진 한 장 → 배경을 지운 한 칸(ImageData) ---------- */

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/* <img> 로 읽으면 브라우저가 사진의 회전(EXIF) 정보를 알아서 적용합니다. */
function loadImage(file) {
  return new Promise((ok, fail) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); fail(new Error('badImg')); };
    img.src = url;
  });
}

export async function makeFrame(file) {
  let md;
  try { md = await loadModels(); } catch { throw new Error('failLoad'); }
  const img = await loadImage(file);
  const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight)); /* 큰 사진은 줄여서 */
  const src = canvas(Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k));
  src.getContext('2d').drawImage(img, 0, 0, src.width, src.height);

  const face = md.lm.detect(src).faceLandmarks[0];
  if (!face) throw new Error('noFace');
  const lm = face.map((p) => ({ x: p.x * src.width, y: p.y * src.height }));
  const T = frameTransform(lm);

  /* 한 칸 + 둘레 여백에 얼굴을 맞춰 그린 뒤, 그 그림에서 사람 영역을 찾습니다. */
  const size = FRAME + PAD * 2;
  const work = canvas(size, size);
  const wctx = work.getContext('2d', { willReadFrequently: true });
  wctx.translate(FRAME / 2 + PAD, EYE_Y + PAD);
  wctx.rotate(-T.angle);
  wctx.scale(T.scale, T.scale);
  wctx.translate(-T.ex, -T.ey);
  wctx.drawImage(src, 0, 0);

  const res = md.seg.segment(work);
  const mask = res.confidenceMasks[0];
  const mw = mask.width;
  const mh = mask.height;
  const conf = mask.getAsFloat32Array().slice();
  res.close();

  const keep = canvas(FRAME, FRAME);
  const kctx = keep.getContext('2d', { willReadFrequently: true });
  kctx.beginPath();
  for (const p of keepPolygon(lm, T)) kctx.lineTo(p.x, p.y);
  kctx.fill();
  const keepA = kctx.getImageData(0, 0, FRAME, FRAME).data;

  const out = wctx.getImageData(PAD, PAD, FRAME, FRAME);
  const px = out.data;
  let total = 0;
  for (let y = 0; y < FRAME; y++) {
    const row = Math.floor((y + PAD) * mh / size) * mw;
    for (let x = 0; x < FRAME; x++) {
      const i = (y * FRAME + x) * 4;
      px[i + 3] = alphaOf(conf[row + Math.floor((x + PAD) * mw / size)]) * keepA[i + 3];
      total += px[i + 3];
    }
  }
  if (total < FRAME * FRAME * 255 * 0.05) throw new Error('noMask'); /* 사람을 거의 못 찾음 */
  return out;
}

/* 3칸 → 5칸 띠 Blob. WebP 를 못 만드는 브라우저(Safari)는 PNG 를 돌려줍니다. */
export function makeSheet(frames) {
  const sheet = canvas(FRAME * SHEET_ORDER.length, FRAME);
  const ctx = sheet.getContext('2d');
  SHEET_ORDER.forEach((f, i) => ctx.putImageData(frames[f], i * FRAME, 0));
  return new Promise((ok, fail) => sheet.toBlob((b) => (b ? ok(b) : fail(new Error('failSave'))), 'image/webp', 0.9));
}
