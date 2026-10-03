#!/usr/bin/env bash
# backup.sh - DB(실행 중에도 안전한 VACUUM INTO)와 사진 얼굴 파일을 $DATA_DIR/backup/<날짜>/ 에 복사하고 14일 지난 것은 지웁니다.
# crontab: 30 4 * * * /home/linuxuser/dev/jotanow/times-games/deploy/backup.sh >> /home/linuxuser/data/times-games/backup.log 2>&1
set -euo pipefail

NODE=/home/linuxuser/.nvm/versions/node/v24.18.0/bin/node
DATA="${DATA_DIR:-/home/linuxuser/data/times-games}"
DIR="$DATA/backup/$(date +%F)"
mkdir -p "$DIR"
rm -f "$DIR/games.db"
"$NODE" -e "new (require('node:sqlite').DatabaseSync)(process.argv[1]).exec(\"vacuum into '\" + process.argv[2] + \"'\")" "$DATA/games.db" "$DIR/games.db"
[ -d "$DATA/faces" ] && tar -C "$DATA" -czf "$DIR/faces.tgz" faces
find "$DATA/backup" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
echo "$(date '+%F %T') backup ok $DIR"
