import test from 'node:test';
import assert from 'node:assert/strict';
import { pageTitleForPath } from './pageTitle.js';

test('tool routes use a stable page title without instance details', () => {
  assert.equal(pageTitleForPath('/gmboard'), 'GM Board');
  assert.equal(pageTitleForPath('/encounter-builder'), 'Encounter Builder');
  assert.equal(pageTitleForPath('/dm-screen'), 'DM Screen');
  assert.equal(pageTitleForPath('/gmboard?board=ignored'), 'GM Board');
});

test('library and general routes have readable titles', () => {
  assert.equal(pageTitleForPath('/'), 'Home');
  assert.equal(pageTitleForPath('/campaigns'), 'Campaigns');
  assert.equal(pageTitleForPath('/library/encounters'), 'Encounter Builders');
  assert.equal(pageTitleForPath('/unknown'), 'Page Not Found');
});
