import { describe, expect, it } from 'vitest';
import { builderReducer } from '../../../../../src/pages/charbuilder/state/state.js';
import { initialBuilderState as initialState } from '../../../../../src/pages/charbuilder/state/initialState.js';

const wizard = { name: 'Wizard', source: 'XPHB', hd: { faces: 6 } };
const data = {
  ...initialState.data,
  classes: [wizard],
  subclasses: [{ name: 'Evoker', shortName: 'Evoker', className: 'Wizard', classSource: 'XPHB' }],
  classFeatures: [{ name: 'Arcane Recovery', className: 'Wizard', classSource: 'XPHB', level: 1 }],
  subclassFeatures: [],
  species: [{ name: 'Elf', source: 'XPHB' }],
  backgrounds: [{ name: 'Sage', source: 'XPHB' }],
  feats: [],
};

// A restored character carries names and snapshots only; data/adapt rebuilds
// its class, species and background objects from the loaded data.
describe('builder rehydration', () => {
  it('rebuilds a restored character from the data on the next adapt', () => {
    let state = builderReducer({ ...initialState, data, dataAdapted: true }, {
      type: 'character/restore',
      character: {
        className: 'Wizard', classSource: 'XPHB', classLevel: 3, level: 3,
        clsSnapshot: { name: 'Wizard' },
        speciesName: 'Elf', speciesSource: 'XPHB',
        backgroundName: 'Sage', backgroundSource: 'XPHB',
      },
    });
    expect(state.dataAdapted).toBe(false);
    state = builderReducer(state, { type: 'data/adapt', payload: data });
    expect(state.character.cls).toBe(wizard);
    expect(state.character.speciesObj?.name).toBe('Elf');
    expect(state.character.backgroundObj?.name).toBe('Sage');
    expect(state.character.allFeatures.map((feature) => feature.name)).toEqual(['Arcane Recovery']);
    expect(state.character.subclasses).toHaveLength(1);
  });
});
