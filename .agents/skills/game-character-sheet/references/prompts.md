# 생성 프롬프트

`{identity_notes}`는 사진에서 관찰한 특징만으로 채운다. IMAGE 번호는 실제 입력 순서와 일치시킨다.

## Neutral master

```text
Create one neutral master head sprite for a mobile game.
IMAGE 1: supplied person photo, the sole IDENTITY reference.
IMAGE 2: Sooji expression sheet, STYLE ONLY. Do not copy Sooji's identity,
hairstyle, colored hair ties, tilt or layout onto this person.
Identity notes: {identity_notes}
Preserve the person's face shape, eye shape/spacing, nose, lips, jawline,
ears, hairstyle, bangs, hair color, skin tone and recognizable impression.
Transform these traits into the same strong 2D animated mobile game style as
IMAGE 2: subtle chibi, large expressive eyes, crisp outlines, smooth cel shading,
bright soft colors. Not a photograph or semi-realistic portrait.
HEAD ONLY, including hair; no neck, shoulders, body, clothing, new accessories,
props, labels or text. Keep existing hair ties only if they belong to IMAGE 1.
Neutral expression: relaxed, closed mouth or faint smile, forward natural gaze.
Front-facing camera with level eyes; do not copy accidental photo tilt.
Target 512 x 960 portrait canvas. Eye midpoint centered at x=256,
eye-line near y=480, chin near y=660 (eye-line-to-chin about180px).
These are FACE guides, independent of gender and hair length. Keep natural
identity proportions; never enlarge the skull merely to fill the frame.
Maximum complete head width INCLUDING hair/ears/tears is352px (about69% of
cell width). At least80px entirely transparent on BOTH sides; at least64px
transparent above and below. All hair must be fully visible. Hair top/width
may differ by hairstyle; do not force long-haired faces to become smaller.
If hair needs more room, use a smaller UNIFORM head scale and ample blank
space; the game's later eye/chin calibration will restore perceived face size.
Do not zoom in or fill the canvas width. No cropping of hair or ears.
True transparent RGBA background and chin cutout; no painted checkerboard,
opaque black/white backdrop, floor shadow or watermark.
```

## Five-expression sheet

```text
Create a production-ready expression sheet for the person in IMAGE 1.
IMAGE 1: original photo, IDENTITY reference.
IMAGE 2: Sooji sheet, STYLE ONLY reference.
IMAGE 3: neutral master, exact CHARACTER DESIGN and GEOMETRY reference.
Identity notes: {identity_notes}

Treat IMAGE 3 as ONE locked facial animation rig. Do not invent five designs.
Keep exactly the same head width/height/center, skull, face width, jaw width,
chin height, ear position, hair silhouette and existing hair ties, eye-line,
eye spacing, nose position, proportions, camera distance, camera angle and scale.
Only eyebrows, eyelids, eye opening, pupil direction, mouth shape, cheeks and
tears may change. No zoom, tilt, rotation, stretching or head displacement.
Keep the mouth centered at its master position even when it opens.
Do not deform the skull or entire jaw for crying.

Exactly FIVE heads in ONE horizontal row, left to right:
1 NEUTRAL: approved master, calm, mouth closed or very faint smile.
2 HAPPY: bright energetic happy smile, may open mouth.
3 ANGRY: clearly furrowed brows, cute pout or closed mouth.
4 SURPRISED: widened eyes, small O-shaped mouth.
5 CRYING: squeezed/closed eyelids, open crying mouth, large stylized anime tears
streaming from BOTH eyes; retain the same head and chin geometry.

Same strong 2D anime game style as IMAGE 2, subtle chibi, crisp outlines,
large expressive eyes, smooth cel shading, bright soft colors. Retain the
photographed person's recognizable identity through all expressions.

Target 2560 x 960 pixels, FIVE equal 512 x 960 cells.
Centers x = 256, 768, 1280, 1792, 2304.
Shared FACE guides: eye-line near y480, chin near y660, same as master.
Keep the master eye-to-chin distance and eye spacing in every expression.
Hair silhouette follows this person's master, not the style reference's size.
Each complete head INCLUDING hair/ears/tears occupies at most352px of512px
cell width. At least80px fully transparent to the LEFT and RIGHT in EVERY
cell, including first and last; at least64px above and below. Thus adjacent
heads have at least160px completely transparent gap. Do not distribute five
large heads edge-to-edge or fill the total canvas width with artwork.
All hair, ears and tears must stay inside their own cells.
Never overlap or touch neighboring heads or hair. No grid lines or labels.
HEADS ONLY: no neck, shoulders, body, clothing, added props, accessories or shadows.
Real transparent RGBA PNG background; no opaque black/white or checkerboard pixels.
```

## 문제 부분만 수정

머리가 온전히 있고 여백만 좁으면 먼저 `prepare_sheet.py --pad-to-margin`으로 공통 축소·패딩한다. 아래 프롬프트는 실제 겹침/잘린 머리 복원이 필요한 경우에 쓴다. 단순 간격 부족 때문에 반복 생성하지 않는다. 크기 변경을 일부 표정에만 적용하지 않는다.

```text
Edit ONLY spacing and any clipped hair edges of this five-expression sheet.
Preserve identity, style, expressions/order and head geometry.
Reduce ALL FIVE complete heads by the SAME uniform scale, each around its
own cell center. Five equal cells, each with at least80px clear transparent
left/right margin at512px cell width; maximum head width352px.
Keep eye-lines and chins aligned identically across all expressions.
Reconstruct clipped hair/ears from the neutral master before fitting them.
No stretching, per-expression zoom, missing hair, neck/body or new props.
Keep true transparency. Blank space is intentional; do not fill it.
```

```text
Edit only {specific_issue} in cell {cell_number} of this sheet.
Use cell 1 as the locked master for identity and head geometry.
Preserve all other cells, hairstyle, scale, anchors, angle and expression order.
Keep five equal cells and real transparency. Do not redraw the whole character.
```
