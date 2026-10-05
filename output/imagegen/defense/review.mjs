import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let sharp;
try { sharp = require('sharp'); }
catch { sharp = require('/Users/bsjung/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'); }
const root = path.resolve(import.meta.dirname, '../../..');
const dir = path.join(root, 'public/assets/games/defense');
const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
const assets = manifest.assets;
const composite = [];
const text = [];
function label(value, x, y, size = 20, color = '#e6eeda') {
  text.push(`<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="${size}">${value}</text>`);
}
async function place(id, x, y, width, height) {
  const input = await sharp(path.join(dir, assets[id].file)).resize(width, height, { fit: 'fill' }).png().toBuffer();
  composite.push({ input, left: x, top: y });
}
label('TIMES TABLE DEFENSE / ASSET PACK', 48, 65, 34);
label('22 PNG assets / true alpha sprites / exact target dimensions', 48, 104, 19, '#a8bb98');
label('BACKGROUND  720 x 1600', 48, 149, 19);
await place('background', 48, 169, 324, 720);
label('THUMBNAIL  234 x 234', 48, 938, 19);
await place('thumbnail', 48, 958, 234, 234);
for (const [i, id] of ['normal', 'fast', 'tank', 'quiz'].entries()) {
  const asset = assets[id];
  const y = 149 + i * 188;
  label(`ZOMBIE ${id.toUpperCase()}  ${asset.frameWidth} x ${asset.frameHeight} / WALK 1-4 + BITE 5-6`, 420, y, 19);
  await place(id, 420, y + 16, asset.width, asset.height);
}
label('EXPLOSION  128 x 128 / 8 FRAMES', 420, 912, 19);
await place('explosion', 420, 928, 960, 120);
label('FENCE  64 x 112 / 3 STATES', 420, 1091, 19);
for (const [i, id] of ['fence-intact', 'fence-cracked', 'fence-broken'].entries()) await place(id, 420 + i * 84, 1110, 64, 112);
await place('fence-rail', 420, 1239, 360, 24);
label('MISSILES  48 x 20 / LEVEL 0-5 (3x preview)', 805, 1091, 17);
for (let i = 0; i < 6; i++) {
  const x = 805 + (i % 3) * 190, y = 1110 + Math.floor(i / 3) * 95;
  await place(`missile-${i}`, x, y, 144, 60);
  label(`LV ${i}`, x, y + 80, 15, '#a8bb98');
}
label('UPGRADES  128 x 128', 48, 1320, 20);
for (const [i, id] of ['power', 'rapid', 'multi', 'pierce', 'blast'].entries()) {
  await place(`icon-${id}`, 48 + i * 250, 1340, 128, 128);
  label(id.toUpperCase(), 48 + i * 250, 1496, 17, '#a8bb98');
}
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1540">${text.join('')}</svg>`);
await sharp({ create: { width: 1440, height: 1540, channels: 3, background: '#263b2b' } })
  .composite([...composite, { input: svg, left: 0, top: 0 }]).png().toFile(path.join(import.meta.dirname, 'contact-sheet.png'));

const imageData = {};
for (const [id, asset] of Object.entries(assets)) imageData[id] = 'data:image/png;base64,' + (await fs.readFile(path.join(dir, asset.file))).toString('base64');
const cards = ['normal', 'fast', 'tank', 'quiz'].map(id => `<article><h2>${({ normal: '보통 좀비', fast: '빠른 좀비', tank: '튼튼한 좀비', quiz: '퀴즈 좀비' })[id]}</h2><p>${assets[id].frameWidth}×${assets[id].frameHeight} · 걷기 4 + 갉기 2</p><div class="pair"><figure><canvas data-sprite="${id}" data-mode="walk" width="${assets[id].frameWidth}" height="${assets[id].frameHeight}"></canvas><figcaption>걷기</figcaption></figure><figure><canvas data-sprite="${id}" data-mode="bite" width="${assets[id].frameWidth}" height="${assets[id].frameHeight}"></canvas><figcaption>갉기</figcaption></figure></div><img class="strip" src="${imageData[id]}" alt="${id} 6 frame sprite strip"></article>`).join('');
const iconNames = { power: '공격력', rapid: '연사 속도', multi: '다연발', pierce: '관통', blast: '폭발' };
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>디펜스 에셋 미리보기</title><style>
*{box-sizing:border-box}body{margin:0;background:#17291e;color:#eef5e4;font:16px/1.6 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:32px}h1{font-size:30px;margin:0}p{color:#a8bfab;margin:6px 0 20px}h2{font-size:20px;margin:0 0 5px}button{background:#f0cc6c;border:0;border-radius:12px;padding:10px 18px;font:inherit;color:#263321;cursor:pointer}section{margin:26px 0}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}article,.box{padding:22px;border:1px solid #415745;border-radius:20px;background:#263b2b}.pair{display:flex;justify-content:center;align-items:end;gap:28px;min-height:180px}figure{margin:0;text-align:center}canvas{display:block;margin:auto}figcaption{color:#cbd6bc;font-size:14px}.strip{display:block;max-width:100%;height:auto;margin-top:16px}.row{display:flex;gap:24px;flex-wrap:wrap;align-items:center}.row img{object-fit:contain}.missiles img{width:144px;height:60px}.icons img{width:128px;height:128px}.background{width:180px;height:400px;object-fit:contain}.extras{display:flex;gap:28px;align-items:start;flex-wrap:wrap}.plank{width:64px;height:112px}.muted{font-size:14px;color:#a8bfab}@media(max-width:700px){main{padding:18px}.grid{grid-template-columns:1fr}.icons img{width:96px;height:96px}}@media(prefers-reduced-motion:reduce){canvas{opacity:.95}}
</style><main><h1>구구단 디펜스 · 에셋 미리보기</h1><p>PNG 22개 · 투명 스프라이트 · 지정 크기 · 가로 스트립</p><button id="toggle">애니메이션 일시정지</button><section class="grid">${cards}</section><section class="box"><h2>폭발 · 128×128 · 8프레임</h2><div class="pair"><canvas data-sprite="explosion" width="128" height="128"></canvas></div><img class="strip" src="${imageData.explosion}" alt="explosion 8 frame sprite strip"></section><section class="box"><h2>울타리 · 64×112</h2><div class="row">${['intact', 'cracked', 'broken'].map((state, i) => `<figure><img class="plank" src="${imageData['fence-' + state]}" alt="${state}"><figcaption>${['멀쩡함', '금 감', '부서진 조각'][i]}</figcaption></figure>`).join('')}</div><p class="muted">가로대 · 360×24</p><img src="${imageData['fence-rail']}" width="360" height="24" style="max-width:100%" alt="fence rail"></section><section class="box"><h2>미사일 · 48×20 · 오른쪽 방향</h2><p class="muted">확대 3배</p><div class="row missiles">${Array.from({ length: 6 }, (_, i) => `<figure><img src="${imageData['missile-' + i]}" alt="missile level ${i}"><figcaption>Lv ${i}</figcaption></figure>`).join('')}</div></section><section class="box"><h2>업그레이드 · 128×128</h2><div class="row icons">${Object.entries(iconNames).map(([id, name]) => `<figure><img src="${imageData['icon-' + id]}" alt="${name}"><figcaption>${name}</figcaption></figure>`).join('')}</div></section><section class="box extras"><figure><img class="background" src="${imageData.background}" alt="grass field and yard"><figcaption>배경 · 720×1600<br>들판 70% / 마당 30%</figcaption></figure><figure><img src="${imageData.thumbnail}" width="234" height="234" alt="game thumbnail"><figcaption>썸네일 · 234×234</figcaption></figure></section></main><script>
const manifest=${JSON.stringify(manifest)},sources=${JSON.stringify(imageData)};
const images={};let running=!matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,previous=0;
const button=document.querySelector('#toggle');function updateButton(){button.textContent=running?'애니메이션 일시정지':'애니메이션 재생';}updateButton();button.onclick=()=>{running=!running;updateButton();};
const canvases=[...document.querySelectorAll('canvas[data-sprite]')];
Promise.all(Object.entries(sources).map(([id,src])=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images[id]=img;resolve();};img.onerror=reject;img.src=src;}))).then(()=>requestAnimationFrame(draw));
function draw(now){if(previous&&running)elapsed+=Math.min(100,now-previous);previous=now;for(const canvas of canvases){const id=canvas.dataset.sprite,a=manifest.assets[id],g=canvas.getContext('2d');const animation=a.animations?.[canvas.dataset.mode],frames=animation?.frames||[0,1,2,3,4,5,6,7],fps=animation?.fps||a.fps;const frame=frames[Math.floor(elapsed/1000*fps)%frames.length];g.clearRect(0,0,canvas.width,canvas.height);g.drawImage(images[id],frame*a.frameWidth,0,a.frameWidth,a.frameHeight,0,0,canvas.width,canvas.height);}requestAnimationFrame(draw);}
</script></html>`;
await fs.writeFile(path.join(import.meta.dirname, 'preview.html'), html);
console.log('Created contact-sheet.png and self-contained animated preview.html');
