import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdapterRegistry } from '../../../src/adapters/registry.js';
import installAbjurer from '../../../src/adapters/classes/wizard/abjurer.js';

test('an Abjurer gets the Abjuration Savant spell choices as it levels', () => {
  const registry = createAdapterRegistry();
  installAbjurer(registry);
  const adapter = registry.getSubclassAdapter('Wizard', 'Abjurer');
  const keysAt = (level) => {
    const specs = [];
    adapter(null, level, specs);
    return specs.map((spec) => spec.key);
  };
  assert.deepEqual(keysAt(2), []);
  assert.deepEqual(keysAt(3), ['subclass_abjurer_savant_initial']);
  assert.deepEqual(keysAt(5), ['subclass_abjurer_savant_initial', 'subclass_abjurer_savant_lv5']);
  const [initial] = (() => { const specs = []; adapter(null, 3, specs); return specs; })();
  assert.deepEqual(initial.spellFilter, { spellLevels: [1, 2], classes: ['Wizard'], schools: ['A'] });
});
