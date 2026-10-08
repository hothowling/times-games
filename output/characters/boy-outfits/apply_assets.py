"""Export four transparent outfit sprites to the game's existing 256px format."""
from pathlib import Path
from PIL import Image,ImageOps

root=Path(__file__).resolve().parent
assets=root.parents[2]/'public/assets/wearables/outfits'
names=['15-denim-jacket','16-basketball-uniform','17-junior-astronaut','18-jungle-explorer']
prepared=[]
for name in names:
    with Image.open(root/'generated'/f'{name}.png') as opened:
        if 'A' not in opened.getbands():
            raise ValueError(f'{name}: transparent alpha required')
        image=ImageOps.exif_transpose(opened).convert('RGBA')
    if image.getchannel('A').getextrema()[0]!=0:
        raise ValueError(f'{name}: transparent background required')
    if image.width!=image.height:
        raise ValueError(f'{name}: square sprite required')
    target=root/'prepared'/f'{name}.webp'
    image.resize((256,256),Image.Resampling.LANCZOS).save(target,quality=95,method=6)
    prepared.append(target)
for target in prepared:
    (assets/target.name).write_bytes(target.read_bytes())
print(f'Added {len(prepared)} outfit assets')
