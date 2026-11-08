import { beforeAll, describe, expect, it } from 'vitest';
import { loadClassAdapters, loadCoreAdapters } from '../../../../../src/adapters/index.js';
import { getSpellSlots } from '../../../../../src/shared/character/spells/spellcasting.js';

describe('getSpellSlots', () => {
  beforeAll(async () => {
    await loadCoreAdapters();
    await loadClassAdapters(['Paladin', 'Warlock']);
  });

  it('uses the single class table when the only other caster is a Warlock', () => {
    const C = { className: 'Paladin', classLevel: 3, level: 5, extraClasses: [{ name: 'Warlock', level: 2 }] };
    const result = getSpellSlots(C);
    expect(result.regular[0]).toBe(3);
    expect(result.pact).toMatchObject({ level: 1, count: 2 });
  });
});
