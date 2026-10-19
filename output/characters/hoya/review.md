# 호야 (hoya)

Generated with built-in image_gen from the approved front-facing neutral master, original identity photograph and Sooji style reference. Exact prompt: `prompts/expression-sheet.txt`. Source photograph was not copied into public assets.

Five expressions: neutral, happy, angry, surprised, crying. The runtime maps crying to sad. Manual review confirms the approved short-haired boy's identity, cool neutral expression, complete heads, no neck/body/props and actual alpha transparency.

`final/qa-report.json`: structural pass, zero errors. Adjacent gaps 179–183px, all cells have at least80px side margins and64px vertical margins. Source-width rounding is handled by normalization. Surprised/crying silhouette warnings were manually reviewed: expression details and a small lateral drawing drift remain; no clipping or overlapping heads. A single uniform transform is used for all five frames.

Runtime: common square crop y232–744, 2560×512 lossless WebP at `public/assets/characters/hoya.webp`. Manual runtime pupil/chin measurements are in `landmarks.json`; `face-fit.json` matches Sooji's rendered75.88px eye-to-chin distance, with eye spacing5.9% wider and no calibration warnings.

Actual browser renderer checked in `render-review.png`: five expressions, reference Sooji, default T-shirt, red cap and glasses. Face size/chin height and accessory alignment reviewed. No existing characters were replaced.

37 related server/catalog/wearables/maker tests pass, including Hoya preset selection, rank identity, outfit persistence and WebP serving. `git diff --check` passes.
