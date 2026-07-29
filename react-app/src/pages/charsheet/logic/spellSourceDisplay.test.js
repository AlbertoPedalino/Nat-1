import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeSpellSourceDisplay } from './spellSourceDisplay.js';

test('merged spell source keeps the displayed label and color paired', () => {
  const subclass = { label: 'Artillerist', color: '#subclass' };
  const item = { label: 'Cube of Force', color: '#item' };

  assert.deepEqual(
    mergeSpellSourceDisplay(subclass, item, '#fallback'),
    { label: 'Artillerist', color: '#subclass' },
  );
});

test('a specific spell source replaces a generic display source atomically', () => {
  const generic = { label: 'Auto', color: '#generic' };
  const item = { label: 'Cube of Force', color: '#item' };

  assert.deepEqual(
    mergeSpellSourceDisplay(generic, item, '#fallback'),
    { label: 'Cube of Force', color: '#item' },
  );
});
