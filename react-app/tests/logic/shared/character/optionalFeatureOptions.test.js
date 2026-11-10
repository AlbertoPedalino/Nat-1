import test from 'node:test';
import assert from 'node:assert/strict';
import { optionalFeatureOptions } from '../../../../src/shared/character/progression/optionalFeatures.js';

const features = [
  { name: 'Trip Attack', source: 'XPHB', featureType: ['MV:B'] },
  { name: 'Riposte', source: 'XPHB', featureType: ['MV:B'] },
  { name: 'Quickened Spell', source: 'XPHB', featureType: ['MM'] },
  { name: 'Devouring Blade', source: 'XPHB', featureType: ['EI'], prerequisite: [{ level: { level: 12 }, optionalfeature: ['thirsting blade|xphb'] }] },
  { name: 'Armor of Shadows', source: 'XPHB', featureType: ['EI'] },
  { name: 'Armor of Shadows', source: 'EFA', featureType: ['EI'] },
];

test("a class feature's options come from the optional-feature data, by type", () => {
  assert.deepEqual(optionalFeatureOptions(features, 'MV:B').map((o) => o.name), ['Riposte', 'Trip Attack']);
  assert.deepEqual(optionalFeatureOptions(features, 'MM').map((o) => o.name), ['Quickened Spell']);
});

test('an invocation brings its level and the options it requires; each name once', () => {
  assert.deepEqual(optionalFeatureOptions(features, 'EI'), [
    { name: 'Armor of Shadows', minLevel: 1, prereqs: [] },
    { name: 'Devouring Blade', minLevel: 12, prereqs: ['thirsting blade'] },
  ]);
});
