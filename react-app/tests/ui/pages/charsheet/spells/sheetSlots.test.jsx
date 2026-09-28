import { beforeAll, describe, expect, it } from 'vitest';
import { loadClassAdapters, loadCoreAdapters } from '../../../../../src/adapters/index.js';
import { getSheetSlots } from '../../../../../src/pages/charsheet/spells/spellsTabLogic.js';

describe('getSheetSlots', () => {
  beforeAll(async () => {
    await loadCoreAdapters();
    await loadClassAdapters(['Paladin', 'Warlock']);
  });

  it('uses the single class table when the only other caster is a Warlock', () => {
    const C = { className: 'Paladin', classLevel: 3, level: 5, extraClasses: [{ name: 'Warlock', level: 2 }] };
    const result = getSheetSlots(C);
    expect(result.regular[0]).toBe(3);
    expect(result.pact).toMatchObject({ level: 1, count: 2 });
  });
});
