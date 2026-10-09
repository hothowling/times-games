"""Export Penguala pet sprites in the game's existing transparent WebP format."""
from pathlib import Path
from PIL import Image, ImageOps

root=Path(__file__).resolve().parent
assets=root.parents[2]/'public/assets/wearables/pets'
names=['11-penguala-blue','12-penguala-turquoise','13-penguala-purple']
prepared=[]
for name in names:
    with Image.open(root/'generated'/f'{name}.png') as opened:
        if 'A' not in opened.getbands():
            raise ValueError(f'{name}: alpha required')
        image=ImageOps.exif_transpose(opened).convert('RGBA')
    if image.getchannel('A').getextrema()[0]!=0:
        raise ValueError(f'{name}: transparent background required')
    image.thumbnail((256,256),Image.Resampling.LANCZOS)
    sprite=Image.new('RGBA',(256,256))
    sprite.paste(image,((256-image.width)//2,(256-image.height)//2))
    target=root/'prepared'/f'{name}.webp'
    sprite.save(target,quality=95,method=6)
    prepared.append(target)
for target in prepared:
    (assets/target.name).write_bytes(target.read_bytes())
print(f'Added {len(prepared)} Penguala pets')
