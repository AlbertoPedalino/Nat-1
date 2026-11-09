import test from 'node:test';
import assert from 'node:assert/strict';
import { failureMessage, runBusy } from '../../../../src/shared/ui/busyAction.js';

test('a failure says what was tried and, when known, why', () => {
  assert.equal(failureMessage('Could not delete the save.', new Error('permission denied')), 'Could not delete the save: permission denied.');
  assert.equal(failureMessage('Could not delete the save.', 'offline.'), 'Could not delete the save: offline.');
  assert.equal(failureMessage('Could not delete the save.', null), 'Could not delete the save.');
  assert.equal(failureMessage('Could not delete the save.', new Error('')), 'Could not delete the save.');
});

test('a failure of several sentences takes the reason after its first', () => {
  assert.equal(
    failureMessage('Could not select the board. Reopen this panel to retry.', new Error('gone')),
    'Could not select the board: gone. Reopen this panel to retry.',
  );
});

test('runBusy reports a failure through failureMessage', async () => {
  const notes = [];
  const busy = [];
  const result = await runBusy(
    { setBusy: (value) => busy.push(value), notify: (kind, text) => notes.push([kind, text]) },
    async () => { throw new Error('offline'); },
    'Could not upload that image.',
  );
  assert.equal(result, null);
  assert.deepEqual(notes, [['error', 'Could not upload that image: offline.']]);
  assert.deepEqual(busy, [true, false]);
});
