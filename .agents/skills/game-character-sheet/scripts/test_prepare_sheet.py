import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw
from prepare_sheet import ORDER, prepare


class SheetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def fixture(self, size=(2560, 960), opaque=False, edge=False):
        image = Image.new('RGBA' if not opaque else 'RGB', size, (255, 255, 255, 0) if not opaque else 'white')
        draw = ImageDraw.Draw(image)
        for i, color in enumerate(['red', 'green', 'blue', 'purple', 'orange']):
            x = round(i * size[0] / 5)
            w = round((i + 1) * size[0] / 5) - x
            draw.rectangle((x if edge else x + round(w * .2), round(size[1] * .15), x + round(w * .8), round(size[1] * .72)), fill=color)
        path = self.root / 'source.png'
        image.save(path)
        return path

    def test_cell_order_pixels_alpha_and_alias(self):
        source = self.fixture()
        out = self.root / 'out'
        report = prepare(source, out, webp=True)
        self.assertTrue(report['structural_pass'])
        with Image.open(source) as opened:
            original = opened.convert('RGBA')
        for i, name in enumerate(ORDER):
            with Image.open(out / f'{name}.png') as opened:
                frame = opened.convert('RGBA')
            self.assertEqual(frame.size, (512, 960))
            self.assertEqual(frame.tobytes(), original.crop((i * 512, 0, (i + 1) * 512, 960)).tobytes())
        manifest = json.loads((out / 'manifest.json').read_text())
        self.assertEqual(manifest['aliases']['sad'], 'crying')
        with Image.open(out / 'character_expression_sheet.webp') as opened:
            self.assertEqual(opened.size, (2560, 960))
        self.assertTrue(report['semantic_review_required'])

    def test_rounded_source_width_keeps_one_transform(self):
        report = prepare(self.fixture((2203, 714)), self.root / 'out', normalize=True)
        self.assertTrue(report['structural_pass'])
        self.assertEqual(report['output_size'], [2560, 960])
        self.assertEqual(len(report['source_cells_xywh']), 5)
        self.assertTrue(any('divisible' in w for w in report['warnings']))
        self.assertEqual(sum(r[2] for r in report['source_cells_xywh']), 2203)

    def test_opaque_input_and_existing_output_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'transparent'):
            prepare(self.fixture(opaque=True), self.root / 'out')
        source = self.fixture()
        out = self.root / 'out'
        prepare(source, out)
        sentinel = (out / 'manifest.json').read_bytes()
        with self.assertRaisesRegex(ValueError, 'not empty'):
            prepare(source, out)
        self.assertEqual((out / 'manifest.json').read_bytes(), sentinel)

    def test_clipping_is_reported_even_after_normalizing(self):
        report = prepare(self.fixture((2203, 714), edge=True), self.root / 'out', normalize=True)
        self.assertFalse(report['structural_pass'])
        self.assertEqual(len(report['errors']), 5)

    def test_nonclipped_but_narrow_margins_fail(self):
        path = self.fixture()
        with Image.open(path) as source:
            image = source.copy()
        ImageDraw.Draw(image).rectangle((40, 140, 471, 690), fill='red')
        image.save(path)
        report = prepare(path, self.root / 'out')
        self.assertFalse(report['structural_pass'])
        self.assertEqual(len(report['errors']), 1)
        self.assertIn('insufficient transparent margin', report['errors'][0])
        self.assertEqual(report['frames'][0]['transparent_margins_px']['left'], 40)

    def test_common_padding_fixes_margins_without_independent_fits(self):
        path = self.fixture()
        with Image.open(path) as source:
            image = source.copy()
        ImageDraw.Draw(image).rectangle((40, 140, 471, 690), fill='red')
        image.save(path)
        report = prepare(path, self.root / 'out', pad_to_margin=True)
        self.assertTrue(report['structural_pass'])
        transform = report['common_margin_padding']
        self.assertTrue(transform['applied'])
        self.assertTrue(all(gap >= 160 for gap in report['adjacent_head_gaps_px']))
        for frame in report['frames']:
            margins = frame['transparent_margins_px']
            self.assertGreaterEqual(min(margins['left'],margins['right']),80)
            self.assertGreaterEqual(min(margins['top'],margins['bottom']),64)
        # Unproblematic cells must receive the same scale/padding as the widest.
        for i, name in enumerate(ORDER):
            expected = Image.new('RGBA',(512,960))
            expected.paste(image.crop((i*512,0,(i+1)*512,960)).resize(
                tuple(transform['size']),Image.Resampling.LANCZOS),tuple(transform['offset']))
            with Image.open(self.root/'out'/f'{name}.png') as actual:
                self.assertEqual(actual.tobytes(),expected.tobytes())

    def test_padding_never_hides_source_clipping(self):
        report = prepare(self.fixture(edge=True), self.root/'out',pad_to_margin=True)
        self.assertFalse(report['structural_pass'])
        self.assertFalse(report['common_margin_padding']['applied'])
        self.assertEqual(len(report['errors']),5)

    def test_padding_is_noop_when_target_margins_already_met(self):
        source = self.fixture()
        report = prepare(source,self.root/'out',pad_to_margin=True)
        self.assertTrue(report['structural_pass'])
        self.assertFalse(report['common_margin_padding']['applied'])

    def test_vertical_margin_and_faint_specks(self):
        path = self.fixture()
        with Image.open(path) as source:
            image = source.copy()
        draw = ImageDraw.Draw(image)
        draw.point((1, 1), fill=(255, 0, 0, 1))
        image.save(path)
        report = prepare(path, self.root / 'faint')
        self.assertTrue(report['structural_pass'])
        with Image.open(self.root / 'faint/neutral.png') as frame:
            self.assertEqual(frame.getpixel((1, 1))[3], 1)
        draw.rectangle((1126, 15, 1330, 690), fill='blue')
        image.save(path)
        report = prepare(path, self.root / 'vertical')
        self.assertFalse(report['structural_pass'])
        self.assertIn('angry: insufficient', report['errors'][0])


if __name__ == '__main__':
    unittest.main()
