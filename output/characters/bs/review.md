# BS 캐릭터 적용

game-character-sheet 프로젝트 스킬과 내장 image_gen 사용. 사용자가 승인한 작은 아몬드형 눈의 neutral-master.png를 기준으로 5개 표정을 만들었다. 원본 사진은 정체성, 수지 시트는 그림체 참고이며 승인 마스터의 성인 얼굴과 작은 눈을 유지하도록 요청했다. 생성 원본과 실제 프롬프트는 generated/, prompts/에 보관했다. 원본 사진은 공개 에셋에 복사하지 않았다.

제작 PNG: output/character_expression_sheet.png (2560×960). 공통 패딩 옵션으로 5칸에 같은 배율/여백을 적용했다. 구조 검사 오류0; 생성 원본 폭이5로 나누어떨어지지 않는 경고만 있으며 동일 셀 포맷으로 정리했다. 머리카락/턱/눈높이/표정 순서는 수동 검토했다.

런타임: public/assets/characters/bs.webp (2560×512). 모든 표정에 같은 정사각형 크롭/리사이즈를 적용했다. 크롭 밖 최대alpha1이며 보이는 내용은 잘리지 않았다. 순서neutral/happy/angry/surprised/sad, sad는 crying에 연결했다.

landmarks.json의 수동 눈·피부 턱끝 좌표와 승인 수지의 눈–턱 거리75.88px/턱높이171.93px를 기준으로 RIGS를 계산했다. BS의 눈 간격은 기준보다 약12% 좁다는 보조 경고가 있으며, 승인된 성인 얼굴 비율과 작은 눈을 유지하기 위해 독립 축 변형 없이 채택했다. 눈 midpoint는 몸 중심에 맞추고 기존 공통 오른쪽6px 이동도 그대로 적용한다. 얼굴 이미지가 상체 앞에 오는 순서를 유지했다.

PRESETS와 한국어/영어 이름에 bs / BS를 추가했다. 실제 렌더러에서 다섯 표정과 교복·후드·스트롱보이·모자·안경을 확인했다. 전체 node --test:96 passed,0 failed. 최종 미리보기 final-preview.png. 커밋·푸시는 하지 않았다.
