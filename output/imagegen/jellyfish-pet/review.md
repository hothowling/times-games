# 해파리 · 얼룩말 펫 추가

귀여운 해파리 펫 요청과 앞서 대기 중이던 얼룩말 펫 요청을 함께 완료했다. 두 펫 모두 pet 슬롯,25 Sparkles,2026-10-13 NEW 배치로 등록했다. 영어 이름은 Jellyfish Pet / Zebra Pet이다.

내장 image_gen으로 기존 여우 펫의 게임 스타일을 참고해 생성했다. 해파리는 하늘색 둥근 몸통과 분홍·보라색 촉수, 얼룩말은 흑백 줄무늬와 짧은 다리·갈기를 가진 작은 동물로 만들었다. 실제 프롬프트는 `prompt.md`와 `../zebra-minion-pets/zebra-prompt.md`이다. 원본 생성 PNG는 각각 로컬 generated 디렉터리에 보관했다.

게임 에셋은 `public/assets/wearables/pets/15-jellyfish.webp`와 `14-zebra.webp`이다. Sharp는256×256 lossless WebP 형식 변환에만 사용했다. 실제 alpha0–255와 잘리지 않은 경계를 검사했고 수치는 `qa.json`에 보관했다.

실제 로컬 상점에서 두 펫의 NEW 표시와25 Sparkles 가격을 확인하고 각각 눌러 미리보기를 확인했다. 실제 캐릭터 렌더러에서 만두 옆에 두 펫이 정상적으로 배치됨을 확인했다. `render-review.png`에 확인 화면을 저장했다. 사용자 계정의 구매나 착용 확정은 실행하지 않았다. 기존 서버·카탈로그·의상 테스트27개 및 `git diff --check` 통과.
