"""Format the generated strip's regular 389px head pitch into equal padded cells."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent
image = Image.open(root / 'generated/expression-sheet.png').convert('RGBA')
# One fixed pitch/origin for the full row, not five bbox-based face fits.
# Generated heads use a 389px pitch; outer transparent gutters are unequal.
pitch, origin, crop_width = 389, 19, 390
sheet = Image.new('RGBA', (2560, 960))
for i in range(5):
    frame = image.crop((origin + i*pitch, 0, origin + i*pitch + crop_width, image.height))
    alpha = frame.getchannel('A').point(lambda a:255 if a>=16 else 0)
    bounds = alpha.getbbox()
    assert bounds and bounds[0] > 0 and bounds[2] < crop_width
    sheet.paste(frame, (i*512 + 61, 83))
sheet.save(root / 'packed-sheet.png')
(root / 'packing.json').write_text(json.dumps({'source_size': image.size,
    'source_pitch': pitch, 'source_origin': origin, 'source_crop_width': crop_width,
    'common_scale': 1, 'common_offset': [61,83],
    'note': 'Regular strip pitch plus identical padding; no per-expression crop fitting or scaling'}, indent=2)+'\n')
