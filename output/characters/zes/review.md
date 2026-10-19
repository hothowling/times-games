# 빵점이 (ZeS)

Created with built-in image_gen using the supplied photo as identity reference and the approved Sooji sheet as style-only reference. Prompts and original generations are retained in this directory. The personal source photo was not copied into public assets.

Final source: `generated/expression-sheet-small.png`. The earlier two sheets failed cell-edge checks and are unused. `final-small/qa-report.json` passes with zero errors. All five frames have at least 80px horizontal and 64px vertical transparent margins; adjacent head gaps are 176–189px. The source-width rounding warning is handled by common normalization.

Manual visual review: five recognizable expressions in neutral/happy/angry/surprised/crying order, pale yellow bows and twin ponytails, head only, no food/hand/body. Humor comes from the smug neutral look, squinting laugh, puffed-cheek pout and exaggerated tears. Small expression-related drawing variation remains; this is generated art, not a pixel-identical rig.

Runtime: common 512×512 crop from y232 through744 for every frame, preserving alpha. Crying occupies the game's sad slot. `public/assets/characters/zes.webp` is the lossless five-frame runtime asset.

Manual eye/chin landmarks and `face-fit.json` match the rendered eye-to-chin distance to Sooji (75.88px). Eye spacing is 16.8% wider relative to this distance, consistent with the short rounded child face; no axis stretching was applied. Head and glasses anchors are separately positioned.

Final adjustments: body face and accessories shifted16px right; alignment reviewed in `../face-alignment-review.png`. Face-only previews enlarged30% around the cell center, reviewed in `../../reviews/character-selection/zes-portrait.png`. The source eye/chin calibration above predates these display adjustments.

Validation: 37 related server/catalog/wearables/maker tests pass, including ZeS/Hoya selection, ranking identity, outfit persistence and WebP serving. Final browser screenshots confirm clothing alignment and selection-card face sizes.
