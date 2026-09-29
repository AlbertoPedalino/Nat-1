import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { createAdapterRegistry } from '../../../src/adapters/registry.js';

// 2024 feats whose spells use "the ability increased by this feat"
// (additionalSpells ability "inherit"): the +1 choice is the only ability
// choice, so no adapter may add a separate Spellcasting Ability choice.
const INHERIT_FEATS = [
  'Fey-Touched', 'Shadow-Touched', 'Telekinetic', 'Telepathic', 'Magic Connoisseur', 'Warlike Familiar',
];

test('feats that cast with their increased ability have no separate Spellcasting Ability choice', async () => {
  const registry = createAdapterRegistry();
  const dir = new URL('../../../src/adapters/feats/', import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.js'))) {
    const { default: install } = await import(new URL(file, dir));
    if (typeof install === 'function') install(registry, {});
  }

  for (const name of INHERIT_FEATS) {
    const adapter = registry.getFeatAdapter(name);
    const adapted = typeof adapter === 'function' ? adapter({ name }) : { name };
    assert.equal(adapted.choiceUi?.spellAbility, undefined, name);
  }
});
