import { getConditionsWithEffect } from '../../../shared/character/combat/conditions.js';
import {
  collectResolvedResistanceItems,
  collectResolvedImmunityItems,
} from '../../../shared/character/sheet/sheetDefenses.js';
import {
  collectItemResistanceItems,
  collectItemImmunityItems,
  collectItemConditionImmunityItems,
  characterItemEffects,
} from '../../../shared/character/inventory/itemEffects.js';
import DefensesPanel from './DefensesPanel.jsx';

// The character's Defenses panel: resistances and immunities from every source
// (adapters, items, conditions), advantages on saves, and passive item traits.
export default function CharacterDefenses({ C, activeConditions = [] }) {
  const itemEffects = characterItemEffects(C);
  // Conditions granting resistance to all damage (e.g. Petrified).
  const conditionResistAll = getConditionsWithEffect(activeConditions, 'resistAllDmg')
    .map((source) => ({ type: 'All damage', kind: 'Resist', source }));
  const advSaves = [...itemEffects.advantageOnSaveAgainst.entries()].flatMap(([target, sources]) =>
    sources.map((src) => ({ type: `Save vs ${target}`, kind: 'Adv', source: src })),
  );
  const attackerDisadv = (itemEffects.disadvantageOnAttackersAgainstYou || []).map((entry) => ({
    type: 'Attackers DIS', kind: '', source: entry.source, note: entry.note,
  }));
  const passiveTraits = (itemEffects.passiveTraits || []).map((entry) => ({
    type: entry.text, kind: 'Trait', source: entry.source,
  }));
  const all = [
    ...conditionResistAll,
    ...collectResolvedResistanceItems(C).map((item) => ({ type: item.label, kind: 'Resist', source: item.source })),
    ...collectItemResistanceItems(C).map((item) => ({ type: item.label, kind: 'Resist', source: item.source })),
    ...collectResolvedImmunityItems(C).map((item) => ({ type: item.label, kind: 'Immune', source: item.source })),
    ...collectItemImmunityItems(C).map((item) => ({ type: item.label, kind: 'Immune', source: item.source })),
    ...collectItemConditionImmunityItems(C).map((item) => ({ type: item.label, kind: 'Cond. Immune', source: item.source })),
    ...advSaves,
    ...attackerDisadv,
    ...passiveTraits,
  ];

  return <DefensesPanel items={all} />;
}
