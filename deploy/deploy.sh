#!/usr/bin/env bash
# deploy.sh - GitHub main 에 새 커밋이 있으면 운영 서버를 그 커밋으로 바꿉니다.
# systemd 타이머(times-games-deploy.timer)가 1분마다 부릅니다. 손으로 불러도 됩니다.
#   1) origin/main 이 지금 커밋과 같으면 아무것도 하지 않습니다(기록도 남기지 않음).
#   2) 작업 폴더에 커밋 안 한 수정이 있으면 멈춥니다(서버에서 직접 고친 것을 덮어쓰지 않기 위해).
#   3) fast-forward 만 합니다(서버에만 있는 커밋이 있으면 멈춤).
#   4) 테스트가 통과해야 서비스를 다시 켭니다. 다시 켠 뒤 응답이 없으면 이전 커밋으로 되돌립니다.
# 멈춘 이유는 같은 이유가 이어지는 동안 한 번만 기록합니다. 기록: $LOG
set -euo pipefail

APP=/home/linuxuser/dev/jotanow/times-games
NODE=/home/linuxuser/.nvm/versions/node/v24.18.0/bin/node
SERVICE=times-games
URL=http://127.0.0.1:8010/
DATA=/home/linuxuser/data/times-games
LOG=$DATA/deploy.log
STATE=$DATA/deploy.last

cd "$APP"
export GIT_SSH_COMMAND="ssh -o BatchMode=yes"

log() { echo "$(date '+%F %T') $*" >> "$LOG"; echo "$*"; }
# 같은 멈춤 이유를 1분마다 다시 쓰지 않도록, 바뀌었을 때만 기록합니다.
note() { if [ "$(cat "$STATE" 2>/dev/null)" != "$1" ]; then echo "$1" > "$STATE"; log "$1"; fi; }

git fetch -q origin main
OLD=$(git rev-parse HEAD)
NEW=$(git rev-parse origin/main)
[ "$OLD" = "$NEW" ] && exit 0

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  note "stop ${NEW:0:7}: 서버 작업 폴더에 커밋 안 한 수정이 있습니다. 커밋·푸시하거나 되돌리면 배포됩니다."
  exit 1
fi
if ! git merge -q --ff-only origin/main; then
  note "stop ${NEW:0:7}: fast-forward 할 수 없습니다(서버에만 있는 커밋?)."
  exit 1
fi
rm -f "$STATE"
log "deploy ${OLD:0:7} -> ${NEW:0:7}"

rollback() {
  log "rollback to ${OLD:0:7}: $1"
  git reset -q --hard "$OLD"
  sudo -n systemctl restart "$SERVICE"
  note "stop ${NEW:0:7}: $1"
  exit 1
}

"$NODE" --test > "$DATA/deploy-test.log" 2>&1 || rollback "tests failed (자세히: $DATA/deploy-test.log)"

sudo -n systemctl restart "$SERVICE"
for _ in $(seq 1 15); do
  if curl -fsS -o /dev/null "$URL"; then log "deploy ok ${NEW:0:7}"; exit 0; fi
  sleep 1
done
rollback "service did not answer"
