import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseStartingEquipment, clearStartingEquipment } from '../../../../../src/pages/charbuilder/state/equipmentChoices.js';
import { builderReducer } from '../../../../../src/pages/charbuilder/state/state.js';
import { initialBuilderState } from '../../../../../src/pages/charbuilder/state/initialState.js';
import { collectChoiceBlocks } from '../../../../../src/pages/charbuilder/steps/startingEquipment.js';

const ITEMS = [
  { name: 'Chain Mail', source: 'XPHB', type: 'HA', weight: 55 },
  { name: 'Javelin', source: 'XPHB', type: 'M', weight: 2 },
  { name: 'Rope', source: 'XPHB', type: 'G', weight: 5 },
  { name: 'Torch', source: 'XPHB', type: 'G', weight: 1 },
  { name: 'Explorer\'s Pack', source: 'XPHB', type: 'G', packContents: ['rope|xphb', { item: 'torch|xphb', quantity: 10 }] },
  { name: 'Lute', source: 'XPHB', type: 'INS', weight: 2 },
];

const EQ = {
  defaultData: [{
    A: [
      { item: 'chain mail|xphb' },
      { item: 'javelin|xphb', quantity: 8 },
      { item: 'explorer\'s pack|xphb' },
      { equipmentType: 'instrumentMusical' },
      { value: 400 },
    ],
    B: [{ value: 15500 }],
  }],
};

const BLOCK = collectChoiceBlocks(EQ, 'cls')[0];
const fresh = () => ({ inventory: [], currency: { cp: 0, sp: 0, gp: 0 }, equipChoices: {} });
const apply = (character, patch) => ({ ...character, ...patch });
const names = (character) => character.inventory.map((item) => `${item.name} x${item.qty}`).sort();

test('picking an option adds its items (a pack as its contents) and coins', () => {
  const character = apply(fresh(), chooseStartingEquipment(fresh(), BLOCK, 'A', ITEMS));
  assert.equal(character.equipChoices.cls_choice_0, 'A');
  assert.deepEqual(names(character), ['Chain Mail x1', 'Javelin x8', 'Rope x1', 'Torch x10']);
  assert.equal(character.currency.gp, 4);
});

test('picking the chosen option again takes it all back', () => {
  let character = apply(fresh(), chooseStartingEquipment(fresh(), BLOCK, 'A', ITEMS));
  character = apply(character, chooseStartingEquipment(character, BLOCK, 'A', ITEMS));
  assert.equal(character.equipChoices.cls_choice_0, null);
  assert.deepEqual(character.inventory, []);
  assert.equal(character.currency.gp, 0);
});

test('switching option swaps one grant for the other, slot picks included', () => {
  let character = apply(fresh(), chooseStartingEquipment(fresh(), BLOCK, 'A', ITEMS));
  character = {
    ...character,
    inventory: [...character.inventory, { ...ITEMS[5], qty: 1 }],
    equipChoices: { ...character.equipChoices, cls_choice_0_A__et0: 'Lute|XPHB' },
  };
  character = apply(character, chooseStartingEquipment(character, BLOCK, 'B', ITEMS));
  assert.equal(character.equipChoices.cls_choice_0, 'B');
  assert.equal('cls_choice_0_A__et0' in character.equipChoices, false);
  assert.deepEqual(character.inventory, []);
  assert.equal(character.currency.gp, 155);
});

test('taking back skips what was already removed or spent, and keeps extra copies', () => {
  let character = apply(fresh(), chooseStartingEquipment(fresh(), BLOCK, 'A', ITEMS));
  character = {
    ...character,
    inventory: character.inventory
      .filter((item) => item.name !== 'Chain Mail')
      .map((item) => (item.name === 'Javelin' ? { ...item, qty: 10 } : item)),
    currency: { ...character.currency, gp: 1 },
  };
  character = apply(character, chooseStartingEquipment(character, BLOCK, 'A', ITEMS));
  assert.deepEqual(names(character), ['Javelin x2']);
  assert.equal(character.currency.gp, 0);
});

test('a new class takes back its starting-equipment picks', () => {
  let character = apply(fresh(), chooseStartingEquipment(fresh(), BLOCK, 'A', ITEMS));
  character = { ...character, inventory: [...character.inventory, { ...ITEMS[3], qty: 1 }], equipChoices: { ...character.equipChoices, bg_choice_0: 'B' } };
  character = apply(character, clearStartingEquipment(character, EQ, 'cls', ITEMS));
  assert.deepEqual(names(character), ['Torch x1']);
  assert.deepEqual(character.equipChoices, { bg_choice_0: 'B' });
  assert.equal(character.currency.gp, 0);
});

test('the reducer wires picks, and a class change takes them back', () => {
  let state = {
    ...initialBuilderState,
    data: { ...initialBuilderState.data, items: ITEMS },
    character: { ...initialBuilderState.character, ...fresh(), className: 'Fighter', classSource: 'XPHB', cls: { name: 'Fighter', source: 'XPHB', startingEquipment: EQ } },
  };
  state = builderReducer(state, { type: 'equipment/choose', block: BLOCK, value: 'A' });
  assert.deepEqual(names(state.character), ['Chain Mail x1', 'Javelin x8', 'Rope x1', 'Torch x10']);
  state = builderReducer(state, { type: 'class/select', classObject: { name: 'Wizard', source: 'XPHB' } });
  assert.equal(state.character.className, 'Wizard');
  assert.deepEqual(state.character.inventory, []);
  assert.deepEqual(state.character.equipChoices, {});
  assert.equal(state.character.currency.gp, 0);
});
