#!/usr/bin/env python3
"""Package five generated expression cells; inspect alpha geometry, not identity."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageOps

ORDER = ['neutral', 'happy', 'angry', 'surprised', 'crying']
CELL = (512, 960)
SIZE = (2560, 960)
MIN_SIDE_MARGIN = 64
MIN_VERTICAL_MARGIN = 32


def prepare(source, destination, name='character', normalize=False, webp=False, force=False, pad_to_margin=False):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if not name or any(c in name for c in '/\\\0'):
        raise ValueError('name must be a simple file-safe character key')
    if destination.exists() and any(destination.iterdir()) and not force:
        raise ValueError('Output directory is not empty; choose a new directory or explicitly use --force')
    if source.parent == destination:
        raise ValueError('Keep source image separate from output directory')
    with Image.open(source) as opened:
        had_alpha = 'A' in opened.getbands() or 'transparency' in opened.info
        image = ImageOps.exif_transpose(opened).convert('RGBA')
    if not had_alpha or image.getchannel('A').getextrema()[0] != 0:
        raise ValueError('No genuinely transparent background; regenerate with actual alpha')
    if image.width < 5:
        raise ValueError('Input is too narrow for five cells')
    if image.size != SIZE and not normalize:
        raise ValueError(f'Expected {SIZE[0]}x{SIZE[1]}, got {image.width}x{image.height}; use --normalize for format-only resizing')

    warnings, errors = [], []
    if image.width % 5:
        warnings.append('Input width is not divisible by five; rounded cell boundaries differ by at most one pixel')
    original_cells, source_rects = [], []
    for i in range(5):
        left, right = round(i * image.width / 5), round((i + 1) * image.width / 5)
        source_rects.append([left, 0, right - left, image.height])
        original_cells.append(image.crop((left, 0, right, image.height)))
    # One transform for every entire source cell, not five independent face crops.
    common_width = max(c.width for c in original_cells)
    scale = min(CELL[0] / common_width, CELL[1] / image.height)
    resized_size = (round(common_width * scale), round(image.height * scale))
    offset = ((CELL[0] - resized_size[0]) // 2, (CELL[1] - resized_size[1]) // 2)
    frames = []
    for cell in original_cells:
        alpha = cell.getchannel('A')
        mask = alpha.point(lambda a: 255 if a >= 16 else 0)
        box = mask.getbbox()
        if box is None:
            errors.append(f'{ORDER[len(frames)]}: empty cell')
        elif box[0] == 0 or box[1] == 0 or box[2] == cell.width or box[3] == cell.height:
            errors.append(f'{ORDER[len(frames)]}: visible pixels touch original cell edge; check clipping or neighbor overlap')
        padded = Image.new('RGBA', (common_width, image.height))
        padded.paste(cell, ((common_width - cell.width) // 2, 0))
        frame = Image.new('RGBA', CELL)
        frame.paste(padded.resize(resized_size, Image.Resampling.LANCZOS), offset)
        frames.append(frame)

    # Format-only correction: one scale around the fixed cell center for ALL
    # expressions. Never derive five independent face crops/scales/translations.
    padding = {'requested': pad_to_margin, 'applied': False, 'scale': 1.0,
               'target_side_px': 80, 'target_vertical_px': 64}
    if pad_to_margin and not errors:
        bounds = [f.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox() for f in frames]
        cx, cy = CELL[0] / 2, CELL[1] / 2
        extent_x = max(max(cx-b[0], b[2]-cx) for b in bounds)
        extent_y = max(max(cy-b[1], b[3]-cy) for b in bounds)
        # Two extra pixels protect the requested margin against resampling.
        fit_scale = min(1.0, (cx-82)/extent_x, (cy-66)/extent_y)
        if fit_scale < 1:
            fit_size = (round(CELL[0]*fit_scale), round(CELL[1]*fit_scale))
            fit_offset = ((CELL[0]-fit_size[0])//2, (CELL[1]-fit_size[1])//2)
            padded_frames = []
            for frame in frames:
                padded = Image.new('RGBA', CELL)
                padded.paste(frame.resize(fit_size, Image.Resampling.LANCZOS), fit_offset)
                padded_frames.append(padded)
            frames = padded_frames
            padding.update({'applied': True, 'scale': fit_scale,
                            'size': list(fit_size), 'offset': list(fit_offset)})
        # Padding cannot rescue missing/cropped heads: source errors above remain.

    sheet = Image.new('RGBA', SIZE)
    masks, measurements = [], []
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * CELL[0], 0))
        alpha = frame.getchannel('A')
        mask = alpha.point(lambda a: 255 if a >= 16 else 0)
        masks.append(mask)
        bounds = mask.getbbox()
        hist = alpha.histogram()
        margins = None
        if bounds:
            margins = {'left': bounds[0], 'right': CELL[0] - bounds[2],
                       'top': bounds[1], 'bottom': CELL[1] - bounds[3]}
            # Source-edge clipping already has its own error. Normalized padding
            # must not hide it, nor should the margin error duplicate that error.
            source_mask = original_cells[i].getchannel('A').point(lambda a: 255 if a >= 16 else 0)
            source_bounds = source_mask.getbbox()
            clipped = source_bounds and (source_bounds[0] == 0 or source_bounds[1] == 0
                                         or source_bounds[2] == original_cells[i].width
                                         or source_bounds[3] == original_cells[i].height)
            if not clipped and (min(margins['left'], margins['right']) < MIN_SIDE_MARGIN
                                or min(margins['top'], margins['bottom']) < MIN_VERTICAL_MARGIN):
                errors.append(f'{ORDER[i]}: insufficient transparent margin {margins}; '
                              f'need left/right >= {MIN_SIDE_MARGIN}px, top/bottom >= {MIN_VERTICAL_MARGIN}px')
        measurements.append({'expression': ORDER[i], 'alpha_bounds_xyxy': bounds,
                             'transparent_margins_px': margins,
                             'transparent_fraction': hist[0] / (CELL[0] * CELL[1]),
                             'visible_fraction': sum(hist[16:]) / (CELL[0] * CELL[1])})
    master_bounds = measurements[0]['alpha_bounds_xyxy']
    for i in range(1, 5):
        bounds = measurements[i]['alpha_bounds_xyxy']
        intersection = ImageChops.darker(masks[0], masks[i]).histogram()[255]
        union = ImageChops.lighter(masks[0], masks[i]).histogram()[255]
        overlap = intersection / union if union else 0
        measurements[i]['silhouette_iou_vs_neutral'] = round(overlap, 4)
        if master_bounds and bounds:
            drift = max(abs(a - b) / (CELL[0] if j % 2 == 0 else CELL[1])
                        for j, (a, b) in enumerate(zip(master_bounds, bounds)))
            measurements[i]['max_bounds_drift_fraction'] = round(drift, 4)
            if drift > 0.04 or overlap < 0.88:
                warnings.append(f'{ORDER[i]}: silhouette drift; inspect hair/jaw anchors and allow expression-related tears')
    adjacent_gaps = [
        (measurements[i]['transparent_margins_px']['right']
         + measurements[i+1]['transparent_margins_px']['left'])
        if measurements[i]['transparent_margins_px'] and measurements[i+1]['transparent_margins_px'] else None
        for i in range(4)
    ]
    report = {'source_size': list(image.size), 'output_size': list(SIZE),
              'adjacent_head_gaps_px': adjacent_gaps,
              'source_cells_xywh': source_rects, 'normalized': image.size != SIZE,
              'common_transform': {'scale': scale, 'size': list(resized_size), 'offset': list(offset)},
              'common_margin_padding': padding,
              'structural_pass': not errors, 'semantic_review_required': True,
              'minimum_margins_px': {'left': MIN_SIDE_MARGIN, 'right': MIN_SIDE_MARGIN,
                                     'top': MIN_VERTICAL_MARGIN, 'bottom': MIN_VERTICAL_MARGIN},
              'errors': errors, 'warnings': warnings, 'frames': measurements,
              'not_automatically_verified': ['identity', 'expression count/order semantics', 'eyes', 'nose', 'chin', 'neck/body absence']}
    destination.mkdir(parents=True, exist_ok=True)
    sheet.save(destination / 'character_expression_sheet.png')
    if webp:
        sheet.save(destination / 'character_expression_sheet.webp', quality=92, method=6)
    for expression, frame in zip(ORDER, frames):
        frame.save(destination / f'{expression}.png')
    overlay = Image.new('RGBA', CELL)
    for frame in frames:
        faded = frame.copy()
        faded.putalpha(frame.getchannel('A').point(lambda a: round(a / 5)))
        overlay = Image.alpha_composite(overlay, faded)
    overlay.save(destination / 'overlay.png')
    contact = Image.new('RGB', (640, 272), '#eeeeee')
    draw = ImageDraw.Draw(contact)
    for i, (expression, frame) in enumerate(zip(ORDER, frames)):
        thumb = frame.resize((128, 240), Image.Resampling.LANCZOS)
        contact.paste(thumb, (i * 128, 0), thumb)
        draw.text((i * 128 + 8, 248), expression, fill='black')
        # Face guides, not a fixed hair top: hairstyles may have different extents.
        draw.rectangle((i * 128 + MIN_SIDE_MARGIN // 4, MIN_VERTICAL_MARGIN // 4,
                        (i + 1) * 128 - MIN_SIDE_MARGIN // 4 - 1,
                        240 - MIN_VERTICAL_MARGIN // 4 - 1), outline='#28a745')
        for fraction, color in [(480 / 960, '#2176d2'), (660 / 960, '#d43a3a')]:
            y = round(240 * fraction)
            draw.line((i * 128, y, (i + 1) * 128 - 1, y), fill=color)
    contact.save(destination / 'qa-contact-sheet.png')
    manifest = {'name': name, 'sheet': 'character_expression_sheet.png', 'width': SIZE[0], 'height': SIZE[1],
                'frame_width': CELL[0], 'frame_height': CELL[1], 'expression_order': ORDER,
                'game_expression_order': ['neutral', 'happy', 'angry', 'surprised', 'sad'],
                'aliases': {'sad': 'crying'},
                'frames': [{'expression': expression, 'index': i, 'file': f'{expression}.png',
                            'rect_xywh': [i * CELL[0], 0, CELL[0], CELL[1]]} for i, expression in enumerate(ORDER)]}
    if webp:
        manifest['webp'] = 'character_expression_sheet.webp'
    for filename, value in [('manifest.json', manifest), ('qa-report.json', report)]:
        (destination / filename).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--name', default='character')
    parser.add_argument('--normalize', action='store_true')
    parser.add_argument('--webp', action='store_true')
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--pad-to-margin', action='store_true',
                        help='Uniformly reduce all whole cells together to target 80px sides and 64px top/bottom; clipping still fails')
    args = parser.parse_args()
    try:
        report = prepare(args.input, args.output, args.name, args.normalize, args.webp, args.force, args.pad_to_margin)
    except (ValueError, OSError) as exc:
        parser.error(str(exc))
    print(json.dumps({'structural_pass': report['structural_pass'], 'errors': report['errors'],
                      'warnings': report['warnings'], 'output': str(args.output)}, ensure_ascii=False, indent=2))
    return 0 if report['structural_pass'] else 2


if __name__ == '__main__':
    raise SystemExit(main())
