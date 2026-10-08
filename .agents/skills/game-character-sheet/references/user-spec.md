당신은 게임용 캐릭터 에셋 제작 파이프라인을 설계하는 역할이다.

목표:
입력으로 들어오는 인물 사진 1장을 기준으로,
게임에서 사용할 수 있는 애니메이션 스타일의 얼굴 표정 캐릭터 시트 1장을 생성한다.

최종 결과물은 동일 인물의 얼굴을 기반으로 한 5개의 표정이 가로로 배치된 투명 PNG 캐릭터 시트여야 한다.

==================================================
1. 기본 요구사항
==================================================

입력:
- 인물 사진 1장
- 사진에는 한 명의 얼굴이 명확하게 보여야 함

출력:
- PNG
- 투명 배경
- 가로형 캐릭터 시트
- 총 5개의 얼굴
- 얼굴만 표현
- 목, 어깨, 몸, 옷은 포함하지 않음
- 텍스트, 아이콘, 장식, 배경, 그림자 없음

표정 순서:
왼쪽부터

1. 기본 표정 / Neutral
2. 웃는 표정 / Happy
3. 화난 표정 / Angry
4. 놀란 표정 / Surprised
5. 우는 표정 / Crying


==================================================
2. 캐릭터 스타일
==================================================

첨부된 사진 속 인물의 특징을 최대한 유지한다.

유지해야 할 요소:
- 얼굴형
- 눈 모양
- 눈 사이 간격
- 코
- 입
- 턱
- 귀 위치
- 헤어스타일
- 앞머리
- 머리 색
- 피부색
- 전체적인 인상

단, 사진처럼 사실적으로 만들지 말고
게임용 애니메이션 캐릭터 스타일로 변환한다.

스타일:
- 강한 2D 애니메이션 스타일
- 약간의 chibi 느낌
- 큰 눈
- 또렷한 감정 표현
- 깨끗한 외곽선
- 셀 셰이딩
- 밝고 부드러운 색감
- 모바일 게임 캐릭터 에셋 느낌
- 귀엽고 정돈된 표현
- 반실사보다 애니메이션 쪽에 더 가까운 스타일

중요:
새로운 캐릭터를 창작하면 안 된다.
반드시 입력 사진 속 인물을 애니메이션 캐릭터로 변환해야 한다.


==================================================
3. 표정 정의
==================================================

4. Neutral
- 편안한 표정
- 입은 닫혀 있거나 아주 살짝 미소
- 눈은 자연스럽게 정면

2. Happy
- 밝게 웃는 표정
- 입을 열고 웃어도 됨
- 행복하고 활기찬 느낌

3. Angry
- 눈썹을 확실하게 찌푸림
- 입은 살짝 다물거나 삐죽한 느낌
- 귀엽지만 분명히 화난 인상

4. Surprised
- 눈을 크게 뜸
- 입은 작은 O 모양
- 놀란 감정이 명확하게 보여야 함

5. Crying
- 눈을 감거나 강하게 찡그림
- 입을 벌리고 우는 표정
- 양쪽 눈에서 큰 애니메이션 스타일 눈물이 흐름


==================================================
4. 가장 중요한 일관성 규칙
==================================================

5개의 얼굴은 각각 새로 그린 다른 캐릭터처럼 보이면 안 된다.

반드시
"하나의 캐릭터 얼굴 리그에서 표정만 바뀐 것"
처럼 보여야 한다.

Neutral 표정을 MASTER REFERENCE FRAME으로 사용한다.

Happy, Angry, Surprised, Crying은
Neutral의 얼굴 구조를 그대로 유지한다.

다음 요소는 5개 표정 모두 동일해야 한다:

- head width
- head height
- face width
- skull shape
- hair silhouette
- eye-line height
- eye spacing
- nose position
- chin height
- jaw width
- ear height
- overall facial proportions
- camera angle
- camera distance
- head scale
- head center position

변경 가능한 요소는 표정에 필요한 부분만이다:

- eyebrows
- eyelids
- eyes opening
- pupil direction
- mouth
- cheeks
- tears


==================================================
5. 얼굴 위치 및 정렬
==================================================

고정된 크기의 캔버스를 사용한다.

권장 출력 크기:

2560 x 960 px

캔버스를 정확히 5개의 동일한 세로 셀로 나눈다.

각 셀 크기:

512 x 960 px

구성:

Cell 1 = Neutral
Cell 2 = Happy
Cell 3 = Angry
Cell 4 = Surprised
Cell 5 = Crying

각 얼굴은 반드시 자신의 셀 중앙에 위치해야 한다.

각 표정의 얼굴은 동일한 크기를 유지한다.

기준선:

- 머리 최상단 위치 동일
- 눈 중심선 동일
- 턱 끝 위치 동일
- 얼굴 중심 X/Y 위치 동일
- 귀 높이 동일
- 코 중심 동일
- 입 중심 동일

권장 상대 위치:

- top of hair: canvas height의 약 15%
- eye-line: canvas height의 약 43%
- chin: canvas height의 약 72%

정확한 픽셀보다
5개의 얼굴이 서로 동일한 기준선에 정렬되는 것이 더 중요하다.


==================================================
6. 오버레이 기준
==================================================

5개의 얼굴 이미지를 서로 겹쳐서 비교했을 때:

- 머리 외곽선이 거의 일치해야 함
- 턱 끝 위치가 거의 일치해야 함
- 눈의 중심선이 거의 일치해야 함
- 코 위치가 거의 일치해야 함
- 얼굴 중심이 거의 일치해야 함

표정이 강해지더라도
얼굴 전체가 위/아래/좌/우로 이동하면 안 된다.

금지:

- zoom in
- zoom out
- head tilt
- head rotation
- vertical shift
- horizontal shift
- face resizing


==================================================
7. 간격
==================================================

각 캐릭터는 절대로 서로 겹치지 않아야 한다.

머리카락도 옆 캐릭터와 닿으면 안 된다.

각 캐릭터 사이에는 충분한 빈 공간을 둔다.

권장:
캐릭터 머리 너비의 약 25~35% 정도의 빈 공간 확보.

하지만 각 얼굴은 자신의 512px 셀을 넘지 않아야 한다.

각 셀 내부에서 좌우 여백도 동일해야 한다.


==================================================
8. 배경
==================================================

반드시 투명 PNG.

금지:

- 검은 배경
- 흰 배경
- 체크무늬 배경을 실제 이미지로 포함
- 그림자
- 글자
- 라벨
- 프레임
- 아이콘
- 소품
- 장식


==================================================
9. 생성용 핵심 영어 프롬프트
==================================================

아래 프롬프트를 이미지 생성 모델에 사용한다.

Create a production-ready game character expression sprite sheet based on the attached reference photo.

Preserve the recognizable identity of the person in the reference:
face shape, eyes, eye spacing, nose, lips, jawline, ears, hairstyle, bangs, hair color, skin tone, and overall facial impression.

Transform the person into a cute polished 2D anime game character.

STYLE:
- strong anime style
- subtle chibi proportions
- large expressive eyes
- clean crisp outlines
- smooth cel shading
- bright soft colors
- simplified but recognizable hair
- mobile game character asset quality
- clearly animated rather than photorealistic

HEAD ONLY.

Do not include:
neck, shoulders, body, clothing, text, icons, props, decorations, shadows, or background.

Create exactly 5 expressions in one horizontal row:

1. Neutral
2. Happy
3. Angry
4. Surprised
5. Crying

EXPRESSION DETAILS:

Neutral:
calm natural expression, mouth closed or subtle smile.

Happy:
bright cheerful smile, energetic and friendly.

Angry:
clearly furrowed eyebrows, slightly pouting or closed mouth, cute but clearly angry.

Surprised:
wide open eyes, small O-shaped mouth.

Crying:
eyes squeezed or closed, open crying mouth, large stylized anime tears streaming from both eyes.

STRICT SPRITE SHEET CONSISTENCY:

Treat all five expressions as frames from the exact same facial animation rig.

The NEUTRAL face is the master reference frame.

For all other expressions:
do not redraw, resize, reposition, rotate, or rescale the entire head.

Keep exactly the same:

- head width
- head height
- head center
- skull shape
- hair silhouette
- face width
- jaw width
- chin height
- eye-line height
- eye spacing
- nose position
- ear position
- camera distance
- camera angle
- overall facial proportions

Only expression-related features may change:

- eyebrows
- eyelids
- eye opening
- pupil direction
- mouth shape
- cheeks
- tears

Do not zoom.
Do not tilt.
Do not rotate.
Do not shift the head vertically.
Do not shift the head horizontally.

When all five expressions are overlaid,
the head silhouette, eye-line, face center, and chin position should nearly perfectly align.

LAYOUT:

Use a fixed 2560 x 960 canvas.

Divide the canvas into five equal vertical cells.

Each cell is 512 x 960.

Cell 1: Neutral
Cell 2: Happy
Cell 3: Angry
Cell 4: Surprised
Cell 5: Crying

Place exactly one head centered inside each cell.

Keep:
- same head size
- same top-of-hair position
- same eye-line
- same chin height
- same face center
- same ear height

Approximate vertical guides:
- top of hair around 15% of canvas height
- eye-line around 43%
- chin around 72%

Each head must fit completely inside its own cell.

Characters must NEVER overlap.

Hair must never touch the neighboring character.

Leave generous spacing between heads.

Make each expression easy to crop as an individual game asset.

BACKGROUND:
transparent PNG.

No text.
No labels.
No background.
No decorative elements.
No shadows.

IMPORTANT:

Do not create five different interpretations of the character.

All five must look like the SAME head mesh with only facial controls changed.

The final result must look like a professional animation expression sprite sheet for a mobile game.


==================================================
10. 출력 후 검증
==================================================

이미지 생성 후 반드시 아래를 검사한다.

- 5개 표정이 정확히 존재하는가
- 순서가 맞는가
- 각 얼굴 크기가 동일한가
- 눈 높이가 동일한가
- 턱 높이가 동일한가
- 머리 크기가 동일한가
- 얼굴 중심이 동일한가
- 캐릭터끼리 겹치지 않는가
- 머리카락끼리 닿지 않는가
- 목이나 몸이 포함되지 않았는가
- 투명 배경인가
- 같은 인물처럼 보이는가
- 5개의 얼굴이 동일한 캐릭터 디자인을 유지하는가

가능하다면 이미지 생성 후 프로그램적으로도 검증하거나 후처리한다.

특히 각 512 x 960 셀을 개별적으로 추출할 수 있어야 한다.

결과 파일 예:

character_expression_sheet.png

추가로 개별 프레임도 추출 가능:

neutral.png
happy.png
angry.png
surprised.png
crying.png



이 요구사항을 기반으로 먼저 작업 계획을 세운 뒤 구현하라.

가능하면 다음 구조로 만들어라:

/input
  reference.png

/output
  character_expression_sheet.png
  neutral.png
  happy.png
  angry.png
  surprised.png
  crying.png

/prompts
  character-sheet-prompt.md

/scripts
  split-expression-sheet.*

필요하다면 생성된 2560x960 시트를 512px 단위로 자동 분리하는 스크립트도 작성하라.

중요:
추측으로 작업하지 말고,
현재 저장소 구조와 사용 가능한 이미지 생성 API 또는 도구를 먼저 확인한 뒤
기존 프로젝트 구조에 맞춰 구현하라.