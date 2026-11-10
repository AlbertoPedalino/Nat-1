import { createAdapterBindings } from '../../../adapterBindings.js';
import { finalAbilityModifier } from '../../../../shared/character/progression/abilityScores.js';
import { getProficiencyBonus } from '../../../../shared/character/progression/proficiency.js';

// Death Knight (World of Warcraft), a skin of the Paladin: the Paladin's
// entries come from its adapters (minus the features this class replaces,
// registry.js). Here only what the Death Knight adds. Rune Strike and Find
// Steed come from the class data.
function deathCoilDice(character) {
  return Math.max(1, finalAbilityModifier(character, 'cha'));
}

export default function install(registry, context = {}) {
  const { registerClassSheetActions, registerClassSheetResources } = createAdapterBindings(registry, context);

  registerClassSheetActions('Death Knight', [
    {
      name: 'Death Coil',
      cat: 'bonus',
      resKey: 'death_coil',
      minLevel: 1,
      rollers: [{ kind: 'damage', formula: ({ character }) => `${deathCoilDice(character)}d8`, label: ({ formula }) => `${formula} necrotic` }],
      inlinePills: ({ character, ownerLevel }) => [
        { label: 'Save DC', value: 8 + finalAbilityModifier(character, 'cha') + getProficiencyBonus(character) },
        { label: 'Max dice', value: deathCoilDice(character) },
        ...(Number(ownerLevel) >= 14 ? [{ label: 'Extra necrotic', value: deathCoilDice(character) }] : []),
      ],
    },
    {
      name: 'Runic Strikes',
      cat: 'special',
      minLevel: 11,
      rollers: [{ kind: 'damage', formula: '1d8', label: ({ formula }) => `${formula} necrotic` }],
    },
  ]);
  registerClassSheetResources('Death Knight', [
    {
      key: 'death_coil',
      name: 'Death Coil',
      recharge: 'LR',
      max: (level, mods) => Math.max(1, 1 + Number(mods?.cha || 0)),
      die: () => 'd8',
      pool: true,
      track: 'used',
    },
  ]);
}
