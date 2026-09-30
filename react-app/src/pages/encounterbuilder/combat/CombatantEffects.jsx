import { effectId, normalizeEffects } from '../../../shared/character/combat/combatEffects.js';
import { EffectEditor, EffectPill } from '../../../shared/character/combat/EffectChips.jsx';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import MarkerRow from './MarkerRow.jsx';

// Ad-hoc effects on a combatant, sharing the MarkerRow frame with the conditions
// row directly above: pills always visible so the initiative list can be
// scanned, the assignment surface behind a disclosure.
//
// The two rows are separate because they answer different questions: a
// condition is a rules state the creature IS in, an effect is a ruling about
// its rolls ("disadvantage on its next attack"). On a linked player both ride
// to the sheet — the dispatch sends these actions there
// (useCharacterVitalDispatch) — while a monster's stay in the fight.
//
// Pill and grid are shared with the character sheet (EffectChips.jsx). A
// duration is set on each pill, so one combatant can hold disadvantage on its
// next attack AND disadvantage on saves until removed.

export default function CombatantEffects({ combatant }) {
  const { dispatch } = useEncounterBuilder();
  const active = normalizeEffects(combatant.activeEffects);

  return (
    <MarkerRow
      label="Effects"
      count={active.length}
      onClear={() => dispatch({ type: 'clearCombatantEffects', id: combatant.id })}
      pills={active.map((effect) => (
        <EffectPill
          key={effectId(effect)}
          effect={effect}
          onRetime={(duration) => dispatch({
            type: 'setCombatantEffectDuration', id: combatant.id, effectId: effectId(effect), duration,
          })}
          onRemove={() => dispatch({ type: 'removeCombatantEffect', id: combatant.id, effectId: effectId(effect) })}
        />
      ))}
    >
      <EffectEditor
        effects={active}
        onToggle={(key) => dispatch({ type: 'toggleCombatantEffect', id: combatant.id, key })}
        onAddCustom={(text) => dispatch({ type: 'addCombatantEffect', id: combatant.id, payload: { text, polarity: 'note' } })}
      />
    </MarkerRow>
  );
}
