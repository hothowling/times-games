"""Add the same transparent margin to all five complete source cells."""
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parent
source = Image.open(root/'qa-v2/character_expression_sheet.png').convert('RGBA')
sheet = Image.new('RGBA', (2560,960))
for i in range(5):
    cell = source.crop((i*512,0,(i+1)*512,960))
    sheet.paste(cell.resize((410,768),Image.Resampling.LANCZOS),(i*512+51,96))
sheet.save(root/'packed-sheet.png')
(root/'packing.json').write_text(json.dumps({'input':'qa-v2/character_expression_sheet.png',
    'common_cell_size':[410,768], 'common_offset':[51,96],
    'note':'All five whole cells uniformly reduced and padded; no face-based per-expression fitting'},indent=2)+'\n')
