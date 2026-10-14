import { effectId, normalizeEffects } from '../../../shared/character/combat/combatEffects.js';
import { ReminderChip, ReminderField } from '../../../shared/character/combat/ReminderChips.jsx';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import MarkerRow from './MarkerRow.jsx';

// Reminders on a combatant ("Bardic Inspiration", "Guidance"), sharing the
// MarkerRow frame with the conditions row directly above: chips always visible
// so the initiative list can be scanned, the field that adds one behind a
// disclosure.
//
// The two rows are separate because they answer different questions: a
// condition is a rules state the creature IS in, a reminder is something it
// HAS. On a linked player both ride to the sheet — the dispatch sends these
// actions there (useCharacterVitalDispatch) — while a monster's stay in the
// fight.
//
// Chip and field are shared with the character sheet and the battle-map token
// menu (ReminderChips.jsx).

export default function CombatantReminders({ combatant }) {
  const { dispatch } = useEncounterBuilder();
  const active = normalizeEffects(combatant.activeEffects);

  return (
    <MarkerRow
      label="Reminders"
      count={active.length}
      onClear={() => dispatch({ type: 'clearCombatantEffects', id: combatant.id })}
      pills={active.map((effect) => (
        <ReminderChip
          key={effectId(effect)}
          effect={effect}
          onRemove={() => dispatch({ type: 'removeCombatantEffect', id: combatant.id, effectId: effectId(effect) })}
        />
      ))}
    >
      <ReminderField
        effects={active}
        onAdd={(text) => dispatch({ type: 'addCombatantEffect', id: combatant.id, payload: { text } })}
      />
    </MarkerRow>
  );
}
