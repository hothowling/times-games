#!/usr/bin/env bash
# build-assets.sh - 기존 4개 게임 폴더의 그림/소리를 public/assets 로 모읍니다(1회성, 다시 돌려도 됨).
# 그림은 WebP 로 바꾸고 너무 큰 것은 줄입니다. 필요: ffmpeg(libwebp).
set -euo pipefail
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public"
A="$OUT/assets"
CLASS="$SRC/times-class"

# webp <입력> <출력> [최대 가로 px] [품질]
webp() {
  local w="${3:-0}" q="${4:-85}" vf="format=yuva420p"
  [ "$w" != 0 ] && vf="scale='min($w,iw)':-2:flags=lanczos,$vf"
  mkdir -p "$(dirname "$2")"
  ffmpeg -loglevel error -y -i "$1" -vf "$vf" -c:v libwebp -quality "$q" "$2"
}

webp "$CLASS/_ref/charactor_sooji2.png" "$A/characters/sooji.webp"
webp "$CLASS/_ref/charactor_jiho.png" "$A/characters/jiho.webp"
webp "$CLASS/_ref/charactor_teacher.png" "$A/characters/teacher.webp" 640
webp "$CLASS/_ref/game_asset.png" "$A/bg/classroom.webp" 0 80

for f in "$CLASS"/assets/wearables/outfits/*.png; do webp "$f" "$A/wearables/outfits/$(basename "${f%.png}").webp"; done
for f in "$CLASS"/assets/wearables/hair-bows/*.png; do webp "$f" "$A/wearables/hair-bows/$(basename "${f%.png}").webp"; done
webp "$CLASS/assets/wearables/red-cap.png" "$A/wearables/red-cap.webp" 320
webp "$CLASS/assets/wearables/backpack.png" "$A/wearables/backpack.webp" 320
webp "$CLASS/assets/wearables/glasses.png" "$A/wearables/glasses.webp" 360

for f in "$CLASS"/assets/ui/*.png; do
  [ "$(basename "$f")" = blue-shirt.png ] && continue
  webp "$f" "$A/ui/$(basename "${f%.png}").webp"
done

mkdir -p "$A/thumbs" "$A/voice" "$OUT/vendor"
cp "$SRC"/thumbs/*.jpg "$A/thumbs/"
cp -r "$SRC/times-table-game/audio/ko" "$SRC/times-table-game/audio/en" "$A/voice/"
rm -rf "$OUT/vendor/mediapipe"
cp -r "$SRC/times-shooter/mediapipe" "$OUT/vendor/mediapipe"
echo "done: $(du -sh "$A" | cut -f1) assets"
