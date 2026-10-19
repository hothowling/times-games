# Gold Pack — 2026-10-19

Added a permanent 50-Sparkle bundle containing a golden crown, golden dress, golden glasses and a golden cheese mouth accessory. The shop previews and equips the full set, and owned components can also be equipped or removed individually. Bundle components are not sold separately or awarded by Mystery Boxes.

All four images were made with the built-in image_gen tool. Exact prompts are in [prompts.md](prompts.md); generated PNG sources are in `generated/`. Sharp only resizes, adds a three-pixel transparent safety margin to the dress and converts to lossless WebP. Runtime assets: `public/assets/wearables/gold-pack/{crown,dress,glasses,cheese}.webp`. Dimensions, alpha and visible bounds are recorded in [qa.json](qa.json).

The crown uses the existing head rig with a smaller size and raised position. The cheese uses a new `bite` style anchored to the face; existing shoulder snacks retain their placement. Neutral and happy expressions were visually checked on all six preset characters.

Validation: 32 server, catalog and wearable tests passed. Coverage includes insufficient funds with no partial grants, simultaneous duplicate requests, exactly one 50-Sparkle debit, all four permanent grants, new-session persistence, per-character equipment, component-only purchase rejection and Mystery Box exclusion. Syntax and whitespace checks passed. Temporary local browser account verified actual purchase (100→50), individual cheese removal, complete-set removal/re-equipping and the existing uniform preview. Mobile viewport 390×844 has no horizontal overflow.

Screenshots: [shop-preview.png](shop-preview.png), [mobile-preview.png](mobile-preview.png), [characters-review.png](characters-review.png). Browser checks use an isolated temporary database; live user data was not changed.

## Crown and cheese revision

Removed the hollow rear/underside ellipse from the crown with the built-in image_gen tool, preserving the front jeweled band and five points. The original remains at `generated/crown.png`; the revised source is `generated/crown-front.png`. Exact edit prompt: [crown-front-prompt.md](crown-front-prompt.md). The game uses the revised `public/assets/wearables/gold-pack/crown.webp` (256×256, alpha 0–255).

Enlarged the cheese from 58 to 74 rig pixels (about 28%) and moved its horizontal offset from 14 to 26 pixels to the right of the face anchor. Increased the vertical offset from 59 to 65 pixels below the lens center to keep its tip at mouth height while enlarging it. Other snacks keep their existing size and placement.

Visually verified the updated set on six preset characters and at 390×844 mobile size. Latest previews: [revised-mobile-preview.png](revised-mobile-preview.png), [revised-characters-review.png](revised-characters-review.png). JavaScript syntax and whitespace checks passed; this visual adjustment required no purchasing logic changes.

## Animated gold reflections

Added a shared CSS effect for golden glasses and the crown, shown both on equipped characters and shop icons. A warm white reflection sweeps across the original sprite's alpha mask every 5.4 seconds, while two small four-point glints twinkle at different times on each item. Glasses and crown use different phases. The mask preserves transparent lens openings and the crown's removed rear area. Existing sprite files remain unchanged.

The effect follows each character's head/glasses size, rotation and position, including face-only portraits, and hides when an ordinary item replaces it or the slot is cleared. The reduced-motion preference renders static subtle highlights with no animation.

Validated in the browser: masked reflection rendering, character and thumbnail sizing, face-only use, removal/replacement, and reduced-motion animation suppression. Five catalog/wearable tests and syntax/whitespace checks passed. A full 5.4-second cycle is captured in [shine-preview.gif](shine-preview.gif); [shine-preview.html](shine-preview.html) is a self-contained preview of the actual CSS and rendered sprites. Mobile capture: [shine-mobile.png](shine-mobile.png).

## Golden dress reflections

Extended the shared effect to the golden dress on characters and shop icons. Its alpha-masked sweep is additionally clipped to the fabric silhouette so the arms, hands and pencil retain their original colors. The sweep is softer (65% of the accessory effect) and staggered from the crown and glasses; smaller glints highlight the waist and skirt.

Verified that the effect matches the outfit's exact position and dimensions, hides in face-only portraits, clears when the outfit is removed or changed, and stops animating under reduced motion. The 390px mobile shop has no horizontal overflow. Five catalog/wearable tests and syntax/whitespace checks passed. Latest preview: [dress-shine-preview.gif](dress-shine-preview.gif); mobile capture: [dress-shine-mobile.png](dress-shine-mobile.png).

Before pushing, the complete `node --test` suite passed all 166 tests.
