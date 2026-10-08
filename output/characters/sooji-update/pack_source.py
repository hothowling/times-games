"""Pack the supplied Sooji heads with a common transform and safe transparent cuts."""
from pathlib import Path
import json
from PIL import Image
root = Path(__file__).resolve().parent
source = root / 'input/sooji-sheet.png'
im = Image.open(source).convert('RGBA')
# Chosen in fully transparent columns between the five source heads.
bounds = [0, 457, 894, 1323, 1779, 2203]
alpha = im.getchannel('A')
for x in bounds[1:-1]:
    assert alpha.crop((x, 0, x + 1, im.height)).getbbox() is None, f'Cut is not transparent: {x}'
scale = 512 / 574
period = im.width / 5
y = round((960 - im.height * scale) / 2)
sheet = Image.new('RGBA', (2560, 960))
rects = []
for i, (left, right) in enumerate(zip(bounds, bounds[1:])):
    center = (i + .5) * period
    x = round(256 + (left - center) * scale)
    part = im.crop((left, 0, right, im.height))
    size = (round(part.width * scale), round(part.height * scale))
    sheet.paste(part.resize(size, Image.Resampling.LANCZOS), (i * 512 + x, y))
    rects.append({'source_rect': [left, 0, right - left, im.height], 'output_offset': [x, y]})
sheet.save(root / 'packed-sheet.png')
(root / 'packing.json').write_text(json.dumps({'scale': scale, 'period': period, 'cells': rects}, indent=2) + '\n')
# Same square crop for all expressions; removes blank portrait padding for the
# existing character renderer, not individual face crops or per-frame alignment.
runtime = Image.new('RGBA', (2560, 512))
for i in range(5):
    cell = sheet.crop((i * 512, 250, (i + 1) * 512, 762))
    assert sheet.getchannel('A').crop((i * 512, 0, (i + 1) * 512, 250)).getextrema()[1] <= 1
    assert sheet.getchannel('A').crop((i * 512, 762, (i + 1) * 512, 960)).getextrema()[1] <= 1
    runtime.paste(cell, (i * 512, 0))
runtime.save(root / 'runtime-sheet.webp', quality=94, method=6)
(root / 'runtime-layout.json').write_text(json.dumps({'size': [2560, 512], 'cell': [512, 512], 'shared_crop_xywh': [0, 250, 512, 512], 'order': ['neutral', 'happy', 'angry', 'surprised', 'sad'], 'sad_source': 'crying', 'outside_crop_max_alpha': 1}, indent=2) + '\n')
