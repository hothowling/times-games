# Crossing artwork

## Traffic audio

`audio/car-drive-by-whoosh.mp3` — **Car Drive By Whoosh**, by **DRAGON-STUDIO**, downloaded from Pixabay on 2026-10-17. Original MP3, 2.04 seconds, stereo, 48 kHz, 256 kbps, 65,280 bytes.

- Source: https://pixabay.com/sound-effects/city-car-drive-by-whoosh-450445/
- Download: https://cdn.pixabay.com/download/audio/2025/12/12/audio_e25fd47162.mp3?filename=dragon-studio-car-drive-by-whoosh-450445.mp3
- License: [Pixabay Content License](https://pixabay.com/service/license-summary/) and [terms](https://pixabay.com/service/terms/), checked 2026-10-17. Embedded as part of this game; do not redistribute or sell the recording as a standalone sound asset. Attribution is provided in the game credits.
- SHA-256: `07fff9e34702c454f833fd1f042c9a7c6ce20c95bb9b49ad4e74e3446c4f99ee`.

The low road ambience is generated locally with filtered noise using the shared Web Audio context. It contains no additional recording. Nearby pass-by clips follow actual vehicle motion and are quieter while thinking or hearing feedback. The originally suggested 63-second `traffic-sound-111442` recording is not used.

## Vehicle atlas

`vehicles-block-atlas.png` is an original game asset made with the built-in image_gen tool on 2026-10-17. It is a 1448×1086 RGBA sheet with eight vehicle types in both travel directions (16 sprites).

| Row | First pair (right, left) | Second pair (right, left) |
| --- | --- | --- |
| 1 | Red compact car | Blue sedan |
| 2 | Green SUV | Purple minivan |
| 3 | Yellow taxi | Orange bus |
| 4 | Coral/ivory delivery truck | Mint scooter |

All vehicles use simple box forms and a horizontal wheel baseline. Runtime crops use actual object bounds rather than assuming the generated sheet has perfectly equal spacing. Frame coordinates and vehicle lengths are in `public/games/crossing/vehicles.js`. Sprite width and collision length share the same vehicle definition. The canvas downsamples the high-resolution source and supports up to 3× display density.

The generated source and full prompt are preserved in `output/imagegen/crossing-vehicles/`.

## Rock and tree obstacles

`rock.svg` is an original 96×80 vector asset made for this game. Simple gray facets match the box-shaped vehicles and stay crisp at different screen densities. Rocks use the previous obstacles' positions and random generation sequence, with four small size variations. Each image is vertically centered on its blocked grass tile, moving it down by half its rendered height. Depth ordering uses the lowered image base. Rocks are stationary and have no marked area or border beneath them.

`obstacle-tree.svg` is an original 96×112 vector asset with a box-shaped green crown and a short brown trunk. It is drawn at 48–54px wide so the entire tree fits its grass tile. Rocks and trees share the same placement budget and blocking rules; pairs always mix both kinds, while neighboring single obstacles alternate in pairs with a seeded starting type. The previous blocked tiles and gift generation stay the same. Both assets are vertically centered and use their image base for depth ordering. The smaller Kenney `tree.png` remains decorative border scenery.

## Gifts

`assets/ui/gift-box.webp` is reused from the shared platform artwork. One chest per five sections appears on an inner lane of a randomly selected three- or four-lane road and disappears when collected. It gives one local run effect (heart, slow traffic, or shield), with no paid inventory grant. The shared heart, hourglass and shield icons pop above the character with a burst and floating fade lasting 2.2 seconds. The popup follows the character and uses game time so it freezes during pauses. Remaining effects are shown in compact HUD badges outside the question panel.

## Kenney assets

Only the tree and streetlight are still loaded by the game. The earlier car PNGs below are retained for reference.

Downloaded from Kenney on 2026-10-17. All downloaded art is **CC0 1.0**; attribution is optional. The original license files are included beside the sprites.

| Local file | Original file | Source |
| --- | --- | --- |
| car-red-right.png / car-red-left.png | PNG/Civilian/Red/Sedan 1/carRed2_011.png / carRed2_008.png | https://kenney.nl/assets/isometric-tiles-vehicles |
| car-blue-right.png / car-blue-left.png | PNG/Civilian/Blue/Sedan 1/carBlue2_011.png / carBlue2_008.png | https://kenney.nl/assets/isometric-tiles-vehicles |
| car-green-right.png / car-green-left.png | PNG/Civilian/Green/Sedan 1/carGreen2_011.png / carGreen2_008.png | https://kenney.nl/assets/isometric-tiles-vehicles |
| taxi-right.png / taxi-left.png | PNG/Taxi/taxi_W.png / taxi_E.png | https://kenney.nl/assets/isometric-tiles-vehicles |
| tree.png | Details/cityDetails_010.png | https://kenney.nl/assets/isometric-tiles-city |
| streetlight.png | Details/cityDetails_005.png | https://kenney.nl/assets/isometric-tiles-city |

Downloads:
- https://kenney.nl/media/pages/assets/isometric-tiles-vehicles/34c07c3393-1677695121/kenney_isometric-vehicles.zip
- https://kenney.nl/media/pages/assets/isometric-tiles-city/7026b2670a-1677695025/kenney_isometric-city.zip

The platform supplies the selected character, clothing, UI and country flags. Roads, lawn tiles, crossing stripes and answer boxes use a straight horizontal/vertical grid. Answer boxes sit low at the entrance without fence bars or support posts. World objects are sorted by ground depth, with a foreground canvas for objects in front of the character.
