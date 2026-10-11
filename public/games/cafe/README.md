# Pet Pizza Café

Run a small café for six animal guests. Read an English order, tap equal pizza
slices, choose a topping, and give the correct peso change. There is no countdown
or loss of lives. A finished day is a natural stopping point; starting another
day is optional.

## Café interface

The illustrated welcome scene and the order clipboard, oven and register props
are generated with the built-in ImageGen tool. Project assets and their complete
prompts are in `public/assets/games/cafe/`; the PNG prop atlas preserves alpha.
The interactive pizza remains SVG so each exact fraction is selectable with a
tap, Enter or Space. Brown divider lines show equal slices, and selected slices
have a green outline.

Three illustrated steps connect taking the order, cooking, and checkout. The game
uses the lobby's shared maximum width of 560px on every device. Layout queries
follow this game frame's width rather than the browser window's width, keeping the
guest's order above the work area on desktop as well as phones. A brief oven scene connects baking to
checkout. The checkout distinguishes the ordered pizza's price from the guest's
payment and lets children place and remove coins on a change tray. Matching coins
stack with a visible count; tapping a stack removes one coin. Phone screens use
the available viewport height to keep the order, pizza, toppings and action in
view without scrolling. On short screens, secondary captions give way to the
play controls, and help appears in a dismissible overlay. Decoration
colors affect the live awning and interface; the welcome illustration retains
its original palette.

## Learning and difficulty

- **First café:** halves, quarters, three quarters and a whole.
- **Pizza lab:** thirds, sixths, eighths and equivalent portions. For example,
  two quarters and four eighths both satisfy an order for one half.
- **Chef challenge:** add fractions with the same denominator, then make change.

The level is chosen by the player, independent of a presumed grade placement.
English orders include fraction notation. In Korean UI, a translation is
available on request. Each arriving guest's order automatically plays its bundled
English recording through the shared audio service when sound and automatic
reading are enabled, including on devices without speech synthesis. Listen replays
the order; this explicit tap works when automatic reading is off, while respecting the sound switch.
The button shows playback status and reports a failure instead of silently ending.

All 48 order/flavor recordings use the same sentence builder as the UI. Regenerate
them with the installed local MeloTTS: first run
`HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 .local/melotts/run.sh ui`, then
`node scripts/gen-cafe-voices.mjs --force`. The English model uses the EN-US speaker
at speed 1.0 and AAC 48 kbps. The generator trims only leading/trailing silence,
stages replacements before publishing them, and saves model/phrase metadata in
`assets/voice/cafe/manifest.json`. It never substitutes an OS voice when the model
server is unavailable. Browser speech is only a fallback for missing files.

Every price and payment is in whole pesos. The whole pizza costs five pesos per
slice in the order's denominator. The bill charges only for the ordered portion.
Wrong answers show a fraction picture or a paid = price + change explanation;
free help is always available. Previously assisted concepts return twice in a
later day, separated by other orders. Stars reward independent completion, but
all players who serve six guests finish successfully.

The server saves completed deliveries, concept attempts, days, chosen level,
best score and café color through `ctx.saveProgress`. Six and eighteen cumulative
deliveries unlock additional awning colors without a shop purchase. A completed
day calls `ctx.finish` once, using the platform's usual rewards and rankings.

## Scope and sources

Fractions and practical money calculations appear in the Philippine elementary
mathematics curriculum: [DepEd MATATAG mathematics guide](https://www.deped.gov.ph/wp-content/uploads/MATATAG-Mathematics-CG-Grades1-4-and-7.pdf)
and [Grade 3 mathematics competencies](https://lrmds.deped.gov.ph/detail/11100).
This is practice in selected concepts, rather than coverage of a complete grade
or a claim to match a particular school's schedule.

Pictures paired with words and revisiting earlier concepts follow the practice
recommendations in [IES: Organizing Instruction and Study to Improve Learning](https://ies.ed.gov/ncee/wwc/PracticeGuide/1).
Actual enjoyment and learning should be judged from the child's play, not assumed
from these design choices.

## Verification

`npm test` checks portion equivalence, every playable cutting, exact bills,
spaced review, progress recovery, completion scoring, and the server's café
progress, rewards and ranking routes. Browser checks cover the complete café
day, keyboard selection, feedback, coin removal, mobile layout and saved colors.
The compact portrait layout was checked at 320×568, 360×640, 390×664,
390×844 and 430×740. A six-guest chef-challenge day also completed at 320×568
with no page scrolling or clipped action buttons.
