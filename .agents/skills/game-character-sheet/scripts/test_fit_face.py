import unittest
from fit_face import fit


class FaceFitTests(unittest.TestCase):
    def reference(self):
        return {'frame': [512, 512], 'left_eye': [170, 290], 'right_eye': [290, 290],
                'chin': [230, 430],
                'rig': {'faceW': 300, 'faceH': 300, 'faceY': -56, 'faceX_px': 125, 'boxW': 250}}

    def test_different_face_size_preserves_eye_and_chin_world_positions(self):
        ref = self.reference()
        source = {'frame': [512, 512], 'left_eye': [210, 240], 'right_eye': [270, 240], 'chin': [240, 310]}
        result = fit(source, ref)
        rig = result['rig_candidate']
        self.assertEqual(rig['faceW'], 600)
        self.assertEqual(rig['faceH'], 600)
        self.assertAlmostEqual(rig['faceY'] + 310 * 600 / 512, -56 + 430 * 300 / 512, places=4)
        self.assertAlmostEqual(result['eye_center_y'], -56 + 290 * 300 / 512, places=4)
        self.assertAlmostEqual(result['eye_spacing_ratio_vs_reference'], 1)
        self.assertEqual(result['warnings'], [])
        face_x = float(rig['faceX'].rstrip('%')) / 100 * 250
        self.assertAlmostEqual(face_x + (240 - 256) * 600 / 512,
                               125 + (230 - 256) * 300 / 512, places=3)

    def test_padding_changes_do_not_change_visible_face_size(self):
        ref = self.reference()
        padded = {'frame': [1024, 1024], 'left_eye': [426, 546],
                  'right_eye': [546, 546], 'chin': [486, 686]}
        result = fit(padded, ref)
        self.assertEqual(result['rig_candidate']['faceW'], 600)
        self.assertAlmostEqual(result['rendered_eye_chin_distance'], 140 * 300 / 512)

    def test_eye_spacing_is_warning_not_nonuniform_stretch(self):
        ref = self.reference()
        source = {'frame': [512, 960], 'left_eye': [130, 450], 'right_eye': [310, 450], 'chin': [220, 590]}
        result = fit(source, ref)
        rig = result['rig_candidate']
        self.assertAlmostEqual(rig['faceW'] / 512, rig['faceH'] / 960)
        self.assertEqual(len(result['warnings']), 1)

    def test_bad_landmarks_and_distorted_reference_rejected(self):
        ref = self.reference()
        invalid = {**ref, 'chin': [230, 200]}
        with self.assertRaisesRegex(ValueError, 'below'):
            fit(invalid, ref)
        invalid = {**ref, 'left_eye': [-1, 290]}
        with self.assertRaisesRegex(ValueError, 'inside'):
            fit(invalid, ref)
        ref['rig']['faceH'] = 200
        with self.assertRaisesRegex(ValueError, 'aspect'):
            fit(self.reference(), ref)


if __name__ == '__main__':
    unittest.main()
