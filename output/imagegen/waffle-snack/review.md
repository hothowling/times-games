# 와플 스낵

첨부 사진의 두 장 겹친 원형 와플과 와플·버터의 작은 표정을 참고해 내장 image_gen으로 제작했다. 정확한 프롬프트는 `prompt.md`, 원본 생성물은 `generated/waffle.png`에 보관했다. Sharp는256×256 lossless WebP 크기·형식 변환에만 사용했다.

게임 파일: `public/assets/wearables/snacks/05-waffle.webp`. 아이템 IDwaffle, 이름와플/Waffle, 가격20 Sparkles, mouth 슬롯의 스낵으로 등록했다. renderW112이며 사용자가 지정한 공통 어깨 위치180px/180px를 따른다. 2026-10-17 신규 배치에 등록했다.

실제alpha0–255, 보이는 경계 `[16,33,243,224]`로 잘림이 없다. 관련 기존 카탈로그·의상 테스트4개와diff 공백 검사 통과. 실제 로컬 상점에서 NEW/20 표시, 미리보기,112px 크기와180px/180px 좌표를 확인했다. `shop-review.png`에 확인 화면을 저장했다. 구매 확정은 실행하지 않았다.
