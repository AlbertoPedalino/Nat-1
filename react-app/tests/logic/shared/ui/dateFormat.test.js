import test from 'node:test';
import assert from 'node:assert/strict';
import { formatClockTime, formatDateTime } from '../../../../src/shared/ui/dateFormat.js';
import { formatNumber } from '../../../../src/shared/ui/numberFormat.js';

const moment = new Date(2026, 10, 6, 15, 4, 9);

test('a moment reads month/day/year and a 12-hour time, the English way', () => {
  assert.equal(formatDateTime(moment), '11/06/26, 03:04 PM');
  assert.equal(formatDateTime(moment.getTime()), '11/06/26, 03:04 PM');
  assert.equal(formatClockTime(moment), '03:04:09 PM');
});

test('what is not a date reads as nothing', () => {
  assert.equal(formatDateTime(null), '');
  assert.equal(formatDateTime('not a date'), '');
  assert.equal(formatClockTime(undefined), '');
});

test('thousands are separated with commas', () => {
  assert.equal(formatNumber(25000), '25,000');
  assert.equal(formatNumber('1800'), '1,800');
  assert.equal(formatNumber(undefined), '0');
});
