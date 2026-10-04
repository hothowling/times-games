# times-games 통합 계획

4개 구구단 게임(마스터·블록·슈터·교실)을 **하나의 모바일 웹게임 플랫폼**으로 합친다.
캐릭터·상점·화폐·기록은 플랫폼이 공통으로 맡고, 각 게임은 "미니게임 플러그인"으로 들어간다.

> 상태: 0~4단계 완료(2026-10-03). https://ics.jotanow.site/games/ 에서 운영 중. 5단계(옛 주소 정리)는 아직.
> 개발 실행: `npm start`(http://127.0.0.1:8010/, 데이터는 ./data), 테스트: `npm test`.

### 운영 (4단계)
- 서비스: `times-games.service`(systemd, `deploy/times-games.service`). `sudo systemctl restart times-games`로 다시 띄운다.
- nginx: `/games/` → 127.0.0.1:8010(`deploy/nginx-games.conf`). `/times-games/`는 404로 막는다. 루트 페이지 서버(8000)가 `~/dev/jotanow` 전체를 공개하기 때문이다.
- 데이터: `/home/linuxuser/data/times-games/`(DB + 사진 얼굴, 공개 폴더 밖, 700 권한).
- 백업: 매일 04:30 cron으로 `deploy/backup.sh`를 돌려 `…/data/times-games/backup/<날짜>/`에 저장하고, 14일이 지난 백업은 지운다.
- 관리자: https://ics.jotanow.site/games/admin/ (`server/admin.js`, `admin.html`). 아이디는 아무거나 쓰고 비밀번호는 `/home/linuxuser/data/times-games/admin.env`의 `ADMIN_PASSWORD`이다. 비밀번호를 바꾸면 서비스를 재시작한다. 볼 수 있는 것은 요약, 14일 플레이, 유저 목록과 상세(플레이·Sparkles 내역·아이템·진행도)이고, 할 수 있는 것은 PIN 재설정뿐이다. 사진 얼굴은 관리자에게도 보이지 않는다. 같은 IP에서 10번 틀리면 10분 동안 막힌다.
- 코드를 고친 뒤: 정적 파일(public/)은 바로 반영된다(no-cache). 서버 코드(server/, core/catalog.js)를 고쳤으면 서비스를 재시작한다.

---

## 1. 현황 분석

| | 구구단 마스터 (`/tt`) | 블록 (`/ttblock`) | 슈터 (`/ttshooter`) | 교실 (`/ttclass`) |
|---|---|---|---|---|
| 코드 | ES5 IIFE, `window.TT` | ES5 IIFE, `window.TT` (충돌) | ES5 IIFE, `window.TS` | ES2020 IIFE 1파일(825줄) |
| 저장 | `tt.*` localStorage (일별 포인트) | `tb.*` (레벨만) | `ts.*` + IndexedDB `ts-chars` | `classroom-sparkles-v1` 1개 키 |
| 캐릭터 | 실사 여아 얼굴 2장(무표정/웃음) + CSS 애니 | 마스터와 **완전 동일 파일** | 지호 얼굴 3프레임 + **사진으로 캐릭터 만들기**(MediaPipe) | 수지/지호 얼굴 5프레임 + 레이어 옷/모자/안경/가방 |
| 화폐/상점 | 없음 (일별 포인트만) | 없음 | 없음 (최고점만) | **Sparkles + 상점**(소모품 4종, 꾸미기 18종), 캐릭터별 지갑 |
| i18n | ko/en 자체 엔진 | 같은 엔진 fork | ko/en 별도 구현 | ko/en 별도 구현 |
| 소리 | WebAudio 효과음 + 숫자 음성 `.ogg` 72개 | 마스터와 **동일** | WebAudio 효과음 | WebAudio 효과음 |
| 테스트 | `node --test` (rules) | `node --test` (puzzle) | `node test.js` | 없음 |

공통 사실
- 4개 모두 빌드 도구·의존성 없는 순수 HTML/CSS/JS. 서버는 nginx → 포트별 `python3 -m http.server`(8000~8004). 서버 쪽 코드는 없다.
- 사용자 기록은 전부 브라우저 localStorage에만 있다. 기기를 바꾸면 사라진다.
- 같은 기능을 4번 구현했다: i18n, 효과음, 캐릭터 표현, 저장, 화면 전환, 설정(소리·언어) 토글.

캐릭터/에셋 문제
- 같은 인물이 게임마다 다른 파일로 있다.
  - 수지: 마스터·블록의 `neutral/smile.png`(2표정) ↔ 교실의 `charactor_sooji2.png`(5표정)
  - 지호: 슈터의 `hero.webp`(3표정) ↔ 교실의 `charactor_jiho.png`(5표정)
- 표정 개수가 다르다(2/3/5). 표정 이름도 다르다(smile/frown vs happy/angry/surprised/sad).
- 교실은 실행 중에 `_ref/` 원본(1.4~2.2MB PNG)을 그대로 읽는다. 안경·모자·가방 PNG는 1254~1774px로 너무 크다(각 300~670KB).
- 쓰지 않는 파일: `face-jiho-3.png`(1.8MB), `_ref/game_sine.png`, `_ref/charactor_sooji.png`, `assets/ui/blue-shirt.png`.
- 옷 착용 위치를 캐릭터마다 CSS 변수로 손으로 맞췄다. 캐릭터가 늘면 CSS를 계속 고쳐야 한다.
- MediaPipe는 디스크 27MB, 실제 다운로드는 gzip 기준 약 7MB이다. 캐릭터 만들기 화면에서만 lazy load하므로 유지한다.

---

## 2. 목표 구조

```
[로그인] → [캐릭터 선택/만들기] → [로비: 게임 목록 · 지갑 · 상점 · 기록]
                                        │
                     ┌──────────┬───────┴──┬──────────┐
                  master     blocks     shooter   classroom   ← 미니게임 플러그인
                     └──────────┴─────┬────┴──────────┘
                          ctx (공통 API: 캐릭터, 효과음, i18n, 결과 보고)
                                       │
                               Node 서버 /api  →  SQLite
```

### 2.1 기술 스택 (결정: Q1)
- 프런트는 빌드 없는 **ES modules(JavaScript)**, 서버는 **Node 24 + 표준 모듈만**(`node:http`, `node:sqlite`, `node:crypto`), 테스트는 `node --test`.
  - 지금 4개 게임이 모두 빌드 없는 JS이다. 그래서 포팅할 때 IIFE를 `export`로 바꾸는 정도로 끝난다.
  - npm 의존성이 0개가 된다. 서버에 이미 Node 24가 있다.
- DB 기본값은 SQLite 파일 1개(`data/games.db`)이다. 백업은 파일 복사로 끝난다. MySQL이 이미 돌고 있지만 아이 게임 규모에서는 SQLite로 충분하다. 필요해지면 그때 옮긴다.
- Node가 API와 정적 파일을 모두 서빙하고, nginx는 앞에서 proxy·gzip·TLS만 맡는다.

### 2.2 폴더 구조 (구현됨)
```
times-games/
  PLAN.md
  package.json            "type": "module", scripts: start / dev / test
  server/
    index.js              실행 (PORT=8010, DATA_DIR=./data)
    app.js                /api 라우팅 + 정적 서빙
    db.js                 스키마
  scripts/build-assets.sh 기존 4개 게임 폴더 → public/assets (WebP 변환, 1회성)
  tests/                  server · maker · 게임별 rules 테스트 (node --test)
  data/                   games.db + faces/ (git 제외, 공개 폴더 밖)
  public/
    index.html            앱 셸 (hash 라우팅: #/login #/lobby #/chars #/shop #/records #/play/<id>)
    core/
      app.js              라우터, 상단 바, 설정, 게임 실행(ctx)
      api.js state.js dom.js i18n.js
      audio.js            효과음 + 숫자 음성 (마스터 audio.js를 ES module로)
      character.js/.css   캐릭터 렌더러 (표정 5칸 + 착용 레이어 + 마스코트 애니메이션, 착용 위치 RIGS)
      maker.js            사진 → 캐릭터 (MediaPipe lazy)
      catalog.js          상점 품목·가격·보상 (서버도 이 파일을 import)
      ui.css
    screens/              login / lobby / chars / shop / records
    games/
      README.md           게임 추가 방법과 ctx 설명
      index.js            게임 목록
      master/  blocks/  shooter/  classroom/   (index.js, game.css, rules.js)
    assets/               characters/ wearables/ ui/ bg/ thumbs/ voice/
    vendor/mediapipe/
```
- 배포는 nginx `location /games/`를 Node(8010)로 통째로 proxy한다. Node가 정적 파일도 `Last-Modified`/304로 서빙한다. 주소가 모두 상대 경로라 `/games/` 아래에서도 그대로 동작한다.

### 2.3 미니게임 계약 (새 게임 추가 = 폴더 1개 + 목록 1줄)
```js
// games/<id>/index.js
export default {
  mount(el, ctx) { /* 게임 시작 */ return { destroy() {} } }
}

// 플랫폼이 넘겨주는 ctx
ctx = {
  lang, t,                       // 공통 i18n (게임 사전 병합)
  audio,                         // 효과음 + 숫자 음성
  character(el),                 // 현재 캐릭터 렌더 → .react('correct'|'wrong'|'timeout'|'clear')
  progress, saveProgress(obj),   // 게임별 진행도 (레벨, 라운드, 하트 등) 서버 저장
  items,                         // 이 게임용 소모품 보유량 / use(id)
  finish(result),                // { stars: 0~3, score, detail } → 서버가 Sparkles 지급, 결과 반환
  exit(),                        // 로비로
}
```

### 2.4 캐릭터·에셋 통합
- **표준 얼굴 = 5표정 가로 스트립**(`neutral, happy, angry, surprised, sad`). 프레임은 400×400, 형식은 WebP이다.
  - 수지·지호는 교실의 5프레임 원본에서 만든다. 마스터·블록의 2장과 슈터의 `hero.webp`는 폐기한다.
  - 사진 캐릭터는 3장을 찍는다(무표정·웃음·찡그림). 그래서 `surprised→neutral`, `sad→angry`로 채운다(기본값).
- **게임 이벤트 → 표정 매핑**은 플랫폼이 한 곳에서 정한다: correct→happy, wrong→surprised, timeout→sad, clear→happy(+점프), fail→sad.
  애니메이션(숨쉬기·흔들기·점프·반짝이)은 마스터의 `mascot.js`/CSS를 그대로 쓴다.
- **착용 위치는 캐릭터별 CSS가 아니라 `core/character.js`의 `RIGS` 표에 둔다**(얼굴 칸, 머리 장식, 안경, 가방, 옷 기준점). 사진 캐릭터는 기본 rig를 공유한다(MediaPipe가 이미 얼굴을 400px 프레임 중앙에 맞춰 놓기 때문).
- 착용 슬롯은 교실 방식을 그대로 쓴다: `outfit`(필수), `head`, `face`, `back`.
- 에셋은 모두 리사이즈한 뒤 WebP로 바꾼다. 착용품은 256px, 배경은 1280px 이하로 줄인다. 1회성 변환 스크립트를 `scripts/`에 둔다. macOS `sips` 대신 Linux에서 도는 도구를 쓴다.
- 쓰지 않는 원본(`_ref/`, `face-jiho-3.png`)은 새 프로젝트로 가져오지 않는다.

### 2.5 화폐·상점
- **화폐는 Sparkles 하나**이다. 모든 게임 결과는 `stars 0~3`로 보고한다. 서버는 이를 **1 / 3 / 6 / 10** Sparkles로 바꾼다(교실의 F/C/B/A+ 보상과 같다).
  - 마스터: 기존 라운드 별점을 그대로 쓴다.
  - 블록: 기존 별점(1~3)을 그대로 쓴다.
  - 교실: 등급을 별로 바꾼다(F0 C1 B2 A+3).
  - 슈터: 라운드 클리어 여부와 남은 하트로 별을 정한다(포팅할 때 규칙을 새로 정한다).
- 지급은 **서버가 계산**한다. 클라이언트가 숫자를 보내 잔액을 바꾸는 API는 두지 않는다. 같은 게임 결과는 짧은 간격 안에 다시 보내도 1회만 인정한다(라운드 id 사용).
- 상점 탭은 **꾸미기(공통)**와 **아이템(게임별 소모품)**으로 나눈다. 교실의 힌트 아이템 4종은 `game: 'classroom'` 소모품으로 옮긴다.
- 품목 정의(`core/catalog.js`)는 지금 교실의 `ITEM_DATA`/`SKIN_DATA`를 옮겨 온다. 레거시 키(`pink`=모자, `scientist`=안경, `hero`=가방)는 이번에 정리한다.

### 2.6 서버 데이터 (SQLite)
```
users        id, nickname(UNIQUE), pin_hash, sparkles, settings(json: lang, sound, tts), created_at
sessions     token_hash, user_id, expires_at
characters   id, user_id, base('photo'), name, equipped(json), created_at   -- 사진 캐릭터만 행으로 저장
looks        user_id, character_key('sooji'|'jiho'|<photo id>), equipped(json)  -- 캐릭터별 착용 상태
inventory    user_id, item_id, qty                 -- 꾸미기 qty=1, 소모품 qty=n
progress     user_id, game_id, data(json)          -- 레벨, 라운드, 하트, 복습 문제 등
plays        id, user_id, character_id, game_id, round_key, stars, score, detail(json), sparkles, created_at
sparkle_log  id, user_id, delta, reason, ref_id, created_at   -- 지급/구매 내역 (잔액 오류 추적용)
```
- 일별 기록 화면(마스터의 14일 기록, 교실의 daily)은 `plays`를 날짜로 묶어서 보여 준다. 별도 테이블은 두지 않는다.
- 수지/지호 프리셋은 모든 계정에 항상 보인다(DB 행 없음, 코드 상수).
- **사진 얼굴 이미지는 `data/faces/<id>.webp`**(공개 폴더 밖)에 둔다. `GET /api/characters/:id/face`로만 내려주며, 서버가 `user_id`가 본인인지 확인한다. 응답은 `Cache-Control: private`. 다른 사용자에게는 절대 노출하지 않는다(랭킹·친구 기능이 생겨도 프리셋 얼굴로 대체).
- 원본 사진은 기기 밖으로 보내지 않는다. 업로드하는 것은 배경을 지운 얼굴 스프라이트(1200×400 WebP)뿐이다. 만들 때 보호자 동의 체크를 받는다. 캐릭터를 삭제하면 파일도 지운다. 업로드 크기와 형식은 서버에서 검사한다(WebP/PNG, 3MB 이하 — Safari 는 PNG 로 올라옴).
- 세션은 HttpOnly + Secure + SameSite=Lax 쿠키로 한다. 비밀번호/PIN은 `crypto.scrypt`로 해시한다. 로그인 시도 횟수는 제한한다.

API (약 12개)
```
POST /api/login · /api/logout · GET /api/me
GET/POST/PATCH/DELETE /api/characters · GET /api/characters/:id/face (본인만)
POST /api/shop/buy · POST /api/equip · POST /api/items/use
GET/PUT /api/progress/:game
POST /api/plays            → { sparkles 지급액, 잔액 }
GET  /api/records?days=14
```

---

## 3. 진행 단계

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| 0. 뼈대 | `package.json`, 서버(로그인·세션·DB), 앱 셸, hash 라우터, 공통 `ui.css` | 로그인 후 빈 로비가 뜬다 |
| 1. 공통 모듈 | `i18n`, `audio`, `character`(표정+애니+레이어), 에셋 변환 스크립트 실행 | 로비에서 수지/지호가 표정을 바꾸며 움직인다 |
| 2. 메타 화면 | 캐릭터 선택·만들기(사진), 상점(꾸미기/아이템), 지갑, 기록 | 구매·착용이 서버에 저장되고 다른 기기에서도 보인다 |
| 3. 게임 이식 | 블록 → 마스터 → 교실 → 슈터 순서로 하나씩 이식 (순수 로직 + 테스트 먼저, 그다음 화면) | 4개 게임이 `ctx.finish()`로 Sparkles를 받는다 |
| 4. 배포 | nginx에 새 경로 추가, systemd(또는 pm2)로 Node 실행, DB 백업 cron | 실서버에서 플레이된다 |
| 5. 정리 | 기존 4개 게임 경로 → 새 게임으로 리다이렉트, python 서버 종료 | 옛 URL로 들어와도 새 게임이 열린다 |

이식 순서의 이유
- 블록: 로직(`puzzle.js`)이 가장 순수하고 저장할 것이 레벨뿐이다. 그래서 계약(`ctx`)을 검증하기 좋다.
- 마스터: 음성과 마스코트의 원본이다.
- 교실: 상점·아이템과 맞물리는 부분이 가장 크다.
- 슈터: 캐릭터 만들기가 2단계에서 이미 플랫폼으로 옮겨 가므로, 남는 것은 게임 루프뿐이다.

---

## 4. 기본값으로 진행할 항목 (다르게 원하면 말해 주세요)
- 기존 localStorage 기록은 **이관하지 않고** 새로 시작한다.
- 화면 언어는 **한국어/영어 2개를 유지**한다. 교실의 영어 전용 아이템 이름도 번역한다.
- 서버 연결이 끊기면 플레이는 계속할 수 있다. 다만 결과 저장·구매는 재연결 후에 가능하다. 오프라인 큐와 Service Worker는 나중에 필요할 때 추가한다.
- 기존 4개 URL은 새 게임이 완성될 때까지 그대로 둔다.
- 새 게임 주소는 `https://ics.jotanow.site/games/`로 한다. 완성 후 루트(`/`)로 옮길지는 그때 정한다.

## 5. 결정 사항 (2026-10-03)
- Q1 기술 스택: **빌드 없는 JS**(ES modules) + Node 24 표준 모듈 + SQLite(`node:sqlite`).
- Q2 로그인: **닉네임 + 4자리 PIN**. 닉네임은 중복 불가. PIN은 4자리라 추측하기 쉽다. 그래서 서버가 닉네임별로 연속 실패 5회 후 일정 시간 잠근다. PIN 분실 시 재설정은 관리자가 수동으로 한다(보호자 기능은 나중에 추가).
- Q3 사진 캐릭터: **얼굴 스프라이트만 서버에 저장하고 본인에게만 보인다.** 수지/지호 프리셋은 항상 보인다(2.6 참고).
- Q4 지갑·꾸미기: **계정 하나에 공유**한다. 착용 상태만 캐릭터별로 저장한다.

---

## 6. 랭킹 (2026-10-03 구현·배포)

결정
- 전체 랭킹 기준은 **기간 안에 받은 별 합계**다. 4개 게임이 모두 0~3별이라 공평하고, 연습량이 곧 순위가 된다.
- 기간은 **주간**(월요일 0시 KST 초기화)을 기본으로 하고, 탭으로 **명예의 전당**(전체 기간)을 둔다.
- 아바타는 **수지/지호 얼굴에 그 캐릭터의 옷·장식**을 입힌다. 사진 캐릭터 얼굴은 남에게 보이지 않는다.
  - 사진 캐릭터를 쓰는 사람은 마지막으로 고른 프리셋(`settings.rankFace`, 기본 수지) 얼굴에 사진 캐릭터의 옷을 입힌다. 따로 고르는 화면은 두지 않는다.
- 참여는 **자동**이고, 설정의 "랭킹에서 내 이름 숨기기"(`settings.rankHidden`)를 켜면 목록에서 빠진다. 내 순위는 나에게만 계속 보인다.

보드
| 보드 | 값 | 출처 |
|---|---|---|
| 전체 | 별 합계 | `sum(plays.stars)` |
| 마스터 | 한 라운드 최고 점수 | `max(score)` |
| 땅따먹기 | 최고 레벨 | `max(score)`(score = level) |
| 슈터 | 최고 점수 | `max(score)` |
| 교실 | 최고 라운드 | `max(json_extract(detail, '$.round'))` |

- 새 테이블은 없다. `plays`를 집계해서 만든다.
- 같은 값이면 같은 순위다(1, 1, 3). 목록은 20위까지 보여 주고, 내 순위는 따로 돌려준다.

API
- `GET /api/ranking?board=all|master|blocks|shooter|classroom&period=week|all`
  → `{ top: [{ rank, nickname, value, me, look: { face: 'sooji'|'jiho', equipped } }], me: { rank, value } }`
- `POST /api/plays` 응답에 `weekRank`(이번 주 전체 순위)를 더한다. 결과 토스트를 "+6 Sparkles! · 이번 주 3위"로 바꾼다.

화면
- 로비에 "랭킹" 버튼을 추가한다(4칸).
- `#/ranking`: 맨 위에 주간/명예의 전당 토글, 그 아래 보드 탭(전체 + 게임 4개)을 둔다.
  - 1~3위는 단상 위에 전신 캐릭터로 세운다.
  - 4~20위는 목록(얼굴, 닉네임, 값)으로 보여 준다.
  - 맨 아래에 내 순위를 고정한다. 20위 밖이거나 숨김 상태여도 보인다.
- 설정 시트에 "랭킹에서 내 이름 숨기기" 토글을 추가한다.

나중에 (지금은 안 함)
- 관리자 페이지에서 이상한 점수 숨기기: 점수는 클라이언트가 보내는 값이라 조작될 수 있다. 문제가 보이면 추가한다.
- 닉네임 금칙어, 닉네임 변경.
- 주간 1~3위 보상(왕관 장식, Sparkles 지급).

## 7. 아이템과 랜덤박스 (2026-10-04)
- 아이템은 모든 게임이 같이 쓰는 5종(`core/catalog.js` ITEMS). 어느 게임이 무엇을 쓰는지는 `games/index.js`의 `items`, 효과는 게임마다 다름.

  | id | 가격 | 교실 | 땅따먹기 | 마스터 | 슈터 | 수도 |
  |---|---|---|---|---|---|---|
  | `hint` 힌트 전구 | 15 | 풀이 설명 | 다음 땅 | 첫 자리 숫자 | - | 수도 첫 글자 |
  | `eraser` 오답 지우기 | 10 | 오답 2개 | - | - | - | 오답 2개 |
  | `time` 모래시계 | 15 | - | - | 이번 문제 +5초 | 10초 동안 절반 속도 | 이번 문제 시간 멈춤 |
  | `shield` 보호막 | 20 | 틀린 1개 보호 | - | - | 하트 +1 | 틀린 1개 보호 |
  | `pill` 정답 알약 | 30 | 정답 보기 | - | 정답 보기 | - | 정답 보기 |

- 게임 중에 없으면 그 자리에서 사서 바로 씀(`POST api/items/use {buy:true}`). 상점으로 나가지 않음.
- 정답 알약을 쓴 판은 별 최대 2개(플랫폼 `ctx.finish`). 쓴 아이템은 `plays.detail.items`에 남음.
- 예전 게임별 아이템(`classroom.*`, `blocks.hint`)은 서버 시작 때 새 id로 옮김(`server/db.js` migrateItems).
- 랜덤박스(15 Sparkles): 결과는 서버가 정함(`pickPrize`). 매일(KST) 처음 접속하면 상자 하나(`settings.dailyBox`).
