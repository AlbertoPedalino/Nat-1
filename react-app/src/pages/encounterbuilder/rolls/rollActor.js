import { combatantRollActor } from '../../../shared/encounter/rollActor.js';

export function encounterRollActor({ selectedStatblock, combat, instanceId }) {
  const selected = selectedStatblock;
  const combatant = selected?.combatantId != null
    ? combat?.combatants?.find((entry) => entry.id === selected.combatantId)
    : !selected?.monster ? combat?.combatants?.[combat.currentTurn || 0] : null;
  if (!combatant) return { actorName: selected?.monster?.name || 'GM' };
  return combatantRollActor(combatant, { instanceId, fightId: combat.fightId });
}
