import { ReminderEditor } from '../../../shared/character/combat/ReminderChips.jsx';
import { useEncounterDispatch } from '../state/EncounterBuilderContext.jsx';

// Reminders on a combatant ("Bardic Inspiration", "Guidance"), sharing the
// MarkerManager frame with the conditions row directly above (and with the
// sheet's panels): chips always visible
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
  const dispatch = useEncounterDispatch();
  return (
    <ReminderEditor
      inline
      collapse
      label="Reminders"
      effects={combatant.activeEffects}
      onClear={() => dispatch({ type: 'clearCombatantEffects', id: combatant.id })}
      onRemove={(effectId) => dispatch({ type: 'removeCombatantEffect', id: combatant.id, effectId })}
      onAdd={(text) => dispatch({ type: 'addCombatantEffect', id: combatant.id, payload: { text } })}
    />
  );
}
