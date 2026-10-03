# 미니게임 만들기

새 게임을 추가하려면 세 가지를 하면 됩니다.

1. `games/<id>/` 폴더를 만듭니다.
2. `games/index.js`에 한 줄을 추가합니다(제목, 설명, 썸네일).
3. `core/catalog.js`의 `GAMES`에 id를 넣습니다. 서버는 여기에 있는 게임의 결과만 받습니다.

## 폴더 구성
```
games/<id>/
  index.js     export const dict = { ko: {...}, en: {...} }    // 게임 문구 (선택)
               export function mount(el, ctx) { ...; return { destroy() {} } }
  game.css     모든 선택자를 .game-<id> 아래에 씁니다. :root, body, html 은 건드리지 않습니다.
  rules.js     DOM 없는 순수 로직. tests/<id>.test.js 에서 node:test 로 검사합니다.
```
- `el`은 `<div class="game game-<id>">`입니다. 게임 중에는 상단 바가 숨겨집니다. 게임이 화면 전체(최소 `100dvh`)를 씁니다.
- 플랫폼 `core/ui.css`의 전역 클래스(`.btn`, `.btn-sub`, `.icon-btn`, `.topbar`, `.sheet`, `.tab` 등)와 같은 이름은 게임 안에서 쓰지 않습니다. 그 스타일이 섞여 들어옵니다. 게임 클래스에는 짧은 접두어를 붙이세요(예: `.m-btn`).
- `destroy()`는 로비로 나갈 때 불립니다. 이때 타이머, `requestAnimationFrame`, `document`/`window` 리스너를 모두 정리해야 합니다.
- 그림·소리 경로는 `index.html` 기준입니다(`assets/ui/sparkle.webp` 등). 게임 전용 에셋은 `assets/games/<id>/`에 둡니다.

## ctx (플랫폼이 넘겨주는 것)
| | |
|---|---|
| `ctx.lang`, `ctx.t(key, vars)`, `ctx.apply(root)` | 현재 언어(`'ko'`/`'en'`)와 문구. `apply`는 `data-i18n`, `data-i18n-html`, `data-i18n-aria`를 채웁니다. 언어 전환은 로비 설정에서만 합니다. |
| `ctx.audio` | `core/audio.js`의 `audio` 객체입니다. 효과음은 `correct()`, `wrong()`, `timeout()`, `fanfare()`, `starPop()`, `nextFx()`, `keyTap()`, `tone({freq,to,dur,type,gain,at})`, 숫자 읽기는 `playNumbers(lang, [a,b,c], {delay})`, 그 밖에 `getSound()`, `getTts()`, `context()`가 있습니다. 직접 소리를 만들 때는 `context()`의 AudioContext 하나만 쓰고, `getSound()`가 false면 소리를 내지 않습니다. |
| `ctx.setSound(on)` | 게임 안의 소리 버튼용입니다. 설정에도 저장됩니다. |
| `ctx.character(el, { body })` | 현재 캐릭터를 그립니다. 크기는 `el`의 CSS `width`로 정합니다. `body: false`면 얼굴만 그립니다. 돌려받은 객체로 `.react('correct'\|'wrong'\|'timeout'\|'clear'\|'fail'\|'idle')`, `.expression('neutral'\|'happy'\|'angry'\|'surprised'\|'sad')`를 씁니다. |
| `ctx.characterName`, `ctx.look` | 캐릭터 이름과 모양 정보입니다. |
| `ctx.progress`, `ctx.saveProgress(data)` | 게임별 진행도(JSON, 32KB 이하)입니다. 처음이면 `null`이고, 서버에 저장됩니다. |
| `ctx.items.count(name)`, `await ctx.items.use(name)` | 이 게임의 소모품(`catalog.js`의 `ITEMS['<id>.<name>']`)입니다. `use`는 성공하면 true를 돌려줍니다. |
| `await ctx.finish({ stars, score, detail })` | 한 판(라운드)이 끝날 때 한 번 부릅니다. `stars`는 0~3 정수입니다. 서버가 Sparkles를 1/3/6/10만큼 주고, 플랫폼이 토스트를 띄웁니다. 돌려받는 값은 `{ earned, sparkles }`입니다. |
| `ctx.sparkles()` | 현재 Sparkles 잔액입니다. |
| `ctx.openShop()`, `ctx.exit()` | 상점(이 게임의 아이템 탭)이나 로비로 갑니다. |

게임은 localStorage, fetch, `location`을 직접 쓰지 않습니다. 필요한 것은 모두 ctx에 있습니다.
