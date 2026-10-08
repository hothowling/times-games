"""Package generated transparent outfit sprites at the existing asset dimensions."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parent
assets = root.parents[2] / 'public/assets/wearables/outfits'
files = sorted(p for p in (root/'input').glob('*.webp') if not p.name.startswith('11-'))
prepared = []
for original in files:
    source = root/'generated'/f'{original.stem}.png'
    with Image.open(source) as opened:
        if 'A' not in opened.getbands():
            raise ValueError(f'{source.name}: missing transparent alpha')
        image = ImageOps.exif_transpose(opened).convert('RGBA')
    if image.getchannel('A').getextrema()[0] != 0:
        raise ValueError(f'{source.name}: missing transparent background')
    with Image.open(original) as previous:
        size = previous.size
    if image.width != image.height:
        raise ValueError(f'{source.name}: expected square sprite canvas')
    target = root/'prepared'/original.name
    image.resize(size,Image.Resampling.LANCZOS).save(target,quality=95,method=6)
    prepared.append(target)
# Only publish after every requested file was produced successfully.
for target in prepared:
    (assets/target.name).write_bytes(target.read_bytes())
print(f'Applied {len(prepared)} outfit assets')
