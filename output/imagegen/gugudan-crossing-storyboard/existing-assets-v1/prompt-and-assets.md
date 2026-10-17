# 기존 프로젝트 에셋 적용 게임 화면

제작: built-in image_gen. 세로형 구구단 횡단보도 게임의 콘셉트 이미지 1장.

최종 이미지: [sooji-crossing-gameplay.png](sooji-crossing-gameplay.png)

## 참고·적용 에셋

1. /Users/bsjung/dev/Game/times-games/output/imagegen/gugudan-crossing-storyboard/portrait-v2/02-choose-answer-portrait.png
2. /Users/bsjung/dev/Game/times-games/public/assets/characters/sooji.webp
3. /Users/bsjung/dev/Game/times-games/public/assets/wearables/outfits/11-white-tee.webp
4. /Users/bsjung/dev/Game/times-games/public/assets/ui/icons.webp
5. /Users/bsjung/dev/Game/times-games/public/assets/games/defense/background.webp

캐릭터는 공통 프리셋 수지, 의상은 catalog.js의 기본 흰 티를 선택했다. 하트·Sparkles·홈·사운드는 기존 공통 UI 에셋을 참고했고, 주변 환경은 기존 디펜스 배경의 잔디·수풀·돌·흙길 화풍을 반영했다. 도로·차량·답안 횡단보도는 신규 게임 콘셉트를 위해 그리는 요소다. 실제 게임 코드나 원본 에셋은 수정하지 않는다.

## 최종 프롬프트

Use case: ui-mockup / compositing.
Asset type: ONE final portrait mobile gameplay concept image for an existing educational game project, integrating its ACTUAL existing character, clothing, environment art, and HUD icon designs.
Primary request: Apply the supplied real project assets to the portrait multiplication-crossing game composition. Deliver a believable playable game screenshot with the project's familiar illustrated character and UI, exactly ONE image.
Canvas: PORTRAIT approximately 9:16, full-bleed, target 1152x2048. No phone frame, presentation border, panels, footer, storyboard title, callout labels, or outside annotations.

INPUT IMAGE ROLES:
Image 1 = LAYOUT/CAMERA REFERENCE only, the previous portrait gameplay concept. Keep its vertically scrolling road-crossing concept, elevated oblique camera, diagonal parallel roads, multiple small traffic rows, three side-by-side answer crossings, HUD question, forward progression. REPLACE the voxel yellow bird, pixel typography, cube trees, and generic HUD with the ACTUAL supplied project art below.
Image 2 = CHARACTER IDENTITY SOURCE: 'sooji.webp', five expression cells of the SAME girl, not five characters. Use ONLY the LEFTMOST neutral expression to build ONE protagonist named Sooji. Preserve this EXACT recognizable illustrated little girl's facial design: dark brown side-parted hair with small multicolor pink/blue/green ties, low twin pigtails, very large warm brown eyes, rounded cheeks, tiny nose, gentle calm smile, existing smooth 2D anime/storybook rendering. Preserve face and hair proportions and identity closely; this is the project's actual existing character, not a newly designed generic girl. Do not display the face strip, extra faces, or other expressions anywhere.
Image 3 = ACTUAL BODY/CLOTHING source: '11-white-tee.webp', the project's default white T-shirt torso with bare arms, open left hand, and pencil held in right hand. Attach the face source to THIS body source as the existing project's paper-doll character renderer does. Preserve the plain white tee, hand poses, pencil, outlines, and friendly illustrated rendering. Big head, small upper-body proportions. The source is an upper-body cutout; use a coherent small paper-doll game sprite ending at the shirt hem, grounded by a soft oval shadow rather than inventing a different outfit or long legs. No dress, school uniform, hat, backpack, yellow bird, voxel body, or pixel-art face.
Image 4 = ACTUAL SHARED UI ICON ATLAS, icons.webp, 8 columns by 4 rows, each cell 64x64. Use only the relevant icon cells as small independent HUD graphics, NEVER show the whole atlas. Icon positions are ONE-BASED: glossy red HEART is ROW 3 COLUMN 2; rounded golden SPARKLES star is ROW 2 COLUMN 5; blue-gray square HOME icon is ROW 3 COLUMN 7; matching SOUND icon is ROW 3 COLUMN 8. Reproduce these familiar project icon designs faithfully. Do not use the sharp golden star from row 1, use the rounded five-point yellow sparkle from row 2. No atlas cell grid, other icons, character thumbnails, or shop content in output.
Image 5 = EXISTING ENVIRONMENT ART source, defense/background.webp. Use its painterly bright grassy meadow texture, little white/yellow flowers, smooth pebbles, lush leafy shrubs and bushes, golden dirt path colors and storybook brushwork to make the safe medians and road-edge scenery. Adapt this art into the new road-crossing layout, keeping the slightly oblique camera of image 1. Do not use cube trees, pixel terrain, flat geometric voxel leaves, zombies, weapons, or fences from other game genres. This should belong visually to the existing project's illustrated assets.

COMPOSITION / GAMEPLAY:
A single full-screen level extends off all four edges. Looking down from behind the playfield, elevated orthographic oblique view, parallel roads run left-to-right sloping down gently to the right, with several traffic rows visible farther ahead. Cars drive along these diagonal road rows, not toward the player. Draw a few small colorful rounded cartoon cars and a blue van, shaded and outlined to match the supplied project art, not voxel blocks or realistic photos.
Question road occupies the MIDDLE of the screen: exactly THREE separate parallel zebra crosswalks run from its NEAR/bottom curb to FAR/top curb across the SAME road. Arrange LEFT / CENTER / RIGHT side-by-side. Each crossing has a cream world-space number tile at its near entrance reading exactly LEFT '18', CENTER '24', RIGHT '30'. Text faces viewer clearly, in bold friendly rounded dark brown type, not pixel font. Each has a small neutral orange-white closed barrier arm, same design and state. Do not reveal which answer is correct yet. Cars in the question road stay near left and right outer edges so none of the number tiles are hidden.
DIRECTLY BELOW the answer tiles, widen the safe beige/grass median into a clear continuous walkable SAFE AREA. It connects the three entrance tiles laterally with no trees blocking movement. Position the ONE Sooji character at LOWER CENTER around 73% down the image, in this SAME safe area directly below the central '24' tile, preparing to choose a lane. There MUST NOT be another traffic road between the character and the answer tiles. Character should be about 17% of screen width and 18% screen height so the actual supplied face is recognizable, while the environment remains the majority of the screen. Use a small warm oval shadow under the sprite, and keep character art front-facing like the real asset even in the oblique world. No enclosing card, portrait circle, name plaque, floating speech bubble, or character selection panel around her.
Show a cropped ordinary traffic lane at the BOTTOM behind the safe area, and 2-3 more alternating road/grass rows in the UPPER half beyond the question road, conveying scrolling progression.
Use the supplied meadow ground and foliage for every safe median; retain clear tan curbs and white zebra stripes.

EXISTING-PROJECT HUD:
A compact top row over the playfield uses rounded cream pill backgrounds and subtle warm brown outlines, soft illustrated game UI rather than pixel UI. At far LEFT place the supplied blue-gray HOME icon. Center-left show EXACTLY THREE copies of the supplied red heart icon. Center-right show the supplied golden STAR icon followed by '48'. At far RIGHT place the supplied blue-gray SOUND icon. Icons are small and legible, do not enlarge to dominate the picture.
A small distance indicator '12' sits just below the home button area, unobtrusive.
At upper center just below the top row, put one cream rounded question banner with exact large text '6 × 4 = ?'. Friendly bold rounded numeral typography, brown outline, subtle warm shadow; approximately 70% screen width and 9% screen height. It should not occlude the crosswalks.
No extra joystick, arrow keypad, action buttons, bottom dock, large text instructions, timer, or title.

QUALITY / INVARIANTS:
All supplied asset roles are for visual incorporation, not a collage of asset sheets. Natural coherent composition, crisp readable game UI, clean matte painted road environment, softly outlined existing-character sprite. The actual girl's face, default shirt, hearts, star, home and sound designs must be recognizable from their source art. Maintain portrait gameplay framing and meaningful three-choice spatial crossing. Render arithmetic and answer numbers accurately. Exactly one protagonist, one equation, three answer paths.
