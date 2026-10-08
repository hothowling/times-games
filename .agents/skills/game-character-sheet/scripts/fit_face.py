#!/usr/bin/env python3
"""Compute a uniform game rig scale from manually reviewed neutral landmarks."""
import argparse
import json
import math
from pathlib import Path


def measure(data):
    width, height = data['frame']
    if not all(isinstance(v, (int, float)) and math.isfinite(v) and v > 0 for v in (width, height)):
        raise ValueError('frame dimensions must be positive and finite')
    points = [data[k] for k in ('left_eye', 'right_eye', 'chin')]
    for x, y in points:
        if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in (x, y)):
            raise ValueError('landmarks must be finite numbers')
        if not (0 <= x < width and 0 <= y < height):
            raise ValueError('landmarks must be inside the final runtime cell')
    left, right, chin = points
    eye_x, eye_y = (left[0] + right[0]) / 2, (left[1] + right[1]) / 2
    distance = chin[1] - eye_y
    spacing = math.dist(left, right)
    if distance <= 0 or spacing <= 0:
        raise ValueError('chin must be below the eyes and eyes must be distinct')
    return width, height, eye_x, eye_y, chin[1], distance, spacing


def fit(source, reference):
    w, h, ex, ey, cy, distance, spacing = measure(source)
    rw, rh, rex, rey, rcy, rdistance, rspacing = measure(reference)
    rig = reference['rig']
    values = [rig[k] for k in ('faceW', 'faceH', 'faceY', 'faceX_px', 'boxW')]
    if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in values):
        raise ValueError('reference rig values must be finite numbers')
    if min(rig['faceW'], rig['faceH'], rig['boxW']) <= 0:
        raise ValueError('reference rig dimensions must be positive')
    ref_scale = rig['faceW'] / rw
    if not math.isclose(ref_scale, rig['faceH'] / rh, rel_tol=.005):
        raise ValueError('reference rig must preserve runtime frame aspect ratio')
    target_distance = rdistance * ref_scale
    scale = target_distance / distance
    target_chin = rig['faceY'] + rcy * ref_scale
    target_eye_x = rig['faceX_px'] + (rex - rw / 2) * ref_scale
    center_x = target_eye_x - (ex - w / 2) * scale
    eye_spacing_ratio = spacing * scale / (rspacing * ref_scale)
    warnings = []
    if abs(eye_spacing_ratio - 1) > .10:
        warnings.append('Eye spacing differs by more than 10%; visually review identity proportions, do not stretch axes independently')
    return {
        'rig_candidate': {'faceW': round(w * scale, 4), 'faceH': round(h * scale, 4),
                          'faceY': round(target_chin - cy * scale, 4),
                          'faceX': f'{100 * center_x / rig["boxW"]:.4f}%'},
        'eye_center_y': round(target_chin - target_distance, 4),
        'eye_center_x': round(target_eye_x, 4),
        'rendered_eye_chin_distance': target_distance,
        'eye_spacing_ratio_vs_reference': eye_spacing_ratio,
        'uniform_scale': scale, 'warnings': warnings,
        'manual_review_required': True,
        'scope': 'same transform for all five expressions; hairstyle is excluded from face-size calibration'
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--landmarks', type=Path, required=True)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        result = fit(json.loads(args.landmarks.read_text()), json.loads(args.reference.read_text()))
    except (ValueError, KeyError, TypeError, OSError) as exc:
        parser.error(str(exc))
    if args.output.resolve() in (args.landmarks.resolve(), args.reference.resolve()):
        parser.error('output must not overwrite input landmarks')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
