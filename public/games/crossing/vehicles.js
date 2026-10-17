/* One high-resolution atlas. Frames include a small transparent edge, with wheels at the bottom. */
export const VEHICLE_SHEET = {
  src: 'assets/games/crossing/vehicles-block-atlas.png', width: 1448, height: 1086
};

export const VEHICLE_TYPES = [
  { id: 'compact', length: 0.95, surge: 0.12, surgeRate: 1.05, right: [43, 93, 266, 166], left: [378, 93, 265, 166] },
  { id: 'sedan', length: 1.15, surge: 0.16, surgeRate: 0.95, right: [715, 93, 320, 166], left: [1102, 93, 312, 167] },
  { id: 'suv', length: 1.1, surge: 0.1, surgeRate: 0.85, right: [40, 338, 274, 183], left: [374, 338, 274, 183] },
  { id: 'van', length: 1.2, surge: 0.08, surgeRate: 0.75, right: [719, 333, 321, 188], left: [1089, 333, 317, 188] },
  { id: 'taxi', length: 1.08, surge: 0.22, surgeRate: 1.3, right: [36, 590, 276, 179], left: [368, 590, 264, 179] },
  { id: 'bus', length: 1.75, surge: 0.055, surgeRate: 0.65, right: [695, 586, 350, 186], left: [1089, 586, 338, 186] },
  { id: 'truck', length: 1.45, surge: 0.07, surgeRate: 0.7, right: [41, 829, 290, 194], left: [377, 829, 291, 194] },
  { id: 'scooter', length: 0.75, surge: 0.24, surgeRate: 1.55, right: [759, 858, 223, 165], left: [1149, 858, 222, 164] }
];
