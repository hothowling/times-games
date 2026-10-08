# 기본 흰 티셔츠 손 위치

내장 image_gen으로 기본 의상의 팔·손을 아래/바깥으로 내렸다. 왼손은 가슴 아래의 열린 손, 오른손은 허리 옆에서 연필을 드는 자세다. 목이나 새 의상은 추가하지 않았다. 생성 PNG를 투명 alpha를 유지하며256×256 WebP로 포장했다.

적용 파일: public/assets/wearables/outfits/11-white-tee.webp. BASE_OUTFIT에 새 캐시 버전을 붙였다. 이전 파일은 previous-white-tee.webp, 실제 프롬프트는 prompt.txt, 생성 원본은 generated.png에 보관했다.

수지·지호·나연·앤지 실제 렌더러에서 확인했다. 손 전체가 머리카락 아래/바깥으로 보이고 얼굴이 의상 앞에 오는 순서는 유지된다. 다른 의상 파일은 변경하지 않았다. 비교는 comparison.png, 최종은 final-preview.png다. 전체 게임 테스트95개 및 git diff --check 통과.
