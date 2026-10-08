# 지호·나연 애니메이션 시트 적용

- 도구: 내장 image_gen, 실제 투명 배경. 프로젝트 game-character-sheet 스킬 사용.
- 정체성 참고: 기존 실사 게임 시트의 첫 번째 표정을 추출했다. 새 원본 사진으로 간주하지 않는다.
- 그림체 참고: 프로젝트 스킬의 수지 시트. 지호의 짧은 앞머리와 나연의 단발을 유지했다.
- 각 캐릭터의 neutral 마스터 → 5표정 시트 → 셀 여백 수정 순서로 제작했다. 실제 프롬프트는 각 `*-update/prompts/`에 보관했다.
- 원래 실사 시트는 각 `*-update/input/previous-sheet.webp`에 보관했다.
- 제작용 PNG: 각 `*-update/output/character_expression_sheet.png`, 2560×960, 셀 512×960.
- 런타임 WebP: 각 `*-update/runtime-sheet.webp`, 2560×512, 셀 512×512. 모든 표정에 같은 크롭/여백/배율을 적용했다. 크롭 밖의 최대 alpha는 1이며 보이는 머리카락/눈물은 잘리지 않았다.
- 순서: neutral / happy / angry / surprised / crying. 게임의 sad 키는 crying에 연결했다.
- 구조 검사: 두 캐릭터 모두 실제 alpha, 셀 경계 통과. 생성 원본 폭이 5로 나누어떨어지지 않는 경고는 공통 배율로 규격을 정리했다.
- 수동 검토: 표정 순서, 목·몸 부재, 머리 모양과 눈높이, 얼굴 크기 및 기본 티셔츠·모자·안경·리본·해바라기 머리핀을 실제 렌더러에서 확인했다. 생성 모델의 픽셀 단위 동일성은 보장하지 않는다.

게임 적용: public/assets/characters/jiho.webp, nayeon.webp 및 public/core/character.js의 해당 RIGS.

브라우저 이미지 캐시가 이전 실사 시트를 유지하는 경우를 확인해 core/state.js의 프리셋 URL에 `v=anime-20261008`을 추가했다. 최종 5표정 및 의상·펫 화면은 jiho-nayeon-final-preview.png에 보관했다. 전체 `node --test`: 94 passed, 0 failed. `git diff --check` 통과.
