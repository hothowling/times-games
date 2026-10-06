import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ICONS, iconMarkup } from '../public/core/icons.js';
import { ITEMS, BOX } from '../public/core/catalog.js';

test('atlas covers every shared item and maps each icon to its own CSS cell', () => {
  const css = readFileSync(new URL('../public/core/icons.css', import.meta.url), 'utf8');
  assert.equal(new Set(ICONS).size, ICONS.length);
  assert.ok(ICONS.length <= 32);
  for (const { icon } of [...Object.values(ITEMS), BOX]) {
    assert.ok(ICONS.includes(icon.split('/').pop().replace('.webp', '')), icon);
  }
  for (const name of ICONS) {
    assert.ok(css.includes(`[data-icon="${name}"]`), name);
    assert.ok(iconMarkup(name).includes(`data-icon="${name}"`));
  }
  assert.throws(() => iconMarkup('unknown'));
  assert.throws(() => iconMarkup('star', '" onclick="bad'));
  const file = readFileSync(new URL('../public/assets/ui/icons.webp', import.meta.url));
  assert.equal(file.toString('ascii', 0, 4), 'RIFF');
  assert.equal(file.toString('ascii', 8, 12), 'WEBP');
  assert.ok(file.length < 100_000, 'small UI atlas stays below 100KB');
});
