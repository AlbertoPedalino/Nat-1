import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdapterRegistry } from './registry.js';
import installVestige from './classes/warlock/vestige.js';
import installWarlock from './classes/warlock/warlock.js';

test('the Vestige Companion keeps Divine Power state behind its inline statblock control', () => {
  const registry = createAdapterRegistry();
  installVestige(registry);

  const command = registry
    .getSubclassSheetActions('Warlock', 'Vestige')
    .find((action) => action.name === 'Command Vestige Companion');
  const resources = registry.getSubclassSheetResources('Warlock', 'Vestige');
  const divinePower = resources.find((resource) => resource.key === 'vestige_power');

  assert.equal(command.resKey, undefined, 'the command card must not show a generic Uses tracker');
  assert.equal(command.summonedCreature.divinePowerResourceKey, 'vestige_power');
  assert.deepEqual(
    {
      minLevel: divinePower.minLevel,
      srMinLevel: divinePower.srMinLevel,
      lrMinLevel: divinePower.lrMinLevel,
      recharge: divinePower.recharge,
      max: divinePower.max,
    },
    { minLevel: 3, srMinLevel: 6, lrMinLevel: 6, recharge: 'SR+LR', max: 1 },
  );
});

test('Magical Cunning restores Divine Power only from Warlock level 6', () => {
  const registry = createAdapterRegistry();
  installWarlock(registry);
  const sideEffect = registry.getResourceSideEffect('magical_cunning');
  const context = (level) => ({
    character: { className: 'Warlock', level },
    resources: { vestige_power: 0 },
    PACT_SLOTS: { [level]: { slots: 2, level: 2 } },
  });

  assert.deepEqual(sideEffect(context(5)).recoverResourceKeys, []);
  assert.deepEqual(sideEffect(context(6)).recoverResourceKeys, ['vestige_power']);
});
