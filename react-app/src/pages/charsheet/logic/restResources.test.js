import test from 'node:test';
import assert from 'node:assert/strict';
import { applyResourceRest } from './restResources.js';

const vestigePower = {
  key: 'vestige_power',
  recharge: 'SR+LR',
  max: 1,
  srMinLevel: 6,
  lrMinLevel: 6,
};

test('Divine Power remains manual before Vestige Recovery unlocks at level 6', () => {
  const character = { className: 'Warlock', level: 5 };

  assert.equal(applyResourceRest({ vestige_power: 0 }, [vestigePower], character, 'short').vestige_power, 0);
  assert.equal(applyResourceRest({ vestige_power: 0 }, [vestigePower], character, 'long').vestige_power, 0);
});

test('Divine Power recovers on either rest from Warlock level 6', () => {
  const character = { className: 'Warlock', level: 6 };

  assert.equal(applyResourceRest({ vestige_power: 0 }, [vestigePower], character, 'short').vestige_power, 1);
  assert.equal(applyResourceRest({ vestige_power: 0 }, [vestigePower], character, 'long').vestige_power, 1);
});

test('resources with no recharge are not reset by a Long Rest', () => {
  const resource = { key: 'manual_state', recharge: 'none', max: 1 };

  assert.equal(applyResourceRest({ manual_state: 0 }, [resource], {}, 'long').manual_state, 0);
});
