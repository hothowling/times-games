# 노란 별 민소매 드레스와 입 장식 스낵

첨부 그림을 참고한 노란 별 민소매 드레스(25 Sparkles), 초코칩 쿠키(15), 빼빼로(15), 컵라면(20), 롤리팝(15)을2026-10-15 NEW 배치로 등록했다. 컵라면은 후속 요청에 따라 빨강·검정 신라면풍 컵과 젓가락이 면을 집어 올리는 디자인으로 수정했다.

이미지는 내장 image_gen으로 제작했다. 실제 요청은 `dress-prompt.md`, `cookie-prompt.md`, `pepero-prompt.md`, `noodles-prompt.md`, `lollipop-prompt.md`, `ramen-revision-prompt.md`에 보관했다. 최종 컵라면은 `generated/ramen-revised.png`이며 `noodles-original.png`는 채택하지 않은 초기 시안이다. 원본 PNG와 첨부 디자인은 이 디렉터리의 generated/input에 보관했다. Sharp는256×256 lossless WebP 형식 변환에만 사용했다. 최종 게임 이미지5개의 실제alpha와 보이는 경계는 `qa.json`에 기록했다.

독립된 mouth 슬롯을 추가해 안경·의상·펫과 함께 착용할 수 있다. 최초 입 주변 배치에서 사용자의 후속 요청에 따라 크기를 약1.75–2.27배 키웠다(쿠키100px, 빼빼로130px, 컵라면112px, 롤리팝108px). 얼굴 오른쪽 공간 배치를 검토한 뒤 최종 요청대로 공통 의상 좌표의 오른쪽 어깨 옆 중심(180,180)에 배치한다. 과거 mouthAnchor와 캐릭터별 입 위치 보정은 제거했다. 기존 장착 저장키mouth는 유지하며 상점 표시 이름은 스낵/Snacks이다. 머리·몸 배율과 기존 안경 배치는 유지한다.

검증: 구매 전 착용 거부, 다른 슬롯에 착용 거부, 스낵4종 구매·교체·저장·제거, 안경·의상 유지, 최종 에셋 HTTP 제공을 포함한 관련 테스트31개 통과. `git diff --check` 통과. 실제 상점에서5개 아이템의 NEW 표시와 미리보기를 확인했다. 실제 렌더러에서6개 프리셋의 쿠키 위치, 얼굴 전용 표시, 컵라면의5가지 표정, 쿠키+안경 동시 착용을 검토했다. 스낵 교체·제거 시 기존 안경이 유지되고 이미지가 정상 숨김 처리되는 것도 확인했다. 확인 화면은 `render-review.png`, `anchors-review.png`, `expressions-review.png`이다. 사용자 계정에서 구매나 착용 확정은 실행하지 않았다.

최종 어깨 배치의 확인 화면은 `snack-shoulder-review.png`,390px 실제 상점은 `snack-shoulder-mobile.png`이다. 이전 이미지들은 배치 조정 이력으로 보관했다. 최종 변경 후 JavaScript 구문 및diff 공백 검사를 통과했다.

사용자가 최종 좌표를 mouth-x180px / mouth-y180px로 지정해 반영했다. 이전 확인 이미지는 좌표 변경 전 이력이다.
