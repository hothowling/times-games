"""Normalize a single complete neutral head with uniform scaling and safe padding."""
import json
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parent
with Image.open(root/'generated/neutral-generated.png') as opened:
    assert 'A' in opened.getbands(), 'Actual transparent alpha is required'
    image = ImageOps.exif_transpose(opened).convert('RGBA')
assert image.getchannel('A').getextrema()[0] == 0
bounds = image.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
assert bounds and bounds[0]>0 and bounds[1]>0 and bounds[2]<image.width and bounds[3]<image.height, 'Clipped source head requires image regeneration'
cx,cy=image.width/2,image.height/2
ex=max(cx-bounds[0],bounds[2]-cx)
ey=max(cy-bounds[1],bounds[3]-cy)
scale=min(512/image.width,960/image.height,164/ex,414/ey)
size=(round(image.width*scale),round(image.height*scale))
offset=((512-size[0])//2,(960-size[1])//2)
output=Image.new('RGBA',(512,960))
output.paste(image.resize(size,Image.Resampling.LANCZOS),offset)
output.save(root/'neutral-master.png')
box=output.getchannel('A').point(lambda a:255 if a>=16 else 0).getbbox()
report={'source_size':image.size,'output_size':[512,960],'common_scale':scale,'offset':offset,
        'alpha_bounds':box,'margins':{'left':box[0],'right':512-box[2],'top':box[1],'bottom':960-box[3]},
        'scope':'Neutral front head only; no expressions or game registration',
        'semantic_review':'manually reviewed identity/style/head-only; pixel-perfect identity not guaranteed'}
(root/'master-layout.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
