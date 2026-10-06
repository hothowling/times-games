# 배포

운영: `icsoft-vultr` 의 `~/dev/jotanow/times-games`, systemd `times-games.service`(port 8010, nginx `ics.jotanow.site/games`).

## 자동 배포 (main 푸시)

1. GitHub Actions `.github/workflows/deploy.yml` 이 `node --test` 를 돌립니다.
2. 통과하면 배포 키로 서버에 SSH 접속합니다. 서버 `~/.ssh/authorized_keys` 에서 이 키는
   `restrict,command="/home/linuxuser/dev/jotanow/times-games/deploy/deploy.sh"` 로 묶여 있어 그 스크립트만 실행됩니다.
3. `deploy/deploy.sh` 가 `origin/main` 으로 fast-forward, 서버에서 다시 테스트, `systemctl restart`, 응답 확인을 합니다.
   실패하면 이전 커밋으로 되돌리고 다시 켭니다. 기록: `~/data/times-games/deploy.log`.

멈추는 경우(배포 실패로 표시됨):
- 서버 작업 폴더에 커밋 안 한 수정이 있을 때. 서버에서 고친 것은 커밋·푸시하고 나서 배포됩니다.
- 서버에만 있는 커밋이 있어 fast-forward 할 수 없을 때.

저장소 Secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`(배포 전용 ed25519 개인키), `DEPLOY_KNOWN_HOSTS`(서버 호스트 키).
키를 바꾸려면 새 키를 만들어 authorized_keys 의 `github-actions-deploy times-games` 줄을 바꾸고 `DEPLOY_SSH_KEY` 를 다시 등록합니다.

수동 배포: 서버에서 `deploy/deploy.sh`, 또는 Actions 탭에서 deploy 워크플로 `Run workflow`.

## 처음 설치

- 서비스: `sudo cp deploy/times-games.service /etc/systemd/system/ && sudo systemctl enable --now times-games`
- nginx: `deploy/nginx-games.conf`
- 백업: crontab `30 4 * * * …/deploy/backup.sh`
