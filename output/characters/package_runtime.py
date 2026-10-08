"""One shared square transform for every expression, preserving generated alpha."""
import json
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent
for key in sys.argv[1:]:
    folder = root / f'{key}-update'
    sheet = Image.open(folder / 'output/character_expression_sheet.png').convert('RGBA')
    frames = [sheet.crop((i * 512, 0, (i + 1) * 512, 960)) for i in range(5)]
    # Locate visible artwork, ignoring faint generated alpha specks for geometry only.
    # Keep original alpha pixels throughout; no color-based background removal.
    bounds = [frame.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox() for frame in frames]
    union = (min(b[0] for b in bounds), min(b[1] for b in bounds),
             max(b[2] for b in bounds), max(b[3] for b in bounds))
    span = max(union[2] - union[0], union[3] - union[1])
    side = round(span / .80)
    cx, cy = (union[0] + union[2]) / 2, (union[1] + union[3]) / 2
    left, top = round(cx - side / 2), round(cy - side / 2)
    rect = (left, top, left + side, top + side)
    outside_max = 0
    for frame in frames:
        outside = frame.getchannel('A').copy()
        from PIL import ImageDraw
        ImageDraw.Draw(outside).rectangle((max(0,left), max(0,top), min(511,left+side-1), min(959,top+side-1)), fill=0)
        outside_max = max(outside_max, outside.getextrema()[1])
    if outside_max >= 16:
        raise ValueError('Runtime crop would discard visible artwork')
    runtime = Image.new('RGBA', (2560, 512))
    for i, frame in enumerate(frames):
        runtime.paste(frame.crop(rect).resize((512, 512), Image.Resampling.LANCZOS), (i * 512, 0))
    runtime.save(folder / 'runtime-sheet.webp', quality=95, method=6)
    runtime.save(folder / 'runtime-sheet.png')
    layout = {'size': [2560, 512], 'cell': [512, 512], 'shared_crop_xywh': [left, top, side, side],
              'source_union_bounds': union, 'outside_crop_max_alpha': outside_max,
              'order': ['neutral', 'happy', 'angry', 'surprised', 'sad'],
              'sad_source': 'crying', 'transform': 'identical square crop/pad and resize for all five cells'}
    (folder / 'runtime-layout.json').write_text(json.dumps(layout, indent=2) + '\n')
    print(key, layout)
