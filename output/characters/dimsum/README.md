# 만두 (DimSum)

Selected draft: `final/character_expression_sheet.png` (2560×960 transparent RGBA PNG), with five 512×960 individual PNG frames in `final/`.

Order: neutral, happy, angry, surprised, crying. Generated with built-in image_gen using the attached identity photo, approved Sooji style reference, and a neutral master. Original generations and exact prompts are preserved under `generated/` and `prompts/`.

Structural QA passed: actual transparency; no source cell-edge contact; left/right margins at least82px; vertical margins at least257px; adjacent gaps171–181px. Source width required rounded cell boundaries differing by one pixel; final normalized cells are exactly512×960, with one shared transform for every expression. Visual review confirmed five recognizable expressions, high-bun hairstyle, and heads only. Detailed evidence is in `final/qa-report.json`.

Remaining visual issue: saturated red/yellow fringe artifacts remain at hair, ear, and chin edges. Two image_gen correction attempts did not remove them. The latest redraw in `final-v2/` failed source boundary checks and is not selected. This is a draft for review, not a fully clean runtime asset. No game assets or code were replaced.
