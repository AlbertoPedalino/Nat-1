import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollWellSx } from '../../../../src/shared/ui/surfaces.js';

// A well given no cap grows to fit. A 0px cap hid every plan in the sheet's
// Replicate Magic Item panel, whose detail sets no maxHeight.
test('a scroll well without a cap grows to fit its rows', () => {
  assert.equal('maxHeight' in scrollWellSx(0), false);
  assert.equal('maxHeight' in scrollWellSx(undefined), false);
  assert.equal(scrollWellSx(280).maxHeight, 280);
});
