import test from 'node:test';
import assert from 'node:assert/strict';
import { RETURN_COALESCE_MS, coalesceReturns } from '../../../../../src/shared/cloud/sync/returnGate.js';

test('focus and visibility together run once; a later return runs again', () => {
  let clock = 1_000;
  const runs = [];
  const gate = coalesceReturns((reason) => runs.push(reason), { now: () => clock });
  gate('focus');
  gate('visible');
  clock += RETURN_COALESCE_MS - 1;
  gate('focus');
  clock += 2;
  gate('visible');
  assert.deepEqual(runs, ['focus', 'visible']);
});
