# 구구단 디펜스 이미지

어린이용 손그림 카툰 스타일. 내장 `image_gen`으로 생성하고 PNG의 알파를 보존해 지정 크기로 정리했습니다.

| 파일 | 이미지 크기 | 구성 |
| --- | --- | --- |
| `zombie-normal.png` | 576×96 | 96×96, 6프레임 |
| `zombie-fast.png` | 480×80 | 80×80, 6프레임 |
| `zombie-tank.png` | 840×140 | 140×140, 6프레임 |
| `zombie-quiz.png` | 624×104 | 104×104, 6프레임, 머리 위 물음표 |
| `fence-intact.png`, `fence-cracked.png`, `fence-broken.png` | 각 64×112 | 멀쩡함 / 금 감 / 부서진 조각 |
| `fence-rail.png` | 360×24 | 가로 나무 |
| `missile-0.png` … `missile-5.png` | 각 48×20 | 오른쪽 방향, 공격력 0~5레벨 |
| `explosion.png` | 1024×128 | 128×128, 8프레임 |
| `background.png` | 720×1600 | 들판 1120px / 마당 480px |
| `icon-power.png`, `icon-rapid.png`, `icon-multi.png`, `icon-pierce.png`, `icon-blast.png` | 각 128×128 | 공격력 / 연사 속도 / 다연발 / 관통 / 폭발 |
| `thumbnail.png` | 234×234 | 로비용 썸네일 |

총 PNG 22개입니다. 배경과 썸네일은 불투명이고, 나머지 이미지는 실제 알파 투명도입니다.

좀비 스트립은 왼쪽부터 걷기 4프레임, 갉기 2프레임입니다. 프레임 인덱스는 0부터 시작합니다.
걷기: `0,1,2,3`; 갉기: `4,5`. 프레임 사이 여백이나 패딩은 없습니다.
원본에 포함된 셀 내부 여백은 유지해 캐릭터가 프레임 경계를 넘지 않게 했습니다.

`manifest.json`에 크기, 프레임 수, 애니메이션 속도, 앵커, 경로가 있습니다.
페이지 기준 경로는 `assets/games/defense/`입니다.

```js
// 가로 스트립의 한 프레임을 그리는 방법
g.drawImage(image, frame * frameWidth, 0, frameWidth, frameHeight,
  x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
```

애니메이션 미리보기: `output/imagegen/defense/preview.html`.
전체 이미지 목록: `output/imagegen/defense/contact-sheet.png`.
생성 프롬프트와 원본 기록: `output/imagegen/defense/generation.json`.
크기 정리 스크립트: `output/imagegen/defense/prepare.mjs` (Sharp 필요).
