# 배포

운영: `icsoft-vultr` 의 `~/dev/jotanow/times-games`, systemd `times-games.service`(port 8010, nginx `ics.jotanow.site/games`).

## 자동 배포 (main 푸시)

서버의 systemd 타이머 `times-games-deploy.timer` 가 1분마다 `deploy/deploy.sh` 를 실행합니다.
GitHub 에서 서버로 들어오는 접속은 없습니다(Vultr 방화벽이 SSH 를 막고 있어 서버가 가져가는 방식).

`deploy.sh` 순서: `git fetch` → 새 커밋이 없으면 끝 → `origin/main` 으로 fast-forward → 서버에서 `node --test`
→ `systemctl restart times-games` → 응답 확인. 테스트나 응답이 실패하면 이전 커밋으로 되돌리고 다시 켭니다.
기록: `~/data/times-games/deploy.log` (테스트 출력은 `deploy-test.log`).

멈추는 경우(같은 이유는 한 번만 기록):
- 서버 작업 폴더에 커밋 안 한 수정이 있을 때. 서버에서 고친 것은 커밋·푸시하면 그다음부터 배포됩니다.
- 서버에만 있는 커밋이 있어 fast-forward 할 수 없을 때.

GitHub Actions(`.github/workflows/test.yml`)는 푸시와 PR 마다 테스트만 돌립니다.

확인: `systemctl list-timers times-games-deploy.timer`, `tail ~/data/times-games/deploy.log`
지금 바로: `sudo systemctl start times-games-deploy` 또는 `deploy/deploy.sh`

## 처음 설치

- 서비스: `sudo cp deploy/times-games.service /etc/systemd/system/ && sudo systemctl enable --now times-games`
- nginx: `deploy/nginx-games.conf`
- 자동 배포: `sudo cp deploy/times-games-deploy.{service,timer} /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now times-games-deploy.timer`
- 백업: crontab `30 4 * * * …/deploy/backup.sh`
