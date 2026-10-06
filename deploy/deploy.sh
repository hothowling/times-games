#!/usr/bin/env bash
# deploy.sh - GitHub main 의 최신 커밋으로 운영 서버를 바꿉니다. GitHub Actions(.github/workflows/deploy.yml)가 SSH 로 부릅니다.
#   1) 작업 폴더에 커밋 안 한 수정이 있으면 멈춥니다(서버에서 직접 고친 것을 덮어쓰지 않기 위해).
#   2) origin/main 으로 fast-forward 만 합니다(서버에만 있는 커밋이 있으면 멈춤).
#   3) 테스트가 통과해야 서비스를 다시 켭니다. 다시 켠 뒤 응답이 없으면 이전 커밋으로 되돌립니다.
# 배포 전용 SSH 키는 authorized_keys 에서 command="…/deploy/deploy.sh" 로 묶어 이 스크립트만 실행할 수 있습니다(deploy/README.md).
set -euo pipefail

APP=/home/linuxuser/dev/jotanow/times-games
NODE=/home/linuxuser/.nvm/versions/node/v24.18.0/bin/node
SERVICE=times-games
URL=http://127.0.0.1:8010/
LOG=/home/linuxuser/data/times-games/deploy.log

exec > >(tee -a "$LOG") 2>&1
echo "== $(date '+%F %T') deploy start"
cd "$APP"
export GIT_SSH_COMMAND="ssh -o BatchMode=yes"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "stop: 서버 작업 폴더에 커밋 안 한 수정이 있습니다."
  git status --short --untracked-files=no
  exit 1
fi

git fetch -q origin main
OLD=$(git rev-parse HEAD)
NEW=$(git rev-parse origin/main)
if [ "$OLD" = "$NEW" ]; then echo "already at ${NEW:0:7}"; exit 0; fi
git merge -q --ff-only origin/main || { echo "stop: fast-forward 할 수 없습니다(서버에만 있는 커밋?)."; exit 1; }
echo "${OLD:0:7} -> ${NEW:0:7}"

rollback() {
  echo "rollback to ${OLD:0:7}: $1"
  git reset -q --hard "$OLD"
  sudo -n systemctl restart "$SERVICE"
  exit 1
}

"$NODE" --test >/tmp/times-games-test.log 2>&1 || { tail -30 /tmp/times-games-test.log; rollback "tests failed"; }

sudo -n systemctl restart "$SERVICE"
for i in $(seq 1 15); do
  if curl -fsS -o /dev/null "$URL"; then echo "== deploy ok ${NEW:0:7}"; exit 0; fi
  sleep 1
done
rollback "service did not answer"
