from pathlib import Path
from PIL import Image,ImageOps

root=Path(__file__).resolve().parent
assets=root.parents[2]/'public/assets/wearables'
specs=[('19-boys-rashguard','outfits',(256,256)),('20-girls-rashguard','outfits',(256,256)),
       ('01-beach-ball','props',(256,256)),('02-duck-swim-ring','props',(256,256)),
       ('03-striped-swim-ring','props',(256,256)),('06-swim-goggles','glasses',(384,192))]
prepared=[]
for name,folder,size in specs:
    with Image.open(root/'generated'/f'{name}.png') as source:
        if 'A' not in source.getbands(): raise ValueError(f'{name}: alpha required')
        image=ImageOps.exif_transpose(source).convert('RGBA')
    if image.getchannel('A').getextrema()[0]!=0: raise ValueError(f'{name}: transparency required')
    # Layout-only resize to the renderer's existing slot aspect ratio.
    image=image.resize(size,Image.Resampling.LANCZOS)
    target=root/'prepared'/f'{name}.webp'
    image.save(target,quality=95,method=6)
    prepared.append((target,assets/folder/target.name))
for source,target in prepared:
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(source.read_bytes())
print(f'Added {len(prepared)} swim assets')
