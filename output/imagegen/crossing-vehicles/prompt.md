# 박스형 차량 시트

- 생성 방식: 내장 image_gen 도구, 투명 배경.
- 적용 이미지: public/assets/games/crossing/vehicles-block-atlas.png (1448×1086 RGBA).
- 차종: 빨강 소형차, 파랑 승용차, 초록 SUV, 보라 밴, 노랑 택시, 주황 버스, 트럭, 민트 스쿠터.
- 배열: 4열×4행. 각 차종은 오른쪽 방향 다음 왼쪽 방향 순서다.
- 런타임 프레임 좌표와 길이: public/games/crossing/vehicles.js.
- 최초 4종 시안 vehicles-source.png는 미사용이며, vehicles-block-source.png가 최종 원본이다.

## 최종 생성 프롬프트

```
Use case: stylized-concept
Asset type: one transparent production game sprite atlas, 16 vehicle sprites, landscape canvas ideally 2048 x 1536.
Primary request: VERY SIMPLE BOX-SHAPED / VOXEL-TOY vehicles for a children's road-crossing game. Exactly 4 columns and 4 rows, evenly spaced identical cells. Each vehicle fits entirely within its own cell with 15% transparent margin; no grid lines, no text.
Each row contains TWO matched right/left pairs in this exact order:
ROW 1: red tiny hatchback facing RIGHT; SAME red hatchback facing LEFT; sky-blue sedan facing RIGHT; SAME blue sedan facing LEFT.
ROW 2: lime-green boxy SUV facing RIGHT; SAME green SUV facing LEFT; purple tall minivan facing RIGHT; SAME purple minivan facing LEFT.
ROW 3: yellow taxi with a small plain roof block facing RIGHT; SAME yellow taxi facing LEFT; orange long city bus facing RIGHT; SAME orange bus facing LEFT.
ROW 4: coral-red cab with an ivory rectangular cargo box facing RIGHT; SAME cargo truck facing LEFT; mint-teal small motorcycle/scooter WITHOUT rider facing RIGHT; SAME mint-teal scooter facing LEFT.
CRITICAL STYLE: construct each body out of just 2–4 LARGE SHARP-CORNERED RECTANGULAR CUBOIDS. Flat untextured solid colors with only 2–3 clearly separated face shades. Squared-off block wheels, a few plain pale-blue rectangular windows, tiny cream headlight and red tail-light blocks. It should look like basic wooden building blocks or a very simple voxel mobile game. Strong readable silhouette. Keep the scooter very simple too: one square body, one upright steering block, one black rectangular seat, two dark wheel blocks.
NO realism, NO detailed models, NO smooth bulbous bodies, NO curves, NO rounded car contours, NO door seams, NO handles, NO mirrors, NO grille, NO wheel spokes or hubs, NO tiny accessories, NO surface texture, NO glossy effects, NO outlines, NO pixelated edges.
CRITICAL ORIENTATION: exact orthographic SIDE-ON view with a slight view from above but ZERO horizontal camera yaw. EVERY vehicle's long axis is perfectly horizontal. Two wheel contact points in each vehicle share EXACTLY the same horizontal baseline. Long roof/chassis edges horizontal, upright edges vertical. A narrow lighter rectangular roof top gives simple 3D volume. Do not angle any vehicle into or away from the screen. No diagonal/isometric perspective, no tilt.
Use the same camera, lighting and design language for all 16. Opposite directions must clearly match: cream headlights on the front, red tail lights at back. Car proportions compact, SUV/van taller, bus distinctly longest, truck box-shaped, scooter smallest.
Background: genuinely transparent alpha. No floor, no ground shadows, no glow, no backdrop. Isolated sharp-edged sprites only. No labels, no arrows, no logos, no extra objects or people.
```
